// =============================
// 회복교육 처리 + 알림 종료
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

  // =============================
  // 1. 점수 차감
  // =============================
  const after = Math.max(before - 3, 0);

  state.cyclePoints = after;
  state.carryOver = after;

  await stateRef.set(state);

  // =============================
  // 2. 회복 기록 저장
  // =============================
  await db.ref('recoveryEntries').push({
    studentKey,
    before,
    after,
    recoveryPoints: 3,
    completedAt: new Date().toISOString()
  });

  // =============================
  // 🔥 3. 알림 자동 종료
  // =============================
  const noticeSnap = await db.ref('detentionNotices')
    .orderByChild('studentKey')
    .equalTo(studentKey)
    .once('value');

  const updates = {};

  noticeSnap.forEach(child => {
    const notice = child.val();

    if (notice.status === "active") {
      updates[`${child.key}/status`] = "completed";
      updates[`${child.key}/completedAt`] = new Date().toISOString();
    }
  });

  if (Object.keys(updates).length > 0) {
    await db.ref('detentionNotices').update(updates);
  }

  return { before, after };
}