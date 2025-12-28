// app.js（改善版：ToDo反映）
// 前提：このファイルを「丸ごと」置き換え。
// 既存HTMLは変更しなくても動くように、足りないUI（停止ボタン/アシスト選択/種別ボタン等）はJS側で動的に追加します。

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

// ======================
// State
// ======================
let currentMatchId = null;
let currentMembership = null; // { role, teamName, ... }
let teamId = null;            // = auth.uid をチーム識別に使う（対戦相手も別uid）
let timerBaseMs = 0;          // タイマー表示用（開始〜停止で加算）
let timerStartAt = null;      // Date.now() when running
let timerIntervalId = null;

let assistSelectEl = null;
let stopTimerBtn = null;
let eventButtons = {};        // {goal, callahan, block}
let unsubscribePlayers = null;
let unsubscribeEvents = null;

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

// ======================
// UI bootstrap（HTML変更なしで追加UIを生成）
// ======================
function ensureExtraUI() {
  // 1) Stopボタン追加（Startの隣）
  if (startTimerBtn && !stopTimerBtn) {
    stopTimerBtn = document.createElement("button");
    stopTimerBtn.id = "stop-timer-btn";
    stopTimerBtn.textContent = "タイマー停止";
    stopTimerBtn.className = "ghost";
    stopTimerBtn.style.marginLeft = "8px";
    startTimerBtn.parentElement?.appendChild(stopTimerBtn);

    stopTimerBtn.addEventListener("click", () => stopTimer());
  }

  // 2) アシスト選択（player-select の隣に追加）
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

  // 3) 得点以外のボタン（キャナハン/ブロック）を追加
  if (recordScoreBtn && !eventButtons.callahan) {
    const row = recordScoreBtn.parentElement; // HTML上は <div class="row">内
    // 既存の「得点を記録」は goal として扱う
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

    // イベント記録
    recordScoreBtn.addEventListener("click", () => recordEvent("goal"));
    btnCallahan.addEventListener("click", () => recordEvent("callahan"));
    btnBlock.addEventListener("click", () => recordEvent("block"));
  }

  // Start / Reset ハンドラ（既存ボタン）
  startTimerBtn?.addEventListener("click", () => startTimer());
  resetTimerBtn?.addEventListener("click", () => resetTimer());
}

// ======================
// Timer controls（Start/Stop/Reset）
// ======================
function startTimer() {
  if (timerIntervalId) return; // already running
  if (timerStartAt == null) timerStartAt = Date.now();

  timerIntervalId = window.setInterval(() => {
    setTimerText();
  }, 250);

  setTimerText();
}

function stopTimer() {
  if (!timerIntervalId) return;
  clearInterval(timerIntervalId);
  timerIntervalId = null;

  // 加算して停止
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
  // matches/{matchId}/memberships/{uid}
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
      li.textContent = `${m.title || "Untitled Match"}（matchId: ${inv.matchId} / joinCode: ${m.joinCode || "-"}）`;
      li.style.cursor = "pointer";
      li.addEventListener("click", () => enterMatch(inv.matchId));
      matchesList.appendChild(li);
    } catch (e) {
      console.error("match read failed:", inv.matchId, e);
      // 1件失敗しても継続
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
}

async function enterMatch(matchId) {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  // 状態更新
  cleanupRealtime();
  currentMatchId = matchId;
  sessionStorage.setItem("currentMatchId", matchId);

  // membership 読み込み（ロール/チーム名）
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

  // ロード
  resetTimer();
  ensureExtraUI();
  subscribePlayers(matchId, teamId);
  subscribeEvents(matchId);
}

// ======================
// Players（チームごとの選手マスタ：事前登録＆試合後も編集可）
// 設計：matches/{matchId}/teams/{teamId}/players/{playerId}
// teamId = auth.uid（＝チームのログイン単位）
// ======================
function playersColRef(matchId, teamId_) {
  return collection(db, "matches", matchId, "teams", teamId_, "players");
}

