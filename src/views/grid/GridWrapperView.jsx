import { Route, Routes } from "react-router-dom";
import GridTestBody from "@/components/app/grid/GridTestBody.jsx";
import { useSelector } from "react-redux";
const GridWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    /**
     * 그리드
     */
    return (
        <Routes>
            <Route path={"/grid-test"} element={<GridTestBody/>} />
        </Routes>
    );
};

export default GridWrapperView;
