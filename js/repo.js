import { db, auth, collection, addDoc, serverTimestamp, getDocs, query, where } from "./firebase.js";

// Lưu dataset vào Firestore (1 bản ghi = 1 snapshot dữ liệu)
export async function saveDatasetToFirebase(records, meta = {}){
  const user = auth.currentUser;
  if(!user) throw new Error("Cần đăng nhập Google.");
  const ref = await addDoc(collection(db,"datasets"), {
    uid: user.uid,
    createdAt: serverTimestamp(),
    meta,
    rows: records,            // dữ liệu lưu trực tiếp; nếu >1MB thì nên chunk/Storage (đủ dùng mức trường)
  });
  return ref.id;
}

// Tải dataset gần nhất của user (hoặc theo tag)
export async function loadLatestDatasetFromFirebase(){
  const user = auth.currentUser;
  if(!user) throw new Error("Cần đăng nhập Google.");
  const q = query(collection(db,"datasets"), where("uid","==",user.uid));
  const snap = await getDocs(q);
  // lấy bản mới nhất theo createdAt (firestore lite: sort client)
  const all = [];
  snap.forEach(d => { all.push({ id:d.id, ...d.data() }); });
  all.sort((a,b)=>{
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return tb - ta;
  });
  return all[0] || null;
}
