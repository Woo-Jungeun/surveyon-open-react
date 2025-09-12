import React, { Fragment, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { MainListApi } from "@/components/app/mainList/MainListApi.js";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';

/**
 * 문항 목록
 *
 * @author jewoo
 * @since 2025-09-12<br />
 */
const ProList = () => {
    const auth = useSelector((store) => store.auth);
    const navigate = useNavigate();
    const DATA_ITEM_KEY = "no";
    const SELECTED_FIELD = "selected";
    const MENU_TITLE = "문항 목록";
    const { state } = useLocation();   
    const projectnum = state?.projectnum;      
    // 정렬/필터를 controlled로
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    
    const { mainListData } = MainListApi();

    const [columns, setColumns] = useState(() =>
        [
            { field: "no", title: "no", show: true, editable: false, width: "100px", allowHide: false },
            { field: "projectpof", title: "프로젝트 번호", show: true, editable: false, allowHide: false },
            { field: "projectnum", title: "웹프로젝트 번호", show: true, editable: false, allowHide: false },
            { field: "projectname", title: "프로젝트명", show: true, editable: false, width: "300px", allowHide: false },
            { field: "register_userid", title: "등록자명", show: true, editable: false, allowHide: false },
            { field: "register_date", title: "등록일", show: true, editable: false, allowHide: false },
            { field: "servername", title: "오픈서버정보", show: true, editable: false, allowHide: false },
            { field: "project_use_name", title: "오픈작업자", show: true, editable: false, allowHide: false },
            { field: "project_update_date", title: "업데이트일자", show: true, editable: false, allowHide: false },
            { field: "project_status", title: "작업현황", show: true, editable: true, allowHide: false },
            { field: "usergroup", title: "권한정보", show: true, editable: true, width: "200px", allowHide: false },
        ]);

    // 행 클릭 → /pro_list 로 이동
    const onRowClick = useCallback((e) => {
        const projectnum = e?.dataItem?.projectnum;
        if (!projectnum) return;
        navigate('/pro_list', { state: { projectnum } });
    }, [navigate]);

    // ...
    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = (menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={columns}
            onColumnsChange={(updated) => {
                const map = new Map(updated.map(c => [c.field, c]));
                const next = columns.map(c => {
                    const u = map.get(c.field);
                    return u ? { ...c, ...u } : c
                });
                setColumns(next);
            }}
            filter={filter}
            onFilterChange={(e) => {
                setFilter(e);    
            }}

        />
    );

    //grid rendering 
    const GridRenderer = (props) => {
        const { selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField } = props;
        return (
            <Fragment>
                <article className="subTitWrap">
                    <div className="subTit">
                        {/* <h2 className="titTxt">프로젝트 목록</h2> */}
                        <h2 className="titTxt">{projectnum}</h2>
                    </div>
                </article>

                <article className="subContWrap">
                    <div className="subCont">
                        <div className="cmn_gird_wrap">
                            <div id="grid_01" className="cmn_grid">
                                <KendoGrid
                                    parentProps={{
                                        data: dataState?.data,       // props에서 직접 전달
                                        dataItemKey: dataItemKey,    // 합성 키 또는 단일 키 
                                        selectedState,
                                        setSelectedState,
                                        selectedField,               //  선택 필드 전달
                                        idGetter,                     // GridData가 만든 getter 그대로
                                        sortable: { mode: "multiple", allowUnsort: true }, // 다중 정렬
                                        sort,                                 // controlled sort
                                        sortChange: (e) => { setSort(e.sort); onPrefsChange?.({ sort: e.sort }); },
                                        filterable: true,                                   // 필터 허용
                                        filter,                               // controlled filter
                                        filterChange: (e) => { setFilter(e.filter); onPrefsChange?.({ filter: e.filter }); },
                                        onRowClick,
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
                        </div>
                    </div>
                </article>
            </Fragment>
        );
    }

    return (
        <GridData
            dataItemKey={DATA_ITEM_KEY}
            rowNumber={"no"}
            selectedField={SELECTED_FIELD}
            menuTitle={MENU_TITLE}
            searchMutation={mainListData}
            initialParams={{             /*초기파라미터 설정*/
                user: auth?.user?.userId || "",
            }}
            renderItem={(props) => <GridRenderer {...props} />}
        />
    );
};

export default ProList;