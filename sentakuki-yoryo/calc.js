// 家族の人数と洗う間隔から、洗濯機の洗濯容量の目安を出す。
// 1人1日あたりの洗濯物は約1.5kg(日本電機工業会の自主基準をもとにしたメーカーの目安)。
const SIZES = [4.5, 5, 6, 7, 8, 9, 10, 11, 12, 13];

globalThis.CALC = {
  compute(v) {
    const people = v.people;
    if (!(people >= 1 && people <= 10) || !Number.isInteger(people)) return { error: '人数は1〜10人の整数で入れてください。' };

    const r1 = (x) => Math.round(x * 10) / 10;
    const interval = Number(v.interval);
    const margin = Number(v.margin);
    const load = 1.5 * people * interval;
    const need = r1(load + margin);
    const size = SIZES.find((s) => s >= need - 1e-9);
    const details = [
      ['1回に洗う量の目安', `${r1(load)}kg(1.5kg×${people}人×${interval}日分)`],
      ['シーツなどの余裕', `${margin}kg`],
      ['必要な容量', `${need}kg`],
    ];

    if (!size) {
      const times = Math.ceil(need / 13);
      details.push(['13kgの洗濯機なら', `1回分を${times}回に分けて洗う`]);
      return {
        value: '13kgでも不足', unit: '', label: 'おすすめの洗濯容量', details,
        note: '一般的な家庭用の最大クラスでも1回では洗いきれない量です。洗う間隔を短くすると容量を抑えられます。',
        vars: { size: 13, people },
      };
    }
    return {
      value: size,
      unit: 'kg以上',
      label: 'おすすめの洗濯容量',
      details,
      note: '乾燥まで使う場合は、乾燥容量(洗濯容量より小さいことが多い)も確認してください。',
      vars: { size, people },
    };
  },
};
