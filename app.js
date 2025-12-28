// app.js（invites 周り：1セット・1定義に整理済み）
// ※このファイルを「丸ごと」置き換える前提の完全版です。

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
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc
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


let currentMatchId = null;

function enterMatch(matchId) {
  currentMatchId = matchId;
  sessionStorage.setItem("currentMatchId", matchId);

  // 一覧・参加導線は隠す（好みで調整OK）
  matchesSection.style.display = "none";
  joinSection.style.display = "none";

  // 入力画面を開く
  teamSection.style.display = "block";
  scoreSection.style.display = "block";

  // ここで「この試合の players / events を読み込む」処理を呼ぶ（次ステップ）
  // loadPlayersForMatch(matchId);
  // loadEventsForMatch(matchId);
}

// ======================
// utils
// ======================
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

// ======================
// invites 周り（1セット・1定義）
// ======================
async function fetchInvitesForEmail(email) {
  const q = query(collection(db, "invites"), where("email", "==", email));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function ensureMembershipFromInvite(invite, user) {
  // matches/{matchId}/memberships/{uid} を確実に作る（存在しなければ作成）
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

  // invite を処理済みにする（任意：重複管理用）
  /*
  const invRef = doc(db, "invites", invite.id);
  const invSnap = await getDoc(invRef);
  if (invSnap.exists() && !invSnap.data().usedAt) {
    await updateDoc(invRef, { usedAt: serverTimestamp() });
  }
  */
}

async function renderMatchesFromInvites(user) {
  matchesList.innerHTML = "";

  const emailKey = (user.email || "").trim().toLowerCase();
  const invites = await fetchInvitesForEmail(emailKey);
  if (invites.length === 0) {
    matchesList.innerHTML = "<li>招待されている試合がありません。</li>";
    return;
  }

  // 招待→参加登録（membership化）
  for (const inv of invites) {
    await ensureMembershipFromInvite(inv, user);
  }

  // 試合情報を表示
  for (const inv of invites) {
    const matchSnap = await getDoc(doc(db, "matches", inv.matchId));
    if (!matchSnap.exists()) continue;
  
    const m = matchSnap.data();
    const li = document.createElement("li");
    li.textContent = `${m.title || "Untitled Match"}（matchId: ${inv.matchId} / joinCode: ${m.joinCode || "-"}）`;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => {
      enterMatch(inv.matchId);
    });
    matchesList.appendChild(li);
  }
}

// ======================
// joinCode 参加（予備導線）
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

    await setDoc(doc(db, "matches", matchId, "memberships", user.uid), {
      role: "team",
      teamName,
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

    // 作成者をこの試合の admin として membership 作成
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
  if (!user) {
    statusEl.textContent = "";
    logoutBtn.style.display = "none";
    signupBtn.style.display = "inline-block";

    adminSection.style.display = "none";
    matchesSection.style.display = "none";
    joinSection.style.display = "none";
    teamSection.style.display = "none";
    scoreSection.style.display = "none";
    return;
  }

  // ログイン中表示
  statusEl.textContent = `ログイン中: ${user.email}`;
  logoutBtn.style.display = "inline-block";
  signupBtn.style.display = "none";

  // 管理者表示
  try {
    const ok = await isGlobalAdmin(user.uid);
    adminSection.style.display = ok ? "block" : "none";
  } catch (e) {
    adminSection.style.display = "none";
    console.error("admin check failed:", e);
  }

  // チーム：招待試合を表示（主導線）
  matchesSection.style.display = "block";

async function renderMatchesFromInvites(user) {
  matchesList.innerHTML = "";

  const emailKey = (user.email || "").trim().toLowerCase();

  let invites = [];
  try {
    invites = await fetchInvitesForEmail(emailKey);
    console.log("invites:", invites);
  } catch (e) {
    alert(`invites 読み込み権限エラー\n${e.code}\n${e.message}`);
    console.error(e);
    return;
  }

  if (invites.length === 0) {
    matchesList.innerHTML = "<li>招待されている試合がありません。</li>";
    return;
  }

  // membership 作成
  try {
    for (const inv of invites) {
      await ensureMembershipFromInvite(inv, user);
    }
  } catch (e) {
    alert(`membership 作成権限エラー\n${e.code}\n${e.message}`);
    console.error(e);
    return;
  }

  // matches 読み込み
  try {
    for (const inv of invites) {
      const matchSnap = await getDoc(doc(db, "matches", inv.matchId));
      console.log("match read ok:", inv.matchId, matchSnap.exists());
    }
  } catch (e) {
    alert(`matches 読み込み権限エラー\n${e.code}\n${e.message}`);
    console.error(e);
    return;
  }
}

  // joinCode は予備導線として表示（不要なら "none" にしてOK）
  joinSection.style.display = "block";

  // 次フェーズで match 選択後に表示するので、現段階では隠す
  teamSection.style.display = "none";
  scoreSection.style.display = "none";
});




