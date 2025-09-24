import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import ProEnterBody from "@/components/app/proEnter/ProEnterBody.jsx";
import PageNotFound from "@/components/app/pageNotFound/PageNotFound";
const ProEnterWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    /**
     * ProEnterBody
     */
    return (
        <Routes>
            <Route index element={<ProEnterBody />} />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

export default ProEnterWrapperView;
