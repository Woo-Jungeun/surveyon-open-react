import { Routes, Route, Navigate } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import AdditionalWrapperView from "./views/analysis/AdditionalWrapperView.jsx";
import MenuPermissionWrapperView from "./views/hsrt/MenuPermissionWrapperView.jsx";
import AddQuestionWrapperView from "./views/hsrt/AddQuestionWrapperView.jsx";
import DpRequestWrapperView from "./views/hsrt/DpRequestWrapperView.jsx";
import AiReportWrapperView from "./views/hsrt/AiReportWrapperView.jsx";
import SingleCrosstabViewerPage from "./app/hsrt/aiReport/SingleCrosstabViewerPage.jsx";

import CrossAnalysisWrapperView from "./views/hsrt/CrossAnalysisWrapperView.jsx";
import HsrtGateway from "./app/hsrt/HsrtGateway.jsx";
import "./app/DataStatusTheme.css"; // Global Theme Import

export default function DataStatusRoutes() {
  return (
    <Routes>
      {/* 팝업 전용 단독 뷰어 라우트 (MenuBar/Footer 프레임 제외) */}
      <Route path="hsrt/crosstab_viewer" element={<SingleCrosstabViewerPage />} />

      {/* 기본 Wrapper */}
      <Route element={<MainWrapperView />}>
        {/* 기본 진입 시 스터브 세팅 여부에 따라 동적 분기(교차분석 vs DP의뢰서 표설정) */}
        <Route path="" element={<HsrtGateway />} />
        <Route path="hsrt" element={<HsrtGateway />} />
        <Route path="hsrt/additional_analysis" element={<AdditionalWrapperView />} />
        <Route path="hsrt/menu_permission" element={<MenuPermissionWrapperView />} />
        {/* 신규 H-SRT 라우트 */}
        <Route path="hsrt/add_question" element={<AddQuestionWrapperView />} />
        <Route path="hsrt/dp_request" element={<DpRequestWrapperView />} />
        <Route path="hsrt/ai_report" element={<AiReportWrapperView />} />

        <Route path="hsrt/cross_analysis" element={<CrossAnalysisWrapperView />} />
      </Route>

    </Routes>
  );
}
