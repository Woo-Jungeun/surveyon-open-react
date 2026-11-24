import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { CheckCircle2, AlertCircle, SlidersHorizontal } from "lucide-react";
import { compareAnalysisResponses } from "@/api/analysisApi.js";
import { OsaDropDown } from "./OptionSettingKendoSelect.jsx";
import { cleanStr } from "./optionSettingUtils";

// 결측 코드 판별 (9998 없음, 9999 모름/무응답 등)
const isMissingCodeEntry = (code, label = "") => {
    const c = cleanStr(code);
    const l = cleanStr(label);
    if (c === "9998" || c === "9999") return true;
    if ((c === "98" || c === "99" || c === "998" || c === "999") && /(모름|무응답|없음)/.test(l)) {
        return true;
    }
    return /^(모름|무응답|없음|모름\/무응답|모름\/없음)$/.test(l);
};

// 특수 코드 판별 (결측 코드 + 기타 9997 등)
const isSpecialCodeEntry = (code, label = "") => {
    if (isMissingCodeEntry(code, label)) return true;
    const c = cleanStr(code);
    const l = cleanStr(label);
    return c === "9997" || /^기타/.test(l);
};

const formatSavedTimestamp = (raw) => {
    const s = cleanStr(raw);
    if (!s) return "";
    const m = s.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2})/);
    if (m) return `${m[1]} ${m[2]}`;
    return s;
};

/**
 * 분석 > 저장 전 DB 반영 비교 · 중복코드 정제 방식 선택(모드 A/B) · 미코딩 대체 저장 모달
 * (기존 surveyon 주황색 테마 cmn_popup 디자인 유지)
 */
