// 複数の作業の三点見積もり(PERT)を合計する。
// 作業ごとに 期待値 E = (楽観 + 4×最可能 + 悲観) ÷ 6、標準偏差 σ = (悲観 − 楽観) ÷ 6。
// 合計の期待値 = Eの合計。合計の標準偏差 = √(σ²の合計)(作業どうしが独立と仮定)。
// 締め切りまでに終わる確率は、合計が正規分布に従うとみなした目安。
globalThis.CALC = {
  compute(v) {
    const unit = v.unit || '日';
    const tasks = [];
    for (let i = 1; i <= 5; i++) {
      const o = v[`t${i}o`], m = v[`t${i}m`], p = v[`t${i}p`];
      const filled = [o, m, p].filter((x) => x != null).length;
      if (filled === 0) continue;
      if (filled < 3) return { error: `作業${i}は、楽観・最可能・悲観の3つをすべて入れるか、すべて空欄にしてください。` };
      if (o < 0) return { error: `作業${i}: 見積もりは0以上の数を入れてください。` };
      if (!(o <= m && m <= p)) return { error: `作業${i}: 楽観 ≦ 最可能 ≦ 悲観 の順になるように入れてください。` };
      tasks.push({ o, m, p, e: (o + 4 * m + p) / 6, sd: (p - o) / 6 });
    }
    if (tasks.length === 0) return { error: '少なくとも1つの作業に、楽観・最可能・悲観を入れてください。' };

    const sum = (f) => tasks.reduce((a, t) => a + f(t), 0);
    const e = sum((t) => t.e);
    const sd = Math.sqrt(sum((t) => t.sd * t.sd));
    const lo = sum((t) => t.o), hi = sum((t) => t.p);
    const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
    const range = (k) => `${f1(Math.max(lo, e - k * sd))}〜${f1(Math.min(hi, e + k * sd))}${unit}`;
    const details = [
      ['作業の数', `${tasks.length}件`],
      ['合計の標準偏差(ばらつき)', `${f1(sd)}${unit}`],
      ['約68%で収まる範囲', range(1)],
      ['約95%で収まる範囲', range(2)],
      ['余裕を持たせるなら(期待値+σ、約84%)', `${f1(e + sd)}${unit}`],
      ['参考: 最可能値の単純合計', `${f1(sum((t) => t.m))}${unit}`],
    ];
    if (v.deadline != null) {
      if (v.deadline < 0) return { error: '締め切りまでの時間は0以上の数を入れてください。' };
      let prob;
      if (sd === 0) prob = v.deadline >= e ? 1 : 0;
      else {
        // 標準正規分布の累積分布(Abramowitz & Stegun 7.1.26 の erf 近似)
        const z = (v.deadline - e) / sd / Math.SQRT2;
        const t = 1 / (1 + 0.3275911 * Math.abs(z));
        const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
        prob = 0.5 * (1 + (z >= 0 ? y : -y));
      }
      const pct = prob * 100;
      const label = pct < 1 ? '1%未満' : pct > 99 ? '99%超' : `約${Math.round(pct)}%`;
      details.push([`${f1(v.deadline)}${unit}以内に終わる確率`, label]);
    }
    return {
      value: f1(e),
      unit,
      label: '合計の期待値',
      details,
      note: tasks.length < 3 ? '作業が少ないと、範囲や確率は正規分布の近似から外れやすくなります。参考程度にしてください。' : '範囲と確率は、作業どうしが独立で、合計が正規分布に近いとみなした目安です。',
      vars: { e: f1(e), unit, n: tasks.length },
    };
  },
};
