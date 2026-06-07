// INVINCIBLE: SIMULATION — game data v0.3

const TYPES = {
  PHYSICAL: { name: 'PHYSICAL', color: '#ff6a3a' },
  ENERGY:   { name: 'ENERGY',   color: '#00f0ff' },
  COSMIC:   { name: 'COSMIC',   color: '#ff2bd6' },
  TECH:     { name: 'TECH',     color: '#34ff7a' },
  BIO:      { name: 'BIO',      color: '#9a6cff' },
  MENTAL:   { name: 'MENTAL',   color: '#ffd400' }
};

const TYPE_CHART = {
  PHYSICAL: { VILTRUMITE: 0.5, TECH: 1.5, BIO: 1.0 },
  ENERGY:   { VILTRUMITE: 1.0, TECH: 1.5, BIO: 0.75 },
  COSMIC:   { VILTRUMITE: 2.0, TECH: 1.0, BIO: 1.25 },
  TECH:     { VILTRUMITE: 1.0, TECH: 0.5, BIO: 1.0 },
  BIO:      { VILTRUMITE: 0.5, TECH: 0.5, BIO: 1.5 },
  MENTAL:   { VILTRUMITE: 1.25, TECH: 0.25, BIO: 1.5 }
};

const MOVES = {
  punch:       { name: 'PUNCH',        type: 'PHYSICAL', power: 18, ep: 0,  desc: 'A basic strike.' },
  flyKick:     { name: 'FLY KICK',     type: 'PHYSICAL', power: 28, ep: 4,  desc: 'Dive-bomb the target.' },
  haymaker:    { name: 'HAYMAKER',     type: 'PHYSICAL', power: 42, ep: 10, desc: 'Wind up. Hits hard.' },
  sonicBoom:   { name: 'SONIC BOOM',   type: 'ENERGY',   power: 32, ep: 8,  desc: 'Break the sound barrier on impact.' },
  uppercut:    { name: 'UPPERCUT',     type: 'PHYSICAL', power: 36, ep: 8,  desc: 'Launch them skyward.' },
  rage:        { name: 'RAGE',         type: 'PHYSICAL', power: 60, ep: 18, desc: 'No limits. No mercy.' },
  starePunch:  { name: 'STARE PUNCH',  type: 'COSMIC',   power: 55, ep: 14, desc: 'Channel the look.' },

  pinkBlast:   { name: 'PINK BLAST',   type: 'ENERGY',   power: 26, ep: 5,  desc: 'Focused matter beam.' },
  shieldWall:  { name: 'SHIELD WALL',  type: 'ENERGY',   power: 0,  ep: 6,  desc: 'Halve next incoming hit.' },
  reshape:     { name: 'RESHAPE',      type: 'COSMIC',   power: 30, ep: 10, desc: 'Reform matter into a strike.' },
  burst:       { name: 'BURST',        type: 'ENERGY',   power: 48, ep: 14, desc: 'Wide-area pink detonation.' },

  bite:        { name: 'BITE',         type: 'BIO',      power: 16, ep: 0,  desc: 'Tear in.' },
  slam:        { name: 'SLAM',         type: 'PHYSICAL', power: 22, ep: 0,  desc: 'Body slam.' },
  quake:       { name: 'QUAKE',        type: 'PHYSICAL', power: 30, ep: 8,  desc: 'Shake the ground.' },
  conquestFist:{ name: 'CONQUEST FIST',type: 'PHYSICAL', power: 50, ep: 12, desc: 'A hammer in the shape of a man.' },
  laserBlast:  { name: 'LASER BLAST',  type: 'ENERGY',   power: 24, ep: 6,  desc: 'Twin red beams.' },

  // Boss-tier moves
  omniSlap:    { name: 'OMNI SLAP',    type: 'PHYSICAL', power: 90, ep: 0,  desc: 'A father\'s hand. Devastating.' },
  maceCrush:   { name: 'MACE CRUSH',   type: 'PHYSICAL', power: 65, ep: 16, desc: 'Two-handed downward smash.' },
  bloodRage:   { name: 'BLOOD RAGE',   type: 'PHYSICAL', power: 80, ep: 20, desc: 'No restraint. No tomorrow.' },
  finalWord:   { name: 'FINAL WORD',   type: 'COSMIC',   power: 110, ep: 30, desc: 'The fight ends here.' },

  // ===== SHOP TUTOR MOVES (Mark) =====
  thrust:       { name: 'THRUST',       type: 'PHYSICAL', power: 24, ep: 3,  desc: 'Quick spear-strike with both hands.' },
  doubleStrike: { name: 'DOUBLE STRIKE',type: 'PHYSICAL', power: 22, ep: 8,  desc: 'Hits twice in one turn.' },
  skybreak:     { name: 'SKYBREAK',     type: 'PHYSICAL', power: 70, ep: 22, desc: 'Drop from orbit. Crater impact.' },
  viltrumStrike:{ name: 'VILTRUM STRIKE',type: 'COSMIC',  power: 75, ep: 22, desc: 'A move only your blood can throw.' },
  bloodFist:    { name: 'BLOOD FIST',   type: 'PHYSICAL', power: 95, ep: 28, desc: 'You feel it crack. Yours? His? Both.' },
  novaBeam:     { name: 'NOVA BEAM',    type: 'COSMIC',   power: 68, ep: 18, desc: 'Stare. Concentrate. Detonate.' },
  empGrid:      { name: 'EMP GRID',     type: 'TECH',     power: 50, ep: 14, desc: 'Frame the enemy in a static lattice.' },

  // ===== SHOP TUTOR MOVES (Eve) =====
  pinkShield:   { name: 'PINK SHIELD',  type: 'ENERGY',   power: 0,  ep: 8,  desc: 'Full damage block — single hit only.' },
  novaBurst:    { name: 'NOVA BURST',   type: 'ENERGY',   power: 64, ep: 20, desc: 'Detonate a sphere of pink matter.' },
  pinkRain:     { name: 'PINK RAIN',    type: 'COSMIC',   power: 38, ep: 16, desc: 'Shard fall. Wide hit.' },
  atomicEdge:   { name: 'ATOMIC EDGE',  type: 'COSMIC',   power: 78, ep: 24, desc: 'Reshape the atoms of the air into blades.' },
  healingPulse: { name: 'HEALING PULSE',type: 'BIO',      power: 0,  ep: 16, desc: 'Restore 60% HP to the active fighter.' },
  meltdown:     { name: 'MELTDOWN',     type: 'BIO',      power: 88, ep: 26, desc: 'Force the enemy\'s cells to come apart.' },

  // ===== ALLEN THE ALIEN MOVES =====
  cosmicSlap:   { name: 'COSMIC SLAP',  type: 'PHYSICAL',power: 30, ep: 5,  desc: 'A casual smack from interstellar muscle.' },
  starHook:     { name: 'STAR HOOK',    type: 'COSMIC',  power: 45, ep: 12, desc: 'A hook from across the galaxy.' },
  galaxyRam:    { name: 'GALAXY RAM',   type: 'PHYSICAL',power: 65, ep: 18, desc: 'Head-down, full charge.' },
  unopanWill:   { name: 'UNOPAN WILL',  type: 'MENTAL',  power: 50, ep: 14, desc: 'Channel his species\' iron resolve.' },

  // ===== MARS BOSS MOVES =====
  swarmBite:    { name: 'SWARM BITE',   type: 'BIO',     power: 28, ep: 4,  desc: 'A thousand small mouths.' },
  scepterBolt:  { name: 'SCEPTER BOLT', type: 'COSMIC',  power: 40, ep: 10, desc: 'Crystallized authority.' },
  unicycleRam:  { name: 'WHEEL RUSH',   type: 'PHYSICAL',power: 38, ep: 8,  desc: 'Run them over.' },
  blasterShot:  { name: 'BLASTER SHOT', type: 'ENERGY',  power: 36, ep: 6,  desc: 'Plasma round, dead center.' },
  beastFury:    { name: 'BEAST FURY',   type: 'PHYSICAL',power: 85, ep: 20, desc: 'Earth-shaking war cry.' },
  thraggFist:   { name: 'THRAGG FIST',  type: 'PHYSICAL',power: 70, ep: 16, desc: 'The Emperor\'s correction.' },
  worldEnder:   { name: 'WORLD ENDER',  type: 'COSMIC',  power: 130, ep: 36, desc: 'A move to end species.' },
  empireDecree: { name: 'EMPIRE DECREE',type: 'MENTAL',  power: 75, ep: 22, desc: 'Order from a billion stars away.' }
};

