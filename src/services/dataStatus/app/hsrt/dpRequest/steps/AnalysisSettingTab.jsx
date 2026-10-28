import { useState, useRef, useLayoutEffect } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Plus, Trash2, X, Info, GripVertical, Sparkles, Pin } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import AiAutoGroupModal from './AiAutoGroupModal';
import { TIER_OPTIONS, insertSiblingRow } from './groupTierOptions';

// 그룹 색상 팔레트 정의
const GROUP_COLORS = [
    { bg: 'var(--srt-primary-200)', border: 'var(--srt-primary-400)', text: 'var(--srt-primary-900)' }, // Blue
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

// 미리보기용: "1,3, 1to100" → ["1", "3", "1 to 100"]
const tokenizeGroupValues = (str) => String(str || '')
    .split(',').map(s => s.trim()).filter(Boolean)
    .map(s => s.replace(/\s*to\s*/i, ' to '));

// 그룹 프리셋 하단 전체 값 칩 섹션 (2줄 초과 시에만 전체보기 토글 표시)
const GroupTotalChipsSection = ({ groups, totalCount }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasOverflow, setHasOverflow] = useState(false);
    const containerRef = useRef(null);

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const checkOverflow = () => {
            if (containerRef.current) {
                // 칩 2줄 높이는 약 48~52px. 3줄 이상일 때 scrollHeight가 약 74px 이상이 되므로 56px 기준으로 판단
                setHasOverflow(containerRef.current.scrollHeight > 56);
            }
        };

        checkOverflow();

        if (window.ResizeObserver) {
            const ro = new ResizeObserver(checkOverflow);
            ro.observe(el);
            return () => ro.disconnect();
        }
    }, [groups]);

    return (
        <div style={{ paddingTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>전체 값</span>
                <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: '6px' }}>{totalCount}개</span>
                {hasOverflow && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(prev => !prev)}
                        style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '2px', border: 'none', background: 'transparent', color: 'var(--srt-primary-600)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                    >
                        {isExpanded ? '접기' : '전체보기'}
                        <ChevronDown size={13} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                )}
            </div>
            <div
                ref={containerRef}
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    ...(hasOverflow && !isExpanded ? { maxHeight: '52px', overflow: 'hidden' } : {})
                }}
            >
                {(groups || []).flatMap((g, gIdx) => {
                    const c = GROUP_COLORS[gIdx % GROUP_COLORS.length];
                    return tokenizeGroupValues(g.values).map((tok, tIdx) => (
                        <span key={`${gIdx}_${tIdx}`} title={g.label} style={{ padding: '2px 10px', borderRadius: '999px', border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {tok}
                        </span>
                    ));
                })}
            </div>
        </div>
    );
};

