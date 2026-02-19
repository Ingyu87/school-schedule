// Tab 2: 교과전담 교사별 시간표

function renderTab2() {
    renderSpecialSupport();
    renderTeacherSetup();
    renderTeacherCompletionPanel();
}

function isTeacherCompleted(idx) {
    return !!state.teachers?.[idx]?.completed;
}

function renderTeacherCompletionPanel() {
    const panel = document.getElementById('teacher-completion-panel');
    const summary = document.getElementById('teacher-completion-summary');
    if (!panel || !summary) return;
    
    panel.innerHTML = '';
    
    const totalTeachers = state.teachers.length;
    const completedTeachers = state.teachers.filter(t => t.completed).length;
    
    summary.innerHTML = `<span class="${completedTeachers === totalTeachers ? 'text-green-600' : 'text-orange-600'}">${completedTeachers} / ${totalTeachers} 완료</span>`;
    
    state.teachers.forEach((t, idx) => {
        const statusClass = t.completed ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-600';
        const icon = t.completed ? '<i class="fa-solid fa-check text-green-600 mr-1"></i>' : '<i class="fa-regular fa-square mr-1"></i>';
        
        panel.innerHTML += `
            <div class="px-3 py-2 rounded border ${statusClass} text-sm font-bold flex items-center justify-center">
                ${icon}${t.name}
            </div>`;
    });
}

window.toggleTeacherCompletion = function(idx) {
    state.teachers[idx].completed = !state.teachers[idx].completed;
    saveData({ teachers: state.teachers });
    renderTab2();
    updateTabAccessibility();
};

function renderSpecialSupport() {
    const list = document.getElementById('special-support-list');
    if (!list) return;
    
    list.innerHTML = '';
    (state.specialSupport || []).forEach((s, idx) => {
        const canSplit = s.hours > 1 && s.hours % 0.5 === 0; // 1시간 초과이고 0.5의 배수일 때만 나누기 가능
        const splitBtn = canSplit ? 
            `<i class="fa-solid fa-code-branch ml-2 cursor-pointer hover:text-blue-500" onclick="splitSpecialSupport(${idx})" title="시수 나누기"></i>` : '';
        list.innerHTML += `
            <span class="inline-flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                ${s.grade}-${s.classNum}반 ${s.subject}(${s.hours}h)
                ${splitBtn}
                <i class="fa-solid fa-xmark ml-2 cursor-pointer hover:text-red-500" onclick="removeSpecialSupport(${idx})"></i>
            </span>`;
    });
}

window.updateSpecialClassOptions = function() {
    const gradeNum = document.getElementById('special-grade-sel').value;
    const classSel = document.getElementById('special-class-sel');
    const subjSel = document.getElementById('special-subj-sel');
    
    classSel.innerHTML = '<option value="">반</option>';
    subjSel.innerHTML = '<option value="">과목</option>';
    
    if (!gradeNum) return;
    
    const gr = gradeNum + '학년';
    const classCount = state.config[gr]?.classes || 0;
    
    for (let i = 1; i <= classCount; i++) {
        classSel.innerHTML += `<option value="${i}">${i}반</option>`;
    }
    
    const curriculum = state.curriculum[gr] || {};
    Object.keys(curriculum).forEach(subj => {
        // 보건만 특수부장 지원 과목에서 제외 (시수만 반영)
        if (curriculum[subj] > 0 && subj !== '보건') {
            subjSel.innerHTML += `<option value="${subj}">${subj}</option>`;
        }
    });
};

window.addSpecialSupport = function() {
    const gradeNum = document.getElementById('special-grade-sel').value;
    const classNum = document.getElementById('special-class-sel').value;
    const subject = document.getElementById('special-subj-sel').value;
    const hours = parseFloat(document.getElementById('special-hrs-input').value) || 1;
    
    if (!gradeNum || !classNum || !subject) {
        showAlert('학년, 반, 과목을 모두 선택하세요.');
        return;
    }
    
    // 보건만 특수부장 지원 과목에서 제외 (시수만 반영)
    if (subject === '보건') {
        showAlert('보건은 특수부장 지원 과목으로 추가할 수 없습니다.<br>시수만 반영됩니다.');
        return;
    }
    
    if (!state.specialSupport) state.specialSupport = [];
    
    // 같은 학년-반-과목 조합을 여러 번 추가 가능 (여러 교사가 나눠서 담당)
    state.specialSupport.push({ grade: gradeNum, classNum: parseInt(classNum), subject, hours });
    saveData({ specialSupport: state.specialSupport });
    
    // 모든 전담 교사의 드롭다운 업데이트
    state.teachers.forEach((t, idx) => {
        populateTeacherAssignmentOptions(idx);
    });
    
    renderTab2();
};

window.removeSpecialSupport = function(idx) {
    state.specialSupport.splice(idx, 1);
    saveData({ specialSupport: state.specialSupport });
    
    // 모든 전담 교사의 드롭다운 업데이트
    state.teachers.forEach((t, tidx) => {
        populateTeacherAssignmentOptions(tidx);
    });
    
    renderTab2();
};

window.splitSpecialSupport = function(idx) {
    const item = state.specialSupport[idx];
    if (!item || item.hours <= 1) return;
    
    const splitHours = item.hours / 2;
    
    // 원본 항목 삭제
    state.specialSupport.splice(idx, 1);
    
    // 나눈 시수로 2개 항목 추가
    state.specialSupport.push({
        grade: item.grade,
        classNum: item.classNum,
        subject: item.subject,
        hours: splitHours
    });
    state.specialSupport.push({
        grade: item.grade,
        classNum: item.classNum,
        subject: item.subject,
        hours: splitHours
    });
    
    saveData({ specialSupport: state.specialSupport });
    
    // 모든 전담 교사의 드롭다운 업데이트
    state.teachers.forEach((t, tidx) => {
        populateTeacherAssignmentOptions(tidx);
    });
    
    renderTab2();
};


// 교사의 목표 시수 가져오기
function getTeacherTargetHours(teacherIdx) {
    if (state.teacherConfig && state.teacherConfig.teachers && state.teacherConfig.teachers[teacherIdx]) {
        return state.teacherConfig.teachers[teacherIdx].targetHours || 21;
    }
    return 21; // 기본값
}

