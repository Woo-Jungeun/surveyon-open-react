import React, { useState, useEffect, useRef } from 'react';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import KendoChart from '../../components/KendoChart';
import './AggregationPage.css';
import '@progress/kendo-theme-default/dist/all.css';

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
                { name: 'Very Low', 'Banner A': 16, 'Banner B': 16, 'Banner C': 16, total: 48 },
                { name: 'Low', 'Banner A': 16, 'Banner B': 16, 'Banner C': 16, total: 48 },
                { name: 'Neutral', 'Banner A': 16, 'Banner B': 16, 'Banner C': 16, total: 48 },
                { name: 'High', 'Banner A': 16, 'Banner B': 16, 'Banner C': 16, total: 48 },
                { name: 'Very High', 'Banner A': 16, 'Banner B': 16, 'Banner C': 16, total: 48 },
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
            <DataHeader title="집계현황" />
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
                        <div key={q.id} id={q.id} className="agg-card">
                            <div className="agg-card-header">
                                <div className="agg-card-title-group">
                                    <div className="agg-card-id">{q.id}</div>
                                    <div className="agg-card-label">{q.label}</div>
                                </div>
                                {/* <span className="agg-card-n">N {q.n}</span> */}
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
                                    <KendoChart data={q.data} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AggregationPage;
