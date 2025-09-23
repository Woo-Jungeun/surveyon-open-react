import React, { Fragment, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { useSearchParams } from "react-router-dom";
import "@/components/app/optionSetting/OptionSetting.css";

/**
 * 보기불러오기 (새창)
 *
 * @author jewoo
 * @since 2025-09-18<br />
 */
const OptionSettingExload = () => {
    const auth = useSelector((store) => store.auth);
    const navigate = useNavigate();
    const DATA_ITEM_KEY = "no";
    const SELECTED_FIELD = "selected";
    const MENU_TITLE = "보기불러오기";

    const [searchParams] = useSearchParams();
    const projectnum = (searchParams.get("projectnum") || "").trim(); // 예: n221115
    const qnum = (searchParams.get("qnum") || "").trim();       // 예: 문1
    //console.log(projectnum, qnum);

    // 좌측 전용 정렬/필터
    const [leftSort, setLeftSort] = useState([]);
    const [leftFilter, setLeftFilter] = useState(null);

    // 우측 전용 정렬/필터
    const [rightSort, setRightSort] = useState([]);
    const [rightFilter, setRightFilter] = useState(null);
    // 우측 선택 안 쓸 거라 더미 상태/세터
    const [rightSelected] = useState({});
    const noopSelect = useCallback(() => { }, []);
    const rightIdGetter = useCallback(item => item?.no, []);

    const { projectListData, excelListData } = OptionSettingApi();


    // 좌측에서 선택된 행 정보 (헤더 표기용)
    const [selectedProject, setSelectedProject] = useState(null); // { selprojectnum, project_qnum, pofname, ... }

    // 우측 데이터
    const [rightRows, setRightRows] = useState([]);

    // 좌측 컬럼 (요청 매핑 반영)
    const [leftColumns, setLeftColumns] = useState(() => [
        { field: "no", title: "순번", show: true, width: "84px", allowHide: false },
        { field: "pof", title: "프로젝트", show: true, width: "120px", allowHide: false },
        { field: "selprojectnum", title: "웹프로젝트", show: true, allowHide: false },
        { field: "pofname", title: "프로젝트명", show: true, width: "320px", allowHide: false },
        { field: "servername", title: "오픈서버정보", show: true, width: "140px", allowHide: false },
        { field: "project_qnum", title: "문항정보", show: true, width: "120px", allowHide: false },
        { field: "qid", title: "qid", show: false, allowHide: false },
    ]);

    // 우측 컬럼 (요청 매핑 반영)
    const [rightColumns] = useState(() => [
        { field: "no", title: "순번", width: "80px", show: true },
        { field: "qnum", title: "문번호", width: "120px", show: true },
        { field: "lv1", title: "대분류(lv1)", width: "140px", show: true },
        { field: "lv2", title: "중분류(lv2)", width: "140px", show: true },
        { field: "lv3", title: "소분류(lv3)", width: "220px", show: true },
        { field: "lv123code", title: "소분류코드", width: "130px", show: true },
        { field: "lv1code", title: "대분류코드", width: "130px", show: true },
        { field: "lv2code", title: "중분류코드", width: "130px", show: true },
    ]);

    // 좌측 컬럼 메뉴
    const leftColumnMenu = (menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={leftColumns}
            onColumnsChange={(updated) => {
                const map = new Map(updated.map((c) => [c.field, c]));
                const next = leftColumns.map((c) => (map.has(c.field) ? { ...c, ...map.get(c.field) } : c));
                setLeftColumns(next);
            }}
            filter={leftFilter}
            onFilterChange={({ filter }) => setLeftFilter(filter ?? undefined)}
        />
    );

    // 좌측 행 클릭 → 우측 로드
    const onLeftRowClick = useCallback(
        async (e) => {
            const row = e?.dataItem;
            if (!row) return;

            // 현재 프로젝트번호/문항정보는 이 필드로 표기
            setSelectedProject({
                selprojectnum: row?.selprojectnum ?? "",
                project_qnum: row?.project_qnum ?? "",
                pofname: row?.pofname ?? "",
                qid: row?.id ?? "",
            });

            // 우측 API 호출
            const payload = {
                user: auth?.user?.userId || "",        
                projectnum,                           
                gb: "exlist",                       
                select_projectnum: row?.selprojectnum ?? projectnum ?? "", 
                select_qnum: row?.project_qnum ?? qnum ?? "",         
                qid: row?.qid ?? "",
            };
            const res = await excelListData.mutateAsync(payload);
            const data = res?.data ?? res;           
            const list = (data?.resultjson ?? []).map((it, idx) => ({
                no: idx + 1,
                qnum: it?.qnum ?? "",
                lv1: it?.lv1 ?? "",
                lv2: it?.lv2 ?? "",
                lv3: it?.lv3 ?? "",
                lv123code: it?.lv123code ?? "",
                lv1code: it?.lv1code ?? "",
                lv2code: it?.lv2code ?? "",
            }));
            setRightRows(list);
            setRightSort([]);       // 옵션: 우측 정렬 초기화
            setRightFilter(null);   // 옵션: 우측 필터 초기화
        }, [excelListData, auth?.user?.userId, projectnum, qnum]);


    // 좌측 그리드
    const LeftGrid = useCallback(
        (props) => {
            const { selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField } = props;

            return (
                <div className="panel left">
                    <article className="subTitWrap">
                        <div className="subTit">
                            {/* <h2 className="titTxt">프로젝트 목록</h2> */}
                            <div className="kvline">
                                <span className="kv"><b>프로젝트번호</b> : <em>{projectnum}</em></span>
                                <span className="kv"><b>문항정보</b> : <em>{qnum}</em></span>
                            </div>
                        </div>
                    </article>

                    <div className="cmn_gird_wrap">
                        <div id="grid_left" className="cmn_grid">
                            <KendoGrid
                                parentProps={{
                                    data: dataState?.data,
                                    dataItemKey,
                                    selectedState,
                                    setSelectedState,
                                    selectedField,
                                    idGetter,
                                    sortable: { mode: "multiple", allowUnsort: true },
                                    filterable: true,
                                    sortChange: ({ sort }) => setLeftSort(sort ?? []),
                                    filterChange: ({ filter }) => setLeftFilter(filter ?? undefined),
                                    sort: leftSort,
                                    filter: leftFilter,
                                    onRowClick: onLeftRowClick,
                                    pageable: false, // 페이징 제거
                                    toolbar: null,   // 툴바 제거
                                }}
                            >
                                {leftColumns.filter((c) => c.show !== false).map((c) => (
                                    <Column
                                        key={c.field}
                                        field={c.field}
                                        title={c.title}
                                        width={c.width}
                                        editable={false}
                                        columnMenu={leftColumnMenu}
                                    />
                                ))}
                            </KendoGrid>
                        </div>
                    </div>
                </div>
            );
        }, [leftFilter, leftColumns, onLeftRowClick, selectedProject, leftSort]
    );

    // 우측 그리드
    const RightGrid = useMemo(() => {
        return (
            <div className="panel right">
                <article className="subTitWrap">
                    <div className="subTit">
                        <div className="kvline">
                            <span className="kv"><b>보기정보</b></span>
                        </div>
                    </div>
                </article>

                <div className="cmn_gird_wrap">
                    <div id="grid_right" className="cmn_grid">
                        <KendoGrid
                            parentProps={{
                                data: rightRows,
                                dataItemKey: "no",
                                sortable: { mode: "multiple", allowUnsort: true },
                                filterable: true,
                                sort: rightSort,
                                filter: rightFilter,
                                sortChange: ({ sort }) => setRightSort(sort ?? []),
                                filterChange: ({ filter }) => setRightFilter(filter ?? null),
                                selectedState: rightSelected,       // 비어있는 선택 상태
                                setSelectedState: noopSelect,       // 아무 것도 안 함
                                selectedField: undefined,           // 선택 필드 미사용(가능하면 undefined)
                                idGetter: rightIdGetter,            // 안전하게 id 계산
                            }}
                        >
                            {rightColumns.filter((c) => c.show !== false).map((c) => (
                                <Column key={c.field} field={c.field} title={c.title} width={c.width} />
                            ))}
                        </KendoGrid>
                    </div>
                </div>
            </div>
        );
    }, [rightRows, rightColumns, rightSort, rightFilter]);

    return (
        <Fragment>
            <div className="two-grid-layout">
                <GridData
                    dataItemKey={DATA_ITEM_KEY}
                    rowNumber={"no"}
                    selectedField={SELECTED_FIELD}
                    menuTitle={MENU_TITLE}
                    searchMutation={projectListData}
                    initialParams={{
                        user: auth?.user?.userId || "",
                        projectnum: projectnum,
                        gb: "projectlist"
                    }}
                    searchable={false}
                    pageable={false}
                    renderItem={(props) => <LeftGrid {...props} />}
                />
                {RightGrid}
            </div>
        </Fragment>
    );
};

export default OptionSettingExload; 