import { Route, Routes } from "react-router-dom";
import OptionSettingExload from "@/components/app/optionSetting/OptionSettingExload.jsx";
import PageNotFound from "@/components/app/pageNotFound/PageNotFound";
const OptionSettingExloadWrapperView = () => {

    /**
     * OptionSetting
     */
    return (
        <Routes>
            <Route index element={<OptionSettingExload />} />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

export default OptionSettingExloadWrapperView;
