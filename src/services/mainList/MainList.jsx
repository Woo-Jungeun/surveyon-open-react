import React, { Fragment, useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { MainListApi } from "./MainListApi.js";
import { useSelector, useDispatch } from "react-redux";
import { login } from "@/common/redux/action/AuthAction";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import GridDataCount from "@/components/common/grid/GridDataCount";
import { process } from "@progress/kendo-data-query";
import DataHeader from "@/services/dataStatus/components/DataHeader";
import { Search, Pin, RotateCw } from 'lucide-react';


/**
 * 프로젝트 목록
 *
 * @author jewoo
 * @since 2025-09-12
 */

// 날짜 커스텀 셀
const DateTimeCell = (props) => {
    const val = props.dataItem[props.field] || "";
    const parts = val.split(" ");

    const handleCellClick = (e) => {
        if (props.onRowClick) {
            props.onRowClick({
                dataItem: props.dataItem,
                syntheticEvent: e,
                nativeEvent: e.nativeEvent || e
            });
        }
    };

    if (parts.length >= 2) {
        return (
            <td colSpan={props.colSpan} className={props.className} style={{ ...props.style, textAlign: 'center', lineHeight: '1.3', cursor: 'pointer' }} onClick={handleCellClick}>
                <div style={{ fontSize: '12px' }}>{parts[0]}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{parts.slice(1).join(" ")}</div>
            </td>
        );
    }
    return <td colSpan={props.colSpan} className={props.className} style={{ ...props.style, textAlign: 'center', fontSize: '12px', cursor: 'pointer' }} onClick={handleCellClick}>{val}</td>;
};

// 상단 고정(Pin) 커스텀 셀
const PinCell = (props) => {
    const { dataItem, onTogglePin, isToggling } = props;
    const isPinned = dataItem?.topyn === 'y';

    const handleClick = (e) => {
        e.stopPropagation();
        if (isToggling) return; // 통신 중 중복 클릭 방지
        if (onTogglePin) {
            onTogglePin(dataItem);
        }
    };

    return (
        <td
            colSpan={props.colSpan}
            className={`${props.className || ''} pin-cell-td`}
            onClick={(e) => {
                // 고정 컬럼 셀 클릭 시 행 선택(프로젝트 선택/이동) 이벤트 방지
                e.stopPropagation();
            }}
            style={{
                ...props.style,
                textAlign: 'center',
                padding: '4px 0',
                verticalAlign: 'middle',
                cursor: 'default'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                    type="button"
                    title={isPinned ? "상단 고정 해제" : "상단 고정"}
                    onClick={handleClick}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.15s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EDE9FE';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <Pin
                        size={15}
                        color={isPinned ? '#5A4BFF' : '#94A3B8'}
                        fill={isPinned ? '#5A4BFF' : 'none'}
                        style={{
                            transform: isPinned ? 'rotate(45deg)' : 'none',
                            transition: 'all 0.15s ease'
                        }}
                    />
                </button>
            </div>
        </td>
    );
};

// 프로젝트명 커스텀 셀 (최신 등록 프로젝트 뱃지 표출 - 보라색 메인 테마 적용)
const ProjectNameCell = (props) => {
    const val = props.dataItem[props.field] || "";
    const isLatest = props.isLatest !== undefined
        ? props.isLatest
        : (props.latestProjectNum && props.dataItem.projectnum === props.latestProjectNum);

    const handleCellClick = (e) => {
        if (props.onRowClick) {
            props.onRowClick({
                dataItem: props.dataItem,
                syntheticEvent: e,
                nativeEvent: e.nativeEvent || e
            });
        }
    };

    return (
        <td
            colSpan={props.colSpan}
            className={props.className}
            style={{ ...props.style, textAlign: 'left', paddingRight: '12px', minWidth: '220px', cursor: 'pointer' }}
            onClick={handleCellClick}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', width: '100%' }}>
                <span
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 400,
                        color: 'inherit',
                        flex: 1,
                        minWidth: 0,
                        paddingRight: '6px'
                    }}
                    title={val}
                >
                    {val}
                </span>
                {isLatest && (
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '1px 6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            lineHeight: '13px',
                            color: '#5A4BFF',
                            backgroundColor: '#EDE9FE',
                            border: '1px solid #C4B5FD',
                            borderRadius: '4px',
                            flexShrink: 0
                        }}
                    >
                        최신
                    </span>
                )}
            </div>
        </td>
    );
};

