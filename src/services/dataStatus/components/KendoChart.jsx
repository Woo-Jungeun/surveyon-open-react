import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Chart,
    ChartSeries,
    ChartSeriesItem,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartLegend,
    ChartTooltip,
    ChartValueAxis,
    ChartValueAxisItem,
    ChartXAxis,
    ChartXAxisItem,
    ChartYAxis,
    ChartYAxisItem,
    ChartArea
} from "@progress/kendo-react-charts";
import { ArrowLeftRight, LayoutList } from 'lucide-react';
import WordCloud from 'react-d3-cloud';
import ChoroplethMap from './ChoroplethMap';

// Kendo 차트 기본 툴팁 박스와 그림자를 강제로 제거하는 스타일
const tooltipGlobalStyle = `
    .k-chart-tooltip-wrapper, 
    .k-chart-tooltip {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
    }
`;

import { CHART_PALETTES } from '../constants/chartThemes';

// Legacy support for single constant
const CHART_COLORS = CHART_PALETTES.default;

const WordCloudFixer = ({ wordData, dimensions, activePalette, minVal, maxVal }) => {
    const wordDataStr = JSON.stringify(wordData);
    const seedRef = useRef(1);

    const MemoizedWordCloud = useMemo(() => {
        seedRef.current = 1; // 렌더링 될 때마다 시드 초기화
        const seededRandom = () => {
            const x = Math.sin(seedRef.current++) * 10000;
            return x - Math.floor(x);
        };

        return (
            <WordCloud
                data={wordData}
                width={dimensions.width}
                height={dimensions.height}
                font="Pretendard, sans-serif"
                fontStyle="normal"
                fontWeight="bold"
                fontSize={(word) => {
                    const isFullscreen = dimensions.width > 1200;
                    const scale = Math.min(dimensions.width / 1000, dimensions.height / 600);
                    const clampedScale = Math.max(0.4, Math.min(isFullscreen ? 2.0 : 1.0, scale));

                    const textLen = word.text ? String(word.text).length : 10;
                    const lenPenalty = Math.max(isFullscreen ? 0.6 : 0.5, 1 - (textLen / (isFullscreen ? 120 : 60)));

                    const minFs = Math.max(10, Math.round((isFullscreen ? 18 : 14) * clampedScale * lenPenalty));
                    const maxFs = Math.max(14, Math.round((isFullscreen ? 64 : 48) * clampedScale * lenPenalty));

                    if (maxVal === minVal) return (minFs + maxFs) / 2;
                    return minFs + ((word.value - minVal) / (maxVal - minVal)) * (maxFs - minFs);
                }}
                spiral="archimedean"
                rotate={() => 0}
                padding={4}
                random={seededRandom}
                fill={(d, i) => activePalette[i % activePalette.length]}
            />
        );
    }, [wordDataStr, dimensions.width, dimensions.height, activePalette, maxVal, minVal]);

    return MemoizedWordCloud;
};

