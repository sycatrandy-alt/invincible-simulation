// INVINCIBLE: SIMULATION — main shell, menus, save state

const Game = (() => {
  const SAVE_KEY = 'pancake_bunny_rpg_save_v3';

  const defaultState = () => ({
    butter: 100,
    syrup: 5,
    bag: { crumb: 2 },
    boughtUpgrades: {},
    boughtBlueprints: {},
    perks: {},
    chars: {
      pancake: { id: 'pancake', level: 1, xp: 0, moves: ['zap', 'shock'] },
      waffle:  { id: 'waffle',  level: 1, xp: 0, moves: ['toss', 'fuse'] },
      butta:   { id: 'butta',   level: 1, xp: 0, moves: ['bonk', 'lickWound'] }
    },
    roster: ['pancake', 'waffle', 'butta'],
    permaBuffs: {
      pancake: { hp: 0, ep: 0, atk: 0, def: 0 },
      waffle:  { hp: 0, ep: 0, atk: 0, def: 0 },
      butta:   { hp: 0, ep: 0, atk: 0, def: 0 },
      global:  { critRate: 0, xpMult: 1, butterMult: 1, critDmg: 0, benchRegen: 0 }
    },
    scenesDone: {},                                       // keyed as `${difficulty}:${sceneId}`
    currentScene: null,
    currentRegion: 'kitchen',
    difficulty: 'easy',
    unlockedDifficulties: ['easy'],                       // 'easy','normal','hard','master','impossible'
    storyBeats: {},
    settings: { speed: 2, text: 30, blood: 'comic', shake: true, vol: 70 }
  });

  // Difficulty multipliers — enemy stat boost + reward boost
  const DIFFICULTY = {
    easy:       { name: 'EASY',       enemy: 0.80, atk: 0.85, reward: 0.75, color: '#34ff9a' },
    normal:     { name: 'NORMAL',     enemy: 1.00, atk: 1.00, reward: 1.00, color: '#00e5ff' },
    hard:       { name: 'HARD',       enemy: 1.35, atk: 1.20, reward: 1.50, color: '#ffd400' },
    master:     { name: 'MASTER',     enemy: 1.75, atk: 1.45, reward: 2.25, color: '#ff8a3a' },
    impossible: { name: 'IMPOSSIBLE', enemy: 2.40, atk: 1.80, reward: 3.50, color: '#ff2f4f' }
  };
  const DIFF_ORDER = ['easy','normal','hard','master','impossible'];

  function getDifficulty() { return DIFFICULTY[state.difficulty] || DIFFICULTY.easy; }
  function difficultyKey(sceneId) { return state.difficulty + ':' + sceneId; }
  function unlockNextDifficulty() {
    const i = DIFF_ORDER.indexOf(state.difficulty);
    const next = DIFF_ORDER[i + 1];
    if (next && !state.unlockedDifficulties.includes(next)) {
      state.unlockedDifficulties.push(next);
      return next;
    }
    return null;
  }

  function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    for (const k in source) {
      const sv = source[k];
      if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
        target[k] = deepMerge(target[k] && typeof target[k] === 'object' ? target[k] : {}, sv);
      } else {
        target[k] = sv;
      }
    }
    return target;
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return deepMerge(defaultState(), JSON.parse(raw));
    } catch (e) {}
    return defaultState();
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
    updateHud();
  }

  function updateHud() {
    const el = document.getElementById('credits-display');
    if (el) el.textContent = `BUTTER: ${state.butter}  |  SYRUP: ${state.syrup}`;
    const sc = document.getElementById('shop-credits');
    if (sc) sc.textContent = `BUTTER: ${state.butter} · SYRUP: ${state.syrup}`;
  }

  function xpForNext(lvl) { return 80 + lvl * 70; }

  function gainXP(charId, amount) {
    const c = state.chars[charId];
    const mult = state.permaBuffs?.global?.xpMult || 1;
    amount = Math.floor(amount * mult);
    c.xp += amount;
    let leveled = false;
    while (c.xp >= xpForNext(c.level)) {
      c.xp -= xpForNext(c.level);
      c.level++;
      leveled = true;
      // queue any new moves
      const newMoves = CHARACTERS[charId].moveset.filter(m => m.lvl === c.level);
      newMoves.forEach(nm => {
        if (!c.moves.includes(nm.move)) {
          if (c.moves.length < 4) c.moves.push(nm.move);
          else queueLearn(charId, nm.move);
        }
      });
    }
    return leveled;
  }

  const pendingLearns = [];
  function queueLearn(charId, moveId) { pendingLearns.push({ charId, moveId }); }
  function hasPendingLearn() { return pendingLearns.length > 0; }
  function consumeLearn() { return pendingLearns.shift() || null; }

  function markSceneWon(sceneId) {
    if (!sceneId) return null;
    state.scenesDone[difficultyKey(sceneId)] = true;
    // Final scene on current difficulty → unlock next
    if (sceneId === 'k7') return unlockNextDifficulty();
    return null;
  }
  function isSceneDone(sceneId) {
    return !!state.scenesDone[difficultyKey(sceneId)];
  }

  return {
    get state() { return state; },
    save, gainXP, xpForNext,
    markSceneWon, isSceneDone,
    hasPendingLearn, consumeLearn, queueLearn,
    updateHud,
    getDifficulty, difficultyKey, unlockNextDifficulty,
    DIFFICULTY, DIFF_ORDER
  };
})();

