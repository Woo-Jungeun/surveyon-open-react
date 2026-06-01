import { Routes, Route, Navigate } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import MapManagementWrapperView from "./views/setting/MapManagementWrapperView.jsx";
import SurveyTestWrapperView from "./views/surveyTest/SurveyTestWrapperView.jsx";
import QaWrapperView from "./views/qa/QaWrapperView.jsx";
import "./app/DataManagementTheme.css"; // Global Theme Import

export default function DataManagementRoutes() {
  return (
    <Routes>
      {/* 기본 Wrapper */}
      <Route element={<MainWrapperView />}>
        <Route path="" element={<Navigate to="setting/map" replace />} />
        <Route path="setting/map" element={<MapManagementWrapperView />} />
        <Route path="survey_test" element={<SurveyTestWrapperView />} />
        <Route path="qa" element={<QaWrapperView />} />
      </Route>
    </Routes>
  );
}
