/**
 * ======================================================================
 * MEDAKA GENETICS - Modular 144x144 Pixel-Tinting & Compositing Engine
 * (js/medakaRenderer.js)
 * ======================================================================
 */

(function () {
  class MedakaRenderer {
    constructor() {
      // Raw image assets cache: URL -> HTMLImageElement / HTMLCanvasElement
      this.rawImageCache = new Map();

      // Final composite fish sprites cache: phenotypeKey -> HTMLCanvasElement
      this.spriteCache = new Map();
    }

    /**
     * Loads an image from disk or returns its procedural 144x144 fallback
     * if the file is not yet available in the folder.
     */
    loadImage(src) {
      if (this.rawImageCache.has(src)) {
        return Promise.resolve(this.rawImageCache.get(src));
      }

      return new Promise((resolve) => {
        const img = new Image();

        const finish = () => {
          this.rawImageCache.set(src, img);
          resolve(img);
        };

        img.onload = finish;

        img.onerror = () => {
          if (src.includes('medaka/head/') && !src.includes('Try')) {
            this.loadImage('medaka/test/H_N_Try.png').then((tryImg) => {
              if (tryImg && !tryImg._isProcedural) {
                this.rawImageCache.set(src, tryImg);
                resolve(tryImg);
              } else {
                const procedural = this.generateProceduralFallback(src);
                this.rawImageCache.set(src, procedural);
                resolve(procedural);
              }
            });
            return;
          }

          if (src.includes('medaka/body/') && !src.includes('Try')) {
            this.loadImage('medaka/test/B_N_Try.png').then((tryImg) => {
              if (tryImg && !tryImg._isProcedural) {
                this.rawImageCache.set(src, tryImg);
                resolve(tryImg);
              } else {
                const procedural = this.generateProceduralFallback(src);
                this.rawImageCache.set(src, procedural);
                resolve(procedural);
              }
            });
            return;
          }

          const procedural = this.generateProceduralFallback(src);
          this.rawImageCache.set(src, procedural);
          resolve(procedural);
        };

        // IMPORTANT:
        // For file://, load the PNG normally. The renderer will determine
        // whether getImageData() is available. If it isn't, we need to use
        // the pre-embedded/data-URL asset path rather than a compositing
        // approximation.
        img.src = window.MedakaAssets?.[src] || src;
      });
    }

  /**
   * Generates a 144x144 procedural fallback matching the modular base
   * color (#5b5050) and black border (#000000).
   */
  generateProceduralFallback(src) {
    const cvs = document.createElement('canvas');
    cvs.width = 144;
    cvs.height = 144;
    cvs._isProcedural = true;
    const ctx = cvs.getContext('2d');

    const BASE_GRAY = '#5b5050';
    const BORDER_COLOR = '#000000';

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = BORDER_COLOR;
    ctx.fillStyle = BASE_GRAY;

    if (src.includes('/head/') || src.includes('H_')) {
      // Head snout and cranial dome
      ctx.beginPath();
      ctx.moveTo(70, 54);
      ctx.bezierCurveTo(46, 54, 24, 62, 14, 72);
      ctx.bezierCurveTo(24, 82, 46, 90, 70, 90);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eye socket and pupil
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(36, 68, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(36, 68, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (src.includes('/body/') || src.includes('B_')) {
      // Flank, peduncle, and dorsal curvature
      ctx.beginPath();
      ctx.moveTo(68, 54);
      ctx.bezierCurveTo(90, 52, 114, 62, 128, 72);
      ctx.bezierCurveTo(114, 82, 90, 92, 68, 90);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Caudal fin (Diamond/Hishio style)
      ctx.beginPath();
      ctx.moveTo(126, 72);
      ctx.lineTo(138, 56);
      ctx.lineTo(142, 72);
      ctx.lineTo(138, 88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pectoral fin flap
      ctx.beginPath();
      ctx.ellipse(72, 78, 9, 4, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (src.includes('/pattern/') || src.includes('P_')) {
      // Procedural pattern overlay (Spots or Rim)
      ctx.fillStyle = '#111111';
      if (src.includes('Spots')) {
        const spots = [[45, 66], [58, 62], [74, 70], [86, 60], [98, 72], [112, 68]];
        spots.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.ellipse(x, y, 4, 3, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (src.includes('Rim')) {
        ctx.strokeStyle = 'rgba(20, 20, 20, 0.75)';
        ctx.lineWidth = 1.5;
        for (let x = 40; x <= 110; x += 12) {
          ctx.beginPath();
          ctx.arc(x, 70, 7, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
        }
      }
    }

    return cvs;
  }

  /**
   * Replaces the base template gray (#5b5050) with the targeted body color + white belly.
   * Keeps black outlines, eye pupils, and fin rays jet black.
   * Works on both Live Server (HTTP) and double-clicked index.html (file://).
   */
  tintLayer(sourceImage, colorKey, isHead = false) {
    const config = (window.MedakaConfig && window.MedakaConfig.COLORS[colorKey])
      ? window.MedakaConfig.COLORS[colorKey]
      : { hex: '#9b8f4e', rgb: [155, 143, 78], whiteBelly: true };

    const [tR, tG, tB] = config.rgb;
    const hasWhiteBelly = config.whiteBelly;

    const width = sourceImage.naturalWidth || sourceImage.width || 144;
    const height = sourceImage.naturalHeight || sourceImage.height || 144;

    const cvs = document.createElement('canvas');
    cvs.width = width;
    cvs.height = height;

    const ctx = cvs.getContext('2d');
    ctx.drawImage(sourceImage, 0, 0);

    // --- 1. DIRECT PIXEL PROCESSING (Runs on Live Server / HTTP) ---
    let imgData = null;
    try {
      imgData = ctx.getImageData(0, 0, width, height);
    } catch (e) {
      imgData = null; // Browser security restriction on file:// protocol
    }

    if (imgData) {
      const data = imgData.data;
      const baseR = 91, baseG = 80, baseB = 80;
      const tolerance = 40;

      for (let i = 0; i < data.length; i += 4) {
        const originalAlpha = data[i + 3];
        if (originalAlpha === 0) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Preserve black outlines and eye pupils
        if (r < 25 && g < 25 && b < 25) continue;

        // --- DYNAMIC BLISTER EYE SHADOW CHECK (#6c7272) ---
        const isBlisterShadow =
          Math.abs(r - 108) <= 5 &&
          Math.abs(g - 114) <= 5 &&
          Math.abs(b - 114) <= 5;

        if (isBlisterShadow) {
          data[i] = tR;
          data[i + 1] = tG;
          data[i + 2] = tB;
          data[i + 3] = Math.round(originalAlpha * (243 / 255));
          continue;
        }

        const isBaseGray =
          Math.abs(r - baseR) < tolerance &&
          Math.abs(g - baseG) < tolerance &&
          Math.abs(b - baseB) < tolerance;

        if (!isBaseGray) continue;

        const yCoord = Math.floor((i / 4) / width);
        const currentLum = (r * 0.299 + g * 0.587 + b * 0.114) / 84;

        let finalR = Math.min(255, Math.round(tR * currentLum));
        let finalG = Math.min(255, Math.round(tG * currentLum));
        let finalB = Math.min(255, Math.round(tB * currentLum));

        const bellyStart = height * (70 / 144);
        const bellyRange = height * (45 / 144);

        if (hasWhiteBelly && yCoord >= bellyStart) {
          const bellyFactor = Math.min(1, (yCoord - bellyStart) / bellyRange);
          finalR = Math.round(finalR * (1 - bellyFactor * 0.75) + 238 * bellyFactor * 0.75);
          finalG = Math.round(finalG * (1 - bellyFactor * 0.75) + 240 * bellyFactor * 0.75);
          finalB = Math.round(finalB * (1 - bellyFactor * 0.75) + 245 * bellyFactor * 0.75);
        }

        data[i] = finalR;
        data[i + 1] = finalG;
        data[i + 2] = finalB;
      }

      ctx.putImageData(imgData, 0, 0);
      return cvs;
    }

    // --- 2. CANVAS COMPOSITING FALLBACK (Runs on double-clicked file://) ---
    const isHeadLayer = isHead || (sourceImage.src && (sourceImage.src.includes('H_') || sourceImage.src.includes('head')));

    // Step A: Base body colored with natural belly gradient
    const bodyCvs = document.createElement('canvas');
    bodyCvs.width = width;
    bodyCvs.height = height;
    const bCtx = bodyCvs.getContext('2d');

    bCtx.drawImage(sourceImage, 0, 0);
    bCtx.globalCompositeOperation = 'source-in';

    const bellyGrad = bCtx.createLinearGradient(0, 0, 0, height);
    const bellyStart = 70 / 144;
    bellyGrad.addColorStop(0, config.hex || '#9b8f4e');
    if (hasWhiteBelly) {
      bellyGrad.addColorStop(bellyStart, config.hex || '#9b8f4e');
      bellyGrad.addColorStop(Math.min(1, bellyStart + 0.25), '#e8f0f3');
      bellyGrad.addColorStop(1, '#f5f9fa');
    } else {
      bellyGrad.addColorStop(1, config.hex || '#9b8f4e');
    }
    bCtx.fillStyle = bellyGrad;
    bCtx.fillRect(0, 0, width, height);

    // Protect the ENTIRE eye/iris area from the file:// fallback tint.
    // The normal HTTP/Live Server path already preserves non-base-gray pixels,
    // but the file:// fallback works from transparency, so we must explicitly
    // cut the eye out before tinting and restore it afterwards.
    if (isHeadLayer) {
      bCtx.save();
      bCtx.globalCompositeOperation = 'destination-out';

      const eyeX = sourceImage._isProcedural ? 36 : 106;
      const eyeY = 68;

      // IMPORTANT:
      // The real head assets have a larger anti-aliased eye/iris area than the
      // procedural fallback. Protect the whole region when running from file://.
      bCtx.beginPath();
      bCtx.ellipse(
        eyeX,
        eyeY,
        sourceImage._isProcedural ? 13 : 32,
        sourceImage._isProcedural ? 12 : 28,
        0,
        0,
        Math.PI * 2
      );
      bCtx.fill();

      bCtx.restore();
    }

    // Step B: Push base grey (#5b5050) to pure white (255) using additive blending ('lighter')
    const maskCvs = document.createElement('canvas');
    maskCvs.width = width;
    maskCvs.height = height;
    const mCtx = maskCvs.getContext('2d');

    mCtx.drawImage(sourceImage, 0, 0);
    mCtx.globalCompositeOperation = 'lighter';
    mCtx.drawImage(sourceImage, 0, 0);
    mCtx.drawImage(sourceImage, 0, 0);
    mCtx.drawImage(sourceImage, 0, 0);

    // Step C: Multiply mask onto the colored body (White * Color = Color; Black * Color = Black)
    const outCvs = document.createElement('canvas');
    outCvs.width = width;
    outCvs.height = height;
    const outCtx = outCvs.getContext('2d');

    outCtx.drawImage(bodyCvs, 0, 0);
    outCtx.globalCompositeOperation = 'multiply';
    outCtx.drawImage(maskCvs, 0, 0);

    // Step D: Clip cleanly to the sprite's silhouette (guarantees transparent background)
    outCtx.globalCompositeOperation = 'destination-in';
    outCtx.drawImage(sourceImage, 0, 0);

    // Step E: Restore the complete original eye/iris artwork.
    // This is especially important when index.html is opened with file://.
    if (isHeadLayer) {
      outCtx.save();
      outCtx.globalCompositeOperation = 'source-over';

      const eyeX = sourceImage._isProcedural ? 36 : 106;
      const eyeY = 68;

      // Restore the ORIGINAL eye after all tinting/blending has finished.
      // This prevents the white/gray eye and iris from inheriting the body color.
      outCtx.beginPath();
      outCtx.ellipse(
        eyeX,
        eyeY,
        sourceImage._isProcedural ? 13 : 32,
        sourceImage._isProcedural ? 12 : 28,
        0,
        0,
        Math.PI * 2
      );
      outCtx.clip();

      outCtx.drawImage(sourceImage, 0, 0);

      outCtx.restore();
    }

    return outCvs;
  }

    /**
     * Loads the complete 288x288 fry sprite (medaka/fry/fry.png).
     * Used for all baby fry until they mature into adult medaka.
     */
    async buildFrySprite() {
    if (this.frySpriteCache) {
      return this.frySpriteCache;
    }

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = 288;
    outputCanvas.height = 288;
    const ctx = outputCanvas.getContext('2d');

    // Load the dedicated 288x288 whole fry image
    const fryImg = await this.loadImage('medaka/fry/fry.png');
    ctx.drawImage(fryImg, 0, 0, 288, 288);

    this.frySpriteCache = outputCanvas;
    return outputCanvas;
  }

    /**
     * Stacks Head, Body, Pattern, and Iridophores into a single cached 144x144 canvas.
     * Fry use medaka/fry/fry.png directly until they mature.
     */
    async buildFishSprite(medaka, forceAdult = false) {
    // If the fish is a fry, use the complete 288x288 fry.png sprite
    if (!forceAdult && medaka && medaka.isAdult === false) {
      return this.buildFrySprite();
    }

    const cacheKey = `${medaka.bodyType}_${medaka.color}_${medaka.eye}_${medaka.fin}_${medaka.pattern}_${medaka.iridophore}`;

    if (this.spriteCache.has(cacheKey)) {
      return this.spriteCache.get(cacheKey);
    }

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = 288;
    outputCanvas.height = 288;
    const ctx = outputCanvas.getContext('2d');

    // Asset Paths (Head is unified to universal Normal body type 'N')
    const headSrc = `medaka/head/H_N_${medaka.eye}.png`;
    const bodySrc = `medaka/body/B_${medaka.bodyType}_${medaka.fin}.png`;

    // 1. Load Raw Modular Layers (with fallback to H_N_Normal if a custom eye asset is missing)
    let rawHead;
    try {
      rawHead = await this.loadImage(headSrc);
    } catch (e) {
      rawHead = await this.loadImage('medaka/head/H_N_Normal.png');
    }

    const rawBody = await this.loadImage(bodySrc);

    // 2. Perform Dynamic Pixel Color & White Belly Replacement
    const tintedBody = this.tintLayer(rawBody, medaka.color, false);
    const tintedHead = this.tintLayer(rawHead, medaka.color, true);

    // 3. Composite Head and Body
    const flipHorizontal = (source) => {
      const canvas = document.createElement('canvas');
      // Support both HTMLCanvasElement and HTMLImageElement dimensions
      canvas.width = source.naturalWidth || source.width || 144;
      canvas.height = source.naturalHeight || source.height || 144;

      const c = canvas.getContext('2d');
      c.translate(canvas.width, 0);
      c.scale(-1, 1);
      c.drawImage(source, 0, 0);

      return canvas;
    };

    const head = flipHorizontal(tintedHead);
    const body = flipHorizontal(tintedBody);

    // Keep the head on the LEFT and body on the RIGHT
    ctx.drawImage(head, 0, 0);
    ctx.drawImage(body, head.width, 0);

    // 4. Composite Pattern Overlays if present (Head + Body shapes)
    if (medaka.pattern && medaka.pattern !== 'None') {
      const headPatternSrc = `medaka/pattern/P_Head_${medaka.pattern}.png`;
      const bodyPatternSrc = `medaka/pattern/P_${medaka.bodyType}_${medaka.pattern}.png`;

      // Load both head and body pattern layers concurrently with fallback handling
      const [rawHeadPattern, rawBodyPattern] = await Promise.all([
        this.loadImage(headPatternSrc).catch(() => null),
        this.loadImage(bodyPatternSrc)
      ]);

      if (rawHeadPattern && !rawHeadPattern._isProcedural) {
        const flippedHeadPattern = flipHorizontal(rawHeadPattern);
        ctx.drawImage(flippedHeadPattern, 0, 0);
      }
      if (rawBodyPattern) {
        const flippedBodyPattern = flipHorizontal(rawBodyPattern);
        ctx.drawImage(flippedBodyPattern, head.width, 0);
      }
    }

    // 5. Draw Scale Iridophores (Head + Body with custom glow)
    if (medaka.iridophore && medaka.iridophore !== 'None') {
      const headShineSrc = `medaka/shine/S_Head_${medaka.iridophore}.png`;
      const bodyShineSrc = `medaka/shine/S_${medaka.bodyType}_${medaka.iridophore}.png`;

      // Load both universal head shine and body-type specific shine concurrently
      const [rawHeadShine, rawBodyShine] = await Promise.all([
        this.loadImage(headShineSrc).catch(() => null),
        this.loadImage(bodyShineSrc).catch(() => null)
      ]);

      const hasHeadShine = rawHeadShine && !rawHeadShine._isProcedural;
      const hasBodyShine = rawBodyShine && !rawBodyShine._isProcedural;

      if (hasHeadShine || hasBodyShine) {
        // Flip assets horizontally to match fish orientation
        const flippedHeadShine = hasHeadShine ? flipHorizontal(rawHeadShine) : null;
        const flippedBodyShine = hasBodyShine ? flipHorizontal(rawBodyShine) : null;

        // Dynamic iridescent glow color tuned to each shine variety
        const glowMap = {
          ExternalLight: 'rgba(165, 238, 255, 0.95)', // Radiant Miyuki cyan
          InternalLight: 'rgba(125, 250, 220, 0.85)', // Ethereal deep green-blue
          Lame: 'rgba(255, 255, 255, 0.90)', // Diamond glitter sparkle
          ChromosomeLight: 'rgba(255, 245, 195, 0.85)', // Warm champagne crystal
          PeritonealLight: 'rgba(215, 238, 248, 0.80)'  // Metallic mirror sheen
        };
        const glowColor = glowMap[medaka.iridophore] || 'rgba(220, 245, 255, 0.85)';

        ctx.save();

        // Pass 1: Luminous soft halo glow
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        if (flippedHeadShine) ctx.drawImage(flippedHeadShine, 0, 0);
        if (flippedBodyShine) ctx.drawImage(flippedBodyShine, head.width, 0);

        // Pass 2: Crisp base pixels on top
        ctx.shadowBlur = 0;
        if (flippedHeadShine) ctx.drawImage(flippedHeadShine, 0, 0);
        if (flippedBodyShine) ctx.drawImage(flippedBodyShine, head.width, 0);

        ctx.restore();
      } else {
        // Procedural fallback offset to the body section
        ctx.save();
        ctx.translate(head.width, 0);
        this.renderIridophores(ctx, medaka.iridophore);
        ctx.restore();
      }
    }

    // Cache composite
    this.spriteCache.set(cacheKey, outputCanvas);
    return outputCanvas;
  }

  /**
   * Renders guanine crystal scale sheens.
   */
  renderIridophores(ctx, type) {
    if (!type || type === 'None') return;

    ctx.save();

    switch (type) {
      case 'Lame': {
        // Lamé: Multi-colored shimmering crystal flecks on flank and caudal base
        const sparkles = [
          [54, 68], [66, 62], [76, 74], [84, 64], [94, 69],
          [104, 66], [114, 72], [72, 79], [60, 73]
        ];

        sparkles.forEach(([x, y]) => {
          ctx.fillStyle = 'rgba(240, 252, 255, 0.9)';
          ctx.fillRect(x, y, 2, 2);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillRect(x - 1, y, 4, 1);
          ctx.fillRect(x, y - 1, 1, 4);
        });
        break;
      }

      case 'ExternalLight': {
        // Miyuki (Taitaiko): Continuous luminescent cyan-blue dorsal line
        const grad = ctx.createLinearGradient(38, 56, 120, 56);
        grad.addColorStop(0, 'rgba(160, 235, 255, 0)');
        grad.addColorStop(0.25, 'rgba(215, 252, 255, 0.92)');
        grad.addColorStop(0.75, 'rgba(165, 238, 255, 0.9)');
        grad.addColorStop(1, 'rgba(160, 235, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(78, 56, 38, 3.2, -0.02, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'InternalLight': {
        // Internal Light: Ethereal deep muscular glow
        const radial = ctx.createRadialGradient(75, 72, 2, 75, 72, 22);
        radial.addColorStop(0, 'rgba(140, 245, 220, 0.5)');
        radial.addColorStop(0.7, 'rgba(100, 210, 240, 0.25)');
        radial.addColorStop(1, 'rgba(100, 210, 240, 0)');

        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.ellipse(75, 72, 26, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'ChromosomeLight': {
        // Ginga: Dispersed bright crystal points with transparent scale highlights
        ctx.fillStyle = 'rgba(255, 250, 205, 0.85)';
        const gingaPoints = [[52, 64], [68, 60], [80, 62], [92, 60], [105, 64]];
        gingaPoints.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }

      case 'PeritonealLight': {
        // Peritoneal Sheen: Mirror-like metallic guanine over the abdominal cavity
        const sheen = ctx.createLinearGradient(45, 70, 75, 84);
        sheen.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        sheen.addColorStop(0.5, 'rgba(200, 230, 240, 0.6)');
        sheen.addColorStop(1, 'rgba(180, 210, 225, 0.2)');

        ctx.fillStyle = sheen;
        ctx.beginPath();
        ctx.ellipse(58, 77, 14, 7, Math.PI / 12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }
}

  // Export singleton instance to window
  window.MedakaRenderer = MedakaRenderer;
window.medakaRendererInstance = new MedakaRenderer();
}) ();