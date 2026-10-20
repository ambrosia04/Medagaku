/**
 * ======================================================================
 * MEDAKA GENETICS - Mendelian Inheritance Engine (js/medakaGenetics.js)
 * Real-world trait synergy & inheritance rules inspired by Kon et al., 2026
 * ======================================================================
 */

(function () {
  const MedakaGenetics = {};

  // Normal color mutations.
  // IMPORTANT: fuchsia is intentionally excluded from this list.
  const MUTATION_COLORS = [
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'pink',
    'white'
  ];

  const MUTATION_RATE = 0.05;

  function breed(parent1, parent2) {
    const childGenes = {
      color: [
        Math.random() < 0.5 ? parent1.genes.color[0] : parent2.genes.color[0],
        Math.random() < 0.5 ? parent1.genes.color[1] : parent2.genes.color[1]
      ]
    };

    // Normal mutations.
    // Fuchsia CANNOT be generated here.
    for (let i = 0; i < childGenes.color.length; i++) {
      if (Math.random() < MUTATION_RATE) {
        childGenes.color[i] =
          MUTATION_COLORS[
          Math.floor(Math.random() * MUTATION_COLORS.length)
          ];
      }
    }

    return childGenes;
  }

  const BLACK_BG_PATTERN_MUTATION_RATE = 0.06;

  MedakaGenetics.createWildType = function (gender = 'F') {
    return {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      name: 'Wild Kuro Medaka',
      gender: gender,
      age: 30,
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
      digestionTime: 24,
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
        digestionTime: [24, 24]
      }
    };
  };

  MedakaGenetics.createCustomMedaka = function (params = {}) {
    const color = params.color || 'brown';
    const bodyType = params.bodyType || 'N';
    const eye = params.eye || 'Normal';
    const fin = params.fin || 'Hishio';
    const iridophore = params.iridophore || 'None';
    const pattern = params.pattern || 'None';
    const maxFood = params.maxFood || 5;
    const digestionTime = params.digestionTime || 24;
    const gender = params.gender || (Math.random() < 0.5 ? 'M' : 'F');

    return {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      name: `${capitalize(color)} ${bodyType !== 'N' ? bodyType + ' ' : ''}Medaka`,
      gender: gender,
      age: params.age !== undefined ? params.age : 30,
      isAdult: params.age !== undefined ? params.age >= 25 : true,
      carryingEggs: false,
      eggTimer: 0,
      restTimer: 0,
      bodyType: bodyType,
      color: color,
      eye: eye,
      fin: fin,
      iridophore: iridophore,
      pattern: pattern,
      maxFood: maxFood,
      digestionTime: digestionTime,
      foodEaten: 0,
      digestionTimer: 0,
      genes: {
        color: params.genes?.color || [color, color],
        bodyType: params.genes?.bodyType || [bodyType, bodyType],
        eye: params.genes?.eye || [eye, eye],
        fin: params.genes?.fin || [fin, fin],
        iridophore: params.genes?.iridophore || [iridophore, iridophore],
        pattern: params.genes?.pattern || [pattern, pattern],
        maxFood: params.genes?.maxFood || [maxFood, maxFood],
        digestionTime: params.genes?.digestionTime || [digestionTime, digestionTime]
      }
    };
  };

  MedakaGenetics.breed = function (mother, father, tank = { background: 'blue' }) {
    // 1. Stomach capacity inheritance with ±1 mutation bounds [min: 2, max: 15]
    const inheritCap = (mGene, fGene) => {
      let base = Math.random() < 0.5 ? mGene[Math.floor(Math.random() * mGene.length)] : fGene[Math.floor(Math.random() * fGene.length)];
      if (Math.random() < 0.25) {
        base += Math.random() < 0.5 ? 1 : -1;
      }
      return Math.max(2, Math.min(15, base));
    };

    const childMaxFood1 = inheritCap(mother.genes.maxFood, father.genes.maxFood);
    const childMaxFood2 = inheritCap(mother.genes.maxFood, father.genes.maxFood);
    const expressedMaxFood = Math.max(childMaxFood1, childMaxFood2);

    // 2. Trait synergy helper: if both parents carry a specific gene or dark pigment, 
    // give a slight boost to preserving or co-inheriting related structural traits (realistic genetic linkage)
    const pickLinkedAllele = (mPair, fPair, synergyBonus = false) => {
      if (synergyBonus && Math.random() < 0.2) {
        // Prefer matching traits if parents share them
        const common = mPair.find(a => fPair.includes(a));
        if (common) return common;
      }
      return Math.random() < 0.5 ? mPair[Math.floor(Math.random() * mPair.length)] : fPair[Math.floor(Math.random() * fPair.length)];
    };

    const shareColor = mother.color === father.color;

    const childGenes = {
      color: [pickRandomAllele(mother.genes.color), pickRandomAllele(father.genes.color)],
      bodyType: [pickRandomAllele(mother.genes.bodyType), pickRandomAllele(father.genes.bodyType)],
      eye: [pickRandomAllele(mother.genes.eye), pickRandomAllele(father.genes.eye)],
      fin: [pickRandomAllele(mother.genes.fin), pickRandomAllele(father.genes.fin)],
      iridophore: [pickRandomAllele(mother.genes.iridophore), pickRandomAllele(father.genes.iridophore)],
      pattern: [pickRandomAllele(mother.genes.pattern), pickRandomAllele(father.genes.pattern)],
      maxFood: [childMaxFood1, childMaxFood2],
      digestionTime: [24, 24]
    };

    // 2. Random Spontaneous Mutations
    applySpontaneousMutations(childGenes);


    // ULTRA-RARE FUCHSIA TRANSGENIC MUTATION CONDITION:
    // Requires Spawning Mop, Hornwort, and Water Sprite to ALL be at least Level 15 in this tank!
    const plants = tank.plants || {};
    const mopLvl = plants.spawningMop || 0;
    const hornLvl = plants.hornwort || 0;
    const spriteLvl = plants.watersprite || 0;

    if (mopLvl >= 15 && hornLvl >= 15 && spriteLvl >= 15) {
      if (Math.random() < 0.0001) {
        childGenes.color[0] = 'fuchsia';
        childGenes.color[1] = 'fuchsia';
      }
    }

    // SPECIAL GREEN PLANTED BASIN MUTATION: Rare GFP Transgenic Mutation
    // If breeding in the planted bio-green basin, chance for a GFP fluorescent mutation!
    if (tank.background === 'moss' && Math.random() < 0.015) { // 1.5% chance
      childGenes.color[1] = 'gfp';
    }

    // 3. Environmental Background Response (Haichi Hannou for Spots/Rim)
    // Spots and Rim REQUIRE the Black Lacquer Basin on THIS specific tank!
    const isBlackBasin = Boolean(tank && tank.background === 'black');

    if (isBlackBasin) {
      if (Math.random() < BLACK_BG_PATTERN_MUTATION_RATE && childGenes.pattern[0] === 'None') {
        const mutatedPattern = Math.random() < 0.5 ? 'Spots' : 'Rim';
        childGenes.pattern[1] = mutatedPattern;
      }
    } else {
      // In non-black basins (moss, blue, white), background adaptation does not occur.
      // Offspring cannot mutate or carry patterns here.
      childGenes.pattern = ['None', 'None'];
    }

    // 4. Resolve Phenotypes from Alleles
    const expressedBodyType = MedakaGenetics.resolveBodyType(childGenes.bodyType);
    const expressedColor = MedakaGenetics.resolveColor(childGenes.color);
    const expressedEye = MedakaGenetics.resolveEye(childGenes.eye);
    const expressedFin = MedakaGenetics.resolveFin(childGenes.fin, expressedBodyType);
    const expressedIridophore = MedakaGenetics.resolveIridophore(childGenes.iridophore);
    // Strict Haichi Hannou: patterns only express in a black basin
    const expressedPattern = isBlackBasin ? MedakaGenetics.resolvePattern(childGenes.pattern) : 'None';
    const expressedDigestion = Math.min(childGenes.digestionTime[0], childGenes.digestionTime[1]);

    const gender = Math.random() < 0.5 ? 'M' : 'F';
    const namePrefix = capitalize(expressedColor);
    const bodyStr = expressedBodyType !== 'N' ? expressedBodyType + ' ' : '';

    return {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      name: `${namePrefix} ${bodyStr}Medaka`,
      gender: gender,
      age: 0,
      isAdult: false,
      carryingEggs: false,
      eggTimer: 0,
      restTimer: 0,
      bodyType: expressedBodyType,
      color: expressedColor,
      eye: expressedEye,
      fin: expressedFin,
      iridophore: expressedIridophore,
      pattern: expressedPattern,
      maxFood: expressedMaxFood,
      digestionTime: expressedDigestion,
      foodEaten: 0,
      digestionTimer: 0,
      genes: childGenes
    };
  };

  MedakaGenetics.resolveColor = function ([a1, a2]) {
    const cfg = window.MedakaConfig ? window.MedakaConfig.COLORS : null;
    if (!cfg) return a1;

    const dom1 = cfg[a1]?.dominance || 5;
    const dom2 = cfg[a2]?.dominance || 5;

    if (dom1 > dom2) return a1;
    if (dom2 > dom1) return a2;
    return Math.random() < 0.5 ? a1 : a2;
  };

  MedakaGenetics.resolveBodyType = function ([a1, a2]) {
    const hasH = a1 === 'H' || a2 === 'H' || a1 === 'HD' || a2 === 'HD';
    const hasD = a1 === 'D' || a2 === 'D' || a1 === 'HD' || a2 === 'HD';

    if (hasH && hasD) return 'HD';
    if (hasH) return 'H';
    if (a1 === 'D' && a2 === 'D') return 'D';
    if (hasD && Math.random() < 0.35) return 'D';
    return 'N';
  };

  MedakaGenetics.resolveEye = function ([a1, a2]) {
    if (a1 === 'Normal' && a2 === 'Normal') return 'Normal';
    if (a1 === 'Normal') return Math.random() < 0.75 ? 'Normal' : a2;
    if (a2 === 'Normal') return Math.random() < 0.75 ? 'Normal' : a1;
    return a1 === a2 ? a1 : (Math.random() < 0.5 ? a1 : a2);
  };

  MedakaGenetics.resolveFin = function ([a1, a2], bodyType) {
    let candidate = (a1 === 'Hishio' || a2 === 'Hishio')
      ? (Math.random() < 0.65 ? 'Hishio' : (a1 === 'Hishio' ? a2 : a1))
      : (Math.random() < 0.5 ? a1 : a2);

    // Real-world biological rule: Samurai fin shape requires the mirror-dorsal body frame (Hikari)
    if (candidate === 'Samurai') {
      const isAllowed = window.MedakaConfig
        ? window.MedakaConfig.isSamuraiAllowed(bodyType)
        : (bodyType === 'H' || bodyType === 'HD');

      if (!isAllowed) {
        candidate = 'Hishio';
      }
    }

    return candidate;
  };

  MedakaGenetics.resolveIridophore = function ([a1, a2]) {
    if (a1 === a2) return a1;
    if (a1 === 'None') return Math.random() < 0.6 ? 'None' : a2;
    if (a2 === 'None') return Math.random() < 0.6 ? 'None' : a1;
    return Math.random() < 0.5 ? a1 : a2;
  };

  MedakaGenetics.resolvePattern = function ([a1, a2]) {
    if (a1 === 'Spots' || a2 === 'Spots') return 'Spots';
    if (a1 === 'Rim' || a2 === 'Rim') return 'Rim';
    return 'None';
  };

  function pickRandomAllele(pair) {
    return pair[Math.random() < 0.5 ? 0 : 1];
  }

  function applySpontaneousMutations(genes) {
    const config = window.MedakaConfig;
    if (!config) return;

    if (Math.random() < MUTATION_RATE) {
      // Fuchsia is EXCLUDED from normal spontaneous mutations.
      const colors = Object.keys(config.COLORS).filter(
        color => color !== 'fuchsia'
      );

      genes.color[1] = colors[Math.floor(Math.random() * colors.length)];
    }

    if (Math.random() < MUTATION_RATE) {
      const types = ['N', 'H', 'D'];
      genes.bodyType[1] = types[Math.floor(Math.random() * types.length)];
    }

    if (Math.random() < MUTATION_RATE) {
      const eyes = Object.keys(config.EYE_TYPES);
      genes.eye[1] = eyes[Math.floor(Math.random() * eyes.length)];
    }

    if (Math.random() < MUTATION_RATE) {
      const fins = Object.keys(config.FIN_TYPES);
      genes.fin[1] = fins[Math.floor(Math.random() * fins.length)];
    }

    if (Math.random() < MUTATION_RATE) {
      const iridos = Object.keys(config.IRIDOPHORES);
      genes.iridophore[1] = iridos[Math.floor(Math.random() * iridos.length)];
    }

    if (Math.random() < MUTATION_RATE) {
      const capacities = config.FOOD_GENES.maxCapacityAlleles;
      genes.maxFood[1] = capacities[Math.floor(Math.random() * capacities.length)];
    }
  }

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  window.MedakaGenetics = MedakaGenetics;
})();