// ============ STORY ============
const STORY = {
  intro: {
    chapter: 'CHAPTER 0',
    title: 'BREAKFAST AT EIGHT',
    body: `The microwave had been threatening for weeks. The toast came back wrong. Spoiled milk in the fridge \nstarted answering when you talked to it.

Three of you lived here. <em>Pancake Bunny</em> — the loud one, fingers always sparking. <em>Waffle Rabbit</em> — twitchy, smelled like a fuse. \nAnd <em>Butta Dawg</em>, who patched everyone up.

Today the kitchen revolted. <strong>You eat first, or you get eaten.</strong>`
  },
  kitchen_done: {
    chapter: 'INTERLUDE',
    title: 'THE BACK DOOR',
    body: `Mama Bunny is down. The kitchen quiet again. Coffee Pot whistles a victory chord, then is silent.

You hear a sound from the <em>backyard</em>. Glass cracking? A portal humming? A cat sneezing?

The screen door swings open on its own.

You step <strong>OUTSIDE</strong>.`
  },
  outside_done: {
    chapter: 'EPILOGUE',
    title: 'A LITTLE PEACE',
    body: `The yard is yours. Mauler Cats high-fived you both before passing out. Old Cat went back to his nap.

Tomorrow the toaster will be fine. The fridge will hum a normal hum. The waffles will be just waffles.

For now: <strong>breakfast.</strong>`
  }
};

function showStory(beatKey, onContinue) {
  const beat = STORY[beatKey];
  if (!beat) { if (onContinue) onContinue(); return; }
  if (Game.state.storyBeats[beatKey]) { if (onContinue) onContinue(); return; }
  Game.state.storyBeats[beatKey] = true;
  Game.save();
  document.getElementById('story-chapter').textContent = beat.chapter;
  document.getElementById('story-title').textContent = beat.title;
  document.getElementById('story-body').innerHTML = beat.body;
  Router.go('story');
  document.getElementById('story-continue').onclick = () => {
    if (onContinue) onContinue();
    else Router.go('menu');
  };
}

// ============ ROUTER / UI ============

const Router = (() => {
  function go(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('screen-' + name);
    if (target) target.classList.add('active');
    if (name === 'play') renderScenes();
    if (name === 'shop') { renderShop('items'); }
    if (name === 'menu') Game.updateHud();

    // Only stop music here. Starting the right track is handled by Battle.start
    // (it has the actual enemy info — Router doesn't).
    if (name !== 'battle') {
      ['battle-bgm', 'conquest-bgm', 'thragg-bgm'].forEach(id => {
        const a = document.getElementById(id);
        if (a) { a.pause(); a.currentTime = 0; }
      });
    }
  }
  return { go };
})();

