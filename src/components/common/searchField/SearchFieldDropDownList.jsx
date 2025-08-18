import { useEffect, useState } from "react";
import CustomDropDownList from "@/components/kendo/CustomDropDownList.jsx";

/**
 * 조회부 comboBox
 * ---custom props------------------------
 * @param mutation
 * @param payload
 * @param parentProps
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
const SearchFieldDropDownList = ({dataItemKey
                                     , textField
                                     , parentProps
                                     , mutation
                                     , payload
                                     , data
                                     , id
                                     , essential = false // 필수여부
                                     , label
                                     , operator
                                     , defaultItemValue /*value값만 넘겨야함*/
                                     , allPossible = false // "전체"사용여부
                                     , ...props}) => {
    // console.log('defaultItemValue, parentProps', defaultItemValue, parentProps)

    const [fetchData, setFetchData] = useState([]);

    const _fieldName = id ?? dataItemKey;
    const _operator = operator ?? "eq";

    const defaultItem = !defaultItemValue ? _fieldName && textField ? { [_fieldName]: null, [textField]: allPossible?"전체":"미선택" } : undefined : undefined;

    /* textField값이 null일 경우 필터링하여 제외 (드롭다운리스트 클릭 시 화면 오류나서 임시) */
    const filteredData = fetchData.filter(item => item[textField] !== null);

    // 필수필터링
    useEffect(()=>{
        if(essential)
            parentProps.essentialFilterAdd({field: _fieldName, name: label});
    }, [])

    useEffect(() => {
        if (mutation) {
            mutation
                .mutateAsync(payload ?? {})
                .then((res) => {
                    setFetchData(res?.items?.map((item) => item) ?? []);
                });
        }
    }, []);

    useEffect(() => {
        if(defaultItemValue) {
            parentProps.defaultFilterChange({ field: _fieldName, operator: _operator, value: defaultItemValue});
        }
    }, []);

    const handleComboBoxOnChange = (e, parentProps) => {

        //값이 이미 있으면 바꿔치기. 값이 없어지면 obejct에서 삭제.
        const value = e.target.value;

        if (value) {

            if(props.eventCode === true) {
                props.setEventCode(value?.[dataItemKey]);
            }

            return parentProps.filterChange({ field: _fieldName, operator: _operator, value: value?.[dataItemKey]});
        } else {
            return parentProps.clearFilter(_fieldName);
        }
    };

    return (
        <>
            {label? <p className={"txtTit"+(essential?" decoS":"")}>{label}</p> : null}
            <CustomDropDownList
                placeholder={"전체"}
                data={data ?? filteredData}
                dataItemKey={dataItemKey}
                textField={textField}
                defaultItem={defaultItem}
                defaultValue={defaultItemValue}
                onChange={(e) => handleComboBoxOnChange(e, parentProps)}
                listNoDataRender={()=>{
                    return (<div className="k-nodata">
                        <div>데이터가 없습니다.</div>
                    </div>)
                }}
                {...props}
            />
        </>
    );
};

export default SearchFieldDropDownList;
