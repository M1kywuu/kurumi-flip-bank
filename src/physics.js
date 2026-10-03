import { DIM } from './mechanism.js';
let RAPIER;

export class CoinPhysics {
  static async create(specs) { RAPIER = (await import('@dimforge/rapier3d-compat')).default; await RAPIER.init(); return new CoinPhysics(specs); }
  constructor(specs) {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 120;
    this.world.integrationParameters.lengthUnit = 1;
    this.world.integrationParameters.numSolverIterations = 8;
    this.world.integrationParameters.maxCcdSubsteps = 4;
    this.coins = []; this.clock = 0;
    for (const spec of specs) {
      const collider = RAPIER.ColliderDesc.cuboid(...spec.size.map(x => x / 2)).setTranslation(...spec.position).setFriction(.18).setRestitution(.16).setContactSkin(.00005);
      if (spec.rotateX) collider.setRotation({ x: Math.sin(spec.rotateX / 2), y: 0, z: 0, w: Math.cos(spec.rotateX / 2) });
      this.world.createCollider(collider);
    }
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(.5, .005, .5).setTranslation(0, -.008, 0).setFriction(.5));
    this.sensor = this.world.createCollider(RAPIER.ColliderDesc.cuboid(.018, .009, .003).setTranslation(0, .039, .034).setSensor(true));
    this.count = 0;
  }
  release(mesh, onAccepted) {
    const p = mesh.position;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setRotation(mesh.quaternion).setLinvel(0, -.015, -.07).setCcdEnabled(true).setLinearDamping(.08).setAngularDamping(.28).setCanSleep(true));
    const collider = this.world.createCollider(RAPIER.ColliderDesc.cylinder(DIM.coinThickness / 2, DIM.coinRadius).setMass(.007).setFriction(.18).setRestitution(.18).setContactSkin(.00004), body);
    const coin = { body, collider, mesh, accepted: false, age: 0, onAccepted, previous: { ...p }, previousRotation: { x: 0, y: 0, z: 0, w: 1 } };
    mesh.traverse(o => { o.userData.action = undefined; });
    this.coins.push(coin); return coin;
  }
  step(dt) {
    this.clock += Math.min(dt, .05);
    while (this.clock >= this.world.timestep) {
      for (const coin of this.coins) {
        const p = coin.body.translation(), r = coin.body.rotation();
        coin.previous = { x: p.x, y: p.y, z: p.z }; coin.previousRotation = { x: r.x, y: r.y, z: r.z, w: r.w };
        coin.age += this.world.timestep;
      }
      this.world.step();
      for (const coin of this.coins) {
        if (!coin.accepted && this.world.intersectionPair(this.sensor, coin.collider)) {
          coin.accepted = true; this.count++; coin.onAccepted?.(coin);
        }
      }
      this.clock -= this.world.timestep;
    }
    const alpha = this.clock / this.world.timestep;
    for (const coin of this.coins) {
      const p = coin.body.translation(), r = coin.body.rotation();
      coin.mesh.position.set(coin.previous.x + (p.x - coin.previous.x) * alpha, coin.previous.y + (p.y - coin.previous.y) * alpha, coin.previous.z + (p.z - coin.previous.z) * alpha);
      coin.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
  snapshot() {
    return this.coins.map(c => ({ position: { ...c.body.translation() }, speed: Math.hypot(...Object.values(c.body.linvel())), accepted: c.accepted, sleeping: c.body.isSleeping() }));
  }
  clear() {
    for (const coin of this.coins) { this.world.removeRigidBody(coin.body); coin.mesh.removeFromParent(); }
    this.coins = []; this.count = 0; this.clock = 0;
  }
}
