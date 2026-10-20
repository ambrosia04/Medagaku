/**
 * ======================================================================
 * MEDAKA GENETICS - Core Game Engine (game.js)
 * ======================================================================
 */

// Global Game State
window.gameState = {
  money: 100,
  day: 1,
  hour: 0,
  minute: 0,
  second: 0,
  speed: 1,
  currentTankId: 'tank1',
  tanks: {
    tank1: {
      id: 'tank1',
      name: 'Main Basin',
      capacity: 25,
      background: 'blue',
      fish: [],
      plants: {
        hornwort: 0,
        watersprite: 0,
        spawningMop: 0
      }
    },
    tank2: {
      id: 'tank2',
      name: 'Broodstock Tank',
      capacity: 25,
      background: 'blue',
      fish: [],
      plants: {
        hornwort: 0,
        watersprite: 0,
        spawningMop: 0
      }
    }
  },
  unlockedTanks: ['tank1'],
  unlockedBackgrounds: ['blue'],
  foodTier: 1, // 1: Flake ($1), 2: Micro Pellets ($2), 3: Daphnia ($5), 4: Brine Shrimp ($10), 5: Bloodworms ($25)
  unlockedSpeeds: [1], // 1x is unlocked by default
  speedUpgrades: 0,
  feedMode: false,
  selectMode: false,
  selectedFishIds: new Set(),
  inspectedFishId: null,
  trackedAlleles: new Set(),
  discoveredPhenotypes: new Set(),
  discoveredAlleles: new Set(),
  journalLogs: [],
  settings: {
    bgmMuted: false,
    bgmVolume: 0.5,
    sfxMuted: false,
    sfxVolume: 0.5,
    darkMode: false
  }
};

// Food Quality Definitions
const FOOD_TIERS = [
  { tier: 1, name: 'Standard Flake', value: 1, duration: 10, cost: 0, desc: 'Basic flake food. Yields $1/bite. Lasts 10s.' },
  { tier: 2, name: 'Hikari Micro Pellets', value: 2, duration: 30, cost: 220, desc: 'High-protein granules. Yields $2/bite. Lasts 30s.' },
  { tier: 3, name: 'Freeze-Dried Daphnia', value: 5, duration: 90, cost: 550, desc: 'Nutrient-packed water fleas. Yields $5/bite. Lasts 1.5m.' },
  { tier: 4, name: 'Live Baby Brine Shrimp', value: 10, duration: 180, cost: 800, desc: 'Active live nauplii. Yields $10/bite. Lasts 3m.' },
  { tier: 5, name: 'Frozen Bloodworms', value: 25, duration: 300, cost: 2000, desc: 'Premium conditioner. Yields $25/bite. Lasts 5m.' }
];

// Incubation Speed Shop Catalog
const SPEED_SHOP_CATALOG = [
  { speed: 2, name: 'Bubbler', cost: 500, desc: 'Unlocks 2x simulation speed.', prereq: 1 },
  { speed: 5, name: 'Breeding Light', cost: 1250, desc: 'Unlocks 5x simulation speed.', prereq: 2 },
  { speed: 20, name: 'More Plants', cost: 3500, desc: 'Unlocks 20x simulation speed.', prereq: 5 },
  { speed: 60, name: 'Quality Water', cost: 5000, desc: 'Unlocks 60x maximum speed.', prereq: 20 }
];

// ======================================================================
// BASIN (TANK) PROGRESSION CATALOG
// ======================================================================

const BASIN_CATALOG = [
  { id: 'tank1', name: 'Main Basin', cost: 0, capacity: 25 },
  { id: 'tank2', name: 'Broodstock Basin', cost: 500, capacity: 25 },
  { id: 'tank3', name: 'Nursery Basin', cost: 1250, capacity: 25 },
  { id: 'tank4', name: 'Selective Line Basin', cost: 2500, capacity: 25 },
  { id: 'tank5', name: 'Master Show Basin', cost: 4000, capacity: 25 },
  { id: 'tank6', name: 'Experimental Basin', cost: 6000, capacity: 25 }
];

// Purchasable Basin Backgrounds
const BACKGROUND_CATALOG = [
  {
    id: 'blue',
    name: 'Clear Blue Basin',
    cost: 0,
    desc: 'Standard crystalline water. Clean and vibrant visibility.',
    class: 'bg-blue'
  },
  {
    id: 'white',
    name: 'White Nursery Tray',
    cost: 500,
    desc: 'A shallow white observation basin. Perfect for inspecting dark fin rays.',
    class: 'bg-white'
  },
  {
    id: 'moss',
    name: 'Planted Bio-Green',
    cost: 1250,
    desc: 'Algae-rich green water promoting robust fry growth and micro-grazing.',
    class: 'bg-moss'
  },
  {
    id: 'black',
    name: '★ Traditional Black Lacquer Basin',
    cost: 2500,
    desc: 'Triggers physiological background response (Haichi Hannou), unlocking the genetic emergence of Spots and Black Rim mutations!',
    class: 'bg-black'
  }
];

// Spawning Media & Plant Upgrades
const PLANT_CATALOG = [
  { id: 'spawningMop', name: 'Yarn Spawning Mop', cost: 100, desc: 'Provides safe fiber clusters. Increases clutch size by +20%.' },
  { id: 'hornwort', name: 'Matsumo (Hornwort)', cost: 185, desc: 'Oxygenating stems that speed up fry maturation by 15%.' },
  { id: 'watersprite', name: 'Water Sprite', cost: 220, desc: 'Denser cover reducing female resting intervals by 20%.' }
];

let simulationInterval = null;
let lastTickTime = Date.now();

// ======================================================================
// 1. INITIALIZATION & LIFECYCLE
// ======================================================================

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    applyOfflineProgress();
    renderCensus();
    updateTopBar();
    updateBottomEggCluster();
    updateHarvestButton();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadGame();
  applyOfflineProgress();

  // Apply saved Audio settings (Mute/Unmute labels & volume percentages) on startup
  if (window.soundManager && window.soundManager.updateAudioSettingsUI) {
    window.soundManager.updateAudioSettingsUI();
  }

  // Apply saved Dark Mode setting on startup
  if (gameState.settings && gameState.settings.darkMode) {
    document.body.classList.add('dark-theme');
    const label = document.getElementById('themeLabel');
    if (label) label.textContent = 'Dark Mode';
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = 'Dark';
  }

  setupUIEventListeners();
  updateBackgroundDropdown();
  updateTankDropdown();
  renderAllShops();
  renderGeneticsTree();
  applyEquippedBackground();
  updateTrackedLabel();
  updateSpeedButtonsUI();
  updateAutoFeederButtonLabel();

  // If new game, start with initial pair
  const tank = getCurrentTank();
  if (tank.fish.length === 0) {
    seedInitialPair();
  }

  // Start Main Loop (1 tick per real second at 1x)
  simulationInterval = setInterval(gameLoopTick, 1000);

  // Initialize renderer and feeding subsystems
  if (window.initFeedingSystem) {
    window.initFeedingSystem();
  }
  if (window.initRenderLoop) {
    window.initRenderLoop();
  }

  updateTopBar();
  renderCensus();
});

function seedInitialPair() {
  const tank = getCurrentTank();
  const male = window.MedakaGenetics ? window.MedakaGenetics.createWildType('M') : createFallbackMedaka('M');
  const female = window.MedakaGenetics ? window.MedakaGenetics.createWildType('F') : createFallbackMedaka('F');

  tank.fish.push(male, female);
  registerDiscoveredPhenotype(male);
  registerDiscoveredPhenotype(female);
}

function createFallbackMedaka(gender = 'F') {
  return {
    id: 'm_' + Math.random().toString(36).substr(2, 9),
    name: 'Brown Medaka',
    gender: gender,
    age: 30, // mature
    isAdult: true,
    carryingEggs: false,
    eggTimer: 0,
    restTimer: 0,
    bodyType: 'N',
    color: 'brown',
    eye: 'Normal',
    fin: 'Hishio',
    iridophore: 'None',
    pattern: 'None',
    maxFood: 5,
    digestionTime: 25,
    foodEaten: 0,
    digestionTimer: 0,
    genes: {
      color: ['brown', 'brown'],
      bodyType: ['N', 'N'],
      eye: ['Normal', 'Normal'],
      fin: ['Hishio', 'Hishio'],
      iridophore: ['None', 'None'],
      pattern: ['None', 'None'],
      maxFood: [5, 5],
      digestionTime: [25, 25]
    }
  };
}

// ======================================================================
// 2. MAIN SIMULATION TICK
// ======================================================================

function setSimulationSpeed(spd) {
  const unlocked = window.gameState.unlockedSpeeds || [1];
  if (!unlocked.includes(spd)) {
    showToast('Speed Locked', `Purchase the ${spd}x Accelerator in the Shop first!`);
    return;
  }
  gameState.speed = spd;
  updateSpeedButtonsUI();
}

function updateSpeedButtonsUI() {
  const unlocked = window.gameState.unlockedSpeeds || [1];
  const speeds = [1, 2, 5, 20, 60];

  speeds.forEach((spd) => {
    const btn = document.getElementById(`speed${spd}`);
    if (!btn) return;
    const isUnlocked = unlocked.includes(spd);
    const isActive = gameState.speed === spd;

    btn.classList.toggle('active', isActive);
    btn.classList.toggle('locked', !isUnlocked);
    btn.disabled = !isUnlocked;
    btn.title = isUnlocked ? `${spd}x Speed` : `Locked (${spd}x) - Unlock in Shop`;
  });
}

function gameLoopTick() {
  const speed = gameState.speed;
  if (speed <= 0) return;

  const currentTank = getCurrentTank();

  // Advance In-Game Time
  advanceClock();

  // Process Each Live Fish in Current Tank
  // Inside gameLoopTick(speed):
  // Process Each Live Fish in Current Tank
  for (let i = currentTank.fish.length - 1; i >= 0; i--) {
    const fish = currentTank.fish[i];

    // Maturation
    if (!fish.isAdult) {
      const growthRate = speed * (1 + ((currentTank.plants && currentTank.plants.hornwort) || 0) * 0.15);
      fish.age = (fish.age || 0) + growthRate;
      if (fish.age >= 50) {
        fish.age = 50;
        fish.isAdult = true;
        playGameSound('bubble');
      }
    }

    // Digestion Cycle using active food tier duration
    const activeFood = FOOD_TIERS.find(f => f.tier === gameState.foodTier) || FOOD_TIERS[0];
    fish.digestionTime = activeFood.duration; // Duration governed by food quality

    if (fish.foodEaten > 0) {
      fish.digestionTimer += speed;
      if (fish.digestionTimer >= fish.digestionTime) {
        fish.foodEaten = Math.max(0, fish.foodEaten - 1);
        fish.digestionTimer = 0;
      }
    }

    // Reproduction Cycle (Females only)
    if (fish.isAdult && fish.gender === 'F') {
      if (!fish.cycleStage) {
        fish.cycleStage = fish.carryingEggs ? 'has_eggs' : 'resting';
        fish.restTimer = fish.restTimer || 25;
        fish.eggTimer = fish.eggTimer || 35;
        fish.dropTimer = 20;
      }

      if (fish.cycleStage === 'has_eggs') {
        fish.carryingEggs = true;
        fish.eggTimer -= speed;
        if (fish.eggTimer <= 0) {
          fish.cycleStage = 'dropping_eggs';
          fish.dropTimer = 20;
          playGameSound('bubble');
        }
      } else if (fish.cycleStage === 'dropping_eggs') {
        fish.carryingEggs = true;
        fish.dropTimer -= speed;
        if (fish.dropTimer <= 0) {
          fish.carryingEggs = false;
          fish.cycleStage = 'resting';
          fish.restTimer = Math.max(20, 45 - (currentTank.plants.watersprite || 0) * 8);
          queueEggClutch(fish);
          playGameSound('bubble');
        }
      } else {
        // Resting State
        fish.carryingEggs = false;
        if (fish.restTimer > 0) {
          fish.restTimer -= speed;
        } else {
          // ★ BALANCE RULE: Resting females need > 1 food, and available males must have > 0 food!
          const fedMalesExist = currentTank.fish.some((f) => f.isAdult && f.gender === 'M' && f.foodEaten > 0);
          const femaleIsSatiated = fish.foodEaten > 1;

          if (fedMalesExist && femaleIsSatiated && Math.random() < 0.25 * speed) {
            fish.cycleStage = 'has_eggs';
            fish.carryingEggs = true;
            fish.eggTimer = Math.max(20, 45 - (currentTank.plants.hornwort || 0) * 5);
            playGameSound('bubble');
          }
        }
      }
    }
  }

  // Advance Auto-Feeders (dispenses at each tank's programmed interval: 10s down to 2s)
  for (const tankId in gameState.tanks) {
    const t = gameState.tanks[tankId];
    if (t && t.autoFeeder && t.autoFeeder.queue && t.autoFeeder.queue.length > 0) {
      t.autoFeeder.timer = (t.autoFeeder.timer !== undefined ? t.autoFeeder.timer : getTankFeederInterval(t)) - 1;

      if (t.autoFeeder.timer <= 0) {
        t.autoFeeder.timer = getTankFeederInterval(t); // Reset to tank's upgraded interval (10s down to 2s)
        const nextPelletTier = t.autoFeeder.queue.shift();

        // If currently viewing this tank, spawn the visible pellet
        if (t.id === gameState.currentTankId && window.spawnSpecificPellet) {
          window.spawnSpecificPellet(nextPelletTier);
        }

        updateAutoFeederButtonLabel();
      }
    }
  }

  updateTopBar();
  renderCensus();
  if (gameState.inspectedFishId) {
    updateInspectedCard();
  }
}

