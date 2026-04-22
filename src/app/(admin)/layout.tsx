import { TopBar } from "@/components/topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="px-6 py-10">{children}</div>
    </div>
  );
}
