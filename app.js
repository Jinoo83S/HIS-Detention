import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  where,
  addDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  getDocs,
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
  teacherCsvEncoding: document.getElementById('teacherCsvEncoding'),
  teacherCsvFileInput: document.getElementById('teacherCsvFileInput'),
  uploadTeachersBtn: document.getElementById('uploadTeachersBtn'),
  teacherUploadResult: document.getElementById('teacherUploadResult'),
  adminPenaltyList: document.getElementById('adminPenaltyList'),
  teacherTableSearch: document.getElementById('teacherTableSearch'),
  teacherTableBody: document.getElementById('teacherTableBody'),
  addTeacherRowBtn: document.getElementById('addTeacherRowBtn'),
  saveTeacherTableBtn: document.getElementById('saveTeacherTableBtn'),
  sendResetSelectedBtn: document.getElementById('sendResetSelectedBtn'),
  teacherCheckAll: document.getElementById('teacherCheckAll'),
  studentTableSearch: document.getElementById('studentTableSearch'),
  studentTableBody: document.getElementById('studentTableBody'),
  addStudentRowBtn: document.getElementById('addStudentRowBtn'),
  saveStudentTableBtn: document.getElementById('saveStudentTableBtn'),
  penaltyTableSearch: document.getElementById('penaltyTableSearch'),
};

let currentUser = null;
let currentTeacherProfile = null;
let students = [];
let teachers = [];
let selectedStudent = null;
let allPenaltyRecords = [];
let studentRows = [];
let teacherRows = [];
let unsubStudents = null;
let unsubStudentPenalties = null;
let unsubTeachers = null;
let unsubAdminPenalties = null;

function alertMsg(message, error = false) {
  alert((error ? '오류: ' : '') + message);
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

function setUploadMessage(element, message, error = false) {
  element.classList.remove('hidden');
  element.textContent = message;
  element.style.background = error ? '#fef2f2' : '#ecfdf5';
  element.style.borderColor = error ? '#fca5a5' : '#86efac';
}

function rowStatusClass(status) {
  return {
    saved: 'status-saved',
    new: 'status-new',
    dirty: 'status-dirty',
    error: 'status-error',
  }[status] || 'status-new';
}

function rowStatusLabel(status) {
  return {
    saved: '저장됨',
    new: '신규',
    dirty: '수정됨',
    error: '오류',
  }[status] || '신규';
}

function resetListeners() {
  [unsubStudents, unsubStudentPenalties, unsubTeachers, unsubAdminPenalties].forEach(fn => { if (fn) fn(); });
  unsubStudents = unsubStudentPenalties = unsubTeachers = unsubAdminPenalties = null;
}

function setMode(mode) {
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
      const message = `이 Google 계정은 아직 관리자 등록이 되어 있지 않습니다.\n\nFirestore에 아래 문서를 먼저 만들어 주세요.\n\n컬렉션: admins\n문서 ID: ${result.user.uid}\n\n필드\n- uid: ${result.user.uid}\n- email: ${result.user.email || ''}\n- name: ${result.user.displayName || '관리자'}\n- role: admin\n\n문서를 만든 뒤 다시 로그인해 주세요.`;
      await signOut(auth);
      alert(message);
      return;
    }

    if (admin.role !== 'admin') {
      await signOut(auth);
      alertMsg('관리자 권한(role=admin)이 없는 계정입니다.', true);
      return;
    }

    setMode('admin');
    bindAdmin();
  } catch (err) {
    console.error('관리자 로그인 오류:', err);
    const code = err?.code || 'unknown';
    const message = err?.message || '알 수 없는 오류';
    alert(`관리자 로그인에 실패했습니다.\n\n오류 코드: ${code}\n오류 메시지: ${message}`);
  }
});

