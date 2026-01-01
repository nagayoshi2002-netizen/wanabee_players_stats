// app.js（全文置換：重複解消 + タイマー/得点常時表示 + 全ログインユーザー閲覧 + チーム名表示 + ブロック削除 + スクショ寄せ）
// ※「コード内での大会ID小文字化」や「大会一覧プルダウン」は今回スコープ外（前段実装を維持）
// ※ callahan/goal は両方 1点（アルティメット仕様）: 集計もそのまま1点扱い

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
// DOM（ログイン）
// ======================
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusEl = document.getElementById("login-status");

// UID確認
const uidVerifySection = document.getElementById("uid-verify-section");
const uidDisplayEl = document.getElementById("uid-display");
const uidInputEl = document.getElementById("uid-input");
const uidHintEl = document.getElementById("uid-hint");
const uidVerifyBtn = document.getElementById("uid-verify-btn");

// 代表者ホーム
const repHomeSection = document.getElementById("rep-home-section");
const openPlayerRegistryBtn = document.getElementById("open-player-registry-btn");
const openMatchesBtn = document.getElementById("open-matches-btn");

// 代表者：大会マスタ選手登録
const playerRegistrySection = document.getElementById("player-registry-section");
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

// セクション
const adminSection = document.getElementById("admin-section");
const matchesSection = document.getElementById("matches-section");
const teamAdminSection = document.getElementById("team-admin-section");
const scoreSection = document.getElementById("score-section");

// 管理者：試合作成
const teamANameEl = document.getElementById("team-a-name");
const teamBNameEl = document.getElementById("team-b-name");
const teamAEmailEl = document.getElementById("team-a-email");
const teamBEmailEl = document.getElementById("team-b-email");
const createMatchBtn = document.getElementById("create-match-btn");
const adminInfoEl = document.getElementById("admin-info");

// 試合一覧
const matchesList = document.getElementById("matches-list");
const adminMatchesList = document.getElementById("admin-matches-list");

// チーム管理者（試合単位）
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

// 試合入力
const backToMatchesBtn = document.getElementById("back-to-matches-btn");
const openTeamAdminBtn = document.getElementById("open-team-admin-btn");

const playerSelectEl = document.getElementById("player-select");
const startTimerBtn = document.getElementById("start-timer-btn");
const resetTimerBtn = document.getElementById("reset-timer-btn");
const timerEl = document.getElementById("timer");

const recordGoalBtn = document.getElementById("record-score-btn");
const recordCallahanBtn = document.getElementById("record-callahan-btn");

const scoreLeftEl = document.getElementById("score-left");
const scoreRightEl = document.getElementById("score-right");
const teamLeftNameEl = document.getElementById("team-left-name");
const teamRightNameEl = document.getElementById("team-right-name");

const eventsLeftTitleEl = document.getElementById("events-left-title");
const eventsRightTitleEl = document.getElementById("events-right-title");
const eventsLeftEl = document.getElementById("events-left");
const eventsRightEl = document.getElementById("events-right");

// ======================
// State
// ======================
let currentMatchId = null;
let currentMatch = null;
let currentTournamentId = null;

let viewerUid = null;            // 今ログイン中のUID
let viewerIsAdmin = false;       // グローバル管理者か
let viewerIsParticipant = false; // その試合の参加者か（自チームとして入力できるか）
let myTeamId = null;             // 入力時の teamId（参加者の場合は viewerUid）

// match context caches
let teamNameByUid = {};          // { uid: teamName }
let teamIdsInMatch = [];         // [uidA, uidB, ...]
let playerCacheByTeam = new Map(); // teamId -> Map(playerId -> {number,name})

// Timer
let timerBaseMs = 0;
let timerStartAt = null;
let timerIntervalId = null;

// assist select / stop button
let assistSelectEl = null;
let stopTimerBtn = null;

// scoring state
let scoreByTeam = {};
let teamLeftId = null;
let teamRightId = null;

// realtime unsub
let unsubEvents = null;
let unsubScoreAgg = null;
let unsubPlayersForSelect = null;
let unsubTeamPlayers = []; // multiple teams
let unsubRegistryPlayers = null;
let unsubAdminMatches = null;

// UID verify bound
let uidVerifyBound = false;

// Registry state
let registryTournamentId = null;
let registryAllPlayers = [];

// ======================
// utils
// ======================
function randomJoinCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function pad2(n) { return String(n).padStart(2, "0"); }
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
async function isGlobalAdmin(uid) {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}
function currentTimerMs() {
  if (timerStartAt == null) return timerBaseMs;
  return timerBaseMs + (Date.now() - timerStartAt);
}
function setTimerText() {
  if (!timerEl) return;
  timerEl.textContent = msToMMSS(currentTimerMs());
}

// ======================
// refs
// ======================
function usersCol() { return collection(db, "users"); }
function userRef(uid) { return doc(db, "users", uid); }

function matchesCol() { return collection(db, "matches"); }
function matchRef(matchId) { return doc(db, "matches", matchId); }

