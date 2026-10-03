import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FlipMachine } from '../src/machine.js';
import { leafPose, DIM } from '../src/mechanism.js';

// No renderer is needed: test the actual generated cabinet triangles. Canvas
// paint is stubbed only because the collision and opening checks use geometry.
globalThis.document = { createElement() {
  const context = new Proxy({}, { get(target, key) { return target[key] ?? (() => {}); } });
  return { width: 0, height: 0, getContext() { return context; } };
} };
const machine = new FlipMachine(new THREE.Scene(), Array.from({ length: 24 }, () => ({ top: new THREE.Texture(), bottom: new THREE.Texture() })));
assert.equal(machine.shellId, 'cream');
const creamColliders = structuredClone(machine.colliders);
machine.setShell('wood');
assert.equal(machine.colliders.length, creamColliders.length);
machine.colliders.forEach((spec, i) => {
  for (const key of ['size', 'position']) spec[key].forEach((value, j) => assert.ok(Math.abs(value - creamColliders[i][key][j]) < 1e-12, `coin collider ${i} changed`));
  assert.equal(spec.rotateX || 0, creamColliders[i].rotateX || 0);
});
machine.setShell('cream'); machine.group.updateMatrixWorld(true);
const front = machine.shellGroup.getObjectByName('rounded-shell-front');
const bezel = machine.shellGroup.getObjectByName('rose-window-bezel');
const ray = new THREE.Raycaster(undefined, undefined, 0, .018);
function apertureIsOpen(x, y) {
  ray.set(new THREE.Vector3(x, y, .075), new THREE.Vector3(0, 0, -1));
  return ray.intersectObjects([front, bezel]).length === 0;
}
let checkedCrossings = 0;
for (let sample = 0; sample <= 1000; sample++) {
  for (let i = 0; i < DIM.count; i++) {
    const p = leafPose(i, sample / 1000, machine.dim);
    for (const z of [.061, .065, .069]) {
      if (Math.abs(p.tipZ - p.z) < 1e-10) continue;
      const t = (z - p.z) / (p.tipZ - p.z);
      if (t < 0 || t > 1) continue;
      const y = p.y + (p.tipY - p.y) * t;
      for (const x of [-DIM.cardWidth / 2, 0, DIM.cardWidth / 2]) {
        assert.ok(apertureIsOpen(x, y), 'rounded frame intersects a flipping card'); checkedCrossings++;
      }
    }
  }
}
for (const x of [-.001, 0, .001]) for (const y of [DIM.slotY - .012, DIM.slotY, DIM.slotY + .012]) {
  assert.ok(apertureIsOpen(x, y), 'rounded cabinet blocks the coin slit');
}
front.geometry.computeBoundingBox();
const bounds = front.geometry.boundingBox;
assert.ok(Math.abs(bounds.max.x - .104) < 1e-7 && Math.abs(bounds.max.y - .264) < 1e-7);
const positions = front.geometry.attributes.position;
for (let i = 0; i < positions.count; i++) {
  assert.ok(!(Math.abs(positions.getX(i)) > .1039 && (positions.getY(i) < .0001 || positions.getY(i) > .2639)), 'exterior still has a square corner');
}
machine.setOpen(true); assert.equal(machine.removable.visible, false);
machine.setShell('mint'); assert.equal(machine.removable.visible, false);
machine.setShell('cream'); machine.setOpen(false); assert.equal(machine.removable.visible, true);
console.log(JSON.stringify({ status: 'passed', checkedCardFrameCrossings: checkedCrossings, coinCollidersUnchanged: creamColliders.length, realCoinSlit: true, roundedSilhouette: true, shellSwitchRetainsOpenState: true }, null, 2));
