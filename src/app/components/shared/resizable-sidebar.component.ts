import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-resizable-sidebar',
  imports: [CommonModule],
  template: `
    <div class="resizable-sidebar-container" [style]="containerStyles">
      <div class="sidebar-content">
        <ng-content></ng-content>
      </div>
      <div class="sidebar-resizer"
           (mousedown)="startResize($event)"
           title="Drag to resize sidebar">
      </div>
    </div>
  `,
  styles: [`
    .resizable-sidebar-container {
      display: flex;
      position: relative;
      min-width: var(--min-width, 200px);
      max-width: var(--max-width, 500px);
      width: var(--sidebar-width, 300px);
    }

    .sidebar-content {
      flex: 1;
      overflow: auto;
      height: calc(100vh - var(--clr-header-height));
    }

    .sidebar-resizer {
      width: 4px;
      background: var(--clr-color-neutral-200);
      cursor: col-resize;
      position: relative;
      transition: background-color 0.2s ease;
      flex-shrink: 0;
    }

    .sidebar-resizer:hover {
      background: var(--clr-color-action-600);
    }

    .sidebar-resizer.resizing {
      background: var(--clr-color-action-600);
    }

    :host.resizing {
      user-select: none;
    }

    :host.resizing * {
      pointer-events: none;
    }
  `]
})
export class ResizableSidebarComponent implements OnInit, OnDestroy {
  @Input() minWidth: number = 200;
  @Input() maxWidth: number = 500;
  @Input() defaultWidth: number = 300;
  @Input() storageKey: string = 'sidebar_width';

  @Output() widthChanged = new EventEmitter<number>();

  containerStyles = '';
  private currentWidth: number = this.defaultWidth;
  private resizing = false;
  private startX = 0;
  private startWidth = 0;

  private mouseMoveListener?: (event: MouseEvent) => void;
  private mouseUpListener?: (event: MouseEvent) => void;

  constructor(
    private storageService: StorageService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadWidth();
    this.updateStyles();
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

  private updateStyles(): void {
    this.containerStyles = `
      --sidebar-width: ${this.currentWidth}px;
      --min-width: ${this.minWidth}px;
      --max-width: ${this.maxWidth}px;
    `;
    this.widthChanged.emit(this.currentWidth);
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.resizing = true;
    this.startX = event.clientX;
    this.startWidth = this.currentWidth;

    const hostElement = this.elementRef.nativeElement;
    hostElement.classList.add('resizing');

    const resizer = event.target as HTMLElement;
    resizer.classList.add('resizing');

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
    this.updateStyles();
  }

  private onMouseUp(event: MouseEvent): void {
    if (!this.resizing) return;

    this.resizing = false;

    const hostElement = this.elementRef.nativeElement;
    hostElement.classList.remove('resizing');

    const resizers = this.elementRef.nativeElement.querySelectorAll('.sidebar-resizer');
    resizers.forEach((resizer: HTMLElement) => {
      resizer.classList.remove('resizing');
    });

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
    this.updateStyles();

    if (this.storageKey === 'sidebar_width') {
      this.storageService.deleteSidebarWidth();
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }
}