function renderTeacherSetup() {
    const container = document.getElementById('teacher-setup-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    state.teachers.forEach((t, idx) => {
        if (!t.assignments) t.assignments = [];
        
        let totalHours = t.assignments.reduce((sum, a) => sum + (a.hours || 0), 0);
        const isCompleted = isTeacherCompleted(idx);
        
        // 0번 탭에서 설정한 목표 시수 가져오기
        const targetHours = getTeacherTargetHours(idx);
        
        const badges = t.assignments.map((a, aIdx) => {
            const bgClass = a.isSpecial ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700';
            const displaySubj = a.subject.replace('[특수]', '');
            const removeIcon = isCompleted ? '' : `<i class="fa-solid fa-xmark ml-1 cursor-pointer hover:text-red-500" onclick="removeTeacherAssignment(${idx}, ${aIdx})"></i>`;
            return `
                <span class="inline-flex items-center ${bgClass} px-2 py-1 rounded text-xs mr-1 mb-1">
                    ${a.isSpecial ? '⭐' : ''}${a.grade}-${a.classNum} ${displaySubj}(${a.hours}h)
                    ${removeIcon}
                </span>`;
        }).join('');
        
        const statusClass = totalHours === targetHours ? 'bg-green-100 text-green-700' : 
                           totalHours > targetHours ? 'bg-red-100 text-red-700' : 
                           'bg-orange-100 text-orange-700';
        
        const completedCheck = t.completed ? 'checked' : '';
        const completedBadge = t.completed ? 
            '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded ml-2"><i class="fa-solid fa-check mr-1"></i>완료</span>' : '';
        const nameDisabled = isCompleted ? 'disabled' : '';
        const nameClass = isCompleted ? 'opacity-60 cursor-not-allowed' : '';
        const btnDisabled = isCompleted ? 'disabled' : '';
        const btnClass = isCompleted ? 'disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed' : '';
        
        container.innerHTML += `
            <div class="bg-white rounded-lg border p-4">
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-2">
                        <input class="font-bold text-lg border-b-2 border-gray-200 w-28 outline-none focus:border-indigo-500 ${nameClass}" 
                               value="${t.name}" onchange="updTName(${idx},this.value)" ${nameDisabled}>
                        ${completedBadge}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-bold px-2 py-1 rounded ${statusClass}">${totalHours}/${targetHours}시간</span>
                        <button onclick="downloadTeacherExcel(${idx})" ${t.completed ? '' : 'disabled'} class="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed" title="시간표 저장 (완료 후 활성화)">
                            <i class="fa-solid fa-file-excel mr-1"></i>저장
                        </button>
                        <label class="flex items-center cursor-pointer bg-green-50 border border-green-300 px-3 py-1 rounded text-sm hover:bg-green-100">
                            <input type="checkbox" ${completedCheck} onchange="toggleTeacherCompletion(${idx})" class="mr-2">
                            <span class="text-green-700 font-bold">완료</span>
                        </label>
                        <button onclick="resetTeacherAssignments(${idx})" ${btnDisabled} class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs hover:bg-gray-200 ${btnClass}" title="배정 초기화">
                            <i class="fa-solid fa-rotate-left"></i>
                        </button>
                        <button onclick="resetTeacherSchedule(${idx})" ${btnDisabled} class="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs hover:bg-orange-100 ${btnClass}" title="시간표 초기화">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                        </button>
                        <button onclick="resetTeacherAll(${idx})" ${btnDisabled} class="bg-red-50 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-100 ${btnClass}" title="교사 전체 초기화">
                            <i class="fa-solid fa-eraser"></i>
                        </button>
                        <button onclick="toggleTeacherTimetable(${idx})" class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                            <i class="fa-solid fa-calendar mr-1"></i>시간표
                        </button>
                        <button onclick="removeTeacher(${idx})" ${btnDisabled} class="text-gray-400 hover:text-red-500 ${btnClass}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="flex flex-wrap mb-3 min-h-[32px]">${badges || '<span class="text-gray-400 text-sm">배정된 과목 없음</span>'}</div>
                
                <div class="border-t pt-3">
                    <div class="text-xs font-bold text-gray-600 mb-2">배정할 과목 클릭 (학급 시간표처럼)</div>
                    <div id="t${idx}-assignments" class="max-h-48 overflow-y-auto border rounded p-2 bg-gray-50 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1"></div>
                </div>
            </div>`;
    });
    
    // 각 교사의 드롭다운 옵션 채우기
    state.teachers.forEach((t, idx) => {
        populateTeacherAssignmentOptions(idx);
    });
}

function populateTeacherAssignmentOptions(idx) {
    const container = document.getElementById(`t${idx}-assignments`);
    if (!container) return;
    
    container.innerHTML = '';
    
    // 이미 배정된 항목들 (중복 방지용)
    const assigned = new Set();
    const isCompleted = isTeacherCompleted(idx);
    state.teachers.forEach(t => {
        (t.assignments || []).forEach(a => {
            assigned.add(`${a.grade}-${a.classNum}-${a.subject}`);
        });
    });
    
    // 2~6학년 순회
    [1, 2, 3, 4, 5, 6].forEach(gradeNum => {
        const gr = `${gradeNum}학년`;
        const classCount = state.config[gr]?.classes || 0;
        
        // 일반 전담 과목
        const allocs = getGradeAllocations(gr);
        allocs.forEach(allocStr => {
            const subjName = allocStr.split('(')[0];
            const hours = parseFloat(allocStr.match(/\(([\d.]+)\)/)?.[1] || 0);
            
            // 보건 제외
            if (subjName.includes('보건')) return;
            
            // 각 반에 대해 체크박스 생성
            for (let c = 1; c <= classCount; c++) {
                const key = `${gradeNum}-${c}-${subjName}`;
                const isAssigned = assigned.has(key);
                const disabled = (isAssigned || isCompleted) ? 'disabled' : '';
                const opacityClass = (isAssigned || isCompleted) ? 'opacity-40' : '';
                const label = isAssigned ? 
                    `${gradeNum}-${c} ${subjName} (${hours}h) ✓` :
                    `${gradeNum}-${c} ${subjName} (${hours}h)`;
                
                container.innerHTML += `
                    <button onclick="toggleTeacherAssignment(${idx}, '${key}', ${hours}, false)" ${disabled}
                            data-key="${key}"
                            class="text-left p-2 text-xs border rounded hover:bg-indigo-50 transition-colors ${opacityClass} ${(isAssigned || isCompleted) ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'}">
                        ${label}
                    </button>`;
            }
        });
        
        // 특수부장 과목 (배열 인덱스 포함하여 각 항목을 고유하게 식별)
        (state.specialSupport || []).forEach((sp, spIdx) => {
            if (sp.grade == gradeNum) {
                const key = `${gradeNum}-${sp.classNum}-[특수]${sp.subject}|${spIdx}`;
                // 현재 교사가 이미 이 특수부장 지원 항목을 배정받았는지 확인
                const currentTeacher = state.teachers[idx];
                const isAssigned = (currentTeacher.assignments || []).some(a => 
                    a.grade == sp.grade && 
                    a.classNum == sp.classNum && 
                    a.subject === `[특수]${sp.subject}` &&
                    a.specialSupportIndex === spIdx
                );
                const disabled = (isAssigned || isCompleted) ? 'disabled' : '';
                const opacityClass = (isAssigned || isCompleted) ? 'opacity-40' : '';
                const label = isAssigned ?
                    `⭐${gradeNum}-${sp.classNum} ${sp.subject} (${sp.hours}h) ✓` :
                    `⭐${gradeNum}-${sp.classNum} ${sp.subject} (${sp.hours}h)`;
                
                container.innerHTML += `
                    <button onclick="toggleTeacherAssignment(${idx}, '${key}', ${sp.hours}, true)" ${disabled}
                            data-key="${key}"
                            class="text-left p-2 text-xs border rounded hover:bg-yellow-50 transition-colors ${opacityClass} ${(isAssigned || isCompleted) ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'}">
                        ${label}
                    </button>`;
            }
        });
    });
    
    if (container.innerHTML === '') {
        container.innerHTML = '<div class="text-gray-400 text-sm text-center py-4">배정 가능한 과목이 없습니다.</div>';
    }
}

