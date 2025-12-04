// Tab 1: 시설 시간표

function renderTab1() {
    // 시설 이름 업데이트
    updateFacilityNameDisplay();
    
    ['gym', 'lib'].forEach(t => {
        if (!state.facilities[t] || state.facilities[t].length < 7) {
            state.facilities[t] = grid(7, 5);
        }
        
        let h = '';
        for(let i = 0; i < 7; i++) {
            const rowClass = (i === 3) ? 'bg-pink-50' : (i === 4) ? 'bg-indigo-50' : 'bg-gray-50';
            h += `<tr><td class="${rowClass} font-bold text-xs">${PERIOD_LABELS[i]}</td>`;
            for(let j = 0; j < 5; j++) {
                const val = state.facilities[t][i] ? state.facilities[t][i][j] || '' : '';
                const cellClass = (i === 3) ? 'bg-pink-50/30' : (i === 4) ? 'bg-indigo-50/30' : '';
                h += `<td class="${cellClass}"><input class="grid-input" 
                    data-grid="${t}" data-row="${i}" data-col="${j}"
                    value="${val}" 
                    onchange="fmtFacility(this); updFac('${t}',${i},${j},this.value)" 
                    oninput="fmtFacilityInput(this)" 
                    onblur="fmtFacility(this)"
                    onkeydown="handleGridKeydown(event,'${t}',${i},${j},7,5)"
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
            h += '</tr>';
        }
        document.getElementById(t + '-grid').innerHTML = h;
    });
}

window.updFac = function(t, r, c, v) {
    v = v.trim();
    // 쉼표를 슬래시로 변환
    v = v.replace(/,/g, '/');
    
    if (v) {
        const classes = v.split('/').map(x => x.trim()).filter(x => x);
        const otherFac = t === 'gym' ? 'lib' : 'gym';
        
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
            
            if (state.facilities[otherFac][r] && state.facilities[otherFac][r][c]) {
                const otherClasses = state.facilities[otherFac][r][c].split('/').map(x => x.trim());
                if (otherClasses.includes(cls)) {
                    showAlert(`${cls}은(는) 이미 같은 시간에 ${otherFac === 'gym' ? '체육관' : '도서관'}에 배정되어 있습니다.`);
                    renderTab1();
                    return;
                }
            }
        }
    }
    
    if (!state.facilities[t][r]) state.facilities[t][r] = Array(5).fill('');
    state.facilities[t][r][c] = v;
    saveData({facilities: state.facilities});
    renderTab1();
};

window.resetFacility = function(type) {
    const name = type === 'gym' ? '체육관' : '도서관';
    showConfirm(`${name} 시간표를 초기화하시겠습니까?`, () => {
        state.facilities[type] = grid(7, 5);
        saveData({ facilities: state.facilities });
        renderTab1();
    });
};



