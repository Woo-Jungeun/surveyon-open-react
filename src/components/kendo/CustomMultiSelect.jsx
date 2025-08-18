import {cloneElement, Fragment, memo, useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import {MultiSelect} from "@progress/kendo-react-dropdowns";
import axios from "axios";


/**
 * @className : CustomMultiSelect
 * @description :kendo MultiSelect Custom
 * @date : 2022-01-14 오후 5:33
 * @author : khlee
 * @version : 1.0.0
 * @see
 * @history :
 **/
const CustomMultiSelect = (props) => {
    //state 설정
    const [data, setData] = useState({
        defaultValue: null,
        options: [],
        loading: false,
        originData: []
    });

    const multiSelectRef = useRef(null);

    //clean up 변수
    let isComponentMounted = true;

    //todo componentDidMount
    useLayoutEffect(() => {
        initData();
    }, []);

    //todo componentDidUpdate
    useLayoutEffect(() => {
        updateData();
    }, [props.data, props.defaultValue, data.options]);

    useEffect(() => {
        return () => {
            isComponentMounted = false;
        };
    }, []);

    /**
     * @funcName : initData
     * @description : 데이터를 초기화한다.
     * @param :
     * @return :
     * @exception :
     * @date : 2021-12-15 오전 3:40
     * @author : chauki
     * @see
     * @history :
     **/
    const initData = () => {
        if (props.remoteUrl) {
            setData(prevState => ({
                ...prevState,
                loading: false
            }));
            getRemoteData(props.remoteUrl, props);
        } else {
            setData(prevState => ({
                ...prevState,
                options: props.data !== undefined && props.data !== null ? props.data : []
            }));
        }
    };

    /**
     * @funcName : updateData
     * @description : 데이터를 업데이트한다.
     * @param :
     * @return :
     * @exception :
     * @date : 2021-12-15 오전 3:40
     * @author : chauki
     * @see
     * @history :
     **/
    const updateData = () => {
        if (props.data) {
            let tmpDefaultValue = getDefaultValueMap(props.data, props.defaultValue, props.dataItemKey);
            setData(prevState => ({
                ...prevState,
                defaultValue: tmpDefaultValue,
                options: props.data
            }));
            return;
        }
        if (data.options) {
            let tmpDefaultValue = getDefaultValueMap(data.options, props.defaultValue, props.dataItemKey);
            setData(prevState => ({
                ...prevState,
                defaultValue: tmpDefaultValue,
                //options : props.data
            }));
        }

        if (props.takeRef && props.takeRef instanceof Function) {
            props.takeRef(multiSelectRef);
        }
    };

    /**
     * @funcName : getRemoteData
     * @description : 원격 데이터를 받아서 dropdownlist의 옵션값을 설정한다.
     * @param url : 외부 url 정보
     * @return :
     * @exception :
     * @date : 2021-12-15 오전 3:40
     * @author : chauki
     * @see
     * @history :
     **/
    const getRemoteData = async (url) => {
        const {defaultValue, dataItemKey} = props;
        const {data} = await reqGetRemoteData(url);
        if (data && isComponentMounted) {
            let tmpDefaultValue = getDefaultValueMap(data.result, defaultValue, dataItemKey);
            if (tmpDefaultValue === undefined) {
                tmpDefaultValue = "";
            }
            setData(prevState => ({
                defaultValue: tmpDefaultValue,
                options: props.remoteDataField ? [...data.result[props.remoteDataField]] : [...data.result],
                originData: props.remoteDataField ? [...data.result[props.remoteDataField]] : [...data.result],
                loading: false
            }));
        }
    };

    /**
     * @funcName : getDefaultValueMap
     * @description : default 값에 대한 key/value 값을 가져온다
     * @param dataSet : data set
     * @param defaultValue : default 값
     * @param itemKey : key 정보
     * @return :
     * @exception :
     * @date : 2021-12-15 오전 3:40
     * @author : chauki
     * @see
     * @history :
     **/
    const getDefaultValueMap = (dataSet, defaultValue, itemKey) => {
        let tmpDefaultValue = null;
        if (defaultValue !== undefined && defaultValue !== null && dataSet.length > 0) {
            tmpDefaultValue = dataSet.filter((item) => {
                return item[itemKey] === defaultValue;
            })[0];
        }
        return tmpDefaultValue;
    };

    /**
     * @funcName : reqGetRemoteData
     * @description : 외부 데이터를 조회한다.
     * @param url : 외부 url 정보
     * @return : 외부 데이터 정보
     * @exception :
     * @date : 2021-12-15 오전 3:40
     * @author : chauki
     * @see
     * @history :
     **/
    const reqGetRemoteData = (url) => {
        return axios.get(url)
            .then((res) => {
                return res;
            })
            .catch((err) => {
                return err.response.data.message;
            });
    };

    /**
     * @funcName : onFilterChange
     * @description : 필터 change 이벤트 핸들러
     * - 입력값을 필터하여 dropdownlist에 표출한다.
     * @param event : 이벤트 객체
     * @return :
     * @exception :
     * @date : 2021-12-27 오후 11:49
     * @author : chauki
     * @see
     * @history :
     **/
    const onFilterChange = useCallback((event) => {
        const filter = event.filter.value;
        const newOptions = data.originData.filter((item) => {
            return item[props.textField].includes(filter)
        })
        setData(prevState => ({
            ...prevState,
            options: newOptions
        }))
    }, [data]);


    // const itemRender = (li, itemProps) => {
    //     const index = itemProps.index;
    //     const itemChildren = (
    //         <span
    //             style={{
    //                 color: "#000",
    //             }}
    //         >
    //     {li.props.children} {index}
    //   </span>
    //     );
    //     return React.cloneElement(li, li.props, itemChildren);
    // };

    const listNoDataRender = (element) => {
        const noData = (
            <h4
                style={{
                    fontSize: "1em",
                }}
            >
        <span
            className="k-icon k-i-warning"
            style={{
                fontSize: "2.5em",
            }}
        />
                <br />
                <br />
                검색 결과가 없습니다.
            </h4>
        );
        return cloneElement(element, { ...element.props }, noData);
    };

    return (
        <Fragment>
            <div>
                {
                    props.remoteUrl
                        ?
                        <MultiSelect
                            {...props}
                            ref={multiSelectRef}
                            defaultValue={data.defaultValue}
                            data={data.options}
                            loading={data.loading}
                            filterable={true}
                            onFilterChange={onFilterChange}
                            listNoDataRender={listNoDataRender}
                        />
                        :
                        <MultiSelect
                            {...props}
                            ref={multiSelectRef}
                            value={data.defaultValue}
                            data={data.options}
                            loading={data.loading}
                            filterable={true}
                            onFilterChange={onFilterChange}
                            listNoDataRender={listNoDataRender}
                        />

                }
            </div>
        </Fragment>
    )
};
export default memo(CustomMultiSelect);
