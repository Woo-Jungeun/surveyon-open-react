import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Check } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Popup } from '@progress/kendo-react-popup';
import { DropDownList, MultiSelect } from '@progress/kendo-react-dropdowns';
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

const VAR_TYPE_OPTIONS = ['single', 'multi', 'rank', 'minrank', 'maxrank', 'scale', 'dummy', 'custom', 'open(문자)', 'open(숫자)'];

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

// --- 통계 설정 다중선택 드롭다운 (Kendo MultiSelect) ---
const StatSettingCell = React.memo(({ dataItem, selectedValues, onUpdate }) => {
    const selected = Array.isArray(selectedValues)
        ? selectedValues
        : (selectedValues ? String(selectedValues).split(',').map(s => s.trim()).filter(Boolean) : []);

    const valueItems = STAT_OPTIONS.filter(opt => selected.includes(opt.id));

    return (
        <td style={{ padding: '2px 4px', verticalAlign: 'middle' }}>
            <MultiSelect
                className="dp-mini-dropdown k-dropdown-solid"
                data={STAT_OPTIONS}
                textField="label"
                dataItemKey="id"
                value={valueItems}
                onChange={(e) => {
                    const nextIds = e.value.map(val => val.id).join(',');
                    onUpdate(dataItem, 'stat_summary', nextIds);
                }}
                style={{ width: '100%', minHeight: '22px', fontSize: '13px' }}
                placeholder="선택 (미설정)"
                autoClose={false}
            />
        </td>
    );
});

