/**
 * ROYAL ARENA ESPORTS // CLASH ROYALE CLIENT ENGINE
 * Features:
 * - Hardware-accelerated Canvas Particle & Projectile FX Engine
 * - Floating Combat Text & Dynamic Damage Numbers
 * - High-Fidelity Procedural Web Audio Synthesis (zero external asset latency)
 * - Screen Shake, Death Poofs, and Dynamic Attack Animations
 * - Real-time WebSocket Match Sync, Knockout Tournament Tree & Multi-Laptop JSON Sync
 */

// Global Match & Application State
let currentMatchState = null;
let currentTourneyState = null;
let ws = null;
let soundEnabled = true;
let masterVolume = 0.75;
let audioCtx = null;
let masterGain = null;
let lastLogCount = 0;
let victoryModalDismissed = false;
let lastMatchStatus = null;
let processedEventCount = 0;
let lastProcessedRound = -1;

// Card Catalog Definition for Client
const CARD_PROTOS = {
  knight: { name: 'Knight', elixir: 3, icon: '🗡️', type: 'Melee Brawler', hp: 850, dmg: 95, desc: 'Tough frontline melee fighter. Solid damage and excellent counter-push potential.' },
  archers: { name: 'Archers', elixir: 3, icon: '🏹', type: 'Sharpshooter Pair', hp: 280, dmg: 55, desc: 'Pair of sharpshooters. Snipes ground and air threats from safe distance.' },
  giant: { name: 'Giant', elixir: 5, icon: '🗿', type: 'Siege Tank', hp: 2200, dmg: 110, desc: 'Colossal siege tank that marches straight for enemy towers, ignoring distractions.' },
  musketeer: { name: 'Musketeer', elixir: 4, icon: '🔫', type: 'Precision Sniper', hp: 420, dmg: 120, desc: 'Long-range boomstick specialist. Shreds incoming tanks from behind friendly lines.' },
  hog_rider: { name: 'Hog Rider', elixir: 4, icon: '🐗', type: 'Tower Rusher', hp: 750, dmg: 120, desc: 'Fast hammer-wielding tower rusher. Jumps the bridge and chips the crown tower!' },
  skeletons: { name: 'Skeleton Army', elixir: 2, icon: '💀', type: 'Distraction Swarm', hp: 65, dmg: 50, desc: 'Bony distraction swarm. Overwhelms single-target tanks like the Giant and Knight.' },
  baby_dragon: { name: 'Baby Dragon', elixir: 4, icon: '🐲', type: 'Air Splash', hp: 800, dmg: 85, desc: 'Flying splash-damage dragon. Spits fireballs that vaporize swarms.' },
  pekka: { name: 'P.E.K.K.A', elixir: 7, icon: '🤖', type: 'Heavy Armor Titan', hp: 2600, dmg: 420, desc: 'Heavily armored mechanical beast. Obliterates tanks with catastrophic sword strikes.' },
  fireball: { name: 'Fireball', elixir: 4, icon: '🔥', type: 'Direct Spell', hp: '-', dmg: 360, desc: 'Direct spell blast. Incinerates enemy troop clusters or finishes off damaged towers.' },
  goblin_barrel: { name: 'Goblin Barrel', elixir: 3, icon: '🪵', type: 'Tower Flank Spell', hp: 100, dmg: 60, desc: 'Direct tower assault. Launches 3 dagger goblins right onto the enemy Princess Tower!' }
};

// ==============================================================
// 1. PROCEDURAL WEB AUDIO SYNTHESIS ENGINE
// ==============================================================
function initAudio() {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function setMasterVolume(val) {
  masterVolume = Math.max(0, Math.min(1, parseFloat(val)));
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
  }
}

function playClashSound(type) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx || !masterGain) return;

    const now = audioCtx.currentTime;

    // 1. Sword Melee Clash
    if (type === 'sword') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.12);

      // Noise burst for steel impact
      createNoiseBurst(now, 0.08, 0.12, 1800);
    }
    // 2. Cannon Detonation / Explosion
    else if (type === 'cannon' || type === 'explosion') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.38);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.38);

      createNoiseBurst(now, 0.28, 0.22, 450);
    }
    // 3. Fireball Whistle & Blast
    else if (type === 'fireball') {
      createNoiseBurst(now, 0.24, 0.25, 600);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    }
    // 4. Arrow Shot
    else if (type === 'arrow') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.09);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.09);
    }
    // 5. Troop Deploy Chime
    else if (type === 'deploy') {
      const notes = [392.00, 523.25]; // G4, C5
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.15, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.18);
      });
    }
    // 6. Crown Horn / Royal Fanfare
    else if (type === 'crown' || type === 'horn') {
      const chord = [293.66, 369.99, 440.00, 587.33]; // D, F#, A, D
      chord.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.2, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.09 + 0.55);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.55);
      });
    }
    // 7. Double Elixir Charge
    else if (type === 'double_elixir') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.45);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.45);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (e) {
    // Autoplay policy or context error
  }
}

function createNoiseBurst(startTime, duration, volume, filterFreq) {
  if (!audioCtx || !masterGain) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const whiteNoise = audioCtx.createBufferSource();
  whiteNoise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, startTime);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  whiteNoise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  whiteNoise.start(startTime);
  whiteNoise.stop(startTime + duration);
}

