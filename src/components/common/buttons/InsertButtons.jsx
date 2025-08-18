import { Fragment } from "react";
import { Button } from "@progress/kendo-react-buttons";

const InsertButtons = ({parentProps, title }) => {
    return (
        <Fragment>
            <h3>{title}</h3>
            <Button onClick={parentProps.handleSave}>저장</Button>
            <Button onClick={parentProps.handleCancelButton}>취소</Button>
            {/*------------------*/}
            <a href="src/components/common/popup#" className="btnClose">
                <span className="hidden">close</span>
            </a>
            {/*--- 왜있는지모름 ---*/}
        </Fragment>
    );
};

export default InsertButtons;
