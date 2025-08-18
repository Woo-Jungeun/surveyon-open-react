import { MultiSelect } from "@progress/kendo-react-dropdowns";
import { Fragment, useEffect, useState } from "react";
import PropTypes from "prop-types";
import message from "@/components/common/message.js";

/**
 * 조회부 comboBox
 * ---custom props------------------------
 * @param mutation
 * @param payload
 * @param parentProps
 * @param targetValue 키, 값 중 무엇을 데이터로 넘겨줄지. ex)운수사명 콤보인경우 compnayId, companyName으로 표출하고, companyName을 지정하여 서버에 전송
 * @param id 키 필드 이름 {[id] : comboDataObject[targetValue]}
 * ---------------------------------------
 * @param dataItemKey
 * @param textField
 * @param props
 * @returns {JSX.Element}
 *
 * @author jisu
 * @since 2024-04-22<br />
 * 1. 밖에서 data를 fetch한 후에 data를 넘겨주는 방법
 * 2. mutation을 넘겨서 컴포넌트안에서 data를 fetch하는 방법
 * 두가지가 있음.
 *
 * defaultItemValue를 세팅할 경우에는 1번의 방법만 가능.
 */
const SearchFieldMultiSelect = ({
                                 parentProps,
                                 defaultItemValue,
                                 id,
                                 dataItemKey,
    textField,
    targetValue,
    required,
    label,
    mutation,
    payload,
                                 data,
    operator,
    ...props
}) => {
    const [fetchData, setFetchData] = useState([]);
    const _fieldName = id ?? dataItemKey;
    const [searchInput, setSearchInput] = useState("");
    const _operator = operator ?? "eq";
    const _targetValue = targetValue ?? dataItemKey;
    const decoS = !!required === false ? "" : "decoS";
    const placeholder = "선택";
    const rawData = mutation ? fetchData : data;
    const processedData = rawData?.map(item => ({ ...item, [textField]: item[textField] + "" }));

    useEffect(() => {
        if (mutation) {
            mutation.mutateAsync(payload ?? {}).then((res) => {
                //textField 컬럼의 데이터가 string이 아니면 오류남. 무조건 string으로 바꿈.
                setFetchData(res?.items ?? []);
            });
        }
    }, []);

    /*defaultValue 관련 작성 안함*/
    // useEffect(() => {
    //     if (defaultItemValue) {
    //         parentProps.defaultFilterChange({ field: _fieldName, operator: _operator, value: defaultItemValue?.[_targetValue] });
    //     }
    // }, [data]);

    const handleMultiSelectChange = (e) => {
        //값이 이미 있으면 바꿔치기. 값이 없어지면 obejct에서 삭제.
        const value = [...e.value];
        if (value) {
            return parentProps.filterChange({ field: _fieldName, operator: _operator, value: value });
        } else {
            return parentProps.clearFilter(_fieldName);
        }
    };


    return (
        <Fragment>
            {label ? <p className={`txtTit ${decoS}`}>{label}</p> : null}
            <MultiSelect
                placeholder={placeholder}
                data={processedData?.filter(v => (v[textField] !== undefined && v[textField] !== null ? v[textField].includes(searchInput) : false))}
                onChange={handleMultiSelectChange}
                dataItemKey={dataItemKey}
                // defaultValue={defaultItemValue}
                textField={textField}
                operator={operator}
                required={required}
                validationMessage={message.searchFieldValidationMessage}
                listNoDataRender={()=>{
                    return (<div className="k-nodata">
                        <div>데이터가 없습니다.</div>
                    </div>)
                }}
            />
        </Fragment>
    );
};

export default SearchFieldMultiSelect;

SearchFieldMultiSelect.propTypes = {
    parentProps : PropTypes.object.isRequired,
    textField : PropTypes.string.isRequired,
}