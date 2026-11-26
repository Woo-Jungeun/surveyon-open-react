import React, {
    Fragment,
    useState,
    useEffect,
    useContext,
    useRef,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
    Trash2,
    Terminal,
    Sparkles,
    ChevronRight,
    History,
    X,
} from "lucide-react";
import OptionSettingPopup from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingPopup";
import { OsaDropDown } from "./OptionSettingKendoSelect.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext as analysisSpinnerContext } from "@/components/common/AnalysisLoadingSpinner.jsx";
import { useSelector } from "react-redux";
import {
    getAnalysisInfo,
    getAnalysisStatus,
    checkAnalysisPopup,
    saveAnalysisInfo,
    startAnalysisWorker,
    createWorkerHubConnection,
    getAnalysisWorkerStatus,
    stopAnalysisWorker,
    deleteAnalysisQuestion,
} from "@/api/analysisApi.js";
import { isCodeLocked } from "./optionSettingUtils";

const ACTION_LABEL = {
    translate: "번역/교정",
    analyze: "보기분석",
    respondent: "응답자분석(전체)",
    empty_etc: "응답자분석(빈셀)",
};

const WORKER_STEPS = [
    { step: 1, label: "1. 데이터 준비" },
    { step: 2, label: "2. AI 모델 분석" },
    { step: 3, label: "3. 결과 정제" },
    { step: 4, label: "4. DB 반영" },
];

const MODAL_SCOPE = {
    visibleOn: (path) => path.includes("/option_setting"),
    autoCloseOnRouteChange: true,
};

const TEMP_MIN = 0;
const TEMP_MAX = 1;
const TEMP_DEFAULT = 0.2;

const orIfEmpty = (v, fallback) =>
    v === undefined || v === null || String(v).trim() === "" ? fallback : v;

const parseTemp = (v, def = TEMP_DEFAULT) => {
    const n = typeof v === "number" ? v : parseFloat(v);
    if (!Number.isFinite(n)) return def;
    const clamped = Math.max(TEMP_MIN, Math.min(TEMP_MAX, n));
    return Math.round(clamped * 10) / 10;
};

const toOptions = (arr) =>
    (Array.isArray(arr) ? arr : []).map((x) => ({
        keyid: x.keyid,
        value: String(x.keyvalue ?? ""),
        text: String(x.keytext ?? x.keyvalue ?? ""),
        keyselected: x.keyselected ?? "",
    }));

const pickSelected = (opts) => {
    if (!opts.length) return null;
    // 1) 신규 백엔드 명세: 배열 내 항목별 keyselected === keyvalue(또는 keyid/text/true/Y) 매칭 우선
    const direct = opts.find((o) => {
        const ks = String(o.keyselected ?? "").trim();
        if (!ks) return false;
        return (
            ks === String(o.value) ||
            ks === String(o.keyid) ||
            ks === String(o.text) ||
            ks.toLowerCase() === "true" ||
            ks.toUpperCase() === "Y" ||
            ks.toLowerCase() === "selected"
        );
    });
    if (direct) return direct;

    // 2) 레거시 호환: 배열 첫 항목(또는 임의 항목)에 선택 토큰이 담긴 경우
    const tokenCarrier = opts.find((o) => String(o.keyselected ?? "").trim() !== "");
    const token = String(tokenCarrier?.keyselected ?? "").trim();
    if (!token) return null;
    return (
        opts.find((o) => String(o.value) === token) ||
        opts.find((o) => String(o.keyid) === token) ||
        opts.find((o) => String(o.text) === token) ||
        null
    );
};

const inferWorkerStep = (line, currentStep = 1) => {
    const s = String(line || "").toLowerCase();
    if (/저장|반영|완료|complete|finish|step\s*4|4\/4|<eof>/.test(s)) return Math.max(currentStep, 4);
    if (/파싱|정제|검증|매핑|분류\s*완료|step\s*3|3\/4/.test(s)) return Math.max(currentStep, 3);
    if (/gpt|openai|모델|호출|분석\s*중|번역\s*중|청크|batch|chunk|step\s*2|2\/4/.test(s))
        return Math.max(currentStep, 2);
    return Math.max(currentStep, 1);
};

const formatElapsed = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
};

/**
 * 상단 탭 전환 & AI 실행 바 + 헤더 하단 상세 분석 설정 드로어 + 실시간 AI 워커 진행 배너
 */
