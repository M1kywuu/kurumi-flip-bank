import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DIM as BASE_DIM, dimensionsFor, TAU, leafPose, mod } from './mechanism.js';
import { canvasTexture, textTexture, woodTexture, cabinetPrintTexture, cabinetBackTexture } from './textures.js';

function roundedPanel(x, y, width, height, radius, Type = THREE.Shape) {
  const path = new Type(), r = Math.min(radius, width / 2, height / 2);
  path.moveTo(x + r, y); path.lineTo(x + width - r, y);
  path.quadraticCurveTo(x + width, y, x + width, y + r);
  path.lineTo(x + width, y + height - r);
  path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  path.lineTo(x + r, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - r);
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
  path.closePath(); return path;
}

const shellFactories = new Map();
export function registerShell(id, factory) {
  if (typeof id !== 'string' || typeof factory !== 'function') throw new Error('箱体需要名称和构建函数。');
  shellFactories.set(id, factory);
}

export class FlipMachine {
  constructor(scene, pageTextures) {
    this.dim = dimensionsFor(pageTextures.length); this.scene = scene; this.group = new THREE.Group(); scene.add(this.group);
    this.shellGroup = new THREE.Group(); this.group.add(this.shellGroup);
    this.interior = new THREE.Group(); this.group.add(this.interior);
    this.leaves = []; this.colliders = []; this.open = false; this.position = 0;
    this.materials = {
      edge: new THREE.MeshStandardMaterial({ color: '#303943', roughness: .8 }),
      black: new THREE.MeshStandardMaterial({ color: '#202a34', metalness: .6, roughness: .36 }),
      steel: new THREE.MeshStandardMaterial({ color: '#a3adb0', metalness: .92, roughness: .3 }),
      brass: new THREE.MeshStandardMaterial({ color: '#bd9c63', metalness: .88, roughness: .3 }),
      dark: new THREE.MeshStandardMaterial({ color: '#101821', roughness: .74 }),
      wood: new THREE.MeshStandardMaterial({ map: woodTexture(), color: '#e1b788', roughness: .66 }),
      mint: new THREE.MeshStandardMaterial({ color: '#a5beb1', roughness: .48, metalness: .07 }),
      cream: new THREE.MeshStandardMaterial({ color: '#f4dbb1', roughness: .39, metalness: .04 }),
      rose: new THREE.MeshStandardMaterial({ color: '#ed80a8', roughness: .38, metalness: .06 }),
    };
    this.buildLeaves(pageTextures); this.buildMechanism(); this.buildCoin();
    this.setShell('cream'); this.update(0);
  }
  box(parent, size, position, material, { radius = 0, collider = false, rotateX = 0, name = '' } = {}) {
    const g = radius ? new RoundedBoxGeometry(...size, 3, Math.min(radius, ...size.map(v => v / 2))) : new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(g, material); mesh.position.set(...position); mesh.rotation.x = rotateX;
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name; parent.add(mesh);
    if (collider) this.colliders.push({ size, position, rotateX });
    return mesh;
  }
  cylinder(parent, radius, length, position, material, axis = 'x', segments = 48) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    else if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  buildLeaves(pairs) {
    const DIM = this.dim;
    const faceGeo = new THREE.PlaneGeometry(DIM.cardWidth, DIM.length);
    const cardGeo = new THREE.BoxGeometry(DIM.cardWidth, DIM.length, DIM.cardThickness);
    for (let i = 0; i < DIM.count; i++) {
      const leaf = new THREE.Group(); this.interior.add(leaf);
      const card = new THREE.Mesh(cardGeo, this.materials.edge);
      card.position.y = DIM.length / 2; card.castShadow = card.receiveShadow = true; leaf.add(card);
      const topMat = new THREE.MeshStandardMaterial({ map: pairs[i].top, side: THREE.FrontSide, roughness: .76, metalness: 0 });
      const bottomMat = new THREE.MeshStandardMaterial({ map: pairs[(i + 1) % DIM.count].bottom, side: THREE.BackSide, roughness: .76, metalness: 0 });
      const front = new THREE.Mesh(faceGeo, topMat), back = new THREE.Mesh(faceGeo, bottomMat);
      front.position.set(0, DIM.length / 2, DIM.cardThickness / 2 + .000007);
      back.position.set(0, DIM.length / 2, -DIM.cardThickness / 2 - .000007);
      front.receiveShadow = back.receiveShadow = true; leaf.add(front, back);
      this.cylinder(leaf, .00065, .164, [0, 0, 0], this.materials.steel);
      // Cam followers live outside the picture, within the open aperture.
      this.cylinder(leaf, .00012, .1488, [0, DIM.length, 0], this.materials.steel, 'x', 12);
      for (const x of [-.0744, .0744]) {
        const follower = new THREE.Mesh(new THREE.SphereGeometry(.0006, 12, 8), this.materials.brass);
        follower.position.set(x, DIM.length, 0); leaf.add(follower);
      }
      for (const x of [-.081, .081]) {
        for (let turn = 0; turn < 3; turn++) {
          const coil = new THREE.Mesh(new THREE.TorusGeometry(.00105, .0001, 5, 16), this.materials.brass);
          coil.rotation.y = Math.PI / 2; coil.position.set(x + (turn - 1) * .00025, 0, 0); leaf.add(coil);
        }
      }
      this.leaves.push({ group: leaf, front, back });
    }
    this.pageTextures = pairs;
  }
  setPages(pairs) {
    const DIM = this.dim;
    const old = this.pageTextures;
    if (pairs.length !== this.dim.count) {
      this.interior.traverse(o => {
        if (o.isMesh) { o.geometry.dispose(); if (!Object.values(this.materials).includes(o.material)) o.material.dispose(); }
      });
      this.interior.clear(); this.leaves = [];
      this.knob.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); this.knob.removeFromParent();
      this.dim = dimensionsFor(pairs.length);
      this.buildLeaves(pairs); this.buildMechanism(); this.setShell(this.shellId);
      this.knob.traverse(o => { if (o.isMesh) o.userData.action = 'step'; });
      this.update(mod(Math.round(this.position), pairs.length));
      old.forEach(p => { p.top.dispose(); p.bottom.dispose(); });
      return;
    }
    this.leaves.forEach((leaf, i) => {
      leaf.front.material.map = pairs[i].top;
      leaf.back.material.map = pairs[(i + 1) % DIM.count].bottom;
      leaf.front.material.needsUpdate = leaf.back.material.needsUpdate = true;
    });
    this.pageTextures = pairs; old.forEach(p => { p.top.dispose(); p.bottom.dispose(); });
  }
  buildMechanism() {
    const DIM = this.dim;
    const M = this.materials, y = DIM.axisY, z = DIM.axisZ;
    this.cylinder(this.interior, .0022, .224, [0, y, z], M.steel);
    this.rotor = new THREE.Group(); this.rotor.position.set(0, y, z); this.interior.add(this.rotor);
    for (const x of [-.079, .079]) {
      this.cylinder(this.rotor, DIM.radius + .0027, .0024, [x, 0, 0], M.black);
      this.cylinder(this.rotor, .0035, .004, [x, 0, 0], M.brass);
      for (let j = 0; j < DIM.count; j++) {
        const a = j * TAU / DIM.count;
        this.cylinder(this.rotor, .0008, .001, [x + Math.sign(x) * .0017, DIM.radius * Math.sin(a), DIM.radius * Math.cos(a)], M.brass, 'x', 12);
      }
    }
    for (let j = 0; j < 3; j++) {
      const a = j * TAU / 3;
      this.cylinder(this.rotor, .0011, .156, [0, .0034 * Math.sin(a), .0034 * Math.cos(a)], M.black, 'x', 16);
    }
    for (const x of [-.088, .088]) {
      this.box(this.interior, [.005, .099, .01], [x, .12, z], M.black, { radius: .0015 });
      this.cylinder(this.interior, .0068, .0055, [x, y, z], M.brass);
      this.cylinder(this.interior, .0043, .006, [x, y, z], M.steel);
    }
    // Two guide rails follow the actual tip trajectory, outside each card.
    for (const x of [-.0754, .0754]) {
      const points = [];
      for (let j = 0; j < 1920; j++) {
        const p = leafPose(0, j / 1920 * DIM.count, DIM);
        points.push(new THREE.Vector3(x, p.tipY, p.tipZ));
      }
      const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
      const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 2000, .0004, 6, true), M.black);
      rail.castShadow = true; this.interior.add(rail);
    }
    // A rear pickup cam, top guide, and lower stop are visible in the open view.
    const topMount = leafPose(0, -.25, DIM), rearMount = leafPose(0, DIM.count / 2, DIM);
    for (const sign of [-1, 1]) {
      this.box(this.interior, [.0242, .0015, .003], [sign * .0879, topMount.tipY, topMount.tipZ], M.brass, { radius: .0003 });
      this.box(this.interior, [.0152, .0015, .003], [sign * .0834, rearMount.tipY, rearMount.tipZ], M.brass, { radius: .0003 });
      this.box(this.interior, [.003, .0015, DIM.radius], [sign * .088, rearMount.tipY, DIM.axisZ - DIM.radius / 2], M.black);
    }
    // The lower portion of the cam is the stop; no fixed crossbar cuts through
    // the hanging pages when a different cartridge radius is installed.
    // Direct coaxial motor avoids decorative gears with inconsistent engagement.
    this.cylinder(this.interior, .011, .012, [.088, y, z], M.dark);
    this.knob = new THREE.Group(); this.knob.position.set(.111, y, z); this.group.add(this.knob);
    const wheel = this.cylinder(this.knob, .0135, .009, [0, 0, 0], M.black); this.knobWheel = wheel;
    wheel.userData.action = 'step';
    for (let j = 0; j < 32; j++) {
      const a = TAU * j / 32;
      this.cylinder(this.knob, .00055, .0092, [0, .0133 * Math.cos(a), .0133 * Math.sin(a)], M.steel, 'x', 6);
    }
    const indicator = this.box(this.knob, [.001, .008, .0015], [.0051, .004, 0], M.brass, { radius: .0003 });
    indicator.userData.action = 'step';
  }
  buildCabinet({ rounded = false, material = this.materials.wood } = {}) {
    const DIM = this.dim;
    const M = this.materials, g = this.shellGroup, radius = rounded ? .003 : .0005;
    this.removable = new THREE.Group(); g.add(this.removable);
    this.box(g, [DIM.caseWidth, .009, .14], [0, .0045, -.001], material, { radius, collider: true });
    this.box(this.removable, [DIM.caseWidth, .008, .14], [0, .26, -.001], material, { radius, collider: true });
    for (const x of [-.100, .100]) {
      const side = new THREE.Shape();
      side.moveTo(-.069, .008); side.lineTo(.071, .008); side.lineTo(.071, .26); side.lineTo(-.069, .26); side.closePath();
      const hole = new THREE.Path(); hole.absarc(-DIM.axisZ, DIM.axisY, .004, 0, TAU, true); side.holes.push(hole);
      const geometry = new THREE.ExtrudeGeometry(side, { depth: .008, bevelEnabled: false, curveSegments: 32 });
      geometry.translate(0, 0, -.004); geometry.rotateY(Math.PI / 2);
      const wall = new THREE.Mesh(geometry, material); wall.position.x = x; wall.castShadow = wall.receiveShadow = true; this.removable.add(wall);
      this.colliders.push({ size: [.008, .252, .14], position: [x, .134, -.001] });
    }
    this.box(this.removable, [.192, .252, .006], [0, .134, DIM.backZ], material, { radius, collider: true });
    // The front has a real aperture, not a dark plane with fake holes.
    this.box(g, [.208, .024, .008], [0, .252, .065], material, { radius, collider: true });
    for (const sign of [-1, 1]) this.box(g, [DIM.caseWidth / 2 - DIM.windowHalfWidth, DIM.windowTop - DIM.windowBottom, .008], [sign * (DIM.caseWidth / 2 + DIM.windowHalfWidth) / 2, (DIM.windowTop + DIM.windowBottom) / 2, .065], material, { radius, collider: true });
    this.box(g, [.208, DIM.windowBottom - .071, .008], [0, (DIM.windowBottom + .071) / 2, .065], material, { radius: .0004, collider: true });
    const lowerTop = .071, lowerBottom = .009, slotUpper = DIM.slotY + DIM.slotHeight / 2, slotLower = DIM.slotY - DIM.slotHeight / 2;
    const sideWidth = (DIM.caseWidth - DIM.slotWidth) / 2;
    for (const sign of [-1, 1]) {
      this.box(g, [sideWidth, lowerTop - lowerBottom, .008], [sign * (DIM.slotWidth / 2 + sideWidth / 2), (lowerTop + lowerBottom) / 2, .065], material, { radius: .0002, collider: true });
    }
    this.box(g, [DIM.slotWidth, lowerTop - slotUpper, .008], [0, (lowerTop + slotUpper) / 2, .065], material, { radius: .0002, collider: true });
    this.box(g, [DIM.slotWidth, slotLower - lowerBottom, .008], [0, (slotLower + lowerBottom) / 2, .065], material, { radius: .0002, collider: true });
    // The coin rests on its edge, supported by a guide ledge aligned to the slit.
    this.box(g, [.024, .004, .042], [0, .039, .085], M.steel, { radius: .0008, collider: true });
    for (const x of [-.004, .004]) this.box(g, [.002, .004, .030], [x, .043, .089], M.black, { radius: .0003, collider: true });
    const plaqueMat = new THREE.MeshStandardMaterial({ map: textTexture('くるみの貯金箱', { background: rounded ? '#8da99d' : '#b28658', color: rounded ? '#263c37' : '#50331f', font: '600 39px sans-serif' }), roughness: .7 });
    this.box(g, [.074, .022, .0005], [0, .024, .0693], plaqueMat, { radius: .001 });
    for (const x of [-.086, .086]) for (const y of [.018, .251]) {
      const screw = this.cylinder(g, .0024, .0012, [x, y, .07], M.steel, 'z', 16);
      this.box(g, [.0027, .0004, .0003], [x, y, .0708], M.dark);
      screw.castShadow = false;
    }
    for (const x of [-.079, .079]) for (const z of [-.05, .05]) this.cylinder(g, .008, .004, [x, .002, z], M.dark, 'y');
    this.buildChute(g);
    this.buildBackPattern(this.removable, rounded
      ? { ink: '#426b61', accent: '#edf3df', coin: '#cbdba4' }
      : { ink: '#795032', accent: '#a67543', coin: '#d9b276' });
  }
  buildBackPattern(parent, colors) {
    const print = new THREE.Mesh(new THREE.PlaneGeometry(.142, .192), new THREE.MeshStandardMaterial({
      map: cabinetBackTexture(colors), transparent: true, depthWrite: false, roughness: .85,
    }));
    print.position.set(0, .132, -.07308); print.rotation.y = Math.PI; print.name = 'back-pattern'; parent.add(print);
  }
  buildChute(parent) {
    const DIM = this.dim;
    const M = this.materials;
    this.box(parent, [.033, .002, .076], [0, .0228, .01], M.black, { collider: true, rotateX: -.44 });
    for (const x of [-.0185, .0185]) this.box(parent, [.003, .009, .076], [x, .0278, .01], M.brass, { collider: true, rotateX: -.44 });
    this.box(parent, [.165, .002, .105], [0, .011, -.012], M.black, { collider: true });
    for (const x of [-.084, .084]) this.box(parent, [.002, .042, .104], [x, .032, -.012], M.black, { collider: true });
    this.box(parent, [.17, .042, .002], [0, .032, -.065], M.black, { collider: true });
    // Sensor bracket straddles, rather than blocks, the coin path.
    for (const x of [-.022, .022]) this.box(parent, [.004, .01, .006], [x, .041, .035], M.black);
    this.box(parent, [.0006, .0014, .002], [-.0198, .043, .035], new THREE.MeshBasicMaterial({ color: '#b9d079' }));
  }
  buildRoundedCabinet() {
    const D = this.dim, M = this.materials, g = this.shellGroup;
    this.removable = new THREE.Group(); g.add(this.removable);
    const panel = (parent, shape, depth, position, material, name) => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position);
      mesh.castShadow = mesh.receiveShadow = true; mesh.name = name; parent.add(mesh); return mesh;
    };
    // Continuous 14 mm corners in the silhouette, with an 8 mm hollow wall.
    // The top, side walls and back lift away together to reveal the real mechanism.
    this.box(g, [.180, .009, .140], [0, .0045, -.001], M.cream, { radius: .0004 });
    this.box(this.removable, [.180, .008, .140], [0, .260, -.001], M.cream, { radius: .0004 });
    for (const [x, y, a, parent] of [
      [.090, .250, 0, this.removable], [-.090, .250, Math.PI / 2, this.removable],
      [-.090, .014, Math.PI, g], [.090, .014, Math.PI * 1.5, g],
    ]) {
      const corner = new THREE.Shape();
      corner.absarc(x, y, .014, a, a + Math.PI / 2, false);
      corner.absarc(x, y, .006, a + Math.PI / 2, a, true); corner.closePath();
      panel(parent, corner, .140, [0, 0, -.071], M.cream, 'rounded-shell-corner');
    }
    for (const x of [-.100, .100]) {
      const side = roundedPanel(-.069, .014, .140, .236, .001);
      const axleHole = new THREE.Path(); axleHole.absarc(-D.axisZ, D.axisY, .004, 0, TAU, true); side.holes.push(axleHole);
      const wall = panel(this.removable, side, .008, [x, 0, 0], M.cream, 'rounded-shell-side');
      wall.geometry.translate(0, 0, -.004); wall.geometry.rotateY(Math.PI / 2);
      const print = new THREE.Mesh(new THREE.PlaneGeometry(.122, .208), new THREE.MeshStandardMaterial({
        map: cabinetPrintTexture(), transparent: true, depthWrite: false, roughness: .72, polygonOffset: true, polygonOffsetFactor: -1,
      }));
      print.rotation.y = Math.sign(x) * Math.PI / 2; print.position.set(Math.sign(x) * .10405, .126, -.001);
      this.removable.add(print);
    }
    panel(this.removable, roundedPanel(-.104, 0, .208, .264, .014), .006, [0, 0, -.073], M.cream, 'rounded-shell-back');
    const face = roundedPanel(-.104, 0, .208, .264, .014);
    face.holes.push(roundedPanel(-D.windowHalfWidth, D.windowBottom, D.windowHalfWidth * 2, D.windowTop - D.windowBottom, .004, THREE.Path));
    // Keep the slit straight and exactly sized for the upright coin.
    face.holes.push(roundedPanel(-D.slotWidth / 2, D.slotY - D.slotHeight / 2, D.slotWidth, D.slotHeight, 0, THREE.Path));
    panel(g, face, .008, [0, 0, .061], M.cream, 'rounded-shell-front');
    const bezel = roundedPanel(-D.windowHalfWidth - .003, D.windowBottom - .003, D.windowHalfWidth * 2 + .006, D.windowTop - D.windowBottom + .006, .007);
    bezel.holes.push(roundedPanel(-D.windowHalfWidth, D.windowBottom, D.windowHalfWidth * 2, D.windowTop - D.windowBottom, .004, THREE.Path));
    panel(g, bezel, .0006, [0, 0, .06905], M.rose, 'rose-window-bezel');
    const band = new THREE.Mesh(new THREE.PlaneGeometry(.136, .008), new THREE.MeshStandardMaterial({ map: cabinetPrintTexture({ band: true }), transparent: true, depthWrite: false, roughness: .7 }));
    band.position.set(0, .2515, .06908); g.add(band);
    // Same internal coin contact surfaces as the original cabinet. Rounded
    // exterior corners lie outside both the stored coins and the leaf sweep.
    this.colliders.push(
      { size: [D.caseWidth, .009, .14], position: [0, .0045, -.001], rotateX: 0 },
      { size: [D.caseWidth, .008, .14], position: [0, .26, -.001], rotateX: 0 },
      ...[-.100, .100].map(x => ({ size: [.008, .252, .14], position: [x, .134, -.001] })),
      { size: [.192, .252, .006], position: [0, .134, D.backZ], rotateX: 0 },
      { size: [.208, .024, .008], position: [0, .252, .065], rotateX: 0 },
      ...[-1, 1].map(sign => ({ size: [D.caseWidth / 2 - D.windowHalfWidth, D.windowTop - D.windowBottom, .008], position: [sign * (D.caseWidth / 2 + D.windowHalfWidth) / 2, (D.windowTop + D.windowBottom) / 2, .065], rotateX: 0 })),
      { size: [.208, D.windowBottom - .071, .008], position: [0, (D.windowBottom + .071) / 2, .065], rotateX: 0 },
    );
    const sideWidth = (D.caseWidth - D.slotWidth) / 2, slotUpper = D.slotY + D.slotHeight / 2, slotLower = D.slotY - D.slotHeight / 2;
    for (const sign of [-1, 1]) this.colliders.push({ size: [sideWidth, .062, .008], position: [sign * (D.slotWidth / 2 + sideWidth / 2), .040, .065], rotateX: 0 });
    this.colliders.push(
      { size: [D.slotWidth, .071 - slotUpper, .008], position: [0, (.071 + slotUpper) / 2, .065], rotateX: 0 },
      { size: [D.slotWidth, slotLower - .009, .008], position: [0, (slotLower + .009) / 2, .065], rotateX: 0 },
    );
    this.box(g, [.024, .004, .042], [0, .039, .085], M.steel, { radius: .0008, collider: true });
    for (const x of [-.004, .004]) this.box(g, [.002, .004, .030], [x, .043, .089], M.rose, { radius: .0003, collider: true });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(.074, .020), new THREE.MeshStandardMaterial({
      map: textTexture('くるみの貯金箱', { background: '#f4dbb1', color: '#b96588', font: '600 39px sans-serif' }), roughness: .7,
    }));
    plaque.position.set(0, .023, .06907); g.add(plaque);
    for (const x of [-.092, .092]) for (const y of [.025, .251]) {
      this.cylinder(g, .0015, .0005, [x, y, .0693], M.steel, 'z', 16);
      this.box(g, [.0018, .0003, .00015], [x, y, .06962], M.dark);
    }
    this.buildBackPattern(this.removable);
    this.buildChute(g);
  }
  setShell(id) {
    const factory = shellFactories.get(id);
    if (!factory) throw new Error('没有找到这个箱体。');
    this.shellGroup.traverse(o => {
      if (o.isMesh) { o.geometry.dispose(); if (!Object.values(this.materials).includes(o.material)) { o.material.map?.dispose(); o.material.dispose(); } }
    });
    this.shellGroup.clear(); this.colliders = []; factory(this);
    this.knobWheel.material = id === 'cream' ? this.materials.rose : id === 'mint' ? this.materials.mint : this.materials.black;
    this.removable.visible = !this.open; this.shellId = id;
  }
  setOpen(open) { this.open = open; this.removable.visible = !open; }
  buildCoin() {
    const DIM = this.dim;
    const M = this.materials;
    this.coinPrototype = new THREE.Group();
    this.cylinder(this.coinPrototype, DIM.coinRadius, DIM.coinThickness, [0, 0, 0], M.brass, 'y', 64);
    const face = document.createElement('canvas'); face.width = face.height = 128;
    const ctx = face.getContext('2d'); ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#70552c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '500 79px Georgia'; ctx.fillText('1', 64, 69);
    const mat = new THREE.MeshStandardMaterial({ map: canvasTexture(face), transparent: true, metalness: .5, roughness: .5, depthWrite: false });
    for (const sign of [-1, 1]) {
      const print = new THREE.Mesh(new THREE.PlaneGeometry(.018, .018), mat);
      print.rotation.x = -sign * Math.PI / 2; print.position.y = sign * .001035; this.coinPrototype.add(print);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.0102, .0003, 6, 48), M.brass);
      ring.rotation.x = Math.PI / 2; ring.position.y = sign * .001; this.coinPrototype.add(ring);
    }
    for (let j = 0; j < 48; j++) {
      const a = TAU * j / 48;
      this.box(this.coinPrototype, [.00025, .0018, .0003], [DIM.coinRadius * Math.cos(a), 0, DIM.coinRadius * Math.sin(a)], M.brass);
    }
    this.readyCoin = this.newCoin(); this.readyCoin.position.set(0, DIM.slotY, .09); this.readyCoin.rotation.z = Math.PI / 2;
    this.readyCoin.traverse(o => { if (o.isMesh) o.userData.action = 'coin'; });
  }
  newCoin() { const coin = this.coinPrototype.clone(true); this.group.add(coin); return coin; }
  replaceReadyCoin() {
    const DIM = this.dim;
    this.readyCoin = this.newCoin(); this.readyCoin.position.set(0, DIM.slotY, .09); this.readyCoin.rotation.z = Math.PI / 2;
    this.readyCoin.traverse(o => { if (o.isMesh) o.userData.action = 'coin'; });
    return this.readyCoin;
  }
  update(position) {
    const DIM = this.dim;
    this.position = position;
    this.leaves.forEach((leaf, i) => {
      const p = leafPose(i, position, DIM);
      leaf.group.position.set(0, p.y, p.z); leaf.group.rotation.x = p.angle;
    });
    this.rotor.rotation.x = position * TAU / DIM.count;
    this.knob.rotation.x = position * TAU / DIM.count;
  }
  get page() { return mod(Math.round(this.position), this.dim.count); }
  get pickable() { return [this.readyCoin, this.knob]; }
}

registerShell('wood', (machine) => machine.buildCabinet());
registerShell('mint', (machine) => machine.buildCabinet({ rounded: true, material: machine.materials.mint }));
registerShell('cream', (machine) => machine.buildRoundedCabinet());
