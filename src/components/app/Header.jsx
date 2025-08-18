import MenuBar from "@/components/app/login/MenuBar.jsx";
import {Fragment} from "react";

const Header = ({index, authMenuList, setAuthMenuList, setMenuData}) => {
    return (
        <Fragment>
            {index !== -1 && <MenuBar authMenuList={authMenuList} setAuthMenuList={setAuthMenuList} setMenuData={setMenuData} />}
        </Fragment>
    );
};

export default Header;

