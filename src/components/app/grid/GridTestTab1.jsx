import React, { Fragment, useEffect, useState, useRef, useCallback, useMemo } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column, GridColumnMenuFilter } from "@progress/kendo-react-grid";
import { GridTestApi } from "@/components/app/grid/GridTestApi.js";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { Button } from "@progress/kendo-react-buttons";
import CustomDropDownList from "@/components/kendo/CustomDropDownList.jsx";
import "@/components/app/grid/GridTest.css";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';

/**
 * 그리드 > 테스트 그리드 > 응답 데이터
 *
 * @author jewoo
 * @since 2024-08-11<br />
 */

const GridTestTab1 = () => {
    const DATA_ITEM_KEY = ["fixed_key", "cid"];
    const MENU_TITLE = "테스트 그리드 탭1";
    const SELECTED_FIELD = "selected";
    const { getSampleData } = GridTestApi();
    const [editField] = useState("inEdit");

    /**
     * 숨김처리 여부 allowHide (true/false)
     * 편집 가능 여부 editable(true/false)
    */
    const [columns, setColumns] = useState([
        { field: "fixed_key", title: "키", show: true, editable: false },
        { field: "cid", title: "멀티", show: true, editable: false, width: "100px" },
        { field: "answer_origin", title: "원본내용", show: true, editable: false },
        { field: "answer", title: "응답내용", show: true, editable: false },
        { field: "lv1", title: "대분류", show: true, editable: false },
        { field: "lv2", title: "중분류", show: true, editable: false },
        { field: "lv3", title: "소분류", show: true, editable: true, width: "200px" },
        { field: "lv123code", title: "lv123", show: true, editable: false },
        { field: "lv23code", title: "lv23", show: true, editable: false },
        { field: "sentiment", title: "sentiment", show: true, editable: true, width: "150px", allowHide: false },
        { field: "add", title: "추가", show: true, editable: true, allowHide: false }
    ]);
    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = (menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={columns}
            onColumnsChange={setColumns}
        />
    );

    // 검증 드롭다운 데이터
    const sentimentOptions = useMemo(
        () => [
            { codeId: "neutral", codeName: "neutral" },
            { codeId: "positive", codeName: "positive" },
            { codeId: "negative", codeName: "negative" }
        ],
        []
    );

    // 소분류 드롭다운 데이터 + 메타 기능
    const [lv3Options, setLv3Options] = useState([]);
    useEffect(() => {
        getSampleData.mutateAsync({
            params: {
                user: "syhong",
                projectnum: "q250089uk",
                qnum: "A2-2",
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
                        lv23code: r?.lv23code ?? "",
                    });
                    return acc;
                }, []);
            setLv3Options(list);
        })
            .catch(() => setLv3Options([]));
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
            dataItemKey } = props;

        // 키 가져오기 헬퍼 
        const getKey = useCallback((row) => {
            if (typeof idGetter === "function") return idGetter(row);     // (__rowKey 포함)
            return row?.[dataItemKey];                                    // 단일키 필드
        }, [idGetter, dataItemKey]);

        /** ===== 소분류 셀: 엑셀식 선택 + 드롭다운 ===== */
        const [lv3SelKeys, setLv3SelKeys] = useState(new Set()); // 선택된 행키 집합(소분류 전용)
        const [lv3EditorKey, setLv3EditorKey] = useState(null);  // 드롭다운 보여줄 "대표" 셀의 키
        const draggingRef = useRef(false);
        const anchorIndexRef = useRef(null);
        const lastIndexRef = useRef(null);
        const lastFocusedKeyRef = useRef(null);
        const selectionModeRef = useRef(null);// 선택 동작 모드: 'drag' | 'range' | 'toggle'


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


        // 마우스 다운: Ctrl(=toggle) / Shift(=range) / 그 외(=drag)
        const onLv3MouseDown = useCallback((idx, e, row) => {
            e.currentTarget?.focus();   // 클릭한 td에 포커스
            const key = getKey(row);
            lastFocusedKeyRef.current = key;   // 마지막 포커스 셀 기억
            setLv3EditorKey(null); // 새 동작 시작하면 에디터 닫기

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

        // 드래그 중 셀 진입 → 범위 갱신
        const onLv3MouseEnter = useCallback((idx) => {
            if (!draggingRef.current || anchorIndexRef.current == null) return;
            lastIndexRef.current = idx;
            rangeToKeys(anchorIndexRef.current, idx);
        }, [rangeToKeys]);

        // mouseup(드래그 종료): 드래그로 선택했을 때만 에디터 자동 오픈
        useEffect(() => {
            const end = () => {
                if (!draggingRef.current) return;
                draggingRef.current = false;

                if (selectionModeRef.current === 'drag') {
                    const i = lastIndexRef.current ?? anchorIndexRef.current;
                    const row = dataState?.data?.[i];
                    setLv3EditorKey(row ? getKey(row) : null);
                }
                selectionModeRef.current = null;
            };
            window.addEventListener('mouseup', end);
            return () => window.removeEventListener('mouseup', end);
        }, [dataState?.data, getKey]);

        // 전역 Enter 리스너 추가
        useEffect(() => {
            const onKey = (e) => {
                if (e.key !== 'Enter') return;// 입력창/드롭다운 포커스면 무시
                const tag = document.activeElement?.tagName?.toLowerCase();
                if (['input', 'select', 'textarea'].includes(tag)) return;
                if (lv3EditorKey != null) return; // 이미 열려있으면 무시

                // 우선순위: (선택 영역의 마지막 인덱스) → (마지막 포커스 셀)
                const i = lastIndexRef.current ?? anchorIndexRef.current;
                let targetKey = null;

                if (lv3SelKeys.size > 0 && i != null && dataState?.data?.[i]) {
                    targetKey = getKey(dataState.data[i]);
                } else {
                    targetKey = lastFocusedKeyRef.current;
                }
                if (!targetKey) return;

                e.preventDefault();
                e.stopPropagation();
                requestAnimationFrame(() => setLv3EditorKey(targetKey));
            };
            // 캡처 단계로 등록해야 Kendo의 내부 핸들러보다 먼저 잡음
            window.addEventListener('keydown', onKey, true);
            return () => window.removeEventListener('keydown', onKey, true);
        }, [lv3SelKeys, lv3EditorKey, dataState?.data, getKey]);


        // 드롭다운이 열렸을 때 바깥 클릭하면 닫기
        useEffect(() => {
            const handleDocMouseDown = (e) => {
                if (lv3EditorKey == null) return; // 안 열려있으면 무시
                const t = e.target;
                // 셀 안 드롭다운 영역(lv3-editor) or 팝업 영역(lv3-popup) 클릭이면 유지
                if (t.closest('.lv3-editor') || t.closest('.lv3-popup')) return;
                setLv3EditorKey(null); // 바깥 클릭 → 닫기
            };
            // 캡처 단계에서 등록해야 Kendo 내부 핸들러보다 먼저 잡힘
            document.addEventListener('mousedown', handleDocMouseDown, true);
            return () => document.removeEventListener('mousedown', handleDocMouseDown, true);
        }, [lv3EditorKey]);

        // 일괄 적용 (선택된 키들에 옵션 메타까지 모두 반영)
        const applyLv3To = useCallback((targetKeys, opt) => {
            setDataState((prev) => ({
                ...prev,
                data: prev.data.map((r) =>
                    targetKeys.has(getKey(r))
                        ? {
                            ...r,
                            lv3: opt?.codeId ?? "",
                            lv1: opt?.lv1 ?? "",
                            lv2: opt?.lv2 ?? "",
                            lv123code: opt?.lv123code ?? "",
                            lv23code: opt?.lv23code ?? "",
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
            const key = getKey(row);
            setDataState(prev => ({
                ...prev,
                data: prev.data.map(r => (getKey(r) === key ? { ...r, [field]: value } : r)),
            }));
        }, [getKey, setDataState]);

        // 새 행의 키 생성
        const makeRowKey = useCallback((row) => {
            if (Array.isArray(DATA_ITEM_KEY)) {
                return DATA_ITEM_KEY
                    .map(k => encodeURIComponent(String(row?.[k] ?? "")))
                    .join("__");
            }
            return row?.[DATA_ITEM_KEY];
        }, []);

        // 기존 코드 교체
        const handleAddButton = useCallback((cellProps) => {
            const clicked = cellProps.dataItem;
            const current = [...(dataState?.data ?? [])];// 현재 데이터 복사
            const clickedKey = getKey(clicked); // 선택 행 키는 공통 헬퍼로
            setSelectedRowKey(clickedKey); // sentiment 드롭다운 on/off 기준

            // 클릭한 행의 인덱스 찾기 (합성키도 OK)
            const idx = current.findIndex(r => getKey(r) === clickedKey);
            if (idx === -1) return;

            // 새 행 기본값
            const newRow = {
                fixed_key: clicked?.fixed_key,
                cid: (Number(clicked?.cid) || 0) + 1,
                answer_origin: clicked?.answer_origin,
                answer: clicked?.answer,
                lv1: "", lv2: "", lv3: "",
                lv123code: "", lv23code: "",
                sentiment: "",
                selected: false,
                ip: "",
                inEdit: true, // 새 행 편집 모드
            };

            // 그리드가 합성키 모드면(__rowKey) 새 행에도 키 주입
            if (dataItemKey === "__rowKey") {
                newRow.__rowKey = makeRowKey(newRow);
            }

            // 클릭한 행 아래에 삽입
            current.splice(idx + 1, 0, newRow);

            // 상태 반영
            setDataState(prev => ({ ...prev, data: current }));

            // 새로 추가한 행을 선택 대상으로 지정 (드롭다운 enable)
            const newKey = dataItemKey === "__rowKey" ? newRow.__rowKey : newRow[dataItemKey];
            setSelectedRowKey(newKey);
        }, [dataState?.data, getKey, dataItemKey, makeRowKey, setDataState, setSelectedRowKey]);

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

        // 클릭된 행을 강조(hover처럼 유지)
        const rowRender = useCallback((trEl, rowProps) => {
            const clicked =
                rowProps?.dataItem?.inEdit === true ||
                getKey(rowProps?.dataItem) === selectedRowKey;
            const cls = `${trEl.props.className || ''} ${clicked ? 'k-selected row-active' : ''}`;

            return React.cloneElement(trEl, { ...trEl.props, className: cls });
        }, [selectedRowKey, getKey]);

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
        const gridElRef = useRef(null);

        //전체 데이터 기준으로 정렬 체크박스 목록을 보여주기
        const allRowsRef = useRef([]);
        useEffect(() => {
            const cur = dataState?.data ?? [];
            if (cur.length && allRowsRef.current.length === 0) {
                allRowsRef.current = cur; // 최초 로드본을 전체로 쓸 때
            }
        }, [dataState?.data]);

        return (
            <Fragment>
                <p className="totalTxt">
                    총 <i className="fcGreen">{dataState?.data?.length || 0}</i>개
                </p>
                <div id="grid_01" ref={gridElRef} className={`cmn_grid ${hasLv3CellSelection ? "lv3-cell-select" : ""} ${lv3EditorKey ? "lv3-dd-open" : ""}`}>
                    <KendoGrid
                        parentProps={{
                            data: dataState?.data,
                            dataItemKey: dataItemKey,
                            editField,
                            onItemChange,
                            onRowClick,
                            selectedField: SELECTED_FIELD, // 체크박스 필드 지정 
                            selectedState,
                            setSelectedState,
                            idGetter,
                            multiSelect: true,
                            selectionColumnAfterField: "sentiment", // 체크박스 선택 컬럼을 원하는 위치에 삽입 
                            linkRowClickToSelection: false, // 행 클릭과 체크박스 선택 연동X 
                            selectionHeaderTitle: "검증",   // 체크박스 헤더에 컬럼명 표출할 경우
                            rowRender,
                            sortable: { mode: "multiple", allowUnsort: true }, // 다중 정렬
                            filterable: true,                                   // 필터 허용
                        }}
                    >
                        {columns.filter(c => c.show !== false).map((c) => {
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
                                            const showEditor = lv3EditorKey === rowKey;     // 드롭다운 표시할 대표 셀
                                            const currentValue = cellProps.dataItem.lv3 ?? "";
                                            const selectedOption = lv3Options.find(o => o.codeId === currentValue) ?? null;

                                            const baseStyle = {
                                                userSelect: "none",
                                                cursor: "default",
                                                outline: "none",
                                            };

                                            // Enter로 에디터 열기(특히 Ctrl/Shift 범위 선택 후)
                                            const handleKeyDown = (e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    // 선택된 게 있으면 마지막 인덱스 기준, 없으면 현재 셀 기준
                                                    const i = (lv3SelKeys.size > 0 && (lastIndexRef.current ?? anchorIndexRef.current));
                                                    const targetKey =
                                                        (i != null && dataState?.data?.[i]) ? getKey(dataState.data[i]) : rowKey;
                                                    setLv3EditorKey(targetKey);
                                                }
                                            };

                                            if (showEditor) {
                                                // --- 에디터 모드: 드롭다운 즉시 오픈 ---
                                                return (
                                                    <td style={baseStyle}>
                                                        <span
                                                            className="lv3-editor"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <DropDownList
                                                                opened={true}
                                                                data={lv3Options}
                                                                dataItemKey="codeId"
                                                                textField="codeName"
                                                                value={selectedOption}
                                                                popupSettings={{ appendTo: document.body, className: 'lv3-popup' }}
                                                                onChange={(e) => {
                                                                    const opt = e?.value; // 선택된 옵션 객체 전체
                                                                    const targets = lv3SelKeys.size ? lv3SelKeys : new Set([rowKey]);
                                                                    applyLv3To(targets, opt);  // 메타 포함 일괄 반영
                                                                    setLv3EditorKey(null);     // 닫기
                                                                }}
                                                                onClose={() => setLv3EditorKey(null)} // ESC 등으로 닫힘
                                                            />
                                                        </span>
                                                    </td>
                                                );
                                            }

                                            // --- 표시 모드: 텍스트만 ---
                                            return (
                                                <td
                                                    className={isSelectedCell ? "lv3-selected" : undefined} //  강조
                                                    tabIndex={0}
                                                    onMouseDown={(e) => onLv3MouseDown(cellProps.dataIndex, e, cellProps.dataItem)}
                                                    onMouseEnter={() => onLv3MouseEnter(cellProps.dataIndex)}
                                                    onKeyDown={handleKeyDown}   // Enter로 오픈
                                                    style={baseStyle}
                                                    title={currentValue}
                                                >
                                                    {currentValue}
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
                                            const isDisabled = rowKey !== selectedRowKey;              // 선택된 행만 활성
                                            const selectedOption =
                                                sentimentOptions.find(o => o.codeId === (cellProps.dataItem.sentiment ?? "")) ?? null;
                                            return (
                                                <td>
                                                    <CustomDropDownList
                                                        // disabled={isDisabled}
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
                                        columnMenu={columnMenu}
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
                </div>
            </Fragment>
        );
    }

    return (
        <GridData
            dataItemKey={DATA_ITEM_KEY}
            searchMutation={getSampleData}
            selectedField={SELECTED_FIELD}
            multiSelect={false}
            editField={editField}
            menuTitle={MENU_TITLE}
            initialParams={{             /*초기파라미터 설정*/
                user: "syhong",
                projectnum: "q250089uk",
                qnum: "A2-2",
                gb: "in",
            }}
            renderItem={(props) => <GridRenderer {...props} />}

        />
    );
};

export default GridTestTab1;
