// 計算ツールの計算(src/js/calc.js)を、教科書の例や手計算の値と照らす。ページも同じ関数を使うので、ここが通れば画面の計算も同じ。
// 使い方: node tools/test-calc.js
import { friction, pipe, lmtd, exchanger, firstOrderReactor, gilliland, distillation, combustion, airRatioFromO2 } from '../src/js/calc.js';

let fails = 0, count = 0;
function near(name, got, want, rel = 1e-3) {
  count++;
  const ok = Number.isFinite(want) ? Math.abs(got - want) <= rel * Math.abs(want) : Object.is(got, want) || (Number.isNaN(got) && Number.isNaN(want));
  if (!ok) { fails++; console.error(`NG ${name}: ${got}(期待 ${want}、許容 ${rel * 100} %)`); }
}

// --- 円管の摩擦係数と圧力損失 ---
// 層流 f = 64/Re(ハーゲン・ポアズイユ)
near('層流 Re=1000 の f', friction(1000, 0), 0.064, 1e-12);
// 乱流: Colebrook 式の解(Moody 線図)Re=1e5・ε/D=1e-4 で f ≈ 0.0185、Re=1e6・滑らか(ε=0)で f ≈ 0.0117。Swamee–Jain は Colebrook に約1 %で一致
near('乱流 Re=1e5 ε/D=1e-4', friction(1e5, 1e-4), 0.0185, 0.015);
near('乱流 Re=1e6 滑らか', friction(1e6, 0), 0.0117, 0.015);
// 水 20 °C(ρ 998、μ 1.002 mPa·s)、内径 50 mm、10 m³/h、長さ 100 m、ε 0.045 mm(市販鋼管)
{
  const r = pipe({ q: 10 / 3600, d: 0.05, L: 100, rho: 998, mu: 1.002e-3, eps: 0.045e-3 });
  near('流速 u = Q/A', r.u, (10 / 3600) / (Math.PI * 0.05 ** 2 / 4), 1e-12);
  near('流速 ≈ 1.415 m/s', r.u, 1.4147, 1e-3);
  near('Re ≈ 7.05×10⁴', r.re, 998 * 1.4147 * 0.05 / 1.002e-3, 1e-3);
  near('ΔP = f(L/D)ρu²/2', r.dp, r.f * (100 / 0.05) * 998 * r.u ** 2 / 2, 1e-12);
  near('損失水頭 = ΔP/(ρg)', r.hl, r.dp / (998 * 9.81), 1e-12);
  near('動力 = ΔP·Q', r.power, r.dp * 10 / 3600, 1e-12);
  // Moody 線図から f ≈ 0.0225(ε/D = 9×10⁻⁴、Re ≈ 7×10⁴)
  near('f ≈ 0.0225', r.f, 0.0225, 0.03);
}

// --- 対数平均温度差 ---
near('LMTD 80 K と 20 K', lmtd(80, 20), 60 / Math.log(4), 1e-12);
near('LMTD ≈ 43.28 K', lmtd(80, 20), 43.28, 1e-4);
near('LMTD 両端が同じ', lmtd(70, 70), 70, 1e-12);
near('温度が交差すると NaN', lmtd(-5, 20), NaN);
// 高温側 150→100 °C、低温側 30→80 °C。向流は両端 70 K、並流は 120 K と 20 K
{
  const c = exchanger({ hin: 150, hout: 100, cin: 30, cout: 80, counter: true });
  near('向流 ΔT1', c.d1, 70, 1e-12); near('向流 ΔT2', c.d2, 70, 1e-12); near('向流 LMTD', c.lmtd, 70, 1e-12);
  const p = exchanger({ hin: 150, hout: 100, cin: 30, cout: 80, counter: false });
  near('並流 ΔT1', p.d1, 120, 1e-12); near('並流 ΔT2', p.d2, 20, 1e-12); near('並流 LMTD ≈ 55.8 K', p.lmtd, 100 / Math.log(6), 1e-12);
  // 同じ温度なら向流のほうが LMTD が大きい(必要な面積が小さい)
  count++; if (!(c.lmtd > p.lmtd)) { fails++; console.error('NG 向流 > 並流'); }
}

// --- 1次反応の CSTR と PFR ---
// 転化率 90 %: CSTR は kτ = X/(1 − X) = 9、PFR は kτ = ln 10 ≈ 2.303(Levenspiel 5章)
{
  const r = firstOrderReactor({ kref: 0.1, tref: 300, ea: 50e3, t: 300, x: 0.9, v0: 0.001 });
  near('同じ温度では k = kref', r.k, 0.1, 1e-12);
  near('CSTR kτ = 9', r.k * r.tauC, 9, 1e-12);
  near('PFR kτ = ln10', r.k * r.tauP, Math.log(10), 1e-12);
  near('CSTR 体積 = τ·v0', r.vC, 90 * 0.001, 1e-12);
  near('τ の比 ≈ 3.91', r.ratio, 9 / Math.log(10), 1e-12);
  // アレニウス: Ea 50 kJ/mol で 300 K → 310 K は k が約 1.91 倍
  const h = firstOrderReactor({ kref: 0.1, tref: 300, ea: 50e3, t: 310, x: 0.5, v0: 0 });
  near('アレニウス 10 K で約1.91倍', h.k / 0.1, Math.exp(50e3 / 8.314 * (1 / 300 - 1 / 310)), 1e-12);
  near('約1.91倍(数値)', h.k / 0.1, 1.909, 1e-3);
}

