import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, ChevronUp, Play, Search, BarChart2, BarChartHorizontal, Download, X, Settings, ChevronRight, GripVertical, GripHorizontal, LineChart, Map as MapIcon, PieChart, Donut, AreaChart, LayoutGrid, ChevronLeft, Layers, Filter, Aperture, MoreHorizontal, Copy, Bot, Loader2, Sparkles, CheckCircle2, Maximize, Minimize, Save, Grid, Plus, Table, List, Star, Table2 } from 'lucide-react';
import Toast from '../../../../components/common/Toast';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { Popup } from '@progress/kendo-react-popup';
import { saveAs } from '@progress/kendo-file-saver';
import KendoChart from '../../components/KendoChart';
import '@progress/kendo-theme-default/dist/all.css';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import CreateTablePopup from './CreateTablePopup';
import './AdditionalAnalysisPage.css';
import { AdditionalAnalysisPageApi } from './AdditionalAnalysisPageApi';
import { DpRequestPageApi } from '../hsrt/dpRequest/DpRequestPageApi';
import { modalContext } from "@/components/common/Modal.jsx";
import FullscreenModal from './FullscreenModal';
import { VariablePageApi } from '../variable/VariablePageApi';
import PageListPopup from '../variable/PageListPopup';
import AdditionalAnalysisFilterPopup from '../../../../components/common/popup/AdditionalAnalysisFilterPopup';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
const ALL_STATS = ["mean", "std", "min", "max", "n", "median", "mode", "rse"];
const CROSS_FILTER_ALL_ID = '__ALL__';
const SIG_TYPE_OPTIONS = [
    { text: '미적용', value: 'none' },
    { text: '차이검증 (t-test)', value: 't_test' },
    { text: '전체값 대비 (편차)', value: 'deviation' }
];

import { ResultSectionBlock } from './ResultSectionBlock';

const parseTableData = (newData) => {
    const columnsList = newData.columns || [];
    const rowsList = newData.rows || [];
    const columnLabels = columnsList.map(c => ({
        label: c.label,
        label2: c.label2 || '',
        label3: c.label3 || '',
        var_label: c.var_label || c.variable_label || ''
    }));
    const columnKeys = columnsList.map(c => c.key);

    const parsedRows = rowsList.map(r => {
        const processedValues = columnKeys.map(k => {
            const cell = r.cells?.[k];
            return {
                count: cell?.count || 0,
                percent: cell?.percent || "0.0",
                sig_vs_total: cell?.sig_vs_total || null
            };
        });
        const total = processedValues.reduce((a, b) => a + Number(b.count), 0);
        return {
            ...r,
            label: r.label,
            values: processedValues,
            total: total,
            label2: r.label2 || '',
            var_label: r.var_label || r.variable_label || ''
        };
    });

    const statsMap = newData.stats || {};
    const parsedStats = {
        mean: columnsList.map(c => statsMap[c.key]?.mean ?? (c.mean !== undefined && c.mean !== null ? c.mean : '-')),
        median: columnsList.map(c => statsMap[c.key]?.median ?? statsMap[c.key]?.med ?? (c.median !== undefined && c.median !== null ? c.median : ((c.med !== undefined && c.med !== null) ? c.med : '-'))),
        mode: columnsList.map(c => statsMap[c.key]?.mode ?? statsMap[c.key]?.mod ?? (c.mode !== undefined && c.mode !== null ? c.mode : ((c.mod !== undefined && c.mod !== null) ? c.mod : '-'))),
        std: columnsList.map(c => statsMap[c.key]?.std ?? (c.std !== undefined && c.std !== null ? c.std : '-')),
        min: columnsList.map(c => statsMap[c.key]?.min ?? (c.min !== undefined && c.min !== null ? c.min : '-')),
        max: columnsList.map(c => statsMap[c.key]?.max ?? (c.max !== undefined && c.max !== null ? c.max : '-')),
        n: columnsList.map(c => statsMap[c.key]?.n ?? (c.n !== undefined && c.n !== null ? c.n : 0)),
        rse: columnsList.map(c => statsMap[c.key]?.rse ?? (c.rse !== undefined && c.rse !== null ? c.rse : '-')),
        chi2: columnsList.map(c => statsMap[c.key]?.chi2 ?? (c.chi2 !== undefined && c.chi2 !== null ? c.chi2 : '-')),
        df: columnsList.map(c => statsMap[c.key]?.df ?? (c.df !== undefined && c.df !== null ? c.df : '-')),
        p_value: columnsList.map(c => statsMap[c.key]?.p_value ?? (c.p_value !== undefined && c.p_value !== null ? c.p_value : '-')),
    };

    const groupedRows = (() => {
        const order = [];
        const map = new Map();
        parsedRows.forEach(r => {
            const k = r.label2 || r.var_label || '';
            if (!map.has(k)) {
                map.set(k, []);
                order.push(k);
            }
            map.get(k).push(r);
        });
        const res = [];
        order.forEach(k => res.push(...map.get(k)));
        return res;
    })();

    return {
        columns: columnLabels,
        rows: groupedRows,
        stats: parsedStats,
        table_id: newData.table_id || 'T1',
        title: newData.title || '',
        y_info: newData.y_info || ''
    };
};

const processResults = (evalResultData) => {
    if (evalResultData.results && Array.isArray(evalResultData.results)) {
        return evalResultData.results.map(r => {
            const parsed = parseTableData(r.result || r);
            return {
                ...parsed,
                y_info: r.y_info || parsed.y_info // Priority to wrapper's y_info
            };
        });
    } else {
        return [parseTableData(evalResultData)];
    }
};


