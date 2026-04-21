import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  where,
  addDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCc3rwlIlZd7NaFkd2viT-tYhS9IemsV9o",
  authDomain: "his-detention.firebaseapp.com",
  projectId: "his-detention",
  storageBucket: "his-detention.firebasestorage.app",
  messagingSenderId: "357843127217",
  appId: "1:357843127217:web:88175e347add4931294b90",
  measurementId: "G-K3X22E8JL5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const penaltyCategories = [
  { label: '지각', points: 1 },
  { label: '복장 불량', points: 1 },
  { label: '수업 방해', points: 2 },
  { label: '무단 결석', points: 3 },
  { label: '기타', points: 1 },
];
const roleLabels = {
  studentAffairs: '학생부',
  education: '교육담당',
  notifications: '알림담당',
  general: '일반',
};

const els = {
  adminLoginBtn: document.getElementById('adminLoginBtn'),
  teacherLoginSection: document.getElementById('teacherLoginSection'),
  teacherEmail: document.getElementById('teacherEmail'),
  teacherPassword: document.getElementById('teacherPassword'),
  teacherLoginBtn: document.getElementById('teacherLoginBtn'),
  teacherApp: document.getElementById('teacherApp'),
  adminApp: document.getElementById('adminApp'),
  teacherLogoutBtn: document.getElementById('teacherLogoutBtn'),
  adminLogoutBtn: document.getElementById('adminLogoutBtn'),
  studentSearch: document.getElementById('studentSearch'),
  studentList: document.getElementById('studentList'),
  selectedStudentBox: document.getElementById('selectedStudentBox'),
  penaltyCategory: document.getElementById('penaltyCategory'),
  penaltyPoints: document.getElementById('penaltyPoints'),
  penaltyReason: document.getElementById('penaltyReason'),
  addPenaltyBtn: document.getElementById('addPenaltyBtn'),
  penaltyHistory: document.getElementById('penaltyHistory'),
  teacherInfo: document.getElementById('teacherInfo'),
  csvEncoding: document.getElementById('csvEncoding'),
  csvFileInput: document.getElementById('csvFileInput'),
  uploadStudentsBtn: document.getElementById('uploadStudentsBtn'),
  studentUploadResult: document.getElementById('studentUploadResult'),
  newTeacherName: document.getElementById('newTeacherName'),
  newTeacherEmail: document.getElementById('newTeacherEmail'),
  newTeacherPassword: document.getElementById('newTeacherPassword'),
  newTeacherRole: document.getElementById('newTeacherRole'),
  createTeacherBtn: document.getElementById('createTeacherBtn'),
  teacherList: document.getElementById('teacherList'),
  adminPenaltyList: document.getElementById('adminPenaltyList'),
};

let currentUser = null;
let currentMode = null;
let currentTeacherProfile = null;
let students = [];
let selectedStudent = null;
let unsubStudents = null;
let unsubStudentPenalties = null;
let unsubTeachers = null;
let unsubAdminPenalties = null;

function alertMsg(message, error = false) {
  alert((error ? '오류: ' : '') + message);
}

