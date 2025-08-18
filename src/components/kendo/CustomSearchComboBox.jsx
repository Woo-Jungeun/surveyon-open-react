import {Fragment, memo, useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import {ComboBox} from "@progress/kendo-react-dropdowns";
import axios from "axios";

/**
 * @className : SearchDropDownList
 * @description : 검색 DropDownList
 * @date : 2021-12-27 오전 10:38
 * @author : chauki
 * @version : 1.0.0
 * @see
 * @history :
 **/
const CustomSearchComboBox = (props) => {
    //state 설정
    const [data, setData] = useState({
        defaultValue : null,
        options : [],
        loading : false,
        originData : []
    });

    const comboRef = useRef(null);

    //clean up 변수
    let isComponentMounted = true;

    //todo componentDidMount
    useLayoutEffect(() => {
        initData();
    }, []);

    // remoteUrl변경 시 데이터 목록 재조회
    useLayoutEffect(() => {
        if(props.remoteUrl !== null && props.remoteUrl !== undefined)
            initData();
    }, [props.remoteUrl]);

    //todo componentDidUpdate
    useLayoutEffect(() => {
        updateData();
    }, [props.data, props.defaultValue, data.options]);

    //todo componentDidUnMount
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
        }else {
            setData(prevState => ({
                ...prevState,
                options : props.data !== undefined && props.data !== null ? props.data : []
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
                options : props.data
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
            props.takeRef(comboRef);
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
                options : props.remoteDataField ? [...data.result[props.remoteDataField]] : [...data.result],
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
            options : newOptions
        }))
    }, [data]);

    /**
     * @funcName : onFocus
     * @description : focus 일 때, dropdownlist를 표출한다.
     * @param event : 이벤트 객체
     * @return :
     * @exception :
     * @date : 2021-12-27 오후 11:49
     * @author : chauki
     * @see
     * @history :
     **/
    const onFocus = useCallback((event) => {
        event.target._element.getElementsByClassName("k-button")[0].click();
    }, []);

    /**
     * @funcName : onClose
     * @description : close 일 때, combobox radius를 변경한다.
     * @param event : 이벤트 객체
     * @return :
     * @exception :
     * @date : 2021-12-29 오후 12:17
     * @author : chauki
     * @see
     * @history :
     **/
    const onClose = useCallback((event) => {
        comboRef.current._element.childNodes[0].classList.remove("k-state-focused");
    }, []);

    // useEffect(() => {
    //     if(props.defaultValue === null){
    //         setData(prevState => ({...prevState, defaultValue: null}))
    //     }
    // }, [props.defaultValue]);

    return (
        <Fragment>
            <div className={"ns-search-combobox"}>
                {
                    props.remoteUrl
                        ?
                        props.hasOwnProperty('defaultValue') ?
                            <ComboBox
                                ref={comboRef}
                                value={data.defaultValue}
                                data={data.options}
                                loading={data.loading}
                                filterable={true}
                                onFilterChange={onFilterChange}
                                onFocus={onFocus}
                                onClose={onClose}
                                itemRender={(li, itemProps) => props.itemRender(li, itemProps)}
                                valueRender={(element) => {
                                    return <Fragment key={element.key}>
                                        <div className={"search"} style={props.searchStyle || null}>{element}</div>
                                    </Fragment>
                                }
                                }
                                {...props}
                            />
                            :
                            <ComboBox
                                ref={comboRef}
                                defaultValue={data.defaultValue}
                                data={data.options}
                                loading={data.loading}
                                filterable={true}
                                onFilterChange={onFilterChange}
                                onFocus={onFocus}
                                onClose={onClose}
                                itemRender={(li, itemProps) => props.itemRender(li, itemProps)}
                                valueRender={(element) => {
                                    return <Fragment key={element.key}>
                                        <div className={"search"} style={props.searchStyle || null}>{element}</div>
                                    </Fragment>
                                }
                                }
                                {...props}
                            />

                        :
                        <ComboBox
                            {...props}
                            ref={comboRef}
                            value={data.defaultValue}
                            data={data.options}
                            loading={data.loading}
                            filterable={true}
                            onFilterChange={onFilterChange}
                            onFocus={onFocus}
                            onClose={onClose}
                            itemRender={(li, itemProps) => props.itemRender(li, itemProps)}
                            valueRender={(element, value) => {
                                return <Fragment key={element.key}>
                                    <div className={"search"} style={props.searchStyle || null}>{element}</div>
                                </Fragment>
                            }}
                        />

                }
            </div>
        </Fragment>
    )
};
export default memo(CustomSearchComboBox);