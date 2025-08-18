import { Calendar, DatePicker } from "@progress/kendo-react-dateinputs";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { Fragment } from "react";
import message from "@/components/common/message.js";
import { RegExpTypes } from "@/common/utils/Validation.jsx";

/**
 * @author dhwon
 * @since 2024.05.21
 *
 * custom param
 * @Param parentProps
 * @param reqFormat 서버로 보내줄 format. dayjs 날짜 포맷. default 년
 * @param id 서버에보내줄 데이터의 key 필드 명. 없으면 name으로 설정.
 * @param label title
 * -----------------
 *
 */
const PopupDatePickerYear = ({ parentProps, id, label, reqFormat = "YYYY", ...props }) => {
    const { required } = props;
    const fieldName = id ? id : props.name;
    const defaultValue = parentProps?.popupValue?.[fieldName]
    const defaultValueDate = defaultValue ? dayjs(defaultValue).toDate() : defaultValue;
    const decoS = !!required === false ? "" : "decoS";
    const placeholder = !!props.disabled === true && parentProps.mode == "I" ? message.disabledPlaceholderForInsert : null ;
    const format = props.format ?? "yyyy";
    const requestFormat = reqFormat ?? format.replace(RegExpTypes.NOT_ALPHABET, "");

    const handleDateChange = (e) => {
        const newPopupValue = { ...parentProps.popupValue, [fieldName]: e.value ? dayjs(e.value).format(requestFormat) : e.value };
        parentProps.setPopupValue(newPopupValue);
    };

    return (
        <Fragment>
            {label ? (
                <Fragment>
                    <span className={`iptTit ${decoS}`}>{label}</span>
                    <div className="inpArea cal">
                        <DatePicker
                            defaultValue={defaultValueDate}
                            format={format}
                            onChange={(event) => handleDateChange(event)}
                            validationMessage={label + message.defaultValidationMessage}
                            placeholder={placeholder}
                            calendar={(DateProps) => (
                                <Calendar
                                    bottomView={"decade"}
                                    topView={"decade"}
                                    value={DateProps.value}
                                    onChange={DateProps.onChange}
                                />
                            )}
                            {...props}
                        />
                    </div>
                </Fragment>
            ) : (
                <DatePicker
                    defaultValue={defaultValueDate}
                    format={format}
                    onChange={(event) => handleDateChange(event)}
                    validationMessage={label + message.defaultValidationMessage}
                    placeholder={placeholder}
                    calendar={(DateProps) => (
                        <Calendar
                            bottomView={"decade"}
                            topView={"decade"}
                            value={DateProps.value}
                            onChange={DateProps.onChange}
                        />
                    )}
                    {...props}
                />
            )}
        </Fragment>
    );
};

PopupDatePickerYear.propTypes = {
    parentProps: PropTypes.object.isRequired,
    label : PropTypes.string.isRequired
};

export default PopupDatePickerYear;
