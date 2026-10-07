import { Island } from './notch/Island';
import { Dock } from './os/Dock/Dock';
import { MenuBar } from './os/MenuBar/MenuBar';
import { WindowLayer } from './os/WindowLayer';
import { Wallpaper } from './os/Wallpaper/Wallpaper';

export function App() {
  return (
    <main className="desktop">
      <Wallpaper />
      <MenuBar />
      <Island />
      <WindowLayer />
      <Dock />
    </main>
  );
}