els.teacherLoginBtn.addEventListener('click', async () => {
  try {
    await signInWithEmailAndPassword(auth, els.teacherEmail.value.trim(), els.teacherPassword.value);
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
  if (admin && admin.role === 'admin') {
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

function sortStudents(list) {
  return [...list].sort((a, b) => {
    const classA = String(a.className || '');
    const classB = String(b.className || '');
    if (classA !== classB) return classA.localeCompare(classB, 'ko');
    return String(a.name || '').localeCompare(String(b.name || ''), 'ko');
  });
}

function listenStudents() {
  unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
    students = sortStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    studentRows = students.map(s => ({
      originalId: s.id,
      name: s.name || '',
      englishName: s.englishName || '',
      className: s.className || '',
      status: 'saved',
    }));
    renderStudentList();
    renderStudentTable();
  }, (err) => {
    console.error(err);
    alertMsg(`학생 목록을 불러오지 못했습니다.\n${err.message || ''}`, true);
  });
}

function renderStudentList() {
  const keyword = (els.studentSearch.value || '').trim().toLowerCase();
  const filtered = students.filter(student => [student.name, student.englishName, student.className].filter(Boolean).some(v => String(v).toLowerCase().includes(keyword)));
  if (!filtered.length) {
    els.studentList.innerHTML = '<div class="helper-box">학생이 없습니다.</div>';
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
    els.penaltyHistory.innerHTML = '<div class="helper-box">학생을 선택하면 벌점 이력이 표시됩니다.</div>';
    return;
  }
  unsubStudentPenalties = onSnapshot(query(collection(db, 'penaltyRecords'), where('studentId', '==', selectedStudent.id), orderBy('createdAt', 'desc')), (snapshot) => {
    const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!records.length) {
      els.penaltyHistory.innerHTML = '<div class="helper-box">벌점 이력이 없습니다.</div>';
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
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function normalizeRole(value) {
  const raw = String(value || '').trim().toLowerCase();
  const roleMap = {
    '학생부': 'studentAffairs',
    'studentaffairs': 'studentAffairs',
    'student_affairs': 'studentAffairs',
    '교육담당': 'education',
    'education': 'education',
    '알림담당': 'notifications',
    'notification': 'notifications',
    'notifications': 'notifications',
    '일반': 'general',
    'general': 'general',
  };
  return roleMap[raw] || 'general';
}

function normalizeBoolean(value, fallback = true) {
  if (value === true || value === false) return value;
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'y', 'yes', 'o', '사용', '활성'].includes(raw)) return true;
  if (['0', 'false', 'n', 'no', 'x', '미사용', '비활성'].includes(raw)) return false;
  return fallback;
}

async function uploadStudentCsvRows(rows) {
  let count = 0;
  for (const row of rows) {
    const name = (row.name || '').trim();
    if (!name) continue;
    await setDoc(doc(db, 'students', name), {
      name,
      englishName: (row.englishName || '').trim(),
      className: (row.className || '').trim(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    count += 1;
  }
  return count;
}

els.uploadStudentsBtn.addEventListener('click', async () => {
  const file = els.csvFileInput.files[0];
  if (!file) return setUploadMessage(els.studentUploadResult, 'CSV 파일을 선택해 주세요.', true);

  try {
    const text = await readTextWithEncoding(file, els.csvEncoding.value);
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        try {
          const count = await uploadStudentCsvRows(data);
          setUploadMessage(els.studentUploadResult, `${count}명의 학생 명단 업로드가 완료되었습니다.`);
          // onSnapshot will refresh automatically; force local render too
          if (unsubStudents === null) listenStudents();
        } catch (e) {
          console.error(e);
          setUploadMessage(els.studentUploadResult, '학생 명단 저장 중 오류가 발생했습니다.', true);
        }
      },
      error: (e) => {
        console.error(e);
        setUploadMessage(els.studentUploadResult, 'CSV 파싱 중 오류가 발생했습니다.', true);
      }
    });
  } catch (e) {
    console.error(e);
    setUploadMessage(els.studentUploadResult, '파일 읽기 실패입니다. 인코딩을 UTF-8 / EUC-KR로 바꿔서 다시 시도해 주세요.', true);
  }
});

function markTeacherRowDirty(index) {
  const row = teacherRows[index];
  if (row && row.status === 'saved') row.status = 'dirty';
}

function renderTeacherTable() {
  const keyword = (els.teacherTableSearch.value || '').trim().toLowerCase();
  const filtered = teacherRows.filter(row => [row.name, row.email].some(v => String(v || '').toLowerCase().includes(keyword)));
  if (!filtered.length) {
    els.teacherTableBody.innerHTML = `<tr><td colspan="9"><div class="helper-box">등록된 교사가 없습니다.</div></td></tr>`;
    return;
  }

  els.teacherTableBody.innerHTML = filtered.map(row => {
    const index = teacherRows.indexOf(row);
    return `
      <tr data-index="${index}">
        <td class="cell-check"><input class="teacher-row-check" type="checkbox" /></td>
        <td><span class="status-badge ${rowStatusClass(row.status)}">${rowStatusLabel(row.status)}</span></td>
        <td><input class="teacher-name" value="${escapeHtml(row.name)}" /></td>
        <td><input class="teacher-email" type="email" value="${escapeHtml(row.email)}" ${row.uid ? 'readonly' : ''} /></td>
        <td><input class="teacher-password" type="text" value="${escapeHtml(row.password || '')}" placeholder="신규만 입력" ${row.uid ? 'disabled' : ''} /></td>
        <td>
          <select class="teacher-role">
            ${Object.entries(roleLabels).map(([key, label]) => `<option value="${key}" ${row.role === key ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
        </td>
        <td style="text-align:center"><input class="teacher-active inline-toggle" type="checkbox" ${row.active ? 'checked' : ''} /></td>
        <td>${row.uid ? (row.uid.slice(0, 8) + '...') : '신규 행'}</td>
        <td><button class="row-delete-btn teacher-delete-btn">삭제</button></td>
      </tr>
    `;
  }).join('');

  els.teacherTableBody.querySelectorAll('tr').forEach(tr => {
    const index = Number(tr.dataset.index);
    tr.querySelector('.teacher-name').addEventListener('input', e => {
      teacherRows[index].name = e.target.value;
      markTeacherRowDirty(index);
      renderTeacherTable();
    });
    tr.querySelector('.teacher-email').addEventListener('input', e => {
      teacherRows[index].email = e.target.value.trim();
      markTeacherRowDirty(index);
      renderTeacherTable();
    });
    tr.querySelector('.teacher-password').addEventListener('input', e => {
      teacherRows[index].password = e.target.value;
      markTeacherRowDirty(index);
      renderTeacherTable();
    });
    tr.querySelector('.teacher-role').addEventListener('change', e => {
      teacherRows[index].role = e.target.value;
      markTeacherRowDirty(index);
      renderTeacherTable();
    });
    tr.querySelector('.teacher-active').addEventListener('change', e => {
      teacherRows[index].active = e.target.checked;
      markTeacherRowDirty(index);
      renderTeacherTable();
    });
    tr.querySelector('.teacher-delete-btn').addEventListener('click', async () => {
      if (!confirm('이 행을 삭제하시겠습니까?\n기존 계정은 Firestore에서 비활성 처리됩니다.')) return;
      const row = teacherRows[index];
      if (row.uid) {
        await updateDoc(doc(db, 'teachers', row.uid), { active: false, updatedAt: serverTimestamp() });
      } else {
        teacherRows.splice(index, 1);
        renderTeacherTable();
      }
    });
  });
}

els.teacherTableSearch.addEventListener('input', renderTeacherTable);
els.addTeacherRowBtn.addEventListener('click', () => {
  teacherRows.unshift({ uid: '', name: '', email: '', password: '', role: 'general', active: true, status: 'new' });
  renderTeacherTable();
});
els.teacherCheckAll?.addEventListener('change', () => {
  document.querySelectorAll('.teacher-row-check').forEach(cb => { cb.checked = els.teacherCheckAll.checked; });
});

async function createTeacherAuthAccount(email, password) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: false }),
  });
  const payload = await response.json();
  if (!response.ok) {
    const msg = payload?.error?.message || 'SIGN_UP_FAILED';
    throw new Error(msg);
  }
  return { uid: payload.localId };
}

async function getTeacherUidByEmail(email) {
  const snap = await getDocs(query(collection(db, 'teachers'), where('email', '==', email)));
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return docSnap.data().uid || docSnap.id;
}

async function saveTeacherRow(row) {
  if (!row.name.trim() || !row.email.trim()) {
    row.status = 'error';
    return false;
  }

  if (!row.uid) {
    if (!row.password || row.password.length < 4) {
      row.status = 'error';
      return false;
    }

    const existingUid = await getTeacherUidByEmail(row.email.trim());
    if (existingUid) {
      row.uid = existingUid;
    } else {
      const user = await createTeacherAuthAccount(row.email.trim(), row.password);
      row.uid = user.uid;
    }
  }

  await setDoc(doc(db, 'teachers', row.uid), {
    uid: row.uid,
    name: row.name.trim(),
    email: row.email.trim(),
    role: normalizeRole(row.role),
    active: !!row.active,
    updatedAt: serverTimestamp(),
    createdBy: currentUser.uid,
  }, { merge: true });

  row.password = '';
  row.status = 'saved';
  return true;
}

els.saveTeacherTableBtn.addEventListener('click', async () => {
  try {
    let savedCount = 0;
    for (const row of teacherRows) {
      if (row.status === 'saved') continue;
      const ok = await saveTeacherRow(row);
      if (ok) savedCount += 1;
    }
    renderTeacherTable();
    alertMsg(savedCount > 0 ? `교사 계정 ${savedCount}건을 저장했습니다.` : '저장할 변경사항이 없습니다.');
  } catch (err) {
    console.error(err);
    alertMsg(`교사 계정 저장 중 오류가 발생했습니다.\n${err.message || ''}`, true);
  }
});

els.sendResetSelectedBtn.addEventListener('click', async () => {
  const rows = [...document.querySelectorAll('.teacher-row-check')]
    .map((checkbox, visibleIndex) => ({ checkbox, visibleIndex }))
    .filter(x => x.checkbox.checked)
    .map(x => document.querySelectorAll('#teacherTableBody tr')[x.visibleIndex])
    .map(tr => teacherRows[Number(tr.dataset.index)])
    .filter(row => row?.email);

  if (!rows.length) {
    alertMsg('재설정 메일을 보낼 교사를 선택해 주세요.', true);
    return;
  }

  try {
    for (const row of rows) {
      await sendPasswordResetEmail(auth, row.email);
    }
    alertMsg(`${rows.length}명에게 비밀번호 재설정 이메일을 보냈습니다.`);
  } catch (err) {
    console.error(err);
    alertMsg('비밀번호 재설정 이메일 전송에 실패했습니다.', true);
  }
});

function sortTeachers(list) {
  return [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko'));
}

function listenTeachers() {
  unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
    teachers = sortTeachers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    teacherRows = teachers.map(t => ({
      uid: t.uid || t.id,
      name: t.name || '',
      email: t.email || '',
      password: '',
      role: normalizeRole(t.role || 'general'),
      active: t.active !== false,
      status: 'saved',
    }));
    renderTeacherTable();
  }, (err) => {
    console.error(err);
    alertMsg(`교사 목록을 불러오지 못했습니다.\n${err.message || ''}`, true);
  });
}

async function uploadTeacherCsvRows(rows) {
  let savedCount = 0;
  let errorCount = 0;

  for (const rawRow of rows) {
    const row = {
      uid: '',
      name: (rawRow.name || '').trim(),
      email: (rawRow.email || '').trim(),
      password: (rawRow.password || '').trim(),
      role: normalizeRole(rawRow.role),
      active: normalizeBoolean(rawRow.active, true),
      status: 'new',
    };

    if (!row.name || !row.email) {
      errorCount += 1;
      continue;
    }

    try {
      await saveTeacherRow(row);
      savedCount += 1;
    } catch (e) {
      console.error('teacher csv row error', row.email, e);
      errorCount += 1;
    }
  }

  return { savedCount, errorCount };
}

els.uploadTeachersBtn.addEventListener('click', async () => {
  const file = els.teacherCsvFileInput.files[0];
  if (!file) return setUploadMessage(els.teacherUploadResult, 'CSV 파일을 선택해 주세요.', true);

  try {
    const text = await readTextWithEncoding(file, els.teacherCsvEncoding.value);
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        try {
          const { savedCount, errorCount } = await uploadTeacherCsvRows(data);
          const message = `교사 ${savedCount}건 업로드 완료${errorCount ? ` / 실패 ${errorCount}건` : ''}`;
          if (unsubTeachers === null) listenTeachers();
          setUploadMessage(els.teacherUploadResult, message, errorCount > 0);
        } catch (e) {
          console.error(e);
          setUploadMessage(els.teacherUploadResult, '교사 명단 저장 중 오류가 발생했습니다.', true);
        }
      },
      error: (e) => {
        console.error(e);
        setUploadMessage(els.teacherUploadResult, 'CSV 파싱 중 오류가 발생했습니다.', true);
      }
    });
  } catch (e) {
    console.error(e);
    setUploadMessage(els.teacherUploadResult, '파일 읽기 실패입니다. 인코딩을 UTF-8 / EUC-KR로 바꿔서 다시 시도해 주세요.', true);
  }
});

function renderStudentTable() {
  const keyword = (els.studentTableSearch.value || '').trim().toLowerCase();
  const filtered = studentRows.filter(row => [row.name, row.englishName, row.className].some(v => String(v || '').toLowerCase().includes(keyword)));
  if (!filtered.length) {
    els.studentTableBody.innerHTML = `<tr><td colspan="6"><div class="helper-box">학생이 없습니다.</div></td></tr>`;
    return;
  }
  els.studentTableBody.innerHTML = filtered.map(row => {
    const index = studentRows.indexOf(row);
    return `
      <tr data-index="${index}">
        <td>${escapeHtml(row.originalId || '신규')}</td>
        <td><input class="student-name-input" value="${escapeHtml(row.name)}" /></td>
        <td><input class="student-english-input" value="${escapeHtml(row.englishName)}" /></td>
        <td><input class="student-class-input" value="${escapeHtml(row.className)}" /></td>
        <td><span class="status-badge ${rowStatusClass(row.status)}">${rowStatusLabel(row.status)}</span></td>
        <td><button class="row-delete-btn student-delete-btn">삭제</button></td>
      </tr>
    `;
  }).join('');

  els.studentTableBody.querySelectorAll('tr').forEach(tr => {
    const index = Number(tr.dataset.index);
    const row = studentRows[index];
    tr.querySelector('.student-name-input').addEventListener('input', e => {
      row.name = e.target.value;
      if (row.status === 'saved') row.status = 'dirty';
      renderStudentTable();
    });
    tr.querySelector('.student-english-input').addEventListener('input', e => {
      row.englishName = e.target.value;
      if (row.status === 'saved') row.status = 'dirty';
      renderStudentTable();
    });
    tr.querySelector('.student-class-input').addEventListener('input', e => {
      row.className = e.target.value;
      if (row.status === 'saved') row.status = 'dirty';
      renderStudentTable();
    });
    tr.querySelector('.student-delete-btn').addEventListener('click', async () => {
      if (!confirm('이 학생을 삭제하시겠습니까?')) return;
      if (row.originalId) {
        await deleteDoc(doc(db, 'students', row.originalId));
      } else {
        studentRows.splice(index, 1);
        renderStudentTable();
      }
    });
  });
}

els.studentTableSearch.addEventListener('input', renderStudentTable);
els.addStudentRowBtn.addEventListener('click', () => {
  studentRows.unshift({ originalId: '', name: '', englishName: '', className: '', status: 'new' });
  renderStudentTable();
});

els.saveStudentTableBtn.addEventListener('click', async () => {
  try {
    let savedCount = 0;
    for (const row of studentRows) {
      if (row.status === 'saved') continue;
      const newId = row.name.trim();
      if (!newId) {
        row.status = 'error';
        continue;
      }
      await setDoc(doc(db, 'students', newId), {
        name: row.name.trim(),
        englishName: row.englishName.trim(),
        className: row.className.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      if (row.originalId && row.originalId !== newId) {
        await deleteDoc(doc(db, 'students', row.originalId));
      }
      row.originalId = newId;
      row.status = 'saved';
      savedCount += 1;
    }
    renderStudentTable();
    alertMsg(savedCount > 0 ? `학생 명단 ${savedCount}건을 저장했습니다.` : '저장할 변경사항이 없습니다.');
  } catch (err) {
    console.error(err);
    alertMsg(`학생 명단 저장 중 오류가 발생했습니다.\n${err.message || ''}`, true);
  }
});

function listenAllPenalties() {
  unsubAdminPenalties = onSnapshot(collection(db, 'penaltyRecords'), (snapshot) => {
    allPenaltyRecords = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const at = a.createdAt?.seconds || 0;
        const bt = b.createdAt?.seconds || 0;
        return bt - at;
      });
    renderAdminPenaltyList();
  }, (err) => {
    console.error(err);
    alertMsg(`벌점 기록을 불러오지 못했습니다.\n${err.message || ''}`, true);
  });
}

function renderAdminPenaltyList() {
  const keyword = (els.penaltyTableSearch.value || '').trim().toLowerCase();
  const records = allPenaltyRecords.filter(r => [r.studentName, r.teacherName, r.category, r.reason].some(v => String(v || '').toLowerCase().includes(keyword)));
  if (!records.length) {
    els.adminPenaltyList.innerHTML = '<div class="helper-box">벌점 기록이 없습니다.</div>';
    return;
  }
  els.adminPenaltyList.innerHTML = records.map(r => `
    <div class="history-item">
      <div class="history-top"><strong>${escapeHtml(r.studentName || '')} · ${escapeHtml(r.category || '')}</strong><span>${Number(r.points || 0)}점 ${r.canceled ? '· 취소됨' : ''}</span></div>
      <div>${escapeHtml(r.reason || '사유 없음')}</div>
      <div class="history-meta">${escapeHtml(r.teacherName || '')} · ${escapeHtml(roleLabels[r.teacherRole] || '일반')} · ${fmt(r.createdAt)}</div>
      ${!r.canceled ? `<div class="row-actions"><button class="danger-btn cancel-penalty-btn" data-id="${r.id}">기록 취소</button></div>` : ''}
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
}

els.penaltyTableSearch.addEventListener('input', renderAdminPenaltyList);

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});
