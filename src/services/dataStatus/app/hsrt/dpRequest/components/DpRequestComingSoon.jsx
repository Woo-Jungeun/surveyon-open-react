import React from 'react';
import { Construction } from 'lucide-react';

const DpRequestComingSoon = ({ title }) => {
    return (
        <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '60px',
            background: '#fff',
            borderRadius: '12px',
            margin: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
            <div style={{ 
                width: '80px', 
                height: '80px', 
                background: '#eff6ff', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '24px'
            }}>
                <Construction size={40} color="#3b82f6" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                {title} 준비 중
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', textAlign: 'center', maxWidth: '400px', lineHeight: 1.6 }}>
                보다 정확하고 직관적인 분석 결과를 제공하기 위해<br />
                <strong>{title}</strong> 기능을 열심히 개발하고 있습니다. 조금만 기다려 주세요!
            </p>
            <div style={{ marginTop: '32px', display: 'flex', gap: '8px' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: '#3b82f6', 
                        opacity: 1 - (i * 0.2),
                        animation: `bounce 1.4s infinite ease-in-out both ${i * 0.1}s`
                    }} />
                ))}
            </div>
            <style>
                {`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1.0); }
                }
                `}
            </style>
        </div>
    );
};

export default DpRequestComingSoon;
