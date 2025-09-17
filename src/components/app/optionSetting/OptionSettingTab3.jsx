import React, { Fragment, useState, useEffect, useRef, useMemo } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { useSelector } from "react-redux";
/**
 * 분석 > 그리드 영역 > rawdata
 *
 * @author jewoo
 * @since 2025-08-12<br />
 */
const OptionSettingTab3 = (props) => {
    const auth = useSelector((store) => store.auth);
    const lvCode = String(props.lvCode); // 분류 단계 코드
    const { persistedPrefs, onPrefsChange, projectnum, qnum } = props;
    const DATA_ITEM_KEY = ["pid", "cid"];   // 다중 키 
    const MENU_TITLE = "rawdata";

    const [columns, setColumns] = useState(() =>
        persistedPrefs?.columns ?? [
            { field: "pid", title: "PID", show: true, allowHide: false },
            { field: "qnum", title: "문번호", show: true, allowHide: false },
            { field: "cid", title: "멀티", show: true, allowHide: false },
            { field: "answer_origin", title: "원본 내용", show: true, allowHide: false },
            { field: "answerfin", title: "응답 내용", show: true, allowHide: false },
            { field: "lv1", title: "대분류", show: true, allowHide: false },
            { field: "lv2", title: "중분류", show: true, allowHide: false },
            { field: "lv3", title: "소분류", show: true, allowHide: false },
            { field: "sentiment", title: "sentiment", show: true, allowHide: false }
        ]);

    // 1단계: lv1, lv2 숨김 / 2단계: lv1 숨김 / 3단계: 숨김 없음
    const forcedHidden = useMemo(() => {
        const s = new Set();
        if (lvCode === "1") { s.add("lv1"); s.add("lv1code"); s.add("lv2"); s.add("lv2code"); }
        else if (lvCode === "2") { s.add("lv1"); s.add("lv1code"); }
        return s;
    }, [lvCode]);

    // 단계 컬럼 집합 (대/중분류 코드/이름)
    const stageFields = useMemo(() =>
        new Set(["lv1", "lv1code", "lv2", "lv2code"]), []);

    // 렌더링용 값: 강제 규칙만 입혀서 사용(상태/부모는 건드리지 않음)
    const effectiveColumns = useMemo(() => {
        return columns.map(c =>
            forcedHidden.has(c.field)
                ? { ...c, show: false, allowHide: false }
                : c
        );
    }, [columns, forcedHidden, stageFields]);


    // 정렬/필터를 controlled로
    const [sort, setSort] = useState(persistedPrefs?.sort ?? []);
    const [filter, setFilter] = useState(persistedPrefs?.filter ?? null);

    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = (menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={columns
                // 단계 규칙으로 '강제 숨김' 대상만 메뉴에서 제거
                .filter(c => !forcedHidden.has(c.field))
                // 단계 컬럼도 메뉴에 표시 + 숨김 가능
                .map(c => stageFields.has(c.field) ? { ...c, allowHide: true } : c)
            }
            onColumnsChange={(updated) => {
                const map = new Map(updated.map(c => [c.field, c]));
                const next = columns.map(c => {
                    if (forcedHidden.has(c.field)) return { ...c, show: false }; // 단계상 강제 숨김
                    const u = map.get(c.field);
                    return u ? { ...c, ...u } : c
                });
                setColumns(next);
                onPrefsChange?.({ columns: next }); // 부모에 저장
            }}
            filter={filter}
            onFilterChange={(e) => {
                setFilter(e);
                onPrefsChange?.({ filter: e });
            }}

        />
    );

    const { optionEditData } = OptionSettingApi();

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
                            useClientProcessing: true,                         // 클라 처리
                            sortable: { mode: "multiple", allowUnsort: true },
                            filterable: true,
                            initialSort: sort,                               // 1회 초기값
                            initialFilter: filter,
                            sortChange: ({ sort }) => { setSort(sort ?? []); onPrefsChange?.({ sort: sort ?? [] }); },
                            filterChange: ({ filter }) => { setFilter(filter ?? null); onPrefsChange?.({ filter: filter ?? null }); },
                        }}
                    >
                        {effectiveColumns.filter(c => c.show !== false).map((c) => {
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
            searchMutation={optionEditData}
            menuTitle={MENU_TITLE}
            initialParams={{             /*초기파라미터 설정*/
                user: auth?.user?.userId || "",
                projectnum: projectnum,
                qnum: qnum,
                gb: "list",
            }}
            renderItem={(props) => <GridRenderer {...props} />}

        />
    );
};

export default OptionSettingTab3;
