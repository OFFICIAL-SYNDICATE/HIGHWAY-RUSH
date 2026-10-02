const canvas = document.querySelector('#road');
const ctx = canvas.getContext('2d', { alpha: false });
const screen = document.querySelector('.screen');
const scoreEl = document.querySelector('#score');
const bestScoreEl = document.querySelector('#bestScore');
const cashEl = document.querySelector('#cash');
const speedEl = document.querySelector('#speed');
const overlay = document.querySelector('#overlay');
const crashOverlay = document.querySelector('#crash');
const finalScoreEl = document.querySelector('#finalScore');
const earnedCashEl = document.querySelector('#earnedCash');
const homeGameButton = document.querySelector('#homeGame');
const homeCrashButton = document.querySelector('#homeCrash');
const saveStatusEl = document.querySelector('#saveStatus');
const guestBestKey = 'highway-rush-guest-best';
const adminPanel = document.querySelector('#adminPanel');
const adminRows = document.querySelector('#adminRows');
const adminStatus = document.querySelector('#adminStatus');
const adminMoneyAction = document.querySelector('#adminMoneyAction');
const adminMoneyPlayer = document.querySelector('#adminMoneyPlayer');
const adminMoneyAmount = document.querySelector('#adminMoneyAmount');
const adminMoneyApply = document.querySelector('#adminMoneyApply');
const adminMoneyStatus = document.querySelector('#adminMoneyStatus');
const leaderboardPanel = document.querySelector('#leaderboardPanel');
const leaderboardRows = document.querySelector('#leaderboardRows');
const leaderboardStatus = document.querySelector('#leaderboardStatus');
let leaderboardTimer;
const shopPanel = document.querySelector('#shopPanel');
const shopItemsEl = document.querySelector('#shopItems');
const shopCashEl = document.querySelector('#shopCash');
const shopStatusEl = document.querySelector('#shopStatus');
const nitroButton = document.querySelector('#nitroControl');
const nitroCountEl = document.querySelector('#nitroCount');
const jumpButton = document.querySelector('#jumpControl');
const usernameInput = document.querySelector('#usernameInput');
const saveUsernameButton = document.querySelector('#saveUsername');
const usernameKey = 'highway-rush-username';
const gameMenu = document.querySelector('#gameMenu');
const menuToggle = document.querySelector('#menuToggle');
const adminOpenButton = document.querySelector('#adminOpen');
const payPanel = document.querySelector('#payPanel');
const payPlayer = document.querySelector('#payPlayer');
const payAmount = document.querySelector('#payAmount');
const payBalance = document.querySelector('#payBalance');
const payStatus = document.querySelector('#payStatus');
const sendPaymentButton = document.querySelector('#sendPayment');

const W = canvas.width;
const H = canvas.height;
const road = { x: 36, width: 168 };
const laneWidth = road.width / 3;
const bikeHitbox = { width: 15, height: 50 };
const carHitbox = { width: 20, height: 34 };
const bikeColors = ['#e84732', '#42b8dc', '#b7e84d', '#d477df', '#f1b943'];
const walletKey = 'highway-rush-cash';
const walletRevisionKey = 'highway-rush-cash-revision';
const upgradesKey = 'highway-rush-upgrades';
const speedUpgradeCosts = [60, 120, 220];
const nitroCost = 110;
const jumpCost = 95;
const maxSpeed = 500;
const jumpDuration = 0.95;
let bikeColorIndex = -1;
let bikeColor = bikeColors[0];
let state = 'menu';
let playerX = laneCenter(1);
let traffic = [];
let distance = 0;
let bestScore = 0;
let walletMoney = 0;
let walletRevision = -1;
let runPaid = false;
let adminAllowed = false;
let upgrades = { speed: 0, nitro: false, jump: false };
let nitroUses = 0;
let nitroTime = 0;
let jumpTime = 0;
let jumpCooldown = 0;
let speed = 0;
let spawnClock = 0;
let roadOffset = 0;
let lastTime = 0;
let animationFrame;
let idleFrame;
const heldActions = { accelerate: false, brake: false, left: false, right: false };
const apiBase = String(window.HIGHWAY_API_BASE || '').replace(/\/+$/, '');

function apiFetch(path, options) {
  return fetch(`${apiBase}${path}`, options);
}

