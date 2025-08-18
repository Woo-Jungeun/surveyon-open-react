import { ComboBox } from "@progress/kendo-react-dropdowns";
import { Fragment, useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";

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
 * @since 2024-05-31<br />
 * 1. 밖에서 data를 fetch한 후에 data를 넘겨주는 방법
 * 2. mutation을 넘겨서 컴포넌트안에서 data를 fetch하는 방법
 * 두가지가 있음.
 *
 * defaultItemValue를 세팅할 경우에는 1번의 방법만 가능.
 */
const SearchFieldNoOffsetFilterCombobox = ({
                                 dataItemKey,
                                 textField,
                                 parentProps,
                                 defaultItemValue,
                                 targetValue,
                                 required,
                                 label,
                                 mutation,
                                 payload,
                                 id,
                                 operator,
                                 data,
                                 ...props
                             }) => {
    const [fetchData, setFetchData] = useState([]);
    const _fieldName = id ?? dataItemKey;
    const _operator = operator ?? "eq";
    const _targetValue = targetValue ?? dataItemKey;
    const decoS = !!required === false ? "" : "decoS";
    const comboData = mutation ? fetchData : data;
    const processedComboData = comboData?.map(item => ({ ...item, [textField]: item[textField] + "" }));
    const [searchInput, setSearchInput] = useState("");

    useEffect(() => {
        if (mutation) {
            mutation.mutateAsync(payload ?? {}).then((res) => {
                //textField 컬럼의 데이터가 string이 아니면 오류남. 무조건 string으로 바꿈.
                setFetchData(res?.items ?? []);
            });
        }
    }, []);

    useEffect(() => {
        if (defaultItemValue) {
            parentProps.defaultNoOffsetFilterChange({ field: _fieldName, operator: _operator, value: defaultItemValue?.[_targetValue] });
        }
    }, [data]);

    const handleComboBoxOnChange = (e) => {
        //값이 이미 있으면 바꿔치기. 값이 없어지면 obejct에서 삭제.
        const value = e.target.value;
        if (value) {
            return parentProps.noOffsetFilterChange({ field: _fieldName, operator: _operator, value: value?.[_targetValue] });
        } else {
            return parentProps.clearNoOffsetFilter(_fieldName);
        }
    };

    const onFilterChange = useCallback((event) => {
        const filter = event.filter.value;
        setSearchInput(filter);
    }, [processedComboData]);
    return (
        <Fragment>
            {label ? <p className={`txtTit ${decoS}`}>{label}</p> : null}
            <ComboBox
                placeholder={"전체"}
                // data={processedComboData}
                data={processedComboData.filter(v => (v[textField] !== undefined && v[textField] !== null ? v[textField].includes(searchInput) : false))}
                dataItemKey={dataItemKey}
                defaultValue={defaultItemValue}
                textField={textField}
                operator={"eq"}
                filterable={true}
                onFilterChange={onFilterChange}
                onChange={(e) => handleComboBoxOnChange(e)}
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

export default SearchFieldNoOffsetFilterCombobox;

SearchFieldNoOffsetFilterCombobox.propTypes = {
    parentProps : PropTypes.object.isRequired,
    dataItemKey : PropTypes.string.isRequired,
    textField : PropTypes.string.isRequired,
}