// ==============================================================
// 2. HARDWARE-ACCELERATED FX CANVAS & PARTICLE ENGINE
// ==============================================================
class ArenaFxEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.damageNumbers = [];
    this.projectiles = [];
    this.particles = [];
    this.animFrameId = null;
    this.lastTime = performance.now();

    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.startLoop();
    }
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
  }

  startLoop() {
    const loop = (timestamp) => {
      const dt = (timestamp - this.lastTime) / 1000.0;
      this.lastTime = timestamp;
      this.update(dt);
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  // Spawn Floating Damage Text
  addDamageText(xPct, yPct, amount, isCrit = false) {
    const px = (xPct / 100.0) * this.width;
    const py = (yPct / 100.0) * this.height;
    this.damageNumbers.push({
      x: px,
      y: py,
      text: `-${amount}`,
      color: isCrit ? '#f59e0b' : '#ef4444',
      size: isCrit ? 18 : 13,
      alpha: 1.0,
      life: 0.9,
      maxLife: 0.9,
      vy: -35 - Math.random() * 15,
      vx: (Math.random() - 0.5) * 10
    });
  }

  // Spawn Flying Projectile
  addProjectile(kind, fromXPct, fromYPct, toXPct, toYPct, damage) {
    const startX = (fromXPct / 100.0) * this.width;
    const startY = (fromYPct / 100.0) * this.height;
    const endX = (toXPct / 100.0) * this.width;
    const endY = (toYPct / 100.0) * this.height;

    this.projectiles.push({
      kind,
      startX, startY,
      endX, endY,
      x: startX, y: startY,
      progress: 0.0,
      speed: kind === 'fireball' ? 1.4 : (kind === 'barrel' ? 1.1 : 2.5),
      damage,
      trail: []
    });
  }

  // Spawn Particle Cloud (Death Poofs / Explosions)
  addExplosion(x, y, color = '#f59e0b', count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 4,
        alpha: 1.0,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8
      });
    }
  }

  addElixirPoof(xPct, yPct) {
    const px = (xPct / 100.0) * this.width;
    const py = (yPct / 100.0) * this.height;
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: px + (Math.random() - 0.5) * 16,
        y: py + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 20,
        vy: -25 - Math.random() * 25,
        color: '#d946ef',
        radius: 3 + Math.random() * 3,
        alpha: 0.85,
        life: 0.6,
        maxLife: 0.6
      });
    }
  }

  update(dt) {
    // 1. Damage Numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.alpha = Math.max(0, d.life / d.maxLife);
      if (d.life <= 0) this.damageNumbers.splice(i, 1);
    }

    // 2. Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += p.speed * dt;
      const t = Math.min(1.0, p.progress);

      p.x = p.startX + (p.endX - p.startX) * t;
      // Arc height
      const arcHeight = p.kind === 'barrel' ? 80 : (p.kind === 'fireball' ? 35 : 0);
      p.y = p.startY + (p.endY - p.startY) * t - Math.sin(t * Math.PI) * arcHeight;

      // Add trail point
      p.trail.push({ x: p.x, y: p.y, alpha: 1.0 });
      if (p.trail.length > 8) p.trail.shift();

      if (p.progress >= 1.0) {
        // Projectile reached target!
        if (p.kind === 'fireball') {
          this.addExplosion(p.endX, p.endY, '#f97316', 24);
          triggerScreenShake(7);
          playClashSound('fireball');
        } else if (p.kind === 'barrel') {
          this.addExplosion(p.endX, p.endY, '#854d0e', 14);
          playClashSound('cannon');
        } else if (p.kind === 'cannon') {
          this.addExplosion(p.endX, p.endY, '#f59e0b', 16);
          triggerScreenShake(5);
        }
        this.projectiles.splice(i, 1);
      }
    }

    // 3. Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.alpha = Math.max(0, part.life / part.maxLife);
      if (part.life <= 0) this.particles.splice(i, 1);
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Render Projectiles
    this.projectiles.forEach(p => {
      // Trail
      this.ctx.save();
      for (let i = 0; i < p.trail.length; i++) {
        const tr = p.trail[i];
        this.ctx.beginPath();
        this.ctx.arc(tr.x, tr.y, (i + 1) * 0.8, 0, Math.PI * 2);
        this.ctx.fillStyle = p.kind === 'fireball' ? `rgba(249, 115, 22, ${i / p.trail.length * 0.6})` : `rgba(255, 255, 255, ${i / p.trail.length * 0.4})`;
        this.ctx.fill();
      }

      // Projectile Core
      this.ctx.beginPath();
      if (p.kind === 'fireball') {
        this.ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ea580c';
        this.ctx.shadowColor = '#f97316';
        this.ctx.shadowBlur = 12;
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fef08a';
        this.ctx.fill();
      } else if (p.kind === 'barrel') {
        this.ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        this.ctx.fillStyle = '#854d0e';
        this.ctx.fill();
      } else if (p.kind === 'cannon') {
        this.ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fill();
      } else {
        // Arrow
        this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.fill();
      }
      this.ctx.restore();
    });

    // 2. Render Particles
    this.particles.forEach(part => {
      this.ctx.save();
      this.ctx.globalAlpha = part.alpha;
      this.ctx.beginPath();
      this.ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = part.color;
      this.ctx.fill();
      this.ctx.restore();
    });

    // 3. Render Damage Numbers
    this.damageNumbers.forEach(d => {
      this.ctx.save();
      this.ctx.globalAlpha = d.alpha;
      this.ctx.font = `800 ${d.size}px 'JetBrains Mono', sans-serif`;
      this.ctx.textAlign = 'center';
      // Shadow / Outline
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      this.ctx.lineWidth = 3;
      this.ctx.strokeText(d.text, d.x, d.y);
      this.ctx.fillStyle = d.color;
      this.ctx.fillText(d.text, d.x, d.y);
      this.ctx.restore();
    });
  }
}

let fxEngine = null;

function triggerScreenShake(intensity = 6) {
  const pitch = document.getElementById('clashPitch');
  if (!pitch) return;
  const originalTransform = pitch.style.transform || '';
  const xOffset = (Math.random() - 0.5) * intensity;
  const yOffset = (Math.random() - 0.5) * intensity;
  pitch.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
  setTimeout(() => {
    pitch.style.transform = originalTransform;
  }, 120);
}

