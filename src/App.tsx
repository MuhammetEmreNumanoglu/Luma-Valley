import { Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { preloadArt } from './art/art';
import { Shell } from './screens/Shell';
import { GameProvider, useGame } from './state/GameProvider';
import { colors } from './ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { ready, t } = useGame();
  // Bundled sprites are decoded once before the first screen; a failed sprite falls back to the
  // procedural drawing, and a stuck load never blocks the game for more than a few seconds.
  const [art, setArt] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setArt(true);
      }
    };
    preloadArt().then(finish, finish);
    const timer = setTimeout(finish, 6000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (ready && art) SplashScreen.hideAsync().catch(() => {});
  }, [ready, art]);
  if (!ready || !art)
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  return <Shell />;
}

export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.cream }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <GameProvider>{fontsLoaded ? <Root /> : <View style={styles.loading} />}</GameProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.inkSoft, fontSize: 16 },
});