// Simulates feeding, digestion, and breeding across all basins when the browser was closed or minimized
function applyOfflineProgress() {
  if (!gameState || !gameState.lastSaveTime) return;

  const now = Date.now();
  let elapsedSeconds = Math.floor((now - gameState.lastSaveTime) / 1000);
  // Cap offline catchup at 48 hours to prevent freezing
  elapsedSeconds = Math.min(elapsedSeconds, 48 * 3600);

  if (elapsedSeconds < 5) return;

  const speed = gameState.speed || 1;
  let totalPelletsFed = 0;
  let totalClutchesLaid = 0;

  // Step through time in 5-second intervals (matching the auto-feeder cycle)
  const step = 5;
  const iterations = Math.floor(elapsedSeconds / step);

  for (let s = 0; s < iterations; s++) {
    for (const tankId in gameState.tanks) {
      const tank = gameState.tanks[tankId];
      if (!tank || !Array.isArray(tank.fish) || tank.fish.length === 0) continue;

      // 1. Auto-Feeder: Dispense 1 pellet every 5 seconds if stocked
      if (tank.autoFeeder && tank.autoFeeder.queue && tank.autoFeeder.queue.length > 0) {
        const nextTier = tank.autoFeeder.queue.shift();
        const food = FOOD_TIERS.find(f => f.tier === nextTier) || FOOD_TIERS[0];
        gameState.money += food.value; // Earn bite reward
        totalPelletsFed++;

        // Feed hungry fish
        const hungryFish = tank.fish.find(f => f.foodEaten < f.maxFood);
        if (hungryFish) {
          hungryFish.foodEaten = Math.min(hungryFish.maxFood, hungryFish.foodEaten + 1);
          hungryFish.digestionTime = food.duration;
        }
      }

      // 2. Offline Maturation, Digestion & Breeding
      const simAdvance = step * speed;

      for (let i = 0; i < tank.fish.length; i++) {
        const fish = tank.fish[i];

        // Growth
        if (!fish.isAdult) {
          fish.age = (fish.age || 0) + simAdvance * 0.1;
          if (fish.age >= 50) {
            fish.age = 50;
            fish.isAdult = true;
          }
        }

        // Digestion
        if (fish.foodEaten > 0) {
          fish.digestionTimer = (fish.digestionTimer || 0) + simAdvance;
          const digTime = fish.digestionTime || 20;
          if (fish.digestionTimer >= digTime) {
            fish.foodEaten = Math.max(0, fish.foodEaten - 1);
            fish.digestionTimer = 0;
          }
        }

        // Female reproduction cycle
        if (fish.isAdult && fish.gender === 'F') {
          if (!fish.cycleStage) {
            fish.cycleStage = fish.carryingEggs ? 'has_eggs' : 'resting';
            fish.restTimer = 25;
            fish.eggTimer = 35;
            fish.dropTimer = 20;
          }

          if (fish.cycleStage === 'has_eggs') {
            fish.eggTimer = Math.max(0, (fish.eggTimer || 35) - simAdvance);
            if (fish.eggTimer <= 0) {
              fish.cycleStage = 'dropping_eggs';
              fish.dropTimer = 20;
            }
          } else if (fish.cycleStage === 'dropping_eggs') {
            fish.dropTimer = Math.max(0, (fish.dropTimer || 20) - simAdvance);
            if (fish.dropTimer <= 0) {
              fish.carryingEggs = false;
              fish.cycleStage = 'resting';
              fish.restTimer = Math.max(20, 45 - (tank.plants?.watersprite || 0) * 8);
              queueEggClutch(fish, tank); // Laid clutch during offline hours
              totalClutchesLaid++;
            }
          } else {
            // Resting state
            if (fish.restTimer > 0) {
              fish.restTimer = Math.max(0, fish.restTimer - simAdvance);
            } else {
              const fedMales = tank.fish.some(f => f.isAdult && f.gender === 'M' && f.foodEaten > 0);
              if (fedMales && fish.foodEaten > 1 && Math.random() < 0.3) {
                fish.cycleStage = 'has_eggs';
                fish.carryingEggs = true;
                fish.eggTimer = Math.max(20, 40 - (tank.plants?.hornwort || 0) * 5);
              }
            }
          }
        }
      }
    }
  }

  gameState.lastSaveTime = now;

  if (totalPelletsFed > 0 || totalClutchesLaid > 0) {
    showToast('Offline Progress', `While offline: Dispensed ${totalPelletsFed} pellets & ${totalClutchesLaid} new egg clutches were ready!`);
  }
}

let lastClockTime = Date.now();

function advanceClock() {
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastClockTime) / 1000);
  if (elapsedSeconds < 1) return;
  lastClockTime += elapsedSeconds * 1000;

  // Real-time clock progression (1 real second = 1 second on clock)
  gameState.second = (gameState.second || 0) + elapsedSeconds;

  while (gameState.second >= 60) {
    gameState.second -= 60;
    gameState.minute = (gameState.minute || 0) + 1;

    while (gameState.minute >= 60) {
      gameState.minute -= 60;
      gameState.hour = (gameState.hour || 0) + 1;

      while (gameState.hour >= 24) {
        gameState.hour -= 24;
        gameState.day = (gameState.day || 1) + 1;
        gameState.money += 20;
        showToast('Daily Stipend', 'Earned +$20 daily aquarium allowance!');
      }
    }
  }
}

// ======================================================================
// 3. BREEDING & EGG CLUTCH CULLING
// ======================================================================

window.pendingClutches = [];
window.currentActiveClutch = null;
window.activeCullBabies = [];

function queueEggClutch(mother, targetTank) {
  const currentTank = targetTank || getCurrentTank();
  const males = currentTank.fish.filter((f) => f.isAdult && f.gender === 'M');
  if (males.length === 0) return;

  const father = males[Math.floor(Math.random() * males.length)];
  const clutchSize = Math.floor((3 + Math.random() * 4) * (1 + (currentTank.plants.spawningMop || 0) * 0.2));

  const babies = [];
  for (let i = 0; i < clutchSize; i++) {
    const offspring = window.MedakaGenetics
      ? window.MedakaGenetics.breed(mother, father, currentTank)
      : createFallbackMedaka(Math.random() < 0.5 ? 'M' : 'F');

    offspring.age = 0;
    offspring.isAdult = false;
    babies.push(offspring);
  }

  window.pendingClutches.push({
    tankId: currentTank.id,
    motherName: mother.name,
    babies: babies
  });

  updateHarvestButton();
  updateBottomEggCluster();
}

function updateHarvestButton() {
  const harvestBtn = document.getElementById('harvestEggsBtn');
  if (!harvestBtn) return;

  const currentTankId = gameState.currentTankId || 'tank1';
  const totalWaiting = (window.pendingClutches || []).filter(c => !c.tankId || c.tankId === currentTankId).length
    + (window.currentActiveClutch && (!window.currentActiveClutch.tankId || window.currentActiveClutch.tankId === currentTankId) ? 1 : 0);

  if (totalWaiting > 0) {
    harvestBtn.classList.remove('hidden');
    harvestBtn.innerHTML = `<img src="emoji/baby.png" class="ui-emoji" alt="Eggs" /> Egg Nursery Harvest (${totalWaiting})`;
  } else {
    harvestBtn.classList.add('hidden');
  }
}

function updateBottomEggCluster() {
  let clusterEl = document.getElementById('aquariumBottomEggs');
  const aquarium = document.getElementById('aquarium');

  if (!clusterEl && aquarium) {
    clusterEl = document.createElement('div');
    clusterEl.id = 'aquariumBottomEggs';
    clusterEl.className = 'bottom-egg-cluster hidden';
    aquarium.appendChild(clusterEl);
  }
  if (!clusterEl) return;

  clusterEl.onclick = (e) => {
    e.stopPropagation();
    openCullingModal();
  };

  const currentTankId = gameState.currentTankId || 'tank1';
  const totalWaiting = (window.pendingClutches || []).filter(c => !c.tankId || c.tankId === currentTankId).length
    + (window.currentActiveClutch && (!window.currentActiveClutch.tankId || window.currentActiveClutch.tankId === currentTankId) ? 1 : 0);

  if (totalWaiting >= 1) {
    clusterEl.classList.remove('hidden');
    if (!clusterEl.hasChildNodes() || clusterEl.children.length === 0) {
      renderBottomEggsMarkup(clusterEl);
    }
  } else {
    clusterEl.classList.add('hidden');
    clusterEl.innerHTML = '';
  }
}

function renderBottomEggsMarkup(container) {
  container.innerHTML = `
    <div class="bottom-egg-mound"><div class="egg"></div><div class="egg"></div><div class="egg"></div><div class="egg"></div><div class="egg"></div></div>
    <div class="bottom-egg-mound"><div class="egg"></div><div class="egg"></div><div class="egg"></div><div class="egg"></div></div>
    <div class="bottom-egg-mound"><div class="egg"></div><div class="egg"></div><div class="egg"></div><div class="egg"></div><div class="egg"></div></div>
    <div class="bottom-egg-mound"><div class="egg"></div><div class="egg"></div><div class="egg"></div></div>
    <div class="bottom-egg-mound"><div class="egg"></div><div class="egg"></div><div class="egg"></div><div class="egg"></div><div class="egg"></div></div>
  `;
}

// Helper to inspect which genetics on a baby are not yet unlocked in the codex
function getUndiscoveredTraits(baby) {
  const discovered = window.gameState.discoveredAlleles || new Set();
  const newTraits = [];

  const checks = [
    { label: 'Color', val: baby.color },
    { label: 'Body Shape', val: baby.bodyType },
    { label: 'Fin Type', val: baby.fin },
    { label: 'Eye Type', val: baby.eye },
    { label: 'Pattern', val: baby.pattern },
    { label: 'Shine', val: baby.iridophore }
  ];

  checks.forEach(({ label, val }) => {
    if (val && !discovered.has(val)) {
      newTraits.push({ label, val });
    }
  });

  return newTraits;
}

// Persistent destination across individual keeps and clutches
window.nurseryDestinationTankId = window.nurseryDestinationTankId || 'tank1';

function updateNurseryDestinationDropdown() {
  const select = document.getElementById('nurseryTankDestinationSelect');
  if (!select) return;

  const unlocked = gameState.unlockedTanks || ['tank1'];
  if (!unlocked.includes(window.nurseryDestinationTankId)) {
    window.nurseryDestinationTankId = gameState.currentTankId || 'tank1';
  }

  select.innerHTML = unlocked.map((tankId) => {
    const t = gameState.tanks[tankId];
    const isFull = t ? t.fish.length >= t.capacity : false;
    return `
      <option value="${tankId}" ${tankId === window.nurseryDestinationTankId ? 'selected' : ''}>
        ${t ? t.name : tankId} (${t ? t.fish.length : 0}/25) ${isFull ? '— FULL' : ''}
      </option>
    `;
  }).join('');

  select.value = window.nurseryDestinationTankId;
}

// Helper to check if baby carries any currently active Culling Targets
function getMatchedCullingTargets(baby) {
  const tracked = gameState.trackedAlleles || new Set();
  if (tracked.size === 0) return [];

  const babyAlleles = [baby.color, baby.bodyType, baby.fin, baby.eye, baby.pattern, baby.iridophore];
  return babyAlleles.filter(allele => allele && tracked.has(allele));
}

document.addEventListener('DOMContentLoaded', () => {
  const openModalBtn = document.getElementById('openCullingTargetsModalBtn');
  const modal = document.getElementById('cullingTargetsModal');
  const closeModalBtn = document.getElementById('closeCullingTargetsModal');
  const selectAllBtn = document.getElementById('modalSelectAllTargetsBtn');
  const clearAllBtn = document.getElementById('modalClearAllTargetsBtn');

  if (openModalBtn && modal) {
    openModalBtn.addEventListener('click', () => {
      renderCullingTargetsModalContent();
      modal.classList.remove('hidden');
    });
  }

  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      const cfg = window.MedakaConfig;
      if (!cfg) return;
      const discovered = gameState.discoveredAlleles || new Set();

      // Add all discovered alleles to trackedAlleles
      discovered.forEach(a => gameState.trackedAlleles.add(a));
      renderCullingTargetsModalContent();
      updateTrackedLabel();
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      gameState.trackedAlleles.clear();
      renderCullingTargetsModalContent();
      updateTrackedLabel();
    });
  }
});

function updateTrackedLabel() {
  const label = document.getElementById('trackedAllelesBtnLabel');
  if (label) {
    const count = gameState.trackedAlleles ? gameState.trackedAlleles.size : 0;
    label.textContent = `Culling Targets (${count})`;
  }
}

