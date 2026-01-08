import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, Lock, MessageCircle, PenSquare, ArrowLeft } from 'lucide-react';
import './InquiryList.css';

const InquiryList = () => {
    const navigate = useNavigate();
    const [expandedId, setExpandedId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('전체');

    const categories = ['전체', '설문제작', '데이터현황', '데이터관리', 'AI오픈분석', '응답자관리'];

    // 임시 데이터
    const inquiryData = [
        {
            id: 1,
            category: '설문제작',
            title: '로그인이 안됩니다.',
            writer: '홍*동',
            date: '2025-01-08',
            status: 'waiting', // waiting, answered
            isSecret: true,
            content: '로그인을 시도했는데 계속 오류가 발생합니다. 확인 부탁드립니다.'
        },
        {
            id: 2,
            category: '데이터현황',
            title: '설문조사 결과 다운로드 문의',
            writer: '김*수',
            date: '2025-01-07',
            status: 'answered',
            isSecret: false,
            content: '설문조사 결과를 엑셀로 다운로드 받고 싶은데 기능이 어디에 있나요?'
        },
        {
            id: 3,
            category: '데이터관리',
            title: '서비스 이용료 관련 문의',
            writer: '이*영',
            date: '2025-01-06',
            status: 'answered',
            isSecret: true,
            content: '서비스 이용료가 월 얼마인지 궁금합니다.'
        },
        {
            id: 4,
            category: 'AI오픈분석',
            title: 'AI 분석 결과가 이상합니다.',
            writer: '박*민',
            date: '2025-01-05',
            status: 'waiting',
            isSecret: true,
            content: 'AI 분석 결과가 실제 데이터와 다르게 나오는 것 같습니다.'
        },
        {
            id: 5,
            category: '응답자관리',
            title: '응답자 목록 엑셀 업로드 문의',
            writer: '최*우',
            date: '2025-01-04',
            status: 'answered',
            isSecret: false,
            content: '응답자 목록을 엑셀로 일괄 업로드할 수 있나요?'
        }
    ];

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredData = inquiryData.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeTab === '전체' || item.category === activeTab;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="inquiry-container">
            <button className="inquiry-home-btn" onClick={() => navigate('/')}>
                <ArrowLeft size={16} />
                메인으로
            </button>

            <div className="inquiry-header">
                <div className="inquiry-header-content">
                    <div className="inquiry-header-title">
                        <span className="inquiry-header-icon"><MessageCircle size={36} color="#6b7fbf" /></span>
                        <h1>문의하기</h1>
                    </div>
                    <p className="inquiry-header-desc">궁금한 점을 남겨주시면 빠르게 답변해 드립니다.</p>
                </div>
            </div>

            <div className="inquiry-content">
                {/* Category Tabs */}
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
                    {filteredData.map((item) => (
                        <div key={item.id} className={`inquiry-item ${expandedId === item.id ? 'expanded' : ''}`}>
                            <div className="inquiry-item-header" onClick={() => toggleExpand(item.id)}>
                                <div className="inquiry-status">
                                    {item.status === 'answered' ? (
                                        <span className="status-badge answered">답변완료</span>
                                    ) : (
                                        <span className="status-badge waiting">답변대기</span>
                                    )}
                                </div>
                                <div className="inquiry-info">
                                    <h3 className="inquiry-item-title">
                                        {item.isSecret && <Lock size={14} className="secret-icon" />}
                                        <span className="category-badge">{item.category}</span>
                                        {item.title}
                                    </h3>
                                    <div className="inquiry-meta">
                                        <span>{item.writer}</span>
                                        <span className="divider">|</span>
                                        <span>{item.date}</span>
                                    </div>
                                </div>
                                <div className="inquiry-toggle">
                                    {expandedId === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                            {expandedId === item.id && (
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
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InquiryList;
