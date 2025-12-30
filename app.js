const STORAGE_PREFIX = "eatWhat.";
const KEY_SEED_FIRST = `${STORAGE_PREFIX}seedFirstChoice`;
const ANCHOR_YMD = { y: 2025, m: 12, d: 30 }; // 固定起点（本地日期）

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayNumberLocal(date) {
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  return Math.floor(noon.getTime() / 86400000);
}

function anchorDateLocalNoon() {
  return new Date(ANCHOR_YMD.y, ANCHOR_YMD.m - 1, ANCHOR_YMD.d, 12, 0, 0, 0);
}

function anchorLabel() {
  const mm = String(ANCHOR_YMD.m).padStart(2, "0");
  const dd = String(ANCHOR_YMD.d).padStart(2, "0");
  return `${ANCHOR_YMD.y}-${mm}-${dd}`;
}

function getSeed() {
  let seedFirst = window.localStorage.getItem(KEY_SEED_FIRST);

  if (seedFirst !== "AD" && seedFirst !== "D3") {
    seedFirst = "D3";
    window.localStorage.setItem(KEY_SEED_FIRST, seedFirst);
  }

  return { seedFirst };
}

function clearAllOverrides() {
  const prefix = `${STORAGE_PREFIX}override.`;
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      window.localStorage.removeItem(key);
    }
  }
}

function setSeedFromAnchor(firstChoice) {
  window.localStorage.setItem(KEY_SEED_FIRST, firstChoice);
  clearAllOverrides();
}

function rotatedChoiceFor(date) {
  const { seedFirst } = getSeed();
  const other = seedFirst === "AD" ? "D3" : "AD";
  const offset = dayNumberLocal(date) - dayNumberLocal(anchorDateLocalNoon());
  return offset % 2 === 0 ? seedFirst : other;
}

function overrideKey(dateKey) {
  return `${STORAGE_PREFIX}override.${dateKey}`;
}

function getChoiceForDate(date) {
  const dateKey = formatDateKey(date);
  const override = window.localStorage.getItem(overrideKey(dateKey));
  if (override === "AD" || override === "D3") {
    return { choice: override, source: "override" };
  }
  return { choice: rotatedChoiceFor(date), source: "rotation" };
}

function setOverrideForToday(dateKey, choice) {
  window.localStorage.setItem(overrideKey(dateKey), choice);
}

function clearOverrideForToday(dateKey) {
  window.localStorage.removeItem(overrideKey(dateKey));
}

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

let storagePersisted = null;

