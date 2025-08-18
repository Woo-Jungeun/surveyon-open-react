import {Button} from "@progress/kendo-react-buttons";
import {useNavigate} from "react-router-dom";

const PageNotFound = () => {
    const navigate = useNavigate()

    return (
        <section className="cmn_err_wrap">
            <div className="errTxtL">
                404 Error
            </div>
            <div className="errTxtWrap">
                <p className="errTxtM">일시적인 오류가 발생했습니다.</p>
                <p className="errTxtS">네트워크를 확인하거나, 잠시 후에 다시 시도해주세요.</p>
            </div>
            <Button themeColor={"primary"} className="btnTxt" onClick={() => { navigate(-1) }}>이전 페이지로</Button>
            {/*<p className="errTxtS">담당자 : 010-9999-9999 (필요시)</p>*/}
        </section>
    );
};

export default PageNotFound;
