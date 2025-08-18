import {RadioButton} from "@progress/kendo-react-inputs";
import PropTypes from "prop-types";
import { Fragment, useEffect } from "react";

/**
 * @author dhwon234
 * @since 2024-05-13<br />
 * @note 조회 조건으로써 radio를 쓰는 곳이 없을 것 같지만 일단 만들어두었으니 삭제는 하지 않겠습니다...
 */
const SearchFieldRadioButton = ({parentProps, label, required, ...props}) => {
    const _fieldName = props.name;
    const _operator = "eq"

    useEffect(() => {
        if(props.defaultValue) {
            parentProps.defaultFilterChange({ field: _fieldName, operator: _operator, value: props.defaultValue});
        }
    }, []);

    const handleChange = (e, parentProps) => {
        if(e.value) {
            return parentProps.filterChange({ field: _fieldName, operator: _operator, value: e.value });
        } else {
            return parentProps.clearFilter(_fieldName);
        }
    };

    return (
        <Fragment>
            <RadioButton label={label}
                         name={_fieldName}
                         id={props.id}
                         value={props?.value}
                         checked={props?.checked}
                         onChange={(e) => handleChange(e, parentProps)}
                         {...props}
                         />
        </Fragment>
    );
};

export default SearchFieldRadioButton;

SearchFieldRadioButton.propTypes = {
    parentProps : PropTypes.object.isRequired
}