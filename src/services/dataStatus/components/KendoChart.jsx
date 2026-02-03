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
    ChartArea
} from "@progress/kendo-react-charts";
import { ArrowLeftRight } from 'lucide-react';
import WordCloud from 'react-d3-cloud';
import ChoroplethMap from './ChoroplethMap';

const CHART_COLORS = [
    "#60a5fa", "#fb923c", "#34d399", "#a78bfa", "#fb7185", "#22d3ee",
    "#facc15", "#f472b6", "#818cf8", "#a3e635", "#2dd4bf", "#f87171"
];

const KendoChart = ({ data, seriesNames, allowedTypes, initialType }) => {
    const [chartType, setChartType] = useState(initialType || 'column');
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
    const [visibleSeries, setVisibleSeries] = useState(() => {
        const names = seriesNames || ["Banner A", "Banner B", "Banner C"];
        return names.reduce((acc, name) => ({ ...acc, [name]: true }), {});
    });

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
                    field="total"
                    name="Total"
                    labels={{
                        visible: true,
                        content: (e) => `${e.category}: ${e.value}%`,
                        position: "outsideEnd",
                        background: "none"
                    }}
                />
            );
        }

        if (isHeatmap) {
            const heatmapData = [];
            const targetSeries = seriesNames || ["Banner A", "Banner B", "Banner C"];

            targetSeries.forEach(seriesName => {
                data.forEach(item => {
                    heatmapData.push({
                        x: item.name,
                        y: seriesName,
                        value: item[seriesName]
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
                    labels={{
                        visible: true,
                        content: (e) => `${e.value}%`,
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

            return (
                <ChartSeriesItem
                    type="funnel"
                    data={coloredData}
                    categoryField="name"
                    field="total"
                    colorField="color"
                    name="Total"
                    labels={{
                        visible: false,
                        content: () => "",
                    }}
                />
            );
        }

        const targetSeries = seriesNames || ["Banner A", "Banner B", "Banner C"];

        // Sophisticated, modern palette matching the theme (Blue/Slate/Teal based with accents)
        const colors = CHART_COLORS;

        return targetSeries.map((name, index) => (
            <ChartSeriesItem
                key={name}
                type={isRadar ? (chartType === 'radarArea' ? 'radarArea' : 'radarLine') : (isStacked ? "column" : (isScatterPoint ? "line" : chartType))}
                stack={chartType === 'stacked100Column' ? { type: '100%' } : (chartType === 'stackedColumn' ? true : undefined)}
                data={data}
                field={name}
                name={name}
                color={colors[index % colors.length]}
                visible={visibleSeries[name]}
                style={isRadar ? "smooth" : "normal"}
                opacity={chartType === 'radarArea' ? 0.3 : undefined}
                width={isScatterPoint ? 0 : undefined}
                markers={isScatterPoint ? { visible: true, size: 10, type: "circle" } : undefined}
                labels={isStacked ? { visible: true, content: (e) => chartType === 'stacked100Column' ? `${(e.percentage * 100).toFixed(0)}%` : e.value, position: "center", background: "none", color: "#fff" } : undefined}
            />
        ));
    };

    const onLegendItemClick = (e) => {
        if (!isPieOrDonut && !isHeatmap && !isWordCloud) {
            const seriesName = e.series.name;
            setVisibleSeries(prev => ({
                ...prev,
                [seriesName]: !prev[seriesName]
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

    return (
        <div className="agg-chart-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
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
                        <span>{chartTypeOptions.find(opt => opt.value === chartType)?.text}</span>
                        <ArrowLeftRight size={14} />
                    </button>
                </div>
            )}
            <Chart
                style={{ flex: 1, width: '100%', height: '100%' }}
                key={`${chartType}-${JSON.stringify(visibleSeries)}`}
                onLegendItemClick={onLegendItemClick}
                seriesColors={CHART_COLORS}
                transitions={false}
            >
                <ChartArea background="none" margin={{ top: 35, bottom: 10, left: 10, right: 10 }} />
                {!isHeatmap && <ChartLegend position="bottom" orientation="horizontal" />
                }

                {/* Axes for Standard Charts */}
                {
                    !isPieOrDonut && !isHeatmap && !isRadar && (
                        <ChartCategoryAxis>
                            <ChartCategoryAxisItem categories={data.map(d => d.name)} />
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
                                labels={{ format: chartType === 'stacked100Column' ? "P0" : "{0}%" }}
                                max={chartType === 'stacked100Column' ? 1 : undefined}
                                majorUnit={chartType === 'stacked100Column' ? 0.2 : (chartType === 'stackedColumn' ? 50 : 20)}
                            />
                        </ChartValueAxis>
                    )
                }
                {
                    isRadar && (
                        <ChartValueAxis>
                            <ChartValueAxisItem labels={{ format: "{0}%" }} majorUnit={20} />
                        </ChartValueAxis>
                    )
                }

                {/* Axes for Heatmap */}
                {
                    isHeatmap && (
                        <>
                            <ChartCategoryAxis name="xAxis">
                                <ChartCategoryAxisItem categories={data.map(d => d.name)} />
                            </ChartCategoryAxis>
                            <ChartValueAxis name="yAxis">
                                <ChartValueAxisItem categories={seriesNames || ["Banner A", "Banner B", "Banner C"]} />
                            </ChartValueAxis>
                        </>
                    )
                }

                <ChartTooltip visible={!isPieOrDonut || chartType === 'funnel'} render={(e) => {
                    if (isHeatmap) {
                        return `${e.point?.dataItem?.y} - ${e.point?.dataItem?.x}: ${e.point?.dataItem?.value}%`;
                    }
                    if (chartType === 'funnel') {
                        const category = e.point ? e.point.category : e.category;
                        const value = e.point ? e.point.value : e.value;
                        return `${category}: ${value}`;
                    }
                    if (!isPieOrDonut) {
                        return `${e.point?.series?.field}: ${e.point ? e.point.value : e.value}%`;
                    }
                }} />

                <ChartSeries>
                    {renderSeries()}
                </ChartSeries>
            </Chart >
        </div >
    );
};

export default KendoChart;
