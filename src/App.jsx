import { useSelector } from "react-redux";
import Login from "@/components/app/login/Login.jsx";
import {Navigate, Route, Routes} from "react-router-dom";
import { Fragment } from "react";
import MainWrapperView from "@/views/MainWrapperView";
import '@progress/kendo-theme-default/dist/all.css'
import "@/assets/css/common.css";
import "@/assets/css/kendo_custom.css";
import { useCookies } from "react-cookie";
import { jwtDecode } from "jwt-decode";
import PageNotFound from "./components/app/pageNotFound/PageNotFound";

function App() {
    const [cookies] = useCookies();
    const auth = useSelector((store) => store.auth);

    return (
        <Fragment>
            <Routes><Route path={"/*"} element={<MainWrapperView />} /></Routes>
            {/* {(auth.isLogin && (auth?.user?.userId === (cookies.GS_RFT && jwtDecode(atob(cookies.GS_RFT || ""))?.sub)))
                ? <Routes><Route path={"/*"} element={<MainWrapperView />} /></Routes>
                : <Fragment>
                    {(!auth.isLogin || (auth?.user?.userId !== (cookies.GS_RFT && jwtDecode(atob(cookies.GS_RFT||""))?.sub)) ) && <Navigate replace to={"/login"}></Navigate>}
                    <Routes>
                        <Route path={"/"} element={<Login />} />
                        <Route path={"/login"} element={<Login />} />
                        <Route path={"/*"} element={<PageNotFound />} />
                    </Routes>
                </Fragment>
            } */}
        </Fragment>
    );
}

export default App;
