import { Route, Routes } from "react-router-dom";
import OptionSettingExload from "@/components/app/optionSetting/OptionSettingExload.jsx";
const OptionSettingExloadWrapperView = () => {

    /**
     * OptionSetting
     */
    return (
        <Routes>
            <Route path={"/"} element={<OptionSettingExload />} />
        </Routes>
    );
};

export default OptionSettingExloadWrapperView;
