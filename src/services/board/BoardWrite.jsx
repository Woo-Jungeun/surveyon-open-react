import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, X, Type, FileText } from 'lucide-react';
import './BoardWrite.css';

const BoardWrite = () => {
    const { type, id } = useParams(); // id가 있으면 수정 모드
    const navigate = useNavigate();
    const isEdit = !!id;

    const [title, setTitle] = useState(isEdit ? '[임시] 수정할 제목' : '');
    const [content, setContent] = useState(isEdit ? '수정할 내용...' : '');
    const [files, setFiles] = useState([]);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selectedFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const boardConfig = {
        notice: {
            title: '공지사항',
            color: '#7C9CBF',
        },
        patchnotes: {
            title: 'Patch Notes',
            color: '#9B8FAA',
        }
    };

    const config = boardConfig[type] || boardConfig.notice;

    const handleSubmit = () => {
        if (!title.trim() || !content.trim()) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }
        // API 호출 로직 (추후 구현)
        alert(isEdit ? '수정되었습니다.' : '등록되었습니다.');
        navigate(`/board/${type}`);
    };

    return (
        <div className="bw-container" style={{ '--board-color': config.color }}>
            <button className="bw-back-btn" onClick={() => navigate(isEdit ? `/board/${type}/${id}` : `/board/${type}`)}>
                <ArrowLeft size={16} />
                {isEdit ? '이전으로' : '목록으로'}
            </button>

            <div className="bw-content-wrapper">
                <div className="bw-header">
                    <h1 className="bw-page-title">{config.title} {isEdit ? '수정' : '등록'}</h1>
                </div>

                <div className="bw-form">
                    <div className="bw-form-group">
                        <label>
                            {/* <Type size={16} /> */}
                            제목
                        </label>
                        <input
                            type="text"
                            className="bw-input"
                            placeholder="제목을 입력하세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="bw-form-group">
                        <label>
                            {/* <FileText size={16} /> */}
                            내용
                        </label>
                        <textarea
                            className="bw-textarea"
                            placeholder="내용을 입력하세요"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="bw-form-group">
                        <label>첨부파일</label>
                        <div className="bw-file-upload">
                            <input
                                type="file"
                                id="file-input"
                                multiple
                                onChange={handleFileChange}
                                className="bw-file-input"
                            />
                            <label htmlFor="file-input" className="bw-file-label">
                                <Upload size={16} />
                                파일 선택
                            </label>
                            <span className="bw-file-info">최대 5개, 20MB 이하</span>
                        </div>

                        {files.length > 0 && (
                            <ul className="bw-file-list">
                                {files.map((file, index) => (
                                    <li key={index}>
                                        <span className="bw-file-name">{file.name}</span>
                                        <span className="bw-file-size">({(file.size / 1024).toFixed(1)}KB)</span>
                                        <button
                                            className="bw-file-remove"
                                            onClick={() => removeFile(index)}
                                        >
                                            <X size={14} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="bw-footer">
                    <button className="bw-btn bw-btn-cancel" onClick={() => navigate(isEdit ? `/board/${type}/${id}` : `/board/${type}`)}>
                        취소
                    </button>
                    <button className="bw-btn bw-btn-submit" onClick={handleSubmit}>
                        <Save size={16} />
                        {isEdit ? '수정 완료' : '등록하기'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BoardWrite;