// --- 蒸留(フェンスケ・Underwood・Gilliland) ---
// ベンゼン−トルエン相当 α = 2.5、xD = 0.95、xW = 0.05、zF = 0.5(飽和液)
{
  const d = distillation({ alpha: 2.5, xd: 0.95, xw: 0.05, zf: 0.5, ratio: 1.5 });
  near('Nmin = ln(19·19)/ln2.5 ≈ 6.43', d.nmin, Math.log(361) / Math.log(2.5), 1e-12);
  near('Nmin ≈ 6.43', d.nmin, 6.43, 1e-3);
  near('y* = 2.5·0.5/(1 + 1.5·0.5)', d.ystar, 1.25 / 1.75, 1e-12);
  near('Rmin(交点から)= (xD − y*)/(y* − zF) = 1.1', d.rmin, (0.95 - 1.25 / 1.75) / (1.25 / 1.75 - 0.5), 1e-9);
  near('Rmin = 1.1', d.rmin, 1.1, 1e-9);
  near('留出の割合 D/F = 0.5', d.df, 0.5, 1e-12);
  near('R = 1.5 Rmin', d.r, 1.65, 1e-12);
  near('X = (R − Rmin)/(R + 1)', d.gx, 0.55 / 2.65, 1e-12);
  // Y = (N − Nmin)/(N + 1) を逆に解いた値と一致
  const y = gilliland(d.gx);
  near('N = (Nmin + Y)/(1 − Y)', d.n, (d.nmin + y) / (1 - y), 1e-12);
}
// Gilliland 線図の読み(Eduljee 式 Y = 0.75[1 − X^0.5668] でも同程度): X = 0.2 で Y ≈ 0.45、X = 0.5 で Y ≈ 0.25
near('Gilliland X=0.2', gilliland(0.2), 0.75 * (1 - 0.2 ** 0.5668), 0.05);
near('Gilliland X=0.5', gilliland(0.5), 0.75 * (1 - 0.5 ** 0.5668), 0.08);
near('Gilliland X→0 は Y = 1(最小還流で段数無限)', gilliland(0), 1, 1e-12);
near('Gilliland X=1 は Y = 0(全還流)', gilliland(1), 0, 1e-12);
// α が大きく交点が xD を超えると Rmin ≤ 0
near('Rmin ≤ 0 のとき N は NaN', distillation({ alpha: 20, xd: 0.9, xw: 0.05, zf: 0.5, ratio: 1.5 }).n, NaN);

// --- 燃焼計算 ---
// 炭素だけ: O₀ = 22.4/12 = 1.867 Nm³/kg、A₀ = 8.889 Nm³/kg、最大 CO₂ = 21 %
{
  const r = combustion(1, 0, 0, 0, 1);
  near('炭素 O₀ = 1.867', r.o0, 22.4 / 12, 1e-12);
  near('炭素 A₀ = 8.889', r.a0, 22.4 / 12 / 0.21, 1e-12);
  near('炭素の最大CO₂ = 21 %', r.co2max, 0.21, 1e-12);
  near('炭素 m=1 の湿り排ガス = A₀', r.g, r.a0, 1e-12);
}
// 水素だけ: O₀ = 22.4/4 = 5.6 Nm³/kg、A₀ = 26.67 Nm³/kg
near('水素 A₀ = 26.67', combustion(0, 1, 0, 0, 1).a0, 5.6 / 0.21, 1e-12);
// 重油の例(C 85 %、H 12 %、S 2 %、O 1 %)、空気比 1.2: 湿り排ガスの簡易式 G = mA₀ + 5.6h + 0.7o と一致
{
  const r = combustion(0.85, 0.12, 0.02, 0.01, 1.2);
  near('重油 O₀', r.o0, 22.4 * (0.85 / 12 + 0.12 / 4 + 0.02 / 32 - 0.01 / 32), 1e-12);
  near('重油 O₀ ≈ 2.265', r.o0, 2.265, 1e-3);
  near('G = mA₀ + 5.6h + 0.7o', r.g, 1.2 * r.a0 + 5.6 * 0.12 + 0.7 * 0.01, 1e-12);
  near('乾き = 湿り − H₂O', r.gd, r.g - 22.4 * 0.12 / 2, 1e-12);
  // O₂ 濃度からの空気比の近似は、N₂ が空気だけから来るとき m の近似になる(数 %の誤差)
  near('O₂ からの空気比 ≈ 1.2', airRatioFromO2(100 * r.o2 / r.gd), 1.2, 0.03);
}

if (fails) { console.error(`計算の検査: ${count} 件中 ${fails} 件 NG`); process.exit(1); }
console.log(`OK: 計算の検査 ${count} 件`);
