// 時間単位の年次有給休暇(時間単位年休)の残りを「日数+時間数」で出す。
// 厚生労働省: 1日分の時間数は所定労働時間をもとに決め、1時間に満たない端数は切り上げる(7時間30分→8時間)。
// 時間単位で取れるのは年5日以内(前年度からの繰越分を含めて5日以内)で、日数は労使協定で決める。
// 残りは「日数+時間数」で管理し、時間を取ると1日分を時間に崩して引く(厚生労働省の例: 20日から3時間→19日と5時間)。
globalThis.CALC = {
  compute(v) {
    const sh = v.shotei_h, sm = v.shotei_m == null ? 0 : v.shotei_m;
    const isInt = (x) => Number.isInteger(x) && x >= 0;
    if (sh == null || !isInt(sh) || !isInt(sm) || sm > 59) return { error: '1日の所定労働時間を、時間と分の整数で入れてください(7時間30分なら7と30)。' };
    if (sh * 60 + sm === 0 || sh * 60 + sm > 24 * 60) return { error: '1日の所定労働時間は0より大きく、24時間以下で入れてください。' };
    if (v.days == null || !isInt(v.days)) return { error: '今の残りの日数を、0以上の整数で入れてください。半日の残りは、時間の欄に時間で足してください。' };
    if (v.days > 100) return { error: '今の残りの日数が100日を超えています。入力を確かめてください。' };
    const hours = v.hours == null ? 0 : v.hours;
    const used = v.used == null ? 0 : v.used;
    const take = v.take == null ? 0 : v.take;
    for (const [x, name] of [[hours, '今の残りの時間'], [used, 'この1年に時間単位で取った時間'], [take, 'これから取る時間']]) {
      if (!isInt(x)) return { error: `${name}は、0以上の整数(時間)で入れてください。` };
    }
    const limitDays = Number(v.limit);
    if (![1, 2, 3, 4, 5].includes(limitDays)) return { error: '時間単位で取れる日数を、年1〜5日から選んでください。' };

    const H = Math.ceil((sh * 60 + sm) / 60); // 1日分の時間数(端数は切り上げ)
    const cap = limitDays * H; // 時間単位で取れる1年の時間数
    const nowTotal = v.days * H + hours;
    const dh = (t) => {
      const d = Math.floor(t / H), h = t % H;
      if (d && h) return `${d}日と${h}時間`;
      if (d) return `${d}日`;
      return `${h}時間`;
    };
    const shotei = sm ? `${sh}時間${sm}分` : `${sh}時間`;

    if (take > nowTotal) return { error: `有給の残り(${nowTotal >= H ? dh(nowTotal) + '、' : ''}${nowTotal}時間)より多い時間は取れません。` };

    const after = nowTotal - take;
    const left = cap - used - take; // 時間単位の枠の残り(マイナス=超えている)
    const room = Math.max(0, Math.min(left, after));
    const details = [
      ['1日分の時間数', H * 60 === sh * 60 + sm ? `${H}時間` : `${H}時間(${shotei}を切り上げ)`],
    ];
    if (take > 0) details.push(['今の残り', `${dh(nowTotal)}(${nowTotal}時間)`]);
    details.push(
      ['時間単位でこの1年にあと取れる時間', `${room}時間(年${cap}時間のうち${Math.min(used + take, cap)}時間を使用)`],
    );
    if (room > 0) details.push(['それを日数にすると', dh(room)]);

    const notes = [];
    if (hours >= H) notes.push(`残りの時間が1日分(${H}時間)以上だったので、日数に繰り上げて表示しています。`);
    if (left < 0) notes.push(`時間単位で取れるのは年${cap}時間(${limitDays}日×${H}時間)までなので、${-left}時間が枠を超えています。超える分は1日単位か半日単位で取ることになります。`);
    else if (left === 0 && after % H > 0) notes.push(`時間単位の枠を使い切り、1日に満たない${after % H}時間が残ります。この扱い(翌年に繰り越す、1日に切り上げる等)は会社の規程を確認してください。`);
    else if (left === 0) notes.push('この1年の時間単位の枠は使い切りました。');
    else if (after === 0) notes.push('有給の残りがなくなります。');
    else if (room < left) notes.push('時間単位の枠より、有給の残りのほうが少なくなっています。');
    return {
      value: dh(after),
      unit: '',
      label: take > 0 ? `${take}時間取った後の残り` : '今の残り',
      details,
      note: notes.join(''),
      vars: { left: dh(after) },
    };
  },
};
