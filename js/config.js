/* WORDROP — 静的データ（コース・時代・単語プール・建物定義） */
window.WD = window.WD || {};

WD.MAX_WORD_LEN = 15;
WD.DEFAULT_MODEL = 'gemini-3.8-flash';
WD.STAGES = [
  { label: '10年後', years: 10 },
  { label: '50年後', years: 50 },
  { label: '200年後', years: 200 },
];

WD.PARAMS = [
  { key: 'population', name: '人口', color: '#5be06a', dark: '#1f6b2a' },
  { key: 'technology', name: '技術', color: '#4fd8ff', dark: '#14607a' },
  { key: 'order', name: '秩序', color: '#ffd23f', dark: '#7a5a0c' },
  { key: 'distortion', name: '歪み', color: '#ff5adc', dark: '#6e1460' },
];

WD.COURSES = {
  japan: {
    key: 'japan',
    name: '日本史コース',
    short: '日本史',
    textbook: '新しい日本史',
    place: 'この国',
    initial: { population: 45, technology: 30, order: 55, distortion: 0 },
    eras: [
      {
        year: -300, name: '弥生時代',
        desc: '大陸から稲作と金属器が伝わり、ムラがクニへと変わりはじめた時代。',
        who: '弥生のムラ人', ruler: 'クニの王',
        preset: [['hut', 7], ['field', 4], ['fort', 1]],
        env: { sky: 'clear', sea: 'blue', land: 'lush', weather: 'none' },
      },
      {
        year: 794, name: '平安時代',
        desc: '都が平安京に移り、貴族たちが和歌と権力闘争に明け暮れる時代。',
        who: '平安貴族', ruler: '帝',
        preset: [['shrine', 2], ['house', 4], ['pagoda', 1], ['field', 2]],
        env: { sky: 'dusk', sea: 'blue', land: 'sakura', weather: 'petals' },
      },
      {
        year: 1573, name: '戦国時代',
        desc: '室町幕府が滅び、天下統一を狙う大名たちが覇を競う時代。',
        who: '足軽たち', ruler: '戦国大名',
        preset: [['castle', 1], ['house', 3], ['fort', 1], ['market', 1]],
        env: { sky: 'clear', sea: 'blue', land: 'normal', weather: 'none' },
      },
    ],
  },
  world: {
    key: 'world',
    name: '世界史コース',
    short: '世界史',
    textbook: '新詳 世界史',
    place: '世界',
    initial: { population: 45, technology: 35, order: 50, distortion: 0 },
    eras: [
      {
        year: -500, name: '古代ギリシア',
        desc: 'ポリスが栄え、民主政と哲学が芽吹いた時代。',
        who: 'アテネ市民', ruler: '僭主',
        preset: [['temple', 2], ['house', 5], ['field', 3], ['statue', 1]],
        env: { sky: 'clear', sea: 'emerald', land: 'normal', weather: 'none' },
      },
      {
        year: 1000, name: '中世ヨーロッパ',
        desc: '教会と封建領主が支配し、十字軍前夜の緊張が走る時代。',
        who: '修道士と農奴', ruler: 'ローマ教皇',
        preset: [['church', 1], ['castle', 1], ['house', 3], ['windmill', 2]],
        env: { sky: 'storm', sea: 'dark', land: 'normal', weather: 'rain' },
      },
      {
        year: 1492, name: '大航海時代',
        desc: 'コロンブスが西へ漕ぎ出し、世界が一つにつながり始めた時代。',
        who: '航海者', ruler: 'スペイン国王',
        preset: [['market', 2], ['house', 3], ['windmill', 1], ['fort', 1]],
        env: { sky: 'golden', sea: 'blue', land: 'normal', weather: 'none' },
      },
    ],
  },
};

/* 箱庭に置ける建物。AI にもこの key を選ばせる */
WD.BUILDINGS = {
  hut:      { name: '竪穴住居', r: 1 },
  house:    { name: '民家', r: 1 },
  field:    { name: '田畑', r: 2 },
  shrine:   { name: '神社・祠', r: 1 },
  pagoda:   { name: '寺・五重塔', r: 1 },
  temple:   { name: '神殿', r: 2 },
  church:   { name: '教会', r: 1 },
  castle:   { name: '城', r: 2 },
  fort:     { name: '砦', r: 2 },
  market:   { name: '市場', r: 2 },
  konbini:  { name: 'コンビニ', r: 2 },
  school:   { name: '学校', r: 2 },
  factory:  { name: '工場', r: 2 },
  tower:    { name: '電波塔', r: 1 },
  building: { name: '高層ビル', r: 1 },
  dome:     { name: '研究ドーム', r: 2 },
  rocket:   { name: 'ロケット', r: 1 },
  statue:   { name: '巨大像', r: 1 },
  pyramid:  { name: 'ピラミッド', r: 2 },
  windmill: { name: '風車', r: 1 },
  solar:    { name: 'ソーラー畑', r: 2 },
  tree:     { name: '森', r: 1 },
  ruins:    { name: '廃墟', r: 1 },
  portal:   { name: '時空の裂け目', r: 1 },
};

WD.SKIES = ['clear', 'dusk', 'night', 'storm', 'toxic', 'aurora', 'crimson', 'golden', 'cyber'];
WD.SEAS = ['blue', 'emerald', 'dark', 'red', 'purple', 'frozen', 'golden', 'toxic'];
WD.LANDS = ['normal', 'lush', 'desert', 'frozen', 'wasteland', 'cyber', 'flooded', 'sakura'];
WD.WEATHERS = ['none', 'rain', 'snow', 'ash', 'petals', 'neon'];

WD.WORD_POOL = [
  'サブスク', '株式会社', 'プロテイン', 'スマホ', '自動販売機', '推し活', 'タピオカ', '電子レンジ',
  'SNS', '炎上', 'インフルエンサー', '宅配便', 'ガチャ', 'ポイントカード', '有給休暇', '満員電車',
  'リモートワーク', 'AI', 'ドローン', 'カップ麺', '消費税', '年功序列', '回転寿司', 'カラオケ',
  '筋トレ', '民主主義', '量子コンピュータ', '野球', '漫画', 'アイドル', '婚活', '二度寝',
  '確定申告', '猫', '絵文字', '自撮り', 'クラファン', '半導体', '新幹線', '蒸気機関',
  '電気', 'ワクチン', 'コーヒー', 'カレー', '唐揚げ', '納豆', 'ポテチ', '防犯カメラ',
  'Wi-Fi', '給食', '偏差値', 'ハロウィン', '宝くじ', '年金', 'ロボット掃除機', '既読スルー',
  '残業', '終身雇用', 'ふるさと納税', '株主優待', '生配信', '投げ銭', '陰謀論', '星占い',
  'ダイエット', '断捨離', 'マヨネーズ', '温泉', 'ロケット', '核融合', 'パンダ', '忍者',
  'ゾンビ', '印刷機', '鉄道', '監視社会', '仮想通貨', 'コンビニ', '動画配信', 'テーマパーク',
];
