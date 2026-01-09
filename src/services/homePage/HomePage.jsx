import React from "react";
import "@/services/homePage/HomePage.css";
import InfoSection from "@/services/homePage/InfoSection";
import BoardSection from "@/services/homePage/BoardSection";
import MenuSection from "@/services/homePage/MenuSection";
import FooterSection from "@/services/homePage/FooterSection";

const HomePage = () => {
  return (
    <div className="homepage-container">
      <InfoSection />
      {/* <BoardSection /> */}
      <MenuSection />
      <FooterSection />
    </div>
  );
};

export default HomePage;
