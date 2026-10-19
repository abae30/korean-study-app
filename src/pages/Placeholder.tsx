import { Link } from 'react-router-dom'

export default function Placeholder({ title, step }: { title: string; step: string }) {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-20 text-center">
      <h1 className="text-3xl font-black tracking-tight">{title}</h1>
      <p className="mt-3 text-muted">This mode is built in step {step} of the build plan.</p>
      <Link to="/" className="mt-6 inline-block rounded-lg border border-line bg-card2 px-4 py-2 font-extrabold hover:border-muted">
        ← Back home
      </Link>
    </div>
  )
}