// ==============================================================
// 3. WEBSOCKET SYNC & ARENA STATE MANAGEMENT
// ==============================================================
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/arena`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[Royal Arena] WebSocket connected to match orchestrator.');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.status) {
        renderState(data);
      }
      if (data.tournament) {
        currentTourneyState = data.tournament;
        renderBracket(data.tournament);
      }
    } catch (e) {
      console.error('[Royal Arena] State parse error:', e);
    }
  };

  ws.onclose = () => {
    setTimeout(connectWebSocket, 2000);
  };
}

function renderState(state) {
  currentMatchState = state;

  const red = state.players ? state.players.red : (state.kingdoms ? state.kingdoms.red : {});
  const blue = state.players ? state.players.blue : (state.kingdoms ? state.kingdoms.blue : {});

  // 1. Status & Timer Display
  const elStatus = document.getElementById('matchStatusBadge');
  if (elStatus) {
    let statusText = state.status.toUpperCase();
    if (state.is_overtime) statusText = 'OVERTIME';
    else if (state.is_double_elixir) statusText = '2X ELIXIR';
    elStatus.textContent = statusText;
    elStatus.className = `match-status-badge ${state.status}`;
  }

  const elTimer = document.getElementById('matchTimer');
  if (elTimer) {
    const remainingSeconds = Math.max(0, state.max_duration_seconds - state.elapsed_seconds);
    const mins = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(remainingSeconds % 60).toString().padStart(2, '0');
    elTimer.textContent = `${mins}:${secs}`;
    if (remainingSeconds <= 30 && state.status === 'running') {
      elTimer.style.color = '#ef4444';
    } else {
      elTimer.style.color = '#fff';
    }
  }

  // 2. Crown Scoreboard
  setElText('scoreRedCrowns', red.crowns || 0);
  setElText('scoreBlueCrowns', blue.crowns || 0);
  setElText('redCrownDisplay', `👑 ${red.crowns || 0}`);
  setElText('blueCrownDisplay', `👑 ${blue.crowns || 0}`);

  // 3. Double Elixir Banner Pill
  const elDoublePill = document.getElementById('doubleElixirBadge');
  if (elDoublePill) {
    if (state.is_double_elixir) {
      elDoublePill.textContent = '⚡ 2X DOUBLE ELIXIR!';
      elDoublePill.classList.add('active');
    } else {
      elDoublePill.textContent = '1X REGULATION ELIXIR';
      elDoublePill.classList.remove('active');
    }
  }

  // 4. Spectator Control Buttons
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  if (btnStart && btnPause) {
    if (state.status === 'running') {
      btnStart.disabled = true;
      btnPause.disabled = false;
      btnPause.textContent = '⏸ PAUSE';
    } else if (state.status === 'paused') {
      btnStart.disabled = true;
      btnPause.disabled = false;
      btnPause.textContent = '▶ RESUME';
    } else {
      btnStart.disabled = false;
      btnPause.disabled = true;
      btnPause.textContent = '⏸ PAUSE';
    }
  }

  // 5. Red Player Telemetry
  setElText('redName', red.name || 'Red Kingdom');
  setElText('redAuthor', red.author || 'Commander');
  setElText('redElixirNum', `${Number(red.elixir || 0).toFixed(1)} / 10`);
  const redElixirPct = Math.max(0, Math.min(100, ((red.elixir || 0) / 10.0) * 100));
  const elRedElixirBar = document.getElementById('redElixirBar');
  if (elRedElixirBar) elRedElixirBar.style.width = `${redElixirPct}%`;

  if (red.towers) {
    renderTowerEntity('red', 'king', red.towers.king);
    renderTowerEntity('red', 'left', red.towers.left_princess);
    renderTowerEntity('red', 'right', red.towers.right_princess);

    setElText('redKingHp', `${red.towers.king.hp} / ${red.towers.king.max_hp}`);
    setElText('redLeftHp', `${red.towers.left_princess.hp} / ${red.towers.left_princess.max_hp}`);
    setElText('redRightHp', `${red.towers.right_princess.hp} / ${red.towers.right_princess.max_hp}`);

    setBarWidth('redKingBar', (red.towers.king.hp / red.towers.king.max_hp) * 100);
    setBarWidth('redLeftBar', (red.towers.left_princess.hp / red.towers.left_princess.max_hp) * 100);
    setBarWidth('redRightBar', (red.towers.right_princess.hp / red.towers.right_princess.max_hp) * 100);
  }

  setElText('redThought', `"${red.last_thought || 'Reading opponent card cadence...'}"`);
  setElText('redTaunt', red.last_taunt ? `"${red.last_taunt}"` : '');
  renderHandCards('red', red.deck || [], red.elixir || 0);

  // 6. Blue Player Telemetry
  setElText('blueName', blue.name || 'Blue Kingdom');
  setElText('blueAuthor', blue.author || 'Commander');
  setElText('blueElixirNum', `${Number(blue.elixir || 0).toFixed(1)} / 10`);
  const blueElixirPct = Math.max(0, Math.min(100, ((blue.elixir || 0) / 10.0) * 100));
  const elBlueElixirBar = document.getElementById('blueElixirBar');
  if (elBlueElixirBar) elBlueElixirBar.style.width = `${blueElixirPct}%`;

  if (blue.towers) {
    renderTowerEntity('blue', 'king', blue.towers.king);
    renderTowerEntity('blue', 'left', blue.towers.left_princess);
    renderTowerEntity('blue', 'right', blue.towers.right_princess);

    setElText('blueKingHp', `${blue.towers.king.hp} / ${blue.towers.king.max_hp}`);
    setElText('blueLeftHp', `${blue.towers.left_princess.hp} / ${blue.towers.left_princess.max_hp}`);
    setElText('blueRightHp', `${blue.towers.right_princess.hp} / ${blue.towers.right_princess.max_hp}`);

    setBarWidth('blueKingBar', (blue.towers.king.hp / blue.towers.king.max_hp) * 100);
    setBarWidth('blueLeftBar', (blue.towers.left_princess.hp / blue.towers.left_princess.max_hp) * 100);
    setBarWidth('blueRightBar', (blue.towers.right_princess.hp / blue.towers.right_princess.max_hp) * 100);
  }

  setElText('blueThought', `"${blue.last_thought || 'Saving elixir for counter-push...'}"`);
  setElText('blueTaunt', blue.last_taunt ? `"${blue.last_taunt}"` : '');
  renderHandCards('blue', blue.deck || [], blue.elixir || 0);

  // 7. Render Active Troops on Pitch
  renderTroops(state.troops || state.units || []);

  // 8. Process Simulation Combat & Particle Events
  if (state.events && state.round_number !== lastProcessedRound) {
    processCombatEvents(state.events);
    lastProcessedRound = state.round_number;
  }

  // 9. Caster Combat Feed
  renderFeed(state.combat_log || []);

  // 10. Match Header
  const activeHeader = document.getElementById('arenaMatchHeader');
  if (activeHeader) {
    if (state.active_match_id) {
      activeHeader.textContent = `TOURNAMENT MATCH: ${state.active_match_id.toUpperCase()}`;
    } else {
      activeHeader.textContent = `${red.name || 'Red'} VS ${blue.name || 'Blue'}`;
    }
  }

  // 11. Victory Modal
  if (lastMatchStatus && lastMatchStatus !== 'finished' && state.status === 'finished' && state.winner && !victoryModalDismissed) {
    showVictoryModal(state);
  }
  lastMatchStatus = state.status;
}

function processCombatEvents(events) {
  if (!events || !Array.isArray(events) || !fxEngine) return;

  events.forEach(ev => {
    if (ev.type === 'damage') {
      fxEngine.addDamageText(ev.x, ev.y, ev.amount, ev.is_crit);
    } else if (ev.type === 'projectile') {
      fxEngine.addProjectile(ev.kind, ev.from_x, ev.from_y, ev.to_x, ev.to_y, ev.damage);
      if (ev.kind === 'fireball') playClashSound('fireball');
      else if (ev.kind === 'cannon') playClashSound('cannon');
      else playClashSound('arrow');
    } else if (ev.type === 'tower_attack') {
      fxEngine.addProjectile(ev.kind || 'arrow', ev.from_x, ev.from_y, ev.to_x, ev.to_y, ev.damage);
      if (ev.kind === 'cannon') playClashSound('cannon');
      else playClashSound('arrow');
    } else if (ev.type === 'death') {
      fxEngine.addElixirPoof(ev.x, ev.y);
    } else if (ev.type === 'deploy') {
      playClashSound('deploy');
    } else if (ev.type === 'tower_destroyed') {
      triggerScreenShake(12);
      playClashSound('cannon');
      playClashSound('crown');
    } else if (ev.type === 'shake') {
      triggerScreenShake(ev.intensity || 6);
    } else if (ev.type === 'double_elixir') {
      playClashSound('double_elixir');
    } else if (ev.type === 'victory') {
      playClashSound('crown');
    }
  });
}

function setBarWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

function renderTowerEntity(team, towerKey, towerData) {
  const el = document.getElementById(`tower_${team}_${towerKey}`);
  const tag = document.getElementById(`tag_${team}_${towerKey}`);
  if (!el || !towerData) return;

  if (towerData.destroyed) {
    el.classList.add('destroyed');
    if (tag) tag.textContent = 'FALLEN';
  } else {
    el.classList.remove('destroyed');
    if (tag) tag.textContent = `${towerData.hp}`;
  }
}

function renderHandCards(team, deckList, currentElixir) {
  const container = document.getElementById(`${team}HandCards`);
  if (!container || !deckList) return;

  container.innerHTML = '';
  deckList.forEach(cardId => {
    const proto = CARD_PROTOS[cardId] || { name: cardId, elixir: 3, icon: '⚔️' };
    const cardEl = document.createElement('div');
    const isAffordable = currentElixir >= proto.elixir;
    cardEl.className = `hand-card ${isAffordable ? 'affordable' : ''}`;
    cardEl.title = `${proto.name} (⚡${proto.elixir} Elixir) - ${proto.type}`;
    cardEl.innerHTML = `
      <span class="c-icon">${proto.icon}</span>
      <span class="c-cost">💧${proto.elixir}</span>
      <span class="c-name">${proto.name}</span>
    `;
    container.appendChild(cardEl);
  });
}

function renderTroops(troopsList) {
  const layer = document.getElementById('troopsLayer');
  if (!layer) return;

  layer.innerHTML = '';
  troopsList.forEach(t => {
    const proto = CARD_PROTOS[t.card_id] || { icon: '⚔️' };
    const hpPct = Math.max(0, Math.min(100, (t.hp / t.max_hp) * 100));

    const avatar = document.createElement('div');
    avatar.className = 'troop-avatar';
    avatar.style.left = `${t.x}%`;
    avatar.style.top = `${t.y}%`;

    avatar.innerHTML = `
      <div class="troop-circle troop-team-${t.team}" title="${t.name} (${t.hp}/${t.max_hp} HP)">
        ${proto.icon}
      </div>
      <div class="troop-hp-bar">
        <div class="troop-hp-fill" style="width: ${hpPct}%;"></div>
      </div>
    `;
    layer.appendChild(avatar);
  });
}

// Caster Combat Feed Ticker
function renderFeed(logs) {
  const feedEl = document.getElementById('combatFeed');
  if (!feedEl || !logs) return;

  if (logs.length !== lastLogCount) {
    feedEl.innerHTML = '';
    logs.forEach(entry => {
      const msg = document.createElement('div');
      msg.className = `feed-msg ${entry.category || 'combat'}`;
      msg.textContent = `[${entry.time || 0}s] ${entry.icon || '⚔️'} ${entry.text}`;
      feedEl.appendChild(msg);
    });
    feedEl.scrollTop = feedEl.scrollHeight;
    lastLogCount = logs.length;
  }
}

// Victory Modal Presentation
function showVictoryModal(state) {
  const modal = document.getElementById('victoryModal');
  const crest = document.getElementById('modalWinnerCrest');
  const title = document.getElementById('modalWinnerTitle');
  const reason = document.getElementById('modalWinnerReason');
  const redCrownsEl = document.getElementById('modalRedCrowns');
  const blueCrownsEl = document.getElementById('modalBlueCrowns');

  if (!modal) return;

  const winner = state.winner;
  const isRed = winner === 'red';
  const isDraw = winner === 'draw';

  const red = state.players ? state.players.red : {};
  const blue = state.players ? state.players.blue : {};

  crest.textContent = isDraw ? '⚖️' : '👑';
  title.textContent = isDraw ? 'DRAW // SUDDEN DEATH' : `${(state.players[winner] || {}).name || winner.toUpperCase()} VICTORIOUS!`;
  title.style.color = isDraw ? '#facc15' : (isRed ? '#ef4444' : '#0ea5e9');
  reason.textContent = state.win_reason;

  if (redCrownsEl) redCrownsEl.textContent = `🔴 ${red.crowns || 0} CROWNS`;
  if (blueCrownsEl) blueCrownsEl.textContent = `🔵 ${blue.crowns || 0} CROWNS`;

  modal.classList.add('active');
  playClashSound('crown');
}

// Knockout Tournament Bracket Rendering
function renderBracket(tourney) {
  const treeEl = document.getElementById('bracketTree');
  if (!treeEl || !tourney || !tourney.matches) return;

  currentTourneyState = tourney;
  treeEl.innerHTML = '';

  const matches = tourney.matches;
  const matchKeys = Object.keys(matches);

  const qfMatches = matchKeys.filter(k => k.startsWith('qf_')).map(k => matches[k]);
  const semiMatches = matchKeys.filter(k => k.startsWith('semi_')).map(k => matches[k]);
  const finalMatches = matchKeys.filter(k => k.startsWith('final_')).map(k => matches[k]);

  if (qfMatches.length > 0) treeEl.appendChild(createRoundColumn('QUARTERFINALS', qfMatches));
  if (semiMatches.length > 0) treeEl.appendChild(createRoundColumn('SEMIFINALS', semiMatches));
  if (finalMatches.length > 0) treeEl.appendChild(createRoundColumn('🏆 GRAND CHAMPIONSHIP', finalMatches));

  if (tourney.champion) {
    const champCol = document.createElement('div');
    champCol.className = 'bracket-round-column champion-col';
    champCol.innerHTML = `
      <div class="round-col-title">👑 TOURNAMENT CHAMPION</div>
      <div class="tournament-match-card champion-card" style="border-color: #f59e0b; text-align: center; padding: 24px; box-shadow: 0 0 24px rgba(245, 158, 11, 0.4);">
        <div style="font-size: 40px; margin-bottom: 8px;">👑</div>
        <h3 style="color: #fbbf24; font-family: var(--font-serif); font-size: 18px; margin-bottom: 6px;">${tourney.champion}</h3>
        <p style="font-size: 11px; color: #10b981; font-family: var(--font-mono);">Knockout Champion Crowned!</p>
      </div>
    `;
    treeEl.appendChild(champCol);
  }
}

function createRoundColumn(title, matchArr) {
  const col = document.createElement('div');
  col.className = 'bracket-round-column';

  const titleEl = document.createElement('div');
  titleEl.className = 'round-col-title';
  titleEl.textContent = title;
  col.appendChild(titleEl);

  matchArr.forEach(m => {
    const card = document.createElement('div');
    card.className = `tournament-match-card ${m.status === 'in_progress' ? 'active' : ''}`;

    const isAWin = m.winner_file && m.winner_file === m.team_a_file;
    const isBWin = m.winner_file && m.winner_file === m.team_b_file;

    const teamAName = m.team_a_file ? m.team_a_file.replace('.md', '') : 'TBD';
    const teamBName = m.team_b_file ? m.team_b_file.replace('.md', '') : 'TBD';

    let actionButton = '';
    if (m.status === 'scheduled' && m.team_a_file && m.team_b_file) {
      actionButton = `<button class="btn-launch-match" onclick="launchBracketMatch('${m.match_id}')">⚔️ LAUNCH MATCH</button>`;
    } else if (m.status === 'in_progress') {
      actionButton = `<div style="font-family: var(--font-mono); font-size: 10px; color: #f59e0b; text-align: center; font-weight: 800;">⚡ IN PROGRESS</div>`;
    } else if (m.status === 'completed') {
      const redC = m.scorecard ? m.scorecard.red_crowns : 0;
      const blueC = m.scorecard ? m.scorecard.blue_crowns : 0;
      actionButton = `<div style="font-family: var(--font-mono); font-size: 12px; color: #34d399; text-align: center; font-weight: 800;">👑 ${redC} - ${blueC} 👑</div>`;
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; font-family: var(--font-mono);">
        <span>${m.round_name}</span>
        <span style="text-transform: uppercase;">${m.status}</span>
      </div>
      <div class="match-slot ${isAWin ? 'winner' : ''}">
        <span>🔴 ${teamAName}</span>
        <span>${isAWin ? '👑 WIN' : ''}</span>
      </div>
      <div class="match-slot ${isBWin ? 'winner' : ''}">
        <span>🔵 ${teamBName}</span>
        <span>${isBWin ? '👑 WIN' : ''}</span>
      </div>
      ${actionButton}
    `;
    col.appendChild(card);
  });

  return col;
}

