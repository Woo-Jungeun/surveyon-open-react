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

                    {/* 경고 문구 추가 */}
                    <div style={{
                        marginBottom: '16px',
                        color: '#ef4444',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span style={{ fontSize: '13px' }}>⚠️</span>
                        <span>새로운 파일을 업로드할 경우, 기존 맵 구성 데이터가 모두 덮어씌워집니다.</span>
                    </div>

                    {/* 드래그 앤 드롭 영역 */}
                    <div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: `2px dashed ${isDragging ? '#16a34a' : '#cbd5e1'}`,
                            borderRadius: '8px',
                            padding: '40px 20px',
                            backgroundColor: isDragging ? '#f0faf5' : '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            marginBottom: '16px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div style={{
                            backgroundColor: '#f0faf5',
                            color: '#16a34a',
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '12px'
                        }}>
                            <UploadCloud size={24} />
                        </div>
                        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                            여기에 파일을 끌어다 놓거나 클릭하여 선택하세요
                        </p>
                    </div>

                    {/* 파일 선택 버튼 & 파일명 표시 영역 */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            // e.stopPropagation() necessary if button is clicked to avoid triggering the parent drag area click again (though currently the button is not overlapping).
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                padding: '10px 16px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                borderRadius: '6px',
                                color: '#334155',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                            파일 선택
                        </button>
                        <div style={{
                            flex: 1,
                            padding: '10px 16px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#e2e8f0',
                            borderRadius: '6px',
                            color: selectedFile ? '#334155' : '#94a3b8',
                            fontSize: '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
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
                    <button
                        onClick={handleModalClose}
                        style={{
                            padding: '10px 20px',
                            fontSize: '14px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            borderRadius: '6px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleUploadSubmit}
                        style={{
                            padding: '10px 20px',
                            fontSize: '14px',
                            border: 'none',
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            borderRadius: '6px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        업로드 시작
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;
