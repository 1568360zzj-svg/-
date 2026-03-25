// 暗域消消乐 - 核心引擎
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// ===== 配置 =====
const COLS = 8;
const ROWS = 8;
const GEM_TYPES = ['🔥', '💎', '⚡', '🌿', '💜', '⭐', '🌊'];
const COLORS = ['#ff4757', '#2ed573', '#ffa502', '#1e90ff', '#a55eea', '#ff6348', '#00d2d3'];
const BG_COLORS = ['#3d1518', '#1a3d1e', '#3d2e0a', '#0a2a3d', '#2d1a3d', '#3d1a0a', '#0a3d3d'];

let cellSize, padding, boardX, boardY;
let board = [];
let selected = null;
let animating = false;
let score = 0;
let moves = 30;
let level = 1;
let targetScore = 1000;
let combo = 0;

// ===== 动画系统 =====
let animations = []; // { type, gems, startTime, duration }

// ===== 初始化 =====
function init() {
    // 适配屏幕
    const maxW = Math.min(window.innerWidth - 20, 480);
    cellSize = Math.floor(maxW / COLS);
    padding = 4;
    canvas.width = cellSize * COLS;
    canvas.height = cellSize * ROWS;

    // 生成初始棋盘（确保无初始匹配）
    board = [];
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            let type;
            do {
                type = randInt(0, GEM_TYPES.length - 1);
            } while (wouldMatch(r, c, type));
            board[r][c] = { type, x: c, y: r, opacity: 1, scale: 1, offsetY: 0 };
        }
    }

    score = 0;
    moves = 30;
    level = 1;
    targetScore = 1000;
    combo = 0;
    selected = null;
    animations = [];
    updateHUD();
    hideOverlay();
    draw();
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wouldMatch(r, c, type) {
    // 检查左边两个
    if (c >= 2 && board[r][c-1] && board[r][c-2] &&
        board[r][c-1].type === type && board[r][c-2].type === type) return true;
    // 检查上面两个
    if (r >= 2 && board[r-1] && board[r-2] &&
        board[r-1][c] && board[r-2][c] &&
        board[r-1][c].type === type && board[r-2][c].type === type) return true;
    return false;
}

// ===== HUD =====
function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('moves').textContent = moves;
    document.getElementById('level').textContent = level;
}

// ===== 绘制 =====
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景网格
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * cellSize;
            const y = r * cellSize;
            ctx.fillStyle = (r + c) % 2 === 0 ? '#151530' : '#1a1a38';
            ctx.fillRect(x, y, cellSize, cellSize);
        }
    }

    // 绘制宝石
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const gem = board[r][c];
            if (!gem) continue;
            drawGem(gem);
        }
    }

    // 选中高亮
    if (selected) {
        const sx = selected.c * cellSize + 2;
        const sy = selected.r * cellSize + 2;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.strokeRect(sx, sy, cellSize - 4, cellSize - 4);
        // 发光效果
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.strokeRect(sx, sy, cellSize - 4, cellSize - 4);
        ctx.shadowBlur = 0;
    }
}

