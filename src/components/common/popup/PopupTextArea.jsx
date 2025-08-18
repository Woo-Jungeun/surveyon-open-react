import { Fragment } from "react";
import { TextArea } from "@progress/kendo-react-inputs";
import PropTypes from "prop-types";
import { StrNumSizeValidatedInput } from "@/common/utils/Validation.jsx";
import message from "@/components/common/message.js";

const PopupTextArea = ({parentProps, label, required, className, maxByte, ...props}) => {
    const decoS = !!required === false ? "" : "decoS";
    const fieldName = props.id ?? props.name;

    const handleChange = (e) => {
        if(StrNumSizeValidatedInput(e.value, maxByte)) {
            const newPopupValue = { ...parentProps.popupValue, [fieldName]: e.value };
            parentProps.setPopupValue(newPopupValue);
        }
    };


    return (
        <Fragment>
            {label ? <span className={`iptTit ${decoS}`}>{label}</span> : null}
            <TextArea
                value={parentProps.popupValue?.[fieldName] ?? ""}
                required={!!required}
                onChange={handleChange}
                className={className}
                validationMessage={label + message.defaultValidationMessage}
                {...props}
            />
        </Fragment>
    );
};

export default PopupTextArea;

PopupTextArea.propTypes = {
    parentProps : PropTypes.object.isRequired,
    label: PropTypes.string.isRequired
}