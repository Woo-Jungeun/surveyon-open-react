import { getSelectedState } from "@progress/kendo-react-grid";
import {useCallback} from "react";
import { getter } from "@progress/kendo-react-common";
import PropTypes from "prop-types";
import {TreeList} from "@progress/kendo-react-treelist";
import DetailButton from "@/components/common/grid/DetailButton.jsx";
/**
 * GridData와 함께 사용하는 KendoGrid 묶음.
 *
 *
 * @author jisu
 * @since 2024.04.30
 * -----------custom props-----------
 * @param parentProps 상위(gridData)에서 넘겨준 데이터를 props로 넘겨주어야 한다.
 * @param data treelist data의 포맷등을 변경할 때 쓸 수 있는 callback
 * ----------------------------------
 * @param onExpandChange 메뉴 클릭 확장 이벤트 핸들러
 * @param dataItemKey
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
const MenuTreeList = ({ parentProps, data, onExpandChange, dataItemKey, expanded, ...props }) => {
    const selectedState = parentProps.selectedState;
    const selectedField = parentProps.selectedField;    //"selected"
    const setSelectedState = parentProps.setSelectedState;
    const idGetter = getter(dataItemKey);
    const onSelectionChange = (event) => {
        const newSelectedState = getSelectedState({
            event,
            selectedState: selectedState,
            dataItemKey: dataItemKey
        });
        setSelectedState(newSelectedState);
    };

    const onHeaderSelectionChange = useCallback((event) => {
        const checkboxElement = event.syntheticEvent.target;
        const checked = checkboxElement.checked;
        const newSelectedState = {};
        event.dataItems.forEach((item) => {
            newSelectedState[idGetter(item)] = checked;
        });
        setSelectedState(newSelectedState);
    }, []);

    /**
     * 커스텀 셀 컴포넌트
     **/
    const customCell = (cellProps) => {
        return (
            <DetailButton gridProps={parentProps} cellProps={cellProps}/>
        )
    }

    /**
     * 칼럼 변수
     */
    const columns = [
        {
            field: "menuName",
            title: "메뉴명",
            expandable: true,
            width: "20%",
        },
        {
            field: "menuId",
            title: "메뉴 ID",
            width: "10%",
        },
        {
            field: "useYn",
            title: "사용여부",
            width: "5%",
        },
        {
            field: "menuUrl",
            title: "URL",
            width: "20%",
        },
        {
            field: "remark",
            title: "비고",
            width: "20%",
        },
        {
            field: "custom",
            title: "상세",
            width: "20%",
            editCell: customCell,
        },
    ];

    /**
     * 조회 조건에 해당되는 메뉴명 색상 변경
     */
    const rowRender = (row, props) => {
        let color = '#fff';
        expanded?.map((item)=>{
            if(item.menuId === props.dataItem.menuId){
                color = '#eafae5';
            }
        })
        let style = { ...row.props.style, backgroundColor: color };
        return <tr {...row.props} style={style}></tr>;
    };

    return (
        <TreeList
            data={data}
            editField={"menuId"}
            expandField={"expanded"}
            subItemsField={"childMenu"}
            dataItemKey={dataItemKey}
            onExpandChange={onExpandChange}
            columns={columns}
            selectedField={selectedField}
            selectable={{ enabled: true, mode: "single", drag: false, cell: false }}
            onSelectionChange={onSelectionChange}
            onHeaderSelectionChange={onHeaderSelectionChange}
            rowRender={rowRender}
            {...props}
        />
    );
};

export default MenuTreeList;

MenuTreeList.propTypes = {
    parentProps: PropTypes.object.isRequired
}
