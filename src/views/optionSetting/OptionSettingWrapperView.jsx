import { Route, Routes } from "react-router-dom";
import OptionSettingBody from "@/components/app/optionSetting/OptionSettingBody.jsx";
import LoadingProvider from "@/components/common/AnalysisLoadingSpinner";
const OptionSettingWrapperView = () => {

    /**
     * OptionSetting
     */
    return (
        <Routes>
            <Route path="/" element={
                <LoadingProvider>
                    <OptionSettingBody />
                </LoadingProvider>
            } />
            <Route path={"/"} element={<OptionSettingBody />} />
        </Routes>
    );
};

export default OptionSettingWrapperView;