function invitesCol() { return collection(db, "invites"); }

function membershipRef(matchId, uid) {
  return doc(db, "matches", matchId, "memberships", uid);
}
function membershipsCol(matchId) {
  return collection(db, "matches", matchId, "memberships");
}

function matchPlayersCol(matchId, teamId) {
  return collection(db, "matches", matchId, "teams", teamId, "players");
}
function matchPlayerRef(matchId, teamId, playerId) {
  return doc(db, "matches", matchId, "teams", teamId, "players", playerId);
}

function eventsCol(matchId) { return collection(db, "matches", matchId, "events"); }
function eventRef(matchId, eventId) { return doc(db, "matches", matchId, "events", eventId); }

function joinCodeRef(codeUpper) { return doc(db, "joinCodes", codeUpper); }

// tournaments
function tournamentTeamPlayersCol(tournamentId, teamId) {
  return collection(db, "tournaments", tournamentId, "teams", teamId, "players");
}
function tournamentTeamPlayerRef(tournamentId, teamId, playerId) {
  return doc(db, "tournaments", tournamentId, "teams", teamId, "players", playerId);
}

// ======================
// section control
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
function showRepHome() {
  hideAllMainSections();
  repHomeSection && (repHomeSection.style.display = "block");
}
function showMatchesScreen() {
  hideAllMainSections();
  matchesSection && (matchesSection.style.display = "block");
}
function showPlayerRegistryScreen() {
  hideAllMainSections();
  playerRegistrySection && (playerRegistrySection.style.display = "block");
}
function showScoreScreen() {
  hideAllMainSections();
  scoreSection && (scoreSection.style.display = "block");
}
function showTeamAdminScreen() {
  hideAllMainSections();
  teamAdminSection && (teamAdminSection.style.display = "block");
}

// ======================
// cleanup
// ======================
function cleanupMatchRealtime() {
  unsubEvents?.(); unsubEvents = null;
  unsubScoreAgg?.(); unsubScoreAgg = null;
  unsubPlayersForSelect?.(); unsubPlayersForSelect = null;

  for (const fn of unsubTeamPlayers) {
    try { fn?.(); } catch {}
  }
  unsubTeamPlayers = [];

  playerCacheByTeam = new Map();
  teamNameByUid = {};
  teamIdsInMatch = [];
}
function cleanupAdminRealtime() {
  // (team admin screen uses snapshots inside openTeamAdmin; stored in locals there via onSnapshot returns)
  // We keep them contained by re-entering openTeamAdmin; here no-op.
}
function cleanupRegistryRealtime() {
  unsubRegistryPlayers?.(); unsubRegistryPlayers = null;
  registryAllPlayers = [];
  registryTournamentId = null;
}
function cleanupAdminMatchesRealtime() {
  unsubAdminMatches?.(); unsubAdminMatches = null;
}

// ======================
// Timer
// ======================
function startTimer() {
  if (timerIntervalId) return;
  if (timerStartAt == null) timerStartAt = Date.now();
  timerIntervalId = window.setInterval(setTimerText, 250);
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
// UI bootstrap (stop + assist)
// ======================
function ensureScoreInputUIOnce() {
  // stop btn
  if (startTimerBtn && !stopTimerBtn) {
    stopTimerBtn = document.createElement("button");
    stopTimerBtn.id = "stop-timer-btn";
    stopTimerBtn.textContent = "一時停止";
    stopTimerBtn.className = "ghost";
    startTimerBtn.parentElement?.appendChild(stopTimerBtn);
    stopTimerBtn.addEventListener("click", stopTimer);
  }

  // assist select
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

  // timer buttons (bind once)
  // 既に addEventListener 済みでも増えないように、onclick を使って上書きする
  if (startTimerBtn) startTimerBtn.onclick = startTimer;
  if (resetTimerBtn) resetTimerBtn.onclick = resetTimer;

  // record buttons (block削除：goal/callahanのみ)
  if (recordGoalBtn) recordGoalBtn.onclick = () => recordEvent("goal");
  if (recordCallahanBtn) recordCallahanBtn.onclick = () => recordEvent("callahan");
}

// ======================
// Invites / matches list
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

function formatMatchLabel(matchData, invite) {
  const title = (matchData?.title || "").trim();
  if (title) return title;
  const myTeam = (invite?.teamName || "").trim() || "Team";
  return `${myTeam} vs （未設定）`;
}

async function renderMatchesFromInvites(user) {
  if (!matchesList) return;
  matchesList.innerHTML = "";

  let invites = [];
  try {
    invites = await fetchInvitesForUid(user.uid);
  } catch (e) {
    matchesList.innerHTML = "<li>招待の取得に失敗しました（権限/ルール確認）</li>";
    console.error(e);
    return;
  }

  if (invites.length === 0) {
    matchesList.innerHTML = "<li>招待された試合がありません。</li>";
    return;
  }

  // 招待→membership 化（参加チームとして入力できるように）
  try {
    for (const inv of invites) await ensureMembershipFromInvite(inv, user);
  } catch (e) {
    console.error(e);
  }

  for (const inv of invites) {
    try {
      const ms = await getDoc(matchRef(inv.matchId));
      if (!ms.exists()) continue;
      const m = ms.data();

      const li = document.createElement("li");
      li.innerHTML = `
        <span style="cursor:pointer;">${escapeHtml(formatMatchLabel(m, inv))}</span>
        <button class="ghost" data-action="manage" style="margin-left:8px;">選手管理</button>
        <button data-action="enter" style="margin-left:8px;">試合入力</button>
      `;

      li.querySelector('[data-action="manage"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        openTeamAdmin(inv.matchId);
      });
      li.querySelector('[data-action="enter"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        enterMatch(inv.matchId);
      });
      li.querySelector("span")?.addEventListener("click", () => enterMatch(inv.matchId));

      matchesList.appendChild(li);
    } catch (e) {
      console.error("match read failed:", inv.matchId, e);
    }
  }
}

