
const DB = {
  teachers: () => db.ref("teachers"),
  students: () => db.ref("students"),
  entries: () => db.ref("entries"),
  notices: () => db.ref("notices"),
  recovery: () => db.ref("recovery")
};
