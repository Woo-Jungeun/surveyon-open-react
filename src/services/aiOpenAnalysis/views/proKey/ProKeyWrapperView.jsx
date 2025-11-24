import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import PageNotFound from "@/services/aiOpenAnalysis/app/pageNotFound/PageNotFound";
import ProKey from "@/services/aiOpenAnalysis/app/proKey/ProKey.jsx";
const ProKeyWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    /**
     * ProKey
     */
    return (
        <Routes>
            <Route index element={<ProKey />} />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

export default ProKeyWrapperView;
