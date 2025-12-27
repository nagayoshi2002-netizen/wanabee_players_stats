// Firebaseの読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


// --------------------
// ログイン機能
// --------------------
const loginBtn = document.getElementById('login-btn');
const loginSection = document.getElementById('login-section');
const scoreSection = document.getElementById('score-section');

loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    // ログインを試行
    await signInWithEmailAndPassword(auth, email, password);
    alert("ログイン完了");
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // 初回ユーザーならアカウント作成
      await createUserWithEmailAndPassword(auth, email, password);
      alert("新規登録が完了しました");
    } else {
      alert("ログインできませんでした：" + error.message);
    }
  }
});

// ログイン状態監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.style.display = "none";
    scoreSection.style.display = "block";
  } else {
    loginSection.style.display = "block";
    scoreSection.style.display = "none";
  }
});


<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "あなたのAPIキー",
    authDomain: "あなたのドメイン.firebaseapp.com",
    projectId: "あなたのプロジェクトID",
    storageBucket: "あなたのストレージバケット",
    messagingSenderId: "xxxx",
    appId: "xxxx"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
</script>
