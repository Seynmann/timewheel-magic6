const STORE_KEY = "timewheel.state.v2";
const LEGACY_KEY = "timewheel.state.v1";

const app = document.querySelector("#app");
const toastNode = document.querySelector("#toast");
const todayLabel = document.querySelector("#todayLabel");
const scoreValue = document.querySelector("#scoreValue");
const rankName = document.querySelector("#rankName");

const taskColors = ["#325c7d", "#4f805f", "#b6782e", "#a65048", "#6b5c90"];
const habitColors = ["#325c7d", "#4f805f", "#b6782e", "#a65048", "#6b5c90", "#547b82"];
const dayNames = ["一", "二", "三", "四", "五", "六", "日"];

const ranks = [
  ["初醒者", 0],
  ["青铜筑基 V", 120],
  ["青铜筑基 IV", 260],
  ["青铜筑基 III", 420],
  ["青铜筑基 II", 600],
  ["青铜筑基 I", 800],
  ["白银行者 V", 1050],
  ["白银行者 IV", 1320],
  ["白银行者 III", 1620],
  ["白银行者 II", 1950],
  ["白银行者 I", 2310],
  ["黄金执灯 V", 2700],
  ["黄金执灯 IV", 3120],
  ["黄金执灯 III", 3570],
  ["黄金执灯 II", 4050],
  ["黄金执灯 I", 4560],
  ["铂金筑塔者 V", 5100],
  ["钻石破晓者 V", 6500],
  ["星耀守望者 V", 8300],
  ["最强王者", 10500],
  ["无双王者", 14000],
  ["非凡王者", 18000],
  ["绝世王者", 23000],
  ["荣耀王者", 30000],
  ["传奇王者", 42000]
];

const ui = {
  form: null
};

let state = loadState();
let timerHandle = null;
let toastHandle = null;

function loadState() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try {
      return migrate(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORE_KEY);
    }
  }

  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const migrated = migrate(JSON.parse(legacy));
      migrated.score = 0;
      migrated.rewardLog = [];
      saveState(migrated);
      return migrated;
    } catch {
      localStorage.removeItem(LEGACY_KEY);
    }
  }

  return seedState();
}

function migrate(data) {
  const fresh = seedState();
  const tasks = Array.isArray(data.tasks) ? data.tasks : fresh.tasks;
  const habits = Array.isArray(data.habits) ? data.habits : fresh.habits;
  return {
    ...fresh,
    ...data,
    schemaVersion: 2,
    score: Number.isFinite(data.score) ? data.score : 0,
    tasks: tasks.map(normalizeTask),
    habits: habits.map(normalizeHabit),
    countdowns: Array.isArray(data.countdowns) ? data.countdowns.map(normalizeCountdown) : fresh.countdowns,
    timer: {
      ...fresh.timer,
      ...(data.timer || {}),
      mode: data.timer?.mode || "down",
      elapsed: Number(data.timer?.elapsed || 0)
    }
  };
}

function saveState(nextState = state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(nextState));
}

function seedState() {
  const today = iso(new Date());
  const tomorrow = iso(addDays(new Date(), 1));
  return {
    schemaVersion: 2,
    view: "home",
    calendarMode: "week",
    heatMode: "month",
    activeTaskId: "focus",
    score: 0,
    lastMorningCheckin: "",
    lastSleepCheckin: "",
    timer: {
      taskId: "focus",
      remaining: 45 * 60,
      elapsed: 0,
      mode: "down",
      running: false
    },
    tasks: [
      {
        id: "focus",
        title: "深度学习：算法课",
        date: today,
        start: "08:30",
        duration: 45,
        deadline: `${today}T10:00`,
        priority: 4,
        points: 36,
        color: taskColors[0],
        status: "todo",
        completedAt: "",
        penaltyAppliedAt: ""
      },
      {
        id: "review",
        title: "复盘今天计划",
        date: today,
        start: "13:40",
        duration: 25,
        deadline: `${today}T22:00`,
        priority: 2,
        points: 22,
        color: taskColors[1],
        status: "todo",
        completedAt: "",
        penaltyAppliedAt: ""
      },
      {
        id: "plan",
        title: "周计划整理",
        date: tomorrow,
        start: "09:10",
        duration: 35,
        deadline: `${tomorrow}T12:00`,
        priority: 3,
        points: 28,
        color: taskColors[2],
        status: "todo",
        completedAt: "",
        penaltyAppliedAt: ""
      }
    ],
    habits: [
      {
        id: "water",
        title: "早起喝水",
        color: habitColors[0],
        target: 1,
        logs: sampleLogs(84, 0)
      },
      {
        id: "sport",
        title: "拉伸 12 分钟",
        color: habitColors[1],
        target: 1,
        logs: sampleLogs(84, 1)
      }
    ],
    countdowns: [
      {
        id: "exam",
        title: "期末考试",
        date: iso(addDays(new Date(), 5)),
        note: "提前三天进入冲刺节奏"
      }
    ],
    rewardLog: []
  };
}

function normalizeTask(task) {
  const date = task.date || iso(new Date());
  const start = task.start || "09:00";
  const duration = Number(task.duration || 25);
  const priority = clamp(Number(task.priority || 2), 1, 5);
  return {
    id: task.id || uid("task"),
    title: task.title || "未命名任务",
    date,
    start,
    duration,
    deadline: task.deadline || `${date}T${start}`,
    priority,
    points: Number(task.points || 10 + priority * 6),
    color: task.color || taskColors[(priority - 1) % taskColors.length],
    status: task.status || "todo",
    completedAt: task.completedAt || "",
    penaltyAppliedAt: task.penaltyAppliedAt || ""
  };
}

