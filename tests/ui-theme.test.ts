import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { newGame } from '../src/engine/state';
import { migrate, encode, decode } from '../src/persistence/save';
import { colors, darkUiColors, setUiTheme, themedStyles } from '../src/ui/theme';

test('new games default to dark; legacy users retain the existing light appearance', () => {
  const s=newGame(1000,1); assert.equal(s.settings.uiTheme,'dark');
  const legacy=JSON.parse(JSON.stringify(s)); delete legacy.settings.uiTheme;
  assert.equal(migrate(legacy)!.settings.uiTheme,'light');
  s.settings.uiTheme='light'; assert.equal(decode(encode(s,1,1000))!.state.settings.uiTheme,'light');
  s.settings.uiTheme='dark'; assert.equal(decode(encode(s,1,1000))!.state.settings.uiTheme,'dark');
});
test('UI style switching never mutates colours used by world rendering', () => {
  const original=colors.cream; const styles=themedStyles(p=>({ background:p.cream }));
  setUiTheme('dark'); assert.equal(styles.background,darkUiColors.cream); assert.equal(colors.cream,original);
  setUiTheme('light'); assert.equal(styles.background,original); assert.equal(colors.cream,original);
});
