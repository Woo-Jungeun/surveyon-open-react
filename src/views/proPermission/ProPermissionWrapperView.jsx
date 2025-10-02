import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import PageNotFound from "@/components/app/pageNotFound/PageNotFound";
import ProPermission from "@/components/app/proPermission/ProPermission";

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
