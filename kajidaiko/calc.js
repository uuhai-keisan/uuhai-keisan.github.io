// 家事代行の費用と、浮いた時間を自分の時給で換算した価値を比べる。
// 元が取れる時給 = 月の費用 ÷ 月に浮く時間。
globalThis.CALC = {
  compute(v) {
    if (!(v.price > 0)) return { error: '家事代行の1時間あたりの料金を入れてください。' };
    if (!(v.hours > 0)) return { error: '1回の利用時間を入れてください。' };
    if (!(v.self > 0)) return { error: '自分でやると何時間かかるかを入れてください。' };
    if (!(v.times >= 1) || !Number.isInteger(v.times)) return { error: '月の利用回数を1以上の整数で入れてください。' };
    if (!(v.wage > 0)) return { error: '自分の時給を入れてください。' };

    if ((v.extra || 0) < 0) return { error: '交通費などは0以上で入れてください。' };
    const yen = (x) => `${Math.round(x).toLocaleString('ja-JP')}円`;
    const cost = (v.price * v.hours + (v.extra || 0)) * v.times;
    const saved = v.self * v.times;
    const worth = saved * v.wage;
    const net = worth - cost;
    const breakeven = Math.ceil(cost / saved);
    return {
      value: breakeven, unit: '円/時', label: '元が取れる自分の時給(これ以上なら得)',
      details: [
        ['月の費用', yen(cost)],
        ['月に浮く時間', `${Math.round(saved * 10) / 10}時間`],
        [`浮いた時間の価値(時給${v.wage.toLocaleString('ja-JP')}円)`, yen(worth)],
        ['差し引き', net >= 0 ? `${yen(net)}得` : `${yen(-net)}持ち出し`],
      ],
      note: 'お金だけで比べた目安です。休める・家族と過ごせるといった、時間の使いみちの価値は含めていません。',
      vars: { breakeven: breakeven.toLocaleString('ja-JP') },
    };
  },
};
