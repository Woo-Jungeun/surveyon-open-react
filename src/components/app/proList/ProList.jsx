import React, { Fragment, useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { ProListApi } from "@/components/app/proList/ProListApi.js";
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
    const projectnum = state?.projectnum;  // 프로젝트 번호 
    // 정렬/필터를 controlled로
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    // 필터문항설정 버튼 팝업 show 
    const [popupShow, setPopupShow] = useState(false);        // 필터문항설정 팝업 popupShow

    const { proListData } = ProListApi();

    // 서브그룹으로 묶으면서 리프 헤더를 숨기는 헬퍼
    const withSubgroup = (sub, leafOrder = 0) => (col) => ({
        ...col,
        subgroup: sub,
        noLeafHeader: true,
        leafOrder,
    });

    const [columns, setColumns] = useState(() => [
        // ----- VIEW -----
        { field: "no", title: "no", group: "VIEW", show: true, allowHide: false, order: 1, width: "80px" },
        { field: "model", title: "모델", group: "VIEW", show: true, allowHide: false, order: 2 },
        { field: "qnum", title: "문번호", group: "VIEW", show: true, allowHide: false, order: 3, width: "150px" },

        // 문항최종(이미 묶음)
        withSubgroup("문항최종", 1)({ field: "qnum_text", title: "문항최종번호", group: "VIEW", show: true, allowHide: false, order: 4, width: "150px" }),
        withSubgroup("문항최종", 2)({ field: "question_fin", title: "문항최종", group: "VIEW", show: true, allowHide: false, order: 4, width: "300px" }),

        { field: "status_cnt", title: "응답자수", group: "VIEW", show: true, allowHide: false, order: 5 },
        { field: "status_cnt_duplicated", title: "분석대상수", group: "VIEW", show: true, allowHide: false, order: 6 },
        { field: "status_cnt_fin", title: "분석완료수", group: "VIEW", show: true, allowHide: false, order: 7 },
        { field: "status_text", title: "진행상황", group: "VIEW", show: true, allowHide: false, order: 8 },
        { field: "filterSetting", title: "필터문항 설정", group: "VIEW", show: true, editable: false, allowHide: false, order: 9 },
        { field: "tokens_text", title: "예상비용", group: "VIEW", show: true, allowHide: false, order: 10 },

        // ----- ADMIN → "분석/제외"로 합치기 -----
        { field: "useYN", title: "분석", group: "ADMIN", show: true, order: 1, width: "72px" },
        { field: "exclude", title: "제외", group: "ADMIN", show: true, order: 2, width: "72px" },

        // ----- EDIT  → "문항통합"으로 합치기 -----
        { field: "merge_qnum", title: "문항통합저장", group: "EDIT", show: true, order: 1, width: "160px" },
        { field: "project_lock", title: "수정", group: "EDIT", show: true, order: 2, width: "120px" },
    ]);

    // 행 클릭 → /open-setting 로 이동
    const goOpenSetting = useCallback(
        (qnum) => navigate('/open-setting', { state: { qnum } }),
        [navigate]
    );

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
            onHeaderUseYN: () => console.log('헤더: 분석 버튼 클릭'),
            onHeaderExclude: (e) => console.log('헤더: 제외 버튼 클릭'),
            onHeaderMergeChk: () => console.log('헤더: 문항통합저장 클릭'),
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
            if (c.field === 'useYN') {
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
                            <HeaderBtn className="btnS" onClick={actions.onHeaderUseYN}>
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
                        cell={(cellProps) => {
                            const { qnum } = cellProps.dataItem;
                            return (
                                <td style={{ textAlign: 'center' }}>
                                    <Button
                                        className="btnM"
                                        themeColor="primary"
                                        onClick={(e) => { e.stopPropagation(); goOpenSetting(qnum); }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        분석
                                    </Button>
                                </td>
                            );
                        }}
                    />
                );
            }
            // EDIT: 문항통합저장(버튼 헤더)
            if (c.field === 'merge_qnum') {
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
                                문항통합저장
                            </HeaderBtn>
                        )}
                    />
                );
            }
            // EDIT: 수정(헤더에 버튼 2개)
            if (c.field === 'project_lock') {
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
            // 문항최종 subgroup 아래의 리프 헤더 숨김
            if (c.noLeafHeader) {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        width={c.width}
                        title=""                       // 헤더 텍스트도 비우기
                        editable={c.editable}
                        sortable={false}               // 정렬 끔
                        filterable={false}             // 필터 끔
                        columnMenu={undefined}         // 컬럼 메뉴 끔
                        headerCell={() => <></>}       // 헤더 콘텐츠 자체 미렌더
                        headerClassName="no-leaf-header"
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

        // 상위로 묶지 않는 단일 컬럼
        const roots = visible.filter(c => !c.group);

        // 1단 그룹 → 2단 subgroup → leaf
        const groups = groupOrder
            .map(name => {
                const inGroup = visible.filter(c => c.group === name);
                const subgroups = [...new Set(inGroup.map(c => c.subgroup).filter(Boolean))];
                return { name, inGroup, subgroups };
            })
            .filter(g => g.inGroup.length > 0);

        const MERGED_SUBGROUPS = new Set(["문항최종"]);
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
                                        height: "800px",
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
                                        // onRowClick,
                                        columnVirtualization: false,    // 멀티 헤더에서 가상화는 끄는 걸 권장
                                    }}
                                >
                                    {/* 단일 컬럼들: (no, 모델, 문번호, 문항최종) → 헤더가 2행을 세로로 차지 */}
                                    {roots.map(renderLeafColumn)}

                                    {/* 그룹 헤더 */}
                                    {groups.map(g => {
                                        // 같은 그룹 안에서 subgroup 단위로 묶기
                                        const inGroup = visible.filter(c => c.group === g.name);
                                        const bySub = new Map(); // subgroupName -> { cols, order }

                                        inGroup.forEach((c, idx) => {
                                            const key = c.subgroup || "__root__";
                                            const entry = bySub.get(key) || { cols: [], order: Number.POSITIVE_INFINITY, _idx: idx };
                                            entry.cols.push(c);
                                            const ord = Number.isFinite(c.order) ? c.order : 1e6;
                                            entry.order = Math.min(entry.order, ord);   // 서브그룹의 정렬 기준 = 자식들의 최소 order
                                            bySub.set(key, entry);
                                        });

                                        // root 컬럼은 개별 아이템으로, 서브그룹은 묶음 아이템으로 합치기
                                        const items = [];

                                        const root = bySub.get("__root__");
                                        if (root) {
                                            root.cols.forEach((c, i) => {
                                                items.push({ type: "col", order: Number.isFinite(c.order) ? c.order : 1e6, _idx: i, col: c });
                                            });
                                            bySub.delete("__root__");
                                        }

                                        for (const [sub, entry] of bySub.entries()) {
                                            // 서브그룹 내부 컬럼 순서도 원하면 c.leafOrder 등으로 정렬 가능
                                            const colsSorted = entry.cols.slice().sort((a, b) =>
                                                (a.leafOrder ?? 0) - (b.leafOrder ?? 0)
                                            );
                                            items.push({ type: "sub", order: entry.order, _idx: entry._idx, sub, cols: colsSorted });
                                        }

                                        // order → 원래 인덱스 순으로 안정 정렬
                                        items.sort((a, b) => (a.order - b.order) || (a._idx - b._idx));

                                        return (
                                            <Column key={`grp:${g.name}`} title={g.name}>
                                                {items.map(it =>
                                                    it.type === "col"
                                                        ? renderLeafColumn(it.col)
                                                        : (
                                                            <Column
                                                                key={`sub:${g.name}:${it.sub}`}
                                                                title={it.sub}
                                                                headerClassName={[
                                                                    MERGED_SUBGROUPS.has(it.sub) ? "sub-no-bottom-border" : "",
                                                                    (it.sub === "분석/제외" || it.sub === "문항통합") ? "collapse-subgroup-title" : ""
                                                                ].filter(Boolean).join(" ")}
                                                            >
                                                                {it.cols.map(renderLeafColumn)}
                                                            </Column>
                                                        )
                                                )}
                                            </Column>
                                        );
                                    })}

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
            searchMutation={proListData}
            initialParams={{             /*초기파라미터 설정*/
                user: auth?.user?.userId || "",
                projectnum: projectnum,
                gb: "select"
            }}
            renderItem={(props) => <GridRenderer {...props} />}
        />
    );
};

export default ProList;