function renderCullingTargetsModalContent() {
  const container = document.getElementById('cullingTargetsCategoriesList');
  if (!container) return;

  const cfg = window.MedakaConfig;
  if (!cfg) return;

  const discovered = gameState.discoveredAlleles || new Set();
  if (!gameState.trackedAlleles) gameState.trackedAlleles = new Set();

  const LOCI = [
    { category: '1. Body Pigmentation', items: Object.values(cfg.COLORS).map(c => ({ id: c.id, name: c.name, hex: c.hex })) },
    { category: '2. Spinal Architecture (Body Shape)', items: Object.values(cfg.BODY_TYPES).map(b => ({ id: b.code, name: b.name })) },
    { category: '3. Eye Structures', items: Object.values(cfg.EYE_TYPES).map(e => ({ id: e.id, name: e.name })) },
    { category: '4. Fin Architecture', items: Object.values(cfg.FIN_TYPES).map(f => ({ id: f.id, name: f.name })) },
    { category: '5. Scale Iridophores (Guanine Sheen)', items: Object.values(cfg.IRIDOPHORES).map(i => ({ id: i.id, name: i.name })) },
    { category: '6. Environmental Adaptation Patterns', items: Object.values(cfg.PATTERNS).map(p => ({ id: p.id, name: p.name })) }
  ];

  let html = '';

  LOCI.forEach(locus => {
    // Filter to ONLY include alleles the player has already discovered (hiding undiscovered ones entirely)
    const unlockedItems = locus.items.filter(item => discovered.has(item.id));
    if (unlockedItems.length === 0) return; // Skip category if nothing discovered yet

    let cardsHtml = unlockedItems.map(item => {
      const isTargeted = gameState.trackedAlleles.has(item.id);
      const swatchHtml = item.hex ? `<span class="allele-swatch" style="background:${item.hex};"></span>` : '';

      // Determine colors based on dark mode or target state
      const isDark = gameState.settings && gameState.settings.darkMode;
      const cardBg = isTargeted
        ? (isDark ? 'rgba(46,204,113,0.2)' : 'rgba(46,204,113,0.1)')
        : (isDark ? '#1a2a2e' : '#ffffff');
      const borderColor = isTargeted ? '#2ecc71' : 'var(--border)';
      const descColor = isTargeted ? '#2ecc71' : 'var(--muted)';
      const nameColor = isDark ? 'var(--text)' : '#243238';

      return `
        <div class="allele-card discovered ${isTargeted ? 'culling-target-selected' : ''}" 
             style="cursor: pointer; border-color: ${borderColor}; background: ${cardBg};"
             onclick="toggleCullingTargetAllele('${item.id}')">
          <div class="allele-header-row">
            ${swatchHtml}
            <span class="allele-name" style="color: ${nameColor};">${item.name}</span>
          </div>
          <span class="allele-desc" style="color: ${descColor}; font-weight: ${isTargeted ? 'bold' : 'normal'};">
            ${isTargeted ? '✓ Targeted for Culling' : 'Click to target'}
          </span>
        </div>
      `;

    }).join('');

    html += `
      <div class="genetics-category" style="margin-bottom: 10px;">
        <div class="genetics-category-header">
          <h3 style="font-size: 14px; margin:0;">${locus.category}</h3>
        </div>
        <div class="allele-grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 6px; margin-top: 6px;">
          ${cardsHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = html || '<p class="small-text" style="text-align:center; padding: 20px;">No alleles discovered yet! Breed or buy medaka to unlock traits.</p>';
  updateTrackedLabel();
}

window.toggleCullingTargetAllele = function (alleleId) {
  if (!gameState.trackedAlleles) gameState.trackedAlleles = new Set();

  if (gameState.trackedAlleles.has(alleleId)) {
    gameState.trackedAlleles.delete(alleleId);
  } else {
    gameState.trackedAlleles.add(alleleId);
  }

  renderCullingTargetsModalContent();
  updateTrackedLabel();
};

function openCullingModal() {
  const currentTank = getCurrentTank();
  // Automatically default the destination tank to the basin you are currently viewing
  window.nurseryDestinationTankId = currentTank.id;

  if (!window.currentActiveClutch) {
    if (!window.pendingClutches || window.pendingClutches.length === 0) return;
    const idx = window.pendingClutches.findIndex(c => !c.tankId || c.tankId === currentTank.id);
    if (idx === -1) return;
    window.currentActiveClutch = window.pendingClutches.splice(idx, 1)[0];
    window.activeCullBabies = window.currentActiveClutch.babies.slice();
  }

  const clutch = window.currentActiveClutch;
  const modal = document.getElementById('shrimpModal');
  const content = document.getElementById('modalContent');
  const remainingCount = window.activeCullBabies.filter((b) => b !== null).length;
  const discoveredSet = window.gameState.discoveredAlleles || new Set();

  let html = `
    <h2><img src="emoji/baby.png" class="ui-emoji" alt="Eggs" /> Egg Clutch Harvest</h2>
    <p class="small-text">Offspring produced by mother: <strong>${clutch.motherName}</strong></p>

    <div class="cull-bulk-actions">
      <button class="primary-button" id="cullKeepAllBtn" title="Keyboard Shortcut: Left Arrow">
        <span>← Keep All</span> <span style="font-size: 11px; opacity: 0.85;">[←]</span>
      </button>
      <button class="danger-button" id="cullSellAllBtn" title="Keyboard Shortcut: Right Arrow">
        <span>Sell All (+$${remainingCount * 3})</span> <span style="font-size: 11px; opacity: 0.85;">[→]</span>
      </button>
    </div>

    <!-- NEW: Destination Basin Selector that remembers your chosen tank -->
    <div class="cull-destination-box">
      <label for="nurseryTankDestinationSelect" style="font-size: 12.5px; font-weight: bold; display: flex; align-items: center; gap: 5px;">
        <img src="emoji/herb.png" class="ui-emoji" alt="Destination" /> Destination Basin:
      </label>
      <select id="nurseryTankDestinationSelect" class="secondary-button" onchange="window.nurseryDestinationTankId = this.value; updateNurseryDestinationDropdown();">
      </select>
    </div>

    <div class="cull-list">
  `;

  const formatTrait = (label, val) => {
    const isNew = val && !discoveredSet.has(val);
    if (isNew) {
      return `<span class="undiscovered-trait">${label}: ${val} (NEW!)</span>`;
    }
    return `<span>${label}: ${val}</span>`;
  };

  clutch.babies.forEach((baby, idx) => {
    if (window.activeCullBabies[idx] === null) return;

    const newTraits = getUndiscoveredTraits(baby);
    const hasNew = newTraits.length > 0;
    const matchedTargets = getMatchedCullingTargets(baby);
    const isTargeted = matchedTargets.length > 0;

    const colorHtml = formatTrait('Color', baby.color);
    const bodyHtml = formatTrait('Body', baby.bodyType === 'N' ? 'Normal' : baby.bodyType);
    const finHtml = formatTrait('Fin', baby.fin);
    const eyeHtml = formatTrait('Eyes', baby.eye);
    const patternHtml = formatTrait('Pattern', baby.pattern);
    const shineHtml = formatTrait('Shine', baby.iridophore);

    // NEW: Stomach Capacity Indicator Text
    const stomachHtml = `<span>Stomach Cap: <strong>${baby.maxFood}</strong></span>`;

    // Row highlight style if targeted
    const rowStyle = isTargeted ? 'border: 2px solid #2ecc71; background: rgba(46, 204, 113, 0.08);' : '';

    html += `
      <div class="cull-row" id="cullRow_${idx}" style="${rowStyle}">
        <div class="cull-media">
          <canvas id="cullCvs_${idx}" width="144" height="144"></canvas>
        </div>
        <div class="cull-info">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <strong>${baby.name} (${baby.gender === 'M' ? '♂' : '♀'})</strong>
            ${hasNew ? '<span class="new-genetics-badge">★ NEW GENETICS</span>' : ''}
            ${isTargeted ? '<span style="background:#2ecc71; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">🎯 CULLING TARGET</span>' : ''}
          </div>
          <div class="small-text" style="margin-top: 3px; line-height: 1.4;">
            ${colorHtml} | ${bodyHtml} | ${finHtml} | ${eyeHtml}
          </div>
          <div class="small-text" style="color: var(--primary); line-height: 1.4; display: flex; gap: 10px; flex-wrap: wrap;">
            ${patternHtml} | ${shineHtml} | ${stomachHtml}
          </div>
        </div>
        <div class="cull-buttons">
          <button class="primary-button" onclick="keepCullBaby(${idx})">Keep</button>
          <button class="danger-button" onclick="sellCullBaby(${idx})">Sell ($3)</button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  content.innerHTML = html;
  modal.classList.remove('hidden');

  // Populate destination dropdown with live capacity
  updateNurseryDestinationDropdown();

  // Render sprites into canvases
  clutch.babies.forEach((baby, idx) => {
    if (window.activeCullBabies[idx] === null) return;
    const cvs = document.getElementById(`cullCvs_${idx}`);
    if (cvs && window.medakaRendererInstance) {
      window.medakaRendererInstance.buildFishSprite(baby).then((sprite) => {
        const ctx = cvs.getContext('2d');
        ctx.drawImage(sprite, 0, 0, 144, 144);
      });
    }
  });

  document.getElementById('cullKeepAllBtn').onclick = () => {
    const unhandled = window.activeCullBabies.filter((b) => b !== null);
    const targetTank = gameState.tanks[window.nurseryDestinationTankId] || getCurrentTank();

    if (targetTank.fish.length + unhandled.length > targetTank.capacity) {
      document.getElementById('capacityModal').classList.remove('hidden');
      return;
    }

    unhandled.forEach((baby) => keepBaby(baby));
    window.activeCullBabies = [];
    finishCurrentClutch();
  };

  document.getElementById('cullSellAllBtn').onclick = () => {
    const unhandled = window.activeCullBabies.filter((b) => b !== null);
    if (unhandled.length === 0) return;

    const protectedBabies = unhandled.filter(b => getMatchedCullingTargets(b).length > 0);
    if (protectedBabies.length > 0) {
      const confirmedBulkTarget = confirm(
        `⚠️ WARNING: Culling Targets in Batch!\n\n${protectedBabies.length} baby medaka in this clutch match your active Culling Targets.\n\nAre you sure you want to Sell All and discard these target traits?`
      );
      if (!confirmedBulkTarget) return;
    }

    const babiesWithNew = unhandled.filter((b) => getUndiscoveredTraits(b).length > 0);
    if (babiesWithNew.length > 0) {
      const listSummary = babiesWithNew
        .map((b) => {
          const traits = getUndiscoveredTraits(b).map((t) => `${t.label}: ${t.val}`).join(', ');
          return `• ${b.name}: ${traits}`;
        })
        .join('\n');

      const confirmed = confirm(
        `⚠️ WARNING: Undiscovered Genetics in this Clutch!\n\n${babiesWithNew.length} medaka in this clutch carry traits you have NOT discovered yet:\n\n${listSummary}\n\nAre you sure you want to Sell All and discard these new genetics?`
      );
      if (!confirmed) return;
    }

    gameState.money += unhandled.length * 3;
    playGameSound('coin');
    window.activeCullBabies = [];
    finishCurrentClutch();
  };

  updateHarvestButton();
  updateBottomEggCluster();
}


// Individual Sell with warning if undiscovered
window.sellCullBaby = function (idx) {
  const baby = window.activeCullBabies[idx];
  if (!baby) return;

  const matchedTargets = getMatchedCullingTargets(baby);
  if (matchedTargets.length > 0) {
    const confirmedTargetSell = confirm(
      `⚠️ WARNING: Culling Target Protected!\n\nThis medaka matches your active culling target(s): [${matchedTargets.join(', ')}].\n\nAre you sure you want to sell it anyway for $3?`
    );
    if (!confirmedTargetSell) return;
  }

  const newTraits = getUndiscoveredTraits(baby);
  if (newTraits.length > 0) {
    const traitList = newTraits.map((t) => `${t.label}: ${t.val}`).join(', ');
    const confirmed = confirm(
      `⚠️ WARNING: Undiscovered Genetics!\n\nThis medaka carries new trait(s) not yet unlocked in your Genetics Codex:\n👉 ${traitList}\n\nAre you sure you want to sell it for $3?`
    );
    if (!confirmed) return;
  }
  const baseValue = (baby.color === 'gfp') ? 15 : 3;
  gameState.money += baseValue;
  window.activeCullBabies[idx] = null; // Mark as handled

  const row = document.getElementById(`cullRow_${idx}`);
  if (row) row.remove();

  playGameSound('coin');
  updateTopBar();

  checkCullProgress();
};

window.keepCullBaby = function (idx) {
  const baby = window.activeCullBabies[idx];
  if (!baby) return;

  const targetTank = gameState.tanks[window.nurseryDestinationTankId] || getCurrentTank();
  if (targetTank.fish.length >= targetTank.capacity) {
    document.getElementById('capacityModal').classList.remove('hidden');
    return;
  }

  const success = keepBaby(baby);
  if (!success) return;

  window.activeCullBabies[idx] = null; // Mark as handled

  const row = document.getElementById(`cullRow_${idx}`);
  if (row) row.remove();

  // Update live counts in dropdown
  updateNurseryDestinationDropdown();
  checkCullProgress();
};


function checkCullProgress() {
  const remaining = window.activeCullBabies.filter((b) => b !== null);

  const sellAllBtn = document.getElementById('cullSellAllBtn');
  const keepAllBtn = document.getElementById('cullKeepAllBtn');
  if (sellAllBtn) {
    sellAllBtn.innerHTML = `<span>Sell All (+$${remaining.length * 3})</span> <span style="font-size: 11px; opacity: 0.85;">[→]</span>`;
    sellAllBtn.disabled = remaining.length === 0;
  }
  if (keepAllBtn) {
    keepAllBtn.disabled = remaining.length === 0;
  }

  // Auto-finish & close when the last fish is individually handled
  if (remaining.length === 0) {
    finishCurrentClutch();
  }
}

function keepBaby(baby) {
  const targetTank = gameState.tanks[window.nurseryDestinationTankId] || getCurrentTank();
  if (targetTank.fish.length >= targetTank.capacity) {
    document.getElementById('capacityModal').classList.remove('hidden');
    return false;
  }

  // Strictly enforce newborn fry status
  baby.age = 0;
  baby.isAdult = false;
  baby.carryingEggs = false;
  baby.cycleStage = 'resting';
  baby.restTimer = 45;
  baby.foodEaten = 0;
  baby.digestionTimer = 0;

  targetTank.fish.push(baby);
  registerDiscoveredPhenotype(baby);
  return true;
}


function finishCurrentClutch() {
  window.currentActiveClutch = null;
  window.activeCullBabies = [];

  const currentTank = getCurrentTank();
  const hasMoreForThisTank = (window.pendingClutches || []).some(c => !c.tankId || c.tankId === currentTank.id);

  if (hasMoreForThisTank) {
    openCullingModal();
  } else {
    document.getElementById('shrimpModal').classList.add('hidden');
    updateHarvestButton();
    updateBottomEggCluster();
  }

  updateTopBar();
  renderCensus();
}

function handleCloseNurseryModal() {
  document.getElementById('shrimpModal').classList.add('hidden');

  // If user closed the modal halfway, save remaining babies back to queue
  if (window.currentActiveClutch && window.activeCullBabies) {
    const unhandled = window.activeCullBabies.filter((b) => b !== null);
    if (unhandled.length > 0) {
      window.currentActiveClutch.babies = unhandled;
      window.pendingClutches.unshift(window.currentActiveClutch);
    }
    window.currentActiveClutch = null;
    window.activeCullBabies = [];
  }

  updateHarvestButton();
  updateBottomEggCluster();
}

// ======================================================================
// 4. FEEDING SYSTEM INTEGRATION & EARNINGS
// ======================================================================

function updateHeaderFoodDropdown() {
  const select = document.getElementById('headerFoodSelect');
  if (!select) return;

  const unlocked = gameState.unlockedFoods || [1];
  select.innerHTML = unlocked.map(tier => {
    const food = FOOD_TIERS.find(f => f.tier === tier);
    return `<option value="${tier}" ${gameState.foodTier === tier ? 'selected' : ''}>${food ? food.name : 'Food T' + tier}</option>`;
  }).join('');
}

function toggleFeedMode() {
  gameState.feedMode = !gameState.feedMode;
  const feedBtn = document.getElementById('feedModeBtn');
  const aquarium = document.getElementById('aquarium');
  const helpText = document.getElementById('aquariumHelpText');

  if (gameState.feedMode) {
    feedBtn.classList.add('active');
    feedBtn.innerHTML = `<img src="emoji/food.png" class="ui-emoji" alt="Feed" /> Feed Mode: ON`;
    aquarium.classList.add('feed-mode-active');
    helpText.innerHTML = `Hold left-click over the water to sprinkle pellets. Fish will eat until their stomach capacity is reached!`;
  } else {
    feedBtn.classList.remove('active');
    feedBtn.innerHTML = `<img src="emoji/food.png" class="ui-emoji" alt="Feed" /> Feed Mode: OFF`;
    aquarium.classList.remove('feed-mode-active');
    helpText.innerHTML = `Click any medaka in the basin to inspect its genetics, or toggle Feed Mode to nourish your school.`;
  }
}

window.rewardPelletEaten = function (pelletX, pelletY, fish, pelletTier) {
  const tier = pelletTier || gameState.foodTier || 1;
  const currentFood = FOOD_TIERS.find((f) => f.tier === tier) || FOOD_TIERS[0];
  const earn = currentFood.value;
  gameState.money += earn;

  // Visual text pop-up
  showFloatingCash(pelletX, pelletY, `+$${earn}`);
  playGameSound('eat');
  updateTopBar();
};

function showFloatingCash(x, y, text) {
  const foodLayer = document.getElementById('foodLayer');
  if (!foodLayer) return;

  const el = document.createElement('div');
  el.className = 'floating-cash';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.textContent = text;
  foodLayer.appendChild(el);

  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 850);
}

// ======================================================================
// 5. SHOP SYSTEM (BROODSTOCK, NUTRITION, BACKGROUNDS, BASINS)
// ======================================================================

function renderAllShops() {
  renderBroodstockShop();
  renderFoodShop();
  renderBackgroundShop();
  renderBasinUpgradesShop();
  renderSpeedShop();
  renderPlantShop();
}

function triggerShopConfetti(sourceBtn) {
  if (!sourceBtn) return;
  const rect = sourceBtn.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;

  const colors = ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c', '#9b59b6', '#e67e22', '#1abc9c'];
  const particleCount = 28;

  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.left = `${startX}px`;
    p.style.top = `${startY}px`;
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

    const angle = Math.random() * Math.PI * 2;
    const velocity = 40 + Math.random() * 95;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity - 25; // upward pop arc

    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);

    document.body.appendChild(p);
    setTimeout(() => {
      if (p.parentNode) p.parentNode.removeChild(p);
    }, 850);
  }
}

