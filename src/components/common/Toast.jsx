import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const Toast = ({ show, message, onClose, duration = 3000 }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose && onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            top: '20px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'none'
        }}>
            <div style={{
                background: '#1e293b',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: '500',
                animation: 'fadeIn 0.2s ease-out',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                pointerEvents: 'auto'
            }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }}></div>
                {message}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default Toast;
