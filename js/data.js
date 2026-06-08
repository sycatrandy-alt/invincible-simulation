// ╔════════════════════════════════════════════════════════════╗
// ║  PANCAKE BUNNY — RPG · v1.0                                ║
// ║  Three breakfast heroes vs the rest of the kitchen.        ║
// ╚════════════════════════════════════════════════════════════╝

const TYPES = {
  PHYSICAL: { name: 'PHYSICAL', color: '#ff6a3a' },
  ELECTRIC: { name: 'ELECTRIC', color: '#00f0ff' },   // re-skin of ENERGY
  BLAST:    { name: 'BLAST',    color: '#ff2bd6' },   // re-skin of COSMIC
  STEEL:    { name: 'STEEL',    color: '#34ff7a' },   // re-skin of TECH
  HEAL:     { name: 'HEAL',     color: '#9a6cff' },   // re-skin of BIO (used for healer moves)
  FOOD:     { name: 'FOOD',     color: '#ffd400' }    // re-skin of MENTAL — quirky food-based moves
};

// Tags the defender carries; the move's type vs defender's tag = multiplier.
const TAGS = {
  BREAKFAST: 'BREAKFAST',  // our heroes
  BURNT:     'BURNT',      // toast, charcoal, smoke
  DAIRY:     'DAIRY',      // milk, butter, yogurt
  METAL:     'METAL',      // appliances, utensils
  SUGAR:     'SUGAR',      // cereal, syrup, sweets
  GREASE:    'GREASE'      // bacon, eggs, oil
};

// Type chart — what each ATK type does to each DEFENDER tag
const TYPE_CHART = {
  PHYSICAL: { BREAKFAST: 1.0, BURNT: 1.25, DAIRY: 1.0,  METAL: 0.5,  SUGAR: 1.0,  GREASE: 1.0 },
  ELECTRIC: { BREAKFAST: 1.0, BURNT: 1.0,  DAIRY: 1.5,  METAL: 2.0,  SUGAR: 0.75, GREASE: 1.25 },
  BLAST:    { BREAKFAST: 1.25,BURNT: 0.5,  DAIRY: 1.5,  METAL: 1.5,  SUGAR: 1.5,  GREASE: 1.25 },
  STEEL:    { BREAKFAST: 1.0, BURNT: 1.0,  DAIRY: 1.25, METAL: 0.5,  SUGAR: 1.0,  GREASE: 1.0 },
  HEAL:     { BREAKFAST: 0.0, BURNT: 0.0,  DAIRY: 0.0,  METAL: 0.0,  SUGAR: 0.0,  GREASE: 0.0 }, // does no damage anyway
  FOOD:     { BREAKFAST: 1.5, BURNT: 0.75, DAIRY: 1.0,  METAL: 0.25, SUGAR: 1.5,  GREASE: 1.25 }
};