const OptionSettingSaveCompareModal = ({
    show,
    onClose,
    projectnum,
    qnum,
    displayQnum,
    qTitle,
    user,
    responses = [],
    codes = [],
    rawdata = [],
    codesCount = 0,
    initialDuplicateRemove = false,
    infoRawData = null,
    saving = false,
    onExecuteSave,
}) => {
    const [loadingCompare, setLoadingCompare] = useState(false);
    const [compareResult, setCompareResult] = useState(null);
    const [duplicateRemove, setDuplicateRemove] = useState(Boolean(initialDuplicateRemove));
    const [saveWithUncoded, setSaveWithUncoded] = useState(false);
    const [selectedFallbackKey, setSelectedFallbackKey] = useState("");

    const responsesRef = React.useRef(responses);
    responsesRef.current = responses;
    const initDupRef = React.useRef(initialDuplicateRemove);
    initDupRef.current = initialDuplicateRemove;

    // 미코딩 대체 저장용 코드북 드롭다운 후보 목록 구성 (특수/기타/모름 코드 우선 배치)
    const fallbackOptions = useMemo(() => {
        const activeCodes = (codes || []).filter((c) => !c?.__pendingDelete);
        const byCode = new Map();

        activeCodes.forEach((c) => {
            const sc = cleanStr(c.lv123code ?? c.code_num);
            const lv3 = cleanStr(c.lv3);
            if (!sc || !lv3 || byCode.has(sc)) return;
            byCode.set(sc, {
                code: sc,
                label: lv3,
                value: sc,
                text: `${sc} ${lv3}`,
                priority: /^9997$/.test(sc) || /^기타/.test(lv3)
                    ? 1
                    : isMissingCodeEntry(sc, lv3)
                        ? 2
                        : /^(97|98|99|997|998|999)$/.test(sc)
                            ? 3
                            : 10,
            });
        });

        // 코드북에 특수/기타 대체 코드가 하나도 없는 경우 기본 후보 자동 보강
        const hasSpecial = Array.from(byCode.values()).some((o) => o.priority < 10);
        if (!hasSpecial) {
            [
                { code: "9997", label: "기타", priority: 1 },
                { code: "9999", label: "모름/무응답", priority: 2 },
                { code: "99", label: "기타/무응답(자동)", priority: 3 },
            ].forEach((fb) => {
                if (!byCode.has(fb.code)) {
                    byCode.set(fb.code, {
                        ...fb,
                        value: fb.code,
                        text: `${fb.code} ${fb.label}`,
                    });
                }
            });
        }

        return Array.from(byCode.values()).sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            const na = /^\d+$/.test(a.code) ? Number(a.code) : Number.POSITIVE_INFINITY;
            const nb = /^\d+$/.test(b.code) ? Number(b.code) : Number.POSITIVE_INFINITY;
            if (na !== nb) return na - nb;
            return a.code.localeCompare(b.code, "ko");
        });
    }, [codes]);

    // 모달 오픈 시 상태 초기화 및 DB 비교 API 호출
    useEffect(() => {
        if (!show) return;
        setDuplicateRemove(Boolean(initDupRef.current));
        setSaveWithUncoded(false);
        if (fallbackOptions.length > 0) {
            setSelectedFallbackKey((prev) =>
                fallbackOptions.some((o) => o.value === prev) ? prev : fallbackOptions[0].value
            );
        }

        let cancelled = false;
        const activeResponses = (responsesRef.current || []).filter((r) => !r?.__pendingDelete);

        const fetchCompare = async () => {
            setLoadingCompare(true);
            try {
                const res = await compareAnalysisResponses(projectnum, qnum, activeResponses, user);
                if (!cancelled) {
                    const body = res?.resultjson || res?.data || res?.summary || res || {};
                    setCompareResult(Array.isArray(body) ? body[0] || {} : body);
                }
            } catch (err) {
                console.warn("[SaveCompareModal] compareAnalysisResponses fallback:", err);
                if (!cancelled) setCompareResult(null);
            } finally {
                if (!cancelled) setLoadingCompare(false);
            }
        };

        fetchCompare();
        return () => {
            cancelled = true;
        };
    }, [show, projectnum, qnum, user, fallbackOptions]);

    const selectedFallbackObj = useMemo(() => {
        return (
            fallbackOptions.find((o) => o.value === selectedFallbackKey) ||
            fallbackOptions[0] || { code: "9997", label: "기타", text: "9997 기타" }
        );
    }, [fallbackOptions, selectedFallbackKey]);

    // 분석 결과 vs 최종 DB 통계 계산 (서버 compareResult 우선, 클라이언트 responses/rawdata 보조)
    const stats = useMemo(() => {
        const active = (responses || []).filter((r) => !r?.__pendingDelete);
        const clientTotal = active.length;
        const clientCoded = active.filter(
            (r) => cleanStr(r?.lv123code ?? r?.code_num) !== ""
        ).length;
        const clientUnc = Math.max(0, clientTotal - clientCoded);
        const clientEdited = active.filter((r) => r?._edited).length;

        const rawList = Array.isArray(rawdata) ? rawdata : [];
        const rawTotal = rawList.length;
        const rawCoded = rawList.filter(
            (r) => cleanStr(r?.lv123code ?? r?.code_num ?? r?.lv3code) !== ""
        ).length;
        const rawUnc = Math.max(0, rawTotal - rawCoded);

        const c = compareResult || {};
        const total = Number(c.total ?? c.totalCount ?? clientTotal);
        const coded = Number(c.coded ?? c.codedCount ?? clientCoded);
        const unc = Number(c.unc ?? c.uncoded ?? c.uncodedCount ?? clientUnc);

        const fallbackDbCoded = rawTotal > 0 ? rawCoded : coded;
        const fallbackDbUnc = rawTotal > 0 ? rawUnc : 0;
        const dbCoded = Number(c.dbCoded ?? c.db_coded ?? c.prevCoded ?? fallbackDbCoded);
        const dbUnc = Number(
            c.dbUnc ?? c.dbUncoded ?? c.db_uncoded ?? c.prevUncoded ?? fallbackDbUnc
        );
        const dbTotal = Number(
            c.dbTotal ?? c.db_total ?? c.prevTotal ?? (rawTotal > 0 ? rawTotal : dbCoded + dbUnc)
        );

        const neu = Number(c.neu ?? c.newCount ?? c.added ?? 0);
        const chg = Number(c.chg ?? c.changed ?? c.modified ?? clientEdited);
        const same = Number(
            c.same ?? c.unchanged ?? Math.max(0, coded - neu - chg)
        );

        return { total, coded, unc, dbCoded, dbUnc, dbTotal, neu, chg, same };
    }, [responses, rawdata, compareResult]);

    // 모드 A (전체 중복코드 제거) vs 모드 B (기본 결측 정제) 실시간 시뮬레이션
    const dedupSim = useMemo(() => {
        const active = (responses || []).filter((r) => !r?.__pendingDelete);
        const codeLabelMap = new Map();
        (codes || []).forEach((c) => {
            const sc = cleanStr(c?.lv123code ?? c?.code_num);
            if (sc) codeLabelMap.set(sc, cleanStr(c?.lv3));
        });

        const groups = new Map();
        active.forEach((r, idx) => {
            const respondentKey = cleanStr(r?.fixed_key ?? r?.pid) || `row_${idx}`;
            const rawCode = cleanStr(r?.lv123code ?? r?.code_num);
            const effectiveCode =
                rawCode || (saveWithUncoded && stats.unc > 0 ? selectedFallbackObj.code : "");
            const effectiveLabel = rawCode
                ? cleanStr(r?.lv3) || codeLabelMap.get(rawCode) || ""
                : saveWithUncoded && stats.unc > 0
                    ? selectedFallbackObj.label
                    : "";

            if (!groups.has(respondentKey)) groups.set(respondentKey, []);
            groups.get(respondentKey).push({
                code: effectiveCode,
                label: effectiveLabel,
            });
        });

        let modeACleaned = 0;
        let modeBCleaned = 0;
        let normalDupOnlyCount = 0;

        groups.forEach((items) => {
            const codedItems = items.filter((it) => Boolean(it.code));
            if (codedItems.length <= 1) return;

            const hasNormalValid = codedItems.some(
                (it) => !isMissingCodeEntry(it.code, it.label)
            );
            const seenAll = new Set();
            const seenSpecial = new Set();

            codedItems.forEach((it) => {
                const missingConflict =
                    hasNormalValid && isMissingCodeEntry(it.code, it.label);
                const isDupAll = seenAll.has(it.code);
                const isSpec = isSpecialCodeEntry(it.code, it.label);
                const isDupSpecial = isSpec && seenSpecial.has(it.code);

                if (missingConflict || isDupAll) {
                    modeACleaned += 1;
                    if (!missingConflict && !isDupSpecial) {
                        normalDupOnlyCount += 1;
                    }
                }
                if (missingConflict || isDupSpecial) {
                    modeBCleaned += 1;
                }

                seenAll.add(it.code);
                if (isSpec) seenSpecial.add(it.code);
            });
        });

        const c = compareResult || {};
        const beforeCount = active.length;
        const resolvedACleaned =
            c.modeACleaned != null ? Number(c.modeACleaned) : modeACleaned;
        const resolvedBCleaned =
            c.modeBCleaned != null ? Number(c.modeBCleaned) : modeBCleaned;

        return {
            beforeCount,
            modeACleaned: resolvedACleaned,
            modeAFinal: Math.max(0, beforeCount - resolvedACleaned),
            modeBCleaned: resolvedBCleaned,
            modeBFinal: Math.max(0, beforeCount - resolvedBCleaned),
            normalDupOnlyCount,
        };
    }, [responses, codes, saveWithUncoded, stats.unc, selectedFallbackObj, compareResult]);

    // 최근 저장 시각 추출
    const lastSavedDisplay = useMemo(() => {
        const c = compareResult || {};
        const direct = formatSavedTimestamp(
            c.lastSavedAt ??
            c.last_saved_at ??
            c.lastSaveDate ??
            c.update_date ??
            infoRawData?.update_date ??
            infoRawData?.duplicate_remove_date
        );
        if (direct) return direct;

        let latest = "";
        (responses || []).forEach((r) => {
            const ts = formatSavedTimestamp(r?.update_date ?? r?.updated_at);
            if (ts && ts > latest) latest = ts;
        });
        if (latest) return latest;

        (rawdata || []).forEach((r) => {
            const ts = formatSavedTimestamp(r?.update_date ?? r?.updated_at);
            if (ts && ts > latest) latest = ts;
        });
        return latest || "기록 없음";
    }, [compareResult, infoRawData, responses, rawdata]);

    if (!show) return null;

    const effectiveUncodedSave = stats.unc > 0 && saveWithUncoded;
    const effectiveCodedCount = stats.coded + (effectiveUncodedSave ? stats.unc : 0);
    const effectiveUncCount = effectiveUncodedSave ? 0 : stats.unc;

    const activeCleanedCount = duplicateRemove
        ? dedupSim.modeACleaned
        : dedupSim.modeBCleaned;
    const activeFinalCount = duplicateRemove
        ? dedupSim.modeAFinal
        : dedupSim.modeBFinal;

    const pendingCount =
        stats.neu + stats.chg + (effectiveUncodedSave ? stats.unc : 0);

    // 3열 테이블 '이번 반영' 텍스트 계산
    const applyCodedText =
        pendingCount > 0
            ? `+${pendingCount.toLocaleString()}건`
            : activeCleanedCount > 0
                ? `정리 ${activeCleanedCount.toLocaleString()}건`
                : "—";
    const applyUncText = effectiveUncodedSave
        ? `-${stats.unc.toLocaleString()}건 (대체)`
        : "—";
    const applyTotalText =
        pendingCount > 0 || activeCleanedCount > 0
            ? `${activeFinalCount.toLocaleString()}건`
            : "—";

    const handleConfirmSave = () => {
        onExecuteSave?.({
            duplicateRemove,
            saveWithUncoded: effectiveUncodedSave,
            fallbackCode: selectedFallbackObj.code,
            fallbackLabel: selectedFallbackObj.label,
        });
    };

    const questionSubTitle = qTitle
        ? `${displayQnum || qnum} · ${qTitle}`
        : `${projectnum} / ${displayQnum || qnum}`;

    return (
        <article
            className="modal on orange-theme osa-modal"
            style={{ zIndex: 9992 }}
        >
            <div
                className="cmn_popup"
                style={{
                    width: "680px",
                    maxWidth: "94vw",
                    maxHeight: "90vh",
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
                {/* 1. 모달 헤더 */}
                <div
                    className="popTit"
                    style={{
                        height: "auto",
                        padding: "16px 24px",
                    }}
                >
                    <div style={{ minWidth: 0, paddingRight: "32px" }}>
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
                            저장 — DB 반영 비교
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "2px 10px",
                                    borderRadius: "999px",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    backgroundColor: "#fff7ed",
                                    color: "#ea580c",
                                    border: "1px solid #fdba74",
                                    flexShrink: 0,
                                }}
                            >
                                {displayQnum || qnum}
                            </span>
                        </h3>
                    </div>
                    <a
                        className="btnClose"
                        onClick={() => {
                            if (!saving) onClose?.();
                        }}
                        title={saving ? "저장 실행 중에는 닫을 수 없습니다" : "닫기"}
                        style={{
                            cursor: saving ? "not-allowed" : "pointer",
                            opacity: saving ? 0.35 : 1,
                        }}
                    >
                        <span className="hidden">close</span>
                    </a>
                </div>

                <div className="popCont" style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
                    {loadingCompare && (
                        <div
                            style={{
                                marginBottom: "12px",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                background: "#fff7ed",
                                border: "1px solid #fed7aa",
                                color: "#ea580c",
                                fontSize: "12.5px",
                                fontWeight: 600,
                            }}
                        >
                            현재 DB 저장 상태와 비교 중입니다...
                        </div>
                    )}

                    {/* 2. 동일 응답자 중복코드 처리 옵션 */}
                    <div style={{ marginBottom: "10px" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                marginBottom: "8px",
                            }}
                        >
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    color: "#1e293b",
                                }}
                            >
                                <SlidersHorizontal size={14} color="#f97316" />
                                동일 응답자 중복코드 처리
                            </span>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "10px",
                                alignItems: "stretch",
                            }}
                        >
                            {/* 중복코드 제거 카드 */}
                            <div
                                onClick={() => setDuplicateRemove(true)}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    padding: "12px 14px",
                                    borderRadius: "10px",
                                    border: duplicateRemove
                                        ? "1.5px solid #f97316"
                                        : "1px solid #e2e8f0",
                                    background: duplicateRemove ? "#fffaf5" : "#ffffff",
                                    boxShadow: duplicateRemove
                                        ? "0 0 0 2px rgba(249, 115, 22, 0.1)"
                                        : "none",
                                    cursor: "pointer",
                                    transition: "all 0.14s ease",
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: "7px",
                                        }}
                                    >
                                        <label
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "7px",
                                                fontSize: "13.5px",
                                                fontWeight: 700,
                                                color: "#0f172a",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="osa-dedup-mode"
                                                checked={duplicateRemove}
                                                onChange={() => setDuplicateRemove(true)}
                                            />
                                            <span style={{ fontSize: "13.5px", fontWeight: 700 }}>
                                                중복코드 제거
                                            </span>
                                        </label>
                                        <span
                                            style={{
                                                padding: "2px 7px",
                                                borderRadius: "999px",
                                                background: "#fef3c7",
                                                border: "1px solid #fde68a",
                                                color: "#b45309",
                                                fontSize: "11px",
                                                fontWeight: 700,
                                            }}
                                        >
                                            ★ 추천
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            color: "#475569",
                                            marginBottom: "9px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "12px",
                                                lineHeight: 1.6,
                                                wordBreak: "keep-all",
                                            }}
                                        >
                                            • 동일 응답자의 중복 코드는{" "}
                                            <b style={{ color: "#1e293b", fontSize: "12px" }}>
                                                1건만 남김
                                            </b>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "12px",
                                                lineHeight: 1.6,
                                                wordBreak: "keep-all",
                                            }}
                                        >
                                            • 일반 응답이 있으면 모름·없음(9998, 9999){" "}
                                            <b style={{ color: "#1e293b", fontSize: "12px" }}>
                                                자동 제외
                                            </b>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "5px 10px",
                                        borderRadius: "6px",
                                        background: duplicateRemove ? "#ffedd5" : "#f8fafc",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                    }}
                                >
                                    <span style={{ color: "#475569", fontSize: "12px" }}>
                                        정리{" "}
                                        <b style={{ color: "#ea580c", fontSize: "12px" }}>
                                            {dedupSim.modeACleaned.toLocaleString()}건
                                        </b>
                                    </span>
                                    <span style={{ color: "#475569", fontSize: "12px" }}>
                                        최종{" "}
                                        <b style={{ color: "#15803d", fontSize: "12px" }}>
                                            {dedupSim.modeAFinal.toLocaleString()}건
                                        </b>{" "}
                                        저장
                                    </span>
                                </div>
                            </div>

                            {/* 중복코드 유지 카드 */}
                            <div
                                onClick={() => setDuplicateRemove(false)}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    padding: "12px 14px",
                                    borderRadius: "10px",
                                    border: !duplicateRemove
                                        ? "1.5px solid #f97316"
                                        : "1px solid #e2e8f0",
                                    background: !duplicateRemove ? "#fffaf5" : "#ffffff",
                                    boxShadow: !duplicateRemove
                                        ? "0 0 0 2px rgba(249, 115, 22, 0.1)"
                                        : "none",
                                    cursor: "pointer",
                                    transition: "all 0.14s ease",
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: "7px",
                                        }}
                                    >
                                        <label
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "7px",
                                                fontSize: "13.5px",
                                                fontWeight: 700,
                                                color: "#0f172a",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="osa-dedup-mode"
                                                checked={!duplicateRemove}
                                                onChange={() => setDuplicateRemove(false)}
                                            />
                                            <span style={{ fontSize: "13.5px", fontWeight: 700 }}>
                                                중복코드 유지
                                            </span>
                                        </label>
                                        <span
                                            style={{
                                                padding: "2px 7px",
                                                borderRadius: "999px",
                                                background: "#f1f5f9",
                                                border: "1px solid #e2e8f0",
                                                color: "#64748b",
                                                fontSize: "11px",
                                                fontWeight: 600,
                                            }}
                                        >
                                            기본
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            color: "#475569",
                                            marginBottom: "9px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "12px",
                                                lineHeight: 1.6,
                                                wordBreak: "keep-all",
                                            }}
                                        >
                                            • 일반 코드가 중복되어도 순서대로{" "}
                                            <b style={{ color: "#1e293b", fontSize: "12px" }}>
                                                모두 유지
                                            </b>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "12px",
                                                lineHeight: 1.6,
                                                wordBreak: "keep-all",
                                            }}
                                        >
                                            • 모름·없음(9998, 9999) 중복·충돌만{" "}
                                            <b style={{ color: "#1e293b", fontSize: "12px" }}>
                                                자동 정리
                                            </b>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "5px 10px",
                                        borderRadius: "6px",
                                        background: !duplicateRemove ? "#ffedd5" : "#f8fafc",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                    }}
                                >
                                    <span style={{ color: "#475569", fontSize: "12px" }}>
                                        정리{" "}
                                        <b style={{ color: "#ea580c", fontSize: "12px" }}>
                                            {dedupSim.modeBCleaned.toLocaleString()}건
                                        </b>
                                    </span>
                                    <span style={{ color: "#475569", fontSize: "12px" }}>
                                        최종{" "}
                                        <b style={{ color: "#15803d", fontSize: "12px" }}>
                                            {dedupSim.modeBFinal.toLocaleString()}건
                                        </b>{" "}
                                        저장
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. 선택된 중복코드 처리 방식 한 줄 요약 */}
                    <div
                        style={{
                            padding: "9px 14px",
                            borderRadius: "8px",
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            color: "#166534",
                            fontSize: "12.5px",
                            lineHeight: 1.45,
                            marginBottom: "12px",
                        }}
                    >
                        {duplicateRemove ? (
                            <span style={{ fontSize: "12.5px" }}>
                                중복·결측 코드{" "}
                                <b style={{ fontSize: "12.5px", color: "#15803d" }}>
                                    {dedupSim.modeACleaned.toLocaleString()}건
                                </b>{" "}
                                정리 후 최종{" "}
                                <b style={{ fontSize: "12.5px", color: "#15803d" }}>
                                    {dedupSim.modeAFinal.toLocaleString()}건
                                </b>
                                이 DB와 엑셀에 저장됩니다.
                            </span>
                        ) : (
                            <span style={{ fontSize: "12.5px" }}>
                                일반 코드 중복은 그대로 유지하며, 결측·특수 중복{" "}
                                <b style={{ fontSize: "12.5px", color: "#15803d" }}>
                                    {dedupSim.modeBCleaned.toLocaleString()}건
                                </b>{" "}
                                정리 후 최종{" "}
                                <b style={{ fontSize: "12.5px", color: "#15803d" }}>
                                    {dedupSim.modeBFinal.toLocaleString()}건
                                </b>
                                이 DB에 저장됩니다.
                            </span>
                        )}
                    </div>

                    {/* 4. 현재 작업본 vs 기존 DB vs 변경 내역 비교 테이블 */}
                    <div
                        style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            overflow: "hidden",
                            marginBottom: "10px",
                        }}
                    >
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "13px",
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        background: "#f8fafc",
                                        borderBottom: "1px solid #e2e8f0",
                                        color: "#64748b",
                                    }}
                                >
                                    <th
                                        style={{
                                            padding: "8px 14px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        구분
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px 14px",
                                            textAlign: "right",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        현재 작업본
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px 14px",
                                            textAlign: "right",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        기존 DB
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px 14px",
                                            textAlign: "right",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        변경 내역
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            fontWeight: 600,
                                            color: "#1e293b",
                                        }}
                                    >
                                        분류 완료
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontWeight: 700,
                                            color: "#15803d",
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {effectiveCodedCount.toLocaleString()}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontWeight: 600,
                                            color: "#475569",
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {stats.dbCoded.toLocaleString()}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontWeight: 600,
                                            color: applyCodedText === "—" ? "#94a3b8" : "#ea580c",
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {applyCodedText}
                                    </td>
                                </tr>
                                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            fontWeight: 600,
                                            color: "#1e293b",
                                        }}
                                    >
                                        미분류
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontWeight: 700,
                                            color: effectiveUncCount > 0 ? "#dc2626" : "#1e293b",
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {effectiveUncCount.toLocaleString()}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontWeight: 600,
                                            color: stats.dbUnc > 0 ? "#dc2626" : "#64748b",
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {stats.dbUnc.toLocaleString()}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontWeight: 600,
                                            color: applyUncText === "—" ? "#94a3b8" : "#ea580c",
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {applyUncText}
                                    </td>
                                </tr>
                                <tr style={{ background: "#fcfcfd" }}>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            fontWeight: 700,
                                            color: "#0f172a",
                                        }}
                                    >
                                        전체 건수
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontWeight: 800,
                                            color: "#0f172a",
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {stats.total.toLocaleString()}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontWeight: 700,
                                            color: "#475569",
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {stats.dbTotal.toLocaleString()}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 14px",
                                            textAlign: "right",
                                            fontWeight: 700,
                                            color: applyTotalText === "—" ? "#94a3b8" : "#0f172a",
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {applyTotalText}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 5. 신규 / 변경 / 동일 / 코드북 보기 요약 배지 */}
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "6px",
                            marginBottom: "10px",
                        }}
                    >
                        {[
                            { label: "신규", val: `${Number(stats.neu || 0).toLocaleString()}`, color: "#15803d" },
                            { label: "변경", val: `${Number(stats.chg || 0).toLocaleString()}`, color: "#ea580c" },
                            { label: "동일", val: `${Number(stats.same || 0).toLocaleString()}`, color: "#1e293b" },
                            { label: "코드북 보기", val: `${Number(codesCount || 0).toLocaleString()}개`, color: "#64748b" },
                        ].map((b) => (
                            <span
                                key={b.label}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    padding: "3px 10px",
                                    borderRadius: "999px",
                                    border: "1px solid #e2e8f0",
                                    background: "#ffffff",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    color: "#64748b",
                                }}
                            >
                                <span style={{ fontSize: "12px" }}>{b.label}</span>
                                <b
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        color: b.color,
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {b.val}
                                </b>
                            </span>
                        ))}
                    </div>

                    {/* 6. 분류 완료 · DB 비교 상태 진단 배너 */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "9px 13px",
                            borderRadius: "8px",
                            background: effectiveUncCount === 0 ? "#f0fdf4" : "#fff7ed",
                            border: `1px solid ${effectiveUncCount === 0 ? "#bbf7d0" : "#fed7aa"}`,
                            color: effectiveUncCount === 0 ? "#15803d" : "#c2410c",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            marginBottom: "10px",
                        }}
                    >
                        {effectiveUncCount === 0 ? (
                            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                        ) : (
                            <AlertCircle size={15} style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: "12.5px" }}>
                            {effectiveUncCount === 0
                                ? pendingCount === 0
                                    ? "미분류 없이 모든 응답에 코드가 지정되어 있으며, 현재 DB 저장 내용과 동일합니다."
                                    : `미분류 없이 모든 응답에 코드가 지정되었습니다. 변경 응답 ${pendingCount.toLocaleString()}건이 DB에 반영됩니다.`
                                : `미분류 응답 ${stats.unc.toLocaleString()}건이 남아 있습니다. 아래 옵션을 체크하면 선택한 보기로 함께 저장됩니다.`}
                        </span>
                    </div>

                    {/* 7. 미분류 일괄 코드 지정 옵션 + Kendo 코드북 드롭다운 */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: `1px solid ${effectiveUncodedSave ? "#fdba74" : "#e2e8f0"
                                }`,
                            background:
                                stats.unc === 0
                                    ? "#f8fafc"
                                    : effectiveUncodedSave
                                        ? "#fff7ed"
                                        : "#ffffff",
                            opacity: stats.unc === 0 ? 0.72 : 1,
                        }}
                    >
                        <label
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: stats.unc === 0 ? "not-allowed" : "pointer",
                                fontSize: "13px",
                                fontWeight: 600,
                                color: stats.unc === 0 ? "#94a3b8" : "#1e293b",
                            }}
                        >
                            <input
                                type="checkbox"
                                disabled={stats.unc === 0}
                                checked={effectiveUncodedSave}
                                onChange={(e) => setSaveWithUncoded(e.target.checked)}
                            />
                            {stats.unc === 0 ? (
                                <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                                    미분류 응답 일괄 코드 지정 (해당 없음)
                                </span>
                            ) : (
                                <span style={{ fontSize: "13px" }}>
                                    미분류 응답{" "}
                                    <b style={{ fontSize: "13px", color: "#ea580c" }}>
                                        {stats.unc.toLocaleString()}건
                                    </b>
                                    을 선택한 보기로 일괄 지정하여 저장
                                </span>
                            )}
                        </label>

                        <div style={{ width: "220px", flexShrink: 0 }}>
                            <OsaDropDown
                                size="md"
                                disabled={stats.unc === 0}
                                options={fallbackOptions}
                                value={selectedFallbackObj.code}
                                onValueChange={(val) => {
                                    setSelectedFallbackKey(val);
                                    if (stats.unc > 0 && !saveWithUncoded) {
                                        setSaveWithUncoded(true);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* 8. 하단 최근 저장 시각 · 응답 변경 건수 + 저장하기 버튼 */}
                <div
                    className="popBtnS"
                    style={{
                        padding: "12px 22px",
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "12px",
                            color: "#64748b",
                            fontWeight: 500,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                        }}
                    >
                        최근 저장: {lastSavedDisplay} · 응답 변경{" "}
                        <b
                            style={{
                                fontSize: "12px",
                                color: pendingCount > 0 ? "#ea580c" : "#475569",
                            }}
                        >
                            {pendingCount.toLocaleString()}건
                        </b>
                    </div>

                    <div
                        className="btnWrap type04"
                        style={{ display: "flex", justifyContent: "flex-end", gap: "8px", margin: 0 }}
                    >
                        <Button
                            className="btnM btnTxt type01"
                            onClick={onClose}
                            disabled={saving}
                        >
                            취소
                        </Button>
                        <Button
                            className="btnM"
                            themeColor="primary"
                            disabled={saving}
                            onClick={handleConfirmSave}
                        >
                            {saving
                                ? "저장 중..."
                                : `저장하기 (${activeFinalCount.toLocaleString()}건)`}
                        </Button>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default OptionSettingSaveCompareModal;
