import { Fragment, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import Header from "@/components/app/Header.jsx";
import PageNotFound from "@/components/app/pageNotFound/PageNotFound.jsx";
import OptionSettingWrapperView from "@/views/optionSetting/OptionSettingWrapperView.jsx";
import { useSelector } from "react-redux";

const MainWrapperView = (props) => {
    const auth = useSelector((store) => store.auth);
    const [authMenuList, setAuthMenuList] =useState([]);
    const [menuData, setMenuData] =useState();
    const location = useLocation();
    const index = menuData?.findIndex(i => i.menuUrl === location.pathname || location.pathname === "/" || location.pathname === "/business-plan/course2/time-table/detail");
 
    return (
        <Fragment>
            <Header index={index} authMenuList={authMenuList} setAuthMenuList={setAuthMenuList} setMenuData={setMenuData} {...props} />
            <section>
                <Routes>
                    <Route path={"/o/*"} element={<OptionSettingWrapperView/>}/>
                    {/* 화면 라우팅 예외처리
                            1. 특정 메인 화면으로 이동
                            2. NOTFOUND 페이지로 이동  */}
                   
                    <Route path={"/login"} element={<Navigate replace to={"/"} />} />
                    {/*<Route path={"/*"} element={<PageNotFound />} />*/}
                </Routes>
            </section>
            <footer>Copyright © Hankook Research all rights reserved.</footer>
        </Fragment>
    );
};

export default MainWrapperView;
