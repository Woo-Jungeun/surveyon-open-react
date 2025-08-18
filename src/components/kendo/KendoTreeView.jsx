import { handleTreeViewCheckChange, processTreeViewItems, TreeView } from "@progress/kendo-react-treeview";
import { useEffect, useState } from "react";
import PropTypes from "prop-types";

/**
 * mutation못넘기게되어있음..지금은...
 *-----------custom param------------
 * @param mode "read" | "write"
 * read : disabled 모드.
 * write: disabled가 풀림.
 * @param idField
 * @param processDataRef processData를 상위로 꺼내올때 사용*
 * ----------------------------------
 * @param data
 * @param textField
 * @param props
 * @returns {JSX.Element}
 * @constructor
 *
 */
const KendoTreeView = ({ idField, data, textField, processDataRef, mode, defaultCheck, defaultExpand, ...props }) => {
    const [check, setCheck] = useState(defaultCheck ?? []);
    const [expand, setExpand] = useState(defaultExpand ?? []);
    const [select, setSelect] = useState([""]);
    const [originData, setOriginData] = useState(data ?? []);


    const processData = processTreeViewItems(originData, {
        select: select,
        check: check,
        expand: expand
    });

    useEffect(() => {
        setOriginData(data);
    }, [data]);

    useEffect(() => {
        if(processDataRef) {
            processDataRef.current = processData;
        }
    }, [processData])

    const onItemClick = (event) => {
        setSelect([event.itemHierarchicalIndex]);
        onCheckChange(event);
    };
    const onExpandChange = (event) => {
        const ids = expand.ids ? expand.ids.slice() : [];
        const index = ids.indexOf(event.item[idField]);
        index === -1 ? ids.push(event.item[idField]) : ids.splice(index, 1);
        setExpand({
            ids,
            idField: idField
        });
    };

    const onCheckChange = (event) => {
        const settings = {
            singleMode: false,
            checkChildren: true,
            checkParents: false
        };
        setCheck(handleTreeViewCheckChange(event, check, originData, settings));
    };

    return (
        <TreeView
            textField={textField ?? idField}
            data={processData}
            childrenField={"items"}
            checkField={"checked"}
            expandIcons={true}
            onExpandChange={onExpandChange}
            aria-multiselectable={true}
            onItemClick={mode == "read" ? null : onItemClick}
            onCheckChange={mode == "read" ? null : onCheckChange}
            checkboxes={false}
            {...props}
        />
    );
};

KendoTreeView.propTypes = {
    idField: PropTypes.string.isRequired
};

export default KendoTreeView;