const AnalysisSettingTab = ({
    contextData,
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
    const [aiGroupOpen, setAiGroupOpen] = useState(false); // AI 자동 그룹 생성 팝업

    // --- 드래그 앤 드롭 상태 ---
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const [dragOverPresetId, setDragOverPresetId] = useState(null);

    // --- 유틸리티 함수 ---
    const markUnsaved = () => {
        if (onUnsavedChange) onUnsavedChange(true);
    };

    const handleDragStart = (e, presetId, bandIdx) => {
        e.dataTransfer.setData('presetId', presetId);
        e.dataTransfer.setData('bandIdx', String(bandIdx));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDragEnter = (e, presetId, bandIdx) => {
        e.preventDefault();
        setDragOverIdx(bandIdx);
        setDragOverPresetId(presetId);
    };

    const handleDragEnd = () => {
        setDragOverIdx(null);
        setDragOverPresetId(null);
    };

    const handleDrop = (e, presetId, targetBandIdx) => {
        e.preventDefault();
        setDragOverIdx(null);
        setDragOverPresetId(null);

        const sourcePresetId = e.dataTransfer.getData('presetId');
        const sourceBandIdx = parseInt(e.dataTransfer.getData('bandIdx'), 10);

        if (sourcePresetId !== presetId || sourceBandIdx === targetBandIdx) return;

        setScaleData(scaleData.map(item => {
            if (item.id === presetId) {
                const bands = [...(item.bands || [])];
                const [draggedItem] = bands.splice(sourceBandIdx, 1);
                bands.splice(targetBandIdx, 0, draggedItem);
                return { ...item, bands };
            }
            return item;
        }));
        markUnsaved();
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

    // 그룹 값 파싱: "1 to 100", "1,2,3,5", "1 to 100, 999" 지원 (0 허용)
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

    // 미리보기용: "1,3, 1to100" → ["1", "3", "1 to 100"]
    const tokenizeGroupValues = (str) => String(str || '')
        .split(',').map(s => s.trim()).filter(Boolean)
        .map(s => s.replace(/\s*to\s*/i, ' to '));

    const STT_POSITION_OPTIONS = [
        { value: 'before_first', label: '그룹 시작 위치', desc: '각 그룹의 첫 번째 보기 바로 앞에 배치' },
        { value: 'after_last', label: '그룹 종료 위치', desc: '각 그룹의 마지막 보기 바로 뒤에 배치' },
        { value: 'top_all', label: '전체 보기 상단', desc: '모든 그룹 소계를 보기 목록 맨 위에 일괄 배치' },
        { value: 'bottom_all', label: '전체 보기 하단', desc: '모든 그룹 소계를 보기 목록 맨 아래에 일괄 배치' }
    ];

    // --- 단일형 척도 조작 ---
    const handleAddScalePreset = () => {
        const newPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: '새 척도 설정',
            type: 'scale',
            min: 1,
            max: 5,
            recode: false,
            reverse_order: false,
            ex_show: false,
            bands: [
                { id: `band_top_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, label: 'Top', values: '' },
                { id: `band_mid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, label: 'Mid', values: '' },
                { id: `band_bot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, label: 'Bot', values: '' }
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

    const handleAddScaleBand = (presetId, afterIdx) => {
        setScaleData(scaleData.map(item => {
            if (item.id === presetId) {
                const nextBands = [...(item.bands || [])];
                const newBand = { id: `band_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, label: 'Top', values: '' };
                const insertAt = (afterIdx === undefined || afterIdx === null) ? nextBands.length : afterIdx + 1;
                nextBands.splice(insertAt, 0, newBand);
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
                        let updated = { ...band, [field]: value };
                        if (field === 'values') {
                            const baseLabel = String(band.label || '').replace(/[0-9]/g, '') || 'Top';
                            const nVal = parseValues(value).length;
                            updated.label = nVal > 1 ? `${baseLabel}${nVal}` : baseLabel;
                        }
                        return updated;
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
                        const baseLabel = String(band.label || '').replace(/[0-9]/g, '') || 'Top';
                        const nVal = nextVals.length;
                        const nextLabel = nVal > 1 ? `${baseLabel}${nVal}` : baseLabel;
                        return { ...band, values: nextVals.join(','), label: nextLabel };
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
    const newGroupRow = (label = '', tier = 1) => ({
        id: `g_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        label, values: '', bottom_values: '', tier
    });

    const handleAddGroupPreset = () => {
        const newPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: '새 그룹 설정',
            min: 1,
            max: 7,
            stt_position: 'before_first',
            groups: [
                newGroupRow('그룹 A')
            ]
        };
        setGroupData([...groupData, newPreset]);
        setExpandedGroupId(newPreset.id);
        markUnsaved();
    };

    // AI 결과 행 → 프리셋 groups
    const aiRowsToGroups = (rows) => rows.map(r => ({
        id: r.id || newGroupRow().id,
        label: r.label || '',
        values: r.values || '',
        bottom_values: r.bottom_values || '',
        tier: Number(r.tier) === 2 ? 2 : 1
    }));

    const handleAiCreatePreset = (rows, name, generateCrosstab = false) => {
        const newPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: name || '새 그룹 설정',
            min: 1,
            max: 7,
            stt_position: 'before_first',
            generate_group_crosstab: !!generateCrosstab,
            groups: aiRowsToGroups(rows)
        };
        setGroupData([...groupData, newPreset]);
        setExpandedGroupId(newPreset.id);
        setAiGroupOpen(false);
        markUnsaved();
    };

    const handleAiOverwritePreset = (rows, name, generateCrosstab = false) => {
        if (!expandedGroupId) return;
        setGroupData(groupData.map(item => item.id === expandedGroupId
            ? { ...item, name: name || item.name, generate_group_crosstab: !!generateCrosstab, groups: aiRowsToGroups(rows) }
            : item));
        setAiGroupOpen(false);
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

    const handleAddGroupRow = (presetId, afterIdx) => {
        setGroupData(groupData.map(item => {
            if (item.id === presetId) {
                const rows = item.groups || [];
                const newRow = newGroupRow(`그룹 ${String.fromCharCode(64 + rows.length + 1)}`);
                // 대분류 [+] → 소속 중분류들 아래에 대분류 추가 / 중분류 [+] → 바로 아래 중분류 추가
                return { ...item, groups: insertSiblingRow(rows, afterIdx, newRow) };
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
                        let vals = parseGroupValues(g.values);
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

    const handleAddRankCombo = (presetId, afterIdx) => {
        setRankData(rankData.map(item => {
            if (item.id === presetId) {
                const combinations = [...(item.combinations || [])];
                const insertAt = (afterIdx === undefined || afterIdx === null) ? combinations.length : afterIdx + 1;
                combinations.splice(insertAt, 0, { label: '', values: [] });
                return {
                    ...item,
                    combinations
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

                        // 다중형 순위는 띄엄띄엄 선택 불가능하게 무조건 1부터 num까지 누적
                        // 만약 현재 정확히 1~num까지 선택되어 있다면, 하나 줄이기(토글 오프) 동작
                        if (vals.length === num && vals.every((v, i) => v === i + 1)) {
                            nextVals = Array.from({ length: num - 1 }, (_, i) => i + 1);
                        } else {
                            nextVals = Array.from({ length: num }, (_, i) => i + 1);
                        }

                        let label = combo.label || '';
                        const isAutoLabel = !combo.label ||
                            combo.label === '1순위' ||
                            /^Top\d+$/.test(combo.label) ||
                            /^\d+(\+\d+)*$/.test(combo.label);

                        if (isAutoLabel) {
                            if (nextVals.length === 0) label = '';
                            else if (nextVals.length === 1 && nextVals[0] === 1) label = '1순위';
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
                    {activeTab === 'scale' && scaleData.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <button
                                onClick={handleAddScalePreset}
                                style={{
                                    padding: '5px 12px',
                                    background: '#FFFFFF',
                                    border: '1px solid var(--srt-primary-600)',
                                    color: 'var(--srt-primary-600)',
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
                        <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '6px' }}>
                            <button
                                id="group-ai-auto-btn"
                                onClick={() => setAiGroupOpen(true)}
                                style={{
                                    padding: '5px 12px',
                                    background: 'linear-gradient(135deg, var(--srt-primary-500) 0%, var(--srt-primary-700) 100%)',
                                    border: '1px solid var(--srt-primary-700)',
                                    color: '#FFFFFF',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <Sparkles size={14} /> AI 자동 그룹 생성
                            </button>
                            {groupData.length > 0 && (
                            <button
                                onClick={handleAddGroupPreset}
                                style={{
                                    padding: '5px 12px',
                                    background: '#FFFFFF',
                                    border: '1px solid var(--srt-primary-600)',
                                    color: 'var(--srt-primary-600)',
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
                            )}
                        </div>
                    )}
                    {activeTab === 'rank' && rankData.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <button
                                onClick={handleAddRankPreset}
                                style={{
                                    padding: '5px 12px',
                                    background: '#FFFFFF',
                                    border: '1px solid var(--srt-primary-600)',
                                    color: 'var(--srt-primary-600)',
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

                <div className="dp-setting-card-body" style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>

                    {/* --- 1. 단일형 척도 탭 --- */}
                    {activeTab === 'scale' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                            {scaleData.length === 0 ? (
                                <div style={{ flex: 1, textAlign: 'center', color: '#94A3B8', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Info size={24} />
                                    <span style={{ fontSize: '13px', color: '#94A3B8' }}>등록된 척도 프리셋이 없습니다.</span>
                                    <button
                                        onClick={handleAddScalePreset}
                                        style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', border: '1px solid var(--srt-primary-600)', borderRadius: '6px', background: 'var(--srt-primary-50)', color: 'var(--srt-primary-600)', cursor: 'pointer' }}
                                    >
                                        <Plus size={14} /><span style={{ fontSize: '13px', fontWeight: 600 }}>척도 프리셋 추가</span>
                                    </button>
                                </div>
                            ) : scaleData.map((item) => {
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

                                                {/* 역순정렬 여부 */}
                                                <label
                                                    className="dp-checkbox-label"
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', margin: 0, marginLeft: '12px' }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="dp-checkbox-input"
                                                        checked={!!item.reverse_order}
                                                        onChange={(e) => handleUpdateScalePreset(item.id, 'reverse_order', e.target.checked)}
                                                    />
                                                    <span className="dp-checkbox-box" />
                                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>역순정렬</span>
                                                </label>

                                                {/* 보기코드제시 여부 */}
                                                <label
                                                    className="dp-checkbox-label"
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', margin: 0, marginLeft: '12px' }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="dp-checkbox-input"
                                                        checked={!!item.ex_show}
                                                        onChange={(e) => handleUpdateScalePreset(item.id, 'ex_show', e.target.checked)}
                                                    />
                                                    <span className="dp-checkbox-box" />
                                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>보기코드제시</span>
                                                </label>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                                                <span style={{ fontSize: '11px', background: 'var(--srt-primary-50)', color: 'var(--srt-primary-700)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
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

                                                {/* 표 헤더 */}
                                                <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', background: '#FFFFFF' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', height: '32px', padding: '0 12px', background: 'var(--srt-primary-50)', borderBottom: '1px solid var(--srt-primary-200)' }}>
                                                    <div style={{ width: '48px', textAlign: 'center' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>추가</span></div>
                                                    <div style={{ width: '48px', textAlign: 'center' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>순서</span></div>
                                                    <div style={{ width: '120px' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>종류</span></div>
                                                    <div style={{ width: '50px', textAlign: 'center' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>N</span></div>
                                                    <div style={{ width: '180px', paddingLeft: '10px' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>값</span></div>
                                                    <div style={{ flex: 1, paddingLeft: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>미리보기 ({minVal}~{maxVal})</span>
                                                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--srt-primary-200)', border: '1px solid var(--srt-primary-400)', boxSizing: 'border-box' }} /> Top</span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FEF3C7', border: '1px solid #F59E0B', boxSizing: 'border-box' }} /> Mid</span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FECACA', border: '1px solid #F87171', boxSizing: 'border-box' }} /> Bot</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ width: '48px', textAlign: 'center' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>삭제</span></div>
                                                </div>

                                                {(item.bands || []).map((band, bandIdx) => {
                                                    let activeBg = '#CBD5E1';
                                                    let activeColor = '#0F172A';
                                                    let activeBorder = '#94A3B8';
                                                    const labelLower = String(band.label || '').toLowerCase().trim();
                                                    if (labelLower.startsWith('top')) {
                                                        activeBg = 'var(--srt-primary-200)';
                                                        activeColor = 'var(--srt-primary-900)';
                                                        activeBorder = 'var(--srt-primary-400)';
                                                    }
                                                    if (labelLower.startsWith('bot')) {
                                                        activeBg = '#FECACA';
                                                        activeColor = '#7F1D1D';
                                                        activeBorder = '#F87171';
                                                    }
                                                    if (labelLower.startsWith('mid')) {
                                                        activeBg = '#FEF3C7';
                                                        activeColor = '#D97706';
                                                        activeBorder = '#F59E0B';
                                                    }

                                                    const displayValuesStr = band.values || '';
                                                    const isDragOver = dragOverPresetId === item.id && dragOverIdx === bandIdx;

                                                    return (
                                                        <div
                                                            key={band.id || bandIdx}
                                                            onDragOver={handleDragOver}
                                                            onDragEnter={(e) => handleDragEnter(e, item.id, bandIdx)}
                                                            onDrop={(e) => handleDrop(e, item.id, bandIdx)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                minHeight: '40px',
                                                                padding: '6px 12px',
                                                                borderBottom: '1px solid #F1F5F9',
                                                                borderTop: isDragOver ? '2px solid var(--srt-primary-500)' : '2px solid transparent',
                                                                transition: 'border-color 0.15s ease',
                                                                boxSizing: 'border-box'
                                                            }}
                                                        >
                                                            {/* 추가 */}
                                                            <div style={{ width: '48px', display: 'flex', justifyContent: 'center' }}>
                                                                <button
                                                                    onClick={() => handleAddScaleBand(item.id, bandIdx)}
                                                                    title="아래에 밴드 추가"
                                                                    style={{ border: 'none', background: 'transparent', color: 'var(--srt-primary-600)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--srt-primary-700)'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--srt-primary-600)'}
                                                                >
                                                                    <Plus size={16} />
                                                                </button>
                                                            </div>
                                                            {/* 이동 아이콘 */}
                                                            <div
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, item.id, bandIdx)}
                                                                onDragEnd={handleDragEnd}
                                                                title="끌어서 순서 변경"
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '48px',
                                                                    color: '#94A3B8',
                                                                    cursor: 'grab'
                                                                }}
                                                            >
                                                                <GripVertical size={16} />
                                                            </div>

                                                            {/* 종류 */}
                                                            <div style={{ width: '120px' }}>
                                                                {(() => {
                                                                    const nValForDropdown = parseValues(band.values).length;
                                                                    const suffix = nValForDropdown > 1 ? String(nValForDropdown) : '';
                                                                    const dropdownData = [`Top${suffix}`, `Mid${suffix}`, `Bot${suffix}`];

                                                                    // 서버에서 소문자로 내려온 경우 대응 (casing normalization)
                                                                    const rawText = String(band.label || '').replace(/[0-9]/g, '').toLowerCase().trim();
                                                                    let baseLabel = 'Top';
                                                                    if (rawText === 'mid') baseLabel = 'Mid';
                                                                    if (rawText === 'bot') baseLabel = 'Bot';

                                                                    const currentVal = baseLabel + suffix;
                                                                    return (
                                                                        <DropDownList
                                                                            data={dropdownData}
                                                                            value={currentVal}
                                                                            onChange={(e) => handleUpdateScaleBandById(item.id, band.id, 'label', e.value)}
                                                                            style={{ fontSize: '12px', width: '120px' }}
                                                                        />
                                                                    );
                                                                })()}
                                                            </div>

                                                            {/* N 개수 */}
                                                            <div style={{ width: '50px', textAlign: 'center' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{parseValues(band.values).length}</span>
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
                                                                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
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
                                                            <div style={{ width: '48px', display: 'flex', justifyContent: 'center' }}>
                                                                {(item.bands || []).length > 1 && (
                                                                <button
                                                                    onClick={() => handleDeleteScaleBandById(item.id, band.id)}
                                                                    title="밴드 삭제"
                                                                    style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {(item.bands || []).length === 0 && (
                                                    <button
                                                        onClick={() => handleAddScaleBand(item.id)}
                                                        style={{ width: '100%', height: '36px', border: 'none', background: '#FFFFFF', color: 'var(--srt-primary-600)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                                    >
                                                        <Plus size={14} /><span style={{ fontSize: '13px', fontWeight: 600 }}>밴드 추가</span>
                                                    </button>
                                                )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                        </div>
                    )}


                    {/* --- 2. 그룹 묶기 탭 --- */}
                    {activeTab === 'group' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                            {groupData.length === 0 ? (
                                <div style={{ flex: 1, textAlign: 'center', color: '#94A3B8', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Info size={24} />
                                    <span style={{ fontSize: '13px', color: '#94A3B8' }}>등록된 그룹 프리셋이 없습니다.</span>
                                    <button
                                        onClick={handleAddGroupPreset}
                                        style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', border: '1px solid var(--srt-primary-600)', borderRadius: '6px', background: 'var(--srt-primary-50)', color: 'var(--srt-primary-600)', cursor: 'pointer' }}
                                    >
                                        <Plus size={14} /><span style={{ fontSize: '13px', fontWeight: 600 }}>그룹 프리셋 추가</span>
                                    </button>
                                </div>
                            ) : groupData.map((item) => {
                                const isExpanded = expandedGroupId === item.id;
                                const totalChips = Array.from(
                                    new Set(
                                        (item.groups || [])
                                            .flatMap(g => parseGroupValues(g.values))
                                    )
                                ).sort((a, b) => a - b);

                                const overallPainting = {};
                                (item.groups || []).forEach((g, gIdx) => {
                                    const colorObj = GROUP_COLORS[gIdx % GROUP_COLORS.length];
                                    parseGroupValues(g.values).forEach(val => {
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

                                                {/* 소계(STT) 위치 설정 */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>소계(STT) 위치</span>
                                                        <span style={{ fontSize: '12px', fontWeight: 400, color: '#94A3B8', marginLeft: '6px' }}>교차표에서 그룹 행이 배치될 위치</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                        {STT_POSITION_OPTIONS.map(opt => {
                                                            const selected = (item.stt_position || 'before_first') === opt.value;
                                                            return (
                                                                <button
                                                                    key={opt.value}
                                                                    type="button"
                                                                    onClick={() => handleUpdateGroupPresetField(item.id, 'stt_position', opt.value)}
                                                                    title={opt.desc}
                                                                    style={{
                                                                        padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
                                                                        border: selected ? '1px solid var(--srt-primary-600)' : '1px solid #E2E8F0',
                                                                        background: selected ? 'var(--srt-primary-50)' : '#FFFFFF',
                                                                        display: 'flex', flexDirection: 'column', gap: '2px'
                                                                    }}
                                                                >
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: selected ? 600 : 500, color: selected ? 'var(--srt-primary-700)' : '#475569' }}>
                                                                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', boxSizing: 'border-box', border: selected ? '4px solid var(--srt-primary-600)' : '1px solid #CBD5E1', background: '#fff', flexShrink: 0 }} />
                                                                        {opt.label}
                                                                    </span>
                                                                    <span style={{ fontSize: '12px', color: '#94A3B8', paddingLeft: '18px', whiteSpace: 'nowrap' }}>{opt.desc}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#FFFFFF' }}>
                                                    <label
                                                        className="dp-checkbox-label"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', margin: 0 }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="dp-checkbox-input"
                                                            checked={!!item.generate_group_crosstab}
                                                            onChange={(e) => handleUpdateGroupPresetField(item.id, 'generate_group_crosstab', e.target.checked)}
                                                        />
                                                        <span className="dp-checkbox-box" />
                                                        <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>그룹 전용 교차표 추가 생성</span>
                                                    </label>
                                                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                                                        {item.generate_group_crosstab
                                                            ? '원본 보기 + 그룹 소계 교차표에 더해, 그룹만 있는 교차표를 하나 더 만듭니다.'
                                                            : '기본: 원본 보기와 그룹 소계가 함께 있는 교차표만 만듭니다.'}
                                                    </span>
                                                </div>

                                                <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', background: '#FFFFFF' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', height: '32px', padding: '0 12px', background: 'var(--srt-primary-50)', borderBottom: '1px solid var(--srt-primary-200)' }}>
                                                    <div style={{ width: '48px', textAlign: 'center' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>추가</span></div>
                                                    <div style={{ width: '120px' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>단계</span></div>
                                                    <div style={{ width: '190px' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>그룹 라벨</span></div>
                                                    <div style={{ width: '180px', paddingLeft: '10px' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>값</span></div>
                                                    <div style={{ width: '130px', paddingLeft: '10px' }} title="그룹 안에서 맨 아래에 고정할 코드"><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>하단 고정 코드</span></div>
                                                    <div style={{ flex: 1, paddingLeft: '10px' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>미리보기</span></div>
                                                    <div style={{ width: '64px', textAlign: 'center' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>삭제</span></div>
                                                </div>

                                                {(item.groups || []).map((group, groupIdx) => {
                                                    const colorObj = GROUP_COLORS[groupIdx % GROUP_COLORS.length];
                                                    const displayStr = group.values || '';

                                                    const isSub = Number(group.tier) === 2;

                                                    return (
                                                        <div key={groupIdx} style={{
                                                            display: 'flex', alignItems: 'center', minHeight: '40px', boxSizing: 'border-box',
                                                            padding: '6px 12px',
                                                            borderBottom: '1px solid #E2E8F0',
                                                            borderTop: groupIdx > 0 && !isSub ? '1px solid #E2E8F0' : 'none',
                                                            background: isSub ? '#F8FAFC' : '#FFFFFF'
                                                        }}>
                                                            <div style={{ width: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                                <button
                                                                    onClick={() => handleAddGroupRow(item.id, groupIdx)}
                                                                    title="아래에 그룹 추가"
                                                                    style={{ border: 'none', background: 'transparent', color: 'var(--srt-primary-600)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--srt-primary-700)'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--srt-primary-600)'}
                                                                >
                                                                    <Plus size={16} />
                                                                </button>
                                                            </div>
                                                            <div style={{ width: '120px', paddingLeft: isSub ? '22px' : '0', paddingRight: '10px', boxSizing: 'border-box', position: 'relative' }}>
                                                                {isSub && (
                                                                    <span style={{ position: 'absolute', left: '5px', top: '50%', transform: 'translateY(-55%)', color: 'var(--srt-primary-300)', fontSize: '14px', fontWeight: 700, pointerEvents: 'none' }}>
                                                                        └
                                                                    </span>
                                                                )}
                                                                <DropDownList
                                                                    data={groupIdx === 0 ? TIER_OPTIONS.slice(0, 1) : TIER_OPTIONS}
                                                                    textField="text"
                                                                    dataItemKey="value"
                                                                    value={TIER_OPTIONS.find(o => o.value === (isSub ? 2 : 1))}
                                                                    onChange={(e) => handleUpdateGroupRow(item.id, groupIdx, 'tier', groupIdx === 0 ? 1 : (e.value?.value || 1))}
                                                                    disabled={groupIdx === 0}
                                                                    title={groupIdx === 0 ? '첫 번째 행은 대분류만 가능합니다' : undefined}
                                                                    className={isSub ? 'dp-tier-dropdown dp-tier-overlay dp-tier-sub' : 'dp-tier-dropdown dp-tier-overlay'}
                                                                    popupSettings={{ popupClass: 'dp-tier-dropdown-popup' }}
                                                                    style={{ width: '100%', opacity: 1 }}
                                                                />
                                                                {/* 글씨는 화살표 영역을 뺀 나머지 공간의 가운데 (첫 행은 화살표 없음 → 박스 전체 가운데) */}
                                                                <span style={{ position: 'absolute', left: isSub ? '22px' : 0, right: groupIdx === 0 ? '10px' : '32px', top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', fontSize: isSub ? '12px' : '13px', fontWeight: isSub ? 500 : 600, color: isSub ? '#475569' : 'var(--srt-primary-800)' }}>
                                                                    {isSub ? '중분류' : '대분류'}
                                                                </span>
                                                                {groupIdx !== 0 && (
                                                                    <span style={{ position: 'absolute', right: '11px', top: '3px', bottom: '3px', width: '22px', borderLeft: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                                                        <ChevronDown size={14} color={isSub ? '#94A3B8' : 'var(--srt-primary-500)'} />
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ width: '190px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                                                                <input
                                                                    type="text"
                                                                    value={group.label}
                                                                    onChange={(e) => handleUpdateGroupRow(item.id, groupIdx, 'label', e.target.value)}
                                                                    style={{ width: '100%', minWidth: 0, padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', fontWeight: isSub ? 400 : 600, outline: 'none', boxSizing: 'border-box' }}
                                                                    placeholder={isSub ? '예: 휴대폰' : '예: 브랜드 A'}
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
                                                                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                                                                    placeholder="예: 1,3 / 1 to 5, 9"
                                                                />
                                                            </div>

                                                            <div style={{ width: '130px', paddingLeft: '10px' }}>
                                                                <input
                                                                    type="text"
                                                                    className="dp-bottom-val-input"
                                                                    value={group.bottom_values || ''}
                                                                    onChange={(e) => handleUpdateGroupRow(item.id, groupIdx, 'bottom_values', e.target.value)}
                                                                    onBlur={(e) => {
                                                                        let val = e.target.value.trim();
                                                                        val = val.replace(/,+/g, ',').replace(/^,|,$/g, '');
                                                                        handleUpdateGroupRow(item.id, groupIdx, 'bottom_values', val);
                                                                    }}
                                                                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                                                                    placeholder="예: 98, 99"
                                                                    title="그룹 안 상세 코드 중 맨 아래에 고정할 코드 (기타 · 모름 등)"
                                                                />
                                                            </div>

                                                            <div style={{ flex: 1, paddingLeft: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                {(() => {
                                                                    const valTokens = tokenizeGroupValues(group.values);
                                                                    const bottomTokens = tokenizeGroupValues(group.bottom_values || '');
                                                                    const extra = bottomTokens.filter(b => !valTokens.includes(b));
                                                                    return [...valTokens, ...extra].map((tok, tIdx) => {
                                                                        const pinned = bottomTokens.includes(tok);
                                                                        return (
                                                                            <span key={tIdx} title={pinned ? '하단 고정 코드' : undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 10px', borderRadius: '999px', border: `1px solid ${pinned ? '#CBD5E1' : colorObj.border}`, background: pinned ? '#F1F5F9' : colorObj.bg, color: pinned ? '#475569' : colorObj.text, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                                {pinned && <Pin size={10} color="#64748B" style={{ transform: 'rotate(45deg)' }} />}
                                                                                {tok}
                                                                            </span>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>

                                                            <div style={{ width: '64px', display: 'flex', justifyContent: 'center' }}>
                                                                {(item.groups || []).length > 1 && (
                                                                <button
                                                                    onClick={() => handleDeleteGroupRow(item.id, groupIdx)}
                                                                    title="그룹 삭제"
                                                                    style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                </div>

                                                {/* 전체 값 칩 영역 (임시 주석) */}
                                                {/* <GroupTotalChipsSection groups={item.groups} totalCount={totalChips.length} /> */}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}


                    {/* --- 3. 다중형 순위 탭 --- */}
                    {activeTab === 'rank' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                            {rankData.length === 0 ? (
                                <div style={{ flex: 1, textAlign: 'center', color: '#94A3B8', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Info size={24} />
                                    <span style={{ fontSize: '13px', color: '#94A3B8' }}>등록된 순위 프리셋이 없습니다.</span>
                                    <button
                                        onClick={handleAddRankPreset}
                                        style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', border: '1px solid var(--srt-primary-600)', borderRadius: '6px', background: 'var(--srt-primary-50)', color: 'var(--srt-primary-600)', cursor: 'pointer' }}
                                    >
                                        <Plus size={14} /><span style={{ fontSize: '13px', fontWeight: 600 }}>순위 프리셋 추가</span>
                                    </button>
                                </div>
                            ) : rankData.map((item) => {
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

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                    <Info size={14} color="#64748B" /><span style={{ fontSize: '12px', color: '#64748B' }}>소스 변수 max_rank = {maxVal} 가정. 비연속 조합(예: 1+3)도 칩 토글로 선언 가능합니다.</span>
                                                </div>

                                                <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', background: '#FFFFFF' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', height: '32px', padding: '0 12px', background: 'var(--srt-primary-50)', borderBottom: '1px solid var(--srt-primary-200)' }}>
                                                    <div style={{ width: '48px', textAlign: 'center' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>추가</span></div>
                                                    <div style={{ width: '200px' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>라벨</span><span style={{ fontSize: '11px', color: '#64748B', marginLeft: '4px' }}>(비우면 자동 생성)</span></div>
                                                    <div style={{ flex: 1, paddingLeft: '10px' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>순위 선택</span></div>
                                                    <div style={{ width: '48px', textAlign: 'center' }}><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--srt-primary-800)' }}>삭제</span></div>
                                                </div>

                                                {(item.combinations || []).map((combo, comboIdx) => {
                                                    return (
                                                        <div key={comboIdx} style={{ display: 'flex', alignItems: 'center', minHeight: '40px', padding: '6px 12px', borderBottom: '1px solid #F1F5F9', boxSizing: 'border-box' }}>
                                                            <div style={{ width: '48px', display: 'flex', justifyContent: 'center' }}>
                                                                <button
                                                                    onClick={() => handleAddRankCombo(item.id, comboIdx)}
                                                                    title="아래에 조합 추가"
                                                                    style={{ border: 'none', background: 'transparent', color: 'var(--srt-primary-600)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--srt-primary-700)'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--srt-primary-600)'}
                                                                >
                                                                    <Plus size={16} />
                                                                </button>
                                                            </div>
                                                            <div style={{ width: '200px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={combo.label}
                                                                    onChange={(e) => handleUpdateRankCombo(item.id, comboIdx, 'label', e.target.value)}
                                                                    style={{ width: '185px', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', outline: 'none' }}
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
                                                                                borderColor: isActive ? 'var(--srt-primary-400)' : '#CBD5E1',
                                                                                background: isActive ? 'var(--srt-primary-200)' : '#FFFFFF',
                                                                                color: isActive ? 'var(--srt-primary-900)' : '#64748B',
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

                                                            <div style={{ width: '48px', display: 'flex', justifyContent: 'center' }}>
                                                                {(item.combinations || []).length > 1 && (
                                                                <button
                                                                    onClick={() => handleDeleteRankCombo(item.id, comboIdx)}
                                                                    title="조합 삭제"
                                                                    style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {(item.combinations || []).length === 0 && (
                                                    <button
                                                        onClick={() => handleAddRankCombo(item.id)}
                                                        style={{ width: '100%', height: '36px', border: 'none', background: '#FFFFFF', color: 'var(--srt-primary-600)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                                    >
                                                        <Plus size={14} /><span style={{ fontSize: '13px', fontWeight: 600 }}>조합 추가</span>
                                                    </button>
                                                )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                        </div>
                    )}

                </div>
            </div>

            <AiAutoGroupModal
                isOpen={aiGroupOpen}
                onClose={() => setAiGroupOpen(false)}
                onCreateNew={handleAiCreatePreset}
                onOverwrite={handleAiOverwritePreset}
                overwriteTargetName={groupData.find(g => g.id === expandedGroupId)?.name || ''}
                initialGenCrosstab={!!groupData.find(g => g.id === expandedGroupId)?.generate_group_crosstab}
                onGenCrosstabChange={(val) => {
                    if (expandedGroupId) {
                        handleUpdateGroupPresetField(expandedGroupId, 'generate_group_crosstab', val);
                    }
                }}
                defaultPresetName="새 그룹 설정"
            />
        </div>
    );
};

export default AnalysisSettingTab;
