import { Calendar, DatePicker } from "@progress/kendo-react-dateinputs";
import { useEffect, useState } from "react";
import moment from 'moment';
import message from "@/components/common/message.js";
import PropTypes from "prop-types";

/**
 * DateRangePicker (기간 DatePicker)
 *
 * @author Jungyeon
 * @since 2024-04-29<br />
 * 2024-06-13 BokyeongKang - 조회 시작일을 자유롭게 선택하기 위해 시작일의 max옵션 제거, 시작일 변경 시 종료일 유효성 체크 후 강제 변경되도록 수정 <br />
 * 2024-06-17 BokyeongKang - null가능하도록 <br />
 *
 */
const SearchFieldDatePickerRange = ({ parentProps,
                                        required = false, // 필수여부
                                        label,
                                        format,
                                        name,
                                        defaultValue,
                                        possibleRange, //조회제약기간
                                        operator ="between",
                                        max = null, //최대
                                        ...props }) => {

    const START_DATE_NAME = "startDate";
    const END_DATE_NAME = "endDate";
    const OPERATOR = operator || "between";
    const _fieldName = name;

    //state
    const [maxData, setMaxData] = useState(defaultValue?.end ? defaultValue?.end : null);
    const [minData, setMinData] = useState(defaultValue?.start ? defaultValue?.start : null);

    //default 값이 있을 경우 초기세팅
    useEffect(() => {
        if(defaultValue) {
            parentProps.defaultFilterChange({ field: _fieldName, operator: OPERATOR, value: formatDateTime(defaultValue?.start, "start") + "," + formatDateTime(defaultValue?.end, "end")});
            parentProps.filterChange({ field: _fieldName, operator: OPERATOR, value: formatDateTime(defaultValue?.start, "start") + "," + formatDateTime(defaultValue?.end, "end")});
        }
    }, []);

    // startDate와 endDate 사이의 모든 날짜를 배열에 담아 반환하는 함수
    const getDatesBetween = (startDate, endDate) => {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        while (start <= end) {
            dates.push(new Date(start));
            start.setDate(start.getDate() + 1);
        }
        return dates;
    };


    // 시작일과 종료일의 포맷 변경 함수
    const formatDateTime = (date, type) => {
        const year = date?.getFullYear();
        const month = (date?.getMonth() + 1).toString().padStart(2, '0');
        const day = date?.getDate().toString().padStart(2, '0');

        switch (format) {
            case "yyyyMM":
                return `${year}${month}`;
            case "yyyyMMdd":
                return `${year}${month}${day}`;
            case "yyyyMMddHHmmss":
                // 시작 날짜에는 000000, 종료 날짜에는 23595959
                if (type == "start") {
                    return `${year}${month}${day}000000`;
                } else {
                    return `${year}${month}${day}235959`;
                }
            default:
                break;
        }

    };

    const handleDateChange = (e) => {
        if (e.target.value) {
            let selectedValue = e.value;
            let _minData = minData;
            let _maxData = maxData;

            // 시작일 변경 시
            if(e.target.props.name === START_DATE_NAME){
                _minData = selectedValue;
            }else if(e.target.props.name === END_DATE_NAME){
                // 종료일 변경 시
                _maxData = selectedValue;
            }

            // 가능한 일자
            const _possibleStartDate = possibleStartDate(_maxData);
            const _possibleEndDate = possibleEndDate(_minData);


            // max 없고 제약기간 없을 경우
            if(max === null && isNaN(possibleRange)){
                // 시작일자가 종료일자보다 이 후일 경우=>  시작일자, 종료일자 모두 선택한 날짜로 바꿔준다.
                if(_minData > _maxData) {
                    parentProps.filterChange({
                        field: _fieldName,
                        operator: OPERATOR,
                        value: formatDateTime(selectedValue, "start") + "," + formatDateTime(selectedValue, "end")
                    });
                    setMinData(selectedValue);
                    setMaxData(selectedValue);
                }else{
                    parentProps.filterChange({
                        field: _fieldName,
                        operator: OPERATOR,
                        value: formatDateTime(_minData, "start") + "," + formatDateTime(_maxData, "end")
                    });
                    setMinData(_minData);
                    setMaxData(_maxData);
                }
            }else{
                // (시작일 변경) 시작일자가 종료일자보다 이 후거나 가능한 종료일자가 현재 종료일자보다 이 전일 경우
                // => 시작일자는 선택한 값을 적용하고 종료일자는 가능한 종료일자로 변경한다.
                if(e.target.props.name === START_DATE_NAME && (_minData > _maxData || _possibleEndDate < _maxData)){
                    parentProps.filterChange({ field: _fieldName, operator: OPERATOR, value: formatDateTime(_minData, "start")+ "," +formatDateTime(_possibleEndDate, "end") });
                    setMinData(_minData);
                    setMaxData(_possibleEndDate);
                }else if(e.target.props.name === END_DATE_NAME && (_minData > _maxData || _possibleStartDate > _minData)){
                    // (종료일 변경) 시작일자가 종료일자보다 이 후거나 가능한 시작일자가 현재 시작일자보다 이 후일 경우
                    // => 시작일자는 가능한 시작일자로 변경하고 종료일자는 선택한 값을 적용한다.
                    parentProps.filterChange({ field: _fieldName, operator: OPERATOR, value: formatDateTime(_possibleStartDate, "start")+ "," +formatDateTime(_maxData, "end") });
                    setMinData(_possibleStartDate);
                    setMaxData(_maxData);
                }else{
                    parentProps.filterChange({
                        field: _fieldName,
                        operator: OPERATOR,
                        value: formatDateTime(_minData, "start") + "," + formatDateTime(_maxData, "end")
                    });
                    setMinData(_minData);
                    setMaxData(_maxData);
                }
            }

        } else {
            /* 일자 null 가능*/
            if(e.target.props.name === START_DATE_NAME){
                setMinData(null);
            }else if(e.target.props.name === END_DATE_NAME){
                setMaxData(null);
            }
            return parentProps.clearFilter(_fieldName);
        }
    };


    // 가능한 시작일자 (max 없을경우만 사용)
    const possibleStartDate = (compareEndDate) => {
        if(maxData === null) return null;
        if(isNaN(possibleRange)){
            // 제약기간 없다면
            return max;
        }else{
            // 계산된 시작가능일자 = 비교일자 ? 비교일자 - 기간 : 종료일 - 기간
            const _possibleDate = compareEndDate ? moment(compareEndDate).subtract(possibleRange, 'days').toDate() : moment(maxData).subtract(possibleRange, 'days').toDate();
            // "최대 일자에서 계산된 시작가능일자"가 "계산된 시작가능일자"보다 이 전일 경우? 최대 일자에서 계산된 시작가능일자: 계산된 시작가능일자
            return max !== null ? (moment(max).subtract(possibleRange, 'days').toDate() < _possibleDate ? moment(max).subtract(possibleRange, 'days').toDate() : _possibleDate) : _possibleDate;
        }
    };
    // 가능한 종료일자
    const possibleEndDate = (compareStartDate) => {
        if(minData === null) return null;
        if(isNaN(possibleRange)){
            // 제약기간 없다면
            return max;
        }else{
            // 계산된 종료가능일자 = 비교일자 ? 비교일자 + 기간 : 시작일 + 기간
            const _possibleDate = compareStartDate ? moment(compareStartDate).add(possibleRange, 'days').toDate() : moment(minData).add(possibleRange, 'days').toDate();
            // "최대 일자"가 "계산된 종료가능일자"보다 이 전일 경우? 최대 일자: 계산된 종료가능일자
            return max !== null ? (max < _possibleDate ? max : _possibleDate) : _possibleDate;
        }
    };

    // max값에대한 제한이 아예 없을경우 datepicker에 옵션이 달리면 안됨.
    const startMax = max === null ? {} : {max: max};
    const endMax = possibleEndDate() === null ?{} : {max: possibleEndDate()} ;
    const endMin = minData === null ?{} : {min: minData} ;
    return (
        <>
            {label ? <p className={"txtTit" + (required ? " decoS" : "")}>{label}</p> : null}
            <div className="iptCal col2">
                <div className="inpArea cal">
                    <DatePicker
                        name={START_DATE_NAME}
                        format={"yyyy-MM-dd"}
                        onChange={(e) => handleDateChange(e)}
                        required={required}
                        value={minData}
                        {...startMax} //max값이 null일 수 있기 때문에..
                        validationMessage={required ? message.searchFieldValidationMessage : "날짜가 올바르지 않습니다."}
                        {...props}
                    />
                </div>
                <span className={'iptDeco'}>~</span>
                <div className="inpArea cal">
                    <DatePicker
                        name={END_DATE_NAME}
                        format={"yyyy-MM-dd"}
                        onChange={(e) => handleDateChange(e)}
                        required={required}
                        {...endMin} // 조회시작일
                        {...endMax} // max값이 null일 수 있기 때문에.. 제약기간이 없다면? max: 시작일 + 제약기간
                        value={maxData}
                        validationMessage={required ? message.searchFieldValidationMessage : "날짜가 올바르지 않습니다."}
                        {...props}
                    />
                </div>
            </div>
        </>
    )

}

SearchFieldDatePickerRange.propType = {
    parentProps: PropTypes.object.isRequired,
    // name : PropTypes.object.isRequired,
}

export default SearchFieldDatePickerRange;