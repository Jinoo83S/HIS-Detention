# HIS Detention · PTC-style full set

구성
- `index.html` : 교사 로그인
- `teacher.html` : 교사용 벌점 입력
- `admin.html` : 관리자 페이지
- `common.css`, `common.js` : 공통 파일
- `students-sample.csv`, `teachers-sample.csv`

## 방식
사용자가 제공한 PTC 예시처럼, Firebase Auth 없이 Realtime Database의 값을
브라우저에서 읽어 로그인 비교 후 `sessionStorage`에 저장하는 방식입니다.

## RTDB 구조
- `teachers/{key}`
- `students/{key}`
- `detentionRecords/{pushKey}`

## 관리자 비밀번호
`admin.html` 안의 `ADMIN_PW` 값을 원하는 값으로 바꾸세요.

## 교사 CSV
`name,email,password,role,active,homeroom`

## 학생 CSV
`name,englishName,className`
