import React, { useState, useRef, useEffect } from 'react';
import { Layout, Type, Palette, Eye } from 'lucide-react';

const ColorInput = React.memo(({ value, onChange, width = '105px', textWidth = '65px', padding = '3px 6px', gap = '6px' }) => {
    const [localValue, setLocalValue] = useState(value || '');

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    const handleTextChange = (e) => {
        setLocalValue(e.target.value.toUpperCase());
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== value) {
                let formatted = localValue.trim();
                if (formatted && !formatted.startsWith('#')) {
                    formatted = '#' + formatted;
                }
                const isValidHex = /^#([A-FA-f0-9]{3}){1,2}$/.test(formatted);
                if (isValidHex) {
                    onChange(formatted);
                } else if (formatted === '') {
                    onChange('');
                }
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [localValue, value, onChange]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: gap, padding: padding, border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff', width: width, boxSizing: 'border-box', height: '28px', flexShrink: 0 }}>
            <input
                type="color"
                value={(/^#([A-FA-f0-9]{3}){1,2}$/.test(localValue) ? localValue : '#FFFFFF').slice(0, 7)}
                onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setLocalValue(val);
                    onChange(val);
                }}
                style={{ width: '16px', height: '16px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px', flexShrink: 0 }}
            />
            <input
                type="text"
                value={localValue}
                onChange={handleTextChange}
                placeholder="#FFFFFF"
                style={{
                    width: textWidth,
                    height: '20px',
                    fontSize: '11px',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'monospace',
                    padding: 0
                }}
            />
        </div>
    );
});

