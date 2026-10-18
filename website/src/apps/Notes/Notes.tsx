import { create } from 'zustand';
import { useWindows } from '../../store/windows';
import { notes } from './content';
import './Notes.css';

const folders = ['Apurva', 'Visor'] as const;

// Shared so links elsewhere (Help menu, What's new, CHANGELOG.md) can open Notes on a given note.
const useNote = create<{ id: string }>()(() => ({ id: 'hello' }));
const setId = (id: string) => useNote.setState({ id });

export function openNote(id: string) {
  setId(id);
  useWindows.getState().open('notes');
}

export function Notes() {
  const id = useNote((s) => s.id);
  const note = notes.find((n) => n.id === id) ?? notes[0];
  return (
    <div className="notes">
      <nav className="notes-list" aria-label="Notes">
        {folders.map((folder) => (
          <section key={folder}>
            <h3>{folder}</h3>
            {notes.filter((n) => n.folder === folder).map((n) => (
              <button key={n.id} className={n.id === note?.id ? 'is-active' : ''} onClick={() => setId(n.id)}>
                <b>{n.title}</b>
                <span>{n.preview}</span>
              </button>
            ))}
          </section>
        ))}
      </nav>
      {note && (
        <article className="notes-body">
          <h1>{note.title}</h1>
          {note.body}
        </article>
      )}
    </div>
  );
}
