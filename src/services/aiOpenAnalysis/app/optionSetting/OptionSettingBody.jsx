import React, { useRef, useState, useCallback, useContext, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Settings,
    Trash2,
} from "lucide-react";
import {
    OsaQuestionNavSelect,
    OsaDropDown,
    STAGE_OPTIONS,
} from "./OptionSettingKendoSelect.jsx";
import OptionSettingInfo from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingInfo";
import OptionSettingTab1 from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingTab1";
import OptionSettingTab2 from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingTab2";
import OptionSettingTab3 from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingTab3";
import OptionSettingLv3Panel from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingLv3Panel.jsx";
import OptionSettingExcelPreviewModal from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingExcelPreviewModal.jsx";
import OptionSettingExcelUploadErrorPopup from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingExcelUploadErrorPopup.jsx";
import OptionSettingImportModal from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingImportModal.jsx";
import OptionSettingSaveCompareModal from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingSaveCompareModal.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import AiDataHeader from "@/services/aiOpenAnalysis/components/AiDataHeader.jsx";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import "@/services/aiOpenAnalysis/app/AiCommonLayout.css";
import "./OptionSettingNewLayout.css";
import {
    getAnalysisInfo,
    getAnalysisResponses,
    getAnalysisCodes,
    getAnalysisRawdata,
    checkAnalysisPopup,
    saveAnalysisInfo,
    saveAnalysisCodes,
    saveAnalysisResponses,
    downloadAnalysisExcel,
    uploadAnalysisExcel,
    previewExcelCodes,
    getAnalysisQuestionList,
} from "@/api/analysisApi.js";
import {
    cleanStr,
    ensureRowUids,
    extractList,
    normalizeCodeRows,
    buildGubunAndLockPatch,
    isCodeLocked,
    applyCodeFieldPropagation,
    validateCodeLabelConsistency,
} from "./optionSettingUtils";

