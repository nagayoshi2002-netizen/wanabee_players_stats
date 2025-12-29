import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// ======================
// Firebase init
// ======================
const firebaseConfig = {
  apiKey: "AIzaSyAcebN4AcESHXYgQbsM-qdJC4PvlfzBbmA",
  authDomain: "wanabee-players-stats.firebaseapp.com",
  projectId: "wanabee-players-stats",
  storageBucket: "wanabee-players-stats.firebasestorage.app",
  messagingSenderId: "392879235657",
  appId: "1:392879235657:web:a0b0b0c87caf1643865598",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ======================
// DOM（ログイン）
// ======================
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusEl = document.getElementById("login-status");

// DOM（セクション）
const adminSection = document.getElementById("admin-section");
const joinSection = document.getElementById("join-section");
const matchesSection = document.getElementById("matches-section");
const teamSection = document.getElementById("team-section");
const scoreSection = document.getElementById("score-section");

// DOM（管理者）
const matchTitleEl = document.getElementById("match-title");
const createMatchBtn = document.getElementById("create-match-btn");
const adminInfoEl = document.getElementById("admin-info");

// DOM（チーム参加：予備導線）
const joinCodeEl = document.getElementById("join-code");
const teamNameEl = document.getElementById("team-name");
const joinBtn = document.getElementById("join-btn");
const joinInfoEl = document.getElementById("join-info");

// DOM（試合一覧）
const matchesList = document.getElementById("matches-list");

// DOM（選手登録）
const playerNameEl = document.getElementById("player-name");
const playerNumberEl = document.getElementById("player-number");
const addPlayerBtn = document.getElementById("add-player-btn");

// DOM（スコア入力）
const playerSelectEl = document.getElementById("player-select");
const startTimerBtn = document.getElementById("start-timer-btn");
const resetTimerBtn = document.getElementById("reset-timer-btn");
const timerEl = document.getElementById("timer");
const recordScoreBtn = document.getElementById("record-score-btn");
const scoreListEl = document.getElementById("score-list");

// DOM（選手管理画面用）
const teamAdminSection = document.getElementById("team-admin-section");
const backToMatchesBtn = document.getElementById("back-to-matches-btn");
const goToScoreBtn = document.getElementById("go-to-score-btn");

const bulkPlayersEl = document.getElementById("bulk-players");
const bulkAddBtn = document.getElementById("bulk-add-btn");

const adminPlayerNumberEl = document.getElementById("admin-player-number");
const adminPlayerNameEl = document.getElementById("admin-player-name");
const adminAddPlayerBtn = document.getElementById("admin-add-player-btn");

const adminPlayersListEl = document.getElementById("admin-players-list");


// ======================
// State
// ======================
let currentMatchId = null;
let currentMembership = null; // { role, teamName, ... }
let teamId = null;            // = auth.uid（チーム識別）
let timerBaseMs = 0;
let timerStartAt = null;
let timerIntervalId = null;

let assistSelectEl = null;
let stopTimerBtn = null;
let eventButtons = {}; // {goal, callahan, block}

let unsubscribePlayers = null;
let unsubscribeEvents = null;
let unsubscribeScoreAgg = null;

// スコア表示DOM（タイマー左右）
let scoreLeftEl = null;  // 自チーム
let scoreRightEl = null; // 相手チーム
let scoreRowEl = null;

// 試合内スコア状態
let scoreByTeam = {};    // { [teamId]: goals }
let opponentTeamId = ""; // 相手推定（eventsから推定）
let matchTitleCache = ""; // 招待表示用（match.title）

// 選手管理画面用
let managingMatchId = null;
let unsubscribeAdminPlayers = null;

function cleanupAdminPlayers() {
  if (unsubscribeAdminPlayers) {
    unsubscribeAdminPlayers();
    unsubscribeAdminPlayers = null;
  }
}

// ======================
// utils
// ======================
function randomJoinCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function msToMMSS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}
function currentTimerMs() {
  if (timerStartAt == null) return timerBaseMs;
  return timerBaseMs + (Date.now() - timerStartAt);
}
function setTimerText() {
  if (!timerEl) return;
  timerEl.textContent = msToMMSS(currentTimerMs());
}
async function isGlobalAdmin(uid) {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}
function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ======================
// UI bootstrap（HTML変更なしで追加UIを生成）
// ======================
function ensureExtraUI() {
  // Stopボタン追加
  if (startTimerBtn && !stopTimerBtn) {
    stopTimerBtn = document.createElement("button");
    stopTimerBtn.id = "stop-timer-btn";
    stopTimerBtn.textContent = "タイマー停止";
    stopTimerBtn.className = "ghost";
    stopTimerBtn.style.marginLeft = "8px";
    startTimerBtn.parentElement?.appendChild(stopTimerBtn);
    stopTimerBtn.addEventListener("click", () => stopTimer());
  }

  // アシスト選択追加
  if (playerSelectEl && !assistSelectEl) {
    assistSelectEl = document.createElement("select");
    assistSelectEl.id = "assist-select";
    assistSelectEl.style.marginLeft = "8px";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "アシスト（任意）";
    assistSelectEl.appendChild(opt0);
    playerSelectEl.parentElement?.insertBefore(assistSelectEl, startTimerBtn || null);
  }

  // キャナハン/ブロックボタン
  if (recordScoreBtn && !eventButtons.callahan) {
    const row = recordScoreBtn.parentElement;
    recordScoreBtn.textContent = "得点を記録（ゴール）";
    eventButtons.goal = recordScoreBtn;

    const btnCallahan = document.createElement("button");
    btnCallahan.id = "record-callahan-btn";
    btnCallahan.textContent = "キャナハンを記録";
    btnCallahan.className = "ghost";
    btnCallahan.style.marginLeft = "8px";

    const btnBlock = document.createElement("button");
    btnBlock.id = "record-block-btn";
    btnBlock.textContent = "ブロックを記録";
    btnBlock.className = "ghost";
    btnBlock.style.marginLeft = "8px";

    row?.appendChild(btnCallahan);
    row?.appendChild(btnBlock);

    eventButtons.callahan = btnCallahan;
    eventButtons.block = btnBlock;

    recordScoreBtn.addEventListener("click", () => recordEvent("goal"));
    btnCallahan.addEventListener("click", () => recordEvent("callahan"));
    btnBlock.addEventListener("click", () => recordEvent("block"));
  }

  // Start / Reset
  startTimerBtn?.addEventListener("click", () => startTimer());
  resetTimerBtn?.addEventListener("click", () => resetTimer());

  // タイマー左右にスコア表示を追加（timerElの親にスコア行を作る）
  if (timerEl && !scoreRowEl) {
    scoreRowEl = document.createElement("div");
    scoreRowEl.id = "score-row";
    scoreRowEl.style.display = "flex";
    scoreRowEl.style.alignItems = "center";
    scoreRowEl.style.justifyContent = "space-between";
    scoreRowEl.style.gap = "12px";
    scoreRowEl.style.margin = "8px 0";

    scoreLeftEl = document.createElement("div");
    scoreLeftEl.id = "score-left";
    scoreLeftEl.style.fontSize = "20px";
    scoreLeftEl.style.fontWeight = "700";
    scoreLeftEl.textContent = "0";

    scoreRightEl = document.createElement("div");
    scoreRightEl.id = "score-right";
    scoreRightEl.style.fontSize = "20px";
    scoreRightEl.style.fontWeight = "700";
    scoreRightEl.textContent = "0";

    // timerEl を中央に配置するため、timerEl を包むコンテナを作る
    const timerWrap = document.createElement("div");
    timerWrap.style.flex = "1";
    timerWrap.style.textAlign = "center";
    timerWrap.appendChild(timerEl);

    scoreRowEl.appendChild(scoreLeftEl);
    scoreRowEl.appendChild(timerWrap);
    scoreRowEl.appendChild(scoreRightEl);

    // 既存 timerEl の位置に scoreRowEl を差し替え
    const parent = timerEl.parentElement;
    parent?.insertBefore(scoreRowEl, timerEl);
  }
}