function drawGem(gem) {
    const cx = gem.x * cellSize + cellSize / 2;
    const cy = gem.y * cellSize + cellSize / 2 + (gem.offsetY || 0);
    const size = (cellSize - padding * 2) * (gem.scale || 1);
    const half = size / 2;

    ctx.globalAlpha = gem.opacity ?? 1;

    // 宝石背景
    const grad = ctx.createRadialGradient(cx - half * 0.3, cy - half * 0.3, 0, cx, cy, half);
    grad.addColorStop(0, lightenColor(COLORS[gem.type], 30));
    grad.addColorStop(1, COLORS[gem.type]);
    ctx.fillStyle = grad;

    // 圆角方块
    roundRect(ctx, cx - half, cy - half, size, size, size * 0.25);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, cx - half + 2, cy - half + 2, size - 4, half, size * 0.2);
    ctx.fill();

    // Emoji
    ctx.globalAlpha = 1;
    ctx.font = `${size * 0.55}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(GEM_TYPES[gem.type], cx, cy + 1);

    ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function lightenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
}

// ===== 交互 =====
function getCell(e) {
    const rect = canvas.getBoundingClientRect();
    let cx, cy;
    if (e.touches) {
        cx = e.touches[0].clientX - rect.left;
        cy = e.touches[0].clientY - rect.top;
    } else {
        cx = e.clientX - rect.left;
        cy = e.clientY - rect.top;
    }
    // 修正缩放
    cx *= canvas.width / rect.width;
    cy *= canvas.height / rect.height;
    const c = Math.floor(cx / cellSize);
    const r = Math.floor(cy / cellSize);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return { r, c };
    return null;
}

// 滑动支持
let touchStart = null;

function onPointerDown(e) {
    if (animating) return;
    e.preventDefault();
    const cell = getCell(e);
    if (!cell) return;
    touchStart = cell;

    if (selected) {
        const dr = Math.abs(cell.r - selected.r);
        const dc = Math.abs(cell.c - selected.c);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
            // 点击相邻 → 交换
            trySwap(selected, cell);
            selected = null;
            return;
        }
    }
    selected = cell;
    draw();
}

function onPointerMove(e) {
    if (!touchStart || animating) return;
    e.preventDefault();
    const cell = getCell(e);
    if (!cell) return;

    const dr = cell.r - touchStart.r;
    const dc = cell.c - touchStart.c;

    if (Math.abs(dr) + Math.abs(dc) >= 1) {
        let tr = touchStart.r, tc = touchStart.c;
        if (Math.abs(dr) > Math.abs(dc)) {
            tr += dr > 0 ? 1 : -1;
        } else {
            tc += dc > 0 ? 1 : -1;
        }
        if (tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS) {
            trySwap(touchStart, { r: tr, c: tc });
            selected = null;
            touchStart = null;
        }
    }
}

function onPointerUp() {
    touchStart = null;
}

canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('touchstart', onPointerDown, { passive: false });
canvas.addEventListener('touchmove', onPointerMove, { passive: false });
canvas.addEventListener('touchend', onPointerUp);

// ===== 交换逻辑 =====
async function trySwap(a, b) {
    animating = true;

    // 交换
    swap(a, b);
    await animateSwap(a, b, 150);

    // 检查匹配
    const matches = findAllMatches();
    if (matches.length === 0) {
        // 无匹配，换回来
        swap(a, b);
        await animateSwap(a, b, 150);
        animating = false;
        draw();
        return;
    }

    moves--;
    combo = 0;

    // 消除循环
    await processMatches();
    checkGameState();
    animating = false;
    draw();
}

function swap(a, b) {
    const temp = board[a.r][a.c];
    board[a.r][a.c] = board[b.r][b.c];
    board[b.r][b.c] = temp;

    if (board[a.r][a.c]) { board[a.r][a.c].x = a.c; board[a.r][a.c].y = a.r; }
    if (board[b.r][b.c]) { board[b.r][b.c].x = b.c; board[b.r][b.c].y = b.r; }
}

async function animateSwap(a, b, duration) {
    const gemA = board[a.r][a.c];
    const gemB = board[b.r][b.c];
    const start = performance.now();
    const dx = (b.c - a.c) * cellSize;
    const dy = (b.r - a.r) * cellSize;

    return new Promise(resolve => {
        function step(now) {
            const t = Math.min(1, (now - start) / duration);
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            if (gemA) { gemA.x = a.c + (b.c - a.c) * ease; gemA.y = a.r + (b.r - a.r) * ease; }
            if (gemB) { gemB.x = b.c + (a.c - b.c) * ease; gemB.y = b.r + (a.r - b.r) * ease; }

            draw();
            if (t < 1) requestAnimationFrame(step);
            else {
                if (gemA) { gemA.x = a.c; gemA.y = a.r; }
                if (gemB) { gemB.x = b.c; gemB.y = b.r; }
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

// ===== 匹配检测 =====
function findAllMatches() {
    const matched = new Set();

    // 横向
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 2; c++) {
            if (!board[r][c]) continue;
            const type = board[r][c].type;
            if (board[r][c+1] && board[r][c+1].type === type &&
                board[r][c+2] && board[r][c+2].type === type) {
                matched.add(`${r},${c}`);
                matched.add(`${r},${c+1}`);
                matched.add(`${r},${c+2}`);
                // 延伸
                let ext = c + 3;
                while (ext < COLS && board[r][ext] && board[r][ext].type === type) {
                    matched.add(`${r},${ext}`);
                    ext++;
                }
            }
        }
    }

    // 纵向
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 2; r++) {
            if (!board[r][c]) continue;
            const type = board[r][c].type;
            if (board[r+1] && board[r+1][c] && board[r+1][c].type === type &&
                board[r+2] && board[r+2][c] && board[r+2][c].type === type) {
                matched.add(`${r},${c}`);
                matched.add(`${r+1},${c}`);
                matched.add(`${r+2},${c}`);
                let ext = r + 3;
                while (ext < ROWS && board[ext] && board[ext][c] && board[ext][c].type === type) {
                    matched.add(`${ext},${c}`);
                    ext++;
                }
            }
        }
    }

    return [...matched].map(s => {
        const [r, c] = s.split(',').map(Number);
        return { r, c };
    });
}

// ===== 消除循环 =====
async function processMatches() {
    let matches = findAllMatches();
    while (matches.length > 0) {
        combo++;
        const pts = matches.length * 10 * combo;
        score += pts;
        updateHUD();

        // 显示连击文字
        if (combo > 1) showComboText(combo);

        // 消除动画
        await animateRemove(matches);

        // 下落
        await applyGravity();

        // 填充空位
        await fillEmpty();

        // 检查新的匹配
        matches = findAllMatches();
    }
}

async function animateRemove(matches) {
    const duration = 200;
    const start = performance.now();

    // 标记消除的宝石
    for (const m of matches) {
        if (board[m.r][m.c]) {
            board[m.r][m.c].removing = true;
        }
    }

    return new Promise(resolve => {
        function step(now) {
            const t = Math.min(1, (now - start) / duration);
            for (const m of matches) {
                const gem = board[m.r][m.c];
                if (gem && gem.removing) {
                    gem.scale = 1 - t;
                    gem.opacity = 1 - t;
                }
            }
            draw();
            if (t < 1) requestAnimationFrame(step);
            else {
                for (const m of matches) {
                    board[m.r][m.c] = null;
                }
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

async function applyGravity() {
    const falling = [];

    for (let c = 0; c < COLS; c++) {
        let emptySlots = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (!board[r][c]) {
                emptySlots++;
            } else if (emptySlots > 0) {
                const gem = board[r][c];
                board[r + emptySlots][c] = gem;
                board[r][c] = null;
                falling.push({ gem, fromR: r, toR: r + emptySlots, c });
            }
        }
    }

    if (falling.length === 0) return;

    // 动画
    const duration = 200;
    const start = performance.now();

    return new Promise(resolve => {
        function step(now) {
            const t = Math.min(1, (now - start) / duration);
            const ease = t * t * (3 - 2 * t); // smoothstep
            for (const f of falling) {
                f.gem.y = f.fromR + (f.toR - f.fromR) * ease;
            }
            draw();
            if (t < 1) requestAnimationFrame(step);
            else {
                for (const f of falling) f.gem.y = f.toR;
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

async function fillEmpty() {
    const newGems = [];

    for (let c = 0; c < COLS; c++) {
        let emptyCount = 0;
        for (let r = 0; r < ROWS; r++) {
            if (!board[r][c]) emptyCount++;
        }
        let spawnY = -emptyCount;
        for (let r = 0; r < ROWS; r++) {
            if (!board[r][c]) {
                const type = randInt(0, GEM_TYPES.length - 1);
                const gem = { type, x: c, y: spawnY, opacity: 1, scale: 1 };
                board[r][c] = gem;
                newGems.push({ gem, fromY: spawnY, toY: r });
                spawnY++;
            }
        }
    }

    if (newGems.length === 0) return;

    const duration = 250;
    const start = performance.now();

    return new Promise(resolve => {
        function step(now) {
            const t = Math.min(1, (now - start) / duration);
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            for (const g of newGems) {
                g.gem.y = g.fromY + (g.toY - g.fromY) * ease;
            }
            draw();
            if (t < 1) requestAnimationFrame(step);
            else {
                for (const g of newGems) g.gem.y = g.toY;
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

// ===== 连击文字 =====
let comboTexts = [];

function showComboText(combo) {
    comboTexts.push({
        text: combo >= 5 ? `🔥 ${combo}连击!` : combo >= 3 ? `⚡ ${combo}连击!` : `${combo}连击!`,
        x: canvas.width / 2,
        y: canvas.height / 2,
        alpha: 1,
        startTime: performance.now()
    });
    animateComboTexts();
}

function animateComboTexts() {
    if (comboTexts.length === 0) return;
    const now = performance.now();

    ctx.save();
    for (let i = comboTexts.length - 1; i >= 0; i--) {
        const ct = comboTexts[i];
        const elapsed = now - ct.startTime;
        const t = elapsed / 1000;
        if (t > 1.5) { comboTexts.splice(i, 1); continue; }

        ct.alpha = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 1.2;
        const yOff = -t * 60;
        const scale = t < 0.1 ? 0.5 + t * 5 : 1;

        ctx.globalAlpha = Math.max(0, ct.alpha);
        ctx.font = `bold ${24 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 15;
        ctx.fillText(ct.text, ct.x, ct.y + yOff);
    }
    ctx.restore();

    if (comboTexts.length > 0) {
        requestAnimationFrame(() => { draw(); animateComboTexts(); });
    }
}

