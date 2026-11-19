// SES(準委任)の精算幅。実稼働時間が上限を超えたら超過分を足し、下限を下回ったら不足分を引く。
// 上下割: 超過単価 = 月額単価 ÷ 上限時間、控除単価 = 月額単価 ÷ 下限時間。
// 中間割: 超過単価 = 控除単価 = 月額単価 ÷ ((上限 + 下限) ÷ 2)。
// 時間単価と精算額は1円未満を切り捨てる(端数処理は契約によって違う)。
globalThis.CALC = {
  compute(v) {
    if (!(v.price > 0)) return { error: '月額単価を入れてください。' };
    if (!(v.lower > 0) || !(v.upper > 0)) return { error: '精算幅の下限と上限を入れてください。' };
    if (!(v.lower < v.upper)) return { error: '精算幅は「下限 < 上限」になるように入れてください。' };
    if (v.worked == null || !(v.worked >= 0)) return { error: '実稼働時間を入れてください。' };

    const yen = (x) => `${Math.round(x).toLocaleString('ja-JP')}円`;
    const mid = (v.lower + v.upper) / 2;
    const overRate = Math.floor(v.price / (v.method === 'chukan' ? mid : v.upper));
    const shortRate = Math.floor(v.price / (v.method === 'chukan' ? mid : v.lower));
    const hrs = (h) => `${Math.round(h * 100) / 100}時間`;
    const rates = [['超過単価(1時間)', yen(overRate)], ['控除単価(1時間)', yen(shortRate)]];

    let total = v.price;
    let details;
    let label;
    if (v.worked > v.upper) {
      const h = v.worked - v.upper;
      const add = Math.floor(h * overRate);
      total += add;
      label = '請求額(超過あり)';
      details = [['超過時間', hrs(h)], ['超過精算額', `+${yen(add)}`], ...rates];
    } else if (v.worked < v.lower) {
      const h = v.lower - v.worked;
      const sub = Math.floor(h * shortRate);
      total -= sub;
      label = '請求額(控除あり)';
      details = [['不足時間', hrs(h)], ['控除額', `−${yen(sub)}`], ...rates];
    } else {
      label = '請求額(精算幅の中)';
      details = [['精算', `なし(${v.lower}〜${v.upper}時間の中)`], ...rates];
    }
    return {
      value: Math.round(total).toLocaleString('ja-JP'),
      unit: '円',
      label,
      details,
      note: '時間単価と精算額は1円未満を切り捨てています。端数の処理や、何分単位で数えるかは契約を確認してください。',
      vars: { total: yen(total) },
    };
  },
};
