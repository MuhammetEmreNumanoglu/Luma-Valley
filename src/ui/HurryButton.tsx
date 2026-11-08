import { useState } from 'react';
import { Text, View } from 'react-native';
import { HURRY, hurryCost, type HurryTarget } from '../content/hurry';
import { useGame } from '../state/GameProvider';
import { Button, clock } from './components';
import { colors, font } from './theme';

type Quote = { cost: number; gold: number; readyAt: number; area: number };

/** Finish a running job now: one token per started minute; missing tokens are bought with coins. */
export function HurryButton({ target, readyAt }: { target: HurryTarget; readyAt: number }) {
  const { state, now, t, dispatch } = useGame();
  const [quote, setQuote] = useState<Quote | null>(null);
  const cost = hurryCost(readyAt, now);
  const balance = state.hurryTokens ?? 0;
  const missing = Math.max(0, cost - balance);
  const gold = missing * HURRY.coinsPerToken;
  const activeQuote = quote?.readyAt === readyAt && quote.area === state.workshop.active ? quote : null;
  if (!cost) return null;
  const line = { color: colors.ink, fontFamily: font.bold } as const;
  return <View style={{ gap: 6 }}>
    <Text style={line}>{t('hurry.balance', { t: clock(Math.max(0, readyAt - now)), n: balance })}</Text>
    <Text style={[line, { fontFamily: font.regular, color: colors.inkSoft }]}>{t('hurry.rate', { g: HURRY.coinsPerToken })}</Text>
    {missing > 0 ? <Text style={line}>{t('hurry.missing', { m: missing, g: gold })}</Text> : null}
    {activeQuote ? <>
      <Text style={line}>{activeQuote.gold ? t('hurry.confirm', { n: activeQuote.cost, g: activeQuote.gold }) : t('hurry.confirmTokens', { n: activeQuote.cost })}</Text>
      <Button tone="sage" label={t('hurry.confirmBtn')} onPress={() => {
        dispatch({ type: 'hurry', target, maxCost: activeQuote.cost, maxGold: activeQuote.gold, expectedReadyAt: activeQuote.readyAt, area: activeQuote.area });
        setQuote(null);
      }} />
      <Button tone="ghost" label={t('common.cancel')} onPress={() => setQuote(null)} />
    </> : <Button disabled={state.leaves < gold} label={gold ? t('hurry.finishGold', { n: cost, g: gold }) : t('hurry.finish', { n: cost })} onPress={() => setQuote({ cost, gold, readyAt, area: state.workshop.active })} />}
    {state.leaves < gold ? <Text style={{ color: colors.ink }}>{t('hurry.noCoins')}</Text> : null}
  </View>;
}
