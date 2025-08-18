import { Input } from "@progress/kendo-react-inputs";
import PropTypes from "prop-types";
import { Fragment, useState } from "react";
import message from "@/components/common/message.js";
import {replaceThsComma} from "@/common/utils/DataTypeUtil.jsx";
import { StrNumSizeValidatedInput } from "@/common/utils/Validation.jsx";

/**
 * PopupInput. Popup은 항상 grid, chart등 상위와 연관되어있으므로 상위에서 props를 받는다
 *
 * @param isNumberComma 표출시에는 comma를 붙여주고, popupValue에 실제 데이터 setting할때는 콤마를 빼줌.
 * @author jisu
 * @since 2024-04-22<br />
 */
const PopupInput = ({ parentProps, id, label, required, type, labelWidth, isNumberComma, max, min, step, maxByte, valid, ...props }) => {
    const [value, setValue] = useState("");

    const fieldName = id ?? props.name;

    const removeComma = (value) => {
        const result = value.replace(/[^0-9]/g, "") || 0;
        // 천단위 콤마 필요한 경우
        return Number(result).toString(); // 맨앞 숫자 0일 경우 제거. (ex 0123 => 123)
    }

    const handleInputChange = (e) => {
        const value = isNumberComma ? removeComma(e.value) : e.value;
        if(StrNumSizeValidatedInput(value, maxByte)) {
            if(valid == null) {
                setValue(value);
                const newPopupValue = { ...parentProps.popupValue, [fieldName]: value };
                parentProps.setPopupValue(newPopupValue);
            } else if (valid instanceof Function) {
                setValue(valid(value));
                const newPopupValue = { ...parentProps.popupValue, [fieldName]: valid(value)};
                parentProps.setPopupValue(newPopupValue);
            }
        }
    };

    const decoS = !!required === false ? "" : "decoS";
    const placeholder = !!props.disabled === true && parentProps.mode == "I" ? message.disabledPlaceholderForInsert : null ;

    //console.log(fieldName, parentProps.popupValue?.[fieldName])
    const renderValue = isNumberComma
        ? replaceThsComma(parentProps.popupValue?.[fieldName]) ?? value
        : parentProps.popupValue?.[fieldName] ?? value;

    //console.log(fieldName, "render", renderValue)
    return (
        <Fragment>
            {label ? <span className={`iptTit ${decoS}`} style={{ width: labelWidth }}>{label}</span> : null}
            <Input type={type}
                   max={max}
                   min={min}
                   step={step}
                   value={renderValue}
                   required={!!required}
                   onChange={handleInputChange}
                   placeholder={placeholder}
                   onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                   validationMessage={label + message.defaultValidationMessage}
                   {...props}
            />
        </Fragment>
    );
};

export default PopupInput;

PopupInput.propTypes = {
    parentProps: PropTypes.object.isRequired,
    label : PropTypes.string.isRequired
}