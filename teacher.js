
async function createEntry(student, points, teacher){
  const id = uid();

  await DB.entries().child(id).set({
    id,
    studentId: student.id,
    studentName: student.name,
    className: student.className,
    points,
    teacherName: teacher.name,
    status: "pending",
    createdAt: now()
  });
}

async function confirmEntry(id){
  await DB.entries().child(id).update({
    status: "confirmed",
    confirmedAt: now()
  });
}

async function sendNotice(studentId){
  await DB.notices().child(studentId).update({
    lastSentAt: now()
  });
}

async function completeRecovery(studentId, points){
  const id = uid();

  await DB.recovery().child(id).set({
    id,
    studentId,
    points,
    createdAt: now()
  });
}
