// app.js（全文置換：タイマー共有 + 重複追加防止 + スクショ寄せレイアウト + Adminは全試合参照）
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
  writeBatch,
  limit,
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
// DOM
// ======================
// topbar
const topbarEl = document.getElementById("topbar");
const topbarStatusEl = document.getElementById("topbar-status");

// login
const loginSection = document.getElementById("login-section");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginStatusEl = document.getElementById("login-status");

// UID確認
const uidVerifySection = document.getElementById("uid-verify-section");
const uidDisplayEl = document.getElementById("uid-display");
const uidInputEl = document.getElementById("uid-input");
const uidHintEl = document.getElementById("uid-hint");
const uidVerifyBtn = document.getElementById("uid-verify-btn");

// sections
const repHomeSection = document.getElementById("rep-home-section");
const playerRegistrySection = document.getElementById("player-registry-section");
const adminSection = document.getElementById("admin-section");
const matchesSection = document.getElementById("matches-section");
const teamAdminSection = document.getElementById("team-admin-section");
const scoreSection = document.getElementById("score-section");

// rep home
const openPlayerRegistryBtn = document.getElementById("open-player-registry-btn");
const openMatchesBtn = document.getElementById("open-matches-btn");

// player registry
const backToHomeBtn = document.getElementById("back-to-home-btn");
const goToMatchesBtn = document.getElementById("go-to-matches-btn");
const registryTournamentIdEl = document.getElementById("registry-tournament-id");
const loadRegistryBtn = document.getElementById("load-registry-btn");
const registryContextEl = document.getElementById("registry-context");
const registryPlayerNumberEl = document.getElementById("registry-player-number");
const registryPlayerNameEl = document.getElementById("registry-player-name");
const registryAddPlayerBtn = document.getElementById("registry-add-player-btn");
const registryBulkEl = document.getElementById("registry-bulk");
const registryBulkAddBtn = document.getElementById("registry-bulk-add-btn");
const registryPlayersListEl = document.getElementById("registry-players-list");
const registrySearchEl = document.getElementById("registry-search");
const registryClearSearchBtn = document.getElementById("registry-clear-search-btn");

// admin create match
const teamANameEl = document.getElementById("team-a-name");
const teamBNameEl = document.getElementById("team-b-name");
const teamAEmailEl = document.getElementById("team-a-email");
const teamBEmailEl = document.getElementById("team-b-email");
const createMatchBtn = document.getElementById("create-match-btn");
const adminInfoEl = document.getElementById("admin-info");

// matches list
const matchesTitleEl = document.getElementById("matches-title");
const matchesListEl = document.getElementById("matches-list");

// team admin
const teamAdminContextEl = document.getElementById("team-admin-context");
const backToMatchesFromAdminBtn = document.getElementById("back-to-matches-from-admin-btn");
const goToScoreFromAdminBtn = document.getElementById("go-to-score-from-admin-btn");
const copyTournamentToMatchBtn = document.getElementById("copy-tournament-to-match-btn");
const clearMatchPlayersBtn = document.getElementById("clear-match-players-btn");
const bulkTournamentPlayersEl = document.getElementById("bulk-tournament-players");
const bulkAddTournamentBtn = document.getElementById("bulk-add-tournament-btn");
const tournamentPlayerNumberEl = document.getElementById("tournament-player-number");
const tournamentPlayerNameEl = document.getElementById("tournament-player-name");
const addTournamentPlayerBtn = document.getElementById("add-tournament-player-btn");
const tournamentPlayersListEl = document.getElementById("tournament-players-list");
const bulkMatchPlayersEl = document.getElementById("bulk-match-players");
const bulkAddMatchBtn = document.getElementById("bulk-add-match-btn");
const matchPlayerNumberEl = document.getElementById("match-player-number");
const matchPlayerNameEl = document.getElementById("match-player-name");
const addMatchPlayerBtn = document.getElementById("add-match-player-btn");
const matchPlayersListEl = document.getElementById("match-players-list");

// score screen
const backToMatchesBtn = document.getElementById("back-to-matches-btn");
const openTeamAdminBtn = document.getElementById("open-team-admin-btn");

const startTimerBtn = document.getElementById("start-timer-btn");
const resetTimerBtn = document.getElementById("reset-timer-btn");
const stopTimerBtn = document.getElementById("stop-timer-btn");

const teamLeftNameEl = document.getElementById("team-left-name");
const teamRightNameEl = document.getElementById("team-right-name");
const scoreLeftEl = document.getElementById("score-left");
const scoreRightEl = document.getElementById("score-right");
const timerEl = document.getElementById("timer");

const playerSelectEl = document.getElementById("player-select");
const assistSelectEl = document.getElementById("assist-select");
const recordGoalBtn = document.getElementById("record-goal-btn");
const recordCallahanBtn = document.getElementById("record-callahan-btn");

const eventsBoardEl = document.getElementById("events-board");

// ======================
// State
// ======================
let isAdmin = false;

let currentMatchId = null;
let currentMatch = null;
let currentTournamentId = null;
let currentMembership = null;

// 画面表示の“自チーム”は、通常はログインUID
let myUid = null;

// match teams（表示用）
let teamAUid = null;
let teamBUid = null;
let teamAName = "Team A";
let teamBName = "Team B";

// players cache
// playersByTeamUid[teamUid] = Map(playerId -> {number,name})
const playersByTeamUid = new Map();
const teamNameByUid = new Map();

// registry
let registryTournamentId = null;
let registryAllPlayers = [];
let unsubRegistryPlayers = null;

// realtime unsub
let unsubMyPlayersForSelect = null;
let unsubEvents = null;
let unsubAgg = null;
let unsubTournamentPlayers = null;
let unsubMatchPlayers = null;

// timer render
let timerIntervalId = null;
// shared timer state (derived from Firestore events)
let sharedTimer = {
  running: false,
  baseMs: 0,
  startAtMs: null, // number(ms) from Firestore Timestamp
};

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

