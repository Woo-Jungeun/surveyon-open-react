import { useState, useContext, cloneElement, useMemo, useEffect, useRef } from 'react';
import {
    Search, Download, ExternalLink, Play, AlertTriangle,
    CheckCircle2, X, RefreshCw, Clock, Loader2, Trash2
} from 'lucide-react';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import { modalContext } from "@/components/common/Modal.jsx";
import KendoGridV2, { GridColumn as Column } from '@/components/kendo/KendoGridV2';
import { useSelector } from 'react-redux';
import { AiDataPageApi } from './AiDataPageApi';


const FAILURE_CLASS_MAP = {
    Completed: { label: "완주", advice: "-" },
    ScreenoutQuota: { label: "탈락·쿼터", advice: "봇 회피 로직 점검" },
    ServerEngineException: { label: "서버 엔진 예외", advice: "QMaster측 문항 확인(봇 문제 아님)" },
    SurveyScriptDefect: { label: "설문 결함", advice: "설문 기획 수정" },
    BotUnsupported: { label: "봇 미지원", advice: "수동 검증" },
    SurveyClosed: { label: "설문 마감", advice: "설문 상태 확인" },
    WrongServerOrUrl: { label: "서버/URL 오류", advice: "진입 URL 확인" },
    ValidationUnresolved: { label: "검증 실패", advice: "케이스 확인" }
};