function renderBroodstockShop() {
  const container = document.getElementById('medakaShop');
  if (!container) return;

  const stock = [
    { color: 'brown', name: 'Kuro Wild Medaka (Pair)', cost: 50, desc: 'Wild type olive-brown pair with dominant alleles.' },
    { color: 'yellow', name: 'Ki Yellow Medaka (Pair)', cost: 245, desc: 'Pastel yellow strain carrying active xanthophore genes.' },
    { color: 'white', name: 'Shiro White Medaka (Pair)', cost: 460, desc: 'Pure milky white leucophore strain.' },
    { color: 'blue', name: 'Ao Blue Medaka (Pair)', cost: 885, desc: 'Luminous sky-blue body lacking yellow pigment.' },
    { color: 'pink', name: 'Sakura Pink Medaka (Pair)', cost: 1650, desc: 'Delicate pastel pink blushing across pearlescent scales.' },
    { color: 'black', name: 'Orochi Black Medaka (Pair)', cost: 2120, desc: 'Deep hyper-melanistic body strain.' },
    { color: 'amber', name: 'Kohaku Amber Medaka (Pair)', cost: 3150, desc: 'Warm bi-tone translucent golden strain.' }
  ];

  const discovered = gameState.discoveredAlleles || new Set();

  container.innerHTML = stock
    .map((item) => {
      const isDiscovered = discovered.has(item.color);
      const displayName = isDiscovered ? item.name : '??? (Pair)';
      const displayDesc = isDiscovered ? item.desc : 'Undiscovered strain lineage. Purchase to reveal and sequence genetics.';
      const canAfford = gameState.money >= item.cost;

      return `
        <div class="shop-card ${!isDiscovered ? 'locked-preview' : ''}">
          <div class="shrimp-preview" style="margin-bottom: 8px;">
            <canvas id="shopFish_${item.color}" class="shop-preview-cvs" width="288" height="144"></canvas>
          </div>
          <h3>${displayName}</h3>
          <p class="small-text">${displayDesc}</p>
          <div class="shop-price">$${item.cost}</div>
          <button class="primary-button shop-button" 
            ${!canAfford ? 'disabled' : ''} 
            onclick="buyBroodstock('${item.color}', ${item.cost}, this)">
            Purchase Pair
          </button>
        </div>
      `;
    })
    .join('');

  // Render preview sprites into the canvases
  stock.forEach((item) => {
    const cvs = document.getElementById(`shopFish_${item.color}`);
    if (cvs && window.medakaRendererInstance) {
      const sampleFish = {
        color: item.color,
        bodyType: 'N',
        fin: 'Hishio',
        eye: 'Normal',
        pattern: 'None',
        iridophore: 'None',
        isAdult: true
      };
      window.medakaRendererInstance.buildFishSprite(sampleFish).then((sprite) => {
        const ctx = cvs.getContext('2d');
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        const sWidth = sprite.width || 288;
        const sHeight = sprite.height >= 288 ? 144 : (sprite.height || 144);
        // Draw the fish graphic directly to fill the widescreen preview canvas
        ctx.drawImage(sprite, 0, 0, sWidth, sHeight, 0, 0, cvs.width, cvs.height);
      });
    }
  });
}

window.buyBroodstock = function (colorKey, cost, sourceBtn = null) {
  if (gameState.money < cost) return;
  const currentTank = getCurrentTank();
  if (currentTank.fish.length + 2 > currentTank.capacity) {
    document.getElementById('capacityModal').classList.remove('hidden');
    return;
  }

  const isNewDiscovery = !gameState.discoveredAlleles || !gameState.discoveredAlleles.has(colorKey);

  gameState.money -= cost;
  playGameSound('coin');

  const male = window.MedakaGenetics ? window.MedakaGenetics.createWildType('M') : createFallbackMedaka('M');
  const female = window.MedakaGenetics ? window.MedakaGenetics.createWildType('F') : createFallbackMedaka('F');

  male.color = colorKey;
  male.name = `${capitalize(colorKey)} Medaka`;
  male.genes.color = [colorKey, colorKey];

  female.color = colorKey;
  female.name = `${capitalize(colorKey)} Medaka`;
  female.genes.color = [colorKey, colorKey];

  currentTank.fish.push(male, female);
  registerDiscoveredPhenotype(male);
  registerDiscoveredPhenotype(female);

  // Pop celebration confetti if newly discovered
  if (isNewDiscovery && sourceBtn) {
    triggerShopConfetti(sourceBtn);
    showToast('New Strain Discovered!', `Sequenced ${capitalize(colorKey)} Medaka!`);
  }

  renderBroodstockShop();
  updateTopBar();
  renderCensus();
};

