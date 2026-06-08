// INVINCIBLE: SIMULATION — battle system v0.4
// Bugfix: combatant `def` (DEF stat) no longer collides with character ref (`char`).
// Adds: tag-team swap, animated move FX.

const Battle = (() => {
  let state = null;
  let dialogueQueue = [];
  let inputLocked = false;

  // No scripted-difficulty-multiplier enemies in this build (kept hook for future)
  const isScriptedHardCap = () => false;

  function start(party, enemyDef, onEnd, opts = {}) {
    const isBossOrMini = !!enemyDef.phases || enemyDef.scripted || opts.isBoss;
    // 25% chance of multi-spawn on non-boss/non-scripted fights
    const multiSpawn = !isBossOrMini && Math.random() < 0.25;
    let finalEnemyDef = enemyDef;
    if (multiSpawn) {
      finalEnemyDef = Object.assign({}, enemyDef, {
        hp: Math.floor(enemyDef.hp * 1.55),
        atk: Math.floor(enemyDef.atk * 1.20),
        butter: Math.floor(enemyDef.butter * 1.50),
        xp: Math.floor(enemyDef.xp * 1.45),
        name: enemyDef.name + ' (×2)'
      });
    }
    state = {
      party: party.map(p => buildCombatant(p, p.level || 1, true)),
      activeIdx: 0,
      enemy: buildEnemyCombatant(finalEnemyDef),
      turnCount: 1,
      multiSpawn,
      onEnd,
      buffs: { atk: 0, def: 0, revive: false, phoenix: false, damageCharge: false, dodge: false },
      debuffs: { enemyAtk: 0 },
      phaseIdx: 0,
      firedDialogue: new Set(),
      scripted: !!enemyDef.scripted
    };
    // Defer audio start so the battle UI paints first — feels instant
    requestAnimationFrame(() => playBGM(enemyDef));
    const pb = document.getElementById('phase-banner');
    if (pb) { pb.classList.remove('show'); pb.textContent = ''; }
    if (Game.state.perks && Game.state.perks.starter_crumb) {
      Game.state.bag.crumb = (Game.state.bag.crumb || 0) + 1;
    }
    // Show / hide the second-enemy sprite
    const e2 = document.getElementById('enemy-sprite-2');
    if (e2) {
      if (multiSpawn) {
        e2.src = enemyDef.sprite;
        e2.classList.remove('hidden');
      } else {
        e2.classList.add('hidden');
      }
    }
    renderAll();
    dialogueQueue = [];
    inputLocked = false;
    queueDialogue(enemyDef.intro);
    if (multiSpawn) queueDialogue(`Two ${enemyDef.name}s stepped up at once!`);
    else queueDialogue(`A wild ${enemyDef.name} blocks your path!`);
    if (multiSpawn && state.party.length > 1) {
      queueDialogue(`${active().char.name} and ${bench().char.name} BOTH stay out for the brawl!`);
    }
    playQueue(() => showCmd('main'));
  }

  function playBGM(enemyDef) {
    const battleBgm   = document.getElementById('battle-bgm');
    const conquestBgm = document.getElementById('conquest-bgm');
    const thraggBgm   = document.getElementById('thragg-bgm');
    const allTracks = [battleBgm, conquestBgm, thraggBgm].filter(Boolean);
    const vol = Math.max(0, Math.min(1, (Game.state.settings.vol || 70) / 100));

    let bgm = battleBgm;
    let trackLabel = 'BATTLE THEME';
    if (enemyDef) {
      if (enemyDef.name === 'MAMA BUNNY') { bgm = thraggBgm; trackLabel = 'MAMA · FINAL'; }
      else if (enemyDef.name === 'STOVE LORD' || enemyDef.name === 'CEREAL KILLER') { bgm = conquestBgm; trackLabel = 'BOSS THEME'; }
    }

    console.log('[BGM] Enemy:', enemyDef && enemyDef.name, '→ Playing:', trackLabel);
    const ind = document.getElementById('bgm-indicator');
    if (ind) ind.textContent = '♪ ' + trackLabel;

    // Stop EVERY track first (defensive — prevents overlap if a previous play was mid-load)
    allTracks.forEach(a => { a.pause(); a.currentTime = 0; });

    if (bgm) {
      bgm.volume = vol;
      bgm.currentTime = 0;
      bgm.load();
      const p = bgm.play();
      if (p && p.catch) p.catch(err => console.log('[BGM] play blocked:', err));
    }
  }

  function active() { return state.party[state.activeIdx]; }
  function bench()  { return state.party[1 - state.activeIdx]; }

  function buildCombatant(charSave, lvl, isPlayer) {
    const c = CHARACTERS[charSave.id];
    const scale = 1 + (lvl - 1) * 0.12;
    const pb = (Game.state.permaBuffs && Game.state.permaBuffs[charSave.id]) || { hp:0, ep:0, atk:0, def:0 };
    const maxHP = Math.floor(c.baseHP * scale) + pb.hp;
    const maxEP = c.baseEP + pb.ep;
    return {
      char: c,
      lvl,
      maxHP, hp: maxHP,
      maxEP, ep: maxEP,
      atk: Math.floor(c.baseATK * scale) + pb.atk,
      def: Math.floor(c.baseDEF * scale) + pb.def,
      spd: c.baseSPD,
      moves: charSave.moves ? charSave.moves.slice() : initialMoves(c, lvl),
      utilities: c.utilities.slice(),
      isPlayer
    };
  }

  function initialMoves(c, lvl) {
    return c.moveset.filter(m => m.lvl <= lvl).slice(-4).map(m => m.move);
  }

  function buildEnemyCombatant(def) {
    const diff = Game.getDifficulty();
    const hpMult  = diff.enemy;
    const atkMult = diff.atk;
    return {
      char: def,
      lvl: '?',
      maxHP: Math.floor(def.hp * hpMult), hp: Math.floor(def.hp * hpMult),
      maxEP: Math.floor(def.ep * hpMult), ep: Math.floor(def.ep * hpMult),
      atk: Math.floor(def.atk * atkMult),
      def: Math.floor(def.def * hpMult),
      spd: def.spd,
      moves: def.moves.slice(),
      isPlayer: false
    };
  }

  function renderAll() {
    const a = active(), e = state.enemy;
    $('#player-name').textContent = a.char.name;
    $('#player-lvl').textContent = 'Lv ' + a.lvl;
    $('#player-sprite').src = a.char.sprite;
    renderBar('player-hp', a.hp, a.maxHP);
    $('#player-hp-text').textContent = `${a.hp}/${a.maxHP}`;
    renderBar('player-ep', a.ep, a.maxEP, true);
    $('#player-ep-text').textContent = `${a.ep}/${a.maxEP}`;
    const ch = Game.state.chars[a.char.id];
    const needed = Game.xpForNext(ch.level);
    document.getElementById('player-xp').style.width = ((ch.xp / needed) * 100) + '%';

    $('#enemy-name').textContent = e.char.name;
    $('#enemy-lvl').textContent = e.char.scripted ? 'Lv ???' : 'Lv ' + Math.max(1, Math.floor(e.maxHP / 20));
    $('#enemy-sprite').src = e.char.sprite;
    renderBar('enemy-hp', e.hp, e.maxHP);
    $('#enemy-hp-text').textContent = `${e.hp}/${e.maxHP}`;

    $('#turn-indicator').textContent = 'TURN ' + String(state.turnCount).padStart(2, '0');

    // Bench panel
    const benchPanel = $('#bench-panel');
    if (state.party.length > 1) {
      const b = bench();
      benchPanel.classList.remove('hidden');
      $('#bench-sprite').src = b.char.sprite;
      $('#bench-name').textContent = b.char.name;
      const benchHp = $('#bench-hp-fill');
      const pct = Math.max(0, (b.hp / b.maxHP) * 100);
      benchHp.style.width = pct + '%';
      benchHp.classList.remove('mid','low');
      if (pct < 50) benchHp.classList.add('mid');
      if (pct < 25) benchHp.classList.add('low');
    } else {
      benchPanel.classList.add('hidden');
    }
  }

  function renderBar(id, cur, max, ep=false) {
    const el = document.getElementById(id);
    if (!el) return;
    const safeMax = max > 0 ? max : 1;
    const pct = Math.max(0, Math.min(100, (cur / safeMax) * 100));
    el.style.width = pct + '%';
    el.classList.remove('mid','low');
    if (!ep) {
      if (pct < 50) el.classList.add('mid');
      if (pct < 25) el.classList.add('low');
    }
  }

  function setDialogue(text) { $('#dialogue').textContent = text; }

  function queueDialogue(text) {
    if (Array.isArray(text)) text.forEach(t => dialogueQueue.push(t));
    else dialogueQueue.push(text);
  }

  function playQueue(done) {
    inputLocked = true;
    hideAllCmds();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      inputLocked = false;
      try { if (done) done(); }
      catch (err) {
        console.error('[battle] playQueue done callback threw:', err);
        // Defensive: drop the player back to main commands so the UI never hangs
        try { showCmd('main'); } catch (e) {}
      }
    };
    const step = () => {
      try {
        if (dialogueQueue.length === 0) return finish();
        setDialogue(dialogueQueue.shift());
        setTimeout(step, 1300);
      } catch (err) {
        console.error('[battle] playQueue step threw:', err);
        finish();
      }
    };
    // Hard watchdog — if the queue is still going after 2× expected duration, force-finish
    const watchdogMs = Math.max(4000, dialogueQueue.length * 1300 * 2 + 1500);
    setTimeout(() => {
      if (!finished) {
        console.warn('[battle] watchdog tripped — forcing queue finish');
        dialogueQueue.length = 0;
        finish();
      }
    }, watchdogMs);
    step();
  }

  function hideAllCmds() {
    ['main','moves','utility','items','swap'].forEach(k => $('#cmd-' + k).classList.add('hidden'));
    $('#cmd-back').classList.add('hidden');
  }

  // ============ MINIGAMES (per character) ============
  const MINIGAME_CFG = {
    butta: {
      name: 'FLIP', stat: 'def', vertical: false,
      reductionBase: 0.07, reductionScale: 0.005, reductionCap: 0.80,
      initSpeed: 0.018, speedStep: 0.005, speedCap: 0.080,
      initWidth: 22, widthStep: 1.5, widthMin: 8,
      chainCap: 10, oneShot: true,
      color: '#ff2bd6', label: '↻ FLIP', verb: 'flips', perfectVerb: 'PERFECT FLIPS'
    },
    pancake: {
      name: 'SHOCK', stat: 'atk', vertical: false,
      reductionBase: 0.08, reductionScale: 0.006, reductionCap: 0.75,
      initSpeed: 0.025, speedStep: 0.007, speedCap: 0.095, // faster start
      initWidth: 20, widthStep: 1.3, widthMin: 7,
      chainCap: 8, oneShot: false,
      color: '#00e5ff', label: '⚡ SHOCK', verb: 'shocks', perfectVerb: 'CIRCUITS LANDED'
    },
    waffle: {
      name: 'BLAST', stat: 'atk', vertical: true,
      reductionBase: 0.14, reductionScale: 0.008, reductionCap: 0.75,
      initSpeed: 0.013, speedStep: 0.004, speedCap: 0.055, // slower but bigger hit
      initWidth: 26, widthStep: 2.0, widthMin: 9,
      chainCap: 5, oneShot: false,
      color: '#ff8a3a', label: '💥 BLAST', verb: 'blasts', perfectVerb: 'CHARGES PLACED'
    }
  };

  let flipState = null;
  function activeCfg() { return MINIGAME_CFG[active().char.id] || MINIGAME_CFG.butta; }
  function startFlip() {
    if (inputLocked || flipState) return;
    const cfg = activeCfg();
    // Pre-load cumulative reduction from prior sessions in this battle (per-stat)
    const baseKey = cfg.stat === 'def' ? '_baseDef' : '_baseAtk';
    const curStat = cfg.stat === 'def' ? state.enemy.def : state.enemy.atk;
    const prevReduction = (state.enemy[baseKey] && state.enemy[baseKey] > 0)
      ? 1 - (curStat / state.enemy[baseKey])
      : 0;
    flipState = {
      cfg,
      chain: 0,
      reductionPct: Math.max(0, Math.min(cfg.reductionCap, prevReduction)),
      markerPos: 0,
      direction: 1,
      speed: cfg.initSpeed,
      zoneCenter: 50,
      zoneWidth: cfg.initWidth,
      raf: null,
      lastTapAt: 0
    };
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    const sprite = document.getElementById('player-sprite');
    sprite.style.setProperty('--flip-duration', '0.65s');
    sprite.classList.add('flipping');
    const ov = $('#flip-overlay');
    ov.classList.remove('hidden');
    ov.classList.remove('success-flash', 'fail-flash');
    ov.classList.toggle('mg-vertical', !!cfg.vertical);
    ov.style.setProperty('--mg-color', cfg.color);
    $('#flip-title-name').textContent = cfg.name + ' MINIGAME';
    $('#flip-stat-label').textContent = 'ENEMY ' + cfg.stat.toUpperCase();
    $('#flip-chain').textContent = '0';
    $('#flip-def').textContent = currentEnemyStatPctText();
    hideAllCmds();
    inputLocked = true;
    updateFlipUI();
    runFlipLoop();
  }

  function runFlipLoop() {
    cancelAnimationFrame(flipState.raf);
    const tick = () => {
      if (!flipState) return;
      flipState.markerPos += flipState.direction * flipState.speed * 16;
      if (flipState.markerPos >= 100) { flipState.markerPos = 100; flipState.direction = -1; }
      else if (flipState.markerPos <= 0) { flipState.markerPos = 0; flipState.direction = 1; }
      const marker = $('#flip-marker');
      if (flipState.cfg.vertical) {
        marker.style.top = flipState.markerPos + '%';
        marker.style.left = '';
      } else {
        marker.style.left = flipState.markerPos + '%';
        marker.style.top = '';
      }
      flipState.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  function updateFlipUI() {
    const zone = $('#flip-zone');
    const cfg = flipState.cfg;
    const startPos = flipState.zoneCenter - flipState.zoneWidth / 2;
    if (cfg.vertical) {
      zone.style.left = '0';
      zone.style.right = '0';
      zone.style.width = '';
      zone.style.top = startPos + '%';
      zone.style.height = flipState.zoneWidth + '%';
    } else {
      zone.style.left = startPos + '%';
      zone.style.width = flipState.zoneWidth + '%';
      zone.style.top = '';
      zone.style.height = '';
      zone.style.right = '';
    }
  }

  function tapFlip() {
    if (!flipState) return;
    const now = Date.now();
    if (now - flipState.lastTapAt < 220) return;
    flipState.lastTapAt = now;
    const cfg = flipState.cfg;
    const distFromCenter = Math.abs(flipState.markerPos - flipState.zoneCenter);
    const half = flipState.zoneWidth / 2;
    if (distFromCenter <= half) {
      flipState.chain++;
      const reductionThisHit = cfg.reductionBase + Math.min(cfg.reductionBase * 0.5, flipState.chain * cfg.reductionScale);
      flipState.reductionPct = Math.min(cfg.reductionCap, flipState.reductionPct + reductionThisHit);
      flipState.zoneCenter = 20 + Math.random() * 60;
      flipState.zoneWidth = Math.max(cfg.widthMin, flipState.zoneWidth - cfg.widthStep);
      flipState.speed = Math.min(cfg.speedCap, flipState.speed + cfg.speedStep);
      const dur = Math.max(0.12, 0.65 - flipState.chain * 0.055);
      const sprite = document.getElementById('player-sprite');
      if (sprite) sprite.style.setProperty('--flip-duration', dur.toFixed(2) + 's');
      applyStatReduction();
      $('#flip-chain').textContent = flipState.chain;
      $('#flip-def').textContent = currentEnemyStatPctText();
      $('#flip-overlay').classList.remove('success-flash'); void $('#flip-overlay').offsetWidth;
      $('#flip-overlay').classList.add('success-flash');
      if (cfg.oneShot && flipState.chain >= cfg.chainCap) {
        endFlip(true);
      } else if (flipState.chain >= cfg.chainCap) {
        // Hit the cap but no one-shot — auto cash out
        endFlip(null);
      } else {
        updateFlipUI();
      }
    } else {
      endFlip(false);
    }
  }

  function cashOutFlip() {
    if (!flipState) return;
    endFlip(null); // null = cash out (no damage)
  }

  function currentEnemyStatPctText() {
    const reduction = (flipState && flipState.reductionPct) || 0;
    return Math.round((1 - reduction) * 100) + '%';
  }
  function applyStatReduction() {
    if (!flipState || !state || !state.enemy) return;
    const cfg = flipState.cfg;
    if (cfg.stat === 'def') {
      if (state.enemy._baseDef === undefined) state.enemy._baseDef = state.enemy.def;
      state.enemy.def = Math.max(1, Math.floor(state.enemy._baseDef * (1 - flipState.reductionPct)));
    } else if (cfg.stat === 'atk') {
      if (state.enemy._baseAtk === undefined) state.enemy._baseAtk = state.enemy.atk;
      state.enemy.atk = Math.max(1, Math.floor(state.enemy._baseAtk * (1 - flipState.reductionPct)));
    }
  }

  function endFlip(oneShot) {
    const cfg = flipState && flipState.cfg;
    const statLabel = cfg && cfg.stat ? cfg.stat.toUpperCase() : 'DEF';
    cancelAnimationFrame(flipState.raf);
    const sprite = document.getElementById('player-sprite');
    sprite.classList.remove('flipping');
    sprite.style.removeProperty('--flip-duration');
    $('#flip-overlay').classList.add('hidden');
    const a = active();
    const chain = flipState.chain;
    const oneShotKill = oneShot === true;
    const missed = oneShot === false;
    flipState = null;
    dialogueQueue = [];

    if (oneShotKill) {
      queueDialogue(`${a.char.name} pulled off ${chain} ${cfg.perfectVerb}!`);
      queueDialogue(`A one-shot finisher obliterates ${state.enemy.char.name}!`);
      playFX('blast', 'player'); flashHit('enemy');
      state.enemy.hp = 0;
      renderAll();
      playQueue(() => win());
      return;
    }
    if (missed) {
      const enemyBaseAtk = state.enemy._baseAtk || state.enemy.atk || 10;
      const selfDmg = Math.floor(enemyBaseAtk * (0.8 + chain * 0.15));
      a.hp = Math.max(0, a.hp - selfDmg);
      flashHit('player');
      queueDialogue(`MISTIMED ${cfg.name}! ${a.char.name} took ${selfDmg} damage.`);
      if (chain > 0) queueDialogue(`Chain ended at ${chain} — enemy ${statLabel} locked at ${currentEnemyStatPctText().replace('%','')}%.`);
      renderAll();
      if (a.hp <= 0) return playQueue(() => lose());
      playQueue(() => { afterPlayerTurn(); enemyTurn(); });
      return;
    }
    // Cash out (or hit chain cap on non-one-shot)
    queueDialogue(`${a.char.name} landed ${chain} ${cfg.verb}.`);
    queueDialogue(`Enemy ${statLabel} now at ${Math.round((state.enemy[cfg.stat] / (state.enemy[cfg.stat === 'def' ? '_baseDef' : '_baseAtk'] || 1)) * 100)}% — locked for the fight.`);
    renderAll();
    playQueue(() => { afterPlayerTurn(); enemyTurn(); });
  }
  // (flip controls exposed via the module return below)

  function showCmd(which) {
    hideAllCmds();
    $('#cmd-back').classList.toggle('hidden', which === 'main');
    if (which === 'main') {
      $('#cmd-main').classList.remove('hidden');
      setDialogue(`What will ${active().char.name} do?`);
      const swapBtn = $('#cmd-main [data-cmd="swap"]');
      if (swapBtn) {
        const benchOK = state.party.length > 1 && bench().hp > 0;
        swapBtn.disabled = !benchOK;
      }
      // FLIP button shows the active char's minigame label
      const flipBtn = document.getElementById('cmd-flip-btn');
      if (flipBtn && MINIGAME_CFG[active().char.id]) {
        flipBtn.textContent = MINIGAME_CFG[active().char.id].label;
      }
    } else {
      $('#cmd-' + which).classList.remove('hidden');
      if (which === 'moves') renderMoves();
      if (which === 'utility') renderUtility();
      if (which === 'items') renderItems();
      if (which === 'swap') renderSwap();
    }
  }

  function renderMoves() {
    const c = $('#cmd-moves'); c.innerHTML = '';
    active().moves.forEach(mid => {
      const m = MOVES[mid];
      const b = document.createElement('button');
      b.className = 'cmd-btn fight';
      b.innerHTML = `${m.name}<span class="mep">EP ${m.ep}</span><span class="mtype">${m.type} · PWR ${m.power}</span>`;
      if (active().ep < m.ep) b.disabled = true;
      b.onclick = () => { if (!inputLocked) playerUseMove(mid); };
      c.appendChild(b);
    });
  }

  function renderUtility() {
    const c = $('#cmd-utility'); c.innerHTML = '';
    active().utilities.forEach(uid => {
      const u = UTILITIES[uid];
      const b = document.createElement('button');
      b.className = 'cmd-btn utility';
      b.innerHTML = `⚙ ${u.name}<span class="mep">EP ${u.ep}</span><span class="mtype">${u.desc}</span>`;
      if (active().ep < u.ep) b.disabled = true;
      b.onclick = () => { if (!inputLocked) playerUseUtility(uid); };
      c.appendChild(b);
    });
  }

  function renderItems() {
    const c = $('#cmd-items'); c.innerHTML = '';
    const bag = Game.state.bag;
    const ids = Object.keys(bag).filter(id => bag[id] > 0);
    if (ids.length === 0) {
      c.innerHTML = '<div class="dim" style="padding:14px;">No items. Buy some in the SHOP.</div>';
      return;
    }
    ids.forEach(id => {
      const item = SHOP_DATA.items.find(i => i.id === id);
      if (!item) return;
      const b = document.createElement('button');
      b.className = 'cmd-btn item';
      b.innerHTML = `${item.name} x${bag[id]}<span class="mtype">${item.desc}</span>`;
      b.onclick = () => { if (!inputLocked) playerUseItem(id); };
      c.appendChild(b);
    });
  }

  function renderSwap() {
    const c = $('#cmd-swap'); c.innerHTML = '';
    if (state.party.length < 2) {
      c.innerHTML = '<div class="dim" style="padding:14px;">No bench fighter available.</div>';
      return;
    }
    const b = bench();
    const btn = document.createElement('button');
    btn.className = 'cmd-btn swap';
    btn.innerHTML = `⇄ TAG IN: ${b.char.name}<span class="mep">HP ${b.hp}/${b.maxHP}</span><span class="mtype">${b.char.tag} · costs your turn</span>`;
    if (b.hp <= 0) btn.disabled = true;
    btn.onclick = () => { if (!inputLocked) playerSwap(); };
    c.appendChild(btn);
  }

  function playerSwap() {
    const incoming = bench();
    const outgoing = active();
    dialogueQueue = [
      `${outgoing.char.name}, fall back!`,
      `Go, ${incoming.char.name}!`
    ];
    state.activeIdx = 1 - state.activeIdx;
    renderAll();
    playQueue(() => enemyTurn());
  }

  function calcDamage(atkVal, defVal, defenderTag, move, attackerIsPlayer=false) {
    const base = move.power;
    if (base === 0) return { dmg: 0, tagMult: 1, crit: false };
    const ratio = atkVal / Math.max(1, defVal);
    const tagMult = (TYPE_CHART[move.type] && TYPE_CHART[move.type][defenderTag]) || 1;
    const variance = 0.85 + Math.random() * 0.3;
    const critBonus = attackerIsPlayer ? (Game.state.permaBuffs?.global?.critRate || 0) : 0;
    const critDmgBonus = attackerIsPlayer ? (Game.state.permaBuffs?.global?.critDmg || 0) : 0;
    const crit = Math.random() < (0.04 + critBonus) ? (1.5 + critDmgBonus) : 1;
    let dmg = Math.floor(base * ratio * tagMult * variance * crit);
    return { dmg, tagMult, crit: crit > 1 };
  }

  function playerUseMove(mid) {
    const a = active();
    const m = MOVES[mid];
    if (a.ep < m.ep) return;
    a.ep -= m.ep;

    dialogueQueue = [];
    queueDialogue(`${a.char.name} used ${m.name}!`);

    // Healing moves (no damage; restore HP)
    if (mid === 'lickWound') {
      const back = Math.floor(a.maxHP * 0.35);
      a.hp = Math.min(a.maxHP, a.hp + back);
      playFX('heal', 'player');
      queueDialogue(`${a.char.name} licks the wound clean.`);
      queueDialogue(`Recovered ${back} HP.`);
      renderAll();
      playQueue(() => { afterPlayerTurn(); enemyTurn(); });
      return;
    }
    if (mid === 'butterBath') {
      let report = [];
      state.party.forEach(p => {
        const back = Math.floor(p.maxHP * 0.5);
        const before = p.hp;
        p.hp = Math.min(p.maxHP, p.hp + back);
        report.push(`${p.char.name} +${p.hp - before} HP`);
      });
      playFX('heal', 'player');
      queueDialogue(`${a.char.name} coats the party in BUTTER.`);
      queueDialogue(report.join(' · '));
      renderAll();
      playQueue(() => { afterPlayerTurn(); enemyTurn(); });
      return;
    }
    // Party-wide DEF buff
    if (mid === 'goodBoyAura') {
      state.buffs.def += 3;
      playFX('food', 'player');
      queueDialogue(`${a.char.name} radiates GOOD BOY AURA.`);
      queueDialogue('Party DEF rose for 3 turns!');
      renderAll();
      playQueue(() => { afterPlayerTurn(); enemyTurn(); });
      return;
    }

    const buffed = applyBuffs(a);
    let damageMul = 1;
    if (state.buffs.damageCharge) { damageMul = 2; state.buffs.damageCharge = false; }

    const hitCount = 1;
    let totalDmg = 0;
    let anyCrit = false, anyMult = 1;
    for (let h = 0; h < hitCount; h++) {
      const calc = calcDamage(buffed.atk, state.enemy.def, state.enemy.char.tag, m, true);
      let dmg = Math.floor(calc.dmg * damageMul);
      if (isScriptedHardCap()) dmg = Math.floor(dmg * 0.4);
      state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
      totalDmg += dmg;
      if (calc.crit) anyCrit = true;
      anyMult = calc.tagMult;
      if (h === 0) { playFX(m.type, 'player'); flashHit('enemy'); }
      else setTimeout(() => { playFX(m.type, 'player'); flashHit('enemy'); }, 200);
    }

    if (anyCrit) queueDialogue('CRITICAL HIT!');
    if (anyMult > 1.1) queueDialogue("It's super effective!");
    if (anyMult < 0.9) queueDialogue("It's not very effective...");
    if (damageMul > 1) queueDialogue('DAMAGE CHARGE doubled the hit!');
    if (hitCount > 1) queueDialogue(`Two hits landed!`);
    if (m.power > 0) queueDialogue(`Dealt ${totalDmg} damage.`);

    benchPassiveAttack();
    renderAll();
    checkPhaseShift();
    playQueue(() => {
      if (state.enemy.hp <= 0) return win();
      afterPlayerTurn();
      enemyTurn();
    });
  }

  function playerUseUtility(uid) {
    const a = active();
    const u = UTILITIES[uid];
    if (a.ep < u.ep) return;
    a.ep -= u.ep;
    dialogueQueue = [];
    queueDialogue(`${a.char.name} used ${u.name}!`);
    switch (u.effect) {
      case 'buff_def':
        state.buffs.def += 3;
        queueDialogue(`${a.char.name}'s DEFENSE rose!`);
        break;
      case 'buff_atk':
        state.buffs.atk += 3;
        queueDialogue(`${a.char.name}'s ATTACK rose!`);
        break;
      case 'heal':
        const restored = Math.floor(a.maxHP * 0.4);
        a.hp = Math.min(a.maxHP, a.hp + restored);
        queueDialogue(`Recovered ${restored} HP.`);
        break;
      case 'debuff_atk':
        state.debuffs.enemyAtk += 3;
        queueDialogue(`${state.enemy.char.name}'s ATTACK fell!`);
        break;
      case 'restore_ep':
        const epBack = Math.min(20, a.maxEP - a.ep);
        a.ep += epBack;
        queueDialogue(`Recovered ${epBack} EP.`);
        break;
    }
    renderAll();
    playQueue(() => { afterPlayerTurn(); enemyTurn(); });
  }

  function playerUseItem(id) {
    const a = active();
    Game.state.bag[id]--;
    dialogueQueue = [];
    let skipEnemy = false;

    switch (id) {
      case 'crumb': {
        const back = Math.min(40, a.maxHP - a.hp); a.hp += back;
        queueDialogue(`CRUMB. Recovered ${back} HP.`); break;
      }
      case 'pat': {
        const back = Math.min(75, a.maxHP - a.hp); a.hp += back;
        queueDialogue(`PAT OF BUTTER. +${back} HP.`); break;
      }
      case 'stack': {
        const back = Math.min(150, a.maxHP - a.hp); a.hp += back;
        queueDialogue(`PANCAKE STACK. +${back} HP.`); break;
      }
      case 'feast': {
        const back = a.maxHP - a.hp; a.hp = a.maxHP;
        queueDialogue(`BREAKFAST FEAST. Fully restored. +${back} HP.`); break;
      }
      case 'spark': {
        const back = Math.min(25, a.maxEP - a.ep); a.ep += back;
        queueDialogue(`SPARK. +${back} EP.`); break;
      }
      case 'jolt': {
        const back = Math.min(50, a.maxEP - a.ep); a.ep += back;
        queueDialogue(`JOLT. +${back} EP.`); break;
      }
      case 'capacitor': {
        const back = a.maxEP - a.ep; a.ep = a.maxEP;
        queueDialogue(`CAPACITOR. EP fully restored. +${back} EP.`); break;
      }
      case 'energy_drink': {
        state.buffs.atk += 3;
        queueDialogue('ENERGY DRINK. ATK rose for 3 turns.'); break;
      }
      case 'bacon_grease': {
        state.buffs.def += 3;
        queueDialogue('BACON GREASE. DEF rose for 3 turns.'); break;
      }
      case 'syrup_charge': {
        state.buffs.damageCharge = true;
        queueDialogue('SYRUP CHARGE armed. Next move 2x.'); break;
      }
      case 'cloak': {
        state.buffs.dodge = true;
        queueDialogue('NAPKIN CLOAK. Next enemy hit will miss.'); break;
      }
      case 'firecracker': {
        state.enemy.hp = Math.max(0, state.enemy.hp - 70);
        playFX('blast', 'player'); flashHit('enemy');
        queueDialogue('FIRECRACKER detonates. 70 fixed damage.'); break;
      }
      case 'm80': {
        state.enemy.hp = Math.max(0, state.enemy.hp - 130);
        playFX('blast', 'player'); flashHit('enemy');
        queueDialogue('M-80. 130 fixed damage.'); break;
      }
      case 'second_chance': {
        state.buffs.revive = true;
        queueDialogue('SECOND CHANCE armed. Triggers on fatal blow.'); break;
      }
      case 'phoenix_yolk': {
        state.buffs.phoenix = true;
        queueDialogue('PHOENIX YOLK ready. Auto-revive at 80% HP.'); break;
      }
      case 'field_kit': {
        state.party.forEach(p => { p.hp = p.maxHP; p.ep = p.maxEP; });
        queueDialogue('FIELD BREAKFAST. Party fully restored.'); break;
      }
      case 'time_chip': {
        skipEnemy = true;
        queueDialogue('TIME CHIP. You get another turn!'); break;
      }
    }

    // Player-targeted state checks
    if (state.enemy.hp <= 0) {
      renderAll(); Game.save();
      playQueue(() => win());
      return;
    }

    renderAll();
    Game.save();
    if (skipEnemy) {
      playQueue(() => showCmd('main'));
    } else {
      playQueue(() => { afterPlayerTurn(); enemyTurn(); });
    }
  }

  function applyBuffs(c) {
    return {
      atk: c.atk + (state.buffs.atk > 0 ? Math.floor(c.atk * 0.4) : 0),
      def: c.def + (state.buffs.def > 0 ? Math.floor(c.def * 0.4) : 0)
    };
  }

  function checkPhaseShift() {
    const e = state.enemy;
    const hpPct = e.hp / e.maxHP;
    if (e.char.midHpDialogue) {
      e.char.midHpDialogue.forEach((d, i) => {
        if (hpPct <= d.at && !state.firedDialogue.has('mid_' + i)) {
          state.firedDialogue.add('mid_' + i);
          queueDialogue(d.text);
        }
      });
    }
    if (e.char.phases) {
      // Find the deepest phase the enemy now qualifies for
      let target = state.phaseIdx;
      for (let i = e.char.phases.length - 1; i > state.phaseIdx; i--) {
        if (hpPct <= e.char.phases[i].threshold) { target = i; break; }
      }
      // Apply every skipped phase's effects, but only ONE banner at the end
      const wasAt = state.phaseIdx;
      while (state.phaseIdx < target) {
        state.phaseIdx++;
        const ph = e.char.phases[state.phaseIdx];
        e.moves = ph.moves.slice();
        if (ph.atkBuff) e.atk += ph.atkBuff;
        if (ph.spdBuff) e.spd += ph.spdBuff;
        queueDialogue(ph.text);
      }
      if (state.phaseIdx > wasAt) {
        showPhaseBanner('PHASE ' + (state.phaseIdx + 1));
      }
    }
  }

  function showPhaseBanner(text) {
    const el = document.getElementById('phase-banner');
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function afterPlayerTurn() {
    if (state.buffs.atk > 0) state.buffs.atk--;
    if (state.buffs.def > 0) state.buffs.def--;
    if (state.debuffs.enemyAtk > 0) state.debuffs.enemyAtk--;
    // Bench regen (slower if also active-attacking in multi-spawn)
    if (state.party.length > 1) {
      const b = bench();
      if (b.hp > 0) {
        const baseRegen = state.multiSpawn ? 0.015 : 0.03;
        const bonus = Game.state.permaBuffs?.global?.benchRegen || 0;
        b.hp = Math.min(b.maxHP, b.hp + Math.floor(b.maxHP * (baseRegen + bonus)));
        b.ep = Math.min(b.maxEP, b.ep + 1);
      }
    }
    state.turnCount++;
    renderAll();
  }

  // Passive bench attack — fires once per turn in multi-spawn battles
  function benchPassiveAttack() {
    if (!state.multiSpawn || state.party.length < 2) return null;
    const b = bench();
    if (!b || b.hp <= 0) return null;
    // Use the bench's cheapest move (power > 0)
    const usable = b.moves
      .map(mid => MOVES[mid])
      .filter(m => m && m.power > 0 && b.ep >= m.ep)
      .sort((a, c) => a.ep - c.ep);
    const m = usable[0];
    if (!m) return null;
    b.ep = Math.max(0, b.ep - m.ep);
    const calc = calcDamage(Math.floor(b.atk * 0.7), state.enemy.def, state.enemy.char.tag, m, true);
    const dmg = calc.dmg;
    state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
    playFX(m.type, 'player');
    flashHit('enemy');
    queueDialogue(`${b.char.name} (bench) also lands ${m.name} → ${dmg} dmg.`);
    return dmg;
  }

  function enemyTurn() {
    const e = state.enemy;
    const a = active();

    // SLOW CHANCE — boss winds up and skips its turn
    if (e.char.slowChance && Math.random() < e.char.slowChance) {
      dialogueQueue = [`${e.char.name} winds up — pausing to gather strength.`];
      renderAll();
      playQueue(() => showCmd('main'));
      return;
    }

    // SELF-HEAL — boss heals itself instead of attacking
    if (e.char.canHeal && e.hp < e.maxHP * e.char.healThreshold && Math.random() < e.char.healChance) {
      const back = Math.min(e.char.healAmount, e.maxHP - e.hp);
      e.hp += back;
      playFX('bio', 'enemy');
      dialogueQueue = [
        e.char.healDialogue || `${e.char.name} heals!`,
        `${e.char.name} recovered ${back} HP.`
      ];
      renderAll();
      playQueue(() => showCmd('main'));
      return;
    }

    const usable = e.moves.filter(mid => e.ep >= MOVES[mid].ep);
    const mid = usable.length ? usable[Math.floor(Math.random() * usable.length)] : 'punch';
    const m = MOVES[mid];
    e.ep = Math.max(0, e.ep - m.ep);

    const enemyAtk = e.atk - (state.debuffs.enemyAtk > 0 ? Math.floor(e.atk * 0.25) : 0);
    const playerBuff = applyBuffs(a);
    const calc = calcDamage(enemyAtk, playerBuff.def, a.char.tag, m);
    let dmg = calc.dmg;
    if (isScriptedHardCap()) dmg = Math.floor(dmg * 1.4);

    // Dodge (smoke bomb) — skips the hit entirely
    let dodged = false;
    if (state.buffs.dodge && dmg > 0) { dmg = 0; state.buffs.dodge = false; dodged = true; }

    let fullBlocked = false;
    let shieldUsed = false;

    playFX(m.type, 'enemy');
    a.hp = Math.max(0, a.hp - dmg);
    flashHit('player');

    dialogueQueue = [];
    queueDialogue(`${e.char.name} used ${m.name}!`);
    if (dodged) {
      queueDialogue(`${a.char.name} ducked behind a napkin — missed!`);
    } else {
      if (calc.crit) queueDialogue('CRITICAL HIT!');
      if (calc.tagMult > 1.1) queueDialogue("It's super effective!");
      if (calc.tagMult < 0.9) queueDialogue("It's not very effective...");
      if (m.power > 0) queueDialogue(`${a.char.name} took ${dmg} damage.`);
    }

    renderAll();
    playQueue(() => {
      if (a.hp <= 0) {
        if (state.buffs.phoenix) {
          state.buffs.phoenix = false;
          a.hp = Math.floor(a.maxHP * 0.80);
          dialogueQueue = ['PHOENIX YOLK cracks!', `${a.char.name} rises at 80% HP.`];
          renderAll();
          playQueue(() => showCmd('main'));
          return;
        }
        if (state.buffs.revive) {
          state.buffs.revive = false;
          a.hp = Math.floor(a.maxHP * 0.5);
          dialogueQueue = ['REVIVE triggered!', `${a.char.name} is back on their feet.`];
          renderAll();
          playQueue(() => showCmd('main'));
          return;
        }
        // Try auto-swap to bench if available and alive
        if (state.party.length > 1 && bench().hp > 0) {
          const fallen = a.char.name;
          const incoming = bench().char.name;
          state.activeIdx = 1 - state.activeIdx;
          dialogueQueue = [
            `${fallen} fell!`,
            `${incoming} tags in!`
          ];
          renderAll();
          playQueue(() => showCmd('main'));
          return;
        }
        return lose();
      }
      showCmd('main');
    });
  }

  function flashHit(who) {
    const spr = document.getElementById(who + '-sprite');
    spr.classList.add('hit');
    if (Game.state.settings.shake) {
      document.querySelector('.battle-stage').classList.add('shake');
      setTimeout(() => document.querySelector('.battle-stage').classList.remove('shake'), 400);
    }
    setTimeout(() => spr.classList.remove('hit'), 400);
  }

  // ============ ANIMATED FX ============
  function playFX(type, from) {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    const fromEnemy = from === 'enemy';
    // Map game move types → existing FX CSS classes
    const FX_ALIAS = {
      electric: 'energy',
      blast:    'cosmic',
      steel:    'tech',
      heal:     'bio',
      food:     'mental',
      physical: 'physical'
    };
    const typeKey = FX_ALIAS[type.toLowerCase()] || type.toLowerCase();
    const fromSuffix = fromEnemy ? ' from-enemy' : '';
    const spawn = (cls, ttl) => {
      const el = document.createElement('div');
      el.className = 'fx ' + cls;
      layer.appendChild(el);
      setTimeout(() => el.remove(), ttl);
      return el;
    };

    // 1. Screen-wide vignette flash
    spawn('fx-flash fx-flash-' + typeKey, 350);

    // 2. Charge halo at attacker's position
    spawn('fx-charge fx-charge-' + typeKey + fromSuffix, 450);

    // 3. Main move visual (after a brief charge delay)
    setTimeout(() => {
      spawn('fx-' + typeKey + fromSuffix, 900);

      // 4. Impact burst at target
      spawn('fx-impact fx-impact-' + typeKey + fromSuffix, 600);

      // 5. Particle ring (fewer, more distinct)
      const partCount = (typeKey === 'physical') ? 8 : (typeKey === 'cosmic' ? 10 : 6);
      for (let i = 0; i < partCount; i++) {
        const p = document.createElement('div');
        p.className = 'fx fx-particle fx-particle-' + typeKey + fromSuffix;
        const angle = (i / partCount) * 360 + (Math.random() * 30 - 15);
        const dist = 100 + Math.random() * 80;
        p.style.setProperty('--angle', angle + 'deg');
        p.style.setProperty('--dist', dist + 'px');
        p.style.animationDelay = (i * 0.02) + 's';
        layer.appendChild(p);
        setTimeout(() => p.remove(), 900);
      }

      // 6. Crack lines from impact — only for PHYSICAL / BLAST high-impact moves
      if (['physical', 'cosmic'].includes(typeKey)) {
        for (let i = 0; i < 3; i++) {
          const c = document.createElement('div');
          c.className = 'fx fx-crack fx-crack-' + typeKey + fromSuffix;
          c.style.setProperty('--rot', (i * 60 + Math.random() * 20 - 10) + 'deg');
          layer.appendChild(c);
          setTimeout(() => c.remove(), 700);
        }
      }
    }, 150);
  }

  function win() {
    const diff = Game.getDifficulty();
    const xpBase = state.enemy.char.xp;
    const xp = Math.floor(xpBase * diff.reward);
    const butterMult = Game.state.permaBuffs?.global?.butterMult || 1;
    const butter = Math.floor((state.enemy.char.butter || 0) * butterMult * diff.reward);
    Game.state.butter += butter;
    // XP to all party members who participated (active + bench)
    let anyLv = false;
    state.party.forEach(p => {
      const got = p === active() ? xp : Math.floor(xp * 0.5);
      if (Game.gainXP(p.char.id, got)) anyLv = true;
    });
    dialogueQueue = [
      `${state.enemy.char.name} was defeated!`,
      `Earned ${butter} BUTTER.`,
      `${active().char.name} gained ${xp} XP.`
    ];
    if (state.party.length > 1) dialogueQueue.push(`${bench().char.name} gained ${Math.floor(xp * 0.5)} XP (bench).`);
    if (anyLv) dialogueQueue.push('Level up!');
    renderAll();
    playQueue(() => {
      const unlocked = Game.markSceneWon(Game.state.currentScene);
      Game.save();
      state.onEnd({ win: true, lvUp: anyLv, xp, butter, unlockedDifficulty: unlocked });
    });
  }

  function lose() {
    dialogueQueue = [`${active().char.name} was defeated...`];
    if (state.scripted) {
      const butterMult = Game.state.permaBuffs?.global?.butterMult || 1;
      const reward = Math.floor((state.enemy.char.butter || 0) * butterMult);
      Game.state.butter += reward;
      dialogueQueue.push('The fight was always going to end this way.');
      if (reward > 0) dialogueQueue.push(`Earned ${reward} BUTTER from the encounter.`);
      renderAll();
      playQueue(() => {
        Game.markSceneWon(Game.state.currentScene);
        Game.save();
        state.onEnd({ win: false, scripted: true, butter: reward });
      });
      return;
    }
    const butterMult = Game.state.permaBuffs?.global?.butterMult || 1;
    const consolation = Math.floor((state.enemy.char.butter || 0) * 0.12 * butterMult);
    if (consolation > 0) {
      Game.state.butter += consolation;
      dialogueQueue.push(`Consolation pay: +${consolation} BUTTER.`);
    }
    dialogueQueue.push('Retreat to the kitchen. Regroup.');
    renderAll();
    playQueue(() => { Game.save(); state.onEnd({ win: false, butter: consolation }); });
  }

  function flee() {
    if (inputLocked) return;
    dialogueQueue = [`${active().char.name} fled the fight.`];
    playQueue(() => state.onEnd({ win: false, fled: true }));
  }

  function $(sel) { return document.querySelector(sel); }

  return {
    start, showCmd, flee, isLocked: () => inputLocked,
    startFlip, tapFlip, cashOutFlip
  };
})();
