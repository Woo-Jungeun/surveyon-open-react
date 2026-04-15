import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Check } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';

// --- 상수 및 유틸리티 ---
const STAT_OPTIONS = [
    { id: 'mean', label: '평균 (mean)' },
    { id: 'std', label: '표준편차 (std)' },
    { id: 'mode', label: '최빈값 (mode)' },
    { id: 'median', label: '중앙값 (median)' },
];

const getQuestionTypeInfo = (type) => {
    const rawType = type?.toLowerCase() || '';
    let color = 'dummy';
    let displayType = type;

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

    return { color, displayType };
};

const canUseScalePreset = (type) => {
    const t = String(type || '').toLowerCase();
    return t === 'scale' || t === 'single';
};

const canUseRankPreset = (type) => {
    const t = String(type || '').toLowerCase();
    return t === 'rank' || t === 'minrank' || t === 'maxrank' || t === 'multi';
};

const canUseStatPreset = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'dummy' || t === 'multi' || t.includes('문자') || t === 'open-text' || t === 'open') return false;
    return true;
};

const canUseGroupPreset = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'double' || t.includes('문자') || t.includes('숫자') || t === 'open' || t === 'open-text' || t === 'open-num') return false;
    return true;
};

// 막혀있는 셀을 위한 스타일
const DISABLED_CELL_STYLE = {
    textAlign: 'center',
    verticalAlign: 'middle',
    backgroundColor: '#eaedf1',
    color: '#94a3b8',
    userSelect: 'none'
};

