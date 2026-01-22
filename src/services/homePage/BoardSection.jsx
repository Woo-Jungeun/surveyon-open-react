import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, FileText, MessageCircle, Bot, History } from 'lucide-react';
import { modalContext } from "@/components/common/Modal";
import { BoardApi } from "@/services/board/BoardApi";
import moment from 'moment';

const BoardSection = () => {
    const navigate = useNavigate();
    const { showAlert } = useContext(modalContext);

    // 공지사항 API 연동
    const { top5Notices } = BoardApi();
    const { data: apiResult } = top5Notices;

    useEffect(() => {
        top5Notices.mutate();
    }, []);

    console.log("apiResult", apiResult);

    // API 응답 구조에 따라 배열 추출 (배열이거나, resultjson/data/result 프로퍼티 확인)
    const noticeList = Array.isArray(apiResult)
        ? apiResult
        : (apiResult?.resultjson || apiResult?.data || apiResult?.result || []);

    const noticeData = Array.isArray(noticeList) ? noticeList.map(item => ({
        id: item.id,
        title: item.title,
        date: item.createdAt ? moment(item.createdAt).format('YYYY-MM-DD') : ''
    })) : [];

    console.log("noticeData", noticeData)

    const patchNotesData = [
        { id: 1, version: 'v2.0.4', title: 'AI 분석 기능 개선', date: '2025-12-15' },
        { id: 2, version: 'v2.0.3', title: '그리드 성능 최적화', date: '2025-12-01' },
        { id: 3, version: 'v2.0.2', title: '메이저 업데이트', date: '2025-11-20' },
        { id: 4, version: 'v2.0.1', title: '속도 업데이트', date: '2025-11-10' },
        { id: 5, version: 'v2.0.0', title: '초기 패치', date: '2025-11-01' }
    ];

    const handleItemClick = (e, path, itemId) => {
        e.stopPropagation();
        navigate(`${path}/${itemId}`, { state: { from: 'home' } });
    };

    return (
        <div className="board-section">
            <div className="board-section-header">
                <h2>설문온 게시판 안내</h2>
                <p>필요한 정보를 빠르게 찾아보세요.</p>
            </div>

            <div className="board-cards-grid">
                {/* 공지사항 */}
                <div className="board-card" style={{ '--card-color': '#7C9CBF' }}>
                    <div className="board-card-header" onClick={() => navigate('/board/notice')}>
                        <div className="board-card-title-area">
                            <span className="board-card-icon"><Megaphone size={28} color="#7C9CBF" /></span>
                            <div>
                                <h3>공지사항</h3>
                                <p>설문온 업데이트 소식</p>
                            </div>
                        </div>
                        <span className="board-card-badge">TOP 5</span>
                    </div>
                    <div className="board-card-list">
                        {noticeData.map((item) => (
                            <div
                                key={item.id}
                                className="board-list-item"
                                onClick={(e) => handleItemClick(e, '/board/notice', item.id)}
                            >
                                <div className="board-list-content">
                                    <span className="board-list-icon"><FileText size={14} color="#7C9CBF" /></span>
                                    <span className="board-list-title">{item.title}</span>
                                </div>
                                <span className="board-list-date">{item.date}</span>
                            </div>
                        ))}
                    </div>
                    {/* <div className="board-card-action">
                        <button className="board-view-more" onClick={() => navigate('/board/notice')}>
                            바로가기 →
                        </button>
                    </div> */}
                </div>

                {/* Patch Notes */}
                <div className="board-card" style={{ '--card-color': '#9B8FAA' }}>
                    <div className="board-card-header" onClick={() => navigate('/board/patchnotes')}>
                        <div className="board-card-title-area">
                            <span className="board-card-icon"><History size={28} color="#9B8FAA" /></span>
                            <div>
                                <h3>Patch Notes</h3>
                                <p>설문온 버전 관리</p>
                            </div>
                        </div>
                        <span className="board-card-badge">TOP 5</span>
                    </div>
                    <div className="board-card-list">
                        {patchNotesData.map((item) => (
                            <div
                                key={item.id}
                                className="board-list-item"
                                onClick={(e) => handleItemClick(e, '/board/patchnotes', item.id)}
                            >
                                <div className="board-list-content">
                                    <span className="board-list-icon"><FileText size={14} color="#9B8FAA" /></span>
                                    <span className="board-list-title">
                                        [{item.version}] {item.title}
                                    </span>
                                </div>
                                <span className="board-list-date">{item.date}</span>
                            </div>
                        ))}
                    </div>
                    {/* <div className="board-card-action">
                        <button className="board-view-more" onClick={() => navigate('/board/patchnotes')}>
                            바로가기 →
                        </button>
                    </div> */}
                </div>

                {/* 문의하기 & FAQ 컬럼 */}
                <div className="board-card-stack">
                    {/* 문의하기 */}
                    <div className="board-card board-card-small" style={{ '--card-color': '#6B7FBF' }}>
                        <div className="board-card-header" onClick={() => navigate('/inquiry')}>
                            <div className="board-card-title-area">
                                <span className="board-card-icon"><MessageCircle size={28} color="#6B7FBF" /></span>
                                <div>
                                    <h3>문의하기</h3>
                                    <p>메뉴별 문의사항 및 답변</p>
                                </div>
                            </div>
                        </div>
                        <div className="board-card-action">
                            <button className="board-view-more" onClick={() => navigate('/inquiry')}>
                                바로가기 →
                            </button>
                        </div>
                    </div>

                    {/* FAQ */}
                    <div className="board-card board-card-small" style={{ '--card-color': '#B8B8C0' }}>
                        <div className="board-card-header" onClick={() => showAlert('알림', 'FAQ 서비스는 2차 개발 예정입니다.')}>
                            <div className="board-card-title-area">
                                <span className="board-card-icon"><Bot size={28} color="#B8B8C0" /></span>
                                <div>
                                    <h3>FAQ</h3>
                                    <p>AI 챗봇 서비스</p>
                                </div>
                            </div>
                            <span className="board-card-badge">예정</span>
                        </div>
                        <div className="board-card-action">
                            <button
                                className="board-view-more disabled"
                                onClick={() => showAlert('알림', 'FAQ 서비스는 2차 개발 예정입니다.')}
                            >
                                준비 중
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoardSection;
