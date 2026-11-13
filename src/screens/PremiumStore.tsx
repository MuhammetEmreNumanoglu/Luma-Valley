import { useMeasuredTarget } from '../ui/targets';
import { drawWorkshopPreview } from '../render/workshopSkin';
import { CARD_PACKS, CARD_GOAL, type CardId } from '../premium/cards';
import { SeasonPass } from './SeasonPass';
import { COSMETIC_COLLECTIONS, ownsCosmetic } from '../premium/collections';
import { DECOR_SPOTS, PREMIUM_DECOR, type PremiumDecorId } from '../premium/decor';
// Development purchases can optionally affect the active local save after a verified backup.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, Image as SkImage } from '@shopify/react-native-skia';
import { MAP_W, REGION_H, REGIONS } from '../content/regions';
import { hashString } from '../core/rng';
import { drawRegion } from '../render/map';
import { sceneImage } from '../render/imageCache';
import { regionView } from './MapScreen';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONVENIENCE, MOCK_PRODUCTS, SEASON_ID, THEMES, WORKSHOP_SKINS, type ConvenienceId, type MockProductId, type ThemeId, type WorkshopSkinId } from '../premium/catalog';
import { MockPurchaseProvider, newDemo, type DemoOutcome, type DemoState } from '../premium/mock';
import { useGame } from '../state/GameProvider';
import { Bar, Button, CloseButton, InfoModal, Sprite } from '../ui/components';
import { colors, font, radius } from '../ui/theme';

const DEMO_KEY = 'luma.premium.demo.v1';
const CATEGORIES = ['Öne Çıkanlar', 'Jetonlar', 'Battle Pass', 'Temalar', 'Atölyeler', 'Kart Paketleri', 'Dekorasyonlar', 'Kolaylıklar', 'Koleksiyonlar', 'İşlemler'] as const;
type Category = typeof CATEGORIES[number];
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const provider = new MockPurchaseProvider(IS_DEV);
const hero = require('../../assets/art/premium/moon_chest.png');
const tokenArtwork = [require('../../assets/art/premium/bronze_one.png'), require('../../assets/art/premium/bronze_stack.png'), require('../../assets/art/premium/silver_one.png'), require('../../assets/art/premium/silver_stack.png'), require('../../assets/art/premium/gold_star.png'), require('../../assets/art/premium/purple_pouch.png'), hero];
const packArt: Partial<Record<MockProductId, number>> = { 'light.120': 0, 'light.300': 1, 'light.750': 3, 'light.1650': 5, 'light.3500': 6 };

/** A fixed-height, accessible tab works with mouse, keyboard and touch alike. */
function StoreCategory({ name, selected, onPress }: { name: Category; selected: boolean; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="tab" accessibilityLabel={name} accessibilityState={{ selected }} aria-selected={selected} onPress={onPress}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.category, selected && styles.categoryOn, hovered && !selected && styles.categoryHover, focused && styles.categoryFocus, pressed && styles.categoryPressed]}>
    <Text numberOfLines={1} style={[styles.categoryText, selected && styles.categoryTextOn]}>{name}</Text>
  </Pressable>;
}

