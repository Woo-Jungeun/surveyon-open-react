import { Route, Routes } from "react-router-dom";
import OptionSettingBody from "@/components/app/optionSetting/OptionSettingBody.jsx";
import LoadingProvider from "@/components/common/AnalysisLoadingSpinner";
import PageNotFound from "@/components/app/pageNotFound/PageNotFound";
const OptionSettingWrapperView = () => {

    /**
     * OptionSetting
     */
    return (
        <Routes>
            <Route index element={
                <LoadingProvider>
                    <OptionSettingBody />
                </LoadingProvider>
            } />
           <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

export default OptionSettingWrapperView;
