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

/**
 * HIS 디텐션 상태 전체 재계산
 * - DB 직접 수정/데이터 가져오기 후 studentCycleState를 현재 DB 기준으로 다시 생성합니다.
 * - teacher.html의 상태 머신과 동일한 기준을 사용하되, 특정 화면 메모리에 의존하지 않습니다.
 */
(function(){
  function hisLevelFromClassName(className){
    const m = String(className || '').match(/^(\d+)/);
    if (!m) return '';
    return Number(m[1]) >= 10 ? 'hs' : 'ms'; // HIS 기준: 7-9 중등, 10-12 고등
  }

  function hisSafeStateKey(studentKey, level){
    return (String(studentKey || '') + '_' + String(level || '')).replace(/[.#$\[\]\/]/g, '_');
  }

  function hisLatestDate(v){
    return String((v && (v.confirmedAt || v.createdAt || v.completedAt)) || '');
  }

  async function recalculateAllStudentCycleStates(options){
    options = options || {};
    if (typeof db === 'undefined' || !db || !db.ref) {
      throw new Error('Firebase database is not initialized.');
    }

    const [studentsSnap, entriesSnap, noticesSnap, recoverySnap, committeeSnap] = await Promise.all([
      db.ref('students').once('value'),
      db.ref('detentionEntries').once('value'),
      db.ref('detentionNotices').once('value'),
      db.ref('recoveryEntries').once('value'),
      db.ref('committeeRecords').once('value')
    ]);

    const students = studentsSnap.val() || {};
    const entries = entriesSnap.val() || {};
    const notices = noticesSnap.val() || {};
    const recovery = recoverySnap.val() || {};
    const committee = committeeSnap.val() || {};
    const stateTargets = {};

    function addTarget(studentKey, level, className){
      const sk = String(studentKey || '').trim();
      const lv = String(level || hisLevelFromClassName(className) || '').trim();
      if (!sk || !lv) return;
      stateTargets[sk + '|||' + lv] = { studentKey: sk, level: lv };
    }

    Object.entries(students).forEach(([key, s]) => addTarget(key, hisLevelFromClassName(s && s.className), s && s.className));
    Object.values(entries).forEach(r => addTarget(r && r.studentKey, r && r.schoolLevel, r && r.className));
    Object.values(notices).forEach(r => addTarget(r && r.studentKey, r && r.level, r && r.className));
    Object.values(recovery).forEach(r => addTarget(r && r.studentKey, r && r.level, r && r.className));
    Object.values(committee).forEach(r => addTarget(r && r.studentKey, r && r.level, r && r.className));

    const curYear = String(new Date().getFullYear());
    const newStates = {};

    Object.values(stateTargets).forEach(({studentKey, level}) => {
      const sk = String(studentKey || '');

      const confirmedEntries = Object.entries(entries)
        .filter(([, r]) => String((r || {}).studentKey || '') === sk && String((r || {}).status || '') === '확정')
        .sort((a, b) => hisLatestDate(b[1]).localeCompare(hisLatestDate(a[1])));

      const overallTotal = confirmedEntries.reduce((sum, [, r]) => sum + Number((r || {}).totalPoints || 0), 0);

      const recoveredTotal = Object.values(recovery)
        .filter(r => String((r || {}).studentKey || '') === sk && String((r || {}).level || '') === level)
        .reduce((sum, r) => sum + Number((r || {}).recoveryPoints || 0), 0);

      const currentTotal = overallTotal - recoveredTotal;

      const activeNoticeArr = Object.entries(notices)
        .filter(([, v]) => String((v || {}).studentKey || '') === sk && String((v || {}).level || '') === level && !(v || {}).completedAt)
        .sort((a, b) => String((b[1] || {}).createdAt || '').localeCompare(String((a[1] || {}).createdAt || '')));
      const activeNotice = activeNoticeArr.length ? { key: activeNoticeArr[0][0], notice: activeNoticeArr[0][1] || {} } : null;

      const completedNoticeArr = Object.entries(notices)
        .filter(([, v]) => String((v || {}).studentKey || '') === sk && String((v || {}).level || '') === level && !!(v || {}).completedAt)
        .sort((a, b) => String((b[1] || {}).completedAt || '').localeCompare(String((a[1] || {}).completedAt || '')));
      const lastCompletedNotice = completedNoticeArr.length ? { key: completedNoticeArr[0][0], notice: completedNoticeArr[0][1] || {} } : null;

      const referralEntries = confirmedEntries.filter(([, r]) => (r || {}).isReferral === true);
      const referralCompleted = referralEntries.length > 0 && referralEntries.every(([refKey]) => {
        return Object.values(committee).some(c =>
          ((c || {}).type === 'referral' || (c || {}).type === 'manual_referral') &&
          (((c || {}).entryKey === refKey) || String((c || {}).studentKey || '') === sk) &&
          !!(c || {}).completedAt
        );
      });
      const hasActiveReferral = referralEntries.length > 0 && !referralCompleted;

      const eduCompletedThisYear = Object.values(committee).some(c =>
        ['edu_points', 'edu_overall', 'manual_edu', 'edu'].includes(String((c || {}).type || '')) &&
        String((c || {}).studentKey || '') === sk &&
        !!(c || {}).completedAt &&
        String((c || {}).year || '') === curYear
      );
      const needsEduCommittee = !eduCompletedThisYear && (currentTotal >= 12 || overallTotal > 30);
      const hasManualReferralPending = Object.values(committee).some(c =>
        String((c || {}).type || '') === 'manual_referral' && String((c || {}).studentKey || '') === sk && !(c || {}).completedAt
      );
      const hasManualEduPending = Object.values(committee).some(c =>
        ['manual_edu','edu'].includes(String((c || {}).type || '')) && String((c || {}).studentKey || '') === sk && !(c || {}).completedAt
      );

      let phase = 'clean';
      if (hasActiveReferral || hasManualReferralPending) {
        phase = 'referral';
      } else if (activeNotice) {
        phase = (activeNotice.notice.parentMailAt || activeNotice.notice.studentTeacherMailAt) ? 'notice_active' : 'notice_needed';
      } else if (lastCompletedNotice && currentTotal >= 3) {
        const latestEntryAt = confirmedEntries.length ? hisLatestDate(confirmedEntries[0][1]) : '';
        const lastNoticeAt = String(lastCompletedNotice.notice.completedAt || '');
        phase = latestEntryAt > lastNoticeAt ? 'notice_needed' : 'in_recovery';
      } else if (lastCompletedNotice && currentTotal > 0) {
        phase = 'residual';
      } else if (currentTotal >= 3) {
        phase = 'notice_needed';
      }

      let committeeStatus = 'none';
      if (hasActiveReferral || hasManualReferralPending) committeeStatus = 'pending_referral';
      else if (needsEduCommittee || hasManualEduPending) committeeStatus = 'pending_edu';

      newStates[hisSafeStateKey(sk, level)] = {
        phase,
        cyclePoints: currentTotal,
        overallPoints: overallTotal,
        committeeStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: options.updatedBy || 'system_recalculate'
      };
    });

    await db.ref('studentCycleState').set(Object.keys(newStates).length ? newStates : null);
    return { count: Object.keys(newStates).length, states: newStates };
  }

  window.hisLevelFromClassName = window.hisLevelFromClassName || hisLevelFromClassName;
  window.recalculateAllStudentCycleStates = window.recalculateAllStudentCycleStates || recalculateAllStudentCycleStates;
})();