function setScoreUI() {
  if (!scoreLeftEl || !scoreRightEl) return;
  const my = scoreByTeam[teamId] || 0;
  const opp = opponentTeamId ? (scoreByTeam[opponentTeamId] || 0) : 0;
  scoreLeftEl.textContent = String(my);
  scoreRightEl.textContent = String(opp);
}

// ======================
// Timer controls（Start/Stop/Reset）
// ======================
function startTimer() {
  if (timerIntervalId) return;
  if (timerStartAt == null) timerStartAt = Date.now();
  timerIntervalId = window.setInterval(() => setTimerText(), 250);
  setTimerText();
}
function stopTimer() {
  if (!timerIntervalId) return;
  clearInterval(timerIntervalId);
  timerIntervalId = null;
  timerBaseMs = currentTimerMs();
  timerStartAt = null;
  setTimerText();
}
function resetTimer() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  timerBaseMs = 0;
  timerStartAt = null;
  setTimerText();
}

// ======================
// invites（招待試合一覧）
// ======================
async function fetchInvitesForEmail(emailLower) {
  const q = query(collection(db, "invites"), where("email", "==", emailLower));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function ensureMembershipFromInvite(invite, user) {
  const memRef = doc(db, "matches", invite.matchId, "memberships", user.uid);
  const memSnap = await getDoc(memRef);
  if (!memSnap.exists()) {
    await setDoc(memRef, {
      role: "team",
      teamName: invite.teamName || "",
      inviteId: invite.id,
      createdAt: serverTimestamp(),
    });
  }
}

async function openTeamAdmin(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  // membership確認（参加者のみ管理可）
  const mem = await loadMyMembership(matchId, user);
  if (!mem) return alert("この試合の参加権限がありません。");

  // 画面切替
  managingMatchId = matchId;
  matchesSection.style.display = "none";
  joinSection.style.display = "none";
  teamSection.style.display = "none";
  scoreSection.style.display = "none";
  teamAdminSection.style.display = "block";

  // ボタン
  backToMatchesBtn.onclick = () => {
    cleanupAdminPlayers();
    managingMatchId = null;
    teamAdminSection.style.display = "none";
    matchesSection.style.display = "block";
    joinSection.style.display = "block";
  };
  goToScoreBtn.onclick = () => {
    cleanupAdminPlayers();
    teamAdminSection.style.display = "none";
    enterMatch(matchId);
  };

  // players購読（自チーム=uid）
  cleanupAdminPlayers();
  const teamId_ = user.uid;
  const qref = query(playersColRef(matchId, teamId_), orderBy("number", "asc"));
  unsubscribeAdminPlayers = onSnapshot(qref, (snap) => {
    const players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAdminPlayersList(players, matchId, teamId_);
  }, (err) => {
    alert(`選手一覧の読み込み失敗\n${err.code}\n${err.message}`);
    console.error(err);
  });

  // 個別追加
  adminAddPlayerBtn.onclick = async () => {
    const number = (adminPlayerNumberEl.value || "").trim();
    const name = (adminPlayerNameEl.value || "").trim();
    if (!number || !name) return alert("背番号と名前を入力してください。");
    await addDoc(playersColRef(matchId, teamId_), {
      number, name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      active: true,
    });
    adminPlayerNumberEl.value = "";
    adminPlayerNameEl.value = "";
  };

  // 一括登録
  bulkAddBtn.onclick = async () => {
    const text = (bulkPlayersEl.value || "").trim();
    if (!text) return;

    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);
    const rows = [];
    for (const line of lines) {
      const parts = line.split(",").map(s => s.trim());
      if (parts.length < 2) continue;
      rows.push({ number: parts[0], name: parts.slice(1).join(",") });
    }
    if (rows.length === 0) return alert("形式が不正です。例：12,山田太郎");

    // まとめて追加（簡易：逐次add）
    for (const r of rows) {
      await addDoc(playersColRef(matchId, teamId_), {
        number: r.number,
        name: r.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        active: true,
      });
    }
    bulkPlayersEl.value = "";
  };
}