function laneCenter(lane) {
  return road.x + laneWidth * (lane + 0.5);
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawBike(x, y, color = '#e84732') {
  ctx.save();
  ctx.translate(x * 0.18, 0);
  ctx.scale(0.82, 1);
  // Front tire, fork, bars, and headlight
  rect(x - 4, y - 22, 8, 11, '#10120f');
  rect(x - 2, y - 21, 4, 8, '#858675');
  rect(x - 1, y - 13, 2, 25, '#c4c1ad');
  rect(x - 9, y - 14, 18, 2, '#d5d0b5');
  rect(x - 8, y - 17, 3, 4, '#d5d0b5');
  rect(x + 5, y - 17, 3, 4, '#d5d0b5');
  // Sport-bike nose and fuel tank
  rect(x - 7, y - 13, 14, 11, '#17201a');
  rect(x - 6, y - 12, 12, 9, color);
  rect(x - 3, y - 12, 6, 3, '#fff0c6');
  rect(x - 7, y - 9, 2, 5, color);
  rect(x + 5, y - 9, 2, 5, color);
  rect(x - 5, y - 3, 10, 10, '#252a24');
  rect(x - 4, y - 2, 8, 7, '#e6e0c4');
  rect(x - 6, y + 5, 12, 9, '#343936');
  rect(x - 8, y + 6, 3, 8, color);
  rect(x + 5, y + 6, 3, 8, color);
  // Tail and rear tire
  rect(x - 6, y + 13, 12, 6, '#17201a');
  rect(x - 5, y + 14, 10, 4, color);
  rect(x - 4, y + 17, 8, 10, '#10120f');
  rect(x - 2, y + 18, 4, 7, '#858675');
  rect(x - 2, y + 13, 4, 2, '#ff5740');
  // Rider: boots, bright racing suit, arms on the handlebars, and helmet
  rect(x - 7, y + 12, 4, 7, '#172632');
  rect(x + 3, y + 12, 4, 7, '#172632');
  rect(x - 8, y + 17, 5, 3, '#f5d84c');
  rect(x + 3, y + 17, 5, 3, '#f5d84c');
  rect(x - 6, y + 4, 12, 11, '#153d50');
  rect(x - 5, y + 5, 10, 9, '#27a7c2');
  rect(x - 6, y + 5, 2, 7, '#fff0c6');
  rect(x + 4, y + 5, 2, 7, '#fff0c6');
  rect(x - 8, y - 9, 3, 14, '#27a7c2');
  rect(x + 5, y - 9, 3, 14, '#27a7c2');
  rect(x - 9, y - 15, 3, 3, '#f3e4bf');
  rect(x + 6, y - 15, 3, 3, '#f3e4bf');
  rect(x - 6, y - 5, 12, 11, '#152932');
  rect(x - 5, y - 4, 10, 9, '#f5b93d');
  rect(x - 4, y - 3, 8, 3, '#26333a');
  rect(x - 3, y - 5, 6, 2, '#fff0c6');
  // Keep the paint clearly visible around the rider's fixed-color suit.
  rect(x - 8, y + 5, 2, 8, color);
  rect(x + 6, y + 5, 2, 8, color);
  ctx.restore();
}

function drawCar(x, y, color, indicator = 0, signalFlash = false) {
  rect(x - 10, y - 16, 20, 35, '#11130f');
  rect(x - 8, y - 17, 16, 34, color);
  rect(x - 6, y - 12, 12, 8, '#26333a');
  rect(x - 6, y + 6, 12, 7, '#26333a');
  rect(x - 10, y - 11, 2, 7, '#141612');
  rect(x + 8, y - 11, 2, 7, '#141612');
  rect(x - 10, y + 7, 2, 7, '#141612');
  rect(x + 8, y + 7, 2, 7, '#141612');
  rect(x - 7, y + 15, 4, 2, '#ff5740');
  rect(x + 3, y + 15, 4, 2, '#ff5740');
  rect(x - 3, y - 2, 6, 7, '#ffffff18');
  if (indicator < 0) rect(x - 9, y - 15, 3, 3, signalFlash ? '#ffd34e' : '#9c712d');
  if (indicator > 0) rect(x + 6, y - 15, 3, 3, signalFlash ? '#ffd34e' : '#9c712d');
}

function drawScene(now = performance.now()) {
  rect(0, 0, W, H, '#344a2c');
  // Moving grass pixels and roadside markers
  for (let y = -12 + (roadOffset % 24); y < H; y += 24) {
    rect(7, y, 8, 4, '#435a32');
    rect(22, y + 9, 5, 4, '#293e27');
    rect(215, y + 7, 8, 4, '#435a32');
    rect(226, y + 17, 5, 4, '#293e27');
    rect(29, y, 3, 13, '#ddd1a8');
    rect(208, y, 3, 13, '#ddd1a8');
  }
  // Asphalt and shoulders
  rect(32, 0, 176, H, '#b59c62');
  rect(36, 0, 168, H, '#434641');
  rect(39, 0, 2, H, '#77766a');
  rect(199, 0, 2, H, '#77766a');
  // Broken center lane markings
  for (let y = -32 + (roadOffset % 50); y < H; y += 50) {
    rect(road.x + laneWidth - 1, y, 2, 25, '#ddd6b4');
    rect(road.x + laneWidth * 2 - 1, y, 2, 25, '#ddd6b4');
  }
  // Edge rumble strips
  for (let y = -12 + (roadOffset % 24); y < H; y += 24) {
    rect(road.x, y, 2, 10, '#e9dba9');
    rect(road.x + road.width - 2, y, 2, 10, '#e9dba9');
  }
  traffic.forEach((car) => drawCar(
    laneCenter(car.lane),
    car.y,
    car.color,
    car.indicator,
    car.indicator !== 0 && Math.floor(now / 130) % 2 === 0,
  ));
  const jumpProgress = jumpTime > 0 ? (jumpDuration - jumpTime) / jumpDuration : 0;
  const lift = jumpTime > 0 ? Math.sin(jumpProgress * Math.PI) * 14 : 0;
  drawBike(playerX, H - 70 - lift, bikeColor);
}

function reset() {
  playerX = laneCenter(1);
  traffic = [];
  distance = 0;
  speed = 0;
  spawnClock = 0;
  roadOffset = 0;
  scoreEl.textContent = '000000';
  speedEl.textContent = '0';
}

function startGame() {
  cancelAnimationFrame(animationFrame);
  cancelAnimationFrame(idleFrame);
  idleFrame = undefined;
  bikeColorIndex = (bikeColorIndex + 1) % bikeColors.length;
  bikeColor = bikeColors[bikeColorIndex];
  runPaid = false;
  earnedCashEl.textContent = '';
  nitroUses = upgrades.nitro ? 2 : 0;
  nitroTime = 0;
  jumpTime = 0;
  jumpCooldown = 0;
  updateAbilityControls();
  reset();
  state = 'playing';
  screen.classList.add('playing');
  heldActions.accelerate = false;
  heldActions.brake = false;
  heldActions.left = false;
  heldActions.right = false;
  overlay.classList.add('hidden');
  crashOverlay.classList.remove('visible');
  lastTime = performance.now();
  animationFrame = requestAnimationFrame(loop);
}

function returnHome() {
  if (state === 'playing') awardRunMoney();
  cancelAnimationFrame(animationFrame);
  cancelAnimationFrame(idleFrame);
  state = 'menu';
  screen.classList.remove('playing');
  heldActions.accelerate = false;
  heldActions.brake = false;
  heldActions.left = false;
  heldActions.right = false;
  nitroTime = 0;
  jumpTime = 0;
  jumpCooldown = 0;
  updateAbilityControls();
  document.querySelectorAll('.steer,.pedal').forEach((button) => button.classList.remove('is-held'));
  reset();
  overlay.classList.remove('hidden');
  crashOverlay.classList.remove('visible');
  idleFrame = requestAnimationFrame(idleLoop);
}

function endGame() {
  state = 'crashed';
  screen.classList.remove('playing');
  heldActions.accelerate = false;
  heldActions.brake = false;
  heldActions.left = false;
  heldActions.right = false;
  nitroTime = 0;
  jumpTime = 0;
  updateAbilityControls();
  const score = String(Math.floor(distance)).padStart(6, '0');
  finalScoreEl.textContent = score;
  const earned = awardRunMoney();
  earnedCashEl.textContent = `+$${earned} CASH`;
  saveStatusEl.textContent = 'SAVING HIGH SCORE...';
  crashOverlay.classList.add('visible');
  saveHighScore(Math.floor(distance));
}

function showBestScore() {
  bestScoreEl.textContent = String(bestScore).padStart(6, '0');
}

function readWallet() {
  try {
    const value = Number(localStorage.getItem(walletKey) || 0);
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function readUpgrades() {
  try {
    const saved = JSON.parse(localStorage.getItem(upgradesKey) || '{}');
    return {
      speed: Math.max(0, Math.min(speedUpgradeCosts.length, Math.floor(Number(saved.speed) || 0))),
      nitro: saved.nitro === true,
      jump: saved.jump === true,
    };
  } catch {
    return { speed: 0, nitro: false, jump: false };
  }
}

function showWallet() {
  cashEl.textContent = `$${walletMoney}`;
  shopCashEl.textContent = `$${walletMoney}`;
}

function updateAbilityControls() {
  nitroButton.hidden = !upgrades.nitro;
  jumpButton.hidden = !upgrades.jump;
  nitroCountEl.textContent = String(nitroUses);
  jumpButton.disabled = jumpCooldown > 0;
  jumpButton.textContent = jumpCooldown > 0 ? 'WAIT' : 'JUMP';
}

function saveWallet() {
  try {
    localStorage.setItem(walletKey, String(walletMoney));
  } catch {
    // The game can still keep the wallet for the current session.
  }
  showWallet();
  updatePresence();
}

function awardRunMoney() {
  if (runPaid) return 0;
  runPaid = true;
  const earned = Math.floor(distance / 100) * 2;
  walletMoney += earned;
  saveWallet();
  return earned;
}

function renderShop() {
  shopItemsEl.replaceChildren();
  shopStatusEl.textContent = 'EARN $2 FOR EVERY 100 DISTANCE.';
  const items = [
    { id: 'speed', name: 'ENGINE TUNE', description: `FASTER + HIGHER TOP SPEED · LEVEL ${upgrades.speed}/${speedUpgradeCosts.length}`, cost: speedUpgradeCosts[upgrades.speed], owned: upgrades.speed >= speedUpgradeCosts.length },
    { id: 'nitro', name: 'NITRO SYSTEM', description: '2 SPEED BURSTS EACH RUN · SHIFT / BUTTON', cost: nitroCost, owned: upgrades.nitro },
    { id: 'jump', name: 'JUMP KIT', description: 'LEAP OVER TRAFFIC · SPACE / BUTTON', cost: jumpCost, owned: upgrades.jump },
  ];
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'upgrade-item';
    const details = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'upgrade-name';
    name.textContent = item.name;
    const description = document.createElement('div');
    description.className = 'upgrade-desc';
    description.textContent = item.description;
    details.append(name, description);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.owned ? (item.id === 'speed' ? 'MAX' : 'INSTALLED') : `BUY $${item.cost}`;
    button.disabled = item.owned || walletMoney < item.cost;
    button.addEventListener('click', () => {
      if (walletMoney < item.cost || item.owned) return;
      const oldWallet = walletMoney;
      const oldUpgrades = upgrades;
      const nextUpgrades = { ...upgrades };
      if (item.id === 'speed') nextUpgrades.speed += 1;
      else nextUpgrades[item.id] = true;
      walletMoney -= item.cost;
      upgrades = nextUpgrades;
      try {
        localStorage.setItem(upgradesKey, JSON.stringify(upgrades));
        localStorage.setItem(walletKey, String(walletMoney));
      } catch {
        walletMoney = oldWallet;
        upgrades = oldUpgrades;
        shopStatusEl.textContent = 'PURCHASE COULD NOT BE SAVED';
        return;
      }
      showWallet();
      updatePresence();
      updateAbilityControls();
      renderShop();
      shopStatusEl.textContent = `${item.name} ${item.id === 'speed' ? 'UPGRADED' : 'INSTALLED'}`;
    });
    card.append(details, button);
    shopItemsEl.append(card);
  }
}

function activateNitro() {
  if (state !== 'playing' || !upgrades.nitro || nitroUses <= 0 || nitroTime > 0) return;
  nitroUses -= 1;
  nitroTime = 2.5;
  updateAbilityControls();
}

function activateJump() {
  if (state !== 'playing' || !upgrades.jump || jumpCooldown > 0 || jumpTime > 0) return;
  jumpTime = jumpDuration;
  jumpCooldown = 2.5;
  updateAbilityControls();
}

function openShop() {
  renderShop();
  shopPanel.hidden = false;
}

function closeShop() {
  shopPanel.hidden = true;
}

function readGuestBest() {
  try {
    const points = Number(localStorage.getItem(guestBestKey) || 0);
    return Number.isSafeInteger(points) && points > 0 ? points : 0;
  } catch {
    return 0;
  }
}

function saveGuestBest(points) {
  const best = Math.max(readGuestBest(), points);
  try {
    localStorage.setItem(guestBestKey, String(best));
  } catch {
    // Private browsing may block local storage; keep the run score in memory.
  }
  bestScore = Math.max(bestScore, best);
  showBestScore();
}

async function loadBestScore() {
  bestScore = readGuestBest();
  showBestScore();
  try {
    const response = await apiFetch('/api/high-score');
    if (!response.ok) return;
    const result = await response.json();
    bestScore = Math.max(result.best ?? 0, readGuestBest());
    showBestScore();
  } catch {
    // The game remains playable if persistent scoring is unavailable.
  }
}

async function saveHighScore(points) {
  try {
    const response = await apiFetch('/api/high-score', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ points, username: readSavedUsername() }),
    });
    const result = await response.json();
    if (response.status === 401) {
      saveGuestBest(points);
      saveStatusEl.textContent = 'GUEST BEST SAVED HERE';
      return;
    }
    if (!response.ok) throw new Error(result.error || 'Save failed');
    bestScore = result.best ?? bestScore;
    showBestScore();
    saveStatusEl.textContent = result.improved ? 'NEW IP BEST SAVED' : 'BEST SCORE SAVED';
  } catch {
    saveStatusEl.textContent = 'HIGH SCORE NOT SAVED';
  }
}

