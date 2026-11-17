import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import {
    Zap,
    Pause,
    Play,
    Square,
    Check,
    X,
    Loader2,
    Clock,
    Timer,
    Settings,
    RotateCcw,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import CustomDropDownList from "@/components/kendo/CustomDropDownList.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { ProListApi } from "./ProListApi.js";
import { OptionSettingApi } from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingApi.js";
import { DEFAULT_HANQ_OPTIONS } from "./HanqOptionModal.jsx";

function getCookie(name) {
    if (typeof document === "undefined") return null;
    const safe = name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
    const match = document.cookie.match(new RegExp(`(?:^|; )${safe}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

const formatTime = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
};

const STEP_DEFINITIONS = [
    { stepNum: 1, action: "analyze", label: "1. 보기분석", desc: "카테고리/보기 생성" },
    { stepNum: 2, action: "respondent", label: "2. 응답자(전체)", desc: "전체 응답 자동 분류" },
    { stepNum: 3, action: "empty_etc", label: "3. 응답자(빈셀)", desc: "미분류/기타 재분류" },
];

const FALLBACK_MODEL_OPTIONS = [
    { value: "GPT-5.2", text: "GPT-5.2 (권장)" },
    { value: "GPT-4o", text: "GPT-4o" },
    { value: "GPT-4o-mini", text: "GPT-4o-mini (고속)" },
    { value: "o1-preview", text: "o1-preview (심층 추론)" },
];

const FALLBACK_LANG_OPTIONS = [
    { value: "Korean", text: "한국어 (Korean)" },
    { value: "English", text: "영어 (English)" },
    { value: "Japanese", text: "일본어 (Japanese)" },
    { value: "Chinese", text: "중국어 (Chinese)" },
];

const toOptions = (arr) =>
    (Array.isArray(arr) ? arr : []).map((x) => ({
        keyid: x.keyid,
        value: String(x.keyvalue ?? ""),
        text: String(x.keytext ?? x.keyvalue ?? ""),
        keyselected: x.keyselected ?? "",
    }));

const pickSelected = (opts) => {
    if (!opts.length) return null;
    const token = String(opts[0].keyselected ?? "");
    if (!token) return null;
    return (
        opts.find((o) => String(o.value) === token) ||
        opts.find((o) => String(o.keyid) === token) ||
        opts.find((o) => String(o.text) === token) ||
        null
    );
};

const matchOptionValue = (opts, rawVal) => {
    if (!rawVal || !opts.length) return null;
    const target = String(rawVal).trim();
    const found =
        opts.find((o) => String(o.value) === target) ||
        opts.find((o) => String(o.keyid) === target) ||
        opts.find((o) => String(o.text) === target) ||
        opts.find((o) => String(o.value).toLowerCase() === target.toLowerCase());
    return found ? String(found.value) : null;
};

/**
 * AI오픈분석 > 문항 목록 > 한큐분석 통합 모달 (좌측: 공통 옵션 설정 / 우측: 자동 실행 큐 & 실시간 로그)
 */
const HanqProgressModal = ({
    show,
    onClose,
    targetQuestions = [],
    projectnum,
    user,
    authToken,
    onRefresh,
    sampleQnum = "",
}) => {
    const modal = useContext(modalContext);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const {
        getHanqOptionAll,
        saveHanqOptionAll,
        startAnalysisWorker,
        getAnalysisWorkerStatus,
        stopAnalysisWorker,
    } = ProListApi();
    const { optionEditData } = OptionSettingApi();

    // ---------------- 좌측: 공통 옵션 상태 ----------------
    const [options, setOptions] = useState({ ...DEFAULT_HANQ_OPTIONS });
    const [modelOptions, setModelOptions] = useState(FALLBACK_MODEL_OPTIONS);
    const [langOptions, setLangOptions] = useState(FALLBACK_LANG_OPTIONS);
    const [serverDefaultModel, setServerDefaultModel] = useState(DEFAULT_HANQ_OPTIONS.model_select);
    const [serverDefaultLang, setServerDefaultLang] = useState(DEFAULT_HANQ_OPTIONS.result_lang);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

    // ---------------- 우측: 실행 큐 상태 ----------------
    // 상태: 'ready' | 'running' | 'paused' | 'completed' | 'stopped'
    const [status, setStatus] = useState("ready");
    const [completedSteps, setCompletedSteps] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [stepDurations, setStepDurations] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(targetQuestions[0] || null);

    // 각 단계 상태: 'waiting' | 'running' | 'completed' | 'failed'
    const [stepStatuses, setStepStatuses] = useState({
        1: "waiting",
        2: "waiting",
        3: "waiting",
    });

    // 콘솔 로그 배열
    const [logs, setLogs] = useState([]);

    // 제어용 Ref
    const isPausedRef = useRef(false);
    const isStoppedRef = useRef(false);
    const isRunningPipelineRef = useRef(false);
    const activeJobsRef = useRef(new Map());
    const consoleEndRef = useRef(null);
    const logIdCounterRef = useRef(1);

    const isBusy = status === "running" || status === "paused";
    const totalSteps = targetQuestions.length * 3;
    const progressPercent =
        totalSteps > 0 ? Math.min(100, Math.round((completedSteps / totalSteps) * 100)) : 0;

    // 예상 잔여 시간 계산 (첫 단계 완료 전에는 단계당 25초로 초기 추정)
    const avgStepSec =
        stepDurations.length > 0
            ? stepDurations.reduce((a, b) => a + b, 0) / stepDurations.length
            : 25;
    const remainingSteps = Math.max(0, totalSteps - completedSteps);
    const estimatedRemainingSec =
        status === "completed" || status === "stopped" || status === "ready"
            ? 0
            : Math.round(avgStepSec * remainingSteps);

    const appendLogLine = useCallback((rawLine, forceType = null) => {
        if (rawLine == null) return;
        const text = String(rawLine).replace(/\r$/, "");
        if (!text.trim() && forceType !== "divider") return;

        let type = forceType || "normal";
        if (!forceType) {
            if (/^={3,}|^-{3,}|^\[문항|^▶|^━━/.test(text.trim())) {
                type = "divider";
            } else if (/\[ERR\]|error|오류|실패|exception|fail|✖/i.test(text)) {
                type = "error";
            } else if (/완료|성공|completed|success|✔/i.test(text)) {
                type = "success";
            }
        }

        setLogs((prev) => {
            const next = [
                ...prev,
                {
                    id: logIdCounterRef.current++,
                    text,
                    type,
                },
            ];
            return next.length > 1500 ? next.slice(next.length - 1500) : next;
        });
    }, []);

    // 콘솔 자동 스크롤
    useEffect(() => {
        if (consoleEndRef.current) {
            consoleEndRef.current.scrollTop = consoleEndRef.current.scrollHeight;
        }
    }, [logs]);

    // 경과 시간 타이머
    useEffect(() => {
        if (!show) return;
        if (status !== "running") return;

        const timer = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [show, status]);

    // 모달 오픈 시: 서버 옵션 목록(gb=info) + 저장된 공통 옵션(option_all) 로드 및 대기 상태 세팅
    useEffect(() => {
        if (!show) return;
        let isMounted = true;

        isPausedRef.current = false;
        isStoppedRef.current = false;
        isRunningPipelineRef.current = false;
        setStatus("ready");
        setCompletedSteps(0);
        setElapsedSeconds(0);
        setStepDurations([]);
        setCurrentQIndex(0);
        setCurrentQuestion(targetQuestions[0] || null);
        setStepStatuses({ 1: "waiting", 2: "waiting", 3: "waiting" });
        setLogs([]);
        setShowAdvancedOptions(false);

        const fetchInitialOptions = async () => {
            setOptionsLoading(true);
            try {
                const pn = projectnum || sessionStorage.getItem("projectnum") || "";
                const userId = user || sessionStorage.getItem("userId") || "";
                const qnumForInfo =
                    sampleQnum ||
                    targetQuestions[0]?.qnum ||
                    sessionStorage.getItem("qnum") ||
                    "";

                const [infoRes, hanqRes] = await Promise.all([
                    optionEditData
                        .mutateAsync({
                            params: {
                                user: userId,
                                projectnum: pn,
                                qnum: qnumForInfo,
                                gb: "info",
                                skipSpinner: true,
                            },
                        })
                        .catch(() => null),
                    getHanqOptionAll
                        .mutateAsync({
                            projectnum: pn,
                            user: userId,
                        })
                        .catch(() => null),
                ]);

                if (!isMounted) return;

                const infoData = infoRes?.resultjson?.[0] || {};
                const fetchedModelOpts = toOptions(infoData?.model_select);
                const fetchedLangOpts = toOptions(infoData?.result_lang);
                const fetchedApiKeyOpts = toOptions(infoData?.apikey);

                const activeModelOpts =
                    fetchedModelOpts.length > 0 ? fetchedModelOpts : FALLBACK_MODEL_OPTIONS;
                const activeLangOpts =
                    fetchedLangOpts.length > 0 ? fetchedLangOpts : FALLBACK_LANG_OPTIONS;

                const defaultModelVal =
                    (pickSelected(activeModelOpts) || activeModelOpts[0])?.value ||
                    DEFAULT_HANQ_OPTIONS.model_select;
                const defaultLangVal =
                    (pickSelected(activeLangOpts) || activeLangOpts[0])?.value ||
                    DEFAULT_HANQ_OPTIONS.result_lang;
                const defaultApiKeyId =
                    (pickSelected(fetchedApiKeyOpts) || fetchedApiKeyOpts[0])?.value || "";

                setModelOptions(activeModelOpts);
                setLangOptions(activeLangOpts);
                setServerDefaultModel(String(defaultModelVal));
                setServerDefaultLang(String(defaultLangVal));

                let nextOpts = {
                    ...DEFAULT_HANQ_OPTIONS,
                    model_select: String(defaultModelVal),
                    result_lang: String(defaultLangVal),
                    ...(defaultApiKeyId ? { apikeyid: defaultApiKeyId } : {}),
                };

                if (String(hanqRes?.success) === "777") {
                    const data = hanqRes?.resultjson?.data ?? hanqRes?.data?.resultjson?.data;
                    if (data && typeof data === "object") {
                        const resolvedModel =
                            matchOptionValue(activeModelOpts, data.model_select) ||
                            String(data.model_select || defaultModelVal);
                        const resolvedLang =
                            matchOptionValue(activeLangOpts, data.result_lang) ||
                            String(data.result_lang || defaultLangVal);

                        nextOpts = {
                            lvcode: String(data.lvcode ?? DEFAULT_HANQ_OPTIONS.lvcode),
                            model_select: resolvedModel,
                            result_lang: resolvedLang,
                            temperature: Number.isFinite(Number(data.temperature))
                                ? Number(data.temperature)
                                : DEFAULT_HANQ_OPTIONS.temperature,
                            open_item_lv1: String(
                                data.open_item_lv1 ?? DEFAULT_HANQ_OPTIONS.open_item_lv1
                            ),
                            open_item_lv2: String(
                                data.open_item_lv2 ?? DEFAULT_HANQ_OPTIONS.open_item_lv2
                            ),
                            open_item_lv3: String(
                                data.open_item_lv3 ?? DEFAULT_HANQ_OPTIONS.open_item_lv3
                            ),
                            prompt_string: String(
                                data.prompt_string ?? DEFAULT_HANQ_OPTIONS.prompt_string
                            ),
                            concurrency: String(
                                data.concurrency ?? DEFAULT_HANQ_OPTIONS.concurrency
                            ),
                            ...(data.apikeyid || defaultApiKeyId
                                ? { apikeyid: data.apikeyid || defaultApiKeyId }
                                : {}),
                        };
                    }
                }

                setOptions(nextOpts);
                appendLogLine(
                    `분석 준비 완료 — 좌측에서 공통 옵션을 확인한 뒤 [한큐분석 시작] 버튼을 눌러주세요. (대상: 총 ${targetQuestions.length}개 문항 / ${totalSteps}단계)`,
                    "divider"
                );
            } catch (e) {
                console.error("[HanqProgressModal] 초기 옵션 로드 실패:", e);
            } finally {
                if (isMounted) setOptionsLoading(false);
            }
        };

        fetchInitialOptions();

        return () => {
            isMounted = false;
        };
    }, [show]);

    // 단일 단계 워커 실행 및 SignalR + 2초 HTTP 폴링 대기
    const runSingleStep = useCallback(
        async (question, stepDef, globalOptions) => {
            if (isStoppedRef.current) return false;

            const actionType = stepDef.action;
            const pn = projectnum || sessionStorage.getItem("projectnum") || "";
            const userId = user || sessionStorage.getItem("userId") || "";

            const stepFlags =
                actionType === "analyze"
                    ? {
                        classified: "Y",
                        opencodeCategory: "Y",
                        response: "N",
                        opencodeResponse: "N",
                    }
                    : actionType === "respondent"
                        ? {
                            classified: "N",
                            opencodeCategory: "N",
                            response: "Y",
                            opencodeResponse: "Y",
                            recallResponse: "Y",
                        }
                        : {
                            recallResponse: "Y",
                        };

            const payload = {
                projectnum: pn,
                qnum: question.qnum,
                user: userId,
                action: actionType,
                isHanq: true,
                qid: question.id ? String(question.id) : undefined,
                settings: {
                    ...globalOptions,
                    isHanq: true,
                    question_fin:
                        question.question_title || question.qnum_text || question.qnum,
                    apikeyid: globalOptions.apikeyid || undefined,
                },
                ...stepFlags,
            };

            appendLogLine(
                `▶ [${question.qnum}] ${stepDef.label} (${stepDef.desc}) 시작 요청 중...`,
                "divider"
            );

            let startRes;
            try {
                startRes = await startAnalysisWorker.mutateAsync(payload);
            } catch (err) {
                appendLogLine(
                    `✖ [${question.qnum}] ${stepDef.label} 작업을 시작하지 못했습니다. (${err?.message || "요청 실패"
                    })`,
                    "error"
                );
                return false;
            }

            const jobId =
                startRes?.jobId ||
                startRes?.resultjson?.jobId ||
                startRes?.job ||
                startRes?.resultjson?.job;

            const isStartOk =
                startRes?.ok === true ||
                String(startRes?.success) === "777" ||
                Boolean(jobId);

            if (!isStartOk || !jobId) {
                appendLogLine(
                    `✖ [${question.qnum}] ${stepDef.label} 작업을 시작하지 못했습니다.${startRes?.message || startRes?.Message
                        ? ` (${startRes?.message || startRes?.Message})`
                        : ""
                    }`,
                    "error"
                );
                return false;
            }

            appendLogLine(
                `[${question.qnum}] 분석 작업 시작됨 (작업 ID: ${jobId})`,
                "normal"
            );

            return await new Promise((resolve) => {
                let settled = false;
                let pollTimer = null;
                let hubConnection = null;
                let logOffset = 0;
                let isPollingInFlight = false;

                const cleanupAndResolve = async (success) => {
                    if (settled) return;
                    settled = true;
                    activeJobsRef.current.delete(jobId);

                    if (pollTimer) {
                        clearInterval(pollTimer);
                        pollTimer = null;
                    }

                    if (hubConnection) {
                        const conn = hubConnection;
                        hubConnection = null;
                        try {
                            await conn.invoke("Leave", jobId);
                        } catch {
                            // ignore
                        }
                        try {
                            await conn.stop();
                        } catch {
                            // ignore
                        }
                    }

                    resolve(success);
                };

                activeJobsRef.current.set(jobId, {
                    question,
                    abortFn: () => cleanupAndResolve(false),
                });

                // 1) SignalR 연결 (/hubs/worker)
                (async () => {
                    try {
                        const token = authToken || getCookie("TOKEN") || "";
                        const conn = new signalR.HubConnectionBuilder()
                            .withUrl(`${(import.meta.env.DEV ? "/APIs/o" : (window.API_CONFIG?.API_BASE_URL_OPENAI || "/APIs/o")).replace(/\/$/, "")}/hubs/worker`, {
                                accessTokenFactory: () => token,
                            })
                            .withAutomaticReconnect()
                            .configureLogging(signalR.LogLevel.None)
                            .build();

                        hubConnection = conn;

                        conn.on("onLine", (jobKey, line, isError) => {
                            if (settled) return;
                            if (jobKey && String(jobKey) !== String(jobId)) return;
                            if (line != null) {
                                appendLogLine(
                                    isError ? `[ERR] ${line}` : String(line),
                                    isError ? "error" : null
                                );
                            }
                        });

                        conn.on("onCompleted", (jobKey, hasError) => {
                            if (settled) return;
                            if (jobKey && String(jobKey) !== String(jobId)) return;
                            const isErr = Boolean(hasError);
                            appendLogLine(
                                isErr
                                    ? `✖ [${question.qnum}] ${stepDef.label} 중 오류가 발생했습니다.`
                                    : `✔ [${question.qnum}] ${stepDef.label} 완료`,
                                isErr ? "error" : "success"
                            );
                            cleanupAndResolve(!isErr);
                        });

                        await conn.start();
                        if (!settled) {
                            await conn.invoke("Join", jobId);
                        }
                    } catch (sigErr) {
                        console.warn("[HanqProgressModal] SignalR fallback to polling:", sigErr);
                    }
                })();

                // 2) 2초 간격 HTTP 상태 폴링 (Fallback)
                const pollStatus = async () => {
                    if (settled || isStoppedRef.current || isPollingInFlight) return;
                    isPollingInFlight = true;
                    try {
                        const statusRes = await getAnalysisWorkerStatus.mutateAsync({
                            job: jobId,
                            offset: logOffset,
                        });

                        if (settled) return;

                        const out = statusRes?.output ?? statusRes?.resultjson?.output;
                        const nextOffset =
                            statusRes?.nextOffset ?? statusRes?.resultjson?.nextOffset;

                        if (typeof out === "string" && out.length > 0) {
                            if (typeof nextOffset === "number" && nextOffset > logOffset) {
                                logOffset = nextOffset;
                                const lines = out.split("\n");
                                lines.forEach((l) => {
                                    if (l.trim()) appendLogLine(l);
                                });
                            } else if (logOffset === 0) {
                                logOffset = out.length;
                                const lines = out.split("\n");
                                lines.forEach((l) => {
                                    if (l.trim()) appendLogLine(l);
                                });
                            }
                        } else if (typeof nextOffset === "number") {
                            logOffset = nextOffset;
                        }

                        const isCompleted =
                            statusRes?.isCompleted === true ||
                            statusRes?.IsCompleted === true ||
                            statusRes?.resultjson?.isCompleted === true;

                        if (isCompleted) {
                            const hasError =
                                statusRes?.hasError === true ||
                                statusRes?.HasError === true ||
                                statusRes?.resultjson?.hasError === true;

                            appendLogLine(
                                hasError
                                    ? `✖ [${question.qnum}] ${stepDef.label} 실패`
                                    : `✔ [${question.qnum}] ${stepDef.label} 완료`,
                                hasError ? "error" : "success"
                            );
                            cleanupAndResolve(!hasError);
                        }
                    } catch (pollErr) {
                        console.warn("[HanqProgressModal] status polling error:", pollErr);
                    } finally {
                        isPollingInFlight = false;
                    }
                };

                pollTimer = setInterval(pollStatus, 2000);
            });
        },
        [projectnum, user, authToken, startAnalysisWorker, getAnalysisWorkerStatus, appendLogLine]
    );

    const waitWhilePaused = async () => {
        while (isPausedRef.current && !isStoppedRef.current) {
            await new Promise((r) => setTimeout(r, 300));
        }
    };

    const runQuestionPipeline = useCallback(
        async (question, qIdx, globalOptions, isPrimaryUIUpdater = true) => {
            if (isStoppedRef.current) return;

            if (isPrimaryUIUpdater) {
                setCurrentQIndex(qIdx);
                setCurrentQuestion(question);
                setStepStatuses({ 1: "waiting", 2: "waiting", 3: "waiting" });
            }

            appendLogLine(
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                "divider"
            );
            appendLogLine(
                `[문항 ${qIdx + 1}/${targetQuestions.length}] ${question.qnum} (${question.question_title || question.qnum_text || question.qnum
                }) 한큐분석 시작`,
                "divider"
            );

            for (const stepDef of STEP_DEFINITIONS) {
                await waitWhilePaused();
                if (isStoppedRef.current) break;

                if (isPrimaryUIUpdater) {
                    setCurrentQIndex(qIdx);
                    setCurrentQuestion(question);
                    setStepStatuses((prev) => ({
                        ...prev,
                        [stepDef.stepNum]: "running",
                    }));
                }

                const stepStartMs = Date.now();
                const ok = await runSingleStep(question, stepDef, globalOptions);
                const durationSec = Math.max(1, Math.round((Date.now() - stepStartMs) / 1000));

                if (isStoppedRef.current) break;

                setStepDurations((prev) => [...prev, durationSec]);
                setCompletedSteps((prev) => prev + 1);

                if (ok) {
                    if (isPrimaryUIUpdater) {
                        setStepStatuses((prev) => ({
                            ...prev,
                            [stepDef.stepNum]: "completed",
                        }));
                    }
                } else {
                    if (isPrimaryUIUpdater) {
                        setStepStatuses((prev) => ({
                            ...prev,
                            [stepDef.stepNum]: "failed",
                        }));
                    }
                    const skippedSteps = 3 - stepDef.stepNum;
                    if (skippedSteps > 0) {
                        setCompletedSteps((prev) => prev + skippedSteps);
                    }
                    appendLogLine(
                        `✖ [${question.qnum}] ${stepDef.label} 단계에서 오류가 발생하여 다음 문항으로 넘어갑니다.`,
                        "error"
                    );
                    break;
                }

                await waitWhilePaused();
            }
        },
        [targetQuestions.length, runSingleStep, appendLogLine]
    );

    const buildSavePayload = () => {
        const currentLv = Number(options.lvcode || 3);
        return {
            projectnum: projectnum || sessionStorage.getItem("projectnum") || "",
            user: user || sessionStorage.getItem("userId") || "",
            settings: {
                lvcode: String(options.lvcode || "3"),
                model_select: String(options.model_select || "GPT-5.2"),
                result_lang: String(options.result_lang || "Korean"),
                temperature: Number(options.temperature ?? 0.2),
                open_item_lv1: String(options.open_item_lv1 ?? "0~50"),
                open_item_lv2: currentLv >= 2 ? String(options.open_item_lv2 ?? "0") : "0",
                open_item_lv3: currentLv >= 3 ? String(options.open_item_lv3 ?? "0") : "0",
                prompt_string: String(options.prompt_string ?? ""),
                concurrency: String(options.concurrency || "1"),
            },
        };
    };

    // 옵션만 단독 저장
    const handleSaveOptionsOnly = async () => {
        loadingSpinner?.show?.();
        try {
            const res = await saveHanqOptionAll.mutateAsync(buildSavePayload());
            if (String(res?.success) === "777") {
                modal.showConfirm("알림", "한큐분석 옵션이 저장되었습니다.", {
                    btns: [{ title: "확인" }],
                });
            } else {
                modal.showErrorAlert(
                    "에러",
                    res?.message || res?.Message || "옵션 저장에 실패했습니다."
                );
            }
        } catch (err) {
            console.error("[HanqProgressModal] 옵션 저장 실패:", err);
            modal.showErrorAlert("에러", "옵션 저장 중 오류가 발생했습니다.");
        } finally {
            loadingSpinner?.hide?.();
        }
    };

    // 기본값 복원
    const handleResetDefaults = () => {
        if (isBusy) return;
        modal.showConfirm(
            "확인",
            "설정한 옵션을 초기 기본값으로 되돌리시겠습니까?\n(되돌린 후 [옵션 저장] 또는 [한큐분석 시작]을 눌러야 반영됩니다.)",
            {
                btns: [
                    { title: "취소" },
                    {
                        title: "복원",
                        click: () => {
                            setOptions((prev) => ({
                                ...DEFAULT_HANQ_OPTIONS,
                                model_select:
                                    serverDefaultModel || DEFAULT_HANQ_OPTIONS.model_select,
                                result_lang:
                                    serverDefaultLang || DEFAULT_HANQ_OPTIONS.result_lang,
                                ...(prev?.apikeyid ? { apikeyid: prev.apikeyid } : {}),
                            }));
                        },
                    },
                ],
            }
        );
    };

    // [한큐분석 시작] 버튼 클릭 시: 좌측 옵션 자동 저장 후 우측 파이프라인 즉시 실행
    const handleStartExecution = async () => {
        if (isRunningPipelineRef.current || !targetQuestions.length) return;
        isRunningPipelineRef.current = true;

        isPausedRef.current = false;
        isStoppedRef.current = false;
        setStatus("running");
        setCompletedSteps(0);
        setElapsedSeconds(0);
        setStepDurations([]);
        setCurrentQIndex(0);
        setCurrentQuestion(targetQuestions[0] || null);
        setStepStatuses({ 1: "waiting", 2: "waiting", 3: "waiting" });
        setLogs([]);
        setShowAdvancedOptions(false);

        const currentLv = Number(options.lvcode || 3);
        const activeOptions = {
            ...options,
            lvcode: String(options.lvcode || "3"),
            model_select: String(options.model_select || "GPT-5.2"),
            result_lang: String(options.result_lang || "Korean"),
            temperature: Number(options.temperature ?? 0.2),
            open_item_lv1: String(options.open_item_lv1 ?? "0~50"),
            open_item_lv2: currentLv >= 2 ? String(options.open_item_lv2 ?? "0") : "0",
            open_item_lv3: currentLv >= 3 ? String(options.open_item_lv3 ?? "0") : "0",
            prompt_string: String(options.prompt_string ?? ""),
            concurrency: String(options.concurrency || "1"),
        };

        appendLogLine(
            `한큐분석을 시작합니다. (대상: 총 ${targetQuestions.length}개 문항 / ${totalSteps}단계)`,
            "divider"
        );

        // 1. 현재 좌측에 설정된 옵션을 서버에 자동 저장
        try {
            await saveHanqOptionAll.mutateAsync(buildSavePayload());
        } catch (e) {
            console.warn("[HanqProgressModal] 시작 전 옵션 저장 실패(현재 설정으로 계속 진행):", e);
        }

        const modeLabel =
            Number(activeOptions.concurrency) === 2 ? "2개 병렬 실행" : "순차 실행";
        appendLogLine(
            `✔ 분석 옵션 적용 완료 (모델: ${activeOptions.model_select}, 분류: ${activeOptions.lvcode}단계, 언어: ${activeOptions.result_lang}, ${modeLabel})`,
            "success"
        );

        // 2. 문항별 3단계 파이프라인 실행
        const concurrency = Number(activeOptions.concurrency) === 2 ? 2 : 1;

        if (concurrency === 1) {
            for (let i = 0; i < targetQuestions.length; i++) {
                if (isStoppedRef.current) break;
                await waitWhilePaused();
                if (isStoppedRef.current) break;
                await runQuestionPipeline(targetQuestions[i], i, activeOptions, true);
            }
        } else {
            let nextIdx = 0;
            const workerLoop = async () => {
                while (!isStoppedRef.current) {
                    await waitWhilePaused();
                    if (isStoppedRef.current) break;
                    const myIdx = nextIdx++;
                    if (myIdx >= targetQuestions.length) break;
                    await runQuestionPipeline(
                        targetQuestions[myIdx],
                        myIdx,
                        activeOptions,
                        true
                    );
                }
            };
            await Promise.all([workerLoop(), workerLoop()]);
        }

        // 3. 종료 처리
        isRunningPipelineRef.current = false;
        if (!isStoppedRef.current) {
            setStatus("completed");
            setCompletedSteps(targetQuestions.length * 3);
            appendLogLine(
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                "divider"
            );
            appendLogLine(
                `✔ 전체 ${targetQuestions.length}개 문항의 한큐분석이 모두 완료되었습니다.`,
                "success"
            );
            onRefresh?.();
        }
    };

    if (!show) return null;

    const handleChangeOption = (key, value) => {
        if (isBusy) return;
        setOptions((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    // 일시정지 / 재개 토글
    const handleTogglePause = () => {
        if (status === "running") {
            isPausedRef.current = true;
            setStatus("paused");
            appendLogLine(
                `[일시정지 예약] 현재 진행 중인 단계가 끝나면 일시정지됩니다.`,
                "divider"
            );
        } else if (status === "paused") {
            isPausedRef.current = false;
            setStatus("running");
            appendLogLine(`▶ 분석 작업이 다시 시작되었습니다.`, "success");
        }
    };

    // 강제 중지
    const handleStop = () => {
        modal.showConfirm(
            "한큐분석 중지",
            "진행 중인 한큐분석을 중지하시겠습니까?\n(현재 실행 중인 단계만 중단되며, 이미 완료된 단계의 결과는 유지됩니다.)",
            {
                btns: [
                    { title: "취소" },
                    {
                        title: "중지",
                        click: async () => {
                            isStoppedRef.current = true;
                            isPausedRef.current = false;
                            isRunningPipelineRef.current = false;
                            setStatus("stopped");
                            appendLogLine(`사용자의 요청으로 한큐분석을 중지했습니다.`, "error");

                            const pn = projectnum || sessionStorage.getItem("projectnum") || "";
                            const userId = user || sessionStorage.getItem("userId") || "";

                            const entries = Array.from(activeJobsRef.current.entries());
                            for (const [jobId, info] of entries) {
                                try {
                                    info.abortFn?.();
                                    await stopAnalysisWorker.mutateAsync({
                                        jobId,
                                        projectnum: pn,
                                        qnum: info.question?.qnum || currentQuestion?.qnum || "",
                                        user: userId,
                                        action: jobId,
                                    });
                                } catch (e) {
                                    console.error("[HanqProgressModal] stop worker error:", e);
                                }
                            }
                            activeJobsRef.current.clear();
                            onRefresh?.();
                        },
                    },
                ],
            }
        );
    };

    const getStatusBadge = () => {
        switch (status) {
            case "running":
                return {
                    label: "실행 중",
                    bg: "#dcfce7",
                    color: "#15803d",
                    border: "#86efac",
                    dot: "#22c55e",
                };
            case "paused":
                return {
                    label: "일시정지",
                    bg: "#fef9c3",
                    color: "#a16207",
                    border: "#fde047",
                    dot: "#eab308",
                };
            case "completed":
                return {
                    label: "완료됨",
                    bg: "#dbeafe",
                    color: "#1d4ed8",
                    border: "#93c5fd",
                    dot: "#3b82f6",
                };
            case "stopped":
                return {
                    label: "중지됨",
                    bg: "#fee2e2",
                    color: "#b91c1c",
                    border: "#fca5a5",
                    dot: "#ef4444",
                };
            default:
                return {
                    label: "대기 중",
                    bg: "#fff7ed",
                    color: "#ea580c",
                    border: "#fdba74",
                    dot: "#f97316",
                };
        }
    };

    const badge = getStatusBadge();
    const canClose = !isBusy;

    const lvTabs = [
        { value: "1", label: "1단계 (소)" },
        { value: "2", label: "2단계 (중,소)" },
        { value: "3", label: "3단계 (대,중,소)" },
    ];

    return (
        <article
            className="modal on"
            style={{ zIndex: 999999 }}
            onClick={() => canClose && onClose?.()}
        >
            <style>{`
                @keyframes hanqSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .hanq-spin {
                    animation: hanqSpin 1s linear infinite;
                }
                .k-animation-container {
                    z-index: 1000005 !important;
                }
                .hanq-kendo-ddl-wrap .k-dropdownlist {
                    width: 100% !important;
                    height: 36px !important;
                    border-radius: 8px !important;
                    border: 1px solid #cbd5e1 !important;
                    background-color: #ffffff !important;
                    font-size: 13px !important;
                    color: #1e293b !important;
                    font-weight: 500 !important;
                    box-shadow: none !important;
                }
                .hanq-kendo-ddl-wrap .k-dropdownlist:hover {
                    border-color: #94a3b8 !important;
                }
                .hanq-kendo-ddl-wrap .k-dropdownlist.k-focus,
                .hanq-kendo-ddl-wrap .k-dropdownlist:focus-within {
                    border-color: #f97316 !important;
                    box-shadow: 0 0 0 3px #fff7ed !important;
                }
                .hanq-temp-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    height: 6px;
                    border-radius: 999px;
                    outline: none;
                    cursor: pointer;
                }
                .hanq-temp-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 17px;
                    height: 17px;
                    border-radius: 50%;
                    background: #f97316;
                    border: 2px solid #ffffff;
                    box-shadow: 0 1px 4px rgba(249, 115, 22, 0.4);
                    cursor: pointer;
                    transition: transform 0.15s ease;
                }
                .hanq-temp-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                }
                .hanq-temp-slider::-moz-range-thumb {
                    width: 17px;
                    height: 17px;
                    border-radius: 50%;
                    background: #f97316;
                    border: 2px solid #ffffff;
                    box-shadow: 0 1px 4px rgba(249, 115, 22, 0.4);
                    cursor: pointer;
                }
            `}</style>
            <div
                className="cmn_popup"
                style={{
                    width: "1140px",
                    maxWidth: "95vw",
                    maxHeight: "94vh",
                    position: "relative",
                    top: "auto",
                    left: "auto",
                    transform: "none",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRadius: "16px",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. 상단 통합 헤더 (.popTit - AI오픈분석 공통 팝업 헤더 스타일 통일) */}
                <div
                    className="popTit"
                    style={{
                        height: "auto",
                        padding: "16px 24px 14px 24px",
                    }}
                >
                    <div>
                        <h3
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                fontSize: "20px",
                                fontWeight: "800",
                                color: "#0f172a",
                                margin: 0,
                                lineHeight: "1.3",
                            }}
                        >
                            한큐분석
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "2px 10px",
                                    borderRadius: "999px",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    backgroundColor: badge.bg,
                                    color: badge.color,
                                    border: `1px solid ${badge.border}`,
                                }}
                            >
                                <span
                                    style={{
                                        width: "7px",
                                        height: "7px",
                                        borderRadius: "50%",
                                        backgroundColor: badge.dot,
                                    }}
                                />
                                {badge.label}
                            </span>
                        </h3>
                        <p
                            style={{
                                fontSize: "12px",
                                color: "#64748b",
                                margin: "4px 0 0 0",
                                fontWeight: "400",
                                lineHeight: "1.3",
                            }}
                        >
                            좌측에서 모든 [분석] 문항에 공통 적용될 옵션을 설정·실행하고, 우측에서 실시간 진행 현황을 확인합니다.
                        </p>
                    </div>

                    <a
                        className="btnClose"
                        onClick={() => canClose && onClose?.()}
                        title={canClose ? "닫기" : "분석 실행 중에는 닫을 수 없습니다"}
                        style={{
                            cursor: canClose ? "pointer" : "not-allowed",
                            opacity: canClose ? 1 : 0.35,
                        }}
                    >
                        <span className="hidden">close</span>
                    </a>
                </div>

                {/* 2. 본문 2단 레이아웃 (.popCont) */}
                <div
                    className="popCont"
                    style={{
                        flex: 1,
                        width: "100%",
                        maxHeight: "none",
                        overflowY: "visible",
                        overflowX: "hidden",
                        padding: 0,
                        display: "grid",
                        gridTemplateColumns: "440px minmax(0, 1fr)",
                        backgroundColor: "#ffffff",
                        boxSizing: "border-box",
                    }}
                >
                    {/* ================= 좌측 패널: 공통 옵션 설정 ================= */}
                    <div
                        style={{
                            padding: "18px 22px",
                            borderRight: "1px solid #e2e8f0",
                            backgroundColor: "#fcfcfd",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "12px",
                            opacity: optionsLoading ? 0.6 : 1,
                            minWidth: 0,
                            maxWidth: "100%",
                            boxSizing: "border-box",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "15px",
                                minWidth: 0,
                                flex: 1,
                                overflowY: "auto",
                                paddingRight: "2px",
                            }}
                        >
                            {/* 좌측 패널 헤더 */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    paddingBottom: "8px",
                                    borderBottom: "1px solid #f1f5f9",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Settings size={15} color="#ea580c" strokeWidth={2.3} />
                                    <span
                                        style={{
                                            fontSize: "14px",
                                            fontWeight: "800",
                                            color: "#0f172a",
                                        }}
                                    >
                                        한큐분석 공통 옵션 설정
                                    </span>
                                </div>
                                {isBusy ? (
                                    <span
                                        style={{
                                            fontSize: "11.5px",
                                            color: "#ea580c",
                                            fontWeight: "600",
                                            backgroundColor: "#fff7ed",
                                            padding: "2px 8px",
                                            borderRadius: "6px",
                                            border: "1px solid #fed7aa",
                                        }}
                                    >
                                        현재 적용 중인 옵션 (실행 중 잠금)
                                    </span>
                                ) : (
                                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                        <button
                                            type="button"
                                            onClick={handleResetDefaults}
                                            style={{
                                                height: "26px",
                                                padding: "0 8px",
                                                borderRadius: "6px",
                                                border: "1px solid #cbd5e1",
                                                backgroundColor: "#ffffff",
                                                color: "#64748b",
                                                fontSize: "11.5px",
                                                fontWeight: "600",
                                                cursor: "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                transition: "all 0.15s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = "#334155";
                                                e.currentTarget.style.borderColor = "#94a3b8";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = "#64748b";
                                                e.currentTarget.style.borderColor = "#cbd5e1";
                                            }}
                                        >
                                            <RotateCcw size={11} />
                                            <span style={{ fontSize: "11.5px", lineHeight: 1 }}>기본값 복원</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveOptionsOnly}
                                            title="시작하지 않고 현재 옵션만 저장합니다"
                                            style={{
                                                height: "26px",
                                                padding: "0 9px",
                                                borderRadius: "6px",
                                                border: "1px solid #fdba74",
                                                backgroundColor: "#fff7ed",
                                                color: "#ea580c",
                                                fontSize: "11.5px",
                                                fontWeight: "700",
                                                lineHeight: 1,
                                                cursor: "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                transition: "all 0.15s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#ffedd5";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "#fff7ed";
                                            }}
                                        >
                                            옵션 저장
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 1) 분류 단계 선택 (필수 노출) */}
                            <div style={{ pointerEvents: isBusy ? "none" : "auto" }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "12.5px",
                                        fontWeight: "700",
                                        color: "#1e293b",
                                        marginBottom: "6px",
                                    }}
                                >
                                    분류 단계 선택
                                </label>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(3, 1fr)",
                                        gap: "8px",
                                    }}
                                >
                                    {lvTabs.map((tab) => {
                                        const isSelected = String(options.lvcode) === tab.value;
                                        return (
                                            <button
                                                key={tab.value}
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => handleChangeOption("lvcode", tab.value)}
                                                style={{
                                                    height: "36px",
                                                    borderRadius: "8px",
                                                    border: isSelected
                                                        ? "1.5px solid #ea580c"
                                                        : "1px solid #cbd5e1",
                                                    backgroundColor: isSelected
                                                        ? "#fff7ed"
                                                        : "#ffffff",
                                                    color: isSelected ? "#ea580c" : "#475569",
                                                    fontSize: "12.5px",
                                                    fontWeight: isSelected ? "700" : "500",
                                                    cursor: isBusy ? "default" : "pointer",
                                                    transition: "all 0.15s ease",
                                                }}
                                            >
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2) 분류 개수 설정 (필수 노출 · 선택 단계에 따라 자동 활성/비활성) */}
                            <div style={{ pointerEvents: isBusy ? "none" : "auto" }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "12.5px",
                                        fontWeight: "700",
                                        color: "#1e293b",
                                        marginBottom: "5px",
                                    }}
                                >
                                    분류 개수 설정 (단계별 생성 한도)
                                </label>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(3, 1fr)",
                                        gap: "8px",
                                    }}
                                >
                                    {[
                                        { key: "open_item_lv1", label: "소분류", minLv: 1 },
                                        { key: "open_item_lv2", label: "중분류", minLv: 2 },
                                        { key: "open_item_lv3", label: "대분류", minLv: 3 },
                                    ].map((fld) => {
                                        const currentLv = Number(options.lvcode || 3);
                                        const isStageDisabled = currentLv < fld.minLv;
                                        const isFieldDisabled = isBusy || isStageDisabled;

                                        return (
                                            <div key={fld.key}>
                                                <div
                                                    style={{
                                                        fontSize: "11.5px",
                                                        color: isStageDisabled ? "#cbd5e1" : "#64748b",
                                                        marginBottom: "3px",
                                                        fontWeight: "500",
                                                        transition: "color 0.15s ease",
                                                    }}
                                                >
                                                    {fld.label}
                                                </div>
                                                <input
                                                    type="text"
                                                    disabled={isFieldDisabled}
                                                    value={isStageDisabled ? "-" : options[fld.key]}
                                                    onChange={(e) =>
                                                        handleChangeOption(fld.key, e.target.value)
                                                    }
                                                    onFocus={(e) => {
                                                        if (!isFieldDisabled)
                                                            e.currentTarget.style.borderColor = "#f97316";
                                                    }}
                                                    onBlur={(e) => {
                                                        e.currentTarget.style.borderColor = isStageDisabled
                                                            ? "#e2e8f0"
                                                            : "#cbd5e1";
                                                    }}
                                                    style={{
                                                        width: "100%",
                                                        height: "34px",
                                                        padding: "0 10px",
                                                        borderRadius: "8px",
                                                        border: isStageDisabled
                                                            ? "1px solid #e2e8f0"
                                                            : "1px solid #cbd5e1",
                                                        backgroundColor: isFieldDisabled
                                                            ? "#f1f5f9"
                                                            : "#ffffff",
                                                        fontSize: "13px",
                                                        color: isStageDisabled ? "#94a3b8" : "#1e293b",
                                                        cursor: isStageDisabled ? "not-allowed" : "text",
                                                        outline: "none",
                                                        boxSizing: "border-box",
                                                        transition: "all 0.15s ease",
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 3) 공통 프롬프트 지침 (필수 노출) */}
                            <div style={{ pointerEvents: isBusy ? "none" : "auto" }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "12.5px",
                                        fontWeight: "700",
                                        color: "#1e293b",
                                        marginBottom: "6px",
                                    }}
                                >
                                    공통 프롬프트 지침
                                </label>
                                <textarea
                                    rows={2}
                                    disabled={isBusy}
                                    value={options.prompt_string}
                                    onChange={(e) =>
                                        handleChangeOption("prompt_string", e.target.value)
                                    }
                                    placeholder="모든 문항 분석 시 공통으로 반영할 프롬프트 지침을 입력하세요 (비워두면 시스템 기본 지침 적용)"
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        backgroundColor: isBusy ? "#f8fafc" : "#ffffff",
                                        fontSize: "12.5px",
                                        color: "#1e293b",
                                        lineHeight: "1.45",
                                        resize: "none",
                                        outline: "none",
                                        boxSizing: "border-box",
                                        fontFamily: "inherit",
                                    }}
                                    onFocus={(e) => {
                                        if (!isBusy) e.currentTarget.style.borderColor = "#f97316";
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = "#cbd5e1";
                                    }}
                                />
                            </div>

                            {/* 4) 한큐분석 동시 실행 방식 (필수 노출) */}
                            <div style={{ pointerEvents: isBusy ? "none" : "auto" }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "12.5px",
                                        fontWeight: "700",
                                        color: "#1e293b",
                                        marginBottom: "6px",
                                    }}
                                >
                                    한큐분석 동시 실행 방식
                                </label>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "8px",
                                    }}
                                >
                                    {[
                                        {
                                            value: "1",
                                            title: "1개씩 순차 실행",
                                            badge: "권장",
                                            desc: "오류 없이 가장 안정적",
                                        },
                                        {
                                            value: "2",
                                            title: "2개 병렬 실행",
                                            badge: null,
                                            desc: "고속 모드 (약 40% 단축)",
                                        },
                                    ].map((item) => {
                                        const isSelected =
                                            String(options.concurrency) === item.value;
                                        return (
                                            <button
                                                key={item.value}
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() =>
                                                    handleChangeOption("concurrency", item.value)
                                                }
                                                style={{
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                    gap: "8px",
                                                    padding: "9px 11px",
                                                    borderRadius: "9px",
                                                    border: isSelected
                                                        ? "1.5px solid #ea580c"
                                                        : "1px solid #cbd5e1",
                                                    backgroundColor: isSelected
                                                        ? "#fff7ed"
                                                        : "#ffffff",
                                                    cursor: isBusy ? "default" : "pointer",
                                                    textAlign: "left",
                                                    transition: "all 0.15s ease",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: "15px",
                                                        height: "15px",
                                                        borderRadius: "50%",
                                                        border: isSelected
                                                            ? "2px solid #ea580c"
                                                            : "1.5px solid #94a3b8",
                                                        backgroundColor: "#ffffff",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        flexShrink: 0,
                                                        marginTop: "2px",
                                                        boxSizing: "border-box",
                                                    }}
                                                >
                                                    {isSelected && (
                                                        <span
                                                            style={{
                                                                width: "7px",
                                                                height: "7px",
                                                                borderRadius: "50%",
                                                                backgroundColor: "#ea580c",
                                                            }}
                                                        />
                                                    )}
                                                </span>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: "2px",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "5px",
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize: "12.5px",
                                                                fontWeight: "700",
                                                                color: isSelected
                                                                    ? "#ea580c"
                                                                    : "#1e293b",
                                                            }}
                                                        >
                                                            {item.title}
                                                        </span>
                                                        {item.badge && (
                                                            <span
                                                                style={{
                                                                    fontSize: "10.5px",
                                                                    fontWeight: "700",
                                                                    padding: "1px 5px",
                                                                    borderRadius: "4px",
                                                                    backgroundColor: isSelected
                                                                        ? "#ffedd5"
                                                                        : "#e2e8f0",
                                                                    color: isSelected
                                                                        ? "#c2410c"
                                                                        : "#475569",
                                                                }}
                                                            >
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span
                                                        style={{
                                                            fontSize: "11.5px",
                                                            color: "#64748b",
                                                            fontWeight: "400",
                                                        }}
                                                    >
                                                        {item.desc}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 5) 상세 옵션 설정 (AI 모델 · 결과 언어 · 창의성 아코디언) */}
                            {(() => {
                                const langShortLabel =
                                    langOptions
                                        .find((o) => String(o.value) === String(options.result_lang))
                                        ?.text?.split(" ")[0] ||
                                    options.result_lang ||
                                    "한국어";
                                const summaryText = `${options.model_select || "GPT-5.2"} · ${langShortLabel} · 창의성 ${Number(options.temperature ?? 0.2).toFixed(1)}`;

                                return (
                                    <div
                                        style={{
                                            borderRadius: "10px",
                                            border: showAdvancedOptions
                                                ? "1px solid #fdba74"
                                                : "1px solid #e2e8f0",
                                            backgroundColor: showAdvancedOptions
                                                ? "#ffffff"
                                                : "#f8fafc",
                                            overflow: "hidden",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setShowAdvancedOptions((prev) => !prev)}
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                border: "none",
                                                background: "none",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                cursor: "pointer",
                                                textAlign: "left",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    whiteSpace: "nowrap",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: "12.5px",
                                                        fontWeight: "700",
                                                        color: showAdvancedOptions
                                                            ? "#ea580c"
                                                            : "#334155",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    상세 옵션 설정
                                                </span>
                                                {showAdvancedOptions && (
                                                    <span
                                                        style={{
                                                            fontSize: "11px",
                                                            color: "#94a3b8",
                                                            fontWeight: "500",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        (AI 모델 · 결과 언어 · 창의성)
                                                    </span>
                                                )}
                                            </div>
                                            <div
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    whiteSpace: "nowrap",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {!showAdvancedOptions && (
                                                    <span
                                                        style={{
                                                            fontSize: "11.5px",
                                                            fontWeight: "600",
                                                            color: "#475569",
                                                            backgroundColor: "#e2e8f0",
                                                            padding: "3px 9px",
                                                            borderRadius: "999px",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {summaryText}
                                                    </span>
                                                )}
                                                {showAdvancedOptions ? (
                                                    <ChevronUp size={15} color="#ea580c" />
                                                ) : (
                                                    <ChevronDown size={15} color="#64748b" />
                                                )}
                                            </div>
                                        </button>

                                        {showAdvancedOptions && (
                                            <div
                                                style={{
                                                    padding: "12px 12px 14px 12px",
                                                    borderTop: "1px solid #f1f5f9",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "12px",
                                                    pointerEvents: isBusy ? "none" : "auto",
                                                }}
                                            >
                                                {/* AI 모델 & 결과 언어 */}
                                                <div
                                                    style={{
                                                        display: "grid",
                                                        gridTemplateColumns: "1fr 1fr",
                                                        gap: "10px",
                                                    }}
                                                >
                                                    <div className="hanq-kendo-ddl-wrap">
                                                        <label
                                                            style={{
                                                                display: "block",
                                                                fontSize: "12px",
                                                                fontWeight: "700",
                                                                color: "#1e293b",
                                                                marginBottom: "5px",
                                                            }}
                                                        >
                                                            AI 모델
                                                        </label>
                                                        <CustomDropDownList
                                                            data={modelOptions}
                                                            textField="text"
                                                            dataItemKey="value"
                                                            defaultValue={options.model_select}
                                                            disabled={isBusy}
                                                            onChange={(e) => {
                                                                const val =
                                                                    e?.value?.value ??
                                                                    e?.target?.value?.value;
                                                                if (val)
                                                                    handleChangeOption(
                                                                        "model_select",
                                                                        String(val)
                                                                    );
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="hanq-kendo-ddl-wrap">
                                                        <label
                                                            style={{
                                                                display: "block",
                                                                fontSize: "12px",
                                                                fontWeight: "700",
                                                                color: "#1e293b",
                                                                marginBottom: "5px",
                                                            }}
                                                        >
                                                            결과 언어
                                                        </label>
                                                        <CustomDropDownList
                                                            data={langOptions}
                                                            textField="text"
                                                            dataItemKey="value"
                                                            defaultValue={options.result_lang}
                                                            disabled={isBusy}
                                                            onChange={(e) => {
                                                                const val =
                                                                    e?.value?.value ??
                                                                    e?.target?.value?.value;
                                                                if (val)
                                                                    handleChangeOption(
                                                                        "result_lang",
                                                                        String(val)
                                                                    );
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* 창의성 (Temperature) */}
                                                <div>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            marginBottom: "4px",
                                                        }}
                                                    >
                                                        <label
                                                            style={{
                                                                fontSize: "12px",
                                                                fontWeight: "700",
                                                                color: "#1e293b",
                                                            }}
                                                        >
                                                            창의성 (Temperature)
                                                        </label>
                                                        <span
                                                            style={{
                                                                fontSize: "12.5px",
                                                                fontWeight: "800",
                                                                color: "#ea580c",
                                                            }}
                                                        >
                                                            {Number(options.temperature ?? 0.2).toFixed(
                                                                1
                                                            )}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="1"
                                                        step="0.1"
                                                        disabled={isBusy}
                                                        value={options.temperature ?? 0.2}
                                                        onChange={(e) =>
                                                            handleChangeOption(
                                                                "temperature",
                                                                parseFloat(e.target.value)
                                                            )
                                                        }
                                                        className="hanq-temp-slider"
                                                        style={{
                                                            background: `linear-gradient(to right, #f97316 0%, #f97316 ${Number(options.temperature ?? 0.2) *
                                                                100
                                                                }%, #e2e8f0 ${Number(options.temperature ?? 0.2) *
                                                                100
                                                                }%, #e2e8f0 100%)`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* 좌측 하단: 한큐분석 시작 원버튼 (시작 시 설정 옵션 자동 저장) */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                paddingTop: "10px",
                                borderTop: "1px solid #e2e8f0",
                            }}
                        >
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={handleStartExecution}
                                style={{
                                    width: "100%",
                                    height: "40px",
                                    padding: "0 18px",
                                    borderRadius: "8px",
                                    border: "none",
                                    backgroundColor: isBusy ? "#cbd5e1" : "#f97316",
                                    color: "#ffffff",
                                    fontSize: "13.5px",
                                    fontWeight: "700",
                                    cursor: isBusy ? "not-allowed" : "pointer",
                                    boxShadow: isBusy
                                        ? "none"
                                        : "0 2px 5px rgba(249, 115, 22, 0.25)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isBusy) {
                                        e.currentTarget.style.backgroundColor = "#ea580c";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isBusy) {
                                        e.currentTarget.style.backgroundColor = "#f97316";
                                    }
                                }}
                            >
                                <Zap size={14} strokeWidth={2.5} />
                                <span>
                                    {isBusy
                                        ? `한큐분석 진행 중 (${targetQuestions.length}문항)`
                                        : status === "completed" || status === "stopped"
                                            ? `다시 실행 (${targetQuestions.length}문항)`
                                            : `한큐분석 시작 (${targetQuestions.length}문항)`}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* ================= 우측 패널: 실행 진행 현황 & 실시간 콘솔 ================= */}
                    <div
                        style={{
                            padding: "18px 22px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "14px",
                            backgroundColor: "#ffffff",
                            minWidth: 0,
                            maxWidth: "100%",
                            boxSizing: "border-box",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "14px",
                                minWidth: 0,
                            }}
                        >
                            {/* 진행률 카드 */}
                            <div
                                style={{
                                    backgroundColor: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    padding: "15px 18px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "13px",
                                    minWidth: 0,
                                    boxSizing: "border-box",
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: "8px",
                                            flexWrap: "wrap",
                                            gap: "8px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "baseline",
                                                gap: "8px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "22px",
                                                    fontWeight: "800",
                                                    color: "#ea580c",
                                                }}
                                            >
                                                {progressPercent}%
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: "12.5px",
                                                    color: "#64748b",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                ({completedSteps} / {totalSteps} 단계 완료 · 총{" "}
                                                {targetQuestions.length}개 문항)
                                            </span>
                                        </div>

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                fontSize: "12.5px",
                                                color: "#475569",
                                                fontWeight: "600",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "5px",
                                                }}
                                            >
                                                <Clock
                                                    size={14}
                                                    color="#64748b"
                                                    strokeWidth={2.2}
                                                />
                                                경과 시간: {formatTime(elapsedSeconds)}
                                            </span>
                                            <span style={{ color: "#cbd5e1" }}>|</span>
                                            <span
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "5px",
                                                }}
                                            >
                                                <Timer
                                                    size={14}
                                                    color="#64748b"
                                                    strokeWidth={2.2}
                                                />
                                                예상 잔여 시간: 약{" "}
                                                {formatTime(estimatedRemainingSec)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 프로그레스 바 */}
                                    <div
                                        style={{
                                            width: "100%",
                                            height: "10px",
                                            backgroundColor: "#e2e8f0",
                                            borderRadius: "999px",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${progressPercent}%`,
                                                height: "100%",
                                                backgroundColor: "#f97316",
                                                borderRadius: "999px",
                                                transition: "width 0.35s ease",
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* 현재 문항 정보 */}
                                <div
                                    style={{
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #fed7aa",
                                        borderRadius: "8px",
                                        padding: "9px 14px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        minWidth: 0,
                                    }}
                                >
                                    <span
                                        style={{
                                            backgroundColor: "#fff7ed",
                                            color: "#ea580c",
                                            border: "1px solid #fdba74",
                                            fontWeight: "800",
                                            fontSize: "12px",
                                            padding: "3px 9px",
                                            borderRadius: "6px",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {currentQuestion?.qnum || "-"}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            color: "#1e293b",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            flex: 1,
                                            minWidth: 0,
                                        }}
                                    >
                                        {currentQuestion?.question_title ||
                                            currentQuestion?.qnum_text ||
                                            currentQuestion?.qnum ||
                                            "대기 중"}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            color: "#64748b",
                                            fontWeight: "600",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {Math.min(currentQIndex + 1, targetQuestions.length)} /{" "}
                                        {targetQuestions.length} 문항
                                    </span>
                                </div>

                                {/* 3단계 상태 카드 */}
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                                        gap: "10px",
                                        minWidth: 0,
                                    }}
                                >
                                    {STEP_DEFINITIONS.map((step) => {
                                        const st = stepStatuses[step.stepNum] || "waiting";
                                        const isRunning = st === "running";
                                        const isDone = st === "completed";
                                        const isFailed = st === "failed";

                                        let borderColor = "#e2e8f0";
                                        let bgColor = "#ffffff";
                                        let badgeEl = (
                                            <span
                                                style={{
                                                    fontSize: "11.5px",
                                                    color: "#94a3b8",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                대기
                                            </span>
                                        );

                                        if (isRunning) {
                                            borderColor = "#f97316";
                                            bgColor = "#fff7ed";
                                            badgeEl = (
                                                <span
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                        fontSize: "11.5px",
                                                        color: "#ea580c",
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    <Loader2 size={13} className="hanq-spin" />
                                                    진행중
                                                </span>
                                            );
                                        } else if (isDone) {
                                            borderColor = "#86efac";
                                            bgColor = "#f0fdf4";
                                            badgeEl = (
                                                <span
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "3px",
                                                        fontSize: "12px",
                                                        color: "#16a34a",
                                                        fontWeight: "800",
                                                    }}
                                                >
                                                    <Check size={14} strokeWidth={2.5} />
                                                    완료
                                                </span>
                                            );
                                        } else if (isFailed) {
                                            borderColor = "#fca5a5";
                                            bgColor = "#fef2f2";
                                            badgeEl = (
                                                <span
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "3px",
                                                        fontSize: "12px",
                                                        color: "#dc2626",
                                                        fontWeight: "800",
                                                    }}
                                                >
                                                    ✕ 실패
                                                </span>
                                            );
                                        }

                                        return (
                                            <div
                                                key={step.stepNum}
                                                style={{
                                                    border: `1.5px solid ${borderColor}`,
                                                    backgroundColor: bgColor,
                                                    borderRadius: "10px",
                                                    padding: "10px 12px",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "4px",
                                                    transition: "all 0.2s ease",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: "13px",
                                                            fontWeight: "700",
                                                            color: "#0f172a",
                                                        }}
                                                    >
                                                        {step.label}
                                                    </span>
                                                    {badgeEl}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "11.5px",
                                                        color: "#64748b",
                                                    }}
                                                >
                                                    {step.desc}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 실시간 분석 진행 로그 콘솔 */}
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    borderRadius: "10px",
                                    overflow: "hidden",
                                    border: "1px solid #1e293b",
                                    backgroundColor: "#0f172a",
                                    minWidth: 0,
                                    width: "100%",
                                    boxSizing: "border-box",
                                }}
                            >
                                <div
                                    style={{
                                        backgroundColor: "#1e293b",
                                        padding: "8px 14px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        borderBottom: "1px solid #334155",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: "9px",
                                                height: "9px",
                                                borderRadius: "50%",
                                                backgroundColor: "#f87171",
                                            }}
                                        />
                                        <span
                                            style={{
                                                width: "9px",
                                                height: "9px",
                                                borderRadius: "50%",
                                                backgroundColor: "#facc15",
                                            }}
                                        />
                                        <span
                                            style={{
                                                width: "9px",
                                                height: "9px",
                                                borderRadius: "50%",
                                                backgroundColor: "#4ade80",
                                            }}
                                        />
                                        <span
                                            style={{
                                                marginLeft: "6px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                color: "#cbd5e1",
                                            }}
                                        >
                                            실시간 분석 진행 로그
                                        </span>
                                    </div>
                                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                                        {logs.length} lines
                                    </span>
                                </div>

                                <div
                                    ref={consoleEndRef}
                                    style={{
                                        height: "240px",
                                        padding: "12px 14px",
                                        overflowY: "auto",
                                        overflowX: "hidden",
                                        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                                        fontSize: "12px",
                                        lineHeight: "1.6",
                                        color: "#e2e8f0",
                                        minWidth: 0,
                                        width: "100%",
                                        boxSizing: "border-box",
                                    }}
                                >
                                    {logs.length === 0 ? (
                                        <div style={{ color: "#64748b" }}>
                                            분석 대기 중...
                                        </div>
                                    ) : (
                                        logs.map((item) => {
                                            let lineColor = "#e2e8f0";
                                            if (item.type === "error") lineColor = "#f87171";
                                            else if (item.type === "success") lineColor = "#4ade80";
                                            else if (item.type === "divider") lineColor = "#38bdf8";

                                            const isSeparatorLine = /^[━─=\-]{5,}$/.test(
                                                (item.text || "").trim()
                                            );

                                            return (
                                                <div
                                                    key={item.id}
                                                    style={{
                                                        color: lineColor,
                                                        whiteSpace: isSeparatorLine
                                                            ? "nowrap"
                                                            : "pre-wrap",
                                                        overflow: isSeparatorLine
                                                            ? "hidden"
                                                            : "visible",
                                                        maxWidth: "100%",
                                                        wordBreak: "break-all",
                                                        overflowWrap: "anywhere",
                                                    }}
                                                >
                                                    {item.text}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 우측 하단: 일시정지 / 중지 / 닫기 제어 버튼 */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: "8px",
                                paddingTop: "10px",
                                borderTop: "1px solid #e2e8f0",
                            }}
                        >
                            {status === "ready" && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        height: "38px",
                                        padding: "0 18px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        backgroundColor: "#ffffff",
                                        color: "#475569",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                    }}
                                >
                                    닫기
                                </button>
                            )}

                            {(status === "running" || status === "paused") && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleTogglePause}
                                        style={{
                                            height: "38px",
                                            padding: "0 16px",
                                            borderRadius: "8px",
                                            border:
                                                status === "paused"
                                                    ? "1px solid #ea580c"
                                                    : "1px solid #cbd5e1",
                                            backgroundColor:
                                                status === "paused" ? "#fff7ed" : "#ffffff",
                                            color: status === "paused" ? "#ea580c" : "#334155",
                                            fontSize: "13px",
                                            fontWeight: "700",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px",
                                        }}
                                    >
                                        {status === "paused" ? (
                                            <>
                                                <Play size={14} />
                                                <span>작업 계속</span>
                                            </>
                                        ) : (
                                            <>
                                                <Pause size={14} />
                                                <span>일시 정지</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleStop}
                                        style={{
                                            height: "38px",
                                            padding: "0 16px",
                                            borderRadius: "8px",
                                            border: "1px solid #fca5a5",
                                            backgroundColor: "#fef2f2",
                                            color: "#dc2626",
                                            fontSize: "13px",
                                            fontWeight: "700",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px",
                                        }}
                                    >
                                        <Square size={13} fill="#dc2626" />
                                        <span>중지</span>
                                    </button>
                                </>
                            )}

                            {(status === "completed" || status === "stopped") && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        height: "38px",
                                        padding: "0 20px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        backgroundColor: "#ffffff",
                                        color: "#334155",
                                        fontSize: "13px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                    }}
                                >
                                    확인 및 닫기
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default HanqProgressModal;
