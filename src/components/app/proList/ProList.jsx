import React, { Fragment, useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { MainListApi } from "@/components/app/mainList/MainListApi.js";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { Button } from "@progress/kendo-react-buttons";
import ProListPopup from "@/components/app/proList/ProListPopup";    // 필터문항설정 팝업

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
    // 필터문항설정 버튼 팝업 show 
    const [popupShow, setPopupShow] = useState(false);        // 필터문항설정 팝업 popupShow

    const { mainListData } = MainListApi();
    const [columns, setColumns] = useState(() => [

        // ---- VIEW 그룹 ----
        { field: "no", title: "no", show: true, editable: false, width: "80px", allowHide: false, group: "VIEW" },
        { field: "projectnum", title: "모델", show: true, editable: false, allowHide: false, group: "VIEW" },
        { field: "projectnum", title: "문번호", show: true, editable: false, allowHide: false, group: "VIEW" },
        { field: "projectname", title: "문항최종", show: true, editable: false, width: "300px", allowHide: false, group: "VIEW" },
        { field: "register_userid", title: "응답자수", show: true, editable: false, allowHide: false, group: "VIEW" },
        { field: "register_userid", title: "분석대상수", show: true, editable: false, allowHide: false, group: "VIEW" },
        { field: "servername", title: "분석완료수", show: true, editable: false, allowHide: false, group: "VIEW" },
        { field: "project_use_name", title: "진행상황", show: true, editable: false, allowHide: false, group: "VIEW" },
        { field: "filterSetting", title: "필터문항 설정", show: true, editable: false, allowHide: false, group: "VIEW" },
        { field: "project_use_name", title: "예상비용", show: true, editable: true, allowHide: false, group: "VIEW" },

        // ---- ADMIN 그룹 ----
        { field: "analyze", title: "분석", show: true, editable: true, width: "72px", allowHide: false, group: "ADMIN" },
        { field: "exclude", title: "제외", show: true, editable: true, width: "72px", allowHide: false, group: "ADMIN" },


        // ---- EDIT 그룹 ----
        { field: "mergeCheck", title: "문항통합점검", show: true, editable: true, width: "160px", allowHide: false, group: "EDIT" },
        { field: "editAction", title: "수정", show: true, editable: true, width: "120px", allowHide: false, group: "EDIT" },

        // ---- 버튼(그룹 없음) ----
        { field: "button", title: "분석(임시)", show: true, editable: true, width: "120px", allowHide: false, group: null },
    ]);

    // 행 클릭 → /open-setting 로 이동
    const onRowClick = useCallback((e) => {
        // const projectnum = e?.dataItem?.projectnum;
        // if (!projectnum) return;
        navigate('/open-setting');
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
        const groupOrder = ["VIEW", "ADMIN", "EDIT"]; // 상단 그룹 순서

        // -------------------------------
        // 🔐 잠금 상태: 행별 lock map (key = dataItemKey)
        // -------------------------------
        // 행 잠금상태: id -> boolean(잠금여부)
        const [locksById, setLocksById] = useState(new Map());

        // 데이터 로드 시 모두 잠금으로 초기화 (원하면 서버 값으로 세팅)
        useEffect(() => {
            const map = new Map();
            (dataState?.data ?? []).forEach((row) => map.set(idGetter(row), true));
            setLocksById(map);
        }, [dataState?.data, idGetter]);

        const isLocked = (row) => !!locksById.get(idGetter(row));
        const setRowLocked = (row, locked) =>
            setLocksById((m) => {
                const next = new Map(m);
                next.set(idGetter(row), locked);
                return next;
            });

        // === API 자리 ===
        const api = {
            lockOne: async (id) => {
                // TODO: await fetch('/api/lock', { method:'POST', body: JSON.stringify({ id, locked:true }) })
            },
            unlockOne: async (id) => {
                // TODO: await fetch('/api/lock', { method:'POST', body: JSON.stringify({ id, locked:false }) })
            },
            lockAll: async (ids) => {
                // TODO: await fetch('/api/lock/bulk', { method:'POST', body: JSON.stringify({ ids, locked:true }) })
            },
            unlockAll: async (ids) => {
                // TODO: await fetch('/api/lock/bulk', { method:'POST', body: JSON.stringify({ ids, locked:false }) })
            },
        };

        const toggleRowLock = async (row) => {
            const id = idGetter(row);
            const prev = isLocked(row);
            setRowLocked(row, !prev);               // 낙관적 업데이트
            try {
                await (prev ? api.unlockOne(id) : api.lockOne(id));
            } catch (e) {
                setRowLocked(row, prev);              // 실패 시 롤백
                console.error(e);
            }
        };

        const bulkSetLock = async (locked) => {
            const ids = (dataState?.data ?? []).map((r) => idGetter(r));
            const prev = new Map(locksById);
            // 낙관적 업데이트
            setLocksById(new Map(ids.map((id) => [id, locked])));
            try {
                await (locked ? api.lockAll(ids) : api.unlockAll(ids));
            } catch (e) {
                setLocksById(prev);                   // 실패 시 롤백
                console.error(e);
            }
        };


        // ---------------- header/action helpers ----------------
        // 개별 컬럼 렌더 공통 함수
        const actions = {
            onHeaderAnalyze: () => console.log('헤더: 분석 버튼 클릭'),
            onHeaderExclude: () => console.log('헤더: 제외 버튼 클릭'),
            onHeaderMergeChk: () => console.log('헤더: 문항통합점검 클릭'),
            // 수정 헤더: X = 전체 잠금, O = 전체 해제
            onHeaderEditLockAll: () => bulkSetLock(true),
            onHeaderEditUnlockAll: () => bulkSetLock(false),
        };

        // 헤더 버튼(단일)
        const HeaderBtn = ({ className = 'btnS', children, onClick }) => (
            <div onClick={(e) => e.stopPropagation()} // 정렬/소팅 이벤트 막기
                style={{ display: 'flex', justifyContent: 'center' }}>
                <Button className={className} onClick={onClick}>{children}</Button>
            </div>
        );

        // 헤더 버튼(2개)
        const HeaderBtnGroup = ({ buttons }) => (
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {buttons.map((b, i) => (
                    <Button key={i} className={b.className ?? 'btnS'} onClick={b.onClick}>
                        {b.text}
                    </Button>
                ))}
            </div>
        );

        // 라벨 + 버튼그룹(세로 스택)  ← 새로 추가
        const HeaderLabeledBtnGroup = ({ label, buttons }) => (
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
            >
                <span style={{ fontWeight: 500 }}>{label}</span>
                <HeaderBtnGroup buttons={buttons} />
            </div>
        );

        const renderLeafColumn = (c) => {
            // ADMIN: 분석(버튼 헤더)
            if (c.field === 'analyze') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        width={c.width ?? '72px'}
                        sortable={false}
                        filterable={false}
                        columnMenu={undefined}
                        headerCell={() => (
                            <HeaderBtn className="btnS" onClick={actions.onHeaderAnalyze}>
                                분석
                            </HeaderBtn>
                        )}
                    />
                );
            }

            // ADMIN: 제외(버튼 헤더)
            if (c.field === 'exclude') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        width={c.width ?? '72px'}
                        sortable={false}
                        filterable={false}
                        columnMenu={undefined}
                        headerCell={() => (
                            <HeaderBtn className="btnS btnTxt type01" onClick={actions.onHeaderExclude}>
                                제외
                            </HeaderBtn>
                        )}
                    />
                );
            }

            // EDIT: 문항통합점검(버튼 헤더)
            if (c.field === 'mergeCheck') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        width={c.width ?? '160px'}
                        sortable={false}
                        filterable={false}
                        columnMenu={undefined}
                        headerCell={() => (
                            <HeaderBtn className="btnS btnType04" onClick={actions.onHeaderMergeChk}>
                                문항통합점검
                            </HeaderBtn>
                        )}
                    />
                );
            }

            // EDIT: 수정(헤더에 버튼 2개)
            if (c.field === 'editAction') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        width={c.width ?? '120px'}
                        sortable={false}
                        filterable={false}
                        columnMenu={undefined}
                        headerCell={() => (
                            <HeaderLabeledBtnGroup
                                label="수정"
                                buttons={[
                                    { text: 'X', className: 'btnS btnTxt type02', onClick: actions.onHeaderEditLockAll },
                                    { text: 'O', className: 'btnS btnType02', onClick: actions.onHeaderEditUnlockAll },
                                ]}
                            />
                        )}
                        cell={(cellProps) => {
                            const { dataItem } = cellProps;
                            const locked = isLocked(dataItem);
                            return (
                                <td
                                    style={{ textAlign: 'center' }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Button
                                        className="btnS k-icon-button"
                                        onClick={() => toggleRowLock(dataItem)}
                                        title={locked ? '잠금 해제' : '잠금'}
                                    >
                                        <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true">{locked ? '🔒' : '🔓'}</span>
                                        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                                            {locked ? '잠금' : '해제'}
                                        </span>
                                    </Button>
                                </td>
                            );
                        }}
                    />
                );
            }
            // todo 임시버튼
            if (c.field === 'button') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        sortable={false}
                        columnMenu={undefined}
                        cell={(cellProps) => (
                            <td style={{ textAlign: "center" }}>
                                <Button className="btnM" themeColor="primary" onClick={() => onRowClick(cellProps)}>
                                    분석
                                </Button>
                            </td>
                        )}
                    />
                );
            }
            // 필터문항설정 팝업 버튼 
            if (c.field === 'filterSetting') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        sortable={false}
                        columnMenu={undefined}
                        cell={(cellProps) => (
                            <td style={{ textAlign: "center" }}>
                                <Button className="btnM" themeColor="primary"
                                    onClick={(e) => { e.stopPropagation(); setPopupShow(true); }}
                                    onMouseDown={(e) => e.stopPropagation()} >
                                    설정
                                </Button>
                            </td>
                        )}
                    />
                );
            }
            // 나머지는 기본 헤더
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
        };

        // 화면에 보일 컬럼만
        const visible = columns.filter(c => c.show !== false);

        // 1) 상위로 묶지 않는 “단일 컬럼” → 세로 2행 자동 rowSpan
        const roots = visible.filter(c => !c.group);

        // 2) 상위로 묶을 그룹들(=가로로 합칠 헤더)
        const grouped = groupOrder
            .map(name => ({ name, cols: visible.filter(c => c.group === name) }))
            .filter(g => g.cols.length > 0);

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
                            <div id="grid_01" className="cmn_grid multihead">
                                <KendoGrid
                                    parentProps={{
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
                                        initialSort: sort,
                                        initialFilter: filter,
                                        onRowClick,
                                        columnVirtualization: false,    // 멀티 헤더에서 가상화는 끄는 걸 권장
                                    }}
                                >
                                    {/* 단일 컬럼들: (no, 모델, 문번호, 문항최종) → 헤더가 2행을 세로로 차지 */}
                                    {roots.map(renderLeafColumn)}

                                    {/* 그룹 헤더 + 자식(=가로 합치기) */}
                                    {grouped.map(g => (
                                        <Column key={`grp:${g.name}`} title={g.name}>
                                            {g.cols.map(renderLeafColumn)}
                                        </Column>
                                    ))}
                                </KendoGrid>
                            </div>
                        </div>
                    </div>
                </article>
                {/* 필터문항설정 팝업 */}
                {popupShow &&
                    <ProListPopup
                        popupShow={popupShow}
                        setPopupShow={setPopupShow}
                    />
                }
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