function readSavedUsername() {
  try {
    return localStorage.getItem(usernameKey) || '';
  } catch {
    return '';
  }
}

async function updatePresence() {
  try {
    const response = await apiFetch('/api/presence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: readSavedUsername(), cash: walletMoney, revision: walletRevision }),
    });
    if (!response.ok) return;
    const result = await response.json();
    if (Number.isSafeInteger(result.cash) && result.cash !== walletMoney) {
      walletMoney = result.cash;
      try { localStorage.setItem(walletKey, String(walletMoney)); } catch { /* Keep the server balance in memory. */ }
      showWallet();
      renderShop();
      if (!payPanel.hidden) payBalance.textContent = `$${walletMoney.toLocaleString()}`;
    }
    if (Number.isSafeInteger(result.revision)) {
      walletRevision = result.revision;
      try { localStorage.setItem(walletRevisionKey, String(walletRevision)); } catch { /* Keep the revision in memory. */ }
    }
  } catch {
    // Presence is best-effort; the game stays playable when offline.
  }
}

async function refreshLeaderboard() {
  leaderboardStatus.textContent = 'LOADING RIDERS...';
  try {
    const response = await apiFetch('/api/leaderboard');
    if (!response.ok) throw new Error('Could not load leaderboard');
    const { players } = await response.json();
    leaderboardRows.replaceChildren();
    players.forEach((player, index) => {
      const row = document.createElement('li');
      row.className = 'leaderboard-row';
      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = String(index + 1).padStart(2, '0');
      const name = document.createElement('span');
      name.className = 'leaderboard-name';
      name.textContent = player.username || 'RIDER';
      const status = document.createElement('span');
      status.className = `leaderboard-presence ${player.online ? 'is-online' : 'is-offline'}`;
      status.textContent = player.online ? 'ONLINE' : 'OFFLINE';
      const cash = document.createElement('strong');
      cash.className = 'leaderboard-score';
      cash.textContent = `$${Number(player.cash || 0).toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })}`;
      row.append(rank, name, status, cash);
      leaderboardRows.append(row);
    });
    const onlineCount = players.filter((player) => player.online).length;
    leaderboardStatus.textContent = players.length
      ? `${players.length} SAVED RIDERS · ${onlineCount} ONLINE`
      : 'NO SAVED RIDERS YET';
  } catch {
    leaderboardRows.replaceChildren();
    leaderboardStatus.textContent = 'LEADERBOARD UNAVAILABLE';
  }
}

