import { useEffect, useState } from "react";
import { getSelectedState, Grid, GridColumn as Column, GridColumn } from "@progress/kendo-react-grid";
import CustomGridLoader from "@/components/kendo/CustomGridLoader";
import { getter } from "@progress/kendo-react-common";


//미완성
const CustomGrid = ({
    api, //해당 그리드가 조회할 api
    columns, //그리드 컬럼 정보
    ...options
}) => {
    //TODO 반드시 null 체크 할것 ====================================================================
    columns =
        columns?.length > 0
            ? columns
            : [
                  {
                      field: "column",
                      title: "컬럼",
                      key: 0, //키값지정 select할때 키로 색상이 바뀜 복수일 때는 0, 1, 2... 순으로 키값을 부여하면 됨.
                      operator: "eq", //조회 연산자 eq, contains...
                      value: "" //조회할 값 저장
                  }
              ];

    // =========================================================================================

    const [products, setProducts] = useState({
        data: [],
        total: 0
    });
    const [dataState, setDataState] = useState({
        take: 10,
        skip: 0
    });

    useEffect(() => {
        
        setDataState((prev) => {
            if(new Date(prev["$cookie"]).toLocaleTimeString() == new Date().toLocaleTimeString()) return prev;

            const dataState = { ...prev };
            const filter = [];

            columns.forEach(
                ({
                    field, //컬럼 아이디
                    operator, //조회 조건
                    value, //조회할 값
                    ...item
                }) => {
                    if (value) {
                        filter.push({ field: field, operator: operator, value: value });
                    }
                }
            );

            dataState.filter = filter;
            dataState.sort = [];
            dataState["$cookie"] = new Date();

            return dataState;
        });
    }, [columns]);

    return (({
        // 옵션 파라미터들...
        autoLoad, // 자동조회 할지말지...
        selectable, //select 옵션
        onSelect // 행선택 이벤트
    }) => {
        selectable = selectable || { enabled: true, mode: "single" };

        const [selectedState, setSelectedState] = useState({});
        const [gridId, setGridId] = useState("id_" + Math.floor(Math.random() * 100000));

        const DATA_ITEM_KEY = columns
            .filter((i) => i.hasOwnProperty("key"))
            ?.sort((a, b) => a.key - b.key)
            ?.map((i) => i.field)
            ?.join("_");
        const idGetter = getter(DATA_ITEM_KEY);

        const dataStateChange = (e) => {
            setDataState(e.dataState);
        };
        const onSelectionChange = (event) => {
            if (event.shiftKey) {
                return;
            }

            //선택한 행 데이터
            const newSelectedState = getSelectedState({
                event,
                selectedState: selectedState,
                dataItemKey: DATA_ITEM_KEY
            });

            if (!event.ctrlKey && Object.keys(selectedState).length != 0) {
                //같은 행 선택시 선택 해제
                for (let i in newSelectedState) {
                    if (selectedState?.hasOwnProperty(i)) {
                        //선택 해제
                        setSelectedState({});
                        return;
                    }
                }
            }

            //행 선택
            setSelectedState(newSelectedState);

            if (onSelect) onSelect.apply(null, [event.dataItems[event.startRowIndex]]);
        };
        const dataReceived = (products) => {
            if (products.data) {
                setProducts(products);
            } else {
                setProducts({
                    data: [],
                    total: 0
                });
            }
        };
        const KeyColumn = (props) => {
            return <td></td>;
        };

        return (
            <>
                <p className="totalTxt">
                    총 <i className="fcGreen">{products?.total || 0}</i>개
                </p>
                <div className="cmn_grid" style={{ position: "relative" }}>
                    <Grid
                        id={gridId}
                        sortable={true}
                        pageable={true}
                        {...dataState}
                        data={products.data?.map((item) => {
                            //행 선택 키설정
                            const newItem = { ...item };
                            const keys = (1, DATA_ITEM_KEY.split("_"));
                            let keyValue = "";

                            for (let k of keys) {
                                if (keyValue != "") keyValue += "_";
                                keyValue += newItem[k];
                            }
                            newItem[DATA_ITEM_KEY] = keyValue;

                            return {
                                ...newItem,
                                ["selected"]: selectedState ? selectedState[idGetter(newItem)] : {}
                            };
                        })}
                        total={products?.total}
                        dataItemKey={DATA_ITEM_KEY}
                        selectedField={"selected"}
                        selectable={selectable}
                        onDataStateChange={dataStateChange}
                        onSelectionChange={onSelectionChange}
                    >
                        <GridColumn field={DATA_ITEM_KEY} width="0px" title={DATA_ITEM_KEY} cell={(props) => <KeyColumn {...props} />} />
                        {columns.map(
                            (
                                {
                                    //컬럼 오브젝트 필수 키
                                    field, //컬럼 아이디
                                    title, //컬럼 한글명
                                    ...item //옵션들...
                                },
                                idx
                            ) => {
                                return <Column key={idx} field={field} title={title} {...item} />;
                            }
                        )}
                    </Grid>

                    <CustomGridLoader gridId={gridId} api={api} dataState={dataState} onDataReceived={dataReceived} autoLoad={autoLoad} />
                </div>
            </>
        );
    })(options);
};

export default CustomGrid;
