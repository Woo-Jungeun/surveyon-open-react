import React, { Fragment, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { MainListApi } from "./MainListApi.js";
import { useSelector, useDispatch } from "react-redux";
import { login } from "@/common/redux/action/AuthAction";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import GridDataCount from "@/components/common/grid/GridDataCount";
import { process } from "@progress/kendo-data-query";
import DataHeader from "@/services/dataStatus/components/DataHeader";
import { Search } from 'lucide-react';


/**
 * 프로젝트 목록
 *
 * @author jewoo
 * @since 2025-09-12
 */

// 날짜 커스텀 셀
const DateTimeCell = (props) => {
    const val = props.dataItem[props.field] || "";
    const parts = val.split(" ");
    if (parts.length >= 2) {
        return (
            <td colSpan={props.colSpan} className={props.className} style={{ ...props.style, textAlign: 'center', lineHeight: '1.3' }}>
                <div style={{ fontSize: '12px' }}>{parts[0]}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{parts.slice(1).join(" ")}</div>
            </td>
        );
    }
    return <td colSpan={props.colSpan} className={props.className} style={{ ...props.style, textAlign: 'center', fontSize: '12px' }}>{val}</td>;
};

// grid rendering 
const GridRenderer = (props) => {
    const {
        selectedState,
        setSelectedState,
        idGetter,
        dataState,
        dataItemKey,
        selectedField,
        searchText,
        setSearchText,
        columns,
        setSort,
        sort,
        onRowClick
    } = props;

    // 로컬 검색 필터링
    const filteredData = useMemo(() => {
        const list = dataState?.data || [];
        if (!searchText.trim()) return list;
        const query = searchText.toLowerCase().trim();
        return list.filter(item => {
            const projectPof = (item.projectpof || '').toLowerCase();
            const projectNum = (item.projectnum || '').toLowerCase();
            const projectName = (item.projectname || '').toLowerCase();
            return projectPof.includes(query) || projectNum.includes(query) || projectName.includes(query);
        });
    }, [dataState?.data, searchText]);

    return (
        <div className="grid-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: '12px 16px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ position: 'relative', width: '460px' }}>
                        <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                        <input
                            type="text"
                            placeholder="프로젝트명, 번호로 검색하세요."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{
                                width: '100%',
                                height: '32px',
                                padding: '6px 12px 6px 32px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '13px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.15s ease-in-out'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#7C3AED';
                                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.12)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#cbd5e1';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                </div>
                <div className="cmn_grid singlehead" style={{ flex: 1, height: "100%", overflow: "hidden" }}>
                    <KendoGrid
                        parentProps={{
                            height: "100%",
                            style: { border: "none" },
                            data: filteredData,
                            dataItemKey: dataItemKey,
                            selectedState,
                            setSelectedState,
                            selectedField,
                            idGetter,
                            sortable: { mode: "multiple", allowUnsort: true },
                            filterable: false,
                            sortChange: ({ sort }) => setSort(sort ?? []),
                            sort,
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
                                    headerClassName="k-header-center"
                                    cell={
                                        c.field === 'project_update_date' || c.field === 'register_date'
                                            ? DateTimeCell
                                            : undefined
                                    }
                                />
                            );
                        })}
                    </KendoGrid>
                </div>
            </div>
        </div>
    );
};

const MainList = ({ showHeader = true, onProjectSelect }) => {
    const auth = useSelector((store) => store.auth);
    const dispatch = useDispatch();
    const userGroup = auth?.user?.userGroup || "";
    const navigate = useNavigate();
    const DATA_ITEM_KEY = "no";
    const SELECTED_FIELD = "selected";

    // 정렬/필터를 controlled로
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [searchText, setSearchText] = useState("");

    const { mainListData } = MainListApi();

    const [columns, setColumns] = useState(() =>
        [
            { field: "no", title: "no", show: true, editable: false, width: "60px", allowHide: false },
            { field: "projectpof", title: "프로젝트\n번호", show: true, editable: false, width: "120px", allowHide: false },
            { field: "projectnum", title: "웹프로젝트\n번호", show: true, editable: false, width: "130px", allowHide: false },
            { field: "projectname", title: "프로젝트명", show: true, editable: false, allowHide: false },
            { field: "register_userid", title: "등록자명", show: true, editable: false, width: "80px", allowHide: false },
            { field: "register_date", title: "등록일", show: true, editable: false, width: "110px", allowHide: false },
            { field: "servername", title: "오픈\n서버정보", show: true, editable: false, width: "90px", allowHide: false },
            { field: "project_use_name", title: "오픈\n작업자", show: true, editable: false, width: "80px", allowHide: false },
            { field: "project_update_date", title: "업데이트\n일자", show: true, editable: false, width: "110px", allowHide: false },
            { field: "project_status", title: "작업현황", show: true, editable: true, width: "80px", allowHide: false },
            { field: "postgrecompletecount", title: "DB\n완료수", show: true, editable: true, width: "80px", allowHide: false },
            { field: "groupposition", title: "소속", show: true, editable: true, width: "100px", allowHide: false },
            { field: "usergroup", title: "권한정보", show: true, editable: true, width: "120px", allowHide: false },
        ]);

    const location = useLocation();

    // Determine source based on state or current path
    const getFromSource = () => {
        if (location.pathname.includes("data_status")) return "data_status";
        if (location.state?.from) return location.state.from;
        return "ai_open";
    };

    const from = getFromSource();

    const onRowClick = useCallback((e) => {
        const { projectnum, projectname, servername, projectpof, merge_pn, merge_pn_text, usergroup } = e.dataItem;

        // 어떤 모드(팝업/페이지 전환)에서든 프로젝트가 선택되면 공통적으로 세션 최신화
        if (projectnum && projectname) {
            dispatch(login({ ...auth?.user, userAuth: usergroup }));
            sessionStorage.setItem("projectnum", projectnum || "");
            sessionStorage.setItem("projectname", projectname || "");
            sessionStorage.setItem("servername", servername || "");
            sessionStorage.setItem("projectpof", projectpof || "");
            sessionStorage.setItem("merge_pn", merge_pn || "");
            sessionStorage.setItem("merge_pn_text", merge_pn_text || "");
            sessionStorage.setItem("usergroup", usergroup || "");

            // 프로젝트 변경 시 pageId, silsaPageId, pagetitle 세션 초기화
            sessionStorage.removeItem("pageId");
            sessionStorage.removeItem("silsaPageId");
            sessionStorage.removeItem("pagetitle");
        }

        if (onProjectSelect) {
            onProjectSelect(e.dataItem);
            return;
        }

        if (!projectnum || !projectname) return;

        if (from === 'data_status') {
            navigate('/data_status/hsrt/add_question');
        } else {
            navigate('/project/pro_list', { state: { projectnum, projectname, servername, projectpof } });
        }
    }, [navigate, from, onProjectSelect, auth, dispatch]);

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

    return (
        <Fragment>
            {showHeader && <DataHeader title="프로젝트 목록" />}
            <div
                className={showHeader ? "project-list-content" : ""}
                style={!showHeader ? {
                    flex: 1,
                    margin: 0,
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    borderRadius: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                } : undefined}
            >
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
                    renderItem={(props) => (
                        <GridRenderer
                            {...props}
                            searchText={searchText}
                            setSearchText={setSearchText}
                            columns={columns}
                            setSort={setSort}
                            sort={sort}
                            onRowClick={onRowClick}
                        />
                    )}
                />
            </div>
        </Fragment>
    );
};

export default MainList;