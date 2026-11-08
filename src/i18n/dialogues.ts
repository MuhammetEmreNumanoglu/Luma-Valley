// Character dialogue, translatable data. Short lines, tap to advance, skippable.
import type { CharId, Mood } from '../content/characters';

export interface Line {
  who: CharId;
  mood: Mood;
  tr: string;
  en: string;
}

const L = (who: CharId, mood: Mood, tr: string, en: string): Line => ({ who, mood, tr, en });

/** Opening story panels (shown once, before the first board). */
export const INTRO: { tr: string; en: string }[] = [
  { tr: 'Bir zamanlar bu vadide her evde bir ışık yanardı.', en: 'Once, a light burned in every house in this valley.' },
  { tr: 'Sonra bir gece, kimsenin tam hatırlamadığı bir şey oldu. Renkler soldu, insanlar birbirini unuttu.', en: 'Then one night, something happened that no one quite remembers. The colours faded, and people forgot each other.' },
  { tr: 'Yıllar sonra, büyükannenden kalan eski bir fenerle vadiye geliyorsun.', en: 'Years later, you arrive with an old lantern your grandmother left you.' },
  { tr: 'Fener, sen kapısını açınca titreyerek parlıyor…', en: 'As you open its little door, the lantern flickers…' },
];

export const DIALOGUES: Record<string, { start: Line[]; end: Line[] }> = {
  r1_light: {
    start: [
      L('lumi', 'surprised', 'Ah! Sonunda biri feneri açtı. Merhaba! Ben Lumi. Sanırım… bir kıvılcımım?', 'Oh! Someone finally opened the lantern. Hello! I’m Lumi. I think… I’m a spark?'),
      L('lumi', 'curious', 'Şu tohumlara bak. Üç tanesini yan yana getirirsen birleşip filizlenirler.', 'Look at those seeds. Bring three of them together and they’ll merge into a sprout.'),
    ],
    end: [L('lumi', 'happy', 'Gördün mü? Vadi hâlâ hatırlıyor nasıl büyüneceğini. Biraz yardıma ihtiyacı var, o kadar.', 'See? The valley still remembers how to grow. It just needs a little help.')],
  },
  r1_garden1: {
    start: [
      L('lumi', 'calm', 'Şu bahçe… eskiden çok güzelmiş. Kutudan tohum al, birleştir, büyüt.', 'That garden… it used to be lovely. Take seeds from the crate, merge them, grow them.'),
      L('lumi', 'curious', 'Beşini birden birleştirirsen iki tane alırsın. Sana söylemedim, kendin buldun.', 'Merge five at once and you get two. I didn’t tell you that; you figured it out.'),
    ],
    end: [
      L('lumi', 'happy', 'Bahçe gözlerini açtı! Bak, biri geliyor.', 'The garden opened its eyes! Look, someone’s coming.'),
      L('mira', 'surprised', 'Bu bahçe yıllardır böyle değildi. Sen kimsin? Neyse, önemli değil. Eline sağlık.', 'This garden hasn’t looked like this in years. Who are you? Never mind. Nicely done.'),
    ],
  },
  r1_mira: {
    start: [
      L('mira', 'calm', 'Ben Mira. Marangozum. Ya da eskiden öyleydim. Tezgâhımı sana bıraktım, kullan.', 'I’m Mira. A carpenter. Or I used to be. I left my bench out for you, use it.'),
      L('mira', 'proud', 'Evim de şurada. Kapısı yok, çatısı delik. Ama temeli sağlam.', 'My house is over there. No door, roof full of holes. But the foundations are good.'),
    ],
    end: [L('mira', 'happy', 'Çiçekler evi çok güzelleştirdi. Birlikte onarmaya devam edelim.', 'The flowers make the house lovely. Let’s keep restoring it together.')],
  },
  r1_shrine: {
    start: [
      L('lumi', 'curious', 'Fener Taşı! Burada ışık yolları var. Parçaları çevir, ışığı hedefe ulaştır.', 'The Lantern Stone! There are light paths here. Turn the pieces, guide the light to its target.'),
      L('lumi', 'calm', 'Acele etme. Az hamleyle çözersen fener daha çok sevinir. Ben de.', 'No rush. Solve it in fewer moves and the lantern will be happier. So will I.'),
    ],
    end: [L('lumi', 'proud', 'Hissettin mi? Fener uyandı. Artık o da sana parça verecek.', 'Did you feel that? The lantern woke up. Now it will give you parts too.')],
  },
  r1_cottage2: {
    start: [L('mira', 'calm', 'Evin girişini güzelleştirmek için bir fide getirebilir misin?', 'Could you bring a seedling to brighten the entrance?')],
    end: [L('mira', 'happy', 'Kapım var! Rüzgâr artık kibarca çalıyor.', 'I have a door! Now the wind has to knock.')],
  },
  r1_ada: {
    start: [
      L('ada', 'sad', 'Serama baksana… camlar tozlu, çiçekler solgun. Ben Ada. Bu vadinin bitkilerini ben bilirim.', 'Look at my glasshouse… dusty panes, pale flowers. I’m Ada. I know every plant in this valley.'),
      L('ada', 'curious', 'İki açmış çiçek getirirsen camları silmeye başlarım.', 'Bring me two blossoms and I’ll start cleaning the glass.'),
    ],
    end: [L('ada', 'happy', 'İçeriye güneş girdi! Çiçekler sanki derin bir nefes aldı.', 'Sunlight got in! It’s as if the flowers took a deep breath.')],
  },
  r1_cottage3: {
    start: [L('mira', 'calm', 'Son dokunuş için açmış bir çiçek getirebilir misin?', 'Could you bring a blossom for the finishing touch?')],
    end: [
      L('mira', 'proud', 'Ocak yandı. Bu evde en son ne zaman sıcak çorba içildi, hatırlamıyorum.', 'The hearth is lit. I can’t remember the last time this house had hot soup.'),
      L('lumi', 'surprised', 'Bak! Ocağın üstünde bir fotoğraf var. Bir anı!', 'Look! There’s a photo above the hearth. A memory!'),
    ],
  },
  r1_well: {
    start: [L('ada', 'curious', 'Kuyu sustu. İçindeki ışık yolunu açıp çevresine bir fide koyalım.', 'The well has gone quiet. Let’s open its light path and plant a seedling nearby.')],
    end: [L('ada', 'happy', 'Duydun mu? Su sesi! Kuyu yine konuşuyor.', 'Hear that? Water! The well is talking again.')],
  },
  r1_orchard: {
    start: [L('ada', 'calm', 'Meyve ağaçları çitlerin arkasında unutulmuş. Çitleri onarırsak ağaçlar seni tanır.', 'The fruit trees were forgotten behind the fences. Mend the fences and the trees will know you.')],
    end: [L('ada', 'happy', 'İlk böğürtlen! Ağaç artık senin için meyve verecek.', 'The first berry! The tree will bear fruit for you now.')],
  },
  r1_garden2: {
    start: [L('ada', 'curious', 'Bahçeye su gitmiyor. Işığı kanallara yönlendirirsen eski pompa çalışır.', 'No water reaches the garden. Guide the light into the channels and the old pump will run.')],
    end: [L('ada', 'happy', 'Su geldi! Çiçek demetlerini sulamak için sabırsızlanıyorum.', 'The water’s here! I can’t wait to water the posies.')],
  },
  r1_lamps: {
    start: [L('lumi', 'calm', 'Akşamları yol karanlık. İki mum ve bir ışık yolu, yeter de artar.', 'The path is dark at night. Two candles and one light path, that’s plenty.')],
    end: [L('lumi', 'happy', 'Yol lambası yandı. Gece yürüyüşleri geri döndü!', 'The path lamp is lit. Evening walks are back!')],
  },
  r1_waterwheel: {
    start: [L('mira', 'calm', 'Dere çarkı dönmezse köy de dönmez. Kalas destesi ve kesme blok.', 'If the stream wheel doesn’t turn, nothing in the valley turns. A plank stack and a cut block.')],
    end: [L('mira', 'proud', 'Dönüyor! Şu ses… tak tak tak. Huzur gibi.', 'It’s turning! That sound… clack, clack. Like peace.')],
  },
  r1_bees: {
    start: [L('ada', 'curious', 'Arı çayırı boş. Bir meyve kâsesi ve çiçek demeti bırakırsak arılar geri gelir.', 'The bee meadow is empty. Leave a fruit bowl and a posy and the bees will return.')],
    end: [L('ada', 'happy', 'Vızıltı! Arılar döndü. Kovanın yanında küçük bir not var, okuyalım mı?', 'Buzzing! The bees are back. There’s a little note by the hive, shall we read it?')],
  },
  r1_path: {
    start: [
      L('bera', 'curious', 'Selam! Ben Bera, haritacıyım. Bu yol eski haritada var ama gerçekte yok. Düzeltelim mi?', 'Hi! I’m Bera, a mapmaker. This path is on the old map but not on the ground. Shall we fix that?'),
    ],
    end: [L('bera', 'happy', 'Harita ve gerçek yine aynı şeyi söylüyor. En sevdiğim duygu.', 'The map and the world agree again. My favourite feeling.')],
  },
  r1_garden3: {
    start: [L('ada', 'calm', 'Bahçenin kalbine özel bir aranjman yakışır. Bir de meyve sepeti, arılar için.', 'The heart of the garden deserves a grand arrangement. And a fruit basket, for the bees.')],
    end: [
      L('ada', 'proud', 'Bahçe tamamen uyandı. Bir zamanlar burada şenlik yapılırmış, biliyor muydun?', 'The garden is fully awake. They used to hold festivals here, did you know?'),
      L('lumi', 'curious', 'Şenlik… bu kelime içimde bir şeyi kıpırdattı.', 'Festival… that word made something flicker inside me.'),
    ],
  },
  r1_bridge1: {
    start: [L('bera', 'curious', 'Köprünün öbür yanında bir köy var. Haritada “Bal Rüzgârı” yazıyor. Önce ahşap.', 'There’s a village across the bridge. The map says “Honeywind”. Wood first.')],
    end: [L('bera', 'happy', 'Kirişler yerinde. Yarısı yapıldı sayılır… yani üçte biri.', 'The beams are in. Half done… well, a third.')],
  },
  r1_bridge2: {
    start: [L('bera', 'calm', 'Ayaklar için taş blok ve köprü fenerini yakmak için bir ışık yolu.', 'Stone blocks for the piers, and a light path to light the bridge lantern.')],
    end: [L('bera', 'happy', 'Köprü feneri yandı. Öbür yakadan biri el salladı!', 'The bridge lantern is lit. Someone waved from the other side!')],
  },
  r1_bridge3: {
    start: [L('bera', 'proud', 'Son tahtalar. Bunu bitirirsek vadinin ikinci kapısı açılır.', 'The last planks. Finish this and the valley’s second door opens.')],
    end: [
      L('bera', 'happy', 'Bitti! Unutulmuş Köprü artık unutulmuş değil.', 'Done! The Forgotten Bridge isn’t forgotten anymore.'),
      L('lumi', 'surprised', 'Tahtalarda bir isim var: Nur. Bu… senin büyükannenin adı değil mi?', 'There’s a name carved in the planks: Nur. Isn’t that… your grandmother’s name?'),
    ],
  },
  r1_beacon: {
    start: [L('lumi', 'curious', 'Tepedeki fener eskiden köye “eve dön” dermiş. Bir pirinç fener ve bir anı yeter.', 'The beacon on the hill used to tell the village “come home”. A brass lantern and a memory will do.')],
    end: [L('lumi', 'proud', 'Tepe feneri yanıyor. Vadinin her yerinden görünüyor olmalı.', 'The beacon is burning. It must be visible from the whole valley.')],
  },
  r2_niko: {
    start: [
      L('niko', 'happy', 'Bir müşteri! Hoş geldin! Ben Niko. Fırınım soğuk ama kalbim sıcak. Başak demetin var mı?', 'A customer! Welcome! I’m Niko. My oven’s cold but my heart is warm. Got any sheaves?'),
    ],
    end: [L('niko', 'proud', 'Bu başaklar… mis gibi. Fırın kapısını açmaya hazırım.', 'These sheaves… they smell wonderful. I’m ready to open the oven door.')],
  },
  r2_windmill1: {
    start: [L('niko', 'calm', 'Un için değirmen lazım, değirmen için kanat. Kalas destesi ve un çuvalı, lütfen.', 'Flour needs a mill, a mill needs sails. A plank stack and a flour sack, please.')],
    end: [L('niko', 'happy', 'Kanatlar takıldı! Şimdi tek eksik rüzgârın keyfi.', 'Sails on! Now we just need the wind to be in a good mood.')],
  },
  r2_bakery2: {
    start: [L('niko', 'calm', 'Fırının tabanı çatlak. Kesme blok ve iki un çuvalı. Sonra ilk somun!', 'The oven floor is cracked. A cut block and two flour sacks. Then, the first loaf!')],
    end: [L('niko', 'proud', 'Fırın yandı! Artık un çuvalını içine atarsan iki hamur çıkar. Sihir değil, mutfak.', 'The oven is lit! Drop a flour sack in and you get two doughs. Not magic, just cooking.')],
  },
  r2_square1: {
    start: [L('bera', 'curious', 'Meydanın taşları yerinden oynamış. Altında bir ışık yolu var, haritada işaretli.', 'The square’s stones have shifted. There’s a light path beneath; it’s marked on the map.')],
    end: [L('bera', 'happy', 'Meydan düzleşti. İnsanlar yavaş yavaş pencereden bakıyor.', 'The square is level. People are starting to peek out of their windows.')],
  },
  r2_bees: {
    start: [L('ada', 'curious', 'Bu köyün arıları çayırdakilerin kuzeni. İki çiçek demeti onları ikna eder.', 'This village’s bees are cousins of the meadow bees. Two posies will win them over.')],
    end: [L('ada', 'happy', 'Kovan senin. Polen, nektar, bal… sabırla.', 'The hive is yours. Pollen, nectar, honey… patiently.')],
  },
  r2_windmill2: {
    start: [L('niko', 'calm', 'Kanatlar tamam ama mil sıkışık. Bir ahşap kasa ve rüzgârı yakalayan bir ışık yolu.', 'The sails are fine but the shaft is stuck. A timber crate and a light path to catch the wind.')],
    end: [L('niko', 'happy', 'Değirmen dönüyor! Niko’nun ünlü ballı ekmeği yolda.', 'The mill turns! Niko’s famous honey bread is on its way.')],
  },
  r2_bakery3: {
    start: [L('niko', 'happy', 'Bir somun ekmek ve iki bal peteği. Ballı Ekmek Günü’nü geri getiriyoruz!', 'One loaf and two honeycombs. We’re bringing back Honey Bread Day!')],
    end: [
      L('niko', 'proud', 'Bütün köy kuyrukta! Bunu en son ben çocukken görmüştüm.', 'The whole village is queuing! Last time I saw this, I was a kid.'),
      L('lumi', 'calm', 'Fırının kapısında küçük bir el izi var. Kimin acaba?', 'There’s a small handprint on the oven door. I wonder whose.'),
    ],
  },
  r2_loom: {
    start: [L('mira', 'calm', 'Köyün dokuma evi çökmüş. Kalas destesi ve çiçek demeti; boyalar çiçekten yapılır.', 'The village weaving house has fallen in. Plank stacks and a posy; the dyes come from flowers.')],
    end: [L('mira', 'happy', 'Tezgâh çalışıyor. Yün yumağından kilime uzun bir yol var, ama güzel bir yol.', 'The loom works. It’s a long way from wool tuft to kilim, but a lovely one.')],
  },
  r2_house_a: {
    start: [L('mira', 'calm', 'Mavi panjurlu ev perdesiz kalmış. İki makara ve bir kalas destesi.', 'The blue-shutter house has no curtains. Two spools and a plank stack.')],
    end: [L('mira', 'happy', 'Perdeler takıldı. İçeriden bir radyo sesi geliyor.', 'Curtains up. There’s a radio playing inside.')],
  },
  r2_kiln: {
    start: [L('mira', 'calm', 'Çömlek atölyesinin fırını taştan. İki kesme blok ve bir ışık yolu.', 'The pottery kiln is made of stone. Two cut blocks and a light path.')],
    end: [L('mira', 'proud', 'Fırın sıcak. Taşı içine bırak, kil çıksın. Bazı taşlar… sürprizler yapar.', 'The kiln is hot. Drop stone in, get clay. Some stones… hold surprises.')],
  },
  r2_fountain: {
    start: [L('ada', 'curious', 'Çeşmenin kâseleri kırık. İki fincan, bir taş sütun ve suyu çağıracak bir ışık yolu.', 'The fountain basins are broken. Two cups, a column and a light path to call the water.')],
    end: [L('ada', 'happy', 'Çeşme akıyor! Kuşlar sıraya girdi bile.', 'The fountain flows! The birds are already lining up.')],
  },
  r2_house_b: {
    start: [L('mira', 'calm', 'Sarmaşıklı ev için dikiş sepeti ve bir testi. Sarmaşığa dokunma, Ada kızar.', 'The ivy house needs a sewing basket and a jug. Don’t touch the ivy, Ada will be cross.')],
    end: [L('ada', 'happy', 'Sarmaşığa dokunmamışsın. Teşekkür ederim.', 'You didn’t touch the ivy. Thank you.')],
  },
  r2_honey2: {
    start: [L('ada', 'curious', 'Bal ambarının rafları boş. Bir bal fıçısı ve bir reçel kavanozu.', 'The honey barn’s shelves are bare. A honey cask and a jam jar.')],
    end: [L('ada', 'happy', 'Ambar altın gibi parlıyor. Niko şimdiden tarif uyduruyor.', 'The barn glows like gold. Niko is already inventing recipes.')],
  },
  r2_square2: {
    start: [L('bera', 'happy', 'Pazar günü! Tezgâhlar için meyve sepetleri, hamur ve bir ışık yolu.', 'Market day! Fruit baskets and dough for the stalls, and a light path.')],
    end: [
      L('bera', 'proud', 'Meydan dolu! Herkes birbirine adını yeniden söylüyor.', 'The square is full! Everyone is telling each other their names again.'),
      L('niko', 'happy', 'Şenlik afişi buldum. Tarihi silinmiş ama… dans eden insanlar var.', 'I found a festival poster. The date’s gone, but… there are people dancing.'),
    ],
  },
  r2_workshop: {
    start: [L('mira', 'calm', 'Ortak atölye herkesin. Bir oyma kapı ve bir kilit taşı.', 'The common workshop belongs to everyone. A carved door and a keystone.')],
    end: [L('mira', 'proud', 'Atölye açık. Köyde ilk kez biri bana yardım teklif etti.', 'The workshop is open. For the first time, someone offered to help me.')],
  },
  r2_clock1: {
    start: [L('bera', 'curious', 'Saat kulesi gece yarısında durmuş. Hangi gece? Temelden başlayalım.', 'The clock tower stopped at midnight. Which night? Let’s start with the foundations.')],
    end: [L('bera', 'calm', 'Temel sağlam. Çarklar sırada.', 'Foundations are solid. Gears are next.')],
  },
  r2_clock2: {
    start: [L('bera', 'calm', 'Çarklar için ahşap kemer, yataklar için vazo, ayar için bir ışık yolu.', 'A timber arch for the gears, a vase for the bearings, a light path to set them.')],
    end: [L('bera', 'happy', 'Tık. Tık. Bir şey kıpırdadı!', 'Tick. Tick. Something moved!')],
  },
  r2_clock3: {
    start: [L('bera', 'calm', 'Kadranı örtmek için desenli örtü, ibreleri yağlamak için balmumu.', 'A patterned throw to cover the dial, beeswax to oil the hands.')],
    end: [L('bera', 'happy', 'Kadran temiz. Rakamlar parlıyor.', 'The dial is clean. The numerals shine.')],
  },
  r2_clock4: {
    start: [L('bera', 'proud', 'Son adım: çan. Bir yol feneri, bir müzik kutusu ve en zor ışık yolu.', 'Last step: the bell. A path lantern, a music box and the hardest light path yet.')],
    end: [
      L('bera', 'surprised', 'Çan çaldı! Bütün vadi duydu.', 'The bell rang! The whole valley heard it.'),
      L('lumi', 'sad', 'Hatırladım… şenlik gecesi Büyük Fener çatladı. Ve saat durdu.', 'I remember… on festival night, the Great Lantern cracked. And the clock stopped.'),
    ],
  },
  r2_gate: {
    start: [L('bera', 'curious', 'Kapının ardında liman var. Deniz kokusunu buradan alıyorum.', 'Beyond the gate is the harbor. I can smell the sea from here.')],
    end: [L('bera', 'happy', 'Kapı açıldı! Haritanın üçüncü sayfasına geçiyoruz.', 'The gate is open! On to page three of the map.')],
  },
  r3_dock: {
    start: [L('deniz', 'calm', 'Yeni yüz. Ben Deniz, liman bekçisi. İskele çürük; iki kasa ve bir deniz yıldızı lazım.', 'A new face. I’m Deniz, harbor keeper. The pier is rotten; two crates and a starfish.')],
    end: [L('deniz', 'happy', 'İskele sağlam. Martılar onayladı.', 'The pier holds. The gulls approve.')],
  },
  r3_hut_a: {
    start: [L('deniz', 'calm', 'Balıkçı kulübesinin ağları yırtık. Kumaş ve istiridye.', 'The fisher’s nets are torn. Cloth and an oyster.')],
    end: [L('deniz', 'happy', 'Ağlar tamam. Yarın sabah balık var.', 'Nets mended. Fish in the morning.')],
  },
  r3_boat: {
    start: [L('deniz', 'sad', 'Martı teknesi yıllardır karada. Dümen için oyma kapı, yelken için örtü. Bir de ışık yolu.', 'The Gull has been on dry land for years. A carved door for the rudder, a throw for the sail, and a light path.')],
    end: [L('deniz', 'proud', 'Su üstünde! Dümende bir kurdele var. Deniz onu bırakmamış.', 'Afloat! There’s a ribbon on the tiller. The sea never took it.')],
  },
  r3_hut_b: { start: [L('mira', 'calm', 'Ağ ustası kulübesi de onarım bekliyor. Kasa ve vazo.', 'The netmaker’s hut needs work too. A crate and a vase.')], end: [L('mira', 'happy', 'Tuzlu hava ahşabı seviyor. Ben de.', 'Salt air loves wood. So do I.')] },
  r3_market: { start: [L('niko', 'happy', 'Balık pazarı! Reçel, ekmek ve inci… inci mi? Liman işte.', 'A fish market! Jam, bread and a pearl… a pearl? It’s a harbor.')], end: [L('niko', 'proud', 'Tezgâhlar kuruldu. Balıkçılar ekmeğimi övdü!', 'Stalls are up. The fishers praised my bread!')] },
  r3_cave: { start: [L('bera', 'curious', 'Mağaradan fısıltılar geliyor. Bir pirinç fener ve cesaret.', 'Whispers from the cave. A brass lantern and some courage.')], end: [L('bera', 'surprised', 'Fısıltı rüzgârmış. Ama duvarda bir fener çizimi var!', 'The whisper was the wind. But there’s a lantern painted on the wall!')] },
  r3_house: { start: [L('ada', 'calm', 'Kaptanın bahçesi tuzdan yanmış. Aranjman ve kumaş gölgelik.', 'The captain’s garden is salt-burnt. An arrangement and a cloth canopy.')], end: [L('ada', 'happy', 'Tuzlu toprakta bile çiçek açar. Biraz inat yeter.', 'Even salty soil will bloom. It just takes stubbornness.')] },
  r3_lamppost: { start: [L('lumi', 'calm', 'Rıhtım karanlık. İki pirinç fener ve bir ışık yolu.', 'The quay is dark. Two brass lanterns and a light path.')], end: [L('lumi', 'happy', 'Rıhtım ışıl ışıl. Tekneler artık eve yolu bulur.', 'The quay sparkles. Boats will find their way home now.')] },
  r3_lighthouse1: { start: [L('deniz', 'calm', 'Fenerin merdivenleri çökmüş. Taş sütun ve yol feneri.', 'The lighthouse stairs have collapsed. A column and a path lantern.')], end: [L('deniz', 'proud', 'Tepeye çıkabiliyorum. Yıllardır ilk kez.', 'I can climb to the top. For the first time in years.')] },
  r3_lighthouse2: { start: [L('deniz', 'curious', 'Fenerin camı için mercan, ateşi için bir anı ve ışık yolu.', 'Coral for the lens, a memory for the flame, and a light path.')], end: [L('deniz', 'proud', 'Denize ışık! Bekçi defterinde Büyük Fener yazıyor…', 'Light on the sea! The keeper’s log mentions the Great Lantern…')] },
  r3_bridge: { start: [L('bera', 'curious', 'Gelgit köprüsü ormana gider. Usta tezgâhı gibi kalas ve taş lazım.', 'The tide bridge leads to the forest. Master-grade wood and stone.')], end: [L('bera', 'happy', 'Köprünün altında bir şişe! İçinde bir çizim: bir fener, iki el.', 'A bottle under the bridge! Inside, a drawing: a lantern and two hands.')] },
  r4_hut: { start: [L('mira', 'calm', 'Oduncu kulübesi. Ahşap kemer ve bir ametist; kapı tokmağı olacak.', 'The woodcutter’s hut. A timber arch and an amethyst for a door knocker.')], end: [L('mira', 'happy', 'Kızıl yapraklar çatıya yakıştı.', 'The red leaves suit the roof.')] },
  r4_shrine: { start: [L('lumi', 'curious', 'Yaprak sunağı benim gibi kokuyor. Yani… ışık gibi.', 'The leaf shrine smells like me. I mean… like light.')], end: [L('lumi', 'happy', 'Sunak yandı. İçimde bir parça daha yerine oturdu.', 'The shrine is lit. Another piece of me fell into place.')] },
  r4_stonepath: { start: [L('bera', 'curious', 'Kadim patika haritada noktalı çizgi. İki taş sütun onu gerçek yapar.', 'The ancient trail is a dotted line on the map. Two columns will make it real.')], end: [L('bera', 'happy', 'Patika açık. Mantarlar yolu gösteriyor.', 'The trail is open. Mushrooms mark the way.')] },
  r4_bigtree1: { start: [L('ada', 'calm', 'Bilge Ağacın kökleri susuz. Aranjman ve tart; ağaçlar tatlıyı sever.', 'The Elder Tree’s roots are thirsty. An arrangement and a tart; trees like sweets.')], end: [L('ada', 'happy', 'Kökler uyandı. Ağaç biraz gerindi sanki.', 'The roots woke up. The tree seemed to stretch.')] },
  r4_gazebo: { start: [L('mira', 'calm', 'Orman köşkü için ahşap kemer ve desenli örtü.', 'A timber arch and a patterned throw for the forest pavilion.')], end: [L('mira', 'proud', 'Yağmurda oturup çay içilecek bir yer.', 'A place to sit and drink tea in the rain.')] },
  r4_well: { start: [L('ada', 'curious', 'Yosunlu kuyunun içi kristal dolu. Taş, kristal ve ışık yolu.', 'The mossy well is full of crystals. Stone, crystal and a light path.')], end: [L('ada', 'happy', 'Kuyu ışık yansıtıyor. Bu ormanda gece bile kaybolunmaz.', 'The well reflects light. No one gets lost in this forest, even at night.')] },
  r4_workshop: { start: [L('mira', 'calm', 'Reçine atölyesi. Kemer, çini tabak ve ışık yolu.', 'The resin workshop. An arch, a decorated plate and a light path.')], end: [L('mira', 'happy', 'Reçine kokusu! Çocukluğum.', 'The smell of resin! My childhood.')] },
  r4_statue: { start: [L('bera', 'calm', 'Geyik heykelinin kaidesi kırık. Mozaik ve anı defteri.', 'The stag statue’s plinth is broken. A mosaic and a keepsake journal.')], end: [L('bera', 'surprised', 'Kaidede yazı: “Ormanı koruyanlara.” Altında bir fener işareti.', 'The plinth reads: “For those who keep the forest.” Beneath it, a lantern mark.')] },
  r4_lamppost: { start: [L('lumi', 'calm', 'Patikaya iki yol feneri. Gece yürüyüşü orman için de iyi.', 'Two path lanterns for the trail. Night walks are good for forests too.')], end: [L('lumi', 'happy', 'Ateşböcekleri fenerlere özendi.', 'The fireflies are jealous of the lanterns.')] },
  r4_bigtree2: { start: [L('ada', 'proud', 'Bilge Ağacın tacı: ışıltılı çiçekler, altın bal ve kristal.', 'The Elder Tree’s crown: glimmering flowers, golden honey and crystal.')], end: [L('ada', 'happy', 'Ağacın oyuğunda bir mendil var. Fener nakışlı.', 'There’s a handkerchief in the tree hollow. Embroidered with a lantern.')] },
  r4_gate: { start: [L('bera', 'curious', 'Kızıl Kapı tepelere açılıyor. Menteşeleri yağlı. Biri bekliyormuş.', 'The Red Gate opens to the hills. Its hinges are oiled. Someone was waiting.')], end: [L('bera', 'happy', 'Kapı açıldı. Rüzgâr şarkı söylüyor!', 'The gate is open. The wind is singing!')] },
  r5_hut: { start: [L('yaren', 'calm', 'Ben Yaren. Rüzgârın masallarını anlatırım. Kulübem için kilim ve kemer lazım.', 'I’m Yaren. I tell the wind’s stories. My hut needs a kilim and an arch.')], end: [L('yaren', 'happy', 'Kulübem sıcak. Gel, bir masal anlatayım… sonra.', 'My hut is warm. Come, I’ll tell you a story… later.')] },
  r5_windmill_a: { start: [L('yaren', 'curious', 'Batı değirmeni batı rüzgârını bekliyor. Kemer, pasta ve ışık yolu.', 'The west mill waits for the west wind. An arch, a cake and a light path.')], end: [L('yaren', 'happy', 'Batı rüzgârı geldi. Masalı da getirdi.', 'The west wind came. It brought a story.')] },
  r5_stonepath: { start: [L('bera', 'calm', 'Tepe yolu dik. İki mozaik pano ile basamak yapalım.', 'The hill road is steep. Let’s make steps with two mosaic panels.')], end: [L('bera', 'happy', 'Basamaklar hazır. Dizlerim teşekkür ediyor.', 'Steps are ready. My knees say thanks.')] },
  r5_statue: { start: [L('yaren', 'calm', 'Rüzgâr anıtı. Mozaik ve ışık merceği.', 'The wind monument. A mosaic and a light lens.')], end: [L('yaren', 'proud', 'Anıt yine ıslık çalıyor. Rüzgâr adını hatırladı.', 'The monument whistles again. The wind remembers its name.')] },
  r5_windmill_b: { start: [L('niko', 'happy', 'Doğu değirmeni! Un bol olursa pasta bol olur. Kemer, pasta, ışık yolu.', 'The east mill! More flour, more cake. An arch, a cake, a light path.')], end: [L('niko', 'proud', 'İki değirmen, bir tepe. Ben buna “ekmek dengesi” diyorum.', 'Two mills, one hill. I call that “bread balance”.')] },
  r5_barn: { start: [L('niko', 'calm', 'Yayla ambarı için kraliçe petek ve pasta.', 'A royal comb and a cake for the upland barn.')], end: [L('niko', 'happy', 'Ambar dolu. Kış bize uğrasın, korkmuyoruz.', 'The barn is full. Let winter come.')] },
  r5_gazebo: { start: [L('ada', 'calm', 'Seyir köşkü için çiçek tacı, örtü ve ışık yolu.', 'A wreath, a throw and a light path for the lookout.')], end: [L('ada', 'happy', 'Buradan bütün vadi görünüyor. Çiçekler bile.', 'You can see the whole valley from here. Even the flowers.')] },
  r5_tower1: { start: [L('yaren', 'curious', 'Rüzgâr kulesinin basamakları. Heykel kaidesi ve yol feneri.', 'The wind tower’s steps. A statue plinth and a path lantern.')], end: [L('yaren', 'calm', 'Yarısına çıktık. Rüzgâr kulağıma fısıldıyor: “devam”.', 'We’re halfway up. The wind whispers: “keep going”.')] },
  r5_tower2: { start: [L('yaren', 'proud', 'Kulenin tepesi için kristal küre, aile albümü ve ışık yolu.', 'A crystal orb, a family album and a light path for the top.')], end: [L('yaren', 'happy', 'Bak! Eskiden her evde bir ışık varmış. Yine olacak.', 'Look! Once there was a light in every house. There will be again.')] },
  r5_beacon: { start: [L('lumi', 'calm', 'Sis feneri yanarsa sis dağılır. Bekçi feneri ve ışık yolu.', 'Light the fog beacon and the fog will lift. A keeper’s lantern and a light path.')], end: [L('lumi', 'happy', 'Sis kalktı. Gölün ışıkları görünüyor!', 'The fog has lifted. I can see the lake lights!')] },
  r5_bridge: { start: [L('bera', 'curious', 'Bulut köprüsü göle iniyor. Usta işi ahşap ve heykel kaidesi.', 'The cloud bridge descends to the lake. Master wood and a statue plinth.')], end: [L('yaren', 'happy', 'Köprü taşında şarkım yazılı: “Işık paylaştıkça çoğalır.”', 'My song is written on the bridge stone: “Light grows when it is shared.”')] },
  r6_dock: { start: [L('deniz', 'calm', 'Göle de bir iskele lazım. Usta tezgâhı ve mercan.', 'The lake needs a pier too. A master bench and coral.')], end: [L('deniz', 'happy', 'Ay iskelesi. Adını ay koydu, ben değil.', 'The Moon Pier. The moon named it, not me.')] },
  r6_boat: { start: [L('deniz', 'calm', 'Ay kayığı için kilim yelken, gelgit sandığı ve ışık yolu.', 'A kilim sail, a tide chest and a light path for the moon skiff.')], end: [L('deniz', 'proud', 'Kayık süzülüyor. Yıldızlar suda yüzüyor.', 'The skiff glides. Stars float on the water.')] },
  r6_greenhouse: { start: [L('ada', 'curious', 'Gece serası sadece karanlıkta açan çiçekler için. Çiçek tacı ve küre.', 'The night glasshouse is for flowers that bloom only in the dark. A wreath and an orb.')], end: [L('ada', 'happy', 'Ay çiçekleri açtı. Rüya gibi.', 'The moonflowers opened. Like a dream.')] },
  r6_gazebo: { start: [L('yaren', 'calm', 'Nilüfer köşkünde masal gecesi yapacağız. Usta tezgâhı, seramik fener, ışık yolu.', 'We’ll hold a story night in the lily pavilion. A master bench, a ceramic lantern, a light path.')], end: [L('yaren', 'happy', 'Köşk hazır. İlk masal senin hakkında.', 'The pavilion is ready. The first story is about you.')] },
  r6_lamppost: { start: [L('lumi', 'calm', 'Kıyıya iki bekçi feneri. Yansımaları ikiye katlar.', 'Two keeper’s lanterns for the shore. The reflections double them.')], end: [L('lumi', 'happy', 'Dört fener! Yani iki, ama dört gibi.', 'Four lanterns! Well, two, but it looks like four.')] },
  r6_house: { start: [L('mira', 'calm', 'Göl evi için kilim ve seramik fener.', 'A kilim and a ceramic lantern for the lake house.')], end: [L('mira', 'proud', 'Bu evi ben yaptım sayılır. Sen de.', 'I practically built this house. You too.')] },
  r6_statue: { start: [L('bera', 'curious', 'Balıkçıl heykelinin gagası boş. Heykel kaidesi ve aile albümü.', 'The heron statue’s beak is empty. A statue plinth and a family album.')], end: [L('bera', 'surprised', 'Gagada bir anahtar belirdi! Neyi açıyor?', 'A key appeared in its beak! What does it open?')] },
  r6_observatory1: { start: [L('yaren', 'curious', 'Gözlemevinin kubbesi. Yıldız taşı, heykel kaidesi ve ışık yolu.', 'The observatory dome. A starstone, a plinth and a light path.')], end: [L('yaren', 'calm', 'Kubbe açılıyor. Gökyüzü içeri giriyor.', 'The dome opens. The sky comes in.')] },
  r6_observatory2: { start: [L('yaren', 'proud', 'Yıldız haritası için yıldız taşı, bekçi feneri ve vadinin haritası.', 'For the star map: a starstone, a keeper’s lantern and the map of the valley.')], end: [L('yaren', 'surprised', 'Haritaya biri kurşunkalemle bir takımyıldız eklemiş: “Nur’un Feneri”.', 'Someone added a constellation in pencil: “Nur’s Lantern”.')] },
  r6_fountain: { start: [L('ada', 'calm', 'Yıldız çeşmesi için seramik fener, gelgit sandığı ve ışık yolu.', 'A ceramic lantern, a tide chest and a light path for the star fountain.')], end: [L('ada', 'happy', 'Çeşmenin suyu parlıyor. Yıldızlar içiyor sanki.', 'The fountain water glows. As if the stars are drinking.')] },
  r6_gate: { start: [L('bera', 'curious', 'Gümüş Kapı… balıkçılın anahtarı tam uyuyor. Bilge totem ve yıldız taşı.', 'The Silver Gate… the heron’s key fits perfectly. An elder totem and a starstone.')], end: [L('lumi', 'sad', 'Ötesi Kaybolan Bahçe. Büyük Fener orada. Korkuyorum… ama gidelim.', 'Beyond is the Lost Garden. The Great Lantern is there. I’m scared… but let’s go.')] },
  r7_arch: { start: [L('bera', 'calm', 'Bahçe kemeri yıkılmış. Heykel kaidesi ve usta tezgâhı.', 'The garden arch has fallen. A plinth and a master bench.')], end: [L('bera', 'happy', 'İçerisi… haritamda yok. İlk kez haritasız yürüyorum.', 'Inside… isn’t on my map. First time I’ve walked without one.')] },
  r7_garden_a: { start: [L('ada', 'calm', 'Gül teras. Antik bahçe süsü ve meyve fidanı.', 'The rose terrace. An ancient urn and an orchard sapling.')], end: [L('ada', 'happy', 'Bu güller benden yaşlı. Ve hâlâ açıyorlar.', 'These roses are older than me. And still blooming.')] },
  r7_garden_b: { start: [L('ada', 'calm', 'Lavanta teras. Bahçe süsü, altın kovan ve ışık yolu.', 'The lavender terrace. An urn, a golden hive and a light path.')], end: [L('ada', 'happy', 'Kokusu bütün vadiye yayılıyor.', 'Its scent is spreading across the valley.')] },
  r7_gazebo: { start: [L('mira', 'calm', 'Şenlik köşkü. Bilge totem ve kilim. Şenliği yeniden yapacağız.', 'The festival pavilion. An elder totem and a kilim. We’ll hold the festival again.')], end: [L('mira', 'proud', 'Köşk hazır. İlk dansı kim yapacak?', 'The pavilion is ready. Who dances first?')] },
  r7_fountain: { start: [L('ada', 'curious', 'Anı çeşmesi. Usta vazosu, gelgit borusu ve ışık yolu.', 'The memory fountain. A masterwork urn, a conch and a light path.')], end: [L('ada', 'calm', 'Suya bakınca eski şenliği görüyorum.', 'When I look into the water I see the old festival.')] },
  r7_greenhouse: { start: [L('ada', 'calm', 'Kristal sera. Yıldız taşı ve bahçe süsü.', 'The crystal glasshouse. A starstone and an urn.')], end: [L('ada', 'happy', 'Işık camdan geçince gökkuşağı oluyor.', 'When light passes through the glass, it becomes a rainbow.')] },
  r7_statue: { start: [L('bera', 'curious', 'Bekçi heykelinin yüzü yosunlu. Anıt taşı, harita ve ışık yolu.', 'The keeper statue’s face is mossy. A monolith, the map and a light path.')], end: [L('lumi', 'surprised', 'Bu yüz… Nur. Senin büyükannen. Vadinin son bekçisi.', 'This face… Nur. Your grandmother. The valley’s last keeper.')] },
  r7_bigtree: { start: [L('ada', 'calm', 'Işık ağacı için altın elma ve bal rüzgârı tacı.', 'A golden apple and the honeywind crown for the tree of light.')], end: [L('ada', 'happy', 'Yaprakları ışık saçıyor. Ben bunu sadece masallarda duymuştum.', 'Its leaves shed light. I’d only heard of this in stories.')] },
  r7_beacon: { start: [L('lumi', 'calm', 'Son fener. Işık kalbi ve bir ışık yolu.', 'The last beacon. A heart of light and a light path.')], end: [L('lumi', 'happy', 'Bütün fenerler yanıyor. Bir tek… Büyük Fener kaldı.', 'All the beacons are lit. Only… the Great Lantern remains.')] },
  r7_great1: { start: [L('lumi', 'sad', 'Büyük Fener’in camı kırık. Işık kalbi, gökkuşağı jeodu ve bir ışık yolu.', 'The Great Lantern’s glass is broken. A heart of light, a rainbow geode and a light path.')], end: [L('lumi', 'calm', 'Cam yerinde. Şimdi ışığı geri vermek gerek.', 'The glass is whole. Now the light must go back in.')] },
  r7_great2: {
    start: [L('lumi', 'calm', 'Nur’un mektubu, ışık kalbi ve son ışık yolu. Ben de… içeri gireceğim, değil mi?', 'Nur’s letter, a heart of light and the final light path. And I… go back inside, don’t I?')],
    end: [
      L('lumi', 'happy', 'Büyük Fener yandı! Ama ben buradayım. Meğer ışık bölününce azalmıyormuş.', 'The Great Lantern is lit! And I’m still here. It turns out light doesn’t shrink when it’s shared.'),
      L('bera', 'happy', 'Bütün vadi aydınlandı. Haritaya yeni bir sayfa eklemem lazım: “Bizim Vadi”.', 'The whole valley is glowing. I need a new map page: “Our Valley”.'),
    ],
  },
};

