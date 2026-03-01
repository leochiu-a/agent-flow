"use client";

import { use } from "react";
import { FolderRunner } from "@/components/FolderRunner";

export default function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return <FolderRunner initialFolderId={id} />;
}
