import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Search, FolderInput, Upload, Download, X } from "lucide-react";
import * as XLSX from "xlsx";
import moment from "moment";
import { modalContext } from "@/components/common/Modal.jsx";
import { searchImportProjects, getImportCodes, applyImportCodes } from "@/api/analysisApi.js";
import { cleanStr, extractList } from "./optionSettingUtils";

const normToken = (v) => {
    if (typeof v !== "string") return String(v ?? "").trim();
    return v.replace(/\s+/g, "").trim();
};

// 엑셀 첫 시트 1행(A1/B1 또는 A1 통합 문자열)에서 프로젝트번호/문항번호 추출
const readSheetHeaderIds = (ws) => {
    const a1Raw = String(ws?.A1?.w ?? ws?.A1?.v ?? "").trim();
    const b1Raw = String(ws?.B1?.w ?? ws?.B1?.v ?? "").trim();
    const a1 = normToken(a1Raw);
    const b1 = normToken(b1Raw);
    if (a1 && b1) return { xlsProject: a1, xlsQnum: b1 };

    if (a1Raw) {
        const parts = a1Raw.split(/[\s,:;|]+/).filter(Boolean);
        if (parts.length >= 2) {
            return { xlsProject: normToken(parts[0]), xlsQnum: normToken(parts[1]) };
        }
    }
    return { xlsProject: "", xlsQnum: "" };
};

// 엑셀 A3:G* 영역을 보기 목록 스키마로 파싱
const parseCodeExcelFirstSheet = async (file, allowedPairs = [], targetQnumForRows = "") => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    if (!ws) throw new Error("엑셀 첫 번째 시트를 찾을 수 없습니다.");

    const { xlsProject, xlsQnum } = readSheetHeaderIds(ws);
    if (!xlsProject || !xlsQnum) {
        throw new Error("엑셀 1행(A1/B1)에 웹프로젝트번호/문항번호가 없습니다.\n[보기엑셀샘플] 양식을 내려받아 작성해 주세요.");
    }

    const matched = allowedPairs.some(
        ([p, q]) =>
            normToken(p).toLowerCase() === xlsProject.toLowerCase() &&
            normToken(q).toLowerCase() === xlsQnum.toLowerCase()
    );
    if (!matched && allowedPairs.length > 0) {
        const [expP, expQ] = allowedPairs[0];
        throw new Error(
            `엑셀 헤더 값이 화면 기준값과 다릅니다.\n화면: ${expP} / ${expQ}\n엑셀: ${xlsProject} / ${xlsQnum}`
        );
    }

    const ref = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : null;
    const lastR = ref ? Math.max(2, ref.e.r) : 10000;
    const XLSrange = XLSX.utils.encode_range({
        s: { r: 2, c: 0 },
        e: { r: lastR, c: 6 },
    });

    const rawRows = XLSX.utils.sheet_to_json(ws, {
        range: XLSrange,
        header: ["lv1", "lv1code", "lv2", "lv2code", "lv3", "lv123code", "ex_gubun"],
        blankrows: false,
        defval: "",
        raw: false,
    });

    return rawRows
        .map((r, i) => ({
            no: i + 1,
            qnum: targetQnumForRows || xlsQnum,
            lv1: cleanStr(r.lv1),
            lv1code: cleanStr(r.lv1code),
            lv2: cleanStr(r.lv2),
            lv2code: cleanStr(r.lv2code),
            lv3: cleanStr(r.lv3),
            lv123code: cleanStr(r.lv123code),
            ex_gubun: cleanStr(r.ex_gubun) || "분석(수정가능)",
        }))
        .filter((x) => x.lv1 || x.lv2 || x.lv3 || x.lv123code);
};

/**
 * 분석 > 타 프로젝트/문항 보기 불러오기 모달 (기존 surveyon 주황색 테마 · 보기엑셀 업로드/샘플 지원)
 */
