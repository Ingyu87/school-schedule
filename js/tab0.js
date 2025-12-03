// Tab 0: 기초 설정

function renderTab0() {
    renderDailyCounts();
    renderClassConfig();
    renderCurriculum();
    renderTimeAllocationTable();
    renderCommonAllocations();
}

function renderDailyCounts() {
    const dcBody = document.getElementById('daily-counts-body');
    if (!dcBody) return;
    
    dcBody.innerHTML = '';
    const grades = ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'];
    grades.forEach(gr => {
        if (!state.dailyCounts[gr]) return;
        const counts = state.dailyCounts[gr];
        let row = `<tr><td class="font-bold text-gray-700">${gr}</td>`;
        let total = 0;
        counts.forEach((c, idx) => {
            total += parseInt(c);
            row += `<td><input type="number" min="0" max="8" value="${c}" class="edit-input" onchange="updateDailyCount('${gr}', ${idx}, this.value)"></td>`;
        });
        row += `<td class="font-bold bg-gray-100 text-indigo-600">${total}</td></tr>`;
        dcBody.innerHTML += row;
    });
}

function renderClassConfig() {
    const container = document.getElementById('class-config-container');
    if (!container) return;
    
    container.innerHTML = '';
    const grades = ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'];
    grades.forEach(gr => {
        if (!state.config[gr]) return;
        const count = state.config[gr].classes;
        const div = document.createElement('div');
        div.className = "flex flex-col items-center bg-white p-2 rounded border shadow-sm";
        div.innerHTML = `<label class="text-xs font-bold text-gray-500 mb-1">${gr} 학급수</label>
            <input type="number" min="1" max="15" value="${count}" class="w-full text-center font-bold text-lg border-b outline-none" onchange="updateClassConfig('${gr}', this.value)">`;
        container.appendChild(div);
    });
}

function renderCurriculum() {
    const tbody = document.getElementById('curriculum-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const grades = ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'];
    grades.forEach(gr => {
        if (!state.curriculum[gr]) return;
        const row = document.createElement('tr');
        const subjects = state.curriculum[gr];
        let total = 0;
        let html = `<td>${gr}</td>`;
        CURRICULUM_COLS.forEach(subj => {
            const val = subjects[subj] || 0;
            total += val;
            html += `<td><input type="number" min="0" value="${val}" class="edit-input" onchange="updateCurriculum('${gr}', '${subj}', this.value)"></td>`;
        });
        html += `<td class="font-bold bg-gray-100 text-indigo-600">${total}</td>`;
        row.innerHTML = html;
        tbody.appendChild(row);
    });
}

