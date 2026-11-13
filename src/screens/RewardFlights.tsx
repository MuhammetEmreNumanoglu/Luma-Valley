import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useGame } from '../state/GameProvider';
import { Sprite } from '../ui/components';
import { subscribeRewards, type RewardVisual } from '../ui/rewardEvents';
import { getTarget } from '../ui/targets';
import { colors } from '../ui/theme';

function FlyingReward({ event, done }: { event: RewardVisual; done: (id: number) => void }) {
  const target = getTarget(`store.${event.kind}`) ?? getTarget(`hud.${event.kind}`), shell = getTarget('shell');
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) }); const timer = setTimeout(() => done(event.id), 850); return () => clearTimeout(timer); }, [done, event.id, p]);
  const x0 = event.x - (shell?.x ?? 0), y0 = event.y - (shell?.y ?? 0);
  const x1 = target ? target.x + target.w / 2 - (shell?.x ?? 0) : x0;
  const y1 = target ? target.y + target.h / 2 - (shell?.y ?? 0) : y0;
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: x0 + (x1-x0)*p.value + 32*Math.sin(Math.PI*p.value) }, { translateY: y0 + (y1-y0)*p.value - 48*Math.sin(Math.PI*p.value) }, { scale: 1 - p.value*.35 }], opacity: p.value > .88 ? (1-p.value)/.12 : 1 }));
  const pulse = useAnimatedStyle(() => ({ left: x1 - 19, top: y1 - 19, opacity: p.value < .76 ? 0 : Math.max(0, Math.sin((p.value - .76) / .24 * Math.PI)) * .75, transform: [{ scale: .7 + p.value * .45 }] }));
  return <><Animated.View testID={`reward-flight-${event.kind}`} pointerEvents="none" style={[styles.flight, anim]}><View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -12 }}><Sprite id={event.kind === 'gold' ? 'icon.coin' : event.kind === 'energy' ? 'icon.energy' : 'icon.token'} size={18} /><Sprite id={event.kind === 'gold' ? 'icon.coin' : event.kind === 'energy' ? 'icon.energy' : 'icon.token'} size={26} /><Sprite id={event.kind === 'gold' ? 'icon.coin' : event.kind === 'energy' ? 'icon.energy' : 'icon.token'} size={18} /></View></Animated.View><Animated.View pointerEvents="none" style={[styles.pulse, { borderColor: event.kind === 'gold' ? colors.honey : event.kind === 'energy' ? colors.energyDeep : colors.tokenDeep }, pulse]} /></>;
}
export function RewardFlights() {
  const { reduceMotion } = useGame();
  const [events, setEvents] = useState<RewardVisual[]>([]);
  useEffect(() => subscribeRewards(event => { if (!reduceMotion && (getTarget(`store.${event.kind}`) ?? getTarget(`hud.${event.kind}`))) setEvents(prev => [...prev.slice(-5), event]); }), [reduceMotion]);
  const done = useCallback((id: number) => setEvents(prev => prev.filter(e => e.id !== id)), []);
  return <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents="none">{events.map(event => <FlyingReward key={event.id} event={event} done={done} />)}</View>;
}
const styles = StyleSheet.create({ layer: { zIndex: 1000, elevation: 1000 }, flight: { position: 'absolute', top: -14, left: -14, width: 28, height: 28, zIndex: 100, shadowColor: colors.honey, shadowOpacity: 0.5, shadowRadius: 5 }, pulse: { position: 'absolute', width: 38, height: 38, borderRadius: 19, borderWidth: 2, zIndex: 100 } });
