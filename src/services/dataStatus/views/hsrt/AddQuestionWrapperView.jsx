import React, { useRef, useImperativeHandle, forwardRef } from "react";
import AddQuestionPage from "@/services/dataStatus/app/hsrt/addQuestion/AddQuestionPage";

const AddQuestionWrapperView = forwardRef(({ onUnsavedChange }, ref) => {
    const pageRef = useRef();

    useImperativeHandle(ref, () => ({
        save: async () => {
            if (pageRef.current?.save) {
                return await pageRef.current.save();
            }
        }
    }));

    return (
        <div className="hsrt-page" data-theme="data-dashboard" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            <AddQuestionPage ref={pageRef} onUnsavedChange={onUnsavedChange} />
        </div>
    );
});

export default AddQuestionWrapperView;
