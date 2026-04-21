# HIS Detention - No Build Version

이 버전은 **터미널 없이** GitHub Pages에 바로 올릴 수 있는 정적 웹앱입니다.

## 포함 기능
- Google 로그인
- 학생 CSV 일괄 업로드
- 학생 검색
- 벌점 입력
- 벌점 이력 조회

## 학생 문서 구조
- 컬렉션: `students`
- 문서 ID: 학생 이름
- 필드:
  - `name`
  - `englishName`
  - `className`

## CSV 형식
첫 줄은 반드시 아래와 같아야 합니다.

```csv
name,englishName,className
```

## GitHub Pages 업로드
저장소 루트에 아래 파일을 그대로 올리세요.
- index.html
- style.css
- app.js
- students-sample.csv

## Firebase에서 해야 할 일
1. Authentication > Sign-in method > Google 사용 설정
2. Authentication > Settings > Authorized domains 에 `jinoo83s.github.io` 추가
3. Firestore Database 생성
4. Firestore Rules에 `firestore.rules` 내용 붙여넣고 게시

## 주의
- 이 버전은 빌드 없이 바로 배포하는 방식이라 `src/main.jsx` 같은 파일이 없습니다.
- GitHub Pages에서 반드시 저장소 루트(`/root`)를 배포하면 됩니다.
