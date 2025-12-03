// 전교 기준 시간표 엑셀 생성

window.generateFinalExcel = function() {
    try {
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        
        // 시트 데이터 생성
        const sheetData = generateSchoolTimetableData();
        
        // 워크시트 생성
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        
        // 열 너비 설정
        const colWidths = [
            { wch: 8 },  // 학년
            { wch: 6 },  // 반
            { wch: 8 },  // 교시
        ];
        // 월~금 각 교시 (1~6)
        for (let i = 0; i < 30; i++) {
            colWidths.push({ wch: 12 });
        }
        ws['!cols'] = colWidths;
        
        // 스타일 적용 (병합 셀)
        const merges = [];
        
        // 헤더 병합 (월~금)
        merges.push({ s: { r: 0, c: 3 }, e: { r: 0, c: 8 } });   // 월
        merges.push({ s: { r: 0, c: 9 }, e: { r: 0, c: 14 } });  // 화
        merges.push({ s: { r: 0, c: 15 }, e: { r: 0, c: 20 } }); // 수
        merges.push({ s: { r: 0, c: 21 }, e: { r: 0, c: 26 } }); // 목
        merges.push({ s: { r: 0, c: 27 }, e: { r: 0, c: 32 } }); // 금
        
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
    
    // 헤더 1행: 요일
    const headerRow1 = ['학년', '반', '교시', '월', '', '', '', '', '', '화', '', '', '', '', '', '수', '', '', '', '', '', '목', '', '', '', '', '', '금', '', '', '', '', ''];
    data.push(headerRow1);
    
    // 헤더 2행: 교시
    const headerRow2 = ['', '', '', '1', '2', '3', '4', '5', '6', '1', '2', '3', '4', '5', '6', '1', '2', '3', '4', '5', '6', '1', '2', '3', '4', '5', '6', '1', '2', '3', '4', '5', '6'];
    data.push(headerRow2);
    
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
            
            // 6개 교시 각각의 행 생성
            for (let period = 0; period < 6; period++) {
                const row = [
                    period === 0 ? gradeLabel : '', // 학년 (첫 교시에만)
                    period === 0 ? classLabel : '',  // 반 (첫 교시에만)
                    period + 1 // 교시
                ];
                
                // 월~금 (5일)
                for (let day = 0; day < 5; day++) {
                    const cellValue = timetable[period][day] || '';
                    
                    // 셀 값 포맷팅
                    let formattedValue = cellValue;
                    
                    // 전담 교사 과목인지 확인 (파란색 표시)
                    const isJeondam = isJeondamSubject(gradeNum, c, cellValue, period, day);
                    
                    // 시설 사용 확인 (◎ 표시)
                    const facilitySymbol = getFacilitySymbol(gradeNum, c, period, day);
                    
                    if (facilitySymbol) {
                        formattedValue = facilitySymbol + formattedValue;
                    }
                    
                    row.push(formattedValue);
                }
                
                data.push(row);
            }
        }
    });
    
    return data;
}

// 전담 과목인지 확인
function isJeondamSubject(gradeNum, classNum, subject, period, day) {
    if (!subject) return false;
    
    const classKey = `${gradeNum}-${classNum}`;
    
    // 전담 교사 시간표에서 확인
    for (let teacher of state.teachers) {
        const schedule = teacher.schedule;
        if (!schedule || !schedule[period]) continue;
        
        const cellValue = schedule[period][day] || '';
        
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

// 시설 사용 확인 및 기호 반환
function getFacilitySymbol(gradeNum, classNum, period, day) {
    const classKey = `${gradeNum}-${classNum}`;
    
    // 체육관 확인
    const gymValue = state.facilities.gym[period][day] || '';
    if (gymValue.includes(classKey)) {
        return '◎'; // 체육관
    }
    
    // 도서관 확인
    const libValue = state.facilities.lib[period][day] || '';
    if (libValue.includes(classKey)) {
        return '◉'; // 도서관
    }
    
    return '';
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