export function PremiumStore({ onClose, initialCategory = 'Öne Çıkanlar' }: { onClose: () => void; initialCategory?: Category }) {
  const { state, dispatch, now, reduceMotion, testProfile, switchTestProfile, devGrant, restoreDevSave } = useGame();
  const insets = useSafeAreaInsets();
  const [goldRef, goldMeasure] = useMeasuredTarget('store.gold');
  const [tokenRef, tokenMeasure] = useMeasuredTarget('store.token');
  const [energyRef, energyMeasure] = useMeasuredTarget('store.energy');
  // The store slides in; remeasure after the entrance transform so reward targets are on-screen.
  useEffect(() => { const timer = setTimeout(() => { goldMeasure(); tokenMeasure(); energyMeasure(); }, 400); return () => clearTimeout(timer); }, [goldMeasure, tokenMeasure, energyMeasure]);
  const [category, setCategory] = useState<Category>(initialCategory);
  const [demo, setDemo] = useState<DemoState | null>(null);
  const ref = useRef<DemoState | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const [selection, setSelection] = useState<MockProductId | null>(null);
  const [testSelection, setTestSelection] = useState(false);
  const [outcome, setOutcome] = useState<DemoOutcome>('success');
  const [status, setStatus] = useState('');
  const [restoreAsk, setRestoreAsk] = useState(false);
  const [applyMock, setApplyMock] = useState(false);
  const mockBusy = useRef(false);
  const [attempts, setAttempts] = useState<string[]>([]);
  const [cardPack, setCardPack] = useState<CardId | null>(null);
  const cardRequest = useRef('');
  const cardBuying = useRef(false);
  const [cardResult, setCardResult] = useState<{ id: CardId; before: number } | null>(null);
  const [preview, setPreview] = useState<ThemeId | null>(null);
  const [confirmTheme, setConfirmTheme] = useState<ThemeId | null>(null);
  const [decorId, setDecorId] = useState<PremiumDecorId | null>(null);
  const [decorRegion, setDecorRegion] = useState(1);
  const [skinToBuy, setSkinToBuy] = useState<WorkshopSkinId | null>(null);
  const [convenience, setConvenience] = useState<{ id: ConvenienceId; requestId: string; target?: { id: string; expectedReadyAt: number } } | null>(null);
  const previewImage = useMemo(() => {
    if (!preview) return null;
    const view = { ...regionView(state, 1), theme: preview };
    const key = `region-preview:${hashString(JSON.stringify(view))}`;
    return sceneImage(key, MAP_W, REGION_H, 0.7, c => drawRegion(c, REGIONS[0], view));
  }, [preview, state]);
  const sequence = useRef(0);
  const decorMap = useMemo(() => {
    if (!decorId || !state.regions.includes(decorRegion)) return null;
    const view = regionView(state, decorRegion);
    return sceneImage(`region-decor:${decorRegion}:${hashString(JSON.stringify(view))}`, MAP_W, REGION_H, 0.5, c => drawRegion(c, REGIONS[decorRegion - 1], view));
  }, [decorId, decorRegion, state]);
  const stats = { merges: state.stats.merges, orders: state.stats.orders, produced: state.stats.produced };

  useEffect(() => {
    if (!IS_DEV) return;
    let live = true;
    AsyncStorage.getItem(`${DEMO_KEY}.attempts`).then(raw => { try { const list = raw ? JSON.parse(raw) : []; if (live && Array.isArray(list)) setAttempts(list.filter(x => typeof x === 'string').slice(-30)); } catch { /* no usable history */ } }).catch(() => {});
    AsyncStorage.getItem(DEMO_KEY).then(raw => {
      let value: DemoState | null = null;
      try {
        const parsed = raw ? JSON.parse(raw) as DemoState : null;
        if (parsed?.version === 1 && Array.isArray(parsed.receipts) && Array.isArray(parsed.owned) && parsed.season?.id === SEASON_ID && Array.isArray(parsed.season.claimed)) value = parsed;
      } catch { /* invalid demo data starts a new simulator, never the game save */ }
      if (!live) return;
      const initial = value ?? newDemo(now, stats);
      ref.current = initial; setDemo(initial);
    }).catch(() => { if (live) { const initial = newDemo(now, stats); ref.current = initial; setDemo(initial); } });
    return () => { live = false; };
    // Opening the simulator defines a baseline once; ongoing progress comes from live stats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function write(next: DemoState) {
    if (!IS_DEV) return;
    ref.current = next; setDemo(next);
    saveQueue.current = saveQueue.current.then(() => AsyncStorage.setItem(DEMO_KEY, JSON.stringify(next))).catch(() => setStatus('Test kaydı yazılamadı.'));
  }
  async function simulate(id: MockProductId, chosen: DemoOutcome) {
    if (!IS_DEV || mockBusy.current || !ref.current) return;
    mockBusy.current = true;
    const transaction = `devmock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let message = '';
    try {
      if (chosen !== 'success') message = chosen === 'cancelled' ? 'Test satın alımı iptal edildi; bakiye değişmedi.' : 'Test satın alımı başarısız; bakiye değişmedi.';
      else if (applyMock) {
        const product = MOCK_PRODUCTS.find(p => p.id === id);
        if (!product?.tokens || product.kind !== 'consumable') message = 'Bu ürün oyun kaydına aktarılamaz; yalnızca jeton paketleri desteklenir.';
        else message = await devGrant({ currency: 'mock', product: id, transactionId: transaction }) ? `DEV TEST: ${product.tokens} yıldız jetonu aktif oyun kaydına eklendi.` : 'Test işlemi uygulanamadı veya daha önce işlendi.';
      } else {
        const result = provider.purchase(ref.current, id, transaction, chosen);
        if (result.ok) { write(result.state); message = 'Yalnızca ayrı mock cüzdanı güncellendi.'; }
        else message = result.reason;
      }
      const entry = `${new Date().toLocaleString()} · ${id} · ${chosen} · ${applyMock ? 'aktif oyun' : 'ayrı mock cüzdan'} · ${message}`;
      setAttempts(old => { const next = [...old, entry].slice(-30); void AsyncStorage.setItem(`${DEMO_KEY}.attempts`, JSON.stringify(next)); return next; });
      setStatus(message); setSelection(null);
    } catch { setStatus('Yedek veya test işlemi kaydedilemedi; oyun bakiyesi değiştirilmedi.'); }
    finally { mockBusy.current = false; }
  }
  const selected = MOCK_PRODUCTS.find(x => x.id === selection);
  const card = (id: MockProductId) => {
    const p = MOCK_PRODUCTS.find(x => x.id === id)!;
    return <View key={id} style={styles.product}>
      <View style={styles.productIcon}>{packArt[id] !== undefined ? <Image source={tokenArtwork[packArt[id]!]} resizeMode="contain" style={{ width: 50, height: 50 }} /> : <Sprite id={id === 'worker' ? 'icon.upgrade' : id === 'pass.moon' ? 'icon.calendar' : 'icon.gift'} size={38} />}</View>
      <View style={{ flex: 1 }}><Text style={styles.productName}>{p.name}</Text><Text style={styles.muted}>{p.tokens ? `${p.tokens} Işık Jetonu` : id === 'pass.moon' ? 'Premium sezon yolu · yakında' : id === 'worker' ? 'Ek işçi · yakında' : '150 jeton · 100 enerji · 500 altın'}</Text><Text style={styles.price}>{`${p.price} · örnek fiyat · yakında`}</Text></View>
      <Button small tone="honey" label="İncele" onPress={() => { setTestSelection(false); setSelection(id); }} />
    </View>;
  };
  const themeCard = (id: ThemeId) => {
    const x = THEMES.find(v => v.id === id)!;
    const owned = state.themes.owned.includes(id);
    const pack = CARD_PACKS.find(p => p.kind === 'theme' && p.target === id);
    const view = { ...regionView(state, 1), theme: id };
    const map = sceneImage(`store-map:${hashString(JSON.stringify(view))}`, MAP_W, REGION_H, 0.45, c => drawRegion(c, REGIONS[0], view));
    const count = pack ? state.themeCards[pack.id] : 0;
    return <View key={id} style={styles.themeCard}>
      <View style={styles.themeCover}>{map ? <Canvas style={{ width: 128, height: 96 }}><SkImage image={map} x={0} y={-30} width={128} height={REGION_H * 128 / MAP_W} fit="fill" /></Canvas> : null}</View>
      <View style={{ flex: 1, gap: 3 }}><Text style={styles.productName}>{x.name}</Text><Text style={styles.muted}>{x.detail}</Text><Text style={styles.price}>{owned ? state.themes.active === id ? 'Seçili' : 'Sahip olundu' : pack ? `${count}/10 Kart` : `${x.cost} yıldız jetonu`}</Text>{pack && !owned ? <Bar value={count / 10} color={colors.token} height={5} /> : null}<View style={styles.controls}><Button small tone="cream" label="Önizle" onPress={() => setPreview(id)} /><Button small tone="honey" disabled={owned && state.themes.active === id || !!pack && !owned && count < CARD_GOAL} label={owned ? 'Kullan' : pack ? 'Temayı Aç' : 'Satın Al'} onPress={() => owned ? dispatch({ type: 'equipTheme', id }) : pack ? dispatch({ type: 'unlockCardCosmetic', id: pack.id }) : setConfirmTheme(id)} /></View></View>
    </View>;
  };
  return <Animated.View entering={reduceMotion ? FadeIn.duration(100) : SlideInRight.duration(240)} style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]} accessibilityViewIsModal>
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.title}>Işık Mağazası</Text><Text style={styles.muted}>Oyun içi mağaza · Gerçek ödeme henüz aktif değil</Text></View><CloseButton label="Kapat" onPress={onClose} /></View>
    <View style={styles.balance}><View ref={tokenRef} onLayout={tokenMeasure} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Sprite id="icon.token" size={26} /><Text style={styles.balanceText}>{state.starTokens} yıldız jetonu</Text></View><View style={{ flex: 1 }} /><View ref={goldRef} onLayout={goldMeasure} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Sprite id="icon.coin" size={23} /><Text style={styles.balanceText}>{state.leaves} altın</Text></View><View ref={energyRef} onLayout={energyMeasure} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Sprite id="icon.energy" size={20} /><Text style={styles.balanceText}>{state.energy}</Text></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar} contentContainerStyle={styles.categoryBarContent}>
      {CATEGORIES.filter(k => IS_DEV || k !== 'İşlemler').map(k => <StoreCategory key={k} name={k} selected={category === k} onPress={() => setCategory(k)} />)}
    </ScrollView>
    {category === 'Battle Pass' ? <SeasonPass /> : <ScrollView contentContainerStyle={styles.content}>
      {!IS_DEV ? <View style={styles.notice}><Text style={styles.muted}>Gerçek satın alma ve ücretli içerikler doğrulanmış mağaza bağlantısı kurulana kadar kapalıdır.</Text></View> : null}
      {status ? <Pressable accessibilityRole="button" onPress={() => setStatus('')} style={styles.notice}><Text style={styles.noticeText}>{status}</Text></Pressable> : null}
      {category === 'Öne Çıkanlar' ? <>
        <View style={styles.hero}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>AY IŞIĞI FESTİVALİ</Text><Text style={styles.heroTitle}>Vadiye biraz ışık kat</Text><Text style={styles.heroBody}>Vadinin sezonunu ve oyun içi ödüllerini keşfet.</Text><Button small label="Sezonu incele" onPress={() => setCategory('Battle Pass')} /></View><Image source={hero} resizeMode="contain" style={styles.heroImage} /></View>
        <Text style={styles.section}>Öne çıkanlar</Text>{card('pass.moon')}{card('starter')}{card('light.120')}
        <Text style={styles.disclaimer}>Örnek para paketleri ve premium test ödülleri ayrı test kaydındadır. Üstte asıl oyun bakiyen gösterilir; tema alımları bu bakiyeyi kullanır.</Text>
      </> : null}
      {category === 'Jetonlar' ? <><Text style={styles.section}>Işık jetonları</Text><Text style={styles.muted}>Fiyatlar örnektir; gerçek para ile satın alma henüz aktif değil.</Text>{MOCK_PRODUCTS.filter(p => p.kind === 'consumable').map(p => card(p.id))}<Text style={styles.section}>Yıldız jetonları</Text><Text style={styles.muted}>Farklı görünümler aynı yıldız jetonunu temsil eder.</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{tokenArtwork.map((art, i) => <View key={i} style={{ width: 72, alignItems: 'center', borderRadius: 12, padding: 5, backgroundColor: colors.tokenSoft }}><Image source={art} resizeMode="contain" style={{ width: 60, height: 60 }} /></View>)}</ScrollView></> : null}
      {category === 'Temalar' ? <><Text style={styles.section}>Vadi temaları</Text><Text style={styles.muted}>Temaları gerçek vadinde önizle. Satın alımlar oyunundaki yıldız jetonlarını kullanır.</Text>{THEMES.map(x => themeCard(x.id))}</> : null}
      {category === 'Atölyeler' ? <><Text style={styles.section}>Atölye görünümleri</Text><Text style={styles.muted}>Tahta yerleşimi ve üretimlerin korunur.</Text>{WORKSHOP_SKINS.map(x => { const owned = state.workshopSkin.owned.includes(x.id); const pack = CARD_PACKS.find(p => p.kind === 'workshop' && p.target === x.id); const count = pack ? state.themeCards[pack.id] : 0; const mini = sceneImage(`workshop-preview-v2:${x.id}`, 102, 102, 1.5, c => drawWorkshopPreview(c, x.id)); return <View key={x.id} style={styles.themeCard}><View style={styles.workshopPreview}>{mini ? <Canvas style={{ width: 102, height: 102 }}><SkImage image={mini} x={0} y={0} width={102} height={102} fit="fill" /></Canvas> : null}</View><View style={{ flex: 1, gap: 3 }}><Text style={styles.productName}>{x.name}</Text><Text style={styles.muted}>{owned ? state.workshopSkin.active === x.id ? 'Seçili' : 'Sahip olundu' : pack ? `${count}/10 Kart` : `${x.cost} yıldız jetonu`}</Text>{pack && !owned ? <Bar value={count / 10} color={colors.token} height={5} /> : null}<Button small tone="honey" disabled={owned && state.workshopSkin.active === x.id || !!pack && !owned && count < 10} label={owned ? 'Kullan' : pack ? 'Atölyeyi Aç' : 'Satın Al'} onPress={() => owned ? dispatch({ type: 'equipWorkshopSkin', id: x.id }) : pack ? dispatch({ type: 'unlockCardCosmetic', id: pack.id }) : setSkinToBuy(x.id)} /></View></View>; })}</> : null}
      {category === 'Kart Paketleri' ? <><Text style={styles.section}>Garantili kart paketleri</Text><Text style={styles.muted}>Her paket iki aynı kart içerir. Rastgele ödül yoktur.</Text>{CARD_PACKS.map(pack => { const owned = pack.kind === 'theme' ? state.themes.owned.includes(pack.target) : state.workshopSkin.owned.includes(pack.target); const count = state.themeCards[pack.id]; return <View key={pack.id} style={styles.product}><View style={styles.cardIllustration}><Sprite id={pack.sprite} size={47} /></View><View style={{ flex: 1 }}><Text style={styles.productName}>{pack.name} Paketi</Text><Text style={styles.muted}>2 kart garantili · {count}/10</Text><Text style={styles.price}>{pack.price} yıldız jetonu</Text></View><Button small tone="honey" disabled={owned || count > 8} label={owned ? 'Açıldı' : 'İncele'} onPress={() => { sequence.current += 1; cardRequest.current = `cards-${now}-${sequence.current}-${Math.random().toString(36).slice(2)}`; cardBuying.current = false; setCardPack(pack.id); }} /></View>; })}</> : null}
      {category === 'Dekorasyonlar' ? <><Text style={styles.section}>Vadi dekorasyonları</Text><Text style={styles.muted}>Açtığın parçaları vadide uygun noktalara yerleştir, taşı veya envantere kaldır.</Text>{PREMIUM_DECOR.map(d => { const owned = state.premiumDecor.owned.includes(d.id); const placed = !!state.premiumDecor.placements[d.id]; return <View style={styles.product} key={d.id}><Sprite id={d.sprite} size={42} /><View style={{ flex: 1 }}><Text style={styles.productName}>{d.name}</Text><Text style={styles.muted}>{owned ? placed ? 'Vadide yerleştirildi' : 'Envanterde' : d.cost === 0 ? '30. seviye sezon ödülü' : `${d.cost} yıldız jetonu`}</Text></View><Button small tone="honey" disabled={!owned && d.cost === 0} label={owned ? 'Düzenle' : d.cost === 0 ? 'Sezon ödülü' : 'İncele'} onPress={() => { setDecorRegion(1); setDecorId(d.id); }} /></View>; })}</> : null}
      {category === 'Kolaylıklar' ? <><Text style={styles.section}>Oyun içi kolaylıklar</Text><Text style={styles.muted}>Oynayarak kazandığın yıldız jetonlarını kullanır.</Text>{CONVENIENCE.map(x => <View key={x.id} style={styles.product}><Sprite id={x.energy ? 'icon.energy' : x.speedMs ? 'icon.calendar' : 'icon.upgrade'} size={38} /><View style={{ flex: 1 }}><Text style={styles.productName}>{x.name}</Text><Text style={styles.muted}>{x.cost} yıldız jetonu{x.slots ? ' · kalıcı' : ''}</Text></View><Button small tone="honey" label="İncele" onPress={() => { sequence.current += 1; setConvenience({ id: x.id, requestId: `convenience-${now}-${sequence.current}-${Math.random().toString(36).slice(2)}` }); }} /></View>)}{card('worker')}<Text style={styles.muted}>Hızlandırıcı devam eden bir üretimde kullanılır; vadi tüccarında kullanılamaz.</Text></> : null}
      {category === 'Koleksiyonlar' ? <><Text style={styles.section}>Kart koleksiyonu</Text>{CARD_PACKS.map(pack => <View key={pack.id} style={styles.product}><Sprite id={pack.sprite} size={40} /><View style={{ flex: 1 }}><Text style={styles.productName}>{pack.name}</Text><Text style={styles.muted}>{state.themeCards[pack.id]}/10 kart</Text><Bar value={state.themeCards[pack.id] / 10} color={colors.token} height={6} /></View></View>)}<Text style={styles.section}>Kozmetik koleksiyonlar</Text>{COSMETIC_COLLECTIONS.map(collection => { const count = collection.items.filter(item => ownsCosmetic(state, item)).length; const claimed = state.cosmeticRewards.includes(collection.id); return <View key={collection.id} style={styles.seasonHead}><Text style={styles.productName}>{collection.name}</Text><Text style={styles.muted}>{count}/{collection.items.length} · %{Math.round(count / collection.items.length * 100)}</Text><Bar value={count / collection.items.length} color={colors.token} height={7} />{collection.items.map(item => <View key={`${item.type}:${item.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Sprite id={item.sprite} size={30} silhouette={!ownsCosmetic(state, item)} /><Text style={[styles.muted, { flex: 1 }]}>{item.name}</Text><Text style={styles.muted}>{ownsCosmetic(state, item) ? 'Sahip' : 'Eksik'}</Text></View>)}<Button small tone="sage" disabled={count < collection.items.length || claimed} label={claimed ? 'Ödül alındı' : `Ödül: ${collection.reward} jeton`} onPress={() => dispatch({ type: 'claimCosmeticCollection', id: collection.id })} /></View>; })}</> : null}
      {category === 'İşlemler' && demo ? <>
        <Text style={styles.section}>Oyun İçi Test Bakiyesi</Text>
        <Text style={styles.muted}>DEV TEST · Etkin {testProfile ? 'test profili' : 'oyun kaydı'}: {state.leaves} altın · {state.starTokens} yıldız jetonu · {state.energy} enerji. İlk işlemden önce kayıt doğrulanarak yedeklenir.</Text>
        <Text style={styles.productName}>Altın</Text><View style={styles.controls}>{[1000,10000,100000,200000].map(n => <Button key={n} small label={`+${n.toLocaleString('tr-TR')} altın`} onPress={() => { void devGrant({ currency: 'gold', amount: n }).then(ok => setStatus(ok ? 'DEV TEST altın etkin oyun kaydına eklendi.' : 'İşlem uygulanamadı.')).catch(() => setStatus('Yedek doğrulanamadı; bakiye değişmedi.')); }} />)}</View>
        <Text style={styles.productName}>Yıldız Jetonu</Text><View style={styles.controls}>{[100,500,1000,10000].map(n => <Button key={n} small label={`+${n.toLocaleString('tr-TR')} yıldız jetonu`} onPress={() => { void devGrant({ currency: 'tokens', amount: n }).then(ok => setStatus(ok ? 'DEV TEST jeton etkin oyun kaydına eklendi.' : 'İşlem uygulanamadı.')).catch(() => setStatus('Yedek doğrulanamadı; bakiye değişmedi.')); }} />)}</View>
        <Text style={styles.productName}>Enerji</Text><View style={styles.controls}>{[25,100].map(n => <Button key={n} small label={`+${n} enerji`} onPress={() => { void devGrant({ currency: 'energy', amount: n }).then(ok => setStatus(ok ? 'DEV TEST enerji eklendi.' : 'Enerji eklenemedi.')).catch(() => setStatus('Yedek doğrulanamadı; enerji değişmedi.')); }} />)}<Button small label="Enerjiyi doldur" onPress={() => { void devGrant({ currency: 'fill' }).then(ok => setStatus(ok ? 'Enerji dolduruldu.' : 'Enerji zaten dolu.')).catch(() => setStatus('Yedek doğrulanamadı; enerji değişmedi.')); }} /></View>
        <Button tone="danger" label="Test Öncesi Kayda Dön" onPress={() => setRestoreAsk(true)} />
        <Text style={styles.muted}>Üretim sürümünde test öncesi kayıt otomatik geri yüklenir; test süresindeki ilerleme o sürüme taşınmaz.</Text>
        <Text style={styles.section}>DEV TEST işlem geçmişi</Text>{(state.devTestLedger ?? []).length ? (state.devTestLedger ?? []).slice().reverse().map((x, i) => <Text key={`${x.at}-${i}`} style={styles.muted}>{x.amount > 0 ? '+' : ''}{x.amount} {x.currency === 'gold' ? 'altın' : x.currency === 'energy' ? 'enerji' : 'yıldız jetonu'} · {x.reason} · {new Date(x.at).toLocaleString()}</Text>) : <Text style={styles.muted}>Henüz etkin kayıt için test işlemi yok.</Text>}
        <Button small tone="cream" label={testProfile ? 'Normal profile dön' : 'Ayrı test profiline geç'} onPress={() => { void switchTestProfile(!testProfile).catch(() => setStatus('Profil değiştirilemedi; mevcut kayıt korundu.')); }} />
        <Text style={styles.section}>Test Satın Almaları</Text><Text style={styles.muted}>Gerçek ödeme yapılmaz. İstersen jeton paketinin etkisini etkin kayda uygula; diğer haklar yalnızca ayrı mock cüzdanında kalır.</Text>
        <View style={styles.controls}>{MOCK_PRODUCTS.map(p => <Button key={p.id} small tone="cream" label={p.name} onPress={() => { setTestSelection(true); setSelection(p.id); }} />)}</View>
        <Text style={styles.section}>Satın alma denemeleri</Text>{attempts.length ? attempts.slice().reverse().map((entry, i) => <Text key={i} style={styles.muted}>{entry}</Text>) : <Text style={styles.muted}>Henüz deneme yok.</Text>}
      </> : null}
    </ScrollView>}
    {cardPack ? <InfoModal title={`${CARD_PACKS.find(p => p.id === cardPack)?.name} Paketi`} onClose={() => setCardPack(null)} okLabel="Vazgeç" footer={<Button disabled={state.starTokens < (CARD_PACKS.find(p => p.id === cardPack)?.price ?? 0)} label="Paketi aç" onPress={() => { if (cardBuying.current) return; cardBuying.current = true; const before = state.themeCards[cardPack]; const r = dispatch({ type: 'buyCardPack', id: cardPack, requestId: cardRequest.current }); if (r.ok) { setCardResult({ id: cardPack, before }); setCardPack(null); } else cardBuying.current = false; }} />}><Sprite id={CARD_PACKS.find(p => p.id === cardPack)?.sprite ?? 'icon.gift'} size={72} /><Text style={styles.muted}>Garantili 2 kart · {CARD_PACKS.find(p => p.id === cardPack)?.price} yıldız jetonu · Bakiyen: {state.starTokens}</Text></InfoModal> : null}
    {cardResult ? <InfoModal title="Paket açıldı!" onClose={() => setCardResult(null)}><Animated.View entering={reduceMotion ? FadeIn.duration(100) : SlideInRight.duration(350)} style={{ alignItems: 'center', gap: 10 }}><View style={styles.controls}>{[0, 1].map(n => <Animated.View key={n} entering={SlideInRight.delay(n * 120).duration(350)} style={[styles.cardIllustration, { width: 76, height: 100 }]}><Sprite id={CARD_PACKS.find(p => p.id === cardResult.id)?.sprite ?? 'icon.gift'} size={58} /></Animated.View>)}</View><Text style={styles.productName}>{CARD_PACKS.find(p => p.id === cardResult.id)?.name} +2</Text><Text style={styles.price}>{cardResult.before}/10 → {state.themeCards[cardResult.id]}/10</Text></Animated.View></InfoModal> : null}
    {preview ? <InfoModal title={`${THEMES.find(x => x.id === preview)?.name} · Vadi önizlemesi`} onClose={() => setPreview(null)}><View style={{ width: 260, height: 230, overflow: 'hidden', borderRadius: 16 }}>{previewImage ? <Canvas style={{ width: 260, height: 230 }}><SkImage image={previewImage} x={0} y={-65} width={260} height={REGION_H * 260 / MAP_W} fit="fill" /></Canvas> : <Text style={styles.muted}>Önizleme yüklenemedi.</Text>}</View><Text style={styles.muted}>Önizleme mevcut vadinin bir bölümünü gösterir.</Text></InfoModal> : null}
    {decorId ? <InfoModal title={PREMIUM_DECOR.find(x => x.id === decorId)?.name ?? 'Dekorasyon'} onClose={() => setDecorId(null)} okLabel="Kapat" footer={!state.premiumDecor.owned.includes(decorId) ? <Button disabled={state.starTokens < (PREMIUM_DECOR.find(x => x.id === decorId)?.cost ?? 0)} label="Yıldız jetonuyla aç" onPress={() => { const result = dispatch({ type: 'buyPremiumDecor', id: decorId }); if (result.ok) setStatus('Dekorasyon envanterine eklendi.'); }} /> : state.premiumDecor.placements[decorId] ? <Button tone="cream" label="Envantere kaldır" onPress={() => dispatch({ type: 'placePremiumDecor', id: decorId, spot: null })} /> : undefined}><Sprite id={PREMIUM_DECOR.find(x => x.id === decorId)?.sprite ?? 'icon.map'} size={64} />{!state.premiumDecor.owned.includes(decorId) ? <Text style={styles.muted}>Fiyat: {PREMIUM_DECOR.find(x => x.id === decorId)?.cost} yıldız jetonu · Bakiyen: {state.starTokens}</Text> : <><Text style={styles.muted}>Bir bölge ve haritadaki boş noktayı seç. Dolu noktalar soluktur.</Text><ScrollView horizontal contentContainerStyle={styles.controls}>{state.regions.filter(n => n <= REGIONS.length).map(n => <Button key={n} small tone={n === decorRegion ? 'sage' : 'cream'} label={`Bölge ${n}`} onPress={() => setDecorRegion(n)} />)}</ScrollView><View style={{ width: 160, height: 440, marginTop: 8, alignSelf: 'center', overflow: 'hidden', borderRadius: 12 }}>{decorMap ? <Canvas style={{ width: 160, height: 440 }}><SkImage image={decorMap} x={0} y={0} width={160} height={440} fit="fill" /></Canvas> : null}{DECOR_SPOTS.filter(spot => spot.region === decorRegion).map((spot, index) => { const occupied = Object.entries(state.premiumDecor.placements).some(([id, location]) => id !== decorId && location === spot.id); const selected = state.premiumDecor.placements[decorId] === spot.id; return <Pressable key={spot.id} accessibilityRole="button" accessibilityLabel={`Yerleşim noktası ${index + 1}`} disabled={occupied} onPress={() => dispatch({ type: 'placePremiumDecor', id: decorId, spot: spot.id })} style={{ position: 'absolute', left: spot.x * 0.4 - 10, top: spot.y * 0.4 - 10, width: 20, height: 20, borderRadius: 10, backgroundColor: selected ? colors.honey : occupied ? '#999999' : colors.sageDeep, borderWidth: 2, borderColor: colors.white, opacity: occupied ? 0.5 : 1 }} />; })}</View></>}</InfoModal> : null}
    {skinToBuy ? <InfoModal title="Atölye görünümünü aç" onClose={() => setSkinToBuy(null)} okLabel="Vazgeç" footer={<Button disabled={state.starTokens < (WORKSHOP_SKINS.find(x => x.id === skinToBuy)?.cost ?? 0)} label="Yıldız jetonuyla aç" onPress={() => { const r = dispatch({ type: 'buyWorkshopSkin', id: skinToBuy }); if (r.ok) setSkinToBuy(null); }} />}><Text style={styles.muted}>{WORKSHOP_SKINS.find(x => x.id === skinToBuy)?.name}: {WORKSHOP_SKINS.find(x => x.id === skinToBuy)?.cost} yıldız jetonu. Bakiyen: {state.starTokens}.</Text></InfoModal> : null}
    {convenience ? <InfoModal title={CONVENIENCE.find(x => x.id === convenience.id)?.name ?? 'Kolaylık'} onClose={() => setConvenience(null)} okLabel="Vazgeç" footer={<Button disabled={state.starTokens < (CONVENIENCE.find(x => x.id === convenience.id)?.cost ?? 0) || (!!CONVENIENCE.find(x => x.id === convenience.id)?.speedMs && !convenience.target)} label="Yıldız jetonuyla al" onPress={() => { const r = dispatch({ type: 'buyConvenience', id: convenience.id, requestId: convenience.requestId, target: convenience.target }); if (r.ok) { setConvenience(null); setStatus('Kolaylık oyununa eklendi.'); } }} />}><Text style={styles.muted}>Fiyat: {CONVENIENCE.find(x => x.id === convenience.id)?.cost} yıldız jetonu · Bakiyen: {state.starTokens}</Text>{CONVENIENCE.find(x => x.id === convenience.id)?.speedMs ? <><Text style={styles.muted}>Hızlandırılacak devam eden üretimi seç:</Text>{[...Object.entries(state.nodes).filter(([, n]) => n.readyAt > now).map(([id, n]) => ({ id, expectedReadyAt: n.readyAt })), ...(state.farmFactories.grocer.readyAt > now ? [{ id: 'grocer', expectedReadyAt: state.farmFactories.grocer.readyAt }] : []), ...state.board.flatMap((cell, i) => cell.t === 'r' && cell.readyAt > now ? [{ id: `resource:${state.workshop.active}:${i}`, expectedReadyAt: cell.readyAt }] : [])].map(target => <Button key={target.id} small tone={convenience.target?.id === target.id ? 'sage' : 'cream'} label={target.id === 'grocer' ? 'Bakkal üretimi' : target.id.startsWith('resource:') ? `Atölye kaynağı ${Number(target.id.split(':')[2]) + 1}` : target.id} onPress={() => setConvenience({ ...convenience, target })} />)}</> : null}</InfoModal> : null}
    {confirmTheme ? <InfoModal title="Temayı aç" onClose={() => setConfirmTheme(null)} okLabel="Vazgeç" footer={<Button disabled={state.starTokens < (THEMES.find(x => x.id === confirmTheme)?.cost ?? 0)} label="Yıldız jetonuyla aç" onPress={() => { dispatch({ type: 'buyTheme', id: confirmTheme }); setConfirmTheme(null); }} />}><Text style={styles.muted}>{THEMES.find(x => x.id === confirmTheme)?.name}: {THEMES.find(x => x.id === confirmTheme)?.cost} yıldız jetonu. Bakiyen: {state.starTokens}.</Text></InfoModal> : null}
    {selected ? <InfoModal title={selected.name} okLabel="Kapat" onClose={() => setSelection(null)} footer={testSelection && IS_DEV ? <><Text style={styles.muted}>TEST MODU · {selected.price} örnek fiyat · Gerçek ödeme yapılmaz.</Text><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: applyMock }} aria-checked={applyMock} onPress={() => setApplyMock(!applyMock)} style={styles.product}><Text style={styles.productName}>{applyMock ? "☑" : "☐"} Test satın alımının oyun içi etkisini uygula</Text></Pressable><View style={styles.controls}>{(['success', 'cancelled', 'failed', 'offline'] as const).map(x => <Button key={x} small tone={outcome === x ? 'sage' : 'cream'} label={{ success: 'Başarılı', cancelled: 'İptal', failed: 'Hata', offline: 'Çevrimdışı' }[x]} onPress={() => setOutcome(x)} />)}</View><Button label="Test satın alımını başlat" onPress={() => { void simulate(selected.id, outcome); }} /></> : undefined}>{packArt[selected.id] !== undefined ? <Image source={tokenArtwork[packArt[selected.id]!]} style={{ width: 90, height: 90 }} resizeMode="contain" /> : <Sprite id={selected.id === 'pass.moon' ? 'icon.calendar' : 'icon.token'} size={72} />}<Text style={styles.muted}>{testSelection ? (applyMock ? 'Başarılı jeton paketi etkin geliştirme oyun kaydını değiştirir.' : 'Bu deneme yalnızca ayrı mock cüzdanını değiştirir.') : `${selected.price} · Örnek fiyat. Gerçek para ile satın alma henüz aktif değil.`}</Text></InfoModal> : null}
    {restoreAsk ? <InfoModal title="Test öncesi kayda dön?" onClose={() => setRestoreAsk(false)} okLabel="Vazgeç" footer={<Button tone="danger" label="Yedeği geri yükle" onPress={() => { void restoreDevSave().then(ok => { setRestoreAsk(false); setStatus(ok ? 'Test öncesi kayıt geri yüklendi.' : 'Bu profil için test öncesi yedek yok.'); }).catch(() => setStatus('Yedek geri yüklenemedi; mevcut kayıt korundu.')); }} />}><Text style={styles.muted}>Test başladığından beri kazandığın tüm ilerleme, harcamalar ve açtığın içerikler geri alınır. Bu işlem yalnızca etkin yerel kaydı etkiler.</Text></InfoModal> : null}
  </Animated.View>;
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 45, elevation: 45, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  title: { fontFamily: font.black, fontSize: 23, color: colors.ink },
  balance: { marginHorizontal: 14, marginVertical: 8, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, backgroundColor: colors.tokenSoft, borderWidth: 1, borderColor: colors.tokenRim },
  balanceText: { fontFamily: font.black, color: colors.tokenDeep, fontSize: 13 },
  categoryBar: { flexGrow: 0, flexShrink: 0, height: 56 },
  categoryBarContent: { gap: 8, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center' },
  category: { height: 44, flexShrink: 0, borderRadius: 22, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.border },
  categoryOn: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  categoryHover: { backgroundColor: colors.sageSoft, borderColor: colors.borderDeep },
  categoryFocus: { borderColor: colors.tokenDeep, borderWidth: 2 },
  categoryPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  categoryText: { color: colors.ink, fontFamily: font.bold, fontSize: 13, lineHeight: 18, includeFontPadding: false },
  categoryTextOn: { color: colors.white, fontFamily: font.black },
  content: { padding: 14, gap: 8, paddingBottom: 30 },
  hero: { borderRadius: radius.xl, padding: 16, backgroundColor: colors.tokenSoft, borderWidth: 1.5, borderColor: colors.tokenRim, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', minHeight: 170 },
  heroImage: { width: 145, height: 145, marginRight: -12 },
  eyebrow: { color: colors.tokenDeep, fontFamily: font.black, fontSize: 11, letterSpacing: 1 },
  heroTitle: { fontFamily: font.black, fontSize: 22, color: colors.ink, lineHeight: 27, marginVertical: 5 },
  heroBody: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, marginBottom: 10 },
  section: { fontFamily: font.black, color: colors.ink, fontSize: 19, marginTop: 8 },
  muted: { fontFamily: font.medium, color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  disclaimer: { fontFamily: font.medium, color: colors.inkSoft, fontSize: 11, lineHeight: 16, marginVertical: 6 },
  notice: { backgroundColor: colors.honeySurface, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.honeyRim },
  noticeText: { color: colors.honeyInk, fontFamily: font.bold, fontSize: 13 },
  themeCard: { flexDirection: 'row', gap: 10, padding: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper },
  themeCover: { width: 128, height: 96, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.sage },
  workshopPreview: { width: 105, height: 102, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  cardIllustration: { width: 58, height: 68, borderRadius: 12, borderWidth: 2, borderColor: colors.tokenRim, backgroundColor: colors.tokenSoft, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  product: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.border, borderBottomWidth: 3, borderBottomColor: colors.borderDeep, borderRadius: radius.l },
  productIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.honeySoft, alignItems: 'center', justifyContent: 'center' },
  productName: { fontFamily: font.black, color: colors.ink, fontSize: 15 },
  price: { color: colors.tokenDeep, fontFamily: font.bold, fontSize: 12, marginTop: 2 },
  seasonHead: { backgroundColor: colors.tokenSoft, borderRadius: radius.l, padding: 14, gap: 6 },
  rewardRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  rewardLevel: { width: 28, textAlign: 'center', fontFamily: font.black, color: colors.ink },
  rewardTile: { flex: 1, backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: 14, alignItems: 'center', padding: 7, gap: 4 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
