import React, { useState, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";

/**
 * 문항 목록 > 선택문항 통합(묶기) 팝업 (프로젝트 공통 cmn_popup 디자인 시스템 적용)
 */
const ProListBatchMergePopup = ({ show, onClose, selectedRows = [], onConfirm }) => {
    const [targetQnum, setTargetQnum] = useState("");

    useEffect(() => {
        if (show && selectedRows.length > 0) {
            const first = selectedRows[0];
            const defaultVal = String(first.merge_qnum || first.qnum_text || first.qnum || "").trim();
            setTargetQnum(defaultVal);
        }
    }, [show, selectedRows]);

    if (!show || selectedRows.length === 0) return null;

    const handleConfirm = () => {
        const cleanVal = targetQnum.trim();
        if (!cleanVal) {
            alert("통합 문항번호를 입력해 주세요.");
            return;
        }
        onConfirm(cleanVal);
    };

    return (
        <article className="modal on" style={{ zIndex: 999999 }}>
            <div
                className="cmn_popup"
                style={{
                    width: "600px",
                    maxHeight: "85vh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden"
                }}
            >
                {/* 1. 공통 헤더 (.popTit) */}
                <div className="popTit">
                    <h3 style={{ display: "flex", alignItems: "center" }}>
                        문항 통합저장
                    </h3>
                    <a className="btnClose" onClick={onClose}>
                        <span className="hidden">close</span>
                    </a>
                </div>

                {/* 2. 공통 바디 (.popCont) */}
                <div
                    className="popCont"
                    style={{
                        flex: 1,
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        overflowY: "auto"
                    }}
                >
                    {/* 안내 텍스트 */}
                    <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                        선택한 <strong style={{ color: "#f97316" }}>{selectedRows.length}개 문항</strong>의 통합 문항번호(merge_qnum)를 확인하고 수정할 수 있습니다.
                    </div>

                    {/* 통합 문항번호 입력 영역 */}
                    <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
                            통합 문항번호 (merge_qnum) <span style={{ color: "#f97316" }}>*</span>
                        </div>
                        <input
                            autoFocus
                            type="text"
                            value={targetQnum}
                            onChange={(e) => setTargetQnum(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleConfirm();
                                if (e.key === "Escape") onClose();
                            }}
                            placeholder="통합 문항번호 입력"
                            style={{
                                width: "100%",
                                padding: "0 16px",
                                height: "40px",
                                boxSizing: "border-box",
                                fontSize: "14px",
                                fontWeight: "600",
                                border: "1px solid #fdba74",
                                borderRadius: "8px",
                                backgroundColor: "#ffffff",
                                color: "#1e293b",
                                outline: "none",
                                boxShadow: "0 0 0 3px #fff7ed",
                                transition: "all 0.2s ease"
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = "#f97316";
                                e.target.style.boxShadow = "0 0 0 3px #fff7ed";
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#fdba74";
                                e.target.style.boxShadow = "none";
                            }}
                        />
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                            * 이 번호로 묶여 저장되며, 코드화 결과도 입력한 통합 문항번호를 기준으로 묶입니다.
                        </div>
                    </div>

                    {/* 묶을 선택 문항 리스트 */}
                    <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
                            묶을 선택 문항 ({selectedRows.length}개)
                        </div>
                        <div
                            style={{
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                backgroundColor: "#ffffff",
                                maxHeight: "220px",
                                overflowY: "auto"
                            }}
                        >
                            {selectedRows.map((r, idx) => (
                                <div
                                    key={r.id ?? r.no ?? idx}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "10px 16px",
                                        borderBottom: idx === selectedRows.length - 1 ? "none" : "1px solid #f1f5f9"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0, paddingRight: "12px" }}>
                                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#f97316", width: "70px", flexShrink: 0 }}>
                                            {r.qnum_text || r.qnum || r.merge_qnum}
                                        </span>
                                        <span style={{ fontSize: "13px", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {r.question_fin || r.question_orig || r.question}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: "12px", color: "#94a3b8", flexShrink: 0 }}>
                                        응답 {(Number(r.status_cnt) || Number(r.respondent_cnt) || 0).toLocaleString()}명
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Action Buttons */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "8px",
                            marginTop: "8px",
                            paddingTop: "16px",
                            borderTop: "1px solid #e2e8f0"
                        }}
                    >
                        <Button
                            className="btnM"
                            onClick={onClose}
                            style={{
                                minWidth: "80px",
                                height: "36px",
                                fontSize: "14px",
                                backgroundColor: "#ffffff",
                                borderColor: "#cbd5e1",
                                color: "#475569"
                            }}
                        >
                            취소
                        </Button>
                        <Button
                            className="btnM"
                            themeColor="primary"
                            onClick={handleConfirm}
                            style={{
                                backgroundColor: "#F97316",
                                borderColor: "#F97316",
                                color: "#ffffff",
                                minWidth: "100px",
                                height: "36px",
                                fontSize: "14px",
                                fontWeight: "600",
                                flexShrink: 0
                            }}
                        >
                            묶어서 저장
                        </Button>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default React.memo(ProListBatchMergePopup);
