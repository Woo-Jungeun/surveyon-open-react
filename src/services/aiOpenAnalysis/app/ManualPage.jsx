import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { manualData } from './ManualData';
import manualCss from '@/assets/css/manual.css?inline';

const ManualPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentId = searchParams.get('id') || (manualData.length > 0 ? manualData[0].id : null);

    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [contentOpacity, setContentOpacity] = useState(1);

    const currentItem = manualData.find(item => item.id === currentId);

    useEffect(() => {
        // Inject CSS
        const style = document.createElement('style');
        style.innerHTML = manualCss;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const handleMenuClick = (id) => {
        if (id === currentId) return;

        setContentOpacity(0);
        setTimeout(() => {
            setSearchParams({ id });
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
                    {manualData.map(item => (
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
            </nav>

            {/* Main Content */}
            <main id="main-content">
                <div className="content-wrapper">
                    <div
                        id="content-area"
                        style={{ opacity: contentOpacity, transition: 'opacity 0.2s ease-in-out' }}
                        dangerouslySetInnerHTML={{ __html: currentItem ? currentItem.content : '' }}
                    />
                </div>
            </main>
        </div>
    );
};

export default ManualPage;