const UTILITIES = {
  suitUp:    { name: 'SUIT UP',    desc: 'Boost DEF for 3 turns.',  ep: 6,  effect: 'buff_def' },
  heal:      { name: 'HEAL',       desc: 'Restore 40% HP.',         ep: 12, effect: 'heal' },
  reshapeU:  { name: 'RESHAPE',    desc: 'Boost ATK for 3 turns.',  ep: 8,  effect: 'buff_atk' },
  lecture:   { name: 'LECTURE',    desc: 'Lower enemy ATK.',        ep: 6,  effect: 'debuff_atk' },
  focus:     { name: 'FOCUS',      desc: 'Restore 20 EP.',          ep: 0,  effect: 'restore_ep' }
};

const CHARACTERS = {
  mark: {
    id: 'mark',
    name: 'MARK',
    sprite: 'assets/mark.png',
    tag: 'VILTRUMITE',
    baseHP: 90, baseEP: 32,
    baseATK: 16, baseDEF: 12, baseSPD: 14,
    bio: 'Half-Viltrumite. Learning what that means.',
    moveset: [
      { lvl: 1, move: 'punch' },
      { lvl: 1, move: 'flyKick' },
      { lvl: 3, move: 'sonicBoom' },
      { lvl: 5, move: 'uppercut' },
      { lvl: 8, move: 'haymaker' },
      { lvl: 12, move: 'starePunch' },
      { lvl: 16, move: 'rage' }
    ],
    utilities: ['suitUp', 'focus']
  },
  eve: {
    id: 'eve',
    name: 'EVE',
    sprite: 'assets/eve.png',
    tag: 'BIO',
    baseHP: 78, baseEP: 60,
    baseATK: 14, baseDEF: 10, baseSPD: 13,
    bio: 'Reshapes matter. Cares too much.',
    moveset: [
      { lvl: 1, move: 'pinkBlast' },
      { lvl: 1, move: 'shieldWall' },
      { lvl: 4, move: 'reshape' },
      { lvl: 9, move: 'burst' }
    ],
    utilities: ['heal', 'reshapeU', 'focus']
  },
  allen: {
    id: 'allen',
    name: 'ALLEN',
    sprite: 'assets/allen.png',
    tag: 'COSMIC',
    baseHP: 110, baseEP: 50,
    baseATK: 20, baseDEF: 14, baseSPD: 12,
    bio: 'Unopan champion. Strong enough to bend a galaxy.',
    moveset: [
      { lvl: 1, move: 'cosmicSlap' },
      { lvl: 1, move: 'starHook' },
      { lvl: 4, move: 'unopanWill' },
      { lvl: 8, move: 'galaxyRam' }
    ],
    utilities: ['suitUp', 'focus']
  }
};

