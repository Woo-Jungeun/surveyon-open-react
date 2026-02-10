import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, Eye, User, Home, List } from 'lucide-react';
import './Board.css';
import { BoardApi } from "@/services/board/BoardApi";
import moment from 'moment';
import { modalContext } from "@/components/common/Modal";
import { useSelector } from 'react-redux';

const BoardDetail = () => {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isFromHome = location.state?.from === 'home';
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const userGroup = auth?.user?.userGroup || "";
    const userId = auth?.user?.userId || "";
    const isAdmin = userGroup.includes("AI솔루션") ? 1 : 0;

    // API 연동
    const { noticeDetail, patchNotesDetail, noticeTransaction, patchNotesTransaction } = BoardApi();
    const [detailData, setDetailData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let result;
                if (type === 'notice') {
                    result = await noticeDetail.mutateAsync({ id: id, user: userId });
                } else if (type === 'patchnotes') {
                    result = await patchNotesDetail.mutateAsync({ id: id, user: userId });
                }

                if (result) {
                    // API 응답 구조에 따라 데이터 추출
                    const data = result.resultjson || result.data || result;
                    setDetailData(data);
                }
            } catch (error) {
                console.error("Failed to fetch detail:", error);
                modal.showErrorAlert('오류', '데이터를 불러오는 중 오류가 발생했습니다.');
            }
        };

        if (id) {
            fetchData();
        }
    }, [type, id]);

    const handleDelete = () => {
        modal.showConfirm('알림', '정말로 삭제하시겠습니까?', {
            btns: [
                {
                    title: "취소",
                    click: () => { }
                },
                {
                    title: "확인",
                    click: async () => {
                        try {
                            let result;
                            const payload = {
                                gb: 'delete',
                                id: id,
                                is_admin: isAdmin,
                                user: userId
                            };

                            if (type === 'notice') {
                                result = await noticeTransaction.mutateAsync(payload);
                            } else if (type === 'patchnotes') {
                                result = await patchNotesTransaction.mutateAsync(payload);
                            }

                            if (result) {
                                modal.showAlert('알림', '삭제되었습니다.', null, () => {
                                    navigate(`/board/${type}`);
                                });
                            }
                        } catch (error) {
                            console.error("Delete failed:", error);
                            modal.showErrorAlert('오류', '삭제 중 오류가 발생했습니다.');
                        }
                    }
                }
            ]
        });
    };

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
            {isFromHome && (
                <button className="bd-back-btn" onClick={() => navigate('/')}>
                    <Home size={18} />
                    홈으로
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

                <div className="bd-footer">
                    <button
                        className="bd-btn"
                        onClick={() => navigate(`/board/${type}`)}
                        style={{ background: 'white', border: '1px solid #ddd', color: '#555', display: 'flex', alignItems: 'center', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                    >
                        <List size={16} style={{ marginRight: '6px' }} />
                        목록으로
                    </button>

                    {isAdmin === 1 && (
                        <div className="bd-admin-btns" style={{ display: 'flex', gap: '8px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid #eee' }}>
                            <button className="bd-btn bd-btn-edit" onClick={() => navigate(`/board/${type}/write/${id}`)}>수정</button>
                            <button className="bd-btn bd-btn-delete" onClick={handleDelete}>삭제</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BoardDetail;
