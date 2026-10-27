import { useRef, useState } from 'react';
import { convertImage, imagesToPdf, openTarget, pdfToImages, report, reveal, share, startDrag } from '../native';
import { useThumbnail } from './queries';
import { useShelf } from './store';

const name = (path: string) => path.split(/[\\/]/).pop() ?? path;
const ext = (path: string) => path.split('.').pop()?.toLowerCase() ?? '';
const isImage = (path: string) => ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'tif', 'tiff', 'webp', 'heic'].includes(ext(path));
const isPdf = (path: string) => ext(path) === 'pdf';
// A press becomes a drag once the pointer moves this far.
const DRAG_PX = 4;

function Item({ path, selected, onSelect, onDrag }: { path: string; selected: boolean; onSelect: (e: React.MouseEvent) => void; onDrag: () => void }) {
  const { data: thumb, isError } = useThumbnail(path);
  const press = useRef<{ x: number; y: number } | null>(null);
  return (
    <li
      className={`shelf-item${selected ? ' is-selected' : ''}${isError ? ' is-missing' : ''}`}
      title={isError ? `${path} (moved or deleted)` : path}
      aria-selected={selected}
      onClick={onSelect}
      onDoubleClick={() => openTarget(path).catch(report)}
      onPointerDown={(e) => (press.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={() => (press.current = null)}
      onPointerMove={(e) => {
        const p = press.current;
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > DRAG_PX) {
          press.current = null;
          onDrag();
        }
      }}
    >
      {thumb ? <img src={thumb} alt="" className={isImage(path) ? 'is-thumb' : ''} width={46} height={46} /> : <span className="shelf-icon" aria-hidden />}
      <span>{name(path)}</span>
    </li>
  );
}

export function Shelf() {
  const { files, add, remove } = useShelf();
  const [selected, setSelected] = useState<string[]>([]);
  const chosen = selected.filter((p) => files.includes(p));
  const targets = chosen.length ? chosen : files;
  const run = (job: Promise<string | string[]>) => job.then((made) => add([made].flat()), report);

  const select = (path: string, e: React.MouseEvent) =>
    setSelected(e.ctrlKey || e.shiftKey ? (chosen.includes(path) ? chosen.filter((p) => p !== path) : [...chosen, path]) : [path]);

  const images = chosen.filter(isImage);
  const only = chosen.length === 1 ? chosen[0] : undefined;
  return (
    <div className="shelf">
      <button className="shelf-zone shelf-share" disabled={!files.length} onClick={() => share(targets).catch(report)}>
        <span className="shelf-share-circle" aria-hidden>
          ⇪
        </span>
        Share
      </button>
      <div className="shelf-zone shelf-main">
        {files.length ? (
          <ul className="shelf-files" aria-label="Shelf" aria-multiselectable>
            {files.map((p) => (
              <Item key={p} path={p} selected={chosen.includes(p)} onSelect={(e) => select(p, e)} onDrag={() => startDrag(chosen.includes(p) ? chosen : [p]).catch(report)} />
            ))}
          </ul>
        ) : (
          <p className="shelf-empty">Drop files here to keep them close</p>
        )}
        {chosen.length > 0 && (
          <div className="shelf-actions">
            {only && <button onClick={() => reveal(only).catch(report)}>Show in Explorer</button>}
            {images.length === chosen.length && (
              <>
                <button onClick={() => images.forEach((p) => run(convertImage(p, 'png')))}>To PNG</button>
                <button onClick={() => images.forEach((p) => run(convertImage(p, 'jpeg')))}>To JPEG</button>
                <button onClick={() => run(imagesToPdf(images))}>Make PDF</button>
              </>
            )}
            {only && isPdf(only) && <button onClick={() => run(pdfToImages(only))}>Pages to images</button>}
            <button
              onClick={() => {
                remove(chosen);
                setSelected([]);
              }}
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
