import React, {
    useState,
    useRef,
    forwardRef,
    useImperativeHandle,
    useCallback,
    useContext,
    useMemo,
    useEffect,
} from "react";
import { createPortal } from "react-dom";
import {
    RotateCcw,
    Plus,
    Lock,
    Unlock,
    Trash2,
    FolderInput,
    ChevronDown,
    Zap,
    X,
} from "lucide-react";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from "@/hooks/useUpdateHistory";
import {
    cleanStr,
    isCodeLocked,
    getGubunCategory,
    buildGubunAndLockPatch,
    getNextAutoSubCode,
    applyCodeFieldPropagation,
    validateCodeLabelConsistency,
    toggleThreeStageSort,
} from "./optionSettingUtils";
import { OsaDropDown, OsaCategoryComboInput, OsaInlineInput } from "./OptionSettingKendoSelect.jsx";
import { useOsaResizableTable } from "./useOsaResizableTable";

const GUBUN_FILTER_OPTIONS = [
    { value: "all", text: "전체" },
    { value: "설문지", text: "설문지" },
    { value: "자동분석", text: "자동분석" },
    { value: "트래킹", text: "트래킹" },
];

const LOCK_FILTER_OPTIONS = [
    { value: "all", text: "전체" },
    { value: "unlocked", text: "수정가능" },
    { value: "locked", text: "수정불가" },
];

const ROW_GUBUN_OPTIONS = [
    { value: "설문지", text: "설문지" },
    { value: "자동분석", text: "자동분석" },
    { value: "트래킹", text: "트래킹" },
];

const keyOf = (r) =>
    r?.__rowKey ||
    r?._uid ||
    `${encodeURIComponent(cleanStr(r?.lv123code))}__${encodeURIComponent(cleanStr(r?.lv3))}`;

const natCompare = (aVal, bVal) => {
    const sa = cleanStr(aVal);
    const sb = cleanStr(bVal);
    if (sa === "" && sb === "") return 0;
    if (sa === "") return -1;
    if (sb === "") return 1;
    const na = /^-?\d+$/.test(sa) ? Number(sa) : null;
    const nb = /^-?\d+$/.test(sb) ? Number(sb) : null;
    if (na !== null && nb !== null) return na - nb;
    if (na !== null) return -1;
    if (nb !== null) return 1;
    return sa.localeCompare(sb, "ko");
};

const natCode = (v) => {
    const s = cleanStr(v);
    if (!s) return Number.POSITIVE_INFINITY;
    return /^\d+$/.test(s) ? Number(s) : s.toLowerCase();
};

/**
 * [보기 데이터] 탭 — 통합 검색(/) · 빈도순 정렬 · 대/중분류 자동완성 · 고속 편집 · 드래그 다중선택 (100% 주황색 테마)
 */
