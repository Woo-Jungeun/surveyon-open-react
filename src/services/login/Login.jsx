import { useState, useCallback, useContext, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, Mail, Lock, ArrowLeft, Sparkles } from "lucide-react";
import "@/services/login/Login.css";
import { Input } from "@progress/kendo-react-inputs";
import { modalContext } from "@/components/common/Modal.jsx";
import { LoginApi } from "@/services/login/LoginApi.js";
import { useSelector } from "react-redux";
import { useCookies } from "react-cookie";

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({
        user: localStorage.getItem("savedId") || "",
        pass: ""
    });
    //체크박스 상태
    const [isSavedId, setIsSavedId] = useState(formData.user !== null && formData.user !== "");
    const modal = useContext(modalContext);
    const { loginMutation, loginCsMutation } = LoginApi();

    const auth = useSelector((store) => store.auth);
    const [cookies] = useCookies();

    // 고객 브라우저로 한 번 로그인한 이력이 있다면, 다른 로그인 화면 등 접근 시 고객 전용 로그인으로 막음
    useEffect(() => {
        // 이미 로그인된 상태에서 /login 또는 /cs 에 접근하면 바로 메인화면으로 리다이렉트
        const isLoggedIn = auth?.isLogin && cookies?.TOKEN;
        if (isLoggedIn) {
            const isCustomer = sessionStorage.getItem("groupcode") === "999999991";
            let targetPath = "/";
            if (isCustomer) {
                targetPath = "/data_status";
                const showmenu = sessionStorage.getItem("showmenu");
                if (showmenu) {
                    const firstMenuLabel = showmenu.split(",")[0].replace(/\s+/g, "");
                    const menuPathMap = {
                        "빈도분석": "/data_status/analysis/additional",
                        "배너설정": "/data_status/analysis/additional",
                        "교차분석": "/data_status/analysis/cross",
                        "추가분석": "/data_status/analysis/additional",
                        "쿼터현황/관리": "/data_status/analysis/quota",
                        "AI분석": "/data_status/ai/analysis",
                        "AI리포트": "/data_status/ai/report",
                        "변수생성": "/data_status/setting/recoding",
                        "DP의뢰서정의": "/data_status/setting/dp_definition",
                        "가중치생성": "/data_status/setting/weight",
                    };
                    if (menuPathMap[firstMenuLabel]) {
                        targetPath = menuPathMap[firstMenuLabel];
                    }
                }
            }
            navigate(targetPath, { replace: true });
            return;
        }
    }, [location.pathname, navigate, auth, cookies]);

    /**
     * 로그인 API
     *
     * @author JungEun Woo
     * @since 2024-04-09<br />
     */
    const handleLogin = async (e) => {
        e.preventDefault();
        const payload = {
            user: formData.user,
            pass: formData.pass
        };

        const result = location.pathname === "/cs"
            ? await loginCsMutation.mutateAsync({
                user: formData.user
            })
            : await loginMutation.mutateAsync({
                user: formData.user,
                pass: formData.pass
            });

        // cs 로그인의 경우 응답에 success: '777'이 없이 올 수 있으므로 토큰이나 메시지 여부로 성공을 판별합니다.
        const isSuccess = result?.success === "777" || result?.token || result?.loginkey || result?.message === "로그인 성공 (고객 인증)";

        if (isSuccess) {
            // 아이디 기억하기
            if (isSavedId) {
                localStorage.setItem("savedId", formData.user);
            }
            // 로그인 성공 시 navigate는 LoginApi.onSuccess에서 처리
        } else {
            modal.showErrorAlert("에러", result?.message || "로그인 정보를 확인할 수 없습니다."); //오류 팝업 표출
        }
    };

    /**
      * 아이디 기억하기 버튼 클릭 이벤트 Handler
      *
      * @author JungEun Woo
      * @since 2024-04-18<br />
      */
    const onCheckSavedId = useCallback(() => {
        if (isSavedId) {
            localStorage.removeItem("savedId");
        }
        setIsSavedId(!isSavedId);
    }, [isSavedId]);

    return (
        <div className="login-bg-gradient">
            <div className="dot-pattern"></div>

            {/* 뒤로가기 버튼 */}
            {location.pathname !== "/cs" && (
                <div className="login-back-area">
                    <button className="login-back-button" onClick={() => navigate('/')}>
                        <ArrowLeft size={16} />
                        홈으로
                    </button>
                </div>
            )}

            <div className="login-center">
                <div className="login-card-wrap">

                    {/* 로고 */}
                    <div className="login-logo-box">
                        <Sparkles className="w-5 h-5 text-white" />
                        <h1 className="hero-title">설문온</h1>
                    </div>
                    <p className="login-subtitle">AI 기반 통합 설문조사 플랫폼</p>

                    {/* 로그인 카드 */}
                    <div className="login-card">

                        <div className="login-title-wrap">
                            <div className="login-icon-circle">
                                <LogIn className="w-5 h-5 text-white" />
                            </div>
                            <h2>로그인</h2>
                        </div>
                        <p className="login-title-sub">계정에 로그인하여 모든 기능을 이용하세요.</p>

                        <form onSubmit={handleLogin} className="login-form">
                            <div className="login-field">
                                <label>아이디</label>
                                <div className="login-input-wrap">
                                    <Mail className="input-icon" />
                                    <input
                                        type="text"
                                        className="login-input"
                                        placeholder="아이디를 입력하세요."
                                        value={formData.user}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, user: e.target.value }))
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            {location.pathname !== "/cs" && (
                                <div className="login-field">
                                    <label>비밀번호</label>
                                    <div className="login-input-wrap">
                                        <Lock className="input-icon" />
                                        <input
                                            type="password"
                                            className="login-input"
                                            placeholder="비밀번호를 입력하세요."
                                            value={formData.pass}
                                            onChange={(e) =>
                                                setFormData((prev) => ({ ...prev, pass: e.target.value }))
                                            }
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="loginBtm">
                                <input
                                    type="checkbox"
                                    id="chk_01"
                                    className="loginChk"
                                    checked={isSavedId}
                                    onChange={onCheckSavedId}
                                />
                                <label htmlFor="chk_01">아이디 기억하기</label>
                            </div>

                            <button type="submit" className="login-button">
                                <LogIn className="w-5 h-5" />
                                로그인
                            </button>
                        </form>
                    </div>

                    <div className="login-bottom-menu">
                        <span>설문제작</span>
                        <span>•</span>
                        <span>데이터분석</span>
                        <span>•</span>
                        <span>AI보고서</span>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Login;
