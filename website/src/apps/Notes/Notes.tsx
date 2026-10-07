import { useState } from 'react';
import { notes } from './content';
import './Notes.css';

const folders = ['Apurva', 'Visor'] as const;

export function Notes() {
  const [id, setId] = useState(notes[0]?.id);
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
