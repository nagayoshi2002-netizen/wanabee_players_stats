// app.js（全文置換：重複登録対策 / タイマー&スコア常時表示 / ログ整形&スクショレイアウト / ブロック削除）
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
/** login-section は「最初だけ」表示。ログイン後は account-bar を表示 */
// ======================
const loginSection = document.getElementById("login-section");
const accountBar = document.getElementById("account-bar");
const accountStatusEl = document.getElementById("account-status");

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

// DOM（セクション）
const adminSection = document.getElementById("admin-section");
const joinSection = document.getElementById("join-section");
const matchesSection = document.getElementById("matches-section");
const matchesSubhintEl = document.getElementById("matches-subhint");
const teamAdminSection = document.getElementById("team-admin-section");
const scoreSection = document.getElementById("score-section");

// DOM（管理者：試合作成）
const teamANameEl = document.getElementById("team-a-name");
const teamBNameEl = document.getElementById("team-b-name");
const teamAEmailEl = document.getElementById("team-a-email");
const teamBEmailEl = document.getElementById("team-b-email");
const createMatchBtn = document.getElementById("create-match-btn");
const adminInfoEl = document.getElementById("admin-info");

// DOM（チーム参加：予備導線）
const joinCodeEl = document.getElementById("join-code");
const teamNameEl = document.getElementById("team-name");
const joinBtn = document.getElementById("join-btn");
const joinInfoEl = document.getElementById("join-info");

// DOM（試合一覧）
const matchesList = document.getElementById("matches-list");

// DOM（スコア入力）
const backToMatchesBtn = document.getElementById("back-to-matches-btn");
const openTeamAdminBtn = document.getElementById("open-team-admin-btn");

const playerSelectEl = document.getElementById("player-select");
const assistSelectEl = document.getElementById("assist-select");
const startTimerBtn = document.getElementById("start-timer-btn");
const resetTimerBtn = document.getElementById("reset-timer-btn");
const stopTimerBtn = document.getElementById("stop-timer-btn");
const timerEl = document.getElementById("timer");

const recordGoalBtn = document.getElementById("record-score-btn");
const recordCallahanBtn = document.getElementById("record-callahan-btn");

const leftTeamNameEl = document.getElementById("left-team-name");
const rightTeamNameEl = document.getElementById("right-team-name");
const leftTeamScoreEl = document.getElementById("left-team-score");
const rightTeamScoreEl = document.getElementById("right-team-score");

const eventsTableEl = document.getElementById("events-table");

// DOM（チーム管理者：文脈/ボタン）
const teamAdminContextEl = document.getElementById("team-admin-context");
const backToMatchesFromAdminBtn = document.getElementById("back-to-matches-from-admin-btn");
const goToScoreFromAdminBtn = document.getElementById("go-to-score-from-admin-btn");
const copyTournamentToMatchBtn = document.getElementById("copy-tournament-to-match-btn");
const clearMatchPlayersBtn = document.getElementById("clear-match-players-btn");

// DOM（大会マスタ：登録）
const bulkTournamentPlayersEl = document.getElementById("bulk-tournament-players");
const bulkAddTournamentBtn = document.getElementById("bulk-add-tournament-btn");
const tournamentPlayerNumberEl = document.getElementById("tournament-player-number");
const tournamentPlayerNameEl = document.getElementById("tournament-player-name");
const addTournamentPlayerBtn = document.getElementById("add-tournament-player-btn");
const tournamentPlayersListEl = document.getElementById("tournament-players-list");

// DOM（試合選手：登録）
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
let currentMembership = null;

// viewer role
let viewerIsGlobalAdmin = false;
let viewerIsTeamMember = false; // membership.role === "team"
let viewerTeamId = null; // team member の場合のみ auth.uid

// match teams
let leftTeamId = "";
let rightTeamId = "";
let leftTeamName = "-";
let rightTeamName = "-";
let teamNameById = {}; // { teamId: teamName }

// players cache (for live label update)
let playersByTeamId = {}; // { teamId: [{id,number,name,...}] }
let playerLabelByKey = {}; // { `${teamId}/${playerId}`: "12 やまだ" }
let unsubPlayersByTeam = []; // [fn, fn]

// events cache
let latestEvents = [];

// Timer
let timerBaseMs = 0;
let timerStartAt = null;
let timerIntervalId = null;

// realtime unsub
let unsubEvents = null;
let unsubScoreAgg = null;
let unsubTournamentPlayers = null;
let unsubMatchPlayers = null;

// registry unsub
let registryTournamentId = null;
let registryAllPlayers = [];
let unsubRegistryPlayers = null;

// UID verify state
let uidVerifyBound = false;

// UI bind state（重複登録防止）
let uiBound = false;

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

