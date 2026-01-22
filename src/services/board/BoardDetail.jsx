import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, Eye, User, Home } from 'lucide-react';
import './Board.css';
import { BoardApi } from "@/services/board/BoardApi";
import moment from 'moment';

const BoardDetail = () => {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isFromHome = location.state?.from === 'home';

    // API 연동
    const { noticeDetail, patchNotesDetail } = BoardApi();
    const [detailData, setDetailData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let result;
                if (type === 'notice') {
                    result = await noticeDetail.mutateAsync({ id: id });
                } else if (type === 'patchnotes') {
                    result = await patchNotesDetail.mutateAsync({ id: id });
                }

                if (result) {
                    // API 응답 구조에 따라 데이터 추출
                    const data = result.resultjson || result.data || result;
                    setDetailData(data);
                }
            } catch (error) {
                console.error("Failed to fetch detail:", error);
            }
        };

        if (id) {
            fetchData();
        }
    }, [type, id]);

    // 게시판 설정
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

    if (!detailData) {
        return <div className="bd-loading">Loading...</div>;
    }

    // 데이터 가공
    const title = type === 'patchnotes' && detailData.version
        ? `[${detailData.version}] ${detailData.title}`
        : detailData.title;

    const date = detailData.createdAt
        ? moment(detailData.createdAt).format('YYYY-MM-DD HH:mm:ss')
        : '';

    return (
        <div className="bd-container" data-theme={`board-${type}`}>
            {isFromHome ? (
                <button className="bw-back-btn" onClick={() => navigate('/')}>
                    <Home size={16} />
                    메인으로
                </button>
            ) : (
                <button className="bw-back-btn" onClick={() => navigate(`/board/${type}`)}>
                    <ArrowLeft size={16} />
                    목록으로
                </button>
            )}

            <div className="bd-content-wrapper">
                <div className="bd-header">
                    <div className="bd-category">{config.title}</div>
                    <h1 className="bd-title">{title}</h1>
                    <div className="bd-meta">
                        <div className="bd-meta-item">
                            <User size={14} />
                            <span>{detailData.author || '관리자'}</span>
                        </div>
                        <div className="bd-meta-divider"></div>
                        <div className="bd-meta-item">
                            <Calendar size={14} />
                            <span>{date}</span>
                        </div>
                        <div className="bd-meta-divider"></div>
                        <div className="bd-meta-item">
                            <Eye size={14} />
                            <span>{(detailData.viewCount || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="bd-body">
                    <div dangerouslySetInnerHTML={{ __html: detailData.content }} />
                </div>

                {/* 첨부파일 영역 (데이터가 있을 경우에만 표시) */}
                {detailData.attachments && detailData.attachments.length > 0 && (
                    <div className="bd-attachments">
                        <div className="bd-attachments-title">첨부파일 <span>{detailData.attachments.length}</span></div>
                        <ul className="bd-attachments-list">
                            {detailData.attachments.map((file, index) => (
                                <li key={index}>
                                    <a href="#" onClick={(e) => { e.preventDefault(); /* 파일 다운로드 로직 추가 필요 */ }}>
                                        <span className="bd-file-icon">📎</span>
                                        <span className="bd-file-name">{file.originalName}</span>
                                        <span className="bd-file-size">({(file.fileSize / 1024).toFixed(1)}KB)</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="bd-footer">
                    {/* 관리자 권한 체크 후 표시 (추후 구현) */}
                    {/* <div className="bd-admin-btns">
                        <button className="bd-btn bd-btn-edit" onClick={() => navigate(`/board/${type}/write/${id}`)}>수정</button>
                        <button className="bd-btn bd-btn-delete">삭제</button>
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default BoardDetail;
