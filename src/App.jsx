import { useSelector } from "react-redux";
import Login from "@/components/app/login/Login.jsx";
import { Navigate, Route, Routes } from "react-router-dom";
import { Fragment } from "react";
import MainWrapperView from "@/views/MainWrapperView";
import { useCookies } from "react-cookie";
import { jwtDecode } from "jwt-decode";
import PageNotFound from "./components/app/pageNotFound/PageNotFound";
import OptionSettingWrapperView from "@/views/optionSetting/OptionSettingWrapperView.jsx";
function App() {
    const [cookies] = useCookies();
    const auth = useSelector((store) => store.auth);

    return (
        <Fragment>
            <Routes>
                {/* /o2 아래가 우리 앱 루트 */}
                <Route path="/o2" element={<MainWrapperView />}>
                    <Route index element={<OptionSettingWrapperView />} />       {/* /o2 */}
                    <Route path="login" element={<Navigate to="/o2" replace />} />
                    <Route path="*" element={<PageNotFound />} />
                    {/* <Route path="*" element={<Navigate to="/o2" replace />} /> */}
                </Route>
                {/* /o2 외 경로로 오면 /o2로 돌려 */}
                <Route path="*" element={<Navigate to="/o2" replace />} />
            </Routes>
        </Fragment>
    );
}

export default App;