function renderAdminPlayersList(players, matchId, teamId_) {
  if (!adminPlayersListEl) return;

  if (players.length === 0) {
    adminPlayersListEl.innerHTML = "<li>まだ選手が登録されていません。</li>";
    return;
  }

  adminPlayersListEl.innerHTML = players.map(p => `
    <li data-player-id="${p.id}">
      <span>${escapeHtml(p.number)} ${escapeHtml(p.name)}</span>
      <button class="ghost" data-action="edit" style="margin-left:8px;">編集</button>
      <button class="ghost" data-action="delete" style="margin-left:8px;">削除</button>
    </li>
  `).join("");

  adminPlayersListEl.onclick = async (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;
    const li = e.target.closest("li");
    const playerId = li?.getAttribute("data-player-id");
    if (!playerId) return;

    const ref = doc(db, "matches", matchId, "teams", teamId_, "players", playerId);
    const action = btn.getAttribute("data-action");

    if (action === "delete") {
      if (!confirm("削除しますか？")) return;
      await deleteDoc(ref);
    }

    if (action === "edit") {
      const p = players.find(x => x.id === playerId);
      const number = prompt("背番号:", p?.number || "");
      if (number == null) return;
      const name = prompt("名前:", p?.name || "");
      if (name == null) return;
      await updateDoc(ref, {
        number: number.trim(),
        name: name.trim(),
        updatedAt: serverTimestamp(),
      });
    }
  };
}


