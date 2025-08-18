import { Fragment, useEffect, useState } from "react";
import CustomDropDownList from "@/components/kendo/CustomDropDownList.jsx";
import message from "@/components/common/message.js";
import PropTypes from "prop-types";

/**
 *---custom props------------------------
 * @param mutation API mutation
 * @param payload mutation의 payload
 * @param parentProps 상위에서 넘겨준 props ex)gridData에서 넘겨준 props
 *---------------------------------------
 * @param dataItemKey comboBox의 Key
 * @param textField comboBox의 value
 * @param props 그 외 props
 * @returns {JSX.Element}
 *
 * @author jisu
 * @since 2024.04.24
 */
const PopupDropDown = ({ dataItemKey, textField, parentProps, label, required, mutation, payload, id, ...props }) => {
    const [fetchData, setFetchData] = useState([]);
    const fieldName = id ?? dataItemKey;
    const defaultItem = !required && fieldName && textField ? { [fieldName]: null, [textField]: "선택" } : undefined;
    const decoS = !!required === false ? "" : "decoS";
    const { data } = props;
    //textField가 null인경우 처리.
    const _data = (data ?? fetchData).map(item => {
        item[textField] = item[textField] ?? "이름없음";
        return item;
    });

    useEffect(() => {
        if (mutation) {
            mutation.mutateAsync(payload ?? {}).then((res) => {
                setFetchData(res?.items ?? []);
            });
        }
    }, []);

    const handleComboBox = (e) => {
        const newPopupValue = { ...parentProps.popupValue, [fieldName]: e.value?.[dataItemKey] };
        parentProps.setPopupValue(newPopupValue);
    };

    return (
        <Fragment>
            {label ? <span className={`iptTit ${decoS}`}>{label}</span> : null}
            <CustomDropDownList
                dataItemKey={dataItemKey}
                textField={textField}
                style={{ width: "100%" }}
                data={_data}
                defaultItem={defaultItem}
                defaultValue={parentProps?.popupValue?.[fieldName]}
                onChange={(event) => handleComboBox(event)}
                required={!!required}
                validationMessage={label + message.defaultValidationMessage}
                listNoDataRender={()=>{
                    return (<div className="k-nodata">
                        <div>데이터가 없습니다.</div>
                    </div>)
                }}
                {...props}
            />
        </Fragment>
    );
};

export default PopupDropDown;


PopupDropDown.propTypes = {
    parentProps: PropTypes.object.isRequired,
    label: PropTypes.string.isRequired,
}