
이 파일은 기존 코드에 덮어씌우는 패치입니다.

적용 방법:

1. login.html 내부 login 함수 교체
2. teacher.html script에 teacher_patch.js 내용 추가
3. common.js에 common_patch 추가

핵심 개선:
- index 접근 제거
- overwrite 제거
- 알림 시간 버그 수정
- 완료 상태 유지
