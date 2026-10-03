import assert from 'node:assert/strict';
import { DIM, dimensionsFor, TAU, leafPose, planRotation, sampleRotation, segmentDistance, mod, randomPage } from '../src/mechanism.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { DEFAULT_STORY, SIMULATED_MARKET, MARKET_SPEC } from '../src/story.js';

let closest = Infinity, minimumAt;
const delta = TAU / DIM.count;
for (let sample = 0; sample <= 10000; sample++) {
  const q = sample / 10000;
  const poses = Array.from({ length: DIM.count }, (_, i) => leafPose(i, q));
  for (let i = 0; i < DIM.count; i++) {
    const p = poses[i];
    assert.ok([p.y, p.z, p.angle, p.tipY, p.tipZ].every(Number.isFinite));
    assert.ok(Math.hypot(p.tipY - p.y, p.tipZ - p.z) - DIM.length < 1e-9, 'card length changes');
    // Every card may swing through the OPEN window; never through its frame.
    for (let j = 0; j <= 12; j++) {
      const u = j / 12, y = p.y + (p.tipY - p.y) * u, z = p.z + (p.tipZ - p.z) * u;
      if (z >= DIM.frontZ - .004 && z <= DIM.frontZ + .004) assert.ok(y > DIM.windowBottom + .001 && y < DIM.windowTop - .001, 'card strikes front frame');
      assert.ok(y > DIM.slotY + DIM.coinRadius + .002 && y < .25 && z > DIM.backZ + .005, 'card leaves internal vertical/back envelope');
    }
    for (let j = i + 1; j < DIM.count; j++) {
      const b = poses[j];
      const distance = segmentDistance([p.y, p.z], [p.tipY, p.tipZ], [b.y, b.z], [b.tipY, b.tipZ]);
      if (distance < closest) { closest = distance; minimumAt = { q, i, j }; }
      assert.ok(distance > DIM.cardThickness + .00025, 'finite card bodies overlap');
    }
  }
}
assert.ok(DIM.windowHalfWidth > .0754 + .0004, 'cam rail intersects side bezel');
assert.ok(.079 - .0012 > DIM.cardWidth / 2 + .0006, 'spool intersects card faces');
assert.ok(DIM.slotHeight > 2 * DIM.coinRadius + .003 && DIM.slotWidth > DIM.coinThickness + .001, 'coin does not fit slit');
assert.ok(.046 + DIM.coinRadius < .079, 'coin sweep touches card window');

// Check all stop transitions, same-page results, wrap-around and peak speed.
for (let current = 0; current < DIM.count; current++) for (let target = 0; target < DIM.count; target++) {
  const plan = planRotation(current, target);
  assert.equal(mod(plan.end, DIM.count), target);
  assert.ok(plan.steps >= 8);
  assert.ok(plan.duration >= 8 && plan.duration <= 12.375, 'round length falls outside the extended timing range');
  assert.ok(1.875 * plan.steps / plan.duration <= 10 + 1e-10);
  assert.equal(sampleRotation(plan, 0).position, current);
  assert.equal(sampleRotation(plan, plan.duration).position, plan.end);
  assert.equal(sampleRotation(plan, plan.duration + 100).position, plan.end);
  const physicalTop = mod(Math.round(plan.end), DIM.count), physicalBottom = mod(physicalTop - 1, DIM.count);
  assert.equal(mod(physicalBottom + 1, DIM.count), physicalTop, 'split-page pairing is incorrect');
}
// Test front and rear transition velocity continuity independently of rendering.
for (const q of [0, 1, DIM.count / 2]) {
  const eps = 1e-6;
  const angle = (x) => { const a = leafPose(0, x).angle; return q === DIM.count / 2 && x > q ? a + TAU : a; };
  const left = (angle(q) - angle(q - eps)) / eps, right = (angle(q + eps) - angle(q)) / eps;
  assert.ok(Math.abs(left - right) < .01, `velocity discontinuity at q=${q}: ${left},${right}`);
}

