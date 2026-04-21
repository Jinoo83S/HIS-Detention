// Firebase 프로젝트 설정 객체
// 이 값으로 현재 웹앱이 어떤 Firebase 프로젝트와 연결될지 결정됩니다.
const firebaseConfig = {
  "apiKey": "AIzaSyCc3rwlIlZd7NaFkd2viT-tYhS9IemsV9o",
  "authDomain": "his-detention.firebaseapp.com",
  "databaseURL": "https://his-detention-default-rtdb.asia-southeast1.firebasedatabase.app/",
  "projectId": "his-detention",
  "storageBucket": "his-detention.firebasestorage.app",
  "messagingSenderId": "357843127217",
  "appId": "1:357843127217:web:88175e347add4931294b90",
  "measurementId": "G-K3X22E8JL5"
};

// Firebase 앱 초기화
firebase.initializeApp(firebaseConfig);

// Realtime Database 객체 생성
// 이후 db.ref(...) 형태로 데이터 읽기/쓰기에 사용합니다.
const db = firebase.database();

/**
 * 화면 하단에 잠깐 나타나는 토스트 메시지 출력 함수
 * @param {string} msg - 사용자에게 보여줄 메시지
 * @param {string} type - '', 'ok', 'err', 'warn' 등 CSS 클래스명
 */
function toast(msg, type=''){
  // toast 영역 요소 가져오기
  const el = document.getElementById('toast');

  // toast 요소가 없으면 alert로 대체
  if(!el) return alert(msg);

  // 메시지 텍스트 지정
  el.textContent = msg;

  // 타입 클래스 적용
  el.className = type;

  // 표시용 클래스 추가
  el.classList.add('on');

  // 3초 뒤 자동 숨김
  setTimeout(()=>el.classList.remove('on'),3000);
}

/**
 * HTML 특수문자를 escape 처리하는 함수
 * innerHTML에 출력할 때 XSS 방지용으로 사용합니다.
 * @param {*} s - 문자열로 변환할 값
 * @returns {string}
 */
