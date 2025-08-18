import {Fragment, useEffect} from "react";
import {DatePicker} from "@progress/kendo-react-dateinputs";
import message from "@/components/common/message.js";
import PropTypes from "prop-types";
import dayjs from "dayjs";

/**
 * 날짜 하나에 대한 SearchFieldDatePicker (날짜 range는 따로있음)
 *
 * defaultValue 주지 않으면, 기본 오늘날짜.
 *
 * @author jisu
 * @since 2024.05.08
 */
const SearchFieldDatePicker = ({
                                   parentProps,
                                   label,
                                   name,
                                   required = true,
                                   operator,
                                   format,
                                   dateFormat,
                                   defaultValue,
                                   max,
                                   ...props
                               }) => {
    const _fieldName = name;
    const _operator = operator || "between"
    const decoS = !!required === true ? "decoS" : "";
    const _dateFormat = dateFormat || "yyyy-MM-dd"
    const _max = max || new Date();

    useEffect(() => {
        if (defaultValue) {
            parentProps.defaultFilterChange({
                field: _fieldName,
                operator: _operator,
                value: formatDateTime(defaultValue)
            });
        }
    }, []);

    /**
     * 날짜 form setting
     * */
    const formatDateTime = (date) => {
        if(date){
            const year = date?.getFullYear();
            const month = (date?.getMonth() + 1).toString().padStart(2, '0');
            const day = date?.getDate().toString().padStart(2, '0');
            if (_operator == "eq") {
                switch (format) {
                    case "yyyyMMdd":        //년월일
                        return `${year}${month}${day}`;
                    case "yyyyMMddHHmmss":  //년월일시분초
                        return `${year}${month}${day}000000`;
                    default:
                        break;
                }
            } else {
                switch (format) {
                    case "yyyyMMdd":        //년월일
                        return `${year}${month}${day}` + "," + `${year}${month}${day}`;
                    case "yyyyMMddHHmmss":  //년월일시분초
                        return `${year}${month}${day}000000` + "," + `${year}${month}${day}235959`;
                    default:
                        break;
                }
            }
        }
    };

    const handleDateChange = (e) => {
        if (e.value === "" || e.value === null) {
            return parentProps.clearFilter(_fieldName);
        } else {
            parentProps.filterChange({
                field: _fieldName,
                operator: e.target.props.operator,
                value: formatDateTime(e.value)
            });
        }
    };

    return (
        <Fragment>
            {label ? <p className={`txtTit ${decoS}`}>{label}</p> : null}
            <DatePicker
                defaultValue={defaultValue}
                format={_dateFormat}
                onChange={(event) => handleDateChange(event)}
                validationMessage={message.searchFieldValidationMessage}
                operator={_operator}
                required={required}
                max={_max}
                {...props}
            />
        </Fragment>
    );
};

SearchFieldDatePicker.propType = {
    parentProps: PropTypes.object.isRequired,
    name: PropTypes.object.isRequired,
}
export default SearchFieldDatePicker;
