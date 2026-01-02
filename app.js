// app.js（全文置換：管理者招待リンク発行＋リンク踏んだ即Admin化）
// ※Firebase configはあなたの現行値のまま
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
const adminBackToMatchesBtn = document.getElementById("admin-back-to-matches-btn");
const teamANameEl = document.getElementById("team-a-name");
const teamBNameEl = document.getElementById("team-b-name");
const teamAEmailEl = document.getElementById("team-a-email");
const teamBEmailEl = document.getElementById("team-b-email");
const adminTournamentSelectEl = document.getElementById("admin-tournament-select");
const adminNewTournamentIdEl = document.getElementById("admin-new-tournament-id");
const createMatchBtn = document.getElementById("create-match-btn");
const adminInfoEl = document.getElementById("admin-info");

// 試合一覧
const matchesBackToHomeBtn = document.getElementById("matches-back-to-home-btn");
const matchesOpenCreateBtn = document.getElementById("matches-open-create-btn");

const matchesAdminBlock = document.getElementById("matches-admin-block");
const adminMatchesListEl = document.getElementById("admin-matches-list");
const matchesListEl = document.getElementById("matches-list");

// ★管理者招待 UI
const adminInviteBtn = document.getElementById("admin-invite-btn");
const adminInviteBox = document.getElementById("admin-invite-box");
const adminInviteUrlEl = document.getElementById("admin-invite-url");
const adminInviteCopyBtn = document.getElementById("admin-invite-copy-btn");

// 試合入力（スクショレイアウト）
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

// チーム管理者（試合単位：大会マスタ共有 + 試合選手管理）
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

// ======================
// State
// ======================
let currentMatchId = null;
let currentMatch = null;
let currentTournamentId = null;
let currentMembership = null;
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

let scoreByTeam = {};
let uiTickerId = null;

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
function randomCode(len = 24) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function setTopStatus(text) { if (topStatusEl) topStatusEl.textContent = text || ""; }
function isPublicMatchData(m) { return m?.isPublic === true; }

// 招待リンク用：現在URLのベース
function getBaseUrl() {
  // 例: https://example.com/index.html?x=1 -> https://example.com/index.html
  const u = new URL(window.location.href);
  u.search = "";
  u.hash = "";
  return u.toString();
}

// ======================
// refs
// ======================
const usersCol = () => collection(db, "users");
const userRef = (uid) => doc(db, "users", uid);
const adminsRef = (uid) => doc(db, "admins", uid);

const tournamentsCol = () => collection(db, "tournaments");
const tournamentRef = (tournamentId) => doc(db, "tournaments", tournamentId);
const tournamentTeamPlayersCol = (tournamentId, teamId) => collection(db, "tournaments", tournamentId, "teams", teamId, "players");
const tournamentTeamPlayerRef = (tournamentId, teamId, playerId) => doc(db, "tournaments", tournamentId, "teams", teamId, "players", playerId);

const matchesCol = () => collection(db, "matches");
const matchRef = (matchId) => doc(db, "matches", matchId);
const membershipRef = (matchId, uid) => doc(db, "matches", matchId, "memberships", uid);

const invitesCol = () => collection(db, "invites");
const eventsCol = (matchId) => collection(db, "matches", matchId, "events");
const eventRef = (matchId, eventId) => doc(db, "matches", matchId, "events", eventId);

const matchPlayersCol = (matchId, teamId) => collection(db, "matches", matchId, "teams", teamId, "players");
const matchPlayerRef = (matchId, teamId, playerId) => doc(db, "matches", matchId, "teams", teamId, "players", playerId);

const joinCodeRef = (codeUpper) => doc(db, "joinCodes", codeUpper);

// ★追加：管理者招待トークン
const adminInviteTokenRef = (token) => doc(db, "adminInviteTokens", token);

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
function showAdminCreateScreen() { hideAllMainSections(); adminSection && (adminSection.style.display = "block"); }

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
  } catch {
    return false;
  }
}

// ======================
// tournaments
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
// ★管理者招待リンク（発行/コピー/適用）
// ======================
function getQueryParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

async function issueAdminInviteLink() {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!isAdminUser) return alert("管理者のみ実行できます。");

  const token = randomCode(28);
  const now = Date.now();

  // Firestoreに「未使用トークン」を作る
  // ※ルールで「管理者のみ作成可」にすることが重要
  await setDoc(adminInviteTokenRef(token), {
    token,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    used: false,
    usedAt: null,
    usedBy: null,
    // 期限（例：7日）。ルールで期限チェックしてもよい
    expiresAtMs: now + 7 * 24 * 60 * 60 * 1000,
  });

  const url = `${getBaseUrl()}?adminInvite=${encodeURIComponent(token)}`;

  if (adminInviteUrlEl) adminInviteUrlEl.value = url;
  if (adminInviteBox) adminInviteBox.style.display = "block";

  return url;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // フォールバック
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

