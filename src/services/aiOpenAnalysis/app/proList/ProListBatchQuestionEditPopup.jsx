import React, { useState, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { RotateCcw, Check, X, SlidersHorizontal } from "lucide-react";

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

    // 찾을 단어 매칭 개수 계산
    const findMatchCount = findText.trim()
        ? Object.values(editedMap).filter(v => typeof v === "string" && v.includes(findText.trim())).length
        : 0;



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

    // 단일 행 원래대로 복구
    const handleRowReset = (rId) => {
        setEditedMap(prev => ({
            ...prev,
            [rId]: originalMap[rId] ?? ""
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
        const update_list = Object.keys(editedMap).map(id => ({
            id: String(id),
            question_fin: editedMap[id]
        }));
        onConfirm(update_list);
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
                <div className="popTit" style={{ height: "auto", padding: "16px 24px 14px 24px" }}>
                    <div>
                        <h3 style={{ display: "flex", alignItems: "center", fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: 0, lineHeight: "1.3" }}>
                            문항최종 일괄 수정
                        </h3>
                        <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0", fontWeight: "400", lineHeight: "1.3" }}>
                            선택한 <strong style={{ color: "#f97316" }}>{selectedRows.length}개 문항</strong>의 문항최종 레이블을 확인하고 개별 또는 일괄 도구로 수정할 수 있습니다.
                        </p>
                    </div>
                    <a className="btnClose" onClick={onClose}>
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
                    {/* 상단: 일괄 편집 도구 영역 (카드 영역 분리) */}
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
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
                                <SlidersHorizontal size={15} style={{ color: "#ea580c" }} />
                                <span>일괄 편집 도구</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleReset}
                                style={{
                                    background: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "6px",
                                    color: "#475569",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "4px 10px"
                                }}
                                title="수정 전 원래 내용으로 초기화"
                            >
                                <RotateCcw size={13} />
                                <span>전체 초기화</span>
                            </button>
                        </div>

                        {/* 영역 1: 특정 단어 찾아서 바꾸기 (치환) */}
                        <div
                            style={{
                                backgroundColor: "#ffffff",
                                border: findText.trim() && findMatchCount > 0 ? "1.5px solid #60a5fa" : "1px solid #e2e8f0",
                                borderRadius: "8px",
                                padding: "12px 14px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                                transition: "all 0.2s ease"
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155" }}>
                                        특정 단어 찾아서 바꾸기 (치환)
                                    </span>
                                    {findText.trim() && (
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                fontWeight: "700",
                                                color: findMatchCount > 0 ? "#1d4ed8" : "#64748b",
                                                backgroundColor: findMatchCount > 0 ? "#dbeafe" : "#f1f5f9",
                                                border: findMatchCount > 0 ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                                                padding: "2px 8px",
                                                borderRadius: "12px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "3px"
                                            }}
                                        >
                                            {findMatchCount > 0 ? `${findMatchCount}개 문항에서 발견됨` : "일치하는 문항 없음"}
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontSize: "11px", color: "#64748b" }}>
                                    1. 찾을 단어 입력 (실시간 표시) ➔ 2. 바꿀 단어 입력 후 치환
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>1. 찾을 단어</span>
                                    <input
                                        type="text"
                                        value={findText}
                                        onChange={(e) => setFindText(e.target.value)}
                                        placeholder="찾을 텍스트 입력"
                                        style={{
                                            height: "32px",
                                            width: "140px",
                                            padding: "0 10px",
                                            fontSize: "12px",
                                            border: findText.trim() && findMatchCount > 0 ? "1.5px solid #3b82f6" : "1px solid #cbd5e1",
                                            borderRadius: "6px",
                                            backgroundColor: findText.trim() && findMatchCount > 0 ? "#eff6ff" : "#f8fafc",
                                            outline: "none",
                                            fontWeight: findText.trim() ? "600" : "400",
                                            color: findText.trim() && findMatchCount > 0 ? "#1d4ed8" : "#1e293b"
                                        }}
                                        onFocus={(e) => (e.target.style.backgroundColor = "#fff")}
                                        onBlur={(e) => (e.target.style.backgroundColor = findText.trim() && findMatchCount > 0 ? "#eff6ff" : "#f8fafc")}
                                    />
                                </div>

                                <span style={{ color: "#94a3b8", fontWeight: "bold" }}>➔</span>

                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>2. 바꿀 단어</span>
                                    <input
                                        type="text"
                                        value={replaceText}
                                        onChange={(e) => setReplaceText(e.target.value)}
                                        placeholder="바꿀 텍스트 입력"
                                        style={{
                                            height: "32px",
                                            width: "140px",
                                            padding: "0 10px",
                                            fontSize: "12px",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "6px",
                                            backgroundColor: "#f8fafc",
                                            outline: "none"
                                        }}
                                        onFocus={(e) => (e.target.style.backgroundColor = "#fff")}
                                        onBlur={(e) => (e.target.style.backgroundColor = "#f8fafc")}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleReplace}
                                    disabled={!findText.trim() || findMatchCount === 0}
                                    style={{
                                        height: "32px",
                                        padding: "0 14px",
                                        backgroundColor: !findText.trim() || findMatchCount === 0 ? "#94a3b8" : "#ea580c",
                                        border: "none",
                                        color: "#ffffff",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        fontWeight: "700",
                                        cursor: !findText.trim() || findMatchCount === 0 ? "not-allowed" : "pointer",
                                        boxShadow: !findText.trim() || findMatchCount === 0 ? "none" : "0 1px 2px rgba(234, 88, 12, 0.2)",
                                        transition: "all 0.15s ease"
                                    }}
                                >
                                    {findMatchCount > 0 ? `치환 실행 (${findMatchCount}건)` : "치환 실행"}
                                </button>
                            </div>
                        </div>

                        {/* 영역 2: 전체 동일 문구로 일괄 변경 (덮어쓰기) */}
                        <div
                            style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                padding: "12px 14px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px"
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155" }}>
                                    전체 동일 문구로 일괄 변경 (덮어쓰기)
                                </span>
                                <span style={{ fontSize: "11px", color: "#64748b" }}>
                                    선택한 모든 문항의 문구가 작성한 문구로 동일하게 덮어씌워집니다.
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input
                                    type="text"
                                    value={bulkApplyText}
                                    onChange={(e) => setBulkApplyText(e.target.value)}
                                    placeholder="선택한 모든 문항에 일괄 덮어쓸 레이블 문구 입력"
                                    style={{
                                        height: "32px",
                                        flex: 1,
                                        padding: "0 10px",
                                        fontSize: "12px",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "6px",
                                        backgroundColor: "#f8fafc",
                                        outline: "none"
                                    }}
                                    onFocus={(e) => (e.target.style.backgroundColor = "#fff")}
                                    onBlur={(e) => (e.target.style.backgroundColor = "#f8fafc")}
                                />
                                <button
                                    type="button"
                                    onClick={handleBulkApply}
                                    disabled={!bulkApplyText.trim()}
                                    style={{
                                        height: "32px",
                                        padding: "0 14px",
                                        backgroundColor: !bulkApplyText.trim() ? "#94a3b8" : "#ea580c",
                                        border: "none",
                                        color: "#ffffff",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        fontWeight: "700",
                                        cursor: !bulkApplyText.trim() ? "not-allowed" : "pointer",
                                        whiteSpace: "nowrap",
                                        boxShadow: !bulkApplyText.trim() ? "none" : "0 1px 2px rgba(234, 88, 12, 0.2)",
                                        transition: "all 0.15s ease"
                                    }}
                                >
                                    전체 일괄 변경
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 하단: 선택 문항 테이블 리스트 (스크롤 및 헤더 고정 적용) */}
                    <div
                        style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: "10px",
                            overflowY: "auto",
                            maxHeight: "320px",
                            backgroundColor: "#ffffff"
                        }}
                    >
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #cbd5e1", color: "#475569", fontWeight: "700" }}>
                                    <th style={{ position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 2, padding: "9px 12px", textAlign: "center", width: "100px" }}>문번호</th>
                                    <th style={{ position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 2, padding: "9px 12px", textAlign: "center", width: "90px" }}>문항번호</th>
                                    <th style={{ position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 2, padding: "9px 12px", textAlign: "center", width: "90px" }}>통합그룹</th>
                                    <th style={{ position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 2, padding: "9px 12px", textAlign: "center" }}>문항최종 (수정)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedRows.map((r, idx) => {
                                    const rId = r.id ?? r.no;
                                    const currentFin = editedMap[rId] ?? "";
                                    const origFin = originalMap[rId] ?? "";
                                    const isChanged = currentFin !== origFin;
                                    const isMatchedByFind = Boolean(findText.trim() && currentFin.includes(findText.trim()));

                                    let rowBg = "#ffffff";
                                    if (isChanged && isMatchedByFind) rowBg = "#fef3c7";
                                    else if (isMatchedByFind) rowBg = "#eff6ff";
                                    else if (isChanged) rowBg = "#fff7ed";

                                    return (
                                        <tr
                                            key={rId ?? idx}
                                            style={{
                                                borderBottom: idx === selectedRows.length - 1 ? "none" : "1px solid #f1f5f9",
                                                backgroundColor: rowBg,
                                                transition: "background-color 0.15s ease"
                                            }}
                                        >
                                            {/* 문번호 */}
                                            <td style={{
                                                padding: "8px 12px", textAlign: "center", fontWeight: "400"
                                            }}>
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
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <input
                                                        type="text"
                                                        value={currentFin}
                                                        onChange={(e) => handleRowChange(rId, e.target.value)}
                                                        style={{
                                                            flex: 1,
                                                            height: "32px",
                                                            padding: "0 10px",
                                                            boxSizing: "border-box",
                                                            fontSize: "12px",
                                                            fontWeight: isChanged || isMatchedByFind ? "700" : "400",
                                                            color: isChanged ? "#ea580c" : isMatchedByFind ? "#1d4ed8" : "#1e293b",
                                                            border: isMatchedByFind
                                                                ? "1.5px solid #3b82f6"
                                                                : isChanged
                                                                    ? "1.5px solid #f97316"
                                                                    : "1px solid #cbd5e1",
                                                            borderRadius: "6px",
                                                            backgroundColor: isMatchedByFind ? "#eff6ff" : "#ffffff",
                                                            outline: "none"
                                                        }}
                                                    />
                                                    {isChanged && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRowReset(rId)}
                                                            style={{
                                                                height: "32px",
                                                                padding: "0 8px",
                                                                backgroundColor: "#ffffff",
                                                                border: "1px solid #fdba74",
                                                                color: "#ea580c",
                                                                borderRadius: "6px",
                                                                fontSize: "11.5px",
                                                                fontWeight: "600",
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "4px",
                                                                whiteSpace: "nowrap",
                                                                boxShadow: "0 1px 2px rgba(234, 88, 12, 0.1)",
                                                                transition: "all 0.15s ease"
                                                            }}
                                                            title="이 문항만 원래 내용으로 복구"
                                                        >
                                                            <RotateCcw size={12} />
                                                        </button>
                                                    )}
                                                </div>
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
                            <span>저장</span>
                        </Button>
                    </div>
                </div>
            </div>
        </article >
    );
};

export default React.memo(ProListBatchQuestionEditPopup);
