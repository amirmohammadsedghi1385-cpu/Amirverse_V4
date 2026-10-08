"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="boot-screen"><div className="boot-orb">A</div><div>یک خطای غیرمنتظره رخ داد.</div><button className="primary-btn" onClick={() => reset()}>تلاش دوباره</button></main>;
}
