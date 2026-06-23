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

// Firebase 앱이 이미 초기화된 화면(import-data 등)에서도 common.js를 재사용할 수 있게 방어합니다.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
window.db = db;

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
 * HIS 디텐션 상태 계산 공통 모듈
 * - 상태 기준은 이곳에서만 관리합니다.
 * - teacher.html / detention-admin.html / import-data.html은 이 함수만 호출합니다.
 */
(function(){
  function hisLevelFromClassName(className){
    const m = String(className || '').match(/^(\d+)/);
    if (!m) return '';
    const grade = Number(m[1]);
    if (grade >= 7 && grade <= 9) return 'ms';
    if (grade >= 10 && grade <= 12) return 'hs';
    return grade >= 10 ? 'hs' : 'ms';
  }

  function hisSafeStateKey(studentKey, level){
    return (String(studentKey || '') + '_' + String(level || '')).replace(/[.#$\[\]\/]/g, '_');
  }

  function hisLatestEntryDate(v){
    return String((v && (v.confirmedAt || v.createdAt || v.completedAt)) || '');
  }

  function hisCurrentYear(){
    return String(new Date().getFullYear());
  }

  function hisValues(obj){
    return Object.values(obj || {});
  }

  function hisEntries(obj){
    return Object.entries(obj || {});
  }

  function calculateStudentCycleState(studentKey, level, data, options){
    options = options || {};
    data = data || {};

    const sk = String(studentKey || '').trim();
    const lv = String(level || '').trim();
    const entries = data.entries || {};
    const notices = data.notices || {};
    const recovery = data.recovery || {};
    const committee = data.committee || {};
    const curYear = String(options.year || hisCurrentYear());

    const confirmedEntries = hisEntries(entries)
      .filter(([, r]) => String((r || {}).studentKey || '') === sk && String((r || {}).status || '') === '확정')
      .sort((a, b) => hisLatestEntryDate(b[1]).localeCompare(hisLatestEntryDate(a[1])));

    // yearRawPoints: 현재 학년도 판단용 원점수입니다. 현재 DB 운용은 1년 단위 초기화를 전제로 하므로
    // 기존 호환 필드 overallPoints에도 같은 값을 저장합니다.
    const yearRawPoints = confirmedEntries.reduce((sum, [, r]) => sum + Number((r || {}).totalPoints || 0), 0);

    const recoveredTotal = hisValues(recovery)
      .filter(r => String((r || {}).studentKey || '') === sk && String((r || {}).level || '') === lv)
      .reduce((sum, r) => sum + Number((r || {}).recoveryPoints || 0), 0);

    const currentPoints = Math.max(0, yearRawPoints - recoveredTotal);

    const activeNoticeArr = hisEntries(notices)
      .filter(([, v]) => String((v || {}).studentKey || '') === sk && String((v || {}).level || '') === lv && !(v || {}).completedAt)
      .sort((a, b) => String((b[1] || {}).createdAt || '').localeCompare(String((a[1] || {}).createdAt || '')));
    const activeNotice = activeNoticeArr.length ? { key: activeNoticeArr[0][0], notice: activeNoticeArr[0][1] || {} } : null;

    const completedNoticeArr = hisEntries(notices)
      .filter(([, v]) => String((v || {}).studentKey || '') === sk && String((v || {}).level || '') === lv && !!(v || {}).completedAt)
      .sort((a, b) => String((b[1] || {}).completedAt || '').localeCompare(String((a[1] || {}).completedAt || '')));
    const lastCompletedNotice = completedNoticeArr.length ? { key: completedNoticeArr[0][0], notice: completedNoticeArr[0][1] || {} } : null;

    const referralEntries = confirmedEntries.filter(([, r]) => (r || {}).isReferral === true);
    const referralCompleted = referralEntries.length > 0 && referralEntries.every(([refKey]) => {
      return hisValues(committee).some(c =>
        ((c || {}).type === 'referral' || (c || {}).type === 'manual_referral') &&
        (((c || {}).entryKey === refKey) || String((c || {}).studentKey || '') === sk) &&
        !!(c || {}).completedAt
      );
    });
    const hasActiveReferral = referralEntries.length > 0 && !referralCompleted;

    const eduCompletedThisYear = hisValues(committee).some(c =>
      ['edu_points', 'edu_overall', 'manual_edu', 'edu'].includes(String((c || {}).type || '')) &&
      String((c || {}).studentKey || '') === sk &&
      !!(c || {}).completedAt &&
      String((c || {}).year || '') === curYear
    );

    const needsEduCommittee = !eduCompletedThisYear && (currentPoints >= 12 || yearRawPoints > 30);
    const hasManualReferralPending = hisValues(committee).some(c =>
      String((c || {}).type || '') === 'manual_referral' &&
      String((c || {}).studentKey || '') === sk &&
      !(c || {}).completedAt
    );
    const hasManualEduPending = hisValues(committee).some(c =>
      String((c || {}).type || '') === 'manual_edu' &&
      String((c || {}).studentKey || '') === sk &&
      !(c || {}).completedAt
    );

    let phase = 'clean';
    if (hasActiveReferral || hasManualReferralPending) {
      phase = 'referral';
    } else if (activeNotice) {
      phase = (activeNotice.notice.parentMailAt || activeNotice.notice.studentTeacherMailAt) ? 'notice_active' : 'notice_needed';
    } else if (lastCompletedNotice && currentPoints >= 3) {
      const latestEntryAt = confirmedEntries.length ? hisLatestEntryDate(confirmedEntries[0][1]) : '';
      const lastNoticeAt = String(lastCompletedNotice.notice.completedAt || '');
      phase = latestEntryAt > lastNoticeAt ? 'notice_needed' : 'in_recovery';
    } else if (lastCompletedNotice && currentPoints > 0) {
      phase = 'residual';
    } else if (currentPoints >= 3) {
      phase = 'notice_needed';
    }

    let committeeStatus = 'none';
    if (hasActiveReferral || hasManualReferralPending) committeeStatus = 'pending_referral';
    else if (needsEduCommittee || hasManualEduPending) committeeStatus = 'pending_edu';

    const state = {
      phase,
      // 기존 화면 호환 필드
      cyclePoints: currentPoints,
      overallPoints: yearRawPoints,
      // 새 의미 명시 필드
      currentPoints,
      yearRawPoints,
      recoveryPoints: recoveredTotal,
      committeeStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: options.updatedBy || 'system_recalculate'
    };

    return {
      state,
      meta: {
        activeNotice,
        lastCompletedNotice,
        confirmedEntries,
        hasActiveReferral,
        hasManualReferralPending,
        hasManualEduPending,
        needsEduCommittee,
        eduCompletedThisYear
      }
    };
  }

  async function readStateData(){
    const [studentsSnap, entriesSnap, noticesSnap, recoverySnap, committeeSnap] = await Promise.all([
      db.ref('students').once('value'),
      db.ref('detentionEntries').once('value'),
      db.ref('detentionNotices').once('value'),
      db.ref('recoveryEntries').once('value'),
      db.ref('committeeRecords').once('value')
    ]);
    return {
      students: studentsSnap.val() || {},
      entries: entriesSnap.val() || {},
      notices: noticesSnap.val() || {},
      recovery: recoverySnap.val() || {},
      committee: committeeSnap.val() || {}
    };
  }

  async function recalculateStudentCycleState(studentKey, level, options){
    options = options || {};
    if (typeof db === 'undefined' || !db || !db.ref) {
      throw new Error('Firebase database is not initialized.');
    }

    const data = options.freshData || await readStateData();
    const result = calculateStudentCycleState(studentKey, level, data, options);

    // teacher.html 기존 동작 보존: 선도위원회 대상이 되면 진행 중 알림은 자동 완료 처리합니다.
    if (options.autoCompleteReferralNotice &&
        result.meta &&
        (result.meta.hasActiveReferral || result.meta.hasManualReferralPending) &&
        result.meta.activeNotice &&
        result.meta.activeNotice.key &&
        !(result.meta.activeNotice.notice || {}).completedAt) {
      await db.ref('detentionNotices/' + result.meta.activeNotice.key).update({
        completedAt: new Date().toISOString(),
        completedBy: 'system_referral'
      });
      const refreshed = options.freshData ? await readStateData() : await readStateData();
      const resultAfterNoticeClose = calculateStudentCycleState(studentKey, level, refreshed, options);
      await db.ref('studentCycleState/' + hisSafeStateKey(studentKey, level)).set(resultAfterNoticeClose.state);
      return resultAfterNoticeClose.state;
    }

    await db.ref('studentCycleState/' + hisSafeStateKey(studentKey, level)).set(result.state);
    return result.state;
  }

  function collectStateTargets(data){
    data = data || {};
    const targets = {};
    function addTarget(studentKey, level, className){
      const sk = String(studentKey || '').trim();
      const lv = String(level || hisLevelFromClassName(className) || '').trim();
      if (!sk || !lv) return;
      targets[sk + '|||' + lv] = { studentKey: sk, level: lv };
    }

    hisEntries(data.students || {}).forEach(([key, s]) => addTarget(key, hisLevelFromClassName(s && s.className), s && s.className));
    hisValues(data.entries || {}).forEach(r => addTarget(r && r.studentKey, r && r.schoolLevel, r && r.className));
    hisValues(data.notices || {}).forEach(r => addTarget(r && r.studentKey, r && r.level, r && r.className));
    hisValues(data.recovery || {}).forEach(r => addTarget(r && r.studentKey, r && r.level, r && r.className));
    hisValues(data.committee || {}).forEach(r => addTarget(r && r.studentKey, r && r.level, r && r.className));
    return Object.values(targets);
  }

  async function recalculateAllStudentCycleStates(options){
    options = options || {};
    if (typeof db === 'undefined' || !db || !db.ref) {
      throw new Error('Firebase database is not initialized.');
    }

    const data = await readStateData();
    const newStates = {};
    collectStateTargets(data).forEach(({ studentKey, level }) => {
      const result = calculateStudentCycleState(studentKey, level, data, options);
      newStates[hisSafeStateKey(studentKey, level)] = result.state;
    });

    await db.ref('studentCycleState').set(Object.keys(newStates).length ? newStates : null);
    return { count: Object.keys(newStates).length, states: newStates };
  }

  window.hisLevelFromClassName = hisLevelFromClassName;
  window.hisSafeStateKey = hisSafeStateKey;
  window.calculateStudentCycleState = calculateStudentCycleState;
  window.recalculateStudentCycleState = recalculateStudentCycleState;
  window.recalculateAllStudentCycleStates = recalculateAllStudentCycleStates;
})();
