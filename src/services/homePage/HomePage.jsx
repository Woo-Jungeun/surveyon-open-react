import React, { useEffect } from "react";
import "@/services/homePage/HomePage.css";
import InfoSection from "@/services/homePage/InfoSection";
import BoardSection from "@/services/homePage/BoardSection";
import MenuSection from "@/services/homePage/MenuSection";
import { useSelector } from "react-redux";
import { LoginApi } from "@/services/login/LoginApi";

const HomePage = () => {
  const { validateToken } = LoginApi();
  const auth = useSelector((store) => store.auth);
  useEffect(() => {
    if (auth?.user?.userId) {
      validateToken.mutate({ user: auth.user.userId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="homepage-container">
      <InfoSection />
      <BoardSection />
      <MenuSection />
    </div>
  );
};

export default HomePage;
