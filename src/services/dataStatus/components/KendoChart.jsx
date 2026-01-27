import React, { useState, useEffect } from 'react';
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

const KendoChart = ({ data, seriesNames, allowedTypes, initialType }) => {
    const [chartType, setChartType] = useState(initialType || 'column');

    useEffect(() => {
        if (initialType) {
            setChartType(initialType);
        }
    }, [initialType]);
    const [visibleSeries, setVisibleSeries] = useState(() => {
        const names = seriesNames || ["Banner A", "Banner B", "Banner C"];
        return names.reduce((acc, name) => ({ ...acc, [name]: true }), {});
    });

    const allChartTypeOptions = [
        { text: "세로 막대", value: "column" },
        { text: "가로 막대", value: "bar" },
        { text: "라인", value: "line" },
        { text: "원형", value: "pie" },
        { text: "도넛", value: "donut" },
        { text: "영역", value: "area" },
    ];

    const chartTypeOptions = allowedTypes
        ? allChartTypeOptions.filter(opt => allowedTypes.includes(opt.value))
        : allChartTypeOptions;

    const showDropdown = chartTypeOptions.length > 1;

    const handleChartTypeChange = (e) => {
        setChartType(e.target.value.value);
    };

    const isPieOrDonut = chartType === 'pie' || chartType === 'donut';

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

        const targetSeries = seriesNames || ["Banner A", "Banner B", "Banner C"];
        const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#6c757d", "#17a2b8"];

        return targetSeries.map((name, index) => (
            <ChartSeriesItem
                key={name}
                type={chartType}
                data={data}
                field={name}
                name={name}
                color={colors[index % colors.length]}
                visible={visibleSeries[name]}
            />
        ));
    };

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
            {showDropdown && (
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
            )}
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
                    {renderSeries()}
                </ChartSeries>
            </Chart>
        </div>
    );
};

export default KendoChart;