const AiDataPage = () => {
    const modal = useContext(modalContext);

    // 상단 상태 값
    const [startUrl, setStartUrl] = useState("");
    const [autoPid, setAutoPid] = useState(true);
    const [testCount, setTestCount] = useState(10);
    const [manualPidList, setManualPidList] = useState("");



    const [isSimulating, setIsSimulating] = useState(false);
    const [respondents, setRespondents] = useState([]);
    const [selectedPid, setSelectedPid] = useState("");
    const [checkedIds, setCheckedIds] = useState([]);

    // 내보내기 팝업 표시 여부 (보류로 인한 비활성화)
    // const [showExportModal, setShowExportModal] = useState(false);

    // 필터 & 검색
    const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'pass' | 'defect'
    const [searchQuery, setSearchQuery] = useState("");

    // AI 데이터 작업 상태
    const auth = useSelector((store) => store.auth);
    const [progressInfo, setProgressInfo] = useState(null);
    const [jobError, setJobError] = useState("");
    const { viewQaJobs, getQaTicket, runQaE2eJobs, resetTestPids, exportTestData } = AiDataPageApi();

    // 티켓 관리 (티켓은 미리 받아둔다. 단, 타이머 폴링 금지)
    const ticketRef = useRef(null);
    const ticketAtRef = useRef(0);
    const ticketTtlRef = useRef(180);

    // 러너 실행 감지
    const [runnerNotResponding, setRunnerNotResponding] = useState(false);
    const runnerCheckTimerRef = useRef(null);

    // Runner 고유 식별자 생성
    const runnerId = useMemo(() => {
        let rid = localStorage.getItem("runnerId");
        if (!rid) {
            rid = "runner_" + Math.random().toString(36).substring(2, 15);
            localStorage.setItem("runnerId", rid);
        }
        return rid;
    }, []);

    // 1회용 티켓 발급/갱신 (신선하면 재사용)
    const refreshTicket = async (force = false) => {
        const projectnum = sessionStorage.getItem("projectnum");
        const userId = auth?.user?.userId || sessionStorage.getItem("userId");
        if (!projectnum || !userId) return;

        if (!force && ticketRef.current && (Date.now() - ticketAtRef.current) < ticketTtlRef.current * 500) {
            return; // 신선하면 skip
        }

        try {
            const res = await getQaTicket.mutateAsync({ pn: projectnum, user: userId });
            if (res?.success === "777" && res?.resultjson) {
                ticketRef.current = res.resultjson.ticket;
                ticketAtRef.current = Date.now();
                ticketTtlRef.current = res.resultjson.expiresInSec || 180;
            }
        } catch (err) {
            console.error("refreshTicket error:", err);
        }
    };

    // 최신 작업 상태 조회 (수동 새로고침 겸용)
    const triggerFetchJob = async (pids) => {
        const projectnum = sessionStorage.getItem("projectnum");
        const userId = auth?.user?.userId || sessionStorage.getItem("userId");
        if (!projectnum || !userId) return;
        try {
            const reqData = { pn: projectnum, user: userId };
            if (Array.isArray(pids) && pids.length > 0) {
                reqData.pids = pids;
            }
            const res = await viewQaJobs.mutateAsync(reqData);
            if (res?.success === "777" && res?.resultjson) {
                const payload = res.resultjson;
                if (payload.startUrl) {
                    setStartUrl(payload.startUrl);
                }

                if (payload.hasJob === false) {
                    setJobError("해당 프로젝트의 작업이 없습니다.");
                    setRespondents([]);
                    setProgressInfo({
                        totalRespondents: 0,
                        completed: 0,
                        success: 0,
                        defect: 0,
                        avgTimeSec: 0,
                        totalAiCostUsd: 0,
                        isFinished: false
                    });
                } else {
                    setJobError("");
                    setProgressInfo(payload.progress || null);
                    if (Array.isArray(payload.pids)) {
                        const mapped = payload.pids.map(item => {
                            let parsedLogs = [];
                            try {
                                parsedLogs = JSON.parse(item.logs || "[]");
                                if (!Array.isArray(parsedLogs)) parsedLogs = [];
                            } catch (e) {
                                parsedLogs = [];
                            }
                            return {
                                id: item.pid,
                                status: item.status === "success" ? "pass" : (item.status === "fail" ? "defect" : item.status),
                                finalQuestion: item.failureReason || "-",
                                message: item.message || "",
                                duration: item.processingTimeSec ? `${item.processingTimeSec}s` : "-",
                                errorCategory: item.failureClass || "",
                                errorDetail: item.failureDetail || "",
                                logs: parsedLogs,
                                lastUrl: item.lastUrl || null
                            };
                        });

                        if (Array.isArray(pids) && pids.length > 0) {
                            setRespondents(prev => {
                                const newMap = new Map(prev.map(r => [r.id, r]));
                                mapped.forEach(m => {
                                    newMap.set(m.id, m);
                                });
                                return Array.from(newMap.values());
                            });
                        } else {
                            setRespondents(mapped);
                        }

                        // 러너 응답 확인: 하나라도 pending이 아니면(running, success, fail) 러너 기동 완료 처리
                        const hasActiveRunner = mapped.some(p => p.status !== 'pending');
                        if (hasActiveRunner) {
                            setRunnerNotResponding(false);
                            if (runnerCheckTimerRef.current) {
                                clearTimeout(runnerCheckTimerRef.current);
                                runnerCheckTimerRef.current = null;
                            }
                        }

                        // 선택된 응답자가 현재 목록에 없으면 선택 해제
                        const isStillPresent = mapped.some(r => r.id === selectedPid);
                        if (!isStillPresent) {
                            setSelectedPid("");
                        }
                    }
                }
            } else if (res?.success === "900") {
                setJobError(res?.resultjson?.errorcontent || "해당 프로젝트의 작업이 없습니다.");
                setRespondents([]);
                setProgressInfo({
                    totalRespondents: 0,
                    completed: 0,
                    success: 0,
                    defect: 0,
                    avgTimeSec: 0,
                    totalAiCostUsd: 0,
                    isFinished: false
                });
            }
        } catch (err) {
            console.error("triggerFetchJob error:", err);
        }
    };

    // 마운트 시 티켓 발급, 작업상태 조회
    useEffect(() => {
        refreshTicket();
        triggerFetchJob();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth?.user?.userId]);

    // Visibility 변경 시 티켓 갱신
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshTicket();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (runnerCheckTimerRef.current) clearTimeout(runnerCheckTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth?.user?.userId]);



    // 통계 계산
    const currentTotal = progressInfo ? progressInfo.totalRespondents : respondents.length;
    const passCount = progressInfo ? progressInfo.success : respondents.filter(r => r.status === "pass").length;
    const defectCount = progressInfo ? progressInfo.defect : respondents.filter(r => r.status === "defect").length;
    const completedCount = progressInfo ? progressInfo.completed : (passCount + defectCount);
    const avgDuration = progressInfo ? `${progressInfo.avgTimeSec}s` : "0s";
    const aiCost = progressInfo ? `$${progressInfo.totalAiCostUsd}` : "$0";

    const progressPct = progressInfo
        ? (progressInfo.isFinished ? 100 : Math.round((progressInfo.completed / (progressInfo.totalRespondents || 1)) * 100))
        : 0;

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

    // 선택 삭제 (백엔드 API 호출)
    const handleDeleteSelected = async () => {
        if (checkedIds.length === 0) {
            modal.showAlert("알림", "삭제할 응답자를 선택해 주세요.");
            return;
        }
        const projectnum = sessionStorage.getItem("projectnum");
        const userId = auth?.user?.userId || sessionStorage.getItem("userId");
        if (!projectnum || !userId) {
            modal.showAlert("알림", "프로젝트 정보 또는 사용자 정보가 올바르지 않습니다.");
            return;
        }

        try {
            const resetRes = await resetTestPids.mutateAsync({
                pn: projectnum,
                user: userId,
                pids: checkedIds
            });

            if (resetRes?.success === "777") {
                const deletedPids = resetRes?.resultjson?.deletedPids || [];
                const skippedList = resetRes?.resultjson?.skipped || [];
                let msg = `선택한 테스트 데이터가 정리되었습니다. (삭제된 PID: ${deletedPids.length}개)`;
                if (skippedList.length > 0) {
                    msg += `\n\n[정리 제외 항목]:\n` + skippedList.map(s => `- ${s.pid}: ${s.reason}`).join('\n');
                }
                modal.showAlert("알림", msg);
                setCheckedIds([]);
                // 작업 상태 갱신
                await triggerFetchJob();
            } else {
                modal.showAlert("알림", resetRes?.resultjson?.errorcontent || "선택 삭제 중 오류가 발생했습니다.");
            }
        } catch (err) {
            console.error("handleDeleteSelected error:", err);
            modal.showAlert("알림", "선택 삭제 중 오류가 발생했습니다.");
        }
    };


    // SAV 파일 직접 내보내기 및 다운로드
    const handleExportSAV = async () => {
        const projectnum = sessionStorage.getItem("projectnum");
        const userId = auth?.user?.userId || sessionStorage.getItem("userId");
        if (!projectnum || !userId) {
            modal.showAlert("알림", "프로젝트 정보 또는 사용자 정보가 올바르지 않습니다.");
            return;
        }

        try {
            const reqData = { pn: projectnum, user: userId };
            if (checkedIds.length > 0) {
                reqData.pids = checkedIds;
            }

            const response = await exportTestData.mutateAsync(reqData);

            if (response && response.data) {
                const text = await response.data.text();
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.success === "900" || parsed.success === 900) {
                        const errMsg = parsed.message || "잘못된 요청입니다.";
                        modal.showAlert("알림", `${errMsg}`);
                        return;
                    }
                } catch (e) {
                    // JSON 파싱 실패 -> 바이너리 .sav 파일 다운로드 진행
                }

                const blob = response.data;
                let filename = `${projectnum}_e2e_testdata_${new Date().toISOString().replace(/[-T:]/g, '').slice(0, 14)}.sav`;

                const contentDisposition = response.headers?.['content-disposition'];
                if (contentDisposition) {
                    const match = contentDisposition.match(/filename\*?=["']?([^"';]+)["']?/);
                    if (match && match[1]) {
                        filename = decodeURIComponent(match[1].replace(/UTF-8''/i, ''));
                    }
                }

                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
            } else {
                modal.showAlert("알림", "파일을 다운로드할 수 없습니다.");
            }
        } catch (err) {
            console.error("handleExportSAV error:", err);
            modal.showAlert("알림", "데이터 내보내기 중 오류가 발생했습니다.");
        }
    };



    const IdCell = (props) => (
        <td style={{ ...props.style, padding: '8px 12px', verticalAlign: 'middle', fontWeight: 600, color: '#0f172a' }} className={props.className}>
            {props.dataItem.id}
        </td>
    );

    const StatusCell = (props) => {
        const { status } = props.dataItem;
        let text = status;
        let bg = '#f1f5f9';
        let color = '#475569';
        let border = '1px solid #cbd5e1';

        if (status === 'pending') {
            text = '대기';
            bg = '#fffbeb';
            color = '#d97706';
            border = '1px solid #fde68a';
        } else if (status === 'running') {
            text = '실행중';
            bg = '#f0f9ff';
            color = '#0284c7';
            border = '1px solid #bae6fd';
        } else if (status === 'success' || status === 'pass') {
            text = '✓ 통과';
            bg = '#f0fdf4';
            color = '#16a34a';
            border = '1px solid #bbf7d0';
        } else if (status === 'fail' || status === 'defect') {
            text = '✕ 결함';
            bg = '#fff1f1';
            color = '#dc2626';
            border = '1px solid #fecaca';
        }

        return (
            <td style={{ ...props.style, padding: '8px 12px', verticalAlign: 'middle' }} className={props.className}>
                <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                    background: bg, color: color, border: border, whiteSpace: 'nowrap'
                }}>
                    {text}
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

    const handleTestCountChange = (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        setTestCount(val);
    };

    const handleTestCountBlur = () => {
        let num = parseInt(testCount, 10);
        if (isNaN(num) || num < 1) {
            setTestCount(1);
        } else if (num > 50) {
            setTestCount(50);
        } else {
            setTestCount(num);
        }
    };



    // E2E Playwright 실행 시작
    const handleRunSimulation = async () => {
        const projectnum = sessionStorage.getItem("projectnum");
        const userId = auth?.user?.userId || sessionStorage.getItem("userId");
        if (!projectnum || !userId) {
            modal.showAlert("알림", "프로젝트 정보 또는 사용자 정보가 올바르지 않습니다.");
            return;
        }

        let parsedCount = 0;
        let pidsArray = [];

        if (autoPid) {
            parsedCount = parseInt(testCount, 10);
            if (isNaN(parsedCount) || parsedCount < 1 || parsedCount > 50) {
                modal.showAlert("알림", "자동 생성 개수는 1개부터 50개까지만 가능합니다.");
                return;
            }
        } else {
            pidsArray = manualPidList.split(',').map(p => p.trim()).filter(p => p !== "");
            parsedCount = pidsArray.length;
            if (parsedCount === 0) {
                modal.showAlert("알림", "생성할 PID 목록을 입력해 주세요.");
                return;
            }
            if (parsedCount < 1 || parsedCount > 50) {
                modal.showAlert("알림", `수동 생성할 PID 개수는 1개부터 최대 50개까지만 가능합니다. \n(현재: ${parsedCount}개)`);
                return;
            }
        }

        try {
            setIsSimulating(true);
            setProgressInfo(null);
            setJobError("");
            setRunnerNotResponding(false);

            // 1. 프로토콜에 실을 티켓 발급
            await refreshTicket(true); // 항상 신선한 티켓 강제 발급
            const ticket = ticketRef.current;

            // 2. 프로토콜 즉시 실행 (await 앞에서 동기 실행)
            if (ticket) {
                const enc = encodeURIComponent;
                const host = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || window.location.origin;
                window.location.href = `surveyonrunner://run?central=${enc(host)}&ticket=${enc(ticket)}&runnerId=${enc(runnerId)}`;

                ticketRef.current = null;
                setTimeout(() => refreshTicket(true), 500); // 1회용 → 폐기 후 재발급
            } else {
                console.warn("Ticket generation failed, launching protocol skipped.");
            }

            // 3. E2E 비동기 작업 시작 API 호출
            const runRes = await runQaE2eJobs.mutateAsync({
                pn: projectnum,
                user: userId,
                url: startUrl,
                autoGenPids: autoPid,
                count: autoPid ? parsedCount : 0,
                pids: autoPid ? [] : pidsArray,
                runTarget: "runner",
                strategy: {}
            });

            if (runRes?.success === "777") {
                if (runRes?.resultjson?.resuming) {
                    modal.showAlert("알림", "이전에 멈춘 작업을 이어서 재개합니다. \n러너가 곧 남은 항목을 처리합니다.");
                } else {
                    modal.showAlert("알림", "러너 실행 대기 job이 생성되었습니다. 러너가 claim하여 실행합니다.");
                }
            } else if (runRes?.success === "900") {
                modal.showAlert("알림", runRes?.resultjson?.errorcontent || "이미 진행 중인 작업이 있습니다. 완료된 후 다시 시작해주세요.");
            }

            // 작업 상태 갱신
            await triggerFetchJob();

            // 15초 타이머 시작 (러너가 응답 안 올 때 감지)
            if (runnerCheckTimerRef.current) clearTimeout(runnerCheckTimerRef.current);
            runnerCheckTimerRef.current = setTimeout(async () => {
                await triggerFetchJob();
                // 15초 후에도 pids가 있고 모두 pending이면 러너 미기동 경고 표시
                setRunnerNotResponding(true);
                // 떠있는 이전 작업 시작 알림창이 있다면 닫기
                modal.close();
            }, 15000);

        } catch (err) {
            console.error("handleRunSimulation error:", err);
            modal.showAlert("알림", "작업 시작 중 오류가 발생했습니다.");
        } finally {
            setIsSimulating(false);
        }
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
                                fontSize: '12px', color: '#1e293b', outline: 'none', background: '#f8fafc', width: '360px', boxSizing: 'border-box'
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
                                <input
                                    type="text"
                                    value={testCount}
                                    onChange={handleTestCountChange}
                                    onBlur={handleTestCountBlur}
                                    style={{
                                        flex: 1,
                                        width: '100%',
                                        textAlign: 'center',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: '#1e293b',
                                        border: 'none',
                                        outline: 'none',
                                        background: 'transparent',
                                        padding: 0
                                    }}
                                />
                                <button
                                    onClick={() => setTestCount(prev => Math.min(50, prev + 1))}
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
                                disabled={true}
                                style={{
                                    border: '1px solid #16a34a',
                                    borderRadius: '4px',
                                    padding: '0 10px',
                                    height: '100%',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    color: '#16a34a',
                                    background: '#fff',
                                    boxShadow: '0 1px 2px rgba(22, 163, 74, 0.1)',
                                    cursor: 'default',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                브라우저 실행 (EtoE)
                            </button>
                            <button
                                disabled={true}
                                style={{
                                    border: '1px solid transparent',
                                    borderRadius: '4px',
                                    padding: '0 10px',
                                    height: '100%',
                                    fontSize: '11.5px',
                                    fontWeight: '500',
                                    color: '#64748b',
                                    background: 'transparent',
                                    boxShadow: 'none',
                                    cursor: 'default',
                                    opacity: 0.5,
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
                                disabled={true}
                                style={{
                                    border: '1px solid #16a34a',
                                    borderRadius: '4px',
                                    padding: '0 10px',
                                    height: '100%',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    color: '#16a34a',
                                    background: '#fff',
                                    boxShadow: '0 1px 2px rgba(22, 163, 74, 0.1)',
                                    cursor: 'default',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                미포함
                            </button>
                            <button
                                disabled={true}
                                style={{
                                    border: '1px solid transparent',
                                    borderRadius: '4px',
                                    padding: '0 10px',
                                    height: '100%',
                                    fontSize: '11.5px',
                                    fontWeight: '500',
                                    color: '#64748b',
                                    background: 'transparent',
                                    boxShadow: 'none',
                                    cursor: 'default',
                                    opacity: 0.5,
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                포함
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                        {/* 시뮬레이션 시작 버튼 */}
                        <button
                            onClick={handleRunSimulation}
                            disabled={isSimulating}
                            style={{
                                height: '32px', padding: '0 16px', border: 'none', borderRadius: '6px',
                                background: '#16a34a', color: '#fff', fontSize: '12px', fontWeight: 500,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)', opacity: isSimulating ? 0.7 : 1,
                                boxSizing: 'border-box'
                            }}
                            onMouseOver={(e) => { if (!isSimulating) e.currentTarget.style.background = '#15803d'; }}
                            onMouseOut={(e) => { if (!isSimulating) e.currentTarget.style.background = '#16a34a'; }}
                            onMouseEnter={() => refreshTicket()}
                        >
                            <Play size={11} fill="#fff" />
                            <span style={{ whiteSpace: 'nowrap' }}>AI 데이터 생성 시작</span>
                        </button>
                    </div>
                </div>

                {/* ── 상단 2: 생성 진행 상태 및 요약 통계 ── */}
                <div className="ai-stats-bar" style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '12px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', shrink: 0
                }}>
                    {/* 진행률 바 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                ⚡ 생성 진행 상태 <span style={{ color: '#16a34a' }}>{progressPct}%</span>
                            </span>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${progressPct}%`, height: '100%', background: '#10b981', transition: 'width 0.3s ease' }} />
                            </div>
                        </div>
                        <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                            ※ 동시 실행 한도 5개 제한으로 인해 일부 응답자는 pending(대기) 상태로 노출될 수 있습니다. (인당 약 6분 소요)
                        </span>
                    </div>

                    {/* 통계 지표들 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                        <div>총 응답자 <strong style={{ color: '#1e293b' }}>{currentTotal}</strong></div>
                        <div style={{ color: '#cbd5e1' }}>|</div>
                        <div>완료 <strong style={{ color: '#1e293b' }}>{completedCount}</strong></div>
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

                {/* 러너 미기동 오류 경고 모달 */}
                {runnerNotResponding && (
                    <div className="nd-modal-overlay">
                        <div className="nd-modal-container" style={{ width: '480px' }}>
                            <div className="nd-modal-header">
                                <h3 className="with-bar">러너 미기동 감지</h3>
                                <button className="nd-close-btn" onClick={() => setRunnerNotResponding(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="nd-modal-body">
                                <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                                    작업을 시작했으나 E2E 봇 러너(Runner)가 실행되지 않았습니다.<br /><br />
                                    <strong>[해결 방법]</strong><br />
                                    ① 러너를 아직 설치하지 않았다면 아래 <strong>[러너 다운로드]</strong> 버튼을 클릭하여 설치 후 실행해 주세요.<br />
                                    ② 설치 후에도 실행되지 않는다면 크롬 주소창에 <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '3px', fontSize: '11px', color: '#dc2626' }}>chrome://extensions</code>를 입력하여 보안 프로그램 및 VPN 확장 프로그램들을 일시적으로 꺼두고 다시 시도해 주세요.
                                </p>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                    <button
                                        onClick={() => setRunnerNotResponding(false)}
                                        style={{
                                            background: '#fff', border: '1px solid #cbd5e1', color: '#475569',
                                            fontSize: '12px', fontWeight: 600, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer'
                                        }}
                                    >
                                        닫기
                                    </button>
                                    <a
                                        href="/downloads/surveyon-runner.zip"
                                        download
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            background: '#16a34a', color: '#fff', fontSize: '12px', fontWeight: 700,
                                            padding: '8px 16px', borderRadius: '6px', textDecoration: 'none',
                                            boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                                        }}
                                    >
                                        러너 다운로드
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                                            borderRadius: '6px', fontSize: '12px', width: '180px', outline: 'none'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={() => triggerFetchJob(checkedIds.length > 0 ? checkedIds : undefined)}
                                    style={{
                                        height: '30px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                        background: '#fff', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                                    }}
                                    title="진행상태 및 상세결과 새로고침"
                                >
                                    <RefreshCw size={12} />
                                    {checkedIds.length > 0 ? `선택 새로고침 (${checkedIds.length})` : '새로고침'}
                                </button>

                                <button
                                    onClick={handleExportSAV}
                                    style={{
                                        height: '30px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                        background: '#fff', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                                    }}
                                >
                                    <Download size={12} />
                                    {checkedIds.length > 0 ? `선택 내보내기 (${checkedIds.length})` : '내보내기'}
                                </button>
                                {checkedIds.length > 0 && (
                                    <>
                                        <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0', margin: '0 4px' }} />
                                        <button
                                            onClick={handleDeleteSelected}
                                            style={{
                                                height: '30px', padding: '0 10px', border: '1px solid #fca5a5', borderRadius: '6px',
                                                background: '#fef2f2', fontSize: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                                        >
                                            <Trash2 size={12} />
                                            선택 삭제 ({checkedIds.length})
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 가이드 메시지 */}
                        {!jobError && (
                            <div style={{ fontSize: '11.5px', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '10px', shrink: 0 }}>
                                💡 행을 클릭하면 우측 리포트에서 상세 로그가 조회됩니다. 체크박스 선택 시 {"'선택 삭제'"} 버튼이 활성화됩니다.
                            </div>
                        )}

                        {/* 그리드 영역 */}
                        <div className="cmn_grid singlehead" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                            {jobError ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    gap: '6px',
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <AlertTriangle size={32} color="#f59e0b" style={{ marginBottom: '8px' }} />
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                                        해당 프로젝트의 작업이 없습니다.
                                    </span>
                                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                                        AI데이터 생성을 실행해 주세요.
                                    </span>
                                </div>
                            ) : (
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
                            )}
                        </div>
                    </div>

                    {/* [우] 중단 발견 리포트 */}
                    <div className="st-panel" style={{ flex: 4, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>

                        {selectedRespondent ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

                                {/* 리포트 헤더 */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px', shrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {selectedRespondent.status === "defect" && (
                                            <>
                                                <AlertTriangle size={18} color="#dc2626" />
                                                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#dc2626' }}>
                                                    중단 발견 리포트
                                                </span>
                                            </>
                                        )}
                                        {selectedRespondent.status === "pass" && (
                                            <>
                                                <CheckCircle2 size={18} color="#16a34a" />
                                                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#16a34a' }}>
                                                    수행 완료 리포트
                                                </span>
                                            </>
                                        )}
                                        {selectedRespondent.status === "running" && (
                                            <>
                                                <Loader2 size={18} className="ai-spin" color="#2563eb" />
                                                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#2563eb' }}>
                                                    수행 진행 리포트
                                                </span>
                                            </>
                                        )}
                                        {selectedRespondent.status === "pending" && (
                                            <>
                                                <Clock size={18} color="#64748b" />
                                                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#64748b' }}>
                                                    수행 대기 리포트
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>PID {selectedRespondent.id}</span>
                                </div>

                                {selectedRespondent.status === "defect" && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', shrink: 0 }}>
                                            {/* 중단 사유 분류 */}
                                            <div style={{ background: '#fff1f1', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>① 중단 사유 분류</span>
                                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                                                        {FAILURE_CLASS_MAP[selectedRespondent.errorCategory]?.label || selectedRespondent.errorCategory || "기타 결함"}
                                                    </span>
                                                    {FAILURE_CLASS_MAP[selectedRespondent.errorCategory]?.advice && FAILURE_CLASS_MAP[selectedRespondent.errorCategory]?.advice !== "-" && (
                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px' }}>
                                                            💡 권고: {FAILURE_CLASS_MAP[selectedRespondent.errorCategory].advice}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 상세 오류 내용 */}
                                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>② 상세 오류 내용</span>
                                                <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.5', margin: '0 0 12px 0', wordBreak: 'break-all' }}>
                                                    {selectedRespondent.errorDetail || "상세 오류 기록이 없습니다."}
                                                </p>

                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => {
                                                            if (selectedRespondent.lastUrl) {
                                                                window.open(selectedRespondent.lastUrl, '_blank');
                                                            } else {
                                                                modal.showAlert("알림", "실패 화면 스냅샷 URL이 없습니다.");
                                                            }
                                                        }}
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
                                )}

                                {selectedRespondent.status === "pass" && (
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

                                {selectedRespondent.status === "running" && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                        <div style={{
                                            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
                                            padding: '12px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', shrink: 0
                                        }}>
                                            <Loader2 size={18} className="ai-spin" color="#2563eb" style={{ shrink: 0 }} />
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8' }}>현재 설문 검증 진행 중</div>
                                                <div style={{ fontSize: '11.5px', color: '#1e40af', marginTop: '2px' }}>봇이 브라우저를 실행해 실시간으로 문항을 기입하며 응답하고 있습니다.</div>
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
                                                {selectedRespondent.logs.length > 0 ? (
                                                    selectedRespondent.logs.map((logLine, idx) => {
                                                        let color = '#cbd5e1';
                                                        if (logLine.includes('[시스템]')) color = '#4ade80';
                                                        if (logLine.includes('[브라우저]')) color = '#38bdf8';
                                                        if (logLine.includes('[오류]')) color = '#f87171';
                                                        if (logLine.includes('[경고]')) color = '#fb923c';

                                                        return (
                                                            <div key={idx} style={{ color, lineHeight: '1.4', wordBreak: 'break-all' }}>
                                                                {logLine}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div style={{ color: '#64748b', fontSize: '11.5px', fontStyle: 'italic' }}>
                                                        실시간 로그를 대기 중입니다...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedRespondent.status === "pending" && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0, padding: '20px' }}>
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '50%',
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: '16px'
                                        }}>
                                            <Clock size={28} color="#64748b" />
                                        </div>
                                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#475569', marginBottom: '8px', textAlign: 'center' }}>
                                            PID {selectedRespondent.id} · 수행 대기 중
                                        </div>
                                        <div style={{ fontSize: '12.5px', color: '#64748b', textAlign: 'center', lineHeight: '1.6', maxWidth: '280px' }}>
                                            작업 큐에 등록되어 러너의 실행을 기다리고 있습니다.
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
            {/* showExportModal && (
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
            ) */}



            {/* 슬라이더 스위치 & 필터 칩 CSS 스타일 */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes ai-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .ai-spin {
                    animation: ai-spin 1s linear infinite;
                }

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