// --- 통계 설정 다중선택 드롭다운 (FrequencyAnalysisPage의 custom-filter-wrapper 방식 적용) ---
// wrapper ref가 trigger + menu를 모두 감싸므로, 메뉴 항목 클릭 시 "외부 클릭"으로 오인하지 않음
const StatSettingCell = React.memo(({ dataItem, selectedValues, isOpen, onOpenChange, onToggle }) => {
    const selected = Array.isArray(selectedValues)
        ? selectedValues
        : (selectedValues ? String(selectedValues).split(',').map(s => s.trim()).filter(Boolean) : []);

    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                onOpenChange(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onOpenChange]);

    const toggleOption = (id) => {
        const next = selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id];
        onToggle(dataItem, 'stat_summary', next.join(','));
    };

    const displayText = selected.length === 0
        ? <span style={{ color: '#94a3b8' }}>선택 (미설정)</span>
        : <span style={{ color: '#1e293b' }}>{selected.join(', ')}</span>;

    return (
        // wrapperRef가 trigger + menu를 모두 감쌈 → mousedown이 항상 "내부"로 인식됨
        <div ref={wrapperRef} className="custom-filter-wrapper" style={{ position: 'relative', width: '100%' }}>
            <div
                className={`custom-filter-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => onOpenChange(isOpen ? null : dataItem.source_var_id)}
                style={{ height: '22px', padding: '0 6px', fontSize: '13px', width: '100%', borderRadius: '2px' }}
            >
                <span className="trigger-text" style={{ fontSize: '13px' }}>{displayText}</span>
                <ChevronDown size={12} className="trigger-icon" />
            </div>

            {/* 메뉴가 portal 없이 같은 wrapper안에 직접 있어서 mousedown 외부 감지가 정확함 */}
            {isOpen && (
                <div className="custom-filter-menu" style={{ minWidth: '180px', zIndex: 10001 }}>
                    {STAT_OPTIONS.map(opt => {
                        const isChecked = selected.includes(opt.id);
                        return (
                            <div
                                key={opt.id}
                                className="custom-filter-item"
                                onClick={(e) => { e.stopPropagation(); toggleOption(opt.id); }}
                            >
                                <div className={`checkbox-custom ${isChecked ? 'checked' : ''}`}>
                                    {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                                </div>
                                <span className="filter-text">{opt.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

// --- 공통 컴포넌트: 프리셋 드롭다운 셀 (단일 선택, custom-filter-wrapper 방식) ---
const PresetDropdownCell = React.memo(({ field, dataItem, presets, onChange, activeId, onOpenChange = () => { } }) => {
    const val = dataItem[field];
    const isOpen = activeId === `${field}-${dataItem.source_var_id}`;
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                onOpenChange(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onOpenChange]);

    const options = useMemo(() => presets.map(p => {
        const text = typeof p === 'object' ? (p.label || p.name || p.id || 'Unknown') : p;
        const id = typeof p === 'object' ? (p.id || p.value || text) : p;
        return { text: String(text), id: String(id) };
    }), [presets]);

    const selectedOption = options.find(o => o.id === String(val) || o.text === String(val));

    const handleSelect = (optionId) => {
        onChange(dataItem, field, optionId);
        onOpenChange(null); // 단일 선택 → 선택 즉시 닫기
    };

    const displayText = selectedOption
        ? <span style={{ color: '#1e293b', fontSize: '13px' }}>{selectedOption.text}</span>
        : <span style={{ color: '#94a3b8', fontSize: '13px' }}>선택 (미설정)</span>;

    return (
        <td style={{ padding: '2px 6px', verticalAlign: 'middle', overflow: 'visible', position: 'relative' }}>
            <div ref={wrapperRef} className="custom-filter-wrapper" style={{ position: 'relative', width: '100%' }}>
                <div
                    className={`custom-filter-trigger ${isOpen ? 'open' : ''}`}
                    onClick={() => onOpenChange(isOpen ? null : `${field}-${dataItem.source_var_id}`)}
                    style={{ height: '22px', padding: '0 6px', fontSize: '13px', width: '100%', borderRadius: '2px' }}
                >
                    <span className="trigger-text" style={{ fontSize: '13px' }}>{displayText}</span>
                    <ChevronDown size={12} className="trigger-icon" />
                </div>

                {isOpen && options.length > 0 && (
                    <div className="custom-filter-menu" style={{ width: '100%', zIndex: 10001 }}>
                        {options.map(opt => {
                            const isSelected = opt.id === String(val) || opt.text === String(val);
                            return (
                                <div
                                    key={opt.id}
                                    className="custom-filter-item"
                                    onClick={(e) => { e.stopPropagation(); handleSelect(opt.id); }}
                                    style={{ background: isSelected ? '#eff6ff' : 'transparent' }}
                                >
                                    <div className={`checkbox-custom ${isSelected ? 'checked' : ''}`}>
                                        {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                                    </div>
                                    <span className="filter-text" style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 400, color: isSelected ? '#2563eb' : '#1e293b', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>
                                        {opt.text}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </td>
    );
});

// --- 텍스트 편집 셀: 자체 로컬 state로 타이핑 즉각 반응, onBlur에만 stubs 업데이트 ---
const TextEditCell = React.memo(({ dataItem, field, onUpdate, align = 'left' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localVal, setLocalVal] = useState(String(dataItem[field] ?? ''));

    // 외부에서 dataItem이 바뀔 때만 동기화 (편집 중에는 무시)
    useEffect(() => {
        if (!isEditing) setLocalVal(String(dataItem[field] ?? ''));
    }, [dataItem.source_var_id, dataItem[field], isEditing]);

    const commit = () => {
        setIsEditing(false);
        if (localVal !== String(dataItem[field] ?? '')) onUpdate(dataItem, field, localVal);
    };

    if (isEditing) {
        return (
            <td style={{ padding: '1px 4px', verticalAlign: 'middle' }}>
                <input
                    autoFocus
                    value={localVal}
                    onChange={e => setLocalVal(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === 'Enter') e.target.blur();
                        if (e.key === 'Escape') { setLocalVal(String(dataItem[field] ?? '')); setIsEditing(false); }
                    }}
                    style={{ width: '100%', border: '1px solid #3b82f6', borderRadius: '2px', padding: '0 5px', fontSize: '13px', height: '22px', outline: 'none', boxSizing: 'border-box' }}
                />
            </td>
        );
    }

    return (
        <td
            onClick={() => setIsEditing(true)}
            style={{
                padding: '0 8px', fontSize: '13px', verticalAlign: 'middle', cursor: 'text', textAlign: align,
                color: localVal ? '#1e293b' : '#94a3b8', userSelect: 'none'
            }}
        >
            {localVal || '-'}
        </td>
    );
});

// --- 메인 컴포넌트 ---
const DpRequestTableStep = forwardRef(({ onUnsavedChange }, ref) => {
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const { getRecodedOverview } = DpRequestPageApi();

    const [searchTerm, setSearchTerm] = useState('');
    const [stubs, setStubs] = useState([]);
    const [scalePresets, setScalePresets] = useState([]);
    const [rankPresets, setRankPresets] = useState([]);
    const [activeStatRowId, setActiveStatRowId] = useState(null);
    const [activePresetId, setActivePresetId] = useState(null);

    const history = useUpdateHistory('dp-table');

    useImperativeHandle(ref, () => ({
        save: async () => await handleSave(),
        reset: () => fetchOverview()
    }));

    const fetchOverview = useCallback(async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId) return;
        try {
            loadingSpinner.show();
            const payload = { user: "sbbok", pageid: "446bd14c-d053-47c8-bf01-59384cb37746" };
            const response = await getRecodedOverview.mutateAsync(payload);
            const resultData = response?.data?.resultjson || response?.resultjson || response || {};

            const updatePresets = (data, setter) => {
                setter(Array.isArray(data) ? data : (typeof data === 'object' ? Object.values(data) : []));
            };
            updatePresets(resultData.scale_presets, setScalePresets);
            updatePresets(resultData.rank_presets, setRankPresets);

            const baseVars = resultData.base_variables || {};
            const savedItems = resultData.dp_request_recoded_items || [];
            const savedMap = new Map(savedItems.map(item => [String(item.source_var_id), item]));

            const merged = Object.entries(baseVars).map(([id, base]) => {
                const saved = savedMap.get(id);
                return {
                    ...base, ...saved,
                    source_var_id: id,
                    recoded_var_id: saved?.recoded_var_id || id,
                    var_label: base.label || id,
                    var_type: base.type || 'unknown',
                    condition: saved?.filter_expression || '',
                    x_info: saved?.x_info || [],
                    stat_summary: saved?.stat_preset_id || '',
                    scale_preset_name: saved?.scale_preset_id || '',
                    rank_preset_name: saved?.rank_preset_id || '',
                    group_preset_name: saved?.group_preset_id || '',
                };
            });

            setStubs(merged);
            history.reset(merged);
            if (onUnsavedChange) onUnsavedChange(false);
        } catch (err) {
            console.error(err);
            modal.showAlert('오류', '데이터 호출 실패');
        } finally {
            loadingSpinner.hide();
        }
    }, [getRecodedOverview, history, loadingSpinner, modal, onUnsavedChange]);

    useEffect(() => { fetchOverview(); }, []);

    const filteredStubs = useMemo(() => {
        if (!searchTerm) return stubs;
        const q = searchTerm.toLowerCase();
        return stubs.filter(s => s.recoded_var_id?.toLowerCase().includes(q) || s.var_label?.toLowerCase().includes(q));
    }, [stubs, searchTerm]);

    // onDataChange는 행추가/삭제 시에만 호출됨 (텍스트 편집은 TextEditCell의 onBlur에서 처리)
    const handleDataChange = useCallback((newData) => {
        setStubs(newData);
        if (onUnsavedChange) onUnsavedChange(true);
    }, [onUnsavedChange]);

    const handleCellUpdate = useCallback((item, field, value) => {
        setStubs(prev => prev.map(s => s.source_var_id === item.source_var_id ? { ...s, [field]: value } : s));
        if (onUnsavedChange) onUnsavedChange(true);
    }, [onUnsavedChange]);
    // 행 추가 시 고유 ID 생성 (counter 방식으로 중복 방지)
    const newRowIdRef = useRef(0);
    const newRowTemplate = useMemo(() => ({
        get source_var_id() { return `new_${Date.now()}_${newRowIdRef.current++}`; },
        recoded_var_id: '',
        var_label: '',
        var_type: '',
        condition: '',
        x_info: [],
        stat_summary: '',
        scale_preset_name: '',
        rank_preset_name: '',
        group_preset_name: '',
    }), []);


    const handleSave = async () => {
        loadingSpinner.show();
        try {
            modal.showAlert('알림', '성공적으로 저장되었습니다.');
            if (onUnsavedChange) onUnsavedChange(false);
            return true;
        } catch (err) {
            modal.showAlert('오류', '저장 실패');
            return false;
        } finally {
            loadingSpinner.hide();
        }
    };

    // --- Grid Renderers ---
    const TypeCell = useMemo(() => (props) => {
        const val = props.dataItem.var_type || '';
        const { color, displayType } = getQuestionTypeInfo(val);
        return (
            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                <span className={`question-type-badge ${color}`}>{displayType}</span>
            </td>
        );
    }, []);

    const StatCellRenderer = useCallback((props) => {
        if (!canUseStatPreset(props.dataItem.var_type)) {
            return <td style={DISABLED_CELL_STYLE}>-</td>;
        }
        const isOpen = activeStatRowId === props.dataItem.source_var_id;
        return (
            // overflow: visible 필수 - custom-filter-menu가 셀 밖으로 나와야 함
            <td style={{ padding: '2px 6px', verticalAlign: 'middle', overflow: 'visible', position: 'relative' }}>
                <StatSettingCell
                    dataItem={props.dataItem}
                    selectedValues={props.dataItem.stat_summary}
                    isOpen={isOpen}
                    onOpenChange={setActiveStatRowId}
                    onToggle={handleCellUpdate}
                />
            </td>
        );
    }, [handleCellUpdate, activeStatRowId]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '13px', flexShrink: 0 }}>
                    전체 <span style={{ color: '#2563eb', fontWeight: 600 }}>{filteredStubs.length}</span>건
                </div>
                <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                        <KendoGridV2
                            data={filteredStubs}
                            rowHeight={28}
                            onDataChange={handleDataChange}
                            style={{ height: '100%', width: '100%' }}
                            scrollable="virtual"
                            addable
                            deletable
                            newRowTemplate={newRowTemplate}
                        >
                            <Column field="recoded_var_id" title="ID" width="100px" headerClassName="k-text-center"
                                cell={(p) => <TextEditCell dataItem={p.dataItem} field="recoded_var_id" onUpdate={handleCellUpdate} />}
                            />
                            <Column field="var_label" title="라벨" width="300px" headerClassName="k-text-center"
                                cell={(p) => <TextEditCell dataItem={p.dataItem} field="var_label" onUpdate={handleCellUpdate} />}
                            />
                            <Column field="var_type" title="유형" width="100px" cell={TypeCell} headerClassName="k-text-center" />
                            <Column field="condition" title="조건" width="150px" headerClassName="k-text-center"
                                cell={(p) => <TextEditCell dataItem={p.dataItem} field="condition" onUpdate={handleCellUpdate} />}
                            />
                            <Column field="x_info" title="배너(x_info)" width="150px" headerClassName="k-text-center"
                                cell={(p) => <td style={{ padding: '0 8px' }}>{Array.isArray(p.dataItem.x_info) ? p.dataItem.x_info.join(', ') : p.dataItem.x_info}</td>}
                            />
                            <Column field="group_preset_name" title="그룹 프리셋" width="120px" headerClassName="k-text-center"
                                cell={(p) => {
                                    if (!canUseGroupPreset(p.dataItem.var_type)) {
                                        return <td style={DISABLED_CELL_STYLE}>-</td>;
                                    }
                                    return <td style={{ padding: '0 8px', verticalAlign: 'middle' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}><span>{p.dataItem.group_preset_name}</span><ChevronDown size={14} style={{ color: '#94a3b8' }} /></div></td>;
                                }}
                            />
                            <Column field="stat_summary" title="통계 설정" width="180px" cell={StatCellRenderer} headerClassName="k-text-center" />
                            <Column field="scale_preset_name" title="척도 프리셋" width="150px" headerClassName="k-text-center"
                                cell={(p) => {
                                    if (!canUseScalePreset(p.dataItem.var_type)) {
                                        return <td style={DISABLED_CELL_STYLE}>-</td>;
                                    }
                                    return <PresetDropdownCell field="scale_preset_name" dataItem={p.dataItem} presets={scalePresets} onChange={handleCellUpdate} activeId={activePresetId} onOpenChange={setActivePresetId} />;
                                }}
                            />
                            <Column field="rank_preset_name" title="순위 프리셋" width="150px" headerClassName="k-text-center"
                                cell={(p) => {
                                    if (!canUseRankPreset(p.dataItem.var_type)) {
                                        return <td style={DISABLED_CELL_STYLE}>-</td>;
                                    }
                                    return <PresetDropdownCell field="rank_preset_name" dataItem={p.dataItem} presets={rankPresets} onChange={handleCellUpdate} activeId={activePresetId} onOpenChange={setActivePresetId} />;
                                }}
                            />
                        </KendoGridV2>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default DpRequestTableStep;