// 招待表示：「対戦チーム vs 対戦チーム」
// 優先順位：matches.title（例：Wanabee A vs Wanabee B）
// 次点：invite.teamName vs ???（相手が不明なので unknown）
// 最低：Untitled Match
function formatMatchLabel(matchData, invite) {
  const title = (matchData?.title || "").trim();
  if (title) return title; // ここが「A vs B」形式である前提にする（運用で統一）
  const myTeam = (invite?.teamName || "").trim() || "Team";
  return `${myTeam} vs Opponent`;
}

async function renderMatchesFromInvites(user) {
  matchesList.innerHTML = "";

  const emailKey = normalizeEmail(user.email);
  let invites = [];
  try {
    invites = await fetchInvitesForEmail(emailKey);
  } catch (e) {
    alert(`invites 読み込み権限エラー\n${e.code}\n${e.message}`);
    console.error(e);
    return;
  }

  if (invites.length === 0) {
    matchesList.innerHTML = "<li>招待されている試合がありません。</li>";
    return;
  }

  // 招待→membership化
  try {
    for (const inv of invites) {
      await ensureMembershipFromInvite(inv, user);
    }
  } catch (e) {
    alert(`membership 作成権限エラー\n${e.code}\n${e.message}`);
    console.error(e);
    return;
  }

  // 試合表示
  for (const inv of invites) {
    try {
      const matchSnap = await getDoc(doc(db, "matches", inv.matchId));
      if (!matchSnap.exists()) continue;

      const m = matchSnap.data();
      const li = document.createElement("li");
      li.textContent = `${formatMatchLabel(m, inv)}（matchId: ${inv.matchId}）`;
      li.style.cursor = "pointer";
      const label = formatMatchLabel(m, inv); // 既存の「A vs B」表示関数

      li.innerHTML = `
        <span style="cursor:pointer;">${escapeHtml(label)}</span>
        <button class="ghost" data-action="manage" style="margin-left:8px;">選手管理</button>
        <button data-action="enter" style="margin-left:8px;">スコア入力</button>
      `;
      
      li.querySelector('[data-action="manage"]').addEventListener("click", (e) => {
        e.stopPropagation();
        openTeamAdmin(inv.matchId);
      });
      li.querySelector('[data-action="enter"]').addEventListener("click", (e) => {
        e.stopPropagation();
        enterMatch(inv.matchId);
      });
      li.querySelector("span").addEventListener("click", () => openTeamAdmin(inv.matchId));
      ;
      matchesList.appendChild(li);
    } catch (e) {
      console.error("match read failed:", inv.matchId, e);
    }
  }
}

