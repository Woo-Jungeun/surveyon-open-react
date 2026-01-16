import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Megaphone, FileText, History, PenSquare, Search } from 'lucide-react';
import './BoardList.css';

const BoardList = ({ type = 'notice' }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

    // 임시 데이터 (추후 API 연동)
    const noticeData = [
        { id: 1, title: '[2026-1] 2026-1학기 신편입생 모집 안내', date: '2025-12-01', writer: '관리자1', views: 1234, isNew: true },
        { id: 2, title: '[2026-1] 사이버대학의 선택 기준과 합격 전략', date: '2024-10-04', writer: '관리자2', views: 856, isNew: false },
        { id: 3, title: '[2026-1] 온라인 입학설명회 신청 안내', date: '2024-11-28', writer: '관리자1', views: 542, isNew: true },
        { id: 4, title: '설문온 시스템 정기 점검 안내', date: '2024-11-15', writer: '관리자4', views: 423, isNew: false },
        { id: 5, title: '신규 기능 업데이트 안내', date: '2024-11-01', writer: '관리자3', views: 789, isNew: false },
        { id: 6, title: '개인정보 처리방침 변경 안내', date: '2024-10-20', writer: '관리자1', views: 321, isNew: false },
        { id: 7, title: '2024년 하반기 서비스 개선 계획', date: '2024-10-10', writer: '관리자1', views: 654, isNew: false },
        { id: 8, title: '설문온 모바일 앱 출시 안내', date: '2024-09-25', writer: '관리자1', views: 987, isNew: false },
        { id: 9, title: '설문 응답률 향상을 위한 팁', date: '2024-09-15', writer: '관리자2', views: 432, isNew: false },
        { id: 10, title: '데이터 분석 기능 업데이트', date: '2024-09-01', writer: '관리자1', views: 765, isNew: false },
        { id: 6, title: '개인정보 처리방침 변경 안내', date: '2024-10-20', writer: '관리자1', views: 321, isNew: false },
        { id: 7, title: '2024년 하반기 서비스 개선 계획', date: '2024-10-10', writer: '관리자1', views: 654, isNew: false },
        { id: 8, title: '설문온 모바일 앱 출시 안내', date: '2024-09-25', writer: '관리자1', views: 987, isNew: false },
        { id: 9, title: '설문 응답률 향상을 위한 팁', date: '2024-09-15', writer: '관리자2', views: 432, isNew: false },
        { id: 10, title: '데이터 분석 기능 업데이트', date: '2024-09-01', writer: '관리자1', views: 765, isNew: false },
    ];

    const patchNotesData = [
        { id: 1, version: 'v2.0.4', title: 'AI 분석 기능 개선', date: '2025-12-15', writer: '관리자1', views: 432, isNew: true },
        { id: 2, version: 'v2.0.3', title: '그리드 성능 최적화', date: '2025-12-01', writer: '관리자2', views: 321, isNew: true },
        { id: 3, version: 'v2.0.2', title: '메이저 업데이트', date: '2025-11-20', writer: '관리자1', views: 654, isNew: false },
        { id: 4, version: 'v2.0.1', title: '속도 업데이트', date: '2025-11-10', writer: '관리자4', views: 234, isNew: false },
        { id: 5, version: 'v2.0.0', title: '초기 패치', date: '2025-11-01', writer: '관리자3', views: 876, isNew: false },
        { id: 6, version: 'v1.9.5', title: '버그 수정 및 안정화', date: '2025-10-15', writer: '관리자1', views: 543, isNew: false },
        { id: 7, version: 'v1.9.0', title: 'UI/UX 개선', date: '2025-10-01', writer: '관리자2', views: 432, isNew: false },
        { id: 8, version: 'v1.8.5', title: '보안 강화', date: '2025-09-20', writer: '관리자1', views: 654, isNew: false },
    ];

    const data = type === 'notice' ? noticeData : patchNotesData;

    // 검색 필터링
    const filteredData = data.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 페이지네이션
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
                메인으로
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
                            {currentData.map((item, index) => (
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
                                            <FileText size={16} color="var(--primary-color)" style={{ minWidth: '16px' }} />
                                            <span className="bl-title-text">{item.title}</span>
                                            {item.isNew && <span className="bl-new-badge"> NEW </span>}
                                        </div>
                                    </td>
                                    <td className="bl-col-date">{item.date}</td>
                                    <td className="bl-col-writer">{item.writer}</td>
                                    <td className="bl-col-views">{item.views.toLocaleString()}</td>
                                </tr>
                            ))}
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
