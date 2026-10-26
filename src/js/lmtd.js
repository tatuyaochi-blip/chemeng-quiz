// 熱交換器の対数平均温度差。向流: ΔT1 = Th,in − Tc,out、ΔT2 = Th,out − Tc,in。並流: ΔT1 = Th,in − Tc,in、ΔT2 = Th,out − Tc,out。
// LMTD = (ΔT1 − ΔT2)/ln(ΔT1/ΔT2)(ΔT1 = ΔT2 のときはその値)。伝熱面積 A = Q/(U·LMTD)
import { num, reader } from './eng.js';
const form = document.getElementById('lm-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
const val = reader(form);
const T = JSON.parse(form.dataset.text);

export function lmtd(d1, d2) {
  if (d1 <= 0 || d2 <= 0) return NaN;
  return Math.abs(d1 - d2) < 1e-9 ? d1 : (d1 - d2) / Math.log(d1 / d2);
}

function update() {
  const hi = val('hin'), ho = val('hout'), ci = val('cin'), co = val('cout'), U = val('u', 1e-9), Q = val('q', 0) * 1000;
  const counter = form.elements.flow.value === 'counter';
  const d1 = counter ? hi - co : hi - ci, d2 = counter ? ho - ci : ho - co;
  const L = lmtd(d1, d2);
  out('d1').textContent = `${num(d1, 4)} K`;
  out('d2').textContent = `${num(d2, 4)} K`;
  out('lmtd').textContent = Number.isFinite(L) ? `${num(L, 4)} K` : T.cross;
  out('area').textContent = Number.isFinite(L) ? `${num(Q / (U * L), 4)} m²` : '–';
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
