import { useEffect, useRef } from "react";

/**
 * mount되었을때 첫 render에 함수실행 막기. 첫 렌더 이후에 동작
 * @author jisu
 * @since 2024.05.10
 */
const useDidMountEffect = (func, deps) => {
    const didMount = useRef(false);

    useEffect(() => {
        if (didMount.current) func();
        else didMount.current = true;
    }, deps);
};

export default useDidMountEffect;