import React, { useState, useContext } from 'react';
import { useSelector } from 'react-redux';
import { Download, X, FileText, FileCode } from 'lucide-react';
import { MapManagementPageApi } from './MapManagementPageApi';
import { modalContext } from "@/components/common/Modal.jsx";
import moment from 'moment';
import './MapManagementPage.css';

const DownloadModal = ({ isOpen, onClose }) => {
    const { exportData } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);

    if (!isOpen) return null;

    const downloadList = [
        { id: 'sav', label: 'SPS (.sav) 다운로드', icon: <FileText size={24} className="download-icon-sps" /> },
        { id: 'crd', label: 'CRD (.zip) 다운로드', icon: <FileCode size={24} className="download-icon-crd" />, disabled: true },
    ];

    const handleDownload = async (item) => {
        if (item.disabled) return;
        const { id: type } = item;
        try {
            const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
            const userId = auth?.user?.userId || '';

            if (!pn) {
                modal.showErrorAlert("알림", "프로젝트 정보를 찾을 수 없습니다.");
                return;
            }

            const payload = {
                pn: pn,
                gb: type,
                user: userId,
                answerstatecode: "4" // 완료 고정
            };

            const res = await exportData.mutateAsync(payload);
            const blob = res?.data instanceof Blob ? res.data : (res instanceof Blob ? res : null);

            if (!blob) {
                modal.showErrorAlert("에러", "파일을 생성하지 못했습니다.");
                return;
            }

            // 응답이 JSON 에러인 경우 처리 (Blob 타입 체크)
            if (blob.type?.includes("application/json")) {
                modal.showErrorAlert("에러", "다운로드 요청이 거부되었습니다.");
                return;
            }

            // 파일명 설정: [PN]_Data_[시간].[확장자]
            const timestamp = moment().format("YYYYMMDDHHmmss");
            const filename = `${pn}_Data_${timestamp}.${type}`;

            // 브라우저 다운로드 실행
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            // 성공 시 닫기 (선택 사항)
            // onClose();
        } catch (error) {
            console.error(`${type} download error:`, error);
            modal.showErrorAlert("에러", `${type} 다운로드 중 오류가 발생했습니다.`);
        }
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
                        <h3 className="variable-modal-title">다운로드</h3>
                    </div>
                    <button onClick={onClose} className="variable-modal-close"><X size={20} /></button>
                </div>

                <div className="variable-modal-body">
                    <p className="download-modal-desc">원하는 형식의 파일을 선택하여 다운로드하세요.</p>
                    <div className="download-options-list">
                        {downloadList.map((item) => (
                            <div
                                key={item.id}
                                className={`download-option-item ${item.disabled ? 'disabled' : ''}`}
                                onClick={() => handleDownload(item)}
                                style={item.disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
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
                    <button onClick={onClose} className="btn-save" style={{ width: '100%', height: '48px', fontSize: '15px' }}>닫기</button>
                </div>
            </div>
        </div>
    );
};

export default DownloadModal;
