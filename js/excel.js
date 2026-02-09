// 전교 기준 시간표 엑셀 생성

window.generateFinalExcel = function() {
    try {
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        
        // 시트 데이터 생성
        const { data: sheetData, styles: sheetStyles } = generateSchoolTimetableData();
        
        // 워크시트 생성
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        
        // 열 너비 설정
        const colWidths = [
            { wch: 8 },  // 학년
            { wch: 6 },  // 반
        ];
        // 월~금 각 교시 (1~6)
        for (let i = 0; i < 30; i++) {
            colWidths.push({ wch: 12 });
        }
        ws['!cols'] = colWidths;
        
        // 스타일 적용 (병합 셀)
        const merges = [];
        
        // 헤더 병합 (월~금)
        merges.push({ s: { r: 0, c: 2 }, e: { r: 0, c: 7 } });   // 월
        merges.push({ s: { r: 0, c: 8 }, e: { r: 0, c: 13 } });  // 화
        merges.push({ s: { r: 0, c: 14 }, e: { r: 0, c: 19 } }); // 수
        merges.push({ s: { r: 0, c: 20 }, e: { r: 0, c: 25 } }); // 목
        merges.push({ s: { r: 0, c: 26 }, e: { r: 0, c: 31 } }); // 금
        
        // 학년/반 병합
        let currentRow = 2;
        ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'].forEach(gr => {
            const classCount = state.config[gr]?.classes || 0;
            if (classCount > 0) {
                // 학년 열 병합
                merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow + classCount - 1, c: 0 } });
                currentRow += classCount;
            }
        });
        
        ws['!merges'] = merges;
        
        // 셀 스타일 적용 (전담: 주황색, 시설: 초록색)
        if (sheetStyles && Array.isArray(sheetStyles)) {
            const facilityFill = { patternType: 'solid', fgColor: { rgb: 'FFC6EFCE' } };
            const teacherFill = { patternType: 'solid', fgColor: { rgb: 'FFFFE0B2' } };
            
            sheetStyles.forEach((row, r) => {
                if (!row) return;
                row.forEach((type, c) => {
                    if (!type) return;
                    const cellAddr = XLSX.utils.encode_cell({ r, c });
                    const cell = ws[cellAddr];
                    if (!cell) return;
                    if (type === 'facility') cell.s = { ...(cell.s || {}), fill: facilityFill };
                    if (type === 'teacher') cell.s = { ...(cell.s || {}), fill: teacherFill };
                });
            });
        }
        
        // 구분선(요일/학년) 강조
        const range = XLSX.utils.decode_range(ws['!ref']);
        const thin = { style: 'thin', color: { rgb: 'FFD0D0D0' } };
        const thick = { style: 'medium', color: { rgb: 'FF808080' } };
        
        // 학년별 마지막 행 계산 (헤더 2행 이후부터 시작)
        const gradeEndRows = [];
        let rowCursor = 2;
        ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'].forEach(gr => {
            const classCount = state.config[gr]?.classes || 0;
            if (classCount > 0) {
                const endRow = rowCursor + classCount - 1;
                gradeEndRows.push(endRow);
                rowCursor += classCount;
            }
        });
        const gradeEndSet = new Set(gradeEndRows);
        const dayBoundaryCols = new Set([7, 13, 19, 25, 31]); // 월~금 끝 열
        
        for (let r = range.s.r; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cellAddr = XLSX.utils.encode_cell({ r, c });
                const cell = ws[cellAddr];
                if (!cell) continue;
                
                const border = {
                    top: thin,
                    bottom: thin,
                    left: thin,
                    right: thin
                };
                
                if (dayBoundaryCols.has(c)) {
                    border.right = thick;
                }
                if (gradeEndSet.has(r)) {
                    border.bottom = thick;
                }
                
                cell.s = { ...(cell.s || {}), border };
            }
        }
        
        // 시트 추가
        XLSX.utils.book_append_sheet(wb, ws, '전교 기준 시간표');
        
        // 파일 다운로드
        const fileName = `가동초_전교기준시간표_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert('전교 기준 시간표 엑셀 파일이 생성되었습니다!', 'success');
    } catch (error) {
        console.error('엑셀 생성 오류:', error);
        showAlert('엑셀 파일 생성 중 오류가 발생했습니다.', 'error');
    }
};

function generateSchoolTimetableData() {
    const data = [];
    const styles = [];
    
    // 헤더 1행: 요일
    const headerRow1 = ['학년', '반', '월', '', '', '', '', '', '화', '', '', '', '', '', '수', '', '', '', '', '', '목', '', '', '', '', '', '금', '', '', '', '', ''];
    data.push(headerRow1);
    styles.push([]);
    
    // 헤더 2행: 교시
    const headerRow2 = ['', '', '1', '2', '3', '4', '5', '6', '1', '2', '3', '4', '5', '6', '1', '2', '3', '4', '5', '6', '1', '2', '3', '4', '5', '6', '1', '2', '3', '4', '5', '6'];
    data.push(headerRow2);
    styles.push([]);
    
    // 각 학년/반별 데이터
    ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'].forEach(gr => {
        const classCount = state.config[gr]?.classes || 0;
        const gradeNum = parseInt(gr);
        
        for (let c = 1; c <= classCount; c++) {
            const classKey = `${gr}-${c}반`;
            const timetable = state.timetables[classKey];
            if (!timetable) continue;
            
            // 학년, 반 정보
            const gradeLabel = gr.replace('학년', '');
            const classLabel = c;
            
            const row = [gradeLabel, classLabel];
            const styleRow = ['', ''];
            
            // 월~금 * 교시 1~6
            for (let day = 0; day < 5; day++) {
                for (let period = 0; period < 6; period++) {
                    const cellValue = (timetable[period] && timetable[period][day]) || '';
                    const facilityNames = getFacilityNamesForClass(gradeNum, c, period, day);
                    const teacherSubj = getTeacherSubjectForClass(gradeNum, c, period, day);
                    let formattedValue = cellValue;
                    let type = '';
                    
                    if (facilityNames.length) {
                        formattedValue = facilityNames.join('+');
                        type = 'facility';
                    } else if (!formattedValue && teacherSubj) {
                        formattedValue = teacherSubj;
                        type = 'teacher';
                    } else if (formattedValue && teacherSubj && formattedValue === teacherSubj) {
                        type = 'teacher';
                    }
                    
                    row.push(formattedValue);
                    styleRow.push(type);
                }
            }
            
            data.push(row);
            styles.push(styleRow);
        }
    });
    
    return { data, styles };
}

// 학급 시간표 행 → 교사/시설 시간표 행 (7행) 매핑
function classRowToTeacherRow(period, gradeNum) {
    if (period < 3) return period;
    if (period === 3) return isLowerGroup(gradeNum) ? 4 : 3;
    return period + 1; // 4→5, 5→6
}

// 전담 과목인지 확인
function isJeondamSubject(gradeNum, classNum, subject, period, day) {
    if (!subject) return false;
    
    const classKey = `${gradeNum}-${classNum}`;
    const teacherRow = classRowToTeacherRow(period, gradeNum);
    
    // 전담 교사 시간표에서 확인
    for (let teacher of state.teachers) {
        const schedule = teacher.schedule;
        if (!schedule || !schedule[teacherRow]) continue;
        
        const cellValue = schedule[teacherRow][day] || '';
        
        // 파싱
        const entries = parseScheduleEntries(cellValue);
        
        for (let entry of entries) {
            if (entry.classKey === classKey && entry.subject === subject) {
                return true;
            }
        }
    }
    
    return false;
}

// 시설 사용 확인 및 기호 반환 (동적 시설 지원)
function getFacilitySymbol(gradeNum, classNum, period, day) {
    const classKey = `${gradeNum}-${classNum}`;
    
    // 시설 행 계산 (학급 시간표 행 → 시설 시간표 행)
    let facRow = period;
    if (period === 3) {
        facRow = isLowerGroup(gradeNum) ? 4 : 3;
    } else if (period >= 4) {
        facRow = period + 1;
    }
    
    if (state.facilityList) {
        const symbols = [];
        state.facilityList.forEach((facId, idx) => {
            if (state.facilities[facId] && state.facilities[facId][facRow]) {
                const facValue = state.facilities[facId][facRow][day] || '';
                if (facValue.includes(classKey)) {
                    // 기본 시설은 기존 기호 사용, 추가 시설은 숫자
                    if (facId === 'gym') {
                        symbols.push('◎');
                    } else if (facId === 'lib') {
                        symbols.push('◉');
                    } else {
                        symbols.push(`${idx + 1}`);
                    }
                }
            }
        });
        return symbols.join('');
    } else {
        // 기존 호환성
        if (state.facilities.gym && state.facilities.gym[facRow]) {
            const gymValue = state.facilities.gym[facRow][day] || '';
            if (gymValue.includes(classKey)) {
                return '◎';
            }
        }
        
        if (state.facilities.lib && state.facilities.lib[facRow]) {
            const libValue = state.facilities.lib[facRow][day] || '';
            if (libValue.includes(classKey)) {
                return '◉';
            }
        }
    }
    
    return '';
}

// 시설 이름 반환 (동적 시설 지원)
function getFacilityNamesForClass(gradeNum, classNum, period, day) {
    const classKey = `${gradeNum}-${classNum}`;
    let facRow = period;
    if (period === 3) {
        facRow = isLowerGroup(gradeNum) ? 4 : 3;
    } else if (period >= 4) {
        facRow = period + 1;
    }
    
    const names = new Set();
    if (state.facilityList) {
        state.facilityList.forEach(facId => {
            if (state.facilities[facId] && state.facilities[facId][facRow]) {
                const facValue = state.facilities[facId][facRow][day] || '';
                if (facValue.includes(classKey)) {
                    names.add(state.facilityNames?.[facId] || facId);
                }
            }
        });
    } else {
        if (state.facilities.gym && state.facilities.gym[facRow]) {
            const gymValue = state.facilities.gym[facRow][day] || '';
            if (gymValue.includes(classKey)) {
                names.add(state.facilityNames?.gym || '느티홀 (체육관)');
            }
        }
        
        if (state.facilities.lib && state.facilities.lib[facRow]) {
            const libValue = state.facilities.lib[facRow][day] || '';
            if (libValue.includes(classKey)) {
                names.add(state.facilityNames?.lib || '글샘터 (도서관)');
            }
        }
    }
    
    return Array.from(names);
}

// 전담 교사 시간표에서 과목 추출
function getTeacherSubjectForClass(gradeNum, classNum, period, day) {
    const classKey = `${gradeNum}-${classNum}`;
    const subjects = new Set();
    const teacherRow = classRowToTeacherRow(period, gradeNum);
    
    state.teachers.forEach(t => {
        const schedule = t.schedule;
        if (!schedule || !schedule[teacherRow]) return;
        const cellValue = schedule[teacherRow][day] || '';
        if (!cellValue) return;
        
        const entries = parseScheduleEntries(cellValue);
        entries.forEach(entry => {
            if (entry.classKey !== classKey) return;
            let displaySubj = entry.subject;
            if (!displaySubj) {
                const assign = (t.assignments || []).find(a => {
                    const subj = a.subject.replace('[특수]', '');
                    return a.grade == gradeNum && a.classNum == classNum && !subj.includes('보건');
                });
                if (assign) displaySubj = assign.subject.replace('[특수]', '');
            }
            if (displaySubj && !displaySubj.includes('보건')) {
                subjects.add(displaySubj);
            }
        });
    });
    
    return Array.from(subjects).join(', ');
}

// 스케줄 엔트리 파싱 (utils.js에 있는 함수와 동일)
function parseScheduleEntries(cellValue) {
    if (!cellValue || cellValue.trim() === '') return [];
    
    const entries = [];
    const parts = cellValue.split('/');
    
    parts.forEach(part => {
        part = part.trim();
        if (!part) return;
        
        const match = part.match(/^([\d-]+)(?:\(([^)]+)\))?$/);
        if (match) {
            const classKey = match[1];
            const subject = match[2] || null;
            entries.push({ classKey, subject });
        }
    });
    
    return entries;
}

// 시설 시간표 엑셀 생성
window.downloadFacilityExcel = function(type) {
    // state에서 시설 이름 가져오기
    const facilityFullName = state.facilityNames?.[type] || (type === 'gym' ? '느티홀 (체육관)' : '글샘터 (도서관)');
    const facilityName = type === 'gym' ? '체육관' : '도서관';
    const facilityNameEng = type === 'gym' ? '체육관' : '도서관';
    const fileName = facilityFullName.replace(/[()]/g, ''); // 괄호 제거
    
    try {
        const wb = XLSX.utils.book_new();
        // 교시 레이블 (엑셀용 텍스트만)
        const periodLabels = getPeriods();
        
        // 헤더
        const data = [['교시', '월', '화', '수', '목', '금']];
        
        // 각 교시별 데이터
        const facility = state.facilities[type];
        if (!facility) {
            showAlert(`${facilityName} 시간표 데이터가 없습니다.`, 'error');
            return;
        }
        
        for (let i = 0; i < 7; i++) {
            const row = [periodLabels[i] || `교시${i + 1}`];
            for (let j = 0; j < 5; j++) {
                const val = facility[i] ? (facility[i][j] || '') : '';
                row.push(val);
            }
            data.push(row);
        }
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // 열 너비 설정
        ws['!cols'] = [
            { wch: 18 },  // 교시
            { wch: 15 }, // 월
            { wch: 15 }, // 화
            { wch: 15 }, // 수
            { wch: 15 }, // 목
            { wch: 15 }  // 금
        ];
        
        const sheetName = facilityNameEng;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        const fileDate = new Date().toISOString().split('T')[0];
        const finalFileName = `${fileName}_시간표_${fileDate}.xlsx`;
        XLSX.writeFile(wb, finalFileName);
        
        showAlert(`${facilityName} 시간표가 저장되었습니다!`, 'success');
    } catch (error) {
        console.error('엑셀 생성 오류:', error);
        showAlert('엑셀 파일 생성 중 오류가 발생했습니다.', 'error');
    }
};


