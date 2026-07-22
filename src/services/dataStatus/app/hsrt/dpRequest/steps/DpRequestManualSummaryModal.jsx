import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { modalContext } from "@/components/common/Modal.jsx";

// Helper functions outside component
const getBandValueCount = (valStr) => {
    if (!valStr) return 0;
    return valStr.split(',').map(s => s.trim()).filter(s => s !== '' && !isNaN(Number(s))).length;
};

const computeBandLabel = (labelOrType, maxNVal) => {
    const lower = (labelOrType || '').toLowerCase();
    let type = 'Top';
    if (lower.includes('mid')) type = 'Mid';
    else if (lower.includes('bot')) type = 'Bot';
    const suffix = maxNVal > 1 ? String(maxNVal) : '';
    return `${type}${suffix}`;
};

const DpRequestManualSummaryModal = ({
    mode,
    editingFolder,
    selectedIds,
    currentTab,
    scalePresets,
    summaries,
    summaryVariables,
    onClose,
    onConfirm
}) => {
    const modal = useContext(modalContext);

    // Local States
    const [scaleMin, setScaleMin] = useState(1);
    const [scaleMax, setScaleMax] = useState(5);
    const [presetId, setPresetId] = useState('custom');
    const [isReverse, setIsReverse] = useState(false);
    const [bands, setBands] = useState([
        { id: 'b1', label: 'Bot2', values: '1,2' },
        { id: 'b2', label: 'Mid', values: '3' },
        { id: 'b3', label: 'Top2', values: '4,5' }
    ]);
    const [isMeanIncluded, setIsMeanIncluded] = useState(false);
    const [openStats, setOpenStats] = useState({ mean: true, sd: false, median: false, mode: false });

    const setDefaultBandsForScale = (sp) => {
        if (sp === 5) {
            setBands([
                { id: 'b1', label: 'Bot2', values: '1,2' },
                { id: 'b2', label: 'Mid', values: '3' },
                { id: 'b3', label: 'Top2', values: '4,5' }
            ]);
        } else if (sp === 7) {
            setBands([
                { id: 'b1', label: 'Bot3', values: '1,2,3' },
                { id: 'b2', label: 'Mid', values: '4' },
                { id: 'b3', label: 'Top3', values: '5,6,7' }
            ]);
        } else {
            const center = Math.ceil(sp / 2);
            const botVals = Array.from({ length: center - 1 }, (_, i) => i + 1).join(',');
            const topVals = Array.from({ length: sp - center }, (_, i) => center + 1 + i).join(',');
            setBands([
                { id: 'b1', label: 'Bot', values: botVals },
                { id: 'b2', label: 'Mid', values: `${center}` },
                { id: 'b3', label: 'Top', values: topVals }
            ]);
        }
    };

    // Initialize States on Mount/Change
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        if (mode === 'edit' && editingFolder) {
            const isStatistics = editingFolder.type === 'statistics';
            if (isStatistics) {
                const summaryData = summaries.find(s => s.id === editingFolder.id);
                if (summaryData && Array.isArray(summaryData.info) && summaryData.info[0]) {
                    const statItem = summaryData.info[0];
                    setOpenStats({
                        mean: !!statItem.mean,
                        sd: !!statItem.sd,
                        median: !!statItem.median,
                        mode: !!statItem.mode
                    });
                } else {
                    setOpenStats({
                        mean: !!editingFolder.mean,
                        sd: !!editingFolder.sd,
                        median: !!editingFolder.median,
                        mode: !!editingFolder.mode
                    });
                }
            } else {
                // frequency folder
                const firstItemId = editingFolder.items && editingFolder.items[0];
                const summaryData = summaries.find(s => s.id === editingFolder.id) || summaries.find(s => s.id === firstItemId);
                if (summaryData && Array.isArray(summaryData.info)) {
                    const freqItems = summaryData.info.filter(item => {
                        const isMean = (item.type === 'statistics' && item.mean) ||
                            item.type === 'mean' ||
                            item.mean === true ||
                            item.tag === 'mean' ||
                            item.value_id === 'mean';
                        return !isMean;
                    });

                    const restoredBands = freqItems.map((item, idx) => {
                        let rawLabel = item.tag || item.label || item.name || item.value_id || 'Top';
                        if (rawLabel) {
                            const lower = rawLabel.toLowerCase();
                            if (lower.startsWith('top')) {
                                rawLabel = 'Top' + rawLabel.slice(3);
                            } else if (lower.startsWith('bot')) {
                                rawLabel = 'Bot' + rawLabel.slice(3);
                            } else if (lower.startsWith('mid')) {
                                rawLabel = 'Mid' + rawLabel.slice(3);
                            }
                        }
                        const rawValues = item.include_codes || item.values || '';
                        return {
                            id: `band_edit_${idx}_${Date.now()}`,
                            label: rawLabel,
                            values: rawValues
                        };
                    });

                    const hasMean = summaryData.info.some(item =>
                        (item.type === 'statistics' && item.mean) ||
                        item.type === 'mean' ||
                        item.mean === true ||
                        item.tag === 'mean' ||
                        item.value_id === 'mean'
                    );

                    setScaleMax(editingFolder.scale_points || 5);
                    setScaleMin(1);
                    setPresetId(editingFolder.scale_preset_id || 'custom');
                    setBands(restoredBands);
                    setIsMeanIncluded(hasMean);
                    setIsReverse(editingFolder.reverse === true);
                }
            }
        } else if (mode === 'create') {
            let maxSp = 0;
            selectedIds.forEach(id => {
                const v = summaryVariables.find(item => item.id === id);
                if (v && v.scale_points) {
                    maxSp = Math.max(maxSp, v.scale_points);
                }
            });
            if (maxSp === 0) maxSp = 5;

            setScaleMax(maxSp);
            setScaleMin(1);

            if (currentTab === 'open-num') {
                setOpenStats({ mean: true, sd: false, median: false, mode: false });
                return;
            }

            const matchedPreset = scalePresets.find(p => (p.options?.max || p.max) === maxSp);
            if (matchedPreset) {
                setPresetId(matchedPreset.id);
                const opts = matchedPreset.options || {};
                setIsReverse(!!opts.reverse);
                let loadedBands = [];
                if (Array.isArray(opts.bands)) {
                    loadedBands = opts.bands.map((b, idx) => ({
                        id: b.id || `band_${idx}_${Date.now()}`,
                        label: b.label || 'Top',
                        values: Array.isArray(b.values) ? b.values.join(',') : ''
                    }));
                } else if (Array.isArray(matchedPreset.bands)) {
                    loadedBands = matchedPreset.bands.map((b, idx) => ({
                        id: b.id || `band_${idx}_${Date.now()}`,
                        label: b.label || 'Top',
                        values: String(b.values)
                    }));
                }
                if (loadedBands.length > 0) {
                    setBands(loadedBands);
                } else {
                    setDefaultBandsForScale(maxSp);
                }
            } else {
                setPresetId('custom');
                setDefaultBandsForScale(maxSp);
            }
        }
    }, [mode, editingFolder, selectedIds, currentTab, summaries, scalePresets, summaryVariables]);

    // Handlers
    const toggleOpenStat = (key) => {
        setOpenStats(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleToggleCircle = (bandId, num) => {
        setBands(prev => {
            const updatedBands = prev.map(band => {
                if (band.id !== bandId) return band;

                let currentVals = band.values.split(',')
                    .map(s => s.trim())
                    .filter(s => s !== '')
                    .map(Number)
                    .filter(n => !isNaN(n));

                if (currentVals.includes(num)) {
                    currentVals = currentVals.filter(v => v !== num);
                } else {
                    currentVals = [...currentVals, num].sort((a, b) => a - b);
                }

                return {
                    ...band,
                    values: currentVals.join(',')
                };
            });

            return updatedBands.map(b => ({
                ...b,
                label: computeBandLabel(b.label, getBandValueCount(b.values))
            }));
        });
    };

    const handleAddManualBand = () => {
        setBands(prev => [
            ...prev,
            { id: `band_${Date.now()}_${Math.random()}`, label: 'Top', values: '' }
        ]);
    };

    const handleRemoveManualBand = (bandId) => {
        setBands(prev => prev.filter(b => b.id !== bandId));
    };

    const handleManualPresetChange = (presetIdVal) => {
        setPresetId(presetIdVal);
        if (presetIdVal === 'custom') return;

        const preset = scalePresets.find(p => p.id === presetIdVal);
        if (preset) {
            const opts = preset.options || {};
            setScaleMin(opts.min ?? 1);
            setScaleMax(opts.max ?? 5);
            setIsReverse(!!opts.reverse);

            let loadedBands = [];
            if (Array.isArray(opts.bands)) {
                loadedBands = opts.bands.map((b, idx) => ({
                    id: b.id || `band_${idx}_${Date.now()}`,
                    label: b.label || 'Top',
                    values: Array.isArray(b.values) ? b.values.join(',') : ''
                }));
            } else if (Array.isArray(preset.bands)) {
                loadedBands = preset.bands.map((b, idx) => ({
                    id: b.id || `band_${idx}_${Date.now()}`,
                    label: b.label || 'Top',
                    values: String(b.values)
                }));
            }
            setBands(loadedBands);
        }
    };
    const handleConfirm = () => {
        if (currentTab === 'scale') {
            if (bands.length === 0 && !isMeanIncluded) {
                modal.showAlert('알림', '최소 하나 이상의 밴드(Top/Bot/Mid) 또는 평균 요약표를 포함해야 합니다.');
                return;
            }
            for (let i = 0; i < bands.length; i++) {
                const band = bands[i];
                if (getBandValueCount(band.values) === 0) {
modal.showAlert('알림', `'${band.label}' 밴드에 지정된 값이 없습니다. 값을 기입하거나 삭제해 주세요.`);
                    return;
                }
            }
        } else {
            const hasAnyStats = openStats.mean || openStats.sd || openStats.median || openStats.mode;
            if (!hasAnyStats) {
                modal.showAlert('알림', '최소 하나 이상의 통계 옵션(평균/표준편차/중앙값/최빈값)을 선택해 주세요.');
                return;
            }
        }

        onConfirm({
            scaleMax,
            presetId,
            isReverse,
            bands,
            isMeanIncluded,
            openStats
        });
    };

    return (
        <div onClick={(e) => e.stopPropagation()} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <div style={{
                backgroundColor: '#ffffff', borderRadius: '16px', width: '700px',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', overflow: 'hidden',
                border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
                {/* 팝업 헤더 */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 28px', borderBottom: '1px solid #e2e8f0', background: '#ffffff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '4px', height: '18px', background: '#3b82f6', borderRadius: '2px' }}></div>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                            {mode === 'edit' ? '요약 설정 수정' : `요약 설정 생성 (${selectedIds.length}개 문항 선택됨)`}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94a3b8', transition: 'color 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#475569'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 모달 콘텐츠 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
                    {currentTab === 'scale' ? (
                        <>
                            {/* 1. 프리셋 및 기본 정보 */}
                            <div style={{
                                display: 'none', gridTemplateColumns: '1.2fr 0.8fr 0.8fr', gap: '12px',
                                alignItems: 'center', background: '#f8fafc', padding: '14px 18px', borderRadius: '6px', border: '1px solid #e2e8f0'
                            }}>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>요약 프리셋 선택</div>
                                    <select
                                        value={presetId}
                                        onChange={(e) => handleManualPresetChange(e.target.value)}
                                        style={{ width: '100%', height: '32px', fontSize: '12.5px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', padding: '0 8px' }}
                                    >
                                        <option value="custom">직접 설정 (Custom)</option>
                                        {scalePresets.map(preset => (
                                            <option key={preset.id} value={preset.id}>{preset.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>점수 범위 (최댓값)</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                            type="number"
                                            value={scaleMin}
                                            disabled
                                            style={{ width: '40px', height: '32px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f1f5f9', textAlign: 'center' }}
                                        />
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>~</span>
                                        <input
                                            type="number"
                                            value={scaleMax}
                                            onChange={(e) => {
                                                const val = Math.max(2, Number(e.target.value) || 2);
                                                setScaleMax(val);
                                                setPresetId('custom');
                                            }}
                                            style={{ width: '50px', height: '32px', fontSize: '12.5px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '16px', boxSizing: 'border-box' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12.5px', color: '#334155', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={isReverse}
                                            onChange={(e) => {
                                                setIsReverse(e.target.checked);
                                                setPresetId('custom');
                                            }}
                                            style={{ cursor: 'pointer', width: '13px', height: '13px', marginRight: '6px', appearance: 'checkbox', WebkitAppearance: 'checkbox', opacity: 1, display: 'inline-block', position: 'relative' }}
                                        />
                                        <span style={{ fontWeight: 600 }}>역코딩 (역채점)</span>
                                    </label>
                                </div>
                            </div>

                            {/* 2. 밴딩 설정 목록 */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>표시 종류 및 포함 코드</span>
                                    <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>* 번호를 직접 클릭하면 켜거나 끌 수 있습니다.</div>
                                </div>

                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {bands.map((band) => (
                                        <div key={band.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                                            {/* 종류 매핑용 드롭다운 */}
                                            {(() => {
                                                const nVal = getBandValueCount(band.values);
                                                const suffix = nVal > 1 ? String(nVal) : '';
                                                const dropdownData = [
                                                    { text: `Top${suffix}`, value: "top" },
                                                    { text: `Mid${suffix}`, value: "mid" },
                                                    { text: `Bot${suffix}`, value: "bot" }
                                                ];

                                                return (
                                                    <DropDownList
                                                        data={dropdownData}
                                                        textField="text"
                                                        dataItemKey="value"
                                                        value={{
                                                            text: computeBandLabel(band.label, nVal),
                                                            value: band.label.toLowerCase().includes('top') ? 'top' : band.label.toLowerCase().includes('mid') ? 'mid' : 'bot'
                                                        }}
                                                        onChange={(e) => {
                                                            const type = e.value.value;
                                                            setBands(prev => prev.map(b => b.id === band.id ? {
                                                                ...b,
                                                                label: computeBandLabel(type, getBandValueCount(b.values))
                                                            } : b));
                                                            setPresetId('custom');
                                                        }}
                                                        style={{ width: '115px', height: '28px', fontSize: '11.5px' }}
                                                    />
                                                );
                                            })()}

                                            {/* N 개수 표시 */}
                                            <div style={{ width: '38px', textAlign: 'center', fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>
                                                N={getBandValueCount(band.values)}
                                            </div>

                                            {/* 값 텍스트 */}
                                            <input
                                                type="text"
                                                value={band.values}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setBands(prev => {
                                                        const updatedBands = prev.map(b => b.id === band.id ? { ...b, values: val } : b);
                                                        return updatedBands.map(b => ({
                                                            ...b,
                                                            label: computeBandLabel(b.label, getBandValueCount(b.values))
                                                        }));
                                                    });
                                                    setPresetId('custom');
                                                }}
                                                placeholder="값 (쉼표 구분)"
                                                style={{ flex: 1, minWidth: 0, height: '28px', fontSize: '11.5px', padding: '0 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                            />

                                            {/* 서클 토글 미리보기 */}
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0 4px' }}>
                                                {Array.from({ length: scaleMax - scaleMin + 1 }, (_, idx) => {
                                                    const num = scaleMin + idx;
                                                    const currentVals = band.values.split(',').map(s => s.trim()).filter(s => s !== '').map(Number);
                                                    const isSelected = currentVals.includes(num);

                                                    const labelLower = (band.label || '').toLowerCase();
                                                    let circleBg = '#ffffff';
                                                    let circleBorder = '1px solid #cbd5e1';
                                                    let circleColor = '#94a3b8';

                                                    if (isSelected) {
                                                        if (labelLower.includes('top')) {
                                                            circleBg = '#e0f2fe';
                                                            circleBorder = '1px solid #3b82f6';
                                                            circleColor = '#2563eb';
                                                        } else if (labelLower.includes('bot')) {
                                                            circleBg = '#ffe4e6';
                                                            circleBorder = '1px solid #f43f5e';
                                                            circleColor = '#ef4444';
                                                        } else {
                                                            circleBg = '#fef3c7';
                                                            circleBorder = '1px solid #f59e0b';
                                                            circleColor = '#d97706';
                                                        }
                                                    }

                                                    return (
                                                        <button
                                                            key={num}
                                                            type="button"
                                                            onClick={() => {
                                                                handleToggleCircle(band.id, num);
                                                                setPresetId('custom');
                                                            }}
                                                            style={{
                                                                width: '24px', height: '24px', borderRadius: '50%',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.1s',
                                                                background: circleBg, border: circleBorder, color: circleColor
                                                            }}
                                                        >
                                                            {num}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* 삭제 버튼 */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleRemoveManualBand(band.id);
                                                    setPresetId('custom');
                                                }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                        {/* 밴드 추가 버튼 */}
                                        <button
                                            type="button"
                                            onClick={handleAddManualBand}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '3px', background: '#ffffff',
                                                color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px',
                                                padding: '3px 8px', fontSize: '10.5px', fontWeight: 600, cursor: 'pointer',
                                                width: 'fit-content', transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                                        >
                                            <Plus size={11} />
                                            <span>밴드 추가</span>
                                        </button>

                                        {/* 평균 요약표 자동 포함 */}
                                        <label
                                            onClick={() => setIsMeanIncluded(!isMeanIncluded)}
                                            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '11px', color: '#475569', userSelect: 'none', margin: 0 }}
                                        >
                                            <div
                                                style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '4px',
                                                    border: isMeanIncluded ? '1.5px solid #3b82f6' : '1.5px solid #cbd5e1',
                                                    background: '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginRight: '6px',
                                                    transition: 'all 0.15s',
                                                    boxSizing: 'border-box'
                                                }}
                                            >
                                                {isMeanIncluded && <Check size={10} strokeWidth={3.5} style={{ color: '#3b82f6' }} />}
                                            </div>
                                            <span style={{ fontWeight: 600 }}>평균 요약표 자동 포함</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* 오픈형(통계) 설정 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>통계 설정 선택</div>
                                <div style={{ display: 'flex', gap: '24px', padding: '16px 20px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc' }}>
                                    {[
                                        { key: 'mean', label: '평균 (Mean)' },
                                        { key: 'sd', label: '표준편차 (SD)' },
                                        { key: 'median', label: '중앙값 (Median)' },
                                        { key: 'mode', label: '최빈값 (Mode)' }
                                    ].map(stat => (
                                        <label
                                            key={stat.key}
                                            className="dp-checkbox-label"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', margin: 0 }}
                                        >
                                            <input
                                                type="checkbox"
                                                className="dp-checkbox-input"
                                                checked={openStats[stat.key]}
                                                onChange={() => toggleOpenStat(stat.key)}
                                            />
                                            <span className="dp-checkbox-box" />
                                            <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 700 }}>{stat.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 팝업 푸터 */}
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: '8px',
                    padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '7px 16px', fontSize: '12.5px', borderRadius: '4px', border: '1px solid #cbd5e1',
                            background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        style={{
                            padding: '7px 20px', fontSize: '12.5px', borderRadius: '4px', border: 'none',
                            background: '#2563eb', color: '#ffffff',
                            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                    >
                        <span>{mode === 'edit' ? '저장하기' : '요약표 생성하기'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DpRequestManualSummaryModal;
