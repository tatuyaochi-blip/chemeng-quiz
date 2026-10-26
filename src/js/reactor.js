// 1次反応(−rA = k·CA)の定常反応器。CSTR: τ = X/(k(1 − X))、PFR(と回分反応器の反応時間): τ = −ln(1 − X)/k。
// 反応器の体積 V = τ·v0。速度定数は温度でアレニウス式 k = k_ref·exp(−Ea/R·(1/T − 1/T_ref)) により補正する
import { num, reader } from './eng.js';
const form = document.getElementById('rx-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
const val = reader(form);
const R = 8.314;
const time = s => (s >= 3600 ? `${num(s / 3600, 4)} h` : s >= 60 ? `${num(s / 60, 4)} min` : `${num(s, 4)} s`);

function update() {
  const kref = val('k', 1e-12) / 60, tref = val('tref') + 273.15, ea = val('ea', 0) * 1000, t = val('t') + 273.15;
  const x = Math.min(val('x', 0) / 100, 0.999999), v0 = val('v0', 0) / 60; // L/min → L/s
  const k = kref * Math.exp(-ea / R * (1 / t - 1 / tref));
  const tc = x / (k * (1 - x)), tp = -Math.log(1 - x) / k;
  out('kt').textContent = `${num(k * 60, 4)} /min`;
  out('tau-c').textContent = time(tc);
  out('v-c').textContent = `${num(tc * v0, 4)} L`;
  out('tau-p').textContent = time(tp);
  out('v-p').textContent = `${num(tp * v0, 4)} L`;
  out('ratio').textContent = `${num(tc / tp, 4)}`;
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