function openLeaderboard() {
  leaderboardPanel.hidden = false;
  refreshLeaderboard();
  clearInterval(leaderboardTimer);
  leaderboardTimer = window.setInterval(refreshLeaderboard, 15000);
}

function closeLeaderboard() {
  leaderboardPanel.hidden = true;
  clearInterval(leaderboardTimer);
}

async function checkAdminAccess() {
  try {
    const response = await apiFetch('/api/admin/access');
    adminAllowed = response.ok;
    adminOpenButton.hidden = !adminAllowed;
  } catch {
    adminOpenButton.hidden = true;
  }
}

async function loadAdminPlayers(selectedId = adminMoneyPlayer.value) {
  try {
    const response = await apiFetch('/api/admin/players');
    if (!response.ok) throw new Error('Could not load players');
    const { players } = await response.json();
    adminMoneyPlayer.replaceChildren(new Option('SELECT PLAYER', ''));
    for (const player of players) {
      const option = new Option(`${player.username} · $${Number(player.cash).toLocaleString()} · ${player.online ? 'ONLINE' : 'OFFLINE'}`, player.user_id);
      adminMoneyPlayer.add(option);
    }
    if (selectedId && players.some((player) => player.user_id === selectedId)) adminMoneyPlayer.value = selectedId;
    if (!players.length) adminMoneyStatus.textContent = 'NO PLAYERS TO MANAGE YET';
  } catch {
    adminMoneyStatus.textContent = 'COULD NOT LOAD PLAYERS';
  }
}

