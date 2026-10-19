/**
 * ======================================================================
 * MEDAKA GENETICS - Achievements & Awards Engine (js/achievement.js)
 * ======================================================================
 */

(function () {
  const ACHIEVEMENTS_DATA = [
    {
      id: 'first_fry',
      title: 'First Hatchling',
      desc: 'Successfully harvest your very first clutch of medaka fry from the egg nursery.',
      check: () => window.gameState && window.gameState.tanks.tank1.fish.some(f => !f.isAdult)
    },
    {
      id: 'fed_school',
      title: 'Attentive Caretaker',
      desc: 'Feed your school of medaka by dropping 25 food pellets.',
      check: (stats) => (stats.totalPelletsFed || 0) >= 25
    },
    {
      id: 'black_basin_mutation',
      title: 'Haichi Hannou (Black Adaptation)',
      desc: 'Equip the Traditional Black Lacquer Basin and successfully breed a fish with Spots or Black Rim.',
      check: () => {
        if (!window.gameState) return false;
        for (const tankId in window.gameState.tanks) {
          const tank = window.gameState.tanks[tankId];
          if (tank.background === 'black' && tank.fish.some(f => f.pattern === 'Spots' || f.pattern === 'Rim')) {
            return true;
          }
        }
        return false;
      }
    },
    {
      id: 'shiny',
      title: 'Shiny',
      desc: 'Obtain any guanine scale sheen (Lamé, Miyuki, etc.) on a medaka.',
      check: () => {
        if (!window.gameState) return false;
        for (const tankId in window.gameState.tanks) {
          const tank = window.gameState.tanks[tankId];
          if (tank.fish.some(f => f.iridophore && f.iridophore !== 'None')) {
            return true;
          }
        }
        return false;
      }
    },
    {
      id: 'collector_10',
      title: 'Amateur Breeder',
      desc: 'Register 10 unique medaka strain phenotypes in your Strains collection.',
      check: () => window.gameState && window.gameState.discoveredPhenotypes.size >= 10
    },
    {
      id: 'master_collector',
      title: 'Master Ichthyologist',
      desc: 'Discover and register 25 unique medaka phenotype combinations.',
      check: () => window.gameState && window.gameState.discoveredPhenotypes.size >= 25
    },
    {
      id: 'wealthy_pond',
      title: 'Prosperous Hatchery',
      desc: 'Accumulate a total of $1,000 in your hatchery funds.',
      check: () => window.gameState && window.gameState.money >= 1000
    }
  ];

  window.unlockedAchievements = window.unlockedAchievements || new Set();
  window.gameStats = window.gameStats || { totalPelletsFed: 0 };

  window.evaluateMedakaAchievements = function () {
    const listContainer = document.getElementById('achievementsList');
    if (!listContainer) return;

    let html = '';

    ACHIEVEMENTS_DATA.forEach((ach) => {
      const alreadyUnlocked = window.unlockedAchievements.has(ach.id);
      const conditionMet = ach.check(window.gameStats);
      const isUnlocked = alreadyUnlocked || conditionMet;

      if (conditionMet && !alreadyUnlocked) {
        window.unlockedAchievements.add(ach.id);
        if (window.showAchievementPopup) {
          window.showAchievementPopup('Achievement Unlocked!', ach.title);
        }
      } else if (conditionMet && alreadyUnlocked) {
        // Ensure it stays marked without re-triggering the pop-up notification
        window.unlockedAchievements.add(ach.id);
      }

      html += `
        <div class="achievement-card ${isUnlocked ? '' : 'locked'}">
          <div class="achievement-img-wrapper">
            <img src="achievements/${ach.id}.png" 
                 style="width:36px; height:36px; object-fit:contain;" 
                 alt="${ach.title}" 
                 onerror="this.src='emoji/trophy.png'" />
          </div>
          <div class="achievement-info">
            <h4 class="achievement-title">${ach.title}</h4>
            <p class="achievement-desc">${ach.desc}</p>
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = html;
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      window.evaluateMedakaAchievements();
    }, 500);
  });
})();