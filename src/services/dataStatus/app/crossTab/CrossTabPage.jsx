import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, ChevronUp, Play, Search, BarChart2, BarChartHorizontal, Download, X, Settings, ChevronRight, GripVertical, LineChart, Map, PieChart, Donut, AreaChart, LayoutGrid, ChevronLeft, Layers, Filter, Aperture, MoreHorizontal, Copy, Bot, Loader2, Sparkles, CheckCircle2, Maximize, Minimize, Save, Grid, Plus, Table, List } from 'lucide-react';
import Toast from '../../../../components/common/Toast';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { saveAs } from '@progress/kendo-file-saver';
import KendoChart from '../../components/KendoChart';
import '@progress/kendo-theme-default/dist/all.css';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import CreateTablePopup from './CreateTablePopup';
import './CrossTabPage.css';
import { CrossTabPageApi } from './CrossTabPageApi';
import { RecodingPageApi } from '../recoding/RecodingPageApi';
import { modalContext } from "@/components/common/Modal.jsx";
import FullscreenModal from './FullscreenModal';

const CrossTabPage = () => {
    // Auth & API
    const auth = useSelector((store) => store.auth);
    const { getCrossTabList, getCrossTabData, saveCrossTable, deleteCrossTable, evaluateTable } = CrossTabPageApi();
    const { getRecodedVariables } = RecodingPageApi();
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
    const [tableMode, setTableMode] = useState('separated'); // 'merged' | 'separated'
    const [isStatsOptionsOpen, setIsStatsOptionsOpen] = useState(false);
    const [isVariablePanelOpen, setIsVariablePanelOpen] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const chartContainerRef = useRef(null);
    const downloadMenuRef = useRef(null);
    const [fullscreenModal, setFullscreenModal] = useState({ open: false, type: null }); // 'table', 'stats', 'chart'

    // Variables for Drag & Drop
    const [variables, setVariables] = useState([]);

    const [rowVars, setRowVars] = useState([]);
    const [colVars, setColVars] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);

    // Filter weight variables from API response
    const weightVariableOptions = useMemo(() => {
        const weights = variables
            .filter(v => v?.name?.startsWith('weight_'))
            .map(v => v?.name);
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
        { id: 'Mean', label: 'Mean', checked: true },
        { id: 'Med', label: 'Med', checked: true },
        { id: 'Mod', label: 'Mod', checked: true },
        { id: 'Std', label: 'Std', checked: true },
        { id: 'Min', label: 'Min', checked: true },
        { id: 'Max', label: 'Max', checked: true },
        { id: 'N', label: 'N', checked: true },
    ]);

    // Column Layout Option (1-column or 2-column)
    const [columnLayout, setColumnLayout] = useState('single'); // 'single' (1단) or 'double' (2단)


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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (totalFilterRef.current && !totalFilterRef.current.contains(event.target)) {
                setIsTotalFilterOpen(false);
            }
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
                setShowDownloadMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!auth?.user?.userId) return;
            if (!PAGE_ID) {
                modal.showErrorAlert("알림", "선택된 페이지 정보가 없습니다.");
                return;
            }

            let loadedVariables = [];

            // Fetch Variables
            try {
                const varResult = await getRecodedVariables.mutateAsync({
                    user: auth.user.userId,
                    pageid: PAGE_ID
                });

                if (varResult?.success === "777" && varResult.resultjson) {
                    loadedVariables = Object.values(varResult.resultjson).map(item => ({
                        id: item.id, // Use name as ID
                        name: item.name,
                        label: item.label,
                        info: item.info || []
                    }));
                    setVariables(loadedVariables);
                }
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
                        name: item.TABLE_TITLE || item.name || `Table ${item.id}`,
                        row: item.row || item.rows || [],
                        col: item.col || item.cols || []
                    }));

                    if (mappedTables.length > 0) {
                        setTables(mappedTables);

                        // Select first table automatically
                        const firstTable = mappedTables[0];
                        setSelectedTableId(firstTable.id);
                        setTableName(firstTable.name || "");

                        // Set configuration using loaded variables
                        const newRowVars = (firstTable.row || []).map(id => {
                            const found = loadedVariables.find(v => v.id === id);
                            return found || { id, name: id, label: id, info: [] };
                        });
                        const newColVars = (firstTable.col || []).map(id => {
                            const found = loadedVariables.find(v => v.id === id);
                            return found || { id, name: id, label: id, info: [] };
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
                                    // x_info -> 세로축 (Rows)
                                    if (tData.config.x_info) {
                                        const xIds = tData.config.x_info;
                                        const mappedRows = xIds.map(id => loadedVariables.find(v => v.name === id || v.id === id) || { id, name: id });
                                        setRowVars(mappedRows);
                                    }
                                    // y_info -> 가로축 (Cols)
                                    if (tData.config.y_info) {
                                        const yIds = tData.config.y_info;
                                        const mappedCols = yIds.map(id => loadedVariables.find(v => v.name === id || v.id === id) || { id, name: id });
                                        setColVars(mappedCols);
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

                                    const selectedVarNames = new Set([...xInfo, ...yInfo]);
                                    if (weightCol && weightCol !== "없음" && weightCol !== "") {
                                        selectedVarNames.add(weightCol);
                                    }

                                    const variablesMap = {};
                                    selectedVarNames.forEach(varIdOrName => {
                                        const found = loadedVariables.find(v => v.id === varIdOrName || v.name === varIdOrName);
                                        if (found) {
                                            const key = found.id || found.name;
                                            variablesMap[key] = found;
                                        }
                                    });

                                    const payload = {
                                        user: auth.user.userId,
                                        pageid: PAGE_ID,
                                        variables: variablesMap,
                                        weight_col: weightCol === "없음" ? "" : weightCol,
                                        filter_expression: filterExpr,
                                        table: {
                                            id: firstTable.id,
                                            name: firstTable.name || tData.name || "Untitled Table",
                                            x_info: xInfo,
                                            y_info: yInfo
                                        }
                                    };

                                    const evalResult = await evaluateTable.mutateAsync(payload);

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

                                        const newParsedStats = {
                                            mean: newColumnsList.map(c => c.mean !== undefined ? c.mean : '-'),
                                            med: newColumnsList.map(c => c.med !== undefined ? c.med : '-'),
                                            mod: newColumnsList.map(c => c.mod !== undefined ? c.mod : '-'),
                                            std: newColumnsList.map(c => c.std !== undefined ? c.std : '-'),
                                            min: newColumnsList.map(c => c.min !== undefined ? c.min : '-'),
                                            max: newColumnsList.map(c => c.max !== undefined ? c.max : '-'),
                                            n: newColumnsList.map(c => c.n || 0)
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

        const getGroupedLabels = (vars) => {
            return vars.map(v => {
                const variable = variables.find(existing => existing.id === v.id);
                let labels = [];
                if (!variable || !variable.info) {
                    labels = [v.name];
                } else {
                    labels = variable.info
                        .filter(i => i.type !== 'config')
                        .map(i => i.label);
                    // If labels empty but info exists (edge case), use name
                    if (labels.length === 0) labels = [v.name];
                }
                return { name: v.name, labels };
            });
        };

        let rowGroups = getGroupedLabels(rowVars);
        let colGroups = getGroupedLabels(colVars);

        // Default handling
        if (rowGroups.length === 0) rowGroups = [{ name: '', labels: [''] }];
        if (colGroups.length === 0) colGroups = [{ name: '', labels: [''] }];

        return {
            rowGroups,
            colGroups,
            rows: rowGroups.flatMap(g => g.labels),
            cols: colGroups.flatMap(g => g.labels)
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
                [row.label, ...row.values.map(v => v.count)].join('\t')
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
            const found = variables.find(v => v.id === id);
            return found || { id, name: id, label: id, info: [] };
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
                        // x_info -> 세로축 (Rows)
                        if (data.config.x_info) {
                            const xIds = data.config.x_info;
                            const mappedRows = xIds.map(id => variables.find(v => v.name === id || v.id === id) || { id, name: id });
                            setRowVars(mappedRows);
                        }
                        // y_info -> 가로축 (Cols)
                        if (data.config.y_info) {
                            const yIds = data.config.y_info;
                            const mappedCols = yIds.map(id => variables.find(v => v.name === id || v.id === id) || { id, name: id });
                            setColVars(mappedCols);
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

                    // Auto-run analysis to get fresh data
                    try {
                        const config = data.config || {};
                        const xInfo = config.x_info || [];
                        const yInfo = config.y_info || [];
                        const weightCol = config.weight_col || "";
                        const filterExpr = config.filter_expression || "";

                        // Re-derive mapped vars to be sure (since state is async)
                        // Actually I can access mappedRows/mappedCols if I move their declaration up or just re-map here.
                        // But mappedRows/mappedCols definitions are inside narrower scope above.
                        // I will redefine them for clarity or use let outside.
                        // Better to re-map to be safe and clean.
                        const xIds = xInfo;
                        const yIds = yInfo;

                        // We need the full variable objects
                        const mappedRowsRun = xIds.map(id => {
                            const found = variables.find(v => v.id === id || v.name === id);
                            return found || { id, name: id, label: id, info: [] };
                        });
                        const mappedColsRun = yIds.map(id => {
                            const found = variables.find(v => v.id === id || v.name === id);
                            return found || { id, name: id, label: id, info: [] };
                        });

                        const variablesMap = {};
                        [...mappedRowsRun, ...mappedColsRun].forEach(v => {
                            const varId = v.id || v.name;
                            if (v && varId) {
                                variablesMap[varId] = v;
                            }
                        });

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

                        const payload = {
                            user: auth.user.userId,
                            pageid: PAGE_ID,
                            variables: variablesMap,
                            weight_col: weightId,
                            filter_expression: filterExpr,
                            table: {
                                id: item.id,
                                name: item.name || "Untitled Table",
                                x_info: mappedRowsRun.map(v => v.id || v.name),
                                y_info: mappedColsRun.map(v => v.id || v.name)
                            }
                        };

                        const evalResult = await evaluateTable.mutateAsync(payload);

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

                            const newParsedStats = {
                                mean: newColumnsList.map(c => c.mean !== undefined ? c.mean : '-'),
                                med: newColumnsList.map(c => c.med !== undefined ? c.med : '-'),
                                mod: newColumnsList.map(c => c.mod !== undefined ? c.mod : '-'),
                                std: newColumnsList.map(c => c.std !== undefined ? c.std : '-'),
                                min: newColumnsList.map(c => c.min !== undefined ? c.min : '-'),
                                max: newColumnsList.map(c => c.max !== undefined ? c.max : '-'),
                                n: newColumnsList.map(c => c.n || 0)
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
    };

    const handleDragStart = (e, item) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e, type) => {
        e.preventDefault();
        if (!draggedItem) return;

        // Find the full variable object from the variables list
        const fullVariable = variables.find(v => v.id === draggedItem.id);
        const newItem = fullVariable || {
            id: draggedItem.id,
            name: draggedItem.name,
            label: draggedItem.label || draggedItem.name,
            info: draggedItem.info || []
        };

        if (type === 'row') {
            if (!rowVars.find(v => v.id === newItem.id)) {
                setRowVars([...rowVars, newItem]);
            }
        } else if (type === 'col') {
            if (!colVars.find(v => v.id === newItem.id)) {
                setColVars([...colVars, newItem]);
            }
        }
        setDraggedItem(null);
    };

    const removeVar = (id, type) => {
        if (type === 'row') {
            setRowVars(rowVars.filter(v => v.id !== id));
        } else {
            setColVars(colVars.filter(v => v.id !== id));
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
                pageid: "0c1de699-0270-49bf-bfac-7e6513a3f525",
                name: tableName || "Untitled Table",
                config: {
                    x_info: rowVars.map(v => v.name),
                    y_info: colVars.map(v => v.name),
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

                        const parsedStats = {
                            mean: columnsList.map(c => c.mean !== undefined ? c.mean : '-'),
                            med: columnsList.map(c => c.med !== undefined ? c.med : '-'),
                            mod: columnsList.map(c => c.mod !== undefined ? c.mod : '-'),
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
                tableid: selectedTableId, // Note: backend expects 'tableid' for update? Check API (saveCrossTable usually uses /tables/set which might expect table obj or flat fields? Checked Step 523 code view).
                // Wait, previous code used `tableid` here?
                // Step 632 view shows:
                // user: auth.user.userId,
                // tableid: selectedTableId,
                // pageid: ...,
                // name: ...,
                // config: { ... }
                // So I keep this structure but update values inside config.
                pageid: "0c1de699-0270-49bf-bfac-7e6513a3f525",
                name: tableName || "Untitled Table",
                config: {
                    x_info: rowVars.map(v => v.id),
                    y_info: colVars.map(v => v.id),
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

                // Add Row and Column variables directly
                [...rowVars, ...colVars].forEach(v => {
                    const varId = v.id || v.name;
                    if (v && varId) {
                        variablesMap[varId] = v;
                    }
                });

                if (weightId) {
                    const weightVar = variables.find(v => (v.id || v.name) === weightId);
                    if (weightVar) {
                        variablesMap[weightId] = weightVar;
                    }
                }

                const runPayload = {
                    user: auth.user.userId,
                    pageid: PAGE_ID,
                    variables: variablesMap,
                    weight_col: weightId,
                    filter_expression: filterExpression,
                    table: {
                        id: selectedTableId,
                        name: tableName || "Untitled Table",
                        x_info: rowVars.map(v => v.id || v.name),
                        y_info: colVars.map(v => v.id || v.name)
                    }
                };

                const evalResult = await evaluateTable.mutateAsync(runPayload);

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

                    const newParsedStats = {
                        mean: newColumnsList.map(c => c.mean !== undefined ? c.mean : '-'),
                        med: newColumnsList.map(c => c.med !== undefined ? c.med : '-'),
                        mod: newColumnsList.map(c => c.mod !== undefined ? c.mod : '-'),
                        std: newColumnsList.map(c => c.std !== undefined ? c.std : '-'),
                        min: newColumnsList.map(c => c.min !== undefined ? c.min : '-'),
                        max: newColumnsList.map(c => c.max !== undefined ? c.max : '-'),
                        n: newColumnsList.map(c => c.n || 0)
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

    const handleRun = async () => {
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
        colVars.forEach(v => selectedVarNames.add(v.name));

        if (selectedWeight && selectedWeight !== "없음") {
            selectedVarNames.add(selectedWeight);
        }

        const variablesMap = {};

        // Add Row and Column variables directly
        [...rowVars, ...colVars].forEach(v => {
            const varId = v.id || v.name;
            if (v && varId) {
                variablesMap[varId] = v;
            }
        });

        let weightId = "";
        // Add Weight variable if selected
        if (selectedWeight && selectedWeight !== "없음") {
            const weightVar = variables.find(v => v.name === selectedWeight);
            if (weightVar) {
                const wId = weightVar.id || weightVar.name;
                variablesMap[wId] = weightVar;
                weightId = wId;
            }
        }

        const payload = {
            user: auth.user.userId,
            pageid: PAGE_ID,
            variables: variablesMap,
            weight_col: weightId,
            filter_expression: filterExpression,
            table: {
                id: selectedTableId,
                name: tableName || "Untitled Table",
                x_info: rowVars.map(v => v.id || v.name),
                y_info: colVars.map(v => v.id || v.name)
            }
        };

        try {
            const result = await evaluateTable.mutateAsync(payload);

            if (result?.success === "777" && result.resultjson) {
                const data = result.resultjson;
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
                    mean: columnsList.map(c => (c.mean !== undefined && c.mean !== null) ? c.mean : '-'),
                    med: columnsList.map(c => (c.med !== undefined && c.med !== null) ? c.med : ((c.median !== undefined && c.median !== null) ? c.median : '-')),
                    mod: columnsList.map(c => (c.mod !== undefined && c.mod !== null) ? c.mod : ((c.mode !== undefined && c.mode !== null) ? c.mode : '-')),
                    std: columnsList.map(c => (c.std !== undefined && c.std !== null) ? c.std : '-'),
                    min: columnsList.map(c => (c.min !== undefined && c.min !== null) ? c.min : '-'),
                    max: columnsList.map(c => (c.max !== undefined && c.max !== null) ? c.max : '-'),
                    n: columnsList.map(c => c.n || 0)
                };

                setResultData({
                    columns: columnLabels,
                    rows: parsedRows,
                    stats: parsedStats
                });

                setIsConfigOpen(false);
            } else {
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

        modal.showConfirm('삭제 확인', '정말로 이 테이블을 삭제하시겠습니까?', {
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
                title="교차 테이블"
            >
                {/* 전체 필터 드롭다운 */}
                <div className="response-filter-container" ref={totalFilterRef} style={{ marginRight: '16px' }}>
                    <span className="response-filter-label">전체 필터</span>
                    <div className="custom-filter-wrapper">
                        <div
                            className={`custom-filter-trigger ${isTotalFilterOpen ? 'open' : ''}`}
                            onClick={() => setIsTotalFilterOpen(!isTotalFilterOpen)}
                        >
                            <span className="trigger-text">
                                {selectedTotalFilters.includes('전체') ? '전체' : (selectedTotalFilters.length === 0 ? '선택항목 없음' : `${selectedTotalFilters.length}개 선택됨`)}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trigger-icon">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        {isTotalFilterOpen && (
                            <div className="custom-filter-menu">
                                {totalFilterList.map((filter, index) => {
                                    const isChecked = selectedTotalFilters.includes('전체') || selectedTotalFilters.includes(filter);

                                    return (
                                        <div
                                            key={index}
                                            className={`custom-filter-item ${isChecked ? 'selected' : ''}`}
                                            onClick={() => handleTotalFilterToggle(filter)}
                                        >
                                            <div className={`checkbox-custom ${isChecked ? 'checked' : ''}`}>
                                                {isChecked && (
                                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                )}
                                            </div>
                                            <span className="filter-text">{filter}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

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
                    교차 테이블 추가
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
                                    <div className="variable-panel-header">
                                        {isVariablePanelOpen && <span className="variable-panel-title">문항 목록</span>}
                                        <button
                                            className="toggle-button"
                                            onClick={() => setIsVariablePanelOpen(!isVariablePanelOpen)}
                                        >
                                            {isVariablePanelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                    </div>

                                    {isVariablePanelOpen && (
                                        <>
                                            <div className="variable-search">
                                                <div className="search-input-wrapper">
                                                    <Search size={14} className="search-icon" />
                                                    <input
                                                        type="text"
                                                        placeholder="문항을 검색하세요."
                                                        className="search-input"
                                                        value={variableSearchTerm}
                                                        onChange={(e) => setVariableSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                            </div>
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
                                        </>
                                    )}
                                </div>

                                {/* Drop Zones Container */}
                                <div className="drop-zones-container">
                                    {/* Top Row: Axis Info & Column Drop Zone */}
                                    <div className="drop-zones-top">
                                        <div className="corner-label">
                                            세로 × 가로
                                        </div>
                                        <div
                                            className="col-drop-zone"
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, 'col')}
                                        >
                                            <span className="drop-zone-label">가로축 (열)</span>
                                            <div className="drop-zone-area">
                                                {colVars.length === 0 ? (
                                                    <span className="drop-zone-placeholder">문항을 여기로 드래그하세요</span>
                                                ) : (
                                                    colVars.map(v => (
                                                        <div key={v.id} className="dropped-tag">
                                                            {v.id}
                                                            <X size={14} className="remove" onClick={() => removeVar(v.id, 'col')} />
                                                        </div>
                                                    ))
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
                                                    rowVars.map(v => (
                                                        <div key={v.id} className="dropped-tag row-tag">
                                                            {v.id}
                                                            <X size={14} className="remove" onClick={() => removeVar(v.id, 'row')} />
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
                                                            <tr>
                                                                <th rowSpan={2} colSpan={2} className="preview-th corner-header"></th>
                                                                {previewData.colGroups.map((group, i) => (
                                                                    <th key={i} colSpan={group.labels.length} className="preview-th group-header">
                                                                        {group.name}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                            <tr>
                                                                {previewData.colGroups.flatMap((group, i) =>
                                                                    group.labels.map((label, j) => (
                                                                        <th key={`${i}-${j}`} className="preview-th col-header">
                                                                            {label}
                                                                        </th>
                                                                    ))
                                                                )}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {previewData.rowGroups.map((group, groupIdx) => (
                                                                group.labels.map((label, labelIdx) => (
                                                                    <tr key={`${groupIdx}-${labelIdx}`}>
                                                                        {group.name === '' ? (
                                                                            <td colSpan={2} className="preview-td row-head sticky-left">
                                                                                {label}
                                                                            </td>
                                                                        ) : (
                                                                            <>
                                                                                {labelIdx === 0 && (
                                                                                    <td rowSpan={group.labels.length} className="preview-td row-group-head sticky-left">
                                                                                        {group.name}
                                                                                    </td>
                                                                                )}
                                                                                <td className="preview-td row-head sticky-left-indent">
                                                                                    {label}
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                        {previewData.cols.map((_, colIdx) => (
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
                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#444', whiteSpace: 'nowrap' }}>필터식</span>
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
                                        {layoutOptions.map((item, index) => (
                                            <div
                                                key={item.id}
                                                className={`sortable-item ${item.checked ? 'checked' : ''}`}
                                                draggable
                                                onDragStart={(e) => handleSortDragStart(e, index, 'layout')}
                                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                onDrop={(e) => handleSortDrop(e, index, 'layout')}
                                                onClick={() => toggleLayoutOption(item.id)}
                                            >
                                                <GripVertical size={14} className="drag-handle" />
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
                                                {statsOptions.map((item, index) => (
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
                                                ))}
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
                                                            <button
                                                                onClick={handleCopyTable}
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
                                                                                <div style={{ fontSize: '11px', fontWeight: '500', color: '#64748b', marginTop: '4px' }}>(n={resultData.stats.n[i]})</div>
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
                                                                                        <div className="cell-value">{val.count}</div>
                                                                                        <div className="cell-pct">{val.percent}%</div>
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
                                                                    const statKey = stat.id.toLowerCase();
                                                                    let actualKey = statKey;
                                                                    if (statKey.startsWith('med')) actualKey = 'median';
                                                                    if (statKey.startsWith('mod')) actualKey = 'mode';
                                                                    if (statKey.startsWith('std')) actualKey = 'stdDev';
                                                                    const statValues = (resultData.stats && (resultData.stats[actualKey] || resultData.stats[statKey])) ||
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
        </div >
    );
};

export default CrossTabPage;
