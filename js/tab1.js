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
    
    // 각 시설별로 카드 생성
    state.facilityList.forEach((facId, idx) => {
        if (!state.facilities[facId] || state.facilities[facId].length < 7) {
            state.facilities[facId] = grid(7, 5);
        }
        
        const facilityName = state.facilityNames[facId] || `시설${idx + 1}`;
        const iconClass = facId === 'gym' ? 'fa-basketball text-orange-500' : 
                         facId === 'lib' ? 'fa-book-open text-green-600' : 
                         'fa-building text-blue-500';
        
        let gridHtml = '';
        for(let i = 0; i < 7; i++) {
            const rowClass = (i === 3) ? 'bg-pink-50' : (i === 4) ? 'bg-indigo-50' : 'bg-gray-50';
            gridHtml += `<tr><td class="${rowClass} font-bold text-xs">${PERIOD_LABELS[i]}</td>`;
            for(let j = 0; j < 5; j++) {
                const val = state.facilities[facId][i] ? state.facilities[facId][i][j] || '' : '';
                const cellClass = (i === 3) ? 'bg-pink-50/30' : (i === 4) ? 'bg-indigo-50/30' : '';
                gridHtml += `<td class="${cellClass}"><input class="grid-input" 
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
                    placeholder=""></td>`;
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
    v = v.trim();
    // 쉼표를 슬래시로 변환
    v = v.replace(/,/g, '/');
    
    if (v) {
        const classes = v.split('/').map(x => x.trim()).filter(x => x);
        
        for (const cls of classes) {
            const grade = parseInt(cls.split('-')[0]);
            if (r === 3 && grade >= 1 && grade <= 3) {
                showAlert(`${cls}은(는) 1~3학년입니다. "4교시(1~3학년)" 행에 입력하세요.`);
                renderTab1();
                return;
            }
            if (r === 4 && grade >= 4 && grade <= 6) {
                showAlert(`${cls}은(는) 4~6학년입니다. "4교시(4~6학년)" 행에 입력하세요.`);
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

window.resetFacility = function(type) {
    const name = state.facilityNames?.[type] || (type === 'gym' ? '체육관' : type === 'lib' ? '도서관' : '시설');
    showConfirm(`${name} 시간표를 초기화하시겠습니까?`, () => {
        state.facilities[type] = grid(7, 5);
        saveData({ facilities: state.facilities });
        renderTab1();
    });
};



