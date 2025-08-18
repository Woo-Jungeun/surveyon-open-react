import {useCallback, useEffect, useState} from "react";
import "hammerjs";
import {
    Chart,
    ChartSeries,
    ChartSeriesItem,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartLegend, ChartTooltip, ChartSeriesItemTooltip, ChartValueAxis, ChartValueAxisItem,
} from "@progress/kendo-react-charts";
import { getRandomColor } from "@/common/utils/DataTypeUtil.jsx";
import ChartDropDownList from "@/components/kendo/kendoChart/ChartDropDownList.jsx";

/**
 * 수요 분석 > 통계 컴포넌트 : 라인 차트
 *  title : 컴포넌트 제목
 *  data : 차트 데이터
 *  categories : 차트 카테고리
 *  categoriesStep : 차트 카테고리 step
 *  xdataColume : x축 데이터 기준 컬럼
 *  ydataColume : y축 데이터 기준 컬럼
 *  xdataListColume : 다중 데이터 일 경우 x축 데이터 리스트 기준 컬럼
 *  ydataListColume : 다중 데이터 일 경우 y축 데이터 리스트 기준 컬럼
 *  mode : 데이터 single/muliti 구분
 *  style : 차트 style
 *  legendYn : legend 존재 여부
 *  unit : tooltip에서 사용할 단위
 *  dropDownYn : 드롭다운 사용 여부
 *  dropDownList : 드롭다운 데이터 리스트
 *  dropDownId : 드롭다운 id (파라미터로 보낼 컬럼명)
 *  setFilter : 필터 세팅
 * txtLinkYn : 링크 사용 여부
 * txtLinkYn : 링크 url
 * yAxisMin :  y min값
 * yAxisMax : y max값
 * @author jewoo
 * @since 2024-05-21<br />
 */
const LineChart = ({
                       parentProps,
                       title,
                       data,
                       categories,
                       categoriesStep= 0,
                       xdataColume,
                       ydataColume,
                       xdataListColume,
                       ydataListColume,
                       style,
                       mode,
                       unit,
                       dropDownYn,
                       dropDownList,
                       dropDownId,
                       setFilter,
                       txtLinkYn,
                       txtLinkUrl,
                       yAxisMin,
                       yAxisMax,
                       ...props
                   }) => {

    const [chartList, setChartList] = useState([]);

    useEffect(() => {
        if (data) {
            // 단일 차트인 경우
            if (mode !== "multiple") {
                let list = [];
                data?.map((item) => {
                    list.push(item[xdataColume]);
                })
                setChartList(list);
            }
        }
    }, [data]);

    /**
     * tooltip context
     */
    const tooltipRender = ({point}) => (
        <span>
          <>{mode == "multiple"
              ? point?.series.name : point?.category || ''} : {point?.value?.toLocaleString() || 0}{unit}</>
        </span>
    );

    /**
     * y축 숫자일 경우 천단위 콤마
     */
    const createContent = useCallback(event => {
        if (typeof (event.value) == "number") {
            return event.value?.toLocaleString();
        }
        return null;
    }, []);

    return (
        <div className="gridItem">
            <div className="contTop">
                <h2 className="contTit">{title || ''}</h2>
                {txtLinkYn && <a className={"txtLink"} onClick={() => {
                    window.open(txtLinkUrl, "_blank");
                }}>전체보기</a>}
            </div>
            <div className="cont">
                <div>
                    {dropDownYn &&
                        <div className="chartLabel">
                            <ChartDropDownList
                                data={dropDownList}
                                id={dropDownId}
                                allPossible={true}
                                dataItemKey={"codeId"}
                                textField={"codeName"}
                                parentProps={parentProps}
                                setFilter={setFilter}
                            />
                        </div>
                    }
                    <div className="mainChart">
                        <Chart style={style}
                               transitions={false}     /*animation disabled*/
                        >
                            <ChartValueAxis>
                                <ChartValueAxisItem
                                    labels={{
                                        content: createContent
                                    }}
                                    min={yAxisMin}
                                    max={yAxisMax}
                                />
                            </ChartValueAxis>
                            <ChartLegend position="top"/>
                            <ChartTooltip/>
                            <ChartSeries>
                                {mode == "multiple"
                                    ? data?.map((item, idx) => {
                                        let list = [];
                                        item[xdataListColume]?.map((data) => {
                                            list.push(data[xdataColume]);
                                        })
                                        return (
                                            <ChartSeriesItem
                                                type="line"
                                                name={item[ydataListColume]}
                                                key={item[ydataListColume]+idx}
                                                data={list}
                                                color={getRandomColor(idx)}
                                            >
                                                <ChartSeriesItemTooltip render={tooltipRender}/>
                                            </ChartSeriesItem>
                                        )
                                    })
                                    : <ChartSeriesItem
                                        type="line"
                                        name={ydataColume}
                                        key={ydataColume}
                                        data={chartList}
                                        color={getRandomColor(0)}>
                                        <ChartSeriesItemTooltip render={tooltipRender}/>
                                    </ChartSeriesItem>
                                }
                            </ChartSeries>
                            <ChartCategoryAxis>
                                <ChartCategoryAxisItem
                                    categories={categories}
                                    labels={{ step: categoriesStep || 0 }}  //카테고리 갯수가 많으면 표출 간격 조정
                                />
                            </ChartCategoryAxis>
                        </Chart>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default LineChart;
