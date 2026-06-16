import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIActionBar, UIActionBarAction } from './components/UIActionBar';
import { DeveloperMenu } from './DeveloperMenu';
import { HelpOverlay } from './HelpOverlay';
import { SettingsMenu } from './SettingsMenu';
import {
  createModalBlocker,
  setRectangleHitArea,
} from './input/UIInteraction';
import { StatsBuildPanel } from './stats/StatsBuildPanel';
import { StatsBuildSnapshot } from './stats/StatsBuildSnapshot';
import { UITheme } from './UITheme';

export type PauseMenuStatsData = StatsBuildSnapshot;

type PauseMenuActionId =
  | 'resume'
  | 'restart'
  | 'title'
  | 'stats'
  | 'settings'
  | 'developer'
  | 'help';

export class PauseMenu {
  private readonly container: Phaser.GameObjects.Container;
  private readonly screenManager: ScreenManager;
  private readonly blocker: Phaser.GameObjects.Rectangle;
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly actionBar: UIActionBar<PauseMenuActionId>;
  private unsubscribeResize?: () => void;
  private helpOverlay?: HelpOverlay;
  private settingsMenu?: SettingsMenu;
  private developerMenu?: DeveloperMenu;
  private statsBuildPanel?: StatsBuildPanel;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly statsData: PauseMenuStatsData,
    private readonly onResume: () => void,
    private readonly onRestart: () => void,
    private readonly onBackToTitle: () => void,
    _onHelp: () => void,
    private readonly onOpenDeveloperScene?: (sceneKey: string) => void,
  ) {
    this.screenManager = new ScreenManager(scene);
    this.blocker = createModalBlocker(scene, 1199);

    this.container = scene.add.container(0, 0);
    this.container.setDepth(1200);
    this.actionBar = new UIActionBar<PauseMenuActionId>(scene, []);
    this.container.add(this.actionBar.container);
    this.renderMainPage();
    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
  }

  destroy(): void {
    this.helpOverlay?.destroy();
    this.helpOverlay = undefined;
    this.settingsMenu?.destroy();
    this.settingsMenu = undefined;
    this.developerMenu?.destroy();
    this.developerMenu = undefined;
    this.statsBuildPanel?.destroy();
    this.statsBuildPanel = undefined;
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.screenManager.dispose();
    this.blocker.destroy();
    this.actionBar.destroy();
    this.container.destroy(true);
  }

  private renderMainPage(): void {
    const buttons: Array<UIActionBarAction<PauseMenuActionId>> = [
      { id: 'resume', label: I18n.t('pause.resume'), onClick: this.onResume },
      { id: 'restart', label: I18n.t('pause.restart'), onClick: this.onRestart },
      { id: 'title', label: I18n.t('pause.returnToTitle'), onClick: this.onBackToTitle },
      {
        id: 'stats',
        label: I18n.t('pause.statsBuild'),
        onClick: () => this.showStatsBuildPanel(),
      },
      {
        id: 'settings',
        label: I18n.t('pause.settings'),
        onClick: () => this.showSettingsMenu(),
      },
      {
        id: 'developer',
        label: I18n.t('developer.title'),
        onClick: () => this.showDeveloperMenu(),
      },
      {
        id: 'help',
        label: I18n.t('common.help'),
        onClick: () => this.showHelpOverlay(),
      },
    ];

    this.actionBar.setActions(buttons);
    this.applyLayout();
  }

  private showStatsBuildPanel(): void {
    this.statsBuildPanel?.destroy();
    this.statsBuildPanel = new StatsBuildPanel(this.scene, {
      snapshot: this.statsData,
      onClose: () => {
        this.statsBuildPanel?.destroy();
        this.statsBuildPanel = undefined;
      },
    });
  }

  private applyLayout(): void {
    const layout = LayoutConfig.getPauseMenuLayout(this.screenManager);
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const compact = density === 'compact' || density === 'tiny';

    setRectangleHitArea(this.blocker, this.screenManager.width, this.screenManager.height);
    this.frame?.destroy();
    this.header?.destroy();
    this.frame = PanelFrame.create(this.scene, {
      x: layout.panelCenter.x,
      y: layout.panelCenter.y,
      width: layout.panelWidth,
      height: layout.panelHeight,
      alpha: UITheme.pausePanelAlpha,
      variant: 'modal',
    });
    this.container.addAt(this.frame, 0);
    this.header = PanelHeader.create(this.scene, {
      x: layout.panelCenter.x,
      y: layout.panelCenter.y - layout.panelHeight / 2 + (compact ? 32 : 38),
      width: Math.max(220, layout.panelWidth - 48),
      title: I18n.t('pause.title'),
    });
    this.container.add(this.header);

    this.layoutMainButtons(layout);
  }

  private layoutMainButtons(layout: ReturnType<typeof LayoutConfig.getPauseMenuLayout>): void {
    const panelLeft = layout.panelCenter.x - layout.panelWidth / 2;
    const panelTop = layout.panelCenter.y - layout.panelHeight / 2;
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const compact = density === 'compact' || density === 'tiny';
    const horizontalInset = compact ? 16 : 20;
    const topInset = this.screenManager.isPortrait()
      ? compact ? 70 : 78
      : compact ? 70 : 80;
    const bottomReserve = this.screenManager.isPortrait()
      ? compact ? 74 : 86
      : compact ? 68 : 82;
    this.actionBar.layout(this.screenManager, {
      x: panelLeft + horizontalInset,
      y: panelTop + topInset,
      width: layout.panelWidth - horizontalInset * 2,
      height: Math.max(1, layout.panelHeight - topInset - bottomReserve),
    }, {
      columns: 2,
      compact: compact || layout.panelWidth < 540 || layout.panelHeight < 420,
      minWidth: 96,
      maxWidth: compact ? 150 : 178,
      minHeight: density === 'tiny' ? 26 : 30,
      maxHeight: density === 'tiny' ? 32 : compact ? 36 : 40,
      fontSize: density === 'tiny' ? '9px' : compact ? '10px' : '12px',
    });
  }

  private showHelpOverlay(): void {
    this.helpOverlay?.destroy();
    this.helpOverlay = new HelpOverlay(this.scene, () => {
      this.helpOverlay = undefined;
    });
  }

  private showSettingsMenu(): void {
    this.settingsMenu?.destroy();
    this.settingsMenu = new SettingsMenu(this.scene, () => {
      this.settingsMenu?.destroy();
      this.settingsMenu = undefined;
      this.renderMainPage();
    }, () => {
      this.renderMainPage();
    });
  }

  private showDeveloperMenu(): void {
    this.developerMenu?.destroy();
    this.developerMenu = new DeveloperMenu(this.scene, {
      onClose: () => {
        this.developerMenu = undefined;
        this.renderMainPage();
      },
      onOpenScene: (sceneKey) => {
        this.onOpenDeveloperScene?.(sceneKey);
      },
    });
  }
}
