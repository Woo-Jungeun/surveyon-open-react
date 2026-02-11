import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Folder, Plus } from 'lucide-react';
import './ProjectSelectionModal.css';
import MainList from "@/services/mainList/MainList";
import ProEnterTab1 from "@/services/aiOpenAnalysis/app/proEnter/ProEnterTab1";
import ProEnterTab3 from "@/services/aiOpenAnalysis/app/proEnter/ProEnterTab3";

const ProjectSelectionModal = ({ onClose, onSelect }) => {
    const [activeTab, setActiveTab] = useState('select'); // 'select' | 'create'
    const [createSubTab, setCreateSubTab] = useState('qmaster'); // 'qmaster' | 'new'

    return ReactDOM.createPortal(
        <div className="ps-modal-overlay">
            <div className="ps-modal-container">
                <div className="ps-modal-header">
                    <div className="ps-header-title">
                        {activeTab === 'select' ? (
                            <>
                                <Folder size={20} className="ps-header-icon" />
                                <span style={{ "fontSize": "20px" }}>프로젝트 선택</span>
                            </>
                        ) : (
                            <>
                                <Plus size={20} className="ps-header-icon" />
                                <span style={{ "fontSize": "20px" }}>프로젝트 등록</span>
                            </>
                        )}
                    </div>
                    <button className="ps-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="ps-tabs-menu">
                    <button
                        className={`ps-tab-btn ${activeTab === 'select' ? 'active' : ''}`}
                        onClick={() => setActiveTab('select')}
                    >
                        <Folder size={16} />
                        <span>프로젝트 선택</span>
                        <span
                            className="info-icon"
                            data-tooltip={`프로젝트 선택|현사용자가 등록한 프로젝트, 다른 사용자가 권한을 부여한 프로젝트를 선택하여 작업할 수 있습니다.`}
                        ></span>
                    </button>
                    <button
                        className={`ps-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                        onClick={() => setActiveTab('create')}
                    >
                        <Plus size={16} />
                        <span>프로젝트 등록</span>
                        <span
                            className="info-icon"
                            data-tooltip={`프로젝트 등록|새로운 프로젝트를 등록합니다.\n조사(Qmaster): 연동된 프로젝트 등록 / 신규 등록: 새로운 프로젝트를 직접 등록`}
                        ></span>
                    </button>
                    <div className={`ps-tab-indicator ${activeTab}`}></div>
                </div>

                <div className="ps-modal-content">
                    {activeTab === 'select' && (
                        <div className="ps-content-wrapper">
                            <MainList showHeader={false} onProjectSelect={onSelect} />
                        </div>
                    )}
                    {activeTab === 'create' && (
                        <div className="ps-create-container">
                            <div className="ps-sub-tabs">
                                <button
                                    className={`ps-sub-tab-btn ${createSubTab === 'qmaster' ? 'active' : ''}`}
                                    onClick={() => setCreateSubTab('qmaster')}
                                >
                                    조사 (Qmaster)
                                    <span
                                        className="info-icon"
                                        data-tooltip={`조사(Qmaster)|조사에 연동된 프로젝트 등록\n(있는 프로젝트가 없을 경우 설문당당자에게 문의)\n설문은 등록 여부에 따라 등록 가능 여부가 달라 확인`}
                                    ></span>
                                </button>
                                <button
                                    className={`ps-sub-tab-btn ${createSubTab === 'new' ? 'active' : ''}`}
                                    onClick={() => setCreateSubTab('new')}
                                >
                                    신규 등록
                                    <span
                                        className="info-icon"
                                        data-tooltip={`신규 등록|새로운 프로젝트를 직접 등록`}
                                    ></span>
                                </button>
                            </div>
                            <div className="ps-content-wrapper sub-tab-content">
                                {createSubTab === 'qmaster' && <ProEnterTab1 />}
                                {createSubTab === 'new' && <ProEnterTab3 />}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProjectSelectionModal;
