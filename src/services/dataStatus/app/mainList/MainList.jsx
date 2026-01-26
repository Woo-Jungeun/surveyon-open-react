import React, { Fragment, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { MainListApi } from "./MainListApi.js";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import GridDataCount from "@/components/common/grid/GridDataCount";
import { process } from "@progress/kendo-data-query";


/**
 * 프로젝트 목록
 *
 * @author jewoo
 * @since 2025-09-12<br />
 */
const MainList = () => {
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
            { field: "no", title: "no", show: true, editable: false, width: "90px", allowHide: false },
            { field: "projectpof", title: "프로젝트\n번호", show: true, editable: false, allowHide: false },
            { field: "projectnum", title: "웹프로젝트\n번호", show: true, editable: false, width: "200px", allowHide: false },
            { field: "projectname", title: "프로젝트명", show: true, editable: false, width: "350px", allowHide: false },
            { field: "register_userid", title: "등록자명", show: true, editable: false, allowHide: false },
            { field: "register_date", title: "등록일", show: true, editable: false, allowHide: false },
            { field: "servername", title: "오픈\n서버정보", show: true, editable: false, allowHide: false },
            { field: "project_use_name", title: "오픈\n작업자", show: true, editable: false, allowHide: false },
            { field: "project_update_date", title: "업데이트\n일자", show: true, editable: false, allowHide: false },
            { field: "project_status", title: "작업현황", show: true, editable: true, allowHide: false },
            { field: "usergroup", title: "권한정보", show: true, editable: true, width: "200px", allowHide: false },
        ]);

    // 행 클릭 → /pro_list 로 이동
    const onRowClick = useCallback((e) => {
        const projectnum = e?.dataItem?.projectnum;
        const projectname = e?.dataItem?.projectname;
        const servername = e?.dataItem?.servername;
        const projectpof = e?.dataItem?.projectpof;
        if (!projectnum || !projectname) return;
        navigate('/data_status/pro_list', { state: { projectnum, projectname, servername, projectpof } });
    }, [navigate]);

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
        const processedData = process(dataState?.data || [], { filter });
        const filteredCount = processedData.total;

        return (
            <Fragment>
                <article className="subTitWrap pro-list-header">
                    <div className="subTit">
                        <h2 className="titTxt">
                            프로젝트 목록
                            <span
                                className="info-icon"
                                data-tooltip={`프로젝트 목록|현 사용자가 등록한 프로젝트, 다른 사용자가 권한을 부여한 프로젝트가 제시됩니다.`}
                            ></span>
                        </h2>
                        {(!userGroup.includes("고객") && !userGroup.includes("일반")) && (
                            <div className="btnWrap">
                                <GridHeaderBtnPrimary
                                    onClick={() => navigate("/data_status/pro_enter")}
                                    style={{ backgroundColor: "#4EA3FF", borderColor: "#4EA3FF" }}
                                >
                                    프로젝트 등록
                                    <span
                                        className="info-icon"
                                        data-tooltip={`프로젝트 등록|조사(큐마): 연동된 프로젝트 등록\n신규등록: 새로운 프로젝트를 직접 등록`}
                                    ></span>
                                </GridHeaderBtnPrimary>
                            </div>
                        )}
                    </div>
                </article>

                <article className="subContWrap">
                    <div className="subCont">
                        <GridDataCount total={filteredCount} />
                        <div className="cmn_gird_wrap">
                            <div id="grid_01" className="cmn_grid singlehead" style={{ cursor: "pointer" }} >
                                <KendoGrid
                                    parentProps={{
                                        height: "calc(100vh - 170px)",
                                        data: dataState?.data,       // props에서 직접 전달
                                        dataItemKey: dataItemKey,    // 합성 키 또는 단일 키 
                                        selectedState,
                                        setSelectedState,
                                        selectedField,               //  선택 필드 전달
                                        idGetter,                     // GridData가 만든 getter 그대로
                                        sortable: { mode: "multiple", allowUnsort: true }, // 다중 정렬
                                        filterable: true,              // 필터 허용
                                        sortChange: ({ sort }) => setSort(sort ?? []),
                                        filterChange: ({ filter }) => setFilter(filter ?? undefined),
                                        sort,
                                        filter,
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
            rowNumberOrder="desc"
            selectedField={SELECTED_FIELD}
            searchMutation={mainListData}
            initialParams={{             /*초기파라미터 설정*/
                user: auth?.user?.userId || "",
            }}
            renderItem={(props) => <GridRenderer {...props} />}
        />
    );
};

export default MainList;