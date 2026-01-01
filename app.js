// app.js（全文置換：大会マスタ→大会に含まれる試合すべてへ自動反映（未公開含む）＋試合記録は編集ボタン非表示（削除は残す）＋試合一覧の「選手管理」ボタン非表示）
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

// 代表者ホーム
const repHomeSection = document.getElementById("rep-home-section");
const openPlayerRegistryBtn = document.getElementById("open-player-registry-btn");
const openMatchesBtn = document.getElementById("open-matches-btn");

// 代表者：大会マスタ選手登録
const playerRegistrySection = document.getElementById("player-registry-section");
const backToHomeBtn = document.getElementById("back-to-home-btn");
const goToMatchesBtn = document.getElementById("go-to-matches-btn");
const registryTournamentSelectEl = document.getElementById("registry-tournament-select");
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
const adminTournamentSelectEl = document.getElementById("admin-tournament-select");
const adminNewTournamentIdEl = document.getElementById("admin-new-tournament-id");
const createMatchBtn = document.getElementById("create-match-btn");
const adminInfoEl = document.getElementById("admin-info");

// 試合一覧
const matchesAdminBlock = document.getElementById("matches-admin-block");
const adminMatchesListEl = document.getElementById("admin-matches-list");
const matchesListEl = document.getElementById("matches-list");

// 試合入力
const backToMatchesBtn = document.getElementById("back-to-matches-btn");
const openTeamAdminBtn = document.getElementById("open-team-admin-btn");

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

// チーム管理者（試合単位：試合選手管理）
const teamAdminContextEl = document.getElementById("team-admin-context");
const backToMatchesFromAdminBtn = document.getElementById("back-to-matches-from-admin-btn");
const goToScoreFromAdminBtn = document.getElementById("go-to-score-from-admin-btn");

const bulkMatchPlayersEl = document.getElementById("bulk-match-players");
const bulkAddMatchBtn = document.getElementById("bulk-add-match-btn");
const matchPlayerNumberEl = document.getElementById("match-player-number");
const matchPlayerNameEl = document.getElementById("match-player-name");
const addMatchPlayerBtn = document.getElementById("add-match-player-btn");
const matchPlayersListEl = document.getElementById("match-players-list");

// ======================
// State
// ======================
let currentMatchId = null;
let currentMatch = null;
let currentTournamentId = null;
let currentMembership = null; // matches/{matchId}/memberships/{uid}
let isAdminUser = false;

let registryTournamentId = null;
let registryAllPlayers = [];
let latestEvents = [];

let leftTeam = { uid: "", name: "—" };
let rightTeam = { uid: "", name: "—" };

let matchTimer = {
  status: "stopped",
  baseMs: 0,
  startedAt: null,
};

let scoreByTeam = {}; // {teamUid: score}

// realtime unsub
let unsubMatchDoc = null;
let unsubEvents = null;
let unsubScoreAgg = null;
let unsubPlayersForSelect = null;

let unsubTournamentPlayers = null;
let unsubMatchPlayers = null;
let unsubRegistryPlayers = null;

// UI ticker
let uiTickerId = null;

// UID verify state
let uidVerifyBound = false;

// ======================
// utils
// ======================
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
function normalizeEmail(email) { return (email || "").trim().toLowerCase(); }
function normalizeTournamentId(raw) { return String(raw || "").trim().toLowerCase(); }
function validTournamentId(tid) { return /^[a-z0-9][a-z0-9_-]{1,50}$/.test(tid); }
function randomJoinCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function normalizePlayerNumberKey(n) {
  // 背番号を docId に使う（setDoc merge のキー）
  // " 07 " などは "07" を維持。空は不可。
  return String(n || "").trim();
}
function setTopStatus(text) { if (topStatusEl) topStatusEl.textContent = text || ""; }

// ======================
// Collections / refs
// ======================
function usersCol() { return collection(db, "users"); }
function userRef(uid) { return doc(db, "users", uid); }
function adminsRef(uid) { return doc(db, "admins", uid); }

