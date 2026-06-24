import { Routes, Route, Navigate } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import PageSettingWrapperView from "./views/setting/PageSettingWrapperView.jsx";
import RecodingWrapperView from "./views/setting/RecodingWrapperView.jsx";
import VariableWrapperView from "./views/setting/VariableWrapperView.jsx";
import WeightWrapperView from "./views/setting/WeightWrapperView.jsx";
import FrequencyWrapperView from "./views/analysis/FrequencyWrapperView.jsx";
import AdditionalWrapperView from "./views/analysis/AdditionalWrapperView.jsx";
import QuotaWrapperView from "./views/analysis/QuotaWrapperView.jsx";
import MenuPermissionWrapperView from "./views/hsrt/MenuPermissionWrapperView.jsx";
import CrossWrapperView from "./views/analysis/CrossWrapperView.jsx";
import DataViewerPage from "./app/dataViewer/DataViewerPage.jsx";
import AddQuestionWrapperView from "./views/hsrt/AddQuestionWrapperView.jsx";
import DpRequestWrapperView from "./views/hsrt/DpRequestWrapperView.jsx";

import CrossAnalysisWrapperView from "./views/hsrt/CrossAnalysisWrapperView.jsx";
import "./app/DataStatusTheme.css"; // Global Theme Import

export default function DataStatusRoutes() {
  return (
    <Routes>

      {/* 기본 Wrapper */}
      <Route element={<MainWrapperView />}>
        <Route path="" element={<Navigate to="analysis/frequency" replace />} />
        <Route path="setting/page" element={<PageSettingWrapperView />} />
        <Route path="setting/recoding" element={<RecodingWrapperView />} />
        <Route path="setting/variable" element={<VariableWrapperView />} />
        <Route path="setting/weight" element={<WeightWrapperView />} />
        <Route path="hsrt/additional_analysis" element={<AdditionalWrapperView />} />
        <Route path="analysis/frequency" element={<FrequencyWrapperView />} />
        <Route path="analysis/cross" element={<CrossWrapperView />} />
        <Route path="analysis/quota" element={<QuotaWrapperView />} />
        <Route path="hsrt/menu_permission" element={<MenuPermissionWrapperView />} />
        {/* 신규 H-SRT 라우트 */}
        <Route path="hsrt/add_question" element={<AddQuestionWrapperView />} />
        <Route path="hsrt/dp_request" element={<DpRequestWrapperView />} />

        <Route path="hsrt/cross_analysis" element={<CrossAnalysisWrapperView />} />
      </Route>

      {/* 팝업 Wrapper */}
      <Route path="setting/viewer" element={<DataViewerPage />} />

    </Routes>
  );
}
