import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { addDays, addYears, format } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { buildCalendarWeeks, fromKey, monthLabelsFor, toKey } from '../lib/dates'
import { dayCounts, formatDay, type Journal } from '../lib/tracking'

const arrows: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }

export function TrackerCalendar({ journal, today, onSelect, consistency = false }: {
  journal: Journal
  today: Date
  onSelect: (key: string) => void
  consistency?: boolean
}) {
  const [offset, setOffset] = useState(0)
  const [focus, setFocus] = useState('')
  const [period, setPeriod] = useState<90 | 365>(90)
  const [hover, setHover] = useState<{ key: string; x: number; y: number } | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const todayKey = toKey(today)
  const startKey = consistency ? toKey(addDays(today, 1 - period)) : ''
  const weekCount = consistency && period === 90 ? 14 : 53

  const { weeks, months, days } = useMemo(() => {
    const weeks = buildCalendarWeeks(weekCount, addYears(today, offset))
    return {
      weeks,
      months: monthLabelsFor(weeks),
      days: new Map(weeks.flat().map((date) => [toKey(date), dayCounts(journal, date, today)])),
    }
  }, [journal, offset, today, weekCount])

  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [offset, period])

  const start = weeks[0][0]
  const end = weeks[weeks.length - 1][6]
  const range = `${format(start, 'MMM yyyy')} – ${format(end, 'MMM yyyy')}`
  const tabbable = days.has(focus) && focus <= todayKey ? focus : (offset === 0 ? todayKey : toKey(end))
  const info = hover ? days.get(hover.key) : undefined

  function shift(direction: number) {
    setHover(null)
    setFocus('')
    setOffset((previous) => previous + direction)
  }

  function changePeriod(next: 90 | 365) {
    setHover(null)
    setFocus('')
    setPeriod(next)
  }

  function move(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    const distance = arrows[event.key]
    if (!distance) return
    event.preventDefault()
    const target = toKey(addDays(date, distance))
    scroller.current?.querySelector<HTMLButtonElement>(`button[data-date="${target}"]:enabled`)?.focus()
  }

  function show(key: string, button: HTMLButtonElement) {
    const bounds = button.getBoundingClientRect()
    setHover({
      key,
      x: Math.max(8, Math.min(bounds.left, window.innerWidth - 218)),
      y: bounds.bottom + 100 > window.innerHeight ? Math.max(8, bounds.top - 83) : bounds.bottom + 8,
    })
  }

  return (
    <>
      {!consistency && <div className="page-heading"><h1>Calendar</h1></div>}
      <section className="panel calendar-panel">
        <div className="calendar-header">
          <div className="panel-heading"><span className="section-icon"><CalendarDays size={19} /></span><div>
            <h2>{consistency ? 'Consistency heatmap' : 'Activity calendar'}</h2>
            <p>{consistency ? `${format(fromKey(startKey), 'MMM d, yyyy')} – ${format(today, 'MMM d, yyyy')}` : range}</p>
          </div></div>
          {consistency ? <div className="chips">
            <button className="pill" type="button" aria-pressed={period === 90} onClick={() => changePeriod(90)}>90 days</button>
            <button className="pill" type="button" aria-pressed={period === 365} onClick={() => changePeriod(365)}>Annual</button>
          </div> : <div className="calendar-nav">
            <button className="icon-button" type="button" aria-label="Previous year" onClick={() => shift(-1)}><ChevronLeft size={19} /></button>
            <button className="icon-button" type="button" aria-label="Next year" disabled={offset === 0} onClick={() => shift(1)}><ChevronRight size={19} /></button>
          </div>}
        </div>
        <div className="heat-scroll" ref={scroller} onScroll={() => setHover(null)}>
          <div className={weekCount === 14 ? 'heat-grid heat-grid-short' : 'heat-grid'} role="group"
            aria-label={consistency ? `Consistency for the last ${period} days` : 'Daily activity. Use arrow keys to move between dates.'}>
            {months.map((month, index) => month && <span className="month-label" key={index} style={{ gridColumn: index + 2, gridRow: 1 }}>{month}</span>)}
            {['M', 'W', 'F'].map((label, index) => <span className="heat-weekday" key={label} style={{ gridRow: 2 + 2 * index }}>{label}</span>)}
            {weeks.map((week, weekIndex) => week.map((date, dayIndex) => {
              const key = toKey(date)
              if (consistency && (key < startKey || key > todayKey)) return null
              const counts = days.get(key)!
              const ratio = counts.done / (counts.done + counts.unfinished)
              const level = counts.done ? Math.ceil(4 * ratio) : 0
              return <button key={key} className={`heat-cell heat-${level}`} type="button" data-date={key}
                disabled={key > todayKey} tabIndex={tabbable === key ? 0 : -1}
                style={{ gridColumn: weekIndex + 2, gridRow: dayIndex + 2 }}
                aria-current={key === todayKey ? 'date' : undefined}
                aria-label={`${formatDay(date)}, ${counts.done} completed, ${counts.unfinished} unfinished${counts.frozen ? `, ${counts.frozen} frozen` : ''}`}
                onMouseEnter={(event) => show(key, event.currentTarget)}
                onMouseLeave={() => setHover(null)}
                onFocus={(event) => { setFocus(key); show(key, event.currentTarget) }}
                onBlur={() => setHover(null)}
                onKeyDown={(event) => { if (event.key === 'Escape') setHover(null); else move(event, date) }}
                onClick={() => { setHover(null); onSelect(key) }} />
            }))}
          </div>
        </div>
        <div className="heat-legend"><span>Less complete</span>{[0, 1, 2, 3, 4].map((level) => <i className={`heat-cell heat-${level}`} key={level} aria-hidden="true" />)}<span>More complete</span></div>
        {hover && info && <div className="heat-tooltip" role="tooltip" style={{ left: hover.x, top: hover.y }}>
          <strong>{format(fromKey(hover.key), 'EEE, MMM d, yyyy')}</strong>
          <span>{info.done} completed · {info.unfinished} unfinished</span>
          {!!info.frozen && <span>{info.frozen} frozen</span>}
        </div>}
      </section>
    </>
  )
}
