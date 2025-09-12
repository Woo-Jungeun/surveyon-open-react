import { useSelector } from "react-redux";
import Login from "@/components/app/login/Login.jsx";
import { Navigate, Route, Routes } from "react-router-dom";
import { Fragment, useEffect } from "react";
import MainWrapperView from "@/views/MainWrapperView";
import { useCookies } from "react-cookie";
import PageNotFound from "./components/app/pageNotFound/PageNotFound";
import OptionSettingWrapperView from "@/views/optionSetting/OptionSettingWrapperView.jsx";
import MainListWrapperView from "@/views/mainList/MainListWrapperView.jsx";
import ProListWrapperView from "@/views/proList/ProListWrapperView.jsx";
import busGif from "@/assets/images/bus_loading.gif";

function App() {
    const [cookies] = useCookies();
    const auth = useSelector((store) => store.auth);
    useEffect(() => {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = busGif; // Vite가 빌드 시 해시가 붙은 실제 URL로 변환됨
        document.head.appendChild(link);
    
        return () => {
          document.head.removeChild(link);
        };
      }, []);

    return (
        <Fragment>
            {(auth?.isLogin && cookies?.TOKEN)
                ?
                <Routes>
                       <Route path="/" element={<MainWrapperView />}>
                       <Route index element={<MainListWrapperView />} />
                       <Route path="pro_list" element={<ProListWrapperView />} />      
                        <Route path="open-setting" element={<OptionSettingWrapperView />} />      
                        <Route path="login" element={<Navigate to="/" replace />} />
                        <Route path="*" element={<PageNotFound />} />
                        {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
                    </Route>
                    {/* / 외 경로로 오면 /로 돌려 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                : <Fragment>
                    <Navigate replace to="/login" />
                    <Routes>
                        <Route path={"/"} element={<Login />} />
                        <Route path={"/login"} element={<Login />} />
                        <Route path={"/*"} element={<PageNotFound />} />
                    </Routes>
                </Fragment>
            }
        </Fragment>
    );
}

export default App;
