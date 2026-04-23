import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Trash2, Search, ChevronLeft, ChevronRight, Info, Wand2, Plus, Copy, ChevronDown } from 'lucide-react';
import { Popup } from '@progress/kendo-react-popup';
import { DpRequestPageApi } from '../dpRequest/DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import DataHeader from "@/services/dataStatus/components/DataHeader";
import { DropDownList } from '@progress/kendo-react-dropdowns';

// --- 상수 ---
const CROSS_FILTER_ALL_ID = "__all__";

const CrossTableGrid = ({ dataItem, showN, showPct, decimalN, decimalPct }) => {
    if (!dataItem) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>선택된 표가 없습니다. 좌측에서 항목을 선택해주세요.</div>;

    const metadata = dataItem.raw || {};
    const resultData = dataItem.dataResult || {};

    const columns = resultData.columns || [];
    const rows = resultData.rows || [];

    const gridColumns = useMemo(() => {
        const _cols = [];
        _cols.push(
            <Column
                key="__base_label_col__"
                field="label"
                title="구분"
                width="120px"
                locked
                headerClassName="k-text-center"
                className="k-text-center"
                cell={(props) => {
                    const { dataItem, className, style, colSpan, rowSpan } = props;
                    return (
                        <td className={`${className || ''} k-text-center`} style={{ ...(style || {}), fontWeight: 500, color: '#334155', textAlign: 'center', background: '#f8fafc', padding: '4px 8px', fontSize: '12px' }} colSpan={colSpan} rowSpan={rowSpan}>
                            <div style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                lineHeight: '1.4',
                                fontSize: '12px'
                            }}>
                                {dataItem.label || dataItem.var_label || dataItem.name || dataItem.key || '-'}
                            </div>
                        </td>
                    );
                }}
            />
        );
        columns.forEach((col, idx) => {
            const fieldKey = col.key || `c${idx}`;
            const colTitle = col.label || col.var_label || col.name || col.key || fieldKey;

            _cols.push(
                <Column
                    key={`col_${fieldKey}_${idx}`}
                    field={fieldKey}
                    title={colTitle}
                    width="120px"
                    headerClassName="k-text-center"
                    cell={(props) => {
                        const { dataItem, field, className, style, colSpan, rowSpan } = props;
                        const cellBox = dataItem.cells?.[fieldKey] || {};

                        const nValue = cellBox.count !== undefined ? cellBox.count : cellBox.n;
                        const pValue = cellBox.percent !== undefined ? cellBox.percent : cellBox.pct;

                        const mergedClassName = [className || '', "k-text-right"].filter(Boolean).join(" ");

                        if (nValue === undefined && pValue === undefined) {
                            return <td className={mergedClassName} style={{ ...(style || {}), padding: '4px 10px', fontSize: '12px' }} colSpan={colSpan} rowSpan={rowSpan}>-</td>;
                        }

                        const nDecimals = decimalN !== '' && decimalN !== undefined ? decimalN : 0;
                        const pctDecimals = decimalPct !== '' && decimalPct !== undefined ? decimalPct : 1;

                        return (
                            <td className={mergedClassName} style={{ ...(style || {}), padding: '4px 10px' }} colSpan={colSpan} rowSpan={rowSpan}>
                                {showN !== false && nValue !== undefined && <div style={{ fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>{Number(nValue).toFixed(nDecimals)}</div>}
                                {showPct !== false && pValue !== undefined && <div style={{ fontSize: '11px', color: '#64748b' }}>{Number(pValue).toFixed(pctDecimals)}%</div>}
                            </td>
                        );
                    }}
                />
            );
        });
        return _cols;
    }, [columns, showN, showPct, decimalN, decimalPct]);

    return (
        <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0 8px 12px 8px', fontSize: '15.5px', fontWeight: 800, color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{metadata.title || metadata.label || metadata.name || dataItem.label}</span>
            </div>
            {columns.length > 0 || rows.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0 }} className="dp-table-container">
                    <KendoGridV2 data={rows}>
                        {gridColumns}
                    </KendoGridV2>
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                    <span>API 응답 데이터 구조 확인 필요 (결과 데이터 없음)</span>
                    <span style={{ fontSize: '12px', marginTop: '4px' }}>(선택된 X 기준변수와 매칭되는 교차표 값이 비어있습니다)</span>
                </div>
            )}
        </div>
    );
};

