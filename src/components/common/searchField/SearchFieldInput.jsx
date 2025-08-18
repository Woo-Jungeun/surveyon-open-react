import { Input } from "@progress/kendo-react-inputs";
import PropTypes from "prop-types";
import { Fragment, useEffect } from "react";

const SearchFieldInput = ({parentProps, label, required, placeholder, ...props}) => {
    const _fieldName = props.name;
    const _operator = "contains"
    const decoS = !!required === true ? "decoS" : "";

    useEffect(() => {
        if(props.defaultValue) {
            parentProps.defaultFilterChange({ field: _fieldName, operator: _operator, value: props.defaultValue});
        }
    }, []);


    const handleInputOnChange = (e, parentProps) => {
        if(e.target.value) {
            return parentProps.filterChange({ field: _fieldName, operator: _operator, value: e.target.value });
        } else {
            return parentProps.clearFilter(_fieldName);
        }

    };


    return (
        <Fragment>
            {label ? <p className={`txtTit ${decoS}`}>{label}</p> : null}
            <Input
                placeholder={placeholder || "내용을 입력해 주세요"}
                onChange={(e) => handleInputOnChange(e, parentProps)}
                operator={_operator}
                {...props}
            />
        </Fragment>

    );
};


SearchFieldInput.propType = {
    parentProps : PropTypes.object.isRequired,
    name: PropTypes.string.isRequired
}
export default SearchFieldInput;
