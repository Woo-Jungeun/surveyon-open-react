import React, { Fragment, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { MainListApi } from "./MainListApi.js";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import GridDataCount from "@/components/common/grid/GridDataCount";
import { process } from "@progress/kendo-data-query";
import DataHeader from "@/services/dataStatus/components/DataHeader";


/**
 * 프로젝트 목록
 *
 * @author jewoo
 * @since 2025-09-12<br />
 */
const MainList = ({ showHeader = true }) => {
    const auth = useSelector((store) => store.auth);
    const userGroup = auth?.user?.userGroup || "";
    const navigate = useNavigate();
    const DATA_ITEM_KEY = "no";
    const SELECTED_FIELD = "selected";

    // 정렬/필터를 controlled로
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);

    const { mainListData } = MainListApi();

    const [columns, setColumns] = useState(() =>
        [
            { field: "no", title: "no", show: true, editable: false, width: "70px", allowHide: false },
            { field: "projectpof", title: "프로젝트\n번호", show: true, editable: false, width: "140px", allowHide: false },
            { field: "projectnum", title: "웹프로젝트\n번호", show: true, editable: false, width: "160px", allowHide: false },
            { field: "projectname", title: "프로젝트명", show: true, editable: false, allowHide: false },
            { field: "register_userid", title: "등록자명", show: true, editable: false, width: "110px", allowHide: false },
            { field: "register_date", title: "등록일", show: true, editable: false, width: "140px", allowHide: false },
            { field: "servername", title: "오픈\n서버정보", show: true, editable: false, width: "110px", allowHide: false },
            { field: "project_use_name", title: "오픈\n작업자", show: true, editable: false, width: "110px", allowHide: false },
            { field: "project_update_date", title: "업데이트\n일자", show: true, editable: false, width: "140px", allowHide: false },
            { field: "project_status", title: "작업현황", show: true, editable: true, width: "80px", allowHide: false },
            { field: "postgrecompletecount", title: "DB\n완료수", show: true, editable: true, width: "85px", allowHide: false },
            { field: "usergroup", title: "권한정보", show: true, editable: true, width: "140px", allowHide: false },
        ]);

    const location = useLocation();
    const from = location.state?.from || 'ai_open';

    // 행 클릭
    const onRowClick = useCallback((e) => {
        const { projectnum, projectname, servername, projectpof } = e.dataItem;
        if (!projectnum || !projectname) return;

        // 세션 스토리지 저장 (Data Status용)
        sessionStorage.setItem("projectnum", projectnum || "");
        sessionStorage.setItem("projectname", projectname || "");
        sessionStorage.setItem("servername", servername || "");
        sessionStorage.setItem("projectpof", projectpof || "");

        if (from === 'data_status') {
            navigate('/data_status/setting/variable');
        } else {
            navigate('/project/pro_list', { state: { projectnum, projectname, servername, projectpof } });
        }
    }, [navigate, from]);

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
            onFilterChange={(e) => setFilter(e ?? null)}
            onSortChange={(e) => setSort(e ?? [])} // sortArr는 배열 형태
        />
    );

    //grid rendering 
    const GridRenderer = (props) => {
        const { selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField } = props;

        // 필터링된 데이터 개수 계산
        // const processedData = process(dataState?.data || [], { filter });
        // const filteredCount = processedData.total;

        return (
            <div className="grid-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div className="cmn_grid singlehead" style={{ flex: 1, height: "100%", overflow: "hidden" }}>
                        <KendoGrid
                            parentProps={{
                                height: "100%",
                                style: { border: "none" },
                                data: dataState?.data,
                                dataItemKey: dataItemKey,
                                selectedState,
                                setSelectedState,
                                selectedField,
                                idGetter,
                                sortable: { mode: "multiple", allowUnsort: true },
                                filterable: true,
                                sortChange: ({ sort }) => setSort(sort ?? []),
                                filterChange: ({ filter }) => setFilter(filter ?? undefined),
                                sort,
                                filter,
                                onRowClick,
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
                                        headerClassName="k-header-center"
                                    />
                                );
                            })}
                        </KendoGrid>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Fragment>
            {showHeader && <DataHeader title="프로젝트 목록" />}
            <div className="project-list-content">
                <GridData
                    dataItemKey={DATA_ITEM_KEY}
                    rowNumber={"no"}
                    rowNumberOrder="desc"
                    selectedField={SELECTED_FIELD}
                    searchMutation={mainListData}
                    initialParams={{             /*초기파라미터 설정*/
                        user: auth?.user?.userId || "",
                        gb: "list"
                    }}
                    renderItem={(props) => <GridRenderer {...props} />}
                />
            </div>
        </Fragment>
    );
};

export default MainList;