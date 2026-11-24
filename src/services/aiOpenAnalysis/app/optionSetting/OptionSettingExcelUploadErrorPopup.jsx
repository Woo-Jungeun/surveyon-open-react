import React, { useMemo, useEffect } from "react";
import { AlertCircle } from "lucide-react";

/**
 * 분석 > 엑셀 업로드 오류 코딩 결과 팝업 (분석 모달 공통 헤더 · 주황 브랜드 테마 규격 통일)
 *
 * @author jewoo
 * @since 2025-10-24
 */
const OptionSettingExcelUploadErrorPopup = ({
    popupShow,
    onClose,
    errorList = [],
    projectnum = "",
    qnum = "",
    displayQnum = "",
    qTitle = "",
}) => {
    useEffect(() => {
        if (!popupShow) return undefined;
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose?.(false);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [popupShow, onClose]);

    /** 구분별 데이터 분리 */
    const { answerErrors, viewErrors } = useMemo(() => {
        const answer = [];
        const view = [];
        (errorList || []).forEach((item) => {
            const gb = (item?.error_gb || "").trim();
            if (gb === "응답자") answer.push(item);
            else if (gb === "보기") view.push(item);
        });
        return { answerErrors: answer, viewErrors: view };
    }, [errorList]);

    if (!popupShow) return null;

    const badgeLabel = String(displayQnum || qnum || "").trim();
    const cleanQTitle = String(qTitle || "").trim();
    const questionSubTitle = cleanQTitle
        ? badgeLabel
            ? `[${badgeLabel}] ${cleanQTitle}`
            : cleanQTitle
        : projectnum && badgeLabel
          ? `${projectnum} / ${badgeLabel}`
          : "";

    /** 공통 오류 테이블 렌더러 */
    const ErrorTable = ({ rows }) => {
        if (!rows?.length) {
            return (
                <div
                    style={{
                        padding: "24px 12px",
                        color: "#94a3b8",
                        textAlign: "center",
                        fontSize: "13px",
                    }}
                >
                    조회된 데이터가 없습니다.
                </div>
            );
        }

        return (
            <div
                className="osa-modal-table-scroll"
                style={{
                    overflowY: "auto",
                    overflowX: "auto",
                    maxHeight: "280px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                }}
            >
                <table
                    style={{
                        width: "100%",
                        minWidth: "820px",
                        borderCollapse: "collapse",
                        borderSpacing: 0,
                        tableLayout: "fixed",
                        fontSize: "12.5px",
                    }}
                >
                    <colgroup>
                        <col style={{ width: "145px" }} />
                        <col style={{ width: "72px" }} />
                        <col style={{ width: "auto" }} />
                        <col style={{ width: "110px" }} />
                        <col style={{ width: "160px" }} />
                        <col style={{ width: "150px" }} />
                    </colgroup>

                    <thead>
                        <tr
                            style={{
                                position: "sticky",
                                top: 0,
                                zIndex: 2,
                                backgroundColor: "#f8fafc",
                                borderBottom: "1px solid #e2e8f0",
                            }}
                        >
                            {[
                                { label: "key", align: "center" },
                                { label: "복수", align: "center" },
                                { label: "응답내용", align: "left" },
                                { label: "소분류코드", align: "center" },
                                { label: "소분류", align: "left" },
                                { label: "에러내용", align: "center" },
                            ].map((col) => (
                                <th
                                    key={col.label}
                                    style={{
                                        padding: "9px 10px",
                                        textAlign: col.align,
                                        fontWeight: 700,
                                        fontSize: "12px",
                                        color: "#475569",
                                        backgroundColor: "#f8fafc",
                                        borderBottom: "1px solid #e2e8f0",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((r, idx) => {
                            const codeText = String(r?.lv123code ?? "").trim();
                            const lv3Text = String(r?.lv3 ?? "").trim();
                            return (
                                <tr
                                    key={`${r?.fixed_key || r?.key || "row"}-${idx}`}
                                    style={{
                                        borderBottom:
                                            idx === rows.length - 1
                                                ? "none"
                                                : "1px solid #f1f5f9",
                                    }}
                                >
                                    <td
                                        style={{
                                            padding: "9px 10px",
                                            textAlign: "center",
                                            color: "#334155",
                                            fontWeight: 500,
                                            wordBreak: "break-all",
                                            verticalAlign: "middle",
                                        }}
                                    >
                                        {r?.fixed_key || r?.key || "—"}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 10px",
                                            textAlign: "center",
                                            color: "#64748b",
                                            verticalAlign: "middle",
                                        }}
                                    >
                                        {r?.cid || "—"}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 12px",
                                            textAlign: "left",
                                            color: "#1e293b",
                                            wordBreak: "break-all",
                                            whiteSpace: "normal",
                                            lineHeight: 1.45,
                                            verticalAlign: "middle",
                                        }}
                                    >
                                        {r?.answer_origin || "—"}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 10px",
                                            textAlign: "center",
                                            color: codeText ? "#ea580c" : "#cbd5e1",
                                            fontWeight: codeText ? 700 : 400,
                                            wordBreak: "break-all",
                                            verticalAlign: "middle",
                                        }}
                                    >
                                        {codeText || "—"}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 10px",
                                            textAlign: lv3Text ? "left" : "center",
                                            color: lv3Text ? "#334155" : "#cbd5e1",
                                            wordBreak: "break-all",
                                            verticalAlign: "middle",
                                        }}
                                    >
                                        {lv3Text || "—"}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 10px",
                                            textAlign: "center",
                                            verticalAlign: "middle",
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                padding: "2px 8px",
                                                borderRadius: "999px",
                                                backgroundColor: "#fef2f2",
                                                border: "1px solid #fecaca",
                                                color: "#dc2626",
                                                fontSize: "11.5px",
                                                fontWeight: 700,
                                                lineHeight: 1.3,
                                                wordBreak: "keep-all",
                                            }}
                                        >
                                            {r?.error_msg || "오류"}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    /** 섹션 타이틀 (미니멀 포인트 도트 + 볼드 라벨) */
    const SectionTitle = ({ label, count }) => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
            }}
        >
            <div style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                <span
                    aria-hidden="true"
                    style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "#f97316",
                        flexShrink: 0,
                    }}
                />
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e293b" }}>
                    {label}
                </span>
            </div>
            {typeof count === "number" && (
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        backgroundColor: "#fff1f2",
                        border: "1px solid #fecdd3",
                        color: "#e11d48",
                        fontSize: "11.5px",
                        fontWeight: 700,
                    }}
                >
                    오류 {count.toLocaleString()}건
                </span>
            )}
        </div>
    );

    return (
        <article className="modal on orange-theme osa-modal" style={{ zIndex: 9992 }}>
            <div
                className="cmn_popup"
                style={{
                    width: "960px",
                    maxWidth: "95vw",
                    maxHeight: "86vh",
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
                {/* 공통 분석 모달 규격 헤더 */}
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
                            엑셀 업로드 오류 코딩 결과
                            {badgeLabel && (
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
                                    {badgeLabel}
                                </span>
                            )}
                        </h3>
                    </div>

                    <a
                        className="btnClose"
                        onClick={() => onClose?.(false)}
                        title="닫기 (Esc)"
                        style={{ cursor: "pointer" }}
                    >
                        <span className="hidden">close</span>
                    </a>
                </div>

                {/* 본문 */}
                <div
                    className="popCont"
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "18px 24px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                    }}
                >
                    {/* 안내 배너 */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "11px 14px",
                            borderRadius: "8px",
                            backgroundColor: "#fff7ed",
                            border: "1px solid #fed7aa",
                            color: "#9a3412",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            flexShrink: 0,
                        }}
                    >
                        <AlertCircle size={15} color="#ea580c" style={{ flexShrink: 0 }} />
                        <span>현재 오류사항이 모두 적용되어야 정상적으로 업로드가 완료됩니다.</span>
                    </div>

                    {/* 보기 오류 목록 */}
                    {viewErrors.length > 0 && (
                        <div>
                            <SectionTitle label="보기 오류 목록" count={viewErrors.length} />
                            <ErrorTable rows={viewErrors} />
                        </div>
                    )}

                    {/* 응답자 오류 목록 */}
                    {answerErrors.length > 0 && (
                        <div>
                            <SectionTitle label="응답자 오류 목록" count={answerErrors.length} />
                            <ErrorTable rows={answerErrors} />
                        </div>
                    )}

                    {/* 데이터 없음 */}
                    {viewErrors.length === 0 && answerErrors.length === 0 && (
                        <div
                            style={{
                                padding: "32px 16px",
                                color: "#94a3b8",
                                textAlign: "center",
                                fontSize: "13px",
                            }}
                        >
                            조회된 데이터가 없습니다.
                        </div>
                    )}
                </div>

                {/* 하단 푸터 */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        padding: "12px 24px",
                        borderTop: "1px solid #e2e8f0",
                        backgroundColor: "#f8fafc",
                        flexShrink: 0,
                    }}
                >
                    <button
                        type="button"
                        onClick={() => onClose?.(false)}
                        style={{
                            height: "34px",
                            padding: "0 20px",
                            borderRadius: "8px",
                            border: "1px solid #ea580c",
                            backgroundColor: "#f97316",
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        확인
                    </button>
                </div>
            </div>
        </article>
    );
};

export default OptionSettingExcelUploadErrorPopup;
