// 業務効率化で減らせる時間を、年間の時間と人件費(1時間あたりの金額)に換算する。
globalThis.CALC = {
  compute(v) {
    if (!(v.minutes > 0)) return { error: '1回あたりに減らせる時間(分)を入れてください。' };
    if (!(v.times >= 1)) return { error: '回数を1以上で入れてください。' };
    if (!(v.people >= 1) || !Number.isInteger(v.people)) return { error: '人数を1以上の整数で入れてください。' };
    if (!(v.wage > 0)) return { error: '1時間あたりの人件費を入れてください。' };
    if (v.freq === 'day' && !(v.workdays >= 1 && v.workdays <= 366)) return { error: '年間の勤務日数を1〜366で入れてください。' };

    if ((v.cost || 0) < 0) return { error: 'ツールの月額費用は0以上で入れてください。' };
    const perYear = { day: v.workdays, week: 52, month: 12 }[v.freq];
    const hours = v.minutes * v.times * perYear * v.people / 60;
    const amount = Math.round(hours * v.wage);
    const r1 = (x) => Math.round(x * 10) / 10;
    const yen = (x) => `${Math.round(x).toLocaleString('ja-JP')}円`;
    const details = [
      ['年間で減らせる時間', `${r1(hours).toLocaleString('ja-JP')}時間`],
      ['1か月あたり', `${r1(hours / 12).toLocaleString('ja-JP')}時間・${yen(amount / 12)}`],
    ];
    const cost = v.cost || 0;
    if (cost > 0) {
      details.push(['ツール代(年間)を引くと', yen(amount - cost * 12)]);
      details.push(['月額費用と月の効果', amount / 12 >= cost ? '効果のほうが大きい' : '費用のほうが大きい']);
    }
    return {
      value: amount, unit: '円/年', label: '年間の金額換算(人件費ベース)', details,
      vars: { hours: r1(hours), amount: amount.toLocaleString('ja-JP') },
    };
  },
};