// ======================
// Match enter / load
// ======================
async function loadMyMembership(matchId, user) {
  const memRef = doc(db, "matches", matchId, "memberships", user.uid);
  const memSnap = await getDoc(memRef);
  if (!memSnap.exists()) return null;
  return { id: memSnap.id, ...memSnap.data() };
}

function cleanupRealtime() {
  if (unsubscribePlayers) {
    unsubscribePlayers();
    unsubscribePlayers = null;
  }
  if (unsubscribeEvents) {
    unsubscribeEvents();
    unsubscribeEvents = null;
  }
  if (unsubscribeScoreAgg) {
    unsubscribeScoreAgg();
    unsubscribeScoreAgg = null;
  }
}

async function enterMatch(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  cleanupRealtime();
  currentMatchId = matchId;
  sessionStorage.setItem("currentMatchId", matchId);

  // membership
  try {
    currentMembership = await loadMyMembership(matchId, user);
    if (!currentMembership) {
      alert("この試合への参加権限がありません（membershipがありません）。");
      return;
    }
    teamId = user.uid;
  } catch (e) {
    alert(`membership 読み込み失敗\n${e.code}\n${e.message}`);
    console.error(e);
    return;
  }

  // UI切替
  matchesSection.style.display = "none";
  joinSection.style.display = "none";
  teamSection.style.display = "block";
  scoreSection.style.display = "block";

  // 初期化
  resetTimer();
  scoreByTeam = {};
  opponentTeamId = "";
  ensureExtraUI();
  setScoreUI();

  // subscribe
  subscribePlayers(matchId, teamId);
  subscribeEvents(matchId);
  subscribeScoreAggregate(matchId);
}

// ======================
// Players（メール入力不要：name+numberのみ）
// 設計：matches/{matchId}/teams/{teamId}/players/{playerId}
// ======================
function playersColRef(matchId, teamId_) {
  return collection(db, "matches", matchId, "teams", teamId_, "players");
}

