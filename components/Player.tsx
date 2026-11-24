"use client";
import { useEffect, useRef, useState } from "react";

type Sub = { url: string; label: string | null; language: string | null; format: string };

export default function Player({ url, type, subs }: { url: string; type: string; subs: Sub[] }) {
  const ref = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [levels, setLevels] = useState<{ i: number; label: string }[]>([]);
  const [sel, setSel] = useState(-1);
  const [err, setErr] = useState("");
  const vtt = subs.filter((s) => s.format === "vtt");

  useEffect(() => {
    const v = ref.current!;
    let hls: any;
    setErr(""); setLevels([]); setSel(-1);
    (async () => {
      if (type === "hls") {
        const Hls = (await import("hls.js")).default;
        if (Hls.isSupported()) {
          hls = new Hls(); hlsRef.current = hls;
          hls.loadSource(url); hls.attachMedia(v);
          hls.on(Hls.Events.MANIFEST_PARSED, (_: any, d: any) =>
            setLevels(d.levels.map((l: any, i: number) => ({ i, label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}kbps` }))));
          hls.on(Hls.Events.ERROR, (_: any, d: any) => {
            if (d.fatal) setErr(`Playback gagal (${d.details}). Umumnya karena CORS atau Referer pada server sumber — di luar kendali tool ini.`);
          });
        } else if (v.canPlayType("application/vnd.apple.mpegurl")) v.src = url;
        else setErr("Browser ini tidak mendukung HLS.");
      } else if (type === "mp4") v.src = url;
      else setErr(`Preview untuk format "${type}" tidak didukung.`);
    })();
    return () => { hls?.destroy(); hlsRef.current = null; };
  }, [url, type]);

  const pick = (i: number) => { setSel(i); if (hlsRef.current) hlsRef.current.currentLevel = i; };

  return (
    <div>
      <video ref={ref} controls playsInline className="video" crossOrigin={vtt.length ? "anonymous" : undefined}
        onError={() => type === "mp4" && setErr("Video gagal dimuat (CORS/Referer/hotlink protection pada sumber).")}>
        {vtt.map((s, i) => <track key={s.url} kind="subtitles" src={s.url} label={s.label || s.language || `Sub ${i + 1}`} srcLang={s.language || undefined} default={i === 0} />)}
      </video>
      {err && <p className="err">{err}</p>}
      {levels.length > 0 && (
        <div className="chips">
          <button className={sel === -1 ? "chip on" : "chip"} onClick={() => pick(-1)}>Auto</button>
          {levels.map((l) => <button key={l.i} className={sel === l.i ? "chip on" : "chip"} onClick={() => pick(l.i)}>{l.label}</button>)}
        </div>
      )}
    </div>
  );
}
