import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { MapMechanicIconKind } from '../assets/AssetKeyMap';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIDivider } from './components/UIDivider';
import { UIIconFrame } from './components/UIIconFrame';
import { UITabBar } from './components/UITabBar';
import { UIPager } from './components/UIPager';
import { UITextBlock } from './components/UITextBlock';
import { HelpContentBuilder } from './help/HelpContentBuilder';
import { HelpIconRef, HelpLine } from './help/HelpSection';
import { HelpTabDefinition } from './help/HelpTabDefinition';
import { createModalBlocker, setRectangleHitArea } from './input/UIInteraction';
import { IconTooltipData } from './tooltip/IconTooltipTypes';
import { UITheme } from './UITheme';

type PageRange = {
  start: number;
  end: number;
};

export class HelpOverlay {
  private static readonly CONTENT_ICON_SIZE = 24;
  private static readonly CONTENT_ICON_GAP = 10;

  private readonly container: Phaser.GameObjects.Container;
  private readonly screenManager: ScreenManager;
  private readonly blocker: Phaser.GameObjects.Rectangle;
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly pager: UIPager;
  private readonly tabs: HelpTabDefinition[];
  private tabBar?: UITabBar<string>;
  private readonly contentItems: Phaser.GameObjects.Container[] = [];
  private selectedTabIndex = 0;
  private pageByTab: Record<string, number> = {};
  private unsubscribeResize?: () => void;

  constructor(scene: Phaser.Scene, onClose?: () => void) {
    this.screenManager = new ScreenManager(scene);
    this.tabs = new HelpContentBuilder().buildTabs();
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1400);

    this.blocker = createModalBlocker(scene, 1399);
    this.blocker.setFillStyle(0x000000, 0.48);

    this.pager = new UIPager(scene, {
      x: 0,
      y: 0,
      width: 520,
      closeLabel: I18n.t('common.close'),
      onPageChanged: (page) => {
        const tab = this.tabs[this.selectedTabIndex];
        this.pageByTab[tab.id] = page;
        this.applyLayout();
      },
      onClose: () => {
        this.destroy();
        onClose?.();
      },
    });

    this.container.add(this.pager.container);

