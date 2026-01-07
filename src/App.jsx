import { useSelector } from "react-redux";
import Login from "@/services/login/Login.jsx";
import HomePage from "@/services/homePage/HomePage.jsx";
import { Navigate, Route, Routes } from "react-router-dom";
import { Fragment } from "react";
import { useCookies } from "react-cookie";
import PageNotFound from "@/services/aiOpenAnalysis/app/pageNotFound/PageNotFound";
import "@/common/utils/tooltip.js";

import AiOpenAnalysisRoutes from "@/services/aiOpenAnalysis";
import ManualPage from "@/services/aiOpenAnalysis/app/ManualPage";
import ExcelGuidePage from "@/services/aiOpenAnalysis/app/proRegister/ExcelGuidePage";
import MainLayout from "@/layouts/MainLayout";
import BoardList from "@/services/board/BoardList";
import BoardDetail from "@/services/board/BoardDetail";
import BoardWrite from "@/services/board/BoardWrite";

function App() {
  const [cookies] = useCookies();
  const auth = useSelector((store) => store.auth);
  const isLoggedIn = auth?.isLogin && cookies?.TOKEN;

  return (
    <Fragment>
      <Routes>
        {/* ---------------------------
            1. 로그인 여부와 무관한 공개 페이지 (메인, 로그인)
            및 로그인된 내부 페이지 - MainLayout 적용 (Global CSS 포함)
        ---------------------------- */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/board/notice" element={<BoardList type="notice" />} />
          <Route path="/board/patchnote" element={<BoardList type="patchnote" />} />
          <Route path="/board/:type/write" element={<BoardWrite />} />
          <Route path="/board/:type/write/:id" element={<BoardWrite />} />
          <Route path="/board/:type/:id" element={<BoardDetail />} />

          {/* -----------------------------------
              2. 로그인된 경우만 접근 가능한 내부 페이지
          ------------------------------------ */}
          {isLoggedIn ? (
            <>
              <Route path="/ai_open_analysis/*" element={<AiOpenAnalysisRoutes />} />
            </>
          ) : (
            // 로그인 안 되어 있는데 내부 메뉴 접근 시 → /login 으로 이동
            <Route path="/ai_open_analysis/*" element={<Navigate to="/login" replace />} />
          )}

          {/* 404 처리 */}
          <Route path="*" element={<PageNotFound />} />
        </Route>

        {/* ---------------------------
            3. 독립적인 페이지 (Global CSS 미적용)
        ---------------------------- */}
        <Route path="/manual" element={<ManualPage />} />
        <Route path="/excel_guide" element={<ExcelGuidePage />} />
      </Routes>
    </Fragment>
  );
}

export default App;