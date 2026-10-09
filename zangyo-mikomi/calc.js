// 今月の残業時間を、ここまでのペースで月末まで続けた場合の見込みと、上限の目安に収めるための1日あたりの残業時間。
globalThis.CALC = {
  compute(v) {
    if (v.ot == null || v.ot < 0) return { error: '今月ここまでの残業時間を入れてください(0時間なら0)。' };
    if (!(v.passed >= 1) || !Number.isInteger(v.passed)) return { error: 'ここまでの出勤日数を1以上の整数で入れてください。' };
    if (!(v.total >= v.passed) || !Number.isInteger(v.total)) return { error: '今月の出勤日数(合計)は、ここまでの出勤日数以上の整数で入れてください。' };
    if (!(v.limit > 0)) return { error: '上限の目安を入れてください。' };

    const r1 = (x) => Math.round(x * 10) / 10;
    const hm = (h) => { const min = Math.round(h * 60); return `${Math.floor(min / 60)}時間${min % 60}分`; };
    // 上限内に収める時間は、そのとおりにしても上限を超えないよう分単位で切り捨てる
    const hmFloor = (h) => { const min = Math.floor(h * 60 + 1e-9); return `${Math.floor(min / 60)}時間${min % 60}分`; };
    const pace = v.ot / v.passed;
    const forecast = r1(pace * v.total);
    const remainDays = v.total - v.passed;
    const room = v.limit - v.ot;

    let allow;
    if (room < 0) allow = '残業なしでも上限の目安を超えています';
    else if (room === 0) allow = '上限に達しています(残りは残業なし)';
    else if (remainDays === 0) allow = '残りの出勤日はありません';
    else allow = hmFloor(room / remainDays);

    const over = r1(forecast - v.limit);
    return {
      value: forecast,
      unit: '時間',
      label: 'このペースでの月末の残業時間',
      details: [
        ['1日あたりの残業ペース', hm(pace)],
        [`上限の目安(${v.limit}時間)まで残り`, room > 0 ? `${r1(room)}時間` : '0時間'],
        ['上限内に収める1日あたりの残業', allow],
      ],
      note: over > 0 ? `このペースだと、上限の目安を約${over}時間超えます。` : '',
      vars: { forecast, limit: v.limit },
    };
  },
};
