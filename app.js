const STORAGE_PREFIX = "eatWhat.";
const KEY_SEED_FIRST = `${STORAGE_PREFIX}seedFirstChoice`;
const ANCHOR_YMD = { y: 2025, m: 12, d: 30 }; // 固定起点（本地日期）
let viewMonth = null; // 当前日历展示的月份（本地时间）

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

function addMonths(monthDate, delta) {
  return new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1, 12, 0, 0, 0);
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function weekdayIndexMondayFirst(date) {
  return (date.getDay() + 6) % 7; // Mon=0 ... Sun=6
}

function renderMonthGrid(targetEl, monthDate, today) {
  const first = startOfMonth(monthDate);
  const leadingBlanks = weekdayIndexMondayFirst(first);
  const count = daysInMonth(monthDate);

  targetEl.innerHTML = "";

  const totalCells = leadingBlanks + count;
  const rows = Math.ceil(totalCells / 7);
  const cells = rows * 7;

  for (let i = 0; i < cells; i++) {
    const dayIndex = i - leadingBlanks + 1;
    const cell = document.createElement("div");
    cell.className = "dayCell";

    if (dayIndex < 1 || dayIndex > count) {
      cell.classList.add("dayCellEmpty");
      targetEl.appendChild(cell);
      continue;
    }

    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayIndex, 12, 0, 0, 0);
    const dateKey = formatDateKey(date);
    const isToday =
      today &&
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

    targetEl.appendChild(cell);
  }
}

function renderCalendar(monthDate, today) {
  const monthText = document.getElementById("monthText");
  const prevGrid = document.getElementById("calendarGridPrev");
  const currentGrid = document.getElementById("calendarGrid");
  const nextGrid = document.getElementById("calendarGridNext");

  if (!monthText || !prevGrid || !currentGrid || !nextGrid) return;

  const monthLabel = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(monthDate);
  monthText.textContent = monthLabel;

  renderMonthGrid(prevGrid, addMonths(monthDate, -1), today);
  renderMonthGrid(currentGrid, monthDate, today);
  renderMonthGrid(nextGrid, addMonths(monthDate, 1), today);
}

function render() {
  const today = new Date();
  const dateKey = formatDateKey(today);
  if (!viewMonth) viewMonth = startOfMonth(today);

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
  const toggleBtn = document.getElementById("toggleBtn");

  todayText.textContent = `${dateText} · ${weekday}`;

  const { choice, source } = getChoiceForDate(today);
  choiceValue.textContent = choice;
  todayPill.textContent = `今天：${choice}`;
  rulePill.textContent = `规则：固定起点 ${anchorLabel()}=${getSeed().seedFirst}，按天轮换`;

  if (source === "override") {
    hintText.textContent = "已手动指定今日选项（仅影响今天）。";
  } else {
    hintText.textContent = "按天轮换：AD / D3（第一次使用默认从 AD 开始）。";
  }
  resetBtn.disabled = false;

  const net = navigator.onLine ? "在线" : "离线";
  const persistText =
    storagePersisted === true ? "存储已固定" : storagePersisted === false ? "存储可能被系统清理" : null;
  statusText.textContent = persistText ? `${net} · ${persistText}` : net;
  renderCalendar(viewMonth, today);

  toggleBtn.textContent = "回到今天";
  toggleBtn.onclick = () => {
    viewMonth = startOfMonth(today);
    render();
  };

  resetBtn.onclick = () => {
    window.location.reload();
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

function setupMonthSwipe() {
  const viewport = document.getElementById("calendarViewport");
  const track = document.getElementById("calendarTrack");
  if (!viewport || !track) return;

  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let isHorizontal = null;
  let animating = false;
  let cachedPaneGap = 0;

  const thresholdPx = 60;
  const slope = 1.2; // abs(dx) 需要明显大于 abs(dy)
  const settleMs = 240;

  function viewportWidth() {
    return viewport.getBoundingClientRect().width;
  }

  function refreshMetrics() {
    let measured = 0;
    const panes = track.querySelectorAll(".calDaysPane");
    if (panes.length >= 2) {
      const first = panes[0];
      const second = panes[1];
      measured = second.offsetLeft - first.offsetLeft - first.offsetWidth;
    }

    if (Number.isFinite(measured) && measured > 0) {
      cachedPaneGap = measured;
      return;
    }

    const cs = window.getComputedStyle(track);
    const raw = cs.columnGap || cs.gap || "0px";
    const parsed = Number.parseFloat(raw);
    cachedPaneGap = Number.isFinite(parsed) ? parsed : 0;
  }

  function stepWidth() {
    return viewportWidth() + cachedPaneGap;
  }

  function restOffset() {
    return -stepWidth();
  }

  function setTranslate(x, withTransition) {
    track.style.transition = withTransition ? `transform ${settleMs}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : "none";
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  function resetToCenter() {
    setTranslate(restOffset(), false);
  }

  function animateTo(x, onDone) {
    animating = true;
    setTranslate(x, true);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      track.removeEventListener("transitionend", handler);
      track.style.transition = "none";
      animating = false;
      onDone?.();
    };

    const handler = (ev) => {
      if (ev.propertyName !== "transform") return;
      finish();
    };

    track.addEventListener("transitionend", handler);
    window.setTimeout(finish, settleMs + 80);
  }

  function shiftMonth(delta) {
    if (!viewMonth) viewMonth = startOfMonth(new Date());
    viewMonth = addMonths(viewMonth, delta);
    render();
    requestAnimationFrame(resetToCenter);
  }

  refreshMetrics();
  resetToCenter();
  window.addEventListener("resize", () => {
    refreshMetrics();
    requestAnimationFrame(resetToCenter);
  });

  viewport.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    if (animating) return;
    refreshMetrics();
    activePointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    isHorizontal = null;
    viewport.setPointerCapture?.(e.pointerId);
    track.style.transition = "none";
  });

  viewport.addEventListener("pointermove", (e) => {
    if (activePointerId == null || e.pointerId !== activePointerId) return;
    if (animating) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (isHorizontal == null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      isHorizontal = Math.abs(dx) > Math.abs(dy) * slope;
    }

    if (!isHorizontal) return;
    setTranslate(restOffset() + dx, false);
  });

  viewport.addEventListener("pointerup", (e) => {
    if (activePointerId == null || e.pointerId !== activePointerId) return;
    activePointerId = null;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (isHorizontal !== true) {
      resetToCenter();
      return;
    }

    if (Math.abs(dx) < thresholdPx || Math.abs(dx) < Math.abs(dy) * slope) {
      animateTo(restOffset(), () => {});
      return;
    }

    // 日历常见手势：左滑 => 下一个月；右滑 => 上一个月
    if (dx < 0) {
      animateTo(restOffset() - stepWidth(), () => shiftMonth(1));
      return;
    }
    animateTo(restOffset() + stepWidth(), () => shiftMonth(-1));
  });

  viewport.addEventListener("pointercancel", (e) => {
    if (activePointerId == null || e.pointerId !== activePointerId) return;
    activePointerId = null;
    resetToCenter();
  });
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
setupMonthSwipe();
render();
setupStoragePersistence().finally(render);
registerServiceWorker();
