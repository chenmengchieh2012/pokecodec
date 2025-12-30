import React, { useEffect, useRef, useState } from "react";

function useSyncedState<T>(initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, React.RefObject<T>] {
    const [state, setState] = useState<T>(initialValue);
    const stateRef = useRef<T>(initialValue);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);
    return [state, setState, stateRef] as const;
}

export default useSyncedState;