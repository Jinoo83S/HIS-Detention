import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  addDoc,
  serverTimestamp,
  where,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCc3rwlIlZd7NaFkd2viT-tYhS9IemsV9o',
  authDomain: 'his-detention.firebaseapp.com',
  projectId: 'his-detention',
  storageBucket: 'his-detention.firebasestorage.app',
  messagingSenderId: '357843127217',
  appId: '1:357843127217:web:88175e347add4931294b90',
  measurementId: 'G-K3X22E8JL5',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const els = {
  loginView: document.getElementById('loginView'),
  mainView: document.getElementById('mainView'),
  googleLoginBtn: document.getElementById('googleLoginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  loginMessage: document.getElementById('loginMessage'),
  userName: document.getElementById('userName'),
  searchInput: document.getElementById('searchInput'),
  studentList: document.getElementById('studentList'),
  selectedStudentBox: document.getElementById('selectedStudentBox'),
  categorySelect: document.getElementById('categorySelect'),
  pointsInput: document.getElementById('pointsInput'),
  reasonInput: document.getElementById('reasonInput'),
  penaltyForm: document.getElementById('penaltyForm'),
  penaltyMessage: document.getElementById('penaltyMessage'),
  historyList: document.getElementById('historyList'),
  csvFileInput: document.getElementById('csvFileInput'),
  uploadCsvBtn: document.getElementById('uploadCsvBtn'),
  uploadMessage: document.getElementById('uploadMessage'),
  downloadSampleBtn: document.getElementById('downloadSampleBtn'),
};

let allStudents = [];
let filteredStudents = [];
let selectedStudent = null;
let unsubscribeHistory = null;

function showMessage(el, text) {
  el.textContent = text;
  el.classList.remove('hidden');
}

function clearMessage(el) {
  el.textContent = '';
  el.classList.add('hidden');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderStudents() {
  const target = els.studentList;
  if (!filteredStudents.length) {
    target.innerHTML = '<div class="help-text">학생이 없습니다.</div>';
    return;
  }

  target.innerHTML = filteredStudents
    .map((student) => {
      const selected = selectedStudent?.id === student.id ? 'selected' : '';
      return `
        <button class="student-item ${selected}" data-id="${escapeHtml(student.id)}">
          <div class="student-main">${escapeHtml(student.name)}</div>
          <div class="student-meta">${escapeHtml(student.englishName || '-')} / ${escapeHtml(student.className || '-')}</div>
        </button>
      `;
    })
    .join('');

  target.querySelectorAll('.student-item').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const student = allStudents.find((item) => item.id === id);
      if (student) {
        selectedStudent = student;
        renderStudents();
        renderSelectedStudent();
        watchHistory();
      }
    });
  });
}

function renderSelectedStudent() {
  if (!selectedStudent) {
    els.selectedStudentBox.className = 'selected-student empty';
    els.selectedStudentBox.textContent = '왼쪽에서 학생을 선택해 주세요.';
    return;
  }

  els.selectedStudentBox.className = 'selected-student';
  els.selectedStudentBox.innerHTML = `
    <strong>${escapeHtml(selectedStudent.name)}</strong><br />
    <span class="student-meta">${escapeHtml(selectedStudent.englishName || '-')} / ${escapeHtml(selectedStudent.className || '-')}</span>
  `;
}

function formatDate(value) {
  if (!value?.toDate) return '-';
  return value.toDate().toLocaleString('ko-KR');
}

function renderHistory(records) {
  if (!selectedStudent) {
    els.historyList.className = 'history-list empty';
    els.historyList.textContent = '학생을 선택하면 벌점 이력이 표시됩니다.';
    return;
  }

  if (!records.length) {
    els.historyList.className = 'history-list empty';
    els.historyList.textContent = '벌점 이력이 없습니다.';
    return;
  }

  els.historyList.className = 'history-list';
  els.historyList.innerHTML = records
    .map(
      (record) => `
        <div class="record-item">
          <div class="record-top">
            <strong>${escapeHtml(record.category)}</strong>
            <span>${escapeHtml(record.points)}점</span>
          </div>
          <div class="record-reason">${escapeHtml(record.reason || '사유 없음')}</div>
          <div class="record-meta">${escapeHtml(record.teacherName || '-')} · ${formatDate(record.createdAt)}</div>
        </div>
      `,
    )
    .join('');
}

function applySearch() {
  const keyword = els.searchInput.value.trim().toLowerCase();
  if (!keyword) {
    filteredStudents = [...allStudents];
  } else {
    filteredStudents = allStudents.filter((student) => {
      return (
        String(student.name || '').toLowerCase().includes(keyword) ||
        String(student.englishName || '').toLowerCase().includes(keyword) ||
        String(student.className || '').toLowerCase().includes(keyword)
      );
    });
  }
  renderStudents();
}

async function loadStudents() {
  const q = query(collection(db, 'students'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  allStudents = snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }));
  filteredStudents = [...allStudents];
  renderStudents();
}

