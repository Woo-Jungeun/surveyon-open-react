import { useMemo, useRef, useEffect } from "react";

export default function useUpdateHistory(key, { max = 100, signature } = {}) {
    // 로그 저장 ref
    const stateRef = useRef({
        base: { rows: [], sig: "" },
        snaps: [],
        idx: 0,
    });

    // key가 바뀌면 히스토리 완전 초기화
    const prevKeyRef = useRef(key);
    useEffect(() => {
        if (prevKeyRef.current !== key) {
            stateRef.current = { base: { rows: [], sig: "" }, snaps: [], idx: 0 };
            prevKeyRef.current = key;
        }
    }, [key]);

    const getSig = (rows) =>
        signature ? signature(rows) : JSON.stringify(rows ?? []);

    const api = useMemo(() => {
        const apiObj = {
            commit(rows) {
                const st = stateRef.current;
                const newSig = getSig(rows);
                const curSig = st.idx === 0 ? st.base.sig : st.snaps[st.idx - 1]?.sig;
                if (newSig === curSig) return;
                if (st.idx < st.snaps.length) st.snaps.splice(st.idx);
                st.snaps.push({ rows, sig: newSig });
                if (st.snaps.length > max) {
                    const overflow = st.snaps.length - max;
                    const removed = st.snaps.splice(0, overflow);
                    const lastRemoved = removed[removed.length - 1];
                    if (lastRemoved) st.base = lastRemoved;
                }
                st.idx = st.snaps.length;
            },
            undo() {
                const st = stateRef.current;
                if (st.idx === 0) return null;
                st.idx -= 1;
                return st.idx === 0 ? st.base.rows : st.snaps[st.idx - 1].rows;
            },
            redo() {
                const st = stateRef.current;
                if (st.idx >= st.snaps.length) return null;
                st.idx += 1;
                return st.snaps[st.idx - 1].rows;
            },
            reset(rows) {
                const st = stateRef.current;
                st.base = { rows: rows ?? [], sig: getSig(rows) };
                st.snaps = [];
                st.idx = 0;
            },
            _dump() {
                const st = stateRef.current;
                return { baseSig: st.base.sig, idx: st.idx, snaps: st.snaps.map(s => s.sig) };
            },
        };
        Object.defineProperties(apiObj, {
            length: { get() { return stateRef.current.idx; } },
            hasChanges: { get() { return stateRef.current.idx > 0; } },
        });
        return apiObj;
    }, [key, max, signature]);

    return api;
}
