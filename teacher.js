
async function addEntry(data){
  const id = uid();
  await db.ref("entries/"+id).set({
    id,
    ...data,
    status:"pending",
    createdAt:new Date().toISOString()
  });
}

async function confirmEntry(id){
  await db.ref("entries/"+id).update({
    status:"confirmed",
    confirmedAt:new Date().toISOString()
  });
}

async function sendNotice(studentId){
  await db.ref("notices/"+studentId).update({
    lastSent:new Date().toISOString()
  });
}

async function completeRecovery(studentId, points){
  const id = uid();
  await db.ref("recovery/"+id).set({
    studentId,
    points,
    createdAt:new Date().toISOString()
  });
}
