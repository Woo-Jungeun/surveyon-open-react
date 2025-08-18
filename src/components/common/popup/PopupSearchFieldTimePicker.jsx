import {TimePicker} from "@progress/kendo-react-dateinputs";
import {Fragment, useState} from "react";

const PopupSearchFieldTimePicker = ({parentProps
                                        , id
                                        , label
                                        , required
                                        , disabled = false
                                        , steps
                                        , defaultBeforeValue = '0000'
                                        , defaultAfterValue = '2359'
                                        , ...props}) => {
    const decoS = !!required === false ? "" : "decoS";
    const fieldName = id ?? props.name;

    const [bf, setBf] = useState(defaultBeforeValue+"00");
    const [af, setAf] = useState(defaultAfterValue+"59");

    const handleTimeOnChange = (e, parentProps, type) => {

        let newPopupValue = {...parentProps.popupValue};
        let _bf = bf;
        let _af = af;
        switch (type) {
            case "before":
                _bf = formatTimeToHHMMSS(e.value) + "00";
                /*시작시간이 종료시간보다 이 후일 경우*/
                if (_bf > _af) {
                    _af = _bf;
                    setAf(_af);
                }
                setBf(_bf);
                break;
            case "after":
                _af = formatTimeToHHMMSS(e.value) + "59";
                setAf(_af);
                break;
        }

        newPopupValue[fieldName] = _bf + "," + _af;
        parentProps.setPopupValue(newPopupValue);

        if (e.value === "" || e.value === null) {
            return parentProps.clearFilter(fieldName);
        } else {
            return parentProps.filterChange({field: fieldName, operator: "between", value: newPopupValue[fieldName]});
        }
    };

    const formatTimeToHHMMSS = (time) => {
        return time ? time.toLocaleTimeString('en-US', {hour12: false}).replace(/:/g, '').slice(0, 4) : '';
    };

    return (
        <Fragment>
            {label ? <p className={`txtTit ${decoS}`}>{label}</p> : null}
            <div className={'iptBox type02'}>
                <TimePicker
                    value={new Date(new Date().setHours(bf.slice(0, 2), bf.slice(2, 4)))}
                    onChange={(e) => handleTimeOnChange(e, parentProps, "before")}
                    disabled={disabled}
                    format={"HH:mm"}
                    steps={steps}
                />
                <span className={'iptDeco'}>~</span>
                <TimePicker
                    value={new Date(new Date().setHours(af.slice(0, 2), af.slice(2, 4)))}
                    min={new Date(new Date().setHours(bf.slice(0, 2), bf.slice(2, 4)))}
                    onChange={(e) => handleTimeOnChange(e, parentProps, "after")}
                    disabled={disabled}
                    format={"HH:mm"}
                    steps={steps}
                />
            </div>
        </Fragment>
    )
}

export default PopupSearchFieldTimePicker;