// =============================
// 디텐션 엔진 (핵심 로직)
// =============================

// 점수 계산
function calculatePoints(standard, studentKey, manualPoints) {
  if (!standard) return 0;

  // fixed
  if (standard.type === "fixed") {
    return Number(standard.fixedPoints || 0);
  }

  // range
  if (standard.type === "range") {
    return Number(manualPoints || 0);
  }

  // progressive (첫 위반 vs 반복)
  if (standard.type === "progressive") {
    // TODO: 실제로는 과거 기록 조회해야 정확함
    // 지금은 단순화 (첫 위반 기준)
    return Number(standard.progressive?.first || 1);
  }

  return 0;
}

// =============================
// 디텐션 추가
// =============================
export async function addDetention({
  studentKey,
  standardId,
  manualPoints = 0,
  teacher
}) {

  // 기준표 가져오기
  const stdSnap = await db.ref(`detentionStandards/${standardId}`).once('value');
  const standard = stdSnap.val();

  if (!standard) {
    throw new Error("기준표 없음");
  }

  // 학생 상태 가져오기
  const stateRef = db.ref(`studentStates/${studentKey}`);
  const stateSnap = await stateRef.once('value');

  let state = stateSnap.val() || {
    carryOver: 0,
    cyclePoints: 0,
    totalAccumulated: 0
  };

  // 점수 계산
  const points = calculatePoints(standard, studentKey, manualPoints);

  // 상태 반영
  state.cyclePoints += points;
  state.totalAccumulated += points;

  // entry 저장
  const entryRef = db.ref('detentionEntries').push();

  await entryRef.set({
    studentKey,
    standardId,
    points,
    teacher,
    createdAt: new Date().toISOString()
  });

  let cycle = null;

  // =============================
  // 디텐션 발생 (3점 이상)
  // =============================
  if (state.cyclePoints >= 3) {

    const cycleId = 'cycle_' + Date.now();

    cycle = {
      studentKey,
      entryIds: [entryRef.key],
      totalPoints: state.cyclePoints,
      carryOverAfter: state.cyclePoints % 3,
      status: "active",
      createdAt: new Date().toISOString()
    };

    await db.ref(`detentionCycles/${cycleId}`).set(cycle);

    // 잔류점수 처리
    state.carryOver = state.cyclePoints % 3;
    state.cyclePoints = state.carryOver;
    state.lastCycleId = cycleId;
  }

  // 상태 저장
  await stateRef.set(state);

  return { state, cycle };
}

// =============================
// 위원회 판단
// =============================
export function checkCommittee(state) {

  if (!state) return null;

  if (state.cyclePoints >= 12) {
    return "생활교육위원회";
  }

  if (state.totalAccumulated >= 30) {
    return "선도위원회";
  }

  return null;
}