function renderFoodShop() {
  const container = document.getElementById('foodShop');
  if (!container) return;

  // Ensure unlockedFoods set/array exists
  if (!gameState.unlockedFoods) {
    gameState.unlockedFoods = [1]; // Tier 1 unlocked by default
  }

  container.innerHTML = FOOD_TIERS.map((food) => {
    const isUnlocked = gameState.unlockedFoods.includes(food.tier);
    const isEquipped = gameState.foodTier === food.tier;
    const canAfford = gameState.money >= food.cost;

    return `
      <div class="shop-card">
        <h3>${food.name}</h3>
        <p class="small-text">${food.desc}</p>
        <div class="shop-price">${food.cost > 0 ? '$' + food.cost : 'Default'}</div>
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          ${!isUnlocked ? `
            <button class="primary-button shop-button" 
              ${!canAfford ? 'disabled' : ''} 
              onclick="buyFoodUpgrade(${food.tier}, ${food.cost})">
              Unlock ($${food.cost})
            </button>
          ` : `
            <button class="secondary-button" style="flex: 1;" 
              ${isEquipped ? 'disabled' : ''} 
              onclick="equipFoodTier(${food.tier})">
              ${isEquipped ? 'Equipped' : 'Equip Diet'}
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  updateEquippedFoodBadge();
}

window.buyFoodUpgrade = function (targetTier, cost) {
  if (gameState.money < cost) return;
  gameState.money -= cost;

  if (!gameState.unlockedFoods) gameState.unlockedFoods = [1];
  if (!gameState.unlockedFoods.includes(targetTier)) {
    gameState.unlockedFoods.push(targetTier);
  }

  // Automatically equip upon purchase
  gameState.foodTier = targetTier;

  playGameSound('coin');
  renderFoodShop();
  updateTopBar();
  saveGame();
};

window.equipFoodTier = function (tier) {
  if (!gameState.unlockedFoods || !gameState.unlockedFoods.includes(tier)) return;
  gameState.foodTier = tier;
  playGameSound('choose');
  renderFoodShop();
  updateTopBar();
  saveGame();
};

function updateEquippedFoodBadge() {
  const currentFood = FOOD_TIERS.find((f) => f.tier === gameState.foodTier) || FOOD_TIERS[0];
  const nameEl = document.getElementById('equippedFoodName');
  const valueEl = document.getElementById('equippedFoodValue');
  if (nameEl) nameEl.textContent = currentFood.name;
  if (valueEl) valueEl.textContent = `(+$${currentFood.value}/bite)`;
}

function renderBackgroundShop() {
  const container = document.getElementById('backgroundShop');
  if (!container) return;

  container.innerHTML = BACKGROUND_CATALOG.map((bg) => {
    const isOwned = gameState.unlockedBackgrounds.includes(bg.id);
    const isEquipped = getCurrentTank().background === bg.id;
    const canAfford = gameState.money >= bg.cost;

    let buttonHtml = '';
    if (isOwned) {
      buttonHtml = `<button class="secondary-button" style="width: 100%;" ${isEquipped ? 'disabled' : ''} onclick="buyBackground('${bg.id}', 0)">${isEquipped ? 'Equipped' : 'Equip'}</button>`;
    } else {
      buttonHtml = `<button class="primary-button shop-button" style="width: 100%;" ${!canAfford ? 'disabled' : ''} onclick="buyBackground('${bg.id}', ${bg.cost})">${canAfford ? 'Purchase Basin' : `Need $${bg.cost}`}</button>`;
    }

    return `
      <div class="shop-card">
        <h3>${bg.name}</h3>
        <p class="small-text">${bg.desc}</p>
        <div class="shop-price">${bg.cost > 0 ? '$' + bg.cost : 'Default'}</div>
        ${buttonHtml}
      </div>
    `;
  }).join('');
}


window.buyBackground = function (bgId, cost) {
  if (gameState.money < cost) return;
  gameState.money -= cost;
  gameState.unlockedBackgrounds.push(bgId);
  playGameSound('coin');

  // Automatically equip newly purchased background
  getCurrentTank().background = bgId;
  applyEquippedBackground();
  updateBackgroundDropdown();
  renderBackgroundShop();
  updateTopBar();
};

function updateBackgroundDropdown() {
  const dropdown = document.getElementById('bgSelectDropdown');
  if (!dropdown) return;

  dropdown.innerHTML = BACKGROUND_CATALOG.filter((bg) => gameState.unlockedBackgrounds.includes(bg.id))
    .map((bg) => `<option value="${bg.id}">${bg.name}</option>`)
    .join('');

  dropdown.value = getCurrentTank().background;
}

function applyEquippedBackground() {
  const aquarium = document.getElementById('aquarium');
  if (!aquarium) return;

  const currentBgId = getCurrentTank().background;
  aquarium.className = `aquarium bg-${currentBgId}`;
  if (gameState.feedMode) {
    aquarium.classList.add('feed-mode-active');
  }
}

function renderBasinUpgradesShop() {
  const container = document.getElementById('tankShop');
  if (!container) return;

  const nextIndex = gameState.unlockedTanks ? gameState.unlockedTanks.length : 1;
  const nextBasin = BASIN_CATALOG[nextIndex];

  // If all basins are unlocked
  if (!nextBasin) {
    container.innerHTML = `<div class="shop-card"><h3>All Basins Unlocked</h3><p class="small-text">You have reached the maximum basin capacity expansion.</p></div>`;
    return;
  }

  const canAfford = Math.floor(gameState.money) >= nextBasin.cost;

  container.innerHTML = `
    <div class="shop-card">
      <h3>${nextBasin.name} (${nextBasin.capacity} Capacity)</h3>
      <p class="small-text">
        Purchase an independent 25-fish basin. Allows isolating breeding pairs, raising selected color morphs, and transferring medaka between ponds.
      </p>
      <div class="shop-price">$${nextBasin.cost}</div>
      <button 
        class="primary-button shop-button" 
        ${!canAfford ? 'disabled' : ''}
        onclick="buyNewBasin('${nextBasin.id}', '${nextBasin.name}', ${nextBasin.cost}, ${nextBasin.capacity})">
        ${canAfford ? 'Purchase New Basin' : `Need $${nextBasin.cost}`}
      </button>
    </div>
  `;
}

window.buyNewBasin = function (tankId, tankName, cost, capacity = 25) {
  if (gameState.money < cost) return;

  gameState.money -= cost;
  playGameSound('coin');

  if (!gameState.tanks[tankId]) {
    gameState.tanks[tankId] = {
      id: tankId,
      name: tankName, // Clean name (e.g. "Nursery Basin")
      capacity: capacity,
      background: 'blue',
      fish: [],
      plants: { hornwort: 0, watersprite: 0, spawningMop: 0 }
    };
  } else {
    gameState.tanks[tankId].name = tankName;
    gameState.tanks[tankId].capacity = capacity;
  }

  if (!gameState.unlockedTanks.includes(tankId)) {
    gameState.unlockedTanks.push(tankId);
  }

  showToast('New Basin Unlocked', `Unlocked ${tankName}`);
  switchTank(tankId);

  renderBasinUpgradesShop();
  updateTopBar();
  saveGame();
};


// ======================================================================
// TANK SWITCHING & FISH TRANSFER ENGINE
// ======================================================================

function updateTankDropdown() {
  const dropdown = document.getElementById('tankSelectDropdown');
  const title = document.getElementById('singleTankTitle');
  if (!dropdown) return;

  const unlocked = gameState.unlockedTanks || ['tank1'];

  if (unlocked.length > 1) {
    dropdown.classList.remove('hidden');
    if (title) title.classList.add('hidden');

    dropdown.innerHTML = unlocked.map((id) => {
      const t = gameState.tanks[id];
      const count = t ? t.fish.length : 0;
      const capacity = t ? t.capacity : 25;
      return `<option value="${id}">${t ? t.name : id} (${count}/${capacity})</option>`;
    }).join('');

    dropdown.value = gameState.currentTankId;
  } else {
    dropdown.classList.add('hidden');
    if (title) {
      title.classList.remove('hidden');
      const t = gameState.tanks.tank1;
      title.textContent = t ? t.name : 'Breeding Basin';
    }
  }
}

function switchTank(targetTankId) {
  if (!gameState.tanks[targetTankId]) return;

  // Deselect currently inspected fish
  if (window.deselectMedaka) window.deselectMedaka();

  gameState.currentTankId = targetTankId;

  // Smooth DOM cleanup: safely remove old fish elements without clearing innerHTML layout reflows
  if (window.fishDOMMap) {
    for (const [id, el] of window.fishDOMMap.entries()) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
    window.fishDOMMap.clear();
  }

  const layer = document.getElementById('medakaLayer');
  if (layer) layer.innerHTML = '';

  // Apply the target tank's specific equipped background
  applyEquippedBackground();
  updateBackgroundDropdown();
  updateTankDropdown();
  updateAutoFeederButtonLabel();

  updateTopBar();
  renderCensus();
  if (window.renderSidebarFishList) window.renderSidebarFishList();
  updateBottomEggCluster();
  updateHarvestButton();

  // Force immediate frame synchronization for the new tank's fish positions
  const newTank = getCurrentTank();
  if (newTank && Array.isArray(newTank.fish) && window.medakaRendererInstance) {
    newTank.fish.forEach(fish => {
      // Pre-seed physics positions so they don't spawn at (0,0) and slide in
      if (fish.x === undefined || isNaN(fish.x)) fish.x = 100 + Math.random() * 400;
      if (fish.y === undefined || isNaN(fish.y)) fish.y = 100 + Math.random() * 300;
    });
  }
}

// ======================================================================
// BASIN TRANSFER POP-UP MODAL ENGINE (Replaces browser prompt)
// ======================================================================

window.pendingMoveFishList = [];

// 1. Move Single Fish from Inspect Card
window.openMoveModalForInspected = function (fishId) {
  const currentTank = getCurrentTank();
  const fish = currentTank.fish.find((f) => f.id === fishId);
  if (!fish) return;
  openMoveModal([fish], `Transfer ${fish.name}`);
};

// 2. Move Selected Fish from Select Mode
window.moveSelectedFish = function () {
  const currentTank = getCurrentTank();
  const toMove = currentTank.fish.filter((f) => gameState.selectedFishIds.has(f.id));
  if (toMove.length === 0) return;
  openMoveModal(toMove, `Transfer ${toMove.length} Selected Medaka`);
};

// Opens the styled in-game pop-up
function openMoveModal(fishArray, titleText) {
  window.pendingMoveFishList = fishArray;
  const modal = document.getElementById('moveModal');
  const subtitle = document.getElementById('moveModalSubtitle');
  const container = document.getElementById('moveModalTankList');
  if (!modal || !container) return;

  const unlocked = gameState.unlockedTanks || ['tank1'];
  const otherTanks = unlocked.filter((id) => id !== gameState.currentTankId);

  if (otherTanks.length === 0) {
    if (subtitle) subtitle.textContent = titleText || 'Transfer fish';
    container.innerHTML = `
      <div style="text-align: center; padding: 20px 10px;">
        <p class="small-text" style="font-size: 14px; margin-bottom: 16px; color: var(--danger); font-weight: bold;">
          You only have 1 basin! Purchase another basin in the Shop to transfer fish.
        </p>
        <button class="primary-button" style="padding: 8px 20px;" onclick="document.getElementById('moveModal').classList.add('hidden'); window.pendingMoveFishList = [];">Close</button>
      </div>
    `;
    modal.classList.remove('hidden');
    return;
  }

  if (subtitle) {
    subtitle.textContent = `${titleText || 'Transfer fish'} (${fishArray.length} fish to move):`;
  }

  // Render clean culling-style rows for each available destination
  container.innerHTML = otherTanks.map((tankId) => {
    const t = gameState.tanks[tankId];
    if (!t) return '';
    const currentCount = t.fish.length;
    const capacity = t.capacity || 25;
    const freeSlots = capacity - currentCount;
    const wouldExceed = (currentCount + fishArray.length) > capacity;

    return `
      <div class="cull-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; margin-bottom: 4px;">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <strong style="font-size: 14px;">${t.name}</strong>
          <span class="small-text" style="color: ${wouldExceed ? 'var(--danger)' : 'var(--muted)'};">
            Capacity: ${currentCount} / ${capacity} ${wouldExceed ? '(Not enough space!)' : `(${freeSlots} slots free)`}
          </span>
        </div>
        <button 
          class="primary-button" 
          style="padding: 8px 16px; font-size: 13px;"
          ${wouldExceed ? 'disabled' : ''} 
          onclick="confirmTransferFish('${tankId}')">
          Transfer Here
        </button>
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
}

// Executes transfer when clicking "Transfer Here" in the pop-up
window.confirmTransferFish = function (targetTankId) {
  const modal = document.getElementById('moveModal');
  const targetTank = gameState.tanks[targetTankId];
  const currentTank = getCurrentTank();
  if (!targetTank || !currentTank || !window.pendingMoveFishList.length) return;

  if (targetTank.fish.length + window.pendingMoveFishList.length > targetTank.capacity) {
    document.getElementById('capacityModal')?.classList.remove('hidden');
    return;
  }

  const movingIds = new Set(window.pendingMoveFishList.map((f) => f.id));

  // Move fish into destination tank
  targetTank.fish.push(...window.pendingMoveFishList);
  currentTank.fish = currentTank.fish.filter((f) => !movingIds.has(f.id));

  // Reset physics coordinates in new tank
  window.pendingMoveFishList.forEach((f) => {
    delete f.x;
    delete f.y;
    delete f.vx;
    delete f.vy;
  });

  if (modal) modal.classList.add('hidden');
  if (window.deselectMedaka) window.deselectMedaka();
  if (gameState.selectMode) toggleSelectMode();

  playGameSound('bubble');
  showToast('Fish Transferred', `Moved ${window.pendingMoveFishList.length} medaka to ${targetTank.name}`);

  window.pendingMoveFishList = [];
  updateTopBar();
  renderCensus();
  updateTankDropdown();
  if (window.renderSidebarFishList) window.renderSidebarFishList();
  saveGame();
};

// 3. Sell Single Fish from Inspect Card
window.sellInspectedFish = function (fishId) {
  const currentTank = getCurrentTank();
  const fishIndex = currentTank.fish.findIndex((f) => f.id === fishId);
  if (fishIndex === -1) return;

  const fish = currentTank.fish[fishIndex];

  // Warning if selling a fish with undiscovered genetics
  const newTraits = getUndiscoveredTraits(fish);
  if (newTraits.length > 0) {
    const traitList = newTraits.map((t) => `${t.label}: ${t.val}`).join(', ');
    const confirmed = confirm(
      `⚠️ WARNING: Undiscovered Genetics!\n\nThis fish has traits you have NOT unlocked in your Genetics Codex:\n👉 ${traitList}\n\nAre you sure you want to sell it for $8?`
    );
    if (!confirmed) return;
  }

  currentTank.fish.splice(fishIndex, 1);
  const value = (fish.color === 'fuchsia') ? 250 : (fish.color === 'gfp' ? 35 : 8);
  gameState.money += value;
  playGameSound('coin');

  playGameSound('coin');

  if (window.deselectMedaka) window.deselectMedaka();
  updateTopBar();
  renderCensus();
  if (window.renderSidebarFishList) window.renderSidebarFishList();
  saveGame();
};

// Auto-Feeder Capacity Upgrades (100 to 500 pellets)
const AUTO_FEEDER_CAPACITY_LEVELS = [
  { level: 1, cost: 200, maxPellets: 100, desc: 'Installs basin feeder. Hopper holds up to 100 pellets.' },
  { level: 2, cost: 450, maxPellets: 200, desc: 'Expands hopper to 200 pellets.' },
  { level: 3, cost: 900, maxPellets: 300, desc: 'Reinforced hopper. Holds 300 pellets.' },
  { level: 4, cost: 1800, maxPellets: 400, desc: 'Heavy-duty hopper. Holds 400 pellets.' },
  { level: 5, cost: 3500, maxPellets: 500, desc: 'Master hopper. Maximum 500 pellets.' }
];

// Auto-Feeder Time Upgrades (10 seconds down to 2 seconds)
const AUTO_FEEDER_TIME_LEVELS = [
  { level: 1, cost: 0, interval: 10, desc: 'Standard motor: 1 pellet every 10s.' },
  { level: 2, cost: 400, interval: 8, desc: 'Quick motor: 1 pellet every 8s.' },
  { level: 3, cost: 850, interval: 6, desc: 'Turbo motor: 1 pellet every 6s.' },
  { level: 4, cost: 1750, interval: 4, desc: 'High-speed motor: 1 pellet every 4s.' },
  { level: 5, cost: 3200, interval: 2, desc: 'Maximum overdrive: 1 pellet every 2s.' }
];

function getTankFeederCapacity(tank) {
  const lvl = tank ? (tank.autoFeederCapacityLevel || tank.autoFeederLevel || 0) : 0;
  const tier = AUTO_FEEDER_CAPACITY_LEVELS.find(t => t.level === lvl);
  return tier ? tier.maxPellets : 0;
}

function getTankFeederInterval(tank) {
  const lvl = tank ? (tank.autoFeederTimeLevel || 1) : 1;
  const tier = AUTO_FEEDER_TIME_LEVELS.find(t => t.level === lvl);
  return tier ? tier.interval : 10;
}

function renderSpeedShop() {
  const container = document.getElementById('speedShop');
  if (!container) return;

  if (!window.gameState.unlockedSpeeds) {
    window.gameState.unlockedSpeeds = [1];
  }

  // 1. Render Speed Accelerators
  let html = SPEED_SHOP_CATALOG.map((item) => {
    const isUnlocked = window.gameState.unlockedSpeeds.includes(item.speed);
    const hasPrereq = !item.prereq || window.gameState.unlockedSpeeds.includes(item.prereq);
    const canAfford = gameState.money >= item.cost;
    const canBuy = !isUnlocked && hasPrereq && canAfford;

    let buttonText = 'Purchase Speed';
    if (isUnlocked) {
      buttonText = 'Unlocked';
    } else if (!hasPrereq) {
      buttonText = `Requires ${item.prereq}x First`;
    }

    return `
      <div class="shop-card">
        <h3>${item.name}</h3>
        <p class="small-text">${item.desc}</p>
        <div class="shop-price">$${item.cost}</div>
        <button class="primary-button shop-button" 
          ${!canBuy ? 'disabled' : ''} 
          onclick="buySpeedUpgrade(${item.speed}, ${item.cost})">
          ${buttonText}
        </button>
      </div>
    `;
  }).join('');

  // 2. Render Automatic Feeder Upgrade Card with Capacity & Time buttons side-by-side
  const currentTank = getCurrentTank();
  const capLvl = currentTank.autoFeederCapacityLevel || currentTank.autoFeederLevel || 0;
  const timeLvl = currentTank.autoFeederTimeLevel || (capLvl > 0 ? 1 : 0);
  const isInstalled = capLvl > 0;

  const nextCapTier = AUTO_FEEDER_CAPACITY_LEVELS.find(t => t.level === capLvl + 1);
  const nextTimeTier = AUTO_FEEDER_TIME_LEVELS.find(t => t.level === timeLvl + 1);

  const canAffordCap = nextCapTier && gameState.money >= nextCapTier.cost;
  const canAffordTime = isInstalled && nextTimeTier && gameState.money >= nextTimeTier.cost;

  // Button text labels
  const capBtnLabel = capLvl >= 5 ? 'Max (500)' : (!isInstalled ? `Install ($${nextCapTier.cost})` : `Lvl ${capLvl + 1} ($${nextCapTier.cost})`);
  const timeBtnLabel = !isInstalled ? 'Need Feeder' : (timeLvl >= 5 ? 'Max (2s)' : `Lvl ${timeLvl + 1}: ${nextTimeTier.interval}s ($${nextTimeTier.cost})`);

  html += `
    <div class="shop-card" style="border: 2px solid var(--primary); background: rgba(59, 157, 184, 0.05); grid-column: span 2;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;"><img src="emoji/food.png" class="ui-emoji" alt="Feeder" /> Auto-Feeder Modules</h3>
        <span class="small-text" style="font-weight:bold; color:var(--primary);">${currentTank.name}</span>
      </div>
      
      <div style="margin: 8px 0; font-size: 12px; color: var(--text); display: flex; gap: 20px;">
        <span><strong>Capacity:</strong> ${isInstalled ? `${getTankFeederCapacity(currentTank)} pellets (Lvl ${capLvl}/5)` : 'Not Installed'}</span>
        <span><strong>Interval:</strong> ${isInstalled ? `${getTankFeederInterval(currentTank)}s per pellet (Lvl ${timeLvl}/5)` : 'Locked (10s)'}</span>
      </div>

      <!-- SIDE-BY-SIDE BUTTONS WITH LABELS ON TOP -->
      <div style="display: flex; gap: 12px; margin-top: 10px;">
        <!-- Left: Capacity -->
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted);">Capacity</span>
          <button class="primary-button shop-button" 
            style="width: 100%; padding: 8px 4px; font-size: 12px;"
            ${capLvl >= 5 || !canAffordCap ? 'disabled' : ''} 
            onclick="buyAutoFeederCapacityUpgrade()">
            ${capBtnLabel}
          </button>
        </div>

        <!-- Right: Time -->
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted);">Time</span>
          <button class="primary-button shop-button" 
            style="width: 100%; padding: 8px 4px; font-size: 12px;"
            ${!isInstalled || timeLvl >= 5 || !canAffordTime ? 'disabled' : ''} 
            onclick="buyAutoFeederTimeUpgrade()">
            ${timeBtnLabel}
          </button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

window.buyAutoFeederCapacityUpgrade = function () {
  const currentTank = getCurrentTank();
  const capLvl = currentTank.autoFeederCapacityLevel || currentTank.autoFeederLevel || 0;
  if (capLvl >= 5) return;

  const nextTier = AUTO_FEEDER_CAPACITY_LEVELS.find(t => t.level === capLvl + 1);
  if (!nextTier || gameState.money < nextTier.cost) return;

  gameState.money -= nextTier.cost;
  currentTank.autoFeederCapacityLevel = capLvl + 1;
  currentTank.autoFeederLevel = currentTank.autoFeederCapacityLevel;

  // Initialize feeder runtime and base time level if first installation
  if (!currentTank.autoFeederTimeLevel) {
    currentTank.autoFeederTimeLevel = 1;
  }
  currentTank.autoFeeder = currentTank.autoFeeder || { queue: [], timer: getTankFeederInterval(currentTank) };

  playGameSound('coin');
  showToast('Capacity Upgraded', `${currentTank.name} hopper expanded to ${nextTier.maxPellets} pellets!`);

  renderSpeedShop();
  updateAutoFeederButtonLabel();
  updateTopBar();
  saveGame();
};

window.buyAutoFeederTimeUpgrade = function () {
  const currentTank = getCurrentTank();
  const capLvl = currentTank.autoFeederCapacityLevel || currentTank.autoFeederLevel || 0;
  if (capLvl <= 0) return; // Feeder must be installed first

  const timeLvl = currentTank.autoFeederTimeLevel || 1;
  if (timeLvl >= 5) return;

  const nextTier = AUTO_FEEDER_TIME_LEVELS.find(t => t.level === timeLvl + 1);
  if (!nextTier || gameState.money < nextTier.cost) return;

  gameState.money -= nextTier.cost;
  currentTank.autoFeederTimeLevel = timeLvl + 1;

  playGameSound('coin');
  showToast('Speed Upgraded', `${currentTank.name} feeder now dispenses every ${nextTier.interval} seconds!`);

  renderSpeedShop();
  updateAutoFeederButtonLabel();
  updateTopBar();
  saveGame();
};

window.buySpeedUpgrade = function (speedVal, cost) {
  const catalogItem = SPEED_SHOP_CATALOG.find((s) => s.speed === speedVal);
  if (catalogItem && catalogItem.prereq && !gameState.unlockedSpeeds.includes(catalogItem.prereq)) {
    showToast('Speed Locked', `You must unlock ${catalogItem.prereq}x speed first!`);
    return;
  }

  if (gameState.money < cost) return;
  gameState.money -= cost;
  if (!gameState.unlockedSpeeds.includes(speedVal)) {
    gameState.unlockedSpeeds.push(speedVal);
  }
  playGameSound('coin');
  renderSpeedShop();
  updateSpeedButtonsUI();
  updateTopBar();
  saveGame();
};

function renderPlantShop() {
  const container = document.getElementById('plantShop');
  if (!container) return;

  const tank = getCurrentTank();
  container.innerHTML = PLANT_CATALOG.map((plant) => {
    const currentLevel = tank.plants[plant.id] || 0;
    const isMax = currentLevel >= 20;

    // Log-scale price calculation: baseCost * (1.35 ^ currentLevel)
    const baseCost = plant.cost;
    const nextCost = isMax ? 0 : Math.round(baseCost * Math.pow(1.35, currentLevel));
    const canAfford = gameState.money >= nextCost;

    return `
      <div class="shop-card">
        <h3>${plant.name} (Lvl ${currentLevel}/20)</h3>
        <p class="small-text">${plant.desc}</p>
        <div class="shop-price">${isMax ? 'MAX LEVEL' : '$' + nextCost}</div>
        <button class="primary-button shop-button" 
          ${isMax || !canAfford ? 'disabled' : ''} 
          onclick="buyPlantUpgrade('${plant.id}', ${baseCost})">
          ${isMax ? 'Maxed Out' : 'Upgrade Plant'}
        </button>
      </div>
    `;
  }).join('');
}

window.buyPlantUpgrade = function (plantId, baseCost) {
  const tank = getCurrentTank();
  const currentLevel = tank.plants[plantId] || 0;
  if (currentLevel >= 20) return;

  const nextCost = Math.round(baseCost * Math.pow(1.35, currentLevel));
  if (gameState.money < nextCost) return;

  gameState.money -= nextCost;
  tank.plants[plantId] = currentLevel + 1;
  playGameSound('coin');
  renderPlantShop();
  updateTopBar();
  renderCensus();
};

// ======================================================================
// 6. SPECIMEN INSPECTOR & PHENOTYPE CODEX
// ======================================================================

window.inspectMedaka = function (fishId) {
  console.log('[INSPECT] Selecting fish:', fishId);

  gameState.inspectedFishId = fishId;

  if (typeof window.playGameSound === 'function') {
    window.playGameSound('choose');
  }

  updateInspectedCard();

  // Rebuild the list so the blue selection is updated.
  if (window.renderSidebarFishList) {
    window.renderSidebarFishList();
  }

  // The list has now been rebuilt, so wait one frame before scrolling it.
  requestAnimationFrame(() => {
    if (window.scrollFishListToFish) {
      window.scrollFishListToFish(fishId);
    }
  });

  switchTab('tank');
};

// Deselects fish, turns off the highlight, and resets the info card
window.deselectMedaka = function () {
  if (!gameState || !gameState.inspectedFishId) return;
  gameState.inspectedFishId = null;
  currentRenderedFishId = null;
  currentRenderedStage = null;
  updateInspectedCard();
  if (window.renderSidebarFishList) {
    window.renderSidebarFishList();
  }
};

let currentRenderedFishId = null;
let currentRenderedStage = null; // Tracks 'adult' vs 'fry'

function updateInspectedCard() {
  const container = document.getElementById('selectedShrimp');
  if (!container) return;

  const tank = getCurrentTank();
  const fish = tank.fish.find((f) => f.id === gameState.inspectedFishId);

  if (!fish) {
    currentRenderedFishId = null;
    currentRenderedStage = null;
    container.innerHTML = `<div class="empty-selection">Click a Medaka in the basin to inspect its expressed traits and alleles.</div>`;
    return;
  }

  const fishStage = fish.isAdult ? 'adult' : 'fry';

  // If already rendered for this fish AND at the same life stage, do smooth 60 FPS progress updates
  if (currentRenderedFishId === fish.id && currentRenderedStage === fishStage) {
    updateInspectedCardRealtime(fish);
    return;
  }

  currentRenderedFishId = fish.id;
  currentRenderedStage = fishStage;

  // Title & Subtitle: Fry show as Whitish Medaka Fry without expressing adult colors yet
  const initialPercent = Math.min(100, Math.round(((fish.age || 0) / 50) * 100));
  const subtitle = fish.isAdult
    ? 'Adult Broodstock'
    : `Growing Fry <span id="inspectSubtitleText">${initialPercent}</span>%)`;

  container.innerHTML = `
    <div class="selected-card">
      <div class="selected-image">
        <canvas id="inspectFishCanvas" width="144" height="144"></canvas>
      </div>
      <div>
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <input type="text" id="inspectFishNameInput" value="${fish.name}" 
            style="font-size: 16px; font-weight: bold; padding: 3px 8px; border: 1.5px solid var(--border); border-radius: 6px; background: var(--panel); color: var(--text); width: 100%;"
            onchange="updateInspectedFishName('${fish.id}', this.value)" 
            placeholder="Fish Name..." />
          <span style="font-size: 14px; font-weight: bold; flex-shrink: 0;">(${fish.gender === 'M' ? '♂' : '♀'})</span>
        </div>
        <p class="small-text" style="margin-top: 0;" id="inspectSubtitleContainer">${subtitle}</p>
        
        <!-- Satiety & Digestion Bar -->
        <div class="satiety-bar-wrapper">
          <div style="display:flex; justify-content:space-between; font-size:11px;">
            <span>Stomach Fullness</span>
            <strong id="inspectFullnessText">${fish.foodEaten} / ${fish.maxFood}</strong>
          </div>
          <div class="satiety-bar">
            <div id="inspectSatietyFill" class="satiety-fill" style="width: 0%;"></div>
          </div>
          <span id="inspectDigestionText" class="small-text" style="font-size:10px;">Digestion: ${fish.digestionTime}s per bite</span>
        </div>

        <!-- Real-Time Female Egg Reproduction Cycle Bar (Adult Females Only) -->
        <div id="inspectEggCycleContainer" class="egg-cycle-bar-wrapper ${fish.gender === 'F' && fish.isAdult ? '' : 'hidden'}">
          <div style="display:flex; justify-content:space-between; font-size:11px;">
            <span id="inspectCycleTitle"><strong>Cycle:</strong> Resting Time</span>
            <span id="inspectCycleSubtitle" style="font-size:10px; color:var(--muted);">0.0s left</span>
          </div>
          <div class="egg-cycle-bar">
            <div id="inspectCycleFill" class="egg-cycle-fill stage-resting" style="width: 0%;"></div>
          </div>
        </div>

        <!-- NEW: Inspect Card Move & Sell Buttons -->
        <div class="inspect-actions">
          <button class="secondary-button" onclick="openMoveModalForInspected('${fish.id}')">
            <img src="emoji/herb.png" class="ui-emoji" alt="Move" /> Move
          </button>
          <button class="danger-button" onclick="sellInspectedFish('${fish.id}')">
            <img src="emoji/dollar.png" class="ui-emoji" alt="Sell" /> Sell ($8)
          </button>
        </div>
        
      </div>
    </div>

    <!-- Genetics Breakdown: Shows genotype genes, but notes unexpressed phenotype until adult -->
    <div class="detail-list" style="margin-top: 14px;">
      <div class="detail-item">
        <span>Expressed Color</span>
        <strong>${fish.isAdult ? capitalize(fish.color) : 'Whitish (Unexpressed)'}</strong>
      </div>
      <div class="detail-item">
        <span>Color Alleles (Genes)</span>
        <strong>${fish.genes.color.join(' / ')}</strong>
      </div>
      <div class="detail-item">
        <span>Body Shape</span>
        <strong>${fish.isAdult ? (fish.bodyType === 'N' ? 'Normal' : fish.bodyType === 'H' ? 'Hikari' : fish.bodyType === 'D' ? 'Daruma' : 'Hikari Daruma') : 'Normal (Larval)'}</strong>
      </div>
      <div class="detail-item">
        <span>Eye Structure</span>
        <strong>${fish.eye}</strong>
      </div>
      <div class="detail-item">
        <span>Fin Type</span>
        <strong>${fish.isAdult ? fish.fin : 'Hishio (Unexpressed)'}</strong>
      </div>
      <div class="detail-item">
        <span>Iridophore Shine</span>
        <strong>${fish.isAdult ? (window.MedakaConfig?.IRIDOPHORES?.[fish.iridophore]?.name || fish.iridophore) : 'None (Unexpressed)'}</strong>
      </div>
      <div class="detail-item" style="grid-column: span 2;">
        <span>Pattern</span>
        <strong style="color: var(--primary);">${fish.isAdult ? (window.MedakaConfig?.PATTERNS?.[fish.pattern]?.name || fish.pattern) : 'None (Unexpressed)'}</strong>
      </div>
    </div>
  `;

  // Draw sprite (will render the whitish fry sprite if isAdult === false)
  const cvs = document.getElementById('inspectFishCanvas');
  if (cvs && window.medakaRendererInstance) {
    window.medakaRendererInstance.buildFishSprite(fish).then((sprite) => {
      const ctx = cvs.getContext('2d');
      ctx.clearRect(0, 0, 144, 144);
      ctx.drawImage(sprite, 0, 0, 144, 144);
    });
  }

  updateInspectedCardRealtime(fish);
}

window.updateInspectedFishName = function (fishId, newName) {
  const tank = getCurrentTank();
  const fish = tank.fish.find((f) => f.id === fishId);
  if (!fish) return;

  const trimmed = newName.trim();
  fish.name = trimmed || 'Unnamed Medaka';

  // 1. Immediately update the floating name tag over the fish in the aquarium view
  const fishEl = document.getElementById(`medaka_${fishId}`);
  if (fishEl) {
    const nameTag = fishEl.querySelector('.medaka-name-tag');
    if (nameTag) {
      nameTag.textContent = `${fish.name} (${fish.gender})`;
    }
  }

  // 2. Save changes and refresh sidebar list
  saveGame();
  if (window.renderSidebarFishList) {
    window.renderSidebarFishList();
  }
};

// 60 FPS Real-time update function (no canvas redraw, zero flickering)
window.updateInspectedCardRealtime = function (targetFish) {
  const tank = getCurrentTank ? getCurrentTank() : window.gameState.tanks.tank1;
  const fish = targetFish || (tank ? tank.fish.find((f) => f.id === gameState.inspectedFishId) : null);
  if (!fish) return;

  // 0. Update subtitle metadata live (e.g. Growing Fry maturing percentage)
  const subtitleEl = document.getElementById('inspectSubtitleText');
  if (subtitleEl && !fish.isAdult) {
    const percent = Math.min(100, Math.round(((fish.age || 0) / 50) * 100));
    subtitleEl.textContent = ` (Whitish Translucent • Maturing: ${percent}`;
  }

  // 1. Stomach fullness & live digestion countdown
  const satietyFill = document.getElementById('inspectSatietyFill');
  const fullnessText = document.getElementById('inspectFullnessText');
  const digestionText = document.getElementById('inspectDigestionText');

  if (satietyFill && fullnessText) {
    const isFull = fish.foodEaten >= fish.maxFood;
    const satietyPercent = Math.min(100, Math.round((fish.foodEaten / fish.maxFood) * 100));
    satietyFill.style.width = `${satietyPercent}%`;
    satietyFill.classList.toggle('full', isFull);
    fullnessText.textContent = `${fish.foodEaten} / ${fish.maxFood} ${isFull ? '(Full)' : ''}`;

    if (digestionText) {
      if (fish.foodEaten > 0) {
        const remainingDigestion = Math.max(0, (fish.digestionTime - (fish.digestionTimer || 0))).toFixed(1);
        digestionText.textContent = `Digesting: ${remainingDigestion}s until next bite clears`;
      } else {
        digestionText.textContent = `Stomach empty (${fish.digestionTime}s digestion per bite)`;
      }
    }
  }

  // 2. Real-Time Female Egg Cycle Progress Bar
  const cycleContainer = document.getElementById('inspectEggCycleContainer');
  const cycleTitle = document.getElementById('inspectCycleTitle');
  const cycleSubtitle = document.getElementById('inspectCycleSubtitle');
  const cycleFill = document.getElementById('inspectCycleFill');

  if (cycleContainer && fish.gender === 'F' && fish.isAdult) {
    cycleContainer.classList.remove('hidden');

    const stage = fish.cycleStage || (fish.carryingEggs ? 'has_eggs' : 'resting');
    let title = 'Resting Time';
    let subtitle = '';
    let percent = 0;
    let stageClass = 'stage-resting';

    if (stage === 'has_eggs') {
      title = 'Carrying Eggs (Vent)';
      const remaining = Math.max(0, fish.eggTimer || 0);
      subtitle = `${remaining.toFixed(1)}s until dropping`;
      percent = Math.min(100, Math.max(0, (1 - remaining / (fish.eggDuration || 40)) * 100));
      stageClass = 'stage-has_eggs';
    } else if (stage === 'dropping_eggs') {
      title = 'Dropping Eggs (Depositing)';
      const remaining = Math.max(0, fish.dropTimer || 0);
      subtitle = `${remaining.toFixed(1)}s to nursery`;
      percent = Math.min(100, Math.max(0, (1 - remaining / (fish.dropDuration || 20)) * 100));
      stageClass = 'stage-dropping_eggs';
    } else {
      title = 'Resting Cooldown';
      const remaining = Math.max(0, fish.restTimer || 0);
      subtitle = remaining > 0 ? `${remaining.toFixed(1)}s left` : 'Ready to mate';
      percent = Math.min(100, Math.max(0, (1 - remaining / (fish.restDuration || 45)) * 100));
      stageClass = 'stage-resting';
    }

    if (cycleTitle) cycleTitle.innerHTML = `<strong>Cycle:</strong> ${title}`;
    if (cycleSubtitle) cycleSubtitle.textContent = subtitle;
    if (cycleFill) {
      cycleFill.className = `egg-cycle-fill ${stageClass}`;
      cycleFill.style.width = `${percent.toFixed(1)}%`;
    }
  } else if (cycleContainer) {
    cycleContainer.classList.add('hidden');
  }
};


// ======================================================================
// 6. ALLELE DISCOVERY & GENETICS CODEX
// ======================================================================

function registerDiscoveredPhenotype(fish) {
  if (!fish) return;

  if (!gameState.discoveredAlleles) gameState.discoveredAlleles = new Set();
  if (!gameState.discoveredPhenotypes) gameState.discoveredPhenotypes = new Set();

  // Register combined phenotype for legacy achievements
  const phenoKey = `${fish.color}_${fish.bodyType}_${fish.fin}_${fish.eye}_${fish.pattern}_${fish.iridophore}`;
  gameState.discoveredPhenotypes.add(phenoKey);

  // Register each individual allele
  const traits = [fish.color, fish.bodyType, fish.fin, fish.eye, fish.pattern, fish.iridophore];
  let isNewDiscovery = false;

  traits.forEach((t) => {
    if (t && !gameState.discoveredAlleles.has(t)) {
      gameState.discoveredAlleles.add(t);
      isNewDiscovery = true;
    }
  });

  if (isNewDiscovery) {
    renderGeneticsTree();
    checkAchievements();
  }
}

function renderGeneticsTree() {
  const container = document.getElementById('geneticsTree');
  if (!container) return;

  const cfg = window.MedakaConfig;
  if (!cfg) return;

  // Make sure existing tank fish alleles are registered
  if (gameState.tanks) {
    for (const tid in gameState.tanks) {
      const tank = gameState.tanks[tid];
      if (tank && Array.isArray(tank.fish)) {
        tank.fish.forEach((f) => {
          [f.color, f.bodyType, f.fin, f.eye, f.pattern, f.iridophore].forEach((trait) => {
            if (trait) gameState.discoveredAlleles.add(trait);
          });
        });
      }
    }
  }

  const discovered = gameState.discoveredAlleles || new Set();

  const LOCI = [
    {
      category: '1. Body Pigmentation',
      items: Object.values(cfg.COLORS).map((c) => ({
        id: c.id,
        name: c.name,
        desc: c.desc,
        colorHex: c.hex
      }))
    },
    {
      category: '2. Spinal Architecture (Body Shape)',
      items: Object.values(cfg.BODY_TYPES).map((b) => ({
        id: b.code,
        name: `${b.name} (${b.code})`,
        desc: b.desc
      }))
    },
    {
      category: '3. Eye Structures',
      items: Object.values(cfg.EYE_TYPES).map((e) => ({
        id: e.id,
        name: e.name,
        desc: e.desc
      }))
    },
    {
      category: '4. Fin Architecture',
      items: Object.values(cfg.FIN_TYPES).map((f) => ({
        id: f.id,
        name: f.name,
        desc: f.desc
      }))
    },
    {
      category: '5. Scale Iridophores (Guanine Sheen)',
      items: Object.values(cfg.IRIDOPHORES).map((i) => ({
        id: i.id,
        name: i.name,
        desc: i.desc
      }))
    },
    {
      category: '6. Environmental Adaptation Patterns',
      items: Object.values(cfg.PATTERNS).map((p) => ({
        id: p.id,
        name: p.name,
        desc: p.desc
      }))
    }
  ];

  let totalTraits = 0;
  let totalDiscovered = 0;

  let html = '';

  LOCI.forEach((locus) => {
    let catDiscovered = 0;
    const cardsHtml = locus.items
      .map((item) => {
        totalTraits++;
        const isUnlocked = discovered.has(item.id);
        if (isUnlocked) {
          totalDiscovered++;
          catDiscovered++;
        }

        const swatchHtml = item.colorHex
          ? `<span class="allele-swatch ${isUnlocked ? '' : 'locked'}" style="${isUnlocked ? `background:${item.colorHex};` : ''}"></span>`
          : '';

        return `
          <div class="allele-card ${isUnlocked ? 'discovered' : 'locked'}" title="${isUnlocked ? item.desc : 'Undiscovered allele'}">
            <div class="allele-header-row">
              ${swatchHtml}
              <span class="allele-name">${isUnlocked ? item.name : '???'}</span>
            </div>
            <span class="allele-desc">${isUnlocked ? item.desc : 'Breed or purchase new lineages to discover.'}</span>
          </div>
        `;
      })
      .join('');

    html += `
      <div class="genetics-category">
        <div class="genetics-category-header">
          <h3>${locus.category}</h3>
          <span class="genetics-category-count">${catDiscovered} / ${locus.items.length} Unlocked</span>
        </div>
        <div class="allele-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  const totalEl = document.getElementById('geneticsDiscoveryTotal');
  if (totalEl) {
    totalEl.textContent = `${totalDiscovered} / ${totalTraits} Discovered`;
  }
}

// Opens and renders the Auto-Feeder Menu
function openAutoFeederModal() {
  const currentTank = getCurrentTank();
  const feederLevel = currentTank.autoFeederLevel || 0;

  if (feederLevel <= 0) {
    showToast('Feeder Not Installed', `Purchase the Automatic Feeder for ${currentTank.name} in the Shop!`);
    return;
  }

  const modal = document.getElementById('autoFeederModal');
  const foodList = document.getElementById('autoFeederFoodList');
  const subtitle = document.getElementById('autoFeederModalSubtitle');
  if (!modal || !foodList) return;

  const maxCapacity = getTankFeederCapacity(currentTank) || 100;
  const currentInterval = getTankFeederInterval(currentTank);
  const timeLvl = currentTank.autoFeederTimeLevel || 1;

  // FIX: Properly define currentLoaded here before using it in the subtitle template
  const currentLoaded = (currentTank.autoFeeder && currentTank.autoFeeder.queue) ? currentTank.autoFeeder.queue.length : 0;

  if (subtitle) {
    subtitle.innerHTML = `Basin: <strong>${currentTank.name}</strong> • Capacity: <strong>${currentLoaded} / ${maxCapacity}</strong> • Dispenser: <strong>1 pellet every ${currentInterval}s</strong> (Speed Lvl ${timeLvl}/5)`;
  }

  const unlocked = gameState.unlockedFoods || [1];

  foodList.innerHTML = unlocked.map((tier) => {
    const food = FOOD_TIERS.find(f => f.tier === tier) || FOOD_TIERS[0];
    const cost = food.value;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--panel); border: 1.5px solid var(--border); border-radius: 8px;">
        <div>
          <strong style="font-size: 13.5px; display: block;">${food.name}</strong>
          <span class="small-text" style="color: var(--muted); font-size: 11px;">$${cost} per pellet</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <!-- MAX BUTTON TO THE LEFT OF INPUT -->
          <button type="button" 
            class="secondary-button" 
            style="padding: 4px 8px; font-size: 11px; font-weight: bold; border-radius: 6px; border: 1.5px solid var(--border); cursor: pointer;"
            onclick="setMaxAutoFeedPellets(${tier})">
            Max
          </button>
          <input type="number" 
            class="auto-feed-input" 
            data-tier="${tier}" 
            data-cost="${cost}" 
            min="0" 
            max="500" 
            value="0" 
            style="width: 75px; padding: 5px 8px; font-size: 13px; font-weight: bold; text-align: right; border-radius: 6px; border: 1.5px solid var(--border); background: var(--background); color: var(--text);"
            oninput="calculateAutoFeederTotals()" />
          <span style="font-size: 12px; color: var(--muted);">pellets</span>
        </div>
      </div>
    `;
  }).join('');

  calculateAutoFeederTotals();
  modal.classList.remove('hidden');
}

// Dynamic recalculation: Enforces up to 500 pellets per buy and checks hopper capacity
window.calculateAutoFeederTotals = function () {
  const currentTank = getCurrentTank();
  const feederLevel = currentTank.autoFeederLevel || 1;
  const maxCapacity = Math.min(500, feederLevel * 100);
  const currentLoaded = (currentTank.autoFeeder && currentTank.autoFeeder.queue) ? currentTank.autoFeeder.queue.length : 0;

  const inputs = document.querySelectorAll('.auto-feed-input');
  let orderPellets = 0;
  let totalCost = 0;

  inputs.forEach((input) => {
    let count = parseInt(input.value);
    if (isNaN(count) || count < 0) count = 0;
    if (count > 500) count = 500;
    input.value = count;

    orderPellets += count;
    const unitCost = parseInt(input.dataset.cost) || 1;
    totalCost += count * unitCost;
  });

  const totalPelletsEl = document.getElementById('autoFeederTotalPellets');
  const totalCostEl = document.getElementById('autoFeederTotalCost');
  const alertEl = document.getElementById('autoFeederAlert');
  const confirmBtn = document.getElementById('confirmAutoFeederBtn');

  if (totalPelletsEl) {
    totalPelletsEl.textContent = `Order: ${orderPellets} / 500 (Hopper Total: ${currentLoaded + orderPellets} / ${maxCapacity})`;
    totalPelletsEl.style.color = (orderPellets > 500 || currentLoaded + orderPellets > maxCapacity) ? 'var(--danger)' : 'var(--text)';
  }

  if (totalCostEl) {
    totalCostEl.textContent = `$${totalCost}`;
  }

  let errorMsg = null;

  if (orderPellets < 1) {
    confirmBtn.disabled = true;
    if (totalCostEl) totalCostEl.style.color = 'var(--text)';
    alertEl.classList.add('hidden');
    return;
  }

  // Check 1: Max 500 per order
  if (orderPellets > 500) {
    errorMsg = '⚠️ You cannot order more than 500 pellets in a single transaction.';
  }
  // Check 2: Total loaded cannot exceed hopper capacity (up to 500 at level 5)
  else if (currentLoaded + orderPellets > maxCapacity) {
    const remainingSlots = Math.max(0, maxCapacity - currentLoaded);
    errorMsg = `⚠️ Hopper limit reached! Feeder can only hold ${remainingSlots} more pellets (Capacity: ${maxCapacity}). Upgrade feeder in Shop for more space.`;
  }
  // Check 3: Insufficient funds
  else if (totalCost > gameState.money) {
    errorMsg = `⚠️ Insufficient funds! You need $${totalCost - Math.floor(gameState.money)} more.`;
  }

  if (errorMsg) {
    alertEl.textContent = errorMsg;
    alertEl.classList.remove('hidden');
    confirmBtn.disabled = true;
    if (totalCost > gameState.money && totalCostEl) {
      totalCostEl.style.color = 'var(--danger)'; // Red price alert
    }
  } else {
    alertEl.classList.add('hidden');
    confirmBtn.disabled = false;
    if (totalCostEl) totalCostEl.style.color = 'var(--success)';
  }
};

window.setMaxAutoFeedPellets = function (targetTier) {
  const currentTank = getCurrentTank();
  const feederLevel = currentTank.autoFeederLevel || 1;
  const maxCapacity = Math.min(500, feederLevel * 100);
  const currentLoaded = (currentTank.autoFeeder && currentTank.autoFeeder.queue) ? currentTank.autoFeeder.queue.length : 0;

  const inputs = document.querySelectorAll('.auto-feed-input');
  let otherOrderPellets = 0;
  let targetInput = null;

  // Calculate pellets already entered in the other food inputs
  inputs.forEach((input) => {
    const tier = parseInt(input.dataset.tier);
    if (tier === targetTier) {
      targetInput = input;
    } else {
      otherOrderPellets += parseInt(input.value) || 0;
    }
  });

  if (!targetInput) return;

  // Remaining space in the hopper to hit max capacity (up to 500)
  const remainingHopperRoom = Math.max(0, maxCapacity - currentLoaded - otherOrderPellets);

  // Maximum allowed per transaction order (up to 500)
  const maxForOrder = Math.max(0, 500 - otherOrderPellets);

  // Set the input to the exact remaining room
  targetInput.value = Math.min(remainingHopperRoom, maxForOrder);

  // Recalculate totals and check funds immediately
  calculateAutoFeederTotals();
};

// Confirm transaction up to 500 pellets
function confirmAutoFeeding() {
  const currentTank = getCurrentTank();
  const feederLevel = currentTank.autoFeederLevel || 1;
  const maxCapacity = Math.min(500, feederLevel * 100);
  const currentLoaded = (currentTank.autoFeeder && currentTank.autoFeeder.queue) ? currentTank.autoFeeder.queue.length : 0;

  const inputs = document.querySelectorAll('.auto-feed-input');
  const newQueue = [];
  let totalCost = 0;

  inputs.forEach((input) => {
    const count = parseInt(input.value) || 0;
    const tier = parseInt(input.dataset.tier);
    const unitCost = parseInt(input.dataset.cost) || 1;

    for (let i = 0; i < count; i++) {
      newQueue.push(tier);
    }
    totalCost += count * unitCost;
  });

  if (newQueue.length < 1 || newQueue.length > 500) return;
  if (currentLoaded + newQueue.length > maxCapacity) return;
  if (gameState.money < totalCost) return;

  // Deduct cost
  gameState.money -= totalCost;
  playGameSound('coin');

  currentTank.autoFeeder = currentTank.autoFeeder || { queue: [], timer: 5 };
  currentTank.autoFeeder.queue.push(...newQueue);
  currentTank.autoFeeder.timer = 5;

  document.getElementById('autoFeederModal').classList.add('hidden');
  showToast('Feeder Stocked', `Added ${newQueue.length} pellets. Basin hopper now holding ${currentTank.autoFeeder.queue.length}/${maxCapacity} pellets!`);

  updateAutoFeederButtonLabel();
  updateTopBar();
  saveGame();
}

function updateAutoFeederButtonLabel() {
  const btn = document.getElementById('openAutoFeederBtn');
  const label = document.getElementById('autoFeederBtnLabel');
  if (!btn || !label) return;

  const currentTank = getCurrentTank();
  const capLvl = currentTank.autoFeederCapacityLevel || currentTank.autoFeederLevel || 0;
  const interval = getTankFeederInterval(currentTank);
  const queueCount = (currentTank.autoFeeder && currentTank.autoFeeder.queue) ? currentTank.autoFeeder.queue.length : 0;

  if (capLvl <= 0) {
    label.textContent = 'Auto-Feeding (Locked)';
    btn.style.opacity = '0.7';
  } else if (queueCount > 0) {
    label.textContent = `Auto-Feeding (${queueCount} left • ${interval}s)`;
    btn.style.opacity = '1';
    btn.style.borderColor = 'var(--feed-accent)';
  } else {
    label.textContent = `Auto-Feeding (${interval}s)`;
    btn.style.opacity = '1';
    btn.style.borderColor = 'var(--border)';
  }
}


// ======================================================================
// 7. UI EVENTS, SETTINGS, SAVE & EXPORT
// ======================================================================

function setupUIEventListeners() {
  // 1. REPLACED: Speed buttons click listeners
  [1, 2, 5, 20, 60].forEach((spd) => {
    const btn = document.getElementById(`speed${spd}`);
    if (btn) {
      btn.addEventListener('click', () => setSimulationSpeed(spd));
    }
  });

  // Feeding & Sell mode buttons
  document.getElementById('feedModeBtn').addEventListener('click', toggleFeedMode);
  document.getElementById('sellModeButton').addEventListener('click', toggleSelectMode);
  document.getElementById('sellSelectedButton').addEventListener('click', sellSelectedFish);
  document.getElementById('harvestEggsBtn').addEventListener('click', openCullingModal);

  // Background change dropdown
  document.getElementById('bgSelectDropdown').addEventListener('change', (e) => {
    getCurrentTank().background = e.target.value;
    applyEquippedBackground();
    renderBackgroundShop();
  });

  // Auto-feeder button and modal controls
  const openFeederBtn = document.getElementById('openAutoFeederBtn');
  if (openFeederBtn) {
    openFeederBtn.addEventListener('click', openAutoFeederModal);
  }

  const closeFeederBtn = document.getElementById('closeAutoFeederModal');
  const cancelFeederBtn = document.getElementById('cancelAutoFeederBtn');
  const feederModal = document.getElementById('autoFeederModal');

  if (closeFeederBtn && feederModal) {
    closeFeederBtn.addEventListener('click', () => feederModal.classList.add('hidden'));
  }
  if (cancelFeederBtn && feederModal) {
    cancelFeederBtn.addEventListener('click', () => feederModal.classList.add('hidden'));
  }

  const confirmFeederBtn = document.getElementById('confirmAutoFeederBtn');
  if (confirmFeederBtn) {
    confirmFeederBtn.addEventListener('click', confirmAutoFeeding);
  }

  // Tank Switcher Dropdown
  const tankDropdown = document.getElementById('tankSelectDropdown');
  if (tankDropdown) {
    tankDropdown.addEventListener('change', (e) => {
      switchTank(e.target.value);
    });
  }

  const closeMoveBtn = document.getElementById('closeMoveModal');
  if (closeMoveBtn) {
    closeMoveBtn.addEventListener('click', () => {
      document.getElementById('moveModal').classList.add('hidden');
      window.pendingMoveFishList = [];
    });
  }

  // Move selected fish to another basin
  const moveBtn = document.getElementById('moveSelectedButton');
  if (moveBtn) {
    moveBtn.addEventListener('click', moveSelectedFish);
  }

  // Tab switching
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Modals
  // Close Nursery Modal (safely re-queues unharvested babies)
  document.getElementById('closeModal').addEventListener('click', handleCloseNurseryModal);

  // Deselect fish when clicking on empty water / basin background
  const aquarium = document.getElementById('aquarium');
  if (aquarium) {
    aquarium.addEventListener('click', (e) => {
      if (e.target.closest('.medaka') || e.target.closest('#aquariumBottomEggs')) {
        return;
      }
      if (gameState && !gameState.feedMode && !gameState.selectMode) {
        deselectMedaka();
      }
    });
  }

  // 2. REPLACED: Global Keyboard Shortcuts (F = Feed Mode, 1-5 = Simulation Speeds, Arrows = Nursery)
  window.addEventListener('keydown', (e) => {
    // Ignore shortcuts if the user is typing in a text field or search box
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
      return;
    }

    // 'F' key: Toggle Feed Mode on / off
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleFeedMode();
      return;
    }

    // Number keys: 1 -> 1x, 2 -> 2x, 3 -> 5x, 4 -> 20x, 5 -> 60x
    const speedKeyMap = {
      '1': 1,
      '2': 2,
      '3': 5,
      '4': 20,
      '5': 60
    };

    if (speedKeyMap[e.key] !== undefined) {
      e.preventDefault();
      setSimulationSpeed(speedKeyMap[e.key]);
      return;
    }

    // Nursery harvest shortcuts (ArrowLeft = Keep All / ArrowRight = Sell All)
    const modal = document.getElementById('shrimpModal');
    if (modal && !modal.classList.contains('hidden')) {
      if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') {
        e.preventDefault();
        const keepBtn = document.getElementById('cullKeepAllBtn');
        if (keepBtn && !keepBtn.disabled) keepBtn.click();
      } else if (e.key === 'ArrowRight' || e.code === 'ArrowRight') {
        e.preventDefault();
        const sellBtn = document.getElementById('cullSellAllBtn');
        if (sellBtn && !sellBtn.disabled) sellBtn.click();
      }
    }
  });

  // Ensure bottom eggs don't trigger aquarium deselect
  const bottomEggs = document.getElementById('aquariumBottomEggs');
  if (bottomEggs) {
    bottomEggs.addEventListener('click', (e) => {
      e.stopPropagation();
      openCullingModal();
    });
  }

  document.getElementById('sellOldButton').addEventListener('click', () => {
    document.getElementById('capacityModal').classList.add('hidden');
    toggleSelectMode();
  });
  document.getElementById('openShopButton').addEventListener('click', () => {
    document.getElementById('capacityModal').classList.add('hidden');
    switchTab('shop');
  });

  // Save / Export / Import / Reset
  document.getElementById('headerSaveBtn').addEventListener('click', () => {
    saveGame();
    showToast('Saved', 'Breeding progress saved locally.');
  });
  document.getElementById('exportSaveBtn').addEventListener('click', exportSaveFile);
  document.getElementById('importSaveBtn').addEventListener('click', () => {
    document.getElementById('importSaveFileInput').click();
  });
  document.getElementById('importSaveFileInput').addEventListener('change', importSaveFile);
  document.getElementById('resetButton').addEventListener('click', resetGame);

  // Theme Toggle
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
}


