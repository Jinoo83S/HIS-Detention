# GitHub Pages 배포 방법

이 프로젝트는 Vite + React 앱입니다. GitHub Pages에서는 소스 폴더(src)를 직접 띄우면 안 되고, 반드시 `npm run build`로 만든 `dist` 결과물을 배포해야 합니다.

## 이미 GitHub 저장소에 올린 경우
1. 기존 파일을 이 폴더 파일들로 덮어쓰기
2. `vite.config.js`에 `base: '/HIS-Detention/'`가 들어있는지 확인
3. `.github/workflows/deploy.yml` 파일이 있는지 확인
4. GitHub 저장소에 push
5. GitHub > Settings > Pages > Source를 `GitHub Actions`로 변경
6. Actions 탭에서 배포 완료 확인

## 로컬 테스트
```bash
npm install
npm run dev
```
