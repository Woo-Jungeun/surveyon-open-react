import CustomCellPhoneNumberBox from "@/components/kendo/CustomCellPhoneNumberBox.jsx";
import PropTypes from "prop-types";
import { Fragment, useState } from "react";
import { StrNumSizeValidatedInput } from "@/common/utils/Validation.jsx";

const PopupCellPhoneInput = ({parentProps, name, label, maxByte, ...props}) => {
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

    return (
        <Fragment>
            {label ? <span className={`iptTit ${decoS}`}>{label}</span> : null}
            <CustomCellPhoneNumberBox
                name={name}
                onChangeFunc={onChange}
                inputPhoneNumber={defaultValue ?? parentProps.popupValue[fieldName] ?? value}
                disabled={disabled}
            />
        </Fragment>
    );
};

export default PopupCellPhoneInput;

PopupCellPhoneInput.propTypes = {
    parentProps : PropTypes.object.isRequired
}