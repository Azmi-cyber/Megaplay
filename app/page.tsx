"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const Player = dynamic(() => import("@/components/Player"), { ssr: false });
const DEFAULT_URL = "https://megaplay.buzz/stream/mal/235/1/sub";

const copy = (t: string) => navigator.clipboard?.writeText(t);
const kbps = (b: number | null) => (b ? `${Math.round(b / 1000)} kbps` : "—");

export default function Home() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [referer, setReferer] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const note = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1500); };
  const doCopy = (t: string, m = "Tersalin") => { copy(t); note(m); };

  async function run() {
    setLoading(true); setError(""); setData(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, referer }) });
      const j = await res.json();
      if (!res.ok && !j.status) throw new Error(j.error || `HTTP ${res.status}`);
      setData(j);
    } catch (e: any) { setError(e.message || "Gagal menghubungi API."); }
    finally { setLoading(false); }
  }

  const json = data ? JSON.stringify(data, null, 2) : "";
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    a.download = "stream-analysis.json"; a.click(); URL.revokeObjectURL(a.href);
  };
  const v = data?.video;
  const canPreview = v?.url && ["hls", "mp4"].includes(v.type);

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Stream URL Extractor</h1>
          <p className="muted">Analisis halaman streaming dan temukan sumber video, subtitle, dan kualitas yang benar-benar tersedia.</p>
        </div>
        <span className="by">by Azmi Ganteng</span>
      </header>

      <section className="card">
        <label className="lbl" htmlFor="u">URL halaman streaming</label>
        <div className="row">
          <input id="u" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !loading && run()} placeholder="https://..." spellCheck={false} />
          <button className="btn" onClick={run} disabled={loading || !url}>{loading ? "Menganalisis…" : "Analyze"}</button>
        </div>
        <details>
          <summary>Opsi lanjutan</summary>
          <label className="lbl" htmlFor="r">Referer (opsional)</label>
          <input id="r" value={referer} onChange={(e) => setReferer(e.target.value)} placeholder="https://domain-anda.com/" spellCheck={false} />
          <p className="muted small">Hanya isi dengan domain Anda sendiri yang memang terdaftar/berwenang meng-embed halaman ini. Tool tidak melewati token, DRM, atau autentikasi.</p>
        </details>
      </section>

      {loading && <section className="card loading"><div className="bars"><i /><i /><i /><i /><i /></div><p>Mengambil halaman, membaca playlist, memeriksa subtitle…</p></section>}
      {error && <section className="card bad"><b>Error:</b> {error}</section>}

      {data && (
        <>
          <section className="card">
            <div className="head"><h2>Status</h2><span className={`pill ${data.status}`}>{data.status}</span></div>
            <dl className="kv">
              <dt>Sumber</dt><dd>{data.source}</dd>
              <dt>Halaman</dt><dd className="mono">{data.page_url}</dd>
              {data.page_fetch && <><dt>HTTP</dt><dd>{data.page_fetch.status} · Referer terkirim: {data.page_fetch.referer_sent || "tidak"}</dd></>}
              <dt>Waktu</dt><dd>{data.elapsed_ms} ms</dd>
            </dl>
            {data.error && <p className="err">{data.error}</p>}
            {data.limitations?.map((l: string, i: number) => <p key={i} className="warn">{l}</p>)}
            {data.diagnostics?.length > 0 && <details><summary>Diagnostik ({data.diagnostics.length})</summary><ul className="small mono">{data.diagnostics.map((d: string, i: number) => <li key={i}>{d}</li>)}</ul></details>}
          </section>

          <div className="grid">
            <section className="card">
              <div className="head"><h2>Sumber video</h2>{v?.url && <button className="ghost" onClick={() => doCopy(v.url, "URL tersalin")}>Copy URL</button>}</div>
              {data.sources.length === 0 ? <p className="muted">Tidak ada URL media yang ditemukan.</p> : data.sources.map((s: any) => (
                <div key={s.url} className="item">
                  <div className="tags"><span className="tag">{s.format}</span><span className="tag">{s.type}</span>{s.kind && <span className="tag">{s.kind}</span>}
                    <span className={`tag ${s.accessible ? "ok" : s.accessible === false ? "no" : ""}`}>{s.accessible === null ? "belum dicek" : s.accessible ? `dapat diakses (${s.http_status})` : `tidak dapat diakses${s.http_status ? ` (${s.http_status})` : ""}`}</span>
                    {s.protected && <span className="tag no">terproteksi</span>}</div>
                  <p className="mono break">{s.url}</p>
                  <button className="ghost" onClick={() => doCopy(s.url, "URL tersalin")}>Copy URL</button>
                </div>
              ))}
            </section>

            <section className="card">
              <h2>Kualitas</h2>
              {!v?.qualities?.length ? <p className="muted">{v?.url ? "Tidak ada informasi variant (media playlist tunggal atau file langsung)." : "Belum ada sumber."}</p> : (
                <table><thead><tr><th>Label</th><th>Resolusi</th><th>Bitrate</th><th>Codec</th></tr></thead>
                  <tbody>{v.qualities.map((q: any, i: number) => <tr key={i}><td>{q.label}</td><td>{q.width && q.height ? `${q.width}×${q.height}` : "—"}</td><td>{kbps(q.bandwidth)}</td><td className="mono small">{q.codecs || "—"}</td></tr>)}</tbody></table>
              )}
              {v?.qualities?.length > 1 && v.type === "hls" && <p className="muted small">“Auto” tersedia di player karena HLS adaptif memiliki lebih dari satu variant.</p>}
            </section>

            <section className="card">
              <h2>Subtitle</h2>
              {data.subtitles.length === 0 ? <p className="muted">Tidak ada subtitle yang terdeteksi.</p> : data.subtitles.map((s: any) => (
                <div key={s.url} className="item">
                  <div className="tags"><span className="tag">{s.label || s.language || "tanpa label"}</span>{s.language && <span className="tag">{s.language}</span>}<span className="tag">{s.format}</span>
                    <span className={`tag ${s.accessible ? "ok" : "no"}`}>{s.accessible ? "dapat diakses" : `tidak dapat diakses${s.http_status ? ` (${s.http_status})` : ""}`}</span></div>
                  <p className="mono break">{s.url}</p>
                  <button className="ghost" onClick={() => doCopy(s.url, "URL tersalin")}>Copy URL</button>
                </div>
              ))}
            </section>

            <section className="card">
              <h2>Preview</h2>
              {canPreview ? <Player url={v.url} type={v.type} subs={data.subtitles.filter((s: any) => s.accessible)} /> : <p className="muted">Preview hanya tersedia untuk sumber HLS/MP4 yang ditemukan.</p>}
            </section>
          </div>

          <section className="card">
            <div className="head"><h2>JSON response</h2><div className="row">
              <button className="ghost" onClick={() => doCopy(json, "JSON tersalin")}>Copy JSON</button>
              <button className="ghost" onClick={download}>Download JSON</button></div></div>
            <pre className="json">{json}</pre>
            <p className="muted small">Endpoint: <span className="mono">GET /api/analyze?url=…&amp;referer=…</span> atau <span className="mono">POST /api/analyze</span> {"{ url, referer }"}</p>
          </section>
        </>
      )}
      <footer className="muted small">Creator: Azmi Ganteng · Gunakan hanya untuk konten yang Anda berhak akses.</footer>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
