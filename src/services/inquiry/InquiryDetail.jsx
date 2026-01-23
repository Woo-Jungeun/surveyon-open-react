import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, MessageCircle, Lock, MessageCirclePlus } from 'lucide-react';
import './Inquiry.css';
import { InquiryApi } from './InquiryApi';
import moment from 'moment';

const InquiryDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [currentUserRole, setCurrentUserRole] = useState('USER'); // 'USER' or 'ADMIN' (테스트용)
    const [isAnswering, setIsAnswering] = useState(false);
    const [answerContent, setAnswerContent] = useState('');

    const { inquiryDetail } = InquiryApi();
    const [inquiryData, setInquiryData] = useState(null);

    useEffect(() => {
        if (id) {
            inquiryDetail.mutate({ id: id }, {
                onSuccess: (data) => {
                    // Map API response to UI structure
                    const mappedData = {
                        id: data.id,
                        category: data.category,
                        title: data.title,
                        writer: data.author,
                        createdAt: data.createdAt,
                        status: data.answer ? 'answered' : 'waiting',
                        isSecret: data.isSecret,
                        question: data.content,
                        answer: data.answer ? {
                            writer: data.answerer || '관리자',
                            date: data.answeredAt,
                            content: data.answer
                        } : null,
                        attachments: data.attachments || []
                    };
                    setInquiryData(mappedData);
                }
            });
        }
    }, [id]);

    if (!inquiryData) {
        return <div className="id-container" data-theme="board-inquiry">Loading...</div>;
    }

    // 날짜 데이터 가공
    const date = inquiryData.createdAt
        ? moment(inquiryData.createdAt).format('YYYY-MM-DD HH:mm:ss')
        : '';

    return (
        <div className="id-container" data-theme="board-inquiry">
            <button className="bw-back-btn" onClick={() => navigate('/inquiry')}>
                <ArrowLeft size={16} />
                목록으로
            </button>

            {/* 개발용 역할 전환 버튼 (배포 시 제거) */}
            <button
                onClick={() => setCurrentUserRole(prev => prev === 'USER' ? 'ADMIN' : 'USER')}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    padding: '8px 16px',
                    background: '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    zIndex: 1000
                }}
            >
                Current Role: {currentUserRole}
            </button>

            <div className="id-content-wrapper">
                {/* 질문 영역 (Q) */}
                <div className="id-section question-section">
                    <div className="id-header">
                        <div className="id-category-badge">
                            {inquiryData.category}
                        </div>
                        <div className={`id-status-badge ${inquiryData.status}`}>
                            {inquiryData.status === 'answered' ? '답변완료' : '답변대기'}
                        </div>
                        <h1 className="id-title">
                            {inquiryData.isSecret && <Lock size={20} className="id-secret-icon" />}
                            {inquiryData.title}
                        </h1>
                        <div className="id-meta">
                            <div className="id-meta-item">
                                <User size={14} />
                                <span>{inquiryData.writer}</span>
                            </div>
                            <div className="id-meta-divider">|</div>
                            <div className="id-meta-item">
                                <Calendar size={14} />
                                <span>{date}</span>
                            </div>
                        </div>
                    </div>
                    <div className="id-body">
                        <div className="id-label">Q.</div>
                        <div className="id-text" dangerouslySetInnerHTML={{ __html: inquiryData.question }} />
                    </div>

                    {/* 첨부파일 영역 */}
                    {inquiryData.attachments && inquiryData.attachments.length > 0 && (
                        <div className="id-attachments">
                            <div className="id-attachments-title">첨부파일 <span>{inquiryData.attachments.length}</span></div>
                            <ul className="id-attachments-list">
                                {inquiryData.attachments.map((file, index) => (
                                    <li key={index}>
                                        <a href="#" onClick={(e) => e.preventDefault()}>
                                            <span className="id-file-icon">📎</span>
                                            <span className="id-file-name">{file.originalName}</span>
                                            <span className="id-file-size">({(file.fileSize / 1024).toFixed(1)}KB)</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* 답변 영역 (A) */}
                <div className="id-section answer-section">
                    {isAnswering ? (
                        <div className="id-answer-form">
                            <div className="id-header answer-header">
                                <div className="id-answer-title">
                                    <MessageCircle size={20} />
                                    {inquiryData.answer ? '답변 수정' : '답변 작성'}
                                </div>
                            </div>
                            <div className="id-body answer-body">
                                <textarea
                                    className="id-answer-input"
                                    placeholder="답변 내용을 입력하세요."
                                    value={answerContent}
                                    onChange={(e) => setAnswerContent(e.target.value)}
                                />
                                <div className="id-answer-actions">
                                    <button className="id-btn id-btn-cancel" onClick={() => setIsAnswering(false)}>취소</button>
                                    <button className="id-btn id-btn-submit" onClick={() => {
                                        // 답변 등록/수정 로직
                                        console.log('답변 저장:', answerContent);
                                        setIsAnswering(false);
                                    }}>{inquiryData.answer ? '수정 완료' : '등록'}</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        inquiryData.answer ? (
                            <>
                                <div className="id-header answer-header">
                                    <div className="id-answer-title">
                                        <MessageCircle size={20} />
                                        관리자 답변
                                    </div>
                                    <div className="id-meta">
                                        <span>{inquiryData.answer.writer}</span>
                                        <span className="id-meta-divider">|</span>
                                        <span>{moment(inquiryData.answer.date).format('YYYY-MM-DD HH:mm:ss')}</span>
                                    </div>
                                </div>
                                <div className="id-body">
                                    <div className="id-label answer-label">A.</div>
                                    <div className="id-text" dangerouslySetInnerHTML={{ __html: inquiryData.answer.content }} />
                                </div>
                            </>
                        ) : (
                            <div className="id-no-answer">
                                <MessageCircle size={48} />
                                <p>아직 답변이 등록되지 않았습니다.</p>
                                <span>관리자가 내용을 확인하고 있습니다. 잠시만 기다려주세요.</span>
                            </div>
                        )
                    )}
                </div>

                <div className="id-footer">
                    {/* 작성자 본인일 경우에만 표시 */}
                    <div className="id-user-btns">
                        {currentUserRole === 'USER' && (
                            <>
                                <button className="id-btn id-btn-edit" onClick={() => navigate(`/inquiry/write/${id}`)}>문의 수정</button>
                                <button className="id-btn id-btn-delete">문의 삭제</button>

                                {/* 답변 완료 시 추가 질문하기 버튼 표시 */}
                                {inquiryData.status === 'answered' && (
                                    <button
                                        className="id-btn id-btn-reply"
                                        onClick={() => navigate('/inquiry/write', {
                                            state: {
                                                parentId: id,
                                                parentTitle: inquiryData.title
                                            }
                                        })}
                                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 16px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer' }}
                                    >
                                        <MessageCirclePlus size={16} />
                                        추가 질문하기
                                    </button>
                                )}
                            </>
                        )}
                        {currentUserRole === 'ADMIN' && (
                            inquiryData.answer ? (
                                !isAnswering && (
                                    <>
                                        <button className="id-btn id-btn-edit" onClick={() => {
                                            // HTML 태그 제거 후 텍스트만 추출 (간단한 예시)
                                            const textContent = inquiryData.answer.content.replace(/<[^>]*>?/gm, '');
                                            setAnswerContent(textContent);
                                            setIsAnswering(true);
                                        }}>답변 수정</button>
                                        <button className="id-btn id-btn-delete">답변 삭제</button>
                                    </>
                                )
                            ) : (
                                !isAnswering && (
                                    <button className="id-btn id-btn-register" onClick={() => {
                                        setAnswerContent('');
                                        setIsAnswering(true);
                                    }}>답변 등록</button>
                                )
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InquiryDetail;
