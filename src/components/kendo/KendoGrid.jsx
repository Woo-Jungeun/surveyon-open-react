import { getSelectedState, Grid, GridColumn as Column, GridNoRecords, GridColumnMenuFilter } from "@progress/kendo-react-grid";
import { useCallback, useMemo, Children, useRef, useEffect, cloneElement, useState } from "react";
import PropTypes from "prop-types";
import { Checkbox } from "@progress/kendo-react-inputs";
import { process } from "@progress/kendo-data-query";
/**
 * GridData와 함께 사용하는 KendoGrid 묶음.
 *
 *
 * @author jisu
 * @since 2024.04.30
 * -----------custom props-----------
 * @param parentProps 상위(gridData)에서 넘겨준 데이터를 props로 넘겨주어야 한다.
 * @param processData grid data의 포맷등을 변경할 때 쓸 수 있는 callback
 * ----------------------------------
 * @param children
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
const KendoGrid = ({ parentProps, children, processData }) => {
    const parentData = parentProps?.data || { data: [], totalSize: 0 };
    const sortChange = parentProps?.sortChange;
    const filterChange = parentProps?.filterChange;
    const initialSort = parentProps?.initialSort;
    const initialFilter = parentProps?.initialFilter;
    const page = parentProps?.page;
    const pageChange = parentProps?.pageChange;
    const selectedState = parentProps?.selectedState || {};
    const dataItemKey = parentProps?.dataItemKey;
    const selectedField = parentProps?.selectedField;
    const setSelectedState = parentProps?.setSelectedState;
    const parentIdGetter = parentProps?.idGetter;
    const selectMode = parentProps?.multiSelect ? "multiple" : "single";
    const isPage = parentProps?.isPage;
    const editField = parentProps?.editField;
    const onItemChange = parentProps?.onItemChange;
    const onCellClose = parentProps?.onCellClose;
    const editCell = parentProps?.editCell;
    const height = parentProps?.height;
    //const processedData = parentProps?.data ?? [];
    const columnVirtualization = parentProps?.columnVirtualization ?? false;
    const cellRender = parentProps?.cellRender;
    // 원본 배열
    const rawData = Array.isArray(parentProps?.data) ? parentProps.data : [];

    // 클라이언트 처리(로컬 정렬/필터/페이징) 여부: 서버 정렬/필터 쓰면 false로 넘겨주세요.
    const useClientProcessing =
        parentProps?.useClientProcessing ??
        (parentProps?.filterable ?? parentProps?.sortable ?? true);

    // Grid 상태 (정렬/필터/페이징)
    const [gridState, setGridState] = useState({
        sort: initialSort ?? [],
        filter: initialFilter ?? undefined,
        skip: 0,
        take: rawData.length, // 페이징 미사용시 전체
    });

    // 데이터 길이 변하면 take 동기화
    useEffect(() => {
        setGridState(s => ({ ...s, take: rawData.length }));
    }, [rawData.length]);

    // 화면에 뿌릴 데이터 (클라처리면 process, 아니면 그대로)
    const processedData = useMemo(
        () => (useClientProcessing ? process(rawData, gridState) : rawData),
        [rawData, gridState, useClientProcessing]
    );
    const rowRender = parentProps?.rowRender;
    const linkRowClickToSelection =
        parentProps?.linkRowClickToSelection ?? true; // 기본값: true (행 클릭 시 체크박스도 선택/해제됨)
    const selectionHeaderTitle = parentProps?.selectionHeaderTitle ?? "";   //체크박스 헤더 라벨 
    const idGetter = useCallback(
        (item) => (typeof parentIdGetter === "function" ? parentIdGetter(item) : item?.[dataItemKey]),
        [parentIdGetter, dataItemKey]
    );
    // 체크박스에서 발생한 이벤트인지 판별
    const isFromCheckbox = (evt) => !!evt?.syntheticEvent?.target?.closest?.('input[type="checkbox"]');

    // linkRowClickToSelection=false면 체크박스 클릭에만 반응
    const onSelectionChange = (event) => {
        if (!linkRowClickToSelection && !isFromCheckbox(event)) return;
        if (typeof setSelectedState !== "function") return; // 내부에서 setSelectedState가 없으면 호출하지 않게 막기
        const newSelectedState = getSelectedState({
            event,
            selectedState,
            dataItemKey
        });
        setSelectedState(newSelectedState);
    };

    // 헤더 체크박스 클릭 시 핸들러 
    const onHeaderSelectionChange = useCallback((event) => {
        // 부모에서 직접 처리하도록 허용
        if (typeof parentProps?.onHeaderSelectionChange === "function") {
            parentProps.onHeaderSelectionChange(event);
            return;
        }
        const checked = event.syntheticEvent.target.checked;
        const newSelectedState = {};
        const items = Array.isArray(event.dataItems)
            ? event.dataItems
            : (event.dataItems?.data ?? []);        // ← 안전 정규화
        items.forEach((item) => {
            const key = idGetter(item);
            if (key !== undefined) newSelectedState[key] = checked;
        });
        setSelectedState(newSelectedState);
    }, [setSelectedState, idGetter]);

    // 체크박스 클릭이면 onRowClick은 항상 무시 (편집/활성 충돌 방지)
    const onRowClickWrapper = (event) => {
        if (isFromCheckbox(event)) return;
        parentProps?.onRowClick?.(event);
    };
    // 👉 Grid에 넘긴 processedData가 배열/혹은 DataResult일 수 있으므로 항상 배열로 정규화
    const viewItems = useMemo(
        () => (Array.isArray(processedData) ? processedData : (processedData?.data ?? [])),
        [processedData]
    );
    // 헤더 체크박스 클릭 여부 
    const headerSelectionValue = useMemo(() => {
        return (
            viewItems.length > 0 &&
            viewItems.every((item) => selectedState[idGetter(item)])
        );
    }, [processedData, selectedState, idGetter]);

    //헤더 인디터미넌트 계산(일부만 체크)
    const headerSomeSelected = (viewItems.some((item) => selectedState[idGetter(item)]) && !headerSelectionValue);
    // 헤더 체크박스 상태 계산 (중복 제외 기준)
    const validItems = viewItems.filter((item) => !item.isDuplicate);
    const allChecked = validItems.length > 0 && validItems.every((item) => selectedState[idGetter(item)]);
    const someChecked = validItems.some((item) => selectedState[idGetter(item)]) && !allChecked;

    // 트리를 보존하면서 재귀적으로 key만 부여
    const addKeysRecursively = (nodes) =>
        Children.map(nodes, (node, idx) => {
            if (!node || typeof node !== 'object') return node;
            const safeKey =
                node.key ?? (node.props?.field ? `col:${node.props.field}` : `col-idx:${idx}`);
            return cloneElement(
                node,
                { key: safeKey },
                node.props?.children ? addKeysRecursively(node.props.children) : undefined
            );
        });

    let childColsTree = addKeysRecursively(children);
    // 멀티선택이면: 헤더셀 정의 -> selectionCol 생성 -> 루트 레벨에 삽입
    if (parentProps?.multiSelect) {
        const SelectionHeaderCell = () => {
            const ref = useRef(null);
            useEffect(() => {
                if (ref.current) ref.current.indeterminate = someChecked;
            }, [someChecked]);
            const stop = (e) => e.stopPropagation();

            return (
                <div
                    onClick={stop}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        width: '100%',
                    }}
                >
                    <span>{selectionHeaderTitle}</span>
                    <div className="k-checkbox-wrap">
                        <input
                            ref={ref}
                            type="checkbox"
                            className="k-checkbox"
                            checked={allChecked}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                if (typeof parentProps?.onHeaderSelectionChange === "function") {
                                    parentProps.onHeaderSelectionChange({
                                        syntheticEvent: { target: { checked } },
                                        dataItems: validItems,
                                    });
                                    return;
                                }
                                const next = {};
                                viewItems.forEach((item) => {
                                    const key = idGetter(item);
                                    if (!key) return;
                                    if (item.isDuplicate) next[key] = false;
                                    else next[key] = checked;
                                });
                                setSelectedState(next);
                            }}
                            aria-label="Select all rows"
                        />
                    </div>
                </div>
            );
        };

        const selectionCol = (
            <Column
                key="__selection_col"
                field={selectedField}
                width={parentProps?.selectionColumnWidth ?? "120px"}
                headerCell={SelectionHeaderCell}
                sortable={false}
                filterable={false}
                columnMenu={undefined}
            />
        );

        // 루트 레벨에만 삽입
        const roots = Children.toArray(childColsTree);
        const afterField = parentProps?.selectionColumnAfterField;
        const atIndex = parentProps?.selectionColumnIndex;

        let insertAt = 0;
        if (typeof atIndex === 'number') {
            insertAt = Math.max(0, Math.min(roots.length, atIndex));
        } else if (afterField) {
            const i = roots.findIndex((c) => c?.props?.field === afterField);
            insertAt = i >= 0 ? i + 1 : 0;
        }

        roots.splice(insertAt, 0, selectionCol);
        childColsTree = roots;
    }

    return (
        <Grid
            scrollable="scrollable"
            style={{ height: height || "625px" }}
            data={processedData}
            // 클라이언트 처리 모드일 때만 내부 gridState 바인딩
            {...(useClientProcessing ? gridState : {})}
            onDataStateChange={useClientProcessing ? (e) => {
                setGridState(e.dataState);

                // 부모에도 반영 (persistedPrefs 갱신용)
                sortChange?.({ sort: e.dataState.sort ?? [] });
                filterChange?.({ filter: e.dataState.filter ?? undefined });
            } : undefined}

            sortable={parentProps?.sortable ?? { mode: 'multiple', allowUnsort: true }}
            filterable={parentProps?.filterable ?? true}
            rowRender={rowRender}
            dataItemKey={dataItemKey}
            selectedField={selectedField}
            selectable={{ enabled: true, mode: selectMode }}
            onSelectionChange={onSelectionChange}
            onHeaderSelectionChange={onHeaderSelectionChange}
            editField={editField}
            onItemChange={onItemChange}
            onRowClick={onRowClickWrapper}
            onCellClose={onCellClose}
            editCell={editCell}
            columnVirtualization={columnVirtualization}
            cellRender={cellRender}
            // 서버/외부 제어 모드일 때만 다시 붙여주기
            {
            ...(!useClientProcessing ? {
                sort,
                filter,
                pageable: isPage ? { info: false } : false,
                onSortChange: sortChange,
                skip: page?.skip,
                take: page?.take,
                total: parentData?.totalSize,
                onPageChange: pageChange,
            } : {})
            }
        // {...props}
        >
            {/* {parentProps.multiSelect ? (
                <Column
                    field={selectedField}
                    width={"40px"}
                    headerSelectionValue={headerSelectionValue}
                    onHeaderSelectionChange={onHeaderSelectionChange}
                    sortable={false}
                />
            ) : null} */}
            <GridNoRecords>
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                    조회된 데이터가 없습니다.
                    {parentProps?.noRecordsExtra && (
                        <div style={{ marginTop: "10px" }}>
                            {parentProps.noRecordsExtra}
                        </div>
                    )}
                </div>
            </GridNoRecords>
            {childColsTree}
        </Grid>
    );
};

export default KendoGrid;

KendoGrid.propTypes = {
    parentProps: PropTypes.object.isRequired
};
