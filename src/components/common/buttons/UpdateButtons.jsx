import { Fragment } from "react";
import { Button } from "@progress/kendo-react-buttons";

const UpdateButtons = ({parentProps, title }) => {
    ("upd", parentProps)
    return (
        <Fragment>
            <h3>{title}</h3>
            <Button onClick={parentProps.handleUpdate}>수정</Button>
            <Button onClick={parentProps.handleSave}>저장</Button>
            <Button onClick={parentProps.handleCancelButton}>취소</Button>
        </Fragment>
    );
};

export default UpdateButtons;
