/* WORDROP — 歴史改変エンジン（Gemini API / オフライン予言） */
(function () {
  const { hashStr, rng } = WD.Sprites;
  const TYPES = Object.keys(WD.BUILDINGS);

  function fmtYear(y) { return y < 0 ? '紀元前' + -y + '年' : y + '年'; }
  WD.fmtYear = fmtYear;
  WD.REGION_NAME = { japan: '日本史', world: '世界史' };

  const clampInt = (v, lo, hi) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0;
  };

  /* ================= オフライン予言 ================= */
  const CATS = {
    conflict: {
      kw: ['銃', '戦', '核', '忍者', '刀', '爆', '兵', '軍', 'ミサイル', '戦車', '暗殺', '革命', '反乱', '一揆', 'ゾンビ', 'ウイルス', '毒', 'テロ', '侵略', '魔王', '怪獣'],
      base: { population: -18, technology: 10, order: -18, distortion: 12 },
      titles: ['{w}戦争', '{w}の乱', '{w}による天下統一'],
      t10: ['{w}が戦に転用され、{ruler}は近隣勢力を瞬く間に制圧した。', '{w}をめぐる小競り合いが島の各地で発生。{who}は武器を取った。', '{w}を恐れた{who}が山に砦を築き、籠城生活を始めた。'],
      t50: ['{w}戦争が勃発。城が次々と築かれ、{who}は疲弊しきった。', '{w}を独占した勢力が覇権を握り、恐怖政治が敷かれた。', '{w}の扱いに長けた傭兵集団が台頭し、島の王を次々にすげ替えた。'],
      t200: ['長き{w}戦乱の果て、島には廃墟と巨大な慰霊碑だけが残った。', '{w}抑止条約が結ばれ、皮肉にも二百年の平和が訪れた。', '{w}は伝説の武具として神格化され、毎年「{w}供養」が行われている。'],
      maps: [{ add: [['fort', 2]], sky: 'storm' }, { add: [['castle', 1], ['fort', 1]], remove: [['house', 1]], sky: 'crimson', weather: 'ash' }, { add: [['ruins', 2], ['statue', 1]], sky: 'dusk', land: 'wasteland', weather: 'none' }],
    },
    social: {
      kw: ['残業', '有給', '休暇', '定時', '終身雇用', '年功序列', '確定申告', '法', '民主主義', '選挙', '議会', '憲法', '学校', '偏差値', '受験', '満員電車', 'リモート', 'テレワーク', '宅配', '断捨離', '二度寝', 'ふるさと納税', '株主優待', 'マイナンバー', '防犯カメラ', '監視', '警察', 'ルール', 'マナー', '制度', '義務', '給食', '年金', 'コンプライアンス', 'ハラスメント', '労働', '監査', '規制', '申請', '手続', '会議', '稟議', 'ガバナンス', '働き方'],
      base: { population: -4, technology: 4, order: 18, distortion: 9 },
      titles: ['{w}奉行の設置', '{w}令の発布', '{w}国家の完成'],
      t10: ['{ruler}が「{w}」を法として導入。{who}は戸惑いながらも従った。', '{w}が身分制度に組み込まれ、新たな役職「{w}奉行」が置かれた。', '{w}を拒んだ者は島の端に追放される決まりができた。'],
      t50: ['{w}が社会の隅々まで浸透。秩序は保たれたが、人々の目から光が消えた。', '{w}への反発から一揆が頻発し、制度改革が繰り返された。', '{w}の書類を扱うための役所が島の三分の一を占めるに至った。'],
      t200: ['{w}は{place}の根幹となり、生まれた瞬間に{w}の手続きが始まる国になった。', '{w}の完全自動化により、国民は暇を持て余し文化が爛熟した。', '{w}を守るための{w}が作られ、{place}は世界一ややこしい国家と呼ばれた。'],
      maps: [{ add: [['school', 1]], sky: 'clear' }, { add: [['statue', 1], ['house', 1]] }, { add: [['school', 1], ['tower', 1]], sky: 'golden' }],
    },
    food: {
      kw: ['プロテイン', 'ラーメン', '寿司', 'カレー', '米', 'パン', '牛乳', '肉', '唐揚げ', '納豆', 'ポテチ', 'カップ麺', 'コーヒー', 'タピオカ', '茶', '酒', 'ビール', 'マヨネーズ', 'ケチャップ', '醤油', '味噌', '菓子', 'スイーツ', 'チョコ', '食', '飯', '麺', '筋トレ', 'ダイエット', 'ジム', 'サプリ', 'ワクチン', '薬', '抗生物質', '健康', '風呂', '温泉'],
      base: { population: 18, technology: 3, order: 6, distortion: 8 },
      titles: ['{w}革命', '{w}による大繁栄', '{w}民族の誕生'],
      t10: ['{w}が{who}の間で大流行。体格が劇的に向上した。', '{ruler}が毎朝{w}を口にしていると噂になり、模倣者が続出した。', '{w}を求めて島外から商人が押し寄せ、港がにぎわった。'],
      t50: ['{w}の生産のため田畑が拡大。人口が増え、ムラは町になった。', '{w}を神に捧げる祭りが年中行事となり、秩序と腹筋が整った。', '{w}の配給制が始まり、{w}券が事実上の通貨として流通した。'],
      t200: ['{w}を国民食とする屈強な民族が誕生。世界の格闘大会を総なめにした。', '{w}信仰が国教となり、{place}の食文化は完全に{w}色に染まった。', '島の中央に巨大な{w}像が建ち、観光客が絶えない聖地となった。'],
      maps: [{ add: [['field', 2], ['market', 1]], sky: 'clear', land: 'lush' }, { add: [['field', 1], ['house', 2]] }, { add: [['statue', 1], ['market', 1]], sky: 'golden' }],
    },
    culture: {
      kw: ['アイドル', '推し', '漫画', 'アニメ', 'カラオケ', 'SNS', '炎上', 'バズ', 'インフルエンサー', '配信', '投げ銭', '自撮り', '絵文字', 'ハロウィン', '占い', '神', '祈', '宗教', '哲学', '陰謀', '映画', '音楽', '歌', 'ダンス', '野球', 'サッカー', 'オリンピック', '祭', 'フィギュア', 'コスプレ', '恋', '婚活', '合コン', '既読', 'テーマパーク', 'ガチャ'],
      base: { population: 8, technology: 2, order: -12, distortion: 15 },
      titles: ['{w}文化の爛熟', '{w}教の興隆', '大{w}時代'],
      t10: ['{who}の間で「{w}」を称える歌が流行。{ruler}も密かに口ずさむ。', '{w}を名乗る謎の集団が出現し、各地に祠が建てられた。', '{w}が貴賤を問わず熱狂を呼び、農作業の手が止まった。'],
      t50: ['{w}をめぐる熱狂が社会を二分し、派閥争いが激化した。', '{w}が文化の中心となり、芸術・祭礼のすべてに{w}が登場する。', '{w}の頂点を決める大会が国家行事となり、{ruler}自らも参戦した。'],
      t200: ['{w}は聖典に記され、{place}独自の精神文化として世界に輸出された。', '{w}をかたどった巨大な像が建造され、島のシンボルとなった。', '{w}が日常化しすぎた結果、人々は{w}なしでは会話もできなくなった。'],
      maps: [{ add: [['shrine', 1], ['market', 1]], weather: 'petals' }, { add: [['statue', 1], ['tower', 1]], sky: 'dusk', weather: 'none' }, { add: [['statue', 1], ['temple', 1]], sky: 'night' }],
    },
    nature: {
      kw: ['猫', '犬', '森', '木', '花', '桜', '海', '山', '川', '地震', '台風', '雪', '太陽', '月', '星', '虫', '鳥', '熊', 'パンダ', '恐竜', '温暖化', '植林', 'エコ', '動物'],
      base: { population: 8, technology: -8, order: 8, distortion: 6 },
      titles: ['{w}との共生', '{w}信仰の成立', '{w}の楽園'],
      t10: ['{w}が{who}の守り神として祀られ始めた。', '島に{w}がもたらされ、景観が少しずつ変わり始めた。', '{ruler}が{w}をこよなく愛し、{w}を傷つける者を厳罰に処した。'],
      t50: ['{w}と共生する暮らしが定着し、森と田が島を覆った。', '{w}の大量発生で生態系が激変。{who}は対応に追われた。', '{w}を観察するための学問が発達し、独自の暦が作られた。'],
      t200: ['{place}は「{w}の楽園」として知られ、空から見ると島の形が{w}に見える。', '{w}を中心とした環境国家が成立。技術より自然を選んだ。', '{w}と人間の立場が逆転し、{w}が島の政治を担うようになった。'],
      maps: [{ add: [['tree', 2], ['shrine', 1]], land: 'lush' }, { add: [['tree', 2], ['field', 1]] }, { add: [['tree', 2], ['statue', 1]], sky: 'aurora' }],
    },
    tech: {
      kw: ['スマホ', 'AI', '人工知能', 'インターネット', 'ネット', 'ロボット', '電気', '電', 'Wi-Fi', 'WiFi', 'ゲーム', 'パソコン', 'PC', '量子', '半導体', 'ドローン', '蒸気', '機関', 'エンジン', 'レンジ', 'テレビ', 'ラジオ', 'カメラ', '印刷', '原子', '核融合', 'ロケット', '宇宙', '新幹線', '鉄道', '車', '飛行機', 'ビーム', 'レーザー', 'アプリ', 'プログラ', '計算', '掃除機', 'キックボード', 'パスワード', 'メール', '自動販売機', '動画'],
      base: { population: 6, technology: 22, order: -4, distortion: 14 },
      titles: ['{w}産業革命', '{w}文明の夜明け', '{w}による技術的跳躍'],
      t10: ['{w}の原型を{who}が偶然発明。最初は祭具として崇められた。', '{ruler}の命で{w}の研究所が設立され、職人が島中から集められた。', '{w}の設計図が空から降ってきたと記録され、解読が始まった。'],
      t50: ['{w}が普及し、{who}の暮らしは一変。夜も明るい街が出現した。', '{w}の量産に成功。史実より数百年早い技術革命が始まった。', '{w}を動かす燃料をめぐって山が削られ、工場の煙が空を覆った。'],
      t200: ['{w}を中心とした超技術文明が誕生。人々は{w}なしでは眠れない。', '島の空に電波塔が林立し、{place}は世界最先端の浮島となった。', '{w}が自我を持ち、島の統治に意見するようになった。'],
      maps: [{ add: [['school', 1], ['windmill', 1]] }, { add: [['factory', 1], ['tower', 1]], sky: 'dusk', sea: 'dark' }, { add: [['dome', 1], ['rocket', 1], ['building', 1]], sky: 'cyber', land: 'cyber', weather: 'neon' }],
    },
    commerce: {
      kw: ['サブスク', '株', '会社', '銀行', '円', 'ドル', '通貨', 'ポイント', '投資', '市場', 'セール', 'ローン', '税', '宝くじ', 'クラファン', 'NFT', '仮想通貨', 'ビットコイン', 'コンビニ', '通販', '広告', 'ブランド', '保険', '店', '商', '売', '買', '金', '経済'],
      base: { population: 10, technology: 8, order: -8, distortion: 10 },
      titles: ['{w}経済の勃興', '{w}本位制の成立', '{w}バブルとその崩壊'],
      t10: ['{ruler}が「{w}」を公認。{who}の間で{w}ブームが起き、市場に行列ができた。', '{w}を扱う商人組合が誕生。年貢の代わりに{w}で納める者が現れた。', '{w}の仕組みを真似た「{w}屋」が島中に乱立した。'],
      t50: ['{w}経済圏が成立し、米より{w}が信用される社会になった。', '{w}を独占した豪商が政治を左右し、{ruler}も頭が上がらない。', '{w}の解約をめぐる訴訟が激増し、専門の奉行所が置かれた。'],
      t200: ['{place}は「{w}本位制」国家へ。教科書の半分が{w}の相場表で埋まった。', '{w}をめぐる大恐慌を経て、島の経済は{w}なしでは回らなくなった。', '{w}の店舗が島の全域を覆い、どこにいても{w}から逃れられない。'],
      maps: [{ add: [['market', 2]] }, { add: [['konbini', 2], ['house', 1]], sky: 'golden' }, { add: [['building', 2], ['konbini', 1]], remove: [['hut', 2]], sky: 'night' }],
    },
    mystery: {
      kw: [],
      base: { population: 0, technology: 0, order: 0, distortion: 24 },
      titles: ['{w}の謎', '{w}現象', '空白の{w}時代'],
      t10: ['空から「{w}」と刻まれた石板が落下。{who}は意味もわからず崇め始めた。', '「{w}」という言葉だけが先に広まり、誰もその正体を知らない。', '{ruler}の夢枕に「{w}」が立ち、謎のお告げを残した。'],
      t50: ['{w}の解釈をめぐって学派が乱立。時空にわずかな歪みが観測された。', '{w}を再現しようとした試みが、予想外の発明を次々と生んだ。', '{w}を見たという証言が相次ぎ、島の地図が毎年描き変わった。'],
      t200: ['{w}は本来の意味を失い、{place}の謎の祝日名として残った。', '歴史学者は今も議論する――{w}は本当に存在したのか、と。', '{w}が時空の裂け目となり、未来の遺物が島に流れ着くようになった。'],
      maps: [{ add: [['statue', 1]], sky: 'dusk' }, { add: [['portal', 1], ['pyramid', 1]], sky: 'aurora', sea: 'purple' }, { add: [['portal', 1], ['ruins', 1]], sky: 'night' }],
    },
  };
  const ORDER = ['conflict', 'social', 'food', 'culture', 'nature', 'tech', 'commerce'];

  function classify(word) {
    const w = word.toUpperCase();
    for (const k of ORDER) if (CATS[k].kw.some((kw) => w.includes(kw.toUpperCase()))) return k;
    const h = hashStr(word);
    return ['mystery', 'tech', 'commerce', 'culture', 'mystery', 'food'][h % 6];
  }

  /* 時代固有の要素（hooks）と単語が絡み合う「バタフライ・エフェクト」の一文 */
  const TWISTS = {
    early: ['{hook}にも{w}が持ち込まれ、{who}を驚かせた。', '{ruler}は{w}を{hook}に取り入れるよう命じた。', '{hook}の場に{w}が現れ、記録係が筆を止めた。'],
    mid: ['{hook2}は{w}と融合し、史実とはまるで別の姿に変わった。', '本来の{hook2}は、{w}のせいで誰も知らない方向へ転がり始めた。', '{w}をめぐる争いが{hook2}のあり方を根底から揺るがした。'],
    late: ['いまや{place}の{hook3}は「{w}」抜きでは語れない。', '{hook3}の名は忘れられ、代わりに{w}が{place}の象徴となった。', '記録の「{hook3}」の項は、{w}の話で上書きされた。'],
  };

  function fill(tpl, ctx) {
    const e = ctx.era;
    return tpl
      .replace(/\{w\}/g, ctx.word || '')
      .replace(/\{who\}/g, e.who)
      .replace(/\{ruler\}/g, e.ruler)
      .replace(/\{place\}/g, e.place)
      .replace(/\{hook\}/g, e.hooks[0])
      .replace(/\{hook2\}/g, e.hooks[1])
      .replace(/\{hook3\}/g, e.hooks[2]);
  }

  /* レイヤーA：段階ごとの汎用の一文（単語がその社会を侵食していく様子） */
  const STAGE_LINES = {
    着弾: ['{place}に突如「{w}」が現れた。{who}はそれを{hook}の一種だと思い込み、拝んだり蹴ったりした。', '「{w}」とは何か。{ruler}の側近たちは三日三晩議論したが、誰も正解にたどり着けなかった。', '空から降ってきた「{w}」を前に、{who}は「祟りだ」「いや吉兆だ」と大騒ぎになった。'],
    試行: ['{ruler}が「{w}」をこっそり試し、側近たちに固く口止めした。', '目ざとい商人が「{w}」を仕入れ、{place}の市で試験的に売り出した。', '{ruler}の命で、「{w}」の正しい使い方を探る秘密の研究が始まった。'],
    流行: ['「{w}」が{who}の間で爆発的に流行。猫も杓子も{w}の話ばかりだ。', '{place}の路地という路地に「{w}」の看板が並んだ。', '「{w}」を持たない者は時代遅れ――そんな空気が{place}を覆った。'],
    摩擦: ['{ruler}が「{w}」の制限令を出したが、{who}は抜け道を次々と編み出した。', '「{w}」は{hook2}の伝統に反すると、古くからの権威が猛反発した。', '「{w}」をめぐって身分の上下がひっくり返りかけ、各地で小競り合いが起きた。'],
    副作用: ['「{w}」のせいで思わぬ騒ぎが続出。「{w}鑑定士」なる新しい職業まで生まれた。', '「{w}」の使いすぎで、{who}の間に「{w}疲れ」という奇妙な病が広がった。', '「{w}」の偽物が出回り、本物を見分けるための役所が置かれた。'],
    魔改造: ['{place}の職人が「{w}」を{hook}と融合させ、まったく新しい「{place}式{w}」を完成させた。', '「{w}」専用の建物が{place}の様式で建てられ、街並みが一変した。', '「{w}」は当時の技術で作り直され、本来の姿とは似ても似つかない姿に進化した。'],
    制度化: ['{ruler}は「{w}」を年貢・税の仕組みに組み込み、払えない者には罰を科した。', '「{w}」を定めた法が制定され、{place}の暮らしの隅々にまで規則が及んだ。', '軍も商いも「{w}」抜きでは動かなくなり、ついに国の根幹ルールに組み込まれた。'],
    世代交代: ['「{w}」を当たり前に知る子どもたちが大人になり、古い世代を置き去りにし始めた。', '若い世代は「{w}」を親とはまったく違う使い方で楽しみ、年寄りは眉をひそめた。', '「{w}以前」を知らない世代が、{place}の要職を占め始めた。'],
    定着: ['投下から15年。{place}は「{w}」なしでは考えられない社会になった。{hook3}も、もはや以前の姿ではない。', '15年が過ぎ、「{w}」は空気のように当たり前の存在となった。旅人は{place}を「{w}の国」と呼ぶ。'],
    長期余波: ['「{w}」は世代を超えて進化を続け、{place}の文化そのものに溶け込んだ。', '「{w}」の起源を知る者はもういない。それでも{place}は{w}とともに回っている。', '「{w}」はさらに姿を変え、次の時代の常識の土台となった。'],
  };

  /* レイヤーB：市井のざわめき（本文と、浮島の吹き出し用の一言） */
  const MURMURS = [
    ['城下では「{w}」を巡る奇妙な口論が毎晩のように起きている。', 'うちのが本物だ！'],
    ['{who}の子どもたちが「{w}ごっこ」に夢中で、親たちは頭を抱えている。', '{w}ごっこしよ！'],
    ['市場の片隅で「{w}占い」を始めた老婆の店に、長蛇の列ができた。', 'よく当たるよ'],
    ['兵士たちが見張りの合間に「{w}」の話で盛り上がり、上官に叱られた。', '静かにせい！'],
    ['貴族の宴で「{w}」を知らぬ客が笑い者にされ、翌日から勉強を始めた。', '時代は{w}だ！'],
    ['寺社の掲示板に「{w}お断り」の札が貼られ、かえって人だかりができた。', 'お断りだと!?'],
    ['「{w}」を巡って夫婦喧嘩が絶えない家が増えていると、井戸端の噂。', 'もう知らん！'],
    ['旅芸人が「{w}」を題材にした滑稽芝居を演じ、連日大当たりしている。', 'アハハハ！'],
    ['{ruler}の屋敷の前で、「{w}」の規制に抗議する座り込みが続いている。', '撤回しろ！'],
    ['「{w}」の偽物を売りさばいた商人がお縄になり、町中の噂になった。', '偽物だと!?'],
    ['「{w}」のせいで寝不足だと訴える{who}が、なぜか増えている。', 'ねむい…'],
    ['路地裏に「{w}」の非公式な集まりができ、夜な夜な人が集っている。', 'ここだけの話'],
    ['「{w}」を詠み込んだ歌が流行り、誰もが口ずさんでいる。', '♪ら〜ら〜'],
    ['祭りの山車に巨大な「{w}」が飾られ、驚いた子どもたちが泣き出した。', 'でかい！'],
    ['「{w}」を拾ったという{who}が、自慢して町を練り歩いている。', '見て見て！'],
    ['「{w}」をめぐる賭け事が流行し、役人が取り締まりに乗り出した。', '賭けた！'],
    ['「{w}」の手入れ専門の職人が、弟子を募集する張り紙を出した。', '弟子求む！'],
    ['「{w}」をどうしてもやめられない、と告白する僧侶が現れた。', '南無…'],
    ['「{w}」断ちを誓った若者が、わずか三日で挫折した。', '無理でした'],
    ['「{w}はもう古い」と言い出す若者が現れ、年寄りが目を丸くした。', 'もう古いよ'],
    ['「{w}」の売り子の呼び声が、朝から晩まで{place}に響いている。', 'いらっしゃい！'],
    ['「{w}」の作法を知らない役人が、門前で足止めを食らった。', '通してくれ！'],
  ];
  const clipSay = (s) => Array.from(String(s || '')).slice(0, WD.SAY_MAX).join('');
  function sayFor(tpl, ctx) {
    const s = fill(tpl, ctx);
    return Array.from(s).length <= WD.SAY_MAX ? s : clipSay(fill(tpl.replace(/\{w\}/g, 'アレ'), ctx));
  }
  function offlineMurmurs(ctx, n) {
    const pool = MURMURS.slice();
    const out = [];
    while (out.length < n && pool.length) {
      const [t, s] = pool.splice((Math.random() * pool.length) | 0, 1)[0];
      out.push({ text: fill(t, ctx), say: sayFor(s, ctx) });
    }
    return out;
  }

  /* 単語投下 → 15年間の濃密タイムライン（レイヤーA 11件＋レイヤーB 12〜15件、オフライン） */
  function offlineDrop(ctx) {
    const cat = classify(ctx.word);
    const C = CATS[cat];
    const r = rng(hashStr(ctx.word + '|' + ctx.era.id + '|' + ctx.date.year) ^ ((Math.random() * 1e6) | 0));
    const pool = {};
    const take = (key, arr) => {
      if (!pool[key] || !pool[key].length) pool[key] = arr.slice();
      return pool[key].splice((r() * pool[key].length) | 0, 1)[0];
    };
    // 合計で約1になる配分（15年目までに大半の影響が出きる）
    const frac = [0.04, 0.05, 0.08, 0.08, 0.09, 0.11, 0.12, 0.12, 0.13, 0.09, 0.09];
    const anachro = (3 - ctx.era.tier) * 3 + (ctx.era.year < 0 ? 2 : 0);
    const events = WD.MAIN_STAGES.map((st, i) => {
      const phase = st.phase;
      const tkey = phase <= 2 ? 't10' : phase <= 4 ? 't50' : 't200';
      const delta = {};
      for (const p of WD.PARAMS) {
        let v = C.base[p.key] * frac[i] * 1.1 + (r() - 0.5) * 4;
        if (p.key === 'distortion') v = Math.max(0, v + anachro * frac[i]);
        delta[p.key] = Math.round(v);
      }
      const m = C.maps[Math.min(2, Math.floor((phase - 1) / 2))];
      const build = i % 2 === 0 || st.key === '魔改造';
      const map = {
        add: build ? (m.add || []).slice(0, 2).map(([type]) => ({ type, count: 1 })) : [],
        remove: build && phase >= 4 ? (m.remove || []).map(([type, count]) => ({ type, count })) : [],
        sky: build ? null : m.sky || null, sea: build ? null : m.sea || null, land: build ? null : m.land || null, weather: build ? null : m.weather || null,
      };
      // 魔改造期：その時代の様式で建物が建つ
      if (st.key === '魔改造' && ctx.era.symbols.length) map.add.push({ type: ctx.era.symbols[0][0], count: 1 });
      let text = fill(take(st.key, STAGE_LINES[st.key]), ctx);
      if (st.key === '流行' || st.key === '世代交代' || st.key === '長期余波') text += fill(take(tkey, C[tkey]), ctx);
      return { offset: st.offset, stage: st.key, text, delta, map };
    });
    const n = WD.MURMUR_COUNT[0] + Math.floor(r() * (WD.MURMUR_COUNT[1] - WD.MURMUR_COUNT[0] + 1));
    return { title: fill(C.titles[(r() * C.titles.length) | 0], ctx), category: cat, events, murmurs: offlineMurmurs(ctx, n) };
  }
  /* 吹き出しの隙間を埋める、その場で作る市井のざわめき */
  WD.localMurmur = (ctx) => offlineMurmurs(ctx, 1)[0];

  /* 2〜3年おきの日常の小イベント（常にローカル生成。季節・時代・パラメータに応じる） */
  const MINI = {
    spring: [
      { t: '{place}で種まきが始まり、{who}は畑に出ずっぱりだ。', d: { population: 1 } },
      { t: '{who}の間で春祭りが開かれ、夜遅くまで歌声が響いた。', d: { order: 1 } },
      { t: '{ruler}が春の布告を出し、街道の掃除が命じられた。', d: { order: 2, population: -1 } },
      { t: '春の長雨で道がぬかるみ、市がしばらく休みになった。', d: { population: -1 } },
    ],
    summer: [
      { t: '日照りが続き、{who}が井戸の順番で口論になった。', d: { order: -2 } },
      { t: '夏の大市に{place}中の人が集まった。', d: { population: 1, technology: 1 } },
      { t: '「{hook}」をめぐるちょっとした噂が広まった。', d: { distortion: 1 } },
      { t: '夕立のあと、空に見事な虹がかかった。', d: { order: 1 } },
    ],
    autumn: [
      { t: '実りの秋。{place}の蔵がいっぱいになった。', d: { population: 2 } },
      { t: '{who}が収穫を祝って踊り明かした。', d: { order: 1 } },
      { t: '旅の職人が新しい道具の作り方を伝えた。', d: { technology: 2 } },
      { t: '秋の嵐で屋根がいくつか吹き飛んだ。', d: { population: -1, order: -1 } },
    ],
    winter: [
      { t: '厳しい寒さで{who}は家にこもりがちだ。', d: { population: -1 } },
      { t: '冬の夜長に{who}が新しい遊びを発明した。', d: { technology: 1 } },
      { t: '流行り病が{place}をかすめ、皆が肝を冷やした。', d: { population: -2 } },
      { t: '{ruler}の後継ぎをめぐり、年の瀬の宮中がざわついた。', d: { order: -1 } },
    ],
    word: [
      { t: '「{w}」の話題で{place}の井戸端が持ちきりだ。', d: { distortion: 1 } },
      { t: '{who}の子どもたちが「{w}ごっこ」で遊んでいる。', d: { distortion: 1, order: -1 } },
      { t: '{ruler}の代替わりの儀式に、なぜか{w}が欠かせなくなった。', d: { order: 1, distortion: 1 } },
      { t: '{w}を知らない老人が、昔話として「{w}以前」を語った。', d: { distortion: 1 } },
    ],
    // 現在のパラメータに応じた出来事
    popHi: [{ t: '{place}の長屋がすし詰めになり、新しい町が造成された。', d: { population: -1, technology: 1 } }],
    popLo: [{ t: '空き家が目立つ{place}に、遠方から移住者がやってきた。', d: { population: 2 } }],
    techHi: [{ t: '{place}の職人が、時代を何百年も先取りした機械を組み上げた。', d: { technology: 1, distortion: 1 } }],
    techLo: [{ t: '古い技を知る最後の職人が亡くなり、弟子たちが途方に暮れた。', d: { technology: -1 } }],
    ordHi: [{ t: '{ruler}の役人が戸口ごとに帳面を付けて回った。', d: { order: 1, population: -1 } }],
    ordLo: [{ t: '{place}の外れで小さな一揆が起き、すぐに鎮まった。', d: { order: 1, population: -1 } }],
  };
  function miniEvent(ctx) {
    const p = ctx.params || {};
    const pools = [MINI[ctx.season], MINI[ctx.season]];
    if (ctx.word) pools.push(MINI.word);
    if (p.population >= 70) pools.push(MINI.popHi); else if (p.population <= 30) pools.push(MINI.popLo);
    if (p.technology >= 70) pools.push(MINI.techHi); else if (p.technology <= 30) pools.push(MINI.techLo);
    if (p.order >= 70) pools.push(MINI.ordHi); else if (p.order <= 30) pools.push(MINI.ordLo);
    const list = pools[(Math.random() * pools.length) | 0];
    const ev = list[(Math.random() * list.length) | 0];
    const delta = {};
    for (const k of WD.PARAMS) delta[k.key] = ev.d[k.key] || 0;
    return { text: fill(ev.t, ctx), delta };
  }

  function describe(p) {
    const tags = [];
    if (p.technology >= 75) tags.push('超技術');
    else if (p.technology <= 25) tags.push('牧歌的');
    if (p.order >= 75) tags.push('超管理');
    else if (p.order <= 25) tags.push('無法地帯');
    if (p.population >= 75) tags.push('過密');
    else if (p.population <= 25) tags.push('過疎');
    if (p.distortion >= 60) tags.push('時空のねじれた');
    if (!tags.length) tags.push('奇妙に安定した');
    return tags.join('・') + '浮島国家';
  }
  WD.describeState = describe;

  function fmtDate(d) { return fmtYear(d.year) + d.month + '月'; }
  WD.fmtDate = fmtDate;

  function offlineFinale(ctx) {
    const e = ctx.era;
    const desc = describe(ctx.params);
    const words = ctx.drops.map((d) => d.word);
    const T = ctx.targetYear;
    const span = fmtYear(ctx.start.year) + 'から' + fmtDate(ctx.end) + 'までの' + ctx.centuries + '世紀';
    let body = e.yearLabel + '、' + e.name + 'の' + e.place + '。' + span + 'にわたり、';
    if (ctx.drops.length) {
      const byC = [];
      ctx.drops.forEach((d) => { (byC[d.century] = byC[d.century] || []).push(d); });
      body += byC.map((list, c) => list ? '第' + (c + 1) + '世紀には' + list.map((d) => '「' + d.word + '」が' + d.title + 'を引き起こし').join('、') + 'た' : '').filter(Boolean).join('。') + '。';
      const last = ctx.drops[ctx.drops.length - 1];
      const tail = last.fired[last.fired.length - 1];
      if (tail) body += '最後の神託がもたらした光景は「' + tail.text.replace(/。$/, '') + '」と記録されている。';
      if (ctx.history && ctx.history.length) { const h = ctx.history[ctx.history.length - 1]; body += 'また' + fmtYear(h.year) + 'の' + h.name + 'は、史実とは異なり「' + h.title + '」として教科書に載っている。'; }
      body += 'これらの改変は世代を超えて積み重なり、' + T + '年の' + ctx.mode.place + 'は' + desc + 'として知られている。なお、史実との違いについて質問すると先生は目をそらす。';
    } else {
      body += '一度も神託は下されなかった。歴史は静かにそのまま流れ、' + T + '年の' + ctx.mode.place + 'は' + desc + 'として知られている。時空省は「何もしないのも改変のうち」とコメントしている。';
    }
    return {
      title: ctx.mode.textbook + ' ' + T + '年版',
      chapter: '第' + (e.tier + 3) + '章　' + e.name + 'からの' + ctx.centuries * 100 + '年' + (words.length ? '――「' + words.slice(0, 3).join('」「') + '」' + (words.length > 3 ? 'ほか' : '') + 'の衝撃' : ''),
      body,
      keywords: ctx.drops.map((d) => d.title).slice(-4).concat([desc]),
      sns: '【WORDROP】' + e.name + '（' + fmtYear(ctx.start.year) + '〜）から' + ctx.centuries * 100 + '年、' + (words.length ? '「' + words.join('」「') + '」を投下したら' : '何も投下しなかったら') + '、' + T + '年は「' + desc + '」になった…！ #WORDROP #歴史改変',
    };
  }

  /* ================= Gemini API ================= */
  async function callGemini(settings, prompt) {
    const model = (settings.model || WD.DEFAULT_MODEL).trim();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(settings.apiKey);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 1.0 },
        }),
      });
      if (!res.ok) {
        let msg = 'HTTP ' + res.status;
        try { const j = await res.json(); if (j.error && j.error.message) msg += ': ' + j.error.message; } catch (e) { /* ignore */ }
        throw new Error(msg);
      }
      const data = await res.json();
      const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      const text = parts.map((p) => p.text || '').join('');
      if (!text) throw new Error('空の応答');
      return parseJSON(text);
    } finally {
      clearTimeout(timer);
    }
  }

  function parseJSON(text) {
    let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(t); } catch (e) {
      const a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
      throw new Error('JSONの解析に失敗');
    }
  }

  const typeList = TYPES.map((k) => k + '(' + WD.BUILDINGS[k].name + ')').join(', ');

  function eraBlock(e) {
    return `${e.name}（${e.sub}）／${e.yearLabel}／舞台: ${e.place}／${WD.REGION_NAME[e.region]}／風土: ${WD.BIOMES[e.biome].name}
  - 時代背景: ${e.desc}
  - 民衆: ${e.who}　権力者: ${e.ruler}
  - この時代固有の要素: ${e.hooks.join('、')}`;
  }

  function dropsBlock(drops) {
    if (!drops.length) return '- なし（最初の神託）';
    return drops.map((d) => {
      const fired = d.fired.slice(-4);
      return `- 第${d.century + 1}世紀 ${fmtDate(d.date)}に「${d.word}」→「${d.title}」。実際に起きたこと${d.fired.length > 4 ? '（最近の4件）' : ''}: ${fired.length ? fired.map((f) => fmtDate(f) + ' ' + f.text).join(' / ') : 'まだ何も起きていない'}`;
    }).join('\n');
  }

  function dropPrompt(ctx) {
    const p = ctx.params;
    const e = ctx.era;
    const years = WD.MAIN_STAGES.map((st) => `+${st.offset}年（${fmtYear(ctx.date.year + st.offset)}）【${st.key}】${st.desc}`).join('\n  ');
    const pending = ctx.pending.length
      ? '\n- 並行して進行中の予言（これから起きる予定。矛盾せず絡み合うように）: ' + ctx.pending.slice(0, 8).map((x) => `${fmtDate(x)}「${x.word}」${x.text}`).join(' / ')
      : '';
    return `あなたは歴史改変シミュレーションゲーム『WORDROP』のゲームマスターです。
空に浮かぶ箱庭の島で、ある時代が1年ずつリアルタイムに進行する大河シミュレーションです。プレイヤーは今この瞬間に「神託」として単語を1つ投下しました。
その単語（概念・モノ）が突然この時代に存在したら、次の神託までの15年間（とその先の長期余波）に世界がどう変容していくかを、途切れのない2層構造のタイムラインとして生成してください。

# 舞台の時代（ゲーム開始時にプレイヤーが選んだ時代。途中で変わらない）
${eraBlock(e)}

# 現在の状況
- 現在: ${fmtDate(ctx.date)}（開始から${Math.floor(ctx.date.elapsed / 12)}年経過、第${ctx.century + 1}世紀）
- 文明パラメータ(0〜100): 人口${p.population} / 技術${p.technology} / 秩序${p.order} / 歪み${p.distortion}
- これまでの神託と、すでに起きた出来事（この改変状態を引き継ぐこと）:
${dropsBlock(ctx.drops)}${pending}
- 今回投下された単語: 「${ctx.word}」
- レイヤーA（メイン歴史変容）として生成する11件:
  ${years}

# 描写のルール
- レイヤーA（events）: 上の11件を、各段階の意味（【着弾】〜【長期余波】）に忠実に、前の段階を受けて連鎖的に描くこと。text は各80文字以内。
- レイヤーB（murmurs）: メイン事件の合間（4〜6ヶ月おき）に流れる「市井のざわめき」を${WD.MURMUR_COUNT[0]}〜${WD.MURMUR_COUNT[1]}個。庶民・兵士・職人・貴族などのユーモラスな日常風景や小事件を、15年間の時系列順に1行40〜60文字で。say は浮島の住人の頭上に出る吹き出しの一言（${WD.SAY_MAX}文字以内のセリフや擬音）。
- 必ず「この時代固有の要素」（${e.hooks.join('、')}）や実在の人物・出来事・地名（${e.ruler}、${e.place}など）と単語を化学反応させ、この時代でしか起きないバタフライ・エフェクトを描くこと。年月が進めば権力者も代替わりしてよい。
- ユーモラスに、しかし史実の固有名詞はもっともらしく。

# 数値・描画のルール
- 人口・技術・秩序のいずれかが0以下または100以上になると文明崩壊（ゲームオーバー）。単語と時代の性質に忠実に増減させること。
- delta は各段階の増減値。population/technology/order は -10〜+10 の整数、distortion（時代錯誤による時空の歪み）は -5〜+10 の整数。murmurs には delta は不要。
- map は箱庭の島の見た目の変化。add/remove の type は次から選ぶ: ${typeList}。count は1〜2。【魔改造】【定着】では建築様式・地形の変化を積極的に反映すること。
- sky は ${WD.SKIES.join('|')}、sea は ${WD.SEAS.join('|')}、land は ${WD.LANDS.join('|')}、weather は ${WD.WEATHERS.join('|')} から選ぶ。変化がなければ null。
- title はこの改変を象徴する歴史用語風の見出し（20文字以内）。

# 出力形式（このJSONのみを出力。events は offset ${WD.EVENT_OFFSETS.join(',')} の${WD.EVENT_OFFSETS.length}件、murmurs は${WD.MURMUR_COUNT[0]}〜${WD.MURMUR_COUNT[1]}件）
{
  "title": "プロテイン維新",
  "events": [
    {"offset": 0, "stage": "着弾", "text": "…", "delta": {"population": 1, "technology": 1, "order": -1, "distortion": 3},
     "map": {"add": [{"type": "market", "count": 1}], "remove": [], "sky": null, "sea": null, "land": null, "weather": null}},
    {"offset": 1, "stage": "試行", "text": "…", "delta": {…}, "map": {…}},
    …（offset 2, 4, 6, 8, 10, 12, 15, 22, 30 も同様）
  ],
  "murmurs": [
    {"text": "城下町ではプロテインの味を巡る奇妙な口論が毎晩発生している。", "say": "抹茶味こそ至高！"},
    …
  ]
}}`;
  }

  function finalePrompt(ctx) {
    const p = ctx.params;
    const e = ctx.era;
    const T = ctx.targetYear;
    return `あなたは歴史改変シミュレーションゲーム『WORDROP』のゲームマスターです。
プレイヤーは${e.name}（${e.sub}、${e.place}）を舞台に、${fmtYear(ctx.start.year)}から${fmtDate(ctx.end)}までの${ctx.centuries}世紀（${ctx.centuries * 100}年）にわたって歴史に神託（単語）を投下し、文明を崩壊させずに歴史を確定させました。
この改変が世代を超えて積み重なった結果、${T}年の世界がどうなったかを、${T}年の中学・高校の歴史教科書の1ページとして書いてください。

# 舞台の時代
${eraBlock(e)}

# ${ctx.centuries * 100}年間の神託と出来事の記録
${dropsBlock(ctx.drops)}
${ctx.history && ctx.history.length ? '\n# 狂ってしまった史実の大事件\n' + ctx.history.map((h) => `- ${fmtYear(h.year)}「${h.name}」→「${h.title}」: ${h.text}`).join('\n') : ''}

# 確定時点の文明パラメータ(0〜100)
人口${p.population} / 技術${p.technology} / 秩序${p.order} / 歪み${p.distortion}

# 出力形式（このJSONのみを出力）
{
  "title": "教科書名（例: ${ctx.mode.textbook} ${T}年版）",
  "chapter": "章題（30文字以内）",
  "body": "教科書本文。真面目な教科書の文体で、世紀ごとの改変の連鎖と${T}年の姿までを280文字程度で。最後にくすっと笑える一文を。",
  "keywords": ["重要語句を3〜5個"],
  "sns": "SNS投稿用の文章（120文字以内、時代名と投下した単語を含め、#WORDROP #歴史改変 のハッシュタグ付き）"
}`;
  }

  /* AI の応答を安全な形に整える */
  function sanitizeDrop(raw, ctx) {
    const fallback = offlineDrop(ctx);
    if (!raw || typeof raw !== 'object') return fallback;
    const list = Array.isArray(raw.events) ? raw.events : Array.isArray(raw.timeline) ? raw.timeline : [];
    const pickEnum = (v, l) => (typeof v === 'string' && l.includes(v) ? v : null);
    const items = (arr) => (Array.isArray(arr) ? arr : [])
      .filter((a) => a && TYPES.includes(a.type))
      .slice(0, 3)
      .map((a) => ({ type: a.type, count: clampInt(a.count || 1, 1, 2) }));
    return {
      title: String(raw.title || fallback.title).slice(0, 30),
      events: WD.EVENT_OFFSETS.map((off, i) => {
        const s = list.find((x) => x && Number(x.offset) === off) || list[i] || {};
        const fb = fallback.events[i];
        const d = s.delta || {};
        const m = s.map || {};
        return {
          offset: off,
          stage: WD.stageOf(off).key,
          text: String(s.text || fb.text).slice(0, 140),
          delta: {
            population: clampInt(d.population, -10, 10),
            technology: clampInt(d.technology, -10, 10),
            order: clampInt(d.order, -10, 10),
            distortion: clampInt(d.distortion, -5, 10),
          },
          map: {
            add: items(m.add),
            remove: items(m.remove),
            sky: pickEnum(m.sky, WD.SKIES),
            sea: pickEnum(m.sea, WD.SEAS),
            land: pickEnum(m.land, WD.LANDS),
            weather: pickEnum(m.weather, WD.WEATHERS),
          },
        };
      }),
      murmurs: (() => {
        const list = (Array.isArray(raw.murmurs) ? raw.murmurs : [])
          .filter((m) => m && m.text)
          .slice(0, WD.MURMUR_COUNT[1])
          .map((m) => ({ text: String(m.text).replace(/^\s*\[?市井\]?\s*/, '').slice(0, 80), say: clipSay(m.say) || '…!' }));
        return list.length >= WD.MURMUR_COUNT[0] ? list : list.concat(fallback.murmurs.slice(0, WD.MURMUR_COUNT[0] - list.length));
      })(),
    };
  }

  function sanitizeFinale(raw, ctx) {
    const fb = offlineFinale(ctx);
    if (!raw || typeof raw !== 'object') return fb;
    return {
      title: String(raw.title || fb.title).slice(0, 40),
      chapter: String(raw.chapter || fb.chapter).slice(0, 60),
      body: String(raw.body || fb.body).slice(0, 600),
      keywords: (Array.isArray(raw.keywords) ? raw.keywords : fb.keywords).slice(0, 6).map((k) => String(k).slice(0, 30)),
      sns: String(raw.sns || fb.sns).slice(0, 280),
    };
  }

  /* ================= 史実イベント衝突（歴史が単語とパラメータで狂う） ================= */
  const TONE = {
    war:      { base: { population: -10, technology: 3, order: -8, distortion: 3 }, add: [['fort', 1], ['ruins', 1]], sky: 'crimson', verb: '戦い' },
    disaster: { base: { population: -12, technology: 0, order: -5, distortion: 2 }, add: [['ruins', 2]], remove: [['house', 1]], sky: 'storm', verb: '災厄' },
    politics: { base: { population: 0, technology: 2, order: 9, distortion: 3 }, add: [['castle', 1], ['statue', 1]], sky: null, verb: '政変' },
    culture:  { base: { population: 4, technology: 4, order: 3, distortion: 4 }, add: [['temple', 1], ['statue', 1]], sky: 'golden', verb: '出来事' },
    tech:     { base: { population: 3, technology: 10, order: -2, distortion: 4 }, add: [['factory', 1], ['tower', 1]], sky: null, verb: '発明' },
  };
  // 単語の性質ごとの「狂い方」
  const HIST_TWIST = {
    commerce: ['{name}は、「{w}」が普及していたため、合戦ではなく株主総会での委任状争奪戦として決着した。', '{name}の勝敗は、「{w}」の売上ランキングで決まることになった。'],
    tech:     ['{name}は、「{w}」による情報戦で始まる前から勝敗が決し、当事者たちは結果だけを通知で知った。', '{name}の現場には「{w}」が持ち込まれ、史実の何倍もの速さで事態が進んだ。'],
    food:     ['{name}の当日、両陣営は「{w}」の配給をめぐって休戦し、なぜか大宴会で幕を閉じた。', '{name}は、「{w}」で体を鍛え上げた者たちによって、史実とはまるで違う力比べになった。'],
    culture:  ['{name}は「{w}」をめぐる人気投票にすり替わり、勝者は熱狂的なファンを持つ側だった。', '{name}の主役たちは、「{w}」の作法にのっとって名乗りを上げるのに一日を費やした。'],
    social:   ['{name}は、「{w}」の規定違反を理由に、{ruler}への強制監査として粛々と執行された。', '{name}は「{w}」の手続きが終わるまで延期され、書類の山だけが後世に残った。'],
    conflict: ['{name}に「{w}」が投入され、史実の何倍もの規模の騒乱へと膨れ上がった。', '「{w}」を手にした者が{name}の主導権を握り、勝者と敗者が史実と入れ替わった。'],
    nature:   ['{name}のさなか、「{w}」が現場を横切ったため、誰もが戦意を失い解散した。', '{name}は「{w}」の大移動と重なり、人々はそれどころではなくなった。'],
    mystery:  ['{name}は、「{w}」の謎めいた力によって、起きたことすら記録から消えかけた。', '{name}の記録には、なぜか「{w}」という言葉だけが何度も書き込まれていた。'],
  };
  // パラメータの状態がもたらす色合い
  function paramColor(p) {
    if (p.technology >= 75) return '時代離れした技術のせいで、';
    if (p.technology <= 20) return '技術が失われつつあったため、';
    if (p.order >= 80) return '厳しすぎる統制のもとで、';
    if (p.order <= 25) return '無法がはびこる中で、';
    if (p.population >= 80) return 'あふれかえる群衆のせいで、';
    if (p.population <= 20) return '人手が足りず、';
    if (p.distortion >= 60) return '時空の歪みによって、';
    return '';
  }

  function offlineHistory(ctx) {
    const ev = ctx.event;
    const T = TONE[ev.tone] || TONE.politics;
    const words = ctx.drops.map((d) => d.word);
    const p = ctx.params;
    const color = paramColor(p);
    const sub = { era: ctx.era, word: '' };
    let text, title, cat = null;
    if (words.length) {
      // 直近の神託ほど事件に絡みやすい
      const w = Math.random() < 0.7 ? words[words.length - 1] : words[(Math.random() * words.length) | 0];
      cat = classify(w);
      sub.word = w;
      const list = HIST_TWIST[cat];
      text = (color ? color : '') + fill(list[(Math.random() * list.length) | 0].replace(/\{name\}/g, '本来の' + ev.name), sub);
      title = ev.name + '（' + w + '版）';
    } else {
      text = (color || '神託のない世界でも、') + ev.name + 'はほぼ史実どおりに起きた。ただし浮島の' + T.verb + 'は、記録とは少しだけ違う結末を迎えた。';
      title = ev.name + '（ほぼ史実どおり）';
    }
    // 大幅変動：事件の性質＋単語の性質＋歪み
    const delta = {};
    const C = cat ? CATS[cat].base : null;
    for (const k of WD.PARAMS) {
      let v = T.base[k.key] + (C ? C[k.key] * 0.5 : 0) + (Math.random() - 0.5) * 6;
      if (k.key === 'distortion') v = Math.max(0, v + words.length * 2);
      delta[k.key] = Math.round(Math.max(-20, Math.min(20, v)));
    }
    const add = (T.add || []).map(([type, count]) => ({ type, count }));
    if (cat) { const m = CATS[cat].maps[1].add || []; if (m[0]) add.push({ type: m[0][0], count: 1 }); }
    return {
      title, text, delta,
      map: { add, remove: (T.remove || []).map(([type, count]) => ({ type, count })), sky: T.sky, sea: null, land: null, weather: ev.tone === 'disaster' ? 'ash' : null },
    };
  }

  function historyPrompt(ctx) {
    const p = ctx.params;
    const e = ctx.era;
    return `あなたは歴史改変シミュレーションゲーム『WORDROP』のゲームマスターです。
箱庭の島で歴史が1年ずつ進む中、本来なら起きるはずの「史実の大事件」の年に到達しました。
これまでにプレイヤーが投下した単語（神託）と現在の文明パラメータによって、この大事件が本来の史実からどう狂ったかを判定してください。

# 舞台の時代
${eraBlock(e)}

# 割り込んできた史実の大事件
- ${fmtDate(ctx.date)}「${ctx.event.name}」
- 本来の史実: ${ctx.event.fact}

# 現在の改変状態
- 文明パラメータ(0〜100): 人口${p.population} / 技術${p.technology} / 秩序${p.order} / 歪み${p.distortion}
- 投下済みの神託と起きた出来事:
${dropsBlock(ctx.drops)}

# ルール
- 投下済みの単語が当たり前に存在する世界で、この事件がどう変質したかを、具体的かつユーモラスに描くこと（例:「コンプライアンス」が普及していたため、本能寺の変が武力討伐ではなく労働基準監督署による信長への強制監査になった）。
- 単語が1つも無い場合は、パラメータの偏りによる小さなズレとして描くこと。
- text は100文字以内。title は狂った後の事件名（25文字以内）。
- 大事件なので delta は大きめに。population/technology/order は -20〜+20 の整数、distortion は -5〜+15 の整数。人口・技術・秩序のいずれかが0以下か100以上になると文明崩壊。
- map の add/remove の type は次から選ぶ: ${typeList}。count は1〜2。sky は ${WD.SKIES.join('|')}、sea は ${WD.SEAS.join('|')}、land は ${WD.LANDS.join('|')}、weather は ${WD.WEATHERS.join('|')}、変化がなければ null。

# 出力形式（このJSONのみを出力）
{"title": "…", "text": "…", "delta": {"population": -8, "technology": 4, "order": -12, "distortion": 6},
 "map": {"add": [{"type": "fort", "count": 1}], "remove": [], "sky": null, "sea": null, "land": null, "weather": null}}`;
  }

  function sanitizeHistory(raw, ctx) {
    const fb = offlineHistory(ctx);
    if (!raw || typeof raw !== 'object') return fb;
    const pickEnum = (v, l) => (typeof v === 'string' && l.includes(v) ? v : null);
    const items = (arr) => (Array.isArray(arr) ? arr : [])
      .filter((a) => a && TYPES.includes(a.type)).slice(0, 3)
      .map((a) => ({ type: a.type, count: clampInt(a.count || 1, 1, 2) }));
    const d = raw.delta || {};
    const m = raw.map || {};
    return {
      title: String(raw.title || fb.title).slice(0, 40),
      text: String(raw.text || fb.text).slice(0, 160),
      delta: {
        population: clampInt(d.population, -20, 20),
        technology: clampInt(d.technology, -20, 20),
        order: clampInt(d.order, -20, 20),
        distortion: clampInt(d.distortion, -5, 15),
      },
      map: { add: items(m.add), remove: items(m.remove), sky: pickEnum(m.sky, WD.SKIES), sea: pickEnum(m.sea, WD.SEAS), land: pickEnum(m.land, WD.LANDS), weather: pickEnum(m.weather, WD.WEATHERS) },
    };
  }

  function online(settings) { return !settings.offline && !!settings.apiKey; }

  WD.Oracle = {
    online,
    async drop(ctx, settings) {
      if (!online(settings)) return { result: offlineDrop(ctx), source: 'offline' };
      try {
        const raw = await callGemini(settings, dropPrompt(ctx));
        return { result: sanitizeDrop(raw, ctx), source: 'gemini' };
      } catch (e) {
        return { result: offlineDrop(ctx), source: 'offline', error: e.message || String(e) };
      }
    },
    async finale(ctx, settings) {
      if (!online(settings)) return { result: offlineFinale(ctx), source: 'offline' };
      try {
        const raw = await callGemini(settings, finalePrompt(ctx));
        return { result: sanitizeFinale(raw, ctx), source: 'gemini' };
      } catch (e) {
        return { result: offlineFinale(ctx), source: 'offline', error: e.message || String(e) };
      }
    },
    miniEvent,
    async history(ctx, settings) {
      if (!online(settings)) return { result: offlineHistory(ctx), source: 'offline' };
      try {
        const raw = await callGemini(settings, historyPrompt(ctx));
        return { result: sanitizeHistory(raw, ctx), source: 'gemini' };
      } catch (e) {
        return { result: offlineHistory(ctx), source: 'offline', error: e.message || String(e) };
      }
    },
    async test(settings) {
      const raw = await callGemini(settings, '次のJSONをそのまま返してください: {"ok": true, "message": "WORDROP接続成功"}');
      return raw;
    },
  };
})();
