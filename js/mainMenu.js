/**
 * ======================================================================
 * MEDAGAKU - Main Menu & Title Screen (js/mainMenu.js)
 * ======================================================================
 */

(function () {
  const MainMenu = {
    overlay: null,

    init() {
      this.createMenuOverlay();
      this.bindHeaderEvents();
    },

    createMenuOverlay() {
      if (document.getElementById('mainMenuOverlay')) return;

      const overlay = document.createElement('div');
      overlay.id = 'mainMenuOverlay';
      overlay.className = 'main-menu-overlay';

      const hasSave = !!localStorage.getItem('medaka_genetics_save');
      const saveSnippet = this.getSaveSnippet();

      overlay.innerHTML = `
        <div class="menu-box">
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px;">
            <canvas id="menuFishLeft" width="72" height="72" style="transform: scaleX(-1);"></canvas>
            <div class="logo" style="display: flex; align-items: center; justify-content: center;">
              <img src="images/logo.png" alt="MedaGaku" style="max-height: 50px; width: auto;"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
              <h1 class="menu-title" style="display: none; margin: 0; font-size: 28px; letter-spacing: -0.5px;">MedaGaku</h1>
            </div>
            <canvas id="menuFishRight" width="72" height="72"></canvas>
          </div>
          <p class="small-text" style="text-align: center; margin: 0 0 25px 0; color: #001116;">
            Japanese Ricefish Line-Breeding & Genetics Simulator
          </p>

          <div class="menu-buttons">
            <button id="menuContinueBtn" class="primary-button menu-btn ${!hasSave ? 'hidden' : ''}">
              Continue (${saveSnippet})
            </button>
            <button id="menuStartBtn" class="primary-button menu-btn ${hasSave ? 'hidden' : ''}">
              Start Breeding
            </button>
            <button id="menuNewGameBtn" class="secondary-button menu-btn ${!hasSave ? 'hidden' : ''}">
              New Game
            </button>
            <button id="menuGuideBtn" class="secondary-button menu-btn">
              <img src="emoji/info.png" class="ui-emoji" alt="Guide" /> How to Play & Genetics Guide
            </button>
          </div>

          <div style="margin-top: 25px; text-align: center;">
            <span class="small-text" style="font-size: 11px; color: #001116;">
              Version: 1.0.2
            </span>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      this.overlay = overlay;

      this.bindMenuEvents();
      this.renderMenuFish();
    },


    getSaveSnippet() {
      try {
        const raw = localStorage.getItem('medaka_genetics_save');
        if (!raw) return 'Day 1';
        const data = JSON.parse(raw);
        return `Day ${data.day || 1} • $${Math.floor(data.money || 100)}`;
      } catch (e) {
        return 'Saved Basin';
      }
    },

    renderMenuFish() {
      if (!window.medakaRendererInstance) return;

      const leftCvs = document.getElementById('menuFishLeft');
      const rightCvs = document.getElementById('menuFishRight');

      const sampleRed = {
        bodyType: 'H',
        color: 'red',
        eye: 'Normal',
        fin: 'Hishio',
        pattern: 'None',
        iridophore: 'ExternalLight'
      };

      const sampleGold = {
        bodyType: 'N',
        color: 'gold',
        eye: 'Normal',
        fin: 'Longfin',
        pattern: 'Spots',
        iridophore: 'Lame'
      };

      if (leftCvs) {
        window.medakaRendererInstance.buildFishSprite(sampleRed).then((sprite) => {
          const ctx = leftCvs.getContext('2d');
          ctx.drawImage(sprite, 0, 0, 72, 72);
        });
      }

      if (rightCvs) {
        window.medakaRendererInstance.buildFishSprite(sampleGold).then((sprite) => {
          const ctx = rightCvs.getContext('2d');
          ctx.drawImage(sprite, 0, 0, 72, 72);
        });
      }
    },

    bindMenuEvents() {
      const continueBtn = document.getElementById('menuContinueBtn');
      const startBtn = document.getElementById('menuStartBtn');
      const newGameBtn = document.getElementById('menuNewGameBtn');
      const guideBtn = document.getElementById('menuGuideBtn');

      if (continueBtn) {
        continueBtn.addEventListener('click', () => this.enterGame());
      }

      if (startBtn) {
        startBtn.addEventListener('click', () => this.enterGame());
      }

      if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
          if (confirm('Start a new lineage? This will overwrite your existing save data.')) {
            window.isResetting = true;
            localStorage.removeItem('medaka_genetics_save');
            window.location.reload();
          }
        });
      }


      if (guideBtn) {
        guideBtn.addEventListener('click', () => {
          if (window.openHelpModal) {
            window.openHelpModal();
          }
        });
      }
    },

    bindHeaderEvents() {
      const exitBtn = document.getElementById('headerSaveExitBtn');
      if (exitBtn) {
        exitBtn.addEventListener('click', () => {
          if (window.saveGame) window.saveGame();
          this.showMenu();
        });
      }
    },
    
    bindMenuEvents() {
      const continueBtn = document.getElementById('menuContinueBtn');
      const startBtn = document.getElementById('menuStartBtn');
      const newGameBtn = document.getElementById('menuNewGameBtn');
      const guideBtn = document.getElementById('menuGuideBtn');
      const newGameModal = document.getElementById('newGameModal');
      const cancelModalBtn = document.getElementById('cancelNewGameModalBtn');
      const confirmModalBtn = document.getElementById('confirmNewGameModalBtn');

      if (continueBtn) {
        continueBtn.addEventListener('click', () => this.enterGame());
      }

      if (startBtn) {
        startBtn.addEventListener('click', () => this.enterGame());
      }

      if (newGameBtn && newGameModal) {
        newGameBtn.addEventListener('click', () => {
          newGameModal.classList.remove('hidden');
        });
      }

      if (cancelModalBtn && newGameModal) {
        cancelModalBtn.addEventListener('click', () => {
          newGameModal.classList.add('hidden');
        });
      }

      if (confirmModalBtn) {
        confirmModalBtn.addEventListener('click', () => {
          window.isResetting = true;
          localStorage.removeItem('medaka_genetics_save');
          if (newGameModal) newGameModal.classList.add('hidden');
          window.location.reload();
        });
      }

      if (guideBtn) {
        guideBtn.addEventListener('click', () => {
          if (window.openHelpModal) {
            window.openHelpModal();
          }
        });
      }
    },

    enterGame() {
      if (this.overlay) {
        this.overlay.classList.add('hidden');
      }

      if (window.soundManager && window.soundManager.unlockAudio) {
        window.soundManager.unlockAudio();
      }
      if (window.soundManager && !window.gameState?.settings?.bgmMuted) {
        window.soundManager.startBGM();
      }
    },

    showMenu() {
      if (!this.overlay) {
        this.createMenuOverlay();
      } else {
        this.overlay.classList.remove('hidden');
        const contBtn = document.getElementById('menuContinueBtn');
        const startBtn = document.getElementById('menuStartBtn');
        const newGameBtn = document.getElementById('menuNewGameBtn');
        const hasSave = !!localStorage.getItem('medaka_genetics_save');

        if (contBtn) {
          contBtn.textContent = `Continue (${this.getSaveSnippet()})`;
          contBtn.classList.toggle('hidden', !hasSave);
        }
        if (startBtn) {
          startBtn.classList.toggle('hidden', hasSave);
        }
        if (newGameBtn) {
          newGameBtn.classList.toggle('hidden', !hasSave);
        }
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    MainMenu.init();
  });

  window.MainMenu = MainMenu;
})();