import { Dock } from './os/Dock/Dock';
import { Wallpaper } from './os/Wallpaper/Wallpaper';

export function App() {
  return (
    <main className="desktop">
      <Wallpaper />
      <Dock />
    </main>
  );
}
