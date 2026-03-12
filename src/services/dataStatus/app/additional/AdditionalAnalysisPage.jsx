import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, ChevronUp, Play, Search, BarChart2, BarChartHorizontal, Download, X, Settings, ChevronRight, GripVertical, GripHorizontal, LineChart, Map as MapIcon, PieChart, Donut, AreaChart, LayoutGrid, ChevronLeft, Layers, Filter, Aperture, MoreHorizontal, Copy, Bot, Loader2, Sparkles, CheckCircle2, Maximize, Minimize, Save, Grid, Plus, Table, List } from 'lucide-react';
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
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
const ALL_STATS = ["mean", "std", "min", "max", "n", "median", "mode", "rse"];

import { ResultSectionBlock } from './ResultSectionBlock';

const parseTableData = (newData) => {
    const columnsList = newData.columns || [];
    const rowsList = newData.rows || [];
    const columnLabels = columnsList.map(c => ({
        label: c.label,
        label2: c.label2 || '',
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
        return { label: r.label, values: processedValues, total: total, label2: r.label2 || '', var_label: r.var_label || r.variable_label || '' };
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
    const { getCrossTabList, getCrossTabData, saveCrossTable, deleteCrossTable, evaluateTable, evaluateTables } = AdditionalAnalysisPageApi();
    const { getRecodedList } = RecodingPageApi();
    const modal = React.useContext(modalContext);
    const loadingSpinner = React.useContext(loadingSpinnerContext);
    const alertTimerRef = useRef(null);
    const [currentPageId, setCurrentPageId] = useState(sessionStorage.getItem("pageId"));

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
    const [tableMode, setTableMode] = useState('merged'); // 'merged' | 'separated'
    const [globalPaletteId, setGlobalPaletteId] = useState('default');
    const [isVariablePanelOpen, setIsVariablePanelOpen] = useState(true);
    const [collapsedIndices, setCollapsedIndices] = useState(new Set());
    const [toast, setToast] = useState({ show: false, message: '' });
    const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
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

    const [rowVars, setRowVars] = useState([]);
    const [colVars, setColVars] = useState([]); // Array of arrays: [[v1, v2], [v3]]
    const [selectedVarIds, setSelectedVarIds] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);
    const draggedItemRef = useRef(null); // stale closure 방지용 동기 ref

    // Filter weight variables from API response
    const weightVariableOptions = useMemo(() => {
        const weights = variables
            .filter(v => v?.id?.startsWith('weight_'))
            .map(v => v?.id);
        return ["없음", ...weights];
    }, [variables]);



    // Total Filter State

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
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!auth?.user?.userId) return;
            const currentPid = sessionStorage.getItem("pageId");
            setCurrentPageId(currentPid);

            if (!currentPid) {
                setVariables([]);
                setTables([]);
                setSelectedTableId(null);
                setResultDataList([]);
                setRowVars([]);
                setColVars([]);

                if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
                alertTimerRef.current = setTimeout(() => {
                    const finalPid = sessionStorage.getItem("pageId");
                    if (sessionStorage.getItem("merge_pn") && !finalPid) {
                        modal.showAlert("알림", "선택된 대시보드 정보가 없습니다.", null, handleOpenPageList);
                    }
                }, 1000);
                return;
            }

            if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
            loadingSpinner.show();

            let loadedVariables = [];

            // Fetch Variables (Original Variables)
            try {
                const varResult = await getOriginalVariables.mutateAsync({
                    user: auth.user.userId,
                    pageid: currentPid
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
                    pageid: currentPid
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
                    pageid: currentPid
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
                                        if (tData.config.row_eval_mode) {
                                            setTableMode(tData.config.row_eval_mode === 'split' ? 'separated' : 'merged');
                                        } else if (yIds.length === 1 && typeof yIds[0] === 'string' && (yIds[0].includes('*') || yIds[0].includes('+'))) {
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

                                setResultDataList(processResults(tData));

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
                                        pageid: currentPid,
                                        variables: variablesMap,
                                        weight_col: weightCol === "없음" ? "" : weightCol,
                                        filter_expression: filterExpr,
                                        include_stats: ALL_STATS,
                                        row_eval_mode: tData.config?.row_eval_mode ? tData.config.row_eval_mode : (tableMode === 'separated' ? 'split' : 'combined'),
                                        table: {
                                            id: firstTable.id,
                                            name: firstTable.name || tData.name || "Untitled Table",
                                            x_info: xInfo,
                                            y_info: yInfo
                                        }
                                    };

                                    const evalResult = await evaluateTable.mutateAsync(payload);

                                    if (evalResult?.success === "777" && evalResult.resultjson) {
                                        setResultDataList(processResults(evalResult.resultjson));
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

    useEffect(() => {
        if (isConfigOpen) {
            setCollapsedIndices(new Set());
        }
    }, [isConfigOpen]);

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






    // Filter tables based on search term
    const filteredTables = tables.filter(table =>
        table.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
    );

    // Filter variables based on search term
    const filteredVariables = variables.filter(variable =>
        variable?.name?.toLowerCase().includes(variableSearchTerm.toLowerCase()) ||
        variable?.label?.toLowerCase().includes(variableSearchTerm.toLowerCase())
    );

    // Result Data List State
    const [resultDataList, setResultDataList] = useState([]);

    // Utilities defined outside


    const handleTableSelect = async (item) => {
        setSelectedTableId(item.id);
        setTableName(item.name || "");
        setIsConfigOpen(false);
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
                            if (data.config.row_eval_mode) {
                                setTableMode(data.config.row_eval_mode === 'split' ? 'separated' : 'merged');
                            } else if (yIds.length === 1 && typeof yIds[0] === 'string' && (yIds[0].includes('*') || yIds[0].includes('+'))) {
                                setTableMode(yIds[0].includes('+') ? 'merged' : 'separated');
                            } else if (yIds.length > 1) {
                                setTableMode('separated');
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

                    setResultDataList(processResults(data));

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
                            pageid: currentPageId,
                            variables: variablesMap,
                            weight_col: weightId,
                            filter_expression: filterExpr,
                            include_stats: ALL_STATS,
                            row_eval_mode: data.config?.row_eval_mode ? data.config.row_eval_mode : (tableMode === 'separated' ? 'split' : 'combined')
                            // sort: { group_by: "label2_label3" }
                        };

                        runPayload.table = {
                            id: item.id,
                            name: item.name || "Untitled Table",
                            x_info: xInfo,
                            y_info: yInfo
                        };

                        const evalResult = await evaluateTable.mutateAsync(runPayload);

                        if (evalResult?.success === "777" && evalResult.resultjson) {
                            setResultDataList(processResults(evalResult.resultjson));
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
                items.forEach(item => {
                    if (newRowVars.length < 10 && !newRowVars.find(v => v.id === item.id)) {
                        const newItem = { id: item.id, name: item.name, label: item.label, info: item.info || [] };
                        if (targetType === 'row_item') {
                            newRowVars.splice(targetItemIndex, 0, newItem);
                        } else {
                            newRowVars.push(newItem);
                        }
                    }
                });
                setRowVars(newRowVars);
            } else if (targetType === 'col' || targetType === 'new_col_group' || targetType === 'col_item') {
                const newColVars = [...colVars];
                items.forEach(item => {
                    if (newColVars.length < 10) {
                        const newItem = { id: item.id, name: item.name, label: item.label, info: item.info || [] };
                        newColVars.push([newItem]);
                    }
                });
                setColVars(newColVars);
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
                pageid: currentPageId,
                name: tableName || "Untitled Table",
                config: {
                    x_info: colVars.filter(g => g.length > 0).length > 0 ? [colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*')).join('+')] : [],
                    y_info: rowVars.length > 0 ? (tableMode === 'separated' ? rowVars.map(v => v.id || v.name) : [rowVars.map(v => v.id || v.name).join(' + ')]) : [],
                    filter_expression: filterExpression,
                    weight_col: selectedWeight === "없음" ? "" : selectedWeight,
                    row_eval_mode: tableMode === 'separated' ? 'split' : 'combined'
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
                tableid: selectedTableId,
                pageid: currentPageId,
                name: tableName || "Untitled Table",
                config: {
                    x_info: colVars.filter(g => g.length > 0).length > 0 ? [colVars.filter(g => g.length > 0).map(group => group.map(v => v.id || v.name).join('*')).join('+')] : [],
                    y_info: rowVars.length > 0 ? (tableMode === 'separated' ? rowVars.map(v => v.id || v.name) : [rowVars.map(v => v.id || v.name).join(' + ')]) : [],
                    filter_expression: filterExpression,
                    weight_col: weightId,
                    row_eval_mode: tableMode === 'separated' ? 'split' : 'combined'
                }
            };

            loadingSpinner.show();

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
                    pageid: currentPageId,
                    variables: variablesMap,
                    weight_col: weightId,
                    filter_expression: filterExpression,
                    include_stats: ALL_STATS,
                    row_eval_mode: tableMode === 'separated' ? 'split' : 'combined'
                    // sort: { group_by: "label2_label3" }
                };

                runPayload.table = {
                    id: selectedTableId || 'T1',
                    name: baseTableName,
                    x_info: xInfo,
                    y_info: rowVars.length > 0 ? (tableMode === 'separated' ? rowVars.map(v => v.id || v.name) : [rowVars.map(v => v.id || v.name).join(' + ')]) : []
                };

                const evalResult = await evaluateTable.mutateAsync(runPayload);

                if (evalResult?.success === "777" && evalResult.resultjson) {
                    let newData = evalResult.resultjson;

                    const newColumnsList = newData.columns || [];
                    setResultDataList(processResults(newData));

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
        } finally {
            loadingSpinner.hide();
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
            pageid: currentPageId,
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
            loadingSpinner.show();
            const result = tableMode === 'separated'
                ? await evaluateTables.mutateAsync(payload)
                : await evaluateTable.mutateAsync(payload);

            if (result?.success === "777" && result.resultjson) {
                setResultDataList(processResults(result.resultjson));

                setIsConfigOpen(false);
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
                        gap: '4px',
                        height: '38px',
                        padding: '0 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: '#fff',
                        color: '#64748b',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: 'none',
                        marginTop: '5px',
                        marginLeft: '8px'
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

            {currentPageId && (
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
                    <div className="cross-tab-main" style={{ gap: isConfigOpen ? '8px' : '16px' }}>
                        {/* Config Section */}
                        <div className="config-section" style={{
                            height: isConfigOpen ? '600px' : '54px',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: isConfigOpen ? '400px' : '54px',
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
                                                        className={`variable-item ${selectedVarIds.includes(v.id) ? 'active' : ''}`}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, v)}
                                                        onClick={(e) => handleVariableClick(e, v.id)}
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

                        {/* Result Section (Scroll Area) */}
                        <div className="results-scroll-container">
                            {resultDataList.map((resultData, dataIndex) => (
                                <ResultSectionBlock
                                    key={`${resultData.table_id || 'T1'}_${dataIndex}`}
                                    resultData={resultData}
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
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Modal */}
            <FullscreenModal
                isOpen={fullscreenModal.open}
                type={fullscreenModal.type}
                onClose={() => setFullscreenModal({ ...fullscreenModal, open: false })}
                resultData={fullscreenModal.dataItem}
                statsOptions={fullscreenModal.statsOptions}
                chartData={fullscreenModal.chartData}
                seriesNames={fullscreenModal.seriesNames}
                chartMode={fullscreenModal.chartMode}
                displayMode={fullscreenModal.displayMode}
                setDisplayMode={fullscreenModal.setDisplayMode}
                paletteId={globalPaletteId}
                setPaletteId={setGlobalPaletteId}
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
