
// New detention cycle-based structure

async function createDetention(studentId, payload){
  const id = uuid();

  await DB.set(`detentions/${id}`, {
    id,
    studentId,
    status: "pending",
    createdAt: new Date().toISOString(),
    ...payload
  });
}

async function confirmDetention(id){
  await DB.update(`detentions/${id}`, {
    status: "confirmed",
    confirmedAt: new Date().toISOString()
  });
}

async function completeNotice(studentId){
  await DB.set(`notices/${studentId}`, {
    completed: true,
    updatedAt: new Date().toISOString()
  });
}

async function completeRecovery(studentId){
  await DB.push(`recovery`, {
    studentId,
    completedAt: new Date().toISOString()
  });
}