const MOVES = {
  // ===== PANCAKE BUNNY (ELECTRIC main) =====
  zap:          { name: 'ZAP',           type: 'ELECTRIC', power: 18, ep: 0,  desc: 'A light static jolt.' },
  shock:        { name: 'SHOCK',         type: 'ELECTRIC', power: 28, ep: 4,  desc: 'Localized arc of current.' },
  staticBurst:  { name: 'STATIC BURST',  type: 'ELECTRIC', power: 42, ep: 10, desc: 'Detonate every static fiber in the air.' },
  thunderkick:  { name: 'THUNDERKICK',   type: 'ELECTRIC', power: 36, ep: 8,  desc: 'Kick wreathed in lightning.' },
  overcharge:   { name: 'OVERCHARGE',    type: 'ELECTRIC', power: 60, ep: 18, desc: 'Pull current from the whole room.' },
  pancakeFlip:  { name: 'PANCAKE FLIP',  type: 'PHYSICAL', power: 32, ep: 6,  desc: 'Flip the enemy like a flapjack.' },
  thunderdome:  { name: 'THUNDERDOME',   type: 'ELECTRIC', power: 85, ep: 26, desc: 'Cage them in spheres of lightning.' },

  // ===== WAFFLE RABBIT (BLAST / glass cannon) =====
  toss:         { name: 'TOSS',          type: 'PHYSICAL', power: 16, ep: 0,  desc: 'A casual lobbed projectile.' },
  fuse:         { name: 'FUSE',          type: 'BLAST',    power: 26, ep: 5,  desc: 'Lit short fuse, primed for impact.' },
  boomCharge:   { name: 'BOOM CHARGE',   type: 'BLAST',    power: 48, ep: 12, desc: 'Run in fast, explode on contact.' },
  syrupSlick:   { name: 'SYRUP SLICK',   type: 'FOOD',     power: 28, ep: 8,  desc: 'Slick that ignites on impact.' },
  detonation:   { name: 'DETONATION',    type: 'BLAST',    power: 72, ep: 20, desc: 'Walk away from the explosion in slow-mo.' },
  waffleStorm:  { name: 'WAFFLE STORM',  type: 'BLAST',    power: 95, ep: 28, desc: 'Forty waffles, all on fire, raining down.' },

  // ===== BUTTA DAWG (HEALER) =====
  bonk:         { name: 'BONK',          type: 'PHYSICAL', power: 12, ep: 0,  desc: 'A friendly head-bonk.' },
  lickWound:    { name: 'LICK WOUND',    type: 'HEAL',     power: 0,  ep: 8,  desc: 'Restore 35% HP to active fighter.' },
  butterBath:   { name: 'BUTTER BATH',   type: 'HEAL',     power: 0,  ep: 20, desc: 'Coat the whole party in butter — heal everyone 50%.' },
  goodBoyAura:  { name: 'GOOD BOY AURA', type: 'FOOD',     power: 0,  ep: 10, desc: 'Buff party DEF for 3 turns.' },
  fetch:        { name: 'FETCH',         type: 'PHYSICAL', power: 24, ep: 4,  desc: 'Bring back something blunt and heavy.' },
  bark:         { name: 'BARK',          type: 'FOOD',     power: 35, ep: 8,  desc: 'A bark so loud it staggers them.' },
  bigBark:      { name: 'BIG BARK',      type: 'FOOD',     power: 64, ep: 18, desc: 'A bark that breaks ceramic.' },

  // ===== ENEMY MOVES =====
  crumble:      { name: 'CRUMBLE',       type: 'PHYSICAL', power: 18, ep: 0,  desc: 'Shed burnt crumbs at speed.' },
  scorch:       { name: 'SCORCH',        type: 'BLAST',    power: 28, ep: 6,  desc: 'A small house fire.' },
  drip:         { name: 'DRIP',          type: 'HEAL',     power: 0,  ep: 4,  desc: '(used by enemies to heal self)' },
  curdle:       { name: 'CURDLE',        type: 'FOOD',     power: 22, ep: 4,  desc: 'Spray sour clumps.' },
  rancid:       { name: 'RANCID',        type: 'FOOD',     power: 38, ep: 10, desc: 'Smell so bad it does damage.' },
  whiskCut:     { name: 'WHISK CUT',     type: 'STEEL',    power: 30, ep: 4,  desc: 'A blur of wire spokes.' },
  microwaveRay: { name: 'MICRO RAY',     type: 'ELECTRIC', power: 36, ep: 8,  desc: 'Cook from inside out.' },
  freezerBurn:  { name: 'FREEZER BURN',  type: 'STEEL',    power: 32, ep: 6,  desc: 'Cold-bite damage.' },
  flameBurst:   { name: 'FLAME BURST',   type: 'BLAST',    power: 50, ep: 14, desc: 'Open flame from below.' },

  // ===== BOSS MOVES =====
  cerealStorm:  { name: 'CEREAL STORM',  type: 'FOOD',     power: 55, ep: 14, desc: 'A box poured over your head.' },
  fridgeSlam:   { name: 'FRIDGE SLAM',   type: 'STEEL',    power: 70, ep: 18, desc: 'Tip the entire fridge onto you.' },
  pyrolysis:    { name: 'PYROLYSIS',     type: 'BLAST',    power: 80, ep: 22, desc: 'Burn the oxygen out of the air.' },
  motherKnows:  { name: 'MOTHER KNOWS',  type: 'FOOD',     power: 110,ep: 30, desc: 'A look so disappointed it does damage.' },
  putItDown:    { name: 'PUT IT DOWN',   type: 'PHYSICAL', power: 95, ep: 24, desc: 'She takes the game from your paws.' },
  bedtimeNow:   { name: 'BEDTIME NOW',   type: 'FOOD',     power: 130,ep: 36, desc: 'The final word. The lights go out.' }
};

