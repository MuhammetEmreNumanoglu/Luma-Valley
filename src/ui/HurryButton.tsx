import { useState } from 'react';
import { Text, View } from 'react-native';
import { HURRY, hurryCost, type HurryTarget } from '../content/hurry';
import { useGame } from '../state/GameProvider';
import { Button, clock } from './components';
import { colors, font } from './theme';

type Quote = { cost: number; gold: number; readyAt: number; area: number };

export function HurryButton({ target, readyAt }: { target: HurryTarget; readyAt: number }) {
  const { state, now, lang, dispatch } = useGame();
  const [quote, setQuote] = useState<Quote | null>(null);
  const cost = hurryCost(readyAt, now);
  const balance = state.hurryTokens ?? 0;
  const missing = Math.max(0, cost - balance);
  const gold = missing * HURRY.coinsPerToken;
  const tr = lang === 'tr';
  const activeQuote = quote?.readyAt === readyAt && quote.area === state.workshop.active ? quote : null;
  if (!cost) return null;
  const label = tr ? `Hemen bitir · ${cost} jeton` : `Finish now · ${cost} tokens`;
  return <View style={{ gap: 6 }}>
    <Text style={{ color: colors.ink, fontFamily: font.bold }}>
      {tr ? `Kalan: ${clock(Math.max(0, readyAt - now))} · Jeton: ${balance}` : `Remaining: ${clock(Math.max(0, readyAt - now))} · Tokens: ${balance}`}
    </Text>
    {missing > 0 ? <Text style={{ color: colors.ink, fontFamily: font.bold }}>
      {tr ? `${missing} eksik jeton: ${gold} altın · Bakiyen: ${state.leaves} altın` : `${missing} missing tokens: ${gold} coins · Balance: ${state.leaves} coins`}
    </Text> : null}
    {activeQuote ? <>
      <Text style={{ color: colors.ink, fontFamily: font.bold }}>
        {tr ? `${activeQuote.cost} jetona kadar kullan ve en fazla ${activeQuote.gold} altın harca?` : `Use up to ${activeQuote.cost} tokens and spend up to ${activeQuote.gold} coins?`}
      </Text>
      <Button tone="sage" label={tr ? 'Onayla ve bitir' : 'Confirm and finish'} onPress={() => {
        dispatch({ type: 'hurry', target, maxCost: activeQuote.cost, maxGold: activeQuote.gold, expectedReadyAt: activeQuote.readyAt, area: activeQuote.area });
        setQuote(null);
      }} />
      <Button tone="ghost" label={tr ? 'Vazgeç' : 'Cancel'} onPress={() => setQuote(null)} />
    </> : <Button disabled={state.leaves < gold} label={label} onPress={() => setQuote({ cost, gold, readyAt, area: state.workshop.active })} />}
    {state.leaves < gold ? <Text style={{ color: colors.ink }}>{tr ? 'Yeterli altının yok.' : 'Not enough coins.'}</Text> : null}
  </View>;
}
