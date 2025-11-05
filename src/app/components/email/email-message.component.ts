import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClarityModule } from '@clr/angular';
import { FolderDto } from 'src/app/dtos/folder-dto';
import { MessageDto } from 'src/app/dtos/message-dto';
import { BackendService } from 'src/app/services/backend.service';
import { FileUtilsService } from '../../services/file-utils.service';
import { EmailMessageContentComponent } from "./email-message-content.component";

@Component({
  selector: 'app-email-message',
  imports: [
    CommonModule, 
    ClarityModule, 
    EmailMessageContentComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (!loadImages && hasExternalImages) {
      <div #imageAlert>
        <clr-alert [clrAlertAppLevel]="true" clrAlertType="warning">
          <clr-alert-item>
            <span class="alert-text">External images are blocked. Click here to load them.</span>
            <div class="alert-actions">
              <button class="btn alert-action" (click)="loadImages = true">Load Images</button>
            </div>
          </clr-alert-item>
        </clr-alert>
      </div>
    }
    @if (!selectedMessage) {
      <div class="flex justify-center items-center flex-1 flex-col text-[var(--clr-color-neutral-600)] text-center h-full">
        <cds-icon shape="envelope" size="48"></cds-icon>
        <p class="mt-4 text-[var(--clr-color-neutral-600)] italic">Select a message to view details</p>
      </div>
    } @else {
      @if (loadingMessageDetails) {
        <div class="flex justify-center items-center h-[200px]">
          <clr-spinner clrSmall>Loading message details...</clr-spinner>
        </div>
      } @else if (messageDetails) {
        <div class="flex-shrink-0 p-4" #headerSection>
            <div class="flex items-center gap-3 mb-3">
              <h4 class="!m-0 text-base font-semibold text-[var(--clr-color-neutral-700)] flex-1">{{ messageDetails.subject || '(No Subject)' }}</h4>
              <button 
                class="w-3 h-3 !rounded-full border-2 border-[#6b46c1] bg-transparent cursor-pointer transition-all duration-200 ease-out p-0 m-0 flex-shrink-0 hover:scale-110 hover:shadow-[0_2px_4px_rgba(107,70,193,0.3)] active:scale-95" 
                [class.bg-[#6b46c1]]="!messageDetails.isSeen"
                [class.bg-transparent]="messageDetails.isSeen"
                [class.hover:bg-[rgba(107,70,193,0.1)]]="messageDetails.isSeen"
                (click)="toggleReadStatus()"
                [title]="messageDetails.isSeen ? 'Mark as unread' : 'Mark as read'"
              >
              </button>
            </div>
            <div class="flex flex-wrap gap-4 items-start">
              <div class="grid gap-0.5 flex-1 min-w-[250px]">
                <div class="grid grid-cols-[auto_1fr] gap-2 items-baseline">
                    <label class="font-semibold text-[var(--clr-color-neutral-700)] min-w-[4rem]">From:</label>
                    <span class="text-[var(--clr-color-neutral-800)] break-words">{{ (messageDetails.from.name || messageDetails.from.email) + ' <' + messageDetails.from.email + '>' }}</span>
                </div>
                <div class="grid grid-cols-[auto_1fr] gap-2 items-baseline">
                    <label class="font-semibold text-[var(--clr-color-neutral-700)] min-w-[4rem]">To:</label>
                    <span class="text-[var(--clr-color-neutral-800)] break-words">{{ getToDisplayText() }}</span>
                </div>
                @if (messageDetails.cc && messageDetails.cc.length > 0) {
                    <div class="grid grid-cols-[auto_1fr] gap-2 items-baseline">
                    <label class="font-semibold text-[var(--clr-color-neutral-700)] min-w-[4rem]">CC:</label>
                    <span class="text-[var(--clr-color-neutral-800)] break-words">{{ getCcDisplayText() }}</span>
                    </div>
                }
                <div class="grid grid-cols-[auto_1fr] gap-2 items-baseline">
                    <label class="font-semibold text-[var(--clr-color-neutral-700)] min-w-[4rem]">Date:</label>
                    <span class="text-[var(--clr-color-neutral-800)] break-words">{{ formatFullDate(messageDetails.date) }}</span>
                </div>
              </div>

              <!-- Email Action Buttons -->
              <div class="flex-shrink-0 min-w-fit self-start">
                <clr-button-group class="flex gap-0">
                  @if (messageDetails.isDraft) {
                    <clr-button 
                      class="btn btn-sm btn-primary flex items-center justify-center p-1.5 min-w-[32px] h-8 text-xs rounded-none first:rounded-l last:rounded-r [&+clr-button]:border-l-0"
                      (click)="editDraft()"
                      title="Edit Draft"
                    >
                      <span class="material-symbols-outlined">edit</span>
                      Edit Draft
                    </clr-button>
                  }
                  @if (!messageDetails.isDraft) {
                    <clr-button 
                      class="btn btn-sm btn-outline flex items-center justify-center p-1.5 min-w-[32px] h-8 text-xs rounded-none first:rounded-l last:rounded-r [&+clr-button]:border-l-0"
                      (click)="replyToEmail()"
                      title="Reply"
                    >
                      <span class="material-symbols-outlined">reply</span>
                    </clr-button>
                    <clr-button 
                      class="btn btn-sm btn-outline flex items-center justify-center p-1.5 min-w-[32px] h-8 text-xs rounded-none first:rounded-l last:rounded-r [&+clr-button]:border-l-0"
                      (click)="replyAllToEmail()"
                      title="Reply All"
                    >
                      <span class="material-symbols-outlined">reply_all</span>
                    </clr-button>
                    <clr-button 
                      class="btn btn-sm btn-outline flex items-center justify-center p-1.5 min-w-[32px] h-8 text-xs rounded-none first:rounded-l last:rounded-r [&+clr-button]:border-l-0"
                      (click)="forwardEmail()"
                      title="Forward"
                    >
                      <span class="material-symbols-outlined">forward</span>
                    </clr-button>
                  }
                  <clr-button 
                    class="btn btn-sm btn-danger-outline flex items-center justify-center p-1.5 min-w-[32px] h-8 text-xs rounded-none first:rounded-l last:rounded-r [&+clr-button]:border-l-0"
                    (click)="deleteEmail()"
                    title="Delete"
                  >
                    <span class="material-symbols-outlined text-[var(--clr-color-danger-700)]">delete</span>
                  </clr-button>
                </clr-button-group>
              </div>
            </div>
            
            @if (messageDetails.attachments && messageDetails.attachments.length > 0) {
              <div class="mt-4 pt-3 border-t border-[var(--clr-color-neutral-300)]">
                <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
                  @for (attachment of messageDetails.attachments; track attachment.name; let i = $index) {
                    <div class="flex items-center p-2 bg-[var(--clr-color-neutral-100)] rounded border border-transparent transition-all duration-200 ease-out gap-2 cursor-pointer hover:bg-[var(--clr-color-neutral-200)] hover:border-[var(--clr-color-action-400)] hover:translate-y-[-1px] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)] active:translate-y-0 active:shadow-[0_1px_2px_rgba(0,0,0,0.1)]" 
                          (click)="viewAttachment(i)"
                          [title]="'Click to view ' + attachment.name">
                      <cds-icon shape="paperclip" class="text-[var(--clr-color-action-600)] flex-shrink-0"></cds-icon>
                      <div class="flex-1 min-w-0">
                        <span class="block font-medium text-[var(--clr-color-neutral-800)] truncate">{{ attachment.name }}</span>
                        <span class="block text-xs text-[var(--clr-color-neutral-600)]">{{ fileUtils.formatFileSize(attachment.size) }}</span>
                      </div>
                      <cds-icon shape="eye" class="text-[var(--clr-color-action-600)] flex-shrink-0 opacity-70 transition-opacity duration-200 ease-out group-hover:opacity-100"></cds-icon>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

        @if (messageDetails.bodyHtml || messageDetails.bodyText) {
          <app-email-message-content 
            [message]="messageDetails" 
            [folder]="selectedFolder?.name || ''" 
            [(loadImages)]="loadImages"
            [headerAreaHeightInPx]="headerAreaHeightInPx()">
          </app-email-message-content>
        } @else {
          <div class="flex justify-center items-center flex-1 flex-col text-[var(--clr-color-neutral-600)] text-center h-full">
            <cds-icon shape="warning-standard" size="36"></cds-icon>
            <p class="mt-4 text-[var(--clr-color-neutral-600)] italic">No content available</p>
          </div>
        }
      } @else {
        <div class="flex justify-center items-center flex-1 flex-col text-[var(--clr-color-neutral-600)] text-center h-full">
          <cds-icon shape="warning-standard" size="36"></cds-icon>
          <p class="mt-4 text-[var(--clr-color-neutral-600)] italic">Failed to load message details</p>
        </div>
      }
    }
  `
})
export class EmailMessageComponent implements OnChanges, AfterViewChecked {
  @Input() selectedMessage: MessageDto | null = null;
  @Input() selectedFolder: FolderDto | null = null;
  @Input() trashFolder: FolderDto | null = null;
  @Output() errorOccurred = new EventEmitter<string>();
  @Output() messageDetailsLoaded = new EventEmitter<MessageDto>();
  @Output() messageStatusChanged = new EventEmitter<{messageId: number, seen: boolean}>();
  @Output() messageDeleted = new EventEmitter<{messageId: number, sourceFolder: string, targetFolder: string, wasUnread: boolean}>();
  @Output() messageDeleteFailed = new EventEmitter<{messageId: number, sourceFolder: string, error: string}>();
  @Output() replyRequested = new EventEmitter<MessageDto>();
  @Output() replyAllRequested = new EventEmitter<MessageDto>();
  @Output() forwardRequested = new EventEmitter<MessageDto>();
  @Output() editDraftRequested = new EventEmitter<MessageDto>();

  loadingMessageDetails = false;
  messageDetails: MessageDto | null = null;
  loadImages = false;
  hasExternalImages = false;

  headerAreaHeightInPx = signal(0);

  @ViewChild('headerSection', { static: false }) headerSection!: ElementRef;
  @ViewChild('imageAlert', { static: false }) imageAlert!: ElementRef;

  constructor(
    private backendService: BackendService,
    protected readonly fileUtils: FileUtilsService
  ) {}

  // Watch for changes in selectedMessage to automatically load details
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedMessage']) {
      if (changes['selectedMessage'].currentValue) {
        // Only load details if it's actually a different message
        const newMessage = changes['selectedMessage'].currentValue;
        if (!this.messageDetails || this.messageDetails.id !== newMessage.id) {
          this.loadImages = false;
          this.loadMessageDetails();
        }
      } else {
        // Reset loading state and details if message is cleared
        this.loadingMessageDetails = false;
        this.messageDetails = null;
      }
    }
    if (changes['loadImages']) {
      // Update header height when loadImages changes, as it affects the imageAlert visibility
      this.updateHeaderHeight();
    }
  }

  ngAfterViewChecked() {
    this.updateHeaderHeight();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.updateHeaderHeight();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if ((event.metaKey && event.key === 'Backspace') || event.key === 'Delete') {
      this.deleteEmail();
    }
  }

  private updateHeaderHeight() {
    let height = 0;
    if (this.headerSection) {
      height += this.headerSection.nativeElement.offsetHeight;
    }
    if (this.imageAlert) {
      height += this.imageAlert.nativeElement.offsetHeight;
    }
    this.headerAreaHeightInPx.set(height);
  }

  loadMessageDetails(): void {
    if (this.selectedFolder && this.selectedMessage) {
      this.loadingMessageDetails = true;
      
      this.backendService.getImapMessage(this.selectedFolder.name, this.selectedMessage.id).subscribe({
        next: (fullMessage) => {
          this.messageDetails = fullMessage;
          this.hasExternalImages = this.checkForExternalImages(fullMessage);
          this.loadingMessageDetails = false;
          this.messageDetailsLoaded.emit(fullMessage);
        },
        error: (err) => {
          this.loadingMessageDetails = false;
          this.errorOccurred.emit('Failed to load message details: ' + err.message);
        }
      });
    } else {
      // Reset loading state if no folder or message is selected
      this.loadingMessageDetails = false;
    }
  }

  formatFullDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  getToDisplayText(): string {
    if (!this.messageDetails || !this.messageDetails.to) return '';
    return this.messageDetails.to.map(addr =>
      `${addr.name || addr.email} <${addr.email}>`
    ).join(', ');
  }

  getCcDisplayText(): string {
    if (!this.messageDetails || !this.messageDetails.cc) return '';
    return this.messageDetails.cc.map(addr =>
      `${addr.name || addr.email} <${addr.email}>`
    ).join(', ');
  }

  toggleReadStatus(): void {
    if (!this.messageDetails || !this.selectedFolder) {
      return;
    }

    const newSeenStatus = !this.messageDetails.isSeen;

    this.backendService.markEmail(this.messageDetails.id, this.selectedFolder.name, newSeenStatus).subscribe({
      next: (response) => {
        if (this.messageDetails) {
          // Update local message state for immediate UI feedback
          this.messageDetails.isSeen = newSeenStatus;

          // Also update the original selectedMessage if it exists
          if (this.selectedMessage) {
            this.selectedMessage.isSeen = newSeenStatus;
          }

          // Emit status change event for parent components to update their state
          this.messageStatusChanged.emit({
            messageId: this.messageDetails.id,
            seen: newSeenStatus
          });
        }
      },
      error: (err) => {
        this.errorOccurred.emit('Failed to update message status: ' + err.message);
      }
    });
  }

  // Email action methods
  replyToEmail(): void {
    if (this.messageDetails) {
      this.replyRequested.emit(this.messageDetails);
    }
  }

  replyAllToEmail(): void {
    if (this.messageDetails) {
      this.replyAllRequested.emit(this.messageDetails);
    }
  }

  forwardEmail(): void {
    if (this.messageDetails) {
      this.forwardRequested.emit(this.messageDetails);
    }
  }

  editDraft(): void {
    if (this.messageDetails) {
      this.editDraftRequested.emit(this.messageDetails);
    }
  }

  deleteEmail(): void {
    if (!this.messageDetails || !this.selectedFolder) {
      this.errorOccurred.emit('Cannot delete email: no message or folder selected');
      return;
    }

    // Don't move if already in trash folder
    if (this.selectedFolder === this.trashFolder) {
      this.errorOccurred.emit('Email is already in trash folder.');
      return;
    }

    // Store message details for potential rollback
    const messageId = this.messageDetails!.id;
    const sourceFolder = this.selectedFolder!.name;
    const wasUnread = !this.messageDetails!.isSeen;

    // Immediately emit deletion event for optimistic UI update
    this.messageDeleted.emit({
      messageId: messageId,
      sourceFolder: sourceFolder,
      targetFolder: this.trashFolder!.name,
      wasUnread: wasUnread
    });

    // Move email to trash folder in background
    this.backendService.moveEmail(
      messageId,
      sourceFolder,
      this.trashFolder!.name
    ).subscribe({
      next: (response) => {
        // Success - no additional action needed, UI already updated
        console.log('Email successfully moved to trash');
      },
      error: (err) => {
        // Failed - emit error event
        this.messageDeleteFailed.emit({
          messageId: messageId,
          sourceFolder: sourceFolder,
          error: 'Failed to delete email: ' + (err.message || 'Unknown error')
        });
      }
    });
  
  }

  viewAttachment(attachmentIndex: number): void {
    if (!this.messageDetails || !this.selectedFolder) {
      this.errorOccurred.emit('Cannot view attachment: no message or folder selected');
      return;
    }

    try {
      if (this.messageDetails.attachments && this.messageDetails.attachments[attachmentIndex]) {
        this.backendService.viewAttachment(
          this.selectedFolder.name,
          this.messageDetails.id,
          this.messageDetails.attachments[attachmentIndex].name
        );
      } else {
        this.errorOccurred.emit('Attachment not found');
      }
    } catch (error) {
      this.errorOccurred.emit('Failed to view attachment: ' + error);
    }
  }

  private checkForExternalImages(message: MessageDto): boolean {
    if (!message.bodyHtml) {
      return false;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.bodyHtml, 'text/html');
    const imgs = doc.querySelectorAll('img');
    let hasExternal = false;
    imgs.forEach((img: HTMLImageElement) => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('cid:')) {
        hasExternal = true;
      }
    });
    return hasExternal;
  }
}