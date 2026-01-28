import { Routes, Route, Navigate } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import RecodingWrapperView from "./views/setting/RecodingWrapperView.jsx";
import VariableWrapperView from "./views/setting/VariableWrapperView.jsx";
import WeightWrapperView from "./views/setting/WeightWrapperView.jsx";
import AggregationWrapperView from "./views/aggregation/AggregationWrapperView.jsx";
import CrossTabWrapperView from "./views/aggregation/CrossTabWrapperView.jsx";
import QuotaWrapperView from "./views/aggregation/QuotaWrapperView.jsx";
import DataViewerPage from "./app/dataViewer/DataViewerPage.jsx";
import "./app/DataStatusTheme.css"; // Global Theme Import

export default function DataStatusRoutes() {
  return (
    <Routes>

      {/* 기본 Wrapper */}
      <Route element={<MainWrapperView />}>
        <Route path="" element={<Navigate to="setting/variable" replace />} />
        <Route path="setting/recoding" element={<RecodingWrapperView />} />
        <Route path="setting/variable" element={<VariableWrapperView />} />
        <Route path="setting/weight" element={<WeightWrapperView />} />
        <Route path="aggregation/cross" element={<CrossTabWrapperView />} />
        <Route path="aggregation/status" element={<AggregationWrapperView />} />
        <Route path="aggregation/quota" element={<QuotaWrapperView />} />
      </Route>

      {/* 팝업 Wrapper */}
      <Route path="setting/viewer" element={<DataViewerPage />} />

    </Routes>
  );
}