function setUploadMessage(message, error = false) {
  els.studentUploadResult.classList.remove('hidden');
  els.studentUploadResult.textContent = message;
  els.studentUploadResult.style.background = error ? '#fef2f2' : '#f0fdf4';
  els.studentUploadResult.style.borderColor = error ? '#fca5a5' : '#86efac';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fmt(ts) {
  return ts?.toDate ? ts.toDate().toLocaleString('ko-KR') : '-';
}

function resetListeners() {
  [unsubStudents, unsubStudentPenalties, unsubTeachers, unsubAdminPenalties].forEach(fn => { if (fn) fn(); });
  unsubStudents = unsubStudentPenalties = unsubTeachers = unsubAdminPenalties = null;
}

function setMode(mode) {
  currentMode = mode;
  els.teacherLoginSection.classList.toggle('hidden', mode !== null);
  els.teacherApp.classList.toggle('hidden', mode !== 'teacher');
  els.adminApp.classList.toggle('hidden', mode !== 'admin');
}

async function adminDoc(uid) {
  const snap = await getDoc(doc(db, 'admins', uid));
  return snap.exists() ? snap.data() : null;
}
async function teacherDoc(uid) {
  const snap = await getDoc(doc(db, 'teachers', uid));
  return snap.exists() ? snap.data() : null;
}

function renderPenaltyOptions() {
  els.penaltyCategory.innerHTML = penaltyCategories.map(item => `<option value="${item.label}">${item.label}</option>`).join('');
  els.penaltyPoints.value = penaltyCategories[0].points;
}
renderPenaltyOptions();
els.penaltyCategory.addEventListener('change', () => {
  const found = penaltyCategories.find(x => x.label === els.penaltyCategory.value);
  if (found) els.penaltyPoints.value = found.points;
});

els.adminLoginBtn.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    const admin = await adminDoc(result.user.uid);
    if (!admin) {
      const message = `이 Google 계정은 아직 관리자 등록이 되어 있지 않습니다.\n\nFirestore에 아래 문서를 먼저 만들어 주세요.\n컬렉션: admins\n문서 ID: ${result.user.uid}\n필드: uid=${result.user.uid}, email=${result.user.email || ''}, name=${result.user.displayName || '관리자'}\n\n문서를 만든 뒤 다시 로그인해 주세요.`;
      await signOut(auth);
      alert(message);
      return;
    }
    currentMode = 'admin';
  } catch (err) {
    console.error(err);
    alertMsg('관리자 로그인에 실패했습니다.', true);
  }
});

els.teacherLoginBtn.addEventListener('click', async () => {
  try {
    await signInWithEmailAndPassword(auth, els.teacherEmail.value.trim(), els.teacherPassword.value);
    currentMode = 'teacher';
  } catch (err) {
    console.error(err);
    alertMsg('교사 로그인에 실패했습니다.', true);
  }
});

els.teacherLogoutBtn.addEventListener('click', () => signOut(auth));
els.adminLogoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  resetListeners();
  currentUser = user;
  currentTeacherProfile = null;
  selectedStudent = null;

  if (!user) {
    setMode(null);
    return;
  }

  const admin = await adminDoc(user.uid);
  if (admin && currentMode === 'admin') {
    setMode('admin');
    bindAdmin();
    return;
  }

  const teacher = await teacherDoc(user.uid);
  if (teacher?.active) {
    currentTeacherProfile = teacher;
    setMode('teacher');
    bindTeacher();
    return;
  }

  await signOut(auth);
  alertMsg('권한이 없는 계정입니다.', true);
});

function bindTeacher() {
  els.teacherInfo.innerHTML = `<span class="badge">${escapeHtml(currentTeacherProfile.name || currentUser.email)}</span><span class="badge">${escapeHtml(roleLabels[currentTeacherProfile.role] || '일반')}</span>`;
  listenStudents();
}

function bindAdmin() {
  listenStudents();
  listenTeachers();
  listenAllPenalties();
}

function listenStudents() {
  unsubStudents = onSnapshot(query(collection(db, 'students'), orderBy('className'), orderBy('name')), (snapshot) => {
    students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStudentList();
  });
}

function renderStudentList() {
  const keyword = (els.studentSearch.value || '').trim().toLowerCase();
  const filtered = students.filter(student => [student.name, student.englishName, student.className].filter(Boolean).some(v => String(v).toLowerCase().includes(keyword)));
  if (!filtered.length) {
    els.studentList.innerHTML = '<div class="empty-box">학생이 없습니다.</div>';
    return;
  }
  els.studentList.innerHTML = filtered.map(student => `
    <button class="student-item ${selectedStudent?.id === student.id ? 'selected' : ''}" data-id="${escapeHtml(student.id)}">
      <div class="student-name">${escapeHtml(student.name || '')}</div>
      <div class="student-meta">${escapeHtml(student.englishName || '-')} / ${escapeHtml(student.className || '-')}</div>
    </button>
  `).join('');
  els.studentList.querySelectorAll('.student-item').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStudent = students.find(s => s.id === btn.dataset.id);
      renderSelectedStudent();
      listenStudentPenalties();
      renderStudentList();
    });
  });
}
els.studentSearch.addEventListener('input', renderStudentList);

function renderSelectedStudent() {
  if (!selectedStudent) {
    els.selectedStudentBox.textContent = '학생을 선택해 주세요.';
    return;
  }
  els.selectedStudentBox.innerHTML = `<strong>${escapeHtml(selectedStudent.name)}</strong><br><span class="student-meta">${escapeHtml(selectedStudent.englishName || '-')} / ${escapeHtml(selectedStudent.className || '-')}</span>`;
}

