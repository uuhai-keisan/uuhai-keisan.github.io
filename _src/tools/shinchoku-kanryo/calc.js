// 開始日から今日までの進み具合(進捗率)のペースが続くとして、完了予定日を出す。
// 作業日は「土日を除く」か「毎日」。祝日・会社の休日は数えない。今日の分まで進んだ前提で、今日も経過日に含める。
globalThis.CALC = {
  compute(v, ctx) {
    if (!v.start) return { error: '開始日を選んでください。' };
    const p = v.progress;
    if (p == null || !(p > 0)) return { error: '今日時点の進捗率を0より大きい数で入れてください。' };
    if (p > 100) return { error: '進捗率は100%以下で入れてください。' };

    const DAY = 86400000;
    const t0 = Date.parse(v.start);
    const today = Date.parse(ctx.today);
    if (t0 > today) return { error: '開始日は今日以前の日付を選んでください。' };
    const workdaysOnly = v.days !== 'every';
    const counts = (t) => { const w = new Date(t).getUTCDay(); return !workdaysOnly || (w !== 0 && w !== 6); };
    const label = workdaysOnly ? '作業日(土日を除く)' : '日';

    let elapsed = 0;
    for (let t = t0; t <= today; t += DAY) if (counts(t)) elapsed++;
    if (elapsed < 1) return { error: '開始日から今日までに作業日がありません。' };
    if (p >= 100) {
      return { value: '完了済み', unit: '', label: 'このペースでの完了予定日', details: [['経過した' + label, `${elapsed}日`]], vars: { date: '完了済み', remain: 0 } };
    }

    const pace = p / elapsed;
    const remain = Math.ceil((100 - p) / pace - 1e-9);
    if (remain > 3650) return { error: 'このペースだと完了まで10年以上かかります。進捗率を見直してください。' };
    let t = today;
    for (let left = remain; left > 0;) { t += DAY; if (counts(t)) left--; }
    const d = new Date(t);
    const date = `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${'日月火水木金土'[d.getUTCDay()]})`;
    const r1 = (x) => Math.round(x * 10) / 10;
    const details = [
      ['経過した' + label, `${elapsed}日`],
      ['1日あたりの進み', `${r1(pace)}%`],
      ['残りの' + label, `${remain}日`],
    ];
    if (v.plan) {
      const plan = Date.parse(v.plan);
      let diff = 0;
      if (t > plan) { for (let x = plan + DAY; x <= t; x += DAY) if (counts(x)) diff++; details.push(['予定の完了日との差', `${diff}日遅れ`]); }
      else if (t < plan) { for (let x = t + DAY; x <= plan; x += DAY) if (counts(x)) diff++; details.push(['予定の完了日との差', `${diff}日早い`]); }
      else details.push(['予定の完了日との差', '予定どおり']);
    }
    return {
      value: date, unit: '', label: 'このペースでの完了予定日', details,
      note: workdaysOnly ? '祝日や会社の休日は数えていません。休みがあれば、その日数だけ後ろにずれます。' : '',
      vars: { date, remain },
    };
  },
};
