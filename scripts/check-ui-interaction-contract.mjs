import fs from 'node:fs';

const source = fs.readFileSync('src/ui/input/UIInteraction.ts', 'utf8');
const modalBlockerStart = source.indexOf('export function createModalBlocker');
const attachDebugStart = source.indexOf('function attachHitAreaDebug');

if (modalBlockerStart < 0 || attachDebugStart < modalBlockerStart) {
  throw new Error('Unable to locate createModalBlocker in UIInteraction.ts.');
}

const modalBlockerSource = source.slice(modalBlockerStart, attachDebugStart);

if (!/setRectangleHitArea\(\s*blocker,/.test(modalBlockerSource)) {
  throw new Error('createModalBlocker should use setRectangleHitArea() for its full-screen blocker.');
}

if (/blocker\.setInteractive\(/.test(modalBlockerSource)) {
  throw new Error('createModalBlocker should not hand-roll blocker.setInteractive().');
}

if (!/scene\.scale\.on\(\s*Phaser\.Scale\.Events\.RESIZE/.test(modalBlockerSource)) {
  throw new Error('createModalBlocker should refresh its full-screen blocker on scale resize.');
}

if (!/scene\.scale\.off\(\s*Phaser\.Scale\.Events\.RESIZE/.test(modalBlockerSource)) {
  throw new Error('createModalBlocker should remove its scale resize listener when destroyed.');
}

console.log('UI interaction contract check passed.');
