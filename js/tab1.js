// Tab 1: 시설 시간표

function renderTab1() {
    // 시설 이름 업데이트
    updateFacilityNameDisplay();
    
    // facilityList 초기화
    if (!state.facilityList) {
        state.facilityList = ['gym', 'lib'];
    }
    
    // 시설 목록 컨테이너
    const container = document.getElementById('facility-timetables-container');
    if (!container) return;
    
    // 기존 그리드 제거
    container.innerHTML = '';
    
    // Tab 1 완료 상태 UI 업데이트
    updateTab1CompletionUI();
    
    // 각 시설별로 카드 생성
    state.facilityList.forEach((facId, idx) => {
        if (!state.facilities[facId] || state.facilities[facId].length < 7) {
            state.facilities[facId] = grid(7, 5);
        }
        
        const facilityName = state.facilityNames[facId] || `시설${idx + 1}`;
        const isFacilityCompleted = state.facilityCompletion?.[facId] || false;
        const iconClass = facId === 'gym' ? 'fa-basketball text-orange-500' : 
                         facId === 'lib' ? 'fa-book-open text-green-600' : 
                         'fa-building text-blue-500';
        
        let gridHtml = '';
        const facPeriodKeys = ['1교시','2교시','3교시','4교시','4교시','5교시','6교시'];
        const lowerT = state.scheduleTimes?.lower || {};
        const upperT = state.scheduleTimes?.upper || {};
        for(let i = 0; i < 7; i++) {
            const rowClass = (i === 3) ? 'bg-pink-50' : (i === 4) ? 'bg-indigo-50' : 'bg-gray-50';
            // 시간 표시: i===3은 upper 4교시, i===4는 lower 4교시, 나머지는 lower(같으면 하나만)
            let facTime = '';
            if (i === 3) facTime = upperT['4교시'] || '';
            else if (i === 4) facTime = lowerT['4교시'] || '';
            else facTime = lowerT[facPeriodKeys[i]] || '';
            const facTimeHtml = facTime ? `<br><span class="text-[9px] text-gray-400 font-normal">${facTime}</span>` : '';
            gridHtml += `<tr><td class="${rowClass} font-bold text-xs">${getPeriodLabels()[i]}${facTimeHtml}</td>`;
            for(let j = 0; j < 5; j++) {
                const val = state.facilities[facId][i] ? state.facilities[facId][i][j] || '' : '';
                const cellClass = (i === 3) ? 'bg-pink-50/30' : (i === 4) ? 'bg-indigo-50/30' : '';
                const lockAttr = isFacilityCompleted ? 'disabled' : '';
                const lockClass = isFacilityCompleted ? 'locked' : '';
                gridHtml += `<td class="${cellClass}"><input class="grid-input ${lockClass}" 
                    data-grid="${facId}" data-row="${i}" data-col="${j}"
                    value="${val}" 
                    onchange="fmtFacility(this); updFac('${facId}',${i},${j},this.value)" 
                    oninput="fmtFacilityInput(this)" 
                    onblur="fmtFacility(this)"
                    onkeydown="handleGridKeydown(event,'${facId}',${i},${j},7,5)"
                    onfocus="handleGridFocus(event)"
                    onclick="handleGridClick(event)"
                    draggable="true"
                    ondragstart="handleDragStart(event)"
                    ondragend="handleDragEnd(event)"
                    ondragover="handleDragOver(event)"
                    ondragleave="handleDragLeave(event)"
                    ondrop="handleDrop(event)"
                    placeholder="" ${lockAttr}></td>`;
            }
            gridHtml += '</tr>';
        }
        
        const cardHtml = `
            <div class="card">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-bold text-gray-800">
                        <i class="fa-solid ${iconClass} mr-2"></i>
                        <span id="facility-name-${facId}">${facilityName}</span>
                    </h3>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-400">반 입력 (예: 6-1) | 격주: 3-1,4-1 (쉼표로 구분)</span>
                        <label class="flex items-center cursor-pointer bg-green-50 border border-green-300 px-3 py-1 rounded text-xs hover:bg-green-100 transition ${isFacilityCompleted ? 'bg-green-100 border-green-500' : ''}" id="facility-${facId}-completion-label">
                            <input type="checkbox" onchange="toggleFacilityCompletion('${facId}')" class="mr-2" id="facility-${facId}-completed-checkbox" ${isFacilityCompleted ? 'checked' : ''}>
                            <span class="text-green-700 font-bold">완료</span>
                        </label>
                        <button onclick="downloadFacilityExcel('${facId}')" class="text-xs bg-green-500 text-white hover:bg-green-600 px-2 py-1 rounded">
                            <i class="fa-solid fa-file-excel mr-1"></i>저장
                        </button>
                        <button onclick="resetFacility('${facId}')" class="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded">
                            <i class="fa-solid fa-rotate-left mr-1"></i>초기화
                        </button>
                    </div>
                </div>
                <table class="base-table">
                    <thead>
                        <tr>
                            <th class="w-16">교시</th>
                            <th>월</th>
                            <th>화</th>
                            <th>수</th>
                            <th>목</th>
                            <th>금</th>
                        </tr>
                    </thead>
                    <tbody id="${facId}-grid">${gridHtml}</tbody>
                </table>
            </div>`;
        
        container.insertAdjacentHTML('beforeend', cardHtml);
    });
}

