import { DateTimePicker } from "@progress/kendo-react-dateinputs";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { Fragment } from "react";
import message from "@/components/common/message.js";
import { RegExpTypes } from "@/common/utils/Validation.jsx";

/**
 * @author jisu
 * @since 2024.04.29
 *
 * custom param
 * @Param parentProps
 * @param reqFormat 서버로 보내줄 format. dayjs 날짜 포맷. default 년월일
 * @param id 서버에보내줄 데이터의 key 필드 명. 없으면 name으로 설정.
 * @param label title
 * -----------------
 *
 */
const PopupDateTimePicker = ({ parentProps, id, label, reqFormat = "YYYYMMDDHHmmss", ...props }) => {
    const { required } = props;
    const fieldName = id ? id : props.name;
    const defaultValue = parentProps?.popupValue?.[fieldName];
    const defaultValueDate = defaultValue ? dayjs(defaultValue).toDate() : null;
    const decoS = !!required === false ? "" : "decoS";
    const placeholder = !!props.disabled === true && parentProps.mode == "I" ? message.disabledPlaceholderForInsert : null ;
    const format = props.format ?? "yyyy-MM-dd HH:mm:ss";
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
                        <DateTimePicker
                            value={defaultValueDate}
                            format={format}
                            onChange={(event) => handleDateChange(event)}
                            validationMessage={label + message.defaultValidationMessage}
                            placeholder={placeholder}
                            {...props}
                        />
                    </div>
                </Fragment>
            ) : (
                <DateTimePicker
                    value={defaultValueDate}
                    format={format}
                    onChange={(event) => handleDateChange(event)}
                    validationMessage={label + message.defaultValidationMessage}
                    placeholder={placeholder}
                    {...props}
                />
            )}
        </Fragment>
    );
};

PopupDateTimePicker.propTypes = {
    parentProps: PropTypes.object.isRequired,
    label : PropTypes.string.isRequired,
};

export default PopupDateTimePicker;
