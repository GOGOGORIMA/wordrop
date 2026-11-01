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
      kw: ['残業', '有給', '休暇', '定時', '終身雇用', '年功序列', '確定申告', '法', '民主主義', '選挙', '議会', '憲法', '学校', '偏差値', '受験', '満員電車', 'リモート', 'テレワーク', '宅配', '断捨離', '二度寝', 'ふるさと納税', '株主優待', 'マイナンバー', '防犯カメラ', '監視', '警察', 'ルール', 'マナー', '制度', '義務', '給食', '年金'],
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
    10: ['{hook}にも{w}が持ち込まれ、{who}を驚かせた。', '{ruler}は{w}を{hook}に取り入れるよう命じた。', '{hook}の場に{w}が現れ、記録係が筆を止めた。'],
    50: ['{hook2}は{w}と融合し、史実とはまるで別の姿に変わった。', '本来の{hook2}は、{w}のせいで誰も知らない方向へ転がり始めた。', '{w}をめぐる争いが{hook2}のあり方を根底から揺るがした。'],
    200: ['いまや{place}の{hook3}は「{w}」抜きでは語れない。', '{hook3}の名は忘れられ、代わりに{w}が{place}の象徴となった。', '教科書の「{hook3}」の項は、{w}の話で上書きされた。'],
  };

  function fill(tpl, ctx) {
    const e = ctx.era;
    return tpl
      .replace(/\{w\}/g, ctx.word)
      .replace(/\{who\}/g, e.who)
      .replace(/\{ruler\}/g, e.ruler)
      .replace(/\{place\}/g, e.place)
      .replace(/\{hook\}/g, e.hooks[0])
      .replace(/\{hook2\}/g, e.hooks[1])
      .replace(/\{hook3\}/g, e.hooks[2]);
  }

  function offlineDrop(ctx) {
    const cat = classify(ctx.word);
    const C = CATS[cat];
    const r = rng(hashStr(ctx.word + '|' + ctx.era.id) ^ ((Math.random() * 1e6) | 0));
    const pick = (a) => a[(r() * a.length) | 0];
    const frac = [0.3, 0.3, 0.4];
    // 時代錯誤度：古い時代に現代語を落とすほど歪む
    const anachro = (3 - ctx.era.tier) * 3 + (ctx.era.year < 0 ? 2 : 0);
    const timeline = WD.STAGES.map((st, i) => {
      const delta = {};
      for (const p of WD.PARAMS) {
        let v = C.base[p.key] * frac[i] + (r() - 0.5) * 9;
        if (p.key === 'distortion') v = Math.max(0, v + anachro * frac[i]);
        delta[p.key] = Math.round(v);
      }
      const m = C.maps[i];
      const map = {
        add: (m.add || []).map(([type, count]) => ({ type, count: Math.max(1, count + (r() < 0.3 ? 1 : 0)) })),
        remove: (m.remove || []).map(([type, count]) => ({ type, count })),
        sky: m.sky || null, sea: m.sea || null, land: m.land || null, weather: m.weather || null,
      };
      // 時代のシンボルを使った連鎖（その時代ならではの建物が増える）
      if (i === 1 && ctx.era.symbols.length) map.add.push({ type: ctx.era.symbols[0][0], count: 1 });
      const text = fill(pick(C['t' + st.years]), ctx) + fill(pick(TWISTS[st.years]), ctx);
      return { label: st.label, year: ctx.era.year + st.years, text, delta, map };
    });
    return { title: fill(pick(C.titles), ctx), category: cat, timeline };
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

  function offlineFinale(ctx) {
    const words = ctx.history.map((h) => h.word);
    const desc = describe(ctx.params);
    const body = ctx.history.map((h) => {
      const era = h.era;
      return fmtYear(era.year) + '、' + era.name + 'の' + era.place + 'に「' + h.word + '」がもたらされた。これにより' + h.title + 'が起こり、' + h.timeline[2].text.replace(/。$/, '') + '。';
    }).join('') + 'こうして2026年の' + ctx.mode.place + 'は、' + desc + 'として知られている。なお、史実との違いについて質問すると先生は目をそらす。';
    return {
      title: ctx.mode.textbook + ' 2026年版',
      chapter: '第' + (3 + ctx.history.length) + '章　「' + words.join('」「') + '」と浮島の近現代',
      body,
      keywords: ctx.history.map((h) => h.title).concat([desc]),
      sns: '【WORDROP】' + ctx.history.map((h) => h.era.name + 'に「' + h.word + '」').join('、') + 'を投下したら、2026年は「' + desc + '」になった…！ #WORDROP #歴史改変',
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

  function dropPrompt(ctx) {
    const p = ctx.params;
    const e = ctx.era;
    const hist = ctx.history.length
      ? ctx.history.map((h, i) => '- ' + WD.TIERS[i].name + ' ' + h.era.name + '（' + h.era.yearLabel + '）に「' + h.word + '」→ ' + h.title + '：' + h.timeline[2].text).join('\n')
      : '- なし（最初の改変）';
    const st = WD.STAGES.map((s) => s.label + '=' + fmtYear(e.year + s.years) + (e.year + s.years > 2026 ? '（2026年より先の未来予言）' : '')).join(', ');
    return `あなたは歴史改変シミュレーションゲーム『WORDROP』のゲームマスターです。
プレイヤーは歴史のある時点に「単語」を1つ投下します。その単語（概念・モノ）がその時代に突然存在したら歴史がどう変わるかを、10年後・50年後・200年後の3段階で描写してください。

# 今回の時代（プレイヤーが3択から選んだ時代）
${eraBlock(e)}

# 浮島の状況
- 舞台は空に浮かぶ箱庭の島（ゲームモード: ${ctx.mode.name}）。過去の改変の影響は島に積み重なっている。
- 文明パラメータ(0〜100): 人口${p.population} / 技術${p.technology} / 秩序${p.order} / 歪み${p.distortion}
- これまでの改変（バタフライ・エフェクトの前提として必ず踏まえること）:
${hist}
- 投下された単語: 「${ctx.word}」
- 各段階の年: ${st}

# 描写のルール
- 必ず「この時代固有の要素」（${e.hooks.join('、')}）や実在の人物・出来事・地名（${e.ruler}、${e.place}など）と単語を化学反応させ、この時代でしか起きないバタフライ・エフェクトを描くこと。他の時代でも通用する一般論は禁止。
- 10年後→50年後→200年後と、前段階の出来事を受けて連鎖的に拡大していくこと。ユーモラスに、しかし史実の固有名詞はもっともらしく。
- text は各段階100文字以内の日本語。

# 数値・描画のルール
- 人口・技術・秩序のいずれかが0以下または100以上になると文明崩壊（ゲームオーバー）。単語と時代の性質に忠実に、遠慮なく大胆に増減させてよい。
- delta は各段階の増減値。population/technology/order は -25〜+25 の整数、distortion（時代錯誤による時空の歪み）は -10〜+25 の整数。時代にそぐわない単語ほど distortion を上げる。
- map は箱庭の島の見た目の変化。add/remove の type は次から選ぶ: ${typeList}。count は1〜3。この時代らしい建物を優先すること。
- sky は ${WD.SKIES.join('|')}、sea は ${WD.SEAS.join('|')}、land は ${WD.LANDS.join('|')}、weather は ${WD.WEATHERS.join('|')} から選ぶ。変化がなければ null。
- title はこの改変を象徴する歴史用語風の見出し（20文字以内）。

# 出力形式（このJSONのみを出力）
{
  "title": "プロテイン維新",
  "timeline": [
    {"label": "10年後", "text": "…", "delta": {"population": 5, "technology": 3, "order": -2, "distortion": 6},
     "map": {"add": [{"type": "market", "count": 1}], "remove": [], "sky": null, "sea": null, "land": null, "weather": null}},
    {"label": "50年後", "text": "…", "delta": {…}, "map": {…}},
    {"label": "200年後", "text": "…", "delta": {…}, "map": {…}}
  ]
}`;
  }

  function finalePrompt(ctx) {
    const p = ctx.params;
    const hist = ctx.history.map((h, i) => {
      return `- ${WD.TIERS[i].name}: ${h.era.name}（${h.era.sub}、${h.era.yearLabel}、${h.era.place}）に「${h.word}」を投下 →「${h.title}」: ${h.timeline.map((t) => t.label + ': ' + t.text).join(' / ')}`;
    }).join('\n');
    return `あなたは歴史改変シミュレーションゲーム『WORDROP』のゲームマスターです。
プレイヤーは「${ctx.mode.name}」で、プレイヤー自身が選んだ3つの時代に単語を投下し、文明を崩壊させずに2026年まで生き延びました。
改変された歴史の結果として、2026年の中学・高校の歴史教科書に載っている1ページを書いてください。3つの時代の改変が時空を越えて因果でつながっているように描くこと。

# 改変の記録
${hist}

# 2026年の文明パラメータ(0〜100)
人口${p.population} / 技術${p.technology} / 秩序${p.order} / 歪み${p.distortion}

# 出力形式（このJSONのみを出力）
{
  "title": "教科書名（例: ${ctx.mode.textbook} 2026年版）",
  "chapter": "章題（30文字以内）",
  "body": "教科書本文。真面目な教科書の文体で、改変の連鎖と2026年の姿を260文字程度で。最後にくすっと笑える一文を。",
  "keywords": ["重要語句を3〜5個"],
  "sns": "SNS投稿用の文章（120文字以内、選んだ時代と投下した3単語を含め、#WORDROP #歴史改変 のハッシュタグ付き）"
}`;
  }

  /* AI の応答を安全な形に整える */
  function sanitizeDrop(raw, ctx) {
    const fallback = offlineDrop(ctx);
    if (!raw || typeof raw !== 'object') return fallback;
    const tl = Array.isArray(raw.timeline) ? raw.timeline : [];
    const pickEnum = (v, list) => (typeof v === 'string' && list.includes(v) ? v : null);
    const items = (arr) => (Array.isArray(arr) ? arr : [])
      .filter((a) => a && TYPES.includes(a.type))
      .slice(0, 4)
      .map((a) => ({ type: a.type, count: clampInt(a.count || 1, 1, 3) }));
    return {
      title: String(raw.title || fallback.title).slice(0, 30),
      timeline: WD.STAGES.map((st, i) => {
        const s = tl[i] || {};
        const fb = fallback.timeline[i];
        const d = s.delta || {};
        const m = s.map || {};
        return {
          label: st.label,
          year: ctx.era.year + st.years,
          text: String(s.text || fb.text).slice(0, 160),
          delta: {
            population: clampInt(d.population, -25, 25),
            technology: clampInt(d.technology, -25, 25),
            order: clampInt(d.order, -25, 25),
            distortion: clampInt(d.distortion, -10, 25),
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
    async test(settings) {
      const raw = await callGemini(settings, '次のJSONをそのまま返してください: {"ok": true, "message": "WORDROP接続成功"}');
      return raw;
    },
  };
})();
