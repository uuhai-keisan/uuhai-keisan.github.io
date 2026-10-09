// フレックスタイム制で、清算期間の総労働時間に届くには残りの出勤日に1日何時間働けばよいか。
// 参考として法定労働時間の総枠 = 40時間 × 清算期間の暦日数 ÷ 7 も出す(厚生労働省のパンフレットの式)。
globalThis.CALC = {
  compute(v) {
    if (!(v.total > 0)) return { error: '清算期間の総労働時間(会社が決めた時間)を入れてください。' };
    if (v.worked == null || v.worked < 0) return { error: 'ここまでの実労働時間を入れてください(0時間なら0)。' };
    const remain = v.remain;
    if (remain == null || remain < 0 || !Number.isInteger(remain)) return { error: '残りの出勤日数を0以上の整数で入れてください。' };

    const hm = (h) => { const min = Math.ceil(h * 60 - 1e-9); return `${Math.floor(min / 60)}時間${min % 60}分`; };
    const r1 = (x) => Math.round(x * 10) / 10;
    const legal = r1(40 * Number(v.days) / 7);
    const diff = v.total - v.worked;
    const legalRow = ['法定労働時間の総枠(参考)', `${legal}時間(暦日${v.days}日)`];

    if (diff <= 0) {
      return {
        value: '達成済み', unit: '', label: '残りの出勤日に必要な時間',
        details: [['総労働時間を超えた分', hm(-diff)], legalRow],
        note: 'すでに清算期間の総労働時間に届いています。',
        vars: { hm: '0時間0分' },
      };
    }
    if (remain === 0) return { error: `残りの出勤日が0日で、${hm(diff)}足りません。不足分の扱いは会社の規程を確認してください。` };

    const perDay = diff / remain;
    if (perDay > 24) return { error: `残りの出勤日数では届きません(1日あたり${hm(perDay)}必要です)。不足分の扱いは会社の規程を確認してください。` };
    return {
      value: hm(perDay),
      unit: '/日',
      label: '残りの出勤日に必要な時間',
      details: [['足りない時間の合計', hm(diff)], ['残りの出勤日数', `${remain}日`], legalRow],
      note: perDay > 10 ? '1日あたりの時間が長くなっています。残業の扱いや休憩時間もあわせて確認してください。' : '',
      vars: { hm: hm(perDay), remain },
    };
  },
};
