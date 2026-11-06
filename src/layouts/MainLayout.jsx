import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

/* Global Styles moved from main.jsx */
import '@progress/kendo-theme-default/dist/all.css';
import "@/assets/css/theme.css";
import "@/assets/css/surveyon-theme.css";
import "@/assets/css/common.css";
import "@/assets/css/kendo_custom.css";

import FooterSection from "@/services/homePage/FooterSection";

const SURVEYON_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#7C3AED;stop-opacity:1" /><stop offset="100%" style="stop-color:#5B21B6;stop-opacity:1" /></linearGradient><linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FFB366;stop-opacity:1" /><stop offset="100%" style="stop-color:#FF8C42;stop-opacity:1" /></linearGradient></defs><rect width="32" height="32" rx="6" fill="url(#bgGradient)"/><text x="16" y="20" font-family="Arial, sans-serif" font-size="16" font-weight="900" fill="url(#textGradient)" text-anchor="middle" letter-spacing="-0.5">ON</text><rect x="6" y="22" width="20" height="2.5" rx="1.25" fill="#FF8C42" opacity="0.8"/><circle cx="25" cy="7" r="3" fill="#4ADE80"><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="25" cy="7" r="4.5" fill="#4ADE80" opacity="0.3"><animate attributeName="r" values="4.5;5.5;4.5" dur="2s" repeatCount="indefinite"/></circle><text x="16" y="10" font-family="Arial, sans-serif" font-size="6" font-weight="700" fill="#FFF" text-anchor="middle" opacity="0.9">설문</text></svg>`;
const SURVEYON_FAVICON_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(SURVEYON_FAVICON_SVG)}`;

const MainLayout = () => {
    const location = useLocation();
    const isCustomFooterPage = location.pathname.startsWith('/data_status') || location.pathname.startsWith('/data_management') || location.pathname.startsWith('/field_management') || location.pathname.startsWith('/ai_open_analysis') || location.pathname.startsWith('/project') || location.pathname === '/login' || location.pathname === '/cs';

    useEffect(() => {
        if (typeof document !== "undefined") {
            const existingIcons = document.querySelectorAll("link[rel*='icon']");
            existingIcons.forEach((el) => el.parentNode?.removeChild(el));
            const faviconLink = document.createElement("link");
            faviconLink.rel = "icon";
            faviconLink.type = "image/svg+xml";
            faviconLink.href = SURVEYON_FAVICON_DATA_URI;
            document.head.appendChild(faviconLink);
        }
    }, []);

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