function renderScenes() {
  const list = document.getElementById('scene-list');
  list.innerHTML = '';

  // Difficulty selector
  const diffBar = document.createElement('div');
  diffBar.className = 'diff-bar';
  diffBar.innerHTML = Game.DIFF_ORDER.map(d => {
    const def = Game.DIFFICULTY[d];
    const unlocked = Game.state.unlockedDifficulties.includes(d);
    const active = Game.state.difficulty === d;
    return `<button class="diff-btn ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}"
              data-diff="${d}" style="--diff-color:${def.color}">
              ${unlocked ? '' : '🔒 '}${def.name}
            </button>`;
  }).join('');
  diffBar.querySelectorAll('.diff-btn').forEach(b => {
    b.addEventListener('click', () => {
      if (b.classList.contains('locked')) {
        flashDialogue('Beat MAMA BUNNY on a lower difficulty first.');
        return;
      }
      Game.state.difficulty = b.dataset.diff;
      Game.save();
      renderScenes();
    });
  });
  list.appendChild(diffBar);

  // Region tab bar — OUTSIDE unlocks after beating Mama Bunny (k7) on any difficulty
  const outsideUnlocked = !!Object.keys(Game.state.scenesDone).find(k => k.endsWith(':k7'));
  const tabs = document.createElement('div');
  tabs.className = 'region-tabs';
  const cur = Game.state.currentRegion;
  tabs.innerHTML = `
    <button class="region-tab ${cur === 'kitchen' ? 'active' : ''}" data-region="kitchen">🍳 KITCHEN</button>
    <button class="region-tab ${cur === 'outside' ? 'active' : ''} ${outsideUnlocked ? '' : 'locked'}" data-region="outside">🌳 OUTSIDE ${outsideUnlocked ? '' : '· LOCKED'}</button>
  `;
  tabs.querySelectorAll('.region-tab').forEach(t => {
    t.addEventListener('click', () => {
      if (t.classList.contains('locked')) {
        flashDialogue('Defeat MAMA BUNNY to unlock OUTSIDE.');
        return;
      }
      Game.state.currentRegion = t.dataset.region;
      Game.save();
      renderScenes();
    });
  });
  list.appendChild(tabs);

  // Scene grid for current region (difficulty-aware)
  const grid = document.createElement('div');
  grid.className = 'scene-grid';
  const currentDiffIdx = Game.DIFF_ORDER.indexOf(Game.state.difficulty);
  const regionScenes = SCENES.filter(s => {
    if (s.region !== Game.state.currentRegion) return false;
    if (s.minDifficulty) {
      const reqIdx = Game.DIFF_ORDER.indexOf(s.minDifficulty);
      if (currentDiffIdx < reqIdx) return false;
    }
    return true;
  });
  regionScenes.forEach((sc, i) => {
    const done = Game.isSceneDone(sc.id);
    // Bonus scenes (b1..b4) don't gate on previous bonus — they unlock once you've cleared k7 on a lower difficulty
    let isUnlocked;
    if (sc.id.startsWith('b')) isUnlocked = Game.isSceneDone('k7') || sc.minDifficulty === Game.state.difficulty;
    else isUnlocked = i === 0 || Game.isSceneDone(regionScenes[i-1].id);
    const card = document.createElement('div');
    card.className = 'scene-card' + (isUnlocked ? '' : ' locked');
    let badge = '';
    if (done) badge = '<div class="badge done">DONE</div>';
    else if (sc.boss) badge = '<div class="badge boss">BOSS</div>';
    else if (!isUnlocked) badge = '<div class="badge">LOCKED</div>';
    card.innerHTML = `
      ${badge}
      <div class="num">SCENE ${sc.num} · Rec Lv ${sc.recLvl}</div>
      <div class="title-s">${sc.title}</div>
      <div class="desc">${sc.desc}</div>
    `;
    if (isUnlocked) card.onclick = () => startScene(sc);
    grid.appendChild(card);
  });
  list.appendChild(grid);
}

function startScene(sc) {
  Game.state.currentScene = sc.id;
  if (sc.forceCharacter) {
    launchBattle(sc, [sc.forceCharacter]);
  } else {
    renderCharSelect(sc);
    Router.go('select');
  }
}

let selectStarter = null; // sticky pick within character select screen

