import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/base.css';
import './styles/screen.css';
import './ui/controls.css';

/*
 * 部屋の光の CSS 変数に型を付ける。型があると transition が効き、
 * 時刻やランプが切り替わったときに色が補間される。
 */
const COLOR_VARS: [string, string][] = [
  ['--sky-top', '#8fb6ff'],
  ['--sky-bottom', '#d9e6ff'],
  ['--wall-l', '#f4efe7'],
  ['--wall-r', '#e9e2d6'],
  ['--floor-a', '#d9b48f'],
  ['--floor-b', '#cfa880'],
  ['--room-tint', 'rgba(255, 255, 255, 0)'],
];
const NUMBER_VARS: [string, string][] = [
  ['--lamp-glow', '0'],
  ['--sun', '1'],
];
if (typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
  for (const [name, initialValue] of COLOR_VARS) {
    try {
      CSS.registerProperty({ name, syntax: '<color>', inherits: true, initialValue });
    } catch {
      /* 二重登録（HMR）は無視 */
    }
  }
  for (const [name, initialValue] of NUMBER_VARS) {
    try {
      CSS.registerProperty({ name, syntax: '<number>', inherits: true, initialValue });
    } catch {
      /* 二重登録（HMR）は無視 */
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
