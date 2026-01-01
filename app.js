// app.js（全文置換：Admin登録URL/大会マスタ自動反映/試合記録レイアウト修正/編集ボタン非表示）
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
  runTransaction,
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
// URL params
// ======================
const urlParams = new URLSearchParams(location.search);
const adminInviteToken = String(urlParams.get("admin_invite") || "").trim(); // 招待URLで渡す

// ======================
// DOM（Topbar / Login）
// ======================
const topStatusEl = document.getElementById("top-status");

const loginSection = document.getElementById("login-section");
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

// Admin登録（招待URL）
const adminRegisterSection = document.getElementById("admin-register-section");
const adminRegisterContextEl = document.getElementById("admin-register-context");
const adminRegisterBtn = document.getElementById("admin-register-btn");
const adminRegisterCancelBtn = document.getElementById("admin-register-cancel-btn");
const adminRegisterStatusEl = document.getElementById("admin-register-status");

// メニュー
const repHomeSection = document.getElementById("rep-home-section");
const openTournamentMasterBtn = document.getElementById("open-tournament-master-btn");
const openMatchesBtn = document.getElementById("open-matches-btn");

// 大会マスタ（試合選択→登録→試合へ自動追加）
const tournamentMasterSection = document.getElementById("tournament-master-section");
const backToHomeFromMasterBtn = document.getElementById("back-to-home-from-master-btn");
const goToMatchesFromMasterBtn = document.getElementById("go-to-matches-from-master-btn");
const masterMatchSelectEl = document.getElementById("master-match-select");
const masterTeamSelectEl = document.getElementById("master-team-select");
const masterLoadBtn = document.getElementById("master-load-btn");
const masterContextEl = document.getElementById("master-context");
const masterPlayerNumberEl = document.getElementById("master-player-number");
const masterPlayerNameEl = document.getElementById("master-player-name");
const masterAddPlayerBtn = document.getElementById("master-add-player-btn");
const masterBulkEl = document.getElementById("master-bulk");
const masterBulkAddBtn = document.getElementById("master-bulk-add-btn");
const masterSearchEl = document.getElementById("master-search");
const masterClearSearchBtn = document.getElementById("master-clear-search-btn");
const masterPlayersListEl = document.getElementById("master-players-list");

// セクション
const adminSection = document.getElementById("admin-section");
const matchesSection = document.getElementById("matches-section");
const scoreSection = document.getElementById("score-section");

// 管理者：試合作成
const teamANameEl = document.getElementById("team-a-name");
const teamBNameEl = document.getElementById("team-b-name");
const teamAEmailEl = document.getElementById("team-a-email");
const teamBEmailEl = document.getElementById("team-b-email");
const adminTournamentSelectEl = document.getElementById("admin-tournament-select");
const adminNewTournamentNameEl = document.getElementById("admin-new-tournament-name");
const adminNewTournamentIdEl = document.getElementById("admin-new-tournament-id");
const createMatchBtn = document.getElementById("create-match-btn");
const adminInfoEl = document.getElementById("admin-info");

// 試合一覧
const openTournamentMasterFromMatchesBtn = document.getElementById("open-tournament-master-from-matches-btn");
const matchesAdminBlock = document.getElementById("matches-admin-block");
const adminMatchesListEl = document.getElementById("admin-matches-list");
const matchesListEl = document.getElementById("matches-list");

// 試合入力
const backToMatchesBtn = document.getElementById("back-to-matches-btn");
const openTeamAdminBtn = document.getElementById("open-team-admin-btn"); // 使わない（非表示）

const startTimerBtn = document.getElementById("start-timer-btn");
const resetTimerBtn = document.getElementById("reset-timer-btn");
const stopTimerBtn = document.getElementById("stop-timer-btn");
const timerShareStatusEl = document.getElementById("timer-share-status");

const teamLeftNameEl = document.getElementById("team-left-name");
const teamRightNameEl = document.getElementById("team-right-name");
const scoreLeftEl = document.getElementById("score-left");
const scoreRightEl = document.getElementById("score-right");
const timerEl = document.getElementById("timer");

const playerSelectEl = document.getElementById("player-select");
const assistSelectEl = document.getElementById("assist-select");
const recordGoalBtn = document.getElementById("record-goal-btn");
const recordCallahanBtn = document.getElementById("record-callahan-btn");
const eventControlsHintEl = document.getElementById("event-controls-hint");

const eventListEl = document.getElementById("event-list");

// ======================
// State
// ======================
let currentMatchId = null;
let currentMatch = null;
let currentTournamentId = null;
let currentMembership = null; // matches/{matchId}/memberships/{uid}
let isAdminUser = false;

let latestEvents = [];
let leftTeam = { uid: "", name: "—" };
let rightTeam = { uid: "", name: "—" };
let scoreByTeam = {}; // {teamUid: score}

let matchTimer = {
  status: "stopped",
  baseMs: 0,
  startedAt: null,
};

// realtime unsub
let unsubMatchDoc = null;
let unsubEvents = null;
let unsubScoreAgg = null;
let unsubPlayersForSelect = null;

// tournament master subscriptions
let unsubMasterPlayers = null;

// UI ticker
let uiTickerId = null;

// UID verify state
let uidVerifyBound = false;

// master state
let masterMatchId = null;
let masterMatch = null;
let masterTournamentId = null;
let masterTeamUid = null;
let masterTeamName = "";
let masterPlayersAll = [];