function watchStudents() {
  const q = query(collection(db, 'students'), orderBy('name', 'asc'));
  onSnapshot(q, (snapshot) => {
    allStudents = snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }));
    applySearch();
    if (selectedStudent) {
      selectedStudent = allStudents.find((item) => item.id === selectedStudent.id) || null;
      renderSelectedStudent();
      if (!selectedStudent) renderHistory([]);
    }
  });
}

function watchHistory() {
  if (unsubscribeHistory) unsubscribeHistory();
  if (!selectedStudent) {
    renderHistory([]);
    return;
  }

  const q = query(
    collection(db, 'penaltyRecords'),
    where('studentId', '==', selectedStudent.id),
    orderBy('createdAt', 'desc'),
  );

  unsubscribeHistory = onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }));
    renderHistory(records);
  });
}

function parseCsvText(text) {
  const rows = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) return [];

  const header = rows[0].split(',').map((item) => item.trim());
  const expected = ['name', 'englishName', 'className'];
  const isValid = expected.every((key, index) => header[index] === key);

  if (!isValid) {
    throw new Error('CSV 첫 줄은 name,englishName,className 이어야 합니다.');
  }

  return rows.slice(1).map((line) => {
    const cols = line.split(',').map((item) => item.trim());
    return {
      name: cols[0] || '',
      englishName: cols[1] || '',
      className: cols[2] || '',
    };
  });
}

async function uploadCsv() {
  clearMessage(els.uploadMessage);
  const file = els.csvFileInput.files?.[0];
  if (!file) {
    showMessage(els.uploadMessage, '먼저 CSV 파일을 선택해 주세요.');
    return;
  }

  const text = await file.text();
  let rows = [];
  try {
    rows = parseCsvText(text).filter((row) => row.name);
  } catch (error) {
    showMessage(els.uploadMessage, error.message || 'CSV 형식을 확인해 주세요.');
    return;
  }

  if (!rows.length) {
    showMessage(els.uploadMessage, '업로드할 학생 데이터가 없습니다.');
    return;
  }

  let count = 0;
  for (const row of rows) {
    await setDoc(doc(db, 'students', row.name), {
      name: row.name,
      englishName: row.englishName,
      className: row.className,
    }, { merge: true });
    count += 1;
  }

  showMessage(els.uploadMessage, `${count}명의 학생을 업로드했습니다.`);
  els.csvFileInput.value = '';
}

async function savePenalty(event) {
  event.preventDefault();
  clearMessage(els.penaltyMessage);

  if (!selectedStudent) {
    showMessage(els.penaltyMessage, '학생을 먼저 선택해 주세요.');
    return;
  }

  const category = els.categorySelect.value;
  const points = Number(els.pointsInput.value || 1);
  const reason = els.reasonInput.value.trim();
  const user = auth.currentUser;

  if (!user) {
    showMessage(els.penaltyMessage, '로그인 정보가 없습니다. 다시 로그인해 주세요.');
    return;
  }

  await addDoc(collection(db, 'penaltyRecords'), {
    studentId: selectedStudent.id,
    studentName: selectedStudent.name,
    englishName: selectedStudent.englishName || '',
    className: selectedStudent.className || '',
    category,
    points,
    reason,
    teacherUid: user.uid,
    teacherName: user.displayName || user.email || '교사',
    createdAt: serverTimestamp(),
  });

  els.reasonInput.value = '';
  showMessage(els.penaltyMessage, `${selectedStudent.name} 학생의 벌점이 저장되었습니다.`);
}

function downloadSampleCsv() {
  const sample = 'name,englishName,className\n김민수,Minsu Kim,10A\n박서연,Seoyeon Park,10A\n이도윤,Doyoon Lee,11B\n';
  const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students-sample.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

els.googleLoginBtn.addEventListener('click', async () => {
  clearMessage(els.loginMessage);
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    showMessage(els.loginMessage, error.message || '로그인에 실패했습니다.');
  }
});

els.logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

els.searchInput.addEventListener('input', applySearch);
els.categorySelect.addEventListener('change', () => {
  const selected = els.categorySelect.options[els.categorySelect.selectedIndex];
  const points = selected.dataset.points || '1';
  els.pointsInput.value = points;
});
els.penaltyForm.addEventListener('submit', savePenalty);
els.uploadCsvBtn.addEventListener('click', uploadCsv);
els.downloadSampleBtn.addEventListener('click', downloadSampleCsv);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    els.loginView.classList.add('hidden');
    els.mainView.classList.remove('hidden');
    els.userName.textContent = user.displayName || user.email || '교사';
    renderSelectedStudent();
    await loadStudents();
    watchStudents();
  } else {
    els.mainView.classList.add('hidden');
    els.loginView.classList.remove('hidden');
    els.userName.textContent = '';
    selectedStudent = null;
    allStudents = [];
    filteredStudents = [];
    renderStudents();
    renderSelectedStudent();
    renderHistory([]);
    if (unsubscribeHistory) unsubscribeHistory();
  }
});
