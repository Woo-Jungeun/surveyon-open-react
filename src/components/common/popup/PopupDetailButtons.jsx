import { Fragment } from "react";
import { Button } from "@progress/kendo-react-buttons";
import PropTypes from "prop-types";

//프로젝트 공통. 모든프로젝트 공통 아님.
const PopupDetailButtons = ({parentProps, handleCancelButton, handleUpdate, formId,  ...props}) => {
    return (
        <Fragment>
            {parentProps.mode == "R"
                ? <Button className={"btnL"} themeColor={"primary"} onClick={handleUpdate ?? parentProps.handleUpdate}>수정</Button>
                :<>
                    <Button className={"btnL btnTxt type01"}
                                      onClick={handleCancelButton ?? parentProps.handleCancelButton}>취소</Button>
                    <Button type={"submit"} form={formId} className={"btnL"} themeColor={"primary"}>저장</Button>
                </>
            }
        </Fragment>
    );
};

PopupDetailButtons.propTypes = {
    parentProps: PropTypes.object.isRequired
}

export default PopupDetailButtons;
