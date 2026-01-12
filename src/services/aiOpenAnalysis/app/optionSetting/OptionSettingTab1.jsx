import React, { memo, Fragment, useEffect, useState, useRef, useCallback, useMemo, useContext, forwardRef, useImperativeHandle, useLayoutEffect } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { process } from "@progress/kendo-data-query";
import { OptionSettingApi } from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingApi.js";
import { Button } from "@progress/kendo-react-buttons";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import "@/services/aiOpenAnalysis/app/optionSetting/OptionSetting.css";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from "@/hooks/useUpdateHistory";
import { useSelector } from "react-redux";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

// 드래그 제외 셀렉터: 바깥에 선언해 매 렌더마다 재생성 방지
const ROW_EXCLUSION_SELECTOR = [
    '.lv3-popup', '.lv3-editor', '.k-animation-container',
    '.k-input', '.k-dropdownlist', '.k-button',
    '.k-selectioncheckbox', '.k-checkbox-cell',
    '.k-checkbox', '.k-checkbox-box', '.k-checkbox-wrap',
    'label.k-checkbox-label', 'label[for]',
    'input[type="checkbox"]', '[role="checkbox"]',
    'td[data-field="sentiment"]'
].join(',');

const SENTIMENT_OPTIONS = ["positive", "negative", "neutral"];

const getKey = (row) => {
    if (!row) return null;

    // 이미 __rowKey가 있으면 사용
    if (row.__rowKey) return row.__rowKey;

    // 아직 __rowKey가 없어도 fixed_key + cid로 동일한 키 조합
    if (row.fixed_key != null && row.cid != null) {
        return `${String(row.fixed_key)}::${String(row.cid)}`;
    }

    // 그래도 없으면 null
    return null;
};

// 클라이언트 전용 표시/편집 플래그 제거
const stripLocalFlags = (rows = []) =>
    (rows || []).map(r => {
        const { __pendingDelete, inEdit, __isNew, ...rest } = r;
        return rest;
    });
