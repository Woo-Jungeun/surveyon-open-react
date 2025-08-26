import React, { Fragment, useEffect, useState, useRef, useCallback, useMemo, useContext, forwardRef, useImperativeHandle, useLayoutEffect } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { Button } from "@progress/kendo-react-buttons";
import CustomDropDownList from "@/components/kendo/CustomDropDownList.jsx";
import "@/components/app/optionSetting/OptionSetting.css";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { modalContext } from "@/components/common/Modal.jsx";

/**
 * 분석 > 그리드 영역 > 응답 데이터
 *
 * @author jewoo
 * @since 2025-08-11<br />
 */
const OptionSettingTab1 = forwardRef((props, ref) => {
    const lvCode = String(props.lvCode); // 분류 단계 코드
    const { onInitLvCode, onUnsavedChange, onSaved, persistedPrefs, onPrefsChange } = props;
    const modal = useContext(modalContext);
    const DATA_ITEM_KEY = "__rowKey";
    const MENU_TITLE = "응답 데이터";
    const SELECTED_FIELD = "selected";
    const { getGridData, saveGridData } = OptionSettingApi();
    const [editField] = useState("inEdit");

    const saveChangesRef = useRef(() => { });   // 저장 로직 노출용
    const reportedLvcodeRef = useRef(false);
    const lv3AnchorElRef = useRef(null);   // 현재 드롭다운이 붙을 td 엘리먼트
    const lastCellElRef = useRef(null);    // 마지막으로 진입/클릭한 lv3 셀(td)

    /**
     * rows: 그리드 행 배열(dataState.data)
     * opts: { key, user, projectnum, qnum, gb }  // API
     */
    // YYYY-MM-DD HH:mm:ss
    const formatNow = (d = new Date()) => {
        const p = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    };

    // 부모(OptionSettingBody.jsx) 에게 노출
    useImperativeHandle(ref, () => ({
        saveChanges: () => saveChangesRef.current(),   // 부모 저장 버튼이 호출
    }));

    /**
     * 숨김처리 여부 allowHide (true/false)
     * 편집 가능 여부 editable(true/false)
    */
    const [columns, setColumns] = useState(() =>
        persistedPrefs?.columns ?? [
            { field: "fixed_key", title: "키", show: true, editable: false },
            { field: "cid", title: "멀티", show: true, editable: false, width: "100px", allowHide: false },
            { field: "answer_origin", title: "원본내용", show: true, editable: false },
            { field: "answer", title: "응답내용", show: true, editable: false, allowHide: false },
            { field: "lv1code", title: "대분류 코드", show: true, editable: false },
            { field: "lv1", title: "대분류", show: true, editable: false },
            { field: "lv2code", title: "중분류 코드", show: true, editable: false },
            { field: "lv2", title: "중분류", show: true, editable: false },
            { field: "lv123code", title: "소분류 코드", show: true, editable: false, allowHide: false },
            { field: "lv3", title: "소분류", show: true, editable: true, width: "200px", allowHide: false },
            { field: "sentiment", title: "sentiment", show: true, editable: true },
            { field: "add", title: "추가", show: true, editable: true, allowHide: false }
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

    // 변경시 부모에 저장 (딜레이 없이 즉시 패치)
    useEffect(() => { onPrefsChange?.({ sort }); }, [sort]);
    useEffect(() => { onPrefsChange?.({ filter }); }, [filter]);

    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = (menuProps) => (
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
                onUnsavedChange?.(true); // ← 사용자 설정 변경은 저장 대상
            }}
            filter={filter}
            onFilterChange={(e) => {
                setFilter(e);
                onUnsavedChange?.(true); // ← 필터 변경도 저장 대상
            }}
        />
    );

    // 검증 드롭다운 데이터
    const sentimentOptions = useMemo(
        () => [
            { codeId: "neutral", codeName: "neutral" },
            { codeId: "positive", codeName: "positive" },
            { codeId: "negative", codeName: "negative" }
        ], []);

    // 소분류 드롭다운 데이터 + 메타 기능
    const [lv3Options, setLv3Options] = useState([]);
    useEffect(() => {
        getGridData.mutateAsync({
            params: {
                key: "",
                user: "syhong",
                projectnum: "q250089uk",
                qnum: "Z1",
                gb: "lb",
            }
        }).then((res) => {
            const seen = new Set();
            const list =
                (res?.resultjson ?? []).reduce((acc, r) => {
                    const lv3 = (r?.lv3 ?? "").trim();
                    if (!lv3 || seen.has(lv3)) return acc;
                    seen.add(lv3);

                    acc.push({
                        // DropDownList에서 쓰는 키/라벨
                        codeId: lv3,
                        codeName: lv3,
                        // 추가로 같이 들고 다닐 메타
                        lv1: r?.lv1 ?? "",
                        lv2: r?.lv2 ?? "",
                        lv123code: r?.lv123code ?? "",
                    });
                    return acc;
                }, []);
            setLv3Options(list);
            // 분류 단계 구분값 OptionSettingBody에 올림
            if (!reportedLvcodeRef.current && typeof onInitLvCode === "function") {
                const fetchedLv = String(res?.lvcode ?? res?.resultjson?.[0]?.lvcode ?? "").trim();
                if (["1", "2", "3"].includes(fetchedLv)) {
                    onInitLvCode(fetchedLv);
                    reportedLvcodeRef.current = true; // 다시 안 올리도록 고정
                }
            }
        }).catch(() => setLv3Options([]));
    }, []);

    /* 선택된 행 key */
    const [selectedRowKey, setSelectedRowKey] = useState(null);

    //grid rendering 
    const GridRenderer = (props) => {
        const {
            dataState,
            setDataState,
            selectedState,
            setSelectedState,
            idGetter,
            dataItemKey,
            handleSearch } = props;

        // 선택 변경 감지 억제 플래그 (setSelectedStateGuarded에서만 더티 관리)
        const suppressUnsavedSelectionRef = useRef(false);

        // 키 가져오기 헬퍼 
        const getKey = useCallback((row) => row?.__rowKey, []);

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

        // Kendo가 주는 setSelectedState를 감싸서
        //  1) 사용자 액션이면 onUnsavedChange(true)
        //  2) dataState.data의 recheckyn도 함께 동기화
        const setSelectedStateGuarded = useCallback((next) => {
            const computeNext = (prev) => (typeof next === "function" ? next(prev) : next || {});
            const apply = (nextMap) => {
                // 2-1) 그리드의 선택 상태 업데이트
                setSelectedState(nextMap);
                // 2-2) 행의 recheckyn 동기화
                const selectedKeys = new Set(Object.keys(nextMap).filter((k) => nextMap[k]));
                setDataState((prevDS) => ({
                    ...prevDS,
                    data: (prevDS?.data || []).map((r) => {
                        const k = getKey(r);
                        const checked = selectedKeys.has(k);
                        // 이미 동일하면 그대로 두기 (불필요 렌더 최소화)
                        if ((r?.recheckyn === "y") === checked) return r;
                        return { ...r, recheckyn: checked ? "y" : "" };
                    }),
                }));
            };
            if (!suppressUnsavedSelectionRef.current) {
                onUnsavedChange?.(true);
            }
            if (typeof next === "function") {
                // 함수형 업데이트
                setSelectedState((prev) => {
                    const nm = computeNext(prev);
                    apply(nm);
                    // setSelectedState는 이미 호출되었지만 리액트 배치 고려해 nm 반환
                    return nm;
                });
            } else {
                apply(next || {});
            }
        }, [setSelectedState, setDataState, getKey, onUnsavedChange]);

        const rows = dataState?.data ?? [];
        const total = rows.length;  //총 갯수
        const analyzed = rows.filter(r => (r.lv3 ?? '').trim() !== '').length;  //분석
        const verified = rows.filter(r => String(r.recheckyn).toLowerCase() === 'y').length;    //검증
        const updatedAt = rows[0]?.update_date ?? '-';  //업데이트 날짜
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
        const keyHandlerStateRef = useRef({}); // keydown 핸들러가 참조할 최신 상태 보관용 ref

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

            // 내부 초기화가 끝난 다음 "마지막에" 내가 세팅 (덮어쓰기 방지)
            const apply = () => {
                suppressUnsavedSelectionRef.current = true;   // 미저장 X
                setSelectedState(nextSelected);               // 원본 setter 그대로
                suppressUnsavedSelectionRef.current = false;
            };

            // 1) 마이크로태스크 → 2) 다음 프레임 → 3) 그 다음 프레임에서 적용
            Promise.resolve().then(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => apply());
                });
            });

            shouldAutoApplySelectionRef.current = false;
        }, [dataState?.data, getKey, setSelectedState, setDataState]);

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

        // tr 드래그 제외 대상(클릭해도 드래그로 취급하지 않음)
        const rowExclusionSelector =
            '.lv3-popup,.lv3-editor,.lv3-opener,.k-animation-container,.k-input,' +
            '.k-dropdownlist,.k-checkbox,.k-button,input,button,select,textarea';
        // 행에서 드래그/범위/토글 선택 시작
        const onRowMouseDown = useCallback((rowProps, e) => {
            if (e.target.closest(rowExclusionSelector)) return; // 인터랙션 요소는 패스

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

            if (e.shiftKey && anchorIndexRef.current != null) {
                selectionModeRef.current = 'range';
                rangeToKeys(anchorIndexRef.current, idx);
                lastIndexRef.current = idx;
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                selectionModeRef.current = 'toggle';
                setLv3SelKeys(prev => {
                    const next = new Set(prev);
                    next.has(key) ? next.delete(key) : next.add(key);
                    return next;
                });
                anchorIndexRef.current = idx;
                lastIndexRef.current = idx;
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

        // 마우스 다운: Ctrl(=toggle) / Shift(=range) / 그 외(=drag)
        const onLv3MouseDown = useCallback((idx, e, row) => {
            if (e.target.closest('.lv3-opener')) return;

            e.currentTarget?.focus();   // 클릭한 td에 포커스
            const key = getKey(row);
            lastFocusedKeyRef.current = key;   // 마지막 포커스 셀 기억
            setLv3EditorKey(null); // 새 동작 시작하면 에디터 닫기
            lastCellElRef.current = e.currentTarget;
            lastCellRectRef.current = e.currentTarget.getBoundingClientRect();// 클릭 시작한 셀의 위치도 기억

            if (e.shiftKey && anchorIndexRef.current != null) {
                selectionModeRef.current = 'range';
                rangeToKeys(anchorIndexRef.current, idx);
                lastIndexRef.current = idx;
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                selectionModeRef.current = 'toggle';
                setLv3SelKeys(prev => {
                    const next = new Set(prev);
                    next.has(key) ? next.delete(key) : next.add(key);
                    return next;
                });
                anchorIndexRef.current = idx;
                lastIndexRef.current = idx;
                return;
            }

            // 기본: 드래그
            selectionModeRef.current = 'drag';
            draggingRef.current = true;
            anchorIndexRef.current = idx;
            lastIndexRef.current = idx;
            setLv3SelKeys(new Set([key]));
        }, [getKey, rangeToKeys]);

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
            // 그런 다음 에디터 키 세팅
            setLv3EditorKey(targetKey);
        }, [lv3EditorKey]);
        // 드래그 중 셀 진입 → 범위 갱신
        const onLv3MouseEnter = useCallback((idx, e) => {
            if (!draggingRef.current || anchorIndexRef.current == null) return;
            lastIndexRef.current = idx;
            lastCellElRef.current = e.currentTarget;
            lastCellRectRef.current = e.currentTarget.getBoundingClientRect();   // 마지막 셀 좌표 갱신
            rangeToKeys(anchorIndexRef.current, idx);
        }, [rangeToKeys]);

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
                const i = s.lastIndex ?? s.anchorIndex;
                let targetKey = null;
                if (s.lv3SelKeys && s.lv3SelKeys.size > 0 && i != null && s.data?.[i]) {
                    targetKey = s.getKey(s.data[i]);
                } else {
                    targetKey = s.lastFocusedKey;
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

        // 바깥 클릭 닫기 이펙트
        useEffect(() => {
            const handleDocMouseDown = (e) => {
                if (lv3EditorKey == null) return;
                const t = e.target;
                if (t.closest('.lv3-editor') || t.closest('.lv3-popup') || t.closest('.lv3-opener') || t.closest('.k-animation-container')) return;
                justClosedAtRef.current = Date.now();
                setLv3EditorKey(null);
            };
            document.addEventListener('mousedown', handleDocMouseDown, true);
            return () => document.removeEventListener('mousedown', handleDocMouseDown, true);
        }, [lv3EditorKey]);

        // 일괄 적용 (선택된 키들에 옵션 메타까지 모두 반영)
        const applyLv3To = useCallback((targetKeys, opt) => {
            onUnsavedChange?.(true);
            setDataState((prev) => ({
                ...prev,
                data: prev.data.map((r) =>
                    targetKeys.has(getKey(r))
                        ? {
                            ...r,
                            lv3: opt?.codeId ?? "",
                            lv1: opt?.lv1 ?? "",
                            lv2: opt?.lv2 ?? "",
                            lv1code: r?.lv1code ?? "",
                            lv2code: r?.lv2code ?? "",
                            lv123code: opt?.lv123code ?? "",
                        }
                        : r
                ),
            }));
        }, [setDataState, getKey]);
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
            const { dataItem, field, value } = e;
            const targetKey = getKey(dataItem);

            setDataState(prev => ({
                ...prev,
                data: prev.data.map(row =>
                    getKey(row) === targetKey
                        ? { ...row, [field]: value }
                        : row
                )
            }));
        }, [getKey, setDataState]);

        // 드롭다운 변경 핸들러 (선택 행만 갱신) 
        const onDropDownItemChange = useCallback((row, field, value) => {
            onUnsavedChange?.(true);
            const key = getKey(row);
            setDataState(prev => ({
                ...prev,
                data: prev.data.map(r => (getKey(r) === key ? { ...r, [field]: value } : r)),
            }));
        }, [getKey, setDataState]);

        // 추가 버튼 이벤트
        const handleAddButton = useCallback((cellProps) => {
            onUnsavedChange?.(true);
            const clicked = cellProps.dataItem;
            const clickedKey = getKey(clicked);
            setSelectedRowKey(clickedKey);

            setDataState((prev) => {
                const prevData = prev?.data ?? [];
                const idx = prevData.findIndex(r => getKey(r) === clickedKey);
                if (idx === -1) return prev; // 대상 행 못찾으면 원본 유지

                // 같은 fixed_key 그룹 내에서 "현재 prev.data" 기준으로 max cid 계산
                const fk = clicked?.fixed_key;
                const curMax = prevData.reduce((m, r) => {
                    if (r.fixed_key !== fk) return m;
                    const n = Number(r.cid) || 0;
                    return n > m ? n : m;
                }, 0);
                const nextCid = String(curMax + 1); // 문자열로 저장(키 일관성)

                // 새 행 기본값
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
                    __rowKey: `${String(fk)}::${nextCid}::${Date.now()}::${Math.random()}`, // ← 고유키
                };

                // 클릭한 행 아래에 삽입
                const nextData = [...prevData];
                nextData.splice(idx + 1, 0, newRow);

                return { ...prev, data: nextData };
            });
        }, [getKey, onUnsavedChange, setDataState, setSelectedRowKey]);

        // 같은 fixed_key에서 가장 큰 cid 계산 => 추가 버튼 생성을 위해
        const maxCidByFixedKey = useMemo(() => {
            const m = new Map();
            for (const r of (dataState?.data ?? [])) {
                const fk = r?.fixed_key;
                const c = Number(r?.cid ?? -Infinity);
                if (fk == null) continue;
                if (!m.has(fk) || c > m.get(fk)) m.set(fk, c);
            }
            return m;
        }, [dataState?.data]);
        // 클릭 행 
        const rowRender = useCallback((trEl, rowProps) => {
            const key = getKey(rowProps?.dataItem);
            const clicked = key === selectedRowKey;
            const selectedByBatch = lv3SelKeys.has(key);   // 행이 일괄 선택 대상이면

            // Kendo 기본 선택 클래스 제거(배경 겹침 방지)
            const base = (trEl.props.className || '')
                .replace(/\bk-selected\b/g, '')
                .replace(/\bk-state-selected\b/g, '');

            const cls = `${base} ${clicked ? 'row-clicked' : ''} ${selectedByBatch ? 'lv3-row-selected' : ''}`.trim();

            return React.cloneElement(trEl, {
                ...trEl.props,
                className: cls,
                onMouseDown: (e) => onRowMouseDown(rowProps, e),   // tr 레벨 드래그/범위/토글
                onMouseEnter: (e) => onRowMouseEnter(rowProps, e),
            });
        }, [selectedRowKey, lv3SelKeys, getKey, onRowMouseDown, onRowMouseEnter]);

        // 클릭 하이라이트(색상) 제거: 선택된 행 key/편집상태 모두 해제
        const clearRowHighlight = useCallback(() => {
            setSelectedRowKey(null);
            setDataState(prev => ({
                ...prev,
                data: prev.data.map(r => (r.inEdit ? { ...r, inEdit: false } : r))
            }));
        }, [setDataState]);

        // 드롭다운을 열 때만(= 대표 셀이 정해졌을 때) 클릭 하이라이트 제거
        useEffect(() => {
            if (lv3EditorKey != null) {
                clearRowHighlight();
            }
        }, [lv3EditorKey, clearRowHighlight]);

        // 선택된 lv3 셀 존재 여부
        const hasLv3CellSelection = lv3SelKeys.size > 0;

        const buildSavePayload = (rows, opts, { getKey, selectedState = {} }) => {
            const {
                key = "",                // 응답자 토큰 (없으면 빈 문자열)
                user = "",               // 예: "syhong"
                projectnum = "",         // 예: "q250089uk"
                qnum = "",               // 예: "A2-2"
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
                key,
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
            // selected → recheckyn 반영 + 페이로드 생성
            const payload = buildSavePayload(rows, {
                key: "",                 // 있으면 채워 넣기
                user: "syhong",
                projectnum: "q250089uk",
                qnum: "Z1",
                gb: "in",
            },
                { getKey, selectedState }
            );

            // 저장 API 호출
            try {
                const res = await saveGridData.mutateAsync(payload);
                if (res?.success === "777") {
                    modal.showAlert("알림", "저장되었습니다."); // 성공 팝업 표출
                    onSaved?.(); // ← 미저장 플래그 해제 요청(부모)
                    shouldAutoApplySelectionRef.current = true;    // 재조회 시 recheckyn 기반 자동복원 다시 켜기
                    suppressUnsavedSelectionRef.current = true;    // 리셋은 미저장 X
                    setSelectedStateGuarded({});                    // 초기화
                    suppressUnsavedSelectionRef.current = false;
                    handleSearch();                 // 재조회
                } else {
                    modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다."); //오류 팝업 표출
                    return; // 실패 시 그리드 상태 변경 안 함
                }
            } catch (err) {
                console.error(err);
                modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다."); //오류 팝업 표출
                return; // 실패 시 그리드 상태 변경 안 함
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

        // 소분류 선택 해제
        const clearLv3Selection = useCallback(() => {
            setLv3SelKeys(new Set());        // 노란 선택 해제
            anchorIndexRef.current = null;   // 범위 시작점 초기화
            lastIndexRef.current = null;     // 마지막 인덱스 초기화
            lastCellRectRef.current = null;  // 마지막 셀 위치 초기화
            lastFocusedKeyRef.current = null;
            selectionModeRef.current = null; // 모드 초기화
        }, []);

        const lv3OptionMap = useMemo(() => new Map(lv3Options.map(o => [o.codeId, o])), [lv3Options]);

        // 검증 체크박스 위치 고정시키기 위함 (임시)
        const anchorField = useMemo(() => {
            const vis = effectiveColumns.filter(c => c.show !== false);
            return vis.length ? vis[vis.length - 2].field : undefined; // 항상 추가 왼쪽에
        }, [effectiveColumns]);

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
                        key={`lv-${lvCode}-${anchorField ?? 'none'}`}
                        parentProps={{
                            data: dataState?.data,
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
                            sortable: { mode: "multiple", allowUnsort: true }, // 다중 정렬
                            sort,                                 // controlled sort
                            sortChange: (e) => { setSort(e.sort); onUnsavedChange?.(true); },
                            filterable: true,                                   // 필터 허용
                            filter,                               // controlled filter
                            filterChange: (e) => { setFilter(e.filter); onUnsavedChange?.(true); },
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
                                            const isSelectedCell = lv3SelKeys.has(rowKey);
                                            const isActiveCell = lv3EditorKey === rowKey;
                                            const currentValue = cellProps.dataItem.lv3 ?? "";
                                            const selectedOption = lv3OptionMap.get(currentValue) || null;

                                            const baseStyle = {
                                                userSelect: "none",
                                                cursor: "default",
                                                outline: "none",
                                            };

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
                                                    ref={(el) => { if (isActiveCell) lv3AnchorElRef.current = el; }}
                                                    className={`${isSelectedCell ? "lv3-selected" : ""} ${isActiveCell ? "lv3-active" : ""}`}
                                                    tabIndex={0}
                                                    onKeyDown={handleKeyDown}
                                                    style={baseStyle}
                                                    title={currentValue}
                                                >
                                                    <div
                                                        className="lv3-opener"
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
                                                            openLv3EditorAtKey(rowKey);
                                                        }}
                                                    >
                                                        {/* 모양만 보여주는 DropDownList */}
                                                        <DropDownList
                                                            data={lv3Options}
                                                            dataItemKey="codeId"
                                                            textField="codeName"
                                                            value={selectedOption}
                                                            placeholder="소분류 선택"
                                                            tabIndex={-1}
                                                            style={{ pointerEvents: "none", width: "100%" }}
                                                        />
                                                    </div>
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
                                        field="sentiment"
                                        title={c.title}
                                        width={c.width}
                                        columnMenu={columnMenu}
                                        cell={(cellProps) => {
                                            const rowKey = getKey(cellProps.dataItem);                 // 합성키/단일키 공통
                                            const selectedOption =
                                                sentimentOptions.find(o => o.codeId === (cellProps.dataItem.sentiment ?? "")) ?? null;
                                            return (
                                                <td>
                                                    <CustomDropDownList
                                                        data={sentimentOptions}
                                                        dataItemKey={"codeId"}
                                                        textField={"codeName"}
                                                        value={selectedOption}
                                                        onChange={(e) => {
                                                            const chosen = e?.value ?? null;
                                                            onDropDownItemChange(cellProps.dataItem, "sentiment", chosen?.codeId ?? "");
                                                        }}
                                                    />
                                                </td>
                                            )
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
                                            const maxCid = maxCidByFixedKey.get(row?.fixed_key);
                                            const isLastForKey = Number(row?.cid) === maxCid;

                                            return (
                                                <td style={{ textAlign: "center" }}>
                                                    {isLastForKey && (
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
                    {lv3EditorKey != null && lv3AnchorRect && (
                        <div
                            className="lv3-editor lv3-overlay"
                            style={{
                                position: 'fixed',
                                top: lv3AnchorRect.top - 1,
                                left: lv3AnchorRect.left - 1,
                                width: lv3AnchorRect.width + 2,
                                height: lv3AnchorRect.height + 2,
                                zIndex: 9999
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <DropDownList
                                ref={openedLv3DDLRef}
                                opened={true}
                                data={lv3Options}
                                dataItemKey="codeId"
                                textField="codeName"
                                className="lv3-editor-ddl"      // 높이 전달용 클래스
                                style={{ width: '100%', height: '100%' }}
                                value={(() => {
                                    const current = (dataState?.data || []).find(r => getKey(r) === lv3EditorKey);
                                    const v = current?.lv3 ?? '';
                                    return lv3Options.find(o => o.codeId === v) ?? null;
                                })()}
                                popupSettings={{
                                    className: 'lv3-popup',
                                    // 팝업을 셀 아래에 촘촘하게 붙임
                                    anchorAlign: { vertical: 'bottom', horizontal: 'left' },
                                    popupAlign: { vertical: 'top', horizontal: 'left' }
                                }}
                                onChange={(e) => {
                                    const opt = e?.value;
                                    const targets = lv3SelKeys.size ? lv3SelKeys : new Set([lv3EditorKey]);
                                    applyLv3To(targets, opt);
                                    clearLv3Selection();        // 노란 선택(셀 강조) 제거
                                    setLv3EditorKey(null);
                                    setLv3AnchorRect(null);
                                }}
                                onClose={() => {
                                    clearLv3Selection();        // 노란 선택(셀 강조) 제거
                                    setLv3EditorKey(null);
                                    setLv3AnchorRect(null);
                                }}
                            />
                        </div>
                    )}
                </div>
            </Fragment>
        );
    }

    return (
        <GridData
            dataItemKey={DATA_ITEM_KEY}
            searchMutation={getGridData}
            selectedField={SELECTED_FIELD}
            multiSelect={true}
            editField={editField}
            menuTitle={MENU_TITLE}
            initialParams={{             /*초기파라미터 설정*/
                key: "",
                user: "syhong",
                projectnum: "q250089uk",
                qnum: "Z1",
                gb: "in",
            }}
            renderItem={(props) => <GridRenderer {...props} />}

        />
    );
});

export default OptionSettingTab1;