const OptionSettingImportModal = ({
    show,
    onClose,
    projectnum,
    qnum,
    displayQnum,
    qTitle,
    existingCodes = [],
    user,
    onApplied,
}) => {
    const modal = useContext(modalContext);
    const excelFileInputRef = useRef(null);
    const [searchText, setSearchText] = useState("");
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [projectItems, setProjectItems] = useState([]);
    const [selectedTarget, setSelectedTarget] = useState(null);

    const [codesLoading, setCodesLoading] = useState(false);
    const [targetCodes, setTargetCodes] = useState([]);
    const [codeFilter, setCodeFilter] = useState("");
    const [checkedIndexes, setCheckedIndexes] = useState(new Set());
    const [applying, setApplying] = useState(false);

    const handleSearchProjects = useCallback(async (keyword = "") => {
        setProjectsLoading(true);
        try {
            const res = await searchImportProjects(keyword);
            const list = extractList(res);
            setProjectItems(list);
        } catch (err) {
            console.error("[ImportModal] 프로젝트 검색 실패:", err);
            setProjectItems([]);
        } finally {
            setProjectsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!show) return;
        setSearchText("");
        setCodeFilter("");
        setSelectedTarget(null);
        setTargetCodes([]);
        setCheckedIndexes(new Set());
        handleSearchProjects("");
    }, [show, handleSearchProjects]);

    const handleSelectProjectItem = async (item) => {
        const targetPn =
            item?.target_projectnum ||
            item?.selprojectnum ||
            item?.projectnum ||
            item?.pof ||
            "";
        const targetQnum =
            item?.target_qnum || item?.project_qnum || item?.qnum || item?.merge_qnum || "";

        if (!targetPn || !targetQnum) return;
        setSelectedTarget({ ...item, targetPn, targetQnum });
        setCodeFilter("");
        setCodesLoading(true);
        try {
            const res = await getImportCodes(targetPn, targetQnum);
            const list = extractList(res);
            setTargetCodes(list);
            setCheckedIndexes(new Set(list.map((_, i) => i)));
        } catch (err) {
            console.error("[ImportModal] 타 문항 보기 조회 실패:", err);
            setTargetCodes([]);
            setCheckedIndexes(new Set());
        } finally {
            setCodesLoading(false);
        }
    };

    // 우측 보기 목록 내 검색 필터링 (원본 인덱스 보존)
    const filteredCodeEntries = useMemo(() => {
        const kw = codeFilter.trim().toLowerCase();
        const entries = targetCodes.map((c, idx) => ({ c, idx }));
        if (!kw) return entries;
        return entries.filter(({ c }) => {
            const sc = cleanStr(c.lv123code ?? c.code_num).toLowerCase();
            const l3 = cleanStr(c.lv3).toLowerCase();
            const l1 = cleanStr(c.lv1).toLowerCase();
            const l2 = cleanStr(c.lv2).toLowerCase();
            return (
                sc.includes(kw) ||
                l3.includes(kw) ||
                l1.includes(kw) ||
                l2.includes(kw)
            );
        });
    }, [targetCodes, codeFilter]);

    if (!show) return null;

    const allFilteredChecked =
        filteredCodeEntries.length > 0 &&
        filteredCodeEntries.every(({ idx }) => checkedIndexes.has(idx));

    const toggleAllFiltered = () => {
        setCheckedIndexes((prev) => {
            const next = new Set(prev);
            if (allFilteredChecked) {
                filteredCodeEntries.forEach(({ idx }) => next.delete(idx));
            } else {
                filteredCodeEntries.forEach(({ idx }) => next.add(idx));
            }
            return next;
        });
    };

    const toggleOne = (idx) => {
        setCheckedIndexes((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    // [보기엑셀샘플] 다운로드 (1행: 프로젝트번호/문항번호, 2행: 컬럼 헤더, 3행~: 보기 데이터/예시)
    const handleSampleDownload = () => {
        try {
            const baseProject = cleanStr(selectedTarget?.targetPn || projectnum);
            const baseQnum = cleanStr(selectedTarget?.targetQnum || qnum);
            if (!baseProject || !baseQnum) {
                modal.showErrorAlert("알림", "기준 프로젝트/문항 정보를 확인할 수 없습니다.");
                return;
            }

            const sourceList =
                targetCodes.length > 0
                    ? targetCodes
                    : (existingCodes || []).filter((c) => !c?.__pendingDelete);

            const dataRows =
                sourceList.length > 0
                    ? sourceList.map((c) => [
                          cleanStr(c.lv1),
                          cleanStr(c.lv1code),
                          cleanStr(c.lv2),
                          cleanStr(c.lv2code),
                          cleanStr(c.lv3),
                          cleanStr(c.lv123code ?? c.code_num),
                          cleanStr(c.ex_gubun) || "분석(수정가능)",
                      ])
                    : [
                          ["", "", "", "", "예시 소분류 1", "1", "분석(수정가능)"],
                          ["", "", "", "", "기타", "97", "분석(수정가능)"],
                      ];

            const aoa = [
                [
                    baseProject,
                    baseQnum,
                    "※ 1행(프로젝트번호/문항번호)과 2행(컬럼명)은 유지하고 3행부터 보기를 입력해 주세요.",
                    "",
                    "",
                    "",
                    "",
                ],
                [
                    "대분류(lv1)",
                    "대분류코드(lv1code)",
                    "중분류(lv2)",
                    "중분류코드(lv2code)",
                    "소분류(lv3)",
                    "소분류코드(lv123code)",
                    "보기유형(ex_gubun)",
                ],
                ...dataRows,
            ];

            const ws = XLSX.utils.aoa_to_sheet(aoa);
            ws["!cols"] = [
                { wch: 18 },
                { wch: 16 },
                { wch: 18 },
                { wch: 16 },
                { wch: 32 },
                { wch: 18 },
                { wch: 18 },
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "보기엑셀샘플");
            XLSX.writeFile(wb, `보기엑셀_샘플_${moment().format("YYYYMMDDHHmmss")}.xlsx`);
        } catch (err) {
            console.error("[ImportModal] 샘플 다운로드 오류:", err);
            modal.showErrorAlert("에러", "샘플 다운로드 중 오류가 발생했습니다.");
        }
    };

    // [보기엑셀 업로드] 파일 선택 및 검증 후 우측 보기 목록에 로드
    const handleExcelFileChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        const allowedPairs = [];
        if (selectedTarget?.targetPn && selectedTarget?.targetQnum) {
            allowedPairs.push([selectedTarget.targetPn, selectedTarget.targetQnum]);
        }
        if (projectnum && qnum) {
            allowedPairs.push([projectnum, qnum]);
        }
        if (projectnum && displayQnum && displayQnum !== qnum) {
            allowedPairs.push([projectnum, displayQnum]);
        }

        try {
            const rows = await parseCodeExcelFirstSheet(file, allowedPairs, qnum);
            if (rows.length === 0) {
                modal.showErrorAlert("알림", "엑셀 3행 이후에 유효한 보기 데이터가 없습니다.");
                return;
            }
            setSelectedTarget({
                targetPn: "엑셀 업로드",
                targetQnum: `${rows.length.toLocaleString()}건`,
                isExcelUploaded: true,
            });
            setCodeFilter("");
            setTargetCodes(rows);
            setCheckedIndexes(new Set(rows.map((_, i) => i)));
            modal.showAlert("알림", "엑셀을 불러왔습니다. (프로젝트/문항번호 검증 완료)");
        } catch (err) {
            console.error("[ImportModal] 보기엑셀 업로드 오류:", err);
            modal.showErrorAlert("에러", String(err?.message || err));
        }
    };

    const handleApply = async () => {
        const selectedList = targetCodes.filter((_, idx) => checkedIndexes.has(idx));
        if (selectedList.length === 0) {
            modal.showErrorAlert("알림", "불러올 보기를 1개 이상 선택해 주세요.");
            return;
        }
        setApplying(true);
        try {
            const res = await applyImportCodes(projectnum, qnum, selectedList, user);
            const ok =
                res?.ok === true ||
                String(res?.success) === "777" ||
                String(res?.success) === "200";
            if (ok) {
                await onApplied?.();
                modal.showAlert(
                    "알림",
                    `선택한 ${selectedList.length.toLocaleString()}건의 보기가 반영되었습니다.`
                );
                onClose?.();
            } else if (String(res?.success) === "768") {
                let dupList = [];
                try {
                    dupList =
                        typeof res?.resultjson === "string"
                            ? JSON.parse(res.resultjson)
                            : res?.resultjson || res?.duplicates || [];
                } catch {
                    dupList = [];
                }
                const dupText =
                    Array.isArray(dupList) && dupList.length > 0
                        ? "\n\n" +
                          dupList
                              .map((it) => `${it.lv3 || ""}(${it.lv123code || it.code_num || ""})`)
                              .join("\n")
                        : "";
                modal.showErrorAlert(
                    "알림",
                    (res?.message || "이미 등록된 보기가 있습니다.") + dupText
                );
            } else {
                modal.showErrorAlert(
                    "에러",
                    res?.message || res?.Message || "보기 반영에 실패했습니다."
                );
            }
        } catch (err) {
            console.error("[ImportModal] 보기 반영 실패:", err);
            modal.showErrorAlert("에러", "보기 반영 중 오류가 발생했습니다.");
        } finally {
            setApplying(false);
        }
    };

    const currentBadgeText = `${projectnum} · ${displayQnum || qnum}`;
    const subTitleText = qTitle
        ? `현재 문항(${displayQnum || qnum} · ${qTitle})에 다른 프로젝트·문항의 보기(코드북)를 가져옵니다.`
        : "다른 프로젝트·문항의 보기(코드북)를 검색하여 현재 문항으로 가져옵니다.";

    return (
        <article className="modal on orange-theme osa-modal" style={{ zIndex: 9992 }}>
            <div
                className="cmn_popup"
                style={{
                    width: "1180px",
                    maxWidth: "96vw",
                    height: "80vh",
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
                {/* 1. 모달 헤더 (한큐분석 HanqProgressModal .popTit 규격 통일) */}
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
                            타 프로젝트 보기 불러오기
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
                                {currentBadgeText}
                            </span>
                        </h3>
                    </div>
                    <a
                        className="btnClose"
                        onClick={() => {
                            if (!applying) onClose?.();
                        }}
                        title="닫기"
                        style={{
                            cursor: applying ? "not-allowed" : "pointer",
                            opacity: applying ? 0.35 : 1,
                        }}
                    >
                        <span className="hidden">close</span>
                    </a>
                </div>

                {/* 2. 본문 좌/우 2단 스플릿 레이아웃 */}
                <div
                    className="popCont"
                    style={{
                        flex: 1,
                        minHeight: 0,
                        padding: "16px 22px",
                        display: "grid",
                        gridTemplateColumns: "0.95fr 1.15fr",
                        gap: "14px",
                        overflow: "hidden",
                        backgroundColor: "#ffffff",
                    }}
                >
                    {/* 좌측 카드: 프로젝트/문항 검색 목록 */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            minHeight: 0,
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            overflow: "hidden",
                            backgroundColor: "#ffffff",
                        }}
                    >
                        {/* 좌측 상단 검색 바 (우측 상단 바와 동일한 48px 높이로 가로선 1:1 정렬) */}
                        <div
                            style={{
                                height: "48px",
                                minHeight: "48px",
                                padding: "0 12px",
                                background: "#f8fafc",
                                borderBottom: "1px solid #e2e8f0",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                                <Search
                                    size={14}
                                    color="#94a3b8"
                                    style={{
                                        position: "absolute",
                                        left: "10px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        pointerEvents: "none",
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="프로젝트번호, 프로젝트명, 문항번호 검색"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleSearchProjects(searchText);
                                        } else if (e.key === "Escape" && searchText) {
                                            setSearchText("");
                                        }
                                    }}
                                    style={{
                                        width: "100%",
                                        height: "32px",
                                        padding: searchText ? "0 28px 0 32px" : "0 10px 0 32px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        backgroundColor: "#ffffff",
                                        fontSize: "12.5px",
                                        color: "#0f172a",
                                        outline: "none",
                                        boxSizing: "border-box",
                                    }}
                                />
                                {searchText && (
                                    <button
                                        type="button"
                                        title="검색어 지우기"
                                        onClick={() => {
                                            setSearchText("");
                                            handleSearchProjects("");
                                        }}
                                        style={{
                                            position: "absolute",
                                            right: "6px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            width: "18px",
                                            height: "18px",
                                            border: "none",
                                            borderRadius: "50%",
                                            background: "transparent",
                                            color: "#94a3b8",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                            padding: 0,
                                        }}
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <Button
                                themeColor="primary"
                                className="btnM"
                                onClick={() => handleSearchProjects(searchText)}
                                disabled={projectsLoading}
                                style={{
                                    height: "32px",
                                    minWidth: "66px",
                                    padding: "0 12px",
                                    fontSize: "12.5px",
                                    fontWeight: 700,
                                    borderRadius: "6px",
                                    flexShrink: 0,
                                }}
                            >
                                {projectsLoading ? "조회중" : "검색"}
                            </Button>
                        </div>

                        <div className="osa-modal-table-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                            <table
                                style={{
                                    width: "100%",
                                    tableLayout: "fixed",
                                    borderCollapse: "collapse",
                                    display: "table",
                                }}
                            >
                                <colgroup>
                                    <col style={{ width: "134px" }} />
                                    <col />
                                    <col style={{ width: "108px" }} />
                                </colgroup>
                                <thead>
                                    <tr
                                        style={{
                                            height: "36px",
                                            background: "#f8f9fa",
                                            borderBottom: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <th
                                            style={{
                                                position: "sticky",
                                                top: 0,
                                                zIndex: 2,
                                                height: "36px",
                                                background: "#f8f9fa",
                                                padding: "0 10px",
                                                textAlign: "center",
                                                verticalAlign: "middle",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#475569",
                                                borderBottom: "1px solid #e2e8f0",
                                            }}
                                        >
                                            웹프로젝트
                                        </th>
                                        <th
                                            style={{
                                                position: "sticky",
                                                top: 0,
                                                zIndex: 2,
                                                height: "36px",
                                                background: "#f8f9fa",
                                                padding: "0 10px",
                                                textAlign: "center",
                                                verticalAlign: "middle",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#475569",
                                                borderBottom: "1px solid #e2e8f0",
                                            }}
                                        >
                                            프로젝트 · 문항명
                                        </th>
                                        <th
                                            style={{
                                                position: "sticky",
                                                top: 0,
                                                zIndex: 2,
                                                height: "36px",
                                                background: "#f8f9fa",
                                                padding: "0 10px",
                                                textAlign: "center",
                                                verticalAlign: "middle",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#475569",
                                                borderBottom: "1px solid #e2e8f0",
                                            }}
                                        >
                                            문항번호
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectItems.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                style={{
                                                    padding: "56px 16px",
                                                    textAlign: "center",
                                                    fontSize: "13px",
                                                    color: "#94a3b8",
                                                }}
                                            >
                                                {projectsLoading
                                                    ? "프로젝트·문항 목록을 불러오는 중입니다..."
                                                    : "검색된 프로젝트·문항이 없습니다."}
                                            </td>
                                        </tr>
                                    ) : (
                                        projectItems.map((item, idx) => {
                                            const pn = cleanStr(
                                                item.target_projectnum ||
                                                    item.selprojectnum ||
                                                    item.projectnum
                                            );
                                            const qn = cleanStr(
                                                item.target_qnum ||
                                                    item.project_qnum ||
                                                    item.qnum
                                            );
                                            const projTitle = cleanStr(
                                                item.pofname || item.projectname
                                            );
                                            const qText = cleanStr(
                                                item.question_fin || item.question_text
                                            );
                                            const primaryTitle = projTitle || qText || "-";
                                            const secondaryTitle =
                                                projTitle && qText && projTitle !== qText
                                                    ? qText
                                                    : "";

                                            const isBackup = /#backup#/i.test(qn);
                                            const shortQn = isBackup
                                                ? qn.replace(/#backup#.*$/i, " (백업)")
                                                : qn;

                                            const isSel =
                                                selectedTarget?.targetPn === pn &&
                                                selectedTarget?.targetQnum === qn;
                                            return (
                                                <tr
                                                    key={`${pn}_${qn}_${idx}`}
                                                    onClick={() => handleSelectProjectItem(item)}
                                                    style={{
                                                        cursor: "pointer",
                                                        borderBottom: "1px solid #f1f5f9",
                                                        background: isSel ? "#fff7ed" : "#ffffff",
                                                        transition: "background-color 0.12s ease",
                                                    }}
                                                >
                                                    <td
                                                        style={{
                                                            padding: "9px 10px 9px 14px",
                                                            textAlign: "left",
                                                            fontSize: "12.5px",
                                                            fontWeight: isSel ? 700 : 600,
                                                            color: isSel ? "#ea580c" : "#334155",
                                                            boxShadow: isSel
                                                                ? "inset 3px 0 0 #f97316"
                                                                : "none",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                            fontVariantNumeric: "tabular-nums",
                                                        }}
                                                        title={pn}
                                                    >
                                                        {pn}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "9px 10px",
                                                            textAlign: "left",
                                                            verticalAlign: "middle",
                                                        }}
                                                        title={
                                                            secondaryTitle
                                                                ? `${primaryTitle}\n${secondaryTitle}`
                                                                : primaryTitle
                                                        }
                                                    >
                                                        <div
                                                            style={{
                                                                fontSize: "12.5px",
                                                                fontWeight: isSel ? 600 : 400,
                                                                color: "#1e293b",
                                                                lineHeight: 1.4,
                                                                wordBreak: "keep-all",
                                                                display: "-webkit-box",
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: "vertical",
                                                                overflow: "hidden",
                                                            }}
                                                        >
                                                            {primaryTitle}
                                                        </div>
                                                        {secondaryTitle && (
                                                            <div
                                                                style={{
                                                                    marginTop: "2px",
                                                                    fontSize: "11.5px",
                                                                    color: "#64748b",
                                                                    lineHeight: 1.35,
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap",
                                                                }}
                                                            >
                                                                {secondaryTitle}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "9px 8px",
                                                            textAlign: "center",
                                                        }}
                                                        title={qn}
                                                    >
                                                        <span
                                                            style={{
                                                                display: "inline-block",
                                                                maxWidth: "92px",
                                                                padding: "2px 7px",
                                                                borderRadius: "5px",
                                                                background: isSel
                                                                    ? "#ffedd5"
                                                                    : isBackup
                                                                    ? "#f8fafc"
                                                                    : "#fff7ed",
                                                                border: `1px solid ${
                                                                    isSel
                                                                        ? "#fb923c"
                                                                        : isBackup
                                                                        ? "#cbd5e1"
                                                                        : "#fed7aa"
                                                                }`,
                                                                color: isBackup
                                                                    ? "#64748b"
                                                                    : "#ea580c",
                                                                fontSize: "11.5px",
                                                                fontWeight: 700,
                                                                lineHeight: 1.3,
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                                verticalAlign: "middle",
                                                            }}
                                                        >
                                                            {shortQn}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 우측 카드: 선택한 문항의 보기 목록 */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            minHeight: 0,
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            overflow: "hidden",
                            backgroundColor: "#ffffff",
                        }}
                    >
                        {/* 우측 상단 상태·필터 바 (좌측과 동일하게 48px 높이) */}
                        <div
                            style={{
                                height: "48px",
                                minHeight: "48px",
                                padding: "0 14px",
                                background: "#f8fafc",
                                borderBottom: "1px solid #e2e8f0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "10px",
                                flexShrink: 0,
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "7px",
                                    minWidth: 0,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "12.5px",
                                        fontWeight: 700,
                                        color: "#1e293b",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    보기 목록
                                </span>
                                {targetCodes.length > 0 && (
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            color: "#64748b",
                                            fontWeight: 600,
                                            whiteSpace: "nowrap",
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        (선택{" "}
                                        <b style={{ fontSize: "12px", color: "#ea580c" }}>
                                            {checkedIndexes.size.toLocaleString()}
                                        </b>
                                        /{targetCodes.length.toLocaleString()}건)
                                    </span>
                                )}
                            </div>

                            <div
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    flexShrink: 0,
                                }}
                            >
                                {targetCodes.length > 0 && (
                                    <div style={{ position: "relative", width: "136px" }}>
                                        <Search
                                            size={13}
                                            color="#94a3b8"
                                            style={{
                                                position: "absolute",
                                                left: "8px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                pointerEvents: "none",
                                            }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="보기명·코드 필터"
                                            value={codeFilter}
                                            onChange={(e) => setCodeFilter(e.target.value)}
                                            style={{
                                                width: "100%",
                                                height: "30px",
                                                padding: "0 8px 0 26px",
                                                borderRadius: "6px",
                                                border: "1px solid #cbd5e1",
                                                backgroundColor: "#ffffff",
                                                fontSize: "12px",
                                                color: "#0f172a",
                                                outline: "none",
                                                boxSizing: "border-box",
                                            }}
                                        />
                                    </div>
                                )}

                                <input
                                    ref={excelFileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    style={{ display: "none" }}
                                    onChange={handleExcelFileChange}
                                />

                                <button
                                    type="button"
                                    className="osa-btn"
                                    style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                                    onClick={() => excelFileInputRef.current?.click()}
                                >
                                    <Upload size={13} />
                                    <span>보기엑셀 업로드</span>
                                    <span
                                        className="info-icon"
                                        onClick={(e) => e.stopPropagation()}
                                        data-tooltip={`보기엑셀 업로드|보기엑셀샘플 지침에 따라 보기를 수동으로 업로드하여 하단 [선택 보기 반영] 버튼으로 등록할 수 있습니다.`}
                                    />
                                </button>

                                <button
                                    type="button"
                                    className="osa-btn"
                                    style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                                    onClick={handleSampleDownload}
                                    title="현재(또는 선택) 문항 기준 보기엑셀 샘플 다운로드"
                                >
                                    <Download size={13} />
                                    <span>보기엑셀샘플</span>
                                </button>
                            </div>
                        </div>

                        <div
                            className={selectedTarget || codesLoading ? "osa-modal-table-scroll" : ""}
                            style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}
                        >
                            {!selectedTarget && !codesLoading ? (
                                <div
                                    style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "10px",
                                        padding: "32px 20px",
                                        color: "#94a3b8",
                                        textAlign: "center",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "44px",
                                            height: "44px",
                                            borderRadius: "12px",
                                            background: "#fff7ed",
                                            border: "1px solid #fed7aa",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#f97316",
                                        }}
                                    >
                                        <FolderInput size={20} />
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "13px",
                                            fontWeight: 600,
                                            color: "#475569",
                                        }}
                                    >
                                        좌측에서 프로젝트·문항을 클릭해 주세요
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                                        선택한 문항의 대·중·소분류 보기 목록을 미리 확인하고 원하는 항목만 골라 반영할 수 있습니다.
                                    </div>
                                </div>
                            ) : (
                                <table
                                    style={{
                                        width: "100%",
                                        tableLayout: "fixed",
                                        borderCollapse: "collapse",
                                        display: "table",
                                    }}
                                >
                                    <colgroup>
                                        <col style={{ width: "42px" }} />
                                        <col style={{ width: "23%" }} />
                                        <col style={{ width: "23%" }} />
                                        <col style={{ width: "80px" }} />
                                        <col />
                                    </colgroup>
                                    <thead>
                                        <tr
                                            style={{
                                                height: "36px",
                                                background: "#f8f9fa",
                                                borderBottom: "1px solid #e2e8f0",
                                            }}
                                        >
                                            <th
                                                style={{
                                                    position: "sticky",
                                                    top: 0,
                                                    zIndex: 2,
                                                    height: "36px",
                                                    background: "#f8f9fa",
                                                    padding: "0 6px",
                                                    textAlign: "center",
                                                    verticalAlign: "middle",
                                                    borderBottom: "1px solid #e2e8f0",
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={allFilteredChecked}
                                                    onChange={toggleAllFiltered}
                                                    disabled={filteredCodeEntries.length === 0}
                                                />
                                            </th>
                                            <th
                                                style={{
                                                    position: "sticky",
                                                    top: 0,
                                                    zIndex: 2,
                                                    height: "36px",
                                                    background: "#f8f9fa",
                                                    padding: "0 10px",
                                                    textAlign: "center",
                                                    verticalAlign: "middle",
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                    color: "#475569",
                                                    borderBottom: "1px solid #e2e8f0",
                                                }}
                                            >
                                                대분류
                                            </th>
                                            <th
                                                style={{
                                                    position: "sticky",
                                                    top: 0,
                                                    zIndex: 2,
                                                    height: "36px",
                                                    background: "#f8f9fa",
                                                    padding: "0 10px",
                                                    textAlign: "center",
                                                    verticalAlign: "middle",
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                    color: "#475569",
                                                    borderBottom: "1px solid #e2e8f0",
                                                }}
                                            >
                                                중분류
                                            </th>
                                            <th
                                                style={{
                                                    position: "sticky",
                                                    top: 0,
                                                    zIndex: 2,
                                                    height: "36px",
                                                    background: "#f8f9fa",
                                                    padding: "0 8px",
                                                    textAlign: "center",
                                                    verticalAlign: "middle",
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                    color: "#475569",
                                                    borderBottom: "1px solid #e2e8f0",
                                                }}
                                            >
                                                소코드
                                            </th>
                                            <th
                                                style={{
                                                    position: "sticky",
                                                    top: 0,
                                                    zIndex: 2,
                                                    height: "36px",
                                                    background: "#f8f9fa",
                                                    padding: "0 10px",
                                                    textAlign: "center",
                                                    verticalAlign: "middle",
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                    color: "#475569",
                                                    borderBottom: "1px solid #e2e8f0",
                                                }}
                                            >
                                                소분류명
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {codesLoading ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    style={{
                                                        padding: "56px 16px",
                                                        textAlign: "center",
                                                        fontSize: "13px",
                                                        color: "#ea580c",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    보기 목록을 불러오는 중입니다...
                                                </td>
                                            </tr>
                                        ) : filteredCodeEntries.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    style={{
                                                        padding: "56px 16px",
                                                        textAlign: "center",
                                                        fontSize: "13px",
                                                        color: "#94a3b8",
                                                    }}
                                                >
                                                    {targetCodes.length === 0
                                                        ? "해당 문항에 등록된 보기 데이터가 없습니다."
                                                        : "필터 조건과 일치하는 보기가 없습니다."}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCodeEntries.map(({ c, idx }) => {
                                                const checked = checkedIndexes.has(idx);
                                                const codeVal = cleanStr(
                                                    c.lv123code ?? c.code_num
                                                );
                                                const lv1Val = cleanStr(c.lv1);
                                                const lv2Val = cleanStr(c.lv2);
                                                const lv3Val = cleanStr(c.lv3);
                                                return (
                                                    <tr
                                                        key={`${codeVal}_${idx}`}
                                                        onClick={() => toggleOne(idx)}
                                                        style={{
                                                            cursor: "pointer",
                                                            borderBottom: "1px solid #f1f5f9",
                                                            background: checked
                                                                ? "#fffaf5"
                                                                : "#ffffff",
                                                        }}
                                                    >
                                                        <td
                                                            style={{
                                                                padding: "8px 6px",
                                                                textAlign: "center",
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggleOne(idx)}
                                                            />
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: "8px 10px",
                                                                textAlign: "left",
                                                                fontSize: "12.5px",
                                                                color: lv1Val
                                                                    ? "#475569"
                                                                    : "#cbd5e1",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                            title={lv1Val}
                                                        >
                                                            {lv1Val || "—"}
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: "8px 10px",
                                                                textAlign: "left",
                                                                fontSize: "12.5px",
                                                                color: lv2Val
                                                                    ? "#475569"
                                                                    : "#cbd5e1",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                            title={lv2Val}
                                                        >
                                                            {lv2Val || "—"}
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: "8px 6px",
                                                                textAlign: "center",
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    minWidth: "28px",
                                                                    padding: "1px 7px",
                                                                    borderRadius: "5px",
                                                                    background: "#fff7ed",
                                                                    border: "1px solid #fed7aa",
                                                                    color: "#ea580c",
                                                                    fontSize: "12px",
                                                                    fontWeight: 700,
                                                                    fontVariantNumeric:
                                                                        "tabular-nums",
                                                                }}
                                                            >
                                                                {codeVal || "-"}
                                                            </span>
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: "8px 14px",
                                                                textAlign: "left",
                                                                fontSize: "13px",
                                                                fontWeight: checked ? 600 : 400,
                                                                color: "#0f172a",
                                                                wordBreak: "keep-all",
                                                            }}
                                                        >
                                                            {lv3Val || "-"}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. 하단 액션 바 */}
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
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 400 }}>
                        선택한 보기를 현재 문항 코드북에 즉시 반영합니다.
                    </div>
                    <div
                        className="btnWrap type04"
                        style={{ display: "flex", justifyContent: "flex-end", gap: "8px", margin: 0 }}
                    >
                        <Button className="btnM btnTxt type01" onClick={onClose} disabled={applying}>
                            취소
                        </Button>
                        <Button
                            className="btnM"
                            themeColor="primary"
                            disabled={applying || checkedIndexes.size === 0}
                            onClick={handleApply}
                        >
                            {applying
                                ? "반영 중..."
                                : `선택 보기 반영 (${checkedIndexes.size.toLocaleString()}건)`}
                        </Button>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default OptionSettingImportModal;
