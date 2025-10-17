import { Component, OnInit, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClarityModule } from '@clr/angular';
import { FolderDto } from 'src/app/dtos/folder-dto';
import { BackendService } from 'src/app/services/backend.service';

@Component({
  selector: 'app-email-folders',
  imports: [CommonModule, ClarityModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <clr-card class="folder-panel">
      <clr-card-header>
        <clr-card-title>
          <span>Folders</span>
          <button 
            class="btn btn-sm btn-link refresh-btn-header" 
            (click)="loadFolders()" 
            [disabled]="loadingFolders">
            <cds-icon shape="refresh"></cds-icon>
          </button>
        </clr-card-title>
      </clr-card-header>
      
      <clr-card-content class="folder-content">
        <div class="compose-section">
          <button 
            class="btn btn-primary btn-block compose-btn"
            (click)="composeEmail()"
            title="Compose new email">
            <span class="material-symbols-outlined">edit</span>
            Compose
          </button>
        </div>
        @if (loadingFolders) {
          <div class="loading-center">
            <clr-spinner clrSmall>Loading folders...</clr-spinner>
          </div>
        } @else {
          <div class="folder-list">
            @for (folder of folders; track folder.name) {
              <div 
                class="folder-item nav-link" 
                [class.active]="selectedFolder?.name === folder.name"
                [class.drag-over]="isDragOver && dragOverFolder?.name === folder.name"
                (click)="selectFolder(folder)"
                (dragover)="onDragOver($event, folder)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event, folder)">
                <div class="folder-info">
                  <cds-icon [shape]="getFolderIcon(folder)"></cds-icon>
                  <span class="folder-name">{{ folder.name }} <sub><span class="total-count">{{ folder.total }}</span></sub></span>
                  
                </div>
                <div class="folder-actions">
                  <div class="folder-counts">
                    @if (folder.unread > 0) {
                      <span class="badge badge-purple">
                          {{ folder.unread }}
                          <span class="clr-sr-only">items in a blue badge</span>
                      </span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </clr-card-content>
    </clr-card>
  `,
  styles: [`
    clr-card {
      margin: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--clr-color-neutral-300);
    }

    clr-card-header {
      padding: 0.5em;
      border-bottom: 1px solid var(--clr-color-neutral-300);
      margin-bottom: 0.5em;
    }

    clr-card-content {
      flex: 1;
      overflow: hidden;
      padding: 0;
    }

    .compose-section {
      padding: 0.2rem 0.5rem 0.6rem 0.5rem;
      border-bottom: 1px solid var(--clr-color-neutral-300);
    }

    .compose-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin: 0;
      font-weight: 600;
      background-color: var(--clr-color-action-600);
      border-color: var(--clr-color-action-600);
    }

    .compose-btn:hover {
      background-color: var(--clr-color-action-700);
      border-color: var(--clr-color-action-700);
    }

    .compose-btn .material-symbols-outlined {
      font-size: 18px;
    }

    clr-card-title {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      width: 100% !important;
      margin-left: 10px;
    }

    .refresh-btn-header {
      margin-left: auto;
      padding: 0.25rem;
    }

    .loading-center {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }

    .folder-panel {
      width: 100%;
      height: 100%;
    }

    .folder-list {
      overflow-y: auto;
      overflow-x: hidden;
      max-height: calc(100vh - 200px);
    }

    .folder-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
      border-left: 3px solid transparent;
    }

    .folder-item:hover {
      background-color: var(--clr-color-neutral-100);
    }

    .folder-item.active {
      background-color: var(--clr-color-action-50);
      border-left: 3px solid var(--clr-color-action-600);
    }

    .folder-item.drag-over {
      background-color: var(--clr-color-success-50);
      border-left: 3px solid var(--clr-color-success-600);
      transform: scale(1.02);
      transition: all 0.2s ease;
    }

    .folder-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .folder-name {
      font-weight: 500;
      color: var(--clr-color-neutral-800);
    }

    .folder-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .folder-counts {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }


    .total-count {
      display: inline-block;
      color: var(--clr-color-neutral-600);
      font-size: 0.6rem;
    }

    @media (max-width: 1200px) {
      .folder-panel {
        width: 100%;
      }
    }

    @media (max-width: 768px) {
      .folder-panel {
        width: 100%;
        height: 250px;
      }
    }
  `]
})
export class EmailFoldersComponent implements OnInit {
  @Input() selectedFolder: FolderDto | null = null;
  @Output() folderSelected = new EventEmitter<FolderDto>();
  @Output() folderTrashLoaded = new EventEmitter<FolderDto>();
  @Output() errorOccurred = new EventEmitter<string>();
  @Output() messageMovedToFolder = new EventEmitter<{messageId: number, sourceFolder: string, targetFolder: string, wasUnread: boolean}>();
  @Output() composeRequested = new EventEmitter<void>();

  folders: FolderDto[] = [];
  loadingFolders = false;

  // Drag & Drop properties
  isDragOver = false;
  dragOverFolder: FolderDto | null = null;

  constructor(private backendService: BackendService) { }

  ngOnInit(): void {
    this.loadFolders();
  }

  loadFolders(): void {
    this.loadingFolders = true;
    this.backendService.getImapFolders().subscribe({
      next: (folders) => {
        this.folders = this.sortFolders(folders);
        this.loadingFolders = false;
        this.folderTrashLoaded.emit(this.folders.find(f => f.isTrash));
        
        // Auto-select INBOX if available and no folder is currently selected
        if (!this.selectedFolder) {
          const inbox = this.folders.find(f => f.isInbox);
          if (inbox) {
            this.selectFolder(inbox);
          }
        }
      },
      error: (err) => {
        this.loadingFolders = false;
        this.errorOccurred.emit('Failed to load folders: ' + err.message);
      }
    });
  }

  private sortFolders(folders: FolderDto[]): FolderDto[] {
    return folders.sort((a, b) => {
      const priA = a.getPriority();
      const priB = b.getPriority();
      if (priA !== priB) {
        return priA - priB;
      }
      return a.name.localeCompare(b.name);
    });
  }

  selectFolder(folder: FolderDto): void {
    this.selectedFolder = folder;
    this.folderSelected.emit(folder);
  }

  getFolderIcon(folder: FolderDto): string {
    if (folder.isInbox) return 'inbox';
    if (folder.isSent) return 'export';
    if (folder.isDraft) return 'note';
    if (folder.isTrash) return 'trash';
    if (folder.isJunk) return 'ban';
    return 'folder';
  }

  composeEmail(): void {
    this.composeRequested.emit();
  }

  updateFolderCounts(): void {
    this.backendService.getImapFolders().subscribe({
      next: (folders) => {
        this.folders = this.sortFolders(folders);
      }
    });
  }

  isDraftFolderSelected(): boolean {
    return this.selectedFolder?.isDraft || false;
  }

  // Drag & Drop Methods
  onDragOver(event: DragEvent, folder: FolderDto): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    
    this.isDragOver = true;
    this.dragOverFolder = folder;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Check if we're really leaving the folder (not just moving to a child element)
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.isDragOver = false;
      this.dragOverFolder = null;
    }
  }

  onDrop(event: DragEvent, targetFolder: FolderDto): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isDragOver = false;
    this.dragOverFolder = null;
    
    try {
      const dragData = event.dataTransfer?.getData('text/plain');
      if (dragData) {
        const data = JSON.parse(dragData);
        const { messageId, sourceFolder, messageSubject, wasUnread } = data;
        
        // Don't allow dropping on the same folder
        if (sourceFolder === targetFolder.name) {
          return;
        }
        
        // Emit event to parent component to handle the actual move
        this.messageMovedToFolder.emit({
          messageId: messageId,
          sourceFolder: sourceFolder,
          targetFolder: targetFolder.name,
          wasUnread: wasUnread || false
        });
      }
    } catch (error) {
      console.error('Error parsing drag data:', error);
      this.errorOccurred.emit('Failed to process dropped email');
    }
  }
}