window.updateTeacherSubjectOptions = function(idx) {
    const gradeNum = document.getElementById(`t${idx}-grade`).value;
    const subjSel = document.getElementById(`t${idx}-subj`);
    const classSel = document.getElementById(`t${idx}-class`);
    
    subjSel.innerHTML = '<option value="">과목</option>';
    classSel.innerHTML = '<option value="">반</option>';
    
    if (!gradeNum) return;
    
    const gr = gradeNum + '학년';
    const allocs = getGradeAllocations(gr);
    
    // 일반 전담 과목 (보건 제외)
    allocs.forEach(s => {
        const name = s.split('(')[0];
        // 보건은 전담 시간표에 표시하지 않음
        if (name.includes('보건')) return;
        const hrs = parseFloat(s.match(/\(([\d.]+)\)/)?.[1] || 0);
        subjSel.innerHTML += `<option value="${name}" data-hours="${hrs}">${name} (${hrs}h/반)</option>`;
    });
    
    // 특수부장 지원 과목 추가
    const specialSubjects = new Set();
    (state.specialSupport || []).forEach(sp => {
        if (sp.grade == gradeNum) {
            const key = `[특수]${sp.subject}`;
            if (!specialSubjects.has(key)) {
                specialSubjects.add(key);
                subjSel.innerHTML += `<option value="${key}" data-hours="${sp.hours}" data-special="true">⭐${sp.subject} (${sp.hours}h/반)</option>`;
            }
        }
    });
};

window.updateTeacherClassOptions = function(idx) {
    const gradeNum = document.getElementById(`t${idx}-grade`).value;
    const subjSel = document.getElementById(`t${idx}-subj`);
    const subjVal = subjSel.value;
    const classSel = document.getElementById(`t${idx}-class`);
    const isSpecial = subjSel.options[subjSel.selectedIndex]?.dataset?.special === 'true';
    
    classSel.innerHTML = '<option value="">반</option>';
    
    if (!gradeNum || !subjVal) return;
    
    const gr = gradeNum + '학년';
    const classCount = state.config[gr]?.classes || 0;
    
    // 이미 배정된 반 확인 (같은 과목만 체크)
    const assignedClasses = new Set();
    state.teachers.forEach(t => {
        (t.assignments || []).forEach(a => {
            // 같은 과목이 배정된 반만 체크
            if (a.grade == gradeNum && a.subject === subjVal) {
                assignedClasses.add(a.classNum);
            }
        });
    });
    
    if (isSpecial) {
        // 특수부장 과목: 해당 과목이 설정된 반만 표시 (인덱스별로 구분)
        const realSubj = subjVal.replace('[특수]', '');
        (state.specialSupport || []).forEach((sp, spIdx) => {
            if (sp.grade == gradeNum && sp.subject === realSubj) {
                // 같은 특수부장 지원 항목(인덱스 포함)이 이미 배정되었는지 확인
                const alreadyAssigned = state.teachers.some(t => 
                    (t.assignments || []).some(a => 
                        a.grade == gradeNum && 
                        a.classNum == sp.classNum && 
                        a.subject === subjVal &&
                        a.specialSupportIndex === spIdx
                    )
                );
                const disabled = alreadyAssigned ? 'disabled' : '';
                const label = alreadyAssigned ? `${sp.classNum}반 (배정됨)` : `${sp.classNum}반`;
                classSel.innerHTML += `<option value="${sp.classNum}" data-spidx="${spIdx}" ${disabled}>${label}</option>`;
            }
        });
    } else {
        // 일반 전담 과목: 모든 반 표시 (다른 과목이 배정된 반은 OK)
        for (let i = 1; i <= classCount; i++) {
            // 같은 과목이 이미 배정되었는지만 확인
            const disabled = assignedClasses.has(i) ? 'disabled' : '';
            const label = assignedClasses.has(i) ? `${i}반 (배정됨)` : `${i}반`;
            classSel.innerHTML += `<option value="${i}" ${disabled}>${label}</option>`;
        }
    }
};

// 반 선택 시 자동 추가 기능 제거 - 추가 버튼을 눌러야만 반영됨
// window.onTeacherClassChange 함수 제거됨

