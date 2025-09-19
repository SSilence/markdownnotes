import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ClarityModule } from '@clr/angular';
import { FolderDto } from 'src/app/dtos/folder-dto';
import { MessageDto } from 'src/app/dtos/message-dto';
import { BackendService } from 'src/app/services/backend.service';
import { FileUtilsService } from '../../services/file-utils.service';

@Component({
  selector: 'app-email-message',
  imports: [CommonModule, ClarityModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
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
                    [class.unread]="!messageDetails.seen"
                    [class.read]="messageDetails.seen"
                    [title]="messageDetails.seen ? 'Mark as unread' : 'Mark as read'"
                  >
                  </button>
                </div>
                <div class="message-meta-container">
                  <div class="message-meta-grid">
                    <div class="meta-item">
                        <label class="meta-label">From:</label>
                        <span class="meta-value">{{ messageDetails.fromName + ' <' + messageDetails.from + '>' }}</span>
                    </div>
                    <div class="meta-item">
                        <label class="meta-label">To:</label>
                        <span class="meta-value">{{ messageDetails.toName + ' <' + messageDetails.to + '>' }}</span>
                    </div>
                    @if (messageDetails.cc) {
                        <div class="meta-item">
                        <label class="meta-label">CC:</label>
                        <span class="meta-value">{{ messageDetails.cc }}</span>
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
                      @if (messageDetails.draft) {
                        <clr-button 
                          class="btn btn-sm btn-primary"
                          (click)="editDraft()"
                          title="Edit Draft"
                        >
                          <span class="material-symbols-outlined">edit</span>
                          Edit Draft
                        </clr-button>
                      }
                      @if (!messageDetails.draft) {
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

            @if (messageDetails.bodyHtml || messageDetails.bodyText) {
              <div class="email-message-content" [innerHTML]="getSafeMessageContent(messageDetails)"></div>
            } @else {
              <div class="empty-state">
                <cds-icon shape="warning-standard" size="36"></cds-icon>
                <p class="empty-text">No content available</p>
              </div>
            }
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
      overflow: hidden;
      padding: 0;
    }

    .loading-center, .empty-state {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }

    .empty-state {
      flex-direction: column;
      color: var(--clr-color-neutral-600);
      text-align: center;
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
      padding: 1rem;
      overflow-y: auto;
      box-sizing: border-box;
      height: 100%;
    }

    .message-header-section {
      margin-bottom: 1rem;
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

    .email-message-content {
      line-height: 1.6;
      color: var(--clr-color-neutral-800);
      box-sizing: border-box;
      min-height: 200px;
      overflow-x: auto;
      word-wrap: break-word;
    }

    /* Email content wrapper styles */
    ::ng-deep .email-message-content .email-content-wrapper {
      max-width: 100%;
      overflow-x: auto;
    }

    /* Hide any remaining HTML/HEAD tags that might slip through */
    ::ng-deep .email-message-content html,
    ::ng-deep .email-message-content head,
    ::ng-deep .email-message-content meta,
    ::ng-deep .email-message-content title,
    ::ng-deep .email-message-content link {
      display: none !important;
    }

    /* Handle Outlook/Word specific elements */
    ::ng-deep .email-message-content o\\:p {
      display: none !important;
    }
    
    ::ng-deep .email-message-content [v\\:shape] {
      display: none !important;
    }

    /* Hide empty elements that commonly cause layout issues, but preserve spacing */
    ::ng-deep .email-message-content span:empty:not([style*="height"]):not([style*="margin"]):not([style*="padding"]),
    ::ng-deep .email-message-content td:empty:not([style*="height"]):not([style*="width"]),
    ::ng-deep .email-message-content th:empty:not([style*="height"]):not([style*="width"]) {
      display: none !important;
    }

    /* Don't hide empty divs and paragraphs as they might be used for spacing */
    ::ng-deep .email-message-content div:empty,
    ::ng-deep .email-message-content p:empty {
      /* Keep for spacing, ensure they render with appropriate height */
      min-height: 1rem;
      display: block;
    }

    /* Handle spacing elements with specific heights */
    ::ng-deep .email-message-content div[style*="height"],
    ::ng-deep .email-message-content div[style*="font-size"] {
      display: block !important;
    }

    /* Outlook spacer elements */
    ::ng-deep .email-message-content div[style*="mso-line-height-rule"] {
      display: block !important;
      line-height: normal;
    }

    /* Remove borders and padding from layout tables */
    ::ng-deep .email-message-content table[cellpadding="0"],
    ::ng-deep .email-message-content table[border="0"],
    ::ng-deep .email-message-content table[style*="border:0"],
    ::ng-deep .email-message-content table[style*="border: 0"] {
      border: none !important;
    }

    ::ng-deep .email-message-content table[cellpadding="0"] td,
    ::ng-deep .email-message-content table[border="0"] td,
    ::ng-deep .email-message-content table[style*="border:0"] td,
    ::ng-deep .email-message-content table[style*="border: 0"] td {
      border: none !important;
      padding: 0 !important;
    }

    /* Remove spacing from Outlook spacer tables */
    ::ng-deep .email-message-content table[role="presentation"],
    ::ng-deep .email-message-content table[style*="mso-"] {
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    ::ng-deep .email-message-content table[role="presentation"] td,
    ::ng-deep .email-message-content table[style*="mso-"] td {
      border: none !important;
      padding: 0 !important;
    }

    /* CID image placeholder styles */
    ::ng-deep .email-message-content img[src*="data:image/svg+xml"] {
      background-color: var(--clr-color-neutral-100);
      border: 2px dashed var(--clr-color-neutral-400);
      padding: 1rem;
      border-radius: 4px;
      max-width: 100px;
      max-height: 100px;
    }

    /* Plain text content styles */
    ::ng-deep .email-message-content .plain-text-content {
      font-family: monospace;
      white-space: pre-wrap;
      line-height: 1.4;
    }

    ::ng-deep .email-message-content .plain-text-content p {
      margin: 0.5rem 0;
    }

    /* No content state */
    ::ng-deep .email-message-content .no-content {
      text-align: center;
      padding: 2rem;
      color: var(--clr-color-neutral-600);
    }

    /* General element constraints */
    ::ng-deep .email-message-content * {
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    /* Image handling */
    ::ng-deep .email-message-content img {
      max-width: 100% !important;
      height: auto !important;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    /* Table responsiveness */
    ::ng-deep .email-message-content .table-responsive {
      overflow-x: auto;
      margin: 0.5rem 0;
    }

    ::ng-deep .email-message-content table {
      max-width: 100% !important;
      border-collapse: collapse;
      margin: 0.5rem 0;
    }

    ::ng-deep .email-message-content td, 
    ::ng-deep .email-message-content th {
      padding: 0.25rem 0.5rem;
      word-wrap: break-word;
      max-width: 200px;
      /* Only add borders to tables that actually look like data tables */
      border: none;
    }

    /* Only add borders to tables that have multiple rows/cols and look like data tables */
    ::ng-deep .email-message-content table[border], 
    ::ng-deep .email-message-content table.data-table,
    ::ng-deep .email-message-content table:has(th) {
      border-collapse: collapse;
    }

    ::ng-deep .email-message-content table[border] td,
    ::ng-deep .email-message-content table[border] th,
    ::ng-deep .email-message-content table.data-table td,
    ::ng-deep .email-message-content table.data-table th,
    ::ng-deep .email-message-content table:has(th) td,
    ::ng-deep .email-message-content table:has(th) th {
      border: 1px solid var(--clr-color-neutral-300);
    }

    /* Typography with better spacing */
    ::ng-deep .email-message-content p {
      margin: 0.75rem 0 !important;
      line-height: 1.6;
    }

    ::ng-deep .email-message-content h1,
    ::ng-deep .email-message-content h2,
    ::ng-deep .email-message-content h3,
    ::ng-deep .email-message-content h4,
    ::ng-deep .email-message-content h5,
    ::ng-deep .email-message-content h6 {
      margin: 1.5rem 0 0.75rem 0 !important;
      color: var(--clr-color-neutral-700);
    }

    /* Ensure spacing between different sections */
    ::ng-deep .email-message-content div + div,
    ::ng-deep .email-message-content p + div,
    ::ng-deep .email-message-content div + p,
    ::ng-deep .email-message-content table + div,
    ::ng-deep .email-message-content div + table {
      margin-top: 1rem !important;
    }

    /* Spacing for common email structures */
    ::ng-deep .email-message-content br {
      line-height: 1.5;
      display: block;
      margin: 0.25rem 0;
    }

    ::ng-deep .email-message-content br + br {
      margin-top: 0.5rem;
    }

    /* Preserve spacing in nested structures */
    ::ng-deep .email-message-content td > div,
    ::ng-deep .email-message-content td > p {
      margin: 0.5rem 0 !important;
    }

    ::ng-deep .email-message-content td > div:first-child,
    ::ng-deep .email-message-content td > p:first-child {
      margin-top: 0 !important;
    }

    ::ng-deep .email-message-content td > div:last-child,
    ::ng-deep .email-message-content td > p:last-child {
      margin-bottom: 0 !important;
    }

    /* Link styles */
    ::ng-deep .email-message-content a.email-link {
      color: var(--clr-color-action-600);
      text-decoration: none;
    }

    ::ng-deep .email-message-content a.email-link:hover {
      text-decoration: underline;
    }

    ::ng-deep .email-message-content a.external-link {
      color: var(--clr-color-action-600);
      text-decoration: none;
    }

    ::ng-deep .email-message-content a.external-link:hover {
      text-decoration: underline;
    }

    ::ng-deep .email-message-content a.external-link::after {
      content: " ↗";
      font-size: 0.8em;
      opacity: 0.7;
    }

    /* Quote handling */
    ::ng-deep .email-message-content .email-quote,
    ::ng-deep .email-message-content blockquote {
      border-left: 4px solid var(--clr-color-neutral-400);
      padding-left: 1rem;
      margin: 1rem 0;
      background-color: var(--clr-color-neutral-50);
      border-radius: 0 4px 4px 0;
    }

    /* Lists */
    ::ng-deep .email-message-content ul,
    ::ng-deep .email-message-content ol {
      margin: 0.5rem 0;
      padding-left: 2rem;
    }

    ::ng-deep .email-message-content li {
      margin: 0.25rem 0;
    }

    /* Code blocks */
    ::ng-deep .email-message-content pre,
    ::ng-deep .email-message-content code {
      background-color: var(--clr-color-neutral-100);
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9em;
    }

    ::ng-deep .email-message-content pre {
      padding: 1rem;
      overflow-x: auto;
      margin: 0.5rem 0;
    }

    /* Dividers */
    ::ng-deep .email-message-content hr {
      border: none;
      border-top: 1px solid var(--clr-color-neutral-300);
      margin: 1rem 0;
    }

    /* Fix for nested tables and email client specific elements */
    ::ng-deep .email-message-content .msoNormal,
    ::ng-deep .email-message-content .MsoNormal {
      margin: 0 !important;
    }

    /* Outlook specific elements */
    ::ng-deep .email-message-content o\\:p {
      display: none;
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
  @Output() errorOccurred = new EventEmitter<string>();
  @Output() messageDetailsLoaded = new EventEmitter<MessageDto>();
  @Output() messageStatusChanged = new EventEmitter<{messageId: number, seen: boolean}>();
  @Output() messageDeleted = new EventEmitter<{messageId: number, sourceFolder: string, targetFolder: string, wasUnread: boolean}>();
  @Output() replyRequested = new EventEmitter<MessageDto>();
  @Output() replyAllRequested = new EventEmitter<MessageDto>();
  @Output() forwardRequested = new EventEmitter<MessageDto>();
  @Output() editDraftRequested = new EventEmitter<MessageDto>();

  loadingMessageDetails = false;
  messageDetails: MessageDto | null = null;
  private domPurify: any = null;

  constructor(
    private backendService: BackendService,
    private sanitizer: DomSanitizer,
    protected readonly fileUtils: FileUtilsService
  ) { 
    // Dynamically import DOMPurify
    this.initDOMPurify();
  }

  private async initDOMPurify(): Promise<void> {
    try {
      const DOMPurify = await import('dompurify');
      this.domPurify = DOMPurify.default || DOMPurify;
    } catch (error) {
      console.warn('Failed to load DOMPurify:', error);
      this.domPurify = null;
    }
  }

  // Watch for changes in selectedMessage to automatically load details
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedMessage']) {
      if (changes['selectedMessage'].currentValue) {
        // Only load details if it's actually a different message
        const newMessage = changes['selectedMessage'].currentValue;
        if (!this.messageDetails || this.messageDetails.id !== newMessage.id) {
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



  getSafeMessageContent(message: MessageDto): SafeHtml {
    const rawContent = this.getMessageContent(message);
    if (!rawContent || rawContent.trim() === '') {
      console.warn('Empty content detected, using fallback');
      return this.sanitizer.bypassSecurityTrustHtml('<div class="error-content"><p>No content to display</p></div>');
    }
    return this.sanitizer.bypassSecurityTrustHtml(rawContent);
  }

  private getMessageContent(message: MessageDto): string {
    try {
      if (message.bodyHtml && message.bodyHtml.body) {
        return this.processHtmlContent(message.bodyHtml.body);
      }
      if (message.bodyText) {
        return this.processPlainTextContent(message.bodyText);
      }
      return '<div class="no-content"><p style="color: #666; font-style: italic; text-align: center;">No content available</p></div>';
    } catch (error) {
      console.error('Error processing message content:', error);
      return '<div class="error-content"><p style="color: red;">Error displaying email content</p></div>';
    }
  }

  private processHtmlContent(htmlContent: string): string {
    let processedHtml = this.sanitizeWithDOMPurify(htmlContent);
    processedHtml = this.processImages(processedHtml);
    processedHtml = this.fixStyling(processedHtml);
    processedHtml = this.makeResponsive(processedHtml);
    processedHtml = this.handleEmailSpecificElements(processedHtml);
    return `<div class="email-content-wrapper">${processedHtml}</div>`;
  }

  private processPlainTextContent(textContent: string): string {
    if (!textContent || textContent.trim() === '') {
      return '<div class="no-content"><p style="color: #666; font-style: italic;">Empty message</p></div>';
    }

    // Enhanced plain text processing
    let processedText = textContent
      // Basic HTML escaping
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      // Convert line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Handle multiple consecutive line breaks
      .replace(/\n\s*\n\s*\n/g, '</p><p>')
      // Handle single line breaks
      .replace(/\n/g, '<br>')
      // Convert URLs to links
      .replace(/(https?:\/\/[^\s<>"]+)/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      // Convert email addresses to mailto links
      .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1">$1</a>');

    return `<div class="plain-text-content"><p>${processedText}</p></div>`;
  }

  private sanitizeWithDOMPurify(html: string): string {
    if (!html || typeof html !== 'string') {
      console.warn('Invalid HTML input for DOMPurify:', html);
      return '';
    }

    try {
      // Check if DOMPurify is available and working
      if (!this.domPurify || typeof this.domPurify.sanitize !== 'function') {
        console.warn('DOMPurify not available, using fallback sanitization');
        return '';
      }

      // Extract body content if this is a full HTML document
      let contentToSanitize = this.extractBodyContent(html);
      
      // Use a more permissive configuration for emails
      return this.domPurify.sanitize(contentToSanitize, {
        // Use default allowed tags (more permissive)
        ADD_TAGS: ['font', 'center', 'o:p'],
        ADD_ATTR: ['target', 'style', 'class', 'id', 'align', 'bgcolor', 'color', 'face', 'size'],
        // Only forbid the most dangerous attributes
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
        // Keep content even if tags are removed
        KEEP_CONTENT: true,
        // Allow data URLs for inline images
        ALLOW_DATA_ATTR: true
      });
    } catch (error) {
      console.error('DOMPurify error:', error);
      return '';
    }
  }

  private extractBodyContent(html: string): string {
    // Check if this is a full HTML document
    if (html.includes('<html') || html.includes('<HTML')) {
      // Try to extract body content
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        return bodyMatch[1];
      }
      
      // If no body tag found, try to remove html/head structure
      let cleaned = html
        .replace(/<html[^>]*>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\?xml[^>]*\?>/gi, '');

      return cleaned;
    }
    
    return html;
  }

  private processImages(html: string): string {
    // Add error handling and loading states to images
    return html.replace(/<img([^>]*)>/gi, (match, attributes) => {
      let processedAttributes = attributes;
      
      // Handle CID (Content-ID) links - these are embedded attachments in emails
      if (processedAttributes.includes('cid:')) {
        // Replace CID links with a placeholder or hide the image
        processedAttributes = processedAttributes.replace(/src\s*=\s*["']cid:[^"']*["']/gi, 'src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMCA2QzguODk1IDYgOCA2Ljg5NSA4IDhWMTJDOCAxMy4xMDUgOC44OTUgMTQgMTAgMTRIMTRDMTUuMTA1IDE0IDE2IDEzLjEwNSAxNiAxMlY4QzE2IDYuODk1IDE1LjEwNSA2IDE0IDZIMTBaTTEwIDhIMTRWMTJIMTBWOFoiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+" alt="[Embedded Image]"');
      }
      
      // Ensure images don't break layout
      if (!processedAttributes.includes('style=')) {
        processedAttributes += ' style="max-width: 100%; height: auto;"';
      } else {
        processedAttributes = processedAttributes.replace(/style="([^"]*)"/, (styleMatch: string, styles: string) => {
          const updatedStyles = styles.includes('max-width') ? styles : `${styles}; max-width: 100%; height: auto;`;
          return `style="${updatedStyles}"`;
        });
      }
      
      // Add error handling for broken images
      if (!processedAttributes.includes('onerror=')) {
        processedAttributes += ' onerror="this.style.display=\'none\'"';
      }
      
      // Add loading attribute for better UX
      if (!processedAttributes.includes('loading=')) {
        processedAttributes += ' loading="lazy"';
      }
      
      return `<img${processedAttributes}>`;
    });
  }

  private fixStyling(html: string): string {
    // Handle common email client styling issues
    
    // Fix Outlook-specific conditional comments
    html = html.replace(/<!--\[if[^>]*>.*?<!\[endif\]-->/gsi, '');
    
    // Remove or modify problematic CSS properties
    html = html.replace(/position\s*:\s*fixed/gi, 'position: relative');
    html = html.replace(/position\s*:\s*absolute/gi, 'position: relative');
    
    // Fix width issues in tables
    html = html.replace(/<table([^>]*width\s*=\s*["']\d+["'][^>]*)>/gi, (match, attributes) => {
      if (!attributes.includes('style=')) {
        return `<table${attributes} style="max-width: 100%; width: auto;">`;
      }
      return match;
    });
    
    return html;
  }

  private makeResponsive(html: string): string {
    // Wrap tables in responsive containers
    html = html.replace(/<table[^>]*>/gi, (match) => {
      return `<div class="table-responsive">${match}`;
    });
    html = html.replace(/<\/table>/gi, '</table></div>');
    
    // Add responsive styling to divs with fixed widths
    html = html.replace(/<div([^>]*style[^>]*width\s*:\s*\d+px[^>]*)>/gi, (match, attributes) => {
      const newAttributes = attributes.replace(/width\s*:\s*\d+px/gi, 'max-width: 100%');
      return `<div${newAttributes}>`;
    });
    
    return html;
  }

  private handleEmailSpecificElements(html: string): string {
    // Handle mailto links
    html = html.replace(/<a([^>]*href\s*=\s*["']mailto:[^"']*["'][^>]*)>/gi, '<a$1 class="email-link">');
    
    // Handle external links - add security attributes
    html = html.replace(/<a([^>]*href\s*=\s*["']https?:[^"']*["'][^>]*)>/gi, '<a$1 target="_blank" rel="noopener noreferrer" class="external-link">');
    
    // Handle blockquotes (common in email replies)
    html = html.replace(/<blockquote([^>]*)>/gi, '<blockquote$1 class="email-quote">');
    
    return html;
  }

  toggleReadStatus(): void {
    if (!this.messageDetails || !this.selectedFolder) {
      return;
    }

    const newSeenStatus = !this.messageDetails.seen;
    
    this.backendService.markEmail(this.messageDetails.id, this.selectedFolder.name, newSeenStatus).subscribe({
      next: (response) => {
        if (response.success && this.messageDetails) {
          // Update local message state for immediate UI feedback
          this.messageDetails.seen = response.seen;
          
          // Also update the original selectedMessage if it exists
          if (this.selectedMessage) {
            this.selectedMessage.seen = response.seen;
          }
          
          // Emit status change event for parent components to update their state
          this.messageStatusChanged.emit({
            messageId: this.messageDetails.id,
            seen: response.seen
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

    // Confirm deletion
    const confirmDelete = confirm('Are you sure you want to move this email to the trash?');
    if (!confirmDelete) {
      return;
    }

    // Common trash folder names in different languages
    const trashFolderNames = [
      'Trash', 'TRASH',
      'Deleted Items', 'DELETED ITEMS',
      'Papierkorb', 'PAPIERKORB', 
      'Gelöschte Objekte', 'GELÖSCHTE OBJEKTE',
      'Corbeille', 'CORBEILLE',
      'Cestino', 'CESTINO',
      'Bin', 'BIN'
    ];

    // Get available folders from backend to find the trash folder
    this.backendService.getImapFolders().subscribe({
      next: (folders) => {
        // Find the trash folder
        let trashFolder = folders.find(folder => 
          trashFolderNames.some(trashName => 
            folder.name.toLowerCase().includes(trashName.toLowerCase())
          )
        );

        // If no specific trash folder found, use the first folder that contains "trash" or similar
        if (!trashFolder) {
          trashFolder = folders.find(folder => 
            folder.name.toLowerCase().includes('trash') ||
            folder.name.toLowerCase().includes('papierkorb') ||
            folder.name.toLowerCase().includes('deleted')
          );
        }

        // If still no trash folder found, emit error
        if (!trashFolder) {
          this.errorOccurred.emit('No trash folder found. Cannot delete email.');
          return;
        }

        // Don't move if already in trash folder
        if (this.selectedFolder!.name === trashFolder.name) {
          this.errorOccurred.emit('Email is already in trash folder.');
          return;
        }

        // Move email to trash folder
        this.backendService.moveEmail(
          this.messageDetails!.id,
          this.selectedFolder!.name,
          trashFolder.name
        ).subscribe({
          next: (response) => {
            if (response.success) {
              // Emit event to parent component
              this.messageDeleted.emit({
                messageId: this.messageDetails!.id,
                sourceFolder: this.selectedFolder!.name,
                targetFolder: trashFolder.name,
                wasUnread: !this.messageDetails!.seen
              });
            } else {
              this.errorOccurred.emit('Failed to delete email');
            }
          },
          error: (err) => {
            this.errorOccurred.emit('Failed to delete email: ' + (err.message || 'Unknown error'));
          }
        });
      },
      error: (err) => {
        this.errorOccurred.emit('Failed to get folders for delete operation: ' + (err.message || 'Unknown error'));
      }
    });
  }

  viewAttachment(attachmentIndex: number): void {
    if (!this.messageDetails || !this.selectedFolder) {
      this.errorOccurred.emit('Cannot view attachment: no message or folder selected');
      return;
    }

    try {
      this.backendService.viewAttachment(
        this.selectedFolder.name, 
        this.messageDetails.id, 
        attachmentIndex
      );
    } catch (error) {
      this.errorOccurred.emit('Failed to view attachment: ' + error);
    }
  }
}