// Second voices for regions 3–7: a reaction from a companion, so later chapters feel as lived-in
// as the first two. Appended to the end dialogue of each quest.
const EXTRA_END: Record<string, Line> = {
  r3_dock: L('bera', 'happy', 'Haritaya yeni bir çizgi: iskele. Kalemim mutlu.', 'A new line on the map: the pier. My pencil is happy.'),
  r3_hut_a: L('ada', 'curious', 'Ağların arasında deniz kekiği bitmiş. Bir tutam alabilir miyim?', 'Sea thyme is growing between the nets. May I take a sprig?'),
  r3_boat: L('lumi', 'happy', 'Teknenin pruvasında küçük bir fener var. Bana göz kırptı!', 'There’s a tiny lantern on the bow. It winked at me!'),
  r3_hut_b: L('deniz', 'calm', 'Ağ ustası geri dönmek istiyor. Kapısı artık açılıyor çünkü.', 'The netmaker wants to come back. His door opens now, after all.'),
  r3_market: L('deniz', 'happy', 'Pazar sesi… Martılar bile sustu, dinliyorlar.', 'The sound of a market… even the gulls went quiet to listen.'),
  r3_cave: L('lumi', 'curious', 'Duvardaki fener resmi… Büyük Fener’e benziyor.', 'The lantern on the wall… it looks like the Great Lantern.'),
  r3_house: L('deniz', 'proud', 'Kaptan bu bahçeyi karısı için dikmişti. Teşekkür ederim.', 'The captain planted this garden for his wife. Thank you.'),
  r3_lamppost: L('deniz', 'calm', 'Gece balıkçıları artık yolu bulur.', 'The night fishers will find their way now.'),
  r3_lighthouse1: L('lumi', 'surprised', 'Merdivenin her basamağında bir isim kazılı. Biri de Nur!', 'A name is carved on every step. One of them is Nur!'),
  r3_lighthouse2: L('bera', 'curious', 'Bekçi defterine göre ışığın kaynağı ormanın ötesinde.', 'The keeper’s log says the light’s source lies beyond the forest.'),
  r3_bridge: L('deniz', 'happy', 'Git hadi. Liman seni bekler, dönersin.', 'Go on. The harbor will wait; you’ll come back.'),
  r4_hut: L('ada', 'happy', 'Bu ormanda yaprakların bile rengi sıcak.', 'Even the leaves in this forest are warm-coloured.'),
  r4_shrine: L('mira', 'curious', 'Sunağın ahşabı benim dedemin işine benziyor.', 'The shrine’s woodwork looks like my grandfather’s.'),
  r4_stonepath: L('ada', 'calm', 'Mantarlar patikayı seviyor. Kötü bir işaret değil.', 'The mushrooms love this trail. That’s a good sign.'),
  r4_bigtree1: L('lumi', 'calm', 'Ağaç beni tanıdı galiba. Dalları ışığa doğru döndü.', 'I think the tree knows me. Its branches turned to the light.'),
  r4_gazebo: L('bera', 'happy', 'Bir köşk, bir çay, bir harita. Mutluluk tarifi.', 'A pavilion, a cup of tea, a map. A recipe for happiness.'),
  r4_well: L('lumi', 'happy', 'Kristaller kuyunun dibinde yıldız gibi.', 'The crystals sit at the bottom like stars.'),
  r4_workshop: L('niko', 'happy', 'Reçine ile pasta mı? Hayır mı? Peki.', 'Resin and cake? No? Fine.'),
  r4_statue: L('lumi', 'curious', 'Fener işareti… Nur buradan da geçmiş.', 'A lantern mark… Nur came this way too.'),
  r4_lamppost: L('ada', 'calm', 'Ateşböcekleri artık yalnız değil.', 'The fireflies aren’t alone anymore.'),
  r4_bigtree2: L('mira', 'proud', 'Bu ağaç benden de, senden de, hepimizden de yaşlı. Ve hâlâ büyüyor.', 'This tree is older than all of us. And still growing.'),
  r4_gate: L('ada', 'curious', 'Tepelerde rüzgârla konuşan biri varmış.', 'They say someone on the hills talks with the wind.'),
  r5_hut: L('bera', 'curious', 'Yaren’in masalları haritalarımdan eski.', 'Yaren’s stories are older than my maps.'),
  r5_windmill_a: L('niko', 'happy', 'Taze un kokusu! Tepeler artık benim mutfağım.', 'Fresh flour! The hills are my kitchen now.'),
  r5_stonepath: L('yaren', 'calm', 'Basamak sayısını rüzgâr bilir. Yüz yirmi iki.', 'The wind knows the number of steps. One hundred twenty-two.'),
  r5_statue: L('lumi', 'happy', 'Anıt ıslık çalınca ben de dans ediyorum.', 'When the monument whistles, I dance.'),
  r5_windmill_b: L('yaren', 'happy', 'İki değirmen, iki rüzgâr, tek şarkı.', 'Two mills, two winds, one song.'),
  r5_barn: L('ada', 'happy', 'Ambarın çatısına kırlangıçlar yuva yaptı.', 'Swallows have nested under the barn roof.'),
  r5_gazebo: L('bera', 'proud', 'Buradan bütün haritayı tek bakışta görebiliyorum.', 'From here I can see the whole map at a glance.'),
  r5_tower1: L('lumi', 'curious', 'Kule bir şey hatırlıyor. Ben de bir şey hatırlıyor gibiyim.', 'The tower remembers something. So do I, I think.'),
  r5_tower2: L('bera', 'surprised', 'Gölün üstünde ışıklar var. Daha önce görmemiştim.', 'There are lights over the lake. I’d never seen them before.'),
  r5_beacon: L('yaren', 'calm', 'Sis, yalnızca hatırlanmayan şeylere çöker.', 'Fog only settles on things no one remembers.'),
  r5_bridge: L('lumi', 'calm', 'Şarkı doğruymuş. Ben de paylaştıkça çoğalıyorum.', 'The song is true. I grow, too, when I’m shared.'),
  r6_dock: L('yaren', 'calm', 'Göl geceleri gökyüzünü ezberler.', 'At night the lake memorises the sky.'),
  r6_boat: L('lumi', 'happy', 'Suda iki ay var! Biri bizim.', 'There are two moons on the water! One is ours.'),
  r6_greenhouse: L('yaren', 'curious', 'Ay çiçekleri sadece birbirine bakınca açar.', 'Moonflowers only open when they face each other.'),
  r6_gazebo: L('deniz', 'happy', 'Limandan buraya kayıkla geldim. Masalı kaçırmam.', 'I rowed here from the harbor. I wasn’t going to miss the story.'),
  r6_lamppost: L('bera', 'happy', 'Kıyının haritası artık ışıkla çiziliyor.', 'The shore’s map is drawn in light now.'),
  r6_house: L('ada', 'calm', 'Göl evinin penceresinden lavanta kokusu geliyor.', 'Lavender drifts from the lake house window.'),
  r6_statue: L('yaren', 'curious', 'Anahtarın nereye ait olduğunu rüzgâr söylemiyor. Henüz.', 'The wind won’t say where the key belongs. Not yet.'),
  r6_observatory1: L('lumi', 'surprised', 'Gökyüzü bu kadar yakın mıydı?', 'Was the sky always this close?'),
  r6_observatory2: L('lumi', 'sad', 'Nur yıldızlara bir fener çizmiş. Beni mi aramış?', 'Nur drew a lantern among the stars. Was she looking for me?'),
  r6_fountain: L('deniz', 'calm', 'Bu suyu içen martılar parlıyor sanki.', 'The gulls that drink here seem to glow.'),
  r6_gate: L('bera', 'calm', 'Haritamın son sayfası boş. Birlikte dolduralım.', 'The last page of my map is blank. Let’s fill it together.'),
  r7_arch: L('lumi', 'surprised', 'Burayı… biliyorum. Burada doğdum.', 'I… know this place. I was born here.'),
  r7_garden_a: L('niko', 'happy', 'Gül reçeli! Kimse bana engel olamaz.', 'Rose jam! No one can stop me.'),
  r7_garden_b: L('yaren', 'calm', 'Lavanta, uykusu kaçan rüzgârlar içindir.', 'Lavender is for winds that cannot sleep.'),
  r7_gazebo: L('niko', 'proud', 'Şenlik sofrası benden. Herkes gelsin.', 'The festival table is on me. Everyone’s invited.'),
  r7_fountain: L('lumi', 'calm', 'Suda dans edenleri görüyorum. Aralarında Nur da var.', 'I see people dancing in the water. Nur is among them.'),
  r7_greenhouse: L('mira', 'happy', 'Camları ben kestim, ışığı sen getirdin.', 'I cut the glass; you brought the light.'),
  r7_statue: L('mira', 'calm', 'Yüzünü yosundan temizleyelim. Hak ediyor.', 'Let’s clean the moss from her face. She deserves it.'),
  r7_bigtree: L('yaren', 'happy', 'Bu ağacın masalını yıllardır anlatıyordum. Gerçekmiş.', 'I’ve told this tree’s story for years. It was true.'),
  r7_beacon: L('deniz', 'proud', 'Liman fenerine kadar görünüyor. Martılar çıldırdı.', 'You can see it from the harbor. The gulls went wild.'),
  r7_great1: L('bera', 'calm', 'Herkes burada. Bu kez kimse kimseyi unutmayacak.', 'Everyone is here. This time no one forgets anyone.'),
};

for (const [id, line] of Object.entries(EXTRA_END)) {
  const d = DIALOGUES[id];
  if (d && d.end.length < 4) d.end.push(line);
}
