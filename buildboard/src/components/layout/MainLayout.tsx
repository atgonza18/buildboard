import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface MainLayoutProps {
  children: ReactNode;
  projectId?: string;
  onProjectChange?: (projectId: string) => void;
}

export function MainLayout({
  children,
  projectId,
  onProjectChange,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar projectId={projectId} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header projectId={projectId} onProjectChange={onProjectChange} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
