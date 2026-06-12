import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Settings, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, Wand2, Plus, Copy, ChevronDown, ChevronUp, Sparkles, Table2, BarChart3, Cloud, BarChart2, BarChartHorizontal, LineChart, PieChart, Donut, AreaChart, LayoutGrid, Radar, Layers, Percent, Filter, Aperture, MoveVertical, MoreHorizontal, Waves, GitCommitVertical, Target, X, Download, Check, LayoutList, Loader2 } from 'lucide-react';
import { Popup } from '@progress/kendo-react-popup';
import { DpRequestPageApi } from '../dpRequest/DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import KendoChart from '../../../components/KendoChart';
import '../../frequency/FrequencyAnalysisPage.css';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { saveAs } from '@progress/kendo-file-saver';
import { CHART_THEME_OPTIONS } from '../../../constants/chartThemes';
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import DataHeader from "@/services/dataStatus/components/DataHeader";
import { DropDownList } from '@progress/kendo-react-dropdowns';
import Toast from '@/components/common/Toast';

// --- 상수 ---
const CROSS_FILTER_ALL_ID = "__all__";

const formatCountValue = (val, policy) => {
    if (val === null || val === undefined || val === '') return '-';
    const digits = policy?.n_digits ?? 0;
    return Number(val).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const formatPercentValue = (val, policy) => {
    if (val === null || val === undefined || val === '') return '-';
    const digits = policy?.percent_digits ?? 1;
    return Number(val).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const buildColumnHeaderGroups = (columns, key) => {
    const groups = [];
    columns.forEach((column, index) => {
        const label = String(column[key] ?? "").trim();
        const currentGroup = groups[groups.length - 1];
        if (currentGroup && currentGroup.label === label) {
            currentGroup.span += 1;
            return;
        }
        groups.push({ label, startIndex: index, span: 1 });
    });
    return groups;
};

const toRechartsData = (resultjson, activeDataType) => {
    if (!resultjson) return { data: [], series: [] };
    const labels = resultjson.labels || [];
    const seriesList = resultjson.series || [];

    // Series represent the stubs (rows)
    const series = labels.map(lbl => {
        return {
            field: String(lbl.key),
            name: lbl.label || lbl.key
        };
    });

    // Data points represent the banner columns
    const data = seriesList.map(s => {
        const nameParts = [s.label3, s.label2, s.label]
            .map(p => String(p || '').trim())
            .filter(Boolean);
        const fullLabel = nameParts.reverse().join('\n');

        const item = {
            label: fullLabel,
            name: fullLabel,
            rawSeries: s
        };

        labels.forEach(lbl => {
            const valArr = activeDataType === 'percent' ? s.percent : s.count;
            item[String(lbl.key)] = valArr ? valArr[lbl.key] ?? valArr[labels.indexOf(lbl)] : null;
        });

        return item;
    });

    return { data, series };
};

const CrossTableGrid = React.memo(({ dataItem, showN, showPct, decimalN, decimalPct, uiSettings, hideZeroBaseColumns }) => {
    if (!dataItem) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>선택된 표가 없습니다. 좌측에서 항목을 선택해주세요.</div>;

    const resultData = dataItem.dataResult || {};
    const rawColumns = resultData.columns || [];
    const rows = resultData.rows || [];

    const columns = rawColumns;

    const effectivePolicy = {
        n_digits: decimalN === '' ? 0 : decimalN,
        percent_digits: decimalPct === '' ? 1 : decimalPct,
        mean_digits: uiSettings?.mean_digits ?? 2,
        std_digits: uiSettings?.std_digits ?? 2,
        median_digits: uiSettings?.median_digits ?? 2,
        min_digits: uiSettings?.min_digits ?? 0,
        max_digits: uiSettings?.max_digits ?? 0,
        var_digits: uiSettings?.var_digits ?? 2,
    };

    const showLabel3Header = columns.some(c => String(c.label3 ?? "").trim());
    const showLabel2Header = columns.some(c => String(c.label2 ?? "").trim());

    const showRowLabel3 = rows.some(r => String(r.label3 ?? "").trim());
    const showRowLabel2 = rows.some(r => String(r.label2 ?? "").trim());

    const rowSpansL3 = {};
    const rowSpansL2 = {};

    if (showRowLabel3 || showRowLabel2) {
        let i = 0;
        while (i < rows.length) {
            let j = i + 1;
            while (j < rows.length && rows[j].label3 === rows[i].label3) j++;
            rowSpansL3[i] = j - i;
            i = j;
        }

        i = 0;
        while (i < rows.length) {
            let j = i + 1;
            while (j < rows.length && rows[j].label3 === rows[i].label3 && rows[j].label2 === rows[i].label2) j++;
            rowSpansL2[i] = j - i;
            i = j;
        }
    }

    const label3Groups = showLabel3Header ? buildColumnHeaderGroups(columns, "label3") : [];
    const label2Groups = showLabel2Header ? buildColumnHeaderGroups(columns, "label2") : [];
    const hasGroupedHeaders = showLabel3Header || showLabel2Header;

    const headerRowCount = 1 + (showLabel3Header ? 1 : 0) + (showLabel2Header ? 1 : 0);

    const headerBorder = `${uiSettings?.theme_header_divider_width || '1px'} ${uiSettings?.theme_header_divider_style || 'solid'} ${uiSettings?.theme_header_divider_color || '#cbd5e1'}`;
    const stubBorder = `${uiSettings?.theme_stub_divider_width || '1px'} ${uiSettings?.theme_stub_divider_style || 'solid'} ${uiSettings?.theme_stub_divider_color || '#cbd5e1'}`;
    const gridBorder = `${uiSettings?.theme_grid_width || '1px'} ${uiSettings?.theme_grid_style || 'solid'} ${uiSettings?.theme_grid_color || '#e2e8f0'}`;
    const sectionBorder = `${uiSettings?.theme_section_separator_width || '2px'} ${uiSettings?.theme_section_separator_style || 'dashed'} ${uiSettings?.theme_section_separator_color || '#000'}`;

    // new outer edge logic
    const topOuter = `${uiSettings?.theme_table_outer_top_width || '0px'} ${uiSettings?.theme_table_outer_top_style || 'none'} ${uiSettings?.theme_table_outer_top_color || 'transparent'}`;
    const bottomOuter = `${uiSettings?.theme_table_outer_bottom_width || '0px'} ${uiSettings?.theme_table_outer_bottom_style || 'none'} ${uiSettings?.theme_table_outer_bottom_color || 'transparent'}`;
    const leftOuter = `${uiSettings?.theme_table_outer_left_width || '0px'} ${uiSettings?.theme_table_outer_left_style || 'none'} ${uiSettings?.theme_table_outer_left_color || 'transparent'}`;
    const rightOuter = `${uiSettings?.theme_table_outer_right_width || '0px'} ${uiSettings?.theme_table_outer_right_style || 'none'} ${uiSettings?.theme_table_outer_right_color || 'transparent'}`;

    if (columns.length === 0 && rows.length === 0) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                <span>API 응답 데이터 구조 확인 필요 (결과 데이터 없음)</span>
                <span style={{ fontSize: '12px', marginTop: '4px' }}>(선택된 X 기준변수와 매칭되는 교차표 값이 비어있습니다)</span>
            </div>
        );
    }

    return (
        <div style={{
            height: '100%',
            overflow: 'auto',
            background: uiSettings?.theme_bg || '#fff',
            fontFamily: uiSettings?.font_family || 'inherit',
        }} className="dp-table-container">
            <style>{`
                .dp-table-container {
                    padding: 0 !important;
                }
                .dp-html-table th {
                    border-right: ${gridBorder};
                    padding: 2px 4px !important;
                }
                .dp-html-table td {
                    border-right: ${gridBorder};
                    border-bottom: ${gridBorder};
                    padding: 2px 4px !important;
                }
                .dp-html-table .stub-header,
                .dp-html-table .stub-cell {
                    position: sticky !important;
                    
                    z-index: 100 !important;
                    background-color: ${uiSettings?.theme_stub_header_bg || '#D9E1F2'} !important;
                    border-right: ${stubBorder} !important;
                    margin: 0 !important;
                    padding: 0 !important; 
                    color: ${uiSettings?.theme_stub_header_fg || '#000'} !important;
                }
                .dp-html-table .stub-cell > div {
                    display: block !important;
                    width: 100% !important;
                    padding: 2px 4px !important;
                    box-sizing: border-box !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                .dp-html-table .stub-header {
                    z-index: 110 !important;
                    background-color: ${uiSettings?.theme_primary || '#f8fafc'} !important;
                    color: ${uiSettings?.theme_primary_fg || 'inherit'} !important;
                    border-bottom: ${headerBorder} !important;
                    border-right: ${stubBorder} !important;
                }
                /* 막기용 의사 요소 */
                .dp-html-table .stub-header::before,
                .dp-html-table .stub-header::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    z-index: -1;
                    background-color: inherit;
                }
                
                /* Outer Edge Borders */
                .dp-html-table {
                    border-top: ${topOuter} !important;
                    border-bottom: ${bottomOuter} !important;
                    border-left: ${leftOuter} !important;
                    border-right: ${rightOuter} !important;
                }
            `}</style>
            <table className="dp-html-table" style={{
                width: 'max-content',
                borderCollapse: 'separate',
                borderSpacing: 0,
                margin: 0,
                padding: 0,
                fontSize: uiSettings?.font_size ? `${uiSettings.font_size}px` : '12px',
                tableLayout: 'fixed',
                color: uiSettings?.theme_text || '#0f172a'
            }}>
                <colgroup>
                    {showRowLabel3 && <col style={{ width: '110px' }} />}
                    {showRowLabel2 && <col style={{ width: '110px' }} />}
                    <col style={{ width: '110px' }} />
                    {columns.map((col, i) => (
                        <col key={col.key || i} style={{ width: col.width || '80px' }} />
                    ))}
                </colgroup>
                <thead style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    background: uiSettings?.theme_primary || '#f8fafc',
                    color: uiSettings?.theme_primary_fg || 'inherit'
                }}>
                    {showLabel3Header && (
                        <tr>
                            <th colSpan={(showRowLabel3 ? 1 : 0) + (showRowLabel2 ? 1 : 0) + 1} rowSpan={headerRowCount} className="stub-header" style={{ left: 0, padding: '3px 8px', fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', fontSize: uiSettings?.font_size ? `${uiSettings.font_size}px` : '12px' }}>구분</th>
                            {label3Groups.map((g, i) => (
                                <th key={`l3-${i}`} colSpan={g.span} style={{ borderLeft: i > 0 ? gridBorder : 'none', borderBottom: headerBorder, background: uiSettings?.theme_primary || '#f8fafc', color: uiSettings?.theme_primary_fg || 'inherit', padding: '3px 6px', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: uiSettings?.font_size ? `${uiSettings.font_size}px` : '12px' }}>{g.label || '\u00A0'}</th>
                            ))}
                        </tr>
                    )}
                    {showLabel2Header && (
                        <tr>
                            {!showLabel3Header && <th colSpan={(showRowLabel3 ? 1 : 0) + (showRowLabel2 ? 1 : 0) + 1} rowSpan={headerRowCount} className="stub-header" style={{ left: 0, padding: '8px', fontWeight: 700, textAlign: 'center', fontSize: uiSettings?.font_size ? `${uiSettings.font_size}px` : '12px' }}>구분</th>}
                            {label2Groups.map((g, i) => (
                                <th key={`l2-${i}`} colSpan={g.span} style={{ borderLeft: i > 0 ? gridBorder : 'none', borderBottom: headerBorder, background: uiSettings?.theme_primary || '#f8fafc', color: uiSettings?.theme_primary_fg || 'inherit', padding: '3px 6px', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: uiSettings?.font_size ? `${uiSettings.font_size}px` : '12px' }}>{g.label || '\u00A0'}</th>
                            ))}
                        </tr>
                    )}
                    <tr>
                        {(!showLabel2Header && !showLabel3Header) && <th colSpan={(showRowLabel3 ? 1 : 0) + (showRowLabel2 ? 1 : 0) + 1} className="stub-header" style={{ left: 0, padding: '8px', fontWeight: 700, textAlign: 'center', fontSize: uiSettings?.font_size ? `${uiSettings.font_size}px` : '12px' }}>구분</th>}
                        {columns.map((col, i) => {
                            const columnTotal = col.column_total ?? col.total ?? null;
                            return (
                                <th key={col.key || i} style={{ borderLeft: i > 0 ? gridBorder : 'none', borderBottom: headerBorder, background: uiSettings?.theme_primary || '#f8fafc', color: uiSettings?.theme_primary_fg || 'inherit', padding: '3px 8px', fontWeight: 500, textAlign: 'center', verticalAlign: 'middle', fontSize: uiSettings?.font_size ? `${uiSettings.font_size}px` : '12px' }}>
                                    <div style={{ lineHeight: 1.1, fontSize: uiSettings?.font_size ? `${uiSettings.font_size}px` : '12px' }}>{col.label}</div>
                                    {/* {columnTotal !== null && <div style={{ fontSize: uiSettings?.font_size ? `${Math.max(8, uiSettings.font_size - 2)}px` : '10px', color: uiSettings?.theme_primary_fg ? 'rgba(255,255,255,0.7)' : '#64748b', fontWeight: 400, lineHeight: 1, marginTop: '1px' }}>total {formatCountValue(columnTotal, effectivePolicy)}</div>} */}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => {
                        // Find matching info item
                        const infoItem = dataItem?.raw?.info?.find(item => item.label === row.label || item.key === row.key) || {};
                        const customColor = infoItem.color;
                        const customLine = infoItem.line;

                        // 이전 행이 커스텀 구분선을 가졌는지 확인 (중복 테두리 방지)
                        let prevHasCustomLine = false;
                        if (rowIndex > 0) {
                            const prevRow = rows[rowIndex - 1];
                            const prevInfoItem = dataItem?.raw?.info?.find(item => item.label === prevRow.label || item.key === prevRow.key) || {};
                            if (prevInfoItem.line && prevInfoItem.line !== 'none') {
                                prevHasCustomLine = true;
                            }
                        }

                        const isBaseRow = String(row.row_role ?? "").toLowerCase() === "base";
                        const isSectionAgg = ['top', 'bottom', 'mean', 'std'].some(role => String(row.row_role ?? "").toLowerCase().includes(role));

                        const defaultRowBg = (rowIndex % 2 === 1 ? (uiSettings?.theme_bg_alt || uiSettings?.theme_stripe || '#fafafa') : (uiSettings?.theme_bg || '#fff'));
                        const rowBg = customColor || defaultRowBg;
                        const stubBg = customColor || uiSettings?.theme_stub_header_bg || '#D9E1F2';

                        let customTopBorderAttr = undefined;
                        if (customLine && customLine !== 'none') {
                            const lineStyle = customLine === 'thick' ? 'solid' : customLine;
                            const lineWidth = customLine === 'double' ? '3px' : '2px';
                            customTopBorderAttr = `${lineWidth} ${lineStyle} #475569`; // 프리뷰와 동일한 진한 색상 사용
                        }

                        const topBorderAttr = customTopBorderAttr || (isBaseRow ? 'none' : (isSectionAgg ? sectionBorder : (prevHasCustomLine ? 'none' : gridBorder)));

                        return (
                            <tr key={row.key || rowIndex} style={{
                                background: rowBg,
                                color: uiSettings?.theme_text || 'inherit'
                            }}>
                                {showRowLabel3 && rowSpansL3[rowIndex] !== undefined && (
                                    <td className="stub-cell" rowSpan={rowSpansL3[rowIndex]} style={{
                                        borderTop: topBorderAttr,
                                        borderRight: gridBorder,
                                        background: stubBg,
                                        color: uiSettings?.theme_stub_header_fg || '#000',
                                        padding: 0,
                                        left: 0,
                                        minWidth: '110px', width: '110px', maxWidth: '110px'
                                    }}>
                                        <div title={row.label3} style={{ textAlign: 'center', }}>
                                            {row.label3}
                                        </div>
                                    </td>
                                )}
                                {showRowLabel2 && rowSpansL2[rowIndex] !== undefined && (
                                    <td className="stub-cell" rowSpan={rowSpansL2[rowIndex]} style={{
                                        borderTop: topBorderAttr,
                                        borderRight: gridBorder,
                                        background: stubBg,
                                        color: uiSettings?.theme_stub_header_fg || '#000',
                                        padding: 0,
                                        left: showRowLabel3 ? '110px' : 0,
                                        minWidth: '110px', width: '110px', maxWidth: '110px'
                                    }}>
                                        <div title={row.label2} style={{ textAlign: 'center', }}>
                                            {row.label2}
                                        </div>
                                    </td>
                                )}
                                <td className="stub-cell" style={{
                                    borderTop: topBorderAttr,
                                    background: stubBg,
                                    color: uiSettings?.theme_stub_header_fg || '#000',
                                    padding: 0,
                                    left: (showRowLabel3 ? 110 : 0) + (showRowLabel2 ? 110 : 0) + 'px'
                                }}>
                                    <div title={row.label} style={{
                                        lineHeight: 1.2,
                                        padding: '2px 8px',
                                        paddingLeft: row.indent ? '24px' : '8px',
                                        fontSize: uiSettings?.font_size ? `${uiSettings.font_size}px` : '12px',
                                        textAlign: 'center'
                                    }}>{row.label}</div>
                                </td>
                                {columns.map((col, i) => {
                                    const cell = row.cells?.[col.key] || resultData.data?.[row.key]?.[col.key];
                                    if (!cell || (typeof cell !== 'object' && cell === '')) return <td key={col.key} style={{ borderTop: topBorderAttr, borderLeft: i > 0 ? gridBorder : 'none', padding: '2px 8px', textAlign: 'right', color: uiSettings?.theme_text_muted || '#cbd5e1' }}>-</td>;

                                    let valN = cell.count ?? cell.n ?? null;
                                    let valP = cell.percent ?? cell.pct ?? null;
                                    let singleVal = (valN === null && valP === null) ? cell.value ?? cell : null;

                                    const isBaseCell = cell.is_base || isBaseRow || String(cell.cell_type ?? "").toLowerCase() === "base";

                                    let formattedSingleVal = singleVal;
                                    if (singleVal !== null && typeof singleVal !== 'object') {
                                        const statType = String(row.stat_type || row.type || "").toLowerCase();
                                        const role = String(row.row_role || "").toLowerCase();
                                        if (role === 'stat' || ['mean', 'std', 'median', 'min', 'max', 'var'].includes(statType)) {
                                            const digitsKey = `${statType}_digits`;
                                            const digits = effectivePolicy[digitsKey] ?? 1;
                                            formattedSingleVal = Number(singleVal).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
                                        } else {
                                            formattedSingleVal = String(singleVal);
                                        }
                                    }

                                    return (
                                        <td key={col.key} style={{
                                            borderTop: topBorderAttr,
                                            borderLeft: i > 0 ? gridBorder : 'none',
                                            padding: '2px 8px',
                                            textAlign: 'right'
                                        }}>
                                            {valN !== null && (showN || isBaseCell) && (
                                                <div style={{
                                                    fontSize: uiSettings?.font_size ? `${uiSettings.font_size}px` : '12px',
                                                    fontWeight: 500,
                                                    color: uiSettings?.theme_text || 'inherit'
                                                }}>
                                                    {isBaseCell ? (row.prefix || infoItem.prefix || '') : ''}
                                                    {formatCountValue(valN, effectivePolicy)}
                                                    {isBaseCell ? (row.postfix || infoItem.postfix || '') : ''}
                                                </div>
                                            )}
                                            {valP !== null && showPct && !isBaseCell && (
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: uiSettings?.theme_text_muted || '#64748b',
                                                    marginTop: '-2px'
                                                }}>{formatPercentValue(valP, effectivePolicy)}%</div>
                                            )}
                                            {singleVal !== null && typeof singleVal !== 'object' && (
                                                <div style={{ fontSize: uiSettings?.font_size ? `${uiSettings.font_size}px` : '12px' }}>
                                                    {row.prefix || infoItem.prefix || ''}
                                                    {formattedSingleVal}
                                                    {row.postfix || infoItem.postfix || ''}
                                                </div>
                                            )}
                                            {singleVal === null && valN === null && valP === null && <span style={{ color: uiSettings?.theme_text_muted || '#cbd5e1' }}>-</span>}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
});

// --- 커스텀 헤더 셀 (조건 아이콘) ---
const ConditionHeaderCell = (props) => {
    const anchorRef = useRef(null);
    const [show, setShow] = useState(false);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>{props.title}</span>
            <div
                ref={anchorRef}
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                style={{ cursor: 'pointer', display: 'flex' }}
                onClick={(e) => e.stopPropagation()}
            >
                <Info size={14} color="#94a3b8" />
            </div>

            <Popup
                anchor={anchorRef.current}
                show={show}
                animate={false}
                popupClass="condition-tooltip-popup"
                style={{ zIndex: 100000 }} // Grid header 위에 잘 보이도록 z-index 높임
            >
                <div style={{
                    padding: '12px 16px',
                    background: '#ffffff',
                    width: 'max-content',
                    minWidth: '160px',
                    lineHeight: '1.6',
                    color: '#334155',
                    textAlign: 'left' // 헤더 중앙정렬 영향을 받지 않도록 분리
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <div style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#e2e8f0', color: '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px',
                        }}>i</div>
                        <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '13px' }}>조건</span>
                    </div>
                    <div style={{ fontSize: '13px', letterSpacing: '-0.3px', marginLeft: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><span style={{ fontWeight: 600 }}>• 동등 대조:</span> <span>GENDER == 1, REGION == 'A'</span></div>
                        <div><span style={{ fontWeight: 600 }}>• 비교 대조:</span> <span>AGE &gt;= 20, AGE &lt; 30</span></div>
                        <div><span style={{ fontWeight: 600 }}>• IN 연산:</span> <span>AGE_GROUP in [2, 3, 4]</span></div>
                        <div><span style={{ fontWeight: 600 }}>• 다중 조건:</span> <span>(SQ1 == 1 or SQ1 == 2) and SQ2 == 1</span></div>
                    </div>
                </div>
            </Popup>
        </div>
    );
};

const BannerBlock = React.memo(({ banner, index, isLast, showN, showPct, decimalN, decimalPct, uiSettings, projectNum, overviewPayload, userId, styleCss, evaluateChartData, selectedXInfo, filterExpression, defaultBannerId }) => {
    const [isAiSummaryOpen, setIsAiSummaryOpen] = useState(false);
    const [isGridOpen, setIsGridOpen] = useState(true);
    const [isChartOpen, setIsChartOpen] = useState(false);
    const [chartMode, setChartMode] = useState('column');
    const [paletteId, setPaletteId] = useState('default');
    const [selectedChartGroups, setSelectedChartGroups] = useState([]);
    const [showPercentSymbol, setShowPercentSymbol] = useState(false);

    const [aiSummaryData, setAiSummaryData] = useState("");
    const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
    const { getAiSummary, evaluateVariable } = DpRequestPageApi();

    useEffect(() => {
        setAiSummaryData("");
    }, [banner?.id, selectedXInfo, filterExpression, uiSettings?.weight_col]);

    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isChartOptionsOpen, setIsChartOptionsOpen] = useState(false);
    const [chartDataType, setChartDataType] = useState('percentage');
    const [showChartValues, setShowChartValues] = useState(true);
    const [showLegend, setShowLegend] = useState(false);
    const chartContainerRef = useRef(null);
    const downloadMenuRef = useRef(null);
    const paletteMenuRef = useRef(null);
    const filterMenuRef = useRef(null);
    const chartOptionsMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
                setShowDownloadMenu(false);
            }
            if (paletteMenuRef.current && !paletteMenuRef.current.contains(event.target)) {
                setIsPaletteMenuOpen(false);
            }
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
                setIsFilterMenuOpen(false);
            }
            if (chartOptionsMenuRef.current && !chartOptionsMenuRef.current.contains(event.target)) {
                setIsChartOptionsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const aiSummaryFetchingRef = useRef(false);

    useEffect(() => {
        if (!isAiSummaryOpen || !projectNum || !banner?.id) return;
        if (aiSummaryData || aiSummaryFetchingRef.current) return; // 이미 데이터가 있거나 로딩중이면 중지 (무한루프 방지)

        const fetchAiSummaryData = async () => {
            const pageId = sessionStorage.getItem('pageId');
            if (!pageId || !userId) return;

            try {
                aiSummaryFetchingRef.current = true;
                setIsAiSummaryLoading(true);

                const stub = [banner.id];
                let bannerVarList = [];
                if (selectedXInfo && selectedXInfo !== '__none__') {
                    bannerVarList = [selectedXInfo];
                } else if (banner.raw?.banner && (Array.isArray(banner.raw.banner) ? banner.raw.banner.length > 0 : String(banner.raw.banner).trim() !== '')) {
                    bannerVarList = Array.isArray(banner.raw.banner) ? banner.raw.banner : [banner.raw.banner];
                } else if (banner.raw?.banners && (Array.isArray(banner.raw.banners) ? banner.raw.banners.length > 0 : String(banner.raw.banners).trim() !== '')) {
                    bannerVarList = Array.isArray(banner.raw.banners) ? banner.raw.banners : [banner.raw.banners];
                } else if (columns && columns.length > 0) {
                    const colWithDunder = columns.find(c => c.key && c.key.includes('__'));
                    if (colWithDunder) {
                        bannerVarList = [colWithDunder.key.split('__')[0]];
                    }
                }

                if (!bannerVarList.length && defaultBannerId) {
                    bannerVarList = [defaultBannerId];
                }

                if (!stub.length || !bannerVarList.length) {
                    setAiSummaryData("요약할 데이터의 기준변수(Banner)를 지정해주세요.");
                    return;
                }

                const evalPayload = {
                    pageid: pageId,
                    user: userId,
                    table: {
                        id: banner.id,
                        stub,
                        banner: bannerVarList
                    },
                    weight_col: uiSettings?.weight_col || null,
                    filter_expression: filterExpression || ""
                };

                const evalRes = await evaluateVariable.mutateAsync(evalPayload);
                if (!evalRes || evalRes.success !== "777" || !evalRes.resultjson) {
                    setAiSummaryData("요약할 데이터의 로우 데이터를 가져오지 못했습니다.");
                    return;
                }

                const tablesItem = {
                    id: banner.id,
                    table_id: banner.id,
                    label: banner.label,
                    title: banner.label,
                    type: banner.raw?.type || 'single'
                };

                const resultsItem = {
                    table_id: banner.id,
                    result: evalRes.resultjson
                };

                const reqData = {
                    project_num: projectNum,
                    user: userId,
                    page_id: pageId,
                    table_id: banner.id,
                    model: "llm-gpt-oss-120b",
                    temperature: 0.2,
                    result_json: {
                        success: "777",
                        message: "OK",
                        resultjson: {
                            tables: [tablesItem],
                            results: [resultsItem]
                        }
                    }
                };

                const res = await getAiSummary.mutateAsync(reqData);

                if (String(res?.success) === "777" && res?.resultjson?.[banner.id]?.[0]?.result_data) {
                    setAiSummaryData(res.resultjson[banner.id][0].result_data);
                } else {
                    setAiSummaryData("요약 데이터를 불러오지 못했습니다.");
                }
            } catch (error) {
                console.error("AI Summary Error:", error);
                setAiSummaryData("요약 데이터를 불러오는 중 오류가 발생했습니다.");
            } finally {
                setIsAiSummaryLoading(false);
                aiSummaryFetchingRef.current = false;
            }
        };

        fetchAiSummaryData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAiSummaryOpen, banner?.id, projectNum, userId, selectedXInfo, filterExpression, defaultBannerId]);

    const getChartTypeName = (mode) => {
        const typeMap = {
            'column': 'column',
            'bar': 'bar',
            'stackedColumn': 'stacked_column',
            'stacked100Column': 'stacked_100_column',
            'line': 'line',
            'pie': 'pie',
            'donut': 'donut',
            'radarArea': 'radar',
            'funnel': 'funnel',
            'scatterPoint': 'scatter',
            'area': 'area',
            'heatmap': 'heatmap'
        };
        return typeMap[mode] || 'chart';
    };

    const handleDownload = async (format) => {
        if (!chartContainerRef.current) {
            alert('차트를 찾을 수 없습니다.');
            return;
        }

        try {
            const chartElement = chartContainerRef.current.querySelector('.k-chart');
            if (!chartElement) {
                alert('차트를 찾을 수 없습니다.');
                return;
            }

            const svgElement = chartElement.querySelector('svg');
            if (!svgElement) {
                alert('차트 SVG를 찾을 수 없습니다.');
                return;
            }

            const bbox = svgElement.getBBox();
            const viewBox = svgElement.getAttribute('viewBox');
            const rect = svgElement.getBoundingClientRect();

            const padding = 20;
            let width, height;
            let minX = 0, minY = 0;

            if (viewBox) {
                const [vx, vy, vbWidth, vbHeight] = viewBox.split(' ').map(Number);
                minX = vx;
                minY = vy;
                width = vbWidth;
                height = vbHeight;
            } else {
                minX = Math.min(0, bbox.x) - padding;
                minY = Math.min(0, bbox.y) - padding;
                width = Math.max(bbox.width, rect.width) + padding * 2;
                height = Math.max(bbox.height, rect.height) + padding * 2;
            }

            const clonedSvg = svgElement.cloneNode(true);
            let finalWidth = width;
            let finalHeight = height;

            const legendDiv = chartContainerRef.current.querySelector('.custom-kendo-legend');
            if (legendDiv) {
                const legendItems = Array.from(legendDiv.children);
                if (legendItems.length > 0) {
                    const canvasHelper = document.createElement('canvas');
                    const ctxWrapper = canvasHelper.getContext('2d');
                    ctxWrapper.font = '12px sans-serif';

                    const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    legendGroup.setAttribute('transform', `translate(${minX + 10}, ${minY + height + 15})`);

                    let curX = 0;
                    let curY = 0;
                    let maxLegendWidth = finalWidth - 20;

                    legendItems.forEach(item => {
                        const box = item.querySelector('div');
                        const span = item.querySelector('span');
                        if (!box || !span) return;

                        const color = box.style.backgroundColor;
                        const text = span.textContent || span.innerText || '';
                        const textWidth = ctxWrapper.measureText(text).width;
                        const itemWidth = 10 + 6 + textWidth + 16;

                        if (curX + itemWidth > maxLegendWidth && curX > 0) {
                            curX = 0;
                            curY += 20;
                        }

                        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        rect.setAttribute('x', curX);
                        rect.setAttribute('y', curY + 2);
                        rect.setAttribute('width', 10);
                        rect.setAttribute('height', 10);
                        rect.setAttribute('fill', color);
                        rect.setAttribute('rx', 2);

                        const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        textNode.setAttribute('x', curX + 16);
                        textNode.setAttribute('y', curY + 11);
                        textNode.setAttribute('font-size', '12px');
                        textNode.setAttribute('fill', item.style.opacity === '0.4' ? '#94a3b8' : '#334155');
                        textNode.setAttribute('font-family', 'sans-serif');
                        textNode.textContent = text;

                        legendGroup.appendChild(rect);
                        legendGroup.appendChild(textNode);

                        curX += itemWidth;
                    });

                    finalHeight += (curY + 30);
                    clonedSvg.appendChild(legendGroup);
                }
            }

            clonedSvg.setAttribute('viewBox', `${minX} ${minY} ${finalWidth} ${finalHeight}`);
            clonedSvg.setAttribute('width', finalWidth);
            clonedSvg.setAttribute('height', finalHeight);

            const svgString = new XMLSerializer().serializeToString(clonedSvg);

            if (format === 'svg') {
                const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const chartTypeName = getChartTypeName(chartMode);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `chart_${banner.id}_${chartTypeName}.svg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else if (format === 'png') {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    canvas.width = finalWidth * 2;
                    canvas.height = finalHeight * 2;
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        const chartTypeName = getChartTypeName(chartMode);
                        saveAs(blob, `chart_${banner.id}_${chartTypeName}.png`);
                    });
                };

                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
            }

            setShowDownloadMenu(false);
        } catch (error) {
            console.error('Chart export error:', error);
            alert('차트 다운로드 중 오류가 발생했습니다.');
        }
    };


    // Data extraction for chart
    const resultData = banner.dataResult || {};
    const columns = useMemo(() => resultData.columns || [], [resultData.columns]);
    const rows = useMemo(() => resultData.rows || [], [resultData.rows]);

    const [rawChartData, setRawChartData] = useState(null);
    const [isChartLoading, setIsChartLoading] = useState(false);

    useEffect(() => {
        const fetchChartData = async () => {
            if (!isChartOpen) return;
            if (!banner?.id) return;

            const stub = [banner.id];
            let bannerVarList = [];
            if (selectedXInfo && selectedXInfo !== '__none__') {
                bannerVarList = [selectedXInfo];
            } else if (banner.raw?.banner && (Array.isArray(banner.raw.banner) ? banner.raw.banner.length > 0 : String(banner.raw.banner).trim() !== '')) {
                bannerVarList = Array.isArray(banner.raw.banner) ? banner.raw.banner : [banner.raw.banner];
            } else if (banner.raw?.banners && (Array.isArray(banner.raw.banners) ? banner.raw.banners.length > 0 : String(banner.raw.banners).trim() !== '')) {
                bannerVarList = Array.isArray(banner.raw.banners) ? banner.raw.banners : [banner.raw.banners];
            } else if (columns && columns.length > 0) {
                const colWithDunder = columns.find(c => c.key && c.key.includes('__'));
                if (colWithDunder) {
                    bannerVarList = [colWithDunder.key.split('__')[0]];
                }
            }

            if (!bannerVarList.length && defaultBannerId) {
                bannerVarList = [defaultBannerId];
            }

            if (!stub.length || !bannerVarList.length) {
                console.warn("fetchChartData diagnostic - early return due to empty stub or bannerVarList", { stub, bannerVarList });
                setRawChartData(null);
                return;
            }

            try {
                setIsChartLoading(true);
                const pageId = sessionStorage.getItem('pageId');
                const payload = {
                    pageid: pageId,
                    user: userId,
                    table: {
                        id: banner.id,
                        stub,
                        banner: bannerVarList
                    },
                    weight_col: uiSettings?.weight_col || null,
                    filter_expression: filterExpression || ""
                };

                const res = await evaluateChartData.mutateAsync(payload);
                if (res?.success === "777" && res.resultjson) {
                    setRawChartData(res.resultjson);
                } else {
                    setRawChartData(null);
                }
            } catch (err) {
                console.error("Failed to fetch chart data:", err);
                setRawChartData(null);
            } finally {
                setIsChartLoading(false);
            }
        };

        fetchChartData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isChartOpen,
        banner?.id,
        selectedXInfo,
        columns,
        userId,
        uiSettings?.weight_col,
        filterExpression,
        defaultBannerId
    ]);

    const availableChartGroups = useMemo(() => {
        if (rawChartData) {
            const groups = new Set();
            rawChartData.series.forEach(s => {
                const groupName = String(s.label2 || s.label3 || s.var_label || '').trim();
                const lbl = String(s.label || s.key || '').trim();
                if (lbl === '전체' || groupName === '전체') {
                    groups.add('전체');
                } else if (groupName && groupName.toLowerCase() !== 'base') {
                    groups.add(groupName);
                }
            });
            if (groups.size === 0) {
                groups.add('전체');
            }
            return Array.from(groups);
        }

        const groups = new Set();
        columns.forEach(col => {
            const groupName = String(col.label3 || col.label2 || col.parent_label || '').trim();
            const lbl = String(col.label || col.name || '').trim();
            if (lbl === '전체' || groupName === '전체') {
                groups.add('전체');
            } else if (groupName && groupName.toLowerCase() !== 'base') {
                groups.add(groupName);
            }
        });
        return Array.from(groups);
    }, [columns, rawChartData]);

    useEffect(() => {
        if (availableChartGroups.length > 0) {
            setSelectedChartGroups(availableChartGroups);
        }
    }, [availableChartGroups.join(',')]);

    const { apiChartData, apiChartSeries } = useMemo(() => {
        if (!rawChartData) return { apiChartData: [], apiChartSeries: [] };
        const activeDataType = chartDataType === 'frequency' ? 'count' : 'percent';
        const { data, series } = toRechartsData(rawChartData, activeDataType);

        // Filter data points (categories/columns) based on selectedChartGroups
        const filteredData = data.filter(item => {
            const sItem = item.rawSeries;
            if (!sItem) return true;
            const groupName = String(sItem.label2 || sItem.label3 || sItem.var_label || sItem.parent_label || '').trim();
            const lbl = String(sItem.label || sItem.key || '').trim();
            if (lbl === '전체' || groupName === '전체') {
                return selectedChartGroups.includes('전체');
            } else if (groupName && availableChartGroups.includes(groupName)) {
                return selectedChartGroups.includes(groupName);
            }
            return true;
        });

        return { apiChartData: filteredData, apiChartSeries: series };
    }, [rawChartData, chartDataType, selectedChartGroups, availableChartGroups]);

    const chartData = useMemo(() => {
        const targetColumns = columns.filter(col => {
            const lbl = String(col.label || col.name || '').trim();
            const groupName = String(col.label3 || col.label2 || col.parent_label || '').trim();
            if (lbl.toLowerCase() === 'base') return false;

            if (lbl === '전체' || groupName === '전체') {
                if (!selectedChartGroups.includes('전체')) return false;
            } else if (groupName && availableChartGroups.includes(groupName)) {
                if (!selectedChartGroups.includes(groupName)) return false;
            }
            return true;
        });

        return targetColumns.map((col, cIdx) => {
            const labelParts = [col.label3, col.label2, col.label || col.name || `c${cIdx}`];
            const validParts = labelParts
                .map(p => String(p || '').trim())
                .filter(p => p !== '');

            // Reverse the array so the specific item (e.g., '남성') is on top, 
            // and the group (e.g., '성별') is on the bottom, then join with newline.
            const fullLabel = validParts.reverse().join('\n');

            const flatCol = { label: fullLabel, name: fullLabel };

            rows.forEach((row, rIdx) => {
                const role = String(row.row_role || '').toLowerCase();
                const rLbl = String(row.label || row.name || '').trim();
                if (role === 'base' || rLbl.toLowerCase() === 'base') return;

                const fieldKey = `r${rIdx}`;
                const originalColKey = col.key || `c${columns.indexOf(col)}`;
                const cellBox = row.cells?.[originalColKey] || {};

                flatCol[`${fieldKey}_n`] = cellBox.count !== undefined ? cellBox.count : (cellBox.n || 0);
                flatCol[`${fieldKey}_pct`] = cellBox.percent !== undefined ? cellBox.percent : (cellBox.pct || 0);
            });
            return flatCol;
        });
    }, [rows, columns, selectedChartGroups]);

    const usePercentFields = chartDataType === 'percentage';

    const chartSeries = useMemo(() => {
        return rows
            .map((row, rIdx) => {
                const role = String(row.row_role || '').toLowerCase();
                const rLbl = String(row.label || row.name || '').trim();
                const fieldKey = `r${rIdx}`;
                return {
                    role,
                    originalLabel: rLbl,
                    field: usePercentFields ? `${fieldKey}_pct` : `${fieldKey}_n`,
                    name: rLbl.replace(/\n/g, ' ')
                };
            })
            .filter(series => series.role !== 'base' && series.originalLabel.toLowerCase() !== 'base')
            .map(({ field, name }) => ({ field, name }));
    }, [rows, usePercentFields]);

    const allowedTypes = useMemo(() => {
        let types = [chartMode];
        if (chartMode === 'column' || chartMode === 'bar') {
            types = ['column', 'bar'];
        } else if (chartMode === 'stackedColumn' || chartMode === 'stacked100Column') {
            types = ['stackedColumn', 'stacked100Column'];
        }
        return types;
    }, [chartMode]);

    return (
        <React.Fragment>
            {index > 0 && (
                <div style={{ width: '100%', borderBottom: '2px dashed #cbd5e1', margin: '10px 0 10px 0' }} />
            )}
            <div id={`banner_block_${banner.id}`} data-table-id={banner.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: isLast ? '10px' : '0' }}>
                {/* Title Indicator */}
                <div style={{
                    alignSelf: 'flex-start',
                    display: 'inline-flex', alignItems: 'center',
                    background: '#e0e7ff',
                    padding: '6px 16px',
                    borderRadius: '24px'
                }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.3 }}>
                        {banner.label}
                    </span>
                </div>
                {/* 1. Data Grid (Moved up) */}
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: 0, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <div onClick={() => setIsGridOpen(!isGridOpen)} style={{ cursor: 'pointer', padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#0f172a', borderBottom: isGridOpen ? '1px solid #e2e8f0' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Table2 size={16} /> 교차 분석표</div>
                        {isGridOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                    </div>
                    {isGridOpen && (
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <iframe
                                srcDoc={`<!doctype html><html><head><meta charset="utf-8"/><style>${styleCss || ''}</style></head><body style="margin: 0; padding: 12px; background: transparent; overflow-x: auto; overflow-y: hidden; font-family: sans-serif;">${banner.html || ''}</body></html>`}
                                style={{ width: '100%', height: '300px', border: 'none', overflow: 'hidden' }}
                                title={`table-${banner.id}`}
                                onLoad={(e) => {
                                    try {
                                        const iframe = e.target;
                                        if (iframe && iframe.contentWindow && iframe.contentWindow.document) {
                                            const doc = iframe.contentWindow.document;
                                            if (doc.body) {
                                                doc.body.style.overflowX = 'auto';
                                                doc.body.style.overflowY = 'hidden';
                                            }
                                            const updateHeight = () => {
                                                const table = doc.querySelector('table');
                                                let height = 0;
                                                if (table) {
                                                    // body padding is 12px (top/bottom total 24px)
                                                    height = table.getBoundingClientRect().height + 24;
                                                    // check if horizontal scrollbar is present
                                                    const isScrollable = doc.body.scrollWidth > doc.body.clientWidth || doc.documentElement.scrollWidth > doc.documentElement.clientWidth;
                                                    if (isScrollable) {
                                                        height += 16; // add scrollbar height buffer
                                                    }
                                                } else {
                                                    height = Math.max(
                                                        doc.body.scrollHeight,
                                                        doc.documentElement.scrollHeight,
                                                        doc.body.offsetHeight,
                                                        doc.documentElement.offsetHeight
                                                    );
                                                }
                                                if (height > 0) {
                                                    iframe.style.height = `${height}px`;
                                                    if (iframe.parentElement) {
                                                        iframe.parentElement.style.height = `${height}px`;
                                                    }
                                                }
                                            };
                                            setTimeout(updateHeight, 50);
                                            if (iframe.contentWindow.ResizeObserver && doc.body) {
                                                const resizeObserver = new iframe.contentWindow.ResizeObserver(() => {
                                                    updateHeight();
                                                });
                                                resizeObserver.observe(doc.body);
                                            }
                                        }
                                    } catch (err) {
                                        console.error("Iframe autoheight error:", err);
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* 2. AI Summary */}
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: isAiSummaryOpen ? '12px' : '8px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <div onClick={() => setIsAiSummaryOpen(!isAiSummaryOpen)} style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#1e3a8a', marginBottom: isAiSummaryOpen ? '8px' : 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Sparkles size={16} /> AI 데이터 요약</div>
                        {isAiSummaryOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                    </div>
                    {isAiSummaryOpen && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '60px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', color: '#334155', padding: '16px' }}>
                            {isAiSummaryLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', width: '100%', justifyContent: 'center' }}>
                                    <Loader2 className="animate-spin" size={16} />
                                    AI 분석 결과를 가져오는 중입니다...
                                </div>
                            ) : aiSummaryData ? (
                                <div style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>
                                    {aiSummaryData}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: '#64748b' }}>
                                    <span style={{ fontSize: '13px' }}>AI 분석 요약 결과를 가져올 수 없습니다.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Chart */}
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: isChartOpen ? '12px' : '8px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isChartOpen ? '8px' : 0 }}>
                        <div onClick={() => setIsChartOpen(!isChartOpen)} style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', height: '100%' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BarChart3 size={16} /> 데이터 시각화 (차트)
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* 차트 리모콘 */}
                            {isChartOpen && (
                                <div className="view-options">
                                    <div className="download-menu-container" ref={downloadMenuRef}>
                                        <button className={`view-option-btn download-btn ${showDownloadMenu ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowDownloadMenu(!showDownloadMenu); }} title="차트 다운로드">
                                            <Download size={16} />
                                        </button>
                                        {showDownloadMenu && (
                                            <div className="download-dropdown" style={{ top: 'calc(100% + 4px)', right: 0, left: 'auto', minWidth: '160px', zIndex: 1100, position: 'absolute', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                                <button onClick={(e) => { e.stopPropagation(); handleDownload('png'); }}>PNG (이미지)</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDownload('svg'); }}>SVG (PPT용)</button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="download-menu-container" ref={paletteMenuRef}>
                                        <button className={`view-option-btn ${isPaletteMenuOpen ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setIsPaletteMenuOpen(!isPaletteMenuOpen); }} title="색상 테마 설정">
                                            {(() => {
                                                const theme = CHART_THEME_OPTIONS.find(opt => opt.id === paletteId) || CHART_THEME_OPTIONS[0];
                                                const colors = theme.preview;
                                                return (<div style={{ width: '16px', height: '16px', borderRadius: '50%', background: `conic-gradient(${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[0]})`, border: '1px solid #e2e8f0' }}></div>);
                                            })()}
                                        </button>
                                        {isPaletteMenuOpen && (
                                            <div className="download-dropdown" style={{ top: 'calc(100% + 4px)', right: 0, left: 'auto', minWidth: '160px', zIndex: 1100, position: 'absolute', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                                {CHART_THEME_OPTIONS.map((option) => (
                                                    <button key={option.id} onClick={(e) => { e.stopPropagation(); setPaletteId(option.id); setIsPaletteMenuOpen(false); }} className={paletteId === option.id ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ display: 'flex', gap: '2px' }}>
                                                            {option.preview.map((color, idx) => (
                                                                <div key={idx} style={{ width: '8px', height: '8px', borderRadius: '1px', background: color }}></div>
                                                            ))}
                                                        </div>
                                                        {option.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px', alignSelf: 'center' }} />

                                    <button
                                        onClick={() => setShowLegend(!showLegend)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '4px 8px', border: `1px solid ${showLegend ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px',
                                            background: showLegend ? '#eff6ff' : '#fff',
                                            color: showLegend ? '#2563eb' : '#64748b',
                                            fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', height: '100%'
                                        }}
                                        title="범례 보기/숨기기"
                                    >
                                        <LayoutList size={14} style={{ flexShrink: 0 }} />
                                        <span style={{ whiteSpace: 'nowrap' }}>범례</span>
                                    </button>

                                    <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px', alignSelf: 'center' }} />

                                    {availableChartGroups.length > 0 && (
                                        <div style={{ position: 'relative' }} ref={filterMenuRef}>
                                            <button
                                                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '4px 8px', border: `1px solid ${(selectedChartGroups.length > 0 && selectedChartGroups.length < availableChartGroups.length) ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px',
                                                    background: (selectedChartGroups.length > 0 && selectedChartGroups.length < availableChartGroups.length) ? '#eff6ff' : '#fff',
                                                    color: (selectedChartGroups.length > 0 && selectedChartGroups.length < availableChartGroups.length) ? '#2563eb' : '#64748b',
                                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', height: '100%',
                                                    maxWidth: '220px'
                                                }}
                                            >
                                                <Filter size={14} style={{ flexShrink: 0 }} />
                                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', width: '100%' }}>
                                                    {selectedChartGroups.length === availableChartGroups.length ? (
                                                        <span style={{ whiteSpace: 'nowrap' }}>그룹 필터 (전체)</span>
                                                    ) : selectedChartGroups.length === 0 ? (
                                                        <span style={{ whiteSpace: 'nowrap' }}>선택 없음</span>
                                                    ) : selectedChartGroups.length === 1 ? (
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {selectedChartGroups[0]}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
                                                                {selectedChartGroups[0]}
                                                            </span>
                                                            <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                                                                &nbsp;외 {selectedChartGroups.length - 1}개
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </button>

                                            {isFilterMenuOpen && (
                                                <div style={{
                                                    position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                                                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', zIndex: 1000,
                                                    minWidth: '200px', padding: '8px',
                                                    display: 'flex', flexDirection: 'column', gap: '4px'
                                                }}>
                                                    <div style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>X축 그룹 보기</span>
                                                        <button
                                                            onClick={() => setSelectedChartGroups(availableChartGroups)}
                                                            style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                                                        >
                                                            초기화
                                                        </button>
                                                    </div>
                                                    <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <div
                                                            onClick={() => {
                                                                if (selectedChartGroups.length === availableChartGroups.length) {
                                                                    setSelectedChartGroups([]);
                                                                } else {
                                                                    setSelectedChartGroups(availableChartGroups);
                                                                }
                                                            }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}
                                                        >
                                                            <div style={{
                                                                width: '14px', height: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                border: `1px solid ${selectedChartGroups.length === availableChartGroups.length ? '#2563eb' : '#cbd5e1'}`,
                                                                borderRadius: '3px',
                                                                background: selectedChartGroups.length === availableChartGroups.length ? '#2563eb' : '#fff'
                                                            }}>
                                                                {selectedChartGroups.length === availableChartGroups.length && <Check size={10} color="#fff" strokeWidth={3} />}
                                                            </div>
                                                            <span>전체 선택</span>
                                                        </div>
                                                        {availableChartGroups.map(group => {
                                                            const isChecked = selectedChartGroups.includes(group);
                                                            return (
                                                                <div
                                                                    key={group}
                                                                    onClick={() => {
                                                                        setSelectedChartGroups(prev =>
                                                                            prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
                                                                        );
                                                                    }}
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', fontSize: '13px', color: '#334155', borderRadius: '4px', background: isChecked ? '#f8fafc' : 'transparent', ':hover': { background: '#f8fafc' } }}
                                                                >
                                                                    <div style={{
                                                                        width: '14px', height: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        border: `1px solid ${isChecked ? '#2563eb' : '#cbd5e1'}`,
                                                                        borderRadius: '3px',
                                                                        background: isChecked ? '#2563eb' : '#fff'
                                                                    }}>
                                                                        {isChecked && <Check size={10} color="#fff" strokeWidth={3} />}
                                                                    </div>
                                                                    <span style={{ wordBreak: 'keep-all', lineHeight: 1.2 }}>{group}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px', alignSelf: 'center' }} />

                                    {/* Chart Options Menu */}
                                    <div style={{ position: 'relative' }} ref={chartOptionsMenuRef}>
                                        <button
                                            onClick={() => setIsChartOptionsOpen(!isChartOptionsOpen)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '4px 8px', border: `1px solid ${isChartOptionsOpen ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px',
                                                background: isChartOptionsOpen ? '#eff6ff' : '#fff',
                                                color: isChartOptionsOpen ? '#2563eb' : '#64748b',
                                                fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', height: '100%'
                                            }}
                                            title="차트 옵션"
                                        >
                                            <Settings size={14} style={{ flexShrink: 0 }} />
                                            <span style={{ whiteSpace: 'nowrap' }}>옵션</span>
                                        </button>

                                        {isChartOptionsOpen && (
                                            <div style={{
                                                position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                                                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)', zIndex: 1000,
                                                minWidth: '220px', padding: '16px',
                                                display: 'flex', flexDirection: 'column', gap: '16px'
                                            }}>
                                                <div>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>차트 표출 데이터</span>
                                                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '4px' }}>
                                                        <div
                                                            onClick={() => setChartDataType('frequency')}
                                                            style={{
                                                                flex: 1, textAlign: 'center', padding: '6px 0', fontSize: '12px',
                                                                fontWeight: chartDataType === 'frequency' ? 700 : 500,
                                                                color: chartDataType === 'frequency' ? '#2563eb' : '#64748b',
                                                                background: chartDataType === 'frequency' ? '#fff' : 'transparent',
                                                                borderRadius: '4px', cursor: 'pointer',
                                                                boxShadow: chartDataType === 'frequency' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            빈도
                                                        </div>
                                                        <div
                                                            onClick={() => setChartDataType('percentage')}
                                                            style={{
                                                                flex: 1, textAlign: 'center', padding: '6px 0', fontSize: '12px',
                                                                fontWeight: chartDataType === 'percentage' ? 700 : 500,
                                                                color: chartDataType === 'percentage' ? '#2563eb' : '#64748b',
                                                                background: chartDataType === 'percentage' ? '#fff' : 'transparent',
                                                                borderRadius: '4px', cursor: 'pointer',
                                                                boxShadow: chartDataType === 'percentage' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            비율
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ height: '1px', background: '#e2e8f0' }} />
                                                <div>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>차트 값 표기</span>
                                                    <div
                                                        onClick={() => setShowChartValues(!showChartValues)}
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}
                                                    >
                                                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>값 표출하기</span>
                                                        <div style={{
                                                            width: '36px', height: '20px', background: showChartValues ? '#3b82f6' : '#e2e8f0',
                                                            borderRadius: '20px', position: 'relative', transition: 'background 0.2s', flexShrink: 0
                                                        }}>
                                                            <div style={{
                                                                position: 'absolute', top: '2px', left: showChartValues ? '18px' : '2px',
                                                                width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
                                                                transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                            }} />
                                                        </div>
                                                    </div>
                                                    {chartDataType !== 'frequency' && (
                                                        <div
                                                            onClick={() => setShowPercentSymbol(!showPercentSymbol)}
                                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0', marginTop: '8px' }}
                                                        >
                                                            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>% 표출</span>
                                                            <div style={{
                                                                width: '36px', height: '20px', background: showPercentSymbol ? '#3b82f6' : '#e2e8f0',
                                                                borderRadius: '20px', position: 'relative', transition: 'background 0.2s', flexShrink: 0
                                                            }}>
                                                                <div style={{
                                                                    position: 'absolute', top: '2px', left: showPercentSymbol ? '18px' : '2px',
                                                                    width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
                                                                    transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                                }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px', alignSelf: 'center' }} />

                                    <button className={`view-option-btn ${chartMode === 'column' ? 'active' : ''}`} onClick={() => setChartMode('column')} title="세로 막대형"><BarChart2 size={16} /></button>
                                    <button className={`view-option-btn ${chartMode === 'bar' ? 'active' : ''}`} onClick={() => setChartMode('bar')} title="가로 막대형"><BarChartHorizontal size={16} /></button>
                                    <button className={`view-option-btn ${chartMode === 'stackedColumn' ? 'active' : ''}`} onClick={() => setChartMode('stackedColumn')} title="누적 막대형"><Layers size={16} /></button>
                                    <button className={`view-option-btn ${chartMode === 'stacked100Column' ? 'active' : ''}`} onClick={() => setChartMode('stacked100Column')} title="100% 누적 막대형"><Percent size={16} /></button>
                                    <button className={`view-option-btn ${chartMode === 'line' ? 'active' : ''}`} onClick={() => setChartMode('line')} title="선형"><LineChart size={16} /></button>
                                    <button className={`view-option-btn ${chartMode === 'pie' ? 'active' : ''}`} onClick={() => setChartMode('pie')} title="원형"><PieChart size={16} /></button>
                                    <button className={`view-option-btn ${chartMode === 'donut' ? 'active' : ''}`} onClick={() => setChartMode('donut')} title="도넛형"><Donut size={16} /></button>
                                    <button className={`view-option-btn ${chartMode === 'radarArea' ? 'active' : ''}`} onClick={() => setChartMode('radarArea')} title="방사형"><Aperture size={16} /></button>
                                    <button className={`view-option-btn ${chartMode === 'scatterPoint' ? 'active' : ''}`} onClick={() => setChartMode('scatterPoint')} title="점도표"><MoreHorizontal size={16} /></button>
                                    <button className={`view-option-btn ${chartMode === 'area' ? 'active' : ''}`} onClick={() => setChartMode('area')} title="영역형"><AreaChart size={16} /></button>
                                    <button className={`view-option-btn ${chartMode === 'heatmap' ? 'active' : ''}`} onClick={() => setChartMode('heatmap')} title="히트맵"><LayoutGrid size={16} /></button>
                                </div>
                            )}

                            {/* 열기/닫기 토글 아이콘 */}
                            <div onClick={() => setIsChartOpen(!isChartOpen)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                {isChartOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                            </div>
                        </div>
                    </div>
                    {isChartOpen && (
                        <div className="agg-chart-container" style={{ height: '350px', position: 'relative', marginTop: '10px' }} ref={chartContainerRef}>
                            {isChartLoading && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(255, 255, 255, 0.7)', zIndex: 10
                                }}>
                                    <Loader2 className="animate-spin" size={24} color="#3b82f6" />
                                </div>
                            )}
                            {(rawChartData ? apiChartData.length > 0 : (columns.length > 0 || rows.length > 0)) ? (
                                <KendoChart
                                    key={`${banner.id}-${chartMode}-${paletteId}-${rawChartData ? 'api' : 'local'}`}
                                    data={rawChartData ? apiChartData : chartData}
                                    seriesNames={rawChartData ? apiChartSeries : chartSeries}
                                    initialType={chartMode}
                                    labelLimit={12}
                                    suffix={usePercentFields && showPercentSymbol ? "%" : ""}
                                    isPercent={usePercentFields}
                                    paletteId={paletteId}
                                    allowedTypes={[chartMode]}
                                    hideHeader={true}
                                    externalShowLegend={showLegend}
                                    showLabels={showChartValues}
                                    decimals={usePercentFields ? decimalPct : decimalN}
                                    allowAggregate={true}
                                />
                            ) : (
                                !isChartLoading && (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '13px' }}>
                                        표시할 차트 데이터가 없습니다.
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        </React.Fragment>
    );
});

const CrossAnalysisPage = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getOverviewContext, getOverview, getOverviewStyled, savePageSettings, exportOverviewXlsx, createSnapshot, getAiSummary, evaluateChartData } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    // --- 히스토리 관리 (Undo/Redo) ---
    const history = useUpdateHistory('dp-banner');

    const [toast, setToast] = useState({ show: false, message: '' });
    const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false); // 엑셀 다운로드 확인 모달 열림 여부
    const [snapshotLabel, setSnapshotLabel] = useState('');
    const [snapshotMemo, setSnapshotMemo] = useState('');
    const isHistoryAction = useRef(false);
    const isSidebarClickScrolling = useRef(false);

    const [banners, setBanners] = useState([]);
    const [styleCss, setStyleCss] = useState("");
    const [showTTest, setShowTTest] = useState(false);
    const [showN, setShowN] = useState(false);
    const [decimalN, setDecimalN] = useState(0);
    const [showPct, setShowPct] = useState(true);
    const [excelShowPct, setExcelShowPct] = useState(true); // 엑셀 다운로드 시 % 표출 여부
    const [excelShowBaseParenthesis, setExcelShowBaseParenthesis] = useState(true); // 엑셀 다운로드 시 Base 기본 괄호 여부
    const [excelDecimalPct, setExcelDecimalPct] = useState(1); // 엑셀 다운로드 시 % 소수점 자리수
    const [decimalPct, setDecimalPct] = useState(1);
    const [hideZeroBaseColumns, setHideZeroBaseColumns] = useState(false);
    const [selectedXInfo, setSelectedXInfo] = useState('__none__');
    const [uiSettings, setUiSettings] = useState({});

    // AI 데이터 요약 상태
    const [projectNum, setProjectNum] = useState("");
    const [overviewPayload, setOverviewPayload] = useState(null);
    const [aiSummaryData, setAiSummaryData] = useState("");
    const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);

    const [localDecimalN, setLocalDecimalN] = useState(0);
    const [localDecimalPct, setLocalDecimalPct] = useState(1);

    useEffect(() => {
        setLocalDecimalN(decimalN);
    }, [decimalN]);

    useEffect(() => {
        setLocalDecimalPct(decimalPct);
    }, [decimalPct]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDecimalN(localDecimalN);
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [localDecimalN]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDecimalPct(localDecimalPct);
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [localDecimalPct]);

    const contextFetchedRef = useRef(false);
    const recodedVariablesRef = useRef({});
    const baseVariablesRef = useRef({});
    const isFirstLoadRef = useRef(true);

    const pageId = sessionStorage.getItem('pageId');
    const userId = auth?.user?.userId;

    useEffect(() => {
        contextFetchedRef.current = false;
        isInitialSetupRef.current = true;
        isFirstLoadRef.current = true;
    }, [pageId, userId]);

    const isInitialSetupRef = useRef(true);

    useEffect(() => {
        if (isInitialSetupRef.current) return;

        const saveTimeout = setTimeout(() => {
            const pageId = sessionStorage.getItem('pageId');
            const user = auth?.user?.userId;

            const newUi = {
                ...uiSettings,
                format_show_n: showN,
                format_n_round: decimalN === '' ? 0 : decimalN,
                format_show_percent: showPct,
                format_percent_round: decimalPct === '' ? 0 : decimalPct,
                show_t_test: showTTest
            };
            setUiSettings(newUi);

            savePageSettings.mutateAsync({
                pageid: pageId,
                user: user,
                ui_settings: newUi
            }).catch(e => console.error("Setting save error", e));
        }, 500);

        return () => clearTimeout(saveTimeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showN, decimalN, showPct, decimalPct, showTTest]);
    const [xInfoOptions, setXInfoOptions] = useState([]);

    const defaultBannerId = useMemo(() => {
        const opt = xInfoOptions.find(o => {
            const val = String(o.value).toLowerCase();
            return val !== '__none__' && (val === 'banner' || val.startsWith('banner_') || val.startsWith('overview_'));
        });
        return opt ? opt.value : null;
    }, [xInfoOptions]);

    const [selectedComputedFilterIds, setSelectedComputedFilterIds] = useState([CROSS_FILTER_ALL_ID]);
    const [draftComputedFilterIds, setDraftComputedFilterIds] = useState([CROSS_FILTER_ALL_ID]);
    const [computedFilterOptions, setComputedFilterOptions] = useState([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterAnchorRef = useRef(null);
    const filterPopupRef = useRef(null);
    const [filterPopupWidth, setFilterPopupWidth] = useState(180);

    const filterExpression = useMemo(() => {
        if (selectedComputedFilterIds.includes(CROSS_FILTER_ALL_ID)) return "";
        const activeOptions = computedFilterOptions.filter(o => selectedComputedFilterIds.includes(o.id));
        if (activeOptions.length === 0) return "";
        return activeOptions.map(o => `(${o.logic})`).join(" or ");
    }, [selectedComputedFilterIds, computedFilterOptions]);

    useEffect(() => {
        if (isFilterOpen && filterAnchorRef.current) {
            setFilterPopupWidth(Math.max(filterAnchorRef.current.offsetWidth, 180));
        }

        const handleClickOutside = (event) => {
            if (isFilterOpen &&
                filterAnchorRef.current &&
                !filterAnchorRef.current.contains(event.target) &&
                filterPopupRef.current &&
                !filterPopupRef.current.contains(event.target)) {
                setSelectedComputedFilterIds(draftComputedFilterIds);
                setIsFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFilterOpen, draftComputedFilterIds]);

    const handleTogglePopup = () => {
        if (!isFilterOpen) {
            setDraftComputedFilterIds(selectedComputedFilterIds);
        }
        setIsFilterOpen(!isFilterOpen);
    };

    const applyFilterAndClose = () => {
        setSelectedComputedFilterIds(draftComputedFilterIds);
        setIsFilterOpen(false);
    };

    const toggleFilter = (id) => {
        setDraftComputedFilterIds(prev => {
            if (id === CROSS_FILTER_ALL_ID) {
                return [CROSS_FILTER_ALL_ID];
            }
            const next = prev.filter(x => x !== CROSS_FILTER_ALL_ID);
            const isChecked = prev.includes(id);
            const updated = isChecked ? next.filter(x => x !== id) : [...next, id];
            return updated.length > 0 ? updated : [CROSS_FILTER_ALL_ID];
        });
    };

    const toggleAllFilters = () => {
        setDraftComputedFilterIds([CROSS_FILTER_ALL_ID]);
    };

    const getFilterButtonText = () => {
        if (selectedComputedFilterIds.includes(CROSS_FILTER_ALL_ID)) return '전체';
        const activeOptions = computedFilterOptions.filter(f => selectedComputedFilterIds.includes(f.id));
        if (activeOptions.length === 0) return '전체';
        if (activeOptions.length === 1) return activeOptions[0].label;
        return `${activeOptions[0].label} 외 ${activeOptions.length - 1}건`;
    };

    const [selectedBanner, setSelectedBanner] = useState('');
    const [baseVariables, setBaseVariables] = useState([]);
    const [isBannerSidebarOpen, setIsBannerSidebarOpen] = useState(true);
    const [bannerSearch, setBannerSearch] = useState('');
    const [currentLabel, setCurrentLabel] = useState('');
    const [currentId, setCurrentId] = useState('');
    const [currentXInfo, setCurrentXInfo] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [totalTables, setTotalTables] = useState(0);
    const PAGE_SIZE = 20;


    // 키보드 이벤트 (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) { // Redo (Ctrl+Shift+Z)
                        const redoData = history.redo();
                        if (redoData) {
                            isHistoryAction.current = true;
                            setBanners([...redoData]);
                        }
                    } else { // Undo (Ctrl+Z)
                        const undoData = history.undo();
                        if (undoData) {
                            isHistoryAction.current = true;
                            setBanners([...undoData]);
                        }
                    }
                } else if (e.key.toLowerCase() === 'y') { // Redo (Ctrl+Y)
                    const redoData = history.redo();
                    if (redoData) {
                        isHistoryAction.current = true;
                        setBanners([...redoData]);
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
        if (banners.length > 0) {
            history.commit(banners);
        }
    }, [banners, history]);


    const handleDeleteBanner = (e, bannerId) => {
        e.stopPropagation();

        if (bannerId.startsWith('NEW_')) {
            const nextBanners = banners.filter(b => b.id !== bannerId);
            setBanners(nextBanners);

            if (selectedBanner === bannerId) {
                if (nextBanners.length > 0) {
                    setSelectedBanner(nextBanners[0].id);
                    setCurrentId(nextBanners[0].id);
                    setCurrentLabel(nextBanners[0].label);
                    setCurrentXInfo(nextBanners[0].type || '단일 응답형 (Single)');
                } else {
                    setSelectedBanner('');
                    setCurrentId('');
                    setCurrentLabel('');
                    setCurrentXInfo('');
                }
            }
            return;
        }

        // 2. 이미 서버에 존재하는 경우 (확인창 띄우고 API 호출)
        modal.showConfirm('알림', <span style={{ wordBreak: 'break-all' }}>문항({bannerId})을 삭제하시겠습니까?</span>, {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "삭제",
                    click: async () => {
                        const pageId = sessionStorage.getItem('pageId');
                        const user = auth?.user?.userId;
                        if (!pageId || !auth?.user?.userId) return;
                        // const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
                        // const user = "sbbok";

                        try {
                            const result = await deleteBaseVariable.mutateAsync({
                                pageid: pageId,
                                user: user,
                                variables: [bannerId]
                            });

                            if (result?.success === '777') {
                                modal.showAlert('알림', '삭제되었습니다.');
                                // 현재 보고 있는 아이템이 삭제되었다면 'delete' 모드로 패치하여 첫번째 아이템 강제 선택
                                if (selectedBanner === bannerId) {
                                    await fetchCrossAnalysisData('delete');
                                } else {
                                    await fetchCrossAnalysisData('normal');
                                }
                            } else {
                                modal.showAlert('오류', result?.Message || '삭제 중 문제가 발생했습니다.');
                            }
                        } catch (error) {
                            console.error('Delete error:', error);
                            modal.showAlert('오류', '삭제 요청에 실패했습니다.');
                        }
                    }
                }
            ]
        });
    };

    // --- 데이터 로직 ---
    const fetchCrossAnalysisData = async (mode = 'normal', targetIdToSelect = null, targetPage = currentPage, currentFilterExp = filterExpression) => {
        // 실제 데이터 연동 시 사용할 주석:
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || !user) return;

        try {
            loadingSpinner.show();

            let fetchedUi = uiSettings;
            let recodedVars = recodedVariablesRef.current;
            let baseVars = baseVariablesRef.current;

            if (!contextFetchedRef.current) {
                // 1. Context 데이터 가져오기
                const contextRes = await getOverviewContext.mutateAsync({ pageid: pageId, user: user });

                // X 정보 (기준변수) 리스트 세팅 및 데이터 필터 (파생문항) 세팅
                const ctxPayload = contextRes?.resultjson || contextRes || {};

                if (ctxPayload) {
                    setProjectNum(ctxPayload.pn || "");
                    const resolvedMeanDigits = ctxPayload.display_policy?.mean_digits ?? ctxPayload.ui_settings?.format_mean_round ?? 2;
                    const resolvedStdDigits = ctxPayload.display_policy?.std_digits ?? ctxPayload.ui_settings?.format_std_round ?? 2;
                    const resolvedMedianDigits = ctxPayload.display_policy?.median_digits ?? ctxPayload.ui_settings?.format_median_round ?? 2;
                    const resolvedMinDigits = ctxPayload.display_policy?.min_digits ?? ctxPayload.ui_settings?.format_min_round ?? 0;
                    const resolvedMaxDigits = ctxPayload.display_policy?.max_digits ?? ctxPayload.ui_settings?.format_max_round ?? 0;
                    const resolvedVarDigits = ctxPayload.display_policy?.var_digits ?? ctxPayload.ui_settings?.format_var_round ?? 2;
                    const resolvedNDigits = ctxPayload.display_policy?.n_digits ?? ctxPayload.ui_settings?.format_n_round ?? 0;
                    const resolvedPercentDigits = ctxPayload.display_policy?.percent_digits ?? ctxPayload.ui_settings?.format_percent_round ?? 1;

                    fetchedUi = {
                        ...(ctxPayload.display_policy || {}),
                        ...(ctxPayload.ui_settings || {}),
                        mean_digits: resolvedMeanDigits,
                        std_digits: resolvedStdDigits,
                        median_digits: resolvedMedianDigits,
                        min_digits: resolvedMinDigits,
                        max_digits: resolvedMaxDigits,
                        var_digits: resolvedVarDigits,
                        n_digits: resolvedNDigits,
                        percent_digits: resolvedPercentDigits,
                    };
                    setUiSettings(fetchedUi);
                    setShowN(fetchedUi.format_show_n ?? true);
                    setDecimalN(fetchedUi.format_n_round ?? ctxPayload.n_digits ?? 0);
                    setShowPct(fetchedUi.format_show_percent ?? true);
                    setDecimalPct(fetchedUi.format_percent_round ?? ctxPayload.percent_digits ?? 1);
                    setHideZeroBaseColumns(fetchedUi.hide_zero_base_columns ?? false);
                    if (fetchedUi.show_t_test !== undefined && fetchedUi.show_t_test !== showTTest) {
                        setShowTTest(fetchedUi.show_t_test);
                    }

                    let hasBaseParenthesis = true;
                    if (fetchedUi.base_prefix !== undefined && fetchedUi.base_prefix !== null) {
                        hasBaseParenthesis = (fetchedUi.base_prefix === "(" && fetchedUi.base_postfix === ")");
                    } else if (ctxPayload.display_policy?.base_prefix !== undefined && ctxPayload.display_policy?.base_prefix !== null) {
                        hasBaseParenthesis = (ctxPayload.display_policy.base_prefix === "(" && ctxPayload.display_policy.base_postfix === ")");
                    } else if (fetchedUi.show_base_parenthesis !== undefined && fetchedUi.show_base_parenthesis !== null) {
                        hasBaseParenthesis = fetchedUi.show_base_parenthesis;
                    } else if (ctxPayload.display_policy?.show_base_parenthesis !== undefined && ctxPayload.display_policy?.show_base_parenthesis !== null) {
                        hasBaseParenthesis = ctxPayload.display_policy.show_base_parenthesis;
                    }
                    setExcelShowBaseParenthesis(hasBaseParenthesis);

                    recodedVars = ctxPayload.recoded_variables || {};
                    baseVars = ctxPayload.base_variables || {};
                    recodedVariablesRef.current = recodedVars;
                    baseVariablesRef.current = baseVars;

                    const dynamicXInfoOptions = Object.entries(recodedVars)
                        .filter(([key, value]) => {
                            const id = String(value?.id ?? key).trim().toLowerCase();
                            if (!id) return false;
                            if (id === "banner" || id.startsWith("banner_")) return true;
                            return id.startsWith("overview_");
                        })
                        .map(([key]) => key)
                        .sort((a, b) => a.localeCompare(b, "ko"))
                        .map(key => ({
                            text: recodedVars[key]?.label || key,
                            value: key
                        }));

                    setXInfoOptions([
                        { text: '기본 (스터브 설정값) ', value: '__none__' },
                        ...dynamicXInfoOptions
                    ]);

                    const filterOpts = Object.entries(baseVars)
                        .filter(([, value]) => String(value?.recoded_type ?? "").toLowerCase() === "computed")
                        .flatMap(([key, value]) => {
                            const variableId = String(value?.id ?? key);
                            const variableLabel = String(value?.label ?? key).trim() || variableId;
                            const infoList = Array.isArray(value?.info) ? value.info : [];
                            return infoList
                                .map((info, index) => {
                                    const label = String(info?.label ?? "").trim();
                                    const logic = String(info?.logic ?? "").trim();
                                    if (!label || !logic) return null;
                                    const rawValue = info?.value ?? index + 1;
                                    return {
                                        id: `${variableId}::${String(rawValue).trim() || String(index + 1)}`,
                                        label,
                                        logic,
                                        variableId,
                                        variableLabel,
                                    };
                                })
                                .filter(Boolean);
                        })
                        .sort((a, b) => a.label.localeCompare(b.label, "ko") || a.id.localeCompare(b.id, "en"));

                    setComputedFilterOptions(filterOpts);
                }

                contextFetchedRef.current = true;
                setTimeout(() => { isInitialSetupRef.current = false; }, 100);
            }

            // 2. 전체표 목록 (Overview) 가져오기
            const reqData = {
                pageid: pageId,
                user: user,
                banner_mode: selectedXInfo === '__none__' ? 'stub' : 'override',
                start: (targetPage - 1) * PAGE_SIZE,
                limit: PAGE_SIZE,
                search: bannerSearch,
                filter_expression: currentFilterExp,
                use_recoded: true,
                include_stats: showTTest ? ["t-test"] : [],
                display_policy: {
                    show_n: isInitialSetupRef.current ? (fetchedUi?.format_show_n ?? showN) : showN,
                    show_percent: isInitialSetupRef.current ? (fetchedUi?.format_show_percent ?? showPct) : showPct,
                    percent_symbol: isInitialSetupRef.current ? (fetchedUi?.format_show_percent ?? showPct) : showPct,
                    hide_zero_base_columns: isInitialSetupRef.current ? (fetchedUi?.hide_zero_base_columns ?? hideZeroBaseColumns) : hideZeroBaseColumns,
                    hide_zero_stubs: isInitialSetupRef.current ? (fetchedUi?.hide_zero_stubs ?? false) : (uiSettings?.hide_zero_stubs ?? false),
                    hide_zero_banners: isInitialSetupRef.current ? (fetchedUi?.hide_zero_banners ?? false) : (uiSettings?.hide_zero_banners ?? false),
                    n_digits: Number(isInitialSetupRef.current ? (fetchedUi?.format_n_round ?? (decimalN === '' ? 0 : decimalN)) : (decimalN === '' ? 0 : decimalN)),
                    percent_digits: Number(isInitialSetupRef.current ? (fetchedUi?.format_percent_round ?? (decimalPct === '' ? 1 : decimalPct)) : (decimalPct === '' ? 1 : decimalPct)),
                    mean_digits: fetchedUi?.mean_digits ?? uiSettings?.mean_digits ?? 2,
                    std_digits: fetchedUi?.std_digits ?? uiSettings?.std_digits ?? 2,
                    median_digits: fetchedUi?.median_digits ?? uiSettings?.median_digits ?? 2,
                    min_digits: fetchedUi?.min_digits ?? uiSettings?.min_digits ?? 0,
                    max_digits: fetchedUi?.max_digits ?? uiSettings?.max_digits ?? 0,
                    var_digits: fetchedUi?.var_digits ?? uiSettings?.var_digits ?? 2,
                    zero_display: fetchedUi?.zero_display || uiSettings?.zero_display || "0",
                    empty_display: fetchedUi?.empty_display || uiSettings?.empty_display || "blank"
                }
            };
            if (selectedXInfo !== '__none__') {
                reqData.banner = [selectedXInfo];
            }

            const overviewRes = await getOverviewStyled.mutateAsync(reqData);

            // 응답 포맷 대응 (resultjson 래핑 여부)
            const payload = overviewRes?.resultjson || overviewRes || {};
            const tablesList = payload.tables || [];

            setOverviewPayload(payload);
            if (payload.style_css) {
                setStyleCss(payload.style_css);
            }

            if (tablesList.length > 0 || (overviewRes?.success === '777')) {
                const formatted = tablesList.map((t, i) => {
                    // 스터브 설정값(색상, 선 등 info 정보)을 컨텍스트의 recodedVars에서 매핑
                    const stubVarId = t.table_id || t.id;
                    const stubVar = recodedVars[stubVarId] || {};
                    const stubInfo = Array.isArray(stubVar.info) ? stubVar.info : (Array.isArray(t.info) ? t.info : []);

                    return {
                        id: t.table_id || t.id || `table_${i}`,
                        label: t.title || t.label || t.name || t.id || t.table_name,
                        type: t.type === 'single' ? '단일 응답형 (Single)' :
                            t.type === 'double' ? '다중 응답형 (Double)' :
                                t.type === 'numeric' ? '숫자형 (Numeric)' : (t.type || '단일 응답형 (Single)'),
                        subId: t.table_id || t.id,
                        raw: { ...t, info: stubInfo },
                        html: t.html,
                        info: stubInfo
                    };
                });
                setBanners(formatted);
                history.reset(formatted);

                // 렌더링 후 스크롤 상단으로 완벽히 이동 (메인 화면 & 사이드바 모두)
                setTimeout(() => {
                    const scrollArea = document.getElementById('dp-content-scroll-area');
                    if (scrollArea) {
                        scrollArea.scrollTop = 0;
                    }
                    const sidebarList = document.querySelector('.dp-banner-list');
                    if (sidebarList) {
                        sidebarList.scrollTop = 0;
                    }
                }, 50);

                // 총 테이블 개수 갱신
                let total = payload.total !== undefined ? payload.total : 0;
                if (payload.total === undefined) {
                    if (targetPage === 1 && formatted.length < PAGE_SIZE) {
                        total = formatted.length;
                    } else if (targetPage === 1) {
                        total = 1000; // 예상 fallback (서버에서 total을 안내려줄 경우)
                    } else {
                        total = totalTables; // 기존 유지
                    }
                }
                setTotalTables(total);

                if (formatted.length > 0) {
                    const isFresh = mode === 'fresh';
                    let target = isFresh ? formatted[formatted.length - 1] : formatted[0];
                    if (targetIdToSelect) {
                        const foundTarget = formatted.find(f => f.id === targetIdToSelect);
                        if (foundTarget) target = foundTarget;
                    }
                    if (isFresh || targetIdToSelect || !selectedBanner || !formatted.some(f => f.id === selectedBanner)) {
                        setSelectedBanner(target.id);
                        setCurrentLabel(target.label);
                        setCurrentId(target.id);
                        setCurrentXInfo(target.type || '단일 응답형 (Single)');
                    }
                } else {
                    setSelectedBanner('');
                    setCurrentLabel('');
                    setCurrentId('');
                    setCurrentXInfo('');
                }
            } else {
                setBanners([]);
                history.reset([]);
                setSelectedBanner('');
                setCurrentLabel('');
                setCurrentId('');
                setCurrentXInfo('');
            }
        } catch (error) {
            console.error('Fetch Overview Error:', error);
        } finally {
            loadingSpinner.hide();
        }
    };

    const updateBannerInfo = useCallback((newInfo) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: newInfo, isDirty: true } : b));
        if (onUnsavedChange) onUnsavedChange(true);
    }, [selectedBanner, onUnsavedChange]);

    const handleRowClick = useCallback((e) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: b.info.map(it => ({ ...it, inEdit: it === e.dataItem })) } : b));
    }, [selectedBanner]);

    // 문항 목록 필터링 (서버사이드 필터링 사용)
    const filteredBanners = banners;

    useEffect(() => {
        if (isInitialSetupRef.current && !isFirstLoadRef.current) {
            // Skip updates while initial settings from context are being applied
            return;
        }
        if (isFirstLoadRef.current) {
            isFirstLoadRef.current = false;
        }

        const timer = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1); // currentPage useEffect가 fetch를 수행함
            } else {
                fetchCrossAnalysisData('normal', null, 1, filterExpression);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [bannerSearch, selectedXInfo, filterExpression, auth?.user?.userId, showTTest, showN, decimalN, showPct, decimalPct]);

    useEffect(() => {
        const handlePageUpdate = () => {
            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                fetchCrossAnalysisData('normal', null, 1, filterExpression);
            }
        };
        window.addEventListener("pageSelected", handlePageUpdate);
        return () => window.removeEventListener("pageSelected", handlePageUpdate);
    }, [currentPage, filterExpression]);

    const isInitialPageRender = useRef(true);
    useEffect(() => {
        if (isInitialPageRender.current) {
            isInitialPageRender.current = false;
            return;
        }
        fetchCrossAnalysisData('normal', null, currentPage, filterExpression);
    }, [currentPage]);

    useEffect(() => {
        const handleObserver = (entries) => {
            if (isSidebarClickScrolling.current) return;
            const intersecting = entries.find(e => e.isIntersecting);
            if (intersecting) {
                const id = intersecting.target.id.replace('banner_block_', '');
                setSelectedBanner(prev => {
                    if (prev !== id) {
                        const banner = banners.find(b => b.id === id);
                        if (banner) {
                            setCurrentLabel(banner.label);
                            setCurrentId(banner.id);
                            setCurrentXInfo(banner.type || '단일 응답형 (Single)');
                        }

                        // 사이드바 목록 자동 스크롤 동기화
                        setTimeout(() => {
                            const sidebarItem = document.getElementById(`sidebar_item_${id}`);
                            if (sidebarItem) {
                                sidebarItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        }, 50);

                        return id;
                    }
                    return prev;
                });
            }
        };

        const observer = new IntersectionObserver(handleObserver, {
            root: document.getElementById('dp-content-scroll-area'),
            rootMargin: '-10% 0px -50% 0px',
            threshold: 0
        });

        const timer = setTimeout(() => {
            filteredBanners.forEach(banner => {
                const el = document.getElementById(`banner_block_${banner.id}`);
                if (el) observer.observe(el);
            });
        }, 100);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [filteredBanners, banners]);

    const handleExcelExport = async () => {
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || !user) return;

        try {
            loadingSpinner.show();
            const requestData = {
                pageid: pageId,
                user: user,
                use_recoded: true,
                banner_mode: selectedXInfo === '__none__' ? 'stub' : 'override',
                hide_zero_base_columns: hideZeroBaseColumns,
                zero_base_columns: hideZeroBaseColumns,
                zero_banners: hideZeroBaseColumns,
                zero_stubs: uiSettings?.hide_zero_stubs ?? false,
                start: 0,
                limit: 0,
                search: bannerSearch,
                filter_expression: filterExpression,
                excel_show_percent: excelShowPct, // 엑셀 % 표출 여부 추가
                display_policy: {
                    show_n: showN,
                    show_percent: showPct,
                    excel_show_percent: excelShowPct, // 엑셀 % 표출 여부 추가
                    percent_symbol: excelShowPct,
                    hide_zero_base_columns: hideZeroBaseColumns,
                    hide_zero_stubs: uiSettings?.hide_zero_stubs ?? false,
                    hide_zero_banners: uiSettings?.hide_zero_banners ?? false,
                    n_digits: Number(decimalN === '' ? 0 : decimalN),
                    percent_digits: Number(excelDecimalPct === '' ? 1 : excelDecimalPct),
                    mean_digits: uiSettings?.mean_digits ?? 2,
                    std_digits: uiSettings?.std_digits ?? 2,
                    median_digits: uiSettings?.median_digits ?? 2,
                    min_digits: uiSettings?.min_digits ?? 0,
                    max_digits: uiSettings?.max_digits ?? 0,
                    var_digits: uiSettings?.var_digits ?? 2,
                    zero_display: uiSettings?.zero_display || "0",
                    empty_display: uiSettings?.empty_display || "blank",
                    show_base_parenthesis: excelShowBaseParenthesis,
                    base_prefix: excelShowBaseParenthesis ? "(" : "",
                    base_postfix: excelShowBaseParenthesis ? ")" : ""
                }
            };
            if (selectedXInfo !== '__none__') {
                requestData.banner = [selectedXInfo];
            }

            const result = await exportOverviewXlsx.mutateAsync(requestData);
            const payload = result?.resultjson || result || {};

            if (result?.success === "777" && payload.content_base64) {
                const binaryString = window.atob(payload.content_base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: payload.content_type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', payload.filename || `cross_analysis_${pageId}.xlsx`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                modal.showAlert('오류', '엑셀 데이터 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('CSV Export Error:', error);
            modal.showAlert('오류', '엑셀 다운로드 중 문제가 발생했습니다.');
        } finally {
            loadingSpinner.hide();
        }
    };

    return (
        <>
            <style>
                {`
                .dp-add-question-dropdown .k-input-value-text {
                    font-weight: 400 !important;
                }
                
                input[type="number"]::-webkit-inner-spin-button, 
                input[type="number"]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                }

                .dp-table-container .k-grid-header th.k-header {
                    font-size: 12px !important;
                    padding: 8px 12px !important;
                }
                .dp-table-container .k-grid-header th.k-header .k-column-title {
                    font-size: 12px !important;
                    font-weight: 600;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    white-space: normal !important;
                    word-break: break-all;
                    line-height: 1.3;
                }

                .custom-xinfo-dropdown.k-dropdownlist,
                .custom-xinfo-dropdown.k-picker {
                    background-color: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    outline: none !important;
                }
                .custom-xinfo-dropdown.k-dropdownlist:hover,
                .custom-xinfo-dropdown.k-dropdownlist:focus,
                .custom-xinfo-dropdown.k-dropdownlist.k-focus,
                .custom-xinfo-dropdown.k-dropdownlist:focus-within {
                    border: none !important;
                    box-shadow: none !important;
                    outline: none !important;
                    background-color: transparent !important;
                }
                .custom-xinfo-dropdown .k-input-inner {
                    padding: 0 10px;
                }
                .custom-xinfo-dropdown .k-input-button,
                .custom-xinfo-dropdown .k-button {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .custom-xinfo-dropdown .k-input-value-text {
                    font-size: 12px !important;
                }

                .custom-xinfo-popup .k-list-item-text {
                    font-size: 12px !important;
                }
                
                .filter-item-row:hover {
                    background-color: #f8fafc;
                }
                
                .filter-item-selected {
                    background-color: #e6effd !important;
                }

                .custom-filter-popup.k-popup {
                    background-color: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                }
                `}
            </style>
            <DataHeader title="교차분석">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                    {/* 데이터 필터 Group */}
                    <div style={{ display: 'flex', alignItems: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', height: '100%' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>데이터 필터</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div ref={filterAnchorRef} style={{ padding: '0', display: 'flex', alignItems: 'center', background: '#ffffff', height: '100%' }}>
                            <div
                                onClick={handleTogglePopup}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: 'transparent', color: '#1e293b',
                                    padding: '0 10px', height: '100%', cursor: 'pointer', fontSize: '12px', fontWeight: 400,
                                    userSelect: 'none', minWidth: '160px'
                                }}
                            >
                                <span style={{ fontSize: '12px' }}>{getFilterButtonText()}</span>
                                <ChevronDown size={14} color="#64748b" style={{ marginLeft: '12px' }} />
                            </div>
                        </div>
                    </div>

                    {/* X Info Dropdown Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', height: '32px', overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: '100%', background: '#f8fafc' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>배너</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                            <DropDownList
                                data={xInfoOptions}
                                textField="text"
                                dataItemKey="value"
                                value={xInfoOptions.find(o => o.value === selectedXInfo) || xInfoOptions[0]}
                                onChange={(e) => setSelectedXInfo(e.value.value)}
                                style={{ width: '180px', height: '100%', border: 'none', fontSize: '13px', color: '#1e293b' }}
                                className="custom-xinfo-dropdown"
                                popupSettings={{ className: "custom-xinfo-popup" }}
                            />
                            <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
                        </div>
                    </div>

                    {/* N Control Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden'
                    }}>
                        <div
                            onClick={() => setShowN(!showN)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '100%', cursor: 'pointer', background: '#eef2ff' }}
                        >
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '4px',
                                background: showN ? '#3b82f6' : '#fff',
                                border: `1.5px solid ${showN ? '#3b82f6' : '#3b82f6'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {showN && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#3730a3', userSelect: 'none' }}>N</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px', height: '100%', background: showN ? '#ffffff' : '#f8fafc' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: showN ? '#1e293b' : '#94a3b8' }}>소수점</span>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '38px', height: '22px', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                                background: showN ? '#ffffff' : '#f1f5f9'
                            }}>
                                <input
                                    type="text"
                                    disabled={!showN}
                                    value={localDecimalN}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-9]/g, '');
                                        if (val !== '') {
                                            let num = parseInt(val);
                                            if (num > 13) num = 13;
                                            setLocalDecimalN(num);
                                        } else {
                                            setLocalDecimalN('');
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setLocalDecimalN(prev => Math.min(13, (prev === '' ? 0 : prev) + 1));
                                        } else if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setLocalDecimalN(prev => Math.max(0, (prev === '' ? 0 : prev) - 1));
                                        }
                                    }}
                                    onBlur={() => {
                                        if (localDecimalN === '') setLocalDecimalN(0);
                                    }}
                                    style={{
                                        width: '100%', height: '100%', border: 'none', background: 'transparent',
                                        textAlign: 'center', fontSize: '13px', fontWeight: 800, color: showN ? '#1e3a8a' : '#94a3b8',
                                        outline: 'none', padding: 0
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* % Control Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden'
                    }}>
                        <div
                            onClick={() => setShowPct(!showPct)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '100%', cursor: 'pointer', background: '#eef2ff' }}
                        >
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '4px',
                                background: showPct ? '#3b82f6' : '#fff',
                                border: `1.5px solid ${showPct ? '#3b82f6' : '#3b82f6'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {showPct && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#3730a3', userSelect: 'none' }}>%</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px', height: '100%', background: showPct ? '#ffffff' : '#f8fafc' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: showPct ? '#1e293b' : '#94a3b8' }}>소수점</span>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '38px', height: '22px', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                                background: showPct ? '#ffffff' : '#f1f5f9'
                            }}>
                                <input
                                    type="text"
                                    disabled={!showPct}
                                    value={localDecimalPct}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-9]/g, '');
                                        if (val !== '') {
                                            let num = parseInt(val);
                                            if (num > 13) num = 13;
                                            setLocalDecimalPct(num);
                                        } else {
                                            setLocalDecimalPct('');
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setLocalDecimalPct(prev => Math.min(13, (prev === '' ? 1 : prev) + 1));
                                        } else if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setLocalDecimalPct(prev => Math.max(0, (prev === '' ? 1 : prev) - 1));
                                        }
                                    }}
                                    onBlur={() => {
                                        if (localDecimalPct === '') setLocalDecimalPct(1);
                                    }}
                                    style={{
                                        width: '100%', height: '100%', border: 'none', background: 'transparent',
                                        textAlign: 'center', fontSize: '13px', fontWeight: 800, color: showPct ? '#1e3a8a' : '#94a3b8',
                                        outline: 'none', padding: 0
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 차이검증 Control Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden'
                    }}>
                        <div
                            onClick={() => setShowTTest(!showTTest)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '100%', cursor: 'pointer', background: '#eef2ff' }}
                        >
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '4px',
                                background: showTTest ? '#3b82f6' : '#fff',
                                border: `1.5px solid ${showTTest ? '#3b82f6' : '#cbd5e1'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {showTTest && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#3730a3', userSelect: 'none' }}>차이검증</span>
                        </div>
                    </div>

                    {/* <button
                        className="dp-btn"
                        onClick={async () => {
                            const pageId = sessionStorage.getItem('pageId');
                            const user = auth?.user?.userId;
                            if (!pageId || !user) return;

                            try {
                                loadingSpinner.show();
                                const requestData = {
                                    pageid: pageId,
                                    user: user,
                                    use_recoded: true,
                                    banner_mode: selectedXInfo === '__none__' ? 'stub' : 'override',
                                    hide_zero_base_columns: hideZeroBaseColumns,
                                    zero_base_columns: hideZeroBaseColumns,
                                    zero_banners: hideZeroBaseColumns,
                                    zero_stubs: uiSettings?.hide_zero_stubs ?? false,
                                    start: 0,
                                    limit: 0,
                                    search: bannerSearch,
                                    filter_expression: filterExpression,
                                    display_policy: {
                                        show_n: showN,
                                        show_percent: showPct,
                                        hide_zero_base_columns: hideZeroBaseColumns,
                                        hide_zero_stubs: uiSettings?.hide_zero_stubs ?? false,
                                        hide_zero_banners: uiSettings?.hide_zero_banners ?? false,
                                        n_digits: Number(decimalN === '' ? 0 : decimalN),
                                        percent_digits: Number(decimalPct === '' ? 1 : decimalPct),
                                        mean_digits: uiSettings?.mean_digits ?? 2,
                                        std_digits: uiSettings?.std_digits ?? 2,
                                        median_digits: uiSettings?.median_digits ?? 2,
                                        min_digits: uiSettings?.min_digits ?? 0,
                                        max_digits: uiSettings?.max_digits ?? 0,
                                        var_digits: uiSettings?.var_digits ?? 2,
                                        zero_display: uiSettings?.zero_display || "0",
                                        empty_display: uiSettings?.empty_display || "blank"
                                    }
                                };
                                if (selectedXInfo !== '__none__') {
                                    requestData.banner = [selectedXInfo];
                                }

                                const result = await getOverviewStyled.mutateAsync(requestData);
                                const payload = result?.resultjson || result || {};

                                const css = payload.style_css || '';
                                const tables = payload.tables || [];
                                const tablesHtml = tables.map(t => t.html || '').join('<div style="height:24px;"></div>');
                                const fullHtml = `<!doctype html><html><head><meta charset="utf-8"/><style>${css}</style></head><body style="margin:0; padding:16px;">${tablesHtml || payload.html || ''}</body></html>`;

                                if (fullHtml && (tables.length > 0 || payload.html)) {
                                    try {
                                        const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
                                        const textBlob = new Blob([fullHtml], { type: 'text/plain' });
                                        const clipboardItem = new window.ClipboardItem({
                                            'text/html': htmlBlob,
                                            'text/plain': textBlob
                                        });
                                        await navigator.clipboard.write([clipboardItem]);
                                        modal.showAlert('알림', `교차분석 결과(${tables.length || 0}개 표)가 스타일을 포함하여 클립보드에 복사되었습니다.`);
                                    } catch (clipErr) {
                                        // Fallback
                                        const textArea = document.createElement("textarea");
                                        textArea.value = fullHtml;
                                        document.body.appendChild(textArea);
                                        textArea.select();
                                        document.execCommand("copy");
                                        document.body.removeChild(textArea);
                                        modal.showAlert('알림', `교차분석 결과가 복사되었습니다.`);
                                    }
                                } else {
                                    modal.showAlert('오류', 'HTML 데이터 생성에 실패했습니다.');
                                }
                            } catch (error) {
                                console.error('HTML Copy Error:', error);
                                modal.showAlert('오류', 'HTML 복사 중 문제가 발생했습니다.');
                            } finally {
                                loadingSpinner.hide();
                            }
                        }}
                        style={{
                            color: '#2563eb', border: '1px solid #2563eb', background: '#ffffff',
                            height: '32px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginLeft: '8px'
                        }}
                    >
                        <Copy size={16} strokeWidth={2.5} style={{ marginRight: '6px' }} /> HTML 복사
                    </button> */}
                    <button
                        className="dp-btn"
                        onClick={() => {
                            // 현재 화면에 표시 중인 표(selectedBanner)의 Base 행에 괄호가 적용되어 있는지 확인
                            const activeBanner = banners.find(b => b.id === selectedBanner) || banners[0];
                            const baseRow = activeBanner?.info?.find(row =>
                                String(row.row_role ?? "").toLowerCase() === 'base' ||
                                String(row.type ?? "").toLowerCase() === 'base' ||
                                String(row.key ?? "").toLowerCase() === 'base'
                            ) || activeBanner?.dataResult?.rows?.find(row =>
                                String(row.row_role ?? "").toLowerCase() === 'base' ||
                                String(row.type ?? "").toLowerCase() === 'base' ||
                                String(row.key ?? "").toLowerCase() === 'base'
                            );

                            const hasParenthesisOnScreen = baseRow
                                ? (baseRow.prefix === "(" && baseRow.postfix === ")")
                                : true; // 못 찾으면 기본값인 true로 설정

                            setExcelShowBaseParenthesis(hasParenthesisOnScreen);
                            setExcelDecimalPct(decimalPct);
                            setIsExcelModalOpen(true);
                        }}
                        style={{
                            color: '#2563eb', border: '1px solid #2563eb', background: '#ffffff',
                            height: '32px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginLeft: '8px'
                        }}
                    >
                        <Download size={16} strokeWidth={2.5} style={{ marginRight: '6px' }} /> 엑셀 다운로드
                    </button>
                    {/* <button
                        className="dp-btn"
                        onClick={() => {
                            setSnapshotLabel('교차분석 전체 저장본');
                            setSnapshotMemo('');
                            setIsSnapshotModalOpen(true);
                        }}
                        style={{
                            color: '#3b5bdb', border: '1px solid #3b5bdb', background: '#ffffff',
                            height: '32px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginLeft: '8px'
                        }}
                    >
                        <Cloud size={16} strokeWidth={2.5} style={{ marginRight: '6px' }} /> 현재 결과 저장
                    </button> */}
                </div>
            </DataHeader>
            <div className="dp-request-container" style={{ flex: 1, minHeight: 0, padding: '16px', gap: '12px' }} onClick={() => updateBannerInfo(banners.find(b => b.id === selectedBanner)?.info.map(it => ({ ...it, inEdit: false })) || [])}>


                {/* 2. 메인 레이아웃 */}
                <div className="dp-main-layout" onClick={(e) => e.stopPropagation()} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
                    <div className={`dp-sidebar-container ${!isBannerSidebarOpen ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                        {!isBannerSidebarOpen && (
                            <div className="dp-sidebar-collapsed-bar" onClick={() => setIsBannerSidebarOpen(true)}>
                                <div className="dp-collapsed-header">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        )}
                        <div className="dp-sidebar custom-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                            <div className="dp-sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '8px' }}>
                                <span>테이블 목록 ({totalTables})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button className="dp-sidebar-toggle-btn-compact" onClick={() => setIsBannerSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center' }}>
                                        <ChevronLeft size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="dp-sidebar-header" style={{ display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <div className="dp-search-input-wrapper" style={{ flex: 1, width: '100%' }}>
                                    <Search size={14} className="dp-search-input-icon" />
                                    <input
                                        type="text"
                                        placeholder="변수명 또는 라벨 검색"
                                        value={bannerSearch}
                                        onChange={(e) => setBannerSearch(e.target.value)}
                                        className="dp-search-input"
                                    />
                                </div>
                            </div>
                            <div className="dp-banner-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                {filteredBanners.map(banner => (
                                    <div key={banner.id}
                                        id={`sidebar_item_${banner.id}`}
                                        className={`dp-banner-item ${selectedBanner === banner.id ? 'active' : ''}`}
                                        onClick={() => {
                                            isSidebarClickScrolling.current = true;
                                            setSelectedBanner(banner.id);
                                            setCurrentLabel(banner.label);
                                            setCurrentId(banner.id.startsWith('NEW_') ? '' : banner.id);
                                            setCurrentXInfo(banner.type || '단일 응답형 (Single)');
                                            setTimeout(() => {
                                                const el = document.getElementById(`banner_block_${banner.id}`);
                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                setTimeout(() => {
                                                    isSidebarClickScrolling.current = false;
                                                }, 800); // 부드러운 스크롤이 끝날 때까지 Observer 무시
                                            }, 50);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', minHeight: '40px', borderRadius: '8px' }}
                                        title={`${banner.label || ''}${banner.id && !banner.id.startsWith('NEW_') ? ` (${banner.id})` : ''}`}
                                    >
                                        <div className="dp-banner-item-info" style={{ flex: 1, paddingRight: '8px' }}>
                                            <span className="dp-banner-label" style={{ display: 'block', marginBottom: '1px', lineHeight: 1.3, fontSize: '12px', wordBreak: 'break-all' }}>
                                                {banner.id.startsWith('NEW_') ? (banner.label || '(새 문항 작성 중)') : banner.label}
                                            </span>
                                            <span className="dp-banner-sub" style={{ display: 'block', fontSize: '11px', opacity: 0.6, wordBreak: 'break-all', lineHeight: 1.3 }}>
                                                {banner.id.startsWith('NEW_') ? '저장 대기' : banner.id}
                                            </span>
                                        </div>
                                        {banner.raw?.type && (
                                            <div style={{
                                                fontSize: '11px',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                whiteSpace: 'nowrap',
                                                fontWeight: '800',
                                                textTransform: 'lowercase',
                                                ...(banner.raw.type === 'single' ? { background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' } :
                                                    (banner.raw.type === 'double' || banner.raw.type === 'multi') ? { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' } :
                                                        banner.raw.type === 'scale' ? { background: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7' } :
                                                            banner.raw.type === 'rank' ? { background: '#fdf4ff', color: '#a21caf', border: '1px solid #fae8ff' } :
                                                                { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' })
                                            }}>
                                                {banner.raw.type === 'double' ? 'multi' : banner.raw.type}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* 페이징 UI */}
                            {totalTables > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage <= 1}
                                        style={{
                                            width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: 0, border: '1px solid #e2e8f0', borderRadius: '6px',
                                            background: currentPage <= 1 ? '#f8fafc' : '#ffffff',
                                            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                                            color: currentPage <= 1 ? '#cbd5e1' : '#475569'
                                        }}
                                    >
                                        <ChevronsLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage <= 1}
                                        style={{
                                            width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: 0, border: '1px solid #e2e8f0', borderRadius: '6px',
                                            background: currentPage <= 1 ? '#f8fafc' : '#ffffff',
                                            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                                            color: currentPage <= 1 ? '#cbd5e1' : '#475569'
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', userSelect: 'none', margin: '0 8px' }}>
                                        <span style={{ color: '#1e3a8a' }}>{currentPage}</span> / <span style={{ color: '#0f172a' }}>{Math.ceil(totalTables / PAGE_SIZE)}</span>
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalTables / PAGE_SIZE), p + 1))}
                                        disabled={currentPage >= Math.ceil(totalTables / PAGE_SIZE)}
                                        style={{
                                            width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: 0, border: '1px solid #e2e8f0', borderRadius: '6px',
                                            background: currentPage >= Math.ceil(totalTables / PAGE_SIZE) ? '#f8fafc' : '#ffffff',
                                            cursor: currentPage >= Math.ceil(totalTables / PAGE_SIZE) ? 'not-allowed' : 'pointer',
                                            color: currentPage >= Math.ceil(totalTables / PAGE_SIZE) ? '#cbd5e1' : '#475569'
                                        }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(Math.ceil(totalTables / PAGE_SIZE))}
                                        disabled={currentPage >= Math.ceil(totalTables / PAGE_SIZE)}
                                        style={{
                                            width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: 0, border: '1px solid #e2e8f0', borderRadius: '6px',
                                            background: currentPage >= Math.ceil(totalTables / PAGE_SIZE) ? '#f8fafc' : '#ffffff',
                                            cursor: currentPage >= Math.ceil(totalTables / PAGE_SIZE) ? 'not-allowed' : 'pointer',
                                            color: currentPage >= Math.ceil(totalTables / PAGE_SIZE) ? '#cbd5e1' : '#475569'
                                        }}
                                    >
                                        <ChevronsRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div id="dp-content-scroll-area" className="dp-content custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '10px', backgroundColor: '#f1f5f9' }}>
                        {filteredBanners.length === 0 && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                표시할 데이터가 없습니다.
                            </div>
                        )}
                        {filteredBanners.map((banner, index) => (
                            <BannerBlock
                                key={banner.id}
                                banner={banner}
                                index={index}
                                isLast={index === filteredBanners.length - 1}
                                showN={showN}
                                showPct={showPct}
                                decimalN={decimalN}
                                decimalPct={decimalPct}
                                uiSettings={uiSettings}
                                projectNum={projectNum}
                                overviewPayload={overviewPayload}
                                userId={auth?.user?.userId}
                                styleCss={styleCss}
                                evaluateChartData={evaluateChartData}
                                selectedXInfo={selectedXInfo}
                                filterExpression={filterExpression}
                                defaultBannerId={defaultBannerId}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* 데이터 필터 모달 (Popup) */}
            <Popup
                anchor={filterAnchorRef.current}
                show={isFilterOpen}
                anchorAlign={{ horizontal: 'left', vertical: 'bottom' }}
                popupAlign={{ horizontal: 'left', vertical: 'top' }}
                popupClass="custom-filter-popup"
                style={{ width: `${filterPopupWidth}px`, marginTop: '4px', zIndex: 1000 }}
            >
                <div ref={filterPopupRef} style={{ background: '#fff', border: '1px solid #3b82f6', borderRadius: '6px', display: 'flex', flexDirection: 'column', maxHeight: '420px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)' }}>

                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <div
                            onClick={toggleAllFilters}
                            style={{ padding: '8px 14px', fontSize: '12px', color: '#1e293b', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', fontWeight: 400, display: 'flex', alignItems: 'center' }}
                            className={`filter-item-row ${draftComputedFilterIds.includes(CROSS_FILTER_ALL_ID) ? 'filter-item-selected' : ''}`}
                        >
                            <div style={{ width: '22px', display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    width: '13px', height: '13px', border: draftComputedFilterIds.includes(CROSS_FILTER_ALL_ID) ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                                    borderRadius: '3px', background: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {draftComputedFilterIds.includes(CROSS_FILTER_ALL_ID) && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '0.5px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                </div>
                            </div>
                            <span>전체</span>
                        </div>

                        <div style={{ padding: '2px 0' }}>
                            {computedFilterOptions.length === 0 ? (
                                <div style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                                    등록된 파생 문항이 없습니다.
                                </div>
                            ) : (
                                computedFilterOptions.map(f => {
                                    const isSelected = draftComputedFilterIds.includes(f.id);
                                    return (
                                        <div
                                            key={f.id}
                                            onClick={() => toggleFilter(f.id)}
                                            className={`filter-item-row ${isSelected ? 'filter-item-selected' : ''}`}
                                            style={{ display: 'flex', alignItems: 'flex-start', padding: '6px 14px', cursor: 'pointer', transition: 'background 0.1s' }}
                                        >
                                            <div style={{ width: '22px', display: 'flex', justifyContent: 'flex-start', marginTop: '1px' }}>
                                                <div style={{
                                                    width: '13px', height: '13px', border: isSelected ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                                                    borderRadius: '3px', background: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {isSelected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '0.5px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                </div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 400, marginBottom: '2px', wordBreak: 'break-all', lineHeight: 1.3 }}>{f.label}</div>
                                                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>{f.variableLabel}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div style={{ padding: '8px 10px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                        <button
                            onClick={applyFilterAndClose}
                            style={{ width: '100%', height: '30px', background: '#3b5bdb', color: '#fff', borderRadius: '4px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseOver={(e) => e.target.style.background = '#364fc7'}
                            onMouseOut={(e) => e.target.style.background = '#3b5bdb'}
                        >
                            확인
                        </button>
                    </div>
                </div>
            </Popup>

            {/* 현재 결과 저장 모달 */}
            {isSnapshotModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>현재 결과 저장</h3>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>저장본 이름</label>
                            <input
                                type="text"
                                value={snapshotLabel}
                                onChange={e => setSnapshotLabel(e.target.value)}
                                placeholder="저장본 이름을 입력하세요"
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>메모</label>
                            <textarea
                                value={snapshotMemo}
                                onChange={e => setSnapshotMemo(e.target.value)}
                                placeholder="메모를 입력하세요 (선택)"
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', height: '80px', resize: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={() => setIsSnapshotModalOpen(false)}
                                style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                            >
                                취소
                            </button>
                            <button
                                onClick={async () => {
                                    if (!snapshotLabel.trim()) {
                                        modal.showAlert('알림', '저장본 이름을 입력해주세요.');
                                        return;
                                    }

                                    const pageId = sessionStorage.getItem('pageId');
                                    const user = auth?.user?.userId;
                                    if (!pageId || !user) return;

                                    try {
                                        loadingSpinner.show();
                                        const requestData = {
                                            pageid: pageId,
                                            user: user,
                                            use_recoded: true,
                                            banner_mode: selectedXInfo === '__none__' ? 'stub' : 'override',
                                            hide_zero_base_columns: hideZeroBaseColumns,
                                            zero_base_columns: hideZeroBaseColumns,
                                            zero_banners: hideZeroBaseColumns,
                                            zero_stubs: uiSettings?.hide_zero_stubs ?? false,
                                            start: 0,
                                            limit: 0,
                                            search: bannerSearch,
                                            filter_expression: filterExpression,
                                            display_policy: {
                                                show_n: showN,
                                                show_percent: showPct,
                                                percent_symbol: showPct,
                                                hide_zero_base_columns: hideZeroBaseColumns,
                                                hide_zero_stubs: uiSettings?.hide_zero_stubs ?? false,
                                                hide_zero_banners: uiSettings?.hide_zero_banners ?? false,
                                                n_digits: Number(decimalN === '' ? 0 : decimalN),
                                                percent_digits: Number(decimalPct === '' ? 1 : decimalPct),
                                                mean_digits: uiSettings?.mean_digits ?? 2,
                                                std_digits: uiSettings?.std_digits ?? 2,
                                                median_digits: uiSettings?.median_digits ?? 2,
                                                min_digits: uiSettings?.min_digits ?? 0,
                                                max_digits: uiSettings?.max_digits ?? 0,
                                                var_digits: uiSettings?.var_digits ?? 2,
                                                zero_display: uiSettings?.zero_display || "0",
                                                empty_display: uiSettings?.empty_display || "blank"
                                            },
                                            label: snapshotLabel,
                                            memo: snapshotMemo,
                                            reuse_existing: true
                                        };

                                        if (selectedXInfo !== '__none__') {
                                            requestData.banner = [selectedXInfo];
                                        }

                                        const result = await createSnapshot.mutateAsync(requestData);

                                        if (result?.success === "777") {
                                            setIsSnapshotModalOpen(false);
                                            setToast({
                                                show: true,
                                                message: (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span>{result.resultjson?.reused ? '기존 저장본을 재사용합니다.' : '보관함에 저장되었습니다.'}</span>
                                                        <button
                                                            onClick={() => {
                                                                const url = new URL(window.location);
                                                                url.searchParams.set('tab', 'TableSnapshotTab');
                                                                window.location.href = url.toString();
                                                            }}
                                                            style={{ padding: '4px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                                                        >
                                                            보관함에서 보기
                                                        </button>
                                                    </div>
                                                )
                                            });
                                        } else {
                                            modal.showAlert('오류', '저장에 실패했습니다.');
                                        }
                                    } catch (error) {
                                        console.error('Snapshot Create Error:', error);
                                        modal.showAlert('오류', '저장 중 문제가 발생했습니다.');
                                    } finally {
                                        loadingSpinner.hide();
                                    }
                                }}
                                style={{ padding: '8px 16px', background: '#3b5bdb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isExcelModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.4)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Download size={22} color="#2563eb" strokeWidth={2.5} />
                            엑셀 다운로드
                        </h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#475569', fontWeight: 500, lineHeight: '1.5' }}>
                            교차분석표를 엑셀 파일로 다운로드 하시겠습니까?
                        </p>
                        <div style={{ marginBottom: '28px', padding: '16px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none'
                                    }}
                                    onClick={() => setExcelShowPct(!excelShowPct)}
                                >
                                    <div style={{
                                        width: '20px', height: '20px', borderRadius: '5px',
                                        background: excelShowPct ? '#2563eb' : '#fff',
                                        border: `1.5px solid ${excelShowPct ? '#2563eb' : '#cbd5e1'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                        transition: 'all 0.15s'
                                    }}>
                                        {excelShowPct && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>% 표출 여부</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>% 소수점</span>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '42px', height: '22px', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                                        background: '#ffffff'
                                    }}>
                                        <input
                                            type="text"
                                            value={excelDecimalPct}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/[^0-9]/g, '');
                                                if (val !== '') {
                                                    let num = parseInt(val);
                                                    if (num > 13) num = 13;
                                                    setExcelDecimalPct(num);
                                                } else {
                                                    setExcelDecimalPct('');
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setExcelDecimalPct(prev => Math.min(13, (prev === '' ? 1 : prev) + 1));
                                                } else if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setExcelDecimalPct(prev => Math.max(0, (prev === '' ? 1 : prev) - 1));
                                                }
                                            }}
                                            onBlur={() => {
                                                if (excelDecimalPct === '') setExcelDecimalPct(1);
                                            }}
                                            style={{
                                                width: '100%', height: '100%', border: 'none', background: 'transparent',
                                                textAlign: 'center', fontSize: '13px', fontWeight: 800, color: '#1e3a8a',
                                                outline: 'none', padding: 0
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none'
                                }}
                                onClick={() => setExcelShowBaseParenthesis(!excelShowBaseParenthesis)}
                            >
                                <div style={{
                                    width: '20px', height: '20px', borderRadius: '5px',
                                    background: excelShowBaseParenthesis ? '#2563eb' : '#fff',
                                    border: `1.5px solid ${excelShowBaseParenthesis ? '#2563eb' : '#cbd5e1'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.15s'
                                }}>
                                    {excelShowBaseParenthesis && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    )}
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Base 기본 (괄호)</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setIsExcelModalOpen(false)}
                                onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                                onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
                                style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, transition: 'background 0.2s' }}
                            >
                                취소
                            </button>
                            <button
                                onClick={async () => {
                                    setIsExcelModalOpen(false);
                                    await handleExcelExport();
                                }}
                                onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
                                onMouseOut={(e) => e.target.style.background = '#2563eb'}
                                style={{ padding: '10px 24px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, transition: 'background 0.2s' }}
                            >
                                다운로드
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toast
                show={toast.show}
                message={toast.message}
                onClose={() => setToast({ ...toast, show: false })}
                duration={4000}
            />
        </>
    );
});

export default CrossAnalysisPage;
