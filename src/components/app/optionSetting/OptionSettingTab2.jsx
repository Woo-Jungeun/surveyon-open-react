import React, { Fragment, useState, useRef, forwardRef, useImperativeHandle, useCallback, useContext, useMemo, useEffect } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { Button } from "@progress/kendo-react-buttons";
import { modalContext } from "@/components/common/Modal.jsx";
/**
 * 분석 > 그리드 영역 > 보기 데이터
 *
 * @author jewoo
 * @since 2025-08-12<br />
 */
const OptionSettingTab2 = forwardRef((props, ref) => {
    const lvCode = String(props.lvCode); // 분류 단계 코드
    const { onUnsavedChange, onSaved, persistedPrefs, onPrefsChange } = props;
    const modal = useContext(modalContext);
    const DATA_ITEM_KEY = ["lv123code", "no"];
    const MENU_TITLE = "보기 데이터";
    let qnum = "";   //문번호

    /**
     * 숨김처리 여부 allowHide (true/false)
     * 편집 가능 여부 editable(true/false)
    */
    const [columns, setColumns] = useState(() =>
        persistedPrefs?.columns ?? [
            { field: "no", title: "no", show: true, editable: false, width: "100px" },
            { field: "qnum", title: "문번호", show: true, editable: false },
            { field: "lv1code", title: "대분류 코드", show: true },
            { field: "lv1", title: "대분류", show: true },
            { field: "lv2code", title: "중분류 코드", show: true },
            { field: "lv2", title: "중분류", show: true },
            { field: "lv123code", title: "소분류 코드", show: true, allowHide: false },
            { field: "lv3", title: "소분류", show: true, allowHide: false },
            { field: "ex_sum", title: "집계현황", show: true, editable: false, allowHide: false },
            { field: "ex_gubun", title: "보기유형", show: true, editable: false, allowHide: false },
            { field: "delete", title: "삭제", show: true, editable: true, allowHide: false }
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
        return columns.map(c =>
            forcedHidden.has(c.field)
                ? { ...c, show: false, allowHide: false }
                : c
        );
    }, [columns, forcedHidden, stageFields]);

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
            }}
            filter={filter}
            onFilterChange={(e) => {
                setFilter(e);
                onPrefsChange?.({ filter: e });
            }}
        />
    );

    const { optionEditData, optionSaveData } = OptionSettingApi();
    const [editField] = useState("inEdit");

    // GridData가 내려주는 최신 컨텍스트를 저장
    const latestCtxRef = useRef(null);
    const saveChangesRef = useRef(async () => false);   // 저장 로직 노출용

    // 부모에서 호출할 추가 함수
    const addButtonClick = () => {
        onUnsavedChange?.(true);
        const gridContext = latestCtxRef.current;   // 최신 그리드 상태/함수들을 가져옴
        // 그리드 컨텍스트가 없으면 종료
        if (!gridContext) return;

        const { dataState, setDataState, selectedState, idGetter } = gridContext;
        // 현재 그리드 데이터 복사 (불변성 유지)
        const data = Array.isArray(dataState?.data) ? [...dataState.data] : [];

        const insertIndex = data.length;    //마지막 행 뒤 행 추가 

        // 소분류 코드 최대값 + 1 계산
        const maxLv123 = Math.max(
            0,
            ...data.map(r => parseInt(String(r?.lv123code ?? "").replace(/\D/g, ""), 10) || 0)
        );
        const nextLv123 = String(maxLv123 + 1);

        // 임시 고유키(변하지 않게 랜덤/UUID 사용)
        const tmpKey =
            (typeof crypto !== 'undefined' && crypto.randomUUID)
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
            inEdit: true, // 즉시 편집
            __isNew: true,  // 새로 추가된 행 표시 (삭제 버튼 숨김용)
            __rowKey: tmpKey,          // 새 행에 고유키 부여
        };

        data.splice(insertIndex, 0, newRow);
        setDataState((prev) => ({ ...prev, data }));    // 데이터 업데이트
    };

    // 부모(OptionSettingBody.jsx) 에게 노출
    useImperativeHandle(ref, () => ({
        addButtonClick,
        saveChanges: () => saveChangesRef.current(),   // 부모 저장 버튼이 호출
    }));

    //grid rendering 
    const GridRenderer = (props) => {
        const { dataState, setDataState, selectedState, setSelectedState, idGetter, dataItemKey, handleSearch } = props;
        // 키값
        const COMPOSITE_KEY_FIELD = "__rowKey";
        const getKey = useCallback(
            (row) => (typeof idGetter === "function" ? idGetter(row) : row?.[dataItemKey]),
            [idGetter, dataItemKey]
        );

        qnum = dataState?.data?.[0]?.qnum ?? "";   // 문번호 저장 (행 추가 시 필요)
        latestCtxRef.current = { dataState, setDataState, selectedState, idGetter };    // 최신 컨텍스트 저장

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

        // ["lv123code","no"] 기준
        const makeRowKey = (row) =>
            [row?.lv123code ?? "", row?.no ?? ""]
                .map(v => encodeURIComponent(String(v)))
                .join("__");

        // 각 행의 고유키를 계산(서버키 없을 때 __rowKey → 없으면 makeRowKey로 대체)
        const keyOf = useCallback((row) => row?.__rowKey || makeRowKey(row), []);

        /**
         * 검증 오류가 있는 셀에 빨간 테두리(className)와 배지(중복/빈값)를 붙임임
         * - 셀의 원래 컨텐츠(td.props.children)는 그대로 유지
         */ 
        const cellRender = useCallback((td, cellProps) => {
            if (!React.isValidElement(td)) return td;

            const field = cellProps?.field;
            if (!field) return td;

            const item = cellProps?.dataItem;
            const key = keyOf(item);

            const hasError =
                errorMarks.get(key)?.has(field) || item?.__errors?.has?.(field);
            if (!hasError) return td;  // 오류가 없으면 원본 td 그대로 반환

            const kind = item?.__errorKinds?.[field] ?? (field === 'lv123code' ? 'dup' : 'required');
            const label = kind === 'dup' ? '중복' : '빈값';

            return React.cloneElement(
                td,
                {
                    ...td.props,
                    className: `${td.props.className || ''} cell-error`,
                    tabIndex: 0,
                    'data-err-field': field,
                    'data-err-key': key
                },
                <>
                    {td.props.children}
                  <span className="cell-error-badge">{label}</span>   {/* 오류 배지 */}
                </>
            );
        }, [errorMarks, keyOf]);

        /**
        * 코드/텍스트 동기화 공통 처리:
        * - 코드 변경: 텍스트를 매핑해 채우고, 없으면 비움
        * - 텍스트 변경:
        *    · 비우면 코드도 비움
        *    · 기존 텍스트면 기존 코드로
        *    · 새 텍스트면 "그 행의 코드가 비어 있을 때만" max+1 한 번 배정
        */
        const onItemChange = useCallback((e) => {
            onUnsavedChange?.(true);
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
                const getKey = (r) => (idGetter ? idGetter(r) : r?.[dataItemKey]);

                // 현재 행 제외 후 해당 codeField의 숫자 최대값 + 1
                const maxPlus1 = (codeField) =>
                    String(
                        Math.max(
                            0,
                            ...rows
                                .filter(r => getKey(r) !== rowKey)
                                .map(r => parseInt(String(r?.[codeField] ?? "").replace(/\D/g, ""), 10) || 0)
                        ) + 1
                    );

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
                // 중복 마크 실시간 재계산
                const withDup = applyLiveDupMarks(data);
                return { ...prev, data: withDup };
            });
        }, [
            setDataState, keyOf,
            lv1CodeToText, lv1ToTextToCode,
            lv2CodeToText, lv2TextToCode
        ]);
        // 삭제 로직: 새 행은 즉시 제거, 기존 행은 토글 (단, 해제 시 중복이면 토글 차단)
        const onClickDeleteCell = useCallback((cellProps) => {
            const row = cellProps.dataItem;
            const key = keyOf(row);
            // 새 행은 제거
            if (row.__isNew) {
                onUnsavedChange?.(true);
                setDataState(prev => {
                    const kept = prev.data.filter(r => keyOf(r) !== key);
                    const reindexed = kept.map((r, idx) => {
                        const next = { ...r, no: idx + 1 };
                        next[COMPOSITE_KEY_FIELD] = makeRowKey(next);
                        return next;
                    });
                    return { ...prev, data: applyLiveDupMarks(reindexed) };
                });
                return;
            }

            // 삭제대기 해제(=현재 __pendingDelete 가 true) 시, 해제하면 중복 생기는지 사전검사
            if (row.__pendingDelete === true) {
                const prevRows = latestCtxRef.current?.dataState?.data || [];
                // "해제"가 된 것으로 가정하고 시뮬레이션
                const simulated = prevRows.map(r =>
                    getKey(r) === key ? { ...r, __pendingDelete: false } : r
                );

                // pending 제외 기준으로 중복 체크하되, 방금 해제한 행은 포함됨
                const dups = findLv123Duplicates(simulated);
                const code = String(row.lv123code ?? "").trim();
                const hasDupOnTarget = !!code && dups.some(d => d.code === code);

                if (hasDupOnTarget) {
                    // 🔸해제 금지: 행은 계속 "삭제대기(취소 버튼)" 상태 유지
                    modal.showErrorAlert(
                        "알림",
                        `소분류코드 '${code}'가 이미 다른 행에 존재합니다.\n삭제 취소를 할 수 없습니다.`
                    );
                    return;
                }
            }

            // 여기까지 왔으면 토글 허용
            onUnsavedChange?.(true);
            setDataState(prev => {
                const next = prev.data.map(r =>
                    getKey(r) === key
                        ? { ...r, __pendingDelete: !r.__pendingDelete, inEdit: false }
                        : r
                );
                return { ...prev, data: applyLiveDupMarks(next) };
            });
        }, [getKey, setDataState, onUnsavedChange, modal, findLv123Duplicates]);
        // 행 클릭 시 편집기능 open
        const onRowClick = useCallback((e) => {
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
        }, [setDataState, getKey]);

        // 현재 rows 기준으로 lv123code 중복 셀만 __errors에 반영
        const applyLiveDupMarks = useCallback((rows = []) => {
            // 삭제대기/설문 행 제외  코드가 있는 것만
            const eligible = rows.filter(r =>
                r?.__pendingDelete !== true &&
                r?.ex_gubun !== "survey" &&
                String(r?.lv123code ?? "").trim() !== ""
            );

            // code -> key(Set) 매핑
            const byCode = new Map();
            eligible.forEach(r => {
                const code = String(r.lv123code).trim().toLowerCase();
                const key = keyOf(r);
                const set = byCode.get(code) ?? new Set();
                set.add(key);
                byCode.set(code, set);
            });

            // 중복된 key 모으기
            const dupKeys = new Set();
            byCode.forEach(set => { if (set.size > 1) set.forEach(k => dupKeys.add(k)); });

            // 각 행의 __errors 업데이트 (lv123code만 터치)
            return rows.map(r => {
                const k = keyOf(r);
                const next = { ...r };
                const errs = new Set(next.__errors ?? []);
                const kinds = { ...(next.__errorKinds ?? {}) };
                if (dupKeys.has(k)) {
                    errs.add("lv123code");
                    kinds.lv123code = "dup";           // ← 중복
                } else {
                    errs.delete("lv123code");
                    if (kinds.lv123code) delete kinds.lv123code;
                }
                next.__errors = errs.size ? errs : undefined;
                next.__errorKinds = Object.keys(kinds).length ? kinds : undefined;
                return next;
            });
        }, [keyOf]);

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
                setErrorMarks(new Map());
                // 행 객체 기준으로 바로 __errors 세팅
                setDataState(prevState => {
                    const nextRows = (prevState?.data || []).map(r => {
                        const set = rowMarks.get(r);
                        const kinds = rowKinds.get(r);
                        if (!set) {
                            // if (r.__errors) {
                                const { __errors, ...rest } = r;
                                return rest;              // 이전 에러 제거
                            // }
                            // return r;
                        }
                        return { ...r, __errors: new Set(set), __errorKinds: kinds }; // 표시 대상
                    });
                    return { ...prevState, data: nextRows };
                });
                focusFirstErrorCell();
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
                const res = await optionSaveData.mutateAsync(payload);

                if (res?.success == "777") {
                    setErrorMarks(new Map());   //에러 초기화
                    modal.showAlert("알림", "소분류 드롭다운 목록이 적용되었습니다."); // 성공 팝업 표출
                    onSaved?.();  // ← 미저장 플래그 해제 요청(부모)
                    handleSearch(); // 재조회 
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

        }, [setDataState, setSelectedState]);

        // 부모에서 호출할 수 있도록 ref에 연결
        saveChangesRef.current = saveChanges;

        // 보류 행 회색 처리
        const rowRender = useCallback((trEl, rowProps) => {
            const pending = rowProps?.dataItem?.__pendingDelete === true;
            const cls = `${trEl.props.className || ''} ${pending ? 'row-pending-delete' : ''}`;
            return React.cloneElement(trEl, { ...trEl.props, className: cls });
        }, []);

        // 유효성 체크
        const validateRows = (allRows) => {
            // 1) 저장 대상만 추리기: 삭제 예정/설문(survey) 행 제외
            const rows = (allRows || []).filter(
                (r) => r?.__pendingDelete !== true && r?.ex_gubun !== "survey"
            );

            const errors = [];
            const rowMarks = new WeakMap(); // WeakMap<object, Set<string>>
            const rowKinds = new WeakMap(); // row -> { [field]: 'required'|'dup' };
            const mark = (row, field, message, kind) => {
                const set = rowMarks.get(row) ?? new Set();
                set.add(field);
                rowMarks.set(row, set);

                const kinds = rowKinds.get(row) ?? {};
                if (kind) kinds[field] = kind;
                rowKinds.set(row, kinds);

                if (message) errors.push(message);
            };
            // 2) 단계별 필수 필드 정의
            //    lvcode=1  → 소분류 코드/소분류만 필수
            //    lvcode=2  → 중분류 코드/중분류 + 소분류 코드/소분류 필수
            //    lvcode=3  → 대분류 코드/대분류 + 중분류 코드/중분류 + 소분류 코드/소분류 필수
            const requiredFields =
                lvCode === "1"
                    ? [
                        { f: "lv123code", label: "소분류 코드" },
                        { f: "lv3", label: "소분류" },
                    ]
                    : lvCode === "2"
                        ? [
                            { f: "lv2code", label: "중분류 코드" },
                            { f: "lv2", label: "중분류" },
                            { f: "lv123code", label: "소분류 코드" },
                            { f: "lv3", label: "소분류" },
                        ]
                        : [
                            { f: "lv1code", label: "대분류 코드" },
                            { f: "lv1", label: "대분류" },
                            { f: "lv2code", label: "중분류 코드" },
                            { f: "lv2", label: "중분류" },
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
                    arr.forEach(r => mark(r, "lv123code"));
                    errors.push(`소분류코드 '${code}'가 중복입니다. (행 번호: ${nos})`);
                }
            });
            return { ok: errors.length === 0, errors, rowMarks, rowKinds };
        };

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
                    lv321code: "", // ← 항상 빈값
                    summary: String(r.summary ?? ""),
                    ex_gubun: String(r.ex_gubun ?? "analysis"),
                    lv23code: String(r.lv23code ?? ""),
                    lv123code: String(r.lv123code ?? ""),
                    representative_response: String(r.representative_response ?? ""),
                }));

            return {
                key: "",
                user: "syhong",
                projectnum: "q250089uk",
                qnum: "Z1",
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

        return (
            <Fragment>
                <div className="meta2">
                    <div className="row1">업데이트 날짜: {dataState?.data?.[0]?.update_date ?? '-'}</div>
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
                <div id="grid_01" className="cmn_grid" ref={gridRootRef}>
                    <KendoGrid
                        key={`lv-${lvCode}`}
                        parentProps={{
                            data: dataState?.data,
                            dataItemKey: dataItemKey,
                            editField,
                            onItemChange,
                            selectedState,
                            setSelectedState,
                            idGetter,
                            rowRender,
                            cellRender,
                            onRowClick,
                            sortable: { mode: "multiple", allowUnsort: true }, // 다중 정렬
                            sort,                                 // controlled sort
                            sortChange: (e) => { setSort(e.sort); onPrefsChange?.({ sort: e.sort }); },
                            filterable: true,                                   // 필터 허용
                            filter,                               // controlled filter
                            filterChange: (e) => { setFilter(e.filter); onPrefsChange?.({ filter: e.filter }); },
                        }}
                    >
                        {effectiveColumns.filter(c => c.show !== false).map((c) => {
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
                                                    >
                                                        {pending ? "취소" : "삭제"}
                                                    </Button>
                                                </td>
                                            );
                                        }}
                                    />
                                );
                            }
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
    }

    return (
        <GridData
            dataItemKey={DATA_ITEM_KEY}
            rowNumber={"no"}
            searchMutation={optionEditData}
            menuTitle={MENU_TITLE}
            editField={editField}
            initialParams={{             /*초기파라미터 설정*/
                key: "",
                user: "syhong",
                projectnum: "q250089uk",
                qnum: "Z1",
                gb: "lb",
            }}
            renderItem={(props) => <GridRenderer {...props} />}
        />
    );
});

export default OptionSettingTab2;
