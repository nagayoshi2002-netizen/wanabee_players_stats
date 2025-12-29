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

// DOM（セクション）
const adminSection = document.getElementById("admin-section");
const joinSection = document.getElementById("join-section");
const matchesSection = document.getElementById("matches-section");
const teamAdminSection = document.getElementById("team-admin-section");
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
let currentMatch = null;        // matches/{matchId} data
let currentTournamentId = null; // matches.tournamentId（あれば）
let currentMembership = null;
let teamId = null;              // = auth.uid（チーム識別）

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

// 大会マスタ
function tournamentTeamPlayersCol(tournamentId, teamId_) {
  return collection(db, "tournaments", tournamentId, "teams", teamId_, "players");
}

function tournamentTeamPlayerRef(tournamentId, teamId_, playerId) {
  return doc(db, "tournaments", tournamentId, "teams", teamId_, "players", playerId);
}

// ======================
// UI bootstrap（動的追加：Stop/Assist/他イベント/スコア表示）
// ======================
function ensureExtraUI() {
  // Stopボタン
  if (startTimerBtn && !stopTimerBtn) {
    stopTimerBtn = document.createElement("button");
    stopTimerBtn.id = "stop-timer-btn";
    stopTimerBtn.textContent = "タイマー停止";
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
}

function setScoreUI() {
  if (!scoreLeftEl || !scoreRightEl || !teamId) return;
  const my = scoreByTeam[teamId] || 0;
  const opp = opponentTeamId ? (scoreByTeam[opponentTeamId] || 0) : 0;
  scoreLeftEl.textContent = String(my);
  scoreRightEl.textContent = String(opp);
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
}

function cleanupAdminRealtime() {
  unsubTournamentPlayers?.(); unsubTournamentPlayers = null;
  unsubMatchPlayers?.(); unsubMatchPlayers = null;
}

// ======================
// Invites / matches list
// ======================
async function fetchInvitesForEmail(emailLower) {
  const q = query(invitesCol(), where("email", "==", emailLower));
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
// Players: helpers
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

async function getPlayerLabelFromMatchPlayers(playerId) {
  if (!currentMatchId || !teamId) return playerId;
  try {
    const snap = await getDoc(matchPlayerRef(currentMatchId, teamId, playerId));
    if (!snap.exists()) return playerId;
    const p = snap.data();
    return `${p.number || "-"} ${p.name || ""}`.trim() || playerId;
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

  currentMatchId = matchId;
  teamId = user.uid;

  // membership
  try {
    currentMembership = await loadMyMembership(matchId, user);
    if (!currentMembership) {
      alert("この試合への参加権限がありません（membershipがありません）。");
      return;
    }
  } catch (e) {
    alert(`membership 読み込み失敗\n${e.code}\n${e.message}`);
    console.error(e);
    return;
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

  // UI
  matchesSection.style.display = "none";
  joinSection.style.display = "none";
  adminSection.style.display = adminSection.style.display; // no-op
  teamAdminSection.style.display = "none";
  teamSection.style.display = "none";
  scoreSection.style.display = "block";

  ensureExtraUI();
  resetTimer();
  scoreByTeam = {};
  opponentTeamId = "";
  setScoreUI();

  // players（この試合の選手リストを select に反映）
  unsubPlayersForSelect = onSnapshot(
    query(matchPlayersCol(matchId, teamId), orderBy("number", "asc")),
    (snap) => {
      const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rebuildPlayerSelects(players);
    },
    (err) => {
      alert(`この試合の選手読み込み失敗\n${err.code}\n${err.message}`);
      console.error(err);
    }
  );

  // events / score
  subscribeEvents(matchId);
  subscribeScoreAggregate(matchId);
}

// ======================
// Back button to matches
// ======================
function goBackToMatches() {
  cleanupMatchRealtime();
  cleanupAdminRealtime();

  currentMatchId = null;
  currentMatch = null;
  currentTournamentId = null;
  currentMembership = null;

  scoreByTeam = {};
  opponentTeamId = "";

  resetTimer();

  teamAdminSection.style.display = "none";
  teamSection.style.display = "none";
  scoreSection.style.display = "none";

  matchesSection.style.display = "block";
  joinSection.style.display = "block";
}

backToMatchesBtn?.addEventListener("click", goBackToMatches);

// スコア入力から選手管理へ
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
  if (!currentMatchId || !teamId) return alert("試合を選択してください。");

  const scorerId = playerSelectEl?.value || "";
  if (!scorerId) return alert("選手を選択してください。");

  const assistId = assistSelectEl?.value || "";
  const timeMs = currentTimerMs();

  try {
    await addDoc(eventsCol(currentMatchId), {
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
    const scorerLabel = await getPlayerLabelFromMatchPlayers(ev.scorerPlayerId || "");
    const assistLabel = ev.assistPlayerId ? await getPlayerLabelFromMatchPlayers(ev.assistPlayerId) : "";
    const assistText = ev.type === "goal" && assistLabel ? `（A: ${assistLabel}）` : "";

    const li = document.createElement("li");
    li.setAttribute("data-event-id", ev.id);
    li.innerHTML = `
      <span>${escapeHtml(`${t} / ${typeLabel(ev.type)} / ${scorerLabel} ${assistText}`)}</span>
      <button class="ghost" data-action="edit">編集</button>
      <button class="ghost" data-action="delete">削除</button>
    `;
    scoreListEl.appendChild(li);
  }

  // edit/delete（簡易：admin-only update/delete ルールの場合は失敗するので注意）
  scoreListEl.onclick = async (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;

    const li = e.target.closest("li");
    const id = li?.getAttribute("data-event-id");
    if (!id || !currentMatchId) return;

    const action = btn.getAttribute("data-action");
    const ref = eventRef(currentMatchId, id);

    if (action === "delete") {
      if (!confirm("このログを削除しますか？")) return;
      try {
        await deleteDoc(ref);
      } catch (err) {
        alert(`削除失敗\n${err.code}\n${err.message}`);
        console.error(err);
      }
    }

    if (action === "edit") {
      const ev0 = events.find((x) => x.id === id);
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
        await updateDoc(ref, payload);
      } catch (err) {
        alert(`編集失敗\n${err.code}\n${err.message}`);
        console.error(err);
      }
    }
  };
}

// ======================
// Score aggregate（goal + callahan を得点として計上）
// ======================
function subscribeScoreAggregate(matchId) {
  unsubScoreAgg = onSnapshot(
    query(eventsCol(matchId), orderBy("createdAt", "asc")),
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
    }
  );
}

// ======================
// Team admin (大会マスタ共有 + 試合選手管理)
// ======================
async function openTeamAdmin(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  cleanupMatchRealtime();
  cleanupAdminRealtime();

  // membership check
  const mem = await loadMyMembership(matchId, user);
  if (!mem) return alert("この試合の参加権限がありません。");

  // match
  const m = await loadMatch(matchId);
  if (!m) return alert("試合が見つかりません。");

  currentMatchId = matchId;
  currentMatch = m;
  currentTournamentId = m.tournamentId || null;
  teamId = user.uid;

  // UI
  matchesSection.style.display = "none";
  joinSection.style.display = "none";
  scoreSection.style.display = "none";
  teamSection.style.display = "none";
  teamAdminSection.style.display = "block";

  const title = (m.title || "Untitled Match").trim();
  const tour = currentTournamentId ? currentTournamentId : "（未設定）";
  if (teamAdminContextEl) {
    teamAdminContextEl.textContent = `対象試合：${title} / tournamentId: ${tour}`;
  }

  backToMatchesFromAdminBtn.onclick = () => goBackToMatches();
  goToScoreFromAdminBtn.onclick = () => enterMatch(matchId);

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
    if (tournamentPlayersListEl) {
      tournamentPlayersListEl.innerHTML = "<li>この試合には tournamentId が未設定です（大会マスタ機能は使用できません）。</li>";
    }
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
  addTournamentPlayerBtn.onclick = async () => {
    if (!currentTournamentId) return alert("tournamentId が未設定です。");
    const number = (tournamentPlayerNumberEl.value || "").trim();
    const name = (tournamentPlayerNameEl.value || "").trim();
    if (!number || !name) return alert("背番号と名前を入力してください。");
    await addDoc(tournamentTeamPlayersCol(currentTournamentId, teamId), {
      number, name,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tournamentPlayerNumberEl.value = "";
    tournamentPlayerNameEl.value = "";
  };

  // ---- 大会マスタ：一括追加
  bulkAddTournamentBtn.onclick = async () => {
    if (!currentTournamentId) return alert("tournamentId が未設定です。");
    const rows = parseBulkPlayers(bulkTournamentPlayersEl.value || "");
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
    bulkTournamentPlayersEl.value = "";
  };

  // ---- 試合選手：個別追加
  addMatchPlayerBtn.onclick = async () => {
    const number = (matchPlayerNumberEl.value || "").trim();
    const name = (matchPlayerNameEl.value || "").trim();
    if (!number || !name) return alert("背番号と名前を入力してください。");
    await addDoc(matchPlayersCol(matchId, teamId), {
      number, name,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    matchPlayerNumberEl.value = "";
    matchPlayerNameEl.value = "";
  };

  // ---- 試合選手：一括追加
  bulkAddMatchBtn.onclick = async () => {
    const rows = parseBulkPlayers(bulkMatchPlayersEl.value || "");
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
    bulkMatchPlayersEl.value = "";
  };

  // ---- 試合選手：全削除
  clearMatchPlayersBtn.onclick = async () => {
    if (!confirm("この試合の選手を全削除しますか？")) return;
    await clearAllMatchPlayers(matchId, teamId);
  };

  // ---- 大会→試合コピー
  copyTournamentToMatchBtn.onclick = async () => {
    if (!currentTournamentId) return alert("tournamentId が未設定です。");
    // 既存がある場合は上書きするか確認
    const existing = await getDocs(query(matchPlayersCol(matchId, teamId)));
    if (!existing.empty) {
      const ok = confirm("この試合の選手が既に存在します。削除して大会マスタからコピーしますか？");
      if (!ok) return;
      await clearAllMatchPlayers(matchId, teamId);
    }
    await copyTournamentPlayersToMatch(currentTournamentId, matchId, teamId);
    alert("大会マスタをこの試合へコピーしました。");
  };
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

  // バッチは 500 件制限があるので分割（安全）
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
// joinCode 参加（予備導線）
// ======================
async function findMatchIdByJoinCode(code) {
  const q = query(matchesCol(), where("joinCode", "==", code));
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

    // ルールが inviteId 必須の場合、joinCode導線は設計/ルール調整が必要です。
    await setDoc(membershipRef(matchId, user.uid), {
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
// 簡易：選手登録（試合中用）
// ======================
addPlayerBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!currentMatchId) return alert("試合を選択してください。");

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
    playerNameEl.value = "";
    playerNumberEl.value = "";
  } catch (e) {
    alert(`選手追加失敗\n${e.code}\n${e.message}`);
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
    cleanupMatchRealtime();
    cleanupAdminRealtime();
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
// 管理者：試合作成
// （注意）大会単位マスタ共有を使うなら、match に tournamentId を入れるのが理想。
// 今回は UI 追加なしで、将来のため tournamentId を空で作成しても動くようにしています。
// ======================
createMatchBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const ok = await isGlobalAdmin(user.uid);
  if (!ok) return alert("管理者権限がありません（adminsにUIDが未登録）。");

  const title = (matchTitleEl?.value || "").trim() || "Untitled Match";
  const joinCode = randomJoinCode(8);

  try {
    const ref = await addDoc(matchesCol(), {
      title,
      status: "scheduled",
      createdBy: user.uid,
      joinCode,
      tournamentId: "", // ★運用で入れるならここに値を入れる
      createdAt: serverTimestamp(),
    });

    await setDoc(membershipRef(ref.id, user.uid), {
      role: "admin",
      createdAt: serverTimestamp(),
    });

    const msg = `作成完了：matchId=${ref.id} / joinCode=${joinCode}`;
    adminInfoEl.textContent = msg;
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
    joinSection.style.display = "none";
    matchesSection.style.display = "none";
    teamAdminSection.style.display = "none";
    teamSection.style.display = "none";
    scoreSection.style.display = "none";

    matchesList.innerHTML = "";
    return;
  }

  statusEl.textContent = `ログイン中: ${user.email}`;
  logoutBtn.style.display = "inline-block";
  signupBtn.style.display = "none"; // 要件：ログインしたら新規登録を消す

  // 管理者表示
  try {
    const ok = await isGlobalAdmin(user.uid);
    adminSection.style.display = ok ? "block" : "none";
  } catch {
    adminSection.style.display = "none";
  }

  // 初期画面
  cleanupMatchRealtime();
  cleanupAdminRealtime();

  teamAdminSection.style.display = "none";
  teamSection.style.display = "none";
  scoreSection.style.display = "none";
  joinSection.style.display = "block";
  matchesSection.style.display = "block";

  // 試合一覧
  await renderMatchesFromInvites(user);
});
