import './style.css';
import '@fontsource/m-plus-1/latin-600.css';
import '@fontsource/m-plus-1/latin-800.css';
import '@fontsource/cherry-bomb-one/400.css';
import './official-style.css';
import { ToyPresentation } from './presentation.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DIM, clamp, mod, smooth5, planRotation, sampleRotation, randomPage } from './mechanism.js';
import { FlipMachine, registerShell } from './machine.js';
import { CoinPhysics } from './physics.js';
import { createPageTextures } from './textures.js';
import { KURUMI_THEME, validateTheme } from './themes.js';
import { ToySound } from './sound.js';
import { characterMood, characterLine, MARKET_COLORS } from './story.js';

const $ = (id) => document.getElementById(id);
const icons = {
  sound: '<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="m16 9 5 6m0-6-5 6"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  front: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 14h16m-10 4h4"/>',
  inside: '<path d="m12 3 8 5v8l-8 5-8-5V8l8-5zM4 8l8 5 8-5m-8 5v8"/>',
  slow: '<circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
$('sound').innerHTML = svg('mute'); $('settings').innerHTML = svg('settings');
$('front').innerHTML = `${svg('front')}正面`;
$('inside').innerHTML = `${svg('inside')}偷看一下`;
$('slow').innerHTML = `${svg('slow')}慢慢翻`;
$('reload').addEventListener('click', () => location.reload());
$('about').addEventListener('click', () => $('about-dialog').showModal());
$('settings').addEventListener('click', () => $('settings-dialog').showModal());
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', (event) => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
}

const audio = new ToySound();
$('sound').addEventListener('click', async () => {
  try {
    await audio.setEnabled(!audio.enabled);
    $('sound').innerHTML = svg(audio.enabled ? 'sound' : 'mute');
    $('sound').setAttribute('aria-pressed', String(audio.enabled));
    $('sound').setAttribute('aria-label', audio.enabled ? '关闭声音' : '开启声音');
    audio.click();
  } catch { $('announcement').textContent = '这个浏览器暂时无法开启声音。'; }
});

