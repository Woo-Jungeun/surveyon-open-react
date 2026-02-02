import React from "react";
import { Outlet } from "react-router-dom";

/* Global Styles moved from main.jsx */
import '@progress/kendo-theme-default/dist/all.css';
import "@/assets/css/theme.css";
import "@/assets/css/common.css";
import "@/assets/css/kendo_custom.css";

import FooterSection from "@/services/homePage/FooterSection";

const MainLayout = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <div style={{ flex: 1 }}>
                <Outlet />
            </div>
            <FooterSection />
        </div>
    );
};

export default MainLayout;