// Every supported cartridge size retains clear blades, aperture and coin route.
let cartridgeTransitions = 0, lowestAcrossSizes = 1;
for (let count = 8; count <= 24; count++) {
  const d = dimensionsFor(count);
  for (let sample = 0; sample <= 1000; sample++) {
    const poses = Array.from({ length: count }, (_, i) => leafPose(i, sample / 1000, d));
    for (let i = 0; i < count; i++) {
      const p = poses[i];
      lowestAcrossSizes = Math.min(lowestAcrossSizes, p.y, p.tipY);
      assert.ok(Math.min(p.y, p.tipY) > DIM.slotY + DIM.coinRadius + .002, 'cartridge reaches coin insertion envelope');
      for (let j = i + 1; j < count; j++) {
        const b = poses[j];
        assert.ok(segmentDistance([p.y,p.z],[p.tipY,p.tipZ],[b.y,b.z],[b.tipY,b.tipZ]) > d.cardThickness + .0002, `cartridge ${count} overlaps`);
      }
    }
  }
  for (let current = 0; current < count; current++) for (let target = 0; target < count; target++) {
    const p = planRotation(current, target, { count });
    assert.ok(p.duration >= 8, 'custom cartridge ends its round too early');
    assert.equal(mod(p.end, count), target); cartridgeTransitions++;
  }
}
assert.ok(.079 + .0012 < DIM.windowHalfWidth, 'larger rotor side discs hit the front bezel');
assert.ok(.0754 + .0004 < .079 - .0012, 'cam rails hit rotor discs');
assert.ok(2 * DIM.radius * Math.sin(delta / 2) > .0023, 'torsion spring coils overlap');

// One cyclic simulated tape: every open connects, including the last/first seam.
const marketBars = SIMULATED_MARKET.bars;
assert.equal(marketBars.length, 120);
for (let i = 0; i < marketBars.length; i++) {
  const bar = marketBars[i], previous = marketBars[mod(i - 1, marketBars.length)];
  assert.equal(bar.open, previous.close, 'new candle does not continue the previous close');
  assert.ok([bar.open,bar.high,bar.low,bar.close].every(v => Number.isFinite(v) && v > 0));
  assert.ok(bar.high >= Math.max(bar.open,bar.close) && bar.low <= Math.min(bar.open,bar.close));
}
let positivePages = 0;
for (let i = 0; i < DEFAULT_STORY.pages.length; i++) {
  const page = DEFAULT_STORY.pages[i], next = DEFAULT_STORY.pages[(i+1) % MARKET_SPEC.pages];
  assert.equal(page.candles.length, MARKET_SPEC.window);
  assert.equal(new Set(page.candles.map(b=>b.time)).size, MARKET_SPEC.window, 'visible window repeats candles');
  assert.equal(page.price, page.candles.at(-1).close);
  assert.equal(page.value, Math.round((page.price / MARKET_SPEC.entry - 1) * 100 * MARKET_SPEC.displayScale));
  assert.equal(page.interval, '模拟');
  assert.deepEqual(page.domain, next.domain, 'price axis changes between pages');
  assert.deepEqual(page.candles.slice(MARKET_SPEC.advance), next.candles.slice(0, MARKET_SPEC.window - MARKET_SPEC.advance), 'adjacent chart history jumps');
  assert.equal(next.candles[MARKET_SPEC.window - MARKET_SPEC.advance].open, page.price, 'first new candle opens at the wrong price');
  if (page.value > 0) positivePages++;
  const signs = [page, next, DEFAULT_STORY.pages[(i+2)%MARKET_SPEC.pages]].map(p=>Math.sign(p.value));
  assert.ok(!(signs[0] === signs[1] && signs[1] === signs[2]), 'three consecutive pages have the same result sign');
}
assert.equal(positivePages, 12);
// Test the probability intervals themselves, rather than a noisy random run.
// Half the printed pages still win; only one third of stopping mass goes there.
const stopCounts = new Array(DEFAULT_STORY.pages.length).fill(0);
for (let i = 0; i < 3600; i++) stopCounts[randomPage(stopCounts.length, () => (i + .5) / 3600, DEFAULT_STORY.stopWeights)]++;
assert.equal(stopCounts.reduce((sum, n, i) => sum + (DEFAULT_STORY.pages[i].value > 0 ? n : 0), 0), 1200);
assert.equal(stopCounts.reduce((sum, n, i) => sum + (DEFAULT_STORY.pages[i].value < 0 ? n : 0), 0), 2400);
stopCounts.forEach((n, i) => assert.equal(n, DEFAULT_STORY.pages[i].value < 0 ? 200 : 100, 'stopping weights no longer match the printed result'));
for (let i = 0; i < 24; i++) assert.equal(randomPage(24, () => (i + .5) / 24), i, 'custom unweighted pages are biased');
assert.equal(new Set(DEFAULT_STORY.pages.map(p=>p.expression)).size, 8, 'one of the character expressions is unused');
const risingCandles = marketBars.filter(b=>b.close >= b.open).length;
assert.ok(risingCandles > marketBars.length*.3 && risingCandles < marketBars.length*.7, 'candles form a one-way trend');

