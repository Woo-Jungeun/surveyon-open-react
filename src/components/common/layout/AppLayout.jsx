import React from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/common/sidebar/AppSidebar';
import PageFooter from './PageFooter';
import './PageLayout.css';

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
        }
    }, [resolvedTheme]);

    return (
        <div
            className={`app-layout-root ${className}`}
            style={style}
            data-theme={resolvedTheme}
            {...rest}
        >
            {/* 1번 영역: 좌측 공통 사이드바 */}
            {!hideSidebar && <AppSidebar service={service} {...sidebarProps} />}

            {/* 메인 섹션 */}
            <section className="app-layout-main">
                <div className="app-layout-content">
                    {children || <Outlet />}
                </div>

                {/* 3번 영역: 하단 공통 푸터 */}
                {!hideFooter && <PageFooter />}
            </section>
        </div>
    );
};

export default AppLayout;
