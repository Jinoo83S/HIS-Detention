// =============================
// 회복교육 처리
// =============================

export async function completeRecovery(studentKey) {

  const stateRef = db.ref(`studentStates/${studentKey}`);
  const stateSnap = await stateRef.once('value');

  let state = stateSnap.val();

  if (!state) {
    throw new Error("학생 상태 없음");
  }

  const before = state.cyclePoints;

  if (before <= 0) {
    throw new Error("차감할 점수 없음");
  }

  // 3점 차감
  const after = Math.max(before - 3, 0);

  state.cyclePoints = after;
  state.carryOver = after;

  await stateRef.set(state);

  // 기록 저장
  await db.ref('recoveryEntries').push({
    studentKey,
    before,
    after,
    recoveryPoints: 3,
    completedAt: new Date().toISOString()
  });

  return { before, after };
}