function renderTimeAllocationTable() {
    const grades = ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'];
    
    grades.forEach((gr, idx) => {
        const clsEl = document.getElementById(`cls-${idx+1}`);
        if (clsEl) clsEl.textContent = `(${state.config[gr].classes}학급)`;
    });
    
    const data = grades.map((gr, idx) => {
        const curriculum = state.curriculum[gr] || {};
        const totalHours = Object.values(curriculum).reduce((a, b) => a + (b || 0), 0);
        const targetJeondam = state.targetJeondam[gr] || 0;
        const targetBogun = state.targetBogun[gr] || 0;
        const finalHours = totalHours - targetJeondam - targetBogun;
        
        return {
            gradeNum: idx + 1,
            total: totalHours,
            targetJeondam: targetJeondam,
            targetBogun: targetBogun,
            final: finalHours
        };
    });
    
    const tbody = document.getElementById('time-allocation-body');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td class="bg-blue-50 text-blue-800 font-bold text-left pl-3">주당 담임교사<br>수업시수</td>
            ${data.map(d => `<td class="font-bold text-blue-700">${d.total}</td>`).join('')}
        </tr>
        <tr>
            <td class="bg-pink-50 text-pink-800 font-bold text-left pl-3">학급당 교과전담<br>지원 시수</td>
            ${data.map(d => `<td><input type="number" min="0" step="0.5" value="${d.targetJeondam || ''}" placeholder="-" class="edit-input w-16 text-pink-600 font-bold" onchange="updateTargetJeondam(${d.gradeNum}, this.value)"></td>`).join('')}
        </tr>
        <tr>
            <td class="bg-green-50 text-green-800 font-bold text-left pl-3">보건 수업 지원</td>
            ${data.map(d => `<td><input type="number" min="0" step="0.5" value="${d.targetBogun || ''}" placeholder="-" class="edit-input w-16 text-green-600 font-bold" onchange="updateTargetBogun(${d.gradeNum}, this.value)"></td>`).join('')}
        </tr>
        <tr class="bg-gray-50">
            <td class="bg-indigo-100 text-indigo-900 font-bold text-left pl-3">교과전담 및 보건<br>수업 지원 포함<br>수업시수</td>
            ${data.map(d => `<td class="font-bold text-indigo-700 text-lg">${d.final}</td>`).join('')}
        </tr>
    `;
}

function renderCommonAllocations() {
    const caBody = document.getElementById('common-alloc-body');
    if (!caBody) return;
    
    sanitizeCommonAllocations();
    caBody.innerHTML = '';
    ['3학년','4학년','5학년','6학년'].forEach((gr, idx) => {
        const gradeNum = idx + 3;
        let list = getGradeAllocations(gr);
        
        let currentJeondam = 0;
        let currentBogun = 0;
        list.forEach(s => {
            const hrs = parseFloat(s.match(/\d+(\.\d+)?/)?.[0] || 0);
            if (s.includes('보건')) {
                currentBogun += hrs;
            } else {
                currentJeondam += hrs;
            }
        });
        
        const targetJeondam = state.targetJeondam[gr] || 0;
        const targetBogun = state.targetBogun[gr] || 0;
        const targetTotal = targetJeondam + targetBogun;
        const currentTotal = currentJeondam + currentBogun;
        
        // 완료 여부는 "전담 시수만" 기준으로 판단
        // (예: 5학년은 보건 0.5가 기본이므로 전담 6시간만 채워지면 완료로 표시)
        const completeTarget = targetJeondam;
        const completeCurrent = currentJeondam;
        const isComplete = completeCurrent >= completeTarget && completeTarget > 0;
        const statusClass = isComplete ? 'bg-green-100 text-green-700' : (targetTotal > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500');
        const statusText = targetTotal > 0 ? `${currentTotal}/${targetTotal}` : '-';

        let tags = list.map(s => `
            <span class="subject-chip">
                ${s} <i class="fa-solid fa-xmark del-btn" onclick="removeAlloc('${gr}', '${s}')"></i>
            </span>`).join('') || '<span class="text-gray-400 text-sm">없음</span>';
        // 보건만 전담 과목에서 제외 (시수만 반영)
        const excluded = new Set(['보건','체육(보건)']);
        if (gr === '5학년') excluded.add('체육');
        let selectOpts = SUBJECT_NAMES.filter(s => !excluded.has(s)).map(s => `<option value="${s}">${s}</option>`).join('');
        
        const remainJeondam = Math.max(0, targetJeondam - currentJeondam);
        const remainBogun = Math.max(0, targetBogun - currentBogun);
        
        caBody.innerHTML += `
            <tr class="border-b">
                <td class="p-2 border font-bold text-indigo-800">${gr}</td>
                <td class="p-2 border text-center font-bold ${statusClass}">${statusText}</td>
                <td class="p-2 border">
                    <div class="flex flex-wrap gap-1">${tags}</div>
                    ${remainJeondam > 0 || remainBogun > 0 ? `<div class="text-xs text-orange-500 mt-1">남은 시수: ${remainJeondam > 0 ? `전담 ${remainJeondam}` : ''}${remainJeondam > 0 && remainBogun > 0 ? ', ' : ''}${remainBogun > 0 ? `보건 ${remainBogun}` : ''}</div>` : ''}
                </td>
                <td class="p-2 border">
                    <div class="flex gap-1 justify-center">
                        <select id="sel-grade-${gradeNum}" class="border rounded p-1 text-sm bg-gray-50 w-24">${selectOpts}</select>
                        <input id="hrs-grade-${gradeNum}" type="number" min="0.5" step="0.5" value="2" class="border rounded p-1 text-sm w-16 text-center">
                        <button class="bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700 whitespace-nowrap" onclick="addAlloc(${gradeNum})">추가</button>
                    </div>
                </td>
            </tr>`;
    });
}

// 이벤트 핸들러
window.updateTargetJeondam = function(gradeNum, val) {
    const gr = `${gradeNum}학년`;
    state.targetJeondam[gr] = parseFloat(val) || 0;
    saveData({targetJeondam: state.targetJeondam});
    renderTab0();
};

window.updateTargetBogun = function(gradeNum, val) {
    const gr = `${gradeNum}학년`;
    state.targetBogun[gr] = parseFloat(val) || 0;
    saveData({targetBogun: state.targetBogun});
    renderTab0();
};

window.updateDailyCount = function(gr, idx, val) { 
    state.dailyCounts[gr][idx] = parseInt(val) || 0; 
    saveData({dailyCounts: state.dailyCounts}); 
    renderTab0(); 
};

window.updateClassConfig = function(gr, val) { 
    let n = parseInt(val); 
    if(n > 0) { 
        state.config[gr].classes = n; 
        initTimetables(); 
        saveData({config: state.config}); 
        renderTab0(); 
    } 
};

window.updateCurriculum = function(gr, s, v) { 
    state.curriculum[gr][s] = parseInt(v) || 0; 
    saveData({curriculum: state.curriculum}); 
};

window.addAlloc = function(gradeNum) {
    const gr = `${gradeNum}학년`;
    const selEl = document.getElementById(`sel-grade-${gradeNum}`);
    const hrsEl = document.getElementById(`hrs-grade-${gradeNum}`);
    
    if (!selEl || !hrsEl) return;
    
    const subj = selEl.value;
    const hrs = hrsEl.value;
    
    if(!subj || !hrs) {
        showAlert("과목과 시수를 입력하세요.");
        return;
    }
    
    // 보건/5학년 체육은 전담 과목에서 제외
    if (subj === '보건' || subj === '체육(보건)' || (gradeNum === 5 && subj === '체육')) {
        showAlert(gradeNum === 5 && subj === '체육' 
            ? "5학년 체육은 보건 시수로만 관리됩니다.<br>전담 과목에서 제외됩니다."
            : "보건은 전담 과목으로 추가할 수 없습니다.<br>시수만 반영됩니다.");
        return;
    }
    
    const val = `${subj}(${hrs})`;
    if(!state.allocations.common[gr]) state.allocations.common[gr] = [];
    
    const exists = state.allocations.common[gr].some(s => s.startsWith(subj + '('));
    if(exists) {
        showAlert(`${subj}는 이미 추가되어 있습니다.`);
        return;
    }
    
    state.allocations.common[gr].push(val);
    saveData({allocations: state.allocations});
    renderTab0();
};

window.removeAlloc = function(gr, val) {
    if(!state.allocations.common[gr]) return;
    state.allocations.common[gr] = state.allocations.common[gr].filter(x => x !== val);
    saveData({allocations: state.allocations});
    renderTab0();
};