// Enemies — each can have intro/mid/outro/phase dialogue
const ENEMIES = {
  omniman: {
    name: 'OMNI-BUNNY',
    sprite: 'assets/omniman.png',
    tag: 'VILTRUMITE',
    hp: 280, ep: 60, atk: 26, def: 20, spd: 10,
    slowChance: 0.25,
    moves: ['omniSlap', 'haymaker', 'slam'],
    intro: 'OMNI-BUNNY: "Are you sure you want to do this, son?"',
    midHpDialogue: [
      { at: 0.8, text: 'OMNI-BUNNY: "You\'re holding back. So am I."' },
      { at: 0.5, text: 'OMNI-BUNNY: "Think, Mark! THINK!"' },
      { at: 0.2, text: 'OMNI-BUNNY: "You\'d still have me." (His voice cracks.)' }
    ],
    xp: 0, gda: 50,
    scripted: true   // forced loss
  },
  mauler: {
    name: 'MAULER TWINS',
    sprite: 'assets/mauler.png',
    tag: 'TECH',
    hp: 140, ep: 30, atk: 16, def: 12, spd: 7,
    slowChance: 0.15,
    moves: ['slam', 'bite', 'quake'],
    intro: 'TWIN A: "I\'m the original!" TWIN B: "No — *I* am!"',
    midHpDialogue: [
      { at: 0.6, text: 'TWIN A: "Hit him harder, you idiot!"' },
      { at: 0.3, text: 'TWIN B: "Stop bossing me around — I\'M the original!"' }
    ],
    xp: 60, gda: 45
  },
  seismic: {
    name: 'DOC SEISMIC',
    sprite: 'assets/seismic.png',
    tag: 'TECH',
    hp: 180, ep: 50, atk: 18, def: 10, spd: 7,
    slowChance: 0.2,
    canHeal: true, healAmount: 35, healThreshold: 0.5, healChance: 0.3,
    healDialogue: 'DOC SEISMIC: "The Earth provides!" (Stone tendrils mend his wounds.)',
    moves: ['quake', 'slam', 'bite'],
    intro: 'DOC SEISMIC: "The Earth speaks. LISTEN."',
    midHpDialogue: [
      { at: 0.5, text: 'DOC SEISMIC: "You can\'t punch a tectonic plate, kid!"' },
      { at: 0.2, text: 'DOC SEISMIC: "FINE. The Earth dies WITH me!"' }
    ],
    xp: 90, gda: 70
  },
  flaxan: {
    name: 'FLAXAN SOLDIER',
    sprite: 'assets/flaxan.png',
    tag: 'BIO',
    hp: 200, ep: 40, atk: 16, def: 10, spd: 11,
    slowChance: 0.1,
    moves: ['bite', 'laserBlast', 'slam'],
    intro: 'FLAXAN SOLDIER: "*kksskk* — Earth. Will. Fall."',
    midHpDialogue: [
      { at: 0.5, text: 'Another Flaxan portal opens behind it. Reinforcements?' },
      { at: 0.25, text: 'FLAXAN SOLDIER: "TIME. SLOWS. FOR. YOU."' }
    ],
    xp: 110, gda: 85
  },
  angstrom: {
    name: 'ANGSTROM LEVY',
    sprite: 'assets/angstrom.png',
    tag: 'TECH',
    hp: 260, ep: 60, atk: 20, def: 14, spd: 9,
    slowChance: 0.2,
    canHeal: true, healAmount: 50, healThreshold: 0.4, healChance: 0.35,
    healDialogue: 'ANGSTROM: "A version of me from another universe gave me this." (A green portal closes; his wounds are gone.)',
    moves: ['laserBlast', 'slam', 'quake', 'haymaker'],
    intro: 'ANGSTROM LEVY steps through a green portal. "You don\'t even remember, do you?"',
    midHpDialogue: [
      { at: 0.7, text: 'ANGSTROM: "In another universe, you destroyed everything."' },
      { at: 0.4, text: 'ANGSTROM: "And in another. And another. AND ANOTHER."' },
      { at: 0.15, text: 'ANGSTROM: "I\'m doing this for ALL of them."' }
    ],
    xp: 180, gda: 140
  },
  // CONQUEST has multi-phase script (handled specially in battle.js)
  conquest: {
    name: 'CONQUEST',
    sprite: 'assets/conquest.png',
    tag: 'VILTRUMITE',
    hp: 450, ep: 100, atk: 28, def: 22, spd: 8,
    slowChance: 0.2,
    canHeal: true, healAmount: 70, healThreshold: 0.35, healChance: 0.3,
    healDialogue: 'CONQUEST grins as his Viltrumite blood mends bone. "We don\'t die easy, boy."',
    moves: ['haymaker', 'uppercut', 'slam'], // phase 1 moveset
    intro: 'CONQUEST cracks his neck. "Finally. A real fight."',
    phases: [
      {
        threshold: 1.0,
        text: 'CONQUEST: "Show me what you\'ve got, boy."',
        moves: ['haymaker', 'uppercut', 'slam']
      },
      {
        threshold: 0.5,
        text: 'CONQUEST: "Good. GOOD. Now you\'re fighting." (He raises his mace.)',
        moves: ['conquestFist', 'maceCrush', 'haymaker'],
        atkBuff: 4
      },
      {
        threshold: 0.2,
        text: 'CONQUEST: "Where is the GIRL? Hit me with EVERYTHING."',
        moves: ['bloodRage', 'finalWord', 'conquestFist', 'maceCrush'],
        atkBuff: 8,
        spdBuff: 4
      }
    ],
    xp: 500, gda: 400
  },

  // ============ MARS ENEMIES ============
  princess: {
    name: 'MARTIAN PRINCESS',
    sprite: 'assets/princess.png',
    tag: 'MENTAL',
    hp: 320, ep: 80, atk: 26, def: 18, spd: 11,
    slowChance: 0.15,
    canHeal: true, healAmount: 40, healThreshold: 0.4, healChance: 0.25,
    healDialogue: 'PRINCESS: "The Court mends what you would break."',
    moves: ['scepterBolt', 'unopanWill', 'slam'],
    intro: 'MARTIAN PRINCESS: "You came armed. Bold. Continue if you wish to be tested."',
    midHpDialogue: [
      { at: 0.6, text: 'PRINCESS: "You strike like one of theirs."' },
      { at: 0.3, text: 'PRINCESS: "Enough. I have seen what I needed."' }
    ],
    xp: 220, gda: 180
  },
  sequid: {
    name: 'SEQUID SWARM',
    sprite: 'assets/sequid.png',
    tag: 'BIO',
    hp: 380, ep: 60, atk: 18, def: 8, spd: 14,
    slowChance: 0.1,
    moves: ['swarmBite', 'bite', 'slam'],
    intro: 'SEQUID SWARM ripples — a thousand voices in one wet whisper.',
    midHpDialogue: [
      { at: 0.66, text: 'They split. There are MORE of them now.' },
      { at: 0.33, text: 'They split AGAIN. The hum is deafening.' }
    ],
    xp: 260, gda: 200
  },
  battle_beast: {
    name: 'BATTLE BEAST',
    sprite: 'assets/battle_beast.png',
    tag: 'VILTRUMITE',
    hp: 420, ep: 100, atk: 32, def: 22, spd: 10,
    slowChance: 0.2,
    moves: ['beastFury', 'haymaker', 'uppercut', 'slam'],
    intro: 'BATTLE BEAST: "I have killed worlds. SHOW ME WHY YOU\'RE WORTH MY TIME."',
    midHpDialogue: [
      { at: 0.7, text: 'BATTLE BEAST: "Better. Better!"' },
      { at: 0.4, text: 'BATTLE BEAST: "YES — finally a hunt."' },
      { at: 0.2, text: 'BATTLE BEAST stops, breathing hard. "Enough. You\'ve earned the air you breathe."' }
    ],
    xp: 0, gda: 250,
    scripted: true  // unwinnable — survive to "win" the encounter
  },
  allen_enemy: {
    name: 'ALLEN',
    sprite: 'assets/allen.png',
    tag: 'COSMIC',
    hp: 360, ep: 80, atk: 26, def: 18, spd: 12,
    slowChance: 0.15,
    moves: ['cosmicSlap', 'starHook', 'galaxyRam', 'slam'],
    intro: 'ALLEN: "You\'re wearing the colors. Talk fast."',
    midHpDialogue: [
      { at: 0.6, text: 'ALLEN: "Wait — you fight like Nolan, but not like a Viltrumite."' },
      { at: 0.25, text: 'ALLEN lowers his fists. "OK. OK. I get it. Stop hitting me."' }
    ],
    xp: 300, gda: 250
  },
  space_racer: {
    name: 'SPACE RACER',
    sprite: 'assets/space_racer.png',
    tag: 'TECH',
    hp: 280, ep: 70, atk: 24, def: 14, spd: 18,
    slowChance: 0.05,
    moves: ['blasterShot', 'unicycleRam', 'laserBlast'],
    intro: 'SPACE RACER revs his wheel. "Bounty\'s a bounty, kid."',
    midHpDialogue: [
      { at: 0.5, text: 'SPACE RACER: "Tch. They underbid this job."' },
      { at: 0.2, text: 'SPACE RACER: "Fine, fine. Not worth the paint job."' }
    ],
    xp: 320, gda: 280
  },
  thaedus: {
    name: 'THAEDUS',
    sprite: 'assets/thaedus.png',
    tag: 'VILTRUMITE',
    hp: 520, ep: 110, atk: 34, def: 26, spd: 8,
    slowChance: 0.25,
    canHeal: true, healAmount: 70, healThreshold: 0.4, healChance: 0.3,
    healDialogue: 'THAEDUS: "I have lived a long time, child. Long enough to mend." (His wounds close.)',
    moves: ['viltrumStrike', 'haymaker', 'uppercut', 'maceCrush'],
    intro: 'THAEDUS: "I left the Empire to find something better than killing. Don\'t make me prove I still can."',
    midHpDialogue: [
      { at: 0.7, text: 'THAEDUS: "Good. You\'re not Nolan."' },
      { at: 0.4, text: 'THAEDUS: "BETTER than him. Maybe."' },
      { at: 0.2, text: 'THAEDUS: "I leave Mars in your hands."' }
    ],
    xp: 450, gda: 380
  },
  kregg: {
    name: 'GENERAL KREGG',
    sprite: 'assets/kregg.png',
    tag: 'VILTRUMITE',
    hp: 560, ep: 100, atk: 36, def: 24, spd: 12,
    slowChance: 0.1,  // aggressive — barely winds up
    moves: ['thraggFist', 'haymaker', 'uppercut', 'omniSlap'],
    intro: 'GENERAL KREGG: "The Empire does not forget. The Empire does not forgive."',
    midHpDialogue: [
      { at: 0.5, text: 'KREGG: "Predictable. Disappointing."' },
      { at: 0.2, text: 'KREGG: "FOR THRAGG."' }
    ],
    xp: 520, gda: 460
  },
  thragg: {
    name: 'THRAGG',
    sprite: 'assets/thragg.png',
    tag: 'VILTRUMITE',
    hp: 700, ep: 160, atk: 40, def: 28, spd: 9,
    slowChance: 0.15,
    canHeal: true, healAmount: 90, healThreshold: 0.3, healChance: 0.25,
    healDialogue: 'THRAGG: "I am the Empire. The Empire endures." (His wounds close in seconds.)',
    moves: ['thraggFist', 'haymaker', 'uppercut'],
    intro: 'THRAGG looks down at you. "Another half-breed. I will be brief."',
    phases: [
      {
        threshold: 1.0,
        text: 'THRAGG: "Show me what Nolan\'s child can do."',
        moves: ['thraggFist', 'haymaker', 'uppercut']
      },
      {
        threshold: 0.5,
        text: 'THRAGG: "Adequate. I will use both hands now."',
        moves: ['thraggFist', 'maceCrush', 'empireDecree', 'haymaker'],
        atkBuff: 4
      },
      {
        threshold: 0.2,
        text: 'THRAGG: "I have a billion children. You have ONE life."',
        moves: ['worldEnder', 'empireDecree', 'thraggFist', 'finalWord'],
        atkBuff: 10, spdBuff: 4
      }
    ],
    xp: 800, gda: 700
  }
};

