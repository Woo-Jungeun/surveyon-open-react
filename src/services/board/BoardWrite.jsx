import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, X, Type, FileText, Lock, LockOpen, Tag } from 'lucide-react';
import './Board.css';
import { BoardApi } from "@/services/board/BoardApi";
import { modalContext } from "@/components/common/Modal";

const BoardWrite = () => {
    const { type, id } = useParams(); // id가 있으면 수정 모드
    const navigate = useNavigate();
    const isEdit = !!id;
    const modal = useContext(modalContext);

    // API 연동
    const { noticeTransaction, patchNotesTransaction, noticeDetail, patchNotesDetail } = BoardApi();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [version, setVersion] = useState(''); // 패치노트용
    const [isSecret, setIsSecret] = useState(false);
    const [files, setFiles] = useState([]);

    // 수정 모드일 경우 데이터 불러오기
    useEffect(() => {
        if (isEdit) {
            const fetchData = async () => {
                try {
                    let result;
                    if (type === 'notice') {
                        result = await noticeDetail.mutateAsync({ id: id });
                    } else if (type === 'patchnotes') {
                        result = await patchNotesDetail.mutateAsync({ id: id });
                    }

                    if (result) {
                        const data = result.resultjson || result.data || result;
                        setTitle(data.title || '');
                        setContent(data.content || '');
                        setIsSecret(!data.isVisible); // isVisible이 true면 공개, false면 비공개(isSecret=true)
                        if (type === 'patchnotes') {
                            setVersion(data.version || '');
                        }
                        // 첨부파일 처리 로직은 추후 구현 (현재는 UI만)
                    }
                } catch (error) {
                    console.error("Failed to fetch detail:", error);
                    modal.showErrorAlert('오류', '데이터를 불러오는 중 오류가 발생했습니다.');
                }
            };
            fetchData();
        }
    }, [isEdit, type, id]);

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
            color: 'var(--board-notice-color)',
        },
        patchnotes: {
            title: 'Patch Notes',
            color: 'var(--board-patchnotes-color)',
        }
    };

    const config = boardConfig[type] || boardConfig.notice;

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            modal.showAlert('알림', '제목과 내용을 모두 입력해주세요.');
            return;
        }

        if (type === 'patchnotes' && !version.trim()) {
            modal.showAlert('알림', '버전을 입력해주세요.');
            return;
        }

        const payload = {
            gb: isEdit ? 'update' : 'insert',
            title: title,
            content: content,
            isVisible: !isSecret,
            author: "관리자",
            hasAttachment: files.length > 0,
            attachments: [] // 첨부파일 처리는 추후 구현
        };

        if (isEdit) {
            payload.id = id;
        }

        if (type === 'patchnotes') {
            payload.version = version;
        }

        try {
            let result;
            if (type === 'notice') {
                result = await noticeTransaction.mutateAsync(payload);
            } else if (type === 'patchnotes') {
                result = await patchNotesTransaction.mutateAsync(payload);
            }

            if (result) {
                modal.showAlert('알림', isEdit ? '수정되었습니다.' : '등록되었습니다.', null, () => {
                    // 등록 성공 시 새로 생성된 ID로 이동, 수정 시 기존 ID로 이동
                    const targetId = isEdit ? id : result.id;
                    navigate(`/board/${type}/${targetId}`);
                });
            }
        } catch (error) {
            console.error("Transaction failed:", error);
            modal.showErrorAlert('오류', '처리 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="bw-container" data-theme={`board-${type}`}>
            <button className="bw-back-btn" onClick={() => navigate(isEdit ? `/board/${type}/${id}` : `/board/${type}`)}>
                <ArrowLeft size={16} />
                {isEdit ? '이전으로' : '목록으로'}
            </button>

            <div className="bw-content-wrapper">
                <div className="bw-header">
                    <h1 className="bw-page-title">{config.title} {isEdit ? '수정' : '등록'}</h1>
                </div>

                <div className="bw-form">
                    {type === 'patchnotes' && (
                        <div className="bw-form-group">
                            <label>
                                <Tag size={16} />
                                버전
                            </label>
                            <input
                                type="text"
                                className="bw-input"
                                placeholder="버전을 입력하세요 (예: v1.0.0)"
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                            />
                        </div>
                    )}

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

                    <div className="bw-form-group">
                        <label>공개 설정</label>
                        <div className="bw-visibility-toggle">
                            <button
                                type="button"
                                className={`bw-visibility-btn ${!isSecret ? 'active' : ''}`}
                                onClick={() => setIsSecret(false)}
                            >
                                <LockOpen size={16} />
                                공개
                            </button>
                            <button
                                type="button"
                                className={`bw-visibility-btn ${isSecret ? 'active' : ''}`}
                                onClick={() => setIsSecret(true)}
                            >
                                <Lock size={16} />
                                비공개
                            </button>
                            {isSecret && (
                                <span className="bw-visibility-desc">작성자와 관리자만 볼 수 있습니다.</span>
                            )}
                        </div>
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
