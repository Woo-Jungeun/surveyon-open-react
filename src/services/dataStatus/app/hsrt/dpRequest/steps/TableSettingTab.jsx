import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Layout, Type, Palette, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import { TABLE_THEME_PRESETS } from './TableThemePresets';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: gap, padding: padding, border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff', width: width, boxSizing: 'border-box', height: '32px', flexShrink: 0, userSelect: 'none' }}>
            <input
                type="color"
                value={(/^#([A-FA-f0-9]{3}){1,2}$/.test(localValue) ? localValue : '#FFFFFF').slice(0, 7)}
                onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setLocalValue(val);
                    onChange(val);
                }}
                style={{ width: '18px', height: '18px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px', flexShrink: 0 }}
            />
            <input
                type="text"
                value={localValue}
                onChange={handleTextChange}
                placeholder="#FFFFFF"
                autoComplete="off"
                style={{
                    width: textWidth,
                    height: '20px',
                    fontSize: '12px',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    background: 'transparent',
                    fontFamily: 'monospace',
                    padding: 0,
                    userSelect: 'text'
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
        <div ref={ref} style={{ position: 'relative', userSelect: 'none', outline: 'none' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{ width: width, height: '32px', padding: padding, border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', userSelect: 'none', outline: 'none' }}
                title="선 종류"
            >
                {value === 'none' ? (
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, userSelect: 'none' }}>없음</span>
                ) : (
                    <div style={{ width: '100%', borderTopStyle: value, borderTopWidth: value === 'double' ? '3px' : '2px', borderTopColor: color || '#475569', userSelect: 'none' }} />
                )}
            </div>
            {isOpen && (
                <div style={{ position: 'absolute', [direction === 'up' ? 'bottom' : 'top']: '100%', left: '-10px', zIndex: 50, background: '#fff', border: '1px solid #CBD5E1', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '80px', [direction === 'up' ? 'marginBottom' : 'marginTop']: '4px', padding: '4px 0', userSelect: 'none' }}>
                    {options.map(opt => (
                        <div
                            key={opt}
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: value === opt ? '#F1F5F9' : '#fff', userSelect: 'none' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={(e) => e.currentTarget.style.background = value === opt ? '#F1F5F9' : '#fff'}
                        >
                            {opt === 'none' ? (
                                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, userSelect: 'none' }}>없음</span>
                            ) : (
                                <div style={{ width: '100%', borderTopStyle: opt, borderTopWidth: opt === 'double' ? '3px' : '2px', borderTopColor: color || '#475569', userSelect: 'none' }} />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const borderNames = {
    theme_table_outer_top: '표 최상단 선',
    theme_table_outer_bottom: '표 외곽선 (하단)',
    theme_table_outer_left: '표 외곽선 (좌측)',
    theme_table_outer_right: '표 외곽선 (우측)',
    theme_header_divider: '헤더 최하단 구분선',
    theme_stub_divider: '스터브 구분선(세로)',
    theme_section_separator: '섹션 위쪽 구분선',
    theme_grid: '데이터 기본선',
    theme_stub_tier_divider: '스터브 계층선',
    theme_header_tier_divider: '헤더 단 구분선(상위·중위 사이)',
    theme_banner_divider: '배너 그룹 구분선(세로)',
    theme_data_col_divider: '열 구분선(배너 그룹 내)'
};

const TableSettingTab = ({ settings, setSettings, onUnsavedChange }) => {
    const [selectedBorder, setSelectedBorder] = useState(null);
    const [hoveredBorder, setHoveredBorder] = useState(null);
    const [activeTab, setActiveTab] = useState('policy'); // 'policy', 'fontColor', 'border'
    const [isExampleCollapsed, setIsExampleCollapsed] = useState(true);

    useEffect(() => {
        if (activeTab === 'border') {
            setSelectedBorder('theme_table_outer_top');
        } else {
            setSelectedBorder(null);
        }
    }, [activeTab]);

    const auth = useSelector((store) => store.auth);
    const { getOverviewStyled, getStyleExamples } = DpRequestPageApi();
    const pageId = sessionStorage.getItem('pageId');

    const [previewTab, setPreviewTab] = useState(0); // 0: 실제 표 미리보기, 1: 스타일 예시
    const [realPreviewData, setRealPreviewData] = useState({ css: '', html: '' });
    const [examplesData, setExamplesData] = useState(null);
    const [activeExampleIdx, setActiveExampleIdx] = useState(0);
    const [loadingReal, setLoadingReal] = useState(false);
    const [loadingExamples, setLoadingExamples] = useState(false);

    const realIframeRef = useRef(null);
    const exampleIframeRef = useRef(null);

    const examplesPreviewData = React.useMemo(() => {
        if (!examplesData) return { css: '', html: '' };
        const payload = examplesData?.resultjson || examplesData || {};
        const css = payload.style_css || '';
        const examplesList = payload.examples || [];
        const currentExample = examplesList[activeExampleIdx];
        if (!currentExample) return { css: '', html: '' };
        const html = currentExample.html || '';
        return { css, html };
    }, [examplesData, activeExampleIdx]);

    const getDraftPayload = () => {
        return {
            user: auth?.user?.userId,
            pageid: pageId,
            limit: 1,
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
                format_n_round: settings.display.n_digits !== "" && settings.display.n_digits !== null ? Number(settings.display.n_digits) : undefined,
                format_percent_round: settings.display.percent_digits !== "" && settings.display.percent_digits !== null ? Number(settings.display.percent_digits) : undefined,
                format_mean_round: settings.display.mean_digits !== "" && settings.display.mean_digits !== null ? Number(settings.display.mean_digits) : undefined,
                format_std_round: settings.display.std_digits !== "" && settings.display.std_digits !== null ? Number(settings.display.std_digits) : undefined,
                format_var_round: settings.display.var_digits !== "" && settings.display.var_digits !== null ? Number(settings.display.var_digits) : undefined,
                format_median_round: settings.display.median_digits !== "" && settings.display.median_digits !== null ? Number(settings.display.median_digits) : undefined,
                format_min_round: settings.display.min_digits !== "" && settings.display.min_digits !== null ? Number(settings.display.min_digits) : undefined,
                format_max_round: settings.display.max_digits !== "" && settings.display.max_digits !== null ? Number(settings.display.max_digits) : undefined,
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
                n_digits: settings.display.n_digits !== "" && settings.display.n_digits !== null ? Number(settings.display.n_digits) : undefined,
                percent_digits: settings.display.percent_digits !== "" && settings.display.percent_digits !== null ? Number(settings.display.percent_digits) : undefined,
                mean_digits: settings.display.mean_digits !== "" && settings.display.mean_digits !== null ? Number(settings.display.mean_digits) : undefined,
                std_digits: settings.display.std_digits !== "" && settings.display.std_digits !== null ? Number(settings.display.std_digits) : undefined,
                median_digits: settings.display.median_digits !== "" && settings.display.median_digits !== null ? Number(settings.display.median_digits) : undefined,
                min_digits: settings.display.min_digits !== "" && settings.display.min_digits !== null ? Number(settings.display.min_digits) : undefined,
                max_digits: settings.display.max_digits !== "" && settings.display.max_digits !== null ? Number(settings.display.max_digits) : undefined,
                var_digits: settings.display.var_digits !== "" && settings.display.var_digits !== null ? Number(settings.display.var_digits) : undefined,
                hide_zero_base_columns: settings.display.hide_zero_base_columns,
                hide_zero_banners: settings.display.hide_zero_banners,
                hide_zero_stubs: settings.display.hide_zero_stubs,
                show_base_parenthesis: settings.display.show_base_parenthesis,
                base_prefix: settings.display.show_base_parenthesis ? "(" : "",
                base_postfix: settings.display.show_base_parenthesis ? ")" : "",
                percent_symbol: settings.display.percent_symbol,
            }
        };
    };

    const parsePreviewData = (res) => {
        if (!res) return { css: '', html: '' };
        const payload = res?.resultjson || res || {};
        const css = payload.style_css || '';
        const tablesList = payload.tables || payload.examples || [];
        const htmls = tablesList.map(t => {
            return t.html || '';
        }).join('<div style="height:8px;"></div>');
        return { css, html: htmls || (payload.html || '') };
    };

    const INITIAL_IFRAME_DOC = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style id="preview-style">
                html, body {
                    height: 100%;
                    margin: 0;
                    overflow-y: hidden;
                }
                body table, table {
                    margin: 0 auto !important;
                }
            </style>
        </head>
        <body id="preview-body" style="margin: 0; padding: 0 8px; background-color: transparent; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100%; box-sizing: border-box;">
        </body>
        </html>
    `;

    const updateIframeContent = (iframeRef, data) => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const runUpdate = () => {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!doc) return;

                const styleEl = doc.getElementById('preview-style');
                const bodyEl = doc.getElementById('preview-body');

                const activeHighlight = activeTab === 'border' ? (selectedBorder || hoveredBorder) : null;
                let highlightCss = '';
                if (activeHighlight) {
                    const borderRules = {
                        theme_table_outer_top: 'table .injected-outer-top, .styled-table .injected-outer-top { position: relative; z-index: 10; box-shadow: 0 -8px 0 -3px rgba(245, 158, 11, 0.35), inset 0 8px 0 -3px rgba(245, 158, 11, 0.35) !important; }',
                        theme_table_outer_bottom: 'table .injected-outer-bottom, .styled-table .injected-outer-bottom { position: relative; z-index: 10; box-shadow: 0 8px 0 -3px rgba(245, 158, 11, 0.35), inset 0 -8px 0 -3px rgba(245, 158, 11, 0.35) !important; }',
                        theme_table_outer_left: 'table .injected-outer-left, .styled-table .injected-outer-left { position: relative; z-index: 10; box-shadow: -8px 0 0 -3px rgba(245, 158, 11, 0.35), inset 8px 0 0 -3px rgba(245, 158, 11, 0.35) !important; }',
                        theme_table_outer_right: 'table .injected-outer-right, .styled-table .injected-outer-right { position: relative; z-index: 10; box-shadow: 8px 0 0 -3px rgba(245, 158, 11, 0.35), inset -8px 0 0 -3px rgba(245, 158, 11, 0.35) !important; }',
                        theme_header_divider: 'table thead .injected-header-bottom, .styled-table thead .injected-header-bottom { position: relative; } table thead .injected-header-bottom::after, .styled-table thead .injected-header-bottom::after { content: ""; position: absolute; bottom: -4px; left: 0; right: 0; height: 8px; background-color: rgba(245, 158, 11, 0.35); z-index: 20; pointer-events: none; }',
                        theme_stub_divider: 'table .injected-stub-right, .styled-table .injected-stub-right { position: relative; z-index: 110 !important; } table .injected-stub-right::after, .styled-table .injected-stub-right::after { content: ""; position: absolute; top: 0; bottom: -1px; right: -4px; width: 8px; background-color: rgba(245, 158, 11, 0.35); z-index: 120 !important; pointer-events: none; }',
                        theme_section_separator: '.section-separator, table tr[class*="separator"] td, table tr[class*="separator"] th, .styled-table tr[class*="separator"] td, .styled-table tr[class*="separator"] th { position: relative; z-index: 10; box-shadow: inset 0 4px 0 0 rgba(245, 158, 11, 0.35), 0 -4px 0 0 rgba(245, 158, 11, 0.35) !important; }',
                        theme_grid: 'table tbody .injected-grid-cell:not(.injected-outer-bottom), .styled-table tbody .injected-grid-cell:not(.injected-outer-bottom) { position: relative; z-index: 10; box-shadow: inset 0 -8px 0 -3px rgba(245, 158, 11, 0.35), 0 8px 0 -3px rgba(245, 158, 11, 0.35) !important; }',
                        theme_stub_tier_divider: 'table td.injected-stub-tier-left.injected-stub-tier-left, table th.injected-stub-tier-left.injected-stub-tier-left { position: relative; z-index: 110 !important; } table td.injected-stub-tier-left.injected-stub-tier-left::before, table th.injected-stub-tier-left.injected-stub-tier-left::before { content: ""; position: absolute; top: 0; bottom: -1px; left: -4px; width: 8px; background-color: rgba(245, 158, 11, 0.35); z-index: 120 !important; pointer-events: none; }',
                        theme_header_tier_divider: 'table thead .injected-header-tier, .styled-table thead .injected-header-tier { position: relative; } table thead .injected-header-tier::after, .styled-table thead .injected-header-tier::after { content: ""; position: absolute; bottom: -4px; left: 0; right: 0; height: 8px; background-color: rgba(245, 158, 11, 0.35); z-index: 20; pointer-events: none; }',
                        theme_banner_divider: 'table .banner-divider-cell, .styled-table .banner-divider-cell, table .injected-banner-boundary, .styled-table .injected-banner-boundary { position: relative; z-index: 100 !important; } table .banner-divider-cell::after, .styled-table .banner-divider-cell::after, table .injected-banner-boundary::after, .styled-table .injected-banner-boundary::after { content: ""; position: absolute; top: 0; bottom: -1px; right: -4px; width: 8px; background-color: rgba(245, 158, 11, 0.35); z-index: 110 !important; pointer-events: none; }',
                        theme_data_col_divider: 'table .injected-data-col-divider, .styled-table .injected-data-col-divider { position: relative; } table .injected-data-col-divider::before, .styled-table .injected-data-col-divider::before { content: ""; position: absolute; top: 0; bottom: -1px; left: -4px; width: 8px; background-color: rgba(245, 158, 11, 0.35); z-index: 20; pointer-events: none; }'
                    };
                    if (borderRules[activeHighlight]) {
                        highlightCss += borderRules[activeHighlight];
                    }
                }

                const bindCellEvents = () => {
                    const table = doc.querySelector('table');
                    if (!table) return;

                    const thead = table.querySelector('thead');
                    const theadRowsList = thead ? Array.from(thead.querySelectorAll('tr')) : [];
                    const firstRow = thead ? thead.querySelector('tr') : table.querySelector('tr');
                    const bannerBoundaryCols = new Set();
                    let stubWidth = 0;
                    const grid = [];
                    const allRows = Array.from(table.querySelectorAll('tr'));
                    let maxColIdx = 0;

                    allRows.forEach((tr, r) => {
                        const rowCells = Array.from(tr.querySelectorAll('th, td'));
                        rowCells.forEach(cell => {
                            const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
                            const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);

                            if (!grid[r]) grid[r] = [];
                            let startCol = 0;
                            while (grid[r][startCol]) startCol++;

                            for (let i = 0; i < rowspan; i++) {
                                if (!grid[r + i]) grid[r + i] = [];
                                for (let j = 0; j < colspan; j++) {
                                    grid[r + i][startCol + j] = true;
                                }
                            }

                            const rightEdgeColIdx = startCol + colspan - 1;
                            cell.dataset.colIndex = startCol;
                            cell.dataset.rightEdge = rightEdgeColIdx;
                            maxColIdx = Math.max(maxColIdx, rightEdgeColIdx);

                            const textVal = cell.textContent ? cell.textContent.trim() : '';
                            const isStub = cell.classList.contains('stub-cell') ||
                                cell.classList.contains('stub-header-cell') ||
                                cell.classList.contains('stub-header') ||
                                (cell.className && typeof cell.className === 'string' && cell.className.includes('stub')) ||
                                (r === 0 && startCol === 0) ||
                                (textVal === '구분') ||
                                (startCol < 4 && ['base', '평균', '소계', '합계', '계', '통계', '표준편차', '최대값', '최소값', 'std', 'mean'].includes(textVal.toLowerCase()));
                            if (isStub) {
                                stubWidth = Math.max(stubWidth, rightEdgeColIdx + 1);
                            }

                            if (r === 0 && !isStub) {
                                bannerBoundaryCols.add(rightEdgeColIdx);
                            }
                        });
                    });

                    bannerBoundaryCols.delete(maxColIdx);

                    const maxRowIdx = allRows.length - 1;
                    allRows.forEach((tr, r) => {
                        const rowCells = tr.querySelectorAll('th, td');

                        let isSeparatorRow = false;
                        if (tr.style.borderTopWidth && parseInt(tr.style.borderTopWidth, 10) > 1) isSeparatorRow = true;
                        if (tr.style.borderTopStyle && tr.style.borderTopStyle !== 'solid' && tr.style.borderTopStyle !== 'none') isSeparatorRow = true;

                        rowCells.forEach((cell, idx) => {
                            if (cell.style.borderTopWidth && parseInt(cell.style.borderTopWidth, 10) > 1) isSeparatorRow = true;
                            if (cell.style.borderTopStyle && cell.style.borderTopStyle !== 'solid' && cell.style.borderTopStyle !== 'none') isSeparatorRow = true;

                            // 텍스트 기반 폴백: 선 스타일이 1px solid(기본)일 때도 확실하게 통계행(구분선 행)을 감지하기 위함
                            if (idx < 2) {
                                const text = cell.textContent.trim();
                                if (['통계', '계', '소계', '평균', '표준편차', '최대값', '최소값', 'Base'].includes(text)) {
                                    isSeparatorRow = true;
                                }
                            }

                            const cIndex = parseInt(cell.dataset.colIndex, 10);
                            const rEdge = parseInt(cell.dataset.rightEdge, 10);
                            const rSpan = parseInt(cell.getAttribute('rowspan') || '1', 10);

                            if (r === 0) cell.classList.add('injected-outer-top');
                            if (r + rSpan - 1 === maxRowIdx) cell.classList.add('injected-outer-bottom');
                            if (cIndex === 0) cell.classList.add('injected-outer-left');
                            if (rEdge === maxColIdx) cell.classList.add('injected-outer-right');

                            const inThead = thead && thead.contains(cell);
                            if (!inThead) {
                                cell.classList.add('injected-grid-cell');
                            }
                            const isStub = cell.classList.contains('stub-cell') ||
                                cell.classList.contains('stub-header-cell') ||
                                cell.classList.contains('stub-header') ||
                                (cell.className && typeof cell.className === 'string' && cell.className.includes('stub')) ||
                                (cIndex < stubWidth);
                            if (bannerBoundaryCols.has(rEdge) && !isStub) {
                                cell.classList.add('injected-banner-boundary');
                            }
                            if (isStub) {
                                if (rEdge < stubWidth - 1 && !inThead) cell.classList.add('injected-stub-tier-right');
                                if (cIndex > 0 && !inThead) cell.classList.add('injected-stub-tier-left');
                                if (rEdge === stubWidth - 1 && !inThead) cell.classList.add('injected-stub-right');
                            } else {
                                const isLastTheadRow = theadRowsList.length > 0 && r === theadRowsList.length - 1;
                                if ((!inThead || isLastTheadRow) && cIndex > stubWidth) {
                                    cell.classList.add('injected-data-col-divider');
                                }
                            }
                        });

                        if (isSeparatorRow) {
                            tr.classList.add('separator');
                        }
                    });

                    // theadRowsList is defined at the beginning of bindCellEvents

                    // Calculate the actual maximum bottom edge of the header
                    let maxBottomEdge = 0;
                    theadRowsList.forEach((tr, r) => {
                        const cells = tr.querySelectorAll('th, td');
                        cells.forEach(cell => {
                            const rSpan = parseInt(cell.getAttribute('rowspan') || '1', 10);
                            if (r + rSpan > maxBottomEdge) {
                                maxBottomEdge = r + rSpan;
                            }
                        });
                    });

                    theadRowsList.forEach((tr, r) => {
                        const cells = tr.querySelectorAll('th, td');
                        cells.forEach((cell, cIdx) => {
                            const rightEdge = parseInt(cell.dataset.rightEdge, 10);
                            const rSpan = parseInt(cell.getAttribute('rowspan') || '1', 10);

                            // Patch API bug: Empty filler cells in the stub area should have stub-header class for background color
                            if ((!cell.textContent || cell.textContent.trim() === '') && rightEdge < stubWidth) {
                                cell.classList.add('stub-header');
                            }

                            const isStub = cell.classList.contains('stub-cell') ||
                                cell.classList.contains('stub-header-cell') ||
                                cell.classList.contains('stub-header') ||
                                (cell.className && typeof cell.className === 'string' && cell.className.includes('stub')) ||
                                (cell.textContent && cell.textContent.trim() === '구분') ||
                                (rightEdge < stubWidth);

                            // Calculate if the cell physically touches the bottom boundary of the header
                            if (r + rSpan === maxBottomEdge) {
                                cell.classList.add('injected-header-bottom');
                            } else if (!isStub) {
                                cell.classList.add('injected-header-tier');
                            }

                            if (bannerBoundaryCols.has(rightEdge)) {
                                cell.classList.add('injected-banner-boundary');
                            }
                        });
                    });

                    const cells = doc.querySelectorAll('table th, table td');
                    cells.forEach(cell => {
                        if (activeTab !== 'border') {
                            cell.onmousemove = null;
                            cell.onmouseleave = null;
                            cell.onclick = null;
                            cell.style.cursor = 'default';
                            return;
                        }
                        let currentLocalBorderType = null;

                        cell.onmousemove = (e) => {
                            const rect = cell.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            const w = rect.width;
                            const h = rect.height;
                            const margin = 5;

                            let borderType = null;

                            const tr = cell.parentElement;
                            if (!tr) return;
                            const parentContainer = tr.parentElement;
                            if (!parentContainer) return;
                            const activeTable = parentContainer.closest('table');
                            if (!activeTable) return;

                            const r = allRows.indexOf(tr);
                            const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
                            const isFirstRow = (r === 0);
                            const isLastRow = (r + rowspan - 1 === maxRowIdx);

                            const currentColIndex = parseInt(cell.dataset.colIndex, 10);
                            const rightColIdx = parseInt(cell.dataset.rightEdge, 10);
                            const isFirstCol = (currentColIndex === 0);
                            const isLastCol = (rightColIdx === maxColIdx);

                            const activeThead = activeTable.querySelector('thead');
                            const inThead = activeThead ? activeThead.contains(cell) : false;
                            const theadRows = activeThead ? Array.from(activeThead.querySelectorAll('tr')) : [];
                            const maxTheadRowIdx = theadRows.length - 1;

                            // A cell's bottom touches the header bottom if its row index + rowspan reaches the last header row.
                            // In case maxTheadRowIdx is calculated incorrectly due to API bugs, we also check if it has the injected class
                            const isCellAtTheadBottom = inThead && ((r + rowspan - 1 >= maxTheadRowIdx) || cell.classList.contains('injected-header-bottom'));
                            const isCellInsideThead = inThead && !isCellAtTheadBottom;

                            const isStubCell = cell.classList.contains('stub-cell') ||
                                cell.classList.contains('stub-header-cell') ||
                                cell.classList.contains('stub-header') ||
                                cell.className?.includes('stub') ||
                                (cell.getAttribute('colspan') === null && cell.tagName === 'TH' && isFirstCol) ||
                                (cell.textContent && cell.textContent.trim() === '구분') ||
                                (rightColIdx < stubWidth);

                            const nearTop = (y <= margin);
                            const nearBottom = (y >= h - margin);
                            const nearLeft = (x <= margin);
                            const nearRight = (x >= w - margin);

                            if (nearTop) {
                                if (isFirstRow) borderType = 'theme_table_outer_top';
                                else if (tr.classList.contains('separator') || tr.className.includes('separator')) borderType = 'theme_section_separator';
                                else borderType = 'theme_grid';
                            } else if (nearBottom) {
                                if (isLastRow) borderType = 'theme_table_outer_bottom';
                                else if (isCellAtTheadBottom) borderType = 'theme_header_divider';
                                else if (isCellInsideThead && !isStubCell) borderType = 'theme_header_tier_divider';
                                else borderType = 'theme_grid';
                            } else if (nearLeft) {
                                if (isFirstCol) {
                                    borderType = 'theme_table_outer_left';
                                } else {
                                    const prevColIdx = currentColIndex - 1;
                                    if (isStubCell && prevColIdx < stubWidth - 1 && !inThead) {
                                        borderType = 'theme_stub_tier_divider';
                                    } else if (currentColIndex === stubWidth && !inThead) {
                                        borderType = 'theme_stub_divider';
                                    } else {
                                        if (bannerBoundaryCols.has(prevColIdx)) {
                                            borderType = 'theme_banner_divider';
                                        } else {
                                            borderType = 'theme_data_col_divider';
                                        }
                                    }
                                }
                            } else if (nearRight) {
                                if (isLastCol) {
                                    borderType = 'theme_table_outer_right';
                                } else if (isStubCell) {
                                    if (rightColIdx === stubWidth - 1) {
                                        if (!inThead) {
                                            borderType = 'theme_stub_divider';
                                        }
                                    } else {
                                        if (!inThead) {
                                            borderType = 'theme_stub_tier_divider';
                                        }
                                    }
                                } else {
                                    const rightBoundaryIdx = rightColIdx;
                                    if (bannerBoundaryCols.has(rightBoundaryIdx)) {
                                        borderType = 'theme_banner_divider';
                                    } else {
                                        borderType = 'theme_data_col_divider';
                                    }
                                }
                            }

                            if (borderType) {
                                currentLocalBorderType = borderType;
                                cell.style.cursor = 'pointer';
                                setHoveredBorder(borderType);
                            } else {
                                currentLocalBorderType = null;
                                cell.style.cursor = 'default';
                                setHoveredBorder(null);
                            }
                        };

                        cell.onmouseleave = () => {
                            currentLocalBorderType = null;
                            cell.style.cursor = 'default';
                            setHoveredBorder(null);
                        };

                        cell.onclick = (e) => {
                            if (currentLocalBorderType) {
                                setSelectedBorder(currentLocalBorderType);
                                setActiveTab('border');
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        };
                    });
                };

                if (styleEl && bodyEl) {
                    styleEl.textContent = `
                        html, body {
                            min-height: 100%;
                            height: auto;
                            margin: 0;
                            overflow: auto !important;
                        }
                        ${data.css || ''}
                        body table, table {
                            margin: 18px auto !important;
                            border-collapse: collapse !important;
                        }
                        ${highlightCss}
                    `;
                    bodyEl.innerHTML = data.html || '';
                    bindCellEvents();
                } else {
                    doc.open();
                    doc.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <style id="preview-style">
                                html, body {
                                    min-height: 100%;
                                    height: auto;
                                    margin: 0;
                                    overflow: auto !important;
                                }
                                ${data.css || ''}
                                body table, table { 
                                    margin: auto !important; 
                                    border-collapse: collapse !important;
                                }
                                ${highlightCss}
                            </style>
                        </head>
                        <body id="preview-body" style="margin: 0; padding: 16px; background-color: transparent; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100%; box-sizing: border-box;">
                            ${data.html || ''}
                        </body>
                        </html>
                    `);
                    doc.close();
                    bindCellEvents();
                }
            } catch (e) {
                console.warn("Iframe update error: ", e);
            }
        };

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.readyState === 'complete') {
            runUpdate();
        } else {
            iframe.onload = () => {
                runUpdate();
                iframe.onload = null;
            };
        }
    };

    useEffect(() => {
        updateIframeContent(realIframeRef, realPreviewData);
    }, [realPreviewData, selectedBorder, hoveredBorder, activeTab]);

    useEffect(() => {
        if (!isExampleCollapsed) {
            updateIframeContent(exampleIframeRef, examplesPreviewData);
        }
    }, [examplesPreviewData, selectedBorder, hoveredBorder, isExampleCollapsed, activeTab]);

    useEffect(() => {
        if (!pageId || !auth?.user?.userId) return;

        const timer = setTimeout(async () => {
            const payload = getDraftPayload();

            setLoadingReal(true);
            try {
                const res = await getOverviewStyled.mutateAsync(payload);
                setRealPreviewData(parsePreviewData(res));
            } catch (err) {
                console.error("Failed to fetch real preview styled HTML:", err);
            } finally {
                setLoadingReal(false);
            }

            setLoadingExamples(true);
            try {
                const res = await getStyleExamples.mutateAsync(payload);
                setExamplesData(res);
            } catch (err) {
                console.error("Failed to fetch style examples HTML:", err);
            } finally {
                setLoadingExamples(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [settings.render, settings.display, pageId, auth?.user?.userId]);

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

    return (
        <div className="dp-setting-section" style={{
            padding: '20px 24px',
            background: '#F1F5F9',
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'row',
            gap: '24px',
            boxSizing: 'border-box',
            width: '100%',
            maxWidth: '100%',
            alignItems: 'stretch'
        }}>
            <style>{`
                @keyframes borderSelectedPulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
                @keyframes loadingPulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }
                .loading-pulse-dot {
                    animation: loadingPulse 1.5s infinite ease-in-out;
                }
            `}</style>

            {/* 왼쪽 구획: 미리보기 영역 (Sticky 고정 - 반응형 넓이 확장 및 상하 균등 정렬) */}
            <div style={{ flex: '0 0 45%', minWidth: '460px', maxWidth: '750px', position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 200px)', minHeight: '620px' }}>

                {/* 카드 1: 실제 표 미리보기 */}
                <div className="dp-setting-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <div className="dp-setting-card-header" style={{ padding: '10px 16px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', fontSize: '13px', background: '#F8FAFC', borderRadius: '8px 8px 0 0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>실제 표 미리보기</span>
                        {loadingReal && (
                            <span style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="loading-pulse-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6' }}></span> 업데이트 중...
                            </span>
                        )}
                    </div>

                    {/* 선 선택 시 조작 도구 바 */}
                    {selectedBorder && (
                        <div onMouseEnter={() => setHoveredBorder(selectedBorder)} onMouseLeave={() => setHoveredBorder(null)} style={{ background: '#EFF6FF', borderBottom: '1px solid #BFDBFE', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1D4ED8', whiteSpace: 'nowrap' }}>선택: {borderNames[selectedBorder]}</span>
                                <ColorInput value={settings.render[`${selectedBorder}_color`] || ''} onChange={(val) => handleChange(`render.${selectedBorder}_color`, val)} width="90px" textWidth="50px" padding="2px 4px" gap="4px" />
                                <LineStylePicker value={settings.render[`${selectedBorder}_style`] || 'solid'} onChange={(val) => { handleChange(`render.${selectedBorder}_style`, val); if (val === 'double') { const curWidth = parseInt((settings.render[`${selectedBorder}_width`] || '0').replace('px', ''), 10); if (!curWidth || curWidth < 3) handleChange(`render.${selectedBorder}_width`, '3px'); } }} color={settings.render[`${selectedBorder}_color`] || '#000000'} direction="down" width="50px" padding="0 4px" />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <input type="number" min={settings.render[`${selectedBorder}_style`] === 'double' ? 3 : 0} max="10" value={(settings.render[`${selectedBorder}_width`] || '').replace('px', '')} placeholder={settings.render[`${selectedBorder}_style`] === 'double' ? '3' : '1'} onChange={(e) => { const isDouble = settings.render[`${selectedBorder}_style`] === 'double'; let val = e.target.value ? Number(e.target.value) : ''; if (isDouble && val !== '' && val < 3) val = 3; handleChange(`render.${selectedBorder}_width`, val !== '' ? `${val}px` : ''); }} style={{ width: '40px', padding: '2px 4px', fontSize: '11px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }} />
                                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>px</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedBorder(null)} style={{ border: 'none', background: 'transparent', color: '#1D4ED8', fontSize: '11px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>선택 해제</button>
                        </div>
                    )}

                    <div className="dp-setting-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px', overflowX: 'auto', background: settings.render.theme_bg || '#FFFFFF', borderRadius: '0 0 8px 8px', position: 'relative' }}>
                        <iframe
                            ref={realIframeRef}
                            srcDoc={INITIAL_IFRAME_DOC}
                            style={{ width: '100%', flex: 1, minHeight: 0, border: 'none', opacity: loadingReal ? 0.6 : 1, transition: 'opacity 0.2s' }}
                            title="real-preview"
                        />
                    </div>
                </div>

                {/* 카드 2: 스타일 예시 */}
                {/* 카드 2: 스타일 예시 (접기/펼치기 아코디언 추가) */}
                <div className="dp-setting-card" style={{ flex: isExampleCollapsed ? '0 0 auto' : 1, display: 'flex', flexDirection: 'column', minHeight: isExampleCollapsed ? 'auto' : 0, background: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <div
                        className="dp-setting-card-header"
                        onClick={() => setIsExampleCollapsed(!isExampleCollapsed)}
                        style={{ padding: '10px 16px', borderBottom: isExampleCollapsed ? 'none' : '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', fontSize: '13px', background: '#F8FAFC', borderRadius: isExampleCollapsed ? '8px' : '8px 8px 0 0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>샘플 데이터 예시</span>
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>{isExampleCollapsed ? '(클릭하여 펼치기)' : '(클릭하여 접기)'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {loadingExamples && (
                                <span style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className="loading-pulse-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6' }}></span> 업데이트 중...
                                </span>
                            )}
                            {isExampleCollapsed ? (
                                <ChevronDown size={16} style={{ color: '#64748B' }} />
                            ) : (
                                <ChevronUp size={16} style={{ color: '#64748B' }} />
                            )}
                        </div>
                    </div>

                    {!isExampleCollapsed && (
                        <>
                            {/* 예시 탭 버튼 바 (텍스트 링크 방식) */}
                            <div style={{ display: 'flex', gap: '12px', padding: '8px 16px', borderBottom: '1px solid #F1F5F9', background: '#FFFFFF', flexWrap: 'wrap', flexShrink: 0 }}>
                                {[
                                    { id: 0, label: '① 교차표 (그룹·통계)' },
                                    { id: 1, label: '② 단순 교차표' },
                                    { id: 2, label: '③ 빈도표' }
                                ].map((item, idx) => {
                                    const isActive = activeExampleIdx === idx;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveExampleIdx(idx)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                fontSize: '11px',
                                                fontWeight: isActive ? 700 : 500,
                                                color: isActive ? '#2563EB' : '#64748B',
                                                cursor: 'pointer',
                                                padding: '2px 4px',
                                                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                                                transition: 'all 0.15s ease',
                                                outline: 'none',
                                                userSelect: 'none'
                                            }}
                                        >
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="dp-setting-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px', overflowX: 'auto', background: settings.render.theme_bg || '#FFFFFF', borderRadius: '0 0 8px 8px', position: 'relative' }}>
                                <iframe
                                    ref={exampleIframeRef}
                                    srcDoc={INITIAL_IFRAME_DOC}
                                    style={{ width: '100%', flex: 1, minHeight: 0, border: 'none', opacity: loadingExamples ? 0.6 : 1, transition: 'opacity 0.2s' }}
                                    title="example-preview"
                                />
                            </div>
                        </>
                    )}
                </div>

            </div>

            {/* 오른쪽 구획: 테마 프리셋 & 3단 설정 카드 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '0' }}>

                {/* 1.5 빠른 프리셋 */}
                <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                        <Palette size={15} color="#64748B" /> 빠른 테마 프리셋
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', flex: 1, justifyContent: 'flex-end', marginLeft: '16px' }}>
                        {TABLE_THEME_PRESETS.map(preset => (
                            <button
                                key={preset.label}
                                style={{ fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', cursor: 'pointer', background: preset.bg, color: preset.fg, border: preset.border ? `1px solid ${preset.border}` : 'none', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
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

                {/* 서브 설정 탭 분리 - Pill 스타일 세그먼트 컨트롤 */}
                <div style={{
                    display: 'flex',
                    background: '#F1F5F9',
                    borderRadius: '8px',
                    padding: '3px',
                    marginBottom: '0px',
                    gap: '4px',
                    border: '1px solid #E2E8F0'
                }}>
                    {[
                        { id: 'policy', label: '표시 정책 & 자릿수', icon: <Layout size={16} /> },
                        { id: 'fontColor', label: '글꼴 & 색상', icon: <Palette size={16} /> },
                        { id: 'border', label: '구분선 스타일', icon: <Type size={16} /> }
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: isActive ? '#FFFFFF' : 'transparent',
                                    fontSize: '13px',
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? '#2563EB' : '#475569',
                                    boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease-in-out',
                                    whiteSpace: 'nowrap',
                                    outline: 'none',
                                    userSelect: 'none'
                                }}
                            >
                                <span style={{ color: isActive ? '#2563EB' : '#64748B', display: 'flex', alignItems: 'center' }}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* 2-1. 테이블 표시 정책 */}
                {activeTab === 'policy' && (
                    <div className="dp-setting-card" style={{ flex: 1, background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
                        <div className="dp-setting-card-body" style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '10px' }}>기본 표시 여부</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {/* 1행: 빈도/비율 표시 (2분할) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {[
                                            { label: '빈도 기본 표시', field: 'show_n' },
                                            { label: '비율 기본 표시', field: 'show_percent' }
                                        ].map(item => (
                                            <div
                                                key={item.field}
                                                onClick={() => toggleDisplay(item.field)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', userSelect: 'none', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 14px', borderRadius: '6px' }}
                                            >
                                                <div style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '3px', background: settings.display[item.field] ? '#3B82F6' : '#fff', border: settings.display[item.field] ? '1px solid #3B82F6' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {settings.display[item.field] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                </div>
                                                <span style={{ fontWeight: 500, fontSize: '12px' }}>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 2행: 나머지 2개 (2분할) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {[
                                            { label: '엑셀 출력 % 기호 부착', field: 'percent_symbol' },
                                            { label: 'Base 기본 (괄호)', field: 'show_base_parenthesis' }
                                        ].map(item => (
                                            <div
                                                key={item.field}
                                                onClick={() => toggleDisplay(item.field)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', userSelect: 'none', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 14px', borderRadius: '6px' }}
                                            >
                                                <div style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '3px', background: settings.display[item.field] ? '#3B82F6' : '#fff', border: settings.display[item.field] ? '1px solid #3B82F6' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {settings.display[item.field] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                </div>
                                                <span style={{ fontWeight: 500, fontSize: '12px' }}>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 3행: 값 0 숨김 관련 3개 (3분할) - 가장 밑줄 */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                        {[
                                            { label: '값 0 행(스터브) 숨기기', field: 'hide_zero_stubs' },
                                            { label: '값 0 열(배너) 숨기기', field: 'hide_zero_banners' },
                                            { label: 'Base=0 컬럼 숨기기', field: 'hide_zero_base_columns' }
                                        ].map(item => (
                                            <div
                                                key={item.field}
                                                onClick={() => toggleDisplay(item.field)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', userSelect: 'none', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 14px', borderRadius: '6px' }}
                                            >
                                                <div style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '3px', background: settings.display[item.field] ? '#3B82F6' : '#fff', border: settings.display[item.field] ? '1px solid #3B82F6' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {settings.display[item.field] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                </div>
                                                <span style={{ fontWeight: 500, fontSize: '12px' }}>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '10px' }}>소수점 자릿수</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {[
                                        { label: '빈도 (N)', field: 'n_digits' },
                                        { label: '비율 (%)', field: 'percent_digits' },
                                        { label: '평균 (Mean)', field: 'mean_digits' },
                                        { label: '표준편차 (Std)', field: 'std_digits' },
                                        { label: '중앙값 (Median)', field: 'median_digits' },
                                        { label: '분산 (Var)', field: 'var_digits' },
                                        { label: '최소값 (Min)', field: 'min_digits' },
                                        { label: '최대값 (Max)', field: 'max_digits' }
                                    ].map((item) => {
                                        const val = settings.display[item.field] || 0;
                                        return (
                                            <div key={item.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#F1F5F9', borderRadius: '6px' }}>
                                                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{item.label}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '4px', border: '1px solid #CBD5E1', overflow: 'hidden' }}>
                                                    <button onClick={() => handleChange(`display.${item.field}`, Math.max(0, val - 1))} style={{ width: '22px', height: '22px', background: '#F8FAFC', border: 'none', borderRight: '1px solid #CBD5E1', cursor: 'pointer', fontWeight: 'bold' }}>−</button>
                                                    <div style={{ width: '24px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>{val}</div>
                                                    <button onClick={() => handleChange(`display.${item.field}`, Math.min(13, val + 1))} style={{ width: '22px', height: '22px', background: '#F8FAFC', border: 'none', borderLeft: '1px solid #CBD5E1', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '10px' }}>레이아웃 설정</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>스터브 그룹 레이아웃</span>
                                        <select
                                            value={settings.render.stub_group_layout || 'merge'}
                                            onChange={(e) => handleChange('render.stub_group_layout', e.target.value)}
                                            style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none', background: '#fff' }}
                                        >
                                            <option value="merge">라벨 셀 병합</option>
                                            <option value="row">라벨 셀 분할</option>
                                        </select>
                                    </div>
                                    <div
                                        onClick={() => handleChange('render.format_percent_as_column', !settings.render.format_percent_as_column)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', userSelect: 'none', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 14px', borderRadius: '6px' }}
                                    >
                                        <div style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '3px', background: settings.render.format_percent_as_column ? '#3B82F6' : '#fff', border: settings.render.format_percent_as_column ? '1px solid #3B82F6' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {settings.render.format_percent_as_column && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                        </div>
                                        <span style={{ fontWeight: 500, fontSize: '12px' }}>N/% 가로 분리 표시 (열 분할)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2-2. 글꼴/색상 설정 */}
                {activeTab === 'fontColor' && (
                    <div className="dp-setting-card" style={{ flex: 1, background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
                        <div className="dp-setting-card-body" style={{ flex: 1, padding: '18px 20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '10px' }}>전역 글꼴 설정</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>글꼴 종류</label>
                                            <select
                                                value={settings.render.font_family || "Arial, sans-serif"}
                                                onChange={(e) => handleChange('render.font_family', e.target.value)}
                                                style={{ flex: 1, padding: '5px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none', height: '32px' }}
                                            >
                                                <option value="'Spoqa Han Sans Neo', 'SpoqaHanSansNeo', sans-serif">Spoqa Han Sans Neo</option>
                                                <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
                                                <option value="'Apple SD Gothic Neo', sans-serif">Apple SD Gothic Neo</option>
                                                <option value="Arial, sans-serif">Arial</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>글꼴 크기</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '0 8px', background: '#fff', width: '90px', boxSizing: 'border-box', height: '32px' }}>
                                                <input type="number" value={settings.render.font_size || 12} onChange={(e) => handleChange('render.font_size', Number(e.target.value))} style={{ width: '100%', padding: '5px 0', fontSize: '12px', border: 'none', outline: 'none', textAlign: 'center' }} />
                                                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>px</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '10px' }}>영역별 글꼴 설정</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                        {[
                                            { label: '헤더 글꼴', field: 'theme_header_font' },
                                            { label: '스터브 글꼴', field: 'theme_stub_font' },
                                            { label: '데이터 글꼴', field: 'theme_data_font' }
                                        ].map(item => (
                                            <div key={item.field} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{item.label}</label>
                                                <select
                                                    value={settings.render[item.field] || ""}
                                                    onChange={(e) => handleChange(`render.${item.field}`, e.target.value)}
                                                    style={{ flex: 1, padding: '5px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none', height: '32px' }}
                                                >
                                                    <option value="">기본 글꼴 상속</option>
                                                    <option value="'Spoqa Han Sans Neo', 'SpoqaHanSansNeo', sans-serif">Spoqa Han Sans Neo</option>
                                                    <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
                                                    <option value="'Apple SD Gothic Neo', sans-serif">Apple SD Gothic Neo</option>
                                                    <option value="Arial, sans-serif">Arial</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '10px' }}>영역별 테마 색상 설정</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', columnGap: '16px', rowGap: '8px' }}>
                                        {[
                                            { label: '헤더 상단 배경', field: 'theme_primary' },
                                            { label: '헤더 상단 글자', field: 'theme_primary_fg' },
                                            { label: '헤더 그룹 배경', field: 'theme_header_group_bg' },
                                            { label: '헤더 그룹 글자', field: 'theme_header_group_fg' },
                                            { label: '구분 헤더 배경', field: 'theme_stub_header_bg' },
                                            { label: '구분 헤더 글자', field: 'theme_stub_header_fg' },
                                            { label: '스터브 구분 배경', field: 'theme_stub_group_bg' },
                                            { label: '스터브 구분 글자', field: 'theme_stub_group_fg' },
                                            { label: '스터브 항목 배경', field: 'theme_stub_leaf_bg' },
                                            { label: '스터브 항목 글자', field: 'theme_stub_leaf_fg' },
                                            { label: '본문 배경', field: 'theme_bg' },
                                            { label: '교차 행 배경', field: 'theme_stripe' },
                                            { label: '본문 글자', field: 'theme_text' },
                                            { label: '보조 글자', field: 'theme_text_muted' },
                                            { label: 'Base 행 배경', field: 'theme_base_bg' },
                                            { label: 'Base 행 글자', field: 'theme_base_fg' },
                                            { label: '통계 행 배경', field: 'theme_etc_bg' },
                                            { label: '통계 행 글자', field: 'theme_etc_fg' },
                                        ].map((item) => (
                                            <div key={item.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '4px', paddingTop: '4px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{item.label}</label>
                                                <ColorInput
                                                    value={settings.render[item.field] || ''}
                                                    onChange={(val) => handleChange(`render.${item.field}`, val)}
                                                    width="95px"
                                                    textWidth="55px"
                                                    padding="2px 4px"
                                                    gap="4px"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2-3. 선 스타일 설정 */}
                {activeTab === 'border' && (
                    <div className="dp-setting-card" style={{ flex: 1, background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
                        <div className="dp-setting-card-body" style={{ flex: 1, padding: '18px 20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ marginBottom: '4px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '10px' }}>표 외곽선 설정</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '12px', rowGap: '8px', alignContent: 'start' }}>
                                        {[
                                            { group: '표 최상단 선', prefix: 'theme_table_outer_top', color: 'theme_table_outer_top_color', style: 'theme_table_outer_top_style', width: 'theme_table_outer_top_width' },
                                            { group: '표 외곽선 (하단)', prefix: 'theme_table_outer_bottom', color: 'theme_table_outer_bottom_color', style: 'theme_table_outer_bottom_style', width: 'theme_table_outer_bottom_width' },
                                            { group: '표 외곽선 (좌측)', prefix: 'theme_table_outer_left', color: 'theme_table_outer_left_color', style: 'theme_table_outer_left_style', width: 'theme_table_outer_left_width' },
                                            { group: '표 외곽선 (우측)', prefix: 'theme_table_outer_right', color: 'theme_table_outer_right_color', style: 'theme_table_outer_right_style', width: 'theme_table_outer_right_width' },
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
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '12px',
                                                        padding: '8px 12px',
                                                        border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                                                        borderRadius: '8px',
                                                        background: 'transparent',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        boxShadow: isSelected ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#2563EB' : '#475569', whiteSpace: 'nowrap' }}>{g.group}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                                        <ColorInput
                                                            value={settings.render[g.color] || ''}
                                                            onChange={(val) => handleChange(`render.${g.color}`, val)}
                                                            width="105px"
                                                            textWidth="65px"
                                                            padding="3px 6px"
                                                            gap="6px"
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
                                                            width="60px"
                                                            padding="0 8px"
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
                                                                style={{ width: '36px', padding: '4px 6px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
                                                                title="두께(숫자)"
                                                            />
                                                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>px</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '10px' }}>표 내부 구분선 설정</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '12px', rowGap: '8px', alignContent: 'start' }}>
                                        {[
                                            { group: '헤더 최하단 구분선', prefix: 'theme_header_divider', color: 'theme_header_divider_color', style: 'theme_header_divider_style', width: 'theme_header_divider_width' },
                                            { group: '헤더 단 구분선(상위·중위 사이)', prefix: 'theme_header_tier_divider', color: 'theme_header_tier_divider_color', style: 'theme_header_tier_divider_style', width: 'theme_header_tier_divider_width' },
                                            { group: '스터브 끝 구분선', prefix: 'theme_stub_divider', color: 'theme_stub_divider_color', style: 'theme_stub_divider_style', width: 'theme_stub_divider_width' },
                                            { group: '스터브 계층선', prefix: 'theme_stub_tier_divider', color: 'theme_stub_tier_divider_color', style: 'theme_stub_tier_divider_style', width: 'theme_stub_tier_divider_width' },
                                            { group: '섹션 위쪽 구분선', prefix: 'theme_section_separator', color: 'theme_section_separator_color', style: 'theme_section_separator_style', width: 'theme_section_separator_width' },
                                            { group: '데이터 기본선', prefix: 'theme_grid', color: 'theme_grid_color', style: 'theme_grid_style', width: 'theme_grid_width' },
                                            { group: '배너 그룹 경계선', prefix: 'theme_banner_divider', color: 'theme_banner_divider_color', style: 'theme_banner_divider_style', width: 'theme_banner_divider_width' },
                                            { group: '열 구분선(배너 그룹 내)', prefix: 'theme_data_col_divider', color: 'theme_data_col_divider_color', style: 'theme_data_col_divider_style', width: 'theme_data_col_divider_width' },
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
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '12px',
                                                        padding: '8px 12px',
                                                        border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                                                        borderRadius: '8px',
                                                        background: 'transparent',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        boxShadow: isSelected ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#2563EB' : '#475569', whiteSpace: 'nowrap' }}>{g.group}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                                        <ColorInput
                                                            value={settings.render[g.color] || ''}
                                                            onChange={(val) => handleChange(`render.${g.color}`, val)}
                                                            width="105px"
                                                            textWidth="65px"
                                                            padding="3px 6px"
                                                            gap="6px"
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
                                                            width="60px"
                                                            padding="0 8px"
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
                                                                style={{ width: '36px', padding: '4px 6px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
                                                                title="두께(숫자)"
                                                            />
                                                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>px</span>
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
                )}
            </div>

        </div>
    );
};

export default TableSettingTab;
