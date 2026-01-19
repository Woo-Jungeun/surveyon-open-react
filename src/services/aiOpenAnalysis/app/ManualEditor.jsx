import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { manualData } from './ManualData';
import '../../inquiry/Inquiry.css'; // Reuse Inquiry styles
import './ManualEditor.css'; // Custom styles for ManualEditor
import { Save, Eye, Code, Type, Info, AlertCircle, CheckCircle, HelpCircle, FileText } from 'lucide-react';

const ManualEditor = () => {
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    const [title, setTitle] = useState('새로운 매뉴얼');
    const [icon, setIcon] = useState('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>');
    const [content, setContent] = useState(`
        <h2>새로운 매뉴얼 제목</h2>
        <p>여기에 내용을 입력하세요.</p>
        <div class="note-blue">
            <h4>참고</h4>
            <p>이것은 파란색 노트 박스입니다.</p>
        </div>
    `);

    const textareaRef = useRef(null);

    const [selectedId, setSelectedId] = useState(editId || 'new');

    useEffect(() => {
        if (editId) {
            setSelectedId(editId);
        }
    }, [editId]);

    useEffect(() => {
        if (selectedId === 'new') {
            setTitle('새로운 매뉴얼');
            setIcon('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>');
            setContent(`
                <h2>새로운 매뉴얼 제목</h2>
                <p>여기에 내용을 입력하세요.</p>
                <div class="note-blue">
                    <h4>참고</h4>
                    <p>이것은 파란색 노트 박스입니다.</p>
                </div>
            `);
        } else {
            const targetItem = manualData.find(item => item.id === selectedId);
            if (targetItem) {
                setTitle(targetItem.title);
                setIcon(targetItem.icon);
                setContent(targetItem.content);
            }
        }
    }, [selectedId]);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        // Prevent window scrollbars when editor is open (Popup mode)
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            // Restore body styles on unmount
            document.body.style.overflow = '';
            document.body.style.margin = '';
        };
    }, []);

    const handleDropdownSelect = (id) => {
        const newId = id;
        setSelectedId(newId);
        // Update URL without reloading
        const newUrl = newId === 'new' ? '/manual/editor' : `/manual/editor?id=${newId}`;
        window.history.pushState({}, '', newUrl);
        setIsDropdownOpen(false);
    };

    const getSelectedTitle = () => {
        if (selectedId === 'new') return '+ 새 메뉴 작성';
        const item = manualData.find(i => i.id === selectedId);
        return item ? item.title : '메뉴 선택';
    };

    const handlePreview = () => {
        const previewData = {
            id: selectedId === 'new' ? 'preview_item' : selectedId,
            title: title,
            icon: icon,
            content: content
        };

        localStorage.setItem('manual_preview_data', JSON.stringify(previewData));
        window.open(`/manual?preview=true&id=${previewData.id}`, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    };

    const insertSnippet = (snippet) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        const newText = before + snippet + after;
        setContent(newText);

        // Restore cursor position after insertion
        setTimeout(() => {
            textarea.selectionStart = start + snippet.length;
            textarea.selectionEnd = start + snippet.length;
            textarea.focus();
        }, 0);
    };

    return (
        <div className="iw-container" style={{ minHeight: '100vh', background: '#f8fafc', overflow: 'hidden', padding: 0 }}>
            <div className="iw-content-wrapper" style={{ maxWidth: '100%', margin: '0 auto', padding: '20px', boxSizing: 'border-box', height: '100vh', overflowY: 'auto' }}>
                <div className="iw-header">
                    <h1 className="iw-page-title">
                        매뉴얼 에디터 <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>(매뉴얼 내용을 작성하고 미리보기로 확인하세요.)</span>
                    </h1>
                </div>

                <div className="iw-form">
                    {/* Top Section: Title & Icon Stacked */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="iw-form-group">
                            <label>메뉴명 (Title)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {/* Custom Dropdown */}
                                <div className="custom-dropdown-container" ref={dropdownRef}>
                                    <div
                                        className={`custom-dropdown-trigger ${isDropdownOpen ? 'open' : ''}`}
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >
                                        <span>{getSelectedTitle()}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </div>

                                    {isDropdownOpen && (
                                        <div className="custom-dropdown-menu">
                                            <div
                                                className={`custom-dropdown-item ${selectedId === 'new' ? 'selected' : ''}`}
                                                onClick={() => handleDropdownSelect('new')}
                                            >
                                                + 새 메뉴 작성
                                            </div>
                                            <div className="dropdown-divider"></div>
                                            {manualData.map(item => (
                                                <div
                                                    key={item.id}
                                                    className={`custom-dropdown-item ${selectedId === item.id ? 'selected' : ''}`}
                                                    onClick={() => handleDropdownSelect(item.id)}
                                                >
                                                    {item.title}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedId === 'new' && (
                                    <input
                                        type="text"
                                        className="iw-input"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="새 메뉴명을 입력하세요"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="iw-form-group">
                            <label>아이콘 (SVG Code)</label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <textarea
                                    className="iw-textarea"
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    style={{ height: '90px', minHeight: '48px', resize: 'none', fontFamily: 'monospace', fontSize: '12px' }}
                                    placeholder="SVG 코드를 입력하세요"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="iw-form-group">
                        <textarea
                            ref={textareaRef}
                            className="iw-textarea"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            style={{ height: '240px', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.6' }}
                            placeholder="HTML 내용을 입력하세요..."
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="iw-footer" style={{ marginTop: '0', paddingTop: '24px' }}>
                        <button
                            className="iw-btn"
                            onClick={handlePreview}
                            style={{ background: '#6b7fbf', color: 'white', border: '1px solid #6b7fbf' }}
                        >
                            <Eye size={18} />
                            미리보기 (새창)
                        </button>
                        <button
                            className="iw-btn"
                            onClick={() => alert('등록 기능은 추후 DB 연동 시 구현될 예정입니다.')}
                            style={{ background: '#10b981', color: 'white', border: '1px solid #10b981' }}
                        >
                            <Save size={18} />
                            등록하기
                        </button>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default ManualEditor;
