
// PATCHED 핵심 로직

// ✅ 공통 ID 기반 업데이트 함수
async function safeUpdate(path, data){
  return db.ref(path).update(data);
}

// ✅ 디텐션 저장 (overwrite 제거)
async function saveDetention(){
  const studentKey = syncStudentSelection();
  const manualPoints = Number(document.getElementById('manual-points').value || 0);

  if(!studentKey) return toast('학생 선택 필요', 'err');

  const id = db.ref().child('detentionEntries').push().key;

  const payload = {
    studentKey,
    totalPoints: manualPoints,
    status: '임시저장',
    createdAt: new Date().toISOString()
  };

  await safeUpdate(`detentionEntries/${id}`, payload);

  toast('저장 완료', 'ok');
  loadData();
}

// ✅ 알림 시간 꼬임 해결
async function markParentMail(studentKey, level){
  const now = new Date().toISOString();

  await safeUpdate(`detentionNotices/${studentKey}_${level}`, {
    parentMailAt: now
  });
}

// ✅ 완료 상태 유지 (초기화 방지)
async function completeNotice(studentKey, level){
  await safeUpdate(`detentionNotices/${studentKey}_${level}`, {
    completed: true,
    completedAt: new Date().toISOString()
  });
}

// ✅ index 제거 예시
function updateTeacherById(id, field, value){
  const t = teachers[id];
  if(t) t[field] = value;
}
