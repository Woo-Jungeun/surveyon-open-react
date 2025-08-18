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
    const filter = parentProps?.filter;
    const sort = parentProps?.sort;
    const sortChange = parentProps?.sortChange;
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
    //const processedData = parentProps?.data ?? [];
    // 원본 배열
    const rawData = Array.isArray(parentProps?.data) ? parentProps.data : [];

    // 클라이언트 처리(로컬 정렬/필터/페이징) 여부: 서버 정렬/필터 쓰면 false로 넘겨주세요.
    const useClientProcessing =
        parentProps?.useClientProcessing ??
        (parentProps?.filterable ?? parentProps?.sortable ?? true);

    // Grid 상태 (정렬/필터/페이징)
    const [gridState, setGridState] = useState({
        sort: [],
        filter: undefined,
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
        const newSelectedState = getSelectedState({
            event,
            selectedState,
            dataItemKey
        });
        setSelectedState(newSelectedState);
    };

    // 헤더 체크박스 클릭 시 핸들러 
    const onHeaderSelectionChange = useCallback((event) => {
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
    const headerSomeSelected =
        (viewItems.some((item) => selectedState[idGetter(item)]) && !headerSelectionValue);

    // 체크박스 선택 컬럼을 원하는 위치에 삽입
    // => 모든 컬럼에 안정적인 key를 강제로 부여
    const childCols = Children.toArray(children).map((col, idx) => {
        const safeKey =
            col.key ??
            (col.props?.field ? `col:${col.props.field}` : `col-idx:${idx}`);
        return cloneElement(col, { key: safeKey });
    });
    
    if (parentProps?.multiSelect) {
        // 헤더: 라벨 + 체크박스 (indeterminate 지원)
        const SelectionHeaderCell = () => {
            const ref = useRef(null);
        
            // indeterminate는 DOM property로 설정해야 함 (attribute로 쓰면 경고 발생)
            useEffect(() => {
            if (ref.current) {
                ref.current.indeterminate = headerSomeSelected; // 일부만 체크 시 하이픈 상태
            }
            }, [headerSomeSelected]);
        
            const stop = (e) => e.stopPropagation(); // 헤더 클릭이 정렬/필터로 전파되는 것 방지
        
            return (
            <div
                onClick={stop}
                style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
                }}
            >
                {/* 헤더 라벨(컬럼명) */}
                <span>{selectionHeaderTitle}</span>
        
                {/* 네이티브 체크박스 (경고 없음) */}
                <div className="k-checkbox-wrap">
                    <input
                    ref={ref}
                    type="checkbox"
                    className="k-checkbox"   
                    checked={!!headerSelectionValue}
                    onChange={(e) => {
                        onHeaderSelectionChange({
                        syntheticEvent: { target: { checked: e.target.checked } },
                        dataItems: viewItems, // ← 현재 화면에 보이는 아이템들만 대상으로
                        });
                    }}
                    aria-label="Select all rows"
                    />
                </div>
            </div>
            );
        };

        const selectionCol = (
            <Column
                key="__selection_col"   // 고정 고유키
                field={selectedField}
                width="120px"
                headerCell={SelectionHeaderCell}
                sortable={false}
                filterable={false}
                columnMenu={undefined}
            />
        );

        const afterField = parentProps?.selectionColumnAfterField;
        const atIndex = parentProps?.selectionColumnIndex;

        let insertAt = 0; // 기본: 맨 왼쪽
        if (typeof atIndex === "number") {
            insertAt = Math.max(0, Math.min(childCols.length, atIndex));
        } else if (afterField) {
            const idx = childCols.findIndex((c) => c?.props?.field === afterField);
            insertAt = idx >= 0 ? idx + 1 : 0;
        }
        childCols.splice(insertAt, 0, selectionCol);
    }

    return (
        <Grid
            data={processedData}
            // ✅ 클라이언트 처리 모드일 때만 내부 gridState 바인딩
            {...(useClientProcessing ? gridState : {})}
            onDataStateChange={useClientProcessing ? (e) => setGridState(e.dataState) : undefined}

            sortable={parentProps?.sortable ?? { mode: 'multiple', allowUnsort: true }}
            filterable={parentProps?.filterable ?? true}
            rowRender={rowRender}

            // sort={sort}
            // filter={filter}
            // pageable={isPage ? { info: false } : false}
            // onSortChange={sortChange}
            // skip={page?.skip}
            // take={page?.take}
            // total={parentData?.totalSize}
            // onPageChange={pageChange}

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

            // ✅ 서버/외부 제어 모드일 때만 다시 붙여주기
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
                조회된 데이터가 없습니다.
            </GridNoRecords>
            {childCols}
        </Grid>
    );
};

export default KendoGrid;

KendoGrid.propTypes = {
    parentProps: PropTypes.object.isRequired
};
