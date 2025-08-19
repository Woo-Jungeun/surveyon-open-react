import React, { Fragment, useState, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { GridTestApi } from "@/components/app/grid/GridTestApi.js";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { Button } from "@progress/kendo-react-buttons";

/**
 * 그리드 > 테스트 그리드 > 보기 데이터
 *
 * @author jewoo
 * @since 2024-08-12<br />
 */

const GridTestTab2 = forwardRef((props, ref) => {
    const DATA_ITEM_KEY = ["lv123code", "no"];
    const MENU_TITLE = "테스트 그리드 탭2";
    let qnumText = "";   //문번호

    /**
     * 숨김처리 여부 allowHide (true/false)
     * 편집 가능 여부 editable(true/false)
    */
    const [columns, setColumns] = useState([
        { field: "no", title: "no", show: true, editable: false, width: "100px" },
        { field: "qnum_text", title: "문번호", show: true, editable: false },
        { field: "lv1code", title: "대분류 코드", show: true },
        { field: "lv1", title: "대분류", show: true },
        { field: "lv2code", title: "중분류 코드", show: true },
        { field: "lv2", title: "중분류", show: true },
        { field: "lv321code", title: "소분류 코드", show: true },
        { field: "lv3", title: "소분류", show: true },
        { field: "ex_sum", title: "집계현황", show: true, editable: false },
        { field: "lv123code", title: "최종코드", show: true },
        { field: "ex_gubun", title: "보기유형", show: true, editable: false },
        { field: "delete", title: "삭제", show: true, editable: true, allowHide: false }
    ]);

    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = (menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={columns}
            onColumnsChange={setColumns}
        />
    );
    const { getSampleData } = GridTestApi();
    const [editField] = useState("inEdit");

    // GridData가 내려주는 최신 컨텍스트를 저장
    const latestCtxRef = useRef(null);
    const saveChangesRef = useRef(() => { });   // 저장 로직 노출용

    // 부모에서 호출할 추가 함수
    const addButtonClick = () => {
        const gridContext = latestCtxRef.current;   // 최신 그리드 상태/함수들을 가져옴
        // 그리드 컨텍스트가 없으면 종료
        if (!gridContext) return;

        const { dataState, setDataState, selectedState, idGetter } = gridContext;
        // 현재 그리드 데이터 복사 (불변성 유지)
        const data = Array.isArray(dataState?.data) ? [...dataState.data] : [];

        const insertIndex = data.length;    //마지막 행 뒤 행 추가 

        const newRow = {
            no: insertIndex + 1,
            qnum_text: qnumText,
            lv1code: "",
            lv1: "",
            lv2code: "",
            lv2: "",
            lv321code: "",
            lv3: "",
            ex_sum: "0",
            lv123code: "",
            ex_gubun: "analysis",
            inEdit: true, // 즉시 편집
            __isNew: true,  // 새로 추가된 행 표시 (삭제 버튼 숨김용)
        };

        data.splice(insertIndex, 0, newRow);
        setDataState((prev) => ({ ...prev, data }));    // 데이터 업데이트
    };

    // 부모(GridTestBody.jsx) 에게 노출
    useImperativeHandle(ref, () => ({
        addButtonClick,
        saveChanges: () => saveChangesRef.current(),   // 부모 저장 버튼이 호출
    }));

    //grid rendering 
    const GridRenderer = (props) => {
        const { dataState, setDataState, selectedState, setSelectedState, idGetter, dataItemKey } = props;
        qnumText = dataState?.data?.[0]?.qnum_text ?? "";   // 문번호 저장 (행 추가 시 필요)
        latestCtxRef.current = { dataState, setDataState, selectedState, idGetter };    // 최신 컨텍스트 저장

        // 데이터 변경 시 이벤트 (Kendo onItemChange)
        const onItemChange = useCallback((e) => {
            const { dataItem, field, value } = e;

            // 행의 고유 키 (GridData가 내려준 idGetter / dataItemKey 활용)
            const targetId = idGetter ? idGetter(dataItem) : dataItem?.[dataItemKey];

            setDataState(prev => ({
                ...prev,
                data: prev.data.map(row =>
                    (idGetter ? idGetter(row) : row?.[dataItemKey]) === targetId
                        ? { ...row, [field]: value }   // 해당 행의 해당 필드만 변경
                        : row
                )
            }));
        }, [setDataState, idGetter, dataItemKey]);

        // 키값
        const COMPOSITE_KEY_FIELD = "__rowKey";
        const getKey = useCallback(
            (row) => (typeof idGetter === "function" ? idGetter(row) : row?.[dataItemKey]),
            [idGetter, dataItemKey]
        );

        // ["lv123code","no"] 기준
        const makeRowKey = (row) =>
            [row?.lv123code ?? "", row?.no ?? ""]
                .map(v => encodeURIComponent(String(v)))
                .join("__");

        // 삭제 토글: 플래그만 바꿈 (회색 처리용)
        const togglePendingDelete = useCallback((cellProps) => {
            const target = cellProps.dataItem;
            const key = getKey(target);
            setDataState(prev => ({
                ...prev,
                data: prev.data.map(r =>
                    getKey(r) === key
                        ? { ...r, __pendingDelete: !r.__pendingDelete, inEdit: false }
                        : r
                )
            }));
        }, [getKey, setDataState]);

        /* 저장: 보류 삭제 커밋 + 번호/키 재계산 + __isNew 해제 + API 호출 */
        const saveChanges = useCallback(async () => {
            // 1) 현재 그리드를 기반으로 최종 데이터 생성
            const prev = latestCtxRef.current?.dataState?.data ?? [];
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

            // 2) API 저장 호출 (예시)
            // TODO: 저장 API로 변경
            // const { saveGrid } = GridTestApi();
            // await saveGrid.mutateAsync({ items: normalized });

            // 3) 그리드 상태 반영
            setDataState(prevState => ({ ...prevState, data: normalized }));
            setSelectedState?.({});   // 선택 해제
        }, [setDataState, setSelectedState]);

        // 부모에서 호출할 수 있도록 ref에 연결
        saveChangesRef.current = saveChanges;

        // 보류 행 회색 처리
        const rowRender = useCallback((trEl, rowProps) => {
            const pending = rowProps?.dataItem?.__pendingDelete === true;
            const cls = `${trEl.props.className || ''} ${pending ? 'row-pending-delete' : ''}`;
            return React.cloneElement(trEl, { ...trEl.props, className: cls });
        }, []);
        
        //console.log("dataState", dataState);

        return (
            <Fragment>
                <p className="totalTxt">
                    총 <i className="fcGreen">{dataState?.data?.length || 0}</i>개
                </p>
                <div id="grid_01" className="cmn_grid">
                    <KendoGrid
                        parentProps={{
                            data: dataState?.data,
                            dataItemKey: dataItemKey,
                            editField,
                            onItemChange,
                            selectedState,
                            setSelectedState,
                            idGetter,
                            rowRender,
                        }}
                    >
                        {columns.filter(c => c.show !== false).map((c) => {
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

                                            // 보기유형이 survey이거나 새로 추가된 행이면 삭제 버튼 숨김
                                            if (row?.ex_gubun === 'survey' || row?.__isNew === true) {
                                                return <td />;
                                            }

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
                                                        onClick={() => togglePendingDelete(props)}
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
            searchMutation={getSampleData}
            menuTitle={MENU_TITLE}
            editField={editField}
            initialParams={{             /*초기파라미터 설정*/
                user: "syhong",
                projectnum: "q250089uk",
                qnum: "A2-2",
                gb: "lb",
            }}
            renderItem={(props) => <GridRenderer {...props} />}
        />
    );
});

export default GridTestTab2;