async function openAdminPanel() {
  if (!adminAllowed) return;
  adminPanel.hidden = false;
  adminStatus.textContent = 'LOADING HIGH SCORES...';
  adminRows.replaceChildren();
  adminMoneyStatus.textContent = 'LOADING PLAYERS...';
  loadAdminPlayers();
  try {
    const response = await apiFetch('/api/admin/high-scores');
    if (!response.ok) throw new Error('Access denied');
    const { scores } = await response.json();
    for (const score of scores) {
      const row = document.createElement('tr');
      const ip = document.createElement('td');
      const points = document.createElement('td');
      const updated = document.createElement('td');
      ip.textContent = score.ip_address;
      points.textContent = String(score.points).padStart(6, '0');
      updated.textContent = new Date(score.updated_at).toLocaleString();
      row.append(ip, points, updated);
      adminRows.append(row);
    }
    adminStatus.textContent = scores.length ? `SHOWING ${scores.length} HIGH SCORES` : 'NO SAVED HIGH SCORES';
  } catch {
    adminStatus.textContent = 'COULD NOT LOAD HIGH SCORES';
  }
}

async function applyAdminMoneyCommand() {
  const amount = Number(adminMoneyAmount.value);
  const playerId = adminMoneyPlayer.value;
  const action = adminMoneyAction.value;
  if (!playerId) {
    adminMoneyStatus.textContent = 'SELECT A PLAYER';
    return;
  }
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000000) {
    adminMoneyStatus.textContent = 'ENTER A WHOLE AMOUNT FROM 0 TO 1,000,000,000';
    return;
  }
  adminMoneyApply.disabled = true;
  adminMoneyStatus.textContent = 'UPDATING CASH...';
  try {
    const response = await apiFetch('/api/admin/money', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerId, action, amount }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Command failed');
    adminMoneyStatus.textContent = `${action === 'set' ? 'SET' : 'ADDED'} · PLAYER NOW HAS $${Number(result.cash).toLocaleString()}`;
    await loadAdminPlayers(playerId);
  } catch (error) {
    adminMoneyStatus.textContent = error.message || 'COMMAND FAILED';
  } finally {
    adminMoneyApply.disabled = false;
  }
}

