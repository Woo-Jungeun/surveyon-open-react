import React from 'react';
import { Layout, Type, Palette, Eye } from 'lucide-react';

const TableSettingTab = ({ settings, setSettings, onUnsavedChange }) => {
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
        { label: '남성 X 20~29세', subLabel: 'banner_02', base: 100, v1: 58, p1: 58.0, v2: 42, p2: 42.0, tV: 44, tP: 44.0, mean: 3.42 },
        { label: '남성 X 30~39세', subLabel: 'banner_02', base: 680, v1: 356, p1: 52.4, v2: 324, p2: 47.6, tV: 301, tP: 44.3, mean: 3.37 },
        { label: '여성 X 20~29세', subLabel: 'banner_02', base: 36, v1: 0, p1: 0.0, v2: 36, p2: 100.0, tV: 14, tP: 38.9, mean: 3.11 },
        { label: '서울', subLabel: 'banner_02', base: 977, v1: 503, p1: 51.5, v2: 474, p2: 48.5, tV: 460, tP: 47.1, mean: 3.44 },
        { label: '부산', subLabel: 'banner_02', base: 181, v1: 94, p1: 51.9, v2: 87, p2: 48.1, tV: 87, tP: 48.1, mean: 3.39 },
        { label: 'Base 0 예시', subLabel: '숨김 대상', base: 0, v1: 0, p1: 0.0, v2: 0, p2: 0.0, tV: 0, tP: 0.0, mean: '-' }
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

            {/* 1. 상단: 실시간 미리보기 (고정) */}
            <div style={{ position: 'sticky', top: '-20px', zIndex: 10, background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', marginBottom: '-20px', paddingTop: '10px' }}>
                <div className="dp-setting-card" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <div className="dp-setting-card-header" style={{ padding: '10px 16px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', borderRadius: '8px 8px 0 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Eye size={16} color="#3B82F6" /> 실시간 미리보기 (설정 시 즉시 반영됩니다)
                        </div>
                    </div>
                    <div className="dp-setting-card-body" style={{ padding: '16px 24px', overflowX: 'auto', background: settings.render.theme_bg || '#FFFFFF', borderRadius: '0 0 8px 8px' }}>
                        <table style={{
                            width: '100%', borderCollapse: 'separate', borderSpacing: 0,
                            fontFamily: settings.render.font_family || 'Arial',
                            fontSize: `${settings.render.font_size || 12}px`,
                            color: settings.render.theme_text || '#000000',
                            borderTop: `${settings.render.theme_table_outer_top_width || '0px'} ${settings.render.theme_table_outer_top_style || 'none'} ${settings.render.theme_table_outer_top_color || 'transparent'}`,
                            borderBottom: `${settings.render.theme_table_outer_bottom_width || '0px'} ${settings.render.theme_table_outer_bottom_style || 'none'} ${settings.render.theme_table_outer_bottom_color || 'transparent'}`,
                            borderLeft: `${settings.render.theme_table_outer_left_width || '0px'} ${settings.render.theme_table_outer_left_style || 'none'} ${settings.render.theme_table_outer_left_color || 'transparent'}`,
                            borderRight: `${settings.render.theme_table_outer_right_width || '0px'} ${settings.render.theme_table_outer_right_style || 'none'} ${settings.render.theme_table_outer_right_color || 'transparent'}`
                        }}>
                            <thead>
                                <tr style={{ background: settings.render.theme_primary || '#2F5597', color: settings.render.theme_primary_fg || '#FFFFFF' }}>
                                    <th style={{
                                        padding: '8px',
                                        borderRight: `${settings.render.theme_stub_divider_width || '1px'} ${settings.render.theme_stub_divider_style || 'solid'} ${settings.render.theme_stub_divider_color || '#CBD5E1'}`,
                                        borderBottom: `${settings.render.theme_header_divider_width || '2px'} ${settings.render.theme_header_divider_style || 'double'} ${settings.render.theme_header_divider_color || '#000'}`,
                                        textAlign: 'left',
                                        fontWeight: 600
                                    }}>구분</th>
                                    {previewCols.map(col => (
                                        <th key={col.label} style={{
                                            padding: '8px', textAlign: 'right', fontWeight: 600,
                                            borderLeft: `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}`,
                                            borderBottom: `${settings.render.theme_header_divider_width || '2px'} ${settings.render.theme_header_divider_style || 'double'} ${settings.render.theme_header_divider_color || '#000'}`
                                        }}>
                                            <div>{col.label}</div>
                                            <div style={{ color: settings.render.theme_text_muted || '#CBD5E1', fontSize: '0.85em', marginTop: '2px', fontWeight: 400 }}>{col.subLabel}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ background: settings.render.theme_stub_header_bg || '#D9E1F2', color: settings.render.theme_stub_header_fg || '#000', fontWeight: 600 }}>
                                    <td style={{
                                        padding: '6px 8px',
                                        borderRight: `${settings.render.theme_stub_divider_width || '1px'} ${settings.render.theme_stub_divider_style || 'solid'} ${settings.render.theme_stub_divider_color || '#CBD5E1'}`
                                    }}>Base</td>
                                    {previewCols.map((col, i) => (
                                        <td key={i} style={{
                                            padding: '6px 8px', textAlign: 'right',
                                            borderLeft: `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}`
                                        }}>
                                            {formatN(col.base)}
                                        </td>
                                    ))}
                                </tr>
                                {[
                                    { label: '남성', vKey: 'v1', pKey: 'p1' },
                                    { label: '여성', vKey: 'v2', pKey: 'p2' }
                                ].map((row, idx) => (
                                    <tr key={row.label} style={{ background: idx % 2 === 1 ? (settings.render.theme_stripe || '#F1F5F9') : (settings.render.theme_bg || '#FFFFFF') }}>
                                        <td style={{
                                            padding: '6px 8px', background: settings.render.theme_stub_header_bg || '#D9E1F2', color: settings.render.theme_stub_header_fg || '#000',
                                            borderRight: `${settings.render.theme_stub_divider_width || '1px'} ${settings.render.theme_stub_divider_style || 'solid'} ${settings.render.theme_stub_divider_color || '#CBD5E1'}`,
                                            borderTop: `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}`
                                        }}>{row.label}</td>
                                        {previewCols.map((col, i) => (
                                            <td key={i} style={{
                                                padding: '6px 8px', textAlign: 'right',
                                                borderLeft: `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}`,
                                                borderTop: `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}`
                                            }}>
                                                {showN && <div>{formatN(col[row.vKey])}</div>}
                                                {showPct && <div style={{ color: settings.render.theme_text_muted || '#64748B', fontSize: '0.9em', marginTop: '2px' }}>{formatPct(col[row.pKey])}</div>}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                <tr style={{ background: settings.render.theme_bg || '#FFFFFF' }}>
                                    <td style={{
                                        padding: '6px 8px', background: settings.render.theme_stub_header_bg || '#D9E1F2', color: settings.render.theme_stub_header_fg || '#000', fontWeight: 600,
                                        borderRight: `${settings.render.theme_stub_divider_width || '1px'} ${settings.render.theme_stub_divider_style || 'solid'} ${settings.render.theme_stub_divider_color || '#CBD5E1'}`,
                                        borderTop: `${settings.render.theme_section_separator_width || '2px'} ${settings.render.theme_section_separator_style || 'dashed'} ${settings.render.theme_section_separator_color || '#000'}`
                                    }}>top2</td>
                                    {previewCols.map((col, i) => (
                                        <td key={i} style={{
                                            padding: '6px 8px', textAlign: 'right', fontWeight: 600,
                                            borderLeft: `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}`,
                                            borderTop: `${settings.render.theme_section_separator_width || '2px'} ${settings.render.theme_section_separator_style || 'dashed'} ${settings.render.theme_section_separator_color || '#000'}`
                                        }}>
                                            {showN && <div>{formatN(col.tV)}</div>}
                                            {showPct && <div style={{ color: settings.render.theme_text_muted || '#64748B', fontSize: '0.9em', marginTop: '2px' }}>{formatPct(col.tP)}</div>}
                                        </td>
                                    ))}
                                </tr>
                                <tr style={{ background: settings.render.theme_stub_header_bg || '#D9E1F2' }}>
                                    <td style={{
                                        padding: '6px 8px', background: settings.render.theme_stub_header_bg || '#D9E1F2', color: settings.render.theme_stub_header_fg || '#000', fontWeight: 600,
                                        borderRight: `${settings.render.theme_stub_divider_width || '1px'} ${settings.render.theme_stub_divider_style || 'solid'} ${settings.render.theme_stub_divider_color || '#CBD5E1'}`,
                                        borderTop: `${settings.render.theme_section_separator_width || '2px'} ${settings.render.theme_section_separator_style || 'dashed'} ${settings.render.theme_section_separator_color || '#000'}`
                                    }}>평균</td>
                                    {previewCols.map((col, i) => (
                                        <td key={i} style={{
                                            padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: settings.render.theme_stub_header_fg || '#000',
                                            borderLeft: `${settings.render.theme_grid_width || '1px'} ${settings.render.theme_grid_style || 'solid'} ${settings.render.theme_grid_color || '#000'}`,
                                            borderTop: `${settings.render.theme_section_separator_width || '2px'} ${settings.render.theme_section_separator_style || 'dashed'} ${settings.render.theme_section_separator_color || '#000'}`
                                        }}>
                                            {formatMean(col.mean)}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 2. 하단: 설정 패널 (3단 그리드) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', paddingTop: '20px' }}>

                {/* 2-1. 테이블 표시 정책 */}
                <div className="dp-setting-card" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div className="dp-setting-card-header" style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: '#F8FAFC', borderRadius: '8px 8px 0 0' }}>
                        <Layout size={16} color="#475569" /> 테이블 표시 정책
                    </div>
                    <div className="dp-setting-card-body" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* 기본 표시 여부 */}
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>기본 표시 여부</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {[
                                    { label: '빈도 기본 표시', field: 'show_n' },
                                    { label: '비율 기본 표시', field: 'show_percent' },
                                    { label: 'Base 0 열 숨기기', field: 'hide_zero_base_columns' }
                                ].map(item => (
                                    <div
                                        key={item.field}
                                        onClick={() => toggleDisplay(item.field)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', userSelect: 'none', background: '#F1F5F9', padding: '8px 12px', borderRadius: '6px' }}
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
                                                <button onClick={() => handleChange(`display.${item.field}`, Math.min(5, val + 1))} style={{ width: '22px', height: '22px', background: '#F8FAFC', border: 'none', borderLeft: '1px solid #CBD5E1', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
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
                            {[
                                { label: '글꼴', field: 'font_family', type: 'text' },
                                { label: '글자 크기', field: 'font_size', type: 'number' },
                                { label: '헤더 상단 배경', field: 'theme_primary', type: 'color' },
                                { label: '헤더 상단 글자', field: 'theme_primary_fg', type: 'color' },
                                { label: '구분 헤더 배경', field: 'theme_stub_header_bg', type: 'color' },
                                { label: '구분 헤더 글자', field: 'theme_stub_header_fg', type: 'color' },
                                { label: '본문 배경', field: 'theme_bg', type: 'color' },
                                { label: '교차 행 배경', field: 'theme_stripe', type: 'color' },
                                { label: '본문 글자', field: 'theme_text', type: 'color' },
                                { label: '보조 글자', field: 'theme_text_muted', type: 'color' },
                            ].map((item) => (
                                <div key={item.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px', paddingTop: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{item.label}</label>
                                    {item.type === 'color' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff', width: '100px', boxSizing: 'border-box' }}>
                                            <input type="color" value={(settings.render[item.field] || '#ffffff').slice(0, 7)} onChange={(e) => handleChange(`render.${item.field}`, e.target.value.toUpperCase())} style={{ width: '18px', height: '18px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }} />
                                            <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{settings.render[item.field]?.slice(0, 7) || '#FFFFFF'}</span>
                                        </div>
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
                    <div className="dp-setting-card-body" style={{ padding: '16px', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', marginBottom: '12px' }}>표 외곽선 설정</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20px', rowGap: '12px', alignContent: 'start' }}>
                                    {[
                                        { group: '표 상단', color: 'theme_table_outer_top_color', style: 'theme_table_outer_top_style', width: 'theme_table_outer_top_width' },
                                        { group: '표 하단', color: 'theme_table_outer_bottom_color', style: 'theme_table_outer_bottom_style', width: 'theme_table_outer_bottom_width' },
                                        { group: '표 좌측', color: 'theme_table_outer_left_color', style: 'theme_table_outer_left_style', width: 'theme_table_outer_left_width' },
                                        { group: '표 우측', color: 'theme_table_outer_right_color', style: 'theme_table_outer_right_style', width: 'theme_table_outer_right_width' },
                                    ].map((g) => (
                                        <div key={g.group} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F8FAFC' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{g.group}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', padding: '3px', border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff' }} title="색상">
                                                    <input type="color" value={(settings.render[g.color] || '#000000').slice(0, 7)} onChange={(e) => handleChange(`render.${g.color}`, e.target.value.toUpperCase())} style={{ width: '16px', height: '16px', padding: 0, border: 'none', cursor: 'pointer' }} />
                                                </div>
                                                <select value={settings.render[g.style] || 'solid'} onChange={(e) => handleChange(`render.${g.style}`, e.target.value)} style={{ width: '60px', padding: '4px', fontSize: '11px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }} title="종류">
                                                    <option value="solid">solid</option>
                                                    <option value="dashed">dashed</option>
                                                    <option value="dotted">dotted</option>
                                                    <option value="double">double</option>
                                                    <option value="none">none</option>
                                                </select>
                                                <input type="text" value={settings.render[g.width] || ''} placeholder="1px" onChange={(e) => handleChange(`render.${g.width}`, e.target.value)} style={{ width: '36px', padding: '4px', fontSize: '11px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }} title="두께" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', marginBottom: '12px' }}>표 내부 구분선 설정</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20px', rowGap: '12px', alignContent: 'start' }}>
                                    {[
                                        { group: '헤더 하단선', color: 'theme_header_divider_color', style: 'theme_header_divider_style', width: 'theme_header_divider_width' },
                                        { group: '스터브 구분선', color: 'theme_stub_divider_color', style: 'theme_stub_divider_style', width: 'theme_stub_divider_width' },
                                        { group: '섹션 구분선', color: 'theme_section_separator_color', style: 'theme_section_separator_style', width: 'theme_section_separator_width' },
                                        { group: '데이터 기본선', color: 'theme_grid_color', style: 'theme_grid_style', width: 'theme_grid_width' },
                                    ].map((g) => (
                                        <div key={g.group} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F8FAFC' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{g.group}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', padding: '3px', border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff' }} title="색상">
                                                    <input type="color" value={(settings.render[g.color] || '#000000').slice(0, 7)} onChange={(e) => handleChange(`render.${g.color}`, e.target.value.toUpperCase())} style={{ width: '16px', height: '16px', padding: 0, border: 'none', cursor: 'pointer' }} />
                                                </div>
                                                <select value={settings.render[g.style] || 'solid'} onChange={(e) => handleChange(`render.${g.style}`, e.target.value)} style={{ width: '60px', padding: '4px', fontSize: '11px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }} title="종류">
                                                    <option value="solid">solid</option>
                                                    <option value="dashed">dashed</option>
                                                    <option value="dotted">dotted</option>
                                                    <option value="double">double</option>
                                                    <option value="none">none</option>
                                                </select>
                                                <input type="text" value={settings.render[g.width] || ''} placeholder="1px" onChange={(e) => handleChange(`render.${g.width}`, e.target.value)} style={{ width: '36px', padding: '4px', fontSize: '11px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }} title="두께" />
                                            </div>
                                        </div>
                                    ))}
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
