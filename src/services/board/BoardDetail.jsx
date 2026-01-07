import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Eye, User } from 'lucide-react';
import './BoardDetail.css';

const BoardDetail = () => {
    const { type, id } = useParams();
    const navigate = useNavigate();

    // 게시판 설정 (BoardList와 동일)
    const boardConfig = {
        notice: {
            title: '공지사항',
            color: '#7C9CBF',
        },
        patchnote: {
            title: 'Patch Notes',
            color: '#9B8FAA',
        }
    };

    const config = boardConfig[type] || boardConfig.notice;

    // 임시 데이터 (실제로는 API로 데이터를 가져와야 함)
    const mockData = {
        id: id,
        title: type === 'notice' ? '[2026-1] 공지사항 안내' : '[v2.0.4] 버전 업그레이드 안내',
        writer: '관리자',
        date: '2025-12-01',
        views: 1234,
        content: `
            <p>안녕하세요, 설문온 관리자입니다.</p>
            <br />
            <p>상세 페이지입니다.</p>
            <br />
            <p><strong>일정 안내</strong></p>
            <p>- 2025.12.01 ~ 2026.01.10</p>
            <br />
            <p>감사합니다.</p>
        `
    };

    return (
        <div className="bd-container" style={{ '--board-color': config.color }}>
            <button className="bd-back-btn" onClick={() => navigate(`/board/${type}`)}>
                <ArrowLeft size={16} />
                목록으로
            </button>

            <div className="bd-content-wrapper">
                <div className="bd-header">
                    <div className="bd-category">{config.title}</div>
                    <h1 className="bd-title">{mockData.title}</h1>
                    <div className="bd-meta">
                        <div className="bd-meta-item">
                            <User size={14} />
                            <span>{mockData.writer}</span>
                        </div>
                        <div className="bd-meta-divider"></div>
                        <div className="bd-meta-item">
                            <Calendar size={14} />
                            <span>{mockData.date}</span>
                        </div>
                        <div className="bd-meta-divider"></div>
                        <div className="bd-meta-item">
                            <Eye size={14} />
                            <span>{mockData.views.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="bd-body">
                    <div dangerouslySetInnerHTML={{ __html: mockData.content }} />
                </div>

                {/* 첨부파일 영역 */}
                <div className="bd-attachments">
                    <div className="bd-attachments-title">첨부파일 <span>2</span></div>
                    <ul className="bd-attachments-list">
                        <li>
                            <a href="#" onClick={(e) => e.preventDefault()}>
                                <span className="bd-file-icon">📎</span>
                                <span className="bd-file-name">첨부파일1.pdf</span>
                                <span className="bd-file-size">(2.5MB)</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" onClick={(e) => e.preventDefault()}>
                                <span className="bd-file-icon">📎</span>
                                <span className="bd-file-name">첨부파일2.hwp</span>
                                <span className="bd-file-size">(54KB)</span>
                            </a>
                        </li>
                    </ul>
                </div>

                <div className="bd-footer">
                    <button className="bd-btn bd-btn-list" onClick={() => navigate(`/board/${type}`)}>
                        목록
                    </button>
                    {/* 관리자 권한 체크 후 표시 */}
                    <div className="bd-admin-btns">
                        <button className="bd-btn bd-btn-edit" onClick={() => navigate(`/board/${type}/write/${id}`)}>수정</button>
                        <button className="bd-btn bd-btn-delete">삭제</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoardDetail;
