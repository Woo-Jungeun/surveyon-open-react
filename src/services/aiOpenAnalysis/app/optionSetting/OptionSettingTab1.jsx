import React, {
    memo,
    useEffect,
    useState,
    useRef,
    useCallback,
    useMemo,
    useContext,
    forwardRef,
    useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import {
    Columns,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    RotateCcw,
    X,
    Zap,
} from "lucide-react";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from "@/hooks/useUpdateHistory";
import { cleanStr, toggleThreeStageSort } from "./optionSettingUtils";
import { OsaDropDown, STAGE_OPTIONS } from "./OptionSettingKendoSelect.jsx";
import { useOsaResizableTable } from "./useOsaResizableTable";

const SENTIMENT_FILTER_OPTIONS = [
    { value: "all", text: "전체" },
    { value: "positive", text: "긍정" },
    { value: "negative", text: "부정" },
    { value: "neutral", text: "중립" },
];

const ROW_SENTIMENT_OPTIONS = [
    { value: "positive", text: "긍정" },
    { value: "negative", text: "부정" },
    { value: "neutral", text: "중립" },
];

const VERIFIED_FILTER_OPTIONS = [
    { value: "all", text: "전체" },
    { value: "y", text: "확인" },
    { value: "n", text: "미확인" },
];

/**
 * 소분류 텍스트 클릭 시 표출되는 Kendo 드롭다운 스타일 분류 지정 팝업
 */
const OsaLv3PickerPopup = ({ picker, options = [], onSelect, onUnmap, onClose }) => {
    const [kw, setKw] = useState("");
    const popupRef = useRef(null);
    const searchRef = useRef(null);
    const listRef = useRef(null);
    const itemRefs = useRef([]);

    const filtered = useMemo(() => {
        const needle = kw.trim().toLowerCase();
        if (!needle) return options;
        return options.filter(
            (o) =>
                o.lv3.toLowerCase().includes(needle) ||
                o.code.toLowerCase().includes(needle) ||
                o.lv1.toLowerCase().includes(needle) ||
                o.lv2.toLowerCase().includes(needle)
        );
    }, [options, kw]);

    const [highlightIdx, setHighlightIdx] = useState(() => {
        if (!picker?.currentCode) return 0;
        const found = options.findIndex((o) => o.code === picker.currentCode);
        return found >= 0 ? found : 0;
    });

    useEffect(() => {
        requestAnimationFrame(() => {
            searchRef.current?.focus();
            if (highlightIdx >= 0 && itemRefs.current[highlightIdx]) {
                itemRefs.current[highlightIdx]?.scrollIntoView?.({ block: "nearest" });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleDown = (e) => {
            if (
                popupRef.current?.contains(e.target) ||
                picker?.anchorEl?.contains?.(e.target)
            ) {
                return;
            }
            onClose?.();
        };
        const handleScroll = (e) => {
            if (listRef.current?.contains(e?.target)) return;
            onClose?.();
        };
        const handleResize = () => onClose?.();

        document.addEventListener("mousedown", handleDown);
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleResize);
        return () => {
            document.removeEventListener("mousedown", handleDown);
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", handleResize);
        };
    }, [onClose, picker?.anchorEl]);

    const moveHighlight = (delta) => {
        if (filtered.length === 0) return;
        setHighlightIdx((prev) => {
            const next =
                prev + delta < 0
                    ? filtered.length - 1
                    : prev + delta >= filtered.length
                      ? 0
                      : prev + delta;
            requestAnimationFrame(() => {
                itemRefs.current[next]?.scrollIntoView?.({ block: "nearest" });
            });
            return next;
        });
    };

    const targetCount = picker?.targetKeys?.size || 1;

    if (typeof document === "undefined" || !picker?.pos) return null;

    return createPortal(
        <div
            ref={popupRef}
            className="osa-lv3-picker-popup"
            style={{
                left: `${picker.pos.left}px`,
                ...(picker.pos.top !== undefined ? { top: `${picker.pos.top}px` } : {}),
                ...(picker.pos.bottom !== undefined ? { bottom: `${picker.pos.bottom}px` } : {}),
            }}
        >
            <div className="osa-lv3-picker-head">
                <span className="osa-lv3-picker-title">
                    {targetCount > 1
                        ? `선택한 ${targetCount.toLocaleString()}개 응답의 분류 지정`
                        : "이 응답의 분류 지정"}
                </span>
                <div className="osa-lv3-picker-head-actions">
                    {picker.currentCode && (
                        <button
                            type="button"
                            className="osa-lv3-picker-clear"
                            title="미분류 상태로 해제"
                            onClick={() => {
                                onUnmap?.();
                                onClose?.();
                            }}
                        >
                            해제
                        </button>
                    )}
                    <button
                        type="button"
                        className="osa-lv3-picker-close"
                        title="닫기 (Esc)"
                        onClick={onClose}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="osa-lv3-picker-search-box">
                <input
                    ref={searchRef}
                    type="text"
                    className="osa-lv3-picker-search"
                    placeholder="소분류명 · 코드 검색"
                    value={kw}
                    onChange={(e) => {
                        setKw(e.target.value);
                        setHighlightIdx(0);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose?.();
                            return;
                        }
                        if (e.key === "ArrowDown") {
                            e.preventDefault();
                            moveHighlight(1);
                            return;
                        }
                        if (e.key === "ArrowUp") {
                            e.preventDefault();
                            moveHighlight(-1);
                            return;
                        }
                        if (e.key === "Enter") {
                            e.preventDefault();
                            const chosen = filtered[highlightIdx] || filtered[0];
                            if (chosen) {
                                onSelect?.(chosen.raw);
                                onClose?.();
                            }
                        }
                    }}
                />
            </div>

            <div ref={listRef} className="osa-lv3-picker-list">
                {filtered.length === 0 ? (
                    <div className="osa-lv3-picker-empty">일치하는 보기가 없습니다.</div>
                ) : (
                    filtered.map((item, idx) => {
                        const isSelected = picker.currentCode && item.code === picker.currentCode;
                        const isActive = idx === highlightIdx;
                        return (
                            <div
                                key={`${item.code}_${idx}`}
                                ref={(el) => {
                                    itemRefs.current[idx] = el;
                                }}
                                className={`osa-lv3-picker-item ${isActive ? "active" : ""} ${
                                    isSelected ? "selected" : ""
                                }`.trim()}
                                onMouseEnter={() => setHighlightIdx(idx)}
                                onClick={() => {
                                    onSelect?.(item.raw);
                                    onClose?.();
                                }}
                            >
                                <div className="osa-lv3-picker-item-main">
                                    <span className="osa-lv3-picker-badge">{item.code}</span>
                                    <span className="osa-lv3-picker-name" title={item.lv3}>
                                        {item.lv3}
                                    </span>
                                </div>
                                <span className="osa-lv3-picker-freq">
                                    {item.freq.toLocaleString()}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="osa-lv3-picker-foot">↑ ↓ 이동 · Enter 지정 · Esc 닫기</div>
        </div>,
        document.body
    );
};

const getKey = (row) => {
    if (!row) return null;
    return row._uid || row.__rowKey || `${row.fixed_key || "row"}_c${row.cid ?? 1}`;
};

const normalizeSentiment = (raw) => {
    const s = String(raw ?? "").trim().toLowerCase();
    if (s === "pos" || s === "positive" || s === "긍정") return "positive";
    if (s === "neg" || s === "negative" || s === "부정") return "negative";
    if (s === "neu" || s === "neutral" || s === "중립") return "neutral";
    return s ? "neutral" : "";
};

const sentimentDisplay = (raw) => {
    const norm = normalizeSentiment(raw);
    if (norm === "positive") return { norm, text: "긍정", cls: "pos", color: "#15803d" };
    if (norm === "negative") return { norm, text: "부정", cls: "neg", color: "#dc2626" };
    if (norm === "neutral") return { norm, text: "중립", cls: "neu", color: "#475569" };
    return { norm: "", text: "—", cls: "empty", color: "#94a3b8" };
};

const natCompare = (aVal, bVal) => {
    const sa = cleanStr(aVal);
    const sb = cleanStr(bVal);
    const na = /^\d+$/.test(sa) ? Number(sa) : null;
    const nb = /^\d+$/.test(sb) ? Number(sb) : null;
    if (na !== null && nb !== null) return na - nb;
    return sa.localeCompare(sb, "ko");
};

/**
 * [응답 데이터] 탭 — 신규 고밀도 테이블 + 인라인 AND 필터 + 고속 코드 펀칭 + 다중행 일괄 편집 (100% 주황색 테마)
 */
const OptionSettingTab1 = forwardRef((props, ref) => {
    const {
        lvCode = "3",
        onChangeLvCode,
        responses = [],
        setResponses,
        codes = [],
        selectedRowKeys = new Set(),
        setSelectedRowKeys,
        onUnsavedChange,
        onResponseCountChange,
        isRightPanelCollapsed = false,
        project_lock,
    } = props;

    const modal = useContext(modalContext);
    const modalRef = useRef(modal);
    modalRef.current = modal;

    // 빠른 상태 필터 칩 ('all' | 'uncoded' | 'unverified')
    const [quickFilter, setQuickFilter] = useState("all");

    // 열 표시 설정 팝오버
    const [colMenuOpen, setColMenuOpen] = useState(false);
    const colMenuRef = useRef(null);
    const tableScrollRef = useRef(null);
    const [lv3Picker, setLv3Picker] = useState(null);
    useEffect(() => {
        if (!colMenuOpen) return;
        const onDocDown = (e) => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) {
                setColMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocDown);
        return () => document.removeEventListener("mousedown", onDocDown);
    }, [colMenuOpen]);
    const [visibleCols, setVisibleCols] = useState({
        answer_origin: true,
        answer: true,
        cid: true,
        add: true,
        lv3: true,
        sentiment: true,
        verified: true,
    });

    const colLayoutKey = `${lvCode}_${Object.entries(visibleCols)
        .map(([k, v]) => `${k}:${v ? 1 : 0}`)
        .join(",")}`;
    useOsaResizableTable(tableScrollRef, colLayoutKey);

    // 열별 인라인 AND 검색 필터
    const [colFilters, setColFilters] = useState({
        origin: "",
        clean: "",
        cid: "",
        lv3OrCode: "",
        lv1: "",
        lv2: "",
        sentiment: "all", // 'all' | 'positive' | 'negative' | 'neutral'
        verified: "all", // 'all' | 'y' | 'n'
    });

    // 3단계 정렬 상태 ([{ field, dir: 'asc'|'desc' }] or [])
    const [sort, setSort] = useState([]);

    // 코드 인라인 타이핑 임시 버퍼
    const [codeDraftMap, setCodeDraftMap] = useState({});

    // 드래그 / 범위 선택 & 고속 편집 포커스 제어 Ref
    const draggingRef = useRef(false);
    const dragMovedRef = useRef(false);
    const anchorIndexRef = useRef(null);
    const selectedKeysRef = useRef(selectedRowKeys);
    const responsesRef = useRef(responses);
    const pendingFocusUidRef = useRef(null);
    const skipNextBlurUidRef = useRef(null);

    useEffect(() => {
        selectedKeysRef.current = selectedRowKeys;
    }, [selectedRowKeys]);
    useEffect(() => {
        responsesRef.current = responses;
    }, [responses]);

    // 대용량 보호 페이지네이션 (기본 500건 단위)
    const [page, setPage] = useState(1);
    const pageSize = 500;

    // Undo / Redo 히스토리
    const makeSig = useCallback((rows = []) => {
        return (rows || [])
            .map((r) => {
                const k = getKey(r);
                const re = String(r?.recheckyn ?? "").toLowerCase() === "y" ? "1" : "0";
                return `${k}:${cleanStr(r?.lv123code)}:${cleanStr(r?.lv3)}:${cleanStr(
                    r?.sentiment
                )}:${re}`;
            })
            .join("|");
    }, []);

    const hist = useUpdateHistory(`tab1:${lvCode}`, { max: 100, signature: makeSig });
    const baselineSigRef = useRef("");
    const baselineInitRef = useRef(false);

    useEffect(() => {
        if (responses.length > 0 && !baselineInitRef.current) {
            baselineInitRef.current = true;
            hist.reset(responses);
            baselineSigRef.current = makeSig(responses);
        }
    }, [responses, hist, makeSig]);

    const commitResponses = useCallback(
        (updater) => {
            setResponses((prev) => {
                const next = typeof updater === "function" ? updater(prev) : updater;
                hist.commit(next);
                const dirty = makeSig(next) !== baselineSigRef.current;
                onUnsavedChange?.(dirty || true);
                return next;
            });
        },
        [setResponses, hist, makeSig, onUnsavedChange]
    );

    // Ctrl+Z / Ctrl+Y (코드 입력칸 포커스 상태에서도 지원)
    useEffect(() => {
        const onKey = (e) => {
            const tag = e.target?.tagName;
            const isCodePunchInput = e.target?.classList?.contains?.("osa-code-punch-input");
            if ((tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") && !isCodePunchInput) {
                return;
            }
            const key = e.key?.toLowerCase?.();
            if (!key) return;

            if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) {
                e.preventDefault();
                setCodeDraftMap({});
                const snap = hist.undo();
                if (snap) {
                    setResponses(snap);
                    onUnsavedChange?.(makeSig(snap) !== baselineSigRef.current);
                }
            } else if ((e.ctrlKey || e.metaKey) && (key === "y" || (key === "z" && e.shiftKey))) {
                e.preventDefault();
                setCodeDraftMap({});
                const snap = hist.redo?.();
                if (snap) {
                    setResponses(snap);
                    onUnsavedChange?.(makeSig(snap) !== baselineSigRef.current);
                }
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [hist, makeSig, onUnsavedChange, setResponses]);

    // 소코드 조회 맵
    const codeLookupMap = useMemo(() => {
        const m = new Map();
        (codes || []).forEach((c) => {
            if (c?.__pendingDelete) return;
            const k = cleanStr(c.lv123code ?? c.code_num);
            if (k) m.set(k, c);
        });
        return m;
    }, [codes]);

    const activeResponses = useMemo(
        () => (responses || []).filter((r) => !r?.__pendingDelete),
        [responses]
    );

    // 소분류 클릭 팝업용 보기 목록 (소코드 오름차순 + 실시간 빈도 포함)
    const popupCodeOptions = useMemo(() => {
        const freqMap = new Map();
        activeResponses.forEach((r) => {
            const c = cleanStr(r.lv123code ?? r.code_num);
            if (c) freqMap.set(c, (freqMap.get(c) || 0) + 1);
        });

        return (codes || [])
            .filter((c) => !c?.__pendingDelete && cleanStr(c.lv123code ?? c.code_num) !== "")
            .map((c) => {
                const sc = cleanStr(c.lv123code ?? c.code_num);
                return {
                    code: sc,
                    lv3: cleanStr(c.lv3) || "(미입력)",
                    lv1: cleanStr(c.lv1),
                    lv2: cleanStr(c.lv2),
                    freq: freqMap.get(sc) || 0,
                    raw: c,
                };
            })
            .sort((a, b) => natCompare(a.code, b.code));
    }, [codes, activeResponses]);

    // 상단 배지 카운트 계산 (소코드 미부여 기준 미분류 집계 일관화)
    const counts = useMemo(() => {
        const total = activeResponses.length;
        let uncoded = 0;
        let unverified = 0;
        activeResponses.forEach((r) => {
            const hasCode = cleanStr(r.lv123code) !== "";
            if (!hasCode) uncoded += 1;
            if (String(r.recheckyn ?? "").toLowerCase() !== "y") unverified += 1;
        });
        return { total, coded: total - uncoded, uncoded, unverified };
    }, [activeResponses]);

    useEffect(() => {
        onResponseCountChange?.(counts.coded);
    }, [counts.coded, onResponseCountChange]);

    // 필터 + 3단계 정렬 적용
    const filteredSortedRows = useMemo(() => {
        let list = activeResponses;

        if (quickFilter === "uncoded") {
            list = list.filter((r) => cleanStr(r.lv123code) === "");
        } else if (quickFilter === "unverified") {
            list = list.filter((r) => String(r.recheckyn ?? "").toLowerCase() !== "y");
        }

        const fOrigin = colFilters.origin.trim().toLowerCase();
        const fClean = colFilters.clean.trim().toLowerCase();
        const fCid = colFilters.cid.trim().toLowerCase();
        const fLv3 = colFilters.lv3OrCode.trim().toLowerCase();
        const fLv1 = colFilters.lv1.trim().toLowerCase();
        const fLv2 = colFilters.lv2.trim().toLowerCase();

        if (
            fOrigin ||
            fClean ||
            fCid ||
            fLv3 ||
            fLv1 ||
            fLv2 ||
            colFilters.sentiment !== "all" ||
            colFilters.verified !== "all"
        ) {
            list = list.filter((r) => {
                if (
                    fOrigin &&
                    !String(r.answer_origin ?? "")
                        .toLowerCase()
                        .includes(fOrigin)
                )
                    return false;
                if (
                    fClean &&
                    !String(r.answer ?? r.answer_fin ?? "")
                        .toLowerCase()
                        .includes(fClean)
                )
                    return false;
                if (fCid && !String(r.cid ?? "").toLowerCase().includes(fCid)) return false;
                if (fLv3) {
                    const mCode = cleanStr(r.lv123code).toLowerCase().includes(fLv3);
                    const mName = cleanStr(r.lv3).toLowerCase().includes(fLv3);
                    if (!mCode && !mName) return false;
                }
                if (fLv1 && !cleanStr(r.lv1).toLowerCase().includes(fLv1)) return false;
                if (fLv2 && !cleanStr(r.lv2).toLowerCase().includes(fLv2)) return false;
                if (colFilters.sentiment !== "all") {
                    if (normalizeSentiment(r.sentiment) !== colFilters.sentiment) return false;
                }
                if (colFilters.verified !== "all") {
                    const isY = String(r.recheckyn ?? "").toLowerCase() === "y";
                    if (colFilters.verified === "y" && !isY) return false;
                    if (colFilters.verified === "n" && isY) return false;
                }
                return true;
            });
        }

        if (sort.length > 0) {
            const { field, dir } = sort[0];
            const mul = dir === "desc" ? -1 : 1;
            list = [...list].sort((a, b) => {
                if (field === "lv3") {
                    const ca = cleanStr(a.lv123code);
                    const cb = cleanStr(b.lv123code);
                    if (ca !== cb) return natCompare(ca, cb) * mul;
                    return natCompare(a.lv3, b.lv3) * mul;
                }
                return natCompare(a?.[field], b?.[field]) * mul;
            });
        }

        return list;
    }, [activeResponses, quickFilter, colFilters, sort]);

    const totalPages = Math.max(1, Math.ceil(filteredSortedRows.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedRows = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filteredSortedRows.slice(start, start + pageSize);
    }, [filteredSortedRows, safePage]);

    // 소분류 일괄 적용 (우측 패널 ← 클릭 또는 더블클릭)
    const applyLv3To = useCallback(
        (targetKeys, codeObj) => {
            const keySet =
                targetKeys instanceof Set ? targetKeys : new Set([].concat(targetKeys || []));
            if (keySet.size === 0) return;

            const subCode = cleanStr(codeObj?.lv123code ?? codeObj?.codeId ?? codeObj?.code_num);
            const subName = cleanStr(codeObj?.lv3 ?? codeObj?.codeName);

            commitResponses((prev) =>
                (prev || []).map((r) => {
                    if (!keySet.has(getKey(r))) return r;
                    return {
                        ...r,
                        lv1: cleanStr(codeObj?.lv1),
                        lv1code: cleanStr(codeObj?.lv1code),
                        lv2: cleanStr(codeObj?.lv2),
                        lv2code: cleanStr(codeObj?.lv2code),
                        lv3: subName,
                        lv3code: subCode,
                        lv123code: subCode,
                        _edited: true,
                    };
                })
            );
        },
        [commitResponses]
    );

    const unmapLv3From = useCallback(
        (targetKeys, optionalMatchCode = null) => {
            const keySet =
                targetKeys instanceof Set ? targetKeys : new Set([].concat(targetKeys || []));
            if (keySet.size === 0) return;
            const filterCode = optionalMatchCode ? cleanStr(optionalMatchCode) : null;

            commitResponses((prev) =>
                (prev || []).map((r) => {
                    if (!keySet.has(getKey(r))) return r;
                    if (
                        filterCode &&
                        cleanStr(r.lv123code) !== "" &&
                        cleanStr(r.lv123code) !== filterCode
                    ) {
                        // 선택 행의 코드가 다르면 그대로 해제 허용 (사용자 직관성 보장)
                    }
                    return {
                        ...r,
                        lv1: "",
                        lv1code: "",
                        lv2: "",
                        lv2code: "",
                        lv3: "",
                        lv3code: "",
                        lv123code: "",
                        _edited: true,
                    };
                })
            );
        },
        [commitResponses]
    );

    useImperativeHandle(
        ref,
        () => ({
            applyLv3To,
            unmapLv3From,
            resetBaseline: (freshRows) => {
                const target = freshRows || responses;
                hist.reset(target);
                baselineSigRef.current = makeSig(target);
            },
        }),
        [applyLv3To, hist, makeSig, responses, unmapLv3From]
    );

    // 멀티 응답 행 즉시 추가 (버튼 클릭 및 Shift+Enter 공용)
    const focusCodeInputByKey = useCallback((uid) => {
        if (!uid) return;
        requestAnimationFrame(() => {
            const el = document.querySelector(
                `input[data-code-input-uid="${CSS.escape(uid)}"]`
            );
            if (el) {
                el.closest("tr")?.scrollIntoView?.({ block: "nearest" });
                el.focus();
                el.select?.();
            }
        });
    }, []);

    // React 18 배치 렌더링 이후 신규 멀티 행 자동 포커스 보장
    useEffect(() => {
        const targetUid = pendingFocusUidRef.current;
        if (!targetUid) return;
        const exists = pagedRows.some((r) => getKey(r) === targetUid);
        if (exists) {
            pendingFocusUidRef.current = null;
            focusCodeInputByKey(targetUid);
        }
    }, [pagedRows, focusCodeInputByKey]);

    // 멀티 응답 행 즉시 추가 (버튼 클릭 및 Shift+Enter 공용)
    const insertMultiRowBelow = useCallback(
        (baseRow, focusCodeInput = true) => {
            if (!baseRow || project_lock === "수정불가") return;
            const baseKey = getKey(baseRow);
            const fk = baseRow.fixed_key;
            const curList = responsesRef.current || [];
            if (!curList.some((r) => getKey(r) === baseKey)) return;

            const existingCids = curList
                .filter((r) => r.fixed_key === fk && !r.__pendingDelete)
                .map((r) => Number(r.cid || 1))
                .filter((n) => Number.isFinite(n));
            const maxCid = existingCids.length ? Math.max(...existingCids) : 1;
            const nextCid = String(Math.max(Number(baseRow.cid || 1) + 1, maxCid + 1));

            const createdKey = `${String(fk || "row")}_c${nextCid}_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 6)}`;

            if (focusCodeInput) {
                pendingFocusUidRef.current = createdKey;
            }
            setSelectedRowKeys?.(new Set([createdKey]));

            commitResponses((prev) => {
                const prevData = prev || [];
                const idx = prevData.findIndex((r) => getKey(r) === baseKey);
                if (idx === -1) return prevData;

                const newRow = {
                    ...baseRow,
                    cid: nextCid,
                    lv1: "",
                    lv1code: "",
                    lv2: "",
                    lv2code: "",
                    lv3: "",
                    lv3code: "",
                    lv123code: "",
                    recheckyn: "",
                    selected: false,
                    __isNew: true,
                    _edited: true,
                    _uid: createdKey,
                    __rowKey: createdKey,
                };

                const nextData = [...prevData];
                nextData.splice(idx + 1, 0, newRow);
                return nextData;
            });
        },
        [commitResponses, project_lock, setSelectedRowKeys]
    );

    // 멀티 응답 행 삭제 (인접 행 포커스 복원 포함)
    const handleDeleteMultiRow = useCallback(
        (row, restoreInputFocus = false) => {
            if (!row || Number(row.cid || 1) <= 1 || project_lock === "수정불가") return;
            const rowKey = getKey(row);
            const curIdx = pagedRows.findIndex((r) => getKey(r) === rowKey);
            const fallbackRow =
                (curIdx > 0 ? pagedRows[curIdx - 1] : null) ||
                (curIdx >= 0 && curIdx + 1 < pagedRows.length ? pagedRows[curIdx + 1] : null);
            const fallbackKey = fallbackRow ? getKey(fallbackRow) : null;

            const executeDelete = () => {
                if (fallbackKey) {
                    setSelectedRowKeys?.(new Set([fallbackKey]));
                    if (restoreInputFocus) {
                        pendingFocusUidRef.current = fallbackKey;
                    }
                }
                commitResponses((prev) => (prev || []).filter((r) => getKey(r) !== rowKey));
            };

            // 방금 추가한 빈 멀티 행은 확인 모달 없이 즉시 삭제 (Ctrl+Z 복구 가능)
            if (!cleanStr(row.lv123code)) {
                executeDelete();
                return;
            }

            modalRef.current?.showConfirm?.("알림", "해당 멀티 응답 행을 삭제하시겠습니까?", {
                btns: [
                    { title: "취소" },
                    {
                        title: "삭제",
                        click: executeDelete,
                    },
                ],
            });
        },
        [commitResponses, pagedRows, project_lock, setSelectedRowKeys]
    );

    // 고속 코드 펀칭 반영 (다중 선택 상태에서는 선택된 행 전체에 일괄 반영)
    const commitQuickCodeValue = useCallback(
        (row, rawValue) => {
            const rowKey = getKey(row);
            const trimmed = cleanStr(rawValue);
            const isBatch =
                selectedKeysRef.current.size > 1 && selectedKeysRef.current.has(rowKey);
            const targetSet = isBatch ? new Set(selectedKeysRef.current) : new Set([rowKey]);

            setCodeDraftMap((prev) => {
                let changed = false;
                const next = { ...prev };
                targetSet.forEach((k) => {
                    if (k in next) {
                        delete next[k];
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });

            const hasAnyDiff = (responsesRef.current || []).some(
                (r) => targetSet.has(getKey(r)) && cleanStr(r?.lv123code) !== trimmed
            );
            if (!hasAnyDiff) return true;

            if (trimmed === "") {
                commitResponses((prev) =>
                    (prev || []).map((r) =>
                        targetSet.has(getKey(r))
                            ? {
                                  ...r,
                                  lv1: "",
                                  lv1code: "",
                                  lv2: "",
                                  lv2code: "",
                                  lv3: "",
                                  lv3code: "",
                                  lv123code: "",
                                  _edited: true,
                              }
                            : r
                    )
                );
                return true;
            }

            const matched = codeLookupMap.get(trimmed);
            if (!matched) {
                modalRef.current?.showErrorAlert?.(
                    "알림",
                    `소코드 '${trimmed}'에 해당하는 보기가 코드북에 없습니다.`
                );
                return false;
            }

            commitResponses((prev) =>
                (prev || []).map((r) =>
                    targetSet.has(getKey(r))
                        ? {
                              ...r,
                              lv1: cleanStr(matched.lv1),
                              lv1code: cleanStr(matched.lv1code),
                              lv2: cleanStr(matched.lv2),
                              lv2code: cleanStr(matched.lv2code),
                              lv3: cleanStr(matched.lv3),
                              lv3code: trimmed,
                              lv123code: trimmed,
                              _edited: true,
                          }
                        : r
                )
            );
            return true;
        },
        [codeLookupMap, commitResponses]
    );

    const focusAdjacentCodeInput = useCallback(
        (currentKey, delta) => {
            const curSel = selectedKeysRef.current;
            let baseIdx = pagedRows.findIndex((r) => getKey(r) === currentKey);
            if (baseIdx === -1) return;

            // 다중 선택 일괄 펀칭 직후에는 선택 블록의 끝(아래 이동) 또는 시작(위 이동) 바깥 행으로 점프
            if (curSel?.size > 1 && curSel.has(currentKey)) {
                const indices = [];
                pagedRows.forEach((r, i) => {
                    if (curSel.has(getKey(r))) indices.push(i);
                });
                if (indices.length > 0) {
                    baseIdx = delta > 0 ? Math.max(...indices) : Math.min(...indices);
                }
            }

            const nextRow = pagedRows[baseIdx + delta];
            if (!nextRow) return;
            const nextKey = getKey(nextRow);
            anchorIndexRef.current = baseIdx + delta;
            setSelectedRowKeys?.(new Set([nextKey]));
            focusCodeInputByKey(nextKey);
        },
        [focusCodeInputByKey, pagedRows, setSelectedRowKeys]
    );

    const handleCodeInputKeyDown = useCallback(
        (e, row) => {
            const rowKey = getKey(row);
            const val = e.currentTarget.value;

            if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                skipNextBlurUidRef.current = rowKey;
                if (commitQuickCodeValue(row, val)) {
                    insertMultiRowBelow(row, true);
                } else {
                    skipNextBlurUidRef.current = null;
                }
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                skipNextBlurUidRef.current = rowKey;
                if (commitQuickCodeValue(row, val)) {
                    focusAdjacentCodeInput(rowKey, 1);
                } else {
                    skipNextBlurUidRef.current = null;
                }
                return;
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                e.stopPropagation();
                skipNextBlurUidRef.current = rowKey;
                if (commitQuickCodeValue(row, val)) {
                    focusAdjacentCodeInput(rowKey, 1);
                } else {
                    skipNextBlurUidRef.current = null;
                }
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                e.stopPropagation();
                skipNextBlurUidRef.current = rowKey;
                if (commitQuickCodeValue(row, val)) {
                    focusAdjacentCodeInput(rowKey, -1);
                } else {
                    skipNextBlurUidRef.current = null;
                }
                return;
            }
            if (e.key === "Delete") {
                const inputEl = e.currentTarget;
                const allSelected =
                    val.length === 0 ||
                    (inputEl.selectionStart === 0 && inputEl.selectionEnd === val.length);
                if (!allSelected) return;

                e.preventDefault();
                e.stopPropagation();

                if (Number(row.cid || 1) > 1) {
                    skipNextBlurUidRef.current = rowKey;
                    handleDeleteMultiRow(row, true);
                } else if (cleanStr(val) !== "" || cleanStr(row.lv123code) !== "") {
                    commitQuickCodeValue(row, "");
                }
            }
        },
        [commitQuickCodeValue, focusAdjacentCodeInput, handleDeleteMultiRow, insertMultiRowBelow]
    );

    // 행만 클릭해 선택한 상태에서도 고속 편집 단축키(↑/↓/Enter/Shift+Enter/Del) 동작 지원
    useEffect(() => {
        const onGridShortcut = (e) => {
            if (project_lock === "수정불가") return;
            const tag = e.target?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if (e.target?.closest?.(".k-dropdownlist") || e.target?.closest?.(".k-popup")) return;

            const selArr = Array.from(selectedKeysRef.current || []);
            if (selArr.length === 0) return;

            if (e.key === "Escape" && selArr.length > 1) {
                e.preventDefault();
                setSelectedRowKeys?.(new Set());
                return;
            }

            const lastKey = selArr[selArr.length - 1];
            const curIdx = pagedRows.findIndex((r) => getKey(r) === lastKey);
            if (curIdx === -1) return;
            const curRow = pagedRows[curIdx];

            // 행 선택 상태에서 바로 숫자키 입력 시 코드 입력칸 즉시 포커스 + 일괄 펀칭 준비
            if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                const digit = e.key;
                setCodeDraftMap((prev) => ({ ...prev, [lastKey]: digit }));
                requestAnimationFrame(() => {
                    const el = document.querySelector(
                        `input[data-code-input-uid="${CSS.escape(lastKey)}"]`
                    );
                    if (el) {
                        el.focus();
                        try {
                            el.setSelectionRange(1, 1);
                        } catch {
                            // ignore
                        }
                    }
                });
                return;
            }

            if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                insertMultiRowBelow(curRow, true);
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                focusCodeInputByKey(lastKey);
                return;
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const delta = e.key === "ArrowDown" ? 1 : -1;
                const nextIdx = Math.min(Math.max(curIdx + delta, 0), pagedRows.length - 1);
                const nextRow = pagedRows[nextIdx];
                if (!nextRow) return;
                const nextKey = getKey(nextRow);

                if (e.shiftKey && anchorIndexRef.current != null) {
                    const start = Math.min(anchorIndexRef.current, nextIdx);
                    const end = Math.max(anchorIndexRef.current, nextIdx);
                    const nextSet = new Set();
                    for (let i = start; i <= end; i++) {
                        if (pagedRows[i]) nextSet.add(getKey(pagedRows[i]));
                    }
                    setSelectedRowKeys?.(nextSet);
                } else {
                    anchorIndexRef.current = nextIdx;
                    setSelectedRowKeys?.(new Set([nextKey]));
                }
                requestAnimationFrame(() => {
                    const el = document.querySelector(
                        `input[data-code-input-uid="${CSS.escape(nextKey)}"]`
                    );
                    el?.closest("tr")?.scrollIntoView?.({ block: "nearest" });
                });
                return;
            }
            if (e.key === "Delete") {
                e.preventDefault();
                if (selArr.length === 1 && Number(curRow.cid || 1) > 1) {
                    handleDeleteMultiRow(curRow, false);
                } else {
                    unmapLv3From(selectedKeysRef.current);
                }
            }
        };

        window.addEventListener("keydown", onGridShortcut);
        return () => window.removeEventListener("keydown", onGridShortcut);
    }, [
        focusCodeInputByKey,
        handleDeleteMultiRow,
        insertMultiRowBelow,
        pagedRows,
        project_lock,
        setSelectedRowKeys,
        unmapLv3From,
    ]);

    // 마우스 드래그 / Shift+클릭 / Ctrl+클릭 다중 선택
    useEffect(() => {
        const handleWindowUp = () => {
            draggingRef.current = false;
            dragMovedRef.current = false;
            document.body.classList.remove("osa-is-row-dragging");
        };
        window.addEventListener("mouseup", handleWindowUp);
        return () => {
            window.removeEventListener("mouseup", handleWindowUp);
            document.body.classList.remove("osa-is-row-dragging");
        };
    }, []);

    const handleRowMouseDown = useCallback(
        (row, rowIdx, e) => {
            if (e.button !== 0) return;
            // Kendo DropDownList 등 document.body 포털 클릭이 React 트리로 버블링될 때 선택 초기화 방지
            if (!e.currentTarget.contains(e.target)) return;

            const key = getKey(row);
            if (e.shiftKey && anchorIndexRef.current != null) {
                e.preventDefault();
                window.getSelection?.()?.removeAllRanges?.();
                const start = Math.min(anchorIndexRef.current, rowIdx);
                const end = Math.max(anchorIndexRef.current, rowIdx);
                const next = new Set();
                for (let i = start; i <= end; i++) {
                    if (pagedRows[i]) next.add(getKey(pagedRows[i]));
                }
                setSelectedRowKeys?.(next);
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                anchorIndexRef.current = rowIdx;
                setSelectedRowKeys?.((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                });
                return;
            }

            if (
                e.target.closest("input") ||
                e.target.closest("button") ||
                e.target.closest("select") ||
                e.target.closest(".k-dropdownlist") ||
                e.target.closest(".k-picker")
            ) {
                return;
            }

            draggingRef.current = true;
            dragMovedRef.current = false;
            anchorIndexRef.current = rowIdx;
            setSelectedRowKeys?.(new Set([key]));
        },
        [pagedRows, setSelectedRowKeys]
    );

    const handleRowMouseEnter = useCallback(
        (rowIdx) => {
            if (!draggingRef.current || anchorIndexRef.current == null) return;
            if (rowIdx === anchorIndexRef.current && !dragMovedRef.current) return;
            dragMovedRef.current = true;
            document.body.classList.add("osa-is-row-dragging");
            window.getSelection?.()?.removeAllRanges?.();
            const start = Math.min(anchorIndexRef.current, rowIdx);
            const end = Math.max(anchorIndexRef.current, rowIdx);
            const next = new Set();
            for (let i = start; i <= end; i++) {
                if (pagedRows[i]) next.add(getKey(pagedRows[i]));
            }
            setSelectedRowKeys?.(next);
        },
        [pagedRows, setSelectedRowKeys]
    );

    // 감성 드롭다운 변경 (다중 선택 시 일괄 변경)
    const handleChangeSentiment = useCallback(
        (row, nextSent) => {
            if (project_lock === "수정불가") return;
            const rowKey = getKey(row);
            const targetSet =
                selectedKeysRef.current.size > 1 && selectedKeysRef.current.has(rowKey)
                    ? selectedKeysRef.current
                    : new Set([rowKey]);

            commitResponses((prev) =>
                (prev || []).map((r) =>
                    targetSet.has(getKey(r)) ? { ...r, sentiment: nextSent, _edited: true } : r
                )
            );
        },
        [commitResponses, project_lock]
    );

    // 확인 체크박스 토글 (다중 선택 시 일괄 변경)
    const handleToggleVerify = useCallback(
        (row, checked) => {
            if (project_lock === "수정불가") return;
            const rowKey = getKey(row);
            const nextRe = checked ? "y" : "";
            const targetSet =
                selectedKeysRef.current.size > 1 && selectedKeysRef.current.has(rowKey)
                    ? selectedKeysRef.current
                    : new Set([rowKey]);

            commitResponses((prev) =>
                (prev || []).map((r) =>
                    targetSet.has(getKey(r))
                        ? { ...r, recheckyn: nextRe, selected: checked, _edited: true }
                        : r
                )
            );
        },
        [commitResponses, project_lock]
    );

    // 현재 페이지 전체 확인 토글
    const allPageVerified =
        pagedRows.length > 0 &&
        pagedRows.every((r) => String(r.recheckyn ?? "").toLowerCase() === "y");

    const handleToggleAllPageVerify = (checked) => {
        if (project_lock === "수정불가") return;
        const pageKeySet = new Set(pagedRows.map(getKey));
        const nextRe = checked ? "y" : "";
        commitResponses((prev) =>
            (prev || []).map((r) =>
                pageKeySet.has(getKey(r))
                    ? { ...r, recheckyn: nextRe, selected: checked, _edited: true }
                    : r
            )
        );
    };

    const resetAllFilters = () => {
        setQuickFilter("all");
        setColFilters({
            origin: "",
            clean: "",
            cid: "",
            lv3OrCode: "",
            lv1: "",
            lv2: "",
            sentiment: "all",
            verified: "all",
        });
        setPage(1);
    };

    const renderSortBadge = (field) => {
        const cur = sort.find((s) => s.field === field);
        if (!cur) return <span className="osa-sort-icon">⇅</span>;
        return (
            <span className="osa-sort-icon active">{cur.dir === "asc" ? "↑" : "↓"}</span>
        );
    };

    const renderHighlightedClean = (row) => {
        const answerText = String(row?.answer ?? row?.answer_fin ?? "");
        const excerpts = String(row?.excerpts ?? "");
        if (!excerpts) return answerText;

        const keywords = excerpts.split("@#@").filter(Boolean);
        if (keywords.length === 0 || answerText.trim() === excerpts.trim()) return answerText;

        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const sortedKw = [...keywords].sort((a, b) => b.length - a.length);
        const pattern = new RegExp(`(${sortedKw.map(escapeRegExp).join("|")})`, "g");
        const parts = answerText.split(pattern);
        return parts.map((part, idx) =>
            idx % 2 === 1 ? (
                <span key={idx} style={{ color: "#ea580c", fontWeight: 500 }}>
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    const showLv1 = String(lvCode) === "3";
    const showLv2 = String(lvCode) === "2" || String(lvCode) === "3";
    const toggleableKeys = ["answer_origin", "answer", "cid", "add", "sentiment", "verified"];
    const visibleColCount = toggleableKeys.filter((k) => visibleCols[k]).length;

    // 좌측 그리드 축소 시 퍼센트 컬럼들이 찌그러지지 않고 가로 스크롤이 생성되도록 활성 컬럼 기준 최소 폭 산출
    const hasFlexAnswerCol = Boolean(visibleCols.answer_origin || visibleCols.answer);
    const minTableWidth =
        215 +
        (visibleCols.answer_origin ? 140 : 0) +
        (visibleCols.answer ? 150 : 0) +
        (visibleCols.cid ? 52 : 0) +
        (visibleCols.add ? 60 : 0) +
        (showLv1 ? 108 : 0) +
        (showLv2 ? 108 : 0) +
        (visibleCols.sentiment ? 76 : 0) +
        (visibleCols.verified ? 74 : 0);

    return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            {/* 서브 툴바 */}
            <div className="osa-subtoolbar">
                <div className="osa-subtoolbar-left">
                    {/* 1. 상태 필터 세그먼트 (전체 / 미분류 / 미확인) */}
                    <div className="osa-seg-filter" role="group" aria-label="응답 상태 필터">
                        <button
                            type="button"
                            className={`osa-seg-filter-btn ${quickFilter === "all" ? "active" : ""}`}
                            onClick={() => {
                                setQuickFilter("all");
                                setPage(1);
                            }}
                        >
                            전체 <b>{counts.total.toLocaleString()}</b>
                        </button>
                        <button
                            type="button"
                            className={`osa-seg-filter-btn ${quickFilter === "uncoded" ? "active" : ""
                                }`}
                            onClick={() => {
                                setQuickFilter((prev) => (prev === "uncoded" ? "all" : "uncoded"));
                                setPage(1);
                            }}
                        >
                            미분류{" "}
                            <b className={counts.uncoded > 0 ? "warn" : ""}>
                                {counts.uncoded.toLocaleString()}
                            </b>
                        </button>
                        <button
                            type="button"
                            className={`osa-seg-filter-btn ${quickFilter === "unverified" ? "active" : ""
                                }`}
                            onClick={() => {
                                setQuickFilter((prev) =>
                                    prev === "unverified" ? "all" : "unverified"
                                );
                                setPage(1);
                            }}
                        >
                            미확인 <b>{counts.unverified.toLocaleString()}</b>
                        </button>
                    </div>

                    {selectedRowKeys.size > 1 && (
                        <>
                            <div className="osa-subtoolbar-divider" />
                            <div className="osa-sel-inline-group">
                                <span className="osa-sel-inline-text">
                                    <b>{selectedRowKeys.size.toLocaleString()}</b>개 선택
                                </span>
                                <button
                                    type="button"
                                    className="osa-sel-inline-clear"
                                    title="다중 선택 해제 (Esc)"
                                    aria-label="다중 선택 해제"
                                    onClick={() => setSelectedRowKeys?.(new Set())}
                                >
                                    <X size={12.5} />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* 우측: 그리드 컬럼 표출 설정 팝오버 */}
                <div ref={colMenuRef} style={{ position: "relative", marginLeft: "auto" }}>
                    <button
                        type="button"
                        className={`osa-btn ${colMenuOpen ? "active" : ""}`}
                        style={{
                            height: "30px",
                            padding: "0 11px",
                            borderRadius: "6px",
                            borderColor: "#cbd5e1",
                            color: "#334155",
                            fontSize: "12.5px",
                            fontWeight: 500,
                            gap: "5px",
                            ...(visibleColCount < toggleableKeys.length && !colMenuOpen
                                ? {
                                    borderColor: "#fdba74",
                                    color: "#c2410c",
                                    backgroundColor: "#fff7ed",
                                }
                                : {}),
                        }}
                        title="그리드에 표출할 컬럼을 선택합니다"
                        onClick={() => setColMenuOpen((v) => !v)}
                    >
                        <Columns size={13} />
                        <span>
                            컬럼 표출
                            {visibleColCount < toggleableKeys.length
                                ? ` (${visibleColCount}/${toggleableKeys.length})`
                                : ""}
                        </span>
                        <ChevronDown size={12} style={{ opacity: 0.7 }} />
                    </button>
                    {colMenuOpen && (
                        <div className="osa-col-popover">
                            <div className="osa-col-popover-head">
                                <span>표출할 컬럼 선택</span>
                                {visibleColCount < toggleableKeys.length && (
                                    <button
                                        type="button"
                                        className="osa-col-popover-reset"
                                        onClick={() =>
                                            setVisibleCols((prev) => ({
                                                ...prev,
                                                answer_origin: true,
                                                answer: true,
                                                cid: true,
                                                add: true,
                                                sentiment: true,
                                                verified: true,
                                            }))
                                        }
                                    >
                                        전체표출
                                    </button>
                                )}
                            </div>
                            {[
                                { key: "answer_origin", label: "원본 응답" },
                                { key: "answer", label: "클리닝 응답" },
                                { key: "cid", label: "멀티(cid)" },
                                { key: "add", label: "추가/삭제" },
                                { key: "sentiment", label: "감성" },
                                { key: "verified", label: "확인 체크" },
                            ].map((c) => (
                                <label key={c.key} className="osa-col-popover-item">
                                    <input
                                        type="checkbox"
                                        checked={visibleCols[c.key]}
                                        onChange={(e) =>
                                            setVisibleCols((prev) => ({
                                                ...prev,
                                                [c.key]: e.target.checked,
                                            }))
                                        }
                                    />
                                    <span>{c.label}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 메인 응답 데이터 테이블 */}
            <div
                ref={tableScrollRef}
                className="osa-table-scroll"
                onClick={() => {
                    if (colMenuOpen) setColMenuOpen(false);
                }}
            >
                <table
                    className="osa-table osa-drag-selectable"
                    style={{ minWidth: `${minTableWidth}px` }}
                >
                    <thead>
                        {/* 1행: 정렬 가능한 컬럼 타이틀 */}
                        <tr className="osa-th-row">
                            {visibleCols.answer_origin && (
                                <th>
                                    <span
                                        className="osa-th-sortable"
                                        onClick={() =>
                                            setSort((p) => toggleThreeStageSort(p, "answer_origin"))
                                        }
                                    >
                                        원본 응답 {renderSortBadge("answer_origin")}
                                    </span>
                                </th>
                            )}
                            {visibleCols.answer && (
                                <th>
                                    <span
                                        className="osa-th-sortable"
                                        onClick={() =>
                                            setSort((p) => toggleThreeStageSort(p, "answer"))
                                        }
                                    >
                                        클리닝 응답 {renderSortBadge("answer")}
                                    </span>
                                </th>
                            )}
                            {visibleCols.cid && (
                                <th
                                    style={{
                                        width: "52px",
                                        textAlign: "center",
                                        padding: "0 4px",
                                    }}
                                >
                                    <span
                                        className="osa-th-sortable"
                                        onClick={() =>
                                            setSort((p) => toggleThreeStageSort(p, "cid"))
                                        }
                                    >
                                        멀티 {renderSortBadge("cid")}
                                    </span>
                                </th>
                            )}
                            {visibleCols.add && (
                                <th
                                    style={{
                                        width: "60px",
                                        textAlign: "center",
                                        padding: "0 4px",
                                    }}
                                >
                                    추가
                                </th>
                            )}
                            <th style={hasFlexAnswerCol ? { width: "215px" } : undefined}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() => setSort((p) => toggleThreeStageSort(p, "lv3"))}
                                >
                                    소분류 {renderSortBadge("lv3")}
                                </span>
                            </th>
                            {showLv1 && (
                                <th style={{ width: "108px" }}>
                                    <span
                                        className="osa-th-sortable"
                                        onClick={() =>
                                            setSort((p) => toggleThreeStageSort(p, "lv1"))
                                        }
                                    >
                                        대분류 {renderSortBadge("lv1")}
                                    </span>
                                </th>
                            )}
                            {showLv2 && (
                                <th style={{ width: "108px" }}>
                                    <span
                                        className="osa-th-sortable"
                                        onClick={() =>
                                            setSort((p) => toggleThreeStageSort(p, "lv2"))
                                        }
                                    >
                                        중분류 {renderSortBadge("lv2")}
                                    </span>
                                </th>
                            )}
                            {visibleCols.sentiment && (
                                <th
                                    style={{
                                        width: "76px",
                                        textAlign: "center",
                                        padding: "0 4px",
                                    }}
                                >
                                    <span
                                        className="osa-th-sortable"
                                        onClick={() =>
                                            setSort((p) => toggleThreeStageSort(p, "sentiment"))
                                        }
                                    >
                                        감성 {renderSortBadge("sentiment")}
                                    </span>
                                </th>
                            )}
                            {visibleCols.verified && (
                                <th
                                    style={{
                                        width: "74px",
                                        textAlign: "center",
                                        padding: "0 4px",
                                    }}
                                >
                                    <label
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "5px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={allPageVerified}
                                            disabled={project_lock === "수정불가"}
                                            onChange={(e) =>
                                                handleToggleAllPageVerify(e.target.checked)
                                            }
                                            style={{ accentColor: "#f97316", cursor: "pointer" }}
                                        />
                                        <span>확인</span>
                                    </label>
                                </th>
                            )}
                        </tr>

                        {/* 2행: 열별 인라인 AND 검색 필터 */}
                        <tr className="osa-filter-row">
                            {visibleCols.answer_origin && (
                                <th>
                                    <input
                                        type="text"
                                        className="osa-col-filter-input"
                                        placeholder="원본 검색"
                                        value={colFilters.origin}
                                        onChange={(e) => {
                                            setPage(1);
                                            setColFilters((p) => ({
                                                ...p,
                                                origin: e.target.value,
                                            }));
                                        }}
                                    />
                                </th>
                            )}
                            {visibleCols.answer && (
                                <th>
                                    <input
                                        type="text"
                                        className="osa-col-filter-input"
                                        placeholder="클리닝 검색"
                                        value={colFilters.clean}
                                        onChange={(e) => {
                                            setPage(1);
                                            setColFilters((p) => ({
                                                ...p,
                                                clean: e.target.value,
                                            }));
                                        }}
                                    />
                                </th>
                            )}
                            {visibleCols.cid && (
                                <th>
                                    <input
                                        type="text"
                                        className="osa-col-filter-input"
                                        style={{ textAlign: "center" }}
                                        placeholder="멀티"
                                        value={colFilters.cid}
                                        onChange={(e) => {
                                            setPage(1);
                                            setColFilters((p) => ({ ...p, cid: e.target.value }));
                                        }}
                                    />
                                </th>
                            )}
                            {visibleCols.add && <th />}
                            <th>
                                <input
                                    type="text"
                                    className="osa-col-filter-input"
                                    placeholder="소분류/코드"
                                    value={colFilters.lv3OrCode}
                                    onChange={(e) => {
                                        setPage(1);
                                        setColFilters((p) => ({
                                            ...p,
                                            lv3OrCode: e.target.value,
                                        }));
                                    }}
                                />
                            </th>
                            {showLv1 && (
                                <th>
                                    <input
                                        type="text"
                                        className="osa-col-filter-input"
                                        placeholder="대분류"
                                        value={colFilters.lv1}
                                        onChange={(e) => {
                                            setPage(1);
                                            setColFilters((p) => ({ ...p, lv1: e.target.value }));
                                        }}
                                    />
                                </th>
                            )}
                            {showLv2 && (
                                <th>
                                    <input
                                        type="text"
                                        className="osa-col-filter-input"
                                        placeholder="중분류"
                                        value={colFilters.lv2}
                                        onChange={(e) => {
                                            setPage(1);
                                            setColFilters((p) => ({ ...p, lv2: e.target.value }));
                                        }}
                                    />
                                </th>
                            )}
                            {visibleCols.sentiment && (
                                <th style={{ padding: "0 4px" }}>
                                    <OsaDropDown
                                        size="sm"
                                        popupWidth="76px"
                                        options={SENTIMENT_FILTER_OPTIONS}
                                        value={colFilters.sentiment}
                                        onValueChange={(v) => {
                                            setPage(1);
                                            setColFilters((p) => ({
                                                ...p,
                                                sentiment: v,
                                            }));
                                        }}
                                    />
                                </th>
                            )}
                            {visibleCols.verified && (
                                <th>
                                    <OsaDropDown
                                        size="sm"
                                        options={VERIFIED_FILTER_OPTIONS}
                                        value={colFilters.verified}
                                        onValueChange={(v) => {
                                            setPage(1);
                                            setColFilters((p) => ({
                                                ...p,
                                                verified: v,
                                            }));
                                        }}
                                    />
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {pagedRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={
                                        1 +
                                        (visibleCols.answer_origin ? 1 : 0) +
                                        (visibleCols.answer ? 1 : 0) +
                                        (visibleCols.cid ? 1 : 0) +
                                        (visibleCols.add ? 1 : 0) +
                                        (showLv1 ? 1 : 0) +
                                        (showLv2 ? 1 : 0) +
                                        (visibleCols.sentiment ? 1 : 0) +
                                        (visibleCols.verified ? 1 : 0)
                                    }
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
                            pagedRows.map((row, rowIdx) => {
                                const rowKey = getKey(row);
                                const isSel = selectedRowKeys.has(rowKey);
                                const subCode = cleanStr(row.lv123code);
                                const subLabel = cleanStr(row.lv3);
                                const draftVal =
                                    rowKey in codeDraftMap ? codeDraftMap[rowKey] : subCode;
                                const isMulti = Number(row.cid || 1) > 1;
                                const sentInfo = sentimentDisplay(row.sentiment);
                                const isVerified =
                                    String(row.recheckyn ?? "").toLowerCase() === "y";

                                return (
                                    <tr
                                        key={rowKey}
                                        className={isSel ? "osa-row-selected" : ""}
                                        onMouseDown={(e) => handleRowMouseDown(row, rowIdx, e)}
                                        onMouseEnter={() => handleRowMouseEnter(rowIdx)}
                                    >
                                        {visibleCols.answer_origin && (
                                            <td
                                                title={row.answer_origin || ""}
                                                style={{ color: "#475569" }}
                                            >
                                                {row.answer_origin || "—"}
                                            </td>
                                        )}
                                        {visibleCols.answer && (
                                            <td title={row.answer || row.answer_fin || ""}>
                                                {renderHighlightedClean(row)}
                                            </td>
                                        )}
                                        {visibleCols.cid && (
                                            <td
                                                style={{
                                                    textAlign: "center",
                                                    fontWeight: isMulti ? 600 : 400,
                                                    color: isMulti ? "#ea580c" : "#64748b",
                                                }}
                                            >
                                                {row.cid || 1}
                                            </td>
                                        )}
                                        {visibleCols.add && (
                                            <td style={{ textAlign: "center", padding: "3px 4px" }}>
                                                <div
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "3px",
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        className="osa-mini-square-btn"
                                                        disabled={project_lock === "수정불가"}
                                                        title="아래에 멀티 응답 행 추가 (Shift+Enter)"
                                                        onClick={() =>
                                                            insertMultiRowBelow(row, true)
                                                        }
                                                    >
                                                        +
                                                    </button>
                                                    {isMulti && project_lock !== "수정불가" && (
                                                        <button
                                                            type="button"
                                                            className="osa-mini-square-btn danger"
                                                            title="멀티 응답 행 삭제"
                                                            onClick={() => handleDeleteMultiRow(row)}
                                                        >
                                                            −
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        {/* 소분류: 고속 코드 입력칸 + 소분류 레이블 */}
                                        <td>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "7px",
                                                    minWidth: 0,
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    data-code-input-uid={rowKey}
                                                    className={`osa-code-punch-input ${!subCode ? "empty" : ""
                                                        }`}
                                                    disabled={project_lock === "수정불가"}
                                                    value={draftVal}
                                                    placeholder="—"
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setCodeDraftMap((prev) => ({
                                                            ...prev,
                                                            [rowKey]: v,
                                                        }));
                                                    }}
                                                    onFocus={(e) => {
                                                        if (!selectedKeysRef.current.has(rowKey)) {
                                                            setSelectedRowKeys?.(new Set([rowKey]));
                                                        }
                                                        e.target.select?.();
                                                    }}
                                                    onBlur={(e) => {
                                                        if (skipNextBlurUidRef.current === rowKey) {
                                                            skipNextBlurUidRef.current = null;
                                                            return;
                                                        }
                                                        commitQuickCodeValue(row, e.target.value);
                                                    }}
                                                    onKeyDown={(e) => handleCodeInputKeyDown(e, row)}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={project_lock === "수정불가"}
                                                    title={
                                                        project_lock === "수정불가"
                                                            ? subLabel || "미분류"
                                                            : `${
                                                                  subLabel || "미분류"
                                                              } (클릭하여 분류 선택)`
                                                    }
                                                    className={`osa-lv3-label-btn ${
                                                        !subLabel ? "uncoded" : ""
                                                    } ${
                                                        lv3Picker?.rowKey === rowKey ? "open" : ""
                                                    }`.trim()}
                                                    onClick={(e) => {
                                                        if (project_lock === "수정불가") return;
                                                        if (lv3Picker?.rowKey === rowKey) {
                                                            setLv3Picker(null);
                                                            return;
                                                        }
                                                        const btnEl = e.currentTarget;
                                                        const rect = btnEl.getBoundingClientRect();
                                                        const popupWidth = 344;
                                                        const estHeight = 368;
                                                        const left = Math.max(
                                                            12,
                                                            Math.min(
                                                                rect.left,
                                                                window.innerWidth - popupWidth - 16
                                                            )
                                                        );
                                                        const openUp =
                                                            window.innerHeight - rect.bottom <
                                                                estHeight && rect.top > estHeight;

                                                        const curSel = selectedKeysRef.current;
                                                        const targetKeys =
                                                            curSel?.size > 1 && curSel.has(rowKey)
                                                                ? new Set(curSel)
                                                                : new Set([rowKey]);
                                                        if (!(curSel?.size > 1 && curSel.has(rowKey))) {
                                                            setSelectedRowKeys?.(new Set([rowKey]));
                                                        }

                                                        setLv3Picker({
                                                            rowKey,
                                                            currentCode: subCode,
                                                            targetKeys,
                                                            anchorEl: btnEl,
                                                            pos: {
                                                                left,
                                                                top: openUp
                                                                    ? undefined
                                                                    : rect.bottom + 4,
                                                                bottom: openUp
                                                                    ? window.innerHeight -
                                                                      rect.top +
                                                                      4
                                                                    : undefined,
                                                            },
                                                        });
                                                    }}
                                                >
                                                    <span>{subLabel || "미분류"}</span>
                                                    {project_lock !== "수정불가" && (
                                                        <ChevronDown size={12} />
                                                    )}
                                                </button>
                                            </div>
                                        </td>

                                        {showLv1 && (
                                            <td
                                                title={cleanStr(row.lv1)}
                                                style={{ color: "#64748b" }}
                                            >
                                                {cleanStr(row.lv1) || "—"}
                                            </td>
                                        )}
                                        {showLv2 && (
                                            <td
                                                title={cleanStr(row.lv2)}
                                                style={{ color: "#64748b" }}
                                            >
                                                {cleanStr(row.lv2) || "—"}
                                            </td>
                                        )}

                                        {visibleCols.sentiment && (
                                            <td style={{ textAlign: "center", padding: "0 4px" }}>
                                                <OsaDropDown
                                                    size="sm"
                                                    popupWidth="76px"
                                                    placeholder="—"
                                                    options={ROW_SENTIMENT_OPTIONS}
                                                    disabled={project_lock === "수정불가"}
                                                    value={sentInfo.norm}
                                                    valueColor={sentInfo.color}
                                                    allowSameValueSelect={
                                                        isSel && selectedRowKeys.size > 1
                                                    }
                                                    onValueChange={(v) =>
                                                        handleChangeSentiment(row, v)
                                                    }
                                                />
                                            </td>
                                        )}

                                        {visibleCols.verified && (
                                            <td style={{ textAlign: "center" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isVerified}
                                                    disabled={project_lock === "수정불가"}
                                                    onChange={(e) =>
                                                        handleToggleVerify(row, e.target.checked)
                                                    }
                                                    style={{
                                                        accentColor: "#f97316",
                                                        cursor: "pointer",
                                                    }}
                                                />
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* 하단 단축키 안내 & 대용량 페이지네이션 바 (보기 패널 열림: 우측 정렬 / 접힘: 정중앙 정렬) */}
            <div
                className={`osa-grid-footer ${totalPages > 1 && isRightPanelCollapsed ? "has-pager" : ""
                    }`.trim()}
            >
                <div className="osa-shortcut-bar">
                    <span className="title">
                        <Zap size={12} />
                        소분류 고속 펀칭
                    </span>
                    <span>
                        <kbd className="osa-kbd">Enter</kbd> 다음
                    </span>
                    <span>
                        <kbd className="osa-kbd">Shift+Enter</kbd> 멀티추가
                    </span>
                    <span>
                        <kbd className="osa-kbd">Del</kbd> 삭제·해제
                    </span>
                    <span>
                        <kbd className="osa-kbd">↑ / ↓</kbd> 이동
                    </span>
                    <span>
                        <kbd className="osa-kbd">Ctrl+Z</kbd> 실행취소
                    </span>
                </div>

                {totalPages > 1 && (
                    <>
                        <div className="osa-pager">
                            <button
                                type="button"
                                className="osa-pager-btn"
                                title="첫 페이지"
                                disabled={safePage <= 1}
                                onClick={() => {
                                    setPage(1);
                                    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
                                }}
                            >
                                <ChevronsLeft size={14} />
                            </button>
                            <button
                                type="button"
                                className="osa-pager-btn"
                                title="이전 페이지"
                                disabled={safePage <= 1}
                                onClick={() => {
                                    setPage((p) => Math.max(1, p - 1));
                                    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
                                }}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="osa-footer-meta" style={{ padding: "0 6px" }}>
                                <b>{safePage}</b> / {totalPages}
                            </span>
                            <button
                                type="button"
                                className="osa-pager-btn"
                                title="다음 페이지"
                                disabled={safePage >= totalPages}
                                onClick={() => {
                                    setPage((p) => Math.min(totalPages, p + 1));
                                    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
                                }}
                            >
                                <ChevronRight size={14} />
                            </button>
                            <button
                                type="button"
                                className="osa-pager-btn"
                                title="마지막 페이지"
                                disabled={safePage >= totalPages}
                                onClick={() => {
                                    setPage(totalPages);
                                    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
                                }}
                            >
                                <ChevronsRight size={14} />
                            </button>
                        </div>
                        {isRightPanelCollapsed && <div aria-hidden="true" />}
                    </>
                )}
            </div>

            {lv3Picker && (
                <OsaLv3PickerPopup
                    key={lv3Picker.rowKey}
                    picker={lv3Picker}
                    options={popupCodeOptions}
                    onSelect={(codeObj) => applyLv3To(lv3Picker.targetKeys, codeObj)}
                    onUnmap={() => unmapLv3From(lv3Picker.targetKeys)}
                    onClose={() => setLv3Picker(null)}
                />
            )}
        </div>
    );
});

export default memo(OptionSettingTab1);