// ======================
// Admin: all matches list (参照だけ)
// ======================
function renderAdminMatches(items) {
  if (!adminMatchesList) return;
  adminMatchesList.innerHTML = "";

  if (!viewerIsAdmin) {
    adminMatchesList.innerHTML = "<li>（管理者のみ表示）</li>";
    return;
  }

  if (items.length === 0) {
    adminMatchesList.innerHTML = "<li>試合がありません。</li>";
    return;
  }

  for (const m of items) {
    const li = document.createElement("li");
    const title = (m.title || "Untitled Match").trim();
    const createdAt = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : "";
    li.innerHTML = `
      <span style="cursor:pointer;">${escapeHtml(title)}</span>
      <span class="hint" style="margin-left:8px;">${escapeHtml(createdAt)}</span>
      <button data-action="enter" style="margin-left:8px;">参照</button>
    `;
    li.querySelector("span")?.addEventListener("click", () => enterMatch(m.id));
    li.querySelector('[data-action="enter"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      enterMatch(m.id);
    });
    adminMatchesList.appendChild(li);
  }
}

function subscribeAdminAllMatches() {
  cleanupAdminMatchesRealtime();
  if (!viewerIsAdmin) {
    renderAdminMatches([]);
    return;
  }

  // 直近50件（必要なら増やす）
  unsubAdminMatches = onSnapshot(
    query(matchesCol(), orderBy("createdAt", "desc"), limit(50)),
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderAdminMatches(items);
    },
    (err) => {
      console.error("admin matches subscribe failed:", err);
      renderAdminMatches([]);
    }
  );
}

