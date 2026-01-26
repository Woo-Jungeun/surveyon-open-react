import { Routes, Route } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import MainListWrapperView from "./views/MainList/MainListWrapperView.jsx";
import RecodingWrapperView from "./views/setting/RecodingWrapperView.jsx";

export default function DataStatusRoutes() {
  return (
    <Routes>

      {/* 기본 Wrapper */}
      <Route element={<MainWrapperView />}>
        <Route path="" element={<MainListWrapperView />} />
        <Route path="setting/recoding" element={<RecodingWrapperView />} />
      </Route>

      {/* 팝업 Wrapper */}

    </Routes>
  );
}
