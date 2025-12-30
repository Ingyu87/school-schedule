// Firebase 설정 및 데이터 관리

const firebaseConfig = {
    apiKey: "AIzaSyATebSC3BCAlTVUO_ybyg1OoIdqgBlxFBc",
    authDomain: "school-schedule-d16bc.firebaseapp.com",
    projectId: "school-schedule-d16bc",
    storageBucket: "school-schedule-d16bc.firebasestorage.app",
    messagingSenderId: "173998479308",
    appId: "1:173998479308:web:b1ea6a69c743d838a5ef69",
    measurementId: "G-NPPXKJCGGB"
};

const appId = 'gadong-schedule';
let firebaseApp, firebaseAuth, firebaseDb;
let isFirebaseEnabled = false;
let currentSchoolName = null;

// Firebase 초기화
async function initFirebase() {
    try {
        if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
            const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
            const { getAuth, signInAnonymously, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
            const { getFirestore, doc, setDoc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            
            firebaseApp = initializeApp(firebaseConfig);
            firebaseAuth = getAuth(firebaseApp);
            firebaseDb = getFirestore(firebaseApp);
            isFirebaseEnabled = true;
            
            // 인증 상태 변경 리스너 (토큰 만료 감지 및 자동 재인증)
            onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    // 인증 성공
                    console.log("Firebase authenticated:", user.uid);
                    showSync('saved');
                } else {
                    // 토큰 만료 또는 로그아웃 - 자동 재인증 시도
                    console.log("Firebase token expired, re-authenticating...");
                    try {
                        await signInAnonymously(firebaseAuth);
                    } catch (e) {
                        console.error("Re-authentication failed:", e);
                        showSync('error');
                    }
                }
            });
            
            // 초기 익명 인증
            await signInAnonymously(firebaseAuth);
            
            // 리스너 설정
            setupFirebaseListener(doc, onSnapshot, setDoc);
            
            return true;
        }
    } catch (e) {
        console.warn("Firebase not configured, using local storage", e);
    }
    return false;
}

// 현재 학교명 가져오기
function getCurrentSchoolName() {
    if (!currentSchoolName) {
        const saved = localStorage.getItem('current_school');
        if (saved) {
            try {
                const school = JSON.parse(saved);
                // 마스터키 모드가 아니면 학교명 사용
                if (school.name && school.name !== 'MASTER') {
                    currentSchoolName = school.name;
                } else {
                    currentSchoolName = '가동초'; // 기본값
                }
            } catch (e) {
                console.error('Failed to parse current_school:', e);
                currentSchoolName = '가동초'; // 기본값
            }
        } else {
            currentSchoolName = '가동초'; // 기본값 (마이그레이션용)
        }
    }
    return currentSchoolName;
}

