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

// Firebase 리스너 설정
function setupFirebaseListener(doc, onSnapshot, setDoc) {
    const docRef = doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'schedules', 'gadong_2026');
    
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if(data.config) state.config = data.config;
            if(data.dailyCounts) state.dailyCounts = data.dailyCounts;
            if(data.targetJeondam) state.targetJeondam = data.targetJeondam;
            if(data.targetBogun) state.targetBogun = data.targetBogun;
            if(data.facilities) state.facilities = { 
                gym: JSON.parse(data.facilities.gym || '[]'), 
                lib: JSON.parse(data.facilities.lib || '[]') 
            };
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
            initTimetables();
            renderCurrentTab();
        } else {
            saveData(state);
        }
    });
}

// 데이터 저장
let isRetrying = false;
async function saveData(data, isRetry = false) {
    showSync('saving');
    
    // 로컬 스토리지에 항상 저장
    localStorage.setItem('gadong_schedule_data', JSON.stringify(state));
    
    if (!isFirebaseEnabled) {
        showSync('local');
        return;
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
                return;
            }
        }
        
        const docRef = doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'schedules', 'gadong_2026');
        const payload = { ...data };
        
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
    } catch (e) {
        console.error("Save error:", e);
        // 인증 오류인 경우 한 번만 재시도
        if ((e.code === 'unauthenticated' || e.message?.includes('auth') || e.code === 'permission-denied') && !isRetry) {
            try {
                isRetrying = true;
                const { signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
                await signInAnonymously(firebaseAuth);
                // 재인증 후 다시 저장 시도 (재시도 플래그 설정)
                await saveData(data, true);
            } catch (retryError) {
                console.error("Retry failed:", retryError);
                isRetrying = false;
                showSync('error');
            }
        } else {
            showSync('error');
        }
    }
}

// 로컬 스토리지에서 로드
function loadFromLocalStorage() {
    const saved = localStorage.getItem('gadong_schedule_data');
    if (saved) {
        try {
            const data = JSON.parse(saved);
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

