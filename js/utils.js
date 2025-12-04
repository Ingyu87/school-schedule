// 유틸리티 함수들

// 커스텀 모달
function showModal(message, type = 'info', onConfirm = null) {
    const icons = {
        info: '<i class="fa-solid fa-circle-info text-blue-500"></i>',
        warning: '<i class="fa-solid fa-triangle-exclamation text-amber-500"></i>',
        error: '<i class="fa-solid fa-circle-xmark text-red-500"></i>',
        success: '<i class="fa-solid fa-circle-check text-green-500"></i>',
        confirm: '<i class="fa-solid fa-question-circle text-indigo-500"></i>'
    };
    
    const isConfirm = type === 'confirm';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box">
            <div class="modal-title">${icons[type] || icons.info} 알림</div>
            <div class="modal-message">${message}</div>
            <div class="flex gap-2 justify-end">
                ${isConfirm ? '<button class="modal-btn modal-btn-cancel" onclick="closeModal(false)">취소</button>' : ''}
                <button class="modal-btn ${isConfirm ? 'modal-btn-danger' : 'modal-btn-primary'}" onclick="closeModal(true)">확인</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    window._modalCallback = onConfirm;
    
    const escHandler = (e) => {
        if (e.key === 'Escape') closeModal(false);
    };
    document.addEventListener('keydown', escHandler);
    overlay._escHandler = escHandler;
}

window.closeModal = function(result) {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        document.removeEventListener('keydown', overlay._escHandler);
        overlay.remove();
        document.body.style.overflow = '';
        if (window._modalCallback && result) {
            window._modalCallback();
        }
        window._modalCallback = null;
    }
};

function showAlert(message, type = 'warning') {
    showModal(message, type);
}

function showConfirm(message, onConfirm) {
    showModal(message, 'confirm', onConfirm);
}

// 동기화 표시
function showSync(status) {
    const el = document.getElementById('sync-indicator');
    if (!el) return;
    if(status === 'saving') { 
        el.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-blue-500"></i> 저장중'; 
        el.className = "text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 ml-2"; 
    }
    else if(status === 'saved') { 
        el.innerHTML = '<i class="fa-solid fa-check text-green-500"></i> 저장됨'; 
        el.className = "text-xs px-2 py-1 rounded bg-green-50 text-green-600 ml-2"; 
        setTimeout(() => { 
            el.innerHTML = '<i class="fa-solid fa-cloud"></i> 대기중'; 
            el.className = "text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 ml-2"; 
        }, 2000); 
    }
    else if(status === 'error') { 
        el.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-500"></i> 오류'; 
        el.className = "text-xs px-2 py-1 rounded bg-red-50 text-red-600 ml-2"; 
    }
    else if(status === 'local') { 
        el.innerHTML = '<i class="fa-solid fa-database"></i> 로컬'; 
        el.className = "text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-600 ml-2"; 
    }
}

// 클립보드
let clipboardData = { value: '', source: null };

// 셀 포커스/클릭 핸들러
window.handleGridFocus = function(e) {
    e.target.select();
};

window.handleGridClick = function(e) {
    e.target.select();
};

