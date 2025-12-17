import { useSelector } from "react-redux";
import Login from "@/services/login/Login.jsx";
import HomePage from "@/services/homePage/HomePage.jsx";
import { Navigate, Route, Routes } from "react-router-dom";
import { Fragment, useEffect } from "react";
import { useCookies } from "react-cookie";
import PageNotFound from "@/services/aiOpenAnalysis/app/pageNotFound/PageNotFound";
import "@/common/utils/tooltip.js";

import AiOpenAnalysisRoutes from "@/services/aiOpenAnalysis";
import ManualPage from "@/services/aiOpenAnalysis/app/ManualPage";

function App() {
  const [cookies] = useCookies();
  const auth = useSelector((store) => store.auth);
  const isLoggedIn = auth?.isLogin && cookies?.TOKEN;

  return (
    <Fragment>
      <Routes>
        {/* ---------------------------
            1. 로그인 여부와 무관한 공개 페이지 (메인, 로그인)
        ---------------------------- */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/manual" element={<ManualPage />} />

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