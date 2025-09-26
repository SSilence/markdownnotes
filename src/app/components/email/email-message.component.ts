import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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
      <clr-alert [clrAlertAppLevel]="true" clrAlertType="warning">
        <clr-alert-item>
          <span class="alert-text">External images are blocked. Click here to load them.</span>
          <div class="alert-actions">
            <button class="btn alert-action" (click)="loadImages = true">Load Images</button>
          </div>
        </clr-alert-item>
      </clr-alert>
    }
    <clr-card class="detail-panel">
      <clr-card-content class="detail-content">
        @if (!selectedMessage) {
          <div class="empty-state">
            <cds-icon shape="envelope" size="48"></cds-icon>
            <p class="empty-text">Select a message to view details</p>
          </div>
        } @else {
          @if (loadingMessageDetails) {
            <div class="loading-center">
              <clr-spinner clrSmall>Loading message details...</clr-spinner>
            </div>
          } @else if (messageDetails) {
            <div class="message-header-section">
                <div class="subject-line-container">
                  <h4 class="info-title">{{ messageDetails.subject || '(No Subject)' }}</h4>
                  <button 
                    class="read-status-button" 
                    (click)="toggleReadStatus()"
                    [class.unread]="!messageDetails.isSeen"
                    [class.read]="messageDetails.isSeen"
                    [title]="messageDetails.isSeen ? 'Mark as unread' : 'Mark as read'"
                  >
                  </button>
                </div>
                <div class="message-meta-container">
                  <div class="message-meta-grid">
                    <div class="meta-item">
                        <label class="meta-label">From:</label>
                        <span class="meta-value">{{ (messageDetails.from.name || messageDetails.from.email) + ' <' + messageDetails.from.email + '>' }}</span>
                    </div>
                    <div class="meta-item">
                        <label class="meta-label">To:</label>
                        <span class="meta-value">{{ getToDisplayText() }}</span>
                    </div>
                    @if (messageDetails.cc && messageDetails.cc.length > 0) {
                        <div class="meta-item">
                        <label class="meta-label">CC:</label>
                        <span class="meta-value">{{ getCcDisplayText() }}</span>
                        </div>
                    }
                    <div class="meta-item">
                        <label class="meta-label">Date:</label>
                        <span class="meta-value">{{ formatFullDate(messageDetails.date) }}</span>
                    </div>
                  </div>

                  <!-- Email Action Buttons -->
                  <div class="email-actions">
                    <clr-button-group>
                      @if (messageDetails.isDraft) {
                        <clr-button 
                          class="btn btn-sm btn-primary"
                          (click)="editDraft()"
                          title="Edit Draft"
                        >
                          <span class="material-symbols-outlined">edit</span>
                          Edit Draft
                        </clr-button>
                      }
                      @if (!messageDetails.isDraft) {
                        <clr-button 
                          class="btn btn-sm btn-outline"
                          (click)="replyToEmail()"
                          title="Reply"
                        >
                          <span class="material-symbols-outlined">reply</span>
                        </clr-button>
                        <clr-button 
                          class="btn btn-sm btn-outline"
                          (click)="replyAllToEmail()"
                          title="Reply All"
                        >
                          <span class="material-symbols-outlined">reply_all</span>
                        </clr-button>
                        <clr-button 
                          class="btn btn-sm btn-outline"
                          (click)="forwardEmail()"
                          title="Forward"
                        >
                          <span class="material-symbols-outlined">forward</span>
                        </clr-button>
                      }
                      <clr-button 
                        class="btn btn-sm btn-danger-outline"
                        (click)="deleteEmail()"
                        title="Delete"
                      >
                        <span class="material-symbols-outlined btn-danger">delete</span>
                      </clr-button>
                    </clr-button-group>
                  </div>
                </div>
               
                @if (messageDetails.attachments && messageDetails.attachments.length > 0) {
                  <div class="attachments-section">
                    <div class="attachment-grid">
                      @for (attachment of messageDetails.attachments; track attachment.name; let i = $index) {
                        <div class="attachment-card clickable" 
                             (click)="viewAttachment(i)"
                             [title]="'Click to view ' + attachment.name">
                          <cds-icon shape="paperclip" class="attachment-icon"></cds-icon>
                          <div class="attachment-info">
                            <span class="attachment-name">{{ attachment.name }}</span>
                            <span class="attachment-size">{{ fileUtils.formatFileSize(attachment.size) }}</span>
                          </div>
                          <cds-icon shape="eye" class="view-icon"></cds-icon>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

            <div class="message-body-container">
              @if (messageDetails.bodyHtml || messageDetails.bodyText) {
                <app-email-message-content [message]="messageDetails" [folder]="selectedFolder?.name || ''" [(loadImages)]="loadImages"></app-email-message-content>
              } @else {
                <div class="empty-state">
                  <cds-icon shape="warning-standard" size="36"></cds-icon>
                  <p class="empty-text">No content available</p>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              <cds-icon shape="warning-standard" size="36"></cds-icon>
              <p class="empty-text">Failed to load message details</p>
            </div>
          }
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
    }

    clr-card-content {
      flex: 1;
      padding: 0;
    }

    .loading-center {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }

    .empty-state {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
      flex-direction: column;
      color: var(--clr-color-neutral-600);
      text-align: center;
      height: 100%;
    }

    .empty-text {
      margin-top: 1rem;
      color: var(--clr-color-neutral-600);
      font-style: italic;
    }

    .detail-panel {
      flex: 1;
    }

    .detail-content {
      overflow-y: auto;
      box-sizing: border-box;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .message-header-section {
      margin-bottom: 1rem;
      flex-shrink: 0;
      padding: 1rem 1rem 0 1rem;
    }

    .message-body-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 0 1rem 1rem 1rem;
    }

    /* Email Action Buttons */
    .email-actions {
      flex-shrink: 0;
      min-width: fit-content;
      align-self: flex-start;
    }

    .email-actions clr-button-group {
      display: flex;
      gap: 0;
    }

    .email-actions clr-button {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.375rem;
      min-width: 32px;
      height: 32px;
      font-size: 0.75rem;
      border-radius: 0;
    }

    .email-actions clr-button:first-child {
      border-top-left-radius: var(--clr-border-radius);
      border-bottom-left-radius: var(--clr-border-radius);
    }

    .email-actions clr-button:last-child {
      border-top-right-radius: var(--clr-border-radius);
      border-bottom-right-radius: var(--clr-border-radius);
    }

    .email-actions clr-button + clr-button {
      border-left: none;
    }

    .email-actions .btn-danger {
      color: var(--clr-color-danger-700);
      border-color: var(--clr-color-danger-300);
    }

    .email-actions .btn-danger:hover {
      background-color: var(--clr-color-danger-50);
      border-color: var(--clr-color-danger-400);
    }

    /* Attachment responsiveness for very small screens */
    @media (max-width: 480px) {
      .attachment-grid {
        grid-template-columns: 1fr;
      }
      
      .attachment-card {
        min-width: 0;
      }
    }

    .info-title {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--clr-color-neutral-700);
    }

    .attachments-section {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--clr-color-neutral-300);
    }

    .attachments-title {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--clr-color-neutral-700);
    }

    .message-meta-container {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-start;
    }

    .message-meta-grid {
      display: grid;
      gap: 0.1rem;
      flex: 1;
      min-width: 250px; /* Minimum width before wrapping */
    }

    .meta-item {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.5rem;
      align-items: baseline;
    }

    .meta-label {
      font-weight: 600;
      color: var(--clr-color-neutral-700);
      min-width: 4rem;
    }

    .meta-value {
      color: var(--clr-color-neutral-800);
      word-break: break-word;
    }

    .attachment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 0.5rem;
    }

    .attachment-card {
      display: flex;
      align-items: center;
      padding: 0.5rem;
      background-color: var(--clr-color-neutral-100);
      border-radius: var(--clr-border-radius);
      gap: 0.5rem;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }

    .attachment-card.clickable {
      cursor: pointer;
    }

    .attachment-card.clickable:hover {
      background-color: var(--clr-color-neutral-200);
      border-color: var(--clr-color-action-400);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .attachment-card.clickable:active {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .attachment-icon {
      color: var(--clr-color-action-600);
      flex-shrink: 0;
    }

    .attachment-info {
      flex: 1;
    }

    .attachment-name {
      display: block;
      font-weight: 500;
      color: var(--clr-color-neutral-800);
    }

    .attachment-size {
      display: block;
      font-size: 0.75rem;
      color: var(--clr-color-neutral-600);
    }

    .view-icon {
      color: var(--clr-color-action-600);
      flex-shrink: 0;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }

    .attachment-card:hover .view-icon {
      opacity: 1;
    }

    /* Subject line container with read/unread button */
    .subject-line-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .subject-line-container .info-title {
      margin: 0;
      flex: 1;
    }

    /* Purple circle read/unread button */
    .read-status-button {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid #6b46c1;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s ease;
      padding: 0;
      margin: 0;
      position: relative;
      flex-shrink: 0;
    }

    .read-status-button:hover {
      transform: scale(1.1);
      box-shadow: 0 2px 4px rgba(107, 70, 193, 0.3);
    }

    .read-status-button:active {
      transform: scale(0.95);
    }

    /* Filled purple circle for unread messages */
    .read-status-button.unread {
      background-color: #6b46c1;
    }

    /* Empty purple circle for read messages */
    .read-status-button.read {
      background-color: transparent;
    }

    /* Add a subtle inner shadow for the read state */
    .read-status-button.read:hover {
      background-color: rgba(107, 70, 193, 0.1);
    }

    @media (max-width: 768px) {
      .detail-panel {
        flex: 1;
        min-height: 300px;
      }
    }
  `]
})
export class EmailMessageComponent implements OnChanges {
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