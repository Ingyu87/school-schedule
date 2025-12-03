// Tab 3: 학급 시간표

function initEditorSelector() {
    const gradeSel = document.getElementById('editor-grade-select');
    const classSel = document.getElementById('editor-class-select');
    if (!gradeSel || !classSel) return;
    
    const grades = ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'];
    gradeSel.innerHTML = '';
    grades.forEach(gr => {
        if (state.config[gr]) {
            gradeSel.innerHTML += `<option value="${gr}">${gr}</option>`;
        }
    });
    
    // 현재 선택 상태에서 학년/반 추출
    let currentGrade = null;
    let currentClass = null;
    if (editorState.classKey) {
        const parts = editorState.classKey.split('-'); // "3학년-1반"
        currentGrade = parts[0] + (parts[0].endsWith('학년') ? '' : '학년');
        const clsPart = parts[1] || '';
        currentClass = parseInt(clsPart.replace('반','')) || 1;
    }
    
    if (!currentGrade || !state.config[currentGrade]) {
        currentGrade = gradeSel.options[0]?.value;
    }
    populateEditorClassOptions(currentGrade, currentClass);
    
    gradeSel.value = currentGrade;
    const finalClass = classSel.value || '1';
    const key = `${currentGrade}-${finalClass}반`;
    if (!editorState.classKey) editorState.classKey = key;
    loadEditor(editorState.classKey);
}

function populateEditorClassOptions(gradeLabel, selectedClassNum) {
    const classSel = document.getElementById('editor-class-select');
    if (!classSel) return;
    classSel.innerHTML = '';
    
    const count = state.config[gradeLabel]?.classes || 0;
    for (let i = 1; i <= count; i++) {
        const selected = selectedClassNum === i ? 'selected' : '';
        classSel.innerHTML += `<option value="${i}" ${selected}>${i}반</option>`;
    }
}

window.onEditorGradeChange = function() {
    const gradeSel = document.getElementById('editor-grade-select');
    const classSel = document.getElementById('editor-class-select');
    if (!gradeSel || !classSel) return;
    const grade = gradeSel.value;
    if (!grade) return;
    populateEditorClassOptions(grade, 1);
    const cls = classSel.value || '1';
    loadEditor(`${grade}-${cls}반`);
};

window.onEditorClassChange = function() {
    const gradeSel = document.getElementById('editor-grade-select');
    const classSel = document.getElementById('editor-class-select');
    if (!gradeSel || !classSel) return;
    const grade = gradeSel.value;
    const cls = classSel.value;
    if (!grade || !cls) return;
    loadEditor(`${grade}-${cls}반`);
};

window.loadEditor = function(k) { 
    editorState.classKey = k; 
    editorState.selectedSubj = null; 
    renderPalette(); 
    renderEditorGrid(); 
};

