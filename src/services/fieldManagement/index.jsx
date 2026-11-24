import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { AppLayout } from "@/components/common/layout";

let cachedRemoteModulePromise = null;
let ResolvedRemoteComponent = null;
const injectedRemoteStyles = new Set();

function buildPermissionContext(auth) {
    return {
        auth,
        user: auth?.user || null,
        userId: auth?.user?.userId || sessionStorage.getItem("userId") || "",
        userName: auth?.user?.userName || "",
        userGroup: auth?.user?.userGroup || "",
        userAuth: auth?.user?.userAuth || "",
        groupCode: sessionStorage.getItem("groupcode") || "",
        projectnum: sessionStorage.getItem("projectnum") || "",
        projectname: sessionStorage.getItem("projectname") || "",
        mergePn: sessionStorage.getItem("merge_pn") || "",
        myRole: sessionStorage.getItem("myRole") || "",
        serverName: sessionStorage.getItem("servername") || "",
    };
}

/**
 * 원격 모듈(remoteEntry.js)이 동적 주입하는 <link rel="stylesheet" href="/field_management/assets/style-*.css"> 안의
 * 중복 @font-face(SpoqaHanSansNeo) 때문에 브라우저 전체 글꼴이 재계산되며 화면이 깜빡이는 현상(FOIT)을 차단하고,
 * CSS가 완전히 준비된 뒤 컴포넌트가 마운트되도록 보장합니다.
 */
async function loadSanitizedRemoteStyle(href) {
    if (!href || injectedRemoteStyles.has(href)) return;
    injectedRemoteStyles.add(href);
    try {
        const res = await fetch(href);
        if (!res.ok) throw new Error(`CSS fetch failed: ${res.status}`);
        const rawCss = await res.text();
        // 메인 서버(MainLayout -> reset.css)에 이미 로드된 SpoqaHanSansNeo @font-face 중복 선언 제거
        const sanitizedCss = rawCss.replace(/@font-face\s*\{[^}]*\}/g, "");
        const styleEl = document.createElement("style");
        styleEl.setAttribute("data-field-remote-style", href);
        styleEl.textContent = sanitizedCss;
        document.head.appendChild(styleEl);
    } catch (err) {
        injectedRemoteStyles.delete(href);
        // 폴백: 일반 link 태그 복원
        const fallbackLink = document.createElement("link");
        fallbackLink.rel = "stylesheet";
        fallbackLink.href = href;
        document.head.appendChild(fallbackLink);
    }
}

export function preloadFieldRemote(forceReload = false) {
    if (forceReload) {
        cachedRemoteModulePromise = null;
        ResolvedRemoteComponent = null;
    }
    if (!cachedRemoteModulePromise) {
        const pendingStylePromises = [];
        let observer = null;

        if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
            const interceptLink = (node) => {
                if (
                    node?.nodeType === 1 &&
                    node.tagName === "LINK" &&
                    node.rel === "stylesheet" &&
                    typeof node.href === "string" &&
                    node.href.includes("/field_management/")
                ) {
                    const href = node.getAttribute("href") || node.href;
                    node.disabled = true;
                    node.remove();
                    pendingStylePromises.push(loadSanitizedRemoteStyle(href));
                }
            };

            // 이미 들어가 있는 link가 있는 경우도 정리
            document.head
                .querySelectorAll('link[rel="stylesheet"][href*="/field_management/"]')
                .forEach(interceptLink);

            observer = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    m.addedNodes.forEach(interceptLink);
                }
            });
            observer.observe(document.head, { childList: true });
        }

        cachedRemoteModulePromise = import("fieldManagementApp/RemoteFieldApp")
            .then(async (mod) => {
                // MutationObserver 마이크로태스크 반영 대기 후 원격 스타일 준비 완료까지 대기
                await Promise.resolve();
                if (observer) {
                    observer.disconnect();
                    observer = null;
                }
                if (pendingStylePromises.length > 0) {
                    await Promise.allSettled(pendingStylePromises);
                }

                const resolver =
                    mod?.getFieldMenuGroups ||
                    mod?.default?.getFieldMenuGroups ||
                    mod?.fieldMenuGroups ||
                    mod?.default?.fieldMenuGroups;

                if (resolver) {
                    window.__FIELD_REMOTE_MENU_RESOLVER__ = resolver;
                    window.dispatchEvent(new Event("fieldRemoteMenuLoaded"));
                }

                const normalized =
                    mod && typeof mod === "object" && "default" in mod ? mod : { default: mod };
                ResolvedRemoteComponent = normalized.default;
                return normalized;
            })
            .catch((err) => {
                if (observer) {
                    observer.disconnect();
                    observer = null;
                }
                cachedRemoteModulePromise = null;
                throw err;
            });
    }
    return cachedRemoteModulePromise;
}

// 새로고침(F5)으로 /field_management 경로에 바로 진입한 경우에만 즉시 선로딩 (타 대메뉴에는 영향 0)
if (typeof window !== "undefined" && window.location.pathname.startsWith("/field_management")) {
    preloadFieldRemote().catch(() => { });
}

class FieldRemoteErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error("[Module Federation] 실사관리 원격 모듈(remoteEntry.js) 로드 실패:", error, info);
    }

    render() {
        if (this.state.error) {
            return this.props.renderFallback({
                error: this.state.error,
                onRetry: () => {
                    this.setState({ error: null });
                    this.props.onRetry?.();
                },
            });
        }
        return this.props.children;
    }
}

