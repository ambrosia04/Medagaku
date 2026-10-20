/**
 * ======================================================================
 * MEDAKA GENETICS - Basin Rendering & Physics Engine (js/render.js)
 * ======================================================================
 */

(function () {
  const fishDOMMap = new Map(); // fish.id -> DOM element
  let animationFrameId = null;
  let lastFrameTime = performance.now();
  let listSortMode = 'value'; // 'value' | 'name'

  // ====================================================================
  // 1. ENGINE INITIALIZATION
  // ====================================================================

  window.initRenderLoop = function () {
    const layer = document.getElementById('medakaLayer');
    if (!layer) return;

    setupSidebarListEvents();
    renderSidebarFishList();

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(renderLoop);
  };

  // ====================================================================
  // 2. 60 FPS PHYSICS & ANIMATION LOOP
  // ====================================================================

  function renderLoop(currentTime) {
    animationFrameId = requestAnimationFrame(renderLoop);

    try {
      const dt = Math.max(0.001, Math.min((currentTime - lastFrameTime) / 1000, 0.1));
      lastFrameTime = currentTime;

      const aquarium = document.getElementById('aquarium');
      const layer = document.getElementById('medakaLayer');

      if (aquarium && layer) {
        const bounds = {
          width: aquarium.clientWidth || 800,
          height: aquarium.clientHeight || 620
        };

        const tank = getActiveTank();
        if (tank && Array.isArray(tank.fish)) {
          // --- SMOOTH REAL-TIME SUB-SECOND TIMERS ---
          const currentSpeed = (window.gameState && window.gameState.speed > 0) ? window.gameState.speed : 1;
          const advanceRate = dt * currentSpeed;

          for (let i = 0; i < tank.fish.length; i++) {
            const fish = tank.fish[i];

            // 1. Smooth Digestion
            if (fish.foodEaten > 0) {
              fish.digestionTimer = (fish.digestionTimer || 0) + advanceRate;
              if (fish.digestionTimer >= fish.digestionTime) {
                fish.foodEaten = Math.max(0, fish.foodEaten - 1);
                fish.digestionTimer = 0;
              }
            }

            // 2. Smooth Female Egg Cycle
            if (fish.isAdult && fish.gender === 'F') {
              if (fish.cycleStage === 'has_eggs') {
                fish.carryingEggs = true;
                fish.eggTimer = Math.max(0, (fish.eggTimer || 40) - advanceRate);
                if (fish.eggTimer <= 0) {
                  fish.cycleStage = 'dropping_eggs';
                  fish.dropDuration = 20;
                  fish.dropTimer = 20;
                }
              } else if (fish.cycleStage === 'dropping_eggs') {
                fish.carryingEggs = true;
                fish.dropTimer = Math.max(0, (fish.dropTimer || 20) - advanceRate);
                if (fish.dropTimer <= 0) {
                  fish.carryingEggs = false;
                  fish.cycleStage = 'resting';
                  fish.restDuration = Math.max(20, 45 - ((tank.plants && tank.plants.watersprite) || 0) * 8);
                  fish.restTimer = fish.restDuration;
                  if (typeof queueEggClutch === 'function') queueEggClutch(fish);
                }
              } else if (fish.cycleStage === 'resting' && (fish.restTimer || 0) > 0) {
                fish.carryingEggs = false;
                fish.restTimer = Math.max(0, fish.restTimer - advanceRate);
              }
            }
          }

          synchronizeFishDOM(layer, tank.fish);
          updateFishPhysics(tank.fish, bounds, dt);
          updateSpawningMediaVisuals(tank);

          // Update inspected progress bar smoothly at 60 FPS
          if (window.gameState && window.gameState.inspectedFishId && window.updateInspectedCardRealtime) {
            window.updateInspectedCardRealtime();
          }
        }
      }
    } catch (err) {
      console.error('RenderLoop error:', err);
    }
  }

  // ====================================================================
  // 3. FISH PHYSICS & FOOD-CHASING AI
  // ====================================================================

  function updateFishPhysics(fishList, bounds, dt) {
    const activePellets = window.activePellets || [];
    const rawSpeed = (window.gameState && window.gameState.speed > 0) ? window.gameState.speed : 1;

    // Cap visual movement multiplier so fish never hyper-glide or break bounds when dropping from 60x to 1x
    const speedMultiplier = Math.min(rawSpeed, 3);

    // If speed was just dropped from high speed, instantly dampen excessive momentum vectors
    if (rawSpeed <= 2) {
      for (let i = 0; i < fishList.length; i++) {
        const f = fishList[i];
        if (Math.abs(f.vx) > 80) f.vx *= 0.2;
        if (Math.abs(f.vy) > 80) f.vy *= 0.2;
      }
    }

    for (let i = 0; i < fishList.length; i++) {
      const fish = fishList[i];
      initPhysicsState(fish, bounds);

      // --- FOOD SEEKING AI ---
      let targetPellet = null;
      const isHungry = (fish.foodEaten || 0) < (fish.maxFood || 5);

      if (isHungry && activePellets.length > 0) {
        let minDist = 340;
        for (let p = 0; p < activePellets.length; p++) {
          const pellet = activePellets[p];
          if (pellet.eaten) continue;

          const dx = pellet.x - (fish.x + 45);
          const dy = pellet.y - (fish.y + 45);
          const dist = Math.hypot(dx, dy);

          if (dist < minDist) {
            minDist = dist;
            targetPellet = pellet;
          }
        }
      }

      // --- MOVEMENT CALCULATIONS ---
      if (targetPellet) {
        const dx = targetPellet.x - (fish.x + 45);
        const dy = targetPellet.y - (fish.y + 45);
        const angle = Math.atan2(dy, dx);

        const chaseSpeed = (fish.isAdult ? 145 : 105) * speedMultiplier;
        fish.vx = Math.cos(angle) * chaseSpeed;
        fish.vy = Math.sin(angle) * chaseSpeed;

        if (Math.hypot(dx, dy) < 22) {
          consumePellet(targetPellet, fish);
        }
      } else {
        fish.idleTimer -= dt * speedMultiplier;
        if (fish.idleTimer <= 0) {
          fish.idleTimer = 1.5 + Math.random() * 3.5;

          const baseSpeed = (fish.isAdult ? 35 : 25) + Math.random() * 30;
          const dirX = Math.random() < 0.5 ? -1 : 1;
          const dirY = (Math.random() - 0.5) * 0.8;

          fish.targetVx = dirX * baseSpeed * speedMultiplier;
          fish.targetVy = dirY * baseSpeed * speedMultiplier;

          // Surface bias: medaka naturally stay in upper 65% of water
          if (fish.y > bounds.height * 0.65) {
            fish.targetVy = -Math.abs(fish.targetVy) - 15;
          }
        }

        fish.vx += (fish.targetVx - fish.vx) * 3 * dt;
        fish.vy += (fish.targetVy - fish.vy) * 3 * dt;
      }

      // Integrate positions
      fish.x += fish.vx * dt;
      fish.y += fish.vy * dt;

      // Tail wiggle cadence
      fish.wigglePhase = (fish.wigglePhase || 0) + Math.hypot(fish.vx, fish.vy) * dt * 0.12;

      // Basin boundary clamping
      const padX = 10;
      const padTop = 30;
      const padBottom = 80;

      if (fish.x < padX) {
        fish.x = padX;
        fish.vx = Math.abs(fish.vx);
        fish.targetVx = Math.abs(fish.targetVx || 30);
      } else if (fish.x > bounds.width - 95) {
        fish.x = bounds.width - 95;
        fish.vx = -Math.abs(fish.vx);
        fish.targetVx = -Math.abs(fish.targetVx || 30);
      }

      if (fish.y < padTop) {
        fish.y = padTop;
        fish.vy = Math.abs(fish.vy);
        fish.targetVy = Math.abs(fish.targetVy || 10);
      } else if (fish.y > bounds.height - padBottom) {
        fish.y = bounds.height - padBottom;
        fish.vy = -Math.abs(fish.vy);
        fish.targetVy = -Math.abs(fish.targetVy || 10);
      }

      if (Math.abs(fish.vx) > 4) {
        fish.facingLeft = fish.vx < 0;
      }

      updateFishDOMTransform(fish);
    }
  }


  // Safe helper to always get the active tank without throwing
  function getActiveTank() {
    if (typeof window.getCurrentTank === 'function') {
      try { return window.getCurrentTank(); } catch (e) { }
    }
    if (window.gameState && window.gameState.tanks) {
      const id = window.gameState.currentTankId || 'tank1';
      return window.gameState.tanks[id] || window.gameState.tanks.tank1;
    }
    return null;
  }

  function initPhysicsState(fish, bounds) {
    const w = (bounds && bounds.width > 200) ? bounds.width : 800;
    const h = (bounds && bounds.height > 200) ? bounds.height : 620;

    if (fish.x === undefined || isNaN(fish.x)) {
      fish.x = 40 + Math.random() * (w - 180);
    }
    if (fish.y === undefined || isNaN(fish.y)) {
      fish.y = 50 + Math.random() * (h * 0.45);
    }
    // Enforce a minimum moving velocity so fish NEVER sit at 0 px/s
    if (fish.vx === undefined || isNaN(fish.vx) || Math.abs(fish.vx) < 15) {
      fish.vx = (Math.random() < 0.5 ? -1 : 1) * (28 + Math.random() * 24);
    }
    if (fish.vy === undefined || isNaN(fish.vy)) {
      fish.vy = (Math.random() - 0.5) * 16;
    }
    if (fish.targetVx === undefined || isNaN(fish.targetVx) || Math.abs(fish.targetVx) < 15) {
      fish.targetVx = fish.vx;
    }
    if (fish.targetVy === undefined || isNaN(fish.targetVy)) {
      fish.targetVy = fish.vy;
    }
    if (fish.idleTimer === undefined || isNaN(fish.idleTimer) || fish.idleTimer <= 0) {
      fish.idleTimer = 1.5 + Math.random() * 3;
    }
    if (fish.wigglePhase === undefined || isNaN(fish.wigglePhase)) {
      fish.wigglePhase = Math.random() * Math.PI * 2;
    }
    if (fish.facingLeft === undefined) {
      fish.facingLeft = fish.vx < 0;
    }
  }

  function consumePellet(pellet, fish) {
    pellet.eaten = true;
    fish.foodEaten = Math.min(fish.maxFood, fish.foodEaten + 1);

    if (window.rewardPelletEaten) {
      window.rewardPelletEaten(pellet.x, pellet.y, fish, pellet.tier);
    }
  }

  // ====================================================================
  // 4. DOM SYNCHRONIZATION & MODULAR SPRITE ATTACHMENT
  // ====================================================================

  function synchronizeFishDOM(layer, fishList) {
    const liveIds = new Set(fishList.map((f) => f.id));

    // Remove dead/sold fish from DOM
    for (const [id, element] of fishDOMMap.entries()) {
      if (!liveIds.has(id)) {
        if (element.parentNode) element.parentNode.removeChild(element);
        fishDOMMap.delete(id);
      }
    }

    // Add or refresh live fish
    for (let i = 0; i < fishList.length; i++) {
      const fish = fishList[i];
      let el = fishDOMMap.get(fish.id);

      if (!el) {
        el = createFishElement(fish);
        layer.appendChild(el);
        fishDOMMap.set(fish.id, el);
      } else if (!el.parentNode) {
        layer.appendChild(el); // Re-attach if tank was switched
      }

      // Automatically swap from translucent fry sprite to adult show sprite upon maturation
      const currentStage = fish.isAdult ? 'adult' : 'fry';
      if (el._renderedStage !== currentStage) {
        el._renderedStage = currentStage;
        const canvas = el.querySelector('.medaka-sprite-canvas');
        if (canvas && window.medakaRendererInstance) {
          window.medakaRendererInstance.buildFishSprite(fish).then((sprite) => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 144, 144);
            ctx.drawImage(sprite, 0, 0, 144, 144);
          });
        }
      }

      // Gravid female egg cluster visibility (adult females only)
      const eggCluster = el.querySelector('.vent-egg-cluster');
      if (eggCluster) {
        eggCluster.style.display = (fish.isAdult && fish.carryingEggs) ? 'block' : 'none';
      }

      applyFilterAndSelectionClasses(el, fish);
    }

  }

  function createFishElement(fish) {
    const el = document.createElement('div');
    el.className = 'medaka';
    el.id = `medaka_${fish.id}`;
    el.style.pointerEvents = 'auto';

    // Life stage scale classes
    if (!fish.isAdult) {
      el.classList.add(fish.age < 12 ? 'baby-medaka' : 'juvenile-medaka');
    }
    if (fish.bodyType === 'D' || fish.bodyType === 'HD') {
      el.classList.add('daruma');
    }
    if (fish.color === 'gfp') {
      el.classList.add('medaka-gfp-glow');
    }
    if (fish.color === 'fuchsia') {
      el.classList.add('medaka-fuchsia-glow');
    }


    // 144x144 Modular Canvas Container
    const canvas = document.createElement('canvas');
    canvas.className = 'medaka-sprite-canvas';
    canvas.width = 144;
    canvas.height = 144;
    el.appendChild(canvas);

    // Render composite sprite via medakaRendererInstance
    if (window.medakaRendererInstance) {
      window.medakaRendererInstance.buildFishSprite(fish).then((sprite) => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 144, 144);
        ctx.drawImage(sprite, 0, 0, 144, 144);
      });
    }

    // Ventral Egg Cluster (Carried on vent by mature females)
    const eggCluster = document.createElement('div');
    eggCluster.className = 'vent-egg-cluster';
    eggCluster.style.display = 'none';
    eggCluster.innerHTML = `
      <div class="egg"></div>
      <div class="egg"></div>
      <div class="egg"></div>
      <div class="egg"></div>
      <div class="egg"></div>
    `;
    el.appendChild(eggCluster);

    // Hover name tag
    const tag = document.createElement('div');
    tag.className = 'medaka-name-tag';
    tag.textContent = `${fish.name} (${fish.gender})`;
    el.appendChild(tag);

    // Interaction Click Handler
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      handleFishClick(fish);
    });

    return el;
  }

  function updateFishDOMTransform(fish) {
    const el = fishDOMMap.get(fish.id);
    if (!el) return;

    if (isNaN(fish.x) || isNaN(fish.y)) {
      fish.x = 100;
      fish.y = 100;
      fish.vx = 30;
      fish.vy = 5;
    }

    const flip = fish.facingLeft ? 1 : -1;
    // Fry flutter their tails faster than calm adults
    const flutterRate = fish.isAdult ? 0.12 : 0.22;
    const pitch = (fish.vy / 180) * 12 * flip;
    const wiggle = Math.sin(fish.wigglePhase || 0) * 2;
    fish.wigglePhase = (fish.wigglePhase || 0) + Math.hypot(fish.vx, fish.vy) * 0.016 * flutterRate;

    // --- ACCURATE BABY & JUVENILE LIFE-STAGE SCALING ---
    let stageScale = 1.0;
    if (!fish.isAdult) {
      const age = fish.age || 0;
      // Newborn fry are small (0.34x), smoothly growing to 0.58x juvenile
      if (age < 25) {
        stageScale = 0.34 + (age / 25) * 0.12; // 0.34 -> 0.46
      } else {
        stageScale = 0.46 + ((age - 25) / 25) * 0.18; // 0.46 -> 0.64
      }
      el.style.opacity = '0.9'; // Let fry.png's natural translucent artwork display
    } else {
      stageScale = 1.0;
      el.style.opacity = '1.0';
    }

    let scaleX = flip * stageScale;
    let scaleY = stageScale;

    if (fish.bodyType === 'D' || fish.bodyType === 'HD') {
      scaleX *= 0.78;
      scaleY *= 1.12;
    }

    el.style.transform = `translate3d(${Math.round(fish.x)}px, ${Math.round(fish.y)}px, 0) scale(${scaleX}, ${scaleY}) rotate(${pitch + wiggle}deg)`;

    const nameTag = el.querySelector('.medaka-name-tag');
    if (nameTag) {
      nameTag.style.transform = `translateX(-50%) scale(${1 / scaleX}, ${1 / scaleY})`;
    }
  }

  function applyFilterAndSelectionClasses(el, fish) {
    if (!window.gameState) return;

    // Self-heal Sets if corrupted by localStorage JSON deserialization
    if (!window.gameState.selectedFishIds || typeof window.gameState.selectedFishIds.has !== 'function') {
      window.gameState.selectedFishIds = new Set();
    }

    // 1. Highlight currently inspected / clicked fish
    const isInspected = window.gameState.inspectedFishId === fish.id;
    el.classList.toggle('inspected-highlight', isInspected);

    // 2. Select mode (to sell) highlight
    const isSelected = window.gameState.selectedFishIds.has(fish.id);
    el.classList.toggle('tank-highlighted', isSelected);

    // Ensure tank-dimmed is never applied from culling targets
    if (!isSelected && !isInspected) {
      el.classList.remove('tank-dimmed', 'tank-highlighted');
    }
  }

  // Centralized selection toggle used by both tank clicks and sidebar list clicks
  window.toggleFishSelection = function (fishId) {
    if (!window.gameState) return;

    if (!window.gameState.selectedFishIds) {
      window.gameState.selectedFishIds = new Set();
    }

    const set = window.gameState.selectedFishIds;
    if (set.has(fishId)) {
      set.delete(fishId);
    } else {
      set.add(fishId);
      if (window.playGameSound) window.playGameSound('choose');
    }

    const count = set.size;
    const sellBtn = document.getElementById('sellSelectedButton');
    const moveBtn = document.getElementById('moveSelectedButton');

    if (sellBtn) {
      sellBtn.disabled = count === 0;
      sellBtn.innerHTML = `<img src="emoji/dollar.png" class="ui-emoji" alt="Sell" /> Sell Selected (${count})`;
    }
    if (moveBtn) {
      moveBtn.disabled = count === 0;
      moveBtn.innerHTML = `<img src="emoji/herb.png" class="ui-emoji" alt="Move" /> Move Selected (${count})`;
    }

    // Refresh fish list to show green checkmark / selection highlight
    if (window.renderSidebarFishList) {
      window.renderSidebarFishList();
    }
  };

  window.handleListFishClick = function (fishId) {
    if (!window.gameState) {
      return;
    }

    if (window.gameState.selectMode) {

      if (typeof window.toggleFishSelection === 'function') {
        window.toggleFishSelection(fishId);
      }
      return;
    }


    window.gameState.inspectedFishId = fishId;

    if (typeof window.playGameSound === 'function') {
      window.playGameSound('choose');
    }

    if (typeof window.updateInspectedCard === 'function') {
      window.updateInspectedCard();
    }

    requestAnimationFrame(() => {

      if (typeof window.renderSidebarFishList === 'function') {
        window.renderSidebarFishList();
      }
    });
  };

  function handleFishClick(fish) {
    console.log('[AQUARIUM CLICK] Fish:', fish.id);

    if (window.gameState && window.gameState.selectMode) {
      window.toggleFishSelection(fish.id);
      return;
    }

    if (window.inspectMedaka) {
      window.inspectMedaka(fish.id);
    }
  }

  function updateSpawningMediaVisuals(tank) {
    const mop = document.getElementById('aquariumSpawningMop');
    if (mop) {
      mop.classList.toggle('hidden', (tank.plants.spawningMop || 0) <= 0);
    }
  }

  // ====================================================================
  // 5. SIDEBAR FISH LIST & SEARCH
  // ====================================================================

  function setupSidebarListEvents() {
    const listBtn = document.getElementById('medakaListBtn');
    const movableList = document.getElementById('movableMedakaList');
    const sortBtn = document.getElementById('sortMedakaListBtn');
    const searchInput = document.getElementById('pondListSearchInput');

    if (listBtn && movableList) {
      listBtn.addEventListener('click', () => {
        movableList.classList.toggle('hidden');
        renderSidebarFishList();
      });
    }

    if (sortBtn) {
      sortBtn.addEventListener('click', () => {
        if (listSortMode === 'value') {
          listSortMode = 'gender';
          sortBtn.textContent = 'Sort: Gender (♀ first)';
        } else if (listSortMode === 'gender') {
          listSortMode = 'name';
          sortBtn.textContent = 'Sort: Name';
        } else {
          listSortMode = 'value';
          sortBtn.textContent = 'Sort: Value';
        }
        renderSidebarFishList();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => renderSidebarFishList());
    }
  }

  // Sync the blue inspection highlight without rebuilding the fish list.
  window.syncSidebarFishHighlight = function () {
    const body = document.getElementById('medakaListBody');
    if (!body || !window.gameState) return;

    const inspectedId = String(window.gameState.inspectedFishId || '');

    body.querySelectorAll('.shrimp-list-item[data-fish-id]').forEach((card) => {
      const fishId = String(card.dataset.fishId);
      const isInspected = fishId === inspectedId;

      card.classList.toggle('selected-shrimp-card', isInspected);
    });
  };

  window.scrollFishListToFish = function (fishId) {
    const body = document.getElementById('medakaListBody');

    if (!body) {
      console.error('[LIST SCROLL] medakaListBody not found');
      return;
    }

    const id = String(fishId);

    const cards = body.querySelectorAll('.shrimp-list-item');

    console.log('[LIST SCROLL] Looking for fish:', id);
    console.log('[LIST SCROLL] Cards in list:', cards.length);

    let targetCard = null;

    cards.forEach((card) => {
      if (String(card.dataset.fishId) === id) {
        targetCard = card;
      }
    });

    if (!targetCard) {
      console.error('[LIST SCROLL] Could not find card for fish:', id);
      return;
    }

    console.log('[LIST SCROLL] Found card:', targetCard);
    console.log('[LIST SCROLL] Current scrollTop:', body.scrollTop);
    console.log('[LIST SCROLL] Card offsetTop:', targetCard.offsetTop);

    // Put the selected fish roughly in the middle of the visible list.
    const targetScroll =
      targetCard.offsetTop -
      (body.clientHeight / 2) +
      (targetCard.offsetHeight / 2);

    const maxScroll = body.scrollHeight - body.clientHeight;

    body.scrollTo({
      top: Math.max(0, Math.min(targetScroll, maxScroll)),
      behavior: 'smooth'
    });

    console.log(
      '[LIST SCROLL] Scrolling to:',
      Math.max(0, Math.min(targetScroll, maxScroll))
    );
  };

  window.renderSidebarFishList = function () {
    const body = document.getElementById('medakaListBody');
    if (!body || !window.gameState) return;

    const tank = getActiveTank();
    const query = (document.getElementById('pondListSearchInput')?.value || '').toLowerCase().trim();

    let list = [...tank.fish];

    // Filter by search query
    if (query) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.color.toLowerCase().includes(query) ||
          f.fin.toLowerCase().includes(query) ||
          f.eye.toLowerCase().includes(query) ||
          f.pattern.toLowerCase().includes(query) ||
          f.iridophore.toLowerCase().includes(query)
      );
    }

    // Sort
    if (listSortMode === 'value') {
      list.sort((a, b) => (b.isAdult ? 15 : 5) - (a.isAdult ? 15 : 5));
    } else if (listSortMode === 'gender') {
      list.sort((a, b) => {
        if (a.gender === 'F' && b.gender !== 'F') return -1;
        if (a.gender !== 'F' && b.gender === 'F') return 1;
        return a.name.localeCompare(b.name);
      });
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    body.innerHTML = list
      .map((fish) => {
        const isInspected = window.gameState && window.gameState.inspectedFishId === fish.id;
        const isSelected = window.gameState.selectedFishIds && window.gameState.selectedFishIds.has(fish.id);

        let cardClass = '';
        if (isSelected || isInspected) {
          cardClass = 'selected-shrimp-card';
        }

        return `
          <div class="shrimp-list-item ${cardClass}" data-fish-id="${fish.id}" onclick="handleListFishClick('${fish.id}')">
            <div class="shrimp-list-thumb">
              <canvas id="listThumb_${fish.id}" width="144" height="144"></canvas>
            </div>
            <div style="flex-grow: 1; min-width: 0;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size:12px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${fish.name} (${fish.gender})
                </strong>
                ${isSelected ? '<span class="select-check-badge">✓</span>' : ''}
              </div>
              <span class="small-text" style="font-size:10px;">${fish.fin} | ${fish.pattern}</span>
              <span class="small-text" style="font-size:10px; display:block; color:var(--feed-accent);">Food: ${fish.foodEaten}/${fish.maxFood}</span>
            </div>
          </div>
        `;
      })
      .join('');


    // Draw sprite thumbnails into list canvases
    list.forEach((fish) => {
      const cvs = document.getElementById(`listThumb_${fish.id}`);
      if (cvs && window.medakaRendererInstance) {
        window.medakaRendererInstance.buildFishSprite(fish).then((sprite) => {
          const ctx = cvs.getContext('2d');
          ctx.drawImage(sprite, 0, 0, 144, 144);
        });
      }
    });
  };

  window.fishDOMMap = fishDOMMap;
})();