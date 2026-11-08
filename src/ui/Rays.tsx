// Slowly turning sunburst behind reward cards (static when "reduce motion" is on).
import { Canvas, Group, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

export function Rays({ size = 420, color = '#FFE08A', reduce = false }: { size?: number; color?: string; reduce?: boolean }) {
  const a = useSharedValue(0);
  useEffect(() => {
    if (!reduce) a.value = withRepeat(withTiming(Math.PI * 2, { duration: 24000, easing: Easing.linear }), -1, false);
  }, [a, reduce]);
  const r = size / 2;
  const path = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    const n = 14;
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * Math.PI * 2;
      const t1 = t0 + (Math.PI / n) * 0.9;
      b.moveTo(r, r);
      b.lineTo(r + Math.cos(t0) * r, r + Math.sin(t0) * r);
      b.lineTo(r + Math.cos(t1) * r, r + Math.sin(t1) * r);
      b.close();
    }
    return b.detach();
  }, [r]);
  const transform = useDerivedValue(() => [{ rotate: a.value }]);
  return (
    <View pointerEvents="none" style={[styles.wrap, { width: size, height: size, marginLeft: -r, marginTop: -r }]}>
      <Canvas style={{ width: size, height: size }}>
        <Group origin={vec(r, r)} transform={transform}>
          <Path path={path}>
            <RadialGradient c={vec(r, r)} r={r} colors={[color, `${color}00`]} />
          </Path>
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', left: '50%', top: '50%', opacity: 0.75 } });
