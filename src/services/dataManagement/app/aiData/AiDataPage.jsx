import { useState, useContext } from 'react';
import {
    Search, RotateCcw, Download, ExternalLink, Play, AlertTriangle,
    CheckCircle2, Trash2
} from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import { modalContext } from "@/components/common/Modal.jsx";

const DISTRIBUTION_OPTIONS = [
    { text: "브라우저 실행 (EtoE)", value: "browser" },
    { text: "엔진 실행 (API 호출)", value: "engine" }
];

const SCREEN_CONDITION_OPTIONS = [
    { text: "미포함", value: "exclude" },
    { text: "포함", value: "include" }
];

// 전체 응답자 모크 데이터 리스트 (스크린샷 기반 설계)
const INITIAL_RESPONDENTS = [
    {
        id: "999619001", status: "pass", finalQuestion: "-", message: "Completed (설문 완료)", duration: "88.5s",
        errorCategory: "", errorDetail: "",
        logs: [
            "501 [시스템] 봇 세션 초기화 완료. 대상 URL: https://rpssurvey.hrcglobal.com/?t=tapi&pn=q26100",
            "502 [시스템] PID 자동 채번 완료: 999619001",
            "503 [브라우저] 설문 시작 페이지 진입 성공.",
            "504 [브라우저] q1 ~ q10 문항 자동 입력 완료.",
            "505 [브라우저] q11 (성별) -> '여성' 응답 선택.",
            "506 [브라우저] q12 (결혼 여부) -> '기혼' 응답 선택.",
            "507 [브라우저] q13 ~ q25 문항 자동 응답 완료.",
            "508 [브라우저] q26 (자녀수) -> '2명' 응답 - 조건식 상호 모순 검사 통과.",
            "509 [브라우저] q27 ~ q34 문항 최종 입력 완료.",
            "510 [시스템] 설문 완료 페이지 감지. 응답 패킷 저장 완료 (수행 시간: 88.5s)."
        ]
    },
    {
        id: "999619002", status: "defect", finalQuestion: "스크리닝 42번", message: "-", duration: "212.7s",
        errorCategory: "설문 응답 오류 (6회 교정 실패)",
        errorDetail: "sq42_op32 선택 후 조건 로직이 예상 경로로 분기하지 않음. 봇이 6회 재시도했으나 다음 문항으로 진행 불가 -> 타임아웃 처리.",
        logs: [
            "530 [브라우저] parsedRealVars: [10, sq10, sq20, sq30, sq31, sq32, sq40, sq41, sq42 ...]",
            "531 [브라우저] BOT_DEBUG ALL INPUTS: [sq42_op32, sq42_op33, sq42_op34, keyword]",
            "532 [브라우저] BOT_DEBUG INPUT: sq42_op32 visible: true cleaned: sq42",
            "533 [브라우저] BOT_DEBUG parsedrealvars: [10, sq10, sq20, sq30, sq31, sq32 ...]",
            "534 [경고] 조건 분기 경로 불일치 - 재시도 4/6",
            "535 [경고] 조건 분기 경로 불일치 - 재시도 5/6",
            "536 [오류] 6회 교정 실패 -> 타임아웃, 결함으로 종료."
        ]
    },
    {
        id: "999619003", status: "pass", finalQuestion: "-", message: "Completed (설문 완료)", duration: "83.7s",
        errorCategory: "", errorDetail: "",
        logs: [
            "101 [시스템] 봇 세션 초기화 완료. 대상 URL: https://rpssurvey.hrcglobal.com/?t=tapi&pn=q26100",
            "102 [시스템] PID 자동 채번 완료: 999619003",
            "103 [브라우저] q1 ~ q15 문항 자동 응답 완료.",
            "104 [브라우저] q16 ~ q34 문항 최종 입력 완료.",
            "105 [시스템] 설문 완료 페이지 감지. 응답 패킷 저장 완료 (수행 시간: 83.7s)."
        ]
    },
    {
        id: "999619004", status: "pass", finalQuestion: "-", message: "Completed (설문 완료)", duration: "79.2s",
        errorCategory: "", errorDetail: "",
        logs: [
            "201 [시스템] 봇 세션 초기화 완료. 대상 URL: https://rpssurvey.hrcglobal.com/?t=tapi&pn=q26100",
            "202 [시스템] PID 자동 채번 완료: 999619004",
            "203 [브라우저] q1 ~ q34 문항 전체 무인 응답 처리 완료.",
            "204 [시스템] 설문 완료 페이지 감지. 응답 패킷 저장 완료 (수행 시간: 79.2s)."
        ]
    },
    {
        id: "999619005", status: "defect", finalQuestion: "문항 18번", message: "-", duration: "154.0s",
        errorCategory: "논리 모순 감지 (비정상 응답 차단)",
        errorDetail: "q18 문항에서 이전 문항(q12) 응답 결과인 '미혼'과 대치되는 '자녀 수 2명' 선택 시도. 봇이 논리 모순을 감지하여 응답 중단 처리.",
        logs: [
            "412 [브라우저] q12 (결혼 여부) -> '미혼' 응답 완료.",
            "413 [브라우저] q13 ~ q17 문항 응답 완료.",
            "414 [브라우저] q18 (자녀 정보 입력) 진입.",
            "415 [시스템] 자녀 정보 입력란 활성화 시도 감지.",
            "416 [경고] '미혼' 응답자 세그먼트에서 자녀 문항 입력 시도 검출.",
            "417 [오류] 설문 스크립트 논리 검증 실패 - q12(미혼)와 q18(자녀수 2명) 상호 논리적 모순 감지. 봇 실행 중단."
        ]
    },
    {
        id: "999619006", status: "pass", finalQuestion: "-", message: "Completed (설문 완료)", duration: "85.6s",
        errorCategory: "", errorDetail: "",
        logs: [
            "601 [시스템] 봇 세션 초기화 완료. 대상 URL: https://rpssurvey.hrcglobal.com/?t=tapi&pn=q26100",
            "602 [시스템] PID 자동 채번 완료: 999619006",
            "603 [브라우저] q1 ~ q34 문항 무결성 응답 통과.",
            "604 [시스템] 설문 완료 페이지 감지. 응답 패킷 저장 완료 (수행 시간: 85.6s)."
        ]
    },
    {
        id: "999619007", status: "pass", finalQuestion: "-", message: "Completed (설문 완료)", duration: "91.1s",
        errorCategory: "", errorDetail: "",
        logs: [
            "701 [시스템] 봇 세션 초기화 완료. 대상 URL: https://rpssurvey.hrcglobal.com/?t=tapi&pn=q26100",
            "702 [시스템] PID 자동 채번 완료: 999619007",
            "703 [브라우저] q1 ~ q34 문항 응답 통과 및 수집 완료.",
            "704 [시스템] 설문 완료 페이지 감지. 응답 패킷 저장 완료 (수행 시간: 91.1s)."
        ]
    }
];

