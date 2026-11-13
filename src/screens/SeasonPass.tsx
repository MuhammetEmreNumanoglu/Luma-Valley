import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { CARD_PACKS, seasonCard } from '../premium/cards';
import { SEASON_LEVELS } from '../premium/catalog';
import { freeSeasonLevel, seasonRemaining, seasonTasks, seasonNotices, untilTurkeyMidnight, type SeasonTask } from '../premium/season';
import { useGame } from '../state/GameProvider';
import { Bar, Button, clock, Dot, InfoModal, Sprite } from '../ui/components';
import { colors, font } from '../ui/theme';

type Reward = { name: string; sprite: string; detail: string };
/** The free reward catalog matches the command that actually delivers each reward. */
function rewardFor(level: number, premium: boolean): Reward {
  if (premium) return level % 3 === 0 ? { name: '15 yıldız jetonu', sprite: 'icon.token', detail: 'Premium yol için planlanan jeton ödülü.' } : level % 3 === 1 ? { name: '250 altın', sprite: 'icon.coin', detail: 'Premium yol için planlanan altın ödülü.' } : { name: '30 enerji', sprite: 'icon.energy', detail: 'Premium yol için planlanan enerji ödülü.' };
  if (level === 30) return { name: '5 jeton + fener + 2 kart', sprite: 'item.lantern:4', detail: '5 yıldız jetonu, Ay Işığı Feneri ve 2 Ay Işığı Kartı.' };
  const card = seasonCard(level);
  if (card) { const item = CARD_PACKS.find(p => p.id === card)!; const base = level === 10 ? '250 altın' : level === 20 ? '15 enerji + 150 altın' : level % 3 === 0 ? '5 jeton' : level % 3 === 1 ? '100 altın' : '15 enerji'; return { name: `${base} + 2 kart`, sprite: item.sprite, detail: `${base} ve 2 ${item.name}.` }; }
  return level % 3 === 0 ? { name: '5 yıldız jetonu', sprite: 'icon.token', detail: 'Oyun içi yıldız jetonu bakiyene eklenir.' } : level % 3 === 1 ? { name: '100 altın', sprite: 'icon.coin', detail: 'Oyun içi altın bakiyene eklenir.' } : { name: '15 enerji', sprite: 'icon.energy', detail: 'Oyunda kullanabileceğin 15 enerji.' };
}

