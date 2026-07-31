import { Outlet } from "react-router-dom";
import MenuBar from "@/services/dataStatus/app/menuBar/MenuBar.jsx";
import FooterSection from "@/services/homePage/FooterSection";
import { useSelector } from "react-redux";

const MainWrapperView = () => {
    const auth = useSelector((store) => store.auth);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f7fa' }}>
            <MenuBar userName={auth?.user?.userName ?? ""} />
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f1f5f9' }}>
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
                    <Outlet />
                </div>
                <FooterSection style={{ height: '40px', padding: '0 20px' }} />
            </section>
        </div>
    );
};

export default MainWrapperView;