function switchTab(tabId) {
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });

  // Re-render shops so buttons enable as soon as you have enough money
  if (tabId === 'shop') {
    renderAllShops();
  }
}

function toggleSelectMode() {
  gameState.selectMode = !gameState.selectMode;
  const btn = document.getElementById('sellModeButton');
  const sellBtn = document.getElementById('sellSelectedButton');
  const moveBtn = document.getElementById('moveSelectedButton');
  const helpText = document.getElementById('aquariumHelpText');

  const multipleTanks = (gameState.unlockedTanks && gameState.unlockedTanks.length > 1);

  if (gameState.selectMode) {
    // If feed mode was on, turn it off
    if (gameState.feedMode) toggleFeedMode();

    if (window.deselectMedaka) window.deselectMedaka();
    gameState.selectedFishIds.clear();

    btn.classList.add('active');
    btn.innerHTML = `<img src="emoji/shrimp.png" class="ui-emoji" alt="Select" /> Select Mode: ON`;

    if (sellBtn) {
      sellBtn.classList.remove('hidden');
      sellBtn.disabled = true;
      sellBtn.innerHTML = `<img src="emoji/dollar.png" class="ui-emoji" alt="Sell" /> Sell Selected (0)`;
    }
    if (moveBtn && multipleTanks) {
      moveBtn.classList.remove('hidden');
      moveBtn.disabled = true;
      moveBtn.innerHTML = `<img src="emoji/herb.png" class="ui-emoji" alt="Move" /> Move Selected (0)`;
    }
    if (helpText) {
      helpText.innerHTML = `Click medaka in the water or list to select them for selling or transferring.`;
    }
  } else {
    btn.classList.remove('active');
    btn.innerHTML = `<img src="emoji/shrimp.png" class="ui-emoji" alt="Select" /> Select Mode: OFF`;

    if (sellBtn) {
      sellBtn.classList.add('hidden');
      sellBtn.disabled = true;
      sellBtn.innerHTML = `<img src="emoji/dollar.png" class="ui-emoji" alt="Sell" /> Sell Selected (0)`;
    }
    if (moveBtn) {
      moveBtn.classList.add('hidden');
      moveBtn.disabled = true;
      moveBtn.innerHTML = `<img src="emoji/herb.png" class="ui-emoji" alt="Move" /> Move Selected (0)`;
    }

    gameState.selectedFishIds.clear();
    if (helpText) {
      helpText.innerHTML = `Click any medaka in the basin to inspect its genetics, or toggle Feed Mode to nourish your school.`;
    }
  }

  if (window.renderSidebarFishList) {
    window.renderSidebarFishList();
  }
}

