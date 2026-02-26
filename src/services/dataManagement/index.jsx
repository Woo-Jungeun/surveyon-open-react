import { Routes, Route, Navigate } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import VariableWrapperView from "./views/setting/VariableWrapperView.jsx";
import "./app/DataManagementTheme.css"; // Global Theme Import

export default function DataManagementRoutes() {
  return (
    <Routes>
      {/* 기본 Wrapper */}
      <Route element={<MainWrapperView />}>
        <Route path="" element={<Navigate to="setting/variable" replace />} />
        <Route path="setting/variable" element={<VariableWrapperView />} />
      </Route>
    </Routes>
  );
}
