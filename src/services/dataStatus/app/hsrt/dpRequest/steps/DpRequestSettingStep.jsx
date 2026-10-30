import { useState, useEffect, useContext, createContext, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AlertCircle, Info, Trash2, ChevronLeft, ChevronRight, ChevronDown, Search, Plus, X, Sparkles, Download, RefreshCw, ArrowUpDown, CheckCircle2, FileSpreadsheet, Upload, Clipboard, Check } from 'lucide-react';

import { Input } from '@progress/kendo-react-inputs';
import { DropDownList } from '@progress/kendo-react-dropdowns';

import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { DpRequestPageApi } from '../DpRequestPageApi';
import AnalysisSettingTab from './AnalysisSettingTab';
import TableSettingTab from './TableSettingTab';
import DataFilterCard, { buildFilterExpression, toFilterVariables } from './DataFilterCard';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import { useRef } from 'react';

// Helper to determine order score for band labels
const getBandScore = (label) => {
    if (!label) return 99;
    const l = String(label).toLowerCase().trim();
    if (l.startsWith('top')) {
        const num = parseInt(l.replace('top', ''), 10) || 1;
        return num - 1;
    }
    if (l.startsWith('mid')) {
        const num = parseInt(l.replace('mid', ''), 10) || 1;
        return 10 + num - 1;
    }
    if (l.startsWith('bot')) {
        const num = parseInt(l.replace('bot', ''), 10) || 1;
        return 20 + num - 1;
    }
    return 99;
};

const WeightContext = createContext(null);

// --- 숫자 전용 커스텀 셀 ---
const NumericEditCell = (props) => {
    const { dataItem, field, onChange } = props;
    const { currentWeightInfo, updateWeightInfo, onUnsavedChange, originalWeightInfoRef } = useContext(WeightContext);
    const value = dataItem[field];

    const originalList = originalWeightInfoRef?.current || [];
    const originalItem = originalList.find(orig => String(orig.label) === String(dataItem.label));

    // Check if the value has changed
    const isChanged = originalItem
        ? String(originalItem.value) !== String(value)
        : (value !== undefined && value !== null && value !== '');

    if (!dataItem.inEdit) {
        return (
            <td className={isChanged ? 'changed-cell' : ''} style={{
                ...props.style,
                padding: '0 12px',
                ...(isChanged ? { backgroundColor: 'var(--srt-primary-50)', color: 'var(--srt-primary-600)' } : {})
            }}>
                {value}
            </td>
        );
    }

    const handlePaste = (e) => {
        if (currentWeightInfo && updateWeightInfo) {
            const clipboardData = e.clipboardData.getData('Text');
            if (!clipboardData) return;

            const hasNewline = /\r|\n/.test(clipboardData);
            const hasTab = clipboardData.includes('\t');

            // 단일 텍스트(줄바꿈이나 탭이 없는 일반 글자 붙여넣기)는 브라우저 기본 동작(커서 위치 삽입)에 맡김
            if (!hasNewline && !hasTab) {
                return;
            }

            e.preventDefault();
            const lines = clipboardData.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
            if (lines.length > 0) {
                const startIdx = currentWeightInfo.findIndex(item => String(item.label) === String(dataItem.label));
                if (startIdx !== -1) {
                    const updatedInfo = currentWeightInfo.map((item, idx) => {
                        if (idx >= startIdx) {
                            const offset = idx - startIdx;
                            const lineVal = lines[offset];
                            if (lineVal !== undefined && lineVal !== '') {
                                const num = Number(lineVal);
                                return {
                                    ...item,
                                    value: isNaN(num) ? lineVal : num
                                };
                            }
                        }
                        return item;
                    });
                    updateWeightInfo(updatedInfo);
                    if (onUnsavedChange) onUnsavedChange(true);
                }
            }
        }
    };

    return (
        <td style={{
            ...props.style,
            padding: 0,
            ...(isChanged ? { backgroundColor: 'var(--srt-primary-50)' } : {})
        }} className={`k-grid-edit-cell ${isChanged ? 'changed-cell' : ''}`}>
            <Input
                type="number"
                value={value}
                onChange={(e) => onChange({ dataItem, field, syntheticEvent: e.syntheticEvent, value: e.value })}
                onPaste={handlePaste}
                className="no-spin"
                style={{
                    width: '100%', height: '100%', border: 'none', outline: 'none',
                    color: isChanged ? 'var(--srt-primary-600)' : 'inherit',
                    backgroundColor: 'transparent'
                }}
            />
        </td>
    );
};

// --- PID 전용 읽기 전용 커스텀 셀 ---
const PidCell = (props) => {
    return <td style={{ ...props.style, padding: '0 12px' }}>{props.dataItem[props.field]}</td>;
};



const DpRequestSettingStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getTableRenderContext, getTableDetail, saveTableSettings, getBaseVariableList, getRecodedOverview, reapplyPreset, getRecodedPlain, getWeightPidList, getNextWeightId, deleteWeight, saveWeightSetPid, extractColumnWeightValues, previewFilter, getOverviewContext } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    const originalPresetsRef = useRef({ scale: [], rank: [], group: [] });
    const originalWeightInfoRef = useRef([]);

    // --- 히스토리 관리 (Undo/Redo) ---
    const history = useUpdateHistory('dp-setting');
    const isHistoryAction = useRef(false);

    // 부모 컴포넌트에서 호출할 수 있도록 기능 노출
    useImperativeHandle(ref, () => ({
        save: async () => {
            return await handleSave();
        }
    }));

    const [activeTab, setActiveTab] = useState(0); // 0: 분석, 1: 표 디자인, 2: 가중치, 3: 데이터 필터

    // --- 가중치 설정 탭 상태 관리 ---
    const [isWeightSidebarOpen, setIsWeightSidebarOpen] = useState(true);
    const [weightSearch, setWeightSearch] = useState('');
    const [weights, setWeights] = useState([]);
    const [selectedWeightId, setSelectedWeightId] = useState('');
    const [currentWeightId, setCurrentWeightId] = useState('');
    const [currentWeightLabel, setCurrentWeightLabel] = useState('');
    const [currentWeightType, setCurrentWeightType] = useState('single');
    const [currentWeightInfo, setCurrentWeightInfo] = useState([]);

    const [weightSort, setWeightSort] = useState([]);
    const [isBulkWeightModalOpen, setIsBulkWeightModalOpen] = useState(false);
    const [bulkWeightValuesText, setBulkWeightValuesText] = useState('');
    const [isTextareaFocused, setIsTextareaFocused] = useState(false);

    // --- 가중치 우측 매칭 패널 및 문항 컬럼 추출 상태 ---
    const [variableList, setVariableList] = useState([]);
    const [weightRightTab, setWeightRightTab] = useState('column'); // 'column' | 'csv' | 'paste'
    const [weightColumnSearch, setWeightColumnSearch] = useState('');
    const [selectedColumnId, setSelectedColumnId] = useState('');
    const [extractLoading, setExtractLoading] = useState(false);
    const [extractedWeightData, setExtractedWeightData] = useState(null);
    const [columnExtractError, setColumnExtractError] = useState(null);
    const [matchedColumnName, setMatchedColumnName] = useState('');
    const [pidSortDir, setPidSortDir] = useState('asc');
    const [pasteAreaText, setPasteAreaText] = useState('');

    const weightDropdownData = useMemo(() => {
        const list = [{ text: '없음', value: '없음' }];
        weights.forEach(w => {
            const isSelected = w.id === selectedWeightId;
            const id = isSelected ? currentWeightId : w.id;
            const label = isSelected ? currentWeightLabel : w.label;
            list.push({
                text: label || '(라벨 없음)',
                value: id
            });
        });
        return list;
    }, [weights, selectedWeightId, currentWeightId, currentWeightLabel]);

    const selectWeight = (w) => {
        const prevId = selectedWeightId;
        if (prevId) {
            setWeights(prev => prev.map(item =>
                item.id === prevId
                    ? {
                        ...item,
                        id: currentWeightId,
                        label: currentWeightLabel,
                        type: currentWeightType,
                        info: currentWeightInfo
                    }
                    : item
            ));
        }

        setSelectedWeightId(w.id);
        setCurrentWeightId(w.id);
        setCurrentWeightLabel(w.label);
        setCurrentWeightType(w.type || 'single');
        setCurrentWeightInfo(w.info || []);
        originalWeightInfoRef.current = JSON.parse(JSON.stringify(w.info || []));
        setWeightSort([]);
        setMatchedColumnName('');
        setSelectedColumnId('');
        setExtractedWeightData(null);
        setColumnExtractError(null);
        setWeightRightTab('column');
        setPasteAreaText('');
        setWeightColumnSearch('');
    };

    const handleUpdateWeightField = (field, val) => {
        if (field === 'id') {
            setCurrentWeightId(val);
        } else if (field === 'label') {
            setCurrentWeightLabel(val);
        } else if (field === 'type') {
            setCurrentWeightType(val);
        }
        setWeights(prev => prev.map(item =>
            item.id === selectedWeightId
                ? { ...item, [field]: val }
                : item
        ));
        if (onUnsavedChange) onUnsavedChange(true);
    };

    const updateWeightInfo = (newInfo) => {
        setCurrentWeightInfo(newInfo);
        setWeights(prev => prev.map(item =>
            item.id === selectedWeightId
                ? { ...item, info: newInfo }
                : item
        ));
        if (onUnsavedChange) onUnsavedChange(true);
    };

    const handleWeightRowClick = (e) => {
        setCurrentWeightInfo(prev => prev.map(it => ({ ...it, inEdit: it === e.dataItem })));
    };

    const handleOpenBulkWeightModal = () => {
        const valuesText = currentWeightInfo.map(item => {
            const val = item.value !== undefined && item.value !== null ? item.value : '';
            return `${item.label}\t${val}`;
        }).join('\n');
        setBulkWeightValuesText(valuesText);
        setIsBulkWeightModalOpen(true);
    };

    const handleApplyBulkWeightValuesText = () => {
        const lines = bulkWeightValuesText.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');

        // Detect if the user pasted two columns (PID and Value)
        const hasPairs = lines.some(line => line.split(/\s+/).length > 1);

        let updatedInfo = [];

        if (hasPairs) {
            // PID + Value pair mode
            const weightMap = {};
            lines.forEach(line => {
                const parts = line.split(/\s+/);
                if (parts.length >= 2) {
                    const pid = parts[0];
                    const valStr = parts[1];
                    let parsedVal = '';
                    if (valStr !== '') {
                        const num = Number(valStr);
                        parsedVal = isNaN(num) ? valStr : num;
                    }
                    weightMap[String(pid)] = parsedVal;
                } else if (parts.length === 1) {
                    // If a line only has one part, treat it as PID with empty value
                    weightMap[String(parts[0])] = '';
                }
            });

            updatedInfo = currentWeightInfo.map(item => {
                const pidStr = String(item.label);
                if (weightMap[pidStr] !== undefined) {
                    return {
                        ...item,
                        value: weightMap[pidStr]
                    };
                }
                return item;
            });
        } else {
            // Value-only mode (order-based)
            updatedInfo = currentWeightInfo.map((item, idx) => {
                const lineVal = lines[idx];
                let parsedVal = item.value; // Keep original if line is undefined
                if (lineVal !== undefined) {
                    if (lineVal === '') {
                        parsedVal = '';
                    } else {
                        const num = Number(lineVal);
                        parsedVal = isNaN(num) ? lineVal : num;
                    }
                }
                return {
                    ...item,
                    value: parsedVal
                };
            });
        }

        updateWeightInfo(updatedInfo);
        setIsBulkWeightModalOpen(false);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    const handleWeightSortChange = (e) => {
        setWeightSort(e.sort);
        if (e.sort && e.sort.length > 0) {
            const { field, dir } = e.sort[0];
            if (!dir) return;
            const sortedInfo = [...currentWeightInfo].sort((a, b) => {
                let valA = a[field];
                let valB = b[field];

                if (field === 'value') {
                    valA = Number(valA) || 0;
                    valB = Number(valB) || 0;
                    return dir === 'asc' ? valA - valB : valB - valA;
                }

                if (field === 'label') {
                    const numA = Number(valA);
                    const numB = Number(valB);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return dir === 'asc' ? numA - numB : numB - numA;
                    }
                }

                const strA = String(valA || '');
                const strB = String(valB || '');
                return dir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
            });
            updateWeightInfo(sortedInfo);
        }
    };

    const handleAddNewWeight = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) return;

        loadingSpinner.show();
        try {
            const pidListRes = await getWeightPidList.mutateAsync({ pageid: pageId, user: auth.user.userId });
            const pidData = pidListRes?.resultjson || pidListRes?.data?.resultjson || pidListRes;
            const pidColumn = pidData?.pid_column || 'pid';
            const pids = pidData?.pids || [];

            // Build the info array with empty values by default
            const newInfo = pids.map((pid) => {
                return {
                    value: '',
                    label: String(pid),
                    logic: `${pidColumn} == ${pid}`,
                    inEdit: false
                };
            });

            // Fetch new weight variable ID from next-id API
            const nextIdRes = await getNextWeightId.mutateAsync({ pageid: pageId, user: auth.user.userId });
            const newId = nextIdRes?.resultjson?.weight_variable || nextIdRes?.data?.resultjson?.weight_variable || nextIdRes?.weight_variable || `new_${Date.now()}`;

            const newW = {
                id: newId,
                label: '',
                type: 'single',
                info: newInfo
            };

            if (selectedWeightId) {
                setWeights(prev => {
                    const updated = prev.map(item =>
                        item.id === selectedWeightId
                            ? {
                                ...item,
                                id: currentWeightId,
                                label: currentWeightLabel,
                                type: currentWeightType,
                                info: currentWeightInfo
                            }
                            : item
                    );
                    return [...updated, newW];
                });
            } else {
                setWeights(prev => [...prev, newW]);
            }

            setSelectedWeightId(newId);
            setCurrentWeightId(newId);
            setCurrentWeightLabel('');
            setCurrentWeightType('single');
            setCurrentWeightInfo(newInfo);
            originalWeightInfoRef.current = JSON.parse(JSON.stringify(newInfo || []));
            setMatchedColumnName('');
            setSelectedColumnId('');
            setExtractedWeightData(null);
            setColumnExtractError(null);
            setWeightRightTab('column');
            setPasteAreaText('');
            setWeightColumnSearch('');
            if (onUnsavedChange) onUnsavedChange(true);
        } catch (err) {
            console.error("Failed to load PID list or fetch new weight ID:", err);
            modal.showAlert("오류", "새 가중치 설정을 생성하는 데 실패했습니다.");
        } finally {
            loadingSpinner.hide();
        }
    };

    const handleDeleteWeight = (e, id) => {
        e.stopPropagation();
        modal.showConfirm('알림', `가중치 설정(${id})을 삭제하시겠습니까?`, {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "삭제",
                    click: async () => {
                        const targetW = weights.find(w => w.id === id);
                        const nextList = weights.filter(w => w.id !== id);

                        loadingSpinner.show();
                        try {
                            const pageId = sessionStorage.getItem('pageId');
                            // Only call delete API if it's not a newly created unsaved weight (ID doesn't start with new_)
                            if (!id.startsWith('new_') && targetW) {
                                await deleteWeight.mutateAsync({
                                    pageid: pageId,
                                    weight_variable_name: targetW.label || targetW.id,
                                    delete_weight_id: targetW.id,
                                    user: auth.user.userId
                                });
                            }
                            if (settings.weight_variable === id) {
                                setSettings(prev => ({ ...prev, weight_variable: '없음' }));
                            }
                            setWeights(nextList);
                            if (selectedWeightId === id) {
                                if (nextList.length > 0) {
                                    selectWeight(nextList[0]);
                                } else {
                                    setSelectedWeightId('');
                                    setCurrentWeightId('');
                                    setCurrentWeightLabel('');
                                    setCurrentWeightType('single');
                                    setCurrentWeightInfo([]);
                                }
                            }
                            modal.showAlert("알림", "삭제되었습니다.");
                            if (onUnsavedChange) onUnsavedChange(true);
                        } catch (err) {
                            console.error("Failed to delete weight:", err);
                            modal.showAlert("오류", "삭제에 실패했습니다.");
                        } finally {
                            loadingSpinner.hide();
                        }
                    }
                }
            ]
        });
    };

    const filteredWeights = useMemo(() => {
        const search = weightSearch.toLowerCase().trim();
        return weights.filter(w =>
            (w.label || '').toLowerCase().includes(search) || (w.id || '').toLowerCase().includes(search)
        );
    }, [weights, weightSearch]);

    // 문항(변수) 컬럼 필터링
    const filteredVariables = useMemo(() => {
        if (!weightColumnSearch.trim()) return variableList;
        const s = weightColumnSearch.toLowerCase().trim();
        return variableList.filter(v => {
            const id = String(v.name || v.spss_name || v.id || '').toLowerCase();
            const label = String(v.label || v.title || '').toLowerCase();
            return id.includes(s) || label.includes(s);
        });
    }, [variableList, weightColumnSearch]);

    // 문항 컬럼 선택 시 가중치 추출 API 호출
    const handleSelectColumnForWeight = async (v) => {
        const colId = v.name || v.spss_name || v.id;
        setSelectedColumnId(colId);
        setColumnExtractError(null);

        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) return;

        setExtractLoading(true);
        try {
            const res = await extractColumnWeightValues.mutateAsync({
                pageid: pageId,
                user: auth.user.userId,
                column_id: colId,
                pid_column: 'PID'
            });

            const resData = res?.resultjson || res?.data?.resultjson || res;
            const outerSuccess = String(res?.success || '');
            const innerSuccess = String(resData?.success || '');

            // 최상위 success가 777이더라도 내부 resultjson.success가 777이 아니면 오류 처리
            if (outerSuccess === '777' && (innerSuccess === '777' || innerSuccess === '')) {
                setExtractedWeightData(resData);
                setColumnExtractError(null);
            } else {
                setExtractedWeightData(null);

                // 777 내의 703 또는 기타 에러 메시지 정리
                let errorMsg = resData?.message || res?.message || "가중치 값 추출에 실패했습니다.";

                if (innerSuccess === '703') {
                    if (errorMsg.includes('not found in dataset') || errorMsg.includes('not found')) {
                        errorMsg = `선택하신 문항 컬럼('${colId}')이 데이터셋(SAV) 파일에 존재하지 않습니다.`;
                    } else {
                        errorMsg = `데이터셋에서 문항('${colId}')을 찾을 수 없습니다. (${errorMsg})`;
                    }
                } else if (innerSuccess === '701' || innerSuccess === '702') {
                    errorMsg = `가중치 데이터 추출 중 오류가 발생했습니다. (${errorMsg})`;
                }

                setColumnExtractError(errorMsg);
            }
        } catch (err) {
            console.error("Failed to extract column weight values:", err);
            const fallbackMsg = "선택 문항에서 가중치를 추출하는 중 오류가 발생했습니다.";
            setColumnExtractError(fallbackMsg);
            setExtractedWeightData(null);
        } finally {
            setExtractLoading(false);
        }
    };

    // 추출된 가중치 값을 현재 그리드에 적용
    const handleApplyExtractedWeight = () => {
        if (!extractedWeightData || !extractedWeightData.pid_values) {
            modal.showAlert("알림", "추출된 가중치 데이터가 없습니다. 먼저 문항을 선택해 주세요.");
            return;
        }

        const pidMap = extractedWeightData.pid_values;
        let matchedCount = 0;

        const newInfo = currentWeightInfo.map(item => {
            const pidKey = String(item.label);
            if (pidMap[pidKey] !== undefined && pidMap[pidKey] !== null) {
                matchedCount++;
                const val = Number(pidMap[pidKey]);
                return {
                    ...item,
                    value: isNaN(val) ? '' : val
                };
            }
            return item;
        });

        updateWeightInfo(newInfo);
        setMatchedColumnName(extractedWeightData.source_column || selectedColumnId);

        // 가중치 라벨이 비어있으면 자동 생성 (예: 가중치_SQ3. 거주 지역)
        if (!currentWeightLabel || currentWeightLabel.startsWith('new_')) {
            const colLabel = extractedWeightData.column_label || extractedWeightData.source_column || selectedColumnId;
            const newLabel = `가중치_${colLabel}`;
            handleUpdateWeightField('label', newLabel);
        }

        if (onUnsavedChange) onUnsavedChange(true);
        modal.showAlert("성공", extractedWeightData.message || `${matchedCount.toLocaleString()}건의 가중치값이 정상 매칭되었습니다.`);
    };

    // [수정 및 반영] 개별 저장
    const handleSaveCurrentWeight = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId || !selectedWeightId) return;

        loadingSpinner.show();
        try {
            const pidValues = {};
            currentWeightInfo.forEach(opt => {
                if (opt.label) {
                    if (opt.value === '' || opt.value === undefined || opt.value === null) {
                        pidValues[String(opt.label)] = null;
                    } else {
                        const numVal = Number(opt.value);
                        pidValues[String(opt.label)] = isNaN(numVal) ? null : numVal;
                    }
                }
            });

            const savePayload = {
                pageid: pageId,
                weight_variable_label: currentWeightLabel || '',
                weight_variable_name: currentWeightId,
                pid_values: pidValues,
                user: auth.user.userId
            };

            const res = await saveWeightSetPid.mutateAsync(savePayload);
            if (String(res?.success) === '777' || res?.data?.success === '777') {
                modal.showAlert("알림", "가중치 설정이 성공적으로 저장 및 반영되었습니다.");
                originalWeightInfoRef.current = JSON.parse(JSON.stringify(currentWeightInfo || []));
                if (onUnsavedChange) onUnsavedChange(false);
            } else {
                modal.showAlert("알림", res?.message || "가중치 설정이 반영되었습니다.");
            }
        } catch (err) {
            console.error("Failed to save weight:", err);
            modal.showAlert("오류", "가중치 저장에 실패했습니다.");
        } finally {
            loadingSpinner.hide();
        }
    };

    // [1.0 초기화]
    const handleResetWeightToOne = () => {
        modal.showConfirm("알림", "모든 응답자의 가중치 비율을 1.0으로 초기화하시겠습니까?", {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "초기화",
                    click: () => {
                        const resetInfo = currentWeightInfo.map(item => ({
                            ...item,
                            value: 1.0
                        }));
                        updateWeightInfo(resetInfo);
                        setMatchedColumnName('');
                        if (onUnsavedChange) onUnsavedChange(true);
                        modal.showAlert("알림", "가중치 비율이 1.0으로 초기화되었습니다.");
                    }
                }
            ]
        });
    };

    // [PID 정렬]
    const handleTogglePidSort = () => {
        const nextDir = pidSortDir === 'asc' ? 'desc' : 'asc';
        setPidSortDir(nextDir);
        const sorted = [...currentWeightInfo].sort((a, b) => {
            const numA = Number(a.label);
            const numB = Number(b.label);
            if (!isNaN(numA) && !isNaN(numB)) {
                return nextDir === 'asc' ? numA - numB : numB - numA;
            }
            return nextDir === 'asc'
                ? String(a.label).localeCompare(String(b.label))
                : String(b.label).localeCompare(String(a.label));
        });
        updateWeightInfo(sorted);
    };

    // [템플릿 받기]
    const handleDownloadTemplate = () => {
        if (!currentWeightInfo || currentWeightInfo.length === 0) {
            modal.showAlert("알림", "다운로드할 응답자(PID) 데이터가 없습니다.");
            return;
        }
        const header = "pid,weight\n";
        const rows = currentWeightInfo.map(item => `${item.label},${item.value !== '' && item.value !== null && item.value !== undefined ? item.value : '1.0'}`).join("\n");
        const blob = new Blob(["\uFEFF" + header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `가중치_템플릿_${currentWeightId || 'weight'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // [붙여넣기 탭 적용]
    const handleApplyPasteWeight = () => {
        if (!pasteAreaText.trim()) {
            modal.showAlert("알림", "붙여넣을 데이터를 입력해 주세요.");
            return;
        }
        const lines = pasteAreaText.split(/\r?\n/).filter(line => line.trim().length > 0);
        const parsedMap = new Map();
        lines.forEach(line => {
            const parts = line.split(/[\t,;]+/).map(p => p.trim());
            if (parts.length >= 2) {
                const pid = parts[0];
                const val = Number(parts[1]);
                if (pid && !isNaN(val)) parsedMap.set(pid, val);
            } else if (parts.length === 1) {
                const val = Number(parts[0]);
                if (!isNaN(val)) parsedMap.set('INDEX_ONLY_' + parsedMap.size, val);
            }
        });

        const hasPidMapping = Array.from(parsedMap.keys()).some(k => !k.startsWith('INDEX_ONLY_'));
        let updatedInfo = [];
        if (hasPidMapping) {
            updatedInfo = currentWeightInfo.map(item => {
                if (parsedMap.has(item.label)) {
                    return { ...item, value: parsedMap.get(item.label) };
                }
                return item;
            });
        } else {
            const valuesArray = Array.from(parsedMap.values());
            updatedInfo = currentWeightInfo.map((item, idx) => {
                if (idx < valuesArray.length) {
                    return { ...item, value: valuesArray[idx] };
                }
                return item;
            });
        }
        updateWeightInfo(updatedInfo);
        setMatchedColumnName('');
        setPasteAreaText('');
        if (onUnsavedChange) onUnsavedChange(true);
        modal.showAlert("알림", "가중치 데이터가 적용되었습니다.");
    };

    // [CSV 업로드 탭 적용]
    const handleCsvFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            if (typeof text !== 'string') return;
            const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
            const parsedMap = new Map();
            lines.forEach((line, idx) => {
                if (idx === 0 && (line.toLowerCase().includes('pid') || line.toLowerCase().includes('weight'))) {
                    return; // 헤더 행 제외
                }
                const parts = line.split(/[\t,;]+/).map(p => p.trim());
                if (parts.length >= 2) {
                    const pid = parts[0];
                    const val = Number(parts[1]);
                    if (pid && !isNaN(val)) parsedMap.set(pid, val);
                }
            });

            let matchCnt = 0;
            const updatedInfo = currentWeightInfo.map(item => {
                if (parsedMap.has(item.label)) {
                    matchCnt++;
                    return { ...item, value: parsedMap.get(item.label) };
                }
                return item;
            });
            updateWeightInfo(updatedInfo);
            setMatchedColumnName(file.name.replace(/\.[^/.]+$/, ''));
            if (onUnsavedChange) onUnsavedChange(true);
            modal.showAlert("알림", `${matchCnt.toLocaleString()}건의 가중치 데이터가 파일에서 매칭되었습니다.`);
            e.target.value = '';
        };
        reader.readAsText(file, 'utf-8');
    };

    const handleCloseWeightEdit = () => {
        setCurrentWeightInfo(prev => prev.map(it => ({ ...it, inEdit: false })));
    };

    // --- 상태 관리 ---
    const [settings, setSettings] = useState({
        weight_variable: '없음',
        confidence_level: 95,
        render: {
            font_family: 'Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
            font_size: 14,
            theme_primary: '#D3D3D3',
            theme_primary_fg: '#1E293B',
            theme_stub_header_bg: '#D9E1F2',
            theme_stub_header_fg: '#0F172A',
            theme_bg: '#FFFFFF',
            theme_stripe: '#F5F7FB',
            theme_text: '#1F2937',
            theme_text_muted: '#64748B',
            theme_grid_color: '#000000',
            theme_grid_style: 'solid',
            theme_grid_width: '1px',
            theme_stub_divider_color: '#000000',
            theme_stub_divider_style: 'solid',
            theme_stub_divider_width: '1px',
            theme_section_separator_color: '#000000',
            theme_section_separator_style: 'solid',
            theme_section_separator_width: '2px',
            theme_header_divider_color: '#000000',
            theme_header_divider_style: 'double',
            theme_header_divider_width: '1px',
            theme_table_outer_top_color: '#111827',
            theme_table_outer_top_style: 'solid',
            theme_table_outer_top_width: '2px',
            theme_table_outer_bottom_color: '#CBD5E1',
            theme_table_outer_bottom_style: 'solid',
            theme_table_outer_bottom_width: '1px',
            theme_table_outer_left_color: '#CBD5E1',
            theme_table_outer_left_style: 'solid',
            theme_table_outer_left_width: '1px',
            theme_table_outer_right_color: '#CBD5E1',
            theme_table_outer_right_style: 'solid',
            theme_table_outer_right_width: '1px',
            theme_header_font: '',
            theme_stub_font: '',
            theme_data_font: '',
            theme_header_group_bg: '#FFFFFF',
            theme_header_group_fg: '#0F172A',
            theme_stub_group_bg: '#F1F5F9',
            theme_stub_group_fg: '#0F172A',
            theme_stub_leaf_bg: '#FFFFFF',
            theme_stub_leaf_fg: '#0F172A',
            theme_stub_tier_divider_color: '#cbd5e1',
            theme_stub_tier_divider_style: 'solid',
            theme_stub_tier_divider_width: '1px',
            theme_header_tier_divider_color: '#cbd5e1',
            theme_header_tier_divider_style: 'solid',
            theme_header_tier_divider_width: '1px',
            theme_banner_divider_color: '#cbd5e1',
            theme_banner_divider_style: 'solid',
            theme_banner_divider_width: '1px',
            theme_base_bg: '#FFF2CC',
            theme_base_fg: '#7F6000',
            theme_etc_bg: '#E2EFDA',
            theme_etc_fg: '#375623',
            theme_data_col_divider_color: '#cbd5e1',
            theme_data_col_divider_style: 'none',
            theme_data_col_divider_width: '1px',
            theme_group_preset_bg: '#EBF3FA',
            theme_group_preset_fg: '#0F172A',
            theme_group_preset_divider_color: '#111827',
            theme_group_preset_divider_style: 'none',
            theme_group_preset_divider_width: '1px',
            stub_group_layout: 'merge',
            format_percent_as_column: false
        },
        display: {
            show_n: true,
            show_percent: true,
            percent_digits: 1,
            mean_digits: 2,
            std_digits: 2,
            var_digits: 2,
            median_digits: 2,
            min_digits: 0,
            max_digits: 0,
            show_base_parenthesis: true,
            percent_symbol: true,
            hide_zero_base_columns: true,
            hide_zero_banners: true,
            hide_zero_stubs: true,
            is_transpose: false,
            format_bracket_all_n: false,
            stat_label_mean: 'Mean',
            stat_label_median: 'Median',
            stat_label_mode: 'Mode',
            stat_label_std: 'Std'
        }
    });

    const [weightOptions, setWeightOptions] = useState(['없음']);
    const [scaleData, setScaleData] = useState([]);
    const [rankData, setRankData] = useState([]);
    const [groupData, setGroupData] = useState([]);
    const [contextData, setContextData] = useState(null);

    // --- 범용 데이터 필터 ---
    const [dataFilterBadges, setDataFilterBadges] = useState([]);
    const [filterVariables, setFilterVariables] = useState([]);
    const [isFilterValid, setIsFilterValid] = useState(true);
    const [isFilterZero, setIsFilterZero] = useState(false);

    const handleChangeFilterBadges = (next) => {
        setDataFilterBadges(next);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    // --- 데이터 fetch 로직 ---
    const fetchInitialData = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) return;

        loadingSpinner.show();
        try {
            // 1. 설정 정보 조회
            const contextPromise = getTableRenderContext.mutateAsync({ pageid: pageId, user: auth.user.userId });
            const detailPromise = getTableDetail.mutateAsync({ pageid: pageId, user: auth.user.userId });
            // 2. 가중치 선택을 위한 기본 변수 목록 조회
            const variablesPromise = getBaseVariableList.mutateAsync({ pageid: pageId, user: auth.user.userId });
            // 3. 가중치 설정 탭 목록 조회
            const recodedPlainPromise = getRecodedPlain.mutateAsync({ pageid: pageId, user: auth.user.userId });

            const [renderContext, tableDetail, varList, recodedPlainRes] = await Promise.all([
                contextPromise,
                detailPromise,
                variablesPromise,
                recodedPlainPromise
            ]);

            if (renderContext) {
                setContextData(renderContext);
            }

            let nextSettings = { ...settings };
            let nextScaleData = scaleData;
            let nextRankData = rankData;
            let nextGroupData = groupData;

            let actualTableDetail = tableDetail?.resultjson || tableDetail;

            // 범용 데이터 필터 배지 복원
            setDataFilterBadges(Array.isArray(actualTableDetail?.data_filter_badges) ? actualTableDetail.data_filter_badges : []);

            if (actualTableDetail?.id || renderContext?.id) {
                const ui = actualTableDetail?.ui_settings || {};

                const initDisplay = {
                    ...settings.display,
                };
                const policy = actualTableDetail?.display_policy || renderContext?.effective_display_policy;

                const policySources = [
                    renderContext?.effective_display_policy,
                    actualTableDetail?.display_policy
                ];
                policySources.forEach(source => {
                    if (source) {
                        Object.keys(source).forEach(key => {
                            if (source[key] !== null && source[key] !== undefined) {
                                initDisplay[key] = source[key];
                            }
                        });
                    }
                });

                if (ui.format_show_n !== undefined && ui.format_show_n !== null) initDisplay.show_n = ui.format_show_n;
                if (ui.format_show_percent !== undefined && ui.format_show_percent !== null) initDisplay.show_percent = ui.format_show_percent;
                if (ui.format_n_round !== undefined && ui.format_n_round !== null) initDisplay.n_digits = ui.format_n_round;
                if (ui.format_percent_round !== undefined && ui.format_percent_round !== null) initDisplay.percent_digits = ui.format_percent_round;
                if (ui.format_mean_round !== undefined && ui.format_mean_round !== null) initDisplay.mean_digits = ui.format_mean_round;
                if (ui.format_std_round !== undefined && ui.format_std_round !== null) initDisplay.std_digits = ui.format_std_round;
                if (ui.format_var_round !== undefined && ui.format_var_round !== null) initDisplay.var_digits = ui.format_var_round;
                if (ui.format_median_round !== undefined && ui.format_median_round !== null) initDisplay.median_digits = ui.format_median_round;
                if (ui.format_min_round !== undefined && ui.format_min_round !== null) initDisplay.min_digits = ui.format_min_round;
                if (ui.format_max_round !== undefined && ui.format_max_round !== null) initDisplay.max_digits = ui.format_max_round;
                if (ui.hide_zero_base_columns !== undefined && ui.hide_zero_base_columns !== null) initDisplay.hide_zero_base_columns = ui.hide_zero_base_columns;
                if (ui.hide_zero_banners !== undefined && ui.hide_zero_banners !== null) initDisplay.hide_zero_banners = ui.hide_zero_banners;
                if (ui.hide_zero_stubs !== undefined && ui.hide_zero_stubs !== null) initDisplay.hide_zero_stubs = ui.hide_zero_stubs;
                if (ui.percent_symbol !== undefined && ui.percent_symbol !== null) initDisplay.percent_symbol = ui.percent_symbol;
                else if (renderContext?.effective_display_policy?.percent_symbol !== undefined) initDisplay.percent_symbol = renderContext.effective_display_policy.percent_symbol;
                if (ui.is_transpose !== undefined && ui.is_transpose !== null) initDisplay.is_transpose = ui.is_transpose;
                else if (ui.format_is_transpose !== undefined && ui.format_is_transpose !== null) initDisplay.is_transpose = ui.format_is_transpose;
                else if (policy && policy.is_transpose !== undefined && policy.is_transpose !== null) initDisplay.is_transpose = policy.is_transpose;

                if (ui.format_bracket_all_n !== undefined && ui.format_bracket_all_n !== null) initDisplay.format_bracket_all_n = ui.format_bracket_all_n;
                else if (ui.bracket_all_n !== undefined && ui.bracket_all_n !== null) initDisplay.format_bracket_all_n = ui.bracket_all_n;
                else if (policy && policy.format_bracket_all_n !== undefined && policy.format_bracket_all_n !== null) initDisplay.format_bracket_all_n = policy.format_bracket_all_n;
                else if (policy && policy.bracket_all_n !== undefined && policy.bracket_all_n !== null) initDisplay.format_bracket_all_n = policy.bracket_all_n;

                initDisplay.stat_label_mean = ui.stat_label_mean ?? ui.stat_labels?.mean ?? 'Mean';
                initDisplay.stat_label_median = ui.stat_label_median ?? ui.stat_labels?.median ?? 'Median';
                initDisplay.stat_label_mode = ui.stat_label_mode ?? ui.stat_labels?.mode ?? 'Mode';
                initDisplay.stat_label_std = ui.stat_label_std ?? ui.stat_labels?.std ?? 'Std';

                // base_prefix / base_postfix 값에 따라 show_base_parenthesis 값 판별
                if (policy && policy.base_prefix !== undefined && policy.base_prefix !== null) {
                    initDisplay.show_base_parenthesis = (policy.base_prefix === "(" && policy.base_postfix === ")");
                } else if (ui.base_prefix !== undefined && ui.base_prefix !== null) {
                    initDisplay.show_base_parenthesis = (ui.base_prefix === "(" && ui.base_postfix === ")");
                } else if (ui.show_base_parenthesis !== undefined && ui.show_base_parenthesis !== null) {
                    initDisplay.show_base_parenthesis = ui.show_base_parenthesis;
                } else if (policy && policy.show_base_parenthesis !== undefined && policy.show_base_parenthesis !== null) {
                    initDisplay.show_base_parenthesis = policy.show_base_parenthesis;
                }

                let mergedRender = {
                    ...settings.render,
                    ...renderContext?.effective_render_settings,
                    ...ui,
                    font_family: ui.font_family || ui.font_family_base || settings.render.font_family,
                    font_size: ui.font_size || ui.font_size_base || settings.render.font_size,
                    theme_primary: ui.theme_primary || ui.theme_primary_base || settings.render.theme_primary,
                    theme_primary_fg: ui.theme_primary_fg || ui.theme_primary_fg_base || settings.render.theme_primary_fg,
                    theme_stub_header_bg: ui.theme_stub_header_bg || settings.render.theme_stub_header_bg,
                    theme_stub_header_fg: ui.theme_stub_header_fg || settings.render.theme_stub_header_fg,
                    theme_bg: ui.theme_bg || settings.render.theme_bg,
                    theme_stripe: ui.theme_stripe || settings.render.theme_stripe,
                    theme_text: ui.theme_text || settings.render.theme_text,
                    theme_text_muted: ui.theme_text_muted || settings.render.theme_text_muted,
                    theme_grid_color: ui.theme_grid_color || settings.render.theme_grid_color,
                    theme_grid_style: ui.theme_grid_style || settings.render.theme_grid_style,
                    theme_grid_width: ui.theme_grid_width || settings.render.theme_grid_width,
                    theme_stub_divider_color: ui.theme_stub_divider_color || settings.render.theme_stub_divider_color,
                    theme_stub_divider_style: ui.theme_stub_divider_style || settings.render.theme_stub_divider_style,
                    theme_stub_divider_width: ui.theme_stub_divider_width || settings.render.theme_stub_divider_width,
                    theme_section_separator_color: ui.theme_section_separator_color || settings.render.theme_section_separator_color,
                    theme_section_separator_style: ui.theme_section_separator_style || settings.render.theme_section_separator_style,
                    theme_section_separator_width: ui.theme_section_separator_width || settings.render.theme_section_separator_width,
                    theme_header_divider_color: ui.theme_header_divider_color || settings.render.theme_header_divider_color,
                    theme_header_divider_style: ui.theme_header_divider_style || settings.render.theme_header_divider_style,
                    theme_header_divider_width: ui.theme_header_divider_width || settings.render.theme_header_divider_width,
                    theme_table_outer_top_color: ui.theme_table_outer_top_color || settings.render.theme_table_outer_top_color,
                    theme_table_outer_top_style: ui.theme_table_outer_top_style || settings.render.theme_table_outer_top_style,
                    theme_table_outer_top_width: ui.theme_table_outer_top_width || settings.render.theme_table_outer_top_width,
                    theme_table_outer_bottom_color: ui.theme_table_outer_bottom_color || settings.render.theme_table_outer_bottom_color,
                    theme_table_outer_bottom_style: ui.theme_table_outer_bottom_style || settings.render.theme_table_outer_bottom_style,
                    theme_table_outer_bottom_width: ui.theme_table_outer_bottom_width || settings.render.theme_table_outer_bottom_width,
                    theme_table_outer_left_color: ui.theme_table_outer_left_color || settings.render.theme_table_outer_left_color,
                    theme_table_outer_left_style: ui.theme_table_outer_left_style || settings.render.theme_table_outer_left_style,
                    theme_table_outer_left_width: ui.theme_table_outer_left_width || settings.render.theme_table_outer_left_width,
                    theme_table_outer_right_color: ui.theme_table_outer_right_color || settings.render.theme_table_outer_right_color,
                    theme_table_outer_right_style: ui.theme_table_outer_right_style || settings.render.theme_table_outer_right_style,
                    theme_table_outer_right_width: ui.theme_table_outer_right_width || settings.render.theme_table_outer_right_width,
                    theme_header_font: ui.theme_header_font || settings.render.theme_header_font,
                    theme_stub_font: ui.theme_stub_font || settings.render.theme_stub_font,
                    theme_data_font: ui.theme_data_font || settings.render.theme_data_font,
                    theme_header_group_bg: ui.theme_header_group_bg || settings.render.theme_header_group_bg,
                    theme_header_group_fg: ui.theme_header_group_fg || settings.render.theme_header_group_fg,
                    theme_stub_group_bg: ui.theme_stub_group_bg || settings.render.theme_stub_group_bg,
                    theme_stub_group_fg: ui.theme_stub_group_fg || settings.render.theme_stub_group_fg,
                    theme_stub_leaf_bg: ui.theme_stub_leaf_bg || settings.render.theme_stub_leaf_bg,
                    theme_stub_leaf_fg: ui.theme_stub_leaf_fg || settings.render.theme_stub_leaf_fg,
                    theme_stub_tier_divider_color: ui.theme_stub_tier_divider_color || settings.render.theme_stub_tier_divider_color,
                    theme_stub_tier_divider_style: ui.theme_stub_tier_divider_style || settings.render.theme_stub_tier_divider_style,
                    theme_stub_tier_divider_width: ui.theme_stub_tier_divider_width || settings.render.theme_stub_tier_divider_width,
                    theme_header_tier_divider_color: ui.theme_header_tier_divider_color || settings.render.theme_header_tier_divider_color,
                    theme_header_tier_divider_style: ui.theme_header_tier_divider_style || settings.render.theme_header_tier_divider_style,
                    theme_header_tier_divider_width: ui.theme_header_tier_divider_width || settings.render.theme_header_tier_divider_width,
                    theme_banner_divider_color: ui.theme_banner_divider_color || settings.render.theme_banner_divider_color,
                    theme_banner_divider_style: ui.theme_banner_divider_style || settings.render.theme_banner_divider_style,
                    theme_banner_divider_width: ui.theme_banner_divider_width || settings.render.theme_banner_divider_width,
                    theme_base_bg: ui.theme_base_bg !== undefined ? ui.theme_base_bg : settings.render.theme_base_bg,
                    theme_base_fg: ui.theme_base_fg !== undefined ? ui.theme_base_fg : settings.render.theme_base_fg,
                    theme_etc_bg: ui.theme_etc_bg !== undefined ? ui.theme_etc_bg : settings.render.theme_etc_bg,
                    theme_etc_fg: ui.theme_etc_fg !== undefined ? ui.theme_etc_fg : settings.render.theme_etc_fg,
                    theme_data_col_divider_color: ui.theme_data_col_divider_color || settings.render.theme_data_col_divider_color,
                    theme_data_col_divider_style: ui.theme_data_col_divider_style || settings.render.theme_data_col_divider_style,
                    theme_data_col_divider_width: ui.theme_data_col_divider_width || settings.render.theme_data_col_divider_width,
                    theme_group_preset_bg: ui.theme_group_preset_bg !== undefined ? ui.theme_group_preset_bg : settings.render.theme_group_preset_bg,
                    theme_group_preset_fg: ui.theme_group_preset_fg !== undefined ? ui.theme_group_preset_fg : settings.render.theme_group_preset_fg,
                    theme_group_preset_divider_color: ui.theme_group_preset_divider_color !== undefined ? ui.theme_group_preset_divider_color : settings.render.theme_group_preset_divider_color,
                    theme_group_preset_divider_style: ui.theme_group_preset_divider_style !== undefined ? ui.theme_group_preset_divider_style : settings.render.theme_group_preset_divider_style,
                    theme_group_preset_divider_width: ui.theme_group_preset_divider_width !== undefined ? ui.theme_group_preset_divider_width : settings.render.theme_group_preset_divider_width,
                    stub_group_layout: ui.stub_group_layout || settings.render.stub_group_layout,
                    format_percent_as_column: ui.format_percent_as_column !== undefined ? ui.format_percent_as_column : settings.render.format_percent_as_column,
                };

                nextSettings = {
                    weight_variable: actualTableDetail?.weight_variable || renderContext?.weight_variable || '없음',
                    confidence_level: actualTableDetail?.confidence_level || renderContext?.confidence_level || 95,
                    render: mergedRender,
                    display: initDisplay
                };

                setSettings(nextSettings);

                if (actualTableDetail?.scale_presets) {
                    nextScaleData = actualTableDetail.scale_presets.map(item => {
                        const options = item.options || {};
                        let bands = [];
                        if (Array.isArray(options.bands)) {
                            bands = options.bands.map((b, bIdx) => ({
                                id: b.id || `band_${bIdx}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                label: b.label || 'Top',
                                values: Array.isArray(b.values) ? b.values.join(',') : ''
                            }));
                            // No sorting to preserve original layout order

                            // Keep the bands list in its loaded sequence
                        }
                        return {
                            id: item.id,
                            name: item.name || '',
                            type: item.type || 'scale',
                            min: options.min ?? 1,
                            max: options.max ?? 5,
                            recode: !!options.reverse,
                            reverse_order: !!options.reverse_order,
                            ex_show: !!options.ex_show,
                            bands: bands
                        };
                    });
                    setScaleData(nextScaleData);
                }
                if (actualTableDetail?.rank_presets) {
                    nextRankData = actualTableDetail.rank_presets.map(item => {
                        let combinations = [];
                        let maxVal = 5;
                        if (Array.isArray(item.combinations)) {
                            combinations = item.combinations.map(c => {
                                const vals = String(c).split('+').map(Number).filter(n => !isNaN(n));
                                let label = '';
                                if (vals.length === 1 && vals[0] === 1) label = '1순위';
                                else if (vals.length > 1 && vals.every((v, idx) => v === idx + 1)) label = `Top${vals.length}`;
                                else label = vals.join('+');

                                return { label: label, values: vals };
                            });
                            const allVals = item.combinations.flatMap(c => String(c).split('+').map(Number));
                            if (allVals.length > 0) {
                                maxVal = Math.max(...allVals, 5);
                            }
                        }
                        return {
                            id: item.id,
                            name: item.name || '',
                            max: maxVal,
                            combinations: combinations
                        };
                    });
                    setRankData(nextRankData);
                }
                if (actualTableDetail?.group_presets) {
                    nextGroupData = actualTableDetail.group_presets.map(item => {
                        let groups = [];
                        if (Array.isArray(item.groups)) {
                            groups = item.groups.map((g, gIdx) => ({
                                id: g.id || `g_${gIdx}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                label: g.label || '',
                                values: g.values_text ? String(g.values_text) : (Array.isArray(g.values) ? g.values.join(',') : ''),
                                bottom_values: g.bottom_values_text ? String(g.bottom_values_text) : (Array.isArray(g.bottom_values) ? g.bottom_values.join(',') : ''),
                                tier: Number(g.tier) === 2 ? 2 : 1
                            }));
                        }
                        return {
                            id: item.id,
                            name: item.name || '',
                            stt_position: item.stt_position || 'before_first',
                            generate_group_crosstab: !!item.generate_group_crosstab,
                            groups: groups
                        };
                    });
                    setGroupData(nextGroupData);
                }
            }

            // --- 가중치 목록 parsing ---
            const actualRecodedPlain = recodedPlainRes?.resultjson || recodedPlainRes?.data?.resultjson || recodedPlainRes || {};
            const loadedWeights = [];
            Object.keys(actualRecodedPlain).forEach(key => {
                const item = actualRecodedPlain[key];
                if (item && (item.variable_role === 'weight' || item.recoded_type === 'weight')) {
                    loadedWeights.push({
                        id: item.id,
                        label: item.label || item.name || '',
                        type: item.type || 'single',
                        info: (item.info || []).map(infoItem => ({
                            value: infoItem.value !== undefined && infoItem.value !== null ? Number(infoItem.value) : (infoItem.val !== undefined && infoItem.val !== null ? Number(infoItem.val) : ''),
                            label: infoItem.label !== undefined ? infoItem.label : '',
                            logic: infoItem.logic !== undefined ? infoItem.logic : (infoItem.condition !== undefined ? infoItem.condition : ''),
                            inEdit: false
                        }))
                    });
                }
            });

            setWeights(loadedWeights);

            if (loadedWeights.length > 0) {
                const exists = loadedWeights.find(w => w.id === selectedWeightId);
                if (exists) {
                    setSelectedWeightId(exists.id);
                    setCurrentWeightId(exists.id);
                    setCurrentWeightLabel(exists.label);
                    setCurrentWeightType(exists.type || 'single');
                    setCurrentWeightInfo(exists.info || []);
                    originalWeightInfoRef.current = JSON.parse(JSON.stringify(exists.info || []));
                } else {
                    setSelectedWeightId(loadedWeights[0].id);
                    setCurrentWeightId(loadedWeights[0].id);
                    setCurrentWeightLabel(loadedWeights[0].label);
                    setCurrentWeightType(loadedWeights[0].type || 'single');
                    setCurrentWeightInfo(loadedWeights[0].info || []);
                    originalWeightInfoRef.current = JSON.parse(JSON.stringify(loadedWeights[0].info || []));
                }
            } else {
                setSelectedWeightId('');
                setCurrentWeightId('');
                setCurrentWeightLabel('');
                setCurrentWeightType('single');
                setCurrentWeightInfo([]);
            }

            const actualVarList = varList?.resultjson || varList?.data?.resultjson || varList;
            let baseList = [];
            if (String(varList?.success) === '777' && varList?.resultjson) {
                const raw = varList.resultjson;
                baseList = Array.isArray(raw) ? raw : Object.values(raw);
            } else if (Array.isArray(actualVarList)) {
                baseList = actualVarList;
            } else if (actualVarList && typeof actualVarList === 'object') {
                baseList = Object.values(actualVarList);
            }
            setVariableList(baseList);

            // 범용 필터 목록: 교차분석/추가분석과 동일하게 overview/context 의 base_variables 사용
            getOverviewContext.mutateAsync({ pageid: pageId, user: auth.user.userId })
                .then(ctxRes => {
                    const ctx = ctxRes?.resultjson || ctxRes || {};
                    setFilterVariables(toFilterVariables(ctx.base_variables));
                })
                .catch(e => console.error('Failed to load filter variables:', e));
            if (baseList.length > 0 || Array.isArray(actualVarList)) {
                const listToUse = baseList.length > 0 ? baseList : actualVarList;
                const weightOpt = ['없음', ...listToUse.map(v => v.name || v.label)];
                setWeightOptions(weightOpt);

                // 초기 히스토리 기준점 설정 (서버 데이터)
                history.reset({
                    settings: nextSettings,
                    scaleData: nextScaleData,
                    rankData: nextRankData,
                    groupData: nextGroupData
                });

                originalPresetsRef.current = {
                    scale: JSON.parse(JSON.stringify(nextScaleData || [])),
                    rank: JSON.parse(JSON.stringify(nextRankData || [])),
                    group: JSON.parse(JSON.stringify(nextGroupData || []))
                };
            } else {
                // varList가 배열이 아니더라도 프리셋 원본은 반드시 저장해야 함
                history.reset({
                    settings: nextSettings,
                    scaleData: nextScaleData,
                    rankData: nextRankData,
                    groupData: nextGroupData
                });

                originalPresetsRef.current = {
                    scale: JSON.parse(JSON.stringify(nextScaleData || [])),
                    rank: JSON.parse(JSON.stringify(nextRankData || [])),
                    group: JSON.parse(JSON.stringify(nextGroupData || []))
                };
            }
        } catch (err) {
            console.error("Failed to fetch initial setting data:", err);
        } finally {
            loadingSpinner.hide();
        }
    };

    useEffect(() => {
        fetchInitialData();
        const handlePageUpdate = () => fetchInitialData();
        window.addEventListener("pageSelected", handlePageUpdate);
        return () => window.removeEventListener("pageSelected", handlePageUpdate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth?.user?.userId]);

    // 키보드 이벤트 (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) { // Redo (Ctrl+Shift+Z)
                        const redoData = history.redo();
                        if (redoData) {
                            isHistoryAction.current = true;
                            if (redoData.settings) setSettings(redoData.settings);
                            if (redoData.scaleData) setScaleData(redoData.scaleData);
                            if (redoData.rankData) setRankData(redoData.rankData);
                            if (redoData.groupData) setGroupData(redoData.groupData);
                        }
                    } else { // Undo (Ctrl+Z)
                        const undoData = history.undo();
                        if (undoData) {
                            isHistoryAction.current = true;
                            if (undoData.settings) setSettings(undoData.settings);
                            if (undoData.scaleData) setScaleData(undoData.scaleData);
                            if (undoData.rankData) setRankData(undoData.rankData);
                            if (undoData.groupData) setGroupData(undoData.groupData);
                        }
                    }
                } else if (e.key.toLowerCase() === 'y') { // Redo (Ctrl+Y)
                    const redoData = history.redo();
                    if (redoData) {
                        isHistoryAction.current = true;
                        if (redoData.settings) setSettings(redoData.settings);
                        if (redoData.scaleData) setScaleData(redoData.scaleData);
                        if (redoData.rankData) setRankData(redoData.rankData);
                        if (redoData.groupData) setGroupData(redoData.groupData);
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
        history.commit({ settings, scaleData, rankData, groupData });
    }, [settings, scaleData, rankData, groupData, history]);

    // --- 저장 로직 ---
    const handleSave = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) {
            modal.showAlert("알림", "저장할 수 없습니다. 다시 로그인하거나 페이지를 새로고침 해주세요.");
            return false;
        }

        if (!isFilterValid && dataFilterBadges.length > 0) {
            modal.showAlert("알림", "데이터 필터 조건식에 오류가 있어 저장할 수 없습니다.");
            return false;
        }

        // 완료집계 0명 → 저장 전 확인 (스펙 6장: 실수로 저장하지 않도록 안내)
        if (isFilterZero && dataFilterBadges.length > 0) {
            const proceed = await new Promise((resolve) => {
                modal.showConfirm('알림', '현재 데이터 필터 조건에 해당하는 완료 응답자가 0명입니다.\n저장하면 교차분석·추가분석·엑셀의 모든 표가 비게 됩니다.\n저장하시겠습니까?', {
                    btns: [
                        { title: "취소", click: () => resolve(false) },
                        { title: "저장", click: () => resolve(true) },
                    ],
                });
            });
            if (!proceed) return false;
        }

        // Validation: check if any weight has an empty label
        for (const w of weights) {
            let label = w.label;
            if (w.id === selectedWeightId) {
                label = currentWeightLabel;
            }
            if (!label || label.trim() === '') {
                modal.showAlert("알림", "가중치 라벨을 입력해 주세요.");
                return false;
            }
        }

        // Validation: check if any weight has all ratio values empty (null)
        for (const w of weights) {
            let info = w.info;
            if (w.id === selectedWeightId) {
                info = currentWeightInfo;
            }
            const hasAnyValue = (info || []).some(opt => opt.value !== '' && opt.value !== undefined && opt.value !== null);
            if (!hasAnyValue) {
                modal.showAlert("알림", "가중치 비율을 입력해 주세요.");
                return false;
            }
        }

        loadingSpinner.show();
        try {
            // 0. 가중치 설정 저장/삭제 처리 (즉시 삭제로 이관됨)

            for (const w of weights) {
                let id = w.id;
                let label = w.label;
                let info = w.info;

                if (w.id === selectedWeightId) {
                    id = currentWeightId;
                    label = currentWeightLabel;
                    info = currentWeightInfo;
                }

                const originalId = id;
                if (!id || id.trim() === '' || id.startsWith('new_')) {
                    const cleanId = id.startsWith('new_') ? id.replace('new_', 'weight_') : `weight_${Date.now()}`;
                    id = cleanId;
                }

                if (settings.weight_variable === originalId && originalId !== id) {
                    settings.weight_variable = id;
                }

                const pidValues = {};
                info.forEach(opt => {
                    if (opt.label) {
                        if (opt.value === '' || opt.value === undefined || opt.value === null) {
                            pidValues[String(opt.label)] = null;
                        } else {
                            const numVal = Number(opt.value);
                            pidValues[String(opt.label)] = isNaN(numVal) ? null : numVal;
                        }
                    }
                });

                const savePayload = {
                    pageid: pageId,
                    weight_variable_label: label || '',
                    weight_variable_name: id,
                    pid_values: pidValues,
                    user: auth.user.userId
                };

                await saveWeightSetPid.mutateAsync(savePayload);
            }

            const changedPresetIds = [];
            const isPresetEqual = (a, b, type) => {
                if (a.name !== b.name) return false;
                if (type === 'scale') {
                    if (a.min !== b.min || a.max !== b.max || a.recode !== b.recode || a.reverse_order !== b.reverse_order || a.ex_show !== b.ex_show) return false;
                    const aBands = a.bands || [];
                    const bBands = b.bands || [];
                    if (aBands.length !== bBands.length) return false;
                    for (let i = 0; i < aBands.length; i++) {
                        if (aBands[i].label !== bBands[i].label) return false;
                        if (String(aBands[i].values) !== String(bBands[i].values)) return false;
                    }
                } else if (type === 'rank') {
                    const aCombos = a.combinations || [];
                    const bCombos = b.combinations || [];
                    if (aCombos.length !== bCombos.length) return false;
                    for (let i = 0; i < aCombos.length; i++) {
                        if (aCombos[i].label !== bCombos[i].label) return false;
                        if (JSON.stringify(aCombos[i].values) !== JSON.stringify(bCombos[i].values)) return false;
                    }
                } else if (type === 'group') {
                    if ((a.stt_position || 'before_first') !== (b.stt_position || 'before_first')) return false;
                    if (!!a.generate_group_crosstab !== !!b.generate_group_crosstab) return false;
                    const aGroups = a.groups || [];
                    const bGroups = b.groups || [];
                    if (aGroups.length !== bGroups.length) return false;
                    for (let i = 0; i < aGroups.length; i++) {
                        if (aGroups[i].label !== bGroups[i].label) return false;
                        if (String(aGroups[i].values) !== String(bGroups[i].values)) return false;
                        if (String(aGroups[i].bottom_values || '') !== String(bGroups[i].bottom_values || '')) return false;
                        if ((Number(aGroups[i].tier) || 1) !== (Number(bGroups[i].tier) || 1)) return false;
                    }
                }
                return true;
            };

            const checkChanges = (currentData, originalData, typeName) => {
                const originalMap = new Map((originalData || []).map(item => [item.id, item]));
                (currentData || []).forEach(currentItem => {
                    const originalItem = originalMap.get(currentItem.id);
                    if (!originalItem) {
                        if (currentItem.id) changedPresetIds.push(currentItem.id);
                    } else if (!isPresetEqual(currentItem, originalItem, typeName)) {
                        if (currentItem.id) changedPresetIds.push(currentItem.id);
                    }
                });
            };

            checkChanges(scaleData, originalPresetsRef.current.scale, 'scale');
            checkChanges(rankData, originalPresetsRef.current.rank, 'rank');
            checkChanges(groupData, originalPresetsRef.current.group, 'group');

            const parseValues = (str) => {
                if (!str) return [];
                return String(str)
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s !== '')
                    .map(s => Number(s))
                    .filter(n => !isNaN(n));
            };

            // N이 0인(입력된 값이 없는) 밴드가 있는지 유효성 검사
            for (let i = 0; i < scaleData.length; i++) {
                const item = scaleData[i];
                const bands = item.bands || [];
                for (let j = 0; j < bands.length; j++) {
                    const band = bands[j];
                    const parsedVals = parseValues(band.values);
                    if (parsedVals.length === 0) {
                        modal.showAlert("알림", `[${item.name}]의 '${band.label}' 종류에 입력된 값이 없습니다.값을 지정하거나 해당 밴드를 삭제해 주세요.`);
                        loadingSpinner.hide();
                        return false;
                    }
                }
            }

            const scaleDataPayload = scaleData.map(item => {
                return {
                    id: item.id || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)} `,
                    name: item.name,
                    type: item.type || 'scale',
                    options: {
                        enabled: true,
                        min: (item.min === 0 || item.min) ? Number(item.min) : null,
                        max: (item.max === 0 || item.max) ? Number(item.max) : null,
                        reverse: !!item.recode,
                        reverse_order: !!item.reverse_order,
                        ex_show: !!item.ex_show,
                        score_transform: null,
                        custom_value_map: [],
                        bands: (item.bands || []).map(b => ({
                            label: b.label,
                            values: parseValues(b.values),
                            min: null,
                            max: null,
                            score: null
                        }))
                    }
                };
            });

            for (let i = 0; i < rankData.length; i++) {
                const item = rankData[i];
                if (!item.combinations || item.combinations.length === 0) {
                    modal.showAlert("알림", `[다중형 순위 설정]'${item.name}'에 유효한 조합이 하나 이상 있어야 합니다.`);
                    loadingSpinner.hide();
                    return false;
                }
                for (let j = 0; j < item.combinations.length; j++) {
                    const combo = item.combinations[j];
                    if (!combo.values || combo.values.length === 0) {
                        modal.showAlert("알림", `[다중형 순위 설정]'${item.name}'의 조합 중 선택된 순위가 없는 항목이 있습니다.`);
                        loadingSpinner.hide();
                        return false;
                    }
                }
            }

            const rankDataPayload = rankData.map(item => {
                const combos = (item.combinations || []).map(c => {
                    return [...c.values].sort((a, b) => a - b).join('+');
                }).filter(str => str !== '');
                return {
                    id: item.id || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)} `,
                    name: item.name,
                    type: 'multi',
                    combinations: combos,
                    ranks: []
                };
            });

            // 그룹 값 파싱: "1 to 100", "1~5", "1,2,3,5", "1 to 100, 999"
            const parseGroupValues = (str) => {
                if (!str) return [];
                const out = [];
                String(str).split(',').map(s => s.trim()).filter(Boolean).forEach(tok => {
                    const m = tok.match(/^(-?\d+(?:\.\d+)?)\s*(?:to|~)\s*(-?\d+(?:\.\d+)?)$/i);
                    if (m) {
                        let a = Number(m[1]), b = Number(m[2]);
                        if (a > b) [a, b] = [b, a];
                        for (let i = a; i <= b; i++) out.push(i);
                    } else {
                        const n = Number(tok);
                        if (!isNaN(n)) out.push(n);
                    }
                });
                return Array.from(new Set(out));
            };
            // "1to5" 등을 "1 to 5" 형태로 정규화
            const normalizeValuesText = (str) => String(str || '')
                .split(',').map(s => s.trim()).filter(Boolean)
                .map(s => s.replace(/\s*to\s*/i, ' to '))
                .join(', ');

            const groupDataPayload = groupData.map(item => {
                // 중분류은 바로 위 대분류 아래로
                let lastTier1Id = null;
                const groups = (item.groups || []).map((g, gIdx) => {
                    const id = g.id || `g_${gIdx}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    const tier = Number(g.tier) === 2 && lastTier1Id ? 2 : 1;
                    if (tier === 1) lastTier1Id = id;
                    return {
                        id,
                        label: g.label || '',
                        values: parseGroupValues(g.values),
                        values_text: normalizeValuesText(g.values),
                        bottom_values: parseGroupValues(g.bottom_values),
                        bottom_values_text: normalizeValuesText(g.bottom_values),
                        tier,
                        parent_group_id: tier === 2 ? lastTier1Id : null
                    };
                });
                return {
                    id: item.id || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)} `,
                    name: item.name,
                    stt_position: item.stt_position || 'before_first',
                    has_sub_group: groups.some(g => g.tier === 2),
                    generate_group_crosstab: !!item.generate_group_crosstab,
                    groups
                };
            });

            const payload = {
                user: auth.user.userId,
                pageid: pageId,
                weight_variable: settings.weight_variable !== '없음' ? settings.weight_variable : null,
                confidence_level: settings.confidence_level,
                is_transpose: !!settings.display.is_transpose,
                ui_settings: {
                    font_family: settings.render.font_family,
                    font_size: settings.render.font_size,
                    theme_primary: settings.render.theme_primary?.toUpperCase(),
                    theme_primary_fg: settings.render.theme_primary_fg?.toUpperCase(),
                    theme_stub_header_bg: settings.render.theme_stub_header_bg?.toUpperCase(),
                    theme_stub_header_fg: settings.render.theme_stub_header_fg?.toUpperCase(),
                    theme_bg: settings.render.theme_bg?.toUpperCase(),
                    theme_stripe: settings.render.theme_stripe?.toUpperCase(),
                    theme_text: settings.render.theme_text?.toUpperCase(),
                    theme_text_muted: settings.render.theme_text_muted?.toUpperCase(),
                    theme_grid_color: settings.render.theme_grid_color?.toUpperCase(),
                    theme_grid_style: settings.render.theme_grid_style,
                    theme_grid_width: settings.render.theme_grid_width,
                    theme_stub_divider_color: settings.render.theme_stub_divider_color?.toUpperCase(),
                    theme_stub_divider_style: settings.render.theme_stub_divider_style,
                    theme_stub_divider_width: settings.render.theme_stub_divider_width,
                    theme_section_separator_color: settings.render.theme_section_separator_color?.toUpperCase(),
                    theme_section_separator_style: settings.render.theme_section_separator_style,
                    theme_section_separator_width: settings.render.theme_section_separator_width,
                    theme_header_divider_color: settings.render.theme_header_divider_color?.toUpperCase(),
                    theme_header_divider_style: settings.render.theme_header_divider_style,
                    theme_header_divider_width: settings.render.theme_header_divider_width,
                    theme_table_outer_top_color: settings.render.theme_table_outer_top_color?.toUpperCase(),
                    theme_table_outer_top_style: settings.render.theme_table_outer_top_style,
                    theme_table_outer_top_width: settings.render.theme_table_outer_top_width,
                    theme_table_outer_bottom_color: settings.render.theme_table_outer_bottom_color?.toUpperCase(),
                    theme_table_outer_bottom_style: settings.render.theme_table_outer_bottom_style,
                    theme_table_outer_bottom_width: settings.render.theme_table_outer_bottom_width,
                    theme_table_outer_left_color: settings.render.theme_table_outer_left_color?.toUpperCase(),
                    theme_table_outer_left_style: settings.render.theme_table_outer_left_style,
                    theme_table_outer_left_width: settings.render.theme_table_outer_left_width,
                    theme_table_outer_right_color: settings.render.theme_table_outer_right_color?.toUpperCase(),
                    theme_table_outer_right_style: settings.render.theme_table_outer_right_style,
                    theme_table_outer_right_width: settings.render.theme_table_outer_right_width,
                    theme_header_font: settings.render.theme_header_font,
                    theme_stub_font: settings.render.theme_stub_font,
                    theme_data_font: settings.render.theme_data_font,
                    theme_header_group_bg: settings.render.theme_header_group_bg?.toUpperCase(),
                    theme_header_group_fg: settings.render.theme_header_group_fg?.toUpperCase(),
                    theme_stub_group_bg: settings.render.theme_stub_group_bg?.toUpperCase(),
                    theme_stub_group_fg: settings.render.theme_stub_group_fg?.toUpperCase(),
                    theme_stub_leaf_bg: settings.render.theme_stub_leaf_bg?.toUpperCase(),
                    theme_stub_leaf_fg: settings.render.theme_stub_leaf_fg?.toUpperCase(),
                    theme_stub_tier_divider_color: settings.render.theme_stub_tier_divider_color?.toUpperCase(),
                    theme_stub_tier_divider_style: settings.render.theme_stub_tier_divider_style,
                    theme_stub_tier_divider_width: settings.render.theme_stub_tier_divider_width,
                    theme_header_tier_divider_color: settings.render.theme_header_tier_divider_color?.toUpperCase(),
                    theme_header_tier_divider_style: settings.render.theme_header_tier_divider_style,
                    theme_header_tier_divider_width: settings.render.theme_header_tier_divider_width,
                    theme_banner_divider_color: settings.render.theme_banner_divider_color?.toUpperCase(),
                    theme_banner_divider_style: settings.render.theme_banner_divider_style,
                    theme_banner_divider_width: settings.render.theme_banner_divider_width,
                    theme_base_bg: settings.render.theme_base_bg?.toUpperCase(),
                    theme_base_fg: settings.render.theme_base_fg?.toUpperCase(),
                    theme_etc_bg: settings.render.theme_etc_bg?.toUpperCase(),
                    theme_etc_fg: settings.render.theme_etc_fg?.toUpperCase(),
                    theme_data_col_divider_color: settings.render.theme_data_col_divider_color?.toUpperCase(),
                    theme_data_col_divider_style: settings.render.theme_data_col_divider_style,
                    theme_data_col_divider_width: settings.render.theme_data_col_divider_width,
                    theme_group_preset_bg: settings.render.theme_group_preset_bg?.toUpperCase(),
                    theme_group_preset_fg: settings.render.theme_group_preset_fg?.toUpperCase(),
                    theme_group_preset_divider_color: settings.render.theme_group_preset_divider_color?.toUpperCase(),
                    theme_group_preset_divider_style: settings.render.theme_group_preset_divider_style,
                    theme_group_preset_divider_width: settings.render.theme_group_preset_divider_width,
                    stub_group_layout: settings.render.stub_group_layout,
                    format_percent_as_column: settings.render.format_percent_as_column,
                    format_is_transpose: !!settings.display.is_transpose,
                    is_transpose: !!settings.display.is_transpose,
                    format_show_n: settings.display.show_n,
                    format_show_percent: settings.display.show_percent,
                    format_n_round: settings.display.n_digits !== "" && settings.display.n_digits !== null && settings.display.n_digits !== undefined ? Number(settings.display.n_digits) : undefined,
                    stat_label_mean: settings.display.stat_label_mean || 'Mean',
                    stat_label_median: settings.display.stat_label_median || 'Median',
                    stat_label_mode: settings.display.stat_label_mode || 'Mode',
                    stat_label_std: settings.display.stat_label_std || 'Std',
                    stat_labels: {
                        mean: settings.display.stat_label_mean || 'Mean',
                        median: settings.display.stat_label_median || 'Median',
                        mode: settings.display.stat_label_mode || 'Mode',
                        std: settings.display.stat_label_std || 'Std'
                    },
                    format_percent_round: settings.display.percent_digits !== "" && settings.display.percent_digits !== null && settings.display.percent_digits !== undefined ? Number(settings.display.percent_digits) : undefined,
                    format_mean_round: settings.display.mean_digits !== "" && settings.display.mean_digits !== null && settings.display.mean_digits !== undefined ? Number(settings.display.mean_digits) : undefined,
                    format_std_round: settings.display.std_digits !== "" && settings.display.std_digits !== null && settings.display.std_digits !== undefined ? Number(settings.display.std_digits) : undefined,
                    format_var_round: settings.display.var_digits !== "" && settings.display.var_digits !== null && settings.display.var_digits !== undefined ? Number(settings.display.var_digits) : undefined,
                    format_median_round: settings.display.median_digits !== "" && settings.display.median_digits !== null && settings.display.median_digits !== undefined ? Number(settings.display.median_digits) : undefined,
                    format_min_round: settings.display.min_digits !== "" && settings.display.min_digits !== null && settings.display.min_digits !== undefined ? Number(settings.display.min_digits) : undefined,
                    format_max_round: settings.display.max_digits !== "" && settings.display.max_digits !== null && settings.display.max_digits !== undefined ? Number(settings.display.max_digits) : undefined,
                    hide_zero_base_columns: settings.display.hide_zero_base_columns,
                    hide_zero_banners: settings.display.hide_zero_banners,
                    hide_zero_stubs: settings.display.hide_zero_stubs,
                    show_base_parenthesis: settings.display.show_base_parenthesis,
                    base_prefix: settings.display.show_base_parenthesis ? "(" : "",
                    base_postfix: settings.display.show_base_parenthesis ? ")" : "",
                    percent_symbol: settings.display.percent_symbol,
                    format_bracket_all_n: !!settings.display.format_bracket_all_n,
                    bracket_all_n: !!settings.display.format_bracket_all_n,
                },
                display_policy: {
                    show_n: settings.display.show_n,
                    show_percent: settings.display.show_percent,
                    is_transpose: !!settings.display.is_transpose,
                    n_digits: settings.display.n_digits !== "" && settings.display.n_digits !== null && settings.display.n_digits !== undefined ? Number(settings.display.n_digits) : undefined,
                    percent_digits: settings.display.percent_digits !== "" && settings.display.percent_digits !== null && settings.display.percent_digits !== undefined ? Number(settings.display.percent_digits) : undefined,
                    mean_digits: settings.display.mean_digits !== "" && settings.display.mean_digits !== null && settings.display.mean_digits !== undefined ? Number(settings.display.mean_digits) : undefined,
                    std_digits: settings.display.std_digits !== "" && settings.display.std_digits !== null && settings.display.std_digits !== undefined ? Number(settings.display.std_digits) : undefined,
                    median_digits: settings.display.median_digits !== "" && settings.display.median_digits !== null && settings.display.median_digits !== undefined ? Number(settings.display.median_digits) : undefined,
                    min_digits: settings.display.min_digits !== "" && settings.display.min_digits !== null && settings.display.min_digits !== undefined ? Number(settings.display.min_digits) : undefined,
                    max_digits: settings.display.max_digits !== "" && settings.display.max_digits !== null && settings.display.max_digits !== undefined ? Number(settings.display.max_digits) : undefined,
                    var_digits: settings.display.var_digits !== "" && settings.display.var_digits !== null && settings.display.var_digits !== undefined ? Number(settings.display.var_digits) : undefined,
                    hide_zero_base_columns: settings.display.hide_zero_base_columns,
                    hide_zero_banners: settings.display.hide_zero_banners,
                    hide_zero_stubs: settings.display.hide_zero_stubs,
                    show_base_parenthesis: settings.display.show_base_parenthesis,
                    base_prefix: settings.display.show_base_parenthesis ? "(" : "",
                    base_postfix: settings.display.show_base_parenthesis ? ")" : "",
                    percent_symbol: settings.display.percent_symbol,
                    format_bracket_all_n: !!settings.display.format_bracket_all_n,
                    bracket_all_n: !!settings.display.format_bracket_all_n,
                    percent_as_column: settings.render.format_percent_as_column,
                    stub_group_layout: settings.render.stub_group_layout,
                },
                scale_presets: scaleDataPayload,
                rank_presets: rankDataPayload,
                group_presets: groupDataPayload,
                stat_presets: [],
                data_filter_expression: buildFilterExpression(dataFilterBadges) || null,
                data_filter_badges: dataFilterBadges
            };

            const result = await saveTableSettings.mutateAsync(payload);
            if (result?.message || result?.status === 'success') {
                if (onUnsavedChange) onUnsavedChange(false); // 저장 성공 시 더티 해제

                // --- 수정된 프리셋이 있다면 스터브 조회 및 재적용 ---
                if (changedPresetIds.length > 0) {
                    try {
                        const recodedRes = await getRecodedOverview.mutateAsync({ pageid: pageId, user: auth.user.userId });
                        const variablesMap = recodedRes?.resultjson?.variables || recodedRes?.data?.resultjson?.variables || {};
                        const stubItems = recodedRes?.resultjson?.stub_grid_items || recodedRes?.data?.resultjson?.stub_grid_items || [];

                        const targetStubIds = new Set();

                        // 1. stub_grid_items에서 참조 확인
                        stubItems.forEach(stub => {
                            const v = variablesMap[stub.recoded_var_id] || {};
                            if ((stub.scale_preset_id && changedPresetIds.includes(stub.scale_preset_id)) ||
                                (v.scale_preset_id && changedPresetIds.includes(v.scale_preset_id)) ||
                                (stub.rank_preset_id && changedPresetIds.includes(stub.rank_preset_id)) ||
                                (v.rank_preset_id && changedPresetIds.includes(v.rank_preset_id)) ||
                                (stub.group_preset_id && changedPresetIds.includes(stub.group_preset_id)) ||
                                (v.group_preset_id && changedPresetIds.includes(v.group_preset_id))) {
                                targetStubIds.add(stub.recoded_var_id);
                            }
                        });

                        // 2. variablesMap 자체에서도 참조 확인
                        Object.keys(variablesMap).forEach(key => {
                            const v = variablesMap[key];
                            if ((v.scale_preset_id && changedPresetIds.includes(v.scale_preset_id)) ||
                                (v.rank_preset_id && changedPresetIds.includes(v.rank_preset_id)) ||
                                (v.group_preset_id && changedPresetIds.includes(v.group_preset_id))) {
                                targetStubIds.add(key);
                            }
                        });

                        const targetStubIdsArray = Array.from(targetStubIds);
                        if (targetStubIdsArray.length > 0) {
                            await reapplyPreset.mutateAsync({ pageid: pageId, user: auth.user.userId, recoded_var_ids: targetStubIdsArray });
                        }
                    } catch (e) {
                        console.error("Failed to reapply presets:", e);
                    }
                }

                modal.showAlert("알림", "설정이 저장되었습니다.");
                await fetchInitialData();
                return true;
            }
            return false;
        } catch (err) {
            console.error("Save failed:", err);
            modal.showAlert("오류", "저장에 실패했습니다.");
            return false;
        } finally {
            loadingSpinner.hide();
        }
    };

    const tabs = [
        { label: '분석 설정' },
        { label: '표 디자인 설정' },
        { label: '가중치 설정' },
        { label: '데이터 필터', badge: dataFilterBadges.length },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 0: return renderAnalysisTab();
            case 1: return renderTableSettingsTab();
            case 2: return renderWeightSettingsTab();
            case 3: return renderDataFilterTab();
            default: return null;
        }
    };
    // 0. 데이터 필터 탭 (범용 필터)
    const renderDataFilterTab = () => (
        <div className="dp-setting-section" style={{ padding: '20px 24px', background: 'var(--ds-page-bg, #f1f5f9)', boxSizing: 'border-box', minHeight: '100%' }}>
            <DataFilterCard
                variables={filterVariables}
                badges={dataFilterBadges}
                onChangeBadges={handleChangeFilterBadges}
                previewFilter={previewFilter}
                onValidityChange={setIsFilterValid}
                onZeroChange={setIsFilterZero}
            />
        </div>
    );

    // 1. 분석 설정 탭
    const renderAnalysisTab = () => (
        <AnalysisSettingTab
            contextData={contextData}
            settings={settings}
            setSettings={setSettings}
            weightOptions={weightOptions}
            scaleData={scaleData}
            setScaleData={setScaleData}
            rankData={rankData}
            setRankData={setRankData}
            groupData={groupData}
            setGroupData={setGroupData}
            onUnsavedChange={onUnsavedChange}
        />
    );

    // 2. 표 디자인 설정 탭
    const renderTableSettingsTab = () => (
        <TableSettingTab
            settings={settings}
            setSettings={setSettings}
            onUnsavedChange={onUnsavedChange}
        />
    );

    // 3. 가중치 설정 탭
    const renderWeightSettingsTab = () => (
        <div className="dp-setting-section" onClick={handleCloseWeightEdit} style={{
            padding: '20px 24px',
            background: 'var(--ds-page-bg, #f1f5f9)',
            boxSizing: 'border-box',
            width: '100%',
            maxWidth: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: 0,
            overflow: 'hidden'
        }}>
            <style>{`
                /* Disable Kendo's buggy JS-driven hover classes that get stuck on re-renders */
                .dp-table-container .k-grid tbody tr.k-hover,
                .dp-table-container .k-grid tbody tr.k-state-hover,
                .dp-table-container .k-grid tbody tr.k-hover td,
                .dp-table-container .k-grid tbody tr.k-state-hover td,
                .dp-table-container .k-grid tbody td.k-hover,
                .dp-table-container .k-grid tbody td.k-state-hover,
                .dp-table-container .k-grid tbody td.k-focus,
                .dp-table-container .k-grid tbody td.k-state-focused {
                    background-color: inherit !important;
                }

                /* Use native CSS :hover which is handled by the browser and never gets stuck */
                .dp-table-container .k-grid tbody tr:hover td:not(.changed-cell) {
                    background-color: var(--srt-secondary-100) !important;
                }

                /* 기본 가중치 변수 드롭다운 화살표 표시 */
                .dp-setting-card .k-dropdownlist .k-input-button {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    min-width: 28px;
                    background: transparent !important;
                    border: none !important;
                    cursor: pointer;
                }
                .dp-setting-card .k-dropdownlist .k-input-button > * {
                    display: none !important;
                }
                .dp-setting-card .k-dropdownlist .k-input-button::after {
                    content: '';
                    display: block;
                    width: 6px;
                    height: 6px;
                    border-right: 1.8px solid var(--srt-primary-600, #3B82F6);
                    border-bottom: 1.8px solid var(--srt-primary-600, #3B82F6);
                    transform: translateY(-2px) rotate(45deg);
                    pointer-events: none;
                    transition: all 0.15s ease;
                }
                .dp-setting-card .k-dropdownlist:hover .k-input-button::after {
                    border-color: var(--srt-primary-700, #1D4ED8);
                }
            `}</style>
            {/* 기본 Weight 변수 카드 */}
            <div className="dp-setting-card" style={{ flexShrink: 0, marginBottom: '0px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155', fontSize: '13px' }}>
                        기본 가중치 변수
                    </div>
                    <div style={{ position: 'relative', width: '220px', display: 'inline-flex', alignItems: 'center' }}>
                        <DropDownList
                            style={{ width: '100%', fontSize: '13px' }}
                            data={weightDropdownData}
                            textField="text"
                            dataItemKey="value"
                            value={weightDropdownData.find(item => item.value === (settings.weight_variable || '없음')) || weightDropdownData[0]}
                            onChange={(e) => {
                                setSettings({ ...settings, weight_variable: e.value.value });
                                if (onUnsavedChange) onUnsavedChange(true);
                            }}
                        />
                        <ChevronDown
                            size={16}
                            color="#64748B"
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                zIndex: 3
                            }}
                        />
                    </div>
                    {settings.weight_variable === '없음' && (
                        <span style={{ color: '#DC2626', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <AlertCircle size={13} /> 가중치 변수가 지정되지 않았습니다.
                        </span>
                    )}
                </div>
            </div>

            {/* 가중치 목록 & 그리드 영역 */}
            <div className="dp-main-layout" onClick={(e) => e.stopPropagation()} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
                {/* 사이드바 */}
                <div className={`dp-sidebar-container ${!isWeightSidebarOpen ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: isWeightSidebarOpen ? '260px' : '40px' }}>
                    {!isWeightSidebarOpen && (
                        <div className="dp-sidebar-collapsed-bar" onClick={() => setIsWeightSidebarOpen(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div className="dp-collapsed-header"><ChevronRight size={16} /></div>
                        </div>
                    )}
                    {isWeightSidebarOpen && (
                        <div className="dp-sidebar custom-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div className="dp-sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>가중치 목록 ({filteredWeights.length})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button onClick={handleAddNewWeight} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '24px', padding: '0 8px', borderRadius: '4px', border: '1px solid var(--srt-primary-600)', color: 'var(--srt-primary-600)', background: 'var(--srt-primary-50)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                        <Plus size={12} /> 추가
                                    </button>
                                    <button className="dp-sidebar-toggle-btn-compact" onClick={() => setIsWeightSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                                        <ChevronLeft size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="dp-sidebar-header" style={{ display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <div className="dp-search-input-wrapper" style={{ flex: 1, width: '100%', position: 'relative' }}>
                                    <Search size={14} className="dp-search-input-icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input type="text" placeholder="가중치ID 또는 라벨 검색" value={weightSearch} onChange={(e) => setWeightSearch(e.target.value)} className="dp-search-input" style={{ width: '100%', padding: '6px 10px 6px 30px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', outline: 'none' }} />
                                </div>
                            </div>
                            <div className="dp-banner-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px' }}>
                                {filteredWeights.map(w => (
                                    <div key={w.id}
                                        className={`dp-banner-item ${selectedWeightId === w.id ? 'active' : ''}`}
                                        onClick={() => selectWeight(w)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '8px 12px',
                                            minHeight: '40px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            background: selectedWeightId === w.id ? 'var(--srt-primary-50)' : 'transparent',
                                            color: selectedWeightId === w.id ? 'var(--srt-primary-700)' : '#1E293B',
                                            border: selectedWeightId === w.id ? '1.5px solid var(--srt-primary-600)' : '1px solid #cbd5e1',
                                            marginBottom: '4px',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <div className="dp-banner-item-info" style={{ flex: 1, paddingRight: '8px' }}>
                                            <span className="dp-banner-label" style={{ display: 'block', marginBottom: '1px', lineHeight: 1.3, fontSize: '12px', fontWeight: selectedWeightId === w.id ? 600 : 500 }}>
                                                {w.label || '(새 가중치 작성 중)'}
                                            </span>
                                            <span className="dp-banner-sub" style={{ display: 'block', fontSize: '11px', opacity: 0.6 }}>
                                                {w.id}
                                            </span>
                                        </div>
                                        <button className="dp-banner-delete" onClick={(e) => handleDeleteWeight(e, w.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }} onMouseEnter={e => e.currentTarget.style.color = '#EF4444'} onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 콘텐츠 영역 (중앙 PID 편집 그리드 + 우측 문항 매칭 사이드 패널) */}
                <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0, minWidth: 0, border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', background: '#FFFFFF', overflow: 'hidden' }}>
                    {selectedWeightId ? (
                        <>
                            {/* 중앙 PID별 가중치 수정 & 그리드 */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, borderRight: '1px solid #E2E8F0' }}>
                                {/* 상단 헤더: 가중치 라벨 */}
                                <div style={{
                                    padding: '12px 20px',
                                    borderBottom: '1px solid #E2E8F0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: '#FFFFFF',
                                    flexShrink: 0,
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>가중치 라벨</span>
                                        <input
                                            type="text"
                                            value={currentWeightLabel}
                                            onChange={(e) => handleUpdateWeightField('label', e.target.value)}
                                            placeholder="가중치 라벨 입력"
                                            style={{
                                                width: '240px',
                                                height: '32px',
                                                padding: '0 10px',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '6px',
                                                fontSize: '12.5px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* 중간 툴바: 응답자 데이터 목록 & 상단 액션 버튼들 */}
                                <div style={{
                                    padding: '10px 18px',
                                    borderBottom: '1px solid #E2E8F0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: '#F8FAFC',
                                    flexShrink: 0
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                                            응답자 데이터 목록 <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>(총 {currentWeightInfo.length.toLocaleString()}건)</span>
                                        </span>
                                        {matchedColumnName && (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                background: '#ECFDF5',
                                                color: '#059669',
                                                border: '1px solid #A7F3D0'
                                            }}>
                                                <CheckCircle2 size={12} /> {matchedColumnName} 매칭됨
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            onClick={handleResetWeightToOne}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                height: '26px',
                                                padding: '0 8px',
                                                borderRadius: '5px',
                                                border: '1px solid #CBD5E1',
                                                background: '#FFFFFF',
                                                fontSize: '11.5px',
                                                fontWeight: 600,
                                                color: '#475569',
                                                cursor: 'pointer'
                                            }}
                                            title="모든 가중치를 1.0으로 초기화"
                                        >
                                            <RefreshCw size={12} /> 1.0 초기화
                                        </button>
                                        <button
                                            onClick={handleDownloadTemplate}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                height: '26px',
                                                padding: '0 8px',
                                                borderRadius: '5px',
                                                border: '1px solid #CBD5E1',
                                                background: '#FFFFFF',
                                                fontSize: '11.5px',
                                                fontWeight: 600,
                                                color: '#475569',
                                                cursor: 'pointer'
                                            }}
                                            title="현재 PID가 담긴 CSV 템플릿 다운로드"
                                        >
                                            <Download size={12} /> 템플릿 받기
                                        </button>
                                    </div>
                                </div>

                                {/* 그리드 영역 */}
                                <div className="dp-table-container" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                    <WeightContext.Provider value={{ currentWeightInfo, updateWeightInfo, onUnsavedChange, originalWeightInfoRef }}>
                                        <KendoGridV2
                                            data={currentWeightInfo}
                                            showNo showNoRecordsAddBtn={false} editField="inEdit"
                                            onDataChange={updateWeightInfo}
                                            onRowClick={handleWeightRowClick}
                                            sortable={true}
                                            sort={weightSort}
                                            onSortChange={handleWeightSortChange}
                                            style={{ flex: 1, height: '100%', width: '100%' }}
                                        >
                                            <Column field="label" title="pid" width="200px" cell={PidCell} />
                                            <Column field="value" title="가중치 비율" cell={NumericEditCell} />
                                        </KendoGridV2>
                                    </WeightContext.Provider>
                                </div>
                            </div>

                            {/* 우측 사이드 패널: 문항 컬럼 / CSV 업로드 / 붙여넣기 */}
                            <div style={{
                                width: '350px',
                                flexShrink: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                background: '#FFFFFF',
                                minHeight: 0
                            }}>
                                {/* 상단 탭 3개: 세그먼트 컨트롤 형태 [문항 컬럼] [CSV 업로드] [붙여넣기] */}
                                <div style={{
                                    padding: '10px 14px',
                                    borderBottom: '1px solid #E2E8F0',
                                    background: '#FFFFFF',
                                    flexShrink: 0
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        background: '#F1F5F9',
                                        borderRadius: '8px',
                                        padding: '3px',
                                        gap: '2px'
                                    }}>
                                        <button
                                            onClick={() => setWeightRightTab('column')}
                                            style={{
                                                flex: 1,
                                                padding: '7px 0',
                                                border: 'none',
                                                borderRadius: '6px',
                                                background: weightRightTab === 'column' ? '#FFFFFF' : 'transparent',
                                                color: weightRightTab === 'column' ? 'var(--srt-primary-700, #1D4ED8)' : '#64748B',
                                                boxShadow: weightRightTab === 'column' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                                fontSize: '12px',
                                                fontWeight: weightRightTab === 'column' ? 700 : 500,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <FileSpreadsheet size={13} /> 문항 컬럼
                                        </button>
                                        <button
                                            onClick={() => setWeightRightTab('csv')}
                                            style={{
                                                flex: 1,
                                                padding: '7px 0',
                                                border: 'none',
                                                borderRadius: '6px',
                                                background: weightRightTab === 'csv' ? '#FFFFFF' : 'transparent',
                                                color: weightRightTab === 'csv' ? 'var(--srt-primary-700, #1D4ED8)' : '#64748B',
                                                boxShadow: weightRightTab === 'csv' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                                fontSize: '12px',
                                                fontWeight: weightRightTab === 'csv' ? 700 : 500,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <Upload size={13} /> CSV 업로드
                                        </button>
                                        <button
                                            onClick={() => setWeightRightTab('paste')}
                                            style={{
                                                flex: 1,
                                                padding: '7px 0',
                                                border: 'none',
                                                borderRadius: '6px',
                                                background: weightRightTab === 'paste' ? '#FFFFFF' : 'transparent',
                                                color: weightRightTab === 'paste' ? 'var(--srt-primary-700, #1D4ED8)' : '#64748B',
                                                boxShadow: weightRightTab === 'paste' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                                fontSize: '12px',
                                                fontWeight: weightRightTab === 'paste' ? 700 : 500,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <Clipboard size={13} /> 붙여넣기
                                        </button>
                                    </div>
                                </div>

                                {/* 패널 콘텐츠 영역 (하단 플로팅 챗봇 아이콘 간섭 방지를 위해 paddingBottom 36px 적용) */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 36px 14px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                                    {/* 1. 문항 컬럼 탭 */}
                                    {weightRightTab === 'column' && (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
                                            {/* 헤더 */}
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                                                문항 컬럼에서 자동 매칭
                                            </div>

                                            {/* 설명 문구 */}
                                            <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.45, fontWeight: 500 }}>
                                                데이터셋에 이미 가중치 수치가 기입된 문항을 선택하면, 별도 입력 없이 각 응답자(PID)별 가중치값을 자동으로 매칭합니다.
                                            </div>

                                            {/* 검색창 */}
                                            <div style={{ position: 'relative' }}>
                                                <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                                <input
                                                    type="text"
                                                    value={weightColumnSearch}
                                                    onChange={(e) => setWeightColumnSearch(e.target.value)}
                                                    placeholder="문항명 또는 변수 ID를 검색하세요."
                                                    style={{
                                                        width: '100%',
                                                        padding: '7px 10px 7px 28px',
                                                        border: '1px solid #CBD5E1',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box',
                                                        background: '#FFFFFF'
                                                    }}
                                                />
                                            </div>

                                            {/* 문항 목록 리스트 (flex: 1로 시원하게 확장) */}
                                            <div style={{
                                                flex: 1,
                                                minHeight: '220px',
                                                overflowY: 'auto',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '8px',
                                                background: '#F8FAFC',
                                                padding: '6px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '3px'
                                            }}>
                                                {extractLoading ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '140px', gap: '8px', color: '#64748B', fontSize: '12px' }}>
                                                        <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                                        가중치 값 추출 및 통계 분석 중...
                                                    </div>
                                                ) : filteredVariables.length === 0 ? (
                                                    <div style={{ padding: '36px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                                                        검색 결과가 없습니다.
                                                    </div>
                                                ) : (
                                                    filteredVariables.map((v, idx) => {
                                                        const varId = v.name || v.spss_name || v.id;
                                                        const varLabel = v.label || v.title || v.name || v.id;
                                                        const isSelected = selectedColumnId === varId;

                                                        return (
                                                            <div
                                                                key={varId || idx}
                                                                onClick={() => handleSelectColumnForWeight(v)}
                                                                title={`[${varId}] ${varLabel}`}
                                                                style={{
                                                                    padding: '5px 8px',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '11.5px',
                                                                    lineHeight: 1.35,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '7px',
                                                                    background: isSelected ? 'var(--srt-primary-50, #EFF6FF)' : '#FFFFFF',
                                                                    border: isSelected ? '1.5px solid var(--srt-primary-500, #3B82F6)' : '1px solid #E2E8F0',
                                                                    color: isSelected ? 'var(--srt-primary-700, #1D4ED8)' : '#334155',
                                                                    fontWeight: isSelected ? 700 : 500,
                                                                    transition: 'all 0.12s'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (!isSelected) {
                                                                        e.currentTarget.style.background = '#F1F5F9';
                                                                        e.currentTarget.style.borderColor = '#CBD5E1';
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!isSelected) {
                                                                        e.currentTarget.style.background = '#FFFFFF';
                                                                        e.currentTarget.style.borderColor = '#E2E8F0';
                                                                    }
                                                                }}
                                                            >
                                                                <span style={{
                                                                    fontSize: '10.5px',
                                                                    fontWeight: 700,
                                                                    padding: '1px 5px',
                                                                    borderRadius: '4px',
                                                                    background: isSelected ? '#DBEAFE' : '#F1F5F9',
                                                                    color: isSelected ? '#1D4ED8' : '#475569',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {varId}
                                                                </span>
                                                                <span
                                                                    title={varLabel}
                                                                    style={{
                                                                        flex: 1,
                                                                        fontSize: '11.5px',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    {varLabel}
                                                                </span>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {/* 하단 인터랙션 영역: 문항 선택 여부에 따른 맞춤 UI */}
                                            {extractedWeightData ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {/* 하단 요약 카드 (추출 통계) */}
                                                    <div style={{
                                                        background: '#F8FAFC',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '8px',
                                                        padding: '10px 12px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '8px'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                            <span
                                                                title={`매칭 요약: ${extractedWeightData.column_label || extractedWeightData.source_column || selectedColumnId}`}
                                                                style={{
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 700,
                                                                    color: '#1E293B',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    flex: 1,
                                                                    cursor: 'default'
                                                                }}
                                                            >
                                                                매칭 요약: {extractedWeightData.column_label || extractedWeightData.source_column}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                color: '#059669',
                                                                background: '#ECFDF5',
                                                                padding: '1px 6px',
                                                                borderRadius: '4px',
                                                                border: '1px solid #A7F3D0'
                                                            }}>
                                                                {extractedWeightData.matched_count?.toLocaleString()} / {extractedWeightData.total_rows?.toLocaleString()}건
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                                            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 4px', textAlign: 'center' }}>
                                                                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>최소값</div>
                                                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                                                                    {extractedWeightData.min !== null && extractedWeightData.min !== undefined ? Number(extractedWeightData.min).toFixed(4).replace(/\.?0+$/, '') || '0' : '-'}
                                                                </div>
                                                            </div>
                                                            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 4px', textAlign: 'center' }}>
                                                                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>최대값</div>
                                                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                                                                    {extractedWeightData.max !== null && extractedWeightData.max !== undefined ? Number(extractedWeightData.max).toFixed(4).replace(/\.?0+$/, '') || '0' : '-'}
                                                                </div>
                                                            </div>
                                                            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 4px', textAlign: 'center' }}>
                                                                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>평균값</div>
                                                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                                                                    {extractedWeightData.mean !== null && extractedWeightData.mean !== undefined ? Number(extractedWeightData.mean).toFixed(4) : '-'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {extractedWeightData.missing_count > 0 && (
                                                            <div style={{ fontSize: '10px', color: '#DC2626', fontWeight: 500 }}>
                                                                ※ 결측치 {extractedWeightData.missing_count.toLocaleString()}건 제외됨
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 활성화된 적용 버튼 (문항명 표시) */}
                                                    <button
                                                        onClick={handleApplyExtractedWeight}
                                                        style={{
                                                            width: '100%',
                                                            height: '38px',
                                                            borderRadius: '7px',
                                                            border: 'none',
                                                            background: 'var(--srt-primary-600, #2563EB)',
                                                            color: '#FFFFFF',
                                                            fontSize: '12.5px',
                                                            fontWeight: 700,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.92'}
                                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                    >
                                                        [{selectedColumnId}] 값으로 가중치 적용
                                                    </button>
                                                </div>
                                            ) : columnExtractError ? (
                                                <div style={{
                                                    padding: '10px 12px',
                                                    background: '#FEF2F2',
                                                    border: '1px solid #FECACA',
                                                    borderRadius: '6px',
                                                    fontSize: '11.5px',
                                                    color: '#DC2626',
                                                    textAlign: 'center',
                                                    fontWeight: 500,
                                                    lineHeight: 1.45
                                                }}>
                                                    ⚠️ {columnExtractError}
                                                </div>
                                            ) : (
                                                <div style={{
                                                    padding: '10px 12px',
                                                    background: '#F8FAFC',
                                                    border: '1px dashed #CBD5E1',
                                                    borderRadius: '6px',
                                                    fontSize: '11.5px',
                                                    color: '#64748B',
                                                    textAlign: 'center',
                                                    fontWeight: 500
                                                }}>
                                                    목록에서 가중치 값이 입력된 문항을 선택해 주세요.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. CSV 업로드 탭 */}
                                    {weightRightTab === 'csv' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>CSV 파일에서 가중치 매칭</div>
                                                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px', lineHeight: 1.45 }}>
                                                    PID와 가중치 비율 열이 포함된 CSV 파일을 업로드하면 자동으로 매핑됩니다.
                                                </div>
                                            </div>

                                            <label style={{
                                                border: '2px dashed #CBD5E1',
                                                borderRadius: '8px',
                                                padding: '36px 16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px',
                                                cursor: 'pointer',
                                                background: '#F8FAFC',
                                                transition: 'all 0.15s ease'
                                            }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--srt-primary-500, #3B82F6)'; e.currentTarget.style.background = '#EFF6FF'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
                                            >
                                                <Upload size={28} color="var(--srt-primary-600, #2563EB)" />
                                                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>CSV 파일 선택 또는 드래그</span>
                                                <span style={{ fontSize: '11px', color: '#94A3B8' }}>지원 포맷: .csv, .txt</span>
                                                <input type="file" accept=".csv,.txt" onChange={handleCsvFileUpload} style={{ display: 'none' }} />
                                            </label>

                                            <div style={{
                                                background: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '8px',
                                                padding: '12px 14px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '10px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Info size={14} color="#3B82F6" />
                                                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>CSV 작성 형식</span>
                                                </div>

                                                <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.5 }}>
                                                    첫 행에 반드시 <code style={{ background: '#E2E8F0', padding: '1px 5px', borderRadius: '4px', color: '#0F172A', fontWeight: 600 }}>pid</code>와 <code style={{ background: '#E2E8F0', padding: '1px 5px', borderRadius: '4px', color: '#0F172A', fontWeight: 600 }}>weight</code> 헤더가 포함되어야 합니다.
                                                </div>

                                                {/* 스프레드시트 느낌의 미니 표 프리뷰 */}
                                                <div style={{
                                                    background: '#FFFFFF',
                                                    border: '1px solid #CBD5E1',
                                                    borderRadius: '6px',
                                                    overflow: 'hidden',
                                                    fontSize: '11px',
                                                    fontFamily: 'monospace'
                                                }}>
                                                    {/* 표 헤더 행 */}
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '1fr 1fr',
                                                        background: '#F1F5F9',
                                                        padding: '6px 12px',
                                                        fontWeight: 700,
                                                        color: '#334155',
                                                        borderBottom: '1px solid #E2E8F0'
                                                    }}>
                                                        <span>pid</span>
                                                        <span>weight</span>
                                                    </div>
                                                    {/* 표 데이터 행 1 */}
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '1fr 1fr',
                                                        padding: '5px 12px',
                                                        color: '#64748B',
                                                        borderBottom: '1px solid #F1F5F9'
                                                    }}>
                                                        <span>10001</span>
                                                        <span>1.25</span>
                                                    </div>
                                                    {/* 표 데이터 행 2 */}
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '1fr 1fr',
                                                        padding: '5px 12px',
                                                        color: '#64748B'
                                                    }}>
                                                        <span>10002</span>
                                                        <span>0.80</span>
                                                    </div>
                                                </div>

                                                {/* 템플릿 연계 팁 */}
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: '#64748B',
                                                    lineHeight: 1.4
                                                }}>
                                                    ※ 상단 툴바의 <strong>[템플릿 받기]</strong>로 현재 PID가 채워진 CSV를 바로 다운받으실 수 있습니다.
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. 붙여넣기 탭 (flex: 1로 세로 넉넉하게 확장) */}
                                    {weightRightTab === 'paste' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0 }}>
                                            <style>{`
                                                .dp-weight-paste-textarea::placeholder {
                                                    color: #94A3B8 !important;
                                                    opacity: 0.65 !important;
                                                    font-weight: 400 !important;
                                                }
                                            `}</style>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>엑셀 데이터 붙여넣기</div>
                                                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px', lineHeight: 1.45 }}>
                                                    엑셀에서 <code>[PID, 가중치]</code> 두 열 또는 <code>[가중치]</code> 한 열을 복사하여 아래에 붙여넣으세요.
                                                </div>
                                            </div>

                                            <textarea
                                                className="dp-weight-paste-textarea"
                                                value={pasteAreaText}
                                                onChange={(e) => setPasteAreaText(e.target.value)}
                                                placeholder={`[입력 예시]\n10001\t1.5\n10002\t2.0\n10003\t0.8`}
                                                style={{
                                                    flex: 1,
                                                    minHeight: '240px',
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid #CBD5E1',
                                                    borderRadius: '6px',
                                                    fontSize: '11.5px',
                                                    fontFamily: 'monospace',
                                                    color: '#1E293B',
                                                    outline: 'none',
                                                    resize: 'none',
                                                    boxSizing: 'border-box',
                                                    background: '#FAFAFA'
                                                }}
                                            />

                                            <button
                                                onClick={handleApplyPasteWeight}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    borderRadius: '7px',
                                                    border: 'none',
                                                    background: 'var(--srt-primary-600, #3B82F6)',
                                                    color: '#FFFFFF',
                                                    fontSize: '12.5px',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 4px rgba(59,130,246,0.2)',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.92'}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                            >
                                                <Clipboard size={14} /> 붙여넣은 값 가중치에 적용
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px', gap: '8px' }}>
                            <Info size={24} />
                            선택된 가중치 설정이 없습니다. 왼쪽 목록에서 선택하거나 새로 추가해 주세요.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="dp-request-container" style={{ background: '#f8fafc', gap: 0, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', padding: '0 24px', background: '#FFFFFF', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {tabs.map((tab, idx) => {
                        const isActive = activeTab === idx;
                        return (
                            <div
                                key={idx}
                                onClick={() => setActiveTab(idx)}
                                style={{
                                    padding: '16px 20px',
                                    cursor: 'pointer',
                                    fontWeight: isActive ? 600 : 500,
                                    fontSize: '15px',
                                    color: isActive ? 'var(--srt-primary-500)' : '#64748B',
                                    borderBottom: isActive ? '3px solid var(--srt-primary-500)' : '3px solid transparent',
                                    marginBottom: '-1px', // Overlay parent border
                                    transition: 'all 0.2s ease',
                                    userSelect: 'none'
                                }}
                            >
                                {tab.label}
                                {tab.badge > 0 && (
                                    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: 'var(--srt-primary-500)', color: '#fff' }}>{tab.badge}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={(activeTab === 0 || activeTab === 2) ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' } : { flex: 1, overflowY: 'auto' }}>
                {renderTabContent()}
            </div>

            {/* 가중치 비율 일괄 수정 모달 */}
            {isBulkWeightModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '16px', width: '580px',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', overflow: 'hidden',
                        border: '1px solid rgba(226, 232, 240, 0.8)'
                    }}>
                        {/* 팝업 헤더 */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '20px 28px', borderBottom: '1px solid #e2e8f0', background: '#ffffff'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ width: '4px', height: '18px', background: 'var(--srt-primary-500)', borderRadius: '2px', marginTop: '3px' }}></div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>가중치 비율 일괄 수정</h3>
                                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>복사한 데이터를 아래에 붙여넣어 일괄 적용할 수 있습니다.</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: 500 }}>※ 그리드에 존재하지 않는 PID는 매핑에서 제외되며, 입력하지 않은 기존 값은 안전하게 유지됩니다.</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBulkWeightModalOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94a3b8', transition: 'color 0.15s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#475569'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* 모달 콘텐츠 */}
                        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#ffffff' }}>
                            {/* Wrapper Div mimicking textarea border */}
                            <div style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                border: isTextareaFocused ? '1px solid var(--srt-primary-500)' : '1px solid #cbd5e1',
                                boxShadow: isTextareaFocused ? '0 0 0 3px color-mix(in srgb, var(--srt-primary-500) 10%, transparent)' : 'none',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                transition: 'border-color 0.15s, box-shadow 0.15s'
                            }}>
                                {/* Static Header Row */}
                                <div style={{
                                    display: 'flex',
                                    padding: '12px 16px 8px 16px',
                                    borderBottom: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    userSelect: 'none',
                                    fontFamily: 'Consolas, Monaco, monospace'
                                }}>
                                    <div style={{ width: '8ch', fontSize: '13px', fontWeight: '700', color: '#64748b' }}>pid</div>
                                    <div style={{ flex: 1, fontSize: '13px', fontWeight: '700', color: '#64748b', paddingLeft: '8px' }}>가중치 비율</div>
                                </div>

                                {/* Editable Textarea */}
                                <textarea
                                    value={bulkWeightValuesText}
                                    onChange={(e) => setBulkWeightValuesText(e.target.value)}
                                    style={{
                                        width: '100%', height: '340px', padding: '12px 16px', border: 'none',
                                        outline: 'none', resize: 'none', lineHeight: 1.6, color: '#1e293b',
                                        fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px', background: 'transparent',
                                        tabSize: 8, MozTabSize: 8
                                    }}
                                    onFocus={() => setIsTextareaFocused(true)}
                                    onBlur={() => setIsTextareaFocused(false)}
                                    placeholder="이곳에 데이터를 붙여넣거나 입력하세요."
                                />
                            </div>
                        </div>

                        {/* 팝업 푸터 */}
                        <div style={{
                            display: 'flex', justifyContent: 'flex-end', gap: '8px',
                            padding: '14px 28px', borderTop: '1px solid #e2e8f0', background: '#f8fafc'
                        }}>
                            <button
                                onClick={() => setIsBulkWeightModalOpen(false)}
                                style={{
                                    height: '38px', padding: '0 20px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1',
                                    background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleApplyBulkWeightValuesText}
                                style={{
                                    height: '38px', padding: '0 24px', fontSize: '13px', borderRadius: '6px', border: 'none',
                                    background: 'var(--srt-primary-500)', color: '#ffffff', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--srt-primary-600)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--srt-primary-500)'; }}
                            >
                                일괄 적용
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

DpRequestSettingStep.displayName = 'DpRequestSettingStep';

export default DpRequestSettingStep;

