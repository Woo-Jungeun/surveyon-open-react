import React, { useState } from "react";
import ReactDOM from 'react-dom';
import { X, Plus, FileSpreadsheet, Database } from 'lucide-react';
import ProRegisterTab1 from "@/services/proRegister/ProRegisterTab1";
import ProRegisterTab2 from "@/services/proRegister/ProRegisterTab2";
import "./ProRegisterPopup.css";

const ProRegisterPopup = ({ popupShow, setPopupShow }) => {
    const [tab, setTab] = useState("DB");

    if (!popupShow) return null;

    return ReactDOM.createPortal(
        <div className="pr-modal-overlay">
            <div className="pr-modal-container">
                <div className="pr-modal-header">
                    <div className="pr-header-title">
                        <Plus size={20} className="pr-header-icon" />
                        <span style={{ fontSize: "20px" }}>문항 등록</span>
                    </div>
                    <button className="pr-close-btn" onClick={() => setPopupShow(false)}>
                        <X size={20} />
                    </button>
                </div>

                <div className="pr-tabs-menu">
                    <button
                        className={`pro-reg-tab-btn ${tab === 'DB' ? 'active' : ''}`}
                        onClick={() => setTab('DB')}
                    >
                        <Database size={16} />
                        <span>DB</span>
                        <span
                            className="info-icon"
                            data-tooltip={`DB|조사(Qmaster)에 연동된 프로젝트를 불러옵니다.`}
                        ></span>
                    </button>
                    <button
                        className={`pro-reg-tab-btn ${tab === 'Excel' ? 'active' : ''}`}
                        onClick={() => setTab('Excel')}
                    >
                        <FileSpreadsheet size={16} />
                        <span>Excel</span>
                        <span
                            className="info-icon"
                            data-tooltip={`Excel|엑셀 파일을 통해 신규 문항을 등록합니다.`}
                        ></span>
                    </button>
                </div>

                <div className="pr-modal-content">
                    <div className="pr-content-wrapper" style={{ border: 'none', boxShadow: 'none', overflow: 'hidden' }}>
                        {tab === "DB" ? (
                            <ProRegisterTab1 />
                        ) : (
                            <ProRegisterTab2 />
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProRegisterPopup;