// ======================
// utils
// ======================
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
function normalizeTournamentId(raw) {
  return String(raw || "").trim().toLowerCase();
}
function validTournamentId(tid) {
  return /^[a-z0-9][a-z0-9_-]{1,50}$/.test(tid);
}
function randomJoinCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function slugifyTournamentIdFromName(name) {
  const base = String(name || "")
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^a-z0-9_-]/g, "")
    .replaceAll(/-+/g, "-")
    .slice(0, 32);
  const fallback = base && /^[a-z0-9]/.test(base) ? base : "tournament";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${fallback}-${suffix}`;
}
function setTopStatus(text) {
  if (topStatusEl) topStatusEl.textContent = text || "";
}
function setAdminRegisterStatus(text, isError = false) {
  if (!adminRegisterStatusEl) return;
  adminRegisterStatusEl.textContent = text || "";
  adminRegisterStatusEl.style.color = isError ? "#c00" : "";
}

// ======================
// Collections / refs
// ======================
function usersCol() {
  return collection(db, "users");
}
function userRef(uid) {
  return doc(db, "users", uid);
}
function adminsRef(uid) {
  return doc(db, "admins", uid);
}

function adminInviteRef(token) {
  // 管理者登録用：adminInvites/{token}
  return doc(db, "adminInvites", token);
}

function tournamentsCol() {
  return collection(db, "tournaments");
}
function tournamentRef(tournamentId) {
  return doc(db, "tournaments", tournamentId);
}
function tournamentTeamPlayersCol(tournamentId, teamId) {
  return collection(db, "tournaments", tournamentId, "teams", teamId, "players");
}
function tournamentTeamPlayerRef(tournamentId, teamId, playerId) {
  return doc(db, "tournaments", tournamentId, "teams", teamId, "players", playerId);
}

function matchesCol() {
  return collection(db, "matches");
}
function matchRef(matchId) {
  return doc(db, "matches", matchId);
}
function membershipsCol(matchId) {
  return collection(db, "matches", matchId, "memberships");
}
function membershipRef(matchId, uid) {
  return doc(db, "matches", matchId, "memberships", uid);
}
function invitesCol() {
  return collection(db, "invites");
}
function eventsCol(matchId) {
  return collection(db, "matches", matchId, "events");
}
function eventRef(matchId, eventId) {
  return doc(db, "matches", matchId, "events", eventId);
}
function matchPlayersCol(matchId, teamId) {
  return collection(db, "matches", matchId, "teams", teamId, "players");
}
function matchPlayerRef(matchId, teamId, playerId) {
  return doc(db, "matches", matchId, "teams", teamId, "players", playerId);
}
function joinCodeRef(codeUpper) {
  return doc(db, "joinCodes", codeUpper);
}

// ======================
// Section control
// ======================
function hideAllMainSections() {
  uidVerifySection && (uidVerifySection.style.display = "none");
  adminRegisterSection && (adminRegisterSection.style.display = "none");
  repHomeSection && (repHomeSection.style.display = "none");
  tournamentMasterSection && (tournamentMasterSection.style.display = "none");
  adminSection && (adminSection.style.display = "none");
  matchesSection && (matchesSection.style.display = "none");
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
function showTournamentMasterScreen() {
  hideAllMainSections();
  tournamentMasterSection && (tournamentMasterSection.style.display = "block");
}
function showScoreScreen() {
  hideAllMainSections();
  scoreSection && (scoreSection.style.display = "block");
}
function showAdminRegisterScreen(user) {
  hideAllMainSections();
  adminRegisterSection && (adminRegisterSection.style.display = "block");
  if (adminRegisterContextEl) {
    adminRegisterContextEl.textContent =
      `ログイン中：${user?.email || ""}\n招待トークン：${adminInviteToken || "（なし）"}`;
  }
  setAdminRegisterStatus("");
}

function setLoginVisibility(isAuthed) {
  if (loginSection) loginSection.style.display = isAuthed ? "none" : "block";
  if (logoutBtn) logoutBtn.style.display = isAuthed ? "inline-flex" : "none";
  if (signupBtn) signupBtn.style.display = isAuthed ? "none" : "inline-flex";
  if (loginBtn) loginBtn.style.display = isAuthed ? "none" : "inline-flex";
}

// ======================
// Auth helpers
// ======================
async function isGlobalAdmin(uid) {
  const snap = await getDoc(adminsRef(uid));
  return snap.exists();
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

// ======================
// Cleanup
// ======================
function cleanupMatchRealtime() {
  unsubMatchDoc?.(); unsubMatchDoc = null;
  unsubEvents?.(); unsubEvents = null;
  unsubScoreAgg?.(); unsubScoreAgg = null;
  unsubPlayersForSelect?.(); unsubPlayersForSelect = null;
  stopUiTicker();
}
function cleanupMasterRealtime() {
  unsubMasterPlayers?.(); unsubMasterPlayers = null;
}
function stopUiTicker() {
  if (uiTickerId) {
    clearInterval(uiTickerId);
    uiTickerId = null;
  }
}
function startUiTicker() {
  stopUiTicker();
  uiTickerId = window.setInterval(() => {
    renderTimerAndScoreboard();
  }, 250);
  renderTimerAndScoreboard();
}

// ======================
// Tournaments list（大会名表示）
// ======================
async function loadTournamentOptions() {
  const snap = await getDocs(query(tournamentsCol(), orderBy("createdAt", "desc"), limit(200)));
  const items = snap.docs.map((d) => {
    const data = d.data() || {};
    const name = String(data.name || d.id);
    return { id: d.id, name };
  });

  if (!adminTournamentSelectEl) return;
  const current = adminTournamentSelectEl.value || "";
  adminTournamentSelectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "大会を選択（既存）";
  adminTournamentSelectEl.appendChild(opt0);

  for (const it of items) {
    const opt = document.createElement("option");
    opt.value = it.id;
    opt.textContent = `${it.name}（${it.id}）`;
    adminTournamentSelectEl.appendChild(opt);
  }
  adminTournamentSelectEl.value = current;
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

function formatMatchLabel(matchData) {
  const title = String(matchData?.title || "").trim();
  return title || "Untitled Match";
}

async function renderTeamMatchesFromInvites(user) {
  if (!matchesListEl) return;
  matchesListEl.innerHTML = "";

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
      li.innerHTML = `
        <div class="match-item">
          <div class="match-title">${escapeHtml(formatMatchLabel(m))}</div>
          <div class="match-actions">
            <!-- 要件：選手管理ボタンは非表示 -->
            <button class="btn ghost" data-action="master">大会マスタ</button>
            <button class="btn" data-action="enter">試合入力</button>
          </div>
        </div>
      `;

      li.querySelector('[data-action="master"]')?.addEventListener("click", async (e) => {
        e.stopPropagation();
        await openTournamentMasterForMatch(inv.matchId);
      });

      li.querySelector('[data-action="enter"]')?.addEventListener("click", async (e) => {
        e.stopPropagation();
        await enterMatch(inv.matchId);
      });

      matchesListEl.appendChild(li);
    } catch (e) {
      console.error("match read failed:", inv.matchId, e);
    }
  }
}

async function renderAdminAllMatches() {
  if (!adminMatchesListEl) return;
  adminMatchesListEl.innerHTML = "<li>読み込み中...</li>";

  try {
    const snap = await getDocs(query(matchesCol(), orderBy("createdAt", "desc"), limit(300)));
    const matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (matches.length === 0) {
      adminMatchesListEl.innerHTML = "<li>試合がありません。</li>";
      return;
    }

    adminMatchesListEl.innerHTML = "";
    for (const m of matches) {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="match-item">
          <div class="match-title">${escapeHtml(formatMatchLabel(m))}</div>
          <div class="match-actions">
            <button class="btn ghost" data-action="master">大会マスタ</button>
            <button class="btn" data-action="enter">試合入力（閲覧）</button>
          </div>
        </div>
      `;
      li.querySelector('[data-action="master"]')?.addEventListener("click", async () => {
        await openTournamentMasterForMatch(m.id);
      });
      li.querySelector('[data-action="enter"]')?.addEventListener("click", async () => {
        await enterMatch(m.id);
      });
      adminMatchesListEl.appendChild(li);
    }
  } catch (e) {
    adminMatchesListEl.innerHTML = "<li>読み込み失敗</li>";
    console.error(e);
  }
}

