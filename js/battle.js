// INVINCIBLE: SIMULATION — battle system v0.4
// Bugfix: combatant `def` (DEF stat) no longer collides with character ref (`char`).
// Adds: tag-team swap, animated move FX.

const Battle = (() => {
  let state = null;
  let dialogueQueue = [];
  let inputLocked = false;

  function start(party, enemyDef, onEnd) {
    // party is an array of char save objects: [active, bench]
    state = {
      party: party.map(p => buildCombatant(p, p.level || 1, true)),
      activeIdx: 0,
      enemy: buildEnemyCombatant(enemyDef),
      turnCount: 1,
      onEnd,
      buffs: { atk: 0, def: 0, shield: false, revive: false },
      debuffs: { enemyAtk: 0 },
      phaseIdx: 0,
      firedDialogue: new Set(),
      scripted: !!enemyDef.scripted
    };
    renderAll();
    dialogueQueue = [];
    inputLocked = false;
    queueDialogue(enemyDef.intro);
    queueDialogue(`A wild ${enemyDef.name} blocks your path!`);
    queueDialogue(`What will ${active().char.name} do?`);
    playQueue(() => showCmd('main'));
  }

  function active() { return state.party[state.activeIdx]; }
  function bench()  { return state.party[1 - state.activeIdx]; }

  function buildCombatant(charSave, lvl, isPlayer) {
    const c = CHARACTERS[charSave.id];
    const scale = 1 + (lvl - 1) * 0.12;
    return {
      char: c,
      lvl,
      maxHP: Math.floor(c.baseHP * scale),
      hp:    Math.floor(c.baseHP * scale),
      maxEP: c.baseEP,
      ep:    c.baseEP,
      atk: Math.floor(c.baseATK * scale),
      def: Math.floor(c.baseDEF * scale),
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
    return {
      char: def,
      lvl: '?',
      maxHP: def.hp, hp: def.hp,
      maxEP: def.ep, ep: def.ep,
      atk: def.atk, def: def.def, spd: def.spd,
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
    const step = () => {
      if (dialogueQueue.length === 0) {
        inputLocked = false;
        if (done) done();
        return;
      }
      setDialogue(dialogueQueue.shift());
      setTimeout(step, 1300);
    };
    step();
  }

  function hideAllCmds() {
    ['main','moves','utility','items','swap'].forEach(k => $('#cmd-' + k).classList.add('hidden'));
    $('#cmd-back').classList.add('hidden');
  }

  function showCmd(which) {
    hideAllCmds();
    $('#cmd-back').classList.toggle('hidden', which === 'main');
    if (which === 'main') {
      $('#cmd-main').classList.remove('hidden');
      setDialogue(`What will ${active().char.name} do?`);
      // Disable swap if no bench or bench fainted
      const swapBtn = $('#cmd-main [data-cmd="swap"]');
      if (swapBtn) {
        const benchOK = state.party.length > 1 && bench().hp > 0;
        swapBtn.disabled = !benchOK;
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

  function calcDamage(atkVal, defVal, defenderTag, move) {
    const base = move.power;
    if (base === 0) return { dmg: 0, tagMult: 1, crit: false };
    const ratio = atkVal / Math.max(1, defVal);
    const tagMult = (TYPE_CHART[move.type] && TYPE_CHART[move.type][defenderTag]) || 1;
    const variance = 0.85 + Math.random() * 0.3;
    const crit = Math.random() < 0.0625 ? 1.5 : 1;
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

    // Special: shield wall — defensive, doesn't damage
    if (mid === 'shieldWall') {
      state.buffs.shield = true;
      playFX('energy', 'player');
      queueDialogue(`${a.char.name} raised a SHIELD WALL!`);
      queueDialogue('Next incoming hit will be halved.');
      renderAll();
      playQueue(() => { afterPlayerTurn(); enemyTurn(); });
      return;
    }

    const buffed = applyBuffs(a);
    const calc = calcDamage(buffed.atk, state.enemy.def, state.enemy.char.tag, m);
    let dmg = calc.dmg;
    if (state.enemy.char.name === 'OMNI-BUNNY') dmg = Math.floor(dmg * 0.4);

    playFX(m.type, 'player');
    state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
    flashHit('enemy');

    if (calc.crit) queueDialogue('CRITICAL HIT!');
    if (calc.tagMult > 1.1) queueDialogue("It's super effective!");
    if (calc.tagMult < 0.9) queueDialogue("It's not very effective...");
    if (m.power > 0) queueDialogue(`Dealt ${dmg} damage.`);

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
    if (id === 'stim') {
      const back = Math.min(50, a.maxHP - a.hp);
      a.hp += back;
      queueDialogue(`Used GDA STIM. Recovered ${back} HP.`);
    } else if (id === 'patch') {
      const back = Math.min(30, a.maxHP - a.hp);
      a.hp += back;
      a.ep = Math.min(a.maxEP, a.ep + 10);
      queueDialogue(`Used AURA PATCH. +${back} HP, +10 EP.`);
    } else if (id === 'revive') {
      state.buffs.revive = true;
      queueDialogue('REVIVE armed. Will trigger on fatal blow.');
    }
    renderAll();
    Game.save();
    playQueue(() => { afterPlayerTurn(); enemyTurn(); });
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
      for (let i = e.char.phases.length - 1; i > state.phaseIdx; i--) {
        const ph = e.char.phases[i];
        if (hpPct <= ph.threshold) {
          state.phaseIdx = i;
          e.moves = ph.moves.slice();
          if (ph.atkBuff) e.atk += ph.atkBuff;
          if (ph.spdBuff) e.spd += ph.spdBuff;
          showPhaseBanner('PHASE ' + (i + 1));
          queueDialogue(ph.text);
          break;
        }
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
    // Bench regen
    if (state.party.length > 1) {
      const b = bench();
      if (b.hp > 0) {
        b.hp = Math.min(b.maxHP, b.hp + Math.floor(b.maxHP * 0.05));
        b.ep = Math.min(b.maxEP, b.ep + 2);
      }
    }
    state.turnCount++;
    renderAll();
  }

  function enemyTurn() {
    const e = state.enemy;
    const a = active();
    const usable = e.moves.filter(mid => e.ep >= MOVES[mid].ep);
    const mid = usable.length ? usable[Math.floor(Math.random() * usable.length)] : 'punch';
    const m = MOVES[mid];
    e.ep = Math.max(0, e.ep - m.ep);

    const enemyAtk = e.atk - (state.debuffs.enemyAtk > 0 ? Math.floor(e.atk * 0.25) : 0);
    const playerBuff = applyBuffs(a);
    const calc = calcDamage(enemyAtk, playerBuff.def, a.char.tag, m);
    let dmg = calc.dmg;
    if (state.enemy.char.name === 'OMNI-BUNNY') dmg = Math.floor(dmg * 1.4);

    // Shield consumes here — halve the hit and drop the shield
    let shieldUsed = false;
    if (state.buffs.shield && dmg > 0) {
      dmg = Math.floor(dmg / 2);
      state.buffs.shield = false;
      shieldUsed = true;
    }

    playFX(m.type, 'enemy');
    a.hp = Math.max(0, a.hp - dmg);
    flashHit('player');

    dialogueQueue = [];
    queueDialogue(`${e.char.name} used ${m.name}!`);
    if (calc.crit) queueDialogue('CRITICAL HIT!');
    if (calc.tagMult > 1.1) queueDialogue("It's super effective!");
    if (calc.tagMult < 0.9) queueDialogue("It's not very effective...");
    if (shieldUsed) queueDialogue('SHIELD WALL absorbed half the hit!');
    if (m.power > 0) queueDialogue(`${a.char.name} took ${dmg} damage.`);

    renderAll();
    playQueue(() => {
      if (a.hp <= 0) {
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
    const fx = document.createElement('div');
    const cls = 'fx fx-' + type.toLowerCase() + (from === 'enemy' ? ' from-enemy' : '');
    fx.className = cls;
    layer.appendChild(fx);
    setTimeout(() => fx.remove(), 900);

    // Impact dust on every hit
    const impact = document.createElement('div');
    impact.className = 'fx fx-impact' + (from === 'enemy' ? ' from-enemy' : '');
    layer.appendChild(impact);
    setTimeout(() => impact.remove(), 500);
  }

  function win() {
    const xp = state.enemy.char.xp;
    const gda = state.enemy.char.gda;
    Game.state.gda += gda;
    // XP to all party members who participated (active + bench if not fainted from start)
    let anyLv = false;
    state.party.forEach(p => {
      const got = p === active() ? xp : Math.floor(xp * 0.5);
      if (Game.gainXP(p.char.id, got)) anyLv = true;
    });
    dialogueQueue = [
      `${state.enemy.char.name} was defeated!`,
      `Earned ${gda} GDA credits.`,
      `${active().char.name} gained ${xp} XP.`
    ];
    if (state.party.length > 1) dialogueQueue.push(`${bench().char.name} gained ${Math.floor(xp * 0.5)} XP (bench).`);
    if (anyLv) dialogueQueue.push('Level up!');
    renderAll();
    playQueue(() => {
      Game.markSceneWon(Game.state.currentScene);
      Game.save();
      state.onEnd({ win: true, lvUp: anyLv, xp, gda });
    });
  }

  function lose() {
    dialogueQueue = [`${active().char.name} was defeated...`];
    if (state.scripted) {
      dialogueQueue.push('The fight was always going to end this way.');
      renderAll();
      playQueue(() => {
        Game.markSceneWon(Game.state.currentScene);
        Game.save();
        state.onEnd({ win: false, scripted: true });
      });
      return;
    }
    dialogueQueue.push('Retreat to base. Regroup.');
    renderAll();
    playQueue(() => state.onEnd({ win: false }));
  }

  function flee() {
    if (inputLocked) return;
    dialogueQueue = [`${active().char.name} fled the fight.`];
    playQueue(() => state.onEnd({ win: false, fled: true }));
  }

  function $(sel) { return document.querySelector(sel); }

  return { start, showCmd, flee, isLocked: () => inputLocked };
})();
