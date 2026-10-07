export function Trash() {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, color: 'rgb(0 0 0 / 0.5)', background: '#fff' }}>
      <div>
        <div style={{ fontSize: 40 }}>🗑️</div>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: '#1d1d1f' }}>Trash is empty</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Visor is free. There’s nothing here to throw away.</p>
      </div>
    </div>
  );
}
