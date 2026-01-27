import { Routes, Route } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import MainListWrapperView from "./views/MainList/MainListWrapperView.jsx";
import RecodingWrapperView from "./views/setting/RecodingWrapperView.jsx";
import VariableWrapperView from "./views/setting/VariableWrapperView.jsx";
import WeightWrapperView from "./views/setting/WeightWrapperView.jsx";
import AggregationPage from "./app/aggregation/AggregationPage.jsx";
import CrossTabPage from "./app/crossTab/CrossTabPage.jsx";
import DataViewerPage from "./app/dataViewer/DataViewerPage.jsx";

export default function DataStatusRoutes() {
  return (
    <Routes>

      {/* 기본 Wrapper */}
      <Route element={<MainWrapperView />}>
        <Route path="" element={<MainListWrapperView />} />
        <Route path="setting/recoding" element={<RecodingWrapperView />} />
        <Route path="setting/variable" element={<VariableWrapperView />} />
        <Route path="setting/weight" element={<WeightWrapperView />} />
        <Route path="aggregation/cross" element={<CrossTabPage />} />
        <Route path="aggregation/status" element={<AggregationPage />} />
      </Route>

      {/* 팝업 Wrapper */}
      <Route path="setting/viewer" element={<DataViewerPage />} />

    </Routes>
  );
}
