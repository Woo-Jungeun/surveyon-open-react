import { useEffect, useRef } from "react";

/**
 * mount되었을때 첫 render시에만 함수 실행
 * @author jisu
 * @since 2024.05.10
 */
const useOnlyFirstRenderEffect = (func, deps) => {
    const isFirst = useRef(true);

    log("isFIrst", isFirst)
    useEffect(() => {
        if (isFirst.current) {
            func()
            isFirst.current = false
        }
    }, deps);
};

export default useOnlyFirstRenderEffect;