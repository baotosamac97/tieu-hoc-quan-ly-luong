// auth.js
import { auth, db, doc, getDoc, collection, query, where, getDocs } from "./firebase.js";

async function fetchRoleFor(user){
  // 1) ưu tiên theo UID (chuẩn)
  const snap = await getDoc(doc(db, "roles", user.uid));
  if (snap.exists()) return snap.data().role || "viewer";

  // 2) fallback: tìm doc có field email == user.email
  const q = query(collection(db, "roles"), where("email", "==", user.email));
  const qs = await getDocs(q);
  if (!qs.empty) {
    const d = qs.docs[0].data();
    return d.role || "viewer";
  }
  return "viewer";
}