const SCENES = [
  // ============ EARTH ============
  { region: 'earth', id: 's0', num: '00', title: 'OMNI-BUNNY (TUTORIAL)', desc: 'Your father. Your hero. Your first real fight.', enemy: 'omniman', recLvl: 1, scripted: true, forceCharacter: 'mark' },
  { region: 'earth', id: 's1', num: '01', title: 'MAULER TWINS', desc: 'They both insist they\'re the original.', enemy: 'mauler', recLvl: 2 },
  { region: 'earth', id: 's2', num: '02', title: 'DOC SEISMIC', desc: 'The street is shaking. So is he.', enemy: 'seismic', recLvl: 4 },
  { region: 'earth', id: 's3', num: '03', title: 'FLAXAN INVASION', desc: 'They come through fast. Hit faster.', enemy: 'flaxan', recLvl: 6 },
  { region: 'earth', id: 's4', num: '04', title: 'ANGSTROM LEVY', desc: 'He remembers a thousand versions of you.', enemy: 'angstrom', recLvl: 9 },
  { region: 'earth', id: 's5', num: '05', title: 'CONQUEST', desc: 'The fight that defines you.', enemy: 'conquest', recLvl: 14, boss: true },

  // ============ MARS (unlocks after s5) ============
  { region: 'mars', id: 'm1', num: '01', title: 'MARTIAN PRINCESS', desc: 'She rules a dying world. She\'s testing you.',  enemy: 'princess',    recLvl: 16 },
  { region: 'mars', id: 'm2', num: '02', title: 'SEQUID SWARM',     desc: 'They split when you hit them. Hit anyway.',      enemy: 'sequid',      recLvl: 17 },
  { region: 'mars', id: 'm3', num: '03', title: 'BATTLE BEAST',     desc: 'He wants a real fight. Survive.',                 enemy: 'battle_beast',recLvl: 19, scripted: true },
  { region: 'mars', id: 'm4', num: '04', title: 'ALLEN THE ALIEN',  desc: 'He thinks you\'re Viltrumite scum. Prove him wrong.',enemy: 'allen_enemy', recLvl: 20, recruitsOnWin: 'allen' },
  { region: 'mars', id: 'm5', num: '05', title: 'SPACE RACER',      desc: 'Bounty hunter on a unicycle. Don\'t laugh.',      enemy: 'space_racer', recLvl: 22 },
  { region: 'mars', id: 'm6', num: '06', title: 'THAEDUS',          desc: 'The Viltrumite who turned. Brutal but slow.',     enemy: 'thaedus',     recLvl: 24 },
  { region: 'mars', id: 'm7', num: '07', title: 'GENERAL KREGG',    desc: 'Thragg\'s right hand. The Empire does not forget.', enemy: 'kregg',     recLvl: 26 },
  { region: 'mars', id: 'm8', num: '08', title: 'THRAGG',           desc: 'The Emperor. The end.',                            enemy: 'thragg',      recLvl: 30, boss: true }
];

