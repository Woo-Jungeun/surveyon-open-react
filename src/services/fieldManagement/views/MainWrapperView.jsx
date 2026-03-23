import { Fragment } from "react";
import { useLocation, Outlet, useNavigate } from "react-router-dom";

import MenuBar from "@/services/fieldManagement/app/menuBar/MenuBar.jsx";
import FooterSection from "@/services/homePage/FooterSection";
import { useSelector } from "react-redux";

const MainWrapperView = (props) => {
    const auth = useSelector((store) => store.auth);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f7fa' }} data-theme="field-management">
            <MenuBar userName={auth?.user?.userName ?? ""} />
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
