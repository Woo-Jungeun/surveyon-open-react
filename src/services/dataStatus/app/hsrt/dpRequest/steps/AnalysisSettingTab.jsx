import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Plus, Trash2, X, Info } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';

// 그룹 색상 팔레트 정의
const GROUP_COLORS = [
    { bg: '#BFDBFE', border: '#60A5FA', text: '#1E3A8A' }, // Blue
    { bg: '#D1E7DD', border: '#A3CFBB', text: '#0F5132' }, // Green (Refined Sage Green)
    { bg: '#DDD6FE', border: '#A78BFA', text: '#4C1D95' }, // Purple
    { bg: '#FDE68A', border: '#FBBF24', text: '#78350F' }, // Orange
    { bg: '#FBCFE8', border: '#F472B6', text: '#831843' }, // Pink
    { bg: '#A5F3FC', border: '#22D3EE', text: '#164E63' }, // Cyan
    { bg: '#FECACA', border: '#F87171', text: '#7F1D1D' }  // Red
];

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

const AnalysisSettingTab = ({
    contextData,
    settings,
    setSettings,
    weightOptions,
    scaleData,
    setScaleData,
    rankData,
    setRankData,
    groupData,
    setGroupData,
    onUnsavedChange
}) => {
    const [activeTab, setActiveTab] = useState('scale'); // 'scale', 'group', 'rank'

    // 아코디언 열림/닫힘 상태 관리 (ID 기준)
    const [expandedScaleId, setExpandedScaleId] = useState(null);
    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const [expandedRankId, setExpandedRankId] = useState(null);

    // --- 유틸리티 함수 ---
    const markUnsaved = () => {
        if (onUnsavedChange) onUnsavedChange(true);
    };

    // 콤마 구분자 문자열 파싱
    const parseValues = (str) => {
        if (!str) return [];
        return String(str)
            .split(',')
            .map(s => s.trim())
            .filter(s => s !== '')
            .map(s => Number(s))
            .filter(n => !isNaN(n) && n !== 0);
    };

    // --- 단일형 척도 조작 ---
    const handleAddScalePreset = () => {
        const newPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: '새 척도 설정',
            type: 'scale',
            min: 1,
            max: 5,
            recode: false,
            bands: [
                { id: `band_top_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, label: 'top', values: '' },
                { id: `band_mid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, label: 'mid', values: '' },
                { id: `band_bot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, label: 'bot', values: '' }
            ]
        };
        setScaleData([...scaleData, newPreset]);
        setExpandedScaleId(newPreset.id);
        markUnsaved();
    };

    const handleDeleteScalePreset = (id, e) => {
        e.stopPropagation();
        setScaleData(scaleData.filter(item => item.id !== id));
        if (expandedScaleId === id) setExpandedScaleId(null);
        markUnsaved();
    };

    const handleUpdateScalePreset = (id, field, value) => {
        setScaleData(scaleData.map(item => {
            if (item.id === id) {
                let updated = { ...item, [field]: value };
                if (field === 'min' || field === 'max') {
                    const numVal = parseInt(value, 10);
                    updated[field] = isNaN(numVal) ? '' : numVal;
                }
                return updated;
            }
            return item;
        }));
        markUnsaved();
    };

    const handleAddScaleBand = (presetId) => {
        setScaleData(scaleData.map(item => {
            if (item.id === presetId) {
                const bands = item.bands || [];
                const nextBands = [...bands, { id: `band_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, label: 'top', values: '' }];
                return {
                    ...item,
                    bands: nextBands
                };
            }
            return item;
        }));
        markUnsaved();
    };

    const handleDeleteScaleBandById = (presetId, bandId) => {
        setScaleData(scaleData.map(item => {
            if (item.id === presetId) {
                const bands = (item.bands || []).filter(band => band.id !== bandId);
                return { ...item, bands };
            }
            return item;
        }));
        markUnsaved();
    };

    const handleUpdateScaleBandById = (presetId, bandId, field, value) => {
        setScaleData(scaleData.map(item => {
            if (item.id === presetId) {
                let bands = (item.bands || []).map((band) => {
                    if (band.id === bandId) {
                        return { ...band, [field]: value };
                    }
                    return band;
                });
                return { ...item, bands };
            }
            return item;
        }));
        markUnsaved();
    };

    const handleToggleScaleChipById = (presetId, bandId, num) => {
        setScaleData(scaleData.map(item => {
            if (item.id === presetId) {
                const bands = (item.bands || []).map((band) => {
                    if (band.id === bandId) {
                        const vals = parseValues(band.values);
                        let nextVals;
                        if (vals.includes(num)) {
                            nextVals = vals.filter(v => v !== num);
                        } else {
                            nextVals = [...vals, num].sort((a, b) => a - b);
                        }
                        return { ...band, values: nextVals.join(',') };
                    }
                    return band;
                });
                return { ...item, bands };
            }
            return item;
        }));
        markUnsaved();
    };


    // --- 그룹 묶기 조작 ---
    const handleAddGroupPreset = () => {
        const newPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: '새 그룹 설정',
            min: 1,
            max: 7,
            groups: [
                { label: '그룹 A', values: '' }
            ]
        };
        setGroupData([...groupData, newPreset]);
        setExpandedGroupId(newPreset.id);
        markUnsaved();
    };

    const handleDeleteGroupPreset = (id, e) => {
        e.stopPropagation();
        setGroupData(groupData.filter(item => item.id !== id));
        if (expandedGroupId === id) setExpandedGroupId(null);
        markUnsaved();
    };

    const handleUpdateGroupPresetField = (id, field, value) => {
        setGroupData(groupData.map(item => {
            if (item.id === id) {
                let updated = { ...item, [field]: value };
                if (field === 'min' || field === 'max') {
                    const numVal = parseInt(value, 10);
                    updated[field] = isNaN(numVal) ? '' : numVal;
                }
                return updated;
            }
            return item;
        }));
        markUnsaved();
    };

    const handleAddGroupRow = (presetId) => {
        setGroupData(groupData.map(item => {
            if (item.id === presetId) {
                const groups = item.groups || [];
                const nextLabelIdx = groups.length + 1;
                return {
                    ...item,
                    groups: [...groups, { label: `그룹 ${String.fromCharCode(64 + nextLabelIdx)}`, values: '' }]
                };
            }
            return item;
        }));
        markUnsaved();
    };

    const handleDeleteGroupRow = (presetId, groupIdx) => {
        setGroupData(groupData.map(item => {
            if (item.id === presetId) {
                const groups = [...(item.groups || [])];
                groups.splice(groupIdx, 1);
                return { ...item, groups };
            }
            return item;
        }));
        markUnsaved();
    };

    const handleUpdateGroupRow = (presetId, groupIdx, field, value) => {
        setGroupData(groupData.map(item => {
            if (item.id === presetId) {
                const groups = (item.groups || []).map((g, idx) => {
                    if (idx === groupIdx) {
                        return { ...g, [field]: value };
                    }
                    return g;
                });
                return { ...item, groups };
            }
            return item;
        }));
        markUnsaved();
    };

    const handleToggleGroupChip = (presetId, groupIdx, num) => {
        setGroupData(groupData.map(item => {
            if (item.id === presetId) {
                const groups = (item.groups || []).map((g, idx) => {
                    if (idx === groupIdx) {
                        let vals = parseValues(g.values);
                        if (vals.includes(num)) {
                            vals = vals.filter(v => v !== num);
                        } else {
                            vals = [...vals, num].sort((a, b) => a - b);
                        }
                        return { ...g, values: vals.join(',') };
                    }
                    return g; // 중복 허용: 다른 그룹의 값은 터치하지 않음
                });
                return { ...item, groups };
            }
            return item;
        }));
        markUnsaved();
    };


    // --- 다중형 순위 조작 ---
    const handleAddRankPreset = () => {
        const newPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: '새 순위 설정',
            max: 5,
            combinations: [
                { label: '1순위', values: [1] }
            ]
        };
        setRankData([...rankData, newPreset]);
        setExpandedRankId(newPreset.id);
        markUnsaved();
    };

    const handleDeleteRankPreset = (id, e) => {
        e.stopPropagation();
        setRankData(rankData.filter(item => item.id !== id));
        if (expandedRankId === id) setExpandedRankId(null);
        markUnsaved();
    };

    const handleUpdateRankPreset = (id, field, value) => {
        setRankData(rankData.map(item => {
            if (item.id === id) {
                let val = value;
                if (field === 'max') {
                    if (value === '') {
                        val = '';
                    } else {
                        const numVal = parseInt(value, 10);
                        val = isNaN(numVal) ? 1 : Math.max(1, numVal);
                    }
                }
                return { ...item, [field]: val };
            }
            return item;
        }));
        markUnsaved();
    };

    const handleAddRankCombo = (presetId) => {
        setRankData(rankData.map(item => {
            if (item.id === presetId) {
                const combinations = item.combinations || [];
                return {
                    ...item,
                    combinations: [...combinations, { label: '', values: [] }]
                };
            }
            return item;
        }));
        markUnsaved();
    };

    const handleDeleteRankCombo = (presetId, comboIdx) => {
        setRankData(rankData.map(item => {
            if (item.id === presetId) {
                const combinations = [...(item.combinations || [])];
                combinations.splice(comboIdx, 1);
                return { ...item, combinations };
            }
            return item;
        }));
        markUnsaved();
    };

    const handleUpdateRankCombo = (presetId, comboIdx, field, value) => {
        setRankData(rankData.map(item => {
            if (item.id === presetId) {
                const combinations = (item.combinations || []).map((combo, idx) => {
                    if (idx === comboIdx) {
                        return { ...combo, [field]: value };
                    }
                    return combo;
                });
                return { ...item, combinations };
            }
            return item;
        }));
        markUnsaved();
    };

    const handleToggleRankChip = (presetId, comboIdx, num) => {
        setRankData(rankData.map(item => {
            if (item.id === presetId) {
                const combinations = (item.combinations || []).map((combo, idx) => {
                    if (idx === comboIdx) {
                        const vals = [...(combo.values || [])];
                        let nextVals;
                        if (vals.includes(num)) {
                            nextVals = vals.filter(v => v !== num);
                        } else {
                            nextVals = [...vals, num].sort((a, b) => a - b);
                        }

                        let label = combo.label || '';
                        const isAutoLabel = !combo.label ||
                            combo.label === '1순위' ||
                            /^Top\d+$/.test(combo.label) ||
                            /^\d+(\+\d+)*$/.test(combo.label);

                        if (isAutoLabel) {
                            if (nextVals.length === 1 && nextVals[0] === 1) label = '1순위';
                            else if (nextVals.length > 1 && nextVals.every((v, index) => v === index + 1)) label = `Top${nextVals.length}`;
                            else label = nextVals.join('+');
                        }

                        return { ...combo, label: label, values: nextVals };
                    }
                    return combo;
                });
                return { ...item, combinations };
            }
            return item;
        }));
        markUnsaved();
    };

    return (
        <div className="dp-setting-section" style={{
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

            {/* 설정 경고 (Issues) */}
            {contextData?.issues?.length > 0 && (
                <div style={{ backgroundColor: '#FFF5F5', border: '1px solid #FEE2E2', borderRadius: '6px', padding: '14px 16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>
                        <AlertCircle size={16} /> 설정 경고 (Issues)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#B91C1C', fontSize: '12px', lineHeight: '1.6' }}>
                        {contextData.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
                    </ul>
                </div>
            )}

            {/* 기본 Weight 변수 카드 */}
            <div className="dp-setting-card" style={{ flexShrink: 0, marginBottom: '0px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155', fontSize: '13px' }}>
                        <Info size={16} style={{ color: '#475569' }} /> 기본 Weight(가중치) 변수
                    </div>
                    <select
                        className="dp-select"
                        style={{ width: '200px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#1E293B', padding: '5px 10px', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                        value={settings.weight_variable || '없음'}
                        onChange={(e) => {
                            setSettings({ ...settings, weight_variable: e.target.value });
                            markUnsaved();
                        }}
                    >
                        {weightOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {settings.weight_variable === '없음' && (
                        <span style={{ color: '#DC2626', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <AlertCircle size={13} /> 가중치 변수가 지정되지 않았습니다.
                        </span>
                    )}
                </div>
            </div>

            {/* 메인 탭 카드 */}
            <div className="dp-setting-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

                {/* 탭 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF', padding: '10px 16px', height: '52px', boxSizing: 'border-box', flexShrink: 0 }}>
                    <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '3px', gap: '2px', alignItems: 'center' }}>
                        <button
                            onClick={() => setActiveTab('scale')}
                            style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: 'none',
                                borderBottom: '0px solid transparent',
                                outline: 'none',
                                textDecoration: 'none',
                                borderRadius: '6px',
                                background: activeTab === 'scale' ? '#FFFFFF' : 'transparent',
                                color: activeTab === 'scale' ? '#1E293B' : '#64748B',
                                boxShadow: activeTab === 'scale' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                margin: 0
                            }}
                        >
                            단일형 척도
                        </button>
                        <button
                            onClick={() => setActiveTab('group')}
                            style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: 'none',
                                borderBottom: '0px solid transparent',
                                outline: 'none',
                                textDecoration: 'none',
                                borderRadius: '6px',
                                background: activeTab === 'group' ? '#FFFFFF' : 'transparent',
                                color: activeTab === 'group' ? '#1E293B' : '#64748B',
                                boxShadow: activeTab === 'group' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                margin: 0
                            }}
                        >
                            그룹 묶기
                        </button>
                        <button
                            onClick={() => setActiveTab('rank')}
                            style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: 'none',
                                borderBottom: '0px solid transparent',
                                outline: 'none',
                                textDecoration: 'none',
                                borderRadius: '6px',
                                background: activeTab === 'rank' ? '#FFFFFF' : 'transparent',
                                color: activeTab === 'rank' ? '#1E293B' : '#64748B',
                                boxShadow: activeTab === 'rank' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                margin: 0
                            }}
                        >
                            다중형 순위
                        </button>
                    </div>

                    {/* 우측 추가 버튼 */}
                    {activeTab === 'scale' && (
                        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <button
                                onClick={handleAddScalePreset}
                                style={{
                                    padding: '5px 12px',
                                    background: '#FFFFFF',
                                    border: '1px solid #2563EB',
                                    color: '#2563EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <Plus size={14} /> 척도 프리셋 추가
                            </button>
                        </div>
                    )}
                    {activeTab === 'group' && (
                        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <button
                                onClick={handleAddGroupPreset}
                                style={{
                                    padding: '5px 12px',
                                    background: '#FFFFFF',
                                    border: '1px solid #2563EB',
                                    color: '#2563EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <Plus size={14} /> 그룹 프리셋 추가
                            </button>
                        </div>
                    )}
                    {activeTab === 'rank' && (
                        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <button
                                onClick={handleAddRankPreset}
                                style={{
                                    padding: '5px 12px',
                                    background: '#FFFFFF',
                                    border: '1px solid #2563EB',
                                    color: '#2563EB',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <Plus size={14} /> 순위 프리셋 추가
                            </button>
                        </div>
                    )}
                </div>

                <div className="dp-setting-card-body" style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#FFFFFF' }}>

                    {/* --- 1. 단일형 척도 탭 --- */}
                    {activeTab === 'scale' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {scaleData.map((item) => {
                                const isExpanded = expandedScaleId === item.id;
                                const minVal = item.min ?? 1;
                                const maxVal = item.max ?? 5;
                                const totalChips = Array.from({ length: maxVal - minVal + 1 }, (_, i) => minVal + i);

                                return (
                                    <div key={item.id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                                        {/* 아코디언 헤더 */}
                                        <div
                                            onClick={() => setExpandedScaleId(isExpanded ? null : item.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 16px',
                                                background: '#F8FAFC',
                                                cursor: 'pointer',
                                                borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                {isExpanded ? <ChevronDown size={16} style={{ color: '#64748B' }} /> : <ChevronRight size={16} style={{ color: '#64748B' }} />}

                                                {/* 척도명 입력 */}
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => handleUpdateScalePreset(item.id, 'name', e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ width: '220px', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', fontWeight: 600, outline: 'none' }}
                                                    placeholder="척도 프리셋 이름"
                                                />

                                                {/* 유형 */}
                                                <div onClick={(e) => e.stopPropagation()} style={{ width: '140px' }}>
                                                    <DropDownList
                                                        data={['single', 'multi', 'rank', 'minrank', 'maxrank', 'scale', 'dummy', 'custom', 'open(문자)', 'open(숫자)']}
                                                        value={item.type || 'scale'}
                                                        onChange={(e) => handleUpdateScalePreset(item.id, 'type', e.value)}
                                                        style={{ fontSize: '12px', width: '100%' }}
                                                    />
                                                </div>

                                                {/* 최소 / 최대 */}
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#475569' }}
                                                >
                                                    <input
                                                        type="number"
                                                        value={item.min}
                                                        onChange={(e) => handleUpdateScalePreset(item.id, 'min', e.target.value)}
                                                        style={{ width: '40px', padding: '3px 4px', textAlign: 'center', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                                                    />
                                                    <span>~</span>
                                                    <input
                                                        type="number"
                                                        value={item.max}
                                                        onChange={(e) => handleUpdateScalePreset(item.id, 'max', e.target.value)}
                                                        style={{ width: '40px', padding: '3px 4px', textAlign: 'center', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                                                    />
                                                </div>

                                                {/* 역코딩 */}
                                                <label
                                                    className="dp-checkbox-label"
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', margin: 0 }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="dp-checkbox-input"
                                                        checked={!!item.recode}
                                                        onChange={(e) => handleUpdateScalePreset(item.id, 'recode', e.target.checked)}
                                                    />
                                                    <span className="dp-checkbox-box" />
                                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>역코딩</span>
                                                </label>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                                                <span style={{ fontSize: '11px', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                                    {(item.bands || []).length} 밴드
                                                </span>
                                                <button
                                                    onClick={(e) => handleDeleteScalePreset(item.id, e)}
                                                    style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    title="척도 삭제"
                                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* 아코디언 바디 (밴드 리스트) */}
                                        {isExpanded && (
                                            <div style={{ padding: '16px 20px', background: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                                {/* 테이블 형태의 헤더 헤딩 */}
                                                <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: '#64748B', paddingBottom: '4px', borderBottom: '1px solid #F1F5F9' }}>
                                                    <div style={{ width: '120px' }}>종류</div>
                                                    <div style={{ width: '50px', textAlign: 'center' }}>N</div>
                                                    <div style={{ width: '180px', paddingLeft: '10px' }}>값 (쉼표 구분)</div>
                                                    <div style={{ flex: 1, paddingLeft: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span>미리보기 ({minVal}~{maxVal})</span>
                                                        <div style={{ display: 'inline-flex', gap: '8px', fontSize: '10px', color: '#64748B', fontWeight: 600, marginRight: '16px' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#BFDBFE', border: '1px solid #60A5FA', boxSizing: 'border-box' }} /> top</span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#CBD5E1', border: '1px solid #94A3B8', boxSizing: 'border-box' }} /> mid</span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FECACA', border: '1px solid #F87171', boxSizing: 'border-box' }} /> bot</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ width: '30px' }}></div>
                                                </div>

                                                {(item.bands || []).map((band, bandIdx) => {
                                                    let activeBg = '#CBD5E1';
                                                    let activeColor = '#0F172A';
                                                    let activeBorder = '#94A3B8';
                                                    const labelLower = String(band.label || '').toLowerCase().trim();
                                                    if (labelLower.startsWith('top')) {
                                                        activeBg = '#BFDBFE';
                                                        activeColor = '#1E3A8A';
                                                        activeBorder = '#60A5FA';
                                                    }
                                                    if (labelLower.startsWith('bot')) {
                                                        activeBg = '#FECACA';
                                                        activeColor = '#7F1D1D';
                                                        activeBorder = '#F87171';
                                                    }

                                                    const displayValuesStr = band.values || '';

                                                    return (
                                                        <div key={band.id || bandIdx} style={{ display: 'flex', alignItems: 'center', padding: '6px 0' }}>
                                                            {/* 종류 */}
                                                            <div style={{ width: '120px' }}>
                                                                <DropDownList
                                                                    data={['top', 'mid', 'bot', 'top2', 'mid2', 'bot2', 'top3', 'mid3', 'bot3']}
                                                                    value={band.label}
                                                                    onChange={(e) => handleUpdateScaleBandById(item.id, band.id, 'label', e.value)}
                                                                    style={{ fontSize: '12px', width: '120px' }}
                                                                />
                                                            </div>

                                                            {/* N 개수 */}
                                                            <div style={{ width: '50px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                                                {parseValues(band.values).length}
                                                            </div>

                                                            {/* 값 문자열 인풋 */}
                                                            <div style={{ width: '180px', paddingLeft: '10px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={displayValuesStr}
                                                                    onChange={(e) => handleUpdateScaleBandById(item.id, band.id, 'values', e.target.value)}
                                                                    onBlur={(e) => {
                                                                        let val = e.target.value.trim();
                                                                        val = val.replace(/,+/g, ',').replace(/^,|,$/g, '');
                                                                        handleUpdateScaleBandById(item.id, band.id, 'values', val);
                                                                    }}
                                                                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                                                                    placeholder="예: 4,5"
                                                                />
                                                            </div>

                                                            {/* 미리보기 동그라미 토글 칩 */}
                                                            <div style={{ flex: 1, paddingLeft: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', rowGap: '6px' }}>
                                                                {totalChips.map((num) => {
                                                                    const isActive = parseValues(band.values).includes(num);
                                                                    return (
                                                                        <button
                                                                            key={num}
                                                                            onClick={() => handleToggleScaleChipById(item.id, band.id, num)}
                                                                            style={{
                                                                                width: '26px',
                                                                                height: '26px',
                                                                                flexShrink: 0,
                                                                                borderRadius: '50%',
                                                                                border: '1px solid',
                                                                                borderColor: isActive ? activeBorder : '#CBD5E1',
                                                                                background: isActive ? activeBg : '#FFFFFF',
                                                                                color: isActive ? activeColor : '#64748B',
                                                                                fontSize: '11px',
                                                                                fontWeight: 700,
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                transition: 'all 0.15s'
                                                                            }}
                                                                        >
                                                                            {num}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* 삭제 */}
                                                            <div style={{ width: '30px', textAlign: 'right' }}>
                                                                <button
                                                                    onClick={() => handleDeleteScaleBandById(item.id, band.id)}
                                                                    style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                                                                >
                                                                    <X size={15} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* 밴드 추가 버튼 */}
                                                <button
                                                    onClick={() => handleAddScaleBand(item.id)}
                                                    style={{
                                                        alignSelf: 'flex-start',
                                                        marginTop: '6px',
                                                        padding: '6px 12px',
                                                        background: '#FFFFFF',
                                                        border: '1px dashed #CBD5E1',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        color: '#475569',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Plus size={14} /> 밴드 추가
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                        </div>
                    )}


                    {/* --- 2. 그룹 묶기 탭 --- */}
                    {activeTab === 'group' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {groupData.map((item) => {
                                const isExpanded = expandedGroupId === item.id;
                                const totalChips = Array.from(
                                    new Set(
                                        (item.groups || [])
                                            .flatMap(g => parseValues(g.values))
                                    )
                                ).sort((a, b) => a - b);

                                const overallPainting = {};
                                (item.groups || []).forEach((g, gIdx) => {
                                    const colorObj = GROUP_COLORS[gIdx % GROUP_COLORS.length];
                                    parseValues(g.values).forEach(val => {
                                        overallPainting[val] = colorObj;
                                    });
                                });

                                return (
                                    <div key={item.id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                                        {/* 아코디언 헤더 */}
                                        <div
                                            onClick={() => setExpandedGroupId(isExpanded ? null : item.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 16px',
                                                background: '#F8FAFC',
                                                cursor: 'pointer',
                                                borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                {isExpanded ? <ChevronDown size={16} style={{ color: '#64748B' }} /> : <ChevronRight size={16} style={{ color: '#64748B' }} />}

                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => handleUpdateGroupPresetField(item.id, 'name', e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ width: '250px', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', fontWeight: 600, outline: 'none' }}
                                                    placeholder="그룹 프리셋 이름"
                                                />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                                                <span style={{ fontSize: '11px', background: '#F0FDF4', color: '#16A34A', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                                    {(item.groups || []).length} 그룹
                                                </span>
                                                <button
                                                    onClick={(e) => handleDeleteGroupPreset(item.id, e)}
                                                    style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    title="그룹 프리셋 삭제"
                                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        {/* 아코디언 바디 */}
                                        {isExpanded && (
                                            <div style={{ padding: '16px 20px', background: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                                                <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: '#64748B', paddingBottom: '4px', borderBottom: '1px solid #F1F5F9' }}>
                                                    <div style={{ width: '150px' }}>그룹 라벨</div>
                                                    <div style={{ width: '180px', paddingLeft: '10px' }}>값 (쉼표 구분)</div>
                                                    <div style={{ flex: 1, paddingLeft: '10px' }}>미리보기</div>
                                                    <div style={{ width: '30px' }}></div>
                                                </div>

                                                {(item.groups || []).map((group, groupIdx) => {
                                                    const colorObj = GROUP_COLORS[groupIdx % GROUP_COLORS.length];
                                                    const displayStr = group.values || '';

                                                    return (
                                                        <div key={groupIdx} style={{ display: 'flex', alignItems: 'center' }}>
                                                            <div style={{ width: '150px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={group.label}
                                                                    onChange={(e) => handleUpdateGroupRow(item.id, groupIdx, 'label', e.target.value)}
                                                                    style={{ width: '135px', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', outline: 'none' }}
                                                                    placeholder="예: 브랜드 A"
                                                                />
                                                            </div>

                                                            <div style={{ width: '180px', paddingLeft: '10px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={displayStr}
                                                                    onChange={(e) => handleUpdateGroupRow(item.id, groupIdx, 'values', e.target.value)}
                                                                    onBlur={(e) => {
                                                                        let val = e.target.value.trim();
                                                                        val = val.replace(/,+/g, ',').replace(/^,|,$/g, '');
                                                                        handleUpdateGroupRow(item.id, groupIdx, 'values', val);
                                                                    }}
                                                                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                                                                    placeholder="예: 1,2"
                                                                />
                                                            </div>

                                                            <div style={{ flex: 1, paddingLeft: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', rowGap: '6px' }}>
                                                                {totalChips.map(num => {
                                                                    const isActive = parseValues(group.values).includes(num);
                                                                    return (
                                                                        <button
                                                                            key={num}
                                                                            onClick={() => handleToggleGroupChip(item.id, groupIdx, num)}
                                                                            style={{
                                                                                width: '26px',
                                                                                height: '26px',
                                                                                flexShrink: 0,
                                                                                borderRadius: '50%',
                                                                                border: '1px solid',
                                                                                borderColor: isActive ? colorObj.border : '#CBD5E1',
                                                                                background: isActive ? colorObj.bg : '#FFFFFF',
                                                                                color: isActive ? colorObj.text : '#64748B',
                                                                                fontSize: '11px',
                                                                                fontWeight: 700,
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                transition: 'all 0.15s'
                                                                            }}
                                                                        >
                                                                            {num}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div style={{ width: '30px', textAlign: 'right' }}>
                                                                <button
                                                                    onClick={() => handleDeleteGroupRow(item.id, groupIdx)}
                                                                    style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                                                                >
                                                                    <X size={15} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                <button
                                                    onClick={() => handleAddGroupRow(item.id)}
                                                    style={{
                                                        alignSelf: 'flex-start',
                                                        padding: '6px 12px',
                                                        background: '#FFFFFF',
                                                        border: '1px dashed #CBD5E1',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        color: '#475569',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Plus size={14} /> 그룹 추가
                                                </button>

                                                <div style={{ marginTop: '10px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                                                         전체 값 색칠 ({totalChips.length}개)
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', rowGap: '6px' }}>
                                                        {totalChips.map(num => {
                                                            const colorObj = overallPainting[num];
                                                            return (
                                                                <div
                                                                    key={num}
                                                                    style={{
                                                                        width: '28px',
                                                                        height: '28px',
                                                                        flexShrink: 0,
                                                                        borderRadius: '50%',
                                                                        border: '1px solid',
                                                                        borderColor: colorObj ? colorObj.border : '#CBD5E1',
                                                                        background: colorObj ? colorObj.bg : '#FFFFFF',
                                                                        color: colorObj ? colorObj.text : '#94A3B8',
                                                                        fontSize: '11px',
                                                                        fontWeight: 700,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    {num}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}


                    {/* --- 3. 다중형 순위 탭 --- */}
                    {activeTab === 'rank' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {rankData.map((item) => {
                                const isExpanded = expandedRankId === item.id;
                                const maxVal = item.max || 5;
                                const totalChips = Array.from({ length: maxVal }, (_, i) => i + 1);

                                return (
                                    <div key={item.id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                                        {/* 아코디언 헤더 */}
                                        <div
                                            onClick={() => setExpandedRankId(isExpanded ? null : item.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 16px',
                                                background: '#F8FAFC',
                                                cursor: 'pointer',
                                                borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                {isExpanded ? <ChevronDown size={16} style={{ color: '#64748B' }} /> : <ChevronRight size={16} style={{ color: '#64748B' }} />}

                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => handleUpdateRankPreset(item.id, 'name', e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ width: '250px', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', fontWeight: 600, outline: 'none' }}
                                                    placeholder="순위 프리셋 이름"
                                                />

                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#475569' }}
                                                >
                                                    <span>max</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.max}
                                                        onChange={(e) => handleUpdateRankPreset(item.id, 'max', e.target.value)}
                                                        onBlur={(e) => {
                                                            const val = parseInt(e.target.value, 10);
                                                            if (isNaN(val) || val < 1) {
                                                                handleUpdateRankPreset(item.id, 'max', 1);
                                                            }
                                                        }}
                                                        style={{ width: '45px', padding: '3px 4px', textAlign: 'center', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                                                <span style={{ fontSize: '11px', background: '#F5F3FF', color: '#7C3AED', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                                    {(item.combinations || []).length} 조합
                                                </span>
                                                <button
                                                    onClick={(e) => handleDeleteRankPreset(item.id, e)}
                                                    style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    title="순위 프리셋 삭제"
                                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* 아코디언 바디 */}
                                        {isExpanded && (
                                            <div style={{ padding: '16px 20px', background: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                                                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                    <Info size={14} /> 소스 변수 max_rank = {maxVal} 가정. 비연속 조합(예: 1+3)도 칩 토글로 선언 가능합니다.
                                                </div>

                                                <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: '#64748B', paddingBottom: '4px', borderBottom: '1px solid #F1F5F9' }}>
                                                    <div style={{ width: '200px' }}>라벨 (비우면 자동 생성)</div>
                                                    <div style={{ flex: 1, paddingLeft: '10px' }}>순위 토글</div>
                                                    <div style={{ width: '30px' }}></div>
                                                </div>

                                                {(item.combinations || []).map((combo, comboIdx) => {
                                                    return (
                                                        <div key={comboIdx} style={{ display: 'flex', alignItems: 'center' }}>
                                                            <div style={{ width: '200px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={combo.label}
                                                                    onChange={(e) => handleUpdateRankCombo(item.id, comboIdx, 'label', e.target.value)}
                                                                    style={{ width: '185px', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', outline: 'none' }}
                                                                    placeholder="예: 1순위 / Top2"
                                                                />
                                                            </div>

                                                            <div style={{ flex: 1, paddingLeft: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', rowGap: '6px' }}>
                                                                {totalChips.map(num => {
                                                                    const isActive = (combo.values || []).includes(num);
                                                                    return (
                                                                        <button
                                                                            key={num}
                                                                            onClick={() => handleToggleRankChip(item.id, comboIdx, num)}
                                                                            style={{
                                                                                width: '26px',
                                                                                height: '26px',
                                                                                flexShrink: 0,
                                                                                borderRadius: '50%',
                                                                                border: '1px solid',
                                                                                borderColor: isActive ? '#60A5FA' : '#CBD5E1',
                                                                                background: isActive ? '#BFDBFE' : '#FFFFFF',
                                                                                color: isActive ? '#1E3A8A' : '#64748B',
                                                                                fontSize: '11px',
                                                                                fontWeight: 700,
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                transition: 'all 0.15s'
                                                                            }}
                                                                        >
                                                                            {num}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div style={{ width: '30px', textAlign: 'right' }}>
                                                                <button
                                                                    onClick={() => handleDeleteRankCombo(item.id, comboIdx)}
                                                                    style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                                                                >
                                                                    <X size={15} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                <button
                                                    onClick={() => handleAddRankCombo(item.id)}
                                                    style={{
                                                        alignSelf: 'flex-start',
                                                        padding: '6px 12px',
                                                        background: '#FFFFFF',
                                                        border: '1px dashed #CBD5E1',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        color: '#475569',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Plus size={14} /> 조합 추가
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AnalysisSettingTab;
