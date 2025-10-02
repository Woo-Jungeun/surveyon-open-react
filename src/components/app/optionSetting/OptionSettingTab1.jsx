import React, { Fragment, useEffect, useState, useRef, useCallback, useMemo, useContext, forwardRef, useImperativeHandle, useLayoutEffect } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";
import { Button } from "@progress/kendo-react-buttons";
import "@/components/app/optionSetting/OptionSetting.css";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from "@/hooks/useUpdateHistory";
import { useSelector } from "react-redux";
import { orderByWithProxy, unmapSortFields } from "@/common/utils/SortComparers";

// 드래그 제외 셀렉터: 바깥에 선언해 매 렌더마다 재생성 방지
const ROW_EXCLUSION_SELECTOR = [
    '.lv3-popup', '.lv3-editor', '.lv3-opener', '.k-animation-container',
    '.k-input', '.k-dropdownlist', '.k-button',
    '.k-selectioncheckbox', '.k-checkbox-cell',
    '.k-checkbox', '.k-checkbox-box', '.k-checkbox-wrap',
    'label.k-checkbox-label', 'label[for]',
    'input[type="checkbox"]', '[role="checkbox"]'
].join(',');

const lv3Cache = new WeakMap();
const getKey = (row) => row?.__rowKey ?? null; // 키 가져오기 헬퍼 
const tl = (v) => String(v ?? "").trim().toLowerCase();

// 클라이언트 전용 표시/편집 플래그 제거
const stripLocalFlags = (rows = []) =>
    (rows || []).map(r => {
        const { __pendingDelete, __errors, __errorKinds, inEdit, selected, __isNew, ...rest } = r;
        return rest;
    });
