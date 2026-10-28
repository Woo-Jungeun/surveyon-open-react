import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/common/layout";
import MapManagementWrapperView from "./views/setting/MapManagementWrapperView.jsx";
import SurveyTestWrapperView from "./views/surveyTest/SurveyTestWrapperView.jsx";
import QaWrapperView from "./views/qa/QaWrapperView.jsx";
import AiDataWrapperView from "./views/aiData/AiDataWrapperView.jsx";
import "./app/DataManagementTheme.css"; // Global Theme Import

export default function DataManagementRoutes() {
  return (
    <Routes>
      {/* 기본 Wrapper */}
      <Route element={<AppLayout service="dataManagement" />}>
        <Route path="" element={<Navigate to="setting/map" replace />} />
        <Route path="setting/map" element={<MapManagementWrapperView />} />
        <Route path="survey_test" element={<SurveyTestWrapperView />} />
        <Route path="qa" element={<QaWrapperView />} />
        <Route path="ai_data" element={<AiDataWrapperView />} />
      </Route>
    </Routes>
  );
}