// --- 공통 컴포넌트: 프리셋 드롭다운 셀 (단일 선택 Kendo DropDownList) ---
const PresetDropdownCell = React.memo(({ field, dataItem, presets, onChange }) => {
    const val = dataItem[field];

    const options = useMemo(() => {
        if (!presets) return [];
        return presets.map(p => {
            const text = typeof p === 'object' ? (p.label || p.name || p.id || 'Unknown') : p;
            const id = typeof p === 'object' ? (p.id || p.value || text) : p;
            return { text: String(text), id: String(id) };
        });
    }, [presets]);

    const valueItem = options.find(o => o.id === String(val) || o.text === String(val)) || null;

    return (
        <td style={{ padding: '2px 4px', verticalAlign: 'middle' }}>
            <DropDownList
                className="k-dropdown-solid dp-mini-dropdown"
                data={options}
                textField="text"
                dataItemKey="id"
                value={valueItem}
                onChange={(e) => {
                    const selectedId = e.value ? e.value.id : '';
                    onChange(dataItem, field, selectedId);
                }}
                defaultItem={{ text: "선택 (미설정)", id: "" }}
                style={{ width: '100%', height: '22px', fontSize: '13px' }}
            />
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

// --- 유형 선택 드롭다운 셀 (Kendo DropDownList 연동) ---
const TypeEditCell = React.memo(({ dataItem, onUpdate }) => {
    const val = dataItem.var_type || '';
    const isNew = String(dataItem.source_var_id).startsWith('new_');

    const handleChange = (e) => {
        onUpdate(dataItem, 'var_type', e.value);
    };

    if (isNew) {
        return (
            <td style={{ padding: '2px 4px', verticalAlign: 'middle' }}>
                <DropDownList
                    className="k-dropdown-solid dp-mini-dropdown"
                    data={VAR_TYPE_OPTIONS}
                    value={val}
                    onChange={handleChange}
                    style={{ width: '100%', height: '22px', fontSize: '13px' }}
                />
            </td>
        );
    }

    const { color, displayType } = getQuestionTypeInfo(val);
    return (
        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
            <span className={`question-type-badge ${color}`}>{displayType}</span>
        </td>
    );
});

// --- 메인 컴포넌트 ---
const DpRequestTableStep = forwardRef(({ onUnsavedChange }, ref) => {
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const { getRecodedOverview, saveRecodedOverview, getBannerDetail } = DpRequestPageApi();

    const [searchTerm, setSearchTerm] = useState('');
    const [stubs, setStubs] = useState([]);
    const [banners, setBanners] = useState([]);
    const [originalRecodedIds, setOriginalRecodedIds] = useState([]);
    const [scalePresets, setScalePresets] = useState([]);
    const [rankPresets, setRankPresets] = useState([]);
    const [groupPresets, setGroupPresets] = useState([]);

    const history = useUpdateHistory('dp-table');
    const isHistoryAction = useRef(false);

    // 키보드 이벤트 (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) { // Redo (Ctrl+Shift+Z)
                        const redoData = history.redo();
                        if (redoData) {
                            isHistoryAction.current = true;
                            setStubs([...redoData]);
                        }
                    } else { // Undo (Ctrl+Z)
                        const undoData = history.undo();
                        if (undoData) {
                            isHistoryAction.current = true;
                            setStubs([...undoData]);
                        }
                    }
                } else if (e.key.toLowerCase() === 'y') { // Redo (Ctrl+Y)
                    const redoData = history.redo();
                    if (redoData) {
                        isHistoryAction.current = true;
                        setStubs([...redoData]);
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
        if (stubs.length > 0) {
            history.commit(stubs);
        }
    }, [stubs, history]);

    useImperativeHandle(ref, () => ({
        save: async () => await handleSave(),
        reset: () => fetchOverview()
    }));

    const fetchOverview = useCallback(async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId) return;
        try {
            loadingSpinner.show();
            const payload = { user: auth?.user?.userId || '', pageid: pageId };
            const response = await getRecodedOverview.mutateAsync(payload);
            const resultData = response?.data?.resultjson || response?.resultjson || response || {};

            const updatePresets = (data, setter) => {
                setter(Array.isArray(data) ? data : (typeof data === 'object' ? Object.values(data) : []));
            };
            updatePresets(resultData.scale_presets, setScalePresets);
            updatePresets(resultData.rank_presets, setRankPresets);
            updatePresets(resultData.group_presets, setGroupPresets);

            try {
                const bannerRes = await getBannerDetail.mutateAsync(payload);
                if (bannerRes?.resultjson?.recoded_variables || bannerRes?.data?.resultjson?.recoded_variables) {
                    const raw = bannerRes?.resultjson?.recoded_variables || bannerRes?.data?.resultjson?.recoded_variables;
                    const recodes = Array.isArray(raw) ? raw : Object.values(raw);
                    const formattedBanners = recodes.map((v, i) => {
                        const labelString = v.name || v.label || v.id || `banner_0${i + 1}`;
                        return { id: labelString, label: labelString };
                    });
                    setBanners(formattedBanners);
                }
            } catch (e) { console.error('Failed to fetch banners', e); }

            const baseVars = resultData.base_variables || {};
            const savedItems = resultData.dp_request_recoded_items || [];
            const savedMap = new Map(savedItems.map(item => [String(item.source_var_id), item]));

            // 삭제 처리용 원본 ID 보관
            setOriginalRecodedIds(savedItems.map(item => item.recoded_var_id).filter(Boolean));

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
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) {
            modal.showAlert('알림', '사용자 정보나 페이지 정보를 확인할 수 없습니다.');
            return false;
        }

        // 2. Variables 객체 구성
        const variables = {};
        stubs.forEach(stub => {
            variables[stub.source_var_id] = {
                source_var_id: stub.source_var_id,
                recoded_var_id: stub.recoded_var_id,
                var_label: stub.var_label,
                var_type: stub.var_type,
                filter_expression: stub.condition || '',
                x_info: Array.isArray(stub.x_info) ? stub.x_info : (stub.x_info ? [stub.x_info] : []),
                stat_preset_id: stub.stat_summary || '',
                scale_preset_id: stub.scale_preset_name || '',
                rank_preset_id: stub.rank_preset_name || '',
                group_preset_id: stub.group_preset_name || ''
            };
        });

        // 3. 삭제될 ID 추출 (원본에 있었지만 현재는 없는 recoded_var_id)
        const currentRecodedIds = stubs.map(s => s.recoded_var_id).filter(Boolean);
        const deletedIds = originalRecodedIds.filter(id => !currentRecodedIds.includes(id));

        const requestData = {
            pageid: pageId,
            user: auth?.user?.userId || '',
            variables: variables,
            delete_ids: deletedIds
        };

        loadingSpinner.show();
        try {
            const result = await saveRecodedOverview.mutateAsync(requestData);
            if (result?.success === "777") {
                modal.showAlert('알림', '스터브가 저장되었습니다.');
                if (onUnsavedChange) onUnsavedChange(false);
                await fetchOverview(); // 저장 후 목록 최신화
                return true;
            } else {
                modal.showAlert('오류', '저장 처리에 실패했습니다.');
                return false;
            }
        } catch (err) {
            console.error(err);
            modal.showAlert('오류', '저장 중 서류 오류가 발생했습니다.');
            return false;
        } finally {
            loadingSpinner.hide();
        }
    };





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
                            scrollable="scrollable"
                            addable
                            deletable
                            newRowTemplate={newRowTemplate}
                        >
                            <Column field="recoded_var_id" title="ID" width="100px" headerClassName="k-text-center"
                                cell={(p) => (
                                    <td style={{ padding: '0 8px', fontSize: '13px', verticalAlign: 'middle', userSelect: 'none' }}>
                                        {p.dataItem.recoded_var_id || <span style={{ fontSize: '11px', opacity: 0.7 }}>(자동 생성)</span>}
                                    </td>
                                )}
                            />
                            <Column field="var_label" title="라벨" width="300px" headerClassName="k-text-center"
                                cell={(p) => <TextEditCell dataItem={p.dataItem} field="var_label" onUpdate={handleCellUpdate} />}
                            />
                            <Column field="var_type" title="유형" width="150px" headerClassName="k-text-center"
                                cell={(p) => <TypeEditCell dataItem={p.dataItem} onUpdate={handleCellUpdate} />}
                            />
                            <Column field="condition" title="조건" width="150px" headerClassName="k-text-center"
                                cell={(p) => <TextEditCell dataItem={p.dataItem} field="condition" onUpdate={handleCellUpdate} />}
                            />
                            <Column field="x_info" title="배너(x_info)" width="150px" headerClassName="k-text-center"
                                cell={(p) => <PresetDropdownCell field="x_info" dataItem={p.dataItem} presets={banners} onChange={handleCellUpdate} />}
                            />
                            <Column field="group_preset_name" title="그룹 프리셋" width="150px" headerClassName="k-text-center"
                                cell={(p) => {
                                    if (!canUseGroupPreset(p.dataItem.var_type)) {
                                        return <td style={DISABLED_CELL_STYLE}>-</td>;
                                    }
                                    return <PresetDropdownCell field="group_preset_name" dataItem={p.dataItem} presets={groupPresets} onChange={handleCellUpdate} />;
                                }}
                            />
                            <Column field="stat_summary" title="통계 설정" width="180px" headerClassName="k-text-center"
                                cell={(p) => {
                                    if (!canUseStatPreset(p.dataItem.var_type)) {
                                        return <td style={DISABLED_CELL_STYLE}>-</td>;
                                    }
                                    return (
                                        <StatSettingCell
                                            dataItem={p.dataItem}
                                            selectedValues={p.dataItem.stat_summary}
                                            onUpdate={handleCellUpdate}
                                        />
                                    );
                                }}
                            />
                            <Column field="scale_preset_name" title="척도 프리셋" width="150px" headerClassName="k-text-center"
                                cell={(p) => {
                                    if (!canUseScalePreset(p.dataItem.var_type)) {
                                        return <td style={DISABLED_CELL_STYLE}>-</td>;
                                    }
                                    return <PresetDropdownCell field="scale_preset_name" dataItem={p.dataItem} presets={scalePresets} onChange={handleCellUpdate} />;
                                }}
                            />
                            <Column field="rank_preset_name" title="순위 프리셋" width="150px" headerClassName="k-text-center"
                                cell={(p) => {
                                    if (!canUseRankPreset(p.dataItem.var_type)) {
                                        return <td style={DISABLED_CELL_STYLE}>-</td>;
                                    }
                                    return <PresetDropdownCell field="rank_preset_name" dataItem={p.dataItem} presets={rankPresets} onChange={handleCellUpdate} />;
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
