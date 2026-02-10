import React, { useRef, useMemo, useCallback, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import ProListPopup from "@/services/aiOpenAnalysis/app/proList/ProListPopup";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import GridHeaderBtnTxt from "@/components/style/button/GridHeaderBtnTxt.jsx";
import AiDataHeader from "@/services/aiOpenAnalysis/components/AiDataHeader.jsx";
import { PERM, hasPerm, addSortProxies, GROUP_MIN_PERM, FIELD_MIN_PERM } from "./ProListUtils";
import GridDataCount from "@/components/common/grid/GridDataCount";
import "./ProList.css";
import { process } from "@progress/kendo-data-query";

const ProListGridRenderer = (props) => {
    const renderCount = useRef(0);
    renderCount.current += 1;

    const {
        // GridData props
        selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField, handleSearch,
        // ProList props
        auth, projectnum, userPerm, modal, navigate,
        editMutation,
        scrollTopRef,
        mergeEditsById, setMergeEditsById,
        mergeSavedBaseline, setMergeSavedBaseline,
        locksById, setLocksById,
        excludedById, setExcludedById,
        columns, setColumns,
        columnsForPerm,
        filter, setFilter,
        sort, setSort,
        popupShow, setPopupShow,
        goOpenSetting,
        handleExportExcelDev,
        handleExportExcelDP,
        userAuth
    } = props;

    const groupOrder = ["VIEW", "ADMIN", "EDIT"]; // 상단 그룹 순서

    const pendingFlushRef = useRef(false); // 저장 후 1회 입력 캐시 초기화 플래그
    const { dataWithProxies, proxyField } = useMemo(
        () => addSortProxies(dataState?.data || []),
        [dataState?.data]
    );
    const mappedSort = useMemo(
        () => (sort || []).map(s => ({ ...s, field: proxyField[s.field] ?? s.field })),
        [sort, proxyField]
    );

    // 필터링된 데이터 개수 계산
    const processedData = useMemo(
        () => process(dataWithProxies, { filter }),
        [dataWithProxies, filter]
    );
    const filteredCount = processedData.total;

    // 저장 여부 확인 
    const blockWhenDirty = useCallback(() => {
        // 블러된 변경: 상태 기반
        const changed = getMergeChanges();
        const hasChanged = Object.keys(changed).length > 0;

        // 블러 전 변경: 셀에 붙여둔 .cell-merge-diff 존재 여부
        const gridEl = document.getElementById('grid_01');
        const hasDirtyCell = !!(gridEl && gridEl.querySelector('.cell-merge-diff'));
        if (hasChanged || hasDirtyCell) {
            modal.showErrorAlert("알림", "문항통합 입력에 저장되지 않은 내용이 있습니다.\n[문항통합저장]을 먼저 눌러 저장해 주세요.");
            return true; // block
        }
        return false; // proceed
    }, [dataState?.data, mergeEditsById, modal]);

    // ---------------- merge helpers ----------------
    const norm = (s) => String(s ?? "").trim();
    const getMergeVal = (row) =>
        mergeEditsById.has(row?.id) ? mergeEditsById.get(row?.id) : (row?.merge_qnum ?? "");
    const setMergeVal = (row, v) =>
        setMergeEditsById(m => { const n = new Map(m); n.set(row?.id, v); return n; });

    // 변경 검출 기준 = 서버값 merge_qnum
    const getMergeChanges = () => {
        const rows = dataState?.data ?? [];
        const changed = {};
        rows.forEach(r => {
            if (isLocked(r)) return;
            const base = norm(mergeSavedBaseline.get(r.id) ?? "");
            const cur = norm(getMergeVal(r));
            if (cur !== base) changed[r.id] = cur;
        });
        return changed;
    };
    // 현재 입력 기준 그룹 계산(화면 순서 유지)
    const dupGroups = useMemo(() => {
        const rows = dataState?.data ?? [];
        const map = new Map(); // key -> Row[]
        rows.forEach(r => {
            const key = norm(getMergeVal(r));
            if (!key) return;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(r); // 화면 순서 유지
        });
        const firstOfGroup = new Set();
        const restOfGroup = new Set();
        for (const [, arr] of map) {
            if (arr.length >= 2) {
                firstOfGroup.add(arr[0].id);
                for (let i = 1; i < arr.length; i++) restOfGroup.add(arr[i].id);
            }
        }
        return { firstOfGroup, restOfGroup, map };
    }, [dataState?.data, mergeEditsById]);

    // 표출 머지 여부는 "현재 입력" 기준으로 계산
    const isMergeRow = (row) => dupGroups.restOfGroup.has(row?.id);
    // 문항통합저장: "수정한 행" ∪ "그로 인해 실제 상태가 바뀐 행"만 호출
    const sendMergeAll = async () => {
        const beforeEdits = new Map(mergeEditsById);
        rememberScroll(); // 스크롤 위치 저장
        const rows = dataState?.data ?? [];
        const changesObj = getMergeChanges();                 // { id: "텍스트" }
        const changedIds = new Set(Object.keys(changesObj).map(n => Number(n))); // [추가]

        if (changedIds.size === 0) {
            modal.showErrorAlert("알림", "변경된 항목이 없습니다.");
            return;
        }

        // 빈 값 검증
        const idToNo = new Map(rows.map(r => [String(r.id), r.no]));
        const blankIds = [...changedIds].filter((qid) => norm(changesObj[qid]) === "");
        if (blankIds.length > 0) {
            const blankNos = blankIds.map((qid) => idToNo.get(String(qid))).filter(Boolean);
            modal.showErrorAlert("알림", `[행: ${blankNos.join(", ")}] 분석을 위해 '문항통합'란을 입력해 주세요.`);
            setMergeEditsById(beforeEdits);
            return;
        }

        // 서버 그룹(이전) & UI 그룹(현재 입력) 빌드
        const buildGroups = (items, getter) => {
            const m = new Map(); // key -> Row[]
            items.forEach(r => {
                const key = norm(getter(r));
                if (!key) return;
                if (!m.has(key)) m.set(key, []);
                m.get(key).push(r); // 화면 순서 유지
            });
            return m;
        };
        const serverGroups = buildGroups(rows, r => r.merge_qnum); // 이전
        const uiGroups = buildGroups(rows, r => getMergeVal(r));     // 현재(입력)

        // toCall = (수정한 행) ∪ (상태가 실제 바뀐 행)
        const toCall = new Map(); // id -> '분석' | '머지'

        // 1) 수정한 행은 무조건 후보에 포함 (요구사항 반영)
        for (const id of changedIds) {
            const r = rows.find(x => Number(x.id) === id);
            if (!r) continue;
            if (String(r?.useYN ?? "").trim() === "제외") continue; // 제외는 스킵
            const key = norm(getMergeVal(r));
            const g = uiGroups.get(key) || [];
            const target = (g.length >= 2 && g[0]?.id !== r.id) ? "머지" : "분석";
            toCall.set(r.id, target);
        }

        // 2) 그 변경으로 인해 '분석/머지' 상태가 바뀐 행만 추가
        //    (= 서버 상태 vs 현재 입력 기준 target 이 달라진 경우만)
        const affectedIds = new Set();
        for (const id of changedIds) {
            const r = rows.find(x => Number(x.id) === id);
            if (!r) continue;
            const oldKey = norm(r.merge_qnum);
            const newKey = norm(getMergeVal(r));
            (serverGroups.get(oldKey) || []).forEach(x => affectedIds.add(Number(x.id)));
            (uiGroups.get(newKey) || []).forEach(x => affectedIds.add(Number(x.id)));
        }

        for (const r of rows) {
            if (!affectedIds.has(Number(r.id))) continue;
            if (String(r?.useYN ?? "").trim() === "제외") continue; // 제외는 건드리지 않음
            if (isLocked(r)) continue;

            const key = norm(getMergeVal(r));
            const g = uiGroups.get(key) || [];
            const target = (g.length >= 2 && g[0]?.id !== r.id) ? "머지" : "분석";

            // 서버 상태와 다를 때만 추가 (실제 바뀐 행만)
            if (normalizeUseYN(r) !== target) {
                toCall.set(r.id, target); // set이라 중복 덮어쓰기 OK
            }
        }

        try {
            // 3) 문항통합 저장
            const payload = {
                user: auth?.user?.userId || "",
                projectnum,
                gb: "allmerge",
                val: changesObj,
            };
            const res = await editMutation.mutateAsync(payload);
            if (res?.success !== "777") throw new Error("merge 저장 실패");
            pendingFlushRef.current = true; // 0) 저장 직후 dirty-block 무시 모드 ON  ← 핵심
            setMergeSavedBaseline(new Map(
                rows.map(r => [r.id, getMergeVal(r)])
            ));
            setMergeEditsById(new Map(
                rows.map(r => [r.id, getMergeVal(r)])
            ));
            // DOM 노란색 제거 (렌더 직후)
            requestAnimationFrame(() => {
                const grid = document.getElementById("grid_01");
                if (grid) {
                    grid.querySelectorAll(".cell-merge-diff").forEach(el => {
                        el.classList.remove("cell-merge-diff");
                    });
                }
            });
            // 4) 선택된 행들만 useYN 동기화
            for (const r of rows) {
                if (!affectedIds.has(Number(r.id))) continue;
                if (String(r?.useYN ?? "").trim() === "제외") continue; // 제외는 건드리지 않음
                if (isLocked(r)) continue;
                await sendAnalysis({ scope: "row", id: r.id, excluded: false, refresh: false });
            }

            // 다음 재조회에서 1회 입력 캐시 초기화 + 재조회
            handleSearch?.();
            pendingFlushRef.current = true;
            // setTimeStamp(Date.now()); // ProList에서 처리하도록? 아니면 여기서?
            // ProList의 setTimeStamp를 prop으로 받지 않았으므로 handleSearch가 트리거해야 함.
            // handleSearch는 GridData의 함수. GridData는 searchMutation을 다시 부름.
        } catch (e) {
            console.error(e);
            modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다.");
        }
    };

    const isExcluded = (row) => !!excludedById.get(row?.id);
    const setExcluded = (row, excluded) =>
        setExcludedById(m => { const n = new Map(m); n.set(row.id, excluded); return n; });

    // API 호출 (row / all)
    const sendAnalysis = async ({ scope, id, excluded, refresh = true }) => {
        const payload = {
            user: auth?.user?.userId || "",
            projectnum,
            gb: scope === "row" ? "analysis" : "allanalysis",
            columnname: "useyn",
            val: excluded ? "제외" : "분석",
            ...(scope === "row" ? { qid: id } : {}),
        };
        rememberScroll(); // 스크롤 위치 저장 
        const res = await editMutation.mutateAsync(payload);
        if (res?.success !== "777") {
            modal.showErrorAlert("에러", "오류가 발생했습니다.");
        }
    };

    const guard = (need, fn) => (...args) => {
        if (!hasPerm(userPerm, need)) return; // 권한 없으면 noop
        return fn?.(...args);
    };

    // 행 토글
    const toggleExcluded = guard(PERM.WRITE, async (row) => {
        if (blockWhenDirty()) return;
        const prev = isExcluded(row);
        setExcluded(row, !prev); // 낙관적
        try {
            await sendAnalysis({ scope: "row", excluded: !prev, id: row?.id });
        } catch (e) {
            setExcluded(row, prev); // 실패 롤백
            console.error(e);
        }
    });

    // 서버 useYN → '분석' | '머지' | '제외'
    const normalizeUseYN = (row) => {
        const u = String(row?.useYN ?? '').trim();
        if (u === '제외') return '제외';
        if (u === '머지') return '머지';
        return '분석';
    };


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

    const isLocked = (row) => !!locksById.get(row?.id);
    const setRowLocked = (row, locked) =>
        setLocksById((m) => {
            const next = new Map(m);
            next.set(row?.id, locked);
            return next;
        });

    // 재조회 전 스크롤 저장
    const rememberScroll = () => {
        const grid = document.querySelector("#grid_01 .k-grid-content");
        if (grid) {
            scrollTopRef.current = grid.scrollTop;
        } else {
            console.warn("[rememberScroll] grid 요소를 찾지 못함");
        }
    };

    // 재조회 후 스크롤 복원 (렌더 완료 후)
    useEffect(() => {
        if (!dataState?.data?.length) return;
        const saved = scrollTopRef.current;
        const timer = setTimeout(() => {
            const grid = document.querySelector("#grid_01 .k-grid-content");
            if (grid) {
                grid.scrollTop = saved;
            } else {
                console.warn("[restoreScroll] grid 요소를 찾지 못함");
            }
        }, 30);
        return () => clearTimeout(timer);
    }, [dataState?.data]);

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
        rememberScroll(); // 스크롤 위치 저장 
        const res = await editMutation.mutateAsync(payload);
        if (res?.success !== "777") {
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

    const toggleRowLock = guard(PERM.MANAGE, async (row) => {
        if (blockWhenDirty()) return;
        if (isExcluded(row)) return; // 제외 상태에서는 아무 것도 하지 않음
        const prev = isLocked(row);
        setRowLocked(row, !prev);
        try {
            await (prev ? lockApi.unlockOne(row?.id) : lockApi.lockOne(row?.id));
        } catch (e) {
            setRowLocked(row, prev);              // 실패 시 롤백
            console.error(e);
        }
    });

    const bulkSetLock = async (locked) => {
        if (blockWhenDirty()) return;
        const ids = (dataState?.data ?? []).map((r) => r.id);
        const prev = new Map(locksById);
        setLocksById(new Map(ids.map((id) => [id, locked])));
        rememberScroll(); // 스크롤 위치 저장 
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
        onHeaderUseYN: guard(PERM.WRITE, () => { if (!blockWhenDirty()) bulkSetExcluded(false); }),
        onHeaderExclude: guard(PERM.WRITE, () => { if (!blockWhenDirty()) bulkSetExcluded(true); }),
        onHeaderMergeSave: guard(PERM.MANAGE, () => sendMergeAll()),
        onHeaderEditLockAll: guard(PERM.MANAGE, () => { if (!blockWhenDirty()) bulkSetLock(true); }),
        onHeaderEditUnlockAll: guard(PERM.MANAGE, () => { if (!blockWhenDirty()) bulkSetLock(false); }),
    };

    // 헤더 버튼(단일)
    const HeaderBtn = ({ className = 'btnS', children, onClick }) => (
        <div onClick={(e) => e.stopPropagation()} // 정렬/소팅 이벤트 막기
            style={{ display: 'flex', justifyContent: 'center' }}>
            <Button className={className} onClick={onClick}>{children}</Button>
        </div>
    );

    // 헤더 버튼(2개)
    const HeaderBtnGroup = ({ buttons, disabled }) => (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {buttons.map((b, i) => (
                <Button
                    key={i}
                    className={b.className ?? 'btnS'}
                    onClick={disabled ? undefined : b.onClick}
                    style={{
                        opacity: disabled ? 0.5 : 1,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        pointerEvents: disabled ? 'none' : 'auto'
                    }}
                >
                    {b.text}
                </Button>
            ))}
        </div>
    );

    // 라벨 + 버튼그룹(세로 스택)
    const HeaderLabeledBtnGroup = ({ label, buttons, disabled }) => (
        <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: '5px' }}
        >
            <span style={{ fontWeight: 500 }}>{label}</span>
            <HeaderBtnGroup buttons={buttons} disabled={disabled} />
        </div>
    );

    // 컬럼에서 wrap이면 멀티라인 셀 사용 => 문항 최종 
    const WrapCell = (field, style) => (cellProps) => (
        <td className="cell-wrap" style={style}>{cellProps.dataItem?.[field]}</td>
    );

    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = useMemo(() => {
        const handleColumnsChange = (updated) => {
            const map = new Map(updated.map(c => [c.field, c]));
            setColumns(prev => prev.map(c => map.get(c.field) ? { ...c, ...map.get(c.field) } : c));
        };
        return (menuProps) => (
            <ExcelColumnMenu
                {...menuProps}
                columns={columnsForPerm}
                onColumnsChange={handleColumnsChange}
                filter={filter}
                onFilterChange={(e) => setFilter(e ?? null)}
                onSortChange={(e) => setSort(e ?? [])}
            />
        );
    }, [columnsForPerm, filter, setColumns, setFilter, setSort]);

    const renderLeafColumn = (c) => {
        // 분석 상태가 머지일 경우 숨길 컬럼 
        const BlankWhenMergeCell = (field) => (cellProps) => {
            const row = cellProps.dataItem;
            return <td>{isMergeRow(row) ? '' : row?.[field]}</td>;
        };

        // ADMIN: 분석 (헤더에 버튼 2개 몰아넣기)
        if (c.field === 'useYN') {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    title={c.title}
                    width={c.width ?? '130px'}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    headerCell={() => (
                        <HeaderLabeledBtnGroup
                            // label="관리"
                            buttons={[
                                { text: '분석', className: 'btnS', onClick: actions.onHeaderUseYN },
                                { text: '제외', className: 'btnS btnTxt type01', onClick: actions.onHeaderExclude },
                            ]}
                            disabled={dataWithProxies.length === 0}
                        />
                    )}
                    cell={(cellProps) => {
                        const row = cellProps.dataItem;
                        const excluded = isExcluded(row);
                        const locked = isLocked(row);

                        const includeLabel = isMergeRow(row) ? '머지' : '분석'; // 입력 기준 표출
                        const state = excluded ? 'exclude' : (includeLabel === '머지' ? 'merge' : 'analysis');
                        const label = excluded ? '제외' : includeLabel;
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
        // ADMIN: 제외 (헤더 비우기)
        if (c.field === 'exclude') {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    title=""
                    width={c.width ?? '90px'}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    headerCell={() => <></>}
                    cell={(cellProps) => {
                        const row = cellProps.dataItem;
                        const { merge_qnum } = row;
                        const excluded = isExcluded(row);
                        const locked = isLocked(row);
                        return (
                            <td style={{ textAlign: 'center' }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}>
                                {!excluded && !isMergeRow(row) && ( // 머지 행이면 숨김
                                    <Button
                                        className="btnM"
                                        themeColor="primary"
                                        onClick={() => {
                                            if (!blockWhenDirty()) goOpenSetting(merge_qnum, row.project_lock);
                                        }}
                                    >
                                        분석보기
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
                            disabled={dataWithProxies.length === 0}
                        />
                    )}
                    cell={(cellProps) => {
                        const { dataItem } = cellProps;
                        const locked = isLocked(dataItem);
                        const excluded = isExcluded(dataItem);
                        // 제외 상태면 버튼 자체를 안보이게
                        if (excluded) {
                            return <td style={{ textAlign: 'center' }}></td>;
                        }
                        return (
                            <td style={{ textAlign: 'center' }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div
                                    className={`lock-icon-btn ${locked ? 'locked' : ''}`}
                                    onClick={() => toggleRowLock(dataItem)}
                                    title={locked ? '잠금 해제' : '잠금'}
                                >
                                    <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true">
                                        {locked ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                                            </svg>
                                        )}
                                    </span>
                                </div>
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
                    cell={(cellProps) => {
                        const row = cellProps.dataItem;
                        const excluded = isExcluded(row);
                        // 제외 상태면 버튼 숨김
                        if (excluded) {
                            return <td style={{ textAlign: 'center' }}></td>;
                        }
                        return (
                            <td style={{ textAlign: "center" }}>
                                <Button className="btnM btn-setting-outline" themeColor="primary"
                                    onClick={(e) => { e.stopPropagation(); setPopupShow(true); }}
                                    onMouseDown={(e) => e.stopPropagation()} >
                                    설정
                                </Button>
                            </td>
                        );
                    }}
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
                    cell={c.wrap ? WrapCell(c.field, c.field === 'question_fin' ? { padding: '0 10px' } : undefined) : undefined}   // wrap이면 멀티라인 셀 사용
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
        if (
            c.field === 'status_cnt_duplicated' || c.field === 'status_cnt_fin' || c.field === 'tokens_text') {
            return (
                <Column
                    key={c.field}
                    // 정렬은 프록시 필드 사용
                    field={proxyField?.[c.field] ?? `__sort__${c.field}`}
                    title={c.title}
                    width={c.width}
                    sortable
                    // 메뉴/필터는 원본 필드 기준으로 동작하도록 교정
                    columnMenu={(menuProps) => columnMenu({ ...menuProps, field: c.field })}
                    // 셀 표시는 기존처럼: 머지 행이면 빈칸
                    cell={BlankWhenMergeCell(c.field)}
                />
            );
        }
        if (c.field === 'status_cnt') {
            return (
                <Column
                    key={c.field}
                    // 정렬은 프록시 필드 사용
                    field={proxyField?.[c.field] ?? `__sort__${c.field}`}
                    title={c.title}
                    width={c.width}
                    sortable
                    // 메뉴/필터는 원본 필드 기준으로 동작하게 교정
                    columnMenu={(menuProps) => columnMenu({ ...menuProps, field: c.field })}
                    // 셀은 원본 값 그대로 표시
                    cell={(p) => <td title={p.dataItem?.[c.field]}>{p.dataItem?.[c.field]}</td>}
                />
            );
        }
        // 1번째 컬럼은 그대로(텍스트)
        if (c.field === 'qnum_text') {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    title=""
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    headerCell={() => <></>}
                    cell={c.wrap ? WrapCell(c.field, c.field === 'question_fin' ? { padding: '0 10px' } : undefined) : undefined}
                />
            );
        }
        // 2번째 컬럼 = 입력 가능 + 값 다르면 노란색
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
                    cell={(cellProps) => {
                        const row = cellProps.dataItem;
                        const original = norm(row?.merge_qnum ?? "");
                        const cur = getMergeVal(row);     // controlled value          
                        const tdRef = useRef(null);
                        const locked = isLocked(row); // "수정불가"면 true
                        const excluded = isExcluded(row);
                        // editable prop이 false면(관리자가 아니면) disabled 처리
                        const disabled = locked || excluded || (c.editable === false);
                        const baseline = mergeSavedBaseline.get(row.id) ?? original;

                        return (
                            <td
                                ref={tdRef}
                                className={!disabled && norm(cur) !== baseline ? 'cell-merge-diff' : ''}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <textarea
                                    ref={(el) => {
                                        if (el) {
                                            // Mount 시 높이 자동 조절
                                            el.style.height = 'auto';
                                            el.style.height = el.scrollHeight + 'px';
                                        }
                                    }}
                                    className="merge-input"
                                    key={`${row.id}:${cur}`}     // 재조회로 값이 바뀌면 인풋을 리마운트
                                    defaultValue={cur}           // 타이핑 중에는 리렌더 안 일어남(포커스 유지)
                                    disabled={disabled}
                                    placeholder="번호 입력"
                                    rows={1}
                                    style={{
                                        resize: 'none',
                                        minHeight: '30px',
                                        height: 'auto',
                                        width: '100%',
                                        overflow: 'hidden',
                                        whiteSpace: 'pre-wrap', // 줄바꿈 허용
                                        lineHeight: '1.5'
                                    }}
                                    onInput={(e) => {
                                        const now = norm(e.currentTarget.value);
                                        if (!tdRef.current) return;

                                        // Auto-resize
                                        e.currentTarget.style.height = 'auto';
                                        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';

                                        if (disabled) return;
                                        if (now !== baseline) tdRef.current.classList.add('cell-merge-diff');
                                        else tdRef.current.classList.remove('cell-merge-diff');
                                    }}
                                    onBlur={(e) => setMergeVal(row, e.currentTarget.value)} // 포커스 빠질 때만 저장
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault(); // 줄바꿈 방지 (엔터로 저장/블러)
                                            e.currentTarget.blur();
                                        }
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

    const visible = columnsForPerm.filter(c => c.show !== false);

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
        <div className="pro-list-page">
            <AiDataHeader title="문항 목록">
                {(!userAuth.includes("고객") && !userAuth.includes("일반") && !userAuth.includes("연구원")) && (
                    <GridHeaderBtnTxt onClick={handleExportExcelDev}>보기 추출 (개발자용)</GridHeaderBtnTxt>
                )}
                {(!userAuth.includes("고객") && !userAuth.includes("일반") && !userAuth.includes("연구원")) && (
                    <GridHeaderBtnTxt onClick={handleExportExcelDP}>보기 추출 (DP용)</GridHeaderBtnTxt>
                )}
                {(!userAuth.includes("고객") && !userAuth.includes("일반")) && (
                    <GridHeaderBtnPrimary onClick={() => navigate('/ai_open_analysis/pro_register')}>
                        문항 등록
                    </GridHeaderBtnPrimary>
                )}
            </AiDataHeader>

            <div className="pro-list-content">
                <GridDataCount total={filteredCount} />

                <div className="pro-list-card">
                    <div className="cmn_gird_wrap">
                        <div id="grid_01" className="cmn_grid multihead">
                            <KendoGrid
                                parentProps={{
                                    height: "100%",
                                    data: dataWithProxies,
                                    dataItemKey: dataItemKey,
                                    selectedState,
                                    setSelectedState,
                                    selectedField,
                                    idGetter,
                                    sortable: { mode: "multiple", allowUnsort: true },
                                    filterable: true,
                                    sortChange: ({ sort: next }) => {
                                        const nextRaw = (next || []).map(d => {
                                            const orig = Object.keys(proxyField).find(k => proxyField[k] === d.field);
                                            return { ...d, field: orig || d.field };
                                        });
                                        setSort(nextRaw ?? []);
                                    },
                                    filterChange: ({ filter }) => { setFilter(filter ?? null); },
                                    sort: mappedSort,
                                    filter: filter,
                                    columnVirtualization: false,
                                }}
                            >
                                {roots.map(renderLeafColumn)}

                                {groups.map(g => {
                                    const inGroup = visible.filter(c => c.group === g.name);
                                    const bySub = new Map();

                                    inGroup.forEach((c, idx) => {
                                        const key = c.subgroup || "__root__";
                                        const entry = bySub.get(key) || { cols: [], order: Number.POSITIVE_INFINITY, _idx: idx };
                                        entry.cols.push(c);
                                        const ord = Number.isFinite(c.order) ? c.order : 1e6;
                                        entry.order = Math.min(entry.order, ord);
                                        bySub.set(key, entry);
                                    });

                                    const items = [];

                                    const root = bySub.get("__root__");
                                    if (root) {
                                        root.cols.forEach((c, i) => {
                                            items.push({ type: "col", order: Number.isFinite(c.order) ? c.order : 1e6, _idx: i, col: c });
                                        });
                                        bySub.delete("__root__");
                                    }

                                    for (const [sub, entry] of bySub.entries()) {
                                        const colsSorted = entry.cols.slice().sort((a, b) =>
                                            (a.leafOrder ?? 0) - (b.leafOrder ?? 0)
                                        );
                                        items.push({ type: "sub", order: entry.order, _idx: entry._idx, sub, cols: colsSorted });
                                    }

                                    items.sort((a, b) => (a.order - b.order) || (a._idx - b._idx));
                                    return (
                                        <Column
                                            key={`grp:${g.name}`}
                                            title={g.name}
                                            headerCell={() => (
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                                    {g.name}
                                                    {g.name === "ADMIN" && (
                                                        <span
                                                            className="info-icon"
                                                            data-tooltip={`ADMIN|• ✓분석: 분석 할 문항만 체크\n• ✓제외: 분석 안 할 문항 체크\n• 분석보기 버튼: 각 문항별 카테고리 자동분류 페이지로 이동`}
                                                        ></span>
                                                    )}
                                                    {g.name === "EDIT" && (
                                                        <span
                                                            className="info-icon"
                                                            data-tooltip={`EDIT|• 문항통합저장 버튼: 여러 문항을 하나로 통합해 분석\n• 🔓 수정 가능: 분석 전 수정 가능\n• 🔒 수정 불가: 분석 완료 후 수정 불가`}
                                                        ></span>
                                                    )}
                                                </div>
                                            )}
                                        >
                                            {items.map(it =>
                                                it.type === "col"
                                                    ? renderLeafColumn(it.col)
                                                    : (
                                                        <Column
                                                            key={`sub:${g.name}:${it.sub}`}
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
                                                                            <Button
                                                                                className="btnS btnType04"
                                                                                onClick={dataWithProxies.length === 0 ? undefined : actions.onHeaderMergeSave}
                                                                                style={{
                                                                                    opacity: dataWithProxies.length === 0 ? 0.5 : 1,
                                                                                    cursor: dataWithProxies.length === 0 ? 'not-allowed' : 'pointer',
                                                                                    pointerEvents: dataWithProxies.length === 0 ? 'none' : 'auto'
                                                                                }}
                                                                            >
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
            </div>

            {popupShow && (
                <ProListPopup
                    popupShow={popupShow}
                    setPopupShow={setPopupShow}
                />
            )}
        </div>
    );
};

export default React.memo(ProListGridRenderer);
