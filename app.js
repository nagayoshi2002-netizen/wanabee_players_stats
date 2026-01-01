// app.js（全文置換：全ログインユーザーがイベント閲覧可 + T1/P1 + Adminは全試合参照 + イベントクリックの再バインド問題を修正）
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

// DOM（セクション）
const adminSection = document.getElementById("admin-section");
const joinSection = document.getElementById("join-section");
const matchesSection = document.getElementById("matches-section");
const teamAdminSection = document.getElementById("team-admin-section");
const teamSection = document.getElementById("team-section");
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

// DOM（簡易：選手登録）
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

// DOM（戻る/選手管理）
const backToMatchesBtn = document.getElementById("back-to-matches-btn");
const openTeamAdminBtn = document.getElementById("open-team-admin-btn");

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
let teamId = null;

// 代表者：大会マスタ単独画面用
let registryTournamentId = null;
let registryAllPlayers = [];
let unsubRegistryPlayers = null;

// Timer
let timerBaseMs = 0;
let timerStartAt = null;
let timerIntervalId = null;

// dynamic UI
let assistSelectEl = null;
let stopTimerBtn = null;
let eventButtons = {}; // {goal, callahan, block}
let scoreLeftEl = null;
let scoreRightEl = null;
let scoreRowEl = null;

// score state
let scoreByTeam = {};
let opponentTeamId = "";

// realtime unsub
let unsubPlayersForSelect = null;
let unsubEvents = null;
let unsubScoreAgg = null;
let unsubTournamentPlayers = null;
let unsubMatchPlayers = null;

// memberships(teamName) map for current match (T1)
let unsubMembershipNames = null;
let membershipTeamNameByUid = {}; // { teamUid: teamName }

// For score UI (admin also sees both teams)
let viewLeftTeamId = "";
let viewRightTeamId = "";

// UID verify state
let uidVerifyBound = false;

// event list click binding
let scoreListBound = false;

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

async function isGlobalAdmin(uid) {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}

function setTimerText() {
  if (!timerEl) return;
  timerEl.textContent = msToMMSS(currentTimerMs());
}

function currentTimerMs() {
  if (timerStartAt == null) return timerBaseMs;
  return timerBaseMs + (Date.now() - timerStartAt);
}

function teamNameOf(uid) {
  return (membershipTeamNameByUid && membershipTeamNameByUid[uid]) ? membershipTeamNameByUid[uid] : "";
}