function normalizeHabit(habit) {
  return {
    id: habit.id || uid("habit"),
    title: habit.title || "新习惯",
    color: habit.color || habitColors[0],
    target: Number(habit.target || 1),
    logs: normalizeLogs(habit.logs)
  };
}

function normalizeCountdown(item) {
  return {
    id: item.id || uid("day"),
    title: item.title || "重要日子",
    date: item.date || iso(addDays(new Date(), 7)),
    note: item.note || ""
  };
}

function normalizeLogs(logs) {
  if (!logs) return {};
  if (!Array.isArray(logs)) return logs;
  return logs.reduce((map, date) => {
    map[date] = (map[date] || 0) + 1;
    return map;
  }, {});
}

function sampleLogs(days, offset) {
  const logs = {};
  for (let i = days; i >= 1; i -= 1) {
    const date = iso(addDays(new Date(), -i));
    if ((i + offset) % 3 !== 0 && (i + offset) % 11 !== 0) logs[date] = 1 + Number((i + offset) % 9 === 0);
  }
  return logs;
}

function iso(date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyOverduePenalties() {
  const now = new Date();
  let changed = false;
  state.tasks.forEach((task) => {
    if (task.status === "done" || task.penaltyAppliedAt || !task.deadline) return;
    if (new Date(task.deadline) < now) {
      const penalty = priorityPenalty(task.priority);
      task.penaltyAppliedAt = now.toISOString();
      state.score = Math.max(0, state.score - penalty);
      state.rewardLog.unshift({ points: -penalty, reason: `DDL 未完成：${task.title}`, at: now.toISOString() });
      changed = true;
    }
  });
  if (changed) {
    state.rewardLog = state.rewardLog.slice(0, 40);
    saveState();
    toast("有任务超过 DDL，已按优先级扣分。");
  }
}

function priorityPenalty(priority) {
  return [0, 12, 24, 42, 68, 100][clamp(Number(priority), 1, 5)];
}

function currentRank() {
  let current = ranks[0];
  let next = ranks[1];
  ranks.forEach((rank, index) => {
    if (state.score >= rank[1]) {
      current = rank;
      next = ranks[index + 1] || rank;
    }
  });
  const span = Math.max(1, next[1] - current[1]);
  const progress = next === current ? 100 : Math.round(((state.score - current[1]) / span) * 100);
  return { current, next, progress: Math.min(progress, 100) };
}

function toast(message) {
  clearTimeout(toastHandle);
  toastNode.textContent = message;
  toastNode.classList.add("show");
  toastHandle = setTimeout(() => toastNode.classList.remove("show"), 2600);
}

function render() {
  applyOverduePenalties();
  const now = new Date();
  todayLabel.textContent = `${formatDate(now)} 周${"日一二三四五六"[now.getDay()]}`;
  scoreValue.textContent = state.score;
  rankName.textContent = currentRank().current[0];
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === state.view);
  });

  if (state.view === "home") renderHome();
  if (state.view === "habits") renderHabits();
  if (state.view === "countdown") renderCountdown();
  if (state.view === "rewards") renderRewards();
}

function renderHome() {
  const active = activeTask();
  app.innerHTML = `
    <section class="panel section time-stage">
      <div class="gear-field" aria-label="24 小时时间齿轮">
        <div class="gear gear-hour"></div>
        <div class="gear gear-minute"></div>
        <div class="gear gear-second"></div>
        <div class="clock-core" id="clockCore">--:--</div>
      </div>
      <div class="now-card">
        <div>
          <p class="eyebrow">光阴推进</p>
          <strong id="liveClock">--:--:--</strong>
        </div>
        <div class="micro-stats">
          <div class="micro"><b>${tasksToday().length}</b><span>今日任务</span></div>
          <div class="micro"><b>${nextCountdownText()}</b><span>最近目标</span></div>
        </div>
      </div>
    </section>

    <section class="panel section">
      <div class="section-title">
        <h2>日程</h2>
        <div class="inline-actions">
          <div class="segmented" aria-label="切换日历视图">
            <button class="${state.calendarMode === "week" ? "active" : ""}" data-calendar="week" type="button">周</button>
            <button class="${state.calendarMode === "month" ? "active" : ""}" data-calendar="month" type="button">月</button>
          </div>
          <button class="icon-chip" data-open-form="task" type="button">＋</button>
        </div>
      </div>
      ${state.calendarMode === "week" ? renderWeek() : renderMonth()}
      ${ui.form?.type === "task" ? renderTaskForm(ui.form.id) : ""}
    </section>

    <section class="panel section">
      <div class="section-title">
        <h2>任务与计时</h2>
        <button class="secondary" id="requestNotify" type="button">提醒</button>
      </div>
      <div class="split-board">
        <div class="task-list">${renderTasks()}</div>
        <aside class="timer-panel">
          <div>
            <small>已关联</small>
            <h3>${active ? escapeHtml(active.title) : "选择一个任务"}</h3>
          </div>
          <div class="timer-mode" aria-label="计时模式">
            <button class="${state.timer.mode !== "up" ? "active" : ""}" data-timer-mode="down" type="button">倒计时</button>
            <button class="${state.timer.mode === "up" ? "active" : ""}" data-timer-mode="up" type="button">正计时</button>
          </div>
          <div class="timer-time" id="timerTime">${timerDisplay()}</div>
          <div class="timer-actions">
            <button class="primary" id="startTimer" type="button">${state.timer.running ? "暂停" : "启动"}</button>
            <button class="quiet" id="completeTask" type="button">完成</button>
          </div>
        </aside>
      </div>
    </section>

    <section class="panel section">
      <div class="section-title"><h2>任务热力</h2><span class="eyebrow">完成时间</span></div>
      ${renderHeatMonths(state.heatMode === "year" ? 182 : 52)}
      <div class="heatmap ${state.heatMode === "year" ? "year" : ""}">
        ${renderTaskHeatmap()}
      </div>
    </section>
  `;
  tickClock();
}