function listenStudentPenalties() {
  if (unsubStudentPenalties) unsubStudentPenalties();
  if (!selectedStudent) {
    els.penaltyHistory.innerHTML = '<div class="empty-box">학생을 선택하면 벌점 이력이 표시됩니다.</div>';
    return;
  }
  unsubStudentPenalties = onSnapshot(query(collection(db, 'penaltyRecords'), where('studentId', '==', selectedStudent.id), orderBy('createdAt', 'desc')), (snapshot) => {
    const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!records.length) {
      els.penaltyHistory.innerHTML = '<div class="empty-box">벌점 이력이 없습니다.</div>';
      return;
    }
    els.penaltyHistory.innerHTML = records.map(r => `
      <div class="history-item">
        <div class="history-top"><strong>${escapeHtml(r.category || '')}</strong><span>${Number(r.points || 0)}점 ${r.canceled ? '· 취소됨' : ''}</span></div>
        <div>${escapeHtml(r.reason || '사유 없음')}</div>
        <div class="history-meta">${escapeHtml(r.teacherName || '')} · ${fmt(r.createdAt)}</div>
      </div>
    `).join('');
  });
}

els.addPenaltyBtn.addEventListener('click', async () => {
  if (!selectedStudent) return alertMsg('학생을 먼저 선택해 주세요.', true);
  if (!currentTeacherProfile) return alertMsg('교사 권한이 없습니다.', true);
  try {
    await addDoc(collection(db, 'penaltyRecords'), {
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      englishName: selectedStudent.englishName || '',
      className: selectedStudent.className || '',
      teacherUid: currentUser.uid,
      teacherName: currentTeacherProfile.name || currentUser.email,
      teacherRole: currentTeacherProfile.role || 'general',
      category: els.penaltyCategory.value,
      points: Number(els.penaltyPoints.value || 1),
      reason: els.penaltyReason.value.trim(),
      canceled: false,
      createdAt: serverTimestamp(),
    });
    els.penaltyReason.value = '';
    alertMsg('벌점이 등록되었습니다.');
  } catch (err) {
    console.error(err);
    alertMsg('벌점 등록에 실패했습니다.', true);
  }
});

function readTextWithEncoding(file, encoding) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(new TextDecoder(encoding).decode(reader.result));
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

els.uploadStudentsBtn.addEventListener('click', async () => {
  const file = els.csvFileInput.files[0];
  if (!file) return setUploadMessage('CSV 파일을 선택해 주세요.', true);

  try {
    const text = await readTextWithEncoding(file, els.csvEncoding.value);
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        try {
          let count = 0;
          for (const row of data) {
            const name = (row.name || '').trim();
            if (!name) continue;
            await setDoc(doc(db, 'students', name), {
              name,
              englishName: (row.englishName || '').trim(),
              className: (row.className || '').trim(),
              updatedAt: serverTimestamp(),
            });
            count += 1;
          }
          setUploadMessage(`${count}명의 학생 명단 업로드가 완료되었습니다.`);
        } catch (e) {
          console.error(e);
          setUploadMessage('학생 명단 저장 중 오류가 발생했습니다.', true);
        }
      },
      error: (e) => {
        console.error(e);
        setUploadMessage('CSV 파싱 중 오류가 발생했습니다.', true);
      }
    });
  } catch (e) {
    console.error(e);
    setUploadMessage('파일 읽기 실패입니다. 인코딩을 UTF-8 / EUC-KR로 바꿔서 다시 시도해 주세요.', true);
  }
});

async function createTeacherAuthAccount(email, password) {
  const secondary = initializeApp(firebaseConfig, 'secondary-' + Date.now());
  const secondaryAuth = getAuth(secondary);
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  await secondaryAuth.signOut();
  return cred.user;
}

