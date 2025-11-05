import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-resizable-sidebar',
  imports: [CommonModule],
  template: `
    <div
      class="flex relative"
      [style.minWidth.px]="minWidth"
      [style.maxWidth.px]="maxWidth"
      [style.width.px]="currentWidth"
      [ngClass]="{ 'select-none': resizing }"
    >
      <div
        class="flex-1 overflow-auto h-[calc(100vh-var(--clr-header-height))]"
        [ngClass]="{ 'pointer-events-none': resizing }"
      >
        <ng-content></ng-content>
      </div>
      <div
        class="w-1 bg-[var(--clr-color-neutral-200)] cursor-col-resize relative transition-colors duration-200 ease-out flex-shrink-0 hover:bg-[var(--clr-color-action-600)]"
        [ngClass]="{ 'bg-[var(--clr-color-action-600)]': resizing }"
        (mousedown)="startResize($event)"
        title="Drag to resize sidebar"
      >
      </div>
    </div>
  `
})
export class ResizableSidebarComponent implements OnInit, OnDestroy {
  @Input() minWidth: number = 200;
  @Input() maxWidth: number = 500;
  @Input() defaultWidth: number = 300;
  @Input() storageKey: string = 'sidebar_width';

  @Output() widthChanged = new EventEmitter<number>();

  currentWidth: number = this.defaultWidth;
  resizing = false;
  private startX = 0;
  private startWidth = 0;

  private mouseMoveListener?: (event: MouseEvent) => void;
  private mouseUpListener?: (event: MouseEvent) => void;

  constructor(
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.loadWidth();
    this.emitWidth();
  }

  ngOnDestroy(): void {
    this.removeEventListeners();
  }

  private loadWidth(): void {
    if (this.storageKey === 'sidebar_width') {
      this.currentWidth = this.storageService.getSidebarWidth();
    } else {
      const storedWidth = localStorage.getItem(this.storageKey);
      if (storedWidth) {
        const parsed = parseInt(storedWidth, 10);
        this.currentWidth = isNaN(parsed) ? this.defaultWidth : parsed;
      }
    }
  }

  private saveWidth(): void {
    if (this.storageKey === 'sidebar_width') {
      this.storageService.setSidebarWidth(this.currentWidth);
    } else {
      localStorage.setItem(this.storageKey, this.currentWidth.toString());
    }
  }

  private emitWidth(): void {
    this.widthChanged.emit(this.currentWidth);
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.resizing = true;
    this.startX = event.clientX;
    this.startWidth = this.currentWidth;

    this.mouseMoveListener = this.onMouseMove.bind(this);
    this.mouseUpListener = this.onMouseUp.bind(this);

    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseup', this.mouseUpListener);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.resizing) return;

    event.preventDefault();
    const deltaX = event.clientX - this.startX;
    const newWidth = Math.max(
      this.minWidth,
      Math.min(this.maxWidth, this.startWidth + deltaX)
    );

    this.currentWidth = newWidth;
    this.emitWidth();
  }

  private onMouseUp(): void {
    if (!this.resizing) return;

    this.resizing = false;

    this.saveWidth();
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

  resetWidth(): void {
    this.currentWidth = this.defaultWidth;
    this.emitWidth();

    if (this.storageKey === 'sidebar_width') {
      this.storageService.deleteSidebarWidth();
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }
}