function renderEditorGrid() {
    const k = editorState.classKey;
    if (!k) return;
    const gr = k.split('-')[0];
    const gradeNum = parseInt(gr);
    const classNum = parseInt(k.split('-')[1]);
    const shortK = k.replace('학년-','-').replace('반','');
    const dailyLimit = state.dailyCounts[gr] || [4,5,5,5,4];
    const tb = document.getElementById('editor-grid-body');
    if (!tb) return;
    
    let h = '';
    const classPeriodsLabels = ["1교시","2교시","3교시","4교시","5교시","6교시"];
    
    for(let i = 0; i < 6; i++) {
        h += `<tr style="height:55px;"><td class="font-bold bg-gray-50 text-xs w-16">${classPeriodsLabels[i]}</td>`;
        for(let j = 0; j < 5; j++) {
            if (i >= dailyLimit[j]) {
                h += `<td class="tt-cell cell-disabled"></td>`;
                continue;
            }
            
            // 시설 배정 확인
            let fac = '';
            let facRow = i;
            if (i === 3) {
                facRow = (gradeNum <= 3) ? 4 : 3;
            } else if (i >= 4) {
                facRow = i + 1;
            }
            
            if (state.facilities.gym[facRow] && checkFacilityAssignment(state.facilities.gym[facRow][j], shortK)) {
                fac = '체육(강당)';
            }
            if (state.facilities.lib[facRow] && checkFacilityAssignment(state.facilities.lib[facRow][j], shortK)) {
                fac = fac ? fac + '+도서관' : '국어(도서관)';
            }
            
            // 전담 교사 시간표에서 배정 확인 (보건 제외)
            let teacherSubjs = [];
            state.teachers.forEach(t => {
                if (t.schedule && t.schedule[i] && t.schedule[i][j]) {
                    const entries = parseScheduleEntries(t.schedule[i][j]);
                    entries.forEach(entry => {
                        if (entry.classKey === shortK) {
                            let displaySubj = entry.subject;
                            if (!displaySubj) {
                                const assign = (t.assignments || []).find(a => a.grade == gradeNum && a.classNum == classNum);
                                if (assign) displaySubj = assign.subject.replace('[특수]', '');
                            }
                            if (displaySubj && !displaySubj.includes('보건') && !teacherSubjs.includes(displaySubj)) {
                                teacherSubjs.push(displaySubj);
                            }
                        }
                    });
                }
            });
            const teacherSubj = teacherSubjs.join(', ');
            
            let v = state.timetables[k] ? state.timetables[k][i][j] : '';
            let cls = 'tt-cell '; 
            let txt = '';
            let isFixed = false;
            
            if (fac) {
                txt = fac;
                cls += 'cell-fixed';
                isFixed = true;
            } else if (teacherSubj) {
                txt = teacherSubj;
                cls += 'cell-jeondam';
                isFixed = true;  // 전담 시간표에서 배정된 것은 수정 불가
            } else if (v) {
                txt = v;
                // 전담 교사/시설이 아닌 기존 값은 모두 담임 과목으로 취급 (수정 가능)
                cls += 'cell-damim';
            } else {
                cls += 'bg-white';
            }
            
            if (isFixed) {
                h += `<td class="${cls}">${txt}</td>`;
            } else {
                h += `<td class="${cls}" onclick="clickCell(${i},${j})">${txt}</td>`;
            }
        }
        h += '</tr>';
    }
    tb.innerHTML = h;
}

function checkFacilityAssignment(cellValue, classKey) {
    if (!cellValue) return false;
    const classes = cellValue.split('/').map(x => x.trim());
    return classes.includes(classKey);
}

function renderPalette() {
    const k = editorState.classKey;
    if (!k) return;
    const gr = k.split('-')[0];
    const pj = document.getElementById('palette-jeondam'); 
    if (!pj) return;
    
    pj.innerHTML = '';
    let jList = getGradeAllocations(gr);
    
    // 특수부장 과목도 전담 과목 목록에 추가
    const gradeNum = parseInt(gr);
    const classNum = parseInt(k.split('-')[1]);
    (state.specialSupport || []).forEach(sp => {
        if (sp.grade == gradeNum && sp.classNum == classNum) {
            // 이미 전담 과목 목록에 있는지 확인 (같은 과목이 일반 전담으로도 있는 경우)
            const exists = jList.some(s => s.split('(')[0] === sp.subject);
            if (!exists) {
                jList.push(`${sp.subject}(${sp.hours})`);
            }
        }
    });
    
    jList.forEach(s => {
        let name = s.split('(')[0];
        let tgt = parseFloat(s.match(/\(([\d.]+)\)/)?.[1] || 0);
        let cur = countUse(k, name);
        let active = editorState.selectedSubj === name ? 'active' : '';
        let st = cur >= tgt ? 'done' : '';
        // 전담 과목도 학급 시간표에서 선택 가능 (단, 전담/시설 배정 시간은 여전히 잠금)
        pj.innerHTML += `<div class="palette-item ${active}" onclick="selSubj('${name}')"><span class="text-sm font-bold">${name}</span><span class="count-badge ${st}">${cur}/${tgt}</span></div>`;
    });

    const pd = document.getElementById('palette-damim'); 
    if (!pd) return;
    
    pd.innerHTML = '';
    let subjs = state.curriculum[gr] || {};
    Object.keys(subjs).forEach(s => {
        let tgt = subjs[s];
        if(tgt > 0) {
            let cur = countUse(k, s);
            let active = editorState.selectedSubj === s ? 'active' : '';
            let st = cur >= tgt ? 'done' : '';
            pd.innerHTML += `<div class="palette-item ${active}" onclick="selSubj('${s}')"><span class="text-sm">${s}</span><span class="count-badge ${st}">${cur}/${tgt}</span></div>`;
        }
    });
}

