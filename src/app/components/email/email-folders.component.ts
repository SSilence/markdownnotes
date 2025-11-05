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
    <div class="w-full h-full flex flex-col border-r border-gray-300">
      <clr-card-header class="p-2 border-b border-gray-300">
        <clr-card-title class="flex justify-between items-center w-full">
          <span class="text-sm">Folders</span>
          <button 
            class="p-1.5 border-0 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 rounded"
            (click)="loadFolders()" 
            [disabled]="loadingFolders">
            <cds-icon shape="refresh"></cds-icon>
          </button>
        </clr-card-title>
      </clr-card-header>
      
      <div class="flex-1 overflow-hidden flex flex-col">
        <div class="px-2 py-2 border-b border-gray-300">
          <button 
            class="btn btn-primary w-full flex items-center justify-center gap-2"
            (click)="composeEmail()"
            title="Compose new email">
            <cds-icon shape="envelope"></cds-icon>
            Compose
          </button>
        </div>
        @if (loadingFolders) {
          <div class="flex justify-center items-center flex-1 mt-4">
            <clr-spinner clrSmall>Loading folders...</clr-spinner>
          </div>
        } @else {
          <div class="flex-1 overflow-y-auto overflow-x-hidden">
            @for (folder of folders; track folder.name) {
              <div 
                class="flex justify-between items-center px-4 py-3 cursor-pointer transition-colors border-l-4"
                [class.bg-blue-50]="selectedFolder?.name === folder.name"
                [class.border-blue-600]="selectedFolder?.name === folder.name"
                [class.border-transparent]="selectedFolder?.name !== folder.name"
                [class.hover:bg-gray-100]="selectedFolder?.name !== folder.name"
                [class.bg-green-50]="isDragOver && dragOverFolder?.name === folder.name"
                [class.border-green-600]="isDragOver && dragOverFolder?.name === folder.name"
                (click)="selectFolder(folder)"
                (dragover)="onDragOver($event, folder)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event, folder)">
                <div class="flex items-center gap-2">
                  <cds-icon [shape]="getFolderIcon(folder)"></cds-icon>
                  <span class="font-medium text-gray-800">{{ folder.name }} <sub class="text-xs text-gray-400 font-normal">{{ folder.total }}</sub></span>
                </div>
                <div class="flex items-center gap-1">
                  @if (folder.unread > 0) {
                    <span class="inline-flex items-center justify-center w-4 h-4 text-[0.65em] font-semibold text-white bg-purple-600 rounded-full">
                        {{ folder.unread }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
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