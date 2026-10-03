// SI units; the camera moves around a box that remains upright.
export const TAU = Math.PI * 2;
export const DIM = Object.freeze({
  count: 24, radius: 0.024, length: 0.072, cardWidth: 0.144,
  cardThickness: 0.00018, axisY: 0.165, axisZ: 0.041,
  caseWidth: 0.208, caseHeight: 0.264, backZ: -0.07, frontZ: 0.065,
  windowBottom: 0.0775, windowTop: 0.24, windowHalfWidth: 0.0845,
  coinRadius: 0.012, coinThickness: 0.002,
  slotY: 0.053, slotZ: 0.069, slotWidth: 0.0038, slotHeight: 0.032,
});

export function dimensionsFor(count) {
  if (!Number.isInteger(count) || count < 8 || count > 24) throw new Error('这只箱子支持 8–24 张画页。');
  const t = Math.max(0, (count - 12) / 12);
  return { ...DIM, count, radius: count <= 12 ? .0085 * count / 12 : .0085 + .0155 * t,
    cardThickness: count <= 12 ? .00035 : .00035 - .00017 * t };
}

export const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
export const mod = (x, n) => ((x % n) + n) % n;
export const smooth5 = (u) => { u = clamp(u); return u ** 3 * (10 + u * (-15 + 6 * u)); };
export const wrapAngle = (x) => mod(x + Math.PI, TAU) - Math.PI;

// A cam-guided, spring-assisted flap, NOT an unconstrained falling rigid body.
// C2 matching at both ends preserves velocity through the release transition.
export function leafPose(index, stepPosition, dimensions = DIM) {
  const delta = TAU / dimensions.count;
  const phase = wrapAngle((index - stepPosition) * delta);
  let angle;
  if (phase >= 0) angle = -phase;
  else if (phase >= -delta) {
    const s = -phase / delta;
    angle = Math.PI * smooth5(s) + delta * (s - 6 * s ** 3 + 8 * s ** 4 - 3 * s ** 5);
  } else if (phase < -Math.PI + delta / 24) {
    // A short rear pickup cam gives C2 continuity across the circular seam.
    const width = delta / 24;
    const s = (-phase - (Math.PI - width)) / width;
    angle = Math.PI + width * (-4 * s ** 3 + 7 * s ** 4 - 3 * s ** 5);
  } else angle = Math.PI;
  const y = dimensions.axisY + dimensions.radius * Math.sin(phase);
  const z = dimensions.axisZ + dimensions.radius * Math.cos(phase);
  return { phase, angle, y, z, tipY: y + dimensions.length * Math.cos(angle), tipZ: z + dimensions.length * Math.sin(angle) };
}

export function planRotation(position, target, { count = DIM.count, peakRate = 10, fullTurn = false, minimumSteps = 8, minimumDuration = 8 } = {}) {
  const current = mod(Math.round(position), count);
  let steps = mod(target - current, count);
  if (fullTurn) steps += count;
  else if (steps < Math.min(minimumSteps, count)) steps += count;
  // Add complete revolutions to extend the round without slowing the fast flips
  // or changing the randomly selected stopping page.
  const requiredSteps = Math.ceil(minimumDuration * peakRate / 1.875);
  if (steps < requiredSteps) steps += Math.ceil((requiredSteps - steps) / count) * count;
  const duration = Math.max(1.2, 1.875 * steps / peakRate);
  return { start: position, end: position + steps, steps, target, duration };
}

export function sampleRotation(plan, elapsed) {
  const u = clamp(elapsed / plan.duration);
  return { position: plan.start + plan.steps * smooth5(u), progress: u, done: u >= 1 };
}

export function randomPage(count, random = Math.random, weights = null) {
  if (!weights) return Math.min(count - 1, Math.floor(random() * count));
  if (!Array.isArray(weights) || weights.length !== count || weights.some(w => !Number.isFinite(w) || w < 0) || !weights.some(w => w > 0)) throw new Error('停页权重与画页不匹配。');
  let ticket = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < count; i++) {
    if (ticket < weights[i]) return i;
    ticket -= weights[i];
  }
  return weights.findLastIndex(w => w > 0);
}

function pointSegment(p, a, b) {
  const dy = b[0] - a[0], dz = b[1] - a[1];
  const t = clamp(((p[0] - a[0]) * dy + (p[1] - a[1]) * dz) / (dy * dy + dz * dz));
  return Math.hypot(p[0] - a[0] - t * dy, p[1] - a[1] - t * dz);
}
function cross(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
export function segmentDistance(a, b, c, d) {
  if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return 0;
  return Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
}
