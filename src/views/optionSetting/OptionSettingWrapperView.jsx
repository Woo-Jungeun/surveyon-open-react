import { Route, Routes } from "react-router-dom";
import OptionSettingBody from "@/components/app/optionSetting/OptionSettingBody.jsx";
const OptionSettingWrapperView = () => {

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
