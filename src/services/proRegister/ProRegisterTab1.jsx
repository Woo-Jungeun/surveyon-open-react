import React, { Fragment, useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { modalContext } from "@/components/common/Modal.jsx";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import ProRegisterGrid from "./ProRegisterGrid.jsx";
import { ProRegisterApi } from "./ProRegisterApi.js";

/**
 * 문항 등록 > DB (Tab 1)
 *
 * @author jewoo
 * @since 2026-09-18
 */
const ProRegisterTab1 = (props) => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const navigate = useNavigate();
    const projectnum = sessionStorage.getItem("projectnum");
    const projectname = sessionStorage.getItem("projectname");
    const pof = sessionStorage.getItem("pof") || sessionStorage.getItem("projectpof") || "";
    const server = sessionStorage.getItem("servername") || "rps";
    const isNewServer = (server || "").toUpperCase() === "NEW";

    const { enterRegisterDb } = ProRegisterApi();

    const [loading, setLoading] = useState(false);
    const [gridData, setGridData] = useState([]);
    const [hasData, setHasData] = useState(true);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        try {
            setLoading(true);

            const payload = {
                projectnum: projectnum || "",
                server: server || "rps",
                pof: pof || "",
                proname: projectname || "",
                user: auth?.user?.userId || ""
            };
            const res = await enterRegisterDb.mutateAsync(payload);
            const isSuccess = String(res?.success) === '200' || String(res?.success) === '777';
            if (isSuccess) {
                const msg = res?.resultjson?.message || res?.message || "오픈데이터가 성공적으로 등록되었습니다.";
                modal.showConfirm("알림", msg, {
                    btns: [{
                        title: "확인",
                        click: () => {
                            if (props.onSuccess) {
                                props.onSuccess();
                            } else {
                                navigate("/ai_open_analysis/pro_list");
                            }
                        }
                    }],
                });
            } else {
                const errorMsg = res?.resultjson?.message || res?.message || "등록 중 오류가 발생했습니다.";
                modal.showErrorAlert("알림", errorMsg);
            }
        } catch (err) {
            console.error(err);
            modal.showErrorAlert("알림", "네트워크 오류로 등록에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div style={{ flex: 1, minHeight: 0, marginBottom: "20px", overflow: "hidden" }}>
                <ProRegisterGrid data={gridData} setData={setGridData} onDataLength={(cnt) => setHasData(cnt > 0)} />
            </div>

            {/* 폼 영역: 고정 높이 */}
            <div style={{ flex: "0 0 auto" }}>
                <form onSubmit={handleSubmit}>
                    <div className="pro-register-form-wrap" style={{
                        maxWidth: "800px",
                        margin: "0 auto",
                        border: "1px solid #bbb",
                        borderRadius: "8px",
                        padding: "24px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        backgroundColor: "#fff"
                    }}>
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
                                disabled={loading || (!isNewServer && !hasData)}
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
                                color: (isNewServer || hasData) ? "#666" : "#ff4646",
                                fontSize: "13px",
                                lineHeight: "1.4"
                            }}>
                                {(isNewServer || hasData)
                                    ? "문항추가, 응답자 데이터 추가는 자동으로 등록합니다."
                                    : "데이터맵이 등록되지 않았습니다. 웹 제작 담당자에게 문의 및 데이터맵을 저장해 주세요."}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProRegisterTab1;
