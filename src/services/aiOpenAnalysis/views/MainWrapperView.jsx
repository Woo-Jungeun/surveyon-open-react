import { Fragment, useEffect, useState } from "react";
import { useLocation, Outlet } from "react-router-dom";

import MenuBar from "@/services/aiOpenAnalysis/app/MenuBar.jsx";
import { useSelector } from "react-redux";

const MainWrapperView = (props) => {
    const auth = useSelector((store) => store.auth);
    const [authMenuList, setAuthMenuList] = useState([]);
    const [menuData, setMenuData] = useState();
    const location = useLocation();
    const index = menuData?.findIndex(i => i.menuUrl === location.pathname || location.pathname === "/" || location.pathname === "/business-plan/course2/time-table/detail");

    return (
        <Fragment>
            <MenuBar userName={auth?.user?.userName ?? ""} />
            <section>
                <Outlet />
            </section>
            <footer style={{
                width: '100%',
                background: '#ffffff',
                borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 20px'
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
        </Fragment>
    );
};

export default MainWrapperView;
