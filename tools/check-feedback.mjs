import assert from 'node:assert/strict';
import * as THREE from 'three';
import { celebrationFor } from '../src/celebration.js';
import { shouldLiquidate, characterLine } from '../src/story.js';
import { ToySound } from '../src/sound.js';
import { touchCoinHit } from '../src/interaction.js';
import { FlipMachine } from '../src/machine.js';
import { CoinPhysics } from '../src/physics.js';
import { DIM } from '../src/mechanism.js';

for (const value of [-177, -106, -100, -99.6]) assert.equal(shouldLiquidate(value), true);
for (const value of [-99.4, -89, 0, 136, NaN, undefined]) assert.equal(shouldLiquidate(value), false);
for (const value of [-177, -100, -1, 0, NaN, undefined]) assert.equal(celebrationFor(value), null);
assert.equal(celebrationFor(34).tier, 'applause');
assert.equal(celebrationFor(74).tier, 'cheer');
assert.equal(celebrationFor(136).tier, 'jackpot');
assert.equal(characterLine(-100, { peeking: true, liquidated: true }), '……真的一枚都没了。');

// Exercise audio scheduling, silence and interrupted loads without an audio device.
const parameter = () => ({ setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
let contexts = 0, decodeGate = null;
const originalFetch = globalThis.fetch, originalWindow = globalThis.window;
class AudioContextStub {
  constructor() { contexts++; this.currentTime = 0; this.state = 'suspended'; this.destination = {}; this.sources = []; }
  async resume() { this.state = 'running'; }
  createGain() { return { gain: parameter(), connect() {}, disconnect() {} }; }
  async decodeAudioData(bytes) { if (decodeGate) await decodeGate; return { name: new Uint8Array(bytes)[0] === 1 ? 'applause' : 'cheers', duration: 2.5 }; }
  createBufferSource() {
    const source = { connect() {}, disconnect() {}, start(time, offset, duration) { this.duration = duration; this.started = true; }, stop() { this.stopped = true; } };
    this.sources.push(source); return source;
  }
}
globalThis.window = { AudioContext: AudioContextStub };
globalThis.document = {
  baseURI: 'https://m1kywuu.github.io/kurumi-flip-bank/',
  createElement() { return { getContext() { return new Proxy({}, { get: (object, key) => object[key] ?? (() => {}) }); } }; },
};
globalThis.fetch = async url => {
  assert.ok(String(url).startsWith('https://m1kywuu.github.io/kurumi-flip-bank/assets/audio/'));
  return { ok: true, arrayBuffer: async () => Uint8Array.of(String(url).includes('applause') ? 1 : 2).buffer };
};
const sound = new ToySound();
await sound.celebrate(celebrationFor(34));
assert.equal(contexts, 0, 'page load must not start autoplay');
await sound.setEnabled(false); // Muting before the first gesture is safe.
await sound.setEnabled(true);
for (const [value, names] of [[34, ['applause']], [74, ['cheers']], [136, ['applause', 'cheers']]]) {
  const previous = [...sound.voices].map(entry => entry.source);
  await sound.celebrate(celebrationFor(value));
  assert.ok(previous.every(source => source.stopped), 'previous celebration overlaps the next one');
  assert.deepEqual([...sound.voices].map(entry => entry.source.buffer.name), names);
}
await sound.celebrate(celebrationFor(-52));
assert.equal(sound.voices.size, 0, 'loss must remain silent');
await sound.celebrate(celebrationFor(136));
const playing = [...sound.voices].map(entry => entry.source);
await sound.setEnabled(false);
assert.ok(playing.every(source => source.stopped));
const previousStarts = sound.context.sources.length;
await sound.celebrate(celebrationFor(136));
assert.equal(sound.context.sources.length, previousStarts, 'muted win starts a sound');

let finishDecode;
decodeGate = new Promise(resolve => { finishDecode = resolve; });
const delayed = new ToySound(), unlock = delayed.unlock();
const pendingWin = delayed.celebrate(celebrationFor(136));
delayed.stopCelebration(); // New round, liquidation, or hidden tab while loading.
finishDecode(); await Promise.all([unlock, pendingWin]);
assert.equal(delayed.context.sources.length, 0, 'late audio leaks into a later round');
decodeGate = null;
globalThis.fetch = originalFetch;
if (originalWindow === undefined) delete globalThis.window;
else globalThis.window = originalWindow;

// Test the real cabinet, ray picking and rigid-body clearing, not just counters.
const machine = new FlipMachine(new THREE.Scene(), Array.from({ length: 24 }, () => ({ top: new THREE.Texture(), bottom: new THREE.Texture() })));
const camera = new THREE.PerspectiveCamera(35, 390 / 470, .004, 10);
const rect = { left: 12, top: 100, width: 390, height: 470 };
camera.position.set(.14, .25, .63); camera.lookAt(0, .112, .021); camera.updateMatrixWorld(); machine.group.updateMatrixWorld(true);
function finger(dx = 0, dy = 0, pointerType = 'touch') {
  const p = machine.readyCoin.getWorldPosition(new THREE.Vector3()).project(camera);
  return { pointerType, clientX: rect.left + (p.x + 1) * rect.width / 2 + dx, clientY: rect.top + (1 - p.y) * rect.height / 2 + dy };
}
assert.equal(touchCoinHit(finger(24), machine.readyCoin, camera, machine.group, rect), true, 'finger near the thin coin misses');
assert.equal(touchCoinHit(finger(-24), machine.readyCoin, camera, machine.group, rect), true);
assert.equal(touchCoinHit(finger(30), machine.readyCoin, camera, machine.group, rect), false, 'coin steals nearby orbit gestures');
assert.equal(touchCoinHit(finger(24, 0, 'mouse'), machine.readyCoin, camera, machine.group, rect), false);
camera.position.set(0, .13, -.63); camera.lookAt(0, .112, .021); camera.updateMatrixWorld();
assert.equal(touchCoinHit(finger(), machine.readyCoin, camera, machine.group, rect), false, 'coin can be grabbed through the back wall');

const physics = await CoinPhysics.create(machine.colliders);
let accepted = 0;
function deposit() {
  const mesh = machine.readyCoin; mesh.position.set(0, DIM.slotY, .042);
  physics.release(mesh, () => accepted++); machine.replaceReadyCoin();
  for (let step = 0; step < 480; step++) physics.step(1 / 120);
  return mesh;
}
const deposited = [deposit(), deposit()];
assert.equal(accepted, 2); assert.equal(physics.count, 2); assert.equal(physics.snapshot().length, 2);
physics.clear();
assert.equal(physics.count, 0); assert.equal(physics.snapshot().length, 0); assert.equal(physics.world.bodies.len(), 0);
assert.ok(deposited.every(mesh => mesh.parent === null), 'liquidated coins are still rendered');
assert.equal(machine.readyCoin.parent, machine.group, 'next playable coin disappeared');
deposit(); assert.equal(accepted, 3, 'sensor stopped working after liquidation');
physics.world.free();
console.log('Passed: win-only audio, mute and delayed decode; −100% liquidation with actual coin removal; enlarged mobile target and rear occlusion.');
