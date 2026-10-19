/**
 * ======================================================================
 * MEDAKA GENETICS - Player's Guide & IRL Genetics Manual (js/helpModal.js)
 * ======================================================================
 */

(function () {
  function openHelpModal() {
    let modal = document.getElementById('helpModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'helpModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-box" style="width: min(720px, 95vw); max-height: 86vh;">
          <button class="close-button" onclick="closeHelpModal()">×</button>
          <h2><img src="emoji/info.png" class="ui-emoji" alt="Guide" /> Medaka Breeding & Genetics Manual</h2>
          
          <div style="font-size: 13.5px; line-height: 1.6; display: flex; flex-direction: column; gap: 14px;">
            <p>
              Welcome to <strong>Medaka Genetics</strong>! This simulation mirrors the selective breeding practices of ornamental Japanese ricefish (<em>Oryzias latipes</em>), modeled after the Japan Medaka Association standards.
            </p>

            <h3 style="margin: 4px 0; color: var(--primary);">1. IRL Genetics & Chromatophore Biology</h3>
            <p style="margin: 0;">
              Unlike simple color swaps, real medaka coloration is controlled by four distinct types of pigment cells (chromatophores) and reflective crystal platelets:
            </p>
            <ul style="margin: 4px 0 4px 20px; padding: 0;">
              <li><strong>Melanophores (Black/Brown):</strong> Dark melanin granules that provide depth. Strains like <em>Orochi</em> feature intense hyper-melanisation.</li>
              <li><strong>Xanthophores & Erythrophores (Yellow, Orange, Red):</strong> Carotenoid pigments responsible for bright vermilion (*Youkihi*) and lemon tones. In pure red, orange, and gold varieties, these cells saturate the entire body, bypassing the wild-type <em>white belly</em> counter-shading.</li>
              <li><strong>Leucophores (White):</strong> Reflective white plates that create milky opacity (*Shiro*).</li>
              <li><strong>Iridophores (Guanine Crystals):</strong> Reflective platelets that create metallic sheens such as <em>Lamé</em> glitter or the dorsal <em>Miyuki (Taitaiko)</em> stripe.</li>
            </ul>

            <h3 style="margin: 4px 0; color: var(--primary);">2. Feature-Based Loci & Allele Inheritance</h3>
            <p style="margin: 0;">
              Every medaka inherits diploid allele pairs (one from mother, one from father) across 6 autonomous loci: <strong>Body Color</strong>, <strong>Body Shape (Normal, Hikari, Daruma)</strong>, <strong>Eye Type</strong>, <strong>Fin Type</strong>, <strong>Iridophores</strong>, and <strong>Pattern</strong>. 
            </p>
            <p style="margin: 0;">
              <em>Note on Constraints:</em> Certain phenotypes carry biological dependencies—for example, the <strong>Samurai</strong> fin mutation can only physically express itself if the fish carries a <em>Hikari (H)</em> or <em>Hikari Daruma (HD)</em> mirror-dorsal body frame.
            </p>

            <h3 style="margin: 4px 0; color: var(--primary);">3. Environmental Adaptation (Haichi Hannou)</h3>
            <p style="margin: 0;">
              Real medaka possess physiological background adaptation (*Haichi Hannou*), shifting their melanophore dispersion based on ambient light. In this game:
            </p>
            <ul style="margin: 4px 0 4px 20px; padding: 0;">
              <li>Breeding in standard Blue, White, or Green basins maintains standard solid bodies.</li>
              <li>Purchasing and equipping the <strong>Traditional Black Lacquer Basin</strong> in the shop creates the dark optical environment required to trigger the recessive mutation pathways for <strong>Spots (Buchi)</strong> and <strong>Black Rim</strong> scales.</li>
            </ul>

            <h3 style="margin: 4px 0; color: var(--primary);">4. Interactive Feeding & Metabolism</h3>
            <p style="margin: 0;">
              Toggle <strong>Feed Mode</strong> in the bottom bar and hold your mouse over the water to drop nutritional pellets. Hungry fish will swim upward to consume them, earning you cash. Each fish has a genetically tied <strong>Max Food Capacity</strong> and <strong>Digestion Cooldown</strong> governing their feeding appetite.
            </p>

            <h3 style="margin: 4px 0; color: var(--primary);">5. Official References & Further Reading</h3>
            <p style="margin: 0;">
              To explore real-world Japanese medaka standards, characteristics, and historical line development, consult:
            </p>
            <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(59,157,184,0.08); padding: 10px; border-radius: 8px;">
              <a href="https://medakazukan.net/charactaristics/" target="_blank" style="color: var(--primary); font-weight: bold; text-decoration: none;">
                🔗 Medaka Zukan – Official 44 Characteristics Guide
              </a>
              <a href="https://www.medakanoyakata.jp/?tid=6&mode=f168" target="_blank" style="color: var(--primary); font-weight: bold; text-decoration: none;">
                🔗 Medaka no Yakata – Breeding & Variety Encyclopedia
              </a>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      modal.classList.remove('hidden');
    }
  }

  window.openHelpModal = openHelpModal;

  window.closeHelpModal = function () {
    const modal = document.getElementById('helpModal');
    if (modal) modal.classList.add('hidden');
  };

  document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', openHelpModal);
    }
  });
})();