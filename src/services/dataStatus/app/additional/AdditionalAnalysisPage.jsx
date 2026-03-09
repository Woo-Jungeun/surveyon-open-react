import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, ChevronUp, Play, Search, BarChart2, BarChartHorizontal, Download, X, Settings, ChevronRight, GripVertical, GripHorizontal, LineChart, Map, PieChart, Donut, AreaChart, LayoutGrid, ChevronLeft, Layers, Filter, Aperture, MoreHorizontal, Copy, Bot, Loader2, Sparkles, CheckCircle2, Maximize, Minimize, Save, Grid, Plus, Table, List } from 'lucide-react';
import Toast from '../../../../components/common/Toast';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { saveAs } from '@progress/kendo-file-saver';
import KendoChart from '../../components/KendoChart';
import '@progress/kendo-theme-default/dist/all.css';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import CreateTablePopup from './CreateTablePopup';
import './AdditionalAnalysisPage.css';
import { AdditionalAnalysisPageApi } from './AdditionalAnalysisPageApi';
import { RecodingPageApi } from '../recoding/RecodingPageApi';
import { modalContext } from "@/components/common/Modal.jsx";
import FullscreenModal from './FullscreenModal';
import { VariablePageApi } from '../variable/VariablePageApi';
import PageListPopup from '../variable/PageListPopup';
import LogicEditPopup from '../../../dataManagement/app/mapManagement/LogicEditPopup';
// const ALL_STATS = ["mean", "std", "min", "max", "n", "median", "mode", "rse", "chi2", "df", "p_value"];
const ALL_STATS = ["mean", "std", "min", "max", "n", "median", "mode", "rse"];