function sellSelectedFish() {
  const tank = getCurrentTank();
  const toSell = tank.fish.filter((f) => gameState.selectedFishIds.has(f.id));
  const earn = toSell.length * 8;

  gameState.money += earn;
  tank.fish = tank.fish.filter((f) => !gameState.selectedFishIds.has(f.id));
  gameState.selectedFishIds.clear();

  playGameSound('coin');
  toggleSelectMode();
  updateTopBar();
  renderCensus();
}

function toggleTheme() {
  gameState.settings.darkMode = !gameState.settings.darkMode;
  document.body.classList.toggle('dark-theme', gameState.settings.darkMode);
  const label = document.getElementById('themeLabel');
  if (label) {
    label.textContent = gameState.settings.darkMode ? 'Dark Mode' : 'Light Mode';
  }
  //Save game immediately on theme toggle
  saveGame();
}

function updateTopBar() {
  document.getElementById('money').textContent = `$${Math.floor(gameState.money)}`;
  const tank = getCurrentTank();
  document.getElementById('population').textContent = `${tank.fish.length} / ${tank.capacity}`;
  document.getElementById('tankStatus').textContent = `${tank.fish.length} / ${tank.capacity}`;
  document.getElementById('day').textContent = gameState.day;

  const hh = String(gameState.hour || 0).padStart(2, '0');
  const mm = String(gameState.minute || 0).padStart(2, '0');
  const ss = String(gameState.second || 0).padStart(2, '0');
  document.getElementById('clock').textContent = `${hh}:${mm}:${ss}`;

  // Update Food Display / Dropdown based on unlocked count
  updateHeaderFoodDisplay();

  const shopTab = document.getElementById('tab-shop');
  if (shopTab && shopTab.classList.contains('active')) {
    renderBasinUpgradesShop();
  }
}

