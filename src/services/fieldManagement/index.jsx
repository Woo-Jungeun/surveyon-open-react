import { Routes, Route, Navigate } from "react-router-dom";

import MainWrapperView from "./views/MainWrapperView.jsx";
import FieldProgressWrapperView from "./views/analysis/FieldProgressWrapperView.jsx";
import QuotaWrapperView from "./views/analysis/QuotaWrapperView.jsx";
import "./app/FieldManagementTheme.css"; // Global Theme Import

export default function FieldManagementRoutes() {
    return (
        <Routes>
            <Route element={<MainWrapperView />}>
                <Route path="" element={<Navigate to="analysis/progress" replace />} />
                <Route path="analysis/progress" element={<FieldProgressWrapperView />} />
                <Route path="analysis/quota" element={<QuotaWrapperView />} />
            </Route>
        </Routes>
    );
}
