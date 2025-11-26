import React from "react";
import "@/services/homePage/HomePage.css";
import InfoSection from "@/services/homePage/InfoSection";
import MenuSection from "@/services/homePage/MenuSection";

const HomePage = () => {
  return (
    <div className="homepage-container">
      <InfoSection />
      <MenuSection />
    </div>
  );
};

export default HomePage;
