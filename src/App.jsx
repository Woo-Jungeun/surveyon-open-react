import { useSelector } from "react-redux";
import Login from "@/components/app/login/Login.jsx";
import { Navigate, Route, Routes } from "react-router-dom";
import { Fragment } from "react";
import MainWrapperView from "@/views/MainWrapperView";
import { useCookies } from "react-cookie";
import PageNotFound from "./components/app/pageNotFound/PageNotFound";
import OptionSettingWrapperView from "@/views/optionSetting/OptionSettingWrapperView.jsx";

function App() {
    const [cookies] = useCookies();
    const auth = useSelector((store) => store.auth);
    return (
        <Fragment>
            {(auth?.isLogin && cookies?.TOKEN)
                ?
                <Routes>
                    <Route path="/o2" element={<MainWrapperView />}>
                        <Route index element={<OptionSettingWrapperView />} />       {/* /o2 */}
                        <Route path="login" element={<Navigate to="/o2" replace />} />
                        <Route path="*" element={<PageNotFound />} />
                        {/* <Route path="*" element={<Navigate to="/o2" replace />} /> */}
                    </Route>
                    {/* /o2 외 경로로 오면 /o2로 돌려 */}
                    <Route path="*" element={<Navigate to="/o2" replace />} />
                </Routes>
                : <Fragment>
                    <Navigate replace to="/o2/login" />
                    <Routes>
                        <Route path={"/"} element={<Login />} />
                        <Route path={"/o2/login"} element={<Login />} />
                        <Route path={"/*"} element={<PageNotFound />} />
                    </Routes>
                </Fragment>
            }
        </Fragment>
    );
}

export default App;
