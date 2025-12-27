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
console.log("adminInfoEl:", adminInfoEl);

// DOM（チーム参加）
const joinSection = document.getElementById("join-section");
const joinCodeEl = document.getElementById("join-code");
const teamNameEl = document.getElementById("team-name");
const joinBtn = document.getElementById("join-btn");
const joinInfoEl = document.getElementById("join-info");

// DOM（試合一覧）
const matchesSection = document.getElementById("matches-section");
const matchesList = document.getElementById("matches-list");

async function fetchInvitesForEmail(email) {
  const q = query(collection(db, "invites"), where("email", "==", email));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function ensureMembershipFromInvite(invite, user) {
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

  // optional: mark used
  const invRef = doc(db, "invites", invite.id);
  const invSnap = await getDoc(invRef);
  if (invSnap.exists() && !invSnap.data().usedAt) {
    await updateDoc(invRef, { usedAt: serverTimestamp() });
  }
}

async function renderMatchesFromInvites(user) {
  matchesList.innerHTML = "";

  const invites = await fetchInvitesForEmail(user.email);
  if (invites.length === 0) {
    matchesList.innerHTML = "<li>招待されている試合がありません。</li>";
    return;
  }

  for (const inv of invites) {
    await ensureMembershipFromInvite(inv, user);
  }

  for (const inv of invites) {
    const matchSnap = await getDoc(doc(db, "matches", inv.matchId));
    if (!matchSnap.exists()) continue;

    const m = matchSnap.data();
    const li = document.createElement("li");
    li.textContent = `${m.title || "Untitled Match"}（matchId: ${inv.matchId}）`;
    matchesList.appendChild(li);
  }
}

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


loginBtn.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;

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

  const matchRef = await addDoc(collection(db, "matches"), {
    title,
    status: "scheduled",
    createdBy: user.uid,
    joinCode,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, "matches", matchRef.id, "memberships", user.uid), {
    role: "admin",
    createdAt: serverTimestamp(),
  });

  const msg = `作成完了：matchId=${matchRef.id} / joinCode=${joinCode}`;
  if (adminInfoEl) adminInfoEl.textContent = msg;
  alert(`試合作成OK\njoinCode: ${joinCode}`);
});

async function fetchInvitesForMyEmail(email) {
  const q = query(collection(db, "invites"), where("email", "==", email));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function renderMatchesFromInvites(user) {
  matchesList.innerHTML = "";

  const invites = await fetchInvitesForMyEmail(user.email);
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
    li.textContent = `${m.title || "Untitled Match"}（joinCode: ${m.joinCode || "-"}）`;
    matchesList.appendChild(li);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    statusEl.textContent = "";
    logoutBtn.style.display = "none";
    signupBtn.style.display = "inline-block";
    adminSection.style.display = "none";
    matchesSection.style.display = "none";
    joinSection.style.display = "none"; // ← ログイン前は隠すのが自然
    teamSection.style.display = "none";
    scoreSection.style.display = "none";
    return;
  }

  statusEl.textContent = `ログイン中: ${user.email}`;
  logoutBtn.style.display = "inline-block";
  signupBtn.style.display = "none";

  // admin UI
  const ok = await isGlobalAdmin(user.uid);
  adminSection.style.display = ok ? "block" : "none";

  // team UI
  joinSection.style.display = "block";      // 予備導線として残すなら
  matchesSection.style.display = "block";   // 招待試合表示

  try {
    await renderMatchesFromInvites(user);
  } catch (e) {
    alert(`招待試合の表示に失敗: ${e.code}\n${e.message}`);
    console.error(e);
  }

  teamSection.style.display = "none";
  scoreSection.style.display = "none";
});