function tournamentsCol() { return collection(db, "tournaments"); }
function tournamentRef(tournamentId) { return doc(db, "tournaments", tournamentId); }
function tournamentTeamPlayersCol(tournamentId, teamId) {
  return collection(db, "tournaments", tournamentId, "teams", teamId, "players");
}
function tournamentTeamPlayerRef(tournamentId, teamId, playerKey) {
  return doc(db, "tournaments", tournamentId, "teams", teamId, "players", playerKey);
}

function matchesCol() { return collection(db, "matches"); }
function matchRef(matchId) { return doc(db, "matches", matchId); }
function membershipsCol(matchId) { return collection(db, "matches", matchId, "memberships"); }
function membershipRef(matchId, uid) { return doc(db, "matches", matchId, "memberships", uid); }

function invitesCol() { return collection(db, "invites"); }

function eventsCol(matchId) { return collection(db, "matches", matchId, "events"); }
function eventRef(matchId, eventId) { return doc(db, "matches", matchId, "events", eventId); }

function matchPlayersCol(matchId, teamId) {
  return collection(db, "matches", matchId, "teams", teamId, "players");
}
function matchPlayerRef(matchId, teamId, playerKey) {
  return doc(db, "matches", matchId, "teams", teamId, "players", playerKey);
}
function joinCodeRef(codeUpper) { return doc(db, "joinCodes", codeUpper); }

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
function showRepHome() { hideAllMainSections(); repHomeSection && (repHomeSection.style.display = "block"); }
function showMatchesScreen() { hideAllMainSections(); matchesSection && (matchesSection.style.display = "block"); }
function showPlayerRegistryScreen() { hideAllMainSections(); playerRegistrySection && (playerRegistrySection.style.display = "block"); }
function showScoreScreen() { hideAllMainSections(); scoreSection && (scoreSection.style.display = "block"); }
function showTeamAdminScreen() { hideAllMainSections(); teamAdminSection && (teamAdminSection.style.display = "block"); }

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
function cleanupRealtimeAll() {
  unsubMatchDoc?.(); unsubMatchDoc = null;
  unsubEvents?.(); unsubEvents = null;
  unsubScoreAgg?.(); unsubScoreAgg = null;
  unsubPlayersForSelect?.(); unsubPlayersForSelect = null;

  unsubTournamentPlayers?.(); unsubTournamentPlayers = null;
  unsubMatchPlayers?.(); unsubMatchPlayers = null;
  unsubRegistryPlayers?.(); unsubRegistryPlayers = null;

  stopUiTicker();
}
function stopUiTicker() {
  if (uiTickerId) {
    clearInterval(uiTickerId);
    uiTickerId = null;
  }
}
function startUiTicker() {
  stopUiTicker();
  uiTickerId = window.setInterval(() => { renderTimerAndScoreboard(); }, 250);
  renderTimerAndScoreboard();
}

