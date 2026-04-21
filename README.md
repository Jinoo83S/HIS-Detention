# HIS Detention Static v2

## 포함 기능
- GitHub Pages에 바로 올릴 수 있는 정적 웹앱
- 관리자 Google 로그인
- 일반 교사 Email/Password 로그인
- 학생 CSV 업로드
- 한글 CSV 인코딩 선택(UTF-8, EUC-KR)
- 교사 계정 생성
- 교사 권한 분류: 학생부 / 교육담당 / 알림담당 / 일반
- 교사 활성/비활성
- 비밀번호 재설정 이메일 발송
- 관리자만 학생 명단 / 교사 / 벌점 기록 편집 가능
- 교사는 벌점만 입력 가능

## 매우 중요한 제한
Firebase Authentication은 보안상 기존 비밀번호를 읽어오거나 화면에 표시하지 않습니다.
또한 별도 서버(Admin SDK) 없이 웹앱만으로는 관리자가 다른 사용자의 비밀번호를 직접 임의 변경하는 기능을 안전하게 구현할 수 없습니다.
그래서 이 버전은 다음 방식으로 구성했습니다.

- 관리자는 새 교사 계정을 생성할 수 있음
- 비밀번호는 '재설정 이메일 발송'으로 변경
- 교사의 이름/이메일/권한/활성 상태는 Firestore에서 관리

## 첫 관리자 계정 1회 설정
이 앱은 보안을 위해 첫 관리자 문서를 Firestore 콘솔에서 1번 수동으로 만들어야 합니다.

### 순서
1. Firebase Authentication에서 Google 로그인 활성화
2. GitHub Pages 도메인(jinoo83s.github.io)을 Authorized domains에 추가
3. 사이트에서 오른쪽 상단 '관리자 로그인' 클릭
4. Google 로그인 시도
5. 권한이 없다는 안내창이 나오면, 거기에 표시된 UID를 복사
6. Firestore 콘솔에서 아래 문서 생성

컬렉션: admins
문서 ID: 방금 안내창에 나온 UID

필드:
- uid (string)
- email (string)
- name (string)

예시:
uid = abc123...
email = admin@school.org
name = 관리자

7. 다시 사이트에서 관리자 로그인

## CSV 형식
첫 줄:
name,englishName,className

## 배포
GitHub 저장소 루트에 다음 파일만 두세요.
- index.html
- style.css
- app.js
- firestore.rules
- students-sample.csv
- README.md

GitHub Pages:
- Deploy from a branch
- Branch: main
- Folder: /(root)

## Firestore Rules
firestore.rules 내용을 Firebase 콘솔 > Firestore Database > 규칙에 붙여넣고 게시하세요.