// 엑셀 시트('X') + 업로드(↑) 직관 복합 아이콘
const ExcelUploadIcon = () => (
    <svg width="19" height="19" viewBox="0 0 22 20" fill="none" aria-hidden="true">
        <rect
            x="1.5"
            y="1.5"
            width="13"
            height="16.5"
            rx="2"
            fill="#ffffff"
            stroke="currentColor"
            strokeWidth="1.5"
        />
        <path
            d="M5.4 6.6L9.8 12.8M9.8 6.6L5.4 12.8"
            stroke="#16a34a"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
        <circle cx="16.8" cy="14.2" r="4.8" fill="#ffffff" />
        <path
            d="M16.8 17.2V11.3M14.3 13.7L16.8 11.2L19.3 13.7"
            stroke="#ea580c"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// 엑셀 시트('X') + 다운로드(↓) 직관 복합 아이콘
const ExcelDownloadIcon = () => (
    <svg width="19" height="19" viewBox="0 0 22 20" fill="none" aria-hidden="true">
        <rect
            x="1.5"
            y="1.5"
            width="13"
            height="16.5"
            rx="2"
            fill="#ffffff"
            stroke="currentColor"
            strokeWidth="1.5"
        />
        <path
            d="M5.4 6.6L9.8 12.8M9.8 6.6L5.4 12.8"
            stroke="#16a34a"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
        <circle cx="16.8" cy="14.2" r="4.8" fill="#ffffff" />
        <path
            d="M16.8 11.2V17.1M14.3 14.7L16.8 17.2L19.3 14.7"
            stroke="#15803d"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const formatNow = (d = new Date()) => {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
        d.getMinutes()
    )}:${p(d.getSeconds())}`;
};

const normalizeResponseRows = (items = [], codeRows = []) => {
    const byName = new Map();
    (codeRows || []).forEach((c) => {
        const nameKey = cleanStr(c?.lv3).toLowerCase();
        const codeVal = cleanStr(c?.lv123code ?? c?.code_num);
        if (nameKey && codeVal && !byName.has(nameKey)) {
            byName.set(nameKey, c);
        }
    });

    return ensureRowUids(items).map((r) => {
        const rawLv3 = cleanStr(r?.lv3);
        let subCode = cleanStr(r?.lv123code ?? r?.code_num ?? r?.lv3code);
        let lv1 = cleanStr(r?.lv1);
        let lv1code = cleanStr(r?.lv1code);
        let lv2 = cleanStr(r?.lv2);
        let lv2code = cleanStr(r?.lv2code);

        // 응답에 소분류명은 있으나 소코드가 비어있을 때 코드북과 이름 일치 시 자동 매칭 보정
        if (!subCode && rawLv3) {
            const matched = byName.get(rawLv3.toLowerCase());
            if (matched) {
                subCode = cleanStr(matched.lv123code ?? matched.code_num);
                if (!lv1) lv1 = cleanStr(matched.lv1);
                if (!lv1code) lv1code = cleanStr(matched.lv1code);
                if (!lv2) lv2 = cleanStr(matched.lv2);
                if (!lv2code) lv2code = cleanStr(matched.lv2code);
            }
        }

        return {
            ...r,
            answer: r?.answer ?? r?.answer_fin ?? r?.answerfin ?? "",
            answer_fin: r?.answer_fin ?? r?.answer ?? r?.answerfin ?? "",
            lv1,
            lv1code,
            lv2,
            lv2code,
            lv3: rawLv3,
            lv3code: subCode,
            lv123code: subCode,
            sentiment: cleanStr(r?.sentiment),
            recheckyn: cleanStr(r?.recheckyn),
            selected: String(r?.recheckyn ?? "").toLowerCase() === "y",
        };
    });
};

/**
 * AI오픈 문항 분석 메인 화면 (신규 UI 레이아웃 · 100% 주황색 브랜드 테마 · /analysis/* 연동)
 */
const OptionSettingBody = () => {
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const userId = auth?.user?.userId || sessionStorage.getItem("userId") || "";
    const loadingSpinner = useContext(loadingSpinnerContext);
    const navigate = useNavigate();

    // Context 참조 변경으로 인한 useEffect 무한 재실행 방지 Ref
    const loadingSpinnerRef = useRef(loadingSpinner);
    loadingSpinnerRef.current = loadingSpinner;
    const modalRef = useRef(modal);
    modalRef.current = modal;

    const projectnum = sessionStorage.getItem("projectnum") ?? "";
    const servername = sessionStorage.getItem("servername") ?? "";
    const [project_lock, setProjectLock] = useState(
        () => sessionStorage.getItem("project_lock") ?? ""
    );
    const userPerm = Number(sessionStorage.getItem("userPerm") ?? 0);

    const [currentQnum, setCurrentQnum] = useState(() => sessionStorage.getItem("qnum") ?? "");
    const [questionList, setQuestionList] = useState([]);

    // 분석 화면 진입 시 좌측 공통 메뉴 사이드바 자동 접힘 처리
    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent("surveyon:sidebar-collapse", { detail: { collapsed: true } })
        );
    }, []);

    useEffect(() => {
        if (!currentQnum) {
            modalRef.current?.showAlert?.("알림", "분석할 문항을 먼저 선택해 주세요.");
            navigate("/ai_open_analysis/pro_list");
        }
    }, [currentQnum, navigate]);

    // 프로젝트 전체 문항 목록 조회 (상단 문항 전환 네비게이터용 · merge_qnum 통합 단위 그룹화)
    useEffect(() => {
        if (!projectnum) return;
        const ctrl = new AbortController();
        (async () => {
            try {
                const res = await getAnalysisQuestionList(
                    projectnum,
                    userId,
                    servername,
                    ctrl.signal
                );
                const rawList = extractList(res);
                const groupMap = new Map();
                const orderKeys = [];

                rawList.forEach((q) => {
                    if (String(q?.useYN ?? "").trim() === "제외") return;
                    const navKey =
                        cleanStr(q?.merge_qnum) ||
                        cleanStr(q?.qnum) ||
                        cleanStr(q?.qnum_text);
                    if (!navKey) return;
                    if (!groupMap.has(navKey)) {
                        groupMap.set(navKey, []);
                        orderKeys.push(navKey);
                    }
                    groupMap.get(navKey).push(q);
                });

                const deduped = orderKeys.map((navKey) => {
                    const arr = groupMap.get(navKey);
                    const master =
                        arr.find((r) => cleanStr(r?.qnum_text || r?.qnum) === navKey) ||
                        arr.find((r) => String(r?.useYN ?? "").trim() === "분석") ||
                        arr[0];
                    return {
                        ...master,
                        _navKey: navKey,
                        _memberQnums: arr
                            .flatMap((r) => [
                                cleanStr(r?.merge_qnum),
                                cleanStr(r?.qnum),
                                cleanStr(r?.qnum_text),
                            ])
                            .filter(Boolean),
                        _displayNum:
                            cleanStr(master?.merge_qnum) ||
                            cleanStr(master?.qnum_text) ||
                            navKey,
                        _title:
                            cleanStr(master?.question_fin) ||
                            cleanStr(master?.question_title) ||
                            cleanStr(master?.qnum_text) ||
                            navKey,
                        _lock:
                            String(master?.project_lock ?? "").trim() === "수정불가"
                                ? "수정불가"
                                : "수정",
                    };
                });

                setQuestionList(deduped);
            } catch {
                // ignore
            }
        })();
        return () => ctrl.abort();
    }, [projectnum, userId, servername]);

    const [tabDivision, setTabDivision] = useState("1"); // '1': 응답 데이터 | '2': 보기 데이터 | '3': PID별 데이터
    const [lvCode, setLvCode] = useState("3"); // '1' | '2' | '3'
    const [lvCodeCommitted, setLvCodeCommitted] = useState("3");

    const [qid, setQid] = useState("");
    const [duplicateAnswerChecked, setDuplicateAnswerChecked] = useState(false);
    const [duplicateRemoveDate, setDuplicateRemoveDate] = useState("");
    const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
    const [rightPanelWidth, setRightPanelWidth] = useState(null);
    const [isSplitterDragging, setIsSplitterDragging] = useState(false);
    const workspaceRef = useRef(null);
    const splitterCleanupRef = useRef(null);
    const [isWorkerBusy, setIsWorkerBusy] = useState(false);

    useEffect(() => {
        return () => {
            splitterCleanupRef.current?.();
            document.body.classList.remove("osa-is-panel-resizing");
        };
    }, []);

    const handleSplitterMouseDown = useCallback((e) => {
        if (e.button !== 0) return;
        const ws = workspaceRef.current;
        if (!ws) return;
        const rpEl = ws.querySelector(".osa-right-panel:not(.collapsed)");
        if (!rpEl) return;

        e.preventDefault();
        const startX = e.clientX;
        const startRightW = rpEl.getBoundingClientRect().width;

        setIsSplitterDragging(true);
        document.body.classList.add("osa-is-panel-resizing");

        const onMove = (ev) => {
            const wsWidth = ws.getBoundingClientRect().width;
            const minLeftW = 430;
            const splitterW = 9;
            const minRightW = 280;
            const maxRightW = Math.max(minRightW, wsWidth - minLeftW - splitterW);
            const dx = ev.clientX - startX;
            const nextW = Math.min(maxRightW, Math.max(minRightW, Math.round(startRightW - dx)));
            setRightPanelWidth(nextW);
        };

        const onUp = () => {
            setIsSplitterDragging(false);
            document.body.classList.remove("osa-is-panel-resizing");
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            splitterCleanupRef.current = null;
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        splitterCleanupRef.current = onUp;
    }, []);

    // 데이터 상태
    const [infoRawData, setInfoRawData] = useState(null);
    const [settings, setSettings] = useState({});
    const [responses, setResponses] = useState([]);
    const [codes, setCodes] = useState([]);
    const [rawdata, setRawdata] = useState([]);
    const committedResponsesRef = useRef([]);
    const committedCodesRef = useRef([]);
    const [selectedResponseKeys, setSelectedResponseKeys] = useState(new Set());
    const [reloadTrigger, setReloadTrigger] = useState(0);

    // 더티(미저장) 상태
    const [unsaved, setUnsaved] = useState({ "1": false, "2": false });
    const markUnsaved = useCallback((tab, val) => {
        setUnsaved((prev) => (prev[tab] === val ? prev : { ...prev, [tab]: val }));
    }, []);

    const hasAnyUnsaved =
        unsaved["1"] ||
        unsaved["2"] ||
        lvCode !== lvCodeCommitted ||
        responses.some((r) => r?._edited);

    // 모달 상태
    const excelFileInputRef = useRef(null);
    const [excelPreviewOpen, setExcelPreviewOpen] = useState(false);
    const [excelPreviewData, setExcelPreviewData] = useState(null);
    const [excelErrorPopupShow, setExcelErrorPopupShow] = useState(false);
    const [excelErrorList, setExcelErrorList] = useState([]);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [saveCompareOpen, setSaveCompareOpen] = useState(false);
    const [isExecutingSave, setIsExecutingSave] = useState(false);
    const [codedResponseCount, setCodedResponseCount] = useState(0);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [headerDrawerNode, setHeaderDrawerNode] = useState(null);

    const infoRef = useRef(null);
    const tab1Ref = useRef(null);
    const tab2Ref = useRef(null);

    const handleDuplicateRemoveDateLoaded = useCallback((date) => {
        const str = cleanStr(date);
        setDuplicateRemoveDate(str);
        setDuplicateAnswerChecked(Boolean(str));
    }, []);

    // 기능 1: 문항 진입 및 문항 전환 시 AbortController + 병렬 조회
    useEffect(() => {
        if (!projectnum || !currentQnum) return;
        const controller = new AbortController();
        const { signal } = controller;

        let spinnerActive = true;
        const hideSpinnerOnce = () => {
            if (!spinnerActive) return;
            spinnerActive = false;
            loadingSpinnerRef.current?.hide?.();
        };

        const loadQuestionData = async () => {
            loadingSpinnerRef.current?.show?.();
            try {
                const infoPromise = getAnalysisInfo(projectnum, currentQnum, userId, signal);
                const dataPromise = Promise.all([
                    getAnalysisResponses(projectnum, currentQnum, signal),
                    getAnalysisCodes(projectnum, currentQnum, signal),
                    getAnalysisRawdata(projectnum, currentQnum, signal),
                ]);

                const [infoRes, [respRes, codesRes, rawRes]] = await Promise.all([
                    infoPromise,
                    dataPromise,
                ]);
                if (signal.aborted) return;

                const firstInfo =
                    (Array.isArray(infoRes?.resultjson) ? infoRes.resultjson[0] : null) ||
                    (Array.isArray(infoRes?.data) ? infoRes.data[0] : null) ||
                    infoRes?.info ||
                    {};

                const dupDate =
                    firstInfo?.duplicate_remove_date ??
                    firstInfo?.duplicateRemoveDate ??
                    infoRes?.duplicate_remove_date ??
                    infoRes?.duplicateRemoveDate ??
                    respRes?.duplicate_remove_date ??
                    respRes?.duplicateRemoveDate ??
                    "";

                handleDuplicateRemoveDateLoaded(dupDate);

                const resolvedLv = cleanStr(
                    firstInfo?.lvcode ??
                    infoRes?.lvcode ??
                    respRes?.lvcode ??
                    extractList(respRes)?.[0]?.lvcode
                );
                if (["1", "2", "3"].includes(resolvedLv)) {
                    setLvCode(resolvedLv);
                    setLvCodeCommitted(resolvedLv);
                }

                setInfoRawData(firstInfo);
                if (firstInfo?.qid) {
                    const qidStr = String(firstInfo.qid).trim();
                    setQid(qidStr);
                    checkAnalysisPopup(projectnum, currentQnum, qidStr, "0", signal).catch(
                        () => { }
                    );
                }

                const normCodes = normalizeCodeRows(extractList(codesRes), currentQnum);
                const normResp = normalizeResponseRows(extractList(respRes), normCodes);
                const normRaw = extractList(rawRes);

                committedResponsesRef.current = normResp;
                committedCodesRef.current = normCodes;
                setResponses(normResp);
                setCodes(normCodes);
                setRawdata(normRaw);
                setSelectedResponseKeys(new Set());
                setUnsaved({ "1": false, "2": false });

                tab1Ref.current?.resetBaseline?.(normResp);
                tab2Ref.current?.resetBaseline?.(normCodes);
            } catch (err) {
                if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") return;
                console.error("[OptionSettingBody] 데이터 로드 오류:", err);
            } finally {
                hideSpinnerOnce();
            }
        };

        loadQuestionData();
        return () => {
            controller.abort();
            hideSpinnerOnce();
        };
    }, [
        projectnum,
        currentQnum,
        userId,
        reloadTrigger,
        handleDuplicateRemoveDateLoaded,
    ]);

    // 워커 완료 / 저장 완료 시 최신 데이터 재조회
    const refreshAnalysisDatasets = useCallback(async () => {
        if (!projectnum || !currentQnum) return;
        const [infoRes, respRes, codesRes, rawRes] = await Promise.all([
            getAnalysisInfo(projectnum, currentQnum, userId).catch(() => null),
            getAnalysisResponses(projectnum, currentQnum),
            getAnalysisCodes(projectnum, currentQnum),
            getAnalysisRawdata(projectnum, currentQnum),
        ]);

        if (infoRes) {
            const firstInfo =
                (Array.isArray(infoRes?.resultjson) ? infoRes.resultjson[0] : null) ||
                (Array.isArray(infoRes?.data) ? infoRes.data[0] : null) ||
                infoRes?.info ||
                {};
            const dupDate =
                firstInfo?.duplicate_remove_date ??
                firstInfo?.duplicateRemoveDate ??
                infoRes?.duplicate_remove_date ??
                infoRes?.duplicateRemoveDate ??
                respRes?.duplicate_remove_date ??
                respRes?.duplicateRemoveDate ??
                "";
            handleDuplicateRemoveDateLoaded(dupDate);
            if (Object.keys(firstInfo).length > 0) {
                setInfoRawData(firstInfo);
            }
        }

        const normCodes = normalizeCodeRows(extractList(codesRes), currentQnum);
        const normResp = normalizeResponseRows(extractList(respRes), normCodes);
        const normRaw = extractList(rawRes);

        committedResponsesRef.current = normResp;
        committedCodesRef.current = normCodes;
        setResponses(normResp);
        setCodes(normCodes);
        setRawdata(normRaw);
        setUnsaved({ "1": false, "2": false });

        tab1Ref.current?.resetBaseline?.(normResp);
        tab2Ref.current?.resetBaseline?.(normCodes);
    }, [projectnum, currentQnum, userId, handleDuplicateRemoveDateLoaded]);

    // PID별 데이터 단독 새로고침
    const handleRefreshRawdata = useCallback(async () => {
        if (!projectnum || !currentQnum) return;
        const rawRes = await getAnalysisRawdata(projectnum, currentQnum);
        setRawdata(extractList(rawRes));
    }, [projectnum, currentQnum]);

    // 브라우저 새로고침/닫기 가드
    useEffect(() => {
        const handler = (e) => {
            if (!hasAnyUnsaved) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasAnyUnsaved]);

    const currentQIndex = useMemo(() => {
        const target = cleanStr(currentQnum);
        if (!target || questionList.length === 0) return -1;

        let idx = questionList.findIndex(
            (q) => q._navKey === target || (q._memberQnums && q._memberQnums.includes(target))
        );
        if (idx >= 0) return idx;

        const lower = target.toLowerCase();
        idx = questionList.findIndex(
            (q) =>
                q._navKey?.toLowerCase() === lower ||
                (q._memberQnums && q._memberQnums.some((m) => m.toLowerCase() === lower))
        );
        return idx;
    }, [questionList, currentQnum]);

    const matchedQuestion = currentQIndex >= 0 ? questionList[currentQIndex] : null;

    // 서버 최신 문항 목록 기준 잠금(project_lock) 상태 동기화 (이전 세션 잔존 '수정불가'로 버튼 숨김 방지)
    useEffect(() => {
        if (matchedQuestion?._lock && matchedQuestion._lock !== project_lock) {
            setProjectLock(matchedQuestion._lock);
            sessionStorage.setItem("project_lock", matchedQuestion._lock);
        }
    }, [matchedQuestion?._lock, project_lock]);

    const currentDisplayNum = useMemo(
        () => matchedQuestion?._displayNum || currentQnum,
        [matchedQuestion, currentQnum]
    );

    const currentQTitle = useMemo(() => {
        return (
            cleanStr(infoRawData?.question_fin) ||
            matchedQuestion?._title ||
            currentQnum
        );
    }, [infoRawData, matchedQuestion, currentQnum]);

    // 문항 전환 핸들러 (미저장 확인 + 저장 후 이동 + 잠금 상태 동기화 포함)
    const executeSaveRef = useRef(null);

    const switchQuestionTo = useCallback(
        (nextQnum) => {
            const target = cleanStr(nextQnum);
            if (!target || target === cleanStr(currentQnum)) return;

            const targetItem = questionList.find(
                (q) => q._navKey === target || (q._memberQnums && q._memberQnums.includes(target))
            );
            const resolvedKey = targetItem?._navKey || target;
            if (resolvedKey === cleanStr(currentQnum)) return;

            const doSwitch = () => {
                sessionStorage.setItem("qnum", resolvedKey);
                if (targetItem?._lock) {
                    sessionStorage.setItem("project_lock", targetItem._lock);
                    setProjectLock(targetItem._lock);
                }
                setSelectedResponseKeys(new Set());
                setUnsaved({ "1": false, "2": false });
                setCurrentQnum(resolvedKey);
            };

            if (hasAnyUnsaved) {
                const btns = [
                    { title: "취소" },
                    { title: "이동", click: doSwitch },
                ];

                if (project_lock !== "수정불가") {
                    btns.push({
                        title: "저장 후 이동",
                        click: () => {
                            // Modal.jsx의 동기 onClose 호출 이후 검증·저장이 실행되도록 마이크로태스크 분리
                            setTimeout(async () => {
                                const activeCodes = (codes || []).filter(
                                    (c) => !c?.__pendingDelete
                                );
                                for (let i = 0; i < activeCodes.length; i++) {
                                    const item = activeCodes[i];
                                    if (
                                        !cleanStr(item.lv123code ?? item.code_num) ||
                                        !cleanStr(item.lv3)
                                    ) {
                                        modalRef.current?.showErrorAlert?.(
                                            "알림",
                                            `보기 목록 ${i + 1}번째 행의 소코드와 소분류명은 필수입니다.`
                                        );
                                        return;
                                    }
                                }

                                const consistency = validateCodeLabelConsistency(activeCodes);
                                if (!consistency.valid) {
                                    modalRef.current?.showErrorAlert?.(
                                        "무결성 오류",
                                        consistency.message
                                    );
                                    return;
                                }

                                const saved = await executeSaveRef.current?.({
                                    duplicateRemove: duplicateAnswerChecked,
                                    saveWithUncoded: false,
                                    fallbackCode: "99",
                                    fallbackLabel: "기타/무응답(자동)",
                                    skipPostRefreshAndAlert: true,
                                });
                                if (saved) {
                                    doSwitch();
                                }
                            }, 0);
                        },
                    });
                }

                modalRef.current?.showConfirm?.(
                    "알림",
                    "저장하지 않은 변경사항이 있습니다.\n저장하지 않고 다른 문항으로 이동하시겠습니까?",
                    { btns }
                );
                return;
            }
            doSwitch();
        },
        [codes, currentQnum, duplicateAnswerChecked, hasAnyUnsaved, project_lock, questionList]
    );

    // 탭 전환 핸들러 (미저장 변경사항 있을 시 [취소 | 이동 | 저장 후 이동] 확인 팝업 표출)
    const trySwitchTab = useCallback(
        (nextTab) => {
            const nextStr = String(nextTab);
            if (!nextStr || nextStr === String(tabDivision)) return;

            const isDirtyOnEditableTab =
                (tabDivision === "1" || tabDivision === "2") && hasAnyUnsaved;

            if (!isDirtyOnEditableTab) {
                setTabDivision(nextStr);
                return;
            }

            const btns = [
                { title: "취소" },
                {
                    title: "이동",
                    click: () => {
                        const restoredResp = (committedResponsesRef.current || []).map((r) => ({
                            ...r,
                            _edited: false,
                        }));
                        const restoredCodes = (committedCodesRef.current || []).map((c) => ({
                            ...c,
                        }));
                        setResponses(restoredResp);
                        setCodes(restoredCodes);
                        setLvCode(lvCodeCommitted);
                        setSelectedResponseKeys(new Set());
                        setUnsaved({ "1": false, "2": false });
                        tab1Ref.current?.resetBaseline?.(restoredResp);
                        tab2Ref.current?.resetBaseline?.(restoredCodes);
                        setTabDivision(nextStr);
                    },
                },
            ];

            if (project_lock !== "수정불가") {
                btns.push({
                    title: "저장 후 이동",
                    click: () => {
                        setTimeout(async () => {
                            const activeCodes = (codes || []).filter((c) => !c?.__pendingDelete);
                            for (let i = 0; i < activeCodes.length; i++) {
                                const item = activeCodes[i];
                                if (
                                    !cleanStr(item.lv123code ?? item.code_num) ||
                                    !cleanStr(item.lv3)
                                ) {
                                    modalRef.current?.showErrorAlert?.(
                                        "알림",
                                        `보기 목록 ${i + 1}번째 행의 소코드와 소분류명은 필수입니다.`
                                    );
                                    return;
                                }
                            }

                            const consistency = validateCodeLabelConsistency(activeCodes);
                            if (!consistency.valid) {
                                modalRef.current?.showErrorAlert?.(
                                    "무결성 오류",
                                    consistency.message
                                );
                                return;
                            }

                            const saved = await executeSaveRef.current?.({
                                duplicateRemove: duplicateAnswerChecked,
                                saveWithUncoded: false,
                                fallbackCode: "99",
                                fallbackLabel: "기타/무응답(자동)",
                                skipPostRefreshAndAlert: true,
                            });
                            if (saved) {
                                await refreshAnalysisDatasets();
                                setSelectedResponseKeys(new Set());
                                setTabDivision(nextStr);
                            }
                        }, 0);
                    },
                });
            }

            modalRef.current?.showConfirm?.(
                "알림",
                "저장하지 않은 변경 사항이 있습니다.\n이동하시겠습니까?",
                { btns }
            );
        },
        [
            codes,
            duplicateAnswerChecked,
            hasAnyUnsaved,
            lvCodeCommitted,
            project_lock,
            refreshAnalysisDatasets,
            tabDivision,
        ]
    );

    // 우측 보기 패널 연동 콜백들
    const handleMapCodeToSelected = useCallback(
        (codeRow) => {
            if (!selectedResponseKeys || selectedResponseKeys.size === 0) {
                modalRef.current?.showAlert?.(
                    "알림",
                    "좌측 응답 데이터 목록에서 매핑할 응답 행을 먼저 클릭(또는 드래그 선택)해 주세요."
                );
                return;
            }
            tab1Ref.current?.applyLv3To?.(selectedResponseKeys, codeRow);
            markUnsaved("1", true);
        },
        [markUnsaved, selectedResponseKeys]
    );

    const handleUnmapCodeFromSelected = useCallback(
        (codeRow) => {
            if (!selectedResponseKeys || selectedResponseKeys.size === 0) return;
            tab1Ref.current?.unmapLv3From?.(selectedResponseKeys, codeRow?.lv123code);
            markUnsaved("1", true);
        },
        [markUnsaved, selectedResponseKeys]
    );

    const handleRightPanelEditCode = useCallback(
        (targetRow, field, rawVal) => {
            if (!targetRow || isCodeLocked(targetRow) || project_lock === "수정불가") return;
            const res = applyCodeFieldPropagation({
                codes,
                responses,
                targetRow,
                field,
                rawValue: rawVal,
            });
            if (!res.ok) {
                modalRef.current?.showErrorAlert?.("알림", res.error);
                return;
            }
            if (!res.changed) return;
            setCodes(res.nextCodes);
            setResponses(res.nextResponses);
            markUnsaved("2", true);
        },
        [codes, markUnsaved, project_lock, responses]
    );

    const handleRightPanelAddCode = useCallback(
        (newLabel, autoCode, targetRespKeys) => {
            const codeVal = cleanStr(autoCode);
            const labelVal = cleanStr(newLabel);
            if (!codeVal) return null;

            const createdKey = `code_rp_${codeVal}_${Date.now()}`;
            const patch = buildGubunAndLockPatch("자동분석", false);
            const newRow = {
                no: (codes?.length || 0) + 1,
                qnum: currentQnum,
                lv1: "",
                lv1code: "",
                lv2: "",
                lv2code: "",
                lv3: labelVal,
                lv123code: codeVal,
                code_num: codeVal,
                ...patch,
                __rowKey: createdKey,
            };

            setCodes((prev) => normalizeCodeRows([...(prev || []), newRow], currentQnum));
            markUnsaved("2", true);

            if (labelVal && targetRespKeys && targetRespKeys.size > 0) {
                tab1Ref.current?.applyLv3To?.(targetRespKeys, newRow);
                markUnsaved("1", true);
            }
            return createdKey;
        },
        [codes?.length, currentQnum, markUnsaved]
    );

    const handleRightPanelDeleteCode = useCallback(
        (targetRow) => {
            if (!targetRow || isCodeLocked(targetRow) || project_lock === "수정불가") return;
            const rKey = targetRow.__rowKey;
            const subCode = cleanStr(targetRow.lv123code ?? targetRow.code_num);

            modalRef.current?.showConfirm?.(
                "알림",
                `보기 [${subCode}] '${targetRow.lv3 || "(미입력)"}'을(를) 삭제하시겠습니까?\n매핑된 응답은 미분류 처리됩니다.`,
                {
                    btns: [
                        { title: "취소" },
                        {
                            title: "삭제",
                            click: () => {
                                setCodes((prev) =>
                                    (prev || []).filter((c) => c.__rowKey !== rKey)
                                );
                                markUnsaved("2", true);
                                if (subCode) {
                                    setResponses((prevResp) =>
                                        (prevResp || []).map((resp) =>
                                            cleanStr(resp.lv123code) === subCode
                                                ? {
                                                    ...resp,
                                                    lv1: "",
                                                    lv1code: "",
                                                    lv2: "",
                                                    lv2code: "",
                                                    lv3: "",
                                                    lv3code: "",
                                                    lv123code: "",
                                                    _edited: true,
                                                }
                                                : resp
                                        )
                                    );
                                    markUnsaved("1", true);
                                }
                            },
                        },
                    ],
                }
            );
        },
        [markUnsaved, project_lock]
    );

    // 엑셀 다운로드 / 업로드 (레거시 HR_Sample3.xlsx 응답자 + 보기항목 통합 포맷 호환)
    const handleExcelDownload = async () => {
        try {
            loadingSpinnerRef.current?.show?.();
            const projName =
                cleanStr(infoRawData?.projectname) ||
                sessionStorage.getItem("projectname") ||
                "";
            await downloadAnalysisExcel(projectnum, currentQnum, userId, projName);
        } catch (err) {
            modalRef.current?.showErrorAlert?.(
                "에러",
                err?.message || "엑셀 다운로드 중 오류가 발생했습니다."
            );
        } finally {
            loadingSpinnerRef.current?.hide?.();
        }
    };

    const handleClickExcelUpload = () => {
        if (project_lock === "수정불가") return;
        modalRef.current?.showConfirm?.("알림", "엑셀 업로드 데이터를 대체 하시겠습니까?", {
            btns: [
                { title: "취소" },
                {
                    title: "확인",
                    click: () => {
                        if (excelFileInputRef.current) {
                            excelFileInputRef.current.value = "";
                            excelFileInputRef.current.click();
                        }
                    },
                },
            ],
        });
    };

    const handleExcelFileSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            loadingSpinnerRef.current?.show?.();
            const res = await uploadAnalysisExcel(file, projectnum, currentQnum);

            if (String(res?.success) === "777" || res?.ok === true) {
                await refreshAnalysisDatasets();
                setTabDivision("1");
                modalRef.current?.showAlert?.("알림", "엑셀 업로드가 완료되었습니다.");
            } else if (String(res?.success) === "761") {
                const errs = Array.isArray(res?.resultjson)
                    ? res.resultjson
                    : Array.isArray(res?.errors)
                      ? res.errors
                      : [];
                setExcelErrorList(errs);
                setExcelErrorPopupShow(true);
            } else {
                modalRef.current?.showErrorAlert?.(
                    "에러",
                    res?.message || "업로드 중 문제가 발생했습니다."
                );
            }
        } catch (err) {
            modalRef.current?.showErrorAlert?.(
                "에러",
                err?.message || "엑셀 업로드 요청 중 오류가 발생했습니다."
            );
        } finally {
            loadingSpinnerRef.current?.hide?.();
        }
    };

    const handleApplyExcelPreviewCodes = useCallback(
        (nextCodes) => {
            setCodes(nextCodes);
            markUnsaved("2", true);
            const mapByCode = new Map();
            (nextCodes || []).forEach((c) => {
                const k = cleanStr(c.lv123code ?? c.code_num);
                if (k) mapByCode.set(k, c);
            });
            setResponses((prev) =>
                (prev || []).map((r) => {
                    const rc = cleanStr(r.lv123code);
                    if (!rc || !mapByCode.has(rc)) return r;
                    const m = mapByCode.get(rc);
                    return {
                        ...r,
                        lv1: cleanStr(m.lv1),
                        lv1code: cleanStr(m.lv1code),
                        lv2: cleanStr(m.lv2),
                        lv2code: cleanStr(m.lv2code),
                        lv3: cleanStr(m.lv3),
                        _edited: true,
                    };
                })
            );
            modalRef.current?.showAlert?.(
                "알림",
                "엑셀 보기 데이터가 반영되었습니다.\n우측 상단 [저장] 버튼을 눌러 DB에 반영해 주세요."
            );
        },
        [markUnsaved]
    );

    // [저장] 버튼 -> 무결성 검사 -> DB 비교 모달 오픈
    const handleOpenSaveModal = useCallback(() => {
        if (project_lock === "수정불가") return;

        const activeCodes = (codes || []).filter((c) => !c?.__pendingDelete);
        for (let i = 0; i < activeCodes.length; i++) {
            const item = activeCodes[i];
            if (!cleanStr(item.lv123code ?? item.code_num) || !cleanStr(item.lv3)) {
                modalRef.current?.showErrorAlert?.(
                    "알림",
                    `보기 목록 ${i + 1}번째 행의 소코드와 소분류명은 필수입니다.`
                );
                return;
            }
        }

        const consistency = validateCodeLabelConsistency(activeCodes);
        if (!consistency.valid) {
            modalRef.current?.showErrorAlert?.("무결성 오류", consistency.message);
            return;
        }

        setSaveCompareOpen(true);
    }, [codes, project_lock]);

    // 3단계 순차 저장 실행
    const handleExecuteSave = useCallback(
        async ({
            duplicateRemove,
            saveWithUncoded,
            fallbackCode,
            fallbackLabel,
            skipPostRefreshAndAlert = false,
        }) => {
            if (isExecutingSave) return false;
            setIsExecutingSave(true);
            loadingSpinnerRef.current?.show?.();

            try {
                const levelMode = String(lvCode || "3");
                const now = formatNow();

                const activeCodes = (codes || []).filter((c) => !c?.__pendingDelete);
                const matchedFallbackObj = activeCodes.find(
                    (c) => cleanStr(c.lv123code ?? c.code_num) === fallbackCode
                );
                const codeExists = Boolean(matchedFallbackObj);
                const finalCodesRaw =
                    saveWithUncoded && fallbackCode && !codeExists
                        ? [
                            ...activeCodes,
                            {
                                qnum: currentQnum,
                                lv1: "",
                                lv1code: "",
                                lv2: "",
                                lv2code: "",
                                lv3: fallbackLabel,
                                lv123code: fallbackCode,
                                ex_gubun: "분석(수정가능)",
                            },
                        ]
                        : activeCodes;

                const cleanedCodes = finalCodesRaw.map((r) => ({
                    lv1: cleanStr(r.lv1),
                    lv2: cleanStr(r.lv2),
                    lv3: cleanStr(r.lv3),
                    qnum: String(currentQnum || ""),
                    lv1code: cleanStr(r.lv1code),
                    lv2code: cleanStr(r.lv2code),
                    lv321code: cleanStr(r.lv321code),
                    summary: cleanStr(r.summary),
                    ex_gubun: String(r.ex_gubun || "분석(수정가능)"),
                    is_lock: Boolean(r.is_lock),
                    lv23code: cleanStr(r.lv23code),
                    lv123code: cleanStr(r.lv123code ?? r.code_num),
                    representative_response: cleanStr(r.representative_response),
                }));

                const activeResponses = (responses || []).filter((r) => !r?.__pendingDelete);
                const payloadResponses = activeResponses.map((r) => {
                    const rawCode = cleanStr(r.lv123code ?? r.code_num);
                    const useFallback = saveWithUncoded && !rawCode;
                    const finalCode = useFallback ? fallbackCode : rawCode;
                    const finalLv3 = useFallback
                        ? cleanStr(matchedFallbackObj?.lv3) || fallbackLabel
                        : cleanStr(r.lv3);
                    const finalLv1 = useFallback
                        ? cleanStr(matchedFallbackObj?.lv1)
                        : cleanStr(r.lv1);
                    const finalLv1Code = useFallback
                        ? cleanStr(matchedFallbackObj?.lv1code)
                        : cleanStr(r.lv1code);
                    const finalLv2 = useFallback
                        ? cleanStr(matchedFallbackObj?.lv2)
                        : cleanStr(r.lv2);
                    const finalLv2Code = useFallback
                        ? cleanStr(matchedFallbackObj?.lv2code)
                        : cleanStr(r.lv2code);
                    const isVerified =
                        String(r.recheckyn ?? "").toLowerCase() === "y" || Boolean(r.selected);

                    const { __pendingDelete, inEdit, __isNew, _edited, _uid, __rowKey, ...rest } =
                        r;
                    return {
                        ...rest,
                        cid: Number(r.cid) || 1,
                        fixed_key: String(r.fixed_key ?? ""),
                        lv1: finalLv1,
                        lv1code: finalLv1Code,
                        lv2: finalLv2,
                        lv2code: finalLv2Code,
                        lv3: finalLv3,
                        lv3code: finalCode,
                        lv123code: finalCode,
                        sentiment: cleanStr(r.sentiment),
                        excerpts: String(r.excerpts ?? ""),
                        recheckyn: isVerified ? "y" : "",
                        answer_fin: String(r.answer_fin ?? r.answer ?? ""),
                        update_date: now,
                    };
                });

                const infoItem = {
                    apikeyid: String(settings?.apikeyid || ""),
                    apikey: String(settings?.apikey || ""),
                    data_type: "DB",
                    projectnum: String(projectnum || ""),
                    result_lang: String(settings?.result_lang || "Korean"),
                    select_rows: "",
                    model_select: String(settings?.model_select || ""),
                    open_item_lv1: String(settings?.open_item_lv1 || "0~50"),
                    open_item_lv2: String(settings?.open_item_lv2 || "0"),
                    open_item_lv3: String(settings?.open_item_lv3 || "0"),
                    prompt_string: String(settings?.prompt_string || ""),
                    keyword_string: String(settings?.keyword_string || settings?.question_fin || ""),
                    question_fin: String(settings?.question_fin || ""),
                    select_column_id: "pid",
                    select_column_title: String(currentQnum || ""),
                    temperature: Number.isFinite(Number(settings?.temperature))
                        ? Number(settings.temperature)
                        : 0.2,
                    lvcode: levelMode,
                    prompt_string_ex_backup: settings?.prompt_string_ex_backup ?? {},
                    prompt_string_res_backup: settings?.prompt_string_res_backup ?? {},
                };

                // 1단계: 문항 설정 저장
                const infoRes = await saveAnalysisInfo(projectnum, currentQnum, infoItem, userId);
                const infoOk =
                    infoRes?.ok === true ||
                    String(infoRes?.success) === "777" ||
                    String(infoRes?.success) === "200";
                if (!infoOk) {
                    modalRef.current?.showErrorAlert?.(
                        String(infoRes?.success || infoRes?.status || "ERR"),
                        infoRes?.message ||
                        infoRes?.Message ||
                        "문항 분석 설정 저장 중 오류가 발생했습니다."
                    );
                    return false;
                }

                // 2단계: 보기 목록 저장
                const codeRes = await saveAnalysisCodes(
                    projectnum,
                    currentQnum,
                    cleanedCodes,
                    userId,
                    levelMode
                );
                const codeOk =
                    codeRes?.ok === true ||
                    String(codeRes?.success) === "777" ||
                    String(codeRes?.success) === "200";
                if (!codeOk) {
                    modalRef.current?.showErrorAlert?.(
                        "에러",
                        codeRes?.message ||
                        codeRes?.Message ||
                        "보기 목록 저장에 실패하여 응답 저장을 중단했습니다."
                    );
                    return false;
                }

                // 3단계: 응답 목록 및 중복코드 제거 저장
                const respRes = await saveAnalysisResponses(
                    projectnum,
                    currentQnum,
                    duplicateRemove ? "y" : "n",
                    payloadResponses,
                    userId,
                    levelMode
                );
                const respOk =
                    respRes?.ok === true ||
                    String(respRes?.success) === "777" ||
                    String(respRes?.success) === "200";
                if (!respOk) {
                    modalRef.current?.showErrorAlert?.(
                        "에러",
                        respRes?.message ||
                        respRes?.Message ||
                        "응답 데이터 저장 중 오류가 발생했습니다."
                    );
                    return false;
                }

                setDuplicateAnswerChecked(Boolean(duplicateRemove));
                setDuplicateRemoveDate(duplicateRemove ? now : "");
                setLvCodeCommitted(levelMode);
                setSaveCompareOpen(false);

                if (!skipPostRefreshAndAlert) {
                    await refreshAnalysisDatasets();
                    modalRef.current?.showAlert?.("알림", "데이터가 성공적으로 저장되었습니다.");
                }
                return true;
            } catch (err) {
                console.error("[OptionSettingBody] 저장 오류:", err);
                modalRef.current?.showErrorAlert?.("에러", "저장 처리 중 오류가 발생했습니다.");
                return false;
            } finally {
                setIsExecutingSave(false);
                loadingSpinnerRef.current?.hide?.();
            }
        },
        [
            codes,
            currentQnum,
            isExecutingSave,
            lvCode,
            projectnum,
            refreshAnalysisDatasets,
            responses,
            settings,
            userId,
        ]
    );

    executeSaveRef.current = handleExecuteSave;

    const activeRespCount = useMemo(
        () => (responses || []).filter((r) => !r?.__pendingDelete).length,
        [responses]
    );
    const activeCodesCount = useMemo(
        () => (codes || []).filter((c) => !c?.__pendingDelete).length,
        [codes]
    );

    const handleTab1Unsaved = useCallback((v) => markUnsaved("1", v), [markUnsaved]);
    const handleTab2Unsaved = useCallback((v) => markUnsaved("2", v), [markUnsaved]);

    // 헤더용 간략·흐릿 분석 설정 요약 데이터
    const headerModelText = cleanStr(settings?._modelLabel || settings?.model_select) || "-";
    const headerLangFullText =
        cleanStr(settings?._langLabel || settings?.result_lang) || "한국어 (Korean)";
    const headerLangShortText =
        headerLangFullText.replace(/\s*\([^)]*\)\s*/g, "").trim() || headerLangFullText;
    const headerTempNum = Number.isFinite(Number(settings?.temperature))
        ? Number(settings.temperature)
        : 0.2;
    const headerTempText = headerTempNum.toFixed(1);
    const headerLv3Text = cleanStr(settings?.open_item_lv3) || "0";
    const headerLv2Text = cleanStr(settings?.open_item_lv2) || "0";
    const headerLv1Text = cleanStr(settings?.open_item_lv1) || "0~50";
    const headerPromptRaw = cleanStr(settings?.prompt_string);
    const headerHasPrompt = Boolean(settings?._hasPrompt || headerPromptRaw);
    const headerPromptPreview =
        headerPromptRaw.length > 60 ? `${headerPromptRaw.slice(0, 60)}…` : headerPromptRaw;

    return (
        <div className="ai-page-container osa-root">
            <input
                ref={excelFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={handleExcelFileSelected}
            />

            {/* 1. 설문온 공통 페이지 헤더 (AiDataHeader · 문항 목록과 동일한 타이틀/툴팁 규격) */}
            <AiDataHeader
                title="분석"
                tooltip={
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: "4px", color: "#0f172a" }}>
                            AI오픈 문항 분석
                        </div>
                        <div>• 응답자 코드 펀칭·다중 선택 매핑 및 보기 코드북 통합 관리 화면</div>
                        <div>• 우측 상단 [저장] 클릭 시 DB 비교 검증 후 반영됩니다.</div>
                    </div>
                }
                leftContent={
                    <>
                        <div className="osa-header-divider" />

                        {/* 문항 좌/우 전환 네비게이터 */}
                        <div className="osa-qnav" onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                className="osa-icon-btn"
                                title="이전 문항"
                                disabled={currentQIndex <= 0}
                                onClick={() => {
                                    if (currentQIndex > 0) {
                                        switchQuestionTo(questionList[currentQIndex - 1]?._navKey);
                                    }
                                }}
                            >
                                <ChevronLeft size={15} />
                            </button>

                            <OsaQuestionNavSelect
                                questionList={questionList}
                                currentQIndex={currentQIndex}
                                currentDisplayNum={currentDisplayNum}
                                currentQTitle={currentQTitle}
                                currentQnum={currentQnum}
                                onSelectQuestion={switchQuestionTo}
                            />

                            <button
                                type="button"
                                className="osa-icon-btn"
                                title="다음 문항"
                                disabled={
                                    questionList.length === 0 ||
                                    currentQIndex === -1 ||
                                    currentQIndex >= questionList.length - 1
                                }
                                onClick={() => {
                                    if (
                                        currentQIndex >= 0 &&
                                        currentQIndex < questionList.length - 1
                                    ) {
                                        switchQuestionTo(questionList[currentQIndex + 1]?._navKey);
                                    }
                                }}
                            >
                                <ChevronRight size={15} />
                            </button>

                            {questionList.length > 0 && currentQIndex >= 0 && (
                                <span className="osa-qpos">
                                    {currentQIndex + 1} / {questionList.length}
                                </span>
                            )}

                            {/* 분석 화면 내 문항 삭제 버튼 비노출 (문항 목록에서 관리) */}
                            {/* {userPerm === 2 && project_lock !== "수정불가" && (
                                <button
                                    type="button"
                                    className="osa-qnav-del-btn"
                                    title="현재 문항 전체를 프로젝트에서 삭제합니다"
                                    onClick={() => infoRef.current?.deleteQuestion?.()}
                                >
                                    <Trash2 size={13} />
                                    <span>문항 삭제</span>
                                </button>
                            )} */}
                        </div>

                        <div className="osa-header-divider" />

                        {/* 분석 설정 통합 캡슐 바 (⚙ 분석 설정 | 간략 요약 ▾) */}
                        <button
                            type="button"
                            className={`osa-header-settings-pill ${settingsExpanded ? "active" : ""}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSettingsExpanded((v) => !v);
                            }}
                            aria-label="분석 설정 열기/닫기"
                            aria-expanded={settingsExpanded}
                            title={`분석 설정 (${settingsExpanded ? "클릭하여 닫기" : "클릭하여 열기"})\n• 모델: ${headerModelText}\n• 언어: ${headerLangFullText}\n• 창의성: ${headerTempText}\n• 분류 수: 대 ${headerLv3Text} · 중 ${headerLv2Text} · 소 ${headerLv1Text}${headerHasPrompt ? `\n• 추가 지침: ${headerPromptPreview || "적용됨"}` : ""}`}
                        >
                            <span className="osa-hset-head">
                                <Settings size={14} className="osa-hset-gear" />
                                <span>분석 설정</span>
                            </span>
                            <span className="osa-hset-divider" aria-hidden="true" />
                            <span className="osa-hset-text">
                                <span className="osa-hset-model">{headerModelText}</span>
                                <i className="osa-hmeta-sep">·</i>
                                <span>{headerLangShortText}</span>
                                <i className="osa-hmeta-sep">·</i>
                                <span>창의성 {headerTempText}</span>
                                <i className="osa-hmeta-sep">·</i>
                                <span>
                                    대{headerLv3Text}·중{headerLv2Text}·소{headerLv1Text}
                                </span>
                            </span>
                            {headerHasPrompt && (
                                <span className="osa-hmeta-prompt-badge">+지침</span>
                            )}
                            <ChevronDown size={13} className="osa-hset-chevron" />
                        </button>
                    </>
                }
            >
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {/* 현재 문항 중복코드 제거 적용 여부 상태 배지 */}
                    <span
                        className={`osa-dup-status-badge ${duplicateAnswerChecked ? "applied" : "unapplied"
                            }`}
                        title={
                            duplicateAnswerChecked
                                ? `DB 중복코드 제거 적용 상태${duplicateRemoveDate
                                    ? `\n최근 적용 일시: ${String(duplicateRemoveDate).replace("T", " ").slice(0, 19)}`
                                    : ""
                                }\n([저장] 클릭 시 중복코드 제거/유지 설정 변경 가능)`
                                : `DB 중복코드 미제거(유지) 상태\n([저장] 클릭 시 중복코드 제거 적용 가능)`
                        }
                    >
                        {duplicateAnswerChecked ? (
                            <>
                                <Check size={12} strokeWidth={2.8} />
                                <span>중복코드 제거됨</span>
                            </>
                        ) : (
                            <>
                                <span className="osa-dup-status-dot" aria-hidden="true" />
                                <span>중복코드 미제거</span>
                            </>
                        )}
                    </span>

                    <div className="osa-header-divider" />

                    {/* 분류단계 설정 (응답·보기 데이터 탭에서만 수정 가능, PID별 데이터 탭은 조회 전용) */}
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12.5px",
                                fontWeight: 600,
                                color: "#475569",
                                whiteSpace: "nowrap",
                            }}
                        >
                            분류단계
                            <span
                                className="info-icon"
                                style={{ marginLeft: 0 }}
                                data-tooltip={`단계설정|1단계(소분류), 2단계(중분류), 3단계(대분류) 선택하여 해당 분류까지 표출 및 분석\n(응답·보기 데이터 탭에서 변경 가능하며, 보기분석은 "분석 설정"의 분류 개수 설정에 따라 진행)`}
                            />
                        </span>
                        <OsaDropDown
                            size="stage"
                            className="osa-kendo-ddl-header-stage"
                            options={STAGE_OPTIONS}
                            value={String(lvCode)}
                            disabled={project_lock === "수정불가" || tabDivision === "3"}
                            title={
                                tabDivision === "3"
                                    ? "PID별 데이터 탭에서는 분류단계를 조회만 할 수 있습니다."
                                    : undefined
                            }
                            onValueChange={setLvCode}
                        />
                    </div>

                    <div className="osa-header-divider" />

                    <button
                        type="button"
                        className="osa-icon-btn"
                        onClick={() => setReloadTrigger((n) => n + 1)}
                        title="현재 문항 데이터 새로고침"
                    >
                        <RefreshCw size={15} />
                    </button>

                    {project_lock !== "수정불가" && tabDivision !== "3" && (
                        <button
                            type="button"
                            className="osa-icon-btn"
                            style={{ width: "34px" }}
                            onClick={handleClickExcelUpload}
                            title="통합 엑셀 업로드 (응답자 코딩 · 보기항목 일괄 반영)"
                            aria-label="통합 엑셀 업로드"
                        >
                            <ExcelUploadIcon />
                        </button>
                    )}

                    <button
                        type="button"
                        className="osa-icon-btn"
                        style={{ width: "34px" }}
                        onClick={handleExcelDownload}
                        title="통합 엑셀 다운로드 (응답 데이터 · 보기 데이터 · rawdata)"
                        aria-label="통합 엑셀 다운로드"
                    >
                        <ExcelDownloadIcon />
                    </button>

                    {project_lock !== "수정불가" && tabDivision !== "3" && (
                        <>
                            <div className="osa-header-divider" />

                            {hasAnyUnsaved && (
                                <span
                                    className="osa-unsaved-dot"
                                    title="저장하지 않은 변경사항이 있습니다."
                                >
                                    <span className="osa-unsaved-indicator" aria-hidden="true" />
                                    <span>미저장</span>
                                </span>
                            )}

                            <GridHeaderBtnPrimary
                                disabled={isExecutingSave || isWorkerBusy}
                                onClick={handleOpenSaveModal}
                                style={{
                                    height: "32px",
                                    minWidth: "74px",
                                    justifyContent: "center",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    padding: "0 14px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}
                            >
                                저장
                            </GridHeaderBtnPrimary>
                        </>
                    )}
                </div>
            </AiDataHeader>

            {/* 톱니바퀴 클릭 시 헤더 바로 아래 펼쳐지는 분석 설정 상세 패널 슬롯 */}
            <div ref={setHeaderDrawerNode} className="osa-header-drawer-slot" />

            <div className="osa-body-wrap">
                <div className="osa-unified-card">
                    {/* 2. 상단 탭 전환(응답·보기·PID별) + AI 실행 버튼 바 + 플로팅 로그 */}
                    <OptionSettingInfo
                        ref={infoRef}
                        projectnum={projectnum}
                        qnum={currentQnum}
                        displayQnum={currentDisplayNum}
                        qTitle={currentQTitle}
                        userPerm={userPerm}
                        project_lock={project_lock}
                        tabDivision={tabDivision}
                        codes={codes}
                        responseCount={codedResponseCount}
                        infoRawData={infoRawData}
                        onSettingsChange={setSettings}
                        onQidLoaded={setQid}
                        onDuplicateRemoveDateLoaded={handleDuplicateRemoveDateLoaded}
                        onNavigateTab={(t) => setTabDivision(String(t))}
                        onWorkerCompleted={refreshAnalysisDatasets}
                        onBusyChange={setIsWorkerBusy}
                        expanded={settingsExpanded}
                        onExpandedChange={setSettingsExpanded}
                        drawerMountNode={headerDrawerNode}
                        leftSlot={
                            <div className="osa-seg-tabs">
                                <button
                                    type="button"
                                    className={`osa-seg-tab ${tabDivision === "1" ? "active" : ""}`}
                                    onClick={() => trySwitchTab("1")}
                                >
                                    <span>응답 데이터</span>
                                    <span className="osa-seg-count">
                                        {activeRespCount.toLocaleString()}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`osa-seg-tab ${tabDivision === "2" ? "active" : ""}`}
                                    onClick={() => trySwitchTab("2")}
                                >
                                    <span>보기 데이터</span>
                                    <span className="osa-seg-count">
                                        {activeCodesCount.toLocaleString()}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`osa-seg-tab ${tabDivision === "3" ? "active" : ""}`}
                                    onClick={() => trySwitchTab("3")}
                                >
                                    <span>PID별 데이터</span>
                                    <span className="osa-seg-count">
                                        {rawdata.length.toLocaleString()}
                                    </span>
                                </button>
                            </div>
                        }
                    />

                    {/* 3. 메인 스플릿 워크스페이스 (상단 탭 바와 하나로 통합) */}
                    <div
                        ref={workspaceRef}
                        className={`osa-workspace ${tabDivision === "1" && !isRightPanelCollapsed ? "has-splitter" : ""
                            }`}
                    >
                        <div className="osa-main-card">
                            {/* 활성 탭 컨텐츠 */}
                            {tabDivision === "1" ? (
                                <OptionSettingTab1
                                    ref={tab1Ref}
                                    lvCode={lvCode}
                                    onChangeLvCode={setLvCode}
                                    responses={responses}
                                    setResponses={setResponses}
                                    codes={codes}
                                    selectedRowKeys={selectedResponseKeys}
                                    setSelectedRowKeys={setSelectedResponseKeys}
                                    onUnsavedChange={handleTab1Unsaved}
                                    onResponseCountChange={setCodedResponseCount}
                                    isRightPanelCollapsed={isRightPanelCollapsed}
                                    project_lock={project_lock}
                                />
                            ) : tabDivision === "2" ? (
                                <OptionSettingTab2
                                    ref={tab2Ref}
                                    lvCode={lvCode}
                                    onChangeLvCode={setLvCode}
                                    codes={codes}
                                    setCodes={setCodes}
                                    responses={responses}
                                    setResponses={setResponses}
                                    onUnsavedChange={handleTab2Unsaved}
                                    onOpenImportModal={() => setImportModalOpen(true)}
                                    qnum={currentQnum}
                                    project_lock={project_lock}
                                />
                            ) : (
                                <OptionSettingTab3
                                    lvCode={lvCode}
                                    onChangeLvCode={setLvCode}
                                    rawdata={rawdata}
                                    onRefreshRawdata={handleRefreshRawdata}
                                    project_lock={project_lock}
                                />
                            )}
                        </div>

                        {/* 좌/우 영역 넓이 조절 스플리터 바 */}
                        {tabDivision === "1" && !isRightPanelCollapsed && (
                            <div
                                role="separator"
                                aria-orientation="vertical"
                                aria-label="응답 데이터 · 보기 선택 영역 넓이 조절"
                                className={`osa-panel-splitter ${isSplitterDragging ? "dragging" : ""}`}
                                title="좌우로 드래그하여 넓이 조절 (더블클릭 시 기본 비율로 초기화)"
                                onMouseDown={handleSplitterMouseDown}
                                onDoubleClick={() => setRightPanelWidth(null)}
                            >
                                <span className="osa-panel-splitter-bar" aria-hidden="true">
                                    <span className="osa-panel-splitter-grip" />
                                </span>
                            </div>
                        )}

                        {/* 우측 [⊞ 보기 선택 · 편집] 패널 (응답 데이터 탭 활성 시 표시) */}
                        {tabDivision === "1" && (
                            <OptionSettingLv3Panel
                                collapsed={isRightPanelCollapsed}
                                onToggleCollapse={() => setIsRightPanelCollapsed((v) => !v)}
                                customWidth={rightPanelWidth}
                                lvCode={lvCode}
                                codes={codes}
                                responses={responses}
                                selectedResponseKeys={selectedResponseKeys}
                                onMapCodeToSelected={handleMapCodeToSelected}
                                onUnmapCodeFromSelected={handleUnmapCodeFromSelected}
                                onEditCodeField={handleRightPanelEditCode}
                                onAddNewCode={handleRightPanelAddCode}
                                onDeleteCodeRow={handleRightPanelDeleteCode}
                                project_lock={project_lock}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* 엑셀 업로드 미리보기 모달 */}
            <OptionSettingExcelPreviewModal
                show={excelPreviewOpen}
                onClose={() => setExcelPreviewOpen(false)}
                previewData={excelPreviewData}
                existingCodes={codes}
                qnum={currentQnum}
                displayQnum={currentDisplayNum}
                qTitle={currentQTitle}
                onApplyCodes={handleApplyExcelPreviewCodes}
            />

            {/* 엑셀 업로드 오류 코딩 결과 팝업 (레거시 761 보기/응답자 오류 표시) */}
            <OptionSettingExcelUploadErrorPopup
                popupShow={excelErrorPopupShow}
                onClose={() => setExcelErrorPopupShow(false)}
                errorList={excelErrorList}
                projectnum={projectnum}
                qnum={currentQnum}
                displayQnum={currentDisplayNum}
                qTitle={currentQTitle}
            />

            {/* 타 프로젝트/문항 보기 불러오기 모달 */}
            <OptionSettingImportModal
                show={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                projectnum={projectnum}
                qnum={currentQnum}
                displayQnum={currentDisplayNum}
                qTitle={currentQTitle}
                existingCodes={codes}
                user={userId}
                onApplied={async () => {
                    const codesRes = await getAnalysisCodes(projectnum, currentQnum);
                    const freshCodes = normalizeCodeRows(extractList(codesRes), currentQnum);
                    committedCodesRef.current = freshCodes;
                    setCodes(freshCodes);
                    tab2Ref.current?.resetBaseline?.(freshCodes);
                }}
            />

            {/* DB 저장 전 반영 비교 · 중복코드 제거 시뮬레이션 모달 */}
            <OptionSettingSaveCompareModal
                show={saveCompareOpen}
                onClose={() => setSaveCompareOpen(false)}
                projectnum={projectnum}
                qnum={currentQnum}
                displayQnum={currentDisplayNum}
                qTitle={currentQTitle}
                user={userId}
                responses={responses}
                codes={codes}
                rawdata={rawdata}
                codesCount={activeCodesCount}
                initialDuplicateRemove={duplicateAnswerChecked}
                infoRawData={infoRawData}
                saving={isExecutingSave}
                onExecuteSave={handleExecuteSave}
            />
        </div>
    );
};

export default OptionSettingBody;
