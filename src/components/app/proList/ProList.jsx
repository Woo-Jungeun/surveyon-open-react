import React, { Fragment, useState, useCallback, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { ProListApi } from "@/components/app/proList/ProListApi.js";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { Button } from "@progress/kendo-react-buttons";
import ProListPopup from "@/components/app/proList/ProListPopup";    // 필터문항설정 팝업
import "@/components/app/proList/ProList.css";
import { modalContext } from "@/components/common/Modal.jsx";
/**
 * 문항 목록
 *
 * @author jewoo
 * @since 2025-09-12<br />
 */
const ProList = () => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const navigate = useNavigate();
    const DATA_ITEM_KEY = "no";
    const SELECTED_FIELD = "selected";
    const MENU_TITLE = "문항 목록";
    const { state } = useLocation();
    const projectnum = state?.projectnum;  // 프로젝트 번호 

    // 정렬/필터를 controlled
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [popupShow, setPopupShow] = useState(false);        // 필터문항설정 팝업 popupShow

    const { proListData, editMutation } = ProListApi();

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
        withSubgroup("문항최종", 1)({ field: "qnum_text", title: "문항최종번호", group: "VIEW", show: true, allowHide: false, order: 4 }),
        withSubgroup("문항최종", 2)({ field: "question_fin", title: "문항최종", group: "VIEW", show: true, allowHide: false, order: 4, width: "350px", wrap: true }),

        { field: "status_cnt", title: "응답자수", group: "VIEW", show: true, allowHide: false, order: 5 },
        { field: "status_cnt_duplicated", title: "분석대상수", group: "VIEW", show: true, allowHide: false, order: 6 },
        { field: "status_cnt_fin", title: "분석완료수", group: "VIEW", show: true, allowHide: false, order: 7 },
        { field: "status_text", title: "진행상황", group: "VIEW", show: true, allowHide: false, order: 8 },
        { field: "filterSetting", title: "필터문항 설정", group: "VIEW", show: true, editable: false, allowHide: false, order: 9 },
        { field: "tokens_text", title: "예상비용", group: "VIEW", show: true, allowHide: false, order: 10 },

        // ----- ADMIN → "분석/제외"로 합치기 -----
        { field: "useYN", title: "분석", group: "ADMIN", show: true, order: 1 },
        { field: "exclude", title: "제외", group: "ADMIN", show: true, order: 2 },

        // ----- EDIT  → "문항통합"으로 합치기 -----
        withSubgroup("문항통합저장", 1)({ field: "merge_qnum", title: "", group: "EDIT", show: true, allowHide: false, order: 1 }),
        withSubgroup("문항통합저장", 2)({ field: "merge_qnum_check", title: "", group: "EDIT", show: true, allowHide: false, order: 1 }),

        { field: "project_lock", title: "수정", group: "EDIT", show: true, order: 2 },
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
        const { selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField, handleSearch } = props;
        const groupOrder = ["VIEW", "ADMIN", "EDIT"]; // 상단 그룹 순서

        const [locksById, setLocksById] = useState(new Map());          // 행 잠금상태
        const [excludedById, setExcludedById] = useState(new Map());    // 분석/제외 토글 상태
        const [mergeEditsById, setMergeEditsById] = useState(new Map()); // 행별 머지 텍스트 편집값

        // ---------------- merge helpers ----------------
        // 데이터 들어올 때 최초값을 편집상태에 채움(이미 편집한 값은 보존)
        useEffect(() => {
            const rows = dataState?.data ?? [];
            setMergeEditsById(prev => {
                const next = new Map(prev);
                rows.forEach(r => {
                    if (!next.has(r.id)) next.set(r.id, r?.merge_qnum_check ?? "");
                });
                return next;
            });
        }, [dataState?.data]);

        const norm = (s) => String(s ?? "").trim();
        const getMergeVal = (row) =>
            mergeEditsById.has(row?.id) ? mergeEditsById.get(row?.id) : (row?.merge_qnum_check ?? "");
        const setMergeVal = (row, v) =>
            setMergeEditsById(m => { const n = new Map(m); n.set(row?.id, v); return n; });
        // 변경된 셀만 모아 객체 { [qid]: value }
        const getMergeChanges = () => {
            const rows = dataState?.data ?? [];
            const changed = {};
            rows.forEach(r => {
                if (isLocked(r)) return;                      // 수정불가 제외
                const base = norm(r?.merge_qnum ?? "");
                const cur = norm(getMergeVal(r));
                if (cur !== base) changed[r.id] = cur;        // qid = row.id
            });
            return changed;
        };

        const sendMergeAll = async (changes) => {
            const ids = Object.keys(changes);
            if (ids.length === 0) {
                modal.showErrorAlert("알림", "변경된 항목이 없습니다.");
                return;
            }
            // id -> no 매핑
            const idToNo = new Map((dataState?.data ?? []).map(r => [String(r.id), r.no]));
            // 빈값(공백 포함)인 변경건 수집
            const blankIds = ids.filter((qid) => norm(changes[qid]) === "");
            if (blankIds.length > 0) {
                const blankNos = blankIds
                    .map((qid) => idToNo.get(String(qid)))
                    .filter((v) => v !== undefined);
                modal.showErrorAlert(
                    "알림",
                    `[행: ${blankNos.join(", ")}] 분석을 위해 '문항통합'란을 입력해 주세요.`
                );
                return;
            }
            const payload = {
                user: auth?.user?.userId || "",
                projectnum,
                gb: "allmerge",
                val: changes,   // { qid: "값", ... }
            };
            const res = await editMutation.mutateAsync(payload);
            if (res?.success === "777") {
                handleSearch?.();                          // 저장 성공 → 재조회
            } else {
                modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다.");
            }
        };

        // ---------------- analysis helpers ----------------
        // useYN 기반으로 제외 여부 파싱
        const deriveExcluded = (row) => {
            const u = String(row?.useYN ?? "").trim();
            if (u === "제외") return true;       // 제외
            return false;                        // '분석', '머지', 공백 등은 포함
        };

        // 초기화: API 데이터 들어올 때 한 번 세팅
        useEffect(() => {
            const m = new Map();
            (dataState?.data ?? []).forEach((row) => {
                m.set(row?.id, deriveExcluded(row));
            });
            setExcludedById(m);
        }, [dataState?.data]);

        const isExcluded = (row) =>
            excludedById.has(row?.id) ? !!excludedById.get(row?.id) : deriveExcluded(row);

        const setExcluded = (row, excluded) =>
            setExcludedById(m => { const n = new Map(m); n.set(row.id, excluded); return n; });

        // API 호출 (row / all)
        const sendAnalysis = async ({ scope, excluded, id }) => {
            const payload = {
                user: auth?.user?.userId || "",
                projectnum,
                gb: scope === "row" ? "analysis" : "allanalysis",
                columnname: "useyn",
                val: excluded ? "제외" : "분석",
                ...(scope === "row" ? { qid: id } : {}),
            };
            const res = await editMutation.mutateAsync(payload);
            if (res?.success === "777") {
                handleSearch?.();   // 재조회
            } else {
                modal.showErrorAlert("에러", "오류가 발생했습니다.");
            }
        };

        // 행 토글
        const toggleExcluded = async (row) => {
            const prev = isExcluded(row);
            setExcluded(row, !prev); // 낙관적
            try {
                await sendAnalysis({ scope: "row", excluded: !prev, id: row?.id });
            } catch (e) {
                setExcluded(row, prev); // 실패 롤백
                console.error(e);
            }
        };

        // 머지 여부
        const isMergeRow = (row) => String(row?.useYN ?? '').trim() === '머지';

        // 전체 토글
        const bulkSetExcluded = async (excluded) => {
            const rows = dataState?.data ?? [];
            const prev = new Map(excludedById);

            // 머지 행은 기존 상태 유지
            const next = new Map(
                rows.map((r) => [r?.id, isMergeRow(r) ? isExcluded(r) : excluded])
            );
            setExcludedById(next);

            try {
                await sendAnalysis({ scope: 'all', excluded });
            } catch (e) {
                setExcludedById(prev);
                console.error(e);
            }
        };

        // ---------------- lock helpers ----------------
        // 행별 잠금상태 초기화: API의 project_lock 값에 맞춤
        useEffect(() => {
            const map = new Map();
            (dataState?.data ?? []).forEach((row) => {
                map.set(row?.id, row?.project_lock === "수정불가");
            });
            setLocksById(map);
        }, [dataState?.data, idGetter]);

        const isLocked = (row) => !!locksById.get(row?.id);
        const setRowLocked = (row, locked) =>
            setLocksById((m) => {
                const next = new Map(m);
                next.set(row?.id, locked);
                return next;
            });

        // 수정 잠금 api 연결     
        const sendLock = async (gbVal, lockVal, id) => {
            const payload = {
                user: auth?.user?.userId || "",
                projectnum,
                gb: gbVal,
                columnname: "project_lock",
                val: lockVal,
                ...(gbVal === "rowEdit" ? { qid: id } : {}),
            };
            const res = await editMutation.mutateAsync(payload);
            if (res?.success === "777") {
                handleSearch?.();   // 재조회
            } else {
                modal.showErrorAlert("에러", "오류가 발생했습니다.");
            }
        };

        // 수정 잠금 api 구분
        const lockApi = {
            // 행 하나 잠금/해제
            lockOne: (id) => sendLock("rowEdit", "수정불가", id),
            unlockOne: (id) => sendLock("rowEdit", "수정", id),

            // 전체 잠금/해제
            lockAll: () => sendLock("allEdit", "수정불가"),
            unlockAll: () => sendLock("allEdit", "수정"),
        };

        const toggleRowLock = async (row) => {
            const prev = isLocked(row);
            setRowLocked(row, !prev);
            try {
                await (prev ? lockApi.unlockOne(row?.id) : lockApi.lockOne(row?.id));
            } catch (e) {
                setRowLocked(row, prev);              // 실패 시 롤백
                console.error(e);
            }
        };

        const bulkSetLock = async (locked) => {
            const ids = (dataState?.data ?? []).map((r) => r.id);
            const prev = new Map(locksById);
            setLocksById(new Map(ids.map((id) => [id, locked])));
            try {
                await (locked ? lockApi.lockAll() : lockApi.unlockAll());
            } catch (e) {
                setLocksById(prev);                   // 실패 시 롤백
                console.error(e);
            }
        };

        // ---------------- header/action helpers ----------------
        // 개별 컬럼 렌더 공통 함수
        const actions = {
            onHeaderUseYN: () => bulkSetExcluded(false), // 전체 분석
            onHeaderExclude: () => bulkSetExcluded(true), // 전체 제외
            onHeaderMergeSave: () => sendMergeAll(getMergeChanges()),
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

        // 라벨 + 버튼그룹(세로 스택)
        const HeaderLabeledBtnGroup = ({ label, buttons }) => (
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
            >
                <span style={{ fontWeight: 500 }}>{label}</span>
                <HeaderBtnGroup buttons={buttons} />
            </div>
        );

        // 컬럼에서 wrap이면 멀티라인 셀 사용 => 문항 최종 
        const WrapCell = (field) => (cellProps) => (
            <td className="cell-wrap">{cellProps.dataItem?.[field]}</td>
        );

        const renderLeafColumn = (c) => {
            // 분석 상태가 머지일 경우 숨길 컬럼 
            const BlankWhenMergeCell = (field) => (cellProps) => {
                const row = cellProps.dataItem;
                return <td>{isMergeRow(row) ? '' : row?.[field]}</td>;
            };

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
                        cell={(cellProps) => {
                            const row = cellProps.dataItem;
                            const excluded = isExcluded(row);
                            const locked = isLocked(row); // 잠금 여부

                            // 포함 상태일 때 표시 텍스트: '머지'면 '머지', 아니면 '분석'
                            const includeLabel = String(row?.useYN ?? '').trim() === '머지' ? '머지' : '분석';

                            // 최종 라벨/스타일
                            const state = excluded ? 'exclude' : (includeLabel === '머지' ? 'merge' : 'analysis');
                            const label = excluded ? '제외' : includeLabel;

                            // 디자인 칩 클래스 (색상 매칭)
                            const cls = `chip chip--${state} ${locked ? 'chip--disabled' : ''}`;

                            return (
                                <td style={{ textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                    <Button className={cls} disabled={locked} onClick={() => { if (!locked) toggleExcluded(row); }}>
                                        <span className="chip-check" aria-hidden>✓</span>
                                        <span className="chip-label">{label}</span>
                                    </Button>
                                </td>
                            );
                        }}
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
                            const row = cellProps.dataItem;
                            const { qnum } = row;
                            const excluded = isExcluded(row);
                            const locked = isLocked(row);
                            return (
                                <td style={{ textAlign: 'center' }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}>
                                    {!excluded && (
                                        <Button
                                            className={`btnM ${locked ? 'btnM--disabled' : ''}`}
                                            themeColor={locked ? 'base' : 'primary'}
                                            disabled={locked}
                                            onClick={() => { if (!locked) goOpenSetting(qnum); }}
                                        >
                                            분석
                                        </Button>
                                    )}
                                </td>
                            );
                        }}
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
                                    { text: 'X', className: 'btnS btnTxt type02', onClick: () => bulkSetLock(true) },
                                    { text: 'O', className: 'btnS btnType02', onClick: () => bulkSetLock(false) },
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
            if (c.noLeafHeader && c.subgroup === "문항최종") {
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
                        cell={c.wrap ? WrapCell(c.field) : undefined}   // wrap이면 멀티라인 셀 사용
                    />
                );
            }
            if (c.field === 'status_cnt_duplicated') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        columnMenu={columnMenu}
                        cell={BlankWhenMergeCell('status_cnt_duplicated')}
                    />
                );
            }
            if (c.field === 'status_cnt_fin') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        columnMenu={columnMenu}
                        cell={BlankWhenMergeCell('status_cnt_fin')}
                    />
                );
            }
            if (c.field === 'status_text') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        columnMenu={columnMenu}
                        cell={BlankWhenMergeCell('status_text')}
                    />
                );
            }
            if (c.field === 'tokens_text') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        columnMenu={columnMenu}
                        cell={BlankWhenMergeCell('tokens_text')}
                    />
                );
            }
            // 1번째 컬럼은 그대로(텍스트)
            if (c.field === 'merge_qnum') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title=""
                        sortable={false}
                        filterable={false}
                        columnMenu={undefined}
                        headerCell={() => <></>}
                    />
                );
            }
            // 2번째 컬럼 = 입력 가능 + 값 다르면 노란색
            if (c.field === 'merge_qnum_check') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title=""
                        sortable={false}
                        filterable={false}
                        columnMenu={undefined}
                        headerCell={() => <></>}
                        cell={(cellProps) => {
                            const row = cellProps.dataItem;
                            const base = norm(row?.merge_qnum ?? "");        // 1번째 컬럼(기준값)
                            const initial = getMergeVal(row);                // 편집 시작값
                            const tdRef = React.useRef(null);
                            const locked = isLocked(row); // "수정불가"면 true

                            return (
                                <td
                                    ref={tdRef}
                                    className={norm(initial) !== base ? 'cell-merge-diff' : ''}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        type="text"
                                        className="merge-input"
                                        defaultValue={initial}              // uncontrolled
                                        disabled={locked}
                                        placeholder="번호 입력"
                                        onChange={(e) => {                  // 리렌더 없이 노란색 토글
                                            const now = norm(e.target.value);
                                            if (!tdRef.current) return;
                                            if (now !== base) tdRef.current.classList.add('cell-merge-diff');
                                            else tdRef.current.classList.remove('cell-merge-diff');
                                        }}
                                        onBlur={(e) => {                    // 포커스 빠질 때만 상태 저장
                                            setMergeVal(row, e.target.value);
                                        }}
                                        onKeyDown={(e) => {                 // Enter로 저장
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                        }}
                                    />
                                </td>
                            );
                        }}
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

        return (
            <Fragment>
                <article className="subTitWrap">
                    <div className="subTit">
                        <h2 className="titTxt">문항 목록</h2>
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
                                    {/* 단일 컬럼들: (no, 모델, 문번호) → 헤더가 2행을 세로로 차지 */}
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
                                                                // 문항최종은 기존처럼 텍스트 유지 + 아래줄 제거
                                                                title={it.sub === "문항최종" ? "문항최종" : ""}
                                                                headerClassName={[
                                                                    (it.sub === "문항최종" || it.sub === "문항통합저장")
                                                                        ? "sub-no-bottom-border"
                                                                        : "",
                                                                ].filter(Boolean).join(" ")}
                                                                headerCell={
                                                                    it.sub === "문항통합저장"
                                                                        ? () => (
                                                                            <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "center" }}>
                                                                                <Button className="btnS btnType04" onClick={actions.onHeaderMergeSave}>
                                                                                    문항통합저장
                                                                                </Button>
                                                                            </div>
                                                                        )
                                                                        : undefined
                                                                }
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