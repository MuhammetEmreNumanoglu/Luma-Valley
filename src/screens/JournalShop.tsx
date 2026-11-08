// Journal (collection, characters, memories, achievements, recipes) and Market (tokens, energy,
// bag, producer upgrades, token packs — real payments are not active in this build).
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ACHIEVEMENTS } from '../content/achievements';
import { BALANCE, leafBreakCost } from '../content/balance';
import { CHARACTERS } from '../content/characters';
import { DECORATIONS } from '../content/decorations';
import { FAMILIES, itemKey } from '../content/families';
import { collectibleKeys, collectionReward, NOT_COLLECTIBLE } from '../content/progression';
import { unclaimedCollection } from '../engine/tutorial';
import { haptic } from '../feedback';
import { Dot } from '../ui/components';
import { ICON } from './Panels';
import { PRODUCER, producerLevel, PRODUCERS, type ProducerId } from '../content/producers';
import { purchases, type StoreProduct } from '../services/purchases';
import { useGame } from '../state/GameProvider';
import { Bar, Button, Card, SectionTitle, Sprite } from '../ui/components';
import { colors, font, radius } from '../ui/theme';

type Tab = 'collection' | 'characters' | 'memories' | 'achievements' | 'recipes';

export function JournalScreen() {
  const { state, t, c, open, dispatch } = useGame();
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
            <Text style={[styles.tabText, tab === k && { color: '#FFF' }]}>{t(`journal.${k}` as 'journal.collection')}</Text>
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
              const got = state.achievements.includes(a.id);
              const v = Math.min(a.target, a.value(state));
              return (
                <Card key={a.id} tone={got ? 'gold' : 'paper'} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Sprite id="icon.trophy" size={40} silhouette={!got} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{c(`ach.${a.id}`)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <View style={{ flex: 1 }}>
                        <Bar value={v / a.target} color={got ? colors.honey : colors.sage} />
                      </View>
                      <Text style={styles.meta}>
                        {v}/{a.target}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Sprite id="icon.coin" size={18} />
                    <Text style={styles.meta}>{a.coins}</Text>
                  </View>
                </Card>
              );
            })
          : null}
        {tab === 'recipes'
          ? PRODUCERS.filter((p) => p.kind === 'converter').map((p) => (
              <Card key={p.id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sprite id={`producer.${p.id}`} size={44} silhouette={!state.producers[p.id]} />
                  <Text style={styles.cardTitle}>{c(`producer.${p.id}`)}</Text>
                </View>
                {(p.recipes ?? []).map((r) => {
                  const found = !r.secret || state.recipesFound.includes(`${p.id}:${r.input}`);
                  return (
                    <View key={r.input} style={styles.recipe}>
                      <Sprite id={`item.${r.input}`} size={30} silhouette={!found} />
                      <Text style={styles.meta}>→</Text>
                      <Sprite id={`item.${r.output}`} size={30} silhouette={!found} />
                      <Text style={styles.meta}>×{r.count}</Text>
                      <Text style={[styles.meta, { flex: 1, textAlign: 'right' }]}>{found ? (r.secret ? t('board.secretRecipe') : '') : '?'}</Text>
                    </View>
                  );
                })}
                <Text style={styles.hint}>{t('journal.secretHint')}</Text>
              </Card>
            ))
          : null}
      </ScrollView>
    </View>
  );
}

