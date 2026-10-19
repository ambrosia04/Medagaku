/**
 * ======================================================================
 * MEDAKA GENETICS - Master Trait & Genetic Configuration (medakaConfig.js)
 * ======================================================================
 */

(function () {
  const MedakaConfig = {};

  // 1. Base Gray Template Color to replace during dynamic canvas tinting
  MedakaConfig.BASE_GRAY = {
    hex: '#5b5050',
    rgb: [91, 80, 80],
    tolerance: 35 // Color distance tolerance for anti-aliasing pixels
  };

  // 2. Sprite Geometry & Canvas Dimensions
  MedakaConfig.SPRITE = {
    width: 144,
    height: 144,
    bellyYThreshold: 74 // Pixels below this Y-coordinate receive white-belly shading
  };

  // ====================================================================
  // 3. 10 OFFICIAL BODY COLORS
  // ====================================================================
  // Rule: Gold, Red, and Orange do NOT fade to a white belly.
  MedakaConfig.COLORS = {
    brown: {
      id: 'brown',
      name: 'Wild Brown (Kuro)',
      hex: '#9b8f4e',
      rgb: [155, 143, 78],
      whiteBelly: true,
      dominance: 10, // Dominant wild-type allele (B)
      desc: 'Wild-type brownish-olive coloration with balanced melanin and xanthophores.'
    },
    yellow: {
      id: 'yellow',
      name: 'Ki Yellow',
      hex: '#f8e46f',
      rgb: [248, 228, 111],
      whiteBelly: true,
      dominance: 7,
      desc: 'Soft lemon-yellow pigment derived from active xanthophores lacking dense melanin.'
    },
    white: {
      id: 'white',
      name: 'Shiro White',
      hex: '#dcd8d7',
      rgb: [220, 216, 215],
      whiteBelly: true,
      dominance: 4,
      desc: 'Milky-white leucophore sheen completely free of melanin and xanthophore pigments.'
    },
    blue: {
      id: 'blue',
      name: 'Ao Blue',
      hex: '#97b2d8',
      rgb: [166, 184, 209],
      whiteBelly: true,
      dominance: 6,
      desc: 'Icy pale blue tone produced by deep melanophores visible beneath white leucophores.'
    },
    black: {
      id: 'black',
      name: 'Orochi Black',
      hex: '#252225',
      rgb: [37, 34, 37],
      whiteBelly: true,
      dominance: 5,
      desc: 'Dense, hyper-pigmented melanistic body with charcoal scale borders.'
    },
    gold: {
      id: 'gold',
      name: 'Ougon Gold',
      hex: '#d7b537',
      rgb: [215, 181, 55],
      whiteBelly: false, // NO WHITE BELLY
      dominance: 8,
      desc: 'Solid shimmering metallic gold. Xanthophores cover the entire dorsal and ventral scales.'
    },
    amber: {
      id: 'amber',
      name: 'Kohaku Amber',
      hex: '#b48036',
      rgb: [180, 128, 54],
      whiteBelly: true,
      dominance: 7,
      desc: 'Translucent warm amber-honey tone with natural ventral counter-shading.'
    },
    red: {
      id: 'red',
      name: 'Youkihi Red',
      hex: '#d4370d',
      rgb: [212, 55, 13],
      whiteBelly: false, // NO WHITE BELLY
      dominance: 9,
      desc: 'Vivid crimson-red erythrophores saturated across the entire body and belly.'
    },
    orange: {
      id: 'orange',
      name: 'Kaba Orange',
      hex: '#fdb900',
      rgb: [253, 185, 0],
      whiteBelly: false, // NO WHITE BELLY
      dominance: 8,
      desc: 'Solid persimmon-orange coloration covering the dorsal ridge to the ventral abdomen.'
    },
    pink: {
      id: 'pink',
      name: 'Sakura Pink',
      hex: '#fbc8ad',
      rgb: [251, 200, 173],
      whiteBelly: true,
      dominance: 3,
      desc: 'Delicate pastel pink blushing across semi-transparent pearlescent scales.'
    },
    gfp: {
      id: 'gfp',
      name: 'GFP Green Fluorescent',
      hex: '#2ecc71',
      rgb: [46, 204, 113],
      whiteBelly: false,
      dominance: 12, // Dominant transgenic trait
      desc: 'Glowing green fluorescent transgenic medaka engineered with actin-promoter GFP expression. Highly prized!'
    },
    fuchsia: {
      id: 'fuchsia',
      name: 'Fuchsia Transgenic',
      hex: '#d642df',
      rgb: [214, 66, 223],
      whiteBelly: false,
      dominance: 15, // Ultimate top dominance tier
      desc: 'An ultra-rare vibrant fuchsia transgenic fluorescent medaka mutation with radiant magenta-pink luminescence.'
    }
  };

  // ====================================================================
  // 4. 3 BODY TYPES (+ 1 HYBRID COMBINATION)
  // ====================================================================
  MedakaConfig.BODY_TYPES = {
    N: {
      code: 'N',
      name: 'Normal',
      desc: 'Streamlined, elongated wild-type body form.',
      dominance: 10
    },
    H: {
      code: 'H',
      name: 'Hikari',
      desc: 'Mirror dorsal body. Dorsal fin matches anal fin shape; diamond caudal fin (Hishio).',
      dominance: 8
    },
    D: {
      code: 'D',
      name: 'Daruma',
      desc: 'Cute, shortened vertebral column with a compressed round profile.',
      dominance: 5 // Recessive (fu gene)
    },
    HD: {
      code: 'HD',
      name: 'Hikari Daruma',
      desc: 'Rare show hybrid expressing both compressed vertebral length and mirror-dorsal fins.',
      dominance: 3
    }
  };

  // ====================================================================
  // 5. 9 EYE TYPES
  // ====================================================================
  MedakaConfig.EYE_TYPES = {
    Normal:  { id: 'Normal',  name: 'Standard Eye', desc: 'Typical black pupil with a silver-rimmed iris.' },
    Albino:  { id: 'Albino',  name: 'Albino Eye',   desc: 'Translucent pink-ruby iris lacking all optical melanin.' },
    Panda:   { id: 'Panda',   name: 'Panda Eye',    desc: 'Deep black eye ring surrounding the eyeball (Dai).' },
    Ruby:    { id: 'Ruby',    name: 'Ruby Eye',     desc: 'Glowing blood-red pupil with reflective iris sheen.' },
    Small:   { id: 'Small',   name: 'Small Eye',    desc: 'Micro-pupil variant (Me-nashi / Kogame).' },
    Popped:  { id: 'Popped',  name: 'Popped Eye',   desc: 'Telescopic protruding dome eyes (Dememe).' },
    Forward: { id: 'Forward', name: 'Forward Eye',  desc: 'Diagonal forward-facing gaze (Chouten-gan).' },
    Big:     { id: 'Big',     name: 'Big Eye',      desc: 'Enlarged ocular sphere with high surface area.' },
    Blister: { id: 'Blister', name: 'Blister Eye',  desc: 'Fluid-filled corneal sac beneath the eye (Suihou-gan).' },
    Blue:    { id: 'Blue', name: 'Blue Eye',  desc: 'Pupils appear blue under certain lighting.' }
  };

  // ====================================================================
  // 6. 12 FIN TYPES
  // ====================================================================
  // Special constraint: Samurai fin ONLY expresses on Hikari ('H') or Hikari Daruma ('HD')!
  MedakaConfig.FIN_TYPES = {
    Hishio:     { id: 'Hishio',     name: 'Hishio (Diamond)',   allowedBodies: ['N', 'H', 'D', 'HD'], desc: 'Diamond-shaped caudal tail fin.' },
    Samurai:    { id: 'Samurai',    name: 'Samurai Crest',      allowedBodies: ['H', 'HD'],            desc: 'Dorsal fin splits into a warrior crest. Only on Hikari bodies!' },
    Marco:      { id: 'Marco',      name: 'Marco (Finless)',    allowedBodies: ['N', 'H', 'D', 'HD'], desc: 'Complete absence of the dorsal fin (Sehire-nashi).' },
    Meller:     { id: 'Meller',     name: 'Meller (Split)',     allowedBodies: ['N', 'H', 'D', 'HD'], desc: 'Split membrane forming distinct multi-lobed finlets.' },
    Swallow:    { id: 'Swallow',    name: 'Swallow (Tsubame)',  allowedBodies: ['N', 'H', 'D', 'HD'], desc: 'Individual fin rays project outward unevenly like swallow wings.' },
    Longfin:    { id: 'Longfin',    name: 'Longfin',            allowedBodies: ['N', 'H', 'D', 'HD'], desc: 'Smooth proportional elongation of all median fins.' },
    Longfins:   { id: 'Longfins',   name: 'Longfins (Dorsal/Anal)', allowedBodies: ['N', 'H', 'D', 'HD'], desc: 'Substantial extension focused on dorsal and anal fin rays.' },
    Widefins:   { id: 'Widefins',   name: 'Widefins',           allowedBodies: ['N', 'H', 'D', 'HD'], desc: 'High-profile sail-like broad dorsal and anal fins (Haba-hire).' },
    Longerfins: { id: 'Longerfins', name: 'Longerfins',         allowedBodies: ['N', 'H', 'D', 'HD'], desc: 'Extreme 1.5x+ sweeping flowing finnage.' },
    Morpho:     { id: 'Morpho',     name: 'Morpho Fan',         allowedBodies: ['N', 'H', 'D', 'HD'], desc: 'Wide fan tail with delicate micro-serrated margins.' },
    Fusahire:   { id: 'Fusahire',   name: 'Fusahire (Tufted)',  allowedBodies: ['N', 'H', 'D', 'HD'], desc: 'Feathered, tufted ray splits creating a soft brush appearance.' },
    Narrow:     { id: 'Narrow',     name: 'Narrow Fin',         allowedBodies: ['N', 'H', 'D', 'HD'], desc: 'Sleek, shortened anal fin profile for darting speed.' }
  };

  // ====================================================================
  // 7. 6 CHARACTERISTICS OF IRIDOPHORES (Guanine Scale Sheen)
  // ====================================================================
  MedakaConfig.IRIDOPHORES = {
    None:            { id: 'None',            name: 'Matte (None)',        desc: 'Standard non-reflective scales.' },
    Lame:            { id: 'Lame',            name: 'Lamé (Glitter)',      desc: 'Individual scales reflect dazzling multicolor crystal glitter flecks.' },
    ExternalLight:   { id: 'ExternalLight',   name: 'External Light (Miyuki)', desc: 'Radiant metallic line shining continuously along the dorsal spine.' },
    InternalLight:   { id: 'InternalLight',   name: 'Internal Light',      desc: 'Luminescent bluish-green glow radiating from deep muscular tissue.' },
    ChromosomeLight: { id: 'ChromosomeLight', name: 'Ginga (Chromosome)',  desc: 'Brilliant light flecks scattered over transparent scales.' },
    PeritonealLight: { id: 'PeritonealLight', name: 'Peritoneal Sheen',    desc: 'Silvery mirror-like metallic guanine coating the abdominal wall.' }
  };

  // ====================================================================
  // 8. 3 PATTERNS & THE BLACK BACKGROUND MUTATION RULE
  // ====================================================================
  // Rule: Spots and Rim will NEVER mutate unless the tank background is 'black'!
  MedakaConfig.PATTERNS = {
    None: {
      id: 'None',
      name: 'Solid (No Pattern)',
      blackBgRequired: false,
      desc: 'Uniform scale pigmentation without melanophore blotching.'
    },
    Spots: {
      id: 'Spots',
      name: 'Spots (Buchi)',
      blackBgRequired: true,
      desc: 'Scattered ink-like black melanophore blotches. Requires Black Lacquer Basin to mutate!'
    },
    Rim: {
      id: 'Rim',
      name: 'Black Rim',
      blackBgRequired: true,
      desc: 'Dark charcoal outlining on individual scale margins. Requires Black Lacquer Basin to mutate!'
    }
  };

  // ====================================================================
  // 9. METABOLIC & FOOD CAPACITY GENES
  // ====================================================================
  MedakaConfig.FOOD_GENES = {
    // How many pellets can be held before stomach is full
    maxCapacityAlleles: [3, 5, 8, 12],
    defaultCapacity: 5,

    // Seconds required to digest 1 pellet
    digestionSpeedAlleles: [30, 24, 18, 12], // Lower is faster metabolism
    defaultDigestion: 24
  };

  // ====================================================================
  // 10. HELPER UTILITIES
  // ====================================================================
  MedakaConfig.hasWhiteBelly = function (colorKey) {
    const color = MedakaConfig.COLORS[colorKey];
    return color ? color.whiteBelly : true;
  };

  MedakaConfig.isSamuraiAllowed = function (bodyTypeCode) {
    return bodyTypeCode === 'H' || bodyTypeCode === 'HD';
  };

  MedakaConfig.getAssetPath = function (type, bodyType, traitName) {
    switch (type) {
      case 'head':
        return `medaka/head/H_${bodyType}_${traitName}.png`;
      case 'body':
        return `medaka/body/B_${bodyType}_${traitName}.png`;
      case 'pattern':
        return `medaka/pattern/P_${bodyType}_${traitName}.png`;
      default:
        return '';
    }
  };

  // Export to window
  window.MedakaConfig = MedakaConfig;
})();