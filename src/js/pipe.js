// 円管の圧力損失。流速 u = Q/(πD²/4)、レイノルズ数 Re = ρuD/μ、
// 摩擦係数 f(ダルシー): 層流(Re < 2300)は 64/Re、乱流はスワミー・ジャイン式 0.25/[log10(ε/(3.7D) + 5.74/Re^0.9)]²、
// 損失 ΔP = f(L/D)(ρu²/2)、損失水頭 hL = ΔP/(ρg)、必要な動力 = ΔP·Q
import { num, si, reader } from './eng.js';
import { pipe } from './calc.js';
const form = document.getElementById('pp-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
const val = reader(form);
const T = JSON.parse(form.dataset.text);

function update() {
  const q = val('q', 0) / 3600, d = val('d', 1e-6) / 1000, L = val('l', 0), rho = val('rho', 1e-6), mu = val('mu', 1e-9) / 1000, eps = val('eps', 0) / 1000;
  const { u, re, f, dp, hl, power } = pipe({ q, d, L, rho, mu, eps });
  out('u').textContent = `${num(u, 4)} m/s`;
  out('re').textContent = num(re, 4);
  out('regime').textContent = re < 2300 ? T.laminar : re < 4000 ? T.transition : T.turbulent;
  out('f').textContent = num(f, 4);
  out('dp').textContent = si(dp, 'Pa', 4);
  out('hl').textContent = `${num(hl, 4)} m`;
  out('power').textContent = si(power, 'W', 4);
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
