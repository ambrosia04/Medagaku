/**
 * ======================================================================
 * MEDAKA GENETICS - Interactive Feeding Subsystem (js/feeding.js)
 * ======================================================================
 */

(function () {
  window.activePellets = [];
  let isPointerDown = false;
  let lastFeedTime = 0;
  const FEED_COOLDOWN_MS = 140; // Rate-limit when holding click
  let physicsInterval = null;

  window.initFeedingSystem = function () {
    const aquarium = document.getElementById('aquarium');
    const foodLayer = document.getElementById('foodLayer');
    if (!aquarium || !foodLayer) return;

    // Prevent duplicate listeners
    aquarium.removeEventListener('mousedown', handlePointerDown);
    window.removeEventListener('mouseup', handlePointerUp);
    aquarium.removeEventListener('mousemove', handlePointerMove);

    aquarium.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mouseup', handlePointerUp);
    aquarium.addEventListener('mousemove', handlePointerMove);

    // Touch support for mobile / tablets
    aquarium.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    aquarium.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Start falling pellet physics tick (60 FPS)
    if (physicsInterval) cancelAnimationFrame(physicsInterval);
    physicsInterval = requestAnimationFrame(updatePelletsLoop);
  };

  function handlePointerDown(e) {
    if (e.button !== 0) return; // Left-click only
    if (!window.gameState || !window.gameState.feedMode) return;

    isPointerDown = true;
    dropPelletAtEvent(e);
  }

  function handlePointerUp() {
    isPointerDown = false;
  }

  function handlePointerMove(e) {
    if (!isPointerDown) return;
    if (!window.gameState || !window.gameState.feedMode) return;

    const now = Date.now();
    if (now - lastFeedTime >= FEED_COOLDOWN_MS) {
      dropPelletAtEvent(e);
    }
  }

  function handleTouchStart(e) {
    if (!window.gameState || !window.gameState.feedMode) return;
    e.preventDefault();
    isPointerDown = true;
    if (e.touches && e.touches[0]) dropPelletAtEvent(e.touches[0]);
  }

  function handleTouchMove(e) {
    if (!isPointerDown) return;
    if (!window.gameState || !window.gameState.feedMode) return;
    e.preventDefault();
    const now = Date.now();
    if (now - lastFeedTime >= FEED_COOLDOWN_MS && e.touches && e.touches[0]) {
      dropPelletAtEvent(e.touches[0]);
    }
  }

  function dropPelletAtEvent(e) {
    const aquarium = document.getElementById('aquarium');
    const foodLayer = document.getElementById('foodLayer');
    if (!aquarium || !foodLayer) return;

    const rect = aquarium.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = Math.max(12, e.clientY - rect.top);

    // Clamp within basin boundaries
    if (x < 15 || x > rect.width - 15 || y > rect.height - 40) return;

    lastFeedTime = Date.now();
    spawnPellet(x, y, foodLayer, rect.height);
  }

  function spawnPellet(x, y, container, basinHeight) {
    const currentTier = (window.gameState && window.gameState.foodTier) || 1;

    const pelletEl = document.createElement('div');
    pelletEl.className = 'food-pellet';

    if (currentTier === 1) pelletEl.classList.add('tier-flake');
    else if (currentTier === 3) pelletEl.classList.add('tier-daphnia');
    else if (currentTier === 4) pelletEl.classList.add('tier-brine');

    pelletEl.style.left = `${x}px`;
    pelletEl.style.top = `${y}px`;
    container.appendChild(pelletEl);

    const pellet = {
      id: 'p_' + Math.random().toString(36).substr(2, 9),
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: 38 + Math.random() * 24, // Sinking velocity
      wigglePhase: Math.random() * Math.PI * 2,
      tier: currentTier,
      eaten: false,
      settled: false,
      settleTimer: 3.5, // Fades after 3.5s on substrate
      el: pelletEl
    };

    window.activePellets.push(pellet);

    // Track achievement count
    window.gameStats = window.gameStats || { totalPelletsFed: 0 };
    window.gameStats.totalPelletsFed++;
    if (window.evaluateMedakaAchievements) {
      window.evaluateMedakaAchievements();
    }

    // Play splash sound
    if (window.playGameSound) {
      window.playGameSound('splash');
    }
  }

  function updatePelletsLoop() {
    const aquarium = document.getElementById('aquarium');
    const boundsHeight = aquarium ? aquarium.clientHeight : 620;
    const bottomLimit = boundsHeight - 34; // Top of sand substrate

    for (let i = window.activePellets.length - 1; i >= 0; i--) {
      const p = window.activePellets[i];

      // If eaten by a fish, animate out and remove
      if (p.eaten) {
        if (p.el && p.el.parentNode) {
          p.el.parentNode.removeChild(p.el);
        }
        window.activePellets.splice(i, 1);
        continue;
      }

      // Sinking physics
      if (!p.settled) {
        p.wigglePhase += 0.08;
        p.x += Math.sin(p.wigglePhase) * 0.45 + p.vx * 0.016;
        p.y += p.vy * 0.016;

        if (p.y >= bottomLimit) {
          p.y = bottomLimit;
          p.settled = true;
          if (p.el) p.el.style.opacity = '0.6';
        }
      } else {
        // Dissolve slowly on substrate
        p.settleTimer -= 0.016;
        if (p.settleTimer <= 0) {
          if (p.el && p.el.parentNode) {
            p.el.parentNode.removeChild(p.el);
          }
          window.activePellets.splice(i, 1);
          continue;
        }
      }

      // Update DOM position
      if (p.el) {
        p.el.style.left = `${Math.round(p.x)}px`;
        p.el.style.top = `${Math.round(p.y)}px`;
      }
    }

    physicsInterval = requestAnimationFrame(updatePelletsLoop);
  }

  // Spawns an individual food pellet with an explicit food tier for the auto-feeder
  window.spawnSpecificPellet = function (tier, x, y) {
    const aquarium = document.getElementById('aquarium');
    const foodLayer = document.getElementById('foodLayer');
    if (!aquarium || !foodLayer) return;

    const rect = aquarium.getBoundingClientRect();
    const posX = x !== undefined ? x : (35 + Math.random() * (rect.width - 70));
    const posY = y !== undefined ? y : 15;

    const pelletEl = document.createElement('div');
    pelletEl.className = 'food-pellet';

    if (tier === 1) pelletEl.classList.add('tier-flake');
    else if (tier === 3) pelletEl.classList.add('tier-daphnia');
    else if (tier === 4) pelletEl.classList.add('tier-brine');

    pelletEl.style.left = `${posX}px`;
    pelletEl.style.top = `${posY}px`;
    foodLayer.appendChild(pelletEl);

    const pellet = {
      id: 'p_' + Math.random().toString(36).substr(2, 9),
      x: posX,
      y: posY,
      vx: (Math.random() - 0.5) * 8,
      vy: 38 + Math.random() * 24,
      wigglePhase: Math.random() * Math.PI * 2,
      tier: tier,
      eaten: false,
      settled: false,
      settleTimer: 3.5,
      el: pelletEl
    };

    window.activePellets.push(pellet);

    if (window.playGameSound) {
      window.playGameSound('splash');
    }
  };
})();