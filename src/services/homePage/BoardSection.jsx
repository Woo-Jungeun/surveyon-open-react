import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, FileText, MessageCircle, Bot, History } from 'lucide-react';
import { modalContext } from "@/components/common/Modal";
import { BoardApi } from "@/services/board/BoardApi";
import moment from 'moment';
import { useSelector } from 'react-redux';
import { useCookies } from 'react-cookie';

const BoardSection = () => {
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const [cookies] = useCookies(["TOKEN"]);
    const isLoggedIn = auth?.isLogin && cookies?.TOKEN;

    // API 연동
    const { top5Notices, top5PatchNotes } = BoardApi();
    const { data: noticeResult } = top5Notices;
    const { data: patchResult } = top5PatchNotes;

    useEffect(() => {
        top5Notices.mutate();
        top5PatchNotes.mutate();
    }, []);

    // 데이터 가공 헬퍼
    const processData = (result) => {
        const list = Array.isArray(result)
            ? result
            : (result?.resultjson || result?.data || result?.result || []);

        return Array.isArray(list) ? list.map(item => ({
            id: item.id,
            title: item.title,
            version: item.version, // 패치노트용
            date: item.createdAt ? moment(item.createdAt).format('YYYY-MM-DD') : ''
        })) : [];
    };

    const noticeData = processData(noticeResult);
    const patchNotesData = processData(patchResult);

    const handleItemClick = (e, path, itemId) => {
        e.stopPropagation();
        navigate(`${path}/${itemId}`, { state: { from: 'home' } });
    };

    const handleInquiryClick = () => {
        if (!isLoggedIn) {
            showConfirm("알림", "로그인 후 이용 가능합니다.", {}, {
                btns: [
                    {
                        title: "취소",
                        click: () => { }
                    },
                    {
                        title: "로그인하기",
                        click: () => navigate('/login', { state: { from: '/inquiry' } })
                    }
                ]
            });
            return;
        }
        navigate('/inquiry');
    };

    // 공통 리스트 컴포넌트
    const BoardList = ({ items, path, iconColor, isPatchNote = false }) => (
        <div className="board-card-list">
            {items.length !== 0 ? (
                <div className="board-list-empty">
                    데이터가 없습니다.
                </div>
            ) : (
                items.map((item) => (
                    <div
                        key={item.id}
                        className="board-list-item"
                        onClick={(e) => handleItemClick(e, path, item.id)}
                    >
                        <div className="board-list-content">
                            <span className="board-list-icon">
                                <FileText size={14} color={iconColor} />
                            </span>
                            <span className="board-list-title">
                                {isPatchNote && item.version ? `[${item.version}] ` : ''}{item.title}
                            </span>
                        </div>
                        <span className="board-list-date">{item.date}</span>
                    </div>
                ))
            )}
        </div>
    );

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
                    <BoardList
                        items={noticeData}
                        path="/board/notice"
                        iconColor="#7C9CBF"
                    />
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
                    <BoardList
                        items={patchNotesData}
                        path="/board/patchnotes"
                        iconColor="#9B8FAA"
                        isPatchNote={true}
                    />
                </div>

                {/* 문의하기 & FAQ 컬럼 */}
                <div className="board-card-stack">
                    {/* 문의하기 */}
                    <div className="board-card board-card-small" style={{ '--card-color': '#6B7FBF' }}>
                        <div className="board-card-header" onClick={handleInquiryClick}>
                            <div className="board-card-title-area">
                                <span className="board-card-icon"><MessageCircle size={28} color="#6B7FBF" /></span>
                                <div>
                                    <h3>문의하기</h3>
                                    <p>메뉴별 문의사항 및 답변</p>
                                </div>
                            </div>
                        </div>
                        <div className="board-card-action">
                            <button className="board-view-more" onClick={handleInquiryClick}>
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
