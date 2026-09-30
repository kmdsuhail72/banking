'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { MICROSERVICES, type ServiceItem } from '@/lib/service-catalog';
import type { HealthSnapshot } from '@/lib/service-health';

const categories = [
  ['all', 'All'], ['core', 'Core Banking'],
  ['payments', 'Payments & Ledger'], ['risk', 'Risk & Comms'],
] as const;

function uptime(seconds: number | null | undefined) {
  if (seconds == null) return 'Unavailable';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${Math.floor(seconds % 60)}s`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ${minutes % 60}m` : `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function ServiceHealthCatalog() {
  const [category, setCategory] = useState<'all' | ServiceItem['category']>('all');
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    setBusy(true);
    try {
      const response = await fetch('/api/service-health', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Health check failed');
      const next: HealthSnapshot = await response.json();
      if (!Array.isArray(next.services) || !Number.isFinite(Date.parse(next.checkedAt))) throw new Error('Invalid health snapshot');
      if (request.current !== controller) return;
      setSnapshot(next);
      setError(false);
      setNow(Date.now());
      setHistory(previous => {
        const updated = { ...previous };
        for (const service of next.services) {
          updated[service.id] = service.latencyMs === null ? [] : [...(previous[service.id] || []), service.latencyMs].slice(-20);
        }
        return updated;
      });
    } catch {
      if (request.current === controller) setError(true);
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => { if (!document.hidden) void refresh(); }, 10000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener('visibilitychange', visible);
      const active = request.current;
      request.current = null;
      active?.abort();
    };
  }, [refresh]);

  const stale = error || (snapshot !== null && now - Date.parse(snapshot.checkedAt) > 25000);
  const healthy = snapshot?.services.filter(s => s.status === 'healthy').length ?? 0;

  return (
    <section id="services" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1F2937]">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-code text-emerald-400 uppercase tracking-wider mb-2"><Activity className="w-3.5 h-3.5" />Live Engine Telemetry</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Real-Time Service Health &amp; Port Catalog</h2>
          <p className="text-sm text-[#9CA3AF] mt-2">Live HTTP health checks every 10 seconds. Response times are measured from the web server.</p>
        </div>
        <button onClick={() => void refresh()} disabled={busy} className="inline-flex items-center justify-center gap-2 shrink-0 rounded-xl border border-violet-500/40 px-4 py-2 text-sm text-violet-300 hover:bg-violet-500/10 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />{busy ? 'Checking…' : 'Refresh now'}
        </button>
      </div>
      <div role="status" className={`text-xs mb-4 ${stale ? 'text-amber-300' : 'text-slate-400'}`}>
        {stale ? 'Live checks unavailable or stale. Retrying automatically; refresh to try again.' : snapshot ? `${healthy} / ${MICROSERVICES.length} services healthy` : 'Checking service health…'}
        {snapshot && <span className="ml-2">Last checked {new Date(snapshot.checkedAt).toLocaleTimeString()}.</span>}
      </div>
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[#111827] border border-[#1F2937] mb-6 w-fit" aria-label="Service categories">
        {categories.map(([key, label]) => <button key={key} aria-pressed={category === key} onClick={() => setCategory(key)} className={`px-3 py-2 rounded-lg text-xs font-medium transition ${category === key ? 'bg-[#7C3AED] text-white' : 'text-slate-400 hover:text-white'}`}>
          {label} ({MICROSERVICES.filter(s => key === 'all' || s.category === key).length})
        </button>)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MICROSERVICES.filter(s => category === 'all' || s.category === category).map(service => {
          const check = snapshot?.services.find(s => s.id === service.id);
          const status = stale ? 'Unknown' : check ? { healthy: 'Healthy', degraded: 'Degraded', offline: 'Offline' }[check.status] : 'Checking';
          const color = status === 'Healthy' ? 'text-emerald-400' : status === 'Offline' ? 'text-rose-400' : 'text-amber-300';
          const points = history[service.id] || [];
          const max = Math.max(1, ...points);
          return <article key={service.id} className="p-5 rounded-2xl bg-[#0B0F17]/90 border border-[#1F2937] hover:border-violet-500/50 transition flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-bold text-white">{service.name}</h3>
                <span className={`text-[10px] font-code px-2 py-0.5 rounded-full border border-current ${color}`}>{status}</span>
              </div>
              <p className="text-xs text-[#9CA3AF] mb-3 leading-relaxed">{service.description}</p>
              <p className={`text-xs mb-4 ${color}`}>{stale ? 'Waiting for a fresh health check' : check?.detail || 'Contacting health endpoint…'}</p>
            </div>
            <div className="pt-3 border-t border-[#1F2937] space-y-3">
              <div className="flex justify-between gap-2 text-xs text-slate-400"><span>HTTP response</span><span className={color}>{!stale && check?.latencyMs != null ? `${check.latencyMs.toFixed(1)} ms` : '—'}</span></div>
              <div className="flex justify-between gap-2 text-xs text-slate-400"><span>Process uptime</span><span>{stale ? '—' : uptime(check?.uptimeSeconds)}</span></div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Recent response times</span>
                {points.length > 1 && !stale ? <svg role="img" aria-label={`Last ${points.length} response times`} className="w-24 h-6 text-emerald-400" viewBox="0 0 100 24" fill="none"><polyline stroke="currentColor" strokeWidth="2" points={points.map((value, index) => `${index * 100 / (points.length - 1)},${22 - value / max * 20}`).join(' ')} /></svg> : <span>Collecting samples</span>}
              </div>
              <div className="flex flex-wrap justify-between gap-2 font-code text-[11px] text-slate-300 bg-[#080B10] px-3 py-2 rounded-lg border border-[#1F2937]/70">
                <span>HTTP <strong className="text-violet-400">:{service.httpPort}</strong></span>
                <span title="Configured port only; gRPC availability is not checked">gRPC :{service.grpcPort} <span className="text-slate-500">configured</span></span>
              </div>
            </div>
          </article>;
        })}
      </div>
      <p className="text-xs text-slate-500 mt-4">Health reflects each service’s /health response, not an end-to-end transaction check. gRPC ports are configuration references and are not probed.</p>
    </section>
  );
}
