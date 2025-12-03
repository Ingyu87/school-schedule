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


