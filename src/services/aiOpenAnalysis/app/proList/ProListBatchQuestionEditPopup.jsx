import React, { useState, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Edit3, RotateCcw, Check, X } from "lucide-react";

/**
 * 문항 목록 > 선택문항 문항최종 일괄 수정 팝업 (cmn_popup 디자인 시스템 적용)
 */
const ProListBatchQuestionEditPopup = ({ show, onClose, selectedRows = [], onConfirm }) => {
    // 선택한 각 행별 문항최종(question_fin) 맵: { [id]: string }
    const [editedMap, setEditedMap] = useState({});
    const [originalMap, setOriginalMap] = useState({});

    // 일괄 도구 입력 상태
    const [findText, setFindText] = useState("");
    const [replaceText, setReplaceText] = useState("");
    const [bulkApplyText, setBulkApplyText] = useState("");

    useEffect(() => {
        if (show && selectedRows.length > 0) {
            const initialMap = {};
            selectedRows.forEach(r => {
                const rId = r.id ?? r.no;
                const val = r.question_fin || r.question_orig || r.question || "";
                initialMap[rId] = val;
            });
            setEditedMap(initialMap);
            setOriginalMap(initialMap);
            setFindText("");
            setReplaceText("");
            setBulkApplyText("");
        }
    }, [show, selectedRows]);

    if (!show || selectedRows.length === 0) return null;

    // 단일 행 수정
    const handleRowChange = (rId, newText) => {
        setEditedMap(prev => ({
            ...prev,
            [rId]: newText
        }));
    };

    // 치환 실행
    const handleReplace = () => {
        if (!findText) {
            alert("찾을 단어를 입력해 주세요.");
            return;
        }
        setEditedMap(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(id => {
                if (next[id] && next[id].includes(findText)) {
                    next[id] = next[id].split(findText).join(replaceText);
                }
            });
            return next;
        });
    };

    // 일괄 적용 실행
    const handleBulkApply = () => {
        if (!bulkApplyText.trim()) {
            alert("일괄 적용할 문구를 입력해 주세요.");
            return;
        }
        setEditedMap(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(id => {
                next[id] = bulkApplyText;
            });
            return next;
        });
    };

    // 원래대로 초기화
    const handleReset = () => {
        setEditedMap({ ...originalMap });
        setFindText("");
        setReplaceText("");
        setBulkApplyText("");
    };

    // 저장 확정
    const handleSave = () => {
        onConfirm(editedMap);
    };

    return (
        <article className="modal on" style={{ zIndex: 999999 }}>
            <div
                className="cmn_popup"
                style={{
                    width: "720px",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden"
                }}
            >
                {/* 1. 공통 헤더 (.popTit) */}
                <div className="popTit" style={{ padding: "18px 24px 14px 24px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            backgroundColor: "#fff7ed",
                            border: "1px solid #ffedd5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ea580c",
                            flexShrink: 0
                        }}>
                            <Edit3 size={18} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: 0, lineHeight: "1.3" }}>
                                문항최종 일괄 수정
                            </h3>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "3px 0 0 0" }}>
                                선택한 <strong style={{ color: "#ea580c" }}>{selectedRows.length}개 문항</strong>의 문항최종 레이블을 확인하고 개별 또는 일괄 도구로 수정할 수 있습니다.
                            </p>
                        </div>
                    </div>
                    <a className="btnClose" onClick={onClose} style={{ top: "18px", right: "20px" }}>
                        <span className="hidden">close</span>
                    </a>
                </div>

                {/* 2. 공통 바디 (.popCont) */}
                <div
                    className="popCont"
                    style={{
                        flex: 1,
                        padding: "20px 24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "18px",
                        overflowY: "auto"
                    }}
                >
                    {/* 상단: 일괄 편집 도구 영역 */}
                    <div
                        style={{
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                <span>🎛️ 일괄 편집 도구</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleReset}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#64748b",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "2px 6px"
                                }}
                                title="수정 전 원래 내용으로 초기화"
                            >
                                <RotateCcw size={12} />
                                <span>원래대로 초기화</span>
                            </button>
                        </div>

                        {/* 줄 1: 치환 */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "12px", color: "#475569", fontWeight: "500" }}>찾을 단어:</span>
                                <input
                                    type="text"
                                    value={findText}
                                    onChange={(e) => setFindText(e.target.value)}
                                    placeholder="찾을 텍스트"
                                    style={{
                                        height: "32px",
                                        width: "130px",
                                        padding: "0 10px",
                                        fontSize: "12px",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "6px",
                                        backgroundColor: "#ffffff",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "12px", color: "#475569", fontWeight: "500" }}>바꿀 단어:</span>
                                <input
                                    type="text"
                                    value={replaceText}
                                    onChange={(e) => setReplaceText(e.target.value)}
                                    placeholder="바꿀 텍스트"
                                    style={{
                                        height: "32px",
                                        width: "140px",
                                        padding: "0 10px",
                                        fontSize: "12px",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "6px",
                                        backgroundColor: "#ffffff",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleReplace}
                                style={{
                                    height: "32px",
                                    padding: "0 14px",
                                    backgroundColor: "#ea580c",
                                    border: "1px solid #c2410c",
                                    color: "#ffffff",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    boxShadow: "0 1px 2px rgba(234, 88, 12, 0.2)"
                                }}
                            >
                                치환
                            </button>
                        </div>

                        {/* 줄 2: 일괄 적용 */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "12px", color: "#475569", fontWeight: "500" }}>일괄 적용 문구:</span>
                            <input
                                type="text"
                                value={bulkApplyText}
                                onChange={(e) => setBulkApplyText(e.target.value)}
                                placeholder="일괄 적용할 레이블 문구 입력"
                                style={{
                                    height: "32px",
                                    flex: 1,
                                    padding: "0 10px",
                                    fontSize: "12px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "6px",
                                    backgroundColor: "#ffffff",
                                    outline: "none"
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleBulkApply}
                                style={{
                                    height: "32px",
                                    padding: "0 14px",
                                    backgroundColor: "#ffffff",
                                    border: "1.5px solid #ea580c",
                                    color: "#ea580c",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    cursor: "pointer"
                                }}
                            >
                                일괄 적용
                            </button>
                        </div>
                    </div>

                    {/* 하단: 선택 문항 테이블 리스트 */}
                    <div
                        style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: "10px",
                            overflow: "hidden",
                            backgroundColor: "#ffffff"
                        }}
                    >
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #cbd5e1", color: "#475569", fontWeight: "700" }}>
                                    <th style={{ padding: "9px 12px", textAlign: "center", width: "100px" }}>문번호</th>
                                    <th style={{ padding: "9px 12px", textAlign: "center", width: "90px" }}>문항번호</th>
                                    <th style={{ padding: "9px 12px", textAlign: "center", width: "90px" }}>통합그룹</th>
                                    <th style={{ padding: "9px 12px", textAlign: "center" }}>문항최종 (수정)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedRows.map((r, idx) => {
                                    const rId = r.id ?? r.no;
                                    const currentFin = editedMap[rId] ?? "";
                                    const origFin = originalMap[rId] ?? "";
                                    const isChanged = currentFin !== origFin;

                                    return (
                                        <tr
                                            key={rId ?? idx}
                                            style={{
                                                borderBottom: idx === selectedRows.length - 1 ? "none" : "1px solid #f1f5f9",
                                                backgroundColor: isChanged ? "#fff7ed" : "#ffffff"
                                            }}
                                        >
                                            {/* 문번호 */}
                                            <td style={{ padding: "8px 12px", textAlign: "center", color: "#64748b", fontFamily: "monospace" }}>
                                                {r.qnum || r.no}
                                            </td>

                                            {/* 문항번호 */}
                                            <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: "700", color: "#ea580c" }}>
                                                {r.qnum_text || r.qnum}
                                            </td>

                                            {/* 통합그룹 */}
                                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                                <span style={{
                                                    backgroundColor: "#fff7ed",
                                                    border: "1px solid #fed7aa",
                                                    color: "#c2410c",
                                                    padding: "2px 8px",
                                                    borderRadius: "10px",
                                                    fontSize: "11px",
                                                    fontWeight: "600"
                                                }}>
                                                    {r.merge_qnum || r.qnum_text || r.qnum}
                                                </span>
                                            </td>

                                            {/* 문항최종 (수정) */}
                                            <td style={{ padding: "6px 12px" }}>
                                                <input
                                                    type="text"
                                                    value={currentFin}
                                                    onChange={(e) => handleRowChange(rId, e.target.value)}
                                                    style={{
                                                        width: "100%",
                                                        height: "32px",
                                                        padding: "0 10px",
                                                        boxSizing: "border-box",
                                                        fontSize: "12px",
                                                        fontWeight: isChanged ? "600" : "400",
                                                        color: isChanged ? "#ea580c" : "#1e293b",
                                                        border: isChanged ? "1.5px solid #f97316" : "1px solid #cbd5e1",
                                                        borderRadius: "6px",
                                                        backgroundColor: "#ffffff",
                                                        outline: "none"
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. 하단 푸터 영역 */}
                <div
                    style={{
                        padding: "14px 24px",
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "#ffffff"
                    }}
                >
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        * 저장 시 선택한 문항의 문항최종 레이블이 일괄 업데이트됩니다.
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                            className="btnM"
                            onClick={onClose}
                            style={{
                                minWidth: "75px",
                                height: "36px",
                                fontSize: "13px",
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
                            onClick={handleSave}
                            style={{
                                backgroundColor: "#ea580c",
                                borderColor: "#ea580c",
                                color: "#ffffff",
                                minWidth: "90px",
                                height: "36px",
                                fontSize: "13px",
                                fontWeight: "700",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px"
                            }}
                        >
                            <Check size={14} />
                            <span>저장</span>
                        </Button>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default React.memo(ProListBatchQuestionEditPopup);
