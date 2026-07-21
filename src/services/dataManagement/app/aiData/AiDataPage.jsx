import { useState, useContext, cloneElement, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Search, Download, ExternalLink, Play, AlertTriangle,
    CheckCircle2, X, RefreshCw, Clock, Loader2, Trash2, Info, RotateCcw
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
    const [isProcessingReset, setIsProcessingReset] = useState(false);
    const [isGridLoading, setIsGridLoading] = useState(false);
    const [respondents, setRespondents] = useState([]);
    const [selectedPid, setSelectedPid] = useState("");
    const [checkedIds, setCheckedIds] = useState([]);

    // 현재 respondents에 실제 존재하는 checkedIds만 동기화 (String 타입 통일 및 중단/삭제된 ID 자동 필터링)
    const validCheckedIds = useMemo(() => {
        const existingSet = new Set(respondents.map(r => String(r.id)));
        const uniqueChecked = Array.from(new Set(checkedIds.map(String)));
        return uniqueChecked.filter(id => existingSet.has(id));
    }, [checkedIds, respondents]);

    // 내보내기 팝업 표시 여부 (보류로 인한 비활성화)
    // const [showExportModal, setShowExportModal] = useState(false);

    // 필터 & 검색
    const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'pass' | 'defect'
    const [searchQuery, setSearchQuery] = useState("");

    // AI 데이터 작업 상태
    const auth = useSelector((store) => store.auth);
    const [progressInfo, setProgressInfo] = useState(null);
    const [jobError, setJobError] = useState("");
    const { viewQaJobs, getQaTicket, runQaE2eJobs, resetTestPids, exportTestData, checkRunnerStatus } = AiDataPageApi();

    // 티켓 관리 (시뮬레이션 실행 시작 시에만 발급)

    // 러너 실행 감지
    const [runnerNotResponding, setRunnerNotResponding] = useState(false);
    const [isRunnerStarting, setIsRunnerStarting] = useState(false);
    const [runnerGuide, setRunnerGuide] = useState(null);
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

    // 1회용 티켓 발급
    const fetchFreshTicket = async () => {
        const projectnum = sessionStorage.getItem("projectnum");
        const userId = auth?.user?.userId || sessionStorage.getItem("userId");
        if (!projectnum || !userId) return null;

        try {
            const res = await getQaTicket.mutateAsync({ pn: projectnum, user: userId });
            if (res?.success === "777" && res?.resultjson) {
                return res.resultjson.ticket;
            }
        } catch (err) {
            console.error("fetchFreshTicket error:", err);
        }
        return null;
    };

    // 최신 작업 상태 조회 (수동 새로고침 겸용)
    const triggerFetchJob = async (pids) => {
        const projectnum = sessionStorage.getItem("projectnum");
        const userId = auth?.user?.userId || sessionStorage.getItem("userId");
        if (!projectnum || !userId) return;
        setIsGridLoading(true);
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
                        isFinished: true
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
                                id: String(item.pid),
                                status: item.status === "success" ? "pass" : (item.status === "fail" ? "defect" : item.status),
                                finalQuestion: item.failedQuestionNum || item.failedQuestion || "-",
                                failureReason: item.failureReason || "",
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
                                const newMap = new Map(prev.map(r => [String(r.id), r]));
                                mapped.forEach(m => {
                                    newMap.set(String(m.id), m);
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
        } finally {
            setIsGridLoading(false);
        }
    };

    // 마운트 시 작업상태 조회
    useEffect(() => {
        triggerFetchJob();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth?.user?.userId]);

    // 언마운트 시 타이머 정리
    useEffect(() => {
        return () => {
            if (runnerCheckTimerRef.current) clearTimeout(runnerCheckTimerRef.current);
        };
    }, []);



    // 통계 계산
    const currentTotal = progressInfo ? progressInfo.totalRespondents : respondents.length;
    const passCount = progressInfo ? progressInfo.success : respondents.filter(r => r.status === "pass").length;
    const defectCount = progressInfo ? progressInfo.defect : respondents.filter(r => r.status === "defect").length;
    const completedCount = progressInfo ? progressInfo.completed : (passCount + defectCount);
    const avgDuration = progressInfo ? `${progressInfo.avgTimeSec}s` : "0s";
    const aiCost = progressInfo ? `$${progressInfo.totalAiCostUsd}` : "$0";

    const progressPct = progressInfo
        ? ((!progressInfo.totalRespondents || progressInfo.totalRespondents === 0)
            ? 0
            : (progressInfo.isFinished ? 100 : Math.round((progressInfo.completed / progressInfo.totalRespondents) * 100)))
        : 0;

    // 현재 진행중이거나 대기중인 응답자가 있는지 여부 (새로고침 강조용)
    const isJobRunning = isSimulating ||
        progressInfo?.isFinished === false ||
        respondents.some(r => r.status === "running" || r.status === "pending");

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

    // 공통 응답자 ID 삭제/초기화 실행 함수 (APIs/d/qa/reset-test-pid API 연동)
    const executeResetOrDelete = async (actionType = "reset") => {
        const projectnum = sessionStorage.getItem("projectnum");
        const userId = auth?.user?.userId || sessionStorage.getItem("userId");
        if (!projectnum || !userId) {
            modal.showAlert("알림", "프로젝트 정보 또는 사용자 정보가 올바르지 않습니다.");
            return;
        }

        const isSelected = validCheckedIds.length > 0;
        const targetPids = isSelected ? validCheckedIds : respondents.map(r => String(r.id));

        const actionLabel = actionType === "delete" ? "삭제" : "초기화";

        if (targetPids.length === 0) {
            modal.showAlert("알림", `${actionLabel}할 응답자 ID가 없습니다.`);
            return;
        }

        if (targetPids.length > 500) {
            modal.showAlert("알림", `${actionLabel} 대상 PID가 500개를 초과했습니다. (한 번에 최대 500개까지 요청 가능)`);
            return;
        }

        const confirmMsg = isSelected
            ? `선택한 ${validCheckedIds.length}개의 응답자 ID를 ${actionLabel}하시겠습니까?`
            : `프로젝트의 모든 응답자 ID (${targetPids.length}개)를 ${actionLabel}하시겠습니까?`;

        modal.showConfirm("알림", confirmMsg, {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: actionLabel,
                    click: async () => {
                        const startTime = Date.now();
                        setIsProcessingReset(true);
                        try {
                            const resetRes = await resetTestPids.mutateAsync({
                                pn: String(projectnum),
                                user: String(userId),
                                pids: targetPids.map(String)
                            });

                            if (resetRes?.success === "777") {
                                const resJson = resetRes?.resultjson || {};
                                const deletedPids = resJson.deletedPids || [];
                                const deletedCount = resJson.deleted ?? deletedPids.length ?? 0;
                                const skippedList = resJson.skipped || [];

                                let qmSuccess = true;

                                // deletedPids가 존재하면 QMaster (RPS/QM) 초기화 API 별도 호출
                                if (Array.isArray(deletedPids) && deletedPids.length > 0) {
                                    const rawServerName = (sessionStorage.getItem("servername") || sessionStorage.getItem("serverName") || "").toLowerCase();
                                    const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
                                    let domainPrefix = "";
                                    if (isDev) {
                                        domainPrefix = rawServerName.includes("qm") ? "/qm-silsa" : "/rps-silsa";
                                    } else {
                                        domainPrefix = rawServerName.includes("qm")
                                            ? "https://qm.hrcglobal.com"
                                            : "https://rpssurvey.hrcglobal.com";
                                    }

                                    const pidListStr = deletedPids.join(",");
                                    const qmasterUrl = `${domainPrefix}/Silsa/Progress/resetDataWithKey?eNum=5000037&apiKey=Dxz0vN94ZzFXEP2KcngRSu06HgbqJ94CeBzZs5A2o&qn=${encodeURIComponent(projectnum)}&pidList=${encodeURIComponent(pidListStr)}`;

                                    try {
                                        console.log("[QMaster Reset API Call]", qmasterUrl);
                                        if (isDev) {
                                            const qmRes = await axios.post(qmasterUrl, {});
                                            const resText = typeof qmRes.data === 'string' ? qmRes.data : JSON.stringify(qmRes.data);
                                            if (!resText.includes("성공")) {
                                                qmSuccess = false;
                                            }
                                        } else {
                                            // 테스트/운영 환경: 서버 Nginx 수정 없이 no-cors 직송 모드로 2번 API 요청을 수신 서버에 안전 전달
                                            await fetch(qmasterUrl, { method: 'POST', mode: 'no-cors' });
                                        }
                                    } catch (qmErr) {
                                        console.error("QMaster resetDataWithKey API call error:", qmErr);
                                        qmSuccess = false;
                                    }
                                }

                                let msg = "";
                                if (!qmSuccess) {
                                    // [경우 2] 1번 API 성공 + 2번 API 실패 (QMaster 연동 오류)
                                    msg = `${actionLabel}에 실패하였습니다.\n` +
                                        `이미 ${actionLabel}된 아이디를 다시 ${actionLabel}할 경우 에러가 발생할 수 있습니다.\n` +
                                        `해당 아이디를 재사용해 보시고 문제가 발생할 경우 AI솔루션팀에 문의해주세요.`;
                                } else if (deletedCount === 0) {
                                    // [경우 3] 1번 API 성공했으나 0개 처리된 경우 (실사 차단 등)
                                    msg = `${actionLabel}된 응답이 없습니다.`;
                                    if (skippedList.length > 0) {
                                        msg += `\n\n[실사 보호 거부 항목 (${skippedList.length}개)]:\n` +
                                            skippedList.map(s => `- PID ${s.pid}: ${s.reason}`).join('\n');
                                    }
                                } else {
                                    // [경우 1] 1번 API 성공 + 2번 API 성공 (완전 성공)
                                    msg = `${actionLabel} 처리 완료: ${deletedCount}개의 응답이 ${actionLabel}되었습니다.`;
                                    if (skippedList.length > 0) {
                                        msg += `\n\n[실사 보호 거부 항목 (${skippedList.length}개)]:\n` +
                                            skippedList.map(s => `- PID ${s.pid}: ${s.reason}`).join('\n');
                                    }
                                }

                                // 사용자 인지를 위해 최소 800ms 동안 로딩바 표출 보장
                                const elapsed = Date.now() - startTime;
                                if (elapsed < 800) {
                                    await new Promise(r => setTimeout(r, 800 - elapsed));
                                }

                                setIsProcessingReset(false);
                                modal.showAlert("알림", msg);
                                setCheckedIds([]);
                                // 상태 및 목록 갱신
                                await triggerFetchJob();
                            } else {
                                // [경우 4] 1번 API 실패 (success !== "777")
                                setIsProcessingReset(false);
                                modal.showAlert("알림", resetRes?.resultjson?.errorcontent || resetRes?.message || `${actionLabel} 중 오류가 발생했습니다.`);
                            }
                        } catch (err) {
                            console.error(`executeResetOrDelete (${actionType}) error:`, err);
                            setIsProcessingReset(false);
                            modal.showAlert("알림", `${actionLabel} 처리 중 오류가 발생했습니다.`);
                        } finally {
                            setIsProcessingReset(false);
                        }
                    }
                }
            ]
        });
    };

    const handleDeleteSelected = () => executeResetOrDelete("delete");
    const handleResetAll = () => executeResetOrDelete("reset");


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
            if (validCheckedIds.length > 0) {
                reqData.pids = validCheckedIds;
            }

            const response = await exportTestData.mutateAsync(reqData);

            if (response && response.data) {
                const text = await response.data.text();
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.success === "900" || parsed.success === 900) {
                        const errMsg = parsed.resultjson?.errorcontent || "데이터 내보내기 중 오류가 발생했습니다.";
                        modal.showAlert("알림", `${errMsg}`);
                        return;
                    }
                } catch (e) {
                    // JSON 파싱 실패 -> 바이너리 .sav 파일 다운로드 진행
                }

                const blob = response.data;
                let filename = "";
                if (validCheckedIds.length === 1) {
                    filename = `${projectnum}_${validCheckedIds[0]}.sav`;
                } else if (validCheckedIds.length > 1) {
                    filename = `${projectnum}_multiple.sav`;
                } else {
                    filename = `${projectnum}_all.sav`;
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
            text = '✕ 중단';
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
        const isHasQuestion = finalQuestion && finalQuestion !== "-";
        return (
            <td
                title={isHasQuestion ? finalQuestion : undefined}
                style={{ ...props.style, padding: '8px 12px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                className={props.className}
            >
                {isHasQuestion ? (
                    <span
                        title={finalQuestion}
                        style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                            background: '#fff1f1', color: '#dc2626', border: '1px solid #fecaca',
                            display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            verticalAlign: 'middle', boxSizing: 'border-box', cursor: 'pointer'
                        }}
                    >
                        {finalQuestion}
                    </span>
                ) : (
                    <span style={{ color: '#94a3b8' }}>-</span>
                )}
            </td>
        );
    };

    const MessageCell = (props) => {
        const { status, message, failureReason, errorCategory } = props.dataItem;
        const text = status === "pass" ? (message || "-") : (failureReason || errorCategory || "-");
        return (
            <td
                title={text !== "-" ? text : undefined}
                style={{
                    ...props.style, padding: '8px 12px', verticalAlign: 'middle', color: '#475569',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}
                className={props.className}
            >
                {text}
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
        const strId = String(dataItem.id);
        const isChecked = validCheckedIds.includes(strId);
        const handleChange = (e) => {
            e.stopPropagation();
            if (isChecked) {
                setCheckedIds(prev => prev.map(String).filter(id => id !== strId));
            } else {
                setCheckedIds(prev => Array.from(new Set([...prev.map(String), strId])));
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
        const filteredIds = filteredRespondents.map(r => String(r.id));
        const validFilteredChecked = validCheckedIds.filter(id => filteredIds.includes(id));
        const allChecked = filteredIds.length > 0 && validFilteredChecked.length === filteredIds.length;
        const someChecked = validFilteredChecked.length > 0 && !allChecked;

        const handleChange = () => {
            if (allChecked) {
                const filteredSet = new Set(filteredIds);
                setCheckedIds(prev => prev.map(String).filter(id => !filteredSet.has(id)));
            } else {
                setCheckedIds(prev => Array.from(new Set([...prev.map(String), ...filteredIds])));
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
        const isChecked = validCheckedIds.includes(String(dataItem?.id));

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
            const ticket = await fetchFreshTicket();

            // 2. 프로토콜 즉시 실행
            if (ticket) {
                const enc = encodeURIComponent;
                const host = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || window.location.origin;
                window.location.href = `surveyonrunner://run?central=${enc(host)}&ticket=${enc(ticket)}&runnerId=${enc(runnerId)}`;
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
                // 러너 실행 시동 중 UI 표출
                setIsRunnerStarting(true);

                const checkAfterSec = 15;

                // 타이머 시작 (checkAfterSec초 후 확인 API 호출)
                if (runnerCheckTimerRef.current) clearTimeout(runnerCheckTimerRef.current);
                runnerCheckTimerRef.current = setTimeout(async () => {
                    try {
                        const checkRes = await checkRunnerStatus.mutateAsync({
                            pn: projectnum,
                            user: userId
                        });

                        setIsRunnerStarting(false);

                        const payload = checkRes?.resultjson || checkRes?.data;
                        if (checkRes?.success === "777" && payload?.claimed === true) {
                            // 정상 기동 및 수령됨
                            setRunnerNotResponding(false);
                            setRunnerGuide(null);
                            await triggerFetchJob();
                        } else {
                            // 미기동 또는 수령 안 됨 → 가이드 셋팅 및 경고창
                            setRunnerGuide(payload?.guide || null);
                            setRunnerNotResponding(true);
                        }
                    } catch (e) {
                        console.error("runnerCheck error:", e);
                        setIsRunnerStarting(false);
                        setRunnerNotResponding(true);
                    }
                }, checkAfterSec * 1000);
            } else if (runRes?.success === "900") {
                modal.showAlert("알림", runRes?.resultjson?.errorcontent || "작업 시작 중 오류가 발생했습니다.");
            }

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
                            disabled={isSimulating || progressInfo?.isFinished === false}
                            style={{
                                height: '32px', padding: '0 16px', border: 'none', borderRadius: '6px',
                                background: (isSimulating || progressInfo?.isFinished === false) ? '#cbd5e1' : '#16a34a',
                                color: (isSimulating || progressInfo?.isFinished === false) ? '#94a3b8' : '#fff',
                                fontSize: '12px', fontWeight: 500,
                                cursor: (isSimulating || progressInfo?.isFinished === false) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: (isSimulating || progressInfo?.isFinished === false) ? 'none' : '0 2px 6px rgba(22, 163, 74, 0.2)',
                                opacity: 1,
                                boxSizing: 'border-box'
                            }}
                            onMouseOver={(e) => { if (!isSimulating && progressInfo?.isFinished !== false) e.currentTarget.style.background = '#15803d'; }}
                            onMouseOut={(e) => { if (!isSimulating && progressInfo?.isFinished !== false) e.currentTarget.style.background = '#16a34a'; }}
                        >
                            <Play size={11} fill={isSimulating || progressInfo?.isFinished === false ? '#94a3b8' : '#fff'} />
                            <span style={{ whiteSpace: 'nowrap' }}>AI 데이터 생성 시작</span>
                        </button>
                    </div>
                </div>

                {/* ── 상단 2: 생성 진행 상태 및 요약 통계 ── */}
                <div className="ai-stats-bar" style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', shrink: 0
                }}>
                    {/* 상단 행: 진행률 및 요약 배지, 새로고침 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%' }}>
                        {/* 진행률 바 및 새로고침 버튼 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, marginRight: '16px' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                                ⚡ 생성 진행률 <span style={{ color: '#10b981', fontWeight: 800 }}>{progressPct}%</span>
                            </span>
                            <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                            </div>

                            {/* 게이지 바로 우측에 배치되는 새로고침 버튼 */}
                            <button
                                onClick={() => triggerFetchJob()}
                                className={isJobRunning ? "refresh-btn-pulse" : ""}
                                style={{
                                    height: '24px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '4px',
                                    background: '#fff', fontSize: '11.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap',
                                    transition: 'all 0.15s', fontWeight: 600, marginLeft: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    boxSizing: 'border-box'
                                }}
                                onMouseOver={(e) => { if (!isJobRunning) e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseOut={(e) => { if (!isJobRunning) e.currentTarget.style.background = '#fff'; }}
                                title="진행상태 및 상세결과 새로고침"
                            >
                                <RefreshCw size={11} color={isJobRunning ? "#047857" : "#10b981"} className={isJobRunning ? "ai-spin" : ""} style={{ strokeWidth: 2.5 }} />
                                <span>새로고침</span>
                            </button>
                        </div>

                        {/* 구분 세로선 */}
                        <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0', marginRight: '6px' }} />

                        {/* 요약 배지 목록 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                            {/* 총 응답자 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#475569' }}>
                                <span style={{ fontWeight: 600 }}>총 응답자</span>
                                <strong style={{ color: '#1e293b' }}>{currentTotal}</strong>
                            </div>
                            {/* 완료 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#0369a1' }}>
                                <span style={{ fontWeight: 600 }}>완료</span>
                                <strong style={{ color: '#0369a1' }}>{completedCount}</strong>
                            </div>
                            {/* 성공 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#15803d' }}>
                                <span style={{ fontWeight: 600 }}>성공</span>
                                <strong style={{ color: '#15803d' }}>{passCount}</strong>
                            </div>
                            {/* 중단 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff1f1', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#b91c1c' }}>
                                <span style={{ fontWeight: 600 }}>중단</span>
                                <strong style={{ color: '#b91c1c' }}>{defectCount}</strong>
                            </div>
                            {/* 평균소요 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#b45309' }}>
                                <span style={{ fontWeight: 600 }}>평균소요</span>
                                <strong style={{ color: '#b45309' }}>{avgDuration}</strong>
                            </div>
                            {/* 총 AI 비용 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#faf5ff', border: '1px solid #e9d5ff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#6d28d9' }}>
                                <span style={{ fontWeight: 600 }}>총 AI 비용</span>
                                <strong style={{ color: '#6d28d9' }}>{aiCost}</strong>
                            </div>
                        </div>
                    </div>

                    {/* 하단 행: 설명 문구 */}
                    <span style={{ fontSize: '9.5px', color: '#94a3b8', width: '100%', textAlign: 'left' }}>
                        ※ 동시 실행 한도 5개 제한으로 인해 일부 응답자는 대기 상태로 노출될 수 있습니다. (인당 약 6분 소요)
                    </span>
                </div>

                {/* 러너 미기동 오류 경고 모달 */}
                {runnerNotResponding && (
                    <div className="nd-modal-overlay">
                        <div className="nd-modal-container" style={{ width: '550px' }}>
                            <div className="nd-modal-header">
                                <h3 className="with-bar" style={{ fontSize: '17px' }}>러너 실행 실패</h3>
                                <button className="nd-close-btn" onClick={() => setRunnerNotResponding(false)}>
                                    <X size={22} />
                                </button>
                            </div>
                            <div className="nd-modal-body" style={{ padding: '10px 10px' }}>
                                {runnerGuide ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                                        {/* 체크리스트 단계별 정보 */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', position: 'relative' }}>
                                            {/* 수직 연결선 */}
                                            <div style={{
                                                position: 'absolute', left: '12px', top: '28px', bottom: '12px',
                                                width: '1px', backgroundColor: '#e2e8f0', zIndex: 0
                                            }} />

                                            {/* Step 1 */}
                                            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                                <span style={{
                                                    width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13.5px', fontWeight: 700, flexShrink: 0, marginTop: '2px',
                                                    position: 'relative', zIndex: 2
                                                }}>
                                                    1
                                                </span>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>러너 프로그램 설치</span>
                                                    <span style={{ color: '#475569', fontSize: '13.5px', lineHeight: '1.5' }}>러너가 설치되지 않았다면 아래 [러너 다운로드] 버튼을 클릭해 설치해 주세요.</span>
                                                    {runnerGuide.smartScreen && (
                                                        <span style={{ color: '#475569', fontSize: '12.5px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '6px 10px', marginTop: '4px', display: 'inline-block', width: 'fit-content', lineHeight: '1.4' }}>
                                                            {runnerGuide.smartScreen.replace(/['']/g, '').replace('[추가 정보] → [실행]', '우측 상단 [추가 정보] 클릭 후 [실행] 선택')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Step 2 */}
                                            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                                <span style={{
                                                    width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13.5px', fontWeight: 700, flexShrink: 0, marginTop: '2px',
                                                    position: 'relative', zIndex: 2
                                                }}>
                                                    2
                                                </span>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>브라우저 확장 프로그램 확인</span>
                                                    <span style={{ color: '#475569', fontSize: '13.5px', lineHeight: '1.5' }}>
                                                        {Array.isArray(runnerGuide.reasons) && runnerGuide.reasons[1]
                                                            ? runnerGuide.reasons[1].replace(/^[①②]\s*/, '').replace(/^이미 설치했다면\s*→\s*/, '')
                                                            : "이미 러너를 설치했다면 브라우저 확장 프로그램(보안/VPN) 차단 여부를 확인해 주세요."}
                                                    </span>
                                                    <span style={{ color: '#64748b', fontSize: '12.5px', marginTop: '2px' }}>
                                                        (주소창에 <code style={{ background: '#f1f5f9', padding: '1px 3px', borderRadius: '3px', color: '#dc2626' }}>chrome://extensions</code> 입력 후 관련 확장 해제)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 구분선 및 재시도 안내 */}
                                        {runnerGuide.retry && (() => {
                                            const parts = runnerGuide.retry.split('(');
                                            const mainText = parts[0]?.trim();
                                            const subText = parts[1] ? `(${parts[1]}` : '';
                                            return (
                                                <div style={{
                                                    borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '6px',
                                                    display: 'flex', gap: '10px', alignItems: 'flex-start'
                                                }}>
                                                    <Info size={16} style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.4' }}>
                                                        <span style={{ fontSize: '13.5px', color: '#334155', fontWeight: 500 }}>{mainText}</span>
                                                        {subText && (
                                                            <span style={{ fontSize: '12.5px', color: '#64748b' }}>{subText}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                                        {/* 체크리스트 단계별 정보 */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', position: 'relative' }}>
                                            {/* 수직 연결선 */}
                                            <div style={{
                                                position: 'absolute', left: '12px', top: '28px', bottom: '12px',
                                                width: '1px', backgroundColor: '#e2e8f0', zIndex: 0
                                            }} />

                                            {/* Step 1 */}
                                            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                                <span style={{
                                                    width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13.5px', fontWeight: 700, flexShrink: 0, marginTop: '2px',
                                                    position: 'relative', zIndex: 2
                                                }}>
                                                    1
                                                </span>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>러너 프로그램 설치</span>
                                                    <span style={{ color: '#475569', fontSize: '13.5px', lineHeight: '1.5' }}>러너가 설치되지 않았다면 아래 [러너 다운로드] 버튼을 클릭해 설치해 주세요.</span>
                                                    <span style={{ color: '#475569', fontSize: '12.5px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px 8px', marginTop: '4px', display: 'inline-block', width: 'fit-content' }}>
                                                        <span style={{ color: '#b45309', fontWeight: 600 }}>※ Windows 보호 창 노출 시:</span> 우측 상단 [추가 정보] 클릭 후 [실행] 선택
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Step 2 */}
                                            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                                <span style={{
                                                    width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13.5px', fontWeight: 700, flexShrink: 0, marginTop: '2px',
                                                    position: 'relative', zIndex: 2
                                                }}>
                                                    2
                                                </span>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>브라우저 확장 프로그램 확인</span>
                                                    <span style={{ color: '#475569', fontSize: '13.5px', lineHeight: '1.5' }}>이미 설치했다면 브라우저 확장 프로그램(보안/VPN) 차단 여부를 확인해 주세요.</span>
                                                    <span style={{ color: '#64748b', fontSize: '12.5px', marginTop: '2px' }}>
                                                        (주소창에 <code style={{ background: '#f1f5f9', padding: '1px 3px', borderRadius: '3px', color: '#dc2626' }}>chrome://extensions</code> 입력 후 관련 확장 해제)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 구분선 및 재시도 안내 */}
                                        <div style={{
                                            borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '6px',
                                            display: 'flex', gap: '10px', alignItems: 'flex-start'
                                        }}>
                                            <Info size={16} style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.4' }}>
                                                <span style={{ fontSize: '13.5px', color: '#334155', fontWeight: 500 }}>설치가 끝나면 [시작] 버튼을 다시 눌러주세요.</span>
                                                <span style={{ fontSize: '12.5px', color: '#64748b' }}>(자동으로 재시도되지 않습니다)</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px' }}>
                                    <button
                                        onClick={() => setRunnerNotResponding(false)}
                                        style={{
                                            background: '#fff', border: '1px solid #cbd5e1', color: '#475569',
                                            fontSize: '13.5px', fontWeight: 600, padding: '10px 20px', borderRadius: '6px', cursor: 'pointer'
                                        }}
                                    >
                                        닫기
                                    </button>
                                    <a
                                        href={(() => {
                                            let base = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || "";
                                            if (import.meta.env.DEV && base.startsWith("http")) {
                                                try {
                                                    const urlObj = new URL(base);
                                                    base = urlObj.pathname;
                                                } catch (e) {
                                                    console.warn(e);
                                                }
                                            }
                                            return base.replace(/\/+$/, '') + '/qa/runner/download';
                                        })()}
                                        download="SurveyonRunner.exe"
                                        onClick={() => setRunnerNotResponding(false)}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            background: '#16a34a', color: '#fff', fontSize: '13.5px', fontWeight: 700,
                                            padding: '10px 20px', borderRadius: '6px', textDecoration: 'none',
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

                {/* 러너 시동 중 로딩 오버레이 */}
                {isRunnerStarting && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(15, 23, 42, 0.18)', backdropFilter: 'blur(1px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 99999, fontFamily: 'Pretendard, sans-serif'
                    }}>
                        <div style={{
                            background: '#ffffff', borderRadius: '16px', padding: '32px 36px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                            border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', textAlign: 'center', maxWidth: '380px', width: '90%'
                        }}>
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '50%',
                                background: '#ecfdf5', border: '1px solid #a7f3d0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '16px'
                            }}>
                                <Loader2 size={26} className="ai-spin" color="#10b981" />
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                                러너를 실행하는 중...
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.55' }}>
                                Surveyon E2E 러너가 작업을 가져오는 중입니다.<br />
                                잠시만 기다려 주세요.
                            </div>
                        </div>
                    </div>
                )}

                {/* 데이터 초기화/삭제 처리 중 콤팩트 플로팅 토스트 스피너 (배경 어둡게 처리 X) */}
                {isProcessingReset && (
                    <div style={{
                        position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
                        zIndex: 99999, pointerEvents: 'none'
                    }}>
                        <div style={{
                            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '30px',
                            padding: '8px 18px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Pretendard, sans-serif'
                        }}>
                            <Loader2 size={16} className="ai-spin" color="#10b981" />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                데이터 처리 중... (QMaster 연동 진행)
                            </span>
                        </div>
                    </div>
                )}

                {/* ── 하단 분할 영역 (좌: 리스트, 우: 디테일 리포트) ── */}
                <div style={{ flex: 1, display: 'flex', gap: '12px', minHeight: 0 }}>

                    {/* [좌] 개별 응답자 생성 목록 */}
                    <div className="st-panel" style={{ flex: 6, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', shrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>개별 응답자 생성 목록</span>

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


                                {validCheckedIds.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            onClick={handleResetAll}
                                            style={{
                                                height: '30px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                                background: '#fff', fontSize: '11.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap'
                                            }}
                                            title="선택한 응답자 ID 초기화"
                                        >
                                            <RotateCcw size={12} />
                                            선택 초기화 ({validCheckedIds.length})
                                        </button>

                                        <button
                                            onClick={handleExportSAV}
                                            style={{
                                                height: '30px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                                background: '#fff', fontSize: '11.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap'
                                            }}
                                            title="선택한 응답자 내보내기"
                                        >
                                            <Download size={12} />
                                            선택 내보내기 ({validCheckedIds.length})
                                        </button>

                                        <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0', margin: '0 2px' }} />

                                        <button
                                            onClick={handleDeleteSelected}
                                            style={{
                                                height: '30px', padding: '0 10px', border: '1px solid #fca5a5', borderRadius: '6px',
                                                background: '#fef2f2', fontSize: '11.5px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                                transition: 'all 0.15s', whiteSpace: 'nowrap'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                                        >
                                            <Trash2 size={12} />
                                            선택 삭제 ({validCheckedIds.length})
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 가이드 메시지 (조회된 응답자 데이터가 있을 때만 표시) */}
                        {!jobError && respondents.length > 0 && (
                            <div style={{ fontSize: '11.5px', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '10px', shrink: 0 }}>
                                💡 행을 클릭하면 우측 리포트에서 상세 로그가 조회됩니다. 체크박스 선택 시 {"'초기화', '내보내기', '삭제'"} 버튼이 활성화됩니다.
                            </div>
                        )}

                        {/* 그리드 영역 */}
                        <div className="cmn_grid singlehead" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                            {/* 그리드 조회 중 로딩 영역 (조회된 데이터가 없습니다 완전히 덮어서 대체) */}
                            {isGridLoading && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    background: '#ffffff',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 50, borderRadius: '8px', pointerEvents: 'none'
                                }}>
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
                                    }}>
                                        <Loader2 size={26} className="ai-spin" color="#10b981" />
                                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>
                                            데이터를 불러오는 중입니다...
                                        </span>
                                    </div>
                                </div>
                            )}

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
                                        width="130px"
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
                                                        {selectedRespondent.failureReason || FAILURE_CLASS_MAP[selectedRespondent.errorCategory]?.label || selectedRespondent.errorCategory || "기타 중단"}
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
                                                </div>
                                            </div>
                                        </div>

                                        {/* 실행 로그 단말기 */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'block', shrink: 0 }}>
                                                실행 로그 단말기
                                            </span>
                                            <div style={{
                                                flex: 1, background: '#0f172a', borderRadius: '8px', padding: '12px 16px',
                                                overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px',
                                                fontFamily: 'Consolas, Monaco, monospace', fontSize: '11.5px', border: '1px solid #1e293b'
                                            }}>
                                                {selectedRespondent.logs.map((logLine, idx) => {
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
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '50%',
                                            background: '#eff6ff',
                                            border: '1px solid #bfdbfe',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: '16px'
                                        }}>
                                            <Loader2 size={28} className="ai-spin" color="#2563eb" />
                                        </div>
                                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', textAlign: 'center' }}>
                                            PID {selectedRespondent.id} · 수행 진행 중
                                        </div>
                                        <div style={{ fontSize: '12.5px', color: '#64748b', textAlign: 'center', lineHeight: '1.6' }}>
                                            봇이 브라우저를 실행해 문항을 기입하며 응답하고 있습니다.<br />
                                            검증이 완료되면 결과 리포트가 생성됩니다.
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

                /* Checkbox size and alignment fix for Kendo Grid */
                .ai-data-page .cmn_grid .k-checkbox-wrap .k-checkbox[type='checkbox'] {
                    width: 16px !important;
                    height: 16px !important;
                    border-radius: 4px !important;
                }
                .ai-data-page .cmn_grid .k-checkbox-wrap .k-checkbox[type='checkbox']:checked::before {
                    -webkit-mask-size: 10px 8px !important;
                    mask-size: 10px 8px !important;
                }

                /* Add vertical breathing room and comfortable height for AI Data page grid rows */
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

                @keyframes refreshPulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
                    }
                    70% {
                        box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
                    }
                }
                .ai-data-page .refresh-btn-pulse {
                    animation: refreshPulse 1.8s infinite !important;
                    border-color: #10b981 !important;
                    background: #f0fdf4 !important;
                    color: #047857 !important;
                    font-weight: 700 !important;
                }
                .ai-data-page .refresh-btn-pulse:hover {
                    background: #dcfce7 !important;
                    border-color: #059669 !important;
                    color: #065f46 !important;
                }
            `}} />
        </div>
    );
};

export default AiDataPage;