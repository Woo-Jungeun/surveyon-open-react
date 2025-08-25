import React, { Fragment, useState, useEffect, useRef, useMemo } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { Checkbox } from "@progress/kendo-react-inputs";
/**
 * 분석 > 그리드 영역 > rawdata
 *
 * @author jewoo
 * @since 2025-08-12<br />
 */
const OptionSettingTab3 = (props) => {
    const lvCode = String(props.lvCode); // 분류 단계 코드
    const { persistedPrefs, onPrefsChange } = props;
    const DATA_ITEM_KEY = ["pid", "cid"];   // 다중 키 
    const MENU_TITLE = "rawdata";

    const [columns, setColumns] = useState(() =>
        persistedPrefs?.columns ?? [
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
        return columns.map(c => {
            if (forcedHidden.has(c.field)) {
                return { ...c, show: false, allowHide: false };
            }
            if (stageFields.has(c.field)) {
                // 해당 단계에서 허용되면 무조건 보여주고, 토글도 막음
                return { ...c, show: true, allowHide: false };
            }
            return c;
        });
    }, [columns, forcedHidden, stageFields]);

    // 정렬/필터를 controlled로
    const [sort, setSort] = useState(persistedPrefs?.sort ?? []);
    const [filter, setFilter] = useState(persistedPrefs?.filter ?? null);

    // 변경시 부모에 저장 (딜레이 없이 즉시 패치)
    useEffect(() => { onPrefsChange?.({ sort }); }, [sort]);
    useEffect(() => { onPrefsChange?.({ filter }); }, [filter]);

    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = (menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={columns
                .filter(c => !forcedHidden.has(c.field))
                .map(c => stageFields.has(c.field) ? { ...c, allowHide: false } : c)
              }
            onColumnsChange={(updated) => {
                const map = new Map(updated.map(c => [c.field, c]));
                const next = columns.map(c => {
                    if (forcedHidden.has(c.field)) return { ...c, show: false }; // 강제 숨김
                    const u = map.get(c.field);
                    const merged = u ? { ...c, ...u } : c;
                    // 단계 컬럼은 허용 시 항상 보이게 고정
                    return stageFields.has(c.field) ? { ...merged, show: true, allowHide: false } : merged;
                });
                setColumns(next);
                onPrefsChange?.({ columns: next }); // 부모에 저장
            }}
            filter={filter}
            onFilterChange={(e) => setFilter(e)}   // 필터 저장

        />
    );

    const { getGridData } = OptionSettingApi();

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
                            sortable: { mode: "multiple", allowUnsort: true }, // 다중 정렬
                            sort,                                 // controlled sort
                            sortChange: (e) => setSort(e.sort),
                            filterable: true,                                   // 필터 허용
                            filter,                               // controlled filter
                            filterChange: (e) => setFilter(e.filter),
                        }}
                    >
                        {effectiveColumns.filter(c => c.show !== false).map((c) => {
                            if (c.field === "recheckyn") {
                                return (
                                    <Column
                                        key={c.field}
                                        field="recheckyn"
                                        title={c.title}
                                        width={c.width || "100px"}
                                        columnMenu={columnMenu}
                                        sortable
                                        cell={(cellProps) => {
                                            const checked = String(cellProps.dataItem?.recheckyn ?? "")
                                                .trim()
                                                .toLowerCase() === "y";
                                            return (
                                                <td
                                                    style={{ textAlign: "center" }}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Checkbox checked={checked} disabled onChange={() => { }} />
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
            </Fragment>
        );
    }

    return (
        <GridData
            dataItemKey={DATA_ITEM_KEY}
            searchMutation={getGridData}
            menuTitle={MENU_TITLE}
            initialParams={{             /*초기파라미터 설정*/
                key: "",
                user: "syhong",
                // projectnum: "q250089uk",
                // qnum: "A2-2",
                projectnum: "q250089uk",
                qnum: "Z1",
                gb: "list",
            }}
            renderItem={(props) => <GridRenderer {...props} />}

        />
    );
};

export default OptionSettingTab3;