function countUse(k, s) {
    let c = 0;
    const gr = k.split('-')[0];
    const gradeNum = parseInt(gr);
    const classNum = parseInt(k.split('-')[1]);
    const sk = k.replace('학년-','-').replace('반','');
    
    // 시간표에서 직접 입력된 과목 카운트
    if (state.timetables[k]) {
        state.timetables[k].forEach(r => r.forEach(v => { if(v === s) c++; }));
    }
    
    // 시설 배정 카운트
    if(s === '체육') {
        state.facilities.gym.forEach(r => {
            if (r) r.forEach(v => {
                if (v) {
                    const classes = v.split('/').map(x => x.trim());
                    if (classes.includes(sk)) {
                        c += classes.length > 1 ? 0.5 : 1;
                    }
                }
            });
        });
    }
    if(s === '국어') {
        state.facilities.lib.forEach(r => {
            if (r) r.forEach(v => {
                if (v) {
                    const classes = v.split('/').map(x => x.trim());
                    if (classes.includes(sk)) {
                        c += classes.length > 1 ? 0.5 : 1;
                    }
                }
            });
        });
    }
    
    // 전담 교사 시간표에서 배정된 과목 카운트 (보건 제외)
    state.teachers.forEach(t => {
        // 이 교사가 해당 반에 해당 과목을 가르치는지 확인
        const assignment = (t.assignments || []).find(a => {
            const displaySubj = a.subject.replace('[특수]', '');
            // 보건은 전담 시간표에서 카운트하지 않음
            if (displaySubj.includes('보건')) return false;
            return a.grade == gradeNum && a.classNum == classNum && 
                   (a.subject === s || displaySubj === s);
        });
        
        if (assignment && t.schedule) {
            t.schedule.forEach(row => {
                row.forEach(cell => {
                    if (!cell) return;
                    const entries = parseScheduleEntries(cell);
                    entries.forEach(entry => {
                        if (entry.classKey === sk) {
                            if (!entry.subject || entry.subject === s) {
                                c++;
                            }
                        }
                    });
                });
            });
        }
    });
    
    return c;
}

window.selSubj = function(s) { 
    editorState.selectedSubj = s; 
    renderPalette(); 
};

function getFacilityRow(classRow, gradeNum) {
    if (classRow < 3) return classRow;
    if (classRow === 3) return (gradeNum <= 3) ? 4 : 3;
    return classRow + 1;
}

function isFacilityAssigned(classRow, col, classKey, gradeNum) {
    const facRow = getFacilityRow(classRow, gradeNum);
    const gymVal = state.facilities.gym[facRow] ? state.facilities.gym[facRow][col] : '';
    const libVal = state.facilities.lib[facRow] ? state.facilities.lib[facRow][col] : '';
    return checkFacilityAssignment(gymVal, classKey) || checkFacilityAssignment(libVal, classKey);
}

function isTeacherAssigned(classRow, col, classKey) {
    const gradeNum = parseInt(classKey.split('-')[0]);
    const classNum = parseInt(classKey.split('-')[1]);
    
    for (const t of state.teachers) {
        if (t.schedule && t.schedule[classRow] && t.schedule[classRow][col]) {
            const entries = t.schedule[classRow][col].split('/').map(x => {
                // "4-1(과학)" 형태면 "4-1"만 추출
                const match = x.trim().match(/^(\d+-\d+)/);
                return match ? match[1] : x.trim();
            });
            
            // 해당 반이 배정되어 있는지 확인
            if (entries.includes(classKey)) {
                // 보건이 아닌 과목이 있는지 확인
                const hasNonBogun = (t.assignments || []).some(a => {
                    if (a.grade == gradeNum && a.classNum == classNum) {
                        const displaySubj = a.subject.replace('[특수]', '');
                        return !displaySubj.includes('보건');
                    }
                    return false;
                });
                if (hasNonBogun) {
                    return true;
                }
            }
        }
    }
    return false;
}

