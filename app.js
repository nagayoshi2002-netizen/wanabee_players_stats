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
const topStatusEl = document.getElementById("top-status");

// Login
const loginSection = document.getElementById("login-section");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusEl = document.getElementById("login-status");

// UID verify
const uidVerifySection = document.getElementById("uid-verify-section");
const uidDisplayEl = document.getElementById("uid-display");
const uidInputEl = document.getElementById("uid-input");
const uidHintEl = document.getElementById("uid-hint");
const uidVerifyBtn = document.getElementById("uid-verify-btn");

// Admin enroll (invite link)
const adminEnrollSection = document.getElementById("admin-enroll-section");
const adminEnrollBtn = document.getElementById("admin-enroll-btn");
const adminEnrollCancelBtn = document.getElementById("admin-enroll-cancel-btn");
const adminEnrollStatusEl = document.getElementById("admin-enroll-status");

// Rep home
const repHomeSection = document.getElementById("rep-home-section");
const openPlayerRegistryBtn = document.getElementById("open-player-registry-btn");
const openMatchesBtn = document.getElementById("open-matches-btn");

// Player registry
const playerRegistrySection = document.getElementById("player-registry-section");
const backToHomeBtn = document.getElementById("back-to-home-btn");
const goToMatchesBtn = document.getElementById("go-to-matches-btn");
const registryTournamentSelectEl = document.getElementById("registry-tournament-select");
const loadRegistryBtn = document.getElementById("load-registry-btn");
const registryContextEl = document.getElementById("registry-context");
const registryBulkEl = document.getElementById("registry-bulk");
const registryBulkAddBtn = document.getElementById("registry-bulk-add-btn");
const registryPlayerNumberEl = document.getElementById("registry-player-number");
const registryPlayerNameEl = document.getElementById("registry-player-name");
const registryAddPlayerBtn = document.getElementById("registry-add-player-btn");
const registryPlayersListEl = document.getElementById("registry-players-list");
const registrySearchEl = document.getElementById("registry-search");
const registryClearSearchBtn = document.getElementById("registry-clear-search-btn");

// Registry matches (dropdown)
const registryMatchesBoxEl = document.getElementById("registry-matches-box");
const registryMatchSelectEl = document.getElementById("registry-match-select");
const registryOpenMatchBtn = document.getElementById("registry-open-match-btn");

// Admin match creation
const adminSection = document.getElementById("admin-section");
const adminBackToMatchesBtn = document.getElementById("admin-back-to-matches-btn");
const teamANameEl = document.getElementById("team-a-name");
const teamBNameEl = document.getElementById("team-b-name");
const teamAEmailEl = document.getElementById("team-a-email");
const teamBEmailEl = document.getElementById("team-b-email");
const adminTournamentSelectEl = document.getElementById("admin-tournament-select");
const adminNewTournamentIdEl = document.getElementById("admin-new-tournament-id");
const createMatchBtn = document.getElementById("create-match-btn");
const adminInfoEl = document.getElementById("admin-info");

// Matches screen
const matchesSection = document.getElementById("matches-section");
const matchesBackToHomeBtn = document.getElementById("matches-back-to-home-btn");
const matchesOpenRegistryBtn = document.getElementById("matches-open-registry-btn");
const matchesOpenCreateBtn = document.getElementById("matches-open-create-btn");

const matchesAdminBlock = document.getElementById("matches-admin-block");
const adminMatchesListEl = document.getElementById("admin-matches-list");
const matchesListEl = document.getElementById("matches-list");

// Admin invite UI
const adminInviteBtn = document.getElementById("admin-invite-btn");
const adminInviteBox = document.getElementById("admin-invite-box");
const adminInviteUrlEl = document.getElementById("admin-invite-url");
const adminInviteCopyBtn = document.getElementById("admin-invite-copy-btn");

// Admin matches tournament filter
const adminMatchesTournamentFilterEl = document.getElementById("admin-matches-tournament-filter");

// Team admin (match players only)
const teamAdminSection = document.getElementById("team-admin-section");
const teamAdminContextEl = document.getElementById("team-admin-context");
const backToMatchesFromAdminBtn = document.getElementById("back-to-matches-from-admin-btn");
const goToScoreFromAdminBtn = document.getElementById("go-to-score-from-admin-btn");
const bulkMatchPlayersEl = document.getElementById("bulk-match-players");
const bulkAddMatchBtn = document.getElementById("bulk-add-match-btn");
const matchPlayerNumberEl = document.getElementById("match-player-number");
const matchPlayerNameEl = document.getElementById("match-player-name");
const addMatchPlayerBtn = document.getElementById("add-match-player-btn");
const matchPlayersListEl = document.getElementById("match-players-list");

