import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import ProList from "@/components/app/proList/ProList.jsx";
const ProListWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    /**
     * ProList
     */
    return (
        <Routes>
            <Route path={"/"} element={<ProList />} />
        </Routes>
    );
};

export default ProListWrapperView;
