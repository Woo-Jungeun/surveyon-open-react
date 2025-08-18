import PropTypes from "prop-types";
import { Fragment, useState } from "react";
import CustomPhoneNumberBox from "@/components/kendo/CustomPhoneNumberBox.jsx";
import message from "@/components/common/message.js";
import { StrNumSizeValidatedInput } from "@/common/utils/Validation.jsx";

const PopupPhoneInput = ({parentProps, name, label, maxByte, ...props}) => {
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

    const placeholder = !!props.disabled === true && parentProps.mode == "I" ? message.disabledPlaceholderForInsert : null ;
    const decoS = !!props.required === false ? "" : "decoS";

    return (
        <Fragment>
            {label ? <span className={`iptTit ${decoS}`}>{label}</span> : null}
            <CustomPhoneNumberBox
                name={name}
                onChangeFunc={onChange}
                inputPhoneNumber={defaultValue ?? parentProps.popupValue[fieldName] ?? value}
                placeholder={placeholder}
                disabled={disabled}
            />
        </Fragment>
    );
};

export default PopupPhoneInput;

PopupPhoneInput.propTypes = {
    parentProps : PropTypes.object.isRequired
}