const UTILITIES = {
  charge:    { name: 'CHARGE',    desc: 'Boost ATK for 3 turns.',     ep: 6,  effect: 'buff_atk' },
  ground:    { name: 'GROUND',    desc: 'Boost DEF for 3 turns.',     ep: 6,  effect: 'buff_def' },
  patchUp:   { name: 'PATCH UP',  desc: 'Restore 40% HP.',            ep: 12, effect: 'heal' },
  focus:     { name: 'FOCUS',     desc: 'Restore 20 EP.',             ep: 0,  effect: 'restore_ep' },
  intimidate:{ name: 'INTIMIDATE',desc: 'Drop enemy ATK.',            ep: 6,  effect: 'debuff_atk' }
};

const CHARACTERS = {
  pancake: {
    id: 'pancake',
    name: 'PANCAKE BUNNY',
    sprite: 'assets/pancake.png',
    tag: 'BREAKFAST',
    baseHP: 80, baseEP: 40,
    baseATK: 15, baseDEF: 12, baseSPD: 14,
    bio: 'The leader. Static everywhere. Always tasting metal.',
    moveset: [
      { lvl: 1, move: 'zap' },
      { lvl: 1, move: 'shock' },
      { lvl: 3, move: 'pancakeFlip' },
      { lvl: 5, move: 'thunderkick' },
      { lvl: 8, move: 'staticBurst' },
      { lvl: 12, move: 'overcharge' },
      { lvl: 16, move: 'thunderdome' }
    ],
    utilities: ['charge', 'focus']
  },
  waffle: {
    id: 'waffle',
    name: 'WAFFLE RABBIT',
    sprite: 'assets/waffle.png',
    tag: 'BREAKFAST',
    baseHP: 65, baseEP: 50,
    baseATK: 18, baseDEF: 8, baseSPD: 15,
    bio: 'Wears the waffle. Hides the fuses underneath.',
    moveset: [
      { lvl: 1, move: 'toss' },
      { lvl: 1, move: 'fuse' },
      { lvl: 3, move: 'boomCharge' },
      { lvl: 6, move: 'syrupSlick' },
      { lvl: 10, move: 'detonation' },
      { lvl: 15, move: 'waffleStorm' }
    ],
    utilities: ['charge', 'intimidate']
  },
  butta: {
    id: 'butta',
    name: 'BUTTA DAWG',
    sprite: 'assets/butta.png',
    tag: 'BREAKFAST',
    baseHP: 90, baseEP: 60,
    baseATK: 10, baseDEF: 14, baseSPD: 11,
    bio: 'Pat of butter on his head. Heals so hard it counts as offense.',
    moveset: [
      { lvl: 1, move: 'bonk' },
      { lvl: 1, move: 'lickWound' },
      { lvl: 3, move: 'goodBoyAura' },
      { lvl: 5, move: 'fetch' },
      { lvl: 8, move: 'bark' },
      { lvl: 12, move: 'butterBath' },
      { lvl: 16, move: 'bigBark' }
    ],
    utilities: ['patchUp', 'ground', 'focus']
  }
};

