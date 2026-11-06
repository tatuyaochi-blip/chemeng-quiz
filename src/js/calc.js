// 計算ツールの計算部分(画面に触れない純粋な関数)。ページのスクリプトと tools/test-calc.js の両方がここを使う。
// 単位はすべて SI(m、s、Pa、K、m³/s など)。ページ側で入力の単位を変換してから渡す。

// 円管の摩擦係数(ダルシー)。層流(Re < 2300)は 64/Re、それ以外はスワミー・ジャイン式 0.25/[log10(ε/(3.7D) + 5.74/Re^0.9)]²
export function friction(re, rel) {
  if (re < 2300) return 64 / re;
  return 0.25 / Math.log10(rel / 3.7 + 5.74 / re ** 0.9) ** 2;
}

// 円管の圧力損失。q 体積流量 [m³/s]、d 内径 [m]、L 長さ [m]、rho 密度 [kg/m³]、mu 粘度 [Pa·s]、eps 粗さ [m]
// u = q/(πD²/4)、Re = ρuD/μ、ΔP = f(L/D)(ρu²/2)、損失水頭 hL = ΔP/(ρg)、動力 = ΔP·q
export function pipe({ q, d, L, rho, mu, eps }) {
  const u = q / (Math.PI * d * d / 4);
  const re = rho * u * d / mu;
  const f = friction(re, eps / d);
  const dp = f * (L / d) * rho * u * u / 2;
  return { u, re, f, dp, hl: dp / (rho * 9.81), power: dp * q };
}

// 対数平均温度差(ΔT1 = ΔT2 のときはその値、どちらかが0以下なら NaN)
export function lmtd(d1, d2) {
  if (d1 <= 0 || d2 <= 0) return NaN;
  return Math.abs(d1 - d2) < 1e-9 ? d1 : (d1 - d2) / Math.log(d1 / d2);
}

// 熱交換器の両端の温度差。向流: ΔT1 = Th,in − Tc,out、ΔT2 = Th,out − Tc,in。並流: ΔT1 = Th,in − Tc,in、ΔT2 = Th,out − Tc,out
export function exchanger({ hin, hout, cin, cout, counter }) {
  const d1 = counter ? hin - cout : hin - cin, d2 = counter ? hout - cin : hout - cout;
  return { d1, d2, lmtd: lmtd(d1, d2) };
}

// 1次反応(−rA = k·CA)の定常反応器。k は tref [K] での速度定数 kref [1/s] からアレニウス式で t [K] に補正(ea [J/mol])。
// CSTR: τ = X/(k(1 − X))、PFR(と回分反応器の反応時間): τ = −ln(1 − X)/k。体積 V = τ·v0(v0 [m³/s] なら V [m³])
export const R_GAS = 8.314;
export function firstOrderReactor({ kref, tref, ea, t, x, v0 }) {
  const k = kref * Math.exp(-ea / R_GAS * (1 / t - 1 / tref));
  const tauC = x / (k * (1 - x)), tauP = -Math.log(1 - x) / k;
  return { k, tauC, tauP, vC: tauC * v0, vP: tauP * v0, ratio: tauC / tauP };
}

// Gilliland 相関の Molokanov 近似 Y = 1 − exp[(1 + 54.4X)/(11 + 117.2X)·(X − 1)/√X]
export function gilliland(x) {
  if (!(x > 0)) return 1;
  if (x >= 1) return 0;
  return 1 - Math.exp((1 + 54.4 * x) / (11 + 117.2 * x) * (x - 1) / Math.sqrt(x));
}

// 相対揮発度 α 一定の2成分系、飽和液供給(q = 1)。フェンスケの最小理論段数(リボイラーを含む)、
// q線 x = zF と平衡線の交点 y*、Underwood の根 θ = α/{1 + (α − 1)zF} と Rmin = αxD/(α − θ) + (1 − xD)/(1 − θ) − 1。
// ratio = R/Rmin を与えると、Gilliland で理論段数 N を返す(Rmin ≤ 0 のときは r 以降を NaN)
export function distillation({ alpha: a, xd, xw, zf, ratio }) {
  const nmin = Math.log((xd / (1 - xd)) * ((1 - xw) / xw)) / Math.log(a);
  const ystar = a * zf / (1 + (a - 1) * zf);
  const theta = a / (1 + (a - 1) * zf);
  const rmin = a * xd / (a - theta) + (1 - xd) / (1 - theta) - 1;
  const df = (zf - xw) / (xd - xw);
  if (!(rmin > 0)) return { df, nmin, ystar, theta, rmin, r: NaN, gx: NaN, n: NaN };
  const r = ratio * rmin;
  const gx = (r - rmin) / (r + 1);
  const gy = gilliland(gx);
  return { df, nmin, ystar, theta, rmin, r, gx, n: (nmin + gy) / (1 - gy) };
}

// 液体・固体燃料の完全燃焼(燃料1 kgあたり Nm³、1 kmol = 22.4 Nm³、空気は O₂ 21 vol%)。c・h・s・o は質量分率、m は空気比。
// O₀ = 22.4(c/12 + h/4 + s/32 − o/32)、A₀ = O₀/0.21、湿り排ガス G = CO₂ + H₂O + SO₂ + 0.79mA₀ + 0.21(m − 1)A₀ = mA₀ + 5.6h + 0.7o
export function combustion(c, h, s, o, m) {
  const o0 = 22.4 * (c / 12 + h / 4 + s / 32 - o / 32);
  const a0 = o0 / 0.21, a = m * a0;
  const co2 = 22.4 * c / 12, h2o = 22.4 * h / 2, so2 = 22.4 * s / 32, n2 = 0.79 * a, o2 = 0.21 * (m - 1) * a0;
  const g = co2 + h2o + so2 + n2 + o2, gd = g - h2o;
  return { o0, a0, a, co2, h2o, so2, n2, o2, g, gd, g0: co2 + h2o + so2 + 0.79 * a0, co2max: co2 / (co2 + so2 + 0.79 * a0) };
}

// 乾き排ガスの O₂ 濃度 [vol%] からの空気比の近似 m ≈ 21/(21 − O₂)
export const airRatioFromO2 = o2pct => 21 / (21 - o2pct);
