// 在宅勤務がある人の、通勤定期と都度払い(乗るたびに運賃を払う)の月額比較。
// 1か月の出社日数 = 週の出社日数 × 52 ÷ 12(1か月を約4.33週として平均)。
globalThis.CALC = {
  compute(v) {
    if (!(v.fare > 0)) return { error: '片道の運賃を入れてください。' };
    if (!(v.teiki1 > 0)) return { error: '1か月定期の金額を入れてください。' };
    if (v.teiki6 != null && v.teiki6 !== 0 && !(v.teiki6 > 0)) return { error: '6か月定期の金額は0より大きい数で入れてください。' };

    const r1 = (x) => Math.round(x * 10) / 10;
    const yen = (x) => `${Math.round(x).toLocaleString('ja-JP')}円`;
    const perWeek = Number(v.perweek);
    const daysPerMonth = perWeek * 52 / 12;
    const tsudo = v.fare * 2 * daysPerMonth;
    const plans = [['1か月定期', v.teiki1]];
    if (v.teiki6 > 0) plans.push(['6か月定期(月割り)', v.teiki6 / 6]);
    const [bestName, best] = plans.reduce((a, b) => (b[1] < a[1] ? b : a));
    const breakeven = best / (v.fare * 2);
    const diff = Math.round(Math.abs(tsudo - best));

    const details = [
      ['1か月の出社日数', `${r1(daysPerMonth)}日`],
      ['都度払いの月額', yen(tsudo)],
      ...plans.map(([n, x]) => [n, yen(x)]),
      ['定期が得になる出社日数', breakeven > 5 * 52 / 12 ? '週5日出社でも都度払いが安い' : `月${r1(breakeven)}日(週${r1(breakeven * 12 / 52)}日)以上`],
    ];
    const tsudoWins = tsudo < best;
    return {
      value: diff === 0 ? 'ほぼ同じ' : `${tsudoWins ? '都度払い' : bestName}が月${diff.toLocaleString('ja-JP')}円安い`,
      unit: '', label: `週${perWeek}日出社の場合`, details,
      note: '運賃はICカードと切符で違うことがあります。通勤手当の支給方法は会社の規程を確認してください。',
      vars: { perweek: perWeek, winner: tsudoWins ? '都度払い' : '定期', diff: diff.toLocaleString('ja-JP') },
    };
  },
};
