import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService, PanelWidths } from 'src/app/services/storage.service';

@Component({
  selector: 'app-resizable-email-panels',
  imports: [CommonModule],
  template: `
    <div
      class="flex h-full flex-col gap-1 p-1 bg-[var(--clr-global-app-background)] md:relative md:flex-row md:gap-0 md:p-0"
      [ngClass]="{ 'cursor-col-resize': resizing, 'select-none': resizing }"
    >
      <div
        class="flex w-full flex-col overflow-hidden border-b border-[var(--clr-color-neutral-300)] md:w-auto md:border-b-0 md:border-r"
        [ngClass]="{ 'pointer-events-none': resizing }"
        [style.minWidth.px]="FOLDER_MIN_WIDTH"
        [style.maxWidth.px]="FOLDER_MAX_WIDTH"
        [style.width.px]="panelWidths.folderPanel"
      >
        <div class="flex-1 h-full">
          <ng-content select="[slot=folders]"></ng-content>
        </div>
      </div>

      <div
        class="hidden md:block w-1 bg-[var(--clr-color-neutral-200)] cursor-col-resize relative transition-colors duration-200 ease-out flex-shrink-0 hover:bg-[var(--clr-color-action-600)]"
        [ngClass]="{ 'bg-[var(--clr-color-action-600)]': activeResizer === 'folder-message' }"
        (mousedown)="startResize($event, 'folder-message')"
        title="Drag to resize panels"
      ></div>

      <div
        class="flex w-full flex-col overflow-hidden border-b border-[var(--clr-color-neutral-300)] md:w-auto md:border-b-0 md:border-r"
        [ngClass]="{ 'pointer-events-none': resizing }"
        [style.minWidth.px]="MESSAGE_MIN_WIDTH"
        [style.maxWidth.px]="MESSAGE_MAX_WIDTH"
        [style.width.px]="panelWidths.messagePanel"
      >
        <div class="flex-1 h-full">
          <ng-content select="[slot=messages]"></ng-content>
        </div>
      </div>

      <div
        class="hidden md:block w-1 bg-[var(--clr-color-neutral-200)] cursor-col-resize relative transition-colors duration-200 ease-out flex-shrink-0 hover:bg-[var(--clr-color-action-600)]"
        [ngClass]="{ 'bg-[var(--clr-color-action-600)]': activeResizer === 'message-detail' }"
        (mousedown)="startResize($event, 'message-detail')"
        title="Drag to resize panels"
      ></div>

      <div
        class="flex flex-1 flex-col overflow-auto border-b border-[var(--clr-color-neutral-300)] md:border-b-0"
        [ngClass]="{ 'pointer-events-none': resizing }"
        [style.minWidth.px]="DETAIL_MIN_WIDTH"
      >
        <div class="flex-1 h-full">
          <ng-content select="[slot=message-detail]"></ng-content>
        </div>
      </div>
    </div>
  `
})
export class ResizableEmailPanelsComponent implements OnInit, OnDestroy {
  @Output() panelWidthsChanged = new EventEmitter<PanelWidths>();

  readonly FOLDER_MIN_WIDTH = 200;
  readonly FOLDER_MAX_WIDTH = 500;
  readonly MESSAGE_MIN_WIDTH = 300;
  readonly MESSAGE_MAX_WIDTH = 600;
  readonly DETAIL_MIN_WIDTH = 300;

  panelWidths: PanelWidths = { folderPanel: 300, messagePanel: 400, messageDetailPanel: -1 };
  resizing = false;
  activeResizer: 'folder-message' | 'message-detail' | null = null;
  private resizeType: 'folder-message' | 'message-detail' | null = null;
  private startX = 0;
  private startWidths = { folder: 0, message: 0 };

  private mouseMoveListener?: (event: MouseEvent) => void;
  private mouseUpListener?: (event: MouseEvent) => void;

  constructor(
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.panelWidths = this.storageService.getPanelWidths();
    this.emitPanelWidths();
  }

  ngOnDestroy(): void {
    this.removeEventListeners();
  }

  private emitPanelWidths(): void {
    this.panelWidthsChanged.emit(this.panelWidths);
  }

  startResize(event: MouseEvent, type: 'folder-message' | 'message-detail'): void {
    event.preventDefault();
    event.stopPropagation();

    this.resizing = true;
    this.resizeType = type;
    this.activeResizer = type;
    this.startX = event.clientX;

    this.startWidths.folder = this.panelWidths.folderPanel;
    this.startWidths.message = this.panelWidths.messagePanel;

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
      const newFolderWidth = Math.max(
        this.FOLDER_MIN_WIDTH,
        Math.min(this.FOLDER_MAX_WIDTH, this.startWidths.folder + deltaX)
      );
      this.panelWidths.folderPanel = newFolderWidth;
    } else if (this.resizeType === 'message-detail') {
      const newMessageWidth = Math.max(
        this.MESSAGE_MIN_WIDTH,
        Math.min(this.MESSAGE_MAX_WIDTH, this.startWidths.message + deltaX)
      );
      this.panelWidths.messagePanel = newMessageWidth;
    }

    this.emitPanelWidths();
  }

  private onMouseUp(): void {
    if (!this.resizing) return;

    this.resizing = false;
    this.resizeType = null;
    this.activeResizer = null;

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
    this.emitPanelWidths();
  }
}
