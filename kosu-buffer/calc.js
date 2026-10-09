// 工数見積もりにバッファを乗せ、実作業に使える時間から必要な営業日数と完了予定日を出す。
// 営業日は土日だけを除く(祝日・会社の休日は数えない)。
globalThis.CALC = {
  compute(v) {
    if (!(v.est > 0)) return { error: '見積もり工数(時間)を入れてください。' };
    if (!(v.hours > 0 && v.hours <= 24)) return { error: '1日の勤務時間は0より大きく24以下で入れてください。' };
    if (!(v.ratio > 0 && v.ratio <= 100)) return { error: '実作業に使える割合は1〜100%で入れてください。' };

    const r1 = (x) => Math.round(x * 10) / 10;
    const buffer = Number(v.buffer);
    const total = v.est * (1 + buffer / 100);
    const perDay = v.hours * v.ratio / 100;
    const days = Math.ceil(total / perDay - 1e-9);
    if (days > 2600) return { error: '必要な日数が10年分(2,600営業日)を超えています。工数を分けて計算してください。' };
    const details = [
      ['バッファ込みの工数', `${r1(total)}時間`],
      ['1日に実作業できる時間', `${r1(perDay)}時間`],
      ['必要な営業日数', `${days}日`],
    ];

    if (v.start) {
      const d = new Date(Date.parse(v.start));
      const isWorkday = () => d.getUTCDay() !== 0 && d.getUTCDay() !== 6;
      while (!isWorkday()) d.setUTCDate(d.getUTCDate() + 1);
      for (let left = days - 1; left > 0;) {
        d.setUTCDate(d.getUTCDate() + 1);
        if (isWorkday()) left--;
      }
      const wd = '日月火水木金土'[d.getUTCDay()];
      details.push(['完了予定日(土日を除く)', `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${wd})`]);
    }
    return {
      value: days,
      unit: '営業日',
      label: 'バッファ込みで必要な日数',
      details,
      note: '祝日や会社の休日は数えていません。期間中に休みがあれば、その日数だけ後ろにずれます。',
      vars: { total: r1(total), days, buffer },
    };
  },
};