window.toggleTeacherAssignment = function(idx, key, hours, isSpecial) {
    if (isTeacherCompleted(idx)) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    // 값 파싱: "3-1-영어" 또는 "4-2-[특수]과학" 또는 "2-4-[특수]통합|0" (특수부장 지원 인덱스 포함)
    const parts = key.split('-');
    if (parts.length < 3) return;
    
    const gradeNum = parseInt(parts[0]);
    const classNum = parseInt(parts[1]);
    let subjVal = parts.slice(2).join('-'); // "[특수]" 포함 가능
    let specialSupportIndex = null;
    // 특수부장 지원 인덱스 추출 (|0 형태)
    if (subjVal.includes('|')) {
        const parts2 = subjVal.split('|');
        subjVal = parts2[0];
        specialSupportIndex = parseInt(parts2[1]);
    }
    
    if (!state.teachers[idx].assignments) state.teachers[idx].assignments = [];
    
    // 이미 배정되어 있는지 확인 (특수부장 지원은 인덱스까지 비교)
    const existingIdx = state.teachers[idx].assignments.findIndex(a => {
        if (isSpecial && specialSupportIndex !== null) {
            // 특수부장 지원: 인덱스까지 비교
            return a.grade == gradeNum && a.classNum == classNum && a.subject === subjVal && a.specialSupportIndex === specialSupportIndex;
        } else {
            // 일반 전담: 인덱스 없이 비교
            return a.grade == gradeNum && a.classNum == classNum && a.subject === subjVal;
        }
    });
    
    if (existingIdx >= 0) {
        // 이미 있으면 제거
        state.teachers[idx].assignments.splice(existingIdx, 1);
    } else {
        // 없으면 추가
        const assignment = {
            grade: gradeNum,
            classNum: classNum,
            subject: subjVal,
            hours: hours,
            isSpecial: isSpecial
        };
        if (isSpecial && specialSupportIndex !== null) {
            assignment.specialSupportIndex = specialSupportIndex;
        }
        state.teachers[idx].assignments.push(assignment);
    }
    
    saveData({ teachers: state.teachers });
    
    // 모든 교사의 버튼 목록 다시 채우기 (중복 방지 반영)
    state.teachers.forEach((t, tIdx) => {
        populateTeacherAssignmentOptions(tIdx);
    });
    
    // renderTab2() 대신 필요한 부분만 업데이트
    // 1. 시수 재계산 및 업데이트
    const t = state.teachers[idx];
    const totalHours = t.assignments.reduce((sum, a) => sum + (a.hours || 0), 0);
    const statusEl = document.querySelector(`#teacher-setup-list > div:nth-child(${idx + 1}) .text-sm.font-bold.px-2`);
    if (statusEl) {
        const targetHrs = getTeacherTargetHours(idx);
        const statusClass = totalHours === targetHrs ? 'bg-green-100 text-green-700' : 
                           totalHours > targetHrs ? 'bg-red-100 text-red-700' : 
                           'bg-orange-100 text-orange-700';
        statusEl.className = `text-sm font-bold px-2 py-1 rounded ${statusClass}`;
        statusEl.textContent = `${totalHours}/${targetHrs}시간`;
    }
    
    // 2. 배정 목록(badges) 전체 다시 그리기
    const badgesContainer = document.querySelector(`#teacher-setup-list > div:nth-child(${idx + 1}) .flex.flex-wrap.mb-3`);
    if (badgesContainer) {
        badgesContainer.innerHTML = '';
        
        t.assignments.forEach((a, aIdx) => {
            const bgClass = a.isSpecial ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700';
            const displaySubj = a.subject.replace('[특수]', '');
            const removeIcon = isTeacherCompleted(idx) ? '' : `<i class="fa-solid fa-xmark ml-1 cursor-pointer hover:text-red-500" onclick="removeTeacherAssignment(${idx}, ${aIdx})"></i>`;
            const badgeHtml = `
                <span class="inline-flex items-center ${bgClass} px-2 py-1 rounded text-xs mr-1 mb-1">
                    ${a.isSpecial ? '⭐' : ''}${a.grade}-${a.classNum} ${displaySubj}(${a.hours}h)
                    ${removeIcon}
                </span>`;
            badgesContainer.insertAdjacentHTML('beforeend', badgeHtml);
        });
        
        if (t.assignments.length === 0) {
            badgesContainer.innerHTML = '<span class="text-gray-400 text-sm">배정된 과목 없음</span>';
        }
    }
};

window.removeTeacherAssignment = function(teacherIdx, assignIdx) {
    if (isTeacherCompleted(teacherIdx)) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    state.teachers[teacherIdx].assignments.splice(assignIdx, 1);
    saveData({ teachers: state.teachers });
    renderTab2();
};

window.resetTeacherAssignments = function(idx) {
    if (isTeacherCompleted(idx)) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    const t = state.teachers[idx];
    if (!t) return;
    
    showConfirm(`${t.name} 선생님의 배정을 모두 초기화하시겠습니까?`, () => {
        t.assignments = [];
        saveData({ teachers: state.teachers });
        
        // 모든 교사의 버튼 목록 다시 채우기
        state.teachers.forEach((teacher, tIdx) => {
            populateTeacherAssignmentOptions(tIdx);
        });
        
        // 시수 표시 업데이트
        const statusEl = document.querySelector(`#teacher-setup-list > div:nth-child(${idx + 1}) .text-sm.font-bold.px-2`);
        if (statusEl) {
            statusEl.className = 'text-sm font-bold px-2 py-1 rounded bg-orange-100 text-orange-700';
            const targetHrs = getTeacherTargetHours(idx);
            statusEl.textContent = `0/${targetHrs}시간`;
        }
        
        // 배정 목록 초기화
        const badgesContainer = document.querySelector(`#teacher-setup-list > div:nth-child(${idx + 1}) .flex.flex-wrap.mb-3`);
        if (badgesContainer) {
            badgesContainer.innerHTML = '<span class="text-gray-400 text-sm">배정된 과목 없음</span>';
        }
    });
};

window.resetTeacherAll = function(idx) {
    if (isTeacherCompleted(idx)) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    const t = state.teachers[idx];
    if (!t) return;
    
    showConfirm(`${t.name} 선생님 정보를 전체 초기화하시겠습니까?`, () => {
        t.assignments = [];
        t.schedule = grid(7, 5);
        t.completed = false;
        saveData({ teachers: state.teachers });
        renderTab2();
        renderTeacherTimetables();
        updateTabAccessibility();
    });
};

