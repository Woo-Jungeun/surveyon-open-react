import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Search, Copy, GripVertical, X } from 'lucide-react';
import KendoGrid from '../../../../components/kendo/KendoGrid';
import { GridColumn as Column } from '@progress/kendo-react-grid';
import '@progress/kendo-theme-default/dist/all.css';
import './WeightPage.css';
import { useSelector } from 'react-redux';
import { RecodingPageApi } from '../recoding/RecodingPageApi';
import { WeightPageApi } from './WeightPageApi';
import { VariablePageApi } from '../variable/VariablePageApi';
import { modalContext } from "@/components/common/Modal";

// 초기 데이터 (렌더링 시 재생성 방지)
const INITIAL_GRID_DATA = [
    { category: '18-24', col1: { count: 10, pct: 6.7 }, col2: { count: 13, pct: 7.7 }, col3: { count: 16, pct: 8.6 } },
    { category: '25-29', col1: { count: 16, pct: 10.7 }, col2: { count: 19, pct: 11.3 }, col3: { count: 22, pct: 11.8 } },
    { category: '30-34', col1: { count: 22, pct: 14.7 }, col2: { count: 25, pct: 14.9 }, col3: { count: 28, pct: 15.1 } },
    { category: '35-39', col1: { count: 28, pct: 18.7 }, col2: { count: 31, pct: 18.5 }, col3: { count: 34, pct: 18.3 } },
    { category: '40-49', col1: { count: 34, pct: 22.7 }, col2: { count: 37, pct: 22.0 }, col3: { count: 40, pct: 21.5 } },
    { category: '50+', col1: { count: 40, pct: 26.7 }, col2: { count: 43, pct: 25.6 }, col3: { count: 46, pct: 24.7 } },
];

