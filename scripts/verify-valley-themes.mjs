// Run with: node --no-warnings --import ./scripts/ts-register.mjs scripts/verify-valley-themes.mjs
// This browser context has its own synthetic save and never touches a player's save.
import { createRequire } from 'node:module';
import { newGame } from '../src/engine/state.ts';
import { encode } from '../src/persistence/save.ts';
import { QUESTS } from '../src/content/quests.ts';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const now=Date.now(), s=newGame(now,42,-180);
s.settings={...s.settings,lang:'tr',music:false,sfx:false};
s.flags.introDone=true; s.flags.tutStarCoin=true; s.tutorial.skipped=true;
s.quests.seen=QUESTS.map(q=>q.id); s.starTokens=1200;
s.themeCards.winter=10; s.themeCards.moonlight=10;
s.regions.push(2);
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:375,height:812},deviceScaleFactor:1});
page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(raw=>{ if(!localStorage.getItem('valley-fixture')) { localStorage.clear();localStorage.setItem('luma.save.a',raw);localStorage.setItem('valley-fixture','yes'); }},encode(s,1,now));
await page.goto('http://localhost:19006/');
await page.getByRole('tab',{name:'Vadi',exact:true}).click({timeout:90000});
await page.waitForTimeout(800);
let previous=await page.locator('canvas').first().screenshot();
const results=[];
for(const [id,name,cards] of [['sakura','Sakura Vadisi',false],['winter','Kış Masalı',true],['moonlight','Ay Işığı Vadisi',true],['autumn','Altın Sonbahar',false]]) {
  await page.getByRole('button',{name:/Yıldız jetonu:/}).click();
  await page.getByRole('tab',{name:'Temalar',exact:true}).click();
  const card=page.getByText(name,{exact:true}).locator('..').locator('..');
  if(id==='sakura') await page.screenshot({path:'/tmp/luma-valley-store.png'});
  await card.screenshot({path:`/tmp/luma-valley-card-${id}.png`});
  const before=Date.now();
  await card.getByRole('button',{name:cards?'Temayı Aç':'Satın Al'}).click();
  if(!cards) await page.getByRole('button',{name:'Yıldız jetonuyla aç'}).click();
  if(await card.getByText('Seçili',{exact:true}).count()!==1) throw new Error(`${id} not selected after unlock`);
  await page.getByRole('button',{name:'Kapat',exact:true}).first().click();
  await page.getByText('Işık Mağazası').waitFor({state:'hidden'});
  await page.waitForTimeout(700);
  await page.screenshot({path:`/tmp/luma-valley-verified-${id}.png`});
  const current=await page.locator('canvas').first().screenshot();
  if(previous.equals(current)) throw new Error(`${id} did not change rendered canvas`);
  previous=current;
  for(let i=0;i<3 && !await page.getByText('Bal Rüzgârı Köyü',{exact:true}).count();i++) {
    await page.mouse.move(190,600); await page.mouse.down(); await page.mouse.move(190,190,{steps:12}); await page.mouse.up(); await page.waitForTimeout(450);
  }
  if(!await page.getByText('Bal Rüzgârı Köyü',{exact:true}).count()) throw new Error(`${id} second region was not reached`);
  await page.screenshot({path:`/tmp/luma-valley-region2-${id}.png`});
  results.push({id,unlockToScreenshotMs:Date.now()-before});
  await page.reload();
  await page.getByRole('tab',{name:'Vadi',exact:true}).click({timeout:90000});
  await page.getByRole('button',{name:/Yıldız jetonu:/}).click();
  await page.getByRole('tab',{name:'Temalar',exact:true}).click();
  const persisted=page.getByText(name,{exact:true}).locator('..').locator('..');
  if(await persisted.getByText('Seçili',{exact:true}).count()!==1) throw new Error(`${id} not persisted`);
  await page.getByRole('button',{name:'Kapat',exact:true}).first().click();
}
console.log(JSON.stringify({results,errors},null,2));
await browser.close();
if(errors.length) process.exitCode=1;