// ======================
// Collections / refs
// ======================
function invitesCol() {
  return collection(db, "invites");
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
function joinCodeRef(codeUpper) {
  return doc(db, "joinCodes", codeUpper);
}

// 大会マスタ
function tournamentTeamPlayersCol(tournamentId, teamId_) {
  return collection(db, "tournaments", tournamentId, "teams", teamId_, "players");
}
function tournamentTeamPlayerRef(tournamentId, teamId_, playerId) {
  return doc(db, "tournaments", tournamentId, "teams", teamId_, "players", playerId);
}

// users registry
function userRef(uid) {
  return doc(db, "users", uid);
}
function usersCol() {
  return collection(db, "users");
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
  teamSection && (teamSection.style.display = "none");
  scoreSection && (scoreSection.style.display = "none");
}

function showRepHome() {
  hideAllMainSections();
  repHomeSection && (repHomeSection.style.display = "block");
}

function showMatchesScreen() {
  hideAllMainSections();
  joinSection && (joinSection.style.display = "block");
  matchesSection && (matchesSection.style.display = "block");
  // 管理者は adminSection を別途 showPostLoginUI 内で表示制御
}

function showPlayerRegistryScreen() {
  hideAllMainSections();
  playerRegistrySection && (playerRegistrySection.style.display = "block");
}

// ======================
// UI bootstrap（動的追加）
// ======================
function ensureExtraUI() {
  // Stopボタン
  if (startTimerBtn && !stopTimerBtn) {
    stopTimerBtn = document.createElement("button");
    stopTimerBtn.id = "stop-timer-btn";
    stopTimerBtn.textContent = "一時停止";
    stopTimerBtn.className = "ghost";
    stopTimerBtn.style.marginLeft = "8px";
    startTimerBtn.parentElement?.appendChild(stopTimerBtn);
    stopTimerBtn.addEventListener("click", stopTimer);
  }

  // アシストselect
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

  // キャナハン/ブロック
  if (recordScoreBtn && !eventButtons.callahan) {
    const row = recordScoreBtn.parentElement;
    recordScoreBtn.textContent = "ゴール";
    eventButtons.goal = recordScoreBtn;

    const btnCallahan = document.createElement("button");
    btnCallahan.id = "record-callahan-btn";
    btnCallahan.textContent = "キャナハン";
    btnCallahan.className = "ghost";
    btnCallahan.style.marginLeft = "8px";

    const btnBlock = document.createElement("button");
    btnBlock.id = "record-block-btn";
    btnBlock.textContent = "ブロック";
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

  // Start/Reset
  startTimerBtn?.addEventListener("click", startTimer);
  resetTimerBtn?.addEventListener("click", resetTimer);

  // タイマー左右にスコア表示
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

    const timerWrap = document.createElement("div");
    timerWrap.style.flex = "1";
    timerWrap.style.textAlign = "center";
    timerWrap.appendChild(timerEl);

    scoreRowEl.appendChild(scoreLeftEl);
    scoreRowEl.appendChild(timerWrap);
    scoreRowEl.appendChild(scoreRightEl);

    const parent = timerEl.parentElement;
    parent?.insertBefore(scoreRowEl, timerEl);
  }

  // イベント編集/削除（毎回renderで再バインドされないように1回だけ）
  if (scoreListEl && !scoreListBound) {
    scoreListBound = true;
    scoreListEl.addEventListener("click", onScoreListClick);
  }
}

function setScoreUI() {
  if (!scoreLeftEl || !scoreRightEl) return;

  const left = viewLeftTeamId ? (scoreByTeam[viewLeftTeamId] || 0) : 0;
  const right = viewRightTeamId ? (scoreByTeam[viewRightTeamId] || 0) : 0;

  scoreLeftEl.textContent = String(left);
  scoreRightEl.textContent = String(right);
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
// Cleanup
// ======================
function cleanupMatchRealtime() {
  unsubPlayersForSelect?.(); unsubPlayersForSelect = null;
  unsubEvents?.(); unsubEvents = null;
  unsubScoreAgg?.(); unsubScoreAgg = null;
  unsubMembershipNames?.(); unsubMembershipNames = null;
  membershipTeamNameByUid = {};
  viewLeftTeamId = "";
  viewRightTeamId = "";
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
// Invites / matches list
//  - Team: invites(teamUid==uid)
//  - Admin: 全matchesを表示
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
  if (title) {
    if (/\bvs\b/i.test(title)) return title;
    const myTeam = (invite?.teamName || "").trim() || "Team";
    return `${myTeam} vs ${title}`;
  }
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
    alert(`invites 読み込み権限エラー\n${e.code}\n${e.message}\n\n※invites に teamUid が入っているか確認してください。`);
    console.error(e);
    return;
  }

  if (invites.length === 0) {
    matchesList.innerHTML = "<li>招待されている試合がありません。</li>";
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
      li.querySelector("span")?.addEventListener("click", () => openTeamAdmin(inv.matchId));

      matchesList.appendChild(li);
    } catch (e) {
      console.error("match read failed:", inv.matchId, e);
    }
  }
}

