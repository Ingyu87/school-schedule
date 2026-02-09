// 상태 관리
const SUBJECT_NAMES = ["영어","과학","음악","미술","체육","실과","사회","도덕","보건","체육(보건)","국어","수학","창체","안전한생활","통합"];
const CURRICULUM_COLS = ['국어','수학','사회','과학','영어','음악','미술','체육','실과','도덕','통합','창체'];
// 동적 그룹 라벨 생성 함수
function getGroupGrades(groupKey) {
    const grades = [];
    for (let g = 1; g <= 6; g++) {
        const grp = state.scheduleGroups?.[`${g}학년`] || (g <= 3 ? 'lower' : 'upper');
        if (grp === groupKey) grades.push(g);
    }
    return grades;
}

function getUpperGradeLabel() {
    const grades = getGroupGrades('upper');
    return grades.length > 0 ? grades.join(',') + '학년' : '2그룹';
}

function getLowerGradeLabel() {
    const grades = getGroupGrades('lower');
    return grades.length > 0 ? grades.join(',') + '학년' : '1그룹';
}

function getPeriods() {
    return ["1교시","2교시","3교시",`4교시(${getUpperGradeLabel()})`,`4교시(${getLowerGradeLabel()})`,"5교시","6교시"];
}

function getPeriodLabels() {
    return ["1교시","2교시","3교시",`4교시<br><span class='text-xs text-pink-500'>(${getUpperGradeLabel()})</span>`,`4교시<br><span class='text-xs text-indigo-500'>(${getLowerGradeLabel()})</span>`,"5교시","6교시"];
}

// 하위 호환을 위해 초기값 유지 (동적 함수 사용을 권장)
const PERIODS = ["1교시","2교시","3교시","4교시(4~6학년)","4교시(1~3학년)","5교시","6교시"];
const PERIOD_LABELS = ["1교시","2교시","3교시","4교시<br><span class='text-xs text-pink-500'>(4~6학년)</span>","4교시<br><span class='text-xs text-indigo-500'>(1~3학년)</span>","5교시","6교시"];

function grid(r, c) { 
    return Array(r).fill(null).map(() => Array(c).fill('')); 
}

// 학년의 일과 그룹 반환 ('lower' 또는 'upper')
function getScheduleGroup(gradeNum) {
    const gr = typeof gradeNum === 'number' ? `${gradeNum}학년` : gradeNum;
    return state.scheduleGroups?.[gr] || (parseInt(gr) <= 3 ? 'lower' : 'upper');
}

// 학년이 lower 그룹인지
function isLowerGroup(gradeNum) {
    return getScheduleGroup(gradeNum) === 'lower';
}

