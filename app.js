import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

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

// DOM
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusEl = document.getElementById("login-status");
const loginSection = document.getElementById("login-section");
const teamSection = document.getElementById("team-section");
const scoreSection = document.getElementById("score-section");

// まず「クリックできているか」確実に見える化
loginBtn.addEventListener("click", async () => {
  alert("ログイン処理を開始します"); // ← これが出ないならJSが読み込まれていない/別エラーで停止

  const email = emailEl.value.trim();
  const password = passEl.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("ログイン成功");
  } catch (e) {
    alert(`ログイン失敗: ${e.code || ""} ${e.message}`);
  }
});

signupBtn.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("新規登録成功（そのままログイン状態になります）");
  } catch (e) {
    alert(`新規登録失敗: ${e.code || ""} ${e.message}`);
  }
});

logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    statusEl.textContent = `ログイン中: ${user.email}`;
    logoutBtn.style.display = "inline-block";
    teamSection.style.display = "block";
    scoreSection.style.display = "block";
  } else {
    statusEl.textContent = "";
    logoutBtn.style.display = "none";
    teamSection.style.display = "none";
    scoreSection.style.display = "none";
  }
});

// 読み込み確認
console.log("app.js loaded OK");
