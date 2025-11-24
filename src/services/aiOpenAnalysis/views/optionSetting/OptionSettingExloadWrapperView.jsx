import { Route, Routes } from "react-router-dom";
import OptionSettingExload from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingExload.jsx";
import PageNotFound from "@/services/aiOpenAnalysis/app/pageNotFound/PageNotFound";
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
