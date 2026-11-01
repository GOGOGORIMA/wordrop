/* WORDROP — 静的データ（コース・時代・単語プール・建物定義） */
window.WD = window.WD || {};

WD.MAX_WORD_LEN = 15;
WD.DEFAULT_MODEL = 'gemini-3.8-flash';
/* リアルタイム進行 */
WD.SECONDS_PER_MONTH = 5;            // 等倍：5秒＝1ヶ月（60秒＝1年）
WD.SPEEDS = [0, 1, 2, 4];            // ⏸ / ×1 / ×2 / ×4
WD.CENTURY_YEARS = 100;              // 1チャプター＝100年。100年ごとに「確定」か「継続」を選ぶ
WD.ORACLES_PER_CENTURY = 3;          // 100年につき投下できる単語（神託）の数
WD.COOLDOWN_YEARS = 15;              // 1回投下したら、次の神託までゲーム内で15年待つ
WD.DAILY_MONTHS = [24, 36];          // 日常の小イベントの間隔（2〜3年おき）
/* 神託1回が起こす「15年間の濃密タイムライン」
 * レイヤーA：メイン歴史変容（10段階・11件）。phase は5つの社会侵食フェーズ（6＝長期余波）
 * レイヤーB：市井のざわめき（4〜6ヶ月おきに差し込まれるマイクロログ＋浮島の吹き出し） */
WD.MAIN_STAGES = [
  { offset: 0, key: '着弾', phase: 1, desc: '未知の概念の出現と、当時の人々の誤解・混乱' },
  { offset: 1, key: '試行', phase: 1, desc: '権力者や商人による最初の実験的利用' },
  { offset: 2, key: '流行', phase: 2, desc: '庶民や現場レベルへの急速な拡散とブーム' },
  { offset: 4, key: '摩擦', phase: 2, desc: '既存の身分制度・宗教・支配層との衝突や規制騒動' },
  { offset: 6, key: '副作用', phase: 3, desc: '予想外のバグや社会問題、奇妙な新職業の誕生' },
  { offset: 8, key: '魔改造', phase: 3, desc: '当時の技術や文化と融合した独自のシステム・建築への発展' },
  { offset: 10, key: '制度化', phase: 4, desc: '法律や年貢、軍事・経済の根幹ルールへの組み込み' },
  { offset: 12, key: '世代交代', phase: 4, desc: 'その概念を当たり前のものとして育った新世代による急進的変化' },
  { offset: 15, key: '定着', phase: 5, desc: '15年間の変容の総括と、完全に別物となった社会の姿' },
  { offset: 22, key: '長期余波', phase: 6, desc: '次の神託がなくても続く長期的な進化' },
  { offset: 30, key: '長期余波', phase: 6, desc: 'さらに先、世代をまたいだ長期的な進化' },
];
WD.PHASES = ['', '着弾期', '流行期', '魔改造期', '制度化期', '定着期', '長期余波'];
WD.EVENT_OFFSETS = WD.MAIN_STAGES.map((s) => s.offset);
/* 投下からの年数に対応する段階（古いセーブの年数にも、直前の段階で対応） */
WD.stageOf = (offset) => WD.MAIN_STAGES.filter((s) => s.offset <= offset).pop() || WD.MAIN_STAGES[0];
WD.MURMUR_COUNT = [12, 15];          // AI が書く市井のざわめきの数
WD.MURMUR_INTERVAL = [4, 6];         // 市井のざわめきの間隔（ゲーム内の月）
WD.SAY_MAX = 10;                     // 吹き出しの最大文字数
WD.SAVE_KEY = 'wordrop.save.v1';

WD.PARAMS = [
  { key: 'population', name: '人口', color: '#5be06a', dark: '#1f6b2a' },
  { key: 'technology', name: '技術', color: '#4fd8ff', dark: '#14607a' },
  { key: 'order', name: '秩序', color: '#ffd23f', dark: '#7a5a0c' },
  { key: 'distortion', name: '歪み', color: '#ff5adc', dark: '#6e1460' },
];

