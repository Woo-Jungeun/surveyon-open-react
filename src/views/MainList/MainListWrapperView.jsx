import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import MainList from "@/components/app/mainList/mainList.jsx";
const MainListWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    /**
     * MainList
     */
    return (
        <Routes>
            <Route path={"/"} element={<MainList />} />
        </Routes>
    );
};

export default MainListWrapperView;