// --- 커스텀 헤더 셀 (조건 아이콘) ---
const ConditionHeaderCell = (props) => {
    const anchorRef = useRef(null);
    const [show, setShow] = useState(false);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>{props.title}</span>
            <div
                ref={anchorRef}
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                style={{ cursor: 'pointer', display: 'flex' }}
                onClick={(e) => e.stopPropagation()}
            >
                <Info size={14} color="#94a3b8" />
            </div>

            <Popup
                anchor={anchorRef.current}
                show={show}
                animate={false}
                popupClass="condition-tooltip-popup"
                style={{ zIndex: 100000 }} // Grid header 위에 잘 보이도록 z-index 높임
            >
                <div style={{
                    padding: '12px 16px',
                    background: '#ffffff',
                    width: 'max-content',
                    minWidth: '160px',
                    lineHeight: '1.6',
                    color: '#334155',
                    textAlign: 'left' // 헤더 중앙정렬 영향을 받지 않도록 분리
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <div style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#e2e8f0', color: '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 'bold'
                        }}>i</div>
                        <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '13px' }}>조건</span>
                    </div>
                    <div style={{ fontSize: '13px', letterSpacing: '-0.3px', marginLeft: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><span style={{ fontWeight: 600 }}>• 동등 대조:</span> <span>GENDER == 1, REGION == 'A'</span></div>
                        <div><span style={{ fontWeight: 600 }}>• 비교 대조:</span> <span>AGE &gt;= 20, AGE &lt; 30</span></div>
                        <div><span style={{ fontWeight: 600 }}>• IN 연산:</span> <span>AGE_GROUP in [2, 3, 4]</span></div>
                        <div><span style={{ fontWeight: 600 }}>• 다중 조건:</span> <span>(SQ1 == 1 or SQ1 == 2) and SQ2 == 1</span></div>
                    </div>
                </div>
            </Popup>
        </div>
    );
};