const ENEMIES = {
  // ============ TUTORIAL ============
  toast: {
    name: 'BURNT TOAST',
    sprite: 'assets/toast.png',
    tag: 'BURNT',
    hp: 60, ep: 20, atk: 12, def: 8, spd: 6,
    slowChance: 0.2,
    moves: ['crumble', 'scorch'],
    intro: 'A piece of BURNT TOAST stands up. It smells terrible.',
    midHpDialogue: [
      { at: 0.5, text: 'TOAST: "I was forgotten in the toaster TWICE."' }
    ],
    xp: 50, butter: 35
  },
  milk: {
    name: 'SPOILED MILK',
    sprite: 'assets/milk.png',
    tag: 'DAIRY',
    hp: 90, ep: 30, atk: 14, def: 10, spd: 8,
    slowChance: 0.15,
    canHeal: true, healAmount: 20, healThreshold: 0.5, healChance: 0.2,
    healDialogue: 'MILK: "I curdle. I reform. The cycle continues."',
    moves: ['curdle', 'rancid'],
    intro: 'SPOILED MILK sloshes forward. The fumes already hurt.',
    midHpDialogue: [
      { at: 0.4, text: 'MILK: "Expiration date? I never knew her."' }
    ],
    xp: 80, butter: 60
  },
  whisk: {
    name: 'THE WHISK',
    sprite: 'assets/waffle.png',
    tag: 'METAL',
    hp: 110, ep: 25, atk: 18, def: 9, spd: 16,
    slowChance: 0.05,
    moves: ['whiskCut', 'crumble'],
    intro: 'THE WHISK spins itself awake. Wire spokes flare out.',
    midHpDialogue: [
      { at: 0.5, text: 'THE WHISK whirls faster, slicing the air.' }
    ],
    xp: 110, butter: 90
  },
  microwave: {
    name: 'MICROWAVE',
    sprite: 'assets/microwave.png',
    tag: 'METAL',
    hp: 160, ep: 60, atk: 18, def: 14, spd: 8,
    slowChance: 0.2,
    moves: ['microwaveRay', 'whiskCut', 'flameBurst'],
    intro: 'MICROWAVE: "*30 SECONDS REMAINING.*"',
    midHpDialogue: [
      { at: 0.5, text: 'MICROWAVE: "*REHEAT MODE.*"' },
      { at: 0.2, text: 'MICROWAVE: "*ARC FAULT DETECTED.*"' }
    ],
    xp: 150, butter: 130
  },
  fridge: {
    name: 'THE FRIDGE',
    sprite: 'assets/fridge.png',
    tag: 'METAL',
    hp: 240, ep: 70, atk: 20, def: 22, spd: 5,
    slowChance: 0.3,
    canHeal: true, healAmount: 35, healThreshold: 0.4, healChance: 0.25,
    healDialogue: 'FRIDGE: "Self-defrost cycle complete." (Damage seals over.)',
    moves: ['fridgeSlam', 'freezerBurn', 'crumble'],
    intro: 'THE FRIDGE looms. The motor hum is hostile.',
    midHpDialogue: [
      { at: 0.5, text: 'FRIDGE: "Door alarm. DOOR ALARM."' },
      { at: 0.2, text: 'FRIDGE: "WARRANTY VOID. UPGRADING TO COMBAT MODE."' }
    ],
    xp: 240, butter: 200
  },
  // ============ MINI BOSS ============
  cereal: {
    name: 'CEREAL KILLER',
    sprite: 'assets/cereal.png',
    tag: 'SUGAR',
    hp: 320, ep: 90, atk: 24, def: 14, spd: 12,
    slowChance: 0.15,
    moves: ['cerealStorm', 'crumble', 'rancid', 'curdle'],
    intro: 'CEREAL KILLER tips a hundred boxes over the floor. "BREAKFAST IS SERVED."',
    midHpDialogue: [
      { at: 0.5, text: 'CEREAL KILLER: "You\'re missing the marshmallows on purpose, aren\'t you."' },
      { at: 0.2, text: 'CEREAL KILLER: "FINE. THE MASCOTS DIE WITH ME."' }
    ],
    xp: 340, butter: 300
  },
  // ============ BOSS ============
  stove: {
    name: 'STOVE LORD',
    sprite: 'assets/stove.png',
    tag: 'METAL',
    hp: 450, ep: 120, atk: 30, def: 22, spd: 9,
    slowChance: 0.2,
    canHeal: true, healAmount: 60, healThreshold: 0.35, healChance: 0.3,
    healDialogue: 'STOVE LORD: "The pilot light NEVER dies." (Burners reignite, wounds close.)',
    moves: ['pyrolysis', 'flameBurst', 'microwaveRay'],
    intro: 'STOVE LORD: "I have COOKED for generations of this house. Who are YOU to interrupt breakfast?"',
    midHpDialogue: [
      { at: 0.6, text: 'STOVE LORD: "All four burners. HIGH."' },
      { at: 0.3, text: 'STOVE LORD: "The OVEN was a SUGGESTION. Now it\'s INEVITABLE."' }
    ],
    xp: 500, butter: 450
  },
  // ============ FINAL BOSS ============
  mama: {
    name: 'MAMA BUNNY',
    sprite: 'assets/mama.png',
    tag: 'BREAKFAST',
    hp: 750, ep: 180, atk: 36, def: 26, spd: 10,
    slowChance: 0.18,
    canHeal: true, healAmount: 85, healThreshold: 0.3, healChance: 0.3,
    healDialogue: 'MAMA BUNNY: "I raised you. Did you think you could END me?" (She heals.)',
    moves: ['motherKnows', 'putItDown', 'cerealStorm'],
    intro: 'MAMA BUNNY: "Sweetie. It\'s time to PUT THE GAME DOWN."',
    phases: [
      {
        threshold: 1.0,
        text: 'MAMA BUNNY: "Just one fight. Then dinner."',
        moves: ['motherKnows', 'cerealStorm', 'putItDown']
      },
      {
        threshold: 0.55,
        text: 'MAMA BUNNY: "I said. PUT. IT. DOWN."',
        moves: ['putItDown', 'motherKnows', 'pyrolysis', 'cerealStorm'],
        atkBuff: 5
      },
      {
        threshold: 0.22,
        text: 'MAMA BUNNY pulls out HER mom\'s wooden spoon. "I love you. Goodnight."',
        moves: ['bedtimeNow', 'motherKnows', 'putItDown'],
        atkBuff: 10, spdBuff: 5
      }
    ],
    xp: 900, butter: 800
  }
};

