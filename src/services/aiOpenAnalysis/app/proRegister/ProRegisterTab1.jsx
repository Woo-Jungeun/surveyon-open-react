import React, { Fragment, useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { modalContext } from "@/components/common/Modal.jsx";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import ProRegisterGrid from "@/services/aiOpenAnalysis/app/proRegister/ProRegisterGrid.jsx";
import { ProRegisterApi } from "@/services/aiOpenAnalysis/app/proRegister/ProRegisterApi.js";

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
    const { proRegisterMutation } = ProRegisterApi();

    const [loading, setLoading] = useState(false);
    const [gridData, setGridData] = useState([]);
    const [hasData, setHasData] = useState(true);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        try {
            setLoading(true);

            const payload = {
                params: {
                    gb: "db_enter",
                    user: auth?.user?.userId || "",
                    projectnum
                }
            };

            const res = await proRegisterMutation.mutateAsync(payload);
            if (res?.success === "777") {
                modal.showConfirm("알림", "문항이 등록되었습니다.", {
                    btns: [{ title: "확인", click: () => navigate("/ai_open_analysis/pro_list") }],
                });
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
        <Fragment>
            {/* 그리드 */}
            <div style={{ marginBottom: "20px" }}>
                <ProRegisterGrid data={gridData} setData={setGridData} onDataLength={(cnt) => setHasData(cnt > 0)} />
            </div>

            {/* 정보 */}
            <form onSubmit={handleSubmit}>
                <div className="pro-register-form-wrap">
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#333"
                        }}>
                            웹프로젝트명
                        </label>
                        <Input
                            className="k-input k-input-solid"
                            value={projectnum || ""}
                            disabled
                            style={{ width: "100%" }}
                        />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#333"
                        }}>
                            조사명
                        </label>
                        <Input
                            className="k-input k-input-solid"
                            value={projectname || ""}
                            disabled
                            style={{ width: "100%" }}
                        />
                    </div>

                    <div style={{ textAlign: "center" }}>
                        <Button
                            type="submit"
                            className="btnL"
                            themeColor="primary"
                            disabled={loading || !hasData}
                            style={{
                                minWidth: "180px",
                                height: "44px",
                                fontSize: "15px",
                                fontWeight: "600"
                            }}
                        >
                            {loading ? "등록 중..." : "등록"}
                        </Button>

                        <div style={{
                            marginTop: "12px",
                            color: hasData ? "#666" : "#ff4646",
                            fontSize: "13px",
                            lineHeight: "1.4"
                        }}>
                            {hasData
                                ? "문항추가, 응답자 데이터 추가를 자동으로 등록합니다."
                                : "데이터맵이 등록되지 않았습니다. 웹 제작 담당자에게 문의 및 데이터맵을 저장해 주세요."}
                        </div>
                    </div>
                </div>
            </form>
        </Fragment>
    );
};
export default ProRegisterTab1;
