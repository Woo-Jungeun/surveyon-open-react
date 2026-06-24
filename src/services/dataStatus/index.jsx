import { Routes, Route, Navigate } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import AdditionalWrapperView from "./views/analysis/AdditionalWrapperView.jsx";
import MenuPermissionWrapperView from "./views/hsrt/MenuPermissionWrapperView.jsx";
import AddQuestionWrapperView from "./views/hsrt/AddQuestionWrapperView.jsx";
import DpRequestWrapperView from "./views/hsrt/DpRequestWrapperView.jsx";

import CrossAnalysisWrapperView from "./views/hsrt/CrossAnalysisWrapperView.jsx";
import "./app/DataStatusTheme.css"; // Global Theme Import

export default function DataStatusRoutes() {
  return (
    <Routes>

      {/* 기본 Wrapper */}
      <Route element={<MainWrapperView />}>
        <Route path="" element={<Navigate to="hsrt/add_question" replace />} />
        <Route path="hsrt/additional_analysis" element={<AdditionalWrapperView />} />
        <Route path="hsrt/menu_permission" element={<MenuPermissionWrapperView />} />
        {/* 신규 H-SRT 라우트 */}
        <Route path="hsrt/add_question" element={<AddQuestionWrapperView />} />
        <Route path="hsrt/dp_request" element={<DpRequestWrapperView />} />

        <Route path="hsrt/cross_analysis" element={<CrossAnalysisWrapperView />} />
      </Route>

    </Routes>
  );
}