const OptionSettingInfo = forwardRef((props, ref) => {
    const {
        onNavigateTab,
        projectnum,
        qnum,
        displayQnum,
        qTitle,
        userPerm,
        codes = [],
        responseCount = 0,
        infoRawData = null,
        onSettingsChange,
        onQidLoaded,
        onDuplicateRemoveDateLoaded,
        project_lock,
        tabDivision = "1",
        onWorkerCompleted,
        onBusyChange,
        leftSlot = null,
        expanded: controlledExpanded,
        onExpandedChange,
        drawerMountNode = null,
    } = props;

    const auth = useSelector((store) => store.auth);
    const userId = auth?.user?.userId || sessionStorage.getItem("userId") || "";
    const modal = useContext(modalContext);
    const loadingSpinner = useContext(analysisSpinnerContext);
    const navigate = useNavigate();

    const loadingSpinnerRef = useRef(loadingSpinner);
    loadingSpinnerRef.current = loadingSpinner;
    const modalRef = useRef(modal);
    modalRef.current = modal;

    const [internalExpanded, setInternalExpanded] = useState(false);
    const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
    const setExpanded = useCallback(
        (next) => {
            const resolved = typeof next === "function" ? next(expanded) : next;
            if (controlledExpanded === undefined) {
                setInternalExpanded(resolved);
            }
            onExpandedChange?.(resolved);
        },
        [controlledExpanded, expanded, onExpandedChange]
    );
    const [showConsole, setShowConsole] = useState(false);
    const logPopoverWrapRef = useRef(null);

    const [data, setData] = useState({
        temperature: TEMP_DEFAULT,
        open_item_lv1: "0~50",
        open_item_lv2: "0",
        open_item_lv3: "0",
    });
    const [qid, setQid] = useState("");
    const qidRef = useRef("");

    const [resultLangOptions, setResultLangOptions] = useState([]);
    const [resultLangValue, setResultLangValue] = useState("");
    const [modelOptions, setModelOptions] = useState([]);
    const [modelValue, setModelValue] = useState("");

    const [previousPromptShow, setPreviousPromptShow] = useState(false);
    const [previousPromptExValue, setPreviousPromptExValue] = useState("");
    const [previousPromptResValue, setPreviousPromptResValue] = useState("");

    const [saving, setSaving] = useState(false);
    const [runningJobId, setRunningJobId] = useState(null);
    const [runningAction, setRunningAction] = useState(null);
    const [workerStep, setWorkerStep] = useState(0);
    const [elapsedSec, setElapsedSec] = useState(0);
    const [logText, setLogText] = useState("");

    const hubRef = useRef(null);
    const pollTimerRef = useRef(null);
    const elapsedTimerRef = useRef(null);
    const settledRef = useRef(false);
    const logOffsetRef = useRef(0);
    const logRef = useRef(null);
    const logTextRef = useRef("");
    logTextRef.current = logText;
    const initStatusCheckedKeyRef = useRef("");

    const isWorkerBusy = saving || Boolean(runningJobId);

    useEffect(() => {
        onBusyChange?.(isWorkerBusy);
    }, [isWorkerBusy, onBusyChange]);

    const analyzingActiveRef = useRef(false);
    const setAnalyzing = useCallback((on) => {
        const sp = loadingSpinnerRef.current;
        if (!sp) return;
        const next = Boolean(on);
        if (analyzingActiveRef.current === next) return;
        analyzingActiveRef.current = next;
        next ? sp.show() : sp.hide();
    }, []);

    const appendLog = useCallback((raw) => {
        if (raw == null) return;
        const text = String(raw);
        if (!text) return;
        setLogText((prev) => prev + (text.endsWith("\n") ? text : `${text}\n`));
        setWorkerStep((prev) => inferWorkerStep(text, prev || 1));
    }, []);

    const clearLog = useCallback(() => {
        setLogText("");
    }, []);

    useEffect(() => {
        const el = logRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [logText, showConsole, runningJobId]);

    useEffect(() => {
        if (!showConsole) return;
        const handleOutside = (e) => {
            if (
                e.target?.closest?.(
                    ".cmn_popup, .k-dialog-wrapper, .k-window, .k-overlay, .osa-modal"
                )
            ) {
                return;
            }
            if (logPopoverWrapRef.current && !logPopoverWrapRef.current.contains(e.target)) {
                setShowConsole(false);
            }
        };
        const handleEsc = (e) => {
            if (e.key === "Escape") setShowConsole(false);
        };
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleEsc);
        };
    }, [showConsole]);

    useEffect(() => {
        if (!runningJobId) {
            if (elapsedTimerRef.current) {
                clearInterval(elapsedTimerRef.current);
                elapsedTimerRef.current = null;
            }
            return;
        }
        setElapsedSec(0);
        elapsedTimerRef.current = setInterval(() => {
            setElapsedSec((s) => s + 1);
        }, 1000);
        return () => {
            if (elapsedTimerRef.current) {
                clearInterval(elapsedTimerRef.current);
                elapsedTimerRef.current = null;
            }
        };
    }, [runningJobId]);

    const cleanupWorkerResources = useCallback(async (jobIdToLeave) => {
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
        if (hubRef.current) {
            const conn = hubRef.current;
            hubRef.current = null;
            if (jobIdToLeave) {
                try {
                    await conn.invoke("Leave", jobIdToLeave);
                } catch {
                    // ignore
                }
            }
            try {
                await conn.stop();
            } catch {
                // ignore
            }
        }
    }, []);

    useEffect(() => {
        return () => {
            settledRef.current = true;
            cleanupWorkerResources(null);
            setAnalyzing(false);
        };
    }, [cleanupWorkerResources, setAnalyzing]);

    const selectedModelLabel =
        modelOptions.find((o) => String(o.value) === String(modelValue))?.text ||
        modelValue ||
        data?.model_select ||
        "-";
    const selectedLangLabel =
        resultLangOptions.find((o) => String(o.value) === String(resultLangValue))?.text ||
        resultLangValue ||
        data?.result_lang ||
        "한국어 (Korean)";

    useEffect(() => {
        onSettingsChange?.({
            ...data,
            qid: qid || data?.qid || "",
            temperature: parseTemp(data?.temperature),
            open_item_lv1: String(orIfEmpty(data?.open_item_lv1, "0~50")),
            open_item_lv2: String(orIfEmpty(data?.open_item_lv2, "0")),
            open_item_lv3: String(orIfEmpty(data?.open_item_lv3, "0")),
            _modelLabel: selectedModelLabel,
            _langLabel: selectedLangLabel,
            _hasPrompt: Boolean(data?.prompt_string && String(data.prompt_string).trim() !== ""),
        });
    }, [data, qid, selectedModelLabel, selectedLangLabel, onSettingsChange]);

    useEffect(() => {
        qidRef.current = qid;
        if (qid) onQidLoaded?.(qid);
    }, [qid, onQidLoaded]);

    const applyInfoObject = useCallback(
        (d = {}) => {
            if (!d || Object.keys(d).length === 0) return;

            const nextQid = String(d?.qid || "").trim();
            if (nextQid) setQid(nextQid);

            const apiOpts = toOptions(d?.apikey);
            const apiInit = pickSelected(apiOpts) || apiOpts[0];

            const langOpts = toOptions(d?.result_lang);
            setResultLangOptions(langOpts);
            const langInit = pickSelected(langOpts) || langOpts[0];

            const modelOpts = toOptions(d?.model_select);
            setModelOptions(modelOpts);
            const modelInit = pickSelected(modelOpts) || modelOpts[0];

            if (langInit) setResultLangValue(String(langInit.value));
            if (modelInit) setModelValue(String(modelInit.value));

            setPreviousPromptExValue(d?.prompt_string_ex_backup || "");
            setPreviousPromptResValue(d?.prompt_string_res_backup || "");

            const dupDate = d?.duplicate_remove_date ?? d?.duplicateRemoveDate ?? "";
            if (dupDate) {
                onDuplicateRemoveDateLoaded?.(dupDate);
            }

            setData((prev) => ({
                ...prev,
                ...d,
                temperature: parseTemp(d?.temperature),
                open_item_lv1: orIfEmpty(d?.open_item_lv1, "0~50"),
                open_item_lv2: orIfEmpty(d?.open_item_lv2, "0"),
                open_item_lv3: orIfEmpty(d?.open_item_lv3, "0"),
                apikeyid: apiInit
                    ? apiInit.value
                    : typeof d?.apikeyid === "string"
                        ? d.apikeyid
                        : prev?.apikeyid || "",
                apikey: apiInit
                    ? apiInit.keyid
                    : typeof d?.apikey === "string"
                        ? d.apikey
                        : prev?.apikey || "",
                result_lang: langInit
                    ? langInit.value
                    : typeof d?.result_lang === "string"
                        ? d.result_lang
                        : prev?.result_lang || "Korean",
                model_select: modelInit
                    ? modelInit.value
                    : typeof d?.model_select === "string"
                        ? d.model_select
                        : prev?.model_select || "",
                duplicateRemoveDate: dupDate,
            }));
        },
        [onDuplicateRemoveDateLoaded]
    );

    useEffect(() => {
        if (infoRawData && Object.keys(infoRawData).length > 0) {
            applyInfoObject(infoRawData);
        }
    }, [infoRawData, applyInfoObject]);

    const searchInfo = useCallback(async () => {
        if (!projectnum || !qnum) return null;
        try {
            const res = await getAnalysisInfo(projectnum, qnum, userId);
            const first =
                (Array.isArray(res?.resultjson) ? res.resultjson[0] : null) ||
                (Array.isArray(res?.data) ? res.data[0] : null) ||
                res?.info ||
                {};
            applyInfoObject(first);
            return first;
        } catch {
            return null;
        }
    }, [projectnum, qnum, userId, applyInfoObject]);

    // SignalR + 1.5초 폴링 이중화
    const attachJobMonitor = useCallback(
        async (jobId, actionType) => {
            if (!jobId) return;
            await cleanupWorkerResources(null);

            settledRef.current = false;
            logOffsetRef.current = 0;
            setRunningJobId(jobId);
            setRunningAction(actionType);
            setWorkerStep(1);
            setAnalyzing(true);

            const handleFinish = async (hasError, reasonMsg = "") => {
                if (settledRef.current) return;
                settledRef.current = true;

                await cleanupWorkerResources(jobId);
                setAnalyzing(false);
                setRunningJobId(null);
                setWorkerStep(hasError ? 0 : 4);
                setShowConsole(true);

                if (hasError) {
                    appendLog(reasonMsg || "✖ 분석 중 오류가 발생했습니다.");
                    modalRef.current?.showErrorAlert?.(
                        "에러",
                        reasonMsg || "분석 작업 중 오류가 발생했습니다.",
                        MODAL_SCOPE
                    );
                    return;
                }

                appendLog(`✔ ${ACTION_LABEL[actionType] || "분석"} 완료`);
                try {
                    if (qidRef.current) {
                        await checkAnalysisPopup(projectnum, qnum, qidRef.current, "1");
                    }
                } catch {
                    // ignore
                }

                try {
                    await onWorkerCompleted?.(actionType);
                } catch (err) {
                    console.error("[OptionSettingInfo] 완료 후 갱신 오류:", err);
                }

                const targetTab = actionType === "analyze" ? "2" : "1";
                onNavigateTab?.(targetTab);
                modalRef.current?.showAlert?.("알림", "분석이 완료되었습니다.", MODAL_SCOPE);
            };

            (async () => {
                try {
                    const hub = createWorkerHubConnection();
                    hubRef.current = hub;

                    hub.on("onLine", (jobKey, line, isError) => {
                        if (settledRef.current) return;
                        if (jobKey && String(jobKey) !== String(jobId)) return;
                        if (line != null) {
                            appendLog(isError ? `[ERR] ${line}` : String(line));
                        }
                    });

                    hub.on("onCompleted", (jobKey, hasError) => {
                        if (settledRef.current) return;
                        if (jobKey && String(jobKey) !== String(jobId)) return;
                        handleFinish(Boolean(hasError));
                    });

                    hub.onreconnected(async () => {
                        if (!settledRef.current) {
                            try {
                                await hub.invoke("Join", jobId);
                            } catch {
                                // ignore
                            }
                        }
                    });

                    await hub.start();
                    if (!settledRef.current) {
                        await hub.invoke("Join", jobId);
                    }
                } catch (sigErr) {
                    console.warn("[OptionSettingInfo] SignalR 폴백(폴링 유지):", sigErr);
                }
            })();

            let pollingBusy = false;
            pollTimerRef.current = setInterval(async () => {
                if (settledRef.current || pollingBusy) return;
                pollingBusy = true;
                try {
                    const statusRes = await getAnalysisWorkerStatus(jobId, logOffsetRef.current);
                    if (settledRef.current || !statusRes) return;

                    const out = statusRes?.output ?? statusRes?.resultjson?.output;
                    const nextOffset = statusRes?.nextOffset ?? statusRes?.resultjson?.nextOffset;

                    if (typeof out === "string" && out.length > 0) {
                        if (typeof nextOffset === "number" && nextOffset > logOffsetRef.current) {
                            if (!hubRef.current || hubRef.current.state !== "Connected") {
                                appendLog(out);
                            } else {
                                setWorkerStep((prev) => inferWorkerStep(out, prev || 1));
                            }
                            logOffsetRef.current = nextOffset;
                        } else if (logOffsetRef.current === 0) {
                            logOffsetRef.current = out.length;
                            if (!logTextRef.current) appendLog(out);
                        }
                    } else if (typeof nextOffset === "number") {
                        logOffsetRef.current = nextOffset;
                    }

                    const isCompleted =
                        statusRes?.isCompleted === true ||
                        statusRes?.IsCompleted === true ||
                        statusRes?.resultjson?.isCompleted === true;

                    if (isCompleted) {
                        const hasErr =
                            statusRes?.hasError === true ||
                            statusRes?.HasError === true ||
                            statusRes?.resultjson?.hasError === true;
                        handleFinish(hasErr);
                    }
                } catch {
                    // ignore
                } finally {
                    pollingBusy = false;
                }
            }, 1500);
        },
        [
            appendLog,
            cleanupWorkerResources,
            onNavigateTab,
            onWorkerCompleted,
            projectnum,
            qnum,
            setAnalyzing,
        ]
    );

    useEffect(() => {
        if (!projectnum || !qnum || !qid) return;
        const checkKey = `${projectnum}__${qnum}__${qid}`;
        if (initStatusCheckedKeyRef.current === checkKey) return;
        initStatusCheckedKeyRef.current = checkKey;

        (async () => {
            try {
                const r = await getAnalysisStatus(projectnum, qnum, qid);
                if (String(r?.popupcheck) === "1") {
                    const raw = String(r?.output ?? "").trim();
                    const isRunning = /분석중|running/i.test(raw.replace(/\s+/g, ""));
                    const job =
                        r?.jobId || r?.job || r?.contents?.job || r?.data?.job || r?.currentJob || null;
                    if (isRunning && job) {
                        appendLog("진행 중인 분석 작업에 재연결합니다...");
                        attachJobMonitor(job, "respondent");
                    }
                }
            } catch {
                // ignore
            }
        })();
    }, [projectnum, qnum, qid, appendLog, attachJobMonitor]);

    const runWorkerAction = useCallback(
        async (actionType) => {
            if (saving || runningJobId) return false;
            if (!projectnum || !qnum) {
                modalRef.current?.showErrorAlert?.(
                    "알림",
                    "문항/프로젝트 정보를 먼저 불러온 뒤 실행해 주세요.",
                    MODAL_SCOPE
                );
                return false;
            }
            if (!String(data?.open_item_lv1 ?? "").trim()) {
                modalRef.current?.showErrorAlert?.("알림", "소분류 개수를 입력하세요.", MODAL_SCOPE);
                return false;
            }

            const settingsPayload = {
                apikeyid: String(data?.apikeyid || ""),
                apikey: String(data?.apikey || ""),
                data_type: "DB",
                projectnum: String(projectnum || ""),
                qnum: String(qnum || ""),
                question_fin: String(data?.question_fin || ""),
                keyword_string: String(data?.keyword_string || data?.question_fin || ""),
                prompt_string: String(data?.prompt_string || ""),
                model_select: String(
                    modelValue ||
                    (typeof data?.model_select === "string" ? data.model_select : "") ||
                    ""
                ),
                result_lang: String(
                    resultLangValue ||
                    (typeof data?.result_lang === "string" ? data.result_lang : "") ||
                    "Korean"
                ),
                temperature: parseTemp(data?.temperature),
                open_item_lv1: String(orIfEmpty(data?.open_item_lv1, "0~50")),
                open_item_lv2: String(orIfEmpty(data?.open_item_lv2, "0")),
                open_item_lv3: String(orIfEmpty(data?.open_item_lv3, "0")),
                select_rows: "",
                select_column_id: "pid",
                select_column_title: String(qnum || ""),
                prompt_string_ex_backup: data?.prompt_string_ex_backup ?? {},
                prompt_string_res_backup: data?.prompt_string_res_backup ?? {},
            };

            const actionEvMap = {
                translate: "1",
                analyze: "2",
                respondent: "3",
                empty_etc: "4",
            };

            const actionFlags =
                actionType === "analyze"
                    ? {
                        classified: "Y",
                        opencodeCategory: "Y",
                        response: "N",
                        opencodeResponse: "N",
                        recallResponse: "N",
                        translateResponse: "N",
                    }
                    : actionType === "respondent"
                        ? {
                            classified: "N",
                            opencodeCategory: "N",
                            response: "Y",
                            opencodeResponse: "Y",
                            recallResponse: "Y",
                            translateResponse: "N",
                        }
                        : actionType === "empty_etc"
                            ? {
                                classified: "N",
                                opencodeCategory: "N",
                                response: "N",
                                opencodeResponse: "N",
                                recallResponse: "Y",
                                translateResponse: "N",
                            }
                            : {
                                classified: "N",
                                opencodeCategory: "N",
                                response: "N",
                                opencodeResponse: "N",
                                recallResponse: "N",
                                translateResponse: "Y",
                            };

            setSaving(true);
            try {
                try {
                    await saveAnalysisInfo(
                        projectnum,
                        qnum,
                        settingsPayload,
                        userId,
                        undefined,
                        actionEvMap[actionType]
                    );
                } catch {
                    // 선저장 실패 시에도 settings 직접 전달
                }

                clearLog();
                appendLog(`== ${ACTION_LABEL[actionType] || actionType} 시작 ==`);

                const startRes = await startAnalysisWorker(projectnum, qnum, actionType, userId, {
                    qid: qidRef.current || qid || undefined,
                    ...actionFlags,
                    settings: settingsPayload,
                });

                const jobId =
                    startRes?.jobId ||
                    startRes?.job ||
                    startRes?.resultjson?.jobId ||
                    startRes?.resultjson?.job ||
                    startRes?.contents?.job ||
                    startRes?.data?.job;

                const ok =
                    startRes?.ok === true ||
                    String(startRes?.success) === "777" ||
                    Boolean(jobId);

                if (!ok) {
                    modalRef.current?.showErrorAlert?.(
                        "에러",
                        startRes?.message || startRes?.Message || "분석 작업을 시작하지 못했습니다.",
                        MODAL_SCOPE
                    );
                    return false;
                }

                if (jobId) {
                    await attachJobMonitor(jobId, actionType);
                } else {
                    appendLog("[INFO] 작업이 즉시 처리되었습니다.");
                    setShowConsole(true);
                    await onWorkerCompleted?.(actionType);
                    onNavigateTab?.(actionType === "analyze" ? "2" : "1");
                }
                return true;
            } catch (err) {
                console.error("[OptionSettingInfo] startAnalysisWorker error:", err);
                modalRef.current?.showErrorAlert?.(
                    "에러",
                    "분석 요청 중 오류가 발생했습니다.",
                    MODAL_SCOPE
                );
                setAnalyzing(false);
                return false;
            } finally {
                setSaving(false);
            }
        },
        [
            appendLog,
            attachJobMonitor,
            clearLog,
            data,
            modelValue,
            onNavigateTab,
            onWorkerCompleted,
            projectnum,
            qid,
            qnum,
            resultLangValue,
            runningJobId,
            saving,
            setAnalyzing,
            userId,
        ]
    );

    // 외부(탭 헤더 버튼)에서 확인창 포함 워커 실행 호출
    const triggerWorker = useCallback(
        (actionType) => {
            if (project_lock === "수정불가" || isWorkerBusy) return;

            if (actionType === "analyze") {
                const hasUnlocked = (codes || []).some((r) => !r?.__pendingDelete && !isCodeLocked(r));
                if (hasUnlocked) {
                    modalRef.current?.showConfirm?.(
                        "알림",
                        "기존 분석 보기 결과가 있습니다.\n수정가능 보기를 새로 분석하시겠습니까? (수정불가 보기는 유지됩니다.)",
                        {
                            btns: [
                                { title: "취소" },
                                { title: "확인", click: () => runWorkerAction("analyze") },
                            ],
                        }
                    );
                    return;
                }
                runWorkerAction("analyze");
                return;
            }

            if (actionType === "respondent") {
                if (responseCount > 0) {
                    modalRef.current?.showConfirm?.(
                        "알림",
                        "기존 응답 분류 결과가 있습니다.\n응답자분석(전체)을 새로 실행하시겠습니까?",
                        {
                            btns: [
                                { title: "취소" },
                                { title: "확인", click: () => runWorkerAction("respondent") },
                            ],
                        }
                    );
                    return;
                }
                runWorkerAction("respondent");
                return;
            }

            runWorkerAction(actionType);
        },
        [codes, isWorkerBusy, project_lock, responseCount, runWorkerAction]
    );

    const deleteQnum = useCallback(() => {
        const qLabel = displayQnum || qnum || "현재 문항";
        modalRef.current?.showConfirm?.(
            "문항 삭제 확인",
            `[${qLabel}] 문항 전체와 모든 응답·보기 분석 데이터가 영구 삭제됩니다.\n삭제 후에는 복구할 수 없습니다. 계속하시겠습니까?`,
            MODAL_SCOPE,
            {
                btns: [
                    { title: "취소" },
                    {
                        title: "문항 영구 삭제",
                        click: async () => {
                            try {
                                const res = await deleteAnalysisQuestion(
                                    projectnum,
                                    qnum,
                                    qidRef.current || qid,
                                    userId
                                );
                                if (res?.ok === true || String(res?.success) === "777") {
                                    modalRef.current?.showAlert?.("알림", "문항이 삭제되었습니다.");
                                    navigate("/ai_open_analysis/pro_list");
                                } else {
                                    modalRef.current?.showErrorAlert?.(
                                        "에러",
                                        res?.message || "문항 삭제 중 오류가 발생했습니다."
                                    );
                                }
                            } catch {
                                modalRef.current?.showErrorAlert?.(
                                    "에러",
                                    "문항 삭제 중 오류가 발생했습니다."
                                );
                            }
                        },
                    },
                ],
            }
        );
    }, [displayQnum, navigate, projectnum, qid, qnum, userId]);

    useImperativeHandle(
        ref,
        () => ({
            triggerWorker,
            deleteQuestion: deleteQnum,
        }),
        [triggerWorker, deleteQnum]
    );

    const handleStopWorker = async () => {
        if (!runningJobId) return;
        const jobToStop = runningJobId;
        settledRef.current = true;
        try {
            await stopAnalysisWorker(jobToStop, projectnum, qnum, userId);
            appendLog("⏹ 사용자 요청으로 분석 작업이 중지되었습니다.");
        } catch {
            appendLog("[WARN] 작업 중지 요청 처리 중 오류가 발생했습니다.");
        } finally {
            await cleanupWorkerResources(jobToStop);
            setAnalyzing(false);
            setRunningJobId(null);
            setWorkerStep(0);
        }
    };

    const settingsDrawerNode = expanded ? (
        <div className="osa-header-drawer-wrap">
            <div className="osa-header-drawer-card">
                {/* 1열: 문항명 */}
                <div className="osa-drawer-col osa-field-group">
                    <div className="osa-field-label">
                        <span className="osa-field-title">
                            문항명
                        </span>

                    </div>
                    <textarea
                        className="osa-textarea"
                        disabled={project_lock === "수정불가"}
                        value={
                            data?.keyword_string && String(data.keyword_string).trim() !== ""
                                ? data.keyword_string
                                : data?.question_fin || ""
                        }
                        onChange={(e) =>
                            setData((prev) => ({ ...prev, keyword_string: e.target.value }))
                        }
                    />
                </div>

                {/* 2열: 프롬프트 지침 */}
                <div className="osa-drawer-col osa-field-group">
                    <div className="osa-field-label">
                        <span className="osa-field-title">
                            프롬프트 지침
                            <span
                                className="info-icon"
                                data-tooltip={`프롬프트 지침|보기·응답자 분석 시 반영할 추가 지침 정의\n예: 소분류 문구의 어조는 '~함'으로 통일해줘`}
                            />
                        </span>
                        <button
                            type="button"
                            className="osa-prompt-hist-btn"
                            onClick={() => setPreviousPromptShow(true)}
                        >
                            <History size={12} />
                            <span>프롬프트 이력</span>
                        </button>
                    </div>
                    <textarea
                        className="osa-textarea"
                        disabled={project_lock === "수정불가"}
                        placeholder="보기/응답자 분석 시 반영할 추가 지침을 입력하세요."
                        value={data?.prompt_string || ""}
                        onChange={(e) =>
                            setData((prev) => ({ ...prev, prompt_string: e.target.value }))
                        }
                    />
                </div>

                {/* 3열: 모델 / 언어 / 창의성 / 분류 개수 (2x2 정렬 그리드) */}
                <div className="osa-drawer-col osa-drawer-col-params">
                    <div className="osa-field-group">
                        <div className="osa-field-label">
                            <span className="osa-field-title">모델 선택</span>
                        </div>
                        <OsaDropDown
                            size="md"
                            options={modelOptions}
                            disabled={project_lock === "수정불가"}
                            value={modelValue}
                            onValueChange={(v) => {
                                setModelValue(v);
                                setData((prev) => ({ ...prev, model_select: v }));
                            }}
                        />
                    </div>

                    <div className="osa-field-group">
                        <div className="osa-field-label">
                            <span className="osa-field-title">결과 언어</span>
                        </div>
                        <OsaDropDown
                            size="md"
                            options={resultLangOptions}
                            disabled={project_lock === "수정불가"}
                            value={resultLangValue}
                            onValueChange={(v) => {
                                setResultLangValue(v);
                                setData((prev) => ({ ...prev, result_lang: v }));
                            }}
                        />
                    </div>

                    <div className="osa-field-group">
                        <div className="osa-field-label">
                            <span className="osa-field-title">
                                창의성 조절
                                <span
                                    className="info-icon"
                                    data-tooltip={`창의성 조절|0에 가까울수록 일관적이며, 1에 가까울수록 새로운 보기 분류를 시도합니다.`}
                                />
                            </span>
                            <span className="osa-temp-badge">
                                {parseTemp(data?.temperature).toFixed(1)}
                            </span>
                        </div>
                        <div className="osa-slider-box">
                            <input
                                type="range"
                                className="osa-range-slider"
                                min={TEMP_MIN}
                                max={TEMP_MAX}
                                step={0.1}
                                disabled={project_lock === "수정불가"}
                                value={parseTemp(data?.temperature)}
                                style={{
                                    margin: 0,
                                    background: `linear-gradient(to right, #f97316 ${parseTemp(data?.temperature) * 100
                                        }%, #e2e8f0 ${parseTemp(data?.temperature) * 100}%)`,
                                }}
                                onChange={(e) =>
                                    setData((prev) => ({
                                        ...prev,
                                        temperature: parseTemp(e.target.value),
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <div className="osa-field-group">
                        <div className="osa-field-label">
                            <span className="osa-field-title">분류 개수</span>
                            <em className="osa-field-subhint">0 입력 시 제외</em>
                        </div>
                        <div className="osa-lv-count-grid">
                            {[
                                {
                                    short: "대",
                                    field: "open_item_lv3",
                                    title: "대분류 개수 (0 입력 시 제외)",
                                },
                                {
                                    short: "중",
                                    field: "open_item_lv2",
                                    title: "중분류 개수 (0 입력 시 제외)",
                                },
                                {
                                    short: "소",
                                    field: "open_item_lv1",
                                    title: "소분류 개수 범위 (예: 0~50)",
                                },
                            ].map((item) => (
                                <label
                                    key={item.field}
                                    className="osa-lv-addon-box"
                                    title={item.title}
                                >
                                    <span className="osa-lv-addon-tag">{item.short}</span>
                                    <input
                                        type="text"
                                        className="osa-lv-addon-input"
                                        disabled={project_lock === "수정불가"}
                                        value={data?.[item.field] ?? ""}
                                        onChange={(e) =>
                                            setData((prev) => ({
                                                ...prev,
                                                [item.field]: e.target.value,
                                            }))
                                        }
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    const activeStepNum = workerStep || 1;
    const activeStepShort = (
        WORKER_STEPS.find((s) => s.step === activeStepNum)?.label || "1. 데이터 준비"
    ).replace(/^\d+\.\s*/, "");

    return (
        <Fragment>
            {settingsDrawerNode &&
                (drawerMountNode
                    ? createPortal(settingsDrawerNode, drawerMountNode)
                    : settingsDrawerNode)}

            <div className={`osa-settings-card ${runningJobId ? "is-worker-running" : ""}`}>
                {/* 좌측 탭 전환 + 우측 AI 실행 버튼 바 (실행 중에는 진행 상태 바로 깔끔하게 전환) */}
                <div className="osa-settings-bar">
                    <div className="osa-settings-bar-left">{leftSlot}</div>

                    <div
                        ref={logPopoverWrapRef}
                        className="osa-log-popover-anchor"
                        style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
                    >
                        {runningJobId ? (
                            <div className="osa-worker-running-group">
                                <button
                                    type="button"
                                    className={`osa-worker-running-pill ${showConsole ? "active" : ""}`}
                                    title="클릭하여 실시간 AI 실행 로그 열기/닫기"
                                    onClick={() => setShowConsole((v) => !v)}
                                >
                                    <span className="osa-worker-pulse" />
                                    <b>{ACTION_LABEL[runningAction] || "AI 분석"} 진행 중</b>
                                    <em>
                                        · {formatElapsed(elapsedSec)} ({activeStepNum}/4{" "}
                                        {activeStepShort})
                                    </em>
                                </button>

                                <button
                                    type="button"
                                    className={`osa-btn ${showConsole ? "active" : ""}`}
                                    style={{ height: "29px", padding: "0 9px", fontSize: "12px" }}
                                    title="실시간 실행 로그 열기/닫기"
                                    onClick={() => setShowConsole((v) => !v)}
                                >
                                    <Terminal size={13} />
                                    <span>로그</span>
                                </button>

                                <button
                                    type="button"
                                    className="osa-btn osa-worker-stop-btn"
                                    style={{ height: "29px", padding: "0 10px", fontSize: "12px" }}
                                    title="진행 중인 AI 분석 작업 중지"
                                    onClick={handleStopWorker}
                                >
                                    <span className="osa-stop-glyph" aria-hidden="true" />
                                    <span>중지</span>
                                </button>
                            </div>
                        ) : String(tabDivision) !== "3" ? (
                            <>
                                {project_lock !== "수정불가" && (
                                    <div className="osa-worker-btns">
                                        <span className="osa-auto-label">
                                            <Sparkles size={11.5} strokeWidth={2.2} />
                                            <span>자동분석</span>
                                        </span>

                                        <div className="osa-tip-anchor">
                                            <button
                                                type="button"
                                                className={`osa-btn osa-toolbar-action-btn ${tabDivision === "2" ? "osa-btn-accent" : ""
                                                    }`}
                                                disabled={isWorkerBusy}
                                                onClick={() => triggerWorker("analyze")}
                                            >
                                                <span>1. 보기분석</span>
                                            </button>
                                            <div className="osa-speech-bubble" role="tooltip">
                                                <div className="osa-speech-title">1. 보기분석</div>
                                                <div className="osa-speech-body">
                                                    전체 응답을 바탕으로 <b>보기(카테고리) 항목을 자동 생성</b>합니다.
                                                    <span className="osa-speech-sub">
                                                        (분석 설정의 분류 단계·개수 반영)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <ChevronRight
                                            size={13}
                                            strokeWidth={2.2}
                                            className="osa-step-chevron"
                                            aria-hidden="true"
                                        />

                                        <div className="osa-tip-anchor">
                                            <button
                                                type="button"
                                                className={`osa-btn osa-toolbar-action-btn ${tabDivision !== "2" ? "osa-btn-accent" : ""
                                                    }`}
                                                disabled={isWorkerBusy}
                                                onClick={() => triggerWorker("respondent")}
                                            >
                                                <span>2. 응답자분석(전체)</span>
                                            </button>
                                            <div className="osa-speech-bubble" role="tooltip">
                                                <div className="osa-speech-title">2. 응답자분석(전체)</div>
                                                <div className="osa-speech-body">
                                                    생성된 보기에 맞춰 <b>전체 응답 데이터를 자동으로 코드 분류</b>합니다.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="osa-tip-anchor">
                                            <button
                                                type="button"
                                                className="osa-btn osa-toolbar-action-btn"
                                                disabled={isWorkerBusy}
                                                onClick={() => triggerWorker("empty_etc")}
                                            >
                                                <span>응답자분석(빈셀)</span>
                                            </button>
                                            <div
                                                className="osa-speech-bubble align-right tail-mid-right"
                                                role="tooltip"
                                            >
                                                <div className="osa-speech-title">응답자분석(빈셀)</div>
                                                <div className="osa-speech-body">
                                                    분류되지 않고 <b>비어 있는 응답만 재분석</b>하여 빈 코드를 채웁니다.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="osa-subtoolbar-divider" />

                                        <div className="osa-tip-anchor">
                                            <button
                                                type="button"
                                                className="osa-btn osa-toolbar-action-btn"
                                                disabled={isWorkerBusy}
                                                onClick={() => triggerWorker("translate")}
                                            >
                                                <span>번역/교정</span>
                                            </button>
                                            <div className="osa-speech-bubble align-right" role="tooltip">
                                                <div className="osa-speech-title">번역/교정</div>
                                                <div className="osa-speech-body">
                                                    <b>외국어는 번역·교정</b>, <b>한국어는 오탈자 교정</b>을 자동으로 수행합니다.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {(logText || showConsole) && (
                                    <>
                                        {project_lock !== "수정불가" && (
                                            <div className="osa-subtoolbar-divider" />
                                        )}
                                        <button
                                            type="button"
                                            className={`osa-btn osa-toolbar-action-btn ${showConsole ? "active" : ""}`}
                                            title="최근 AI 워커 실행 로그 보기"
                                            onClick={() => setShowConsole((v) => !v)}
                                        >
                                            <Terminal size={13} />
                                            <span>로그</span>
                                        </button>
                                    </>
                                )}

                            </>
                        ) : null}

                        {/* 버튼 바로 아래 플로팅 팝오버 콘솔 (레이아웃 밀림 0px) */}
                        {showConsole && (
                            <div
                                className={`osa-log-popover ${runningJobId ? "running" : "completed"
                                    }`}
                            >
                                <div className="osa-log-popover-head">
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            minWidth: 0,
                                        }}
                                    >
                                        <span
                                            className={`osa-worker-banner-title ${runningJobId ? "running" : "completed"
                                                }`}
                                        >
                                            {runningJobId ? (
                                                <>
                                                    <span className="osa-worker-pulse" />
                                                    <span>
                                                        {ACTION_LABEL[runningAction] || "AI 분석"} 실행 중 (
                                                        {formatElapsed(elapsedSec)})
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Terminal size={13} color="#ea580c" />
                                                    <span>최근 AI 워커 실행 로그</span>
                                                </>
                                            )}
                                        </span>

                                        {!runningJobId && logText && (
                                            <span className="osa-worker-done-badge">실행 완료</span>
                                        )}
                                    </div>

                                    <div
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {runningJobId ? (
                                            <button
                                                type="button"
                                                className="osa-btn osa-worker-stop-btn"
                                                style={{
                                                    height: "25px",
                                                    padding: "0 8px",
                                                    fontSize: "11.5px",
                                                }}
                                                onClick={handleStopWorker}
                                            >
                                                <span className="osa-stop-glyph" aria-hidden="true" />
                                                <span>작업 중지</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="osa-btn"
                                                disabled={!logText}
                                                style={{
                                                    height: "25px",
                                                    padding: "0 8px",
                                                    fontSize: "11.5px",
                                                }}
                                                onClick={() => {
                                                    setLogText("");
                                                }}
                                            >
                                                <span>로그 지우기</span>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            className="osa-icon-btn"
                                            style={{ width: "25px", height: "25px" }}
                                            title="로그 창 닫기 (Esc)"
                                            aria-label="로그 창 닫기"
                                            onClick={() => setShowConsole(false)}
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                </div>

                                {runningJobId && (
                                    <div className="osa-log-popover-steps">
                                        {WORKER_STEPS.map((st) => {
                                            const isCurrent = workerStep === st.step;
                                            const isDone = workerStep > st.step;
                                            return (
                                                <span
                                                    key={st.step}
                                                    className={`osa-worker-step ${isCurrent
                                                        ? "current"
                                                        : isDone
                                                            ? "done"
                                                            : "pending"
                                                        }`}
                                                >
                                                    {isDone ? `✓ ${st.label}` : st.label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                <div ref={logRef} className="osa-worker-console">
                                    {logText ? (
                                        String(logText)
                                            .split(/\r?\n/)
                                            .filter(
                                                (line, idx, arr) =>
                                                    !(idx === arr.length - 1 && line === "")
                                            )
                                            .map((line, i) => {
                                                const isErr = /error|warn|실패|오류/i.test(line);
                                                const isDone = /^✔|^✓/.test(line.trim());
                                                const isHead = /^==/.test(line.trim());
                                                const stepMatch = line.match(
                                                    /^(\[\d+\/\d+[^\]]*\])\s*(.*)$/
                                                );
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`osa-log-line ${isErr
                                                            ? "err"
                                                            : isDone
                                                                ? "done"
                                                                : isHead
                                                                    ? "head"
                                                                    : ""
                                                            }`}
                                                    >
                                                        {stepMatch ? (
                                                            <>
                                                                <span className="osa-log-step-tag">
                                                                    {stepMatch[1]}
                                                                </span>{" "}
                                                                <span>{stepMatch[2]}</span>
                                                            </>
                                                        ) : (
                                                            line
                                                        )}
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <div className="osa-log-line head">
                                            {runningJobId
                                                ? "로그 스트림 연결 대기 중..."
                                                : "표시할 실행 로그가 없습니다."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {previousPromptShow && (
                <OptionSettingPopup
                    popupShow={previousPromptShow}
                    setPopupShow={setPreviousPromptShow}
                    projectnum={projectnum}
                    qnum={qnum}
                    displayQnum={displayQnum}
                    qTitle={qTitle || data?.question_fin || ""}
                    previousPromptExValue={previousPromptExValue}
                    setPreviousPromptExValue={setPreviousPromptExValue}
                    previousPromptResValue={previousPromptResValue}
                    setPreviousPromptResValue={setPreviousPromptResValue}
                    onSelectPrompt={({ text }) => {
                        setExpanded(true);
                        setData((prev) => ({ ...prev, prompt_string: String(text || "") }));
                        setPreviousPromptShow(false);
                    }}
                />
            )}
        </Fragment>
    );
});

export default OptionSettingInfo;
