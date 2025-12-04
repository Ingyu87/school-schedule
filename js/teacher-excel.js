// 전담 교사 시간표 엑셀 생성

// 개별 전담 교사 시간표 엑셀 생성
window.downloadTeacherExcel = function(teacherIdx) {
    const teacher = state.teachers[teacherIdx];
    if (!teacher) {
        showAlert('교사 정보를 찾을 수 없습니다.', 'error');
        return;
    }
    
    try {
        const wb = XLSX.utils.book_new();
        const sheetData = generateTeacherTimetableData(teacher);
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        
        // 열 너비 설정
        ws['!cols'] = [
            { wch: 8 },  // 요일/시간
            { wch: 12 }, // 월
            { wch: 12 }, // 화
            { wch: 12 }, // 수
            { wch: 12 }, // 목
            { wch: 12 }  // 금
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, teacher.name);
        
        const fileName = `${teacher.name}_시간표_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert(`${teacher.name} 시간표가 저장되었습니다!`, 'success');
    } catch (error) {
        console.error('엑셀 생성 오류:', error);
        showAlert('엑셀 파일 생성 중 오류가 발생했습니다.', 'error');
    }
};

// 전체 전담 교사 시간표 엑셀 생성 (세 번째 사진 형식)
window.generateAllTeachersExcel = function() {
    try {
        const wb = XLSX.utils.book_new();
        
        // 각 전담 교사별로 시트 생성
        state.teachers.forEach(teacher => {
            const sheetData = generateTeacherTimetableData(teacher);
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            
            // 열 너비 설정
            ws['!cols'] = [
                { wch: 8 },  // 요일/시간
                { wch: 12 }, // 월
                { wch: 12 }, // 화
                { wch: 12 }, // 수
                { wch: 12 }, // 목
                { wch: 12 }  // 금
            ];
            
            // 시트 이름은 교사 이름 (최대 31자)
            const sheetName = teacher.name.substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
        
        const fileName = `전담교사_전체시간표_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert('전체 전담 교사 시간표가 저장되었습니다!', 'success');
    } catch (error) {
        console.error('엑셀 생성 오류:', error);
        showAlert('엑셀 파일 생성 중 오류가 발생했습니다.', 'error');
    }
};

// 전담 교사 시간표 데이터 생성 (세 번째 사진 형식)
function generateTeacherTimetableData(teacher) {
    const data = [];
    
    // 헤더: 교사 이름과 과목 정보
    const teacherInfo = teacher.name;
    const subjects = getTeacherSubjects(teacher);
    data.push([`${teacherInfo} (${subjects})`]);
    data.push([]); // 빈 행
    
    // 시간표 헤더
    data.push(['요일', '월', '화', '수', '목', '금']);
    data.push(['시간', '', '', '', '', '']);
    
    // 6개 교시
    const periodLabels = ['1', '2', '3', '4', '5', '6'];
    
    for (let period = 0; period < 6; period++) {
        const row = [periodLabels[period]];
        
        // 월~금 (5일)
        for (let day = 0; day < 5; day++) {
            const cellValue = teacher.schedule[period][day] || '';
            
            // 셀 값 포맷팅
            let formattedValue = '';
            
            if (cellValue) {
                const entries = parseScheduleEntries(cellValue);
                const formatted = entries.map(entry => {
                    if (entry.subject) {
                        return `${entry.classKey}(${entry.subject})`;
                    } else {
                        return entry.classKey;
                    }
                }).join('/');
                formattedValue = formatted;
            }
            
            row.push(formattedValue);
        }
        
        data.push(row);
    }
    
    return data;
}

// 교사가 담당하는 과목 목록 가져오기
function getTeacherSubjects(teacher) {
    const subjects = new Set();
    
    (teacher.assignments || []).forEach(a => {
        const subj = a.subject.replace('[특수]', '');
        subjects.add(subj);
    });
    
    return Array.from(subjects).join(', ');
}

// 스케줄 엔트리 파싱
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


