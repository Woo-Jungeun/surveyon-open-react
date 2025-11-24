import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import PageNotFound from "@/services/aiOpenAnalysis/app/pageNotFound/PageNotFound";
import ProPermission from "@/services/aiOpenAnalysis/app/proPermission/ProPermission";

const ProPermissionWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    /**
     * ProEnterBody
     */
    return (
        <Routes>
            <Route index element={<ProPermission />} />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

export default ProPermissionWrapperView;
