import { Fragment } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/common/sidebar/AppSidebar";
import FooterSection from "@/services/homePage/FooterSection";

const MainWrapperView = () => {
    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f7fa' }}>
            <AppSidebar service="aiOpen" />
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <Outlet />
                </div>
                <FooterSection style={{ height: '40px', padding: '0 20px' }} />
            </section>
        </div>
    );
};

export default MainWrapperView;
