import React, { Fragment, useState, useMemo, useCallback, useContext } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { OptionSettingApi } from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingApi.js";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { useSelector } from "react-redux";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

// 정렬 
const natKey = (v) => {
    if (v == null) return Number.NEGATIVE_INFINITY;
    const s = String(v).trim();
    return /^\d+$/.test(s) ? Number(s) : s.toLowerCase();
};

// 정렬용 프록시를 붙일 대상 필드
const NAT_FIELDS = ["pid", "cid"];

// rows에 __sort__* 필드를 덧붙이고, 원필드→프록시 맵을 리턴
const addSortProxies = (rows = []) => {
    const proxyField = {};
    const dataWithProxies = (rows || []).map((r) => {
        const o = { ...r };
        for (const f of NAT_FIELDS) {
            const pf = `__sort__${f}`;
            o[pf] = natKey(r?.[f]);
            proxyField[f] = pf;
        }
        return o;
    });
    return { dataWithProxies, proxyField };
};

/**
 * 분석 > 그리드 영역 > rawdata
 *
 * @author jewoo
 * @since 2025-08-12<br />
 */
const OptionSettingTab3 = (props) => {
    const auth = useSelector((store) => store.auth);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const lvCode = String(props.lvCode); // 분류 단계 코드
    const { persistedPrefs, onPrefsChange, projectnum, qnum } = props;
    const DATA_ITEM_KEY = ["pid", "cid"];   // 다중 키 

    const [columns, setColumns] = useState(() =>
        persistedPrefs?.columns ?? [
            { field: "pid", title: "PID", show: true, allowHide: false, width: "130px" },
            { field: "qnum", title: "문번호", show: true, allowHide: false, width: "130px" },
            { field: "cid", title: "멀티", show: true, allowHide: false, width: "90px" },
            { field: "answer_origin", title: "원본 내용", show: true, allowHide: false, width: "150px" },
            { field: "answerfin", title: "응답 내용", show: true, allowHide: false, width: "150px" },
            { field: "lv1", title: "대분류", show: true, allowHide: false, width: "120px" },
            { field: "lv2", title: "중분류", show: true, allowHide: false, width: "120px" },
            { field: "lv3", title: "소분류", show: true, allowHide: false, width: "120px" },
            { field: "sentiment", title: "sentiment", show: true, allowHide: false, width: "150px" }
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
            // 1. 강제 숨김 처리
            if (forcedHidden.has(c.field)) {
                return { ...c, show: false, allowHide: false };
            }
            // 2. 1단계일 때, 원본내용/응답내용/소분류 컬럼의 width 제거 (꽉 차게)
            if (lvCode === "1" && ["answer_origin", "answerfin", "lv3"].includes(c.field)) {
                const { width, ...rest } = c; // width 제외
                return rest;
            }
            return c;
        });
    }, [columns, forcedHidden, lvCode]);

    // 정렬/필터를 controlled로
    const [sort, setSort] = useState(persistedPrefs?.sort ?? []);
    const [filter, setFilter] = useState(persistedPrefs?.filter ?? null);

    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = useCallback((menuProps) => (
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
                setFilter(e ?? null);
                onPrefsChange?.({ filter: e });  // 상단에 저장 
            }}
            onSortChange={(e) => setSort(e ?? [])} // sortArr는 배열 형태
        />
    ), [columns, forcedHidden, stageFields, onPrefsChange, filter])

    const { optionEditData } = OptionSettingApi();

    //grid rendering 
    const GridRenderer = (props) => {
        const { selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField } = props;
        const { dataWithProxies, proxyField } = useMemo(
            () => addSortProxies(dataState?.data || []),
            [dataState?.data]
        );
        const mappedSort = useMemo(
            () => (sort || []).map(s => ({ ...s, field: proxyField[s.field] ?? s.field })),
            [sort, proxyField]
        );

        return (
            <Fragment>
                <div id="grid_01" className={`cmn_grid ${String(lvCode) !== "1" ? "force-scroll" : ""}`} style={{ marginBottom: '0px' }}>
                    <KendoGrid
                        key={`lv-${lvCode}`}
                        parentProps={{
                            data: dataWithProxies,       // props에서 직접 전달
                            dataItemKey: dataItemKey,    // 합성 키 또는 단일 키 
                            selectedState,
                            setSelectedState,
                            selectedField,               //  선택 필드 전달
                            idGetter,                     // GridData가 만든 getter 그대로
                            onProcessedDataUpdate: (arr) => {
                                if (arr && arr.length > 0) {
                                    // Kendo가 실제 화면 데이터 계산 완료 → 로딩 닫기
                                    loadingSpinner.hide();
                                }
                            },                        // 클라 처리
                            sortable: { mode: "multiple", allowUnsort: true },
                            filterable: true,
                            sort: mappedSort,
                            filter: filter,
                            sortChange: ({ sort: next }) => {
                                const nextRaw = (next || []).map(d => {
                                    const orig = Object.keys(proxyField).find(k => proxyField[k] === d.field);
                                    return { ...d, field: orig || d.field };
                                });
                                setSort(nextRaw ?? []);
                                onPrefsChange?.({ sort: nextRaw ?? [] });
                            },
                            filterChange: ({ filter }) => { setFilter(filter ?? null); onPrefsChange?.({ filter: filter ?? null }); },
                        }}
                    >
                        {effectiveColumns.filter(c => c.show !== false).map((c) => {
                            if (["pid", "cid"].includes(c.field)) {
                                const proxy = proxyField[c.field] ?? `__sort__${c.field}`;
                                return (
                                    <Column
                                        key={c.field}
                                        field={proxy}  // 정렬용은 proxy
                                        title={c.title}
                                        width={c.width}
                                        editable={c.editable}
                                        // 메뉴에는 원래 field를 넘겨 줌
                                        columnMenu={(menuProps) => columnMenu({ ...menuProps, field: c.field })}
                                        cell={(p) => (
                                            <td title={p.dataItem[c.field]}>
                                                {p.dataItem[c.field]}
                                            </td>
                                        )}
                                    />
                                );
                            }

                            // 나머지 컬럼은 그대로
                            return (
                                <Column
                                    key={c.field}
                                    field={c.field}
                                    title={c.title}
                                    width={c.width}
                                    editable={c.editable}
                                    columnMenu={columnMenu}
                                    cell={(p) => (
                                        <td title={p.dataItem[c.field]}>
                                            {p.dataItem[c.field]}
                                        </td>
                                    )}
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
            searchMutation={{
                ...optionEditData,
                mutateAsync: async (params) => {
                    const res = await optionEditData.mutateAsync(params);

                    // resultjson이 빈 배열일 경우 로딩바 닫기
                    if (Array.isArray(res?.resultjson) && res.resultjson.length === 0) {
                        loadingSpinner.hide();
                    }

                    return res;
                },
            }}
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
