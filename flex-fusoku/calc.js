// フレックスタイム制で総労働時間に足りなかった時間を、翌月に何時間まで繰り越せるか。
// 厚生労働省: 不足分を加えた翌月の総労働時間が法定労働時間の総枠の範囲内である限り、翌月に繰り越せる。
// 超過分は翌月に繰り越せず、その清算期間内で清算する(労働基準法第24条)。
// 総枠 = 週の法定労働時間(40時間、特例措置対象事業場は44時間)× 翌月の暦日数 ÷ 7。
globalThis.CALC = {
  compute(v) {
    if (!(v.total > 0)) return { error: '今月の総労働時間(会社が決めた時間)を入れてください。' };
    if (v.worked == null || !(v.worked >= 0)) return { error: '今月の実労働時間を入れてください。' };
    if (!(v.next_total > 0)) return { error: '翌月の総労働時間(会社が決めた時間)を入れてください。' };

    const fmt = (min) => `${Math.floor(min / 60)}時間${min % 60}分`;
    const days = Number(v.next_days);
    const week = v.rule === 'tokurei' ? 44 : 40;
    const legal = week * days / 7;
    const legalRow = ['翌月の法定労働時間の総枠', `${Math.round(legal * 10) / 10}時間(${week}時間×暦日${days}日÷7)`];

    const diffMin = Math.round((v.total - v.worked) * 60);
    if (diffMin <= 0) {
      return {
        value: '不足なし', unit: '', label: '翌月に繰り越せる不足時間',
        details: [['総労働時間を超えた時間', fmt(-diffMin)], legalRow],
        note: diffMin < 0 ? '総労働時間を超えた時間は翌月に繰り越せず、今月の賃金で清算されます(厚生労働省)。' : '',
        vars: { carry: '0時間0分' },
      };
    }
    // 繰り越した後の翌月の時間が総枠を超えないように、分単位で切り捨てる
    const roomMin = Math.max(0, Math.floor((legal - v.next_total) * 60 + 1e-9));
    const carryMin = Math.min(diffMin, roomMin);
    const cutMin = diffMin - carryMin;
    const details = [
      ['今月の不足時間', fmt(diffMin)],
      legalRow,
      ['繰り越した後の翌月の総労働時間', fmt(Math.round(v.next_total * 60) + carryMin)],
      ['繰り越せない時間', fmt(cutMin)],
    ];
    let note = '';
    if (v.next_total > legal) note = '翌月の総労働時間が法定労働時間の総枠を超えています。設定を確認するか、会社に確認してください。';
    else if (cutMin > 0) note = '繰り越せない時間は、今月の賃金からの控除などで清算されるのが一般的です。扱いは会社の規程を確認してください。';
    return {
      value: fmt(carryMin),
      unit: '',
      label: '翌月に繰り越せる不足時間(上限まで)',
      details,
      note,
      vars: { carry: fmt(carryMin) },
    };
  },
};