const CrossAnalysisPage = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getOverviewContext, getOverview, savePageSettings } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    // --- 히스토리 관리 (Undo/Redo) ---
    const history = useUpdateHistory('dp-banner');
    const isHistoryAction = useRef(false);

    const [banners, setBanners] = useState([]);
    const [showN, setShowN] = useState(true);
    const [decimalN, setDecimalN] = useState(0);
    const [showPct, setShowPct] = useState(true);
    const [decimalPct, setDecimalPct] = useState(1);
    const [selectedXInfo, setSelectedXInfo] = useState('__none__');
    const [xInfoOptions, setXInfoOptions] = useState([]);

    const [selectedComputedFilterIds, setSelectedComputedFilterIds] = useState([CROSS_FILTER_ALL_ID]);
    const [draftComputedFilterIds, setDraftComputedFilterIds] = useState([CROSS_FILTER_ALL_ID]);
    const [computedFilterOptions, setComputedFilterOptions] = useState([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterAnchorRef = useRef(null);
    const filterPopupRef = useRef(null);
    const [filterPopupWidth, setFilterPopupWidth] = useState(180);

    const filterExpression = useMemo(() => {
        if (selectedComputedFilterIds.includes(CROSS_FILTER_ALL_ID)) return "";
        const activeOptions = computedFilterOptions.filter(o => selectedComputedFilterIds.includes(o.id));
        if (activeOptions.length === 0) return "";
        return activeOptions.map(o => `(${o.logic})`).join(" or ");
    }, [selectedComputedFilterIds, computedFilterOptions]);

    useEffect(() => {
        if (isFilterOpen && filterAnchorRef.current) {
            setFilterPopupWidth(Math.max(filterAnchorRef.current.offsetWidth, 180));
        }

        const handleClickOutside = (event) => {
            if (isFilterOpen &&
                filterAnchorRef.current &&
                !filterAnchorRef.current.contains(event.target) &&
                filterPopupRef.current &&
                !filterPopupRef.current.contains(event.target)) {
                setSelectedComputedFilterIds(draftComputedFilterIds);
                setIsFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFilterOpen, draftComputedFilterIds]);

    const handleTogglePopup = () => {
        if (!isFilterOpen) {
            setDraftComputedFilterIds(selectedComputedFilterIds);
        }
        setIsFilterOpen(!isFilterOpen);
    };

    const applyFilterAndClose = () => {
        setSelectedComputedFilterIds(draftComputedFilterIds);
        setIsFilterOpen(false);
    };

    const toggleFilter = (id) => {
        setDraftComputedFilterIds(prev => {
            if (id === CROSS_FILTER_ALL_ID) {
                return [CROSS_FILTER_ALL_ID];
            }
            const next = prev.filter(x => x !== CROSS_FILTER_ALL_ID);
            const isChecked = prev.includes(id);
            const updated = isChecked ? next.filter(x => x !== id) : [...next, id];
            return updated.length > 0 ? updated : [CROSS_FILTER_ALL_ID];
        });
    };

    const toggleAllFilters = () => {
        setDraftComputedFilterIds([CROSS_FILTER_ALL_ID]);
    };

    const getFilterButtonText = () => {
        if (selectedComputedFilterIds.includes(CROSS_FILTER_ALL_ID)) return '전체';
        const activeOptions = computedFilterOptions.filter(f => selectedComputedFilterIds.includes(f.id));
        if (activeOptions.length === 0) return '전체';
        if (activeOptions.length === 1) return activeOptions[0].label;
        return `${activeOptions[0].label} 외 ${activeOptions.length - 1}건`;
    };

    const [selectedBanner, setSelectedBanner] = useState('');
    const [baseVariables, setBaseVariables] = useState([]);
    const [isBannerSidebarOpen, setIsBannerSidebarOpen] = useState(true);
    const [bannerSearch, setBannerSearch] = useState('');
    const [currentLabel, setCurrentLabel] = useState('');
    const [currentId, setCurrentId] = useState('');
    const [currentXInfo, setCurrentXInfo] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [totalTables, setTotalTables] = useState(0);
    const PAGE_SIZE = 20;


    // 키보드 이벤트 (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) { // Redo (Ctrl+Shift+Z)
                        const redoData = history.redo();
                        if (redoData) {
                            isHistoryAction.current = true;
                            setBanners([...redoData]);
                        }
                    } else { // Undo (Ctrl+Z)
                        const undoData = history.undo();
                        if (undoData) {
                            isHistoryAction.current = true;
                            setBanners([...undoData]);
                        }
                    }
                } else if (e.key.toLowerCase() === 'y') { // Redo (Ctrl+Y)
                    const redoData = history.redo();
                    if (redoData) {
                        isHistoryAction.current = true;
                        setBanners([...redoData]);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history]);

    // 데이터 변경 감지 및 히스토리 커밋
    useEffect(() => {
        if (isHistoryAction.current) {
            isHistoryAction.current = false;
            return;
        }
        if (banners.length > 0) {
            history.commit(banners);
        }
    }, [banners, history]);


    const handleDeleteBanner = (e, bannerId) => {
        e.stopPropagation();

        if (bannerId.startsWith('NEW_')) {
            const nextBanners = banners.filter(b => b.id !== bannerId);
            setBanners(nextBanners);

            if (selectedBanner === bannerId) {
                if (nextBanners.length > 0) {
                    setSelectedBanner(nextBanners[0].id);
                    setCurrentId(nextBanners[0].id);
                    setCurrentLabel(nextBanners[0].label);
                    setCurrentXInfo(nextBanners[0].type || '단일 응답형 (Single)');
                } else {
                    setSelectedBanner('');
                    setCurrentId('');
                    setCurrentLabel('');
                    setCurrentXInfo('');
                }
            }
            return;
        }

        // 2. 이미 서버에 존재하는 경우 (확인창 띄우고 API 호출)
        modal.showConfirm('알림', <span style={{ wordBreak: 'break-all' }}>문항({bannerId})을 삭제하시겠습니까?</span>, {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "삭제",
                    click: async () => {
                        // const pageId = sessionStorage.getItem('pageId');
                        // const user = auth?.user?.userId;
                        // if (!pageId || !auth?.user?.userId) return;
                        const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
                        const user = "sbbok";

                        try {
                            const result = await deleteBaseVariable.mutateAsync({
                                pageid: pageId,
                                user: user,
                                variables: [bannerId]
                            });

                            if (result?.success === '777') {
                                modal.showAlert('알림', '삭제되었습니다.');
                                // 현재 보고 있는 아이템이 삭제되었다면 'delete' 모드로 패치하여 첫번째 아이템 강제 선택
                                if (selectedBanner === bannerId) {
                                    await fetchVariablesData('delete');
                                } else {
                                    await fetchVariablesData('normal');
                                }
                            } else {
                                modal.showAlert('오류', result?.Message || '삭제 중 문제가 발생했습니다.');
                            }
                        } catch (error) {
                            console.error('Delete error:', error);
                            modal.showAlert('오류', '삭제 요청에 실패했습니다.');
                        }
                    }
                }
            ]
        });
    };

    // --- 데이터 로직 ---
    const fetchCrossAnalysisData = async (mode = 'normal', targetIdToSelect = null, targetPage = currentPage, currentFilterExp = filterExpression) => {
        // 실제 데이터 연동 시 사용할 주석:
        // const pageId = sessionStorage.getItem('pageId');
        // const testUser = auth?.user?.userId;
        // if (!pageId || !testUser) return;

        const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
        const testUser = "sbbok";
        try {
            loadingSpinner.show();

            // 1. Context 데이터 가져오기
            const contextRes = await getOverviewContext.mutateAsync({ pageid: pageId, user: testUser });

            // X 정보 (기준변수) 리스트 세팅 및 데이터 필터 (파생문항) 세팅
            const ctxPayload = contextRes?.resultjson || contextRes || {};
            const recodedVars = ctxPayload.recoded_variables || {};
            const baseVars = ctxPayload.base_variables || {};

            const dynamicXInfoOptions = Object.entries(recodedVars)
                .filter(([key, value]) => {
                    const id = String(value?.id ?? key).trim().toLowerCase();
                    if (!id) return false;
                    if (id === "banner" || id.startsWith("banner_")) return true;
                    return id.startsWith("overview_");
                })
                .map(([key]) => key)
                .sort((a, b) => a.localeCompare(b, "ko"))
                .map(key => ({
                    text: recodedVars[key]?.label || key,
                    value: key
                }));

            setXInfoOptions([
                { text: '없음 (순수 빈도)', value: '__none__' },
                ...dynamicXInfoOptions
            ]);

            const filterOpts = Object.entries(baseVars)
                .filter(([, value]) => String(value?.recoded_type ?? "").toLowerCase() === "computed")
                .flatMap(([key, value]) => {
                    const variableId = String(value?.id ?? key);
                    const variableLabel = String(value?.label ?? key).trim() || variableId;
                    const infoList = Array.isArray(value?.info) ? value.info : [];
                    return infoList
                        .map((info, index) => {
                            const label = String(info?.label ?? "").trim();
                            const logic = String(info?.logic ?? "").trim();
                            if (!label || !logic) return null;
                            const rawValue = info?.value ?? index + 1;
                            return {
                                id: `${variableId}::${String(rawValue).trim() || String(index + 1)}`,
                                label,
                                logic,
                                variableId,
                                variableLabel,
                            };
                        })
                        .filter(Boolean);
                })
                .sort((a, b) => a.label.localeCompare(b.label, "ko") || a.id.localeCompare(b.id, "en"));

            setComputedFilterOptions(filterOpts);

            // 2. 전체표 목록 (Overview) 가져오기
            const overviewRes = await getOverview.mutateAsync({
                pageid: pageId,
                user: testUser,
                x_info: selectedXInfo !== '__none__' ? [selectedXInfo] : [],
                start: (targetPage - 1) * PAGE_SIZE,
                limit: PAGE_SIZE,
                search: bannerSearch, // API 검색 연동
                filter_expression: currentFilterExp,
                use_recoded: true
            });

            // 응답 포맷 대응 (resultjson 래핑 여부)
            const payload = overviewRes?.resultjson || overviewRes || {};
            const tablesList = payload.tables || [];
            const resultsList = payload.results || [];

            if (tablesList.length > 0 || (overviewRes?.success === '777')) {
                const formatted = tablesList.map((t, i) => {
                    const matchedResult = resultsList.find(r => r.table_id === (t.table_id || t.id));
                    const dataResult = matchedResult ? matchedResult.result : null;

                    return {
                        id: t.table_id || t.id || `table_${i}`,
                        label: t.title || t.label || t.name || t.id,
                        type: t.type === 'single' ? '단일 응답형 (Single)' :
                            t.type === 'double' ? '다중 응답형 (Double)' :
                                t.type === 'numeric' ? '숫자형 (Numeric)' : (t.type || '단일 응답형 (Single)'),
                        subId: t.table_id || t.id,
                        raw: t,
                        dataResult: dataResult,
                        info: []
                    };
                });
                setBanners(formatted);
                history.reset(formatted);

                // 총 테이블 개수 갱신
                let total = payload.total !== undefined ? payload.total : 0;
                if (payload.total === undefined) {
                    if (targetPage === 1 && formatted.length < PAGE_SIZE) {
                        total = formatted.length;
                    } else if (targetPage === 1) {
                        total = 1000; // 예상 fallback (서버에서 total을 안내려줄 경우)
                    } else {
                        total = totalTables; // 기존 유지
                    }
                }
                setTotalTables(total);

                if (formatted.length > 0) {
                    const isFresh = mode === 'fresh';
                    let target = isFresh ? formatted[formatted.length - 1] : formatted[0];
                    if (targetIdToSelect) {
                        const foundTarget = formatted.find(f => f.id === targetIdToSelect);
                        if (foundTarget) target = foundTarget;
                    }
                    if (isFresh || targetIdToSelect || !selectedBanner) {
                        setSelectedBanner(target.id);
                        setCurrentLabel(target.label);
                        setCurrentId(target.id);
                        setCurrentXInfo(target.type);
                    }
                } else {
                    setSelectedBanner('');
                    setCurrentLabel('');
                    setCurrentId('');
                    setCurrentXInfo('');
                }
            } else {
                setBanners([]);
                history.reset([]);
                setSelectedBanner('');
                setCurrentLabel('');
                setCurrentId('');
                setCurrentXInfo('');
            }
        } catch (error) {
            console.error('Fetch Overview Error:', error);
        } finally {
            loadingSpinner.hide();
        }
    };

    const updateBannerInfo = useCallback((newInfo) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: newInfo, isDirty: true } : b));
        if (onUnsavedChange) onUnsavedChange(true);
    }, [selectedBanner, onUnsavedChange]);

    const handleRowClick = useCallback((e) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: b.info.map(it => ({ ...it, inEdit: it === e.dataItem })) } : b));
    }, [selectedBanner]);

    // 문항 목록 필터링 (서버사이드 필터링 사용)
    const filteredBanners = banners;

    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1); // currentPage useEffect가 fetch를 수행함
            } else {
                fetchCrossAnalysisData('normal', null, 1, filterExpression);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [bannerSearch, selectedXInfo, filterExpression, auth?.user?.userId]);

    useEffect(() => {
        if (currentPage !== 1) {
            fetchCrossAnalysisData('normal', null, currentPage, filterExpression);
        }
    }, [currentPage]);

    return (
        <>
            <style>
                {`
                .dp-add-question-dropdown .k-input-value-text {
                    font-weight: 400 !important;
                }
                
                input[type="number"]::-webkit-inner-spin-button, 
                input[type="number"]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                }

                .dp-table-container .k-grid-header th.k-header {
                    font-size: 12px !important;
                    padding: 8px 12px !important;
                }
                .dp-table-container .k-grid-header th.k-header .k-column-title {
                    font-size: 12px !important;
                    font-weight: 600;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    white-space: normal !important;
                    word-break: break-all;
                    line-height: 1.3;
                }

                .custom-xinfo-dropdown.k-dropdownlist,
                .custom-xinfo-dropdown.k-picker {
                    background-color: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    outline: none !important;
                }
                .custom-xinfo-dropdown.k-dropdownlist:hover,
                .custom-xinfo-dropdown.k-dropdownlist:focus,
                .custom-xinfo-dropdown.k-dropdownlist.k-focus,
                .custom-xinfo-dropdown.k-dropdownlist:focus-within {
                    border: none !important;
                    box-shadow: none !important;
                    outline: none !important;
                    background-color: transparent !important;
                }
                .custom-xinfo-dropdown .k-input-inner {
                    padding: 0 10px;
                }
                .custom-xinfo-dropdown .k-input-button,
                .custom-xinfo-dropdown .k-button {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .custom-xinfo-dropdown .k-input-value-text {
                    font-size: 12px !important;
                }

                .custom-xinfo-popup .k-list-item-text {
                    font-size: 12px !important;
                }
                
                .filter-item-row:hover {
                    background-color: #f8fafc;
                }
                
                .filter-item-selected {
                    background-color: #e6effd !important;
                }

                .custom-filter-popup.k-popup {
                    background-color: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                }
                `}
            </style>
            <DataHeader title="교차분석">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                    {/* 데이터 필터 Group */}
                    <div style={{ display: 'flex', alignItems: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', height: '100%' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>데이터 필터</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div ref={filterAnchorRef} style={{ padding: '0', display: 'flex', alignItems: 'center', background: '#ffffff', height: '100%' }}>
                            <div
                                onClick={handleTogglePopup}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: 'transparent', color: '#1e293b',
                                    padding: '0 10px', height: '100%', cursor: 'pointer', fontSize: '12px', fontWeight: 400,
                                    userSelect: 'none', minWidth: '160px'
                                }}
                            >
                                <span style={{ fontSize: '12px' }}>{getFilterButtonText()}</span>
                                <ChevronDown size={14} color="#64748b" style={{ marginLeft: '12px' }} />
                            </div>
                        </div>
                    </div>

                    {/* X Info Dropdown Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', height: '32px', overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: '100%', background: '#f8fafc' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>X 정보 (기준변수)</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                            <DropDownList
                                data={xInfoOptions}
                                textField="text"
                                dataItemKey="value"
                                value={xInfoOptions.find(o => o.value === selectedXInfo) || xInfoOptions[0]}
                                onChange={(e) => setSelectedXInfo(e.value.value)}
                                style={{ width: '160px', height: '100%', border: 'none', fontSize: '13px', color: '#1e293b' }}
                                className="custom-xinfo-dropdown"
                                popupSettings={{ className: "custom-xinfo-popup" }}
                            />
                            <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
                        </div>
                    </div>

                    {/* N Control Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden'
                    }}>
                        <div
                            onClick={() => setShowN(!showN)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '100%', cursor: 'pointer', background: '#eef2ff' }}
                        >
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '4px',
                                background: showN ? '#3b82f6' : '#fff',
                                border: `1.5px solid ${showN ? '#3b82f6' : '#3b82f6'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {showN && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#3730a3', userSelect: 'none' }}>N</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px', height: '100%', background: '#ffffff' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>소수점</span>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '32px', height: '22px', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                                background: '#ffffff'
                            }}>
                                <input
                                    type="text"
                                    value={decimalN}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-5]/g, '');
                                        if (val.length > 1) val = val.slice(-1); // 마지막 입력 문자만 유지
                                        setDecimalN(val !== '' ? parseInt(val) : '');
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setDecimalN(prev => Math.min(5, (prev === '' ? 0 : prev) + 1));
                                        } else if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setDecimalN(prev => Math.max(0, (prev === '' ? 0 : prev) - 1));
                                        }
                                    }}
                                    onBlur={() => {
                                        if (decimalN === '') setDecimalN(0);
                                    }}
                                    style={{
                                        width: '100%', height: '100%', border: 'none', background: 'transparent',
                                        textAlign: 'center', fontSize: '13px', fontWeight: 800, color: '#1e3a8a',
                                        outline: 'none', padding: 0
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* % Control Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden'
                    }}>
                        <div
                            onClick={() => setShowPct(!showPct)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '100%', cursor: 'pointer', background: '#eef2ff' }}
                        >
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '4px',
                                background: showPct ? '#3b82f6' : '#fff',
                                border: `1.5px solid ${showPct ? '#3b82f6' : '#3b82f6'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {showPct && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#3730a3', userSelect: 'none' }}>%</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px', height: '100%', background: '#ffffff' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>소수점</span>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '32px', height: '22px', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                                background: '#ffffff'
                            }}>
                                <input
                                    type="text"
                                    value={decimalPct}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-5]/g, '');
                                        if (val.length > 1) val = val.slice(-1);
                                        setDecimalPct(val !== '' ? parseInt(val) : '');
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setDecimalPct(prev => Math.min(5, (prev === '' ? 1 : prev) + 1));
                                        } else if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setDecimalPct(prev => Math.max(0, (prev === '' ? 1 : prev) - 1));
                                        }
                                    }}
                                    onBlur={() => {
                                        if (decimalPct === '') setDecimalPct(1);
                                    }}
                                    style={{
                                        width: '100%', height: '100%', border: 'none', background: 'transparent',
                                        textAlign: 'center', fontSize: '13px', fontWeight: 800, color: '#1e3a8a',
                                        outline: 'none', padding: 0
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        className="dp-btn"
                        onClick={() => {
                            // TODO: Add actual HTML copy logic
                            // modal.showAlert('알림', 'HTML이 클립보드에 복사되었습니다.');
                        }}
                        style={{
                            color: '#2563eb', border: '1px solid #2563eb', background: '#ffffff',
                            height: '32px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginLeft: '8px'
                        }}
                    >
                        <Copy size={16} strokeWidth={2.5} style={{ marginRight: '6px' }} /> HTML 복사
                    </button>
                </div>
            </DataHeader>
            <div className="dp-request-container" style={{ flex: 1, minHeight: 0, padding: '16px', gap: '12px' }} onClick={() => updateBannerInfo(banners.find(b => b.id === selectedBanner)?.info.map(it => ({ ...it, inEdit: false })) || [])}>


                {/* 2. 메인 레이아웃 */}
                <div className="dp-main-layout" onClick={(e) => e.stopPropagation()} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
                    <div className={`dp-sidebar-container ${!isBannerSidebarOpen ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                        {!isBannerSidebarOpen && (
                            <div className="dp-sidebar-collapsed-bar" onClick={() => setIsBannerSidebarOpen(true)}>
                                <div className="dp-collapsed-header">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        )}
                        <div className="dp-sidebar custom-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                            <div className="dp-sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '8px' }}>
                                <span>테이블 목록 ({totalTables})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button className="dp-sidebar-toggle-btn-compact" onClick={() => setIsBannerSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center' }}>
                                        <ChevronLeft size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="dp-sidebar-header" style={{ display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <div className="dp-search-input-wrapper" style={{ flex: 1, width: '100%' }}>
                                    <Search size={14} className="dp-search-input-icon" />
                                    <input
                                        type="text"
                                        placeholder="변수명 또는 라벨 검색"
                                        value={bannerSearch}
                                        onChange={(e) => setBannerSearch(e.target.value)}
                                        className="dp-search-input"
                                    />
                                </div>
                            </div>
                            <div className="dp-banner-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                {filteredBanners.map(banner => (
                                    <div key={banner.id}
                                        className={`dp-banner-item ${selectedBanner === banner.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedBanner(banner.id);
                                            setCurrentLabel(banner.label);
                                            setCurrentId(banner.id.startsWith('NEW_') ? '' : banner.id);
                                            setCurrentXInfo(banner.type || '단일 응답형 (Single)');
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', minHeight: '40px', borderRadius: '8px' }}
                                    >
                                        <div className="dp-banner-item-info" style={{ flex: 1, paddingRight: '8px' }}>
                                            <span className="dp-banner-label" style={{ display: 'block', marginBottom: '1px', lineHeight: 1.3, fontSize: '12px', wordBreak: 'break-all' }}>
                                                {banner.id.startsWith('NEW_') ? (banner.label || '(새 문항 작성 중)') : banner.label}
                                            </span>
                                            <span className="dp-banner-sub" style={{ display: 'block', fontSize: '11px', opacity: 0.6, wordBreak: 'break-all', lineHeight: 1.3 }}>
                                                {banner.id.startsWith('NEW_') ? '저장 대기' : banner.id}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 페이징 UI */}
                            {totalTables > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '10px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage <= 1}
                                        style={{
                                            width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: 0, border: '1px solid #e2e8f0', borderRadius: '6px',
                                            background: currentPage <= 1 ? '#f8fafc' : '#ffffff',
                                            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                                            color: currentPage <= 1 ? '#cbd5e1' : '#475569'
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', userSelect: 'none' }}>
                                        <span style={{ color: '#1e3a8a' }}>{currentPage}</span> / <span style={{ color: '#0f172a' }}>{Math.ceil(totalTables / PAGE_SIZE)}</span>
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalTables / PAGE_SIZE), p + 1))}
                                        disabled={currentPage >= Math.ceil(totalTables / PAGE_SIZE)}
                                        style={{
                                            width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: 0, border: '1px solid #e2e8f0', borderRadius: '6px',
                                            background: currentPage >= Math.ceil(totalTables / PAGE_SIZE) ? '#f8fafc' : '#ffffff',
                                            cursor: currentPage >= Math.ceil(totalTables / PAGE_SIZE) ? 'not-allowed' : 'pointer',
                                            color: currentPage >= Math.ceil(totalTables / PAGE_SIZE) ? '#cbd5e1' : '#475569'
                                        }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '24px' }}>
                        <CrossTableGrid
                            dataItem={banners.find(b => b.id === selectedBanner)}
                            showN={showN}
                            showPct={showPct}
                            decimalN={decimalN}
                            decimalPct={decimalPct}
                        />
                    </div>
                </div>
            </div>

            {/* 데이터 필터 모달 (Popup) */}
            <Popup
                anchor={filterAnchorRef.current}
                show={isFilterOpen}
                anchorAlign={{ horizontal: 'left', vertical: 'bottom' }}
                popupAlign={{ horizontal: 'left', vertical: 'top' }}
                popupClass="custom-filter-popup"
                style={{ width: `${filterPopupWidth}px`, marginTop: '4px', zIndex: 1000 }}
            >
                <div ref={filterPopupRef} style={{ background: '#fff', border: '1px solid #3b82f6', borderRadius: '6px', display: 'flex', flexDirection: 'column', maxHeight: '420px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)' }}>

                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <div
                            onClick={toggleAllFilters}
                            style={{ padding: '8px 14px', fontSize: '12px', color: '#1e293b', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', fontWeight: 400, display: 'flex', alignItems: 'center' }}
                            className={`filter-item-row ${draftComputedFilterIds.includes(CROSS_FILTER_ALL_ID) ? 'filter-item-selected' : ''}`}
                        >
                            <div style={{ width: '22px', display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    width: '13px', height: '13px', border: draftComputedFilterIds.includes(CROSS_FILTER_ALL_ID) ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                                    borderRadius: '3px', background: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {draftComputedFilterIds.includes(CROSS_FILTER_ALL_ID) && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '0.5px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                </div>
                            </div>
                            <span>전체</span>
                        </div>

                        <div style={{ padding: '2px 0' }}>
                            {computedFilterOptions.length === 0 ? (
                                <div style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                                    등록된 파생 문항이 없습니다.
                                </div>
                            ) : (
                                computedFilterOptions.map(f => {
                                    const isSelected = draftComputedFilterIds.includes(f.id);
                                    return (
                                        <div
                                            key={f.id}
                                            onClick={() => toggleFilter(f.id)}
                                            className={`filter-item-row ${isSelected ? 'filter-item-selected' : ''}`}
                                            style={{ display: 'flex', alignItems: 'flex-start', padding: '6px 14px', cursor: 'pointer', transition: 'background 0.1s' }}
                                        >
                                            <div style={{ width: '22px', display: 'flex', justifyContent: 'flex-start', marginTop: '1px' }}>
                                                <div style={{
                                                    width: '13px', height: '13px', border: isSelected ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                                                    borderRadius: '3px', background: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {isSelected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '0.5px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                </div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 400, marginBottom: '2px', wordBreak: 'break-all', lineHeight: 1.3 }}>{f.label}</div>
                                                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>{f.variableLabel}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div style={{ padding: '8px 10px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                        <button
                            onClick={applyFilterAndClose}
                            style={{ width: '100%', height: '30px', background: '#3b5bdb', color: '#fff', borderRadius: '4px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseOver={(e) => e.target.style.background = '#364fc7'}
                            onMouseOut={(e) => e.target.style.background = '#3b5bdb'}
                        >
                            확인
                        </button>
                    </div>
                </div>
            </Popup>
        </>
    );
});

export default CrossAnalysisPage;
