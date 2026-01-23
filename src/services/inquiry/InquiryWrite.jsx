import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Lock, Unlock, Upload, X, FileText, CornerDownRight, ChevronDown } from 'lucide-react';
import { InquiryApi } from './InquiryApi';
import './Inquiry.css';
import { useSelector } from "react-redux";
import { useContext } from 'react';
import { modalContext } from "@/components/common/Modal";

const InquiryWrite = () => {
    const navigate = useNavigate();
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const userName = auth?.user?.userNm || "";
    const userId = auth?.user?.userId || "";
    const userGroup = auth?.user?.userGroup || "";
    const isAdmin = userGroup.includes("솔루션") ? 1 : 0;

    const { id } = useParams(); // id가 있으면 수정 모드
    const location = useLocation();
    const isEdit = !!id;

    // 답글(추가 질문) 모드 확인
    const parentId = location.state?.parentId;
    const parentTitle = location.state?.parentTitle;

    const isReply = !!parentId;

    // API 초기화
    const { inquiryTransaction, inquiryDetail } = InquiryApi();

    const categories = ['설문제작', '데이터현황', '데이터관리', 'AI오픈분석', '응답자관리', '기타'];
    const [category, setCategory] = useState(categories[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [title, setTitle] = useState(
        isReply ? `[RE]: ${parentTitle}` : ''
    );
    const [content, setContent] = useState('');
    const [isSecret, setIsSecret] = useState(true);
    const [files, setFiles] = useState([]);

    // 수정 모드일 때 기존 데이터 불러오기
    useEffect(() => {
        if (isEdit && id) {
            const fetchInquiryData = async () => {
                try {
                    const response = await inquiryDetail.mutateAsync({ id: parseInt(id), userId: userId, is_admin: isAdmin });
                    console.log('수정 데이터:', response);

                    if (response) {
                        setCategory(response.category || categories[0]);
                        setTitle(response.title || '');
                        setContent(response.content || '');
                        setIsSecret(response.isSecret ?? true);
                        // attachments가 있다면 처리 (필요시)
                        // setFiles(response.attachments || []);
                    }
                } catch (error) {
                    console.error('문의 데이터 로드 실패:', error);
                    modal.showErrorAlert('오류', '문의 데이터를 불러오는데 실패했습니다.');
                    navigate('/inquiry');
                }
            };

            fetchInquiryData();
        }
    }, [isEdit, id]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selectedFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            modal.showAlert('알림', '제목과 내용을 모두 입력해주세요.');
            return;
        }


        try {
            const payload = {
                gb: isEdit ? "update" : "insert",
                category,
                title,
                content,
                isSecret,
                password: "",
                author: userName,
                userId: userId,
                is_admin: isAdmin,
                attachments: files.length > 0 ? files : []
            };

            // 수정 모드인 경우 id 추가
            if (isEdit) {
                payload.id = parseInt(id);
            }

            // 답글 모드인 경우 parentId 추가
            if (isReply) {
                payload.parentId = parentId;
            }

            const response = await inquiryTransaction.mutateAsync(payload);
            console.log(response);

            if (response?.id) {
                modal.showAlert('알림', isEdit ? '문의가 수정되었습니다.' : '문의가 등록되었습니다.', null, () => {
                    // 등록 성공 시 새로 생성된 ID로 이동, 수정 시 기존 ID로 이동
                    navigate(isEdit ? `/inquiry/view/${id}` : `/inquiry/view/${response.id}`);
                });
            } else {
                throw new Error('응답 데이터가 없습니다.');
            }
        } catch (error) {
            console.error('문의 등록/수정 실패:', error);
            modal.showErrorAlert('오류', `문의 ${isEdit ? '수정' : '등록'}에 실패했습니다. 다시 시도해주세요.`);
        }
    };

    return (
        <div className="iw-container" data-theme="board-inquiry">
            <button className="bw-back-btn" onClick={() => navigate(isEdit ? `/inquiry/view/${id}` : '/inquiry')}>
                <ArrowLeft size={16} />
                {isEdit ? '이전으로' : '목록으로'}
            </button>

            <div className="iw-content-wrapper">
                <div className="iw-header">
                    <h1 className="iw-page-title">
                        문의하기 {isEdit ? '수정' : isReply ? '추가 질문 작성' : '작성'}
                    </h1>
                    {isReply && (
                        <div className="iw-reply-info" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '14px', marginTop: '8px' }}>
                            <CornerDownRight size={16} />
                            <span>원글: {parentTitle}</span>
                        </div>
                    )}
                    <p className="iw-page-desc">
                        문의하신 내용은 관리자 확인 후 답변해 드립니다.
                    </p>
                </div>

                <div className="iw-form">
                    <div className="iw-form-row">
                        <div className="iw-form-group category-group">
                            <label>카테고리</label>
                            <div className="iw-select-wrapper" ref={dropdownRef}>
                                <div
                                    className={`iw-select-trigger ${isDropdownOpen ? 'active' : ''}`}
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                >
                                    <span>{category}</span>
                                    <ChevronDown className={`iw-select-icon ${isDropdownOpen ? 'rotate' : ''}`} size={16} />
                                </div>

                                {isDropdownOpen && (
                                    <ul className="iw-select-dropdown">
                                        {categories.map((cat) => (
                                            <li
                                                key={cat}
                                                className={`iw-select-option ${category === cat ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setCategory(cat);
                                                    setIsDropdownOpen(false);
                                                }}
                                            >
                                                {cat}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="iw-form-group title-group">
                            <label>제목</label>
                            <input
                                type="text"
                                className="iw-input"
                                placeholder="제목을 입력하세요"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
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
