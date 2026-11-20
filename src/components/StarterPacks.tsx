import { Plus } from 'lucide-react'
import { starterPacks } from '../lib/starterPacks'
import { scheduleLabel, type HabitInput } from '../lib/tracking'
import { JournalDialog } from './JournalDialog'

export function StarterPacks({ onAdd, onClose }: { onAdd: (habits: HabitInput[]) => void; onClose: () => void }) {
  return <JournalDialog title="Quick-Start Templates" subtitle="Choose a pack to add its habits to your journal." onClose={onClose} drawer>
    <div className="template-list">
      {starterPacks.map((pack) => <section key={pack.name} className="template-pack">
        <h3>{pack.name}</h3>
        <ul>{pack.habits.map((habit) => <li key={habit.name}>
          <strong>{habit.name}</strong>
          <small>{scheduleLabel(habit)}{habit.kind === 'numeric' && ` · ${habit.goal} ${habit.unit}`}</small>
        </li>)}</ul>
        <button type="button" className="secondary" onClick={() => { onAdd(pack.habits); onClose() }}><Plus size={16} /> Add {pack.name}</button>
      </section>)}
    </div>
  </JournalDialog>
}
