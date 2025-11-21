import React, { Fragment, useState, useEffect, useRef, useMemo } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { ProEnterApi } from "@/components/app/proEnter/ProEnterApi";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { useSelector } from "react-redux";
/**
 * 프로젝트 등록 > 조사 (Perl)
 *
 * @author jewoo
 * @since 2025-09-24<br />
 */
const ProEnterTab2 = (props) => {
    const auth = useSelector((store) => store.auth);
    const lvCode = String(props.lvCode); // 분류 단계 코드
    const { persistedPrefs, onPrefsChange } = props;
    const DATA_ITEM_KEY =  "no";
    const SELECTED_FIELD = "selected"; 

    const [columns, setColumns] = useState(() =>
        persistedPrefs?.columns ?? [
            { field: "no", title: "no", show: true, editable: false, width: "100px", allowHide: false },
            { field: "projectnum", title: "웹프로젝트 번호", show: true, editable: false, allowHide: false },
            { field: "questionnaireName", title: "프로젝트명", show: true, editable: false, width: "300px", allowHide: false },
            { field: "questionnairePersonName", title: "제작담당명", show: true, editable: false, allowHide: false },
            { field: "project_register_date", title: "조사등록일", show: true, editable: false, allowHide: false },
            { field: "servername", title: "서버구분", show: true, editable: false, allowHide: false },
            { field: "gubunYN", title: "설문온등록여부", show: true, editable: false, allowHide: false },
        
        ]);


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

    const { proEnterData } = ProEnterApi();

    //grid rendering 
    const GridRenderer = (props) => {
        const { selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField } = props;

        return (
            <Fragment>
                <div id="grid_01" className="cmn_grid">
                    <KendoGrid
                        key={`lv-${lvCode}`}
                        parentProps={{
                            data: dataState?.data,       // props에서 직접 전달
                            dataItemKey: dataItemKey,    // 합성 키 또는 단일 키 
                            selectedState,
                            setSelectedState,
                            selectedField,               //  선택 필드 전달
                            idGetter,                     // GridData가 만든 getter 그대로
                            // useClientProcessing: true,                         // 클라 처리
                            sortable: { mode: "multiple", allowUnsort: true },
                            filterable: true,
                            sort,
                            filter,
                            sortChange: ({ sort }) => { setSort(sort ?? []); onPrefsChange?.({ sort: sort ?? [] }); },
                            filterChange: ({ filter }) => { setFilter(filter ?? null); onPrefsChange?.({ filter: filter ?? null }); },
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

export default ProEnterTab2;
