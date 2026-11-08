import { useState } from 'react';
import { Text, View } from 'react-native';
import { HURRY, hurryCost, type HurryTarget } from '../content/hurry';
import { useGame } from '../state/GameProvider';
import { Button, clock } from './components';
import { colors, font } from './theme';

type Quote = { cost: number; gold: number; readyAt: number; area: number; pay: 'gold' | 'tokens' };

/**
 * Finish a running job now (one token per started minute). Two ways to pay: the whole cost in
 * coins (top button) or with tokens (bottom button). Each asks for confirmation first.
 */
export function HurryButton({ target, readyAt }: { target: HurryTarget; readyAt: number }) {
  const { state, now, t, dispatch } = useGame();
  const [quote, setQuote] = useState<Quote | null>(null);
  const cost = hurryCost(readyAt, now);
  const balance = (state.hurryTokens ?? 0) + (state.starTokens ?? 0);
  const missing = Math.max(0, cost - balance);
  const gold = cost * HURRY.coinsPerToken;
  const activeQuote = quote?.readyAt === readyAt && quote.area === state.workshop.active ? quote : null;
  if (!cost) return null;
  const line = { color: colors.ink, fontFamily: font.bold } as const;
  const ask = (pay: Quote['pay']) => setQuote({ cost, gold: pay === 'gold' ? gold : 0, readyAt, area: state.workshop.active, pay });
  return <View style={{ gap: 6 }}>
    <Text style={line}>{t('hurry.balance', { t: clock(Math.max(0, readyAt - now)), n: balance })}</Text>
    <Text style={[line, { fontFamily: font.regular, color: colors.inkSoft }]}>{t('hurry.rate', { g: HURRY.coinsPerToken })}</Text>
    {activeQuote ? <>
      <Text style={line}>{activeQuote.pay === 'gold' ? t('hurry.confirmGold', { g: activeQuote.gold }) : t('hurry.confirmTokens', { n: activeQuote.cost })}</Text>
      <Button tone="sage" label={t('hurry.confirmBtn')} onPress={() => {
        dispatch({ type: 'hurry', target, maxCost: activeQuote.cost, maxGold: activeQuote.gold, expectedReadyAt: activeQuote.readyAt, area: activeQuote.area, pay: activeQuote.pay === 'gold' ? 'gold' : undefined });
        setQuote(null);
      }} />
      <Button tone="ghost" label={t('common.cancel')} onPress={() => setQuote(null)} />
    </> : <>
      <Button tone="honey" icon="icon.coin" disabled={state.leaves < gold} label={t('hurry.gold', { g: gold })} onPress={() => ask('gold')} />
      <Button tone="cream" iconAfter="icon.token" disabled={missing > 0} label={t('hurry.finish', { n: cost })} accessibilityLabel={`${t('hurry.finish', { n: cost })} ${t('hurry.tokens')}`} onPress={() => ask('tokens')} />
      {missing > 0 ? <Text style={[line, { fontFamily: font.regular }]}>{t('hurry.missing', { m: missing })}</Text> : null}
    </>}
    {!activeQuote && state.leaves < gold ? <Text style={{ color: colors.ink }}>{t('hurry.noCoins')}</Text> : null}
  </View>;
}