// Actual rigid-body solver: a 24mm coin descends the same 25-degree chute.
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }); world.timestep = 1 / 120;
world.integrationParameters.numSolverIterations = 8; world.integrationParameters.maxCcdSubsteps = 4;
function box(size, position, angle = 0) {
  const c = RAPIER.ColliderDesc.cuboid(...size.map(x => x / 2)).setTranslation(...position).setFriction(.18).setRestitution(.16).setContactSkin(.00005);
  if (angle) c.setRotation({ x: Math.sin(angle / 2), y: 0, z: 0, w: Math.cos(angle / 2) });
  return world.createCollider(c);
}
box([.208, .009, .14], [0, .0045, -.001]);
box([.033, .002, .076], [0, .0228, .01], -.44);
for (const x of [-.0185, .0185]) box([.003, .009, .076], [x, .0278, .01], -.44);
box([.165, .002, .105], [0, .011, -.012]);
for (const x of [-.084, .084]) box([.002, .042, .104], [x, .032, -.012]);
box([.17, .042, .002], [0, .032, -.065]);
const sensor = world.createCollider(RAPIER.ColliderDesc.cuboid(.018, .009, .003).setTranslation(0, .039, .034).setSensor(true));
const coins = [];
let passed = 0;
for (let n = 0; n < 32; n++) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, DIM.slotY, .042).setRotation({x:0,y:0,z:Math.SQRT1_2,w:Math.SQRT1_2}).setLinvel(0, -.015, -.07).setCcdEnabled(true).setLinearDamping(.08).setAngularDamping(.28));
  const collider = world.createCollider(RAPIER.ColliderDesc.cylinder(.001, .012).setMass(.007).setFriction(.18).setRestitution(.18).setContactSkin(.00004), body);
  let detected = false;
  for (let k = 0; k < 480; k++) {
    world.step(); if (world.intersectionPair(sensor, collider)) detected = true;
    for (const previous of [...coins, body]) assert.ok(previous.translation().y > .0078, 'coin fell through the base');
  }
  assert.ok(detected, `coin ${n} missed sensor`); passed++;
  assert.ok(body.translation().z < .025, `coin ${n} stuck at insertion`);
  assert.ok(Math.abs(body.translation().x) < .092, 'coin escaped chamber');
  coins.push(body);
}
console.log(JSON.stringify({ status: 'passed', testedPhases: 10001, leafPairsPerPhase: DIM.count * (DIM.count - 1) / 2, minimumCardCentrelineMM: +(closest * 1000).toFixed(4), minimumBodyClearanceMM: +((closest - DIM.cardThickness) * 1000).toFixed(4), minimumAt, stopTransitions: cartridgeTransitions, cartridgeSizes: 17, simulatedPagesVerified: DEFAULT_STORY.pages.length, gainPages: positivePages, lossPages: DEFAULT_STORY.pages.length - positivePages, stoppingGainProbability: 1 / 3, stoppingProbabilitySamples: 3600, continuousCandles: marketBars.length, sharedCandlesPerPage: MARKET_SPEC.window - MARKET_SPEC.advance, lowestRearTipMM: +(lowestAcrossSizes*1000).toFixed(3), rigidBodyCoinsPassed: passed }, null, 2));
world.free();