window.launchBracketMatch = async function(matchId) {
  try {
    const res = await fetch('/api/tournament/launch_match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId })
    });
    const data = await res.json();
    if (data.status === 'match_loaded') {
      switchToArena();
      playClashSound('crown');
      await fetch('/api/match/start', { method: 'POST' });
    }
  } catch (e) {
    alert('Failed to launch tournament match: ' + e);
  }
};

// Switch Views
function switchView(viewName) {
  const views = {
    lobby: document.getElementById('viewLobby'),
    arena: document.getElementById('viewArena'),
    bracket: document.getElementById('viewBracket'),
    rules: document.getElementById('viewRules')
  };

  const tabs = {
    lobby: document.getElementById('btnViewLobby'),
    arena: document.getElementById('btnViewArena'),
    bracket: document.getElementById('btnViewBracket'),
    rules: document.getElementById('btnViewRules')
  };

  Object.keys(views).forEach(k => {
    if (views[k]) {
      if (k === viewName) {
        views[k].style.display = (k === 'arena') ? 'grid' : 'flex';
        views[k].classList.add('active');
      } else {
        views[k].style.display = 'none';
        views[k].classList.remove('active');
      }
    }
    if (tabs[k]) {
      if (k === viewName) tabs[k].classList.add('active');
      else tabs[k].classList.remove('active');
    }
  });

  if (viewName === 'arena' && fxEngine) {
    setTimeout(() => fxEngine.resize(), 100);
  }
  if (viewName === 'bracket') fetchTournamentState();
  if (viewName === 'rules') renderCardsCatalog();
}

