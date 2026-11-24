import React, {
    useState,
    useMemo,
    useDeferredValue,
    memo,
    useRef,
    useEffect,
    useCallback,
} from "react";
import {
    LayoutGrid,
    Search,
    Plus,
    Trash2,
    Lock,
    ChevronRight,
    ChevronLeft,
    ArrowLeft,
    ArrowRight,
    X,
} from "lucide-react";
import {
    cleanStr,
    isCodeLocked,
    getNextAutoSubCode,
    compareLegacyCodeOrder,
} from "./optionSettingUtils";
import { OsaDropDown, OsaCategoryComboInput } from "./OptionSettingKendoSelect.jsx";
import { useOsaResizableTable } from "./useOsaResizableTable";

const RP_SORT_OPTIONS = [
    { value: "legacy", text: "기본순" },
    { value: "code", text: "소코드순" },
    { value: "freq", text: "빈도순" },
    { value: "lv1", text: "대분류순" },
    { value: "alpha", text: "가나다순" },
];

const natCode = (v) => {
    const s = cleanStr(v);
    if (!s) return Number.POSITIVE_INFINITY;
    return /^\d+$/.test(s) ? Number(s) : s.toLowerCase();
};

/**
 * 우측 [⊞ 보기 선택 · 편집] 통합 패널 (신규 UI · 100% 주황색 포인트 테마)
 */
