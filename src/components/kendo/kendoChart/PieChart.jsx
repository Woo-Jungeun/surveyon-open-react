import "hammerjs";
import {
    Chart,
    ChartSeries,
    ChartSeriesItem,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartLegend, ChartSeriesItemTooltip, ChartTooltip,
} from "@progress/kendo-react-charts";

/**
 * 수요 분석 > 통계 컴포넌트 : 파이 차트
 *  title : 컴포넌트 제목
 *  data : 차트 데이터
 *  categories : 차트 카테고리
 *  id : 파이 차트 id
 *  value : 파이 차트 값
 *  style : 차트 style
 *  legendYn : legend 존재 여부
 *  unit : tooltip에서 사용할 단위
 * @author jewoo
 * @since 2024-05-21<br />
 */
const PieChart = ({
                      parentProps,
                      data,
                      categories,
                      id,
                      value,
                      style,
                      legendYn,
                      unit,
                      ...props
                  }) => {

    /**
     * tooltip context
     */
    const tooltipRender= ({point}) => (
        <span>
            <>{point?.category || ''}: {point?.value?.toLocaleString() || 0}{unit}</>
        </span>
    );

    return (
        <Chart style={style}
               transitions={false}     /*animation disabled*/>
            {legendYn
                ? <ChartLegend position="top"/>
                : <ChartLegend visible={false}/>
            }
            <ChartTooltip />
            <ChartSeries>
                <ChartSeriesItem
                    type="pie"
                    data={data}
                    field={value}
                    categoryField={id}
                >
                    <ChartSeriesItemTooltip render={tooltipRender}/>
                </ChartSeriesItem>
            </ChartSeries>
            <ChartCategoryAxis>
                <ChartCategoryAxisItem
                    categories={categories}
                />
            </ChartCategoryAxis>
        </Chart>
    )
}
export default PieChart;
