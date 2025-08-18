import {useCallback, useEffect, useState} from "react";
import "hammerjs";
import {
    Chart,
    ChartSeries,
    ChartSeriesItem,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartLegend, ChartSeriesItemTooltip, ChartTooltip, ChartValueAxis, ChartValueAxisItem,
} from "@progress/kendo-react-charts";
import { getRandomColor } from "@/common/utils/DataTypeUtil.jsx";
import ChartDropDownList from "@/components/kendo/kendoChart/ChartDropDownList.jsx";

/**
 * 바 차트
 *  title : 컴포넌트 제목
 *  data : 차트 데이터
 *  categories : 차트 카테고리
 *  xdataColume : x축 데이터 기준 컬럼
 *  ydataColume : y축 데이터 기준 컬럼
 *  xdataListColume : 다중 데이터 일 경우 x축 데이터 리스트 기준 컬럼
 *  ydataListColume : 다중 데이터 일 경우 y축 데이터 리스트 기준 컬럼
 *  mode : 데이터 single/muliti 구분
 *  style : 차트 style
 *  popupYn : 팝업 존재 여부
 *  setPopupShow : 팝업 open
 *  legendYn : legend 존재 여부
 *  stackYn : 바 차트 stack 여부
 *  unit : tooltip에서 사용할 단위
 *  dropDownYn : 드롭다운 사용 여부
 *  dropDownList : 드롭다운 데이터
 *  dropDownId : 드롭다운 id(파라미터로 보낼 컬럼명)
 *   setFilter : 필터 세팅
 * @author jewoo
 * @since 2024-05-21<br />
 */
const BarChart = ({
                      parentProps,
                      title,
                      data,
                      categories,
                      xdataColume,
                      ydataColume,
                      xdataListColume,
                      ydataListColume,
                      mode,
                      style,
                      popupYn,
                      setPopupShow,
                      legendYn,
                      stackYn,
                      unit,
                      dropDownYn,
                      dropDownList,
                      dropDownId,
                      setFilter,
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

    /** 전체보기  클릭 */
    const txtLinkOnClick = () =>{
        setPopupShow(true);
    };

    return (
        <div className="gridItem">
            <div className="contTop">
                <h2 className="contTit">{title || ''}</h2>
                {popupYn && <a href="#" className="txtLink" onClick={txtLinkOnClick}>전체보기</a>}
            </div>

            <div className="cont">
                <div>
                    <div className="mainChart">
                        {/* dropdown */}
                        {dropDownYn &&
                            <div className="chartLabel"> {/* className="chartLabel mgB28" */}
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
                        {/* chart */}
                        <Chart style={style}
                               transitions={false}     /*animation disabled*/
                        >
                            <ChartValueAxis>
                                <ChartValueAxisItem
                                    labels={{
                                        content: createContent
                                    }}
                                />
                            </ChartValueAxis>
                            {legendYn
                                ? <ChartLegend position="top"/>
                                : <ChartLegend visible={false}/>
                            }
                            <ChartTooltip/>
                            <ChartSeries>
                                {mode == "multiple"
                                    ? data?.map((item, idx) => {
                                        let chartList = [];
                                        item[xdataListColume]?.map((data) => {
                                            chartList.push(data[xdataColume]);
                                        })
                                        return (
                                            <ChartSeriesItem
                                                type="column"
                                                stack={stackYn}
                                                name={item[ydataListColume]}
                                                key={item[ydataListColume]}
                                                data={chartList}
                                                color={getRandomColor(idx)}>
                                                <ChartSeriesItemTooltip render={tooltipRender}/>
                                            </ChartSeriesItem>
                                        )
                                    })
                                    : <ChartSeriesItem
                                        type="column"
                                        stack={stackYn}
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
                                />
                            </ChartCategoryAxis>
                        </Chart>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default BarChart;
