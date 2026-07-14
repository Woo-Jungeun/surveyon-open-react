import { useState, useContext, cloneElement, useMemo } from 'react';
import {
    Search, RotateCcw, Download, ExternalLink, Play, AlertTriangle,
    CheckCircle2, Trash2, X
} from 'lucide-react';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import { modalContext } from "@/components/common/Modal.jsx";
import KendoGridV2, { GridColumn as Column } from '@/components/kendo/KendoGridV2';


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
            "536 [오류] 6회 교정 실패 -> 타임아웃, 중단으로 종료."
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

    // 내보내기 팝업 표시 여부
    const [showExportModal, setShowExportModal] = useState(false);

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

    // Kendo Grid re-render를 강제 유도하고 selected 상태를 각 데이터 아이템에 주입하기 위한 메모이징 데이터
    const gridData = useMemo(() => {
        return filteredRespondents.map(r => ({
            ...r,
            _selected: r.id === selectedPid
        }));
    }, [filteredRespondents, selectedPid]);

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

    // 내보내기 형식 실행
    const handleExportFormat = (format) => {
        setShowExportModal(false);
        modal.showAlert("알림", `${format} 양식 파일로 성공적으로 내보냈습니다.`);
    };

    // ── Kendo Grid 커스텀 셀 및 렌더러 ──
    const RowCheckboxCell = (props) => {
        const { dataItem, style, className } = props;
        const isChecked = checkedIds.includes(dataItem.id);
        const handleChange = (e) => {
            e.stopPropagation();
            if (isChecked) {
                setCheckedIds(prev => prev.filter(id => id !== dataItem.id));
            } else {
                setCheckedIds(prev => [...prev, dataItem.id]);
            }
        };

        return (
            <td style={{ ...style, padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle' }} className={className} onClick={(e) => e.stopPropagation()}>
                <span className="k-checkbox-wrap">
                    <input
                        type="checkbox"
                        className="k-checkbox k-checkbox-md k-rounded-md"
                        checked={isChecked}
                        onChange={handleChange}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer' }}
                    />
                </span>
            </td>
        );
    };

    const HeaderCheckboxCell = () => {
        const allChecked = filteredRespondents.length > 0 && checkedIds.length === filteredRespondents.length;
        const someChecked = checkedIds.length > 0 && !allChecked;

        const handleChange = () => {
            if (allChecked) {
                setCheckedIds([]);
            } else {
                setCheckedIds(filteredRespondents.map(r => r.id));
            }
        };

        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }} onClick={(e) => e.stopPropagation()}>
                <span className="k-checkbox-wrap">
                    <input
                        type="checkbox"
                        className="k-checkbox k-checkbox-md k-rounded-md"
                        checked={allChecked}
                        ref={el => { if (el) el.indeterminate = someChecked; }}
                        onChange={handleChange}
                        style={{ cursor: 'pointer' }}
                    />
                </span>
            </div>
        );
    };

    const IdCell = (props) => (
        <td style={{ ...props.style, padding: '8px 12px', verticalAlign: 'middle', fontWeight: 600, color: '#0f172a' }} className={props.className}>
            {props.dataItem.id}
        </td>
    );

    const StatusCell = (props) => {
        const { status } = props.dataItem;
        return (
            <td style={{ ...props.style, padding: '8px 12px', verticalAlign: 'middle' }} className={props.className}>
                <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                    background: status === "pass" ? '#f0fdf4' : '#fff1f1',
                    color: status === "pass" ? '#16a34a' : '#dc2626',
                    border: status === "pass" ? '1px solid #bbf7d0' : '1px solid #fecaca',
                    whiteSpace: 'nowrap'
                }}>
                    {status === "pass" ? "✓ 통과" : "✕ 중단"}
                </span>
            </td>
        );
    };

    const FinalQuestionCell = (props) => {
        const { finalQuestion } = props.dataItem;
        return (
            <td style={{ ...props.style, padding: '8px 12px', verticalAlign: 'middle' }} className={props.className}>
                {finalQuestion !== "-" ? (
                    <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                        background: '#fff1f1', color: '#dc2626', border: '1px solid #fecaca'
                    }}>
                        {finalQuestion}
                    </span>
                ) : (
                    <span style={{ color: '#94a3b8' }}>-</span>
                )}
            </td>
        );
    };

    const MessageCell = (props) => {
        const { status, message, errorCategory } = props.dataItem;
        return (
            <td style={{ ...props.style, padding: '8px 12px', verticalAlign: 'middle', color: '#475569' }} className={props.className}>
                {status === "pass" ? message : (errorCategory || "-")}
            </td>
        );
    };

    const DurationCell = (props) => (
        <td style={{ ...props.style, padding: '8px 12px', verticalAlign: 'middle', color: '#64748b', fontWeight: 500 }} className={props.className}>
            {props.dataItem.duration}
        </td>
    );

    const rowRender = (trElement, props) => {
        const { dataItem } = props;
        const isSelected = !!dataItem?._selected;
        const isChecked = checkedIds.includes(dataItem?.id);

        const baseClass = (trElement.props.className || "")
            .replace(/\bk-selected\b/g, "")
            .replace(/\bk-state-selected\b/g, "");

        const trProps = {
            ...trElement.props,
            className: `${baseClass} ${isSelected ? 'selected-pid-row' : ''}`.trim(),
            style: {
                ...trElement.props.style,
                background: isSelected ? '#f0fdf4' : (isChecked ? '#f8fafc' : '#ffffff'),
                cursor: 'pointer'
            }
        };

        return cloneElement(trElement, { ...trProps }, trElement.props.children);
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
        <div className="ai-data-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f1f5f9', overflow: 'hidden' }}>
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

                    {/* 테스트 PID 자동생성 선택 (Segmented Control) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                            PID 자동생성
                        </span>
                        <div style={{
                            display: 'flex',
                            background: '#f1f5f9',
                            borderRadius: '6px',
                            padding: '2px',
                            height: '32px',
                            boxSizing: 'border-box',
                            alignItems: 'center'
                        }}>
                            <button
                                onClick={() => setAutoPid(true)}
                                style={{
                                    border: autoPid ? '1px solid #16a34a' : '1px solid transparent',
                                    borderRadius: '4px',
                                    padding: '0 10px',
                                    height: '100%',
                                    fontSize: '11.5px',
                                    fontWeight: autoPid ? '700' : '500',
                                    color: autoPid ? '#16a34a' : '#64748b',
                                    background: autoPid ? '#fff' : 'transparent',
                                    boxShadow: autoPid ? '0 1px 2px rgba(22, 163, 74, 0.1)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                자동
                            </button>
                            <button
                                onClick={() => setAutoPid(false)}
                                style={{
                                    border: !autoPid ? '1px solid #16a34a' : '1px solid transparent',
                                    borderRadius: '4px',
                                    padding: '0 10px',
                                    height: '100%',
                                    fontSize: '11.5px',
                                    fontWeight: !autoPid ? '700' : '500',
                                    color: !autoPid ? '#16a34a' : '#64748b',
                                    background: !autoPid ? '#fff' : 'transparent',
                                    boxShadow: !autoPid ? '0 1px 2px rgba(22, 163, 74, 0.1)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                수동
                            </button>
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

                    {/* 응답 분포 선택 (Segmented Control) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                            응답 분포
                        </span>
                        <div style={{
                            display: 'flex',
                            background: '#f1f5f9',
                            borderRadius: '6px',
                            padding: '2px',
                            height: '32px',
                            boxSizing: 'border-box',
                            alignItems: 'center'
                        }}>
                            <button
                                onClick={() => setDistribution('browser')}
                                style={{
                                    border: distribution === 'browser' ? '1px solid #16a34a' : '1px solid transparent',
                                    borderRadius: '4px',
                                    padding: '0 10px',
                                    height: '100%',
                                    fontSize: '11.5px',
                                    fontWeight: distribution === 'browser' ? '700' : '500',
                                    color: distribution === 'browser' ? '#16a34a' : '#64748b',
                                    background: distribution === 'browser' ? '#fff' : 'transparent',
                                    boxShadow: distribution === 'browser' ? '0 1px 2px rgba(22, 163, 74, 0.1)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                브라우저 실행 (EtoE)
                            </button>
                            <button
                                onClick={() => setDistribution('engine')}
                                style={{
                                    border: distribution === 'engine' ? '1px solid #16a34a' : '1px solid transparent',
                                    borderRadius: '4px',
                                    padding: '0 10px',
                                    height: '100%',
                                    fontSize: '11.5px',
                                    fontWeight: distribution === 'engine' ? '700' : '500',
                                    color: distribution === 'engine' ? '#16a34a' : '#64748b',
                                    background: distribution === 'engine' ? '#fff' : 'transparent',
                                    boxShadow: distribution === 'engine' ? '0 1px 2px rgba(22, 163, 74, 0.1)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                엔진 실행 (API 호출)
                            </button>
                        </div>
                    </div>

                    {/* 스크린 조건 선택 (Segmented Control) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                            스크린 조건
                        </span>
                        <div style={{
                            display: 'flex',
                            background: '#f1f5f9',
                            borderRadius: '6px',
                            padding: '2px',
                            height: '32px',
                            boxSizing: 'border-box',
                            alignItems: 'center'
                        }}>
                            <button
                                onClick={() => setScreenCondition('exclude')}
                                style={{
                                    border: screenCondition === 'exclude' ? '1px solid #16a34a' : '1px solid transparent',
                                    borderRadius: '4px',
                                    padding: '0 10px',
                                    height: '100%',
                                    fontSize: '11.5px',
                                    fontWeight: screenCondition === 'exclude' ? '700' : '500',
                                    color: screenCondition === 'exclude' ? '#16a34a' : '#64748b',
                                    background: screenCondition === 'exclude' ? '#fff' : 'transparent',
                                    boxShadow: screenCondition === 'exclude' ? '0 1px 2px rgba(22, 163, 74, 0.1)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                미포함
                            </button>
                            <button
                                onClick={() => setScreenCondition('include')}
                                style={{
                                    border: screenCondition === 'include' ? '1px solid #16a34a' : '1px solid transparent',
                                    borderRadius: '4px',
                                    padding: '0 10px',
                                    height: '100%',
                                    fontSize: '11.5px',
                                    fontWeight: screenCondition === 'include' ? '700' : '500',
                                    color: screenCondition === 'include' ? '#16a34a' : '#64748b',
                                    background: screenCondition === 'include' ? '#fff' : 'transparent',
                                    boxShadow: screenCondition === 'include' ? '0 1px 2px rgba(22, 163, 74, 0.1)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                포함
                            </button>
                        </div>
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
                <div className="ai-stats-bar" style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '12px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', shrink: 0
                }}>
                    {/* 진행률 바 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                            ⚡ 생성 진행 상태 <span style={{ color: '#16a34a' }}>{progress}%</span>
                        </span>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: '#10b981', transition: 'width 0.3s ease' }} />
                        </div>
                    </div>

                    {/* 통계 지표들 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                        <div>총 응답자 <strong style={{ color: '#1e293b' }}>{currentTotal}</strong></div>
                        <div style={{ color: '#cbd5e1' }}>|</div>
                        <div>완료 <strong style={{ color: '#1e293b' }}>{passCount + defectCount}</strong></div>
                        <div style={{ color: '#cbd5e1' }}>|</div>
                        <div>성공 <strong style={{ color: '#16a34a' }}>{passCount}</strong></div>
                        <div style={{ color: '#cbd5e1' }}>|</div>
                        <div>중단 <strong style={{ color: '#dc2626' }}>{defectCount}</strong></div>
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
                                        중단 {defectCount}
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
                                    onClick={() => setShowExportModal(true)}
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
                            💡 행을 클릭하면 오른쪽 중단 발견 리포트에서 실시간 봇 로그를 추적할 수 있습니다. 체크박스로 선택하면 삭제할 수 있습니다.
                        </div>

                        {/* 그리드 영역 */}
                        <div className="cmn_grid singlehead" style={{ flex: 1, minHeight: 0 }}>
                            <KendoGridV2
                                data={gridData}
                                dataItemKey="id"
                                height="100%"
                                rowRender={rowRender}
                                onRowClick={(e) => setSelectedPid(e.dataItem.id)}
                                reorderable={false}
                                addable={false}
                                deletable={false}
                                copyable={false}
                            >
                                <Column
                                    field="checkbox"
                                    width="45px"
                                    resizable={false}
                                    headerCell={HeaderCheckboxCell}
                                    cell={RowCheckboxCell}
                                    headerClassName="k-header-center"
                                />
                                <Column
                                    field="id"
                                    title="응답자 ID (PID)"
                                    width="130px"
                                    cell={IdCell}
                                    headerClassName="k-header-center"
                                />
                                <Column
                                    field="status"
                                    title="결과 상태"
                                    width="90px"
                                    cell={StatusCell}
                                    headerClassName="k-header-center"
                                />
                                <Column
                                    field="finalQuestion"
                                    title="최종 감지 문항"
                                    width="120px"
                                    cell={FinalQuestionCell}
                                    headerClassName="k-header-center"
                                />
                                <Column
                                    field="message"
                                    title="종료 메시지 / 중단 사유"
                                    cell={MessageCell}
                                    headerClassName="k-header-center"
                                />
                                <Column
                                    field="duration"
                                    title="수행 시간"
                                    width="90px"
                                    cell={DurationCell}
                                    headerClassName="k-header-center"
                                />
                            </KendoGridV2>
                        </div>
                    </div>

                    {/* [우] 중단 발견 리포트 */}
                    <div className="st-panel" style={{ flex: 4, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>

                        {selectedRespondent ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

                                {/* 리포트 헤더 */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px', shrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {selectedRespondent.status === "defect" ? (
                                            <>
                                                <AlertTriangle size={18} color="#dc2626" />
                                                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#dc2626' }}>
                                                    중단 발견 리포트
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={18} color="#16a34a" />
                                                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#16a34a' }}>
                                                    수행 완료 리포트
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>PID {selectedRespondent.id}</span>
                                </div>

                                {selectedRespondent.status === "defect" ? (
                                    // 중단 상태일 때는 상세 리포트 정보와 로그 단말기 표시
                                    <>
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
                                                        onClick={() => modal.showAlert("알림", "중단이 발생한 브라우저 실패 화면 이미지 스냅샷 페이지로 이동합니다.")}
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
                                                            modal.showAlert("알림", "서비스 준비중입니다.");
                                                        }}
                                                        style={{
                                                            height: '28px', padding: '0 12px', border: '1px solid #16a34a', borderRadius: '4px',
                                                            background: '#fff', fontSize: '11.5px', fontWeight: 600, color: '#16a34a',
                                                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'all 0.15s'
                                                        }}
                                                        onMouseOver={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
                                                    >
                                                        테스트 재시도
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

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
                                                    if (logLine.includes('[브라우저]')) color = '#38bdf8'; // 청색
                                                    if (logLine.includes('[오류]')) color = '#f87171'; // 적색
                                                    if (logLine.includes('[경고]')) color = '#fb923c'; // 주황색

                                                    return (
                                                        <div key={idx} style={{ color, lineHeight: '1.4', wordBreak: 'break-all' }}>
                                                            {logLine}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    // 통과 상태일 때는 단순 성공 안내 이미지 카드 표시 (실행 로그 가림)
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '50%',
                                            background: '#f0fdf4',
                                            border: '1px solid #bbf7d0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: '16px'
                                        }}>
                                            <CheckCircle2 size={28} color="#16a34a" />
                                        </div>
                                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', textAlign: 'center' }}>
                                            PID {selectedRespondent.id} · 정상 완료
                                        </div>
                                        <div style={{ fontSize: '12.5px', color: '#64748b', textAlign: 'center', lineHeight: '1.6' }}>
                                            설문 완료 화면까지 중단 없이 도달했습니다.<br />
                                            중단 리포트가 없습니다.
                                        </div>
                                    </div>
                                )}
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

            {/* SAV/Excel 내보내기 포맷 선택 팝업 */}
            {showExportModal && (
                <div className="nd-modal-overlay">
                    <div className="nd-modal-container">
                        <div className="nd-modal-header">
                            <h3 className="with-bar">데이터 내보내기</h3>
                            <button className="nd-close-btn" onClick={() => setShowExportModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="nd-modal-body">
                            <p style={{ marginBottom: '16px' }}>다운로드할 파일 양식을 선택하세요.</p>
                            <button className="ai-export-btn" onClick={() => handleExportFormat('SAV')}>
                                <span>SAV 파일 (.sav)</span>
                                <Download size={16} className="download-icon" />
                            </button>
                            <button className="ai-export-btn" onClick={() => handleExportFormat('Excel')}>
                                <span>Excel 파일 (.xlsx)</span>
                                <Download size={16} className="download-icon" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                /* Selected PID row styling for Kendo Grid (with clean continuous outline border) */
                .ai-data-page .selected-pid-row {
                    background-color: #f0fdf4 !important;
                    outline: 1px solid #22c55e !important;
                    outline-offset: -1px !important;
                }
                .ai-data-page .selected-pid-row td {
                    background-color: #f0fdf4 !important;
                }

                /* Scoped Hover Color for AI Data Grid (Green theme instead of sky blue #e0f2fe) */
                html body .ai-data-page .cmn_grid .dp-excel-grid-v2 tbody tr:hover td,
                html body .ai-data-page .cmn_grid .dp-excel-grid-v2 tbody tr.k-hover td,
                html body .ai-data-page .cmn_grid .dp-excel-grid-v2 tbody tr.k-state-hover td {
                    background-color: #f0faf5 !important;
                }
                html body .ai-data-page .cmn_grid .dp-excel-grid-v2 tbody tr.selected-pid-row:hover td {
                    background-color: #f0fdf4 !important;
                }

                /* Checkbox size and icon size overrides for Kendo Grid */
                .ai-data-page .cmn_grid .k-checkbox-wrap .k-checkbox[type='checkbox'] {
                    width: 16px !important;
                    height: 16px !important;
                    border-radius: 4px !important;
                }
                .ai-data-page .cmn_grid .k-checkbox-wrap .k-checkbox[type='checkbox']:checked::before {
                    -webkit-mask-size: 10px 8px !important;
                    mask-size: 10px 8px !important;
                }

                /* Add vertical breathing room and comfortable height for AI Data page grid rows (override high-specificity rules in kendo_custom.css) */
                html body .ai-data-page .cmn_grid.singlehead .k-grid .k-grid-container .k-grid-content td,
                html body .ai-data-page .cmn_grid.singlehead .k-grid .k-grid-container .k-grid-content td.k-table-td {
                    height: 38px !important;
                    padding: 8px 12px !important;
                    vertical-align: middle !important;
                    line-height: 1.2 !important;
                }
                html body .ai-data-page .cmn_grid.singlehead .k-grid-header th.k-header,
                html body .ai-data-page .cmn_grid.singlehead .k-grid-header th.k-table-th {
                    height: 38px !important;
                    padding: 8px 12px !important;
                    vertical-align: middle !important;
                }

                /* Disable blue focus/selection background on AI Data page grid cells */
                .ai-data-page .cmn_grid .k-grid td.k-selected,
                .ai-data-page .cmn_grid .k-grid .k-table-td.k-selected,
                .ai-data-page .cmn_grid .k-grid .k-table-row.k-selected>td,
                .ai-data-page .cmn_grid .k-grid .k-table-row.k-selected>.k-table-td,
                .ai-data-page .cmn_grid .k-grid td:focus,
                .ai-data-page .cmn_grid .k-grid .k-table-td:focus,
                .ai-data-page .cmn_grid .k-grid .k-table-row:focus td {
                    background-color: transparent !important;
                }

                /* Export Popup Styles (matched to NewDataModal.css with data-management-theme green) */
                .ai-data-page .nd-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .ai-data-page .nd-modal-container {
                    width: 440px;
                    max-width: 95vw;
                    padding: 24px;
                    background: #ffffff;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                    border-radius: 12px;
                    font-family: 'Pretendard', sans-serif;
                }
                .ai-data-page .nd-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .ai-data-page .nd-modal-header h3 {
                    font-size: 18px;
                    font-weight: 700;
                    margin: 0;
                    color: #1e293b;
                    display: flex;
                    align-items: center;
                }
                .ai-data-page .nd-modal-header h3.with-bar::before {
                    content: '';
                    display: block;
                    width: 4px;
                    height: 18px;
                    background-color: #16a34a; /* Green theme! */
                    border-radius: 2px;
                    margin-right: 8px;
                }
                .ai-data-page .nd-close-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #64748b;
                    padding: 6px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s;
                }
                .ai-data-page .nd-close-btn:hover {
                    background: #f8fafc;
                    color: #1e293b;
                }
                .ai-data-page .nd-modal-body p {
                    color: #64748b;
                    font-size: 14px;
                    margin: 0 0 16px 0;
                }
                .ai-data-page .ai-export-btn {
                    width: 100%;
                    padding: 16px 20px;
                    margin-bottom: 10px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    background: #ffffff;
                    font-size: 14.5px;
                    font-weight: 600;
                    color: #1e293b;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                }
                .ai-data-page .ai-export-btn:hover {
                    border-color: #16a34a;
                    background: #f0fdf4;
                    color: #16a34a;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.1);
                }
                .ai-data-page .ai-export-btn .download-icon {
                    color: #94a3b8 !important;
                    transition: all 0.2s ease;
                }
                .ai-data-page .ai-export-btn:hover .download-icon {
                    color: #16a34a !important;
                    transform: translateY(2px);
                }

                /* Statistics Bar Font Size Override (reset.css defaults strong, div, span to 14px) */
                .ai-data-page .ai-stats-bar,
                .ai-data-page .ai-stats-bar div,
                .ai-data-page .ai-stats-bar span,
                .ai-data-page .ai-stats-bar strong {
                    font-size: 12px !important;
                }
            `}} />
        </div>
    );
};

export default AiDataPage;