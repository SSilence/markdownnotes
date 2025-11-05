import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClarityModule } from '@clr/angular';
import { FolderDto } from 'src/app/dtos/folder-dto';
import { MessageDto } from 'src/app/dtos/message-dto';
import { BackendService } from 'src/app/services/backend.service';
import { FormatDateAgoPipe } from 'src/app/pipes/format-date-ago.pipe';

@Component({
  selector: 'app-email-messages',
  imports: [CommonModule, ClarityModule, FormatDateAgoPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="w-full h-full flex flex-col bg-[var(--clr-global-app-background)]">
      <clr-card-header class="p-2 border-b border-[var(--clr-color-neutral-300)]">
        <clr-card-title class="flex justify-between items-center w-full ml-2.5">
          <span>
              @if (selectedFolder) {
                {{ selectedFolder.name }}
              } @else {
                Messages
              }
          </span>
          <div class="flex gap-2 items-center pr-3">
            @if (loadingMessages) {
              <clr-spinner clrSmall>Loading messages...</clr-spinner>
            }
            @if (selectedFolder) {
              <button
                class="cursor-pointer p-1.5 border-0 hover:bg-[var(--clr-color-neutral-100)] disabled:cursor-not-allowed disabled:opacity-70 rounded"
                (click)="markAllAsSeen()"
                [disabled]="markingAllAsSeen"
                title="Mark all emails as read">
                @if (markingAllAsSeen) {
                  <clr-spinner clrInline clrSmall>Marking...</clr-spinner>
                } @else {
                  <cds-icon shape="eye"></cds-icon>
                }
              </button>
            }
            @if (selectedFolder && (selectedFolder.isJunk || selectedFolder.isTrash)) {
              <button
                class="cursor-pointer p-1.5 border-0 text-[var(--clr-color-danger-700)] hover:bg-[var(--clr-color-danger-100)] disabled:cursor-not-allowed disabled:opacity-70 rounded"
                (click)="purgeFolder($event)"
                [disabled]="purgingFolder"
                title="Purge all emails from this folder">
                @if (purgingFolder) {
                  <clr-spinner clrInline clrSmall>Purging...</clr-spinner>
                } @else {
                  <cds-icon shape="trash"></cds-icon>
                }
              </button>
            }
            <button
              class="cursor-pointer p-1.5 border-0 hover:bg-[var(--clr-color-neutral-100)] disabled:cursor-not-allowed disabled:opacity-70 rounded"
              (click)="resetAndLoadMessages()"
              [disabled]="loadingMessages || loadingMoreMessages || !selectedFolder">
              <cds-icon shape="refresh"></cds-icon>
            </button>
          </div>
        </clr-card-title>
      </clr-card-header>

      <div class="flex-1 overflow-hidden p-0">
        @if (!selectedFolder) {
          <div class="flex flex-col justify-center items-center h-[200px] text-[var(--clr-color-neutral-600)] text-center">
            <cds-icon shape="folder" size="48"></cds-icon>
            <p class="mt-4 text-[var(--clr-color-neutral-600)] italic">Select a folder to view messages</p>
          </div>
        } @else if (messages.length === 0) {
          <div class="flex flex-col justify-center items-center h-[200px] text-[var(--clr-color-neutral-600)] text-center">
            <cds-icon shape="inbox" size="48"></cds-icon>
            <p class="mt-4 text-[var(--clr-color-neutral-600)] italic">No messages in this folder</p>
          </div>
        } @else {
          <div class="overflow-y-auto max-h-[calc(100vh-110px)]" (scroll)="onScroll($event)">
            @for (message of messages; track message.id) {
              <div 
                class="cursor-pointer border-b border-[var(--clr-color-neutral-200)] border-l-[3px] border-l-transparent transition-colors duration-200 ease-out hover:bg-[var(--clr-color-neutral-50)]"
                [class.bg-[var(--clr-color-neutral-25)]]="!message.isSeen"
                [class.border-l-[var(--clr-color-warning-600)]]="!message.isSeen"
                [class.bg-[var(--clr-color-action-50)]]="selectedMessage?.id === message.id"
                [class.border-l-[var(--clr-color-action-600)]]="selectedMessage?.id === message.id"
                [class.opacity-50]="isDragging && draggedMessage?.id === message.id"
                [class.cursor-grabbing]="isDragging && draggedMessage?.id === message.id"
                draggable="true"
                (dragstart)="onDragStart($event, message)"
                (dragend)="onDragEnd($event)"
                (click)="selectMessage(message)">
                
                <div class="px-4 py-3">
                  <div class="flex justify-between items-center mb-1.5">
                    <div 
                      class="text-[0.58rem] font-light text-[var(--clr-color-neutral-800)] overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0"
                      [class.font-semibold]="!message.isSeen"
                      [title]="(message.from.name || message.from.email) + ' <' + message.from.email + '>'">
                      {{ (message.from.name || message.from.email) + ' <' + message.from.email + '>' }}
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <div class="flex items-center gap-1">
                        @if (message.isFlagged) {
                          <cds-icon shape="flag" class="text-warning"></cds-icon>
                        }
                        @if (message.attachments && message.attachments.length > 0) {
                          <cds-icon shape="paperclip" class="text-info"></cds-icon>
                        }
                      </div>
                      <span class="text-[0.6rem] text-[var(--clr-color-neutral-600)] whitespace-nowrap" [title]="formatFullDate(message.date)">
                        {{ message.date | formatDateAgo }}
                      </span>
                    </div>
                  </div>
                  
                  <div 
                    class="text-xs text-[var(--clr-color-neutral-800)] overflow-hidden text-ellipsis whitespace-nowrap"
                    [class.font-semibold]="!message.isSeen"
                    [title]="message.subject">
                    {{ message.subject || '(No Subject)' }}
                  </div>
                </div>
              </div>
            }
            
            @if (loadingMoreMessages) {
              <div class="flex justify-center items-center p-4 text-center bg-[var(--clr-color-neutral-25)]">
                <clr-spinner clrSmall>Loading more messages...</clr-spinner>
              </div>
            }
            
            @if (!hasMoreMessages && messages.length > 0) {
              <div class="flex justify-center items-center p-4 text-center text-[var(--clr-color-neutral-600)] italic">
                <p>No more messages available</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class EmailMessagesComponent implements OnChanges {
  @Input() selectedFolder: FolderDto | null = null;
  @Input() selectedMessage: MessageDto | null = null;
  @Output() messageSelected = new EventEmitter<MessageDto>();
  @Output() errorOccurred = new EventEmitter<string>();
  @Output() messageStatusChanged = new EventEmitter<{messageId: number, seen: boolean}>();
  @Output() folderPurged = new EventEmitter<string>();
  @Output() markedAllAsSeen = new EventEmitter<string>();

  messages: MessageDto[] = [];
  loadingMessages = false;
  loadingMoreMessages = false;
  currentOffset = 0;
  messagesPerPage = 30;
  hasMoreMessages = true;
  purgingFolder = false;
  markingAllAsSeen = false;

  // Drag & Drop properties
  isDragging = false;
  draggedMessage: MessageDto | null = null;

  constructor(private backendService: BackendService) { }

  // Watch for changes in selectedFolder to automatically load messages
  ngOnChanges(changes: SimpleChanges): void {
    // Only reload messages if the selectedFolder changed, not selectedMessage
    if (changes['selectedFolder'] && changes['selectedFolder'].currentValue) {
      this.resetAndLoadMessages();
    }
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    
    if (this.isNearBottom(element)) {
      this.loadMoreMessages();
    }
  }

  resetAndLoadMessages(): void {
    this.currentOffset = 0;
    this.hasMoreMessages = true;
    this.loadMessages();
  }

  refreshMessages(): void {
    this.resetAndLoadMessages();
  }

  loadMessages(folderName?: string): void {
    const folder = folderName || this.selectedFolder?.name;
    if (!folder || this.loadingMessages) return;

    this.loadingMessages = true;
    this.fetchMessages(folder, false);
  }

  loadMoreMessages(): void {
    if (!this.hasMoreMessages || this.loadingMessages || this.loadingMoreMessages || !this.selectedFolder) {
      return;
    }

    this.loadingMoreMessages = true;
    this.fetchMessages(this.selectedFolder.name, true);
  }

  private fetchMessages(folderName: string, isLoadMore: boolean): void {
    this.backendService.getImapMessages(folderName, this.messagesPerPage, this.currentOffset, 'DESC').subscribe({
      next: (messages) => {
        if (this.currentOffset === 0 && !isLoadMore) {
          // First load - replace messages
          this.messages = messages;
        } else {
          // Subsequent loads or load more - append messages
          this.messages = [...this.messages, ...messages];
        }

        // Check if we have more messages to load
        this.hasMoreMessages = messages.length === this.messagesPerPage;
        this.currentOffset += messages.length;

        if (isLoadMore) {
          this.loadingMoreMessages = false;
        } else {
          this.loadingMessages = false;
        }
      },
      error: (err) => {
        const errorMessage = isLoadMore ? 'Failed to load more messages: ' + err.message : 'Failed to load messages: ' + err.message;

        if (isLoadMore) {
          this.loadingMoreMessages = false;
        } else {
          this.loadingMessages = false;
        }

        this.errorOccurred.emit(errorMessage);
      }
    });
  }

  selectMessage(message: MessageDto): void {
    this.selectedMessage = message;

    if (!message.isSeen && this.selectedFolder) {
      this.backendService.markEmail(message.id, this.selectedFolder.name, true).subscribe({
        next: (response) => {
          message.isSeen = true;
          this.messageStatusChanged.emit({ messageId: message.id, seen: true });
          this.messageSelected.emit(message);
        },
        error: (err) => {
          this.errorOccurred.emit('Failed to mark email as read: ' + err.message);
          this.messageSelected.emit(message);
        }
      });
    } else {
      this.messageSelected.emit(message);
    }
  }

  formatFullDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  updateMessageStatus(messageId: number, seen: boolean): void {
    const message = this.messages.find(msg => msg.id === messageId);
    if (message) {
      message.isSeen = seen;
    }
  }

  removeMessageOptimistically(messageId: number): void {
    const messageIndex = this.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex > -1) {
      this.messages.splice(messageIndex, 1);
      // Update the count for pagination
      this.currentOffset = Math.max(0, this.currentOffset - 1);
    }
  }

  purgeFolder(event: Event): void {
    event.stopPropagation();

    if (!this.selectedFolder) return;

    // Show confirmation dialog
    const folderName = this.selectedFolder.name;
    const message = `Are you sure you want to permanently delete ALL ${this.selectedFolder.total} emails from the "${folderName}" folder? This action cannot be undone.`;

    if (!confirm(message)) {
      return;
    }

    this.purgingFolder = true;

    this.backendService.purgeFolder(folderName).subscribe({
      next: (response) => {
        // Clear the messages list
        this.messages = [];
        this.currentOffset = 0;
        this.hasMoreMessages = false;

        // Emit event to notify parent that folder was purged
        this.folderPurged.emit(folderName);

        this.purgingFolder = false;
      },
      error: (error) => {
        this.purgingFolder = false;
        this.errorOccurred.emit(`Failed to purge folder "${folderName}": ${error.message || error}`);
      }
    });
  }

  markAllAsSeen(): void {
    if (!this.selectedFolder || this.markingAllAsSeen) return;

    this.markingAllAsSeen = true;

    this.backendService.markAllAsSeen(this.selectedFolder.name).subscribe({
      next: () => {
        // Mark all messages as seen locally
        this.messages.forEach(message => message.isSeen = true);
        this.markingAllAsSeen = false;
        this.markedAllAsSeen.emit(this.selectedFolder!.name);
      },
      error: (err) => {
        this.markingAllAsSeen = false;
        this.errorOccurred.emit('Failed to mark all emails as read: ' + err.message);
      }
    });
  }


  // Drag & Drop Methods
  onDragStart(event: DragEvent, message: MessageDto): void {
    this.isDragging = true;
    this.draggedMessage = message;
    
    // Set drag data
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', JSON.stringify({
        messageId: message.id,
        sourceFolder: this.selectedFolder?.name || '',
        messageSubject: message.subject || '(No Subject)',
        wasUnread: !message.isSeen
      }));
    }
  }

  onDragEnd(event: DragEvent): void {
    this.isDragging = false;
    this.draggedMessage = null;
  }

  // Helper method to check if we're at the bottom of the scroll area
  private isNearBottom(element: HTMLElement, threshold: number = 100): boolean {
    return element.scrollTop + element.clientHeight >= element.scrollHeight - threshold;
  }
}