// ======================
// load match / membership / memberships map
// ======================
async function loadMatch(matchId) {
  const snap = await getDoc(matchRef(matchId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function detectParticipant(matchId, userUid) {
  try {
    const snap = await getDoc(membershipRef(matchId, userUid));
    return snap.exists();
  } catch {
    return false;
  }
}

async function loadMembershipsMap(matchId) {
  // 全ログインユーザーが参照する想定（ルール側で read を許容する前提）
  const map = {};
  const ids = [];

  try {
    const snap = await getDocs(query(membershipsCol(matchId)));
    for (const d of snap.docs) {
      const uid = d.id;
      const data = d.data() || {};
      // teamName は team ロールが持つ（adminは空でもOK）
      if (data.role === "team" && typeof data.teamName === "string" && data.teamName.trim()) {
        map[uid] = data.teamName.trim();
        ids.push(uid);
      }
    }
  } catch (e) {
    console.error("loadMembershipsMap failed:", e);
  }

  // フォールバック：events から teamId を拾う（チーム名が取れない場合がある）
  return { map, ids };
}

function ensureTeamOrder() {
  // 左右のチームを確定（基本：teamIdsInMatch の順）
  const ids = teamIdsInMatch.slice(0, 2);
  teamLeftId = ids[0] || null;
  teamRightId = ids[1] || null;

  const leftName = teamLeftId ? (teamNameByUid[teamLeftId] || teamLeftId) : "Team A";
  const rightName = teamRightId ? (teamNameByUid[teamRightId] || teamRightId) : "Team B";

  if (teamLeftNameEl) teamLeftNameEl.textContent = leftName;
  if (teamRightNameEl) teamRightNameEl.textContent = rightName;
  if (eventsLeftTitleEl) eventsLeftTitleEl.textContent = leftName;
  if (eventsRightTitleEl) eventsRightTitleEl.textContent = rightName;
}

// ======================
// Players cache (両チーム分を購読して、ログ表示の名前を常に最新にする)
// ======================
function subscribeTeamPlayersForMatch(matchId, teamIds) {
  // clear existing
  for (const fn of unsubTeamPlayers) { try { fn?.(); } catch {} }
  unsubTeamPlayers = [];
  playerCacheByTeam = new Map();

  for (const tid of teamIds) {
    const unsub = onSnapshot(
      query(matchPlayersCol(matchId, tid), orderBy("number", "asc")),
      (snap) => {
        const mp = new Map();
        for (const d of snap.docs) {
          const p = d.data() || {};
          mp.set(d.id, { number: String(p.number || ""), name: String(p.name || "") });
        }
        playerCacheByTeam.set(tid, mp);

        // 自分のチーム参加者なら入力selectも自動更新（自チームのみ）
        if (myTeamId && tid === myTeamId) {
          const players = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
          rebuildPlayerSelects(players);
        }
      },
      (err) => {
        console.error("subscribeTeamPlayers failed:", tid, err);
      }
    );
    unsubTeamPlayers.push(unsub);
  }
}

function getPlayerLabel(teamId, playerId) {
  const mp = playerCacheByTeam.get(teamId);
  const p = mp?.get(playerId);
  if (!p) return playerId || "";
  const label = `${p.number || "-"} ${p.name || ""}`.trim();
  return label || playerId || "";
}

function rebuildPlayerSelects(players) {
  if (playerSelectEl) {
    playerSelectEl.innerHTML = "";
    const o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = "選手を選択";
    playerSelectEl.appendChild(o0);
  }
  if (assistSelectEl) {
    assistSelectEl.innerHTML = "";
    const o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = "アシスト（任意）";
    assistSelectEl.appendChild(o0);
  }

  for (const p of players) {
    const label = `${p.number || "-"} ${p.name || ""}`.trim() || p.id;
    if (playerSelectEl) {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = label;
      playerSelectEl.appendChild(o);
    }
    if (assistSelectEl) {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = label;
      assistSelectEl.appendChild(o);
    }
  }
}

// ======================
// Enter match (全員が同じ表示で閲覧 / 参加チームは入力可能)
// ======================
async function enterMatch(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  cleanupMatchRealtime();
  cleanupRegistryRealtime();

  currentMatchId = matchId;
  viewerUid = user.uid;

  // match
  const m = await loadMatch(matchId);
  if (!m) return alert("試合が見つかりません。");
  currentMatch = m;
  currentTournamentId = m.tournamentId || null;

  // viewer role
  viewerIsAdmin = await isGlobalAdmin(user.uid);
  viewerIsParticipant = await detectParticipant(matchId, user.uid);
  myTeamId = viewerIsParticipant ? user.uid : null;

  // UI
  showScoreScreen();
  ensureScoreInputUIOnce();
  resetTimer();
  scoreByTeam = {};
  if (scoreLeftEl) scoreLeftEl.textContent = "0";
  if (scoreRightEl) scoreRightEl.textContent = "0";

  // 入力UIの可否（参加者のみ入力できる）
  const canWrite = viewerIsParticipant; // 管理者でも入力させたいなら viewerIsAdmin || viewerIsParticipant にする
  if (playerSelectEl) playerSelectEl.disabled = !canWrite;
  if (assistSelectEl) assistSelectEl.disabled = !canWrite;
  if (recordGoalBtn) recordGoalBtn.disabled = !canWrite;
  if (recordCallahanBtn) recordCallahanBtn.disabled = !canWrite;

  // 試合名やチーム名マップ
  const { map, ids } = await loadMembershipsMap(matchId);
  teamNameByUid = map;
  teamIdsInMatch = ids;

  // 左右のチームを確定（招待/参加が2チーム想定）
  // 万一 memberships が読めない場合は、events 集計でチームIDを拾いながら補完する
  ensureTeamOrder();

  // 両チームの players を購読（ログ表示が後から変わってOKの要件に対応）
  // （membershipsから拾えない場合は、まず自分のチームだけ購読）
  const teamIdsForPlayers = teamIdsInMatch.length > 0 ? teamIdsInMatch.slice(0, 2) : (myTeamId ? [myTeamId] : []);
  if (teamIdsForPlayers.length > 0) subscribeTeamPlayersForMatch(matchId, teamIdsForPlayers);

  // events / score
  subscribeEvents(matchId);
  subscribeScoreAggregate(matchId);

  // navigation
  if (backToMatchesBtn) backToMatchesBtn.onclick = () => goBackToMatches();
  if (openTeamAdminBtn) {
    openTeamAdminBtn.disabled = !viewerIsParticipant; // 選手管理は参加者のみ
    openTeamAdminBtn.onclick = async () => {
      if (!viewerIsParticipant) return alert("この試合の参加者のみ選手管理ができます。");
      await openTeamAdmin(matchId);
    };
  }
}

async function goBackToMatches() {
  cleanupMatchRealtime();
  cleanupRegistryRealtime();

  currentMatchId = null;
  currentMatch = null;
  currentTournamentId = null;
  myTeamId = null;

  showMatchesScreen();

  const user = auth.currentUser;
  if (user) {
    viewerIsAdmin = await isGlobalAdmin(user.uid);
    await renderMatchesFromInvites(user);
    subscribeAdminAllMatches();
    adminSection && (adminSection.style.display = viewerIsAdmin ? "block" : "none");
  }
}

// ======================
// Events create (goal/callahan + assist)
// ======================
async function recordEvent(type) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!currentMatchId) return alert("試合を選択してください。");

  // 参加者のみ
  if (!viewerIsParticipant) return;

  const scorerId = playerSelectEl?.value || "";
  if (!scorerId) return alert("選手を選択してください。");

  const assistId = assistSelectEl?.value || "";
  const timeMs = currentTimerMs();

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

function typeLabel(type) {
  if (type === "goal") return "得点";
  if (type === "callahan") return "キャナハン";
  return type;
}

// ======================
// Events subscribe + render (重複表示防止：イベントハンドラは1回だけ)
// ======================
let eventsClickBound = false;
let lastRenderedEventIds = "";

function bindEventsClickOnce() {
  if (eventsClickBound) return;
  eventsClickBound = true;

  // 左右どちらも同じクリック処理
  const handler = async (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;

    const wrap = e.target.closest("[data-event-id]");
    const id = wrap?.getAttribute("data-event-id");
    if (!id || !currentMatchId) return;

    const action = btn.getAttribute("data-action");
    const ref = eventRef(currentMatchId, id);

    // 編集/削除は「作成者本人 or 管理者」のみ（ルール次第）
    // ここでは UI 側でもガード
    // （編集で type を goal/callahan に限定。block は扱わない）
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const ev0 = snap.data() || {};
      const canEdit = viewerIsAdmin || (String(ev0.createdBy || "") === String(viewerUid || ""));
      if (!canEdit) return alert("この操作は許可されていません。");

      if (action === "delete") {
        if (!confirm("この記録を削除しますか？")) return;
        await deleteDoc(ref);
        return;
      }

      if (action === "edit") {
        const newType = prompt("種別（goal / callahan）:", ev0.type || "goal");
        if (newType === null) return;
        const nt = newType.trim();
        if (nt !== "goal" && nt !== "callahan") return alert("種別は goal / callahan のみです。");

        const newTime = prompt("時間（mm:ss）:", msToMMSS(ev0.timeMs || 0));
        if (newTime === null) return;
        const mmss = parseMMSS(newTime);
        if (mmss == null) return alert("時間は mm:ss 形式で入力してください（例：02:15）。");

        const payload = {
          type: nt,
          timeMs: mmss,
          updatedAt: serverTimestamp(),
        };
        if (payload.type !== "goal") payload.assistPlayerId = "";

        await updateDoc(ref, payload);
      }
    } catch (err) {
      alert(`操作失敗\n${err.code || ""}\n${err.message || err}`);
      console.error(err);
    }
  };

  eventsLeftEl?.addEventListener("click", handler);
  eventsRightEl?.addEventListener("click", handler);
}

function subscribeEvents(matchId) {
  unsubEvents?.(); unsubEvents = null;

  bindEventsClickOnce();

  unsubEvents = onSnapshot(
    query(eventsCol(matchId), orderBy("timeMs", "desc")),
    (snap) => {
      const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ここで「同じ内容を連続で再描画」しても重複しないように、完全再描画 + ハッシュで抑制
      const idsKey = events.map((e) => e.id).join("|");
      if (idsKey === lastRenderedEventIds) return;
      lastRenderedEventIds = idsKey;

      renderEvents(events);
    },
    (err) => {
      alert(`events 読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );
}

function renderEvents(events) {
  if (!eventsLeftEl || !eventsRightEl) return;

  // block を見せない（過去データがあっても非表示）
  const filtered = events.filter((ev) => ev.type === "goal" || ev.type === "callahan");

  // チーム分離（スクショ方針：左右に分けて表示）
  const left = teamLeftId ? filtered.filter((ev) => ev.teamId === teamLeftId) : [];
  const right = teamRightId ? filtered.filter((ev) => ev.teamId === teamRightId) : [];

  // memberships map が空の時は、events から teamId を拾って左右を補完
  if ((!teamLeftId || !teamRightId) && filtered.length > 0) {
    const uniq = Array.from(new Set(filtered.map((e) => e.teamId).filter(Boolean)));
    if (uniq.length >= 1 && !teamLeftId) teamLeftId = uniq[0];
    if (uniq.length >= 2 && !teamRightId) teamRightId = uniq[1];
    if (teamLeftId || teamRightId) ensureTeamOrder();

    // players購読も補完（最大2チーム）
    const ids = [teamLeftId, teamRightId].filter(Boolean);
    if (ids.length > 0) subscribeTeamPlayersForMatch(currentMatchId, ids);
  }

  const makeRow = (ev) => {
    const t = msToMMSS(ev.timeMs || 0);
    const teamName = teamNameByUid[ev.teamId] || ev.teamId || "Team";

    const scorerLabel = getPlayerLabel(ev.teamId, ev.scorerPlayerId || "");
    const assistLabel = ev.assistPlayerId ? getPlayerLabel(ev.teamId, ev.assistPlayerId) : "";
    const assistText = (ev.type === "goal" && assistLabel) ? `\n（アシスト: ${assistLabel}）` : "";

    // 表示フォーマット: 種別 時間 #背番号 名前（チーム名）
    // 例: 得点 00:20 11 よしなが（Tokyo C）
    const text = `${typeLabel(ev.type)} ${t} ${scorerLabel}（${teamName}）${assistText}`;

    // 編集/削除は全員に表示するが、クリック時に権限チェックする
    const div = document.createElement("div");
    div.className = "event-item";
    div.setAttribute("data-event-id", ev.id);

    div.innerHTML = `
      <div class="event-text">${escapeHtml(text)}</div>
      <div class="event-actions">
        <button class="ghost" data-action="edit">編集</button>
        <button class="ghost" data-action="delete">削除</button>
      </div>
    `;
    return div;
  };

  // 再描画（重複しない）
  eventsLeftEl.innerHTML = "";
  eventsRightEl.innerHTML = "";

  for (const ev of left) eventsLeftEl.appendChild(makeRow(ev));
  for (const ev of right) eventsRightEl.appendChild(makeRow(ev));
}

// ======================
// Score aggregate（goal + callahan を得点として計上）
// ======================
function setScoreUI() {
  const leftScore = teamLeftId ? (scoreByTeam[teamLeftId] || 0) : 0;
  const rightScore = teamRightId ? (scoreByTeam[teamRightId] || 0) : 0;

  if (scoreLeftEl) scoreLeftEl.textContent = String(leftScore);
  if (scoreRightEl) scoreRightEl.textContent = String(rightScore);
}

function subscribeScoreAggregate(matchId) {
  unsubScoreAgg?.(); unsubScoreAgg = null;

  unsubScoreAgg = onSnapshot(
    query(eventsCol(matchId), orderBy("createdAt", "asc")),
    (snap) => {
      const by = {};
      const teamIdsSeen = new Set();

      for (const d of snap.docs) {
        const ev = d.data() || {};
        const tId = ev.teamId || "";
        if (!tId) continue;

        if (ev.type === "goal" || ev.type === "callahan") {
          by[tId] = (by[tId] || 0) + 1;
          teamIdsSeen.add(tId);
        }
      }

      scoreByTeam = by;

      // team ids fallback
      if ((!teamLeftId || !teamRightId) && teamIdsSeen.size > 0) {
        const uniq = Array.from(teamIdsSeen);
        if (!teamLeftId) teamLeftId = uniq[0];
        if (!teamRightId && uniq.length > 1) teamRightId = uniq[1];
        ensureTeamOrder();
      }

      setScoreUI();
    },
    (err) => {
      console.error("score aggregate failed:", err);
    }
  );
}

// ======================
// Team admin（試合単位） ※参加者のみ
// ======================
async function openTeamAdmin(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  // 参加者のみ
  const isPart = await detectParticipant(matchId, user.uid);
  if (!isPart) return alert("この試合の参加者のみ選手管理ができます。");

  // match
  const m = await loadMatch(matchId);
  if (!m) return alert("試合が見つかりません。");

  cleanupMatchRealtime();
  cleanupRegistryRealtime();

  currentMatchId = matchId;
  currentMatch = m;
  currentTournamentId = m.tournamentId || null;
  myTeamId = user.uid;
  viewerUid = user.uid;
  viewerIsAdmin = await isGlobalAdmin(user.uid);
  viewerIsParticipant = true;

  showTeamAdminScreen();

  const title = (m.title || "Untitled Match").trim();
  const tour = currentTournamentId ? currentTournamentId : "（未設定）";
  if (teamAdminContextEl) teamAdminContextEl.textContent = `対象試合：${title} / tournamentId: ${tour}`;

  if (backToMatchesFromAdminBtn) backToMatchesFromAdminBtn.onclick = () => goBackToMatches();
  if (goToScoreFromAdminBtn) goToScoreFromAdminBtn.onclick = () => enterMatch(matchId);

  // ---- 大会マスタ：購読
  let unsubTournamentPlayers = null;
  if (currentTournamentId) {
    unsubTournamentPlayers = onSnapshot(
      query(tournamentTeamPlayersCol(currentTournamentId, myTeamId), orderBy("number", "asc")),
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

            await updateDoc(tournamentTeamPlayerRef(currentTournamentId, myTeamId, pid), {
              number: number.trim(),
              name: name.trim(),
              updatedAt: serverTimestamp(),
            });
          },
          onDelete: async (pid) => {
            if (!confirm("削除しますか？")) return;
            await deleteDoc(tournamentTeamPlayerRef(currentTournamentId, myTeamId, pid));
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
  let unsubMatchPlayers = onSnapshot(
    query(matchPlayersCol(matchId, myTeamId), orderBy("number", "asc")),
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

          await updateDoc(matchPlayerRef(matchId, myTeamId, pid), {
            number: number.trim(),
            name: name.trim(),
            updatedAt: serverTimestamp(),
          });
        },
        onDelete: async (pid) => {
          if (!confirm("削除しますか？")) return;
          await deleteDoc(matchPlayerRef(matchId, myTeamId, pid));
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
      await addDoc(tournamentTeamPlayersCol(currentTournamentId, myTeamId), {
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
        await addDoc(tournamentTeamPlayersCol(currentTournamentId, myTeamId), {
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
      await addDoc(matchPlayersCol(matchId, myTeamId), {
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
        await addDoc(matchPlayersCol(matchId, myTeamId), {
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
      await clearAllMatchPlayers(matchId, myTeamId);
    };
  }

  // ---- 大会→試合コピー
  if (copyTournamentToMatchBtn) {
    copyTournamentToMatchBtn.onclick = async () => {
      if (!currentTournamentId) return alert("tournamentId が未設定です。");
      const existing = await getDocs(query(matchPlayersCol(matchId, myTeamId)));
      if (!existing.empty) {
        const ok = confirm("この試合の選手が既に存在します。削除して大会情報からコピーしますか？");
        if (!ok) return;
        await clearAllMatchPlayers(matchId, myTeamId);
      }
      await copyTournamentPlayersToMatch(currentTournamentId, matchId, myTeamId);
      alert("大会情報をこの試合へコピーしました。");
    };
  }

  // team admin screen leaves: when leaving, clean local subs
  const prevBack = backToMatchesFromAdminBtn?.onclick;
  if (backToMatchesFromAdminBtn) {
    backToMatchesFromAdminBtn.onclick = async () => {
      try { unsubTournamentPlayers?.(); } catch {}
      try { unsubMatchPlayers?.(); } catch {}
      await prevBack?.();
    };
  }
}

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
    <li data-player-id="${p.id}">
      <span>${escapeHtml(`${p.number || "-"} ${p.name || ""}`)}</span>
      <button class="ghost" data-action="edit" style="margin-left:8px;">編集</button>
      <button class="ghost" data-action="delete" style="margin-left:8px;">削除</button>
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

async function clearAllMatchPlayers(matchId, teamId) {
  const snap = await getDocs(query(matchPlayersCol(matchId, teamId)));
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

async function copyTournamentPlayersToMatch(tournamentId, matchId, teamId) {
  const snap = await getDocs(query(tournamentTeamPlayersCol(tournamentId, teamId), orderBy("number", "asc")));
  if (snap.empty) return;

  for (const d of snap.docs) {
    const p = d.data() || {};
    await addDoc(matchPlayersCol(matchId, teamId), {
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
    <li data-player-id="${p.id}">
      <span>${escapeHtml(`${p.number || "-"} ${p.name || ""}`)}</span>
      <button class="ghost" data-action="edit" style="margin-left:8px;">編集</button>
      <button class="ghost" data-action="delete" style="margin-left:8px;">削除</button>
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

    const user = auth.currentUser;
    if (!user) return;
    if (!registryTournamentId) return;

    try {
      if (action === "edit") {
        const number = prompt("背番号:", p.number || "");
        if (number == null) return;
        const name = prompt("名前:", p.name || "");
        if (name == null) return;

        await updateDoc(tournamentTeamPlayerRef(registryTournamentId, user.uid, pid), {
          number: number.trim(),
          name: name.trim(),
          updatedAt: serverTimestamp(),
        });
      }

      if (action === "delete") {
        if (!confirm("削除しますか？")) return;
        await deleteDoc(tournamentTeamPlayerRef(registryTournamentId, user.uid, pid));
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

  const tid = String(tournamentIdRaw || "").trim();
  if (!tid) return alert("tournamentId を入力してください。");

  cleanupRegistryRealtime();
  registryTournamentId = tid;

  if (registryContextEl) registryContextEl.textContent = `tournamentId: ${tid} / teamId(UID): ${user.uid}`;

  unsubRegistryPlayers = onSnapshot(
    query(tournamentTeamPlayersCol(tid, user.uid), orderBy("number", "asc")),
    (snap) => {
      registryAllPlayers = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
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
// 管理者：試合作成（チーム名×2＋メール×2 → match + invites2件 + joinCodes）
// ======================
async function findUidByEmailLower(emailLower) {
  const q = query(usersCol(), where("emailLower", "==", emailLower));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

createMatchBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const ok = await isGlobalAdmin(user.uid);
  if (!ok) return alert("管理者権限がありません。");

  const teamAName = (teamANameEl?.value || "").trim();
  const teamBName = (teamBNameEl?.value || "").trim();
  const teamAEmail = normalizeEmail(teamAEmailEl?.value || "");
  const teamBEmail = normalizeEmail(teamBEmailEl?.value || "");

  if (!teamAName || !teamBName) return alert("チーム名（A/B）を入力してください。");
  if (!teamAEmail || !teamBEmail) return alert("代表者メール（A/B）を入力してください。");
  if (teamAEmail === teamBEmail) return alert("代表者メールが同一です。別のメールを入力してください。");

  const title = `${teamAName} vs ${teamBName}`;
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
      tournamentId: "", // 今回は既存運用維持
      createdAt: serverTimestamp(),
    });

    await setDoc(membershipRef(matchDocRef.id, user.uid), {
      role: "admin",
      createdAt: serverTimestamp(),
    });

    await setDoc(joinCodeRef(joinCode), {
      matchId: matchDocRef.id,
      createdAt: serverTimestamp(),
    });

    await addDoc(invitesCol(), {
      teamUid: uidA,
      matchId: matchDocRef.id,
      teamName: teamAName,
      role: "team",
      createdAt: serverTimestamp(),
      usedAt: null,
    });
    await addDoc(invitesCol(), {
      teamUid: uidB,
      matchId: matchDocRef.id,
      teamName: teamBName,
      role: "team",
      createdAt: serverTimestamp(),
      usedAt: null,
    });

    // 任意：管理者の目線でも membership に teamName を残したい場合は追加しても良い
    // ただし今回は teams を2件作るのは invite→membership 化で行う運用

    const msg = `作成完了：${title}\nmatchId=${matchDocRef.id}\njoinCode=${joinCode}\n招待：${teamAEmail}, ${teamBEmail}`;
    if (adminInfoEl) adminInfoEl.textContent = msg;

    alert(`試合作成OK\n${title}\njoinCode: ${joinCode}\n※チーム側はログイン後、試合一覧に反映されます。`);

    // admin list refresh
    subscribeAdminAllMatches();
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
function showOnlyUidVerify(user) {
  hideAllMainSections();
  uidVerifySection && (uidVerifySection.style.display = "block");

  const current = auth.currentUser;
  const uidToShow = current?.uid || user?.uid || "";
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
        alert(`ユーザー登録（users）失敗\n${e.code || ""}\n${e.message || e}\n\n通信環境・Firestoreルールをご確認ください。`);
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
  ensureScoreInputUIOnce();
  setTimerText();

  viewerUid = user.uid;
  viewerIsAdmin = await isGlobalAdmin(user.uid);

  if (statusEl) statusEl.textContent = `ログイン中: ${user.email || ""}`;
  if (logoutBtn) logoutBtn.style.display = "inline-block";
  if (signupBtn) signupBtn.style.display = "none";

  adminSection && (adminSection.style.display = viewerIsAdmin ? "block" : "none");

  // 初期：代表者ホーム
  cleanupMatchRealtime();
  cleanupRegistryRealtime();

  showRepHome();
}

// ======================
// 代表者ホーム導線
// ======================
openPlayerRegistryBtn?.addEventListener("click", () => {
  cleanupMatchRealtime();
  showPlayerRegistryScreen();
});
openMatchesBtn?.addEventListener("click", async () => {
  cleanupMatchRealtime();
  cleanupRegistryRealtime();

  showMatchesScreen();

  const user = auth.currentUser;
  if (user) {
    viewerIsAdmin = await isGlobalAdmin(user.uid);
    adminSection && (adminSection.style.display = viewerIsAdmin ? "block" : "none");
    await renderMatchesFromInvites(user);
    subscribeAdminAllMatches();
  }
});
backToHomeBtn?.addEventListener("click", () => {
  cleanupRegistryRealtime();
  showRepHome();
});
goToMatchesBtn?.addEventListener("click", async () => {
  cleanupRegistryRealtime();
  showMatchesScreen();

  const user = auth.currentUser;
  if (user) {
    viewerIsAdmin = await isGlobalAdmin(user.uid);
    adminSection && (adminSection.style.display = viewerIsAdmin ? "block" : "none");
    await renderMatchesFromInvites(user);
    subscribeAdminAllMatches();
  }
});

// ======================
// Auth UI（入力メールを小文字化）
// ======================
signupBtn?.addEventListener("click", async () => {
  const emailRaw = (emailEl?.value || "");
  const email = normalizeEmail(emailRaw);
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
  const emailRaw = (emailEl?.value || "");
  const email = normalizeEmail(emailRaw);
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
    cleanupRegistryRealtime();
    cleanupAdminMatchesRealtime();

    currentMatchId = null;
    currentMatch = null;
    currentTournamentId = null;
    viewerUid = null;
    viewerIsAdmin = false;
    viewerIsParticipant = false;
    myTeamId = null;

    scoreByTeam = {};
    resetTimer();

    await signOut(auth);
  } catch (e) {
    alert(`ログアウト失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

// ======================
// Auth state
// ======================
onAuthStateChanged(auth, async (user) => {
  ensureScoreInputUIOnce();
  setTimerText();

  if (!user) {
    if (statusEl) statusEl.textContent = "";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (signupBtn) signupBtn.style.display = "inline-block";

    hideAllMainSections();
    matchesList && (matchesList.innerHTML = "");
    adminMatchesList && (adminMatchesList.innerHTML = "");
    cleanupAdminMatchesRealtime();
    return;
  }

  if (statusEl) statusEl.textContent = `ログイン中: ${user.email || ""}`;
  if (logoutBtn) logoutBtn.style.display = "inline-block";
  if (signupBtn) signupBtn.style.display = "none";

  const okRegistry = await hasUserRegistry(user);
  if (!okRegistry) {
    showOnlyUidVerify(user);
    return;
  }

  await showPostLoginUI(user);
});