// ===== 游戏状态 =====
function checkGameState() {
    if (score >= targetScore) {
        showOverlay(`🎉 第 ${level} 关通过!`, `得分: ${score}`, '下一关');
        document.getElementById('overlay-btn').onclick = () => {
            level++;
            targetScore = level * 1000 + (level - 1) * 500;
            moves = 30 + level * 2;
            score = 0;
            init();
        };
        return;
    }

    if (moves <= 0) {
        showOverlay('💀 游戏结束', `最终得分: ${score}`, '重新开始');
        document.getElementById('overlay-btn').onclick = init;
        return;
    }

    // 检查是否有可移动
    if (!hasValidMoves()) {
        // 洗牌
        shuffleBoard();
    }
}

function hasValidMoves() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            // 尝试右边交换
            if (c < COLS - 1) {
                swap({ r, c }, { r, c: c + 1 });
                if (findAllMatches().length > 0) {
                    swap({ r, c }, { r, c: c + 1 });
                    return true;
                }
                swap({ r, c }, { r, c: c + 1 });
            }
            // 尝试下面交换
            if (r < ROWS - 1) {
                swap({ r, c }, { r: r + 1, c });
                if (findAllMatches().length > 0) {
                    swap({ r, c }, { r: r + 1, c });
                    return true;
                }
                swap({ r, c }, { r: r + 1, c });
            }
        }
    }
    return false;
}