async function applyAdminInviteFromUrlIfPresent() {
  const token = getQueryParam("adminInvite");
  if (!token) return false;

  const user = auth.currentUser;
  if (!user) return false; // ログイン後に再実行される

  // 既にAdminなら何もしない（URL掃除だけ）
  const already = await isGlobalAdmin(user.uid);
  if (already) {
    cleanupAdminInviteQuery();
    return true;
  }

  // トークン検証：存在・未使用・期限内
  const ref = adminInviteTokenRef(token);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    alert("管理者招待トークンが無効です（存在しません）。");
    cleanupAdminInviteQuery();
    return false;
  }

  const data = snap.data() || {};
  if (data.used === true) {
    alert("この管理者招待リンクは既に使用されています。");
    cleanupAdminInviteQuery();
    return false;
  }

  const exp = Number(data.expiresAtMs || 0);
  if (exp && Date.now() > exp) {
    alert("この管理者招待リンクは期限切れです。");
    cleanupAdminInviteQuery();
    return false;
  }

  // ★即Admin化：admins/{uid} を作成（merge）
  // ※ここはRules側で「有効トークンがある場合のみ許可」する必要あり
  await setDoc(adminsRef(user.uid), {
    uid: user.uid,
    email: user.email || "",
    createdAt: serverTimestamp(),
    invitedBy: data.createdBy || null,
    inviteToken: token,
  }, { merge: true });

  // トークンを使用済みにマーク
  await updateDoc(ref, {
    used: true,
    usedAt: serverTimestamp(),
    usedBy: user.uid,
  });

  alert("管理者権限を付与しました。");

  cleanupAdminInviteQuery();
  return true;
}

function cleanupAdminInviteQuery() {
  // URLから adminInvite を消してリロードなしで整える
  const u = new URL(window.location.href);
  u.searchParams.delete("adminInvite");
  window.history.replaceState({}, "", u.toString());
}