async function renderMatchesForAdmin() {
  if (!matchesList) return;
  matchesList.innerHTML = "";

  try {
    // createdAtが無い古いdocでも表示はしたいので、orderByが失敗する環境ならここを変更してください。
    const snap = await getDocs(query(matchesCol(), orderBy("createdAt", "desc")));
    if (snap.empty) {
      matchesList.innerHTML = "<li>試合がありません。</li>";
      return;
    }

    snap.docs.forEach((d) => {
      const m = d.data() || {};
      const title = (m.title || "").trim() || `Untitled (${d.id})`;
      const li = document.createElement("li");

      li.innerHTML = `
        <span style="cursor:pointer;">${escapeHtml(title)}</span>
        <button data-action="enter" style="margin-left:8px;">試合を見る</button>
      `;

      li.querySelector('[data-action="enter"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        enterMatch(d.id);
      });
      li.querySelector("span")?.addEventListener("click", () => enterMatch(d.id));

      matchesList.appendChild(li);
    });
  } catch (e) {
    alert(`管理者：試合一覧取得に失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
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
// T1: memberships購読（teamName解決）
// ======================
function subscribeMembershipNames(matchId) {
  unsubMembershipNames?.();
  unsubMembershipNames = onSnapshot(
    membershipsCol(matchId),
    (snap) => {
      const map = {};
      const teamUids = [];

      snap.docs.forEach((d) => {
        const uid = d.id;
        const data = d.data() || {};
        const role = data.role || "";
        const tname = (data.teamName || "").trim();

        // role: "team" のみを対戦チームとして扱う（adminは除外）
        if (role === "team") teamUids.push(uid);

        if (role === "team") map[uid] = tname || "Team";
        else if (role === "admin") map[uid] = "Admin";
        else map[uid] = tname || role || "User";
      });

      membershipTeamNameByUid = map;

      // スコア表示の左右を決める
      const me = auth.currentUser?.uid || "";
      const iAmAdmin = !!auth.currentUser && !!adminSection && (adminSection.style.display === "block");
      // ↑style依存は微妙なので、enterMatch側で別途admin判定して viewLeft/Right を上書きする

      // ここでは「teamUidsが2つ以上あれば左右を確定」だけする
      if (teamUids.length >= 2) {
        // 既に決まっていなければ
        if (!viewLeftTeamId || !viewRightTeamId) {
          viewLeftTeamId = teamUids[0];
          viewRightTeamId = teamUids[1];
        }
      } else if (teamUids.length === 1) {
        // イベントが片側しか無い時の表示崩れ防止
        if (!viewLeftTeamId) viewLeftTeamId = teamUids[0];
      }

      setScoreUI();
    },
    (err) => {
      console.error("memberships subscribe failed:", err);
      membershipTeamNameByUid = {};
    }
  );
}

// ======================
// Players: helpers (P1)
// ======================
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

async function getPlayerLabelFromMatchPlayers(matchId, evTeamId, playerId) {
  if (!matchId || !evTeamId || !playerId) return playerId;
  try {
    const snap = await getDoc(matchPlayerRef(matchId, evTeamId, playerId));
    if (!snap.exists()) return playerId;
    const p = snap.data() || {};
    const num = (p.number || "").trim();
    const name = (p.name || "").trim();
    // 表示は「#12 よしなが」
    const base = `${num ? `#${num}` : ""} ${name}`.trim();
    return base || playerId;
  } catch {
    return playerId;
  }
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

  // admin判定（表示制御にも使う）
  let iAmAdmin = false;
  try {
    iAmAdmin = await isGlobalAdmin(user.uid);
  } catch {
    iAmAdmin = false;
  }

  // teamId（書き込み側のチームID）は「チーム本人」のときのみ user.uid を採用
  // Adminは閲覧中心なので teamId は user.uid のままでも良いが、スコア左右決定は memberships を使う
  teamId = user.uid;

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

  // membership（チーム本人なら取得して、選手管理などの可否に使う）
  currentMembership = null;
  try {
    currentMembership = await loadMyMembership(matchId, user);
  } catch {
    currentMembership = null;
  }

  hideAllMainSections();
  scoreSection && (scoreSection.style.display = "block");

  ensureExtraUI();
  resetTimer();

  // T1: teamName解決
  subscribeMembershipNames(matchId);

  // viewLeft/viewRight を決定
  // - チーム本人：自分を左
  // - 管理者：memberships(role=="team")から2チームを左右に
  viewLeftTeamId = "";
  viewRightTeamId = "";

  // チーム本人の時は「自分が左」
  if (currentMembership && (currentMembership.role === "team" || currentMembership.role === "admin")) {
    // teamは自分を左
    if (currentMembership.role === "team") {
      viewLeftTeamId = user.uid;
    }
  }

  // Admin の場合は memberships購読結果で左右が入る（subscribeMembershipNames内）
  // ただしイベントが先に来る場合もあるので、scoreAgg側でも補助する

  scoreByTeam = {};
  opponentTeamId = "";
  setScoreUI();

  // players（自チームの選手リストを select に反映）
  // チーム本人だけ有効。Adminは選手追加/得点入力しない前提なので購読しない。
  if (currentMembership && currentMembership.role === "team") {
    unsubPlayersForSelect = onSnapshot(
      query(matchPlayersCol(matchId, user.uid), orderBy("number", "asc")),
      (snap) => {
        const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rebuildPlayerSelects(players);
      },
      (err) => {
        alert(`この試合の選手読み込み失敗\n${err.code}\n${err.message}`);
        console.error(err);
      }
    );
  } else {
    // Admin等はselectを空にして入力を促さない
    rebuildPlayerSelects([]);
  }

  // events / score
  subscribeEvents(matchId);
  subscribeScoreAggregate(matchId);

  // Admin閲覧時は入力ボタンを無効化（誤操作防止）
  const writable = !!currentMembership && currentMembership.role === "team";
  if (eventButtons.goal) eventButtons.goal.disabled = !writable;
  if (eventButtons.callahan) eventButtons.callahan.disabled = !writable;
  if (eventButtons.block) eventButtons.block.disabled = !writable;
  if (startTimerBtn) startTimerBtn.disabled = false; // タイマーは誰でも見れる（操作も可）
  if (stopTimerBtn) stopTimerBtn.disabled = false;
}

// ======================
// Back button to matches
// ======================
async function goBackToMatches() {
  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  currentMatchId = null;
  currentMatch = null;
  currentTournamentId = null;
  currentMembership = null;

  scoreByTeam = {};
  opponentTeamId = "";

  resetTimer();

  showMatchesScreen();

  const user = auth.currentUser;
  if (!user) return;

  // matches list: adminは全試合 / teamは招待
  let okAdmin = false;
  try { okAdmin = await isGlobalAdmin(user.uid); } catch { okAdmin = false; }

  if (okAdmin) await renderMatchesForAdmin();
  else await renderMatchesFromInvites(user);

  // adminSection表示の維持
  try {
    const ok = await isGlobalAdmin(user.uid);
    adminSection && (adminSection.style.display = ok ? "block" : "none");
  } catch {
    adminSection && (adminSection.style.display = "none");
  }
}

backToMatchesBtn?.addEventListener("click", goBackToMatches);

openTeamAdminBtn?.addEventListener("click", async () => {
  if (!currentMatchId) return alert("試合が未選択です。");
  await openTeamAdmin(currentMatchId);
});

// ======================
// Events（goal/callahan/block + assist）
// ======================
async function recordEvent(type) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!currentMatchId) return alert("試合を選択してください。");

  // チーム本人のときだけ許可（安全）
  if (!currentMembership || currentMembership.role !== "team") {
    return alert("この操作はチーム代表者のみ可能です。");
  }

  const scorerId = playerSelectEl?.value || "";
  if (!scorerId) return alert("選手を選択してください。");

  const assistId = assistSelectEl?.value || "";
  const timeMs = currentTimerMs();

  try {
    await addDoc(eventsCol(currentMatchId), {
      type, // "goal" | "callahan" | "block"
      timeMs,
      teamId: user.uid, // イベントのteamIdは「記録したチームUID」
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
  unsubEvents = onSnapshot(
    query(eventsCol(matchId), orderBy("timeMs", "desc")),
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

async function renderEvents(events) {
  if (!scoreListEl) return;
  scoreListEl.innerHTML = "";

  for (const ev of events) {
    const t = msToMMSS(ev.timeMs || 0);

    // P1: 「イベントに入っているteamIdの players」からスコアラー/アシストを解決
    const evTeamId = String(ev.teamId || "");
    const teamName = teamNameOf(evTeamId) || (evTeamId ? "Team" : "");

    const scorerLabel = await getPlayerLabelFromMatchPlayers(currentMatchId, evTeamId, String(ev.scorerPlayerId || ""));
    const assistLabel = ev.assistPlayerId
      ? await getPlayerLabelFromMatchPlayers(currentMatchId, evTeamId, String(ev.assistPlayerId || ""))
      : "";

    const assistText = ev.type === "goal" && assistLabel ? `（A: ${assistLabel}）` : "";

    // 表示仕様：得点｜時間｜背番号｜名前｜チーム名
    // 例）得点 0:20 #12 よしなが（Tokyo C）
    const main = `${typeLabel(ev.type)} ${t} ${scorerLabel}（${teamName || "Team"}）${assistText ? " " + assistText : ""}`;

    const li = document.createElement("li");
    li.setAttribute("data-event-id", ev.id);

    // 編集/削除は「作成者本人 or Admin」のルールだが、UIとしては
    // - team本人なら表示
    // - Adminは見えるが、編集は許可しても良い（rules側で許可）
    // ここでは rules どおりにボタンを出すが、実際の更新時に失敗したらアラートする
    li.innerHTML = `
      <span>${escapeHtml(main)}</span>
      <button class="ghost" data-action="edit">編集</button>
      <button class="ghost" data-action="delete">削除</button>
    `;

    scoreListEl.appendChild(li);
  }
}

// クリック処理は1回だけバインド（再追加の原因対策）
async function onScoreListClick(e) {
  const btn = e.target?.closest?.("button");
  if (!btn) return;

  const li = e.target.closest("li");
  const id = li?.getAttribute("data-event-id");
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
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return alert("対象のログが見つかりません。");
      const ev0 = snap.data() || {};

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

      await updateDoc(ref, payload);
    } catch (err) {
      alert(`編集失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  }
}

