// Tab 2: 교과전담 교사별 시간표

function renderTab2() {
    renderSpecialSupport();
    renderTeacherSetup();
}

function renderSpecialSupport() {
    const list = document.getElementById('special-support-list');
    if (!list) return;
    
    list.innerHTML = '';
    (state.specialSupport || []).forEach((s, idx) => {
        list.innerHTML += `
            <span class="inline-flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                ${s.grade}-${s.classNum}반 ${s.subject}(${s.hours}h)
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
    
    const exists = state.specialSupport.some(s => 
        s.grade == gradeNum && s.classNum == classNum && s.subject === subject
    );
    if (exists) {
        showAlert('이미 추가된 항목입니다.');
        return;
    }
    
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


function renderTeacherSetup() {
    const container = document.getElementById('teacher-setup-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    state.teachers.forEach((t, idx) => {
        if (!t.assignments) t.assignments = [];
        
        let totalHours = t.assignments.reduce((sum, a) => sum + (a.hours || 0), 0);
        
                const badges = t.assignments.map((a, aIdx) => {
            const bgClass = a.isSpecial ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700';
            const displaySubj = a.subject.replace('[특수]', '');
            return `
                <span class="inline-flex items-center ${bgClass} px-2 py-1 rounded text-xs mr-1 mb-1">
                    ${a.isSpecial ? '⭐' : ''}${a.grade}-${a.classNum} ${displaySubj}(${a.hours}h)
                    <i class="fa-solid fa-xmark ml-1 cursor-pointer hover:text-red-500" onclick="removeTeacherAssignment(${idx}, ${aIdx})"></i>
                </span>`;
        }).join('');
        
        const statusClass = totalHours === 21 ? 'bg-green-100 text-green-700' : 
                           totalHours > 21 ? 'bg-red-100 text-red-700' : 
                           'bg-orange-100 text-orange-700';
        
        container.innerHTML += `
            <div class="bg-white rounded-lg border p-4">
                <div class="flex justify-between items-center mb-3">
                    <input class="font-bold text-lg border-b-2 border-gray-200 w-28 outline-none focus:border-indigo-500" 
                           value="${t.name}" onchange="updTName(${idx},this.value)">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-bold px-2 py-1 rounded ${statusClass}">${totalHours}/21시간</span>
                        <button onclick="resetTeacherAssignments(${idx})" class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs hover:bg-gray-200" title="배정 초기화">
                            <i class="fa-solid fa-rotate-left"></i>
                        </button>
                        <button onclick="toggleTeacherTimetable(${idx})" class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                            <i class="fa-solid fa-calendar mr-1"></i>시간표
                        </button>
                        <button onclick="removeTeacher(${idx})" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-trash"></i></button>
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
    state.teachers.forEach(t => {
        (t.assignments || []).forEach(a => {
            assigned.add(`${a.grade}-${a.classNum}-${a.subject}`);
        });
    });
    
    // 3~6학년 순회
    [3, 4, 5, 6].forEach(gradeNum => {
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
                const disabled = isAssigned ? 'disabled' : '';
                const opacityClass = isAssigned ? 'opacity-40' : '';
                const label = isAssigned ? 
                    `${gradeNum}-${c} ${subjName} (${hours}h) ✓` :
                    `${gradeNum}-${c} ${subjName} (${hours}h)`;
                
                container.innerHTML += `
                    <button onclick="toggleTeacherAssignment(${idx}, '${key}', ${hours}, false)" ${disabled}
                            data-key="${key}"
                            class="text-left p-2 text-xs border rounded hover:bg-indigo-50 transition-colors ${opacityClass} ${isAssigned ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'}">
                        ${label}
                    </button>`;
            }
        });
        
        // 특수부장 과목
        (state.specialSupport || []).forEach(sp => {
            if (sp.grade == gradeNum) {
                const key = `${gradeNum}-${sp.classNum}-[특수]${sp.subject}`;
                const isAssigned = assigned.has(key);
                const disabled = isAssigned ? 'disabled' : '';
                const opacityClass = isAssigned ? 'opacity-40' : '';
                const label = isAssigned ?
                    `⭐${gradeNum}-${sp.classNum} ${sp.subject} (${sp.hours}h) ✓` :
                    `⭐${gradeNum}-${sp.classNum} ${sp.subject} (${sp.hours}h)`;
                
                container.innerHTML += `
                    <button onclick="toggleTeacherAssignment(${idx}, '${key}', ${sp.hours}, true)" ${disabled}
                            data-key="${key}"
                            class="text-left p-2 text-xs border rounded hover:bg-yellow-50 transition-colors ${opacityClass} ${isAssigned ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'}">
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
        // 특수부장 과목: 해당 과목이 설정된 반만 표시
        const realSubj = subjVal.replace('[특수]', '');
        (state.specialSupport || []).forEach(sp => {
            if (sp.grade == gradeNum && sp.subject === realSubj) {
                // 같은 특수부장 과목이 이미 배정되었는지 확인
                const alreadyAssigned = state.teachers.some(t => 
                    (t.assignments || []).some(a => 
                        a.grade == gradeNum && a.classNum == sp.classNum && a.subject === subjVal
                    )
                );
                const disabled = alreadyAssigned ? 'disabled' : '';
                const label = alreadyAssigned ? `${sp.classNum}반 (배정됨)` : `${sp.classNum}반`;
                classSel.innerHTML += `<option value="${sp.classNum}" ${disabled}>${label}</option>`;
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
    // 값 파싱: "3-1-영어" 또는 "4-2-[특수]과학"
    const parts = key.split('-');
    if (parts.length < 3) return;
    
    const gradeNum = parseInt(parts[0]);
    const classNum = parseInt(parts[1]);
    const subjVal = parts.slice(2).join('-'); // "[특수]" 포함 가능
    
    if (!state.teachers[idx].assignments) state.teachers[idx].assignments = [];
    
    // 이미 배정되어 있는지 확인
    const existingIdx = state.teachers[idx].assignments.findIndex(a => 
        a.grade == gradeNum && a.classNum == classNum && a.subject === subjVal
    );
    
    if (existingIdx >= 0) {
        // 이미 있으면 제거
        state.teachers[idx].assignments.splice(existingIdx, 1);
    } else {
        // 없으면 추가
        state.teachers[idx].assignments.push({
            grade: gradeNum,
            classNum: classNum,
            subject: subjVal,
            hours: hours,
            isSpecial: isSpecial
        });
    }
    
    saveData({ teachers: state.teachers });
    
    // 버튼 목록 다시 채우기 (배정된 항목 표시)
    populateTeacherAssignmentOptions(idx);
    
    // renderTab2() 대신 필요한 부분만 업데이트
    // 1. 시수 재계산 및 업데이트
    const t = state.teachers[idx];
    const totalHours = t.assignments.reduce((sum, a) => sum + (a.hours || 0), 0);
    const statusEl = document.querySelector(`#teacher-setup-list > div:nth-child(${idx + 1}) .text-sm.font-bold.px-2`);
    if (statusEl) {
        const statusClass = totalHours === 21 ? 'bg-green-100 text-green-700' : 
                           totalHours > 21 ? 'bg-red-100 text-red-700' : 
                           'bg-orange-100 text-orange-700';
        statusEl.className = `text-sm font-bold px-2 py-1 rounded ${statusClass}`;
        statusEl.textContent = `${totalHours}/21시간`;
    }
    
    // 2. 배정 목록(badges) 전체 다시 그리기
    const badgesContainer = document.querySelector(`#teacher-setup-list > div:nth-child(${idx + 1}) .flex.flex-wrap.mb-3`);
    if (badgesContainer) {
        badgesContainer.innerHTML = '';
        
        t.assignments.forEach((a, aIdx) => {
            const bgClass = a.isSpecial ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700';
            const displaySubj = a.subject.replace('[특수]', '');
            const badgeHtml = `
                <span class="inline-flex items-center ${bgClass} px-2 py-1 rounded text-xs mr-1 mb-1">
                    ${a.isSpecial ? '⭐' : ''}${a.grade}-${a.classNum} ${displaySubj}(${a.hours}h)
                    <i class="fa-solid fa-xmark ml-1 cursor-pointer hover:text-red-500" onclick="removeTeacherAssignment(${idx}, ${aIdx})"></i>
                </span>`;
            badgesContainer.insertAdjacentHTML('beforeend', badgeHtml);
        });
        
        if (t.assignments.length === 0) {
            badgesContainer.innerHTML = '<span class="text-gray-400 text-sm">배정된 과목 없음</span>';
        }
    }
};

window.removeTeacherAssignment = function(teacherIdx, assignIdx) {
    state.teachers[teacherIdx].assignments.splice(assignIdx, 1);
    saveData({ teachers: state.teachers });
    renderTab2();
};

window.resetTeacherAssignments = function(idx) {
    const t = state.teachers[idx];
    if (!t) return;
    
    showConfirm(`${t.name} 선생님의 배정을 모두 초기화하시겠습니까?`, () => {
        t.assignments = [];
        saveData({ teachers: state.teachers });
        
        // 버튼 목록 다시 채우기
        populateTeacherAssignmentOptions(idx);
        
        // 시수 표시 업데이트
        const statusEl = document.querySelector(`#teacher-setup-list > div:nth-child(${idx + 1}) .text-sm.font-bold.px-2`);
        if (statusEl) {
            statusEl.className = 'text-sm font-bold px-2 py-1 rounded bg-orange-100 text-orange-700';
            statusEl.textContent = '0/21시간';
        }
        
        // 배정 목록 초기화
        const badgesContainer = document.querySelector(`#teacher-setup-list > div:nth-child(${idx + 1}) .flex.flex-wrap.mb-3`);
        if (badgesContainer) {
            badgesContainer.innerHTML = '<span class="text-gray-400 text-sm">배정된 과목 없음</span>';
        }
    });
};

function renderTeacherTimetables() {
    const tv = document.getElementById('teacher-timetables-view');
    if (!tv) return;
    tv.innerHTML = '';
    
    const classPeriodLabels = ["1교시","2교시","3교시","4교시","5교시","6교시"];
    
    state.teachers.forEach((t, idx) => {
        if (!t.schedule || !Array.isArray(t.schedule)) {
            t.schedule = grid(6,5);
        }
        
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
        
        const targetHrs = (t.assignments || []).reduce((sum, a) => sum + (a.hours || 0), 0);
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
                paletteHtml += `
                    <div class="inline-flex items-center px-2 py-1 rounded border text-xs ${bgClass} cursor-pointer hover:opacity-80 mb-1" 
                         onclick="selectTeacherClass(${idx}, '${classKey}', '${subj}')" 
                         title="${subj}">
                        ${icon}<span class="font-bold">${classKey}</span> <span class="text-gray-600 ml-1">${subj}</span> <span class="ml-1 font-bold">${ch.current}/${ch.target}</span>
                    </div>`;
            });
        });
        
        const gridId = `teacher-${idx}`;
        let gridHtml = '';
        for(let r = 0; r < 6; r++) {
            gridHtml += `<tr><td class="bg-gray-50 font-bold text-xs">${classPeriodLabels[r]}</td>`;
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
                gridHtml += `<td class="${cellClass} h-9 cursor-pointer hover:bg-indigo-50" onclick="clickTeacherCell(${idx}, ${r}, ${c})">
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
                            <button onclick="resetTeacherSchedule(${idx})" class="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded">
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
    selectedTeacherClass = { teacherIdx, classKey, subject };
    
    // 선택 상태 저장 (렌더링 후에도 유지)
    if (!window.teacherPaletteSelections) window.teacherPaletteSelections = {};
    window.teacherPaletteSelections[teacherIdx] = { classKey, subject };
    
    // 모든 팔레트 아이템 선택 해제
    document.querySelectorAll('[id^="teacher-palette-"] > div').forEach(el => {
        el.classList.remove('ring-2', 'ring-indigo-500');
    });
    
    // 현재 선택된 아이템 하이라이트
    const palette = document.getElementById(`teacher-palette-${teacherIdx}`);
    if (palette) {
        palette.querySelectorAll('div').forEach(el => {
            // onclick 속성에서 classKey와 subject 확인
            const onclickAttr = el.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`'${classKey}'`) && onclickAttr.includes(`'${subject}'`)) {
                el.classList.add('ring-2', 'ring-indigo-500');
            }
        });
    }
};

// 전담 시간표 셀 직접 입력 처리
window.onTeacherCellInput = function(teacherIdx, r, c, value) {
    const t = state.teachers[teacherIdx];
    if (!t.schedule) t.schedule = grid(6,5);
    
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

window.clickTeacherCell = function(teacherIdx, r, c, event) {
    const t = state.teachers[teacherIdx];
    if (!t.schedule) t.schedule = grid(6,5);
    
    const currentEntries = parseScheduleEntries(t.schedule[r][c] || '');
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
            currentEntries.splice(sameEntryIdx, 1);
        } else if (currentEntries.some(entry => entry.classKey === classKey)) {
            showAlert('이미 배정된 반입니다. 다른 시간대를 선택하세요.');
            return;
        } else {
            if (!currentEntries.length) {
                const conflict = checkAllConflicts(classKey, r, c, 'teacher', teacherIdx);
                if (conflict) {
                    showAlert(conflict);
                    return;
                }
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
    state.teachers[i].name = n; 
    saveData({teachers: state.teachers}); 
    renderTab2(); 
};

function checkAllConflicts(classKey, row, col, source, sourceIdx) {
    // "4-1(과학)" 형태에서 "4-1"만 추출
    const extractClassKey = (entry) => {
        const match = entry.match(/^(\d+-\d+)/);
        return match ? match[1] : entry;
    };
    
    const entries = classKey.split('/').map(x => {
        const match = x.trim().match(/^(\d+-\d+)/);
        return match ? match[1] : x.trim();
    }).filter(x => x);
    
    for (const cls of entries) {
        const gradeNum = parseInt(cls.split('-')[0]);
        if (isNaN(gradeNum)) continue;
        
        // 시설 시간표 행 계산 (학급 시간표 행 → 시설 시간표 행)
        let facRow = row;
        if (row === 3) {
            // 4교시: 1~3학년은 4번 행, 4~6학년은 3번 행
            facRow = (gradeNum <= 3) ? 4 : 3;
        } else if (row >= 4) {
            // 5교시 이상: +1
            facRow = row + 1;
        }
        
        // 시설 배정 확인 (우선순위 1)
        if (state.facilities.gym[facRow]) {
            const gymVal = state.facilities.gym[facRow][col] || '';
            if (checkFacilityAssignment(gymVal, cls)) {
                return `${cls}은(는) 이 시간에 체육관에 배정되어 있습니다.`;
            }
        }
        
        if (state.facilities.lib[facRow]) {
            const libVal = state.facilities.lib[facRow][col] || '';
            if (checkFacilityAssignment(libVal, cls)) {
                return `${cls}은(는) 이 시간에 도서관에 배정되어 있습니다.`;
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
                // 같은 반이 배정되어 있는지 확인
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
        schedule: grid(6,5)
    }); 
    saveData({teachers: state.teachers}); 
    renderTab2(); 
};

window.removeTeacher = function(idx) { 
    showConfirm(`${state.teachers[idx].name} 교사를 삭제하시겠습니까?`, () => {
        state.teachers.splice(idx, 1); 
        saveData({teachers: state.teachers}); 
        renderTab2();
    });
};

window.resetTeacherSchedule = function(idx) {
    showConfirm(`${state.teachers[idx].name} 선생님 시간표를 초기화하시겠습니까?`, () => {
        state.teachers[idx].schedule = grid(6, 5);
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
        t.schedule = grid(6,5);
    }
    
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
    
    const targetHrs = (t.assignments || []).reduce((sum, a) => sum + (a.hours || 0), 0);
    let scheduleHrs = 0;
    Object.keys(classHours).forEach(classKey => {
        Object.values(classHours[classKey]).forEach(ch => {
            scheduleHrs += ch.current;
        });
    });
    
    // 팔레트 HTML
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
            paletteHtml += `
                <div class="inline-flex items-center px-2 py-1 rounded border text-xs ${bgClass} cursor-pointer hover:opacity-80 mb-1" 
                     onclick="selectTeacherClass(${idx}, '${classKey}', '${subj}')" 
                     title="${subj}">
                    ${icon}<span class="font-bold">${classKey}</span> <span class="text-gray-600 ml-1">${subj}</span> <span class="ml-1 font-bold">${ch.current}/${ch.target}</span>
                </div>`;
        });
    });
    
    // 시간표 그리드 HTML
    const classPeriodLabels = ["1교시","2교시","3교시","4교시","5교시","6교시"];
    let gridHtml = '';
    for(let r = 0; r < 6; r++) {
        gridHtml += `<tr><td class="bg-gray-50 font-bold text-xs p-2">${classPeriodLabels[r]}</td>`;
        for(let c = 0; c < 5; c++) {
            const val = t.schedule[r][c] || '';
            gridHtml += `<td class="h-12 border cursor-pointer hover:bg-indigo-50" onclick="clickTeacherCell(${idx}, ${r}, ${c})">
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