// Score screen
const scoreSection = document.getElementById("score-section");
const backToMatchesBtn = document.getElementById("back-to-matches-btn");
const openTeamAdminBtn = document.getElementById("open-team-admin-btn");

const startTimerBtn = document.getElementById("start-timer-btn");
const stopTimerBtn = document.getElementById("stop-timer-btn");
const resetTimerBtn = document.getElementById("reset-timer-btn");
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
let currentMembership = null;
let isAdminUser = false;

// tournaments cache: [{id,name}]
let tournamentOptions = [];

// registry
let registryTournamentId = null;
let registryAllPlayers = [];
let registryTargetMatches = []; // [{id,title}]
let latestEvents = [];

// teams
let leftTeam = { uid: "", name: "—" };
let rightTeam = { uid: "", name: "—" };

// shared timer
let matchTimer = { status: "stopped", baseMs: 0, startedAt: null };
let scoreByTeam = {};

// realtime unsub
let unsubMatchDoc = null;
let unsubEvents = null;
let unsubScoreAgg = null;
let unsubPlayersForSelect = null;

let unsubMatchPlayers = null;
let unsubRegistryPlayers = null;

let uiTickerId = null;
let uidVerifyBound = false;

// admin invite token from URL
const adminTokenFromUrl = new URLSearchParams(location.search).get("admin_token") || "";

