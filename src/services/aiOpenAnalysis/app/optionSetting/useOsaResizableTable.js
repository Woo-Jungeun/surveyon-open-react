import { useEffect, useLayoutEffect, useRef } from "react";

const EDGE_HIT_PX = 6;
const MIN_COL_WIDTH = 34;

/**
 * .osa-table 컬럼 너비 드래그 조절 공통 훅
 * - DOM 노드 추가 없이 tr.osa-th-row 경계선(±6px) 감지로 React 재조정 충돌 원천 차단
 * - 드래그 중 60fps 실시간 폭 반영 + 리렌더링(페이지·필터·정렬) 후에도 사용자 지정 폭 유지
 * - 컬럼 경계선 더블클릭 시 기본 컬럼 비율로 즉시 초기화
 *
 * @param {React.RefObject<HTMLElement>} scrollOrTableRef .osa-table-scroll 또는 table.osa-table ref
 * @param {string} layoutKey 컬럼 구성 변경 키 (예: lvCode, visibleCols 조합)
 * @param {boolean} [enabled=true] 테이블 마운트 활성 여부 (접힘 패널 대응)
 */
export function useOsaResizableTable(scrollOrTableRef, layoutKey = "default", enabled = true) {
    const savedRef = useRef(null); // { layoutKey, widths: number[], totalWidth: number }
    const draggingRef = useRef(false);
    const suppressClickUntilRef = useRef(0);
    const prevLayoutKeyRef = useRef(layoutKey);

    const resolveTable = (root) => {
        if (!root) return null;
        return root.tagName === "TABLE" ? root : root.querySelector("table.osa-table");
    };

    // 컬럼 구성(단계/열 표시) 변경 시 사용자 수동 폭 초기화 및 원래 폭 복원
    useLayoutEffect(() => {
        const root = scrollOrTableRef?.current;
        const table = resolveTable(root);
        if (!table) {
            prevLayoutKeyRef.current = layoutKey;
            return;
        }

        const thRow = table.querySelector("thead tr.osa-th-row");
        const ths = thRow ? Array.from(thRow.children) : [];

        if (prevLayoutKeyRef.current !== layoutKey) {
            prevLayoutKeyRef.current = layoutKey;
            savedRef.current = null;
            table.style.width = "";
            ths.forEach((th) => {
                if (th.dataset.osaOrigWidth !== undefined) {
                    th.style.width = th.dataset.osaOrigWidth;
                }
                th.style.minWidth = "";
                th.style.maxWidth = "";
            });
        }

        if (!savedRef.current) {
            ths.forEach((th) => {
                th.dataset.osaOrigWidth = th.style.width || "";
            });
            return;
        }

        if (savedRef.current.layoutKey === layoutKey && ths.length === savedRef.current.widths.length) {
            table.style.width = `${savedRef.current.totalWidth}px`;
            ths.forEach((th, i) => {
                const w = `${savedRef.current.widths[i]}px`;
                th.style.width = w;
                th.style.minWidth = w;
                th.style.maxWidth = w;
            });
        }
    });

    useEffect(() => {
        if (!enabled) return undefined;
        const root = scrollOrTableRef?.current;
        const table = resolveTable(root);
        if (!table) return undefined;

        const scrollHost = root.tagName === "TABLE" ? table.parentElement : root;
        const thRow = table.querySelector("thead tr.osa-th-row");
        if (!thRow) return undefined;

        let hoveredTh = null;
        let activeCleanup = null;

        const clearHover = () => {
            if (hoveredTh) {
                hoveredTh.removeAttribute("data-resize-hover");
                hoveredTh = null;
            }
            thRow.style.cursor = "";
        };

        const findEdgeTarget = (clientX) => {
            const ths = Array.from(thRow.children);
            for (let i = 0; i < ths.length; i += 1) {
                const rect = ths[i].getBoundingClientRect();
                if (Math.abs(clientX - rect.right) <= EDGE_HIT_PX) {
                    return { index: i, th: ths[i], ths };
                }
            }
            return null;
        };

        const handleMouseMove = (e) => {
            if (draggingRef.current) return;
            const hit = findEdgeTarget(e.clientX);
            if (!hit) {
                clearHover();
                return;
            }
            if (hoveredTh && hoveredTh !== hit.th) {
                hoveredTh.removeAttribute("data-resize-hover");
            }
            hoveredTh = hit.th;
            hoveredTh.setAttribute("data-resize-hover", "true");
            thRow.style.cursor = "col-resize";
        };

        const handleMouseLeave = () => {
            if (!draggingRef.current) clearHover();
        };

        const handleMouseDown = (e) => {
            if (e.button !== 0) return;
            const hit = findEdgeTarget(e.clientX);
            if (!hit) return;

            e.preventDefault();
            e.stopPropagation();

            clearHover();
            draggingRef.current = true;
            suppressClickUntilRef.current = Date.now() + 400;

            const { index, th, ths } = hit;
            ths.forEach((cell) => {
                if (cell.dataset.osaOrigWidth === undefined) {
                    cell.dataset.osaOrigWidth = cell.style.width || "";
                }
            });

            const startWidths = ths.map((cell) =>
                Math.max(MIN_COL_WIDTH, Math.round(cell.getBoundingClientRect().width))
            );
            const startTotal = startWidths.reduce((acc, w) => acc + w, 0);
            const startX = e.clientX;
            const startColW = startWidths[index];

            table.style.width = `${startTotal}px`;
            ths.forEach((cell, i) => {
                const w = `${startWidths[i]}px`;
                cell.style.width = w;
                cell.style.minWidth = w;
                cell.style.maxWidth = w;
            });

            th.setAttribute("data-resizing", "true");
            document.body.classList.add("osa-is-col-resizing");

            // 스크롤 영역 세로 가이드 라인 생성
            let guideEl = null;
            if (scrollHost) {
                guideEl = document.createElement("div");
                guideEl.className = "osa-col-resize-guide";
                const updateGuidePos = () => {
                    const hostRect = scrollHost.getBoundingClientRect();
                    const cellRect = th.getBoundingClientRect();
                    const leftPx = cellRect.right - hostRect.left + scrollHost.scrollLeft - 1;
                    guideEl.style.left = `${Math.max(0, leftPx)}px`;
                    guideEl.style.top = `${scrollHost.scrollTop}px`;
                    guideEl.style.height = `${scrollHost.clientHeight}px`;
                };
                scrollHost.appendChild(guideEl);
                updateGuidePos();
                guideEl._update = updateGuidePos;
            }

            const onWinMove = (ev) => {
                const dx = ev.clientX - startX;
                const nextW = Math.max(MIN_COL_WIDTH, startColW + dx);
                const nextTotal = startTotal + (nextW - startColW);

                startWidths[index] = nextW;
                const wStr = `${nextW}px`;
                th.style.width = wStr;
                th.style.minWidth = wStr;
                th.style.maxWidth = wStr;
                table.style.width = `${nextTotal}px`;

                savedRef.current = {
                    layoutKey,
                    widths: [...startWidths],
                    totalWidth: nextTotal,
                };

                guideEl?._update?.();
            };

            const onWinUp = () => {
                draggingRef.current = false;
                suppressClickUntilRef.current = Date.now() + 250;
                th.removeAttribute("data-resizing");
                document.body.classList.remove("osa-is-col-resizing");
                if (guideEl && guideEl.parentNode) {
                    guideEl.parentNode.removeChild(guideEl);
                }
                window.removeEventListener("mousemove", onWinMove);
                window.removeEventListener("mouseup", onWinUp);
                activeCleanup = null;
            };

            window.addEventListener("mousemove", onWinMove);
            window.addEventListener("mouseup", onWinUp);
            activeCleanup = onWinUp;
        };

        const handleClickCapture = (e) => {
            if (Date.now() < suppressClickUntilRef.current || findEdgeTarget(e.clientX)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        const handleDblClickCapture = (e) => {
            const hit = findEdgeTarget(e.clientX);
            if (!hit) return;
            e.preventDefault();
            e.stopPropagation();

            savedRef.current = null;
            table.style.width = "";
            hit.ths.forEach((cell) => {
                if (cell.dataset.osaOrigWidth !== undefined) {
                    cell.style.width = cell.dataset.osaOrigWidth;
                } else {
                    cell.style.width = "";
                }
                cell.style.minWidth = "";
                cell.style.maxWidth = "";
            });
        };

        thRow.addEventListener("mousemove", handleMouseMove);
        thRow.addEventListener("mouseleave", handleMouseLeave);
        thRow.addEventListener("mousedown", handleMouseDown, true);
        thRow.addEventListener("click", handleClickCapture, true);
        thRow.addEventListener("dblclick", handleDblClickCapture, true);

        return () => {
            activeCleanup?.();
            clearHover();
            thRow.removeEventListener("mousemove", handleMouseMove);
            thRow.removeEventListener("mouseleave", handleMouseLeave);
            thRow.removeEventListener("mousedown", handleMouseDown, true);
            thRow.removeEventListener("click", handleClickCapture, true);
            thRow.removeEventListener("dblclick", handleDblClickCapture, true);
        };
    }, [scrollOrTableRef, layoutKey, enabled]);
}

