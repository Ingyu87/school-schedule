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
    
    // 전체 전담 시간표 버튼 활성화/비활성화
    const allTeachersBtn = document.getElementById('all-teachers-excel-btn');
    if (allTeachersBtn) {
        if (allTeachersCompleted) {
            allTeachersBtn.disabled = false;
        } else {
            allTeachersBtn.disabled = true;
        }
    }
}

// 초기화
async function init() {
    // 로그인 체크
    const saved = localStorage.getItem('current_school');
    if (!saved) {
        // 로그인 안 되어 있으면 로그인 페이지로
        window.location.href = 'login.html';
        return;
    }
    
    const school = JSON.parse(saved);
    
    // 마스터키 모드 체크
    if (school.name === 'MASTER') {
        // 마스터키 모드면 학교 선택 페이지로
        window.location.href = 'school-select.html';
        return;
    }
    
    // firebase.js의 currentSchoolName 업데이트
    if (typeof getCurrentSchoolName === 'function') {
        // getCurrentSchoolName이 있으면 사용
    } else {
        // 전역 변수로 설정
        window.currentSchoolName = school.name;
    }
    
    // 헤더에 학교명 표시
    const schoolNameDisplay = document.getElementById('school-name-display');
    if (schoolNameDisplay) {
        schoolNameDisplay.textContent = school.name;
    }
    
    // 페이지 제목도 학교명으로 변경
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = `${school.name} 스마트 스케줄러 2026`;
    }
    
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

// 로그아웃 함수
window.logout = function() {
    if (confirm('로그아웃하시겠습니까?')) {
        localStorage.removeItem('current_school');
        window.location.href = 'login.html';
    }
};

// 관리자 페이지 접근 확인
window.checkAdminAccess = function() {
    const adminPassword = prompt('관리자 비밀번호를 입력하세요:');
    if (adminPassword === '0307') {
        // 관리자 모드로 설정
        localStorage.setItem('current_school', JSON.stringify({ name: 'MASTER', isMaster: true }));
        window.location.href = 'admin.html';
    } else if (adminPassword !== null) {
        alert('관리자 비밀번호가 올바르지 않습니다.');
    }
};

// DOM 로드 후 실행
document.addEventListener('DOMContentLoaded', init);

// 전체 초기화 (비밀번호 필요)
window.resetAllData = function() {
    const password = prompt('⚠️ 모든 데이터가 삭제됩니다!\n\n비밀번호를 입력하세요:');
    
    if (password === null) {
        // 취소 버튼 클릭
        return;
    }
    
    if (password !== '0403') {
        alert('❌ 비밀번호가 올바르지 않습니다.');
        return;
    }
    
    // 최종 확인
    const confirm = window.confirm('정말로 모든 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!');
    
    if (!confirm) {
        return;
    }
    
    try {
        // 로컬 스토리지 초기화
        localStorage.clear();
        
        // Firebase 데이터 초기화 (있다면)
        if (typeof clearFirebaseData === 'function') {
            clearFirebaseData();
        }
        
        // 페이지 새로고침
        alert('✅ 모든 데이터가 초기화되었습니다.\n\n페이지를 새로고침합니다.');
        location.reload();
    } catch (error) {
        console.error('초기화 오류:', error);
        alert('❌ 초기화 중 오류가 발생했습니다.');
    }
};

// 도움말 토글
window.toggleHelp = function(helpId) {
    const helpDiv = document.getElementById(helpId);
    const iconDiv = document.getElementById(helpId + '-icon');
    
    if (helpDiv && iconDiv) {
        if (helpDiv.classList.contains('hidden')) {
            helpDiv.classList.remove('hidden');
            iconDiv.classList.remove('fa-chevron-down');
            iconDiv.classList.add('fa-chevron-up');
        } else {
            helpDiv.classList.add('hidden');
            iconDiv.classList.remove('fa-chevron-up');
            iconDiv.classList.add('fa-chevron-down');
        }
    }
};