function setTimerText() {
  if (!timerEl) return;
  timerEl.textContent = msToMMSS(currentTimerMs());
}

function currentTimerMs() {
  if (timerStartAt == null) return timerBaseMs;
  return timerBaseMs + (Date.now() - timerStartAt);
}

// ======================
// Collections / refs
// ======================
function invitesCol() { return collection(db, "invites"); }
function matchesCol() { return collection(db, "matches"); }
function matchRef(matchId) { return doc(db, "matches", matchId); }
function membershipsCol(matchId) { return collection(db, "matches", matchId, "memberships"); }
function membershipRef(matchId, uid) { return doc(db, "matches", matchId, "memberships", uid); }

function matchPlayersCol(matchId, teamId_) {
  return collection(db, "matches", matchId, "teams", teamId_, "players");
}
function matchPlayerRef(matchId, teamId_, playerId) {
  return doc(db, "matches", matchId, "teams", teamId_, "players", playerId);
}

function eventsCol(matchId) { return collection(db, "matches", matchId, "events"); }
function eventRef(matchId, eventId) { return doc(db, "matches", matchId, "events", eventId); }

function joinCodeRef(codeUpper) { return doc(db, "joinCodes", codeUpper); }

// 大会マスタ
function tournamentTeamPlayersCol(tournamentId, teamId_) {
  return collection(db, "tournaments", tournamentId, "teams", teamId_, "players");
}
function tournamentTeamPlayerRef(tournamentId, teamId_, playerId) {
  return doc(db, "tournaments", tournamentId, "teams", teamId_, "players", playerId);
}

// users registry
function userRef(uid) { return doc(db, "users", uid); }
function usersCol() { return collection(db, "users"); }

// ======================
// auth helpers
// ======================
async function isGlobalAdmin(uid) {
  // rules 側で「自分の admins/{uid} は読める」想定
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}

// ======================
// Section control
// ======================
function hideAllMainSections() {
  uidVerifySection && (uidVerifySection.style.display = "none");
  repHomeSection && (repHomeSection.style.display = "none");
  playerRegistrySection && (playerRegistrySection.style.display = "none");
  adminSection && (adminSection.style.display = "none");
  joinSection && (joinSection.style.display = "none");
  matchesSection && (matchesSection.style.display = "none");
  teamAdminSection && (teamAdminSection.style.display = "none");
  scoreSection && (scoreSection.style.display = "none");
}

function showLoginOnly() {
  hideAllMainSections();
  loginSection && (loginSection.style.display = "block");
  accountBar && (accountBar.style.display = "none");
}

function showAccountBar(user) {
  loginSection && (loginSection.style.display = "none");
  accountBar && (accountBar.style.display = "block");
  if (accountStatusEl) accountStatusEl.textContent = `ログイン中: ${user.email || ""}`;
}

