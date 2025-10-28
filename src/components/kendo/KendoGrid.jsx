import { getSelectedState, Grid, GridColumn as Column, GridNoRecords } from "@progress/kendo-react-grid";
import { useCallback, useMemo, Children, useRef, useEffect, cloneElement } from "react";
import PropTypes from "prop-types";
import { process } from "@progress/kendo-data-query";

/**
 * GridData와 함께 사용하는 KendoGrid (정렬/필터는 ExcelColumnMenu로 관리)
 *
 * @author jewoo
 * @since 2025-10
 */
const KendoGrid = ({ parentProps, children }) => {
    const parentData = Array.isArray(parentProps?.data)
        ? { data: parentProps.data, totalSize: parentProps?.data?.length ?? 0 }
        : (parentProps?.data || { data: [], totalSize: 0 });

    // sort/filter는 상위(MainList)에서 관리 (ExcelColumnMenu)
    const sortChange = parentProps?.sortChange;
    const filterChange = parentProps?.filterChange;
    const sort = parentProps?.initialSort ?? [];
    const filter = parentProps?.initialFilter ?? undefined;

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
    const columnVirtualization = parentProps?.columnVirtualization ?? false;
    const cellRender = parentProps?.cellRender;
    const rowRender = parentProps?.rowRender;
    const linkRowClickToSelection = parentProps?.linkRowClickToSelection ?? true; // 기본값: true (행 클릭 시 체크박스도 선택/해제됨)
    const selectionHeaderTitle = parentProps?.selectionHeaderTitle ?? "";   //체크박스 헤더 라벨 

    // 클라이언트 정렬/필터 적용 (API 호출 없이)
    const processedData = useMemo(() => {
        if (!Array.isArray(parentData.data)) return { data: [], total: 0 };
        try {
            return process(parentData.data, { sort, filter });
        } catch (err) {
            console.warn("process error", err);
            return { data: parentData.data, total: parentData.data.length };
        }
    }, [parentData.data, sort, filter]);

    const idGetter = useCallback(
        (item) =>
            typeof parentIdGetter === "function"
                ? parentIdGetter(item)
                : item?.[dataItemKey],
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
            : (event.dataItems?.data ?? []);
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

    // 헤더 체크박스 계산
    const validItems = useMemo(() => {
        return (processedData.data ?? []).filter((item) => !item.isDuplicate);
    }, [processedData.data]);
    const allChecked =
        validItems.length > 0 &&
        validItems.every((item) => selectedState[idGetter(item)]);
    const someChecked =
        validItems.some((item) => selectedState[idGetter(item)]) && !allChecked;

    // 컬럼 key 안정화 로직 유지
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

    // 멀티 선택 헤더
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
                                processedData.data.forEach((item) => {
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
            data={processedData.data}

            sortable={parentProps?.sortable ?? { mode: 'multiple', allowUnsort: true }}
            filterable={parentProps?.filterable ?? true}
            sort={sort}
            filter={filter}
            onSortChange={sortChange}          // setSort와 연결됨
            onFilterChange={filterChange}      // setFilter와 연결됨

            pageable={isPage ? { info: false } : false}
            skip={page?.skip}
            take={page?.take}
            total={processedData.total}
            onPageChange={pageChange}

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
        >
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
