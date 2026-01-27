import React, { useState } from 'react';
import {
    Chart,
    ChartSeries,
    ChartSeriesItem,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartLegend,
    ChartTooltip,
    ChartValueAxis,
    ChartValueAxisItem
} from "@progress/kendo-react-charts";
import { DropDownList } from "@progress/kendo-react-dropdowns";

const KendoChart = ({ data }) => {
    const [chartType, setChartType] = useState('column');
    const [visibleSeries, setVisibleSeries] = useState({
        "Banner A": true,
        "Banner B": true,
        "Banner C": true
    });

    const chartTypeOptions = [
        { text: "세로 막대", value: "column" },
        { text: "가로 막대", value: "bar" },
        { text: "라인", value: "line" },
        { text: "원형", value: "pie" },
        { text: "도넛", value: "donut" },
        { text: "영역", value: "area" },
    ];

    const handleChartTypeChange = (e) => {
        setChartType(e.target.value.value);
    };

    const isPieOrDonut = chartType === 'pie' || chartType === 'donut';

    const onLegendItemClick = (e) => {
        if (!isPieOrDonut) {
            const seriesName = e.series.name;
            setVisibleSeries(prev => ({
                ...prev,
                [seriesName]: !prev[seriesName]
            }));
        }
    };

    return (
        <div className="agg-chart-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
            <div className="chart-header" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <DropDownList
                    data={chartTypeOptions}
                    textField="text"
                    dataItemKey="value"
                    value={chartTypeOptions.find(opt => opt.value === chartType)}
                    onChange={handleChartTypeChange}
                    style={{ width: '150px' }}
                />
            </div>
            <Chart style={{ flex: 1 }} key={`${chartType}-${JSON.stringify(visibleSeries)}`} onLegendItemClick={onLegendItemClick}>
                <ChartLegend position="bottom" orientation="horizontal" />
                {!isPieOrDonut && (
                    <ChartCategoryAxis>
                        <ChartCategoryAxisItem categories={data.map(d => d.name)} />
                    </ChartCategoryAxis>
                )}
                {!isPieOrDonut && (
                    <ChartValueAxis>
                        <ChartValueAxisItem labels={{ format: "{0}%" }} />
                    </ChartValueAxis>
                )}
                <ChartTooltip visible={!isPieOrDonut} render={(e) => {
                    if (!isPieOrDonut) {
                        return `${e.point.series.field}: ${e?.point?.value}%`;
                    }
                }} />
                <ChartSeries>
                    {isPieOrDonut ? (
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
                    ) : null}
                    {!isPieOrDonut && <ChartSeriesItem type={chartType} data={data} field="Banner A" name="Banner A" color="#8884d8" visible={visibleSeries["Banner A"]} />}
                    {!isPieOrDonut && <ChartSeriesItem type={chartType} data={data} field="Banner B" name="Banner B" color="#82ca9d" visible={visibleSeries["Banner B"]} />}
                    {!isPieOrDonut && <ChartSeriesItem type={chartType} data={data} field="Banner C" name="Banner C" color="#ffc658" visible={visibleSeries["Banner C"]} />}
                </ChartSeries>
            </Chart>
        </div>
    );
};

export default KendoChart;
