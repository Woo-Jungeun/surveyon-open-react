import React from "react";
import { Button } from "@progress/kendo-react-buttons";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, Home, AlertCircle } from "lucide-react";

const PageNotFound = () => {
    const navigate = useNavigate();

    return (
        <section className="srt-premium-404">
            {/* Background Decorative Elements */}
            <div className="srt-404-bg-blur blur-1"></div>
            <div className="srt-404-bg-blur blur-2"></div>
            <div className="srt-404-bg-blur blur-3"></div>

            <div className="srt-404-container-v2">
                <div className="srt-404-glass-card">
                    <div className="srt-404-header">
                        <div className="srt-404-icon-orbit">
                            <Search size={48} className="srt-404-main-icon" />
                            <div className="orbit-dot dot-1"></div>
                            <div className="orbit-dot dot-2"></div>
                        </div>
                        <h1 className="srt-404-big-text">404</h1>
                    </div>

                    <div className="srt-404-body">
                        <h2 className="srt-404-sub-title">페이지를 찾을 수 없습니다</h2>
                        <p className="srt-404-desc">
                            요청하신 페이지가 사라졌거나 주소가 잘못되었습니다.<br />
                            아래 버튼을 통해 이전 페이지로 돌아가거나 홈으로 이동하실 수 있습니다.
                        </p>
                    </div>

                    <div className="srt-404-footer">
                        <Button
                            themeColor={"none"}
                            className="srt-404-btn secondary"
                            onClick={() => navigate(-1)}
                        >
                            <ChevronLeft size={18} />
                            이전으로
                        </Button>
                        <Button
                            themeColor={"primary"}
                            className="srt-404-btn primary"
                            onClick={() => navigate("/")}
                        >
                            <Home size={18} />
                            홈으로 가기
                        </Button>
                    </div>
                </div>

                <div className="srt-404-background-text">PAGE NOT FOUND</div>
            </div>
        </section>
    );
};

export default PageNotFound;