function shuffleBoard() {
    // 收集所有类型
    const types = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) types.push(board[r][c].type);
        }
    }
    // 洗牌
    for (let i = types.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [types[i], types[j]] = [types[j], types[i]];
    }
    // 重新分配
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                board[r][c].type = types[idx++];
            }
        }
    }
    // 如果洗牌后还有自动匹配，重新初始化
    if (findAllMatches().length > 0 || !hasValidMoves()) {
        initBoard();
    }
}

function initBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let type;
            do {
                type = randInt(0, GEM_TYPES.length - 1);
            } while (wouldMatch(r, c, type));
            board[r][c] = { type, x: c, y: r, opacity: 1, scale: 1 };
        }
    }
}

// ===== 弹窗 =====
function showOverlay(title, msg, btnText) {
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-msg').textContent = msg;
    document.getElementById('overlay-btn').textContent = btnText;
    document.getElementById('overlay').classList.remove('hidden');
}

function hideOverlay() {
    document.getElementById('overlay').classList.add('hidden');
}

// ===== 启动 =====
init();

// 窗口大小改变时重绘
window.addEventListener('resize', () => {
    const maxW = Math.min(window.innerWidth - 20, 480);
    cellSize = Math.floor(maxW / COLS);
    canvas.width = cellSize * COLS;
    canvas.height = cellSize * ROWS;
    // 重新计算宝石位置
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) { board[r][c].x = c; board[r][c].y = r; }
        }
    }
    draw();
});
