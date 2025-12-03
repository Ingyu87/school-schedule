// 앱 초기화 및 탭 관리

window.switchTab = function(id) {
    activeTab = id;
    ['tab0','tab1','tab2','tab3'].forEach(t => {
        const el = document.getElementById(t);
        if (el) el.classList.add('hidden');
    });
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const tab = document.getElementById(id);
    if (tab) tab.classList.remove('hidden');
    const btn = document.getElementById('btn-' + id);
    if (btn) btn.classList.add('active');
    renderCurrentTab();
};

function renderCurrentTab() {
    if(activeTab === 'tab0') renderTab0();
    if(activeTab === 'tab1') renderTab1();
    if(activeTab === 'tab2') renderTab2();
    if(activeTab === 'tab3') { initEditorSelector(); renderTab3(); }
    updateTabAccessibility();
}

// 탭 및 버튼 활성화 제어
function updateTabAccessibility() {
    // 전담 교사 완료 확인
    const allTeachersCompleted = state.teachers.every(t => t.completed);
    
    // 학급 시간표 탭 활성화/비활성화
    const tab3Btn = document.getElementById('btn-tab3');
    if (tab3Btn) {
        if (allTeachersCompleted) {
            tab3Btn.disabled = false;
            tab3Btn.classList.remove('opacity-50', 'cursor-not-allowed');
            tab3Btn.title = '';
        } else {
            tab3Btn.disabled = true;
            tab3Btn.classList.add('opacity-50', 'cursor-not-allowed');
            tab3Btn.title = '모든 전담 교사 시간표를 완료해야 합니다';
        }
    }
    
    // 모든 학급 완료 확인
    const allClassKeys = [];
    Object.keys(state.config).forEach(gr => {
        for (let i = 1; i <= state.config[gr].classes; i++) {
            allClassKeys.push(`${gr}-${i}반`);
        }
    });
    const allClassesCompleted = allClassKeys.every(k => state.timetableCompletion[k]);
    
    // 최종 엑셀 생성 버튼 활성화/비활성화
    const finalBtn = document.getElementById('final-excel-btn');
    if (finalBtn) {
        if (allTeachersCompleted && allClassesCompleted) {
            finalBtn.disabled = false;
            finalBtn.classList.remove('disabled:bg-gray-300', 'disabled:cursor-not-allowed');
            finalBtn.classList.add('hover:bg-purple-700');
        } else {
            finalBtn.disabled = true;
            finalBtn.classList.add('disabled:bg-gray-300', 'disabled:cursor-not-allowed');
            finalBtn.classList.remove('hover:bg-purple-700');
        }
    }
}

// 초기화
async function init() {
    // Firebase 초기화 시도
    const firebaseLoaded = await initFirebase();
    
    if (!firebaseLoaded) {
        // 로컬 스토리지에서 로드
        loadFromLocalStorage();
        initTimetables();
        renderTab0();
        showSync('local');
    }
}

// DOM 로드 후 실행
document.addEventListener('DOMContentLoaded', init);