async function addPlayer(matchId, teamId_) {
  const name = (playerNameEl?.value || "").trim();
  const number = (playerNumberEl?.value || "").trim();
  if (!name || !number) return alert("名前と背番号を入力してください。");

  // HTMLにemail入力欄が無いので、必要ならpromptで取得（空でも可）
  const email = prompt("選手のメールアドレス（任意）:", "") || "";

  try {
    await addDoc(playersColRef(matchId, teamId_), {
      name,
      number,
      email: normalizeEmail(email),
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
  // scorer
  if (playerSelectEl) {
    const keep0 = playerSelectEl.querySelector('option[value=""]') || null;
    playerSelectEl.innerHTML = "";
    if (keep0) playerSelectEl.appendChild(keep0);
    else {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "選手を選択";
      playerSelectEl.appendChild(o);
    }
  }

  // assist
  if (assistSelectEl) {
    const keep0 = assistSelectEl.querySelector('option[value=""]') || null;
    assistSelectEl.innerHTML = "";
    if (keep0) assistSelectEl.appendChild(keep0);
    else {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "アシスト（任意）";
      assistSelectEl.appendChild(o);
    }
  }

  for (const p of players) {
    if (playerSelectEl) upsertPlayerOption(playerSelectEl, p);
    if (assistSelectEl) upsertPlayerOption(assistSelectEl, p);
  }
}

function subscribePlayers(matchId, teamId_) {
  // 自チームのplayersのみ購読（運用：対戦相手は自分のチームで別uid）
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
  // HTMLに管理UIがないため、team-section の下に簡易一覧を生成して編集/削除を提供
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
      const safeName = (p.name || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      const safeNum = (p.number || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      const safeEmail = (p.email || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      return `
        <li data-player-id="${p.id}">
          <span>${safeNum} ${safeName} ${safeEmail ? " / " + safeEmail : ""}</span>
          <button class="ghost" data-action="edit">編集</button>
          <button class="ghost" data-action="delete">削除</button>
        </li>
      `;
    })
    .join("");

  box.innerHTML = `
    <h3 style="margin: 12px 0 6px;">選手一覧（編集可）</h3>
    <ul id="players-admin-list" style="padding-left: 16px;">${rows}</ul>
    <p class="hint">編集：名前/背番号/メールアドレスを変更できます（試合開始後も可）。</p>
  `;

  const list = document.getElementById("players-admin-list");
  list?.addEventListener("click", async (ev) => {
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
      const email = prompt("メール（任意）:", p?.email || "") ?? null;
      if (email === null) return;

      try {
        await updateDoc(playerRef, {
          name: name.trim(),
          number: number.trim(),
          email: normalizeEmail(email),
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        alert(`編集失敗\n${e.code}\n${e.message}`);
        console.error(e);
      }
    }
  }, { once: true }); // 連続addを防ぐ（snapshot更新ごとに付くため）
}

// 選手追加ボタン
addPlayerBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");
  if (!currentMatchId || !teamId) return alert("試合を選択してください。");

  await addPlayer(currentMatchId, teamId);
});

// ======================
// Events（得点/キャナハン/ブロック + 得点時アシスト）
// 設計：matches/{matchId}/events/{eventId}
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

  // type別バリデーション
  if (type !== "goal" && assistId) {
    // ブロック/キャナハンにアシストは不要なので無視（UIは任意）
  }

  const timeMs = currentTimerMs();

  try {
    await addDoc(eventsColRef(currentMatchId), {
      type,                 // "goal" | "callahan" | "block"
      timeMs,
      teamId,               // 記録したチーム（= uid）
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

function subscribeEvents(matchId) {
  // 最新順（時刻が同じ場合は作成順に近い挙動になる）
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

  // 自チームのプレイヤーラベルを優先（対戦相手の選手名まで表示したい場合は設計拡張が必要）
  try {
    const pSnap = await getDoc(doc(db, "matches", currentMatchId, "teams", teamId, "players", playerId));
    if (!pSnap.exists()) return playerId;
    const p = pSnap.data();
    return `${p.number || "-"} ${p.name || ""}`.trim() || playerId;
  } catch {
    return playerId;
  }
}

function typeLabel(type) {
  if (type === "goal") return "得点";
  if (type === "callahan") return "キャナハン";
  if (type === "block") return "ブロック";
  return type;
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

    const main = `${t} / ${typeLabel(ev.type)} / ${scorerLabel}`;
    const assistText = ev.type === "goal" && assistLabel ? `（A: ${assistLabel}）` : "";

    li.innerHTML = `
      <span>${escapeHtml(main)} ${escapeHtml(assistText)}</span>
      <button class="ghost" data-action="edit">編集</button>
      <button class="ghost" data-action="delete">削除</button>
    `;
    scoreListEl.appendChild(li);
  }

  // クリックイベント（編集/削除）
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
      // 最低限：時間（mm:ss）と、得点者/アシストの再設定をpromptで対応
      // UIを本格化する場合はモーダル/フォーム推奨。
      const ev0 = events.find((x) => x.id === eventId);
      if (!ev0) return;

      const newType = prompt("種別（goal / callahan / block）:", ev0.type || "goal");
      if (newType === null) return;

      const newTime = prompt("時間（mm:ss）:", msToMMSS(ev0.timeMs || 0));
      if (newTime === null) return;

      const mmss = parseMMSS(newTime);
      if (mmss == null) return alert("時間は mm:ss 形式で入力してください（例：02:15）。");

      // 得点者/アシストはIDを入力させると辛いので、現状は「現在の選択値」を使えるようにする
      // （必要なら後でUI化）
      const scorerId = prompt("得点者（playerId）※変更しない場合は空:", "");
      if (scorerId === null) return;
      const assistId = prompt("アシスト（playerId）※任意、変更しない場合は空:", "");
      if (assistId === null) return;

      const payload = {
        type: newType.trim(),
        timeMs: mmss,
        updatedAt: serverTimestamp(),
      };
      if (scorerId.trim()) payload.scorerPlayerId = scorerId.trim();
      if (payload.type === "goal") {
        // goalのみアシストを保持
        if (assistId.trim()) payload.assistPlayerId = assistId.trim();
        else payload.assistPlayerId = ""; // 明示的に消す
      } else {
        payload.assistPlayerId = "";
      }

      try {
        await updateDoc(eventRef, payload);
      } catch (err) {
        alert(`編集失敗\n${err.code}\n${err.message}`);
        console.error(err);
      }
    }
  };
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

// ======================
// joinCode 参加（予備導線）
// ※ルールが inviteId 必須の場合、この導線は「必ず弾かれます」。
//   運用するならルールを緩めるか、joinCodeでinviteを発行する設計に切替が必要。
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

    // 重要：あなたの現行ルールだと inviteId 必須のため、この書き込みは拒否されます。
    // joinCode導線を残すなら、ルール or データ設計の見直しが必要です。
    await setDoc(doc(db, "matches", matchId, "memberships", user.uid), {
      role: "team",
      teamName,
      inviteId: "joinCode", // ルール回避用（運用上の意味付けが必要）
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

  if (!email || !password) {
    alert("メールとパスワードを入力してください。");
    return;
  }

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

  if (!email || !password) {
    alert("メールとパスワードを入力してください。");
    return;
  }

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
    // matches を作成
    const matchRef = await addDoc(collection(db, "matches"), {
      title,
      status: "scheduled",
      createdBy: user.uid,
      joinCode,
      createdAt: serverTimestamp(),
    });

    // 管理者自身をこの試合の admin として membership 作成
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

  if (!user) {
    statusEl.textContent = "";
    logoutBtn.style.display = "none";
    signupBtn.style.display = "inline-block"; // ログアウト時のみ表示（ToDo）
    adminSection.style.display = "none";
    matchesSection.style.display = "none";
    joinSection.style.display = "none";
    teamSection.style.display = "none";
    scoreSection.style.display = "none";
    matchesList.innerHTML = "";
    return;
  }

  // ログイン中表示
  statusEl.textContent = `ログイン中: ${user.email}`;
  logoutBtn.style.display = "inline-block";
  signupBtn.style.display = "none"; // ログインしたら消す（ToDo）

  // 管理者表示
  try {
    const ok = await isGlobalAdmin(user.uid);
    adminSection.style.display = ok ? "block" : "none";
  } catch (e) {
    adminSection.style.display = "none";
    console.error("admin check failed:", e);
  }

  // 試合一覧を表示
  matchesSection.style.display = "block";
  joinSection.style.display = "block";

  // 入室前は隠す
  teamSection.style.display = "none";
  scoreSection.style.display = "none";

  // 招待試合一覧を描画
  try {
    await renderMatchesFromInvites(user);
  } catch (e) {
    alert(`招待試合表示エラー\n${e.code}\n${e.message}`);
    console.error(e);
  }

  // 以前の試合に戻る（任意）
  const saved = sessionStorage.getItem("currentMatchId");
  if (saved) {
    // savedが消えていたら黙って無視
    // 明示的に戻りたいならここをONにする
    // await enterMatch(saved);
  }
});
