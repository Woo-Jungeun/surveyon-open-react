import {RadioButton} from "@progress/kendo-react-inputs";
import PropTypes from "prop-types";
import { Fragment } from "react";

/**
 * PopupRadioButton. PopupRadioButton 항상 grid, chart등 상위와 연관되어있으므로 상위에서 props를 받는다
 *
 * @author jewoo
 * @since 2024-05-17<br />
 */
const PopupRadioButton = ({ parentProps, id, label, name, checked, value, ...props }) => {
    const handleInputChange = () => {
        //얘도 공통 util에 빼자
        const newPopupValue = { ...parentProps.popupValue, [name]: value };
        parentProps.setPopupValue(newPopupValue);
    };

    return (
        <Fragment>
            <RadioButton label={label}
                         name={name}
                         id={id}
                         checked={checked}
                         onChange={handleInputChange}/>
        </Fragment>
    );
};

export default PopupRadioButton;

PopupRadioButton.propTypes = {
    parentProps : PropTypes.object.isRequired
}