// 円管の圧力損失。流速 u = Q/(πD²/4)、レイノルズ数 Re = ρuD/μ、
// 摩擦係数 f(ダルシー): 層流(Re < 2300)は 64/Re、乱流はスワミー・ジャイン式 0.25/[log10(ε/(3.7D) + 5.74/Re^0.9)]²、
// 損失 ΔP = f(L/D)(ρu²/2)、損失水頭 hL = ΔP/(ρg)、必要な動力 = ΔP·Q
import { num, si, reader } from './eng.js';
const form = document.getElementById('pp-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
const val = reader(form);
const T = JSON.parse(form.dataset.text);

export function friction(re, rel) {
  if (re < 2300) return 64 / re;
  return 0.25 / Math.log10(rel / 3.7 + 5.74 / re ** 0.9) ** 2;
}

function update() {
  const q = val('q', 0) / 3600, d = val('d', 1e-6) / 1000, L = val('l', 0), rho = val('rho', 1e-6), mu = val('mu', 1e-9) / 1000, eps = val('eps', 0) / 1000;
  const u = q / (Math.PI * d * d / 4);
  const re = rho * u * d / mu;
  const f = friction(re, eps / d);
  const dp = f * (L / d) * rho * u * u / 2;
  out('u').textContent = `${num(u, 4)} m/s`;
  out('re').textContent = num(re, 4);
  out('regime').textContent = re < 2300 ? T.laminar : re < 4000 ? T.transition : T.turbulent;
  out('f').textContent = num(f, 4);
  out('dp').textContent = si(dp, 'Pa', 4);
  out('hl').textContent = `${num(dp / (rho * 9.81), 4)} m`;
  out('power').textContent = si(dp * q, 'W', 4);
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
