import React, { useState, useContext } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { useSelector } from "react-redux";
import { ProEnterApi } from "@/services/aiOpenAnalysis/app/proEnter/ProEnterApi";
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
                modal.showConfirm("알림", "프로젝트가 등록되었습니다.", {
                    btns: [{
                        title: "확인", click: () => {
                            sessionStorage.setItem("projectnum", "");
                            sessionStorage.setItem("projectname", "");
                            sessionStorage.setItem("servername", "");
                            sessionStorage.setItem("projectpof", "");
                            navigate("/ai_open_analysis"); //프로젝트 목록 페이지로 이동
                        }
                    }],   ////문항 목록 페이지로 이동
                });
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
        <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            paddingTop: '40px',
            width: 'auto'
        }}>
            <form onSubmit={handleSubmit} style={{
                width: '600px',
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0', marginBottom: '10px' }}>
                    <h3 style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#333',
                        marginBottom: '8px',
                    }}>
                        신규 프로젝트 등록
                    </h3>
                    <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                        필수 정보를 입력하여 새로운 프로젝트를 등록하세요.
                    </p>
                </div>

                {/* Form Inputs */}
                <div className="cmn_pop_ipt" style={{ flexDirection: 'column', gap: '8px' }}>
                    <span className="iptTit" style={{ width: '100%', marginBottom: '4px', color: '#333', fontWeight: '500' }}>등록자</span>
                    <Input
                        className="k-input k-input-solid"
                        value={auth?.user?.userNm || ""}
                        disabled
                        style={{ width: '100%', height: '40px', background: '#f5f5f5', border: '1px solid #ddd' }}
                    />
                </div>

                <div className="cmn_pop_ipt" style={{ flexDirection: 'column', gap: '8px' }}>
                    <span className="iptTit" style={{ width: '100%', marginBottom: '4px', color: '#333', fontWeight: '500' }}>POF <span style={{ color: '#ff5252' }}>*</span></span>
                    <div style={{ width: "100%" }}>
                        <Input
                            className="k-input k-input-solid"
                            value={pof}
                            onChange={(e) => setPof(e.target.value)}
                            disabled={loading}
                            placeholder="프로젝트 번호를 입력해주세요. (예: 2025-00-0000)"
                            style={{ width: "100%", height: '40px' }}
                        />
                        <div style={{
                            fontSize: "12px",
                            color: "#888",
                            marginTop: "6px",
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <span style={{ color: '#ff8024' }}>※</span> POF가 없을 경우 2025-00-0000 포맷에 맞춰 부서 공용 POF를 입력
                        </div>
                    </div>
                </div>

                <div className="cmn_pop_ipt" style={{ flexDirection: 'column', gap: '8px' }}>
                    <span className="iptTit" style={{ width: '100%', marginBottom: '4px', color: '#333', fontWeight: '500' }}>조사명 <span style={{ color: '#ff5252' }}>*</span></span>
                    <Input
                        className="k-input k-input-solid"
                        value={projectname}
                        onChange={(e) => setProjectname(e.target.value)}
                        disabled={loading}
                        placeholder="조사명을 입력해 주세요."
                        style={{ width: "100%", height: '40px' }}
                    />
                </div>

                {/* Submit Button */}
                <div style={{ marginTop: '10px' }}>
                    <Button
                        type="submit"
                        themeColor="primary"
                        disabled={loading}
                        style={{
                            width: '100%',
                            height: '46px',
                            fontSize: '15px',
                            fontWeight: '600',
                            borderRadius: '6px',
                            backgroundColor: '#ff8024',
                            border: 'none'
                        }}
                    >
                        {loading ? "등록 중..." : "등록하기"}
                    </Button>
                </div>
            </form>
        </div>
    );
};


export default ProEnterTab3;