async function start() {
  const viewport = $('viewport');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { $('loading').hidden = true; $('fallback').hidden = false; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  viewport.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .004, 10);
  const desktopPosition = new THREE.Vector3(.14, .25, .63);
  camera.position.copy(desktopPosition);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, .112, .021); controls.enableDamping = true; controls.dampingFactor = .085;
  controls.enablePan = false; controls.minDistance = .29; controls.maxDistance = .82;
  controls.minPolarAngle = .06; controls.maxPolarAngle = Math.PI - .06;
  controls.rotateSpeed = .75; controls.zoomSpeed = .7;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE; controls.update();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment(); const env = pmrem.fromScene(room, .05); scene.environment = env.texture;
  room.dispose(); pmrem.dispose(); scene.environmentIntensity = .60;
  scene.add(new THREE.HemisphereLight('#e5f2ff', '#b491a3', .7));
  const key = new THREE.DirectionalLight('#fff1e3', 2.1); key.position.set(-.28, .58, .42);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -.35; key.shadow.camera.right = key.shadow.camera.top = .35;
  key.shadow.camera.near = .02; key.shadow.camera.far = 1.3;
  key.shadow.normalBias = .00025; key.shadow.bias = -.00001; scene.add(key);
  const rim = new THREE.DirectionalLight('#a6c8f0', 1.3); rim.position.set(.36, .34, -.35); scene.add(rim);
  const fill = new THREE.DirectionalLight('#ffffff', .4); fill.position.set(.02, .22, .6); scene.add(fill);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.18, .184, .009, 96), new THREE.MeshStandardMaterial({ color: '#faf1d8', roughness: .7, metalness: .2 }));
  base.position.y = -.005; base.receiveShadow = true; scene.add(base);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(.1802, .00035, 6, 96), new THREE.MeshStandardMaterial({ color: '#d594ab', metalness: .7, roughness: .4 }));
  baseRing.rotation.x = Math.PI / 2; baseRing.position.y = -.00045; scene.add(baseRing);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.ShadowMaterial({ opacity: .12 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.011; shadow.receiveShadow = true; scene.add(shadow);
  let theme = KURUMI_THEME;
  const pages = await createPageTextures(theme);
  const machine = new FlipMachine(scene, pages);
  const physics = await CoinPhysics.create(machine.colliders);
  let state = 'idle', position = 0, activePlan = null, elapsed = 0, insertion = null;
  let slow = false, cameraMotion = null, previousTime = performance.now(), hidden = false;
  let acceptedCount = 0, observedPages = new Set(), clickIndex = 0, userPages = [];
  let transitionBusy = false;
  let shownValue = NaN, ledgerMood = -1, speechTime = -1, simTime = 0, lastMarketPage = 0, impactTime = -10, impactTimer;
  const lastImpactByKind = { gain: -10, loss: -10 };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const presentation = new ToyPresentation(theme, reducedMotion);
  const announce = (text) => { $('announcement').textContent = text; };
  function showSpeech(value, finished = false) {
    if (theme.id !== 'kurumi') return;
    const mood = characterMood(value);
    if (finished || (mood !== ledgerMood && simTime - speechTime > .28)) {
      $('quote').textContent = characterLine(value, { peeking: machine.open && state === 'idle', coins: acceptedCount, finished });
      speechTime = simTime; ledgerMood = mood;
    }
  }
  function updateLedger(value, finished = false) {
    const rounded = Math.round(value);
    if (rounded !== shownValue) {
      $('result-card').dataset.kind = rounded > 0 ? 'gain' : rounded < 0 ? 'loss' : 'flat';
      $('result-value').innerHTML = `${rounded >= 0 ? '+' : '−'}${Math.abs(rounded)}<span>%</span>`;
      $('result-value').dataset.value = String(rounded);
      $('state-label').textContent = rounded >= 0 ? '模拟浮盈' : '模拟浮亏';
      shownValue = rounded;
    }
    showSpeech(rounded, finished);
  }
  function impact(kind, word, force = false) {
    if (!force && simTime - lastImpactByKind[kind] < .75) return;
    lastImpactByKind[kind] = simTime;
    impactTime = simTime;
    $('impact').textContent = word; $('impact').dataset.kind = kind;
    $('impact').classList.remove('hit'); void $('impact').offsetWidth; $('impact').classList.add('hit');
    clearTimeout(impactTimer);
    impactTimer = setTimeout(() => { $('impact').classList.remove('hit'); $('impact').textContent = ''; }, 720);
    if (kind === 'loss') audio.crash(); else audio.gain();
  }
  function displayState(next, page = null) {
    state = next; viewport.dataset.state = next; viewport.setAttribute('aria-busy', String(next !== 'idle'));
    $('insert').disabled = next !== 'idle' || transitionBusy;
    $('insert-label').textContent = next === 'idle' ? (acceptedCount ? '再来一枚' : '投币') : '拜托了…';
    if (next === 'inserting') $('quote').textContent = theme.id === 'kurumi' ? '这次，一定赚回来。' : '转到哪一张呢？';
    if (next === 'idle') {
      page ||= theme.pages[machine.page];
      if (Number.isFinite(page.value)) updateLedger(page.value, true);
      else {
        $('result-card').dataset.kind = 'flat'; $('result-value').textContent = String(machine.page + 1).padStart(2, '0');
        $('state-label').textContent = '停在这一页'; $('quote').textContent = page.label || '就这一张！';
      }
      $('result-note').textContent = page.note || page.label || '';
    }
  }
  function startRotation(target, manual = false) {
    presentation.closeLoss();
    activePlan = planRotation(position, target, { count: machine.dim.count, peakRate: manual ? 1.6 : 10, fullTurn: false, minimumSteps: 8, minimumDuration: manual ? 0 : 8 });
    if (manual) { activePlan.steps = 1; activePlan.end = position + 1; activePlan.duration = 1.2; }
    elapsed = 0; clickIndex = Math.floor(position); lastMarketPage = machine.page;
    displayState(manual ? 'manual' : 'spinning');
  }
  function insertCoin(fromZ = machine.readyCoin.position.z) {
    if (state !== 'idle' || transitionBusy) return false;
    if (physics.coins.length >= 32) { announce('硬币仓已经装满了。在设置中可以重新开始。'); $('quote').textContent = '小金库装满了！'; return false; }
    controls.enabled = true; presentation.closeLoss();
    insertion = { mesh: machine.readyCoin, fromZ, elapsed: 0, released: false, target: randomPage(machine.dim.count, Math.random, theme.stopWeights) };
    displayState('inserting'); return true;
  }
  $('insert').addEventListener('click', () => insertCoin());
  $('loss-peek').addEventListener('click', () => {
    presentation.closeLoss();
    if (!machine.open) $('inside').click();
    else if (state === 'idle') showSpeech(theme.pages[machine.page].value, true);
  });
  $('inside').addEventListener('click', () => {
    machine.setOpen(!machine.open);
    if (state === 'idle' && Number.isFinite(theme.pages[machine.page].value)) showSpeech(theme.pages[machine.page].value, true);
    $('inside').setAttribute('aria-pressed', String(machine.open));
    $('inside').innerHTML = `${svg('inside')}${machine.open ? '合上盖子' : '偷看一下'}`;
  });
  $('slow').addEventListener('click', () => {
    slow = !slow; $('slow').setAttribute('aria-pressed', String(slow));
    $('slow').innerHTML = `${svg('slow')}${slow ? '恢复速度' : '慢慢翻'}`;
  });
  $('front').addEventListener('click', () => {
    cameraMotion = { from: camera.position.clone(), to: new THREE.Vector3(0, .22, .60), elapsed: 0 };
    controls.target.set(0, .112, .024);
  });
  viewport.addEventListener('keydown', (event) => {
    if (event.key === ' ' && !event.repeat) { event.preventDefault(); insertCoin(); }
    if (event.key === 'Enter' && !event.repeat && state === 'idle' && !transitionBusy) { event.preventDefault(); startRotation(mod(Math.round(position) + 1, machine.dim.count), true); }
    const angular = .13;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); controls.rotateLeft(event.key === 'ArrowLeft' ? angular : -angular); controls.update();
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault(); controls.rotateUp(event.key === 'ArrowUp' ? angular : -angular); controls.update();
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === ' ' && !event.repeat && !document.querySelector('dialog[open]') && !['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) { event.preventDefault(); insertCoin(); }
  });
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let coinDrag = null, pressed = null;
  const rayAt = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera); return raycaster;
  };
  const pickedAction = (event) => {
    const hits = rayAt(event).intersectObject(machine.group, true).filter(hit => {
      let object = hit.object;
      while (object) { if (!object.visible) return false; object = object.parent; }
      return true;
    });
    return hits[0]?.object.userData.action;
  };
  machine.knob.traverse(o => { if (o.isMesh) o.userData.action = 'step'; });
  // Capture-phase arbitration gives the physical coin priority over the orbit camera.
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || state !== 'idle' || transitionBusy) return;
    const action = pickedAction(event);
    if (!action) return;
    pressed = { action, x: event.clientX, y: event.clientY, id: event.pointerId };
    if (action === 'coin') {
      controls.enabled = false; event.stopImmediatePropagation(); renderer.domElement.setPointerCapture(event.pointerId);
      coinDrag = { id: event.pointerId, fromZ: machine.readyCoin.position.z, downX: event.clientX, downY: event.clientY, moved: false };
    }
  }, true);
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (coinDrag && event.pointerId === coinDrag.id) {
      const distance = Math.hypot(event.clientX - coinDrag.downX, event.clientY - coinDrag.downY);
      coinDrag.moved ||= distance > 4;
      const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DIM.slotY);
      const hit = rayAt(event).ray.intersectPlane(dragPlane, new THREE.Vector3());
      if (hit) machine.readyCoin.position.z = clamp(hit.z, .052, .09);
      renderer.domElement.style.cursor = 'grabbing'; event.stopImmediatePropagation(); return;
    }
    if (state !== 'idle') { renderer.domElement.style.cursor = 'grab'; return; }
    renderer.domElement.style.cursor = pickedAction(event) ? 'pointer' : 'grab';
  }, true);
  function endPointer(event, cancelled = false) {
    if (coinDrag?.id === event.pointerId) {
      controls.enabled = true;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      if (!cancelled && (!coinDrag.moved || machine.readyCoin.position.z < .066)) insertCoin(machine.readyCoin.position.z);
      else {
        // The ledge supports an unfinished insertion; keep the coin where released.
        // No snapping back or teleporting after an incomplete gesture.
      }
      coinDrag = null; renderer.domElement.style.cursor = 'grab'; event.stopImmediatePropagation();
    } else if (pressed?.id === event.pointerId && !cancelled && pressed.action === 'step' && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < 5 && state === 'idle') startRotation(mod(Math.round(position) + 1, machine.dim.count), true);
    pressed = null;
  }
  renderer.domElement.addEventListener('pointerup', e => endPointer(e), true);
  renderer.domElement.addEventListener('pointercancel', e => endPointer(e, true), true);
  controls.addEventListener('start', () => { cameraMotion = null; });

  async function setTheme(next) {
    if (state !== 'idle' || transitionBusy) throw new Error('请等当前翻页停好，再换画页。');
    validateTheme(next); transitionBusy = true; $('insert').disabled = true;
    try {
      const textures = await createPageTextures(next); machine.setPages(textures); theme = next; observedPages = new Set(); position = mod(Math.round(position), machine.dim.count); machine.update(position);
      shownValue = NaN; ledgerMood = -1; presentation.setTheme(next);
      $('collection-label').textContent = `0 / ${machine.dim.count} 个结果`;
      document.querySelector('.stage-caption').textContent = next.name || '新的翻页故事';
      document.querySelector('.edition').textContent = next.id === 'kurumi' ? '01 / KURUMI EDITION' : '02 / YOUR EDITION';
      document.querySelector('.panel-intro p').textContent = next.id === 'kurumi' ? '投一枚硬币，让久留美翻到今天属于她的那一页。' : '投一枚硬币，让小箱子翻到你的下一张画页。';
      displayState('idle', theme.pages[machine.page]);
    } finally { transitionBusy = false; $('insert').disabled = false; }
  }
  for (const button of document.querySelectorAll('[data-shell]')) {
    button.addEventListener('click', () => {
      if (state !== 'idle') { $('upload-feedback').textContent = '请等当前翻页停好，再换箱体。'; return; }
      machine.setShell(button.dataset.shell);
      document.querySelectorAll('[data-shell]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
      $('upload-feedback').textContent = '';
    });
  }
  $('pages-upload').addEventListener('change', async (event) => {
    const files = [...event.target.files].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));
    if (files.length < 8 || files.length > 24) { $('upload-feedback').textContent = '请选 8–24 张图片。'; event.target.value = ''; return; }
    if (files.some(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 15 * 1024 * 1024)) { $('upload-feedback').textContent = '请使用每张不超过 15 MB 的 PNG、JPG 或 WebP 图片。'; event.target.value = ''; return; }
    const urls = files.map(f => URL.createObjectURL(f));
    try {
      $('upload-feedback').textContent = '正在换画页…';
      await setTheme({ id: 'custom', name: '你的翻页故事', pages: urls.map((image, i) => ({ image, label: files[i].name, note: `停在第 ${i + 1} 张：${files[i].name}` })) });
      userPages.forEach(URL.revokeObjectURL); userPages = urls;
      $('upload-feedback').textContent = `${files.length} 张画页，装好了。`;
    } catch (error) { urls.forEach(URL.revokeObjectURL); $('upload-feedback').textContent = error.message; }
    event.target.value = '';
  });
  $('restore').addEventListener('click', async () => {
    try { await setTheme(KURUMI_THEME); userPages.forEach(URL.revokeObjectURL); userPages = []; $('upload-feedback').textContent = '已经恢复久留美画页。'; }
    catch (error) { $('upload-feedback').textContent = error.message; }
  });
  $('restart').addEventListener('click', () => {
    if (state !== 'idle') { $('upload-feedback').textContent = '请等当前翻页结束，再重新开始。'; return; }
    physics.clear(); acceptedCount = 0; observedPages.clear();
    $('coin-count').textContent = '00'; $('collection-label').textContent = `0 / ${machine.dim.count} 个结果`;
    displayState('idle', theme.pages[machine.page]);
    $('upload-feedback').textContent = '已经清空硬币，重新开始。'; announce('已经重新开始。');
  });
  const resize = () => {
    const w = viewport.clientWidth, h = viewport.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(viewport); resize();
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden; previousTime = performance.now(); physics.clock = 0;
    if (hidden) audio.context?.suspend(); else if (audio.enabled) audio.context?.resume();
  });
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); hidden = true; $('fallback').hidden = false; $('insert').disabled = true;
    $('fallback').querySelector('p').textContent = '3D 画面暂时中断了，请重新打开。';
  });
  let lowFrameCount = 0, frameCount = 0;
  function tick(time) {
    requestAnimationFrame(tick);
    const wallDt = clamp((time - previousTime) / 1000, 0, .05); previousTime = time;
    if (hidden) return;
    const dt = wallDt * (slow ? .3 : 1); simTime += dt;
    if (insertion && !insertion.released) {
      insertion.elapsed += dt;
      const u = clamp(insertion.elapsed / .46);
      insertion.mesh.position.z = insertion.fromZ + (.042 - insertion.fromZ) * smooth5(u);
      if (u >= 1) {
        insertion.released = true; const pending = insertion;
        physics.release(pending.mesh, () => {
          acceptedCount++; $('coin-count').textContent = String(acceptedCount).padStart(2, '0'); audio.coin();
          startRotation(pending.target); insertion = null;
        });
      }
    }
    physics.step(dt);
    if (insertion?.released && state === 'inserting') {
      insertion.elapsed += dt;
      if (insertion.elapsed > 6) {
        $('result-note').textContent = '硬币还没经过感应器。可以打开侧盖看看。';
        $('insert-label').textContent = '等待硬币通过…';
      }
    }
    if (activePlan) {
      elapsed += dt; const sample = sampleRotation(activePlan, elapsed); position = sample.position;
      machine.update(position); $('progress').style.width = `${Math.round(sample.progress * 100)}%`;
      const page = mod(Math.floor(position), machine.dim.count);
      const currentPage = theme.pages[page], followingPage = theme.pages[(page + 1) % machine.dim.count];
      presentation.setPage(page);
      if (Number.isFinite(currentPage.value) && Number.isFinite(followingPage.value)) {
        const between = smooth5(position - Math.floor(position));
        updateLedger(currentPage.value + (followingPage.value - currentPage.value) * between);
        if (page !== lastMarketPage && state !== 'manual') {
          const previous = theme.pages[lastMarketPage].value;
          if (currentPage.value - previous < -65 && currentPage.value < -50) impact('loss', '等一下？！');
          else if (currentPage.value >= 95 && previous < 95) impact('gain', '涨了！！');
          lastMarketPage = page;
        }
      }

      $('page-label').textContent = `${String(page + 1).padStart(2, '0')} / ${machine.dim.count}`;
      const newClick = Math.floor(position + .97);
      if (newClick > clickIndex) { audio.click(.65); clickIndex = newClick; }
      if (sample.done) {
        position = activePlan.end; machine.update(position);
        const manual = state === 'manual'; activePlan = null; $('progress').style.width = '0%';
        const page = machine.page; $('page-label').textContent = `${String(page + 1).padStart(2, '0')} / ${machine.dim.count}`;
        if (!manual) {
          observedPages.add(page); $('collection-label').textContent = `${observedPages.size} / ${machine.dim.count} 个结果`;
          machine.replaceReadyCoin();
        }
        displayState('idle', theme.pages[page]);
        if (Number.isFinite(theme.pages[page].value) && theme.pages[page].value < -120) {
          impact('loss', '', true); presentation.showLoss();
        }
        announce(`停在第 ${page + 1} 页。${theme.pages[page].note || theme.pages[page].label || ''}`);
      }
    }
    if (cameraMotion) {
      cameraMotion.elapsed += wallDt; camera.position.lerpVectors(cameraMotion.from, cameraMotion.to, smooth5(cameraMotion.elapsed / .65));
      if (cameraMotion.elapsed >= .65) cameraMotion = null;
    }
    controls.update(wallDt);
    const shake = simTime - impactTime;
    if (!reducedMotion && shake >= 0 && shake < .22) {
      const original = camera.position.clone();
      camera.position.x += Math.sin(shake * 120) * .0015 * (1 - shake / .22);
      camera.position.y += Math.cos(shake * 90) * .001 * (1 - shake / .22);
      camera.lookAt(controls.target); renderer.render(scene, camera); camera.position.copy(original); camera.lookAt(controls.target);
    } else renderer.render(scene, camera);
    frameCount++;
    if (wallDt > .035) lowFrameCount++;
    if (frameCount === 150 && lowFrameCount > 60) { renderer.setPixelRatio(1); key.shadow.mapSize.set(512, 512); key.shadow.map?.dispose(); key.shadow.map = null; resize(); }
  }
  $('loading').hidden = true; renderer.domElement.style.cursor = 'grab'; displayState('idle');
  requestAnimationFrame(tick);
  // Public, framework-independent extension point. No Site service is required.
  window.flipBank = Object.freeze({
    setTheme, registerShell,
    setShell(id) { if (state !== 'idle') throw new Error('请等当前翻页结束。'); machine.setShell(id); document.querySelectorAll('[data-shell]').forEach(b => { const selected = b.dataset.shell === id; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)); }); },
    insertCoin,
    getSnapshot() { return { state, page: machine.page, count: machine.dim.count, phase: position, shell: machine.shellId, theme: theme.id, coins: physics.snapshot(), opened: machine.open }; },
  });
}

start().catch((error) => {
  console.error(error); $('loading').hidden = true; $('fallback').hidden = false;
  $('fallback').querySelector('p').textContent = '小箱子没有装好，请重新打开。';
});