    this.renderContent(scene);
    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
  }

  destroy(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.screenManager.dispose();
    this.blocker.destroy();
    this.tabBar?.destroy();
    this.tabBar = undefined;
    this.container.destroy(true);
  }

  private renderContent(scene: Phaser.Scene): void {
    for (const item of this.contentItems) {
      item.destroy();
    }

    this.contentItems.length = 0;
    const tab = this.tabs[this.selectedTabIndex];

    for (const section of tab.sections) {
      this.addContentItem(scene, { type: 'subtitle', text: section.title });
      for (const line of section.lines) {
        this.addContentItem(scene, line);
      }
      this.addContentItem(scene, { type: 'divider' });
    }
  }

  private addContentItem(scene: Phaser.Scene, line: HelpLine): void {
    const row = scene.add.container(0, 0);
    const height = this.getLineHeight(line.type);
    row.setData('lineType', line.type);
    row.setData('height', height);

    if (line.type === 'divider') {
      const divider = UIDivider.create(scene, 0, 0);
      row.add(divider);
      this.contentItems.push(row);
      this.container.add(row);
      return;
    }

    if (line.type === 'subtitle') {
      const label = new UITextBlock(scene, {
        x: 0,
        y: 0,
        text: line.text ?? '',
        fontSize: UITheme.bodyFontSize,
        fontStyle: 'bold',
        align: 'left',
      }).text;
      row.add(label);
      this.contentItems.push(row);
      this.container.add(row);
      return;
    }

    if (line.type === 'statRow') {
      const label = new UITextBlock(scene, {
        x: 0,
        y: 0,
        text: line.label ?? '',
        fontSize: UITheme.smallFontSize,
        fontStyle: 'bold',
        align: 'left',
      }).text;
      label.setData('helpRole', 'label');
      const value = new UITextBlock(scene, {
        x: 150,
        y: 0,
        text: line.value ?? '',
        tone: 'muted',
        fontSize: UITheme.smallFontSize,
        align: 'left',
        width: 360,
      }).text;
      value.setData('helpRole', 'value');
      row.add([label, value]);
      this.contentItems.push(row);
      this.container.add(row);
      return;
    }

    if (line.type === 'paragraph' || line.type === 'bullet') {
      const text = new UITextBlock(scene, {
        x: 0,
        y: 0,
        text: line.type === 'bullet' ? `- ${line.text ?? ''}` : line.text ?? '',
        tone: line.type === 'bullet' ? 'primary' : 'muted',
        fontSize: UITheme.smallFontSize,
        align: 'left',
        width: 520,
      }).text;
      text.setMaxLines(line.type === 'bullet' ? 2 : 3);
      row.add(text);
      this.contentItems.push(row);
      this.container.add(row);
      return;
    }

    if (line.type === 'iconChain') {
      const label = new UITextBlock(scene, {
        x: 0,
        y: 0,
        text: line.text ?? '',
        fontSize: UITheme.smallFontSize,
        fontStyle: 'bold',
        align: 'left',
      }).text;
      label.setData('helpRole', 'chainLabel');
      row.add(label);

      (line.icons ?? []).forEach((icon, index, icons) => {
        const iconSlot = this.createHelpIconSlot(scene, icon);
        iconSlot.setData('helpRole', 'chainIcon');
        iconSlot.setData('chainIndex', index);
        row.add(iconSlot);

        if (index < icons.length - 1) {
          const arrow = new UITextBlock(scene, {
            x: 0,
            y: 0,
            text: '->',
            fontSize: UITheme.smallFontSize,
            fontStyle: 'bold',
            align: 'center',
          }).text;
          arrow.setData('helpRole', 'chainArrow');
          arrow.setData('chainIndex', index);
          row.add(arrow);
        }
      });

      this.contentItems.push(row);
      this.container.add(row);
      return;
    }

    const frame = this.createHelpIconFrame(
      scene,
      line,
      HelpOverlay.CONTENT_ICON_SIZE / 2,
      HelpOverlay.CONTENT_ICON_SIZE / 2,
    );
    row.add(frame);

    const text = new UITextBlock(scene, {
      x: HelpOverlay.CONTENT_ICON_SIZE + HelpOverlay.CONTENT_ICON_GAP,
      y: 0,
      text: line.text ?? '',
      tone: 'muted',
      fontSize: UITheme.smallFontSize,
      align: 'left',
      width: 520,
    }).text;
    text.setMaxLines(3);
    text.setData('helpRole', 'body');
    row.add(text);
    this.contentItems.push(row);
    this.container.add(row);
  }

  private applyLayout(): void {
    const layout = LayoutConfig.getHelpLayout(this.screenManager);
    const center = layout.panelCenter;
    const top = center.y - layout.panelHeight / 2;
    const left = center.x - layout.panelWidth / 2;
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny || this.screenManager.isPortrait();
    const tabGap = tiny ? 2 : compact ? 3 : 5;
    const tabWidth = Math.max(
      tiny ? 52 : compact ? 60 : 78,
      Math.min(tiny ? 76 : compact ? 86 : 102, Math.floor((layout.panelWidth - 44) / (compact ? 3 : 5))),
    );
    const tabHeight = tiny ? 22 : compact ? 24 : 28;
    const tabAreaTop = top + (tiny ? 42 : compact ? 48 : 58);
    const closeY = center.y + layout.panelHeight / 2 - (tiny ? 22 : compact ? 28 : 34);
    const pageControlY = closeY - (tiny ? 26 : compact ? 30 : 36);

    this.blocker.setPosition(0, 0);
    setRectangleHitArea(this.blocker, this.screenManager.width, this.screenManager.height);
    this.frame?.destroy();
    this.header?.destroy();
    this.frame = PanelFrame.create(this.container.scene, {
      x: center.x,
      y: center.y,
      width: layout.panelWidth,
      height: layout.panelHeight,
      variant: 'modal',
    });
    this.container.addAt(this.frame, 1);
    this.header = PanelHeader.create(this.container.scene, {
      x: center.x,
      y: top + (tiny ? 20 : compact ? 24 : 30),
      width: Math.max(200, layout.panelWidth - 56),
      title: this.tabs[this.selectedTabIndex]?.title ?? '',
      titleFontSize: tiny ? '16px' : compact ? '18px' : '22px',
    });
    this.container.add(this.header);
    const tabAreaHeight = this.renderTabBar(
      center.x,
      tabAreaTop,
      layout.panelWidth - 44,
      tabWidth,
      tabHeight,
      tabGap,
    );
    const contentLeft = left + (tiny ? 20 : compact ? 24 : 28);
    const contentTop = tabAreaTop + tabAreaHeight + (tiny ? 5 : compact ? 6 : 10);
    const bodyWidth = layout.bodyWidth;
    const contentBottom = pageControlY - (tiny ? 8 : compact ? 10 : 14);
    const availableHeight = Math.max(80, contentBottom - contentTop);
    this.layoutContent(contentLeft, contentTop, bodyWidth, availableHeight, layout.fontSize);
    this.layoutPageControls(center.x, pageControlY, closeY);
  }

  private layoutContent(
    contentLeft: number,
    contentTop: number,
    bodyWidth: number,
    availableHeight: number,
    fontSize: string,
  ): void {
    this.contentItems.forEach((item) => {
      this.updateContentItemMetrics(item, bodyWidth, fontSize);
    });

    const pages = this.buildPages(availableHeight);
    const tab = this.tabs[this.selectedTabIndex];
    const pageIndex = Phaser.Math.Clamp(this.pageByTab[tab.id] ?? 0, 0, Math.max(0, pages.length - 1));
    this.pageByTab[tab.id] = pageIndex;
    const page = pages[pageIndex] ?? { start: 0, end: this.contentItems.length };
    let y = contentTop;
    const rowGap = this.getRowGap();

    this.contentItems.forEach((item, index) => {
      const visible = index >= page.start && index < page.end;
      item.setVisible(visible);

      if (!visible) {
        return;
      }

      const type = item.getData('lineType') as HelpLine['type'];
      item.setPosition(contentLeft, y);
      y += (item.getData('height') as number) + rowGap;
    });

    const pageCount = Math.max(1, pages.length);
    this.pager.setPage(pageIndex, pageCount);
  }

  private updateContentItemMetrics(
    item: Phaser.GameObjects.Container,
    bodyWidth: number,
    fontSize: string,
  ): void {
    const type = item.getData('lineType') as HelpLine['type'];
    let measuredHeight = this.getLineHeight(type);

    const statLabel = item.list.find((child) => (
      child instanceof Phaser.GameObjects.Text
      && child.getData('helpRole') === 'label'
    )) as Phaser.GameObjects.Text | undefined;
    const statValue = item.list.find((child) => (
      child instanceof Phaser.GameObjects.Text
      && child.getData('helpRole') === 'value'
    )) as Phaser.GameObjects.Text | undefined;

    if (type === 'statRow' && statLabel && statValue) {
      const labelColumnWidth = Math.min(150, Math.floor(bodyWidth * 0.34));
      statLabel.setFontSize(fontSize);
      statValue.setFontSize(fontSize);
      const stacked = bodyWidth < 560 || statLabel.width > labelColumnWidth - 10;

      if (stacked) {
        statLabel.setPosition(0, 0);
        statValue.setPosition(0, statLabel.height + 4);
        statValue.setWordWrapWidth(Math.max(160, bodyWidth));
        measuredHeight = Math.ceil(statLabel.height + 4 + statValue.height);
      } else {
        statLabel.setPosition(0, 0);
        statValue.setPosition(labelColumnWidth, 0);
        statValue.setWordWrapWidth(Math.max(160, bodyWidth - labelColumnWidth));
        measuredHeight = Math.ceil(Math.max(statLabel.height, statValue.height));
      }

      item.setData('height', Math.max(this.getLineHeight(type), measuredHeight));
      return;
    }

    if (type === 'iconChain') {
      measuredHeight = this.updateIconChainMetrics(item, bodyWidth, fontSize);
      item.setData('height', Math.max(this.getLineHeight(type), measuredHeight));
      return;
    }

    for (const child of item.list) {
      if (child instanceof Phaser.GameObjects.Text) {
        if (child.getData('helpRole') === 'iconFallback') {
          measuredHeight = Math.max(measuredHeight, HelpOverlay.CONTENT_ICON_SIZE);
          continue;
        }

        child.setFontSize(type === 'subtitle' ? UITheme.bodyFontSize : fontSize);
        if (type !== 'subtitle') {
          const textOffset = type === 'iconRow'
            ? HelpOverlay.CONTENT_ICON_SIZE + HelpOverlay.CONTENT_ICON_GAP
            : 0;
          child.setWordWrapWidth(Math.max(160, bodyWidth - textOffset));
        }

        measuredHeight = Math.max(measuredHeight, Math.ceil(child.y + child.height));
      } else if (child instanceof Phaser.GameObjects.Rectangle && type === 'divider') {
        child.setSize(bodyWidth, 1);
      } else if (type === 'iconRow') {
        measuredHeight = Math.max(measuredHeight, HelpOverlay.CONTENT_ICON_SIZE);
      }
    }

    item.setData('height', Math.max(this.getLineHeight(type), measuredHeight));
  }

  private buildPages(availableHeight: number): PageRange[] {
    const pages: PageRange[] = [];
    let start = 0;
    let usedHeight = 0;
    const rowGap = this.getRowGap();

    this.contentItems.forEach((item, index) => {
      const height = (item.getData('height') as number) + rowGap;
      if (index > start && usedHeight + height > availableHeight) {
        pages.push({ start, end: index });
        start = index;
        usedHeight = 0;
      }

      usedHeight += height;
    });

    pages.push({ start, end: this.contentItems.length });
    return pages.filter((page) => page.end > page.start);
  }

  private layoutPageControls(centerX: number, pageControlY: number, closeY: number): void {
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = tiny || this.screenManager.isPortrait() || this.screenManager.width <= 700;
    this.pager.setPosition(centerX, pageControlY);
    this.pager.setSize(Math.min(this.screenManager.width - (tiny ? 48 : 80), tiny ? 280 : compact ? 330 : 520), compact);
    this.pager.closeButton?.setPosition(0, closeY - pageControlY);
  }

  private renderTabBar(
    x: number,
    y: number,
    width: number,
    tabWidth: number,
    tabHeight: number,
    gap: number,
  ): number {
    this.tabBar?.destroy();
    const selectedTab = this.tabs[this.selectedTabIndex];
    this.tabBar = new UITabBar(this.container.scene, {
      x,
      y,
      width,
      items: this.tabs.map((tab) => ({
        id: tab.id,
        label: tab.title,
      })),
      selectedId: selectedTab.id,
      tabWidth,
      tabHeight,
      gap,
      onSelect: (id) => {
        const nextIndex = this.tabs.findIndex((tab) => tab.id === id);
        if (nextIndex < 0 || nextIndex === this.selectedTabIndex) {
          return;
        }

        this.selectedTabIndex = nextIndex;
        this.pageByTab[id] = 0;
        this.renderContent(this.container.scene);
        this.applyLayout();
      },
    });
    this.container.add(this.tabBar.container);
    return this.tabBar.height;
  }

  private getLineHeight(type: HelpLine['type']): number {
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = tiny || density === 'compact' || this.screenManager.isPortrait();

    switch (type) {
      case 'subtitle':
        return tiny ? 18 : compact ? 21 : 25;
      case 'paragraph':
        return tiny ? 32 : compact ? 36 : 42;
      case 'bullet':
      case 'iconRow':
      case 'iconChain':
        return tiny ? 26 : compact ? 30 : 36;
      case 'statRow':
        return tiny ? 24 : compact ? 28 : 32;
      case 'divider':
        return tiny ? 4 : compact ? 6 : 8;
      case 'title':
      default:
        return tiny ? 22 : compact ? 25 : 30;
    }
  }

  private getRowGap(): number {
    const density = LayoutConfig.getContentDensity(this.screenManager);

    if (density === 'tiny') {
      return 3;
    }

    if (density === 'compact' || this.screenManager.isPortrait()) {
      return 4;
    }

    return 6;
  }

  private createHelpIconSlot(scene: Phaser.Scene, icon: HelpIconRef): Phaser.GameObjects.Container {
    const slot = scene.add.container(0, 0);
    const frame = this.createHelpIconFrame(
      scene,
      icon,
      HelpOverlay.CONTENT_ICON_SIZE / 2,
      HelpOverlay.CONTENT_ICON_SIZE / 2,
    );
    slot.add(frame);

    return slot;
  }

  private createHelpIconFrame(
    scene: Phaser.Scene,
    icon: HelpIconRef,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const iconKey = this.resolveHelpIconKey(scene, icon);

    return UIIconFrame.create(scene, {
      x,
      y,
      size: HelpOverlay.CONTENT_ICON_SIZE,
      textureKey: iconKey,
      fallback: icon.fallback ?? '?',
      tooltip: this.getHelpIconTooltip(icon),
      tooltipLockOnClick: false,
      fillAlpha: 0.78,
      borderAlpha: 0.48,
    });
  }

  private getHelpIconTooltip(icon: HelpIconRef): IconTooltipData | undefined {
    if (!icon.iconKind || !icon.iconId) {
      return undefined;
    }

    return {
      kind: icon.iconKind === 'mapMechanic' ? 'mapMechanic' : icon.iconKind,
      id: icon.iconId,
      fallback: icon.fallback,
    };
  }

  private resolveHelpIconKey(scene: Phaser.Scene, icon: HelpIconRef): string | undefined {
    if (icon.iconKey && scene.textures.exists(icon.iconKey)) {
      return icon.iconKey;
    }

    if (!icon.iconKind || !icon.iconId) {
      return undefined;
    }

    if (icon.iconKind === 'weapon') {
      return AssetKeyResolver.getWeaponIconKey(scene, icon.iconId) ?? undefined;
    }

    if (icon.iconKind === 'passive') {
      return AssetKeyResolver.getPassiveIconKey(scene, icon.iconId) ?? undefined;
    }

    const mapMechanicKey = HelpOverlay.getMapMechanicIconTextureKey(icon.iconId as MapMechanicIconKind);
    return mapMechanicKey && scene.textures.exists(mapMechanicKey)
      ? mapMechanicKey
      : undefined;
  }

  private updateIconChainMetrics(
    item: Phaser.GameObjects.Container,
    bodyWidth: number,
    fontSize: string,
  ): number {
    const label = item.list.find((child) => (
      child instanceof Phaser.GameObjects.Text
      && child.getData('helpRole') === 'chainLabel'
    )) as Phaser.GameObjects.Text | undefined;
    const icons = item.list.filter((child) => (
      child instanceof Phaser.GameObjects.Container
      && child.getData('helpRole') === 'chainIcon'
    )) as Phaser.GameObjects.Container[];
    const arrows = item.list.filter((child) => (
      child instanceof Phaser.GameObjects.Text
      && child.getData('helpRole') === 'chainArrow'
    )) as Phaser.GameObjects.Text[];
    const labelColumnWidth = Math.min(150, Math.floor(bodyWidth * 0.34));

    label?.setFontSize(fontSize);
    const stacked = !label || bodyWidth < 520 || label.width > labelColumnWidth - 10;
    const startX = stacked ? 0 : labelColumnWidth;
    const startY = stacked && label ? label.height + 8 : 0;
    let cursorX = startX;

    if (label) {
      label.setPosition(0, 0);
    }

    icons.forEach((icon, index) => {
      icon.setPosition(cursorX, startY);
      cursorX += HelpOverlay.CONTENT_ICON_SIZE + 14;

      const arrow = arrows.find((candidate) => candidate.getData('chainIndex') === index);
      if (arrow) {
        arrow.setFontSize(fontSize);
        arrow.setPosition(cursorX, startY + HelpOverlay.CONTENT_ICON_SIZE / 2);
        cursorX += 22;
      }
    });

    return Math.ceil(Math.max(
      label?.height ?? 0,
      startY + HelpOverlay.CONTENT_ICON_SIZE,
    ));
  }

  private static getMapMechanicIconTextureKey(kind: MapMechanicIconKind): string | undefined {
    const keys: Partial<Record<MapMechanicIconKind, string>> = {
      river: 'art_map_mechanics_river_minimap',
      swamp: 'art_map_mechanics_swamp_minimap',
      mud: 'art_map_mechanics_mud_minimap',
      ink: 'art_map_mechanics_ink_minimap',
      portalBlue: 'art_map_mechanics_portal_minimap_blue',
      portalPurple: 'art_map_mechanics_portal_minimap_purple',
      portalGreen: 'art_map_mechanics_portal_minimap_green',
      portalGold: 'art_map_mechanics_portal_minimap_gold',
      light: 'art_map_mechanics_light_minimap',
      obstacle: 'art_map_mechanics_obstacle_minimap',
      hazard: 'art_map_mechanics_hazard_minimap',
      altar: 'art_map_mechanics_altar_minimap',
      altarLibrary: 'art_map_mechanics_altar_library_minimap',
      spawner: 'art_map_mechanics_spawner_minimap',
    };

    return keys[kind];
  }

}
