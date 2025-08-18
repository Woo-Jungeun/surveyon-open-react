import React, { Fragment, useState, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { GridTestApi } from "@/components/app/grid/GridTestApi.js";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';

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
        { field: "lv1", title: "대분류", show: true },
        { field: "lv2", title: "중분류", show: true },
        { field: "lv3", title: "소분류", show: true },
        { field: "lv123code", title: "lv123", show: true },
        { field: "lv23code", title: "lv23", show: true },
        { field: "ex_gubun", title: "보기유형", show: true, editable: false },
        { field: "ex_sum", title: "집계현황", show: true, editable: false },
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
            lv1: "",
            lv2: "",
            lv3: "",
            lv123code: "",
            lv23code: "",
            ex_gubun: "analysis",
            ex_sum: "0",
            inEdit: true, // 즉시 편집
        };

        data.splice(insertIndex, 0, newRow);
        setDataState((prev) => ({ ...prev, data }));    // 데이터 업데이트
    };

    // 부모(GridTestBody.jsx) 에게 노출
    useImperativeHandle(ref, () => ({
        addButtonClick,
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
                        }}
                    >
                        {columns.filter(c => c.show !== false).map((c) => {
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