function renderCharSelect(sc, starterId) {
  const roster = Game.state.roster || ['mark', 'eve'];
  selectStarter = starterId || null;
  const labelEl = document.getElementById('select-scene-label');

  if (roster.length === 1) {
    labelEl.textContent = `SCENE ${sc.num} · ${sc.title}`;
  } else if (!selectStarter) {
    labelEl.textContent = `SCENE ${sc.num} · ${sc.title} — Pick your STARTER`;
  } else {
    const starterName = CHARACTERS[selectStarter].name;
    labelEl.textContent = `STARTER: ${starterName} — Now pick BENCH (or click the same again to go solo)`;
  }

  const grid = document.getElementById('select-grid');
  grid.innerHTML = '';
  roster.forEach(id => {
    const ch = CHARACTERS[id];
    if (!ch) return;
    const save = Game.state.chars[id];
    const card = document.createElement('div');
    card.className = 'fighter-card' + (selectStarter === id ? ' picked' : '');
    const tag = selectStarter === id ? '<div class="picked-tag">STARTER</div>' : '';
    card.innerHTML = `
      ${tag}
      <img src="${ch.sprite}" alt="${ch.name}" />
      <div class="fname">${ch.name}</div>
      <div class="ftag">${ch.tag} · Lv ${save.level}</div>
      <div class="fbio">${ch.bio}</div>
      <div class="fstat">
        <span>HP ${Math.floor(ch.baseHP * (1 + (save.level - 1) * 0.12))}</span>
        <span>ATK ${Math.floor(ch.baseATK * (1 + (save.level - 1) * 0.12))}</span>
        <span>DEF ${Math.floor(ch.baseDEF * (1 + (save.level - 1) * 0.12))}</span>
      </div>
    `;
    card.onclick = () => {
      if (roster.length === 1) { launchBattle(sc, [id]); return; }
      if (!selectStarter) {
        // first pick → highlight as starter
        if (roster.length === 2) {
          // Only 2 in roster: auto-bench the other immediately
          const other = roster.find(r => r !== id);
          launchBattle(sc, [id, other]);
        } else {
          renderCharSelect(sc, id);
        }
      } else if (selectStarter === id) {
        // Same card clicked twice → go solo (no bench)
        launchBattle(sc, [id]);
      } else {
        // second pick → bench
        launchBattle(sc, [selectStarter, id]);
      }
    };
    grid.appendChild(card);
  });
}

function launchBattle(sc, partyIds) {
  Router.go('battle');
  const enemyDef = ENEMIES[sc.enemy];
  const party = partyIds.map(id => Game.state.chars[id]);
  Battle.start(party, enemyDef, (result) => {
    if (Game.hasPendingLearn()) {
      showLearnScreen();
    } else {
      showVictory(result, sc);
    }
  });
}

function showLearnScreen() {
  const p = Game.consumeLearn();
  const char = Game.state.chars[p.charId];
  Router.go('learn');
  const newMove = MOVES[p.moveId];
  document.getElementById('learn-text').textContent =
    `${CHARACTERS[p.charId].name} wants to learn ${newMove.name} (${newMove.type}, PWR ${newMove.power}). Pick a move to forget.`;
  const row = document.getElementById('learn-current');
  row.innerHTML = '';
  char.moves.forEach((mid, idx) => {
    const m = MOVES[mid];
    const slot = document.createElement('div');
    slot.className = 'move-slot';
    slot.innerHTML = `<strong>${m.name}</strong><br><span class="dim">${m.type} · PWR ${m.power}</span>`;
    slot.onclick = () => {
      char.moves[idx] = p.moveId;
      Game.save();
      finishLearn();
    };
    row.appendChild(slot);
  });
  const newSlot = document.createElement('div');
  newSlot.className = 'move-slot new';
  newSlot.innerHTML = `<strong>NEW: ${newMove.name}</strong><br><span class="dim">${newMove.type} · PWR ${newMove.power}</span>`;
  row.appendChild(newSlot);
  document.getElementById('learn-skip').onclick = () => finishLearn();
}

function finishLearn() {
  if (Game.hasPendingLearn()) return showLearnScreen();
  const sc = SCENES.find(s => s.id === Game.state.currentScene);
  if (sc) showVictory({ win: true }, sc);
  else Router.go('shop'); // came from shop tutor
}