const WeightPage = () => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const { getRecodedVariables } = RecodingPageApi();
    const { getWeightVariable, evaluateTable, deleteWeight, setWeight, getEligibleVariable } = WeightPageApi();

    // 가중치 목록 상태
    const [weights, setWeights] = useState([]);
    const [selectedWeight, setSelectedWeight] = useState(null);
    const [weightSearchTerm, setWeightSearchTerm] = useState('');

    const fetchWeights = useCallback(async (newWeightId = null) => {
        if (auth?.user?.userId) {
            const userId = auth.user.userId;
            const pageId = sessionStorage.getItem("pageId");

            if (pageId) {
                try {
                    const result = await getRecodedVariables.mutateAsync({ user: userId, pageid: pageId });
                    if (result?.success === "777" && result.resultjson) {
                        const transformedData = Object.values(result.resultjson)
                            .map(item => ({
                                ...item,
                                name: item.id,
                            }))
                            .filter(item => item.id && item.id.startsWith('weight_'));
                        setWeights(transformedData);
                        setSelectedWeight(prev => {
                            if (newWeightId) {
                                const target = transformedData.find(w => w.id === newWeightId);
                                if (target) return target;
                            }
                            if (prev && transformedData.find(w => w.id === prev.id)) {
                                return prev;
                            }
                            return transformedData.length > 0 ? transformedData[0] : null;
                        });
                    }
                } catch (error) {
                    console.error("Weight Fetch Error:", error);
                }
            }
        }
    }, [auth?.user?.userId]);

    useEffect(() => {
        fetchWeights();
    }, [fetchWeights]);

    const filteredWeights = weights.filter(item =>
        (item.name || '').toLowerCase().includes(weightSearchTerm.toLowerCase()) ||
        (item.label || '').toLowerCase().includes(weightSearchTerm.toLowerCase())
    );

    // 그리드 컬럼 상태
    const [gridColumns, setGridColumns] = useState([]);

    // Result Display Mode
    const [displayMode, setDisplayMode] = useState('all');
    const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
    const displayMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (displayMenuRef.current && !displayMenuRef.current.contains(event.target)) {
                setIsDisplayMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    // 가중치 상세 데이터 조회
    useEffect(() => {
        const fetchWeightDetail = async () => {
            if (!selectedWeight || !selectedWeight.id) return;
            const pageId = sessionStorage.getItem("pageId");
            if (!pageId) return;

            try {
                const result = await getWeightVariable.mutateAsync({
                    user: auth?.user?.userId,
                    pageid: pageId,
                    weight_variable_name: selectedWeight.id
                });

                if (result?.success === "777" && result.resultjson) {
                    const data = result.resultjson;

                    const yIds = (data.y_info || []).flatMap(str => str.includes('*') ? str.split('*') : str);
                    const xIds = (data.x_info || []).flatMap(str => str.includes('*') ? str.split('*') : str);
                    const vars = data.variables_json || {};

                    const parseItem = (id) => ({
                        id: id,
                        title: vars[id]?.label || id,
                        type: '단일',
                        color: 'purple'
                    });

                    setRowItems(yIds.map(parseItem));
                    setColItems(xIds.map(parseItem));
                    setIsCalculated(true);
                    setWeightName(data.weight_variable.replace('weight_', ''));

                    if (yIds.length > 0 && xIds.length > 0) {
                        const evalPayload = {
                            user: auth?.user?.userId,
                            pageid: pageId,
                            variables: vars,
                            weight_col: "",
                            filter_expression: "",
                            include_stats: [],
                            table: {
                                id: "weight_eval",
                                name: "Weight Evaluation",
                                x_info: xIds.length > 0 ? [xIds.join('*')] : [],
                                y_info: yIds.length > 0 ? [yIds.join('*')] : [],
                                // axis_mode: "interaction"
                            }
                        };
                        try {
                            const evalResult = await evaluateTable.mutateAsync(evalPayload);
                            if (evalResult?.success === "777" && evalResult.resultjson) {
                                const evalData = evalResult.resultjson;
                                const evalCols = (evalData.columns || []);
                                const evalRows = (evalData.rows || []);

                                const newCols = evalCols.map((c, i) => ({
                                    field: `col${i + 1}`,
                                    title: c.label,
                                    evalKey: c.key
                                }));
                                setGridColumns(newCols);

                                const newTargetGridData = evalRows.map((r) => {
                                    const row = { category: r.label, evalKey: r.key };
                                    evalCols.forEach((c, cIdx) => {
                                        const targetKey1 = `${r.key}-${c.key}`;
                                        const targetKey2 = `${c.key}-${r.key}`;
                                        const targetVal = data.targets_json?.[targetKey1] ?? data.targets_json?.[targetKey2] ?? '';
                                        row[`col${cIdx + 1}`] = targetVal;
                                    });
                                    return row;
                                });
                                setTargetGridData(newTargetGridData);

                                const newCurrentGridData = evalRows.map((r) => {
                                    const row = { category: r.label, evalKey: r.key };
                                    evalCols.forEach((c, cIdx) => {
                                        const cell = r.cells?.[c.key];
                                        row[`col${cIdx + 1}`] = cell ? { count: cell.count ?? 0, pct: cell.percent ?? "0.0" } : { count: '-', pct: '-' };
                                    });
                                    return row;
                                });
                                setGridData(newCurrentGridData);
                            }
                        } catch (e) {
                            console.error("Evaluate table error:", e);
                        }
                    }
                }
            } catch (error) {
                console.error("Fetch Detail Error:", error);
            }
        };

        fetchWeightDetail();
    }, [selectedWeight?.id, auth?.user?.userId]);

    // 전체 문항 목록 상태
    const [questions, setQuestions] = useState([]);
    const [rawVariables, setRawVariables] = useState({});

    useEffect(() => {
        const fetchQuestions = async () => {
            if (auth?.user?.userId) {
                const userId = auth.user.userId;
                const pageId = sessionStorage.getItem("pageId");

                if (pageId) {
                    try {
                        const result = await getEligibleVariable.mutateAsync({ user: userId, pageid: pageId, include_variables: true });
                        if (result?.success === "777" && result.resultjson && result.resultjson.variables) {
                            const rawVarsObj = result.resultjson.variables.reduce((acc, v) => {
                                acc[v.id] = v.variable; // 새 API 형식에서는 v.variable 내부에 원본(info, id, label 포함)이 들어있습니다.
                                return acc;
                            }, {});
                            setRawVariables(rawVarsObj);
                            const transformedData = result.resultjson.variables.map(item => {
                                const originalType = item.type || 'Single';
                                const rawType = String(originalType).toLowerCase();

                                let color = 'gray';
                                if (rawType === 'single') {
                                    color = 'single';
                                } else if (rawType === 'multi') {
                                    color = 'multi';
                                } else if (rawType === 'dummy') {
                                    color = 'dummy';
                                } else if (rawType === 'open') {
                                    color = 'open';
                                }

                                return {
                                    id: item.id,
                                    title: item.id || '',
                                    desc: item.label || '',
                                    type: originalType,
                                    count: '',
                                    color: color
                                };
                            });
                            setQuestions(transformedData);
                        }
                    } catch (error) {
                        console.error("Variable Fetch Error:", error);
                    }
                }
            }
        };

        fetchQuestions();
    }, [auth?.user?.userId]);

    // 드래그 앤 드롭 상태
    const [rowItems, setRowItems] = useState([]);
    const [colItems, setColItems] = useState([]);

    const handleDeleteWeight = (id) => {
        modal.showConfirm("알림", '정말 삭제하시겠습니까?', {
            btns: [{
                title: "확인",
                click: async () => {
                    const pageId = sessionStorage.getItem("pageId");
                    if (!pageId) return;

                    try {
                        const result = await deleteWeight.mutateAsync({
                            user: auth?.user?.userId,
                            pageid: pageId,
                            weight_variable_name: id
                        });

                        if (result?.success === "777") {
                            setWeights(prev => {
                                const newWeights = prev.filter(w => w.id !== id);
                                setSelectedWeight(newWeights.length > 0 ? newWeights[0] : null);
                                return newWeights;
                            });
                            modal.showAlert("알림", '가중치가 삭제되었습니다.');
                        } else {
                            modal.showAlert("알림", '가중치 삭제에 실패했습니다.');
                        }
                    } catch (error) {
                        console.error("Delete Weight Error:", error);
                        modal.showAlert("알림", '가중치 삭제 중 오류가 발생했습니다.');
                    }
                }
            }]
        });
    };

    const handleDragStart = (e, item) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e, target, targetIndex = null) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('application/json');
        if (data) {
            const item = JSON.parse(data);

            if (target === 'row' || target === 'row_item') {
                const newRowItems = [...rowItems];
                if (item.dragType !== 'ROW_ITEM' && newRowItems.length >= 10 && !newRowItems.find(i => i.id === item.id)) {
                    modal.showAlert('알림', '세로축은 최대 10개까지만 추가할 수 있습니다.');
                    return;
                }
                if (item.dragType === 'ROW_ITEM') {
                    const [moved] = newRowItems.splice(item.srcIndex, 1);
                    if (targetIndex !== null) {
                        newRowItems.splice(targetIndex, 0, moved);
                    } else {
                        newRowItems.push(moved);
                    }
                    setRowItems(newRowItems);
                    setIsCalculated(false);
                } else if (!rowItems.find(i => i.id === item.id)) {
                    if (targetIndex !== null) {
                        newRowItems.splice(targetIndex, 0, item);
                    } else {
                        newRowItems.push(item);
                    }
                    setRowItems(newRowItems);
                    setIsCalculated(false);
                }
            } else if (target === 'col' || target === 'col_item') {
                const newColItems = [...colItems];
                if (item.dragType !== 'COL_ITEM' && newColItems.length >= 10 && !newColItems.find(i => i.id === item.id)) {
                    modal.showAlert('알림', '가로축은 최대 10개까지만 추가할 수 있습니다.');
                    return;
                }
                if (item.dragType === 'COL_ITEM') {
                    const [moved] = newColItems.splice(item.srcIndex, 1);
                    if (targetIndex !== null) {
                        newColItems.splice(targetIndex, 0, moved);
                    } else {
                        newColItems.push(moved);
                    }
                    setColItems(newColItems);
                    setIsCalculated(false);
                } else if (!colItems.find(i => i.id === item.id)) {
                    if (targetIndex !== null) {
                        newColItems.splice(targetIndex, 0, item);
                    } else {
                        newColItems.push(item);
                    }
                    setColItems(newColItems);
                    setIsCalculated(false);
                }
            }
        }
    };

    const removeDroppedItem = (id, target) => {
        if (target === 'row') {
            setRowItems(rowItems.filter(i => i.id !== id));
        } else {
            setColItems(colItems.filter(i => i.id !== id));
        }
        setIsCalculated(false);
    };

    // 분석 상태 및 가중치명
    const [isCalculated, setIsCalculated] = useState(false);
    const [weightName, setWeightName] = useState('');

    const handleRunAnalysis = async () => {
        if (rowItems.length === 0 && colItems.length === 0) {
            modal.showAlert("알림", '가로축과 세로축에 문항을 추가해주세요.');
            return;
        }

        setWeightName(''); // Reset weight name when running analysis

        const yIds = rowItems.map(r => r.id);
        const xIds = colItems.map(c => c.id);
        const yItems = yIds.flatMap(id => rawVariables[id] ? (rawVariables[id].info || []).map(item => ({ ...item, varId: id })) : []);
        const activeVariables = {};
        yIds.forEach(id => {
            if (rawVariables[id]) activeVariables[id] = rawVariables[id];
        });
        xIds.forEach(id => {
            if (rawVariables[id]) activeVariables[id] = rawVariables[id];
        });
        if (Object.keys(activeVariables).length === 0) {
            modal.showAlert("알림", '가로축과 세로축 문항 데이터가 유효하지 않습니다.');
            return;
        }

        const pageId = sessionStorage.getItem("pageId");

        const evalPayload = {
            user: auth?.user?.userId,
            pageid: pageId,
            variables: activeVariables,
            weight_col: "",
            filter_expression: "",
            include_stats: [],
            table: {
                id: "eval_run",
                name: "Evaluation Run",
                x_info: xIds.length > 0 ? [xIds.join('*')] : [],
                y_info: yIds.length > 0 ? [yIds.join('*')] : [],
                // axis_mode: "interaction"
            }
        };

        try {
            const evalResult = await evaluateTable.mutateAsync(evalPayload);
            if (evalResult?.success === "777" && evalResult.resultjson) {
                const evalData = evalResult.resultjson;
                const evalCols = (evalData.columns || []);
                const evalRows = (evalData.rows || []);

                const newCols = evalCols.map((c, i) => ({
                    field: `col${i + 1}`,
                    title: c.label,
                    evalKey: c.key
                }));
                setGridColumns(newCols);

                const newTargetGridData = evalRows.map((r) => {
                    const row = { category: r.label, evalKey: r.key };
                    evalCols.forEach((c, cIdx) => {
                        row[`col${cIdx + 1}`] = '';
                    });
                    return row;
                });
                setTargetGridData(newTargetGridData);

                const newCurrentGridData = evalRows.map((r) => {
                    const row = { category: r.label, evalKey: r.key };
                    evalCols.forEach((c, cIdx) => {
                        const cell = r.cells?.[c.key];
                        row[`col${cIdx + 1}`] = cell ? { count: cell.count ?? 0, pct: cell.percent ?? "0.0" } : { count: '-', pct: '-' };
                    });
                    return row;
                });
                setGridData(newCurrentGridData);
            }
        } catch (e) {
            console.error("Evaluate Run Error:", e);
        }

        setIsCalculated(true);
    };

    // 문항 목록 패널 상태
    const [isQuestionPanelOpen, setIsQuestionPanelOpen] = useState(true);
    const [questionSearchTerm, setQuestionSearchTerm] = useState('');

    // 문항 검색 필터 (TypeError 방지)
    const filteredQuestions = questions.filter(q => {
        const titleStr = q.title || '';
        const descStr = q.desc || '';
        const searchStr = questionSearchTerm ? questionSearchTerm.toLowerCase() : '';
        return titleStr.toLowerCase().includes(searchStr) || descStr.toLowerCase().includes(searchStr);
    });

    // 아코디언 메뉴 상태
    const [isCurrentDistOpen, setIsCurrentDistOpen] = useState(true);
    const [isTargetDistOpen, setIsTargetDistOpen] = useState(true);

    // 그리드 데이터 상태
    const [gridData, setGridData] = useState(INITIAL_GRID_DATA);
    const [targetGridData, setTargetGridData] = useState(() =>
        INITIAL_GRID_DATA.map(item => ({
            ...item,
            col1: '', col2: '', col3: ''
        }))
    );

    // 그리드 컨테이너 너비 계산 (동적 컬럼 너비 용)
    const [gridContainerWidth, setGridContainerWidth] = useState(1000);
    const resizeObserverRef = useRef(null);

    const contentAreaRef = useCallback((node) => {
        if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
        }
        if (node !== null) {
            setGridContainerWidth(node.getBoundingClientRect().width);
            resizeObserverRef.current = new ResizeObserver((entries) => {
                if (entries[0]) {
                    setGridContainerWidth(entries[0].contentRect.width);
                }
            });
            resizeObserverRef.current.observe(node);
        }
    }, []);

    // 컬럼 최소 너비 120px 보장 및 컨테이너 너비 비례 계산
    const dynamicColWidth = Math.max(120, Math.floor((gridContainerWidth - 180) / Math.max(1, gridColumns.length)));

    const handleTargetChange = useCallback((dataItem, field, value) => {
        setTargetGridData(prevData =>
            prevData.map(item =>
                item.category === dataItem.category ? { ...item, [field]: value } : item
            )
        );
    }, []);

    // 토스트 알림 상태
    const [toast, setToast] = useState({ show: false, message: '', source: '' });

    // 토스트 타이머
    useEffect(() => {
        if (toast.show) {
            const timer = setTimeout(() => {
                setToast({ ...toast, show: false });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.show]);

    // 현재값 클립보드 복사 (엑셀 호환)
    const handleCopyCurrentToClipboard = async () => {
        try {
            const headerRow = ['Variable', ...gridColumns.map(c => c.title)].join('\t');
            const dataRows = gridData.map(item => {
                const cols = gridColumns.map(c => {
                    const cellData = item[c.field];
                    if (!cellData) return '-';
                    if (displayMode === 'value') return cellData.count;
                    if (displayMode === 'percent') return cellData.pct !== '-' ? `${cellData.pct}%` : '-';
                    return `${cellData.count} (${cellData.pct !== '-' ? `${cellData.pct}%` : '-'})`;
                });
                return [item.category, ...cols].join('\t');
            }).join('\n');

            await navigator.clipboard.writeText(`${headerRow}\n${dataRows}`);
            setToast({ show: true, message: '복사 완료 (Ctrl+V)', source: 'current' });
        } catch (err) {
            console.error('Failed to copy current dist:', err);
            setToast({ show: true, message: '복사 실패', source: 'current' });
        }
    };

    // 클립보드 복사 (엑셀 호환)
    const handleCopyToClipboard = async () => {
        try {
            const headerRow = ['Variable', ...gridColumns.map(c => c.title)].join('\t');
            const dataRows = targetGridData.map(item => {
                const cols = gridColumns.map(c => item[c.field]);
                return [item.category, ...cols].join('\t');
            }).join('\n');

            await navigator.clipboard.writeText(`${headerRow}\n${dataRows}`);

            setToast({ show: true, message: '복사 완료 (Ctrl+V)', source: 'target' });
        } catch (err) {
            console.error('Failed to copy:', err);
            setToast({ show: true, message: '복사 실패', source: 'target' });
        }
    };

    const handleSaveWeight = async () => {
        if (!weightName.trim()) {
            modal.showAlert("알림", "가중치 변수명을 입력해주세요.");
            return;
        }

        const pageId = sessionStorage.getItem("pageId");
        if (!pageId) return;

        const yIds = rowItems.map(r => r.id);
        const xIds = colItems.map(c => c.id);
        const yVar = yIds.length > 0 ? rawVariables[yIds[0]] : null;
        const xVar = xIds.length > 0 ? rawVariables[xIds[0]] : null;

        const yItems = yIds.flatMap(id => rawVariables[id] ? (rawVariables[id].info || []).map(item => ({ ...item, varId: id })) : []);
        const xItems = xIds.flatMap(id => rawVariables[id] ? (rawVariables[id].info || []).map(item => ({ ...item, varId: id })) : []);

        if (yItems.length === 0 || xItems.length === 0) {
            modal.showAlert("알림", "유효한 문항 데이터가 없습니다. 먼저 실행해주세요.");
            return;
        }

        // Ensure activeVariables is available, similar to handleRunAnalysis
        const activeVariables = {};
        yIds.forEach(id => {
            if (rawVariables[id]) activeVariables[id] = rawVariables[id];
        });
        xIds.forEach(id => {
            if (rawVariables[id]) activeVariables[id] = rawVariables[id];
        });

        const target_values = {};

        targetGridData.forEach(row => {
            if (row.evalKey === 'total') return; // Skip total row for target payload
            gridColumns.forEach((col, index) => {
                if (col.evalKey === 'total') return; // Skip total column for target payload

                let colValue = row[col.field];
                if (colValue === "" || colValue === undefined || colValue === null || isNaN(colValue)) {
                    colValue = 0;
                }

                if (row.evalKey && col.evalKey) {
                    const key = `${row.evalKey}-${col.evalKey}`;
                    target_values[key] = Number(colValue);
                } else {
                    const xItemIndex = col.itemIndex !== undefined ? col.itemIndex : xItems[index]?.index;
                    const xItemVarId = col.varId !== undefined ? col.varId : xItems[index]?.varId;

                    if (row.varId && row.rowId && xItemVarId && xItemIndex !== undefined) {
                        const key = `${row.varId}__${row.rowId}-${xItemVarId}__${xItemIndex}`;
                        target_values[key] = Number(colValue);
                    }
                }
            });
        });

        const payload = {
            user: auth?.user?.userId,
            pageid: pageId,
            weight_variable_name: `weight_${weightName}`,
            x_info: xIds.length > 0 ? [xIds.join('*')] : [],
            y_info: yIds.length > 0 ? [yIds.join('*')] : [],
            // axis_mode: "interaction",
            target_values: target_values,
            variables: activeVariables
        };

        const isUpdate = weights.some(w => w.id === `weight_${weightName}`);

        try {
            const result = await setWeight.mutateAsync(payload);
            if (result?.success === "777") {
                modal.showAlert("알림", isUpdate ? "가중치가 성공적으로 수정되었습니다." : "가중치가 성공적으로 생성되었습니다.");
                fetchWeights(`weight_${weightName}`);
            } else {
                modal.showAlert("알림", isUpdate ? "가중치 수정에 실패했습니다." : "가중치 생성에 실패했습니다.");
            }
        } catch (error) {
            console.error(isUpdate ? "Update Weight Error:" : "Save Weight Error:", error);
            modal.showAlert("알림", isUpdate ? "가중치 수정 중 오류가 발생했습니다." : "가중치 생성 중 오류가 발생했습니다.");
        }
    };

    const CurrentDistCell = useCallback((props) => {
        const cellData = props.dataItem[props.field];
        if (!cellData) {
            return (
                <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>-</div>
                    {displayMode === 'all' && <div style={{ fontSize: '11px', color: '#888' }}>-</div>}
                </td>
            );
        }
        const { count, pct } = cellData;
        return (
            <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                {displayMode === 'all' && (
                    <>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{count}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{pct !== '-' ? `${pct}%` : '-'}</div>
                    </>
                )}
                {displayMode === 'value' && <div style={{ fontWeight: '600', fontSize: '13px' }}>{count}</div>}
                {displayMode === 'percent' && <div style={{ fontWeight: '600', fontSize: '13px' }}>{pct !== '-' ? `${pct}%` : '-'}</div>}
            </td>
        );
    }, [displayMode]);

    // 엑셀 붙여넣기 기능
    const handlePaste = useCallback((e, dataItem, field) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('text');

        const rows = clipboardData.split(/\r\n|\n|\r/).filter(row => row.trim() !== '');
        if (rows.length === 0) return;

        setTargetGridData(prevData => {
            // 업데이트 함수 내에서 시작 위치 찾기 (의존성 최소화)
            const startRowIndex = prevData.findIndex(item => item.category === dataItem.category);
            if (startRowIndex === -1) return prevData;

            const columns = gridColumns.map(c => c.field);
            const startColIndex = columns.indexOf(field);
            if (startColIndex === -1) return prevData;

            const newData = [...prevData];

            rows.forEach((row, rIdx) => {
                const currentRowIndex = startRowIndex + rIdx;
                if (currentRowIndex >= newData.length) return;

                const cells = row.split('\t');
                cells.forEach((cellValue, cIdx) => {
                    const currentColIndex = startColIndex + cIdx;
                    if (currentColIndex < columns.length) {
                        const fieldName = columns[currentColIndex];
                        newData[currentRowIndex] = {
                            ...newData[currentRowIndex],
                            [fieldName]: cellValue.trim()
                        };
                    }
                });
            });

            return newData;
        });
    }, [gridColumns]);

    const TargetEditCell = useCallback((props) => {
        const value = props.dataItem[props.field];
        const [localValue, setLocalValue] = useState(value);

        useEffect(() => {
            setLocalValue(value);
        }, [value]);

        const handleChange = (e) => {
            setLocalValue(e.target.value);
        };

        const handleBlur = () => {
            if (localValue !== value) {
                handleTargetChange(props.dataItem, props.field, localValue);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                if (localValue !== value) {
                    handleTargetChange(props.dataItem, props.field, localValue);
                }
            }
        };

        return (
            <td style={{ padding: '4px' }}>
                <input
                    type="text"
                    value={localValue === undefined ? "" : localValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onPaste={(e) => handlePaste(e, props.dataItem, props.field)}
                    placeholder="N"
                    style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        fontSize: '13px'
                    }}
                />
            </td>
        );
    }, [handleTargetChange, handlePaste]);

    return (
        <div className="weight-page" data-theme="data-dashboard">
            <DataHeader title="가중치 생성" />

            <div className="weight-layout">
                <SideBar
                    title="가중치 목록"
                    items={filteredWeights}
                    selectedId={selectedWeight?.id}
                    onItemClick={setSelectedWeight}
                    onSearch={setWeightSearchTerm}
                    onDelete={handleDeleteWeight}
                    searchPlaceholder="가중치를 검색하세요."
                />

                <div className="weight-main-content">
                    <div className="weight-content-card">
                        {/* <div className="weight-header">
                            <h3>가중치 계산 설정</h3>
                        </div> */}

                        <div className="weight-layout">
                            {/* 문항 목록 패널 */}
                            <div className={`question-panel ${!isQuestionPanelOpen ? 'collapsed' : ''}`}>
                                <div className="question-panel-header" style={{ justifyContent: isQuestionPanelOpen ? 'space-between' : 'center', gap: '8px', padding: '16px' }}>
                                    {isQuestionPanelOpen && (
                                        <div className="search-input-wrapper" style={{ flex: 1 }}>
                                            <Search size={14} className="search-icon" />
                                            <input
                                                type="text"
                                                placeholder="문항을 검색하세요."
                                                value={questionSearchTerm}
                                                onChange={(e) => setQuestionSearchTerm(e.target.value)}
                                                className="search-input"
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setIsQuestionPanelOpen(!isQuestionPanelOpen)}
                                        className="toggle-button"
                                        style={{ flexShrink: 0, padding: 0 }}
                                    >
                                        {isQuestionPanelOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                                    </button>
                                </div>

                                {isQuestionPanelOpen && (
                                    <div className="question-list">
                                        {filteredQuestions.map(q => (
                                            <div
                                                key={q.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, q)}
                                                className="question-item"
                                            >
                                                <div className="question-item-header" style={{ marginBottom: q.desc && q.desc !== q.title ? '4px' : '0' }}>
                                                    <span className="question-title">{q.title}</span>
                                                    <span className={`question-type-badge ${q.color}`}>
                                                        {q.type}
                                                    </span>
                                                </div>
                                                {q.desc && q.desc !== q.title && (
                                                    <p className="question-desc">{q.desc}</p>
                                                )}
                                                {q.count && (
                                                    <div className="question-count">{q.count}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 드래그 앤 드롭 영역 */}
                            <div className="drop-zones-container">
                                <div className="drop-zones-top">
                                    <div className="corner-label">
                                        세로 × 가로
                                    </div>

                                    <div
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, 'col')}
                                        style={{
                                            flex: 1,
                                            background: '#eff6ff',
                                            borderRadius: '0 12px 0 0',
                                            borderBottom: '1px solid #e0e0e0',
                                            padding: '16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            minWidth: 0
                                        }}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '8px', display: 'block' }}>가로축 (열)</span>
                                        <div style={{
                                            flex: 1,
                                            border: '2px dashed #d0d7de',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: colItems.length === 0 ? 'center' : 'flex-start',
                                            background: '#fff',
                                            padding: '8px',
                                            gap: '8px',
                                            overflowX: 'auto'
                                        }}>
                                            {colItems.length === 0 ? (
                                                <span style={{ color: '#999', fontSize: '14px' }}>문항을 여기로 드래그하세요</span>
                                            ) : (
                                                colItems.map((item, index) => (
                                                    <div
                                                        key={item.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, { ...item, dragType: 'COL_ITEM', srcIndex: index })}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => { e.stopPropagation(); handleDrop(e, 'col_item', index); }}
                                                        style={{
                                                            padding: '6px 10px 6px 6px',
                                                            background: '#e3f2fd',
                                                            borderRadius: '6px',
                                                            border: '1px solid #90caf9',
                                                            color: '#1976d2',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            whiteSpace: 'normal',
                                                            height: 'auto',
                                                            textAlign: 'left',
                                                            flexShrink: 0,
                                                            maxWidth: '180px'
                                                        }}
                                                    >
                                                        <span style={{
                                                            cursor: 'grab',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: '6px',
                                                            width: '20px',
                                                            height: '20px',
                                                            background: '#f8fafc',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '4px',
                                                            color: '#94a3b8',
                                                            flexShrink: 0
                                                        }}><GripVertical size={13} strokeWidth={2.5} /></span>
                                                        <span style={{ flex: 1, wordBreak: 'break-all', lineHeight: '1.4' }}>{item.id}</span>
                                                        <X
                                                            size={14}
                                                            onClick={() => removeDroppedItem(item.id, 'col')}
                                                            style={{ cursor: 'pointer', color: '#1976d2', flexShrink: 0 }}
                                                        />
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                                    <div
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, 'row')}
                                        style={{
                                            width: '200px',
                                            background: '#f0fdf4',
                                            borderRadius: '0 0 0 12px',
                                            borderRight: '1px solid #e0e0e0',
                                            padding: '16px',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '8px', display: 'block' }}>세로축 (행)</span>
                                        <div style={{
                                            flex: 1,
                                            border: '2px dashed #d0d7de',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: rowItems.length === 0 ? 'center' : 'stretch',
                                            justifyContent: rowItems.length === 0 ? 'center' : 'flex-start',
                                            background: '#fff',
                                            padding: '12px',
                                            gap: '8px',
                                            overflowY: 'auto'
                                        }}>
                                            {rowItems.length === 0 ? (
                                                <span style={{ color: '#999', fontSize: '14px', lineHeight: '1.5', textAlign: 'center' }}>문항을 여기로 드래그하세요</span>
                                            ) : (
                                                rowItems.map((item, index) => (
                                                    <div
                                                        key={item.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, { ...item, dragType: 'ROW_ITEM', srcIndex: index })}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => { e.stopPropagation(); handleDrop(e, 'row_item', index); }}
                                                        style={{
                                                            padding: '8px 10px',
                                                            background: '#e8f5e9',
                                                            borderRadius: '6px',
                                                            border: '1px solid #a5d6a7',
                                                            color: '#2e7d32',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start',
                                                            whiteSpace: 'normal',
                                                            height: 'auto',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <span style={{
                                                            cursor: 'grab',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: '6px',
                                                            width: '20px',
                                                            height: '20px',
                                                            background: '#f8fafc',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '4px',
                                                            color: '#94a3b8',
                                                            flexShrink: 0
                                                        }}><GripVertical size={13} strokeWidth={2.5} /></span>
                                                        <span style={{ flex: 1, wordBreak: 'break-all', lineHeight: '1.4', textAlign: 'left' }}>{item.id}</span>
                                                        <X
                                                            size={14}
                                                            onClick={() => removeDroppedItem(item.id, 'row')}
                                                            style={{ cursor: 'pointer', color: '#2e7d32', flexShrink: 0 }}
                                                        />
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div style={{
                                        flex: 1,
                                        background: '#fff',
                                        borderRadius: '0 0 12px 0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden'
                                    }}>
                                        {!isCalculated ? (
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                                <div style={{ textAlign: 'center', color: '#999', marginBottom: '24px' }}>
                                                    <p style={{ fontSize: '16px', marginBottom: '8px' }}>세로축과 가로축에 문항을 추가 후</p>
                                                    <p style={{ fontSize: '16px' }}>실행 버튼을 누르면 교차분석 결과가 이 영역에 표시됩니다</p>
                                                </div>
                                                <button
                                                    onClick={handleRunAnalysis}
                                                    style={{
                                                        padding: '12px 32px',
                                                        background: 'var(--primary-color)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '15px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                                    }}
                                                >
                                                    <ChevronRight size={18} />
                                                    실행
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div ref={contentAreaRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
                                                    <div>
                                                        <div
                                                            onClick={() => setIsCurrentDistOpen(!isCurrentDistOpen)}
                                                            className="weight-section-header"
                                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                                        >
                                                            <div className="weight-header-controls">
                                                                <h4 className="weight-section-title">현재값</h4>

                                                                <div className="custom-filter-wrapper" ref={displayMenuRef} style={{ position: 'relative', width: '85px' }} onClick={(e) => e.stopPropagation()}>
                                                                    <div
                                                                        className={`weight-display-trigger ${isDisplayMenuOpen ? 'open' : ''}`}
                                                                        onClick={() => setIsDisplayMenuOpen(!isDisplayMenuOpen)}
                                                                    >
                                                                        <span className="trigger-text">
                                                                            {displayMode === 'all' ? '전체' : displayMode === 'value' ? '사례수' : '퍼센트'}
                                                                        </span>
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trigger-icon">
                                                                            <polyline points="6 9 12 15 18 9"></polyline>
                                                                        </svg>
                                                                    </div>

                                                                    {isDisplayMenuOpen && (
                                                                        <div className="weight-display-menu">
                                                                            {[{ label: '전체', value: 'all' }, { label: '사례수', value: 'value' }, { label: '퍼센트', value: 'percent' }].map((item) => (
                                                                                <div
                                                                                    key={item.value}
                                                                                    className={`weight-display-menu-item ${displayMode === item.value ? 'active' : ''}`}
                                                                                    onClick={() => {
                                                                                        setDisplayMode(item.value);
                                                                                        setIsDisplayMenuOpen(false);
                                                                                    }}
                                                                                >
                                                                                    {item.label}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="weight-header-actions" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        className="weight-copy-button"
                                                                        onClick={(e) => { e.stopPropagation(); handleCopyCurrentToClipboard(); }}
                                                                        title="데이터 복사"
                                                                    >
                                                                        <Copy size={12} />
                                                                        복사
                                                                    </button>
                                                                    {toast.show && toast.source === 'current' && (
                                                                        <div className="weight-toast-message">
                                                                            <div className="weight-toast-dot"></div>
                                                                            {toast.message}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="weight-header-toggle">
                                                                {isCurrentDistOpen ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                                                            </div>
                                                        </div>
                                                        {isCurrentDistOpen && (
                                                            <div className="cmn_grid singlehead weight-grid-current">
                                                                <KendoGrid
                                                                    parentProps={{
                                                                        data: gridData,
                                                                        dataItemKey: "category",
                                                                        height: "auto",
                                                                        sortable: false,
                                                                        filterable: false,
                                                                        pageable: false
                                                                    }}
                                                                >
                                                                    <Column field="category" title="Variable" width="150px" locked={true} />
                                                                    {gridColumns.map(col => (
                                                                        <Column key={col.field} field={col.field} title={col.title} cell={CurrentDistCell} width={`${dynamicColWidth}px`} headerCell={() => (
                                                                            <span style={{ fontWeight: '600' }}>{col.title}</span>
                                                                        )} />
                                                                    ))}
                                                                </KendoGrid>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ marginTop: '32px' }}>
                                                        <div
                                                            onClick={() => setIsTargetDistOpen(!isTargetDistOpen)}
                                                            className="weight-section-header"
                                                        >
                                                            <div className="weight-header-actions">
                                                                <h4 className="weight-section-title">목표값</h4>
                                                                <button
                                                                    className="weight-copy-button"
                                                                    onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(); }}
                                                                    title="데이터 복사"
                                                                >
                                                                    <Copy size={12} />
                                                                    복사
                                                                </button>
                                                                {toast.show && toast.source === 'target' && (
                                                                    <div className="weight-toast-message">
                                                                        <div className="weight-toast-dot"></div>
                                                                        {toast.message}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {isTargetDistOpen ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                                                        </div>
                                                        {isTargetDistOpen && (
                                                            <div className="cmn_grid singlehead weight-grid-target">
                                                                <KendoGrid
                                                                    parentProps={{
                                                                        data: targetGridData,
                                                                        dataItemKey: "category",
                                                                        height: "auto",
                                                                        sortable: false,
                                                                        filterable: false,
                                                                        pageable: false
                                                                    }}
                                                                >
                                                                    <Column field="category" title="Variable" width="150px" locked={true} />
                                                                    {gridColumns.map(col => (
                                                                        <Column key={col.field} field={col.field} title={col.title} cell={TargetEditCell} width={`${dynamicColWidth}px`} headerCell={() => (
                                                                            <span style={{ fontWeight: '600' }}>{col.title}</span>
                                                                        )} />
                                                                    ))}
                                                                </KendoGrid>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Fixed Save Section */}
                                                <div className="save-section">
                                                    <label className="save-label">가중치 변수명</label>
                                                    <div className="save-input-group">
                                                        <div className="save-prefix">
                                                            weight_
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={weightName}
                                                            onChange={(e) => setWeightName(e.target.value)}
                                                            placeholder="예: region_gender"
                                                            className="save-input"
                                                        />
                                                        <button className="save-button" onClick={handleSaveWeight}>
                                                            가중치 생성
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default WeightPage;
