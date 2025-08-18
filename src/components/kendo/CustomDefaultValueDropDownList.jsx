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
const CustomDefaultValueDropDownList = (props) => {
    // console.log(props);
    //state 설정
    const [data, setData] = useState({
        defaultValue: null,
        options: [],
        loading: false
    });

    const dropDownRef = useRef();

    //todo componentDidMount
    useLayoutEffect(() => {
        initData();
    }, []);

    //todo componentDidUpdate
    useLayoutEffect(() => {
        updateData();
    }, [props.data, props.defaultValue, data.options]);

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
        setData(prevState => ({
            ...prevState,
            options: props.data !== undefined && props.data !== null ? props.data : []
        }));

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
            <DropDownList
                {...props}
                ref={dropDownRef}
                defaultValue={data?.defaultValue || null}
                //value={data?.defaultValue || null}
                data={data.options}
                loading={data.loading}
                onClose={onClose}
                onOpen={onOpen}
                required={props.required === true}
                listNoDataRender={() => {
                    return (<div className="k-nodata">
                        <div>데이터가 없습니다.</div>
                    </div>)
                }}
            />
        </Fragment>
    )
};
export default memo(CustomDefaultValueDropDownList);