function parseMMSS(s) {
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const mm = Number(m[1]);
  const ss = Number(m[2]);
  if (!Number.isFinite(mm) || !Number.isFinite(ss) || ss >= 60) return null;
  return (mm * 60 + ss) * 1000;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function normalizeTournamentId(tid) {
  return String(tid || "").trim().toLowerCase();
}

function setTopbar(user) {
  if (!topbarEl) return;
  if (!user) {
    topbarEl.style.display = "none";
    if (topbarStatusEl) topbarStatusEl.textContent = "-";
    return;
  }
  topbarEl.style.display = "block";
  if (topbarStatusEl) topbarStatusEl.textContent = `ログイン中: ${user.email || ""}`;
}

async function isGlobalAdmin(uid) {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}

// ======================
// Firestore refs
// ======================
function usersCol() {
  return collection(db, "users");
}
function userRef(uid) {
  return doc(db, "users", uid);
}

function invitesCol() {
  return collection(db, "invites");
}
function matchesCol() {
  return collection(db, "matches");
}
function matchRef(matchId) {
  return doc(db, "matches", matchId);
}
function membershipRef(matchId, uid) {
  return doc(db, "matches", matchId, "memberships", uid);
}
function membershipsCol(matchId) {
  return collection(db, "matches", matchId, "memberships");
}
function matchPlayersCol(matchId, teamId_) {
  return collection(db, "matches", matchId, "teams", teamId_, "players");
}
function matchPlayerRef(matchId, teamId_, playerId) {
  return doc(db, "matches", matchId, "teams", teamId_, "players", playerId);
}
function eventsCol(matchId) {
  return collection(db, "matches", matchId, "events");
}
function eventRef(matchId, eventId) {
  return doc(db, "matches", matchId, "events", eventId);
}

// tournaments
function tournamentTeamPlayersCol(tournamentId, teamId_) {
  return collection(db, "tournaments", tournamentId, "teams", teamId_, "players");
}
function tournamentTeamPlayerRef(tournamentId, teamId_, playerId) {
  return doc(db, "tournaments", tournamentId, "teams", teamId_, "players", playerId);
}

// ======================
// Section control
// ======================
function hideAllMainSections() {
  uidVerifySection && (uidVerifySection.style.display = "none");

  repHomeSection && (repHomeSection.style.display = "none");
  playerRegistrySection && (playerRegistrySection.style.display = "none");

  adminSection && (adminSection.style.display = "none");
  matchesSection && (matchesSection.style.display = "none");
  teamAdminSection && (teamAdminSection.style.display = "none");
  scoreSection && (scoreSection.style.display = "none");
}

function showLoginUI() {
  hideAllMainSections();
  if (loginSection) loginSection.style.display = "block";
}

function hideLoginUI() {
  if (loginSection) loginSection.style.display = "none";
}

function showRepHome() {
  hideAllMainSections();
  repHomeSection && (repHomeSection.style.display = "block");
}

function showMatchesScreen() {
  hideAllMainSections();
  matchesSection && (matchesSection.style.display = "block");
  if (isAdmin) adminSection && (adminSection.style.display = "block");
}

function showPlayerRegistryScreen() {
  hideAllMainSections();
  playerRegistrySection && (playerRegistrySection.style.display = "block");
  if (isAdmin) adminSection && (adminSection.style.display = "block");
}

function showScoreScreen() {
  hideAllMainSections();
  scoreSection && (scoreSection.style.display = "block");
  // 管理者の試合作成UIはここでは出さない（見やすさ優先）
}

function showTeamAdminScreen() {
  hideAllMainSections();
  teamAdminSection && (teamAdminSection.style.display = "block");
  // 管理者の試合作成UIはここでは出さない（見やすさ優先）
}

// ======================
// Cleanup
// ======================
function cleanupMatchRealtime() {
  unsubMyPlayersForSelect?.(); unsubMyPlayersForSelect = null;
  unsubEvents?.(); unsubEvents = null;
  unsubAgg?.(); unsubAgg = null;

  // players cacheは保持（画面遷移で消す必要はない）
  stopLocalTimerInterval();
}

function cleanupAdminRealtime() {
  unsubTournamentPlayers?.(); unsubTournamentPlayers = null;
  unsubMatchPlayers?.(); unsubMatchPlayers = null;
}

function cleanupRegistryRealtime() {
  unsubRegistryPlayers?.(); unsubRegistryPlayers = null;
  registryAllPlayers = [];
}

// ======================
// Timer (shared by events)
// ======================
function currentSharedTimerMs() {
  if (!sharedTimer.running || sharedTimer.startAtMs == null) return sharedTimer.baseMs || 0;
  return (sharedTimer.baseMs || 0) + (Date.now() - sharedTimer.startAtMs);
}

function setTimerText() {
  if (!timerEl) return;
  timerEl.textContent = msToMMSS(currentSharedTimerMs());
}

function startLocalTimerInterval() {
  if (timerIntervalId) return;
  timerIntervalId = window.setInterval(setTimerText, 250);
  setTimerText();
}

function stopLocalTimerInterval() {
  if (!timerIntervalId) return;
  clearInterval(timerIntervalId);
  timerIntervalId = null;
}

async function timerStart() {
  if (!currentMatchId) return;
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  // 直ちにローカルを動かしつつ、共有イベントを書き込む
  const baseMs = currentSharedTimerMs();

  // optimistic
  sharedTimer.running = true;
  sharedTimer.baseMs = baseMs;
  sharedTimer.startAtMs = Date.now();
  startLocalTimerInterval();

  try {
    await addDoc(eventsCol(currentMatchId), {
      type: "timer_start",
      teamId: user.uid,
      baseMs,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    alert(`タイマー開始の共有に失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
  }
}

async function timerStop() {
  if (!currentMatchId) return;
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const baseMs = currentSharedTimerMs();

  // optimistic
  sharedTimer.running = false;
  sharedTimer.baseMs = baseMs;
  sharedTimer.startAtMs = null;
  setTimerText();

  try {
    await addDoc(eventsCol(currentMatchId), {
      type: "timer_stop",
      teamId: user.uid,
      baseMs,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    alert(`タイマー停止の共有に失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
  }
}

async function timerReset() {
  if (!currentMatchId) return;
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  // optimistic
  sharedTimer.running = false;
  sharedTimer.baseMs = 0;
  sharedTimer.startAtMs = null;
  setTimerText();

  try {
    await addDoc(eventsCol(currentMatchId), {
      type: "timer_reset",
      teamId: user.uid,
      baseMs: 0,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    alert(`タイマーリセットの共有に失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
  }
}

// ======================
// Matches list
// ======================
async function fetchInvitesForUid(uid) {
  const q = query(invitesCol(), where("teamUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function ensureMembershipFromInvite(invite, user) {
  const ref = membershipRef(invite.matchId, user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      role: "team",
      teamName: invite.teamName || "",
      inviteId: invite.id,
      createdAt: serverTimestamp(),
    });
  }
}

function formatMatchTitle(matchData) {
  const title = (matchData?.title || "").trim();
  return title || "Untitled Match";
}

async function renderMatchesForUser(user) {
  if (!matchesListEl) return;
  matchesListEl.innerHTML = "";

  if (isAdmin) {
    if (matchesTitleEl) matchesTitleEl.textContent = "全ての試合（管理者）";

    try {
      const snap = await getDocs(query(matchesCol(), orderBy("createdAt", "desc"), limit(50)));
      if (snap.empty) {
        matchesListEl.innerHTML = "<li>試合がありません。</li>";
        return;
      }
      for (const d of snap.docs) {
        const m = { id: d.id, ...d.data() };
        const li = document.createElement("li");
        li.className = "match-item";
        li.innerHTML = `
          <div class="match-item__title">${escapeHtml(formatMatchTitle(m))}</div>
          <div class="match-item__actions">
            <button class="btn btn--ghost" data-action="manage">選手管理</button>
            <button class="btn" data-action="enter">試合入力</button>
          </div>
        `;
        li.querySelector('[data-action="manage"]')?.addEventListener("click", async (e) => {
          e.stopPropagation();
          await openTeamAdmin(m.id);
        });
        li.querySelector('[data-action="enter"]')?.addEventListener("click", async (e) => {
          e.stopPropagation();
          await enterMatch(m.id);
        });
        li.addEventListener("click", async () => enterMatch(m.id));
        matchesListEl.appendChild(li);
      }
    } catch (e) {
      console.error(e);
      matchesListEl.innerHTML = "<li>試合一覧の取得に失敗しました。</li>";
    }
    return;
  }

  // team / normal users: invites-based
  if (matchesTitleEl) matchesTitleEl.textContent = "参加できる試合";

  let invites = [];
  try {
    invites = await fetchInvitesForUid(user.uid);
  } catch (e) {
    alert(`invites 読み込み権限エラー\n${e.code}\n${e.message}`);
    console.error(e);
    return;
  }

  if (invites.length === 0) {
    matchesListEl.innerHTML = "<li>招待されている試合がありません。</li>";
    return;
  }

  try {
    for (const inv of invites) await ensureMembershipFromInvite(inv, user);
  } catch (e) {
    alert(`membership 作成権限エラー\n${e.code}\n${e.message}`);
    console.error(e);
    return;
  }

  for (const inv of invites) {
    try {
      const ms = await getDoc(matchRef(inv.matchId));
      if (!ms.exists()) continue;
      const m = { id: ms.id, ...ms.data() };

      const li = document.createElement("li");
      li.className = "match-item";
      li.innerHTML = `
        <div class="match-item__title">${escapeHtml(formatMatchTitle(m))}</div>
        <div class="match-item__actions">
          <button class="btn btn--ghost" data-action="manage">選手管理</button>
          <button class="btn" data-action="enter">試合入力</button>
        </div>
      `;

      li.querySelector('[data-action="manage"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        openTeamAdmin(inv.matchId);
      });
      li.querySelector('[data-action="enter"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        enterMatch(inv.matchId);
      });
      li.addEventListener("click", () => openTeamAdmin(inv.matchId));

      matchesListEl.appendChild(li);
    } catch (e) {
      console.error("match read failed:", inv.matchId, e);
    }
  }
}

// ======================
// Membership / match load
// ======================
async function loadMyMembership(matchId, user) {
  const ref = membershipRef(matchId, user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function loadMatch(matchId) {
  const snap = await getDoc(matchRef(matchId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ======================
// Players cache + selects
// ======================
function ensureTeamPlayersMap(teamUid) {
  if (!playersByTeamUid.has(teamUid)) playersByTeamUid.set(teamUid, new Map());
  return playersByTeamUid.get(teamUid);
}

function rebuildSelectsFromMyPlayers() {
  if (!playerSelectEl || !assistSelectEl) return;

  playerSelectEl.innerHTML = `<option value="">選手を選択</option>`;
  assistSelectEl.innerHTML = `<option value="">アシスト（任意）</option>`;

  const map = ensureTeamPlayersMap(myUid || "");
  const players = Array.from(map.entries()).map(([id, p]) => ({ id, ...p }));

  players.sort((a, b) => String(a.number || "").localeCompare(String(b.number || ""), "ja", { numeric: true }));

  for (const p of players) {
    const label = `${p.number || "-"} ${p.name || ""}`.trim() || p.id;
    const o1 = document.createElement("option");
    o1.value = p.id;
    o1.textContent = label;
    playerSelectEl.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = p.id;
    o2.textContent = label;
    assistSelectEl.appendChild(o2);
  }
}

async function primeTeamNamesFromMemberships(matchId) {
  // 既に matchDocに入っていればそれを優先
  if (currentMatch?.teamAUid && currentMatch?.teamBUid) return;

  try {
    const snap = await getDocs(query(membershipsCol(matchId)));
    const teams = snap.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .filter((x) => x.role === "team");

    if (teams.length >= 1 && !teamAUid) {
      teamAUid = teams[0].uid;
      teamAName = teams[0].teamName || teamAName;
    }
    if (teams.length >= 2 && !teamBUid) {
      teamBUid = teams[1].uid;
      teamBName = teams[1].teamName || teamBName;
    }

    if (teamAUid) teamNameByUid.set(teamAUid, teamAName);
    if (teamBUid) teamNameByUid.set(teamBUid, teamBName);
  } catch {
    // ルール都合で読めない場合は無視（イベントから推定する）
  }
}

function setScoreUI() {
  if (!scoreLeftEl || !scoreRightEl) return;

  const left = teamAUid ? (scoreByTeam[teamAUid] || 0) : 0;
  const right = teamBUid ? (scoreByTeam[teamBUid] || 0) : 0;

  scoreLeftEl.textContent = String(left);
  scoreRightEl.textContent = String(right);

  if (teamLeftNameEl) teamLeftNameEl.textContent = teamAName || "Team A";
  if (teamRightNameEl) teamRightNameEl.textContent = teamBName || "Team B";
}

async function getPlayerLabel(matchId, teamUid, playerId) {
  const map = ensureTeamPlayersMap(teamUid);
  const cached = map.get(playerId);
  if (cached) return `${cached.number || "-"} ${cached.name || ""}`.trim() || playerId;

  // lazy fetch (fallback)
  try {
    const snap = await getDoc(matchPlayerRef(matchId, teamUid, playerId));
    if (!snap.exists()) return playerId;
    const p = snap.data() || {};
    map.set(playerId, { number: p.number || "", name: p.name || "" });
    return `${p.number || "-"} ${p.name || ""}`.trim() || playerId;
  } catch {
    return playerId;
  }
}

function getTeamName(uid) {
  if (!uid) return "";
  return teamNameByUid.get(uid) || (uid === teamAUid ? teamAName : uid === teamBUid ? teamBName : "");
}

// ======================
// Events (goal/callahan + edit/delete)
// ======================
function typeLabel(type) {
  if (type === "goal") return "得点";
  if (type === "callahan") return "キャラハン";
  return type;
}

function isPointType(type) {
  return type === "goal" || type === "callahan";
}

async function recordEvent(type) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!currentMatchId) return alert("試合を選択してください。");

  const scorerId = playerSelectEl?.value || "";
  if (!scorerId) return alert("選手を選択してください。");

  const assistId = assistSelectEl?.value || "";
  const timeMs = currentSharedTimerMs();

  try {
    await addDoc(eventsCol(currentMatchId), {
      type, // "goal" | "callahan"
      timeMs,
      teamId: user.uid,
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

// ======================
// Rendering (events board)
// ======================
function buildEventRowHtml({ leftHtml, centerHtml, rightHtml, actionsHtml }) {
  return `
    <div class="event-row">
      <div class="event-cell event-cell--left">${leftHtml || ""}</div>
      <div class="event-cell event-cell--center">${centerHtml || ""}</div>
      <div class="event-cell event-cell--right">${rightHtml || ""}</div>
      <div class="event-cell event-cell--actions">${actionsHtml || ""}</div>
    </div>
  `;
}

function playerInfoHtml({ numberName, sub }) {
  const main = `<div class="event-main">${escapeHtml(numberName)}</div>`;
  const subLine = sub ? `<div class="event-sub">${escapeHtml(sub)}</div>` : "";
  return `<div class="event-player">${main}${subLine}</div>`;
}

async function renderEvents(events) {
  if (!eventsBoardEl) return;

  // timer系は表示しない
  const visible = events.filter((e) => e.type !== "timer_start" && e.type !== "timer_stop" && e.type !== "timer_reset");

  if (visible.length === 0) {
    eventsBoardEl.innerHTML = `<div class="empty">まだ記録がありません。</div>`;
    return;
  }

  let html = "";

  for (const ev of visible) {
    // team推定（古いmatchでteamA/Bが空のとき）
    if (ev.teamId && !teamNameByUid.has(ev.teamId)) {
      const guessName = "";
      if (guessName) teamNameByUid.set(ev.teamId, guessName);
    }
    if (!teamAUid && ev.teamId) teamAUid = ev.teamId;
    if (teamAUid && !teamBUid && ev.teamId && ev.teamId !== teamAUid) teamBUid = ev.teamId;

    // team names
    if (teamAUid && !teamNameByUid.has(teamAUid)) teamNameByUid.set(teamAUid, teamAName);
    if (teamBUid && !teamNameByUid.has(teamBUid)) teamNameByUid.set(teamBUid, teamBName);

    // fallback: if match has team names but not UIDs, keep displayed names
    setScoreUI();

    const t = msToMMSS(ev.timeMs || 0);

    const evTeamUid = ev.teamId || "";
    const teamName = getTeamName(evTeamUid) || "Team";

    const scorerLabel = ev.scorerPlayerId
      ? await getPlayerLabel(currentMatchId, evTeamUid, ev.scorerPlayerId)
      : "";

    const assistLabel = ev.assistPlayerId
      ? await getPlayerLabel(currentMatchId, evTeamUid, ev.assistPlayerId)
      : "";

    // 表示要件：
    // - "00:00 14 よしなが"（時刻 背番号 名前） -> 時刻は中央列
    // - ゴールは下に（アシスト：...）
    // - キャラハンは下に（キャラハン）
    const numberName = scorerLabel || ev.scorerPlayerId || "";
    const sub = ev.type === "callahan"
      ? "（キャラハン）"
      : (ev.type === "goal" && assistLabel ? `（アシスト：${assistLabel}）` : "");

    const info = playerInfoHtml({ numberName, sub });

    const leftHtml = evTeamUid && evTeamUid === teamAUid
      ? `${info}<div class="event-team">(${escapeHtml(teamName)})</div>`
      : "";

    const rightHtml = evTeamUid && evTeamUid === teamBUid
      ? `${info}<div class="event-team">(${escapeHtml(teamName)})</div>`
      : "";

    // 片側しか確定してない場合（古い試合など）：左側に寄せる
    const singleSide = !!teamAUid && !teamBUid;
    const finalLeft = singleSide ? `${info}<div class="event-team">(${escapeHtml(teamName)})</div>` : leftHtml;
    const finalRight = singleSide ? "" : rightHtml;

    const actionsHtml = `
      <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${escapeHtml(ev.id)}">編集</button>
      <button class="btn btn--ghost btn--sm" data-action="delete" data-id="${escapeHtml(ev.id)}">削除</button>
    `;

    html += buildEventRowHtml({
      leftHtml: finalLeft,
      centerHtml: `<div class="event-time">${escapeHtml(t)}</div>`,
      rightHtml: finalRight,
      actionsHtml,
    });
  }

  eventsBoardEl.innerHTML = html;

  // クリックハンドラは「上書き1回」のみ（重複しない）
  eventsBoardEl.onclick = async (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;

    const id = btn.getAttribute("data-id");
    if (!id || !currentMatchId) return;

    const action = btn.getAttribute("data-action");
    const ref = eventRef(currentMatchId, id);

    if (action === "delete") {
      if (!confirm("この記録を削除しますか？")) return;
      try {
        await deleteDoc(ref);
      } catch (err) {
        alert(`削除失敗\n${err.code}\n${err.message}`);
        console.error(err);
      }
    }

    if (action === "edit") {
      // 現在のイベントを手元配列から探す
      // （render時点のeventsをクロージャで持たない設計なので、再取得）
      try {
        // ここは軽量化のため getDoc
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const ev0 = { id: snap.id, ...snap.data() };

        // 種別（goal/callahan）
        const newType = prompt("種別（goal / callahan）:", ev0.type || "goal");
        if (newType === null) return;
        const t0 = msToMMSS(ev0.timeMs || 0);
        const newTime = prompt("時間（mm:ss）:", t0);
        if (newTime === null) return;

        const mmss = parseMMSS(newTime);
        if (mmss == null) return alert("時間は mm:ss 形式で入力してください（例：02:15）。");

        const payload = {
          type: String(newType).trim(),
          timeMs: mmss,
          updatedAt: serverTimestamp(),
        };
        if (payload.type !== "goal") payload.assistPlayerId = "";

        await updateDoc(ref, payload);
      } catch (err) {
        alert(`編集失敗\n${err.code || ""}\n${err.message || err}`);
        console.error(err);
      }
    }
  };
}

// ======================
// Subscriptions
// ======================
function subscribeMyPlayers(matchId, uid) {
  // 自分の選手だけをセレクトに反映（運用：代表者が自チームを入力）
  unsubMyPlayersForSelect?.();
  unsubMyPlayersForSelect = onSnapshot(
    query(matchPlayersCol(matchId, uid), orderBy("number", "asc")),
    (snap) => {
      const map = ensureTeamPlayersMap(uid);
      map.clear();
      for (const d of snap.docs) {
        const p = d.data() || {};
        map.set(d.id, { number: p.number || "", name: p.name || "" });
      }
      rebuildSelectsFromMyPlayers();
    },
    (err) => {
      console.error(err);
      // 代表者以外（閲覧ユーザー）では読めない可能性があるが、閲覧は継続
    }
  );
}

function subscribeEventsAndAggregate(matchId) {
  unsubEvents?.();
  unsubAgg?.();

  // 全イベント（表示用）
  unsubEvents = onSnapshot(
    query(eventsCol(matchId), orderBy("createdAt", "desc")),
    async (snap) => {
      const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await renderEvents(events);
    },
    (err) => {
      alert(`events 読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );

  // 得点・タイマーの集計（createdAt asc）
  unsubAgg = onSnapshot(
    query(eventsCol(matchId), orderBy("createdAt", "asc")),
    (snap) => {
      const by = {};
      // timer derive
      let running = false;
      let baseMs = 0;
      let startAtMs = null;

      // team discovery fallback
      const foundTeams = [];

      for (const d of snap.docs) {
        const ev = d.data() || {};
        const type = ev.type || "";
        const tId = ev.teamId || "";

        if (tId && !foundTeams.includes(tId)) foundTeams.push(tId);

        // score
        if (tId && isPointType(type)) {
          by[tId] = (by[tId] || 0) + 1;
        }

        // timer
        if (type === "timer_reset") {
          running = false;
          baseMs = 0;
          startAtMs = null;
        }
        if (type === "timer_start") {
          const b = Number(ev.baseMs);
          baseMs = Number.isFinite(b) ? b : baseMs;

          // createdAtを起点に（serverTimestampが解決後に入る）
          const ts = ev.createdAt?.toMillis?.();
          if (typeof ts === "number") startAtMs = ts;
          else startAtMs = Date.now(); // fallback
          running = true;
        }
        if (type === "timer_stop") {
          const b = Number(ev.baseMs);
          baseMs = Number.isFinite(b) ? b : baseMs;
          running = false;
          startAtMs = null;
        }
      }

      // team ids fallback set
      if (!teamAUid && foundTeams.length >= 1) teamAUid = foundTeams[0];
      if (!teamBUid && foundTeams.length >= 2) teamBUid = foundTeams[1];

      scoreByTeam = by;

      // apply shared timer
      sharedTimer.running = running;
      sharedTimer.baseMs = baseMs;
      sharedTimer.startAtMs = startAtMs;

      setScoreUI();
      if (running) startLocalTimerInterval();
      else {
        stopLocalTimerInterval();
        setTimerText();
      }
    },
    (err) => {
      console.error("aggregate failed:", err);
    }
  );
}

// ======================
// Enter match
// ======================
async function enterMatch(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  currentMatchId = matchId;
  myUid = user.uid;

  // match
  try {
    currentMatch = await loadMatch(matchId);
    if (!currentMatch) return alert("試合情報が見つかりません。");
    currentTournamentId = currentMatch.tournamentId || null;

    // 表示用のチーム情報（新規作成ではここが入る）
    teamAUid = currentMatch.teamAUid || null;
    teamBUid = currentMatch.teamBUid || null;
    teamAName = currentMatch.teamAName || teamAName;
    teamBName = currentMatch.teamBName || teamBName;

    if (teamAUid) teamNameByUid.set(teamAUid, teamAName);
    if (teamBUid) teamNameByUid.set(teamBUid, teamBName);
  } catch (e) {
    alert(`試合読み込み失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
    return;
  }

  // membership (adminは無くても閲覧OK)
  try {
    currentMembership = await loadMyMembership(matchId, user);
  } catch {
    currentMembership = null;
  }

  showScoreScreen();
  hideLoginUI(); // ログインカードは試合画面では非表示
  setScoreUI();
  setTimerText();

  // “自分の選手”セレクトは、代表者（メンバー）でのみ動かす
  const canUseInputs = !!currentMembership; // 代表者として参加してる人
  playerSelectEl && (playerSelectEl.disabled = !canUseInputs);
  assistSelectEl && (assistSelectEl.disabled = !canUseInputs);
  recordGoalBtn && (recordGoalBtn.disabled = !canUseInputs);
  recordCallahanBtn && (recordCallahanBtn.disabled = !canUseInputs);

  openTeamAdminBtn && (openTeamAdminBtn.disabled = !canUseInputs);

  // 自分の選手リスト購読（セレクト用）
  if (canUseInputs) subscribeMyPlayers(matchId, user.uid);
  else {
    // ビューワーは選手選択を空に
    if (playerSelectEl) playerSelectEl.innerHTML = `<option value="">選手を選択</option>`;
    if (assistSelectEl) assistSelectEl.innerHTML = `<option value="">アシスト（任意）</option>`;
  }

  // team names fallback（ルールが許す場合のみ）
  await primeTeamNamesFromMemberships(matchId);
  setScoreUI();

  // events / aggregate / shared timer
  subscribeEventsAndAggregate(matchId);
}

// ======================
// Back to matches
// ======================
async function goBackToMatches() {
  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  currentMatchId = null;
  currentMatch = null;
  currentTournamentId = null;
  currentMembership = null;

  // reset view state (keep cached names)
  sharedTimer = { running: false, baseMs: 0, startAtMs: null };
  setTimerText();

  showMatchesScreen();
  const user = auth.currentUser;
  if (user) await renderMatchesForUser(user);
}

backToMatchesBtn?.addEventListener("click", goBackToMatches);

openTeamAdminBtn?.addEventListener("click", async () => {
  if (!currentMatchId) return alert("試合が未選択です。");
  await openTeamAdmin(currentMatchId);
});

// ======================
// Team admin (match unit)
// ======================
async function openTeamAdmin(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  // membership check（管理者は閲覧OK、ただし“どのチームの選手管理か”が必要になる）
  const mem = await loadMyMembership(matchId, user);
  if (!mem) {
    if (isAdmin) return alert("管理者はこの画面で編集できません（代表者として招待されている必要があります）。");
    return alert("この試合の参加権限がありません。");
  }

  const m = await loadMatch(matchId);
  if (!m) return alert("試合が見つかりません。");

  currentMatchId = matchId;
  currentMatch = m;
  currentTournamentId = m.tournamentId || null;
  myUid = user.uid;

  showTeamAdminScreen();
  hideLoginUI();

  const title = (m.title || "Untitled Match").trim();
  const tour = currentTournamentId ? currentTournamentId : "（未設定）";
  if (teamAdminContextEl) teamAdminContextEl.textContent = `対象試合：${title} / tournamentId: ${tour}`;

  if (backToMatchesFromAdminBtn) backToMatchesFromAdminBtn.onclick = () => goBackToMatches();
  if (goToScoreFromAdminBtn) goToScoreFromAdminBtn.onclick = () => enterMatch(matchId);

  // ---- 大会マスタ：購読
  if (currentTournamentId) {
    unsubTournamentPlayers = onSnapshot(
      query(tournamentTeamPlayersCol(currentTournamentId, user.uid), orderBy("number", "asc")),
      (snap) => {
        const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderPlayersListForAdmin({
          listEl: tournamentPlayersListEl,
          players,
          onEdit: async (pid, p) => {
            const number = prompt("背番号:", p.number || "");
            if (number == null) return;
            const name = prompt("名前:", p.name || "");
            if (name == null) return;

            await updateDoc(tournamentTeamPlayerRef(currentTournamentId, user.uid, pid), {
              number: number.trim(),
              name: name.trim(),
              updatedAt: serverTimestamp(),
            });
          },
          onDelete: async (pid) => {
            if (!confirm("削除しますか？")) return;
            await deleteDoc(tournamentTeamPlayerRef(currentTournamentId, user.uid, pid));
          },
        });
      },
      (err) => {
        alert(`大会マスタ読み込み失敗\n${err.code}\n${err.message}`);
        console.error(err);
      }
    );
  } else {
    if (tournamentPlayersListEl) tournamentPlayersListEl.innerHTML = "<li>この試合には tournamentId が未設定です。</li>";
  }

  // ---- 試合選手：購読
  unsubMatchPlayers = onSnapshot(
    query(matchPlayersCol(matchId, user.uid), orderBy("number", "asc")),
    (snap) => {
      const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderPlayersListForAdmin({
        listEl: matchPlayersListEl,
        players,
        onEdit: async (pid, p) => {
          const number = prompt("背番号:", p.number || "");
          if (number == null) return;
          const name = prompt("名前:", p.name || "");
          if (name == null) return;

          await updateDoc(matchPlayerRef(matchId, user.uid, pid), {
            number: number.trim(),
            name: name.trim(),
            updatedAt: serverTimestamp(),
          });
        },
        onDelete: async (pid) => {
          if (!confirm("削除しますか？")) return;
          await deleteDoc(matchPlayerRef(matchId, user.uid, pid));
        },
      });
    },
    (err) => {
      alert(`試合選手読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );

  // ---- 大会マスタ：個別追加
  if (addTournamentPlayerBtn) {
    addTournamentPlayerBtn.onclick = async () => {
      if (!currentTournamentId) return alert("tournamentId が未設定です。");
      const number = (tournamentPlayerNumberEl?.value || "").trim();
      const name = (tournamentPlayerNameEl?.value || "").trim();
      if (!number || !name) return alert("背番号と名前を入力してください。");
      await addDoc(tournamentTeamPlayersCol(currentTournamentId, user.uid), {
        number,
        name,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (tournamentPlayerNumberEl) tournamentPlayerNumberEl.value = "";
      if (tournamentPlayerNameEl) tournamentPlayerNameEl.value = "";
    };
  }

  // ---- 大会マスタ：一括追加
  if (bulkAddTournamentBtn) {
    bulkAddTournamentBtn.onclick = async () => {
      if (!currentTournamentId) return alert("tournamentId が未設定です。");
      const rows = parseBulkPlayers(bulkTournamentPlayersEl?.value || "");
      if (rows.length === 0) return alert("形式が不正です。例：12,山田太郎");
      for (const r of rows) {
        await addDoc(tournamentTeamPlayersCol(currentTournamentId, user.uid), {
          number: r.number,
          name: r.name,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      if (bulkTournamentPlayersEl) bulkTournamentPlayersEl.value = "";
    };
  }

  // ---- 試合選手：個別追加
  if (addMatchPlayerBtn) {
    addMatchPlayerBtn.onclick = async () => {
      const number = (matchPlayerNumberEl?.value || "").trim();
      const name = (matchPlayerNameEl?.value || "").trim();
      if (!number || !name) return alert("背番号と名前を入力してください。");
      await addDoc(matchPlayersCol(matchId, user.uid), {
        number,
        name,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (matchPlayerNumberEl) matchPlayerNumberEl.value = "";
      if (matchPlayerNameEl) matchPlayerNameEl.value = "";
    };
  }

  // ---- 試合選手：一括追加
  if (bulkAddMatchBtn) {
    bulkAddMatchBtn.onclick = async () => {
      const rows = parseBulkPlayers(bulkMatchPlayersEl?.value || "");
      if (rows.length === 0) return alert("形式が不正です。例：12,山田太郎");
      for (const r of rows) {
        await addDoc(matchPlayersCol(matchId, user.uid), {
          number: r.number,
          name: r.name,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      if (bulkMatchPlayersEl) bulkMatchPlayersEl.value = "";
    };
  }

  // ---- 試合選手：全削除
  if (clearMatchPlayersBtn) {
    clearMatchPlayersBtn.onclick = async () => {
      if (!confirm("この試合の選手を全削除しますか？")) return;
      await clearAllMatchPlayers(matchId, user.uid);
    };
  }

  // ---- 大会→試合コピー
  if (copyTournamentToMatchBtn) {
    copyTournamentToMatchBtn.onclick = async () => {
      if (!currentTournamentId) return alert("tournamentId が未設定です。");
      const existing = await getDocs(query(matchPlayersCol(matchId, user.uid)));
      if (!existing.empty) {
        const ok = confirm("この試合の選手が既に存在します。削除して大会情報からコピーしますか？");
        if (!ok) return;
        await clearAllMatchPlayers(matchId, user.uid);
      }
      await copyTournamentPlayersToMatch(currentTournamentId, matchId, user.uid);
      alert("大会情報をこの試合へコピーしました。");
    };
  }
}

// ======================
// Admin helpers
// ======================
function parseBulkPlayers(text) {
  const lines = String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length < 2) continue;
    rows.push({ number: parts[0], name: parts.slice(1).join(",") });
  }
  return rows;
}

function renderPlayersListForAdmin({ listEl, players, onEdit, onDelete }) {
  if (!listEl) return;

  if (players.length === 0) {
    listEl.innerHTML = "<li>まだ登録されていません。</li>";
    return;
  }

  listEl.innerHTML = players.map((p) => `
    <li class="rowline" data-player-id="${p.id}">
      <span>${escapeHtml(`${p.number || "-"} ${p.name || ""}`)}</span>
      <span class="spacer"></span>
      <button class="btn btn--ghost btn--sm" data-action="edit">編集</button>
      <button class="btn btn--ghost btn--sm" data-action="delete">削除</button>
    </li>
  `).join("");

  listEl.onclick = async (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;

    const li = e.target.closest("li");
    const pid = li?.getAttribute("data-player-id");
    if (!pid) return;

    const action = btn.getAttribute("data-action");
    const p = players.find((x) => x.id === pid);
    if (!p) return;

    try {
      if (action === "edit") await onEdit(pid, p);
      if (action === "delete") await onDelete(pid);
    } catch (err) {
      alert(`操作失敗\n${err.code || ""}\n${err.message || err}`);
      console.error(err);
    }
  };
}

async function clearAllMatchPlayers(matchId, teamId_) {
  const snap = await getDocs(query(matchPlayersCol(matchId, teamId_)));
  if (snap.empty) return;

  let batch = writeBatch(db);
  let count = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    count++;
    if (count >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
}

async function copyTournamentPlayersToMatch(tournamentId, matchId, teamId_) {
  const snap = await getDocs(query(tournamentTeamPlayersCol(tournamentId, teamId_), orderBy("number", "asc")));
  if (snap.empty) return;

  for (const d of snap.docs) {
    const p = d.data();
    await addDoc(matchPlayersCol(matchId, teamId_), {
      number: p.number || "",
      name: p.name || "",
      active: p.active !== false,
      copiedFromTournament: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// ======================
// 代表者：大会マスタ単独画面
// ======================
function renderRegistryList() {
  if (!registryPlayersListEl) return;

  const q = String(registrySearchEl?.value || "").trim().toLowerCase();
  const filtered = q
    ? registryAllPlayers.filter((p) => {
        const s = `${p.number || ""} ${p.name || ""}`.toLowerCase();
        return s.includes(q);
      })
    : registryAllPlayers;

  if (filtered.length === 0) {
    registryPlayersListEl.innerHTML = "<li>まだ登録されていません。</li>";
    return;
  }

  registryPlayersListEl.innerHTML = filtered.map((p) => `
    <li class="rowline" data-player-id="${p.id}">
      <span>${escapeHtml(`${p.number || "-"} ${p.name || ""}`)}</span>
      <span class="spacer"></span>
      <button class="btn btn--ghost btn--sm" data-action="edit">編集</button>
      <button class="btn btn--ghost btn--sm" data-action="delete">削除</button>
    </li>
  `).join("");

  registryPlayersListEl.onclick = async (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;

    const li = e.target.closest("li");
    const pid = li?.getAttribute("data-player-id");
    if (!pid) return;

    const action = btn.getAttribute("data-action");
    const p = registryAllPlayers.find((x) => x.id === pid);
    if (!p) return;

    if (!registryTournamentId || !myUid) return;

    try {
      if (action === "edit") {
        const number = prompt("背番号:", p.number || "");
        if (number == null) return;
        const name = prompt("名前:", p.name || "");
        if (name == null) return;

        await updateDoc(tournamentTeamPlayerRef(registryTournamentId, myUid, pid), {
          number: number.trim(),
          name: name.trim(),
          updatedAt: serverTimestamp(),
        });
      }

      if (action === "delete") {
        if (!confirm("削除しますか？")) return;
        await deleteDoc(tournamentTeamPlayerRef(registryTournamentId, myUid, pid));
      }
    } catch (err) {
      alert(`操作失敗\n${err.code || ""}\n${err.message || err}`);
      console.error(err);
    }
  };
}

async function loadRegistry(tournamentIdRaw) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  myUid = user.uid;

  const tid = normalizeTournamentId(tournamentIdRaw);
  if (!tid) return alert("tournamentId を入力してください。");

  cleanupRegistryRealtime();
  registryTournamentId = tid;

  if (registryContextEl) registryContextEl.textContent = `tournamentId: ${tid} / teamId(UID): ${myUid}`;

  unsubRegistryPlayers = onSnapshot(
    query(tournamentTeamPlayersCol(tid, myUid), orderBy("number", "asc")),
    (snap) => {
      registryAllPlayers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderRegistryList();
    },
    (err) => {
      alert(`大会マスタ読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );
}

registrySearchEl?.addEventListener("input", renderRegistryList);
registryClearSearchBtn?.addEventListener("click", () => {
  if (registrySearchEl) registrySearchEl.value = "";
  renderRegistryList();
});

loadRegistryBtn?.addEventListener("click", async () => {
  await loadRegistry(registryTournamentIdEl?.value || "");
});

registryAddPlayerBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!registryTournamentId) return alert("先に tournamentId を読み込んでください。");

  const number = String(registryPlayerNumberEl?.value || "").trim();
  const name = String(registryPlayerNameEl?.value || "").trim();
  if (!number || !name) return alert("背番号と選手名を入力してください。");

  try {
    await addDoc(tournamentTeamPlayersCol(registryTournamentId, user.uid), {
      number,
      name,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (registryPlayerNumberEl) registryPlayerNumberEl.value = "";
    if (registryPlayerNameEl) registryPlayerNameEl.value = "";
    registryPlayerNumberEl?.focus?.();
  } catch (e) {
    alert(`追加失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

registryPlayerNameEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") registryAddPlayerBtn?.click();
});

registryBulkAddBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!registryTournamentId) return alert("先に tournamentId を読み込んでください。");

  const rows = parseBulkPlayers(registryBulkEl?.value || "");
  if (rows.length === 0) return alert("形式が不正です。例：12,山田太郎");

  try {
    for (const r of rows) {
      await addDoc(tournamentTeamPlayersCol(registryTournamentId, user.uid), {
        number: r.number,
        name: r.name,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    if (registryBulkEl) registryBulkEl.value = "";
  } catch (e) {
    alert(`一括追加失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

// ======================
// Admin: create match (emails -> uids -> match + invites)
// ======================
async function findUidByEmailLower(emailLower) {
  const q = query(usersCol(), where("emailLower", "==", emailLower), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

createMatchBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const ok = await isGlobalAdmin(user.uid);
  if (!ok) return alert("管理者権限がありません。");

  const teamANameInput = (teamANameEl?.value || "").trim();
  const teamBNameInput = (teamBNameEl?.value || "").trim();
  const teamAEmail = normalizeEmail(teamAEmailEl?.value || "");
  const teamBEmail = normalizeEmail(teamBEmailEl?.value || "");

  if (!teamANameInput || !teamBNameInput) return alert("チーム名（A/B）を入力してください。");
  if (!teamAEmail || !teamBEmail) return alert("代表者メール（A/B）を入力してください。");
  if (teamAEmail === teamBEmail) return alert("代表者メールが同一です。別のメールを入力してください。");

  const title = `${teamANameInput} vs ${teamBNameInput}`;
  const joinCode = randomJoinCode(8);

  if (createMatchBtn) createMatchBtn.disabled = true;
  if (adminInfoEl) adminInfoEl.textContent = "作成中...";

  try {
    const uidA = await findUidByEmailLower(teamAEmail);
    if (!uidA) throw new Error(`チームAのメールが users に見つかりません（${teamAEmail}）。先に代表者が登録/UID確認を完了してください。`);
    const uidB = await findUidByEmailLower(teamBEmail);
    if (!uidB) throw new Error(`チームBのメールが users に見つかりません（${teamBEmail}）。先に代表者が登録/UID確認を完了してください。`);

    const matchDocRef = await addDoc(matchesCol(), {
      title,
      status: "scheduled",
      createdBy: user.uid,
      joinCode,
      tournamentId: "",
      // 表示用に固定（スクショ寄せ & 参照高速化）
      teamAUid: uidA,
      teamBUid: uidB,
      teamAName: teamANameInput,
      teamBName: teamBNameInput,
      createdAt: serverTimestamp(),
    });

    await setDoc(membershipRef(matchDocRef.id, user.uid), {
      role: "admin",
      createdAt: serverTimestamp(),
    });

    await addDoc(invitesCol(), {
      teamUid: uidA,
      matchId: matchDocRef.id,
      teamName: teamANameInput,
      role: "team",
      createdAt: serverTimestamp(),
      usedAt: null,
    });
    await addDoc(invitesCol(), {
      teamUid: uidB,
      matchId: matchDocRef.id,
      teamName: teamBNameInput,
      role: "team",
      createdAt: serverTimestamp(),
      usedAt: null,
    });

    const msg = `作成完了：${title}
matchId=${matchDocRef.id}
joinCode=${joinCode}
招待：${teamAEmail}, ${teamBEmail}`;
    if (adminInfoEl) adminInfoEl.textContent = msg;
    alert(`試合作成OK\n${title}\n※チーム側はログイン後に試合一覧へ反映されます。`);

    // 管理者の一覧を更新
    if (isAdmin) await renderMatchesForUser(user);
  } catch (e) {
    const msg = e?.message || `${e}`;
    alert(`試合作成失敗\n${msg}`);
    console.error(e);
    if (adminInfoEl) adminInfoEl.textContent = `失敗：${msg}`;
  } finally {
    if (createMatchBtn) createMatchBtn.disabled = false;
  }
});

// ======================
// UID確認（users/{uid} を作る）
// ======================
let uidVerifyBound = false;

function showOnlyUidVerify(user) {
  hideAllMainSections();
  hideLoginUI();
  uidVerifySection && (uidVerifySection.style.display = "block");

  const uidToShow = user?.uid || "";
  if (uidDisplayEl) uidDisplayEl.textContent = uidToShow;

  if (uidInputEl) uidInputEl.value = "";
  if (uidHintEl) uidHintEl.style.display = "none";
  if (uidVerifyBtn) {
    uidVerifyBtn.disabled = true;
    uidVerifyBtn.classList.remove("ok-btn");
  }

  if (!uidVerifyBound) {
    uidVerifyBound = true;

    uidInputEl?.addEventListener("input", () => {
      const expected = String(auth.currentUser?.uid || "");
      const got = String(uidInputEl?.value || "").trim();

      const ok = expected.length > 0 && got.length > 0 && got === expected;

      if (uidVerifyBtn) {
        uidVerifyBtn.disabled = !ok;
        if (ok) uidVerifyBtn.classList.add("ok-btn");
        else uidVerifyBtn.classList.remove("ok-btn");
      }

      if (uidHintEl) {
        if (got.length === 0) uidHintEl.style.display = "none";
        else uidHintEl.style.display = ok ? "none" : "block";
      }
    });

    uidVerifyBtn?.addEventListener("click", async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return alert("ログイン状態を確認できません。もう一度ログインしてください。");

      const expected = String(currentUser.uid);
      const got = String(uidInputEl?.value || "").trim();
      if (got !== expected) return;

      try {
        uidVerifyBtn.disabled = true;

        const email = currentUser.email || "";
        const emailLower = normalizeEmail(email);

        await setDoc(
          userRef(currentUser.uid),
          {
            uid: currentUser.uid,
            email,
            emailLower,
            verifiedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        await showPostLoginUI(currentUser);
      } catch (e) {
        alert(`ユーザー登録（users）失敗\n${e.code || ""}\n${e.message || e}`);
        console.error(e);
        const ok = String(uidInputEl?.value || "").trim() === String(auth.currentUser?.uid || "");
        if (uidVerifyBtn) uidVerifyBtn.disabled = !ok;
      }
    });
  }
}

async function hasUserRegistry(user) {
  try {
    const snap = await getDoc(userRef(user.uid));
    return snap.exists();
  } catch (e) {
    console.error("users/{uid} read failed:", e);
    return false;
  }
}

async function showPostLoginUI(user) {
  setTopbar(user);
  hideLoginUI();

  // 管理者判定
  try {
    isAdmin = await isGlobalAdmin(user.uid);
  } catch {
    isAdmin = false;
  }

  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  // 初期は代表者ホーム
  showRepHome();
  // 管理者なら試合作成UIも見える（ホームに重ねて出さない設計：必要な時だけ matchesへ）
}

// ======================
// Navigation
// ======================
openPlayerRegistryBtn?.addEventListener("click", () => {
  cleanupMatchRealtime();
  cleanupAdminRealtime();
  showPlayerRegistryScreen();
});

openMatchesBtn?.addEventListener("click", async () => {
  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  showMatchesScreen();
  const user = auth.currentUser;
  if (user) await renderMatchesForUser(user);
});

backToHomeBtn?.addEventListener("click", () => {
  cleanupRegistryRealtime();
  showRepHome();
});

goToMatchesBtn?.addEventListener("click", async () => {
  cleanupRegistryRealtime();
  showMatchesScreen();
  const user = auth.currentUser;
  if (user) await renderMatchesForUser(user);
});

// ======================
// Buttons (bind once)
// ======================
startTimerBtn?.addEventListener("click", timerStart);
stopTimerBtn?.addEventListener("click", timerStop);
resetTimerBtn?.addEventListener("click", timerReset);

recordGoalBtn?.addEventListener("click", () => recordEvent("goal"));
recordCallahanBtn?.addEventListener("click", () => recordEvent("callahan"));

// ======================
// Auth UI
// ======================
signupBtn?.addEventListener("click", async () => {
  const email = normalizeEmail(emailEl?.value || "");
  const password = passEl?.value || "";
  if (!email || !password) return alert("メールとパスワードを入力してください。");

  try {
    if (emailEl) emailEl.value = email;
    await createUserWithEmailAndPassword(auth, email, password);
    alert("新規登録成功");
  } catch (e) {
    alert(`新規登録失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

loginBtn?.addEventListener("click", async () => {
  const email = normalizeEmail(emailEl?.value || "");
  const password = passEl?.value || "";
  if (!email || !password) return alert("メールとパスワードを入力してください。");

  try {
    if (emailEl) emailEl.value = email;
    await signInWithEmailAndPassword(auth, email, password);
    alert("ログイン成功");
  } catch (e) {
    alert(`ログイン失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    cleanupMatchRealtime();
    cleanupAdminRealtime();
    cleanupRegistryRealtime();

    currentMatchId = null;
    currentMatch = null;
    currentTournamentId = null;
    currentMembership = null;

    myUid = null;
    teamAUid = null;
    teamBUid = null;
    teamAName = "Team A";
    teamBName = "Team B";

    sharedTimer = { running: false, baseMs: 0, startAtMs: null };

    await signOut(auth);
  } catch (e) {
    alert(`ログアウト失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

// ======================
// Back buttons
// ======================
backToMatchesBtn?.addEventListener("click", goBackToMatches);
backToMatchesFromAdminBtn?.addEventListener("click", goBackToMatches);

// ======================
// Auth state
// ======================
onAuthStateChanged(auth, async (user) => {
  setTopbar(user);

  if (!user) {
    isAdmin = false;
    if (loginStatusEl) loginStatusEl.textContent = "";
    showLoginUI();
    setTopbar(null);
    return;
  }

  // ログイン中：login card は隠す（UID確認 or post login UIへ）
  if (loginStatusEl) loginStatusEl.textContent = `ログイン中: ${user.email || ""}`;

  const okRegistry = await hasUserRegistry(user);
  if (!okRegistry) {
    showOnlyUidVerify(user);
    return;
  }

  await showPostLoginUI(user);
});