function renderWeek() {
  const start = startOfWeek(new Date());
  return `
    <div class="week-grid">
      ${Array.from({ length: 7 }, (_, index) => {
        const day = addDays(start, index);
        const dayIso = iso(day);
        const count = state.tasks.filter((task) => task.date === dayIso).length;
        return `
          <div class="day-cell ${dayIso === iso(new Date()) ? "today" : ""}">
            <small>周${dayNames[index]}</small>
            <b>${day.getDate()}</b>
            <span class="dots">${Array.from({ length: Math.min(count, 3) }, () => "<i></i>").join("")}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderMonth() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return `
    <div class="month-grid">
      ${Array.from({ length: 35 }, (_, index) => {
        const day = addDays(gridStart, index);
        const dayIso = iso(day);
        const hasTask = state.tasks.some((task) => task.date === dayIso);
        return `<div class="month-day ${day.getMonth() !== now.getMonth() ? "dim" : ""} ${hasTask ? "has-task" : ""}">${day.getDate()}</div>`;
      }).join("")}
    </div>
  `;
}

function renderTasks() {
  const tasks = [...tasksToday()].sort((a, b) => a.start.localeCompare(b.start));
  if (!tasks.length) return `<p class="empty-note">今天没有日程。点上方＋添加。</p>`;
  return tasks.map((task) => {
    const late = task.penaltyAppliedAt && task.status !== "done";
    return `
      <article class="task-card ${task.id === state.activeTaskId ? "active" : ""}" style="--task-color:${task.color}">
        <button class="task-main" data-task="${task.id}" type="button">
          <span class="task-color"></span>
          <span>
            <h3>${escapeHtml(task.title)}</h3>
            <p>${task.start} · ${task.duration} 分钟 · P${task.priority} · ${task.status === "done" ? "已完成" : late ? `已扣 ${priorityPenalty(task.priority)} 分` : `+${task.points} 分`}</p>
            <p>DDL ${task.deadline.replace("T", " ")}</p>
          </span>
        </button>
        <div class="card-actions">
          <button data-edit-task="${task.id}" type="button">编辑</button>
          <button data-delete-task="${task.id}" type="button">删除</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderTaskForm(id) {
  const task = id ? state.tasks.find((item) => item.id === id) : null;
  const today = iso(new Date());
  const draft = task || {
    title: "",
    date: today,
    start: "09:00",
    duration: 25,
    deadline: `${today}T18:00`,
    priority: 3,
    points: 28,
    color: taskColors[0]
  };
  return `
    <form class="edit-form" data-form="task">
      <input type="hidden" name="id" value="${escapeHtml(task?.id || "")}" />
      <label>任务名<input name="title" required value="${escapeHtml(draft.title)}" placeholder="比如：写完数学卷子" /></label>
      <div class="form-grid">
        <label>日期<input name="date" type="date" required value="${draft.date}" /></label>
        <label>开始<input name="start" type="time" required value="${draft.start}" /></label>
      </div>
      <div class="form-grid">
        <label>分钟<input name="duration" type="number" min="5" step="5" value="${draft.duration}" /></label>
        <label>奖励<input name="points" type="number" min="0" value="${draft.points}" /></label>
      </div>
      <label>截止时间<input name="deadline" type="datetime-local" required value="${draft.deadline}" /></label>
      <div class="form-grid">
        <label>优先级
          <select name="priority">
            ${[1, 2, 3, 4, 5].map((level) => `<option value="${level}" ${Number(draft.priority) === level ? "selected" : ""}>P${level}${level === 5 ? " BOSS" : ""}</option>`).join("")}
          </select>
        </label>
        <label>颜色
          <select name="color">
            ${taskColors.map((color) => `<option value="${color}" ${draft.color === color ? "selected" : ""}>${color}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="form-actions">
        <button class="primary" type="submit">${task ? "保存任务" : "添加任务"}</button>
        <button class="secondary" data-cancel-form type="button">取消</button>
      </div>
    </form>
  `;
}

function renderTaskHeatmap() {
  const days = state.heatMode === "year" ? 182 : 52;
  const counts = completedTaskCounts();
  return Array.from({ length: days }, (_, reverseIndex) => {
    const date = iso(addDays(new Date(), reverseIndex - days + 1));
    const count = counts[date] || 0;
    const alpha = count ? Math.min(0.95, 0.26 + count * 0.18) : 0.08;
    return `<span class="heat-cell" title="${date} 完成 ${count} 个" style="background:rgba(50,92,125,${alpha})"></span>`;
  }).join("");
}

function completedTaskCounts() {
  return state.tasks.reduce((map, task) => {
    if (task.completedAt) {
      const date = iso(new Date(task.completedAt));
      map[date] = (map[date] || 0) + 1;
    }
    return map;
  }, {});
}

function tasksToday() {
  const today = iso(new Date());
  return state.tasks.filter((task) => task.date === today);
}

function activeTask() {
  return state.tasks.find((task) => task.id === state.activeTaskId) || state.tasks[0];
}

function formatTimer(seconds) {
  const safe = Math.max(0, seconds);
  const min = String(Math.floor(safe / 60)).padStart(2, "0");
  const sec = String(safe % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function timerDisplay() {
  return formatTimer(state.timer.mode === "up" ? state.timer.elapsed : state.timer.remaining);
}

function tickClock() {
  const live = document.querySelector("#liveClock");
  const core = document.querySelector("#clockCore");
  if (!live || !core) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  live.textContent = `${h}:${m}:${s}`;
  core.textContent = `${h}:${m}`;
}

function nextCountdownText() {
  const today = new Date(iso(new Date()));
  const target = [...state.countdowns]
    .map((item) => ({ ...item, days: Math.ceil((new Date(item.date) - today) / 86400000) }))
    .sort((a, b) => a.days - b.days)[0];
  return target ? `${target.days}天` : "无";
}

function renderHabits() {
  const firstHabit = state.habits[0];
  const streak = firstHabit ? habitStreak(firstHabit) : 0;
  const scar = Math.min(0.64, 0.1 + Math.floor(streak / 21) * 0.12);
  app.innerHTML = `
    <section class="panel section habit-hero">
      <div class="stone-scene" id="stoneScene" style="--scar-alpha:${scar};--scar-x:${48 + Math.min(18, Math.floor(streak / 7))}%">
        <svg class="drop" viewBox="0 0 48 64" aria-hidden="true">
          <defs>
            <linearGradient id="dropGradient" x1="10" y1="8" x2="40" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#a8ddff"></stop>
              <stop offset="0.52" stop-color="#4f9fca"></stop>
              <stop offset="1" stop-color="#236b91"></stop>
            </linearGradient>
          </defs>
          <path d="M24 3 C35 18 44 30 44 42 C44 55 35 62 24 62 C13 62 4 55 4 42 C4 30 13 18 24 3 Z"></path>
          <path class="drop-shine" d="M17 24 C13 30 12 37 15 43"></path>
        </svg>
        <div class="ripple"></div>
        <div class="stone"></div>
      </div>
      <div class="habit-copy">
        <div>
          <p class="eyebrow">滴水穿石</p>
          <h2>${streak} 天连续痕迹</h2>
          <p>打卡一次，水滴落下一次；每 21 天，石头上的痕迹更清楚。</p>
        </div>
        <button class="primary" ${firstHabit ? `data-check="${firstHabit.id}"` : ""} type="button">今日落下一滴</button>
      </div>
    </section>

    <section class="panel section">
      <div class="section-title">
        <h2>习惯</h2>
        <div class="inline-actions">
          <div class="segmented">
            <button class="${state.heatMode === "month" ? "active" : ""}" data-heat="month" type="button">月</button>
            <button class="${state.heatMode === "year" ? "active" : ""}" data-heat="year" type="button">年</button>
          </div>
          <button class="icon-chip" data-open-form="habit" type="button">＋</button>
        </div>
      </div>
      ${ui.form?.type === "habit" ? renderHabitForm(ui.form.id) : ""}
      <div class="habit-list">${state.habits.map(renderHabitCard).join("")}</div>
    </section>

    <section class="panel section">
      <div class="section-title">
        <h2>总览热力</h2>
        <button class="secondary" id="exportHeatmap" type="button">导出</button>
      </div>
      ${renderHeatMonths(state.heatMode === "year" ? 182 : 52)}
      <div class="habit-heat-rows" id="combinedHeatmap">
        ${state.habits.map((habit) => `
          <div class="habit-row">
            <span>${escapeHtml(habit.title)}</span>
            <div class="heatmap ${state.heatMode === "year" ? "year" : ""}">${renderHabitHeatmap(habit)}</div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderHabitCard(habit) {
  const done = habit.logs[iso(new Date())] >= habit.target;
  return `
    <article class="habit-card" style="--habit-color:${habit.color}">
      <span class="swatch"></span>
      <div>
        <h3>${escapeHtml(habit.title)}</h3>
        <p>连续 ${habitStreak(habit)} 天 · 今日 ${habit.logs[iso(new Date())] || 0}/${habit.target}</p>
        <div class="mini-heatmap">${renderHabitHeatmap(habit, 21)}</div>
      </div>
      <div class="card-actions compact">
        <button class="check-button ${done ? "done" : ""}" data-check="${habit.id}" type="button">${done ? "已达标" : "打卡"}</button>
        <button data-edit-habit="${habit.id}" type="button">编辑</button>
      </div>
    </article>
  `;
}

function renderHabitForm(id) {
  const habit = id ? state.habits.find((item) => item.id === id) : null;
  const draft = habit || { title: "", target: 1, color: habitColors[state.habits.length % habitColors.length] };
  return `
    <form class="edit-form" data-form="habit">
      <input type="hidden" name="id" value="${escapeHtml(habit?.id || "")}" />
      <label>习惯名<input name="title" required value="${escapeHtml(draft.title)}" placeholder="比如：英语听力" /></label>
      <div class="form-grid">
        <label>每日次数<input name="target" type="number" min="1" max="12" value="${draft.target}" /></label>
        <label>颜色
          <select name="color">
            ${habitColors.map((color) => `<option value="${color}" ${draft.color === color ? "selected" : ""}>${color}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="form-actions">
        <button class="primary" type="submit">${habit ? "保存习惯" : "添加习惯"}</button>
        <button class="secondary" data-cancel-form type="button">取消</button>
      </div>
    </form>
  `;
}

function renderHabitHeatmap(habit, fixedDays) {
  const days = fixedDays || (state.heatMode === "year" ? 182 : 52);
  return Array.from({ length: days }, (_, reverseIndex) => {
    const date = iso(addDays(new Date(), reverseIndex - days + 1));
    const count = habit.logs[date] || 0;
    const ratio = habit.target ? count / habit.target : count;
    const alpha = count ? Math.min(0.95, 0.18 + ratio * 0.45 + count * 0.08) : 0.08;
    return `<span class="heat-cell" title="${date} ${count}/${habit.target}" style="background:${hexToRgba(habit.color, alpha)}"></span>`;
  }).join("");
}

function renderHeatMonths(days) {
  const markers = [];
  let lastMonth = "";
  for (let i = 0; i < days; i += 1) {
    const date = addDays(new Date(), i - days + 1);
    const month = `${date.getMonth() + 1}月`;
    if (month !== lastMonth || i === 0) {
      markers.push({ label: month, left: Math.round((i / Math.max(1, days - 1)) * 100) });
      lastMonth = month;
    }
  }
  return `<div class="heat-months">${markers.map((item) => `<span style="left:${item.left}%">${item.label}</span>`).join("")}</div>`;
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function habitStreak(habit) {
  let streak = 0;
  let cursor = new Date();
  while ((habit.logs[iso(cursor)] || 0) >= habit.target) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function recentCount(habit, days) {
  return Array.from({ length: days }, (_, index) => iso(addDays(new Date(), -index)))
    .filter((date) => (habit.logs[date] || 0) >= habit.target).length;
}

function renderCountdown() {
  const today = new Date(iso(new Date()));
  const items = [...state.countdowns]
    .map((item) => ({ ...item, days: Math.ceil((new Date(item.date) - today) / 86400000) }))
    .sort((a, b) => a.days - b.days);
  app.innerHTML = `
    <section class="panel section">
      <div class="section-title">
        <h2>重要日</h2>
        <div class="inline-actions">
          <button class="secondary" id="requestNotify" type="button">提醒</button>
          <button class="icon-chip" data-open-form="countdown" type="button">＋</button>
        </div>
      </div>
      ${ui.form?.type === "countdown" ? renderCountdownForm(ui.form.id) : ""}
      <div class="countdown-list">
        ${items.map((item) => `
          <article class="countdown-card">
            <div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${item.date} · ${escapeHtml(item.note)}</p>
              <div class="card-actions">
                <button data-edit-countdown="${item.id}" type="button">编辑</button>
                <button data-delete-countdown="${item.id}" type="button">删除</button>
              </div>
            </div>
            <div class="day-count">${item.days}<small>天</small></div>
          </article>
        `).join("")}
      </div>
    </section>
    <section class="panel section">
      <p class="eyebrow">提醒策略</p>
      <h2>提前 7 天轻提醒，提前 3 天进入冲刺，当天弹窗确认。</h2>
    </section>
  `;
}

function renderCountdownForm(id) {
  const item = id ? state.countdowns.find((entry) => entry.id === id) : null;
  const draft = item || { title: "", date: iso(addDays(new Date(), 7)), note: "" };
  return `
    <form class="edit-form" data-form="countdown">
      <input type="hidden" name="id" value="${escapeHtml(item?.id || "")}" />
      <label>名称<input name="title" required value="${escapeHtml(draft.title)}" placeholder="比如：考试、生日、旅行" /></label>
      <label>日期<input name="date" type="date" required value="${draft.date}" /></label>
      <label>备注<input name="note" value="${escapeHtml(draft.note)}" placeholder="提醒自己做什么" /></label>
      <div class="form-actions">
        <button class="primary" type="submit">${item ? "保存倒数日" : "添加倒数日"}</button>
        <button class="secondary" data-cancel-form type="button">取消</button>
      </div>
    </form>
  `;
}

function renderRewards() {
  const rank = currentRank();
  app.innerHTML = `
    <section class="panel section">
      <div class="section-title">
        <h2>成长</h2>
        <span class="eyebrow">${rank.current[0]}</span>
      </div>
      <div class="progress-track" style="--progress:${rank.progress}%"><span></span></div>
      <p>当前 ${state.score} 分。下一阶：${rank.next[0]}。</p>
      <p class="empty-note">任务完成加分；DDL 前未完成会按 P1-P5 扣分，P5 视作 BOSS。</p>
    </section>

    <section class="reward-grid">
      <article class="reward-card">
        <strong>早晨签到</strong>
        <p>越早越多，9:00 后只记录。</p>
        <button class="primary full" id="morningCheckin" type="button">领取</button>
      </article>
      <article class="reward-card">
        <strong>睡前归巢</strong>
        <p>越早越多，23:40 后只记录。</p>
        <button class="primary full" id="sleepCheckin" type="button">领取</button>
      </article>
    </section>

    <section class="panel section">
      <div class="section-title"><h2>段位</h2></div>
      <div class="rank-list">
        ${ranks.map((item) => `
          <article class="rank-item ${item[0] === rank.current[0] ? "active" : ""}">
            <h3>${item[0]}</h3>
            <p>${item[1]} 分解锁</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function switchView(view) {
  ui.form = null;
  state.view = view;
  saveState();
  render();
}

function selectTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  state.activeTaskId = id;
  state.timer = {
    taskId: id,
    remaining: task.duration * 60,
    elapsed: 0,
    mode: state.timer.mode || "down",
    running: false
  };
  saveState();
  render();
}

function toggleTimer() {
  const task = activeTask();
  if (!task) {
    toast("先选择一个任务。");
    return;
  }
  state.timer.taskId = task.id;
  state.timer.running = !state.timer.running;
  saveState();
  render();
}

function completeActiveTask() {
  const task = activeTask();
  if (!task) return;
  if (task.status !== "done") {
    task.status = "done";
    task.completedAt = new Date().toISOString();
    addReward(task.points, `完成「${task.title}」`);
    randomReward();
  } else {
    toast("这个任务已经完成。");
  }
  state.timer.running = false;
  saveState();
  render();
}

function addReward(points, reason) {
  state.score = Math.max(0, state.score + points);
  state.rewardLog.unshift({ points, reason, at: new Date().toISOString() });
  state.rewardLog = state.rewardLog.slice(0, 40);
  toast(`${reason}，${points >= 0 ? "+" : ""}${points} 分。`);
}

function randomReward() {
  const roll = Math.random();
  if (roll > 0.94) addReward(88, "超稀有灵感暴击");
  else if (roll > 0.78) addReward(36, "额外连击");
  else if (roll > 0.52) addReward(12, "小幸运");
}

function checkHabit(id) {
  const habit = state.habits.find((item) => item.id === id);
  const today = iso(new Date());
  if (!habit) return;
  habit.logs[today] = (habit.logs[today] || 0) + 1;
  const reached = habit.logs[today] === habit.target;
  addReward(reached ? 18 : 6, reached ? `达成「${habit.title}」` : `记录「${habit.title}」`);
  const streak = habitStreak(habit);
  saveState();
  render();
  const scene = document.querySelector("#stoneScene");
  if (scene) {
    scene.classList.add("drop-on");
    setTimeout(() => scene.classList.remove("drop-on"), 950);
  }
  if (reached && streak > 0 && streak % 21 === 0) openShare(habit, streak);
}

function openShare(habit, streak) {
  const modal = document.querySelector("#shareModal");
  document.querySelector("#shareTitle").textContent = `第 ${streak} 天，石上有痕`;
  document.querySelector("#shareCopy").textContent = `我在「${habit.title}」上坚持了 ${streak} 天。时间很慢，但痕迹很诚实。`;
  drawShareCanvas(habit, streak);
  modal.classList.remove("hidden");
}

function drawShareCanvas(habit, streak) {
  const canvas = document.querySelector("#shareCanvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f7f4ef";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#151515";
  ctx.font = "700 34px FangSong, serif";
  ctx.fillText("滴水穿石", 72, 110);
  ctx.font = "800 72px 'Times New Roman', FangSong, serif";
  ctx.fillText(`${streak} 天`, 72, 205);
  ctx.font = "400 28px FangSong, serif";
  ctx.fillStyle = "#74706a";
  wrapText(ctx, `我在「${habit.title}」上坚持前进。微小动作持续发生，时间开始把它刻进石头。`, 72, 268, 580, 42);
  ctx.fillStyle = "#bdb1a5";
  ctx.beginPath();
  ctx.ellipse(360, 690, 210, 70, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = habit.color;
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.ellipse(360, 672, Math.min(150, 24 + streak * 1.8), 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#3c83ad";
  ctx.beginPath();
  ctx.moveTo(360, 410);
  ctx.bezierCurveTo(420, 486, 408, 552, 360, 552);
  ctx.bezierCurveTo(312, 552, 300, 486, 360, 410);
  ctx.fill();
  ctx.fillStyle = "#151515";
  ctx.font = "700 26px 'Times New Roman', FangSong, serif";
  ctx.fillText("TimeWheel", 72, 880);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = [...text];
  let line = "";
  chars.forEach((char) => {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, y);
      line = char;
      y += lineHeight;
    } else {
      line = test;
    }
  });
  ctx.fillText(line, x, y);
}

function exportHeatmap() {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f7f4ef";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#151515";
  ctx.font = "800 48px FangSong, serif";
  ctx.fillText("习惯热力图", 80, 100);
  ctx.font = "400 24px FangSong, serif";
  ctx.fillStyle = "#74706a";
  ctx.fillText(`${formatDate(new Date())} · ${state.habits.length} 个习惯`, 80, 142);
  const days = state.heatMode === "year" ? 120 : 42;
  const cell = state.heatMode === "year" ? 16 : 24;
  const gap = 6;
  state.habits.forEach((habit, row) => {
    const y = 220 + row * (cell + 46);
    ctx.fillStyle = habit.color;
    roundRect(ctx, 80, y - 26, 18, 18, 5);
    ctx.fillStyle = "#151515";
    ctx.font = "600 22px FangSong, serif";
    ctx.fillText(habit.title, 110, y - 10);
    for (let i = 0; i < days; i += 1) {
      const date = iso(addDays(new Date(), i - days + 1));
      const count = habit.logs[date] || 0;
      const alpha = count ? Math.min(0.95, 0.18 + (count / habit.target) * 0.45 + count * 0.08) : 0.08;
      ctx.fillStyle = hexToRgba(habit.color, alpha);
      roundRect(ctx, 80 + i * (cell + gap), y, cell, cell, 5);
    }
  });
  downloadCanvas(canvas, "timewheel-heatmap.png");
}

function exportHeatmapV2() {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f7f4ef";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#151515";
  ctx.font = "800 48px FangSong, serif";
  ctx.fillText("习惯热力图", 80, 100);
  ctx.font = "400 24px FangSong, serif";
  ctx.fillStyle = "#74706a";
  ctx.fillText(`${formatDate(new Date())} · ${state.habits.length} 个习惯 · 颜色越深代表完成越多`, 80, 142);
  const days = state.heatMode === "year" ? 182 : 60;
  const cell = state.heatMode === "year" ? 16 : 24;
  const gap = 6;
  drawCanvasMonthLabels(ctx, days, 80, 190, cell + gap);
  state.habits.forEach((habit, row) => {
    const y = 235 + row * (cell + 58);
    ctx.fillStyle = habit.color;
    roundRect(ctx, 80, y - 26, 18, 18, 5);
    ctx.fillStyle = "#151515";
    ctx.font = "600 22px FangSong, serif";
    ctx.fillText(habit.title, 110, y - 10);
    for (let i = 0; i < days; i += 1) {
      const date = iso(addDays(new Date(), i - days + 1));
      const count = habit.logs[date] || 0;
      const alpha = count ? Math.min(0.95, 0.18 + (count / habit.target) * 0.45 + count * 0.08) : 0.08;
      ctx.fillStyle = hexToRgba(habit.color, alpha);
      roundRect(ctx, 80 + i * (cell + gap), y, cell, cell, 5);
    }
  });
  ctx.fillStyle = "#74706a";
  ctx.font = "400 20px FangSong, serif";
  ctx.fillText("浅色：少量完成；深色：达成或超过目标。", 80, 850);
  downloadCanvas(canvas, "timewheel-heatmap.png");
}

function drawCanvasMonthLabels(ctx, days, x, y, step) {
  let lastMonth = "";
  ctx.fillStyle = "#74706a";
  ctx.font = "500 18px FangSong, serif";
  for (let i = 0; i < days; i += 1) {
    const date = addDays(new Date(), i - days + 1);
    const month = `${date.getMonth() + 1}月`;
    if (month !== lastMonth || i === 0) {
      ctx.fillText(month, x + i * step, y);
      lastMonth = month;
    }
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function requestNotifications() {
  if (!("Notification" in window)) {
    toast("当前环境不支持系统通知，原生版会使用安卓闹钟提醒。");
    return;
  }
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      toast("提醒已开启。前台运行时会弹出任务通知。");
      scheduleTaskNotifications();
    } else {
      toast("可以稍后在浏览器权限中开启通知。");
    }
  });
}

function scheduleTaskNotifications() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const now = new Date();
  tasksToday().forEach((task) => {
    const [hour, minute] = task.start.split(":").map(Number);
    const target = new Date();
    target.setHours(hour, minute - 5, 0, 0);
    const delay = target - now;
    if (delay > 0 && delay < 6 * 60 * 60 * 1000) {
      setTimeout(() => {
        new Notification("TimeWheel", {
          body: `你的「${task.title}」马上开始。`,
          icon: "icon.svg"
        });
      }, delay);
    }
  });
}

function morningCheckin() {
  const today = iso(new Date());
  if (state.lastMorningCheckin === today) {
    toast("今天早晨奖励已经领取。");
    return;
  }
  const hour = new Date().getHours();
  const points = hour < 6 ? 42 : hour < 7 ? 34 : hour < 8 ? 24 : hour < 9 ? 12 : 0;
  state.lastMorningCheckin = today;
  addReward(points, points ? "早晨签到" : "9 点后签到记录");
  saveState();
  render();
}

function sleepCheckin() {
  const today = iso(new Date());
  if (state.lastSleepCheckin === today) {
    toast("今天睡前奖励已经领取。");
    return;
  }
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const points = minutes < 21 * 60 + 40 ? 42 : minutes < 22 * 60 + 30 ? 30 : minutes < 23 * 60 + 20 ? 16 : minutes < 23 * 60 + 40 ? 6 : 0;
  state.lastSleepCheckin = today;
  addReward(points, points ? "睡前归巢" : "23:40 后只记录");
  saveState();
  render();
}

function submitTask(form) {
  const data = Object.fromEntries(new FormData(form));
  const id = data.id || uid("task");
  const task = normalizeTask({
    id,
    title: data.title,
    date: data.date,
    start: data.start,
    duration: Number(data.duration),
    deadline: data.deadline,
    priority: Number(data.priority),
    points: Number(data.points),
    color: data.color,
    status: state.tasks.find((item) => item.id === id)?.status || "todo",
    completedAt: state.tasks.find((item) => item.id === id)?.completedAt || "",
    penaltyAppliedAt: state.tasks.find((item) => item.id === id)?.penaltyAppliedAt || ""
  });
  const index = state.tasks.findIndex((item) => item.id === id);
  if (index >= 0) state.tasks[index] = task;
  else state.tasks.push(task);
  state.activeTaskId = id;
  state.timer = { taskId: id, remaining: task.duration * 60, elapsed: 0, mode: state.timer.mode || "down", running: false };
  ui.form = null;
  saveState();
  render();
  toast(index >= 0 ? "任务已保存。" : "任务已添加。");
}

function submitHabit(form) {
  const data = Object.fromEntries(new FormData(form));
  const id = data.id || uid("habit");
  const existing = state.habits.find((item) => item.id === id);
  const habit = normalizeHabit({
    id,
    title: data.title,
    target: Number(data.target),
    color: data.color,
    logs: existing?.logs || {}
  });
  const index = state.habits.findIndex((item) => item.id === id);
  if (index >= 0) state.habits[index] = habit;
  else state.habits.push(habit);
  ui.form = null;
  saveState();
  render();
  toast(index >= 0 ? "习惯已保存。" : "习惯已添加。");
}

function submitCountdown(form) {
  const data = Object.fromEntries(new FormData(form));
  const id = data.id || uid("day");
  const item = normalizeCountdown({
    id,
    title: data.title,
    date: data.date,
    note: data.note
  });
  const index = state.countdowns.findIndex((entry) => entry.id === id);
  if (index >= 0) state.countdowns[index] = item;
  else state.countdowns.push(item);
  ui.form = null;
  saveState();
  render();
  toast(index >= 0 ? "倒数日已保存。" : "倒数日已添加。");
}

function deleteById(collection, id) {
  state[collection] = state[collection].filter((item) => item.id !== id);
  if (collection === "tasks" && state.activeTaskId === id) state.activeTaskId = state.tasks[0]?.id || "";
  saveState();
  render();
}

function startTimerLoop() {
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    tickClock();
    applyOverduePenalties();
    if (!state.timer.running) return;
    if (state.timer.mode === "up") state.timer.elapsed += 1;
    else state.timer.remaining -= 1;
    const timerNode = document.querySelector("#timerTime");
    if (timerNode) timerNode.textContent = timerDisplay();
    if (state.timer.mode !== "up" && state.timer.remaining <= 0) {
      state.timer.running = false;
      completeActiveTask();
    }
    if (state.timer.remaining % 10 === 0) saveState();
  }, 1000);
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  const calendar = event.target.closest("[data-calendar]");
  const task = event.target.closest("[data-task]");
  const check = event.target.closest("[data-check]");
  const heat = event.target.closest("[data-heat]");
  const openForm = event.target.closest("[data-open-form]");
  const editTask = event.target.closest("[data-edit-task]");
  const editHabit = event.target.closest("[data-edit-habit]");
  const editCountdown = event.target.closest("[data-edit-countdown]");

  if (tab) switchView(tab.dataset.view);
  if (calendar) {
    state.calendarMode = calendar.dataset.calendar;
    saveState();
    render();
  }
  if (task) selectTask(task.dataset.task);
  if (check) checkHabit(check.dataset.check);
  if (heat) {
    state.heatMode = heat.dataset.heat;
    saveState();
    render();
  }
  if (event.target.closest("[data-timer-mode]")) {
    state.timer.mode = event.target.closest("[data-timer-mode]").dataset.timerMode;
    saveState();
    render();
  }
  if (openForm) {
    ui.form = { type: openForm.dataset.openForm, id: "" };
    render();
  }
  if (editTask) {
    ui.form = { type: "task", id: editTask.dataset.editTask };
    render();
  }
  if (editHabit) {
    ui.form = { type: "habit", id: editHabit.dataset.editHabit };
    render();
  }
  if (editCountdown) {
    ui.form = { type: "countdown", id: editCountdown.dataset.editCountdown };
    render();
  }
  if (event.target.closest("[data-delete-task]")) deleteById("tasks", event.target.closest("[data-delete-task]").dataset.deleteTask);
  if (event.target.closest("[data-delete-countdown]")) deleteById("countdowns", event.target.closest("[data-delete-countdown]").dataset.deleteCountdown);
  if (event.target.closest("[data-cancel-form]")) {
    ui.form = null;
    render();
  }
  if (event.target.closest("#startTimer")) toggleTimer();
  if (event.target.closest("#completeTask")) completeActiveTask();
  if (event.target.closest("#requestNotify")) requestNotifications();
  if (event.target.closest("#openRewards")) switchView("rewards");
  if (event.target.closest("#morningCheckin")) morningCheckin();
  if (event.target.closest("#sleepCheckin")) sleepCheckin();
  if (event.target.closest("#exportHeatmap")) exportHeatmapV2();
  if (event.target.closest("#closeShare")) document.querySelector("#shareModal").classList.add("hidden");
  if (event.target.closest("#downloadShare")) downloadCanvas(document.querySelector("#shareCanvas"), "timewheel-habit.png");
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-form]");
  if (!form) return;
  event.preventDefault();
  if (form.dataset.form === "task") submitTask(form);
  if (form.dataset.form === "habit") submitHabit(form);
  if (form.dataset.form === "countdown") submitCountdown(form);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

render();
startTimerLoop();
scheduleTaskNotifications();
