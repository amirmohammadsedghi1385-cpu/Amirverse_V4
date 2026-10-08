import Link from "next/link";

export default function NotFound() {
  return <main className="boot-screen"><div className="boot-orb">A</div><div>این مسیر در Amirverse وجود ندارد.</div><Link href="/" className="primary-btn">بازگشت به دنیا</Link></main>;
}
