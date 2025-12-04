// 인증 시스템

// 간단한 해싱 함수 (SHA-256 사용)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 현재 로그인된 학교 정보
let currentSchool = null;

// 학교 정보 가져오기
function getCurrentSchool() {
    if (!currentSchool) {
        const saved = localStorage.getItem('current_school');
        if (saved) {
            currentSchool = JSON.parse(saved);
        }
    }
    return currentSchool;
}

// 학교 정보 저장
function setCurrentSchool(schoolName, passwordHash) {
    currentSchool = { name: schoolName, passwordHash };
    localStorage.setItem('current_school', JSON.stringify(currentSchool));
}

// 로그아웃
function logout() {
    currentSchool = null;
    localStorage.removeItem('current_school');
    window.location.href = 'login.html';
}

// 마스터키 확인
const MASTER_KEY = '0307';
const MASTER_KEY_HASH = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; // '0307'의 SHA-256 해시

// 로그인 처리
window.handleLogin = async function() {
    const schoolName = document.getElementById('school-name-input').value.trim();
    const password = document.getElementById('password-input').value;
    
    if (!schoolName || !password) {
        showAlert('학교명과 비밀번호를 입력하세요.', 'error');
        return;
    }
    
    // 마스터키 확인
    const passwordHash = await hashPassword(password);
    if (password === MASTER_KEY || passwordHash === MASTER_KEY_HASH) {
        // 마스터키로 로그인: 학교 선택 페이지로 이동
        setCurrentSchool('MASTER', 'MASTER');
        window.location.href = 'school-select.html';
        return;
    }
    
    // 일반 학교 로그인
    // Firebase에서 학교 정보 확인
    try {
        // Firebase 초기화 확인 및 대기
        if (!window.firebaseDb) {
            // Firebase 초기화 대기 (최대 3초)
            let retries = 0;
            while (!window.firebaseDb && retries < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            if (!window.firebaseDb) {
                // 직접 초기화 시도
                try {
                    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
                    const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
                    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
                    
                    const firebaseConfig = {
                        apiKey: "AIzaSyATebSC3BCAlTVUO_ybyg1OoIdqgBlxFBc",
                        authDomain: "school-schedule-d16bc.firebaseapp.com",
                        projectId: "school-schedule-d16bc",
                        storageBucket: "school-schedule-d16bc.firebasestorage.app",
                        messagingSenderId: "173998479308",
                        appId: "1:173998479308:web:b1ea6a69c743d838a5ef69",
                        measurementId: "G-NPPXKJCGGB"
                    };
                    
                    const firebaseApp = initializeApp(firebaseConfig);
                    window.firebaseAuth = getAuth(firebaseApp);
                    window.firebaseDb = getFirestore(firebaseApp);
                    
                    // 익명 인증
                    if (!window.firebaseAuth.currentUser) {
                        await signInAnonymously(window.firebaseAuth);
                    }
                } catch (initError) {
                    console.error('Firebase init error:', initError);
                    showAlert('Firebase 초기화 중 오류가 발생했습니다.', 'error');
                    return;
                }
            } else {
                // firebaseDb는 있지만 인증이 안 되어 있을 수 있음
                if (window.firebaseAuth && !window.firebaseAuth.currentUser) {
                    const { signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
                    await signInAnonymously(window.firebaseAuth);
                }
            }
        }
        
        const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        
        const schoolRef = doc(window.firebaseDb, 'schools', schoolName);
        const schoolDoc = await getDoc(schoolRef);
        
        if (schoolDoc.exists()) {
            // 기존 학교: 비밀번호 확인
            const schoolData = schoolDoc.data();
            if (schoolData.passwordHash !== passwordHash) {
                showAlert('비밀번호가 올바르지 않습니다.', 'error');
                return;
            }
        } else {
            // 새 학교: 자동 등록
            await setDoc(schoolRef, {
                name: schoolName,
                passwordHash: passwordHash,
                createdAt: new Date().toISOString()
            });
        }
        
        // 로그인 성공
        setCurrentSchool(schoolName, passwordHash);
        
        // 기존 데이터 마이그레이션 (가동초인 경우)
        if (schoolName === '가동초') {
            await migrateGadongData();
        }
        
        // 메인 페이지로 이동
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert('로그인 중 오류가 발생했습니다.', 'error');
    }
};

// 가동초 데이터 마이그레이션
async function migrateGadongData() {
    try {
        const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        
        if (!window.firebaseDb) return;
        
        // 기존 데이터 경로 확인
        const oldDocRef = doc(window.firebaseDb, 'artifacts', 'gadong-schedule', 'public', 'data', 'schedules', 'gadong_2026');
        const oldDoc = await getDoc(oldDocRef);
        
        // 새 경로 확인
        const newDocRef = doc(window.firebaseDb, 'schools', '가동초', 'data', 'schedule');
        const newDoc = await getDoc(newDocRef);
        
        // 새 경로에 데이터가 없고 기존 경로에 데이터가 있으면 마이그레이션
        if (!newDoc.exists() && oldDoc.exists()) {
            const oldData = oldDoc.data();
            await setDoc(newDocRef, oldData, { merge: true });
            console.log('가동초 Firebase 데이터 마이그레이션 완료');
        }
        
        // 로컬 스토리지 데이터도 마이그레이션
        const localData = localStorage.getItem('gadong_schedule_data');
        if (localData) {
            const newKey = 'school-가동초-data';
            if (!localStorage.getItem(newKey)) {
                localStorage.setItem(newKey, localData);
                console.log('가동초 로컬 스토리지 데이터 마이그레이션 완료');
            }
        }
        
    } catch (error) {
        console.error('Migration error:', error);
    }
}

// Enter 키로 로그인
window.handleLoginKeydown = function(event) {
    if (event.key === 'Enter') {
        handleLogin();
    }
};

