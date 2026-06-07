// INVINCIBLE: SIMULATION — main shell, menus, save state

const Game = (() => {
  const SAVE_KEY = 'invincible_sim_save_v7';

  const defaultState = () => ({
    gda: 100,
    vm: 5,
    bag: { stim: 2 },
    suits: { classic: true },
    boughtBuffs: {},
    chars: {
      mark:  { id: 'mark',  level: 1, xp: 0, moves: ['punch', 'flyKick'] },
      eve:   { id: 'eve',   level: 1, xp: 0, moves: ['pinkBlast', 'shieldWall'] },
      allen: { id: 'allen', level: 1, xp: 0, moves: ['cosmicSlap', 'starHook'] }
    },
    roster: ['mark', 'eve'],      // playable party members the player has recruited
    permaBuffs: {
      mark:   { hp: 0, ep: 0, atk: 0, def: 0 },
      eve:    { hp: 0, ep: 0, atk: 0, def: 0 },
      allen:  { hp: 0, ep: 0, atk: 0, def: 0 },
      global: { critRate: 0, xpMult: 1, gdaMult: 1 }
    },
    scenesDone: {},
    currentScene: null,
    currentRegion: 'earth',       // play screen tab
    settings: { speed: 2, text: 30, blood: 'comic', shake: true, vol: 70 }
  });

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
    if (el) el.textContent = `GDA: ${state.gda}  |  VM: ${state.vm}`;
    const sc = document.getElementById('shop-credits');
    if (sc) sc.textContent = `GDA: ${state.gda} · VM: ${state.vm}`;
  }

  function xpForNext(lvl) { return 30 + lvl * 25; }

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

  function markSceneWon(sceneId) { if (sceneId) state.scenesDone[sceneId] = true; }

  return {
    get state() { return state; },
    save, gainXP, xpForNext,
    markSceneWon,
    hasPendingLearn, consumeLearn, queueLearn,
    updateHud
  };
})();

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
      ['battle-bgm', 'conquest-bgm'].forEach(id => {
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

  // Region tab bar
  const conquestDone = !!Game.state.scenesDone['s5'];
  const marsUnlocked = conquestDone;
  const tabs = document.createElement('div');
  tabs.className = 'region-tabs';
  tabs.innerHTML = `
    <button class="region-tab ${Game.state.currentRegion === 'earth' ? 'active' : ''}" data-region="earth">🌎 EARTH</button>
    <button class="region-tab ${Game.state.currentRegion === 'mars' ? 'active' : ''} ${marsUnlocked ? '' : 'locked'}" data-region="mars">🟥 MARS ${marsUnlocked ? '' : '· LOCKED'}</button>
  `;
  tabs.querySelectorAll('.region-tab').forEach(t => {
    t.addEventListener('click', () => {
      if (t.classList.contains('locked')) {
        flashDialogue('Defeat CONQUEST to unlock MARS.');
        return;
      }
      Game.state.currentRegion = t.dataset.region;
      Game.save();
      renderScenes();
    });
  });
  list.appendChild(tabs);

  // Scene grid for current region
  const grid = document.createElement('div');
  grid.className = 'scene-grid';
  const regionScenes = SCENES.filter(s => s.region === Game.state.currentRegion);
  regionScenes.forEach((sc, i) => {
    const done = Game.state.scenesDone[sc.id];
    const isUnlocked = i === 0 || Game.state.scenesDone[regionScenes[i-1].id];
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
  if (sc.scripted) {
    // Tutorial: Mark only, no bench
    launchBattle(sc, ['mark']);
  } else {
    renderCharSelect(sc);
    Router.go('select');
  }
}

function renderCharSelect(sc) {
  const roster = Game.state.roster || ['mark', 'eve'];
  const label = roster.length > 2
    ? `SCENE ${sc.num} · ${sc.title} — Pick your STARTER (one of the others tags in as bench)`
    : `SCENE ${sc.num} · ${sc.title} — Pick your STARTER (the other tags in as bench)`;
  document.getElementById('select-scene-label').textContent = label;
  const grid = document.getElementById('select-grid');
  grid.innerHTML = '';
  roster.forEach(id => {
    const ch = CHARACTERS[id];
    if (!ch) return;
    const save = Game.state.chars[id];
    const card = document.createElement('div');
    card.className = 'fighter-card';
    card.innerHTML = `
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
      // Active = clicked, bench = next member in roster (skipping active)
      const others = roster.filter(r => r !== id);
      const benchId = others[0] || null;
      const party = benchId ? [id, benchId] : [id];
      launchBattle(sc, party);
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
  // Recruitment hook
  let recruitedLine = '';
  if (result.win && sc.recruitsOnWin) {
    const newMember = sc.recruitsOnWin;
    if (!Game.state.roster.includes(newMember)) {
      Game.state.roster.push(newMember);
      Game.save();
      recruitedLine = `<br><span style="color:var(--green)">✦ ${CHARACTERS[newMember].name.toUpperCase()} JOINED YOUR PARTY ✦</span>`;
    }
  }

  Router.go('victory');
  const title = document.getElementById('victory-title');
  const text = document.getElementById('victory-text');
  const gainLine = result.gda > 0 ? `<br><span style="color:var(--yellow)">+${result.gda} GDA</span>` : '';
  const levels = Game.state.roster.map(id => `${CHARACTERS[id].name} Lv ${Game.state.chars[id].level}`).join(' · ');
  if (result.win) {
    title.textContent = 'VICTORY';
    text.innerHTML = `${sc.title} cleared.${recruitedLine}<br>${levels}${gainLine}<br>TOTAL GDA: ${Game.state.gda}`;
  } else if (result.scripted) {
    title.textContent = 'STORY END';
    text.innerHTML = `${sc.title} survived.<br>Now the real fight begins.${gainLine}<br>TOTAL GDA: ${Game.state.gda}`;
  } else {
    title.textContent = result.fled ? 'RETREATED' : 'DEFEATED';
    text.innerHTML = `Regroup and try again.${gainLine}<br>TOTAL GDA: ${Game.state.gda}`;
  }
  Game.updateHud();
  document.getElementById('victory-continue').onclick = () => Router.go('play');
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
    if (tab === 'suits') owned = !!(Game.state.suits[item.id] || item.owned);
    else if (tab === 'buffs') owned = !!Game.state.boughtBuffs[item.id];
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
  tutor_rage:      { charId: 'mark', moveId: 'rage' },
  tutor_thrust:    { charId: 'mark', moveId: 'thrust' },
  tutor_double:    { charId: 'mark', moveId: 'doubleStrike' },
  tutor_sky:       { charId: 'mark', moveId: 'skybreak' },
  tutor_viltrum:   { charId: 'mark', moveId: 'viltrumStrike' },
  tutor_blood:     { charId: 'mark', moveId: 'bloodFist' },
  tutor_nova:      { charId: 'mark', moveId: 'novaBeam' },
  tutor_emp:       { charId: 'mark', moveId: 'empGrid' },
  tutor_burst:     { charId: 'eve',  moveId: 'burst' },
  tutor_pshield:   { charId: 'eve',  moveId: 'pinkShield' },
  tutor_novaburst: { charId: 'eve',  moveId: 'novaBurst' },
  tutor_rain:      { charId: 'eve',  moveId: 'pinkRain' },
  tutor_atomic:    { charId: 'eve',  moveId: 'atomicEdge' },
  tutor_heal:      { charId: 'eve',  moveId: 'healingPulse' },
  tutor_melt:      { charId: 'eve',  moveId: 'meltdown' }
};

function buy(tab, item) {
  const wallet = item.currency === 'vm' ? 'vm' : 'gda';

  // Pre-validate tutors so we don't deduct currency for a no-op
  if (tab === 'tutors') {
    const t = TUTOR_MAP[item.id];
    if (t && Game.state.chars[t.charId].moves.includes(t.moveId)) {
      flashDialogue(`${CHARACTERS[t.charId].name} already knows ${MOVES[t.moveId].name}`);
      return;
    }
  }
  if (tab === 'buffs' && Game.state.boughtBuffs[item.id]) {
    flashDialogue('Already owned.');
    return;
  }
  if (tab === 'suits' && Game.state.suits[item.id]) {
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
  } else if (tab === 'suits') {
    Game.state.suits[item.id] = true;
  } else if (tab === 'tutors') {
    const t = TUTOR_MAP[item.id];
    if (t) {
      const c = Game.state.chars[t.charId];
      if (c.moves.length < 4) c.moves.push(t.moveId);
      else { Game.queueLearn(t.charId, t.moveId); queuedLearn = true; }
    }
  } else if (tab === 'buffs') {
    Game.state.boughtBuffs[item.id] = true;
    if (item.char) {
      Game.state.permaBuffs[item.char][item.stat] += item.amt;
    } else if (item.global) {
      Game.state.permaBuffs.global[item.global] += item.amt;
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
    Router.go('menu');
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
      else if (cmd === 'swap') Battle.showCmd('swap');
      else if (cmd === 'flee') Battle.flee();
    });
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
      ['battle-bgm', 'conquest-bgm'].forEach(id => {
        const a = document.getElementById(id);
        if (a) a.volume = v;
      });
    });
  }

  Game.updateHud();
});
