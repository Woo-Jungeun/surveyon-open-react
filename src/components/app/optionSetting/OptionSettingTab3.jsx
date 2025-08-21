import React, { Fragment, useState, useEffect, useRef } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';

/**
 * 분석 > 그리드 영역 > rawdata
 *
 * @author jewoo
 * @since 2025-08-12<br />
 */
const OptionSettingTab3 = () => {
    const DATA_ITEM_KEY = ["pid", "cid"];   // 다중 키 
    const MENU_TITLE = "rawdata";

    const [columns, setColumns] = useState([
        { field: "pid", title: "PID", show: true },
        { field: "qnum", title: "문번호", show: true },
        { field: "cid", title: "멀티", show: true },
        { field: "answer_origin", title: "원본 내용", show: true },
        { field: "answerfin", title: "응답 내용", show: true },
        { field: "lv1", title: "대분류", show: true },
        { field: "lv2", title: "중분류", show: true },
        { field: "lv3", title: "소분류", show: true },
        { field: "sentiment", title: "sentiment", show: true },
        { field: "recheckyn", title: "검증", show: true },
    ]);

    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = (menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={columns}
            onColumnsChange={setColumns}
        />
    );

    const { getGridData } = OptionSettingApi();

    //grid rendering 
    const GridRenderer = (props) => {
        const { selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField } = props;

        return (
            <Fragment>
                <p className="totalTxt">
                    총 <i className="fcGreen">{dataState?.totalSize || 0}</i>개
                </p>
                <div id="grid_01" className="cmn_grid">
                    <KendoGrid
                        parentProps={{
                            data: dataState?.data,       // props에서 직접 전달
                            dataItemKey: dataItemKey,    // 합성 키 또는 단일 키 
                            selectedState,
                            setSelectedState,
                            selectedField,               //  선택 필드 전달
                            idGetter                     // GridData가 만든 getter 그대로
                        }}
                    >
                        {columns.filter(c => c.show !== false).map((c) => {
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
            searchMutation={getGridData}
            menuTitle={MENU_TITLE}
            initialParams={{             /*초기파라미터 설정*/
                key:"",
                user: "syhong",
                projectnum: "q250089uk",
                qnum: "A2-2",
                gb: "list",
            }}
            renderItem={(props) => <GridRenderer {...props} />}

        />
    );
};

export default OptionSettingTab3;