const AiDataPage = () => {
    const modal = useContext(modalContext);

    // 상단 상태 값
    const [startUrl, setStartUrl] = useState("https://rpssurvey.hrcglobal.com/?t=tapi&pn=q26100");
    const [autoPid, setAutoPid] = useState(true);
    const [testCount, setTestCount] = useState(10);
    const [manualPidList, setManualPidList] = useState("");

    // 응답 생성 전략
    const [distribution, setDistribution] = useState("browser"); // 'browser' | 'engine'
    const [screenCondition, setScreenCondition] = useState("exclude"); // 'exclude' | 'include'

    // 시뮬레이션 상태
    const [isSimulating, setIsSimulating] = useState(false);
    const [progress, setProgress] = useState(100);
    const [respondents, setRespondents] = useState(INITIAL_RESPONDENTS);
    const [selectedPid, setSelectedPid] = useState("999619002"); // 기본으로 스크린샷과 동일하게 999619002 선택
    const [checkedIds, setCheckedIds] = useState([]);

    // 필터 & 검색
    const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'pass' | 'defect'
    const [searchQuery, setSearchQuery] = useState("");

    // 통계 계산
    const currentTotal = respondents.length;
    const passCount = respondents.filter(r => r.status === "pass").length;
    const defectCount = respondents.filter(r => r.status === "defect").length;
    const avgDuration = "128.3s";
    const aiCost = "$0.0033";

    // 검색 & 필터 적용된 리스트
    const filteredRespondents = respondents.filter(r => {
        const matchesStatus =
            filterStatus === "all" ||
            (filterStatus === "pass" && r.status === "pass") ||
            (filterStatus === "defect" && r.status === "defect");
        const matchesSearch = r.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // 전체 선택 핸들러
    const handleHeaderCheckboxChange = (e) => {
        if (e.target.checked) {
            setCheckedIds(filteredRespondents.map(r => r.id));
        } else {
            setCheckedIds([]);
        }
    };

    const handleRowCheckboxChange = (id) => {
        setCheckedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // 행 삭제
    const handleDeleteSelected = () => {
        if (checkedIds.length === 0) {
            modal.showAlert("알림", "삭제할 응답자를 선택해 주세요.");
            return;
        }
        setRespondents(prev => prev.filter(r => !checkedIds.includes(r.id)));
        setCheckedIds([]);
        modal.showAlert("알림", "선택된 응답자 데이터가 임시 삭제되었습니다.");
    };

    // 초기화
    const handleReset = () => {
        setRespondents(INITIAL_RESPONDENTS);
        setSelectedPid("999619002");
        setCheckedIds([]);
        setFilterStatus("all");
        setSearchQuery("");
        setProgress(100);
        modal.showAlert("알림", "응답자 목록이 초기 상태로 복원되었습니다.");
    };

    // 봇 실행 시뮬레이션
    const handleRunSimulation = () => {
        setIsSimulating(true);
        setProgress(0);
        setRespondents([]);
        setSelectedPid("");
        setCheckedIds([]);

        let pct = 0;
        const interval = setInterval(() => {
            pct += 10;
            setProgress(pct);

            // 단계적으로 행 추가 시뮬레이션
            if (pct === 20) {
                setRespondents([INITIAL_RESPONDENTS[0]]);
                setSelectedPid(INITIAL_RESPONDENTS[0].id);
            } else if (pct === 40) {
                setRespondents(prev => [...prev, INITIAL_RESPONDENTS[1]]);
                setSelectedPid(INITIAL_RESPONDENTS[1].id);
            } else if (pct === 60) {
                setRespondents(prev => [...prev, INITIAL_RESPONDENTS[2], INITIAL_RESPONDENTS[3]]);
            } else if (pct === 80) {
                setRespondents(prev => [...prev, INITIAL_RESPONDENTS[4]]);
                setSelectedPid(INITIAL_RESPONDENTS[4].id);
            } else if (pct === 100) {
                setRespondents(INITIAL_RESPONDENTS);
                setSelectedPid("999619002");
                clearInterval(interval);
                setIsSimulating(false);
                modal.showAlert("알림", "AI 응답 봇이 설문지 전체 시나리오를 정상 완료했습니다.");
            }
        }, 600);
    };

    const selectedRespondent = respondents.find(r => r.id === selectedPid);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f1f5f9', overflow: 'hidden' }}>
            <DataHeader title="AI 데이터 생성" />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', boxSizing: 'border-box', minHeight: 0, overflowY: 'auto' }}>

                {/* ── 상단 1: 글로벌 컨트롤 영역 ── */}
                <div style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '8px 16px', display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', shrink: 0
                }}>
                    {/* START URL */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                            START URL
                        </span>
                        <input
                            type="text"
                            value={startUrl}
                            onChange={(e) => setStartUrl(e.target.value)}
                            style={{
                                height: '32px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                fontSize: '12px', color: '#1e293b', outline: 'none', background: '#f8fafc', width: '320px', boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* 테스트 PID 자동생성 토글 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                            PID 자동생성
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
                            <label className="toggle-switch" style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
                                <input type="checkbox" checked={autoPid} onChange={() => setAutoPid(!autoPid)} />
                                <span className="slider round"></span>
                            </label>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', marginLeft: '-6px' }}>
                                {autoPid ? "자동" : "수동"}
                            </span>
                        </div>
                    </div>

                    {/* 조건별 렌더링: 랜덤(카운터) / 수동(직접 입력란) */}
                    {autoPid ? (
                        /* 테스트 생성 개수 카운터 */
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                                생성 개수
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', overflow: 'hidden', height: '32px', width: '90px', boxSizing: 'border-box' }}>
                                <button
                                    onClick={() => setTestCount(prev => Math.max(1, prev - 1))}
                                    style={{ width: '28px', height: '100%', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}
                                >
                                    -
                                </button>
                                <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>{testCount}</div>
                                <button
                                    onClick={() => setTestCount(prev => prev + 1)}
                                    style={{ width: '28px', height: '100%', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* PID 직접 입력 */
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                                PID 목록
                            </span>
                            <input
                                type="text"
                                value={manualPidList}
                                onChange={(e) => setManualPidList(e.target.value)}
                                placeholder="999619001, 999619002 ..."
                                style={{
                                    height: '32px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                    fontSize: '12px', color: '#1e293b', outline: 'none', background: '#fff', width: '180px', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    )}

                    {/* 구분선 */}
                    <div style={{ width: '1px', height: '16px', backgroundColor: '#cbd5e1', alignSelf: 'center' }} />

                    {/* 응답 분포 드롭다운 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                            응답 분포
                        </span>
                        <DropDownList
                            className="ai-kendo-dropdown"
                            popupClass="ai-dropdown-popup"
                            data={DISTRIBUTION_OPTIONS}
                            textField="text"
                            dataItemKey="value"
                            value={DISTRIBUTION_OPTIONS.find(opt => opt.value === distribution) || DISTRIBUTION_OPTIONS[0]}
                            onChange={(e) => setDistribution(e.value.value)}
                            style={{
                                width: '200px', height: '32px', fontSize: '12px', borderRadius: '6px'
                            }}
                        />
                    </div>

                    {/* 스크린 조건 드롭다운 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                            스크린 조건
                        </span>
                        <DropDownList
                            className="ai-kendo-dropdown"
                            popupClass="ai-dropdown-popup"
                            data={SCREEN_CONDITION_OPTIONS}
                            textField="text"
                            dataItemKey="value"
                            value={SCREEN_CONDITION_OPTIONS.find(opt => opt.value === screenCondition) || SCREEN_CONDITION_OPTIONS[0]}
                            onChange={(e) => setScreenCondition(e.value.value)}
                            style={{
                                width: '120px', height: '32px', fontSize: '12px', borderRadius: '6px'
                            }}
                        />
                    </div>

                    {/* 시뮬레이션 시작 버튼 */}
                    <button
                        onClick={handleRunSimulation}
                        disabled={isSimulating}
                        style={{
                            height: '32px', padding: '0 16px', border: 'none', borderRadius: '6px',
                            background: '#16a34a', color: '#fff', fontSize: '12px', fontWeight: 500,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)', opacity: isSimulating ? 0.7 : 1,
                            boxSizing: 'border-box', marginLeft: 'auto'
                        }}
                        onMouseOver={(e) => { if (!isSimulating) e.currentTarget.style.background = '#15803d'; }}
                        onMouseOut={(e) => { if (!isSimulating) e.currentTarget.style.background = '#16a34a'; }}
                    >
                        <Play size={11} fill="#fff" />
                        <span style={{ whiteSpace: 'nowrap' }}>AI 데이터 생성 시작</span>
                    </button>
                </div>

                {/* ── 상단 2: 생성 진행 상태 및 요약 통계 ── */}
                <div style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '12px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', shrink: 0
                }}>
                    {/* 진행률 바 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                            ⚡ 생성 진행 상태 <span style={{ color: '#16a34a' }}>{progress}%</span>
                        </span>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: '#10b981', transition: 'width 0.3s ease' }} />
                        </div>
                    </div>

                    {/* 통계 지표들 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', fontSize: '12.5px', color: '#64748b' }}>
                        <div>총 응답자 <strong style={{ color: '#1e293b' }}>{currentTotal}</strong></div>
                        <div style={{ color: '#cbd5e1' }}>|</div>
                        <div>완료 <strong style={{ color: '#1e293b' }}>{passCount + defectCount}</strong></div>
                        <div style={{ color: '#cbd5e1' }}>|</div>
                        <div>성공 <strong style={{ color: '#16a34a' }}>{passCount}</strong></div>
                        <div style={{ color: '#cbd5e1' }}>|</div>
                        <div>결함 <strong style={{ color: '#dc2626' }}>{defectCount}</strong></div>
                        <div style={{ color: '#cbd5e1' }}>|</div>
                        <div>평균소요 <strong style={{ color: '#1e293b' }}>{avgDuration}</strong></div>
                        <div style={{ color: '#cbd5e1' }}>|</div>
                        <div>총 AI 비용 <strong style={{ color: '#8b5cf6' }}>{aiCost}</strong></div>
                    </div>
                </div>

                {/* ── 하단 분할 영역 (좌: 리스트, 우: 디테일 리포트) ── */}
                <div style={{ flex: 1, display: 'flex', gap: '12px', minHeight: 0 }}>

                    {/* [좌] 개별 응답자 생성 목록 */}
                    <div className="st-panel" style={{ flex: 6, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', shrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e293b' }}>개별 응답자 생성 목록</span>

                                {/* 필터 칩 */}
                                <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                                    <button
                                        onClick={() => setFilterStatus("all")}
                                        className={`ai-filter-chip ${filterStatus === "all" ? "active" : ""}`}
                                        style={{
                                            border: '1px solid #cbd5e1', borderRadius: '99px', padding: '3px 12px', fontSize: '11.5px', fontWeight: 600,
                                            cursor: 'pointer', background: filterStatus === "all" ? '#e2e8f0' : '#fff', color: '#334155'
                                        }}
                                    >
                                        전체 {currentTotal}
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus("pass")}
                                        className={`ai-filter-chip ${filterStatus === "pass" ? "active" : ""}`}
                                        style={{
                                            border: '1px solid #cbd5e1', borderRadius: '99px', padding: '3px 12px', fontSize: '11.5px', fontWeight: 600,
                                            cursor: 'pointer', background: filterStatus === "pass" ? '#f0fdf4' : '#fff', color: '#16a34a'
                                        }}
                                    >
                                        통과 {passCount}
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus("defect")}
                                        className={`ai-filter-chip ${filterStatus === "defect" ? "active" : ""}`}
                                        style={{
                                            border: '1px solid #cbd5e1', borderRadius: '99px', padding: '3px 12px', fontSize: '11.5px', fontWeight: 600,
                                            cursor: 'pointer', background: filterStatus === "defect" ? '#fff1f1' : '#fff', color: '#dc2626'
                                        }}
                                    >
                                        결함 {defectCount}
                                    </button>
                                </div>
                            </div>

                            {/* 검색 및 액션 버튼 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <Search size={13} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        placeholder="PID 검색"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            height: '30px', padding: '0 10px 0 28px', border: '1px solid #cbd5e1',
                                            borderRadius: '6px', fontSize: '12px', width: '120px', outline: 'none'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleReset}
                                    style={{
                                        height: '30px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                        background: '#fff', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                                    }}
                                    title="전체 복원 초기화"
                                >
                                    <RotateCcw size={12} />
                                    초기화
                                </button>
                                <button
                                    onClick={() => modal.showAlert("알림", "엑셀 내보내기 기능이 준비되었습니다.")}
                                    style={{
                                        height: '30px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                        background: '#fff', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                                    }}
                                >
                                    <Download size={12} />
                                    내보내기
                                </button>
                                {checkedIds.length > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        style={{
                                            height: '30px', padding: '0 10px', border: '1px solid #fecaca', borderRadius: '6px',
                                            background: '#fff1f1', fontSize: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                                        }}
                                    >
                                        <Trash2 size={12} />
                                        선택 삭제
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 가이드 메시지 */}
                        <div style={{ fontSize: '11.5px', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '10px', shrink: 0 }}>
                            💡 행을 클릭하면 오른쪽 결함 발견 리포트에서 실시간 봇 로그를 추적할 수 있습니다. 체크박스로 선택하면 삭제할 수 있습니다.
                        </div>

                        {/* 테이블 컨테이너 */}
                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 5 }}>
                                    <tr>
                                        <th style={{ padding: '10px 12px', width: '32px' }}>
                                            <input
                                                type="checkbox"
                                                checked={filteredRespondents.length > 0 && checkedIds.length === filteredRespondents.length}
                                                onChange={handleHeaderCheckboxChange}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </th>
                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569' }}>응답자 ID (PID)</th>
                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569' }}>결과 상태</th>
                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569' }}>최종 감지 문항</th>
                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569' }}>종료 메시지 / 중단 사유</th>
                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', width: '90px' }}>수행 시간</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRespondents.length > 0 ? (
                                        filteredRespondents.map((item) => {
                                            const isSelected = selectedPid === item.id;
                                            const isChecked = checkedIds.includes(item.id);
                                            return (
                                                <tr
                                                    key={item.id}
                                                    onClick={() => setSelectedPid(item.id)}
                                                    style={{
                                                        borderBottom: '1px solid #f1f5f9',
                                                        background: isSelected ? '#f0fdf4' : (isChecked ? '#f8fafc' : '#ffffff'),
                                                        cursor: 'pointer',
                                                        transition: 'background 0.15s'
                                                    }}
                                                    onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                                                    onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = isChecked ? '#f8fafc' : '#ffffff'; }}
                                                >
                                                    <td style={{ padding: '10px 12px' }} onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleRowCheckboxChange(item.id)}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{item.id}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                                                            background: item.status === "pass" ? '#f0fdf4' : '#fff1f1',
                                                            color: item.status === "pass" ? '#16a34a' : '#dc2626',
                                                            border: item.status === "pass" ? '1px solid #bbf7d0' : '1px solid #fecaca'
                                                        }}>
                                                            {item.status === "pass" ? "✓ 통과" : "✕ 결함"}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        {item.finalQuestion !== "-" ? (
                                                            <span style={{
                                                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                                                background: '#fff1f1', color: '#dc2626', border: '1px solid #fecaca'
                                                            }}>
                                                                {item.finalQuestion}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                                                        {item.status === "pass" ? item.message : <span style={{ color: '#94a3b8' }}>-</span>}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', color: '#64748b', fontWeight: 500 }}>{item.duration}</td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
                                                조건에 일치하는 응답자 데이터가 존재하지 않습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* [우] 결함 발견 리포트 */}
                    <div className="st-panel" style={{ flex: 4, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>

                        {selectedRespondent ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

                                {/* 리포트 헤더 */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px', shrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {selectedRespondent.status === "defect" ? (
                                            <>
                                                <AlertTriangle size={18} color="#dc2626" />
                                                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#dc2626' }}>결함 발견 리포트</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={18} color="#16a34a" />
                                                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#16a34a' }}>수행 완료 리포트</span>
                                            </>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>PID {selectedRespondent.id}</span>
                                </div>

                                {/* 상세 리포트 정보 (결함 상태일 때만) */}
                                {selectedRespondent.status === "defect" ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', shrink: 0 }}>
                                        {/* 중단 사유 분류 */}
                                        <div style={{ background: '#fff1f1', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>① 중단 사유 분류</span>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>{selectedRespondent.errorCategory}</span>
                                        </div>

                                        {/* 상세 오류 내용 */}
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>② 상세 오류 내용</span>
                                            <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.5', margin: '0 0 12px 0', wordBreak: 'break-all' }}>
                                                {selectedRespondent.errorDetail}
                                            </p>

                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => modal.showAlert("알림", "결함이 발견된 브라우저 실패 화면 이미지 스냅샷 페이지로 이동합니다.")}
                                                    style={{
                                                        height: '28px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '4px',
                                                        background: '#fff', fontSize: '11.5px', fontWeight: 600, color: '#475569',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}
                                                >
                                                    <ExternalLink size={11} />
                                                    실패 화면 링크 바로가기
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        modal.showAlert("알림", `PID ${selectedRespondent.id} 응답자에 대한 시뮬레이션 재수행을 요청하였습니다.`);
                                                    }}
                                                    style={{
                                                        height: '28px', padding: '0 10px', border: 'none', borderRadius: '4px',
                                                        background: '#16a34a', fontSize: '11.5px', fontWeight: 600, color: '#fff',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}
                                                >
                                                    <RotateCcw size={11} />
                                                    테스트 재시도
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', shrink: 0 }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', display: 'block', marginBottom: '4px' }}>최종 수행 결과</span>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#15803d', display: 'block', marginBottom: '6px' }}>설문 자동 응답 완료 (성공)</span>
                                        <p style={{ fontSize: '12px', color: '#166534', margin: 0, lineHeight: 1.5 }}>
                                            설문 구조에 정의된 모든 조건(문항 로직 분기, 선택 제약 조건)을 만족하며 정상 종료 페이지까지 응답 시뮬레이션을 완료했습니다.
                                        </p>
                                    </div>
                                )}

                                {/* 실시간 실행 로그 단말기 */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'block', shrink: 0 }}>
                                        ⌨️ 실시간 실행 로그 단말기
                                    </span>
                                    <div style={{
                                        flex: 1, background: '#0f172a', borderRadius: '8px', padding: '12px 16px',
                                        overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px',
                                        fontFamily: 'Consolas, Monaco, monospace', fontSize: '11.5px', border: '1px solid #1e293b'
                                    }}>
                                        {selectedRespondent.logs.map((logLine, idx) => {
                                            let color = '#cbd5e1'; // 기본 연한 회색
                                            if (logLine.includes('[시스템]')) color = '#4ade80'; // 녹색
                                            else if (logLine.includes('[브라우저]')) color = '#38bdf8'; // 청색
                                            else if (logLine.includes('[오류]')) color = '#f87171'; // 적색
                                            else if (logLine.includes('[경고]')) color = '#fb923c'; // 주황색

                                            return (
                                                <div key={idx} style={{ color, lineHeight: '1.4', wordBreak: 'break-all' }}>
                                                    {logLine}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '10px' }}>
                                <AlertTriangle size={24} />
                                <span style={{ fontSize: '13px' }}>상세 로그를 확인할 응답자를 목록에서 선택하세요.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 슬라이더 스위치 & 필터 칩 CSS 스타일 */}
            <style dangerouslySetInnerHTML={{
                __html: `
                /* 토글 스위치 */
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 22px;
                    flex-shrink: 0;
                }
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #cbd5e1;
                    transition: .3s;
                    border-radius: 22px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                }
                input:checked + .slider {
                    background-color: #16a34a;
                }
                input:checked + .slider:before {
                    transform: translateX(22px);
                }

                /* 필터 칩 호버 효과 */
                .ai-filter-chip {
                    transition: all 0.15s ease;
                }
                .ai-filter-chip:hover {
                    filter: brightness(0.95);
                }

                /* Kendo Dropdown Custom Border Color & Style */
                .ai-kendo-dropdown {
                    border: 1px solid #cbd5e1 !important;
                    background-color: #ffffff !important;
                    border-radius: 6px !important;
                    box-shadow: none !important;
                    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out !important;
                }
                .ai-kendo-dropdown:hover {
                    border-color: #94a3b8 !important;
                }
                .ai-kendo-dropdown.k-focus,
                .ai-kendo-dropdown:focus,
                .ai-kendo-dropdown.k-focus-within,
                .ai-kendo-dropdown:focus-within {
                    border-color: #16a34a !important;
                    box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.1) !important;
                }
                /* Arrow Button and text inside */
                .ai-kendo-dropdown .k-input-button {
                    color: #16a34a !important; /* Green arrow! */
                }
                .ai-kendo-dropdown .k-input-inner,
                .ai-kendo-dropdown .k-input-inner .k-input-value-text {
                    font-size: 12px !important;
                    font-weight: 400 !important;
                    color: #1e293b !important;
                }
                .ai-kendo-dropdown .k-input-inner {
                    padding-left: 10px !important;
                }

                /* Custom Dropdown Popup List Styles */
                .ai-dropdown-popup {
                    border: 1px solid #16a34a !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.08) !important;
                    padding: 4px !important;
                    background: #fff !important;
                    overflow: hidden !important;
                }
                .ai-dropdown-popup .k-list-item {
                    border-radius: 6px !important;
                    padding: 6px 10px !important;
                    font-size: 12px !important;
                    font-weight: 400 !important;
                    color: #475569 !important;
                    margin-bottom: 2px !important;
                    transition: all 0.15s !important;
                }
                .ai-dropdown-popup .k-list-item:hover,
                .ai-dropdown-popup .k-list-item.k-hover {
                    background-color: #f1f5f9 !important;
                    color: #1e293b !important;
                }
                .ai-dropdown-popup .k-list-item.k-selected {
                    background-color: #f0fdf4 !important;
                    color: #16a34a !important;
                }
            `}} />
        </div>
    );
};

export default AiDataPage;