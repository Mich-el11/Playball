const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const scoreHome = document.querySelector('#homeScore');
const scoreAway = document.querySelector('#awayScore');
const timer = document.querySelector('#timer');
const message = document.querySelector('#gameMessage');
const keys = new Set();
const W = canvas.width;
const H = canvas.height;
const GOAL_TOP = 190;
const GOAL_BOTTOM = 350;

const game = {
  home: 0,
  away: 0,
  seconds: 90 * 60,
  lastFrame: 0,
  over: false,
  players: [],
  ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 9 },
  owner: null,
};

const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function makePlayer(x, y, side, number, human = false) {
  return { x, y, vx: 0, vy: 0, r: human ? 16 : 14, side, number, human, cooldown: 0 };
}

function kickoff() {
  game.players = [
    makePlayer(205, 270, 'home', 9, true),
    makePlayer(310, 170, 'home', 7), makePlayer(310, 370, 'home', 8),
    makePlayer(425, 220, 'home', 10), makePlayer(425, 320, 'home', 11),
    makePlayer(755, 270, 'away', 9),
    makePlayer(650, 170, 'away', 7), makePlayer(650, 370, 'away', 8),
    makePlayer(535, 220, 'away', 10), makePlayer(535, 320, 'away', 11),
  ];
  game.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 9 };
  game.owner = null;
}

function resetMatch() {
  game.home = 0;
  game.away = 0;
  game.seconds = 90 * 60;
  game.over = false;
  scoreHome.textContent = '0';
  scoreAway.textContent = '0';
  message.textContent = '';
  kickoff();
}

function nearestToBall(side) {
  return game.players.filter(p => !side || p.side === side)
    .reduce((best, player) => !best || distance(player, game.ball) < distance(best, game.ball) ? player : best, null);
}

function shoot() {
  if (game.over) return;
  const player = game.owner || nearestToBall('home');
  if (!player || player.side !== 'home' || distance(player, game.ball) > 40) return;
  let aimX = player.x < W * .7 ? 1 : 1;
  let aimY = 0;
  if (keys.has('arrowup') || keys.has('w')) aimY = -.32;
  if (keys.has('arrowdown') || keys.has('s')) aimY = .32;
  const length = Math.hypot(aimX, aimY);
  const power = player.x > 650 ? 570 : 490;
  game.ball.x = player.x + (player.r + game.ball.r + 2);
  game.ball.y = player.y;
  game.ball.vx = (aimX / length) * power;
  game.ball.vy = (aimY / length) * power;
  game.owner = null;
  player.cooldown = .25;
}

function handleInput(player, dt) {
  if (!player.human) return;
  let x = 0;
  let y = 0;
  if (keys.has('w') || keys.has('arrowup')) y--;
  if (keys.has('s') || keys.has('arrowdown')) y++;
  if (keys.has('a') || keys.has('arrowleft')) x--;
  if (keys.has('d') || keys.has('arrowright')) x++;
  const length = Math.hypot(x, y) || 1;
  const speed = keys.has('shift') ? 245 : 205;
  player.vx = (x / length) * speed;
  player.vy = (y / length) * speed;
  if (x === 0 && y === 0) {
    player.vx *= Math.max(0, 1 - 9 * dt);
    player.vy *= Math.max(0, 1 - 9 * dt);
  }
}

