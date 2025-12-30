import React, { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, User, LogOut, Sparkles, BrainCircuit, Zap, BarChart3 } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useCookies } from "react-cookie";
import { persistor } from "@/common/redux/store/StorePersist.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import logoImg from "@/assets/images/logo_red.png";
import { motion } from "framer-motion";
import { logout } from "@/common/redux/action/AuthAction";
import { LoginApi } from "@/services/login/LoginApi.js";

const InfoSection = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const modal = useContext(modalContext);

  const auth = useSelector((store) => store.auth);
  const [cookies, , removeCookie] = useCookies(["TOKEN"]);

  const isLoggedIn = auth?.isLogin && cookies?.TOKEN;
  const userName = auth?.user?.userNm || "";

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { logoutMutation } = LoginApi();

  /** 로그아웃 처리 */
  const doLogout = async () => {
    modal.showConfirm("알림", "로그아웃하시겠습니까?", {
      btns: [
        { title: "취소", background: "#75849a" },
        {
          title: "로그아웃",
          click: async () => {
            try {
              // 로그아웃 api
              const res = await logoutMutation.mutateAsync({ user: auth?.user?.userId, gb: "out" });
              if (res?.success === "777") {
                dispatch(logout());
                await persistor.purge();
                removeCookie("TOKEN", { path: "/" });
                sessionStorage.setItem("projectnum", "");
                sessionStorage.setItem("projectname", "");
                sessionStorage.setItem("servername", "");
                sessionStorage.setItem("projectpof", "");
                navigate("/");
              } else {
                modal.showAlert("알림", "로그아웃을 하지 못했습니다.");
              }
            } catch {
              modal.showAlert("알림", "로그아웃을 하지 못하였습니다.");
            }
          },
        },
      ],
    });
  };

  /** 외부 클릭 시 드롭다운 닫기 */
  useEffect(() => {
    const handleClose = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, []);

  return (
    <section className="hp-hero">

      {/* 네비 */}
      <div className="hp-hero-nav">
        <div className="hp-nav-left">
          <img src={logoImg} alt="설문온 로고" className="hp-logo-img" />
          {/* <span className="hp-logo-text">설문온</span> */}
        </div>


        {/* ▣ 로그인 여부에 따른 분기 */}
        {!isLoggedIn ? (
          <button className="hp-login-btn" onClick={() => navigate("/login")}>
            <LogIn className="hp-login-icon" />
            로그인
          </button>
        ) : (
          <div className="hp-user-wrap" ref={dropdownRef}>
            {/* 사용자 버튼 */}
            <button
              type="button"
              className="hp-user-btn"
              onClick={() => setOpen((v) => !v)}
            >
              <User className="hp-user-icon" />
              <span>{userName}님</span>
            </button>

            {/* 드롭다운 */}
            {open && (
              <div className="hp-user-dropdown">
                <button className="hp-dd-item" onClick={doLogout}>
                  <LogOut size={18} />
                  <span>로그아웃</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 배경 패턴 */}
      <div className="hp-hero-bg-pattern">
        <div className="dot-pattern"></div>
      </div>

      {/* 🔵 작은 원형/타원 도형들 */}

      <div className="hp-shape" style={{
        width: "160px", height: "160px",
        top: "18%", left: "12%",
        animationDelay: "0s"
      }} />

      <div className="hp-shape" style={{
        width: "220px", height: "220px",
        top: "58%", left: "10%",
        animationDelay: "1.5s"
      }} />

      {/* 타원 (ellipse) */}
      <div className="hp-shape" style={{
        width: "260px", height: "150px",
        top: "42%", left: "30%",
        animationDelay: "1s"
      }} />

      {/* 얇은 타원 */}
      <div className="hp-shape" style={{
        width: "240px", height: "120px",
        top: "74%", left: "24%",
        animationDelay: "2.5s"
      }} />

      <div className="hp-shape" style={{
        width: "180px", height: "180px",
        top: "35%", right: "20%",
        animationDelay: "1.2s"
      }} />

      <div className="hp-shape" style={{
        width: "130px", height: "130px",
        top: "72%", right: "12%",
        animationDelay: "3.5s"
      }} />

      <div className="hp-hero-inner">

        {/* 왼쪽 텍스트 */}
        <div className="hp-hero-text">
          <div className="hp-chip">
            <Sparkles className="hp-chip-icon" />
            <span>AI 기반 설문 분석 플랫폼</span>
          </div>

          <h1 className="hp-title">설문온</h1>

          <p className="hp-subtext">
            설문 제작부터 데이터 분석까지<br />
            하나의 플랫폼에서 모든 것을 경험하세요.
          </p>

          <div className="hp-feature-list">
            <div className="hp-feature-item">
              <Sparkles className="hp-feature-icon" />
              <span>AI 기반 분석</span>
            </div>

            <div className="hp-feature-item">
              <BarChart3 className="hp-feature-icon" />
              <span>실시간 데이터</span>
            </div>

            <div className="hp-feature-item">
              <Zap className="hp-feature-icon" />
              <span>빠른 설문 제작</span>
            </div>

            <div className="hp-feature-item">
              <BrainCircuit className="hp-feature-icon" />
              <span>통합 플랫폼</span>
            </div>
          </div>

          <div className="hp-hero-buttons">
            {/* <button className="hp-btn-primary" onClick={() => navigate("/login")}>시작하기</button>
            <button className="hp-btn-outline">더 알아보기</button> */}
          </div>
        </div>

        {/* ========================
            카드 UI  
        ======================== */}
        <div className="hp-visual-area">

          {/* AI 정확도 */}
          <motion.div className="hp-card hp-card-accuracy"
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 6, repeat: Infinity }}>
            <BarChart3 className="hp-card-icon" />
            <p className="hp-card-number">98.5%</p>
            <p className="hp-card-label">AI 정확도</p>
            <div className="hp-accuracy-bar">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="hp-accuracy-unit" />
              ))}
            </div>
            <p className="hp-progress-text">정확도 98.5%</p>
          </motion.div>

          {/* AI 텍스트 분석 */}
          <motion.div className="hp-card hp-card-text"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 7, repeat: Infinity }}>
            <BrainCircuit className="hp-card-icon" />
            <p className="hp-card-number">15,240</p>
            <p className="hp-card-label">AI 텍스트 분석</p>
            <p className="hp-card-sub">※ 처리 완료</p>
          </motion.div>

          {/* 감정 분석 */}
          <motion.div className="hp-card hp-card-sentiment"
            animate={{ y: [0, -18, 0] }}
            transition={{ duration: 5.8, repeat: Infinity }}>
            <Sparkles className="hp-card-icon" />
            <p className="hp-card-number">긍정</p>
            <p className="hp-card-label">감정 분석 결과</p>

            <div className="hp-progress">
              <div className="hp-progress-fill" style={{ width: "75%" }}></div>
            </div>

            <p className="hp-progress-value">75%</p>
          </motion.div>

          {/* AI 키워드 추출 */}
          <motion.div className="hp-card hp-card-keyword"
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 6.5, repeat: Infinity }}>
            <BrainCircuit className="hp-card-icon" />
            <p className="hp-card-number">AI 키워드 추출</p>

            <div className="hp-chip-row">
              <span className="hp-chip-tag">품질</span>
              <span className="hp-chip-tag">만족</span>
              <span className="hp-chip-tag">서비스</span>
              <span className="hp-chip-tag">개선</span>
            </div>
          </motion.div>

          {/* AI 응답 요약 */}
          <motion.div className="hp-card hp-card-summary"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity }}>
            <Zap className="hp-card-icon" />
            <p className="hp-card-number">8,432</p>
            <p className="hp-card-label">AI 응답 요약</p>

            <div className="hp-progress">
              <div className="hp-progress-fill" style={{ width: "92%" }} />
            </div>
            <p className="hp-progress-text">완료 92%</p>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default InfoSection;
