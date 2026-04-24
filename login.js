
// PATCHED login.js logic (inline script replacement)

// 🔒 개선: 전체 teachers fetch → index 제거 + map 기반 탐색
async function login(){
  const selectedEmail = syncTeacherSelection();
  const pw = (document.getElementById('pw').value || '').trim();

  if (!selectedEmail || !pw) {
    return toast('교사와 비밀번호를 입력해 주세요.', 'err');
  }

  try{
    const snap = await db.ref('teachers').once('value');
    const teachers = snap.val() || {};

    // ✅ index 제거 → Object 기반 탐색
    const foundEntry = Object.entries(teachers).find(([key, t]) =>
      String(t.email || '').toLowerCase() === selectedEmail &&
      String(t.password || '') === pw
    );

    if(!foundEntry){
      document.getElementById('pw').value = '';
      return toast('로그인 실패', 'err');
    }

    const [key, found] = foundEntry;

    sessionStorage.setItem('his_teacher', JSON.stringify({
      key,
      name: found.name,
      email: found.email,
      roles: found.roles || [],
      homeroom: found.homeroom || ''
    }));

    location.href = 'teacher.html';

  }catch(e){
    console.error(e);
    toast('로그인 오류', 'err');
  }
}
