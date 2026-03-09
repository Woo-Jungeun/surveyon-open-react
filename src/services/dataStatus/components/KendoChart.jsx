import React, { useState, useEffect, useRef } from 'react';
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

const CHART_COLORS = [
    "#60a5fa", "#fb923c", "#34d399", "#a78bfa", "#fb7185", "#22d3ee",
    "#facc15", "#f472b6", "#818cf8", "#a3e635", "#2dd4bf", "#f87171"
];

const KendoChart = ({ data, seriesNames, allowedTypes, initialType, suffix = "%", labelLimit = 0 }) => {
    const [chartType, setChartType] = useState(initialType || 'column');
    const [showLegend, setShowLegend] = useState(false);
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


    const renderSeries = () => {
        if (isPieOrDonut) {
            return (
                <ChartSeriesItem
                    type={chartType}
                    data={data}
                    categoryField="name"
                    field={(seriesNames && seriesNames[0]?.field) || "total"}
                    name={(seriesNames && seriesNames[0]?.name) || "Total"}
                    labels={{
                        visible: true,
                        content: (e) => `${e.category}: ${e.value}${suffix}`,
                        position: "outsideEnd",
                        background: "none"
                    }}
                />
            );
        }

        if (isHeatmap) {
            const heatmapData = [];
            const targetSeries = seriesNames || ["완료", "선정탈락", "쿼터오버"];

            targetSeries.forEach(s => {
                const field = typeof s === 'string' ? s : s.field;
                const label = typeof s === 'string' ? s : s.name;
                data.forEach(item => {
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
                    color="#5c9aff"
                />
            );
        }

        if (chartType === 'funnel') {
            const coloredData = data.map((item, index) => ({
                ...item,
                color: CHART_COLORS[index % CHART_COLORS.length]
            }));

            const field = (seriesNames && seriesNames[0]?.field) || "total";
            const name = (seriesNames && seriesNames[0]?.name) || "Total";

            return (
                <ChartSeriesItem
                    type="funnel"
                    data={coloredData}
                    categoryField="name"
                    field={field}
                    colorField="color"
                    name={name}
                    labels={{
                        visible: false,
                        content: () => "",
                    }}
                />
            );
        }

        const targetSeries = seriesNames || ["완료", "선정탈락", "쿼터오버"];

        // Sophisticated, modern palette matching the theme (Blue/Slate/Teal based with accents)
        const colors = CHART_COLORS;

        return targetSeries.map((s, index) => {
            const field = typeof s === 'string' ? s : s.field;
            const label = typeof s === 'string' ? s : s.name;
            return (
                <ChartSeriesItem
                    key={field}
                    type={isRadar ? (chartType === 'radarArea' ? 'radarArea' : 'radarLine') : (isStacked ? "column" : (isScatterPoint ? "line" : chartType))}
                    stack={chartType === 'stacked100Column' ? { type: '100%' } : (chartType === 'stackedColumn' ? true : undefined)}
                    data={data}
                    field={field}
                    name={label}
                    color={colors[index % colors.length]}
                    visible={visibleSeries[field]}
                    style={isRadar ? "smooth" : "normal"}
                    opacity={chartType === 'radarArea' ? 0.3 : undefined}
                    width={isScatterPoint ? 0 : undefined}
                    markers={isScatterPoint ? { visible: true, size: 10, type: "circle" } : undefined}
                    labels={isStacked ? { visible: true, content: (e) => chartType === 'stacked100Column' ? `${(e.percentage * 100).toFixed(0)}%` : `${e.value}${suffix}`, position: "center", background: "none", color: "#fff" } : undefined}
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
        const wordData = data.map(item => ({
            text: item.name,
            value: item.total ? item.total : (item.count || 10) // fallback value
        }));

        return (
            <div className="agg-chart-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', position: 'relative' }}>
                {showDropdown && (
                    <div className="chart-header" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
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
                            <span>워드클라우드</span>
                            <ArrowLeftRight size={14} />
                        </button>
                    </div>
                )}
                <div ref={containerRef} style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                    {dimensions.width > 0 && dimensions.height > 0 && (
                        <WordCloud
                            data={wordData}
                            width={dimensions.width}
                            height={dimensions.height}
                            font="Pretendard, sans-serif"
                            fontStyle="normal"
                            fontWeight="bold"
                            fontSize={(word) => word.value / 5 + 12}
                            spiral="archimedean"
                            rotate={(word) => (word.value % 2 === 0 ? 0 : 90)}
                            padding={2}
                            fill={(d, i) => CHART_COLORS[i % CHART_COLORS.length]}
                        />
                    )}
                </div>
            </div>
        );
    }

    // 가로 스크롤이 필요한 차트 타입인지 확인
    const isHorizontalScrollType = ['column', 'stackedColumn', 'stacked100Column', 'line', 'area', 'scatterPoint'].includes(chartType);
    // 항목당 최소 너비 80px 확보 (단, 전체 컨테이너보다 작아지지 않게 함)
    const calculatedWidth = isHorizontalScrollType ? Math.max(100, data.length * 80) : '100%';

    return (
        <div className="agg-chart-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', width: '100%' }}>
            <style>{tooltipGlobalStyle}</style>
            <div className="chart-header" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px', flexShrink: 0 }}>
                <button
                    onClick={() => setShowLegend(!showLegend)}
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
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                    width: isHorizontalScrollType ? `${calculatedWidth}px` : '100%',
                    minWidth: '100%',
                    height: '100%',
                    flex: 1
                }}>
                    <Chart
                        style={{ width: '100%', height: '100%' }}
                        key={`${chartType}-${JSON.stringify(visibleSeries)}`}
                        onLegendItemClick={onLegendItemClick}
                        seriesColors={CHART_COLORS}
                        transitions={false}
                    >
                        {/* 차트 여백 조정: 하단에 가로 스크롤과 레이블 공간 확보 */}
                        <ChartArea background="none" margin={{ top: 20, bottom: showLegend ? 20 : 60, left: 10, right: 10 }} />
                        {!isHeatmap && <ChartLegend visible={showLegend} position="bottom" orientation="horizontal" margin={{ top: 10 }} />}

                        {/* Axes for Standard Charts */}
                        {
                            !isPieOrDonut && !isHeatmap && !isRadar && (
                                <ChartCategoryAxis>
                                    <ChartCategoryAxisItem
                                        categories={data.map(d => d.name)}
                                        labels={{
                                            rotation: data.length > 5 ? -45 : 0,
                                            padding: { top: 10 },
                                            content: (e) => (labelLimit > 0 && e.value && e.value.length > labelLimit) ? e.value.substring(0, labelLimit) + '...' : e.value
                                        }}
                                    />
                                </ChartCategoryAxis>
                            )
                        }
                        {
                            isRadar && (
                                <ChartCategoryAxis>
                                    <ChartCategoryAxisItem categories={data.map(d => d.name)} />
                                </ChartCategoryAxis>
                            )
                        }
                        {
                            !isPieOrDonut && !isHeatmap && !isRadar && (
                                <ChartValueAxis>
                                    <ChartValueAxisItem
                                        labels={{ format: `{0}${suffix}` }}
                                        min={0}
                                        max={100}
                                        majorUnit={20}
                                        reverse={false}
                                    />
                                </ChartValueAxis>
                            )
                        }
                        {
                            isRadar && (
                                <ChartValueAxis>
                                    <ChartValueAxisItem
                                        labels={{ format: `{0}${suffix}` }}
                                        min={0}
                                        max={100}
                                        majorUnit={20}
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
                                            categories={data.map(d => typeof d === 'string' ? d : (d.name || d.category || ''))}
                                            labels={{
                                                rotation: data.length > 5 ? -45 : 0,
                                                padding: { top: 10 },
                                                content: (e) => (labelLimit > 0 && e.value && e.value.length > labelLimit) ? e.value.substring(0, labelLimit) + '...' : e.value
                                            }}
                                        />
                                    </ChartXAxis>
                                    <ChartYAxis>
                                        <ChartYAxisItem
                                            name="yAxis"
                                            categories={(seriesNames || []).map(s => typeof s === 'string' ? s : (s.name || s.label || ''))}
                                            labels={{
                                                content: (e) => (labelLimit > 0 && e.value && e.value.length > labelLimit) ? e.value.substring(0, labelLimit) + '...' : e.value
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
                            render={(e) => {
                                const category = e.point ? e.point.category : e.category;
                                const value = e.point ? e.point.value : e.value;

                                const seriesName = e.series?.name || e.point?.series?.name || e.series?.field || "";
                                const seriesColor = e.series?.color || e.point?.color || (e.point?.series?.color);

                                // 히트맵용 심플 스타일
                                if (isHeatmap) {
                                    return (
                                        <div style={{ padding: '8px 12px', backgroundColor: seriesColor || '#334155', color: '#fff', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: '13px', fontWeight: '500' }}>
                                            <div style={{ opacity: 0.9, fontSize: '11px', marginBottom: '2px' }}>{e.point?.dataItem?.y} - {e.point?.dataItem?.x}</div>
                                            <strong>{e.point?.dataItem?.value}{suffix}</strong>
                                        </div>
                                    );
                                }

                                // 파이/도넛/퍼널용 심플 스타일
                                if (isPieOrDonut || chartType === 'funnel') {
                                    return (
                                        <div style={{ padding: '8px 12px', backgroundColor: seriesColor || '#334155', color: '#fff', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: '13px', fontWeight: '500' }}>
                                            <strong>{category}: {value}{suffix}</strong>
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
                                        fontWeight: '500'
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

export default KendoChart;
