import { ScreenManager } from './ScreenManager';

export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export class SafeArea {
  static getInsets(screen: ScreenManager): SafeAreaInsets {
    if (screen.isPortrait() && SafeArea.isMobileLike(screen)) {
      return {
        top: 32,
        right: 16,
        bottom: 32,
        left: 16,
      };
    }

    return {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    };
  }

  private static isMobileLike(screen: ScreenManager): boolean {
    return screen.width <= 900 || screen.height <= 900;
  }
}
