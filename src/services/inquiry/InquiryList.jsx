import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, Lock, MessageCircle, PenSquare, ArrowLeft, CornerDownRight, Eye } from 'lucide-react';
import './Inquiry.css';
import { InquiryApi } from './InquiryApi';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';

const InquiryList = () => {
    const navigate = useNavigate();
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('전체');
    const [currentPage, setCurrentPage] = useState(1);
    const auth = useSelector((store) => store.auth);
    const userId = auth?.user?.userId || "";
    const userGroup = auth?.user?.userGroup || "";
    const isAdmin = userGroup.includes("솔루션") ? 1 : 0;

    const itemsPerPage = 5;

    const categories = ['전체', '설문제작', '데이터현황', '데이터관리', 'AI오픈분석', '응답자관리', '기타'];

    const { inquiryList } = InquiryApi();
    const [serverData, setServerData] = useState([]);

    useEffect(() => {
        fetchList();
    }, [activeTab]);

    const fetchList = () => {
        const params = {
            category: activeTab === '전체' ? '' : activeTab,
            userId: userId,
            is_admin: isAdmin
        };

        inquiryList.mutate(params, {
            onSuccess: (response) => {
                // API 응답 구조 처리
                // 사용자의 설명에 따라 응답이 배열이라고 가정
                // 응답에 총 개수가 포함되어 있다면 업데이트, 현재는 배열을 직접 매핑
                if (Array.isArray(response)) {
                    const mappedData = response.map(item => ({
                        id: item.id,
                        category: item.category,
                        title: item.title,
                        writer: item.author,
                        date: item.createdAt ? item.createdAt.split('T')[0] : '',
                        status: item.status ? item.status.toLowerCase() : 'waiting',
                        isSecret: item.isSecret,
                        content: item.content,
                        depth: item.depth || (item.parentId ? 1 : 0),
                        parentId: item.parentId,
                        viewCount: item.viewCount || 0,
                        createdAt: item.createdAt
                    }));

                    // 부모-자식 관계로 데이터 재정렬
                    const organizedData = [];
                    const parents = mappedData.filter(item => !item.parentId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                    parents.forEach(parent => {
                        organizedData.push(parent);
                        // 해당 부모의 자식들을 찾아 시간순으로 추가
                        const children = mappedData.filter(item => item.parentId === parent.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                        organizedData.push(...children);
                    });

                    // 부모가 없는(데이터 오류 등) 자식들도 마지막에 추가
                    const orphans = mappedData.filter(item => item.parentId && !parents.find(p => p.id === item.parentId));
                    organizedData.push(...orphans);

                    setServerData(organizedData);
                } else if (response && response.list) {
                    const mappedData = response.list.map(item => ({
                        id: item.id,
                        category: item.category,
                        title: item.title,
                        writer: item.author,
                        date: item.createdAt ? item.createdAt.split('T')[0] : '',
                        status: item.status ? item.status.toLowerCase() : 'waiting',
                        isSecret: item.isSecret,
                        content: item.content,
                        depth: item.depth || 0,
                        parentId: item.parentId,
                        viewCount: item.viewCount || 0,
                        createdAt: item.createdAt
                    }));

                    const organizedData = [];
                    const parents = mappedData.filter(item => !item.parentId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                    parents.forEach(parent => {
                        organizedData.push(parent);
                        const children = mappedData.filter(item => item.parentId === parent.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                        organizedData.push(...children);
                    });

                    const orphans = mappedData.filter(item => item.parentId && !parents.find(p => p.id === item.parentId));
                    organizedData.push(...orphans);

                    setServerData(organizedData);
                }
            }
        });
    };



    const toggleExpand = (id) => {
        const newExpandedIds = new Set(expandedIds);
        if (newExpandedIds.has(id)) {
            newExpandedIds.delete(id);
        } else {
            newExpandedIds.add(id);
        }
        setExpandedIds(newExpandedIds);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 클라이언트 사이드 필터링
    const filteredData = serverData.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 클라이언트 사이드 페이징
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="inquiry-container" data-theme="board-inquiry">
            <button className="inquiry-home-btn" onClick={() => navigate('/')}>
                <ArrowLeft size={16} />
                메인으로
            </button>

            <div className="inquiry-header">
                <div className="inquiry-header-content">
                    <div className="inquiry-header-title">
                        <span className="inquiry-header-icon"><MessageCircle size={36} color="var(--primary-color)" /></span>
                        <h1>문의하기</h1>
                    </div>
                    <p className="inquiry-header-desc">궁금한 점을 남겨주시면 빠르게 답변해 드립니다.</p>
                </div>
            </div>

            <div className="inquiry-content">
                {/* 카테고리 탭 */}
                <div className="inquiry-tabs">
                    {categories.map((category) => (
                        <button
                            key={category}
                            className={`inquiry-tab ${activeTab === category ? 'active' : ''}`}
                            onClick={() => setActiveTab(category)}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                <div className="inquiry-toolbar">
                    <div className="inquiry-info">
                        <span>전체 <strong>{filteredData.length}</strong>건</span>
                    </div>

                    <div className="inquiry-search-container">
                        <div className="inquiry-search">
                            <input
                                type="text"
                                placeholder="검색어를 입력하세요"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            <button className="inquiry-search-btn">
                                <Search size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="inquiry-actions">
                        <button className="inquiry-write-btn" onClick={() => navigate('/inquiry/write')}>
                            <PenSquare size={16} />
                            문의하기
                        </button>
                    </div>
                </div>

                <div className="inquiry-list">
                    {currentData.map((item, index) => {
                        const nextItem = currentData[index + 1];
                        const prevItem = currentData[index - 1];

                        const isReply = item.depth > 0;
                        // 다음 아이템이 현재 아이템의 답글이거나, 현재 아이템이 답글이면서 다음 아이템도 같은 부모의 답글인 경우
                        const hasReply = nextItem && (nextItem.parentId === item.id || (isReply && nextItem.parentId === item.parentId));

                        const isParentExpanded = isReply && prevItem && (prevItem.id === item.parentId || prevItem.parentId === item.parentId) && expandedIds.has(prevItem.id);
                        const isChildExpanded = hasReply && nextItem && expandedIds.has(nextItem.id);
                        const isAttachedAndExpanded = isReply && prevItem && (prevItem.id === item.parentId || prevItem.parentId === item.parentId) && expandedIds.has(item.id);

                        return (
                            <div key={item.id} className={`inquiry-item ${expandedIds.has(item.id) ? 'expanded' : ''} ${hasReply ? 'has-reply' : ''} ${isReply ? 'is-reply' : ''} ${isParentExpanded ? 'parent-expanded' : ''} ${isChildExpanded ? 'child-expanded' : ''} ${isAttachedAndExpanded ? 'attached-expanded' : ''}`}>
                                <div className="inquiry-item-header" onClick={() => toggleExpand(item.id)}>
                                    <div className="inquiry-status">
                                        {item.status === 'answered' ? (
                                            <span className="status-badge answered">답변완료</span>
                                        ) : (
                                            <span className="status-badge waiting">답변대기</span>
                                        )}
                                    </div>
                                    <div className="inquiry-info">
                                        <h3 className="inquiry-item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: item.depth > 0 ? `${item.depth * 20}px` : '0' }}>
                                            {item.depth > 0 && <CornerDownRight size={16} className="reply-icon" style={{ color: '#666' }} />}
                                            {item.isSecret && <Lock size={14} className="secret-icon" />}
                                            <span className="category-badge">{item.category}</span>
                                            {item.title}
                                        </h3>
                                        <div className="inquiry-meta">
                                            <span>{item.writer}</span>
                                            <span className="divider">|</span>
                                            <span>{item.date}</span>
                                            <span className="divider">|</span>
                                            <span className="meta-view-count" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Eye size={14} />
                                                {item.viewCount}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="inquiry-toggle">
                                        {expandedIds.has(item.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                                {expandedIds.has(item.id) && (
                                    <div className="inquiry-item-body">
                                        <div className="inquiry-preview-content">
                                            {item.content}
                                        </div>
                                        <button
                                            className="inquiry-detail-btn"
                                            onClick={() => navigate(`/inquiry/view/${item.id}`)}
                                        >
                                            상세 보기
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {totalPages > 1 && (
                    <div className="inquiry-pagination">
                        <button
                            className="inquiry-page-btn"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                        >
                            «
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                className={`inquiry-page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                                onClick={() => handlePageChange(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            className="inquiry-page-btn"
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

export default InquiryList;
