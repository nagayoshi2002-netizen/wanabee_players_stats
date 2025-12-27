import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

/** ★ここだけあなたのFirebaseの値に差し替え（Firebase ConsoleのWebアプリ設定） */
const firebaseConfig = {
  apiKey: "AIzaSyAcebN4AcESHXYgQbsM-qdJC4PvlfzBbmA",
  authDomain: "wanabee-players-stats.firebaseapp.com",
  projectId: "wanabee-players-stats",
  storageBucket: "wanabee-players-stats.firebasestorage.app",
  messagingSenderId: "392879235657",
  appId: "1:392879235657:web:a0b0b0c87caf1643865598"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- DOM ----------
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusEl = document.getElementById("login-status");

const loginSection = document.getElementById("login-section");
const teamSection = document.getElementById("team-section");
const scoreSection = document.getElementById("score-section");

const playerNameEl = document.getElementById("player-name");
const playerNumberEl = document.getElementById("player-number");
const addPlayerBtn = document.getElementById("add-player-btn");

const playerSelect = document.getElementById("player-select");
const startTimerBtn = document.getElementById("start-timer-btn");
const resetTimerBtn = document.getElementById("reset-timer-btn");
const timerEl = document.getElementById("timer");
const recordScoreBtn = document.getElementById("record-score-btn");
const scoreList = document.getElementById("score-list");

// ---------- Timer ----------
let seconds = 0;
let timerId = null;

function renderTimer() {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  timerEl.textContent = `${m}:${s}`;
}

startTimerBtn.addEventListener("click", () => {
  if (timerId) return;
  timerId = setInterval(() => {
    seconds += 1;
    renderTimer();
  }, 1000);
});

resetTimerBtn.addEventListener("click", () => {
  if (timerId) clearInterval(timerId);
  timerId = null;
  seconds = 0;
  renderTimer();
});

// ---------- Auth ----------
signupBtn.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;
  if (!email || !password) return alert("メールとパスワードを入力してください。");
  await createUserWithEmailAndPassword(auth, email, password);
});

loginBtn.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;
  if (!email || !password) return alert("メールとパスワードを入力してください。");
  await signInWithEmailAndPassword(auth, email, password);
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

function setUIAuthed(isAuthed, uid = "") {
  teamSection.style.display = isAuthed ? "block" : "none";
  scoreSection.style.display = isAuthed ? "block" : "none";
  logoutBtn.style.display = isAuthed ? "inline-block" : "none";
  statusEl.textContent = isAuthed ? `ログイン中: ${uid}` : "";
}

// ---------- Firestore: players & scores ----------
let unsubPlayers = null;
let unsubScores = null;

function wireTeamData(uid) {
  // players: teams/{uid}/players
  const playersRef = collection(db, "teams", uid, "players");
  const playersQ = query(playersRef, orderBy("number", "asc"));

  if (unsubPlayers) unsubPlayers();
  unsubPlayers = onSnapshot(playersQ, (snap) => {
    playerSelect.innerHTML = `<option value="">選手を選択</option>`;
    snap.forEach((doc) => {
      const p = doc.data();
      const label = `#${p.number} ${p.name}`;
      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = label;
      opt.dataset.label = label;
      playerSelect.appendChild(opt);
    });
  });

  // scores: teams/{uid}/scores
  const scoresRef = collection(db, "teams", uid, "scores");
  const scoresQ = query(scoresRef, orderBy("createdAt", "desc"));

  if (unsubScores) unsubScores();
  unsubScores = onSnapshot(scoresQ, (snap) => {
    scoreList.innerHTML = "";
    snap.forEach((doc) => {
      const s = doc.data();
      const li = document.createElement("li");
      li.textContent = `${s.playerLabel} / 経過 ${s.elapsed} / 記録 ${s.clientTime}`;
      scoreList.appendChild(li);
    });
  });
}

addPlayerBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const name = playerNameEl.value.trim();
  const number = playerNumberEl.value.trim();

  if (!name || !number) return alert("名前と背番号を入力してください。");

  await addDoc(collection(db, "teams", user.uid, "players"), {
    name,
    number,
    createdAt: serverTimestamp(),
  });

  playerNameEl.value = "";
  playerNumberEl.value = "";
});

recordScoreBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const selected = playerSelect.options[playerSelect.selectedIndex];
  if (!selected || !selected.value) return alert("選手を選択してください。");

  const playerLabel = selected.dataset.label;
  const elapsed = timerEl.textContent;
  const now = new Date();
  const clientTime = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;

  await addDoc(collection(db, "teams", user.uid, "scores"), {
    playerId: selected.value,
    playerLabel,
    elapsed,
    clientTime,
    createdAt: serverTimestamp(),
  });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    setUIAuthed(true, user.uid);
    wireTeamData(user.uid);
  } else {
    setUIAuthed(false);
    if (unsubPlayers) unsubPlayers();
    if (unsubScores) unsubScores();
    unsubPlayers = null;
    unsubScores = null;
  }
});

renderTimer();