// Firebase 리스너 설정
let isInitialLoad = true; // 초기 로드 여부 추적
function setupFirebaseListener(doc, onSnapshot, setDoc) {
    const schoolName = getCurrentSchoolName();
    const docRef = doc(firebaseDb, 'schools', schoolName, 'data', 'schedule');
    
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const firebaseData = docSnap.data();
            const firebaseTimestamp = firebaseData._lastSaved || 0;
            
            // 로컬 스토리지에서 최신 데이터 확인
            const localDataStr = localStorage.getItem(`school-${schoolName}-data`);
            let localTimestamp = 0;
            let localData = null;
            
            if (localDataStr) {
                try {
                    localData = JSON.parse(localDataStr);
                    localTimestamp = localData._lastSaved || 0;
                } catch (e) {
                    console.error('Failed to parse local data:', e);
                }
            }
            
            // 로컬 데이터가 더 최신이면 로컬 데이터를 사용하고 Firebase에 저장
            if (localTimestamp > firebaseTimestamp && localData) {
                console.log('Local data is newer, saving to Firebase...');
                // 로컬 데이터를 state에 적용 (_lastSaved 필드 제거)
                const { _lastSaved, ...dataToApply } = localData;
                Object.assign(state, dataToApply);
                // Firebase에 저장 (재귀 방지를 위해 플래그 사용)
                if (isInitialLoad) {
                    isInitialLoad = false;
                    saveData(state).then(() => {
                        initTimetables();
                        renderCurrentTab();
                    });
                    return;
                }
            } else {
                // Firebase 데이터가 더 최신이거나 같으면 Firebase 데이터 사용
                const data = firebaseData;
                if(data.config) state.config = data.config;
                if(data.dailyCounts) state.dailyCounts = data.dailyCounts;
                if(data.targetJeondam) state.targetJeondam = data.targetJeondam;
                if(data.targetBogun) state.targetBogun = data.targetBogun;
                if(data.facilities) {
                    state.facilities = { 
                        gym: JSON.parse(data.facilities.gym || '[]'), 
                        lib: JSON.parse(data.facilities.lib || '[]') 
                    };
                }
                if(data.allocations) state.allocations = data.allocations;
                if(data.specialSupport) state.specialSupport = data.specialSupport;
                if(data.teachers) {
                    state.teachers = data.teachers.map(t => ({
                        ...t,
                        assignments: t.assignments || [],
                        schedule: typeof t.schedule === 'string' ? JSON.parse(t.schedule) : (t.schedule || grid(6,5))
                    }));
                }
                if(data.timetables) {
                    state.timetables = {};
                    Object.keys(data.timetables).forEach(k => {
                        try { state.timetables[k] = JSON.parse(data.timetables[k]); } 
                        catch(e) { state.timetables[k] = grid(6,5); }
                    });
                }
                if(data.curriculum) state.curriculum = data.curriculum;
                if(data.teacherConfig) state.teacherConfig = data.teacherConfig;
                if(data.scheduleTimes) state.scheduleTimes = data.scheduleTimes;
                if(data.facilityNames) state.facilityNames = data.facilityNames;
                if(data.facilityList) state.facilityList = data.facilityList;
                if(data.timetableCompletion) state.timetableCompletion = data.timetableCompletion;
                
                // 로컬 스토리지에도 저장 (동기화)
                localStorage.setItem(`school-${schoolName}-data`, JSON.stringify({
                    ...state,
                    _lastSaved: firebaseTimestamp
                }));
            }
            
            isInitialLoad = false;
            initTimetables();
            renderCurrentTab();
        } else {
            // Firebase에 데이터가 없으면 로컬 데이터를 Firebase에 저장
            if (isInitialLoad) {
                isInitialLoad = false;
                saveData(state);
            }
        }
    });
}

