import { Fragment } from "react";
import { Button } from "@progress/kendo-react-buttons";

//프로젝트 공통. 모든프로젝트 공통 아님.
//TODO del
const PopupButtons = ({ parentProps, title, ...props }) => {
    return (
        <Fragment>
            {parentProps.mode == "I" ? (
                <Fragment>
                    <h3>{title} 등록</h3>
                    <Button onClick={props.handleSave}>저장</Button>
                    <Button onClick={props.handleCancelButton}>취소</Button>
                </Fragment>
            ) : (
                <Fragment>
                    <h3>{title} 상세</h3>
                    <Button onClick={props.handleUpdate}>수정</Button>
                    <Button onClick={props.handleSave}>저장</Button>
                    <Button onClick={props.handleCancelButton}>취소</Button>
                </Fragment>
            )}
            {/*------------------*/}
            <a href="src/components/common/popup#" className="btnClose">
                <span className="hidden">close</span>
            </a>
            {/*--- 왜있는지모름 ---*/}
        </Fragment>
    );
};

export default PopupButtons;
