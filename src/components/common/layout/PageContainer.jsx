import React, { forwardRef } from 'react';
import PageHeader from './PageHeader';
import './PageLayout.css';

/**
 * 설문온 단위 업무 화면 컨테이너 (PageContainer)
 * - 2번 상단 헤더(PageHeader)와 4번 메인 작업영역(PageContent)을 표준 규격으로 감싸는 컨테이너
 *
 * @param {string|React.ReactNode} [title] - 페이지 제목 (미지정 시 헤더 미출력)
 * @param {string|React.ReactNode} [infoTooltip] - 제목 옆 정보 안내 툴팁
 * @param {React.ReactNode} [headerActions] - 헤더 우측 액션 버튼들
 * @param {Function} [onSearch] - 헤더 검색 콜백
 * @param {string} [searchPlaceholder] - 헤더 검색 placeholder
 * @param {Function} [onSave] - 저장 버튼 클릭 콜백
 * @param {string} [saveLabel] - 저장 버튼 텍스트
 * @param {boolean} [saveDisabled] - 저장 버튼 비활성화 여부
 * @param {Function} [onAdd] - 추가 버튼 클릭 콜백
 * @param {string} [addLabel] - 추가 버튼 텍스트
 * @param {Function} [onDelete] - 삭제 버튼 클릭 콜백
 * @param {string} [deleteLabel] - 삭제 버튼 텍스트
 * @param {boolean} [noHeader=false] - 헤더를 표시하지 않을지 여부
 * @param {boolean} [contentPadding=false] - 본문 영역 기본 여백(16px) 적용 여부
 * @param {boolean} [scrollable=false] - 본문 영역 세로 스크롤 허용 여부
 * @param {string} [className=""] - 추가 커스텀 클래스
 * @param {React.CSSProperties} [style] - 인라인 스타일
 * @param {string} [contentClassName=""] - 본문 영역 추가 클래스
 * @param {React.CSSProperties} [contentStyle] - 본문 영역 인라인 스타일
 * @param {React.ReactNode} children - 4번 메인 작업영역 본문
 */
const PageContainer = forwardRef(({
    id = "page-container",
    title,
    infoTooltip,
    headerActions,
    onSearch,
    searchPlaceholder,
    onSave,
    saveLabel,
    saveDisabled,
    onAdd,
    addLabel,
    onDelete,
    deleteLabel,
    noHeader = false,
    contentPadding = false,
    scrollable = false,
    className = "",
    style = {},
    contentClassName = "",
    contentStyle = {},
    children,
    ...rest
}, ref) => {
    return (
        <main
            ref={ref}
            id={id}
            className={`page-container ${className}`}
            style={style}
            {...rest}
        >
            {/* 2번 영역: 헤더 (noHeader가 아니고 title이 있거나 headerActions가 있을 때) */}
            {!noHeader && (title || headerActions || onSave || onAdd || onSearch) && (
                <PageHeader
                    title={title}
                    infoTooltip={infoTooltip}
                    actions={headerActions}
                    onSearch={onSearch}
                    searchPlaceholder={searchPlaceholder}
                    onSave={onSave}
                    saveLabel={saveLabel}
                    saveDisabled={saveDisabled}
                    onAdd={onAdd}
                    addLabel={addLabel}
                    onDelete={onDelete}
                    deleteLabel={deleteLabel}
                />
            )}

            {/* 4번 영역: 메인 작업영역 */}
            <div
                id="page-content"
                className={`page-content ${contentPadding ? 'page-content-padded' : ''} ${scrollable ? 'page-content-scrollable' : ''} ${contentClassName}`}
                style={contentStyle}
            >
                {children}
            </div>
        </main>
    );
});

PageContainer.displayName = 'PageContainer';

export default PageContainer;
