// 相対揮発度 α が一定の2成分系の連続蒸留。最小理論段数(全還流、リボイラーを含む)はフェンスケの式
// Nmin = ln[(xD/(1 − xD))·((1 − xW)/xW)]/ln α。飽和液供給(q = 1)の最小還流比は、q線 x = zF と平衡線 y = αx/{1 + (α − 1)x} の交点 y* から
// Rmin = (xD − y*)/(y* − zF)。Underwood の根 θ は αzF/(α − θ) + (1 − zF)/(1 − θ) = 1 − q = 0(1 < θ < α)の解で、2成分系では θ = α/{1 + (α − 1)zF}。
// Rmin + 1 = αxD/(α − θ) + (1 − xD)/(1 − θ) は y* から求めた値と一致する(表示は Underwood の式の値)。
// 理論段数の目安は Gilliland 相関の Molokanov 近似 Y = 1 − exp[(1 + 54.4X)/(11 + 117.2X)·(X − 1)/√X]、X = (R − Rmin)/(R + 1)、Y = (N − Nmin)/(N + 1)
import { num, reader } from './eng.js';
const form = document.getElementById('ds-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
const val = reader(form);
const T = JSON.parse(form.dataset.text);
// 負の数は正しいマイナス記号で
const fmt = (x, d = 4) => num(x, d).replace('-', '−');


export function gilliland(x) {
  if (!(x > 0)) return 1;
  if (x >= 1) return 0;
  return 1 - Math.exp((1 + 54.4 * x) / (11 + 117.2 * x) * (x - 1) / Math.sqrt(x));
}

const KEYS = ['df', 'nmin', 'ystar', 'theta', 'rmin', 'r', 'vd', 'gx', 'n'];

function update() {
  const a = val('alpha'), xd = val('xd'), xw = val('xw'), zf = val('zf'), ratio = val('ratio');
  const err = !(a > 1) ? T.alpha : !(xw > 0 && xw < zf && zf < xd && xd < 1) ? T.order : !(ratio > 1) ? T.ratio : '';
  if (err) {
    KEYS.forEach(k => { out(k).textContent = '–'; });
    out('df').textContent = err;
    return;
  }
  const nmin = Math.log((xd / (1 - xd)) * ((1 - xw) / xw)) / Math.log(a);
  const ys = a * zf / (1 + (a - 1) * zf);
  const th = a / (1 + (a - 1) * zf);
  const rmin = a * xd / (a - th) + (1 - xd) / (1 - th) - 1;
  out('df').textContent = fmt((zf - xw) / (xd - xw));
  out('nmin').textContent = fmt(nmin);
  out('ystar').textContent = fmt(ys);
  out('theta').textContent = fmt(th);
  out('rmin').textContent = fmt(rmin);
  // 交点が xD より上なら Rmin < 0 で、還流比の下限は実質0(段数で決まる)。運転の欄は出さない
  if (!(rmin > 0)) {
    ['r', 'vd', 'gx', 'n'].forEach(k => { out(k).textContent = '–'; });
    out('r').textContent = T.neg;
    return;
  }
  const r = ratio * rmin;
  const gx = (r - rmin) / (r + 1);
  const gy = gilliland(gx);
  const n = (nmin + gy) / (1 - gy);
  out('r').textContent = fmt(r);
  out('vd').textContent = fmt(r + 1);
  out('gx').textContent = fmt(gx, 3);
  // R/Rmin が1にごく近いと Y が丸めで1になり N は無限大(最小還流比での段数)
  out('n').textContent = Number.isFinite(n) ? fmt(n, 3) : '∞';
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
