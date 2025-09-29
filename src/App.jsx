import { useSelector } from "react-redux";
import Login from "@/components/app/login/Login.jsx";
import { Navigate, Route, Routes } from "react-router-dom";
import { Fragment, useEffect } from "react";
import MainWrapperView from "@/views/MainWrapperView";
import { useCookies } from "react-cookie";
import PageNotFound from "@/components/app/pageNotFound/PageNotFound";
import OptionSettingWrapperView from "@/views/optionSetting/OptionSettingWrapperView.jsx";
import OptionSettingExloadWrapperView from "@/views/optionSetting/OptionSettingExloadWrapperView.jsx";
import MainListWrapperView from "@/views/mainList/MainListWrapperView.jsx";
import PopupWrapperView from "@/views/PopupWrapperView.jsx";
import ProListWrapperView from "@/views/proList/ProListWrapperView.jsx";
import ProEnterWrapperView from "@/views/proEnter/ProEnterWrapperView.jsx";
import ProRegisterWrapperView from "@/views/proRegister/ProRegisterWrapperView.jsx";
import ProPermissionWrapperView from "@/views/proPermission/ProPermissionWrapperView.jsx";
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
          <Route element={<MainWrapperView />}>
            <Route index element={<MainListWrapperView />} />
            <Route path="pro_list/*" element={<ProListWrapperView />} />
            <Route path="option_setting/*" element={<OptionSettingWrapperView />} />
            <Route path="login/*" element={<Navigate to="/" replace />} />
            <Route path="pro_enter/*" element={<ProEnterWrapperView />} />
            <Route path="pro_register/*" element={<ProRegisterWrapperView />} />
            <Route path="pro_permission/*" element={<ProPermissionWrapperView />} />
            <Route path="*" element={<PageNotFound />} />
          </Route>
          
          {/*헤더 없는 페이지*/}
          <Route element={<PopupWrapperView />}>
            <Route path="viewer/*" element={<OptionSettingExloadWrapperView />} />
          </Route>

          {/* / 외 경로로 오면 /로 돌려 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        : (
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* 그 외 모든 경로는 /login으로 보냄 (404 없음) */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )
      }
    </Fragment>
  );
}

export default App;
