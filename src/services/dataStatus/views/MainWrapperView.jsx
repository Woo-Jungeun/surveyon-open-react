import { Fragment, useEffect, useState } from "react";
import { useLocation, Outlet, useNavigate } from "react-router-dom";

import MenuBar from "@/services/dataStatus/app/menuBar/MenuBar.jsx";
import FooterSection from "@/services/homePage/FooterSection";
import { useSelector } from "react-redux";

const MainWrapperView = (props) => {
    const auth = useSelector((store) => store.auth);
    const location = useLocation();
    const navigate = useNavigate();
    const [authMenuList, setAuthMenuList] = useState([]);
    const [menuData, setMenuData] = useState();

    // Key to force re-render when project changes (can be managed via context later if needed)
    // For now, MenuBar refreshes the page on project change, so this is less critical, 
    // but we can keep it simple.

    const index = menuData?.findIndex(i => i.menuUrl === location.pathname || location.pathname === "/" || location.pathname === "/business-plan/course2/time-table/detail");

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f7fa' }}>
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
