import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, MessageCircle, Lock, MessageCirclePlus, List } from 'lucide-react';
import './Inquiry.css';
import { InquiryApi } from './InquiryApi';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { modalContext } from "@/components/common/Modal";

const InquiryDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const userName = auth?.user?.userNm || "관리자";
    const userId = auth?.user?.userId || "";
    const userGroup = auth?.user?.userGroup || "";

    const isAdmin = userGroup.includes("솔루션") ? 1 : 0;

    const [isAnswering, setIsAnswering] = useState(false);
    const [answerContent, setAnswerContent] = useState('');

    const maskName = (name) => {
        if (!name || name.length < 2) return name;
        if (name.length === 2) return name[0] + '*';
        return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
    };

    const { inquiryDetail, inquiryTransaction } = InquiryApi();
    const [inquiryData, setInquiryData] = useState(null);

    useEffect(() => {
        if (id) {
            inquiryDetail.mutate({ id: id, user: userId, is_admin: isAdmin }, {
                onSuccess: (res) => {
                    if (res?.success === "777") {
                        const data = res.resultjson || res.data || res;
                        const mappedData = {
                            id: data.id,
                            parentId: data.parentId || null,
                            category: data.category,
                            title: data.title,
                            writer: data.author || data.userNm,
                            writerId: data.userId || data.user_id || data.user || data.authorId || data.author_id || data.regId || data.reg_id || '',
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
                    } else {
                        modal.showErrorAlert('오류', '데이터를 불러오는데 실패했습니다.');
                        navigate('/inquiry');
                    }
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
            <div className="id-nav-group">
                <button className="id-nav-btn" onClick={() => navigate('/inquiry')}>
                    <List size={18} />
                    목록
                </button>
            </div>



            <div className={`id-content-wrapper ${isAnswering ? 'answering-mode' : ''}`}>
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
                    {/* {inquiryData.attachments && inquiryData.attachments.length > 0 && (
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
                    )} */}
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
                                    <button className="id-btn id-btn-submit" onClick={async () => {
                                        if (!answerContent.trim()) {
                                            modal.showAlert('알림', '답변 내용을 입력해주세요.');
                                            return;
                                        }

                                        try {
                                            const payload = {
                                                gb: "update",
                                                id: parseInt(id),
                                                answer: answerContent,
                                                answerer: userName,
                                                user: userId,
                                                is_admin: isAdmin
                                            };

                                            const response = await inquiryTransaction.mutateAsync(payload);

                                            if (response?.success === "777") {
                                                modal.showAlert('알림', inquiryData.answer ? '답변이 수정되었습니다.' : '답변이 등록되었습니다.');
                                                setIsAnswering(false);

                                                // 데이터 새로고침
                                                inquiryDetail.mutate({ id: id, user: userId, is_admin: isAdmin }, {
                                                    onSuccess: (res) => {
                                                        if (res?.success === "777") {
                                                            const data = res.resultjson || res.data || res;
                                                            const mappedData = {
                                                                id: data.id,
                                                                parentId: data.parentId || null,
                                                                category: data.category,
                                                                title: data.title,
                                                                writer: data.author || data.userNm,
                                                                writerId: data.userId || data.user_id || data.user || data.authorId || data.author_id || data.regId || data.reg_id || '',
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
                                                    }
                                                });
                                            } else {
                                                modal.showErrorAlert('오류', '답변 저장에 실패했습니다.');
                                            }
                                        } catch (error) {
                                            console.error('답변 저장 실패:', error);
                                            modal.showErrorAlert('오류', '답변 저장에 실패했습니다. 다시 시도해주세요.');
                                        }
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

                {!isAnswering && (
                    <div className="id-footer">
                        <div className="id-user-btns">
                            {/* 작성자 본인일 경우(일반사용자 혹은 관리자 작성글) 표시 */}
                            {(String(inquiryData.writerId) === String(userId) || inquiryData.writer === maskName(userName) || inquiryData.writer === userName) && (
                                <>
                                    {inquiryData.status !== 'answered' && (
                                        <>
                                            <button className="id-btn id-btn-edit" onClick={() => navigate(`/inquiry/write/${id}`)}>문의 수정</button>
                                            <button className="id-btn id-btn-delete" onClick={() => {
                                                modal.showConfirm('알림', '정말 이 문의를 삭제하시겠습니까?', {
                                                    btns: [
                                                        { title: "취소", click: () => { } },
                                                        {
                                                            title: "확인",
                                                            click: async () => {
                                                                try {
                                                                    const payload = {
                                                                        gb: "delete",
                                                                        user: userId,
                                                                        is_admin: isAdmin,
                                                                        id: parseInt(id)
                                                                    };

                                                                    const response = await inquiryTransaction.mutateAsync(payload);

                                                                    if (response?.success === "777") {
                                                                        modal.showAlert('알림', '문의가 삭제되었습니다.', null, () => {
                                                                            navigate('/inquiry');
                                                                        });
                                                                    } else {
                                                                        modal.showErrorAlert('오류', '문의 삭제에 실패했습니다.');
                                                                    }
                                                                } catch (error) {
                                                                    console.error('문의 삭제 실패:', error);
                                                                    modal.showErrorAlert('오류', '문의 삭제에 실패했습니다. 다시 시도해주세요.');
                                                                }
                                                            }
                                                        }
                                                    ]
                                                });
                                            }}>문의 삭제</button>
                                        </>
                                    )}

                                    {/* 답변 완료 시 추가 질문하기 버튼 표시 */}
                                    {inquiryData.status === 'answered' && (
                                        <button
                                            className="id-btn id-btn-reply"
                                            onClick={() => navigate('/inquiry/write', {
                                                state: {
                                                    parentId: inquiryData.parentId || id,
                                                    parentTitle: inquiryData.title,
                                                    parentCategory: inquiryData.category,
                                                    isSecret: inquiryData.isSecret
                                                }
                                            })}
                                        >
                                            <MessageCirclePlus size={16} />
                                            추가 질문하기
                                        </button>
                                    )}
                                </>
                            )}
                            {/* 관리자 권한 메뉴 */}
                            {isAdmin == 1 && (
                                inquiryData.answer ? (
                                    !isAnswering && (
                                        <>
                                            <button className="id-btn id-btn-edit" onClick={() => {
                                                // HTML 태그 제거 후 텍스트만 추출 (간단한 예시)
                                                const textContent = inquiryData.answer.content.replace(/<[^>]*>?/gm, '');
                                                setAnswerContent(textContent);
                                                setIsAnswering(true);
                                            }}>답변 수정</button>
                                            <button className="id-btn id-btn-delete" onClick={() => {
                                                modal.showConfirm('알림', '정말 이 답변을 삭제하시겠습니까?', {
                                                    btns: [
                                                        { title: "취소", click: () => { } },
                                                        {
                                                            title: "확인",
                                                            click: async () => {
                                                                try {
                                                                    const payload = {
                                                                        gb: "update",
                                                                        id: parseInt(id),
                                                                        answer: "",
                                                                        answerer: "",
                                                                        user: userId,
                                                                        is_admin: isAdmin
                                                                    };

                                                                    const response = await inquiryTransaction.mutateAsync(payload);

                                                                    if (response?.success === "777") {
                                                                        modal.showAlert('알림', '답변이 삭제되었습니다.');

                                                                        // 데이터 새로고침
                                                                        inquiryDetail.mutate({ id: id, user: userId, is_admin: isAdmin }, {
                                                                            onSuccess: (res) => {
                                                                                if (res?.success === "777") {
                                                                                    const data = res.resultjson || res.data || res;
                                                                                    const mappedData = {
                                                                                        id: data.id,
                                                                                        parentId: data.parentId || null,
                                                                                        category: data.category,
                                                                                        title: data.title,
                                                                                        writer: data.author || data.userNm,
                                                                                        writerId: data.userId || data.user_id || data.user || data.authorId || data.author_id || data.regId || data.reg_id || '',
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
                                                                            }
                                                                        });
                                                                    } else {
                                                                        modal.showErrorAlert('오류', '답변 삭제에 실패했습니다.');
                                                                    }
                                                                } catch (error) {
                                                                    console.error('답변 삭제 실패:', error);
                                                                    modal.showErrorAlert('오류', '답변 삭제에 실패했습니다. 다시 시도해주세요.');
                                                                }
                                                            }
                                                        }
                                                    ]
                                                });
                                            }}>답변 삭제</button>
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
                )}
            </div>
        </div>
    );
};

export default InquiryDetail;