export default function FieldManagementRoutes() {
    const auth = useSelector((store) => store.auth);
    const [remoteMenuGroups, setRemoteMenuGroups] = useState(() => {
        const resolver = window.__FIELD_REMOTE_MENU_RESOLVER__;
        if (!resolver) return null;
        try {
            const resolved =
                typeof resolver === "function" ? resolver(buildPermissionContext(auth)) : resolver;
            return Array.isArray(resolved) ? resolved : null;
        } catch {
            return null;
        }
    });
    const [remoteSidebarProps, setRemoteSidebarProps] = useState(null);
    const [retryKey, setRetryKey] = useState(0);

    const LazyRemoteFieldApp = useMemo(
        () => lazy(() => preloadFieldRemote(retryKey > 0)),
        [retryKey]
    );

    const evaluateResolver = useCallback(() => {
        const resolver = window.__FIELD_REMOTE_MENU_RESOLVER__;
        if (!resolver) return;
        try {
            const resolved =
                typeof resolver === "function"
                    ? resolver(buildPermissionContext(auth))
                    : resolver;
            if (Array.isArray(resolved)) {
                setRemoteMenuGroups(resolved);
            }
        } catch (err) {
            console.warn("[Module Federation] 실사관리 메뉴 권한 계산 중 오류:", err);
        }
    }, [auth]);

    useEffect(() => {
        evaluateResolver();
    }, [evaluateResolver]);

    useEffect(() => {
        const handleMenuLoaded = () => evaluateResolver();
        const handleMenuUpdated = (e) => {
            if (Array.isArray(e?.detail)) {
                setRemoteMenuGroups(e.detail);
            } else if (e?.detail && typeof e.detail === "object") {
                if (Array.isArray(e.detail.menuGroups)) {
                    setRemoteMenuGroups(e.detail.menuGroups);
                }
                if (e.detail.sidebarProps && typeof e.detail.sidebarProps === "object") {
                    setRemoteSidebarProps(e.detail.sidebarProps);
                }
            }
        };

        window.addEventListener("fieldRemoteMenuLoaded", handleMenuLoaded);
        window.addEventListener("pageSelected", handleMenuLoaded);
        window.addEventListener("fieldRemoteMenuUpdated", handleMenuUpdated);
        return () => {
            window.removeEventListener("fieldRemoteMenuLoaded", handleMenuLoaded);
            window.removeEventListener("pageSelected", handleMenuLoaded);
            window.removeEventListener("fieldRemoteMenuUpdated", handleMenuUpdated);
        };
    }, [evaluateResolver]);

    const sidebarProps = useMemo(
        () => ({
            menuGroups: remoteMenuGroups ?? [],
            ...(remoteSidebarProps || {}),
        }),
        [remoteMenuGroups, remoteSidebarProps]
    );

    const ActiveRemoteComponent = retryKey === 0 && ResolvedRemoteComponent ? ResolvedRemoteComponent : null;

    return (
        <AppLayout service="fieldManagement" sidebarProps={sidebarProps}>
            <FieldRemoteErrorBoundary
                key={retryKey}
                onRetry={() => setRetryKey((prev) => prev + 1)}
                renderFallback={({ error, onRetry }) => (
                    <div
                        style={{
                            margin: "32px",
                            padding: "28px 32px",
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
                            maxWidth: "680px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "10px",
                            }}
                        >
                            <span
                                style={{
                                    width: "4px",
                                    height: "18px",
                                    borderRadius: "2px",
                                    background: "#1e3a8a",
                                    display: "inline-block",
                                }}
                            />
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: "16px",
                                    fontWeight: 700,
                                    color: "#0f172a",
                                }}
                            >
                                실사관리 원격 화면을 아직 불러오지 못했습니다
                            </h3>
                        </div>
                        <p
                            style={{
                                margin: "0 0 12px 0",
                                fontSize: "13.5px",
                                lineHeight: 1.6,
                                color: "#475569",
                            }}
                        >
                            테스트/운영 서버의{" "}
                            <code
                                style={{
                                    background: "#f1f5f9",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "12.5px",
                                }}
                            >
                                /field_management/assets/remoteEntry.js
                            </code>{" "}
                            파일이 아직 업로드되지 않았거나 네트워크 연결을 확인해야 합니다.
                        </p>
                        {error?.message && (
                            <pre
                                style={{
                                    margin: "0 0 16px 0",
                                    padding: "10px 12px",
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    color: "#64748b",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all",
                                }}
                            >
                                {String(error.message)}
                            </pre>
                        )}
                        <button
                            type="button"
                            onClick={onRetry}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#1e3a8a",
                                color: "#ffffff",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            원격 화면 다시 시도
                        </button>
                    </div>
                )}
            >
                {ActiveRemoteComponent ? (
                    <ActiveRemoteComponent
                        onMenuChange={setRemoteMenuGroups}
                        onSidebarPropsChange={setRemoteSidebarProps}
                    />
                ) : (
                    <Suspense fallback={null}>
                        <LazyRemoteFieldApp
                            onMenuChange={setRemoteMenuGroups}
                            onSidebarPropsChange={setRemoteSidebarProps}
                        />
                    </Suspense>
                )}
            </FieldRemoteErrorBoundary>
        </AppLayout>
    );
}