const AdditionalAnalysisPage = () => {
    // Auth & API
    const auth = useSelector((store) => store.auth);
    const { getCrossTabList, getCrossTabData, saveCrossTable, deleteCrossTable, evaluateTable, evaluateTables } = AdditionalAnalysisPageApi();
    const { getRecodedList } = RecodingPageApi();
    const modal = React.useContext(modalContext);
    const PAGE_ID = sessionStorage.getItem("pageId");

    // Data State
    const [tables, setTables] = useState([]);
    const [selectedTableId, setSelectedTableId] = useState(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tableSearchTerm, setTableSearchTerm] = useState('');
    const [variableSearchTerm, setVariableSearchTerm] = useState('');
    const [selectedWeight, setSelectedWeight] = useState("없음");
    const [tableName, setTableName] = useState('Banner by Q1'); // Added table name state
    const [filterExpression, setFilterExpression] = useState(''); // Added filter expression state
    const [chartMode, setChartMode] = useState(null);
    const [tableMode, setTableMode] = useState('merged'); // 'merged' | 'separated'
    const [isStatsOptionsOpen, setIsStatsOptionsOpen] = useState(false);
    const [isVariablePanelOpen, setIsVariablePanelOpen] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const chartContainerRef = useRef(null);
    const downloadMenuRef = useRef(null);
    const tableListRef = useRef(null);
    const [fullscreenModal, setFullscreenModal] = useState({ open: false, type: null }); // 'table', 'stats', 'chart'

    // Variables for Drag & Drop
    const [variables, setVariables] = useState([]);

    const [rowVars, setRowVars] = useState([]);
    const [colVars, setColVars] = useState([]); // Array of arrays: [[v1, v2], [v3]]
    const [draggedItem, setDraggedItem] = useState(null);
    const draggedItemRef = useRef(null); // stale closure 방지용 동기 ref

    // Filter weight variables from API response
    const weightVariableOptions = useMemo(() => {
        const weights = variables
            .filter(v => v?.id?.startsWith('weight_'))
            .map(v => v?.id);
        return ["없음", ...weights];
    }, [variables]);

    // Layout Options (Order & Visibility)
    const [layoutOptions, setLayoutOptions] = useState([
        { id: 'table', label: '표', checked: true },
        { id: 'stats', label: '통계', checked: true },
        { id: 'chart', label: '차트', checked: false },
        { id: 'ai', label: 'AI 분석', checked: false }
    ]);
    const [statsOptions, setStatsOptions] = useState([
        { id: 'mean', label: '평균', checked: true },
        { id: 'median', label: '중앙값', checked: false },
        { id: 'mode', label: '최빈값', checked: false },
        { id: 'std', label: '표준편차', checked: false },
        { id: 'min', label: '최소값', checked: false },
        { id: 'max', label: '최대값', checked: false },
        { id: 'n', label: '표본수', checked: false },
        { id: 'rse', label: '상대표준오차', checked: false },
        //todo 1차 오픈 기준 임시 주석 
        // { id: 'chi2', label: '카이제곱값', checked: false },
        // { id: 'df', label: '자유도', checked: false },
        // { id: 'p_value', label: 'p값', checked: false },
    ]);
    const [isMoreStatsOpen, setIsMoreStatsOpen] = useState(false);
    const moreStatsRef = useRef(null);

    // Column Layout Option (1-column or 2-column)
    const [columnLayout, setColumnLayout] = useState('single'); // 'single' (1단) or 'double' (2단)

    // Result Display Mode
    const [displayMode, setDisplayMode] = useState('all');
    const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
    const displayMenuRef = useRef(null);
    // AI Analysis State
    const [aiResult, setAiResult] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Total Filter State
    const [selectedTotalFilters, setSelectedTotalFilters] = useState(['전체']);
    const [isTotalFilterOpen, setIsTotalFilterOpen] = useState(false);
    const totalFilterRef = useRef(null);
    const totalFilterList = ['전체', 'reccoded_SQ1', 'reccoded_SQ2'];

    const handleTotalFilterToggle = (filter) => {
        if (filter === '전체') {
            setSelectedTotalFilters(prev => prev.includes('전체') ? [] : ['전체']);
            return;
        }

        setSelectedTotalFilters(prev => {
            let newFilters = prev.filter(f => f !== '전체');
            if (newFilters.includes(filter)) {
                newFilters = newFilters.filter(f => f !== filter);
            } else {
                newFilters = [...newFilters, filter];
            }
            return newFilters;
        });
    };

    const { pageList: getPageList, getOriginalVariables } = VariablePageApi();
    const [isPageListOpen, setIsPageListOpen] = useState(false);
    const [pageListData, setPageListData] = useState([]);

    const handleOpenPageList = async () => {
        const userId = auth?.user?.userId;
        const mergePn = sessionStorage.getItem("merge_pn");

        if (!userId || !mergePn) {
            modal.showErrorAlert("알림", "프로젝트 정보가 없습니다.");
            return;
        }

        try {
            const result = await getPageList.mutateAsync({ user: userId, pn: mergePn });
            if (result?.success === "777" && result.resultjson) {
                setPageListData(result.resultjson);
                setIsPageListOpen(true);
            } else {
                modal.showErrorAlert("알림", "조회된 대시보드가 없습니다.");
            }
        } catch (e) {
            console.error(e);
            modal.showErrorAlert("오류", "대시보드 목록 조회 중 오류가 발생했습니다.");
        }
    };

    const handlePageSelected = (page) => {
        const pageId = page.pageid || page.id;
        const pageTitle = page.title || page.name;
        sessionStorage.setItem("pageId", pageId);
        sessionStorage.setItem("pagetitle", pageTitle);
        setIsPageListOpen(false);
        window.location.reload();
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (totalFilterRef.current && !totalFilterRef.current.contains(event.target)) {
                setIsTotalFilterOpen(false);
            }
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
                setShowDownloadMenu(false);
            }
            if (displayMenuRef.current && !displayMenuRef.current.contains(event.target)) {
                setIsDisplayMenuOpen(false);
            }
            if (moreStatsRef.current && !moreStatsRef.current.contains(event.target)) {
                setIsMoreStatsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!auth?.user?.userId) return;
            if (!PAGE_ID) {
                modal.showAlert("알림", "선택된 대시보드 정보가 없습니다.", null, handleOpenPageList);
                return;
            }

            let loadedVariables = [];

            // Fetch Variables (Original Variables)
            try {
                const varResult = await getOriginalVariables.mutateAsync({
                    user: auth.user.userId,
                    pageid: PAGE_ID
                });

                if (varResult?.success === "777" && varResult.resultjson) {
                    const originalVars = Object.values(varResult.resultjson).map(item => ({
                        id: item.id,
                        name: item.id,
                        label: item.label,
                        type: item.type,
                        info: item.info || []
                    }));
                    loadedVariables = [...originalVars];
                }

                // Fetch Recoded Variables (including Banner)
                const recodedResult = await getRecodedList.mutateAsync({
                    user: auth.user.userId,
                    pageid: PAGE_ID
                });

                if (recodedResult?.success === "777" && recodedResult.resultjson) {
                    const recodedVars = Object.values(recodedResult.resultjson).map(item => ({
                        id: item.id,
                        name: item.id,
                        label: item.label,
                        type: item.type || "categorical",
                        info: item.info || []
                    }));

                    // Merge recoded variables, avoiding duplicates if any
                    recodedVars.forEach(rv => {
                        const idx = loadedVariables.findIndex(v => v.id === rv.id);
                        if (idx >= 0) {
                            loadedVariables[idx] = rv;
                        } else {
                            loadedVariables.push(rv);
                        }
                    });
                }

                setVariables(loadedVariables);
            } catch (error) {
                console.error("Failed to fetch variables:", error);
            }

            // Fetch Tables
            try {
                const result = await getCrossTabList.mutateAsync({
                    user: auth.user.userId,
                    pageid: PAGE_ID
                });

                if (result?.success === "777") {
                    const data = Array.isArray(result.resultjson)
                        ? result.resultjson
                        : Object.values(result.resultjson || {});

                    const mappedTables = data.map(item => ({
                        id: item.id,
                        name: item.name || item.TABLE_TITLE || item.id || `Table ${item.id}`,
                        row: item.row || item.rows || [],
                        col: item.col || item.cols || []
                    }));

                    if (mappedTables.length > 0) {
                        setTables(mappedTables);

                        // Select first table automatically
                        const firstTable = mappedTables[0];
                        setSelectedTableId(firstTable.id);
                        setTableName(firstTable.id || "");

                        // Set configuration using loaded variables
                        const newRowVars = (firstTable.row || []).map(id => {
                            const found = loadedVariables.find(v => v.id === id);
                            return found || { id, name: id, label: id, info: [] };
                        });
                        const newColVars = (firstTable.col || []).map(id => {
                            if (Array.isArray(id)) {
                                return id.map(subId => {
                                    const found = loadedVariables.find(v => v.id === subId);
                                    return found || { id: subId, name: subId, label: subId, info: [] };
                                });
                            }
                            const found = loadedVariables.find(v => v.id === id);
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

                            if (tableDataResult?.success === "777" && tableDataResult.resultjson) {
                                const tData = tableDataResult.resultjson;

                                // Apply config from API result
                                if (tData.config) {
                                    // x_info -> 가로축 (Cols)
                                    if (tData.config.x_info) {
                                        const xIds = tData.config.x_info;
                                        let mappedCols = [];
                                        if (xIds.length === 1 && typeof xIds[0] === 'string' && (xIds[0].includes('*') || xIds[0].includes('+'))) {
                                            const groups = xIds[0].split('+');
                                            mappedCols = groups.map(g => {
                                                return g.split('*').filter(id => id.trim()).map(id => {
                                                    const trimmed = id.trim();
                                                    return loadedVariables.find(v => v.name === trimmed || v.id === trimmed) || { id: trimmed, name: trimmed };
                                                });
                                            });
                                        } else {
                                            mappedCols = xIds.map(item => {
                                                if (Array.isArray(item)) {
                                                    return item.map(id => loadedVariables.find(v => v.name === id || v.id === id) || { id, name: id });
                                                }
                                                return [loadedVariables.find(v => v.name === item || v.id === item) || { id: item, name: item }];
                                            });
                                        }
                                        setColVars(mappedCols.filter(g => g.length > 0));
                                    }
                                    // y_info -> 세로축 (Rows)
                                    if (tData.config.y_info) {
                                        const yIds = tData.config.y_info;
                                        let mappedRows = [];
                                        if (yIds.length === 1 && typeof yIds[0] === 'string' && (yIds[0].includes('*') || yIds[0].includes('+'))) {
                                            mappedRows = yIds[0].split(/[+*]/).filter(id => id.trim()).map(id => {
                                                const trimmed = id.trim();
                                                return loadedVariables.find(v => v.name === trimmed || v.id === trimmed) || { id: trimmed, name: trimmed };
                                            });
                                        } else {
                                            mappedRows = yIds.map(id => loadedVariables.find(v => v.name === id || v.id === id) || { id, name: id });
                                        }
                                        if (yIds.length === 1 && typeof yIds[0] === 'string' && (yIds[0].includes('*') || yIds[0].includes('+'))) {
                                            setTableMode(yIds[0].includes('+') ? 'merged' : 'separated');
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

                                const columnsList = tData.columns || [];
                                const rowsList = tData.rows || [];

                                const columnLabels = columnsList.map(c => c.label);
                                const columnKeys = columnsList.map(c => c.key);

                                const parsedRows = rowsList.map(r => {
                                    const processedValues = columnKeys.map(k => {
                                        const cell = r.cells?.[k];
                                        return {
                                            count: cell?.count || 0,
                                            percent: cell?.percent || "0.0"
                                        };
                                    });
                                    // Total calculation might still be useful for reference but display uses Api values
                                    const total = processedValues.reduce((a, b) => a + Number(b.count), 0);
                                    return {
                                        label: r.label,
                                        values: processedValues, // Now detailed objects
                                        total: total
                                    };
                                });

                                const parsedStats = {
                                    mean: columnsList.map(c => c.mean !== undefined ? c.mean : '-'),
                                    std: columnsList.map(c => c.std !== undefined ? c.std : '-'),
                                    min: columnsList.map(c => c.min !== undefined ? c.min : '-'),
                                    max: columnsList.map(c => c.max !== undefined ? c.max : '-'),
                                    n: columnsList.map(c => c.n || 0)
                                };

                                setResultData({
                                    columns: columnLabels,
                                    rows: parsedRows,
                                    stats: parsedStats
                                });

                                // Auto-run analysis for the first table
                                try {
                                    const config = tData.config || {};
                                    const xInfo = config.x_info || [];
                                    const yInfo = config.y_info || [];
                                    const weightCol = config.weight_col || "";
                                    const filterExpr = config.filter_expression || "";

                                    const variablesMap = {};
                                    const extractRawVars = (arr) => {
                                        if (!Array.isArray(arr)) return;
                                        arr.forEach(str => {
                                            if (typeof str !== 'string') return;
                                            const parts = str.split(/[+*]/).map(s => s.trim()).filter(Boolean);
                                            parts.forEach(part => {
                                                const found = loadedVariables.find(v => v.id === part || v.name === part);
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
                                        const weightVar = loadedVariables.find(v => v.id === weightCol || v.name === weightCol);
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
                                        pageid: PAGE_ID,
                                        variables: variablesMap,
                                        weight_col: weightCol === "없음" ? "" : weightCol,
                                        filter_expression: filterExpr,
                                        include_stats: ALL_STATS,
                                        table: {
                                            id: firstTable.id,
                                            name: firstTable.name || tData.name || "Untitled Table",
                                            x_info: xInfo,
                                            y_info: yInfo
                                        }
                                    };

                                    const evalResult = await evaluateTable.mutateAsync(payload);

                                    if (evalResult?.success === "777" && evalResult.resultjson) {
                                        let newData = evalResult.resultjson;

                                        // Handle separated mode results if returned as array
                                        if (newData.results && Array.isArray(newData.results) && newData.results.length > 0) {
                                            newData = newData.results[0].result || newData.results[0];
                                        }

                                        const newColumnsList = newData.columns || [];
                                        const newRowsList = newData.rows || [];
                                        const newColumnLabels = newColumnsList.map(c => c.label);
                                        const newColumnKeys = newColumnsList.map(c => c.key);

                                        const newParsedRows = newRowsList.map(r => {
                                            const processedValues = newColumnKeys.map(k => {
                                                const cell = r.cells?.[k];
                                                return {
                                                    count: cell?.count || 0,
                                                    percent: cell?.percent || "0.0"
                                                };
                                            });
                                            const total = processedValues.reduce((a, b) => a + Number(b.count), 0);
                                            return { label: r.label, values: processedValues, total: total };
                                        });

                                        const statsMap = newData.stats || {};
                                        const newParsedStats = {
                                            mean: newColumnsList.map(c => statsMap[c.key]?.mean ?? (c.mean !== undefined ? c.mean : '-')),
                                            median: newColumnsList.map(c => statsMap[c.key]?.median ?? statsMap[c.key]?.med ?? (c.median !== undefined ? c.median : (c.med !== undefined ? c.med : '-'))),
                                            mode: newColumnsList.map(c => statsMap[c.key]?.mode ?? statsMap[c.key]?.mod ?? (c.mode !== undefined ? c.mode : (c.mod !== undefined ? c.mod : '-'))),
                                            std: newColumnsList.map(c => statsMap[c.key]?.std ?? (c.std !== undefined ? c.std : '-')),
                                            min: newColumnsList.map(c => statsMap[c.key]?.min ?? (c.min !== undefined ? c.min : '-')),
                                            max: newColumnsList.map(c => statsMap[c.key]?.max ?? (c.max !== undefined ? c.max : '-')),
                                            n: newColumnsList.map(c => statsMap[c.key]?.n ?? (c.n !== undefined ? c.n : 0)),
                                            rse: newColumnsList.map(c => statsMap[c.key]?.rse ?? (c.rse !== undefined ? c.rse : '-')),
                                            chi2: newColumnsList.map(c => statsMap[c.key]?.chi2 ?? (c.chi2 !== undefined ? c.chi2 : '-')),
                                            df: newColumnsList.map(c => statsMap[c.key]?.df ?? (c.df !== undefined ? c.df : '-')),
                                            p_value: newColumnsList.map(c => statsMap[c.key]?.p_value ?? (c.p_value !== undefined ? c.p_value : '-')),
                                        };

                                        setResultData({
                                            columns: newColumnLabels,
                                            rows: newParsedRows,
                                            stats: newParsedStats
                                        });
                                    }
                                } catch (autoEvalError) {
                                    console.error("Initial auto evaluation failed:", autoEvalError);
                                }
                            }
                        } catch (err) {
                            console.error("Failed to fetch initial table data:", err);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch cross tab list:", error);
            }
        };

        fetchData();
    }, [auth?.user?.userId, PAGE_ID]);

    // Preview Data Calculation
    const previewData = useMemo(() => {
        if (rowVars.length === 0 && colVars.length === 0) return null;

        const getGroupDefinitions = (group) => {
            if (group.length === 0) return [];

            return group.map(v => {
                const variable = variables.find(existing => existing.id === v.id || existing.name === v.id || existing.name === v.name);
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

        let rowGroups = rowVars.length > 0 ? getGroupDefinitions(rowVars) : [{ name: '', labels: [''] }];

        return {
            colHeaderRows,
            rowGroups,
            totalDataCols,
            maxColLevels,
            maxRowLevels: 2
        };
    }, [rowVars, colVars, variables]);

    // Update Result Data from Preview
    // Update Result Data from Preview
    useEffect(() => {
        // Clear result data resultData manually handled to avoid race conditions
        // setResultData(null); 
        // setIsStatsOptionsOpen(false);
    }, [previewData]);

    // Reset horizontal scroll position when colVars changes
    useEffect(() => {
        const colDropZone = document.querySelector('.col-drop-zone');
        if (colDropZone) {
            colDropZone.scrollLeft = 0;
        }
    }, [colVars]);

    const handleRunAiAnalysis = () => {
        setIsAiLoading(true);
        // Simulate analyzing process
        setTimeout(() => {
            setAiResult([
                "전체 응답은 High 이상 구간이 높아 전반적으로 긍정적인 반응을 보였습니다.",
                "배너 중 Banner C가 모든 구간에서 가장 높은 반응도를 기록했습니다.",
                "데이터 분산이 낮아 결과의 안정성과 신뢰도가 확보되었습니다."
            ]);
            setIsAiLoading(false);
        }, 1500);
    };

    // Chart type name mapping
    const getChartTypeName = (mode) => {
        const typeMap = {
            'column': 'column',
            'bar': 'bar',
            'stackedColumn': 'stacked_column',
            'stacked100Column': 'stacked_100_column',
            'line': 'line',
            'pie': 'pie',
            'donut': 'donut',
            'radarArea': 'radar',
            'funnel': 'funnel',
            'scatterPoint': 'scatter',
            'area': 'area',
            'map': 'map',
            'heatmap': 'heatmap'
        };
        return typeMap[mode] || 'chart';
    };

    const handleDownload = async (format) => {
        const typeName = getChartTypeName(chartMode || 'column');
        const fileName = `${tableName || 'CrossTab'}_${typeName}`;

        if (!chartContainerRef.current) {
            alert('차트를 찾을 수 없습니다.');
            return;
        }

        try {
            // Find the chart element first (for regular charts)
            let chartElement = chartContainerRef.current.querySelector('.k-chart');
            let svgElement;

            if (chartElement) {
                // Regular Kendo chart
                svgElement = chartElement.querySelector('svg');
            } else {
                // Map chart - find SVG but exclude zoom controls
                // Look for SVG that's not inside the zoom control buttons
                const allSvgs = chartContainerRef.current.querySelectorAll('svg');
                // Filter out small SVGs (likely icons) and get the main map SVG
                svgElement = Array.from(allSvgs).find(svg => {
                    const bbox = svg.getBBox();
                    return bbox.width > 100 && bbox.height > 100; // Main map will be larger
                });

                if (!svgElement && allSvgs.length > 0) {
                    // Fallback to the largest SVG
                    svgElement = Array.from(allSvgs).reduce((largest, current) => {
                        const currentBox = current.getBBox();
                        const largestBox = largest.getBBox();
                        return (currentBox.width * currentBox.height) > (largestBox.width * largestBox.height) ? current : largest;
                    });
                }
            }

            if (!svgElement) {
                alert('차트 SVG를 찾을 수 없습니다.');
                return;
            }

            // Get SVG dimensions
            const bbox = svgElement.getBBox();
            const viewBox = svgElement.getAttribute('viewBox');
            let width, height;

            if (viewBox) {
                const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
                width = vbWidth;
                height = vbHeight;
            } else {
                width = bbox.width || svgElement.width.baseVal.value || 800;
                height = bbox.height || svgElement.height.baseVal.value || 600;
            }

            // Clone and prepare SVG
            const clonedSvg = svgElement.cloneNode(true);
            clonedSvg.setAttribute('width', width);
            clonedSvg.setAttribute('height', height);
            if (!viewBox) {
                clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            }

            const svgString = new XMLSerializer().serializeToString(clonedSvg);

            if (format === 'svg') {
                // Direct SVG download
                const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${fileName}.svg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else if (format === 'png') {
                // Convert SVG to PNG with proper dimensions
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    // Use SVG dimensions for canvas
                    canvas.width = width * 2; // 2x for better quality
                    canvas.height = height * 2;

                    // Fill white background
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw image scaled
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        saveAs(blob, `${fileName}.png`);
                    });
                };

                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
            }

            setShowDownloadMenu(false);
        } catch (error) {
            console.error('Chart export error:', error);
            alert('차트 다운로드 중 오류가 발생했습니다.');
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
                setShowDownloadMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSortDragStart = (e, index, type) => {
        e.dataTransfer.setData('dragIndex', index);
        e.dataTransfer.setData('type', type);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleSortDrop = (e, dropIndex, type) => {
        const dragIndex = Number(e.dataTransfer.getData('dragIndex'));
        const dragType = e.dataTransfer.getData('type');

        if (dragType !== type) return;
        if (dragIndex === dropIndex) return;

        if (type === 'layout') {
            const newOptions = [...layoutOptions];
            const [draggedItem] = newOptions.splice(dragIndex, 1);
            newOptions.splice(dropIndex, 0, draggedItem);
            setLayoutOptions(newOptions);
        } else if (type === 'stats') {
            const newOptions = [...statsOptions];
            const [draggedItem] = newOptions.splice(dragIndex, 1);
            newOptions.splice(dropIndex, 0, draggedItem);
            setStatsOptions(newOptions);
        }
    };

    const toggleLayoutOption = (id) => {
        setLayoutOptions(layoutOptions.map(opt =>
            opt.id === id ? { ...opt, checked: !opt.checked } : opt
        ));
    };

    const toggleStatOption = (id) => {
        setStatsOptions(statsOptions.map(opt =>
            opt.id === id ? { ...opt, checked: !opt.checked } : opt
        ));
    };

    // Filter tables based on search term
    const filteredTables = tables.filter(table =>
        table.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
    );

    // Filter variables based on search term
    const filteredVariables = variables.filter(variable =>
        variable?.name?.toLowerCase().includes(variableSearchTerm.toLowerCase()) ||
        variable?.label?.toLowerCase().includes(variableSearchTerm.toLowerCase())
    );

    // Result Data State
    const [resultData, setResultData] = useState(null);

    const chartData = resultData ? resultData.columns.map((colName, colIndex) => {
        const dataPoint = { name: colName };
        resultData.rows.forEach(row => {
            if (row.label === '합계' || row.label === '전체') {
                dataPoint.total = row.values[colIndex]?.count || 0;
            } else {
                const pct = row.values[colIndex]?.percent;
                dataPoint[row.label] = pct ? parseFloat(pct) : 0;
            }
        });
        return dataPoint;
    }) : [];

    const seriesNames = resultData ? resultData.rows
        .filter(row => row.label !== '합계' && row.label !== '전체')
        .map(row => row.label) : [];

    const handleCopyTable = async () => {
        try {
            const headers = ['문항', ...resultData.columns].join('\t');
            const rows = resultData.rows.map(row =>
                [row.label, ...row.values.map(v => {
                    if (displayMode === 'value') return v.count;
                    if (displayMode === 'percent') return `${v.percent}%`;
                    return `${v.count} (${v.percent}%)`;
                })].join('\t')
            ).join('\n');
            await navigator.clipboard.writeText(`${headers}\n${rows}`);
            setToast({ show: true, message: "복사 완료 (Ctrl+V)" });
        } catch (e) {
            console.error(e);
            setToast({ show: true, message: "복사 실패" });
        }
    };

    const handleCopyStats = async () => {
        try {
            const headers = ['통계', ...resultData.columns].join('\t');
            const rows = statsOptions.filter(opt => opt.checked).map(stat => {
                const statKey = stat.id.toLowerCase();
                const statValues = resultData.stats[statKey] || [];
                return [`Region Group_${stat.label}`, ...statValues].join('\t');
            }).join('\n');
            await navigator.clipboard.writeText(`${headers}\n${rows}`);
            setToast({ show: true, message: "복사 완료 (Ctrl+V)" });
        } catch (e) {
            console.error(e);
            setToast({ show: true, message: "복사 실패" });
        }
    };

    const handleTableSelect = async (item) => {
        setSelectedTableId(item.id);
        setTableName(item.name || "");
        setIsConfigOpen(false);


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

                if (result?.success === "777" && result.resultjson) {
                    const data = result.resultjson;

                    // Apply config from API result
                    if (data.config) {
                        // x_info -> 가로축 (Cols)
                        if (data.config.x_info) {
                            const xIds = data.config.x_info;
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
                        if (data.config.y_info) {
                            const yIds = data.config.y_info;
                            let mappedRows = [];
                            if (yIds.length === 1 && typeof yIds[0] === 'string' && (yIds[0].includes('*') || yIds[0].includes('+'))) {
                                mappedRows = yIds[0].split(/[+*]/).filter(id => id.trim()).map(id => {
                                    const trimmed = id.trim();
                                    return variables.find(v => v.name === trimmed || v.id === trimmed) || { id: trimmed, name: trimmed };
                                });
                            } else {
                                mappedRows = yIds.map(id => variables.find(v => v.name === id || v.id === id) || { id, name: id });
                            }
                            setRowVars(mappedRows);
                        }
                        // Filter Expression
                        if (data.config.filter_expression !== undefined) {
                            setFilterExpression(data.config.filter_expression);
                        }
                        // Weight Column
                        if (data.config.weight_col !== undefined) {
                            setSelectedWeight(data.config.weight_col || "없음");
                        }
                    }

                    const columnsList = data.columns || [];
                    const rowsList = data.rows || [];

                    const columnLabels = columnsList.map(c => c.label);
                    const columnKeys = columnsList.map(c => c.key);

                    const parsedRows = rowsList.map(r => {
                        const processedValues = columnKeys.map(k => {
                            const cell = r.cells?.[k];
                            return {
                                count: cell?.count || 0,
                                percent: cell?.percent || "0.0"
                            };
                        });
                        const total = processedValues.reduce((a, b) => a + Number(b.count), 0);
                        return {
                            label: r.label,
                            values: processedValues,
                            total: total
                        };
                    });

                    const parsedStats = {
                        mean: columnsList.map(c => c.mean !== undefined ? c.mean : '-'),
                        std: columnsList.map(c => c.std !== undefined ? c.std : '-'),
                        min: columnsList.map(c => c.min !== undefined ? c.min : '-'),
                        max: columnsList.map(c => c.max !== undefined ? c.max : '-'),
                        n: columnsList.map(c => c.n || 0)
                    };

                    setResultData({
                        columns: columnLabels,
                        rows: parsedRows,
                        stats: parsedStats
                    });

                    try {
                        const config = data.config || {};
                        const xInfo = config.x_info || [];
                        const yInfo = config.y_info || [];
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
                                    const found = variables.find(v => v.id === part || v.name === part);
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
                            const weightVar = variables.find(v => v.id === weightCol || v.name === weightCol);
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
                            pageid: PAGE_ID,
                            variables: variablesMap,
                            weight_col: weightId,
                            filter_expression: filterExpr,
                            include_stats: ALL_STATS,
                            // sort: { group_by: "label2_label3" }
                        };

                        const localIsSeparated = yInfo.length > 1 || (yInfo.length === 1 && !yInfo[0].includes('+') && tableMode === 'separated');

                        if (localIsSeparated) {
                            runPayload.tables = yInfo.map((yId, idx) => ({
                                id: `${item.id}_${idx + 1}`,
                                name: `${item.name || "Untitled Table"} - ${yId}`,
                                x_info: xInfo,
                                y_info: [yId]
                            }));
                        } else {
                            runPayload.table = {
                                id: item.id,
                                name: item.name || "Untitled Table",
                                x_info: xInfo,
                                y_info: yInfo
                            };
                        }

                        const evalResult = localIsSeparated
                            ? await evaluateTables.mutateAsync(runPayload)
                            : await evaluateTable.mutateAsync(runPayload);

                        if (evalResult?.success === "777" && evalResult.resultjson) {
                            const newData = evalResult.resultjson;
                            const newColumnsList = newData.columns || [];
                            const newRowsList = newData.rows || [];
                            const newColumnLabels = newColumnsList.map(c => c.label);
                            const newColumnKeys = newColumnsList.map(c => c.key);

                            const newParsedRows = newRowsList.map(r => {
                                const processedValues = newColumnKeys.map(k => {
                                    const cell = r.cells?.[k];
                                    return {
                                        count: cell?.count || 0,
                                        percent: cell?.percent || "0.0"
                                    };
                                });
                                const total = processedValues.reduce((a, b) => a + Number(b.count), 0);
                                return { label: r.label, values: processedValues, total: total };
                            });

                            const statsMap = newData.stats || {};
                            const newParsedStats = {
                                mean: newColumnsList.map(c => statsMap[c.key]?.mean ?? '-'),
                                median: newColumnsList.map(c => statsMap[c.key]?.median ?? '-'),
                                mode: newColumnsList.map(c => statsMap[c.key]?.mode ?? '-'),
                                std: newColumnsList.map(c => statsMap[c.key]?.std ?? '-'),
                                min: newColumnsList.map(c => statsMap[c.key]?.min ?? '-'),
                                max: newColumnsList.map(c => statsMap[c.key]?.max ?? '-'),
                                n: newColumnsList.map(c => statsMap[c.key]?.n ?? 0),
                                rse: newColumnsList.map(c => statsMap[c.key]?.rse ?? '-'),
                                chi2: newColumnsList.map(c => statsMap[c.key]?.chi2 ?? '-'),
                                df: newColumnsList.map(c => statsMap[c.key]?.df ?? '-'),
                                p_value: newColumnsList.map(c => statsMap[c.key]?.p_value ?? '-'),
                            };

                            setResultData({
                                columns: newColumnLabels,
                                rows: newParsedRows,
                                stats: newParsedStats
                            });
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
            }
        }
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
        setIsConfigOpen(true);

        // 다음 렌더 후 사이드바 목록을 맨 아래로 스크롤
        setTimeout(() => {
            if (tableListRef.current) {
                tableListRef.current.scrollTop = tableListRef.current.scrollHeight;
            }
        }, 0);
    };

    const handleDragStart = (e, dragData) => {
        // dragData가 드롭존 내부 아이템인지 확인 (ROW_ITEM, COL_ITEM, COL_GROUP만 내부 이동용)
        const isDragZoneItem = ['ROW_ITEM', 'COL_ITEM', 'COL_GROUP'].includes(dragData.type);
        const payload = isDragZoneItem
            ? dragData
            : { type: 'NEW', item: dragData };
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

        const dragType = currentDraggedItem.type || 'NEW';
        const item = currentDraggedItem.item || (dragType === 'NEW' ? currentDraggedItem : null);
        const srcGroupIndex = currentDraggedItem.groupIndex;
        const srcItemIndex = currentDraggedItem.itemIndex;

        const fullVariable = item ? (variables.find(v => v.id === item.id) || item) : null;
        const newItem = fullVariable ? {
            id: fullVariable.id,
            name: fullVariable.name,
            label: fullVariable.label || fullVariable.name,
            info: fullVariable.info || []
        } : null;

        if (targetType === 'row' || targetType === 'row_item') {
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
                    modal.showAlert('알림', '세로축(행)은 최대 10개까지만 등록할 수 있습니다.');
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
                return;
            }

            if (!newItem) {
                setDraggedItem(null);
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
                        if (newColVars[targetGroupIndex].length < 2 && !newColVars[targetGroupIndex].find(v => v.id === newItem.id)) {
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
                    if (newColVars[targetGroupIndex].length < 2 && !newColVars[targetGroupIndex].find(v => v.id === newItem.id)) {
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
                tableid: selectedTableId,
                pageid: PAGE_ID,
                name: tableName || "Untitled Table",
                config: {
                    x_info: colVars.filter(g => g.length > 0).length > 0 ? [colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*')).join('+')] : [],
                    y_info: rowVars.length > 0 ? (tableMode === 'separated' ? rowVars.map(v => v.id || v.name) : [rowVars.map(v => v.id || v.name).join(' + ')]) : [],
                    filter_expression: filterExpression,
                    weight_col: selectedWeight === "없음" ? "" : selectedWeight
                }
            };

            const result = await saveCrossTable.mutateAsync(payload);
            if (result?.success === "777") {
                modal.showAlert('성공', '저장되었습니다.');
                setIsConfigOpen(false); // Close config panel after save

                // If it was a new table, mark it as not new anymore
                if (isNewTable) {
                    setTables(tables.map(t =>
                        t.id === selectedTableId ? { ...t, isNew: false } : t
                    ));
                }

                // Refresh data after save
                try {
                    const refreshedData = await getCrossTabData.mutateAsync({
                        user: auth.user.userId,
                        tableid: selectedTableId
                    });

                    if (refreshedData?.success === "777" && refreshedData.resultjson) {
                        const data = refreshedData.resultjson;
                        const columnsList = data.columns || [];
                        const rowsList = data.rows || [];

                        const columnLabels = columnsList.map(c => c.label);
                        const columnKeys = columnsList.map(c => c.key);

                        const parsedRows = rowsList.map(r => {
                            const values = columnKeys.map(k => r.cells?.[k]?.count || 0);
                            const total = values.reduce((a, b) => a + Number(b), 0);
                            return {
                                label: r.label,
                                values: values,
                                total: total
                            };
                        });

                        const statsMap = data.stats || {};
                        const parsedStats = {
                            mean: columnsList.map(c => statsMap[c.key]?.mean ?? '-'),
                            med: columnsList.map(c => statsMap[c.key]?.median ?? '-'),
                            mod: columnsList.map(c => statsMap[c.key]?.mode ?? '-'),
                            std: columnsList.map(c => statsMap[c.key]?.std ?? '-'),
                            min: columnsList.map(c => statsMap[c.key]?.min ?? '-'),
                            max: columnsList.map(c => statsMap[c.key]?.max ?? '-'),
                            n: columnsList.map(c => statsMap[c.key]?.n ?? 0)
                        };

                        setResultData({
                            columns: columnLabels,
                            rows: parsedRows,
                            stats: parsedStats
                        });
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
                tableid: selectedTableId,
                pageid: PAGE_ID,
                name: tableName || "Untitled Table",
                config: {
                    x_info: colVars.filter(g => g.length > 0).length > 0 ? [colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*')).join('+')] : [],
                    y_info: rowVars.length > 0 ? (tableMode === 'separated' ? rowVars.map(v => v.id || v.name) : [rowVars.map(v => v.id || v.name).join(' + ')]) : [],
                    filter_expression: filterExpression,
                    weight_col: weightId
                }
            };

            const saveResult = await saveCrossTable.mutateAsync(savePayload);

            if (saveResult?.success === "777") {
                // Update new table status
                if (isNewTable) {
                    setTables(tables.map(t =>
                        t.id === selectedTableId ? { ...t, isNew: false } : t
                    ));
                }

                // Run Analysis
                const variablesMap = {};

                // Helper to extract raw variables from interaction strings
                const extractRawVars = (arr) => {
                    if (!Array.isArray(arr)) return;
                    arr.forEach(str => {
                        if (typeof str !== 'string') return;
                        const parts = str.split(/[+*]/).map(s => s.trim()).filter(Boolean);
                        parts.forEach(part => {
                            const found = variables.find(v => v.id === part || v.name === part);
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
                    const weightVar = variables.find(v => (v.id || v.name) === weightId);
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
                    pageid: PAGE_ID,
                    variables: variablesMap,
                    weight_col: weightId,
                    filter_expression: filterExpression,
                    include_stats: ALL_STATS,
                    // sort: { group_by: "label2_label3" }
                };

                if (tableMode === 'separated') {
                    runPayload.tables = rowVars.map((v, idx) => ({
                        id: `${selectedTableId || 'T1'}_${idx + 1}`,
                        name: `${baseTableName} - ${v.label || v.name || v.id}`,
                        x_info: xInfo,
                        y_info: [v.id || v.name]
                    }));
                } else {
                    runPayload.table = {
                        id: selectedTableId || 'T1',
                        name: baseTableName,
                        x_info: xInfo,
                        y_info: rowVars.length > 0 ? [rowVars.map(v => v.id || v.name).join(' + ')] : []
                    };
                }

                const evalResult = tableMode === 'separated'
                    ? await evaluateTables.mutateAsync(runPayload)
                    : await evaluateTable.mutateAsync(runPayload);

                if (evalResult?.success === "777" && evalResult.resultjson) {
                    let newData = evalResult.resultjson;

                    // 표 분리 모드일 경우 첫 번째 테이블 결과 추출
                    if (tableMode === 'separated' && newData.results && Array.isArray(newData.results) && newData.results.length > 0) {
                        newData = newData.results[0].result || newData.results[0];
                    }

                    const newColumnsList = newData.columns || [];
                    const newRowsList = newData.rows || [];

                    const newColumnLabels = newColumnsList.map(c => c.label);
                    const newColumnKeys = newColumnsList.map(c => c.key);

                    const newParsedRows = newRowsList.map(r => {
                        const processedValues = newColumnKeys.map(k => {
                            const cell = r.cells?.[k];
                            return {
                                count: cell?.count || 0,
                                percent: cell?.percent || "0.0"
                            };
                        });
                        const total = processedValues.reduce((a, b) => a + Number(b.count), 0);
                        return { label: r.label, values: processedValues, total: total };
                    });

                    const statsMap = newData.stats || {};
                    const newParsedStats = {
                        mean: newColumnsList.map(c => statsMap[c.key]?.mean ?? (c.mean !== undefined ? c.mean : '-')),
                        median: newColumnsList.map(c => statsMap[c.key]?.median ?? statsMap[c.key]?.med ?? (c.median !== undefined ? c.median : (c.med !== undefined ? c.med : '-'))),
                        mode: newColumnsList.map(c => statsMap[c.key]?.mode ?? statsMap[c.key]?.mod ?? (c.mode !== undefined ? c.mode : (c.mod !== undefined ? c.mod : '-'))),
                        std: newColumnsList.map(c => statsMap[c.key]?.std ?? (c.std !== undefined ? c.std : '-')),
                        min: newColumnsList.map(c => statsMap[c.key]?.min ?? (c.min !== undefined ? c.min : '-')),
                        max: newColumnsList.map(c => statsMap[c.key]?.max ?? (c.max !== undefined ? c.max : '-')),
                        n: newColumnsList.map(c => statsMap[c.key]?.n ?? (c.n !== undefined ? c.n : 0)),
                        rse: newColumnsList.map(c => statsMap[c.key]?.rse ?? (c.rse !== undefined ? c.rse : '-')),
                        chi2: newColumnsList.map(c => statsMap[c.key]?.chi2 ?? (c.chi2 !== undefined ? c.chi2 : '-')),
                        df: newColumnsList.map(c => statsMap[c.key]?.df ?? (c.df !== undefined ? c.df : '-')),
                        p_value: newColumnsList.map(c => statsMap[c.key]?.p_value ?? (c.p_value !== undefined ? c.p_value : '-')),
                    };

                    setResultData({
                        columns: newColumnLabels,
                        rows: newParsedRows,
                        stats: newParsedStats
                    });

                    // Success - Close config
                    setIsConfigOpen(false);
                    modal.showAlert("알림", "저장 및 실행이 완료되었습니다.");

                } else {
                    modal.showAlert('알림', '저장은 되었으나 분석에 실패했습니다.');
                }

            } else {
                modal.showAlert('실패', '저장 실패');
            }

        } catch (error) {
            console.error("Save & Run error:", error);
            modal.showAlert('오류', '오류가 발생했습니다.');
        }
    };

    const handleRun = async (overrideFilter) => {
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
                    const found = variables.find(v => v.id === part || v.name === part);
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
            const weightVar = variables.find(v => v.name === selectedWeight || v.id === selectedWeight);
            if (weightVar) {
                const wId = weightVar.id || weightVar.name;
                variablesMap[wId] = weightVar;
                weightId = wId;
            }
        }

        const currentFilter = overrideFilter !== undefined ? overrideFilter : filterExpression;

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
            pageid: PAGE_ID,
            variables: variablesMap,
            weight_col: weightId,
            filter_expression: currentFilter,
            include_stats: ALL_STATS,
            // sort: { group_by: "label2_label3" }
        };

        if (tableMode === 'separated') {
            payload.tables = rowVars.map((v, idx) => ({
                id: `${selectedTableId || 'T1'}_${idx + 1}`,
                name: `${baseTableName} - ${v.label || v.name || v.id}`,
                x_info: xInfo,
                y_info: [v.id || v.name]
            }));
        } else {
            payload.table = {
                id: selectedTableId || 'T1',
                name: baseTableName,
                x_info: xInfo,
                y_info: rowVars.length > 0 ? [rowVars.map(v => v.id || v.name).join(' + ')] : []
            };
        }

        try {
            const result = tableMode === 'separated'
                ? await evaluateTables.mutateAsync(payload)
                : await evaluateTable.mutateAsync(payload);

            if (result?.success === "777" && result.resultjson) {
                let data = result.resultjson;

                // 표 분리 모드일 경우 첫 번째 테이블 결과 추출
                if (tableMode === 'separated' && data.results && Array.isArray(data.results) && data.results.length > 0) {
                    data = data.results[0].result || data.results[0];
                }

                const columnsList = data.columns || [];
                const rowsList = data.rows || [];

                const columnLabels = columnsList.map(c => c.label);
                const columnKeys = columnsList.map(c => c.key);

                const parsedRows = rowsList.map(r => {
                    const processedValues = columnKeys.map(k => {
                        const cell = r.cells?.[k];
                        return {
                            count: cell?.count || 0,
                            percent: cell?.percent || "0.0"
                        };
                    });
                    const total = processedValues.reduce((a, b) => a + Number(b.count), 0);
                    return {
                        label: r.label,
                        values: processedValues,
                        total: total
                    };
                });

                const statsMap = data.stats || {};
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

                setResultData({
                    columns: columnLabels,
                    rows: parsedRows,
                    stats: parsedStats
                });

                setIsConfigOpen(false);
            }
            else {
                modal.showAlert('실패', '분석 실행 실패');
            }
        } catch (error) {
            console.error("Evaluate error:", error);
            modal.showAlert('오류', '분석 실행 중 오류가 발생했습니다.');
        }
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
                            const payload = {
                                user: auth.user.userId,
                                tableid: tableId
                            };

                            const result = await deleteCrossTable.mutateAsync(payload);
                            if (result?.success === "777") {
                                // Remove from local state
                                setTables(tables.filter(t => t.id !== tableId));

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

    return (
        <div className="cross-tab-page" data-theme="data-dashboard">
            <DataHeader
                title="추가분석"
            >

                {/* 고급 필터 버튼 - LogicEditPopup 오픈 */}
                <button
                    onClick={() => setIsFilterPopupOpen(true)}
                    className={`advanced-filter-btn ${filterExpression ? 'active' : ''}`}
                >
                    <Filter size={15} />
                    고급 필터{filterExpression ? ' ✓' : ''}
                </button>

                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: '38px',
                        padding: '0 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#444',
                        cursor: 'pointer',
                        marginTop: '5px',
                        marginLeft: '12px'
                    }}
                >
                    <Plus size={16} />
                    추가
                </button>
            </DataHeader>

            <Toast
                show={toast.show}
                message={toast.message}
                onClose={() => setToast({ ...toast, show: false })}
            />

            <div className="cross-tab-layout">
                {/* Sidebar */}
                <SideBar
                    title="테이블 목록"
                    items={filteredTables}
                    selectedId={selectedTableId}
                    onItemClick={handleTableSelect}
                    onSearch={setTableSearchTerm}
                    onDelete={handleDeleteTable}
                    displayField="name"
                    searchPlaceholder="테이블을 검색하세요."
                    listRef={tableListRef}
                />

                {/* Main Content */}
                <div className="cross-tab-main">
                    {/* Config Section */}
                    <div className="config-section" style={{
                        flex: isConfigOpen ? 1 : '0 0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                        transition: 'all 0.3s ease'
                    }}>
                        <div className="config-header" style={{ padding: isConfigOpen ? '20px 24px' : '8px 24px', transition: 'all 0.2s' }}>
                            <div className="config-header__left-group">
                                <div
                                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                    {isConfigOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>

                                <div className="config-header__title-group">
                                    <span className="config-header__title-label">테이블 명</span>
                                    <input
                                        type="text"
                                        className="config-title-input"
                                        value={tableName}
                                        onChange={(e) => setTableName(e.target.value)}
                                        placeholder="테이블 명을 입력하세요"
                                    />
                                </div>
                            </div>

                            {/* Table Mode Switch */}
                            {isConfigOpen && (
                                <>
                                    {/* Table Mode Switch */}
                                    <div className="table-mode-switch">
                                        <button
                                            className={`mode-option-btn ${tableMode === 'separated' ? 'active' : ''}`}
                                            onClick={() => setTableMode('separated')}
                                        >
                                            표 분리
                                        </button>
                                        <button
                                            className={`mode-option-btn ${tableMode === 'merged' ? 'active' : ''}`}
                                            onClick={() => setTableMode('merged')}
                                        >
                                            표 병합
                                        </button>
                                    </div>

                                    <div className="action-buttons">
                                        <button className="btn-run" onClick={handleSaveAndRun}>
                                            <Play size={16} fill="white" /> 저장 후 실행
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {isConfigOpen && (
                            <div className="config-body" style={{
                                flex: 1,
                                height: 'auto',
                                overflow: 'hidden'
                            }}>
                                {/* Variable Panel */}
                                <div className={`variable-panel ${!isVariablePanelOpen ? 'collapsed' : ''}`}>
                                    <div className="variable-panel-header" style={{ justifyContent: isVariablePanelOpen ? 'space-between' : 'center', gap: '8px', padding: '16px' }}>
                                        {isVariablePanelOpen && (
                                            <div className="search-input-wrapper" style={{ flex: 1 }}>
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
                                        )}
                                        <button
                                            className="toggle-button"
                                            onClick={() => setIsVariablePanelOpen(!isVariablePanelOpen)}
                                            style={{ flexShrink: 0, padding: 0 }}
                                        >
                                            {isVariablePanelOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                                        </button>
                                    </div>

                                    {isVariablePanelOpen && (
                                        <div className="variable-list">
                                            {filteredVariables.map(v => (
                                                <div
                                                    key={v.id}
                                                    className="variable-item"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, v)}
                                                >
                                                    <div className="variable-item__name">{v.id}</div>
                                                    <div className="variable-item__label">{v.label}</div>
                                                </div>
                                            ))}
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
                                            <span className="drop-zone-label">가로축 (열)</span>
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
                                                                    key={v.id}
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
                                                            {group.length < 2 && Array.from({ length: 2 - group.length }).map((_, i) => (
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
                                            <span className="drop-zone-label">세로축 (행)</span>
                                            <div className="drop-zone-area vertical">
                                                {rowVars.length === 0 ? (
                                                    <div className="drop-zone-placeholder vertical">문항을 여기로<br />드래그하세요</div>
                                                ) : (
                                                    rowVars.map((v, itemIndex) => (
                                                        <div
                                                            key={v.id}
                                                            className="dropped-tag row-tag"
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, { type: 'ROW_ITEM', itemIndex, item: v })}
                                                            onDragOver={handleDragOver}
                                                            onDrop={(e) => handleDrop(e, 'row_item', null, itemIndex)}
                                                        >
                                                            <span className="item-drag-handle"><GripVertical size={13} strokeWidth={2.5} /></span>
                                                            <span className="tag-text">{v.id}</span>
                                                            <X size={14} className="remove" style={{ flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); removeVar(v.id, 'row'); }} />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Center Content: Filter & Weight */}
                                        <div className="center-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, overflow: 'hidden' }}>
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
                                                                            style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4', top: `${rIndex * 40}px` }}
                                                                        >
                                                                            {cell.label}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </thead>
                                                        <tbody>
                                                            {previewData.rowGroups.map((group, groupIdx) => (
                                                                group.labels.map((label, labelIdx) => (
                                                                    <tr key={`${groupIdx}-${labelIdx}`}>
                                                                        {group.name === '' ? (
                                                                            <td colSpan={2} className="preview-td row-head sticky-left" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                                                                {label}
                                                                            </td>
                                                                        ) : (
                                                                            <>
                                                                                {labelIdx === 0 && (
                                                                                    <td rowSpan={group.labels.length} className="preview-td row-group-head sticky-left">
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
                                                                ))
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            <div className="filter-weight-row" style={{ display: 'flex', gap: '20px', position: 'sticky', bottom: 0, background: '#f8f9fa', zIndex: 10, padding: '8px 12px', borderTop: '1px solid #e0e0e0', alignItems: 'center', boxShadow: '0 -2px 5px rgba(0,0,0,0.05)' }}>
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

                    {/* Result Section */}
                    <div className="result-section" style={{
                        flex: isConfigOpen ? '0 0 auto' : 1,
                        transition: 'all 0.3s ease',
                        minHeight: 0,
                        overflow: 'hidden'
                    }}>
                        <div
                            className="result-header"
                            onClick={() => isConfigOpen && setIsConfigOpen(false)}
                            style={{ cursor: isConfigOpen ? 'pointer' : 'default' }}
                        >
                            <div className="result-tabs">
                                <div className="result-tab">결과</div>
                                {!isConfigOpen && (
                                    <button
                                        onClick={() => setIsStatsOptionsOpen(!isStatsOptionsOpen)}
                                        className={`stats-toggle-btn ${isStatsOptionsOpen ? 'active' : ''}`}
                                    >
                                        <Settings size={14} />
                                        <span>옵션 설정</span>
                                    </button>
                                )}
                            </div>
                            <div className="view-options">
                                {!isConfigOpen && layoutOptions.find(opt => opt.id === 'chart')?.checked && (
                                    <>
                                        {/* Download Button */}
                                        <div className="download-menu-container" ref={downloadMenuRef}>
                                            <button
                                                className={`view-option-btn download-btn ${showDownloadMenu ? 'active' : ''}`}
                                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                                title="차트 다운로드"
                                            >
                                                <Download size={18} />
                                            </button>
                                            {showDownloadMenu && (
                                                <div className="download-dropdown">
                                                    <button onClick={() => handleDownload('png')}>
                                                        PNG (이미지)
                                                    </button>
                                                    <button onClick={() => handleDownload('svg')}>
                                                        SVG (PPT용)
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button className={`view-option-btn ${!chartMode || chartMode === 'column' ? 'active' : ''}`} onClick={() => setChartMode('column')} title="세로 막대형"><BarChart2 size={18} /></button>
                                        {/* <button className={`view-option-btn ${chartMode === 'bar' ? 'active' : ''}`} onClick={() => setChartMode('bar')} title="가로 막대형"><BarChartHorizontal size={18} /></button> */}
                                        <button className={`view-option-btn ${chartMode === 'stackedColumn' || chartMode === 'stacked100Column' ? 'active' : ''}`} onClick={() => setChartMode('stackedColumn')} title="누적형 차트"><Layers size={18} /></button>
                                        <button className={`view-option-btn ${chartMode === 'line' ? 'active' : ''}`} onClick={() => setChartMode('line')} title="선형 차트"><LineChart size={18} /></button>
                                        <button className={`view-option-btn ${chartMode === 'pie' ? 'active' : ''}`} onClick={() => setChartMode('pie')} title="원형 차트"><PieChart size={18} /></button>
                                        <button className={`view-option-btn ${chartMode === 'donut' ? 'active' : ''}`} onClick={() => setChartMode('donut')} title="도넛형 차트"><Donut size={18} /></button>
                                        <button className={`view-option-btn ${chartMode === 'radarArea' ? 'active' : ''}`} onClick={() => setChartMode('radarArea')} title="방사형 차트"><Aperture size={18} /></button>
                                        <button className={`view-option-btn ${chartMode === 'funnel' ? 'active' : ''}`} onClick={() => setChartMode('funnel')} title="깔때기 차트"><Filter size={18} /></button>
                                        <button className={`view-option-btn ${chartMode === 'scatterPoint' ? 'active' : ''}`} onClick={() => setChartMode('scatterPoint')} title="점 도표"><MoreHorizontal size={18} /></button>
                                        <button className={`view-option-btn ${chartMode === 'area' ? 'active' : ''}`} onClick={() => setChartMode('area')} title="영역형 차트"><AreaChart size={18} /></button>
                                        <button className={`view-option-btn ${chartMode === 'map' ? 'active' : ''}`} onClick={() => setChartMode('map')} title="지도"><Map size={18} /></button>
                                        <button className={`view-option-btn ${chartMode === 'heatmap' ? 'active' : ''}`} onClick={() => setChartMode('heatmap')} title="트리맵"><LayoutGrid size={18} /></button>
                                    </>
                                )}
                            </div>
                        </div>



                        {isStatsOptionsOpen && (
                            <div className="stats-controls">
                                <div className="stats-controls__title-group">
                                    <span className="stats-controls__title">옵션 설정</span>
                                    <span className="stats-controls__subtitle">드래그 순서 변경 및 표출 선택</span>
                                </div>

                                <div className="stats-controls__section">
                                    <span className="stats-controls__section-label">배치 옵션</span>
                                    <div className="sortable-list">
                                        {/* todo 임시 주석 */}
                                        {/* {layoutOptions.map((item, index) => ( */}
                                        {layoutOptions.map((item, index) => (
                                            <div
                                                key={item.id}
                                                //      className={`sortable-item ${item.checked ? 'checked' : ''}`}
                                                // draggable
                                                // onDragStart={(e) => handleSortDragStart(e, index, 'layout')}
                                                // onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                // onDrop={(e) => handleSortDrop(e, index, 'layout')}
                                                // onClick={() => toggleLayoutOption(item.id)}
                                                className={`sortable-item ${item.checked ? 'checked' : ''} ${item.id === 'ai' ? 'disabled' : ''}`}
                                                draggable={item.id !== 'ai'}
                                                onDragStart={(e) => item.id !== 'ai' && handleSortDragStart(e, index, 'layout')}
                                                onDragOver={(e) => { if (item.id !== 'ai') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                                                onDrop={(e) => item.id !== 'ai' && handleSortDrop(e, index, 'layout')}
                                                onClick={() => item.id !== 'ai' && toggleLayoutOption(item.id)}
                                                style={item.id === 'ai' ? { opacity: 1, cursor: 'default', backgroundColor: '#f9f9f9', color: '#ccc' } : {}}
                                            >
                                                {/* <GripVertical size={14} className="drag-handle"/> */}
                                                <GripVertical size={14} className="drag-handle" style={item.id === 'ai' ? { display: 'none' } : {}} />
                                                <span>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {layoutOptions.find(opt => opt.id === 'stats')?.checked && (
                                    <>
                                        <div className="stats-controls__divider"></div>
                                        <div className="stats-controls__section">
                                            <span className="stats-controls__section-label">통계 옵션</span>
                                            <div className="sortable-list">
                                                {statsOptions.map((item, index) => {
                                                    const isMainOrChecked = ['mean', 'median', 'mode'].includes(item.id) || item.checked;
                                                    if (!isMainOrChecked) return null;
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`sortable-item ${item.checked ? 'checked' : ''}`}
                                                            draggable
                                                            onDragStart={(e) => handleSortDragStart(e, index, 'stats')}
                                                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                            onDrop={(e) => handleSortDrop(e, index, 'stats')}
                                                            onClick={() => toggleStatOption(item.id)}
                                                        >
                                                            <GripVertical size={14} className="drag-handle" />
                                                            <span>{item.label}</span>
                                                        </div>
                                                    );
                                                })}
                                                {statsOptions.some(item => !['mean', 'median', 'mode'].includes(item.id) && !item.checked) && (
                                                    <div style={{ position: 'relative' }} ref={moreStatsRef}>
                                                        <div
                                                            className="sortable-item"
                                                            style={{ padding: '0 8px', cursor: 'pointer', background: 'transparent', height: '100%', border: 'none', boxShadow: 'none' }}
                                                            onClick={() => setIsMoreStatsOpen(!isMoreStatsOpen)}
                                                        >
                                                            <div className="more-btn" style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                width: '28px', height: '28px', borderRadius: '4px',
                                                                background: isMoreStatsOpen ? '#e2e8f0' : '#f1f5f9', color: '#64748b', transition: 'background 0.2s'
                                                            }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = isMoreStatsOpen ? '#e2e8f0' : '#f1f5f9'}>
                                                                <MoreHorizontal size={14} />
                                                            </div>
                                                        </div>
                                                        {isMoreStatsOpen && (
                                                            <div style={{
                                                                position: 'absolute', top: '100%', left: '0', marginTop: '6px',
                                                                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px',
                                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                                                zIndex: 100, display: 'flex', flexDirection: 'column', padding: '4px', minWidth: '90px'
                                                            }}>
                                                                {statsOptions.filter(item => !['mean', 'median', 'mode'].includes(item.id) && !item.checked).map(item => (
                                                                    <div
                                                                        key={item.id}
                                                                        style={{
                                                                            padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                                                                            color: '#475569', borderRadius: '4px', transition: 'all 0.1s'
                                                                        }}
                                                                        onClick={() => { toggleStatOption(item.id); setIsMoreStatsOpen(false); }}
                                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#3b82f6'; }}
                                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                                                                    >
                                                                        {item.label}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="stats-controls__divider"></div>
                                <div className="stats-controls__section">
                                    <span className="stats-controls__section-label">단 설정</span>
                                    <div className="options-list" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <div className="toggle-group" style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                className={`toggle-chip ${columnLayout === 'single' ? 'active' : ''}`}
                                                onClick={() => setColumnLayout('single')}
                                            >
                                                1단
                                            </button>
                                            <button
                                                className={`toggle-chip ${columnLayout === 'double' ? 'active' : ''}`}
                                                onClick={() => setColumnLayout('double')}
                                            >
                                                2단
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isConfigOpen && (
                            <div className="result-content">

                                {/* Dynamic Result Rendering */}
                                <div className="cross-table-container" style={{
                                    display: 'grid',
                                    gridTemplateColumns: columnLayout === 'single' ? '1fr' : 'repeat(2, 1fr)',
                                    gap: '12px',
                                    alignItems: 'stretch'
                                }}>
                                    {resultData && layoutOptions.map(option => {
                                        if (!option.checked) return null;

                                        if (option.id === 'table') {
                                            return (
                                                <div key="table" className="result-block">
                                                    <div className="section-header" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div className="blue-bar"></div>
                                                            <span className="section-title">표</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div className="custom-filter-wrapper" ref={displayMenuRef} style={{ position: 'relative', width: '85px' }}>
                                                                <div
                                                                    className={`custom-filter-trigger ${isDisplayMenuOpen ? 'open' : ''}`}
                                                                    onClick={() => setIsDisplayMenuOpen(!isDisplayMenuOpen)}
                                                                    style={{
                                                                        height: '36px',
                                                                        padding: '0 8px 0 10px',
                                                                        gap: '4px',
                                                                        background: '#fff',
                                                                        border: '1px solid #e9ecef',
                                                                        borderRadius: '6px',
                                                                        fontSize: '13px',
                                                                        fontWeight: '500',
                                                                        color: '#495057',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        userSelect: 'none'
                                                                    }}
                                                                >
                                                                    <span className="trigger-text">
                                                                        {displayMode === 'all' ? '전체' : displayMode === 'value' ? '사례수' : '퍼센트'}
                                                                    </span>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trigger-icon" style={{ flexShrink: 0 }}>
                                                                        <polyline points="6 9 12 15 18 9"></polyline>
                                                                    </svg>
                                                                </div>

                                                                {isDisplayMenuOpen && (
                                                                    <div className="custom-filter-menu" style={{
                                                                        position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                                                                        width: '100%',
                                                                        padding: '4px',
                                                                        background: '#fff', border: '1px solid #e2e8f0',
                                                                        borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                                                        zIndex: 1000, overflow: 'hidden'
                                                                    }}>
                                                                        {[{ label: '전체', value: 'all' }, { label: '사례수', value: 'value' }, { label: '퍼센트', value: 'percent' }].map((item) => (
                                                                            <div
                                                                                key={item.value}
                                                                                onClick={() => {
                                                                                    setDisplayMode(item.value);
                                                                                    setIsDisplayMenuOpen(false);
                                                                                }}
                                                                                style={{
                                                                                    padding: '6px 8px',
                                                                                    cursor: 'pointer',
                                                                                    fontSize: '13px',
                                                                                    color: displayMode === item.value ? '#3b82f6' : '#495057',
                                                                                    background: displayMode === item.value ? '#eff6ff' : 'transparent',
                                                                                    transition: 'background 0.1s',
                                                                                    textAlign: 'center',
                                                                                    borderRadius: '4px',
                                                                                    userSelect: 'none'
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                    if (displayMode !== item.value) e.currentTarget.style.background = '#f1f5f9';
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                    if (displayMode !== item.value) e.currentTarget.style.background = 'transparent';
                                                                                }}
                                                                            >
                                                                                {item.label}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={handleCopyTable}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                    padding: '6px 12px', background: '#f8f9fa',
                                                                    border: '1px solid #e9ecef', borderRadius: '6px',
                                                                    fontSize: '13px', fontWeight: '500', color: '#495057',
                                                                    cursor: 'pointer', flexShrink: 0, height: '36px'
                                                                }}
                                                            >
                                                                <Copy size={14} /> 복사
                                                            </button>
                                                            <button
                                                                onClick={() => setFullscreenModal({ open: true, type: 'table' })}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                    padding: '6px 12px', background: '#f8f9fa',
                                                                    border: '1px solid #e9ecef', borderRadius: '6px',
                                                                    fontSize: '13px', fontWeight: '500', color: '#495057',
                                                                    cursor: 'pointer', flexShrink: 0
                                                                }}
                                                            >
                                                                <Maximize size={14} /> 전체화면
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="table-chart-wrapper" style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
                                                        <div className="table-wrapper" style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'auto' }}>
                                                            <table className="cross-table" style={{ width: '100%', tableLayout: 'fixed', minWidth: 'max-content', borderCollapse: 'separate', borderSpacing: 0 }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th style={{
                                                                            position: 'sticky', left: 0, top: 0, zIndex: 30,
                                                                            width: '140px', height: '50px',
                                                                            background: '#eff6ff', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                                                            fontSize: '12px', fontWeight: 'bold', color: '#334155', boxSizing: 'border-box',
                                                                            textAlign: 'center', verticalAlign: 'middle', padding: '4px'
                                                                        }}>
                                                                            문항
                                                                        </th>
                                                                        {resultData.columns.map((col, i) => (
                                                                            <th key={i} style={{
                                                                                position: 'sticky', top: 0, zIndex: 20,
                                                                                width: '100px', height: '50px',
                                                                                background: '#eff6ff', borderBottom: '1px solid #e2e8f0',
                                                                                borderRight: i === resultData.columns.length - 1 ? 'none' : '1px solid #e2e8f0',
                                                                                fontSize: '12px', fontWeight: '600', color: '#334155', boxSizing: 'border-box',
                                                                                textAlign: 'center', padding: '4px',
                                                                                whiteSpace: 'normal', wordBreak: 'keep-all', overflowWrap: 'break-word',
                                                                                verticalAlign: 'middle'
                                                                            }}>
                                                                                {col}
                                                                                {/* <div style={{ fontSize: '11px', fontWeight: '500', color: '#64748b', marginTop: '4px' }}>(n={resultData.stats.n[i]})</div> */}
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {resultData.rows.map((row, i) => (
                                                                        <tr key={i}>
                                                                            <td style={{
                                                                                position: 'sticky', left: 0, zIndex: 10,
                                                                                width: '140px', height: '36px',
                                                                                background: '#eff6ff', borderBottom: '1px solid #eee', borderRight: '1px solid #e2e8f0',
                                                                                padding: '0 8px', boxSizing: 'border-box',
                                                                                fontSize: '12px', fontWeight: '500', color: '#333',
                                                                                verticalAlign: 'middle',
                                                                                whiteSpace: 'normal', wordBreak: 'keep-all', overflowWrap: 'break-word'
                                                                            }}>
                                                                                {row.label}
                                                                            </td>
                                                                            {row.values.map((val, j) => (
                                                                                <td key={j} className="data-cell" style={{
                                                                                    width: '100px', height: '36px',
                                                                                    background: '#fff', borderBottom: '1px solid #eee',
                                                                                    borderRight: j === resultData.columns.length - 1 ? 'none' : '1px solid #eee',
                                                                                    padding: '0 8px', boxSizing: 'border-box', textAlign: 'right', verticalAlign: 'middle'
                                                                                }}>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                                                                                        {displayMode === 'all' && (
                                                                                            <>
                                                                                                <div className="cell-value">{val.count}</div>
                                                                                                <div className="cell-pct" style={{ color: '#888', fontSize: '0.9em' }}>{val.percent}%</div>
                                                                                            </>
                                                                                        )}
                                                                                        {displayMode === 'value' && <div className="cell-value" style={{ lineHeight: 'normal' }}>{val.count}</div>}
                                                                                        {displayMode === 'percent' && <div className="cell-value" style={{ lineHeight: 'normal' }}>{val.percent !== undefined ? `${val.percent}%` : '-'}</div>}
                                                                                    </div>
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (option.id === 'stats') {
                                            return (
                                                <div key="stats" className="result-block">
                                                    <div className="section-header" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div className="blue-bar"></div>
                                                            <span className="section-title">통계</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <button
                                                                onClick={handleCopyStats}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                    padding: '6px 12px', background: '#f8f9fa',
                                                                    border: '1px solid #e9ecef', borderRadius: '6px',
                                                                    fontSize: '13px', fontWeight: '500', color: '#495057',
                                                                    cursor: 'pointer', flexShrink: 0
                                                                }}
                                                            >
                                                                <Copy size={14} /> 복사
                                                            </button>
                                                            <button
                                                                onClick={() => setFullscreenModal({ open: true, type: 'stats' })}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                    padding: '6px 12px', background: '#f8f9fa',
                                                                    border: '1px solid #e9ecef', borderRadius: '6px',
                                                                    fontSize: '13px', fontWeight: '500', color: '#495057',
                                                                    cursor: 'pointer', flexShrink: 0
                                                                }}
                                                            >
                                                                <Maximize size={14} /> 전체화면
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="stats-table-container">
                                                        <table className="cross-table stats-table">
                                                            <thead>
                                                                <tr>
                                                                    <th className="stats-th-label">
                                                                        통계
                                                                    </th>
                                                                    {resultData.columns.map((col, i) => (
                                                                        <th key={i} className="stats-th-data">
                                                                            {col}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {statsOptions.filter(opt => opt.checked).map((stat) => {
                                                                    const statKey = stat.id;
                                                                    const statValues = (resultData.stats && resultData.stats[statKey]) ||
                                                                        new Array(resultData.columns.length).fill('-');

                                                                    return (
                                                                        <tr key={stat.id} className="stats-row">
                                                                            <td className="stats-td-label">
                                                                                {stat.label}
                                                                            </td>
                                                                            {statValues.map((v, i) => (
                                                                                <td key={i} className="stats-td-data">
                                                                                    {v === null || v === undefined || v === '' ? '-' : (typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : v)}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (option.id === 'chart') {
                                            return (
                                                <div key="chart" className="result-block">
                                                    <div className="section-header" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div className="blue-bar"></div>
                                                            <span className="section-title">차트</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setFullscreenModal({ open: true, type: 'chart' })}
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                padding: '6px 12px', background: '#f8f9fa',
                                                                border: '1px solid #e9ecef', borderRadius: '6px',
                                                                fontSize: '13px', fontWeight: '500', color: '#495057',
                                                                cursor: 'pointer', flexShrink: 0
                                                            }}
                                                        >
                                                            <Maximize size={14} /> 전체화면
                                                        </button>
                                                    </div>
                                                    <div ref={chartContainerRef} className="cross-tab-chart-container">
                                                        {chartData && chartData.length > 0 ? (
                                                            <div className="chart-scroll-wrapper" style={{
                                                                width: `${Math.max(100, chartData.length * 120)}px`
                                                            }}>
                                                                <KendoChart
                                                                    data={chartData}
                                                                    seriesNames={seriesNames}
                                                                    allowedTypes={
                                                                        (!chartMode || chartMode === 'column' || chartMode === 'bar') ? ['column', 'bar'] :
                                                                            chartMode === 'stackedColumn' ? ['stackedColumn', 'stacked100Column'] :
                                                                                chartMode === 'line' ? ['line'] :
                                                                                    chartMode === 'pie' ? ['pie'] :
                                                                                        chartMode === 'donut' ? ['donut'] :
                                                                                            chartMode === 'radarArea' ? ['radarArea'] :
                                                                                                chartMode === 'funnel' ? ['funnel'] :
                                                                                                    chartMode === 'scatterPoint' ? ['scatterPoint'] :
                                                                                                        chartMode === 'area' ? ['area'] :
                                                                                                            chartMode === 'map' ? ['map'] :
                                                                                                                chartMode === 'heatmap' ? ['heatmap'] : []
                                                                    }
                                                                    initialType={
                                                                        (!chartMode || chartMode === 'column') ? 'column' :
                                                                            chartMode === 'stackedColumn' ? 'stackedColumn' :
                                                                                chartMode === 'line' ? 'line' :
                                                                                    chartMode === 'pie' ? 'pie' :
                                                                                        chartMode === 'donut' ? 'donut' :
                                                                                            chartMode === 'radarArea' ? 'radarArea' :
                                                                                                chartMode === 'funnel' ? 'funnel' :
                                                                                                    chartMode === 'scatterPoint' ? 'scatterPoint' :
                                                                                                        chartMode === 'area' ? 'area' :
                                                                                                            chartMode === 'map' ? 'map' :
                                                                                                                chartMode === 'heatmap' ? 'heatmap' : 'column'
                                                                    }
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div style={{ color: '#aaa', fontSize: '14px' }}>차트를 표시할 데이터가 없습니다.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        }


                                        if (option.id === 'ai') {
                                            return (
                                                <div key="ai" className="result-block">
                                                    <div className="section-header">
                                                        <div className="blue-bar"></div>
                                                        <span className="section-title">AI 분석</span>
                                                    </div>
                                                    <div className="ai-analysis-container" style={{ flex: 1, minHeight: 0 }}>
                                                        {!aiResult && !isAiLoading && (
                                                            <button className="btn-ai-analysis" onClick={handleRunAiAnalysis}>
                                                                <Bot size={18} />
                                                                <span>AI 분석 실행</span>
                                                            </button>
                                                        )}

                                                        {isAiLoading && (
                                                            <div className="ai-loading">
                                                                <Loader2 size={32} className="spin-icon" />
                                                                <span>AI가 데이터를 분석하고 있습니다...</span>
                                                            </div>
                                                        )}

                                                        {aiResult && (
                                                            <div className="ai-result-box">
                                                                <div className="ai-result-header">
                                                                    <Bot size={18} className="sparkle-icon" />
                                                                    <span>분석 결과 요약</span>
                                                                </div>
                                                                <div className="ai-result-content">
                                                                    {aiResult.map((text, idx) => (
                                                                        <div key={idx} className="ai-result-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                                                                            <CheckCircle2 size={16} className="check-icon" />
                                                                            <p>{text}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <button className="btn-ai-reset" onClick={() => setAiResult(null)}>
                                                                    다시 분석하기
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* Fullscreen Modal */}
            <FullscreenModal
                isOpen={fullscreenModal.open}
                type={fullscreenModal.type}
                onClose={() => setFullscreenModal({ open: false, type: null })}
                resultData={resultData}
                statsOptions={statsOptions}
                chartData={chartData}
                seriesNames={seriesNames}
                chartMode={chartMode}
            />

            <CreateTablePopup
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateTable}
            />

            <PageListPopup
                isOpen={isPageListOpen}
                onClose={() => setIsPageListOpen(false)}
                data={pageListData}
                onSelect={handlePageSelected}
            />
            {/* 고급 필터 LogicEditPopup */}
            {isFilterPopupOpen && (
                <LogicEditPopup
                    variable={{ id: 'filter', logic: filterExpression }}
                    variablesList={variables.map(v => ({ sysName: v.id, label: v.label }))}
                    onClose={() => setIsFilterPopupOpen(false)}
                    onSave={(_, logicStr) => {
                        setFilterExpression(logicStr);
                        setIsFilterPopupOpen(false);
                        handleRun(logicStr);
                    }}
                    theme="data-dashboard"
                />
            )}
        </div >
    );
};

export default AdditionalAnalysisPage;
