import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Megaphone, FileText, History, PenSquare, Search, Paperclip, Lock } from 'lucide-react';
import './Board.css';
import { BoardApi } from "@/services/board/BoardApi";
import moment from 'moment';

const BoardList = ({ type = 'notice' }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // API 연동
    const { noticeList, patchNotesList } = BoardApi();
    const { data: noticeResult } = noticeList;
    const { data: patchResult } = patchNotesList;

    useEffect(() => {
        if (type === 'notice') {
            noticeList.mutate();
        } else if (type === 'patchnotes') {
            patchNotesList.mutate();
        }
    }, [type]);

    // 게시판 설정
    const boardConfig = {
        notice: {
            title: '공지사항',
            icon: <Megaphone size={36} color="var(--primary-color)" />,
            color: 'var(--board-notice-color)',
            description: '설문온의 새로운 소식과 업데이트를 확인하세요.'
        },
        patchnotes: {
            title: 'Patch Notes',
            icon: <History size={36} color="var(--primary-color)" />,
            color: 'var(--board-patchnotes-color)',
            description: '설문온의 버전별 업데이트 내역을 확인하세요.'
        }
    };

    const config = boardConfig[type];

    // 데이터 가공
    const processData = (result) => {
        const list = Array.isArray(result)
            ? result
            : (result?.resultjson || result?.data || result?.result || []);

        return Array.isArray(list) ? list.map(item => ({
            id: item.id,
            title: item.title,
            version: item.version,
            date: item.createdAt ? moment(item.createdAt).format('YYYY-MM-DD') : '',
            writer: item.author || '관리자',
            views: item.viewCount || 0,
            isNew: item.isNew || false,
            hasAttachment: item.hasAttachment || false,
            isVisible: item.isVisible
        })) : [];
    };

    // API 데이터 사용
    const apiData = type === 'notice' ? processData(noticeResult) : processData(patchResult);

    // 검색 필터링 (화면단 처리)
    const filteredData = apiData.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 페이지네이션 (화면단 처리)
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    const handleRowClick = (id) => {
        navigate(`/board/${type}/${id}`);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="bl-container" data-theme={`board-${type}`}>
            <button className="bl-home-btn" onClick={() => navigate('/')}>
                <ArrowLeft size={16} />
                홈으로
            </button>

            <div className="bl-header">
                <div className="bl-header-content">
                    <div className="bl-header-title">
                        <span className="bl-header-icon">{config.icon}</span>
                        <h1>{config.title}</h1>
                    </div>
                    <p className="bl-header-desc">{config.description}</p>
                </div>
            </div>

            <div className="bl-content">
                <div className="bl-toolbar">
                    <div className="bl-info">
                        <span>전체 <strong>{filteredData.length}</strong>건</span>
                    </div>

                    <div className="bl-search">
                        <input
                            type="text"
                            placeholder="검색어를 입력하세요."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="bl-search-input"
                        />
                        <button className="bl-search-btn">
                            <Search size={18} />
                        </button>
                    </div>

                    <div className="bl-actions">
                        <button className="bl-write-btn" onClick={() => navigate(`/board/${type}/write`)}>
                            <PenSquare size={16} />
                            글쓰기
                        </button>
                    </div>
                </div>

                <div className="bl-table-wrapper">
                    <table className="bl-table">
                        <thead>
                            <tr>
                                <th className="bl-col-no">번호</th>
                                {type === 'patchnotes' && <th className="bl-col-version">버전</th>}
                                <th className="bl-col-title">제목</th>
                                <th className="bl-col-date">등록일</th>
                                <th className="bl-col-writer">작성자</th>
                                <th className="bl-col-views">조회수</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.length > 0 ? (
                                currentData.map((item, index) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => handleRowClick(item.id)}
                                        className="bl-row"
                                    >
                                        <td className="bl-col-no">{filteredData.length - (startIndex + index)}</td>
                                        {type === 'patchnotes' && (
                                            <td className="bl-col-version">
                                                <span className="bl-version-badge">
                                                    {item.version}
                                                </span>
                                            </td>
                                        )}
                                        <td className="bl-col-title">
                                            <div className="bl-title-wrapper">
                                                {/* <FileText size={16} color="var(--primary-color)" style={{ minWidth: '16px' }} /> */}
                                                <span className="bl-title-text">{item.title}</span>
                                                {!item.isVisible && <Lock size={14} color="#666" style={{ marginLeft: '4px' }} />}
                                                {item.hasAttachment && <Paperclip size={14} color="#666" style={{ marginLeft: '4px' }} />}
                                                {item.isNew && <span className="bl-new-badge"> NEW </span>}
                                            </div>
                                        </td>
                                        <td className="bl-col-date">{item.date}</td>
                                        <td className="bl-col-writer">{item.writer}</td>
                                        <td className="bl-col-views">{item.views.toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={type === 'patchnotes' ? 6 : 5} className="bl-no-data">
                                        데이터가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="bl-pagination">
                        <button
                            className="bl-page-btn"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                        >
                            «
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                className={`bl-page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                                onClick={() => handlePageChange(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            className="bl-page-btn"
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                        >
                            »
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BoardList;