const KendoChart = ({ data, seriesNames, allowedTypes, initialType, suffix = "%", labelLimit = 0, paletteId = 'default', hideHeader = false, externalShowLegend = undefined }) => {
    const activePalette = CHART_PALETTES[paletteId] || CHART_PALETTES.default;
    const [chartType, setChartType] = useState(initialType || 'column');
    const [internalShowLegend, setInternalShowLegend] = useState(false);
    const showLegend = externalShowLegend !== undefined ? externalShowLegend : internalShowLegend;
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (initialType) {
            setChartType(initialType);
        }
    }, [initialType]);

    const isWordCloud = chartType === 'wordCloud';

    useEffect(() => {
        if (!isWordCloud || !containerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                setDimensions({ width, height });
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [isWordCloud]);
    const [visibleSeries, setVisibleSeries] = useState({});

    useEffect(() => {
        const names = seriesNames || [{ field: 'total', name: '사례수' }];
        const initialVisible = names.reduce((acc, s) => ({ ...acc, [typeof s === 'string' ? s : s.field]: true }), {});
        setVisibleSeries(initialVisible);
    }, [seriesNames]);

    const allChartTypeOptions = [
        { text: "세로형", value: "column" },
        { text: "가로형", value: "bar" },
        { text: "라인", value: "line" },
        { text: "원형", value: "pie" },
        { text: "도넛", value: "donut" },
        { text: "영역", value: "area" },
        { text: "히트맵", value: "heatmap" },
        { text: "지도", value: "map" },
        { text: "방사형", value: "radarLine" },
        { text: "누적형", value: "stackedColumn" },
        { text: "100% 누적", value: "stacked100Column" },
        { text: "깔때기", value: "funnel" },
        { text: "점 도표", value: "scatterPoint" },
        { text: "방사형 영역", value: "radarArea" },
        { text: "워드클라우드", value: "wordCloud" },
    ];

    const chartTypeOptions = allowedTypes
        ? allChartTypeOptions.filter(opt => allowedTypes.includes(opt.value))
        : allChartTypeOptions;

    const showDropdown = chartTypeOptions.length > 1;

    const toggleChartType = () => {
        const currentIndex = chartTypeOptions.findIndex(opt => opt.value === chartType);
        const nextIndex = (currentIndex + 1) % chartTypeOptions.length;
        setChartType(chartTypeOptions[nextIndex].value);
    };

    const isPieOrDonut = chartType === 'pie' || chartType === 'donut';
    const isHeatmap = chartType === 'heatmap';
    const isMap = chartType === 'map';
    const isRadar = chartType === 'radarLine' || chartType === 'radarArea';
    const isStacked = chartType === 'stackedColumn' || chartType === 'stacked100Column';
    const isScatterPoint = chartType === 'scatterPoint';


    // 전체/합계 집계 행은 모든 차트에서 제외 (차트 왜곡 방지)
    const AGGREGATE_LABELS = new Set(['전체', '합계', 'total', 'Total', '전체(명)']);
    const filteredData = Array.isArray(data)
        ? data.filter(row => !AGGREGATE_LABELS.has(row.name))
        : data;

    const renderSeries = () => {
        if (isPieOrDonut) {
            // 기준 필드 찾기: 파이/도넛은 보통 단일 차원이므로 가급적 합계(total) 기준 적용을 우선
            const defaultField = suffix === '%' ? 'total_pct' : 'total';
            let targetField = defaultField;

            if (filteredData.length > 0 && typeof filteredData[0][defaultField] !== 'undefined') {
                targetField = defaultField;
            } else if (filteredData.length > 0 && typeof filteredData[0]['total'] !== 'undefined') {
                targetField = 'total';
            } else if (seriesNames && seriesNames.length > 0) {
                targetField = typeof seriesNames[0] === 'string' ? seriesNames[0] : seriesNames[0].field;
            }

            const pieData = filteredData
                .map((row, index) => ({
                    name: String(row.name).replace(/\n/g, ' '),
                    pieValue: Number(row[targetField] || 0),
                    color: activePalette[index % activePalette.length]
                }));
            return (
                <ChartSeriesItem
                    type={chartType}
                    data={pieData}
                    categoryField="name"
                    field="pieValue"
                    colorField="color"
                    labels={{ visible: false }}
                />
            );
        }

        if (isHeatmap) {
            const heatmapData = [];
            const targetSeries = seriesNames || ["완료", "선정탈락", "쿼터오버"];

            targetSeries.forEach(s => {
                const field = typeof s === 'string' ? s : s.field;
                const label = typeof s === 'string' ? s : s.name;
                filteredData.forEach(item => {
                    heatmapData.push({
                        x: item.name,
                        y: label,
                        value: item[field]
                    });
                });
            });

            return (
                <ChartSeriesItem
                    type="heatmap"
                    data={heatmapData}
                    xField="x"
                    yField="y"
                    field="value"
                    xAxis="xAxis"
                    yAxis="yAxis"
                    labels={{
                        visible: true,
                        content: (e) => `${e.value}${suffix}`,
                        color: '#fff'
                    }}
                    color={activePalette[0]}
                />
            );
        }

        if (chartType === 'funnel') {
            // 퍼널: 각 행(row)를 단계로, total count를 값으로 사용 (파이/도넛과 동일)
            const funnelData = filteredData.map((item, index) => ({
                name: String(item.name).replace(/\n/g, ' '),
                funnelValue: Number(item['total'] || 0),
                color: activePalette[index % activePalette.length]
            }));

            return (
                <ChartSeriesItem
                    type="funnel"
                    data={funnelData}
                    categoryField="name"
                    field="funnelValue"
                    colorField="color"
                    labels={{
                        visible: false,
                        content: () => "",
                    }}
                />
            );
        }

        const targetSeries = seriesNames || ["완료", "선정탈락", "쿼터오버"];

        // Sophisticated, modern palette matching the theme (Blue/Slate/Teal based with accents)
        const colors = activePalette;

        return targetSeries.map((s, index) => {
            const field = typeof s === 'string' ? s : s.field;
            const label = typeof s === 'string' ? s : s.name;
            return (
                <ChartSeriesItem
                    key={field}
                    type={isRadar ? (chartType === 'radarArea' ? 'radarArea' : 'radarLine') : (isStacked ? "column" : (isScatterPoint ? "line" : chartType))}
                    stack={chartType === 'stacked100Column' ? { type: '100%' } : (chartType === 'stackedColumn' ? true : undefined)}
                    data={filteredData}
                    field={field}
                    name={label}
                    color={colors[index % colors.length]}
                    visible={visibleSeries[field]}
                    style={isRadar ? "smooth" : "normal"}
                    opacity={chartType === 'radarArea' ? 0.3 : undefined}
                    width={isScatterPoint ? 0 : undefined}
                    markers={isScatterPoint ? { visible: true, size: 10, type: "circle" } : undefined}
                    labels={isStacked ? {
                        visible: true,
                        content: (e) => {
                            if (!e.value || Number(e.value) === 0) return "";
                            return chartType === 'stacked100Column' ? `${(e.percentage * 100).toFixed(0)}%` : `${e.value}${suffix}`;
                        },
                        position: "center",
                        background: "none",
                        color: "#fff"
                    } : undefined}
                />
            );
        });
    };

    const onLegendItemClick = (e) => {
        if (!isPieOrDonut && !isHeatmap && !isWordCloud) {
            const seriesField = e.series.field;
            setVisibleSeries(prev => ({
                ...prev,
                [seriesField]: !prev[seriesField]
            }));
        }
    };

    // 지도 모드일 때는 ChoroplethMap 렌더링
    if (isMap) {
        return <ChoroplethMap data={data} />;
    }

    // 워드 클라우드 렌더링
    if (isWordCloud) {
        // Transform data for WordCloud: { text: string, value: number }
        let wordData = [];

        // case A: seriesNames가 있는 경우 (추가분석 - 각 열의 데이터를 항목별로 합산하거나 특정 열 기준)
        if (seriesNames && seriesNames.length > 0) {
            // 모든 항목(rows)에 대해 각 시리즈(columns)의 값을 합산하여 중요도 판단
            wordData = filteredData.map(item => {
                let totalVal = 0;
                seriesNames.forEach(s => {
                    const field = typeof s === 'string' ? s : s.field;
                    totalVal += Number(item[field] || 0);
                });
                return {
                    text: item.name,
                    value: totalVal
                };
            });
        } else {
            // case B: 일반적인 name/total 구조
            wordData = filteredData.map(item => ({
                text: item.name,
                value: Number(item.total || 0)
            }));
        }

        // 값이 0인 데이터 제외 및 상위 N개 제한 (너무 많으면 렌더링 지저분함)
        wordData = wordData.filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 50);

        if (wordData.length === 0) {
            return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>표시할 데이터가 없습니다.</div>
        }

        const minVal = Math.min(...wordData.map(d => d.value));
        const maxVal = Math.max(...wordData.map(d => d.value));

        return (
            <div className="agg-chart-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', position: 'relative' }}>
                <div ref={containerRef} style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                    {dimensions.width > 0 && dimensions.height > 0 && wordData.length > 0 && (
                        <WordCloudFixer
                            wordData={wordData}
                            dimensions={dimensions}
                            activePalette={activePalette}
                            minVal={minVal}
                            maxVal={maxVal}
                        />
                    )}
                </div>
            </div>
        );
    }

    const activeSeriesCount = Object.keys(visibleSeries).length > 0 ? Object.values(visibleSeries).filter(Boolean).length : (seriesNames?.length || 1);

    // 가로 스크롤이 필요한 차트 타입인지 확인
    const isHorizontalScrollType = ['column', 'stackedColumn', 'stacked100Column', 'line', 'area', 'scatterPoint', 'heatmap'].includes(chartType);
    // 세로 스크롤이 필요한 차트 타입인지 확인 (가로형 막대)
    const isVerticalScrollType = ['bar'].includes(chartType);

    // 최소 너비/높이 계산 (그룹 수 * 항목 수에 비례)
    let calculatedWidth = '100%';
    let calculatedHeight = '100%';

    if (chartType === 'heatmap') {
        calculatedWidth = Math.max(100, data.length * 100); // 100px per column to accommodate horizontal labels
    } else if (isHorizontalScrollType) {
        const isStacked = ['stackedColumn', 'stacked100Column', 'line', 'area'].includes(chartType);
        // Increase base width for stacked types to 180px to safely show long X-axis labels
        const groupWidth = isStacked ? 180 : Math.max(120, activeSeriesCount * 25);
        calculatedWidth = Math.max(100, data.length * groupWidth + 100);
    }

    if (isVerticalScrollType) {
        const groupHeight = Math.max(45, activeSeriesCount * 8); // 라벨 3줄 표시를 위한 최소 높이 45px 확보, 막대당 8px
        calculatedHeight = Math.max(200, data.length * groupHeight + 50);
    }

    // --- 그룹 시각화를 위한 PlotBands 계산 ---
    const categoryPlotBands = useMemo(() => {
        const bands = [];
        let currentGroup = null;
        let startIndex = 0;
        let isAlt = false;

        filteredData.forEach((d, i) => {
            const lines = String(d.name).split('\n');
            const groupName = lines.length > 1 ? lines[lines.length - 1] : d.name; // 줄바꿈이 있으면 맨 마지막 줄이 그룹명

            if (i === 0) {
                currentGroup = groupName;
            } else if (groupName !== currentGroup) {
                if (isAlt) {
                    bands.push({ from: startIndex, to: i, color: 'rgba(0, 0, 0, 0.03)' });
                }
                currentGroup = groupName;
                startIndex = i;
                isAlt = !isAlt;
            }
        });

        // 마지막 그룹 처리
        if (isAlt && filteredData.length > 0) {
            bands.push({ from: startIndex, to: filteredData.length, color: 'rgba(0, 0, 0, 0.03)' });
        }
        return bands;
    }, [filteredData]);

    return (
        <div className="agg-chart-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', width: '100%' }}>
            <style>{tooltipGlobalStyle}</style>
            {!hideHeader && (
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px', flexShrink: 0 }}>
                    {!isHeatmap && externalShowLegend === undefined && (
                        <button
                            onClick={() => setInternalShowLegend(!internalShowLegend)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            backgroundColor: showLegend ? '#eff6ff' : 'white',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: showLegend ? '#2563eb' : '#475569',
                            borderIColor: showLegend ? '#bfdbfe' : '#e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { if (!showLegend) e.currentTarget.style.backgroundColor = '#f8fafc' }}
                        onMouseLeave={(e) => { if (!showLegend) e.currentTarget.style.backgroundColor = 'white' }}
                    >
                        <span>범례 {showLegend ? '숨기기' : '보기'}</span>
                        <LayoutList size={14} />
                    </button>
                )}

                {showDropdown && (
                    <button
                        onClick={toggleChartType}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            backgroundColor: 'white',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                        <span>{chartTypeOptions.find(opt => opt.value === chartType)?.text}</span>
                        <ArrowLeftRight size={14} />
                    </button>
                )}
                </div>
            )}

            {showLegend && !isHeatmap && (
                <div className="custom-kendo-legend" style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px 16px',
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    flexShrink: 0
                }}>
                    {(() => {
                        const items = [];
                        if (isPieOrDonut || chartType === 'funnel') {
                            filteredData.forEach((row, index) => {
                                items.push({
                                    name: String(row.name).replace(/\n/g, ' '),
                                    color: activePalette[index % activePalette.length],
                                    field: row.name,
                                    canToggle: false
                                });
                            });
                        } else {
                            const targetSeries = seriesNames || ["완료", "선정탈락", "쿼터오버"];
                            targetSeries.forEach((s, index) => {
                                const field = typeof s === 'string' ? s : s.field;
                                const label = typeof s === 'string' ? s : s.name;
                                items.push({
                                    name: String(label).replace(/\n/g, ' '),
                                    color: activePalette[index % activePalette.length],
                                    field: field,
                                    canToggle: true
                                });
                            });
                        }

                        return items.map((item, idx) => {
                            const isHidden = item.canToggle && visibleSeries[item.field] === false;
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '6px',
                                        fontSize: '12px',
                                        color: '#334155',
                                        cursor: item.canToggle ? 'pointer' : 'default',
                                        opacity: isHidden ? 0.4 : 1,
                                        transition: 'opacity 0.2s',
                                        maxWidth: '100%'
                                    }}
                                    onClick={() => {
                                        if (item.canToggle) {
                                            setVisibleSeries(prev => ({ ...prev, [item.field]: !prev[item.field] }));
                                        }
                                    }}
                                    title={item.name}
                                >
                                    <div style={{ width: '12px', height: '12px', backgroundColor: isHidden ? '#cbd5e1' : item.color, borderRadius: '2px', flexShrink: 0, marginTop: '2px' }}></div>
                                    <span style={{
                                        wordBreak: 'keep-all',
                                        lineHeight: '1.4',
                                        flex: 1
                                    }}>
                                        {item.name}
                                    </span>
                                </div>
                            );
                        });
                    })()}
                </div>
            )}

            <div style={{ flex: 1, overflowX: isHorizontalScrollType ? 'auto' : 'hidden', overflowY: isVerticalScrollType ? 'auto' : 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                    width: typeof calculatedWidth === 'number' ? `${calculatedWidth}px` : calculatedWidth,
                    minWidth: typeof calculatedWidth === 'number' ? `${calculatedWidth}px` : '100%',
                    height: typeof calculatedHeight === 'number' ? `${calculatedHeight}px` : calculatedHeight,
                    minHeight: typeof calculatedHeight === 'number' ? `${calculatedHeight}px` : '100%',
                    flex: isVerticalScrollType || isHorizontalScrollType ? 'none' : 1
                }}>
                    <Chart
                        style={{ width: '100%', height: '100%' }}
                        key={`${chartType}-${JSON.stringify(visibleSeries)}`}
                        seriesColors={CHART_COLORS}
                        transitions={false}
                    >
                        {/* 차트 여백 조정: 하단에 가로 스크롤과 레이블 공간 확보 */}
                        <ChartArea background="none" margin={{ top: 20, bottom: 20, left: 10, right: 10 }} />
                        <ChartLegend visible={false} />

                        {/* Axes for Standard Charts */}
                        {
                            !isPieOrDonut && !isHeatmap && !isRadar && (
                                <ChartCategoryAxis>
                                    <ChartCategoryAxisItem
                                        categories={filteredData.map(d => d.name)}
                                        plotBands={categoryPlotBands}
                                        labels={{
                                            rotation: 0,
                                            padding: { top: 10 },
                                            content: (e) => {
                                                if (!e.value) return '';
                                                const limit = labelLimit > 0 ? labelLimit : 12;
                                                const text = String(e.value);

                                                // 대/중/소분류 등 계층으로 인해 이미 줄바꿈이 적용되어 있는 경우에도 길면 자동 줄바꿈 처리
                                                if (text.includes('\n')) {
                                                    return text.split('\n').map((l, idx, arr) => {
                                                        const subChunks = [];
                                                        for (let i = 0; i < l.length; i += limit) {
                                                            subChunks.push(l.substring(i, i + limit));
                                                        }
                                                        // 그룹명(마지막 줄)은 좀 더 흐리게 표시하여 시각적 분리
                                                        const isGroupLine = arr.length > 1 && idx === arr.length - 1;
                                                        return subChunks.join('\n');
                                                    }).join('\n');
                                                }

                                                // 소분류만 있어서 한 줄로 길게 오는 경우 (일정 글자수 단위로 줄바꿈 처리하여 가로로 표출)
                                                const chunks = [];
                                                for (let i = 0; i < text.length; i += limit) {
                                                    chunks.push(text.substring(i, i + limit));
                                                }
                                                return chunks.join('\n');
                                            },
                                            font: "12px Pretendard, sans-serif"
                                        }}
                                    />
                                </ChartCategoryAxis>
                            )
                        }
                        {
                            isRadar && (
                                <ChartCategoryAxis>
                                    <ChartCategoryAxisItem
                                        categories={filteredData.map(d => String(d.name).replace(/\n/g, ' '))}
                                        labels={{
                                            visible: filteredData.length <= 30,
                                            font: "11px sans-serif",
                                            content: (e) => {
                                                if (!e.value) return '';
                                                const limit = labelLimit > 0 ? labelLimit : 12;
                                                return String(e.value).length > limit ? String(e.value).substring(0, limit) + '...' : e.value;
                                            }
                                        }}
                                    />
                                </ChartCategoryAxis>
                            )
                        }
                        {
                            !isPieOrDonut && !isHeatmap && !isRadar && (
                                <ChartValueAxis>
                                    <ChartValueAxisItem
                                        labels={{
                                            format: chartType === 'stacked100Column' ? '{0:P0}' : (suffix ? `{0}${suffix}` : '{0}')
                                        }}
                                        min={0}
                                        max={chartType === 'stacked100Column' ? 1 : (suffix === '%' ? 110 : undefined)}
                                        majorUnit={chartType === 'stacked100Column' ? 0.2 : (suffix === '%' ? 20 : undefined)}
                                        reverse={false}
                                    />
                                </ChartValueAxis>
                            )
                        }
                        {
                            isRadar && (
                                <ChartValueAxis>
                                    <ChartValueAxisItem
                                        labels={{ format: suffix ? `{0}${suffix}` : '{0}' }}
                                        min={0}
                                        max={suffix === '%' ? 110 : undefined}
                                        majorUnit={suffix === '%' ? 20 : undefined}
                                    />
                                </ChartValueAxis>
                            )
                        }

                        {/* Axes for Heatmap */}
                        {
                            isHeatmap && (
                                <>
                                    <ChartXAxis>
                                        <ChartXAxisItem
                                            name="xAxis"
                                            categories={filteredData.map(d => typeof d === 'string' ? d : (d.name || d.category || ''))}
                                            labels={{
                                                rotation: 0,
                                                padding: { top: 10 },
                                                content: (e) => {
                                                    if (!e.value) return '';
                                                    const maxLen = 10;
                                                    return String(e.value).split('\n').map(part => {
                                                        const p = part.trim();
                                                        return p.length > maxLen ? p.substring(0, maxLen) + '...' : p;
                                                    }).join('\n');
                                                }
                                            }}
                                        />
                                    </ChartXAxis>
                                    <ChartYAxis>
                                        <ChartYAxisItem
                                            name="yAxis"
                                            categories={(seriesNames || []).map(s => typeof s === 'string' ? s : (s.name || s.label || ''))}
                                            labels={{
                                                content: (e) => {
                                                    if (!e.value) return '';
                                                    const limit = labelLimit > 0 ? labelLimit : 15;
                                                    let text = String(e.value).replace(/\n/g, ' ');
                                                    return text.length > limit ? text.substring(0, limit) + '...' : text;
                                                }
                                            }}
                                        />
                                    </ChartYAxis>
                                </>
                            )
                        }

                        <ChartTooltip
                            visible={true}
                            background="transparent"
                            border={{ width: 0, color: 'transparent' }}
                            shadow={{ visible: false }}
                            padding={0}
                            opacity={1}
                            animation={false}
                            render={(e) => {
                                const category = e.point ? e.point.category : e.category;
                                const value = e.point ? e.point.value : e.value;

                                const seriesName = e.series?.name || e.point?.series?.name || e.series?.field || "";
                                const seriesColor = e.point?.dataItem?.color || e.point?.options?.color || e.point?.color || e.series?.color || (e.point?.series?.color) || '#334155';

                                // 히트맵용 심플 스타일
                                if (isHeatmap) {
                                    return (
                                        <div style={{ padding: '8px 12px', backgroundColor: seriesColor || '#334155', color: '#fff', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: '13px', fontWeight: '500', maxWidth: '300px', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', textAlign: 'left', lineHeight: '1.4' }}>
                                            <div style={{ opacity: 0.9, fontSize: '11px', marginBottom: '2px' }}>{String(e.point?.dataItem?.y).replace(/\n/g, ' ')}\n{e.point?.dataItem?.x}</div>
                                            <strong>{e.point?.dataItem?.value}{suffix}</strong>
                                        </div>
                                    );
                                }

                                // 파이/도넛/퍼널용 심플 스타일
                                if (isPieOrDonut || chartType === 'funnel') {
                                    const pctValue = e.point?.percentage ? (e.point.percentage * 100).toFixed(1) : value;
                                    return (
                                        <div style={{ padding: '8px 12px', backgroundColor: seriesColor || '#334155', color: '#fff', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: '13px', fontWeight: '500', maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'keep-all', textAlign: 'left', lineHeight: '1.4' }}>
                                            <div style={{ opacity: 0.9, fontSize: '11px', marginBottom: '4px' }}>{category}</div>
                                            <div>
                                                <strong>{value}{suffix}</strong>
                                                {chartType === 'pie' && suffix !== '%' && <span style={{ opacity: 0.9, fontSize: '11px', marginLeft: '4px' }}>({pctValue}%)</span>}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div style={{
                                        padding: '8px 12px',
                                        backgroundColor: seriesColor,
                                        color: '#fff',
                                        borderRadius: '4px',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        maxWidth: '300px',
                                        whiteSpace: 'normal',
                                        wordBreak: 'keep-all',
                                        textAlign: 'left',
                                        lineHeight: '1.4'
                                    }}>
                                        <div style={{ opacity: 0.9, fontSize: '11px', marginBottom: '2px' }}>
                                            {category}
                                        </div>
                                        <div>
                                            {seriesName && `${seriesName}: `}<strong>{value}{suffix}</strong>
                                        </div>
                                    </div>
                                );
                            }} />
                        <ChartSeries>
                            {renderSeries()}
                        </ChartSeries>
                    </Chart >
                </div>
            </div>
        </div >
    );
};

export default React.memo(KendoChart);
