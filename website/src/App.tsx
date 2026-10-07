import { Island } from './notch/Island';
import { Dock } from './os/Dock/Dock';
import { MenuBar } from './os/MenuBar/MenuBar';
import { WindowLayer } from './os/WindowLayer';
import { Wallpaper } from './os/Wallpaper/Wallpaper';
import { useSettings } from './store/settings';

export function App() {
  const appearance = useSettings((s) => s.appearance);
  return (
    <main className={`desktop is-${appearance}`}>
      <Wallpaper />
      <MenuBar />
      <Island />
      <WindowLayer />
      <Dock />
    </main>
  );
}
