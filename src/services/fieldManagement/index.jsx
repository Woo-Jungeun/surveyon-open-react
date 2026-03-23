import { Routes, Route, Navigate } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import FrequencyWrapperView from "@/services/dataStatus/views/analysis/FrequencyWrapperView.jsx";
import QuotaWrapperView from "@/services/dataStatus/views/analysis/QuotaWrapperView.jsx";
import "./app/FieldManagementTheme.css"; // Global Theme Import

export default function FieldManagementRoutes() {
    return (
        <Routes>
            <Route element={<MainWrapperView />}>
                <Route path="" element={<Navigate to="analysis/frequency" replace />} />
                <Route path="analysis/frequency" element={<FrequencyWrapperView />} />
                <Route path="analysis/quota" element={<QuotaWrapperView />} />
            </Route>
        </Routes>
    );
}
