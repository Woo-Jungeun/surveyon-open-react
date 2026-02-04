import { getSelectedState, Grid, GridColumn as Column, GridNoRecords } from "@progress/kendo-react-grid";
import { useCallback, useMemo, Children, useRef, useEffect, cloneElement, useState } from "react";
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

    const rawData = parentData.data || [];
    const initialTotal = parentData.totalSize ?? rawData.length;

    // sort/filter는 상위(MainList)에서 관리 (ExcelColumnMenu)
    const sortChange = parentProps?.sortChange;
    const filterChange = parentProps?.filterChange;
    const sort = parentProps?.sort ?? parentProps?.initialSort ?? [];
    const filter = parentProps?.filter ?? parentProps?.initialFilter ?? undefined;

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
    const onProcessedDataUpdate = parentProps?.onProcessedDataUpdate;
    const scrollable = parentProps?.scrollable ?? "scrollable";
    const rowHeight = parentProps?.rowHeight;

    /** ---------- key resolver ---------- */
    const idGetter = useCallback(
        (item) =>
            typeof parentIdGetter === "function"
                ? parentIdGetter(item)
                : item?.[dataItemKey],
        [parentIdGetter, dataItemKey]
    );

    /** ---------- 화면에 실제로 표시할 데이터 ---------- */
    const [viewData, setViewData] = useState(rawData);
    const [viewTotal, setViewTotal] = useState(initialTotal);

    // selectedState(map)를 실제 row 객체의 selectedField에 주입
    const dataWithSelection = useMemo(() => {
        if (!selectedField || !dataItemKey) return viewData;
        if (!selectedState) return viewData;

        const keys = Object.keys(selectedState);
        // 선택된 key가 하나도 없고, viewData에도 selected true인 애가 없다면 그대로 반환
        if (keys.length === 0) {
            const hasSelectedRow = (viewData || []).some(
                (item) => item && item[selectedField]
            );
            if (!hasSelectedRow) return viewData;
        }

        const next = (viewData || []).map((item) => {
            const key = idGetter(item);
            const isSelected = !!selectedState[key];

            if (item[selectedField] === isSelected) return item;
            return {
                ...item,
                [selectedField]: isSelected,
            };
        });

        return next;
    }, [viewData, selectedState, selectedField, idGetter, dataItemKey]);

    // 마지막으로 정렬/필터 적용한 상태 기억
    const sortKeyRef = useRef(JSON.stringify(sort || []));
    const filterKeyRef = useRef(JSON.stringify(filter ?? null));

    // 현재 화면 순서 (key 배열)
    const orderRef = useRef([]);
    const initializedRef = useRef(false);

    // 함수 의존성 때문에 루프 안 돌게 ref로 래핑
    const idGetterRef = useRef(idGetter);
    useEffect(() => {
        idGetterRef.current = idGetter;
    }, [idGetter]);

    const onProcessedDataUpdateRef = useRef(onProcessedDataUpdate);
    useEffect(() => {
        onProcessedDataUpdateRef.current = onProcessedDataUpdate;
    }, [onProcessedDataUpdate]);

    const pinnedBottomPredicate = parentProps?.pinnedBottomPredicate;

    useEffect(() => {
        const data = rawData;

        // 1) Pinned vs Unpinned 분리
        let pinned = [];
        let unpinned = [];

        if (typeof pinnedBottomPredicate === "function") {
            pinned = [];
            unpinned = [];
            for (const item of data) {
                if (pinnedBottomPredicate(item)) {
                    pinned.push(item);
                } else {
                    unpinned.push(item);
                }
            }
        } else {
            unpinned = data;
        }

        // sort/filter 내용 기준으로 변경 여부 판단
        const nextSortKey = JSON.stringify(sort || []);
        const nextFilterKey = JSON.stringify(filter ?? null);
        const sortChanged = sortKeyRef.current !== nextSortKey;
        const filterChanged = filterKeyRef.current !== nextFilterKey;

        // 공통 헬퍼: 정렬된 목록(sortedAll)에 필터만 적용
        const applyFilterOnly = (sortedAll) => {
            if (!filter) {
                return {
                    data: sortedAll,
                    total: sortedAll.length,
                };
            }
            try {
                const filtered = process(sortedAll, { filter });
                const filteredData = filtered.data || [];
                return {
                    data: filteredData,
                    total: filtered.total ?? filteredData.length,
                };
            } catch (err) {
                console.warn("process filter error", err);
                return {
                    data: sortedAll,
                    total: sortedAll.length,
                };
            }
        };

        // 처음 로드이거나, 정렬/필터가 내용상 바뀐 경우 (Unpinned 대상)
        if (!initializedRef.current || sortChanged || filterChanged) {
            initializedRef.current = true;
            sortKeyRef.current = nextSortKey;
            filterKeyRef.current = nextFilterKey;

            let sortedUnpinned = [];
            if (Array.isArray(unpinned)) {
                if (sort && sort.length) {
                    // 정렬만 수행
                    try {
                        const sorted = process(unpinned, { sort });
                        sortedUnpinned = sorted.data || [];
                    } catch (err) {
                        console.warn("process sort error", err);
                        sortedUnpinned = unpinned.slice();
                    }
                } else {
                    sortedUnpinned = unpinned.slice();
                }
            }

            // Unpinned 정렬된 순서를 기억 (필터 적용 전 순서)
            orderRef.current = sortedUnpinned.map((item) => idGetterRef.current(item));

            // 필터 적용 (Unpinned만)
            const { data: finalUnpinned, total: unpinnedTotal } = applyFilterOnly(sortedUnpinned);

            // 최종: Unpinned(필터됨) + Pinned(그대로)
            const finalData = [...finalUnpinned, ...pinned];
            const finalTotal = unpinnedTotal + pinned.length;

            setViewData(finalData);
            setViewTotal(finalTotal);
            onProcessedDataUpdateRef.current?.(finalData);
            return;
        }

        // 정렬/필터는 그대로인데 "데이터만" 바뀐 경우
        //    → 기존 정렬 순서(orderRef)를 유지한 채 값만 새 데이터로 교체,
        //       그 다음에 필터만 다시 적용
        const prevKeySet = new Set(orderRef.current || []);

        const keyToRow = new Map();   // 이전에도 있던 행들
        const afterMap = new Map();   // 기존행 key -> [그 뒤에 붙일 신규 행들...]
        const orphans = [];           // 기준 없이 떠 있는 신규행 (나중에 맨 뒤)

        // Unpinned 데이터만 순서 유지 로직 적용
        for (let i = 0; i < unpinned.length; i++) {
            const row = unpinned[i];
            const k = idGetterRef.current(row);
            if (k == null) continue;

            if (prevKeySet.has(k)) {
                keyToRow.set(k, row);
            } else {
                const prevRow = i > 0 ? unpinned[i - 1] : null;
                const prevKey = prevRow ? idGetterRef.current(prevRow) : null;

                if (prevKey && prevKeySet.has(prevKey)) {
                    if (!afterMap.has(prevKey)) afterMap.set(prevKey, []);
                    afterMap.get(prevKey).push(row);
                } else {
                    orphans.push(row);
                }
            }
        }

        const sortedUnpinned = [];

        // 기준 없던 신규행도 맨 앞
        for (const row of orphans) {
            sortedUnpinned.push(row);
        }

        // 기존 순서를 따라가면서, 각 행 뒤에 붙기로 한 신규행도 같이 밀어 넣기
        for (const baseKey of orderRef.current || []) {
            const baseRow = keyToRow.get(baseKey);
            if (!baseRow) continue;

            sortedUnpinned.push(baseRow);
            keyToRow.delete(baseKey);

            const attached = afterMap.get(baseKey);
            if (attached) {
                for (const r of attached) {
                    sortedUnpinned.push(r);
                }
            }
        }

        // 혹시 orderRef에 없던 기존 행이 남아 있으면 그냥 뒤에
        for (const row of keyToRow.values()) {
            sortedUnpinned.push(row);
        }

        // 새 순서를 기준으로 다시 저장 (다음 변경 때 기준)
        orderRef.current = sortedUnpinned.map(item => idGetterRef.current(item));

        const { data: finalUnpinned, total: unpinnedTotal } = applyFilterOnly(sortedUnpinned);

        // 최종: Unpinned(필터됨) + Pinned(그대로)
        const finalData = [...finalUnpinned, ...pinned];
        const finalTotal = unpinnedTotal + pinned.length;

        setViewData(finalData);
        setViewTotal(finalTotal);
        onProcessedDataUpdateRef.current?.(finalData);
    }, [rawData, sort, filter, parentProps?.pinnedBottomPredicate]);

    /** ---------- 선택(행/체크박스) 처리 ---------- */
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
    const parentHeaderSelectionChange = parentProps?.onHeaderSelectionChange;

    const onHeaderSelectionChange = useCallback((event) => {
        // 부모에서 직접 처리하도록 허용
        if (typeof parentHeaderSelectionChange === "function") {
            parentHeaderSelectionChange(event);
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
    }, [setSelectedState, idGetter, parentHeaderSelectionChange]);

    // 체크박스 클릭이면 onRowClick은 항상 무시 (편집/활성 충돌 방지)
    const onRowClickWrapper = (event) => {
        if (isFromCheckbox(event)) return;
        parentProps?.onRowClick?.(event);
    };

    // 헤더 체크박스 계산
    const validItems = useMemo(
        () => (viewData ?? []).filter((item) => !item.isDuplicate),
        [viewData]
    );
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
                                // 이전 선택 상태 유지하면서 현재 페이지만 업데이트
                                const next = { ...selectedState };
                                // viewData는 이미 현재 페이지 데이터만 포함
                                (viewData || []).forEach((item) => {
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

    const currentSkip = parentProps?.skip ?? page?.skip;
    const currentTake = parentProps?.pageSize ?? page?.take;
    const currentTotal = parentProps?.total ?? viewTotal;

    // Virtual Scrolling일 때 Local Data slicing 처리 OR Pagination일 때 Local Data slicing
    let gridData = dataWithSelection;
    if (Array.isArray(parentProps?.data) && currentTake > 0) {
        // 데이터가 페이지 사이즈보다 크면 슬라이싱 (Local Data Pagination)
        // 이미 서버 등에서 잘려서 온 경우(server-side paging)에는 length <= take일 것이므로 영향 없음
        if (gridData.length > currentTake) {
            gridData = gridData.slice(currentSkip, currentSkip + currentTake);
        }
    }

    return (
        <Grid
            scrollable={scrollable}
            style={{ height: height || "625px" }}
            data={gridData}
            sortable={parentProps?.sortable ?? { mode: 'multiple', allowUnsort: true }}
            filterable={parentProps?.filterable ?? true}
            sort={sort}
            filter={filter}
            onSortChange={sortChange}          // setSort와 연결됨
            onFilterChange={filterChange}      // setFilter와 연결됨
            pageable={parentProps?.pageable ?? (isPage ? { info: false } : false)}
            skip={currentSkip}
            take={currentTake}
            total={currentTotal}
            rowHeight={rowHeight}
            onPageChange={(e) => {
                if (parentProps?.onPageChange) {
                    parentProps.onPageChange(e);
                } else if (pageChange) {
                    pageChange(e);
                } else { }
            }}
            rowRender={rowRender}
            dataItemKey={dataItemKey}
            selectedField={selectedField}
            selectable={{ enabled: true, mode: selectMode }}
            selectAllMode={parentProps?.selectAllMode || 'all'}
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
