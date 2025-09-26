import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService, PanelWidths } from 'src/app/services/storage.service';

@Component({
  selector: 'app-resizable-email-panels',
  imports: [CommonModule],
  template: `
    <div class="email-panels" [style]="panelStyles" [class.resizing]="resizing">
      <!-- Left Panel: Folders -->
      <div class="panel-container folder-panel-container">
        <ng-content select="[slot=folders]"></ng-content>
      </div>

      <!-- Resizer between folders and messages -->
      <div class="panel-resizer"
           (mousedown)="startResize($event, 'folder-message')"
           title="Drag to resize panels">
      </div>

      <!-- Middle Panel: Messages -->
      <div class="panel-container message-panel-container">
        <ng-content select="[slot=messages]"></ng-content>
      </div>

      <!-- Resizer between messages and message detail -->
      <div class="panel-resizer"
           (mousedown)="startResize($event, 'message-detail')"
           title="Drag to resize panels">
      </div>

      <!-- Right Panel: Message Detail -->
      <div class="panel-container message-detail-panel-container">
        <ng-content select="[slot=message-detail]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .email-panels {
      display: flex;
      height: 100%;
      background-color: var(--clr-global-app-background);
      position: relative;
    }

    .panel-container {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .folder-panel-container,
    .message-panel-container {
      border-right: 1px solid var(--clr-color-neutral-300);
    }

    .folder-panel-container {
      width: var(--folder-panel-width, 300px);
      min-width: 200px;
      max-width: 500px;
    }

    .message-panel-container {
      width: var(--message-panel-width, 400px);
      min-width: 300px;
      max-width: 600px;
    }

    .message-detail-panel-container {
      flex: 1;
      min-width: 300px;
      overflow: hidden;
    }

    .panel-container > :ng-deep * {
      flex: 1;
      height: 100%;
    }

    .panel-resizer {
      width: 4px;
      background: var(--clr-color-neutral-200);
      cursor: col-resize;
      position: relative;
      transition: background-color 0.2s ease;
      flex-shrink: 0;
    }

    .panel-resizer:hover {
      background: var(--clr-color-action-600);
    }

    .panel-resizer.resizing {
      background: var(--clr-color-action-600);
    }

    .email-panels.resizing {
      cursor: col-resize;
      user-select: none;
    }

    .email-panels.resizing * {
      pointer-events: none;
    }

    @media (max-width: 768px) {
      .email-panels {
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.25rem;
      }

      .panel-resizer {
        display: none;
      }

      .folder-panel-container,
      .message-panel-container,
      .message-detail-panel-container {
        width: 100% !important;
        min-width: unset !important;
        max-width: unset !important;
        border-right: none;
        border-bottom: 1px solid var(--clr-color-neutral-300);
      }
    }
  `]
})
export class ResizableEmailPanelsComponent implements OnInit, OnDestroy {
  @Output() panelWidthsChanged = new EventEmitter<PanelWidths>();

  private panelWidths: PanelWidths = { folderPanel: 300, messagePanel: 400, messageDetailPanel: -1 };
  panelStyles = '';
  resizing = false;
  private resizeType: 'folder-message' | 'message-detail' | null = null;
  private startX = 0;
  private startWidths = { folder: 0, message: 0 };

  private mouseMoveListener?: (event: MouseEvent) => void;
  private mouseUpListener?: (event: MouseEvent) => void;

  constructor(
    private storageService: StorageService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.panelWidths = this.storageService.getPanelWidths();
    this.updatePanelStyles();
  }

  ngOnDestroy(): void {
    this.removeEventListeners();
  }

  private updatePanelStyles(): void {
    this.panelStyles = `
      --folder-panel-width: ${this.panelWidths.folderPanel}px;
      --message-panel-width: ${this.panelWidths.messagePanel}px;
    `;
    this.panelWidthsChanged.emit(this.panelWidths);
  }

  startResize(event: MouseEvent, type: 'folder-message' | 'message-detail'): void {
    event.preventDefault();
    event.stopPropagation();

    this.resizing = true;
    this.resizeType = type;
    this.startX = event.clientX;

    this.startWidths.folder = this.panelWidths.folderPanel;
    this.startWidths.message = this.panelWidths.messagePanel;

    const target = event.target as HTMLElement;
    target.classList.add('resizing');

    this.mouseMoveListener = this.onMouseMove.bind(this);
    this.mouseUpListener = this.onMouseUp.bind(this);

    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseup', this.mouseUpListener);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.resizing || !this.resizeType) return;

    event.preventDefault();
    const deltaX = event.clientX - this.startX;

    if (this.resizeType === 'folder-message') {
      const newFolderWidth = Math.max(200, Math.min(500, this.startWidths.folder + deltaX));
      this.panelWidths.folderPanel = newFolderWidth;
    } else if (this.resizeType === 'message-detail') {
      const newMessageWidth = Math.max(300, Math.min(600, this.startWidths.message + deltaX));
      this.panelWidths.messagePanel = newMessageWidth;
    }

    this.updatePanelStyles();
  }

  private onMouseUp(event: MouseEvent): void {
    if (!this.resizing) return;

    this.resizing = false;
    this.resizeType = null;

    const resizers = this.elementRef.nativeElement.querySelectorAll('.panel-resizer');
    resizers.forEach((resizer: HTMLElement) => {
      resizer.classList.remove('resizing');
    });

    this.storageService.setPanelWidths(this.panelWidths);
    this.removeEventListeners();
  }

  private removeEventListeners(): void {
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
      this.mouseMoveListener = undefined;
    }
    if (this.mouseUpListener) {
      document.removeEventListener('mouseup', this.mouseUpListener);
      this.mouseUpListener = undefined;
    }
  }

  resetPanelWidths(): void {
    this.storageService.deletePanelWidths();
    this.panelWidths = this.storageService.getPanelWidths();
    this.updatePanelStyles();
  }
}