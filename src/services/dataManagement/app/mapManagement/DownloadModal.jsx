import React, { useState } from 'react';
import { Download, X, FileText, FileCode } from 'lucide-react';
import './MapManagementPage.css';

const DownloadModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const downloadList = [
        { id: 'sps', label: 'SPS 다운로드', icon: <FileText size={24} className="download-icon-sps" /> },
        { id: 'crd', label: 'CRD 다운로드', icon: <FileCode size={24} className="download-icon-crd" /> },
    ];

    const handleDownload = (type) => {
        console.log(`${type} download initiated`);
        // TODO: Implement actual download logic here
        // onClose();
    };

    return (
        <div className="variable-modal-overlay">
            <div className="variable-modal-content download-modal-content">
                <div className="variable-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            width: '4px',
                            height: '18px',
                            backgroundColor: '#16a34a',
                            borderRadius: '4px',
                            marginRight: '8px'
                        }}></div>
                        <h3 className="variable-modal-title">데이터 다운로드</h3>
                    </div>
                    <button onClick={onClose} className="variable-modal-close"><X size={20} /></button>
                </div>

                <div className="variable-modal-body">
                    <p className="download-modal-desc">원하는 형식의 파일을 선택하여 다운로드하세요.</p>
                    <div className="download-options-list">
                        {downloadList.map((item) => (
                            <div
                                key={item.id}
                                className="download-option-item"
                                onClick={() => handleDownload(item.id)}
                            >
                                <div className="download-option-left">
                                    <div className="download-icon-wrapper">
                                        {item.icon}
                                    </div>
                                    <span className="download-option-label">{item.label}</span>
                                </div>
                                <div className="download-action-btn">
                                    <Download size={16} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="variable-modal-footer">
                    <button onClick={onClose} className="btn-save" style={{ width: '100%' }}>닫기</button>
                </div>
            </div>
        </div>
    );
};

export default DownloadModal;
