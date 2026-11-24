import React, { useState, useMemo } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { isCodeLocked, normalizeCodeRows } from "./optionSettingUtils";

/**
 * 분석 > 엑셀 업로드 미리보기 모달 (기존 surveyon 주황색 테마 cmn_popup 상속)
 */
const OptionSettingExcelPreviewModal = ({
    show,
    onClose,
    previewData,
    existingCodes = [],
    qnum = "",
    displayQnum = "",
    qTitle = "",
    onApplyCodes,
}) => {
    const [applyMode, setApplyMode] = useState("merge"); // 'merge' | 'overwrite'

    const { rows, summary } = useMemo(() => {
        const existingMap = new Map();
        (existingCodes || [])
            .filter((c) => !c?.__pendingDelete)
            .forEach((c) => {
                const k = String(c?.lv123code ?? c?.code_num ?? "").trim();
                if (k) existingMap.set(k, c);
            });

        const rawList =
            previewData?.rows ||
            previewData?.items ||
            previewData?.codes ||
            previewData?.resultjson?.rows ||
            previewData?.resultjson?.items ||
            previewData?.resultjson?.codes ||
            (Array.isArray(previewData?.resultjson) ? previewData.resultjson : null) ||
            (Array.isArray(previewData?.data) ? previewData.data : null) ||
            previewData?.data?.rows ||
            [];

        let newCnt = 0;
        let modCnt = 0;
        let sameCnt = 0;
        let errCnt = 0;

        const mapped = (Array.isArray(rawList) ? rawList : []).map((r, idx) => {
            const code = String(r?.lv123code ?? r?.code_num ?? r?.code ?? "").trim();
            const lv3 = String(r?.lv3 ?? r?.label ?? r?.codeName ?? "").trim();
            const lv1 = String(r?.lv1 ?? "").trim();
            const lv1code = String(r?.lv1code ?? "").trim();
            const lv2 = String(r?.lv2 ?? "").trim();
            const lv2code = String(r?.lv2code ?? "").trim();
            const exGubun = String(r?.ex_gubun ?? "분석(수정가능)").trim();

            let status = String(r?.status ?? r?.row_status ?? "").toLowerCase();
            let errorMsg = String(r?.error_msg ?? r?.error ?? "").trim();

            if (!code || !lv3) {
                status = "error";
                if (!errorMsg) errorMsg = !code ? "소분류 코드 누락" : "소분류명 누락";
            } else if (!status) {
                const prev = existingMap.get(code);
                if (!prev) {
                    status = "new";
                } else if (isCodeLocked(prev) && String(prev.lv3 ?? "").trim() !== lv3) {
                    status = "same";
                    errorMsg = "수정불가 보기 유지";
                } else if (
                    String(prev.lv3 ?? "").trim() === lv3 &&
                    String(prev.lv1 ?? "").trim() === lv1 &&
                    String(prev.lv2 ?? "").trim() === lv2
                ) {
                    status = "same";
                } else {
                    status = "modified";
                }
            }

            if (status === "신규" || status === "add" || status === "added") status = "new";
            else if (status === "수정" || status === "update" || status === "updated" || status === "chg") status = "modified";
            else if (status === "유지" || status === "unchanged" || status === "keep") status = "same";
            else if (status === "오류" || status === "err" || status === "invalid") status = "error";

            if (status === "new") newCnt++;
            else if (status === "modified") modCnt++;
            else if (status === "error") errCnt++;
            else sameCnt++;

            return {
                no: idx + 1,
                lv1,
                lv1code,
                lv2,
                lv2code,
                lv3,
                lv123code: code,
                ex_gubun: exGubun || "분석(수정가능)",
                status,
                errorMsg,
            };
        });

        const serverSummary = previewData?.summary || previewData?.resultjson?.summary || previewData?.counts;
        return {
            rows: mapped,
            summary: {
                total: serverSummary?.total ?? mapped.length,
                newCount: serverSummary?.new ?? serverSummary?.added ?? newCnt,
                modCount: serverSummary?.modified ?? serverSummary?.updated ?? modCnt,
                sameCount: serverSummary?.same ?? serverSummary?.unchanged ?? sameCnt,
                errCount: serverSummary?.error ?? serverSummary?.errors ?? errCnt,
            },
        };
    }, [previewData, existingCodes]);

    if (!show) return null;

    const validRows = rows.filter((r) => r.status !== "error");

    const handleConfirm = () => {
        const activeExisting = (existingCodes || []).filter((c) => !c?.__pendingDelete);
        let nextCodes = [];

        if (applyMode === "overwrite") {
            // 덮어쓰기: 수정불가(설문지/트래킹 잠금) 보기는 보호 유지하고 업로드 보기로 교체
            const lockedExisting = activeExisting.filter((c) => isCodeLocked(c));
            const lockedCodeSet = new Set(
                lockedExisting.map((c) => String(c.lv123code ?? c.code_num ?? "").trim())
            );
            const incomingFiltered = validRows.filter((r) => !lockedCodeSet.has(r.lv123code));
            nextCodes = normalizeCodeRows([...lockedExisting, ...incomingFiltered], qnum);
        } else {
            // 병합(merge): 기존 코드 유지 + 동일 소코드는(수정불가 제외) 업데이트 + 신규 코드 추가
            const mergedMap = new Map();
            activeExisting.forEach((c) => {
                const k = String(c.lv123code ?? c.code_num ?? "").trim();
                if (k) mergedMap.set(k, { ...c });
            });
            validRows.forEach((r) => {
                const prev = mergedMap.get(r.lv123code);
                if (prev && isCodeLocked(prev)) return;
                mergedMap.set(r.lv123code, {
                    ...(prev || {}),
                    qnum,
                    lv1: r.lv1,
                    lv1code: r.lv1code,
                    lv2: r.lv2,
                    lv2code: r.lv2code,
                    lv3: r.lv3,
                    lv123code: r.lv123code,
                    ex_gubun: prev?.ex_gubun || r.ex_gubun || "분석(수정가능)",
                });
            });
            nextCodes = normalizeCodeRows(Array.from(mergedMap.values()), qnum);
        }

        onApplyCodes?.(nextCodes, applyMode);
        onClose?.();
    };

    const statusBadge = (st) => {
        if (st === "new")
            return { label: "신규", bg: "#fff7ed", color: "#ea580c", border: "#fdba74" };
        if (st === "modified")
            return { label: "수정", bg: "#fefce8", color: "#ca8a04", border: "#fde047" };
        if (st === "error")
            return { label: "오류", bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" };
        return { label: "유지", bg: "#f8fafc", color: "#64748b", border: "#cbd5e1" };
    };

    return (
        <article className="modal on orange-theme osa-modal" style={{ zIndex: 9992 }}>
            <div
                className="cmn_popup"
                style={{
                    width: "920px",
                    maxWidth: "95vw",
                    maxHeight: "88vh",
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
                            엑셀 보기 업로드 미리보기
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
                    <a className="btnClose" onClick={onClose} style={{ cursor: "pointer" }}>
                        <span className="hidden">close</span>
                    </a>
                </div>

                <div className="popCont" style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>
                    {/* 요약 카운트 바 */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(5, 1fr)",
                            gap: "10px",
                            marginBottom: "16px",
                        }}
                    >
                        {[
                            { label: "전체 건수", val: summary.total, color: "#1e293b", bg: "#f8fafc" },
                            { label: "신규 추가", val: summary.newCount, color: "#ea580c", bg: "#fff7ed" },
                            { label: "수정 반영", val: summary.modCount, color: "#b45309", bg: "#fffbeb" },
                            { label: "유지/보호", val: summary.sameCount, color: "#475569", bg: "#f8fafc" },
                            { label: "오류(제외)", val: summary.errCount, color: "#dc2626", bg: "#fef2f2" },
                        ].map((item) => (
                            <div
                                key={item.label}
                                style={{
                                    background: item.bg,
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    padding: "10px 12px",
                                    textAlign: "center",
                                }}
                            >
                                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                                    {item.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: "18px",
                                        fontWeight: 800,
                                        color: item.color,
                                        marginTop: "4px",
                                    }}
                                >
                                    {Number(item.val || 0).toLocaleString()}건
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 반영 방식 선택 (병합 / 덮어쓰기) */}
                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                            marginBottom: "14px",
                            padding: "12px 14px",
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: "8px",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#9a3412" }}>
                            반영 방식 선택
                        </span>
                        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                            <label
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: applyMode === "merge" ? 700 : 500,
                                    color: applyMode === "merge" ? "#ea580c" : "#475569",
                                }}
                            >
                                <input
                                    type="radio"
                                    name="excelApplyMode"
                                    checked={applyMode === "merge"}
                                    onChange={() => setApplyMode("merge")}
                                    style={{ accentColor: "#f97316" }}
                                />
                                기존 보기와 병합 (신규 추가 · 동일 코드 업데이트)
                            </label>
                            <label
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: applyMode === "overwrite" ? 700 : 500,
                                    color: applyMode === "overwrite" ? "#ea580c" : "#475569",
                                }}
                            >
                                <input
                                    type="radio"
                                    name="excelApplyMode"
                                    checked={applyMode === "overwrite"}
                                    onChange={() => setApplyMode("overwrite")}
                                    style={{ accentColor: "#f97316" }}
                                />
                                덮어쓰기 (수정불가 보기는 자동 유지)
                            </label>
                        </div>
                    </div>

                    {/* 행별 상태 테이블 */}
                    <div
                        style={{
                            maxHeight: "360px",
                            overflowY: "auto",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                        }}
                    >
                        <table
                            style={{
                                width: "100%",
                                tableLayout: "fixed",
                                borderCollapse: "collapse",
                                display: "table",
                                fontSize: "13px",
                            }}
                        >
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                    <th style={{ width: "55px", padding: "8px", textAlign: "center" }}>No</th>
                                    <th style={{ width: "75px", padding: "8px", textAlign: "center" }}>상태</th>
                                    <th style={{ width: "130px", padding: "8px", textAlign: "left" }}>대분류</th>
                                    <th style={{ width: "130px", padding: "8px", textAlign: "left" }}>중분류</th>
                                    <th style={{ width: "90px", padding: "8px", textAlign: "center" }}>소코드</th>
                                    <th style={{ padding: "8px", textAlign: "left" }}>소분류명</th>
                                    <th style={{ width: "130px", padding: "8px", textAlign: "left" }}>비고</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}
                                        >
                                            미리보기할 보기 데이터가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((r) => {
                                        const b = statusBadge(r.status);
                                        return (
                                            <tr
                                                key={`${r.no}_${r.lv123code}`}
                                                style={{ borderBottom: "1px solid #f1f5f9" }}
                                            >
                                                <td style={{ padding: "7px 8px", textAlign: "center" }}>{r.no}</td>
                                                <td style={{ padding: "7px 8px", textAlign: "center" }}>
                                                    <span
                                                        style={{
                                                            display: "inline-block",
                                                            padding: "2px 8px",
                                                            borderRadius: "4px",
                                                            fontSize: "11.5px",
                                                            fontWeight: 700,
                                                            background: b.bg,
                                                            color: b.color,
                                                            border: `1px solid ${b.border}`,
                                                        }}
                                                    >
                                                        {b.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "7px 8px" }}>
                                                    {r.lv1 ? `${r.lv1}${r.lv1code ? ` (${r.lv1code})` : ""}` : "-"}
                                                </td>
                                                <td style={{ padding: "7px 8px" }}>
                                                    {r.lv2 ? `${r.lv2}${r.lv2code ? ` (${r.lv2code})` : ""}` : "-"}
                                                </td>
                                                <td
                                                    style={{
                                                        padding: "7px 8px",
                                                        textAlign: "center",
                                                        fontWeight: 700,
                                                        color: "#ea580c",
                                                    }}
                                                >
                                                    {r.lv123code || "-"}
                                                </td>
                                                <td style={{ padding: "7px 8px" }}>{r.lv3 || "-"}</td>
                                                <td
                                                    style={{
                                                        padding: "7px 8px",
                                                        fontSize: "12px",
                                                        color: r.status === "error" ? "#dc2626" : "#64748b",
                                                    }}
                                                >
                                                    {r.errorMsg || "-"}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="popBtnS" style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9" }}>
                    <div className="btnWrap type04" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <Button className="btnM btnTxt type01" onClick={onClose}>
                            취소
                        </Button>
                        <Button
                            className="btnM"
                            themeColor="primary"
                            disabled={validRows.length === 0}
                            onClick={handleConfirm}
                        >
                            보기 목록에 반영 ({validRows.length}건)
                        </Button>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default OptionSettingExcelPreviewModal;