const OptionSettingLv3Panel = memo(
    ({
        collapsed = false,
        onToggleCollapse,
        lvCode = "3",
        codes = [],
        responses = [],
        selectedResponseKeys = new Set(),
        onMapCodeToSelected,
        onUnmapCodeFromSelected,
        onEditCodeField,
        onAddNewCode,
        onDeleteCodeRow,
        project_lock,
        customWidth = null,
    }) => {
        const [searchTerm, setSearchTerm] = useState("");
        const deferredSearch = useDeferredValue(searchTerm);
        const [sortMode, setSortMode] = useState("legacy"); // 'legacy' | 'code' | 'freq' | 'lv1' | 'alpha'
        const searchInputRef = useRef(null);
        const tableScrollRef = useRef(null);
        const [scrollViewportW, setScrollViewportW] = useState(0);
        useOsaResizableTable(tableScrollRef, String(lvCode), !collapsed);

        // 패널/스플리터 리사이즈 시 검색·정렬 바가 항상 보이는 패널 폭 안에 고정되도록 clientWidth 추적
        useEffect(() => {
            if (collapsed) return undefined;
            const el = tableScrollRef.current;
            if (!el) return undefined;

            const syncWidth = () => {
                setScrollViewportW(el.clientWidth || 0);
            };
            syncWidth();

            if (typeof ResizeObserver === "undefined") {
                window.addEventListener("resize", syncWidth);
                return () => window.removeEventListener("resize", syncWidth);
            }

            const ro = new ResizeObserver(syncWidth);
            ro.observe(el);
            return () => ro.disconnect();
        }, [collapsed, lvCode]);

        // 전역 '/' 단축키로 보기 검색창 즉시 포커스
        useEffect(() => {
            const onKeyDown = (e) => {
                if (collapsed) return;
                if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
                const tag = e.target?.tagName;
                if (
                    tag === "INPUT" ||
                    tag === "TEXTAREA" ||
                    tag === "SELECT" ||
                    e.target?.isContentEditable
                ) {
                    return;
                }
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select?.();
            };
            window.addEventListener("keydown", onKeyDown);
            return () => window.removeEventListener("keydown", onKeyDown);
        }, [collapsed]);

        const activeCodes = useMemo(
            () => (codes || []).filter((c) => !c?.__pendingDelete),
            [codes]
        );

        // 소코드별 실시간 응답 빈도 집계
        const freqMap = useMemo(() => {
            const m = new Map();
            (responses || []).forEach((r) => {
                if (r?.__pendingDelete) return;
                const c = cleanStr(r?.lv123code ?? r?.code_num);
                if (!c) return;
                m.set(c, (m.get(c) || 0) + 1);
            });
            return m;
        }, [responses]);

        // 현재 좌측에서 선택된 응답 행들의 소분류 코드 상태 계산 (스마트 매핑/해제 토글용)
        const selectedMappingMeta = useMemo(() => {
            if (!selectedResponseKeys || selectedResponseKeys.size === 0) {
                return { selectedCount: 0, codeCounts: new Map() };
            }
            const codeCounts = new Map();
            let selectedCount = 0;
            (responses || []).forEach((r) => {
                if (r?.__pendingDelete) return;
                const rk = r?._uid || r?.__rowKey || `${r?.fixed_key || "row"}_c${r?.cid ?? 1}`;
                if (!selectedResponseKeys.has(rk)) return;
                selectedCount += 1;
                const sc = cleanStr(r?.lv123code ?? r?.code_num);
                if (sc) codeCounts.set(sc, (codeCounts.get(sc) || 0) + 1);
            });
            return { selectedCount, codeCounts };
        }, [responses, selectedResponseKeys]);

        // 대분류 / 중분류 자동완성 드롭다운 후보 (코드+이름 매칭)
        const lv1AutoOptions = useMemo(() => {
            const map = new Map();
            activeCodes.forEach((c) => {
                const name = cleanStr(c.lv1);
                const code = cleanStr(c.lv1code);
                if (!name) return;
                if (!map.has(name) || (!map.get(name).code && code)) {
                    map.set(name, { name, code });
                }
            });
            return Array.from(map.values()).sort((a, b) => {
                const ca = natCode(a.code || a.name);
                const cb = natCode(b.code || b.name);
                return ca < cb ? -1 : ca > cb ? 1 : 0;
            });
        }, [activeCodes]);

        const getLv2AutoOptionsForRow = useCallback(
            (curLv1) => {
                const targetLv1 = cleanStr(curLv1);
                const sameLv1Map = new Map();
                const otherMap = new Map();
                activeCodes.forEach((c) => {
                    const name = cleanStr(c.lv2);
                    const code = cleanStr(c.lv2code);
                    if (!name) return;
                    if (targetLv1 && cleanStr(c.lv1) === targetLv1) {
                        if (!sameLv1Map.has(name) || (!sameLv1Map.get(name).code && code)) {
                            sameLv1Map.set(name, { name, code });
                        }
                    } else if (!otherMap.has(name) || (!otherMap.get(name).code && code)) {
                        otherMap.set(name, { name, code });
                    }
                });
                const sortFn = (a, b) => {
                    const ca = natCode(a.code || a.name);
                    const cb = natCode(b.code || b.name);
                    return ca < cb ? -1 : ca > cb ? 1 : 0;
                };
                const primary = Array.from(sameLv1Map.values()).sort(sortFn);
                if (primary.length > 0) return primary;
                return Array.from(otherMap.values()).sort(sortFn);
            },
            [activeCodes]
        );

        const sortedFilteredCodes = useMemo(() => {
            const kw = deferredSearch.trim().toLowerCase();
            let arr = activeCodes.map((c) => {
                const subCode = cleanStr(c.lv123code ?? c.code_num);
                const freq = subCode ? freqMap.get(subCode) || 0 : 0;
                return { ...c, _subCode: subCode, _freq: freq };
            });

            if (kw) {
                arr = arr.filter(
                    (c) =>
                        cleanStr(c.lv3).toLowerCase().includes(kw) ||
                        c._subCode.toLowerCase().includes(kw) ||
                        cleanStr(c.lv1).toLowerCase().includes(kw) ||
                        cleanStr(c.lv2).toLowerCase().includes(kw) ||
                        cleanStr(c.lv1code).toLowerCase().includes(kw) ||
                        cleanStr(c.lv2code).toLowerCase().includes(kw)
                );
            }

            if (sortMode !== "legacy") {
                arr.sort((a, b) => {
                    // 9997~9999 특수코드는 빈도 0일 때 하단 배치
                    const na = natCode(a._subCode);
                    const nb = natCode(b._subCode);
                    const aSpecial = typeof na === "number" && na >= 9997;
                    const bSpecial = typeof nb === "number" && nb >= 9997;

                    if (sortMode === "freq") {
                        if (b._freq !== a._freq) return b._freq - a._freq;
                        if (aSpecial !== bSpecial) return aSpecial ? 1 : -1;
                        return na < nb ? -1 : na > nb ? 1 : 0;
                    }
                    if (sortMode === "lv1") {
                        if (aSpecial !== bSpecial) return aSpecial ? 1 : -1;
                        const c1 = cleanStr(a.lv1).localeCompare(cleanStr(b.lv1), "ko");
                        if (c1 !== 0) return c1;
                        return na < nb ? -1 : na > nb ? 1 : 0;
                    }
                    if (sortMode === "alpha") {
                        if (aSpecial !== bSpecial) return aSpecial ? 1 : -1;
                        return cleanStr(a.lv3).localeCompare(cleanStr(b.lv3), "ko");
                    }
                    // 'code' 소코드순
                    return na < nb ? -1 : na > nb ? 1 : 0;
                });
            } else {
                arr.sort(compareLegacyCodeOrder);
            }

            return arr;
        }, [activeCodes, deferredSearch, freqMap, sortMode]);

        const nextAutoCode = useMemo(() => getNextAutoSubCode(activeCodes), [activeCodes]);

        const trimmedSearch = searchTerm.trim();
        const isNewLabelCandidate = useMemo(() => {
            if (!trimmedSearch || project_lock === "수정불가") return false;
            const lower = trimmedSearch.toLowerCase();
            return !activeCodes.some(
                (c) =>
                    cleanStr(c.lv3).toLowerCase() === lower ||
                    cleanStr(c.lv123code ?? c.code_num).toLowerCase() === lower
            );
        }, [trimmedSearch, activeCodes, project_lock]);

        const handleCreateFromSearch = () => {
            if (project_lock === "수정불가" || !isNewLabelCandidate) return;
            onAddNewCode?.(trimmedSearch, nextAutoCode, selectedResponseKeys);
            setSearchTerm("");
        };

        const handleCreateBlankCode = () => {
            if (project_lock === "수정불가") return;
            if (searchTerm) setSearchTerm("");
            const createdKey = onAddNewCode?.("", nextAutoCode, selectedResponseKeys);
            if (createdKey) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const el = document.querySelector(
                            `input[data-rp-lv3-key="${CSS.escape(createdKey)}"]`
                        );
                        if (el) {
                            el.focus();
                            el.select?.();
                        }
                    });
                });
            }
        };

        const handleSearchKeyDown = (e) => {
            if (e.key === "Escape" && searchTerm) {
                e.preventDefault();
                setSearchTerm("");
                return;
            }
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (!trimmedSearch) return;

            const exact = sortedFilteredCodes.find(
                (c) =>
                    cleanStr(c.lv3).toLowerCase() === trimmedSearch.toLowerCase() ||
                    c._subCode === trimmedSearch
            );

            if (exact) {
                if (selectedResponseKeys?.size > 0) {
                    onMapCodeToSelected?.(exact);
                }
                return;
            }

            if (sortedFilteredCodes.length === 1 && selectedResponseKeys?.size > 0) {
                onMapCodeToSelected?.(sortedFilteredCodes[0]);
                return;
            }

            if (isNewLabelCandidate) {
                handleCreateFromSearch();
            }
        };

        // 우측 패널 대/중분류 상하 행 포커스 이동
        const navigateRpRow = useCallback(
            (curRowKey, field, delta) => {
                const curIdx = sortedFilteredCodes.findIndex((r) => r.__rowKey === curRowKey);
                if (curIdx === -1) return;
                let idx = curIdx + delta;
                while (idx >= 0 && idx < sortedFilteredCodes.length) {
                    const targetRow = sortedFilteredCodes[idx];
                    if (!isCodeLocked(targetRow)) {
                        const targetAttr = `${targetRow.__rowKey}:${field}`;
                        requestAnimationFrame(() => {
                            const el = document.querySelector(
                                `input[data-rp-cell="${CSS.escape(targetAttr)}"]`
                            );
                            if (el) {
                                el.scrollIntoView?.({ block: "nearest" });
                                el.focus();
                                el.select?.();
                            }
                        });
                        return;
                    }
                    idx += delta;
                }
            },
            [sortedFilteredCodes]
        );

        const showLv1 = String(lvCode) === "3";
        const showLv2 = String(lvCode) === "2" || String(lvCode) === "3";

        if (collapsed) {
            return (
                <div className="osa-right-panel collapsed">
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            paddingTop: "10px",
                            gap: "12px",
                        }}
                    >
                        <button
                            type="button"
                            className="osa-icon-btn"
                            title="보기 선택 · 편집 패널 펼치기"
                            onClick={onToggleCollapse}
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <span
                            style={{
                                writingMode: "vertical-rl",
                                fontSize: "12px",
                                fontWeight: 800,
                                color: "#ea580c",
                                letterSpacing: "1px",
                                cursor: "pointer",
                            }}
                            onClick={onToggleCollapse}
                        >
                            보기 선택 · 편집 ({activeCodes.length.toLocaleString()})
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div
                className="osa-right-panel"
                style={{
                    width: customWidth
                        ? `${customWidth}px`
                        : showLv1
                            ? "680px"
                            : showLv2
                                ? "572px"
                                : "470px",
                }}
            >
                {/* 패널 헤더: 우측 접기 토글 버튼 배치 */}
                <div className="osa-rp-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        <span className="osa-rp-title">
                            <LayoutGrid size={15} color="#f97316" />
                            <span>보기 선택 · 편집</span>
                            <span className="osa-rp-count">
                                {activeCodes.length.toLocaleString()}
                            </span>
                        </span>
                    </div>

                    <button
                        type="button"
                        className="osa-icon-btn"
                        style={{ width: "28px", height: "28px", flexShrink: 0 }}
                        title="우측 패널 접기"
                        onClick={onToggleCollapse}
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>

                {/* 보기 선택 · 인라인 편집 테이블 (2단 헤더: 36px 컬럼명 + 35px 검색/정렬 바로 좌측 그리드와 1:1 라인 일치) */}
                <div ref={tableScrollRef} className="osa-table-scroll">
                    <table
                        className="osa-table"
                        style={{
                            minWidth: showLv1 ? "640px" : showLv2 ? "500px" : "360px",
                        }}
                    >
                        <thead>
                            <tr className="osa-th-row">
                                <th style={{ width: "36px", textAlign: "center", padding: "6px 2px" }}>
                                    매핑
                                </th>
                                <th style={{ width: "36px", textAlign: "center", padding: "6px 2px" }}>
                                    해제
                                </th>
                                {showLv1 && (
                                    <>
                                        <th style={{ width: "44px", textAlign: "center", padding: "6px 3px" }}>
                                            대코드
                                        </th>
                                        <th style={{ width: "92px", padding: "6px 4px" }}>대분류명</th>
                                    </>
                                )}
                                {showLv2 && (
                                    <>
                                        <th style={{ width: "44px", textAlign: "center", padding: "6px 3px" }}>
                                            중코드
                                        </th>
                                        <th style={{ width: "92px", padding: "6px 4px" }}>중분류명</th>
                                    </>
                                )}
                                <th style={{ width: "42px", textAlign: "center", padding: "6px 3px" }}>
                                    빈도
                                </th>
                                <th style={{ width: "68px", textAlign: "center", padding: "6px 3px" }}>
                                    소코드
                                </th>
                                <th style={{ padding: "6px 6px" }}>소분류명</th>
                                <th style={{ width: "36px", textAlign: "center", padding: "6px 2px" }}>
                                    삭제
                                </th>
                            </tr>

                            {/* 2행(35px): 가로 스크롤 시에도 보이는 패널 폭에 고정되는 검색 + 정렬 + [+] 바 */}
                            <tr className="osa-filter-row">
                                <th
                                    className="osa-rp-filter-th"
                                    colSpan={6 + (showLv1 ? 2 : 0) + (showLv2 ? 2 : 0)}
                                >
                                    <div
                                        className="osa-rp-filter-sticky"
                                        style={{
                                            width:
                                                scrollViewportW > 0
                                                    ? `${scrollViewportW}px`
                                                    : "100%",
                                        }}
                                    >
                                        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
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
                                                ref={searchInputRef}
                                                type="text"
                                                className="osa-rp-search"
                                                style={searchTerm ? { paddingRight: "24px" } : undefined}
                                                placeholder="대·중·소분류명 또는 코드 검색 (단축키: /)"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                onKeyDown={handleSearchKeyDown}
                                            />
                                            {searchTerm && (
                                                <button
                                                    type="button"
                                                    className="osa-rp-search-clear"
                                                    title="검색어 지우기 (Esc)"
                                                    aria-label="검색어 지우기"
                                                    onClick={() => {
                                                        setSearchTerm("");
                                                        searchInputRef.current?.focus();
                                                    }}
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <OsaDropDown
                                            size="sm"
                                            className="osa-kendo-ddl-rpsort"
                                            popupWidth="118px"
                                            options={RP_SORT_OPTIONS}
                                            value={sortMode}
                                            onValueChange={setSortMode}
                                        />

                                        {project_lock !== "수정불가" && (
                                            <button
                                                type="button"
                                                className="osa-btn osa-btn-primary"
                                                style={{
                                                    width: "26px",
                                                    height: "26px",
                                                    padding: 0,
                                                    borderRadius: "5px",
                                                    flexShrink: 0,
                                                }}
                                                title="새 보기 행 추가"
                                                aria-label="새 보기 행 추가"
                                                onClick={handleCreateBlankCode}
                                            >
                                                <Plus size={14} strokeWidth={2.5} />
                                            </button>
                                        )}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedFilteredCodes.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6 + (showLv1 ? 2 : 0) + (showLv2 ? 2 : 0)}
                                        style={{ padding: 0, borderBottom: "none" }}
                                    >
                                        <div
                                            className="osa-rp-empty-box"
                                            style={{
                                                width:
                                                    scrollViewportW > 0
                                                        ? `${scrollViewportW}px`
                                                        : "100%",
                                            }}
                                        >
                                            <span className="osa-rp-empty-text">
                                                조회된 데이터가 없습니다.
                                            </span>
                                            {isNewLabelCandidate && (
                                                <button
                                                    type="button"
                                                    className="osa-rp-quick-add-btn"
                                                    onClick={handleCreateFromSearch}
                                                    title={`Enter 또는 클릭하여 '${trimmedSearch}' 보기를 추가합니다 (소코드 ${nextAutoCode})`}
                                                >
                                                    <Plus size={13} strokeWidth={2.5} />
                                                    <span className="osa-rp-quick-add-kw">
                                                        &apos;{trimmedSearch}&apos;
                                                    </span>
                                                    <span className="osa-rp-quick-add-suffix">
                                                        새 보기로 추가
                                                    </span>
                                                    <span className="osa-rp-quick-add-code">
                                                        소코드 {nextAutoCode}
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedFilteredCodes.map((row) => {
                                    const locked = isCodeLocked(row);
                                    const readOnly = locked || project_lock === "수정불가";
                                    const rKey = row.__rowKey;
                                    const matchedCnt = row._subCode
                                        ? selectedMappingMeta.codeCounts.get(row._subCode) || 0
                                        : 0;
                                    const canUnmap =
                                        project_lock !== "수정불가" && matchedCnt > 0;

                                    return (
                                        <tr
                                            key={rKey}
                                            className={matchedCnt > 0 ? "osa-rp-row-mapped" : ""}
                                            onDoubleClick={(e) => {
                                                if (
                                                    e.target.closest("input") ||
                                                    e.target.closest("button") ||
                                                    e.target.closest(".osa-ac-wrap")
                                                ) {
                                                    return;
                                                }
                                                if (project_lock !== "수정불가") {
                                                    onMapCodeToSelected?.(row);
                                                }
                                            }}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td style={{ textAlign: "center", padding: "3px 2px" }}>
                                                <button
                                                    type="button"
                                                    className="osa-map-btn"
                                                    disabled={project_lock === "수정불가"}
                                                    title="선택한 응답 행에 이 보기 매핑"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onMapCodeToSelected?.(row);
                                                    }}
                                                >
                                                    <ArrowLeft size={13} strokeWidth={2.3} />
                                                </button>
                                            </td>
                                            <td style={{ textAlign: "center", padding: "3px 2px" }}>
                                                <button
                                                    type="button"
                                                    className={`osa-unmap-btn ${canUnmap ? "active" : ""}`.trim()}
                                                    disabled={!canUnmap}
                                                    title={
                                                        canUnmap
                                                            ? "선택한 응답 행 매핑 해제"
                                                            : "현재 선택한 응답에 매핑된 보기가 아닙니다"
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (canUnmap) {
                                                            onUnmapCodeFromSelected?.(row);
                                                        }
                                                    }}
                                                >
                                                    <ArrowRight size={13} strokeWidth={2.3} />
                                                </button>
                                            </td>

                                            {showLv1 && (
                                                <>
                                                    <td style={{ padding: "3px 2px" }}>
                                                        {readOnly ? (
                                                            <span
                                                                className={`osa-rp-static-cell code ${row.lv1code ? "" : "empty"
                                                                    }`}
                                                            >
                                                                {row.lv1code || "—"}
                                                            </span>
                                                        ) : (
                                                            <input
                                                                key={`l1c_${rKey}_${row.lv1code}`}
                                                                type="text"
                                                                className="osa-rp-inline-input code"
                                                                style={{ color: "#475569" }}
                                                                placeholder="—"
                                                                defaultValue={row.lv1code || ""}
                                                                onBlur={(e) =>
                                                                    onEditCodeField?.(
                                                                        row,
                                                                        "lv1code",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter")
                                                                        e.target.blur();
                                                                }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "3px 3px" }}>
                                                        {readOnly ? (
                                                            <span
                                                                className={`osa-rp-static-cell ${row.lv1 ? "" : "empty"
                                                                    }`}
                                                                title={row.lv1 || ""}
                                                            >
                                                                {row.lv1 || "—"}
                                                            </span>
                                                        ) : (
                                                            <OsaCategoryComboInput
                                                                value={cleanStr(row.lv1)}
                                                                options={lv1AutoOptions}
                                                                placeholder="대분류명"
                                                                rowKey={rKey}
                                                                field="lv1"
                                                                cellAttrName="data-rp-cell"
                                                                onCommit={(val) =>
                                                                    onEditCodeField?.(row, "lv1", val)
                                                                }
                                                                onNavigateRow={navigateRpRow}
                                                            />
                                                        )}
                                                    </td>
                                                </>
                                            )}

                                            {showLv2 && (
                                                <>
                                                    <td style={{ padding: "3px 2px" }}>
                                                        {readOnly ? (
                                                            <span
                                                                className={`osa-rp-static-cell code ${row.lv2code ? "" : "empty"
                                                                    }`}
                                                            >
                                                                {row.lv2code || "—"}
                                                            </span>
                                                        ) : (
                                                            <input
                                                                key={`l2c_${rKey}_${row.lv2code}`}
                                                                type="text"
                                                                className="osa-rp-inline-input code"
                                                                style={{ color: "#475569" }}
                                                                placeholder="—"
                                                                defaultValue={row.lv2code || ""}
                                                                onBlur={(e) =>
                                                                    onEditCodeField?.(
                                                                        row,
                                                                        "lv2code",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter")
                                                                        e.target.blur();
                                                                }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "3px 3px" }}>
                                                        {readOnly ? (
                                                            <span
                                                                className={`osa-rp-static-cell ${row.lv2 ? "" : "empty"
                                                                    }`}
                                                                title={row.lv2 || ""}
                                                            >
                                                                {row.lv2 || "—"}
                                                            </span>
                                                        ) : (
                                                            <OsaCategoryComboInput
                                                                value={cleanStr(row.lv2)}
                                                                options={getLv2AutoOptionsForRow(
                                                                    row.lv1
                                                                )}
                                                                placeholder="중분류명"
                                                                rowKey={rKey}
                                                                field="lv2"
                                                                cellAttrName="data-rp-cell"
                                                                onCommit={(val) =>
                                                                    onEditCodeField?.(row, "lv2", val)
                                                                }
                                                                onNavigateRow={navigateRpRow}
                                                            />
                                                        )}
                                                    </td>
                                                </>
                                            )}

                                            <td style={{ textAlign: "center", padding: "3px 2px" }}>
                                                <span
                                                    className={`osa-freq-badge ${row._freq === 0 ? "zero" : ""
                                                        }`}
                                                >
                                                    {row._freq.toLocaleString()}
                                                </span>
                                            </td>

                                            <td style={{ padding: "3px 2px" }}>
                                                {readOnly ? (
                                                    <span className="osa-rp-static-cell subcode">
                                                        {row._subCode}
                                                    </span>
                                                ) : (
                                                    <input
                                                        key={`sc_${rKey}_${row._subCode}`}
                                                        type="text"
                                                        className="osa-rp-inline-input code"
                                                        defaultValue={row._subCode}
                                                        onBlur={(e) =>
                                                            onEditCodeField?.(
                                                                row,
                                                                "lv123code",
                                                                e.target.value
                                                            )
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") e.target.blur();
                                                        }}
                                                    />
                                                )}
                                            </td>

                                            <td style={{ padding: "3px 4px" }}>
                                                {readOnly ? (
                                                    <div
                                                        className="osa-rp-static-lv3"
                                                        title={
                                                            locked
                                                                ? `${row.lv3 || ""} · ${row.ex_gubun || "수정불가"
                                                                } (더블클릭 매핑 가능)`
                                                                : row.lv3 || ""
                                                        }
                                                    >
                                                        <span>{row.lv3 || "—"}</span>
                                                        {locked && (
                                                            <Lock
                                                                size={11}
                                                                className="osa-rp-lock-mark"
                                                            />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <input
                                                        key={`l3_${rKey}_${row.lv3}`}
                                                        data-rp-lv3-key={rKey}
                                                        type="text"
                                                        className="osa-rp-inline-input"
                                                        placeholder="소분류명 입력"
                                                        defaultValue={row.lv3 || ""}
                                                        title={row.lv3 || ""}
                                                        onBlur={(e) =>
                                                            onEditCodeField?.(
                                                                row,
                                                                "lv3",
                                                                e.target.value
                                                            )
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") e.target.blur();
                                                        }}
                                                    />
                                                )}
                                            </td>

                                            <td style={{ textAlign: "center", padding: "3px 2px" }}>
                                                <button
                                                    type="button"
                                                    className="osa-del-icon-btn"
                                                    disabled={readOnly}
                                                    title={
                                                        locked
                                                            ? `${row.ex_gubun || "수정불가"
                                                            } (보기 데이터 탭에서 잠금 해제 후 삭제 가능)`
                                                            : "보기 삭제"
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!readOnly) onDeleteCodeRow?.(row);
                                                    }}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            {sortedFilteredCodes.length > 0 && isNewLabelCandidate && (
                                <tr className="osa-rp-quick-add-row">
                                    <td
                                        colSpan={6 + (showLv1 ? 2 : 0) + (showLv2 ? 2 : 0)}
                                        style={{ padding: 0 }}
                                    >
                                        <div
                                            className="osa-rp-quick-add-bar"
                                            style={{
                                                width:
                                                    scrollViewportW > 0
                                                        ? `${scrollViewportW}px`
                                                        : "100%",
                                            }}
                                        >
                                            <button
                                                type="button"
                                                className="osa-rp-quick-add-btn compact"
                                                onClick={handleCreateFromSearch}
                                                title={`Enter 또는 클릭하여 '${trimmedSearch}' 보기를 추가합니다 (소코드 ${nextAutoCode})`}
                                            >
                                                <Plus size={13} strokeWidth={2.5} />
                                                <span className="osa-rp-quick-add-kw">
                                                    &apos;{trimmedSearch}&apos;
                                                </span>
                                                <span className="osa-rp-quick-add-suffix">
                                                    새 보기로 추가
                                                </span>
                                                <span className="osa-rp-quick-add-code">
                                                    소코드 {nextAutoCode}
                                                </span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="osa-rp-footer">
                    좌측 응답 행(단일·다중) 선택 후 <b>[←]</b> 버튼 또는 <b>더블클릭</b> 시 즉시 매핑됩니다.
                    {selectedResponseKeys?.size > 0 && (
                        <span style={{ color: "#ea580c", fontWeight: 600, marginLeft: 6 }}>
                            (현재 {selectedResponseKeys.size.toLocaleString()}행 선택됨)
                        </span>
                    )}
                </div>
            </div>
        );
    }
);

export default OptionSettingLv3Panel;