async function setupStoragePersistence() {
  const storage = navigator.storage;
  if (!storage?.persisted || !storage?.persist) return;
  try {
    const already = await storage.persisted();
    if (already) {
      storagePersisted = true;
      return;
    }
    const granted = await storage.persist();
    storagePersisted = granted;
  } catch {
    storagePersisted = null;
  }
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function weekdayIndexMondayFirst(date) {
  return (date.getDay() + 6) % 7; // Mon=0 ... Sun=6
}

function renderCalendar(today) {
  const monthText = document.getElementById("monthText");
  const calendarGrid = document.getElementById("calendarGrid");

  const monthLabel = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(today);
  monthText.textContent = monthLabel;

  const first = startOfMonth(today);
  const leadingBlanks = weekdayIndexMondayFirst(first);
  const count = daysInMonth(today);

  calendarGrid.innerHTML = "";

  const totalCells = leadingBlanks + count;
  const rows = Math.ceil(totalCells / 7);
  const cells = rows * 7;

  for (let i = 0; i < cells; i++) {
    const dayIndex = i - leadingBlanks + 1;
    const cell = document.createElement("div");
    cell.className = "dayCell";

    if (dayIndex < 1 || dayIndex > count) {
      cell.classList.add("dayCellEmpty");
      calendarGrid.appendChild(cell);
      continue;
    }

    const date = new Date(today.getFullYear(), today.getMonth(), dayIndex, 12, 0, 0, 0);
    const dateKey = formatDateKey(date);
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    const dayNum = document.createElement("div");
    dayNum.className = "dayNum";
    dayNum.textContent = String(dayIndex);
    cell.appendChild(dayNum);

    const { choice, source } = getChoiceForDate(date);
    const meta = document.createElement("div");
    meta.className = "dayMeta";
    meta.textContent = choice;
    if (source === "override") {
      meta.classList.add("dayMetaOverride");
    }
    cell.appendChild(meta);

    if (isToday) {
      cell.classList.add("isToday");
    } else {
      cell.setAttribute("data-date", dateKey);
    }

    calendarGrid.appendChild(cell);
  }
}

function render() {
  const today = new Date();
  const dateKey = formatDateKey(today);

  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(today);
  const dateText = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);

  const todayText = document.getElementById("todayText");
  const choiceValue = document.getElementById("choiceValue");
  const hintText = document.getElementById("hintText");
  const statusText = document.getElementById("statusText");
  const resetBtn = document.getElementById("resetBtn");
  const todayPill = document.getElementById("todayPill");
  const rulePill = document.getElementById("rulePill");

  todayText.textContent = `${dateText} · ${weekday}`;

  const { choice, source } = getChoiceForDate(today);
  choiceValue.textContent = choice;
  todayPill.textContent = `今天：${choice}`;
  rulePill.textContent = `规则：固定起点 ${anchorLabel()}=${getSeed().seedFirst}，按天轮换`;

  if (source === "override") {
    hintText.textContent = "已手动指定今日选项（仅影响今天）。";
    resetBtn.disabled = false;
  } else {
    hintText.textContent = "按天轮换：AD / D3（第一次使用默认从 AD 开始）。";
    resetBtn.disabled = true;
  }

  const net = navigator.onLine ? "在线" : "离线";
  const persistText =
    storagePersisted === true ? "存储已固定" : storagePersisted === false ? "存储可能被系统清理" : null;
  statusText.textContent = persistText ? `${net} · ${persistText}` : net;
  renderCalendar(today);

  document.getElementById("toggleBtn").onclick = () => {
    const current = getChoiceForDate(today).choice;
    const next = current === "AD" ? "D3" : "AD";
    setOverrideForToday(dateKey, next);
    render();
  };

  resetBtn.onclick = () => {
    clearOverrideForToday(dateKey);
    render();
  };
}

function setupSeedUI() {
  const seedAD = document.getElementById("seedAD");
  const seedD3 = document.getElementById("seedD3");

  function paint() {
    const { seedFirst } = getSeed();
    seedAD.setAttribute("aria-pressed", seedFirst === "AD" ? "true" : "false");
    seedD3.setAttribute("aria-pressed", seedFirst === "D3" ? "true" : "false");
    seedAD.classList.toggle("isActive", seedFirst === "AD");
    seedD3.classList.toggle("isActive", seedFirst === "D3");
  }

  seedAD.onclick = () => {
    setSeedFromAnchor("AD");
    paint();
    render();
  };

  seedD3.onclick = () => {
    setSeedFromAnchor("D3");
    paint();
    render();
  };

  paint();
}

function setupInstallUI() {
  const installBtn = document.getElementById("installBtn");
  const installHint = document.getElementById("installHint");
  let deferredPrompt = null;

  function androidInstallTip() {
    if (!window.isSecureContext) {
      return "Android：需要 https（或 localhost）才能安装；用 http 局域网地址通常不行。";
    }
    return "Android：请用 Chrome 打开（非微信/QQ内置浏览器），菜单 → 安装应用/添加到主屏幕。";
  }

  function updateHint() {
    if (isStandalone()) {
      installHint.textContent = "已安装（以应用方式运行）。";
      installBtn.hidden = true;
      return;
    }

    if (isIOS()) {
      installHint.textContent = "iPhone：Safari → 分享 → 添加到主屏幕。";
      installBtn.hidden = true;
      return;
    }

    installHint.textContent = androidInstallTip();
    installBtn.hidden = false;
    installBtn.disabled = false;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    updateHint();
  });

  installBtn.onclick = async () => {
    if (!deferredPrompt) {
      updateHint();
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
    updateHint();
  };

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    updateHint();
  });

  updateHint();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch {
    // ignore
  }
}

window.addEventListener("online", render);
window.addEventListener("offline", render);

setupInstallUI();
setupSeedUI();
render();
setupStoragePersistence().finally(render);
registerServiceWorker();
