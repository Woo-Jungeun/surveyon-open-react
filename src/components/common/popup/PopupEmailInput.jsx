import CustomEmailBox from "@/components/kendo/CustomEmailBox.jsx";
import PropTypes from "prop-types";
import { Fragment, useState } from "react";
import message from "@/components/common/message.js";
import { StrNumSizeValidatedInput } from "@/common/utils/Validation.jsx";

/**
 * 팝업용 이메일 입력 컴포넌트<br />
 *
 * @author dhwon
 * @since 2024-05-14<br />
 */

const PopupEmailInput = ({parentProps, name, label, maxByte, ...props}) => {
    const [value, setValue] = useState("");

    const {defaultValue, disabled, id} = props;
    const fieldName = id ?? name;

    const onChange = (e) => {
        const value = e.value;
        if(StrNumSizeValidatedInput(value, maxByte)) {
            setValue(value)
            const newPopupValue = { ...parentProps.popupValue, [fieldName]: value };
            parentProps.setPopupValue(newPopupValue);
        }
    };

    const decoS = !!props.required === false ? "" : "decoS";
    const placeholder = !!props.disabled === true && parentProps.mode == "I" ? message.disabledPlaceholderForInsert : null ;

    return (
        <Fragment>
            {label ? <span className={`iptTit ${decoS}`}>{label}</span> : null}
            <CustomEmailBox
                name={name}
                onChangeFunc={onChange}
                inputEmailValue={defaultValue ?? parentProps.popupValue[fieldName] ?? value}
                placeholder={placeholder}
                disabled={disabled}
            />
        </Fragment>
    );
};

export default PopupEmailInput;

PopupEmailInput.propTypes = {
    parentProps : PropTypes.object.isRequired
}