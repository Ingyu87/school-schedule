# GitHub 푸시 스크립트
# Git 설치 후 이 스크립트를 실행하세요

Write-Host "GitHub 푸시 시작..." -ForegroundColor Green

# Git 저장소 초기화 확인
if (-not (Test-Path .git)) {
    Write-Host "Git 저장소 초기화 중..." -ForegroundColor Yellow
    git init
    git remote add origin https://github.com/Ingyu87/school-schedule.git
    git branch -M main
}

# 변경된 파일 추가
Write-Host "변경된 파일 추가 중..." -ForegroundColor Yellow
git add js/firebase.js js/app.js

# 커밋
Write-Host "커밋 중..." -ForegroundColor Yellow
git commit -m "로그아웃 후 재로그인 시 데이터 반영 문제 수정

- saveData 함수가 항상 전체 state를 저장하도록 개선
- 로그아웃 시 저장 완료 대기 추가
- 로컬 스토리지와 Firebase 데이터 동기화 개선
- 타임스탬프를 사용한 최신 데이터 우선 사용"

# 푸시
Write-Host "GitHub에 푸시 중..." -ForegroundColor Yellow
git push -u origin main

Write-Host "완료!" -ForegroundColor Green

