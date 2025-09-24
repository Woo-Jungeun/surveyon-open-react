import React, { useState, useContext } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { useSelector } from "react-redux";
import { ProEnterApi } from "@/components/app/proEnter/ProEnterApi";
import { modalContext } from "@/components/common/Modal.jsx";
import { useNavigate } from "react-router-dom";

/**
 * 프로젝트 등록 > 신규등록
 *
 * @author jewoo
 * @since 2025-09-24<br />
 */
const ProEnterTab3 = () => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const navigate = useNavigate();

    const { proEnterSaveData } = ProEnterApi();

    const [pof, setPof] = useState("");
    const [projectname, setProjectname] = useState("");
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

            const res = await proEnterSaveData.mutateAsync(payload);
            if (res?.success === "777") {
                modal.showAlert("알림", "프로젝트가 등록되었습니다.");
                navigate("/"); //프로젝트 목록 페이지로 이동
            } else if (res?.success === "765") {
                // 중복
                modal.showErrorAlert("알림", "이미 등록된 프로젝트 입니다.");
            } else {
                modal.showErrorAlert("에러", "등록 중 오류가 발생했습니다.");
            }
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
                        <span className="iptTit">등록자</span>
                        <Input
                            className="k-input k-input-solid"
                            value={auth?.user?.userNm || ""}
                            disabled
                        />
                    </div>

                    <div className="cmn_pop_ipt">
                        <span className="iptTit">POF</span>
                        <Input
                            className="k-input k-input-solid"
                            value={pof}
                            onChange={(e) => setPof(e.target.value)}
                            disabled={loading}
                            placeholder="프로젝트 번호 입력"
                        />
                    </div>

                    <div className="cmn_pop_ipt">
                        <span className="iptTit">조사명</span>
                        <Input
                            className="k-input k-input-solid"
                            value={projectname}
                            onChange={(e) => setProjectname(e.target.value)}
                            disabled={loading}
                            placeholder="조사명 입력"
                        />
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


export default ProEnterTab3;
