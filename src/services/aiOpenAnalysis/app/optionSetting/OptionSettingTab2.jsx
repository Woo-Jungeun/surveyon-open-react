import React, { Fragment, useState, useRef, forwardRef, useImperativeHandle, useCallback, useContext, useMemo, useEffect, useLayoutEffect } from "react";
import { RotateCcw, Plus } from 'lucide-react';
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { OptionSettingApi } from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingApi.js";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { Button } from "@progress/kendo-react-buttons";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from "@/hooks/useUpdateHistory";
import { useSelector } from "react-redux";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { process } from "@progress/kendo-data-query";
import GridDataCount from "@/components/common/grid/GridDataCount";

const natKey = (v) => {
    if (v == null) return Number.NEGATIVE_INFINITY;
    const s = String(v).trim();
    return /^\d+$/.test(s) ? Number(s) : s.toLowerCase();
};

// 숫자처럼 정렬하고 싶은 필드
const NAT_FIELDS = ["lv1code", "lv2code", "lv123code"];

// rows에 __sort__* 필드를 붙이고, 원필드 → 프록시필드 맵을 리턴
const addSortProxies = (rows = []) => {
    const proxyField = {};
    const dataWithProxies = (rows || []).map((r) => {
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
/**
 * 분석 > 그리드 영역 > 보기 데이터
 *
 * @author jewoo
 * @since 2025-08-12<br />
 */
const OptionSettingTab2 = forwardRef((props, ref) => {
    const auth = useSelector((store) => store.auth);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const lvCode = String(props.lvCode); // 분류 단계 코드
    const { onUnsavedChange, onSaved, persistedPrefs, onPrefsChange, onHasEditLogChange, projectnum, qnum, qid, isLeftOpen } = props;
    const modal = useContext(modalContext);
    const DATA_ITEM_KEY = ["lv123code", "lv3"];
    // 스크롤 위치 저장용 ref
    const scrollTopRef = useRef(0);
    const scrollLeftRef = useRef(0);

    /**
     * 숨김처리 여부 allowHide (true/false)
     * 편집 가능 여부 editable(true/false)
    */
    const [columns, setColumns] = useState(() =>
        persistedPrefs?.columns ?? [
            { field: "no", title: "no", show: true, editable: false, width: "80px", allowHide: false },
            // { field: "qnum", title: "문번호", show: true, editable: false, width: "100px" },
            { field: "lv1code", title: "대분류 코드", show: true, width: "140px", allowHide: false },
            { field: "lv1", title: "대분류", show: true, width: "210px", allowHide: false },
            { field: "lv2code", title: "중분류 코드", show: true, width: "140px", allowHide: false },
            { field: "lv2", title: "중분류", show: true, width: "210px", allowHide: false },
            { field: "lv123code", title: "소분류 코드", show: true, allowHide: false, width: "140px" },
            { field: "lv3", title: "소분류", show: true, allowHide: false, width: "210px" },
            { field: "ex_sum", title: "집계현황", show: true, editable: false, allowHide: false, width: "150px" },
            { field: "ex_gubun", title: "보기유형", show: true, editable: false, allowHide: false, width: "150px" },
            { field: "delete", title: "삭제", show: true, editable: true, allowHide: false, width: "120px" },
        ]);

    // 단계별 강제 숨김 컬럼
    const forcedHidden = useMemo(() => {
        const s = new Set();
        if (lvCode === "1") { s.add("lv1"); s.add("lv1code"); s.add("lv2"); s.add("lv2code"); }
        else if (lvCode === "2") { s.add("lv1"); s.add("lv1code"); }
        return s;
    }, [lvCode]);

    // 단계 컬럼 집합 (대/중분류 코드/이름)
    const stageFields = useMemo(() =>
        new Set(["lv1", "lv1code", "lv2", "lv2code"]), []);

    // 렌더링용 값: 강제 규칙만 입혀서 사용(상태/부모는 건드리지 않음)
    const effectiveColumns = useMemo(() => {
        return columns.map(c => {
            if (forcedHidden.has(c.field)) {
                return { ...c, show: false, allowHide: false };
            }
            // 왼쪽 패널이 닫혀있으면 모든 단계에서 주요 컬럼 너비 제거
            if (!isLeftOpen && ["lv3", "lv2", "lv1"].includes(c.field)) {
                const { width, ...rest } = c;
                return rest;
            }
            // 왼쪽 패널이 열려있으면 1단계일 때만 소분류/보기유형 컬럼의 width 제거
            if (isLeftOpen && lvCode === "1" && ["lv3"].includes(c.field)) {
                const { width, ...rest } = c;
                return rest;
            }
            return c;
        });
    }, [columns, forcedHidden, lvCode, isLeftOpen]);

    /**
     * 단계 변경 시 컬럼 상태 정규화:
     * - 단계 규칙으로 숨겨야 하는 컬럼: 강제 show:false
     * - 그 외 단계 컬럼(stageFields)은, 예전에 저장된 show:false가 남아 있어도
     *   현재 단계에서 보여야 하면 show:true로 자동 복구
     */
    useEffect(() => {
        setColumns(prev => {
            let changed = false;
            const next = prev.map(c => {
                // 1) 단계상 강제 숨김
                if (forcedHidden.has(c.field)) {
                    if (c.show !== false || c.allowHide !== false) changed = true;
                    return { ...c, show: false, allowHide: false };
                }
                // 2) 단계 컬럼인데 현재는 숨김으로 저장돼 있으면 보이도록 복구
                if (stageFields.has(c.field) && c.show === false) {
                    changed = true;
                    return { ...c, show: true };
                }
                return c;
            });
            if (changed) onPrefsChange?.({ columns: next });
            return next;
        });
        // forcedHidden이 lvCode에 의존하므로 lvCode/forcedHidden/stageFields 변경 시 동작
    }, [lvCode, forcedHidden, stageFields, onPrefsChange]);

    // 단계(lvCode) 바뀔 때 히스토리/베이스라인 상태를 새로 시작하도록 강제 초기화
    useEffect(() => {
        baselineDidRef.current = false;
        baselineAfterReloadRef.current = false;
        baselineSigRef.current = '';
        sigStackRef.current = [];
    }, [lvCode]);

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
    ), [columns, forcedHidden, stageFields, onPrefsChange, filter]);

    const { optionEditData, optionSaveData, optionAnalysisStart } = OptionSettingApi();
    const [editField] = useState("inEdit");

    // GridData가 내려주는 최신 컨텍스트를 저장
    const latestCtxRef = useRef(null);
    const saveChangesRef = useRef(async () => false);   // 저장 로직 노출용

    // 부모(OptionSettingBody.jsx) 에게 노출
    useImperativeHandle(ref, () => ({
        saveChanges: () => saveChangesRef.current(),   // 부모 저장 버튼이 호출
        reload: () => latestCtxRef.current?.handleSearch?.(), // 재조회
    }));

    /*-----수정 로그 관련-----*/
    const makeTab2Signature = useCallback((rows = []) => {
        const fields = [
            "__pendingDelete", "lv1code", "lv1", "lv2code", "lv2",
            "lv123code", "lv3", "ex_gubun"
        ];
        const keyOfRow = (r) =>
            r?.__rowKey ??
            `${encodeURIComponent(String(r?.lv123code ?? ""))}__${encodeURIComponent(String(r?.no ?? ""))}`;
        const enc = (v) => String(v ?? "").trim();
        const acc = [];
        for (const r of rows ?? []) {
            const k = keyOfRow(r);
            const body = fields.map((f) => `${f}:${enc(r?.[f])}`).join(",");
            acc.push(`${k}|${body}`);
        }
        acc.sort();
        return acc.join("||");
    }, []);

    const hist = useUpdateHistory(`tab2:${lvCode}`, { max: 100, signature: makeTab2Signature, });
    const baselineDidRef = useRef(false);           // 베이스라인 이미 셋?
    const baselineAfterReloadRef = useRef(false);   // 저장 후 재조회 베이스라인 리셋 필요?
    const baselineSigRef = useRef('');   // 현재 베이스라인의 시그니처
    const sigStackRef = useRef([]);      // 베이스라인 이후 커밋들의 시그니처 스택
    /*-----수정 로그 관련-----*/

    //grid rendering 
    const GridRenderer = (props) => {
        const {
            dataState, setDataState, selectedState, setSelectedState, idGetter, dataItemKey, handleSearch,
            hist, baselineDidRef, baselineAfterReloadRef, baselineSigRef, sigStackRef, makeTab2Signature, scrollTopRef, scrollLeftRef,
            isLeftOpen
        } = props;

        const { dataWithProxies, proxyField } = useMemo(
            () => addSortProxies(dataState?.data || []),
            [dataState?.data]
        );

        const mappedSort = useMemo(
            () => (sort || []).map(s => ({ ...s, field: proxyField[s.field] ?? s.field })),
            [sort, proxyField]
        );
        const rememberScroll = useCallback(() => {
            const grid = document.querySelector("#grid_01 .k-grid-content, #grid_01 .k-grid-contents");
            if (grid) {
                scrollTopRef.current = grid.scrollTop;
                scrollLeftRef.current = grid.scrollLeft;
            }
        }, []);

        useLayoutEffect(() => {
            const grid = document.querySelector("#grid_01 .k-grid-content, #grid_01 .k-grid-contents");
            if (!grid) return;
            if (scrollTopRef.current > 0) {
                grid.scrollTop = scrollTopRef.current;
            }
            if (scrollLeftRef.current > 0) {
                grid.scrollLeft = scrollLeftRef.current;
            }
        }, [dataState?.data]);

        // 필터링된 데이터 개수 계산
        const filteredCount = useMemo(() => {
            const result = process(dataWithProxies, { filter });
            return result.total;
        }, [dataWithProxies, filter]);

        const COMPOSITE_KEY_FIELD = "__rowKey";  // 키값
        const getKey = useCallback((row) => row?.__rowKey ?? makeRowKey(row), []);
        // const qnum = dataState?.data?.[0]?.qnum ?? "";   // 문번호 저장 (행 추가 시 필요) -> 부모 prop 사용
        latestCtxRef.current = { dataState, setDataState, selectedState, idGetter, handleSearch };    // 최신 컨텍스트 저장

        // 행마다 __rowKey가 없으면 만들어서 주입 (lv123code + no 기반)
        useLayoutEffect(() => {
            const rows = dataState?.data ?? [];
            if (!rows.length) return;
            if (rows.some(r => !r?.__rowKey)) {
                setDataState(prev => ({
                    ...prev,
                    data: (prev?.data ?? []).map(r =>
                        r?.__rowKey ? r : { ...r, __rowKey: makeRowKey(r) }
                    ),
                }));
            }
        }, [dataState?.data, setDataState]);

        // 데이터가 로드되면 베이스라인/스택 초기화 (저장 후 재조회 포함)
        useEffect(() => {
            const rowsNow = dataState?.data || [];
            if (!rowsNow.length) return;
            if (!baselineDidRef.current || baselineAfterReloadRef.current) {
                hist.reset(rowsNow);
                baselineDidRef.current = true;
                baselineAfterReloadRef.current = false;
                baselineSigRef.current = makeTab2Signature(rowsNow);
                sigStackRef.current = [];
                onUnsavedChange?.(false);
                onHasEditLogChange?.(false);
            }
        }, [dataState?.data, hist, makeTab2Signature]);

        // 수정로그 commit 
        const commitSmart = useCallback((updatedRows) => {
            const newSig = makeTab2Signature(updatedRows);
            const stack = sigStackRef.current;
            const top = stack[stack.length - 1] ?? null;
            const prev = stack[stack.length - 2] ?? baselineSigRef.current;

            // 1) 동일 스냅샷이면 스택/더티 변화 없음
            if (newSig === top) {
                onUnsavedChange?.(stack.length > 0);
                onHasEditLogChange?.(stack.length > 0);
                return;
            }
            // 2) 베이스라인으로 완전 복귀
            if (newSig === baselineSigRef.current) {
                hist.reset(updatedRows);
                stack.length = 0;
                onUnsavedChange?.(false);
                onHasEditLogChange?.(false);
                return;
            }
            // 3) 직전 단계로의 되돌림(예: 삭제 → 취소)
            if (newSig === prev) {
                hist.undo();
                stack.pop(); // 스택에서 하나 제거
                onUnsavedChange?.(stack.length > 0); // 동기적으로 확정
                onHasEditLogChange?.(stack.length > 0);
                return;
            }
            // 4) 일반 커밋
            hist.commit(updatedRows);
            stack.push(newSig);
            onUnsavedChange?.(true);
            onHasEditLogChange?.(true);
        }, [hist, makeTab2Signature]);

        // 대분류/중분류 코드값 텍스트 매핑
        const buildMaps = (rows, codeField, textField) => {
            const codeToText = new Map(); // code -> text
            const textToCode = new Map(); // text(lower) -> code
            (rows || []).forEach(r => {
                const c = String(r?.[codeField] ?? "").trim();
                const tRaw = String(r?.[textField] ?? "").trim();
                const t = tRaw.toLowerCase();
                if (c && tRaw) {
                    if (!codeToText.has(c)) codeToText.set(c, tRaw);
                    if (!textToCode.has(t)) textToCode.set(t, c);
                }
            });
            return [codeToText, textToCode];
        };

        const [lv1CodeToText, lv1ToTextToCode] = useMemo(
            () => buildMaps(dataState?.data, "lv1code", "lv1"),
            [dataState?.data]
        );
        const [lv2CodeToText, lv2TextToCode] = useMemo(
            () => buildMaps(dataState?.data, "lv2code", "lv2"),
            [dataState?.data]
        );

        // 소분류코드(lv123code) 중복 찾기 (보류삭제(__pendingDelete) 행 제외)
        const findLv123Duplicates = useCallback((rows = []) => {
            const map = new Map(); // code -> [행번호...]
            (rows || []).forEach((r) => {
                if (r?.__pendingDelete === true) return; // 🔸중복 체크 대상에서 제외
                const code = String(r?.lv123code ?? "").trim();
                if (!code) return;
                const no = r?.no ?? "?";
                if (!map.has(code)) map.set(code, []);
                map.get(code).push(no);
            });
            const dups = [];
            map.forEach((nos, code) => {
                if (nos.length > 1) dups.push({ code, nos });
            });
            return dups;
        }, []);

        const gridRootRef = useRef(null);
        const [errorMarks, setErrorMarks] = useState(new Map());
        // 화면에 보이는 첫 번째 에러 셀로 포커스(+부드러운 스크롤)
        const focusFirstErrorCell = useCallback(() => {
            // setState → 페인트 이후를 보장하기 위해 rAF 2번
            requestAnimationFrame(() => requestAnimationFrame(() => {
                const root = gridRootRef.current || document;
                const td = root.querySelector('td.cell-error');
                if (!td) return;
                if (!td.hasAttribute('tabindex')) td.setAttribute('tabindex', '0');
                td.focus({ preventScroll: false });
                td.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
            }));
        }, []);

        // ["lv123code","lv3"] 기준
        const makeRowKey = (row) =>
            [row?.lv123code ?? "", row?.lv3 ?? ""]
                .map(v => encodeURIComponent(String(v)))
                .join("__");

        // 각 행의 고유키를 계산(서버키 없을 때 __rowKey → 없으면 makeRowKey로 대체)
        const keyOf = useCallback((row) => row?.__rowKey || makeRowKey(row), []);

        // 현재 rows 기준으로 lv123code 중복 셀만 __errors에 반영
        const applyLiveDupMarks = useCallback((rows = []) => {
            // 대상 키 집합 계산
            const eligible = rows.filter(r =>
                r?.__pendingDelete !== true &&
                r?.ex_gubun !== "survey" &&
                String(r?.lv123code ?? "").trim() !== ""
            );
            const byCode = new Map();
            eligible.forEach(r => {
                const code = String(r.lv123code).trim().toLowerCase();
                const key = keyOf(r);
                const set = byCode.get(code) ?? new Set();
                set.add(key);
                byCode.set(code, set);
            });
            const dupKeys = new Set();
            byCode.forEach(set => { if (set.size > 1) set.forEach(k => dupKeys.add(k)); });

            return rows.map(r => {
                const k = keyOf(r);
                const hadErr = !!r.__errors?.has?.("lv123code");
                const willErr = dupKeys.has(k);
                const curKinds = r.__errorKinds ?? {};
                const hadKind = curKinds.lv123code === "dup";

                // 변화 없음 → 원래 객체 그대로 반환 (포커스/에디터 보존에 매우 중요!)
                if (hadErr === willErr && hadKind === willErr) return r;

                // 변화가 있는 행만 복제해서 수정
                const errs = new Set(r.__errors ?? []);
                const kinds = { ...curKinds };
                if (willErr) {
                    errs.add("lv123code");
                    kinds.lv123code = "dup";
                } else {
                    errs.delete("lv123code");
                    delete kinds.lv123code;
                }
                const next = { ...r };
                next.__errors = errs.size ? errs : undefined;
                next.__errorKinds = Object.keys(kinds).length ? kinds : undefined;
                return next;
            });
        }, [keyOf]);

        const pendingTypingRef = useRef(false); // 사용자가 셀에 입력 중인지 여부를 추적하는 ref
        const debounceTimerRef = useRef(null); // 디바운스 타이머 id를 저장하는 ref

        // 타이핑 중 변경된 데이터를 실제 state에 반영하고 중복 마킹 + 히스토리 커밋까지 수행하는 함수
        const flushTyping = useCallback(() => {
            if (!latestCtxRef.current) return;
            const rowsNow = latestCtxRef.current.dataState?.data || [];
            // 중복마크 계산
            const withDup = applyLiveDupMarks(rowsNow);
            // 변경이 있으면 반영
            if (withDup !== rowsNow) {
                latestCtxRef.current.setDataState(prev => ({ ...prev, data: withDup }));
            }
            // 히스토리 커밋
            commitSmart(withDup);
            // 더 이상 대기중인 타이핑 없음 표시
            pendingTypingRef.current = false;
        }, [applyLiveDupMarks]);

        // flushTyping을 일정 시간(1000ms) 지연 실행하기 위한 스케줄 함수
        // 사용자가 연속으로 입력할 때 불필요하게 매번 커밋되는 걸 방지 (디바운스)
        const scheduleFlush = useCallback(() => {
            pendingTypingRef.current = true;     // 기존 타이머 있으면 취소
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);  // 새 타이머 설정 → 1000ms 후 flushTyping 실행
            debounceTimerRef.current = setTimeout(flushTyping, 1000);
        }, [flushTyping]);

        const flushNow = useCallback(() => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
            flushTyping(); // -> commitSmart 호출됨
        }, [flushTyping]);

        //ctrl+z, ctrl+y
        useEffect(() => {
            const onKey = (e) => {
                const key = e.key?.toLowerCase?.();
                if (!key) return;

                const t = e.target;
                const isEditable =
                    t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
                if (isEditable) return;

                // Ctrl/Cmd + Z (Undo)
                if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) {
                    e.preventDefault();
                    flushNow();

                    const snap = hist.undo();
                    if (Array.isArray(snap)) {
                        const curLen = latestCtxRef.current?.dataState?.data?.length ?? 0;
                        // 안전장치: 현재 데이터가 있는데 빈 스냅샷으로 되돌리려 하면 무시
                        if (snap.length === 0 && curLen > 0) return;

                        setDataState((prev) => ({ ...prev, data: snap }));
                        const dirty = makeTab2Signature(snap) !== baselineSigRef.current;
                        onUnsavedChange?.(dirty);
                        onHasEditLogChange?.(dirty);
                    }
                    return;
                }

                // Ctrl/Cmd + Y  또는 Shift + Ctrl/Cmd + Z (Redo)
                if ((e.ctrlKey || e.metaKey) && (key === "y" || (key === "z" && e.shiftKey))) {
                    e.preventDefault();
                    flushNow();

                    const snap = hist.redo?.();
                    if (Array.isArray(snap)) {
                        setDataState((prev) => ({ ...prev, data: snap }));
                        const dirty = makeTab2Signature(snap) !== baselineSigRef.current;
                        onUnsavedChange?.(dirty);
                        onHasEditLogChange?.(dirty);
                    }
                    return;
                }
            };

            window.addEventListener("keydown", onKey, true);
            return () => window.removeEventListener("keydown", onKey, true);
        }, [hist, setDataState, onUnsavedChange, makeTab2Signature, onHasEditLogChange]);

        /**
        * 코드/텍스트 동기화 공통 처리:
        * - 코드 변경: 텍스트를 매핑해 채우고, 없으면 비움
        * - 텍스트 변경:
        *    · 비우면 코드도 비움
        *    · 기존 텍스트면 기존 코드로
        *    · 새 텍스트면 "그 행의 코드가 비어 있을 때만" max+1 한 번 배정
        */
        const onItemChange = useCallback((e) => {
            const { dataItem, field, value } = e;
            const rowKey = keyOf(dataItem);

            // 에러 테두리 제거: 사용자가 값을 수정하는 즉시 해당 셀의 마크를 지움
            setErrorMarks(prev => {
                if (!field || !prev.has(rowKey)) return prev;
                const next = new Map(prev);
                const set = new Set(next.get(rowKey));
                set.delete(field);
                if (set.size === 0) next.delete(rowKey); else next.set(rowKey, set);
                return next;
            });

            setDataState(prev => {
                const rows = prev.data || [];
                const getKey = (r) => r?.__rowKey;

                // 현재 행 제외 후 해당 codeField의 숫자 최대값 + 1
                const maxPlus1 = (codeField) => {
                    const maxVal = Math.max(
                        0,
                        ...rows
                            .filter(r => getKey(r) !== rowKey)
                            .map(r => parseInt(String(r?.[codeField] ?? "").replace(/\D/g, ""), 10) || 0)
                    );
                    let next = maxVal + 1;
                    if (next >= 9997 && next <= 9999) next = 10000;
                    return String(next);
                };

                // 처리 대상(대/중분류) 쌍을 찾음
                const PAIRS = [
                    { code: "lv1code", text: "lv1", codeToText: lv1CodeToText, textToCode: lv1ToTextToCode },
                    { code: "lv2code", text: "lv2", codeToText: lv2CodeToText, textToCode: lv2TextToCode },
                ];

                const data = rows.map(r => {
                    if (getKey(r) !== rowKey) return r;

                    const next = { ...r, [field]: value };
                    if (next.__errors?.has?.(field)) {
                        const copy = new Set(next.__errors);
                        copy.delete(field);
                        next.__errors = copy.size ? copy : undefined;
                    }
                    if (next.__errorKinds?.[field]) {
                        const kinds = { ...next.__errorKinds };
                        delete kinds[field];
                        next.__errorKinds = Object.keys(kinds).length ? kinds : undefined;
                    }
                    const pair = PAIRS.find(p => p.code === field || p.text === field);
                    if (!pair) return next; // 소분류나 다른 필드는 그대로

                    const v = String(value ?? "").trim();

                    // 1) 코드 입력 → 텍스트 동기화
                    if (field === pair.code) {
                        next[pair.text] = v ? (pair.codeToText.get(v) || "") : "";
                        return next;
                    }

                    // 2) 텍스트 입력 → 코드 동기화
                    if (!v) {                         // 빈 텍스트 → 코드도 비움
                        next[pair.code] = "";
                        return next;
                    }

                    const known = pair.textToCode.get(v.toLowerCase());
                    if (known) {                      // 기존 텍스트 → 기존 코드로
                        next[pair.code] = known;
                        return next;
                    }

                    // 새 텍스트
                    const curCode = String(r?.[pair.code] ?? "").trim();

                    // 현재 코드가 다른 행에서 쓰이고 있다면 그 "기준 텍스트"를 하나 가져옴
                    let otherText = "";
                    if (curCode) {
                        const other = rows.find(o =>
                            getKey(o) !== rowKey && String(o?.[pair.code] ?? "").trim() === curCode
                        );
                        otherText = other ? String(other?.[pair.text] ?? "").trim() : "";
                    }

                    // (A) 코드가 없으면 → 최초 등록: max+1
                    // (B) 코드가 있고, 그 코드의 기준 텍스트와 다르게 바꾸면 → 탈착: max+1
                    // (C) 그 외(기준 없거나 동일) → 코드 유지 (타이핑 중 반복 증가 방지)
                    if (!curCode || (otherText && otherText !== v)) {
                        next[pair.code] = maxPlus1(pair.code);
                    }

                    return next;
                });
                // 타이핑 중엔 중복마킹/히스토리 지연
                scheduleFlush();
                return { ...prev, data };
            });
        }, [
            setDataState, keyOf,
            lv1CodeToText, lv1ToTextToCode,
            lv2CodeToText, lv2TextToCode, scheduleFlush
        ]);

        // 삭제 로직: 새 행은 즉시 제거, 기존 행은 토글 (단, 해제 시 중복이면 토글 차단)
        const onClickDeleteCell = useCallback((cellProps) => {
            rememberScroll(); // 스크롤 저장
            const row = cellProps.dataItem;
            const key = keyOf(row);
            // 새 행은 제거
            if (row.__isNew) {
                setDataState(prev => {
                    const kept = (prev.data || []).filter(r => keyOf(r) !== key);
                    const reindexed = kept.map((r, idx) => {
                        const next = { ...r, no: idx + 1 };
                        next[COMPOSITE_KEY_FIELD] = makeRowKey(next);
                        return next;
                    });
                    const withDup = applyLiveDupMarks(reindexed);
                    commitSmart(withDup);
                    return { ...prev, data: withDup };
                });
                return;
            }

            // 삭제대기 해제(=현재 __pendingDelete 가 true) 시, 해제하면 중복 생기는지 사전검사
            if (row.__pendingDelete === true) {
                const prevRows = latestCtxRef.current?.dataState?.data || [];
                // "해제"가 된 것으로 가정하고 시뮬레이션
                const simulated = prevRows.map(r =>
                    keyOf(r) === key ? { ...r, __pendingDelete: false } : r
                );

                // pending 제외 기준으로 중복 체크하되, 방금 해제한 행은 포함됨
                const dups = findLv123Duplicates(simulated);
                const code = String(row.lv123code ?? "").trim();
                const hasDupOnTarget = !!code && dups.some(d => d.code === code);

                if (hasDupOnTarget) {
                    // 해제 금지: 행은 계속 "삭제대기(취소 버튼)" 상태 유지
                    modal.showErrorAlert(
                        "알림",
                        `소분류코드 '${code}'가 이미 다른 행에 존재합니다.\n삭제 취소를 할 수 없습니다.`
                    );
                    return;
                }
            }

            // 여기까지 왔으면 토글 허용
            setDataState(prev => {
                const next = (prev.data || []).map(r =>
                    keyOf(r) === key
                        ? { ...r, __pendingDelete: !r.__pendingDelete, inEdit: false }
                        : r
                );
                const withDup = applyLiveDupMarks(next);
                commitSmart(withDup);
                return { ...prev, data: withDup };
            });
        }, [keyOf, findLv123Duplicates, applyLiveDupMarks]);

        // 추가버튼 클릭 이벤트
        const addButtonClick = useCallback(() => {
            rememberScroll(); // 스크롤 저장
            const data = Array.isArray(dataState?.data) ? [...dataState.data] : [];
            const insertIndex = data.length;
            const maxLv123 = Math.max(
                0,
                ...data.map(r => parseInt(String(r?.lv123code ?? "").replace(/\D/g, ""), 10) || 0)
            );
            let nextVal = maxLv123 + 1;
            if (nextVal >= 9997 && nextVal <= 9999) nextVal = 10000;
            const nextLv123 = String(nextVal);
            const tmpKey =
                (typeof crypto !== "undefined" && crypto.randomUUID)
                    ? crypto.randomUUID()
                    : `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const newRow = {
                no: insertIndex + 1,
                qnum: qnum,
                lv1code: "",
                lv1: "",
                lv2code: "",
                lv2: "",
                lv123code: nextLv123,
                lv3: "",
                ex_sum: "0",
                ex_gubun: "analysis",
                inEdit: true,
                __isNew: true,
                __rowKey: tmpKey,
            };
            data.splice(insertIndex, 0, newRow);
            const withDup = applyLiveDupMarks(data);
            commitSmart(withDup);
            setDataState((prev) => ({ ...prev, data: withDup }));

            // 새 행 추가 후 스크롤 맨 아래로 이동
            requestAnimationFrame(() => {
                const grid = document.querySelector("#grid_01 .k-grid-content, #grid_01 .k-grid-contents");
                if (grid) {
                    grid.scrollTo({
                        top: grid.scrollHeight,
                        behavior: "smooth", // 부드럽게 이동 (깜빡임 방지)
                    });
                    scrollTopRef.current = grid.scrollHeight; // 다음 복원 루프용
                }
            });
        }, [applyLiveDupMarks, qnum]);

        // 행 클릭 시 편집기능 open
        const onRowClick = useCallback((e) => {
            rememberScroll();
            const clicked = e.dataItem;

            // 보기유형이 survey면 편집 진입 막기 
            if (clicked?.ex_gubun === 'survey') return;

            const clickedKey = getKey(clicked);
            setDataState(prev => ({
                ...prev,
                data: (prev.data || []).map(r => ({
                    ...r,
                    // 클릭한 행만 편집모드로, 나머지는 해제
                    inEdit: getKey(r) === clickedKey
                }))
            }));
        }, []);

        /* 저장: 보류 삭제 커밋 + 번호/키 재계산 + __isNew 해제 + API 호출 */
        const saveChanges = useCallback(async () => {
            if (typeof document !== "undefined" && document.activeElement) {
                document.activeElement.blur();
            }

            // 0) 현재 그리드를 기반으로 최종 데이터 생성
            const prev = latestCtxRef.current?.dataState?.data ?? [];

            // 1) 유효성 검사
            const { ok, errors, rowMarks, rowKinds } = validateRows(prev);
            if (!ok) {
                // 행 객체 기준으로 바로 __errors 세팅
                setDataState(prevState => {
                    const nextRows = (prevState?.data || []).map(r => {
                        const set = rowMarks.get(r);
                        const kinds = rowKinds.get(r);
                        if (!set) {
                            const { __errors, ...rest } = r;
                            return rest;              // 이전 에러 제거
                        }
                        return { ...r, __errors: new Set(set), __errorKinds: kinds };
                    });
                    //requestAnimationFrame(() => focusFirstErrorCell()); // 포커스 이동  
                    return { ...prevState, data: nextRows };
                });
                setTimeout(() => setErrorMarks(new Map()), 150);
                modal.showErrorAlert("알림", errors.join("\n"));
                return false; // 저장 중단
            }

            // 2) 보류 삭제 반영 + 재번호 + 키/플래그 정리
            const kept = prev.filter(r => !r.__pendingDelete);         // 보류 삭제 반영
            const normalized = kept.map((r, idx) => {
                const next = {
                    ...r,
                    no: idx + 1,                   // 재번호
                    __pendingDelete: false,        // 정리
                    __isNew: false,                // 새 행 해제 (이제 삭제버튼 표시 가능)
                };
                next[COMPOSITE_KEY_FIELD] = makeRowKey(next); // 복합키 재계산
                return next;
            });

            // 3) 저장 API 호출
            try {
                const payload = buildSavePayload(normalized, qnum);
                const res = await optionSaveData.mutateAsync({ ...payload, skipSpinner: true });
                if (res?.success == "777") {
                    setErrorMarks(new Map());   //에러 초기화
                    // modal.showAlert("알림", "소분류 드롭다운 목록이 적용되었습니다."); // 성공 팝업 표출
                    onSaved?.();  // 미저장 플래그 해제 요청(부모)
                    onUnsavedChange?.(false);                // 미저장 해제
                    onHasEditLogChange?.(false);
                    baselineAfterReloadRef.current = true;   // 재조회 후 베이스라인 재설정
                    handleSearch({ skipSpinner: true }); // 재조회

                    // const analysisPayload = {
                    //     user: auth?.user?.userId || "",
                    //     projectnum,
                    //     qid,
                    //     opencodeResponse: "Y",
                    //     action: "start",
                    // };
                    // const analysisRes = await optionAnalysisStart.mutateAsync(analysisPayload);
                    // if (analysisRes?.success === "777") {
                    //     modal.showErrorAlert("에러", "오류가 발생했습니다.");
                    //     return false;
                    // }

                    return true;  //성공
                } else if (res?.success == "762") {
                    modal.showErrorAlert("에러", res?.message); //"보기 코드 중복, 빈값 발견"
                    return false;
                } else {
                    modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다."); //오류 팝업 표출
                    return false;
                };
            } catch (err) {
                modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다."); //오류 팝업 표출
                return false;   // 실패 시 그리드 상태 변경 안 함
            }

        }, [qnum]);

        // 부모에서 호출할 수 있도록 ref에 연결
        saveChangesRef.current = saveChanges;

        // 보류 행 회색 처리
        const rowRender = useCallback((trEl, rowProps) => {
            if (!rowProps.dataItem) {
                return trEl;   // 절대 커스텀 이벤트 넣지 말기
            }
            const pending = rowProps?.dataItem?.__pendingDelete === true;
            const cls = `${trEl.props.className || ''} ${pending ? 'row-pending-delete' : ''}`;
            return React.cloneElement(trEl, { ...trEl.props, className: cls });
        }, []);

        // 유효성 체크 (모든 행의 중복 / 빈값 검사 수행)
        const validateRows = (allRows) => {
            // 1) 저장 대상만 추리기: 삭제 예정 행 제외
            const rows = (allRows || []).filter((r) => r?.__pendingDelete !== true);
            const errors = [];
            const rowMarks = new Map(); // WeakMap<object, Set<string>>
            const rowKinds = new Map(); // row -> { [field]: 'required'|'dup' };
            const mark = (row, field, message, kind) => {
                const set = rowMarks.get(row) ?? new Set();
                set.add(field);
                rowMarks.set(row, set);

                const kinds = rowKinds.get(row) ?? {};
                if (kind) kinds[field] = kind;
                rowKinds.set(row, kinds);

                if (message) errors.push(message);
            };
            // 2) 소분류 코드/소분류만 필수
            const requiredFields = [
                { f: "lv123code", label: "소분류 코드" },
                { f: "lv3", label: "소분류" },
            ];

            // 3) 필수값 체크
            rows.forEach((r) => {
                requiredFields.forEach(({ f, label }) => {
                    const v = String(r?.[f] ?? "").trim();
                    if (!v) mark(r, f, `${label}은(는) 필수입니다. (행 번호: ${r?.no ?? "?"})`, "required");
                });
            });

            // 4) 중복 체크: 무조건 소분류코드(lv123code)만 검사
            const codeToRows = new Map(); // code -> row[]
            rows.forEach((r) => {
                const c = String(r?.lv123code ?? "").trim().toLowerCase();
                if (!c) return;
                if (!codeToRows.has(c)) codeToRows.set(c, []);
                codeToRows.get(c).push(r);
            });
            codeToRows.forEach((arr, code) => {
                if (arr.length > 1) {
                    const nos = arr.map(r => r?.no ?? "?").join(", ");
                    // 해당 코드가 있는 모든 행의 'lv123code' 셀에 마크
                    arr.forEach(r => mark(r, "lv123code", null, "dup"));
                    errors.push(`소분류코드 '${code}'가 중복입니다. (행 번호: ${nos})`);
                }
            });
            return { ok: errors.length === 0, errors, rowMarks, rowKinds };
        };

        // 컬럼 name
        const NAMED_FIELDS = new Set([
            "lv1", "lv1code",
            "lv2", "lv2code",
            "lv3", "lv123code",
        ]);

        // textarea로 쓸 '이름' 필드
        const TEXTAREA_FIELDS = new Set(["lv1", "lv2", "lv3"]);
        // 그리드 밖 클릭 시 무조건 닫기
        useEffect(() => {
            const closeAllEditors = (evt) => {
                const root = gridRootRef.current;
                // 그리드 영역 밖을 클릭한 경우만 닫기
                if (root && !root.contains(evt.target)) {
                    setDataState((prev) => ({
                        ...prev,
                        data: (prev.data || []).map((r) => (r.inEdit ? { ...r, inEdit: false } : r)),
                    }));
                }
            };
            // capture 단계에서 잡아주면 Kendo 내부 핸들러보다 먼저 닫힘
            document.addEventListener("pointerdown", closeAllEditors, true);
            return () => document.removeEventListener("pointerdown", closeAllEditors, true);
        }, []);

        const NamedTextCell = useCallback((cellProps) => {
            const { dataItem, field } = cellProps;
            const editable = dataItem?.inEdit && NAMED_FIELDS.has(field);

            // 에러 감지
            const hasError = dataItem?.__errors?.has?.(field);
            const errorKind = dataItem?.__errorKinds?.[field];
            const errorLabel = errorKind === "dup" ? "중복" : "빈값";

            const rowKey = keyOf(dataItem);
            const inputId = `${field}-${rowKey}`;   // 고유 id
            const initialValue = dataItem?.[field] ?? "";

            // blur 시점에만 상위(onItemChange)로 최종 값 전달
            const handleBlurClose = (e) => {
                const finalValue = e.target.value;

                // 1) GridData(onItemChange)로 최종 값 전달
                cellProps.onChange?.({
                    dataItem,
                    field,
                    value: finalValue,
                });

                // 2) 편집 모드 해제
                setDataState((prev) => ({
                    ...prev,
                    data: (prev.data || []).map((r) =>
                        r.__rowKey === dataItem.__rowKey ? { ...r, inEdit: false } : r
                    ),
                }));
            };

            // 엔터 키 입력 시 편집 종료 (blur 유발)
            const handleKeyDown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // 줄바꿈 방지 (textarea)
                    e.target.blur();    // blur 이벤트 발생 -> handleBlurClose 실행됨
                }
            };

            // 일반 셀 (편집 아닐 때)
            if (!editable) {
                return (
                    <td className={`k-table-td ${hasError ? "cell-error" : ""}`}>
                        {dataItem?.[field] ?? ""}
                        {hasError && <span className="cell-error-badge">{errorLabel}</span>}
                    </td>
                );
            }

            return (
                <td
                    className={`k-table-td ${hasError ? "cell-error" : ""}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <label htmlFor={inputId} className="hidden">
                        {field}
                    </label>

                    {TEXTAREA_FIELDS.has(field) ? (
                        <textarea
                            id={inputId}
                            name={field}
                            // IME 보호: controlled → uncontrolled 로 변경
                            defaultValue={initialValue}
                            onBlur={handleBlurClose}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            style={{
                                width: "100%",
                                minHeight: 34,
                                lineHeight: 1.4,
                                resize: "vertical",
                            }}
                            className="k-textarea k-input-solid"
                        />
                    ) : (
                        <input
                            id={inputId}
                            name={field}
                            // value → defaultValue
                            defaultValue={initialValue}
                            onBlur={handleBlurClose}
                            onKeyDown={handleKeyDown}
                            autoComplete="on"
                            className="k-input k-input-solid"
                            style={{ width: "100%" }}
                        />
                    )}
                    {hasError && <span className="cell-error-badge">{errorLabel}</span>}
                </td>
            );
        }, [keyOf, setDataState]);

        // --- API 요청 페이로드 변환: 현재 그리드 행 -> 저장 포맷 ---
        const buildSavePayload = (rows, qnum) => {
            // __pendingDelete 행은 제외(=실제 삭제 반영), __isNew 플래그/로컬키는 서버로 안보냄
            const cleaned = (rows || [])
                .filter(r => r.__pendingDelete !== true)
                .map((r) => ({
                    lv1: String(r.lv1 ?? ""),
                    lv2: String(r.lv2 ?? ""),
                    lv3: String(r.lv3 ?? ""),
                    qnum: String(qnum ?? ""),
                    lv1code: String(r.lv1code ?? ""),
                    lv2code: String(r.lv2code ?? ""),
                    lv321code: String(r.lv321code ?? ""),
                    summary: String(r.summary ?? ""),
                    ex_gubun: String(r.ex_gubun ?? "analysis"),
                    lv23code: String(r.lv23code ?? ""),
                    lv123code: String(r.lv123code ?? ""),
                    representative_response: String(r.representative_response ?? ""),
                }));

            return {
                user: auth?.user?.userId || "",
                projectnum: projectnum,
                qnum: qnum,
                gb: "lb",
                lvcode: String(lvCode ?? ""),
                data: cleaned,
            };
        };

        // 삭제 안내 띄우기: 하나라도 __pendingDelete === true 이면 표시
        const hasPendingDelete = useMemo(() => {
            const rows = dataState?.data || [];
            return rows.some(r => r?.__pendingDelete === true);
        }, [dataState?.data]);

        // 마지막 행 key (삭제대기/설문 제외) => 추가버튼 표출
        const lastAddableKey = useMemo(() => {
            const rows = dataState?.data || [];
            // 뒤에서부터 훑어서 삭제대기/설문 제외한 마지막 유효 행을 찾음
            for (let i = rows.length - 1; i >= 0; i--) {
                const r = rows[i];
                if (r?.__pendingDelete === true) continue;
                return keyOf(r);
            }
            // 전부 삭제대기/설문이면 물리적 마지막 행을 fallback(없으면 null)
            return rows.length ? keyOf(rows[rows.length - 1]) : null;
        }, [dataState?.data, keyOf]);

        useEffect(() => {
            return () => {
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = null;
                }
            };
        }, []);

        return (
            <Fragment>
                <div className="meta-header-layout">
                    <div className="meta-header-left meta2">
                        <div className="row1" style={{ color: '#888', fontSize: '13px', textAlign: 'left', marginLeft: '0', paddingLeft: '0' }}>업데이트 날짜: {dataState?.data?.[0]?.update_date ?? '-'}</div>
                        <div className="row2" style={{ textAlign: "left", display: "flex", alignItems: "center", gap: "10px", marginTop: '4px' }}>
                            <GridDataCount total={filteredCount} label="필터 결과" unit="건" />
                        </div>
                    </div>
                    <div className="meta-header-right" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                        <Button
                            themeColor="primary"
                            className="btnM"
                            onClick={() => {
                                const hasAnalysisData = (dataState?.data || []).some(r => r.ex_gubun === 'analysis');
                                if (!hasAnalysisData) {
                                    modal.showAlert("알림", "보기유형이 분석(수정가능)인 데이터가 존재하지 않습니다.");
                                    return;
                                }

                                modal.showConfirm("알림", "보기유형이 분석(수정가능)인 모든 보기 레이블을 삭제하시겠습니까?", {
                                    btns: [
                                        {
                                            title: "취소",
                                            className: "btnM btnTxt type01",
                                            click: () => { }
                                        },
                                        {
                                            title: "확인",
                                            className: "btnM",
                                            themeColor: "primary",
                                            click: async () => {
                                                try {
                                                    const payload = {
                                                        user: auth?.user?.userId || "",
                                                        projectnum: sessionStorage.getItem("projectnum") ?? "",
                                                        qnum: sessionStorage.getItem("qnum") ?? "",
                                                        gb: "alldel"
                                                    };
                                                    const res = await optionSaveData.mutateAsync(payload);
                                                    if (res?.success === "777") {
                                                        // 성공 시 재조회
                                                        handleSearch();
                                                        modal.showAlert("알림", "초기화 되었습니다.");
                                                    } else {
                                                        modal.showErrorAlert(res?.success || "에러", res?.message || res?.contents || "초기화 중 오류가 발생했습니다.");
                                                    }
                                                } catch (e) {
                                                    modal.showErrorAlert("에러", "초기화 중 오류가 발생했습니다.");
                                                }
                                            }
                                        }
                                    ]
                                });
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <RotateCcw size={16} />
                                전체 초기화
                            </div>
                        </Button>
                        <Button
                            themeColor="primary"
                            className="btnM"
                            onClick={addButtonClick}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Plus size={16} />
                                보기 데이터 추가
                            </div>
                        </Button>
                    </div>
                </div>
                {/* 삭제 안내 배너 */}
                {hasPendingDelete && (
                    <div style={{ textAlign: "right" }}>
                        <span
                            style={{
                                color: "#E74C3C",
                                padding: "6px 10px",
                                fontSize: 15,
                                fontWeight: 600,
                            }}
                        >
                            삭제 시 해당 코드는 응답데이터에서도 초기화됩니다.
                        </span>
                    </div>
                )}
                <div id="grid_01" className={`cmn_grid singlehead ${isLeftOpen && String(lvCode) !== "1" ? "force-scroll" : ""}`} ref={gridRootRef}>
                    <KendoGrid
                        // key={`lv-${lvCode}`}
                        key="tab2-grid"
                        parentProps={{
                            data: dataWithProxies,
                            dataItemKey: "__rowKey",
                            idGetter: (r) => r.__rowKey,
                            onProcessedDataUpdate: (arr) => {
                                if (arr && arr.length > 0) {
                                    // Kendo가 실제 화면 데이터 계산 완료 → 로딩 닫기
                                    loadingSpinner.hide();
                                }
                            },
                            editField,
                            onItemChange,
                            selectedState,
                            setSelectedState,
                            rowRender,
                            onRowClick,
                            // useClientProcessing: true,                      
                            sortable: { mode: "multiple", allowUnsort: true },
                            filterable: true,
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
                            pinnedBottomPredicate: (r) => r.__isNew, // 새 행은 항상 맨 아래 고정
                            noRecordsExtra: (
                                // 데이터가 하나도 없을 때 “추가” 버튼 표출 
                                <Button
                                    themeColor="primary"
                                    className="btnM"
                                    onClick={addButtonClick}
                                >
                                    + 보기 데이터 추가
                                </Button>
                            ),
                        }}
                    >
                        {effectiveColumns.filter(c => c.show !== false).map((c) => {
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

                                            // 보기유형이 survey이면 삭제 버튼 숨김
                                            if (row?.ex_gubun === 'survey') return <td />;
                                            const pending = props.dataItem.__pendingDelete === true;
                                            return (
                                                <td
                                                    style={{ textAlign: "center" }}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
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

                            const useNamed = ["lv1", "lv1code", "lv2", "lv2code", "lv3", "lv123code"].includes(c.field);

                            // 코드 컬럼이면 proxy 필드로 정렬
                            if (["lv1code", "lv2code", "lv123code"].includes(c.field)) {
                                const proxy = proxyField[c.field] ?? `__sort__${c.field}`;
                                return (
                                    <Column
                                        key={c.field}
                                        field={proxy}                    // 정렬용 필드는 proxy
                                        title={c.title}
                                        width={c.width}
                                        editable={c.editable}
                                        // 메뉴는 원래 필드 기준으로
                                        columnMenu={(menuProps) => columnMenu({ ...menuProps, field: c.field })}
                                        {...(useNamed ? {
                                            // 셀은 원래 필드 이름으로 넘겨서 NamedTextCell이 lv1code 를 수정하게
                                            cell: (cellProps) => (
                                                <NamedTextCell {...cellProps} field={c.field} />
                                            )
                                        } : {})}
                                    />
                                );
                            }

                            if (c.field === 'ex_gubun') {
                                return (
                                    <Column
                                        key={c.field}
                                        field={c.field}
                                        title={c.title}
                                        width={c.width}
                                        editable={c.editable}
                                        headerCell={() => (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                                {c.title}
                                                <span
                                                    className="info-icon"
                                                    data-tooltip={`보기유형|• 설문(수정불가): 설문지 원본 보기 데이터 ('보기분석' 시 유지)\n• 분석(수정가능): 분석된 보기 데이터 ('보기분석' 시 변경)`}
                                                ></span>
                                            </div>
                                        )}
                                        cell={(props) => {
                                            const val = props.dataItem[c.field];
                                            let displayVal = val;
                                            if (val === 'survey') displayVal = '설문(수정불가)';
                                            else if (val === 'analysis') displayVal = '분석(수정가능)';
                                            return <td className="k-table-td">{displayVal}</td>;
                                        }}
                                        columnMenu={columnMenu}
                                    />
                                );
                            }

                            // 나머지 컬럼
                            return (
                                <Column
                                    key={c.field}
                                    field={c.field}
                                    title={c.title}
                                    width={c.width}
                                    editable={c.editable}
                                    columnMenu={columnMenu}
                                    {...(useNamed ? { cell: NamedTextCell } : {})}
                                />
                            );
                        })}
                    </KendoGrid>
                </div>
            </Fragment>
        );
    }

    return (
        <GridData
            dataItemKey={DATA_ITEM_KEY}
            rowNumber={"no"}
            searchMutation={{
                ...optionEditData,
                mutateAsync: async (params) => {
                    const res = await optionEditData.mutateAsync(params);

                    // resultjson이 빈 배열일 경우 로딩바 닫기
                    if (Array.isArray(res?.resultjson) && res.resultjson.length === 0) {
                        loadingSpinner.hide();
                    }

                    return res;
                },
            }}
            editField={editField}
            initialParams={{             /*초기파라미터 설정*/
                user: auth?.user?.userId || "",
                projectnum: sessionStorage.getItem("projectnum") ?? "",
                qnum: sessionStorage.getItem("qnum") ?? "",
                gb: "lb",
            }}
            renderItem={(props) => (
                <GridRenderer
                    {...props}
                    hist={hist}
                    baselineDidRef={baselineDidRef}
                    baselineAfterReloadRef={baselineAfterReloadRef}
                    baselineSigRef={baselineSigRef}
                    sigStackRef={sigStackRef}
                    makeTab2Signature={makeTab2Signature}
                    scrollTopRef={scrollTopRef}
                    scrollLeftRef={scrollLeftRef}
                    isLeftOpen={isLeftOpen}
                />
            )}
        />
    );
});

export default OptionSettingTab2;