function updateHeaderFoodDisplay() {
  const container = document.getElementById('foodBadgeContainer');
  if (!container) return;

  if (!gameState.unlockedFoods) {
    gameState.unlockedFoods = [1];
  }

  const currentFood = FOOD_TIERS.find((f) => f.tier === gameState.foodTier) || FOOD_TIERS[0];

  if (gameState.unlockedFoods.length <= 1) {
    // Static display if only default food is owned
    const nameEl = document.getElementById('equippedFoodName');
    const valEl = document.getElementById('equippedFoodValue');
    if (nameEl && valEl && !document.getElementById('headerFoodSelect')) {
      nameEl.textContent = currentFood.name;
      valEl.textContent = `(+$${currentFood.value}/bite)`;
      return;
    }
    container.innerHTML = `
      <img src="emoji/food.png" alt="Food" class="ui-emoji" />
      <span id="equippedFoodName">${currentFood.name}</span>
      <strong id="equippedFoodValue" style="color: var(--success); margin-left: 4px;">(+$${currentFood.value}/bite)</strong>
    `;
  } else {
    const existingSelect = document.getElementById('headerFoodSelect');

    // PREVENT DROPDOWN AUTO-CLOSE:
    // If the select already exists and options haven't changed, only update the value without re-rendering innerHTML
    if (existingSelect && existingSelect.options.length === gameState.unlockedFoods.length) {
      if (existingSelect.value !== String(gameState.foodTier)) {
        existingSelect.value = String(gameState.foodTier);
      }
      return;
    }

    const options = gameState.unlockedFoods.map(tier => {
      const food = FOOD_TIERS.find(f => f.tier === tier);
      return `<option value="${tier}" ${gameState.foodTier === tier ? 'selected' : ''}>${food ? `${food.name} (+$${food.value}/bite)` : ''}</option>`;
    }).join('');

    container.innerHTML = `
      <img src="emoji/food.png" alt="Food" class="ui-emoji" />
      <select id="headerFoodSelect" class="secondary-button" style="font-size: 11.5px; font-weight: bold; padding: 3px 8px; border-radius: 6px; border: 1.5px solid var(--border); cursor: pointer; background: var(--panel); color: var(--text);" onchange="equipFoodTier(parseInt(this.value))">
        ${options}
      </select>
    `;
  }
}

function renderCensus() {
  const tank = getCurrentTank();
  document.getElementById('capacityInfo').textContent = tank.capacity;
  document.getElementById('maleCount').textContent = tank.fish.filter((f) => f.isAdult && f.gender === 'M').length;
  document.getElementById('femaleCount').textContent = tank.fish.filter((f) => f.isAdult && f.gender === 'F').length;
  document.getElementById('juvenileCount').textContent = tank.fish.filter((f) => !f.isAdult).length;
  document.getElementById('pregnantCount').textContent = tank.fish.filter((f) => f.carryingEggs).length;

  const totalPlants = (tank.plants.hornwort || 0) + (tank.plants.watersprite || 0) + (tank.plants.spawningMop || 0);
  document.getElementById('plantCount').textContent = totalPlants;
}

function getCurrentTank() {
  return gameState.tanks[gameState.currentTankId] || gameState.tanks.tank1;
}
// Export to window so render.js and other modules can access it
window.getCurrentTank = getCurrentTank;
window.saveGame = saveGame;
window.showAchievementPopup = showAchievementPopup;

// TOP ALARM / NOTICE (Blue, No Image, Top of screen)
window.showToast = function (title, desc) {
  let el = document.getElementById('toastNotification');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastNotification';
    el.className = 'toast-notification hidden';
    document.body.appendChild(el);
  }

  el.classList.remove('hidden');
  el.innerHTML = `
    <span class="toast-title">${title}</span>
    <span class="toast-desc">${desc}</span>
  `;

  requestAnimationFrame(() => {
    el.classList.add('active');
  });

  if (el._hideTimeout) clearTimeout(el._hideTimeout);
  el._hideTimeout = setTimeout(() => {
    el.classList.remove('active');
    setTimeout(() => {
      el.classList.add('hidden');
    }, 350);
  }, 2500);
};

// AWARDS & ACHIEVEMENTS POPUP (Gold, Trophy Icon, Bottom of screen)
function showAchievementPopup(title, desc, achievementId) {
  const el = document.getElementById('achievementPopup');
  if (!el) return;

  const iconSrc = achievementId ? `achievements/${achievementId}.png` : 'emoji/trophy.png';

  el.classList.remove('hidden');
  el.innerHTML = `
    <img src="${iconSrc}" class="ui-emoji" style="width:28px;height:28px;object-fit:contain;" alt="Award" onerror="this.src='emoji/trophy.png'" />
    <div>
      <strong style="display:block;color:#f1c40f;font-size:13.5px;">${title}</strong>
      <span style="font-size:12px;color:#cbd8dc;">${desc}</span>
    </div>
  `;

  requestAnimationFrame(() => {
    el.classList.add('active');
  });

  if (el._hideTimeout) clearTimeout(el._hideTimeout);
  el._hideTimeout = setTimeout(() => {
    el.classList.remove('active');
    setTimeout(() => {
      el.classList.add('hidden');
    }, 400);
  }, 3200);
}
window.showAchievementPopup = showAchievementPopup;

function checkAchievements() {
  // Hook for window.checkAchievements in achievement.js
  if (window.evaluateMedakaAchievements) {
    window.evaluateMedakaAchievements();
  }
}

function playGameSound(type) {
  if (window.soundManager && !gameState.settings.sfxMuted) {
    window.soundManager.play(type);
  }
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// Save / Load system
function saveGame() {
  gameState.lastSaveTime = Date.now(); // Record exact timestamp when saved
  try {
    const saveCopy = Object.assign({}, gameState, {
      // Ephemeral UI states should never persist across reloads
      selectMode: false,
      feedMode: false,
      selectedFishIds: [],
      inspectedFishId: null,
      trackedAlleles: [],
      discoveredPhenotypes: Array.from(gameState.discoveredPhenotypes || []),
      discoveredAlleles: Array.from(gameState.discoveredAlleles || []),
      unlockedAchievements: Array.from(window.unlockedAchievements || []),
      pendingClutches: window.pendingClutches || [],
      currentActiveClutch: window.currentActiveClutch || null,
      activeCullBabies: window.activeCullBabies || []
    });
    localStorage.setItem('medaka_genetics_save', JSON.stringify(saveCopy));
    return true;
  } catch (err) {
    console.error('Save failed:', err);
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('medaka_genetics_save');
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(gameState, data);

      // ALWAYS start with empty selection on load or reload
      gameState.selectedFishIds = new Set();
      gameState.selectMode = false;
      gameState.feedMode = false;
      gameState.inspectedFishId = null;
      gameState.trackedAlleles = new Set();

      // Restore Sets
      gameState.discoveredPhenotypes = new Set(Array.isArray(data.discoveredPhenotypes) ? data.discoveredPhenotypes : []);
      gameState.discoveredAlleles = new Set(Array.isArray(data.discoveredAlleles) ? data.discoveredAlleles : []);
      window.unlockedAchievements = new Set(Array.isArray(data.unlockedAchievements) ? data.unlockedAchievements : []);
      gameState.unlockedSpeeds = Array.isArray(data.unlockedSpeeds) ? data.unlockedSpeeds : [1];
      gameState.unlockedFoods = Array.isArray(data.unlockedFoods) ? data.unlockedFoods : [1];

      // Restore Nursery clutches and active harvest state
      window.pendingClutches = Array.isArray(data.pendingClutches) ? data.pendingClutches : [];
      window.currentActiveClutch = data.currentActiveClutch || null;
      window.activeCullBabies = Array.isArray(data.activeCullBabies) ? data.activeCullBabies : [];

      // Always reset simulation speed back to 1x on load/reload to prevent physics desyncs
      gameState.speed = 1;

      // Sync speed buttons UI on load
      document.querySelectorAll('.speed-button').forEach((b) => b.classList.remove('active'));
      const defaultSpeedBtn = document.getElementById('speed1');
      if (defaultSpeedBtn) defaultSpeedBtn.classList.add('active');

      // Sync nursery UI
      if (typeof updateHarvestButton === 'function') updateHarvestButton();
      if (typeof updateBottomEggCluster === 'function') updateBottomEggCluster();
    }
  } catch (err) {
    console.error('Load failed:', err);
  }

  // Ensure button controls and UI reset to OFF on load
  const sellModeBtn = document.getElementById('sellModeButton');
  if (sellModeBtn) {
    sellModeBtn.classList.remove('active');
    sellModeBtn.innerHTML = `<img src="emoji/shrimp.png" class="ui-emoji" alt="Select" /> Select Mode: OFF`;
  }
  const sellBtn = document.getElementById('sellSelectedButton');
  if (sellBtn) {
    sellBtn.classList.add('hidden');
    sellBtn.disabled = true;
    sellBtn.innerHTML = `<img src="emoji/dollar.png" class="ui-emoji" alt="Sell" /> Sell Selected (0)`;
  }
  const moveBtn = document.getElementById('moveSelectedButton');
  if (moveBtn) {
    moveBtn.classList.add('hidden');
    moveBtn.disabled = true;
    moveBtn.innerHTML = `<img src="emoji/herb.png" class="ui-emoji" alt="Move" /> Move Selected (0)`;
  }

  updateSpeedButtonsUI();
}

// Auto-save before browser tab closes or refreshes (blocked during reset)
window.isResetting = false;

window.addEventListener('beforeunload', () => {
  if (!window.isResetting) {
    saveGame();
  }
});

function exportSaveFile() {
  saveGame();
  const blob = new Blob([JSON.stringify(gameState, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `medaka_genetics_day${gameState.day}.json`;
  a.click();
}

function importSaveFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      Object.assign(gameState, data);
      saveGame();
      window.location.reload();
    } catch (err) {
      alert('Invalid save file format.');
    }
  };
  reader.readAsText(file);
}

function resetGame() {
  if (confirm('Are you sure you want to reset all breeding lines and start fresh?')) {
    // 1. Block the beforeunload auto-save from re-saving
    window.isResetting = true;

    // 2. Clear stored save data
    localStorage.removeItem('medaka_genetics_save');

    // 3. Reload cleanly into a fresh game
    window.location.reload();
  }
}