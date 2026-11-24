import React, { useState, useEffect, useContext } from "react";
import { Settings, RotateCcw, Zap } from "lucide-react";
import CustomDropDownList from "@/components/kendo/CustomDropDownList.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { ProListApi } from "./ProListApi.js";
import { OptionSettingApi } from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingApi.js";

export const DEFAULT_HANQ_OPTIONS = {
    lvcode: "3",
    model_select: "GPT-5.2",
    result_lang: "Korean",
    temperature: 0.2,
    open_item_lv1: "0~50",
    open_item_lv2: "0",
    open_item_lv3: "0",
    prompt_string: "",
    concurrency: "1",
};

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

// OptionSettingInfo.jsx 와 동일한 옵션 변환 헬퍼
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
 * AI오픈분석 > 문항 목록 > 한큐분석 공통 옵션 설정 모달 (AI오픈 cmn_popup 디자인 / 주황색 테마)
 */
const HanqOptionModal = ({
    show,
    onClose,
    projectnum,
    user,
    sampleQnum = "",
    targetCount = 0,
    onStartAnalysis,
}) => {
    const modal = useContext(modalContext);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const { getHanqOptionAll, saveHanqOptionAll } = ProListApi();
    const { optionEditData } = OptionSettingApi();

    const [options, setOptions] = useState({ ...DEFAULT_HANQ_OPTIONS });
    const [modelOptions, setModelOptions] = useState(FALLBACK_MODEL_OPTIONS);
    const [langOptions, setLangOptions] = useState(FALLBACK_LANG_OPTIONS);
    const [serverDefaultModel, setServerDefaultModel] = useState(DEFAULT_HANQ_OPTIONS.model_select);
    const [serverDefaultLang, setServerDefaultLang] = useState(DEFAULT_HANQ_OPTIONS.result_lang);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!show) return;
        let isMounted = true;

        const fetchOptions = async () => {
            setLoading(true);
            try {
                const pn = projectnum || sessionStorage.getItem("projectnum") || "";
                const userId = user || sessionStorage.getItem("userId") || "";
                const qnumForInfo = sampleQnum || sessionStorage.getItem("qnum") || "";

                // 1) 서버 DB의 model_select / result_lang 목록 조회 (OptionSettingInfo.jsx 동일 API: gb="info")
                // 2) 한큐분석 저장된 공통 옵션 조회 (/APIs/o/pro_list/option_all)
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
                        .catch((err) => {
                            console.warn("[HanqOptionModal] gb=info 옵션 목록 조회 실패:", err);
                            return null;
                        }),
                    getHanqOptionAll
                        .mutateAsync({
                            projectnum: pn,
                            user: userId,
                        })
                        .catch((err) => {
                            console.warn("[HanqOptionModal] option_all 조회 실패:", err);
                            return null;
                        }),
                ]);

                if (!isMounted) return;

                const infoData = infoRes?.resultjson?.[0] || {};
                const fetchedModelOpts = toOptions(infoData?.model_select);
                const fetchedLangOpts = toOptions(infoData?.result_lang);
                const fetchedApiKeyOpts = toOptions(infoData?.apikey);

                const activeModelOpts = fetchedModelOpts.length > 0 ? fetchedModelOpts : FALLBACK_MODEL_OPTIONS;
                const activeLangOpts = fetchedLangOpts.length > 0 ? fetchedLangOpts : FALLBACK_LANG_OPTIONS;

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

                if (String(hanqRes?.success) === "777") {
                    const data = hanqRes?.resultjson?.data ?? hanqRes?.data?.resultjson?.data;
                    if (data && typeof data === "object") {
                        const resolvedModel =
                            matchOptionValue(activeModelOpts, data.model_select) ||
                            String(data.model_select || defaultModelVal);
                        const resolvedLang =
                            matchOptionValue(activeLangOpts, data.result_lang) ||
                            String(data.result_lang || defaultLangVal);

                        setOptions({
                            lvcode: String(data.lvcode ?? DEFAULT_HANQ_OPTIONS.lvcode),
                            model_select: resolvedModel,
                            result_lang: resolvedLang,
                            temperature: Number.isFinite(Number(data.temperature))
                                ? Number(data.temperature)
                                : DEFAULT_HANQ_OPTIONS.temperature,
                            open_item_lv1: String(data.open_item_lv1 ?? DEFAULT_HANQ_OPTIONS.open_item_lv1),
                            open_item_lv2: String(data.open_item_lv2 ?? DEFAULT_HANQ_OPTIONS.open_item_lv2),
                            open_item_lv3: String(data.open_item_lv3 ?? DEFAULT_HANQ_OPTIONS.open_item_lv3),
                            prompt_string: String(data.prompt_string ?? DEFAULT_HANQ_OPTIONS.prompt_string),
                            concurrency: String(data.concurrency ?? DEFAULT_HANQ_OPTIONS.concurrency),
                            ...(data.apikeyid || defaultApiKeyId
                                ? { apikeyid: data.apikeyid || defaultApiKeyId }
                                : {}),
                        });
                        return;
                    }
                }

                setOptions({
                    ...DEFAULT_HANQ_OPTIONS,
                    model_select: String(defaultModelVal),
                    result_lang: String(defaultLangVal),
                    ...(defaultApiKeyId ? { apikeyid: defaultApiKeyId } : {}),
                });
            } catch (e) {
                console.error("[HanqOptionModal] 옵션 조회 실패:", e);
                if (isMounted) setOptions({ ...DEFAULT_HANQ_OPTIONS });
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchOptions();

        return () => {
            isMounted = false;
        };
    }, [show, projectnum, user, sampleQnum]);

    if (!show) return null;

    const handleChange = (key, value) => {
        setOptions((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleResetDefaults = () => {
        modal.showConfirm(
            "확인",
            "설정한 옵션을 초기 기본값으로 되돌리시겠습니까?\n(되돌린 후 [옵션 저장]을 눌러야 최종 반영됩니다.)",
            {
                btns: [
                    { title: "취소" },
                    {
                        title: "복원",
                        click: () => {
                            setOptions((prev) => ({
                                ...DEFAULT_HANQ_OPTIONS,
                                model_select: serverDefaultModel || DEFAULT_HANQ_OPTIONS.model_select,
                                result_lang: serverDefaultLang || DEFAULT_HANQ_OPTIONS.result_lang,
                                ...(prev?.apikeyid ? { apikeyid: prev.apikeyid } : {}),
                            }));
                        },
                    },
                ],
            }
        );
    };

    const buildSavePayload = () => ({
        projectnum: projectnum || sessionStorage.getItem("projectnum") || "",
        user: user || sessionStorage.getItem("userId") || "",
        settings: {
            lvcode: String(options.lvcode || "3"),
            model_select: String(options.model_select || "GPT-5.2"),
            result_lang: String(options.result_lang || "Korean"),
            temperature: Number(options.temperature ?? 0.2),
            open_item_lv1: String(options.open_item_lv1 ?? "0~50"),
            open_item_lv2: String(options.open_item_lv2 ?? "0"),
            open_item_lv3: String(options.open_item_lv3 ?? "0"),
            prompt_string: String(options.prompt_string ?? ""),
            concurrency: String(options.concurrency || "1"),
        },
    });

    const handleSaveOnly = async () => {
        loadingSpinner?.show?.();
        try {
            const res = await saveHanqOptionAll.mutateAsync(buildSavePayload());
            if (String(res?.success) === "777") {
                modal.showConfirm("알림", "한큐분석 옵션이 저장되었습니다.", {
                    btns: [
                        {
                            title: "확인",
                        },
                    ],
                });
            } else {
                modal.showErrorAlert("에러", res?.message || res?.Message || "옵션 저장에 실패했습니다.");
            }
        } catch (err) {
            console.error("[HanqOptionModal] 옵션 저장 실패:", err);
            modal.showErrorAlert("에러", "옵션 저장 중 오류가 발생했습니다.");
        } finally {
            loadingSpinner?.hide?.();
        }
    };

    const handleSaveAndStart = async () => {
        loadingSpinner?.show?.();
        try {
            await saveHanqOptionAll.mutateAsync(buildSavePayload()).catch((err) => {
                console.warn("[HanqOptionModal] 시작 전 옵션 자동 저장 실패(계속 진행):", err);
            });
        } finally {
            loadingSpinner?.hide?.();
        }
        onStartAnalysis?.();
    };

    const lvTabs = [
        { value: "1", label: "1단계 (소)" },
        { value: "2", label: "2단계 (중,소)" },
        { value: "3", label: "3단계 (대,중,소)" },
    ];

    return (
        <article className="modal on" style={{ zIndex: 999999 }} onClick={onClose}>
            <style>{`
                .k-animation-container {
                    z-index: 1000005 !important;
                }
                .hanq-kendo-ddl-wrap .k-dropdownlist {
                    width: 100% !important;
                    height: 38px !important;
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
                    width: 18px;
                    height: 18px;
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
                    width: 18px;
                    height: 18px;
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
                    width: "660px",
                    maxWidth: "95vw",
                    maxHeight: "92vh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRadius: "16px",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.22)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. 공통 헤더 (.popTit) */}
                <div
                    className="popTit"
                    style={{
                        height: "auto",
                        padding: "16px 24px 14px 24px",
                        borderBottom: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <div style={{ minWidth: 0, paddingRight: "32px" }}>
                        <div>
                            <h3
                                style={{
                                    fontSize: "20px",
                                    fontWeight: "800",
                                    color: "#0f172a",
                                    margin: 0,
                                    lineHeight: "1.3",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                }}
                            >
                                <i
                                    aria-hidden="true"
                                    style={{
                                        display: "inline-block",
                                        width: "4px",
                                        height: "20px",
                                        borderRadius: "2px",
                                        background: "linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)",
                                        boxShadow: "0 2px 4px rgba(255, 107, 53, 0.28)",
                                        flexShrink: 0,
                                    }}
                                />
                                <span>한큐분석 공통 옵션 설정</span>
                                {targetCount > 0 && (
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            fontWeight: "700",
                                            padding: "2px 9px",
                                            borderRadius: "999px",
                                            backgroundColor: "#fff7ed",
                                            color: "#ea580c",
                                            border: "1px solid #fdba74",
                                        }}
                                    >
                                        분석 대상 {targetCount}개 문항
                                    </span>
                                )}
                            </h3>
                            <p
                                style={{
                                    fontSize: "12px",
                                    color: "#64748b",
                                    margin: "2px 0 0 0",
                                    fontWeight: "400",
                                    lineHeight: "1.3",
                                }}
                            >
                                한큐분석 실행 시 모든 [분석] 문항에 공통 적용되는 옵션입니다.
                            </p>
                        </div>
                    </div>
                    <a className="btnClose" onClick={onClose} style={{ cursor: "pointer" }}>
                        <span className="hidden">close</span>
                    </a>
                </div>

                {/* 2. 공통 바디 (.popCont) */}
                <div
                    className="popCont"
                    style={{
                        flex: 1,
                        maxHeight: "none",
                        overflowY: "visible",
                        padding: "18px 24px 20px 24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                        opacity: loading ? 0.6 : 1,
                        pointerEvents: loading ? "none" : "auto",
                    }}
                >
                    {/* 1) 분류 단계 선택 (lvcode) */}
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: "13px",
                                fontWeight: "700",
                                color: "#1e293b",
                                marginBottom: "6px",
                            }}
                        >
                            분류 단계 선택
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                            {lvTabs.map((tab) => {
                                const isSelected = String(options.lvcode) === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        onClick={() => handleChange("lvcode", tab.value)}
                                        style={{
                                            height: "38px",
                                            borderRadius: "8px",
                                            border: isSelected ? "1.5px solid #ea580c" : "1px solid #cbd5e1",
                                            backgroundColor: isSelected ? "#fff7ed" : "#ffffff",
                                            color: isSelected ? "#ea580c" : "#475569",
                                            fontSize: "13px",
                                            fontWeight: isSelected ? "700" : "500",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            boxShadow: isSelected ? "0 1px 4px rgba(234, 88, 12, 0.12)" : "none",
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2) AI 모델 & 결과 언어 (2열 - Kendo CustomDropDownList) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div className="hanq-kendo-ddl-wrap">
                            <label
                                style={{
                                    display: "block",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    color: "#1e293b",
                                    marginBottom: "6px",
                                }}
                            >
                                AI 모델
                            </label>
                            <CustomDropDownList
                                data={modelOptions}
                                textField="text"
                                dataItemKey="value"
                                defaultValue={options.model_select}
                                onChange={(e) => {
                                    const val = e?.value?.value ?? e?.target?.value?.value;
                                    if (val) handleChange("model_select", String(val));
                                }}
                            />
                        </div>

                        <div className="hanq-kendo-ddl-wrap">
                            <label
                                style={{
                                    display: "block",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    color: "#1e293b",
                                    marginBottom: "6px",
                                }}
                            >
                                결과 언어
                            </label>
                            <CustomDropDownList
                                data={langOptions}
                                textField="text"
                                dataItemKey="value"
                                defaultValue={options.result_lang}
                                onChange={(e) => {
                                    const val = e?.value?.value ?? e?.target?.value?.value;
                                    if (val) handleChange("result_lang", String(val));
                                }}
                            />
                        </div>
                    </div>

                    {/* 3) 창의성 (Temperature) */}
                    <div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "6px",
                            }}
                        >
                            <label style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                                창의성 (Temperature)
                            </label>
                            <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#ea580c" }}>
                                {Number(options.temperature ?? 0.2).toFixed(1)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={options.temperature ?? 0.2}
                            onChange={(e) => handleChange("temperature", parseFloat(e.target.value))}
                            className="hanq-temp-slider"
                            style={{
                                background: `linear-gradient(to right, #f97316 0%, #f97316 ${Number(options.temperature ?? 0.2) * 100
                                    }%, #e2e8f0 ${Number(options.temperature ?? 0.2) * 100}%, #e2e8f0 100%)`,
                            }}
                        />
                    </div>

                    {/* 4) 분류 개수 설정 (단계별 생성 한도) */}
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: "13px",
                                fontWeight: "700",
                                color: "#1e293b",
                                marginBottom: "6px",
                            }}
                        >
                            분류 개수 설정 (단계별 생성 한도)
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                            <div>
                                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", fontWeight: "500" }}>
                                    소분류
                                </div>
                                <input
                                    type="text"
                                    value={options.open_item_lv1}
                                    onChange={(e) => handleChange("open_item_lv1", e.target.value)}
                                    style={{
                                        width: "100%",
                                        height: "36px",
                                        padding: "0 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        color: "#1e293b",
                                        outline: "none",
                                        boxSizing: "border-box",
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = "#f97316";
                                        e.target.style.boxShadow = "0 0 0 3px #fff7ed";
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = "#cbd5e1";
                                        e.target.style.boxShadow = "none";
                                    }}
                                />
                            </div>
                            <div>
                                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", fontWeight: "500" }}>
                                    중분류
                                </div>
                                <input
                                    type="text"
                                    value={options.open_item_lv2}
                                    onChange={(e) => handleChange("open_item_lv2", e.target.value)}
                                    style={{
                                        width: "100%",
                                        height: "36px",
                                        padding: "0 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        color: "#1e293b",
                                        outline: "none",
                                        boxSizing: "border-box",
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = "#f97316";
                                        e.target.style.boxShadow = "0 0 0 3px #fff7ed";
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = "#cbd5e1";
                                        e.target.style.boxShadow = "none";
                                    }}
                                />
                            </div>
                            <div>
                                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", fontWeight: "500" }}>
                                    대분류
                                </div>
                                <input
                                    type="text"
                                    value={options.open_item_lv3}
                                    onChange={(e) => handleChange("open_item_lv3", e.target.value)}
                                    style={{
                                        width: "100%",
                                        height: "36px",
                                        padding: "0 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        color: "#1e293b",
                                        outline: "none",
                                        boxSizing: "border-box",
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = "#f97316";
                                        e.target.style.boxShadow = "0 0 0 3px #fff7ed";
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = "#cbd5e1";
                                        e.target.style.boxShadow = "none";
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 5) 공통 프롬프트 지침 (prompt_string) */}
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: "13px",
                                fontWeight: "700",
                                color: "#1e293b",
                                marginBottom: "6px",
                            }}
                        >
                            공통 프롬프트 지침
                        </label>
                        <textarea
                            rows={2}
                            value={options.prompt_string}
                            onChange={(e) => handleChange("prompt_string", e.target.value)}
                            placeholder="모든 문항 분석 시 공통으로 반영할 프롬프트 지침을 입력하세요 (비워두면 시스템 기본 지침 적용)"
                            style={{
                                width: "100%",
                                padding: "9px 12px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "13px",
                                color: "#1e293b",
                                lineHeight: "1.45",
                                resize: "none",
                                outline: "none",
                                boxSizing: "border-box",
                                fontFamily: "inherit",
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = "#f97316";
                                e.target.style.boxShadow = "0 0 0 3px #fff7ed";
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#cbd5e1";
                                e.target.style.boxShadow = "none";
                            }}
                        />
                    </div>

                    {/* 6) 한큐분석 동시 실행 방식 (concurrency) */}
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: "13px",
                                fontWeight: "700",
                                color: "#1e293b",
                                marginBottom: "6px",
                            }}
                        >
                            한큐분석 동시 실행 방식
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            {[
                                {
                                    value: "1",
                                    title: "1개 문항씩 순차 실행",
                                    badge: "권장",
                                    desc: "오류 없이 가장 안정적으로 실행",
                                },
                                {
                                    value: "2",
                                    title: "2개 문항 병렬 실행",
                                    badge: null,
                                    desc: "고속 모드 (약 40% 시간 단축)",
                                },
                            ].map((item) => {
                                const isSelected = String(options.concurrency) === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => handleChange("concurrency", item.value)}
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: "10px",
                                            padding: "11px 14px",
                                            borderRadius: "10px",
                                            border: isSelected ? "1.5px solid #ea580c" : "1px solid #cbd5e1",
                                            backgroundColor: isSelected ? "#fff7ed" : "#f8fafc",
                                            cursor: "pointer",
                                            textAlign: "left",
                                            transition: "all 0.15s ease",
                                            boxShadow: isSelected
                                                ? "0 1px 4px rgba(234, 88, 12, 0.12)"
                                                : "none",
                                        }}
                                    >
                                        {/* 커스텀 라디오 원형 아이콘 (common.css radio 숨김 방지) */}
                                        <span
                                            style={{
                                                width: "16px",
                                                height: "16px",
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
                                                        width: "8px",
                                                        height: "8px",
                                                        borderRadius: "50%",
                                                        backgroundColor: "#ea580c",
                                                    }}
                                                />
                                            )}
                                        </span>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <span
                                                    style={{
                                                        fontSize: "13px",
                                                        fontWeight: "700",
                                                        color: isSelected ? "#ea580c" : "#1e293b",
                                                    }}
                                                >
                                                    {item.title}
                                                </span>
                                                {item.badge && (
                                                    <span
                                                        style={{
                                                            fontSize: "11px",
                                                            fontWeight: "700",
                                                            padding: "1px 6px",
                                                            borderRadius: "4px",
                                                            backgroundColor: isSelected ? "#ffedd5" : "#e2e8f0",
                                                            color: isSelected ? "#c2410c" : "#475569",
                                                        }}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#64748b",
                                                    fontWeight: "400",
                                                    lineHeight: "1.3",
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

                    {/* 7) 하단 버튼 영역 */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingTop: "10px",
                            borderTop: "1px solid #f1f5f9",
                        }}
                    >
                        <button
                            type="button"
                            onClick={handleResetDefaults}
                            style={{
                                height: "38px",
                                padding: "0 14px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                backgroundColor: "#ffffff",
                                color: "#475569",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f8fafc";
                                e.currentTarget.style.borderColor = "#94a3b8";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#ffffff";
                                e.currentTarget.style.borderColor = "#cbd5e1";
                            }}
                        >
                            <RotateCcw size={14} />
                            <span>기본값 복원</span>
                        </button>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    height: "38px",
                                    padding: "0 16px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "#ffffff",
                                    color: "#475569",
                                    fontSize: "13.5px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#f8fafc";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#ffffff";
                                }}
                            >
                                취소
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveOnly}
                                style={{
                                    height: "38px",
                                    padding: "0 16px",
                                    borderRadius: "8px",
                                    border: "1px solid #fdba74",
                                    backgroundColor: "#fff7ed",
                                    color: "#ea580c",
                                    fontSize: "13.5px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#ffedd5";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#fff7ed";
                                }}
                            >
                                옵션만 저장
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveAndStart}
                                style={{
                                    height: "38px",
                                    padding: "0 20px",
                                    borderRadius: "8px",
                                    border: "none",
                                    backgroundColor: "#f97316",
                                    color: "#ffffff",
                                    fontSize: "13.5px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    boxShadow: "0 2px 5px rgba(249, 115, 22, 0.25)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#ea580c";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#f97316";
                                }}
                            >
                                <Zap size={14} strokeWidth={2.5} />
                                <span>
                                    한큐분석 시작{targetCount > 0 ? ` (${targetCount}문항)` : ""}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default HanqOptionModal;