// 키보드 네비게이션 핸들러
window.handleGridKeydown = function(e, gridId, row, col, maxRow, maxCol) {
    // Ctrl+C: 복사
    if (e.ctrlKey && e.key === 'c') {
        clipboardData.value = e.target.value || '';
        clipboardData.source = { gridId, row, col };
        e.target.classList.add('copied');
        setTimeout(() => e.target.classList.remove('copied'), 300);
        return;
    }
    
    // Ctrl+V: 붙여넣기
    if (e.ctrlKey && e.key === 'v') {
        if (clipboardData.value) {
            e.target.value = clipboardData.value;
            e.target.dispatchEvent(new Event('change'));
        }
        e.preventDefault();
        return;
    }
    
    // Ctrl+X: 잘라내기
    if (e.ctrlKey && e.key === 'x') {
        clipboardData.value = e.target.value || '';
        clipboardData.source = { gridId, row, col };
        e.target.value = '';
        e.target.dispatchEvent(new Event('change'));
        return;
    }
    
    // Delete: 삭제
    if (e.key === 'Delete') {
        e.target.value = '';
        e.target.dispatchEvent(new Event('change'));
        e.preventDefault();
        return;
    }
    
    // 화살표 키로 셀 이동
    let newRow = row;
    let newCol = col;
    let shouldMove = false;
    
    switch(e.key) {
        case 'ArrowUp':
            if (row > 0) {
                newRow = row - 1;
                shouldMove = true;
            }
            e.preventDefault();
            break;
        case 'ArrowDown':
            if (row < maxRow - 1) {
                newRow = row + 1;
                shouldMove = true;
            }
            e.preventDefault();
            break;
        case 'ArrowLeft':
            // 커서가 맨 앞이거나 빈 셀일 때만 이동
            if (col > 0 && (e.target.selectionStart === 0 || e.target.value === '')) {
                newCol = col - 1;
                shouldMove = true;
                e.preventDefault();
            }
            break;
        case 'ArrowRight':
            // 커서가 맨 뒤이거나 빈 셀일 때만 이동
            if (col < maxCol - 1 && (e.target.selectionStart === e.target.value.length || e.target.value === '')) {
                newCol = col + 1;
                shouldMove = true;
                e.preventDefault();
            }
            break;
        case 'Enter':
            if (row < maxRow - 1) {
                newRow = row + 1;
                shouldMove = true;
            }
            e.preventDefault();
            break;
        case 'Tab':
            return; // 기본 동작 유지
        default:
            return;
    }
    
    if (shouldMove) {
        const nextInput = document.querySelector(`[data-grid="${gridId}"][data-row="${newRow}"][data-col="${newCol}"]`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    }
};

// 드래그 앤 드롭
window.handleDragStart = function(e) {
    e.dataTransfer.setData('text/plain', e.target.value || '');
    e.dataTransfer.setData('source-grid', e.target.dataset.grid);
    e.dataTransfer.setData('source-row', e.target.dataset.row);
    e.dataTransfer.setData('source-col', e.target.dataset.col);
    e.target.classList.add('dragging');
};

window.handleDragEnd = function(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
};

window.handleDragOver = function(e) {
    e.preventDefault();
    e.target.classList.add('drag-over');
};

window.handleDragLeave = function(e) {
    e.target.classList.remove('drag-over');
};

window.handleDrop = function(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');
    
    const value = e.dataTransfer.getData('text/plain');
    const sourceGrid = e.dataTransfer.getData('source-grid');
    const sourceRow = e.dataTransfer.getData('source-row');
    const sourceCol = e.dataTransfer.getData('source-col');
    
    if (sourceGrid === e.target.dataset.grid && 
        sourceRow === e.target.dataset.row && 
        sourceCol === e.target.dataset.col) {
        return;
    }
    
    const sourceInput = document.querySelector(
        `[data-grid="${sourceGrid}"][data-row="${sourceRow}"][data-col="${sourceCol}"]`
    );
    
    if (sourceInput) {
        const oldTargetValue = e.target.value;
        
        e.target.value = value;
        e.target.dispatchEvent(new Event('change'));
        
        if (e.ctrlKey) {
            // Ctrl+드롭: 복사
        } else if (e.shiftKey && oldTargetValue) {
            // Shift+드롭: 교환
            sourceInput.value = oldTargetValue;
            sourceInput.dispatchEvent(new Event('change'));
        } else {
            // 일반 드롭: 이동
            sourceInput.value = '';
            sourceInput.dispatchEvent(new Event('change'));
        }
    }
    
    e.target.focus();
};

// 입력 포맷 함수
window.fmtCls = function(el) { 
    let v = el.value;
    
    // 빈 값이면 그대로
    if (!v || v === '-') {
        el.value = '';
        return;
    }
    
    // 숫자만 추출
    v = v.replace(/[^0-9]/g,''); 
    
    if(v.length > 1) el.value = v[0] + '-' + v.substring(1); 
    else if(v.length === 1) el.value = v + '-';
    else el.value = '';
};

window.fmtFacility = function(el) {
    let v = el.value;
    
    // 빈 값이면 그대로
    if (!v || v === '-' || v === '/' || v === ',') {
        el.value = '';
        return;
    }
    
    // 쉼표나 스페이스를 슬래시로 변환
    v = v.replace(/[,\s]+/g, '/');
    
    // 숫자, 하이픈, 슬래시만 허용
    v = v.replace(/[^0-9\-\/]/g, '');
    
    if (v.includes('/')) {
        const parts = v.split('/');
        const formatted = parts.map(p => {
            p = p.replace(/[^0-9]/g, '');
            if (p.length > 1) return p[0] + '-' + p.substring(1);
            if (p.length === 1) return p + '-';
            return '';
        }).filter(p => p).join('/');
        el.value = formatted;
    } else {
        v = v.replace(/[^0-9]/g, '');
        if (v.length > 1) el.value = v[0] + '-' + v.substring(1);
        else if (v.length === 1) el.value = v + '-';
        else el.value = '';
    }
};

// 전담 교사 시간표 입력 포맷팅 (숫자 입력 시 자동으로 "-" 추가)
window.fmtTeacher = function(el) {
    let v = el.value;
    
    // 이미 완성된 형식이 있으면 (예: "4-1(영어)") 그대로 유지
    if (v.includes('(') || v.match(/\d+-\d+/)) {
        return;
    }
    
    // 빈 값이면 그대로
    if (!v || v === '-' || v === '/' || v === ',') {
        el.value = '';
        return;
    }
    
    // 쉼표나 스페이스를 슬래시로 변환
    v = v.replace(/[,\s]+/g, '/');
    
    // 숫자, 하이픈, 슬래시, 괄호, 한글만 허용
    v = v.replace(/[^0-9\-\/\(\)가-힣]/g, '');
    
    // 슬래시로 구분된 여러 항목 처리
    if (v.includes('/')) {
        const parts = v.split('/');
        const formatted = parts.map(p => {
            // 괄호가 있으면 그대로 유지
            if (p.includes('(')) return p;
            // 숫자만 추출
            p = p.replace(/[^0-9]/g, '');
            if (p.length > 1) return p[0] + '-' + p.substring(1);
            if (p.length === 1) return p + '-';
            return '';
        }).filter(p => p).join('/');
        el.value = formatted;
    } else {
        // 괄호가 있으면 그대로 유지
        if (v.includes('(')) return;
        // 숫자만 추출
        v = v.replace(/[^0-9]/g, '');
        if (v.length > 1) el.value = v[0] + '-' + v.substring(1);
        else if (v.length === 1) el.value = v + '-';
        else el.value = '';
    }
};

// =========================
// 시간표/전담 공통 유틸
// =========================
function parseScheduleEntries(cellValue) {
    if (!cellValue) return [];
    return cellValue.split('/').map(entry => {
        const trimmed = entry.trim();
        if (!trimmed) return null;
        const match = trimmed.match(/^(\d+-\d+)(?:\(([^)]+)\))?$/);
        if (match) {
            return { classKey: match[1], subject: match[2] || null };
        }
        const fallback = trimmed.match(/^(\d+-\d+)/);
        return { classKey: fallback ? fallback[1] : trimmed, subject: null };
    }).filter(Boolean);
}

function formatScheduleEntry(classKey, subject) {
    return subject ? `${classKey}(${subject})` : classKey;
}

function formatScheduleEntries(entries) {
    return entries.map(e => formatScheduleEntry(e.classKey, e.subject)).join('/');
}

function getGradeAllocations(gr) {
    if (!state.allocations || !state.allocations.common) return [];
    const raw = state.allocations.common[gr] || [];
    return raw.filter(item => {
        const subj = item.split('(')[0];
        if (subj === '보건' || subj === '체육(보건)') return false;
        if (gr === '5학년' && subj === '체육') return false;
        return true;
    });
}

function sanitizeCommonAllocations() {
    if (!state.allocations || !state.allocations.common) return;
    let updated = false;
    Object.keys(state.allocations.common).forEach(gr => {
        const filtered = state.allocations.common[gr].filter(item => {
            const subj = item.split('(')[0];
            if (subj === '보건' || subj === '체육(보건)') return false;
            if (gr === '5학년' && subj === '체육') return false;
            return true;
        });
        if (filtered.length !== state.allocations.common[gr].length) {
            state.allocations.common[gr] = filtered;
            updated = true;
        }
    });
    if (updated) {
        saveData({ allocations: state.allocations });
    }
}

