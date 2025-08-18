import "hammerjs";
import {
    Chart,
    ChartSeries,
    ChartSeriesItem,
    ChartLegend, ChartSeriesItemTooltip, ChartTooltip,
} from "@progress/kendo-react-charts";
import {memo, useEffect, useState} from "react";
import { Circle as CircleGeometry } from "@progress/kendo-drawing/geometry";
import { Layout, Text } from "@progress/kendo-drawing";
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
 *  toolTipYn : tooltip 존재 여부
 *  holeSize : 도넛 holeSize
 * @author jewoo
 * @since 2024-05-21<br />
 */
const DonutChart = ({
                      title,
                      data,
                      categories,
                      id,
                      value,
                      style,
                      legendYn,
                      unit,
                      cnt,
                      toolTipYn,
                      holeSize,
                      ...props
                  }) => {


    // 리스트 데이터가 아닌 title, cnt로 차트 뿌리려면 데이터 가공 (id, value, data값 파라미터로 안받음)
    const [chartData, setChartData] = useState();    //가공 데이터

    useEffect(() => {
        if(data == undefined ){
            setChartData([{id:title, value:cnt , color:"#63c38a"}, {id:"other", value:100-cnt, color:"#ddd"}])
        }else{
            // 합계 데이터는 차트 표출에서 제거
            setChartData(data.filter((item) => item.type !== "total" || item.typeName !== "합계"));
        }
    }, [data, cnt]);

    /**
     * tooltip context
     */
    const tooltipRender= ({point}) => (
        <span>
            <>{point?.category || ''}: {point?.value?.toLocaleString() || 0}{unit}</>
        </span>
    );

    /**
     * donut center context
     */
    let center;
    let radius;
    const visualHandler = (e) => {
        // Obtain parameters for the segments
        center = e.center;
        radius = e.innerRadius;

        // Create default visual
        return e.createVisual();
    };
    const onRender = (e) => {
        // The center and radius are populated by now.
        // We can ask a circle geometry to calculate the bounding rectangle for us.
        const circleGeometry = new CircleGeometry([center?.x, center?.y], radius);
        const bbox = circleGeometry.bbox();
        const titleList=title.split("\n").map((letter) => (letter));

        // Render the text
        const heading = new Text(cnt+unit, [0, 0], {
            font: "bold 32px SpoqaHanSansNeo, sans-serif",
            fill: {
                color: "#012011",
                lineHeight: 1,
                marginTop:"5px",
                display:"inline-block"
            }
        });
        const line1 = new Text(titleList[0], [0, 0], {
            font: "17px SpoqaHanSansNeo, sans-serif",
            fill: {
                color: "#69706d",
                fontWeight: 500,
                letterSpacing: "-0.56px",
                lineHeight: 1
            }
        });
        const line2 = new Text(titleList[1], [0, 0], {
            font: "17px SpoqaHanSansNeo, sans-serif",
            fill: {
                color: "#69706d",
                fontWeight: 500,
                letterSpacing: "-0.56px",
                lineHeight: 1
            }
        });

        // Reflow the text in the bounding box
        const layout = new Layout(bbox, {
            alignContent: "center",
            alignItems: "center",
            justifyContent: "center",
            spacing: 5,
        });

        //center text
        if(cnt){
            if(titleList.length == 1){
                layout.append(line1, heading);
            }else{
                layout.append( line1, line2, heading);
            }
        }else{
            if(titleList.length == 1){
                layout.append(line1);
            }else{
                layout.append(line1, line2);
            }
        }

        layout.reflow();

        // Draw it on the Chart drawing surface
        if (e.target.surface) {
            e.target.surface.draw(layout);
        }
    };

    return (
        <Chart style={style}
               transitions={false}     /*animation disabled*/
               onRender={onRender}
        >
            {toolTipYn &&  <ChartTooltip/>}
            {legendYn
                ? <ChartLegend position="top"/>
                : <ChartLegend visible={false}/>
            }
            <ChartSeries>
                <ChartSeriesItem
                    type="donut"
                    data={chartData}
                    field={value || "value"}
                    categoryField={id || "id"}
                    holeSize={holeSize || 70}
                    color={"color"}
                    visual={visualHandler}
                >
                    {toolTipYn && <ChartSeriesItemTooltip render={tooltipRender}/>}
                </ChartSeriesItem>
            </ChartSeries>
        </Chart>
    )
}
export default memo(DonutChart);
