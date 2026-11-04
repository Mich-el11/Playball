const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const homeScoreEl = document.getElementById('homeScore');
const awayScoreEl = document.getElementById('awayScore');
const timerEl = document.getElementById('timer');

const keys = {};
window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
  if (event.key.toLowerCase() === 'r') resetMatch();
  if (event.key === ' ') {
    event.preventDefault();
    shootBall();
  }
});
window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

const FIELD = {
  width: canvas.width,
  height: canvas.height,
  goalWidth: 170,
  goalHeight: 215,
};

const state = {
  homeScore: 0,
  awayScore: 0,
  timeLeft: 90 * 60,
  lastTime: 0,
  ball: null,
  players: [],
  gameOver: false,
  nearBallOwner: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createPlayer(x, y, color, side, name) {
  return {
    x,
    y,
    radius: 17,
    color,
    side,
    name,
    vx: 0,
    vy: 0,
    speed: 160,
    isControlled: side === 'home' && name === 'hero',
  };
}

function resetPlayers() {
  const home = [
    { x: 180, y: 270, name: 'hero' },
    { x: 290, y: 180, name: 'mid1' },
    { x: 290, y: 360, name: 'mid2' },
    { x: 420, y: 210, name: 'wing1' },
    { x: 420, y: 330, name: 'wing2' },
  ];

  const away = [
    { x: 780, y: 270, name: 'op1' },
    { x: 650, y: 170, name: 'op2' },
    { x: 650, y: 370, name: 'op3' },
    { x: 520, y: 200, name: 'op4' },
    { x: 520, y: 340, name: 'op5' },
  ];

  state.players = [
    ...home.map((spot) => createPlayer(spot.x, spot.y, '#48ecff', 'home', spot.name)),
    ...away.map((spot) => createPlayer(spot.x, spot.y, '#ff6b6b', 'away', spot.name)),
  ];
}

function resetBall() {
  state.ball = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    radius: 11,
    vx: 0,
    vy: 0,
  };
}

function resetMatch() {
  state.homeScore = 0;
  state.awayScore = 0;
  state.timeLeft = 90 * 60;
  state.gameOver = false;
  state.nearBallOwner = null;
  homeScoreEl.textContent = '0';
  awayScoreEl.textContent = '0';
  resetPlayers();
  resetBall();
}

function findNearestPlayerToBall() {
  let best = null;
  let bestDist = Infinity;

  for (const player of state.players) {
    const dx = state.ball.x - player.x;
    const dy = state.ball.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < bestDist) {
      best = player;
      bestDist = dist;
    }
  }

  if (best && bestDist < 24) {
    return best;
  }

  return null;
}

function shootBall() {
  if (!state.ball || state.gameOver) return;

  const owner = state.nearBallOwner || findNearestPlayerToBall();
  if (!owner) return;

  const dx = state.ball.x - owner.x;
  const dy = state.ball.y - owner.y;
  const power = 380;

  state.ball.vx = (dx * 0.95) * 1.5 + (owner.side === 'home' ? 120 : -120);
  state.ball.vy = (dy * 0.95) * 1.5;
  const magnitude = Math.hypot(state.ball.vx, state.ball.vy) || 1;
  state.ball.vx = (state.ball.vx / magnitude) * power;
  state.ball.vy = (state.ball.vy / magnitude) * power;
  state.nearBallOwner = null;
}

function updatePlayerControl(player, dt) {
  if (!player.isControlled) {
    const target = findNearestPlayerToBall();
    if (target && target.side === 'away' && target.name !== player.name) {
      const dx = state.ball.x - player.x;
      const dy = state.ball.y - player.y;
      const dist = Math.hypot(dx, dy) || 1;
      player.vx = (dx / dist) * player.speed;
      player.vy = (dy / dist) * player.speed;
      return;
    }

    const targetX = player.side === 'home' ? 240 : 720;
    const targetY = player.y + Math.sin((performance.now() / 700) + player.x) * 45;
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const dist = Math.hypot(dx, dy) || 1;

    player.vx = (dx / dist) * player.speed * 0.5;
    player.vy = (dy / dist) * player.speed * 0.5;
    return;
  }

  let moveX = 0;
  let moveY = 0;

  if (keys.w) moveY -= 1;
  if (keys.s) moveY += 1;
  if (keys.a) moveX -= 1;
  if (keys.d) moveX += 1;

  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY) || 1;
    moveX /= len;
    moveY /= len;
    player.vx = moveX * player.speed;
    player.vy = moveY * player.speed;
  } else {
    player.vx *= 0.8;
    player.vy *= 0.8;
  }
}

