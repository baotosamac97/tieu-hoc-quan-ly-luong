import { auth, provider, signInWithPopup, onAuthStateChanged, signOut, db, doc, getDoc } from "./firebase.js";

export function setupAuthUI(onUserChanged){
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const info = document.getElementById("authInfo");
  const roleBadge = document.getElementById("roleBadge");

  loginBtn.onclick = async ()=>{
    await signInWithPopup(auth, provider);
  };
  logoutBtn.onclick = async ()=>{
    await signOut(auth);
  };

  onAuthStateChanged(auth, async (user)=>{
    if(user){
      info.textContent = `${user.displayName} (${user.email})`;
      info.classList.remove("hidden");
      logoutBtn.classList.remove("hidden");
      loginBtn.classList.add("hidden");

      // lấy role từ Firestore: collection 'roles' doc id = uid  { role: 'admin'|'editor'|'viewer' }
      let role = "viewer";
      try{
        const snap = await getDoc(doc(db,"roles",user.uid));
        if (snap.exists()) role = snap.data().role || "viewer";
      }catch{}
      roleBadge.textContent = role.toUpperCase();
      roleBadge.classList.remove("hidden");

      onUserChanged?.({ user, role });
    }else{
      info.classList.add("hidden");
      logoutBtn.classList.add("hidden");
      loginBtn.classList.remove("hidden");
      roleBadge.classList.add("hidden");
      onUserChanged?.(null);
    }
  });
}
