// 三点見積もり(PERT)。期待値 E = (楽観 + 4×最可能 + 悲観) ÷ 6、標準偏差 σ = (悲観 − 楽観) ÷ 6。
// 範囲は正規分布で近似した目安。楽観値〜悲観値の外には出さない。
globalThis.CALC = {
  compute(v) {
    const { o, m, p } = v;
    if (o == null || m == null || p == null) return { error: '3つの見積もりをすべて入れてください。' };
    if (o < 0) return { error: '見積もりは0以上の数を入れてください。' };
    if (!(o <= m && m <= p)) return { error: '楽観 ≦ 最も可能性が高い ≦ 悲観 の順になるように入れてください。' };
    if (o === p) return { error: '楽観と悲観が同じだと、ばらつきが計算できません。' };

    const r1 = (x) => Math.round(x * 10) / 10;
    const unit = v.unit || '時間';
    const e = (o + 4 * m + p) / 6;
    const sd = (p - o) / 6;
    const f1 = (x) => r1(x).toFixed(1);
    const range = (k) => `${f1(Math.max(o, e - k * sd))}〜${f1(Math.min(p, e + k * sd))}${unit}`;
    return {
      value: r1(e),
      unit,
      label: '三点見積もりの期待値',
      details: [
        ['標準偏差(ばらつき)', `${r1(sd)}${unit}`],
        ['約68%で収まる範囲', range(1)],
        ['約95%で収まる範囲', range(2)],
        ['余裕を持たせるなら(期待値+σ)', `${r1(e + sd)}${unit}`],
      ],
      note: '範囲は正規分布で近似した目安です。',
      vars: { e: r1(e), unit },
    };
  },
};
