import React from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/common/sidebar/AppSidebar';
import PageFooter from './PageFooter';
import './PageLayout.css';

const SURVEYON_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#7C3AED;stop-opacity:1" /><stop offset="100%" style="stop-color:#5B21B6;stop-opacity:1" /></linearGradient><linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FFB366;stop-opacity:1" /><stop offset="100%" style="stop-color:#FF8C42;stop-opacity:1" /></linearGradient></defs><rect width="32" height="32" rx="6" fill="url(#bgGradient)"/><text x="16" y="20" font-family="Arial, sans-serif" font-size="16" font-weight="900" fill="url(#textGradient)" text-anchor="middle" letter-spacing="-0.5">ON</text><rect x="6" y="22" width="20" height="2.5" rx="1.25" fill="#FF8C42" opacity="0.8"/><circle cx="25" cy="7" r="3" fill="#4ADE80"><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="25" cy="7" r="4.5" fill="#4ADE80" opacity="0.3"><animate attributeName="r" values="4.5;5.5;4.5" dur="2s" repeatCount="indefinite"/></circle><text x="16" y="10" font-family="Arial, sans-serif" font-size="6" font-weight="700" fill="#FFF" text-anchor="middle" opacity="0.9">설문</text></svg>`;
const SURVEYON_FAVICON_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(SURVEYON_FAVICON_SVG)}`;

/**
 * 설문온 전체 서비스 공통 프레임 레이아웃 (AppLayout)
 * - 1번 사이드바 + 3번 푸터 + 중앙 콘텐츠 영역(children 또는 React Router Outlet)
 *
 * @param {'hsrt'|'dataManagement'|'aiOpenAnalysis'|'fieldManagement'} [service='hsrt'] - 대상 서비스 타입
 * @param {boolean} [hideFooter=false] - 푸터 숨김 여부
 * @param {boolean} [hideSidebar=false] - 사이드바 숨김 여부
 * @param {object} [sidebarProps] - AppSidebar로 전달할 추가 prop
 * @param {React.ReactNode} [children] - 내부 페이지 노드 (지정하지 않으면 <Outlet /> 렌더링)
 * @param {string} [dataTheme] - data-theme 테마 속성
 * @param {string} [className=""] - 추가 커스텀 클래스
 * @param {React.CSSProperties} [style] - 인라인 스타일
 */
const AppLayout = ({
    id = "app-root",
    service = 'hsrt',
    hideFooter = false,
    hideSidebar = false,
    sidebarProps = {},
    dataTheme,
    children,
    className = "",
    style = {},
    ...rest
}) => {
    const serviceThemeMap = {
        hsrt: 'hsrt',
        dataManagement: 'dataManagement',
        aiOpen: 'aiOpen',
        aiOpenAnalysis: 'aiOpen',
        fieldManagement: 'fieldManagement'
    };
    const resolvedTheme = dataTheme || serviceThemeMap[service] || 'hsrt';

    React.useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', resolvedTheme);
            document.body.setAttribute('data-theme', resolvedTheme);

            // 설문온 공통 파비콘 및 기본 탭 타이틀 자동 적용 (기존 link 교체로 브라우저 캐시 강제 갱신)
            const existingIcons = document.querySelectorAll("link[rel*='icon']");
            existingIcons.forEach((el) => el.parentNode?.removeChild(el));
            const faviconLink = document.createElement('link');
            faviconLink.rel = 'icon';
            faviconLink.type = 'image/svg+xml';
            faviconLink.href = SURVEYON_FAVICON_DATA_URI;
            document.head.appendChild(faviconLink);

            if (!document.title || document.title === 'Vite + React' || document.title.startsWith('surveyon-')) {
                document.title = '설문온';
            }

            // H-SRT가 아닌 다른 대메뉴로 전환할 때만 브랜드 테마 속성을 해제합니다.
            if (resolvedTheme !== 'hsrt') {
                document.documentElement.removeAttribute('data-srt-brand');
                document.documentElement.style.removeProperty('--srt-brand');
                document.documentElement.style.removeProperty('--srt-brand-secondary');
                document.documentElement.style.removeProperty('--srt-brand-accent');
                document.documentElement.style.removeProperty('--srt-font-family');
                document.body.style.removeProperty('font-family');
            }
        }
    }, [resolvedTheme]);

    return (
        <div
            id={id}
            className={`app-layout-root ${className}`}
            style={style}
            data-theme={resolvedTheme}
            {...rest}
        >
            {/* 1번 영역: 좌측 공통 사이드바 */}
            {!hideSidebar && <AppSidebar service={service} {...sidebarProps} />}

            {/* 메인 섹션 */}
            <section id="app-layout-main" className="app-layout-main">
                <div id="app-main-content" className="app-layout-content">
                    {children || <Outlet />}
                </div>

                {/* 3번 영역: 하단 공통 푸터 */}
                {!hideFooter && <PageFooter id="app-footer" />}
            </section>
        </div>
    );
};

export default AppLayout;
