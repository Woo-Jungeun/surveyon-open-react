import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import MainList from "@/components/app/mainList/MainList.jsx";
import PageNotFound from "@/components/app/pageNotFound/PageNotFound";
const MainListWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    /**
     * MainList
     */
    return (
        <Routes>
            <Route index element={<MainList />} />
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

export default MainListWrapperView;
