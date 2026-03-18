import { Routes, Route, Navigate } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import RecodingWrapperView from "./views/setting/RecodingWrapperView.jsx";
import VariableWrapperView from "./views/setting/VariableWrapperView.jsx";
import WeightWrapperView from "./views/setting/WeightWrapperView.jsx";
import FrequencyWrapperView from "./views/analysis/FrequencyWrapperView.jsx";
import AdditionalWrapperView from "./views/analysis/AdditionalWrapperView.jsx";
import QuotaWrapperView from "./views/analysis/QuotaWrapperView.jsx";
import MenuPermissionWrapperView from "./views/system/MenuPermissionWrapperView.jsx";
import DataViewerPage from "./app/dataViewer/DataViewerPage.jsx";
import "./app/DataStatusTheme.css"; // Global Theme Import

export default function DataStatusRoutes() {
  return (
    <Routes>

      {/* 기본 Wrapper */}
      <Route element={<MainWrapperView />}>
        <Route path="" element={<Navigate to="analysis/frequency" replace />} />
        <Route path="setting/recoding" element={<RecodingWrapperView />} />
        <Route path="setting/variable" element={<VariableWrapperView />} />
        <Route path="setting/weight" element={<WeightWrapperView />} />
        <Route path="analysis/additional" element={<AdditionalWrapperView />} />
        <Route path="analysis/frequency" element={<FrequencyWrapperView />} />
        <Route path="analysis/quota" element={<QuotaWrapperView />} />
        <Route path="system/menu_permission" element={<MenuPermissionWrapperView />} />
      </Route>

      {/* 팝업 Wrapper */}
      <Route path="setting/viewer" element={<DataViewerPage />} />

    </Routes>
  );
}
