// Refactored Core (v2)
// - 중앙 상태 관리
// - 안전한 key 생성
// - 부분 업데이트 구조
// - 간단한 상태 스토어

const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  databaseURL: "REPLACE_ME",
  projectId: "REPLACE_ME"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ---- STATE STORE ----
const store = {
  teachers: {},
  students: {},
};

// ---- UTIL ----
function esc(s){
  return String(s ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function uid(){
  return 'id_' + Math.random().toString(36).slice(2);
}

// ---- DB LAYER ----
async function loadAll(){
  const [t, s] = await Promise.all([
    db.ref('teachers').once('value'),
    db.ref('students').once('value')
  ]);

  store.teachers = t.val() || {};
  store.students = s.val() || {};
}

async function saveTeacher(id, data){
  await db.ref('teachers/' + id).update(data);
}

async function saveStudent(id, data){
  await db.ref('students/' + id).update(data);
}