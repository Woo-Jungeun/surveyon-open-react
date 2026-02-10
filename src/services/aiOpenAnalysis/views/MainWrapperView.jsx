import { Fragment, useEffect, useState } from "react";
import { useLocation, Outlet } from "react-router-dom";
import AiSidebar from "@/services/aiOpenAnalysis/app/AiSidebar.jsx";
import { useSelector } from "react-redux";

const MainWrapperView = (props) => {
    const auth = useSelector((store) => store.auth);
    const location = useLocation();

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <AiSidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: '#fff' }}>
                <section style={{ flex: 1, padding: '0' }}>
                    <Outlet />
                </section>
                <footer style={{
                    width: '100%',
                    background: '#ffffff',
                    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px',
                    marginTop: 'auto'
                }}>
                    <div style={{
                        maxWidth: '1280px',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#777'
                    }}>
                        <p style={{ margin: 0 }}>© 2026 설문온 SurveyOn. All rights reserved.</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            <span style={{
                                width: '9px',
                                height: '9px',
                                background: '#22c55e',
                                borderRadius: '50%'
                            }}></span>
                            시스템 정상 운영중
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default MainWrapperView;
