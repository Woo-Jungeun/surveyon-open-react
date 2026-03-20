import React from "react";
import logoRed from "@/assets/images/logo_red.png";

const FooterSection = ({ style }) => {
  return (
    <footer className="hp-footer" style={{ boxSizing: 'border-box', ...style }}>
      <div className="hp-footer-inner">
        <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={logoRed} alt="설문온" style={{ height: '30px' }} />
          © 2026 설문온 SurveyOn. All rights reserved.
        </p>

        <div className="hp-footer-status">
          <span className="hp-status-dot"></span>
          시스템 정상 운영중
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
