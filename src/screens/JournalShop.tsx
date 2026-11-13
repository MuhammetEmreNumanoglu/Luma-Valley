import { MARKET_OFFERS } from '../content/market';
import { turkeyDay } from '../premium/season';
// Journal (collection, characters, memories, achievements, recipes) and Market (tokens, energy,
// bag, producer upgrades, token packs — real payments are not active in this build).
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CARD_PACKS } from '../premium/cards';
import { ACHIEVEMENTS, ACHIEVEMENT_STAGES, achievementProgress, achievementStageId } from '../content/achievements';
import { BALANCE, leafBreakCost } from '../content/balance';
import { CHARACTERS } from '../content/characters';
import { DECORATIONS } from '../content/decorations';
import { FARM_RECIPES, TRADER_RECIPE } from '../content/farm';
import { FAMILIES, itemKey } from '../content/families';
import { collectibleKeys, collectionReward, NOT_COLLECTIBLE } from '../content/progression';
import { unclaimedCollection } from '../engine/tutorial';
import { haptic } from '../feedback';
import { Dot } from '../ui/components';
import { ICON } from './Panels';
import { PRODUCER, producerLevel, type ProducerId } from '../content/producers';
import { useGame } from '../state/GameProvider';
import { Bar, Button, Card, SectionTitle, Sprite } from '../ui/components';
import { colors, font, radius } from '../ui/theme';

type Tab = 'collection' | 'characters' | 'memories' | 'achievements' | 'recipes';

function achievementDescription(id: string, tr: boolean): string {
  if (id.startsWith('merge')) return tr ? 'Atölyede ürünleri birleştir.' : 'Merge items in the workshop.';
  if (id.startsWith('five')) return tr ? 'Atölyede kaya ve kütükleri temizle.' : 'Clear rocks and logs in the workshop.';
  if (id.startsWith('discover')) return tr ? 'Yeni ürünler keşfet.' : 'Discover new items.';
  if (id.startsWith('puzzle')) return tr ? 'Işık Yolları bulmacalarını çöz.' : 'Solve Light Paths puzzles.';
  if (id.startsWith('stars')) return tr ? 'Bulmacaları üç yıldızla tamamla.' : 'Complete puzzles with three stars.';
  if (id === 'bridge' || id.startsWith('region')) return tr ? 'Vadideki görevleri tamamlayıp yeni bölgeleri aç.' : 'Complete valley quests and unlock regions.';
  if (id === 'friends') return tr ? 'Vadideki karakterlerle tanış.' : 'Meet the valley characters.';
  if (id.startsWith('structures')) return tr ? 'Vadideki yapıları onar.' : 'Restore valley structures.';
  if (id.startsWith('orders')) return tr ? 'Tüccar siparişlerini teslim et.' : 'Deliver villager orders.';
  if (id.startsWith('memories')) return tr ? 'Vadinin anılarını topla.' : 'Collect valley memories.';
  if (id === 'secret') return tr ? 'Farklı tarifleri dene.' : 'Try different recipes.';
  if (id.startsWith('level')) return tr ? 'Oynayarak oyuncu seviyeni yükselt.' : 'Raise your player level.';
  return tr ? 'Vadinin hikâyesinde ilerle.' : 'Progress through the valley story.';
}