// grid rendering 
const GridRenderer = (props) => {
    const {
        selectedState,
        setSelectedState,
        idGetter,
        dataState,
        setDataState,
        dataItemKey,
        selectedField,
        searchText,
        setSearchText,
        columns,
        setSort,
        sort,
        onRowClick,
        gridSkip,
        setGridSkip,
        syncProgress,
        toggleProjectTop,
        userId,
        handleSearch,
        isLoading
    } = props;

    // Number animation matching SurveyTestProgressModal.jsx
    const [displayNum, setDisplayNum] = useState(0);
    const [togglingProjectNum, setTogglingProjectNum] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 프로젝트 목록 새로고침 핸들러
    const handleRefresh = useCallback(async () => {
        if (isRefreshing || !handleSearch) return;
        setIsRefreshing(true);
        try {
            await handleSearch({
                params: {
                    user: userId || "",
                    gb: "list"
                }
            });
        } finally {
            setTimeout(() => {
                setIsRefreshing(false);
            }, 600);
        }
    }, [isRefreshing, handleSearch, userId]);

    // 상단 고정 토글 핸들러
    const handleTogglePin = useCallback(async (item) => {
        if (!item?.projectnum || togglingProjectNum) return;

        const currentTopYn = item.topyn === 'y' ? 'y' : 'n';
        const nextTopYn = currentTopYn === 'y' ? 'n' : 'y';
        const projectnum = item.projectnum;

        setTogglingProjectNum(projectnum);

        // 1. 낙관적 업데이트 (즉시 UI 반영)
        if (setDataState) {
            setDataState(prev => {
                const nextList = (prev.data || []).map(p => {
                    if (p.projectnum === projectnum) {
                        return { ...p, topyn: nextTopYn };
                    }
                    return p;
                });
                return { ...prev, data: nextList };
            });
        }

        try {
            const res = await toggleProjectTop.mutateAsync({
                user: userId || "",
                projectnum: projectnum,
                topyn: nextTopYn
            });

            if (String(res?.success) !== '777') {
                throw new Error(res?.message || res?.Message || "상단 고정 설정에 실패했습니다.");
            }
        } catch (err) {
            console.error("toggleProjectTop failed:", err);
            // 실패 시 롤백
            if (setDataState) {
                setDataState(prev => {
                    const rollbackList = (prev.data || []).map(p => {
                        if (p.projectnum === projectnum) {
                            return { ...p, topyn: currentTopYn };
                        }
                        return p;
                    });
                    return { ...prev, data: rollbackList };
                });
            }
            alert(err?.message || "상단 고정 처리 중 오류가 발생했습니다.");
        } finally {
            setTogglingProjectNum(null);
        }
    }, [userId, togglingProjectNum, toggleProjectTop, setDataState]);

    useEffect(() => {
        if (!syncProgress) {
            setDisplayNum(0);
            return;
        }
        let startTimestamp = null;
        const duration = 400;
        const start = displayNum;
        const end = syncProgress.percent || 0;
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setDisplayNum(Math.floor(progress * (end - start) + start));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayNum(end);
            }
        };
        window.requestAnimationFrame(step);
    }, [syncProgress?.percent]);

    // 등록일(register_date) 기준 현재(오늘)로부터 일주일(7일) 이내 등록된 최신 프로젝트 Set
    const latestProjectSet = useMemo(() => {
        const list = dataState?.data || [];
        const set = new Set();
        if (!list.length) return set;

        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        for (const item of list) {
            if (!item.register_date) continue;
            const time = new Date(String(item.register_date).replace(/-/g, '/')).getTime();
            if (!isNaN(time) && (now - time) >= 0 && (now - time) <= SEVEN_DAYS_MS) {
                set.add(item.projectnum);
            }
        }

        return set;
    }, [dataState?.data]);

    // 로컬 검색 필터링 및 상단 고정(topyn === 'y') 우선 정렬
    const filteredData = useMemo(() => {
        const list = dataState?.data || [];
        let result = list;
        if (searchText.trim()) {
            const query = searchText.toLowerCase().trim();
            result = list.filter(item => {
                const projectPof = (item.projectpof || '').toLowerCase();
                const projectNum = (item.projectnum || '').toLowerCase();
                const projectName = (item.projectname || '').toLowerCase();
                const registerUser = (item.register_userid || item.register_username || item.register_name || '').toLowerCase();
                const projectUseName = (item.project_use_name || item.project_user_name || '').toLowerCase();
                return projectPof.includes(query) || projectNum.includes(query) || projectName.includes(query) || registerUser.includes(query) || projectUseName.includes(query);
            });
        }

        // 상단 고정 항목과 일반 항목 분리
        const pinned = [];
        const unpinned = [];
        for (const item of result) {
            if (item.topyn === 'y') {
                pinned.push(item);
            } else {
                unpinned.push(item);
            }
        }

        // 정렬 조건 적용 시 고정 항목과 일반 항목 각각 내부에서 정렬 유지
        if (sort && sort.length > 0) {
            const sortedPinned = process(pinned, { sort }).data;
            const sortedUnpinned = process(unpinned, { sort }).data;
            return [...sortedPinned, ...sortedUnpinned];
        }

        return [...pinned, ...unpinned];
    }, [dataState?.data, searchText, sort]);

    // 상단 고정(Pin) 프로젝트 행 강조 렌더러 (설문온 메인 보라색 테마)
    const rowRender = useCallback((trElement, rowProps) => {
        const isPinned = rowProps.dataItem?.topyn === 'y';
        if (isPinned) {
            const existingStyle = trElement.props.style || {};
            const existingClassName = trElement.props.className || '';
            return React.cloneElement(
                trElement,
                {
                    ...trElement.props,
                    className: `${existingClassName} pinned-project-row`.trim(),
                    style: {
                        ...existingStyle,
                        backgroundColor: '#F5F3FF', // 상단 고정 행 은은한 보라색 틴트 배경
                    }
                },
                trElement.props.children
            );
        }
        return trElement;
    }, []);

    return (
        <div className="grid-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
            <style>{`
                .pinned-project-row {
                    background-color: #F5F3FF !important;
                }
                .pinned-project-row:hover,
                .k-grid tr.pinned-project-row:hover {
                    background-color: #EDE9FE !important;
                }
                .cmn_grid tbody tr {
                    cursor: pointer;
                }
                .cmn_grid tbody tr td.pin-cell-td {
                    cursor: default;
                }
            `}</style>
            {syncProgress && (
                <div className="sync-progress-overlay">
                    <div className="sync-progress-card">
                        <div className="sync-status-header">
                            <span className="sync-status-title">프로젝트 목록 동기화 중...</span>
                            <div className="sync-percentage">
                                <span className="sync-percentage-num">{displayNum}</span>
                                <span className="sync-percentage-sign">%</span>
                            </div>
                        </div>
                        
                        <div className="sync-progress-container">
                            <div className="sync-progress-bar" style={{ width: `${syncProgress.percent}%` }}></div>
                        </div>
                        
                        <div className="sync-status-msg">
                            {syncProgress.message || "동기화 작업을 진행하고 있습니다."}
                        </div>
                    </div>
                </div>
            )}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{
                    padding: '12px 20px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexShrink: 0,
                    borderBottom: '1px solid #F1F5F9'
                }}>
                    {/* 좌측: 건수 표시 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', minWidth: '130px' }}>
                        <span>전체</span>
                        <strong style={{ color: '#5A4BFF', fontWeight: 700 }}>
                            {dataState?.data?.length || 0}
                        </strong>
                        <span>건</span>
                        {searchText.trim() && (
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                                (검색 {filteredData.length}건)
                            </span>
                        )}
                    </div>

                    {/* 중앙: 검색창 */}
                    <div style={{ position: 'relative', width: '460px', maxWidth: '100%' }}>
                        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                        <input
                            type="text"
                            placeholder="프로젝트명, 번호, 담당자를 검색하세요"
                            value={searchText}
                            onChange={(e) => {
                                setSearchText(e.target.value);
                                setGridSkip(0);
                            }}
                            style={{
                                width: '100%',
                                height: '34px',
                                padding: '6px 12px 6px 34px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '13px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.15s ease-in-out'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#5A4BFF';
                                e.target.style.boxShadow = '0 0 0 3px rgba(90, 75, 255, 0.12)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#cbd5e1';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    {/* 우측: 새로고침 버튼 */}
                    <div style={{ minWidth: '130px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            title="프로젝트 목록 새로고침"
                            onClick={handleRefresh}
                            disabled={isRefreshing || isLoading}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                height: '34px',
                                padding: '0 12px',
                                borderRadius: '8px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#fff',
                                color: '#475569',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: isRefreshing || isLoading ? 'default' : 'pointer',
                                transition: 'all 0.15s ease-in-out',
                                outline: 'none',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isRefreshing && !isLoading) {
                                    e.currentTarget.style.borderColor = '#5A4BFF';
                                    e.currentTarget.style.color = '#5A4BFF';
                                    e.currentTarget.style.backgroundColor = '#F5F3FF';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isRefreshing && !isLoading) {
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                    e.currentTarget.style.color = '#475569';
                                    e.currentTarget.style.backgroundColor = '#fff';
                                }
                            }}
                        >
                            <RotateCw
                                size={14}
                                style={{
                                    transform: isRefreshing || isLoading ? 'rotate(360deg)' : 'none',
                                    transition: isRefreshing || isLoading ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                                }}
                            />
                            <span>새로고침</span>
                        </button>
                    </div>
                </div>
                <div className="cmn_grid singlehead" style={{ flex: 1, height: "100%", overflow: "hidden" }}>
                    <KendoGrid
                        parentProps={{
                            height: "100%",
                            style: { border: "none" },
                            data: filteredData,
                            dataItemKey: dataItemKey,
                            selectedState,
                            setSelectedState,
                            selectedField,
                            idGetter,
                            sortable: { mode: "multiple", allowUnsort: true },
                            filterable: false,
                            sortChange: ({ sort }) => {
                                setSort(sort ?? []);
                                setGridSkip(0);
                            },
                            sort,
                            onRowClick,
                            rowRender,
                            scrollable: "virtual",
                            rowHeight: 40,
                            pageSize: 50,
                            skip: gridSkip,
                            onPageChange: (e) => setGridSkip(e.page.skip),
                        }}
                    >
                        {columns.filter(c => c.show !== false).map((c) => {
                            let cellComponent = undefined;
                            if (c.field === 'topyn') {
                                cellComponent = (cellProps) => (
                                    <PinCell
                                        {...cellProps}
                                        onTogglePin={handleTogglePin}
                                        isToggling={togglingProjectNum === cellProps.dataItem?.projectnum}
                                    />
                                );
                            } else if (c.field === 'projectname') {
                                cellComponent = (cellProps) => (
                                    <ProjectNameCell
                                        {...cellProps}
                                        isLatest={latestProjectSet.has(cellProps.dataItem?.projectnum)}
                                        onRowClick={onRowClick}
                                    />
                                );
                            } else if (c.field === 'project_update_date' || c.field === 'register_date') {
                                cellComponent = (cellProps) => (
                                    <DateTimeCell
                                        {...cellProps}
                                        onRowClick={onRowClick}
                                    />
                                );
                            }

                            return (
                                <Column
                                    key={c.field}
                                    field={c.field}
                                    title={c.title}
                                    width={c.width}
                                    editable={c.editable}
                                    headerClassName="k-header-center"
                                    cell={cellComponent}
                                />
                            );
                        })}
                    </KendoGrid>
                </div>
            </div>
        </div>
    );
};

