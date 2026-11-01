/* WORDROP — 全50時代データベース
 * id / tier(1〜3) / region(japan|world) / name / sub(副題) / year(計算用の西暦, 負は紀元前) / yearLabel(表示用)
 * place(舞台) / biome(temperate|desert|snow|jungle|water|urban|wasteland) / desc(時代背景)
 * who(民衆) / ruler(権力者) / hooks(その時代固有の要素。改変の起点になる)
 * mod(初期パラメータ補正値) / symbols(選択時に浮島へ建つシンボル建築) / env(任意の環境上書き)
 */
WD.ERAS = [
  /* ================= 第1期：古代・黎明期（17種） ================= */
  {
    id: 1, tier: 1, region: 'japan', name: '旧石器時代', sub: 'ナウマンゾウ狩猟', year: -30000, yearLabel: '約3万年前',
    place: '列島', biome: 'snow',
    desc: '氷河期の列島。人々は打製石器を手にナウマンゾウを追い、簡素な小屋で寒さをしのいでいた。',
    who: '狩人の群れ', ruler: '群れの長老', hooks: ['ナウマンゾウ狩り', '打製石器', '大陸と陸続きの氷河期'],
    mod: { population: -10, technology: -12, order: -5, distortion: 0 }, symbols: [['mammoth', 3], ['hut', 3]],
  },
  {
    id: 2, tier: 1, region: 'japan', name: '縄文時代', sub: '三内丸山集落', year: -3000, yearLabel: '紀元前3000年頃',
    place: 'ムラ', biome: 'temperate',
    desc: '森と海の恵みで定住が進んだ時代。六本柱の巨大建物と縄目の土器が集落の誇りだった。',
    who: '縄文のムラ人', ruler: 'ムラのまとめ役', hooks: ['縄文土器', '六本柱の巨大建物', 'クリ林の栽培'],
    mod: { population: -5, technology: -10, order: 5, distortion: 0 }, symbols: [['hut', 5], ['tree', 2], ['fort', 1]],
  },
  {
    id: 3, tier: 1, region: 'japan', name: '弥生時代', sub: '稲作と環濠集落', year: -300, yearLabel: '紀元前300年頃',
    place: 'クニ', biome: 'temperate',
    desc: '大陸から稲作と金属器が伝わり、堀で囲まれた環濠集落がクニへと成長していった。',
    who: '弥生のムラ人', ruler: 'クニの王', hooks: ['水田稲作', '環濠集落', '銅鐸の祭祀'],
    mod: { population: 5, technology: -5, order: 0, distortion: 0 }, symbols: [['hut', 5], ['field', 3], ['fort', 1]],
  },
  {
    id: 4, tier: 1, region: 'japan', name: '邪馬台国', sub: '卑弥呼の鬼道政治', year: 239, yearLabel: '239年頃',
    place: '邪馬台国', biome: 'temperate',
    desc: '女王卑弥呼が鬼道（まじない）で人心を束ね、魏に使いを送った謎多き王国。',
    who: '倭人たち', ruler: '女王卑弥呼', hooks: ['鬼道（まじない）', '魏への朝貢', '親魏倭王の金印'],
    mod: { population: 0, technology: -5, order: 8, distortion: 5 }, symbols: [['shrine', 2], ['hut', 4], ['fort', 1], ['field', 2]],
    env: { sky: 'dusk' },
  },
  {
    id: 5, tier: 1, region: 'japan', name: '古墳時代', sub: '巨大古墳建造', year: 450, yearLabel: '5世紀',
    place: 'ヤマト', biome: 'temperate',
    desc: '大王の権威を示す巨大な前方後円墳が次々と築かれ、渡来人が新しい技術をもたらした。',
    who: '古墳づくりの民', ruler: '大王', hooks: ['前方後円墳', '埴輪', '渡来人の技術'],
    mod: { population: 5, technology: 0, order: 8, distortion: 0 }, symbols: [['kofun', 2], ['hut', 3], ['field', 2]],
  },
  {
    id: 6, tier: 1, region: 'japan', name: '飛鳥時代', sub: '大化の改新', year: 645, yearLabel: '645年',
    place: '飛鳥', biome: 'temperate',
    desc: '中大兄皇子と中臣鎌足が蘇我氏を倒し、天皇中心の国づくりと仏教の受容が進んだ。',
    who: '飛鳥の官人', ruler: '中大兄皇子', hooks: ['大化の改新', '法隆寺', '公地公民'],
    mod: { population: 0, technology: 5, order: 5, distortion: 0 }, symbols: [['pagoda', 1], ['house', 3], ['field', 2], ['shrine', 1]],
  },
  {
    id: 7, tier: 1, region: 'japan', name: '奈良時代', sub: '平城京と大仏建立', year: 752, yearLabel: '752年',
    place: '平城京', biome: 'urban',
    desc: '碁盤の目の都・平城京が栄え、聖武天皇の命で東大寺の大仏が鋳造された。',
    who: '平城京の役人', ruler: '聖武天皇', hooks: ['東大寺の大仏', '遣唐使', '墾田永年私財法'],
    mod: { population: 5, technology: 5, order: 5, distortion: 0 }, symbols: [['daibutsu', 1], ['pagoda', 1], ['house', 3]],
  },
  {
    id: 8, tier: 1, region: 'world', name: 'メソポタミア文明', sub: 'ハンムラビ法典', year: -1754, yearLabel: '紀元前1754年',
    place: 'バビロン', biome: 'desert',
    desc: '「目には目を」のハンムラビ法典が石柱に刻まれ、ジッグラトのそびえる都市国家が栄えた。',
    who: 'バビロンの市民', ruler: 'ハンムラビ王', hooks: ['ハンムラビ法典', 'ジッグラト', '楔形文字'],
    mod: { population: 0, technology: 0, order: 10, distortion: 0 }, symbols: [['ziggurat', 1], ['house', 3], ['field', 2]],
  },
  {
    id: 9, tier: 1, region: 'world', name: '古代エジプト', sub: 'ピラミッド建設期', year: -2560, yearLabel: '紀元前2560年頃',
    place: 'エジプト', biome: 'desert',
    desc: 'ナイルの恵みのもと、ファラオの墓として巨大ピラミッドが数万の労働者によって築かれた。',
    who: 'ナイルの民', ruler: 'ファラオ', hooks: ['ピラミッド建設', 'ナイルの氾濫', 'ミイラづくり'],
    mod: { population: 5, technology: -5, order: 8, distortion: 0 }, symbols: [['pyramid', 2], ['statue', 1], ['field', 2], ['house', 2]],
  },
  {
    id: 10, tier: 1, region: 'world', name: 'インダス文明', sub: 'モヘンジョダロ', year: -2300, yearLabel: '紀元前2300年頃',
    place: 'モヘンジョダロ', biome: 'desert',
    desc: '焼きレンガの整然とした街路と下水道を備えた計画都市。未解読のインダス文字が残る。',
    who: 'インダスの職人', ruler: '名も知れぬ神官王', hooks: ['大浴場', '下水道網', 'インダス文字'],
    mod: { population: 0, technology: 5, order: 5, distortion: 0 }, symbols: [['house', 4], ['wall', 1], ['field', 2]],
  },
  {
    id: 11, tier: 1, region: 'world', name: '古代ギリシャ', sub: 'アテネ民主政', year: -450, yearLabel: '紀元前450年頃',
    place: 'アテネ', biome: 'temperate',
    desc: '市民が広場で議論し、陶片追放で独裁を防いだ民主政の都。哲学と演劇が花開いた。',
    who: 'アテネ市民', ruler: 'ペリクレス', hooks: ['民会と陶片追放', 'パルテノン神殿', 'ソクラテスの問答'],
    mod: { population: 0, technology: 5, order: -5, distortion: 0 }, symbols: [['temple', 2], ['house', 3], ['statue', 1]],
  },
  {
    id: 12, tier: 1, region: 'world', name: '古代スパルタ', sub: '軍事教育国家', year: -480, yearLabel: '紀元前480年',
    place: 'スパルタ', biome: 'wasteland',
    desc: '7歳から過酷な軍事教育アゴゲを受ける戦士の国。テルモピュライでペルシア軍を迎え撃つ。',
    who: 'スパルタの戦士', ruler: 'レオニダス王', hooks: ['アゴゲ（軍事教育）', '重装歩兵の密集陣', 'テルモピュライの戦い'],
    mod: { population: -8, technology: 0, order: 12, distortion: 0 }, symbols: [['fort', 2], ['temple', 1], ['house', 2]],
  },
  {
    id: 13, tier: 1, region: 'world', name: '春秋戦国時代', sub: '諸子百家', year: -350, yearLabel: '紀元前4世紀',
    place: '中原', biome: 'temperate',
    desc: '周王朝が衰え七雄が覇を競う乱世。孔子・老子・韓非子ら諸子百家が思想を戦わせた。',
    who: '遊説の思想家', ruler: '七雄の王', hooks: ['諸子百家', '合従連衡', '鉄製農具'],
    mod: { population: 0, technology: 5, order: -10, distortion: 0 }, symbols: [['palace', 1], ['wall', 1], ['house', 3], ['field', 2]],
  },
  {
    id: 14, tier: 1, region: 'world', name: '古代ローマ帝国', sub: 'コロッセオと剣闘士', year: 80, yearLabel: '80年',
    place: 'ローマ', biome: 'urban',
    desc: 'コロッセオが完成し、市民は「パンとサーカス」に熱狂した。すべての道はローマに通じる。',
    who: 'ローマ市民', ruler: '皇帝ティトゥス', hooks: ['剣闘士試合', 'パンとサーカス', 'ローマ街道と水道橋'],
    mod: { population: 8, technology: 8, order: 5, distortion: 0 }, symbols: [['colosseum', 1], ['temple', 1], ['house', 3], ['statue', 1]],
  },
  {
    id: 15, tier: 1, region: 'world', name: '三国志時代', sub: '群雄割拠', year: 208, yearLabel: '208年',
    place: '中華', biome: 'temperate',
    desc: '魏・呉・蜀が天下を三分して争う時代。赤壁の戦いを前に、諸葛亮の策が冴えわたる。',
    who: '三国の兵', ruler: '曹操・劉備・孫権', hooks: ['赤壁の戦い', '諸葛亮の計略', '桃園の誓い'],
    mod: { population: -5, technology: 0, order: -10, distortion: 0 }, symbols: [['palace', 1], ['fort', 2], ['field', 2], ['wall', 1]],
  },
  {
    id: 16, tier: 1, region: 'world', name: 'マヤ文明', sub: '密林のピラミッド', year: 750, yearLabel: '8世紀',
    place: 'ティカル', biome: 'jungle',
    desc: '密林にそびえる神殿ピラミッドと精緻な暦。天文学に長けた神官が都市を導いた。',
    who: 'マヤの神官', ruler: '聖なる王', hooks: ['マヤ暦', '密林の神殿', '球技の儀式'],
    mod: { population: 0, technology: 5, order: 5, distortion: 3 }, symbols: [['maya', 2], ['hut', 3], ['field', 1]],
  },
  {
    id: 17, tier: 1, region: 'world', name: 'イースター島', sub: 'モアイ像建造期', year: 1300, yearLabel: '13〜16世紀',
    place: 'ラパ・ヌイ', biome: 'water',
    desc: '絶海の孤島で氏族が競ってモアイ像を建てた。巨石運搬のため島の森は失われつつある。',
    who: 'ラパ・ヌイの氏族', ruler: '大首長', hooks: ['モアイ像', 'マナ（霊力）信仰', '消えゆく森'],
    mod: { population: -8, technology: -10, order: 5, distortion: 0 }, symbols: [['moai', 5], ['hut', 2]],
  },

  /* ================= 第2期：中世・戦乱期（17種） ================= */
  {
    id: 18, tier: 2, region: 'japan', name: '平安時代', sub: '貴族と陰陽師', year: 1000, yearLabel: '1000年頃',
    place: '平安京', biome: 'temperate',
    desc: '藤原道長が栄華を極め、陰陽師が怨霊や方位を占う雅な都。和歌と物語文学が花開いた。',
    who: '平安貴族', ruler: '藤原道長', hooks: ['陰陽道と方違え', '摂関政治', '源氏物語'],
    mod: { population: 0, technology: 0, order: 5, distortion: 5 }, symbols: [['shrine', 2], ['pagoda', 1], ['house', 3]],
    env: { weather: 'petals' },
  },
  {
    id: 19, tier: 2, region: 'japan', name: '源平合戦期', sub: '武者の台頭', year: 1180, yearLabel: '1180年',
    place: '日の本', biome: 'water',
    desc: '平氏と源氏が覇を競い、一ノ谷から壇ノ浦まで武者たちが海と陸を駆けた。',
    who: '坂東武者', ruler: '源頼朝', hooks: ['壇ノ浦の海戦', '源義経の奇襲', '平家物語'],
    mod: { population: -5, technology: 0, order: -10, distortion: 0 }, symbols: [['ship', 3], ['fort', 1], ['house', 2]],
  },
  {
    id: 20, tier: 2, region: 'japan', name: '鎌倉時代', sub: '御恩と奉公・元寇', year: 1274, yearLabel: '1274年',
    place: '鎌倉', biome: 'temperate',
    desc: '将軍と御家人が「御恩と奉公」で結ばれた武家政権。そこへモンゴルの大船団が襲来する。',
    who: '御家人', ruler: '執権北条時宗', hooks: ['御恩と奉公', '元寇と神風', 'いざ鎌倉'],
    mod: { population: 0, technology: 0, order: 8, distortion: 0 }, symbols: [['fort', 2], ['shrine', 1], ['ship', 2], ['house', 2]],
  },
  {
    id: 21, tier: 2, region: 'japan', name: '室町時代', sub: '金閣と応仁の乱', year: 1467, yearLabel: '1467年',
    place: '京', biome: 'temperate',
    desc: '足利義満の金閣が輝いた都も、応仁の乱で焼け野原に。能や茶の湯など文化は爛熟した。',
    who: '京の町衆', ruler: '足利将軍', hooks: ['金閣寺', '応仁の乱', '能と茶の湯'],
    mod: { population: 0, technology: 3, order: -10, distortion: 0 }, symbols: [['goldhall', 1], ['ruins', 2], ['house', 2], ['market', 1]],
  },
  {
    id: 22, tier: 2, region: 'japan', name: '戦国初期', sub: '下剋上', year: 1500, yearLabel: '1500年頃',
    place: '戦国の世', biome: 'wasteland',
    desc: '家臣が主君を倒す下剋上が横行。北条早雲や斎藤道三ら成り上がり者が国を奪い合う。',
    who: '国人衆', ruler: '戦国大名', hooks: ['下剋上', '分国法', '一向一揆'],
    mod: { population: -3, technology: 0, order: -12, distortion: 0 }, symbols: [['castle', 1], ['fort', 2], ['ruins', 1]],
  },
  {
    id: 23, tier: 2, region: 'japan', name: '戦国末期', sub: '織田信長の天下布武', year: 1570, yearLabel: '1570年',
    place: '尾張・美濃', biome: 'temperate',
    desc: '「天下布武」を掲げた織田信長が、鉄砲と楽市楽座で天下統一へ突き進む。',
    who: '足軽たち', ruler: '織田信長', hooks: ['天下布武', '長篠の鉄砲隊', '楽市楽座'],
    mod: { population: 0, technology: 8, order: -5, distortion: 0 }, symbols: [['castle', 2], ['fort', 1], ['market', 1]],
  },
  {
    id: 24, tier: 2, region: 'japan', name: '安土桃山時代', sub: '黄金茶室と南蛮貿易', year: 1590, yearLabel: '1590年頃',
    place: '大坂', biome: 'temperate',
    desc: '豊臣秀吉が天下を統一し、黄金の茶室で権勢を誇示。南蛮船が鉄砲やカステラを運んできた。',
    who: '堺の商人', ruler: '豊臣秀吉', hooks: ['黄金の茶室', '南蛮貿易', '太閤検地'],
    mod: { population: 5, technology: 5, order: 5, distortion: 0 }, symbols: [['castle', 1], ['goldhall', 1], ['ship', 1], ['market', 1]],
  },
  {
    id: 25, tier: 2, region: 'world', name: 'ヴァイキング時代', sub: '北欧海賊と航海', year: 850, yearLabel: '9世紀',
    place: 'スカンディナヴィア', biome: 'snow',
    desc: 'ロングシップで北海を荒らし、遠くグリーンランドまで渡った北欧の戦士と商人の時代。',
    who: 'ヴァイキング', ruler: '族長（ヤール）', hooks: ['ロングシップ', '略奪と交易', '北欧神話のオーディン'],
    mod: { population: 0, technology: 3, order: -8, distortion: 0 }, symbols: [['ship', 3], ['house', 3], ['fort', 1]],
  },
  {
    id: 26, tier: 2, region: 'world', name: '宋王朝', sub: '科挙と商業都市', year: 1100, yearLabel: '1100年頃',
    place: '開封', biome: 'urban',
    desc: '科挙で選ばれた官僚が国を治め、世界初の紙幣が流通する商業都市が夜通し賑わった。',
    who: '開封の商人', ruler: '宋の皇帝', hooks: ['科挙', '交子（紙幣）', '羅針盤と火薬'],
    mod: { population: 5, technology: 8, order: 5, distortion: 0 }, symbols: [['palace', 1], ['market', 2], ['pagoda', 1], ['house', 2]],
  },
  {
    id: 27, tier: 2, region: 'world', name: '十字軍遠征期', sub: '聖地と騎士団', year: 1099, yearLabel: '1099年',
    place: 'エルサレム', biome: 'desert',
    desc: '聖地奪還を掲げた騎士たちが地中海を越え、テンプル騎士団などの武装修道会が生まれた。',
    who: '十字軍の騎士', ruler: '教皇ウルバヌス2世', hooks: ['聖地エルサレム', 'テンプル騎士団', '聖遺物信仰'],
    mod: { population: -5, technology: 0, order: -5, distortion: 3 }, symbols: [['castle', 1], ['church', 1], ['fort', 1], ['house', 1]],
  },
  {
    id: 28, tier: 2, region: 'world', name: 'モンゴル帝国', sub: 'ユーラシア制覇', year: 1240, yearLabel: '1240年頃',
    place: '大草原', biome: 'temperate',
    desc: '騎馬軍団がユーラシアを駆け抜け、史上最大の陸上帝国を築いた。駅伝制が東西を結ぶ。',
    who: '遊牧の騎兵', ruler: 'チンギス・ハンの一族', hooks: ['騎馬軍団', '駅伝制（ジャムチ）', 'パクス・モンゴリカ'],
    mod: { population: 5, technology: -3, order: 5, distortion: 0 }, symbols: [['yurt', 5], ['fort', 1]],
  },
  {
    id: 29, tier: 2, region: 'world', name: '14世紀欧州', sub: '黒死病と魔女狩り', year: 1337, yearLabel: '1337年',
    place: 'ヨーロッパ', biome: 'wasteland',
    desc: '英仏の百年戦争が始まり、東方からは黒死病の影が迫る。恐怖はやがて異端審問と魔女狩りへ。',
    who: '怯える農民', ruler: '異端審問官', hooks: ['黒死病（ペスト）', '魔女狩り', 'くちばしマスクのペスト医師'],
    mod: { population: -12, technology: 0, order: -5, distortion: 3 }, symbols: [['church', 1], ['ruins', 2], ['house', 2]],
    env: { sky: 'storm' },
  },
  {
    id: 30, tier: 2, region: 'world', name: 'ルネサンス期フィレンツェ', sub: '芸術と金融', year: 1490, yearLabel: '1490年頃',
    place: 'フィレンツェ', biome: 'urban',
    desc: 'メディチ家の銀行が芸術家を支え、ダ・ヴィンチやミケランジェロが才能を競い合った。',
    who: 'フィレンツェの職人', ruler: 'ロレンツォ・デ・メディチ', hooks: ['メディチ銀行', 'ダ・ヴィンチの発明', '大聖堂のドーム'],
    mod: { population: 3, technology: 8, order: 0, distortion: 0 }, symbols: [['duomo', 1], ['statue', 1], ['market', 1], ['house', 2]],
  },
  {
    id: 31, tier: 2, region: 'world', name: 'アステカ帝国', sub: '太陽の生贄と水上都市', year: 1500, yearLabel: '1500年頃',
    place: 'テノチティトラン', biome: 'water',
    desc: '湖上の都テノチティトランに神殿がそびえ、太陽を動かすための生贄の儀式が続いた。',
    who: 'アステカの戦士', ruler: 'モクテスマ2世', hooks: ['太陽への生贄', '湖上の浮畑チナンパ', 'カカオ豆の貨幣'],
    mod: { population: 5, technology: 0, order: 8, distortion: 3 }, symbols: [['maya', 1], ['field', 2], ['house', 2]],
  },
  {
    id: 32, tier: 2, region: 'world', name: 'インカ帝国', sub: '空中都市マチュピチュ', year: 1450, yearLabel: '1450年頃',
    place: 'クスコ', biome: 'jungle',
    desc: 'アンデスの尾根に石組みの都市が築かれ、文字の代わりに結び縄キープで帝国が管理された。',
    who: 'インカの民', ruler: '皇帝パチャクティ', hooks: ['マチュピチュ', 'キープ（結び縄）', 'インカ道'],
    mod: { population: 0, technology: 3, order: 10, distortion: 0 }, symbols: [['wall', 2], ['field', 2], ['house', 2]],
  },
  {
    id: 33, tier: 2, region: 'world', name: 'オスマン帝国', sub: 'コンスタンティノープル', year: 1453, yearLabel: '1453年',
    place: 'イスタンブル', biome: 'urban',
    desc: 'メフメト2世が巨大大砲で千年の都を陥落させ、東西交易の要に壮麗なモスクが建った。',
    who: 'オスマンの兵', ruler: 'メフメト2世', hooks: ['巨大ウルバン砲', 'イェニチェリ', 'グランドバザール'],
    mod: { population: 5, technology: 5, order: 5, distortion: 0 }, symbols: [['mosque', 2], ['market', 1], ['wall', 1]],
  },
  {
    id: 34, tier: 2, region: 'world', name: '大航海時代', sub: '新大陸と香辛料', year: 1492, yearLabel: '1492年',
    place: 'セビーリャ', biome: 'water',
    desc: 'コロンブスが西へ漕ぎ出し、胡椒一粒が金と同じ価値を持った。世界が海でつながり始める。',
    who: '航海者', ruler: 'イサベル女王', hooks: ['新大陸到達', '香辛料貿易', '羅針盤と帆船'],
    mod: { population: 3, technology: 5, order: -3, distortion: 0 }, symbols: [['ship', 3], ['market', 1], ['windmill', 1], ['fort', 1]],
  },

  /* ================= 第3期：近世・近代（16種） ================= */
  {
    id: 35, tier: 3, region: 'japan', name: '江戸初期', sub: '参勤交代と鎖国', year: 1635, yearLabel: '1635年',
    place: '江戸', biome: 'temperate',
    desc: '徳川幕府が参勤交代で大名を統制し、鎖国で海外との窓口を長崎・出島に絞った。',
    who: '江戸の町人', ruler: '徳川家光', hooks: ['参勤交代', '鎖国と出島', '武家諸法度'],
    mod: { population: 0, technology: -3, order: 12, distortion: 0 }, symbols: [['castle', 1], ['house', 3], ['fort', 1]],
  },
  {
    id: 36, tier: 3, region: 'japan', name: '江戸中期', sub: '元禄文化と浮世絵', year: 1700, yearLabel: '1700年頃',
    place: '江戸・大坂', biome: 'urban',
    desc: '天下泰平のもと町人文化が爛熟。浮世絵、歌舞伎、井原西鶴の浮世草子が大流行した。',
    who: '元禄の町人', ruler: '徳川綱吉', hooks: ['浮世絵', '歌舞伎', '生類憐れみの令'],
    mod: { population: 8, technology: 0, order: 5, distortion: 0 }, symbols: [['house', 4], ['market', 2], ['shrine', 1]],
  },
  {
    id: 37, tier: 3, region: 'japan', name: '江戸後期', sub: '飢饉と百姓一揆', year: 1783, yearLabel: '1783年',
    place: '東北諸藩', biome: 'wasteland',
    desc: '浅間山の噴火と天明の大飢饉が襲い、年貢に苦しむ百姓たちが各地で一揆を起こした。',
    who: '百姓たち', ruler: '老中田沼意次', hooks: ['天明の大飢饉', '百姓一揆', '浅間山の大噴火'],
    mod: { population: -10, technology: 0, order: -8, distortion: 0 }, symbols: [['ruins', 2], ['field', 2], ['house', 2]],
  },
  {
    id: 38, tier: 3, region: 'japan', name: '幕末', sub: '黒船と新選組', year: 1853, yearLabel: '1853年',
    place: '浦賀・京都', biome: 'water',
    desc: 'ペリーの黒船が開国を迫り、尊王攘夷の嵐の中で新選組が京の町を駆けた。',
    who: '幕末の志士', ruler: '将軍徳川家定', hooks: ['黒船来航', '新選組', '尊王攘夷'],
    mod: { population: 0, technology: 5, order: -8, distortion: 3 }, symbols: [['ship', 2], ['fort', 1], ['house', 2]],
  },
  {
    id: 39, tier: 3, region: 'japan', name: '明治維新', sub: '文明開化と富国強兵', year: 1872, yearLabel: '1872年',
    place: '東京', biome: 'urban',
    desc: 'ちょんまげを落として洋装へ。鉄道が走り、富国強兵のもと官営工場がうなりを上げた。',
    who: '開化の民', ruler: '明治政府', hooks: ['文明開化', '富国強兵', '鉄道開業'],
    mod: { population: 0, technology: 10, order: 5, distortion: 0 }, symbols: [['factory', 1], ['clocktower', 1], ['school', 1], ['house', 2]],
  },
  {
    id: 40, tier: 3, region: 'japan', name: '大正ロマン', sub: 'モダン都市', year: 1923, yearLabel: '1920年代',
    place: '東京・銀座', biome: 'urban',
    desc: 'モボ・モガが銀座を闊歩し、カフェーと活動写真が賑わう。大正デモクラシーの自由な空気。',
    who: 'モボ・モガ', ruler: '大正の政党内閣', hooks: ['カフェーとモボ・モガ', '大正デモクラシー', '関東大震災'],
    mod: { population: 5, technology: 8, order: -5, distortion: 0 }, symbols: [['building', 2], ['saloon', 1], ['clocktower', 1]],
  },
  {
    id: 41, tier: 3, region: 'world', name: 'カリブ海賊黄金期', sub: '海賊共和国', year: 1715, yearLabel: '1715年頃',
    place: 'ナッソー', biome: 'water',
    desc: '黒ひげら海賊が根城ナッソーに「海賊共和国」を築き、略奪品を山分けする掟で暮らした。',
    who: '海賊たち', ruler: '黒ひげ', hooks: ['海賊の掟', '黒ひげの旗', 'ラム酒と宝の地図'],
    mod: { population: 0, technology: 0, order: -12, distortion: 0 }, symbols: [['ship', 3], ['saloon', 1], ['fort', 1]],
  },
  {
    id: 42, tier: 3, region: 'world', name: '17世紀オランダ', sub: 'チューリップバブル', year: 1637, yearLabel: '1637年',
    place: 'アムステルダム', biome: 'temperate',
    desc: '球根1個が家1軒と同じ値段に。東インド会社の富で栄えた国が史上初のバブル崩壊を迎える。',
    who: 'オランダの商人', ruler: 'オランダ総督', hooks: ['チューリップバブル', '東インド会社', '風車と干拓'],
    mod: { population: 5, technology: 5, order: -5, distortion: 0 }, symbols: [['windmill', 3], ['tulip', 2], ['market', 1]],
  },
  {
    id: 43, tier: 3, region: 'world', name: 'ベルサイユ宮殿', sub: '絶対王政と貴族', year: 1682, yearLabel: '1682年',
    place: 'ベルサイユ', biome: 'temperate',
    desc: '「太陽王」ルイ14世が豪華絢爛な宮殿に貴族を集め、宮廷儀礼で縛りつけた絶対王政の頂点。',
    who: '宮廷貴族', ruler: 'ルイ14世', hooks: ['太陽王ルイ14世', '宮廷儀礼', '鏡の間'],
    mod: { population: 3, technology: 0, order: 10, distortion: 0 }, symbols: [['chateau', 1], ['statue', 1], ['house', 2]],
  },
  {
    id: 44, tier: 3, region: 'world', name: 'フランス革命期', sub: 'ギロチンと市民蜂起', year: 1793, yearLabel: '1793年',
    place: 'パリ', biome: 'urban',
    desc: 'バスティーユ襲撃から始まった革命は恐怖政治へ。ギロチンが王も革命家も等しく裁いた。',
    who: 'パリの市民', ruler: 'ロベスピエール', hooks: ['人権宣言', 'ギロチン', '恐怖政治'],
    mod: { population: 0, technology: 0, order: -12, distortion: 3 }, symbols: [['guillotine', 1], ['chateau', 1], ['ruins', 1], ['house', 2]],
  },
  {
    id: 45, tier: 3, region: 'world', name: '19世紀英国', sub: '産業革命と蒸気機関', year: 1830, yearLabel: '1830年頃',
    place: 'マンチェスター', biome: 'wasteland',
    desc: '蒸気機関が工場と鉄道を動かし、煙突から煤煙が昇る。世界の工場となった英国の熱気。',
    who: '工場労働者', ruler: '産業資本家', hooks: ['蒸気機関', '綿織物工場', 'ラダイト運動'],
    mod: { population: 5, technology: 12, order: -5, distortion: 0 }, symbols: [['factory', 3], ['house', 2]],
    env: { sky: 'storm' },
  },
  {
    id: 46, tier: 3, region: 'world', name: '米国西部開拓時代', sub: 'ゴールドラッシュ', year: 1849, yearLabel: '1849年',
    place: 'カリフォルニア', biome: 'desert',
    desc: '金を求めて一攫千金の夢追い人が殺到。荒野に酒場と保安官、無法者の町が生まれた。',
    who: 'フォーティナイナーズ', ruler: '保安官', hooks: ['ゴールドラッシュ', '酒場の決闘', '大陸横断鉄道'],
    mod: { population: 5, technology: 0, order: -10, distortion: 0 }, symbols: [['saloon', 2], ['windmill', 1], ['house', 2]],
  },
  {
    id: 47, tier: 3, region: 'world', name: 'ヴィクトリア朝ロンドン', sub: '霧と大英帝国', year: 1888, yearLabel: '1888年',
    place: 'ロンドン', biome: 'urban',
    desc: '「日の沈まぬ帝国」の首都は霧に包まれ、ガス灯の下で名探偵と切り裂きジャックの噂がささやかれた。',
    who: 'ロンドン市民', ruler: 'ヴィクトリア女王', hooks: ['ビッグ・ベン', 'ガス灯と霧', '切り裂きジャック'],
    mod: { population: 0, technology: 8, order: 5, distortion: 0 }, symbols: [['clocktower', 1], ['factory', 1], ['house', 3]],
    env: { sky: 'storm', weather: 'rain' },
  },
  {
    id: 48, tier: 3, region: 'world', name: '清朝末期', sub: 'アヘン戦争と紫禁城', year: 1840, yearLabel: '1840年',
    place: '北京', biome: 'temperate',
    desc: '紫禁城の皇帝のもと、英国が持ち込んだアヘンが国を蝕み、ついに砲艦が港を砲撃した。',
    who: '清の民', ruler: '道光帝', hooks: ['アヘン戦争', '紫禁城', '辮髪'],
    mod: { population: 5, technology: 0, order: -8, distortion: 0 }, symbols: [['palace', 1], ['ship', 1], ['market', 1], ['house', 2]],
  },
  {
    id: 49, tier: 3, region: 'world', name: '1920年代米国', sub: '禁酒法とマフィア', year: 1925, yearLabel: '1920年代',
    place: 'シカゴ', biome: 'urban',
    desc: '酒が禁止されたことで密造酒と地下酒場が繁盛し、アル・カポネらマフィアが街を牛耳った。',
    who: 'シカゴ市民', ruler: 'アル・カポネ', hooks: ['禁酒法', 'スピークイージー（地下酒場）', 'ジャズエイジ'],
    mod: { population: 5, technology: 8, order: -10, distortion: 0 }, symbols: [['building', 3], ['saloon', 1]],
    env: { sky: 'night' },
  },
  {
    id: 50, tier: 3, region: 'world', name: '冷戦期', sub: '米ソ宇宙開発競争', year: 1961, yearLabel: '1961年',
    place: '宇宙基地', biome: 'snow',
    desc: '米ソが核の均衡で睨み合う中、人工衛星と有人宇宙飛行で国家の威信を競い合った。',
    who: '宇宙飛行士候補', ruler: '二大国の指導者', hooks: ['スプートニク', 'ガガーリンの宇宙飛行', '核の均衡'],
    mod: { population: 0, technology: 12, order: 5, distortion: 3 }, symbols: [['rocket', 2], ['dome', 1], ['tower', 1]],
  },
];

/* 時代の環境（バイオーム＋個別上書き） */
WD.eraEnv = function (era) {
  return Object.assign({}, WD.BIOMES[era.biome].env, era.env || {});
};

/* モード（とティア。null なら全期）に合う時代から n 個を抽選（exclude の id は可能な限り避ける） */
WD.drawEras = function (modeKey, tier, n, exclude) {
  const mode = WD.MODES[modeKey];
  const pool = WD.ERAS.filter((e) => (!tier || e.tier === tier) && mode.regions.includes(e.region));
  let cand = pool.filter((e) => !(exclude || []).includes(e.id));
  if (cand.length < n) cand = pool.slice();
  const out = [];
  while (out.length < n && cand.length) out.push(cand.splice((Math.random() * cand.length) | 0, 1)[0]);
  return out;
};
