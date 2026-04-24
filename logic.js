
// ===== CORE LOGIC (NEW STRUCTURE) =====

// create event + update student + cycle
async function createDetention(studentId, teacherId, points){

  const eventId = uid();
  const studentRef = db.ref('students/' + studentId);

  const studentSnap = await studentRef.once('value');
  const student = studentSnap.val();

  if(!student) return alert("학생 없음");

  const newPoints = (student.currentPoints || 0) + points;

  // event
  await db.ref('events/' + eventId).set({
    id:eventId,
    studentId,
    teacherId,
    points,
    status:"confirmed",
    createdAt:now()
  });

  // update student
  await studentRef.update({
    currentPoints:newPoints,
    totalPoints:(student.totalPoints || 0) + points
  });

  // cycle
  let cycleId = student.activeCycleId;

  if(!cycleId){
    cycleId = uid();
    await db.ref('cycles/' + cycleId).set({
      id:cycleId,
      studentId,
      currentPoints:newPoints,
      stage:"detention",
      status:"active"
    });

    await studentRef.update({activeCycleId:cycleId});
  } else {
    await db.ref('cycles/' + cycleId).update({
      currentPoints:newPoints
    });
  }

  // stage logic
  if(newPoints >= 12){
    await db.ref('cycles/' + cycleId).update({stage:"discipline"});
  } else if(newPoints >= 6){
    await db.ref('cycles/' + cycleId).update({stage:"committee"});
  }

}

// recovery
async function applyRecovery(studentId, points){

  const studentRef = db.ref('students/' + studentId);
  const snap = await studentRef.once('value');
  const student = snap.val();

  const newPoints = Math.max(0, (student.currentPoints || 0) - points);

  await studentRef.update({
    currentPoints:newPoints
  });

  await db.ref('actions/' + uid()).set({
    type:"recovery",
    studentId,
    points:-points,
    createdAt:now()
  });

}

// notice (simple flag)
async function markNotice(studentId){
  const student = (await db.ref('students/'+studentId).once('value')).val();
  if(!student.activeCycleId) return;

  await db.ref('cycles/'+student.activeCycleId).update({
    noticeSent:true,
    parentMailAt:now()
  });
}