function showVictory(result, sc) {
  Router.go('victory');
  const title = document.getElementById('victory-title');
  const text = document.getElementById('victory-text');
  const gainLine = result.butter > 0 ? `<br><span style="color:var(--yellow)">+${result.butter} BUTTER</span>` : '';
  const unlockLine = result.unlockedDifficulty
    ? `<br><span style="color:var(--green)">✦ ${Game.DIFFICULTY[result.unlockedDifficulty].name} DIFFICULTY UNLOCKED ✦</span>`
    : '';
  const levels = Game.state.roster.map(id => `${CHARACTERS[id].name} Lv ${Game.state.chars[id].level}`).join(' · ');
  if (result.win) {
    title.textContent = 'VICTORY';
    text.innerHTML = `${sc.title} cleared.${unlockLine}<br>${levels}${gainLine}<br>TOTAL BUTTER: ${Game.state.butter}`;
  } else if (result.scripted) {
    title.textContent = 'STORY END';
    text.innerHTML = `${sc.title} survived.${gainLine}<br>TOTAL BUTTER: ${Game.state.butter}`;
  } else {
    title.textContent = result.fled ? 'RETREATED' : 'DEFEATED';
    text.innerHTML = `Regroup and try again.${gainLine}<br>TOTAL BUTTER: ${Game.state.butter}`;
  }
  Game.updateHud();
  document.getElementById('victory-continue').onclick = () => {
    // After first Mama win, show the OUTSIDE-unlock story
    if (result.win && sc.id === 'k7' && !Game.state.storyBeats.kitchen_done) {
      return showStory('kitchen_done', () => Router.go('play'));
    }
    // After first Mauler Cats win (outside finale), show epilogue
    if (result.win && sc.id === 'o4' && !Game.state.storyBeats.outside_done) {
      return showStory('outside_done', () => Router.go('play'));
    }
    Router.go('play');
  };
}

// ============ SHOP ============
function renderShop(tab) {
  document.querySelectorAll('.shop-tabs .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = '';
  const items = SHOP_DATA[tab] || [];
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'shop-item';
    let owned = false;
    if (tab === 'upgrades') owned = !!Game.state.boughtUpgrades[item.id];
    else if (tab === 'blueprints') owned = !!Game.state.boughtBlueprints[item.id];
    else if (tab === 'tutors') {
      const t = TUTOR_MAP[item.id];
      if (t) owned = Game.state.chars[t.charId].moves.includes(t.moveId);
    }

    const stockLine = tab === 'items'
      ? `<div class="istock">OWNED: ${Game.state.bag[item.id] || 0}</div>`
      : '';

    card.innerHTML = `
      <div class="iname">${item.name}</div>
      <div class="idesc">${item.desc}</div>
      ${stockLine}
      <div class="iprice">${item.price} ${item.currency.toUpperCase()}</div>
      <button>${owned ? 'OWNED' : 'BUY'}</button>
    `;
    if (!owned) {
      card.querySelector('button').onclick = () => buy(tab, item);
    } else {
      card.querySelector('button').disabled = true;
    }
    grid.appendChild(card);
  });
}

// Map every tutor id to its target character + move
const TUTOR_MAP = {
  // PANCAKE BUNNY
  tutor_overcharge:  { charId: 'pancake', moveId: 'overcharge' },
  tutor_thunderdome: { charId: 'pancake', moveId: 'thunderdome' },
  tutor_pancakeFlip: { charId: 'pancake', moveId: 'pancakeFlip' },
  // WAFFLE RABBIT
  tutor_detonation:  { charId: 'waffle',  moveId: 'detonation' },
  tutor_waffleStorm: { charId: 'waffle',  moveId: 'waffleStorm' },
  tutor_syrupSlick:  { charId: 'waffle',  moveId: 'syrupSlick' },
  // BUTTA DAWG
  tutor_butterBath:  { charId: 'butta',   moveId: 'butterBath' },
  tutor_bigBark:     { charId: 'butta',   moveId: 'bigBark' },
  tutor_goodBoyAura: { charId: 'butta',   moveId: 'goodBoyAura' }
};

