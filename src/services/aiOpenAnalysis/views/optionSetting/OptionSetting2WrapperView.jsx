import { Route, Routes } from "react-router-dom";
import OptionSettingBody2 from "@/services/aiOpenAnalysis/app/optionSetting/OptionSettingBody2.jsx";
import LoadingProvider from "@/components/common/AnalysisLoadingSpinner";
import PageNotFound from "@/services/aiOpenAnalysis/app/pageNotFound/PageNotFound";

const OptionSetting2WrapperView = () => {

    /**
     * OptionSetting2 (UI 고도화용 사본)
     */
    return (
        <Routes>
            <Route index element={
                <LoadingProvider>
                    <OptionSettingBody2 />
                </LoadingProvider>
            } />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

export default OptionSetting2WrapperView;
