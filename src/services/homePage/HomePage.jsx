import { Fragment, useCallback, useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@progress/kendo-react-buttons";

const HomePage = () => {

    const navigate = useNavigate();

    const goLogin = () => {
        navigate("/login");
    };
    return (
        <Fragment>
            <div className="login">
                <main className="loginWrap">
                    <div className="loginContents">
                        <h1 className="loginLogo">
                            메인 페이지
                        </h1>
                        <Button themeColor={"primary"} className={"loginBtn h60"} onClick={goLogin}>
                            로그인하기 →
                        </Button>
                    </div>
                </main>
            </div>
        </Fragment>
    );
};

export default HomePage;
