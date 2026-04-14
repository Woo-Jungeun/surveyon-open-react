import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { Save, Plus, Search, Trash2 } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";

const DpRequestTableStep = () => {
    const auth = useSelector((store) => store.auth);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const { getBannerDetail } = DpRequestPageApi();

    // --- 저장 로직 ---
    const handleSave = async () => {
        const pageId = sessionStorage.getItem('pageId');
        loadingSpinner.show();
        try {
            const payload = {
                user: auth.user?.userId,
                pageid: pageId,
                stubs: stubs,
            };
            // const result = await saveTableSettings.mutateAsync(payload);
            console.log("Saving stubs with payload:", payload);
            alert("스터브 설정이 저장되었습니다.");
        } catch (err) {
            console.error(err);
        } finally {
            loadingSpinner.hide();
        }
    };

    const [stubs, setStubs] = useState([
        { id: 'q1', name: 'Q1. 귀하의 성별은 무엇입니까?', type: 'Single', base: '전체', show: true },
        { id: 'q2', name: 'Q2. 귀하의 연령은 어떻게 되십니까?', type: 'Single', base: '전체', show: true },
        { id: 'q3', name: 'Q3. 귀하의 거주 지역은 어디입니까?', type: 'Single', base: '전체', show: true },
    ]);

    // 데이터 로드 (컴포넌트 마운트 시)
    useEffect(() => {
        // 실제 프로젝트에서는 여기서 문항 리스트를 가져오는 API를 호출합니다.
    }, []);

    const handleDataChange = (newData) => {
        setStubs(newData);
    };

    return (
        <div className="dp-step-container">
            <div className="dp-step-toolbar">
                <div className="dp-toolbar-title">
                    <span className="dp-badge">Step 3</span>
                    <h4>스터브(Stub) 문항 설정</h4>
                    <span className="dp-toolbar-desc">분석표 가로줄에 위치할 문항들의 순서와 옵션을 설정합니다.</span>
                </div>
                <div className="dp-toolbar-actions">
                    <button className="dp-btn-outline">
                        <Plus size={16} />
                        <span>문항 추가</span>
                    </button>
                    <button className="dp-primary-btn" onClick={handleSave}>
                        <Save size={16} />
                        <span>저장</span>
                    </button>
                </div>
            </div>

            <div className="dp-grid-wrapper" style={{ flex: 1 }}>
                <KendoGridV2 
                    data={stubs}
                    reorderable
                    addable
                    deletable
                    showNo
                    onDataChange={handleDataChange}
                >
                    <Column field="id" title="문항 ID" width="120px" editable={false} />
                    <Column field="name" title="문항명 (Label)" width="450px" />
                    <Column field="type" title="유형" width="120px" editable={false} />
                    <Column field="base" title="Base 설정" width="150px" />
                    <Column 
                        field="show" 
                        title="표시" 
                        width="80px" 
                        cell={(props) => (
                            <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" checked={props.dataItem.show} readOnly />
                            </td>
                        )} 
                    />
                </KendoGridV2>
            </div>
        </div>
    );
};

export default DpRequestTableStep;