const MainList = ({ showHeader = true, onProjectSelect }) => {
    const auth = useSelector((store) => store.auth);
    const dispatch = useDispatch();
    const userGroup = auth?.user?.userGroup || "";
    const navigate = useNavigate();
    const DATA_ITEM_KEY = "no";
    const SELECTED_FIELD = "selected";

    // 정렬/필터를 controlled로
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [gridSkip, setGridSkip] = useState(0);
    const [syncProgress, setSyncProgress] = useState(null);

    useEffect(() => {
        window.__onProjectSyncProgress = (progressInfo) => {
            if (!progressInfo || progressInfo.status === "completed" || progressInfo.status === "failed") {
                setSyncProgress(null);
            } else {
                setSyncProgress(progressInfo);
            }
        };
        return () => {
            window.__onProjectSyncProgress = null;
        };
    }, []);

    const { mainListData, toggleProjectTop } = MainListApi();

    const [columns, setColumns] = useState(() =>
        [
            { field: "topyn", title: "고정", show: true, editable: false, width: "55px", allowHide: false },
            { field: "no", title: "no", show: true, editable: false, width: "60px", allowHide: false },
            { field: "projectpof", title: "프로젝트\n번호", show: true, editable: false, width: "120px", allowHide: false },
            { field: "projectnum", title: "웹프로젝트\n번호", show: true, editable: false, width: "130px", allowHide: false },
            { field: "projectname", title: "프로젝트명", show: true, editable: false, allowHide: false },
            { field: "register_userid", title: "등록자명", show: true, editable: false, width: "80px", allowHide: false },
            { field: "register_date", title: "등록일", show: true, editable: false, width: "110px", allowHide: false },
            { field: "servername", title: "오픈\n서버정보", show: true, editable: false, width: "90px", allowHide: false },
            { field: "project_use_name", title: "오픈\n작업자", show: true, editable: false, width: "80px", allowHide: false },
            { field: "project_update_date", title: "업데이트\n일자", show: true, editable: false, width: "110px", allowHide: false },
            { field: "project_status", title: "작업현황", show: true, editable: true, width: "80px", allowHide: false },
            { field: "postgrecompletecount", title: "DB\n완료수", show: true, editable: true, width: "80px", allowHide: false },
            // { field: "groupposition", title: "소속", show: true, editable: true, width: "100px", allowHide: false },
            // { field: "usergroup", title: "권한정보", show: true, editable: true, width: "120px", allowHide: false },
        ]);

    const location = useLocation();

    // Determine source based on state or current path
    const getFromSource = () => {
        if (location.pathname.includes("data_status")) return "data_status";
        if (location.state?.from) return location.state.from;
        return "ai_open";
    };

    const from = getFromSource();

    const onRowClick = useCallback((e) => {
        // 고정(topyn) 컬럼의 셀 또는 핀 버튼을 클릭한 경우 행 선택 이벤트 무시
        const target = e?.syntheticEvent?.target || e?.nativeEvent?.target || e?.target;
        if (target && target.closest && target.closest('.pin-cell-td')) {
            return;
        }

        const { projectnum, projectname, servername, projectpof, merge_pn, merge_pn_text, usergroup } = e.dataItem;

        // 어떤 모드(팝업/페이지 전환)에서든 프로젝트가 선택되면 공통적으로 세션 최신화
        if (projectnum && projectname) {
            dispatch(login({ ...auth?.user, userAuth: usergroup }));
            sessionStorage.setItem("projectnum", projectnum || "");
            sessionStorage.setItem("projectname", projectname || "");
            sessionStorage.setItem("servername", servername || "");
            sessionStorage.setItem("projectpof", projectpof || "");
            sessionStorage.setItem("merge_pn", merge_pn || "");
            sessionStorage.setItem("merge_pn_text", merge_pn_text || "");
            sessionStorage.setItem("usergroup", usergroup || "");

            // 프로젝트 변경 시 pageId, silsaPageId, pagetitle 세션 초기화
            sessionStorage.removeItem("pageId");
            sessionStorage.removeItem("silsaPageId");
            sessionStorage.removeItem("pagetitle");
        }

        if (onProjectSelect) {
            onProjectSelect(e.dataItem);
            return;
        }

        if (!projectnum || !projectname) return;

        if (from === 'data_status') {
            navigate('/data_status');
        } else {
            navigate('/project/pro_list', { state: { projectnum, projectname, servername, projectpof } });
        }
    }, [navigate, from, onProjectSelect, auth, dispatch]);

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

    return (
        <Fragment>
            {showHeader && <DataHeader title="프로젝트 목록" />}
            <div
                className={showHeader ? "project-list-content" : ""}
                style={!showHeader ? {
                    flex: 1,
                    margin: 0,
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    borderRadius: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                } : undefined}
            >
                <GridData
                    dataItemKey={DATA_ITEM_KEY}
                    rowNumber={"no"}
                    rowNumberOrder="desc"
                    selectedField={SELECTED_FIELD}
                    searchMutation={mainListData}
                    initialParams={{             /*초기파라미터 설정*/
                        user: auth?.user?.userId || "",
                        gb: "list"
                    }}
                    renderItem={(props) => (
                        <GridRenderer
                            {...props}
                            searchText={searchText}
                            setSearchText={setSearchText}
                            columns={columns}
                            setSort={setSort}
                            sort={sort}
                            onRowClick={onRowClick}
                            gridSkip={gridSkip}
                            setGridSkip={setGridSkip}
                            syncProgress={syncProgress}
                            toggleProjectTop={toggleProjectTop}
                            userId={auth?.user?.userId || ""}
                        />
                    )}
                />
            </div>
        </Fragment>
    );
};

export default MainList;