// 데이터 저장
let isRetrying = false;
let savePromise = null; // 현재 저장 작업 추적
async function saveData(data, isRetry = false) {
    showSync('saving');
    
    // 부분 업데이트가 아닌 전체 state를 저장하도록 수정
    // data가 부분 업데이트인 경우 전체 state와 병합
    let fullData;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        // 부분 업데이트인지 확인 (state의 주요 키들과 비교)
        const stateKeys = Object.keys(state).filter(k => !k.startsWith('_'));
        const dataKeys = Object.keys(data).filter(k => !k.startsWith('_'));
        if (dataKeys.length < stateKeys.length) {
            // 부분 업데이트: 전체 state와 병합
            fullData = { ...state, ...data };
        } else {
            // 전체 데이터
            fullData = data;
        }
    } else {
        // data가 없거나 유효하지 않으면 전체 state 사용
        fullData = state;
    }
    
    // _lastSaved 필드 제거 (state에 포함되지 않도록)
    delete fullData._lastSaved;
    
    // 로컬 스토리지에 항상 저장 (학교별로 분리)
    const schoolName = getCurrentSchoolName();
    // 전체 state를 저장 (타임스탬프 추가)
    const dataWithTimestamp = {
        ...fullData,
        _lastSaved: Date.now()
    };
    localStorage.setItem(`school-${schoolName}-data`, JSON.stringify(dataWithTimestamp));
    
    if (!isFirebaseEnabled) {
        showSync('local');
        return Promise.resolve();
    }

    try {
        const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const { signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
        
        // 토큰 만료 시 재인증 시도
        if (!firebaseAuth.currentUser) {
            try {
                await signInAnonymously(firebaseAuth);
            } catch (authError) {
                console.error("Authentication error:", authError);
                showSync('error');
                return Promise.reject(authError);
            }
        }
        
        const schoolName = getCurrentSchoolName();
        const docRef = doc(firebaseDb, 'schools', schoolName, 'data', 'schedule');
        const payload = { ...fullData };
        
        // 타임스탬프 추가
        payload._lastSaved = Date.now();
        
        if (payload.facilities) {
            payload.facilities = { 
                gym: JSON.stringify(payload.facilities.gym), 
                lib: JSON.stringify(payload.facilities.lib) 
            };
        }
        if (payload.timetables) {
            const serialized = {};
            Object.keys(payload.timetables).forEach(k => { 
                serialized[k] = JSON.stringify(payload.timetables[k]); 
            });
            payload.timetables = serialized;
        }
        if (payload.teachers) {
            payload.teachers = payload.teachers.map(t => ({
                ...t,
                schedule: JSON.stringify(t.schedule || grid(6,5))
            }));
        }
        
        await setDoc(docRef, payload, { merge: true });
        showSync('saved');
        isRetrying = false;
        return Promise.resolve();
    } catch (e) {
        console.error("Save error:", e);
        // 인증 오류인 경우 한 번만 재시도
        if ((e.code === 'unauthenticated' || e.message?.includes('auth') || e.code === 'permission-denied') && !isRetry) {
            try {
                isRetrying = true;
                const { signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
                await signInAnonymously(firebaseAuth);
                // 재인증 후 다시 저장 시도 (재시도 플래그 설정)
                return await saveData(fullData, true);
            } catch (retryError) {
                console.error("Retry failed:", retryError);
                isRetrying = false;
                showSync('error');
                return Promise.reject(retryError);
            }
        } else {
            showSync('error');
            return Promise.reject(e);
        }
    }
}

// 로컬 스토리지에서 로드
function loadFromLocalStorage() {
    const schoolName = getCurrentSchoolName();
    // 먼저 학교별 데이터 시도
    let saved = localStorage.getItem(`school-${schoolName}-data`);
    // 없으면 기존 데이터 시도 (마이그레이션용)
    if (!saved) {
        saved = localStorage.getItem('gadong_schedule_data');
        if (saved && schoolName === '가동초') {
            // 마이그레이션: 기존 데이터를 새 키로 저장
            localStorage.setItem(`school-${schoolName}-data`, saved);
        }
    }
    if (saved) {
        try {
            const data = JSON.parse(saved);
            // _lastSaved 필드 제거 (state에 포함되지 않도록)
            delete data._lastSaved;
            
            if (data.teachers) {
                data.teachers = data.teachers.map(t => ({
                    ...t,
                    assignments: t.assignments || [],
                    schedule: typeof t.schedule === 'string' ? JSON.parse(t.schedule) : (t.schedule || grid(6,5))
                }));
            }
            if (data.facilities) {
                ['gym', 'lib'].forEach(fac => {
                    if (data.facilities[fac] && data.facilities[fac].length < 7) {
                        while (data.facilities[fac].length < 7) {
                            data.facilities[fac].push(Array(5).fill(''));
                        }
                    }
                });
            }
            Object.assign(state, data);
            console.log("Loaded from localStorage");
        } catch (e) {
            console.error("Failed to load from localStorage", e);
        }
    }
}

// Firebase 데이터 초기화
async function clearFirebaseData() {
    if (!isFirebaseEnabled || !firebaseAuth.currentUser) {
        console.log("Firebase not enabled or not authenticated");
        return;
    }
    
    try {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const schoolName = getCurrentSchoolName();
        const docRef = doc(firebaseDb, 'schools', schoolName, 'data', 'schedule');
        await deleteDoc(docRef);
        console.log("Firebase data cleared");
    } catch (e) {
        console.error("Failed to clear Firebase data:", e);
    }
}

