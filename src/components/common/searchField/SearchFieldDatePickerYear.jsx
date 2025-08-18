import {Fragment, useEffect} from "react";
import {Calendar, DatePicker} from "@progress/kendo-react-dateinputs";
import message from "@/components/common/message.js";
import PropTypes from "prop-types";

/**
 * 년도 날짜 하나에 대한 SearchFieldDatePickerYear
 *
 * @author jisu
 * @since 2024.05.08
 */
const SearchFieldDatePickerYear = ({parentProps, label, name, defaultValue, operator, format, required, ...props}) => {
    const _fieldName = name;
    const _operator = operator || "between"
    const decoS = required === true ? "decoS" : "";

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
        const year = date?.getFullYear();
        if (_operator == "eq" || _operator == "contains") {
            switch (format) {
                case "yyyy":            //년
                    return `${year}`;
                case "yyyyMM":          //년월
                    return `${year}01`;
                case "yyyyMMdd":        //년월일
                    return `${year}0101`;
                case "yyyyMMddHHmmss":  //년월일시분초
                    return `${year}0101000000`;
                default:
                    break;
            }
        } else {
            switch (format) {
                case "yyyy":            //년
                    return `${year}` + "," + `${year}`;
                case "yyyyMM":          //년월
                    return `${year}01` + "," + `${year}12`;
                case "yyyyMMdd":        //년월일
                    return `${year}0101` + "," + `${year}1231`;
                case "yyyyMMddHHmmss":  //년월일시분초
                    return `${year}0101000000` + "," + `${year}1231235959`;
                default:
                    break;
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
                format={"yyyy"}
                onChange={(event) => handleDateChange(event)}
                validationMessage={message.defaultValidationMessage}
                required={true}
                operator={_operator}
                defaultValue={defaultValue}
                calendar={(DateProps) => (
                    <Calendar
                        bottomView={"decade"}
                        topView={"decade"}
                        value={DateProps.value}
                        onChange={DateProps.onChange}
                        max={new Date()}
                    />
                )}
                {...props}
            />
        </Fragment>
    );
};

SearchFieldDatePickerYear.propType = {
    parentProps: PropTypes.object.isRequired,
    name: PropTypes.object.isRequired,
}
export default SearchFieldDatePickerYear;
