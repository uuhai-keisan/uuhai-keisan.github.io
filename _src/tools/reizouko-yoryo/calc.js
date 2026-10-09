// 家族の人数から冷蔵庫の容量の目安を出す。
// 式はシャープのサポートページ: 容量 = 70L × 人数 + 常備品(100〜150L) + 予備スペース70L。
globalThis.CALC = {
  compute(v) {
    const n = v.people;
    if (!(n >= 1 && n <= 10) || !Number.isInteger(n)) return { error: '人数は1〜10人の整数で入れてください。' };
    const stock = Number(v.stock);
    const extra = Number(v.extra || 0);
    const base = 70 * n + stock + 70;
    const need = base + extra;
    return {
      value: need, unit: 'L以上', label: '冷蔵庫の容量の目安',
      details: [
        ['人数分', `${70 * n}L(70L×${n}人)`],
        ['常備品', `${stock}L`],
        ['予備スペース', '70L'],
        ...(extra ? [['設置場所に余裕がある分', `${extra}L`]] : []),
        [`シャープの式での${n}人の幅`, `${70 * n + 170}〜${70 * n + 220}L`],
      ],
      note: '容量は「定格内容積」の目安です。設置場所の幅・奥行き・搬入経路も確認してください。',
      vars: { need, people: n },
    };
  },
};