function update(dt) {
  if (game.over) return;
  game.seconds = Math.max(0, game.seconds - dt);
  const mins = Math.floor(game.seconds / 60);
  const secs = Math.floor(game.seconds % 60);
  timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  if (game.seconds <= 0) {
    game.over = true;
    message.textContent = game.home === game.away ? 'FULL TIME — DRAW' : game.home > game.away ? 'FULL TIME — YOU WIN!' : 'FULL TIME — OPPONENT WINS';
    return;
  }

  const human = game.players.find(p => p.human);
  const chasingHome = nearestToBall('home');
  const chasingAway = nearestToBall('away');

  for (const p of game.players) {
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.human) {
      handleInput(p, dt);
    } else {
      const target = p.side === 'away' ? game.ball : (p === chasingHome ? game.ball : { x: 300, y: p.number % 2 ? 185 : 355 });
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const length = Math.hypot(dx, dy) || 1;
      const speed = p.side === 'away' ? 142 : 95;
      p.vx = (dx / length) * speed;
      p.vy = (dy / length) * speed;
    }

    p.x = clamp(p.x + p.vx * dt, 28, W - 28);
    p.y = clamp(p.y + p.vy * dt, 28, H - 28);

    const gap = distance(p, game.ball);
    if (gap < p.r + game.ball.r + 3 && p.cooldown <= 0) {
      if (p.side === 'home') {
        game.owner = p;
        game.ball.x = p.x + p.r + game.ball.r - 2;
        game.ball.y = p.y;
        game.ball.vx = 0;
        game.ball.vy = 0;
      } else {
        game.owner = null;
        const goalX = 0;
        const dx = goalX - game.ball.x;
        const dy = H / 2 - game.ball.y;
        const len = Math.hypot(dx, dy) || 1;
        game.ball.vx = (dx / len) * 270;
        game.ball.vy = (dy / len) * 270;
        p.cooldown = 1.1;
      }
    }
  }

  if (game.owner && !game.owner.human) {
    const p = game.owner;
    game.ball.x = p.x + p.r + game.ball.r - 2;
    game.ball.y = p.y;
    if (p.x > 570 && p.cooldown <= 0) {
      const dx = W - game.ball.x;
      const dy = H / 2 - game.ball.y;
      const len = Math.hypot(dx, dy) || 1;
      game.ball.vx = dx / len * 430;
      game.ball.vy = dy / len * 430;
      game.owner = null;
      p.cooldown = 1.5;
    }
  }

  if (!game.owner) {
    game.ball.x += game.ball.vx * dt;
    game.ball.y += game.ball.vy * dt;
    const drag = Math.pow(.985, dt * 60);
    game.ball.vx *= drag;
    game.ball.vy *= drag;
    if (game.ball.y < game.ball.r || game.ball.y > H - game.ball.r) {
      game.ball.vy *= -.8;
      game.ball.y = clamp(game.ball.y, game.ball.r, H - game.ball.r);
    }
    const goalOpening = game.ball.y > GOAL_TOP && game.ball.y < GOAL_BOTTOM;
    if (game.ball.x >= W - 10 && goalOpening) {
      game.home++;
      scoreHome.textContent = String(game.home);
      message.textContent = 'GOAL!';
      kickoff();
      setTimeout(() => { if (!game.over) message.textContent = ''; }, 1300);
    } else if (game.ball.x <= 10 && goalOpening) {
      game.away++;
      scoreAway.textContent = String(game.away);
      message.textContent = 'OPPONENT SCORES';
      kickoff();
      setTimeout(() => { if (!game.over) message.textContent = ''; }, 1300);
    } else {
      game.ball.x = clamp(game.ball.x, 12, W - 12);
    }
  }
}

function drawField() {
  const grass = ctx.createLinearGradient(0, 0, 0, H);
  grass.addColorStop(0, '#138553');
  grass.addColorStop(1, '#0b633e');
  ctx.fillStyle = grass;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.035)';
    ctx.fillRect(i * W / 8, 0, W / 8, H);
  }
  ctx.strokeStyle = 'rgba(245,255,250,.78)';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, W - 24, H - 24);
  ctx.beginPath(); ctx.moveTo(W / 2, 12); ctx.lineTo(W / 2, H - 12); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 66, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeRect(12, 160, 115, 220); ctx.strokeRect(W - 127, 160, 115, 220);
  ctx.strokeRect(12, 205, 48, 130); ctx.strokeRect(W - 60, 205, 48, 130);
  ctx.strokeStyle = 'rgba(220,245,255,.45)';
  ctx.strokeRect(0, GOAL_TOP, 24, GOAL_BOTTOM - GOAL_TOP);
  ctx.strokeRect(W - 24, GOAL_TOP, 24, GOAL_BOTTOM - GOAL_TOP);
}

function drawPlayer(p) {
  ctx.save();
  ctx.shadowColor = p.side === 'home' ? 'rgba(52,230,255,.65)' : 'rgba(255,99,112,.55)';
  ctx.shadowBlur = p.human ? 18 : 10;
  ctx.beginPath();
  ctx.fillStyle = p.side === 'home' ? (p.human ? '#54efff' : '#15b8dc') : '#ff6470';
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = p.human ? 3 : 1.5; ctx.stroke();
  ctx.fillStyle = '#092034'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(p.number), p.x, p.y);
  if (p.human) {
    ctx.fillStyle = '#ffca4a'; ctx.beginPath(); ctx.moveTo(p.x, p.y - p.r - 12); ctx.lineTo(p.x - 6, p.y - p.r - 21); ctx.lineTo(p.x + 6, p.y - p.r - 21); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawBall() {
  const b = game.ball;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fillStyle = '#f6fbff'; ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#162532'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#152534'; ctx.fill();
  ctx.restore();
}

function render() {
  drawField();
  for (const p of game.players) drawPlayer(p);
  drawBall();
  if (game.over) {
    ctx.fillStyle = 'rgba(2,8,18,.56)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 34px system-ui';
    ctx.fillText('FULL TIME', W / 2, H / 2);
  }
}

function frame(now) {
  const dt = game.lastFrame ? Math.min((now - game.lastFrame) / 1000, .033) : .016;
  game.lastFrame = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  keys.add(key);
  if (key === ' ' && !event.repeat) shoot();
  if (key === 'r') resetMatch();
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
document.querySelector('#restartButton').addEventListener('click', resetMatch);
document.querySelector('#shootButton').addEventListener('pointerdown', event => { event.preventDefault(); shoot(); });
for (const button of document.querySelectorAll('.dpad [data-key]')) {
  const key = button.dataset.key;
  const release = event => { event.preventDefault(); keys.delete(key); };
  button.addEventListener('pointerdown', event => { event.preventDefault(); keys.add(key); button.setPointerCapture(event.pointerId); });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}

resetMatch();
requestAnimationFrame(frame);
