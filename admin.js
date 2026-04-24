
async function saveTeacher(t){
  const id = t.id || uid();
  await db.ref("teachers/"+id).update(t);
}

async function saveStudent(s){
  const id = s.id || uid();
  await db.ref("students/"+id).update(s);
}
