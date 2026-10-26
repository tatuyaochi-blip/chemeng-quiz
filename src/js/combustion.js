// 液体・固体燃料の完全燃焼の物質収支(燃料1 kgあたり、Nm³、1 kmol = 22.4 Nm³、空気は O₂ 21 vol%・N₂ 79 vol%)。
// c・h・s・o は質量分率。理論酸素量 O₀ = 22.4(c/12 + h/4 + s/32 − o/32)、理論空気量 A₀ = O₀/0.21、実際空気量 A = mA₀。
// 湿り排ガス: CO₂ 22.4c/12、H₂O 22.4h/2、SO₂ 22.4s/32、N₂ 0.79A、O₂ 0.21(m − 1)A₀(合計 G = mA₀ + 5.6h + 0.7o)。
// 乾き排ガス G′ = G − H₂O。O₂濃度からの空気比の近似 m ≈ 21/(21 − O₂)
import { num, reader } from './eng.js';
const form = document.getElementById('cb-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
const val = reader(form);
const T = JSON.parse(form.dataset.text);
// 負の数は正しいマイナス記号で
const fmt = (x, d = 4) => num(x, d).replace('-', '−');
const KEYS = ['o0', 'a0', 'a', 'g0', 'g', 'h2o', 'gd', 'co2', 'o2', 'so2', 'n2', 'co2max', 'mest'];

export function combustion(c, h, s, o, m) {
  const o0 = 22.4 * (c / 12 + h / 4 + s / 32 - o / 32);
  const a0 = o0 / 0.21, a = m * a0;
  const co2 = 22.4 * c / 12, h2o = 22.4 * h / 2, so2 = 22.4 * s / 32, n2 = 0.79 * a, o2 = 0.21 * (m - 1) * a0;
  const g = co2 + h2o + so2 + n2 + o2, gd = g - h2o;
  return { o0, a0, a, co2, h2o, so2, n2, o2, g, gd, g0: co2 + h2o + so2 + 0.79 * a0, co2max: co2 / (co2 + so2 + 0.79 * a0) };
}

function update() {
  // 負の組成は既定値に置き換えずにエラーにする(空欄は0として読む)
  const c = val('c'), h = val('h'), s = val('s'), o = val('o'), m = val('m');
  const r = combustion(c / 100, h / 100, s / 100, o / 100, m);
  const err = Math.min(c, h, s, o) < 0 ? T.neg : c + h + s + o > 100 + 1e-9 ? T.sum : !(r.o0 > 0) ? T.o0 : !(m >= 1) ? T.m : '';
  if (err) {
    KEYS.forEach(k => { out(k).textContent = '–'; });
    out('o0').textContent = err;
    return;
  }
  const v = x => `${fmt(x)} Nm³/kg`;
  const pc = x => `${fmt(100 * x, 3)} %`;
  out('o0').textContent = v(r.o0);
  out('a0').textContent = v(r.a0);
  out('a').textContent = v(r.a);
  out('g0').textContent = v(r.g0);
  out('g').textContent = v(r.g);
  out('h2o').textContent = pc(r.h2o / r.g);
  out('gd').textContent = v(r.gd);
  out('co2').textContent = pc(r.co2 / r.gd);
  out('o2').textContent = pc(r.o2 / r.gd);
  out('so2').textContent = `${fmt(1e6 * r.so2 / r.gd, 3)} ppm`;
  out('n2').textContent = pc(r.n2 / r.gd);
  out('co2max').textContent = pc(r.co2max);
  out('mest').textContent = fmt(21 / (21 - 100 * r.o2 / r.gd), 3);
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