function updatePlayers(dt) {
  for (const player of state.players) {
    updatePlayerControl(player, dt);

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.x = clamp(player.x, 35, FIELD.width - 35);
    player.y = clamp(player.y, 35, FIELD.height - 35);

    const dx = state.ball.x - player.x;
    const dy = state.ball.y - player.y;
    const dist = Math.hypot(dx, dy);
    const minDist = player.radius + state.ball.radius + 2;

    if (dist < minDist) {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      state.ball.x = player.x + nx * minDist;
      state.ball.y = player.y + ny * minDist;
      state.nearBallOwner = player;
    }
  }
}

function updateBall(dt) {
  state.ball.x += state.ball.vx * dt;
  state.ball.y += state.ball.vy * dt;
  state.ball.vx *= 0.99;
  state.ball.vy *= 0.99;

  if (Math.abs(state.ball.vx) < 6) state.ball.vx = 0;
  if (Math.abs(state.ball.vy) < 6) state.ball.vy = 0;

  if (state.ball.y < 0 || state.ball.y > FIELD.height) {
    state.ball.vy *= -0.9;
    state.ball.y = clamp(state.ball.y, 12, FIELD.height - 12);
  }

  const goalTop = (FIELD.height - FIELD.goalHeight) / 2;
  const goalBottom = goalTop + FIELD.goalHeight;

  const inGoalArea = state.ball.y > goalTop && state.ball.y < goalBottom;

  if (state.ball.x < 0 && inGoalArea) {
    state.awayScore += 1;
    awayScoreEl.textContent = String(state.awayScore);
    resetBall();
  }

  if (state.ball.x > FIELD.width && inGoalArea) {
    state.homeScore += 1;
    homeScoreEl.textContent = String(state.homeScore);
    resetBall();
  }

  if (state.ball.x < 0 || state.ball.x > FIELD.width || state.ball.y < 0 || state.ball.y > FIELD.height) {
    const perimeter = state.ball.x < 0 ? 0 : state.ball.x > FIELD.width ? FIELD.width : state.ball.x;
    state.ball.x = clamp(perimeter, 0, FIELD.width);
    state.ball.y = clamp(state.ball.y, 10, FIELD.height - 10);
  }
}

function drawPitch() {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);

  ctx.fillStyle = '#138b52';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, FIELD.width - 20, FIELD.height - 20);

  ctx.beginPath();
  ctx.moveTo(FIELD.width / 2, 10);
  ctx.lineTo(FIELD.width / 2, FIELD.height - 10);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(FIELD.width / 2, FIELD.height / 2, 68, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeRect(10, (FIELD.height - FIELD.goalHeight) / 2, 52, FIELD.goalHeight);
  ctx.strokeRect(FIELD.width - 62, (FIELD.height - FIELD.goalHeight) / 2, 52, FIELD.goalHeight);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let y = 0; y < FIELD.height; y += 26) {
    ctx.fillRect(FIELD.width / 2 - 1, y, 2, 12);
  }
}

function drawPlayers() {
  for (const player of state.players) {
    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#071220';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(player.name[0].toUpperCase(), player.x, player.y + 4);
  }
}

function drawBall() {
  ctx.beginPath();
  ctx.fillStyle = '#f8f8f8';
  ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.arc(state.ball.x, state.ball.y, state.ball.radius - 2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGlowTitle() {
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.font = '800 20px sans-serif';
  ctx.fillText('PLAYBALL', 24, 34);
}

function updateTimer(dt) {
  if (state.gameOver) return;
  state.timeLeft = Math.max(0, state.timeLeft - dt);

  const minutes = Math.floor(state.timeLeft / 60);
  const seconds = Math.floor(state.timeLeft % 60);
  timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (state.timeLeft <= 0) {
    state.gameOver = true;
  }
}

function animate(timestamp) {
  const delta = Math.min((timestamp - state.lastTime) / 1000 || 0.016, 0.033);
  state.lastTime = timestamp;

  if (!state.gameOver) {
    updatePlayers(delta);
    updateBall(delta);
    updateTimer(delta);
  }

  drawPitch();
  drawGlowTitle();
  drawPlayers();
  drawBall();

  requestAnimationFrame(animate);
}

resetMatch();
requestAnimationFrame(animate);
