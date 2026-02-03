import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const ChoroplethMap = ({ data }) => {
    const [hoveredRegion, setHoveredRegion] = useState(null);
    const [geoData, setGeoData] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        // 실제 한국 GeoJSON 데이터 로드
        fetch('https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-provinces-2018-geo.json')
            .then(response => response.json())
            .then(data => setGeoData(data))
            .catch(error => console.error('Error loading map data:', error));
    }, []);

    // 가상 데이터 (실제로는 props.data 사용)
    const regionData = {
        '서울특별시': 100,
        '부산광역시': 82,
        '대구광역시': 72,
        '인천광역시': 70,
        '광주광역시': 68,
        '대전광역시': 75,
        '울산광역시': 78,
        '세종특별자치시': 65,
        '경기도': 85,
        '강원도': 45,
        '충청북도': 55,
        '충청남도': 60,
        '전라북도': 50,
        '전라남도': 40,
        '경상북도': 58,
        '경상남도': 62,
        '제주특별자치도': 35
    };

    // 값에 따라 색상 계산
    const getColor = (value) => {
        if (!value) return '#e6e6ff';
        if (value >= 80) return '#0000ff';
        if (value >= 60) return '#3333ff';
        if (value >= 40) return '#6666ff';
        if (value >= 20) return '#9999ff';
        return '#ccccff';
    };

    // GeoJSON coordinates를 SVG path로 변환
    const coordinatesToPath = (coordinates, type) => {
        if (type === 'Polygon') {
            return coordinates.map(ring => {
                return ring.map((coord, i) => {
                    const [lng, lat] = coord;
                    // 좌표 변환 (경도/위도 -> SVG 좌표)
                    const x = (lng - 124) * 100;
                    const y = (38 - lat) * 100;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ') + ' Z';
            }).join(' ');
        } else if (type === 'MultiPolygon') {
            return coordinates.map(polygon => {
                return polygon.map(ring => {
                    return ring.map((coord, i) => {
                        const [lng, lat] = coord;
                        const x = (lng - 124) * 100;
                        const y = (38 - lat) * 100;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ') + ' Z';
                }).join(' ');
            }).join(' ');
        }
        return '';
    };

    // 줌 인/아웃 핸들러
    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.3, 3));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.3, 1));
    };

    const handleReset = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };



    // 드래그 시작
    const handleMouseDown = (e) => {
        // 줌이 1이 아닐 때만 드래그 가능
        if (zoom !== 1) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - pan.x,
                y: e.clientY - pan.y
            });
        }
    };

    // 드래그 중
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    // 드래그 종료
    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (!geoData) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                fontSize: '16px',
                color: '#64748b'
            }}>
                지도 데이터 로딩 중...
            </div>
        );
    }

    const minValue = Math.min(...Object.values(regionData));
    const maxValue = Math.max(...Object.values(regionData));

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '0',
            position: 'relative'
        }}>
            {/* 줌 컨트롤 버튼 */}
            <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                backgroundColor: 'white',
                borderRadius: '6px',
                padding: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0'
            }}>
                <button
                    onClick={handleZoomIn}
                    style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    title="확대"
                >
                    <ZoomIn size={16} color="#334155" />
                </button>
                <button
                    onClick={handleZoomOut}
                    style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    title="축소"
                >
                    <ZoomOut size={16} color="#334155" />
                </button>
                <button
                    onClick={handleReset}
                    style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    title="초기화"
                >
                    <Maximize2 size={16} color="#334155" />
                </button>
            </div>



            {/* 지도 영역 */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    position: 'relative',
                    border: 'none',
                    borderRadius: '0',
                    backgroundColor: '#ffffff',
                    minHeight: '220px',
                    maxHeight: '280px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: isDragging ? 'grabbing' : (zoom !== 1 ? 'grab' : 'default')
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <svg
                    viewBox="50 0 600 500"
                    style={{
                        width: '100%',
                        height: '100%',
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                        transformOrigin: 'center center'
                    }}
                    preserveAspectRatio="xMidYMid meet"
                >
                    {geoData.features.map((feature, index) => {
                        const regionName = feature.properties.name;
                        const value = regionData[regionName] || 0;
                        const pathData = coordinatesToPath(
                            feature.geometry.coordinates,
                            feature.geometry.type
                        );

                        return (
                            <path
                                key={index}
                                d={pathData}
                                fill={getColor(value)}
                                stroke="#ffffff"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                                style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    filter: hoveredRegion === regionName ? 'brightness(1.15) drop-shadow(0 0 8px rgba(0,0,255,0.4))' : 'none'
                                }}
                                opacity={hoveredRegion && hoveredRegion !== regionName ? 0.5 : 1}
                                onMouseEnter={() => setHoveredRegion(regionName)}
                                onMouseLeave={() => setHoveredRegion(null)}
                            >
                                <title>{regionName}: {value}%</title>
                            </path>
                        );
                    })}
                </svg>

                {/* 호버 툴팁 */}
                {hoveredRegion && (
                    <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        color: 'white',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '700',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        pointerEvents: 'none',
                        zIndex: 10,
                        border: '2px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{ marginBottom: '2px', fontSize: '14px' }}>
                            {hoveredRegion}
                        </div>
                        <div style={{ fontSize: '18px', color: '#60a5fa' }}>
                            {regionData[hoveredRegion]}%
                        </div>
                    </div>
                )}
            </div>

            {/* 하단 범례 */}
            <div style={{
                marginTop: '0',
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: '0',
                border: 'none',
                borderTop: '1px solid #e2e8f0'
            }}>
                <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
                    범례
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#0000ff',
                            borderRadius: '3px',
                            border: '1px solid #cbd5e1'
                        }} />
                        <span style={{ fontSize: '11px', color: '#64748b' }}>최대 (100%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#6666ff',
                            borderRadius: '3px',
                            border: '1px solid #cbd5e1'
                        }} />
                        <span style={{ fontSize: '11px', color: '#64748b' }}>중간</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#ccccff',
                            borderRadius: '3px',
                            border: '1px solid #cbd5e1'
                        }} />
                        <span style={{ fontSize: '11px', color: '#64748b' }}>최소 (0%)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChoroplethMap;