/* ゲームモード（時代の抽選範囲） */
WD.MODES = {
  japan: { key: 'japan', name: '日本史モード', short: '日本史', textbook: '新しい日本史', place: 'この国', regions: ['japan'], note: '日本史20時代から抽選' },
  world: { key: 'world', name: '世界史モード', short: '世界史', textbook: '新詳 世界史', place: '世界', regions: ['world'], note: '世界史30時代から抽選' },
  chaos: { key: 'chaos', name: '全歴史モード', short: '全歴史', textbook: '時空混成 総合歴史', place: 'この浮島', regions: ['japan', 'world'], note: '全50時代から抽選' },
};
WD.BASE_PARAMS = { population: 45, technology: 35, order: 50, distortion: 0 };
WD.TIERS = [
  { name: '第1期', label: '古代・黎明期' },
  { name: '第2期', label: '中世・戦乱期' },
  { name: '第3期', label: '近世・近代' },
];

/* バイオーム → 浮島の環境 */
WD.BIOMES = {
  temperate: { name: '温帯', icon: '🌳', env: { sky: 'clear', sea: 'blue', land: 'normal', weather: 'none' } },
  desert:    { name: '砂漠', icon: '🏜', env: { sky: 'golden', sea: 'emerald', land: 'desert', weather: 'none' } },
  snow:      { name: '雪原', icon: '❄', env: { sky: 'storm', sea: 'frozen', land: 'frozen', weather: 'snow' } },
  jungle:    { name: '密林', icon: '🌴', env: { sky: 'clear', sea: 'emerald', land: 'jungle', weather: 'rain' } },
  water:     { name: '水上・海洋', icon: '🌊', env: { sky: 'clear', sea: 'blue', land: 'flooded', weather: 'none' } },
  urban:     { name: '都市・石造', icon: '🏛', env: { sky: 'dusk', sea: 'dark', land: 'urban', weather: 'none' } },
  wasteland: { name: '荒野・火山', icon: '🌋', env: { sky: 'crimson', sea: 'dark', land: 'wasteland', weather: 'ash' } },
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
  moai:     { name: 'モアイ像', r: 1 },
  colosseum:{ name: 'コロッセオ', r: 2 },
  kofun:    { name: '前方後円墳', r: 2 },
  daibutsu: { name: '大仏殿', r: 2 },
  ziggurat: { name: 'ジッグラト', r: 2 },
  maya:     { name: '神殿ピラミッド', r: 2 },
  ship:     { name: '船', r: 1 },
  guillotine: { name: 'ギロチン', r: 1 },
  mosque:   { name: 'モスク', r: 2 },
  duomo:    { name: '大聖堂ドーム', r: 2 },
  yurt:     { name: 'ゲル（移動式住居）', r: 1 },
  clocktower: { name: '時計塔', r: 1 },
  palace:   { name: '宮殿（中華）', r: 2 },
  chateau:  { name: '宮殿（西洋）', r: 2 },
  saloon:   { name: '酒場・カフェ', r: 1 },
  mammoth:  { name: 'ナウマンゾウ', r: 1 },
  tulip:    { name: 'チューリップ畑', r: 2 },
  wall:     { name: '城壁', r: 2 },
  goldhall: { name: '黄金の楼閣', r: 1 },
};

WD.SKIES = ['clear', 'dusk', 'night', 'storm', 'toxic', 'aurora', 'crimson', 'golden', 'cyber'];
WD.SEAS = ['blue', 'emerald', 'dark', 'red', 'purple', 'frozen', 'golden', 'toxic'];
WD.LANDS = ['normal', 'lush', 'desert', 'frozen', 'wasteland', 'cyber', 'flooded', 'sakura', 'jungle', 'urban'];
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
