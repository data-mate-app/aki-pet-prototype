import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/base.css';
import '../styles/screen.css';
import '../ui/controls.css';
import '../App.css';
import './SideRoom.css';
import { SideBand, SideRoom } from './SideRoom';

/** ?panorama … 帯だけを 1500×812 で出す（書き出し・確認用） */
const panorama = new URLSearchParams(window.location.search).has('panorama');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{panorama ? <SideBand /> : <SideRoom />}</StrictMode>,
);
