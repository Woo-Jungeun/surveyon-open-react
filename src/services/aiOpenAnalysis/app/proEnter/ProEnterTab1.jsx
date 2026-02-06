import React, { Fragment, useState, useCallback, useContext } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { ProEnterApi } from "@/services/aiOpenAnalysis/app/proEnter/ProEnterApi";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { useSelector } from "react-redux";
import { modalContext } from "@/components/common/Modal.jsx";

/**
 * 프로젝트 등록 > 조사 (Qmaster)
 *
 * @author jewoo
 * @since 2025-09-24<br />
 */
const ProEnterTab1 = (props) => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const navigate = useNavigate();
    const { persistedPrefs, onPrefsChange } = props;
    const DATA_ITEM_KEY = "no";
    const SELECTED_FIELD = "selected";
    const location = useLocation();
    const from = location.state?.from || 'ai_open';

    const { proEnterData, proEnterSaveData } = ProEnterApi();

    const [columns, setColumns] = useState(() =>
        persistedPrefs?.columns ?? [
            { field: "no", title: "no", show: true, editable: false, width: "60px", allowHide: false },
            { field: "pof", title: "프로젝트\n번호", show: true, editable: false, width: "120px", allowHide: false },
            { field: "projectnum", title: "웹프로젝트\n번호", show: true, editable: false, width: "130px", allowHide: false },
            { field: "questionnaireName", title: "프로젝트명", show: true, editable: false, allowHide: false },
            { field: "researcherName", title: "연구원명", show: true, editable: false, width: "100px", allowHide: false },
            { field: "questionnairePersonName", title: "제작담당명", show: true, editable: false, width: "165px", allowHide: false },
            { field: "project_register_date", title: "조사\n등록일", show: true, editable: false, width: "185px", allowHide: false },
            { field: "servername", title: "서버구분", show: true, editable: false, width: "100px", allowHide: false },
            { field: "postgreyn", title: "설문온\nDB완료수", show: true, editable: false, width: "120px", allowHide: false },
            { field: "fieldWorkYN", title: "진행상황", show: true, editable: false, width: "100px", allowHide: false },
            { field: "gubunYN", title: "설문온\n등록여부", show: true, editable: false, width: "110px", allowHide: false },
        ]
    );

    // 정렬/필터를 controlled로
    const [sort, setSort] = useState(persistedPrefs?.sort ?? []);
    const [filter, setFilter] = useState(persistedPrefs?.filter ?? null);

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

        // 행 클릭 시 등록 api 
        const onRowClick = useCallback(async (e) => {
            try {
                if (e.dataItem.gubunYN === "등록") return; //설문온등록여부 등록일 경우엔 return

                const payload = {
                    user: auth?.user?.userId || "",
                    gb: "qmlistselect",
                    projectnum: e.dataItem.projectnum,
                    pof: e.dataItem.pof,
                    questionnaireName: e.dataItem.questionnaireName,
                    servername: e.dataItem.servername
                };

                const res = await proEnterSaveData.mutateAsync(payload);
                if (res?.success === "766") {
                    modal.showErrorAlert("알림", "등록된 프로젝트가 없습니다.");
                    return;
                }
                if (res?.success === "767") {
                    modal.showErrorAlert("알림", "맵 정보가 등록되지 않았습니다. (담당웹제작자에게 문의해주세요)");
                    return;
                }
                if (res?.success === "777") {
                    modal.showAlert("알림", "등록이 완료되었습니다.", {
                        btns: [{
                            title: "확인", click: () => {
                                sessionStorage.setItem("projectnum", "");
                                sessionStorage.setItem("projectname", "");
                                sessionStorage.setItem("servername", "");
                                sessionStorage.setItem("projectpof", "");
                                navigate("/project", { state: { from } }); //프로젝트 목록 페이지로 이동 (진입 경로 유지)
                            }
                        }],
                    });
                } else {
                    modal.showErrorAlert("에러", "등록 중 오류가 발생했습니다."); //오류 팝업 표출
                }
            } catch {

            }
        }, [navigate, from]);

        return (
            <Fragment>
                <div className="cmn_gird_wrap">
                    <div id="grid_01" className="cmn_grid singlehead">
                        <KendoGrid
                            parentProps={{
                                height: "calc(100vh - 250px)",
                                data: dataState?.data,       // props에서 직접 전달
                                dataItemKey: dataItemKey,    // 합성 키 또는 단일 키 
                                selectedState,
                                setSelectedState,
                                selectedField,               //  선택 필드 전달
                                onRowClick,
                                idGetter,                     // GridData가 만든 getter 그대로
                                // useClientProcessing: true,                         // 클라 처리
                                sortable: { mode: "multiple", allowUnsort: true },
                                filterable: true,
                                sort,
                                filter,
                                sortChange: ({ sort }) => { setSort(sort ?? []); onPrefsChange?.({ sort: sort ?? [] }); },
                                filterChange: ({ filter }) => { setFilter(filter ?? null); onPrefsChange?.({ filter: filter ?? null }); },
                                rowRender: (tr, rowProps) => {
                                    // 설문온등록여부가 등록이 아닐 경우 커서 포인터 
                                    return React.cloneElement(tr, {
                                        ...tr.props,
                                        style: {
                                            ...(tr.props.style || {}),
                                            cursor: rowProps.dataItem?.gubunYN !== "등록" ? "pointer" : "default"
                                        }
                                    });
                                }
                            }}
                        >
                            {columns.filter(c => c.show !== false).map((c) => {
                                if (c.field === "gubunYN") {
                                    // 설문온등록여부 컬럼에만 스타일 적용
                                    return (
                                        <Column
                                            key={c.field}
                                            field={c.field}
                                            title={c.title}
                                            width={c.width}
                                            editable={c.editable}
                                            columnMenu={columnMenu}
                                            cell={(props) => {
                                                const value = props.dataItem[c.field];
                                                const isNotRegistered = value !== "등록"; // 등록이 아닐 때만 강조
                                                const cellStyle = isNotRegistered
                                                    ? {
                                                        background: "#f8f9fa",
                                                        color: "#555",
                                                        fontWeight: "600",
                                                        border: "1px solid #eee",
                                                        padding: "6px 12px",
                                                        textAlign: "center",
                                                        borderRadius: "6px",
                                                    }
                                                    : {
                                                        textAlign: "center",
                                                        color: "#666",
                                                    };

                                                return (
                                                    <td style={cellStyle}>
                                                        {value || ""}
                                                    </td>
                                                );
                                            }}
                                        />
                                    );
                                }
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
            </Fragment>
        );
    }

    return (
        <GridData
            dataItemKey={DATA_ITEM_KEY}
            rowNumber={"no"}
            rowNumberOrder="asc"
            selectedField={SELECTED_FIELD}
            searchMutation={proEnterData}
            initialParams={{             /*초기파라미터 설정*/
                user: auth?.user?.userId || "",
                gb: "qmlist",
            }}
            renderItem={(props) => <GridRenderer {...props} />}
        />
    );
};

export default ProEnterTab1;