window.updFac = function(t, r, c, v) {
    if (state.facilityCompletion?.[t]) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        renderTab1();
        return;
    }
    v = v.trim();
    // 쉼표를 슬래시로 변환
    v = v.replace(/,/g, '/');
    
    if (v) {
        const classes = v.split('/').map(x => x.trim()).filter(x => x);
        
        for (const cls of classes) {
            const grade = parseInt(cls.split('-')[0]);
            const gradeIsLower = isLowerGroup(grade);
            if (r === 3 && gradeIsLower) {
                showAlert(`${cls}은(는) 1그룹(점심먼저)입니다. 아래 행에 입력하세요.`);
                renderTab1();
                return;
            }
            if (r === 4 && !gradeIsLower) {
                showAlert(`${cls}은(는) 2그룹(수업먼저)입니다. 위 행에 입력하세요.`);
                renderTab1();
                return;
            }
            
            // 다른 모든 시설에서 같은 시간에 배정되어 있는지 확인 (동적 시설 지원)
            if (state.facilityList) {
                for (const otherFacId of state.facilityList) {
                    if (otherFacId === t) continue; // 현재 시설은 제외
                    
                    if (state.facilities[otherFacId] && state.facilities[otherFacId][r] && state.facilities[otherFacId][r][c]) {
                        const otherClasses = state.facilities[otherFacId][r][c].split('/').map(x => x.trim());
                        if (otherClasses.includes(cls)) {
                            const otherFacName = state.facilityNames[otherFacId] || otherFacId;
                            showAlert(`${cls}은(는) 이미 같은 시간에 ${otherFacName}에 배정되어 있습니다.`);
                            renderTab1();
                            return;
                        }
                    }
                }
            } else {
                // 기존 호환성
                const otherFac = t === 'gym' ? 'lib' : 'gym';
                if (state.facilities[otherFac] && state.facilities[otherFac][r] && state.facilities[otherFac][r][c]) {
                    const otherClasses = state.facilities[otherFac][r][c].split('/').map(x => x.trim());
                    if (otherClasses.includes(cls)) {
                        showAlert(`${cls}은(는) 이미 같은 시간에 ${otherFac === 'gym' ? '체육관' : '도서관'}에 배정되어 있습니다.`);
                        renderTab1();
                        return;
                    }
                }
            }
        }
    }
    
    if (!state.facilities[t]) state.facilities[t] = grid(7, 5);
    if (!state.facilities[t][r]) state.facilities[t][r] = Array(5).fill('');
    state.facilities[t][r][c] = v;
    saveData({facilities: state.facilities});
    renderTab1();
};