function renderTeacherTimetables() {
    const tv = document.getElementById('teacher-timetables-view');
    if (!tv) return;
    tv.innerHTML = '';
    
    const teacherPeriodLabels = getPeriodLabels();
    const lowerTimes = state.scheduleTimes?.lower || {};
    const upperTimes = state.scheduleTimes?.upper || {};
    const facPeriodKeys = ['1교시','2교시','3교시','4교시','4교시','5교시','6교시'];
    
    state.teachers.forEach((t, idx) => {
        if (!t.schedule || !Array.isArray(t.schedule)) {
            t.schedule = grid(7,5);
        }
        migrateTeacherSchedule(t);
        
        // 배정된 반-과목별 시수 계산 (보건 제외)
        const classHours = {}; // { "3-1": { "영어": { target: 2, current: 0 }, ... }, ... }
        (t.assignments || []).forEach(a => {
            const displaySubj = a.subject.replace('[특수]', '');
            // 보건은 시간표에 표시하지 않음
            if (displaySubj.includes('보건')) return;
            
            const classKey = `${a.grade}-${a.classNum}`;
            if (!classHours[classKey]) classHours[classKey] = {};
            classHours[classKey][displaySubj] = { 
                target: a.hours, 
                current: 0,
                isSpecial: a.isSpecial 
            };
        });
        
        // 현재 시간표에서 각 반별 사용 시수 카운트 (과목별로)
        if (t.schedule) {
            t.schedule.forEach(row => {
                row.forEach(cell => {
                    if (!cell) return;
                    const entries = parseScheduleEntries(cell);
                    entries.forEach(entry => {
                        const classKey = entry.classKey;
                        const subjects = classHours[classKey];
                        if (!subjects) return;
                        if (entry.subject && subjects[entry.subject]) {
                            subjects[entry.subject].current++;
                        } else {
                            const keys = Object.keys(subjects);
                            if (!keys.length) return;
                            const targetSubj = keys.find(subj => subjects[subj].current < subjects[subj].target) || keys[0];
                            subjects[targetSubj].current++;
                        }
                    });
                });
            });
        }
        
        const targetHrs = getTeacherTargetHours(idx);
        let scheduleHrs = 0;
        Object.keys(classHours).forEach(classKey => {
            Object.values(classHours[classKey]).forEach(ch => {
                scheduleHrs += ch.current;
            });
        });
        
        // 교사 담당 정보 요약 (학년/과목)
        const teacherInfo = {};
        (t.assignments || []).forEach(a => {
            const displaySubj = a.subject.replace('[특수]', '');
            if (displaySubj.includes('보건')) return;
            const key = `${a.grade}학년`;
            if (!teacherInfo[key]) teacherInfo[key] = new Set();
            teacherInfo[key].add(displaySubj);
        });
        const infoText = Object.keys(teacherInfo).map(gr => {
            const subjs = Array.from(teacherInfo[gr]).join(', ');
            return `${gr} ${subjs}`;
        }).join(' / ') || '배정 없음';
        
        // 팔레트 HTML 생성 (과목별로 구분)
        let paletteHtml = '';
        Object.keys(classHours).sort().forEach(classKey => {
            const subjects = classHours[classKey];
            Object.keys(subjects).sort().forEach(subj => {
                const ch = subjects[subj];
                const isDone = ch.current >= ch.target;
                const isOver = ch.current > ch.target;
            const bgClass = isOver ? 'bg-red-100 text-red-700 border-red-300' : 
                               isDone ? 'bg-green-100 text-green-700 border-green-300' : 
                               'bg-gray-50 text-gray-700 border-gray-200';
                const icon = ch.isSpecial ? '⭐' : '';
            const paletteLocked = isTeacherCompleted(idx);
            const paletteClass = paletteLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80';
            const paletteOnClick = paletteLocked ? '' : `onclick="selectTeacherClass(${idx}, '${classKey}', '${subj}')"`;
                paletteHtml += `
                    <div class="inline-flex items-center px-2 py-1 rounded border text-xs ${bgClass} ${paletteClass} mb-1" 
                         ${paletteOnClick}
                         title="${subj}">
                        ${icon}<span class="font-bold">${classKey}</span> <span class="text-gray-600 ml-1">${subj}</span> <span class="ml-1 font-bold">${ch.current}/${ch.target}</span>
                    </div>`;
            });
        });
        
        const gridId = `teacher-${idx}`;
        let gridHtml = '';
        const isCompleted = isTeacherCompleted(idx);
        for(let r = 0; r < 7; r++) {
            const rowClass = (r === 3) ? 'bg-pink-50' : (r === 4) ? 'bg-indigo-50' : 'bg-gray-50';
            let facTime = '';
            if (r === 3) facTime = upperTimes['4교시'] || '';
            else if (r === 4) facTime = lowerTimes['4교시'] || '';
            else facTime = lowerTimes[facPeriodKeys[r]] || '';
            const timeHtml = facTime ? `<br><span class="text-[10px] text-gray-400 font-normal">${facTime}</span>` : '';
            gridHtml += `<tr><td class="${rowClass} font-bold text-xs">${teacherPeriodLabels[r]}${timeHtml}</td>`;
            for(let c = 0; c < 5; c++) {
                const val = t.schedule[r][c] || '';
                const parsedEntries = parseScheduleEntries(val);
                
                // 해당 셀에 입력된 반이 초과인지 확인 (과목별로)
                let cellClass = '';
                if (parsedEntries.length) {
                    const hasOverflow = parsedEntries.some(entry => {
                        const classInfo = classHours[entry.classKey];
                        if (!classInfo) return false;
                        if (entry.subject && classInfo[entry.subject]) {
                            return classInfo[entry.subject].current > classInfo[entry.subject].target;
                        }
                        return Object.values(classInfo).some(ch => ch.current > ch.target);
                    });
                    if (hasOverflow) cellClass = 'bg-red-50';
                }
                const cellLocked = isCompleted ? 'cell-locked' : '';
                const cellHover = isCompleted ? '' : 'cursor-pointer hover:bg-indigo-50';
                const cellOnClick = isCompleted ? '' : `onclick="clickTeacherCell(${idx}, ${r}, ${c})"`;
                gridHtml += `<td class="${cellClass} ${cellHover} ${cellLocked} h-9" ${cellOnClick}>
                    <div class="w-full h-9 text-center text-sm font-medium flex items-center justify-center">${val || ''}</div>
                </td>`;
            }
            gridHtml += '</tr>';
        }
        
        tv.innerHTML += `
            <div class="border rounded-lg overflow-hidden bg-white">
                <div class="bg-gray-100 px-3 py-2">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="font-bold text-gray-800 text-lg">${t.name}</span>
                            <span class="text-xs text-gray-600 ml-2">(${infoText})</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-sm px-2 py-1 rounded font-bold ${scheduleHrs>=targetHrs && targetHrs > 0 ?'bg-green-100 text-green-700':'bg-orange-100 text-orange-700'}">${scheduleHrs}/${targetHrs}시간</span>
                            <button onclick="resetTeacherSchedule(${idx})" ${isTeacherCompleted(idx) ? 'disabled' : ''} class="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded disabled:text-gray-400 disabled:cursor-not-allowed">
                                <i class="fa-solid fa-rotate-left"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="flex">
                    <div class="flex-1">
                        <table class="base-table">
                            <thead><tr><th class="w-12 text-xs">교시</th><th class="text-xs">월</th><th class="text-xs">화</th><th class="text-xs">수</th><th class="text-xs">목</th><th class="text-xs">금</th></tr></thead>
                            <tbody>${gridHtml}</tbody>
                        </table>
                    </div>
                    <div class="w-56 border-l p-2 bg-gray-50">
                        <div class="text-xs font-bold text-gray-600 mb-2">📋 담당 반 (클릭하여 입력)</div>
                        <div class="flex flex-col gap-1" id="teacher-palette-${idx}">
                            ${paletteHtml || '<span class="text-gray-400 text-xs">배정된 반 없음</span>'}
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

// 선택된 교사/반/과목 저장
let selectedTeacherClass = { teacherIdx: null, classKey: null, subject: null };

window.selectTeacherClass = function(teacherIdx, classKey, subject) {
    if (isTeacherCompleted(teacherIdx)) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    selectedTeacherClass = { teacherIdx, classKey, subject };
    
    // 선택 상태 저장 (렌더링 후에도 유지)
    if (!window.teacherPaletteSelections) window.teacherPaletteSelections = {};
    window.teacherPaletteSelections[teacherIdx] = { classKey, subject };
    
    // 모든 팔레트 아이템 선택 해제
    document.querySelectorAll('[id^="teacher-palette-"] > div').forEach(el => {
        el.classList.remove('ring-2', 'ring-purple-500', 'border-purple-400');
    });
    
    // 현재 선택된 아이템 하이라이트 (보라색 테두리)
    const palette = document.getElementById(`teacher-palette-${teacherIdx}`);
    if (palette) {
        palette.querySelectorAll('div').forEach(el => {
            // onclick 속성에서 classKey와 subject 확인
            const onclickAttr = el.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`'${classKey}'`) && onclickAttr.includes(`'${subject}'`)) {
                el.classList.add('ring-2', 'ring-purple-500', 'border-purple-400');
            }
        });
    }
};

// 전담 시간표 셀 직접 입력 처리
window.onTeacherCellInput = function(teacherIdx, r, c, value) {
    if (isTeacherCompleted(teacherIdx)) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    const t = state.teachers[teacherIdx];
    if (!t.schedule) t.schedule = grid(7,5);
    
    // 입력값 파싱
    const entries = parseScheduleEntries(value);
    
    // 각 엔트리에 대해 과목 자동 추가
    const updatedEntries = entries.map(entry => {
        if (entry.subject) return entry; // 이미 과목이 있으면 그대로
        
        // 해당 반에 배정된 과목 찾기
        const assignment = (t.assignments || []).find(a => {
            const displaySubj = a.subject.replace('[특수]', '');
            return a.grade == parseInt(entry.classKey.split('-')[0]) && 
                   a.classNum == parseInt(entry.classKey.split('-')[1]);
        });
        
        if (assignment) {
            const displaySubj = assignment.subject.replace('[특수]', '');
            return { classKey: entry.classKey, subject: displaySubj };
        }
        
        return entry;
    });
    
    t.schedule[r][c] = updatedEntries.length ? formatScheduleEntries(updatedEntries) : '';
    saveData({teachers: state.teachers});
    
    const savedClass = selectedTeacherClass.classKey;
    const savedSubj = selectedTeacherClass.subject;
    const savedTeacher = selectedTeacherClass.teacherIdx;
    
    renderTeacherTimetables();
    
    if (savedClass && savedSubj) {
        setTimeout(() => {
            selectTeacherClass(savedTeacher, savedClass, savedSubj);
        }, 0);
    }
};

// 전담 교사 시간표 셀 키보드 핸들러
window.handleTeacherCellKeydown = function(e, teacherIdx, r, c) {
    if (isTeacherCompleted(teacherIdx)) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const t = state.teachers[teacherIdx];
        if (!t.schedule) t.schedule = grid(7,5);
        t.schedule[r][c] = '';
        saveData({teachers: state.teachers});
        
        const modal = document.getElementById('teacher-timetable-modal');
        if (modal) {
            modal.remove();
            toggleTeacherTimetable(teacherIdx);
        }
    }
};

window.clickTeacherCell = function(teacherIdx, r, c, event) {
    if (isTeacherCompleted(teacherIdx)) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    const t = state.teachers[teacherIdx];
    if (!t.schedule) t.schedule = grid(7,5);
    
    let currentEntries = parseScheduleEntries(t.schedule[r][c] || '');
    const hasSelection = selectedTeacherClass.teacherIdx === teacherIdx && selectedTeacherClass.classKey;
    const setCell = (entries) => {
        t.schedule[r][c] = entries.length ? formatScheduleEntries(entries) : '';
    };
    
    if (hasSelection) {
        const classKey = selectedTeacherClass.classKey;
        const subject = selectedTeacherClass.subject || null;
        
        const sameEntryIdx = currentEntries.findIndex(entry => 
            entry.classKey === classKey && (subject ? entry.subject === subject : true)
        );
        
        if (sameEntryIdx >= 0) {
            // 같은 반-과목이면 삭제
            currentEntries.splice(sameEntryIdx, 1);
        } else {
            // 한 시간에 두 개 클래스는 불가능 (시설 시간표만 가능)
            // 기존에 두 개 클래스가 있으면 모두 지우고 새로 추가
            if (currentEntries.length > 1) {
                // 두 개 이상이면 모두 지우고 새로 추가
                currentEntries = [];
            } else if (currentEntries.length === 1) {
                // 한 개가 있으면 지우고 새로 추가
                currentEntries = [];
            }
            
            // 충돌 확인
            const conflict = checkAllConflicts(classKey, r, c, 'teacher', teacherIdx);
            if (conflict) {
                showAlert(conflict);
                return;
            }
            
            if (subject) {
                const assignment = (t.assignments || []).find(a => {
                    const displaySubj = a.subject.replace('[특수]', '');
                    return a.grade == parseInt(classKey.split('-')[0]) && 
                           a.classNum == parseInt(classKey.split('-')[1]) &&
                           displaySubj === subject;
                });
                if (assignment) {
                    let currentHours = 0;
                    t.schedule.forEach(row => {
                        row.forEach(cell => {
                            parseScheduleEntries(cell).forEach(entry => {
                                if (entry.classKey === classKey) {
                                    if (!entry.subject || entry.subject === subject) {
                                        currentHours++;
                                    }
                                }
                            });
                        });
                    });
                    if (currentHours >= assignment.hours) {
                        showAlert(`${classKey} ${subject}은(는) 이미 ${assignment.hours}시간이 모두 배정되었습니다.`);
                        return;
                    }
                }
            }
            
            // 한 개만 추가
            currentEntries.push({ classKey, subject });
        }
        
        setCell(currentEntries);
    } else if (currentEntries.length) {
        setCell([]);
    } else {
        const firstAssignment = t.assignments?.[0];
        if (firstAssignment) {
            const displaySubj = firstAssignment.subject.replace('[특수]', '');
            if (!displaySubj.includes('보건')) {
                const classKey = `${firstAssignment.grade}-${firstAssignment.classNum}`;
                selectTeacherClass(teacherIdx, classKey, displaySubj);
                showAlert(`"${classKey} ${displaySubj}"이(가) 선택되었습니다.<br>셀을 다시 클릭하세요.`, 'info');
            }
        } else {
            showAlert('먼저 위에서 담당 반을 배정하세요.');
        }
        return;
    }
    
    saveData({teachers: state.teachers});
    
    // 모달에서 시간표 업데이트
    const modal = document.getElementById('teacher-timetable-modal');
    if (modal) {
        // 모달이 열려있으면 다시 그리기
        modal.remove();
        toggleTeacherTimetable(teacherIdx);
    }
};


window.updTName = function(i, n) { 
    if (isTeacherCompleted(i)) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    state.teachers[i].name = n; 
    saveData({teachers: state.teachers}); 
    renderTab2(); 
};

function checkAllConflicts(classKey, row, col, source, sourceIdx) {
    const entries = classKey.split('/').map(x => {
        const match = x.trim().match(/^(\d+-\d+)/);
        return match ? match[1] : x.trim();
    }).filter(x => x);
    
    for (const cls of entries) {
        const gradeNum = parseInt(cls.split('-')[0]);
        if (isNaN(gradeNum)) continue;
        
        // 4교시 그룹 검증: upper 4교시(row 3)에 lower 그룹 학년 배정 금지, 반대도
        if (row === 3 && isLowerGroup(gradeNum)) {
            const upperLabel = getUpperGradeLabel();
            return `${cls}은(는) 이 행(4교시-${upperLabel})에 배정할 수 없습니다. 아래 행에 입력하세요.`;
        }
        if (row === 4 && !isLowerGroup(gradeNum)) {
            const lowerLabel = getLowerGradeLabel();
            return `${cls}은(는) 이 행(4교시-${lowerLabel})에 배정할 수 없습니다. 위 행에 입력하세요.`;
        }
        
        // 교사 시간표 행 === 시설 시간표 행 (둘 다 7행)
        const facRow = row;
        
        // 시설 배정 확인 (우선순위 1) - 동적 시설 지원
        if (state.facilityList) {
            for (const facId of state.facilityList) {
                if (state.facilities[facId] && state.facilities[facId][facRow]) {
                    const facVal = state.facilities[facId][facRow][col] || '';
                    if (checkFacilityAssignment(facVal, cls)) {
                        const facName = state.facilityNames[facId] || facId;
                        return `${cls}은(는) 이 시간에 ${facName}에 배정되어 있습니다.`;
                    }
                }
            }
        } else {
            if (state.facilities.gym && state.facilities.gym[facRow]) {
                const gymVal = state.facilities.gym[facRow][col] || '';
                if (checkFacilityAssignment(gymVal, cls)) {
                    return `${cls}은(는) 이 시간에 체육관에 배정되어 있습니다.`;
                }
            }
            
            if (state.facilities.lib && state.facilities.lib[facRow]) {
                const libVal = state.facilities.lib[facRow][col] || '';
                if (checkFacilityAssignment(libVal, cls)) {
                    return `${cls}은(는) 이 시간에 도서관에 배정되어 있습니다.`;
                }
            }
        }
        
        // 다른 전담 교사 배정 확인 (우선순위 2)
        for (let i = 0; i < state.teachers.length; i++) {
            if (source === 'teacher' && i === sourceIdx) continue;
            const schedule = state.teachers[i].schedule;
            if (schedule && schedule[row] && schedule[row][col]) {
                const otherEntries = schedule[row][col].split('/').map(x => {
                    const match = x.trim().match(/^(\d+-\d+)/);
                    return match ? match[1] : x.trim();
                });
                if (otherEntries.includes(cls)) {
                    return `${cls}은(는) 이 시간에 ${state.teachers[i].name} 선생님에게 배정되어 있습니다.`;
                }
            }
        }
    }
    
    return null;
}

window.addTeacher = function() { 
    state.teachers.push({
        id: state.teachers.length + 1, 
        name: '신규', 
        assignments: [], 
        schedule: grid(7,5)
    }); 
    saveData({teachers: state.teachers}); 
    renderTab2(); 
};

window.removeTeacher = function(idx) { 
    if (isTeacherCompleted(idx)) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    showConfirm(`${state.teachers[idx].name} 교사를 삭제하시겠습니까?`, () => {
        state.teachers.splice(idx, 1); 
        saveData({teachers: state.teachers}); 
        renderTab2();
    });
};

window.resetTeacherSchedule = function(idx) {
    if (isTeacherCompleted(idx)) {
        showAlert('완료 상태에서는 수정할 수 없습니다.<br>완료를 해제한 뒤 수정하세요.');
        return;
    }
    showConfirm(`${state.teachers[idx].name} 선생님 시간표를 초기화하시겠습니까?`, () => {
        state.teachers[idx].schedule = grid(7, 5);
        saveData({ teachers: state.teachers });
        renderTeacherTimetables();
    });
};

// 교사 시간표 토글 (모달로 표시)
window.toggleTeacherTimetable = function(idx) {
    const t = state.teachers[idx];
    if (!t) return;
    
    // 기존 모달이 있으면 제거
    const existing = document.getElementById('teacher-timetable-modal');
    if (existing) existing.remove();
    
    // 모달 생성
    const modal = document.createElement('div');
    modal.id = 'teacher-timetable-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    // 시간표 렌더링
    if (!t.schedule || !Array.isArray(t.schedule)) {
        t.schedule = grid(7,5);
    }
    migrateTeacherSchedule(t);
    
    // 배정된 반-과목별 시수 계산
    const classHours = {};
    (t.assignments || []).forEach(a => {
        const displaySubj = a.subject.replace('[특수]', '');
        if (displaySubj.includes('보건')) return;
        
        const classKey = `${a.grade}-${a.classNum}`;
        if (!classHours[classKey]) classHours[classKey] = {};
        classHours[classKey][displaySubj] = { 
            target: a.hours, 
            current: 0,
            isSpecial: a.isSpecial 
        };
    });
    
    // 현재 시간표에서 시수 카운트
    if (t.schedule) {
        t.schedule.forEach(row => {
            row.forEach(cell => {
                if (!cell) return;
                const entries = parseScheduleEntries(cell);
                entries.forEach(entry => {
                    const classKey = entry.classKey;
                    const subjects = classHours[classKey];
                    if (!subjects) return;
                    if (entry.subject && subjects[entry.subject]) {
                        subjects[entry.subject].current++;
                    } else {
                        const keys = Object.keys(subjects);
                        if (!keys.length) return;
                        const targetSubj = keys.find(subj => subjects[subj].current < subjects[subj].target) || keys[0];
                        subjects[targetSubj].current++;
                    }
                });
            });
        });
    }
    
    const targetHrs = getTeacherTargetHours(idx);
    let scheduleHrs = 0;
    Object.keys(classHours).forEach(classKey => {
        Object.values(classHours[classKey]).forEach(ch => {
            scheduleHrs += ch.current;
        });
    });
    
    // 팔레트 HTML
    let paletteHtml = '';
    const isCompleted = isTeacherCompleted(idx);
    Object.keys(classHours).sort().forEach(classKey => {
        const subjects = classHours[classKey];
        Object.keys(subjects).sort().forEach(subj => {
            const ch = subjects[subj];
            const isDone = ch.current >= ch.target;
            const isOver = ch.current > ch.target;
            // 완료되면 초록색 유지
            const bgClass = isOver ? 'bg-red-100 text-red-700 border-red-300' : 
                           isDone ? 'bg-green-100 text-green-700 border-green-300' : 
                           'bg-gray-50 text-gray-700 border-gray-200';
            const icon = ch.isSpecial ? '⭐' : '';
            const paletteClass = isCompleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80';
            const paletteOnClick = isCompleted ? '' : `onclick="selectTeacherClass(${idx}, '${classKey}', '${subj}')"`;
            paletteHtml += `
                <div class="inline-flex items-center px-2 py-1 rounded border-2 text-xs ${bgClass} ${paletteClass} mb-1" 
                     ${paletteOnClick}
                     title="${subj}">
                    ${icon}<span class="font-bold">${classKey}</span> <span class="text-gray-600 ml-1">${subj}</span> <span class="ml-1 font-bold">${ch.current}/${ch.target}</span>
                </div>`;
        });
    });
    
    // 시간표 그리드 HTML
    const modalPeriodLabels = getPeriodLabels();
    const modalLowerTimes = state.scheduleTimes?.lower || {};
    const modalUpperTimes = state.scheduleTimes?.upper || {};
    const modalPeriodKeys = ['1교시','2교시','3교시','4교시','4교시','5교시','6교시'];
    let gridHtml = '';
    for(let r = 0; r < 7; r++) {
        const rowClass2 = (r === 3) ? 'bg-pink-50' : (r === 4) ? 'bg-indigo-50' : 'bg-gray-50';
        let facTime2 = '';
        if (r === 3) facTime2 = modalUpperTimes['4교시'] || '';
        else if (r === 4) facTime2 = modalLowerTimes['4교시'] || '';
        else facTime2 = modalLowerTimes[modalPeriodKeys[r]] || '';
        const timeHtml2 = facTime2 ? `<br><span class="text-[10px] text-gray-400 font-normal">${facTime2}</span>` : '';
        gridHtml += `<tr><td class="${rowClass2} font-bold text-xs p-2">${modalPeriodLabels[r]}${timeHtml2}</td>`;
        for(let c = 0; c < 5; c++) {
            const val = t.schedule[r][c] || '';
            const cellHover = isCompleted ? '' : 'cursor-pointer hover:bg-indigo-50';
            const cellLocked = isCompleted ? 'cell-locked' : '';
            const cellOnClick = isCompleted ? '' : `onclick="clickTeacherCell(${idx}, ${r}, ${c})"`;
            const cellKeydown = isCompleted ? '' : `onkeydown="handleTeacherCellKeydown(event, ${idx}, ${r}, ${c})" tabindex="0"`;
            gridHtml += `<td class="h-12 border ${cellHover} ${cellLocked}" 
                ${cellOnClick}
                ${cellKeydown}>
                <div class="w-full h-full text-center text-sm font-medium flex items-center justify-center">${val || ''}</div>
            </td>`;
        }
        gridHtml += '</tr>';
    }
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto" onclick="event.stopPropagation()">
            <div class="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                <div>
                    <h3 class="text-xl font-bold">${t.name} 시간표</h3>
                    <span class="text-sm ${scheduleHrs>=targetHrs && targetHrs > 0 ?'text-green-600':'text-orange-600'}">${scheduleHrs}/${targetHrs}시간</span>
                </div>
                <button onclick="document.getElementById('teacher-timetable-modal').remove()" class="text-gray-400 hover:text-gray-600">
                    <i class="fa-solid fa-times text-2xl"></i>
                </button>
            </div>
            <div class="p-4 flex gap-4">
                <div class="flex-1">
                    <table class="w-full border-collapse border">
                        <thead>
                            <tr class="bg-gray-100">
                                <th class="border p-2 w-16">교시</th>
                                <th class="border p-2">월</th>
                                <th class="border p-2">화</th>
                                <th class="border p-2">수</th>
                                <th class="border p-2">목</th>
                                <th class="border p-2">금</th>
                            </tr>
                        </thead>
                        <tbody>${gridHtml}</tbody>
                    </table>
                </div>
                <div class="w-64 border-l pl-4">
                    <div class="text-xs font-bold text-gray-600 mb-2">📋 담당 반 (클릭하여 입력)</div>
                    <div id="teacher-palette-${idx}" class="flex flex-col gap-1">
                        ${paletteHtml || '<span class="text-gray-400 text-xs">배정된 반 없음</span>'}
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.appendChild(modal);
};

