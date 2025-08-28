import { Route, Routes } from "react-router-dom";
import OptionSettingBody from "@/components/app/optionSetting/OptionSettingBody.jsx";
import { useSelector } from "react-redux";
const OptionSettingWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    /**
     * OptionSetting
     */
    return (
        <Routes>
            <Route path={"/"} element={<OptionSettingBody/>} />
        </Routes>
    );
};

export default OptionSettingWrapperView;
