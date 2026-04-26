const firebaseConfig = {
  "apiKey": "AIzaSyCc3rwlIlZd7NaFkd2viT-tYhS9IemsV9o",
  "authDomain": "his-detention.firebaseapp.com",
  "databaseURL": "https://his-detention-default-rtdb.asia-southeast1.firebasedatabase.app/",
  "projectId": "his-detention",
  "storageBucket": "his-detention.firebasestorage.app",
  "messagingSenderId": "357843127217",
  "appId": "1:357843127217:web:88175e347add4931294b90",
  "measurementId": "G-K3X22E8JL5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function toast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return alert(msg);

  el.textContent = msg;
  el.className = type;
  el.classList.add('on');

  setTimeout(() => el.classList.remove('on'), 3000);
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseBool(v) {
  if (typeof v === 'boolean') return v;
  return ['true', '1', 'y', 'yes'].includes(String(v ?? '').trim().toLowerCase());
}

/**
 * Firebase RTDB key로 안전한 교사 key 생성
 * - email 우선, 없으면 name 사용
 * - 소문자/trim 처리
 * - Firebase에서 금지하는 문자 . # $ / [ ] 를 _ 로 치환
 */
function teacherKey(email, name) {
  const raw = String(email || name || '').trim().toLowerCase();
  return raw.replace(/[.#$/\[\]]/g, '_');
}

/**
 * 학생 key 생성
 * - className + name 조합으로 동명이인 충돌 방지
 * - Firebase 금지 문자는 _ 로 치환
 * ⚠️ 기존 DB에 이름만으로 저장된 key가 있다면 마이그레이션 필요
 */
function studentKey(name, className) {
  const raw = [String(className || '').trim(), String(name || '').trim()]
    .filter(Boolean)
    .join('_');
  return raw.replace(/[.#$/\[\]\s]/g, '_');
}

function requireTeacherSession() {
  const raw = sessionStorage.getItem('his_teacher');
  if (!raw) {
    location.href = 'index.html';
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    location.href = 'index.html';
    return null;
  }
}

function logoutTeacher() {
  sessionStorage.removeItem('his_teacher');
  location.href = 'index.html';
}

function csvSplit(line) {
  const out = [];
  let cur = '';
  let q = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
    } else if (ch === ',' && !q) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }

  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = csvSplit(lines[0]).map(s => s.trim());

  return lines.slice(1).map(line => {
    const cols = csvSplit(line);
    const row = {};

    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? '').trim();
    });

    return row;
  });
}

function readFileText(file, enc = 'utf-8') {
  return new Promise((resolve, reject) => {
    const r = new FileReader();

    r.onload = () => {
      try {
        resolve(new TextDecoder(enc).decode(r.result));
      } catch (e) {
        reject(e);
      }
    };

    r.onerror = reject;
    r.readAsArrayBuffer(file);
  });
}