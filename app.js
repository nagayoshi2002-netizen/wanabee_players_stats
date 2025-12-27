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
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

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

// DOM（ログイン）
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusEl = document.getElementById("login-status");

// DOM（セクション）
const teamSection = document.getElementById("team-section");
const scoreSection = document.getElementById("score-section");
const adminSection = document.getElementById("admin-section");

// DOM（管理者）
const matchTitleEl = document.getElementById("match-title");
const createMatchBtn = document.getElementById("create-match-btn");
const adminInfoEl = document.getElementById("admin-info");

function randomJoinCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function isGlobalAdmin(uid) {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}

// Auth UI
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

// 管理者：試合作成
createMatchBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("ログインしてください。");

  const ok = await isGlobalAdmin(user.uid);
  if (!ok) return alert("管理者権限がありません（adminsにUIDが未登録）。");

  const title = matchTitleEl.value.trim() || "Untitled Match";
  const joinCode = randomJoinCode(8);

  // matches を作成
  const matchRef = await addDoc(collection(db, "matches"), {
    title,
    status: "scheduled",
    createdBy: user.uid,
    joinCode,
    createdAt: serverTimestamp(),
  });

  // 作成者をこの試合の admin として membership 作成
  await setDoc(doc(db, "matches", matchRef.id, "memberships", user.uid), {
    role: "admin",
    createdAt: serverTimestamp(),
  });

  adminInfoEl.textContent = `作成完了：matchId=${matchRef.id} / joinCode=${joinCode}`;
  alert(`試合作成OK\njoinCode: ${joinCode}`);
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    statusEl.textContent = "";
    logoutBtn.style.display = "none";
    adminSection.style.display = "none";
    teamSection.style.display = "none";
    scoreSection.style.display = "none";
    return;
  }

  // ログイン中表示（メールに）
  statusEl.textContent = `ログイン中: ${user.email}`;
  logoutBtn.style.display = "inline-block";

  // ログインしたら新規登録ボタンを消す（要望の1つ）
  signupBtn.style.display = "none";

  // 管理者なら管理者セクション表示
  const ok = await isGlobalAdmin(user.uid);
  adminSection.style.display = ok ? "block" : "none";

  // チーム/スコアは次ステップで match参加後に表示するので、いったん隠す
  teamSection.style.display = "none";
  scoreSection.style.display = "none";
});