const SCENES = [
  { region: 'kitchen', id: 'k0', num: '00', title: 'BURNT TOAST',    desc: 'It crawled out of the toaster. Show it the door.',    enemy: 'toast',     recLvl: 1 },
  { region: 'kitchen', id: 'k1', num: '01', title: 'SPOILED MILK',   desc: 'Past expiration. Past reason.',                       enemy: 'milk',      recLvl: 3 },
  { region: 'kitchen', id: 'k2', num: '02', title: 'THE WHISK',      desc: 'Wire-fast. Hard to track. Easy to bend.',             enemy: 'whisk',     recLvl: 5 },
  { region: 'kitchen', id: 'k3', num: '03', title: 'MICROWAVE',      desc: 'Beeping the war drum.',                               enemy: 'microwave', recLvl: 7 },
  { region: 'kitchen', id: 'k4', num: '04', title: 'THE FRIDGE',     desc: 'It hums hostility.',                                  enemy: 'fridge',    recLvl: 9 },
  { region: 'kitchen', id: 'k5', num: '05', title: 'CEREAL KILLER',  desc: 'A mascot-fueled stand-off.',                          enemy: 'cereal',    recLvl: 11, boss: true },
  { region: 'kitchen', id: 'k6', num: '06', title: 'STOVE LORD',     desc: 'Four burners. One judgment.',                         enemy: 'stove',     recLvl: 14, boss: true },
  { region: 'kitchen', id: 'k7', num: '07', title: 'MAMA BUNNY',     desc: 'She just wants you to come to the table.',            enemy: 'mama',      recLvl: 17, boss: true }
];

