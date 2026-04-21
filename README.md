# HIS Detention · PTC-style full set

<!-- 프로젝트 구성 파일 설명 -->
구성
- `index.html` : 교사 로그인
- `teacher.html` : 교사용 벌점 입력
- `admin.html` : 관리자 페이지
- `common.css`, `common.js` : 공통 파일
- `students-sample.csv`, `teachers-sample.csv`

<!-- 이 프로젝트가 어떤 방식으로 동작하는지 설명 -->
## 방식
사용자가 제공한 PTC 예시처럼, Firebase Auth 없이 Realtime Database의 값을
브라우저에서 읽어 로그인 비교 후 `sessionStorage`에 저장하는 방식입니다.

<!-- Firebase Realtime Database 구조 설명 -->
## RTDB 구조
- `teachers/{key}`
- `students/{key}`
- `detentionRecords/{pushKey}`

<!-- 관리자 비밀번호 위치 안내 -->
## 관리자 비밀번호
`admin.html` 안의 `ADMIN_PW` 값을 원하는 값으로 바꾸세요.

<!-- 교사 CSV 형식 -->
## 교사 CSV
`name,email,password,role,active,homeroom`

<!-- 학생 CSV 형식 -->
## 학생 CSV
`name,englishName,className`