import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import ProList2 from "@/services/aiOpenAnalysis/app/proList/ProList2.jsx";
import PageNotFound from "@/services/aiOpenAnalysis/app/pageNotFound/PageNotFound";

const ProList2WrapperView = () => {
    const auth = useSelector((store) => store.auth);

    /**
     * ProList2 (문항 목록2 - UI 고도화용)
     */
    return (
        <Routes>
            <Route index element={<ProList2 />} />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

export default ProList2WrapperView;
