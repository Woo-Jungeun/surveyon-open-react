import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, ChevronUp, Save, Play, Search, Grid, BarChart2, Download, Plus, X, Settings, List, ChevronRight, GripVertical, LineChart, Map, Table, PieChart, Donut, AreaChart, LayoutGrid, ChevronLeft, Layers, Filter, Aperture, MoreHorizontal, Copy, Bot, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
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

const CrossTabPage = () => {
    // Auth & API
    const auth = useSelector((store) => store.auth);
    const { getCrossTabList, getCrossTabData, saveCrossTable, deleteCrossTable } = CrossTabPageApi();
    const { getRecodedVariables } = RecodingPageApi();
    const modal = React.useContext(modalContext);
    const PAGE_ID = "0c1de699-0270-49bf-bfac-7e6513a3f525";

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
    const [isStatsOptionsOpen, setIsStatsOptionsOpen] = useState(true);
    const [isVariablePanelOpen, setIsVariablePanelOpen] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const chartContainerRef = useRef(null);
    const downloadMenuRef = useRef(null);

    // Variables for Drag & Drop
    const [variables, setVariables] = useState([]);

    const [rowVars, setRowVars] = useState([]);
    const [colVars, setColVars] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);

    // Filter weight variables from API response
    const weightVariableOptions = useMemo(() => {
        const weights = variables
            .filter(v => v.name.startsWith('weight_'))
            .map(v => v.name);
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
        { id: 'Std', label: 'Std', checked: true },
        { id: 'Min', label: 'Min', checked: true },
        { id: 'Max', label: 'Max', checked: true },
        { id: 'N', label: 'N', checked: true },
    ]);

    // AI Analysis State
    const [aiResult, setAiResult] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!auth?.user?.userId) return;

            let loadedVariables = [];

            // Fetch Variables
            try {
                const varResult = await getRecodedVariables.mutateAsync({
                    user: auth.user.userId,
                    pageid: PAGE_ID
                });

                if (varResult?.success === "777" && varResult.resultjson) {
                    loadedVariables = Object.values(varResult.resultjson).map(item => ({
                        id: item.name, // Use name as ID
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
                        const newRowVars = (firstTable.row || []).map(id => loadedVariables.find(v => v.id === id) || { id, name: id });
                        const newColVars = (firstTable.col || []).map(id => loadedVariables.find(v => v.id === id) || { id, name: id });
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
    }, [auth?.user?.userId]);

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
    useEffect(() => {
        if (!previewData) return;

        const { rows, cols } = previewData;

        setResultData(prev => ({
            ...prev,
            columns: cols,
            rows: rows.map(label => ({
                label,
                values: new Array(cols.length).fill(0),
                total: 0
            })),
            stats: {
                mean: new Array(cols.length).fill('-'),
                std: new Array(cols.length).fill('-'),
                min: new Array(cols.length).fill('-'),
                max: new Array(cols.length).fill('-'),
                n: new Array(cols.length).fill(0)
            }
        }));
    }, [previewData]);

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
                const chartTypeName = getChartTypeName(chartMode);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `crosstab_${chartTypeName}.svg`;
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
                        const chartTypeName = getChartTypeName(chartMode);
                        saveAs(blob, `crosstab_${chartTypeName}.png`);
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
        variable.name.toLowerCase().includes(variableSearchTerm.toLowerCase()) ||
        variable.label.toLowerCase().includes(variableSearchTerm.toLowerCase())
    );

    // Result Data State
    const [resultData, setResultData] = useState({
        columns: ['Very Low', 'Low', 'Neutral', 'High', 'Very High'],
        rows: [
            { label: '합계', values: [48, 57, 66, 75, 84], total: 330 },
            { label: 'Banner A', values: [10, 13, 16, 19, 22], total: 80 },
            { label: 'Banner B', values: [16, 19, 22, 25, 28], total: 110 },
            { label: 'Banner C', values: [22, 25, 28, 31, 34], total: 140 },
        ],
        stats: {
            mean: [2.25, 2.21, 2.18, 2.16, 2.14],
            std: [0.77, 0.78, 0.79, 0.80, 0.80],
            min: [1, 1, 1, 1, 1],
            max: [3, 3, 3, 3, 3],
            n: [48, 57, 66, 75, 84]
        }
    });

    const chartData = resultData.columns.map((colName, colIndex) => {
        const dataPoint = { name: colName };
        resultData.rows.forEach(row => {
            if (row.label === '합계') {
                dataPoint.total = row.values[colIndex];
            } else {
                dataPoint[row.label] = row.values[colIndex];
            }
        });
        return dataPoint;
    });

    const seriesNames = resultData.rows
        .filter(row => row.label !== '합계')
        .map(row => row.label);

    const handleCopyTable = async () => {
        try {
            const headers = ['문항', ...resultData.columns].join('\t');
            const rows = resultData.rows.map(row =>
                [row.label, ...row.values].join('\t')
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
        const newRowVars = (item.row || []).map(id => variables.find(v => v.id === id) || { id, name: id });
        const newColVars = (item.col || []).map(id => variables.find(v => v.id === id) || { id, name: id });
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

        const newItem = { id: draggedItem.id, name: draggedItem.name };

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

                // If it was a new table, mark it as not new anymore
                if (isNewTable) {
                    setTables(tables.map(t =>
                        t.id === selectedTableId ? { ...t, isNew: false } : t
                    ));
                }
            } else {
                modal.showAlert('실패', '저장 실패');
            }
        } catch (error) {
            console.error("Save error:", error);
            modal.showAlert('오류', '저장 중 오류가 발생했습니다.');
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
                onAdd={() => setIsModalOpen(true)}
                addButtonLabel="교차 테이블 추가"
            />

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
                />

                {/* Main Content */}
                <div className="cross-tab-main">
                    {/* Config Section */}
                    <div className="config-section">
                        <div className="config-header">
                            <div className="config-header__left-group">
                                <div
                                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                                    className="config-header__toggle"
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
                                <button className="btn-save-table" onClick={handleSaveTable}><Save size={14} /> 교차 테이블 저장</button>
                                <button className="btn-run"><ChevronRight size={16} /> 실행</button>
                            </div>
                        </div>

                        {isConfigOpen && (
                            <div className="config-body">
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
                                                        <div className="variable-item__name">{v.name}</div>
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
                                                            {v.name}
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
                                                            {v.name}
                                                            <X size={14} className="remove" onClick={() => removeVar(v.id, 'row')} />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Center Content: Filter & Weight */}
                                        <div className="center-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, overflow: 'hidden' }}>
                                            {/* Preview Table */}
                                            {previewData && (
                                                <div className="preview-table-wrapper" style={{ flex: 1, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px', minHeight: '250px', marginTop: '45px', maxHeight: 'calc(100vh - 350px)', width: '100%', marginBottom: '5px' }}>
                                                    <table style={{ minWidth: '100%', width: 'max-content', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                        <thead>
                                                            <tr>
                                                                <th rowSpan={2} colSpan={2} style={{ background: '#f8f9fa', padding: '4px', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', position: 'sticky', top: 0, left: 0, zIndex: 3, minWidth: '120px' }}></th>
                                                                {previewData.colGroups.map((group, i) => (
                                                                    <th key={i} colSpan={group.labels.length} style={{ background: '#f8f9fa', padding: '4px', borderBottom: '1px solid #ddd', borderLeft: '1px solid #ddd', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 }}>
                                                                        {group.name}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                            <tr>
                                                                {previewData.colGroups.flatMap((group, i) =>
                                                                    group.labels.map((label, j) => (
                                                                        <th key={`${i}-${j}`} style={{ background: '#f9f9f9', padding: '4px', borderBottom: '1px solid #ddd', borderLeft: '1px solid #ddd', minWidth: '60px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', top: '25px', zIndex: 1 }}>
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
                                                                            <td colSpan={2} style={{ background: '#f8f9fa', padding: '4px', borderRight: '1px solid #ddd', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center', position: 'sticky', left: 0, zIndex: 2 }}>
                                                                                {label}
                                                                            </td>
                                                                        ) : (
                                                                            <>
                                                                                {labelIdx === 0 && (
                                                                                    <td rowSpan={group.labels.length} style={{ background: '#f8f9fa', padding: '4px', borderRight: '1px solid #ddd', borderBottom: '1px solid #eee', fontWeight: 'bold', verticalAlign: 'middle', textAlign: 'center', position: 'sticky', left: 0, zIndex: 2 }}>
                                                                                        {group.name}
                                                                                    </td>
                                                                                )}
                                                                                <td style={{ background: '#f9f9f9', padding: '4px', borderRight: '1px solid #ddd', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                                                                    {label}
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                        {previewData.cols.map((_, colIdx) => (
                                                                            <td key={colIdx} style={{ borderBottom: '1px solid #eee', borderLeft: '1px solid #eee' }}></td>
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
                    <div className="result-section">
                        <div className="result-header">
                            <div className="result-tabs">
                                <div className="result-tab">결과</div>
                            </div>
                            <div className="view-options">
                                {layoutOptions.find(opt => opt.id === 'chart')?.checked && (
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
                                                        PNG 이미지
                                                    </button>
                                                    <button onClick={() => handleDownload('svg')}>
                                                        SVG 벡터
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button className={`view-option-btn ${!chartMode || chartMode === 'column' || chartMode === 'bar' ? 'active' : ''}`} onClick={() => setChartMode('column')} title="막대형 차트"><BarChart2 size={18} /></button>
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

                        <div className="result-content">
                            {/* Stats Controls */}
                            <div className="stats-controls" style={{ flexDirection: 'row', alignItems: 'center', gap: '24px', padding: '16px 24px', background: '#eff6ff', borderBottom: '1px solid #dbeafe' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>옵션 설정</span>
                                </div>

                                <div style={{ width: '1px', height: '20px', background: '#e0e0e0' }}></div>

                                <div className="stats-section" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', margin: 0 }}>
                                    <div className="stats-section-title" style={{ marginBottom: 0, marginRight: '0', whiteSpace: 'nowrap', fontSize: '13px', color: '#666', fontWeight: '600' }}>배치 옵션 (드래그 및 선택)</div>
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
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <GripVertical size={14} className="drag-handle" style={{ color: '#ccc' }} />
                                                <span>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {layoutOptions.find(opt => opt.id === 'stats')?.checked && (
                                    <>
                                        <div style={{ width: '1px', height: '20px', background: '#e0e0e0' }}></div>
                                        <div className="stats-section" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', margin: 0 }}>
                                            <div className="stats-section-title" style={{ marginBottom: 0, marginRight: '0', whiteSpace: 'nowrap', fontSize: '13px', color: '#666', fontWeight: '600' }}>통계 옵션 (드래그 및 선택)</div>
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
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <GripVertical size={14} className="drag-handle" style={{ color: '#ccc' }} />
                                                        <span>{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Dynamic Result Rendering */}
                            <div className="cross-table-container" style={{
                                display: 'grid',
                                gridTemplateColumns: layoutOptions.filter(o => o.checked).length >= 3 ? 'repeat(2, 1fr)' : '1fr',
                                gap: '24px',
                                alignItems: 'stretch',
                                gridAutoRows: '360px'
                            }}>
                                {layoutOptions.map(option => {
                                    if (!option.checked) return null;

                                    if (option.id === 'table') {
                                        return (
                                            <div key="table" className="result-block">
                                                <div className="section-header" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div className="blue-bar"></div>
                                                        <span className="section-title">표</span>
                                                    </div>
                                                    <button
                                                        onClick={handleCopyTable}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                            padding: '6px 12px', background: '#f8f9fa',
                                                            border: '1px solid #e9ecef', borderRadius: '6px',
                                                            fontSize: '13px', fontWeight: '500', color: '#495057',
                                                            cursor: 'pointer', marginRight: '16px', flexShrink: 0
                                                        }}
                                                    >
                                                        <Copy size={14} /> 복사
                                                    </button>
                                                </div>
                                                <div className="table-chart-wrapper" style={{ display: 'flex', gap: '24px', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
                                                    <div className="table-wrapper" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ overflow: 'auto', flex: 1, background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                            <table className="cross-table" style={{ width: '100%', height: '100%' }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th style={{ width: '150px', textAlign: 'left', paddingLeft: '16px' }}>문항</th>
                                                                        {resultData.columns.map((col, i) => (
                                                                            <th key={i} style={{ textAlign: 'right', paddingRight: '16px' }}>
                                                                                {col}
                                                                                <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#888', marginTop: '4px' }}>(n={resultData.stats.n[i]})</div>
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {resultData.rows.map((row, i) => (
                                                                        <tr key={i}>
                                                                            <td className="label-cell" style={{ paddingLeft: '16px' }}>{row.label}</td>
                                                                            {row.values.map((val, j) => (
                                                                                <td key={j} className="data-cell" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                                                                    <div className="cell-value">{val}</div>
                                                                                    <div className="cell-pct">{(val / row.total * 100).toFixed(1)}%</div>
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
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
                                                    <button
                                                        onClick={handleCopyStats}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                            padding: '6px 12px', background: '#f8f9fa',
                                                            border: '1px solid #e9ecef', borderRadius: '6px',
                                                            fontSize: '13px', fontWeight: '500', color: '#495057',
                                                            cursor: 'pointer', marginRight: '16px', flexShrink: 0
                                                        }}
                                                    >
                                                        <Copy size={14} /> 복사
                                                    </button>
                                                </div>
                                                <div style={{ overflow: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', flex: 1 }}>
                                                    <table className="cross-table" style={{ width: '100%' }}>
                                                        <thead>
                                                            <tr>
                                                                <th style={{ width: '150px', textAlign: 'left', paddingLeft: '16px', background: '#f5f5f5' }}>통계</th>
                                                                {resultData.columns.map((col, i) => (
                                                                    <th key={i} style={{ textAlign: 'right', paddingRight: '16px', background: '#fff', borderBottom: '1px solid #eee' }}>{col}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {statsOptions.filter(opt => opt.checked).map((stat) => {
                                                                const statKey = stat.id.toLowerCase();
                                                                const statValues = resultData.stats[statKey] || [];
                                                                return (
                                                                    <tr key={stat.id} className="stats-row">
                                                                        <td className="label-cell" style={{ paddingLeft: '16px' }}>Region Group_{stat.label}</td>
                                                                        {statValues.map((v, i) => (
                                                                            <td key={i} style={{ textAlign: 'right', paddingRight: '16px' }}>
                                                                                {typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(4)) : v}
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
                                                <div className="section-header">
                                                    <div className="blue-bar"></div>
                                                    <span className="section-title">차트</span>
                                                </div>
                                                <div ref={chartContainerRef} className="cross-tab-chart-container" style={{
                                                    flex: 1,
                                                    width: '100%',
                                                    minHeight: '300px',
                                                    background: '#fff',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0',
                                                    padding: '24px',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <KendoChart
                                                        data={chartData}
                                                        seriesNames={seriesNames}
                                                        allowedTypes={
                                                            chartMode === 'column' ? ['column', 'bar'] :
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
                                                            chartMode === 'column' ? 'column' :
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
                                            </div>
                                        );
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
                    </div>
                </div>
            </div >

            <CreateTablePopup
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateTable}
            />
        </div >
    );
};

export default CrossTabPage;
