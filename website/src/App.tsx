import { Dock } from './os/Dock/Dock';
import { MenuBar } from './os/MenuBar/MenuBar';
import { Wallpaper } from './os/Wallpaper/Wallpaper';

export function App() {
  return (
    <main className="desktop">
      <Wallpaper />
      <MenuBar />
      <Dock />
    </main>
  );
}
