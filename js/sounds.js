/**
 * ======================================================================
 * MEDAKA GENETICS - Audio & Looping BGM Manager (js/sounds.js)
 * ======================================================================
 */

(function () {
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.sfxGain = null;
      this.bgmAudio = null;
      this.isInitialized = false;
      this.isBgmPlaying = false;
    }

    /**
     * Unlocks and initializes the AudioContext and BGM element on user interaction.
     */
    unlockAudio() {
      if (this.isInitialized) {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        return;
      }

      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // SFX Master Gain Node
        this.sfxGain = this.ctx.createGain();
        const settings = window.gameState?.settings || { bgmVolume: 0.5, sfxVolume: 0.5, bgmMuted: false, sfxMuted: false };

        this.sfxGain.gain.value = settings.sfxMuted ? 0 : settings.sfxVolume;
        this.sfxGain.connect(this.ctx.destination);

        // Initialize Looping BGM Audio Element
        this.bgmAudio = new Audio('sounds/background.mp3');
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = settings.bgmMuted ? 0 : settings.bgmVolume;

        this.isInitialized = true;
      } catch (e) {
        console.warn('Web Audio / Audio element initialization warning:', e);
      }
    }

    /**
     * Starts playing the looping background.mp3 track.
     */
    startBGM() {
      if (!this.isInitialized) {
        this.unlockAudio();
      }
      if (this.isBgmPlaying || !this.bgmAudio) return;

      const settings = window.gameState?.settings;
      if (settings?.bgmMuted) return;

      this.bgmAudio.play().then(() => {
        this.isBgmPlaying = true;
      }).catch((err) => {
        console.warn('BGM autoplay blocked or background.mp3 missing/failed to load:', err);
      });
    }

    stopBGM() {
      if (!this.isBgmPlaying || !this.bgmAudio) return;
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
        this.isBgmPlaying = false;
      } catch (e) {
        // Ignore pause errors
      }
    }

    setBgmVolume(val) {
      if (!this.bgmAudio) return;
      const settings = window.gameState?.settings;
      const effective = settings?.bgmMuted ? 0 : val;
      this.bgmAudio.volume = Math.max(0, Math.min(1, effective));
    }

    setSfxVolume(val) {
      if (!this.sfxGain || !this.ctx) return;
      const settings = window.gameState?.settings;
      const effective = settings?.sfxMuted ? 0 : val;
      this.sfxGain.gain.setValueAtTime(effective, this.ctx.currentTime);
    }

    /**
     * Synthesizes crisp procedural sound effects for gameplay feedback.
     */
    play(type) {
      if (!this.isInitialized) {
        this.unlockAudio();
      }
      if (!this.ctx || (window.gameState?.settings?.sfxMuted)) return;

      try {
        const now = this.ctx.currentTime;

        switch (type) {
          case 'coin': {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now);
            osc.frequency.setValueAtTime(1318.51, now + 0.08);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.32);
            break;
          }

          case 'eat': {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(720, now + 0.06);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.09);
            break;
          }

          case 'choose': {
            if (!this.chooseAudio) {
              this.chooseAudio = new Audio('sounds/choose.mp3');
            }
            const sfxVol = window.gameState?.settings?.sfxMuted ? 0 : (window.gameState?.settings?.sfxVolume ?? 0.5);
            if (sfxVol > 0) {
              this.chooseAudio.currentTime = 0;
              // Play at 50% of the active SFX volume
              this.chooseAudio.volume = sfxVol * 0.5;
              this.chooseAudio.play().catch(() => {});
            }
            break;
          }

          case 'bubble': {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.exponentialRampToValueAtTime(650, now + 0.12);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.15);
            break;
          }

          case 'splash': {
            const bufferSize = this.ctx.sampleRate * 0.08;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 800;
            filter.Q.value = 2.5;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            noise.start(now);
            break;
          }

          default:
            break;
        }
      } catch (e) {
        console.warn('Error playing procedural sound:', e);
      }
    }
  }

  // Global sound manager instance
  window.soundManager = new SoundManager();

  // Bind settings sliders once DOM is ready
  // Helper to sync buttons and volume labels with saved settings
  SoundManager.prototype.updateAudioSettingsUI = function () {
    const settings = window.gameState?.settings;
    if (!settings) return;

    const bgmToggle = document.getElementById('bgmToggleBtn');
    const sfxToggle = document.getElementById('sfxToggleBtn');
    const bgmSlider = document.getElementById('bgmVolumeSlider');
    const sfxSlider = document.getElementById('sfxVolumeSlider');
    const bgmLabel = document.getElementById('bgmVolumeLabel');
    const sfxLabel = document.getElementById('sfxVolumeLabel');

    if (bgmToggle) {
      bgmToggle.textContent = settings.bgmMuted ? 'Unmute' : 'Mute';
    }
    if (sfxToggle) {
      sfxToggle.textContent = settings.sfxMuted ? 'Unmute' : 'Mute';
    }
    if (bgmSlider) {
      const vol = settings.bgmVolume ?? 0.5;
      bgmSlider.value = vol;
      if (bgmLabel) bgmLabel.textContent = `${Math.round(vol * 100)}%`;
    }
    if (sfxSlider) {
      const vol = settings.sfxVolume ?? 0.5;
      sfxSlider.value = vol;
      if (sfxLabel) sfxLabel.textContent = `${Math.round(vol * 100)}%`;
    }
  };

  // Bind settings sliders and buttons once DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const bgmSlider = document.getElementById('bgmVolumeSlider');
    const sfxSlider = document.getElementById('sfxVolumeSlider');
    const bgmToggle = document.getElementById('bgmToggleBtn');
    const sfxToggle = document.getElementById('sfxToggleBtn');

    // Sync UI to loaded settings immediately
    window.soundManager.updateAudioSettingsUI();

    if (bgmSlider) {
      bgmSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        window.gameState.settings.bgmVolume = val;
        document.getElementById('bgmVolumeLabel').textContent = `${Math.round(val * 100)}%`;
        window.soundManager.setBgmVolume(val);
      });
      bgmSlider.addEventListener('change', () => {
        if (window.saveGame) window.saveGame();
      });
    }

    if (sfxSlider) {
      sfxSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        window.gameState.settings.sfxVolume = val;
        document.getElementById('sfxVolumeLabel').textContent = `${Math.round(val * 100)}%`;
        window.soundManager.setSfxVolume(val);
      });
      sfxSlider.addEventListener('change', () => {
        if (window.saveGame) window.saveGame();
      });
    }

    if (bgmToggle) {
      bgmToggle.addEventListener('click', () => {
        const sets = window.gameState.settings;
        sets.bgmMuted = !sets.bgmMuted;
        bgmToggle.textContent = sets.bgmMuted ? 'Unmute' : 'Mute';
        window.soundManager.setBgmVolume(sets.bgmVolume);
        if (sets.bgmMuted) {
          window.soundManager.stopBGM();
        } else {
          window.soundManager.startBGM();
        }
        if (window.saveGame) window.saveGame();
      });
    }

    if (sfxToggle) {
      sfxToggle.addEventListener('click', () => {
        const sets = window.gameState.settings;
        sets.sfxMuted = !sets.sfxMuted;
        sfxToggle.textContent = sets.sfxMuted ? 'Unmute' : 'Mute';
        window.soundManager.setSfxVolume(sets.sfxVolume);
        if (window.saveGame) window.saveGame();
      });
    }
  });
})();