# 가동초 스마트 스케줄러 2026

> Vercel 자동 배포 테스트 커밋

학교 시간표 관리를 위한 웹 애플리케이션입니다.

## 주요 기능

- 📚 **기초 설정**: 학년별 학급 수, 요일별 시수, 교육과정 편제표, 전담 과목 설정
- 🏀 **시설 시간표**: 체육관(느티홀), 도서관(글샘터) 시간표 관리
- 👨‍🏫 **교과전담 시간표**: 전담 교사별 수업 배정 및 시간표 관리
- 📅 **학급 시간표**: 학급별 시간표 편집 및 자동 채우기 기능
- ☁️ **클라우드 저장**: Firebase Firestore를 통한 실시간 데이터 동기화
- 💾 **로컬 저장**: Firebase 미설정 시 localStorage 자동 백업
- 📊 **엑셀 내보내기**: 시간표를 Excel 파일로 다운로드

## 프로젝트 구조

```
school-schedule/
├── index.html          # 메인 HTML 파일 (모든 코드 포함)
├── package.json        # 프로젝트 설정
├── vercel.json         # Vercel 배포 설정
├── .gitignore          # Git 제외 파일
└── README.md           # 프로젝트 문서
```

## 로컬 실행

```bash
# 방법 1: npx serve 사용
npx serve .

# 방법 2: Python 사용
python -m http.server 5000
```

브라우저에서 `http://localhost:5000` 접속

## Firebase 설정 (선택사항)

Firebase 없이도 localStorage로 동작합니다. 실시간 동기화가 필요한 경우:

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성

2. Firestore Database 활성화

3. `index.html`에서 Firebase 설정 업데이트:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### Firestore 보안 규칙

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Vercel 배포

### 방법 1: GitHub 연동 (권장)

```bash
# Git 초기화 및 push
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/school-scheduler.git
git branch -M main
git push -u origin main
```

[Vercel Dashboard](https://vercel.com/dashboard)에서 GitHub 저장소 연결

### 방법 2: Vercel CLI

```bash
npm install -g vercel
vercel
```

## 사용법

### Tab 0: 기초 설정
- **요일별 시수**: 학년별로 월~금 시수 설정 (시간표 셀 비활성화에 반영)
- **학급 수**: 각 학년의 학급 수 설정
- **교육과정**: 과목별 주당 시수 설정
- **전담 과목**: 과목 선택 + 시수 입력 후 "추가" 버튼

### Tab 1: 시설 시간표
- 체육관/도서관 사용 반 입력 (예: 6-1)
- 자동 포맷팅 지원

### Tab 2: 교과전담 시간표
- 교사 추가/이름 수정
- 기초 설정의 전담 과목을 교사에게 배정
- 주당 수업 시간 자동 계산

### Tab 3: 학급 시간표
- 학급 선택 → 과목 팔레트에서 과목 선택 → 셀 클릭하여 배치
- 요일별 시수 초과 시 셀 비활성화 (빗금 표시)
- "자동채우기"로 전담 과목 자동 배치
- Excel 내보내기 지원

## 동기화 상태

- 🔵 **저장중**: 데이터 저장 진행 중
- 🟢 **저장됨**: 저장 완료
- 🟡 **로컬**: Firebase 미설정, localStorage 사용 중
- 🔴 **오류**: 저장 실패

## 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES Modules)
- **UI Framework**: Tailwind CSS
- **Icons**: Font Awesome
- **Fonts**: Noto Sans KR
- **Database**: Firebase Firestore (optional)
- **Export**: SheetJS (XLSX)
- **Deployment**: Vercel

## 라이선스

MIT License
