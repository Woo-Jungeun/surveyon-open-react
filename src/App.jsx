import { useSelector } from "react-redux";
import Login from "@/services/login/Login.jsx";
import HomePage from "@/services/homePage/HomePage.jsx";
import { Navigate, Route, Routes } from "react-router-dom";
import { Fragment, useEffect } from "react";
import { useCookies } from "react-cookie";
import PageNotFound from "@/services/aiOpenAnalysis/app/pageNotFound/PageNotFound";
import busGif from "@/assets/images/bus_loading.gif";
import "@/common/utils/tooltip.js";

import AiOpenAnalysisRoutes from "@/services/aiOpenAnalysis";
function App() {
  const [cookies] = useCookies();
  const auth = useSelector((store) => store.auth);
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = busGif; // Vite가 빌드 시 해시가 붙은 실제 URL로 변환됨
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const isLoggedIn = auth?.isLogin && cookies?.TOKEN;

  return (
    <Fragment>
      <Routes>
        {/* ---------------------------
            1. 로그인 여부와 무관한 공개 페이지 (메인, 로그인)
        ---------------------------- */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />

        {/* -----------------------------------
            2. 로그인된 경우만 접근 가능한 내부 페이지
        ------------------------------------ */}
        {isLoggedIn ? (
          <>
            <Route path="/ai_open_analysis/*" element={<AiOpenAnalysisRoutes />} />
          </>
        ) : (
          // 로그인 안 되어 있는데 내부 메뉴 접근 시 → /login 으로 이동
          <Route path="/*" element={<Navigate to="/login" replace />} />
        )}

        {/* 404 처리 */}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Fragment>
  );
}

export default App;