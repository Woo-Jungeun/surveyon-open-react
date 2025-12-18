import React from "react";
import { Outlet } from "react-router-dom";

/* Global Styles moved from main.jsx */
import '@progress/kendo-theme-default/dist/all.css';
import "@/assets/css/theme.css";
import "@/assets/css/common.css";
import "@/assets/css/kendo_custom.css";

const MainLayout = () => {
    return <Outlet />;
};

export default MainLayout;
