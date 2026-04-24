
// Central render (no index usage)
function render(){
  renderTeachers();
  renderStudents();
}

function renderTeachers(){
  const el = document.getElementById('teacher-list');
  if(!el) return;

  el.innerHTML = Object.values(State.teachers)
    .map(t => `<div>${t.name}</div>`)
    .join('');
}

function renderStudents(){
  const el = document.getElementById('student-list');
  if(!el) return;

  el.innerHTML = Object.values(State.students)
    .map(s => `<div>${s.name}</div>`)
    .join('');
}