// YYYY-MM-DD HH:mm:ss
const formatNow = (d = new Date()) => {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// 정렬 
const natKey = (v) => {
    if (v == null) return Number.NEGATIVE_INFINITY;
    const s = String(v).trim();
    return /^\d+$/.test(s) ? Number(s) : s.toLowerCase();
};

// 정렬용 프록시를 붙일 대상 필드
const NAT_FIELDS = ["lv1code", "lv2code", "lv123code"]; // 필요 시 추가

// rows에 __sort__* 필드를 덧붙이고, 원필드→프록시 맵을 리턴
const addSortProxies = (rows = []) => {
    const proxyField = {};
    const dataWithProxies = rows.map((r) => {
        const o = { ...r };
        for (const f of NAT_FIELDS) {
            const pf = `__sort__${f}`;
            o[pf] = natKey(r?.[f]);
            proxyField[f] = pf;
        }
        return o;
    });
    return { dataWithProxies, proxyField };
};

const buildSelectedMapFromRows = (rows = []) => {
    const next = {};
    for (const r of rows) {
        const k = getKey(r);
        if (!k) continue;
        if (String(r?.recheckyn ?? '').toLowerCase() === 'y') next[k] = true;
    }
    return next;
};

/**
 * 분석 > 그리드 영역 > 응답 데이터
 *
 * @author jewoo
 * @since 2025-08-11<br />
 */
const OptionSettingTab1 = forwardRef((props, ref) => {
    const auth = useSelector((store) => store.auth);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const lvCode = String(props.lvCode); // 분류 단계 코드
    const { onInitLvCode, onUnsavedChange, onSaved, persistedPrefs, onPrefsChange
        , onInitialAnalysisCount, onHasEditLogChange, projectnum, qnum, onOpenLv3Panel
        , lv3Options, onRequestLv3Refresh, onResponseCountChange, isLeftOpen } = props;
    const modal = useContext(modalContext);
    const DATA_ITEM_KEY = "__rowKey";
    const SELECTED_FIELD = "selected";
    const { optionEditData, optionSaveData } = OptionSettingApi();
    const [editField] = useState("inEdit");
    // 검증 안 된 데이터만 보기 필터 상태 (GridRenderer가 리마운트되어도 유지되도록 상위로 이동)
    const [showUnverifiedOnly, setShowUnverifiedOnly] = useState(false);

    const saveChangesRef = useRef(async () => false);   // 저장 로직 노출용
    const lv3AnchorElRef = useRef(null);   // 현재 드롭다운이 붙을 td 엘리먼트
    const lastCellElRef = useRef(null);    // 마지막으로 진입/클릭한 lv3 셀(td)
    const latestCtxRef = useRef(null);
    const gridRef = useRef(null);
    const reportedLvcodeRef = useRef(false);    //Body 초기 lvcode 전달
    // 스크롤 위치 저장용 ref
    const scrollTopRef = useRef(0);

    // 부모(OptionSettingBody.jsx) 에게 노출
    useImperativeHandle(ref, () => ({
        saveChanges: () => saveChangesRef.current(),   // 부모 저장 버튼이 호출
        reload: () => {
            gridRef.current?.resetAutoSelection?.(); // 재조회 시 선택 로직 초기화
            latestCtxRef.current?.handleSearch?.();
        },
        applyLv3To: (targets, opt) => gridRef.current?.applyLv3To?.(targets, opt),
        resetAutoSelection: () => gridRef.current?.resetAutoSelection?.(),
    }));

    /**
     * 숨김처리 여부 allowHide (true/false)
     * 편집 가능 여부 editable(true/false)
    */
    const [columns, setColumns] = useState(() =>
        persistedPrefs?.columns ?? [
            // { field: "fixed_key", title: "키", show: false, editable: false },
            { field: "answer_origin", title: "원본 응답", show: true, editable: false, width: "300px", allowHide: false },
            { field: "cid", title: "멀티", show: true, editable: false, width: "100px", allowHide: false },
            { field: "answer", title: "클리닝 응답", show: true, editable: false, width: "300px", allowHide: false },
            { field: "lv1code", title: "대분류 코드", show: true, editable: false, width: "150px" },
            { field: "lv1", title: "대분류", show: true, editable: false, width: "250px" },
            { field: "lv2code", title: "중분류 코드", show: true, editable: false, width: "150px" },
            { field: "lv2", title: "중분류", show: true, editable: false, width: "250px" },
            { field: "lv123code", title: "소분류 코드", show: true, editable: false, width: "150px", allowHide: false },
            { field: "lv3", title: "소분류", show: true, editable: true, width: "250px", allowHide: false },
            { field: "sentiment", title: "sentiment", show: true, editable: false, width: "170px" },
            { field: "add", title: "추가", show: true, editable: true, width: "120px", allowHide: false },
            { field: "delete", title: "삭제", show: true, editable: true, width: "120px", allowHide: false }
        ]);

    // 1단계: lv1, lv2 숨김 / 2단계: lv1 숨김 / 3단계: 숨김 없음
    const forcedHidden = useMemo(() => {
        const s = new Set();
        if (lvCode === "1") { s.add("lv1"); s.add("lv1code"); s.add("lv2"); s.add("lv2code"); }
        else if (lvCode === "2") { s.add("lv1"); s.add("lv1code"); }
        return s;
    }, [lvCode]);

    // 단계 컬럼 집합 (대/중분류 코드/이름)
    const stageFields = useMemo(() => new Set(["lv1", "lv1code", "lv2", "lv2code"]), []);

    // 렌더링용 값: 강제 규칙만 입혀서 사용(상태/부모는 건드리지 않음)
    const effectiveColumns = useMemo(() => {
        return columns.map(c => {
            if (forcedHidden.has(c.field)) {
                return { ...c, show: false, allowHide: false };
            }
            // 왼쪽 패널이 닫혀있으면 모든 단계에서 주요 컬럼 너비 제거
            if (!isLeftOpen && ["answer_origin", "answer", "lv3", "lv2", "lv1"].includes(c.field)) {
                const { width, ...rest } = c;
                return rest;
            }
            // 왼쪽 패널이 열려있으면 1단계일 때만 주요 컬럼 너비 제거
            if (isLeftOpen && lvCode === "1" && ["answer_origin", "answer", "lv3"].includes(c.field)) {
                const { width, ...rest } = c;
                return rest;
            }
            return c;
        });
    }, [columns, forcedHidden, stageFields, lvCode, isLeftOpen]);

    // 정렬/필터를 controlled로
    const [sort, setSort] = useState(persistedPrefs?.sort ?? []);
    const [filter, setFilter] = useState(persistedPrefs?.filter ?? null);

    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = useCallback((menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={columns
                // 단계 규칙으로 '강제 숨김' 대상만 메뉴에서 제거
                .filter(c => !forcedHidden.has(c.field))
                // 단계 컬럼도 메뉴에 표시 + 숨김 가능
                .map(c => stageFields.has(c.field) ? { ...c, allowHide: true } : c)
            }
            onColumnsChange={(updated) => {
                const map = new Map(updated.map(c => [c.field, c]));
                const next = columns.map(c => {
                    if (forcedHidden.has(c.field)) return { ...c, show: false }; // 단계상 강제 숨김
                    const u = map.get(c.field);
                    return u ? { ...c, ...u } : c
                });
                setColumns(next);
                onPrefsChange?.({ columns: next }); // 부모에 저장
            }}
            filter={filter}
            onFilterChange={(e) => {
                setFilter(e ?? null);
                onPrefsChange?.({ filter: e }); // 상단에 저장 
            }}
            onSortChange={(e) => setSort(e ?? [])} // sortArr는 배열 형태
        />
    ), [columns, forcedHidden, stageFields, filter, onPrefsChange]);

    /* 선택된 행 key */
    // const [selectedRowKey, setSelectedRowKey] = useState(null); // GridRenderer 내부로 이동
    // const [lv3SelKeys, setLv3SelKeys] = useState(new Set()); // GridRenderer 내부로 이동

    /*-----수정 로그 관련-----*/
    const makeTab1Signature = useCallback((rows = []) => {
        const acc = [];
        for (const r of rows ?? []) {
            const k = r?.__rowKey; if (!k) continue;
            const del = r?.__pendingDelete ? '1' : '0';
            const re = (String(r?.recheckyn ?? '').toLowerCase() === 'y') ? '1' : '0';
            const lv3 = String(r?.lv3 ?? '').trim();
            const sen = String(r?.sentiment ?? '').trim();
            acc.push(`${k}:${del}:${re}:${lv3}:${sen}`);
        }
        acc.sort();
        return acc.join('|');
    }, []);

    const hist = useUpdateHistory(`tab1:${lvCode}`, { max: 100, signature: makeTab1Signature });
    const baselineDidRef = useRef(false);           // 베이스라인 이미 셋
    const baselineAfterReloadRef = useRef(false);   // 저장 후 재조회 베이스라인 리셋 필요
    const baselineSigRef = useRef('');   // 현재 베이스라인의 시그니처
    const sigStackRef = useRef([]);      // 베이스라인 이후 커밋들의 시그니처 스택

    /*-----수정 로그 관련-----*/


    //grid rendering 
    const GridRenderer = memo(forwardRef((props, ref) => {
        const { dataState, setDataState, selectedState, setSelectedState,
            handleSearch, hist, baselineDidRef, baselineAfterReloadRef,
            sigStackRef, makeTab1Signature, scrollTopRef,
            showUnverifiedOnly, setShowUnverifiedOnly,
            isLeftOpen
        } = props;

        const rows = dataState?.data ?? [];
        const hasAllRowKeys = useMemo(() => (dataState?.data ?? []).every(r => !!r?.__rowKey), [dataState?.data]);
        const [isDragging, setIsDragging] = useState(false);
        /* 선택된 행 key (GridRenderer 내부에서 관리하여 상위 리렌더링 방지) */
        const [selectedRowKey, setSelectedRowKey] = useState(null);

        /** ===== 소분류 셀: 엑셀식 선택 + 드롭다운 ===== */
        const [lv3SelKeys, setLv3SelKeys] = useState(new Set()); // 화면 표시용 (mouseup 때만 변경)
        const lv3SelKeysRef = useRef(lv3SelKeys);
        const dragStartPosRef = useRef({ x: 0, y: 0 }); // 드래그 시작 좌표
        const rowElementsRef = useRef(null); // 드래그 성능 최적화: 행 요소 캐싱

        // lv3SelKeys 변경될 때마다 ref 동기화
        useEffect(() => {
            lv3SelKeysRef.current = lv3SelKeys;
        }, [lv3SelKeys]);
        const draggingRef = useRef(false);
        const anchorIndexRef = useRef(null);
        const lastIndexRef = useRef(null);
        const lastFocusedKeyRef = useRef(null);
        const selectionModeRef = useRef(null);// 선택 동작 모드: 'drag' | 'range' | 'toggle'
        const shouldAutoApplySelectionRef = useRef(true);
        const keyHandlerStateRef = useRef({}); // keydown 핸들러가 참조할 최신 상태 보관용 ref
        const suppressUnsavedSelectionRef = useRef(false); // 선택 변경 감지 억제 플래그
        const reportedInitialAnalysisRef = useRef(false); // 분석값 최초 보고 여부
        const suppressNextClickRef = useRef(false); //Ctrl 토글 후 Kendo 기본 click 한 번 차단
        const [processedMirror, setProcessedMirror] = useState([]);

        // 페이지네이션 state
        const [skip, setSkip] = useState(0);
        const take = 500;

        // 전체 데이터에 프록시 추가
        // const [showUnverifiedOnly, setShowUnverifiedOnly] = useState(false); // 상위로 이동됨

        const filteredData = useMemo(() => {
            const raw = dataState?.data || [];
            if (!showUnverifiedOnly) return raw;
            // 검증 안된 데이터 = 체크박스(selectedState)가 체크되지 않은 데이터
            return raw.filter(r => {
                const k = getKey(r);
                // selectedState에 키가 없거나 false이면 검증 안된 것
                return !selectedState?.[k];
            });
        }, [dataState?.data, showUnverifiedOnly, selectedState]);

        const { dataWithProxies, proxyField } = useMemo(
            () => addSortProxies(filteredData),
            [filteredData]
        );

        const mappedSort = useMemo(
            () => (sort || []).map(s => ({ ...s, field: proxyField[s.field] ?? s.field })),
            [sort, proxyField]
        );

        // 정렬된 순서를 state로 저장
        const [sortedKeys, setSortedKeys] = useState([]);

        // 이전 정렬/필터 상태를 추적
        const prevSortRef = useRef(null);
        const prevFilterRef = useRef(null);
        const prevDataLengthRef = useRef(0);

        // 정렬이나 필터가 변경될 때만 재정렬
        useEffect(() => {
            // 정렬/필터가 실제로 변경되었는지 확인
            const sortChanged = JSON.stringify(mappedSort) !== JSON.stringify(prevSortRef.current);
            const filterChanged = JSON.stringify(filter) !== JSON.stringify(prevFilterRef.current);
            const dataLengthChanged = dataWithProxies.length !== prevDataLengthRef.current;

            if (sortChanged || filterChanged || sortedKeys.length === 0) {
                // 정렬/필터가 변경되었거나 초기 상태일 때만 재정렬
                prevSortRef.current = mappedSort;
                prevFilterRef.current = filter;
                prevDataLengthRef.current = dataWithProxies.length;

                const result = process(dataWithProxies, {
                    sort: mappedSort,
                    filter: filter
                });
                setSortedKeys(result.data.map(item => item.__rowKey));
            } else if (dataLengthChanged) {
                // 데이터 개수만 변경 (추가/삭제): 새 행을 올바른 위치에 삽입
                prevDataLengthRef.current = dataWithProxies.length;

                const currentKeys = new Set(sortedKeys);
                const newRows = dataWithProxies.filter(item => !currentKeys.has(item.__rowKey));

                if (newRows.length > 0) {
                    // 새 행들을 dataWithProxies에서의 위치에 맞게 삽입
                    const newSortedKeys = [...sortedKeys];

                    newRows.forEach(newRow => {
                        // dataWithProxies에서 새 행의 인덱스 찾기
                        const newRowIndex = dataWithProxies.findIndex(item => item.__rowKey === newRow.__rowKey);

                        if (newRowIndex > 0) {
                            // 이전 행의 __rowKey 찾기
                            const prevRow = dataWithProxies[newRowIndex - 1];
                            const prevKey = prevRow.__rowKey;

                            // sortedKeys에서 이전 행의 위치 찾기
                            const insertIndex = newSortedKeys.indexOf(prevKey);

                            if (insertIndex !== -1) {
                                // 이전 행 바로 다음에 삽입
                                newSortedKeys.splice(insertIndex + 1, 0, newRow.__rowKey);
                            } else {
                                // 이전 행을 찾을 수 없으면 끝에 추가
                                newSortedKeys.push(newRow.__rowKey);
                            }
                        } else {
                            // 첫 번째 행이면 맨 앞에 추가
                            newSortedKeys.unshift(newRow.__rowKey);
                        }
                    });

                    setSortedKeys(newSortedKeys);
                } else {
                    // 삭제된 경우 (필터링 등으로 인해): sortedKeys에서 제거
                    const currentDataKeys = new Set(dataWithProxies.map(item => item.__rowKey));
                    setSortedKeys(sortedKeys.filter(key => currentDataKeys.has(key)));
                }
            }
        }, [dataWithProxies, mappedSort, filter]);

        // 데이터가 변경되면 순서는 유지하고 값만 업데이트
        const filteredSortedData = useMemo(() => {
            if (sortedKeys.length === 0) {
                // 초기 상태: 원본 데이터 사용
                return dataWithProxies;
            }

            // 기존 순서대로 새 데이터를 재배열
            const dataMap = new Map(dataWithProxies.map(item => [item.__rowKey, item]));
            return sortedKeys
                .map(key => dataMap.get(key))
                .filter(item => item !== undefined);
        }, [dataWithProxies, sortedKeys]);

        // 현재 페이지 데이터만 슬라이싱
        const paginatedData = useMemo(() => {
            return filteredSortedData.slice(skip, skip + take);
        }, [filteredSortedData, skip, take]);
        const rememberScroll = useCallback(() => {
            const grid = document.querySelector("#grid_01 .k-grid-content, #grid_01 .k-grid-contents");
            if (grid) {
                scrollTopRef.current = grid.scrollTop;
            }
        }, []);

        useLayoutEffect(() => {
            const grid = document.querySelector("#grid_01 .k-grid-content, #grid_01 .k-grid-contents");
            if (!grid) return;
            if (scrollTopRef.current > 0) {
                grid.scrollTop = scrollTopRef.current;
            }
        }, [paginatedData]); // paginatedData가 변경될 때 스크롤 복원

        // 페이지 변경 시 스크롤 맨 위로 이동
        useEffect(() => {
            const grid = document.querySelector("#grid_01 .k-grid-content, #grid_01 .k-grid-contents");
            if (grid) {
                grid.scrollTop = 0;
            }
        }, [skip]); // skip 값이 변경될 때마다 실행

        useEffect(() => {
            const rowsNow = dataState?.data || [];
            if (!rowsNow.length || !hasAllRowKeys) return;

            if (!baselineDidRef.current || baselineAfterReloadRef.current) {
                // 새로 들어온 데이터에 남아있는 로컬 플래그를 제거
                const needClean = rowsNow.some(r =>
                    r?.__pendingDelete === true || r?.inEdit === true || r?.__isNew === true);
                const base = needClean ? stripLocalFlags(rowsNow) : rowsNow;
                if (needClean) {
                    // 자동 동기화 중에는 더티/히스토리 흔들림 방지
                    suppressUnsavedSelectionRef.current = true;
                    setDataState(prev => ({ ...prev, data: base }));
                    suppressUnsavedSelectionRef.current = false;
                }
                hist.reset(base);
                applySelectedFromRows(base);

                baselineDidRef.current = true;
                baselineAfterReloadRef.current = false;
                // 베이스라인/스택 초기화
                baselineSigRef.current = makeTab1Signature(base);
                sigStackRef.current = [];
                onUnsavedChange?.(false);
                onHasEditLogChange?.(false);

                // 이제 자동복원 끝났으므로 행 동기화 다시 허용
                suppressUnsavedSelectionRef.current = false;
            }
        }, [dataState?.data, hasAllRowKeys]);

        // 드래그 종료 시 소분류 패널 자동 열기
        const wasDraggingRef = useRef(false);

        useEffect(() => {
            const handleMouseDown = () => {
                wasDraggingRef.current = false;
            };

            const handleMouseMove = (e) => {
                if (draggingRef.current) {
                    if (!wasDraggingRef.current) {
                        // 드래그 임계값 체크 (5px)
                        const start = dragStartPosRef.current;
                        const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
                        if (dist > 5) {
                            setIsDragging(true); // 실제 움직임이 발생했을 때만 렌더링
                            wasDraggingRef.current = true;
                        }
                    }
                }
            };

            const handleMouseUp = () => {
                setTimeout(() => {
                    // 드래그가 발생했고 선택된 셀이 있으면 패널 열기
                    if (wasDraggingRef.current && lv3SelKeysRef.current.size > 0) {
                        const selectedRows = (dataState?.data || []).filter(r => lv3SelKeysRef.current.has(getKey(r)));
                        if (selectedRows.length > 0) {
                            rememberScroll(); // 스크롤 위치 저장
                            const targetCodes = selectedRows.map(r => r.lv123code);
                            onOpenLv3Panel?.(selectedRows, targetCodes);
                        }
                    }
                    wasDraggingRef.current = false;
                }, 150); // 드래그 상태 업데이트 대기
            };

            window.addEventListener('mousedown', handleMouseDown);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousedown', handleMouseDown);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }, [dataState?.data, onOpenLv3Panel]);

        // 수정로그 commit 
        const onUnsavedChangeRef = useRef(onUnsavedChange);
        const onHasEditLogChangeRef = useRef(onHasEditLogChange);

        useEffect(() => {
            onUnsavedChangeRef.current = onUnsavedChange;
            onHasEditLogChangeRef.current = onHasEditLogChange;
        }, [onUnsavedChange, onHasEditLogChange]);


        const commitSmart = useCallback((updatedRows) => {
            const newSig = makeTab1Signature(updatedRows);
            const stack = sigStackRef.current;
            const top = stack[stack.length - 1] ?? null;
            const prev = stack[stack.length - 2] ?? baselineSigRef.current;

            // 동일 상태면 무시
            if (newSig === top) return;

            // 완전 복귀 시 초기화
            if (newSig === baselineSigRef.current) {
                hist.reset(updatedRows);
                stack.length = 0;
                onUnsavedChangeRef.current?.(false);
                onHasEditLogChangeRef.current?.(false);
                return;
            }
            // 직전으로 되돌림
            if (newSig === prev) {
                hist.undo();
                stack.pop();
                onUnsavedChangeRef.current?.(hist.hasChanges);
                onHasEditLogChangeRef.current?.(hist.hasChanges);
                return;
            }

            hist.commit(updatedRows);
            stack.push(newSig);
            onUnsavedChangeRef.current?.(true);
            onHasEditLogChangeRef.current?.(true);
        }, [hist, makeTab1Signature]);

        //ctrl+z, ctrl+y
        useEffect(() => {
            const onKey = (e) => {
                const key = e.key?.toLowerCase?.();
                if (!key) return;

                // Undo: Ctrl/Cmd + Z (Shift 미포함)
                if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) {
                    e.preventDefault();
                    const snap = hist.undo();
                    if (snap) {
                        setDataState((prev) => ({ ...prev, data: snap }));
                        applySelectedFromRows(snap);
                        onUnsavedChange?.(hist.hasChanges);
                        onHasEditLogChange?.(hist.hasChanges);
                    }
                    return;
                }

                // Redo: Ctrl/Cmd + Y  또는  Shift + Ctrl/Cmd + Z
                if ((e.ctrlKey || e.metaKey) && (key === "y" || (key === "z" && e.shiftKey))) {
                    e.preventDefault();
                    const snap = hist.redo?.();
                    if (snap) {
                        setDataState((prev) => ({ ...prev, data: snap }));
                        applySelectedFromRows(snap);
                        onUnsavedChange?.(hist.hasChanges);
                        onHasEditLogChange?.(hist.hasChanges);
                    }
                    return;
                }
            };

            window.addEventListener("keydown", onKey, true);
            return () => window.removeEventListener("keydown", onKey, true);
        }, [hist]);

        // 부모가 reload()를 부르면 GridData의 handleSearch를 실행할 수 있도록 ref에 최신 핸들러 보관
        useEffect(() => {
            latestCtxRef.current = { handleSearch };
        }, []);

        // 최초 로드 시 분석값 있는지 체크 
        useEffect(() => {
            if (reportedInitialAnalysisRef.current) return;
            // rows가 한 번이라도 로드되면 최초 보고로 간주
            if (Array.isArray(rows) && rows.length > 0) {
                onInitialAnalysisCount?.(analyzed);
                reportedInitialAnalysisRef.current = true;
            }
        }, [rows]);

        // 자동 동기화 시에는 미저장 플래그/히스토리 커밋 안 나가게 가드
        const applySelectedFromRows = useCallback((rows = []) => {
            suppressUnsavedSelectionRef.current = true;
            setSelectedState(buildSelectedMapFromRows(rows));
            suppressUnsavedSelectionRef.current = false;
        }, [setSelectedState]);

        const total = rows.length;  //총 갯수
        const analyzed = rows.filter(r => (r.lv3 ?? '').trim() !== '').length;  //분석값
        const updatedAt = rows[0]?.update_date ?? '-';  //업데이트 날짜
        useEffect(() => {
            onResponseCountChange?.(total ?? 0);  // 응답데이터 개수 부모로 전달
        }, [total]);
        const verified = useMemo(() => {//검증값
            const keysOnPage = new Set(rows.map(getKey));
            let count = 0;
            for (const k in (selectedState || {})) {
                if (selectedState[k] && keysOnPage.has(k)) count++;
            }
            return count;
        }, [rows, selectedState, getKey]);

        // dataState.data 안에 __rowKey 없는 행이 있으면 고유키를 생성해서 state에 다시 세팅
        useLayoutEffect(() => {
            const rows = dataState?.data ?? [];
            if (!rows.length) return;
            // 하나라도 __rowKey 없는 행이 있으면 일괄 보정
            if (rows.some(r => !r?.__rowKey)) {
                setDataState(prev => ({
                    ...prev,
                    data: (prev?.data ?? []).map((r, i) =>
                        r?.__rowKey
                            ? r
                            : {
                                ...r,
                                __rowKey:
                                    getKey(r) ??
                                    `__tmp__${Date.now()}__${i}__${Math.random()}`
                            }
                    ),
                }));
            }
        }, [dataState?.data]);

        const setSelectedStateGuarded = useCallback((next) => {
            rememberScroll(); // 스크롤 저장
            // 단일 토글이면 "현재 lv3 셀 선택집합" 전체로 확장
            const expandWithBatchIfNeeded = (prevMap, nextMap) => {
                try {
                    const prevKeys = new Set(Object.keys(prevMap || {}));
                    const nextKeys = new Set(Object.keys(nextMap || {}));
                    const all = new Set([...prevKeys, ...nextKeys]);
                    const changed = [];
                    for (const k of all) {
                        if (!!prevMap?.[k] !== !!nextMap?.[k]) changed.push(k);
                    }
                    // 체크박스 하나만 바뀌었고, 그 키가 현재 선택집합 안에 있으면 → 선택집합 전체에 동일값 적용
                    if (changed.length === 1 && lv3SelKeys.size > 0) {
                        const toggledKey = changed[0];
                        const toggledVal = !!nextMap[toggledKey];
                        if (lv3SelKeys.has(toggledKey)) {
                            const expanded = { ...(prevMap || {}) };
                            lv3SelKeys.forEach((k) => { expanded[k] = toggledVal; });
                            return expanded;
                        }
                    }
                } catch { }
                return nextMap;
            };

            setSelectedState((prev) => {
                const computed = (typeof next === "function" ? next(prev) : (next || {}));
                const maybeBatched = expandWithBatchIfNeeded(prev, computed);

                // 자동 동기화 중에는 데이터/히스토리 건드리지 않고 선택맵만 바꾼다
                if (suppressUnsavedSelectionRef.current) {
                    return maybeBatched;
                }

                // 일반 사용자 조작일 때만 rows에 즉시 반영
                const selectedKeys = new Set(Object.keys(maybeBatched).filter(k => !!maybeBatched[k]));
                setDataState(prevDS => {
                    let changed = false;
                    const updated = (prevDS?.data || []).map(r => {
                        const k = getKey(r);
                        const checked = selectedKeys.has(k);
                        const nextRe = checked ? 'y' : '';
                        const nextSel = checked;
                        if ((r.recheckyn ?? '') === nextRe && (r.selected ?? false) === nextSel) return r;
                        changed = true;
                        return { ...r, recheckyn: nextRe, selected: nextSel };
                    });
                    if (!changed) return prevDS;   // 변경 없으면 리렌더 스킵
                    commitSmartRef.current?.(updated);
                    return { ...prevDS, data: updated };
                });
                return maybeBatched;
            });
        }, [setSelectedState, setDataState, lv3SelKeys, getKey]);

        useLayoutEffect(() => {
            if (!rows.length) return;
            if (!shouldAutoApplySelectionRef.current) return;

            const nextSelected = {};
            for (const r of rows) {
                const yn = String(r?.recheckyn ?? "").trim().toLowerCase();
                if (yn === "y") {
                    const k = getKey(r);
                    if (k != null) nextSelected[k] = true;
                }
            }

            // restore 동안 Dirty 감지 차단
            suppressUnsavedSelectionRef.current = true;
            setSelectedState(nextSelected);
            suppressUnsavedSelectionRef.current = false;

            // 한 번만 동작
            shouldAutoApplySelectionRef.current = false;
        }, [rows]);

        const suppressLv3ClickRef = useRef(false); // 드래그 후 lv3 클릭 방지용

        // 현재 데이터 인덱스 범위를 선택키로 변환
        const rangeToKeys = useCallback((a, b) => {
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            const s = new Set();
            for (let i = min; i <= max; i++) {
                const row = processedMirror?.[i];
                if (row) s.add(getKey(row));
            }
            lv3SelKeysRef.current = s; // ref에만 저장 (렌더 유발 X)
            return s;
        }, [processedMirror, getKey]);
        const lastCellRectRef = useRef(null); //마지막 셀의 DOM 좌표 기억용 ref 추가

        // 행에서 드래그/범위/토글 선택 시작점
        const onRowMouseDown = useCallback((rowProps, e) => {
            if (e.target.closest(ROW_EXCLUSION_SELECTOR)) return;

            const idx = rowProps.dataIndex + skip;
            const row = rowProps.dataItem;
            const key = getKey(row);

            lastFocusedKeyRef.current = key;

            if (e.shiftKey && anchorIndexRef.current != null) {
                selectionModeRef.current = 'range';
                const s = rangeToKeys(anchorIndexRef.current, idx);
                setLv3SelKeys(s);
                lastIndexRef.current = idx;
                // e.preventDefault(); // 클릭 이벤트가 발생해야 suppressNextClickRef가 소비됨
                suppressNextClickRef.current = true;
                return;
            }
            if (e.ctrlKey || e.metaKey) {
                selectionModeRef.current = 'toggle';
                anchorIndexRef.current = idx;
                lastIndexRef.current = idx;

                setLv3SelKeys(prev => {
                    const next = new Set(prev);
                    next.has(key) ? next.delete(key) : next.add(key);
                    return next;
                    return next;
                });
                suppressNextClickRef.current = true;
                return;
            }

            // 드래그 시작 (상태 변경 없음)
            selectionModeRef.current = 'drag';
            draggingRef.current = true;
            dragStartPosRef.current = { x: e.clientX, y: e.clientY };
            // setIsDragging(true); // mousemove에서 임계값 체크 후 실행
            anchorIndexRef.current = idx;
            lastIndexRef.current = idx;

            // dataset 초기화 (시각 표시용)
            const grid = gridRootRef.current;
            if (grid) {
                grid.dataset.dragStart = idx;
                grid.dataset.dragEnd = idx;
                // 성능 최적화: 드래그 시작 시점에 행 요소들 캐싱 (매번 querySelectorAll 하지 않도록)
                rowElementsRef.current = grid.querySelectorAll(".k-grid-table tr[data-index]");
            }
        }, [getKey, rangeToKeys, skip]);

        // 드래그 중 범위 갱신
        const onRowMouseEnter = useCallback((rowProps) => {
            if (!draggingRef.current || anchorIndexRef.current == null) return;
            const idx = rowProps.dataIndex + skip;
            lastIndexRef.current = idx;
            rangeToKeys(anchorIndexRef.current, idx);

            // 실시간 하이라이트 표시
            const grid = gridRootRef.current;
            if (grid) {
                // 캐싱된 행 요소 사용 (없으면 폴백으로 쿼리)
                const trs = rowElementsRef.current || grid.querySelectorAll(".k-grid-table tr[data-index]");
                const start = Math.min(anchorIndexRef.current, idx);
                const end = Math.max(anchorIndexRef.current, idx);
                trs.forEach(tr => {
                    const i = Number(tr.dataset.index) + skip;
                    tr.classList.toggle("drag-highlight", i >= start && i <= end);
                });
            }
        }, [rangeToKeys, skip]);

        // mouseup(드래그 종료): 자동으로 에디터 열지 않음 (중복 오픈 방지)
        useEffect(() => {
            const end = (e) => {
                if (!draggingRef.current) return;

                draggingRef.current = false;
                setIsDragging(false);

                // 드래그 모드였으나 실제 드래그(이동)가 없었다면, 단순 클릭이므로 선택 상태 업데이트 건너뜀
                // (Click 이벤트가 처리하도록 함) -> 수정: 다중 선택 상태에서 단일 행 클릭 시 선택 초기화
                if (selectionModeRef.current === 'drag' && !wasDraggingRef.current) {
                    selectionModeRef.current = null;
                    const grid = gridRootRef.current;
                    if (grid) {
                        delete grid.dataset.dragStart;
                        delete grid.dataset.dragEnd;
                    }

                    // 단순 클릭 시: 해당 행 하나만 선택되도록 리셋
                    // 단, lv3-opener(소분류 셀) 클릭인 경우는 여기서 처리하지 않고 lv3 onClick에 위임
                    const isLv3Opener = e.target && e.target.closest && e.target.closest('.lv3-opener');
                    if (!isLv3Opener && lastFocusedKeyRef.current) {
                        setLv3SelKeys(new Set([lastFocusedKeyRef.current]));
                    }
                    return;
                }

                // 드래그가 실제로 일어났다면, lv3 클릭 이벤트(패널 열기) 방지
                if (wasDraggingRef.current) {
                    suppressLv3ClickRef.current = true;
                    setTimeout(() => { suppressLv3ClickRef.current = false; }, 100);
                }

                selectionModeRef.current = null;

                // 최종 선택 확정: 여기서 한 번만 렌더 발생
                const finalSet = new Set(lv3SelKeysRef.current);
                setLv3SelKeys(finalSet);

                // 드래그 하이라이트 제거
                const grid = gridRootRef.current;
                if (grid) {
                    delete grid.dataset.dragStart;
                    delete grid.dataset.dragEnd;
                    // 캐싱된 요소 사용하여 클래스 제거
                    const trs = rowElementsRef.current || grid.querySelectorAll(".drag-highlight");
                    trs.forEach(tr => tr.classList.remove("drag-highlight"));
                }
                rowElementsRef.current = null; // 캐시 초기화

                // 필요 시 GridRenderer에게 콜백 전달 (선택 완료 시점)
                if (typeof props?.onDragSelectionEnd === "function") {
                    props.onDragSelectionEnd(finalSet);
                }
            };

            window.addEventListener("mouseup", end);
            return () => window.removeEventListener("mouseup", end);
        }, []);


        // lv3SelKeys 상태가 변경되면 ref도 동기화 (onRowClick 등에서 최신 상태 참조 보장)
        useEffect(() => {
            lv3SelKeysRef.current = lv3SelKeys;
        }, [lv3SelKeys]);

        // 최신 값들을 ref에 동기화 (렌더마다 가벼운 할당만)
        useEffect(() => {
            keyHandlerStateRef.current = {
                lv3SelKeys,
                data: dataState?.data,
                getKey,
                // 아래 4개는 기존 로직에서 쓰던 포커스/인덱스/엘리먼트 정보
                lastFocusedKey: lastFocusedKeyRef.current,
                anchorIndex: anchorIndexRef.current,
                lastIndex: lastIndexRef.current,
                lastCellEl: lastCellElRef.current,
                lastCellRect: lastCellRectRef.current,
            };
        }, [lv3SelKeys]);

        // 소분류 선택 해제
        const clearLv3Selection = useCallback(() => {
            setLv3SelKeys(new Set());        // 노란 선택 해제
            anchorIndexRef.current = null;   // 범위 시작점 초기화
            lastIndexRef.current = null;     // 마지막 인덱스 초기화
            lastCellRectRef.current = null;  // 마지막 셀 위치 초기화
            lastFocusedKeyRef.current = null;
            selectionModeRef.current = null; // 모드 초기화
        }, []);

        // 클릭 하이라이트(색상) 제거: 선택된 행 key/편집상태 모두 해제
        const clearRowHighlight = useCallback(() => {
            setSelectedRowKey(null);
            setDataState(prev => {
                let changed = false;
                const next = prev.data.map(r => {
                    if (r.inEdit) {
                        changed = true;
                        return { ...r, inEdit: false };
                    }
                    return r;
                });
                return changed ? { ...prev, data: next } : prev;  // 변경 없으면 그대로 반환
            });
        }, [setDataState]);

        // commitSmart를 ref로 보관 (의존성 제거를 위해)
        const commitSmartRef = useRef(null);
        useEffect(() => {
            commitSmartRef.current = commitSmart;
        }, []);

        // 일괄 적용 (선택된 키들에 옵션 메타까지 모두 반영)
        const applyLv3To = useCallback((targetKeys, opt) => {
            const keySet = targetKeys instanceof Set ? targetKeys : new Set([].concat(targetKeys));
            onUnsavedChange?.(true);
            setDataState(prev => {
                const updated = prev.data.map(r =>
                    keySet.has(getKey(r))
                        ? {
                            ...r,
                            lv3: opt?.codeName ?? "",
                            lv1: opt?.lv1 ?? "",
                            lv2: opt?.lv2 ?? "",
                            lv1code: opt?.lv1code ?? "",
                            lv2code: opt?.lv2code ?? "",
                            lv123code: opt?.lv123code ?? "",
                        }
                        : r
                );
                commitSmartRef.current?.(updated);
                return { ...prev, data: updated };
            });
        }, []);

        useImperativeHandle(ref, () => ({
            applyLv3To,
            resetAutoSelection: () => { shouldAutoApplySelectionRef.current = true; }
        }));
        /*----------소분류 드래그-------*/

        // 행 클릭 시: 스크롤 유지 + 단일 행 선택 + 편집 포커스 이동
        const onRowClick = useCallback((e) => {
            rememberScroll(); // 스크롤 저장

            // 클릭한 행의 고유 key 계산 후 "현재 선택 행"으로 저장
            const clickedKey = getKey(e.dataItem);
            setSelectedRowKey(clickedKey);

            // 드래그/다중선택이 있어도 행 클릭하면 "그 행만" 연두색으로 남기기
            // 단, 이미 선택된 행을 클릭한 경우(일괄 편집 의도)에는 리셋하지 않음
            if (!lv3SelKeysRef.current.has(clickedKey)) {
                const nextSel = new Set();
                if (clickedKey != null) nextSel.add(clickedKey);
                setLv3SelKeys(nextSel);
                lv3SelKeysRef.current = nextSel;
            }

            // Shift+클릭 / 드래그 선택을 위해 기준 인덱스(anchor / last)를 클릭한 행으로 리셋
            const rowIndex = rows.findIndex(r => getKey(r) === clickedKey);
            if (rowIndex >= 0) {
                anchorIndexRef.current = rowIndex;
                lastIndexRef.current = rowIndex;
            }
            // inEdit 플래그: 클릭한 행만 true, 나머지는 false
            setDataState(prev => ({
                ...prev,
                data: prev.data.map(r => ({
                    ...r,
                    inEdit: getKey(r) === clickedKey
                }))
            }));
        }, []);

        // 비어있는 가장 작은 수 or "max+1"
        const NEXT_CID_MODE = persistedPrefs?.nextCidMode ?? "min-gap";

        const getNextCid = useCallback((fk, data, mode = NEXT_CID_MODE) => {
            const nums = (data || [])
                .filter(r => r.fixed_key === fk && r.__pendingDelete !== true) // 보류 삭제 제외
                .map(r => Number(r.cid))
                .filter(n => Number.isFinite(n))
                .sort((a, b) => a - b);

            if (mode === "min-gap") {
                let expect = 1;
                for (const n of nums) {
                    if (n === expect) expect++;
                    else if (n > expect) break;   // 구멍 발견
                }
                return String(expect); // 1,2,3,.. 가운데 비어있는 가장 작은 값
            }

            const max = nums.length ? nums[nums.length - 1] : 0;
            return String(max + 1);
        }, []);

        // 추가 버튼 이벤트
        const handleAddButton = useCallback((cellProps) => {
            rememberScroll(); // 스크롤 저장
            onUnsavedChange?.(true);

            const clicked = cellProps.dataItem;
            const clickedKey = getKey(clicked);
            setSelectedRowKey(clickedKey);

            setDataState((prev) => {
                const prevData = prev?.data ?? [];
                const idx = prevData.findIndex(r => getKey(r) === clickedKey);
                if (idx === -1) return prev;

                const fk = clicked?.fixed_key;
                const nextCid = getNextCid(fk, prevData);

                const newRow = {
                    fixed_key: fk,
                    cid: nextCid,
                    answer_origin: clicked?.answer_origin,
                    answer: clicked?.answer,
                    lv1: "", lv2: "", lv3: "",
                    lv1code: "", lv2code: "",
                    lv123code: "",
                    sentiment: "",
                    selected: false,
                    ip: "",
                    inEdit: true,
                    __isNew: true,
                    __rowKey: `${String(fk)}::${nextCid}::${Date.now()}::${Math.random()}`,
                };

                const nextData = [...prevData];
                nextData.splice(idx + 1, 0, newRow);

                commitSmartRef.current?.(nextData);
                return { ...prev, data: nextData };
            });
        }, []);

        // 클릭 행 
        const rowRender = (trEl, rowProps) => {
            // 헤더/푸터/그룹 헤더는 Kendo 기본 이벤트 유지해야 정렬/필터 정상 작동
            if (!rowProps.dataItem) {
                return trEl;   // 절대 커스텀 이벤트 넣지 말기
            }

            const key = getKey(rowProps?.dataItem);
            if (key === undefined) return;

            const clicked = key === selectedRowKey;
            const selectedByBatch = lv3SelKeys.has(key);   // 행이 일괄 선택 대상이면
            const pending = rowProps?.dataItem?.__pendingDelete === true;

            // Kendo 기본 선택 클래스 제거(배경 겹침 방지)
            const base = (trEl.props.className || '')
                .replace(/\bk-selected\b/g, '')
                .replace(/\bk-state-selected\b/g, '');

            const cls = `${base} ${clicked ? 'row-clicked' : ''} ${selectedByBatch ? 'lv3-row-selected' : ''} ${pending ? 'row-pending-delete' : ''}`.trim();

            return React.cloneElement(trEl, {
                ...trEl.props,
                'data-index': rowProps.dataIndex,
                className: cls,
                style: { ...trEl.props.style, userSelect: 'none' }, // 텍스트 선택 방지
                onPointerDown: (e) => { onRowMouseDown(rowProps, e); trEl.props.onPointerDown?.(e); },
                onPointerEnter: (e) => { onRowMouseEnter(rowProps, e); trEl.props.onPointerEnter?.(e); },
                onDragStart: (e) => e.preventDefault(), // 네이티브 드래그로 텍스트 선택되는 것 방지
                onClick: (e) => {
                    if (suppressNextClickRef.current) {
                        suppressNextClickRef.current = false;
                        e.preventDefault();
                        e.stopPropagation();
                        return; // Kendo 기본 클릭(선택 리셋) 방지
                    }

                    // 체크박스, 추가, 삭제 버튼, sentiment 클릭은 제외
                    const target = e.target;
                    const isCheckbox = target.closest('.k-checkbox-cell') ||
                        target.closest('.k-selectioncheckbox') ||
                        target.closest('input[type="checkbox"]');
                    const isButton = target.closest('.btnM');
                    const isSentiment = target.closest('td[data-field="sentiment"]');

                    if (!isCheckbox && !isButton && !isSentiment) {
                        // 소분류 패널 자동 열기 (다중 선택 지원)
                        const key = getKey(rowProps.dataItem);
                        // 클릭한 행이 선택된 상태라면, 선택된 모든 행을 타겟으로 함
                        const currentKeys = lv3SelKeysRef.current.has(key) ? lv3SelKeysRef.current : new Set([key]);
                        const selectedRows = (dataState?.data || []).filter(r => currentKeys.has(getKey(r)));
                        const targetRows = selectedRows.length > 0 ? selectedRows : [rowProps.dataItem];

                        const targetCodes = targetRows.map(r => r.lv123code);
                        onOpenLv3Panel?.(targetRows, targetCodes);
                    }

                    if (!e.defaultPrevented) trEl.props.onClick?.(e);
                },
            });
        };

        // 선택된 lv3 셀 존재 여부
        const hasLv3CellSelection = lv3SelKeys.size > 0;

        const buildSavePayload = (rows, opts, { getKey, selectedState = {} }) => {
            const {
                user = "",
                projectnum = "",
                qnum = "",
                gb = "in",               // 호출 구분자
            } = opts || {};

            const now = formatNow();

            const data = (rows ?? []).map(r => {
                const isChecked = !!selectedState[getKey(r)]; //  현재 체크박스 상태를 맵에서 직접 확인
                return {
                    cid: Number(r.cid) || 0,
                    lv3: r.lv3 ?? "",
                    fixed_key: r.fixed_key ?? "",
                    lv123code: r.lv123code ?? "",
                    sentiment: r.sentiment ?? "",

                    //  체크 해제면 빈 문자열로 확실히 세팅
                    recheckyn: isChecked ? "y" : "",
                    answer_fin: (r.answer_fin ?? r.answer ?? ""),
                    update_date: now,
                };
            });
            return {
                user,
                projectnum,
                qnum,
                gb,
                lvcode: String(lvCode ?? ""),
                data,
            };
        };

        // saveChanges 의존성 제거를 위한 ref 처리 
        const selectedStateRef = useRef(selectedState);
        useEffect(() => { selectedStateRef.current = selectedState; }, [selectedState]);
        const onSavedRef = useRef(onSaved);
        useEffect(() => { onSavedRef.current = onSaved; }, [onSaved]);

        /* 저장: API 호출 */
        const saveChanges = useCallback(async () => {
            // selected → recheckyn 반영 + 페이로드 생성
            const payload = buildSavePayload(rows.filter(r => r.__pendingDelete !== true), {   // 실제 저장 데이터만
                user: auth?.user?.userId || "",
                projectnum: projectnum,
                qnum: qnum,
                gb: "in",
            }, { getKey, selectedState });

            // 저장 API 호출
            try {
                const res = await optionSaveData.mutateAsync(payload);
                if (res?.success === "777") {
                    // modal.showAlert("알림", "저장되었습니다."); // 성공 팝업 표출
                    onSaved?.();
                    onUnsavedChange?.(false);
                    onHasEditLogChange?.(false);
                    clearLv3Selection();
                    clearRowHighlight();

                    shouldAutoApplySelectionRef.current = true;   // 재조회 후 recheckyn 1회 자동복원
                    suppressUnsavedSelectionRef.current = true;   // 새 데이터 자리잡을 때까지 행 수정 금지
                    setSelectedStateGuarded({});                  // 선택맵 초기화
                    baselineAfterReloadRef.current = true;       // 다음 로드에서 베이스라인 리셋

                    // 화면에서 바로 없애기: 보류삭제 행 제거 + 로컬플래그 제거
                    setDataState(prev => {
                        const kept = (prev.data || []).filter(r => r.__pendingDelete !== true);
                        return { ...prev, data: kept };
                    });
                    handleSearch();                              // 재조회
                    return true;
                } else {
                    modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다."); //오류 팝업 표출
                    return false; // 실패 시 그리드 상태 변경 안 함
                }
            } catch (err) {
                console.error(err);
                modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다.");
                return false;
            }
        }, [rows, getKey, setSelectedStateGuarded]);

        // 부모에서 호출할 수 있도록 ref에 연결
        useEffect(() => {
            saveChangesRef.current = saveChanges;
        }, [saveChanges]);
        const gridRootRef = useRef(null); // KendoGrid 감싸는 div에 ref 달아 위치 기준 계산

        // 검증 체크박스 위치 고정시키기 위함 (임시)
        const anchorField = useMemo(() => {
            const vis = effectiveColumns.filter(c => c.show !== false);
            return vis.length >= 3 ? vis[vis.length - 3].field : undefined; // 항상 추가 왼쪽에
        }, [effectiveColumns]);

        // 삭제/취소 버튼 클릭
        const onClickDeleteCell = useCallback((cellProps) => {
            rememberScroll(); // 스크롤 저장
            onUnsavedChange?.(true);
            const deletedRow = cellProps.dataItem;
            const deletedKey = getKey(deletedRow);
            setDataState((prev) => {
                const prevData = prev?.data ?? [];
                let nextData;

                if (deletedRow.__isNew) {
                    // 신규 추가행은 즉시 제거
                    nextData = prevData.filter(r => getKey(r) !== deletedKey);
                } else {
                    // 기존 행은 __pendingDelete 토글
                    nextData = prevData.map(r =>
                        getKey(r) === deletedKey
                            ? { ...r, __pendingDelete: !r.__pendingDelete }
                            : r
                    );
                }
                // 삭제된 행만 커밋
                commitSmartRef.current?.(nextData);
                return { ...prev, data: nextData };
            });
        }, []);

        // 추가 버튼은 “보류삭제 아닌 마지막 cid”에서만
        const lastVisibleCidByFixedKey = useMemo(() => {
            const m = new Map();
            for (const r of (dataState?.data ?? [])) {
                if (r.__pendingDelete === true) continue;
                const fk = r?.fixed_key;
                const c = Number(r?.cid ?? -Infinity);
                if (fk == null) continue;
                if (!m.has(fk) || c > m.get(fk)) m.set(fk, c);
            }
            return m;
        }, [dataState?.data]);

        // 소분류코드 생성 요청 클릭 핸들러
        const handleAddMissingCode = useCallback(async (row) => {
            rememberScroll(); // 스크롤 저장
            try {
                const payload = {
                    user: auth?.user?.userId || "",
                    projectnum,
                    qnum,
                    gb: "register_excode",
                    lv3: row?.lv3
                };
                const res = await optionSaveData.mutateAsync(payload);
                if (res?.success === "777") {
                    modal.showConfirm("알림", "소분류 코드를 추가했습니다.", {
                        btns: [{
                            title: "확인", click: async () => {
                                handleSearch();
                                await onRequestLv3Refresh?.(); // 부모에게 소분류 코드 재조회 요청 보냄 
                            }
                        }],
                    });
                    return;
                } else if (res?.success === "768") {
                    modal.showErrorAlert("에러", res?.message);
                } else {
                    modal.showErrorAlert("에러", "코드 추가에 실패했습니다.");
                }
            } catch (e) {
                console.error(e);
                modal.showErrorAlert("에러", "코드 추가 중 오류가 발생했습니다.");
            }
        }, []);

        // Body 초기 lvcode 전달
        const reportedLvcodeRef = useRef(false);


        return (
            <Fragment>
                <div className="meta-header-layout">
                    <div className="meta-header-left meta2">
                        <div className="row1">업데이트 날짜: {updatedAt}</div>
                        <div className="row2" style={{ textAlign: "left", marginLeft: "10px" }}>
                            <span>분석 <b>{analyzed}</b> / 검증 <b>{verified}</b> / 총 <b>{total}</b></span>
                        </div>
                    </div>
                    <div className="meta-header-right">
                        <button
                            className={`filter-toggle-btn ${showUnverifiedOnly ? 'active' : ''}`}
                            onClick={() => setShowUnverifiedOnly(!showUnverifiedOnly)}
                        >
                            <span className="check-icon">{showUnverifiedOnly ? '☑' : '☐'}</span>
                            검증 안 된 데이터만 보기
                        </button>
                    </div>
                </div>
                <div ref={gridRootRef} id="grid_01" className={`cmn_grid singlehead ${isLeftOpen && String(lvCode) !== "1" ? "force-scroll" : ""} ${hasLv3CellSelection ? "lv3-cell-select" : ""} ${isDragging ? "is-dragging" : ""}`} style={{ marginBottom: '0px' }}>
                    <KendoGrid
                        rowHeight={38}
                        // key={`lv-${lvCode}-${gridEpoch}`}
                        key={`lv-${lvCode}`}
                        parentProps={{
                            data: paginatedData,
                            onProcessedDataUpdate: (arr) => {
                                // Grid의 처리 결과 대신 우리가 처리한 데이터 사용
                                setProcessedMirror(filteredSortedData);
                                if (filteredSortedData && filteredSortedData.length > 0) {
                                    // Kendo가 실제 화면 데이터 계산 완료 → 로딩 닫기
                                    loadingSpinner.hide();
                                }
                            },
                            dataItemKey: DATA_ITEM_KEY,
                            editField,
                            onRowClick,
                            selectedField: SELECTED_FIELD, // 체크박스 필드 지정 
                            selectedState,
                            setSelectedState: setSelectedStateGuarded,
                            idGetter: (r) => r.__rowKey,
                            multiSelect: true,
                            selectAllMode: 'page',  // 헤더 체크박스는 현재 페이지만 선택
                            selectionColumnAfterField: anchorField, // 체크박스 선택 컬럼을 원하는 위치에 삽입 
                            linkRowClickToSelection: false, // 행 클릭과 체크박스 선택 연동X 
                            selectionHeaderTitle: "검증",   // 체크박스 헤더에 컬럼명 표출할 경우
                            rowRender,
                            sortable: { mode: "multiple", allowUnsort: true },
                            filterable: true,
                            pageable: filteredSortedData.length > 500 ? {
                                buttonCount: 5,
                                info: true,
                                type: 'numeric',
                                pageSizes: false,
                                previousNext: true,
                                position: 'both'
                            } : false,
                            pageSize: 500,
                            skip: skip,
                            total: filteredSortedData.length,
                            onPageChange: (e) => {
                                setSkip(e.page.skip);
                                setSelectedRowKey(null); // 페이지 변경 시 행 선택 초기화
                            },
                            sort: mappedSort,
                            filter: filter,
                            sortChange: ({ sort: next }) => {
                                const nextRaw = (next || []).map(d => {
                                    const orig = Object.keys(proxyField).find(k => proxyField[k] === d.field);
                                    return { ...d, field: orig || d.field };
                                });
                                setSort(nextRaw ?? []);
                                onPrefsChange?.({ sort: nextRaw ?? [] });
                            },
                            filterChange: ({ filter }) => { setFilter(filter ?? null); onPrefsChange?.({ filter: filter ?? null }); },
                            cellRender: (td, cellProps) => {
                                if (!React.isValidElement(td)) return td;
                                const f = cellProps?.field;
                                if (!f) return td;
                                const k = cellProps?.dataItem?.__rowKey;
                                return React.cloneElement(td, {
                                    ...td.props,
                                    'data-field': f,
                                    'data-rowkey': k,
                                });
                            },
                        }}
                    >
                        {effectiveColumns.filter(c => c.show !== false).map((c) => {
                            if (c.field === 'lv3') {
                                return (
                                    <Column
                                        key={c.field}
                                        field="lv3"
                                        title={c.title}
                                        width={c.width}
                                        columnMenu={columnMenu}
                                        sortable
                                        cell={(cellProps) => {
                                            const rowKey = getKey(cellProps.dataItem);
                                            const currentValue = cellProps.dataItem.lv3 ?? "";
                                            const hasReqError = String(currentValue).trim() === ""; // 값이 없으면 빨간 테두리
                                            return (
                                                <td
                                                    data-lv3-key={rowKey}
                                                    className={hasReqError ? "lv3-error cell-error" : ""}
                                                    tabIndex={0}
                                                    title={currentValue}
                                                >
                                                    <div
                                                        className="lv3-opener"
                                                        style={{ cursor: "context-menu" }}
                                                        // onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // 행 클릭 이벤트(단일 선택 강제) 방지
                                                            if (suppressLv3ClickRef.current) return; // 드래그 직후 클릭 방지

                                                            rememberScroll();  // 스크롤 저장

                                                            const td = e.currentTarget.closest('td');
                                                            const rect = td?.getBoundingClientRect?.();
                                                            const rowKey = getKey(cellProps.dataItem);

                                                            if (rect) lastCellRectRef.current = rect;
                                                            lastFocusedKeyRef.current = rowKey;

                                                            // Shift 클릭 시에는 anchorIndexRef를 업데이트하지 않음 (기존 anchor 유지)
                                                            if (!e.shiftKey) {
                                                                anchorIndexRef.current = cellProps.dataIndex;
                                                                lastIndexRef.current = cellProps.dataIndex;
                                                            }

                                                            if (td) {
                                                                lastCellElRef.current = td;
                                                                lv3AnchorElRef.current = td;
                                                            }

                                                            const isSimpleClick = !e.ctrlKey && !e.shiftKey && !e.metaKey;

                                                            if (isSimpleClick) {
                                                                const currentSel = lv3SelKeysRef.current;
                                                                if (currentSel.has(rowKey) && currentSel.size > 1) {
                                                                    const selectedRows = (dataState?.data || []).filter(r => currentSel.has(getKey(r)));
                                                                    const targetRows = selectedRows.length > 0 ? selectedRows : [cellProps.dataItem];
                                                                    const targetCodes = targetRows.map(r => r.lv123code);
                                                                    onOpenLv3Panel?.(targetRows, targetCodes);
                                                                } else {
                                                                    // 단순 클릭 시: 무조건 해당 행만 선택 (기존 다중선택 해제)
                                                                    setLv3SelKeys(new Set([rowKey]));

                                                                    // 패널 열기 (단일 대상)
                                                                    onOpenLv3Panel?.([cellProps.dataItem], [cellProps.dataItem.lv123code]);
                                                                }
                                                            } else {
                                                                // 클릭한 행이 선택된 상태가 아니라면 하이라이트 적용
                                                                if (!lv3SelKeysRef.current.has(rowKey)) {
                                                                    setLv3SelKeys(new Set([rowKey]));
                                                                }

                                                                // 현재 클릭한 행을 포함하여 타겟 계산
                                                                const currentKeys = lv3SelKeysRef.current.has(rowKey) ? lv3SelKeysRef.current : new Set([rowKey]);
                                                                const selectedRows = (dataState?.data || []).filter(r => currentKeys.has(getKey(r)));
                                                                const targetRows = selectedRows.length > 0 ? selectedRows : [cellProps.dataItem];
                                                                const targetCodes = targetRows.map(r => r.lv123code);

                                                                onOpenLv3Panel?.(targetRows, targetCodes);
                                                            }
                                                        }}
                                                    >
                                                        <span className="lv3-display">{currentValue || "소분류 선택"}</span>
                                                    </div>

                                                    {
                                                        hasReqError && (
                                                            <span className="cell-error-badge">빈값</span>
                                                        )
                                                    }
                                                </td>
                                            );
                                        }}
                                    />
                                );
                            }
                            if (c.field === 'sentiment') {
                                return (
                                    <Column
                                        key={c.field}
                                        field={c.field}
                                        title={c.title}
                                        width={c.width}
                                        editable={c.editable}
                                        cell={(props) => {
                                            const row = props.dataItem;
                                            const inEdit = getKey(row) === selectedRowKey;
                                            const handleChange = (e) => {
                                                const val = e.target.value;
                                                setDataState(prev => {
                                                    const next = prev.data.map(r => getKey(r) === getKey(row) ? { ...r, sentiment: val } : r);
                                                    commitSmartRef.current?.(next);
                                                    return { ...prev, data: next };
                                                });
                                            };

                                            const cellProps = {
                                                style: props.style,
                                                className: props.className,
                                                "data-field": "sentiment",
                                                colSpan: props.colSpan,
                                                role: "gridcell",
                                                "aria-colindex": props.columnIndex + 1,
                                                "aria-selected": props.isSelected
                                            };

                                            if (inEdit) {
                                                return (
                                                    <td
                                                        {...cellProps}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        <DropDownList
                                                            data={SENTIMENT_OPTIONS}
                                                            value={row.sentiment}
                                                            onChange={handleChange}
                                                        />
                                                    </td>
                                                );
                                            }
                                            return (
                                                <td
                                                    {...cellProps}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRowClick({ dataItem: row });
                                                    }}
                                                >
                                                    {row.sentiment}
                                                </td>
                                            );
                                        }}
                                    />
                                );
                            }
                            if (c.field === 'lv1code' || c.field === 'lv2code' || c.field === 'lv123code') {
                                return (
                                    <Column
                                        key={c.field}
                                        field={proxyField[c.field] ?? `__sort__${c.field}`}
                                        title={c.title}
                                        width={c.width}
                                        sortable
                                        columnMenu={(menuProps) => columnMenu({ ...menuProps, field: c.field })}
                                        cell={(p) => {
                                            const r = p.dataItem;
                                            const codeId = String(r?.[c.field] ?? "").trim();
                                            const codeName = String(r?.lv3 ?? "").trim();

                                            // 패널에서 받아온 옵션 확인
                                            const matchedOpt = (lv3Options || []).find(o => String(o.codeName ?? "").trim() === codeName);

                                            return (
                                                <td style={{ textAlign: "center" }}>
                                                    {/* 코드가 있으면 무조건 코드 출력 */}
                                                    {!!codeId ? (
                                                        <span title={codeId}>{codeId}</span>
                                                    ) :
                                                        /* 코드 없지만 이름은 있고, lv3Options에도 없으면 등록 버튼 */
                                                        (c.field === 'lv123code' && !!codeName && !matchedOpt) ? (
                                                            <Button
                                                                className="btnM"
                                                                themeColor="primary"
                                                                onClick={() => handleAddMissingCode(r)}
                                                            >
                                                                코드 등록
                                                            </Button>
                                                        ) : null}
                                                </td>
                                            );
                                        }}
                                    />
                                );
                            }
                            if (c.field === 'add') {
                                return (
                                    <Column
                                        key={c.field}
                                        field="add"
                                        title={c.title}
                                        width={c.width}
                                        sortable={false}
                                        columnMenu={undefined}
                                        cell={(props) => {
                                            const row = props.dataItem;
                                            const fk = row?.fixed_key;
                                            const isLastVisible = row.__pendingDelete !== true && Number(row?.cid) === (lastVisibleCidByFixedKey.get(fk) ?? -1);
                                            return (
                                                <td style={{ textAlign: "center" }}>
                                                    {isLastVisible && (
                                                        <Button
                                                            className={"btnM"}
                                                            themeColor={"primary"}
                                                            onClick={() => handleAddButton(props)}
                                                        >
                                                            추가
                                                        </Button>
                                                    )}
                                                </td>
                                            );
                                        }}
                                    />
                                );
                            }
                            if (c.field === 'delete') {
                                return (
                                    <Column
                                        key={c.field}
                                        field="delete"
                                        title={c.title}
                                        width={c.width}
                                        sortable={false}
                                        columnMenu={undefined}
                                        cell={(props) => {
                                            const row = props.dataItem;
                                            const pending = row.__pendingDelete === true;

                                            // 멀티값이 1이면 항상 숨김 
                                            const isMultiOne = Number(row?.cid) === 1;
                                            if (isMultiOne) return <td />;

                                            return (
                                                <td style={{ textAlign: "center" }}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        className="btnM"
                                                        themeColor={pending ? "secondary" : "primary"}
                                                        onClick={() => onClickDeleteCell(props)}
                                                        style={{ borderRadius: "8px" }}
                                                    >
                                                        {pending ? "취소" : "삭제"}
                                                    </Button>
                                                </td>
                                            );
                                        }}
                                    />
                                );
                            }
                            if (c.field === "cid") {
                                return (
                                    <Column
                                        key={c.field}
                                        field={c.field}
                                        title={c.title}
                                        width={c.width}
                                        editable={c.editable}
                                        sortable={false}   // 정렬 끔
                                    />
                                );
                            }
                            // 일반 텍스트 컬럼
                            return (
                                <Column
                                    key={c.field}
                                    field={c.field}
                                    title={c.title}
                                    width={c.width}
                                    editable={c.editable}
                                    columnMenu={columnMenu}
                                />
                            );
                        })}
                    </KendoGrid>
                </div>
            </Fragment>
        );
    }));

    const renderGridItem = useCallback((props) => (
        <GridRenderer
            {...props}
            hist={hist}
            baselineDidRef={baselineDidRef}
            baselineAfterReloadRef={baselineAfterReloadRef}
            baselineSigRef={baselineSigRef}
            sigStackRef={sigStackRef}
            makeTab1Signature={makeTab1Signature}
            ref={gridRef}
            scrollTopRef={scrollTopRef}
            showUnverifiedOnly={showUnverifiedOnly}
            setShowUnverifiedOnly={setShowUnverifiedOnly}
            isLeftOpen={isLeftOpen}
        />
    ), [hist, makeTab1Signature, sort, filter, showUnverifiedOnly, isLeftOpen, effectiveColumns]);

    return (
        <GridData
            dataItemKey={DATA_ITEM_KEY}
            searchMutation={{
                ...optionEditData,
                mutateAsync: async (params) => {
                    loadingSpinner.show();
                    const res = await optionEditData.mutateAsync({ ...params, skipSpinner: true });

                    // Body 초기 lvcode 전달 (Interceptor)
                    if (!reportedLvcodeRef.current && onInitLvCode) {
                        const fetchedLv = String(res?.lvcode ?? res?.resultjson?.[0]?.lvcode ?? "").trim();
                        if (["1", "2", "3"].includes(fetchedLv)) {
                            onInitLvCode(fetchedLv);
                            reportedLvcodeRef.current = true;
                        }
                    }

                    // resultjson이 빈 배열일 경우 로딩바 닫기
                    if (Array.isArray(res?.resultjson) && res.resultjson.length === 0) {
                        loadingSpinner.hide();
                    }
                    return res;
                },
            }}
            selectedField={SELECTED_FIELD}
            multiSelect={true}
            editField={editField}
            initialParams={{             /*초기파라미터 설정*/
                user: auth?.user?.userId || "",
                projectnum: projectnum,
                qnum: qnum,
                gb: "in",
            }}
            renderItem={renderGridItem}   // useCallback 적용
        />
    );
});

export default memo(OptionSettingTab1);
