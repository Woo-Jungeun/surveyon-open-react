import React from "react";
import { Outlet, useLocation } from "react-router-dom";

/* Global Styles moved from main.jsx */
import '@progress/kendo-theme-default/dist/all.css';
import "@/assets/css/theme.css";
import "@/assets/css/common.css";
import "@/assets/css/kendo_custom.css";

import FooterSection from "@/services/homePage/FooterSection";

const MainLayout = () => {
    const location = useLocation();
    const isCustomFooterPage = location.pathname.startsWith('/data_status') || location.pathname.startsWith('/ai_open_analysis') || location.pathname.startsWith('/project') || location.pathname === '/login';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>
            <div style={{ flex: 1 }}>
                <Outlet />
            </div>
            {!isCustomFooterPage && <FooterSection />}
        </div>
    );
};

export default MainLayout;
