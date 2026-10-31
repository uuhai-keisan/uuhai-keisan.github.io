// 家族の人数・1回に洗う食数・鍋も入れるかから、食洗機の容量(標準食器の点数)の目安を出す。
// 1回に洗う量は「人数×食数」の人分で数え、メーカーが日本電機工業会の自主基準で表示している人分に当てはめる:
// 18点=約3人分(パナソニック NP-TCR5)、24点=4人分(同 NP-TSK2)、40点=約5人分(同 NP-TZ500・三菱電機 EW-45R2B)、
// 44点=約6人用(三菱電機 EW-45MD1SU)。1人分の点数は機種で違う(6〜8点)ので、点数から人数は割り出さない。
// 鍋やフライパンは2人分として足す(NP-TSK2: 食器だけなら4人分、調理器具も入れると食器は2人分)。
const TIERS = [
  { key: 18, people: 3, name: '18点クラス', label: '18点クラス(約3人分・小型の据置型)' },
  { key: 24, people: 4, name: '24点クラス', label: '24点クラス(4人分・据置型)' },
  { key: 40, people: 5, name: '40点クラス', label: '40点クラス(約5人分)' },
  { key: 44, people: 6, name: '44点クラス', label: '44点クラス(約6人分・深型のビルトインなど)' },
];
const POTS = 2;

globalThis.CALC = {
  compute(v) {
    const people = v.people;
    if (!(people >= 1 && people <= 10) || !Number.isInteger(people)) return { error: '人数は1〜10人の整数で入れてください。' };
    const meals = Number(v.meals);
    if (!(meals > 0)) return { error: '1回に洗う量を選んでください。' };
    const pots = v.pots === 'yes';

    const dishes = people * meals;
    const need = dishes + (pots ? POTS : 0);
    const details = [['1回に洗う食器', `${dishes}人分`]];
    if (pots) details.push(['鍋やフライパンの分', `${POTS}人分として足す(合計${need}人分)`]);

    const t = TIERS.find((x) => need <= x.people);
    if (!t) {
      const times = Math.ceil(need / 6);
      details.push(['約6人分(44点)の機種なら', `${times}回に分けて洗う`]);
      return {
        value: `44点でも${times}回に分ける`, unit: '', label: '合う食洗機の容量の目安', details,
        note: `約6人用(44点)の機種でも、1回では入りきらない量です。1回に洗う食数を減らすか、${pots ? '鍋やフライパンは手で洗うか、' : ''}何回かに分けて洗います。`,
        vars: { size: 44, result: `44点クラスで${times}回に分ける量` },
      };
    }
    let note = '人分は、大きさの決まった「標準食器」で数えたメーカーの表示です。大皿や深い器が多い家庭は、ひとつ大きいクラスも候補です。';
    if (pots) note = `鍋やフライパンは標準食器の点数に入っていないので、2人分の場所をとるとして足しています(パナソニックのNP-TSK2の表示から)。${t.key === 44 ? '鍋も入れるなら、庫内が深いディープタイプ(深型)が向きます。' : ''}`;
    else if (need === t.people) note = `${t.name}でちょうどいっぱいの量です。来客や大皿が多い日があるなら、ひとつ大きいクラスも候補です。`;
    if (t.key <= 24) details.push(['置き方', 'キッチンの上に置く据置型が中心']);
    details.push(['目安のクラス', t.label]);
    return { value: t.name, unit: '', label: '合う食洗機の容量の目安', details, note, vars: { size: t.key, result: t.name } };
  },
};
