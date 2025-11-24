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
            <footer>Copyright © Hankook Research all rights reserved.</footer>
        </Fragment>
    );
};

export default MainWrapperView;
