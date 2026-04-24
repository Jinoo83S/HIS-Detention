
async function saveTeacher(data){
  const id = data.id || uid();

  await DB.teachers().child(id).update({
    ...data,
    updatedAt: now()
  });
}

async function saveStudent(data){
  const id = data.id || uid();

  await DB.students().child(id).update({
    ...data,
    updatedAt: now()
  });
}
