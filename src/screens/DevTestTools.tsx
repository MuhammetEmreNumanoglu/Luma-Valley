// DEV TEST tools in Işık Mağazası → İşlemler: jump levels, open valley regions one by one and
// preview restoration stages. Rendered only in development builds; the grants themselves are
// refused outside development (engine/devEconomy.ts), and the save is backed up first.
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { REGIONS } from '../content/regions';
import { regionalIdentity } from '../content/regionIdentity';
import { DEV_MAX_LEVEL } from '../engine/devEconomy';
import { useGame } from '../state/GameProvider';
import { Button } from '../ui/components';
import { requestMapFocus, setStagePreview } from '../ui/devPreview';
import { font, radius, themedStyles } from '../ui/theme';

export function DevTestTools({ onStatus, onClose }: { onStatus: (text: string) => void; onClose: () => void }) {
  const { state, devGrant, setScreen, c } = useGame();
  const [target, setTarget] = useState('15');
  const goLevel = (to: number) => {
    void devGrant({ currency: 'level', to }).then((ok) => onStatus(ok ? `DEV TEST: seviye ${to}. Atlanan seviye ödülleri verilmedi.` : `Seviye ${to} uygulanamadı (yalnızca ileri, en çok ${DEV_MAX_LEVEL}).`)).catch(() => onStatus('Yedek doğrulanamadı; seviye değişmedi.'));
  };
  const goMap = (region: number, stage?: 0 | 1 | 2) => {
    setStagePreview(stage === undefined ? null : { region, stage });
    requestMapFocus(region);
    onClose();
    setScreen('map');
  };
  const n = Number.parseInt(target, 10);
  return (
    <View style={styles.box} testID="dev-test-tools">
      <Text style={styles.warn}>DEV TEST — GERÇEK OYUN DURUMU DEĞİŞİR</Text>
      <Text style={styles.muted}>İlk işlemden önce kayıt yedeklenir; “Test Öncesi Kayda Dön” ile geri alınır. Üretim sürümünde bu araçlar yoktur ve komutlar reddedilir.</Text>
      <Text style={styles.name}>Seviye · şu an {state.level}</Text>
      <View style={styles.row}>
        {[1, 5, 10].map((k) => <Button key={k} small label={`+${k} Level`} disabled={state.level + k > DEV_MAX_LEVEL} onPress={() => goLevel(state.level + k)} />)}
      </View>
      <View style={styles.row}>
        <TextInput value={target} onChangeText={(v) => setTarget(v.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" accessibilityLabel="Hedef seviye" style={styles.input} />
        <Button small tone="sage" label={`Level ${Number.isFinite(n) ? n : '?'}'e Git`} disabled={!Number.isFinite(n) || n <= state.level || n > DEV_MAX_LEVEL} onPress={() => goLevel(n)} />
      </View>
      <Text style={styles.name}>Vadi Bölgeleri</Text>
      {REGIONS.map((r) => {
        const open = state.regions.includes(r.id);
        const name = regionalIdentity(r)?.label[state.settings.lang === 'en' ? 'en' : 'tr'] ?? c(`region.${r.id}`);
        return (
          <View key={r.id} style={styles.region} accessibilityLabel={`${name} · ${open ? 'açık' : 'kilitli'}`}>
            <Text style={styles.regionName}>{r.id}. {name} · {open ? 'Açık' : 'Kilitli'}</Text>
            <View style={styles.row}>
              <Button small label="Test İçin Aç" disabled={open} onPress={() => { void devGrant({ currency: 'region', region: r.id }).then((ok) => onStatus(ok ? `DEV TEST: ${name} açıldı.` : 'Bölge zaten açık.')).catch(() => onStatus('Yedek doğrulanamadı; bölge açılmadı.')); }} />
              <Button small tone="cream" label="Bölgeye Git" disabled={!open} onPress={() => goMap(r.id)} />
            </View>
            {open ? <View style={styles.row}>{(['Harabe', 'Onarımda', 'Tamamlanmış'] as const).map((label, stage) => <Button key={label} small tone="cream" label={label} onPress={() => goMap(r.id, stage as 0 | 1 | 2)} />)}</View> : null}
          </View>
        );
      })}
      <Text style={styles.muted}>Onarım önizlemesi yalnızca görünümü değiştirir; görevler ve kayıt aynı kalır.</Text>
    </View>
  );
}

const styles = themedStyles((colors) => StyleSheet.create({
  box: { gap: 8, padding: 12, borderRadius: radius.l, borderWidth: 2, borderColor: colors.danger, backgroundColor: colors.paper },
  warn: { fontFamily: font.black, fontSize: 14, color: colors.danger, letterSpacing: 0.4 },
  muted: { fontFamily: font.medium, color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  name: { fontFamily: font.black, color: colors.ink, fontSize: 15, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  input: { minWidth: 64, height: 40, borderRadius: radius.s, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 10, color: colors.ink, fontFamily: font.bold, fontSize: 16, backgroundColor: colors.surface },
  region: { gap: 6, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  regionName: { fontFamily: font.bold, color: colors.ink, fontSize: 14 },
}));
