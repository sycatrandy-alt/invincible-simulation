// INVINCIBLE: SIMULATION — battle system v0.4
// Bugfix: combatant `def` (DEF stat) no longer collides with character ref (`char`).
// Adds: tag-team swap, animated move FX.

const Battle = (() => {
  let state = null;
  let dialogueQueue = [];
  let inputLocked = false;

  const isOmniBunny = () => state && state.enemy && state.enemy.char.name === 'OMNI-BUNNY';

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
    playBGM(enemyDef);
    renderAll();
    dialogueQueue = [];
    inputLocked = false;
    queueDialogue(enemyDef.intro);
    queueDialogue(`A wild ${enemyDef.name} blocks your path!`);
    queueDialogue(`What will ${active().char.name} do?`);
    playQueue(() => showCmd('main'));
  }

  function playBGM(enemyDef) {
    const battleBgm = document.getElementById('battle-bgm');
    const conquestBgm = document.getElementById('conquest-bgm');
    const vol = Math.max(0, Math.min(1, (Game.state.settings.vol || 70) / 100));
    const isConquest = enemyDef && (enemyDef.name === 'CONQUEST' || enemyDef.sprite === 'assets/conquest.png');
    const bgm   = isConquest ? conquestBgm : battleBgm;
    const other = isConquest ? battleBgm : conquestBgm;
    const trackLabel = isConquest ? 'CONQUEST THEME' : 'BATTLE THEME';

    console.log('[BGM] Enemy:', enemyDef && enemyDef.name, '→ Playing:', trackLabel);
    const ind = document.getElementById('bgm-indicator');
    if (ind) ind.textContent = '♪ ' + trackLabel;

    if (other) { other.pause(); other.currentTime = 0; }
    if (bgm) {
      bgm.volume = vol;
      bgm.currentTime = 0;
      bgm.load(); // force re-load in case cache served wrong file
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

  function calcDamage(atkVal, defVal, defenderTag, move, attackerIsPlayer=false) {
    const base = move.power;
    if (base === 0) return { dmg: 0, tagMult: 1, crit: false };
    const ratio = atkVal / Math.max(1, defVal);
    const tagMult = (TYPE_CHART[move.type] && TYPE_CHART[move.type][defenderTag]) || 1;
    const variance = 0.85 + Math.random() * 0.3;
    const critBonus = attackerIsPlayer ? (Game.state.permaBuffs?.global?.critRate || 0) : 0;
    const crit = Math.random() < (0.0625 + critBonus) ? 1.5 : 1;
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

    // Defensive moves
    if (mid === 'shieldWall') {
      state.buffs.shield = true;
      playFX('energy', 'player');
      queueDialogue(`${a.char.name} raised a SHIELD WALL!`);
      queueDialogue('Next incoming hit will be halved.');
      renderAll();
      playQueue(() => { afterPlayerTurn(); enemyTurn(); });
      return;
    }
    if (mid === 'pinkShield') {
      state.buffs.fullBlock = true;
      playFX('cosmic', 'player');
      queueDialogue(`${a.char.name} formed a PINK SHIELD!`);
      queueDialogue('Next incoming hit will be fully blocked.');
      renderAll();
      playQueue(() => { afterPlayerTurn(); enemyTurn(); });
      return;
    }
    // Healing move
    if (mid === 'healingPulse') {
      const back = Math.floor(a.maxHP * 0.6);
      a.hp = Math.min(a.maxHP, a.hp + back);
      playFX('bio', 'player');
      queueDialogue(`${a.char.name} pulses with healing light.`);
      queueDialogue(`Recovered ${back} HP.`);
      renderAll();
      playQueue(() => { afterPlayerTurn(); enemyTurn(); });
      return;
    }

    const buffed = applyBuffs(a);
    let damageMul = 1;
    if (state.buffs.damageCharge) { damageMul = 2; state.buffs.damageCharge = false; }

    const hitCount = (mid === 'doubleStrike') ? 2 : 1;
    let totalDmg = 0;
    let anyCrit = false, anyMult = 1;
    for (let h = 0; h < hitCount; h++) {
      const calc = calcDamage(buffed.atk, state.enemy.def, state.enemy.char.tag, m, true);
      let dmg = Math.floor(calc.dmg * damageMul);
      if (isOmniBunny()) dmg = Math.floor(dmg * 0.4);
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
      case 'stim': {
        const back = Math.min(50, a.maxHP - a.hp); a.hp += back;
        queueDialogue(`Used GDA STIM. Recovered ${back} HP.`); break;
      }
      case 'patch': {
        const back = Math.min(30, a.maxHP - a.hp); a.hp += back;
        a.ep = Math.min(a.maxEP, a.ep + 10);
        queueDialogue(`Used AURA PATCH. +${back} HP, +10 EP.`); break;
      }
      case 'mega_stim': {
        const back = Math.min(100, a.maxHP - a.hp); a.hp += back;
        queueDialogue(`Used MEGA STIM. Recovered ${back} HP.`); break;
      }
      case 'ultra_stim': {
        const back = a.maxHP - a.hp; a.hp = a.maxHP;
        queueDialogue(`ULTRA STIM. Fully restored. +${back} HP.`); break;
      }
      case 'elixir': {
        a.hp = a.maxHP; a.ep = a.maxEP;
        queueDialogue('ELIXIR — full restore.'); break;
      }
      case 'focus_tab': {
        const back = Math.min(20, a.maxEP - a.ep); a.ep += back;
        queueDialogue(`FOCUS TAB. +${back} EP.`); break;
      }
      case 'battery': {
        const back = Math.min(40, a.maxEP - a.ep); a.ep += back;
        queueDialogue(`BATTERY CELL. +${back} EP.`); break;
      }
      case 'mind_link': {
        const back = a.maxEP - a.ep; a.ep = a.maxEP;
        queueDialogue(`MIND LINK. EP fully restored. +${back} EP.`); break;
      }
      case 'berserker': {
        state.buffs.atk += 3;
        queueDialogue('BERSERKER BREW. ATK rose for 3 turns.'); break;
      }
      case 'iron_skin': {
        state.buffs.def += 3;
        queueDialogue('IRON SKIN. DEF rose for 3 turns.'); break;
      }
      case 'damage_chg': {
        state.buffs.damageCharge = true;
        queueDialogue('DAMAGE CHARGE armed. Next move 2x.'); break;
      }
      case 'smoke_bomb': {
        state.buffs.dodge = true;
        queueDialogue('SMOKE BOMB. Next enemy hit will miss.'); break;
      }
      case 'emp_nade': {
        state.enemy.hp = Math.max(0, state.enemy.hp - 80);
        playFX('tech', 'player'); flashHit('enemy');
        queueDialogue('EMP GRENADE detonates. 80 fixed damage.'); break;
      }
      case 'thermite': {
        state.enemy.hp = Math.max(0, state.enemy.hp - 120);
        playFX('physical', 'player'); flashHit('enemy');
        queueDialogue('THERMITE CHARGE. 120 fixed damage.'); break;
      }
      case 'antidote': {
        const back = Math.min(40, a.maxHP - a.hp);
        a.hp += back;
        queueDialogue(`ANTIDOTE. Recovered ${back} HP.`);
        break;
      }
      case 'second_wind': {
        state.buffs.atk = 0; state.buffs.def = 0; state.debuffs.enemyAtk = 0;
        const back = Math.min(30, a.maxHP - a.hp); a.hp += back;
        queueDialogue(`SECOND WIND. All effects cleared. +${back} HP.`); break;
      }
      case 'revive': {
        state.buffs.revive = true;
        queueDialogue('REVIVE armed. Triggers on fatal blow.'); break;
      }
      case 'phoenix': {
        state.buffs.phoenix = true;
        queueDialogue('PHOENIX DOWN ready. Auto-revive at 75% HP.'); break;
      }
      case 'gda_kit': {
        state.party.forEach(p => { p.hp = p.maxHP; p.ep = p.maxEP; });
        queueDialogue('GDA FIELD KIT. Party fully restored.'); break;
      }
      case 'time_shard': {
        skipEnemy = true;
        queueDialogue('TIME SHARD. You get another turn!'); break;
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
      // Apply every phase the enemy skipped on the way down (accumulate buffs)
      while (state.phaseIdx < target) {
        state.phaseIdx++;
        const ph = e.char.phases[state.phaseIdx];
        e.moves = ph.moves.slice();
        if (ph.atkBuff) e.atk += ph.atkBuff;
        if (ph.spdBuff) e.spd += ph.spdBuff;
        showPhaseBanner('PHASE ' + (state.phaseIdx + 1));
        queueDialogue(ph.text);
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
    if (isOmniBunny()) dmg = Math.floor(dmg * 1.4);

    // Dodge (smoke bomb) — skips the hit entirely
    let dodged = false;
    if (state.buffs.dodge && dmg > 0) { dmg = 0; state.buffs.dodge = false; dodged = true; }

    // Full block (pink shield)
    let fullBlocked = false;
    if (!dodged && state.buffs.fullBlock && dmg > 0) { dmg = 0; state.buffs.fullBlock = false; fullBlocked = true; }

    // Shield wall — halve the hit
    let shieldUsed = false;
    if (!dodged && !fullBlocked && state.buffs.shield && dmg > 0) {
      dmg = Math.floor(dmg / 2);
      state.buffs.shield = false;
      shieldUsed = true;
    }

    playFX(m.type, 'enemy');
    a.hp = Math.max(0, a.hp - dmg);
    flashHit('player');

    dialogueQueue = [];
    queueDialogue(`${e.char.name} used ${m.name}!`);
    if (dodged) {
      queueDialogue(`${a.char.name} vanished in smoke — missed!`);
    } else if (fullBlocked) {
      queueDialogue('PINK SHIELD fully blocked the hit!');
    } else {
      if (calc.crit) queueDialogue('CRITICAL HIT!');
      if (calc.tagMult > 1.1) queueDialogue("It's super effective!");
      if (calc.tagMult < 0.9) queueDialogue("It's not very effective...");
      if (shieldUsed) queueDialogue('SHIELD WALL absorbed half the hit!');
      if (m.power > 0) queueDialogue(`${a.char.name} took ${dmg} damage.`);
    }

    renderAll();
    playQueue(() => {
      if (a.hp <= 0) {
        if (state.buffs.phoenix) {
          state.buffs.phoenix = false;
          a.hp = Math.floor(a.maxHP * 0.75);
          dialogueQueue = ['PHOENIX DOWN ignites!', `${a.char.name} rises at 75% HP.`];
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
    const typeKey = type.toLowerCase();
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

      // 5. Particle ring radiating from target
      const partCount = (typeKey === 'physical') ? 12 : (typeKey === 'cosmic' ? 14 : (typeKey === 'energy' ? 10 : 8));
      for (let i = 0; i < partCount; i++) {
        const p = document.createElement('div');
        p.className = 'fx fx-particle fx-particle-' + typeKey + fromSuffix;
        const angle = (i / partCount) * 360 + Math.random() * 20;
        const dist = 80 + Math.random() * 120;
        p.style.setProperty('--angle', angle + 'deg');
        p.style.setProperty('--dist', dist + 'px');
        p.style.animationDelay = (i * 0.015) + 's';
        layer.appendChild(p);
        setTimeout(() => p.remove(), 900);
      }

      // 6. Crack lines from impact (for high-impact types)
      if (['physical', 'cosmic'].includes(typeKey)) {
        for (let i = 0; i < 4; i++) {
          const c = document.createElement('div');
          c.className = 'fx fx-crack fx-crack-' + typeKey + fromSuffix;
          c.style.setProperty('--rot', (i * 45 + Math.random() * 30 - 15) + 'deg');
          layer.appendChild(c);
          setTimeout(() => c.remove(), 700);
        }
      }
    }, 150);
  }

  function win() {
    const xp = state.enemy.char.xp;
    const gdaMult = Game.state.permaBuffs?.global?.gdaMult || 1;
    const gda = Math.floor(state.enemy.char.gda * gdaMult);
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
      // Scripted-loss tutorial: still pays the full reward — you completed story progress
      const gdaMult = Game.state.permaBuffs?.global?.gdaMult || 1;
      const reward = Math.floor((state.enemy.char.gda || 0) * gdaMult);
      Game.state.gda += reward;
      dialogueQueue.push('The fight was always going to end this way.');
      if (reward > 0) dialogueQueue.push(`Earned ${reward} GDA from the encounter.`);
      renderAll();
      playQueue(() => {
        Game.markSceneWon(Game.state.currentScene);
        Game.save();
        state.onEnd({ win: false, scripted: true, gda: reward });
      });
      return;
    }
    // Normal loss: consolation 25% of would-be reward (rounded down) so progress isn't zero
    const gdaMult = Game.state.permaBuffs?.global?.gdaMult || 1;
    const consolation = Math.floor((state.enemy.char.gda || 0) * 0.25 * gdaMult);
    if (consolation > 0) {
      Game.state.gda += consolation;
      dialogueQueue.push(`Consolation pay: +${consolation} GDA from GDA emergency fund.`);
    }
    dialogueQueue.push('Retreat to base. Regroup.');
    renderAll();
    playQueue(() => { Game.save(); state.onEnd({ win: false, gda: consolation }); });
  }

  function flee() {
    if (inputLocked) return;
    dialogueQueue = [`${active().char.name} fled the fight.`];
    playQueue(() => state.onEnd({ win: false, fled: true }));
  }

  function $(sel) { return document.querySelector(sel); }

  return { start, showCmd, flee, isLocked: () => inputLocked };
})();