function showOnlyUidVerify(user) {
  hideAllMainSections();
  uidVerifySection && (uidVerifySection.style.display = "block");
  showAccountBar(user);

  const uidToShow = user?.uid || auth.currentUser?.uid || "";
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

function showRepHome(user) {
  hideAllMainSections();
  repHomeSection && (repHomeSection.style.display = "block");
  showAccountBar(user);
  // 管理者はホームでも adminSection を表示
  adminSection && (adminSection.style.display = viewerIsGlobalAdmin ? "block" : "none");
}

function showMatchesScreen(user) {
  hideAllMainSections();
  joinSection && (joinSection.style.display = "block");
  matchesSection && (matchesSection.style.display = "block");
  showAccountBar(user);

  adminSection && (adminSection.style.display = viewerIsGlobalAdmin ? "block" : "none");
}

function showPlayerRegistryScreen(user) {
  hideAllMainSections();
  playerRegistrySection && (playerRegistrySection.style.display = "block");
  showAccountBar(user);
  adminSection && (adminSection.style.display = viewerIsGlobalAdmin ? "block" : "none");
}

function showScoreScreen(user) {
  hideAllMainSections();
  scoreSection && (scoreSection.style.display = "block");
  showAccountBar(user);
  adminSection && (adminSection.style.display = viewerIsGlobalAdmin ? "block" : "none");
}

// ======================
// Cleanup
// ======================
function cleanupMatchRealtime() {
  unsubEvents?.(); unsubEvents = null;
  unsubScoreAgg?.(); unsubScoreAgg = null;

  for (const u of unsubPlayersByTeam) u?.();
  unsubPlayersByTeam = [];
  playersByTeamId = {};
  playerLabelByKey = {};
  latestEvents = [];

  leftTeamId = "";
  rightTeamId = "";
  leftTeamName = "-";
  rightTeamName = "-";
  teamNameById = {};
  setScoreboardUI(); // reset
}

function cleanupAdminRealtime() {
  unsubTournamentPlayers?.(); unsubTournamentPlayers = null;
  unsubMatchPlayers?.(); unsubMatchPlayers = null;
}

function cleanupRegistryRealtime() {
  unsubRegistryPlayers?.(); unsubRegistryPlayers = null;
  registryAllPlayers = [];
  registryTournamentId = null;
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
// Matches list
//  - Team: invites(teamUid==uid)
//  - Admin: 全 matches
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

async function fetchAllMatchesForAdmin() {
  const snap = await getDocs(query(matchesCol(), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function formatMatchLabelFromTitle(title) {
  const t = String(title || "").trim();
  return t || "Untitled Match";
}

async function renderMatchesList(user) {
  if (!matchesList) return;
  matchesList.innerHTML = "";

  // subhint
  if (matchesSubhintEl) {
    matchesSubhintEl.textContent = viewerIsGlobalAdmin
      ? "管理者：全試合を表示します"
      : "招待されている試合を表示します";
  }

  if (viewerIsGlobalAdmin) {
    let matches = [];
    try {
      matches = await fetchAllMatchesForAdmin();
    } catch (e) {
      alert(`matches 読み込み失敗\n${e.code || ""}\n${e.message || e}`);
      console.error(e);
      return;
    }

    if (matches.length === 0) {
      matchesList.innerHTML = "<li>試合がありません。</li>";
      return;
    }

    for (const m of matches) {
      const li = document.createElement("li");
      li.innerHTML = `
        <span style="cursor:pointer;">${escapeHtml(formatMatchLabelFromTitle(m.title))}</span>
        <button data-action="enter" style="margin-left:8px;">試合を開く</button>
      `;
      li.querySelector('[data-action="enter"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        enterMatch(m.id);
      });
      li.querySelector("span")?.addEventListener("click", () => enterMatch(m.id));
      matchesList.appendChild(li);
    }
    return;
  }

  // team user: invites
  let invites = [];
  try {
    invites = await fetchInvitesForUid(user.uid);
  } catch (e) {
    alert(`invites 読み込み権限エラー\n${e.code}\n${e.message}\n\n※invites に teamUid が入っているか確認してください。`);
    console.error(e);
    return;
  }

  if (invites.length === 0) {
    matchesList.innerHTML = "<li>招待されている試合がありません。</li>";
    return;
  }

  // 招待→membership 化（match read を通すために先に作る）
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
      const m = ms.data();

      const li = document.createElement("li");
      const label = formatMatchLabelFromTitle(m.title || "");
      li.innerHTML = `
        <span style="cursor:pointer;">${escapeHtml(label)}</span>
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
// Match / membership load
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

function splitTitleTeams(title) {
  const t = String(title || "").trim();
  if (!t) return { a: "", b: "" };
  const m = t.split(/\s+vs\s+/i);
  if (m.length >= 2) return { a: String(m[0] || "").trim(), b: String(m.slice(1).join(" vs ") || "").trim() };
  return { a: t, b: "" };
}

async function loadMatchTeamNames(matchId, matchTitle) {
  // できれば memberships から teamName を取る（全ユーザー閲覧運用なら rules 側で read を許可している前提）
  const map = {};
  try {
    const snap = await getDocs(query(membershipsCol(matchId)));
    for (const d of snap.docs) {
      const data = d.data() || {};
      if (data.role === "team") {
        const name = String(data.teamName || "").trim();
        if (name) map[d.id] = name;
      }
    }
  } catch (e) {
    // rules がまだの場合、ここで落ちる可能性あり → titleベースにフォールバック
    console.warn("memberships list read failed (fallback to title):", e);
  }

  teamNameById = map;

  // left/right の決定：title の A/B を優先
  const { a: ta, b: tb } = splitTitleTeams(matchTitle);

  const ids = Object.keys(map);
  if (ids.length >= 2) {
    const findIdByName = (name) => {
      const n = String(name || "").trim();
      if (!n) return "";
      return ids.find((id) => String(map[id] || "").trim() === n) || "";
    };

    const idA = findIdByName(ta);
    const idB = findIdByName(tb);

    if (idA && idB && idA !== idB) {
      leftTeamId = idA;
      rightTeamId = idB;
      leftTeamName = map[idA] || ta || "-";
      rightTeamName = map[idB] || tb || "-";
      setScoreboardUI();
      return [idA, idB];
    }

    // フォールバック：teamName 昇順（表示安定のため）
    const sorted = ids.slice().sort((x, y) => String(map[x]).localeCompare(String(map[y])));
    leftTeamId = sorted[0] || "";
    rightTeamId = sorted[1] || "";
    leftTeamName = map[leftTeamId] || ta || "-";
    rightTeamName = map[rightTeamId] || tb || "-";
    setScoreboardUI();
    return [leftTeamId, rightTeamId];
  }

  // memberships が読めない or 0件の場合：title だけ出す（teamIdはイベントから推定する）
  leftTeamName = ta || "-";
  rightTeamName = tb || "-";
  setScoreboardUI();
  return [];
}

function setScoreboardUI(scoreBy = {}) {
  if (leftTeamNameEl) leftTeamNameEl.textContent = leftTeamName || "-";
  if (rightTeamNameEl) rightTeamNameEl.textContent = rightTeamName || "-";

  const ls = leftTeamId ? (scoreBy[leftTeamId] || 0) : 0;
  const rs = rightTeamId ? (scoreBy[rightTeamId] || 0) : 0;

  if (leftTeamScoreEl) leftTeamScoreEl.textContent = String(ls);
  if (rightTeamScoreEl) rightTeamScoreEl.textContent = String(rs);

  setTimerText();
}

// ======================
// Players: subscribe by teamId (for live label update)
// ======================
function makePlayerLabel(p) {
  const number = String(p.number || "").trim();
  const name = String(p.name || "").trim();
  if (number && name) return `${number} ${name}`;
  if (name) return name;
  if (number) return number;
  return p.id;
}

function rebuildSelectsForTeam(teamId_) {
  const list = playersByTeamId[teamId_] || [];
  if (playerSelectEl) {
    playerSelectEl.innerHTML = `<option value="">選手を選択</option>`;
    for (const p of list) {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = makePlayerLabel(p);
      playerSelectEl.appendChild(o);
    }
  }
  if (assistSelectEl) {
    assistSelectEl.innerHTML = `<option value="">アシスト（任意）</option>`;
    for (const p of list) {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = makePlayerLabel(p);
      assistSelectEl.appendChild(o);
    }
  }
}

function subscribePlayersForTeam(matchId, teamId_) {
  const u = onSnapshot(
    query(matchPlayersCol(matchId, teamId_), orderBy("number", "asc")),
    (snap) => {
      const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      playersByTeamId[teamId_] = players;

      for (const p of players) {
        playerLabelByKey[`${teamId_}/${p.id}`] = makePlayerLabel(p);
      }

      // viewer team の select 更新
      if (viewerIsTeamMember && viewerTeamId === teamId_) {
        rebuildSelectsForTeam(teamId_);
      }

      // 選手名/背番号を後から直したらログも変わる：再描画
      renderEventsTable();
    },
    (err) => console.warn("players subscribe failed:", teamId_, err)
  );
  unsubPlayersByTeam.push(u);
}

function subscribePlayersForKnownTeams(matchId) {
  // left/right が確定していれば両方購読（閲覧者が誰でもラベルが更新される）
  const ids = [leftTeamId, rightTeamId].filter(Boolean);
  for (const id of ids) subscribePlayersForTeam(matchId, id);

  // viewer が team なら、念のため自身の team も購読（left/right 不明時でも select を作る）
  if (viewerIsTeamMember && viewerTeamId && !ids.includes(viewerTeamId)) {
    subscribePlayersForTeam(matchId, viewerTeamId);
  }

  // viewerが team 以外なら入力を無効化（閲覧モード）
  const canInput = viewerIsTeamMember;
  if (playerSelectEl) playerSelectEl.disabled = !canInput;
  if (assistSelectEl) assistSelectEl.disabled = !canInput;
  if (recordGoalBtn) recordGoalBtn.disabled = !canInput;
  if (recordCallahanBtn) recordCallahanBtn.disabled = !canInput;
}

// ======================
// Events render (スクショ仕様)
//  - 1行目: "00:00 14 よしなが"（時刻 背番号 名前）
//  - サブ: goal→（アシスト：...） / callahan→（キャラハン）
//  - ブロックはボタン削除（過去データがあれば表示のみ）
// ======================
function getLabel(teamId_, playerId) {
  const key = `${teamId_}/${playerId}`;
  return playerLabelByKey[key] || playerId || "";
}

function makeSubline(ev) {
  if (ev.type === "callahan") return "（キャラハン）";
  if (ev.type === "block") return "（ブロック）"; // 過去互換
  if (ev.type === "goal") {
    const aid = String(ev.assistPlayerId || "");
    if (!aid) return "";
    const a = getLabel(ev.teamId, aid);
    return a ? `（アシスト： ${a}）` : "";
  }
  return "";
}

function renderEventsTable() {
  if (!eventsTableEl) return;
  eventsTableEl.innerHTML = "";

  if (!latestEvents || latestEvents.length === 0) {
    eventsTableEl.innerHTML = `<div class="hint" style="padding:8px 2px;">まだ記録がありません。</div>`;
    return;
  }

  for (const ev of latestEvents) {
    const t = msToMMSS(ev.timeMs || 0);

    const scorerId = String(ev.scorerPlayerId || "");
    const scorerLabel = scorerId ? getLabel(ev.teamId, scorerId) : "";

    // 1行目: "00:00 14 よしなが"
    const mainLine = `${t} ${scorerLabel}`.trim();
    const subLine = makeSubline(ev);

    // side: left/right（teamIdがまだ未確定なら、先に出現した2チームで暫定）
    let side = "left";
    if (leftTeamId && rightTeamId) {
      side = ev.teamId === rightTeamId ? "right" : "left";
    } else {
      // 暫定推定
      if (!leftTeamId && ev.teamId) leftTeamId = ev.teamId;
      else if (!rightTeamId && ev.teamId && ev.teamId !== leftTeamId) rightTeamId = ev.teamId;

      // 名前は memberships が無い場合 title のまま
      setScoreboardUI(computeScoreByTeam(latestEvents));
      side = ev.teamId === rightTeamId ? "right" : "left";
    }

    const row = document.createElement("div");
    row.className = "event-row";
    row.setAttribute("data-event-id", ev.id);

    const leftCell = document.createElement("div");
    leftCell.className = "event-left";

    const timeCell = document.createElement("div");
    timeCell.className = "event-time";
    timeCell.textContent = t;

    const rightCell = document.createElement("div");
    rightCell.className = "event-right";

    const actions = document.createElement("div");
    actions.className = "event-actions";
    actions.innerHTML = `
      <button class="ghost" data-action="edit">編集</button>
      <button class="ghost" data-action="delete">削除</button>
    `;

    const contentHtml = `
      <div class="event-main">${escapeHtml(mainLine.replace(/^\d{2}:\d{2}\s*/, ""))}</div>
      ${subLine ? `<div class="event-sub">${escapeHtml(subLine)}</div>` : ""}
    `;

    // 表示上、左/右のプレイヤー列に置く（time は中央列で常に表示）
    if (side === "left") {
      leftCell.innerHTML = contentHtml;
      rightCell.innerHTML = `<div class="event-empty">.</div>`;
    } else {
      leftCell.innerHTML = `<div class="event-empty">.</div>`;
      rightCell.innerHTML = contentHtml;
    }

    // time 列は常に表示。上で timeCell にセット済み。
    // ただし mainLine でも t を使うため、mainLineの先頭のtは表示しない（置換済み）
    row.appendChild(leftCell);
    row.appendChild(timeCell);
    row.appendChild(rightCell);
    row.appendChild(actions);

    eventsTableEl.appendChild(row);
  }
}

// イベント配列から得点集計（goal+callahan=1点）
function computeScoreByTeam(events) {
  const by = {};
  for (const ev of events || []) {
    const tId = ev.teamId || "";
    if (!tId) continue;
    const isPoint = ev.type === "goal" || ev.type === "callahan";
    if (!isPoint) continue;
    by[tId] = (by[tId] || 0) + 1;
  }
  return by;
}

// ======================
// Events subscribe
//  - 表示の重複: UI側は毎回 innerHTML を作り直す
//  - DB側の重複: addEventListener多重をやめ、onclickで1回だけバインド
// ======================
function subscribeEvents(matchId) {
  unsubEvents = onSnapshot(
    query(eventsCol(matchId), orderBy("timeMs", "desc")),
    (snap) => {
      latestEvents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderEventsTable();
    },
    (err) => {
      alert(`events 読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );
}

function subscribeScoreAggregate(matchId) {
  unsubScoreAgg = onSnapshot(
    query(eventsCol(matchId), orderBy("createdAt", "asc")),
    (snap) => {
      const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const by = computeScoreByTeam(events);
      setScoreboardUI(by);
    },
    (err) => console.error("score aggregate failed:", err)
  );
}

// ======================
// Enter match (試合入力画面)
// ======================
async function enterMatch(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  currentMatchId = matchId;

  // membership（team/admin判定）
  try {
    currentMembership = await loadMyMembership(matchId, user);
    viewerIsTeamMember = currentMembership?.role === "team";
    viewerTeamId = viewerIsTeamMember ? user.uid : null;
  } catch (e) {
    // 「全ログインユーザー閲覧」運用にした場合、membershipが無くても閲覧できる想定もあり得る
    // ただし現状運用は membership 前提なので、ここは安全側で止める
    viewerIsTeamMember = false;
    viewerTeamId = null;
  }

  // match
  try {
    currentMatch = await loadMatch(matchId);
    if (!currentMatch) {
      alert("試合情報が見つかりません。");
      return;
    }
    currentTournamentId = currentMatch.tournamentId || null;
  } catch (e) {
    alert(`試合読み込み失敗\n${e.code}\n${e.message}`);
    console.error(e);
    return;
  }

  // team names / ids
  await loadMatchTeamNames(matchId, currentMatch.title || "");
  subscribePlayersForKnownTeams(matchId);

  // UI
  showScoreScreen(user);

  // timer reset (必ず表示)
  resetTimer();
  setScoreboardUI(computeScoreByTeam(latestEvents));

  // events / score
  subscribeEvents(matchId);
  subscribeScoreAggregate(matchId);
}

// ======================
// Back button to matches
// ======================
async function goBackToMatches() {
  const user = auth.currentUser;
  if (!user) return;

  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  currentMatchId = null;
  currentMatch = null;
  currentTournamentId = null;
  currentMembership = null;

  resetTimer();

  showMatchesScreen(user);
  await renderMatchesList(user);
}

backToMatchesBtn && (backToMatchesBtn.onclick = goBackToMatches);

// ======================
// Record events（goal / callahan）
// ======================
async function recordEvent(type) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!currentMatchId) return alert("試合を選択してください。");
  if (!viewerIsTeamMember || !viewerTeamId) return alert("入力はチーム代表者のみ可能です。");

  const scorerId = playerSelectEl?.value || "";
  if (!scorerId) return alert("選手を選択してください。");

  const assistId = assistSelectEl?.value || "";
  const timeMs = currentTimerMs();

  try {
    await addDoc(eventsCol(currentMatchId), {
      type, // "goal" | "callahan"
      timeMs,
      teamId: viewerTeamId,
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
// Team admin（試合単位：大会マスタ共有 + 試合選手管理）
//  - チーム代表者のみ許可（adminはここを使わない）
// ======================
async function openTeamAdmin(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  const mem = await loadMyMembership(matchId, user);
  if (!mem) return alert("この試合の参加権限がありません。");
  if (mem.role !== "team") return alert("この画面はチーム代表者のみ利用できます。");

  const m = await loadMatch(matchId);
  if (!m) return alert("試合が見つかりません。");

  currentMatchId = matchId;
  currentMatch = m;
  currentTournamentId = m.tournamentId || null;

  // teamId は「自分のUID」
  const teamId = user.uid;

  hideAllMainSections();
  teamAdminSection && (teamAdminSection.style.display = "block");
  showAccountBar(user);
  adminSection && (adminSection.style.display = viewerIsGlobalAdmin ? "block" : "none");

  const title = (m.title || "Untitled Match").trim();
  const tour = currentTournamentId ? currentTournamentId : "（未設定）";
  if (teamAdminContextEl) teamAdminContextEl.textContent = `対象試合：${title} / tournamentId: ${tour}`;

  if (backToMatchesFromAdminBtn) backToMatchesFromAdminBtn.onclick = () => goBackToMatches();
  if (goToScoreFromAdminBtn) goToScoreFromAdminBtn.onclick = () => enterMatch(matchId);

  // ---- 大会マスタ：購読
  if (currentTournamentId) {
    unsubTournamentPlayers = onSnapshot(
      query(tournamentTeamPlayersCol(currentTournamentId, teamId), orderBy("number", "asc")),
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

            await updateDoc(tournamentTeamPlayerRef(currentTournamentId, teamId, pid), {
              number: number.trim(),
              name: name.trim(),
              updatedAt: serverTimestamp(),
            });
          },
          onDelete: async (pid) => {
            if (!confirm("削除しますか？")) return;
            await deleteDoc(tournamentTeamPlayerRef(currentTournamentId, teamId, pid));
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
    query(matchPlayersCol(matchId, teamId), orderBy("number", "asc")),
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

          await updateDoc(matchPlayerRef(matchId, teamId, pid), {
            number: number.trim(),
            name: name.trim(),
            updatedAt: serverTimestamp(),
          });
        },
        onDelete: async (pid) => {
          if (!confirm("削除しますか？")) return;
          await deleteDoc(matchPlayerRef(matchId, teamId, pid));
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
      await addDoc(tournamentTeamPlayersCol(currentTournamentId, teamId), {
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
        await addDoc(tournamentTeamPlayersCol(currentTournamentId, teamId), {
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
      await addDoc(matchPlayersCol(matchId, teamId), {
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
        await addDoc(matchPlayersCol(matchId, teamId), {
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
      await clearAllMatchPlayers(matchId, teamId);
    };
  }

  // ---- 大会→試合コピー
  if (copyTournamentToMatchBtn) {
    copyTournamentToMatchBtn.onclick = async () => {
      if (!currentTournamentId) return alert("tournamentId が未設定です。");
      const existing = await getDocs(query(matchPlayersCol(matchId, teamId)));
      if (!existing.empty) {
        const ok = confirm("この試合の選手が既に存在します。削除して大会情報からコピーしますか？");
        if (!ok) return;
        await clearAllMatchPlayers(matchId, teamId);
      }
      await copyTournamentPlayersToMatch(currentTournamentId, matchId, teamId);
      alert("大会情報をこの試合へコピーしました。");
    };
  }
}

// ======================
// Admin lists / utils for team-admin & registry
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
// 代表者：大会マスタ単独画面（選手登録フォーム）
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

    if (!registryTournamentId) return;

    const user = auth.currentUser;
    if (!user) return;

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

loadRegistryBtn && (loadRegistryBtn.onclick = async () => {
  await loadRegistry(registryTournamentIdEl?.value || "");
});

registryAddPlayerBtn && (registryAddPlayerBtn.onclick = async () => {
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

registryBulkAddBtn && (registryBulkAddBtn.onclick = async () => {
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
// joinCode 参加（予備）
// ======================
async function findMatchIdByJoinCode(codeUpper) {
  const snap = await getDoc(joinCodeRef(codeUpper));
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  return typeof data.matchId === "string" ? data.matchId : null;
}

joinBtn && (joinBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const code = (joinCodeEl?.value || "").trim().toUpperCase();
  const teamName = (teamNameEl?.value || "").trim();
  if (!code || !teamName) return alert("joinCode とチーム名を入力してください。");

  try {
    const matchId = await findMatchIdByJoinCode(code);
    if (!matchId) return alert("joinCode が見つかりません。");

    await setDoc(membershipRef(matchId, user.uid), {
      role: "team",
      teamName,
      inviteId: "joinCode",
      createdAt: serverTimestamp(),
    });

    joinInfoEl && (joinInfoEl.textContent = `参加完了：matchId=${matchId}`);
    alert("試合に参加しました。");

    await renderMatchesList(user);
  } catch (e) {
    alert(`参加失敗: ${e.code}\n${e.message}`);
    console.error(e);
  }
});

// ======================
// Admin: create match (team names + emails -> match + invites)
// ======================
async function findUidByEmailLower(emailLower) {
  const q = query(usersCol(), where("emailLower", "==", emailLower));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

createMatchBtn && (createMatchBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  if (!viewerIsGlobalAdmin) return alert("管理者権限がありません。");

  const teamAName = (teamANameEl?.value || "").trim();
  const teamBName = (teamBNameEl?.value || "").trim();
  const teamAEmail = normalizeEmail(teamAEmailEl?.value || "");
  const teamBEmail = normalizeEmail(teamBEmailEl?.value || "");

  if (!teamAName || !teamBName) return alert("チーム名（A/B）を入力してください。");
  if (!teamAEmail || !teamBEmail) return alert("代表者メール（A/B）を入力してください。");
  if (teamAEmail === teamBEmail) return alert("代表者メールが同一です。別のメールを入力してください。");

  const title = `${teamAName} vs ${teamBName}`;
  const joinCode = randomJoinCode(8);

  createMatchBtn.disabled = true;
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
      createdAt: serverTimestamp(),
    });

    // 管理者自身を admin membership
    await setDoc(membershipRef(matchDocRef.id, user.uid), {
      role: "admin",
      createdAt: serverTimestamp(),
    });

    // joinCodes に登録
    await setDoc(joinCodeRef(joinCode), {
      matchId: matchDocRef.id,
      createdAt: serverTimestamp(),
    });

    // invites 2件
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

    const msg = `作成完了：${title}\nmatchId=${matchDocRef.id}\njoinCode=${joinCode}\n招待：${teamAEmail}, ${teamBEmail}`;
    if (adminInfoEl) adminInfoEl.textContent = msg;
    alert(`試合作成OK\n${title}\njoinCode: ${joinCode}\n※チーム側はログイン後に試合一覧へ反映されます。`);
  } catch (e) {
    const msg = e?.message || `${e}`;
    alert(`試合作成失敗\n${msg}`);
    console.error(e);
    if (adminInfoEl) adminInfoEl.textContent = `失敗：${msg}`;
  } finally {
    createMatchBtn.disabled = false;
  }
});

// ======================
// Edit/Delete events（delegation: 1回だけ）
// ======================
function bindEventTableHandlerOnce() {
  if (!eventsTableEl) return;
  if (eventsTableEl.__bound) return;
  eventsTableEl.__bound = true;

  eventsTableEl.addEventListener("click", async (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;

    const row = e.target.closest(".event-row");
    const id = row?.getAttribute("data-event-id");
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
      return;
    }

    if (action === "edit") {
      const ev0 = latestEvents.find((x) => x.id === id);
      if (!ev0) return;

      const newType = prompt("種別（goal / callahan）:", ev0.type || "goal");
      if (newType === null) return;

      const newTime = prompt("時間（mm:ss）:", msToMMSS(ev0.timeMs || 0));
      if (newTime === null) return;

      const mmss = parseMMSS(newTime);
      if (mmss == null) return alert("時間は mm:ss 形式で入力してください（例：02:15）。");

      const t = String(newType || "").trim();
      if (t !== "goal" && t !== "callahan") return alert("種別は goal / callahan のみです。");

      const payload = {
        type: t,
        timeMs: mmss,
        updatedAt: serverTimestamp(),
      };
      if (payload.type !== "goal") payload.assistPlayerId = "";

      try {
        await updateDoc(ref, payload);
      } catch (err) {
        alert(`編集失敗\n${err.code}\n${err.message}`);
        console.error(err);
      }
    }
  });
}

// ======================
// Auth UI（入力メールを小文字化）
// ======================
signupBtn && (signupBtn.onclick = async () => {
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

loginBtn && (loginBtn.onclick = async () => {
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

logoutBtn && (logoutBtn.onclick = async () => {
  try {
    cleanupMatchRealtime();
    cleanupAdminRealtime();
    cleanupRegistryRealtime();
    currentMatchId = null;
    currentMatch = null;
    currentTournamentId = null;
    currentMembership = null;

    viewerIsGlobalAdmin = false;
    viewerIsTeamMember = false;
    viewerTeamId = null;

    await signOut(auth);
  } catch (e) {
    alert(`ログアウト失敗\n${e.code}\n${e.message}`);
    console.error(e);
  }
});

// ======================
// 代表者ホーム導線
// ======================
openPlayerRegistryBtn && (openPlayerRegistryBtn.onclick = () => {
  const user = auth.currentUser;
  if (!user) return;
  cleanupMatchRealtime();
  cleanupAdminRealtime();
  showPlayerRegistryScreen(user);
});

openMatchesBtn && (openMatchesBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;
  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  showMatchesScreen(user);
  await renderMatchesList(user);
});

backToHomeBtn && (backToHomeBtn.onclick = () => {
  const user = auth.currentUser;
  if (!user) return;
  cleanupRegistryRealtime();
  showRepHome(user);
});

goToMatchesBtn && (goToMatchesBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;
  cleanupRegistryRealtime();
  showMatchesScreen(user);
  await renderMatchesList(user);
});

// score screen: open team admin
openTeamAdminBtn && (openTeamAdminBtn.onclick = async () => {
  if (!currentMatchId) return alert("試合が未選択です。");
  await openTeamAdmin(currentMatchId);
});

// ======================
// UI bind once（重複登録を根本対応）
// ======================
function bindUIOnce() {
  if (uiBound) return;
  uiBound = true;

  // timer buttons
  if (startTimerBtn) startTimerBtn.onclick = startTimer;
  if (resetTimerBtn) resetTimerBtn.onclick = resetTimer;
  if (stopTimerBtn) stopTimerBtn.onclick = stopTimer;

  // record buttons（ブロック削除）
  if (recordGoalBtn) recordGoalBtn.onclick = () => recordEvent("goal");
  if (recordCallahanBtn) recordCallahanBtn.onclick = () => recordEvent("callahan");

  // events edit/delete delegation
  bindEventTableHandlerOnce();
}

// ======================
// Users registry check
// ======================
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
  bindUIOnce();
  setTimerText();
  setScoreboardUI(computeScoreByTeam(latestEvents));

  // 管理者判定（毎回更新）
  try {
    viewerIsGlobalAdmin = await isGlobalAdmin(user.uid);
  } catch {
    viewerIsGlobalAdmin = false;
  }

  // 初期：代表者ホームに着地
  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  showRepHome(user);
}

// ======================
// Auth state
// ======================
onAuthStateChanged(auth, async (user) => {
  bindUIOnce();
  setTimerText();
  setScoreboardUI(computeScoreByTeam(latestEvents));

  if (!user) {
    // 未ログイン：ログインカードだけ
    if (statusEl) statusEl.textContent = "";
    showLoginOnly();
    matchesList && (matchesList.innerHTML = "");
    return;
  }

  // ログイン直後：まず管理者判定（UIのadmin表示に使う）
  try {
    viewerIsGlobalAdmin = await isGlobalAdmin(user.uid);
  } catch {
    viewerIsGlobalAdmin = false;
  }

  // UID確認済みか
  const okRegistry = await hasUserRegistry(user);
  if (!okRegistry) {
    showOnlyUidVerify(user);
    return;
  }

  await showPostLoginUI(user);
});