function switchToArena() { switchView('arena'); }
function switchToBracket() { switchView('bracket'); }
function switchToLobby() { switchView('lobby'); }
function switchToRules() { switchView('rules'); }

// Cards Catalog Guide
function renderCardsCatalog() {
  const grid = document.getElementById('cardsCatalogGrid');
  if (!grid) return;

  grid.innerHTML = '';
  Object.keys(CARD_PROTOS).forEach(k => {
    const c = CARD_PROTOS[k];
    const cardEl = document.createElement('div');
    cardEl.className = 'catalog-card';
    cardEl.innerHTML = `
      <div class="catalog-top">
        <span class="c-icon">${c.icon}</span>
        <span class="c-elixir">💧 ${c.elixir} Elixir</span>
      </div>
      <h3>${c.name}</h3>
      <div class="catalog-stats">Role: ${c.type} | HP: ${c.hp} | Damage: ${c.dmg}</div>
      <p>${c.desc}</p>
    `;
    grid.appendChild(cardEl);
  });
}

// Tournament Bracket Controls
async function fetchTournamentState() {
  try {
    const res = await fetch('/api/tournament/state');
    const tourney = await res.json();
    renderBracket(tourney);
  } catch (e) {
    console.error('Failed to fetch tournament state:', e);
  }
}