// ======================
// utils
// ======================
function pad2(n) { return String(n).padStart(2, "0"); }
function msToMMSS(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
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

function playerKeyFromNumber(number) {
  const k = String(number || "").trim();
  return k; // 背番号キーは空不可
}

function setTopStatus(text) { if (topStatusEl) topStatusEl.textContent = text || ""; }

// token generator (URL-safe)
function randomToken(len = 24) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

// ======================
// refs
// ======================
function usersCol() { return collection(db, "users"); }
function userRef(uid) { return doc(db, "users", uid); }
function adminsRef(uid) { return doc(db, "admins", uid); }

function adminInviteTokenRef(token) { return doc(db, "adminInviteTokens", token); }

function tournamentsCol() { return collection(db, "tournaments"); }
function tournamentRef(tournamentId) { return doc(db, "tournaments", tournamentId); }
function tournamentTeamPlayersCol(tournamentId, teamId) {
  return collection(db, "tournaments", tournamentId, "teams", teamId, "players");
}
function tournamentTeamPlayerRef(tournamentId, teamId, playerId) {
  return doc(db, "tournaments", tournamentId, "teams", teamId, "players", playerId);
}

function matchesCol() { return collection(db, "matches"); }
function matchRef(matchId) { return doc(db, "matches", matchId); }
function membershipsCol(matchId) { return collection(db, "matches", matchId, "memberships"); }
function membershipRef(matchId, uid) { return doc(db, "matches", matchId, "memberships", uid); }
function invitesCol() { return collection(db, "invites"); }
function inviteRef(inviteId) { return doc(db, "invites", inviteId); }

function eventsCol(matchId) { return collection(db, "matches", matchId, "events"); }
function eventRef(matchId, eventId) { return doc(db, "matches", matchId, "events", eventId); }

function matchPlayersCol(matchId, teamId) {
  return collection(db, "matches", matchId, "teams", teamId, "players");
}
function matchPlayerRef(matchId, teamId, playerId) {
  return doc(db, "matches", matchId, "teams", teamId, "players", playerId);
}

function joinCodeRef(codeUpper) { return doc(db, "joinCodes", codeUpper); }

// ======================
// sections
// ======================
function hideAllMainSections() {
  adminEnrollSection && (adminEnrollSection.style.display = "none");
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
function showAdminCreateScreen() { hideAllMainSections(); adminSection && (adminSection.style.display = "block"); }
function showScoreScreen() { hideAllMainSections(); scoreSection && (scoreSection.style.display = "block"); }
function showTeamAdminScreen() { hideAllMainSections(); teamAdminSection && (teamAdminSection.style.display = "block"); }
function showAdminEnrollScreen() { hideAllMainSections(); adminEnrollSection && (adminEnrollSection.style.display = "block"); }

function setLoginVisibility(isAuthed) {
  if (loginSection) loginSection.style.display = isAuthed ? "none" : "block";
  if (logoutBtn) logoutBtn.style.display = isAuthed ? "inline-flex" : "none";
  if (signupBtn) signupBtn.style.display = isAuthed ? "none" : "inline-flex";
  if (loginBtn) loginBtn.style.display = isAuthed ? "none" : "inline-flex";
}

// ======================
// auth helpers
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
// cleanup
// ======================
function cleanupRealtimeMatchOnly() {
  unsubMatchDoc?.(); unsubMatchDoc = null;
  unsubEvents?.(); unsubEvents = null;
  unsubScoreAgg?.(); unsubScoreAgg = null;
  unsubPlayersForSelect?.(); unsubPlayersForSelect = null;
  stopUiTicker();
}
function cleanupRealtimeAll() {
  cleanupRealtimeMatchOnly();
  unsubMatchPlayers?.(); unsubMatchPlayers = null;
  unsubRegistryPlayers?.(); unsubRegistryPlayers = null;
}
function stopUiTicker() {
  if (uiTickerId) { clearInterval(uiTickerId); uiTickerId = null; }
}
function startUiTicker() {
  stopUiTicker();
  uiTickerId = window.setInterval(() => renderTimerAndScoreboard(), 250);
  renderTimerAndScoreboard();
}

// ======================
// tournaments list
// ======================
async function loadTournamentOptions() {
  const snap = await getDocs(query(tournamentsCol(), orderBy("createdAt", "desc"), limit(200)));
  tournamentOptions = snap.docs.map((d) => {
    const data = d.data() || {};
    return { id: d.id, name: String(data.name || d.id) };
  });

  const fill = (selectEl, placeholderText, includeAll = false) => {
    if (!selectEl) return;
    const current = selectEl.value || "";
    selectEl.innerHTML = "";

    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = includeAll ? "すべて" : placeholderText;
    selectEl.appendChild(opt0);

    for (const it of tournamentOptions) {
      const opt = document.createElement("option");
      opt.value = it.id;
      opt.textContent = `${it.name}（${it.id}）`;
      selectEl.appendChild(opt);
    }
    selectEl.value = current;
  };

  fill(registryTournamentSelectEl, "大会を選択", false);
  fill(adminTournamentSelectEl, "大会種別（選択）", false);
  fill(adminMatchesTournamentFilterEl, "すべて", true);
}

// ======================
// Invites / matches list (team side)
// ======================
async function fetchInvitesForUid(uid) {
  const q = query(invitesCol(), where("teamUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    alert(`invites 読み込み失敗\n${e.code}\n${e.message}`);
    console.error(e);
    return;
  }

  if (invites.length === 0) {
    matchesListEl.innerHTML = "<li>参加可能な試合がありません。</li>";
    return;
  }

  // invite → match read（代表者は isPublic=true のみ表示）
  for (const inv of invites) {
    try {
      const ms = await getDoc(matchRef(inv.matchId));
      if (!ms.exists()) continue;

      const m = { id: ms.id, ...ms.data() };

      // ★代表者は未公開を表示しない（管理者は常に表示）
      const isPublic = m.isPublic === true;
      if (!isAdminUser && !isPublic) continue;

      const li = document.createElement("li");
      li.innerHTML = `
        <div class="match-item">
          <div class="match-title">${escapeHtml(formatMatchLabel(m))}</div>
          <div class="match-actions">
            <button class="btn ghost" data-action="manage">選手管理</button>
            <button class="btn" data-action="enter">試合入力</button>
          </div>
        </div>
      `;

      li.querySelector('[data-action="manage"]')?.addEventListener("click", async (e) => {
        e.stopPropagation();
        await openTeamAdmin(inv.matchId);
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

  if (matchesListEl.children.length === 0) {
    matchesListEl.innerHTML = "<li>公開中の試合がありません。</li>";
  }
}

// ======================
// Admin: matches list with tournament filter
// ======================
function matchTournamentName(matchDoc) {
  const tid = String(matchDoc?.tournamentId || "");
  const found = tournamentOptions.find((t) => t.id === tid);
  return found ? found.name : tid || "（未設定）";
}

async function fetchAdminMatchesByTournament(tournamentIdOrEmpty) {
  let snap;
  if (tournamentIdOrEmpty) {
    snap = await getDocs(query(matchesCol(), where("tournamentId", "==", tournamentIdOrEmpty), limit(300)));
  } else {
    snap = await getDocs(query(matchesCol(), limit(300)));
  }

  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => {
    const am = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bm = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bm - am;
  });
  return rows;
}

async function renderAdminMatches() {
  if (!adminMatchesListEl) return;

  adminMatchesListEl.innerHTML = "<li>読み込み中...</li>";
  const tid = String(adminMatchesTournamentFilterEl?.value || "");

  try {
    const matches = await fetchAdminMatchesByTournament(tid);

    if (matches.length === 0) {
      adminMatchesListEl.innerHTML = "<li>試合がありません。</li>";
      return;
    }

    adminMatchesListEl.innerHTML = "";
    for (const m of matches) {
      const tourName = matchTournamentName(m);
      const title = formatMatchLabel(m);
      const isPublic = m.isPublic === true;

      const li = document.createElement("li");
      li.innerHTML = `
        <div class="match-item">
          <div>
            <div class="match-title">${escapeHtml(title)}</div>
            <div class="hint" style="margin-top:4px;">大会：${escapeHtml(tourName)} / 公開：${isPublic ? "公開" : "非公開"}</div>
          </div>
          <div class="match-actions">
            <button class="btn ghost" data-action="toggle">${isPublic ? "非公開にする" : "公開にする"}</button>
            <button class="btn" data-action="enter">試合入力（閲覧）</button>
          </div>
        </div>
      `;

      li.querySelector('[data-action="enter"]')?.addEventListener("click", async () => {
        await enterMatch(m.id);
      });

      li.querySelector('[data-action="toggle"]')?.addEventListener("click", async () => {
        const ok = confirm(`「${title}」を ${isPublic ? "非公開" : "公開"} に切り替えますか？`);
        if (!ok) return;
        try {
          await updateDoc(matchRef(m.id), { isPublic: !isPublic, updatedAt: serverTimestamp() });
          await renderAdminMatches();
        } catch (e) {
          alert(`公開設定の更新に失敗\n${e.code || ""}\n${e.message || e}`);
          console.error(e);
        }
      });

      adminMatchesListEl.appendChild(li);
    }
  } catch (e) {
    adminMatchesListEl.innerHTML = "<li>読み込み失敗</li>";
    console.error(e);
  }
}

// ======================
// Admin: invite link (adminInviteTokens)
// ======================
async function createAdminInviteLink() {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!isAdminUser) return alert("管理者のみ実行できます。");

  const token = randomToken(24);
  try {
    await setDoc(adminInviteTokenRef(token), {
      token,
      used: false,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });

    const url = `${location.origin}${location.pathname}?admin_token=${encodeURIComponent(token)}`;
    if (adminInviteUrlEl) adminInviteUrlEl.value = url;

    if (adminInviteBox) adminInviteBox.style.display = "block";
  } catch (e) {
    alert(`招待リンク作成失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
  }
}

adminInviteBtn?.addEventListener("click", createAdminInviteLink);

adminInviteCopyBtn?.addEventListener("click", async () => {
  const v = String(adminInviteUrlEl?.value || "");
  if (!v) return;
  try {
    await navigator.clipboard.writeText(v);
    alert("コピーしました。");
  } catch {
    alert("コピーに失敗しました。");
  }
});

// ======================
// Admin enroll flow (from URL token)
// ======================
async function tryShowAdminEnrollUI(user) {
  if (!adminTokenFromUrl) return false;

  // 既に管理者なら不要
  const already = await isGlobalAdmin(user.uid);
  if (already) {
    history.replaceState({}, "", location.pathname);
    return false;
  }

  // tokenの存在/未使用を確認
  try {
    const ts = await getDoc(adminInviteTokenRef(adminTokenFromUrl));
    if (!ts.exists()) {
      alert("招待トークンが無効です（存在しません）。");
      history.replaceState({}, "", location.pathname);
      return false;
    }
    const t = ts.data() || {};
    if (t.used === true) {
      alert("この招待トークンは既に使用済みです。");
      history.replaceState({}, "", location.pathname);
      return false;
    }
  } catch (e) {
    console.error(e);
    alert(`招待トークン確認に失敗\n${e.code || ""}\n${e.message || e}`);
    return false;
  }

  if (adminEnrollStatusEl) adminEnrollStatusEl.textContent = `${adminTokenFromUrl}`;
  showAdminEnrollScreen();
  return true;
}

async function enrollAsAdminWithToken() {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!adminTokenFromUrl) return alert("招待トークンがありません。");

  if (adminEnrollBtn) adminEnrollBtn.disabled = true;
  if (adminEnrollStatusEl) adminEnrollStatusEl.textContent = `登録処理中：${adminTokenFromUrl}`;

  try {
    const tokenSnap = await getDoc(adminInviteTokenRef(adminTokenFromUrl));
    if (!tokenSnap.exists()) throw new Error("招待トークンが無効です。");
    const tokenData = tokenSnap.data() || {};
    if (tokenData.used === true) throw new Error("この招待トークンは使用済みです。");

    const batch = writeBatch(db);
    batch.set(
      adminsRef(user.uid),
      { uid: user.uid, inviteToken: adminTokenFromUrl, createdAt: serverTimestamp() },
      { merge: true }
    );
    batch.update(adminInviteTokenRef(adminTokenFromUrl), {
      used: true,
      usedBy: user.uid,
      usedAt: serverTimestamp(),
    });
    await batch.commit();

    isAdminUser = true;

    // URLをきれいに（トークンを消す）
    history.replaceState({}, "", location.pathname);

    alert("管理者登録が完了しました。");
    await showPostLoginUI(user);
  } catch (e) {
    alert(`管理者登録に失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
    if (adminEnrollStatusEl) adminEnrollStatusEl.textContent = "管理者登録に失敗しました。";
  } finally {
    if (adminEnrollBtn) adminEnrollBtn.disabled = false;
  }
}

adminEnrollBtn?.addEventListener("click", enrollAsAdminWithToken);
adminEnrollCancelBtn?.addEventListener("click", () => {
  history.replaceState({}, "", location.pathname);
  showRepHome();
});

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

// teams fallback: membershipsから取得（古いmatchにteamAUid/BUidが無い場合）
async function inferTeamsFromMemberships(matchId) {
  try {
    const snap = await getDocs(query(membershipsCol(matchId), limit(20)));
    const rows = snap.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .filter((x) => x.role === "team");

    if (rows.length >= 2) {
      leftTeam = { uid: rows[0].uid, name: String(rows[0].teamName || "Team A") };
      rightTeam = { uid: rows[1].uid, name: String(rows[1].teamName || "Team B") };
      return true;
    }
  } catch (e) {
    console.warn("inferTeamsFromMemberships failed:", e);
  }
  return false;
}

function inferTeamsFromMatchDoc(m) {
  const aUid = String(m?.teamAUid || "");
  const bUid = String(m?.teamBUid || "");
  const aName = String(m?.teamAName || "").trim();
  const bName = String(m?.teamBName || "").trim();

  if (aUid && bUid) {
    leftTeam = { uid: aUid, name: aName || "Team A" };
    rightTeam = { uid: bUid, name: bName || "Team B" };
    return true;
  }
  return false;
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
    await updateDoc(matchRef(currentMatchId), { timer: next, updatedAt: serverTimestamp() });
  } catch (e) {
    console.error("timer update failed:", e);
    setTimerShareStatus("タイマー共有に失敗", true);
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
    const label = `${p.number || p.id || "-"} ${p.name || ""}`.trim() || p.id;
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
    return `${p.number || playerId || "-"} ${p.name || ""}`.trim() || playerId;
  } catch {
    return playerId;
  }
}

// ======================
// Events（得点/キャラハン）
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
    await setDoc(
      doc(eventsCol(currentMatchId)),
      {
        type,
        timeMs,
        teamId: teamUid,
        teamName,
        scorerPlayerId: scorerId,
        assistPlayerId: type === "goal" ? assistId : "",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );
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

    const teamName = String(
      ev.teamName ||
      (ev.teamId === leftTeam.uid ? leftTeam.name :
        ev.teamId === rightTeam.uid ? rightTeam.name :
          ev.teamId || "")
    );

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

    // ★編集ボタン非表示（削除のみ）
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

// delete handler (delegation)
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

// score aggregate
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
    (err) => console.error("score aggregate failed:", err)
  );
}

// ======================
// Enter match
// ======================
async function enterMatch(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  cleanupRealtimeMatchOnly();

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
    async (snap) => {
      if (!snap.exists()) {
        alert("試合情報が見つかりません。");
        return;
      }

      currentMatch = { id: snap.id, ...snap.data() };
      currentTournamentId = currentMatch.tournamentId ? String(currentMatch.tournamentId) : null;

      // teams
      const ok = inferTeamsFromMatchDoc(currentMatch);
      if (!ok) {
        await inferTeamsFromMemberships(matchId);
      }

      // timer
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

  // players for select (team only; others empty)
  unsubPlayersForSelect = onSnapshot(
    query(matchPlayersCol(matchId, user.uid), orderBy("number", "asc")),
    (snap) => {
      const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rebuildSelect(playerSelectEl, "得点した選手を選択", players);
      rebuildSelect(assistSelectEl, "アシスト（任意）", players);
    },
    () => {
      rebuildSelect(playerSelectEl, "得点した選手を選択", []);
      rebuildSelect(assistSelectEl, "アシスト（任意）", []);
    }
  );

  await subscribeEvents(matchId);
  subscribeScoreAggregate(matchId);

  showScoreScreen();
  setTimerShareStatus("");
  setEventControlsAvailability();
}

// back from score
backToMatchesBtn?.addEventListener("click", async () => {
  cleanupRealtimeMatchOnly();

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
    if (isAdminUser) await renderAdminMatches();
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
recordGoalBtn?.addEventListener("click", async () => await recordEvent("goal"));
recordCallahanBtn?.addEventListener("click", async () => await recordEvent("callahan"));

// ======================
// Team admin (match players) with setDoc(number-key)
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

function renderPlayersListSimple(listEl, players, onDelete) {
  if (!listEl) return;
  if (players.length === 0) {
    listEl.innerHTML = "<li>まだ登録されていません。</li>";
    return;
  }
  listEl.innerHTML = players.map((p) => `
    <li data-player-id="${escapeHtml(p.id)}">
      <span>${escapeHtml(`${p.number || p.id || "-"} ${p.name || ""}`)}</span>
      <button class="btn ghost mini" data-action="delete" style="margin-left:8px;">削除</button>
    </li>
  `).join("");

  listEl.onclick = async (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;

    const li = e.target.closest("li");
    const pid = li?.getAttribute("data-player-id");
    if (!pid) return;

    if (!confirm("削除しますか？")) return;
    await onDelete(pid);
  };
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
      if (isAdminUser) await renderAdminMatches();
    }
  });

  goToScoreFromAdminBtn && (goToScoreFromAdminBtn.onclick = async () => {
    await enterMatch(matchId);
  });

  unsubMatchPlayers?.(); unsubMatchPlayers = null;
  unsubMatchPlayers = onSnapshot(
    query(matchPlayersCol(matchId, user.uid), orderBy("number", "asc")),
    (snap) => {
      const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderPlayersListSimple(matchPlayersListEl, players, async (pid) => {
        await deleteDoc(matchPlayerRef(matchId, user.uid, pid));
      });
    },
    (err) => {
      alert(`試合選手読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );

  // individual add (setDoc merge by number)
  addMatchPlayerBtn && (addMatchPlayerBtn.onclick = async () => {
    const number = (matchPlayerNumberEl?.value || "").trim();
    const name = (matchPlayerNameEl?.value || "").trim();
    if (!number || !name) return alert("背番号と名前を入力してください。");

    const key = playerKeyFromNumber(number);
    if (!key) return alert("背番号が不正です。");

    await setDoc(
      matchPlayerRef(matchId, user.uid, key),
      { number: key, name, active: true, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
      { merge: true }
    );

    if (matchPlayerNumberEl) matchPlayerNumberEl.value = "";
    if (matchPlayerNameEl) matchPlayerNameEl.value = "";
  });

  // bulk add (batched)
  bulkAddMatchBtn && (bulkAddMatchBtn.onclick = async () => {
    const rows = parseBulkPlayers(bulkMatchPlayersEl?.value || "");
    if (rows.length === 0) return alert("形式が不正です。例：12,山田太郎");

    let batch = writeBatch(db);
    let n = 0;
    for (const r of rows) {
      const key = playerKeyFromNumber(r.number);
      if (!key) continue;
      batch.set(
        matchPlayerRef(matchId, user.uid, key),
        { number: key, name: r.name, active: true, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
        { merge: true }
      );
      n++;
      if (n >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        n = 0;
      }
    }
    if (n > 0) await batch.commit();

    if (bulkMatchPlayersEl) bulkMatchPlayersEl.value = "";
  });
}

// ======================
// Player registry (tournament master + auto reflect to all matches in tournament)
// ======================
function renderRegistryList() {
  if (!registryPlayersListEl) return;

  const q = String(registrySearchEl?.value || "").trim().toLowerCase();
  const filtered = q
    ? registryAllPlayers.filter((p) => {
        const s = `${p.number || p.id || ""} ${p.name || ""}`.toLowerCase();
        return s.includes(q);
      })
    : registryAllPlayers;

  if (filtered.length === 0) {
    registryPlayersListEl.innerHTML = "<li>まだ登録されていません。</li>";
    return;
  }

  registryPlayersListEl.innerHTML = filtered.map((p) => `
    <li data-player-id="${escapeHtml(p.id)}">
      <span>${escapeHtml(`${p.number || p.id || "-"} ${p.name || ""}`)}</span>
      <button class="btn ghost mini" data-action="delete" style="margin-left:8px;">削除</button>
    </li>
  `).join("");

  registryPlayersListEl.onclick = async (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;

    const li = e.target.closest("li");
    const pid = li?.getAttribute("data-player-id");
    if (!pid) return;

    if (!confirm("削除しますか？")) return;

    const user = auth.currentUser;
    if (!user) return;
    if (!registryTournamentId) return;

    try {
      await deleteDoc(tournamentTeamPlayerRef(registryTournamentId, user.uid, pid));
    } catch (err) {
      alert(`削除失敗\n${err.code || ""}\n${err.message || err}`);
      console.error(err);
    }
  };
}

// 大会に含まれる試合を取得（あなたのチーム参加分）
async function loadMyMatchesInTournament(tournamentId, userUid) {
  const snap = await getDocs(query(matchesCol(), where("tournamentId", "==", tournamentId), limit(300)));
  const matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const mine = matches.filter((m) => String(m.teamAUid || "") === userUid || String(m.teamBUid || "") === userUid);
  mine.sort((a, b) => {
    const am = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bm = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bm - am;
  });

  return mine.map((m) => ({ id: m.id, title: formatMatchLabel(m) }));
}

function fillRegistryMatchSelect(matches) {
  if (!registryMatchSelectEl) return;
  registryMatchSelectEl.innerHTML = "";
  const o0 = document.createElement("option");
  o0.value = "";
  o0.textContent = "（確認用）試合を選択";
  registryMatchSelectEl.appendChild(o0);

  for (const m of matches) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.title;
    registryMatchSelectEl.appendChild(opt);
  }
}

async function propagatePlayersToMatches(teamUid, players) {
  const matchIds = registryTargetMatches.map((m) => m.id);
  if (matchIds.length === 0) return;

  let batch = writeBatch(db);
  let ops = 0;

  for (const matchId of matchIds) {
    for (const p of players) {
      const key = playerKeyFromNumber(p.number);
      if (!key) continue;

      batch.set(
        matchPlayerRef(matchId, teamUid, key),
        {
          number: key,
          name: p.name,
          active: true,
          fromTournament: registryTournamentId,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      ops++;
      if (ops >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    }
  }

  if (ops > 0) await batch.commit();
}

async function loadRegistry(tournamentId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const tid = String(tournamentId || "").trim();
  if (!tid) return alert("大会を選択してください。");

  registryTournamentId = tid;
  registryTargetMatches = [];

  if (registryContextEl) registryContextEl.textContent = `tournamentId: ${tid} / teamId(UID): ${user.uid}`;

  // 大会に含まれる試合（自チーム参加分）を読み込み → プルダウン反映
  try {
    registryTargetMatches = await loadMyMatchesInTournament(tid, user.uid);
    if (registryMatchesBoxEl) registryMatchesBoxEl.style.display = "block";
    fillRegistryMatchSelect(registryTargetMatches);
  } catch (e) {
    console.warn("loadMyMatchesInTournament failed:", e);
    if (registryMatchesBoxEl) registryMatchesBoxEl.style.display = "none";
    registryTargetMatches = [];
  }

  // 大会マスタ：購読
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

registryOpenMatchBtn?.addEventListener("click", async () => {
  const mid = String(registryMatchSelectEl?.value || "");
  if (!mid) return alert("試合を選択してください。");
  await enterMatch(mid);
});

registrySearchEl?.addEventListener("input", renderRegistryList);
registryClearSearchBtn?.addEventListener("click", () => {
  if (registrySearchEl) registrySearchEl.value = "";
  renderRegistryList();
});

loadRegistryBtn?.addEventListener("click", async () => {
  const tid = registryTournamentSelectEl?.value || "";
  await loadRegistry(tid);
});

// 個別追加：大会マスタへ setDoc(merge) + 大会の参加試合へ自動反映
registryAddPlayerBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!registryTournamentId) return alert("先に大会を読み込んでください。");

  const numberRaw = String(registryPlayerNumberEl?.value || "").trim();
  const name = String(registryPlayerNameEl?.value || "").trim();
  if (!numberRaw || !name) return alert("背番号と選手名を入力してください。");

  const key = playerKeyFromNumber(numberRaw);
  if (!key) return alert("背番号が不正です。");

  try {
    await setDoc(
      tournamentTeamPlayerRef(registryTournamentId, user.uid, key),
      { number: key, name, active: true, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
      { merge: true }
    );

    await propagatePlayersToMatches(user.uid, [{ number: key, name }]);

    if (registryPlayerNumberEl) registryPlayerNumberEl.value = "";
    if (registryPlayerNameEl) registryPlayerNameEl.value = "";
    registryPlayerNumberEl?.focus?.();
  } catch (e) {
    alert(`追加失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
  }
});

// Enterキーでも追加（名前欄でEnter）
registryPlayerNameEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") registryAddPlayerBtn?.click();
});

// 一括追加：大会マスタへ setDoc(merge) + 大会の参加試合へ自動反映（バッチ）
registryBulkAddBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!registryTournamentId) return alert("先に大会を読み込んでください。");

  const rows = parseBulkPlayers(registryBulkEl?.value || "");
  if (rows.length === 0) return alert("形式が不正です。例：12,山田太郎");

  try {
    let batch = writeBatch(db);
    let n = 0;

    const normalized = [];
    for (const r of rows) {
      const key = playerKeyFromNumber(r.number);
      if (!key) continue;
      normalized.push({ number: key, name: r.name });

      batch.set(
        tournamentTeamPlayerRef(registryTournamentId, user.uid, key),
        { number: key, name: r.name, active: true, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
        { merge: true }
      );
      n++;
      if (n >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        n = 0;
      }
    }
    if (n > 0) await batch.commit();

    await propagatePlayersToMatches(user.uid, normalized);

    if (registryBulkEl) registryBulkEl.value = "";
    alert("登録しました（大会の参加試合へ自動反映）。");
  } catch (e) {
    alert(`一括追加失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
  }
});

// ======================
// Admin: match creation (atomic batch)
// ======================
async function findUidByEmailLower(emailLower) {
  const q = query(usersCol(), where("emailLower", "==", emailLower), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

function randomJoinCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

createMatchBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!isAdminUser) return alert("管理者権限がありません。");

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

    const matchDocRef = doc(matchesCol()); // ★事前にdocRef確保（batch化）
    const matchId = matchDocRef.id;

    // invitesは決定的IDにして冪等に（部分成功・重複を抑制）
    const invAId = `${matchId}_${uidA}`;
    const invBId = `${matchId}_${uidB}`;

    const batch = writeBatch(db);

    // tournaments ensure
    batch.set(
      tournamentRef(tournamentId),
      { tournamentId, name: tournamentId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true }
    );

    // match
    batch.set(matchDocRef, {
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
      isPublic: false, // デフォルト非公開
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // memberships（★代表者側も管理者が作成 → 代表者が書けずにエラー、を潰す）
    batch.set(membershipRef(matchId, user.uid), {
      role: "admin",
      teamName: "Admin",
      createdAt: serverTimestamp(),
    });
    batch.set(membershipRef(matchId, uidA), {
      role: "team",
      teamName: teamAName,
      createdAt: serverTimestamp(),
    });
    batch.set(membershipRef(matchId, uidB), {
      role: "team",
      teamName: teamBName,
      createdAt: serverTimestamp(),
    });

    // join code
    batch.set(joinCodeRef(joinCode), {
      matchId,
      createdAt: serverTimestamp(),
    });

    // invites
    batch.set(inviteRef(invAId), {
      teamUid: uidA,
      matchId,
      teamName: teamAName,
      role: "team",
      createdAt: serverTimestamp(),
      usedAt: null,
    });
    batch.set(inviteRef(invBId), {
      teamUid: uidB,
      matchId,
      teamName: teamBName,
      role: "team",
      createdAt: serverTimestamp(),
      usedAt: null,
    });

    await batch.commit();

    const msg = `作成完了：${title}
matchId=${matchId}
joinCode=${joinCode}
tournamentId=${tournamentId}
招待：${teamAEmail}, ${teamBEmail}`;
    if (adminInfoEl) adminInfoEl.textContent = msg;

    alert(`試合作成OK\n${title}\n大会：${tournamentId}\njoinCode: ${joinCode}\n※公開に切り替えると代表者に表示されます。`);

    if (isAdminUser) await renderAdminMatches();
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
// UID verify (users/{uid})
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
          { uid: currentUser.uid, email, emailLower, verifiedAt: serverTimestamp(), createdAt: serverTimestamp() },
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

  // tournaments
  try {
    await loadTournamentOptions();
  } catch (e) {
    console.warn("loadTournamentOptions failed:", e);
  }

  // admin UI
  if (matchesOpenCreateBtn) matchesOpenCreateBtn.style.display = isAdminUser ? "inline-flex" : "none";
  matchesAdminBlock && (matchesAdminBlock.style.display = isAdminUser ? "block" : "none");

  // 初期：メニュー
  showRepHome();
}

// ======================
// Navigation buttons
// ======================
openPlayerRegistryBtn?.addEventListener("click", () => {
  showPlayerRegistryScreen();
});

openMatchesBtn?.addEventListener("click", async () => {
  showMatchesScreen();
  const user = auth.currentUser;
  if (user) {
    await renderTeamMatchesFromInvites(user);
    if (isAdminUser) await renderAdminMatches();
  }
});

backToHomeBtn?.addEventListener("click", () => showRepHome());

goToMatchesBtn?.addEventListener("click", async () => {
  showMatchesScreen();
  const user = auth.currentUser;
  if (user) {
    await renderTeamMatchesFromInvites(user);
    if (isAdminUser) await renderAdminMatches();
  }
});

matchesBackToHomeBtn?.addEventListener("click", () => showRepHome());

matchesOpenRegistryBtn?.addEventListener("click", () => showPlayerRegistryScreen());

matchesOpenCreateBtn?.addEventListener("click", () => {
  showAdminCreateScreen();
});

adminBackToMatchesBtn?.addEventListener("click", async () => {
  showMatchesScreen();
  const user = auth.currentUser;
  if (user) {
    await renderTeamMatchesFromInvites(user);
    if (isAdminUser) await renderAdminMatches();
  }
});

adminMatchesTournamentFilterEl?.addEventListener("change", async () => {
  if (!isAdminUser) return;
  await renderAdminMatches();
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
    registryTargetMatches = [];
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

  // 招待リンクから来ていて、まだ管理者でないなら enroll UI
  const shown = await tryShowAdminEnrollUI(user);
  if (shown) return;

  await showPostLoginUI(user);
});