// YYYY-MM-DD HH:mm:ss
const formatNow = (d = new Date()) => {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/**
 * 분석 > 그리드 영역 > 응답 데이터
 *
 * @author jewoo
 * @since 2025-08-11<br />
 */
const OptionSettingTab1 = forwardRef((props, ref) => {
    const auth = useSelector((store) => store.auth);
    const lvCode = String(props.lvCode); // 분류 단계 코드
    const { onInitLvCode, onUnsavedChange, onSaved, persistedPrefs, onPrefsChange
        , onInitialAnalysisCount, onHasEditLogChange, projectnum, qnum, onOpenLv3Panel, lv3Options } = props;
    const modal = useContext(modalContext);
    const DATA_ITEM_KEY = "__rowKey";
    const MENU_TITLE = "응답 데이터";
    const SELECTED_FIELD = "selected";
    const { optionEditData, optionSaveData } = OptionSettingApi();
    const [editField] = useState("inEdit");

    const saveChangesRef = useRef(async () => false);   // 저장 로직 노출용
    const lv3AnchorElRef = useRef(null);   // 현재 드롭다운이 붙을 td 엘리먼트
    const lastCellElRef = useRef(null);    // 마지막으로 진입/클릭한 lv3 셀(td)
    const latestCtxRef = useRef(null);
    const gridRef = useRef(null);

    // 부모(OptionSettingBody.jsx) 에게 노출
    useImperativeHandle(ref, () => ({
        saveChanges: () => saveChangesRef.current(),   // 부모 저장 버튼이 호출
        reload: () => latestCtxRef.current?.handleSearch?.(), // 재조회
        applyLv3To: (targets, opt) => {
            console.log("👉 Tab1 applyLv3To 호출됨", { targets, opt });
            gridRef.current?.applyLv3To?.(targets, opt);
        }
    }));

    /**
     * 숨김처리 여부 allowHide (true/false)
     * 편집 가능 여부 editable(true/false)
    */
    const [columns, setColumns] = useState(() =>
        persistedPrefs?.columns ?? [
            // { field: "fixed_key", title: "키", show: false, editable: false },
            { field: "answer_origin", title: "원본 응답", show: true, editable: false, width: "230px", allowHide: false },
            { field: "cid", title: "멀티", show: true, editable: false, width: "100px", allowHide: false },
            { field: "answer", title: "클리닝 응답", show: true, editable: false, width: "230px", allowHide: false },
            { field: "lv1code", title: "대분류 코드", show: true, editable: false, width: "150px" },
            { field: "lv1", title: "대분류", show: true, editable: false, width: "200px" },
            { field: "lv2code", title: "중분류 코드", show: true, editable: false, width: "150px" },
            { field: "lv2", title: "중분류", show: true, editable: false, width: "200px" },
            { field: "lv123code", title: "소분류 코드", show: true, editable: false, width: "150px", allowHide: false },
            { field: "lv3", title: "소분류", show: true, editable: true, width: "200px", allowHide: false },
            { field: "sentiment", title: "sentiment", show: true, editable: false, width: "150px" },
            { field: "add", title: "추가", show: true, editable: true, width: "100px", allowHide: false },
            { field: "delete", title: "삭제", show: true, editable: true, width: "100px", allowHide: false }
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
        return columns.map(c =>
            forcedHidden.has(c.field)
                ? { ...c, show: false, allowHide: false }
                : c
        );
    }, [columns, forcedHidden, stageFields]);

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
                setFilter(e);
                onPrefsChange?.({ filter: e });
            }}
        />
    ), [columns, forcedHidden, stageFields, filter, onPrefsChange]);

    /* 선택된 행 key */
    const [selectedRowKey, setSelectedRowKey] = useState(null);

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
    const GridRenderer = forwardRef((props, ref) => {
        const { dataState, setDataState, selectedState, setSelectedState,
            idGetter, dataItemKey, handleSearch, hist, baselineDidRef, baselineAfterReloadRef,
            sigStackRef, makeTab1Signature,
        } = props;

        const rows = dataState?.data ?? [];
        const hasAllRowKeys = useMemo(() => (dataState?.data ?? []).every(r => !!r?.__rowKey), [dataState?.data]);
        const [lv3AnchorRect, setLv3AnchorRect] = useState(null); // {top,left,width,height}
        const [isDragging, setIsDragging] = useState(false);
        /** ===== 소분류 셀: 엑셀식 선택 + 드롭다운 ===== */
        const [lv3SelKeys, setLv3SelKeys] = useState(new Set()); // 선택된 행키 집합(소분류 전용)
        const [lv3EditorKey, setLv3EditorKey] = useState(null);  // 드롭다운 보여줄 "대표" 셀의 키
        const draggingRef = useRef(false);
        const anchorIndexRef = useRef(null);
        const lastIndexRef = useRef(null);
        const lastFocusedKeyRef = useRef(null);
        const selectionModeRef = useRef(null);// 선택 동작 모드: 'drag' | 'range' | 'toggle'
        const shouldAutoApplySelectionRef = useRef(true);
        const justClosedAtRef = useRef(0);
        const justOpenedAtRef = useRef(0); // 최초 오픈 직후 바깥 클릭 무시 가드
        const keyHandlerStateRef = useRef({}); // keydown 핸들러가 참조할 최신 상태 보관용 ref
        const suppressUnsavedSelectionRef = useRef(false); // 선택 변경 감지 억제 플래그 (setSelectedStateGuarded에서만 더티 관리)
        const reportedInitialAnalysisRef = useRef(false); // 분석값 최초 보고 여부
        const suppressNextClickRef = useRef(false); //Ctrl 토글 후 Kendo 기본 click 한 번 차단
        const [gridEpoch, setGridEpoch] = useState(0);
        const { data: dataForGridSorted, mappedSort, proxyField } = useMemo(() => (
            orderByWithProxy(dataState?.data || [], sort, {
                // 숫자 인식 자연 정렬이 필요한 필드만 명시
                lv1code: 'nat',
                lv2code: 'nat',
                lv123code: 'nat',
            })
        ), [dataState?.data, sort]);

        useEffect(() => {
            const rowsNow = dataState?.data || [];
            if (!rowsNow.length || !hasAllRowKeys) return;

            if (!baselineDidRef.current || baselineAfterReloadRef.current) {
                // 새로 들어온 데이터에 남아있는 로컬 플래그를 제거
                const needClean = rowsNow.some(r =>
                    r?.__pendingDelete === true || r?.inEdit || r?.selected ||
                    r?.__errors || r?.__errorKinds || r?.__isNew
                );
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
        }, [dataState?.data, hasAllRowKeys, hist, makeTab1Signature, onUnsavedChange]);

        // 수정로그 commit 
        const commitSmart = useCallback((updatedRows) => {
            const newSig = makeTab1Signature(updatedRows);
            const stack = sigStackRef.current;
            const top = stack[stack.length - 1] ?? null;
            const prev = stack[stack.length - 2] ?? baselineSigRef.current;

            // 1) 동일 스냅샷이면 무시
            if (newSig === top) {
                onUnsavedChange?.(hist.hasChanges);
                onHasEditLogChange?.(hist.hasChanges);
                return;
            }

            // 2) 베이스라인으로 완전 복귀한 경우: 히스토리를 0으로 초기화
            if (newSig === baselineSigRef.current) {
                hist.reset(updatedRows);          // 내부 스택을 비우고 현재를 베이스라인으로
                stack.length = 0;                 // 우리 서명 스택도 비우기
                onUnsavedChange?.(false);         // 미저장 플래그 해제
                onHasEditLogChange?.(false);
                return;
            }

            // 3) 직전 단계로의 되돌림이면 undo로 처리(길이 -1처럼 보이게)
            if (newSig === prev) {
                hist.undo();      // 커서만 되돌리는 히스토리 구현이어도 OK
                stack.pop();      // 우리는 실제로 스택에서 하나 제거
                onUnsavedChange?.(hist.hasChanges);
                onHasEditLogChange?.(hist.hasChanges);
                return;
            }

            hist.commit(updatedRows);
            stack.push(newSig);
            onUnsavedChange?.(true);
            onHasEditLogChange?.(true);
        }, [hist, makeTab1Signature, onUnsavedChange]);

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
        }, [hist, setDataState, onUnsavedChange]);

        // 부모가 reload()를 부르면 GridData의 handleSearch를 실행할 수 있도록 ref에 최신 핸들러 보관
        useEffect(() => {
            latestCtxRef.current = { handleSearch };
        }, [handleSearch]);

        // 최초 로드 시 분석값 있는지 체크 
        useEffect(() => {
            if (reportedInitialAnalysisRef.current) return;
            // rows가 한 번이라도 로드되면 최초 보고로 간주
            if (Array.isArray(rows) && rows.length > 0) {
                onInitialAnalysisCount?.(analyzed);
                reportedInitialAnalysisRef.current = true;
            }
        }, [rows, onInitialAnalysisCount]);

        // lv3 필수값 마크를 행들의 __errors(Set)로 갱신
        const applyRequiredMarksLv3 = useCallback((rows = []) => {
            return (rows || []).map(r => {
                const need = r.__pendingDelete !== true && String(r?.lv3 ?? '').trim() === '';

                // __errors 갱신
                const nextErrs = new Set(r.__errors ?? []);
                if (need) nextErrs.add('lv3'); else nextErrs.delete('lv3');

                // __errorKinds 갱신 (배지 라벨 표시용)
                const nextKinds = { ...(r.__errorKinds ?? {}) };
                if (need) nextKinds.lv3 = 'required'; else delete nextKinds.lv3;

                const base = nextErrs.size ? { ...r, __errors: nextErrs } : (() => {
                    if (!r.__errors) return r;
                    const { __errors, ...rest } = r;
                    return rest;
                })();

                return Object.keys(nextKinds).length ? { ...base, __errorKinds: nextKinds } : (() => {
                    const { __errorKinds, ...rest } = base;
                    return rest;
                })();
            });
        }, []);

        const buildSelectedMapFromRows = useCallback((rows = []) => {
            const next = {};
            for (const r of rows) {
                const k = getKey(r);
                if (!k) continue;
                if (String(r?.recheckyn ?? '').toLowerCase() === 'y') next[k] = true;
            }
            return next;
        }, [getKey]);

        // 자동 동기화 시에는 미저장 플래그/히스토리 커밋 안 나가게 가드
        const applySelectedFromRows = useCallback((rows = []) => {
            suppressUnsavedSelectionRef.current = true;
            setSelectedState(buildSelectedMapFromRows(rows));
            suppressUnsavedSelectionRef.current = false;
        }, [setSelectedState, buildSelectedMapFromRows]);

        const total = rows.length;  //총 갯수
        const analyzed = rows.filter(r => (r.lv3 ?? '').trim() !== '').length;  //분석값
        const updatedAt = rows[0]?.update_date ?? '-';  //업데이트 날짜
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
                                    (r.fixed_key != null && r.cid != null)
                                        ? `${String(r.fixed_key)}::${String(r.cid)}`
                                        : `__tmp__${Date.now()}__${i}__${Math.random()}`
                            }
                    ),
                }));
            }
        }, [dataState?.data, setDataState]);

        const setSelectedStateGuarded = useCallback((next) => {
            // (A) 단일 토글이면 "현재 lv3 셀 선택집합" 전체로 확장
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
                    if (changed) {
                        commitSmart(updated);
                        return { ...prevDS, data: updated };
                    }
                    return prevDS;
                });
                return maybeBatched;
            });
        }, [setSelectedState, setDataState, lv3SelKeys, getKey, commitSmart]);

        useLayoutEffect(() => {
            if (!rows.length) return;
            if (!shouldAutoApplySelectionRef.current) return; // 1회만 동작
            if (rows.some(r => !r?.__rowKey)) return;

            // recheckyn 정규화 + 키 일치
            const nextSelected = {};
            for (const r of rows) {
                const yn = String(r?.recheckyn ?? "").trim().toLowerCase();
                if (yn === "y") {
                    const k = getKey(r);         // 반드시 idGetter(row)와 동일한 키
                    if (k != null) nextSelected[k] = true;
                }
            }
            // 검증 체크 박스 느림 이슈로 인한 수정사항 
            const isSame = (() => {
                const a = selectedState || {};
                const b = nextSelected || {};
                const aKeys = Object.keys(a);
                const bKeys = Object.keys(b);
                if (aKeys.length !== bKeys.length) return false;
                for (const k of aKeys) if (!!a[k] !== !!b[k]) return false;
                return true;
            })();
            if (isSame) return; // [추가] 플래그 유지 → 이후 실제 데이터 들어오면 다시 시도

            /* 즉시 적용(첫 페인트 전) */
            suppressUnsavedSelectionRef.current = true;   // 미저장 X
            setSelectedState(nextSelected);
            suppressUnsavedSelectionRef.current = false;

            // 초기에 한 번만 돌고 종료 (비어있어도 끈다)
            shouldAutoApplySelectionRef.current = false;
        }, [rows, getKey, setSelectedState]);

        // 현재 데이터 인덱스 범위를 선택키로 변환
        const rangeToKeys = useCallback((a, b) => {
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            const s = new Set();
            for (let i = min; i <= max; i++) {
                const row = dataState?.data?.[i];
                if (row) s.add(getKey(row));
            }
            setLv3SelKeys(s);
        }, [dataState?.data, getKey])

        const lastCellRectRef = useRef(null); //마지막 셀의 DOM 좌표 기억용 ref 추가

        // 행에서 드래그/범위/토글 선택 시작
        const onRowMouseDown = useCallback((rowProps, e) => {
            if (e.target.closest(ROW_EXCLUSION_SELECTOR)) return; // 인터랙션 요소는 패스

            const idx = rowProps.dataIndex;
            const row = rowProps.dataItem;
            const key = getKey(row);

            lastFocusedKeyRef.current = key;
            setLv3EditorKey(null); // 새 동작 → 에디터 닫기

            // 이 행의 lv3 셀(td) 위치를 찾아 앵커로 기억(드롭다운 위치 계산용)
            const td = document.querySelector(`[data-lv3-key="${String(key)}"]`);
            if (td) {
                lastCellElRef.current = td;
                lastCellRectRef.current = td.getBoundingClientRect();
            }

            //  Ctrl/Shift 없이 "이미 선택된 행"을 클릭하면 선택 유지(리셋 금지)
            if (!e.shiftKey && !e.ctrlKey && !e.metaKey && lv3SelKeys.size > 0 && lv3SelKeys.has(key)) {
                anchorIndexRef.current = idx;
                lastIndexRef.current = idx;
                // 드래그 시작/리셋 안 함
                return;
            }

            if (e.shiftKey && anchorIndexRef.current != null) {
                selectionModeRef.current = 'range';
                rangeToKeys(anchorIndexRef.current, idx);
                lastIndexRef.current = idx;
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                selectionModeRef.current = 'toggle';
                /* CTRL 토글 시에도 마지막 인덱스/앵커 최신화 (Enter 직후 사용됨) */
                anchorIndexRef.current = idx;
                lastIndexRef.current = idx;

                setLv3SelKeys(prev => {
                    const next = new Set(prev);
                    next.has(key) ? next.delete(key) : next.add(key);
                    return next;
                });
                // Kendo의 단일선택/리셋 기본 동작 차단 (행 클릭 시 선택 유지)
                e.preventDefault();
                e.stopPropagation();
                suppressNextClickRef.current = true; //Ctrl 토글 후 Kendo 기본 click 한 번 차단
                return;
            }

            // 기본: 드래그 시작
            selectionModeRef.current = 'drag';
            draggingRef.current = true;
            setIsDragging(true);
            anchorIndexRef.current = idx;
            lastIndexRef.current = idx;
            setLv3SelKeys(new Set([key]));
        }, [getKey, rangeToKeys]);

        // 드래그 중 행 위로 진입할 때 범위 갱신
        const onRowMouseEnter = useCallback((rowProps, e) => {
            if (!draggingRef.current || anchorIndexRef.current == null) return;

            const idx = rowProps.dataIndex;
            lastIndexRef.current = idx;
            rangeToKeys(anchorIndexRef.current, idx);

            // 지나간 행의 lv3 셀 위치를 계속 최신화(나중에 드롭다운 열 위치 정확도 ↑)
            const key = getKey(rowProps.dataItem);
            const td = document.querySelector(`[data-lv3-key="${String(key)}"]`);
            if (td) lastCellRectRef.current = td.getBoundingClientRect();
        }, [rangeToKeys, getKey]);

        // 열기 가드
        const openLv3EditorAtKey = useCallback((targetKey) => {
            if (!targetKey) return;
            if (Date.now() - justClosedAtRef.current < 80) return;
            if (lv3EditorKey === targetKey) return;

            // 항상 DOM에서 대상 셀을 찾아 anchor & rect 먼저 세팅
            const sel = `[data-lv3-key="${String(targetKey)}"]`;
            const el = document.querySelector(sel);
            if (el) {
                lv3AnchorElRef.current = el;
                const r = el.getBoundingClientRect();
                setLv3AnchorRect({ top: r.top, left: r.left, width: r.width, height: r.height });
            }
            justOpenedAtRef.current = Date.now(); // 오픈 직후 닫힘 가드 시작
            setLv3EditorKey(targetKey); // 에디터 키 세팅
        }, [lv3EditorKey]);

        // mouseup(드래그 종료): 자동으로 에디터 열지 않음 (중복 오픈 방지)
        useEffect(() => {
            const end = () => {
                if (!draggingRef.current) return;
                draggingRef.current = false;
                // 드래그/범위 선택 상태만 종료. 자동 오픈은 하지 않음
                selectionModeRef.current = null;
                setIsDragging(false);
            };
            window.addEventListener('mouseup', end);
            return () => window.removeEventListener('mouseup', end);
        }, []);

        // 최신 값들을 ref에 동기화 (렌더마다 가벼운 할당만)
        useEffect(() => {
            keyHandlerStateRef.current = {
                lv3SelKeys,
                lv3EditorKey,
                data: dataState?.data,
                getKey,
                openLv3EditorAtKey,
                setLv3AnchorRect,
                // 아래 4개는 기존 로직에서 쓰던 포커스/인덱스/엘리먼트 정보
                lastFocusedKey: lastFocusedKeyRef.current,
                anchorIndex: anchorIndexRef.current,
                lastIndex: lastIndexRef.current,
                lastCellEl: lastCellElRef.current,
                lastCellRect: lastCellRectRef.current,
            };
        }, [lv3SelKeys, lv3EditorKey, dataState?.data, getKey, openLv3EditorAtKey, setLv3AnchorRect]);

        // 전역 Enter 리스너: 마운트 시 1회 등록 (최신 값은 keyHandlerStateRef로 접근)
        useEffect(() => {
            const onKey = (e) => {
                if (e.key !== 'Enter') return;
                const tag = document.activeElement?.tagName?.toLowerCase();
                if (['input', 'select', 'textarea'].includes(tag)) return;

                const s = keyHandlerStateRef.current;
                if (!s || s.lv3EditorKey != null) return;

                // 타겟 키 결정: 선택영역 마지막 인덱스 우선, 없으면 마지막 포커스
                //1) lastIndex/anchorIndex 우선
                //2) 없으면 마지막 포커스
                //3) 그래도 없으면 선택집합(lv3SelKeys)의 마지막 요소 사용 */
                const i = s.lastIndex ?? s.anchorIndex;
                let targetKey = null;
                if (i != null && s.data?.[i]) {
                    targetKey = s.getKey(s.data[i]);
                } else if (s.lastFocusedKey) {
                    targetKey = s.lastFocusedKey;
                } else if (s.lv3SelKeys && s.lv3SelKeys.size > 0) {
                    // Set → 배열 변환 뒤 마지막 요소 사용
                    const arr = Array.from(s.lv3SelKeys);
                    targetKey = arr[arr.length - 1];
                }

                if (!targetKey) return;

                // 앵커 엘리먼트/좌표 보정
                let el = s.lastCellEl;
                if (!el || !document.body.contains(el)) {
                    el = document.querySelector(`[data-lv3-key="${String(targetKey)}"]`);
                }
                let rect = s.lastCellRect;
                if (el) rect = el.getBoundingClientRect();
                if (rect) {
                    s.setLv3AnchorRect({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                    });
                }

                // 다음 프레임에 오픈
                requestAnimationFrame(() => s.openLv3EditorAtKey(targetKey));
            };
            window.addEventListener('keydown', onKey, true);
            return () => window.removeEventListener('keydown', onKey, true);
        }, []);

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

        useEffect(() => {
            const onDocClick = (e) => {
                if (lv3EditorKey == null) return;
                // 오픈 직후 오동작 방지
                if (Date.now() - justOpenedAtRef.current < 350) return;
                const path = e.composedPath?.() || [];
                const isInside = path.some((el) => {
                    return el && el.nodeType === 1 && (
                        el.classList?.contains('lv3-editor') ||
                        el.classList?.contains('lv3-popup') ||
                        el.classList?.contains('lv3-opener') ||
                        el.classList?.contains('k-animation-container')
                    );
                });
                if (isInside) return;
                justClosedAtRef.current = Date.now();
                setLv3EditorKey(null);
                setLv3AnchorRect(null);
                clearLv3Selection();
                clearRowHighlight();
            };
            document.addEventListener('click', onDocClick); // 버블 단계
            return () => document.removeEventListener('click', onDocClick);
        }, [lv3EditorKey, clearLv3Selection, clearRowHighlight]);

        // 일괄 적용 (선택된 키들에 옵션 메타까지 모두 반영)
        const applyLv3To = useCallback((targetKeys, opt) => {
            const keySet = targetKeys instanceof Set ? targetKeys : new Set([].concat(targetKeys));
            const isPh = opt && (opt.__placeholder || String(opt.codeId).startsWith('__ph__'));
            onUnsavedChange?.(true);
            setDataState(prev => {
                const updated = prev.data.map(r =>
                    keySet.has(getKey(r))
                        ? {
                            ...r,
                            lv3: isPh ? (opt?.codeName ?? "") : (opt?.codeId ?? ""),
                            lv1: opt?.lv1 ?? "",
                            lv2: opt?.lv2 ?? "",
                            lv1code: r?.lv1code ?? "",
                            lv2code: r?.lv2code ?? "",
                            lv123code: opt?.lv123code ?? "",
                        }
                        : r
                );
                const marked = applyRequiredMarksLv3(updated);
                commitSmart(marked);
                return { ...prev, data: marked };
            });
        }, [setDataState, getKey, applyRequiredMarksLv3, commitSmart, onUnsavedChange]);

        useImperativeHandle(ref, () => ({
            applyLv3To
        }));
        /*----------소분류 드래그-------*/

        // 행 클릭 이벤트 → 해당 행만 inEdit=true
        const onRowClick = useCallback((e) => {
            const clickedKey = getKey(e.dataItem);
            setSelectedRowKey(clickedKey);

            setDataState(prev => ({
                ...prev,
                data: prev.data.map(r => ({
                    ...r,
                    inEdit: getKey(r) === clickedKey
                }))
            }));
        }, [getKey, setDataState]);

        // 셀 값 변경 → 해당 행의 해당 필드만 업데이트
        const onItemChange = useCallback((e) => {
            onUnsavedChange?.(true);

            setDataState((prev) => {
                const prevData = prev?.data ?? [];
                const idx = prevData.findIndex(r => getKey(r) === getKey(e.dataItem));
                if (idx === -1) return prev;

                const updatedRow = {
                    ...prevData[idx],
                    [e.field]: e.value,
                    inEdit: true,
                };

                const nextData = [...prevData];
                nextData[idx] = updatedRow;

                const marked = applyRequiredMarksLv3(nextData);

                // 변경된 행만 커밋
                // commitSmart([updatedRow]);
                commitSmart(marked);
                return { ...prev, data: marked };
            });
        }, [getKey, onUnsavedChange, applyRequiredMarksLv3, commitSmart]);

        // "min-gap" (비어있는 가장 작은 수) or "max+1"
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
            // default: max+1
            const max = nums.length ? nums[nums.length - 1] : 0;
            return String(max + 1);
        }, []);

        // 추가 버튼 이벤트
        const handleAddButton = useCallback((cellProps) => {
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

                const marked = applyRequiredMarksLv3(nextData);

                // 새로 추가된 행만 커밋
                // commitSmart([newRow]);
                commitSmart(marked);
                return { ...prev, data: marked };
            });
        }, [getKey, onUnsavedChange, setSelectedRowKey, getNextCid, applyRequiredMarksLv3, commitSmart]);


        // 클릭 행 
        const rowRender = useCallback((trEl, rowProps) => {
            const key = getKey(rowProps?.dataItem);
            const clicked = key === selectedRowKey;
            const selectedByBatch = lv3SelKeys.has(key);   // 행이 일괄 선택 대상이면
            const pending = rowProps?.dataItem?.__pendingDelete === true;

            // Kendo 기본 선택 클래스 제거(배경 겹침 방지)
            const base = (trEl.props.className || '')
                .replace(/\bk-selected\b/g, '')
                .replace(/\bk-state-selected\b/g, '');

            const cls = `${base} ${clicked ? 'row-clicked' : ''} ${selectedByBatch ? 'lv3-row-selected' : ''} ${pending ? 'row-pending-delete' : ''}`.trim();

            // Kendo가 붙여둔 원래 이벤트 핸들러 백업
            const orig = trEl.props;

            /* 선택된 상태에서 행을 일반 클릭하면(= Drag 아님, 수정키 없음) 해당 행의 lv3 셀 기준으로 DDL 오픈 */
            const handleRowClickOpenIfSelected = (e) => {
                // 체크박스나 그 래퍼를 누른 경우 → Kendo 기본 토글 유지
                if (e.target.closest(ROW_EXCLUSION_SELECTOR)) return;
                if (draggingRef.current) return;
                if (lv3SelKeys.size === 0 || e.shiftKey || e.ctrlKey || e.metaKey) return;
                // 오직 lv3 셀을 눌렀을 때만 개입
                const tdLv3 = e.target.closest('td[data-lv3-key]');
                if (!tdLv3) return;
                const k = getKey(rowProps.dataItem);
                // 포커스/인덱스/엘리먼트 최신화
                lastFocusedKeyRef.current = k;
                anchorIndexRef.current = rowProps.dataIndex;
                lastIndexRef.current = rowProps.dataIndex;

                lastCellElRef.current = tdLv3;
                lv3AnchorElRef.current = tdLv3;
                const r = tdLv3.getBoundingClientRect();
                setLv3AnchorRect({ top: r.top, left: r.left, width: r.width, height: r.height });
                openLv3EditorAtKey(k);
            };

            return React.cloneElement(trEl, {
                ...trEl.props,
                className: cls,
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
                    handleRowClickOpenIfSelected(e);
                    if (!e.defaultPrevented) trEl.props.onClick?.(e);
                },
            });
        }, [selectedRowKey, lv3SelKeys, getKey, onRowMouseDown, onRowMouseEnter]);

        // 같은 행에서 여는 경우(특히 추가행) 즉시 하이라이트 해제하지 않음 → 닫힐 때 정리
        useEffect(() => {
            if (lv3EditorKey == null) return;
            const editingRow = (dataState?.data || []).find(r => r.inEdit === true); // [추가]
            if (editingRow && getKey(editingRow) === lv3EditorKey) return;            // 같은 행이면 유지
            clearRowHighlight();
        }, [lv3EditorKey, clearRowHighlight, dataState?.data, getKey]);

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

        /* 저장: API 호출 */
        const saveChanges = useCallback(async () => {
            // 저장 전에 유효성 검사 (소분류 필수)
            const hasEmptyLv3 = rows
                .filter(r => r.__pendingDelete !== true)          // 보류 삭제 제외
                .some(r => String(r.lv3 || "").trim() === "");

            if (hasEmptyLv3) {
                setDataState(prev => ({ ...prev, data: applyRequiredMarksLv3(prev.data) }));
                focusFirstLv3ErrorCell();   // 에러 중 첫번째 셀로 포커스 이동
                modal.showErrorAlert("알림", "소분류 값은 필수입니다.");
                return false; // 저장 중단
            }

            // selected → recheckyn 반영 + 페이로드 생성
            const payload = buildSavePayload(rows.filter(r => r.__pendingDelete !== true), {   // 실제 저장 데이터만
                user: auth?.user?.userId || "",
                projectnum: projectnum,
                qnum: qnum,
                gb: "in",
            },
                { getKey, selectedState }
            );

            // 저장 API 호출
            try {
                const res = await optionSaveData.mutateAsync(payload);
                if (res?.success === "777") {
                    // modal.showAlert("알림", "저장되었습니다."); // 성공 팝업 표출
                    onSaved?.();
                    onUnsavedChange?.(false);
                    onHasEditLogChange?.(false);

                    setLv3EditorKey(null);
                    setLv3AnchorRect(null);
                    clearLv3Selection();
                    clearRowHighlight();

                    shouldAutoApplySelectionRef.current = true;   // 재조회 후 recheckyn 1회 자동복원
                    suppressUnsavedSelectionRef.current = true;   // 새 데이터 자리잡을 때까지 행 수정 금지
                    setSelectedStateGuarded({});                  // 선택맵 초기화

                    baselineAfterReloadRef.current = true;       // 다음 로드에서 베이스라인 리셋

                    // 화면에서 바로 없애기(낙관적): 보류삭제 행 제거 + 로컬플래그 제거
                    setDataState(prev => {
                        const kept = (prev.data || []).filter(r => r.__pendingDelete !== true);
                        const cleaned = stripLocalFlags(kept);
                        return { ...prev, data: cleaned };
                    });

                    // Kendo 그리드 강제 리마운트(가상화/재사용 캐시 끊기)
                    setGridEpoch(e => e + 1);

                    handleSearch();                              // 재조회
                    return true;
                } else {
                    modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다."); //오류 팝업 표출
                    return false; // 실패 시 그리드 상태 변경 안 함
                }
            } catch (err) {
                console.error(err);
                modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다."); //오류 팝업 표출
                return false; // 실패 시 그리드 상태 변경 안 함
            }
        }, [dataState?.data, selectedState, getKey, setSelectedStateGuarded, onSaved]);

        // 부모에서 호출할 수 있도록 ref에 연결
        saveChangesRef.current = saveChanges;
        const openedLv3DDLRef = useRef(null);
        // 드롭다운이 열리면(= lv3EditorKey가 생기면) DDL에 포커스
        useEffect(() => {
            if (lv3EditorKey != null) {
                // 다음 프레임에 포커스 (렌더 완료 보장)
                requestAnimationFrame(() => {
                    openedLv3DDLRef.current?.focus?.();
                    // 혹시 포커스가 안 잡히는 테마/버전이면 input으로 직접:
                    openedLv3DDLRef.current?.element
                        ?.querySelector?.('input')
                        ?.focus?.();
                });
            }
        }, [lv3EditorKey]);

        const gridRootRef = useRef(null); // KendoGrid 감싸는 div에 ref 달아 위치 기준 계산

        // 화면에 보이는 첫 번째 에러(lv3) 셀로 포커스(중앙 스크롤) → 필요 시 DDL 자동 오픈
        const focusFirstLv3ErrorCell = useCallback(() => {
            // setState 직후 렌더 보장용 두 번의 rAF
            requestAnimationFrame(() => requestAnimationFrame(() => {
                const root = gridRootRef.current || document;
                const td = root.querySelector('td.lv3-error'); // DOM 상 가장 위(첫번째)
                if (!td) return;
                td.focus({ preventScroll: false });
                td.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
                const key = td.getAttribute('data-lv3-key');
                if (key) openLv3EditorAtKey(key); // 원하면 주석 처리해도 됨(포커스만 이동)
            }));
        }, [openLv3EditorAtKey]);

        useEffect(() => {
            if (lv3EditorKey == null) return;

            const ensureAnchor = () => {
                // 1) 기존 ref가 아직 DOM에 연결되어 있으면 그걸 사용
                let el = lv3AnchorElRef.current;
                if (el && el.isConnected) return el;

                // 2) 리렌더 등으로 ref가 끊겼다면, data-attr로 현재 셀을 다시 찾기
                const sel = `[data-lv3-key="${String(lv3EditorKey)}"]`;
                el = document.querySelector(sel);
                if (el) {
                    lv3AnchorElRef.current = el;
                    return el;
                }
                return null; // 못 찾았지만, 여기서 "닫지"는 않음
            };

            const updatePos = () => {
                const el = ensureAnchor();
                if (!el) return; // 앵커를 잠깐 못 찾는 상황(리렌더 중 등)에서는 그냥 위치 갱신 스킵
                const r = el.getBoundingClientRect();
                setLv3AnchorRect({ top: r.top, left: r.left, width: r.width, height: r.height });
            };

            // 처음 한 번 보정
            updatePos();

            // 스크롤/리사이즈 시 위치만 갱신 (닫지 않음)
            window.addEventListener('scroll', updatePos, true);
            window.addEventListener('resize', updatePos, true);
            return () => {
                window.removeEventListener('scroll', updatePos, true);
                window.removeEventListener('resize', updatePos, true);
            };
        }, [lv3EditorKey]);

        // 옵션 증강: rows에만 있는 값은 placeholder(고유 codeId)로 추가
        const augmentedLv3Options = useMemo(() => {
            const base = lv3Options || [];
            const byName = new Map(base.map(o => [tl(o.codeName), o]));
            const out = [...base];

            for (const r of rows || []) {
                const name = r?.lv3;
                const key = tl(name);
                if (!key) continue;

                if (!byName.has(key)) {
                    let ph = lv3Cache.get(r);   // 이 row에 이미 캐시 있으면 재사용
                    if (!ph) {
                        ph = {
                            codeId: `__ph__${key}`,
                            codeName: name ?? "",
                            lv1: r?.lv1 ?? "",
                            lv2: r?.lv2 ?? "",
                            lv123code: r?.lv123code ?? "",
                            __placeholder: true,
                        };
                        lv3Cache.set(r, ph); // 캐시에 저장
                    }
                    byName.set(key, ph);
                    out.push(ph);
                }
            }
            return out;
        }, [lv3Options, rows]);

        // 빠른 조회용 맵
        const optByCodeId = useMemo(() => {
            const m = new Map();
            augmentedLv3Options.forEach(o => m.set(o.codeId, o));
            return m;
        }, [augmentedLv3Options]);

        const optByLv123 = useMemo(() => {
            const m = new Map();
            augmentedLv3Options.forEach(o => {
                const k = tl(o.lv123code);
                if (k) m.set(k, o);
            });
            return m;
        }, [augmentedLv3Options]);

        const optByName = useMemo(() => {
            const m = new Map();
            augmentedLv3Options.forEach(o => m.set(tl(o.codeName), o));
            return m;
        }, [augmentedLv3Options]);

        // 검증 체크박스 위치 고정시키기 위함 (임시)
        const anchorField = useMemo(() => {
            const vis = effectiveColumns.filter(c => c.show !== false);
            return vis.length >= 3 ? vis[vis.length - 3].field : undefined; // 항상 추가 왼쪽에
        }, [effectiveColumns]);

        // 삭제/취소 버튼 클릭
        const onClickDeleteCell = useCallback((cellProps) => {
            onUnsavedChange?.(true);

            const deletedRow = cellProps.dataItem;
            const deletedKey = getKey(deletedRow);

            setDataState((prev) => {
                const prevData = prev?.data ?? [];
                const nextData = prevData.filter(r => getKey(r) !== deletedKey);

                const marked = applyRequiredMarksLv3(nextData);

                // 삭제된 행만 커밋
                // commitSmart([deletedRow]);
                commitSmart(marked);
                return { ...prev, data: marked };
            });
        }, [getKey, onUnsavedChange, applyRequiredMarksLv3, commitSmart]);

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

        return (
            <Fragment>
                <div className="meta2">
                    <div className="row1">업데이트 날짜: {updatedAt}</div>
                    <div className="row2">
                        분석 <b>{analyzed}</b> / 검증 <b>{verified}</b> / 총 <b>{total}</b>
                    </div>
                </div>
                <div ref={gridRootRef} id="grid_01" className={`cmn_grid ${hasLv3CellSelection ? "lv3-cell-select" : ""} ${lv3EditorKey ? "lv3-dd-open" : ""} ${isDragging ? "is-dragging" : ""}`}>
                    <KendoGrid
                        scrollable="virtual"
                        rowHeight={38}
                        key={`lv-${lvCode}-${gridEpoch}`}
                        parentProps={{
                            data: dataForGridSorted,
                            dataItemKey: DATA_ITEM_KEY,      // "__rowKey"
                            editField,
                            onItemChange,
                            onRowClick,
                            selectedField: SELECTED_FIELD, // 체크박스 필드 지정 
                            selectedState,
                            setSelectedState: setSelectedStateGuarded,
                            idGetter: (r) => r.__rowKey,
                            multiSelect: true,
                            selectionColumnAfterField: anchorField, // 체크박스 선택 컬럼을 원하는 위치에 삽입 
                            linkRowClickToSelection: false, // 행 클릭과 체크박스 선택 연동X 
                            selectionHeaderTitle: "검증",   // 체크박스 헤더에 컬럼명 표출할 경우
                            rowRender,
                            useClientProcessing: true,
                            sortable: { mode: "multiple", allowUnsort: true },
                            filterable: true,
                            initialSort: mappedSort,
                            initialFilter: filter,
                            sortChange: ({ sort: next }) => {
                                const nextRaw = unmapSortFields(next, proxyField);
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
                                            const hasReqError = cellProps.dataItem?.__errors?.has?.('lv3');
                                            const labelKind = cellProps.dataItem?.__errorKinds?.lv3; // 'required' 예상
                                            const labelText = labelKind === 'required' ? '빈값' : '오류';
                                            const tdClasses = `${hasReqError ? "lv3-error cell-error" : ""}`.trim();
                                            // Enter 키 핸들러
                                            const handleKeyDown = (e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    e.stopPropagation();

                                                    let targetKey = null;
                                                    if (lv3SelKeys.size > 0) {
                                                        targetKey = Array.from(lv3SelKeys).pop(); // 여러개면 마지막 선택
                                                    } else {
                                                        targetKey = lastFocusedKeyRef.current;   // 아니면 마지막 포커스
                                                    }
                                                    if (!targetKey) return;
                                                    // 마지막 셀 위치로 앵커 세팅
                                                    if (!lv3AnchorElRef.current || !lv3AnchorElRef.current.isConnected) {
                                                        const el = document.querySelector(`[data-lv3-key="${String(targetKey)}"]`);
                                                        if (el) {
                                                            lv3AnchorElRef.current = el;
                                                            const r = el.getBoundingClientRect();
                                                            setLv3AnchorRect({ top: r.top, left: r.left, width: r.width, height: r.height });
                                                        }
                                                    } else {
                                                        // 기존 rect fallback
                                                        const rect = lastCellRectRef.current;
                                                        if (rect) {
                                                            setLv3AnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
                                                        }
                                                    }
                                                    // 열기
                                                    openLv3EditorAtKey(targetKey);
                                                }
                                            };

                                            return (
                                                <td
                                                    data-lv3-key={rowKey}
                                                    className={tdClasses}
                                                    tabIndex={0}
                                                    onKeyDown={handleKeyDown}
                                                    title={currentValue}
                                                >
                                                    <div
                                                        className="lv3-opener"
                                                        style={{ cursor: "pointer" }}
                                                        onMouseDown={(e) => e.stopPropagation()} // td 핸들러 막음
                                                        onClick={(e) => {
                                                            e.stopPropagation();

                                                            const td = e.currentTarget.closest('td');
                                                            const rect = td?.getBoundingClientRect?.();
                                                            if (rect) lastCellRectRef.current = rect;

                                                            // 포커스/인덱스 최신화(엔터로 열기 등)
                                                            lastFocusedKeyRef.current = rowKey;
                                                            anchorIndexRef.current = cellProps.dataIndex;
                                                            lastIndexRef.current = cellProps.dataIndex;

                                                            if (td) {
                                                                lastCellElRef.current = td;
                                                                lv3AnchorElRef.current = td;
                                                                const r = td.getBoundingClientRect();
                                                                setLv3AnchorRect({ top: r.top, left: r.left, width: r.width, height: r.height });
                                                            }
                                                            // Body 쪽 패널 열기 요청 추가
                                                            const selectedRows = (dataState?.data || []).filter(r => lv3SelKeys.has(getKey(r)));
                                                            onOpenLv3Panel?.(selectedRows, selectedRows.map(r => r.lv123code));
                                                        }}
                                                    >
                                                        <span className="lv3-display">{currentValue || "소분류 선택"}</span>
                                                    </div>
                                                    {/* 필수값 오류 배지 */}
                                                    {hasReqError && <span className="cell-error-badge">{labelText}</span>}
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
                                            const codeId = String(r?.lv123code ?? "").trim();
                                            const codeName = String(r?.lv3 ?? "").trim();
                                    
                                            // 패널에서 받아온 옵션 확인
                                            const matchedOpt = (lv3Options || []).find(o => String(o.codeName ?? "").trim() === codeName);
                                    
                                            return (
                                              <td style={{ textAlign: "center" }}>
                                                {/* case 3: 옵션 자체가 없음 → 코드 등록 버튼 */}
                                                {!matchedOpt && codeName ? (
                                                  <Button
                                                    className="btnM"
                                                    themeColor="primary"
                                                    onClick={() => openLv3EditorAtKey(getKey(r))}
                                                  >
                                                    코드 등록
                                                  </Button>
                                                ) : matchedOpt && codeId ? (
                                                  // case 1: 옵션 있고 codeId도 있으면 codeId 출력
                                                  <span title={codeId}>{codeId}</span>
                                                ) : (
                                                  // case 2: 옵션은 있는데 codeId는 없음 → 빈칸
                                                  null
                                                )}
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
    });

    return (
        <GridData
            dataItemKey={DATA_ITEM_KEY}
            searchMutation={optionEditData}
            selectedField={SELECTED_FIELD}
            multiSelect={true}
            editField={editField}
            menuTitle={MENU_TITLE}
            initialParams={{             /*초기파라미터 설정*/
                user: auth?.user?.userId || "",
                projectnum: projectnum,
                qnum: qnum,
                gb: "in",
            }}
            renderItem={(props) =>
                <GridRenderer
                    {...props}
                    hist={hist}
                    baselineDidRef={baselineDidRef}
                    baselineAfterReloadRef={baselineAfterReloadRef}
                    baselineSigRef={baselineSigRef}
                    sigStackRef={sigStackRef}
                    makeTab1Signature={makeTab1Signature}
                    ref={gridRef}
                />}

        />
    );
});

export default OptionSettingTab1;