function closeAdminPanel() {
  adminPanel.hidden = true;
}

async function loadPaymentPlayers() {
  payPlayer.replaceChildren(new Option('SELECT PLAYER', ''));
  try {
    const response = await apiFetch('/api/players');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load players');
    for (const player of result.players) {
      const playerId = player.ip_address || player.user_id;
      payPlayer.add(new Option(`${player.ip_address || player.username} · ${player.online ? 'ONLINE' : 'OFFLINE'}`, playerId));
    }
    payStatus.textContent = result.players.length ? '' : 'NO OTHER PLAYERS YET';
  } catch (error) {
    payStatus.textContent = error.message || 'PLAYER LIST UNAVAILABLE';
  }
}

async function openPayment() {
  gameMenu.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  payPanel.hidden = false;
  payStatus.textContent = 'SYNCING WALLET...';
  await updatePresence();
  payBalance.textContent = `$${walletMoney.toLocaleString()}`;
  await loadPaymentPlayers();
}

function closePayment() {
  payPanel.hidden = true;
}

async function sendPayment() {
  const amount = Number(payAmount.value);
  if (!payPlayer.value) {
    payStatus.textContent = 'SELECT A PLAYER';
    return;
  }
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > walletMoney) {
    payStatus.textContent = 'ENTER AN AMOUNT UP TO YOUR CASH BALANCE';
    return;
  }
  sendPaymentButton.disabled = true;
  payStatus.textContent = 'SENDING CASH...';
  try {
    const response = await apiFetch('/api/pay', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerId: payPlayer.value, amount }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Payment failed');
    walletMoney = result.cash;
    walletRevision = result.revision;
    try {
      localStorage.setItem(walletKey, String(walletMoney));
      localStorage.setItem(walletRevisionKey, String(walletRevision));
    } catch { /* Keep the returned balance in memory. */ }
    showWallet();
    renderShop();
    payBalance.textContent = `$${walletMoney.toLocaleString()}`;
    payStatus.textContent = `PAYMENT SENT · $${amount.toLocaleString()}`;
    payAmount.value = '';
    await loadPaymentPlayers();
    payStatus.textContent = `PAYMENT SENT · $${amount.toLocaleString()}`;
  } catch (error) {
    payStatus.textContent = error.message || 'PAYMENT FAILED';
  } finally {
    sendPaymentButton.disabled = false;
  }
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;
  if (nitroTime > 0) nitroTime = Math.max(0, nitroTime - dt);
  if (jumpTime > 0) jumpTime = Math.max(0, jumpTime - dt);
  if (jumpCooldown > 0) {
    jumpCooldown = Math.max(0, jumpCooldown - dt);
    if (jumpCooldown === 0) updateAbilityControls();
  }
  if (heldActions.brake) speed = Math.max(0, speed - 210 * dt);
  else if (heldActions.accelerate || nitroTime > 0) {
    const acceleration = 170 + upgrades.speed * 70 + (nitroTime > 0 ? 500 : 0);
    const speedLimit = maxSpeed + upgrades.speed * 45 + (nitroTime > 0 ? 180 : 0);
    speed = Math.min(speedLimit, speed + acceleration * dt);
  }
  distance += speed * dt * 0.12;
  roadOffset = (roadOffset + speed * dt * 0.55) % 50;
  const steerDirection = Number(heldActions.right) - Number(heldActions.left);
  playerX = Math.max(road.x + 12, Math.min(road.x + road.width - 12, playerX + steerDirection * 92 * dt));
  spawnClock += dt;
  const spawnEvery = Math.max(0.62, 1.35 - speed / 360);
  if (spawnClock >= spawnEvery) {
    spawnClock = 0;
    const lane = Math.floor(Math.random() * 3);
    if (!traffic.some((car) => car.lane === lane && car.y < 92)) {
      const colors = ['#e2b647', '#3c9bb5', '#a56bc1', '#ddd5b6'];
      traffic.push({
        lane,
        targetLane: lane,
        y: -24,
        color: colors[Math.floor(Math.random() * colors.length)],
        willChange: Math.random() < 0.3,
        changeIn: 0.35 + Math.random() * 0.65,
        indicator: 0,
        signalDelay: 0,
        changing: false,
      });
    }
  }
  traffic.forEach((car) => {
    car.y += speed * dt * 0.34;
    if (!car.willChange) return;
    if (car.indicator && !car.changing) {
      car.signalDelay -= dt;
      if (car.signalDelay <= 0) car.changing = true;
    } else if (!car.changing) {
      car.changeIn -= dt;
      if (car.changeIn <= 0) {
        const directions = Math.random() < 0.5 ? [-1, 1] : [1, -1];
        const direction = directions.find((candidate) => {
          const target = car.lane + candidate;
          if (target < 0 || target > 2) return false;
          return !traffic.some((other) => other !== car &&
            Math.abs(other.y - car.y) < 42 &&
            Math.abs(other.lane - target) < 0.65);
        });
        if (direction) {
          car.indicator = direction;
          car.targetLane = car.lane + direction;
          car.signalDelay = 0.55;
        } else {
          car.changeIn = 0.9 + Math.random() * 1.2;
        }
      }
    }
    if (car.changing) {
      car.lane += car.indicator * dt * 1.15;
      if ((car.indicator < 0 && car.lane <= car.targetLane) ||
          (car.indicator > 0 && car.lane >= car.targetLane)) {
        car.lane = car.targetLane;
        car.changing = false;
        car.indicator = 0;
        car.changeIn = 1.2 + Math.random() * 0.8;
      }
    }
  });
  traffic = traffic.filter((car) => car.y < H + 30);
  const playerY = H - 67.5;
  if (jumpTime <= 0 && traffic.some((car) =>
    Math.abs(laneCenter(car.lane) - playerX) < (bikeHitbox.width + carHitbox.width) / 2 &&
    Math.abs(car.y - playerY) < (bikeHitbox.height + carHitbox.height) / 2
  )) {
    endGame();
  }
  scoreEl.textContent = String(Math.floor(distance)).padStart(6, '0');
  speedEl.textContent = String(Math.floor(speed));
  drawScene();
  if (state === 'playing') animationFrame = requestAnimationFrame(loop);
}

