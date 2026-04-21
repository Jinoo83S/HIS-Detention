# HIS Detention

React + Vite + Firebase 기반 교사용 벌점 관리 시스템입니다.

## 포함 기능
- Google 로그인
- 학생 목록 조회
- 학생 검색 (이름 / 영문 이름 / 학반)
- CSV 업로드로 학생 명단 일괄 등록
- 학생별 벌점 입력
- 학생별 벌점 이력 조회

## 학생 데이터 형식
학생 문서는 아래 구조로 저장됩니다.

```text
students/{name}
  name: "김민수"
  englishName: "Minsu Kim"
  className: "10A"
```

즉, 학생 이름이 Firestore 문서 ID가 됩니다.

## CSV 형식
반드시 UTF-8 CSV 파일이어야 하며, 첫 줄은 아래와 같아야 합니다.

```csv
name,englishName,className
김민수,Minsu Kim,10A
박서연,Seoyeon Park,10A
이도윤,Doyoon Lee,11B
```

## 실행 방법
```bash
npm install
npm run dev
```

## Firebase 콘솔에서 먼저 해야 할 것
1. Authentication > Sign-in method > Google 사용 설정
2. Firestore Database 생성
3. Firestore Rules에 `firestore.rules` 내용 적용

## Firestore Rules
처음 테스트용으로는 아래 파일 내용을 Firestore Database > 규칙에 붙여넣고 게시하면 됩니다.

- `firestore.rules`

## 주의
현재 규칙은 로그인한 사용자면 학생 업로드가 가능합니다. 운영 전에는 특정 관리자 이메일만 업로드 가능하도록 제한하는 것이 좋습니다.
