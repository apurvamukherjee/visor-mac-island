import { Island } from './notch/Island';
import { DesktopIcons } from './os/Desktop/DesktopIcons';
import { Dock } from './os/Dock/Dock';
import { MenuBar } from './os/MenuBar/MenuBar';
import { WindowLayer } from './os/WindowLayer';
import { Wallpaper } from './os/Wallpaper/Wallpaper';
import { useSettings } from './store/settings';
import { Widgets } from './widgets/Widgets';

export function App() {
  const appearance = useSettings((s) => s.appearance);
  return (
    <main className={`desktop is-${appearance}`}>
      <Wallpaper />
      <Widgets />
      <DesktopIcons />
      <MenuBar />
      <Island />
      <WindowLayer />
      <Dock />
    </main>
  );
}