const LineStylePicker = ({ value, onChange, color, direction = 'down', width = '60px', padding = '0 8px' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = ['solid', 'dashed', 'dotted', 'double', 'none'];
    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{ width: width, height: '24px', padding: padding, border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}
                title="선 종류"
            >
                {value === 'none' ? (
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>없음</span>
                ) : (
                    <div style={{ width: '100%', borderTopStyle: value, borderTopWidth: value === 'double' ? '3px' : '2px', borderTopColor: color || '#475569' }} />
                )}
            </div>
            {isOpen && (
                <div style={{ position: 'absolute', [direction === 'up' ? 'bottom' : 'top']: '100%', left: '-10px', zIndex: 50, background: '#fff', border: '1px solid #CBD5E1', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '80px', [direction === 'up' ? 'marginBottom' : 'marginTop']: '4px', padding: '4px 0' }}>
                    {options.map(opt => (
                        <div
                            key={opt}
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: value === opt ? '#F1F5F9' : '#fff' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={(e) => e.currentTarget.style.background = value === opt ? '#F1F5F9' : '#fff'}
                        >
                            {opt === 'none' ? (
                                <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>없음</span>
                            ) : (
                                <div style={{ width: '100%', borderTopStyle: opt, borderTopWidth: opt === 'double' ? '3px' : '2px', borderTopColor: color || '#475569' }} />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const borderNames = {
    theme_table_outer_top: '표 상단 외곽선',
    theme_table_outer_bottom: '표 하단 외곽선',
    theme_table_outer_left: '표 좌측 외곽선',
    theme_table_outer_right: '표 우측 외곽선',
    theme_header_divider: '헤더 하단선',
    theme_stub_divider: '스터브 구분선',
    theme_section_separator: '섹션 구분선',
    theme_grid: '데이터 기본선',
    theme_stub_tier_divider: '스터브 계층선',
    theme_header_tier_divider: '헤더 단 구분선',
    theme_banner_divider: '배너 그룹 구분선'
};

const TableSettingTab = ({ settings, setSettings, onUnsavedChange }) => {
    const [selectedBorder, setSelectedBorder] = useState('theme_table_outer_top');
    const [hoveredBorder, setHoveredBorder] = useState(null);

    const renderBorderHandle = (borderType, position) => {
        const isSelected = selectedBorder === borderType;
        const isHighlighted = hoveredBorder === borderType;
        const isHorizontal = position === 'top' || position === 'bottom';

        const style = {
            position: 'absolute',
            zIndex: 20,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxSizing: 'border-box',
            backgroundColor: isSelected
                ? 'rgba(245, 158, 11, 0.35)'
                : 'transparent',
            border: '1px solid transparent',
            borderColor: isSelected
                ? '#F59E0B'
                : 'transparent',
            outline: 'none',
            ...(isHorizontal ? {
                left: 0,
                right: 0,
                height: '10px',
                [position]: '-5px',
            } : {
                top: 0,
                bottom: 0,
                width: '10px',
                [position]: '-5px',
            })
        };

        return (
            <div
                style={style}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBorder(borderType);
                }}
                onMouseEnter={() => setHoveredBorder(borderType)}
                onMouseLeave={() => setHoveredBorder(null)}
                title={`${borderNames[borderType] || ''} 클릭하여 편집`}
            />
        );
    };

    const handleChange = (path, value) => {
        const keys = path.split('.');
        const newSettings = { ...settings };
        let current = newSettings;
        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = { ...current[keys[i]] };
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        setSettings(newSettings);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    const toggleDisplay = (field) => {
        handleChange(`display.${field}`, !settings.display[field]);
    };

    const formatN = (val) => {
        if (val === null || val === undefined) return '';
        const digits = settings.display?.n_digits ?? 0;
        return Number(val).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    };

    const formatPct = (val) => {
        if (val === null || val === undefined) return '';
        const digits = settings.display?.percent_digits ?? 1;
        return Number(val).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }) + '%';
    };

    const formatMean = (val) => {
        if (val === null || val === undefined || val === '-') return '-';
        const digits = settings.display?.mean_digits ?? 2;
        return Number(val).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    };

    const previewCols = [
        { label: '남성 X 20~29세', subLabel: 'banner_02', base: 100, v1: 58, p1: 58.0, v2: 42, p2: 42.0, v3: 0, p3: 0.0, tV: 44, tP: 44.0, mean: 3.42 },
        { label: '남성 X 30~39세', subLabel: 'banner_02', base: 680, v1: 356, p1: 52.4, v2: 324, p2: 47.6, v3: 0, p3: 0.0, tV: 301, tP: 44.3, mean: 3.37 },
        { label: '여성 X 20~29세', subLabel: 'banner_02', base: 36, v1: 0, p1: 0.0, v2: 36, p2: 100.0, v3: 0, p3: 0.0, tV: 14, tP: 38.9, mean: 3.11 },
        { label: '서울', subLabel: 'banner_02', base: 977, v1: 503, p1: 51.5, v2: 474, p2: 48.5, v3: 0, p3: 0.0, tV: 460, tP: 47.1, mean: 3.44 },
        { label: '부산', subLabel: 'banner_02', base: 181, v1: 94, p1: 51.9, v2: 87, p2: 48.1, v3: 0, p3: 0.0, tV: 87, tP: 48.1, mean: 3.39 },
        { label: '빈 열 예시', subLabel: '숨김 대상', base: 0, v1: 0, p1: 0.0, v2: 0, p2: 0.0, v3: 0, p3: 0.0, tV: 0, tP: 0.0, mean: '-' }
    ].filter(col => !settings.display?.hide_zero_base_columns || col.base > 0);

    const showN = settings.display?.show_n ?? true;
    const showPct = settings.display?.show_percent ?? true;

    return (
        <div className="dp-setting-section" style={{
            padding: '20px 24px',
            background: '#F1F5F9',
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box',
            width: '100%',
            maxWidth: '100%',
            overflowX: 'hidden'
        }}>
            <style>{`
                @keyframes borderSelectedPulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
            `}</style>

            {/* 1.5 빠른 프리셋 */}
            <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Palette size={16} color="#475569" /> 빠른 테마 프리셋
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Light</span>
                        {[
                            { label: '블루 (기본)', bg: '#2F5597', fg: '#FFFFFF', colors: { theme_primary: "#2F5597", theme_primary_fg: "#FFFFFF", theme_stub_header_bg: "#D9E1F2", theme_stub_header_fg: "#000000", theme_bg: "#FFFFFF", theme_stripe: "#F5F7FB", theme_text: "#000000", theme_text_muted: "#64748B", theme_grid_color: "#E2E8F0", theme_stub_divider_color: "#CBD5E1", theme_header_divider_color: "#172554", theme_section_separator_color: "#94A3B8", theme_table_outer_top_color: "#CBD5E1", theme_table_outer_bottom_color: "#CBD5E1", theme_table_outer_left_color: "#CBD5E1", theme_table_outer_right_color: "#CBD5E1", theme_grid_style: "solid", theme_stub_divider_style: "solid", theme_header_divider_style: "solid", theme_section_separator_style: "solid", theme_table_outer_top_style: "solid", theme_table_outer_bottom_style: "solid", theme_table_outer_left_style: "solid", theme_table_outer_right_style: "solid", theme_grid_width: "1px", theme_stub_divider_width: "1px", theme_header_divider_width: "1px", theme_section_separator_width: "1px", theme_table_outer_top_width: "1px", theme_table_outer_bottom_width: "1px", theme_table_outer_left_width: "1px", theme_table_outer_right_width: "1px" } },
                            { label: '플래티넘 실버', bg: '#FAFAFA', fg: '#18181B', border: '#E4E4E7', colors: { theme_primary: "#3F3F46", theme_primary_fg: "#FFFFFF", theme_stub_header_bg: "#E4E4E7", theme_stub_header_fg: "#18181B", theme_bg: "#FFFFFF", theme_stripe: "#F7F7F8", theme_text: "#18181B", theme_text_muted: "#A1A1AA", theme_grid_color: "#E4E4E7", theme_stub_divider_color: "#D4D4D8", theme_header_divider_color: "#18181B", theme_section_separator_color: "#A1A1AA", theme_table_outer_top_color: "#D4D4D8", theme_table_outer_bottom_color: "#D4D4D8", theme_table_outer_left_color: "#D4D4D8", theme_table_outer_right_color: "#D4D4D8", theme_grid_style: "solid", theme_stub_divider_style: "solid", theme_header_divider_style: "solid", theme_section_separator_style: "solid", theme_table_outer_top_style: "solid", theme_table_outer_bottom_style: "solid", theme_table_outer_left_style: "solid", theme_table_outer_right_style: "solid", theme_grid_width: "1px", theme_stub_divider_width: "1px", theme_header_divider_width: "1px", theme_section_separator_width: "1px", theme_table_outer_top_width: "1px", theme_table_outer_bottom_width: "1px", theme_table_outer_left_width: "1px", theme_table_outer_right_width: "1px" } },
                            { label: 'Teams (Light)', bg: '#6264A7', fg: '#FFFFFF', colors: { theme_primary: "#6264A7", theme_primary_fg: "#FFFFFF", theme_stub_header_bg: "#EBEBEB", theme_stub_header_fg: "#242424", theme_bg: "#FFFFFF", theme_stripe: "#FAFAFA", theme_text: "#242424", theme_text_muted: "#616161", theme_grid_color: "#EBEBEB", theme_stub_divider_color: "#E0E0E0", theme_header_divider_color: "#312E81", theme_section_separator_color: "#BDBDBD", theme_table_outer_top_color: "#E0E0E0", theme_table_outer_bottom_color: "#E0E0E0", theme_table_outer_left_color: "#E0E0E0", theme_table_outer_right_color: "#E0E0E0", theme_grid_style: "solid", theme_stub_divider_style: "solid", theme_header_divider_style: "solid", theme_section_separator_style: "solid", theme_table_outer_top_style: "solid", theme_table_outer_bottom_style: "solid", theme_table_outer_left_style: "solid", theme_table_outer_right_style: "solid", theme_grid_width: "1px", theme_stub_divider_width: "1px", theme_header_divider_width: "1px", theme_section_separator_width: "1px", theme_table_outer_top_width: "1px", theme_table_outer_bottom_width: "1px", theme_table_outer_left_width: "1px", theme_table_outer_right_width: "1px" } },
                            { label: '에메랄드 포레스트', bg: '#064E3B', fg: '#FFFFFF', colors: { theme_primary: "#064E3B", theme_primary_fg: "#FFFFFF", theme_stub_header_bg: "#D1FAE5", theme_stub_header_fg: "#1C1917", theme_bg: "#FFFFFF", theme_stripe: "#F5F5F4", theme_text: "#1C1917", theme_text_muted: "#78716C", theme_grid_color: "#D1FAE5", theme_stub_divider_color: "#A7F3D0", theme_header_divider_color: "#022C22", theme_section_separator_color: "#6EE7B7", theme_table_outer_top_color: "#A7F3D0", theme_table_outer_bottom_color: "#A7F3D0", theme_table_outer_left_color: "#A7F3D0", theme_table_outer_right_color: "#A7F3D0", theme_grid_style: "solid", theme_stub_divider_style: "solid", theme_header_divider_style: "solid", theme_section_separator_style: "solid", theme_table_outer_top_style: "solid", theme_table_outer_bottom_style: "solid", theme_table_outer_left_style: "solid", theme_table_outer_right_style: "solid", theme_grid_width: "1px", theme_stub_divider_width: "1px", theme_header_divider_width: "1px", theme_section_separator_width: "1px", theme_table_outer_top_width: "1px", theme_table_outer_bottom_width: "1px", theme_table_outer_left_width: "1px", theme_table_outer_right_width: "1px" } },
                            { label: '보르도 와인', bg: '#701A75', fg: '#FFFFFF', colors: { theme_primary: "#701A75", theme_primary_fg: "#FFFFFF", theme_stub_header_bg: "#FCE7F3", theme_stub_header_fg: "#18181B", theme_bg: "#FFFFFF", theme_stripe: "#F5F5F5", theme_text: "#18181B", theme_text_muted: "#71717A", theme_grid_color: "#FCE7F3", theme_stub_divider_color: "#FBCFE8", theme_header_divider_color: "#4A044E", theme_section_separator_color: "#F472B6", theme_table_outer_top_color: "#FBCFE8", theme_table_outer_bottom_color: "#FBCFE8", theme_table_outer_left_color: "#FBCFE8", theme_table_outer_right_color: "#FBCFE8", theme_grid_style: "solid", theme_stub_divider_style: "solid", theme_header_divider_style: "solid", theme_section_separator_style: "solid", theme_table_outer_top_style: "solid", theme_table_outer_bottom_style: "solid", theme_table_outer_left_style: "solid", theme_table_outer_right_style: "solid", theme_grid_width: "1px", theme_stub_divider_width: "1px", theme_header_divider_width: "1px", theme_section_separator_width: "1px", theme_table_outer_top_width: "1px", theme_table_outer_bottom_width: "1px", theme_table_outer_left_width: "1px", theme_table_outer_right_width: "1px" } },
                            { label: '미드나잇 네이비', bg: '#1E293B', fg: '#FFFFFF', colors: { theme_primary: "#1E293B", theme_primary_fg: "#FFFFFF", theme_stub_header_bg: "#E2E8F0", theme_stub_header_fg: "#0F172A", theme_bg: "#FFFFFF", theme_stripe: "#F4F4F5", theme_text: "#0F172A", theme_text_muted: "#64748B", theme_grid_color: "#E2E8F0", theme_stub_divider_color: "#CBD5E1", theme_header_divider_color: "#020617", theme_section_separator_color: "#94A3B8", theme_table_outer_top_color: "#CBD5E1", theme_table_outer_bottom_color: "#CBD5E1", theme_table_outer_left_color: "#CBD5E1", theme_table_outer_right_color: "#CBD5E1", theme_grid_style: "solid", theme_stub_divider_style: "solid", theme_header_divider_style: "solid", theme_section_separator_style: "solid", theme_table_outer_top_style: "solid", theme_table_outer_bottom_style: "solid", theme_table_outer_left_style: "solid", theme_table_outer_right_style: "solid", theme_grid_width: "1px", theme_stub_divider_width: "1px", theme_header_divider_width: "1px", theme_section_separator_width: "1px", theme_table_outer_top_width: "1px", theme_table_outer_bottom_width: "1px", theme_table_outer_left_width: "1px", theme_table_outer_right_width: "1px" } }
                        ].map(preset => (
                            <button
                                key={preset.label}
                                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', background: preset.bg, color: preset.fg, border: preset.border ? `1px solid ${preset.border}` : 'none', whiteSpace: 'nowrap' }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                onClick={() => {
                                    setSettings({ ...settings, render: { ...settings.render, ...preset.colors } });
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ width: '1px', height: '24px', background: '#E2E8F0', flexShrink: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Dark</span>
                        {[
                            { label: '슬레이트 다크', bg: '#0F172A', fg: '#F8FAFC', border: '#1E293B', colors: { theme_primary: "#3B82F6", theme_primary_fg: "#FFFFFF", theme_stub_header_bg: "#1E293B", theme_stub_header_fg: "#F8FAFC", theme_bg: "#0F172A", theme_stripe: "#172033", theme_text: "#F8FAFC", theme_text_muted: "#94A3B8", theme_grid_color: "#1E293B", theme_stub_divider_color: "#334155", theme_header_divider_color: "#60A5FA", theme_section_separator_color: "#475569", theme_table_outer_top_color: "#334155", theme_table_outer_bottom_color: "#334155", theme_table_outer_left_color: "#334155", theme_table_outer_right_color: "#334155", theme_grid_style: "solid", theme_stub_divider_style: "solid", theme_header_divider_style: "solid", theme_section_separator_style: "solid", theme_table_outer_top_style: "solid", theme_table_outer_bottom_style: "solid", theme_table_outer_left_style: "solid", theme_table_outer_right_style: "solid", theme_grid_width: "1px", theme_stub_divider_width: "1px", theme_header_divider_width: "1px", theme_section_separator_width: "1px", theme_table_outer_top_width: "1px", theme_table_outer_bottom_width: "1px", theme_table_outer_left_width: "1px", theme_table_outer_right_width: "1px" } },
                            { label: 'Discord (Dark)', bg: '#4752C4', fg: '#FFFFFF', colors: { theme_primary: "#4752C4", theme_primary_fg: "#FFFFFF", theme_stub_header_bg: "#4F545C", theme_stub_header_fg: "#DCDDDE", theme_bg: "#36393F", theme_stripe: "#32353B", theme_text: "#DCDDDE", theme_text_muted: "#B9BBBE", theme_grid_color: "#2F3136", theme_stub_divider_color: "#40444B", theme_header_divider_color: "#7289DA", theme_section_separator_color: "#4F545C", theme_table_outer_top_color: "#40444B", theme_table_outer_bottom_color: "#40444B", theme_table_outer_left_color: "#40444B", theme_table_outer_right_color: "#40444B", theme_grid_style: "solid", theme_stub_divider_style: "solid", theme_header_divider_style: "solid", theme_section_separator_style: "solid", theme_table_outer_top_style: "solid", theme_table_outer_bottom_style: "solid", theme_table_outer_left_style: "solid", theme_table_outer_right_style: "solid", theme_grid_width: "1px", theme_stub_divider_width: "1px", theme_header_divider_width: "1px", theme_section_separator_width: "1px", theme_table_outer_top_width: "1px", theme_table_outer_bottom_width: "1px", theme_table_outer_left_width: "1px", theme_table_outer_right_width: "1px" } },
                            { label: 'Webull (Dark)', bg: '#0082FB', fg: '#FFFFFF', colors: { theme_primary: "#0082FB", theme_primary_fg: "#FFFFFF", theme_stub_header_bg: "#21232B", theme_stub_header_fg: "#F0F2F5", theme_bg: "#0E0F14", theme_stripe: "#12141A", theme_text: "#F0F2F5", theme_text_muted: "#808593", theme_grid_color: "#161821", theme_stub_divider_color: "#2C2F3A", theme_header_divider_color: "#3399FF", theme_section_separator_color: "#21232B", theme_table_outer_top_color: "#2C2F3A", theme_table_outer_bottom_color: "#2C2F3A", theme_table_outer_left_color: "#2C2F3A", theme_table_outer_right_color: "#2C2F3A", theme_grid_style: "solid", theme_stub_divider_style: "solid", theme_header_divider_style: "solid", theme_section_separator_style: "solid", theme_table_outer_top_style: "solid", theme_table_outer_bottom_style: "solid", theme_table_outer_left_style: "solid", theme_table_outer_right_style: "solid", theme_grid_width: "1px", theme_stub_divider_width: "1px", theme_header_divider_width: "1px", theme_section_separator_width: "1px", theme_table_outer_top_width: "1px", theme_table_outer_bottom_width: "1px", theme_table_outer_left_width: "1px", theme_table_outer_right_width: "1px" } }
                        ].map(preset => (
                            <button
                                key={preset.label}
                                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', background: preset.bg, color: preset.fg, border: preset.border ? `1px solid ${preset.border}` : 'none', whiteSpace: 'nowrap' }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                onClick={() => {
                                    setSettings({ ...settings, render: { ...settings.render, ...preset.colors } });
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 1. 상단: 실시간 미리보기 (고정) */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F1F5F9', margin: '-20px -24px 0 -24px', padding: '20px 24px 10px 24px' }}>
                <div className="dp-setting-card" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <div className="dp-setting-card-header" style={{ padding: '10px 16px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', borderRadius: '8px 8px 0 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Eye size={16} /> 실시간 미리보기
                        </div>
                    </div>
                    <div className="dp-setting-card-body" style={{ padding: '16px', overflowX: 'auto', background: settings.render.theme_bg || '#FFFFFF', borderRadius: '0 0 8px 8px' }}>
                        {selectedBorder && (
                            <div
                                onMouseEnter={() => setHoveredBorder(selectedBorder)}
                                onMouseLeave={() => setHoveredBorder(null)}
                                style={{
                                    background: '#EFF6FF',
                                    border: '1px solid #3B82F6',
                                    borderRadius: '6px',
                                    padding: '10px 16px',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '16px',
                                    flexWrap: 'wrap'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1D4ED8', whiteSpace: 'nowrap' }}>
                                        선택된 선: {borderNames[selectedBorder]}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <ColorInput
                                            value={settings.render[`${selectedBorder}_color`] || ''}
                                            onChange={(val) => handleChange(`render.${selectedBorder}_color`, val)}
                                        />
                                        <LineStylePicker
                                            value={settings.render[`${selectedBorder}_style`] || 'solid'}
                                            onChange={(val) => {
                                                handleChange(`render.${selectedBorder}_style`, val);
                                                if (val === 'double') {
                                                    const curWidth = parseInt((settings.render[`${selectedBorder}_width`] || '0').replace('px', ''), 10);
                                                    if (!curWidth || curWidth < 3) {
                                                        handleChange(`render.${selectedBorder}_width`, '3px');
                                                    }
                                                }
                                            }}
                                            color={settings.render[`${selectedBorder}_color`] || '#000000'}
                                            direction="down"
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                type="number"
                                                min={settings.render[`${selectedBorder}_style`] === 'double' ? 3 : 0}
                                                max="10"
                                                value={(settings.render[`${selectedBorder}_width`] || '').replace('px', '')}
                                                placeholder={settings.render[`${selectedBorder}_style`] === 'double' ? '3' : '1'}
                                                onChange={(e) => {
                                                    const isDouble = settings.render[`${selectedBorder}_style`] === 'double';
                                                    let val = e.target.value ? Number(e.target.value) : '';
                                                    if (isDouble && val !== '' && val < 3) val = 3;
                                                    handleChange(`render.${selectedBorder}_width`, val !== '' ? `${val}px` : '');
                                                }}
                                                style={{ width: '50px', padding: '4px 6px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
                                                title="두께(숫자)"
                                            />
                                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>px</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedBorder(null)}
                                    style={{ border: 'none', background: 'transparent', color: '#1D4ED8', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    선택 해제
                                </button>
                            </div>
                        )}
                        <table style={{
                            width: '100%', borderCollapse: 'separate', borderSpacing: 0, margin: '0 0 8px 0',
                            fontFamily: settings.render.font_family || 'Arial',
                            fontSize: `${settings.render.font_size || 12}px`,
                            color: settings.render.theme_text || '#000000',
                            borderTop: `${settings.render.theme_table_outer_top_width || '0px'} ${settings.render.theme_table_outer_top_style || 'none'} ${settings.render.theme_table_outer_top_color || 'transparent'}`,
                            borderBottom: `${settings.render.theme_table_outer_bottom_width || '0px'} ${settings.render.theme_table_outer_bottom_style || 'none'} ${settings.render.theme_table_outer_bottom_color || 'transparent'}`,
                            borderLeft: `${settings.render.theme_table_outer_left_width || '0px'} ${settings.render.theme_table_outer_left_style || 'none'} ${settings.render.theme_table_outer_left_color || 'transparent'}`,
                            borderRight: `${settings.render.theme_table_outer_right_width || '0px'} ${settings.render.theme_table_outer_right_style || 'none'} ${settings.render.theme_table_outer_right_color || 'transparent'}`
                        }}>
                            <thead>
                                <tr style={{ background: settings.render.theme_header_group_bg || settings.render.theme_primary || '#2F5597', color: settings.render.theme_header_group_fg || settings.render.theme_primary_fg || '#FFFFFF' }}>
                                    <th style={{
                                        position: 'relative',
                                        padding: '4px 8px',
                                        borderRight: `${settings.render.theme_stub_divider_width || '1px'} ${settings.render.theme_stub_divider_style || 'solid'} ${settings.render.theme_stub_divider_color || '#CBD5E1'}`,
                                        borderBottom: `${settings.render.theme_header_divider_width || '2px'} ${settings.render.theme_header_divider_style || 'double'} ${settings.render.theme_header_divider_color || '#000'}`,
                                        textAlign: 'left',
                                        fontWeight: 500,
                                        fontFamily: settings.render.theme_header_font || settings.render.font_family || 'inherit',
                                        fontSize: settings.render.font_size ? `${settings.render.font_size}px` : '12px'
                                    }}>
                                        구분
                                        {renderBorderHandle('theme_table_outer_top', 'top')}
                                        {renderBorderHandle('theme_table_outer_left', 'left')}
                                        {renderBorderHandle('theme_header_divider', 'bottom')}
                                        {renderBorderHandle('theme_stub_divider', 'right')}
                                    </th>
                                    {previewCols.map((col, i) => (
                                        <th key={col.label} style={{
                                            position: 'relative',
                                            padding: '4px 8px', textAlign: 'right', fontWeight: 500,
                                            borderLeft: i > 0 ? `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}` : 'none',
                                            borderBottom: `${settings.render.theme_header_divider_width || '2px'} ${settings.render.theme_header_divider_style || 'double'} ${settings.render.theme_header_divider_color || '#000'}`,
                                            fontFamily: settings.render.theme_header_font || settings.render.font_family || 'inherit',
                                            fontSize: settings.render.font_size ? `${settings.render.font_size}px` : '12px'
                                        }}>
                                            <div>{col.label}</div>
                                            {renderBorderHandle('theme_table_outer_top', 'top')}
                                            {renderBorderHandle('theme_header_divider', 'bottom')}
                                            {i === previewCols.length - 1 && renderBorderHandle('theme_table_outer_right', 'right')}
                                            {i > 0 && renderBorderHandle('theme_grid', 'left', i !== 1)}
                                        </th>
                                    ))}
                                </tr>

                            </thead>
                            <tbody>
                                <tr style={{ background: settings.render.theme_bg || '#FFFFFF' }}>
                                    <td style={{
                                        position: 'relative',
                                        padding: '3px 8px',
                                        background: settings.render.theme_stub_group_bg || settings.render.theme_stub_header_bg || '#D9E1F2',
                                        color: settings.render.theme_stub_group_fg || settings.render.theme_stub_header_fg || '#000',
                                        fontWeight: 600,
                                        borderRight: `${settings.render.theme_stub_divider_width || '1px'} ${settings.render.theme_stub_divider_style || 'solid'} ${settings.render.theme_stub_divider_color || '#CBD5E1'}`,
                                        fontFamily: settings.render.theme_stub_font || settings.render.font_family || 'inherit',
                                        fontSize: settings.render.font_size ? `${settings.render.font_size}px` : '12px'
                                    }}>
                                        Base
                                        {renderBorderHandle('theme_table_outer_left', 'left')}
                                        {renderBorderHandle('theme_stub_divider', 'right')}
                                    </td>
                                    {previewCols.map((col, i) => (
                                        <td key={i} style={{
                                            position: 'relative',
                                            padding: '3px 8px', textAlign: 'right', fontWeight: 600, color: settings.render.theme_text || '#000',
                                            borderLeft: i > 0 ? `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}` : 'none',
                                            fontFamily: settings.render.theme_data_font || settings.render.font_family || 'inherit',
                                            fontSize: settings.render.font_size ? `${settings.render.font_size}px` : '12px'
                                        }}>
                                            {settings.display?.show_base_parenthesis
                                                ? `(${formatN(col.base)})`
                                                : formatN(col.base)
                                            }
                                            {i === previewCols.length - 1 && renderBorderHandle('theme_table_outer_right', 'right')}
                                            {i > 0 && renderBorderHandle('theme_grid', 'left', i !== 1)}
                                        </td>
                                    ))}
                                </tr>
                                {[
                                    { label: '남성', vKey: 'v1', pKey: 'p1' },
                                    { label: '여성', vKey: 'v2', pKey: 'p2' },
                                    { label: '빈 행 예시', vKey: 'v3', pKey: 'p3', isEmptyRow: true }
                                ]
                                    .filter(row => !settings.display?.hide_zero_stubs || !row.isEmptyRow)
                                    .map((row, idx) => (
                                        <tr key={row.label} style={{ background: idx % 2 === 1 ? (settings.render.theme_stripe || '#F1F5F9') : (settings.render.theme_bg || '#FFFFFF') }}>
                                            <td style={{
                                                position: 'relative',
                                                padding: '3px 8px',
                                                background: settings.render.theme_stub_leaf_bg || settings.render.theme_stub_header_bg || '#D9E1F2',
                                                color: settings.render.theme_stub_leaf_fg || settings.render.theme_stub_header_fg || '#000',
                                                borderRight: `${settings.render.theme_stub_divider_width || '1px'} ${settings.render.theme_stub_divider_style || 'solid'} ${settings.render.theme_stub_divider_color || '#CBD5E1'}`,
                                                borderTop: `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}`,
                                                fontFamily: settings.render.theme_stub_font || settings.render.font_family || 'inherit',
                                                fontSize: settings.render.font_size ? `${settings.render.font_size}px` : '12px'
                                            }}>
                                                {row.label}
                                                {renderBorderHandle('theme_table_outer_left', 'left')}
                                                {renderBorderHandle('theme_stub_divider', 'right')}
                                                {renderBorderHandle('theme_grid', 'top', idx !== 0)}
                                            </td>
                                            {previewCols.map((col, i) => (
                                                <td key={i} style={{
                                                    position: 'relative',
                                                    padding: '3px 8px', textAlign: 'right',
                                                    borderLeft: i > 0 ? `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}` : 'none',
                                                    borderTop: `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}`,
                                                    fontFamily: settings.render.theme_data_font || settings.render.font_family || 'inherit',
                                                    fontSize: settings.render.font_size ? `${settings.render.font_size}px` : '12px'
                                                }}>
                                                    {showN && <div>{formatN(col[row.vKey])}</div>}
                                                    {showPct && <div style={{ color: settings.render.theme_text_muted || '#64748B', fontSize: '0.9em', marginTop: '2px' }}>{formatPct(col[row.pKey])}</div>}
                                                    {i === previewCols.length - 1 && renderBorderHandle('theme_table_outer_right', 'right')}
                                                    {i > 0 && renderBorderHandle('theme_grid', 'left', i !== 1)}
                                                    {renderBorderHandle('theme_grid', 'top', idx !== 0)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                <tr style={{ background: settings.render.theme_bg || '#FFFFFF' }}>
                                    <td style={{
                                        position: 'relative',
                                        padding: '3px 8px',
                                        background: settings.render.theme_stub_group_bg || settings.render.theme_stub_header_bg || '#D9E1F2',
                                        color: settings.render.theme_stub_group_fg || settings.render.theme_stub_header_fg || '#000',
                                        fontWeight: 600,
                                        borderRight: `${settings.render.theme_stub_divider_width || '1px'} ${settings.render.theme_stub_divider_style || 'solid'} ${settings.render.theme_stub_divider_color || '#CBD5E1'}`,
                                        borderTop: `${settings.render.theme_section_separator_width || '2px'} ${settings.render.theme_section_separator_style || 'dashed'} ${settings.render.theme_section_separator_color || '#000'}`,
                                        fontFamily: settings.render.theme_stub_font || settings.render.font_family || 'inherit',
                                        fontSize: settings.render.font_size ? `${settings.render.font_size}px` : '12px'
                                    }}>
                                        top2
                                        {renderBorderHandle('theme_table_outer_left', 'left')}
                                        {renderBorderHandle('theme_stub_divider', 'right')}
                                        {renderBorderHandle('theme_section_separator', 'top')}
                                    </td>
                                    {previewCols.map((col, i) => (
                                        <td key={i} style={{
                                            position: 'relative',
                                            padding: '3px 8px', textAlign: 'right', fontWeight: 600, color: settings.render.theme_text || '#000',
                                            borderLeft: i > 0 ? `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}` : 'none',
                                            borderTop: `${settings.render.theme_section_separator_width || '2px'} ${settings.render.theme_section_separator_style || 'dashed'} ${settings.render.theme_section_separator_color || '#000'}`,
                                            fontFamily: settings.render.theme_data_font || settings.render.font_family || 'inherit',
                                            fontSize: settings.render.font_size ? `${settings.render.font_size}px` : '12px'
                                        }}>
                                            {showN && <div>{formatN(col.tV)}</div>}
                                            {showPct && <div style={{ color: settings.render.theme_text_muted || '#64748B', fontSize: '0.9em', marginTop: '2px' }}>{formatPct(col.tP)}</div>}
                                            {i === previewCols.length - 1 && renderBorderHandle('theme_table_outer_right', 'right')}
                                            {i > 0 && renderBorderHandle('theme_grid', 'left', i !== 1)}
                                            {renderBorderHandle('theme_section_separator', 'top')}
                                        </td>
                                    ))}
                                </tr>
                                <tr style={{ background: settings.render.theme_bg || '#FFFFFF' }}>
                                    <td style={{
                                        position: 'relative',
                                        padding: '3px 8px', background: settings.render.theme_stub_header_bg || '#D9E1F2', color: settings.render.theme_stub_header_fg || '#000', fontWeight: 600,
                                        borderRight: `${settings.render.theme_stub_divider_width || '1px'} ${settings.render.theme_stub_divider_style || 'solid'} ${settings.render.theme_stub_divider_color || '#CBD5E1'}`,
                                        borderTop: `${settings.render.theme_section_separator_width || '2px'} ${settings.render.theme_section_separator_style || 'dashed'} ${settings.render.theme_section_separator_color || '#000'}`,
                                        fontFamily: settings.render.font_family || 'inherit',
                                        fontSize: settings.render.font_size ? `${settings.render.font_size}px` : '12px'
                                    }}>
                                        평균
                                        {renderBorderHandle('theme_table_outer_left', 'left')}
                                        {renderBorderHandle('theme_table_outer_bottom', 'bottom')}
                                        {renderBorderHandle('theme_stub_divider', 'right')}
                                        {renderBorderHandle('theme_section_separator', 'top')}
                                    </td>
                                    {previewCols.map((col, i) => (
                                        <td key={i} style={{
                                            position: 'relative',
                                            padding: '3px 8px', textAlign: 'right', fontWeight: 600, color: settings.render.theme_text || '#000',
                                            borderLeft: i > 0 ? `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}` : 'none',
                                            borderTop: `${settings.render.theme_section_separator_width || '2px'} ${settings.render.theme_section_separator_style || 'dashed'} ${settings.render.theme_section_separator_color || '#000'}`,
                                            fontFamily: settings.render.font_family || 'inherit',
                                            fontSize: settings.render.font_size ? `${settings.render.font_size}px` : '12px'
                                        }}>
                                            {formatMean(col.mean)}
                                            {i === previewCols.length - 1 && renderBorderHandle('theme_table_outer_right', 'right')}
                                            {i > 0 && renderBorderHandle('theme_grid', 'left', i !== 1)}
                                            {renderBorderHandle('theme_section_separator', 'top')}
                                            {renderBorderHandle('theme_table_outer_bottom', 'bottom')}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 2. 하단: 설정 패널 (3단 그리드) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

                {/* 2-1. 테이블 표시 정책 */}
                <div className="dp-setting-card" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div className="dp-setting-card-header" style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: '#F8FAFC', borderRadius: '8px 8px 0 0' }}>
                        <Layout size={16} color="#475569" /> 테이블 표시 정책
                    </div>
                    <div className="dp-setting-card-body" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* 기본 표시 여부 */}
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>기본 표시 여부</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {[
                                    { label: '빈도 기본 표시', field: 'show_n' },
                                    { label: '비율 기본 표시', field: 'show_percent' },
                                    { label: '빈 행 숨기기', field: 'hide_zero_stubs' },
                                    { label: '빈 열 숨기기', field: 'hide_zero_base_columns' },
                                    { label: 'Base 기본 (괄호)', field: 'show_base_parenthesis', fullWidth: true }
                                ].map(item => (
                                    <div
                                        key={item.field}
                                        onClick={() => toggleDisplay(item.field)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', userSelect: 'none', background: '#F1F5F9', padding: '8px 12px', borderRadius: '6px', ...(item.fullWidth ? { gridColumn: '1 / -1' } : {}) }}
                                    >
                                        <div style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '3px', background: settings.display[item.field] ? '#3B82F6' : '#fff', border: settings.display[item.field] ? '1px solid #3B82F6' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {settings.display[item.field] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 소수점 자릿수 재정의 */}
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>소수점 자릿수</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {[
                                    { label: '빈도 (N)', field: 'n_digits' },
                                    { label: '평균 (Mean)', field: 'mean_digits' },
                                    { label: '비율 (%)', field: 'percent_digits' },
                                    { label: '표준편차 (Std)', field: 'std_digits' }
                                ].map((item) => {
                                    const val = settings.display[item.field] || 0;
                                    return (
                                        <div key={item.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#F1F5F9', borderRadius: '6px' }}>
                                            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>{item.label}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '4px', border: '1px solid #CBD5E1', overflow: 'hidden' }}>
                                                <button onClick={() => handleChange(`display.${item.field}`, Math.max(0, val - 1))} style={{ width: '22px', height: '22px', background: '#F8FAFC', border: 'none', borderRight: '1px solid #CBD5E1', cursor: 'pointer', fontWeight: 'bold' }}>−</button>
                                                <div style={{ width: '24px', textAlign: 'center', fontSize: '11px', fontWeight: 600 }}>{val}</div>
                                                <button onClick={() => handleChange(`display.${item.field}`, Math.min(13, val + 1))} style={{ width: '22px', height: '22px', background: '#F8FAFC', border: 'none', borderLeft: '1px solid #CBD5E1', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2-2. 글꼴/색상 설정 */}
                <div className="dp-setting-card" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div className="dp-setting-card-header" style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: '#F8FAFC', borderRadius: '8px 8px 0 0' }}>
                        <Palette size={16} color="#475569" /> 글꼴/색상 설정
                    </div>
                    <div className="dp-setting-card-body" style={{ padding: '16px', flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20px', rowGap: '12px', height: '100%', alignContent: 'start' }}>
                            {/* 글꼴 / 글자 크기 특별 처리 (같은 줄) */}
                            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px', paddingTop: '4px' }}>
                                {/* 글꼴 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 2 }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>글꼴</label>
                                    <select
                                        value={settings.render.font_family || "Arial, sans-serif"}
                                        onChange={(e) => handleChange('render.font_family', e.target.value)}
                                        style={{ flex: 1, padding: '5px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
                                    >
                                        <option value="'Spoqa Han Sans Neo', 'SpoqaHanSansNeo', sans-serif">Spoqa Han Sans Neo</option>
                                        <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
                                        <option value="'Apple SD Gothic Neo', sans-serif">Apple SD Gothic Neo</option>
                                        <option value="Arial, sans-serif">Arial</option>
                                    </select>
                                </div>
                                {/* 글자 크기 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>크기</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '0 8px', background: '#fff', width: '80px', boxSizing: 'border-box' }}>
                                        <input type="number" value={settings.render.font_size || 12} onChange={(e) => handleChange('render.font_size', Number(e.target.value))} style={{ width: '100%', padding: '5px 0', fontSize: '12px', border: 'none', outline: 'none', textAlign: 'center' }} />
                                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>px</span>
                                    </div>
                                </div>
                            </div>

                            {/* 영역별 글꼴 */}
                            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', paddingTop: '4px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>영역별 글꼴 (빈 값 설정 시 상위/전역 글꼴 적용)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>헤더 글꼴</label>
                                        <select
                                            value={settings.render.theme_header_font || ""}
                                            onChange={(e) => handleChange('render.theme_header_font', e.target.value)}
                                            style={{ flex: 1, padding: '5px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
                                        >
                                            <option value="">기본 글꼴 상속</option>
                                            <option value="'Spoqa Han Sans Neo', 'SpoqaHanSansNeo', sans-serif">Spoqa Han Sans Neo</option>
                                            <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
                                            <option value="'Apple SD Gothic Neo', sans-serif">Apple SD Gothic Neo</option>
                                            <option value="Arial, sans-serif">Arial</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>스터브 글꼴</label>
                                        <select
                                            value={settings.render.theme_stub_font || ""}
                                            onChange={(e) => handleChange('render.theme_stub_font', e.target.value)}
                                            style={{ flex: 1, padding: '5px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
                                        >
                                            <option value="">기본 글꼴 상속</option>
                                            <option value="'Spoqa Han Sans Neo', 'SpoqaHanSansNeo', sans-serif">Spoqa Han Sans Neo</option>
                                            <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
                                            <option value="'Apple SD Gothic Neo', sans-serif">Apple SD Gothic Neo</option>
                                            <option value="Arial, sans-serif">Arial</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>데이터 글꼴</label>
                                        <select
                                            value={settings.render.theme_data_font || ""}
                                            onChange={(e) => handleChange('render.theme_data_font', e.target.value)}
                                            style={{ flex: 1, padding: '5px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
                                        >
                                            <option value="">기본 글꼴 상속</option>
                                            <option value="'Spoqa Han Sans Neo', 'SpoqaHanSansNeo', sans-serif">Spoqa Han Sans Neo</option>
                                            <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
                                            <option value="'Apple SD Gothic Neo', sans-serif">Apple SD Gothic Neo</option>
                                            <option value="Arial, sans-serif">Arial</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {[
                                { label: '헤더 상단 배경', field: 'theme_primary', type: 'color' },
                                { label: '헤더 상단 글자', field: 'theme_primary_fg', type: 'color' },
                                { label: '헤더 그룹 배경', field: 'theme_header_group_bg', type: 'color' },
                                { label: '헤더 그룹 글자', field: 'theme_header_group_fg', type: 'color' },
                                { label: '구분 헤더 배경', field: 'theme_stub_header_bg', type: 'color' },
                                { label: '구분 헤더 글자', field: 'theme_stub_header_fg', type: 'color' },
                                { label: '스터브 구분 배경', field: 'theme_stub_group_bg', type: 'color' },
                                { label: '스터브 구분 글자', field: 'theme_stub_group_fg', type: 'color' },
                                { label: '스터브 항목 배경', field: 'theme_stub_leaf_bg', type: 'color' },
                                { label: '스터브 항목 글자', field: 'theme_stub_leaf_fg', type: 'color' },
                                { label: '본문 배경', field: 'theme_bg', type: 'color' },
                                { label: '교차 행 배경', field: 'theme_stripe', type: 'color' },
                                { label: '본문 글자', field: 'theme_text', type: 'color' },
                                { label: '보조 글자', field: 'theme_text_muted', type: 'color' },
                            ].map((item) => (
                                <div key={item.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px', paddingTop: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{item.label}</label>
                                    {item.type === 'color' ? (
                                        <ColorInput
                                            value={settings.render[item.field] || ''}
                                            onChange={(val) => handleChange(`render.${item.field}`, val)}
                                        />
                                    ) : (
                                        <input type={item.type} value={settings.render[item.field] || ''} onChange={(e) => handleChange(`render.${item.field}`, item.type === 'number' ? Number(e.target.value) : e.target.value)} style={{ width: '100px', boxSizing: 'border-box', padding: '5px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2-3. 선 스타일 설정 */}
                <div className="dp-setting-card" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div className="dp-setting-card-header" style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: '#F8FAFC', borderRadius: '8px 8px 0 0' }}>
                        <Type size={16} color="#475569" /> 선 스타일 설정
                    </div>
                    <div className="dp-setting-card-body" style={{ padding: '12px 16px', flex: 1 }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', marginBottom: '8px' }}>표 외곽선 설정</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '8px', rowGap: '6px', alignContent: 'start' }}>
                                    {[
                                        { group: '표 상단', prefix: 'theme_table_outer_top', color: 'theme_table_outer_top_color', style: 'theme_table_outer_top_style', width: 'theme_table_outer_top_width' },
                                        { group: '표 하단', prefix: 'theme_table_outer_bottom', color: 'theme_table_outer_bottom_color', style: 'theme_table_outer_bottom_style', width: 'theme_table_outer_bottom_width' },
                                        { group: '표 좌측', prefix: 'theme_table_outer_left', color: 'theme_table_outer_left_color', style: 'theme_table_outer_left_style', width: 'theme_table_outer_left_width' },
                                        { group: '표 우측', prefix: 'theme_table_outer_right', color: 'theme_table_outer_right_color', style: 'theme_table_outer_right_style', width: 'theme_table_outer_right_width' },
                                    ].map((g, i) => {
                                        const isSelected = selectedBorder === g.prefix;
                                        return (
                                            <div
                                                key={g.group}
                                                onClick={() => setSelectedBorder(g.prefix)}
                                                onMouseEnter={() => setHoveredBorder(g.prefix)}
                                                onMouseLeave={() => setHoveredBorder(null)}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'stretch',
                                                    gap: '4px',
                                                    padding: '6px 8px',
                                                    border: isSelected ? '1px solid #BFDBFE' : '1px solid transparent',
                                                    borderRadius: '6px',
                                                    background: isSelected ? '#EFF6FF' : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? '#1D4ED8' : '#475569', whiteSpace: 'nowrap' }}>{g.group}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                                    <ColorInput
                                                        value={settings.render[g.color] || ''}
                                                        onChange={(val) => handleChange(`render.${g.color}`, val)}
                                                        width="95px"
                                                        textWidth="55px"
                                                        padding="2px 4px"
                                                        gap="4px"
                                                    />
                                                    <LineStylePicker
                                                        value={settings.render[g.style] || 'solid'}
                                                        onChange={(val) => {
                                                            handleChange(`render.${g.style}`, val);
                                                            if (val === 'double') {
                                                                const curWidth = parseInt((settings.render[g.width] || '0').replace('px', ''), 10);
                                                                if (!curWidth || curWidth < 3) {
                                                                    handleChange(`render.${g.width}`, '3px');
                                                                }
                                                            }
                                                        }}
                                                        color={settings.render[g.color] || '#000000'}
                                                        direction={i >= 2 ? 'up' : 'down'}
                                                        width="50px"
                                                        padding="0 4px"
                                                    />
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        <input
                                                            type="number"
                                                            min={settings.render[g.style] === 'double' ? 3 : 0}
                                                            max="10"
                                                            value={(settings.render[g.width] || '').replace('px', '')}
                                                            placeholder={settings.render[g.style] === 'double' ? '3' : '1'}
                                                            onChange={(e) => {
                                                                const isDouble = settings.render[g.style] === 'double';
                                                                let val = e.target.value ? Number(e.target.value) : '';
                                                                if (isDouble && val !== '' && val < 3) val = 3;
                                                                handleChange(`render.${g.width}`, val !== '' ? `${val}px` : '');
                                                            }}
                                                            style={{ width: '32px', padding: '2px 4px', fontSize: '11px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
                                                            title="두께(숫자)"
                                                        />
                                                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>px</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', marginBottom: '8px' }}>표 내부 구분선 설정</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '8px', rowGap: '6px', alignContent: 'start' }}>
                                    {[
                                        { group: '헤더 하단선', prefix: 'theme_header_divider', color: 'theme_header_divider_color', style: 'theme_header_divider_style', width: 'theme_header_divider_width' },
                                        { group: '스터브 구분선', prefix: 'theme_stub_divider', color: 'theme_stub_divider_color', style: 'theme_stub_divider_style', width: 'theme_stub_divider_width' },
                                        { group: '섹션 구분선', prefix: 'theme_section_separator', color: 'theme_section_separator_color', style: 'theme_section_separator_style', width: 'theme_section_separator_width' },
                                        { group: '데이터 기본선', prefix: 'theme_grid', color: 'theme_grid_color', style: 'theme_grid_style', width: 'theme_grid_width' },
                                        { group: '스터브 계층선', prefix: 'theme_stub_tier_divider', color: 'theme_stub_tier_divider_color', style: 'theme_stub_tier_divider_style', width: 'theme_stub_tier_divider_width' },
                                        { group: '헤더 단 구분선', prefix: 'theme_header_tier_divider', color: 'theme_header_tier_divider_color', style: 'theme_header_tier_divider_style', width: 'theme_header_tier_divider_width' },
                                        { group: '배너 그룹 구분선', prefix: 'theme_banner_divider', color: 'theme_banner_divider_color', style: 'theme_banner_divider_style', width: 'theme_banner_divider_width' },
                                    ].map((g, i) => {
                                        const isSelected = selectedBorder === g.prefix;
                                        return (
                                            <div
                                                key={g.group}
                                                onClick={() => setSelectedBorder(g.prefix)}
                                                onMouseEnter={() => setHoveredBorder(g.prefix)}
                                                onMouseLeave={() => setHoveredBorder(null)}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'stretch',
                                                    gap: '4px',
                                                    padding: '6px 8px',
                                                    border: isSelected ? '1px solid #BFDBFE' : '1px solid transparent',
                                                    borderRadius: '6px',
                                                    background: isSelected ? '#EFF6FF' : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? '#1D4ED8' : '#475569', whiteSpace: 'nowrap' }}>{g.group}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                                    <ColorInput
                                                        value={settings.render[g.color] || ''}
                                                        onChange={(val) => handleChange(`render.${g.color}`, val)}
                                                        width="95px"
                                                        textWidth="55px"
                                                        padding="2px 4px"
                                                        gap="4px"
                                                    />
                                                    <LineStylePicker
                                                        value={settings.render[g.style] || 'solid'}
                                                        onChange={(val) => {
                                                            handleChange(`render.${g.style}`, val);
                                                            if (val === 'double') {
                                                                const curWidth = parseInt((settings.render[g.width] || '0').replace('px', ''), 10);
                                                                if (!curWidth || curWidth < 3) {
                                                                    handleChange(`render.${g.width}`, '3px');
                                                                }
                                                            }
                                                        }}
                                                        color={settings.render[g.color] || '#000000'}
                                                        direction={i >= 2 ? 'up' : 'down'}
                                                        width="50px"
                                                        padding="0 4px"
                                                    />
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        <input
                                                            type="number"
                                                            min={settings.render[g.style] === 'double' ? 3 : 0}
                                                            max="10"
                                                            value={(settings.render[g.width] || '').replace('px', '')}
                                                            placeholder={settings.render[g.style] === 'double' ? '3' : '1'}
                                                            onChange={(e) => {
                                                                const isDouble = settings.render[g.style] === 'double';
                                                                let val = e.target.value ? Number(e.target.value) : '';
                                                                if (isDouble && val !== '' && val < 3) val = 3;
                                                                handleChange(`render.${g.width}`, val !== '' ? `${val}px` : '');
                                                            }}
                                                            style={{ width: '32px', padding: '2px 4px', fontSize: '11px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
                                                            title="두께(숫자)"
                                                        />
                                                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>px</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TableSettingTab;
