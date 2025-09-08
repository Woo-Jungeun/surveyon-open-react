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
import useUpdateHistory from "@/hooks/useUpdateHistory";

/**
 * 분석 > 그리드 영역 > 응답 데이터
 *
 * @author jewoo
 * @since 2025-08-11<br />
 */
const OptionSettingTab1 = forwardRef((props, ref) => {
    const lvCode = String(props.lvCode); // 분류 단계 코드
    const { onInitLvCode, onUnsavedChange, onSaved, persistedPrefs, onPrefsChange, onInitialAnalysisCount } = props;
    const modal = useContext(modalContext);
    const DATA_ITEM_KEY = "__rowKey";
    const MENU_TITLE = "응답 데이터";
    const SELECTED_FIELD = "selected";
    const { optionEditData, optionSaveData } = OptionSettingApi();
    const [editField] = useState("inEdit");

    const saveChangesRef = useRef(async () => false);   // 저장 로직 노출용
    const reportedLvcodeRef = useRef(false);
    const lv3AnchorElRef = useRef(null);   // 현재 드롭다운이 붙을 td 엘리먼트
    const lastCellElRef = useRef(null);    // 마지막으로 진입/클릭한 lv3 셀(td)
    const latestCtxRef = useRef(null);

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
        reload: () => latestCtxRef.current?.handleSearch?.(), // 재조회
    }));

    /**
     * 숨김처리 여부 allowHide (true/false)
     * 편집 가능 여부 editable(true/false)
    */
    const [columns, setColumns] = useState(() =>
        persistedPrefs?.columns ?? [
            // { field: "fixed_key", title: "키", show: false, editable: false },
            { field: "answer_origin", title: "원본 응답", show: true, editable: false, allowHide: false },
            { field: "cid", title: "멀티", show: true, editable: false, width: "100px", allowHide: false },
            { field: "answer", title: "클리닝 응답", show: true, editable: false, allowHide: false },
            { field: "lv1code", title: "대분류 코드", show: true, editable: false },
            { field: "lv1", title: "대분류", show: true, editable: false },
            { field: "lv2code", title: "중분류 코드", show: true, editable: false },
            { field: "lv2", title: "중분류", show: true, editable: false },
            { field: "lv123code", title: "소분류 코드", show: true, editable: false, allowHide: false },
            { field: "lv3", title: "소분류", show: true, editable: true, width: "200px", allowHide: false },
            { field: "sentiment", title: "sentiment", show: true, editable: true },
            { field: "add", title: "추가", show: true, editable: true, allowHide: false },
            { field: "delete", title: "삭제", show: true, editable: true, allowHide: false }
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
        optionEditData.mutateAsync({
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

    /*-----수정 로그 관련-----*/
    const makeTab1Signature = useCallback((rows = []) => {
        const acc = [];
        for (const r of rows ?? []) {
            const k = r?.__rowKey; if (!k) continue;
            const del = r?.__pendingDelete ? '1' : '0';
            const re = (String(r?.recheckyn ?? '').toLowerCase() === 'y') ? '1' : '0';
            const lv3 = String(r?.lv3 ?? '').trim();
            acc.push(`${k}:${del}:${re}:${lv3}`);
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
    const GridRenderer = (props) => {
        const { dataState, setDataState, selectedState, setSelectedState,
            idGetter, dataItemKey, handleSearch, hist, baselineDidRef, baselineAfterReloadRef,
            sigStackRef, makeTab1Signature,
        } = props;

        const rows = dataState?.data ?? [];
        const hasAllRowKeys = useMemo(() => (dataState?.data ?? []).every(r => !!r?.__rowKey),[dataState?.data]);
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

        useEffect(() => {
            const rowsNow = dataState?.data || [];
            if (!rowsNow.length || !hasAllRowKeys) return; 

            if (!baselineDidRef.current || baselineAfterReloadRef.current) {
                hist.reset(rowsNow);
                baselineDidRef.current = true;
                baselineAfterReloadRef.current = false;
                // 베이스라인/스택 초기화
                baselineSigRef.current = makeTab1Signature(rowsNow);
                sigStackRef.current = [];
                onUnsavedChange?.(false);
            }
        }, [dataState?.data, hasAllRowKeys, hist, makeTab1Signature, onUnsavedChange]);
        
        // 수정로그 commit 
        const commitSmart = useCallback((updatedRows) => {
            const newSig = makeTab1Signature(updatedRows);
            const stack = sigStackRef.current;
            const top = stack[stack.length - 1] ?? null;
            const prev = stack[stack.length - 2] ?? baselineSigRef.current;

            // 1) 동일 스냅샷이면 무시
            if (newSig === top) { onUnsavedChange?.(hist.hasChanges); return; }

            // 2) 베이스라인으로 완전 복귀한 경우: 히스토리를 0으로 초기화
            if (newSig === baselineSigRef.current) {
                hist.reset(updatedRows);          // 내부 스택을 비우고 현재를 베이스라인으로
                stack.length = 0;                 // 우리 서명 스택도 비우기
                onUnsavedChange?.(false);         // 미저장 플래그 해제
                return;
            }

            // 3) 직전 단계로의 되돌림이면 undo로 처리(길이 -1처럼 보이게)
            if (newSig === prev) {
                hist.undo();      // 커서만 되돌리는 히스토리 구현이어도 OK
                stack.pop();      // 우리는 실제로 스택에서 하나 제거
                onUnsavedChange?.(hist.hasChanges);
                return;
            }

            hist.commit(updatedRows);
            stack.push(newSig);
            onUnsavedChange?.(true);
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
                  onUnsavedChange?.(hist.hasChanges);
                }
                return;
              }
          
              // Redo: Ctrl/Cmd + Y  또는  Shift + Ctrl/Cmd + Z
              if ((e.ctrlKey || e.metaKey) && (key === "y" || (key === "z" && e.shiftKey))) {
                e.preventDefault();
                const snap = hist.redo?.();
                if (snap) {
                  setDataState((prev) => ({ ...prev, data: snap }));
                  onUnsavedChange?.(hist.hasChanges);
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

        // 키 가져오기 헬퍼 
        const getKey = useCallback((row) => row?.__rowKey, []);

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

                // 행의 recheckyn(필요시 selected 필드도) 즉시 동기화
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
                        // 스냅샷은 실제 변경이 있을 때만 푸시
                        commitSmart(updated);
                        return { ...prevDS, data: updated };
                    }
                    return prevDS; // 변경 없으면 그대로
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
        //}, [dataState?.data, getKey, setSelectedState, setDataState, selectedState]);

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
        const rowExclusionSelector = [
            // 우리 팝업/에디터
            '.lv3-popup', '.lv3-editor', '.lv3-opener', '.k-animation-container',
            // Kendo 입력류
            '.k-input', '.k-dropdownlist', '.k-button',
            // Kendo 선택컬럼/체크박스의 모든 가능 타깃
            '.k-selectioncheckbox', '.k-checkbox-cell',
            '.k-checkbox', '.k-checkbox-box', '.k-checkbox-wrap',
            'label.k-checkbox-label', 'label[for]',
            'input[type="checkbox"]', '[role="checkbox"]'
        ].join(',');

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

        // 바깥 클릭 닫기 이펙트
        useEffect(() => {
            const handleDocMouseDown = (e) => {
                if (lv3EditorKey == null) return;
                if (Date.now() - justOpenedAtRef.current < 120) return; // 오픈 직후 즉시 닫힘 방지
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
            setDataState(prev => {
                // 선택된 키들에 값 반영
                const updated = prev.data.map(r =>
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
                );

                // 필수값(오류) 마크를 먼저 적용한 스냅샷을 만든다
                const marked = applyRequiredMarksLv3(updated);
                // 되돌림 시 +1/-1 맞추기 위해 push 대신 commit 사용
                commitSmart(marked);
                // 상태 적용
                return { ...prev, data: marked };
            });
        }, [setDataState, getKey, applyRequiredMarksLv3, hist, onUnsavedChange]);
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
                data: (() => {
                    const nextRows = prev.data.map(row => getKey(row) === targetKey ? { ...row, [field]: value } : row);
                    commitSmart(nextRows);
                    return nextRows;
                })()
            }));
        }, [getKey, setDataState]);

        // 드롭다운 변경 핸들러 (선택 행만 갱신) 
        const onDropDownItemChange = useCallback((row, field, value) => {
            onUnsavedChange?.(true);
            const key = getKey(row);
            setDataState(prev => ({
                ...prev,
                data: (() => {
                    const nextRows = prev.data.map(r => (getKey(r) === key ? { ...r, [field]: value } : r));
                    commitSmart(nextRows);
                    return nextRows;
                })(),
            }));
        }, [getKey, setDataState]);

        const recomputeCidForGroup = useCallback((fk, data) => {
            // 1) 보류삭제 아닌 행만 모아서 정렬
            const alive = (data || [])
                .filter(r => r.fixed_key === fk && r.__pendingDelete !== true)
                .sort((a, b) => Number(a.cid) - Number(b.cid));

            // 2) 새 cid 매핑 (보류삭제 행은 기존 cid 유지)
            const newCidByRowKey = new Map();
            let i = 1;
            for (const r of alive) newCidByRowKey.set(getKey(r), String(i++));

            // 3) data에 반영
            return (data || []).map(r =>
                r.fixed_key === fk && newCidByRowKey.has(getKey(r))
                    ? { ...r, cid: newCidByRowKey.get(getKey(r)) }
                    : r
            );
        }, [getKey]);

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
                const nextCid = getNextCid(fk, prevData);

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
                    __isNew: true,
                    __rowKey: `${String(fk)}::${nextCid}::${Date.now()}::${Math.random()}`, // ← 고유키
                };

                // 클릭한 행 아래에 삽입
                const nextData = [...prevData];
                nextData.splice(idx + 1, 0, newRow);

                const recomputed = recomputeCidForGroup(fk, nextData);
                // 새 행은 lv3가 비어있으므로 즉시 필수값 마킹을 반영한 스냅샷으로 커밋
                const marked = applyRequiredMarksLv3(recomputed);
                commitSmart(marked);
                return { ...prev, data: marked };
            });
        }, [getKey, onUnsavedChange, setDataState, setSelectedRowKey, recomputeCidForGroup, applyRequiredMarksLv3, hist]);

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
                if (e.target.closest(rowExclusionSelector)) return;
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
                onMouseDown: (e) => { onRowMouseDown(rowProps, e); if (!e.defaultPrevented) trEl.props.onMouseDown?.(e); },
                onMouseEnter: (e) => { onRowMouseEnter(rowProps, e); if (!e.defaultPrevented) trEl.props.onMouseEnter?.(e); },
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

        // 클릭 하이라이트(색상) 제거: 선택된 행 key/편집상태 모두 해제
        const clearRowHighlight = useCallback(() => {
            setSelectedRowKey(null);
            setDataState(prev => ({
                ...prev,
                data: prev.data.map(r => (r.inEdit ? { ...r, inEdit: false } : r))
            }));
        }, [setDataState]);

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
                const res = await optionSaveData.mutateAsync(payload);
                if (res?.success === "777") {
                    // modal.showAlert("알림", "저장되었습니다."); // 성공 팝업 표출
                    onSaved?.(); // ← 미저장 플래그 해제 요청(부모)
                    onUnsavedChange?.(false);
                    shouldAutoApplySelectionRef.current = true;    // 재조회 시 recheckyn 기반 자동복원 다시 켜기
                    suppressUnsavedSelectionRef.current = true;    // 리셋은 미저장 X
                    setSelectedStateGuarded({});                    // 초기화
                    suppressUnsavedSelectionRef.current = false;
                    baselineAfterReloadRef.current = true;
                    handleSearch();                 // 재조회
                    return true; // 성공
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
            return vis.length >= 3 ? vis[vis.length - 3].field : undefined; // 항상 추가 왼쪽에
        }, [effectiveColumns]);

        // fixed_key 그룹별 유효 행 수 (보류삭제 제외)
        const groupSizeByFixedKey = useMemo(() => {
            const m = new Map();
            for (const r of (dataState?.data ?? [])) {
                const fk = r?.fixed_key;
                if (fk == null) continue;
                if (r.__pendingDelete === true) continue; // 보류 삭제 제외
                m.set(fk, (m.get(fk) ?? 0) + 1);
            }
            return m;
        }, [dataState?.data]);

        // 삭제/취소 버튼 클릭
        const onClickDeleteCell = useCallback((cellProps) => {
            onUnsavedChange?.(true);
            const row = cellProps.dataItem;
            const key = getKey(row);
            const fk = row?.fixed_key;

            // 새 행은 즉시 제거
            if (row.__isNew) {
                setDataState(prev => {
                    const kept = (prev.data || []).filter(r => getKey(r) !== key);
                    // 제거 후 cid 재배열(보류삭제 제외)
                    const recomputed = recomputeCidForGroup(fk, kept);
                    // 필수값 마킹을 적용한 최종 스냅샷
                    const marked = applyRequiredMarksLv3(recomputed);
                    // 되돌리기 카운트가 정확히 맞도록 최종 스냅샷을 커밋
                    commitSmart(marked);
                    return { ...prev, data: marked };
                });
                return;
            }

            // 기존 행은 보류삭제 토글
            setDataState(prev => {
                const toggled = (prev.data || []).map(r =>
                    getKey(r) === key
                        ? { ...r, __pendingDelete: !r.__pendingDelete, inEdit: false }
                        : r
                );

                // 토글 후 cid 재배열(보류삭제 제외)
                const recomputed = recomputeCidForGroup(fk, toggled);
                // 필수값 마킹을 적용한 최종 스냅샷
                const marked = applyRequiredMarksLv3(recomputed);
                // 히스토리에는 항상 최종 스냅샷을 커밋
                commitSmart(marked);
                return { ...prev, data: marked };
            });
        }, [getKey, setDataState, onUnsavedChange, recomputeCidForGroup, applyRequiredMarksLv3, hist]);
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
                        key={`lv-${lvCode}`}
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
                            sortChange: (e) => { setSort(e.sort); onPrefsChange?.({ sort: e.sort }); },
                            filterable: true,                                   // 필터 허용
                            filter,                               // controlled filter
                            filterChange: (e) => { setFilter(e.filter); onPrefsChange?.({ filter: e.filter }); },
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
                                            const hasReqError = cellProps.dataItem?.__errors?.has?.('lv3');
                                            const labelKind = cellProps.dataItem?.__errorKinds?.lv3; // 'required' 예상
                                            const labelText = labelKind === 'required' ? '빈값' : '오류';

                                            const tdStyle = hasReqError
                                                ? { ...baseStyle, boxShadow: "inset 0 0 0 2px #E74C3C" }
                                                : baseStyle;
                                            const tdClasses = `${isSelectedCell ? "lv3-selected" : ""} ${isActiveCell ? "lv3-active" : ""} ${hasReqError ? "lv3-error cell-error" : ""}`.trim();
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
                                                    className={tdClasses}
                                                    tabIndex={0}
                                                    onKeyDown={handleKeyDown}
                                                    style={tdStyle}
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
                                                    {/* 필수값 오류 배지 */}
                                                    {hasReqError && <span className="cell-error-badge">{labelText}</span>}
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
                                            const fk = row?.fixed_key;
                                            const isLastVisible = row.__pendingDelete !== true
                                                && Number(row?.cid) === (lastVisibleCidByFixedKey.get(fk) ?? -1);


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
                                    clearLv3Selection();        // 셀 강조 제거
                                    clearRowHighlight();           // 수정 완료 시 하이라이트 해제
                                    setLv3EditorKey(null);
                                    setLv3AnchorRect(null);
                                }}
                                onClose={() => {
                                    clearLv3Selection();        // 셀 강조 제거
                                    clearRowHighlight();           // 수정 완료 시 하이라이트 해제
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
            searchMutation={optionEditData}
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
            renderItem={(props) =>
                <GridRenderer
                    {...props}
                    hist={hist}
                    baselineDidRef={baselineDidRef}
                    baselineAfterReloadRef={baselineAfterReloadRef}
                    baselineSigRef={baselineSigRef}
                    sigStackRef={sigStackRef}
                    makeTab1Signature={makeTab1Signature}
                />}

        />
    );
});

export default OptionSettingTab1;
