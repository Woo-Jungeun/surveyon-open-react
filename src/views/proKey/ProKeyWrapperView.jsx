import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import PageNotFound from "@/components/app/pageNotFound/PageNotFound";
import ProKey from "@/components/app/proKey/ProKey.jsx";
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
