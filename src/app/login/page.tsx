import { AsciiField } from "@/components/ascii/AsciiField";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="flex h-12 items-center justify-between border-b border-[var(--border)] px-6">
        <span className="serif text-[20px]">faketools</span>
        <span className="meta">current build: v0.1.0</span>
      </div>
      <div className="grid min-h-[calc(100vh-3rem)] grid-cols-1 md:grid-cols-2">
        <div className="relative overflow-hidden border-r border-[var(--border)]">
          <AsciiField className="absolute inset-0 h-full w-full" />
          <div className="absolute bottom-4 left-4 right-4 flex justify-between">
            <span className="meta">live_waveform_render / dither_mode_on</span>
            <span className="meta">signal: nominal</span>
          </div>
        </div>
        <div className="flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-sm">
            <div className="meta mb-6">new session</div>
            <h1 className="serif mb-8 text-[56px] leading-[1.05] tracking-tight">
              Mock
              <br />
              Endpoints
            </h1>
            <p className="mb-10 text-[14px] text-[var(--muted-foreground)]">
              Build throwaway HTTP endpoints for voice-agent testing. Define an input shape, an output template, and latency — hit the URL from anywhere.
            </p>
            <LoginForm next={next} error={error} />
          </div>
        </div>
      </div>
    </main>
  );
}
