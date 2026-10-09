// 試験日から逆算する勉強ペース計算。compute(v, ctx) は純粋関数(ctx.today = 'YYYY-MM-DD')。
// 戻り値: { error } か { value, unit, label, details: [[項目, 値], ...], note?, vars: {共有文の差し込み} }
globalThis.CALC = {
  compute(v, ctx) {
    if (!v.exam) return { error: '試験日を選んでください。' };
    const days = Math.round((Date.parse(v.exam) - Date.parse(ctx.today)) / 86400000);
    if (!(days > 0)) return { error: '試験日は明日以降の日付を選んでください。' };
    if (!(v.total > 0)) return { error: '教材の総ページ数を入れてください。' };
    const done = v.done || 0;
    if (done < 0 || (v.review || 0) < 0) return { error: '終わったページ数と復習期間は0以上で入れてください。' };
    const rounds = Number(v.rounds || 1);
    if (done > v.total) return { error: '終わったページ数が総ページ数を超えています。' };
    if (done === v.total && rounds === 1) return { error: 'すでに全ページ終わっています。あとは復習だけです。' };

    const review = v.review || 0;
    const perWeek = Number(v.perweek);
    const studyDays = Math.floor((days - review) * perWeek / 7);
    if (studyDays < 1) return { error: '試験までの日数が足りず、新しく進める日が残りません。復習期間を短くするか、勉強する日数を増やしてください。' };

    // 2周目以降は教材全体をもう一度回す
    const left = (v.total - done) + v.total * (rounds - 1);
    const pace = Math.ceil(left / studyDays);
    return {
      value: pace,
      unit: 'ページ/日',
      label: '1日に進めるページ数',
      details: [
        ['試験までの日数', `${days}日`],
        ['新しく進める日数', `${studyDays}日`],
        ['残りページ数(周回込み)', `${left}ページ`],
        ['週あたりのページ数', `${pace * perWeek}ページ`],
      ],
      vars: { days, pace },
    };
  },
};