window.clickCell = function(r, c) {
    const k = editorState.classKey;
    const gr = k.split('-')[0];
    const gradeNum = parseInt(gr);
    const sk = k.replace('학년-','-').replace('반','');
    
    if(isFacilityAssigned(r, c, sk, gradeNum)) { 
        showAlert('시설 배정된 시간입니다.'); 
        return; 
    }
    
    if(isTeacherAssigned(r, c, sk)) {
        showAlert('전담 교사가 배정된 시간입니다.<br>전담 시간표에서 수정하세요.');
        return;
    }
    
    // 전담 과목 입력 제한 제거 - 이제 전담 과목도 자유롭게 입력 가능
    
    if(editorState.selectedSubj) {
        // 목표 시수 확인
        const jList = getGradeAllocations(gr);
        const isJeondam = jList.some(x => x.startsWith(editorState.selectedSubj));
        let targetHours = 0;
        
        if (isJeondam) {
            const alloc = jList.find(x => x.startsWith(editorState.selectedSubj));
            targetHours = parseFloat(alloc.match(/\(([\d.]+)\)/)?.[1] || 0);
        } else {
            targetHours = state.curriculum[gr]?.[editorState.selectedSubj] || 0;
        }
        
        const currentHours = countUse(k, editorState.selectedSubj);
        
        // 목표 시수에 도달했으면 더 이상 입력 불가
        if (currentHours >= targetHours && targetHours > 0) {
            showAlert(`${editorState.selectedSubj}은(는) 이미 ${targetHours}시간이 모두 배정되었습니다.`);
            return;
        }
        
        state.timetables[k][r][c] = editorState.selectedSubj;
    } else {
        state.timetables[k][r][c] = '';
    }
    
    renderEditorGrid(); 
    renderPalette();
    saveData({timetables: state.timetables});
};

window.autoFill = function() {
    showConfirm('전담 과목을 자동 배치하시겠습니까?', doAutoFill);
};

function doAutoFill() {
    const k = editorState.classKey;
    const gr = k.split('-')[0];
    const gradeNum = parseInt(gr);
    const sk = k.replace('학년-','-').replace('반','');
    const dailyLimit = state.dailyCounts[gr] || [4,5,5,5,4];
    let pool = [];
    // 담임 과목만 자동채우기 (전담 과목 제외)
    let subjs = state.curriculum[gr] || {};
    let jList = getGradeAllocations(gr);
    Object.keys(subjs).forEach(s => {
        // 전담 과목이 아닌 담임 과목만
        if(!jList.some(x => x.startsWith(s))) {
            let tgt = subjs[s];
            if(tgt > 0) {
                let cur = countUse(k, s);
                for(let x = 0; x < (tgt - cur); x++) pool.push(s);
            }
        }
    });
    for(let r = 0; r < 6; r++) {
        for(let c = 0; c < 5; c++) {
            if(r >= dailyLimit[c]) continue;
            if(pool.length === 0) break;
            // 시설, 전담교사 배정된 셀은 건너뛰기
            if(!state.timetables[k][r][c] && !isFacilityAssigned(r, c, sk, gradeNum) && !isTeacherAssigned(r, c, sk)) {
                state.timetables[k][r][c] = pool.shift();
            }
        }
    }
    renderEditorGrid(); 
    renderPalette();
    saveData({timetables: state.timetables});
}

window.resetClassTimetable = function() {
    const k = editorState.classKey;
    if (!k) return;
    showConfirm(`${k} 시간표를 초기화하시겠습니까?`, () => {
        state.timetables[k] = grid(6, 5);
        saveData({ timetables: state.timetables });
        renderEditorGrid();
        renderPalette();
    });
};

window.downloadExcel = function() {
    const wb = XLSX.utils.book_new();
    const classPeriods = ["1교시","2교시","3교시","4교시","5교시","6교시"];
    Object.keys(state.timetables).forEach(classKey => {
        const tt = state.timetables[classKey];
        const data = [['', '월', '화', '수', '목', '금']];
        classPeriods.forEach((p, i) => {
            const row = [p];
            for (let j = 0; j < 5; j++) row.push(tt[i] ? tt[i][j] || '' : '');
            data.push(row);
        });
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, classKey.replace('학년-', '-').replace('반', ''));
    });
    XLSX.writeFile(wb, `시간표_${new Date().toISOString().split('T')[0]}.xlsx`);
};

function renderTab3() {
    renderPalette();
    renderEditorGrid();
}