const OptionSettingTab2 = forwardRef((props, ref) => {
    const {
        lvCode = "3",
        codes = [],
        setCodes,
        responses = [],
        setResponses,
        onUnsavedChange,
        onOpenImportModal,
        qnum,
        project_lock,
    } = props;

    const modal = useContext(modalContext);
    const modalRef = useRef(modal);
    modalRef.current = modal;

    const [sort, setSort] = useState([]);
    const pinnedSortRef = useRef({ sig: "", keys: [] });
    const [gridSelectedCodes, setGridSelectedCodes] = useState(new Set());
    const [explicitChecked, setExplicitChecked] = useState(false);
    const selectedCodesRef = useRef(gridSelectedCodes);
    selectedCodesRef.current = gridSelectedCodes;

    useEffect(() => {
        if (gridSelectedCodes.size === 0 && explicitChecked) {
            setExplicitChecked(false);
        }
    }, [gridSelectedCodes, explicitChecked]);

    // 헤더 체크박스 선택 옵션 메뉴
    const [chkMenuOpen, setChkMenuOpen] = useState(false);
    const [chkMenuPos, setChkMenuPos] = useState(null);
    const chkWrapRef = useRef(null);
    const chkMenuRef = useRef(null);
    const tableScrollRef = useRef(null);
    useOsaResizableTable(tableScrollRef, String(lvCode));

    const pendingFocusCellRef = useRef(null);
    const skipNextBlurCellRef = useRef(null);

    // 마우스 드래그 / Shift / Ctrl 다중 선택용 Ref
    const draggingRef = useRef(false);
    const multiRowDragRef = useRef(false);
    const anchorIndexRef = useRef(null);

    const [colFilters, setColFilters] = useState({
        lv1code: "",
        lv1: "",
        lv2code: "",
        lv2: "",
        lv123code: "",
        lv3: "",
        freq: "",
        gubun: "all",
        lockState: "all",
    });

    // 드래그 종료 글로벌 리스너
    useEffect(() => {
        const onUp = () => {
            draggingRef.current = false;
            multiRowDragRef.current = false;
            document.body.classList.remove("osa-is-row-dragging");
        };
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mouseup", onUp);
            document.body.classList.remove("osa-is-row-dragging");
        };
    }, []);

    // 헤더 체크박스 메뉴 외부 클릭 닫기
    useEffect(() => {
        if (!chkMenuOpen) return undefined;
        const onDocDown = (e) => {
            if (
                chkWrapRef.current?.contains(e.target) ||
                chkMenuRef.current?.contains(e.target)
            ) {
                return;
            }
            setChkMenuOpen(false);
        };
        document.addEventListener("mousedown", onDocDown);
        return () => document.removeEventListener("mousedown", onDocDown);
    }, [chkMenuOpen]);

    const makeSig = useCallback((rows = []) => {
        return (rows || [])
            .filter((r) => !r?.__pendingDelete)
            .map(
                (r) =>
                    `${keyOf(r)}:${cleanStr(r.lv1code)}:${cleanStr(r.lv1)}:${cleanStr(
                        r.lv2code
                    )}:${cleanStr(r.lv2)}:${cleanStr(r.lv123code)}:${cleanStr(r.lv3)}:${r.ex_gubun
                    }:${Boolean(r.is_lock)}`
            )
            .join("||");
    }, []);

    const hist = useUpdateHistory(`tab2:${lvCode}`, { max: 100, signature: makeSig });
    const baselineSigRef = useRef("");
    const baselineInitRef = useRef(false);

    useEffect(() => {
        if (codes.length > 0 && !baselineInitRef.current) {
            baselineInitRef.current = true;
            hist.reset(codes);
            baselineSigRef.current = makeSig(codes);
        }
    }, [codes, hist, makeSig]);

    const commitCodes = useCallback(
        (updater) => {
            setCodes((prev) => {
                const next = typeof updater === "function" ? updater(prev) : updater;
                hist.commit(next);
                onUnsavedChange?.(makeSig(next) !== baselineSigRef.current || true);
                return next;
            });
        },
        [setCodes, hist, makeSig, onUnsavedChange]
    );

    // Ctrl+Z / Ctrl+Y
    useEffect(() => {
        const onKey = (e) => {
            const tag = e.target?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            const key = e.key?.toLowerCase?.();
            if (!key) return;

            if (e.key === "Escape" && !chkMenuOpen) {
                setGridSelectedCodes((prev) => (prev.size > 0 ? new Set() : prev));
                return;
            }

            if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) {
                e.preventDefault();
                const snap = hist.undo();
                if (Array.isArray(snap)) {
                    setCodes(snap);
                    onUnsavedChange?.(makeSig(snap) !== baselineSigRef.current);
                }
            } else if ((e.ctrlKey || e.metaKey) && (key === "y" || (key === "z" && e.shiftKey))) {
                e.preventDefault();
                const snap = hist.redo?.();
                if (Array.isArray(snap)) {
                    setCodes(snap);
                    onUnsavedChange?.(makeSig(snap) !== baselineSigRef.current);
                }
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [chkMenuOpen, hist, makeSig, onUnsavedChange, setCodes]);

    useImperativeHandle(
        ref,
        () => ({
            validateBeforeSave: () => validateCodeLabelConsistency(codes),
            resetBaseline: (freshCodes) => {
                const target = freshCodes || codes;
                hist.reset(target);
                baselineSigRef.current = makeSig(target);
            },
        }),
        [codes, hist, makeSig]
    );

    // 응답 빈도 실시간 계산
    const freqMap = useMemo(() => {
        const m = new Map();
        (responses || []).forEach((r) => {
            if (r?.__pendingDelete) return;
            const c = cleanStr(r.lv123code ?? r.code_num);
            if (c) m.set(c, (m.get(c) || 0) + 1);
        });
        return m;
    }, [responses]);

    const activeCodes = useMemo(
        () =>
            (codes || [])
                .filter((c) => !c?.__pendingDelete)
                .map((c, idx) => {
                    const sc = cleanStr(c.lv123code ?? c.code_num);
                    const freq = sc ? freqMap.get(sc) || 0 : 0;
                    const locked = isCodeLocked(c);
                    return {
                        ...c,
                        no: idx + 1,
                        lv1: cleanStr(c.lv1),
                        lv1code: cleanStr(c.lv1code),
                        lv2: cleanStr(c.lv2),
                        lv2code: cleanStr(c.lv2code),
                        lv3: cleanStr(c.lv3),
                        _subCode: sc,
                        _freq: freq,
                        _locked: locked,
                        _lockSort: locked ? "0_수정불가" : "1_수정가능",
                        _cat: getGubunCategory(c),
                        __rowKey: keyOf(c),
                    };
                }),
        [codes, freqMap]
    );

    // 대분류·중분류 자동완성 후보 추출
    const lv1AutoOptions = useMemo(() => {
        const map = new Map();
        activeCodes.forEach((c) => {
            if (!c.lv1) return;
            if (!map.has(c.lv1) || (!map.get(c.lv1).code && c.lv1code)) {
                map.set(c.lv1, { name: c.lv1, code: c.lv1code });
            }
        });
        return Array.from(map.values()).sort((a, b) => natCompare(a.code || a.name, b.code || b.name));
    }, [activeCodes]);

    const getLv2AutoOptionsForRow = useCallback(
        (curLv1) => {
            const sameLv1Map = new Map();
            const otherMap = new Map();
            activeCodes.forEach((c) => {
                if (!c.lv2) return;
                if (curLv1 && c.lv1 === curLv1) {
                    if (!sameLv1Map.has(c.lv2) || (!sameLv1Map.get(c.lv2).code && c.lv2code)) {
                        sameLv1Map.set(c.lv2, { name: c.lv2, code: c.lv2code });
                    }
                } else if (!otherMap.has(c.lv2) || (!otherMap.get(c.lv2).code && c.lv2code)) {
                    otherMap.set(c.lv2, { name: c.lv2, code: c.lv2code });
                }
            });
            const primary = Array.from(sameLv1Map.values()).sort((a, b) =>
                natCompare(a.code || a.name, b.code || b.name)
            );
            if (primary.length > 0) return primary;
            return Array.from(otherMap.values()).sort((a, b) =>
                natCompare(a.code || a.name, b.code || b.name)
            );
        },
        [activeCodes]
    );

    const counts = useMemo(() => {
        const total = activeCodes.length;
        const locked = activeCodes.filter((c) => c._locked).length;
        return { total, locked, unlocked: total - locked };
    }, [activeCodes]);

    const filteredSortedCodes = useMemo(() => {
        const match = (val, kw) => {
            const needle = kw.trim().toLowerCase();
            if (!needle) return true;
            return String(val ?? "").toLowerCase().includes(needle);
        };

        const list = activeCodes.filter((c) => {
            if (!match(c.lv1code, colFilters.lv1code)) return false;
            if (!match(c.lv1, colFilters.lv1)) return false;
            if (!match(c.lv2code, colFilters.lv2code)) return false;
            if (!match(c.lv2, colFilters.lv2)) return false;
            if (!match(c._subCode, colFilters.lv123code)) return false;
            if (!match(c.lv3, colFilters.lv3)) return false;
            if (!match(c._freq, colFilters.freq)) return false;
            if (colFilters.gubun !== "all" && c._cat !== colFilters.gubun) return false;
            if (colFilters.lockState === "locked" && !c._locked) return false;
            if (colFilters.lockState === "unlocked" && c._locked) return false;
            return true;
        });

        // 컬럼 정렬이 지정된 경우 우선 적용하되, 인라인 편집 중에는 행 위치가 튀지 않도록 순서 고정
        if (sort.length > 0) {
            const { field, dir } = sort[0];
            const mul = dir === "desc" ? -1 : 1;
            const rowKeysSig = activeCodes.map((r) => r.__rowKey).join("|");
            const freqSig = field === "_freq" ? activeCodes.map((r) => r._freq).join(",") : "";
            const orderSig = `${field}:${dir}::${rowKeysSig}::${freqSig}`;
            if (pinnedSortRef.current.sig !== orderSig) {
                const sortedAll = [...activeCodes].sort(
                    (a, b) => natCompare(a?.[field], b?.[field]) * mul
                );
                pinnedSortRef.current = {
                    sig: orderSig,
                    keys: sortedAll.map((r) => r.__rowKey),
                };
            }
            const filteredMap = new Map(list.map((r) => [r.__rowKey, r]));
            return pinnedSortRef.current.keys
                .map((k) => filteredMap.get(k))
                .filter(Boolean);
        }

        return list;
    }, [activeCodes, colFilters, sort]);

    // 새 보기 추가 또는 고속 편집 후 셀 포커스 복원
    useEffect(() => {
        const targetCell = pendingFocusCellRef.current;
        if (!targetCell) return;
        const el = document.querySelector(`input[data-tab2-cell="${CSS.escape(targetCell)}"]`);
        if (el) {
            pendingFocusCellRef.current = null;
            el.scrollIntoView?.({ block: "nearest" });
            el.focus();
            el.select?.();
        }
    }, [filteredSortedCodes]);

    // 고속 편집: 동일 컬럼의 이전/다음 수정가능 행으로 즉시 이동
    const navigateEditableRow = useCallback(
        (currentRowKey, field, delta) => {
            const curIdx = filteredSortedCodes.findIndex((r) => r.__rowKey === currentRowKey);
            if (curIdx === -1) return;

            let idx = curIdx + delta;
            while (idx >= 0 && idx < filteredSortedCodes.length) {
                const candidate = filteredSortedCodes[idx];
                if (!candidate._locked) {
                    const cellId = `${candidate.__rowKey}:${field}`;
                    const el = document.querySelector(
                        `input[data-tab2-cell="${CSS.escape(cellId)}"]`
                    );
                    if (el) {
                        el.scrollIntoView?.({ block: "nearest" });
                        el.focus();
                        el.select?.();
                    } else {
                        pendingFocusCellRef.current = cellId;
                    }
                    return;
                }
                idx += delta;
            }
        },
        [filteredSortedCodes]
    );

    // 필드 편집 (충돌 방지 + 동일 분류 자동 전파 + 매핑 응답 동기화)
    const handleFieldEdit = useCallback(
        (row, field, rawVal) => {
            if (!row || isCodeLocked(row) || project_lock === "수정불가") return false;
            const res = applyCodeFieldPropagation({
                codes,
                responses,
                targetRow: row,
                field,
                rawValue: rawVal,
                selectedCodeKeys: gridSelectedCodes,
            });

            if (!res.ok) {
                modalRef.current?.showErrorAlert?.("알림", res.error);
                return false;
            }
            if (!res.changed) return true;

            commitCodes(res.nextCodes);
            setResponses?.(res.nextResponses);
            return true;
        },
        [codes, commitCodes, gridSelectedCodes, project_lock, responses, setResponses]
    );

    const handleInlineInputKeyDown = useCallback(
        (e, row, field) => {
            const rKey = row.__rowKey;
            const cellId = `${rKey}:${field}`;

            if (e.key === "Enter") {
                e.preventDefault();
                skipNextBlurCellRef.current = cellId;
                if (handleFieldEdit(row, field, e.currentTarget.value)) {
                    navigateEditableRow(rKey, field, e.shiftKey ? -1 : 1);
                } else {
                    skipNextBlurCellRef.current = null;
                }
                return;
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                skipNextBlurCellRef.current = cellId;
                if (handleFieldEdit(row, field, e.currentTarget.value)) {
                    navigateEditableRow(rKey, field, 1);
                } else {
                    skipNextBlurCellRef.current = null;
                }
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                skipNextBlurCellRef.current = cellId;
                if (handleFieldEdit(row, field, e.currentTarget.value)) {
                    navigateEditableRow(rKey, field, -1);
                } else {
                    skipNextBlurCellRef.current = null;
                }
            }
        },
        [handleFieldEdit, navigateEditableRow]
    );

    const handleInlineInputBlur = useCallback(
        (e, row, field) => {
            const cellId = `${row.__rowKey}:${field}`;
            if (skipNextBlurCellRef.current === cellId) {
                skipNextBlurCellRef.current = null;
                return;
            }
            handleFieldEdit(row, field, e.target.value);
        },
        [handleFieldEdit]
    );

    const handleRowGubunChange = (row, cat) => {
        if (project_lock === "수정불가") return;
        const targetKey = keyOf(row);
        const curSelected = selectedCodesRef.current;
        const isMulti = curSelected.size > 1 && curSelected.has(targetKey);
        const patch = buildGubunAndLockPatch(cat, null);
        commitCodes((prev) =>
            (prev || []).map((r) => {
                const k = keyOf(r);
                const hit = isMulti ? curSelected.has(k) : k === targetKey;
                return hit ? { ...r, ...patch } : r;
            })
        );
    };

    const handleRowLockToggle = (row) => {
        if (project_lock === "수정불가") return;
        const targetKey = keyOf(row);
        const nextLocked = !isCodeLocked(row);
        const curSelected = selectedCodesRef.current;
        const isMulti = curSelected.size > 1 && curSelected.has(targetKey);
        commitCodes((prev) =>
            (prev || []).map((r) => {
                const k = keyOf(r);
                const hit = isMulti ? curSelected.has(k) : k === targetKey;
                if (!hit) return r;
                return { ...r, ...buildGubunAndLockPatch(getGubunCategory(r), nextLocked) };
            })
        );
    };

    const handleDeleteSingle = (row) => {
        if (!row || project_lock === "수정불가") return;
        const targetKey = keyOf(row);
        if (gridSelectedCodes.size > 1 && gridSelectedCodes.has(targetKey)) {
            handleBatchDelete();
            return;
        }
        if (isCodeLocked(row)) return;
        const targetCode = cleanStr(row.lv123code ?? row.code_num);

        modalRef.current?.showConfirm?.(
            "알림",
            `보기 [${targetCode}] '${row.lv3 || "(미입력)"}'을(를) 삭제하시겠습니까?\n매핑된 응답은 미분류 처리됩니다.`,
            {
                btns: [
                    { title: "취소" },
                    {
                        title: "삭제",
                        click: () => {
                            commitCodes((prev) =>
                                (prev || []).filter((r) => keyOf(r) !== targetKey)
                            );
                            if (targetCode && setResponses) {
                                setResponses((prevResp) =>
                                    (prevResp || []).map((resp) =>
                                        cleanStr(resp.lv123code) === targetCode
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
                            }
                            setGridSelectedCodes((prev) => {
                                const next = new Set(prev);
                                next.delete(targetKey);
                                return next;
                            });
                        },
                    },
                ],
            }
        );
    };

    const handleBatchDelete = () => {
        if (gridSelectedCodes.size === 0 || project_lock === "수정불가") return;
        const selectedRows = activeCodes.filter((r) => gridSelectedCodes.has(r.__rowKey));
        const unlocked = selectedRows.filter((r) => !r._locked);
        const lockedCnt = selectedRows.length - unlocked.length;

        if (unlocked.length === 0) {
            modalRef.current?.showAlert?.(
                "알림",
                "선택한 보기가 모두 '수정불가(잠금)' 상태이므로 삭제되지 않도록 보호됩니다."
            );
            return;
        }

        modalRef.current?.showConfirm?.(
            "알림",
            `수정가능 보기 ${unlocked.length}건을 삭제하시겠습니까?${lockedCnt > 0 ? `\n(수정불가 보기 ${lockedCnt}건은 자동 보호됩니다.)` : ""
            }`,
            {
                btns: [
                    { title: "취소" },
                    {
                        title: "삭제",
                        click: () => {
                            const delKeys = new Set(unlocked.map((r) => r.__rowKey));
                            const delCodes = new Set(
                                unlocked.map((r) => r._subCode).filter(Boolean)
                            );
                            commitCodes((prev) =>
                                (prev || []).filter((r) => !delKeys.has(keyOf(r)))
                            );
                            if (delCodes.size > 0 && setResponses) {
                                setResponses((prevResp) =>
                                    (prevResp || []).map((resp) =>
                                        delCodes.has(cleanStr(resp.lv123code))
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
                            }
                            setGridSelectedCodes(new Set());
                        },
                    },
                ],
            }
        );
    };

    const handleAddRow = () => {
        if (project_lock === "수정불가") return;
        const nextCode = getNextAutoSubCode(activeCodes);
        const newKey = `code_new_${Date.now()}`;
        const patch = buildGubunAndLockPatch("자동분석", false);
        const newRow = {
            no: activeCodes.length + 1,
            qnum: qnum || "",
            lv1code: "",
            lv1: "",
            lv2code: "",
            lv2: "",
            lv123code: nextCode,
            code_num: nextCode,
            lv3: "",
            ...patch,
            __rowKey: newKey,
        };
        pendingFocusCellRef.current = `${newKey}:lv3`;
        commitCodes((prev) => [...(prev || []), newRow]);
    };

    const handleResetUnlocked = () => {
        if (project_lock === "수정불가") return;
        const unlocked = activeCodes.filter((c) => !c._locked);
        if (unlocked.length === 0) {
            modalRef.current?.showAlert?.("알림", "초기화할 수정가능 보기가 없습니다.");
            return;
        }
        modalRef.current?.showConfirm?.(
            "알림",
            `수정가능 보기 ${unlocked.length}건을 모두 초기화하시겠습니까?\n(수정불가 보기 ${counts.locked}건은 보호 유지됩니다.)`,
            {
                btns: [
                    { title: "취소" },
                    {
                        title: "초기화",
                        click: () => {
                            const delCodes = new Set(
                                unlocked.map((r) => r._subCode).filter(Boolean)
                            );
                            commitCodes((prev) => (prev || []).filter((r) => isCodeLocked(r)));
                            if (delCodes.size > 0 && setResponses) {
                                setResponses((prevResp) =>
                                    (prevResp || []).map((resp) =>
                                        delCodes.has(cleanStr(resp.lv123code))
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
                            }
                            setGridSelectedCodes(new Set());
                        },
                    },
                ],
            }
        );
    };

    // Shift+클릭 / Ctrl+클릭 캡처 핸들러 (인풋·콤보박스·드롭다운 위에서도 다중 행 선택 즉시 동작)
    const handleRowMouseDownCapture = useCallback(
        (row, rowIdx, e) => {
            if (e.button !== 0) return;
            // Kendo DropDownList 팝업 등 document.body 포털에서 버블링된 합성 이벤트 차단
            if (!e.currentTarget.contains(e.target)) return;
            if (e.target.closest('input[type="checkbox"]')) return;

            const rKey = row.__rowKey;
            if (e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                document.activeElement?.blur?.();
                window.getSelection?.()?.removeAllRanges?.();
                const anchor = anchorIndexRef.current != null ? anchorIndexRef.current : rowIdx;
                if (anchorIndexRef.current == null) anchorIndexRef.current = rowIdx;
                const start = Math.min(anchor, rowIdx);
                const end = Math.max(anchor, rowIdx);
                setGridSelectedCodes((prev) => {
                    const next = e.ctrlKey || e.metaKey ? new Set(prev) : new Set();
                    for (let i = start; i <= end; i++) {
                        if (filteredSortedCodes[i]) next.add(filteredSortedCodes[i].__rowKey);
                    }
                    return next;
                });
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                document.activeElement?.blur?.();
                anchorIndexRef.current = rowIdx;
                setGridSelectedCodes((prev) => {
                    const next = new Set(prev);
                    if (next.has(rKey)) next.delete(rKey);
                    else next.add(rKey);
                    return next;
                });
            }
        },
        [filteredSortedCodes]
    );

    // 일반 마우스 클릭 / 드래그 다중 행 선택 (포털 팝업 및 입력 컨트롤 클릭 시에는 기존 다중 선택 상태 유지)
    const handleRowMouseDown = useCallback((row, rowIdx, e) => {
        if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey) return;
        // Kendo 팝업(.k-animation-container)이나 자동완성 포털 클릭이 React 트리로 버블링될 때 선택 초기화 방지
        if (!e.currentTarget.contains(e.target)) return;
        if (
            e.target.closest("input") ||
            e.target.closest("button") ||
            e.target.closest("select") ||
            e.target.closest(".k-dropdownlist") ||
            e.target.closest(".k-picker") ||
            e.target.closest(".osa-ac-wrap")
        ) {
            return;
        }

        const rKey = row.__rowKey;
        draggingRef.current = true;
        multiRowDragRef.current = false;
        anchorIndexRef.current = rowIdx;
        setExplicitChecked(false);
        setGridSelectedCodes(new Set([rKey]));
    }, []);

    const handleRowMouseEnter = useCallback(
        (rowIdx) => {
            if (!draggingRef.current || anchorIndexRef.current == null) return;
            if (rowIdx === anchorIndexRef.current && !multiRowDragRef.current) return;
            multiRowDragRef.current = true;
            document.body.classList.add("osa-is-row-dragging");
            window.getSelection?.()?.removeAllRanges?.();
            const start = Math.min(anchorIndexRef.current, rowIdx);
            const end = Math.max(anchorIndexRef.current, rowIdx);
            const next = new Set();
            for (let i = start; i <= end; i++) {
                if (filteredSortedCodes[i]) next.add(filteredSortedCodes[i].__rowKey);
            }
            setGridSelectedCodes(next);
        },
        [filteredSortedCodes]
    );

    const allChecked =
        filteredSortedCodes.length > 0 &&
        filteredSortedCodes.every((r) => gridSelectedCodes.has(r.__rowKey));

    const toggleAll = (checked) => {
        if (checked) {
            setExplicitChecked(true);
            setGridSelectedCodes(new Set(filteredSortedCodes.map((r) => r.__rowKey)));
        } else {
            setExplicitChecked(false);
            setGridSelectedCodes(new Set());
        }
    };

    const handleCheckboxClick = (e, rKey, rowIdx) => {
        e.stopPropagation();
        setExplicitChecked(true);
        if (e.shiftKey && anchorIndexRef.current != null) {
            const start = Math.min(anchorIndexRef.current, rowIdx);
            const end = Math.max(anchorIndexRef.current, rowIdx);
            setGridSelectedCodes((prev) => {
                const shouldCheck = !prev.has(rKey);
                const next = new Set(prev);
                for (let i = start; i <= end; i++) {
                    const k = filteredSortedCodes[i]?.__rowKey;
                    if (!k) continue;
                    if (shouldCheck) next.add(k);
                    else next.delete(k);
                }
                return next;
            });
            return;
        }

        anchorIndexRef.current = rowIdx;
        setGridSelectedCodes((prev) => {
            const next = new Set(prev);
            if (next.has(rKey)) next.delete(rKey);
            else next.add(rKey);
            return next;
        });
    };

    const renderSortBadge = (field) => {
        const cur = sort.find((s) => s.field === field);
        if (!cur) return <span className="osa-sort-icon">⇅</span>;
        return <span className="osa-sort-icon active">{cur.dir === "asc" ? "↑" : "↓"}</span>;
    };

    const showLv1 = String(lvCode) === "3";
    const showLv2 = String(lvCode) === "2" || String(lvCode) === "3";
    const hasActiveFilter =
        Boolean(colFilters.lv1code.trim()) ||
        Boolean(colFilters.lv1.trim()) ||
        Boolean(colFilters.lv2code.trim()) ||
        Boolean(colFilters.lv2.trim()) ||
        Boolean(colFilters.lv123code.trim()) ||
        Boolean(colFilters.lv3.trim()) ||
        Boolean(colFilters.freq.trim()) ||
        colFilters.gubun !== "all" ||
        colFilters.lockState !== "all";

    const showSelectionBar =
        gridSelectedCodes.size > 1 || (explicitChecked && gridSelectedCodes.size > 0);

    return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            {/* 서브 툴바 */}
            <div className="osa-subtoolbar">
                <div className="osa-subtoolbar-left">
                    {/* 1) 조회 건수 표시 (PID별 데이터와 동일 포맷) */}
                    <span className="osa-tab3-count">
                        조회 건수: <b>{filteredSortedCodes.length.toLocaleString()}</b>건
                        {hasActiveFilter && (
                            <span style={{ marginLeft: "6px", color: "#94a3b8" }}>
                                (전체 {counts.total.toLocaleString()}건)
                            </span>
                        )}
                    </span>

                    {/* 2) 다중/체크 선택 인라인 액션 그룹 */}
                    {showSelectionBar && (
                        <>
                            <div className="osa-subtoolbar-divider" />
                            <div className="osa-sel-inline-group">
                                <span className="osa-sel-inline-text">
                                    <b>{gridSelectedCodes.size.toLocaleString()}</b>개 선택
                                </span>
                                <button
                                    type="button"
                                    className="osa-sel-inline-clear"
                                    title="선택 해제 (Esc)"
                                    aria-label="선택 해제"
                                    onClick={() => {
                                        setExplicitChecked(false);
                                        setGridSelectedCodes(new Set());
                                    }}
                                >
                                    <X size={12.5} />
                                </button>
                                {project_lock !== "수정불가" && (
                                    <button
                                        type="button"
                                        className="osa-sel-inline-del-btn"
                                        title="선택한 보기 일괄 삭제"
                                        onClick={handleBatchDelete}
                                    >
                                        <Trash2 size={12.5} />
                                        <span>선택 삭제</span>
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* 우측: 보기 관리 액션 버튼 그룹 */}
                {project_lock !== "수정불가" && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginLeft: "auto",
                            flexShrink: 0,
                        }}
                    >
                        <button
                            type="button"
                            className="osa-btn"
                            style={{ height: "30px" }}
                            onClick={onOpenImportModal}
                        >
                            <FolderInput size={13} />
                            <span>보기 불러오기</span>
                        </button>
                        <button
                            type="button"
                            className="osa-icon-btn"
                            style={{ width: "30px", height: "30px" }}
                            title="수정가능 보기 초기화 (수정불가 보기는 유지됩니다)"
                            aria-label="수정가능 보기 초기화"
                            onClick={handleResetUnlocked}
                        >
                            <RotateCcw size={14} />
                        </button>
                        <button
                            type="button"
                            className="osa-btn osa-btn-primary"
                            style={{ width: "30px", height: "30px", padding: 0 }}
                            title="새 보기 추가"
                            aria-label="새 보기 추가"
                            onClick={handleAddRow}
                        >
                            <Plus size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                )}
            </div>

            {/* 보기 코드북 테이블 */}
            <div ref={tableScrollRef} className="osa-table-scroll">
                <table
                    className="osa-table osa-drag-selectable"
                    style={{ minWidth: showLv1 ? "940px" : showLv2 ? "780px" : "620px" }}
                >
                    <thead>
                        <tr className="osa-th-row">
                            <th style={{ width: "52px", textAlign: "center", padding: "6px 4px" }}>
                                <div ref={chkWrapRef} className="osa-th-chk-wrap">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={(e) => toggleAll(e.target.checked)}
                                    />
                                    <button
                                        type="button"
                                        className="osa-th-chk-arrow"
                                        title="조건별 빠른 선택"
                                        onClick={() => {
                                            const rect = chkWrapRef.current?.getBoundingClientRect();
                                            if (rect) {
                                                setChkMenuPos({
                                                    left: rect.left,
                                                    top: rect.bottom + 4,
                                                });
                                            }
                                            setChkMenuOpen((v) => !v);
                                        }}
                                    >
                                        <ChevronDown size={11} />
                                    </button>
                                </div>
                            </th>
                            <th style={{ width: "48px", textAlign: "center", padding: "6px 4px" }}>
                                #
                            </th>
                            <th style={{ width: "118px", textAlign: "center" }}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() => setSort((p) => toggleThreeStageSort(p, "_cat"))}
                                >
                                    보기구분 {renderSortBadge("_cat")}
                                </span>
                            </th>
                            <th style={{ width: "108px", textAlign: "center" }}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() =>
                                        setSort((p) => toggleThreeStageSort(p, "_lockSort"))
                                    }
                                >
                                    수정여부 {renderSortBadge("_lockSort")}
                                </span>
                            </th>
                            {showLv1 && (
                                <>
                                    <th style={{ width: "76px", textAlign: "center" }}>
                                        <span
                                            className="osa-th-sortable"
                                            onClick={() =>
                                                setSort((p) => toggleThreeStageSort(p, "lv1code"))
                                            }
                                        >
                                            대코드 {renderSortBadge("lv1code")}
                                        </span>
                                    </th>
                                    <th style={{ width: "15%" }}>
                                        <span
                                            className="osa-th-sortable"
                                            onClick={() =>
                                                setSort((p) => toggleThreeStageSort(p, "lv1"))
                                            }
                                        >
                                            대분류명 {renderSortBadge("lv1")}
                                        </span>
                                    </th>
                                </>
                            )}
                            {showLv2 && (
                                <>
                                    <th style={{ width: "76px", textAlign: "center" }}>
                                        <span
                                            className="osa-th-sortable"
                                            onClick={() =>
                                                setSort((p) => toggleThreeStageSort(p, "lv2code"))
                                            }
                                        >
                                            중코드 {renderSortBadge("lv2code")}
                                        </span>
                                    </th>
                                    <th style={{ width: "15%" }}>
                                        <span
                                            className="osa-th-sortable"
                                            onClick={() =>
                                                setSort((p) => toggleThreeStageSort(p, "lv2"))
                                            }
                                        >
                                            중분류명 {renderSortBadge("lv2")}
                                        </span>
                                    </th>
                                </>
                            )}
                            <th style={{ width: "68px", textAlign: "center" }}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() => setSort((p) => toggleThreeStageSort(p, "_freq"))}
                                >
                                    빈도 {renderSortBadge("_freq")}
                                </span>
                            </th>
                            <th style={{ width: "84px", textAlign: "center" }}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() =>
                                        setSort((p) => toggleThreeStageSort(p, "_subCode"))
                                    }
                                >
                                    소코드 {renderSortBadge("_subCode")}
                                </span>
                            </th>
                            <th>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() => setSort((p) => toggleThreeStageSort(p, "lv3"))}
                                >
                                    소분류명 {renderSortBadge("lv3")}
                                </span>
                            </th>
                            <th style={{ width: "52px", textAlign: "center" }}>삭제</th>
                        </tr>

                        {/* 2행: 인라인 열별 AND 검색 필터 */}
                        <tr className="osa-filter-row">
                            <th />
                            <th />
                            <th>
                                <OsaDropDown
                                    size="sm"
                                    options={GUBUN_FILTER_OPTIONS}
                                    value={colFilters.gubun}
                                    onValueChange={(v) =>
                                        setColFilters((p) => ({ ...p, gubun: v }))
                                    }
                                />
                            </th>
                            <th>
                                <OsaDropDown
                                    size="sm"
                                    options={LOCK_FILTER_OPTIONS}
                                    value={colFilters.lockState}
                                    onValueChange={(v) =>
                                        setColFilters((p) => ({
                                            ...p,
                                            lockState: v,
                                        }))
                                    }
                                />
                            </th>
                            {showLv1 && (
                                <>
                                    <th>
                                        <input
                                            type="text"
                                            className="osa-col-filter-input"
                                            style={{ textAlign: "center" }}
                                            placeholder="대코드"
                                            value={colFilters.lv1code}
                                            onChange={(e) =>
                                                setColFilters((p) => ({
                                                    ...p,
                                                    lv1code: e.target.value,
                                                }))
                                            }
                                        />
                                    </th>
                                    <th>
                                        <input
                                            type="text"
                                            className="osa-col-filter-input"
                                            placeholder="대분류 검색"
                                            value={colFilters.lv1}
                                            onChange={(e) =>
                                                setColFilters((p) => ({
                                                    ...p,
                                                    lv1: e.target.value,
                                                }))
                                            }
                                        />
                                    </th>
                                </>
                            )}
                            {showLv2 && (
                                <>
                                    <th>
                                        <input
                                            type="text"
                                            className="osa-col-filter-input"
                                            style={{ textAlign: "center" }}
                                            placeholder="중코드"
                                            value={colFilters.lv2code}
                                            onChange={(e) =>
                                                setColFilters((p) => ({
                                                    ...p,
                                                    lv2code: e.target.value,
                                                }))
                                            }
                                        />
                                    </th>
                                    <th>
                                        <input
                                            type="text"
                                            className="osa-col-filter-input"
                                            placeholder="중분류 검색"
                                            value={colFilters.lv2}
                                            onChange={(e) =>
                                                setColFilters((p) => ({
                                                    ...p,
                                                    lv2: e.target.value,
                                                }))
                                            }
                                        />
                                    </th>
                                </>
                            )}
                            <th>
                                <input
                                    type="text"
                                    className="osa-col-filter-input"
                                    style={{ textAlign: "center" }}
                                    placeholder="빈도"
                                    value={colFilters.freq}
                                    onChange={(e) =>
                                        setColFilters((p) => ({ ...p, freq: e.target.value }))
                                    }
                                />
                            </th>
                            <th>
                                <input
                                    type="text"
                                    className="osa-col-filter-input"
                                    style={{ textAlign: "center" }}
                                    placeholder="소코드"
                                    value={colFilters.lv123code}
                                    onChange={(e) =>
                                        setColFilters((p) => ({
                                            ...p,
                                            lv123code: e.target.value,
                                        }))
                                    }
                                />
                            </th>
                            <th>
                                <input
                                    type="text"
                                    className="osa-col-filter-input"
                                    placeholder="소분류명 검색"
                                    value={colFilters.lv3}
                                    onChange={(e) =>
                                        setColFilters((p) => ({ ...p, lv3: e.target.value }))
                                    }
                                />
                            </th>
                            <th />
                        </tr>
                    </thead>

                    <tbody>
                        {filteredSortedCodes.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8 + (showLv1 ? 2 : 0) + (showLv2 ? 2 : 0)}
                                    style={{
                                        padding: "44px 12px",
                                        textAlign: "center",
                                        color: "#94a3b8",
                                    }}
                                >
                                    조회된 데이터가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            filteredSortedCodes.map((row, rowIdx) => {
                                const rKey = row.__rowKey;
                                const isChecked = gridSelectedCodes.has(rKey);
                                const readOnly = row._locked || project_lock === "수정불가";

                                return (
                                    <tr
                                        key={rKey}
                                        className={`${isChecked ? "osa-row-selected" : ""} ${row._locked ? "osa-row-locked" : ""
                                            }`.trim()}
                                        onMouseDownCapture={(e) =>
                                            handleRowMouseDownCapture(row, rowIdx, e)
                                        }
                                        onMouseDown={(e) => handleRowMouseDown(row, rowIdx, e)}
                                        onMouseEnter={() => handleRowMouseEnter(rowIdx)}
                                    >
                                        <td style={{ textAlign: "center" }}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => { }}
                                                onClick={(e) =>
                                                    handleCheckboxClick(e, rKey, rowIdx)
                                                }
                                            />
                                        </td>
                                        <td
                                            style={{
                                                textAlign: "center",
                                                color: "#64748b",
                                                userSelect: "none",
                                            }}
                                        >
                                            {rowIdx + 1}
                                        </td>

                                        <td style={{ textAlign: "center", padding: "4px 6px" }}>
                                            <OsaDropDown
                                                size="sm"
                                                options={ROW_GUBUN_OPTIONS}
                                                disabled={project_lock === "수정불가"}
                                                value={row._cat}
                                                allowSameValueSelect={
                                                    isChecked && gridSelectedCodes.size > 1
                                                }
                                                onValueChange={(v) => handleRowGubunChange(row, v)}
                                            />
                                        </td>

                                        <td style={{ textAlign: "center", padding: "4px 6px" }}>
                                            <button
                                                type="button"
                                                className={`osa-lock-toggle-btn ${row._locked ? "locked" : ""
                                                    }`}
                                                disabled={project_lock === "수정불가"}
                                                onClick={() => handleRowLockToggle(row)}
                                            >
                                                {row._locked ? (
                                                    <>
                                                        <Lock size={11} />
                                                        수정불가
                                                    </>
                                                ) : (
                                                    <>
                                                        <Unlock size={11} />
                                                        수정가능
                                                    </>
                                                )}
                                            </button>
                                        </td>

                                        {showLv1 && (
                                            <>
                                                <td>
                                                    <OsaInlineInput
                                                        data-tab2-cell={`${rKey}:lv1code`}
                                                        className="osa-rp-inline-input code"
                                                        style={{ color: "#475569" }}
                                                        placeholder="대코드"
                                                        disabled={readOnly}
                                                        value={row.lv1code}
                                                        onCommit={(_val, e) =>
                                                            handleInlineInputBlur(e, row, "lv1code")
                                                        }
                                                        onKeyDown={(e) =>
                                                            handleInlineInputKeyDown(
                                                                e,
                                                                row,
                                                                "lv1code"
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <OsaCategoryComboInput
                                                        value={row.lv1}
                                                        options={lv1AutoOptions}
                                                        placeholder="대분류명 선택/입력"
                                                        disabled={readOnly}
                                                        rowKey={rKey}
                                                        field="lv1"
                                                        forceCommitOnSame={
                                                            isChecked && gridSelectedCodes.size > 1
                                                        }
                                                        onCommit={(val) =>
                                                            handleFieldEdit(row, "lv1", val)
                                                        }
                                                        onNavigateRow={navigateEditableRow}
                                                    />
                                                </td>
                                            </>
                                        )}

                                        {showLv2 && (
                                            <>
                                                <td>
                                                    <OsaInlineInput
                                                        data-tab2-cell={`${rKey}:lv2code`}
                                                        className="osa-rp-inline-input code"
                                                        style={{ color: "#475569" }}
                                                        placeholder="중코드"
                                                        disabled={readOnly}
                                                        value={row.lv2code}
                                                        onCommit={(_val, e) =>
                                                            handleInlineInputBlur(e, row, "lv2code")
                                                        }
                                                        onKeyDown={(e) =>
                                                            handleInlineInputKeyDown(
                                                                e,
                                                                row,
                                                                "lv2code"
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <OsaCategoryComboInput
                                                        value={row.lv2}
                                                        options={getLv2AutoOptionsForRow(row.lv1)}
                                                        placeholder="중분류명 선택/입력"
                                                        disabled={readOnly}
                                                        rowKey={rKey}
                                                        field="lv2"
                                                        forceCommitOnSame={
                                                            isChecked && gridSelectedCodes.size > 1
                                                        }
                                                        onCommit={(val) =>
                                                            handleFieldEdit(row, "lv2", val)
                                                        }
                                                        onNavigateRow={navigateEditableRow}
                                                    />
                                                </td>
                                            </>
                                        )}

                                        <td style={{ textAlign: "center", userSelect: "none" }}>
                                            <span
                                                className={`osa-freq-badge ${row._freq === 0 ? "zero" : ""
                                                    }`}
                                            >
                                                {row._freq.toLocaleString()}
                                            </span>
                                        </td>

                                        <td>
                                            <OsaInlineInput
                                                data-tab2-cell={`${rKey}:lv123code`}
                                                className="osa-rp-inline-input code"
                                                disabled={readOnly}
                                                value={row._subCode}
                                                onCommit={(_val, e) =>
                                                    handleInlineInputBlur(e, row, "lv123code")
                                                }
                                                onKeyDown={(e) =>
                                                    handleInlineInputKeyDown(e, row, "lv123code")
                                                }
                                            />
                                        </td>

                                        <td>
                                            <OsaInlineInput
                                                data-tab2-cell={`${rKey}:lv3`}
                                                className="osa-rp-inline-input"
                                                placeholder="소분류명 입력"
                                                disabled={readOnly}
                                                value={row.lv3}
                                                onCommit={(_val, e) =>
                                                    handleInlineInputBlur(e, row, "lv3")
                                                }
                                                onKeyDown={(e) =>
                                                    handleInlineInputKeyDown(e, row, "lv3")
                                                }
                                            />
                                        </td>

                                        <td style={{ textAlign: "center" }}>
                                            <button
                                                type="button"
                                                className="osa-del-icon-btn"
                                                disabled={row._locked || project_lock === "수정불가"}
                                                title={
                                                    row._locked
                                                        ? "잠금 해제 후 삭제할 수 있습니다"
                                                        : "보기 삭제"
                                                }
                                                onClick={() => handleDeleteSingle(row)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* 하단 단축키 안내 & 보기 건수 푸터 바 (전 탭 높이·타이포그래피 통일) */}
            <div className="osa-grid-footer">
                <div className="osa-shortcut-bar">
                    <span className="title">
                        <Zap size={12} />
                        고속 편집
                    </span>
                    <span>
                        <kbd className="osa-kbd">Enter</kbd> 다음 행
                    </span>
                    <span>
                        <kbd className="osa-kbd">Shift+Enter</kbd> 이전 행
                    </span>
                    <span>
                        <kbd className="osa-kbd">↑ / ↓</kbd> 이동
                    </span>
                    <span>
                        <kbd className="osa-kbd">Ctrl+Z</kbd> 실행취소
                    </span>
                    <span style={{ color: "#cbd5e1", margin: "0 2px" }}>·</span>
                    <span style={{ color: "#94a3b8" }}>
                        드래그 · Shift · Ctrl+클릭 다중 선택
                    </span>
                </div>
            </div>

            {/* 헤더 체크박스 [▾] 선택 옵션 팝오버 */}
            {chkMenuOpen &&
                chkMenuPos &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        ref={chkMenuRef}
                        className="osa-chk-menu"
                        style={{
                            left: `${chkMenuPos.left}px`,
                            top: `${chkMenuPos.top}px`,
                        }}
                    >
                        <button
                            type="button"
                            className="osa-chk-menu-item"
                            onClick={() => {
                                setExplicitChecked(true);
                                setGridSelectedCodes(
                                    new Set(filteredSortedCodes.map((r) => r.__rowKey))
                                );
                                setChkMenuOpen(false);
                            }}
                        >
                            <span>전체 선택</span>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                                {filteredSortedCodes.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            className="osa-chk-menu-item"
                            onClick={() => {
                                setExplicitChecked(true);
                                setGridSelectedCodes(
                                    new Set(
                                        filteredSortedCodes
                                            .filter((r) => !r._locked)
                                            .map((r) => r.__rowKey)
                                    )
                                );
                                setChkMenuOpen(false);
                            }}
                        >
                            <span>수정가능만 선택</span>
                            <span style={{ fontSize: "11px", color: "#ea580c" }}>
                                {filteredSortedCodes.filter((r) => !r._locked).length}
                            </span>
                        </button>
                        <button
                            type="button"
                            className="osa-chk-menu-item"
                            onClick={() => {
                                setExplicitChecked(true);
                                setGridSelectedCodes(
                                    new Set(
                                        filteredSortedCodes
                                            .filter((r) => r._locked)
                                            .map((r) => r.__rowKey)
                                    )
                                );
                                setChkMenuOpen(false);
                            }}
                        >
                            <span>수정불가만 선택</span>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                                {filteredSortedCodes.filter((r) => r._locked).length}
                            </span>
                        </button>
                        <button
                            type="button"
                            className="osa-chk-menu-item"
                            onClick={() => {
                                setGridSelectedCodes(new Set());
                                setChkMenuOpen(false);
                            }}
                        >
                            <span>선택 해제</span>
                        </button>
                    </div>,
                    document.body
                )}
        </div>
    );
});

OptionSettingTab2.displayName = "OptionSettingTab2";

export default OptionSettingTab2;