const SHOP_DATA = {
  items: [
    // ----- HEALING (BUTTER) -----
    { id: 'crumb',       name: 'CRUMB',           desc: 'Restore 40 HP in battle.',       price: 40,  currency: 'butter' },
    { id: 'pat',         name: 'PAT OF BUTTER',   desc: 'Restore 75 HP.',                 price: 90,  currency: 'butter' },
    { id: 'stack',       name: 'PANCAKE STACK',   desc: 'Restore 150 HP.',                price: 180, currency: 'butter' },
    { id: 'feast',       name: 'BREAKFAST FEAST', desc: 'Fully restore HP.',              price: 320, currency: 'butter' },

    // ----- EP -----
    { id: 'spark',       name: 'SPARK',           desc: 'Restore 25 EP.',                 price: 60,  currency: 'butter' },
    { id: 'jolt',        name: 'JOLT',            desc: 'Restore 50 EP.',                 price: 120, currency: 'butter' },
    { id: 'capacitor',   name: 'CAPACITOR',       desc: 'Fully restore EP.',              price: 250, currency: 'butter' },

    // ----- COMBAT -----
    { id: 'energy_drink',name: 'ENERGY DRINK',    desc: '+ATK for 3 turns.',              price: 130, currency: 'butter' },
    { id: 'bacon_grease',name: 'BACON GREASE',    desc: '+DEF for 3 turns.',              price: 130, currency: 'butter' },
    { id: 'syrup_charge',name: 'SYRUP CHARGE',    desc: 'Next move deals 2x damage.',     price: 200, currency: 'butter' },
    { id: 'cloak',       name: 'NAPKIN CLOAK',    desc: 'Dodge next enemy hit.',          price: 140, currency: 'butter' },

    // ----- DAMAGE ITEMS -----
    { id: 'firecracker', name: 'FIRECRACKER',     desc: 'Deal 70 fixed damage.',          price: 160, currency: 'butter' },
    { id: 'm80',         name: 'M-80',            desc: 'Deal 130 fixed damage.',         price: 280, currency: 'butter' },

    // ----- DEFENSE -----
    { id: 'second_chance',name: 'SECOND CHANCE',  desc: 'Survive a fatal blow.',          price: 220, currency: 'butter' },
    { id: 'phoenix_yolk', name: 'PHOENIX YOLK',   desc: 'Auto-revive at 80% HP.',         price: 500, currency: 'butter' },

    // ----- PREMIUM (SYRUP) -----
    { id: 'field_kit',   name: 'FIELD BREAKFAST', desc: 'Full party HP+EP restore.',      price: 4,   currency: 'syrup' },
    { id: 'time_chip',   name: 'TIME CHIP',       desc: 'Take an extra turn this round.', price: 6,   currency: 'syrup' }
  ],

  tutors: [
    // ----- PANCAKE BUNNY -----
    { id: 'tutor_overcharge',name: 'TEACH: OVERCHARGE',  desc: 'Heavy ELECTRIC for Pancake.',  price: 5,  currency: 'syrup' },
    { id: 'tutor_thunderdome',name: 'TEACH: THUNDERDOME',desc: 'Massive ELECTRIC finisher.',   price: 9,  currency: 'syrup' },
    { id: 'tutor_pancakeFlip',name: 'TEACH: PANCAKE FLIP',desc: 'Physical disruptor for Pancake.',price: 3, currency: 'syrup' },

    // ----- WAFFLE RABBIT -----
    { id: 'tutor_detonation',name: 'TEACH: DETONATION',  desc: 'Heavy BLAST for Waffle.',      price: 6,  currency: 'syrup' },
    { id: 'tutor_waffleStorm',name: 'TEACH: WAFFLE STORM',desc: 'Forty flaming waffles. For Waffle.',price: 10, currency: 'syrup' },
    { id: 'tutor_syrupSlick',name: 'TEACH: SYRUP SLICK', desc: 'Combo setup for Waffle.',      price: 4,  currency: 'syrup' },

    // ----- BUTTA DAWG -----
    { id: 'tutor_butterBath',name: 'TEACH: BUTTER BATH', desc: 'Party-wide heal for Butta.',   price: 7,  currency: 'syrup' },
    { id: 'tutor_bigBark',    name: 'TEACH: BIG BARK',    desc: 'Heavy FOOD damage for Butta.',  price: 8, currency: 'syrup' },
    { id: 'tutor_goodBoyAura',name: 'TEACH: GOOD BOY AURA',desc: 'Party DEF buff for Butta.',   price: 4,  currency: 'syrup' }
  ],

  upgrades: [
    // ----- PANCAKE BUNNY -----
    { id: 'p_hp1',  name: 'PANCAKE · HP +20',  desc: 'Permanent +20 max HP.',  price: 120, currency: 'butter', char: 'pancake', stat: 'hp',  amt: 20 },
    { id: 'p_hp2',  name: 'PANCAKE · HP +40',  desc: 'Permanent +40 max HP.',  price: 300, currency: 'butter', char: 'pancake', stat: 'hp',  amt: 40 },
    { id: 'p_ep1',  name: 'PANCAKE · EP +10',  desc: 'Permanent +10 max EP.',  price: 140, currency: 'butter', char: 'pancake', stat: 'ep',  amt: 10 },
    { id: 'p_atk1', name: 'PANCAKE · ATK +3',  desc: 'Permanent +3 ATK.',      price: 200, currency: 'butter', char: 'pancake', stat: 'atk', amt: 3  },
    { id: 'p_def1', name: 'PANCAKE · DEF +3',  desc: 'Permanent +3 DEF.',      price: 200, currency: 'butter', char: 'pancake', stat: 'def', amt: 3  },

    // ----- WAFFLE RABBIT -----
    { id: 'w_hp1',  name: 'WAFFLE · HP +20',   desc: 'Permanent +20 max HP.',  price: 120, currency: 'butter', char: 'waffle',  stat: 'hp',  amt: 20 },
    { id: 'w_hp2',  name: 'WAFFLE · HP +40',   desc: 'Permanent +40 max HP.',  price: 300, currency: 'butter', char: 'waffle',  stat: 'hp',  amt: 40 },
    { id: 'w_ep1',  name: 'WAFFLE · EP +15',   desc: 'Permanent +15 max EP.',  price: 160, currency: 'butter', char: 'waffle',  stat: 'ep',  amt: 15 },
    { id: 'w_atk1', name: 'WAFFLE · ATK +4',   desc: 'Permanent +4 ATK.',      price: 230, currency: 'butter', char: 'waffle',  stat: 'atk', amt: 4  },
    { id: 'w_def1', name: 'WAFFLE · DEF +3',   desc: 'Permanent +3 DEF.',      price: 200, currency: 'butter', char: 'waffle',  stat: 'def', amt: 3  },

    // ----- BUTTA DAWG -----
    { id: 'b_hp1',  name: 'BUTTA · HP +25',    desc: 'Permanent +25 max HP.',  price: 130, currency: 'butter', char: 'butta',   stat: 'hp',  amt: 25 },
    { id: 'b_hp2',  name: 'BUTTA · HP +50',    desc: 'Permanent +50 max HP.',  price: 320, currency: 'butter', char: 'butta',   stat: 'hp',  amt: 50 },
    { id: 'b_ep1',  name: 'BUTTA · EP +20',    desc: 'Permanent +20 max EP.',  price: 180, currency: 'butter', char: 'butta',   stat: 'ep',  amt: 20 },
    { id: 'b_def1', name: 'BUTTA · DEF +4',    desc: 'Permanent +4 DEF.',      price: 240, currency: 'butter', char: 'butta',   stat: 'def', amt: 4  },

    // ----- GLOBAL (SYRUP) -----
    { id: 'g_crit1', name: 'GLOBAL · CRIT +5%', desc: 'Party crit rate +5%.',     price: 6,  currency: 'syrup', global: 'critRate', amt: 0.05 },
    { id: 'g_crit2', name: 'GLOBAL · CRIT +10%',desc: 'Another +10% crit rate.',  price: 12, currency: 'syrup', global: 'critRate', amt: 0.10 },
    { id: 'g_xp1',   name: 'GLOBAL · XP +25%',  desc: 'All XP gains +25%.',       price: 8,  currency: 'syrup', global: 'xpMult',   amt: 0.25 },
    { id: 'g_xp2',   name: 'GLOBAL · XP +50%',  desc: 'Stack another +50% XP.',   price: 16, currency: 'syrup', global: 'xpMult',   amt: 0.50 },
    { id: 'g_butter',name: 'GLOBAL · BUTTER +25%',desc: 'All BUTTER payouts +25%.',price: 5,  currency: 'syrup', global: 'butterMult',amt: 0.25 }
  ],

  blueprints: [
    // Rare late-game blueprints — unlock effects or persistent boons
    { id: 'bp_bench_aura',  name: 'BENCH AURA',     desc: 'Bench fighters regen 6% HP/turn instead of 3%.',     price: 12, currency: 'syrup', global: 'benchRegen', amt: 0.03 },
    { id: 'bp_starter_kit', name: 'STARTER KIT',    desc: 'Start every battle with one CRUMB in your bag.',     price: 8,  currency: 'syrup', perk: 'starter_crumb' },
    { id: 'bp_third_seat',  name: 'THIRD SEAT',     desc: 'Allow a third party member in battle (3-fighter mode).',price: 20, currency: 'syrup', perk: 'three_fighter' },
    { id: 'bp_crit_dmg',    name: 'CRIT DAMAGE +50%',desc: 'Critical hits now do 2.0x instead of 1.5x.',         price: 14, currency: 'syrup', global: 'critDmg', amt: 0.5 },
    { id: 'bp_revive_cheap',name: 'CHEAP YOLK',     desc: 'PHOENIX YOLK costs 350 BUTTER instead of 500.',      price: 6,  currency: 'syrup', perk: 'phoenix_discount' }
  ]
};