const AdditionalAnalysisPage = () => {
    // Auth & API
    const auth = useSelector((store) => store.auth);
    const { getTableRenderContext, getOverviewContext, exportOverviewXlsx } = DpRequestPageApi();
    const { getCrossTabList, getCrossTabData, saveCrossTable, deleteCrossTable, evaluateTable, exportAdditionalXlsx } = AdditionalAnalysisPageApi();
    const modal = React.useContext(modalContext);
    const loadingSpinner = React.useContext(loadingSpinnerContext);
    const alertTimerRef = useRef(null);
    const [currentPageId, setCurrentPageId] = useState(sessionStorage.getItem("pageId"));

    // Data State
    const [styleCss, setStyleCss] = useState('');
    const [tables, setTables] = useState([]);
    const [selectedTableId, setSelectedTableId] = useState(null);
    const [mainBannerId, setMainBannerId] = useState(null);
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tableSearchTerm, setTableSearchTerm] = useState('');
    const [variableSearchTerm, setVariableSearchTerm] = useState('');
    const [selectedWeight, setSelectedWeight] = useState("없음");
    const [tableName, setTableName] = useState(''); // Added table name state
    const [filterExpression, setFilterExpression] = useState(''); // Added filter expression state
    const [filterInfo, setFilterInfo] = useState(null); // Added filter info state
    const [tableMode, setTableMode] = useState('separated'); // 'merged' | 'separated' (Force default to separated)
    const [globalPaletteId, setGlobalPaletteId] = useState('default');
    const [isVariablePanelOpen, setIsVariablePanelOpen] = useState(true);
    const [collapsedIndices, setCollapsedIndices] = useState(new Set());
    const [toast, setToast] = useState({ show: false, message: '' });
    const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
    const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
    const displaySettingsRef = useRef(null);

    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [excelShowPct, setExcelShowPct] = useState(true);
    const [excelShowBaseParenthesis, setExcelShowBaseParenthesis] = useState(true);
    const [excelDecimalPct, setExcelDecimalPct] = useState(1);

    const [selectedComputedFilterIds, setSelectedComputedFilterIds] = useState([CROSS_FILTER_ALL_ID]);
    const [draftComputedFilterIds, setDraftComputedFilterIds] = useState([CROSS_FILTER_ALL_ID]);
    const [computedFilterOptions, setComputedFilterOptions] = useState([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearchQuery, setFilterSearchQuery] = useState('');
    const filterAnchorRef = useRef(null);
    const filterPopupRef = useRef(null);
    const tableListRef = useRef(null);
    const [fullscreenModal, setFullscreenModal] = useState({
        open: false,
        type: null,
        dataItem: null,
        chartData: null,
        seriesNames: null,
        statsOptions: [],
        chartMode: null
    }); // 'table', 'stats', 'chart'

    // Variables for Drag & Drop
    const [variables, setVariables] = useState([]);
    const baseVariableIdsRef = useRef(new Set());
    const allBaseVariablesRef = useRef([]);

    const isAddVariable = (v) => {
        if (!v) return false;
        return !!v.isBase && (String(v.id).includes('ADD') || String(v.name).includes('ADD'));
    };

    const isStubVariable = (v) => {
        if (!v) return false;
        return !!v.isRecoded && !(String(v.id).includes('ADD') || String(v.name).includes('ADD'));
    };

    const isValidRowVar = (v) => {
        return isAddVariable(v) || isStubVariable(v);
    };

    const isValidColVar = (v) => {
        if (!v) return false;
        if (String(v.id).includes('_stub')) {
            const cleanId = String(v.id).replace(/_stub\+?$/, '');
            return allBaseVariablesRef.current.some(orig => orig.id === cleanId || orig.name === cleanId) ||
                variables.some(orig => orig.id === cleanId || orig.name === cleanId);
        }
        return true;
    };

    const [rowVars, setRowVars] = useState([]);
    const [colVars, setColVars] = useState([]);
    const [variableOverrides, setVariableOverrides] = useState({}); // Array of arrays: [[v1, v2], [v3]]
    const [selectedVarIds, setSelectedVarIds] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);
    const draggedItemRef = useRef(null); // stale closure 방지용 동기 ref
    const originalConfigsRef = useRef(new Map());
    const isConfigLoadingRef = useRef(false);
    const loadedTableIdRef = useRef(null);

    useEffect(() => {
        if (!selectedTableId) return;

        const currentConfigString = JSON.stringify({
            tableName,
            rowVars: rowVars.map(v => v.id || v.name),
            colVars: colVars.map(g => g.map(v => v.id || v.name)),
            filterExpression,
            selectedWeight,
            tableMode
        });

        if (isConfigLoadingRef.current) {
            loadedTableIdRef.current = selectedTableId;
            originalConfigsRef.current.set(selectedTableId, currentConfigString);
            setTables(prev => prev.map(t => t.id === selectedTableId ? { ...t, isDirty: false } : t));
            isConfigLoadingRef.current = false;
        } else if (loadedTableIdRef.current === selectedTableId) {
            const orig = originalConfigsRef.current.get(selectedTableId);
            if (orig && orig !== currentConfigString) {
                setTables(prev => prev.map(t => t.id === selectedTableId && !t.isDirty ? { ...t, isDirty: true } : t));
            } else if (orig && orig === currentConfigString) {
                setTables(prev => prev.map(t => t.id === selectedTableId && t.isDirty ? { ...t, isDirty: false } : t));
            }
        }
    }, [tableName, rowVars, colVars, filterExpression, selectedWeight, tableMode, selectedTableId]);

    // Filter weight variables from API response
    const weightVariableOptions = useMemo(() => {
        const weights = variables
            .filter(v => v?.id?.startsWith('weight_'))
            .map(v => v?.id);
        return ["없음", ...weights];
    }, [variables]);

    const [localWeight, setLocalWeight] = useState(selectedWeight);
    const [localSigType, setLocalSigType] = useState('none');
    const [localShowN, setLocalShowN] = useState(true);
    const [localShowPct, setLocalShowPct] = useState(true);
    const [localDecimalN, setLocalDecimalN] = useState(0);
    const [localDecimalPct, setLocalDecimalPct] = useState(1);

    const { pageList: getPageList } = VariablePageApi();
    const [isPageListOpen, setIsPageListOpen] = useState(false);
    const [pageListData, setPageListData] = useState([]);
    const [displayPolicy, setDisplayPolicy] = useState(null);
    const [renderSettings, setRenderSettings] = useState(null);

    useEffect(() => {
        if (isDisplaySettingsOpen) {
            setLocalWeight(selectedWeight);
            setLocalSigType(displayPolicy?.sig_type || 'none');
            setLocalShowN(displayPolicy?.show_n !== false);
            setLocalShowPct(displayPolicy?.show_percent !== false);
            setLocalDecimalN(displayPolicy?.n_digits ?? 0);
            setLocalDecimalPct(displayPolicy?.percent_digits ?? 1);
        }
    }, [isDisplaySettingsOpen, selectedWeight, displayPolicy]);

    const weightDropdownData = useMemo(() => {
        return weightVariableOptions.map(w => ({ text: w, value: w }));
    }, [weightVariableOptions]);

    const handleApplyDisplaySettings = async () => {
        setIsDisplaySettingsOpen(false);
        const targetWeight = localWeight;
        const targetSigType = localSigType;
        const targetShowN = localShowN;
        const targetShowPct = localShowPct;
        const targetDecimalN = localDecimalN === '' ? 0 : Number(localDecimalN);
        const targetDecimalPct = localDecimalPct === '' ? 0 : Number(localDecimalPct);

        setSelectedWeight(targetWeight);

        const nextPolicy = {
            ...displayPolicy,
            show_n: targetShowN,
            show_percent: targetShowPct,
            n_digits: targetDecimalN,
            percent_digits: targetDecimalPct,
            sig_type: targetSigType,
            weight_col: targetWeight === '없음' ? '' : targetWeight
        };
        setDisplayPolicy(nextPolicy);
        await handleRun(undefined, nextPolicy);
    };

    const handleOpenPageList = async () => {
        const userId = auth?.user?.userId;
        const mergePn = sessionStorage.getItem("merge_pn");

        if (!userId || !mergePn) {
            modal.showErrorAlert("알림", "프로젝트 정보가 없습니다.");
            return;
        }

        try {
            const result = await getPageList.mutateAsync({ user: userId, pn: mergePn });
            if (String(result?.success) === '777' && result.resultjson) {
                setPageListData(result.resultjson);
                setIsPageListOpen(true);
            }
        } catch (e) {
            console.error(e);
            modal.showErrorAlert("오류", "대시보드 목록 조회 중 오류가 발생했습니다.");
        }
    };

    const handlePageSelected = (page) => {
        const pageId = page.page_id || page.pageid || page.id;
        const pageTitle = page.title || page.name;
        sessionStorage.setItem("pageId", pageId);
        sessionStorage.setItem("pagetitle", pageTitle);
        setIsPageListOpen(false);
        window.location.reload();
    };

    useEffect(() => {
        if (!variables || variables.length === 0) return;
        const filterOpts = variables
            .filter(value => {
                const variableId = String(value?.id ?? value?.name ?? '').trim();
                const isAddQuestion = variableId.toUpperCase().startsWith("ADD_");
                if (isAddQuestion) {
                    return String(value?.recoded_type ?? "").toLowerCase() === "computed";
                }
                return true;
            })
            .flatMap(value => {
                const variableId = String(value?.id ?? value?.name ?? '');
                const variableLabel = String(value?.label ?? value?.name ?? variableId).trim() || variableId;
                const infoList = Array.isArray(value?.info) ? value.info : [];
                return infoList
                    .map((info, index) => {
                        const label = String(info?.label ?? "").trim();
                        const rawValue = info?.value ?? info?.num ?? index + 1;
                        const logic = String(info?.logic ?? `${variableId} == ${rawValue}`).trim();
                        if (!label) return null;
                        return {
                            id: `${variableId}::${String(rawValue).trim() || String(index + 1)}`,
                            label,
                            logic,
                            variableId,
                            variableLabel,
                        };
                    })
                    .filter(Boolean);
            });
        setComputedFilterOptions(filterOpts);
    }, [variables]);

    const filteredGroupedFilters = useMemo(() => {
        const query = filterSearchQuery.trim().toLowerCase();
        const groups = [];

        computedFilterOptions.forEach(opt => {
            let group = groups.find(g => g.variableId === opt.variableId);
            if (!group) {
                group = {
                    variableId: opt.variableId,
                    variableLabel: opt.variableLabel,
                    options: []
                };
                groups.push(group);
            }
            group.options.push(opt);
        });

        if (!query) return groups;

        return groups.map(g => {
            const parentMatches = g.variableLabel.toLowerCase().includes(query) || g.variableId.toLowerCase().includes(query);
            const matchedOptions = g.options.filter(o => o.label.toLowerCase().includes(query));

            if (parentMatches) {
                return g;
            } else if (matchedOptions.length > 0) {
                return { ...g, options: matchedOptions };
            }
            return null;
        }).filter(Boolean);
    }, [computedFilterOptions, filterSearchQuery]);

    const handleTogglePopup = () => {
        if (!isFilterOpen) {
            setDraftComputedFilterIds(selectedComputedFilterIds);
        }
        setIsFilterOpen(!isFilterOpen);
    };

    const applyFilterAndClose = () => {
        setSelectedComputedFilterIds(draftComputedFilterIds);
        setIsFilterOpen(false);

        if (draftComputedFilterIds.includes(CROSS_FILTER_ALL_ID)) {
            setFilterExpression("");
            setFilterInfo(null);
            handleRun("");
            return;
        }

        const activeOptions = computedFilterOptions.filter(o => draftComputedFilterIds.includes(o.id));
        if (activeOptions.length === 0) {
            setFilterExpression("");
            setFilterInfo(null);
            handleRun("");
            return;
        }

        const groups = {};
        activeOptions.forEach(o => {
            const varId = o.variableId || 'default';
            if (!groups[varId]) {
                groups[varId] = [];
            }
            groups[varId].push(o.logic);
        });

        const groupExpressions = Object.values(groups).map(logics => `(${logics.join(" or ")})`);
        const exprStr = groupExpressions.join(" and ");
        setFilterExpression(exprStr);
        handleRun(exprStr);
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

    const toggleParentFilter = (group) => {
        const allChildIds = group.options.map(o => o.id);
        const checkedChildIds = allChildIds.filter(id => draftComputedFilterIds.includes(id));
        const isAllChecked = checkedChildIds.length === allChildIds.length;

        setDraftComputedFilterIds(prev => {
            let next = prev.filter(x => x !== CROSS_FILTER_ALL_ID);
            if (isAllChecked) {
                next = next.filter(id => !allChildIds.includes(id));
            } else {
                allChildIds.forEach(id => {
                    if (!next.includes(id)) {
                        next.push(id);
                    }
                });
            }
            return next.length > 0 ? next : [CROSS_FILTER_ALL_ID];
        });
    };

    const getFilterButtonText = () => {
        const activeIds = selectedComputedFilterIds.filter(id => id !== CROSS_FILTER_ALL_ID);
        if (activeIds.length === 0) return '필터 선택';

        const groups = {};
        activeIds.forEach(id => {
            const opt = computedFilterOptions.find(o => o.id === id);
            if (opt) {
                if (!groups[opt.variableId]) {
                    groups[opt.variableId] = {
                        variableLabel: opt.variableLabel,
                        count: 0
                    };
                }
                groups[opt.variableId].count += 1;
            }
        });

        const selectedSummary = Object.values(groups).map(g => `${g.variableLabel}(${g.count})`);
        return selectedSummary.length > 0 ? selectedSummary.join(', ') : '필터 선택';
    };

    const activeFilterChips = useMemo(() => {
        if (selectedComputedFilterIds.includes(CROSS_FILTER_ALL_ID)) return [];

        const groups = {};
        selectedComputedFilterIds.forEach(id => {
            const opt = computedFilterOptions.find(o => o.id === id);
            if (opt) {
                if (!groups[opt.variableId]) {
                    groups[opt.variableId] = {
                        variableId: opt.variableId,
                        variableLabel: opt.variableLabel,
                        labels: []
                    };
                }
                groups[opt.variableId].labels.push(opt.label);
            }
        });

        return Object.values(groups).map(g => {
            const displayText = `${g.variableLabel} [${g.labels.join(', ')}]`;
            return {
                variableId: g.variableId,
                displayText
            };
        });
    }, [selectedComputedFilterIds, computedFilterOptions]);

    const handleRemoveFilterChip = (variableId) => {
        setSelectedComputedFilterIds(prev => {
            const next = prev.filter(id => {
                const opt = computedFilterOptions.find(o => o.id === id);
                return !opt || opt.variableId !== variableId;
            });
            const updated = next.length > 0 ? next : [CROSS_FILTER_ALL_ID];
            setDraftComputedFilterIds(updated);

            if (updated.includes(CROSS_FILTER_ALL_ID)) {
                setFilterExpression("");
                setFilterInfo(null);
                handleRun("");
            } else {
                const activeOptions = computedFilterOptions.filter(o => updated.includes(o.id));
                const groups = {};
                activeOptions.forEach(o => {
                    const vId = o.variableId || 'default';
                    if (!groups[vId]) groups[vId] = [];
                    groups[vId].push(o.logic);
                });
                const exprStr = Object.values(groups).map(logics => `(${logics.join(" or ")})`).join(" and ");
                setFilterExpression(exprStr);
                handleRun(exprStr);
            }
            return updated;
        });
    };

    const handleResetAllFilters = () => {
        setSelectedComputedFilterIds([CROSS_FILTER_ALL_ID]);
        setDraftComputedFilterIds([CROSS_FILTER_ALL_ID]);
        setFilterExpression("");
        setFilterInfo(null);
        handleRun("");
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (displaySettingsRef.current && !displaySettingsRef.current.contains(event.target)) {
                setIsDisplaySettingsOpen(false);
            }
            if (isFilterOpen &&
                filterAnchorRef.current &&
                !filterAnchorRef.current.contains(event.target) &&
                filterPopupRef.current &&
                !filterPopupRef.current.contains(event.target)) {
                setDraftComputedFilterIds(selectedComputedFilterIds);
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterOpen, selectedComputedFilterIds]);

    const handleExcelExport = async () => {
        if (!auth?.user?.userId) {
            modal.showAlert("알림", "로그인이 필요합니다.");
            return;
        }
        const pageId = sessionStorage.getItem('pageId') || currentPageId;
        if (!pageId) {
            modal.showAlert("알림", "페이지 정보가 없습니다.");
            return;
        }

        try {
            loadingSpinner.show();

            const variablesMap = {};
            if (Array.isArray(variables)) {
                variables.forEach(v => {
                    const varId = v?.id || v?.name;
                    if (varId) {
                        variablesMap[varId] = v;
                    }
                });
            }

            const formattedTables = (tables && tables.length > 0) ? tables.map((t, idx) => {
                let banner = [];
                let stub = [];

                if (t.id === selectedTableId) {
                    const xInfoStr = colVars.filter(g => g.length > 0).length > 0
                        ? [colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*')).join('+')]
                        : [];
                    banner = xInfoStr;
                    stub = rowVars.map(v => v.id || v.name);
                } else {
                    if (Array.isArray(t.banner) && t.banner.length > 0) {
                        banner = t.banner;
                    } else if (Array.isArray(t.col) && t.col.length > 0) {
                        banner = t.col.map(c => Array.isArray(c) ? c.join('*') : String(c));
                    } else if (Array.isArray(t.colVars) && t.colVars.length > 0) {
                        banner = t.colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*'));
                    }

                    if (Array.isArray(t.stub) && t.stub.length > 0) {
                        stub = t.stub;
                    } else if (Array.isArray(t.row) && t.row.length > 0) {
                        stub = t.row.map(r => String(r));
                    } else if (Array.isArray(t.rowVars) && t.rowVars.length > 0) {
                        stub = t.rowVars.map(v => v.id || v.name);
                    }
                }

                return {
                    id: t.id || `table-${idx + 1}`,
                    name: t.name || t.title || `추가분석 교차표 ${idx + 1}`,
                    banner: banner,
                    stub: stub
                };
            }) : [
                {
                    id: selectedTableId || 'table-1',
                    name: tableName || "추가분석 교차표 1",
                    banner: colVars.filter(g => g.length > 0).length > 0
                        ? [colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*')).join('+')]
                        : [],
                    stub: rowVars.map(v => v.id || v.name)
                }
            ];

            const currentSigType = displayPolicy?.sig_type || 'none';
            const sigTypeVal = currentSigType !== 'none' ? currentSigType : null;
            const includeStatsList = (sigTypeVal && sigTypeVal !== 'none')
                ? [sigTypeVal === 't_test' ? 't-test' : sigTypeVal]
                : [];

            const requestData = {
                user: auth.user.userId,
                pageid: pageId,
                tables: formattedTables,
                variables: variablesMap,
                weight_col: (selectedWeight && selectedWeight !== "없음" && selectedWeight !== "") ? selectedWeight : null,
                filter_expression: filterExpression ? filterExpression : null,
                excel_show_percent: excelShowPct,
                include_stats: includeStatsList,
                display_policy: {
                    show_n: displayPolicy?.show_n !== false,
                    show_percent: excelShowPct,
                    excel_show_percent: excelShowPct,
                    percent_symbol: excelShowPct,
                    percent_digits: excelDecimalPct === '' ? 1 : Number(excelDecimalPct),
                    show_base_parenthesis: excelShowBaseParenthesis,
                    base_prefix: excelShowBaseParenthesis ? "(" : "",
                    base_postfix: excelShowBaseParenthesis ? ")" : "",
                    sig_diff_fin_mode: sigTypeVal || "t_test",
                    sig_level: displayPolicy?.sig_level ?? 95
                },
                ui_settings: {
                    theme_base_bg: "#F3F4F6",
                    theme_base_fg: "#111827"
                }
            };

            let result;
            try {
                result = await exportAdditionalXlsx.mutateAsync(requestData);
            } catch (err) {
                console.warn("exportAdditionalXlsx endpoint failed, falling back to exportOverviewXlsx:", err);
                result = await exportOverviewXlsx.mutateAsync(requestData);
            }

            const payload = result?.resultjson || result || {};
            const isSuccess = String(result?.success) === "777" || String(payload?.success) === "777";
            const base64Data = payload.xlsx_base64 || payload.content_base64;

            if (isSuccess && base64Data) {
                const binaryString = window.atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: payload.content_type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const projectTitle = sessionStorage.getItem("pagetitle") || "프로젝트명";
                const defaultFilename = `${projectTitle}_추가분석_일괄추출.xlsx`;
                link.setAttribute('download', payload.filename || defaultFilename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                modal.showAlert('오류', payload?.message || '엑셀 데이터 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('Excel Export Error:', error);
            modal.showAlert('오류', '엑셀 다운로드 중 문제가 발생했습니다.');
        } finally {
            loadingSpinner.hide();
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!auth?.user?.userId) return;
            const currentPid = sessionStorage.getItem("pageId");
            setCurrentPageId(currentPid);

            if (!currentPid || currentPid === "null" || currentPid === "undefined") {
                setVariables([]);
                setTables([]);
                setSelectedTableId(null);
                setResultDataList([]);
                setRowVars([]);
                setColVars([]);
                setVariableOverrides({});

                if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
                alertTimerRef.current = setTimeout(() => {
                    const finalPid = sessionStorage.getItem("pageId");
                    if (sessionStorage.getItem("merge_pn") && (!finalPid || finalPid === "null" || finalPid === "undefined")) {
                        modal.showAlert("알림", "선택된 대시보드 정보가 없습니다.", null, handleOpenPageList);
                    }
                }, 1000);
                return;
            }

            if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
            loadingSpinner.show();

            let loadedVariables = [];

            let localDisplayPolicy = null;
            // Fetch Render Context
            try {
                const renderCtx = await getTableRenderContext.mutateAsync({ pageid: currentPid, user: auth.user.userId });
                if (String(renderCtx?.success) === '777' && renderCtx.resultjson) {
                    localDisplayPolicy = renderCtx.resultjson.display_policy;
                    setDisplayPolicy(renderCtx.resultjson.display_policy);
                    setRenderSettings(renderCtx.resultjson.render_settings);
                }
            } catch (e) { console.error("Render context error", e); }

            // Fetch Variables (via overview/context API)
            try {
                const contextRes = await getOverviewContext.mutateAsync({
                    pageid: currentPid,
                    user: auth.user.userId
                });

                const ctxPayload = contextRes?.resultjson || contextRes || {};

                baseVariableIdsRef.current.clear();
                const baseParsed = [];
                const recodedParsed = [];

                if (ctxPayload.base_variables) {
                    Object.values(ctxPayload.base_variables).forEach(item => {
                        const rawType = (item.type || '').toLowerCase();
                        let color = 'gray';
                        let displayType = rawType;

                        if (rawType === 'single') { color = 'single'; }
                        else if (rawType === 'multi') { color = 'multi'; }
                        else if (rawType === 'rank') { color = 'rank'; }
                        else if (rawType === 'minrank') { color = 'minrank'; }
                        else if (rawType === 'maxrank') { color = 'maxrank'; }
                        else if (rawType === 'scale') { color = 'scale'; }
                        else if (rawType === 'dummy') { color = 'dummy'; }
                        else if (rawType === 'custom') { color = 'custom'; }
                        else if (rawType.includes('문자')) { color = 'open-text'; displayType = 'open(문자)'; }
                        else if (rawType.includes('숫자')) { color = 'open-num'; displayType = 'open(숫자)'; }
                        else if (rawType.includes('open')) { color = 'open-text'; displayType = 'open'; }

                        baseVariableIdsRef.current.add(item.id);

                        baseParsed.push({
                            id: item.id,
                            name: item.name || item.id,
                            label: item.label,
                            type: displayType,
                            color: color,
                            info: item.info || [],
                            isBase: true
                        });
                    });
                    allBaseVariablesRef.current = baseParsed;
                }

                if (ctxPayload.recoded_variables) {
                    Object.values(ctxPayload.recoded_variables).forEach(item => {
                        const rawType = (item.type || '').toLowerCase();
                        let color = 'gray';
                        let displayType = rawType || 'categorical';

                        if (rawType === 'single') { color = 'single'; }
                        else if (rawType === 'multi') { color = 'multi'; }
                        else if (rawType === 'rank') { color = 'rank'; }
                        else if (rawType === 'minrank') { color = 'minrank'; }
                        else if (rawType === 'maxrank') { color = 'maxrank'; }
                        else if (rawType === 'scale') { color = 'scale'; }
                        else if (rawType === 'dummy') { color = 'dummy'; }
                        else if (rawType === 'custom') { color = 'custom'; }
                        else if (rawType.includes('문자')) { color = 'open-text'; displayType = 'open(문자)'; }
                        else if (rawType.includes('숫자')) { color = 'open-num'; displayType = 'open(숫자)'; }
                        else if (rawType.includes('open')) { color = 'open-text'; displayType = 'open'; }

                        recodedParsed.push({
                            id: item.id,
                            name: item.name || item.id,
                            label: item.label,
                            type: displayType,
                            color: color,
                            info: item.info || [],
                            isRecoded: true
                        });
                    });
                }

                // Keep loadedVariables as all base and recoded variables to avoid missing standard variables like SQ1.
                const allMergedVariablesMap = new Map();
                baseParsed.forEach(v => allMergedVariablesMap.set(v.id, v));
                recodedParsed.forEach(v => allMergedVariablesMap.set(v.id, v));
                loadedVariables = Array.from(allMergedVariablesMap.values());
                setVariables(loadedVariables);
            } catch (error) {
                console.error("Failed to fetch variables via getOverviewContext:", error);
            }

            // Fetch Tables
            try {
                const result = await getCrossTabList.mutateAsync({
                    user: auth.user.userId,
                    pageid: currentPid
                });

                if (String(result?.success) === '777') {
                    const data = Array.isArray(result.resultjson)
                        ? result.resultjson
                        : Object.values(result.resultjson || {});

                    const tableMap = new Map();
                    data.forEach(item => {
                        tableMap.set(item.id, {
                            id: item.id,
                            name: item.name || item.TABLE_TITLE || item.id || `Table ${item.id}`,
                            row: item.row || item.rows || [],
                            col: item.col || item.cols || []
                        });
                    });

                    const mappedTables = Array.from(tableMap.values());

                    if (mappedTables.length > 0) {
                        setTables(mappedTables);

                        // Select first table automatically
                        const firstTable = mappedTables[0];
                        setSelectedTableId(firstTable.id);
                        setTableName(firstTable.id || "");
                        setIsConfigOpen(false);

                        // Set configuration using loaded variables
                        const newRowVars = (firstTable.row || []).map(id => {
                            const found = loadedVariables.find(v => v.id === id) || allBaseVariablesRef.current.find(v => v.id === id);
                            return found || { id, name: id, label: id, info: [] };
                        });
                        const newColVars = (firstTable.col || []).map(id => {
                            if (Array.isArray(id)) {
                                return id.map(subId => {
                                    const found = loadedVariables.find(v => v.id === subId) || allBaseVariablesRef.current.find(v => v.id === subId);
                                    return found || { id: subId, name: subId, label: subId, info: [] };
                                });
                            }
                            const found = loadedVariables.find(v => v.id === id) || allBaseVariablesRef.current.find(v => v.id === id);
                            return [found || { id, name: id, label: id, info: [] }];
                        });
                        setRowVars(newRowVars);
                        setColVars(newColVars);

                        // Fetch data for the first table
                        try {
                            const tableDataResult = await getCrossTabData.mutateAsync({
                                user: auth.user.userId,
                                tableid: firstTable.id
                            });

                            if (String(tableDataResult?.success) === '777' && tableDataResult.resultjson) {
                                const tData = tableDataResult.resultjson;

                                // Apply config from API result
                                if (tData.config) {
                                    // x_info -> 가로축 (Cols)
                                    if (tData.config.banner) {
                                        const xIds = tData.config.banner;
                                        let mappedCols = [];
                                        if (xIds.length === 1 && typeof xIds[0] === 'string' && (xIds[0].includes('*') || xIds[0].includes('+'))) {
                                            const groups = xIds[0].split('+');
                                            mappedCols = groups.map(g => {
                                                return g.split('*').filter(id => id.trim()).map(id => {
                                                    const trimmed = id.trim();
                                                    return loadedVariables.find(v => v.name === trimmed || v.id === trimmed) || allBaseVariablesRef.current.find(v => v.name === trimmed || v.id === trimmed) || { id: trimmed, name: trimmed };
                                                });
                                            });
                                        } else {
                                            mappedCols = xIds.map(item => {
                                                if (Array.isArray(item)) {
                                                    return item.map(id => loadedVariables.find(v => v.name === id || v.id === id) || allBaseVariablesRef.current.find(v => v.id === id) || { id, name: id });
                                                }
                                                return [loadedVariables.find(v => v.name === item || v.id === item) || allBaseVariablesRef.current.find(v => v.name === item || v.id === item) || { id: item, name: item }];
                                            });
                                        }
                                        setColVars(mappedCols.filter(g => g.length > 0));
                                    }
                                    // y_info -> 세로축 (Rows)
                                    if (tData.config.stub) {
                                        const yIds = tData.config.stub;
                                        let mappedRows = [];
                                        if (yIds.length === 1 && typeof yIds[0] === 'string' && (yIds[0].includes('*') || yIds[0].includes('+'))) {
                                            mappedRows = yIds[0].split(/[+*]/).filter(id => id.trim()).map(id => {
                                                const trimmed = id.trim();
                                                return loadedVariables.find(v => v.name === trimmed || v.id === trimmed) || allBaseVariablesRef.current.find(v => v.name === trimmed || v.id === trimmed) || { id: trimmed, name: trimmed };
                                            });
                                        } else {
                                            mappedRows = yIds.map(id => loadedVariables.find(v => v.name === id || v.id === id) || allBaseVariablesRef.current.find(v => v.id === id) || { id, name: id });
                                        }
                                        if (tData.config.row_eval_mode) {
                                            setTableMode('separated');
                                        } else if (yIds.length === 1 && typeof yIds[0] === 'string' && (yIds[0].includes('*') || yIds[0].includes('+'))) {
                                            setTableMode('separated');
                                        } else if (yIds.length > 1) {
                                            setTableMode('separated');
                                        }
                                        setRowVars(mappedRows);
                                    }
                                    // Filter Expression
                                    if (tData.config.filter_expression !== undefined) {
                                        setFilterExpression(tData.config.filter_expression);
                                    }
                                    // Weight Column
                                    if (tData.config.weight_col !== undefined) {
                                        setSelectedWeight(tData.config.weight_col || "없음");
                                    }
                                    // Set Table Name from result if available
                                    if (tData.name) {
                                        setTableName(tData.name);
                                    }
                                }

                                setResultDataList(processResults(tData));
                                isConfigLoadingRef.current = true;

                                // Auto-run analysis for the first table
                                try {
                                    const config = tData.config || {};
                                    const xInfo = config.banner || [];
                                    const yInfo = config.stub || [];
                                    const weightCol = config.weight_col || "";
                                    const filterExpr = config.filter_expression || "";

                                    const variablesMap = {};
                                    const extractRawVars = (arr) => {
                                        if (!Array.isArray(arr)) return;
                                        arr.forEach(str => {
                                            if (typeof str !== 'string') return;
                                            const parts = str.split(/[+*]/).map(s => s.trim()).filter(Boolean);
                                            parts.forEach(part => {
                                                const found = loadedVariables.find(v => v.id === part || v.name === part || v.label === part) || allBaseVariablesRef.current.find(v => v.id === part || v.name === part || v.label === part);
                                                if (found) {
                                                    variablesMap[part] = found;
                                                } else {
                                                    variablesMap[part] = { id: part, name: part, label: part, type: "categorical", info: [] };
                                                }
                                            });
                                        });
                                    };

                                    extractRawVars(xInfo);
                                    extractRawVars(yInfo);

                                    if (weightCol && weightCol !== "없음" && weightCol !== "") {
                                        const weightVar = loadedVariables.find(v => v.id === weightCol || v.name === weightCol) || allBaseVariablesRef.current.find(v => v.id === weightCol || v.name === weightCol);
                                        if (weightVar) {
                                            variablesMap[weightVar.id || weightVar.name] = weightVar;
                                        }
                                    }

                                    // Include variables used in filter expression
                                    if (filterExpr) {
                                        loadedVariables.forEach(v => {
                                            const vId = v.id || v.name;
                                            if (new RegExp('\\b' + vId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(filterExpr)) {
                                                variablesMap[vId] = v;
                                            }
                                        });
                                    }

                                    const payload = {
                                        user: auth.user.userId,
                                        pageid: currentPid,
                                        variables: variablesMap,
                                        weight_col: weightCol === "없음" ? "" : weightCol,
                                        filter_expression: filterExpr,
                                        include_stats: ALL_STATS,
                                        row_eval_mode: 'split', // tData.config?.row_eval_mode ? tData.config.row_eval_mode : (tableMode === 'separated' ? 'split' : 'combined'),
                                        display_policy: localDisplayPolicy || {},
                                        zero_base_columns: localDisplayPolicy?.hide_zero_base_columns ?? false,
                                        zero_banners: localDisplayPolicy?.hide_zero_base_columns ?? false,
                                        zero_stubs: localDisplayPolicy?.hide_zero_stubs ?? false,
                                        table: {
                                            id: firstTable.id,
                                            name: firstTable.name || tData.name || "Untitled Table",
                                            banner: xInfo,
                                            variable_overrides: variableOverrides,
                                            stub: yInfo
                                        }
                                    };

                                    const evalResult = await evaluateTable.mutateAsync(payload);

                                    if (String(evalResult?.success) === '777' && evalResult.resultjson) {
                                        setStyleCss(evalResult.resultjson.style_css || '');
                                        setResultDataList(evalResult.resultjson.tables || []);
                                    }
                                } catch (autoEvalError) {
                                    console.error("Initial auto evaluation failed:", autoEvalError);
                                }
                            }
                        } catch (err) {
                            console.error("Failed to fetch initial table data:", err);
                        }
                    } else {
                        setTables([]);
                        setSelectedTableId(null);
                        setTableName('');
                        setRowVars([]);
                        setColVars([]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch cross tab list:", error);
            } finally {
                loadingSpinner.hide();
            }
        };

        fetchData();

        const handlePageSelectedEvent = () => fetchData();
        window.addEventListener("pageSelected", handlePageSelectedEvent);

        return () => {
            window.removeEventListener("pageSelected", handlePageSelectedEvent);
            if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
        };
    }, [auth?.user?.userId]);

    // Preview Data Calculation
    const previewData = useMemo(() => {
        if (rowVars.length === 0 && colVars.length === 0) return null;

        const getGroupDefinitions = (group) => {
            if (group.length === 0) return [];

            return group.map(v => {
                const variable = variables.find(existing => existing.id === v.id || existing.name === v.id || existing.name === v.name) ||
                    allBaseVariablesRef.current.find(existing => existing.id === v.id || existing.name === v.id || existing.name === v.name);
                let labels = [];
                if (!variable || !variable.info) {
                    labels = [v.id || v.name];
                } else {
                    labels = variable.info
                        .filter(i => i.type !== 'config')
                        .map(i => i.label);

                    if (labels.length === 0) labels = [v.id || v.name];
                }
                return { name: v.id || v.name, labels: labels.map(String) };
            });
        };

        const colGroupsDefs = colVars.filter(g => g.length > 0).length > 0
            ? colVars.filter(g => g.length > 0).map(g => getGroupDefinitions(g))
            : [[{ name: '', labels: [''] }]];

        const maxColLevels = Math.max(...colGroupsDefs.map(g => g.length));

        const colHeaderRows = [];
        for (let i = 0; i < maxColLevels + 1; i++) {
            colHeaderRows.push([]);
        }

        let totalDataCols = 0;

        colGroupsDefs.forEach(groupDefs => {
            const groupName = groupDefs.map(d => d.name).join(' * ');
            const groupTotalCols = groupDefs.reduce((acc, curr) => acc * curr.labels.length, 1);
            totalDataCols += groupTotalCols;

            // Row 0: Group Name
            colHeaderRows[0].push({
                label: groupName,
                colspan: groupTotalCols,
                rowspan: 1,
                isGroupHeader: true
            });

            // For each level in maxColLevels
            for (let level = 0; level < maxColLevels; level++) {
                if (level < groupDefs.length) {
                    const def = groupDefs[level];
                    const numRepeats = groupDefs.slice(0, level).reduce((a, c) => a * c.labels.length, 1);
                    const colspan = groupDefs.slice(level + 1).reduce((a, c) => a * c.labels.length, 1);

                    for (let r = 0; r < numRepeats; r++) {
                        for (let lbl of def.labels) {
                            const isLastLevelForGroup = (level === groupDefs.length - 1);
                            colHeaderRows[level + 1].push({
                                label: lbl,
                                colspan: colspan,
                                rowspan: isLastLevelForGroup ? (maxColLevels - level) : 1,
                                isColHeader: true
                            });
                        }
                    }
                }
            }
        });

        // 표분리 모드에서는 각 행변수를 독립적인 배너처럼 표현
        // (실제 결과도 row_eval_mode=split 이라 각 행변수 별로 별도 표가 생김)
        let rowGroups;
        if (tableMode === 'separated' && rowVars.length > 1) {
            // 각 개별 변수를 배너 안에 넣어서 분리된 것처럼 보이게
            rowGroups = rowVars.map(v => {
                const variable = variables.find(existing => existing.id === v.id || existing.name === v.id || existing.name === v.name) ||
                    allBaseVariablesRef.current.find(existing => existing.id === v.id || existing.name === v.id || existing.name === v.name);
                let labels = [];
                if (!variable || !variable.info) {
                    labels = [v.id || v.name];
                } else {
                    labels = variable.info.filter(i => i.type !== 'config').map(i => i.label);
                    if (labels.length === 0) labels = [v.id || v.name];
                }
                return { name: v.id || v.name, labels: labels.map(String) };
            });
        } else {
            rowGroups = rowVars.length > 0 ? getGroupDefinitions(rowVars) : [{ name: '', labels: [''] }];
        }

        return {
            colHeaderRows,
            rowGroups,
            totalDataCols,
            maxColLevels,
            maxRowLevels: 2,
            isSeparated: tableMode === 'separated'
        };
    }, [rowVars, colVars, variables, tableMode]);

    useEffect(() => {
        if (isConfigOpen) {
            setCollapsedIndices(new Set());
        }
    }, [isConfigOpen]);

    // Reset horizontal scroll position when colVars changes
    useEffect(() => {
        const colDropZone = document.querySelector('.col-drop-zone');
        if (colDropZone) {
            colDropZone.scrollLeft = 0;
        }
    }, [colVars]);






    // Filter tables based on search term
    const filteredTables = tables.filter(table =>
        table.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
    );

    // Filter variables based on search term & UI rules (recoded or base containing 'ADD')
    const filteredVariables = variables.filter(variable => {
        if (!variable) return false;
        const isTarget = variable.isRecoded || (variable.isBase && ((variable.id || '').includes('ADD') || (variable.name || '').includes('ADD')));
        if (!isTarget) return false;
        return (
            variable?.name?.toLowerCase().includes(variableSearchTerm.toLowerCase()) ||
            variable?.label?.toLowerCase().includes(variableSearchTerm.toLowerCase())
        );
    });

    // Result Data List State
    const [resultDataList, setResultDataList] = useState([]);

    // Utilities defined outside


    const handleTableSelect = async (item) => {
        setSelectedTableId(item.id);
        setTableName(item.name || "");
        setIsConfigOpen(false);
        setResultDataList([]);
        setFilterExpression('');
        setSelectedWeight("없음");
        loadingSpinner.show();


        // Load table configuration
        const newRowVars = (item.row || []).map(id => {
            const found = variables.find(v => v.id === id);
            return found || { id, name: id, label: id, info: [] };
        });
        const newColVars = (item.col || []).map(id => {
            if (Array.isArray(id)) {
                return id.map(subId => {
                    const found = variables.find(v => v.id === subId);
                    return found || { id: subId, name: subId, label: subId, info: [] };
                });
            }
            const found = variables.find(v => v.id === id);
            return [found || { id, name: id, label: id, info: [] }];
        });
        setRowVars(newRowVars);
        setColVars(newColVars);

        // Fetch Table Data
        if (auth?.user?.userId) {
            try {
                const result = await getCrossTabData.mutateAsync({
                    user: auth.user.userId,
                    tableid: item.id
                });

                if (String(result?.success) === '777' && result.resultjson) {
                    const data = result.resultjson;
                    isConfigLoadingRef.current = true;

                    // Apply config from API result
                    if (data.config) {
                        // x_info -> 가로축 (Cols)
                        if (data.config.banner) {
                            const xIds = data.config.banner;
                            let mappedCols = [];
                            if (xIds.length === 1 && typeof xIds[0] === 'string' && (xIds[0].includes('*') || xIds[0].includes('+'))) {
                                const groups = xIds[0].split('+');
                                mappedCols = groups.map(g => {
                                    return g.split('*').filter(id => id.trim()).map(id => {
                                        const trimmed = id.trim();
                                        return variables.find(v => v.name === trimmed || v.id === trimmed) || { id: trimmed, name: trimmed };
                                    });
                                });
                            } else {
                                mappedCols = xIds.map(item => {
                                    if (Array.isArray(item)) {
                                        return item.map(id => variables.find(v => v.name === id || v.id === id) || { id, name: id });
                                    }
                                    return [variables.find(v => v.name === item || v.id === item) || { id: item, name: item }];
                                });
                            }
                            setColVars(mappedCols.filter(g => g.length > 0));
                        }
                        // y_info -> 세로축 (Rows)
                        if (data.config.stub) {
                            const yIds = data.config.stub;
                            let mappedRows = [];
                            if (yIds.length === 1 && typeof yIds[0] === 'string' && (yIds[0].includes('*') || yIds[0].includes('+'))) {
                                mappedRows = yIds[0].split(/[+*]/).filter(id => id.trim()).map(id => {
                                    const trimmed = id.trim();
                                    return variables.find(v => v.name === trimmed || v.id === trimmed) || { id: trimmed, name: trimmed };
                                });
                            } else {
                                mappedRows = yIds.map(id => variables.find(v => v.name === id || v.id === id) || { id, name: id });
                            }
                            if (data.config.row_eval_mode) {
                                setTableMode('separated');
                                // setTableMode(data.config.row_eval_mode === 'split' ? 'separated' : 'merged');
                            } else if (yIds.length === 1 && typeof yIds[0] === 'string' && (yIds[0].includes('*') || yIds[0].includes('+'))) {
                                setTableMode('separated');
                                // setTableMode(yIds[0].includes('+') ? 'merged' : 'separated');
                            } else if (yIds.length > 1) {
                                setTableMode('separated');
                            }
                            setRowVars(mappedRows);
                        }
                        // Filter Expression
                        if (data.config.filter_expression !== undefined) {
                            setFilterExpression(data.config.filter_expression);
                        }
                        if (data.config.filter_info !== undefined) {
                            setFilterInfo(data.config.filter_info);
                        } else {
                            setFilterInfo(null);
                        }
                        // Weight Column
                        if (data.config.weight_col !== undefined) {
                            setSelectedWeight(data.config.weight_col || "없음");
                        }
                    }

                    setResultDataList(processResults(data));

                    try {
                        const config = data.config || {};
                        if (config.variable_overrides) setVariableOverrides(config.variable_overrides);
                        const xInfo = config.banner || [];
                        const yInfo = config.stub || [];
                        const weightCol = config.weight_col || "";
                        const filterExpr = config.filter_expression || "";
                        const xIds = xInfo;
                        const yIds = yInfo;

                        const variablesMap = {};
                        const extractRawVars = (arr) => {
                            if (!Array.isArray(arr)) return;
                            arr.forEach(str => {
                                if (typeof str !== 'string') return;
                                const parts = str.split(/[+*]/).map(s => s.trim()).filter(Boolean);
                                parts.forEach(part => {
                                    const found = variables.find(v => v.id === part || v.name === part || v.label === part);
                                    if (found) {
                                        variablesMap[part] = found;
                                    } else {
                                        variablesMap[part] = { id: part, name: part, label: part, type: "categorical", info: [] };
                                    }
                                });
                            });
                        };

                        extractRawVars(xIds);
                        extractRawVars(yIds);

                        let weightId = "";
                        if (weightCol && weightCol !== "없음") {
                            // Try to find by ID first, then name
                            const weightVar = variables.find(v => v.id === weightCol || v.name === weightCol || v.label === weightCol);
                            if (weightVar) {
                                const wId = weightVar.id || weightVar.name;
                                variablesMap[wId] = weightVar;
                                weightId = wId;
                            } else {
                                // If not found in variables list, maybe weightCol IS the id/name?
                                // We should try our best.
                                weightId = weightCol;
                            }
                        }


                        let runPayload = {
                            user: auth.user.userId,
                            pageid: currentPageId,
                            variables: variablesMap,
                            weight_col: weightId,
                            filter_expression: filterExpr,
                            include_stats: ALL_STATS,
                            row_eval_mode: 'split', // data.config?.row_eval_mode ? data.config.row_eval_mode : (tableMode === 'separated' ? 'split' : 'combined')
                            display_policy: displayPolicy || {},
                            zero_base_columns: displayPolicy?.hide_zero_base_columns ?? false,
                            zero_banners: displayPolicy?.hide_zero_base_columns ?? false,
                            zero_stubs: displayPolicy?.hide_zero_stubs ?? false,
                            // sort: { group_by: "label2_label3" }
                        };

                        runPayload.table = {
                            id: item.id,
                            name: item.name || "Untitled Table",
                            banner: xInfo,
                            stub: yInfo
                        };

                        const evalResult = await evaluateTable.mutateAsync(runPayload);

                        if (String(evalResult?.success) === '777' && evalResult.resultjson) {
                            setStyleCss(evalResult.resultjson.style_css || '');
                            setResultDataList(evalResult.resultjson.tables || []);
                        }

                    } catch (evalError) {
                        console.error("Auto evaluation failed:", evalError);
                    }
                } else {
                    // Fallback or error handling
                    console.log("Failed to load table details or empty result");
                }
            } catch (error) {
                console.error("Error fetching table data:", error);
                setToast({ show: true, message: "테이블 데이터 조회 실패" });
            } finally {
                loadingSpinner.hide();
            }
        }
    };

    const handleAddNewTable = () => {
        let maxNewIndex = 0;
        let hasBase = false;
        tables.forEach(t => {
            if (t.name === '새 테이블') hasBase = true;
            const match = t.name.match(/^새 테이블 (\d+)$/);
            if (match) {
                const idx = parseInt(match[1], 10);
                if (idx > maxNewIndex) maxNewIndex = idx;
            }
        });

        let newName = '새 테이블';
        if (hasBase) {
            newName = `새 테이블 ${maxNewIndex > 0 ? maxNewIndex + 1 : 1}`;
        }

        handleCreateTable(newName);
    };

    const handleCreateTable = (name) => {
        // Generate a random ID
        const newId = `tbl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const newTable = {
            id: newId,
            name: name,
            row: [],
            col: []
        };
        // Add checks for new table handling
        newTable.isNew = true;

        setTables([...tables, newTable]);
        setSelectedTableId(newTable.id);
        setTableName(name); // Set current table name
        setTableSearchTerm('');

        // Reset current config for new table and open config
        setRowVars([]);
        setColVars([]);
        setResultDataList([]);
        setFilterExpression('');
        setSelectedWeight("없음");
        setIsConfigOpen(true);
        isConfigLoadingRef.current = true;

        // 다음 렌더 후 사이드바 목록을 맨 아래로 스크롤
        setTimeout(() => {
            if (tableListRef.current) {
                tableListRef.current.scrollTop = tableListRef.current.scrollHeight;
            }
        }, 0);
    };

    const handleVariableClick = (e, varId) => {
        // Shift key multi-selection
        if (e.shiftKey && selectedVarIds.length > 0) {
            const lastId = selectedVarIds[selectedVarIds.length - 1];
            const allIds = filteredVariables.map(v => v.id);
            const startIdx = allIds.indexOf(lastId);
            const endIdx = allIds.indexOf(varId);
            if (startIdx > -1 && endIdx > -1) {
                const range = allIds.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
                setSelectedVarIds(prev => Array.from(new Set([...prev, ...range])));
                return;
            }
        }

        // Multi-selection (Add/Remove)
        setSelectedVarIds(prev =>
            prev.includes(varId) ? prev.filter(id => id !== varId) : [...prev, varId]
        );
    };

    const handleDragStart = (e, dragData) => {
        // dragData가 드롭존 내부 아이템인지 확인 (ROW_ITEM, COL_ITEM, COL_GROUP만 내부 이동용)
        const isDragZoneItem = ['ROW_ITEM', 'COL_ITEM', 'COL_GROUP'].includes(dragData.type);

        let payload;
        if (isDragZoneItem) {
            payload = dragData;
        } else {
            // 변수 목록 드래그
            if (selectedVarIds.includes(dragData.id)) {
                // 선택된 여러 개 드래그
                const items = selectedVarIds.map(id => variables.find(v => v.id === id)).filter(Boolean);
                payload = { type: 'NEW', items };

                // UI: 드래그할 때 여러 개가 선택되었음을 보여주기 위한 고스트 엘리먼트 생성
                const dragGhost = document.createElement('div');
                dragGhost.style.padding = '8px 16px';
                dragGhost.style.background = '#3b82f6';
                dragGhost.style.color = 'white';
                dragGhost.style.borderRadius = '20px';
                dragGhost.style.fontSize = '14px';
                dragGhost.style.fontWeight = 'bold';
                dragGhost.style.position = 'absolute';
                dragGhost.style.top = '-1000px';
                dragGhost.innerText = `${items.length}개 문항 이동 중`;
                document.body.appendChild(dragGhost);

                e.dataTransfer.setDragImage(dragGhost, 0, 0);

                // 드래그 종료 시 엘리먼트 삭제
                setTimeout(() => {
                    document.body.removeChild(dragGhost);
                }, 0);
            } else {
                // 단일 드래그
                payload = { type: 'NEW', item: dragData };
            }
        }

        draggedItemRef.current = payload;
        setDraggedItem(payload);
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetType, targetGroupIndex = null, targetItemIndex = null) => {
        e.preventDefault();
        e.stopPropagation();
        // ref를 우선 사용 (state의 stale closure 문제 방지)
        const currentDraggedItem = draggedItemRef.current || draggedItem;
        if (!currentDraggedItem) return;

        // 다중 항목 드롭 처리
        if (currentDraggedItem.type === 'NEW' && currentDraggedItem.items) {
            const items = currentDraggedItem.items;
            if (targetType === 'row' || targetType === 'row_item') {
                const newRowVars = [...rowVars];
                let skipped = false;
                let invalidSkipped = false;
                items.forEach(item => {
                    const fullVar = variables.find(v => v.id === item.id) || item;
                    if (!isValidRowVar(fullVar)) {
                        invalidSkipped = true;
                        return;
                    }
                    if (newRowVars.length < 10) {
                        if (!newRowVars.find(v => v.id === item.id)) {
                            const newItem = { id: item.id, name: item.name, label: item.label, info: item.info || [], isBase: fullVar.isBase, isRecoded: fullVar.isRecoded };
                            if (targetType === 'row_item') {
                                newRowVars.splice(targetItemIndex, 0, newItem);
                            } else {
                                newRowVars.push(newItem);
                            }
                        }
                    } else {
                        skipped = true;
                    }
                });
                setRowVars(newRowVars);
                if (invalidSkipped) {
                    modal.showAlert('알림', '세로축에는 문항추가변수와 stub 변수만 추가할 수 있습니다.');
                } else if (skipped) {
                    modal.showAlert('알림', `최대 10개까지만 추가할 수 있습니다.\n(초과된 문항은 제외되었습니다)`);
                }
            } else if (targetType === 'col' || targetType === 'new_col_group' || targetType === 'col_item') {
                const newColVars = [...colVars];
                let skipped = false;
                let invalidSkipped = false;
                items.forEach(item => {
                    const fullVar = variables.find(v => v.id === item.id) || item;
                    if (!isValidColVar(fullVar)) {
                        invalidSkipped = true;
                        return;
                    }
                    if (newColVars.length < 10) {
                        let targetId = item.id;
                        let targetName = item.name;
                        let targetLabel = item.label;
                        let targetInfo = item.info || [];

                        if (String(item.id).includes('_stub')) {
                            const cleanId = String(item.id).replace(/_stub\+?$/, '');
                            const origVar = allBaseVariablesRef.current.find(v => v.id === cleanId || v.name === cleanId) || variables.find(v => v.id === cleanId || v.name === cleanId);
                            if (origVar) {
                                targetId = origVar.id;
                                targetName = origVar.name;
                                targetLabel = origVar.label || origVar.name;
                                targetInfo = origVar.info || [];
                            } else {
                                targetId = cleanId;
                                targetName = cleanId;
                                targetLabel = cleanId;
                            }
                        }

                        const newItem = { id: targetId, name: targetName, label: targetLabel, info: targetInfo, isBase: true, isRecoded: false };
                        newColVars.push([newItem]);
                    } else {
                        skipped = true;
                    }
                });
                setColVars(newColVars);
                if (invalidSkipped) {
                    modal.showAlert('알림', '가로축에는 문항추가변수와 원본 변수명이 존재하는 stub 변수만 추가할 수 있습니다.');
                } else if (skipped) {
                    modal.showAlert('알림', `최대 10개까지만 추가할 수 있습니다.\n(초과된 문항은 제외되었습니다)`);
                }
            }
            setSelectedVarIds([]);
            setDraggedItem(null);
            draggedItemRef.current = null;
            return;
        }

        const dragType = currentDraggedItem.type || 'NEW';
        const item = currentDraggedItem.item || (dragType === 'NEW' ? currentDraggedItem : null);
        const srcGroupIndex = currentDraggedItem.groupIndex;
        const srcItemIndex = currentDraggedItem.itemIndex;

        const fullVariable = item ? (variables.find(v => v.id === item.id) || item) : null;
        if (!fullVariable) {
            setDraggedItem(null);
            draggedItemRef.current = null;
            return;
        }

        let newItem = {
            id: fullVariable.id,
            name: fullVariable.name,
            label: fullVariable.label || fullVariable.name,
            info: fullVariable.info || [],
            isBase: fullVariable.isBase,
            isRecoded: fullVariable.isRecoded
        };

        if (targetType === 'col' || targetType === 'col_item' || targetType === 'new_col_group') {
            if (String(fullVariable.id).includes('_stub')) {
                const cleanId = String(fullVariable.id).replace(/_stub\+?$/, '');
                const origVar = allBaseVariablesRef.current.find(v => v.id === cleanId || v.name === cleanId) || variables.find(v => v.id === cleanId || v.name === cleanId);
                if (origVar) {
                    newItem = {
                        id: origVar.id,
                        name: origVar.name,
                        label: origVar.label || origVar.name,
                        info: origVar.info || [],
                        isBase: true,
                        isRecoded: false
                    };
                } else {
                    newItem = {
                        id: cleanId,
                        name: cleanId,
                        label: cleanId,
                        info: [],
                        isBase: true,
                        isRecoded: false
                    };
                }
            }
        }

        if (targetType === 'row' || targetType === 'row_item') {
            if (!isValidRowVar(fullVariable)) {
                modal.showAlert('알림', '세로축에는 문항추가변수와 stub 변수만 추가할 수 있습니다.');
                setDraggedItem(null);
                draggedItemRef.current = null;
                return;
            }

            const newRowVars = [...rowVars];

            if (dragType === 'ROW_ITEM') {
                const [moved] = newRowVars.splice(srcItemIndex, 1);
                if (targetType === 'row_item') {
                    newRowVars.splice(targetItemIndex, 0, moved);
                } else {
                    newRowVars.push(moved);
                }
                setRowVars(newRowVars);
            } else if (newItem) {
                if (dragType === 'COL_ITEM') {
                    removeVar(newItem.id, 'col', srcGroupIndex);
                }
                if (rowVars.length >= 10 && !rowVars.find(v => v.id === newItem.id)) {
                    modal.showAlert('알림', '최대 10개까지만 추가할 수 있습니다.');
                } else if (!rowVars.find(v => v.id === newItem.id)) {
                    if (targetType === 'row_item') {
                        newRowVars.splice(targetItemIndex, 0, newItem);
                    } else {
                        newRowVars.push(newItem);
                    }
                    setRowVars(newRowVars);
                }
            }
        } else if (targetType === 'col' || targetType === 'col_item' || targetType === 'new_col_group') {
            if (dragType !== 'COL_GROUP') {
                if (!isValidColVar(fullVariable)) {
                    modal.showAlert('알림', '가로축에는 문항추가변수와 원본 변수명이 존재하는 stub 변수만 추가할 수 있습니다.');
                    setDraggedItem(null);
                    draggedItemRef.current = null;
                    return;
                }
            }
            const newColVars = [...colVars];

            if (dragType === 'COL_GROUP') {
                if (targetType === 'col' || targetType === 'col_item') {
                    if (srcGroupIndex !== targetGroupIndex) {
                        const [movedGroup] = newColVars.splice(srcGroupIndex, 1);
                        newColVars.splice(targetGroupIndex, 0, movedGroup);
                        setColVars(newColVars);
                    }
                } else if (targetType === 'new_col_group') {
                    const [movedGroup] = newColVars.splice(srcGroupIndex, 1);
                    newColVars.push(movedGroup);
                    setColVars(newColVars);
                }
                setDraggedItem(null);
                draggedItemRef.current = null;
                return;
            }

            if (!newItem) {
                setDraggedItem(null);
                draggedItemRef.current = null;
                return;
            }

            if (dragType === 'COL_ITEM') {
                if (targetType === 'col' || targetType === 'col_item') {
                    if (srcGroupIndex === targetGroupIndex) {
                        const [moved] = newColVars[srcGroupIndex].splice(srcItemIndex, 1);
                        if (targetType === 'col_item') {
                            newColVars[targetGroupIndex].splice(targetItemIndex, 0, moved);
                        } else {
                            newColVars[targetGroupIndex].push(moved);
                        }
                        setColVars(newColVars);
                    } else {
                        if (newColVars[targetGroupIndex].length < 3 && !newColVars[targetGroupIndex].find(v => v.id === newItem.id)) {
                            newColVars[srcGroupIndex].splice(srcItemIndex, 1);
                            if (newColVars[srcGroupIndex].length === 0) {
                                newColVars.splice(srcGroupIndex, 1);
                                const actualTargetIndex = srcGroupIndex < targetGroupIndex ? targetGroupIndex - 1 : targetGroupIndex;
                                if (targetType === 'col_item') {
                                    newColVars[actualTargetIndex].splice(targetItemIndex, 0, newItem);
                                } else {
                                    newColVars[actualTargetIndex].push(newItem);
                                }
                            } else {
                                if (targetType === 'col_item') {
                                    newColVars[targetGroupIndex].splice(targetItemIndex, 0, newItem);
                                } else {
                                    newColVars[targetGroupIndex].push(newItem);
                                }
                            }
                            setColVars(newColVars);
                        }
                    }
                } else if (targetType === 'new_col_group') {
                    if (newColVars.length < 10) {
                        newColVars[srcGroupIndex].splice(srcItemIndex, 1);
                        if (newColVars[srcGroupIndex].length === 0) {
                            newColVars.splice(srcGroupIndex, 1);
                        }
                        newColVars.push([newItem]);
                        setColVars(newColVars);
                    } else {
                        modal.showAlert('알림', '가로축 그룹은 최대 10개까지만 생성할 수 있습니다.');
                    }
                }
            } else { // NEW or ROW_ITEM
                if (targetType === 'col' || targetType === 'col_item') {
                    if (newColVars[targetGroupIndex].length < 3 && !newColVars[targetGroupIndex].find(v => v.id === newItem.id)) {
                        if (dragType === 'ROW_ITEM') {
                            setRowVars(rowVars.filter(v => v.id !== newItem.id));
                        }
                        if (targetType === 'col_item') {
                            newColVars[targetGroupIndex].splice(targetItemIndex, 0, newItem);
                        } else {
                            newColVars[targetGroupIndex].push(newItem);
                        }
                        setColVars(newColVars);
                    }
                } else if (targetType === 'new_col_group') {
                    if (newColVars.length < 10) {
                        if (dragType === 'ROW_ITEM') {
                            setRowVars(rowVars.filter(v => v.id !== newItem.id));
                        }
                        newColVars.push([newItem]);
                        setColVars(newColVars);
                    } else {
                        modal.showAlert('알림', '가로축 그룹은 최대 10개까지만 생성할 수 있습니다.');
                    }
                }
            }
        }
        draggedItemRef.current = null;
        setDraggedItem(null);
    };

    const removeVar = (id, type, groupIndex = null) => {
        if (type === 'row') {
            setRowVars(rowVars.filter(v => v.id !== id));
        } else {
            if (groupIndex !== null) {
                const newColVars = [...colVars];
                newColVars[groupIndex] = newColVars[groupIndex].filter(v => v.id !== id);
                if (newColVars[groupIndex].length === 0) {
                    newColVars.splice(groupIndex, 1);
                }
                setColVars(newColVars);
            }
        }
    };

    const handleSaveTable = async () => {
        if (!auth?.user?.userId) {
            modal.showAlert("알림", "로그인이 필요합니다.");
            return;
        }

        if (rowVars.length === 0) {
            modal.showAlert('알림', '세로축(행) 문항을 최소 하나 이상 선택해주세요.');
            return;
        }

        try {
            const currentTable = tables.find(t => t.id === selectedTableId);
            const isNewTable = currentTable?.isNew;

            const payload = {
                user: auth.user.userId,
                table_id: selectedTableId,
                pageid: currentPageId,
                name: tableName || "Untitled Table",
                config: {
                    banner: colVars.filter(g => g.length > 0).length > 0 ? [colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*')).join('+')] : [],
                    stub: rowVars.length > 0 ? (tableMode === 'separated' ? rowVars.map(v => v.id || v.name) : [rowVars.map(v => v.id || v.name).join('+')]) : [],
                    filter_expression: filterExpression,
                    filter_info: filterInfo,
                    weight_col: selectedWeight === "없음" ? "" : selectedWeight,
                    row_eval_mode: tableMode === 'separated' ? 'split' : 'combined',
                    variable_overrides: variableOverrides
                }
            };

            const result = await saveCrossTable.mutateAsync(payload);
            if (String(result?.success) === '777') {
                modal.showAlert('성공', '저장되었습니다.');
                setIsConfigOpen(false); // Close config panel after save

                // Update table list with new name and isNew status
                setTables(tables.map(t =>
                    t.id === selectedTableId ? { ...t, name: tableName || "Untitled Table", isNew: false, isDirty: false } : t
                ));
                isConfigLoadingRef.current = true;

                // Refresh data after save
                try {
                    const refreshedData = await getCrossTabData.mutateAsync({
                        user: auth.user.userId,
                        tableid: selectedTableId
                    });

                    if (String(refreshedData?.success) === '777' && refreshedData.resultjson) {
                        setResultDataList(processResults(refreshedData.resultjson));
                    }
                } catch (refreshError) {
                    console.error("Data refresh error:", refreshError);
                }
            } else {
                modal.showAlert('실패', '저장 실패');
            }
        } catch (error) {
            console.error("Save error:", error);
            modal.showAlert('오류', '저장 중 오류가 발생했습니다.');
        }
    };

    const handleSaveAndRun = async () => {
        if (!auth?.user?.userId) {
            modal.showAlert("알림", "로그인이 필요합니다.");
            return;
        }

        if (rowVars.length === 0) {
            modal.showAlert('알림', '세로축(행) 문항을 최소 하나 이상 선택해주세요.');
            return;
        }

        try {
            // Save Table
            const currentTable = tables.find(t => t.id === selectedTableId);
            const isNewTable = currentTable?.isNew;

            let weightId = "";
            if (selectedWeight && selectedWeight !== "없음" && selectedWeight !== "") {
                const weightVar = variables.find(v => v.name === selectedWeight);
                if (weightVar) {
                    weightId = weightVar.id;
                }
            }

            const savePayload = {
                user: auth.user.userId,
                table_id: selectedTableId,
                pageid: currentPageId,
                name: tableName || "Untitled Table",
                config: {
                    banner: colVars.filter(g => g.length > 0).length > 0 ? [colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*')).join('+')] : [],
                    stub: rowVars.length > 0 ? (tableMode === 'separated' ? rowVars.map(v => v.id || v.name) : [rowVars.map(v => v.id || v.name).join('+')]) : [],
                    filter_expression: filterExpression,
                    filter_info: filterInfo,
                    weight_col: selectedWeight === "없음" ? "" : selectedWeight,
                    row_eval_mode: tableMode === 'separated' ? 'split' : 'combined',
                    variable_overrides: variableOverrides
                }
            };

            loadingSpinner.show();

            const saveResult = await saveCrossTable.mutateAsync(savePayload);

            if (String(saveResult?.success) === '777') {
                // Update table list with new name and isNew status
                setTables(tables.map(t =>
                    t.id === selectedTableId ? { ...t, name: tableName || "Untitled Table", isNew: false, isDirty: false } : t
                ));
                isConfigLoadingRef.current = true;

                // Run Analysis
                const variablesMap = {};

                // Helper to extract raw variables from interaction strings
                const extractRawVars = (arr) => {
                    if (!Array.isArray(arr)) return;
                    arr.forEach(str => {
                        if (typeof str !== 'string') return;
                        const parts = str.split(/[+*]/).map(s => s.trim()).filter(Boolean);
                        parts.forEach(part => {
                            const found = variables.find(v => v.id === part || v.name === part || v.label === part);
                            if (found) {
                                variablesMap[part] = found;
                            } else if (part) {
                                variablesMap[part] = { id: part, name: part, label: part, type: "categorical", info: [] };
                            }
                        });
                    });
                };

                // Populate variablesMap
                [...rowVars, ...colVars.flat()].forEach(v => {
                    const varId = v.id || v.name;
                    if (v && varId) {
                        variablesMap[varId] = v;
                        if (varId.includes('*') || varId.includes('+')) {
                            extractRawVars([varId]);
                        }
                    }
                });

                // Ensure variables from columns are also thoroughly extracted
                colVars.forEach(group => {
                    group.forEach(v => {
                        const id = v.id || v.name;
                        if (id.includes('*') || id.includes('+')) {
                            extractRawVars([id]);
                        }
                    });
                });

                if (weightId) {
                    const weightVar = variables.find(v => (v.id || v.name) === weightId || v.label === weightId);
                    if (weightVar) {
                        variablesMap[weightId] = weightVar;
                    }
                }

                // Include variables used in filter expression
                if (filterExpression) {
                    variables.forEach(v => {
                        const vId = v.id || v.name;
                        if (new RegExp('\\b' + vId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(filterExpression)) {
                            variablesMap[vId] = v;
                        }
                    });
                }

                const xInfo = colVars.filter(g => g.length > 0).length > 0 ? [colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*')).join('+')] : [];
                const baseTableName = tableName || "Untitled Table";


                let runPayload = {
                    user: auth.user.userId,
                    pageid: currentPageId,
                    variables: variablesMap,
                    weight_col: weightId,
                    filter_expression: filterExpression,
                    include_stats: ALL_STATS,
                    row_eval_mode: 'split', // tableMode === 'separated' ? 'split' : 'combined'
                    display_policy: displayPolicy || {},
                    zero_base_columns: displayPolicy?.hide_zero_base_columns ?? false,
                    zero_banners: displayPolicy?.hide_zero_base_columns ?? false,
                    zero_stubs: displayPolicy?.hide_zero_stubs ?? false,
                    // sort: { group_by: "label2_label3" }
                };

                runPayload.table = {
                    id: selectedTableId || 'T1',
                    name: baseTableName,
                    banner: xInfo,
                    stub: rowVars.map(v => v.id || v.name)
                };

                const evalResult = await evaluateTable.mutateAsync(runPayload);

                if (String(evalResult?.success) === '777' && evalResult.resultjson) {
                    setStyleCss(evalResult.resultjson.style_css || '');
                    setResultDataList(evalResult.resultjson.tables || []);

                    // Success - Close config when alert is confirmed
                    modal.showAlert("알림", "저장 및 실행이 완료되었습니다.", null, () => {
                        setIsConfigOpen(false);
                    });

                } else {
                    modal.showAlert('알림', '저장은 되었으나 분석에 실패했습니다.');
                }

            } else {
                modal.showAlert('실패', '저장 실패');
            }

        } catch (error) {
            console.error("Save & Run error:", error);
            modal.showAlert('오류', '오류가 발생했습니다.');
        } finally {
            loadingSpinner.hide();
        }
    };

    const handleRun = async (overrideFilter, overrideDisplayPolicy) => {
        if (!auth?.user?.userId) {
            modal.showAlert("알림", "로그인이 필요합니다.");
            return;
        }

        if (rowVars.length === 0) {
            modal.showAlert('알림', '세로축(행) 문항을 최소 하나 이상 선택해주세요.');
            return;
        }

        // 선택된 변수들만 필터링
        const selectedVarNames = new Set();
        rowVars.forEach(v => selectedVarNames.add(v.name));
        colVars.flat().forEach(v => selectedVarNames.add(v.name));

        if (selectedWeight && selectedWeight !== "없음") {
            selectedVarNames.add(selectedWeight);
        }

        let weightId = "";
        const variablesMap = {};

        // Helper to extract raw variables from interaction strings
        const extractRawVars = (arr) => {
            if (!Array.isArray(arr)) return;
            arr.forEach(str => {
                if (typeof str !== 'string') return;
                const parts = str.split(/[+*]/).map(s => s.trim()).filter(Boolean);
                parts.forEach(part => {
                    const found = variables.find(v => v.id === part || v.name === part || v.label === part);
                    if (found) {
                        variablesMap[part] = found;
                    } else if (part) {
                        variablesMap[part] = { id: part, name: part, label: part, type: "categorical", info: [] };
                    }
                });
            });
        };

        // Populate variablesMap
        [...rowVars, ...colVars.flat()].forEach(v => {
            const varId = v.id || v.name;
            if (v && varId) {
                variablesMap[varId] = v;
                // Also check if any Interaction variables within rowVars (though UI doesn't support it yet, for safety)
                if (varId.includes('*') || varId.includes('+')) {
                    extractRawVars([varId]);
                }
            }
        });

        // Ensure variables from columns are also thoroughly extracted
        colVars.forEach(group => {
            group.forEach(v => {
                const id = v.id || v.name;
                if (id.includes('*') || id.includes('+')) {
                    extractRawVars([id]);
                }
            });
        });

        if (weightId) {
            const weightVar = variables.find(v => v.name === selectedWeight || v.id === selectedWeight || v.label === selectedWeight);
            if (weightVar) {
                const wId = weightVar.id || weightVar.name;
                variablesMap[wId] = weightVar;
                weightId = wId;
            }
        }

        const currentFilter = overrideFilter !== undefined ? overrideFilter : filterExpression;
        const currentDisplayPolicy = overrideDisplayPolicy !== undefined ? overrideDisplayPolicy : displayPolicy;

        // Include variables used in filter expression
        if (currentFilter) {
            variables.forEach(v => {
                const vId = v.id || v.name;
                if (new RegExp('\\b' + vId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(currentFilter)) {
                    variablesMap[vId] = v;
                }
            });
        }

        const xInfo = colVars.filter(g => g.length > 0).length > 0 ? [colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*')).join('+')] : [];
        const baseTableName = tableName || "Untitled Table";


        let payload = {
            user: auth.user.userId,
            pageid: currentPageId,
            variables: variablesMap,
            weight_col: weightId,
            filter_expression: currentFilter,
            include_stats: ALL_STATS,
            row_eval_mode: tableMode === 'separated' ? 'split' : 'combined',
            display_policy: currentDisplayPolicy || {},
            zero_base_columns: currentDisplayPolicy?.hide_zero_base_columns ?? false,
            zero_banners: currentDisplayPolicy?.hide_zero_base_columns ?? false,
            zero_stubs: currentDisplayPolicy?.hide_zero_stubs ?? false,
            // sort: { group_by: "label2_label3" }
        };

        payload.table = {
            id: selectedTableId || 'T1',
            name: baseTableName,
            banner: xInfo,
            stub: rowVars.map(v => v.id || v.name)
        };

        try {
            loadingSpinner.show();
            const result = await evaluateTable.mutateAsync(payload);

            if (String(result?.success) === '777' && result.resultjson) {
                setStyleCss(result.resultjson.style_css || '');
                setResultDataList(result.resultjson.tables || []);
            }
            else {
                modal.showAlert('실패', '분석 실행 실패');
            }
        } catch (error) {
            console.error("Evaluate error:", error);
            modal.showAlert('오류', '분석 실행 중 오류가 발생했습니다.');
        } finally {
            loadingSpinner.hide();
        }
    };

    const onChangeDisplayMode = async (newMode) => {
        const nextPolicy = {
            ...displayPolicy,
            show_n: newMode === 'all' || newMode === 'value',
            show_percent: newMode === 'all' || newMode === 'percent'
        };
        setDisplayPolicy(nextPolicy);
        setFullscreenModal(prev => prev.open ? { ...prev, displayMode: newMode } : prev);
        await handleRun(undefined, nextPolicy);
    };

    const handleDeleteTable = async (tableId) => {
        if (!auth?.user?.userId) {
            modal.showAlert("알림", "로그인이 필요합니다.");
            return;
        }

        modal.showConfirm('알림', '해당 테이블을 삭제하시겠습니까?', {
            btns: [
                { title: '취소' },
                {
                    title: '삭제',
                    click: async () => {
                        try {
                            const tableToDelete = tables.find(t => t.id === tableId);
                            if (tableToDelete?.isNew) {
                                // Remove from local state only for new, unsaved tables
                                setTables(prev => prev.filter(t => t.id !== tableId));

                                // Clear selection if deleted table was selected
                                if (selectedTableId === tableId) {
                                    setSelectedTableId(null);
                                    setRowVars([]);
                                    setColVars([]);
                                    setTableName('');
                                }
                                modal.showAlert('성공', '테이블이 삭제되었습니다.');
                                return;
                            }

                            const payload = {
                                user: auth.user.userId,
                                tableid: tableId
                            };

                            const result = await deleteCrossTable.mutateAsync(payload);
                            if (String(result?.success) === '777') {
                                // Remove from local state
                                setTables(prev => prev.filter(t => t.id !== tableId));

                                // Clear selection if deleted table was selected
                                if (selectedTableId === tableId) {
                                    setSelectedTableId(null);
                                    setRowVars([]);
                                    setColVars([]);
                                    setTableName('');
                                }

                                modal.showAlert('성공', '테이블이 삭제되었습니다.');
                            } else {
                                modal.showAlert('실패', '삭제 실패');
                            }
                        } catch (error) {
                            console.error("Delete error:", error);
                            modal.showAlert('오류', '삭제 중 오류가 발생했습니다.');
                        }
                    }
                }
            ]
        });
    };

    const xInfo = useMemo(() => {
        return colVars.filter(g => g.length > 0).length > 0
            ? [colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*')).join('+')]
            : [];
    }, [colVars]);

    return (
        <div className="cross-tab-page" data-theme="data-dashboard">
            {styleCss && <style dangerouslySetInnerHTML={{ __html: styleCss }} />}
            <DataHeader title="추가분석">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* 표시 설정 Button and Popover Popup */}
                    <div style={{ position: 'relative' }} ref={displaySettingsRef}>
                        <button
                            onClick={() => setIsDisplaySettingsOpen(!isDisplaySettingsOpen)}
                            style={{
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                height: '32px',
                                padding: '0 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                userSelect: 'none',
                                outline: 'none'
                            }}
                            className="dp-btn"
                        >
                            <Settings size={14} color="#64748b" />
                            <span>표시 설정</span>
                            <span style={{
                                background: '#eff6ff',
                                color: '#2563eb',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                marginLeft: '4px'
                            }}>
                                {(displayPolicy?.show_n !== false && displayPolicy?.show_percent !== false) ? 'N, %' : (displayPolicy?.show_n !== false) ? 'N' : '%'}
                            </span>
                            <ChevronDown size={14} color="#64748b" style={{ marginLeft: '2px' }} />
                        </button>

                        {isDisplaySettingsOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 6px)',
                                right: 0,
                                width: '300px',
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                padding: '16px',
                                zIndex: 1000,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '14px',
                                textAlign: 'left'
                            }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', paddingBottom: '2px' }}>
                                    표시 설정
                                </div>

                                {/* 가중치 설정 */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>가중치 설정</span>
                                    <div style={{ position: 'relative', width: '180px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                                        <DropDownList
                                            data={weightDropdownData}
                                            textField="text"
                                            dataItemKey="value"
                                            value={weightDropdownData.find(o => o.value === localWeight) || weightDropdownData[0]}
                                            onChange={(e) => {
                                                const nextVal = (typeof e.value === 'object' && e.value !== null) ? e.value.value : e.value;
                                                setLocalWeight(nextVal);
                                            }}
                                            style={{ width: '100%', height: '100%', border: 'none', fontSize: '13px', color: '#1e293b' }}
                                            className="custom-xinfo-dropdown"
                                            popupSettings={{ className: "custom-xinfo-dropdown" }}
                                        />
                                        <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
                                    </div>
                                </div>

                                {/* 차이검증 */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>차이검증</span>
                                    <div style={{ position: 'relative', width: '180px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                                        <DropDownList
                                            data={SIG_TYPE_OPTIONS}
                                            textField="text"
                                            dataItemKey="value"
                                            value={SIG_TYPE_OPTIONS.find(o => o.value === localSigType) || SIG_TYPE_OPTIONS[0]}
                                            onChange={(e) => {
                                                const nextVal = (typeof e.value === 'object' && e.value !== null) ? e.value.value : e.value;
                                                setLocalSigType(nextVal);
                                            }}
                                            style={{ width: '100%', height: '100%', border: 'none', fontSize: '13px', color: '#1e293b' }}
                                            className="custom-xinfo-dropdown"
                                            popupSettings={{ className: "custom-xinfo-dropdown" }}
                                        />
                                        <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
                                    </div>
                                </div>

                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', paddingBottom: '2px' }}>
                                    표시 값 / 소수점
                                </div>

                                {/* N 설정 */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div
                                        onClick={() => {
                                            if (localShowN && !localShowPct) {
                                                modal.showAlert("알림", "최소 1개 이상의 지표(N 또는 %)를 선택해야 합니다.");
                                                return;
                                            }
                                            setLocalShowN(!localShowN);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                                    >
                                        <div style={{
                                            width: '18px', height: '18px', borderRadius: '4px',
                                            background: localShowN ? '#2563eb' : '#fff',
                                            border: `1.5px solid ${localShowN ? '#2563eb' : '#cbd5e1'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {localShowN && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>N</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: '60px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                            background: localShowN ? '#ffffff' : '#f8fafc'
                                        }}>
                                            <input
                                                type="text"
                                                disabled={!localShowN}
                                                value={localDecimalN}
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/[^0-9]/g, '');
                                                    if (val !== '') {
                                                        let num = parseInt(val);
                                                        if (num > 13) num = 13;
                                                        setLocalDecimalN(num);
                                                    } else {
                                                        setLocalDecimalN('');
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'ArrowUp') {
                                                        e.preventDefault();
                                                        setLocalDecimalN(prev => Math.min(13, (prev === '' ? 0 : prev) + 1));
                                                    } else if (e.key === 'ArrowDown') {
                                                        e.preventDefault();
                                                        setLocalDecimalN(prev => Math.max(0, (prev === '' ? 0 : prev) - 1));
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (localDecimalN === '') setLocalDecimalN(0);
                                                }}
                                                style={{
                                                    width: '100%', height: '100%', border: 'none', background: 'transparent',
                                                    textAlign: 'center', fontSize: '13px', fontWeight: 500, color: localShowN ? '#1e293b' : '#94a3b8',
                                                    outline: 'none', padding: 0
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* % 설정 */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div
                                        onClick={() => {
                                            if (localShowPct && !localShowN) {
                                                modal.showAlert("알림", "최소 1개 이상의 지표(N 또는 %)를 선택해야 합니다.");
                                                return;
                                            }
                                            setLocalShowPct(!localShowPct);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                                    >
                                        <div style={{
                                            width: '18px', height: '18px', borderRadius: '4px',
                                            background: localShowPct ? '#2563eb' : '#fff',
                                            border: `1.5px solid ${localShowPct ? '#2563eb' : '#cbd5e1'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {localShowPct && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>%</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: '60px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                            background: localShowPct ? '#ffffff' : '#f8fafc'
                                        }}>
                                            <input
                                                type="text"
                                                disabled={!localShowPct}
                                                value={localDecimalPct}
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/[^0-9]/g, '');
                                                    if (val !== '') {
                                                        let num = parseInt(val);
                                                        if (num > 13) num = 13;
                                                        setLocalDecimalPct(num);
                                                    } else {
                                                        setLocalDecimalPct('');
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'ArrowUp') {
                                                        e.preventDefault();
                                                        setLocalDecimalPct(prev => Math.min(13, (prev === '' ? 1 : prev) + 1));
                                                    } else if (e.key === 'ArrowDown') {
                                                        e.preventDefault();
                                                        setLocalDecimalPct(prev => Math.max(0, (prev === '' ? 1 : prev) - 1));
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (localDecimalPct === '') setLocalDecimalPct(1);
                                                }}
                                                style={{
                                                    width: '100%', height: '100%', border: 'none', background: 'transparent',
                                                    textAlign: 'center', fontSize: '13px', fontWeight: 500, color: localShowPct ? '#1e293b' : '#94a3b8',
                                                    outline: 'none', padding: 0
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 하단 적용/취소 액션 버튼 영역 */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                    <button
                                        onClick={() => setIsDisplaySettingsOpen(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            padding: '6px 14px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = '#e2e8f0';
                                            e.currentTarget.style.color = '#1e293b';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = '#f1f5f9';
                                            e.currentTarget.style.color = '#475569';
                                        }}
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleApplyDisplaySettings}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#3b82f6',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '6px 16px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
                                        onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
                                    >
                                        적용
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 엑셀 다운로드 버튼 */}
                    <button
                        onClick={() => setIsExcelModalOpen(true)}
                        style={{
                            color: '#2563eb',
                            border: '1px solid #2563eb',
                            background: '#ffffff',
                            height: '32px',
                            padding: '0 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            userSelect: 'none',
                            outline: 'none'
                        }}
                        className="dp-btn"
                        onMouseOver={(e) => e.currentTarget.style.background = '#eff6ff'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                    >
                        <Download size={16} strokeWidth={2.5} style={{ marginRight: '6px' }} color="#2563eb" />
                        <span>엑셀 다운로드</span>
                    </button>
                </div>
            </DataHeader>

            {/* 필터 드롭다운 한 줄 영역 (교차분석과 동일) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                zIndex: 99
            }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>필터</span>

                {/* 필터 선택 드롭다운 */}
                <div ref={filterAnchorRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div
                        onClick={handleTogglePopup}
                        style={{
                            width: '320px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: `1px solid ${isFilterOpen ? '#3b82f6' : '#cbd5e1'}`,
                            borderRadius: '4px',
                            background: '#fff',
                            padding: '0 12px',
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}
                    >
                        <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '275px' }}>
                            {getFilterButtonText()}
                        </span>
                        <ChevronDown size={14} color="#94a3b8" />
                    </div>
                </div>

                {/* 필터 추가 버튼 */}
                <button
                    onClick={applyFilterAndClose}
                    style={{
                        height: '32px',
                        padding: '0 16px',
                        background: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = '#2563eb';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = '#3b82f6';
                    }}
                >
                    필터 추가
                </button>

                {/* 적용된 필터 영역 */}
                {activeFilterChips.length > 0 && (
                    <>
                        <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 4px' }} />
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginLeft: '8px', whiteSpace: 'nowrap' }}>
                            적용된 필터
                        </span>

                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {activeFilterChips.map((chip) => (
                                    <div
                                        key={`chip-${chip.variableId}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: '#eff6ff',
                                            border: '1px solid #bfdbfe',
                                            borderRadius: '16px',
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            color: '#2563eb',
                                            userSelect: 'none',
                                        }}
                                    >
                                        <span style={{ fontSize: '11px', lineHeight: '1.4' }}>{chip.displayText}</span>
                                        <span
                                            onClick={() => handleRemoveFilterChip(chip.variableId)}
                                            style={{
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '50%',
                                                fontSize: '9px',
                                                fontWeight: 700,
                                                background: '#dbeafe',
                                                color: '#1d4ed8'
                                            }}
                                            title="삭제"
                                        >
                                            ✕
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 전체 초기화 버튼 */}
                        <button
                            onClick={handleResetAllFilters}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px 10px',
                                borderRadius: '16px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                marginLeft: 'auto'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
                        >
                            전체 초기화
                        </button>
                    </>
                )}
            </div>

            {/* 데이터 필터 모달 (Popup) */}
            <Popup
                anchor={filterAnchorRef.current}
                show={isFilterOpen}
                anchorAlign={{ horizontal: 'left', vertical: 'bottom' }}
                popupAlign={{ horizontal: 'left', vertical: 'top' }}
                popupClass="custom-filter-popup"
                style={{ width: '320px', marginTop: '4px', zIndex: 1000 }}
            >
                <div ref={filterPopupRef} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', flexDirection: 'column', maxHeight: '420px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}>
                    {/* 검색창 영역 */}
                    <div style={{ padding: '8px 8px 4px 8px', position: 'relative', borderBottom: '1px solid #e2e8f0' }} onClick={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            placeholder="필터 검색"
                            value={filterSearchQuery}
                            onChange={(e) => setFilterSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px 10px 6px 30px',
                                fontSize: '12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                height: '32px'
                            }}
                        />
                        <Search size={14} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        {filterSearchQuery && (
                            <X
                                size={14}
                                style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}
                                onClick={() => setFilterSearchQuery('')}
                            />
                        )}
                    </div>

                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {/* 문항 그룹 및 자식 필터 */}
                        <div style={{ padding: '2px 0' }}>
                            {filteredGroupedFilters.length === 0 ? (
                                <div style={{ padding: '16px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                                    {computedFilterOptions.length === 0 ? '등록된 문항이 없습니다.' : '검색 결과가 없습니다.'}
                                </div>
                            ) : (
                                filteredGroupedFilters.map((group, index) => {
                                    const allChildIds = group.options.map(o => o.id);
                                    const checkedChildIds = allChildIds.filter(id => draftComputedFilterIds.includes(id));
                                    const isParentChecked = allChildIds.length > 0 && checkedChildIds.length === allChildIds.length;
                                    const isParentIndeterminate = checkedChildIds.length > 0 && checkedChildIds.length < allChildIds.length;

                                    return (
                                        <div key={group.variableId} style={{ display: 'flex', flexDirection: 'column', borderBottom: index === filteredGroupedFilters.length - 1 ? 'none' : '1px solid #cbd5e1', paddingBottom: '6px' }}>
                                            {/* Parent Node */}
                                            <div
                                                onClick={() => toggleParentFilter(group)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '6px 14px',
                                                    cursor: 'pointer',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <div style={{
                                                    width: '13px',
                                                    height: '13px',
                                                    border: (isParentChecked || isParentIndeterminate) ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                                                    borderRadius: '3px',
                                                    background: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {isParentChecked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '0.5px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                    {isParentIndeterminate && <div style={{ width: '7px', height: '2px', background: '#3b82f6' }} />}
                                                </div>
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                                                    {group.variableLabel}
                                                </span>
                                            </div>

                                            {/* Child Nodes */}
                                            <div style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                                {group.options.map(opt => {
                                                    const isChildChecked = draftComputedFilterIds.includes(opt.id);

                                                    return (
                                                        <div
                                                            key={opt.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleFilter(opt.id);
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                padding: '4px 8px',
                                                                cursor: 'pointer',
                                                                borderRadius: '4px',
                                                                userSelect: 'none'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '13px',
                                                                height: '13px',
                                                                border: isChildChecked ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                                                                borderRadius: '3px',
                                                                background: '#fff',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}>
                                                                {isChildChecked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '0.5px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                            </div>
                                                            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                                                                {opt.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </Popup>

            <Toast
                show={toast.show}
                message={toast.message}
                onClose={() => setToast({ ...toast, show: false })}
            />

            {currentPageId && (
                <div className="cross-tab-layout">
                    {/* Sidebar */}
                    <SideBar
                        title="테이블 목록"
                        headerAction={
                            <button
                                onClick={handleAddNewTable}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '24px', padding: '0 8px', borderRadius: '4px', border: '1px solid #2563eb', color: '#2563eb', background: '#eff6ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <Plus size={12} /> 추가
                            </button>
                        }
                        items={filteredTables.map(t => ({
                            ...t,
                            name: t.id === mainBannerId ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Star size={15} fill="#facc15" color="#facc15" style={{ flexShrink: 0 }} />
                                    <span>{t.name}</span>
                                </div>
                            ) : t.name
                        }))}
                        selectedId={selectedTableId}
                        onItemClick={handleTableSelect}
                        onSearch={setTableSearchTerm}
                        onDelete={handleDeleteTable}
                        displayField="name"
                        searchPlaceholder="테이블을 검색하세요."
                        listRef={tableListRef}
                    />

                    {/* Main Content */}
                    <div className="cross-tab-main" style={{
                        gap: isConfigOpen ? '8px' : '16px',
                        borderRadius: '8px',
                        boxShadow: 'none',
                        border: '1px solid #cbd5e1'
                    }}>
                        {tables.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '350px' }}>
                                <Table2 size={32} color="#94a3b8" style={{ marginBottom: '16px', strokeWidth: 1.5 }} />
                                <div style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b', letterSpacing: '-0.03em' }}>표시할 데이터가 없습니다.</div>
                            </div>
                        ) : (
                            <>
                                {/* Config Section */}
                                <div className="config-section" style={{
                                    height: isConfigOpen ? '100%' : 'auto',
                                    flex: isConfigOpen ? 1.5 : 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: isConfigOpen ? '750px' : 'auto',
                                    transition: 'all 0.3s ease',
                                    borderRadius: '8px'
                                }}>
                                    <div
                                        className="config-header"
                                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                                        style={{ padding: '20px 24px', transition: 'all 0.2s', cursor: 'pointer' }}
                                    >
                                        <div className="config-header__left-group">
                                            <div className="config-header__title-group" style={{ display: 'flex', alignItems: 'center' }}>
                                                <span className="config-header__title-label">테이블 명</span>
                                                <input
                                                    type="text"
                                                    className="config-title-input"
                                                    value={tableName}
                                                    onChange={(e) => setTableName(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder="테이블 명을 입력하세요"
                                                />
                                                {/* <div
                                                    title={mainBannerId === selectedTableId ? "주배너 해제" : "이 배너를 주배너로 지정합니다"}
                                                    onClick={() => setMainBannerId(mainBannerId === selectedTableId ? null : selectedTableId)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        width: '28px', height: '28px', marginLeft: '6px',
                                                        cursor: 'pointer', transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Star 
                                                        size={22} 
                                                        fill={mainBannerId === selectedTableId ? '#facc15' : 'none'} 
                                                        color={mainBannerId === selectedTableId ? '#facc15' : '#cbd5e1'} 
                                                        strokeWidth={mainBannerId === selectedTableId ? 2.5 : 2} 
                                                        style={{ 
                                                            transition: 'all 0.2s', 
                                                            transform: mainBannerId === selectedTableId ? 'scale(1.05)' : 'scale(1)'
                                                        }}
                                                    />
                                                </div> */}
                                            </div>
                                        </div>

                                        {/* Table Mode Switch */}
                                        <div className="action-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {isConfigOpen && (
                                                <button
                                                    className="btn-run"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSaveAndRun();
                                                    }}
                                                >
                                                    <Play size={16} fill="white" /> 저장 후 실행
                                                </button>
                                            )}
                                            <button
                                                className={`wide-view-toggle-btn ${isConfigOpen ? 'active' : ''}`}
                                                type="button"
                                                title={isConfigOpen ? "설정 닫기" : "설정 열기"}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: 0, border: '1px solid #e2e8f0', borderRadius: '4px', background: 'white', color: '#64748b', cursor: 'pointer' }}
                                            >
                                                {isConfigOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {isConfigOpen && (
                                        <div className="config-body" style={{
                                            flex: 1,
                                            height: 'auto',
                                            overflow: 'hidden'
                                        }}>
                                            {/* Variable Panel */}
                                            <div className={`variable-panel ${!isVariablePanelOpen ? 'collapsed' : ''}`}>
                                                <div className="variable-panel-title-row" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', height: '48px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: isVariablePanelOpen ? 'space-between' : 'center', flexShrink: 0 }}>
                                                    {isVariablePanelOpen ? (
                                                        <>
                                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>문항 목록 ({filteredVariables.length})</span>
                                                            <button
                                                                className="toggle-button"
                                                                onClick={() => setIsVariablePanelOpen(!isVariablePanelOpen)}
                                                                style={{ flexShrink: 0, padding: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                                                            >
                                                                <ChevronLeft size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            className="toggle-button"
                                                            onClick={() => setIsVariablePanelOpen(!isVariablePanelOpen)}
                                                            style={{ flexShrink: 0, margin: '0 auto', padding: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                {isVariablePanelOpen && (
                                                    <div className="variable-panel-search" style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                                                        <div style={{ position: 'relative', width: '100%' }}>
                                                            <Search size={14} className="search-icon" />
                                                            <input
                                                                type="text"
                                                                placeholder="문항을 검색하세요."
                                                                value={variableSearchTerm}
                                                                onChange={(e) => setVariableSearchTerm(e.target.value)}
                                                                className="search-input"
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {isVariablePanelOpen && (
                                                    <div className="variable-list" style={{ height: filteredVariables.length === 0 ? '100%' : 'auto' }}>
                                                        {filteredVariables.length === 0 ? (
                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '220px', padding: '20px', textAlign: 'center' }}>
                                                                <Table2 size={25} color="#94a3b8" style={{ marginBottom: '12px', strokeWidth: 1.5 }} />
                                                                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', letterSpacing: '-0.03em' }}>조회된 문항이 없습니다.</div>
                                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontWeight: 400, letterSpacing: '-0.01em' }}>DP의뢰서를 작성해주세요.</div>
                                                            </div>
                                                        ) : (
                                                            filteredVariables.map((v, idx) => (
                                                                <div
                                                                    key={`${v.id}-${idx}`}
                                                                    className={`variable-item ${selectedVarIds.includes(v.id) ? 'active' : ''}`}
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, v)}
                                                                    onClick={(e) => handleVariableClick(e, v.id)}
                                                                    title={`${v.label || ''}${v.id ? ` (${v.id})` : ''}`}
                                                                >
                                                                    <div className="variable-item-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <div className="variable-item__name" style={{ wordBreak: 'break-all', lineHeight: 1.3, marginBottom: 0 }}>
                                                                                {v.label || v.id}
                                                                            </div>
                                                                            {v.label && (
                                                                                <div style={{ wordBreak: 'break-all', color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                                                                                    {v.id}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {v.type && (
                                                                            <span className={`question-type-badge ${v.color}`} style={{ flexShrink: 0 }}>
                                                                                {String(v.type).toLowerCase()}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Drop Zones Container */}
                                            <div className="drop-zones-container">
                                                {/* Top Row: Axis Info & Column Drop Zone */}
                                                <div className="drop-zones-top">
                                                    <div className="corner-label">
                                                        세로 × 가로
                                                    </div>
                                                    <div className="col-drop-zone">
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                            <span className="drop-zone-label" style={{ marginBottom: 0 }}>가로축 (열)</span>
                                                            <button
                                                                onClick={() => setColVars([])}
                                                                className="axis-clear-btn"
                                                                title="전체 삭제"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                        <div className="drop-zone-area" style={{ padding: '8px', overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            {colVars.map((group, groupIndex) => (
                                                                <div
                                                                    key={`group-${groupIndex}`}
                                                                    className="col-group"
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, { type: 'COL_GROUP', groupIndex })}
                                                                    onDragOver={handleDragOver}
                                                                    onDrop={(e) => handleDrop(e, 'col', groupIndex)}
                                                                >
                                                                    <div className="group-drag-handle" title="그룹 이동">
                                                                        <GripVertical size={16} />
                                                                    </div>
                                                                    <div className="col-group-items">
                                                                        {group.map((v, itemIndex) => (
                                                                            <div
                                                                                key={`${v.id}-${itemIndex}`}
                                                                                className="dropped-tag grouped"
                                                                                draggable
                                                                                onDragStart={(e) => handleDragStart(e, { type: 'COL_ITEM', groupIndex, itemIndex, item: v })}
                                                                                onDragOver={handleDragOver}
                                                                                onDrop={(e) => handleDrop(e, 'col_item', groupIndex, itemIndex)}
                                                                            >
                                                                                <span className="item-drag-handle"><GripVertical size={13} strokeWidth={2.5} /></span>
                                                                                <span className="tag-text">{v.id}</span>
                                                                                <X size={14} className="remove" onClick={(e) => { e.stopPropagation(); removeVar(v.id, 'col', groupIndex); }} />
                                                                            </div>
                                                                        ))}
                                                                        {group.length < 3 && Array.from({ length: 3 - group.length }).map((_, i) => (
                                                                            <div key={`empty-${i}`} className="empty-slot"></div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {colVars.length < 10 && (
                                                                <div
                                                                    className="col-group new-group"
                                                                    onDragOver={handleDragOver}
                                                                    onDrop={(e) => handleDrop(e, 'new_col_group')}
                                                                >
                                                                    {colVars.length === 0 && (
                                                                        <div className="drop-zone-placeholder" style={{ position: 'absolute', width: '100%', textAlign: 'center', margin: 'auto', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                                                                            문항을 여기로 드래그하세요
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bottom Row: Row Drop Zone & Center Content */}
                                                <div className="drop-zones-bottom">
                                                    <div
                                                        className="row-drop-zone"
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDrop(e, 'row')}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                            <span className="drop-zone-label" style={{ marginBottom: 0 }}>세로축 (행)</span>
                                                            <button
                                                                onClick={() => setRowVars([])}
                                                                className="axis-clear-btn"
                                                                title="전체 삭제"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                        <div className="drop-zone-area vertical">
                                                            {rowVars.length === 0 ? (
                                                                <div className="drop-zone-placeholder vertical">문항을 여기로<br />드래그하세요</div>
                                                            ) : (
                                                                rowVars.map((v, itemIndex) => (
                                                                    <div
                                                                        key={`${v.id}-${itemIndex}`}
                                                                        className="dropped-tag row-tag"
                                                                        draggable
                                                                        onDragStart={(e) => handleDragStart(e, { type: 'ROW_ITEM', itemIndex, item: v })}
                                                                        onDragOver={handleDragOver}
                                                                        onDrop={(e) => handleDrop(e, 'row_item', null, itemIndex)}
                                                                    >
                                                                        <span className="item-drag-handle"><GripHorizontal size={13} strokeWidth={2.5} /></span>
                                                                        <span className="tag-text">{v.id}</span>
                                                                        <X size={14} className="remove" onClick={(e) => { e.stopPropagation(); removeVar(v.id, 'row'); }} />
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Center Content: Filter & Weight */}
                                                    <div className="center-content">
                                                        {previewData && (
                                                            <div className="preview-table-wrapper">
                                                                <table className="preview-table">
                                                                    <thead>
                                                                        {previewData.colHeaderRows.map((rowCells, rIndex) => (
                                                                            <tr key={`col-header-row-${rIndex}`}>
                                                                                {rIndex === 0 && (
                                                                                    <th
                                                                                        rowSpan={previewData.maxColLevels + 1}
                                                                                        colSpan={previewData.maxRowLevels}
                                                                                        className="preview-th corner-header"
                                                                                        style={{ top: 0 }}
                                                                                    ></th>
                                                                                )}
                                                                                {rowCells.map((cell, cIndex) => (
                                                                                    <th
                                                                                        key={`col-header-cell-${cIndex}`}
                                                                                        colSpan={cell.colspan}
                                                                                        rowSpan={cell.rowspan}
                                                                                        className={`preview-th ${cell.isGroupHeader ? 'group-header' : 'col-header'}`}
                                                                                        style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4', top: `${rIndex * 24}px` }}
                                                                                    >
                                                                                        {cell.label}
                                                                                    </th>
                                                                                ))}
                                                                            </tr>
                                                                        ))}
                                                                    </thead>
                                                                    <tbody>
                                                                        {previewData.rowGroups.map((group, groupIdx) => (
                                                                            <React.Fragment key={groupIdx}>
                                                                                {previewData.isSeparated && groupIdx > 0 && (
                                                                                    <tr>
                                                                                        <td
                                                                                            colSpan={previewData.maxRowLevels + previewData.totalDataCols}
                                                                                            className="preview-td preview-separator-row"
                                                                                        >
                                                                                            <span className="preview-separator-label">[ 표 분리 ]</span>
                                                                                        </td>
                                                                                    </tr>
                                                                                )}
                                                                                {group.labels.map((label, labelIdx) => (
                                                                                    <tr key={`${groupIdx}-${labelIdx}`}>
                                                                                        {group.name === '' ? (
                                                                                            <td colSpan={2} className="preview-td row-head sticky-left" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                                                                                {label}
                                                                                            </td>
                                                                                        ) : (
                                                                                            <>
                                                                                                {labelIdx === 0 && (
                                                                                                    <td rowSpan={group.labels.length} className={`preview-td row-group-head sticky-left${previewData.isSeparated ? ' separated-group-head' : ''}`}>
                                                                                                        {group.name}
                                                                                                    </td>
                                                                                                )}
                                                                                                <td className="preview-td row-head sticky-left-indent" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                                                                                    {label}
                                                                                                </td>
                                                                                            </>
                                                                                        )}
                                                                                        {Array.from({ length: previewData.totalDataCols }).map((_, colIdx) => (
                                                                                            <td key={colIdx} className="preview-td data-cell">
                                                                                                <span className="data-placeholder">-</span>
                                                                                            </td>
                                                                                        ))}
                                                                                    </tr>
                                                                                ))}
                                                                            </React.Fragment>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}

                                                        <div className="filter-weight-row" style={{ display: 'none', gap: '20px', position: 'sticky', bottom: 0, background: '#f8f9fa', zIndex: 10, padding: '8px 12px', borderTop: '1px solid #e0e0e0', alignItems: 'center', boxShadow: '0 -2px 5px rgba(0,0,0,0.05)' }}>
                                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#444', whiteSpace: 'nowrap' }}>필터</span>
                                                                <input
                                                                    type="text"
                                                                    className="center-content__input"
                                                                    placeholder="예: age >= 20"
                                                                    style={{ flex: 1, height: '34px', fontSize: '13px' }}
                                                                    value={filterExpression}
                                                                    onChange={(e) => setFilterExpression(e.target.value)}
                                                                />
                                                            </div>
                                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#444', whiteSpace: 'nowrap' }}>가중치 문항</span>
                                                                <DropDownList
                                                                    data={weightVariableOptions}
                                                                    value={selectedWeight}
                                                                    onChange={(e) => setSelectedWeight(e.target.value)}
                                                                    style={{ flex: 1, height: '34px' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Result Section (Scroll Area) */}
                                <div className="results-scroll-container" style={{ display: resultDataList.length === 0 ? 'none' : 'flex' }}>
                                    {resultDataList.map((resultData, dataIndex) => (
                                        <ResultSectionBlock
                                            key={`${resultData.table_id || 'T1'}_${dataIndex}`}
                                            resultData={resultData}
                                            displayPolicy={displayPolicy}
                                            renderSettings={renderSettings}
                                            dataIndex={dataIndex}
                                            isConfigOpen={isConfigOpen}
                                            setIsConfigOpen={setIsConfigOpen}
                                            setToast={setToast}
                                            setFullscreenModal={setFullscreenModal}
                                            tableName={tableName}
                                            isExpanded={!collapsedIndices.has(dataIndex)}
                                            onToggleExpand={() => {
                                                setCollapsedIndices(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(dataIndex)) {
                                                        next.delete(dataIndex);
                                                    } else {
                                                        next.add(dataIndex);
                                                    }
                                                    return next;
                                                });
                                            }}
                                            isAnyExpanded={collapsedIndices.size < resultDataList.length}
                                            tableMode={tableMode}
                                            paletteId={globalPaletteId}
                                            setPaletteId={setGlobalPaletteId}
                                            rowVars={rowVars}
                                            xInfo={xInfo}
                                            weightCol={selectedWeight === "없음" ? null : selectedWeight}
                                            filterExpression={filterExpression}
                                            onChangeDisplayMode={onChangeDisplayMode}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Fullscreen Modal */}
            {(() => {
                const activeFullscreenDataItem = (fullscreenModal.open && fullscreenModal.dataIndex !== undefined && resultDataList[fullscreenModal.dataIndex])
                    ? resultDataList[fullscreenModal.dataIndex]
                    : fullscreenModal.dataItem;

                const currentDisplayMode = (() => {
                    const showN = displayPolicy?.show_n !== false;
                    const showPercent = displayPolicy?.show_percent !== false;
                    if (showN && showPercent) return 'all';
                    if (showN) return 'value';
                    if (showPercent) return 'percent';
                    return 'all';
                })();

                return (
                    <FullscreenModal
                        isOpen={fullscreenModal.open}
                        type={fullscreenModal.type}
                        onClose={() => setFullscreenModal({ ...fullscreenModal, open: false })}
                        resultData={activeFullscreenDataItem}
                        statsOptions={fullscreenModal.statsOptions}
                        chartData={fullscreenModal.chartData}
                        seriesNames={fullscreenModal.seriesNames}
                        rawChartData={fullscreenModal.rawChartData}
                        chartMode={fullscreenModal.chartMode}
                        displayMode={currentDisplayMode}
                        setDisplayMode={onChangeDisplayMode}
                        paletteId={globalPaletteId}
                        setPaletteId={setGlobalPaletteId}
                        tableName={fullscreenModal.tableName}
                        displayPolicy={displayPolicy}
                        renderSettings={renderSettings}
                        chartDataType={fullscreenModal.chartDataType}
                        showChartValues={fullscreenModal.showChartValues}
                    />
                );
            })()}

            {/* Removed CreateTablePopup */}

            <PageListPopup
                isOpen={isPageListOpen}
                onClose={() => setIsPageListOpen(false)}
                data={pageListData}
                onSelect={handlePageSelected}
            />

            {/* 고급 필터 AdditionalAnalysisFilterPopup */}
            {isFilterPopupOpen && (
                <AdditionalAnalysisFilterPopup
                    auth={auth}
                    pageId={currentPageId}
                    initialVariables={[]}
                    variablesList={variables}
                    initialLogic={filterExpression}
                    initialInfo={filterInfo}
                    title="고급 필터"
                    onClose={() => setIsFilterPopupOpen(false)}
                    onSave={(varId, logicStr, varLabel, info) => {
                        setFilterExpression(logicStr);
                        setFilterInfo(info);
                        setIsFilterPopupOpen(false);
                        handleRun(logicStr);
                    }}
                />
            )}

            {/* 엑셀 다운로드 확인 모달 (교차분석과 동일) */}
            {isExcelModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.4)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Download size={22} color="#2563eb" strokeWidth={2.5} />
                            엑셀 다운로드
                        </h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#475569', fontWeight: 500, lineHeight: '1.5' }}>
                            추가분석표를 엑셀 파일로 다운로드 하시겠습니까?
                        </p>
                        <div style={{ marginBottom: '28px', padding: '16px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none'
                                    }}
                                    onClick={() => setExcelShowPct(!excelShowPct)}
                                >
                                    <div style={{
                                        width: '20px', height: '20px', borderRadius: '5px',
                                        background: excelShowPct ? '#2563eb' : '#fff',
                                        border: `1.5px solid ${excelShowPct ? '#2563eb' : '#cbd5e1'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                        transition: 'all 0.15s'
                                    }}>
                                        {excelShowPct && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>% 표출 여부</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>% 소수점</span>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '42px', height: '22px', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                                        background: '#ffffff'
                                    }}>
                                        <input
                                            type="text"
                                            value={excelDecimalPct}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/[^0-9]/g, '');
                                                if (val !== '') {
                                                    let num = parseInt(val);
                                                    if (num > 13) num = 13;
                                                    setExcelDecimalPct(num);
                                                } else {
                                                    setExcelDecimalPct('');
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setExcelDecimalPct(prev => Math.min(13, (prev === '' ? 1 : prev) + 1));
                                                } else if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setExcelDecimalPct(prev => Math.max(0, (prev === '' ? 1 : prev) - 1));
                                                }
                                            }}
                                            onBlur={() => {
                                                if (excelDecimalPct === '') setExcelDecimalPct(1);
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

                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none'
                                }}
                                onClick={() => setExcelShowBaseParenthesis(!excelShowBaseParenthesis)}
                            >
                                <div style={{
                                    width: '20px', height: '20px', borderRadius: '5px',
                                    background: excelShowBaseParenthesis ? '#2563eb' : '#fff',
                                    border: `1.5px solid ${excelShowBaseParenthesis ? '#2563eb' : '#cbd5e1'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.15s'
                                }}>
                                    {excelShowBaseParenthesis && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    )}
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Base 기본 (괄호)</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setIsExcelModalOpen(false)}
                                onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                                onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
                                style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, transition: 'background 0.2s' }}
                            >
                                취소
                            </button>
                            <button
                                onClick={async () => {
                                    setIsExcelModalOpen(false);
                                    await handleExcelExport();
                                }}
                                onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
                                onMouseOut={(e) => e.target.style.background = '#2563eb'}
                                style={{ padding: '10px 24px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, transition: 'background 0.2s' }}
                            >
                                다운로드
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AdditionalAnalysisPage;
