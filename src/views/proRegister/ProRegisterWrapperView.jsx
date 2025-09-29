import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import ProList from "@/components/app/proList/ProList.jsx";
import PageNotFound from "@/components/app/pageNotFound/PageNotFound";
import ProRegisterBody from "@/components/app/proRegister/ProRegisterBody.jsx";
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
