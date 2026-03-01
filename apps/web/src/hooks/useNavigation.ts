"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { hashFolderPath } from "@/utils/folderHash";

interface UseNavigationOptions {
  setFromContent: (filename: string, content: string) => void;
}

export function useNavigation({ setFromContent }: UseNavigationOptions) {
  const router = useRouter();

  const handleSelectFile = useCallback(
    (filename: string, content: string) => {
      setFromContent(filename, content);
      router.push(`/workflow/${encodeURIComponent(filename)}`);
    },
    [router, setFromContent],
  );

  const handleSelectFolder = useCallback(
    (folderPath: string | null) => {
      if (!folderPath) {
        router.push("/");
      } else {
        router.push(`/folder/${hashFolderPath(folderPath)}`);
      }
    },
    [router],
  );

  return { handleSelectFile, handleSelectFolder };
}