function idleLoop(now) {
  if (state === 'menu') {
    roadOffset = (now * 0.018) % 50;
    drawScene(now);
    idleFrame = requestAnimationFrame(idleLoop);
  }
}

document.querySelector('#play').addEventListener('click', startGame);
document.querySelector('#retry').addEventListener('click', startGame);
homeGameButton.addEventListener('click', returnHome);
homeCrashButton.addEventListener('click', returnHome);
document.querySelector('#shopOpen').addEventListener('click', openShop);
document.querySelector('#shopClose').addEventListener('click', closeShop);
menuToggle.addEventListener('click', () => {
  gameMenu.hidden = !gameMenu.hidden;
  menuToggle.setAttribute('aria-expanded', String(!gameMenu.hidden));
  menuToggle.setAttribute('aria-label', gameMenu.hidden ? 'Open menu' : 'Close menu');
});
document.querySelector('#payOpen').addEventListener('click', openPayment);
document.querySelector('#leaderboardOpen').addEventListener('click', openLeaderboard);
document.querySelector('#leaderboardClose').addEventListener('click', closeLeaderboard);
leaderboardPanel.addEventListener('click', (event) => {
  if (event.target === leaderboardPanel) closeLeaderboard();
});
adminOpenButton.addEventListener('click', () => {
  gameMenu.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open menu');
  openAdminPanel();
});
document.querySelector('#payClose').addEventListener('click', closePayment);
document.querySelector('#sendPayment').addEventListener('click', sendPayment);
payPanel.addEventListener('click', (event) => {
  if (event.target === payPanel) closePayment();
});
shopPanel.addEventListener('click', (event) => {
  if (event.target === shopPanel) closeShop();
});
document.querySelector('#adminClose').addEventListener('click', closeAdminPanel);
adminMoneyApply.addEventListener('click', applyAdminMoneyCommand);
adminPanel.addEventListener('click', (event) => {
  if (event.target === adminPanel) closeAdminPanel();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !payPanel.hidden) {
    closePayment();
    return;
  }
  if (event.key === 'Escape' && !shopPanel.hidden) {
    closeShop();
    return;
  }
  if (event.key === 'Escape' && !adminPanel.hidden) {
    closeAdminPanel();
    return;
  }
  if (event.key === 'Escape' && !leaderboardPanel.hidden) {
    closeLeaderboard();
    return;
  }
  if (event.key === 'F2') {
    event.preventDefault();
    if (adminAllowed) openAdminPanel();
    return;
  }
  if (event.key === 'Escape' && !gameMenu.hidden) {
    gameMenu.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    return;
  }
  if (state === 'playing' && event.key === 'Shift' && !event.repeat) {
    activateNitro();
    return;
  }
  if (state === 'playing' && event.key === ' ') {
    event.preventDefault();
    activateJump();
    return;
  }
  if (shopPanel.hidden && adminPanel.hidden && leaderboardPanel.hidden && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) event.preventDefault();
  if (state === 'playing' && (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a')) heldActions.left = true;
  if (state === 'playing' && (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd')) heldActions.right = true;
  if (state === 'playing' && (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w')) heldActions.accelerate = true;
  if (state === 'playing' && (event.key === 'ArrowDown' || event.key.toLowerCase() === 's')) heldActions.brake = true;
  if (shopPanel.hidden && adminPanel.hidden && leaderboardPanel.hidden && payPanel.hidden && gameMenu.hidden && (event.key === 'Enter' || event.key === ' ') && state !== 'playing') startGame();
});
document.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') heldActions.left = false;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') heldActions.right = false;
  if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') heldActions.accelerate = false;
  if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') heldActions.brake = false;
});
document.querySelectorAll('.steer').forEach((button) => {
  const direction = Number(button.dataset.steer);
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (state !== 'playing') return;
    heldActions[direction < 0 ? 'left' : 'right'] = true;
    button.classList.add('is-held');
    button.setPointerCapture(event.pointerId);
  });
  const release = () => {
    heldActions[direction < 0 ? 'left' : 'right'] = false;
    button.classList.remove('is-held');
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
});
document.querySelectorAll('.pedal').forEach((button) => {
  const action = button.dataset.action;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (state !== 'playing') return;
    heldActions[action] = true;
    button.classList.add('is-held');
    button.setPointerCapture(event.pointerId);
  });
  const release = () => {
    heldActions[action] = false;
    button.classList.remove('is-held');
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
});
nitroButton.addEventListener('click', activateNitro);
jumpButton.addEventListener('click', activateJump);

