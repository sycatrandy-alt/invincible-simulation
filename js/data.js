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
  finalWord:   { name: 'FINAL WORD',   type: 'COSMIC',   power: 110, ep: 30, desc: 'The fight ends here.' }
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
  }
};

// Enemies — each can have intro/mid/outro/phase dialogue
const ENEMIES = {
  omniman: {
    name: 'OMNI-BUNNY',
    sprite: 'assets/omniman.png',
    tag: 'VILTRUMITE',
    hp: 280, ep: 60, atk: 26, def: 20, spd: 18,
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
    hp: 140, ep: 30, atk: 16, def: 12, spd: 9,
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
    hp: 180, ep: 50, atk: 18, def: 10, spd: 9,
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
    hp: 200, ep: 40, atk: 16, def: 10, spd: 14,
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
    hp: 260, ep: 60, atk: 20, def: 14, spd: 15,
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
    hp: 450, ep: 100, atk: 28, def: 22, spd: 16,
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
  }
};

const SCENES = [
  { id: 's0', num: '00', title: 'OMNI-BUNNY (TUTORIAL)', desc: 'Your father. Your hero. Your first real fight.', enemy: 'omniman', recLvl: 1, scripted: true },
  { id: 's1', num: '01', title: 'MAULER TWINS', desc: 'They both insist they\'re the original.', enemy: 'mauler', recLvl: 2 },
  { id: 's2', num: '02', title: 'DOC SEISMIC', desc: 'The street is shaking. So is he.', enemy: 'seismic', recLvl: 4 },
  { id: 's3', num: '03', title: 'FLAXAN INVASION', desc: 'They come through fast. Hit faster.', enemy: 'flaxan', recLvl: 6 },
  { id: 's4', num: '04', title: 'ANGSTROM LEVY', desc: 'He remembers a thousand versions of you.', enemy: 'angstrom', recLvl: 9 },
  { id: 's5', num: '05', title: 'CONQUEST', desc: 'The fight that defines you.', enemy: 'conquest', recLvl: 14, boss: true }
];

const SHOP_DATA = {
  items: [
    { id: 'stim',    name: 'GDA STIM',    desc: 'Restore 50 HP in battle.', price: 50, currency: 'gda' },
    { id: 'patch',   name: 'AURA PATCH',  desc: 'Restore 30 HP + 10 EP.',   price: 80, currency: 'gda' },
    { id: 'revive',  name: 'REVIVE',      desc: 'Survive a lethal hit.',     price: 200, currency: 'gda' }
  ],
  suits: [
    { id: 'classic', name: 'CLASSIC BLUE', desc: 'OG suit. No stat change.',     price: 0,   currency: 'gda', owned: true },
    { id: 'black',   name: 'BLACK/GREY',   desc: 'Stealth tinted variant.',      price: 150, currency: 'gda' },
    { id: 'beaten',  name: 'BEAT-UP SUIT', desc: 'Survivor of the Conquest fight.', price: 500, currency: 'gda' }
  ],
  tutors: [
    { id: 'tutor_rage', name: 'TEACH: RAGE', desc: 'Teach Mark RAGE.', price: 5, currency: 'vm' },
    { id: 'tutor_burst',name: 'TEACH: BURST',desc: 'Teach Eve BURST.', price: 5, currency: 'vm' }
  ]
};