els.createTeacherBtn.addEventListener('click', async () => {
  const name = els.newTeacherName.value.trim();
  const email = els.newTeacherEmail.value.trim();
  const password = els.newTeacherPassword.value;
  const role = els.newTeacherRole.value;
  if (!name || !email || !password) return alertMsg('이름, 이메일, 비밀번호를 모두 입력해 주세요.', true);

  try {
    const user = await createTeacherAuthAccount(email, password);
    await setDoc(doc(db, 'teachers', user.uid), {
      uid: user.uid,
      name,
      email,
      role,
      active: true,
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid,
    });
    els.newTeacherName.value = '';
    els.newTeacherEmail.value = '';
    els.newTeacherPassword.value = '';
    alertMsg('교사 계정이 생성되었습니다.');
  } catch (err) {
    console.error(err);
    alertMsg('교사 계정 생성에 실패했습니다. 이미 존재하는 이메일인지 확인해 주세요.', true);
  }
});

function listenTeachers() {
  unsubTeachers = onSnapshot(query(collection(db, 'teachers'), orderBy('name')), (snapshot) => {
    const teachers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!teachers.length) {
      els.teacherList.innerHTML = '<div class="empty-box">등록된 교사가 없습니다.</div>';
      return;
    }
    els.teacherList.innerHTML = teachers.map(t => `
      <div class="teacher-card">
        <div class="teacher-top"><strong>${escapeHtml(t.name || '')}</strong><span>${t.active ? '활성' : '비활성'}</span></div>
        <div class="teacher-meta">${escapeHtml(t.email || '')}</div>
        <div class="teacher-meta">권한: ${escapeHtml(roleLabels[t.role] || '일반')}</div>
        <div class="teacher-actions">
          <select class="role-select" data-id="${t.id}">
            ${Object.entries(roleLabels).map(([key, label]) => `<option value="${key}" ${t.role === key ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
          <button class="secondary-btn reset-password-btn" data-email="${escapeHtml(t.email || '')}">비밀번호 재설정 메일</button>
          <button class="${t.active ? 'secondary-btn' : 'primary-btn'} toggle-active-btn" data-id="${t.id}" data-active="${t.active ? '1' : '0'}">${t.active ? '비활성화' : '활성화'}</button>
        </div>
      </div>
    `).join('');

    els.teacherList.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        await updateDoc(doc(db, 'teachers', sel.dataset.id), { role: sel.value, updatedAt: serverTimestamp() });
        alertMsg('교사 권한이 변경되었습니다.');
      });
    });
    els.teacherList.querySelectorAll('.toggle-active-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const active = btn.dataset.active === '1';
        await updateDoc(doc(db, 'teachers', btn.dataset.id), { active: !active, updatedAt: serverTimestamp() });
        alertMsg(active ? '교사를 비활성화했습니다.' : '교사를 활성화했습니다.');
      });
    });
    els.teacherList.querySelectorAll('.reset-password-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await sendPasswordResetEmail(auth, btn.dataset.email);
          alertMsg('비밀번호 재설정 이메일을 보냈습니다.');
        } catch (err) {
          console.error(err);
          alertMsg('비밀번호 재설정 이메일 전송에 실패했습니다.', true);
        }
      });
    });
  });
}

function listenAllPenalties() {
  unsubAdminPenalties = onSnapshot(query(collection(db, 'penaltyRecords'), orderBy('createdAt', 'desc')), (snapshot) => {
    const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!records.length) {
      els.adminPenaltyList.innerHTML = '<div class="empty-box">벌점 기록이 없습니다.</div>';
      return;
    }
    els.adminPenaltyList.innerHTML = records.map(r => `
      <div class="history-item">
        <div class="history-top"><strong>${escapeHtml(r.studentName || '')} · ${escapeHtml(r.category || '')}</strong><span>${Number(r.points || 0)}점 ${r.canceled ? '· 취소됨' : ''}</span></div>
        <div>${escapeHtml(r.reason || '사유 없음')}</div>
        <div class="history-meta">${escapeHtml(r.teacherName || '')} · ${escapeHtml(roleLabels[r.teacherRole] || '일반')} · ${fmt(r.createdAt)}</div>
        ${!r.canceled ? `<div class="teacher-actions"><button class="danger-btn cancel-penalty-btn" data-id="${r.id}">기록 취소</button></div>` : ''}
      </div>
    `).join('');
    els.adminPenaltyList.querySelectorAll('.cancel-penalty-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await updateDoc(doc(db, 'penaltyRecords', btn.dataset.id), {
          canceled: true,
          canceledAt: serverTimestamp(),
          canceledBy: currentUser.uid,
        });
        alertMsg('벌점 기록을 취소 처리했습니다.');
      });
    });
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});