export function JournalScreen() {
  const { state, t, c, open, dispatch, lang } = useGame();
  const [tab, setTab] = useState<Tab>('collection');
  const total = collectibleKeys().length;
  const unclaimed = unclaimedCollection(state);
  const collectAll = () => {
    let paid = 0;
    for (const k of state.discovered) {
      if (NOT_COLLECTIBLE.some((f) => k.startsWith(`${f}:`)) || state.collected.includes(k)) continue;
      if (dispatch({ type: 'claimCollection', item: k }).ok) paid++;
    }
    if (paid) haptic.success();
  };
  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={{ flexGrow: 0, flexShrink: 0, height: 56 }}>
        {(['collection', 'characters', 'memories', 'achievements', 'recipes'] as Tab[]).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={[styles.tabText, tab === k && { color: colors.white }]}>{t(`journal.${k}` as 'journal.collection')}</Text>
            {k === 'collection' && unclaimed > 0 ? <Dot style={{ top: -2, right: -2 }} /> : null}
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'collection' ? (
          <>
            <Text style={styles.meta}>{t('journal.discovered', { a: state.discovered.filter((k) => !k.startsWith('coin:')).length, b: total })}</Text>
            {unclaimed > 0 ? (
              <Card tone="gold" style={styles.claimBanner}>
                <Sprite id={ICON.coin} size={34} />
                <Text style={[styles.cardTitle, { flex: 1, fontSize: 15 }]}>{t('col.unclaimed', { n: unclaimed })}</Text>
                <Button small tone="honey" label={t('col.collectAll')} onPress={collectAll} />
              </Card>
            ) : null}
            {FAMILIES.filter((f) => !NOT_COLLECTIBLE.includes(f.id)).map((f) => {
              const known = Array.from({ length: f.levels }, (_, i) => state.discovered.includes(itemKey(f.id, i + 1)));
              const firstUnknown = known.indexOf(false);
              return (
                <Card key={f.id} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.cardTitle}>{c(`family.${f.id}`)}</Text>
                    <Text style={styles.meta}>
                      {known.filter(Boolean).length}/{f.levels}
                    </Text>
                  </View>
                  <View style={styles.chain}>
                    {known.map((k, i) => {
                      const key = itemKey(f.id, i + 1);
                      const pending = k && !state.collected.includes(key);
                      return (
                        <Pressable key={i} onPress={() => (pending ? dispatch({ type: 'claimCollection', item: key }) : open('source', key))} onLongPress={() => open('source', key)} style={[styles.chainCell, pending && styles.chainCellNew]} accessibilityRole="button" accessibilityLabel={k ? `${c(`item.${key}`)}${pending ? `, ${t('col.reward', { n: collectionReward(key).coins })}` : ''}` : t('journal.unknown')}>
                          <Sprite id={`item.${key}`} size={40} silhouette={!k} />
                          <Text style={styles.chainLv}>{i + 1}</Text>
                          {pending ? (
                            <>
                              <Dot style={{ top: -3, right: -3 }} />
                              <View style={styles.collectChip}>
                                <Sprite id={ICON.coin} size={12} />
                                <Text style={styles.collectText}>{collectionReward(key).coins}</Text>
                              </View>
                            </>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                  {firstUnknown > 0 ? <Text style={styles.hint}>{t('journal.hintMerge', { x: c(`item.${itemKey(f.id, firstUnknown)}`) })}</Text> : null}
                </Card>
              );
            })}
          </>
        ) : null}
        {tab === 'characters'
          ? CHARACTERS.map((ch) => {
              const met = state.metChars.includes(ch.id);
              return (
                <Card key={ch.id} style={{ marginBottom: 8, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Sprite id={`portrait.${ch.id}.${met ? 'happy' : 'calm'}`} size={72} silhouette={!met} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{met ? c(`char.${ch.id}`) : t('journal.unknown')}</Text>
                    <Text style={styles.meta}>{c(`char.${ch.id}.role`)}</Text>
                    <Text style={styles.body}>{met ? c(`char.${ch.id}.bio`) : t('journal.notMet')}</Text>
                  </View>
                </Card>
              );
            })
          : null}
        {tab === 'memories' ? (
          state.memories.length ? (
            <View style={styles.grid}>
              {state.memories.map((m) => (
                <Pressable key={m} onPress={() => open('memory', m)} style={styles.memory} accessibilityRole="button">
                  <Sprite id="item.memory:3" size={56} />
                  <Text style={styles.memoryTitle} numberOfLines={2}>
                    {c(`structure.${m}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>{t('journal.noMemories')}</Text>
          )
        ) : null}
        {tab === 'achievements'
          ? ACHIEVEMENTS.map((a) => {
              const oldGold = state.achievements.includes(a.id);
              const progress = achievementProgress(a, state);
              const names = lang === 'tr' ? ['Bronz', 'Gümüş', 'Altın'] : ['Bronze', 'Silver', 'Gold'];
              const claimed = ACHIEVEMENT_STAGES.map((_, i) => oldGold || state.achievements.includes(achievementStageId(a.id, i)));
              const completed = claimed.reduce((highest, done, i) => done ? i + 1 : highest, 0);
              const trophyColor = [colors.borderDeep, '#B77D48', '#9AA8B2', '#E6AD37'][completed];
              return <Card key={a.id} tone={oldGold ? 'gold' : 'paper'} style={{ marginBottom: 8, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Sprite id="icon.trophy" size={40} style={{ tintColor: trophyColor } as never} />
                  <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{c(`ach.${a.id}`)}</Text><Text style={styles.meta}>{achievementDescription(a.id, lang === 'tr')}</Text></View>
                  <View style={{ flexDirection: 'row', gap: 2 }}>{[0, 1, 2].map(i => <Sprite key={i} id="icon.star" size={20} silhouette={i >= completed} />)}</View>
                </View>
                {ACHIEVEMENT_STAGES.map((stage, i) => { const target = progress.targets[i]; const value = Math.min(target, progress.value); const ready = progress.value >= target; return <View key={stage.key} style={{ padding: 7, borderRadius: 10, backgroundColor: colors.surfaceAlt, gap: 4 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ flex: 1 }}><Text style={styles.meta}>{names[i]} · {value}/{target}</Text><Bar value={value / target} color={colors.sage} /></View><Sprite id="icon.coin" size={16} /><Text style={styles.meta}>{a.coins * stage.multiplier}</Text><Sprite id="icon.token" size={16} /><Text style={styles.meta}>{stage.stars}{i === 2 ? ` · 2 ${CARD_PACKS[ACHIEVEMENTS.indexOf(a) % CARD_PACKS.length].name}` : ''}</Text>{claimed[i] ? <Text style={styles.meta}>{lang === 'tr' ? 'Alındı' : 'Claimed'}</Text> : ready ? <Button small tone="sage" label={lang === 'tr' ? 'Ödülü Al' : 'Claim reward'} onPress={() => dispatch({ type: 'claimAchievement', id: a.id, stage: i })} /> : null}</View></View>; })}
              </Card>;
            })
          : null}
        {tab === 'recipes'
          ? <>
            <Card tone="gold" style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Sprite id="icon.shop" size={44} /><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{lang === 'tr' ? 'Vadi Tüccarı' : 'Valley Trader'}</Text><Text style={styles.body}>{lang === 'tr' ? 'Ambardan teslim et · 45 saniye' : 'Deliver from the barn · 45 seconds'}</Text></View></View>
              <View style={[styles.recipe, { flexWrap: 'wrap' }]}>{TRADER_RECIPE.inputs.map(input => <View key={input.item} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Sprite id={`item.${input.item}`} size={30} /><Text style={styles.meta}>{c(`item.${input.item}`)} ×{input.count}</Text></View>)}<Text style={styles.meta}>→</Text><Sprite id="icon.token" size={28} /><Text style={styles.meta}>×1</Text></View>
            </Card>
            {FARM_RECIPES.grocer.map((recipe, index) => <Card key={index} style={{ marginBottom: 8 }}>
              <Text style={styles.cardTitle}>{lang === 'tr' ? recipe.tr : recipe.en}</Text>
              <View style={[styles.recipe, { flexWrap: 'wrap' }]}>{recipe.inputs.map(input => <View key={input.item} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Sprite id={`item.${input.item}`} size={30} /><Text style={styles.meta}>{c(`item.${input.item}`)} ×{input.count}</Text></View>)}</View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}><Sprite id="icon.coin" size={19} /><Text style={styles.meta}>{recipe.gold}</Text><Sprite id="icon.token" size={19} /><Text style={styles.meta}>1</Text><Sprite id="icon.calendar" size={19} /><Text style={styles.meta}>{Math.ceil(recipe.seconds / 60)} {lang === 'tr' ? 'dk' : 'min'}</Text></View>
            </Card>)}
          </>
          : null}
      </ScrollView>
    </View>
  );
}

export function ShopScreen() {
  const { state, t, c, dispatch, lang, now, open } = useGame();
  const marketDay = turkeyDay(Math.max(now, state.clockHigh));
  const energyTap = useRef(false);
  const buyEnergy = () => { if (energyTap.current) return; energyTap.current = true; dispatch({ type: 'buyEnergy', expectedBuys: state.energyBuys }); setTimeout(() => { energyTap.current = false; }, 500); };
  const bought = state.inventory.length - state.premiumSlots - BALANCE.inventory.startSlots;
  const slotCost = BALANCE.inventory.slotCostLeaves[bought];
  const owned = (Object.keys(state.producers) as ProducerId[]).filter((id) => PRODUCER[id]);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={{ flexDirection: 'row', gap: 8 }}><Button small tone="sage" label="Pazar" onPress={() => {}} /><Button small tone="cream" icon="icon.bag" label="Işık Mağazası" onPress={() => open('premium', true)} /></View>
      <Card tone="gold" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Sprite id="icon.coin" size={56} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {t('hud.coins')}: {state.leaves}
          </Text>
          <Text style={styles.body}>{t('shop.earn')}</Text>
        </View>
      </Card>

      <SectionTitle>{t('hud.energy')}</SectionTitle>
      <Card style={[styles.shopRow, { backgroundColor: colors.energySoft, borderColor: colors.energyEdge }]}>
        <Sprite id="icon.energy" size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t('shop.tea', { n: BALANCE.energy.leafBreak.amount })}</Text>
          <Text style={styles.body}>{t('shop.teaDesc', { n: BALANCE.energy.leafBreak.amount })}</Text>
        </View>
        <Button small icon="icon.leaf" label={String(leafBreakCost(state.energyBuys))} disabled={state.energy + BALANCE.energy.leafBreak.amount > BALANCE.energy.overflowCap} onPress={buyEnergy} />
      </Card>
      <Card style={[styles.shopRow, { marginTop: 8 }]}>
        <Sprite id="icon.bag" size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t('shop.slot')}</Text>
          <Text style={styles.body}>{t('shop.slotDesc', { a: state.inventory.length, b: BALANCE.inventory.maxSlots + state.premiumSlots })}</Text>
        </View>
        {slotCost !== undefined && state.inventory.length - state.premiumSlots < BALANCE.inventory.maxSlots ? (
          <Button small icon="icon.leaf" label={String(slotCost)} onPress={() => dispatch({ type: 'buySlot' })} />
        ) : (
          <Text style={styles.meta}>{t('shop.maxed')}</Text>
        )}
      </Card>

      <SectionTitle>{lang === 'tr' ? 'Günlük teklifler' : 'Daily offers'}</SectionTitle>
      <Text style={styles.body}>{lang === 'tr' ? 'Her teklif Türkiye saatine göre günde bir kez alınabilir.' : 'Each offer is available once per day.'}</Text>
      {MARKET_OFFERS.map(offer => { const claimed = !!state.flags[`marketOffer:${marketDay}:${offer.id}`]; return <Card key={offer.id} style={[styles.shopRow, { marginTop: 8 }]}><Sprite id={offer.sprite} size={44} /><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{offer.name}</Text><Text style={styles.body}>{offer.items.length ? 'Malzemeler depoya gönderilir.' : 'Kutu sayacına eklenir.'}</Text></View>{claimed ? <Text style={styles.meta}>Alındı</Text> : <Button small icon="icon.coin" label={String(offer.price)} onPress={() => dispatch({ type: 'buyMarketOffer', id: offer.id, expectedDay: marketDay })} />}</Card>; })}
      <SectionTitle>{t('shop.upgrades')}</SectionTitle>
      <Text style={styles.body}>{t('shop.upgradeDesc')}</Text>
      {owned.map((id) => {
        const st = state.producers[id]!;
        const lv = producerLevel(id, st.level);
        return (
          <Card key={id} style={[styles.shopRow, { marginTop: 8 }]}>
            <Sprite id={`producer.${id}`} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {c(`producer.${id}`)} · {t('common.level')} {st.level}/{PRODUCER[id].levels.length}
              </Text>
              <Text style={styles.body}>{t('board.charges', { a: st.charges, b: lv.charges })}</Text>
            </View>
            {lv.upgradeLeaves !== undefined ? <Button small icon="icon.leaf" label={String(lv.upgradeLeaves)} onPress={() => dispatch({ type: 'upgrade', producer: id })} /> : <Text style={styles.meta}>{t('shop.maxed')}</Text>}
          </Card>
        );
      })}

      <SectionTitle>{t('shop.decor')}</SectionTitle>
      <Text style={styles.body}>{t('shop.decorDesc')}</Text>
      {DECORATIONS.filter((d) => state.regions.includes(d.region))
        .slice(-8)
        .map((d) => {
          const owned = state.decorations.includes(d.id);
          return (
            <Card key={d.id} style={[styles.shopRow, { marginTop: 8 }]}>
              <Sprite id={`deco.${d.kind}`} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c(`decor.${d.kind}`)}</Text>
                <Text style={styles.body}>{c(`region.${d.region}`)}</Text>
              </View>
              {owned ? <Text style={styles.meta}>{t('shop.owned')}</Text> : <Button small icon="icon.leaf" label={String(d.cost)} onPress={() => dispatch({ type: 'buyDecoration', id: d.id })} />}
            </Card>
          );
        })}

      <SectionTitle>{lang === 'tr' ? 'Mağaza önizlemesi' : 'Store preview'}</SectionTitle>
      <Card style={{ backgroundColor: colors.surfaceAlt }}>
        <Text style={styles.body}>{lang === 'tr' ? 'Bu bölüm görsel önizlemedir; gerçek satın alma yapılmaz.' : 'This section is a visual preview; no real purchases are made.'}</Text>
      </Card>
      <View style={styles.packs}>
        <View style={[styles.pack, styles.packToken]}><Sprite id="icon.token" size={48} /><Text style={[styles.packAmount, { color: colors.tokenDeep }]}>{lang === 'tr' ? 'Yıldız jetonu' : 'Star tokens'}</Text><Text style={styles.meta}>{lang === 'tr' ? 'Örnek paket' : 'Sample pack'}</Text></View>
        <View style={[styles.pack, styles.packWorker]}><Sprite id="icon.upgrade" size={48} /><Text style={[styles.packAmount, { color: colors.sageDeep }]}>{lang === 'tr' ? '+1 işçi' : '+1 worker'}</Text><Text style={styles.meta}>{lang === 'tr' ? '₺49,99 · Önizleme' : '₺49.99 · Preview'}</Text></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  packToken: { backgroundColor: colors.tokenSoft, borderColor: colors.tokenRim, borderBottomColor: colors.token },
  packWorker: { backgroundColor: colors.sageSoft, borderColor: colors.sageRim, borderBottomColor: colors.sage },
  claimBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  chainCellNew: { backgroundColor: colors.honeySoft, borderColor: colors.honey },
  collectChip: { position: 'absolute', bottom: -6, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 1, paddingHorizontal: 4, height: 16, borderRadius: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.honeyEdge },
  collectText: { fontFamily: font.black, fontSize: 10, color: colors.honeyInk },
  tabs: { gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  tab: { paddingHorizontal: 15, minHeight: 38, justifyContent: 'center', borderRadius: 999, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.white, borderBottomWidth: 3, borderBottomColor: colors.borderDeep, shadowColor: colors.sageDeep, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
  tabOn: { backgroundColor: colors.sageDeep, borderColor: colors.sageRim, borderBottomColor: colors.sageEdge },
  tabText: { fontFamily: font.bold, fontSize: 13, color: colors.ink },
  content: { padding: 12, paddingBottom: 40 },
  meta: { fontFamily: font.bold, fontSize: 12, color: colors.inkSoft },
  body: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  hint: { fontFamily: font.medium, fontSize: 11, color: colors.sageDeep, marginTop: 6 },
  cardTitle: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  chain: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chainCell: { width: 48, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.white, borderBottomWidth: 3, borderBottomColor: colors.border },
  chainLv: { position: 'absolute', bottom: 1, right: 4, fontFamily: font.black, fontSize: 9, color: colors.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  memory: { width: '47%', backgroundColor: colors.surfaceAlt, borderRadius: radius.l, padding: 12, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: colors.white, borderBottomWidth: 4, borderBottomColor: colors.borderDeep, shadowColor: colors.sageDeep, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  memoryTitle: { fontFamily: font.bold, fontSize: 13, color: colors.ink, textAlign: 'center' },
  empty: { fontFamily: font.medium, fontSize: 14, color: colors.inkSoft, textAlign: 'center', marginTop: 30 },
  recipe: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  packs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pack: { width: '48%', backgroundColor: colors.surface, borderRadius: radius.l, padding: 10, alignItems: 'center', borderWidth: 2, borderColor: colors.white, borderBottomWidth: 4, borderBottomColor: colors.borderDeep, shadowColor: colors.sageDeep, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  packAmount: { fontFamily: font.black, fontSize: 20, color: colors.ink },
});
