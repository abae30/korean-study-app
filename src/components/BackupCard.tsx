import { useRef, useState } from 'react'
import { buildBackup, downloadJson, restoreBackup, validateBackup } from '../lib/backup'
import { studyDay } from '../lib/day'
import { useApp } from '../store/app'
import { Button, Card, Row } from './Card'
import { Icon } from './Icon'

function ago(t: number | null) {
  if (!t) return 'never'
  const days = Math.floor((Date.now() - t) / 86400000)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

export function BackupCard() {
  const lastBackup = useApp((s) => s.lastBackup)
  const setLastBackup = useApp((s) => s.setLastBackup)
  const reloadAll = useApp((s) => s.reloadAll)
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const stale = !lastBackup || Date.now() - lastBackup > 7 * 86400000

  async function doExport() {
    const b = await buildBackup()
    downloadJson(`korean-progress-${studyDay()}.json`, b)
    setLastBackup(Date.now())
    setMsg({ ok: true, text: 'Backup downloaded.' })
  }

  async function doImport(file: File) {
    try {
      const b = validateBackup(JSON.parse(await file.text()))
      const ok = window.confirm(
        `Replace ALL current progress with this backup (exported ${b.exportedAt.slice(0, 10)}, ${b.srs.length} cards)? This cannot be undone.`,
      )
      if (!ok) return
      await restoreBackup(b)
      await reloadAll()
      setMsg({ ok: true, text: 'Progress restored.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Import failed.' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Card title="Backup">
      <Row label="Last backup" value={<span className={stale ? 'text-warn' : ''}>{ago(lastBackup)}</span>} />
      <Row>
        <p className="mb-2 text-sm text-muted">
          Progress lives in this browser only. Export a file now and then so clearing site data can't wipe it.
        </p>
        <div className="flex gap-2">
          <Button onClick={doExport} className="flex-1 !py-1.5 text-sm">
            <Icon name="download" size={16} /> Export
          </Button>
          <Button onClick={() => fileRef.current?.click()} className="flex-1 !py-1.5 text-sm">
            <Icon name="upload" size={16} /> Import
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        </div>
        {msg && <p className={`mt-2 text-sm font-bold ${msg.ok ? 'text-good' : 'text-bad'}`}>{msg.text}</p>}
      </Row>
    </Card>
  )
}
