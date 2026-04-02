import React, { useRef, useState, useContext } from 'react';
import { UploadCloud, X, Info } from 'lucide-react';
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from 'react-redux';
import { MapManagementPageApi } from './MapManagementPageApi';
import './MapManagementPage.css';

const DataUpdateModal = ({ isOpen, onClose, refreshData }) => {
    const fileInputRef = useRef(null);
    const modal = useContext(modalContext);
    const { updateDataFromSav } = MapManagementPageApi();
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
            modal.showErrorAlert("알림", "업데이트할 파일을 선택해주세요.");
            return;
        }

        // 확장자 확인 (.sav)
        const fileName = selectedFile.name.toLowerCase();
        if (!fileName.endsWith('.sav')) {
            modal.showErrorAlert("알림", ".sav 형식의 파일만 업데이트할 수 있습니다.");
            return;
        }

        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const projectName = sessionStorage.getItem('projectname');
        const userId = auth?.user?.userId || '';

        if (!pn) {
            modal.showErrorAlert("알림", "프로젝트 정보를 찾을 수 없습니다.");
            return;
        }

        modal.showConfirm("알림", "불러오기 완료 시 기존 내용으로의 복구가 절대 불가능하므로 \n 신중히 확인해 주세요.\n 데이터 불러오기를 계속 진행하시겠습니까?", {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "시작",
                    click: async () => {
                        const formData = new FormData();
                        formData.append("pn", pn);
                        formData.append("file", selectedFile);
                        if (userId) formData.append("user", userId);

                        try {
                            const res = await updateDataFromSav.mutateAsync(formData);

                            if (res?.success === "777") {
                                // 1. 성공 시 팝업 닫기
                                handleModalClose();
                                // 2. 알림 메시지 띄우기 (확인 버튼 누를 때까지 대기)
                                await modal.showAlert("알림", "데이터 불러오기 처리가 완료되었습니다.", { zIndex: 99999 });
                                // 3. 맵 구성 조회 API 태우기 (재조회)
                                if (refreshData) refreshData();
                            } else if (res?.success === "907") {
                                let duplicatePids = [
                                    "중복PID값1",
                                    "중복PID값2",
                                    "중복PID값3"
                                ];
                                if (res?.resultjson && Array.isArray(res.resultjson)) {
                                    duplicatePids = res.resultjson;
                                }
                                const pidsText = duplicatePids.length > 0 ? ` (중복된 PID: ${duplicatePids.join(", ")})` : "";

                                modal.showErrorAlert("에러", (res?.message || "SAV 파일 내에 중복된 고유 식별자(PID)가 존재하여 업데이트가 중단되었습니다.") + "\n" + pidsText, { zIndex: 99999 });
                            } else if (res?.success === "909") {
                                let errorDetails = res?.message || "SAV 파일과 프로젝트 맵(Map) 구조가 일치하지 않아 데이터 오염 방지를 위해 업데이트가 거부되었습니다.";
                                if (res?.resultjson) {
                                    const { missingInDb, missingInSav } = res.resultjson;
                                    if (missingInDb && missingInDb.length > 0) {
                                        errorDetails += `\n\n[SAV에만 존재하는 문항]:\n${missingInDb.join(", ")}`;
                                    }
                                    if (missingInSav && missingInSav.length > 0) {
                                        errorDetails += `\n\n[DB(맵 구성)에만 선언되어 있는 문항]:\n${missingInSav.join(", ")}`;
                                    }
                                }
                                modal.showErrorAlert("구조 불일치 에러", errorDetails, { zIndex: 99999 });
                            } else {
                                const errorMsg = res?.errortext || res?.message || "데이터 불러오기 중 오류가 발생했습니다.";
                                modal.showErrorAlert("에러", errorMsg, { zIndex: 99999 });
                            }
                        } catch (error) {
                            console.error("Update error:", error);
                            modal.showErrorAlert("에러", "데이터 불러오기 요청 중 오류가 발생했습니다.", { zIndex: 99999 });
                        }
                    }
                }
            ]
        });
    };

    const handleFileSelectClick = (e) => {
        if (e) e.stopPropagation();
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleClearFile = (e) => {
        if (e) e.stopPropagation();
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
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
            <div className="variable-modal-content download-modal-content upload-modal-content">
                <div className="variable-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            width: '4px',
                            height: '18px',
                            backgroundColor: '#16a34a',
                            borderRadius: '4px',
                            marginRight: '8px'
                        }}></div>
                        <h3 className="variable-modal-title">데이터 불러오기</h3>
                    </div>
                    <button onClick={handleModalClose} className="variable-modal-close"><X size={20} /></button>
                </div>

                <div className="variable-modal-body" style={{ padding: '24px' }}>

                    {/* 경고 문구 추가 (타이틀 바로 아래) */}
                    <div className="upload-modal-warning">
                        <span className="upload-icon-warning">⚠️</span>
                        <span>파일을 업로드할 경우, 기존 맵 구성 데이터가 모두 덮어씌워집니다.</span>
                    </div>

                    {/* 데이터 불러오기 주의사항 (상단) */}
                    <div className="update-info-box">
                        <div className="update-info-title">
                            <Info size={16} />
                            <span>파일 업로드 주의사항</span>
                        </div>
                        <ul className="update-info-list" style={{ listStyle: 'none', paddingLeft: 0, marginTop: '4px' }}>
                            <li style={{ marginBottom: '6px' }}><span style={{ color: '#16a34a', marginRight: '6px' }}>✔</span> 이 기능은 데이터 불러오기 전용으로, 데이터 <strong>신규 입력은 지원하지 않습니다.</strong></li>
                            <li style={{ marginBottom: '6px' }}><span style={{ color: '#16a34a', marginRight: '6px' }}>✔</span> <strong>SPSS 파일(.sav)</strong> 형식만 지원합니다.</li>
                            <li style={{ marginBottom: '6px' }}><span style={{ color: '#16a34a', marginRight: '6px' }}>✔</span> 첫 번째 데이터 필드는 반드시 <strong><span className="update-info-highlight">pid</span></strong>여야 합니다.</li>
                            <li style={{ marginBottom: '6px' }}><span style={{ color: '#16a34a', marginRight: '6px' }}>✔</span> pid는 Key 값이므로 <strong>데이터 중복이 허용되지 않습니다.</strong></li>
                            <li style={{ marginBottom: '6px' }}><span style={{ color: '#16a34a', marginRight: '6px' }}>✔</span> pid에 문제(중복, 특수문자 등)가 있을 경우 <strong>업로드가 진행되지 않습니다.</strong></li>
                            <li style={{ marginBottom: '6px' }}><span style={{ color: '#16a34a', marginRight: '6px' }}>✔</span> 기존 필드명과 <strong>매칭되지 않는 값은 업데이트 시 무시</strong>됩니다.</li>
                            <li style={{ marginTop: '6px' }}><span style={{ color: '#16a34a', marginRight: '6px' }}>✔</span> 사이트에서 <strong>sav 파일로 데이터를 내려받으신 후 수정</strong>하시는 것을 권장드립니다.</li>
                        </ul>
                    </div>

                    {/* 드래그 앤 드롭 영역 */}
                    <div
                        className={`upload-drag-area ${isDragging ? 'dragging' : ''}`}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={handleFileSelectClick}
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
                            onClick={handleFileSelectClick}
                        >
                            파일 선택
                        </button>
                        <div className={`upload-file-name ${selectedFile ? 'has-file' : ''}`}>
                            {selectedFile ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                                        {selectedFile.name}
                                    </span>
                                    <button
                                        className="upload-file-clear-btn"
                                        onClick={handleClearFile}
                                        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: '2px' }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : '선택된 파일이 없습니다'}
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
                        업데이트 시작
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataUpdateModal;