function buy(tab, item) {
  const wallet = item.currency === 'syrup' ? 'syrup' : 'butter';

  // Pre-validate tutors so we don't deduct currency for a no-op
  if (tab === 'tutors') {
    const t = TUTOR_MAP[item.id];
    if (t && Game.state.chars[t.charId].moves.includes(t.moveId)) {
      flashDialogue(`${CHARACTERS[t.charId].name} already knows ${MOVES[t.moveId].name}`);
      return;
    }
  }
  if (tab === 'upgrades' && Game.state.boughtUpgrades[item.id]) {
    flashDialogue('Already owned.');
    return;
  }
  if (tab === 'blueprints' && Game.state.boughtBlueprints[item.id]) {
    flashDialogue('Already owned.');
    return;
  }

  if (Game.state[wallet] < item.price) {
    flashDialogue('Not enough ' + wallet.toUpperCase());
    return;
  }
  Game.state[wallet] -= item.price;

  let queuedLearn = false;
  if (tab === 'items') {
    Game.state.bag[item.id] = (Game.state.bag[item.id] || 0) + 1;
  } else if (tab === 'tutors') {
    const t = TUTOR_MAP[item.id];
    if (t) {
      const c = Game.state.chars[t.charId];
      if (c.moves.length < 4) c.moves.push(t.moveId);
      else { Game.queueLearn(t.charId, t.moveId); queuedLearn = true; }
    }
  } else if (tab === 'upgrades') {
    Game.state.boughtUpgrades[item.id] = true;
    if (item.char) {
      Game.state.permaBuffs[item.char][item.stat] += item.amt;
    } else if (item.global) {
      Game.state.permaBuffs.global[item.global] += item.amt;
    }
  } else if (tab === 'blueprints') {
    Game.state.boughtBlueprints[item.id] = true;
    if (item.global) {
      Game.state.permaBuffs.global[item.global] = (Game.state.permaBuffs.global[item.global] || 0) + item.amt;
    }
    if (item.perk) {
      Game.state.perks[item.perk] = true;
    }
  }
  Game.save();
  renderShop(tab);
  flashDialogue('PURCHASED: ' + item.name, true);

  if (queuedLearn) {
    setTimeout(() => showLearnScreen(), 600);
  }
}

let toastTimer = null;
function flashDialogue(t, ok=false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = t;
  el.classList.toggle('ok', !!ok);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// ============ WIRE UP ============
window.addEventListener('DOMContentLoaded', () => {
  // Boot -> menu
  const boot = document.getElementById('screen-boot');
  boot.classList.add('active');
  let booted = false;
  const advance = () => {
    if (booted) return;
    booted = true;
    document.removeEventListener('keydown', advance);
    boot.removeEventListener('click', advance);
    if (!Game.state.storyBeats.intro) {
      showStory('intro', () => Router.go('menu'));
    } else {
      Router.go('menu');
    }
  };
  document.addEventListener('keydown', advance);
  boot.addEventListener('click', advance);
  setTimeout(advance, 3500);

  // nav buttons
  document.querySelectorAll('[data-go]').forEach(b => {
    b.addEventListener('click', () => Router.go(b.dataset.go));
  });

  // shop tabs
  document.querySelectorAll('.shop-tabs .tab').forEach(t => {
    t.addEventListener('click', () => renderShop(t.dataset.tab));
  });

  // battle commands
  document.querySelectorAll('#cmd-main .cmd-btn').forEach(b => {
    b.addEventListener('click', () => {
      if (Battle.isLocked()) return;
      const cmd = b.dataset.cmd;
      if (cmd === 'fight') Battle.showCmd('moves');
      else if (cmd === 'utility') Battle.showCmd('utility');
      else if (cmd === 'item') Battle.showCmd('items');
      else if (cmd === 'flip')  Battle.startFlip();
      else if (cmd === 'swap') Battle.showCmd('swap');
      else if (cmd === 'flee') Battle.flee();
    });
  });

  // Flip minigame buttons
  const flipTap = document.getElementById('flip-tap');
  const flipCash = document.getElementById('flip-cash');
  if (flipTap)  flipTap.addEventListener('click',  () => Battle.tapFlip());
  if (flipCash) flipCash.addEventListener('click', () => Battle.cashOutFlip());
  // SPACE = tap flip when overlay visible
  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('flip-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      Battle.tapFlip();
    } else if (e.key === 'Escape') {
      Battle.cashOutFlip();
    }
  });
  document.getElementById('cmd-back').addEventListener('click', () => Battle.showCmd('main'));

  // settings binding
  const s = Game.state.settings;
  const bind = (id, key, parse) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!s[key];
    else el.value = s[key];
    el.addEventListener('change', () => {
      s[key] = el.type === 'checkbox' ? el.checked : (parse ? parse(el.value) : el.value);
      Game.save();
    });
  };
  bind('set-speed', 'speed', Number);
  bind('set-text', 'text', Number);
  bind('set-blood', 'blood');
  bind('set-shake', 'shake');
  bind('set-vol', 'vol', Number);

  // Live volume update (apply to all BGM tracks)
  const volEl = document.getElementById('set-vol');
  if (volEl) {
    volEl.addEventListener('input', () => {
      const v = Math.max(0, Math.min(1, Number(volEl.value) / 100));
      ['battle-bgm', 'conquest-bgm', 'thragg-bgm'].forEach(id => {
        const a = document.getElementById(id);
        if (a) a.volume = v;
      });
    });
  }

  Game.updateHud();
});
