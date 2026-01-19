import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { manualData } from './ManualData';
import manualCss from '@/assets/css/manual.css?inline';

const ManualPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const isPreview = searchParams.get('preview') === 'true';

    // Preview Logic
    const [displayData, setDisplayData] = useState(manualData);

    useEffect(() => {
        if (isPreview) {
            const previewDataStr = localStorage.getItem('manual_preview_data');
            if (previewDataStr) {
                try {
                    const previewItem = JSON.parse(previewDataStr);

                    // Merge preview item into manualData
                    const updatedData = manualData.map(item =>
                        item.id === previewItem.id ? previewItem : item
                    );

                    // If it's a new item (not in manualData), append it
                    if (!manualData.find(item => item.id === previewItem.id)) {
                        updatedData.push(previewItem);
                    }

                    setDisplayData(updatedData);
                } catch (e) {
                    console.error("Failed to parse preview data", e);
                    setDisplayData(manualData);
                }
            } else {
                setDisplayData(manualData);
            }
        } else {
            setDisplayData(manualData);
        }
    }, [isPreview]);

    const currentId = searchParams.get('id') || (displayData.length > 0 ? displayData[0].id : null);

    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [contentOpacity, setContentOpacity] = useState(1);
    const contentAreaRef = useRef(null);

    const currentItem = displayData.find(item => item.id === currentId);

    useEffect(() => {
        // Inject CSS
        const style = document.createElement('style');
        style.innerHTML = manualCss;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    useEffect(() => {
        if (!currentItem || !contentAreaRef.current) return;

        const contentArea = contentAreaRef.current;

        // 상세 페이지(detail_X) 렌더링 및 이벤트 바인딩
        Object.keys(currentItem).forEach(key => {
            if (key.startsWith('detail_')) {
                const detailId = key; // e.g., detail_1
                const detailContent = currentItem[key];

                // 이미 존재하는지 확인 (재렌더링 시 중복 방지)
                if (contentArea.querySelector(`#${detailId}`)) return;

                // 상세 내용을 담을 컨테이너 생성
                const detailContainer = document.createElement('div');
                detailContainer.id = detailId;
                detailContainer.className = 'detail-container';
                detailContainer.innerHTML = `<div class="detail-view">${detailContent}</div>`;

                // 버튼 위치 찾기 및 그 뒤에 추가
                const triggerBtn = contentArea.querySelector(`.btn-detail[data-detail="${detailId}"]`);
                if (triggerBtn) {
                    // 버튼이 .guide-button으로 감싸져 있는 경우, 그 부모(wrapper) 뒤에 추가
                    if (triggerBtn.parentNode.classList.contains('guide-button')) {
                        triggerBtn.parentNode.parentNode.insertBefore(detailContainer, triggerBtn.parentNode.nextSibling);
                    } else {
                        // 버튼의 부모 요소 내에서 버튼 뒤에 추가
                        triggerBtn.parentNode.insertBefore(detailContainer, triggerBtn.nextSibling);
                    }
                } else {
                    // 버튼을 못 찾으면 콘텐츠 영역 맨 뒤에 추가 (Fallback)
                    contentArea.appendChild(detailContainer);
                }
            }
        });

        // 자세히 보기 버튼 이벤트 리스너 추가
        const detailBtns = contentArea.querySelectorAll('.btn-detail');

        const handleBtnClick = (e) => {
            const btn = e.currentTarget;
            const targetId = btn.getAttribute('data-detail');
            const targetEl = contentArea.querySelector(`#${targetId}`);

            if (targetEl) {
                if (targetEl.classList.contains('show')) {
                    targetEl.classList.remove('show');
                    btn.classList.remove('active');
                    btn.textContent = '상세보기';
                } else {
                    targetEl.classList.add('show');
                    btn.classList.add('active');
                    btn.textContent = '상세 접기';
                }
            }
        };

        detailBtns.forEach(btn => {
            btn.addEventListener('click', handleBtnClick);
        });

        return () => {
            detailBtns.forEach(btn => {
                btn.removeEventListener('click', handleBtnClick);
            });
        };

    }, [currentItem]);

    const handleMenuClick = (id) => {
        if (id === currentId) return;

        setContentOpacity(0);
        setTimeout(() => {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('id', id);
            setSearchParams(newParams);
            setContentOpacity(1);
            window.scrollTo(0, 0);
            setIsMobileOpen(false);
        }, 200);
    };

    return (
        <div className="manual-container">
            {/* Sidebar */}
            <nav id="sidebar" className={isMobileOpen ? 'mobile-open' : ''}>
                <div className="sidebar-header">
                    <button
                        id="mobile-menu-btn"
                        className="mobile-menu-btn"
                        aria-label="메뉴 열기"
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <h1>
                        설문온<br /> 사용자 가이드
                    </h1>
                </div>
                <ul className="menu-list">
                    {displayData.map(item => (
                        <li key={item.id} className="menu-item">
                            <button
                                className={`menu-btn ${item.id === currentId ? 'active' : ''}`}
                                onClick={() => handleMenuClick(item.id)}
                            >
                                <span dangerouslySetInnerHTML={{ __html: item.icon }} style={{ display: 'flex', alignItems: 'center' }} />
                                <span>{item.title}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                {!isPreview && (
                    <div style={{ padding: '20px', borderTop: '1px solid #eee' }}>
                        <button
                            onClick={() => window.open(`/manual/editor?id=${currentId}`, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                color: '#475569',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            매뉴얼 수정
                        </button>
                    </div>
                )}
            </nav>

            {/* Main Content */}
            <main id="main-content">
                <div className="content-wrapper">
                    <div
                        id="content-area"
                        ref={contentAreaRef}
                        style={{ opacity: contentOpacity, transition: 'opacity 0.2s ease-in-out' }}
                        dangerouslySetInnerHTML={{ __html: currentItem ? currentItem.content : '' }}
                    />
                </div>
            </main>
        </div>
    );
};

export default ManualPage;
