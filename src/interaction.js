import * as THREE from 'three';

// Enlarge the finger target in screen pixels, independently of model zoom.
// A coin hidden behind the cabinet must still leave camera gestures alone.
export function touchCoinHit(event, coin, camera, root, rect) {
  if (!['touch', 'pen'].includes(event.pointerType) || !rect.width || !rect.height) return false;
  if (event.clientX < rect.left || event.clientX > rect.left + rect.width || event.clientY < rect.top || event.clientY > rect.top + rect.height) return false;
  const projected = coin.getWorldPosition(new THREE.Vector3()).project(camera);
  if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) return false;
  const x = rect.left + (projected.x + 1) * rect.width / 2;
  const y = rect.top + (1 - projected.y) * rect.height / 2;
  if (Math.hypot(event.clientX - x, event.clientY - y) > 28) return false;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(projected.x, projected.y), camera);
  const first = ray.intersectObject(root, true).find(hit => {
    for (let object = hit.object; object; object = object.parent) if (!object.visible) return false;
    return true;
  });
  for (let object = first?.object; object; object = object.parent) if (object === coin) return true;
  return false;
}
