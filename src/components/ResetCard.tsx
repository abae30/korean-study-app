import { useState } from 'react'
import { buildBackup, downloadJson, resetProgress } from '../lib/backup'
import { studyDay } from '../lib/day'
import { useApp } from '../store/app'
import { Button, Card, Row } from './Card'

export function ResetCard() {
  const reloadAll = useApp((s) => s.reloadAll)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function doReset(backupFirst: boolean) {
    if (backupFirst) downloadJson(`korean-progress-before-reset-${studyDay()}.json`, await buildBackup())
    await resetProgress()
    await reloadAll()
    setOpen(false)
    setMsg('All progress was reset.')
  }

  return (
    <Card title="Reset">
      <Row>
        <p className="mb-2 text-sm text-muted">
          Start over: deletes every card's schedule, typing history, mistakes, stats, streak and stars. Your settings and lesson selection are kept.
        </p>
        {!open ? (
          <Button onClick={() => setOpen(true)} className="!py-1.5 text-sm !text-bad">
            Reset all progress…
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-bold text-bad">This cannot be undone. Download a backup first?</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void doReset(true)} className="!py-1.5 text-sm">
                Download backup, then reset
              </Button>
              <Button onClick={() => void doReset(false)} className="!py-1.5 text-sm !text-bad">
                Reset without backup
              </Button>
              <Button onClick={() => setOpen(false)} className="!py-1.5 text-sm">
                Cancel
              </Button>
            </div>
          </div>
        )}
        {msg && <p className="mt-2 text-sm font-bold text-good">{msg}</p>}
      </Row>
    </Card>
  )
}
