import {Route, Routes} from "react-router-dom";

const UserWrapperView = () => {
    return (
        <Routes>
            <Route path={"/manage-user"} element={<Operator />} />
        </Routes>
    );
};

export default UserWrapperView;