drawScene();
idleFrame = requestAnimationFrame(idleLoop);
try {
  usernameInput.value = localStorage.getItem(usernameKey) || '';
} catch {
  // Keep the name field usable when storage is unavailable.
}
saveUsernameButton.addEventListener('click', () => {
  const username = usernameInput.value.trim().slice(0, 16);
  usernameInput.value = username;
  try {
    localStorage.setItem(usernameKey, username);
    updatePresence();
    saveUsernameButton.textContent = 'SAVED';
    saveUsernameButton.classList.add('saved');
    window.setTimeout(() => {
      saveUsernameButton.textContent = 'SAVE NAME';
      saveUsernameButton.classList.remove('saved');
    }, 1400);
  } catch {
    saveUsernameButton.textContent = 'ERROR';
  }
});
walletMoney = readWallet();
try {
  const storedRevision = Number(localStorage.getItem(walletRevisionKey));
  walletRevision = Number.isSafeInteger(storedRevision) && storedRevision >= 0 ? storedRevision : -1;
} catch {
  walletRevision = -1;
}
upgrades = readUpgrades();
showWallet();
updateAbilityControls();
renderShop();
loadBestScore();
checkAdminAccess();
updatePresence();
window.setInterval(updatePresence, 15000);
window.addEventListener('blur', () => {
  for (const action of Object.keys(heldActions)) heldActions[action] = false;
  document.querySelectorAll('.steer,.pedal').forEach((button) => button.classList.remove('is-held'));
});