let state = {
    config: { 
        '1학년': { classes: 4 }, 
        '2학년': { classes: 4 }, 
        '3학년': { classes: 5 }, 
        '4학년': { classes: 5 }, 
        '5학년': { classes: 6 }, 
        '6학년': { classes: 6 } 
    },
    dailyCounts: {
        '1학년': [4,5,5,5,4], 
        '2학년': [4,5,5,5,4], 
        '3학년': [5,5,5,6,5], 
        '4학년': [5,5,5,6,5], 
        '5학년': [6,6,5,6,6], 
        '6학년': [6,6,5,6,6]
    },
    targetJeondam: {
        '1학년': 0, '2학년': 0, '3학년': 3, '4학년': 3, '5학년': 6, '6학년': 8
    },
    targetBogun: {
        '1학년': 0, '2학년': 0, '3학년': 0, '4학년': 0, '5학년': 0.5, '6학년': 0
    },
    facilities: { gym: grid(7,5), lib: grid(7,5) },
    facilityNames: {
        gym: '느티홀 (체육관)',
        lib: '글샘터 (도서관)'
    },
    facilityList: ['gym', 'lib'], // 시설 ID 목록 (동적 추가 가능)
    scheduleTimes: {
        // 1그룹 (점심 먼저)
        lower: {
            '1교시': '09:00 ~ 09:40',
            '2교시': '09:50 ~ 10:30',
            '3교시': '10:40 ~ 11:20',
            '4교시': '12:10 ~ 12:50',
            '점심': '11:20 ~ 12:10',
            '5교시': '13:00 ~ 13:40',
            '6교시': '13:50 ~ 14:30'
        },
        // 2그룹 (수업 먼저)
        upper: {
            '1교시': '09:00 ~ 09:40',
            '2교시': '09:50 ~ 10:30',
            '3교시': '10:40 ~ 11:20',
            '4교시': '11:30 ~ 12:10',
            '점심': '12:10 ~ 13:00',
            '5교시': '13:00 ~ 13:40',
            '6교시': '13:50 ~ 14:30'
        }
    },
    scheduleGroups: {
        '1학년': 'lower', '2학년': 'lower', '3학년': 'lower',
        '4학년': 'upper', '5학년': 'upper', '6학년': 'upper'
    },
    roles: {},
    allocations: { common: {}, extra: {} },
    teacherConfig: {
        count: 6,
        teachers: [
            {name: '전담1', targetHours: 21},
            {name: '전담2', targetHours: 21},
            {name: '전담3', targetHours: 21},
            {name: '전담4', targetHours: 21},
            {name: '전담5', targetHours: 21},
            {name: '전담6', targetHours: 21}
        ]
    },
    teachers: [
        {id:1, name:'전담1', assignments: [], schedule: grid(6,5), completed: false}, 
        {id:2, name:'전담2', assignments: [], schedule: grid(6,5), completed: false},
        {id:3, name:'전담3', assignments: [], schedule: grid(6,5), completed: false}, 
        {id:4, name:'전담4', assignments: [], schedule: grid(6,5), completed: false},
        {id:5, name:'전담5', assignments: [], schedule: grid(6,5), completed: false}, 
        {id:6, name:'전담6', assignments: [], schedule: grid(6,5), completed: false}
    ],
    specialSupport: [],
    timetables: {},
    timetableCompletion: {}, // {'1학년-1반': false, '1학년-2반': false, ...}
    tabCompletion: {
        tab0: false, // 기초 설정 완료 여부
        tab1: false  // 시설 시간표 완료 여부
    },
    facilityCompletion: {}, // {'gym': false, 'lib': false, ...} - 각 시설별 완료 여부
    curriculum: {
        '1학년': { '국어': 6, '수학': 4, '사회':0, '과학':0, '영어':0, '음악':0, '미술':0, '체육':0, '실과':0, '도덕':0, '통합': 10, '창체': 3 },
        '2학년': { '국어': 6, '수학': 4, '사회':0, '과학':0, '영어':0, '음악':0, '미술':0, '체육':0, '실과':0, '도덕':0, '통합': 10, '창체': 3 },
        '3학년': { '국어': 5, '수학': 4, '사회': 3, '과학': 3, '영어': 2, '음악': 2, '미술': 2, '체육': 2, '실과':0, '도덕': 1, '통합': 0, '창체': 2 },
        '4학년': { '국어': 5, '수학': 4, '사회': 3, '과학': 3, '영어': 2, '음악': 2, '미술': 2, '체육': 2, '실과':0, '도덕': 1, '통합': 0, '창체': 2 },
        '5학년': { '국어': 5, '수학': 4, '사회': 3, '과학': 3, '영어': 3, '음악': 2, '미술': 1, '체육': 3, '실과': 2, '도덕': 1, '통합': 0, '창체': 2 },
        '6학년': { '국어': 5, '수학': 5, '사회': 3, '과학': 3, '영어': 3, '음악': 2, '미술': 1, '체육': 3, '실과': 1, '도덕': 1, '통합': 0, '창체': 2 }
    }
};

let editorState = { classKey: null, selectedSubj: null };
let activeTab = 'tab0';

// 시간표 초기화
function initTimetables() {
    Object.keys(state.config).forEach(gr => {
        for(let i = 1; i <= state.config[gr].classes; i++) {
            const k = `${gr}-${i}반`;
            if(!state.timetables[k]) state.timetables[k] = grid(6,5);
            if(state.timetableCompletion[k] === undefined) state.timetableCompletion[k] = false;
        }
    });
}