export function SeasonPass() {
  const { state, dispatch, now, reduceMotion } = useGame();
  const season = state.freeSeason;
  const level = freeSeasonLevel(season);
  const notice = seasonNotices(season, state.energy);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'season'>('daily');
  const [showTasks, setShowTasks] = useState(false);
  const [detail, setDetail] = useState<{ level: number; premium: boolean } | null>(null);
  const tasks = seasonTasks(season).filter(t => t.id.startsWith(`${period}:`));
  const xpRemainder = level >= 30 ? 100 : season.xp % 100;
  const rewardTile = (n: number, premium: boolean) => {
    const reward = rewardFor(n, premium), claimed = !premium && season.claimedRewards.includes(n), unlocked = n <= level;
    const available = !premium && unlocked && !claimed;
    return <Pressable accessibilityRole="button" accessibilityLabel={`${premium ? 'Premium' : 'Ücretsiz'} seviye ${n}: ${reward.name} · ${premium ? 'yakında' : claimed ? 'alındı' : available ? 'alınabilir' : 'kilitli'}`} disabled={claimed} onPress={() => available ? dispatch({ type: 'claimSeasonReward', level: n }) : setDetail({ level: n, premium })} style={[styles.tile, premium && styles.premiumTile, !unlocked && styles.lockedTile, available && styles.availableTile, claimed && styles.claimedTile]}>
      {premium ? <Text style={styles.crown}>♛</Text> : null}
      {claimed ? <Text style={styles.claimCheck}>✓</Text> : null}
      <Sprite id={reward.sprite} size={48} />
      <Text style={styles.tileName} numberOfLines={2}>{reward.name}</Text>
      <Text style={styles.tileStatus}>{premium ? 'Yakında' : claimed ? 'Alındı ✓' : available ? 'Ödülü al' : 'Kilitli'}</Text>
    </Pressable>;
  };
  const taskRow = (task: SeasonTask) => {
    const value = Math.min(task.target, season.progress[task.id] ?? 0), done = value >= task.target, claimed = season.claimedTasks.includes(task.id);
    const expectedPeriod = task.id.startsWith('daily:') ? season.day : task.id.startsWith('weekly:') ? season.week : 0;
    return <View key={task.id} style={styles.task}><View style={{ flex: 1, gap: 4 }}><Text style={styles.taskName}>{task.label}</Text><Bar value={value / task.target} color={colors.sage} height={7} /><Text style={styles.small}>{value}/{task.target} · {task.xp} BP XP</Text></View>{claimed ? <Text style={styles.claimed}>Alındı</Text> : done ? <Button small tone="sage" label="Ödülü Al" onPress={() => dispatch({ type: 'claimSeasonTask', id: task.id, expectedPeriod })} /> : null}</View>;
  };
  const header = <View style={styles.container}>
    <Animated.View key={season.xp} entering={reduceMotion ? FadeIn.duration(100) : ZoomIn.duration(220)} style={styles.hero}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>VADİ YOLCULUĞU · AY IŞIĞI FESTİVALİ</Text><Text style={styles.title}>Işığın peşinde</Text><Text style={styles.subtitle}>{Math.ceil(seasonRemaining(season, now) / 86400000)} gün kaldı · Seviye {level}/30</Text><Bar value={xpRemainder / 100} color={colors.token} height={9} /><Text style={styles.subtitle}>{level >= 30 ? 'Son seviyeye ulaştın' : `Sonraki seviyeye ${100 - xpRemainder} XP`}</Text></View><Sprite id="item.lantern:4" size={68} /></Animated.View>
    <View style={styles.heading}><View><Text style={styles.section}>Ödül yolu</Text><Text style={styles.small}>Kaydırarak tüm seviyeleri gör</Text></View><View><Button small tone="sage" label="Günlük Görevler" onPress={() => setShowTasks(!showTasks)} />{notice.tasks > 0 ? <Dot testID="season-tasks-notice" /> : null}</View></View>
    {showTasks ? <Animated.View entering={reduceMotion ? FadeIn.duration(100) : ZoomIn.duration(180)} style={styles.tasks}><View style={styles.tabs}>{(['daily', 'weekly', 'season'] as const).map(p => <Pressable key={p} accessibilityRole="tab" accessibilityState={{ selected: period === p }} onPress={() => setPeriod(p)} style={[styles.tab, period === p && styles.tabOn]}><Text style={[styles.tabText, period === p && { color: colors.white }]}>{p === 'daily' ? 'Günlük' : p === 'weekly' ? 'Haftalık' : 'Sezonluk'}</Text>{notice[p] > 0 ? <Dot testID={`season-${p}-notice`} /> : null}</Pressable>)}</View>{period === 'daily' ? <Text style={styles.small}>Yenilenme: {clock(untilTurkeyMidnight(Math.max(now, season.highTime)))} · Türkiye saati</Text> : null}{season.pendingTasks.map(p => <View key={p.key} style={styles.task}><View style={{ flex: 1 }}><Text style={styles.taskName}>{p.label}</Text><Text style={styles.small}>Önceki dönem · {p.xp} BP XP</Text></View><Button small tone="sage" label="Ödülü Al" onPress={() => dispatch({ type: 'claimSeasonTask', id: p.key })} /></View>)}{tasks.map(taskRow)}</Animated.View> : null}
    <View style={styles.verticalRow}><View style={styles.columnHeader}><Text style={styles.freeLabel}>ÜCRETSİZ</Text>{notice.levels > 0 ? <Dot testID="season-level-notice" /> : null}</View><View style={{ width: 38 }} /><View style={styles.columnHeader}><Text style={styles.premiumLabel}>PREMIUM · YAKINDA</Text></View></View>
  </View>;
  return <View style={{ flex: 1 }}>
    <FlatList accessibilityLabel="Dikey sezon ödül yolu" data={Array.from({ length: SEASON_LEVELS }, (_, i) => i + 1)} keyExtractor={n => String(n)} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={7} contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: 36 }} ListHeaderComponent={header} renderItem={({ item: n }) => <View style={styles.verticalRow}>{rewardTile(n, false)}<View style={[styles.levelPath, n <= level && styles.levelPathOn]}><Text style={styles.levelNumber}>{n}</Text></View>{rewardTile(n, true)}</View>} ListFooterComponent={<Text style={styles.small}>Premium yol henüz aktif değil; test satın alımları gerçek oyuna aktarılmaz.</Text>} />
    {detail ? <InfoModal title={`${detail.level}. seviye · ${detail.premium ? 'Premium' : 'Ücretsiz'}`} onClose={() => setDetail(null)} okLabel="Kapat" footer={!detail.premium && detail.level <= level && !season.claimedRewards.includes(detail.level) ? <Button label="Ödülü Al" onPress={() => { const result = dispatch({ type: 'claimSeasonReward', level: detail.level }); if (result.ok) setDetail(null); }} /> : undefined}><View style={{ alignItems: 'center', gap: 6 }}><Sprite id={rewardFor(detail.level, detail.premium).sprite} size={72} /><Text style={styles.taskName}>{rewardFor(detail.level, detail.premium).name}</Text><Text style={styles.small}>{detail.premium ? 'Premium yol henüz aktif değil. ' : ''}{rewardFor(detail.level, detail.premium).detail}</Text></View></InfoModal> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 10 }, hero: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEE5F6', borderColor: '#C7A7DD', borderWidth: 1.5, borderRadius: 20, padding: 14 }, eyebrow: { color: '#765192', fontFamily: font.black, fontSize: 10 }, title: { color: colors.ink, fontFamily: font.black, fontSize: 23 }, subtitle: { color: colors.inkSoft, fontFamily: font.bold, fontSize: 12, marginVertical: 4 }, heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, section: { fontFamily: font.black, fontSize: 19, color: colors.ink }, small: { fontFamily: font.medium, color: colors.inkSoft, fontSize: 11, lineHeight: 16 }, tasks: { borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 6 }, tabs: { flexDirection: 'row', gap: 5 }, tab: { flex: 1, borderRadius: 12, backgroundColor: colors.surfaceAlt, padding: 8, alignItems: 'center' }, tabOn: { backgroundColor: colors.sageDeep }, tabText: { fontFamily: font.bold, fontSize: 12, color: colors.ink }, task: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderColor: colors.border, paddingVertical: 8 }, taskName: { fontFamily: font.bold, color: colors.ink, fontSize: 13 }, claimed: { fontFamily: font.bold, color: colors.sageDeep, fontSize: 12 }, trackLabels: { gap: 4 }, premiumLabel: { fontFamily: font.black, color: '#765192', fontSize: 11 }, freeLabel: { fontFamily: font.black, color: colors.sageDeep, fontSize: 11 }, track: { flexGrow: 0 }, column: { width: 130, gap: 4 }, level: { textAlign: 'center', fontFamily: font.black, fontSize: 11, color: colors.inkSoft, paddingVertical: 5, backgroundColor: colors.surfaceAlt, borderRadius: 10 }, levelOn: { color: colors.honeyInk, backgroundColor: colors.honeySoft }, verticalRow: { flexDirection: 'row', alignItems: 'stretch', gap: 6 }, levelPath: { width: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 20 }, levelPathOn: { backgroundColor: colors.honeySoft }, levelNumber: { fontFamily: font.black, color: colors.ink, fontSize: 16 }, tile: { flex: 1, height: 115, alignItems: 'center', justifyContent: 'center', padding: 6, gap: 2, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: colors.border, backgroundColor: colors.paper }, premiumTile: { backgroundColor: '#ECDDFA', borderColor: '#B68ACB', borderBottomColor: '#BD914A' }, claimedTile: { backgroundColor: '#E4F1E3', borderColor: '#82B88B', opacity: 0.84 }, claimCheck: { position: 'absolute', top: 4, right: 7, color: '#23814E', fontFamily: font.black, fontSize: 21 }, crown: { position: 'absolute', top: 3, right: 7, color: '#BD8537', fontFamily: font.black, fontSize: 17 }, columnHeader: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 26 }, lockedTile: { opacity: 0.65 }, availableTile: { borderColor: colors.honey, backgroundColor: colors.honeySoft }, tileName: { textAlign: 'center', fontFamily: font.bold, color: colors.ink, fontSize: 12 }, tileStatus: { fontFamily: font.black, fontSize: 10, color: colors.sageDeep }, connector: { alignSelf: 'center', width: 3, height: 9, backgroundColor: colors.borderDeep },
});
