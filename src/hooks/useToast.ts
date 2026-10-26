"use client";

import { useCallback, useState } from "react";

export function useToast() {
  const [notice, setNotice] = useState("");

  const toast = useCallback((message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2600);
  }, []);

  return { notice, toast };
}
