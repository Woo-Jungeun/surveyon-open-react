import CustomDefaultValueDropDownList from "@/components/kendo/CustomDefaultValueDropDownList.jsx";

/**
 * 차트 내 dropDown
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
 * @author jewoo
 * @since 2024-06-04<br />
 * 1. 밖에서 data를 fetch한 후에 data를 넘겨주는 방법
 * 2. mutation을 넘겨서 컴포넌트안에서 data를 fetch하는 방법
 * 두가지가 있음.
 *
 * defaultItemValue를 세팅할 경우에는 1번의 방법만 가능.
 */
const ChartDropDownList = ({dataItemKey
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
                                    , setFilter
                                     , ...props}) => {
    const _fieldName = id ?? dataItemKey;
    const _operator = operator ?? "eq";

    const defaultItem = !defaultItemValue ? _fieldName && textField ? { [_fieldName]: null, [textField]: allPossible?"전체":"미선택" } : undefined : undefined;

    const filterChange = ({ field, operator, value }) => {
        setFilter((prev) => {
            const copy = [...prev];
            const newFilter = [];

            const idx = prev.findIndex((filter) => filter.field == field);
            if (idx == -1) {
                newFilter.push({
                    field: field,
                    operator: operator,
                    value: value
                });
            } else {
                copy[idx] = {
                    field: field,
                    operator: operator,
                    value: value
                };
            }

            return [...copy, ...newFilter];
        });
    };

    const handleComboBoxOnChange = (e, parentProps) => {

        //값이 이미 있으면 바꿔치기. 값이 없어지면 obejct에서 삭제.
        const value = e.target.value;

        if (value) {

            return filterChange({ field: _fieldName, operator: _operator, value: value?.[dataItemKey]});
        } else {
          //  return parentProps.clearFilter(_fieldName);
        }
    };

    return (
        <>
            {label? <p className={"txtTit"+(essential?" decoS":"")}>{label}</p> : null}
            <CustomDefaultValueDropDownList
                placeholder={"전체"}
                data={data}
                dataItemKey={dataItemKey}
                textField={textField}
                defaultItem={defaultItem}
                defaultValue={defaultItemValue}
                onChange={(e) => handleComboBoxOnChange(e, parentProps)}
                {...props}
            />
        </>
    );
};

export default ChartDropDownList;
