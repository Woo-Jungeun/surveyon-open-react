import React, { Fragment, useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { modalContext } from "@/components/common/Modal.jsx";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
/**
 * 문항 등록 > DB
 *
 * @author jewoo
 * @since 2025-09-29<br />
 */
const ProRegisterTab1 = (props) => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const navigate = useNavigate();
    const projectnum = sessionStorage.getItem("projectnum");
    const projectname = sessionStorage.getItem("projectname");
    //  const { proEnterSaveData } = ProEnterApi();

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        // --- 유효성 검사 ---
        const pofTrim = String(pof ?? "").trim();
        const nameTrim = String(projectname ?? "").trim();

        const errs = [];
        if (!pofTrim) errs.push("POF(프로젝트번호)를 입력해 주세요.");
        if (!nameTrim) errs.push("조사명을 입력해 주세요.");

        if (errs.length) {
            modal.showErrorAlert("알림", errs.join("\n"));
            return;
        }

        try {
            setLoading(true);

            const payload = {
                gb: "NewProject",
                pof: pofTrim,
                projectname: nameTrim,
                user: auth?.user?.userId || "",
            };

            //    const res = await proEnterSaveData.mutateAsync(payload);
            //    if (res?.success === "777") {
            //        modal.showAlert("알림", "프로젝트가 등록되었습니다.");
            //        navigate("/"); //프로젝트 목록 페이지로 이동
            //        sessionStorage.setItem("projectnum", "");
            //        sessionStorage.setItem("projectname", "");
            //    } else if (res?.success === "765") {
            //        // 중복
            //        modal.showErrorAlert("알림", "이미 등록된 프로젝트 입니다.");
            //    } else {
            //        modal.showErrorAlert("에러", "등록 중 오류가 발생했습니다.");
            //    }
        } catch (err) {
            modal.showErrorAlert("알림", "네트워크 오류로 등록에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="popCont">
                <div className="popTbl">
                    <div className="cmn_pop_ipt">
                        <span style={{ width: "200px" }}>웹프로젝트 번호</span>
                        <Input
                            className="k-input k-input-solid"
                            value={projectnum || ""}
                            disabled
                        />
                    </div>

                    <div className="cmn_pop_ipt">
                        <span style={{ width: "200px" }}>프로젝트 명</span>
                        <Input
                            className="k-input k-input-solid"
                            value={projectname || ""}
                            disabled
                        />
                    </div>
                    <div className="cmn_pop_ipt">
                        조사 테이블에서 자동으로 문항이 추가됩니다. 아래의 등록버튼을 눌러주세요.
                    </div>

                </div>
            </div>

            <div className="popBtn">
                <div className="btnWrap">
                    <Button
                        type="submit"
                        className="btnL"
                        themeColor="primary"
                        disabled={loading}
                    >
                        등록
                    </Button>
                </div>
            </div>
        </form>
    );
};
export default ProRegisterTab1;
