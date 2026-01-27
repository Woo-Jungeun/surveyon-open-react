import { Routes, Route, Navigate } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import RecodingWrapperView from "./views/setting/RecodingWrapperView.jsx";
import VariableWrapperView from "./views/setting/VariableWrapperView.jsx";
import WeightWrapperView from "./views/setting/WeightWrapperView.jsx";
import AggregationPage from "./app/aggregation/AggregationPage.jsx";
import CrossTabPage from "./app/crossTab/CrossTabPage.jsx";
import QuotaPage from "./app/quota/QuotaPage.jsx";
import DataViewerPage from "./app/dataViewer/DataViewerPage.jsx";

export default function DataStatusRoutes() {
  return (
    <Routes>

      {/* 기본 Wrapper */}
      <Route element={<MainWrapperView />}>
        <Route path="" element={<Navigate to="setting/variable" replace />} />
        <Route path="setting/recoding" element={<RecodingWrapperView />} />
        <Route path="setting/variable" element={<VariableWrapperView />} />
        <Route path="setting/weight" element={<WeightWrapperView />} />
        <Route path="aggregation/cross" element={<CrossTabPage />} />
        <Route path="aggregation/status" element={<AggregationPage />} />
        <Route path="aggregation/quota" element={<QuotaPage />} />
      </Route>

      {/* 팝업 Wrapper */}
      <Route path="setting/viewer" element={<DataViewerPage />} />

    </Routes>
  );
}
