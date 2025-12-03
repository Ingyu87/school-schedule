// Tab 3: 학급 시간표

function initEditorSelector() {
    const sel = document.getElementById('editor-class-select');
    if (!sel) return;
    
    sel.innerHTML = '';
    Object.keys(state.config).forEach(gr => {
        for(let i = 1; i <= state.config[gr].classes; i++) {
            let k = `${gr}-${i}반`; 
            sel.innerHTML += `<option value="${k}">${k}</option>`;
        }
    });
    if(!editorState.classKey) editorState.classKey = sel.value;
    sel.value = editorState.classKey;
    loadEditor(sel.value);
}

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
            const jList = getGradeAllocations(gr);
                // 전담 과목인지 확인
                if(jList.some(x => x.startsWith(v))) {
                    cls += 'cell-jeondam';
                    isFixed = true;  // 전담 과목은 수정 불가
                } else {
                    cls += 'cell-damim';
                }
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
    jList.forEach(s => {
        let name = s.split('(')[0];
        let tgt = parseFloat(s.match(/\(([\d.]+)\)/)?.[1] || 0);
        let cur = countUse(k, name);
        let active = editorState.selectedSubj === name ? 'active' : '';
        let st = cur >= tgt ? 'done' : '';
        // 전담 과목은 클릭 불가 (읽기 전용)
        pj.innerHTML += `<div class="palette-item ${active} opacity-60 cursor-not-allowed" title="전담 과목은 전담 시간표에서 배정하세요"><span class="text-sm font-bold">${name}</span><span class="count-badge ${st}">${cur}/${tgt}</span></div>`;
    });

    const pd = document.getElementById('palette-damim'); 
    if (!pd) return;
    
    pd.innerHTML = '';
    let subjs = state.curriculum[gr] || {};
    Object.keys(subjs).forEach(s => {
        if(!jList.some(x => x.startsWith(s))) {
            let tgt = subjs[s];
            if(tgt > 0) {
                let cur = countUse(k, s);
                let active = editorState.selectedSubj === s ? 'active' : '';
                let st = cur >= tgt ? 'done' : '';
                pd.innerHTML += `<div class="palette-item ${active}" onclick="selSubj('${s}')"><span class="text-sm">${s}</span><span class="count-badge ${st}">${cur}/${tgt}</span></div>`;
            }
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
    
    // 현재 셀에 전담 과목이 있는지 확인
    const currentVal = state.timetables[k] ? state.timetables[k][r][c] : '';
    if (currentVal) {
        const jList = getGradeAllocations(gr);
        if (jList.some(x => x.startsWith(currentVal))) {
            showAlert('전담 과목은 수정할 수 없습니다.<br>전담 시간표에서 수정하세요.');
            return;
        }
    }
    
    // 선택한 과목이 전담 과목인지 확인
    if (editorState.selectedSubj) {
        const jList = getGradeAllocations(gr);
        if (jList.some(x => x.startsWith(editorState.selectedSubj))) {
            showAlert('전담 과목은 직접 입력할 수 없습니다.<br>전담 시간표에서 배정하세요.');
            return;
        }
    }
    
    if(editorState.selectedSubj) state.timetables[k][r][c] = editorState.selectedSubj;
    else state.timetables[k][r][c] = '';
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

