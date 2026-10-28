import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/common/sidebar/AppSidebar";
import FooterSection from "@/services/homePage/FooterSection";
import { useSelector } from "react-redux";

const MainWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    // 브랜드 테스터 정리 시 data-srt-brand 속성 제거
    useEffect(() => {
        const root = document.documentElement;
        root.removeAttribute("data-srt-brand");
        ["--srt-brand", "--srt-brand-secondary", "--srt-brand-accent"].forEach((v) => root.style.removeProperty(v));
        try {
            localStorage.removeItem("srtBrandTest");
        } catch {
            // ignore
        }
    }, []);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f7fa' }}>
            <AppSidebar service="hsrt" />
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f1f5f9' }}>
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
                    <Outlet />
                </div>
                <FooterSection style={{ height: '40px', padding: '0 20px' }} />
            </section>
        </div>
    );
};

export default MainWrapperView;
