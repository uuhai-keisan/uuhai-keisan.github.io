// フレックスタイム制(清算期間1か月以内)で、清算期間の実労働時間のうち何時間が時間外労働になるか。
// 時間外労働 = 実労働時間 − 法定労働時間の総枠(厚生労働省のパンフレット)。
// 総枠 = 週の法定労働時間(40時間、特例措置対象事業場は44時間)× 暦日数 ÷ 7。
// 完全週休2日で労使協定がある場合は、所定労働日数 × 8時間を総枠にできる(同パンフレット)。
globalThis.CALC = {
  compute(v) {
    if (v.worked == null || !(v.worked >= 0)) return { error: '清算期間の実労働時間を入れてください(法定休日に働いた時間は除きます)。' };
    if (!(v.total > 0)) return { error: '会社が決めた清算期間の総労働時間を入れてください。' };
    const days = Number(v.days);
    let legal;
    let basis;
    if (v.rule === 'week5') {
      const wd = v.workdays;
      if (wd == null || !Number.isInteger(wd) || wd < 1 || wd > days) return { error: `所定労働日数を1〜${days}の整数で入れてください。` };
      legal = 8 * wd;
      basis = `8時間×所定労働日数${wd}日`;
    } else {
      const week = v.rule === 'tokurei' ? 44 : 40;
      legal = week * days / 7;
      basis = `${week}時間×暦日${days}日÷7`;
    }

    const hm = (h) => { const min = Math.round(h * 60); return `${Math.floor(min / 60)}時間${min % 60}分`; };
    const over = Math.max(0, v.worked - legal);
    const inner = Math.max(0, Math.min(v.worked, legal) - v.total);
    const short = Math.max(0, v.total - v.worked);
    const details = [
      ['法定労働時間の総枠', `${Math.round(legal * 10) / 10}時間(${basis})`],
      ['総労働時間を超えて総枠までの時間(法定内)', hm(inner)],
    ];
    if (short > 0) details.push(['総労働時間に足りない時間', hm(short)]);
    let note = '';
    if (v.total > legal) note = '会社の総労働時間が法定労働時間の総枠を超えています。設定を確認するか、会社に確認してください。';
    else if (over === 0 && inner > 0) note = '時間外労働にはなりませんが、会社の総労働時間は超えています。法定内の時間の賃金の扱いは会社の規程によります。';
    return {
      value: hm(over),
      unit: '',
      label: '時間外労働(法定労働時間の総枠を超えた時間)',
      details,
      note,
      vars: { over: hm(over) },
    };
  },
};
