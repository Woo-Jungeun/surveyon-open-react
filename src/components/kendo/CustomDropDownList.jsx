import {Fragment, memo, useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import {DropDownList} from "@progress/kendo-react-dropdowns";
import axios from "axios";

/**
 * @className : CustomDropDownList
 * @description : kendo DropDownList Custom
 * @date : 2021-12-15 오전 3:25
 * @author : parksujin
 * @version : 1.0.0
 * @see
 * @history :
 **/
const CustomDropDownList = (props) => {
    // console.log(props);
    //state 설정
    const [data, setData] = useState({
        defaultValue: null,
        options: [],
        loading: false
    });

    const dropDownRef = useRef();

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

    useEffect(() => {
        initData()
    }, [props.remoteUrl]);

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

    const updateData = () => {
        if (props.getRef && props.getRef instanceof Function) {
            props.getRef(dropDownRef);
        }

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
                options: [...data.result],
                loading: false
            }));
        }
    };

    const getDefaultValueMap = (dataSet, defaultValue, itemKey) => {
        let tmpDefaultValue = null;
        if (defaultValue !== undefined && defaultValue !== null && dataSet.length > 0) {
            tmpDefaultValue = dataSet.filter((item) => {
                return item[itemKey] == defaultValue;
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
     * @funcName : onOpen
     * @description : dropdownlist open 이벤트 핸들러
     * @param event : 이벤트 객체
     * @return :
     * @exception :
     * @date : 2022-01-03 오전 1:42
     * @author : chauki
     * @see
     * @history :
     **/
    const onOpen = useCallback((event) => {
        dropDownRef.current._element.childNodes[0].classList.add("k-state-focused");
    }, []);

    /**
     * @funcName : onClose
     * @description : dropdownlist close 이벤트 핸들러
     * @param event : 이벤트 객체
     * @return :
     * @exception :
     * @date : 2022-01-03 오전 1:42
     * @author : chauki
     * @see
     * @history :
     **/
    const onClose = useCallback((event) => {
        dropDownRef.current._element.childNodes[0].classList.remove("k-state-focused");
    }, []);

    // 필수값 class 추가
    const decoS = props.required === false ? "" : "decoS";

    return (
        <Fragment>
            {props.label ? <span className={`iptTit ${decoS}`}>{props.label}</span> : null}
            {
                props.remoteUrl
                    ? <DropDownList
                        ref={dropDownRef}
                        value={data?.defaultValue || null}
                        data={data.options}
                        loading={data.loading}
                        onClose={onClose}
                        onOpen={onOpen}
                        required={props.required === true}
                        label={"선택"}
                        disabled={props?.disabled}
                        listNoDataRender={() => {
                            return (<div className="k-nodata">
                                <div>데이터가 없습니다.</div>
                            </div>)
                        }}
                        {...props}
                    />
                    : <DropDownList
                        ref={dropDownRef}
                        defaultValue={data?.defaultValue || null}
                        value={data?.defaultValue || null}
                        data={data.options}
                        loading={data.loading}
                        onClose={onClose}
                        onOpen={onOpen}
                        required={props.required === true}
                        disabled={props?.disabled}
                        listNoDataRender={() => {
                            return (<div className="k-nodata">
                                <div>데이터가 없습니다.</div>
                            </div>)
                        }}
                        {...props}
                    />

            }
        </Fragment>
    )
};
export default memo(CustomDropDownList);
