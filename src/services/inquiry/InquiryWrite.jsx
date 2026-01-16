import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Lock, Unlock, Upload, X, FileText } from 'lucide-react';
import './InquiryWrite.css';

const InquiryWrite = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // id가 있으면 수정 모드
    const isEdit = !!id;

    const [title, setTitle] = useState(isEdit ? '[임시] 수정할 제목' : '');
    const [content, setContent] = useState(isEdit ? '수정할 내용...' : '');
    const [isSecret, setIsSecret] = useState(true);
    const [files, setFiles] = useState([]);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selectedFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        if (!title.trim() || !content.trim()) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }
        alert(isEdit ? '문의가 수정되었습니다.' : '문의가 등록되었습니다.');
        navigate(isEdit ? `/inquiry/view/${id}` : '/inquiry');
    };

    return (
        <div className="iw-container" data-theme="board-inquiry">
            <button className="bw-back-btn" onClick={() => navigate(isEdit ? `/inquiry/view/${id}` : '/inquiry')}>
                <ArrowLeft size={16} />
                {isEdit ? '이전으로' : '목록으로'}
            </button>

            <div className="iw-content-wrapper">
                <div className="iw-header">
                    <h1 className="iw-page-title">문의하기 {isEdit ? '수정' : '작성'}</h1>
                    <p className="iw-page-desc">
                        문의하신 내용은 관리자 확인 후 답변해 드립니다.
                    </p>
                </div>

                <div className="iw-form">
                    <div className="iw-form-group">
                        <label>제목</label>
                        <input
                            type="text"
                            className="iw-input"
                            placeholder="제목을 입력하세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="iw-form-group">
                        <label>내용</label>
                        <textarea
                            className="iw-textarea"
                            placeholder="문의하실 내용을 자세히 적어주세요."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="iw-form-group">
                        <label>첨부파일</label>
                        <div className="iw-file-upload">
                            <input
                                type="file"
                                id="file-input"
                                multiple
                                onChange={handleFileChange}
                                className="iw-file-input"
                            />
                            <label htmlFor="file-input" className="iw-file-label">
                                <Upload size={16} />
                                파일 선택
                            </label>
                            <span className="iw-file-info">최대 5개, 20MB 이하</span>
                        </div>

                        {files.length > 0 && (
                            <ul className="iw-file-list">
                                {files.map((file, index) => (
                                    <li key={index}>
                                        <span className="iw-file-name">{file.name}</span>
                                        <span className="iw-file-size">({(file.size / 1024).toFixed(1)}KB)</span>
                                        <button
                                            className="iw-file-remove"
                                            onClick={() => removeFile(index)}
                                        >
                                            <X size={14} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="iw-form-group">
                        <label>공개 설정</label>
                        <div className="iw-secret-toggle">
                            <button
                                className={`secret-btn ${!isSecret ? 'active' : ''}`}
                                onClick={() => setIsSecret(false)}
                            >
                                <Unlock size={16} />
                                공개
                            </button>
                            <button
                                className={`secret-btn ${isSecret ? 'active' : ''}`}
                                onClick={() => setIsSecret(true)}
                            >
                                <Lock size={16} />
                                비공개
                            </button>
                            <span className="secret-desc">
                                {isSecret ? '작성자와 관리자만 볼 수 있습니다.' : '모든 사용자가 볼 수 있습니다.'}
                            </span>
                        </div>
                    </div>

                    <div className="iw-footer">
                        <button className="iw-btn iw-btn-cancel" onClick={() => navigate(isEdit ? `/inquiry/view/${id}` : '/inquiry')}>
                            취소
                        </button>
                        <button className="iw-btn iw-btn-submit" onClick={handleSubmit}>
                            <Save size={16} />
                            {isEdit ? '수정 완료' : '등록하기'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InquiryWrite;