async function createTournamentBracket() {
  try {
    const res = await fetch('/api/skills');
    const skills = await res.json();
    const files = skills.map(s => s.filename);

    if (files.length < 2) {
      alert('You need at least 2 deck files in the "skills/" folder to generate a bracket.');
      return;
    }

    const tourneyRes = await fetch('/api/tournament/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_files: files.slice(0, 8) })
    });
    const data = await tourneyRes.json();
    renderBracket(data.tournament);
    playClashSound('crown');
  } catch (e) {
    alert('Error generating tournament: ' + e);
  }
}

async function exportTournamentJson() {
  try {
    const res = await fetch('/api/tournament/export');
    const tourney = await res.json();
    const jsonStr = JSON.stringify(tourney, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `royal_arena_tournament_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Failed to export tournament: ' + e);
  }
}

function importTournamentJson() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const res = await fetch('/api/tournament/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournament_data: parsed })
        });
        const data = await res.json();
        renderBracket(data.tournament);
        alert('Championship tournament state successfully imported!');
      } catch (err) {
        alert('Invalid JSON file: ' + err);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// API Skills & Deck Management
async function fetchSkills() {
  try {
    const res = await fetch('/api/skills');
    const skills = await res.json();
    populateSkillDropdowns(skills);
  } catch (e) {
    console.error('Failed to fetch skills:', e);
  }
}

function populateSkillDropdowns(skills) {
  const elSelectRed = document.getElementById('selectRedSkill');
  const elSelectBlue = document.getElementById('selectBlueSkill');
  if (!elSelectRed || !elSelectBlue) return;

  const prevRed = elSelectRed.value;
  const prevBlue = elSelectBlue.value;

  elSelectRed.innerHTML = '';
  elSelectBlue.innerHTML = '';

  skills.forEach(s => {
    const optRed = document.createElement('option');
    optRed.value = s.filename;
    optRed.textContent = `${s.name} (${s.author || 'Commander'}) [${s.filename}]`;
    elSelectRed.appendChild(optRed);

    const optBlue = document.createElement('option');
    optBlue.value = s.filename;
    optBlue.textContent = `${s.name} (${s.author || 'Commander'}) [${s.filename}]`;
    elSelectBlue.appendChild(optBlue);
  });

  if (prevRed && Array.from(elSelectRed.options).some(o => o.value === prevRed)) {
    elSelectRed.value = prevRed;
  } else if (skills.length >= 1) {
    elSelectRed.selectedIndex = 0;
  }

  if (prevBlue && Array.from(elSelectBlue.options).some(o => o.value === prevBlue)) {
    elSelectBlue.value = prevBlue;
  } else if (skills.length >= 2) {
    elSelectBlue.selectedIndex = 1;
  }

  refreshSkillPill('Red');
  refreshSkillPill('Blue');
}

// Dropzone & File Upload Handlers
function setupUploadDropzones() {
  ['Red', 'Blue'].forEach(side => {
    const dropzone = document.getElementById(`dropzone${side}`);
    const fileInput = document.getElementById(`fileInput${side}`);
    const selectEl = document.getElementById(`select${side}Skill`);

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => {
      fileInput.value = '';
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleSkillFileUpload(e.target.files[0], side);
      }
    });

    ['dragenter', 'dragover'].forEach(evtName => {
      dropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'dragend'].forEach(evtName => {
      dropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleSkillFileUpload(e.dataTransfer.files[0], side);
      }
    });

    if (selectEl) {
      selectEl.addEventListener('change', () => {
        refreshSkillPill(side);
      });
    }
  });
}

async function handleSkillFileUpload(file, side) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const content = evt.target.result;
      let filename = file.name.replace(/\s+/g, '_');
      if (!filename.endsWith('.md') && !filename.endsWith('.txt')) {
        filename += '.md';
      } else if (filename.endsWith('.txt')) {
        filename = filename.slice(0, -4) + '.md';
      }

      const res = await fetch('/api/skills/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content })
      });
      const data = await res.json();
      await fetchSkills();

      const selectEl = document.getElementById(`select${side}Skill`);
      if (selectEl) selectEl.value = data.filename;

      if (data.profile) {
        updateSkillPill(side, data.profile);
      } else {
        await refreshSkillPill(side);
      }
      playClashSound('crown');
    } catch (err) {
      alert(`Error reading deck file: ${err}`);
    }
  };
  reader.readAsText(file);
}

function updateSkillPill(side, profile) {
  const pillName = document.getElementById(`pill${side}Name`);
  const pillSub = document.getElementById(`pill${side}Sub`);
  const preview = document.getElementById(`${side.toLowerCase()}DeckPreview`);

  if (pillName) pillName.textContent = profile.name || 'Custom Battle Deck';
  if (pillSub) {
    const author = profile.author || 'Commander';
    const arch = (profile.archetype || 'Balanced').toUpperCase().replace(/_/g, ' ');
    pillSub.textContent = `${author} • ${arch}`;
  }

  if (preview && profile.deck) {
    preview.innerHTML = '';
    profile.deck.forEach(cardId => {
      const proto = CARD_PROTOS[cardId] || { name: cardId, elixir: 3, icon: '⚔️' };
      const chip = document.createElement('div');
      chip.className = 'card-chip';
      chip.innerHTML = `${proto.icon} ${proto.name} <span class="elixir-cost">${proto.elixir}e</span>`;
      preview.appendChild(chip);
    });
  }
}

async function refreshSkillPill(side) {
  const selectEl = document.getElementById(`select${side}Skill`);
  if (!selectEl || !selectEl.value) return;

  try {
    const res = await fetch(`/api/skills/${selectEl.value}`);
    const data = await res.json();
    if (data.profile) {
      updateSkillPill(side, data.profile);
    }
  } catch (e) {
    console.error(`Failed to refresh pill for ${side}:`, e);
  }
}

// Tactical Deck Forge
function setupNoCodeBuilder() {
  const btnBuild = document.getElementById('btnBuildSkill');
  if (!btnBuild) return;

  btnBuild.addEventListener('click', async () => {
    const deckName = document.getElementById('builderKingdomName').value.trim() || 'Royal Vanguard';
    const author = document.getElementById('builderRulerName').value.trim() || 'Commander Valerius';
    const arch = document.getElementById('builderStrategy').value;
    const lane = document.getElementById('builderLane').value;

    const deckTemplates = {
      hog_cycle: ["hog_rider", "musketeer", "knight", "skeletons", "fireball", "archers", "baby_dragon", "goblin_barrel"],
      beatdown: ["giant", "baby_dragon", "musketeer", "knight", "fireball", "archers", "skeletons", "hog_rider"],
      spell_bait: ["goblin_barrel", "knight", "skeletons", "archers", "fireball", "musketeer", "baby_dragon", "hog_rider"],
      pekka_control: ["pekka", "baby_dragon", "musketeer", "knight", "fireball", "skeletons", "archers", "hog_rider"],
      bridge_spam: ["hog_rider", "knight", "goblin_barrel", "baby_dragon", "archers", "skeletons", "fireball", "musketeer"]
    };

    const cards = deckTemplates[arch] || deckTemplates.hog_cycle;
    const content = `# Deck Name: ${deckName}
# Player / Author: ${author}
# War Cry: "Victory for the Crown!"

## Archetype & Playstyle
${arch.replace('_', ' ').toUpperCase()} doctrine configured for the ${lane} lane.

## 8-Card Battle Deck
${cards.map(c => `- ${c}: 15%`).join('\n')}

## Preferred Lane
${lane}

## Tactical Triggers (If-Then Rules)
1. IF Elixir >= 6 -> Deploy primary win condition at the bridge!
2. IF enemy drops a tank -> Defend with swarms and ranged support!
3. IF enemy tower < 380 HP -> Cast Fireball to finish the Crown!
`;

    const cleanFilename = deckName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_deck.md';

    try {
      const res = await fetch('/api/skills/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: cleanFilename, content })
      });
      const data = await res.json();
      await fetchSkills();

      const selectRed = document.getElementById('selectRedSkill');
      if (selectRed) {
        selectRed.value = data.filename;
        refreshSkillPill('Red');
      }

      const statusEl = document.getElementById('builderStatusMsg');
      if (statusEl) {
        statusEl.textContent = `✓ Registered "${cleanFilename}" and equipped for Red Commander!`;
      }
      playClashSound('crown');
    } catch (e) {
      alert(`Error generating deck: ${e}`);
    }
  });
}

async function lockAndStartMatch() {
  const elSelectRed = document.getElementById('selectRedSkill');
  const elSelectBlue = document.getElementById('selectBlueSkill');
  const elSelectTimer = document.getElementById('selectTimer');
  if (!elSelectRed || !elSelectBlue || !elSelectTimer) return;

  const redSkill = elSelectRed.value;
  const blueSkill = elSelectBlue.value;
  const timerSecs = parseInt(elSelectTimer.value, 10);

  try {
    const res = await fetch('/api/match/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        red_skill_file: redSkill,
        blue_skill_file: blueSkill,
        max_duration_seconds: timerSecs
      })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(`Setup error: ${err.detail || 'Could not load match'}`);
      return;
    }
    victoryModalDismissed = false;
    const modal = document.getElementById('victoryModal');
    if (modal) modal.classList.remove('active');
    switchToArena();
    playClashSound('crown');
    await fetch('/api/match/start', { method: 'POST' });
  } catch (e) {
    alert('Error starting match: ' + e);
  }
}

async function startBattle() {
  try {
    initAudio();
    victoryModalDismissed = false;
    const modal = document.getElementById('victoryModal');
    if (modal) modal.classList.remove('active');
    await fetch('/api/match/start', { method: 'POST' });
    playClashSound('crown');
  } catch (e) {
    console.error('Failed to start:', e);
  }
}

async function pauseBattle() {
  try {
    if (currentMatchState && currentMatchState.status === 'paused') {
      await fetch('/api/match/resume', { method: 'POST' });
    } else {
      await fetch('/api/match/pause', { method: 'POST' });
    }
  } catch (e) {
    console.error('Failed to pause/resume:', e);
  }
}

async function stepBattle() {
  try {
    await fetch('/api/match/step', { method: 'POST' });
  } catch (e) {
    console.error('Failed to step:', e);
  }
}

async function resetBattle() {
  if (confirm('Reset the arena and re-initialize the match?')) {
    try {
      victoryModalDismissed = false;
      const modal = document.getElementById('victoryModal');
      if (modal) modal.classList.remove('active');
      await fetch('/api/match/reset', { method: 'POST' });
    } catch (e) {
      console.error('Failed to reset:', e);
    }
  }
}

async function setSpeed(speed) {
  try {
    await fetch('/api/match/speed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed: parseFloat(speed) })
    });
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.speed === speed);
    });
  } catch (e) {
    console.error('Failed to set speed:', e);
  }
}

function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// Window Initialization
window.addEventListener('DOMContentLoaded', async () => {
  // Initialize Canvas FX Engine
  const canvasEl = document.getElementById('fxCanvas');
  if (canvasEl) {
    fxEngine = new ArenaFxEngine(canvasEl);
  }

  connectWebSocket();

  // Mode View Switchers
  const btnLobby = document.getElementById('btnViewLobby');
  const btnArena = document.getElementById('btnViewArena');
  const btnBracket = document.getElementById('btnViewBracket');
  const btnRules = document.getElementById('btnViewRules');
  if (btnLobby) btnLobby.addEventListener('click', switchToLobby);
  if (btnArena) btnArena.addEventListener('click', switchToArena);
  if (btnBracket) btnBracket.addEventListener('click', switchToBracket);
  if (btnRules) btnRules.addEventListener('click', switchToRules);

  // Match Action Controls
  const btnLockStart = document.getElementById('btnLockAndStart');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnStep = document.getElementById('btnStep');
  const btnReset = document.getElementById('btnReset');
  const btnSound = document.getElementById('btnSound');
  const volumeSlider = document.getElementById('volumeSlider');

  if (btnLockStart) btnLockStart.addEventListener('click', lockAndStartMatch);
  if (btnStart) btnStart.addEventListener('click', startBattle);
  if (btnPause) btnPause.addEventListener('click', pauseBattle);
  if (btnStep) btnStep.addEventListener('click', stepBattle);
  if (btnReset) btnReset.addEventListener('click', resetBattle);

  if (btnSound) {
    btnSound.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      btnSound.textContent = soundEnabled ? '🔊' : '🔇';
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      setMasterVolume(e.target.value);
    });
  }

  // Speed Buttons
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', (e) => setSpeed(e.target.dataset.speed));
  });

  // Tournament Bracket Buttons
  const btnGenBracket = document.getElementById('btnCreateBracket');
  const btnExport = document.getElementById('btnExportTourney');
  const btnImport = document.getElementById('btnImportTourney');

  if (btnGenBracket) btnGenBracket.addEventListener('click', createTournamentBracket);
  if (btnExport) btnExport.addEventListener('click', exportTournamentJson);
  if (btnImport) btnImport.addEventListener('click', importTournamentJson);

  // Victory Modal Close
  const modal = document.getElementById('victoryModal');
  const btnModalClose = document.getElementById('btnModalClose');
  const btnModalDismiss = document.getElementById('btnModalDismiss');
  const btnModalStay = document.getElementById('btnModalStay');

  const closeModal = (proceedToBracket = false) => {
    victoryModalDismissed = true;
    if (modal) modal.classList.remove('active');
    if (proceedToBracket) switchToBracket();
  };

  if (btnModalClose) btnModalClose.addEventListener('click', () => closeModal(true));
  if (btnModalDismiss) btnModalDismiss.addEventListener('click', () => closeModal(false));
  if (btnModalStay) btnModalStay.addEventListener('click', () => closeModal(false));
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(false);
    });
  }

  setupUploadDropzones();
  setupNoCodeBuilder();
  renderCardsCatalog();

  await fetchSkills();
  await fetchTournamentState();
  switchToLobby();

  try {
    const res = await fetch('/api/match/state');
    const state = await res.json();
    if (state.status && state.status !== 'not_initialized') {
      renderState(state);
      if (state.status === 'running' || state.status === 'paused') {
        switchToArena();
      }
    }
  } catch (e) {
    console.log('Initial state load: ' + e);
  }
});
