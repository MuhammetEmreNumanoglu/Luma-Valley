import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGame } from '../state/GameProvider';
import { Button, Sheet, Sprite } from '../ui/components';
import { font, themedStyles } from '../ui/theme';

/** Short, replayable reference. Its page index is presentation state and never changes a save. */
const PAGES = [
  { tr: 'Luma Valley’e hoş geldin', en: 'Welcome to Luma Valley', bodyTr: 'Atölyede ürünleri geliştir, görevleri tamamla ve vadiyi canlandır.', bodyEn: 'Grow items in the workshop, complete quests and restore the valley.', icons: ['icon.board', 'icon.map'] },
  { tr: 'Birleştirme', en: 'Merging', bodyTr: 'En az üç aynı ürünü birleştirmek için birini diğerinin üzerine sürükle.', bodyEn: 'Drag an item onto a matching item to merge a group of at least three.', icons: ['item.wood:1', 'item.wood:1', 'item.wood:2'] },
  { tr: 'Kutular', en: 'Crates', bodyTr: 'Kutuya dokunarak atölyeye yeni başlangıç ürünleri çıkar.', bodyEn: 'Tap the crate to place new starter items on the workshop board.', icons: ['icon.gift', 'item.wheatFarm:1'] },
  { tr: 'Enerji', en: 'Energy', bodyTr: 'Üretim ve kaynak temizliği enerji kullanır. Enerji zamanla yenilenir.', bodyEn: 'Production and clearing resources use energy. It refills over time.', icons: ['icon.energy', 'prop.rock'] },
  { tr: 'Para birimleri', en: 'Currencies', bodyTr: 'Altın ve Işık Jetonlarını ödüllerden kazanıp uygun yerlerde kullanabilirsin.', bodyEn: 'Earn gold and Light Tokens from rewards and spend them where accepted.', icons: ['icon.coin', 'icon.token'] },
  { tr: 'İnek ve süt', en: 'Cows and milk', bodyTr: 'Buzağıları birleştirip büyüt; son seviyedeki ineğe dokunarak sütünü ambara gönder.', bodyEn: 'Merge calves to grow them. Tap a fully grown cow to send milk to the barn.', icons: ['item.cow:1', 'item.cow:4', 'item.milk:1'] },
  { tr: 'Buğday', en: 'Wheat', bodyTr: 'Buğday tohumlarını birleştir, büyüyen tarlaya dokun ve buğdayı ambara al.', bodyEn: 'Merge wheat seeds, then tap the mature field to send wheat to the barn.', icons: ['item.wheatFarm:1', 'item.wheatFarm:4', 'item.wheatCrop:1'] },
  { tr: 'Hayvanlar', en: 'Animals', bodyTr: 'Hayvanları birleştirerek büyüt. Hazır hayvanlara dokunup ürünlerini topla.', bodyEn: 'Merge animals to grow them, then tap ready animals to collect produce.', icons: ['item.chicken:1', 'item.chicken:4', 'item.egg:1'] },
  { tr: 'Depo', en: 'Storage', bodyTr: 'Toplanan ürünleri ambarda gör; atölyedeki eşyaları envanterde saklayabilirsin.', bodyEn: 'Find harvested goods in the barn and keep workshop items in inventory.', icons: ['icon.bag', 'item.milk:1'] },
  { tr: 'Üretim', en: 'Production', bodyTr: 'Üretim yerini aç, bir iş seç ve süre dolunca hazır ürünü topla.', bodyEn: 'Open a production place, choose a job and collect it when ready.', icons: ['producer.lanternStone', 'icon.check'] },
  { tr: 'Tüccarlar', en: 'Traders', bodyTr: 'Tüccarların istediği ambar ürünlerini teslim et; hazır ödülü al.', bodyEn: 'Deliver the barn goods traders request and collect the ready reward.', icons: ['icon.shop', 'icon.coin'] },
  { tr: 'Vadi görevleri', en: 'Valley quests', bodyTr: 'Görevlerin gereksinimlerini tamamlayarak yapıları onar ve hikâyede ilerle.', bodyEn: 'Meet quest requirements to restore buildings and advance the story.', icons: ['icon.quests', 'icon.map'] },
  { tr: 'Işık Yolları', en: 'Light Paths', bodyTr: 'Yolları döndürerek ışığı hedeflere ulaştır. Açık seviyeleri sırayla çöz.', bodyEn: 'Rotate paths to bring light to the targets. Solve unlocked levels in order.', icons: ['icon.puzzle', 'icon.star'] },
  { tr: 'Battle Pass', en: 'Battle Pass', bodyTr: 'Sezon görevlerini tamamla, Battle Pass XP kazan ve açık ödülleri al.', bodyEn: 'Complete season tasks, earn Battle Pass XP and claim unlocked rewards.', icons: ['icon.journal', 'icon.star'] },
  { tr: 'Temalar ve kartlar', en: 'Themes and cards', bodyTr: 'Kart paketlerini keşfet; kazandığın tema ve atölye görünümlerini koleksiyonda bul.', bodyEn: 'Explore card packs and find earned valley and workshop appearances in your collection.', icons: ['icon.token', 'item.crystal:4', 'icon.gift'] },
] as const;

export function HowToGuide({ onClose }: { onClose: () => void }) {
  const { lang } = useGame();
  const [page, setPage] = useState(0);
  const current = PAGES[page];
  const last = page === PAGES.length - 1;
  return <Sheet title={lang === 'tr' ? 'Nasıl oynanır?' : 'How to play'} onClose={onClose} footer={<View style={styles.actions}>
    <Button tone="cream" label={lang === 'tr' ? 'Önceki' : 'Previous'} disabled={page === 0} onPress={() => setPage(n => Math.max(0, n - 1))} style={{ flex: 1 }} />
    <Button tone="sage" label={last ? (lang === 'tr' ? 'Bitti' : 'Done') : (lang === 'tr' ? 'Sonraki' : 'Next')} onPress={() => last ? onClose() : setPage(n => Math.min(PAGES.length - 1, n + 1))} style={{ flex: 1 }} />
  </View>}>
    <Text style={styles.counter}>{page + 1} / {PAGES.length}</Text>
    <View style={styles.art} accessibilityLabel={lang === 'tr' ? current.tr : current.en}>{current.icons.map((icon, i) => <Sprite key={`${icon}:${i}`} id={icon} size={68} />)}</View>
    <Text style={styles.title}>{lang === 'tr' ? current.tr : current.en}</Text>
    <Text style={styles.body}>{lang === 'tr' ? current.bodyTr : current.bodyEn}</Text>
  </Sheet>;
}

const styles = themedStyles(colors => StyleSheet.create({
  counter: { color: colors.inkSoft, fontFamily: font.bold, textAlign: 'center', fontSize: 13, marginBottom: 8 },
  art: { minHeight: 120, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, padding: 12 },
  title: { color: colors.ink, fontFamily: font.black, fontSize: 20, textAlign: 'center', marginTop: 14 },
  body: { color: colors.inkSoft, fontFamily: font.medium, fontSize: 15, lineHeight: 22, textAlign: 'center', marginVertical: 10 },
  actions: { flexDirection: 'row', gap: 8 },
}));
