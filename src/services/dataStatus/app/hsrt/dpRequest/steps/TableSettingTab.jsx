import React, { useState } from 'react';
import { Layout, Type, Palette, CheckCircle2 } from 'lucide-react';

const TableSettingTab = ({ settings, setSettings, onUnsavedChange }) => {
    const [activeBorderTarget, setActiveBorderTarget] = useState('top');

    return (
        <div className="dp-setting-section" style={{ padding: '20px 24px', background: '#F1F5F9' }}>
            <div className="dp-setting-card" style={{ marginBottom: '24px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="dp-setting-card-header" style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Layout size={16} color="#475569" /> 테이블 표시 정책 재정의 (Overrides)
                </div>
                <div className="dp-setting-card-body" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
                        {/* 기본 표시 여부 */}
                        <div style={{ flex: '0 0 280px' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B', paddingBottom: '8px', marginBottom: '16px', borderBottom: '1px solid #CBD5E1' }}>기본 표시 여부</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div
                                    onClick={() => { setSettings({ ...settings, display: { ...settings.display, show_n: !settings.display.show_n } }); if (onUnsavedChange) onUnsavedChange(true); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer', userSelect: 'none', background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}
                                >
                                    <div style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '3px', background: settings.display.show_n ? '#3B82F6' : '#fff', border: settings.display.show_n ? '1px solid #3B82F6' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {settings.display.show_n && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                    </div>
                                    <span style={{ fontWeight: 500 }}>빈도(N) 기본 표시</span>
                                </div>
                                <div
                                    onClick={() => { setSettings({ ...settings, display: { ...settings.display, show_percent: !settings.display.show_percent } }); if (onUnsavedChange) onUnsavedChange(true); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer', userSelect: 'none', background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}
                                >
                                    <div style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '3px', background: settings.display.show_percent ? '#3B82F6' : '#fff', border: settings.display.show_percent ? '1px solid #3B82F6' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {settings.display.show_percent && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                    </div>
                                    <span style={{ fontWeight: 500 }}>비율(%) 기본 표시</span>
                                </div>
                            </div>
                        </div>

                        {/* 소수점 자릿수 재정의 */}
                        <div style={{ flex: 1, borderLeft: '1px solid #E2E8F0', paddingLeft: '32px' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B', paddingBottom: '8px', marginBottom: '16px', borderBottom: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                소수점 자릿수 재정의
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                {[
                                    { label: '비율 (%)', field: 'percent_digits', suffix: '%' },
                                    { label: '평균 (Mean)', field: 'mean_digits', suffix: '' },
                                    { label: '표준편차 (Std)', field: 'std_digits', suffix: '' },
                                    { label: '변량 (Var)', field: 'var_digits', suffix: '' },
                                    { label: '중앙값 (Median)', field: 'median_digits', suffix: '' },
                                    { label: '최대 (Max)', field: 'max_digits', suffix: '' },
                                    { label: '최소 (Min)', field: 'min_digits', suffix: '' }
                                ].map((item) => {
                                    const val = settings.display[item.field] || 0;
                                    const previewText = val === 0 ? `12${item.suffix}` : `12.${'0'.repeat(val)}${item.suffix}`;
                                    return (
                                        <div key={item.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>{item.label}</span>
                                                <span style={{ fontSize: '11px', color: '#94A3B8' }}>ex: {previewText}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '4px', border: '1px solid #CBD5E1', overflow: 'hidden' }}>
                                                <button
                                                    onClick={() => {
                                                        const newVal = Math.max(0, val - 1);
                                                        setSettings({ ...settings, display: { ...settings.display, [item.field]: newVal } });
                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                    }}
                                                    style={{ width: '28px', height: '28px', background: '#F1F5F9', border: 'none', borderRight: '1px solid #CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '16px', fontWeight: 'bold' }}
                                                    onMouseEnter={(e) => e.target.style.background = '#E2E8F0'}
                                                    onMouseLeave={(e) => e.target.style.background = '#F1F5F9'}
                                                >−</button>
                                                <div style={{ width: '28px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                                                    {val}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newVal = Math.min(10, val + 1);
                                                        setSettings({ ...settings, display: { ...settings.display, [item.field]: newVal } });
                                                        if (onUnsavedChange) onUnsavedChange(true);
                                                    }}
                                                    style={{ width: '28px', height: '28px', background: '#F1F5F9', border: 'none', borderLeft: '1px solid #CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '16px', fontWeight: 'bold' }}
                                                    onMouseEnter={(e) => e.target.style.background = '#E2E8F0'}
                                                    onMouseLeave={(e) => e.target.style.background = '#F1F5F9'}
                                                >+</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dp-setting-card" style={{ marginBottom: '24px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="dp-setting-card-header" style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Type size={16} color="#8B5CF6" /> 표 서식 및 렌더링 설정 (미리보기)
                </div>
                <div className="dp-setting-card-body" style={{ padding: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'stretch' }}>

                    {/* Left: Main Workspace (Typography & Preview) */}
                    <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Typography */}
                        <div style={{ background: '#F8FAFC', padding: '12px 20px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px', justifyContent: 'flex-start' }}>
                            {/* 폰트 종류 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto', minWidth: '350px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>글꼴 (Font-Family)</label>
                                <input
                                    type="text"
                                    style={{ flex: 1, minWidth: '150px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                                    value={settings.render.font_family}
                                    onChange={(e) => setSettings({ ...settings, render: { ...settings.render, font_family: e.target.value } })}
                                    placeholder="폰트를 입력하세요"
                                />
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {['Spoqa', 'Noto', 'Apple SD', 'Arial'].map((fontType) => {
                                        const fontFamilies = {
                                            'Spoqa': "'Spoqa Han Sans Neo', 'SpoqaHanSansNeo', sans-serif",
                                            'Noto': "'Noto Sans KR', sans-serif",
                                            'Apple SD': "'Apple SD Gothic Neo', sans-serif",
                                            'Arial': "Arial, sans-serif"
                                        };
                                        const isSelected = (settings.render.font_family || '').includes(fontType === 'Spoqa' ? 'Spoqa' : fontType === 'Noto' ? 'Noto' : fontType === 'Apple SD' ? 'Apple SD' : 'Arial');
                                        return (
                                            <button
                                                key={fontType}
                                                className="dp-tag-btn"
                                                style={{
                                                    background: isSelected ? '#EFF6FF' : '#FFFFFF',
                                                    border: isSelected ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                                                    color: isSelected ? '#3B82F6' : '#475569',
                                                    fontWeight: isSelected ? 600 : 400,
                                                    fontSize: '11px',
                                                    padding: '6px 12px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onClick={() => {
                                                    setSettings({ ...settings, render: { ...settings.render, font_family: fontFamilies[fontType] } });
                                                    if (onUnsavedChange) onUnsavedChange(true);
                                                }}
                                            >
                                                {fontType}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* 구분선 */}
                            <div style={{ width: '1px', height: '24px', background: '#CBD5E1' }}></div>
                            {/* 폰트 크기 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '0 0 auto' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>크기</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '4px 12px' }}>
                                    <input
                                        type="number"
                                        style={{ width: '60px', padding: '4px 0', border: 'none', fontSize: '14px', outline: 'none', textAlign: 'center', fontWeight: 500 }}
                                        value={settings.render.font_size}
                                        onChange={(e) => setSettings({ ...settings, render: { ...settings.render, font_size: parseInt(e.target.value) || 0 } })}
                                    />
                                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>px</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Preview Container */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC', padding: '16px 20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                                    변경할 테두리 영역 선택
                                </label>
                                {activeBorderTarget && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#3B82F6', fontWeight: 600, background: '#EFF6FF', padding: '4px 10px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                                        현재 대상: {
                                            activeBorderTarget === 'top' ? '외곽 상단 (Top)' :
                                                activeBorderTarget === 'bottom' ? '외곽 하단 (Bottom)' :
                                                    activeBorderTarget === 'left' ? '외곽 좌측 (Left)' :
                                                        activeBorderTarget === 'right' ? '외곽 우측 (Right)' :
                                                            activeBorderTarget === 'header' ? '헤더 하단 (Header)' :
                                                                activeBorderTarget === 'stub' ? '스터브 우측 (Stub)' : activeBorderTarget.toUpperCase()
                                        }
                                    </div>
                                )}
                            </div>

                            <div style={{
                                position: 'relative', width: '100%', maxWidth: '460px', height: '240px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto',
                                border: '1px solid #E2E8F0', backgroundColor: settings.render.theme_bg, borderRadius: '8px',
                                padding: '16px', boxSizing: 'border-box'
                            }}>
                                <div style={{
                                    position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                                    color: settings.render.theme_text, fontFamily: settings.render.font_family,
                                    fontSize: `${settings.render.font_size}px`
                                }}>
                                    {/* Header Row */}
                                    <div style={{ display: 'flex', height: '48px', textAlign: 'center', fontWeight: 'bold', backgroundColor: settings.render.theme_primary, color: settings.render.theme_primary_fg }}>
                                        <div style={{ width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>Stub Label</div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>Total / Header</div>
                                    </div>
                                    {/* Data Row 1 */}
                                    <div style={{ display: 'flex', flex: 1, backgroundColor: settings.render.theme_bg }}>
                                        <div style={{ width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: settings.render.theme_bg_alt, fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>Category 1</div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: settings.render.theme_text_muted, fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>54% | 23%</div>
                                    </div>
                                    {/* Data Row 2 */}
                                    <div style={{ display: 'flex', flex: 1, backgroundColor: settings.render.theme_stripe }}>
                                        <div style={{ width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: settings.render.theme_bg_alt, fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>Category 2</div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: settings.render.theme_text_muted, fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>46% | 77%</div>
                                    </div>

                                    {/* Clickable Overlays */}
                                    <div onClick={() => setActiveBorderTarget('top')} style={{ position: 'absolute', top: '-16px', left: 0, right: 0, height: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', background: activeBorderTarget === 'top' ? 'rgba(234, 179, 8, 0.3)' : 'transparent', boxShadow: activeBorderTarget === 'top' ? 'inset 0 0 0 2px #EAB308' : 'none', borderRadius: '4px' }}>
                                        <div style={{ width: '100%', borderTopStyle: settings.render.theme_border_outer_top === 'none' ? 'none' : settings.render.theme_border_outer_top === 'double' ? 'double' : 'solid', borderTopWidth: settings.render.theme_border_outer_top === 'thick' ? '3px' : settings.render.theme_border_outer_top === 'double' ? '4px' : settings.render.theme_border_outer_top === 'none' ? '0' : '1px', borderTopColor: settings.render.theme_border_color || settings.render.theme_primary || '#1e293b' }} />
                                    </div>
                                    <div onClick={() => setActiveBorderTarget('bottom')} style={{ position: 'absolute', bottom: '-16px', left: 0, right: 0, height: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', background: activeBorderTarget === 'bottom' ? 'rgba(234, 179, 8, 0.3)' : 'transparent', boxShadow: activeBorderTarget === 'bottom' ? 'inset 0 0 0 2px #EAB308' : 'none', borderRadius: '4px' }}>
                                        <div style={{ width: '100%', borderBottomStyle: settings.render.theme_border_outer_bottom === 'none' ? 'none' : settings.render.theme_border_outer_bottom === 'double' ? 'double' : 'solid', borderBottomWidth: settings.render.theme_border_outer_bottom === 'thick' ? '3px' : settings.render.theme_border_outer_bottom === 'double' ? '4px' : settings.render.theme_border_outer_bottom === 'none' ? '0' : '1px', borderBottomColor: settings.render.theme_border_color || settings.render.theme_primary || '#1e293b' }} />
                                    </div>
                                    <div onClick={() => setActiveBorderTarget('left')} style={{ position: 'absolute', top: 0, bottom: 0, left: '-16px', width: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeBorderTarget === 'left' ? 'rgba(234, 179, 8, 0.3)' : 'transparent', boxShadow: activeBorderTarget === 'left' ? 'inset 0 0 0 2px #EAB308' : 'none', borderRadius: '4px' }}>
                                        <div style={{ height: '100%', borderLeftStyle: settings.render.theme_border_outer_left === 'none' ? 'none' : settings.render.theme_border_outer_left === 'double' ? 'double' : 'solid', borderLeftWidth: settings.render.theme_border_outer_left === 'thick' ? '3px' : settings.render.theme_border_outer_left === 'double' ? '4px' : settings.render.theme_border_outer_left === 'none' ? '0' : '1px', borderLeftColor: settings.render.theme_border_color || settings.render.theme_primary || '#1e293b' }} />
                                    </div>
                                    <div onClick={() => setActiveBorderTarget('right')} style={{ position: 'absolute', top: 0, bottom: 0, right: '-16px', width: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeBorderTarget === 'right' ? 'rgba(234, 179, 8, 0.3)' : 'transparent', boxShadow: activeBorderTarget === 'right' ? 'inset 0 0 0 2px #EAB308' : 'none', borderRadius: '4px' }}>
                                        <div style={{ height: '100%', borderRightStyle: settings.render.theme_border_outer_right === 'none' ? 'none' : settings.render.theme_border_outer_right === 'double' ? 'double' : 'solid', borderRightWidth: settings.render.theme_border_outer_right === 'thick' ? '3px' : settings.render.theme_border_outer_right === 'double' ? '4px' : settings.render.theme_border_outer_right === 'none' ? '0' : '1px', borderRightColor: settings.render.theme_border_color || settings.render.theme_primary || '#1e293b' }} />
                                    </div>
                                    <div onClick={() => setActiveBorderTarget('header')} style={{ position: 'absolute', top: '32px', left: 0, right: 0, height: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', background: activeBorderTarget === 'header' ? 'rgba(234, 179, 8, 0.3)' : 'transparent', boxShadow: activeBorderTarget === 'header' ? 'inset 0 0 0 2px #EAB308' : 'none', borderRadius: '4px' }}>
                                        <div style={{ width: '100%', borderTopStyle: settings.render.theme_border_header === 'none' ? 'none' : settings.render.theme_border_header === 'double' ? 'double' : 'solid', borderTopWidth: settings.render.theme_border_header === 'thick' ? '3px' : settings.render.theme_border_header === 'double' ? '4px' : settings.render.theme_border_header === 'none' ? '0' : '1px', borderTopColor: settings.render.theme_border_color || settings.render.theme_primary || '#1e293b' }} />
                                    </div>
                                    <div onClick={() => setActiveBorderTarget('stub')} style={{ position: 'absolute', top: 0, bottom: 0, left: '84px', width: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeBorderTarget === 'stub' ? 'rgba(234, 179, 8, 0.3)' : 'transparent', boxShadow: activeBorderTarget === 'stub' ? 'inset 0 0 0 2px #EAB308' : 'none', borderRadius: '4px' }}>
                                        <div style={{ height: '100%', borderLeftStyle: settings.render.theme_border_stub === 'none' ? 'none' : settings.render.theme_border_stub === 'double' ? 'double' : 'solid', borderLeftWidth: settings.render.theme_border_stub === 'thick' ? '3px' : settings.render.theme_border_stub === 'double' ? '4px' : settings.render.theme_border_stub === 'none' ? '0' : '1px', borderLeftColor: settings.render.theme_border_color || settings.render.theme_primary || '#1e293b' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Inspector Sidebar (Styles & Colors) */}
                    <div style={{ flex: '0 0 280px', background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={{ paddingBottom: '12px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1E293B' }}>표 테두리 상세 설정</span>
                        </div>

                        {/* 2. Style Picker */}
                        <div style={{ opacity: activeBorderTarget ? 1 : 0.5, pointerEvents: activeBorderTarget ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                1. 적용할 선 스타일
                                {!activeBorderTarget && <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 500 }}>영역을 먼저 선택하세요</span>}
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {['none', 'solid', 'thick', 'double'].map(styleStr => {
                                    const labels = { none: '선 없음 (None)', solid: '일반선 (Solid)', thick: '굵은선 (Bold)', double: '이중선 (Double)' };
                                    const currentStyle = activeBorderTarget && settings.render[`theme_border_${activeBorderTarget === 'header' || activeBorderTarget === 'stub' ? '' : 'outer_'}${activeBorderTarget}`] === styleStr;
                                    return (
                                        <div key={styleStr}
                                            onClick={() => {
                                                if (!activeBorderTarget) return;
                                                const fieldName = `theme_border_${activeBorderTarget === 'header' || activeBorderTarget === 'stub' ? '' : 'outer_'}${activeBorderTarget}`;
                                                setSettings({
                                                    ...settings,
                                                    render: { ...settings.render, [fieldName]: styleStr }
                                                });
                                                if (onUnsavedChange) onUnsavedChange(true);
                                            }}
                                            style={{
                                                padding: '8px 12px', cursor: 'pointer', borderRadius: '6px',
                                                backgroundColor: currentStyle ? '#EFF6FF' : '#FFFFFF',
                                                border: currentStyle ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {/* Visual Preview Box */}
                                                <div style={{
                                                    width: '28px', height: '20px', flexShrink: 0,
                                                    backgroundColor: currentStyle ? '#FFFFFF' : '#F8FAFC',
                                                    border: currentStyle ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                                                    borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    padding: '0 4px', boxSizing: 'border-box'
                                                }}>
                                                    {styleStr !== 'none' ? (
                                                        <div style={{
                                                            width: '100%',
                                                            borderTopStyle: styleStr === 'double' ? 'double' : 'solid',
                                                            borderTopWidth: styleStr === 'thick' ? '3px' : styleStr === 'double' ? '3px' : '1px',
                                                            borderTopColor: currentStyle ? '#3B82F6' : '#64748B'
                                                        }} />
                                                    ) : (
                                                        <div style={{ width: '100%', borderTop: '1px dashed', borderColor: currentStyle ? '#93C5FD' : '#CBD5E1' }} />
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '13px', color: currentStyle ? '#3B82F6' : '#334155', fontWeight: currentStyle ? 600 : 400 }}>
                                                    {labels[styleStr]}
                                                </div>
                                            </div>
                                            {currentStyle && <CheckCircle2 size={16} color="#3B82F6" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Border Color Picker */}
                        <div style={{ transition: 'opacity 0.2s' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>
                                2. 일괄 테두리 색상
                            </label>
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                                    <input
                                        type="color"
                                        value={settings.render.theme_border_color || settings.render.theme_primary || '#000000'}
                                        onChange={(e) => { setSettings({ ...settings, render: { ...settings.render, theme_border_color: e.target.value } }); if (onUnsavedChange) onUnsavedChange(true); }}
                                        style={{ width: '36px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                    />
                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#1E293B' }}>{(settings.render.theme_border_color || settings.render.theme_primary || '#000000').toUpperCase()}</span>
                                </div>
                                <button
                                    onClick={() => { setSettings({ ...settings, render: { ...settings.render, theme_border_color: settings.render.theme_primary || '#000000' } }); if (onUnsavedChange) onUnsavedChange(true); }}
                                    style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '8px 16px', borderRadius: '6px', width: '100%', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.target.style.backgroundColor = '#F1F5F9'; e.target.style.borderColor = '#94A3B8' }}
                                    onMouseLeave={(e) => { e.target.style.backgroundColor = '#FFFFFF'; e.target.style.borderColor = '#CBD5E1' }}
                                >
                                    초기화 (주 색상으로 연동)
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <div className="dp-setting-card" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="dp-setting-card-header" style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Palette size={16} color="#10B981" /> 전체 테마 색상 (커스텀/프리셋)
                </div>
                <div className="dp-setting-card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Presets */}
                    <div style={{ background: '#F8FAFC', padding: '12px 20px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>빠른 프리셋</span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', paddingRight: '4px' }}>Light</span>
                            <button
                                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', background: '#2F5597', color: 'white', border: 'none' }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                onClick={() => {
                                    setSettings({ ...settings, render: { ...settings.render, theme_primary: "#2F5597", theme_primary_fg: "#FFFFFF", theme_secondary: "#D9E1F2", theme_secondary_alt: "#F1F5F9", theme_bg: "#FFFFFF", theme_bg_alt: "#F8FAFC", theme_stripe: "#F5F7FB", theme_text: "#0F172A", theme_text_muted: "#64748B", theme_highlight: "#E74C3C", theme_destructive: "#EF4444", theme_warning: "#F59E0B", theme_success: "#10B981", theme_info: "#3B82F6", theme_sidebar_hover: "" } });
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >블루 (기본)</button>
                            <button
                                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #E4E4E7', background: '#FAFAFA', color: '#18181B' }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                onClick={() => {
                                    setSettings({ ...settings, render: { ...settings.render, theme_primary: "#3F3F46", theme_primary_fg: "#FFFFFF", theme_secondary: "#E4E4E7", theme_secondary_alt: "#F4F4F5", theme_bg: "#FFFFFF", theme_bg_alt: "#FAFAFA", theme_stripe: "#F7F7F8", theme_text: "#18181B", theme_text_muted: "#A1A1AA", theme_highlight: "#18181B", theme_destructive: "#EF4444", theme_warning: "#F59E0B", theme_success: "#10B981", theme_info: "#3B82F6", theme_sidebar_hover: "" } });
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >플래티넘 실버</button>
                            <button
                                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', background: '#6264A7', color: 'white', border: 'none' }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                onClick={() => {
                                    setSettings({ ...settings, render: { ...settings.render, theme_primary: "#6264A7", theme_primary_fg: "#FFFFFF", theme_secondary: "#EBEBEB", theme_secondary_alt: "#F5F5F5", theme_bg: "#FFFFFF", theme_bg_alt: "#F0F0F0", theme_stripe: "#FAFAFA", theme_text: "#242424", theme_text_muted: "#616161", theme_highlight: "#C4314B", theme_destructive: "#C4314B", theme_warning: "#F29D7D", theme_success: "#1A7B44", theme_info: "#6264A7", theme_sidebar_hover: "" } });
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >Teams (Light)</button>
                            <button
                                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', background: '#064E3B', color: 'white', border: 'none' }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                onClick={() => {
                                    setSettings({ ...settings, render: { ...settings.render, theme_primary: "#064E3B", theme_primary_fg: "#FFFFFF", theme_secondary: "#D1FAE5", theme_secondary_alt: "#ECFDF5", theme_bg: "#FFFFFF", theme_bg_alt: "#FAFAF9", theme_stripe: "#F5F5F4", theme_text: "#1C1917", theme_text_muted: "#78716C", theme_highlight: "#D97706", theme_destructive: "#EF4444", theme_warning: "#F59E0B", theme_success: "#10B981", theme_info: "#3B82F6", theme_sidebar_hover: "" } });
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >에메랄드 포레스트</button>
                            <button
                                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', background: '#701A75', color: 'white', border: 'none' }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                onClick={() => {
                                    setSettings({ ...settings, render: { ...settings.render, theme_primary: "#701A75", theme_primary_fg: "#FFFFFF", theme_secondary: "#FCE7F3", theme_secondary_alt: "#FDF2F8", theme_bg: "#FFFFFF", theme_bg_alt: "#FAFAFA", theme_stripe: "#F5F5F5", theme_text: "#18181B", theme_text_muted: "#71717A", theme_highlight: "#EAB308", theme_destructive: "#EF4444", theme_warning: "#F59E0B", theme_success: "#10B981", theme_info: "#3B82F6", theme_sidebar_hover: "" } });
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >보르도 와인</button>
                            <button
                                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', background: '#1E293B', color: 'white', border: 'none' }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                onClick={() => {
                                    setSettings({ ...settings, render: { ...settings.render, theme_primary: "#1E293B", theme_primary_fg: "#FFFFFF", theme_secondary: "#E2E8F0", theme_secondary_alt: "#F1F5F9", theme_bg: "#FFFFFF", theme_bg_alt: "#F8FAFC", theme_stripe: "#F4F4F5", theme_text: "#0F172A", theme_text_muted: "#64748B", theme_highlight: "#3B82F6", theme_destructive: "#EF4444", theme_warning: "#F59E0B", theme_success: "#10B981", theme_info: "#3B82F6", theme_sidebar_hover: "" } });
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >미드나잇 네이비</button>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: '#CBD5E1', margin: '0 4px' }} />
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', paddingRight: '4px' }}>Dark</span>
                            <button
                                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #1E293B', background: '#0F172A', color: '#F8FAFC' }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                onClick={() => {
                                    setSettings({ ...settings, render: { ...settings.render, theme_primary: "#3B82F6", theme_primary_fg: "#FFFFFF", theme_secondary: "#1E293B", theme_secondary_alt: "#334155", theme_bg: "#0F172A", theme_bg_alt: "#1E293B", theme_stripe: "#172033", theme_text: "#F8FAFC", theme_text_muted: "#94A3B8", theme_highlight: "#FCD34D", theme_destructive: "#F87171", theme_warning: "#FBBF24", theme_success: "#34D399", theme_info: "#60A5FA", theme_sidebar_hover: "" } });
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >슬레이트 다크</button>
                            <button
                                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', background: '#4752C4', color: 'white', border: 'none' }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                onClick={() => {
                                    setSettings({ ...settings, render: { ...settings.render, theme_primary: "#4752C4", theme_primary_fg: "#FFFFFF", theme_secondary: "#4F545C", theme_secondary_alt: "#40444B", theme_bg: "#36393F", theme_bg_alt: "#2F3136", theme_stripe: "#32353B", theme_text: "#DCDDDE", theme_text_muted: "#B9BBBE", theme_highlight: "#ED4245", theme_destructive: "#ED4245", theme_warning: "#FEE75C", theme_success: "#3BA55C", theme_info: "#4752C4", theme_sidebar_hover: "#3F4147" } });
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >Discord (Dark)</button>
                            <button
                                style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', background: '#0082FB', color: 'white', border: 'none' }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                onClick={() => {
                                    setSettings({ ...settings, render: { ...settings.render, theme_primary: "#0082FB", theme_primary_fg: "#FFFFFF", theme_secondary: "#21232B", theme_secondary_alt: "#2C2F3A", theme_bg: "#0E0F14", theme_bg_alt: "#161821", theme_stripe: "#12141A", theme_text: "#F0F2F5", theme_text_muted: "#808593", theme_highlight: "#F23645", theme_destructive: "#F23645", theme_warning: "#F5A623", theme_success: "#089981", theme_info: "#0082FB", theme_sidebar_hover: "#2A2E39" } });
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >Webull (Dark)</button>
                        </div>
                    </div>

                    {/* Colors Editor */}
                    <div style={{ marginTop: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                            {/* 1. Primary */}
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #CBD5E1', paddingBottom: '8px', marginBottom: '16px', color: '#1E293B' }}>
                                    1. Primary (주 색상)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        { label: 'Primary (대제목/강조)', field: 'theme_primary' },
                                        { label: 'Primary 앞글자 색상', field: 'theme_primary_fg' }
                                    ].map(item => (
                                        <div key={item.field} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#fff' }}>
                                            <input type="color" value={(settings.render[item.field] || '#ffffff').slice(0, 7)} onChange={(e) => { setSettings({ ...settings, render: { ...settings.render, [item.field]: e.target.value.toUpperCase() } }); if (onUnsavedChange) onUnsavedChange(true); }} style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', flexShrink: 0 }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, justifyContent: 'center' }}>
                                                <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>{settings.render[item.field]?.slice(0, 7) || ''}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Secondary */}
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #CBD5E1', paddingBottom: '8px', marginBottom: '16px', color: '#1E293B' }}>
                                    2. Secondary (보조)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        { label: 'Secondary 1 (서브)', field: 'theme_secondary' },
                                        { label: 'Secondary 2 (보완)', field: 'theme_secondary_alt' }
                                    ].map(item => (
                                        <div key={item.field} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#fff' }}>
                                            <input type="color" value={(settings.render[item.field] || '#ffffff').slice(0, 7)} onChange={(e) => { setSettings({ ...settings, render: { ...settings.render, [item.field]: e.target.value.toUpperCase() } }); if (onUnsavedChange) onUnsavedChange(true); }} style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', flexShrink: 0 }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, justifyContent: 'center' }}>
                                                <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>{settings.render[item.field]?.slice(0, 7) || ''}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Background */}
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #CBD5E1', paddingBottom: '8px', marginBottom: '16px', color: '#1E293B' }}>
                                    3. Background (배경)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        { label: 'Background 1 (기본)', field: 'theme_bg' },
                                        { label: 'Background 2 (카드/표)', field: 'theme_bg_alt' },
                                        { label: 'Background 3 (교차행)', field: 'theme_stripe' }
                                    ].map(item => (
                                        <div key={item.field} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#fff' }}>
                                            <input type="color" value={(settings.render[item.field] || '#ffffff').slice(0, 7)} onChange={(e) => { setSettings({ ...settings, render: { ...settings.render, [item.field]: e.target.value.toUpperCase() } }); if (onUnsavedChange) onUnsavedChange(true); }} style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', flexShrink: 0 }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, justifyContent: 'center' }}>
                                                <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>{settings.render[item.field]?.slice(0, 7) || ''}</span>
                                        </div>
                                    ))}
                                    {/* Hover Color Box */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', border: '1px dashed #CBD5E1', borderRadius: '6px', background: '#F8FAFC' }}>
                                        <span style={{ fontSize: '11px', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>Sidebar 호버</span>
                                        <input type="text" value={settings.render.theme_sidebar_hover || ''} placeholder="rgba(0,0,0,0) 또는 #FFFFFF 비워두면 자동 연산" onChange={(e) => { setSettings({ ...settings, render: { ...settings.render, theme_sidebar_hover: e.target.value } }); if (onUnsavedChange) onUnsavedChange(true); }} style={{ flex: 1, minWidth: 0, padding: '4px 6px', fontSize: '11px', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', background: '#FFFFFF' }} />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Text */}
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #CBD5E1', paddingBottom: '8px', marginBottom: '16px', color: '#1E293B' }}>
                                    4. Text (텍스트)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        { label: '기본 텍스트 (진한)', field: 'theme_text' },
                                        { label: '보조 텍스트 (연한)', field: 'theme_text_muted' }
                                    ].map(item => (
                                        <div key={item.field} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#fff' }}>
                                            <input type="color" value={(settings.render[item.field] || '#ffffff').slice(0, 7)} onChange={(e) => { setSettings({ ...settings, render: { ...settings.render, [item.field]: e.target.value.toUpperCase() } }); if (onUnsavedChange) onUnsavedChange(true); }} style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', flexShrink: 0 }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, justifyContent: 'center' }}>
                                                <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>{settings.render[item.field]?.slice(0, 7) || ''}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 5. Status */}
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '2px solid #CBD5E1', paddingBottom: '8px', marginBottom: '16px', color: '#1E293B' }}>
                                    5. Status (상태 색상)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        { label: 'Success (성공)', field: 'theme_success' },
                                        { label: 'Warning (경고)', field: 'theme_warning' },
                                        { label: 'Error (에러)', field: 'theme_destructive' },
                                        { label: 'Info (정보)', field: 'theme_info' },
                                        { label: 'Accent (강조)', field: 'theme_highlight' }
                                    ].map(item => (
                                        <div key={item.field} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#fff' }}>
                                            <input type="color" value={(settings.render[item.field] || '#ffffff').slice(0, 7)} onChange={(e) => { setSettings({ ...settings, render: { ...settings.render, [item.field]: e.target.value.toUpperCase() } }); if (onUnsavedChange) onUnsavedChange(true); }} style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', flexShrink: 0 }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, justifyContent: 'center' }}>
                                                <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>{settings.render[item.field]?.slice(0, 7) || ''}</span>
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