function esc(s){
  return String(s??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

/**
 * 다양한 입력값을 boolean으로 해석하는 함수
 * true, 1, y, yes 등을 true로 봅니다.
 * @param {*} v
 * @returns {boolean}
 */
function parseBool(v){
  // 이미 boolean이면 그대로 반환
  if(typeof v==='boolean') return v;

  // 문자열로 바꿔 소문자/공백 정리 후 비교
  return ['true','1','y','yes'].includes(String(v??'').trim().toLowerCase());
}

/**
 * 교사 key 생성 함수
 * 이메일이 있으면 이메일을 우선 사용하고, 없으면 이름을 사용합니다.
 * key는 소문자로 정리합니다.
 * @param {string} email
 * @param {string} name
 * @returns {string}
 */
function teacherKey(email,name){
  return String(email||name||'').trim().toLowerCase();
}

/**
 * 학생 key 생성 함수
 * 현재는 학생 이름 자체를 key로 사용합니다.
 * @param {string} name
 * @returns {string}
 */
function studentKey(name){
  return String(name||'').trim();
}

/**
 * 교사 세션이 있는지 확인하는 함수
 * 세션이 없거나 JSON 파싱에 실패하면 로그인 페이지(index.html)로 보냅니다.
 * @returns {object|null}
 */
function requireTeacherSession(){
  // sessionStorage에서 교사 정보 가져오기
  const raw=sessionStorage.getItem('his_teacher');

  // 없으면 로그인 페이지로 이동
  if(!raw){
    location.href='index.html';
    return null;
  }

  try{
    // JSON 파싱 성공 시 교사 객체 반환
    return JSON.parse(raw);
  }catch(e){
    // 파싱 실패 시 세션이 깨졌다고 보고 로그인 페이지로 이동
    location.href='index.html';
    return null;
  }
}

/**
 * 교사 로그아웃 함수
 * 세션 정보를 삭제하고 로그인 페이지로 이동합니다.
 */
function logoutTeacher(){
  sessionStorage.removeItem('his_teacher');
  location.href='index.html';
}

/**
 * CSV 한 줄을 안전하게 분리하는 함수
 * 따옴표 안의 쉼표는 컬럼 구분으로 처리하지 않도록 구현되어 있습니다.
 * @param {string} line
 * @returns {string[]}
 */
function csvSplit(line){
  const out=[];   // 결과 컬럼 배열
  let cur='';     // 현재 읽고 있는 컬럼 문자열
  let q=false;    // 현재 따옴표 안인지 여부

  for(let i=0;i<line.length;i++){
    const ch=line[i];

    // 큰따옴표를 만났을 때 처리
    if(ch=='"'){
      // 따옴표 안에서 연속된 "" 는 실제 " 문자로 처리
      if(q && line[i+1]=='"'){
        cur+='"';
        i++;
      } else {
        // 따옴표 상태 on/off 전환
        q=!q;
      }
    }
    // 쉼표를 만났고 현재 따옴표 밖이면 컬럼 구분
    else if(ch===',' && !q){
      out.push(cur);
      cur='';
    }
    // 일반 문자면 현재 컬럼에 추가
    else {
      cur+=ch;
    }
  }

  // 마지막 컬럼 추가
  out.push(cur);
  return out;
}

/**
 * CSV 전체 텍스트를 객체 배열로 변환하는 함수
 * 첫 줄은 헤더(name, email 등)로 사용합니다.
 * @param {string} text
 * @returns {object[]}
 */
function parseCsv(text){
  // UTF-8 BOM 제거 후 줄 단위 분리, 빈 줄 제거
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);

  // 줄이 없으면 빈 배열 반환
  if(!lines.length) return [];

  // 첫 줄을 헤더 배열로 처리
  const headers=csvSplit(lines[0]).map(s=>s.trim());

  // 나머지 줄을 각 행 객체로 변환
  return lines.slice(1).map(line=>{
    const cols=csvSplit(line);
    const row={};

    // 헤더 이름을 key로, 각 컬럼 값을 value로 저장
    headers.forEach((h,i)=>row[h]=(cols[i]??'').trim());

    return row;
  });
}

/**
 * 업로드한 파일을 원하는 인코딩으로 읽어 텍스트로 반환하는 함수
 * UTF-8, EUC-KR 등을 지정할 수 있습니다.
 * @param {File} file
 * @param {string} enc
 * @returns {Promise<string>}
 */
function readFileText(file, enc='utf-8'){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();

    // 파일 읽기 성공 시 ArrayBuffer -> TextDecoder로 문자열 변환
    r.onload=()=>{
      try{
        resolve(new TextDecoder(enc).decode(r.result));
      }catch(e){
        reject(e);
      }
    };

    // 파일 읽기 실패 시 reject
    r.onerror=reject;

    // 바이너리(ArrayBuffer)로 읽기
    r.readAsArrayBuffer(file);
  });

  async function uploadTeachersCsv() {
    try {
      const file = document.getElementById('teacher-csv').files[0];
      const enc = document.getElementById('teacher-csv-enc').value;
      const msg = document.getElementById('teacher-upload-msg');

      if (!file) {
        return toast('교사 CSV 파일을 선택해 주세요.', 'err');
      }

      const text = await readFileText(file, enc);
      const rows = parseCsv(text);

      if (!rows.length) {
        msg.textContent = 'CSV 내용이 비어 있습니다.';
        return toast('CSV 내용이 비어 있습니다.', 'err');
      }

      teacherRows = rows.map(r => ({
        oldKey: '',
        name: String(r.name || '').trim(),
        email: String(r.email || '').trim().toLowerCase(),
        password: String(r.password || '').trim(),
        role: String(r.role || 'general').trim() || 'general',
        homeroom: String(r.homeroom || '').trim(),
        active: parseBool(r.active),
        _delete: false,
        _status: '업로드됨'
      }));

      msg.textContent = `${teacherRows.length}명의 교사 데이터를 불러왔습니다. 교사 계정 관리 탭에서 확인 후 "변경 저장"을 눌러 반영하세요.`;
      toast('교사 CSV를 불러왔습니다.', 'ok');

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="teachers"]').classList.add('active');
      document.getElementById('tab-teachers').classList.add('active');

      renderTeachers();
    } catch (e) {
      console.error(e);
      toast('교사 CSV 업로드 실패', 'err');
    }
  }  
}