export function ShopScreen() {
  const { state, t, c, dispatch, toast } = useGame();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  useEffect(() => {
    purchases.products().then(setProducts).catch(() => setProducts([]));
  }, []);
  const bought = state.inventory.length - BALANCE.inventory.startSlots;
  const slotCost = BALANCE.inventory.slotCostLeaves[bought];
  const owned = (Object.keys(state.producers) as ProducerId[]).filter((id) => PRODUCER[id]);
  const buy = async (p: StoreProduct) => {
    const r = await purchases.purchase(p.id, true);
    if (r.status === 'verified') dispatch({ type: 'grantPurchase', transactionId: r.transactionId, coins: r.coins });
    else if (r.status === 'unavailable') toast({ kind: 'deny', text: t(r.reason === 'offline' ? 'shop.offline' : 'shop.unavailable') });
  };
  return (
    <ScrollView contentContainerStyle={styles.content}>
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
      <Card style={styles.shopRow}>
        <Sprite id="icon.energy" size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t('shop.tea', { n: BALANCE.energy.leafBreak.amount })}</Text>
          <Text style={styles.body}>{t('shop.teaDesc', { n: BALANCE.energy.leafBreak.amount })}</Text>
        </View>
        <Button small icon="icon.leaf" label={String(leafBreakCost(state.energyBuys))} disabled={state.energy >= BALANCE.energy.max} onPress={() => dispatch({ type: 'buyEnergy' })} />
      </Card>
      <Card style={[styles.shopRow, { marginTop: 8 }]}>
        <Sprite id="icon.bag" size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t('shop.slot')}</Text>
          <Text style={styles.body}>{t('shop.slotDesc', { a: state.inventory.length, b: BALANCE.inventory.maxSlots })}</Text>
        </View>
        {slotCost !== undefined && state.inventory.length < BALANCE.inventory.maxSlots ? (
          <Button small icon="icon.leaf" label={String(slotCost)} onPress={() => dispatch({ type: 'buySlot' })} />
        ) : (
          <Text style={styles.meta}>{t('shop.maxed')}</Text>
        )}
      </Card>

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

      <SectionTitle>{t('shop.packs')}</SectionTitle>
      <Card style={{ backgroundColor: colors.surfaceAlt }}>
        <Text style={[styles.body, { color: colors.ink }]}>{t('shop.packsNote')}</Text>
      </Card>
      <View style={styles.packs}>
        {products.map((p, i) => (
          <View key={p.id} style={styles.pack}>
            <Sprite id="icon.coin" size={36 + i * 6} />
            <Text style={styles.packAmount}>{p.coins}</Text>
            <Text style={styles.meta}>{p.price ?? t('shop.priceUnknown')}</Text>
            <Button small tone="cream" disabled={!purchases.configured} label={t('shop.buy')} onPress={() => buy(p)} style={{ alignSelf: 'stretch', marginTop: 6 }} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  claimBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  chainCellNew: { backgroundColor: '#FFF2C9', borderColor: '#F2B544' },
  collectChip: { position: 'absolute', bottom: -6, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 1, paddingHorizontal: 4, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3C27A' },
  collectText: { fontFamily: font.black, fontSize: 10, color: '#6B471B' },
  tabs: { gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  tab: { paddingHorizontal: 15, minHeight: 38, justifyContent: 'center', borderRadius: 999, backgroundColor: colors.surface, borderWidth: 2, borderColor: '#FFFFFF', borderBottomWidth: 3, borderBottomColor: colors.borderDeep, shadowColor: colors.sageDeep, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
  tabOn: { backgroundColor: '#47765D', borderColor: '#94B49A', borderBottomColor: '#315542' },
  tabText: { fontFamily: font.bold, fontSize: 13, color: colors.ink },
  content: { padding: 12, paddingBottom: 40 },
  meta: { fontFamily: font.bold, fontSize: 12, color: colors.inkSoft },
  body: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  hint: { fontFamily: font.medium, fontSize: 11, color: colors.sageDeep, marginTop: 6 },
  cardTitle: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  chain: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chainCell: { width: 48, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: '#FFFFFF', borderBottomWidth: 3, borderBottomColor: colors.border },
  chainLv: { position: 'absolute', bottom: 1, right: 4, fontFamily: font.black, fontSize: 9, color: colors.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  memory: { width: '47%', backgroundColor: colors.surfaceAlt, borderRadius: radius.l, padding: 12, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: '#FFFFFF', borderBottomWidth: 4, borderBottomColor: colors.borderDeep, shadowColor: colors.sageDeep, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  memoryTitle: { fontFamily: font.bold, fontSize: 13, color: colors.ink, textAlign: 'center' },
  empty: { fontFamily: font.medium, fontSize: 14, color: colors.inkSoft, textAlign: 'center', marginTop: 30 },
  recipe: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  packs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pack: { width: '48%', backgroundColor: colors.surface, borderRadius: radius.l, padding: 10, alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF', borderBottomWidth: 4, borderBottomColor: colors.borderDeep, shadowColor: colors.sageDeep, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  packAmount: { fontFamily: font.black, fontSize: 20, color: colors.ink },
});