const SHOP_DATA = {
  items: [
    // ----- HEALING -----
    { id: 'stim',        name: 'GDA STIM',       desc: 'Restore 50 HP in battle.',         price: 50,  currency: 'gda' },
    { id: 'patch',       name: 'AURA PATCH',     desc: 'Restore 30 HP + 10 EP.',           price: 80,  currency: 'gda' },
    { id: 'mega_stim',   name: 'MEGA STIM',      desc: 'Restore 100 HP.',                  price: 140, currency: 'gda' },
    { id: 'ultra_stim',  name: 'ULTRA STIM',     desc: 'Fully restore HP.',                price: 280, currency: 'gda' },
    { id: 'elixir',      name: 'ELIXIR',         desc: 'Fully restore HP and EP.',         price: 450, currency: 'gda' },

    // ----- EP / RESOURCE -----
    { id: 'focus_tab',   name: 'FOCUS TAB',      desc: 'Restore 20 EP.',                   price: 60,  currency: 'gda' },
    { id: 'battery',     name: 'BATTERY CELL',   desc: 'Restore 40 EP.',                   price: 120, currency: 'gda' },
    { id: 'mind_link',   name: 'MIND LINK',      desc: 'Fully restore EP.',                price: 220, currency: 'gda' },

    // ----- COMBAT BOOSTS -----
    { id: 'berserker',   name: 'BERSERKER BREW', desc: '+ATK for 3 turns.',                price: 140, currency: 'gda' },
    { id: 'iron_skin',   name: 'IRON SKIN',      desc: '+DEF for 3 turns.',                price: 140, currency: 'gda' },
    { id: 'damage_chg',  name: 'DAMAGE CHARGE',  desc: 'Next move deals 2x damage.',       price: 180, currency: 'gda' },
    { id: 'smoke_bomb',  name: 'SMOKE BOMB',     desc: 'Next enemy hit will miss.',        price: 120, currency: 'gda' },

    // ----- DIRECT DAMAGE / UTILITY -----
    { id: 'emp_nade',    name: 'EMP GRENADE',    desc: 'Deal 80 fixed damage to the enemy.', price: 160, currency: 'gda' },
    { id: 'thermite',    name: 'THERMITE CHARGE',desc: 'Deal 120 fixed damage to the enemy.', price: 260, currency: 'gda' },

    // ----- DEFENSE / CONTROL -----
    { id: 'antidote',    name: 'ANTIDOTE',       desc: 'Restore 40 HP.',                   price: 90,  currency: 'gda' },
    { id: 'second_wind', name: 'SECOND WIND',    desc: 'Clear all effects, restore 30 HP.',price: 130, currency: 'gda' },
    { id: 'revive',      name: 'REVIVE',         desc: 'Survive the next lethal hit.',     price: 200, currency: 'gda' },
    { id: 'phoenix',     name: 'PHOENIX DOWN',   desc: 'Auto-revive at 75% HP.',           price: 500, currency: 'gda' },

    // ----- PREMIUM (VM) -----
    { id: 'gda_kit',     name: 'GDA FIELD KIT',  desc: 'Full party restore (HP+EP).',      price: 4,   currency: 'vm' },
    { id: 'time_shard',  name: 'TIME SHARD',     desc: 'Take an extra turn this round.',   price: 6,   currency: 'vm' }
  ],

  suits: [
    { id: 'classic',   name: 'CLASSIC BLUE',     desc: 'OG suit. No stat change.',                price: 0,    currency: 'gda', owned: true },
    { id: 'black',     name: 'BLACK / GREY',     desc: 'Stealth-tinted variant.',                 price: 150,  currency: 'gda' },
    { id: 'beaten',    name: 'BEAT-UP SUIT',     desc: 'Survivor of the Conquest fight.',         price: 500,  currency: 'gda' },
    { id: 'training',  name: 'TRAINING GI',      desc: 'Loose grey gi. Casual day at the lab.',   price: 60,   currency: 'gda' },
    { id: 'gda_agent', name: 'GDA AGENT',        desc: 'Cecil-coded charcoal field uniform.',     price: 220,  currency: 'gda' },
    { id: 'omniman',   name: 'OMNI-MAN HOMAGE',  desc: 'White with the red collar. Tribute fit.', price: 400,  currency: 'gda' },
    { id: 'viltrumite',name: 'VILTRUMITE WHITE', desc: 'Full empire whites. Looks like home.',    price: 650,  currency: 'gda' },
    { id: 'streetwear',name: 'COLLEGE STREETWEAR',desc: 'Hoodie + jeans. Civilian Mark.',         price: 40,   currency: 'gda' },
    { id: 'tux',       name: 'PROM TUX',         desc: 'For dates and existential dread.',        price: 100,  currency: 'gda' },
    { id: 'multi_v1',  name: 'MULTIVERSE PURPLE',desc: 'From a darker timeline.',                 price: 350,  currency: 'gda' },
    { id: 'multi_v2',  name: 'MULTIVERSE GOLD',  desc: 'From a brighter one.',                    price: 350,  currency: 'gda' },
    { id: 'thragg',    name: 'THRAGG LORD',      desc: 'Crimson Viltrumite armor.',               price: 800,  currency: 'gda' },
    { id: 'streamer',  name: 'STREAMER LOGO',    desc: 'Sponsored-content variant.',              price: 120,  currency: 'gda' },
    { id: 'training2', name: 'BLOOD-SOAKED',     desc: 'Used. Stained. Loved.',                   price: 700,  currency: 'gda' },
    { id: 'glow',      name: 'NEON GLOW',        desc: 'Hot cyan trim. Cyber GUI canon.',         price: 3,    currency: 'vm' },
    { id: 'founder',   name: 'FOUNDER\'S EDITION', desc: 'Day-one supporter exclusive.',          price: 8,    currency: 'vm' },
    { id: 'invisible', name: 'INVISIBLE',        desc: 'No suit visible. The sprite is just Mark.', price: 10, currency: 'vm' },
    { id: 'omnibunny', name: 'OMNI-BUNNY PJ',    desc: 'Onesie with bunny ears. Cursed.',         price: 12,   currency: 'vm' }
  ],

  tutors: [
    // ----- MARK -----
    { id: 'tutor_thrust',       name: 'TEACH: THRUST',        desc: 'Quick low-EP physical for Mark.',   price: 2,  currency: 'vm' },
    { id: 'tutor_double',       name: 'TEACH: DOUBLE STRIKE', desc: 'Two hits in one turn for Mark.',    price: 4,  currency: 'vm' },
    { id: 'tutor_rage',         name: 'TEACH: RAGE',          desc: 'High-power physical for Mark.',     price: 5,  currency: 'vm' },
    { id: 'tutor_sky',          name: 'TEACH: SKYBREAK',      desc: 'Orbital-drop finisher for Mark.',   price: 7,  currency: 'vm' },
    { id: 'tutor_viltrum',      name: 'TEACH: VILTRUM STRIKE',desc: 'Cosmic-tagged big hit for Mark.',   price: 8,  currency: 'vm' },
    { id: 'tutor_blood',        name: 'TEACH: BLOOD FIST',    desc: 'Brutal finisher for Mark.',         price: 12, currency: 'vm' },
    { id: 'tutor_nova',         name: 'TEACH: NOVA BEAM',     desc: 'Cosmic ranged option for Mark.',    price: 6,  currency: 'vm' },
    { id: 'tutor_emp',          name: 'TEACH: EMP GRID',      desc: 'Tech-tagged area lock for Mark.',   price: 5,  currency: 'vm' },

    // ----- EVE -----
    { id: 'tutor_burst',        name: 'TEACH: BURST',         desc: 'Wide pink detonation for Eve.',     price: 5,  currency: 'vm' },
    { id: 'tutor_pshield',      name: 'TEACH: PINK SHIELD',   desc: 'Full one-hit damage block.',        price: 4,  currency: 'vm' },
    { id: 'tutor_novaburst',    name: 'TEACH: NOVA BURST',    desc: 'Bigger pink detonation for Eve.',   price: 6,  currency: 'vm' },
    { id: 'tutor_rain',         name: 'TEACH: PINK RAIN',     desc: 'Cosmic shard-fall for Eve.',        price: 5,  currency: 'vm' },
    { id: 'tutor_atomic',       name: 'TEACH: ATOMIC EDGE',   desc: 'Cosmic high-power for Eve.',        price: 8,  currency: 'vm' },
    { id: 'tutor_heal',         name: 'TEACH: HEALING PULSE', desc: '60% HP restore move for Eve.',      price: 7,  currency: 'vm' },
    { id: 'tutor_melt',         name: 'TEACH: MELTDOWN',      desc: 'BIO finisher for Eve.',             price: 12, currency: 'vm' }
  ],

  buffs: [
    // ----- MARK -----
    { id: 'm_hp_1',  name: 'MARK · HP +20',  desc: 'Permanent +20 max HP.',     price: 120, currency: 'gda', char: 'mark', stat: 'hp',  amt: 20 },
    { id: 'm_hp_2',  name: 'MARK · HP +40',  desc: 'Permanent +40 max HP.',     price: 300, currency: 'gda', char: 'mark', stat: 'hp',  amt: 40 },
    { id: 'm_ep_1',  name: 'MARK · EP +10',  desc: 'Permanent +10 max EP.',     price: 140, currency: 'gda', char: 'mark', stat: 'ep',  amt: 10 },
    { id: 'm_atk_1', name: 'MARK · ATK +3',  desc: 'Permanent +3 ATK.',         price: 200, currency: 'gda', char: 'mark', stat: 'atk', amt: 3  },
    { id: 'm_def_1', name: 'MARK · DEF +3',  desc: 'Permanent +3 DEF.',         price: 200, currency: 'gda', char: 'mark', stat: 'def', amt: 3  },

    // ----- EVE -----
    { id: 'e_hp_1',  name: 'EVE · HP +20',   desc: 'Permanent +20 max HP.',     price: 120, currency: 'gda', char: 'eve',  stat: 'hp',  amt: 20 },
    { id: 'e_hp_2',  name: 'EVE · HP +40',   desc: 'Permanent +40 max HP.',     price: 300, currency: 'gda', char: 'eve',  stat: 'hp',  amt: 40 },
    { id: 'e_ep_1',  name: 'EVE · EP +20',   desc: 'Permanent +20 max EP.',     price: 180, currency: 'gda', char: 'eve',  stat: 'ep',  amt: 20 },
    { id: 'e_atk_1', name: 'EVE · ATK +3',   desc: 'Permanent +3 ATK.',         price: 200, currency: 'gda', char: 'eve',  stat: 'atk', amt: 3  },
    { id: 'e_def_1', name: 'EVE · DEF +3',   desc: 'Permanent +3 DEF.',         price: 200, currency: 'gda', char: 'eve',  stat: 'def', amt: 3  },

    // ----- GLOBAL -----
    { id: 'g_crit',  name: 'GLOBAL · CRIT +5%',  desc: '+5% crit rate for the whole party.',  price: 6,  currency: 'vm', global: 'critRate', amt: 0.05 },
    { id: 'g_crit2', name: 'GLOBAL · CRIT +10%', desc: 'Another +10% crit rate.',             price: 12, currency: 'vm', global: 'critRate', amt: 0.10 },
    { id: 'g_xp_1',  name: 'GLOBAL · XP +25%',   desc: 'All XP gains +25%.',                  price: 8,  currency: 'vm', global: 'xpMult',   amt: 0.25 },
    { id: 'g_xp_2',  name: 'GLOBAL · XP +50%',   desc: 'Stack another +50% XP.',              price: 16, currency: 'vm', global: 'xpMult',   amt: 0.50 },
    { id: 'g_gda',   name: 'GLOBAL · GDA +25%',  desc: 'All GDA payouts +25%.',               price: 5,  currency: 'vm', global: 'gdaMult',  amt: 0.25 }
  ]
};