async function addPlayer(matchId, teamId_) {
  const name = (playerNameEl?.value || "").trim();
  const number = (playerNumberEl?.value || "").trim();
  if (!name || !number) return alert("名前と背番号を入力してください。");

  try {
    await addDoc(playersColRef(matchId, teamId_), {
      name,
      number,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      active: true,
    });
    playerNameEl.value = "";
    playerNumberEl.value = "";
  } catch (e) {
    alert(`選手追加失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
}

function upsertPlayerOption(select, playerDoc) {
  const id = playerDoc.id;
  const label = `${playerDoc.number || "-"} ${playerDoc.name || ""}`.trim();
  let opt = select.querySelector(`option[value="${id}"]`);
  if (!opt) {
    opt = document.createElement("option");
    opt.value = id;
    select.appendChild(opt);
  }
  opt.textContent = label || id;
}

function rebuildSelects(players) {
  if (playerSelectEl) {
    const keep0 = playerSelectEl.querySelector('option[value=""]') || null;
    playerSelectEl.innerHTML = "";
    playerSelectEl.appendChild(
      keep0 ||
        Object.assign(document.createElement("option"), {
          value: "",
          textContent: "選手を選択",
        })
    );
  }
  if (assistSelectEl) {
    const keep0 = assistSelectEl.querySelector('option[value=""]') || null;
    assistSelectEl.innerHTML = "";
    assistSelectEl.appendChild(
      keep0 ||
        Object.assign(document.createElement("option"), {
          value: "",
          textContent: "アシスト（任意）",
        })
    );
  }
  for (const p of players) {
    if (playerSelectEl) upsertPlayerOption(playerSelectEl, p);
    if (assistSelectEl) upsertPlayerOption(assistSelectEl, p);
  }
}

function subscribePlayers(matchId, teamId_) {
  const qref = query(playersColRef(matchId, teamId_), orderBy("number", "asc"));
  unsubscribePlayers = onSnapshot(
    qref,
    (snap) => {
      const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rebuildSelects(players);
      renderPlayersManagement(players);
    },
    (err) => {
      alert(`players 読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );
}

function renderPlayersManagement(players) {
  if (!teamSection) return;

  let box = document.getElementById("players-admin-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "players-admin-box";
    box.style.marginTop = "12px";
    teamSection.appendChild(box);
  }

  if (players.length === 0) {
    box.innerHTML = `<p class="hint">選手がまだ登録されていません。</p>`;
    return;
  }

  const rows = players
    .map((p) => {
      const safeName = escapeHtml(p.name || "");
      const safeNum = escapeHtml(p.number || "");
      return `
        <li data-player-id="${p.id}">
          <span>${safeNum} ${safeName}</span>
          <button class="ghost" data-action="edit">編集</button>
          <button class="ghost" data-action="delete">削除</button>
        </li>
      `;
    })
    .join("");

  box.innerHTML = `
    <h3 style="margin: 12px 0 6px;">選手一覧（編集可）</h3>
    <ul id="players-admin-list" style="padding-left: 16px;">${rows}</ul>
  `;

  const list = document.getElementById("players-admin-list");
  list?.addEventListener(
    "click",
    async (ev) => {
      const btn = ev.target?.closest?.("button");
      if (!btn) return;

      const li = ev.target.closest("li");
      const playerId = li?.getAttribute("data-player-id");
      if (!playerId) return;

      const action = btn.getAttribute("data-action");
      if (!currentMatchId || !teamId) return;

      const playerRef = doc(db, "matches", currentMatchId, "teams", teamId, "players", playerId);

      if (action === "delete") {
        const ok = confirm("この選手を削除しますか？");
        if (!ok) return;
        try {
          await deleteDoc(playerRef);
        } catch (e) {
          alert(`削除失敗\n${e.code}\n${e.message}`);
          console.error(e);
        }
      }

      if (action === "edit") {
        const p = players.find((x) => x.id === playerId);
        const name = prompt("名前:", p?.name || "") ?? null;
        if (name === null) return;
        const number = prompt("背番号:", p?.number || "") ?? null;
        if (number === null) return;

        try {
          await updateDoc(playerRef, {
            name: name.trim(),
            number: number.trim(),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          alert(`編集失敗\n${e.code}\n${e.message}`);
          console.error(e);
        }
      }
    },
    { once: true }
  );
}

addPlayerBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!currentMatchId || !teamId) return alert("試合を選択してください。");
  await addPlayer(currentMatchId, teamId);
});

// ======================
// Events（goal/callahan/block + goalはassist）
// ======================
function eventsColRef(matchId) {
  return collection(db, "matches", matchId, "events");
}

