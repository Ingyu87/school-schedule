# Firebase 설정 가이드

## 1. Firebase Console 접속
1. https://console.firebase.google.com 접속
2. 프로젝트: `school-schedule-d16bc` 선택

## 2. Firestore 보안 규칙 업데이트
1. 왼쪽 메뉴에서 **Firestore Database** 클릭
2. **규칙** 탭 클릭
3. 아래 규칙으로 교체:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 학교 정보: 읽기/쓰기는 인증된 사용자만
    match /schools/{schoolName} {
      allow read, write: if request.auth != null;
      
      // 학교별 데이터: 해당 학교만 접근 가능
      match /data/{document=**} {
        allow read, write: if request.auth != null;
      }
    }
    
    // 기존 artifacts 경로 (마이그레이션 호환성)
    match /artifacts/{appId}/public/data/schedules/{scheduleId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. **게시** 버튼 클릭

## 3. 익명 인증 활성화 확인
1. 왼쪽 메뉴에서 **Authentication** 클릭
2. **Sign-in method** 탭 클릭
3. **익명** 인증이 **사용 설정**되어 있는지 확인
4. 없으면 **익명** 클릭 → **사용 설정** → **저장**

## 4. Vercel 환경변수 (선택사항)
현재는 Firebase 설정이 하드코딩되어 있어서 Vercel 환경변수 변경은 **필요 없습니다**.

만약 보안을 강화하고 싶다면:
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 다음 변수 추가:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - 등등...

하지만 현재는 **변경할 필요 없습니다**.

