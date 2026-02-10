import { Routes, Route, Navigate } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import PopupWrapperView from "./views/PopupWrapperView.jsx";
import MainListWrapperView from "./views/MainList/MainListWrapperView.jsx";
import OptionSettingWrapperView from "./views/optionSetting/OptionSettingWrapperView.jsx";
import OptionSettingExloadWrapperView from "./views/optionSetting/OptionSettingExloadWrapperView.jsx";
import ProEnterWrapperView from "./views/ProEnter/ProEnterWrapperView.jsx";
import ProListWrapperView from "./views/proList/ProListWrapperView.jsx";
import ProRegisterWrapperView from "./views/proRegister/ProRegisterWrapperView.jsx";
import ProPermissionWrapperView from "./views/proPermission/ProPermissionWrapperView.jsx";
import ProKeyWrapperView from "./views/proKey/ProKeyWrapperView.jsx";
import TokenUsageWrapperView from "./views/tokenUsage/TokenUsageWrapperView.jsx";

import ProjectListLayout from "@/services/mainList/layout/ProjectListLayout.jsx";

export default function AiOpenAnalysisRoutes() {
  return (
    <Routes>
      {/* 0. 프로젝트 목록 (Purple Theme) */}
      <Route element={<ProjectListLayout />}>
        {/* <Route path="" element={<MainListWrapperView />} /> */}
        <Route path="pro_enter/*" element={<ProEnterWrapperView />} />
      </Route>

      {/* 1. AI Open Analysis 기본 Wrapper (Orange Theme) */}
      <Route element={<MainWrapperView />}>
        <Route index element={<Navigate to="pro_list" replace />} />
        {/* MainListWrapperView moved out */}
        <Route path="option_setting/*" element={<OptionSettingWrapperView />} />
        <Route path="pro_list/*" element={<ProListWrapperView />} />
        <Route path="pro_register/*" element={<ProRegisterWrapperView />} />
        <Route path="pro_permission/*" element={<ProPermissionWrapperView />} />
        <Route path="pro_key/*" element={<ProKeyWrapperView />} />
        <Route path="token_usage/*" element={<TokenUsageWrapperView />} />
      </Route>

      {/* 팝업 Wrapper */}
      <Route element={<PopupWrapperView />}>
        <Route path="viewer/*" element={<OptionSettingExloadWrapperView />} />
      </Route>

    </Routes>
  );
}
