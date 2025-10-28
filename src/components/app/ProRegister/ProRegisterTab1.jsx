import React, { Fragment, useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { modalContext } from "@/components/common/Modal.jsx";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import ProRegisterGrid from "@/components/app/proRegister/ProRegisterGrid.jsx";
import { ProRegisterApi } from "@/components/app/proRegister/ProRegisterApi.js";

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
                    btns: [{ title: "확인", click: () => navigate("/pro_list") }],   ////문항 목록 페이지로 이동
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
            <ProRegisterGrid data={gridData} setData={setGridData} onDataLength={(cnt) => setHasData(cnt > 0)} />

            {/* 정보 */}
            <form onSubmit={handleSubmit}>
                <div className="popCont">
                    <div className="popTbl">
                        <div className="cmn_pop_ipt">
                            <span style={{ width: "200px" }}>웹프로젝트명</span>
                            <Input
                                className="k-input k-input-solid"
                                value={projectnum || ""}
                                disabled
                            />
                        </div>

                        <div className="cmn_pop_ipt">
                            <span style={{ width: "200px" }}>조사명</span>
                            <Input
                                className="k-input k-input-solid"
                                value={projectname || ""}
                                disabled
                            />
                        </div>
                    </div>
                </div>

                <div
                    className="popBtn"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center", // 수평 가운데 정렬
                        justifyContent: "center", // 수직 가운데 정렬
                        marginTop: "20px",
                    }}
                >
                    <div className="btnWrap" style={{ textAlign: "center" }}>
                        <Button
                            type="submit"
                            className="btnL"
                            themeColor="primary"
                            disabled={loading || !hasData}
                        >
                            등록
                        </Button>
                    </div>
                </div>
                <div
                    style={{
                        marginTop: "12px",
                        textAlign: "center",
                        color: "#555",
                        fontSize: "14px",
                    }}
                >
                    {hasData
                        ? "문항추가, 응답자 데이터 추가를 자동으로 등록합니다."
                        : "데이터맵이 등록되지 않았습니다. 웹 제작 담당자에게 문의 및 데이터맵을 저장해 주세요."}
                </div>
            </form>
        </Fragment>
    );
};
export default ProRegisterTab1;