function updateFacilityNameDisplay() {
    if (!state.facilityNames || !state.facilityList) return;
    
    // 모든 시설 이름 업데이트
    state.facilityList.forEach(facId => {
        const displayEl = document.getElementById(`facility-name-${facId}`);
        if (displayEl) {
            displayEl.textContent = state.facilityNames[facId] || `시설${state.facilityList.indexOf(facId) + 1}`;
        }
    });
}

// Tab 1 완료 상태 UI 업데이트
function updateTab1CompletionUI() {
    // 모든 시설 완료 여부 확인
    const allFacilitiesCompleted = checkAllFacilitiesCompleted();
    
    // Tab 1 완료 상태 자동 업데이트
    if (allFacilitiesCompleted && !state.tabCompletion?.tab1) {
        state.tabCompletion = state.tabCompletion || {};
        state.tabCompletion.tab1 = true;
        saveData({ tabCompletion: state.tabCompletion });
    } else if (!allFacilitiesCompleted && state.tabCompletion?.tab1) {
        state.tabCompletion.tab1 = false;
        saveData({ tabCompletion: state.tabCompletion });
    }
    
    const checkbox = document.getElementById('tab1-completed-checkbox');
    const label = document.getElementById('tab1-completion-label');
    if (checkbox && label) {
        const isCompleted = state.tabCompletion?.tab1 || false;
        checkbox.checked = isCompleted;
        checkbox.disabled = !allFacilitiesCompleted; // 모든 시설이 완료되어야만 활성화
        if (isCompleted) {
            label.classList.remove('bg-green-50', 'border-green-300');
            label.classList.add('bg-green-100', 'border-green-500');
        } else {
            label.classList.remove('bg-green-100', 'border-green-500');
            label.classList.add('bg-green-50', 'border-green-300');
        }
        if (!allFacilitiesCompleted) {
            label.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            label.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

// 모든 시설 완료 여부 확인
function checkAllFacilitiesCompleted() {
    if (!state.facilityList || state.facilityList.length === 0) {
        return false;
    }
    
    return state.facilityList.every(facId => {
        return state.facilityCompletion?.[facId] === true;
    });
}

// 시설별 완료 토글
window.toggleFacilityCompletion = function(facId) {
    const checkbox = document.getElementById(`facility-${facId}-completed-checkbox`);
    if (!checkbox) return;
    
    state.facilityCompletion = state.facilityCompletion || {};
    state.facilityCompletion[facId] = checkbox.checked;
    
    // 저장
    saveData({ facilityCompletion: state.facilityCompletion });
    
    // 체크박스 스타일 업데이트
    const label = document.getElementById(`facility-${facId}-completion-label`);
    if (label) {
        if (checkbox.checked) {
            label.classList.remove('bg-green-50', 'border-green-300');
            label.classList.add('bg-green-100', 'border-green-500');
        } else {
            label.classList.remove('bg-green-100', 'border-green-500');
            label.classList.add('bg-green-50', 'border-green-300');
        }
    }
    
    // Tab 1 완료 상태 업데이트
    updateTab1CompletionUI();
    
    // 탭 활성화 상태 업데이트
    if (typeof updateTabAccessibility === 'function') {
        updateTabAccessibility();
    }
    
    // 모든 시설이 완료되면 알림
    if (checkAllFacilitiesCompleted()) {
        showAlert('모든 시설 시간표가 완료되었습니다. 이제 "2. 교과전담 교사별 시간표" 탭을 사용할 수 있습니다.', 'success');
    }
    
    renderTab1();
};

window.resetFacility = function(type) {
    if (state.facilityCompletion?.[type]) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    const name = state.facilityNames?.[type] || (type === 'gym' ? '체육관' : type === 'lib' ? '도서관' : '시설');
    showConfirm(`${name} 시간표를 초기화하시겠습니까?`, () => {
        state.facilities[type] = grid(7, 5);
        saveData({ facilities: state.facilities });
        renderTab1();
    });
};