// ======================
// Tournaments list
// ======================
async function loadTournamentOptions() {
  const snap = await getDocs(query(tournamentsCol(), orderBy("createdAt", "desc"), limit(100)));
  const items = snap.docs.map((d) => {
    const data = d.data() || {};
    return { id: d.id, name: (data.name || d.id) };
  });

  const fill = (selectEl, placeholderText) => {
    if (!selectEl) return;
    const current = selectEl.value || "";
    selectEl.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholderText;
    selectEl.appendChild(opt0);

    for (const it of items) {
      const opt = document.createElement("option");
      opt.value = it.id;
      opt.textContent = `${it.name}（${it.id}）`;
      selectEl.appendChild(opt);
    }
    selectEl.value = current;
  };

  fill(registryTournamentSelectEl, "大会を選択");
  fill(adminTournamentSelectEl, "大会種別（選択）");
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

      // 代表者側は「選手管理」ボタン非表示（要件）
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="match-item">
          <div class="match-title">${escapeHtml(formatMatchLabel(m))}</div>
          <div class="match-actions">
            <button class="btn" data-action="enter">試合入力</button>
          </div>
        </div>
      `;

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
    const snap = await getDocs(query(matchesCol(), orderBy("createdAt", "desc"), limit(200)));
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
            <button class="btn" data-action="enter">試合入力（閲覧）</button>
          </div>
        </div>
      `;
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
function canOperateTimer() {
  if (isAdminUser) return true;
  return !!currentMembership;
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
async function getPlayerLabelFromMatchPlayers(teamUid, playerKey) {
  if (!currentMatchId || !teamUid || !playerKey) return "";
  try {
    const snap = await getDoc(matchPlayerRef(currentMatchId, teamUid, playerKey));
    if (snap.exists()) {
      const p = snap.data() || {};
      return `${p.number || "-"} ${p.name || ""}`.trim() || playerKey;
    }
    // 旧データ（random docId）の可能性があるので fallback でスキャン（最大50）
    const q = query(matchPlayersCol(currentMatchId, teamUid), where("number", "==", playerKey), limit(1));
    const s2 = await getDocs(q);
    if (!s2.empty) {
      const p = s2.docs[0].data() || {};
      return `${p.number || "-"} ${p.name || ""}`.trim() || playerKey;
    }
    return playerKey;
  } catch {
    return playerKey;
  }
}

// ======================
// Events
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
    const side = ev.teamId === leftTeam.uid ? "left" : (ev.teamId === rightTeam.uid ? "right" : "unknown");

    const scorerLabel = await getPlayerLabelFromMatchPlayers(ev.teamId, ev.scorerPlayerId || "");
    const assistLabel = ev.assistPlayerId ? await getPlayerLabelFromMatchPlayers(ev.teamId, ev.assistPlayerId) : "";

    const mainLine = `${scorerLabel}`.trim() || "-";
    const subLine =
      ev.type === "callahan"
        ? "（キャラハン）"
        : (assistLabel ? `（アシスト：${assistLabel}）` : "");

    const teamName = String(ev.teamName || (ev.teamId === leftTeam.uid ? leftTeam.name : ev.teamId === rightTeam.uid ? rightTeam.name : ev.teamId || ""));

    const leftCell =
      side === "left"
        ? `<div class="ev-cell">
             <div class="ev-main">${escapeHtml(mainLine)}</div>
             <div class="ev-sub">${escapeHtml(subLine)}</div>
             <div class="ev-teamline"><span class="ev-team">（${escapeHtml(teamName)}）</span></div>
           </div>`
        : `<div class="ev-cell muted"> </div>`;

    const rightCell =
      side === "right"
        ? `<div class="ev-cell">
             <div class="ev-main">${escapeHtml(mainLine)}</div>
             <div class="ev-sub">${escapeHtml(subLine)}</div>
             <div class="ev-teamline"><span class="ev-team">（${escapeHtml(teamName)}）</span></div>
           </div>`
        : `<div class="ev-cell muted"> </div>`;

    const timeCell = `<div class="ev-time">${escapeHtml(t)}</div>`;

    // 要件：編集ボタンは非表示、削除ボタンは残す
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

// イベント削除のみ
eventListEl?.addEventListener("click", async (e) => {
  const btn = e.target?.closest?.("button");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  const id = btn.getAttribute("data-id");
  if (!action || !id || !currentMatchId) return;

  const ev0 = latestEvents.find((x) => x.id === id);
  if (!ev0) return;

  if (action === "delete") {
    if (!canDeleteEvent(ev0)) return;
    if (!confirm("この記録を削除しますか？")) return;
    try {
      await deleteDoc(eventRef(currentMatchId, id));
    } catch (err) {
      alert(`削除失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  }
});

// ======================
// Score aggregate
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

  unsubMatchDoc?.(); unsubMatchDoc = null;
  unsubEvents?.(); unsubEvents = null;
  unsubScoreAgg?.(); unsubScoreAgg = null;
  unsubPlayersForSelect?.(); unsubPlayersForSelect = null;
  stopUiTicker();

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

// back
backToMatchesBtn?.addEventListener("click", async () => {
  stopUiTicker();

  unsubMatchDoc?.(); unsubMatchDoc = null;
  unsubEvents?.(); unsubEvents = null;
  unsubScoreAgg?.(); unsubScoreAgg = null;
  unsubPlayersForSelect?.(); unsubPlayersForSelect = null;

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

openTeamAdminBtn?.addEventListener("click", async () => {
  if (!currentMatchId) return alert("試合が未選択です。");
  await openTeamAdmin(currentMatchId);
});

// timer buttons
startTimerBtn?.addEventListener("click", onStartTimerClicked);
stopTimerBtn?.addEventListener("click", onStopTimerClicked);
resetTimerBtn?.addEventListener("click", onResetTimerClicked);

// event buttons
recordGoalBtn?.addEventListener("click", async () => { await recordEvent("goal"); });
recordCallahanBtn?.addEventListener("click", async () => { await recordEvent("callahan"); });

// ======================
// Team admin（試合単位：試合選手管理）
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
    <li data-player-id="${escapeHtml(p.id)}">
      <span>${escapeHtml(`${p.number || "-"} ${p.name || ""}`)}</span>
      <button class="btn ghost mini" data-action="edit" style="margin-left:8px;">編集</button>
      <button class="btn ghost mini" data-action="delete" style="margin-left:8px;">削除</button>
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

// 試合側 players は docId=背番号キー（推奨）
async function upsertMatchPlayer(matchId, teamId, numberKey, name) {
  const key = normalizePlayerNumberKey(numberKey);
  if (!key) throw new Error("背番号が空です。");
  await setDoc(
    matchPlayerRef(matchId, teamId, key),
    {
      number: key,
      name: String(name || "").trim(),
      active: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function openTeamAdmin(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const mem = await loadMyMembership(matchId, user.uid);
  if (!mem || mem.role !== "team") {
    alert("選手管理はチーム代表者のみ利用できます。");
    return;
  }

  const m = await loadMatch(matchId);
  if (!m) return alert("試合が見つかりません。");

  currentMatchId = matchId;
  currentMatch = m;
  currentTournamentId = m.tournamentId ? String(m.tournamentId) : null;
  currentMembership = mem;

  showTeamAdminScreen();

  const title = (m.title || "Untitled Match").trim();
  const tour = currentTournamentId ? currentTournamentId : "（未設定）";
  if (teamAdminContextEl) teamAdminContextEl.textContent = `対象試合：${title} / tournamentId: ${tour}`;

  backToMatchesFromAdminBtn && (backToMatchesFromAdminBtn.onclick = async () => {
    showMatchesScreen();
    const u = auth.currentUser;
    if (u) {
      await renderTeamMatchesFromInvites(u);
      if (isAdminUser) await renderAdminAllMatches();
    }
  });

  goToScoreFromAdminBtn && (goToScoreFromAdminBtn.onclick = async () => {
    await enterMatch(matchId);
  });

  // ---- 試合選手：購読
  unsubMatchPlayers?.(); unsubMatchPlayers = null;
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

          // pid は旧randomかもしれないので、常に「背番号キー」で upsert
          await upsertMatchPlayer(matchId, user.uid, number, name);
          // 旧random doc が残っていたら消す（任意）：番号キーと一致しない場合のみ削除
          const nk = normalizePlayerNumberKey(number);
          if (pid !== nk) {
            try { await deleteDoc(doc(db, "matches", matchId, "teams", user.uid, "players", pid)); } catch {}
          }
        },
        onDelete: async (pid) => {
          if (!confirm("削除しますか？")) return;
          await deleteDoc(doc(db, "matches", matchId, "teams", user.uid, "players", pid));
        },
      });
    },
    (err) => {
      alert(`試合選手読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );

  // ---- 試合選手：個別追加
  addMatchPlayerBtn && (addMatchPlayerBtn.onclick = async () => {
    const number = (matchPlayerNumberEl?.value || "").trim();
    const name = (matchPlayerNameEl?.value || "").trim();
    if (!number || !name) return alert("背番号と名前を入力してください。");

    try {
      await upsertMatchPlayer(matchId, user.uid, number, name);
      if (matchPlayerNumberEl) matchPlayerNumberEl.value = "";
      if (matchPlayerNameEl) matchPlayerNameEl.value = "";
    } catch (e) {
      alert(`追加失敗\n${e.code || ""}\n${e.message || e}`);
      console.error(e);
    }
  });

  // ---- 試合選手：一括追加
  bulkAddMatchBtn && (bulkAddMatchBtn.onclick = async () => {
    const rows = parseBulkPlayers(bulkMatchPlayersEl?.value || "");
    if (rows.length === 0) return alert("形式が不正です。例：12,山田太郎");

    try {
      for (const r of rows) {
        await upsertMatchPlayer(matchId, user.uid, r.number, r.name);
      }
      if (bulkMatchPlayersEl) bulkMatchPlayersEl.value = "";
    } catch (e) {
      alert(`一括追加失敗\n${e.code || ""}\n${e.message || e}`);
      console.error(e);
    }
  });
}

// ======================
// ★大会マスタ → 大会に含まれる試合すべてへ自動反映（未公開含む）
// ======================
async function listMatchesByTournamentId(tournamentId) {
  const tid = String(tournamentId || "").trim().toLowerCase();
  if (!tid) return [];

  // 代表者が未公開を含めて反映する必要があるため、クエリは tournamentId のみ
  // ただし write は rules で「参加者 & teamId==uid」に絞られる
  const snap = await getDocs(query(matchesCol(), where("tournamentId", "==", tid), limit(500)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function propagateOnePlayerToTournamentMatches({ tournamentId, teamUid, numberKey, name }) {
  const key = normalizePlayerNumberKey(numberKey);
  if (!key) throw new Error("背番号が空です。");

  const matches = await listMatchesByTournamentId(tournamentId);

  // 自分が当事者（teamA/teamB）として含まれる試合だけへ反映（安全）
  const targets = matches.filter((m) => String(m.teamAUid || "") === teamUid || String(m.teamBUid || "") === teamUid);

  // setDoc(merge) で試合側に upsert
  // 失敗（権限/未作成membership）しても継続し、最後に件数を返す
  let okCount = 0;
  let ngCount = 0;

  for (const m of targets) {
    try {
      await setDoc(
        matchPlayerRef(m.id, teamUid, key),
        {
          number: key,
          name: String(name || "").trim(),
          active: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          syncedFromTournament: true,
          tournamentId: String(tournamentId || "").trim().toLowerCase(),
        },
        { merge: true }
      );
      okCount++;
    } catch (e) {
      ngCount++;
      console.warn("propagate failed:", { matchId: m.id, code: e?.code, message: e?.message });
    }
  }

  return { targets: targets.length, ok: okCount, ng: ngCount };
}

async function propagateManyPlayersToTournamentMatches({ tournamentId, teamUid, rows }) {
  // 先に対象試合を確定（クエリを1回にする）
  const matches = await listMatchesByTournamentId(tournamentId);
  const targets = matches.filter((m) => String(m.teamAUid || "") === teamUid || String(m.teamBUid || "") === teamUid);

  // 書き込み回数が多いので、なるべく batch を使う（最大500）
  // rows * targets が 500 を超えやすいので、分割コミットする
  let ok = 0;
  let ng = 0;

  let batch = writeBatch(db);
  let batchOps = 0;

  const commitIfNeeded = async (force = false) => {
    if (batchOps >= 450 || (force && batchOps > 0)) {
      try {
        await batch.commit();
        ok += batchOps;
      } catch (e) {
        // commit 全体が落ちる場合はカウントを ng に寄せる
        ng += batchOps;
        console.warn("batch commit failed:", e?.code, e?.message);
      } finally {
        batch = writeBatch(db);
        batchOps = 0;
      }
    }
  };

  for (const r of rows) {
    const key = normalizePlayerNumberKey(r.number);
    const name = String(r.name || "").trim();
    if (!key || !name) continue;

    // 1) 大会マスタは setDoc(merge)（docId=背番号キー）
    //    旧random doc は消さない（読み込み側が対応）
    batch.set(
      tournamentTeamPlayerRef(tournamentId, teamUid, key),
      {
        number: key,
        name,
        active: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    batchOps++;
    await commitIfNeeded(false);

    // 2) 試合側へ展開（docId=背番号キー）
    for (const m of targets) {
      batch.set(
        matchPlayerRef(m.id, teamUid, key),
        {
          number: key,
          name,
          active: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          syncedFromTournament: true,
          tournamentId: String(tournamentId || "").trim().toLowerCase(),
        },
        { merge: true }
      );
      batchOps++;
      await commitIfNeeded(false);
    }
  }

  await commitIfNeeded(true);
  return { matches: targets.length, ok, ng };
}

// ======================
// 代表者：大会マスタ画面
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
    <li data-player-id="${escapeHtml(p.id)}">
      <span>${escapeHtml(`${p.number || "-"} ${p.name || ""}`)}</span>
      <button class="btn ghost mini" data-action="edit" style="margin-left:8px;">編集</button>
      <button class="btn ghost mini" data-action="delete" style="margin-left:8px;">削除</button>
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

        const nk = normalizePlayerNumberKey(number);
        if (!nk || !String(name).trim()) return alert("背番号と名前を入力してください。");

        // 1) 大会マスタ：背番号キーで setDoc(merge)
        await setDoc(
          tournamentTeamPlayerRef(registryTournamentId, user.uid, nk),
          {
            number: nk,
            name: String(name).trim(),
            active: true,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        // 2) 大会に含まれる試合すべてへ反映（未公開含む）
        await propagateOnePlayerToTournamentMatches({
          tournamentId: registryTournamentId,
          teamUid: user.uid,
          numberKey: nk,
          name: String(name).trim(),
        });

        // 旧random doc だったら削除（任意）
        if (pid !== nk) {
          try { await deleteDoc(doc(db, "tournaments", registryTournamentId, "teams", user.uid, "players", pid)); } catch {}
        }
      }

      if (action === "delete") {
        if (!confirm("削除しますか？")) return;
        await deleteDoc(doc(db, "tournaments", registryTournamentId, "teams", user.uid, "players", pid));
        // ※削除を試合へ反映する仕様は未実装（必要なら追加可能）
      }
    } catch (err) {
      alert(`操作失敗\n${err.code || ""}\n${err.message || err}`);
      console.error(err);
    }
  };
}

async function loadRegistry(tournamentId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const tid = String(tournamentId || "").trim();
  if (!tid) return alert("大会を選択してください。");

  registryTournamentId = tid;

  if (registryContextEl) registryContextEl.textContent = `tournamentId: ${tid} / teamId(UID): ${user.uid}`;

  unsubRegistryPlayers?.(); unsubRegistryPlayers = null;
  unsubRegistryPlayers = onSnapshot(
    query(tournamentTeamPlayersCol(tid, user.uid), orderBy("number", "asc")),
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
  const tid = registryTournamentSelectEl?.value || "";
  await loadRegistry(tid);
});

registryAddPlayerBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!registryTournamentId) return alert("先に大会を読み込んでください。");

  const number = normalizePlayerNumberKey(registryPlayerNumberEl?.value || "");
  const name = String(registryPlayerNameEl?.value || "").trim();
  if (!number || !name) return alert("背番号と選手名を入力してください。");

  try {
    // 1) 大会マスタへ setDoc(merge)（背番号キー）
    await setDoc(
      tournamentTeamPlayerRef(registryTournamentId, user.uid, number),
      {
        number,
        name,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2) 大会に含まれる試合すべてへ反映（未公開含む）
    const r = await propagateOnePlayerToTournamentMatches({
      tournamentId: registryTournamentId,
      teamUid: user.uid,
      numberKey: number,
      name,
    });

    if (registryPlayerNumberEl) registryPlayerNumberEl.value = "";
    if (registryPlayerNameEl) registryPlayerNameEl.value = "";
    registryPlayerNumberEl?.focus?.();

    // 軽いフィードバック（うるさくならない程度）
    console.log("propagate result:", r);
  } catch (e) {
    alert(`追加失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
  }
});

// Enterキーでも追加（名前欄でEnter）
registryPlayerNameEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") registryAddPlayerBtn?.click();
});

registryBulkAddBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!registryTournamentId) return alert("先に大会を読み込んでください。");

  const rows = parseBulkPlayers(registryBulkEl?.value || "");
  if (rows.length === 0) return alert("形式が不正です。例：12,山田太郎");

  try {
    // 大会マスタ＆大会内全試合へまとめて反映
    const res = await propagateManyPlayersToTournamentMatches({
      tournamentId: registryTournamentId,
      teamUid: user.uid,
      rows,
    });

    if (registryBulkEl) registryBulkEl.value = "";
    console.log("bulk propagate:", res);
  } catch (e) {
    alert(`一括追加失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
  }
});

// ======================
// 管理者：試合作成
// ======================
async function findUidByEmailLower(emailLower) {
  const q = query(usersCol(), where("emailLower", "==", emailLower), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}
async function ensureTournamentExists(tournamentId) {
  await setDoc(
    tournamentRef(tournamentId),
    {
      tournamentId,
      name: tournamentId,
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

  const selectedTid = normalizeTournamentId(adminTournamentSelectEl?.value || "");
  const newTidRaw = normalizeTournamentId(adminNewTournamentIdEl?.value || "");
  const tournamentId = newTidRaw || selectedTid;

  if (!teamAName || !teamBName) return alert("チーム名（A/B）を入力してください。");
  if (!teamAEmail || !teamBEmail) return alert("代表者メール（A/B）を入力してください。");
  if (teamAEmail === teamBEmail) return alert("代表者メールが同一です。別のメールを入力してください。");
  if (!tournamentId) return alert("大会種別（選択 or 新規作成）を指定してください。");
  if (!validTournamentId(tournamentId)) return alert("tournamentId 形式が不正です（例：2025spring / wuc_2026）。");

  const title = `${teamAName} vs ${teamBName}`;
  const joinCode = randomJoinCode(8);

  if (createMatchBtn) createMatchBtn.disabled = true;
  if (adminInfoEl) adminInfoEl.textContent = "作成中...";

  try {
    const uidA = await findUidByEmailLower(teamAEmail);
    if (!uidA) throw new Error(`チームAのメールが users に見つかりません（${teamAEmail}）。先に代表者が登録/UID確認を完了してください。`);
    const uidB = await findUidByEmailLower(teamBEmail);
    if (!uidB) throw new Error(`チームBのメールが users に見つかりません（${teamBEmail}）。先に代表者が登録/UID確認を完了してください。`);

    await ensureTournamentExists(tournamentId);

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
      // 公開設定は別タスクで増やす想定。既存互換のため初期は公開扱いにしないなら false に変えてOK
      published: true,
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
tournamentId=${tournamentId}
招待：${teamAEmail}, ${teamBEmail}`;
    if (adminInfoEl) adminInfoEl.textContent = msg;

    alert(`試合作成OK\n${title}\n大会：${tournamentId}\njoinCode: ${joinCode}\n※チーム側はログイン後に試合一覧へ反映されます。`);

    if (isAdminUser) await renderAdminAllMatches();
    if (adminNewTournamentIdEl) adminNewTournamentIdEl.value = "";
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

  try {
    isAdminUser = await isGlobalAdmin(user.uid);
  } catch {
    isAdminUser = false;
  }

  adminSection && (adminSection.style.display = isAdminUser ? "block" : "none");

  try {
    await loadTournamentOptions();
  } catch (e) {
    console.warn("loadTournamentOptions failed:", e);
  }

  showRepHome();
}

// 代表者ホーム導線
openPlayerRegistryBtn?.addEventListener("click", () => {
  showPlayerRegistryScreen();
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

backToHomeBtn?.addEventListener("click", () => {
  showRepHome();
});

goToMatchesBtn?.addEventListener("click", async () => {
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

// ======================
// Auth UI
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
    cleanupRealtimeAll();
    currentMatchId = null;
    currentMatch = null;
    currentTournamentId = null;
    currentMembership = null;
    matchTimer = { status: "stopped", baseMs: 0, startedAt: null };
    scoreByTeam = {};
    latestEvents = [];
    registryTournamentId = null;
    registryAllPlayers = [];
    leftTeam = { uid: "", name: "—" };
    rightTeam = { uid: "", name: "—" };

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

  await showPostLoginUI(user);
});
