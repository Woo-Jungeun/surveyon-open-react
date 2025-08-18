import { DatePicker, DateRangePicker } from "@progress/kendo-react-dateinputs";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { Fragment, useState } from "react";
import message from "@/components/common/message.js";

/**
 * @author jisu
 * @since 2024.04.29
 */
const PopupDatePickerRange = ({ parentProps, ...props }) => {
    //props
    const { required } = props;
    const { stDtName, stDtDefaultValue, endDtName, endDtDefaultValue } = props;

    //변수
    const START_DATE_NAME = stDtName ? stDtName : "startDate";
    const START_DATE_DEFAULT_VALUE = stDtDefaultValue ? stDtDefaultValue : null;
    const END_DATE_NAME = endDtName ? endDtName : "endDate";
    const END_DATE_DEFAULT_VALUE = endDtDefaultValue ? endDtDefaultValue : null;

    //state
    const [maxData, setMaxData] = useState(END_DATE_DEFAULT_VALUE ? END_DATE_DEFAULT_VALUE : new Date(new Date().getFullYear()+100, 11, 31));
    const [minData, setMinData] = useState(START_DATE_DEFAULT_VALUE ? START_DATE_DEFAULT_VALUE : new Date(new Date().getFullYear()-100, 0, 1));

    //이벤트 핸들러
    const handleDateChange = (e) => {
        const fieldName = e.target.name;
        const newPopupValue = { ...parentProps.popupValue, [fieldName]: e.value ? dayjs(e.value).format("YYYYMMDDHHmmss") : e.value };
        parentProps.setPopupValue(newPopupValue);
        
        if(e.target.name === START_DATE_NAME){
            setMinData(e.value);
        }else if(e.target.name === END_DATE_NAME){
            setMaxData(e.value);
        }
    };

    const decoS = !!required === false ? "" : "decoS";
    return (
        <Fragment>
            {props.stDtLabel?<span className={`iptTit ${decoS}`}>{props.stDtLabel}</span>:null}
            <DatePicker
                name = {START_DATE_NAME}
                format={"yyyy-MM-dd"}
                onChange={(event) => handleDateChange(event)}
                defaultValue={START_DATE_DEFAULT_VALUE}
                required={required}
                max={maxData} 
                validationMessage={"날짜가 올바르지 않습니다."}
                {...props}
            />
            {props.endDtLabel?<span className={`iptTit ${decoS}`}>{props.endDtLabel}</span>:null}
            <DatePicker
                name = {END_DATE_NAME}
                format={"yyyy-MM-dd"}
                onChange={(event) => handleDateChange(event)}
                defaultValue={END_DATE_DEFAULT_VALUE}
                required={required}
                min={minData}
                validationMessage={"날짜가 올바르지 않습니다."}
                {...props}
            />
        </Fragment>

    );
};

PopupDatePickerRange.propTypes = {
    parentProps: PropTypes.object.isRequired
};

export default PopupDatePickerRange;