async function recordEvent(type) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!currentMatchId || !teamId) return alert("試合を選択してください。");

  const scorerId = playerSelectEl?.value || "";
  if (!scorerId) return alert("選手を選択してください。");

  const assistId = assistSelectEl?.value || "";
  const timeMs = currentTimerMs();

  try {
    await addDoc(eventsColRef(currentMatchId), {
      type, // "goal" | "callahan" | "block"
      timeMs,
      teamId,
      scorerPlayerId: scorerId,
      assistPlayerId: type === "goal" ? assistId : "",
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    alert(`記録失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
}

function typeLabel(type) {
  if (type === "goal") return "得点";
  if (type === "callahan") return "キャナハン";
  if (type === "block") return "ブロック";
  return type;
}

function subscribeEvents(matchId) {
  const qref = query(eventsColRef(matchId), orderBy("timeMs", "desc"));
  unsubscribeEvents = onSnapshot(
    qref,
    async (snap) => {
      const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await renderEvents(events);
    },
    (err) => {
      alert(`events 読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );
}

async function getPlayerLabel(playerId) {
  if (!currentMatchId || !teamId) return playerId;
  try {
    const pSnap = await getDoc(doc(db, "matches", currentMatchId, "teams", teamId, "players", playerId));
    if (!pSnap.exists()) return playerId;
    const p = pSnap.data();
    return `${p.number || "-"} ${p.name || ""}`.trim() || playerId;
  } catch {
    return playerId;
  }
}

function parseMMSS(s) {
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const mm = Number(m[1]);
  const ss = Number(m[2]);
  if (!Number.isFinite(mm) || !Number.isFinite(ss) || ss >= 60) return null;
  return (mm * 60 + ss) * 1000;
}

async function renderEvents(events) {
  if (!scoreListEl) return;
  scoreListEl.innerHTML = "";

  for (const ev of events) {
    const li = document.createElement("li");
    li.setAttribute("data-event-id", ev.id);

    const t = msToMMSS(ev.timeMs || 0);
    const scorerLabel = await getPlayerLabel(ev.scorerPlayerId || "");
    const assistLabel = ev.assistPlayerId ? await getPlayerLabel(ev.assistPlayerId) : "";
    const assistText = ev.type === "goal" && assistLabel ? `（A: ${assistLabel}）` : "";

    li.innerHTML = `
      <span>${escapeHtml(`${t} / ${typeLabel(ev.type)} / ${scorerLabel} ${assistText}`)}</span>
      <button class="ghost" data-action="edit">編集</button>
      <button class="ghost" data-action="delete">削除</button>
    `;
    scoreListEl.appendChild(li);
  }

  scoreListEl.onclick = async (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;

    const li = e.target.closest("li");
    const eventId = li?.getAttribute("data-event-id");
    if (!eventId) return;

    const action = btn.getAttribute("data-action");
    const eventRef = doc(db, "matches", currentMatchId, "events", eventId);

    if (action === "delete") {
      const ok = confirm("このログを削除しますか？");
      if (!ok) return;
      try {
        await deleteDoc(eventRef);
      } catch (err) {
        alert(`削除失敗\n${err.code}\n${err.message}`);
        console.error(err);
      }
    }

    if (action === "edit") {
      const ev0 = events.find((x) => x.id === eventId);
      if (!ev0) return;

      const newType = prompt("種別（goal / callahan / block）:", ev0.type || "goal");
      if (newType === null) return;

      const newTime = prompt("時間（mm:ss）:", msToMMSS(ev0.timeMs || 0));
      if (newTime === null) return;

      const mmss = parseMMSS(newTime);
      if (mmss == null) return alert("時間は mm:ss 形式で入力してください（例：02:15）。");

      const payload = {
        type: newType.trim(),
        timeMs: mmss,
        updatedAt: serverTimestamp(),
      };
      if (payload.type !== "goal") payload.assistPlayerId = "";

      try {
        await updateDoc(eventRef, payload);
      } catch (err) {
        alert(`編集失敗\n${err.code}\n${err.message}`);
        console.error(err);
      }
    }
  };
}

// ======================
// Score aggregate（タイマー左右の得点表示）
// - goal と callahan を「得点」としてカウント（blockは得点にしない）
// - opponentTeamId は events に出てくる teamId から推定
// ======================
function subscribeScoreAggregate(matchId) {
  const qref = query(eventsColRef(matchId), orderBy("createdAt", "asc"));
  unsubscribeScoreAgg = onSnapshot(
    qref,
    (snap) => {
      const by = {};
      let opp = "";

      for (const d of snap.docs) {
        const ev = d.data();
        const tId = ev.teamId || "";
        if (!tId) continue;

        if (tId !== teamId && !opp) opp = tId;

        const isPoint = ev.type === "goal" || ev.type === "callahan";
        if (!isPoint) continue;

        by[tId] = (by[tId] || 0) + 1;
      }

      scoreByTeam = by;
      opponentTeamId = opp;
      setScoreUI();
    },
    (err) => {
      console.error("score aggregate failed:", err);
      // スコア表示が落ちても入力自体は継続可能
    }
  );
}

// ======================
// joinCode 参加（予備導線）
// ======================
async function findMatchIdByJoinCode(code) {
  const q = query(collection(db, "matches"), where("joinCode", "==", code));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

joinBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const code = (joinCodeEl?.value || "").trim().toUpperCase();
  const teamName = (teamNameEl?.value || "").trim();
  if (!code || !teamName) return alert("joinCode とチーム名を入力してください。");

  try {
    const matchId = await findMatchIdByJoinCode(code);
    if (!matchId) return alert("joinCode が見つかりません。");

    // 注意：ルールが inviteId 必須の場合はここで拒否されます。
    await setDoc(doc(db, "matches", matchId, "memberships", user.uid), {
      role: "team",
      teamName,
      inviteId: "joinCode",
      createdAt: serverTimestamp(),
    });

    joinInfoEl.textContent = `参加完了：matchId=${matchId}`;
    alert("試合に参加しました。");
  } catch (e) {
    alert(`参加失敗: ${e.code}\n${e.message}`);
    console.error(e);
  }
});

// ======================
// Auth UI
// ======================
signupBtn?.addEventListener("click", async () => {
  const email = (emailEl?.value || "").trim();
  const password = passEl?.value || "";
  if (!email || !password) return alert("メールとパスワードを入力してください。");

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("新規登録成功");
  } catch (e) {
    alert(`新規登録失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

loginBtn?.addEventListener("click", async () => {
  const email = (emailEl?.value || "").trim();
  const password = passEl?.value || "";
  if (!email || !password) return alert("メールとパスワードを入力してください。");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("ログイン成功");
  } catch (e) {
    alert(`ログイン失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    cleanupRealtime();
    currentMatchId = null;
    currentMembership = null;
    teamId = null;
    scoreByTeam = {};
    opponentTeamId = "";
    await signOut(auth);
  } catch (e) {
    alert(`ログアウト失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

// ======================
// 管理者：試合作成
// ======================
createMatchBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const ok = await isGlobalAdmin(user.uid);
  if (!ok) return alert("管理者権限がありません（adminsにUIDが未登録）。");

  const title = (matchTitleEl?.value || "").trim() || "Untitled Match";
  const joinCode = randomJoinCode(8);

  try {
    const matchRef = await addDoc(collection(db, "matches"), {
      title,
      status: "scheduled",
      createdBy: user.uid,
      joinCode,
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, "matches", matchRef.id, "memberships", user.uid), {
      role: "admin",
      createdAt: serverTimestamp(),
    });

    const msg = `作成完了：matchId=${matchRef.id} / joinCode=${joinCode}`;
    if (adminInfoEl) adminInfoEl.textContent = msg;
    alert(`試合作成OK\njoinCode: ${joinCode}`);
  } catch (e) {
    alert(`試合作成失敗: ${e.code}\n${e.message}`);
    console.error(e);
  }
});

// ======================
// Auth state
// ======================
onAuthStateChanged(auth, async (user) => {
  ensureExtraUI();
  setTimerText();
  setScoreUI();

  if (!user) {
    statusEl.textContent = "";
    logoutBtn.style.display = "none";
    signupBtn.style.display = "inline-block";
    adminSection.style.display = "none";
    matchesSection.style.display = "none";
    joinSection.style.display = "none";
    teamSection.style.display = "none";
    scoreSection.style.display = "none";
    matchesList.innerHTML = "";
    return;
  }

  statusEl.textContent = `ログイン中: ${user.email}`;
  logoutBtn.style.display = "inline-block";
  signupBtn.style.display = "none"; // ログインしたら新規登録を消す

  try {
    const ok = await isGlobalAdmin(user.uid);
    adminSection.style.display = ok ? "block" : "none";
  } catch (e) {
    adminSection.style.display = "none";
    console.error("admin check failed:", e);
  }

  matchesSection.style.display = "block";
  joinSection.style.display = "block";
  teamSection.style.display = "none";
  scoreSection.style.display = "none";

  try {
    await renderMatchesFromInvites(user);
  } catch (e) {
    alert(`招待試合表示エラー\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