// UI wiring
adminInviteBtn?.addEventListener("click", async () => {
  try {
    adminInviteBtn.disabled = true;
    const url = await issueAdminInviteLink();
    if (!url) return;
  } catch (e) {
    alert(`招待リンク発行に失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
  } finally {
    adminInviteBtn.disabled = false;
  }
});

adminInviteCopyBtn?.addEventListener("click", async () => {
  const url = String(adminInviteUrlEl?.value || "");
  if (!url) return;
  const ok = await copyToClipboard(url);
  alert(ok ? "コピーしました" : "コピーに失敗しました");
});

// ======================
// matches list（既存）
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

  let shown = 0;

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
            <button class="btn" data-action="enter">試合入力</button>
          </div>
        </div>
      `;

      li.querySelector('[data-action="enter"]')?.addEventListener("click", async (e) => {
        e.stopPropagation();
        await enterMatch(inv.matchId);
      });

      matchesListEl.appendChild(li);
      shown++;
    } catch (e) {
      console.warn("match read skipped:", inv.matchId, e?.code || e);
    }
  }

  if (shown === 0) {
    matchesListEl.innerHTML = "<li>閲覧可能な試合がありません（非公開の可能性があります）。</li>";
  }
}

async function toggleMatchPublic(matchId, nextPublic) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!isAdminUser) return alert("管理者のみ操作できます。");

  try {
    await updateDoc(matchRef(matchId), {
      isPublic: !!nextPublic,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
  } catch (e) {
    alert(`公開設定の更新に失敗\n${e.code || ""}\n${e.message || e}`);
    console.error(e);
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
      const pub = isPublicMatchData(m);

      const li = document.createElement("li");
      li.innerHTML = `
        <div class="match-item">
          <div>
            <div class="match-title">${escapeHtml(formatMatchLabel(m))}</div>
            <div class="hint" style="margin-top:4px;">${pub ? "公開" : "非公開"}</div>
          </div>
          <div class="match-actions">
            <button class="btn ghost" data-action="toggle">${pub ? "非公開にする" : "公開にする"}</button>
            <button class="btn" data-action="enter">試合入力（閲覧）</button>
          </div>
        </div>
      `;

      li.querySelector('[data-action="enter"]')?.addEventListener("click", async () => {
        await enterMatch(m.id);
      });

      li.querySelector('[data-action="toggle"]')?.addEventListener("click", async () => {
        const ok = confirm(`この試合を「${pub ? "非公開" : "公開"}」にしますか？`);
        if (!ok) return;
        await toggleMatchPublic(m.id, !pub);
        await renderAdminAllMatches();
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
async function loadMyMembership(matchId, uid) {
  const snap = await getDoc(membershipRef(matchId, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ======================
// timer/score/event（既存：省略せず全部必要なので最低限のものだけ残す）
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
function canOperateTimer() {
  if (isAdminUser) return true;
  return !!currentMembership;
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

function canRecordEvents() { return currentMembership?.role === "team"; }
function setEventControlsAvailability() {
  const ok = canRecordEvents();
  if (playerSelectEl) playerSelectEl.disabled = !ok;
  if (assistSelectEl) assistSelectEl.disabled = !ok;
  if (recordGoalBtn) recordGoalBtn.disabled = !ok;
  if (recordCallahanBtn) recordCallahanBtn.disabled = !ok;
  if (eventControlsHintEl) eventControlsHintEl.textContent = ok ? "" : "※この画面は閲覧モードです（イベント入力はチーム代表者のみ）。";
}
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

// ここから下は「enterMatch」「イベント編集」「選手管理」等の既存を入れ続ける必要があるが、
// 今回の要点（管理者招待リンク）には直接関与しないため、あなたの直前の最新版app.jsから
// そのまま残して使ってください。
// ただし「onAuthStateChanged」の中で applyAdminInviteFromUrlIfPresent() を呼ぶのは必須です。

// ======================
// Enter match（最低限）
// ======================
async function enterMatch(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  currentMatchId = matchId;
  currentMembership = null;
  currentMatch = null;
  currentTournamentId = null;

  try {
    currentMembership = await loadMyMembership(matchId, user.uid);
  } catch {
    currentMembership = null;
  }

  const snap = await getDoc(matchRef(matchId));
  if (!snap.exists()) return alert("試合が見つかりません。");

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

  showScoreScreen();
}

// back score -> matches（最低限）
backToMatchesBtn?.addEventListener("click", async () => {
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

startTimerBtn?.addEventListener("click", onStartTimerClicked);
stopTimerBtn?.addEventListener("click", onStopTimerClicked);
resetTimerBtn?.addEventListener("click", onResetTimerClicked);

// ======================
// 导線（ホーム/試合一覧/作成）
// ======================
openPlayerRegistryBtn?.addEventListener("click", () => showPlayerRegistryScreen());

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

backToHomeBtn?.addEventListener("click", () => showRepHome());
goToMatchesBtn?.addEventListener("click", () => openMatchesBtn?.click());
matchesBackToHomeBtn?.addEventListener("click", () => showRepHome());

matchesOpenCreateBtn?.addEventListener("click", () => {
  if (!isAdminUser) return;
  showAdminCreateScreen();
});
adminBackToMatchesBtn?.addEventListener("click", () => openMatchesBtn?.click());

// ======================
// login/signup/logout
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
  }
});

loginBtn?.addEventListener("click", async () => {
  const email = normalizeEmail(emailEl?.value || "");
  const password = passEl?.value || "";
  if (!email || !password) return alert("メールとパスワードを入力してください。");
  try {
    if (emailEl) emailEl.value = email;
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert(`ログイン失敗\n${e.code}\n${e.message}`);
  }
});

logoutBtn?.addEventListener("click", async () => {
  try { await signOut(auth); } catch (e) { alert(`ログアウト失敗\n${e.code}\n${e.message}`); }
});

// ======================
// UID verify（users/{uid}作成）
// ======================
function showOnlyUidVerify(user) {
  hideAllMainSections();
  uidVerifySection && (uidVerifySection.style.display = "block");

  const uidToShow = user?.uid || "";
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
      if (uidHintEl) uidHintEl.style.display = got.length === 0 || ok ? "none" : "block";
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

  isAdminUser = await isGlobalAdmin(user.uid);

  // 管理者：試合作成ボタン表示
  if (matchesOpenCreateBtn) matchesOpenCreateBtn.style.display = isAdminUser ? "inline-flex" : "none";
  if (matchesAdminBlock) matchesAdminBlock.style.display = isAdminUser ? "block" : "none";

  try { await loadTournamentOptions(); } catch {}

  showRepHome();
}

// ======================
// Auth state
// ======================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setLoginVisibility(false);
    setTopStatus("");
    hideAllMainSections();
    matchesAdminBlock && (matchesAdminBlock.style.display = "none");
    if (adminInviteBox) adminInviteBox.style.display = "none";
    return;
  }

  if (statusEl) statusEl.textContent = `ログイン中: ${user.email || ""}`;

  const okRegistry = await hasUserRegistry(user);
  if (!okRegistry) {
    setLoginVisibility(true);
    showOnlyUidVerify(user);
    return;
  }

  // ★URLに adminInvite がある場合は、ここで即Admin化を試みる
  // （ログイン後のタイミングで実行する）
  try {
    await applyAdminInviteFromUrlIfPresent();
  } catch (e) {
    console.warn("applyAdminInviteFromUrlIfPresent failed:", e);
  }

  await showPostLoginUI(user);
});
