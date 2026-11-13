/* WORDROP — 定数（ゲームの進行・AI通信・オーパーツ） */
window.WD = window.WD || {};

/* ---------- 進行 ---------- */
WD.SECONDS_PER_MONTH = 5;   // ×1 で 5秒＝1ヶ月（60秒＝1年）
WD.SPEEDS = [0, 1, 2, 4];   // ⏸ / ▶×1 / ▶▶×2 / ▶▶▶×4
WD.CENTURY_MONTHS = 1200;   // 100年で1区切り
WD.ORACLES = 3;             // 100年に投下できる神託の数
WD.LOCK_MONTHS = 180;       // 1回投下すると15年ロック
WD.MAX_WORD = 15;           // 単語の最大文字数
WD.SAY_MAX = 12;            // 吹き出しの最大文字数

/* ---------- 文明パラメータ（collapse のものが 0 以下 / 100 以上で崩壊。歪みは時代錯誤の度合いで崩壊しない） ---------- */
WD.PARAMS = [
  { key: 'population', name: '人口', color: '#7ad0ff', collapse: true },
  { key: 'technology', name: '技術', color: '#ffd23f', collapse: true },
  { key: 'order', name: '秩序', color: '#ff8ad0', collapse: true },
  { key: 'distortion', name: '歪み', color: '#b07aff', collapse: false },
];

/* ---------- AI 通信（プレイヤーの設定なしで、常にこの中継サーバーへ自動接続） ---------- */
WD.ENDPOINT = 'https://wordrop-api.toheritu22.workers.dev/';
WD.AI_TIMEOUT_MS = 90000;

/* ---------- オートセーブ ---------- */
WD.SAVE_KEY = 'wordrop_autosave_v1';

/* ---------- オーパーツ（神託で島のど真ん中に出現する、時代無視の建物・乗り物） ---------- */
WD.OPA = {
  dome: { name: 'ドーム球場', size: 7 },
  skyscraper: { name: '高層ビル', size: 3 },
  konbini: { name: 'コンビニ', size: 2 },
  factory: { name: '巨大工場', size: 6 },
  radiotower: { name: '電波塔', size: 3 },
  highway: { name: '高速道路と車', line: 'road' },
  shinkansen: { name: '新幹線', line: 'rail' },
};
// AI が近い言葉で返したときの読み替え
WD.OPA_ALIAS = {
  stadium: 'dome', baseball: 'dome', building: 'skyscraper', office: 'skyscraper', tower: 'radiotower', antenna: 'radiotower',
  convenience: 'konbini', store: 'konbini', shop: 'konbini', plant: 'factory', reactor: 'factory', road: 'highway', car: 'highway',
  train: 'shinkansen', railway: 'shinkansen', rail: 'shinkansen',
};

WD.SEASONS = { spring: '🌸春', summer: '🌻夏', autumn: '🍁秋', winter: '⛄冬' };
WD.seasonOf = (month) => (month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter');
WD.fmtYear = (y) => (y < 0 ? '紀元前' + -y + '年' : y + '年');
