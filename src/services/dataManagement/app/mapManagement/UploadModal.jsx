import React, { useRef, useState, useContext } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from 'react-redux';
import { MapManagementPageApi } from './MapManagementPageApi';
import './MapManagementPage.css';

const UploadModal = ({ isOpen, onClose, refreshData }) => {
    const fileInputRef = useRef(null);
    const modal = useContext(modalContext);
    const { uploadSpss } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);

    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
            if (fileInputRef.current) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(e.dataTransfer.files[0]);
                fileInputRef.current.files = dataTransfer.files;
            }
        }
    };

    const handleUploadSubmit = async () => {
        if (!selectedFile) {
            modal.showErrorAlert("알림", "업로드할 파일을 선택해주세요.");
            return;
        }

        // 확장자 확인 (.sav)
        const fileName = selectedFile.name.toLowerCase();
        if (!fileName.endsWith('.sav')) {
            modal.showErrorAlert("알림", ".sav 형식의 파일만 업로드할 수 있습니다.");
            return;
        }

        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const projectName = sessionStorage.getItem('projectname');
        const userId = auth?.user?.userId || '';

        if (!pn) {
            modal.showErrorAlert("알림", "프로젝트 정보를 찾을 수 없습니다.");
            return;
        }

        const formData = new FormData();
        formData.append("pn", pn);
        formData.append("file", selectedFile);
        formData.append("gb", "spss");
        if (projectName) formData.append("projectName", projectName);
        if (userId) formData.append("user", userId);
        try {
            const res = await uploadSpss.mutateAsync(formData);

            if (res?.success === "777") {
                // 1. 성공 시 팝업 닫기
                handleModalClose();
                // 2. 알림 메시지 띄우기 (확인 버튼 누를 때까지 대기)
                await modal.showAlert("알림", "파일 업로드가 완료되었습니다.");
                // 3. 맵 구성 조회 API 태우기 (재조회)
                if (refreshData) refreshData();
            } else {
                const errorMsg = res?.errortext || res?.message || "파일 업로드 중 오류가 발생했습니다.";
                modal.showErrorAlert("에러", errorMsg);
            }
        } catch (error) {
            console.error("Upload error:", error);
            modal.showErrorAlert("에러", "파일 업로드 요청 중 오류가 발생했습니다.");
        }
    };

    const handleModalClose = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        onClose();
    };

    return (
        <div className="variable-modal-overlay">
            <div className="variable-modal-content download-modal-content" style={{ width: '500px' }}>
                <div className="variable-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            width: '4px',
                            height: '18px',
                            backgroundColor: '#16a34a',
                            borderRadius: '4px',
                            marginRight: '8px'
                        }}></div>
                        <h3 className="variable-modal-title">업로드</h3>
                    </div>
                    <button onClick={handleModalClose} className="variable-modal-close"><X size={20} /></button>
                </div>

                <div className="variable-modal-body" style={{ padding: '24px' }}>

                    {/* 경고 문구 추가 (타이틀 바로 아래) */}
                    <div className="upload-modal-warning">
                        <span className="upload-icon-warning">⚠️</span>
                        <span>새로운 파일을 업로드할 경우, 기존 맵 구성 데이터가 모두 덮어씌워집니다.</span>
                    </div>

                    {/* 드래그 앤 드롭 영역 */}
                    <div
                        className={`upload-drag-area ${isDragging ? 'dragging' : ''}`}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="upload-drag-icon">
                            <UploadCloud size={24} />
                        </div>
                        <p className="upload-drag-text">
                            여기에 파일을 끌어다 놓거나 클릭하여 선택하세요
                        </p>
                    </div>

                    {/* 파일 선택 버튼 & 파일명 표시 영역 */}
                    <div className="upload-file-display-area">
                        <button
                            className="upload-file-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                            }}
                        >
                            파일 선택
                        </button>
                        <div className={`upload-file-name ${selectedFile ? 'has-file' : ''}`}>
                            {selectedFile ? selectedFile.name : '선택된 파일이 없습니다'}
                        </div>
                    </div>


                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        accept=".sav"
                    />
                </div>

                <div className="variable-modal-footer" style={{ borderTop: 'none', padding: '0 24px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="upload-cancel-btn" onClick={handleModalClose}>
                        취소
                    </button>
                    <button className="upload-submit-btn" onClick={handleUploadSubmit}>
                        업로드 시작
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;
