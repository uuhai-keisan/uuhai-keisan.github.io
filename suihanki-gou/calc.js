// 家族の人数・1食のごはんの量・1回に炊く食数から、炊飯器の炊飯容量(何合炊き)の目安を出す。
// お茶碗1杯=0.5合(パナソニック「炊飯器の選び方」の目安)。
// 3合炊きは2.5合までとする(パナソニック: 同じ3合を炊くなら5・5.5合炊きの方がおいしく炊き上がる)。
const RICE_NOTE = '最大炊飯量は白米の場合です。炊き込みごはんやおかゆは、炊ける量が少なくなります(機種の仕様表で確認してください)。';

globalThis.CALC = {
  compute(v) {
    const people = v.people;
    if (!(people >= 1 && people <= 10) || !Number.isInteger(people)) return { error: '人数は1〜10人の整数で入れてください。' };
    const bowls = Number(v.bowls);
    const meals = Number(v.meals);
    if (!(bowls > 0) || !(meals > 0)) return { error: 'ごはんの量と炊く量を選んでください。' };

    const r1 = (x) => Math.round(x * 10) / 10;
    const need = r1(0.5 * bowls * people * meals);
    const details = [
      ['1回に炊く量', `${need}合`],
      ['お茶碗にすると', `${r1(bowls * people * meals)}杯分(1杯=0.5合)`],
    ];

    if (need > 10 + 1e-9) {
      const times = Math.ceil(need / 10);
      details.push(['1升炊きなら', `${times}回に分けて炊く`]);
      return {
        value: '1升でも足りない', unit: '', label: '合う炊飯容量', details,
        note: `家庭用で一般的な最大の1升炊きでも、1回では炊ききれない量です。1回に炊く食数を減らすと容量を抑えられます。${RICE_NOTE}`,
        vars: { size: 10, result: '1升でも足りない量' },
      };
    }
    const size = need <= 2.5 + 1e-9 ? 3 : need <= 5.5 + 1e-9 ? 5.5 : 10;
    let note = RICE_NOTE;
    if (size === 5.5 && need <= 3 + 1e-9) note = '3合炊きでも炊ける量ですが、パナソニックは同じ3合を炊く場合でも5・5.5合炊きの方が対流を起こしやすく、おいしく炊き上がるとしているので、5.5合炊きを目安にしています。置き場所が狭いなら3合炊きも候補です。';
    else if (size === 3 && need > 2 + 1e-9) note = '3合炊きでいっぱいに近い量です。これより多く炊く日があるなら、5・5.5合炊きも候補です。';
    const name = size === 10 ? '1升' : `${size}合`;
    return {
      value: size === 10 ? '1升' : size,
      unit: size === 10 ? '炊き' : '合炊き',
      label: '合う炊飯容量の目安',
      details,
      note,
      vars: { size, result: `${name}炊き` },
    };
  },
};
