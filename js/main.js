// INVINCIBLE: SIMULATION — main shell, menus, save state

const Game = (() => {
  const SAVE_KEY = 'invincible_sim_save_v5';

  const defaultState = () => ({
    gda: 100,
    vm: 0,
    bag: { stim: 2 },
    suits: { classic: true },
    chars: {
      mark: { id: 'mark', level: 1, xp: 0, moves: ['punch', 'flyKick'] },
      eve:  { id: 'eve',  level: 1, xp: 0, moves: ['pinkBlast', 'shieldWall'] }
    },
    scenesDone: {},
    currentScene: null,
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

    // BGM control — battle theme plays only on battle screen
    const bgm = document.getElementById('battle-bgm');
    if (bgm) {
      if (name === 'battle') {
        bgm.volume = Math.max(0, Math.min(1, (Game.state.settings.vol || 70) / 100));
        bgm.currentTime = 0;
        const p = bgm.play();
        if (p && p.catch) p.catch(() => {/* autoplay blocked — user can press SETTINGS toggle later */});
      } else {
        bgm.pause();
      }
    }
  }
  return { go };
})();

function renderScenes() {
  const list = document.getElementById('scene-list');
  list.innerHTML = '';
  let unlocked = true;
  SCENES.forEach((sc, i) => {
    const done = Game.state.scenesDone[sc.id];
    const isUnlocked = i === 0 || Game.state.scenesDone[SCENES[i-1].id];
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
    if (isUnlocked) {
      card.onclick = () => startScene(sc);
    }
    list.appendChild(card);
  });
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
  document.getElementById('select-scene-label').textContent =
    `SCENE ${sc.num} · ${sc.title} — Pick your STARTER (the other tags in as bench)`;
  const grid = document.getElementById('select-grid');
  grid.innerHTML = '';
  Object.values(CHARACTERS).forEach(ch => {
    const save = Game.state.chars[ch.id];
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
    const otherId = ch.id === 'mark' ? 'eve' : 'mark';
    card.onclick = () => launchBattle(sc, [ch.id, otherId]);
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
  showVictory({ win: true }, SCENES.find(s => s.id === Game.state.currentScene));
}

function showVictory(result, sc) {
  Router.go('victory');
  const title = document.getElementById('victory-title');
  const text = document.getElementById('victory-text');
  if (result.win) {
    title.textContent = 'VICTORY';
    text.innerHTML = `${sc.title} cleared.<br>Mark Lv ${Game.state.chars.mark.level} · Eve Lv ${Game.state.chars.eve.level}<br>GDA: ${Game.state.gda}`;
  } else if (result.scripted) {
    title.textContent = 'STORY END';
    text.innerHTML = `The tutorial is over.<br>Now the real fight begins.`;
  } else {
    title.textContent = result.fled ? 'RETREATED' : 'DEFEATED';
    text.innerHTML = `Regroup and try again.`;
  }
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
    const owned = tab === 'suits' && (Game.state.suits[item.id] || item.owned);
    card.innerHTML = `
      <div class="iname">${item.name}</div>
      <div class="idesc">${item.desc}</div>
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

function buy(tab, item) {
  const wallet = item.currency === 'vm' ? 'vm' : 'gda';
  if (Game.state[wallet] < item.price) {
    flashDialogue('Not enough ' + wallet.toUpperCase());
    return;
  }
  Game.state[wallet] -= item.price;
  if (tab === 'items') {
    Game.state.bag[item.id] = (Game.state.bag[item.id] || 0) + 1;
  } else if (tab === 'suits') {
    Game.state.suits[item.id] = true;
  } else if (tab === 'tutors') {
    if (item.id === 'tutor_rage') {
      const c = Game.state.chars.mark;
      if (!c.moves.includes('rage')) {
        if (c.moves.length < 4) c.moves.push('rage');
        else Game.queueLearn('mark', 'rage');
      }
    }
    if (item.id === 'tutor_burst') {
      const c = Game.state.chars.eve;
      if (!c.moves.includes('burst')) {
        if (c.moves.length < 4) c.moves.push('burst');
      }
    }
  }
  Game.save();
  renderShop(tab);
  flashDialogue('PURCHASED: ' + item.name, true);
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
  const advance = () => {
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

  // Live volume update
  const volEl = document.getElementById('set-vol');
  if (volEl) {
    volEl.addEventListener('input', () => {
      const bgm = document.getElementById('battle-bgm');
      if (bgm) bgm.volume = Math.max(0, Math.min(1, Number(volEl.value) / 100));
    });
  }

  Game.updateHud();
});
