import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowRight, Search, type LucideIcon } from 'lucide-react'
import { JournalDialog } from './JournalDialog'

export interface WorkspaceCommand {
  id: string
  label: string
  detail: string
  icon: LucideIcon
  run: () => void
}

export function CommandMenu({ commands, onClose }: { commands: WorkspaceCommand[]; onClose: () => void }) {
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const selectedItem = useRef<HTMLButtonElement>(null)
  const [text, setText] = useState('')
  const [position, setPosition] = useState(0)
  const query = text.toLocaleLowerCase().trim()
  const options = commands.filter(({ label, detail }) => `${label} ${detail}`.toLocaleLowerCase().includes(query))
  const selected = Math.min(position, options.length - 1)

  useEffect(() => input.current?.focus(), [])
  useEffect(() => selectedItem.current?.scrollIntoView({ block: 'nearest' }), [selected])

  function run(command: WorkspaceCommand) {
    onClose()
    command.run()
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || !options.length) return
    if (event.key === 'Enter') {
      event.preventDefault()
      run(options[selected])
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setPosition((selected + direction + options.length) % options.length)
    }
  }

  return (
    <JournalDialog title="Jump to" onClose={onClose}>
      <label className="search-field command-search">
        <Search size={18} />
        <input ref={input} role="combobox" aria-label="Search pages, habits, or actions"
          aria-autocomplete="list" aria-expanded="true" aria-controls={listId}
          aria-activedescendant={options[selected] ? `${listId}-${options[selected].id}` : undefined}
          value={text} onChange={(event) => { setText(event.target.value); setPosition(0) }}
          onKeyDown={handleKey} placeholder="Find a page, habit, or action…" />
      </label>
      <ul id={listId} className="command-list" role="listbox" aria-label="Workspace commands">
        {options.map(({ icon: Icon, ...option }, index) => (
          <li role="none" key={option.id}>
            <button id={`${listId}-${option.id}`} role="option" type="button" tabIndex={-1}
              aria-selected={index === selected} ref={index === selected ? selectedItem : null}
              onMouseEnter={() => setPosition(index)} onClick={() => run({ ...option, icon: Icon })}>
              <Icon size={17} /><span><strong>{option.label}</strong><small>{option.detail}</small></span><ArrowRight size={16} />
            </button>
          </li>
        ))}
      </ul>
      {!options.length && <p className="empty">No matching commands or habits.</p>}
      <div className="command-hints" aria-hidden="true"><span><kbd>↑</kbd> <kbd>↓</kbd> Move</span><span><kbd>Enter</kbd> Open</span><span><kbd>Esc</kbd> Close</span></div>
    </JournalDialog>
  )
}
