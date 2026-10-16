// 部屋の広さ(畳)から、LEDシーリングライトの明るさ(lm)の目安と、ダウンライトで同じ明るさにする台数の目安を出す。
// 畳数ランクと光束は日本照明工業会ガイドA121-2014「住宅用カタログにおける適用畳数表示基準」の表(三菱電機の掲載による)。
const RANKS = [
  ['〜4.5畳', 4.5, 2700, '2,200〜3,199lm'],
  ['〜6畳', 6, 3200, '2,700〜3,699lm'],
  ['〜8畳', 8, 3800, '3,300〜4,299lm'],
  ['〜10畳', 10, 4400, '3,900〜4,899lm'],
  ['〜12畳', 12, 5000, '4,500〜5,499lm'],
  ['〜14畳', 14, 5600, '5,100〜6,099lm'],
];

globalThis.CALC = {
  compute(v) {
    const size = Number(v.tatami);
    let i = RANKS.findIndex((r) => r[1] >= size);
    if (i < 0) return { error: '14畳までの部屋に対応しています。' };
    let note = '';
    if (v.bright === 'up') {
      if (i < RANKS.length - 1) i++;
      else note = '14畳より上のランクはないため、14畳のランクで計算しています。';
    }
    if (!(v.per > 0)) return { error: 'ダウンライト1台の明るさ(lm)を入れてください。' };

    const [name, rank, std, range] = RANKS[i];
    const count = Math.ceil(std / v.per - 1e-9);
    return {
      value: std, unit: 'lm', label: 'シーリングライトの明るさの目安(標準定格光束)',
      details: [
        ['適用畳数のランク', name],
        ['このランクの明るさの範囲', range],
        ['ダウンライトの台数の目安', `${count}台`],
      ],
      note: note || 'ダウンライトの台数は明るさの合計だけで出した目安です。配置や天井の高さで明るさの感じ方は変わります。',
      // rank: 楽天の紹介リンクの段階(1ランク明るくしたときは上のランクの畳数)
      vars: { tatami: size, rank, lm: std.toLocaleString('ja-JP') },
    };
  },
};
