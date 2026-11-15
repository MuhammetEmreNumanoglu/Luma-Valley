import { themedStyles } from '../ui/theme';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useGame } from '../state/GameProvider';
import { Sprite } from '../ui/components';
import { subscribeRewards, type RewardVisual } from '../ui/rewardEvents';
import { getTarget } from '../ui/targets';


const MAX_PARTICLES = 20;
function RewardParticle({ event, index, x0, y0, x1, y1 }: { event: RewardVisual; index: number; x0: number; y0: number; x1: number; y1: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(index * 50, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })); }, [index, p]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: x0 + (x1-x0)*p.value + (18 + (index % 4) * 5)*Math.sin(Math.PI*p.value) }, { translateY: y0 + (y1-y0)*p.value - (35 + (index % 3) * 7)*Math.sin(Math.PI*p.value) }, { scale: 1 - p.value*.75 }], opacity: p.value >= 1 ? 0 : 1 }));
  return <Animated.View testID={`reward-flight-${event.kind}`} pointerEvents="none" style={[styles.flight, anim]}><Sprite id={event.kind === 'gold' ? 'icon.coin' : event.kind === 'energy' ? 'icon.energy' : 'icon.token'} size={24} /></Animated.View>;
}
function RewardPulse({ x, y, delay, kind }: { x: number; y: number; delay: number; kind: RewardVisual['kind'] }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(delay, withTiming(1, { duration: 220 })); }, [delay, p]);
  const anim = useAnimatedStyle(() => ({ opacity: p.value > 0 && p.value < 1 ? Math.sin(p.value * Math.PI) * 0.75 : 0, transform: [{ scale: 0.8 + p.value * 0.4 }] }));
  return <Animated.View pointerEvents="none" style={[styles.pulse, { left: x - 19, top: y - 19, borderColor: kind === 'gold' ? '#E8BE69' : kind === 'energy' ? '#79CFC2' : '#B99AE8' }, anim]} />;
}
function ReducedReward({ event, done }: { event: RewardVisual; done: (id: number) => void }) {
  const shell = getTarget('shell');
  useEffect(() => { const timer = setTimeout(() => done(event.id), 700); return () => clearTimeout(timer); }, [done, event.id]);
  return <View style={{ position: 'absolute', left: event.x - (shell?.x ?? 0), top: event.y - (shell?.y ?? 0) - 25, flexDirection: 'row', alignItems: 'center' }}><Sprite id={event.kind === 'gold' ? 'icon.coin' : event.kind === 'energy' ? 'icon.energy' : 'icon.token'} size={22} /><Text style={{ color: '#FFF5DB', fontWeight: 'bold', textShadowColor: '#263B35', textShadowRadius: 3 }}>+{event.amount}</Text></View>;
}
function FlyingReward({ event, done }: { event: RewardVisual; done: (id: number) => void }) {
  const target = getTarget(`store.${event.kind}`) ?? getTarget(`hud.${event.kind}`), shell = getTarget('shell');
  const count = Math.max(1, Math.min(MAX_PARTICLES, Math.floor(event.amount)));
  useEffect(() => { const timer = setTimeout(() => done(event.id), (count - 1) * 50 + 470); return () => clearTimeout(timer); }, [count, done, event.id]);
  const x0 = event.x - (shell?.x ?? 0), y0 = event.y - (shell?.y ?? 0);
  const x1 = target ? target.x + target.w / 2 - (shell?.x ?? 0) : x0;
  const y1 = target ? target.y + target.h / 2 - (shell?.y ?? 0) : y0;
  return <><RewardPulse x={x0} y={y0} delay={0} kind={event.kind} /><RewardPulse x={x1} y={y1} delay={(count - 1) * 50 + 300} kind={event.kind} />{Array.from({ length: count }, (_, i) => <RewardParticle key={i} event={event} index={i} x0={x0} y0={y0} x1={x1} y1={y1} />)}{event.amount > MAX_PARTICLES ? <View style={{ position: 'absolute', left: x0, top: y0 - 25 }}><Text style={{ color: '#F6E1A7', fontWeight: 'bold' }}>+{event.amount}</Text></View> : null}</>;
}
export function RewardFlights() {
  const { reduceMotion } = useGame();
  const [events, setEvents] = useState<RewardVisual[]>([]);
  useEffect(() => subscribeRewards(event => { if ((getTarget(`store.${event.kind}`) ?? getTarget(`hud.${event.kind}`))) setEvents(prev => [...prev.slice(-5), event]); }), [reduceMotion]);
  const done = useCallback((id: number) => setEvents(prev => prev.filter(e => e.id !== id)), []);
  return <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents="none">{events.map(event => reduceMotion ? <ReducedReward key={event.id} event={event} done={done} /> : <FlyingReward key={event.id} event={event} done={done} />)}</View>;
}
const styles = themedStyles((colors) => StyleSheet.create({ layer: { zIndex: 1000, elevation: 1000 }, flight: { position: 'absolute', top: -14, left: -14, width: 28, height: 28, zIndex: 100, shadowColor: colors.honey, shadowOpacity: 0.5, shadowRadius: 5 }, pulse: { position: 'absolute', width: 38, height: 38, borderRadius: 19, borderWidth: 2, zIndex: 100 } }));
