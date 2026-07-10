import { useState, useEffect, useContext, createContext, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AlertCircle, Info, Trash2, ChevronLeft, ChevronRight, Search, Plus, X } from 'lucide-react';

import { Input } from '@progress/kendo-react-inputs';
import { DropDownList } from '@progress/kendo-react-dropdowns';

import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { DpRequestPageApi } from '../DpRequestPageApi';
import AnalysisSettingTab from './AnalysisSettingTab';
import TableSettingTab from './TableSettingTab';
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
                ...(isChanged ? { backgroundColor: '#eff6ff', color: '#2563eb' } : {})
            }}>
                {value}
            </td>
        );
    }

    const handlePaste = (e) => {
        if (currentWeightInfo && updateWeightInfo) {
            e.preventDefault();
            const clipboardData = e.clipboardData.getData('Text');
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
            ...(isChanged ? { backgroundColor: '#eff6ff' } : {})
        }} className={`k-grid-edit-cell ${isChanged ? 'changed-cell' : ''}`}>
            <Input
                type="number"
                value={value}
                onChange={(e) => onChange({ dataItem, field, syntheticEvent: e.syntheticEvent, value: e.value })}
                onPaste={handlePaste}
                className="no-spin"
                style={{
                    width: '100%', height: '100%', border: 'none', outline: 'none',
                    color: isChanged ? '#2563eb' : 'inherit',
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
    const { getTableRenderContext, getTableDetail, saveTableSettings, getBaseVariableList, getRecodedOverview, reapplyPreset, getRecodedPlain, getWeightPidList, getNextWeightId, deleteWeight, saveWeightSetPid } = DpRequestPageApi();
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

    const [activeTab, setActiveTab] = useState(0); // 0: 분석, 1: 뷰 설정

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
            hide_zero_stubs: true
        }
    });

    const [weightOptions, setWeightOptions] = useState(['없음']);
    const [scaleData, setScaleData] = useState([]);
    const [rankData, setRankData] = useState([]);
    const [groupData, setGroupData] = useState([]);
    const [contextData, setContextData] = useState(null);

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

            if (actualTableDetail?.id || renderContext?.id) {
                const ui = actualTableDetail?.ui_settings || {};

                const initDisplay = {
                    ...settings.display,
                };
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

                // base_prefix / base_postfix 값에 따라 show_base_parenthesis 값 판별
                const policy = actualTableDetail?.display_policy || renderContext?.effective_display_policy;
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
                            groups = item.groups.map(g => ({
                                label: g.label || '',
                                values: Array.isArray(g.values) ? g.values.join(',') : ''
                            }));
                        }
                        return {
                            id: item.id,
                            name: item.name || '',
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
            if (Array.isArray(actualVarList)) {
                const weightOpt = ['없음', ...actualVarList.map(v => v.name || v.label)];
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
                    const aGroups = a.groups || [];
                    const bGroups = b.groups || [];
                    if (aGroups.length !== bGroups.length) return false;
                    for (let i = 0; i < aGroups.length; i++) {
                        if (aGroups[i].label !== bGroups[i].label) return false;
                        if (String(aGroups[i].values) !== String(bGroups[i].values)) return false;
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

            const groupDataPayload = groupData.map(item => {
                return {
                    id: item.id || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)} `,
                    name: item.name,
                    groups: (item.groups || []).map(g => ({
                        label: g.label || '',
                        values: parseValues(g.values)
                    }))
                };
            });

            const payload = {
                user: auth.user.userId,
                pageid: pageId,
                weight_variable: settings.weight_variable !== '없음' ? settings.weight_variable : null,
                confidence_level: settings.confidence_level,
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
                    stub_group_layout: settings.render.stub_group_layout,
                    format_percent_as_column: settings.render.format_percent_as_column,
                    format_show_n: settings.display.show_n,
                    format_show_percent: settings.display.show_percent,
                    format_n_round: settings.display.n_digits !== "" && settings.display.n_digits !== null && settings.display.n_digits !== undefined ? Number(settings.display.n_digits) : undefined,
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
                },
                display_policy: {
                    show_n: settings.display.show_n,
                    show_percent: settings.display.show_percent,
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
                },
                scale_presets: scaleDataPayload,
                rank_presets: rankDataPayload,
                group_presets: groupDataPayload,
                stat_presets: []
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
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 0: return renderAnalysisTab();
            case 1: return renderTableSettingsTab();
            case 2: return renderWeightSettingsTab();
            default: return null;
        }
    };
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
            background: '#F1F5F9',
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
                    background-color: #e0f2fe !important;
                }
            `}</style>
            {/* 기본 Weight 변수 카드 */}
            <div className="dp-setting-card" style={{ flexShrink: 0, marginBottom: '0px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155', fontSize: '13px' }}>
                        기본 가중치 변수
                    </div>
                    <DropDownList
                        style={{ width: '220px', fontSize: '13px' }}
                        data={weightDropdownData}
                        textField="text"
                        dataItemKey="value"
                        value={weightDropdownData.find(item => item.value === (settings.weight_variable || '없음')) || weightDropdownData[0]}
                        onChange={(e) => {
                            setSettings({ ...settings, weight_variable: e.value.value });
                            if (onUnsavedChange) onUnsavedChange(true);
                        }}
                    />
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
                                    <button onClick={handleAddNewWeight} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '24px', padding: '0 8px', borderRadius: '4px', border: '1px solid #2563eb', color: '#2563eb', background: '#eff6ff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
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
                                            background: selectedWeightId === w.id ? '#EFF6FF' : 'transparent',
                                            color: selectedWeightId === w.id ? '#1D4ED8' : '#1E293B',
                                            border: selectedWeightId === w.id ? '1.5px solid #2563eb' : '1px solid transparent',
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

                {/* 콘텐츠 영역 */}
                <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {selectedWeightId ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div className="dp-content-header" style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px' }}>
                                <div className="dp-content-label-edit" style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>가중치 라벨</span>
                                        <input
                                            type="text"
                                            value={currentWeightLabel}
                                            onChange={(e) => handleUpdateWeightField('label', e.target.value)}
                                            className="dp-input"
                                            style={{ width: '280px', height: '32px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, userSelect: 'none' }}>
                                        💡 입력창 중 하나를 선택해 엑셀 열을 붙여넣기(Ctrl+V)하면 아래로 자동 채워집니다.
                                    </span>
                                </div>
                                <button
                                    onClick={handleOpenBulkWeightModal}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        height: '28px',
                                        padding: '0 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        color: '#475569',
                                        background: '#FFFFFF',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        boxSizing: 'border-box'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                >
                                    가중치 비율 일괄 편집
                                </button>
                            </div>
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
                                    color: isActive ? '#3B82F6' : '#64748B',
                                    borderBottom: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                                    marginBottom: '-1px', // Overlay parent border
                                    transition: 'all 0.2s ease',
                                    userSelect: 'none'
                                }}
                            >
                                {tab.label}
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
                                <div style={{ width: '4px', height: '18px', background: '#3b82f6', borderRadius: '2px', marginTop: '3px' }}></div>
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
                                border: isTextareaFocused ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                                boxShadow: isTextareaFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
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
                                    fontFamily: 'monospace'
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
                                        fontFamily: 'inherit', fontSize: '13px', background: 'transparent',
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
                                    background: '#3b82f6', color: '#ffffff', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#3b82f6'; }}
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

