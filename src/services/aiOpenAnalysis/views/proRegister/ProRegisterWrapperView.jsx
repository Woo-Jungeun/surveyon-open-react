import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import ProList from "@/services/aiOpenAnalysis/app/proList/ProList.jsx";
import PageNotFound from "@/services/aiOpenAnalysis/app/pageNotFound/PageNotFound";
import ProRegisterBody from "@/services/aiOpenAnalysis/app/proRegister/ProRegisterBody.jsx";
const ProRegisterWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    /**
     * ProList
     */
    return (
        <Routes>
            <Route index element={<ProRegisterBody />} />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

export default ProRegisterWrapperView;
