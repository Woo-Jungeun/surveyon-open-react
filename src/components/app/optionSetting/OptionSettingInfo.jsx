import React, { Fragment, useState, useEffect, useContext, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@progress/kendo-react-buttons";
import CustomDropDownList from "@/components/kendo/CustomDropDownList.jsx";
import OptionSettingPopup from "@/components/app/optionSetting/OptionSettingPopup";    // 기존 프롬프트 내용 팝업
import { Input } from "@progress/kendo-react-inputs";
import { TextArea, Slider } from "@progress/kendo-react-inputs";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";
import "@/components/app/optionSetting/OptionSetting.css";
import { modalContext } from "@/components/common/Modal.jsx";
import useWorkerLogSignalR from "@/hooks/useWorkerLogSignalR";
import { HUB_URL, HUB_NAME } from "@/config/signalr/signalr.js";
import { loadingSpinnerContext } from "@/components/common/AnalysisLoadingSpinner.jsx";
import { useSelector } from "react-redux";
/**
 * 분석 > 정보 영역
 *
 * @author jewoo
 * @since 2025-08-19<br />
*/

// 버튼 정의
const ACTION_LABEL = {
    translateResponse: "번역",
    classified: "보기분석",
    response: "응답자분석(NEW)",
    recallResponse: "응답자 빈셀&기타",
};
const MODAL_SCOPE = {
    visibleOn: "/option_setting",
    autoCloseOnRouteChange: true,
    // zIndex: 2000, // 필요하면 추가
};

/*섹션 영역 */
const Section = ({ id, title, first, open, onToggle, headerAddon, children }) => (
    <div className={`leftInfo ${open ? "on" : ""}`}>
        <div className={`infoTitRow ${first ? "brdTopN" : ""}`}>
            {/* 제목: 자체 케럿 제거(no-caret) */}
            <button
                type="button"
                className="infoTit no-caret"
                aria-expanded={open}
                aria-controls={id}
                onClick={onToggle}
            >
                {title}
            </button>

            {/* 제목 오른쪽(케럿 왼쪽)에 넣을 추가 버튼 영역 */}
            {headerAddon ? <div className="infoTitAddon">{headerAddon}</div> : null}

            {/* 맨 오른쪽 토글 아이콘*/}
            <button
                type="button"
                className={`infoCaret ${open ? "on" : ""}`}
                aria-label={open ? "접기" : "펼치기"}
                onClick={onToggle}
            />
        </div>

        {open && (
            <div id={id} className="infoList">
                {children}
            </div>
        )}
    </div>
);

const OptionSettingInfo = ({ isOpen, onToggle, showEmptyEtcBtn, onNavigateTab, projectnum, qnum, userPerm, lv3Options, responseCount, fetchLv3Options }) => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const navigate = useNavigate();
    const completedOnceRef = useRef(false); // 분석 결과 끝난 ref
    const logTextRef = useRef("");   // 최신 로그 문자열 저장용
    // 로그 안정성 체크용 ref
    const lineCountRef = useRef(0);   // 마지막 라인 수
    const lastStableRef = useRef(0);  // 연속 안정 횟수
    const [data, setData] = useState({}); //데이터 
    const [qid, setQid] = useState(""); //qid 
    // qid를 ref로도 저장하여 재렌더/언마운트 시에도 유지
    const qidRef = useRef("");
    useEffect(() => {
        qidRef.current = qid;
    }, [qid]);
    const { optionEditData, optionSaveData, optionAnalysisStart, optionAnalysisStatus, optionStatus } = OptionSettingApi();
    const activeJobRef = useRef(null);                  // ← 현재 진행중 job 기억
    const nextTabRef = useRef(null);    //탭 이동
    // 유틸: 짧게 기다리기
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

    // 유틸: 로그 라인 수/문자 수 계산
    const getLogMetrics = (s) => ({
        lines: String(s ?? "").split("\n").length,
        chars: String(s ?? "").length,
    });

    const setAnalyzing = useCallback((on) => {
        if (!loadingSpinner) return;
        on ? loadingSpinner.show() : loadingSpinner.hide();
    }, [loadingSpinner]);

    // 최종 완료 처리 (팝업, 로딩 off, 탭 이동)
    const finalizeCompletion = useCallback((hasError) => {
        if (completedOnceRef.current) return;  // 중복 방지
        completedOnceRef.current = true;

        setAnalyzing(false);
        activeJobRef.current = null;

        if (hasError) {
            modal.showErrorAlert("에러", "분석 중 오류가 발생했습니다.", MODAL_SCOPE);
        } else {
            modal.showConfirm("알림", "분석이 완료되었습니다.", MODAL_SCOPE, {
                btns: [
                    {
                        title: "확인",
                        click: async () => {
                            try {
                                //상태 확인 했다는 API 태움 
                                await optionEditData.mutateAsync({
                                    params: {
                                        user: auth?.user?.userId || "",
                                        projectnum, qnum,
                                        gb: "popupcheck",
                                        checkyn: 1
                                    },
                                });
                            } catch {
                            }

                            // 소분류 리스트 재조회 추가
                            try {
                                await fetchLv3Options?.();
                            } catch (err) {
                                console.warn("lb 재조회 실패", err);
                            }

                            // 탭 이동
                            if (nextTabRef.current) {
                                onNavigateTab?.(nextTabRef.current);
                                nextTabRef.current = null;
                            }
                        },
                    },
                ],
            });
        }
    }, [modal, onNavigateTab, setAnalyzing]);


    // status 호출용
    const buildStatusPayload = (job) => {
        const qidValue = qidRef.current || qid;
        // 필수값/잡키 없으면 status 치지 않음
        if (!projectnum || !qidValue || !job) return null;

        return {
            user: auth?.user?.userId || "",
            projectnum,
            qid: qidValue,
            action: "status",
            job: String(job),
        };
    };

    // SignalR 완료 콜백 직후, 
    // 상태 API와 현재 로그 스냅샷(라인 수)을 짧은 간격으로 몇 차례 확인해(연속 안정 2회) 
    // 실제 로그 유입이 멈췄을 때만 최종 완료 처리(모달/로딩 off)하는 함수
    const confirmEndByStatusAndSnapshot = useCallback(
        async ({ interval = 1000, hasError = false, job }) => {
            const startTime = Date.now();
            const TIMEOUT_MS = 15 * 60 * 1000; // 최대 15분 기다림
            const CHECK_INTERVAL = interval;  // 1초 단위로 polling

            while (true) {
                // 타임아웃 보호
                if (Date.now() - startTime > TIMEOUT_MS) {
                    console.warn("[StatusCheck] 15분 경과 → 강제 중단");
                    finalizeCompletion(false);
                    break;
                }

                try {
                    const payload = buildStatusPayload(job || activeJobRef.current);
                    if (!payload) {
                        await sleep(CHECK_INTERVAL);
                        continue;
                    }

                    const statusRes = await optionAnalysisStatus.mutateAsync(payload);
                    const out = String(statusRes?.output || "");

                    // 완료 조건 1: 서버 플래그
                    if (statusRes?.IsCompleted === true) {
                        // console.log("[StatusCheck] IsCompleted = true → 완료");
                        // finalizeCompletion(statusRes?.HasError === true); todo 추후 다시 확인인
                        finalizeCompletion(false);
                        break;
                    }

                    // 완료 조건 2: 로그에 <eof> 포함
                    //   if (out.includes("<eof>")) {
                    //     console.log("[StatusCheck] output에 <eof> 포함 → 완료");
                    //     finalizeCompletion(false);
                    //     break;
                    //   }

                    // 아직 미완료 → 대기 후 반복
                    await sleep(CHECK_INTERVAL);
                } catch (err) {
                    console.warn("[StatusCheck] polling error", err);
                    await sleep(CHECK_INTERVAL);
                }
            }
        },
        [optionAnalysisStatus, buildStatusPayload, finalizeCompletion]
    );

    // SignalR 훅
    const { logText, appendLog, clearLog, joinJob } = useWorkerLogSignalR({
        hubUrl: HUB_URL,      // 운영: https://son.hrc.kr/o/signalr / dev: /o/signalr
        hubName: HUB_NAME,    // 서버 허브 이름
        onCompleted: ({ hasError, jobKey }) => {
            if (completedOnceRef.current) return;
            // status 호출에 job 누락되지 않도록 보강
            const currentJob = jobKey || activeJobRef.current;
            if (currentJob) {
                activeJobRef.current = currentJob;
                confirmEndByStatusAndSnapshot({ hasError, job: currentJob });
            } else {
                console.warn("jobKey 없음 - 상태 확인 스킵");
            }
        },
    });
    // 최신 logText를 ref에 반영
    useEffect(() => {
        logTextRef.current = String(logText ?? "");
    }, [logText]);

    const initStatusCheckedRef = useRef(false);

    // 최초 진입 시 현재 분석 상태 조회
    const checkInitialStatus = useCallback(async () => {
        if (!projectnum || !qid) return; // 데이터 준비 전이면 스킵

        try {

            const payload = { user: auth?.user?.userId || "", projectnum, qid };
            const r = await optionStatus.mutateAsync(payload);
            // 팝업 오픈 필요할 경우만 
            if (String(r?.popupcheck) === "1") {
                // 상태 텍스트 파싱
                const raw = String(r?.output ?? "").trim();
                const norm = raw.replace(/\s+/g, "");      // 공백 제거
                const isRunning = /분석중/.test(norm);
                const isDone = /분석완료/.test(norm);

                // 진행 중 job 키(있으면 실시간 조인)
                const job =
                    r?.job ??
                    r?.contents?.job ??
                    r?.data?.job ??
                    r?.currentJob ??
                    null;

                // 출력 헬퍼
                const put = (s) => appendLog(s.endsWith("\n") ? s : s + "\n");
                // 분석 결과창에 출력
                if (isRunning) {
                    put("분석중입니다...");
                    setAnalyzing(true);              // 로딩바 on
                    if (job) {
                        const ok = await joinJob(job);
                        put(ok ? "== 실시간 로그 연결됨 ==\n" : "[WARN] 실시간 로그 연결 실패(상태 조회)\n");
                    }
                } else if (isDone) {
                    setAnalyzing(false);              // 로딩바 off
                    put("분석이 완료되었습니다.");
                    finalizeCompletion(false);
                }
            }
        } catch {
            appendLog("[ERR] 상태 조회 실패\n");
        }
    }, [projectnum, qid, optionStatus, appendLog, joinJob]);

    useEffect(() => {
        return () => {
            activeJobRef.current = null;
        };
    }, []); // 언마운트에서만 실행

    // 최초 진입 시 현재 분석 상태 조회
    useEffect(() => {
        if (!projectnum || !qid) return;
        if (initStatusCheckedRef.current) return;
        initStatusCheckedRef.current = true;
        checkInitialStatus();
    }, [projectnum, qid]);

    // 배열 -> 옵션으로 변환
    const toOptions = (arr) =>
        (Array.isArray(arr) ? arr : []).map(x => ({
            keyid: x.keyid,
            value: x.keyvalue, // 드롭다운의 키값
            text: x.keytext,  // 표시 텍스트
            keyselected: x.keyselected ?? "", // 토큰 그대로 보관
        }));

    // keyselected 토큰으로 선택 항목 찾기 (value -> id -> text 순 매칭)
    const pickSelected = (opts) => {
        if (!opts.length) return null;
        const token = String(opts[0].keyselected ?? ""); // 모든 항목에 같은 토큰이 들어오는 구조
        if (!token) return null;
        return (
            opts.find(o => String(o.value) === token) ||
            opts.find(o => String(o.keyid) === token) ||
            opts.find(o => String(o.text) === token) ||
            null
        );
    };

    /* 토글 on/off */
    const [openPrompt, setOpenPrompt] = useState(false);
    const [openOption, setOpenOption] = useState(false);
    const [openCounts, setOpenCounts] = useState(true);

    //  API 키 드롭다운용 옵션/선택값
    const [apiKeyOptions, setApiKeyOptions] = useState([]);
    const [apiKeyValue, setApiKeyValue] = useState("");   // 드롭다운에 바인딩할 'value'는 keyvalue (문자열)

    //  결과언어
    const [resultLangOptions, setResultLangOptions] = useState([]);
    const [resultLangValue, setResultLangValue] = useState("");

    //  모델선택
    const [modelOptions, setModelOptions] = useState([]);
    const [modelValue, setModelValue] = useState("");

    // 기존 버튼 팝업 show 
    const [previousPromptShow, setPreviousPromptShow] = useState(false);        // 기존 프롬프트 팝업 popupShow
    const [previousPromptExValue, setPreviousPromptExValue] = useState("");     // 기존 보기 프롬프트 로그 데이터
    const [previousPromptResValue, setPreviousPromptResValue] = useState("");   // 기존 응답 프롬프트 로그 데이터

    const [saving, setSaving] = useState(false); //저장 API가 진행 중인지 표시하는 플래그

    // 분류 개수 빈값인지 체크
    const orIfEmpty = (v, fallback) =>
        (v === undefined || v === null || String(v).trim() === "") ? fallback : v;

    /*창의성 조절*/
    const TEMP_MIN = 0;
    const TEMP_MAX = 1;
    const TEMP_STEP = 0.1;
    const TEMP_DEFAULT = 0.2;

    // temperature 입력(문자열/숫자)을 0~1 범위로 클램프하고 소수점 1자리로 반올림해 숫자로 반환
    const parseTemp = (v, def = TEMP_DEFAULT) => {
        const n = typeof v === "number" ? v : parseFloat(v);
        if (!Number.isFinite(n)) return def;
        // 0~1 범위로 클램프 + 소수 1자리 고정
        const clamped = Math.max(TEMP_MIN, Math.min(TEMP_MAX, n));
        return Math.round(clamped * 10) / 10;
    };

    // 옵션 상태 반영
    const applySearchResult = (d = {}) => {
        setData(prev => ({
            ...prev,
            ...d,
            temperature: parseTemp(d?.temperature),
            // 분류 개수 빈값이면 기본값
            open_item_lv1: orIfEmpty(d?.open_item_lv1, "0~50"),
            open_item_lv2: orIfEmpty(d?.open_item_lv2, "0"),
            open_item_lv3: orIfEmpty(d?.open_item_lv3, "0"),
            popupcheck: d?.popupcheck ?? "",
        }));

        setPreviousPromptExValue(d?.prompt_string_ex_backup || "");
        setPreviousPromptResValue(d?.prompt_string_res_backup || "");

        // --- apikey ---
        const apiOpts = toOptions(d?.apikey);
        setApiKeyOptions(apiOpts);
        const apiInit = pickSelected(apiOpts) || apiOpts[0];
        if (apiInit) {
            setApiKeyValue(String(apiInit.value));
            setData(prev => ({ ...prev, apikeyid: apiInit.value, apikey: apiInit.keyid }));
        }

        // --- result_lang ---
        const langOpts = toOptions(d?.result_lang);
        setResultLangOptions(langOpts);
        const langInit = pickSelected(langOpts) || langOpts[0];
        if (langInit) {
            setResultLangValue(String(langInit.value));
            setData(prev => ({ ...prev, result_lang: langInit.value }));
        }

        // --- model_select ---
        const modelOpts = toOptions(d?.model_select);
        setModelOptions(modelOpts);
        const modelInit = pickSelected(modelOpts) || modelOpts[0];
        if (modelInit) {
            setModelValue(String(modelInit.value));
            setData(prev => ({ ...prev, model_select: modelInit.value }));
        }
    };

    // 조회/재조회 공용
    const searchInfo = useCallback(async (over = {}) => {
        const res = await optionEditData.mutateAsync({
            params: { user: auth?.user?.userId || "", projectnum, qnum, gb: "info" },
        });

        const d = res?.resultjson?.[0] || {};
        setQid(prev => {
            const next = String(d?.qid || "").trim();
            return next ? next : prev;
        });
        applySearchResult(d);
        return d;
    }, [optionEditData, projectnum, qnum]);

    useEffect(() => {
        searchInfo();   // 최초 조회
    }, []);

    // 팝업에서 '선택' 눌렀을 때: textarea에 적용하고 팝업 닫기
    const handleSelectPrompt = ({ text }) => {
        setOpenPrompt(true);        // 프롬프트 섹션이 닫혀 있어도 자동으로 열기

        setData(prev => ({
            ...prev,
            prompt_string: String(text || "")
        }));
        setPreviousPromptShow(false);
    };

    // onChangeInputEvent 핸들러
    const onChangeInputEvent = (e, col) => {
        let next = e?.value ?? e?.target?.value ?? "";

        // temperature라면 숫자로 변환 후 소수점 한 자리 고정
        if (col === "temperature") next = parseTemp(next);

        setData(prev => ({
            ...prev,
            [col]: next,
        }));
    }

    // 공통 드롭다운 onChange 핸들러
    const handleDropdownChange = (key) => (e) => {
        const item = e?.value; // 선택 객체
        if (!item) return;

        switch (key) {
            case "apikey":
                setApiKeyValue(String(item.value));
                setData((prev) => ({
                    ...prev,
                    apikeyid: item.value,  // keyvalue
                    apikey: item.keyid,    // keyid
                }));
                break;

            case "result_lang":
                setResultLangValue(String(item.value));
                setData((prev) => ({
                    ...prev,
                    result_lang: item.value,
                }));
                break;

            case "model_select":
                setModelValue(String(item.value));
                setData((prev) => ({
                    ...prev,
                    model_select: item.value,
                }));
                break;

            default:
                break;
        }
    };

    useEffect(() => {
        setData(prev => {
            const v = prev?.temperature;
            return (v === undefined || v === null || v === "")
                ? { ...prev, temperature: TEMP_DEFAULT }
                : prev;
        });
    }, []);

    // payload 생성
    const buildInfoPayload = (type) => {
        // type → ev 매핑
        const typeToEv = {
            translateResponse: "1",
            classified: "2",
            response: "3",
            recallResponse: "4",
        };

        const info = {
            apikeyid: String(data?.apikeyid || ""),
            apikey: String(data?.apikey || ""),
            data_type: "DB",
            projectnum,
            result_lang: String(data?.result_lang || "Korean"),
            select_rows: "",
            model_select: String(data?.model_select || ""),
            open_item_lv1: String(data?.open_item_lv1 ?? ""),
            open_item_lv2: String(data?.open_item_lv2 ?? ""),
            open_item_lv3: String(data?.open_item_lv3 ?? ""),
            prompt_string: String(data?.prompt_string || ""),
            keyword_string: String(data?.keyword_string || ""),
            select_column_id: "pid",
            select_column_title: qnum,
            temperature: parseTemp(data?.temperature),
            prompt_string_ex_backup: data?.prompt_string_ex_backup ?? {},
            prompt_string_res_backup: data?.prompt_string_res_backup ?? {},
        };

        return {
            user: auth?.user?.userId || "",
            projectnum,
            qnum,
            gb: "info",
            data: [info],
            ev: typeToEv[type], //버튼 구분
        };
    };

    // 버튼 별 api payload 생성 
    const buildAnalysisPayload = (type) => {
        const base = {
            token: "",
            user: auth?.user?.userId || "",
            projectnum,
            qid,
            action: "start",
        };

        switch (type) {
            case "translateResponse":      // 번역
                return { ...base, translateResponse: "Y" };

            case "classified":             // 보기분석
                return { ...base, classified: "Y", opencodeCategory: "Y" };

            case "response":               // 응답자분석(NEW)
                return { ...base, response: "Y", opencodeResponse: "Y" };

            case "recallResponse":         // 응답자 기타&빈셀
                return { ...base, recallResponse: "Y" };

            default:
                return base;
        }
    };

    // 공통 버튼 실행
    const runInfoSave = async (type) => {
        /*유효성 체크 */
        if (saving) return false;
        if (!qid || !projectnum) {
            modal.showErrorAlert("알림", "문항/프로젝트 정보를 먼저 불러온 뒤 실행해 주세요.", MODAL_SCOPE);
            return false;
        }
        if (!String(data?.open_item_lv1 ?? "").trim()) {
            modal.showErrorAlert("알림", "소분류 개수를 입력하세요.", MODAL_SCOPE);
            return false;
        }
        if (!apiKeyOptions?.length || !apiKeyOptions[0]?.keyselected) {
            modal.showErrorAlert("알림", "apikey가 설정되지 않았습니다.\n설정 후 분석해주세요.", MODAL_SCOPE);
            return false;
        }

        // 새 작업 시작 시 초기화 (검증 다 통과한 후)
        completedOnceRef.current = false;
        lastStableRef.current = 0;
        lineCountRef.current = getLogMetrics(logTextRef.current).lines;

        setSaving(true);
        try {
            // 1) 옵션 정보 저장
            const payload = buildInfoPayload(type);
            const saveRes = await optionSaveData.mutateAsync(payload);
            if (saveRes?.success !== "777") {
                modal.showErrorAlert("에러", "오류가 발생했습니다.", MODAL_SCOPE); //오류 팝업 표출
                return false;
            }
            // console.log(`[INFO][${type}] saved (777)`, saveRes);

            // 저장 성공 시 서버 기준 최신값으로 재조회
            await searchInfo();

            // 2) 저장 성공 시 → 분석 API 호출
            const analysisPayload = buildAnalysisPayload(type);
            const analysisRes = await optionAnalysisStart.mutateAsync(analysisPayload);

            const ok = analysisRes?.success === "777" || analysisRes?.ok === true;
            const job = analysisRes?.job || analysisRes?.contents?.job || analysisRes?.data?.job;

            if (!ok) {
                modal.showErrorAlert("에러", "오류가 발생했습니다.", MODAL_SCOPE);
                return false;
            }

            const text = ACTION_LABEL[type] ?? type;  // 라벨 추출
            // 분석 결과창 표출
            appendLog(`== ${text} 시작 ==\n`);

            if (job) {
                // 허브 조인 + 로딩 on
                activeJobRef.current = job;
                setAnalyzing(true); // 먼저 ON
                const joined = await joinJob(job);
                if (!joined) appendLog("[WARN] 실시간 로그 연결 실패(작업은 진행 중)\n");

                // 누락 로그 보정: status 호출
                try {
                    const r = await optionAnalysisStatus.mutateAsync(buildStatusPayload(job));
                    if (r?.output) appendLog(String(r.output));
                } catch { }
            } else {
                appendLog("[INFO] job 키가 없어 실시간 로그 조인을 생략합니다.\n");
            }
            // 탭 이동 
            nextTabRef.current = (type === "classified") ? "2" : "1";

            return true;
        } catch (e) {
            modal.showErrorAlert("에러", "오류가 발생했습니다.", MODAL_SCOPE); //오류 팝업 표출
            setAnalyzing(false);      // 에러 즉시 off
            return false;
        } finally {
            setSaving(false);
        }
    };

    const logRef = useRef(null);
    // 로그가 바뀔 때(추가될 때) 바닥에 붙여 주기
    useEffect(() => {
        const el = logRef.current;
        if (!el) return;
        // 로그가 추가될 때마다 항상 맨 아래로
        el.scrollTop = el.scrollHeight;
    }, [logText]);

    // 문항 삭제 버튼 이벤트  
    const deleteQnum = async () => {
        modal.showConfirm("알림", "삭제하시면 데이터를 복구할 수 없습니다.\n해당 문항을 삭제하시겠습니까?", MODAL_SCOPE, {
            btns: [
                { title: "취소", background: "#75849a" },
                {
                    title: "확인",
                    click: async () => {
                        try {
                            const payload = {
                                params: {
                                    gb: "del_qnum",
                                    projectnum, qnum,
                                    user: auth?.user?.userId || "",
                                }
                            };
                            const res = await optionEditData.mutateAsync(payload);

                            if (res.success === "777") {
                                modal.showAlert("알림", "문항이 삭제되었습니다.");
                                navigate("/pro_list"); // 문항 목록 페이지로 이동
                            } else {
                                modal.showErrorAlert("에러", "문항이 삭제 중 오류가 발생했습니다.");
                            }
                        } catch (err) {
                        }
                    },
                },
            ],
        });
    };

    return (
        <Fragment>
            <div className="collapseBar">
                {isOpen && <div className="collapseTitle">{projectnum || "-"}</div>}
                <Button
                    type="button"
                    className="btnCollapse"
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    title={isOpen ? "왼쪽 패널 접기" : "왼쪽 패널 펼치기"}
                >
                    {isOpen ? "<<" : ">>"}
                </Button>
            </div>

            {/* 접혔을 땐 내용 숨김 */}
            {isOpen && (
                <div className="left-body">
                    <div className="mgB12">
                        {/* 문항 요약 */}
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">
                                {(qnum ? `${qnum} ` : "")}문항
                            </span>
                            <Input
                                className="k-input k-input-solid"
                                value={
                                    data?.keyword_string && data.keyword_string.trim() !== ""
                                        ? data.keyword_string
                                        : data?.question_fin || ""
                                }
                                onChange={(e) => onChangeInputEvent(e, "keyword_string")}
                            />
                        </div>
                    </div>
                    {/* 프롬프트 지침 (기존 버튼 포함) */}
                    <Section
                        id="sec-prompt"
                        title={
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                프롬프트 지침
                                <span
                                    className="info-icon"
                                    data-tooltip={`프롬프트 지침|보기분석시 추가 지침 정의
                                        \n예1. 소분류 카테고리 분류시 문구의 어조는 "~있었음", "~했음"으로 구체적인 어조로 분류해줘.
                                        예2."정책"의 단어는 제외하고 분류되게 해줘
                                        예3. 소분류 카테고리 분류시 추출된 항목문구가 더 설명이 들어간 문구로 구성해줘
                                        예4. 소분류 카테고리 분류시 추출된 항목문구가 더 설명이 들어간 문구로 구성해줘`}
                                ></span>
                            </span>
                        }
                        first
                        open={openPrompt}
                        onToggle={() => setOpenPrompt(v => !v)}
                        headerAddon={<Button className="btnMini" onClick={() => { setPreviousPromptShow(true) }}>기존</Button>}
                    >
                        <div className="promptArea">
                            <TextArea
                                className="promptBox"
                                rows={5}
                                placeholder="프롬프트 지침을 입력하세요."
                                value={data?.prompt_string || ""}
                                onChange={(e) => onChangeInputEvent(e, "prompt_string")}
                            />
                        </div>
                    </Section>

                    {/* 옵션 */}
                    <Section
                        id="sec-option"
                        title={
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                옵션
                                <span
                                    className="info-icon"
                                    data-tooltip={`옵션|결과언어 : 보기분석 후 결과 언어, 번역 시 결과 언어\n창의성 조절 : 1에 가까울수록 새로운 보기 분석을 시도한다.`}
                                ></span>
                            </span>
                        }
                        open={openOption}
                        onToggle={() => setOpenOption(v => !v)}
                    >
                        {/* <div className="cmn_pop_ipt">
                            <span className="iptTit">apikey</span>
                            <CustomDropDownList
                                data={apiKeyOptions}
                                textField="text"        // 화면 표시: keytext
                                dataItemKey="value"     // 고유키: keyvalue
                                defaultValue={apiKeyValue}     // 현재 선택값: keyvalue
                                onChange={handleDropdownChange("apikey")}
                            />
                        </div> */}
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">결과언어</span>
                            <CustomDropDownList
                                data={resultLangOptions}
                                textField="text"
                                dataItemKey="value"
                                defaultValue={resultLangValue}
                                onChange={handleDropdownChange("result_lang")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">모델선택</span>
                            <CustomDropDownList
                                data={modelOptions}
                                textField="text"
                                dataItemKey="value"
                                defaultValue={modelValue}
                                onChange={handleDropdownChange("model_select")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">창의성 조절</span>

                            <div className="tempCtrl" style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                                <Slider
                                    min={TEMP_MIN}
                                    max={TEMP_MAX}
                                    step={TEMP_STEP}
                                    buttons={false}                 // 좌우 +/− 버튼 숨김 (원하면 true)
                                    value={parseTemp(data?.temperature)}
                                    onChange={(e) => onChangeInputEvent(e, "temperature")}   // e.value 사용
                                    style={{ flex: 1 }}
                                />
                                <span className="tempValue">
                                    {parseTemp(data?.temperature).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </Section>

                    {/* 분류개수 설정 */}
                    <Section
                        id="sec-counts"
                        title={
                            <>
                                분류 개수 설정
                                <span className="titNote">(대/중분류를 "0" 설정시 분석안함)</span>
                            </>
                        }
                        open={openCounts}
                        onToggle={() => setOpenCounts(v => !v)}
                    >
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">소분류 개수</span>
                            <Input
                                className="k-input k-input-solid"
                                // defaultValue={100} 
                                value={data?.open_item_lv1 || ""}
                                onChange={(e) => onChangeInputEvent(e, "open_item_lv1")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">중분류 개수</span>
                            <Input
                                className="k-input k-input-solid"
                                value={data?.open_item_lv2 || ""}
                                onChange={(e) => onChangeInputEvent(e, "open_item_lv2")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">대분류 개수</span>
                            <Input
                                className="k-input k-input-solid"
                                value={data?.open_item_lv3 || ""}
                                onChange={(e) => onChangeInputEvent(e, "open_item_lv3")}
                            />
                        </div>
                    </Section>

                    {/* 버튼 3개 */}
                    <div className="btnWrap type01 btnRowFit">
                        <Button className="btnTxt" disabled={saving}
                            onClick={() => runInfoSave("translateResponse")}>
                            번역
                        </Button>

                        <Button themeColor="primary" disabled={saving}
                            onClick={async () => {
                                try {
                                    const hasAnalysis = (lv3Options ?? []).some(
                                        (r) => r.ex_gubun?.trim?.() === "analysis"
                                    );
                                    if (hasAnalysis) {
                                        modal.showConfirm(
                                            "알림",
                                            "기존 분석 결과가 있습니다.\n삭제 후 새로 분석하시겠습니까?",
                                            {
                                                btns: [
                                                    { title: "취소" },
                                                    { title: "확인", click: () => runInfoSave("classified") },
                                                ],
                                            }
                                        );
                                    } else {
                                        runInfoSave("classified");
                                    }
                                } catch (err) {
                                    console.error("분석 전 확인 오류", err);
                                    modal.showErrorAlert("오류", "기존 분석 여부 확인 중 문제가 발생했습니다.");
                                }
                            }}
                        >
                            보기분석
                        </Button>

                        <Button themeColor="primary" disabled={saving}
                            onClick={() => {
                                try {
                                    if (responseCount < 0) {
                                        modal.showConfirm(
                                            "알림",
                                            "기존 분석 결과가 있습니다.\n삭제 후 새로 분석하시겠습니까?",
                                            {
                                                btns: [
                                                    { title: "취소" },
                                                    { title: "확인", click: () => runInfoSave("response") },
                                                ],
                                            }
                                        );
                                    } else {
                                        runInfoSave("response");
                                    }
                                } catch (err) {
                                    console.error("응답자분석 전 확인 오류", err);
                                    modal.showErrorAlert("오류", "기존 분석 여부 확인 중 문제가 발생했습니다.");
                                }
                            }}>
                            응답자분석(NEW)
                        </Button>

                        {showEmptyEtcBtn && (
                            <Button className="btnTxt" disabled={saving}
                                onClick={() => runInfoSave("recallResponse")}>
                                응답자 빈셀&기타
                            </Button>
                        )}
                    </div>
                    {/* 분석결과 */}
                    <div className="mgT16">
                        <div ref={logRef} className="resultBox" aria-label="분석결과창">
                            {logText}
                        </div>
                        <div className="mgT10" style={{ display: "flex", justifyContent: "space-between" }}>
                            {userPerm === 2 && <Button className="btnTxt type02" onClick={deleteQnum}>문항 삭제</Button>}
                            <Button className="btnTxt type02" onClick={clearLog}>로그 지우기</Button>
                        </div>
                    </div>
                </div>
            )}
            {/* 기존 프롬프트 내용 팝업 */}
            {previousPromptShow &&
                <OptionSettingPopup
                    popupShow={previousPromptShow}
                    setPopupShow={setPreviousPromptShow}
                    previousPromptExValue={previousPromptExValue}           //보기 프롬프트 로그
                    setPreviousPromptExValue={setPreviousPromptExValue}
                    previousPromptResValue={previousPromptResValue}         //응답 프롬프트 로그
                    setPreviousPromptResValue={setPreviousPromptResValue}
                    onSelectPrompt={handleSelectPrompt}
                />
            }
        </Fragment>
    );
};

export default OptionSettingInfo;