// ======================
// Match load / membership
// ======================
async function loadMatch(matchId) {
  const snap = await getDoc(matchRef(matchId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
async function loadMyMembership(matchId, uid) {
  const snap = await getDoc(membershipRef(matchId, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ======================
// Match timer (shared)
// ======================
function timerMsNow() {
  const baseMs = Number(matchTimer?.baseMs || 0);
  if (matchTimer?.status === "running" && matchTimer?.startedAt?.toMillis) {
    const startedAtMs = matchTimer.startedAt.toMillis();
    const elapsed = Date.now() - startedAtMs;
    return baseMs + Math.max(0, elapsed);
  }
  return baseMs;
}

function renderTimerAndScoreboard() {
  if (timerEl) timerEl.textContent = msToMMSS(timerMsNow());

  if (teamLeftNameEl) teamLeftNameEl.textContent = leftTeam.name || "—";
  if (teamRightNameEl) teamRightNameEl.textContent = rightTeam.name || "—";

  const l = leftTeam.uid ? (scoreByTeam[leftTeam.uid] || 0) : 0;
  const r = rightTeam.uid ? (scoreByTeam[rightTeam.uid] || 0) : 0;
  if (scoreLeftEl) scoreLeftEl.textContent = String(l);
  if (scoreRightEl) scoreRightEl.textContent = String(r);
}

function setTimerShareStatus(text, isError = false) {
  if (!timerShareStatusEl) return;
  timerShareStatusEl.textContent = text || "";
  timerShareStatusEl.style.color = isError ? "#c00" : "";
}

async function updateSharedTimer(partial) {
  if (!currentMatchId) return;
  const user = auth.currentUser;
  if (!user) return;

  try {
    setTimerShareStatus("");
    const next = {
      status: partial.status ?? matchTimer.status ?? "stopped",
      baseMs: partial.baseMs ?? Number(matchTimer.baseMs || 0),
      startedAt: partial.startedAt ?? matchTimer.startedAt ?? null,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };
    await updateDoc(matchRef(currentMatchId), { timer: next });
  } catch (e) {
    console.error("timer update failed:", e);
    setTimerShareStatus("タイマー開始の共有に失敗", true);
    alert(`タイマー共有に失敗\n${e.code || ""}\n${e.message || e}`);
  }
}

function canOperateTimer() {
  if (isAdminUser) return true;
  return !!currentMembership;
}

async function onStartTimerClicked() {
  if (!canOperateTimer()) return;
  if (matchTimer.status === "running") return;
  await updateSharedTimer({ status: "running", startedAt: serverTimestamp() });
}

async function onStopTimerClicked() {
  if (!canOperateTimer()) return;
  if (matchTimer.status !== "running") return;

  const baseMs = Number(matchTimer.baseMs || 0);
  const startedAtMs = matchTimer.startedAt?.toMillis ? matchTimer.startedAt.toMillis() : null;
  const elapsed = startedAtMs != null ? Math.max(0, Date.now() - startedAtMs) : 0;
  const nextBase = baseMs + elapsed;

  await updateSharedTimer({ status: "stopped", baseMs: nextBase, startedAt: null });
}

async function onResetTimerClicked() {
  if (!canOperateTimer()) return;
  await updateSharedTimer({ status: "stopped", baseMs: 0, startedAt: null });
}

// ======================
// Players: selects
// ======================
function rebuildSelect(selectEl, firstLabel, players) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const o0 = document.createElement("option");
  o0.value = "";
  o0.textContent = firstLabel;
  selectEl.appendChild(o0);

  for (const p of players) {
    const label = `${p.number || "-"} ${p.name || ""}`.trim() || p.id;
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = label;
    selectEl.appendChild(o);
  }
}

async function getPlayerLabelFromMatchPlayers(teamUid, playerId) {
  if (!currentMatchId || !teamUid || !playerId) return "";
  try {
    const snap = await getDoc(matchPlayerRef(currentMatchId, teamUid, playerId));
    if (!snap.exists()) return playerId;
    const p = snap.data();
    return `${p.number || "-"} ${p.name || ""}`.trim() || playerId;
  } catch {
    return playerId;
  }
}

// ======================
// Events（得点/キャラハン：どちらも1点）
// ======================
function canRecordEvents() {
  return currentMembership?.role === "team";
}

function setEventControlsAvailability() {
  const ok = canRecordEvents();
  if (playerSelectEl) playerSelectEl.disabled = !ok;
  if (assistSelectEl) assistSelectEl.disabled = !ok;
  if (recordGoalBtn) recordGoalBtn.disabled = !ok;
  if (recordCallahanBtn) recordCallahanBtn.disabled = !ok;

  if (eventControlsHintEl) {
    eventControlsHintEl.textContent = ok ? "" : "※この画面は閲覧モードです（イベント入力はチーム代表者のみ）。";
  }
}

async function recordEvent(type) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!currentMatchId) return alert("試合が未選択です。");
  if (!canRecordEvents()) return;

  const scorerId = String(playerSelectEl?.value || "");
  if (!scorerId) return alert("選手を選択してください。");

  const assistId = String(assistSelectEl?.value || "");
  const timeMs = timerMsNow();

  const teamUid = user.uid;
  const teamName = String(currentMembership?.teamName || "");

  try {
    await addDoc(eventsCol(currentMatchId), {
      type,
      timeMs,
      teamId: teamUid,
      teamName,
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

function canDeleteEvent(ev) {
  const user = auth.currentUser;
  if (!user) return false;
  if (isAdminUser) return true;
  return ev?.createdBy === user.uid;
}

// 表示上の左右判定を強化（旧データ/UID欠落でも表示を落とさない）
function resolveSideForEvent(ev) {
  const tid = String(ev?.teamId || "");
  if (tid && leftTeam.uid && tid === leftTeam.uid) return "left";
  if (tid && rightTeam.uid && tid === rightTeam.uid) return "right";

  const tname = String(ev?.teamName || "").trim();
  if (tname) {
    const ln = String(leftTeam.name || "").trim();
    const rn = String(rightTeam.name || "").trim();
    if (ln && tname === ln) return "left";
    if (rn && tname === rn) return "right";
  }

  // 旧データ対策：teamIdが空/不一致の場合も「どこにも出ない」を避ける
  return "left";
}

async function subscribeEvents(matchId) {
  unsubEvents?.(); unsubEvents = null;

  unsubEvents = onSnapshot(
    query(eventsCol(matchId), orderBy("timeMs", "desc")),
    async (snap) => {
      latestEvents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await renderEvents();
    },
    (err) => {
      alert(`events 読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );
}

async function renderEvents() {
  if (!eventListEl) return;

  const rows = [];

  for (const ev of latestEvents) {
    const t = msToMMSS(ev.timeMs || 0);
    const side = resolveSideForEvent(ev);

    const teamId = String(ev.teamId || "");
    const scorerLabel = await getPlayerLabelFromMatchPlayers(teamId, ev.scorerPlayerId || "");
    const assistLabel = ev.assistPlayerId ? await getPlayerLabelFromMatchPlayers(teamId, ev.assistPlayerId) : "";

    const mainLine = `${scorerLabel}`.trim() || "-";
    const subLine =
      ev.type === "callahan"
        ? "（キャラハン）"
        : (assistLabel ? `（アシスト：${assistLabel}）` : "");

    const teamName = String(ev.teamName || (side === "left" ? leftTeam.name : rightTeam.name) || "").trim();
    const teamTag = teamName ? `<span class="ev-team">（${escapeHtml(teamName)}）</span>` : "";

    const leftCell =
      side === "left"
        ? `<div class="ev-cell">
             <div class="ev-main">${escapeHtml(mainLine)}</div>
             <div class="ev-sub">${escapeHtml(subLine)}</div>
             <div class="ev-teamline">${teamTag}</div>
           </div>`
        : `<div class="ev-cell muted"> </div>`;

    const rightCell =
      side === "right"
        ? `<div class="ev-cell">
             <div class="ev-main">${escapeHtml(mainLine)}</div>
             <div class="ev-sub">${escapeHtml(subLine)}</div>
             <div class="ev-teamline">${teamTag}</div>
           </div>`
        : `<div class="ev-cell muted"> </div>`;

    const timeCell = `<div class="ev-time">${escapeHtml(t)}</div>`;

    // 要件：編集ボタン非表示。削除のみ残す。
    const actions = canDeleteEvent(ev)
      ? `<div class="ev-actions">
           <button class="btn ghost mini" data-action="delete" data-id="${escapeHtml(ev.id)}">削除</button>
         </div>`
      : `<div class="ev-actions muted"></div>`;

    rows.push(`
      <div class="ev-row">
        ${leftCell}
        ${timeCell}
        ${rightCell}
        ${actions}
      </div>
    `);
  }

  eventListEl.innerHTML = rows.length ? rows.join("") : `<div class="hint">まだ記録がありません。</div>`;
}

// イベント操作（削除のみ）
eventListEl?.addEventListener("click", async (e) => {
  const btn = e.target?.closest?.("button");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  const id = btn.getAttribute("data-id");
  if (action !== "delete" || !id || !currentMatchId) return;

  const ev0 = latestEvents.find((x) => x.id === id);
  if (!ev0) return;

  if (!canDeleteEvent(ev0)) return;

  if (!confirm("この記録を削除しますか？")) return;
  try {
    await deleteDoc(eventRef(currentMatchId, id));
  } catch (err) {
    alert(`削除失敗\n${err.code}\n${err.message}`);
    console.error(err);
  }
});

// ======================
// Score aggregate（goal + callahan を得点として計上）
// ======================
function subscribeScoreAggregate(matchId) {
  unsubScoreAgg?.(); unsubScoreAgg = null;

  unsubScoreAgg = onSnapshot(
    query(eventsCol(matchId), orderBy("createdAt", "asc")),
    (snap) => {
      const by = {};
      for (const d of snap.docs) {
        const ev = d.data() || {};
        const tId = String(ev.teamId || "");
        if (!tId) continue;
        const isPoint = ev.type === "goal" || ev.type === "callahan";
        if (!isPoint) continue;
        by[tId] = (by[tId] || 0) + 1;
      }
      scoreByTeam = by;
      renderTimerAndScoreboard();
    },
    (err) => {
      console.error("score aggregate failed:", err);
    }
  );
}

// ======================
// Determine left/right teams
// ======================
function inferTeamsFromMatchDoc(m) {
  const aUid = String(m?.teamAUid || "");
  const bUid = String(m?.teamBUid || "");
  const aName = String(m?.teamAName || "").trim();
  const bName = String(m?.teamBName || "").trim();

  if (aUid && bUid) {
    leftTeam = { uid: aUid, name: aName || "Team A" };
    rightTeam = { uid: bUid, name: bName || "Team B" };
    return;
  }

  // 旧データでも名前は持てるように
  if (aName || bName) {
    leftTeam = { uid: aUid || "", name: aName || "Team A" };
    rightTeam = { uid: bUid || "", name: bName || "Team B" };
    return;
  }

  // fallback：title "A vs B"
  const title = String(m?.title || "");
  const parts = title.split(/\s+vs\s+/i);
  if (parts.length === 2) {
    leftTeam = { uid: "", name: parts[0].trim() || "Left" };
    rightTeam = { uid: "", name: parts[1].trim() || "Right" };
    return;
  }

  leftTeam = { uid: "", name: "—" };
  rightTeam = { uid: "", name: "—" };
}

// ======================
// Enter match
// ======================
async function enterMatch(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  cleanupMatchRealtime();

  currentMatchId = matchId;
  currentMembership = null;
  currentMatch = null;
  currentTournamentId = null;

  try {
    currentMembership = await loadMyMembership(matchId, user.uid);
  } catch (e) {
    console.warn("membership load failed:", e);
    currentMembership = null;
  }

  unsubMatchDoc = onSnapshot(
    matchRef(matchId),
    (snap) => {
      if (!snap.exists()) {
        alert("試合情報が見つかりません。");
        return;
      }

      currentMatch = { id: snap.id, ...snap.data() };
      currentTournamentId = currentMatch.tournamentId ? String(currentMatch.tournamentId) : null;

      inferTeamsFromMatchDoc(currentMatch);

      const t = currentMatch.timer || {};
      matchTimer = {
        status: String(t.status || "stopped"),
        baseMs: Number(t.baseMs || 0),
        startedAt: t.startedAt || null,
      };

      renderTimerAndScoreboard();
      setEventControlsAvailability();
      startUiTicker();
    },
    (err) => {
      alert(`試合読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );

  // selects：チーム代表者のみ自チームを読めればOK
  unsubPlayersForSelect = onSnapshot(
    query(matchPlayersCol(matchId, user.uid), orderBy("number", "asc")),
    (snap) => {
      const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rebuildSelect(playerSelectEl, "選手を選択", players);
      rebuildSelect(assistSelectEl, "アシスト（任意）", players);
    },
    () => {
      rebuildSelect(playerSelectEl, "選手を選択", []);
      rebuildSelect(assistSelectEl, "アシスト（任意）", []);
    }
  );

  await subscribeEvents(matchId);
  subscribeScoreAggregate(matchId);

  showScoreScreen();

  setTimerShareStatus("");
  setEventControlsAvailability();
}

backToMatchesBtn?.addEventListener("click", async () => {
  cleanupMatchRealtime();

  currentMatchId = null;
  currentMatch = null;
  currentTournamentId = null;
  currentMembership = null;
  matchTimer = { status: "stopped", baseMs: 0, startedAt: null };
  scoreByTeam = {};
  latestEvents = [];

  showMatchesScreen();

  const user = auth.currentUser;
  if (user) {
    await renderTeamMatchesFromInvites(user);
    if (isAdminUser) await renderAdminAllMatches();
  }
});

// timer buttons
startTimerBtn?.addEventListener("click", onStartTimerClicked);
stopTimerBtn?.addEventListener("click", onStopTimerClicked);
resetTimerBtn?.addEventListener("click", onResetTimerClicked);

// event buttons
recordGoalBtn?.addEventListener("click", async () => {
  await recordEvent("goal");
});
recordCallahanBtn?.addEventListener("click", async () => {
  await recordEvent("callahan");
});

// ======================
// 大会マスタ（試合選択→登録→試合へ自動追加）
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
function normalizePlayerId(numberRaw) {
  // 1試合/1大会内で背番号がユニーク前提：背番号をdocIdにしてupsert（重複防止）
  const n = String(numberRaw || "").trim();
  return n;
}

async function buildMasterMatchOptions(user) {
  if (!masterMatchSelectEl) return;

  masterMatchSelectEl.innerHTML = `<option value="">試合を選択</option>`;

  // Admin：全試合 / Team：招待試合
  const items = [];
  if (isAdminUser) {
    const snap = await getDocs(query(matchesCol(), orderBy("createdAt", "desc"), limit(300)));
    for (const d of snap.docs) items.push({ id: d.id, ...d.data() });
  } else {
    const invites = await fetchInvitesForUid(user.uid);
    for (const inv of invites) {
      const ms = await getDoc(matchRef(inv.matchId));
      if (!ms.exists()) continue;
      items.push({ id: ms.id, ...ms.data() });
    }
  }

  for (const m of items) {
    const opt = document.createElement("option");
    opt.value = m.id;
    const title = formatMatchLabel(m);
    const tid = String(m.tournamentId || "");
    opt.textContent = tid ? `${title}（${tid}）` : title;
    masterMatchSelectEl.appendChild(opt);
  }
}

function fillMasterTeamOptionsFromMatch(m) {
  if (!masterTeamSelectEl) return;

  if (!isAdminUser) {
    masterTeamSelectEl.style.display = "none";
    masterTeamSelectEl.innerHTML = `<option value="">（Admin）チームを選択</option>`;
    return;
  }

  const aUid = String(m?.teamAUid || "");
  const bUid = String(m?.teamBUid || "");
  const aName = String(m?.teamAName || "Team A").trim();
  const bName = String(m?.teamBName || "Team B").trim();

  masterTeamSelectEl.style.display = "inline-flex";
  masterTeamSelectEl.innerHTML = `<option value="">（Admin）チームを選択</option>`;

  if (aUid) {
    const o = document.createElement("option");
    o.value = aUid;
    o.textContent = `${aName}`;
    masterTeamSelectEl.appendChild(o);
  }
  if (bUid) {
    const o = document.createElement("option");
    o.value = bUid;
    o.textContent = `${bName}`;
    masterTeamSelectEl.appendChild(o);
  }
}

async function openTournamentMasterForMatch(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  cleanupMasterRealtime();
  showTournamentMasterScreen();

  // 先に候補を構築して選択状態も反映
  await buildMasterMatchOptions(user);
  if (masterMatchSelectEl) masterMatchSelectEl.value = matchId || "";

  // Adminならチーム選択肢を出すため、一度matchを読む
  if (matchId) {
    const m = await loadMatch(matchId);
    if (m) fillMasterTeamOptionsFromMatch(m);
  } else {
    fillMasterTeamOptionsFromMatch(null);
  }

  // 読み込みはボタンで（意図的）
  if (masterContextEl) masterContextEl.textContent = matchId ? "「読み込む」を押してください。" : "";
}

async function loadMasterContext() {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const matchId = String(masterMatchSelectEl?.value || "").trim();
  if (!matchId) return alert("試合を選択してください。");

  const m = await loadMatch(matchId);
  if (!m) return alert("試合が見つかりません。");

  masterMatchId = matchId;
  masterMatch = m;

  // tournamentIdは試合から決定
  masterTournamentId = m.tournamentId ? String(m.tournamentId) : "";
  if (!masterTournamentId) return alert("この試合には tournamentId が未設定です。");

  // 対象チームUID
  if (isAdminUser) {
    fillMasterTeamOptionsFromMatch(m);
    const chosen = String(masterTeamSelectEl?.value || "").trim();
    if (!chosen) return alert("（Admin）チームを選択してください。");
    masterTeamUid = chosen;
    const tn = chosen === String(m.teamAUid || "") ? String(m.teamAName || "Team A") : String(m.teamBName || "Team B");
    masterTeamName = tn.trim();
  } else {
    masterTeamUid = user.uid;
    // membershipがあればチーム名に使う（無くてもOK）
    const mem = await loadMyMembership(matchId, user.uid).catch(() => null);
    masterTeamName = String(mem?.teamName || "").trim();
  }

  if (masterContextEl) {
    const title = formatMatchLabel(m);
    masterContextEl.textContent =
      `対象試合：${title}\n` +
      `tournamentId：${masterTournamentId}\n` +
      `team：${masterTeamName || "（チーム名未取得）"} / teamUid：${masterTeamUid}`;
  }

  // 大会マスタ（tournaments/...）を購読して一覧表示（削除のみ）
  cleanupMasterRealtime();
  unsubMasterPlayers = onSnapshot(
    query(tournamentTeamPlayersCol(masterTournamentId, masterTeamUid), orderBy("number", "asc")),
    (snap) => {
      masterPlayersAll = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderMasterPlayersList();
    },
    (err) => {
      alert(`大会マスタ読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );
}

function renderMasterPlayersList() {
  if (!masterPlayersListEl) return;

  const q = String(masterSearchEl?.value || "").trim().toLowerCase();
  const filtered = q
    ? masterPlayersAll.filter((p) => {
        const s = `${p.number || ""} ${p.name || ""}`.toLowerCase();
        return s.includes(q);
      })
    : masterPlayersAll;

  if (filtered.length === 0) {
    masterPlayersListEl.innerHTML = "<li>まだ登録されていません。</li>";
    return;
  }

  masterPlayersListEl.innerHTML = filtered.map((p) => `
    <li data-player-id="${escapeHtml(p.id)}">
      <span>${escapeHtml(`${p.number || "-"} ${p.name || ""}`)}</span>
      <button class="btn ghost mini" data-action="delete" style="margin-left:8px;">削除</button>
    </li>
  `).join("");

  masterPlayersListEl.onclick = async (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;

    const li = e.target.closest("li");
    const pid = li?.getAttribute("data-player-id");
    if (!pid) return;

    const action = btn.getAttribute("data-action");
    if (action !== "delete") return;

    if (!masterTournamentId || !masterTeamUid) return;

    if (!confirm("削除しますか？")) return;

    try {
      // 大会マスタ削除 + 試合選手からも削除（自動反映の整合）
      await deleteDoc(tournamentTeamPlayerRef(masterTournamentId, masterTeamUid, pid));

      if (masterMatchId) {
        await deleteDoc(matchPlayerRef(masterMatchId, masterTeamUid, pid)).catch(() => {});
      }
    } catch (err) {
      alert(`削除失敗\n${err.code || ""}\n${err.message || err}`);
      console.error(err);
    }
  };
}

async function upsertPlayerToTournamentAndMatch({ number, name }) {
  const user = auth.currentUser;
  if (!user) throw new Error("not logged in");
  if (!masterTournamentId || !masterMatchId || !masterTeamUid) throw new Error("master context not loaded");

  const num = String(number || "").trim();
  const nm = String(name || "").trim();
  if (!num || !nm) throw new Error("invalid");

  const pid = normalizePlayerId(num);

  // 大会マスタへ upsert、同時に試合選手へ upsert
  // ※setDoc(merge)で重複増殖を防止
  await setDoc(
    tournamentTeamPlayerRef(masterTournamentId, masterTeamUid, pid),
    {
      number: num,
      name: nm,
      active: true,
      updatedAt: serverTimestamp(),
      // 初回だけcreatedAtが入るように（merge）
      createdAt: serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true }
  );

  await setDoc(
    matchPlayerRef(masterMatchId, masterTeamUid, pid),
    {
      number: num,
      name: nm,
      active: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      syncedFromTournament: true,
      updatedBy: user.uid,
    },
    { merge: true }
  );
}

masterLoadBtn?.addEventListener("click", async () => {
  try {
    await loadMasterContext();
  } catch (e) {
    alert(e?.message || `${e}`);
  }
});

masterAddPlayerBtn?.addEventListener("click", async () => {
  try {
    if (!masterTournamentId || !masterMatchId || !masterTeamUid) {
      return alert("先に「試合を選択 → 読み込む」を行ってください。");
    }
    const number = String(masterPlayerNumberEl?.value || "").trim();
    const name = String(masterPlayerNameEl?.value || "").trim();
    if (!number || !name) return alert("背番号と選手名を入力してください。");

    await upsertPlayerToTournamentAndMatch({ number, name });

    if (masterPlayerNumberEl) masterPlayerNumberEl.value = "";
    if (masterPlayerNameEl) masterPlayerNameEl.value = "";
    masterPlayerNumberEl?.focus?.();
  } catch (e) {
    alert(`追加失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
  }
});

// Enterキーでも追加（名前欄でEnter）
masterPlayerNameEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") masterAddPlayerBtn?.click();
});

masterBulkAddBtn?.addEventListener("click", async () => {
  try {
    if (!masterTournamentId || !masterMatchId || !masterTeamUid) {
      return alert("先に「試合を選択 → 読み込む」を行ってください。");
    }
    const rows = parseBulkPlayers(masterBulkEl?.value || "");
    if (rows.length === 0) return alert("形式が不正です。例：12,山田太郎");

    for (const r of rows) {
      await upsertPlayerToTournamentAndMatch({ number: r.number, name: r.name });
    }
    if (masterBulkEl) masterBulkEl.value = "";
  } catch (e) {
    alert(`一括追加失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
  }
});

masterSearchEl?.addEventListener("input", renderMasterPlayersList);
masterClearSearchBtn?.addEventListener("click", () => {
  if (masterSearchEl) masterSearchEl.value = "";
  renderMasterPlayersList();
});

backToHomeFromMasterBtn?.addEventListener("click", () => {
  cleanupMasterRealtime();
  showRepHome();
});

goToMatchesFromMasterBtn?.addEventListener("click", async () => {
  cleanupMasterRealtime();
  showMatchesScreen();
  const u = auth.currentUser;
  if (u) {
    await renderTeamMatchesFromInvites(u);
    if (isAdminUser) {
      matchesAdminBlock && (matchesAdminBlock.style.display = "block");
      await renderAdminAllMatches();
    } else {
      matchesAdminBlock && (matchesAdminBlock.style.display = "none");
    }
  }
});

// ======================
// 管理者：試合作成（大会名ベース）
// ======================
async function findUidByEmailLower(emailLower) {
  const q = query(usersCol(), where("emailLower", "==", emailLower), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function ensureTournamentExists({ tournamentId, name }) {
  await setDoc(
    tournamentRef(tournamentId),
    {
      tournamentId,
      name: String(name || tournamentId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
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

  // 既存大会 or 新規大会
  const selectedTid = normalizeTournamentId(adminTournamentSelectEl?.value || "");
  const newTName = String(adminNewTournamentNameEl?.value || "").trim();
  const newTRaw = normalizeTournamentId(adminNewTournamentIdEl?.value || "");

  let tournamentId = selectedTid;
  let tournamentName = "";

  if (!tournamentId) {
    if (!newTName) return alert("大会を選択するか、新規作成の大会名を入力してください。");
    tournamentId = newTRaw || slugifyTournamentIdFromName(newTName);
    if (!validTournamentId(tournamentId)) return alert("tournamentId 形式が不正です（英小文字/数字/_/-）。");
    tournamentName = newTName;
  } else {
    // 既存選択時：表示名はtournamentsから取れれば取る（取れなくてもOK）
    const ts = await getDoc(tournamentRef(tournamentId)).catch(() => null);
    tournamentName = ts?.exists() ? String(ts.data()?.name || tournamentId) : tournamentId;
  }

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

    await ensureTournamentExists({ tournamentId, name: tournamentName || tournamentId });

    const matchDocRef = await addDoc(matchesCol(), {
      title,
      status: "scheduled",
      createdBy: user.uid,
      joinCode,
      tournamentId,
      teamAUid: uidA,
      teamBUid: uidB,
      teamAName,
      teamBName,
      timer: { status: "stopped", baseMs: 0, startedAt: null },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(membershipRef(matchDocRef.id, user.uid), {
      role: "admin",
      teamName: "Admin",
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

    const msg = `作成完了：${title}
matchId=${matchDocRef.id}
joinCode=${joinCode}
tournament=${tournamentName || tournamentId}（${tournamentId}）
招待：${teamAEmail}, ${teamBEmail}`;
    if (adminInfoEl) adminInfoEl.textContent = msg;

    alert(`試合作成OK\n${title}\n大会：${tournamentName || tournamentId}\njoinCode: ${joinCode}\n※チーム側はログイン後に試合一覧へ反映されます。`);

    if (isAdminUser) await renderAdminAllMatches();

    if (adminNewTournamentIdEl) adminNewTournamentIdEl.value = "";
    if (adminNewTournamentNameEl) adminNewTournamentNameEl.value = "";
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
// Admin登録（招待URL：即Admin化）
// ======================
async function activateAdminByInviteToken(user, token) {
  if (!token) throw new Error("招待トークンがありません。");

  const tokenRef = adminInviteRef(token);
  const adminRef = adminsRef(user.uid);

  await runTransaction(db, async (tx) => {
    const tok = await tx.get(tokenRef);
    if (!tok.exists()) throw new Error("招待トークンが無効です。");

    const t = tok.data() || {};
    if (t.usedAt) throw new Error("この招待トークンは使用済みです。");

    // ここで任意の制限（例：許可メール）を掛けたい場合は t.allowedEmailLower 等でチェック
    // 今回は「即Admin化」優先：制限なし

    tx.set(adminRef, {
      uid: user.uid,
      email: user.email || "",
      createdAt: serverTimestamp(),
      createdBy: "admin_invite",
      token,
    }, { merge: true });

    tx.set(tokenRef, {
      usedAt: serverTimestamp(),
      usedBy: user.uid,
      usedEmail: user.email || "",
    }, { merge: true });
  });
}

adminRegisterBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!adminInviteToken) return alert("招待トークンがありません。URLを確認してください。");

  try {
    adminRegisterBtn.disabled = true;
    setAdminRegisterStatus("登録中...");
    await activateAdminByInviteToken(user, adminInviteToken);
    setAdminRegisterStatus("登録完了。画面を更新します。");
    // URLパラメータを外して通常運用へ
    history.replaceState({}, "", location.pathname);
    // Admin判定を更新して通常UIへ
    await showPostLoginUI(user);
  } catch (e) {
    console.error(e);
    setAdminRegisterStatus(`失敗：${e?.message || e}`, true);
    alert(`Admin登録失敗\n${e?.message || e}`);
  } finally {
    adminRegisterBtn.disabled = false;
  }
});

adminRegisterCancelBtn?.addEventListener("click", async () => {
  history.replaceState({}, "", location.pathname);
  const user = auth.currentUser;
  if (user) await showPostLoginUI(user);
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
  if (uidVerifyBtn) uidVerifyBtn.disabled = true;

  if (!uidVerifyBound) {
    uidVerifyBound = true;

    uidInputEl?.addEventListener("input", () => {
      const expected = String(auth.currentUser?.uid || "");
      const got = String(uidInputEl?.value || "").trim();
      const ok = expected.length > 0 && got.length > 0 && got === expected;

      if (uidVerifyBtn) uidVerifyBtn.disabled = !ok;

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
        alert(`ユーザー登録（users）失敗\n${e.code || ""}\n${e.message || e}\n\nFirestoreルールをご確認ください。`);
        console.error(e);
        const ok = String(uidInputEl?.value || "").trim() === String(auth.currentUser?.uid || "");
        if (uidVerifyBtn) uidVerifyBtn.disabled = !ok;
      }
    });
  }
}

// ======================
// Post-login UI
// ======================
async function showPostLoginUI(user) {
  setLoginVisibility(true);
  setTopStatus(`ログイン中：${user.email || ""}`);

  // 管理者判定
  try {
    isAdminUser = await isGlobalAdmin(user.uid);
  } catch {
    isAdminUser = false;
  }

  // 管理者セクション表示
  adminSection && (adminSection.style.display = isAdminUser ? "block" : "none");

  // tournaments（管理者フォーム用）
  try {
    await loadTournamentOptions();
  } catch (e) {
    console.warn("loadTournamentOptions failed:", e);
  }

  // 初期：メニュー
  showRepHome();
}

// メニュー導線
openTournamentMasterBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  await openTournamentMasterForMatch(""); // match未選択
});

openMatchesBtn?.addEventListener("click", async () => {
  showMatchesScreen();
  const user = auth.currentUser;
  if (user) {
    await renderTeamMatchesFromInvites(user);

    if (isAdminUser) {
      matchesAdminBlock && (matchesAdminBlock.style.display = "block");
      await renderAdminAllMatches();
    } else {
      matchesAdminBlock && (matchesAdminBlock.style.display = "none");
    }
  }
});

openTournamentMasterFromMatchesBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  await openTournamentMasterForMatch("");
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
  } catch (e) {
    alert(`ログイン失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    cleanupMatchRealtime();
    cleanupMasterRealtime();

    currentMatchId = null;
    currentMatch = null;
    currentTournamentId = null;
    currentMembership = null;
    matchTimer = { status: "stopped", baseMs: 0, startedAt: null };
    scoreByTeam = {};
    latestEvents = [];
    leftTeam = { uid: "", name: "—" };
    rightTeam = { uid: "", name: "—" };

    masterMatchId = null;
    masterMatch = null;
    masterTournamentId = null;
    masterTeamUid = null;
    masterTeamName = "";
    masterPlayersAll = [];

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
  stopUiTicker();

  if (!user) {
    setLoginVisibility(false);
    setTopStatus("");

    if (statusEl) statusEl.textContent = "";
    hideAllMainSections();
    matchesListEl && (matchesListEl.innerHTML = "");
    adminMatchesListEl && (adminMatchesListEl.innerHTML = "");
    matchesAdminBlock && (matchesAdminBlock.style.display = "none");
    adminSection && (adminSection.style.display = "none");
    return;
  }

  if (statusEl) statusEl.textContent = `ログイン中: ${user.email || ""}`;

  const okRegistry = await hasUserRegistry(user);
  if (!okRegistry) {
    setLoginVisibility(true);
    showOnlyUidVerify(user);
    return;
  }

  // 招待URLが付いている場合：Admin登録画面を優先表示
  if (adminInviteToken) {
    setLoginVisibility(true);
    showAdminRegisterScreen(user);
    return;
  }

  await showPostLoginUI(user);
});
