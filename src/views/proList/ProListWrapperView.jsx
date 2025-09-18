import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import ProList from "@/components/app/proList/ProList.jsx";
import PageNotFound from "@/components/app/pageNotFound/PageNotFound";
const ProListWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    /**
     * ProList
     */
    return (
        <Routes>
            <Route index element={<ProList />} />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

export default ProListWrapperView;
