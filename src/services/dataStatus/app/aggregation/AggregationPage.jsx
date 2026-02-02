import React, { useState, useEffect, useRef } from 'react';
import { BarChart2, LineChart, PieChart, Donut, AreaChart, LayoutGrid, Radar, Layers, Percent, Filter, Aperture, MoveVertical, MoreHorizontal, Waves, GitCommitVertical, Target } from 'lucide-react';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import KendoChart from '../../components/KendoChart';
import './AggregationPage.css';
import '@progress/kendo-theme-default/dist/all.css';

const AggregationCard = ({ q }) => {
    const [chartMode, setChartMode] = useState('column');

    return (
        <div id={q.id} className="agg-card">
            <div className="agg-card-header">
                <div className="agg-card-title-group">
                    <div className="agg-card-id">{q.id}</div>
                    <div className="agg-card-label">{q.label}</div>
                </div>
                <div className="view-options">
                    <button className={`view-option-btn ${chartMode === 'column' || chartMode === 'bar' ? 'active' : ''}`} onClick={() => setChartMode('column')} title="막대형 차트"><BarChart2 size={18} /></button>
                    <button className={`view-option-btn ${chartMode === 'stackedColumn' || chartMode === 'stacked100Column' ? 'active' : ''}`} onClick={() => setChartMode('stackedColumn')} title="누적형 차트"><Layers size={18} /></button>
                    <button className={`view-option-btn ${chartMode === 'line' ? 'active' : ''}`} onClick={() => setChartMode('line')} title="선형 차트"><LineChart size={18} /></button>
                    <button className={`view-option-btn ${chartMode === 'pie' ? 'active' : ''}`} onClick={() => setChartMode('pie')} title="원형 차트"><PieChart size={18} /></button>
                    <button className={`view-option-btn ${chartMode === 'donut' ? 'active' : ''}`} onClick={() => setChartMode('donut')} title="도넛형 차트"><Donut size={18} /></button>
                    <button className={`view-option-btn ${chartMode === 'radarArea' ? 'active' : ''}`} onClick={() => setChartMode('radarArea')} title="방사형 차트"><Aperture size={18} /></button>
                    <button className={`view-option-btn ${chartMode === 'funnel' ? 'active' : ''}`} onClick={() => setChartMode('funnel')} title="깔때기 차트"><Filter size={18} /></button>
                    <button className={`view-option-btn ${chartMode === 'scatterPoint' ? 'active' : ''}`} onClick={() => setChartMode('scatterPoint')} title="점 도표"><MoreHorizontal size={18} /></button>
                    <button className={`view-option-btn ${chartMode === 'area' ? 'active' : ''}`} onClick={() => setChartMode('area')} title="영역형 차트"><AreaChart size={18} /></button>
                    <button className={`view-option-btn ${chartMode === 'heatmap' ? 'active' : ''}`} onClick={() => setChartMode('heatmap')} title="히트맵"><LayoutGrid size={18} /></button>
                </div>
            </div>
            <div className="agg-card-body">
                {/* Table */}
                <div className="agg-table-container">
                    <table className="agg-table">
                        <thead>
                            <tr>
                                <th>항목</th>
                                <th>Banner A</th>
                                <th>Banner B</th>
                                <th>Banner C</th>
                                <th>합계</th>
                            </tr>
                        </thead>
                        <tbody>
                            {q.data.map((row, i) => (
                                <tr key={i}>
                                    <td>{row.name}</td>
                                    <td>{row['Banner A']}</td>
                                    <td>{row['Banner B']}</td>
                                    <td>{row['Banner C']}</td>
                                    <td>{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Chart */}
                <div className="agg-chart-container">
                    <KendoChart
                        data={q.data}
                        initialType={chartMode}
                        allowedTypes={
                            chartMode === 'column' || chartMode === 'bar' ? ['column', 'bar'] :
                                chartMode === 'stackedColumn' || chartMode === 'stacked100Column' ? ['stackedColumn', 'stacked100Column'] :
                                    chartMode === 'line' ? ['line'] :
                                        chartMode === 'pie' ? ['pie'] :
                                            chartMode === 'donut' ? ['donut'] :
                                                chartMode === 'area' ? ['area'] :
                                                    chartMode === 'heatmap' ? ['heatmap'] :
                                                        chartMode === 'radarLine' ? ['radarLine'] :
                                                            chartMode === 'funnel' ? ['funnel'] :
                                                                chartMode === 'scatterPoint' ? ['scatterPoint'] :
                                                                    chartMode === 'radarArea' ? ['radarArea'] : []
                        }
                    />
                </div>
            </div>
        </div>
    );
};

const AggregationPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeId, setActiveId] = useState(null);
    const mainRef = useRef(null);

    const questions = [
        {
            id: 'q1',
            label: '서비스 전반적인 만족도는?',
            n: 240,
            data: [
                { name: 'Very Low', 'Banner A': 20, 'Banner B': 16, 'Banner C': 8, total: 44 },
                { name: 'Low', 'Banner A': 5, 'Banner B': 16, 'Banner C': 50, total: 48 },
                { name: 'Neutral', 'Banner A': 11, 'Banner B': 16, 'Banner C': 30, total: 57 },
                { name: 'High', 'Banner A': 16, 'Banner B': 16, 'Banner C': 40, total: 72 },
                { name: 'Very High', 'Banner A': 10, 'Banner B': 10, 'Banner C': 20, total: 40 },
            ]
        },
        {
            id: 'q2',
            label: '선호하는 기능을 모두 선택하세요',
            n: 240,
            data: [
                { name: 'Option A', 'Banner A': 20, 'Banner B': 15, 'Banner C': 25, total: 60 },
                { name: 'Option B', 'Banner A': 10, 'Banner B': 30, 'Banner C': 10, total: 50 },
                { name: 'Option C', 'Banner A': 25, 'Banner B': 15, 'Banner C': 20, total: 60 },
                { name: 'Option D', 'Banner A': 15, 'Banner B': 20, 'Banner C': 35, total: 70 },
            ]
        },
        {
            id: 'gender',
            label: '귀하의 성별은?',
            n: 240,
            data: [
                { name: 'Male', 'Banner A': 40, 'Banner B': 35, 'Banner C': 45, total: 120 },
                { name: 'Female', 'Banner A': 40, 'Banner B': 45, 'Banner C': 35, total: 120 },
            ]
        },
        {
            id: 'age',
            label: '귀하의 연령대는?',
            n: 240,
            data: [
                { name: '20s', 'Banner A': 20, 'Banner B': 20, 'Banner C': 20, total: 60 },
                { name: '30s', 'Banner A': 20, 'Banner B': 20, 'Banner C': 20, total: 60 },
                { name: '40s', 'Banner A': 20, 'Banner B': 20, 'Banner C': 20, total: 60 },
                { name: '50s', 'Banner A': 20, 'Banner B': 20, 'Banner C': 20, total: 60 },
            ]
        },
        {
            id: 'region',
            label: '거주 지역은?',
            n: 240,
            data: [
                { name: 'Seoul', 'Banner A': 30, 'Banner B': 30, 'Banner C': 30, total: 90 },
                { name: 'Busan', 'Banner A': 20, 'Banner B': 20, 'Banner C': 20, total: 60 },
                { name: 'Incheon', 'Banner A': 15, 'Banner B': 15, 'Banner C': 15, total: 45 },
                { name: 'Others', 'Banner A': 15, 'Banner B': 15, 'Banner C': 15, total: 45 },
            ]
        },
        {
            id: 'weight_demo',
            label: '가중치 적용',
            n: 240,
            data: [
                { name: 'Applied', 'Banner A': 80, 'Banner B': 80, 'Banner C': 80, total: 240 },
            ]
        }
    ];

    const filteredQuestions = questions.filter(q =>
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sidebarItems = filteredQuestions.map(q => ({
        id: q.id,
        name: q.id,
        label: q.label
    }));

    const scrollToId = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveId(id);
        }
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            {
                root: mainRef.current,
                rootMargin: '-40% 0px -60% 0px',
                threshold: 0
            }
        );

        const cards = document.querySelectorAll('.agg-card');
        cards.forEach((card) => observer.observe(card));

        return () => {
            cards.forEach((card) => observer.unobserve(card));
        };
    }, [filteredQuestions]);

    return (
        <div className="aggregation-page" data-theme="data-dashboard">
            <DataHeader title="문항 집계 현황" />
            <div className="aggregation-layout">
                <SideBar
                    title="문항 목록"
                    items={sidebarItems}
                    selectedId={activeId}
                    onItemClick={(item) => scrollToId(item.id)} // 스크롤 위치에 따라 선택된 아이템 표시
                    onSearch={setSearchTerm}
                />

                <div className="agg-main" ref={mainRef}>
                    {filteredQuestions.map(q => (
                        <AggregationCard key={q.id} q={q} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AggregationPage;