// ======================
// Score aggregate（goal + callahan を得点として計上）
// ======================
function subscribeScoreAggregate(matchId) {
  unsubScoreAgg = onSnapshot(
    query(eventsCol(matchId), orderBy("createdAt", "asc")),
    (snap) => {
      const by = {};
      const teamIdsSeen = [];

      for (const d of snap.docs) {
        const ev = d.data() || {};
        const tId = String(ev.teamId || "");
        if (!tId) continue;

        if (!teamIdsSeen.includes(tId)) teamIdsSeen.push(tId);

        const isPoint = ev.type === "goal" || ev.type === "callahan";
        if (!isPoint) continue;

        by[tId] = (by[tId] || 0) + 1;
      }

      scoreByTeam = by;

      // 左右の補助決定（membershipsがまだ来ていない場合のフォールバック）
      if (!viewLeftTeamId && teamIdsSeen.length > 0) viewLeftTeamId = teamIdsSeen[0];
      if (!viewRightTeamId && teamIdsSeen.length > 1) viewRightTeamId = teamIdsSeen[1];

      setScoreUI();
    },
    (err) => {
      console.error("score aggregate failed:", err);
    }
  );
}

// ======================
// Team admin（試合単位：大会マスタ共有 + 試合選手管理）
// ======================
async function openTeamAdmin(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  // チーム本人だけ許可（Adminがいじれると事故るので）
  const mem = await loadMyMembership(matchId, user);
  if (!mem || mem.role !== "team") return alert("この画面はチーム代表者のみ利用できます。");

  const m = await loadMatch(matchId);
  if (!m) return alert("試合が見つかりません。");

  currentMatchId = matchId;
  currentMatch = m;
  currentTournamentId = m.tournamentId || null;
  teamId = user.uid;
  currentMembership = mem;

  hideAllMainSections();
  teamAdminSection && (teamAdminSection.style.display = "block");

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

    try {
      if (action === "edit") {
        const number = prompt("背番号:", p.number || "");
        if (number == null) return;
        const name = prompt("名前:", p.name || "");
        if (name == null) return;

        await updateDoc(tournamentTeamPlayerRef(registryTournamentId, auth.currentUser.uid, pid), {
          number: number.trim(),
          name: name.trim(),
          updatedAt: serverTimestamp(),
        });
      }

      if (action === "delete") {
        if (!confirm("削除しますか？")) return;
        await deleteDoc(tournamentTeamPlayerRef(registryTournamentId, auth.currentUser.uid, pid));
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
// joinCode 参加（予備）
// ======================
async function findMatchIdByJoinCode(codeUpper) {
  const snap = await getDoc(joinCodeRef(codeUpper));
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  return typeof data.matchId === "string" ? data.matchId : null;
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

    await setDoc(membershipRef(matchId, user.uid), {
      role: "team",
      teamName,
      inviteId: "joinCode",
      createdAt: serverTimestamp(),
    });

    joinInfoEl && (joinInfoEl.textContent = `参加完了：matchId=${matchId}`);
    alert("試合に参加しました。");

    // 一覧更新
    let okAdmin = false;
    try { okAdmin = await isGlobalAdmin(user.uid); } catch { okAdmin = false; }
    if (okAdmin) await renderMatchesForAdmin();
    else await renderMatchesFromInvites(user);
  } catch (e) {
    alert(`参加失敗: ${e.code}\n${e.message}`);
    console.error(e);
  }
});

// ======================
// 簡易：選手登録（試合中用）
// ======================
addPlayerBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!currentMatchId) return alert("試合を選択してください。");

  // チーム本人のみ
  if (!currentMembership || currentMembership.role !== "team") {
    return alert("この操作はチーム代表者のみ可能です。");
  }

  const name = (playerNameEl?.value || "").trim();
  const number = (playerNumberEl?.value || "").trim();
  if (!name || !number) return alert("名前と背番号を入力してください。");

  try {
    await addDoc(matchPlayersCol(currentMatchId, user.uid), {
      name,
      number,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (playerNameEl) playerNameEl.value = "";
    if (playerNumberEl) playerNumberEl.value = "";
  } catch (e) {
    alert(`選手追加失敗\n${e.code}\n${e.message}`);
    console.error(e);
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
    cleanupAdminRealtime();
    cleanupRegistryRealtime();
    currentMatchId = null;
    currentMatch = null;
    currentTournamentId = null;
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
    if (!uidA) {
      throw new Error(`チームAのメールが users に見つかりません（${teamAEmail}）。先にチーム代表者が登録/UID確認を完了してください。`);
    }
    const uidB = await findUidByEmailLower(teamBEmail);
    if (!uidB) {
      throw new Error(`チームBのメールが users に見つかりません（${teamBEmail}）。先にチーム代表者が登録/UID確認を完了してください。`);
    }

    const matchDocRef = await addDoc(matchesCol(), {
      title,
      status: "scheduled",
      createdBy: user.uid,
      joinCode,
      tournamentId: "", // 既存仕様（必要なら後で固定運用に拡張）
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

    const msg = `作成完了：${title}\nmatchId=${matchDocRef.id}\njoinCode=${joinCode}\n招待：${teamAEmail}, ${teamBEmail}`;
    if (adminInfoEl) adminInfoEl.textContent = msg;
    alert(`試合作成OK\n${title}\njoinCode: ${joinCode}\n※チーム側はログイン後に試合一覧へ反映されます。`);
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
  ensureExtraUI();
  setTimerText();
  setScoreUI();

  if (statusEl) statusEl.textContent = `ログイン中: ${user.email || ""}`;
  if (logoutBtn) logoutBtn.style.display = "inline-block";
  if (signupBtn) signupBtn.style.display = "none";

  // 管理者表示
  let okAdmin = false;
  try {
    okAdmin = await isGlobalAdmin(user.uid);
    adminSection && (adminSection.style.display = okAdmin ? "block" : "none");
  } catch {
    okAdmin = false;
    adminSection && (adminSection.style.display = "none");
  }

  // 初期：代表者ホームに着地
  cleanupMatchRealtime();
  cleanupAdminRealtime();
  cleanupRegistryRealtime();

  showRepHome();
}

// ======================
// 代表者ホーム導線
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
  if (!user) return;

  let okAdmin = false;
  try { okAdmin = await isGlobalAdmin(user.uid); } catch { okAdmin = false; }

  if (okAdmin) await renderMatchesForAdmin();
  else await renderMatchesFromInvites(user);

  // 管理者セクション維持
  adminSection && (adminSection.style.display = okAdmin ? "block" : "none");
});

backToHomeBtn?.addEventListener("click", () => {
  cleanupRegistryRealtime();
  showRepHome();
});

goToMatchesBtn?.addEventListener("click", async () => {
  cleanupRegistryRealtime();
  showMatchesScreen();
  const user = auth.currentUser;
  if (!user) return;

  let okAdmin = false;
  try { okAdmin = await isGlobalAdmin(user.uid); } catch { okAdmin = false; }

  if (okAdmin) await renderMatchesForAdmin();
  else await renderMatchesFromInvites(user);

  adminSection && (adminSection.style.display = okAdmin ? "block" : "none");
});

// ======================
// Auth state
// ======================
onAuthStateChanged(auth, async (user) => {
  ensureExtraUI();
  setTimerText();
  setScoreUI();

  if (!user) {
    if (statusEl) statusEl.textContent = "";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (signupBtn) signupBtn.style.display = "inline-block";

    hideAllMainSections();
    matchesList && (matchesList.innerHTML = "");
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
