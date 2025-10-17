import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, OnChanges, SimpleChanges, CUSTOM_ELEMENTS_SCHEMA, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClarityModule } from '@clr/angular';
import { BackendService } from 'src/app/services/backend.service';
import { MessageDto, AddressDto, AttachmentDto } from 'src/app/dtos/message-dto';
import { RecipientInputComponent, RecipientChip, Contact } from './recipient-input.component';
import { EmailAttachmentComponent } from './email-attachment.component';
import { AutoTextareaComponent } from '../shared/auto-textarea.component';
import { of, switchMap } from 'rxjs';

export enum ComposeMode {
  NEW = 'new',
  REPLY = 'reply',
  REPLY_ALL = 'replyAll',
  FORWARD = 'forward',
  EDIT_DRAFT = 'editDraft'
}

export interface ComposeData {
  mode: ComposeMode;
  originalMessage?: MessageDto;
}

@Component({
  selector: 'app-email-compose',
  imports: [
    CommonModule, 
    FormsModule, 
    ClarityModule,
    AutoTextareaComponent,
    RecipientInputComponent,
    EmailAttachmentComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="compose-panel">
      <clr-card-header>
        <clr-card-title>
          <span>{{ getComposeTitle() }}</span>

          <!-- Draft Status -->
          @if (draftSaveStatus !== 'idle') {
            <div class="draft-status" [class.saving]="draftSaveStatus === 'saving'"
                 [class.saved]="draftSaveStatus === 'saved'"
                 [class.error]="draftSaveStatus === 'error'">
              @if (draftSaveStatus === 'saving') {
                <cds-icon shape="sync" class="spinning"></cds-icon>
                Auto-saving...
              } @else if (draftSaveStatus === 'saved') {
                <cds-icon shape="check"></cds-icon>
                Draft saved
              } @else if (draftSaveStatus === 'error') {
                <cds-icon shape="exclamation-triangle"></cds-icon>
                Save failed
              }
            </div>
          }

          <div class="header-actions">
            <button 
              class="btn btn-sm btn-outline" 
              (click)="closeCompose()">
              <cds-icon shape="times"></cds-icon>
              Cancel
            </button>
            
            <button 
              class="btn btn-sm btn-outline" 
              (click)="openAttachmentDialog()"
              [disabled]="sending"
              title="Add attachments">
              <cds-icon shape="paperclip"></cds-icon>
              Attach
            </button>
            
            <button
              class="btn btn-sm btn-outline"
              (click)="saveDraft()"
              [disabled]="savingDraft || sending"
              title="Save draft">
              @if (savingDraft) {
                <cds-icon shape="sync" class="spinning"></cds-icon>
                Saving...
              } @else {
                <cds-icon shape="floppy"></cds-icon>
                Save Draft
              }
            </button>

            <button
              class="btn btn-sm btn-primary"
              type="submit"
              form="email-form"
              [class.loading]="sending">
              @if (sending) {
                <cds-icon shape="sync" class="spinning"></cds-icon>
                Sending...
              } @else {
                <cds-icon shape="envelope"></cds-icon>
                Send
              }
            </button>
          </div>
        </clr-card-title>
      </clr-card-header>
      
      <div class="compose-content">
        <form id="email-form" (ngSubmit)="sendEmail()" #emailForm="ngForm">
          
          <!-- To Field with CC Toggle -->
          <div class="input-row">
            <label class="input-label">To:</label>
            <div class="recipient-container">
              <app-recipient-input
                [recipients]="toRecipients"
                [contacts]="contacts"
                placeholder="Enter recipient email address"
                (recipientsChange)="onToRecipientsChange($event)">
              </app-recipient-input>
              <button 
                type="button"
                class="input-cc-toggle" 
                [class.active]="showCc"
                (click)="toggleShowCc()">
                CC
              </button>
            </div>
          </div>

          <!-- CC Field with BCC Toggle -->
          @if (showCc) {
            <div class="input-row">
              <label class="input-label">CC:</label>
              <div class="recipient-container">
                <app-recipient-input
                  [recipients]="ccRecipients"
                  [contacts]="contacts"
                  placeholder="Carbon copy recipients (optional)"
                  (recipientsChange)="onCcRecipientsChange($event)">
                </app-recipient-input>
                <button 
                  type="button"
                  class="input-cc-toggle" 
                  [class.active]="showBcc"
                  (click)="toggleShowBcc()">
                  BCC
                </button>
              </div>
            </div>
          }

          <!-- BCC Field -->
          @if (showBcc) {
            <div class="input-row">
              <label class="input-label">BCC:</label>
              <div class="recipient-container">
                <app-recipient-input
                  [recipients]="bccRecipients"
                  [contacts]="contacts"
                  placeholder="Blind carbon copy recipients (optional)"
                  (recipientsChange)="onBccRecipientsChange($event)">
                </app-recipient-input>
              </div>
            </div>
          }

          <!-- Subject Field -->
          <div class="input-row">
            <label class="input-label">Subject:</label>
            <div class="input-container">
              <input 
                type="text" 
                name="subject"
                [(ngModel)]="emailData.subject"
                #subjectField="ngModel"
                required
                class="input-field"
                placeholder="Email subject"
              />
            </div>
          </div>

          <!-- Attachments Field (only show when attachments exist) -->
          @if (attachmentFiles && attachmentFiles.length > 0) {
            <div class="input-row attachment-row">
              <label class="input-label">Files:</label>
              <app-email-attachment
                #attachmentComponent
                [attachments]="attachmentFiles || []"
                [disabled]="sending"
                [maxFileSize]="maxAttachmentSize"
                [maxFiles]="maxAttachmentCount"
                (attachmentsChange)="onAttachmentsChange($event)"
                (error)="onAttachmentError($event)">
              </app-email-attachment>
            </div>
          }
          
          <!-- Hidden attachment component for file dialog functionality -->
          @if (!attachmentFiles || attachmentFiles.length === 0) {
            <app-email-attachment
              #attachmentComponent
              [attachments]="[]"
              [disabled]="sending"
              [maxFileSize]="maxAttachmentSize"
              [maxFiles]="maxAttachmentCount"
              (attachmentsChange)="onAttachmentsChange($event)"
              (error)="onAttachmentError($event)"
              style="display: none;">
            </app-email-attachment>
          }

          <!-- Message Body -->
          <div class="input-row message-row">
            <div class="message-container">
              <app-auto-textarea
                name="message"
                [(ngModel)]="emailData.bodyText"
                #messageField="ngModel"
                required
                [styleClass]="'message-field'"
                placeholder="Compose your message...">
              </app-auto-textarea>
            </div>
          </div>

          <!-- Validation Errors (only shown after submit attempt) -->
          @if (showValidationErrors) {
            <div class="validation-errors">
              @if (toRecipients.length === 0) {
                <div class="error-message">At least one recipient is required</div>
              }
              @if (hasInvalidToRecipients) {
                <div class="error-message">Please correct invalid email addresses in To field</div>
              }
              @if (hasInvalidCcRecipients) {
                <div class="error-message">Please correct invalid email addresses in CC field</div>
              }
              @if (hasInvalidBccRecipients) {
                <div class="error-message">Please correct invalid email addresses in BCC field</div>
              }
              @if (!emailData.subject || emailData.subject.trim() === '') {
                <div class="error-message">Subject is required</div>
              }
              @if (!emailData.bodyText || emailData.bodyText.trim() === '') {
                <div class="error-message">Message is required</div>
              }
            </div>
          }
        </form>
      </div>
    </div>
  `,
  styles: [`
    .compose-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--clr-global-app-background, #fafafa);
    }

    clr-card-header {
      padding: 0.5em;
      border-bottom: 1px solid var(--clr-color-neutral-300);
    }

    clr-card-title {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      width: 100% !important;
      margin-left: 10px;
    }

    .header-actions {
      display: flex;
      gap: 0.25rem;
      align-items: center;
    }

    .draft-status {
      font-size: 0.65rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      font-weight: 500;
      margin-right: 0.5rem;
    }

    .draft-status.saving {
      color: var(--clr-color-neutral-700, #666);
      background: var(--clr-color-neutral-100, #f5f5f5);
    }

    .draft-status.saved {
      color: var(--clr-color-success-700, #2e8b57);
      background: var(--clr-color-success-100, #e8f5e8);
    }

    .draft-status.error {
      color: var(--clr-color-danger-700, #d63031);
      background: var(--clr-color-danger-100, #ffeaea);
    }

    .draft-status cds-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .compose-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      background: white;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 0;
      height: 100%;
    }

    .input-row {
      display: grid;
      grid-template-columns: 80px 1fr;
      gap: 0;
      align-items: start;
      border-bottom: 1px solid var(--clr-color-neutral-300, #e0e0e0);
    }

    /* Special styling for attachment row to prevent overlap */
    .attachment-row {
      align-items: start;
      padding: 0.5rem 0;
    }

    .attachment-row .input-label {
      padding-top: 0.75rem;
      padding-bottom: 0.75rem;
      align-self: start;
      position: relative;
      z-index: 1;
    }

    .message-row {
      flex: 1;
      display: grid;
      grid-template-columns: 80px 1fr;
      gap: 0;
      align-items: start;
    }

    .input-label {
      font-weight: 600;
      color: var(--clr-color-neutral-800, #2c3e50);
      font-size: 0.7rem;
      margin: 0;
      padding: 0.75rem;
      text-align: left;
    }

    .input-container,
    .recipient-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.5rem;
      padding-right: 0.75rem;
      min-height: 2.5rem;
    }

    .input-container {
      justify-content: flex-start;
    }

    .recipient-container {
      justify-content: space-between;
    }

    .recipient-container app-recipient-input {
      flex: 1;
      min-width: 0;
    }

    .input-cc-toggle {
      background: transparent;
      border: 1px solid var(--clr-color-neutral-400, #ccc);
      border-radius: 3px;
      padding: 0.25rem 0.5rem;
      font-size: 0.65rem;
      color: var(--clr-color-neutral-700, #666);
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
      margin-left: auto;
      height: 1.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .input-cc-toggle:hover {
      background: var(--clr-color-neutral-100, #f5f5f5);
      border-color: var(--clr-color-neutral-500, #999);
      color: var(--clr-color-neutral-800, #333);
    }

    .input-cc-toggle.active {
      background: var(--clr-color-primary-200, #e3f2fd);
      border-color: var(--clr-color-primary-400, #42a5f5);
      color: var(--clr-color-primary-700, #1976d2);
    }

    .input-cc-toggle:focus {
      outline: 2px solid var(--clr-color-primary-400, #42a5f5);
      outline-offset: 1px;
    }

    .input-field,
    .message-field {
      width: 100%;
      padding: 0.5rem;
      border: none;
      border-radius: 0;
      font-size: 0.7rem;
      background: white;
      box-sizing: border-box;
      outline: none;
      height: 2rem;
      line-height: 1.2;
    }

    .message-row {
      padding-top: 0.5rem;
      display:block;
    }

    .message-container {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 250px;
    }
    
    ::ng-deep .message-field {
      flex: 1;
      resize: vertical;
      line-height: 1.5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      border: 0 !important;
      width: 100% !important;
      padding: 0.5rem;
      padding-left: 0.75rem;
    }

    .input-field::placeholder,
    ::ng-deep .message-field::placeholder {
      color: #bababa;
    }

    .btn-icon {
      padding: 0.25rem !important;
      min-width: auto !important;
      width: 2rem;
      height: 2rem;
      flex-shrink: 0;
    }

    .validation-errors {
      grid-column: 1 / -1;
      background: var(--clr-color-danger-100, #ffeaea);
      border-top: 1px solid var(--clr-color-danger-300, #ff6b6b);
      border-bottom: 1px solid var(--clr-color-danger-300, #ff6b6b);
      padding: 0.75rem;
    }

    .error-message {
      color: var(--clr-color-danger-700, #d63031);
      font-size: 0.75rem;
      font-weight: 500;
      margin: 0.25rem 0;
    }

    .error-message:first-child {
      margin-top: 0;
    }

    .error-message:last-child {
      margin-bottom: 0;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .input-row,
      .message-row {
        grid-template-columns: 1fr;
        gap: 0;
      }

      .input-label {
        padding: 0.5rem;
        border-right: none;
        border-bottom: 1px solid var(--clr-color-neutral-300, #e0e0e0);
      }
      
      .header-actions {
        flex-wrap: wrap;
        gap: 0.25rem;
      }

      ::ng-deep .message-field {
        min-height: 200px !important;
        height: 200px !important;
      }

      .input-container,
      .recipient-container {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
        padding-right: 0.5rem;
      }

      .input-cc-toggle {
        align-self: flex-end;
        margin-left: 0;
        margin-top: 0.25rem;
      }
    }

    /* Datalist styling improvements */
    datalist {
      max-height: 200px;
      overflow-y: auto;
    }

    /* Focus and interaction improvements */
    .compose-content:focus-within {
      outline: none;
    }

    /* Loading state improvements */
    .loading {
      position: relative;
    }

    .loading:disabled {
      opacity: 0.8;
    }
  `]
})
export class EmailComposeComponent implements OnInit, OnDestroy, OnChanges {
  @Input() composeData: ComposeData | null = null;
  @Output() emailSent = new EventEmitter<{mode: ComposeMode}>();
  @Output() composeClosed = new EventEmitter<void>();
  @Output() errorOccurred = new EventEmitter<string>();
  @Output() draftSaved = new EventEmitter<{ isNew: boolean }>();

  emailData: MessageDto = new MessageDto();
  sending = false;
  showCc = false;
  showBcc = false;
  showValidationErrors = false;

  // Draft functionality
  draftId: number | null = null;
  savingDraft = false;
  draftSaveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  private autoSaveTimer: any = null;
  
  @Input() contacts: Contact[] = [];

  // Recipient chips
  toRecipients: RecipientChip[] = [];
  ccRecipients: RecipientChip[] = [];
  bccRecipients: RecipientChip[] = [];

  // Attachment configuration
  maxAttachmentSize: number = 25 * 1024 * 1024; // 25MB in bytes
  maxAttachmentCount: number = 10;
  attachmentFiles: File[] = [];

  @ViewChild(EmailAttachmentComponent) attachmentComponent!: EmailAttachmentComponent;

  constructor(private backendService: BackendService) {}

  ngOnInit(): void {
    this.startAutoSave();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['composeData'] && this.composeData) {
      this.setupComposeMode();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoSave();
  }

  toggleShowCc(): void {
    this.showCc = !this.showCc;
    if (!this.showCc) {
      this.ccRecipients = [];
    }
  }

  toggleShowBcc(): void {
    this.showBcc = !this.showBcc;
    if (!this.showBcc) {
      this.bccRecipients = [];
    }
  }

  // Event handlers for recipient changes
  onToRecipientsChange(recipients: RecipientChip[]): void {
    this.toRecipients = recipients;
    this.updateEmailData();
  }

  onCcRecipientsChange(recipients: RecipientChip[]): void {
    this.ccRecipients = recipients;
    this.updateEmailData();
  }

  onBccRecipientsChange(recipients: RecipientChip[]): void {
    this.bccRecipients = recipients;
    this.updateEmailData();
  }

  // Update emailData based on recipient chips
  private updateEmailData(): void {
    this.emailData.to = this.toRecipients.map(r => new AddressDto({email: r.email, name: r.name}));
    this.emailData.cc = this.ccRecipients.map(r => new AddressDto({email: r.email, name: r.name}));
    this.emailData.bcc = this.bccRecipients.map(r => new AddressDto({email: r.email, name: r.name}));
  }

  // Parse recipient from AddressDto
  private parseRecipientFromAddress(address: AddressDto): RecipientChip | null {
    if (!address || !address.email || !address.email.trim()) return null;

    const cleanEmail = address.email.trim();

    if (!this.isValidEmail(cleanEmail)) {
      return {
        email: cleanEmail,
        name: undefined,
        displayText: cleanEmail,
        isValid: false
      };
    }

    // Use provided name if available and different from email
    const recipientName = (address.name && address.name.trim() && address.name.trim() !== cleanEmail) ? address.name.trim() : undefined;

    // If no name provided, try to find in contacts
    const finalName = recipientName || this.contacts.find(c => c.email.toLowerCase() === cleanEmail.toLowerCase())?.name;

    // Create display text
    const displayText = (finalName && finalName !== cleanEmail) ? `${finalName} <${cleanEmail}>` : cleanEmail;

    return {
      email: cleanEmail,
      name: (finalName && finalName !== cleanEmail) ? finalName : undefined,
      displayText,
      isValid: true
    };
  }

  // Validation helper getters for template
  get hasInvalidToRecipients(): boolean {
    return this.toRecipients.some(r => !r.isValid);
  }

  get hasInvalidCcRecipients(): boolean {
    return this.ccRecipients.some(r => !r.isValid);
  }

  get hasInvalidBccRecipients(): boolean {
    return this.bccRecipients.some(r => !r.isValid);
  }

  private setupComposeMode(): void {
    if (!this.composeData) return;

    const { mode, originalMessage } = this.composeData;
    
    switch (mode) {
      case ComposeMode.REPLY:
        if (originalMessage) {
          const toRecipient = this.parseRecipientFromAddress(originalMessage.from);
          if (toRecipient) {
            this.toRecipients = [toRecipient];
          }
          this.emailData.subject = this.getReplySubject(originalMessage.subject);
          this.emailData.bodyText = this.getReplyMessage(originalMessage);
          this.updateEmailData();
        }
        break;
        
      case ComposeMode.REPLY_ALL:
        if (originalMessage) {
          const toRecipient = this.parseRecipientFromAddress(originalMessage.from);
          if (toRecipient) {
            this.toRecipients = [toRecipient];
          }

          // Add CC recipients
          this.ccRecipients = [];
          if (originalMessage.to && originalMessage.to.length > 0) {
            originalMessage.to.forEach(addr => {
              if (addr.email !== originalMessage.from.email) {
                const ccRecipient = this.parseRecipientFromAddress(addr);
                if (ccRecipient) {
                  this.ccRecipients.push(ccRecipient);
                }
              }
            });
          }
          if (originalMessage.cc && originalMessage.cc.length > 0) {
            originalMessage.cc.forEach(addr => {
              const ccRecipient = this.parseRecipientFromAddress(addr);
              if (ccRecipient && !this.ccRecipients.find(r => r.email === ccRecipient.email)) {
                this.ccRecipients.push(ccRecipient);
              }
            });
          }

          this.emailData.subject = this.getReplySubject(originalMessage.subject);
          this.emailData.bodyText = this.getReplyMessage(originalMessage);
          this.showCc = this.ccRecipients.length > 0;
          this.showBcc = true;
          this.updateEmailData();
        }
        break;
        
      case ComposeMode.FORWARD:
        if (originalMessage) {
          this.emailData.subject = this.getForwardSubject(originalMessage.subject);
          this.emailData.bodyText = this.getForwardMessage(originalMessage);
        }
        break;
        
      case ComposeMode.EDIT_DRAFT:
        if (originalMessage && originalMessage.id) {
          this.draftId = originalMessage.id;
          this.loadDraftData(originalMessage);
        }
        break;
        
      default: // NEW
        this.resetForm();
        break;
    }
  }

  private getReplySubject(originalSubject: string): string {
    return this.addSubjectPrefix(originalSubject, 'Re:');
  }

  private getForwardSubject(originalSubject: string): string {
    return this.addSubjectPrefix(originalSubject, 'Fwd:');
  }

  private addSubjectPrefix(originalSubject: string, prefix: string): string {
    const lowerPrefix = prefix.toLowerCase();
    return originalSubject.toLowerCase().startsWith(lowerPrefix) 
      ? originalSubject 
      : `${prefix} ${originalSubject}`;
  }

  private getReplyMessage(originalMessage: MessageDto): string {
    const date = new Date(originalMessage.date).toLocaleString();
    const originalText = originalMessage.bodyText || this.stripHtml(originalMessage.bodyHtml || '');
    const fromName = originalMessage.from.name || originalMessage.from.email;

    return `\n\n\n--- Original Message ---\nFrom: ${fromName} <${originalMessage.from.email}>\nDate: ${date}\nSubject: ${originalMessage.subject}\n\n${originalText}`;
  }

  private getForwardMessage(originalMessage: MessageDto): string {
    const date = new Date(originalMessage.date).toLocaleString();
    const originalText = originalMessage.bodyText || this.stripHtml(originalMessage.bodyHtml || '');
    const fromName = originalMessage.from.name || originalMessage.from.email;
    const toList = originalMessage.to.map(addr => `${addr.name || addr.email} <${addr.email}>`).join(', ');

    return `\n\n\n--- Forwarded Message ---\nFrom: ${fromName} <${originalMessage.from.email}>\nTo: ${toList}\nDate: ${date}\nSubject: ${originalMessage.subject}\n\n${originalText}`;
  }

  private stripHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

  getComposeTitle(): string {
    if (!this.composeData) {
      return 'Write Email';
    }
    
    switch (this.composeData.mode) {
      case ComposeMode.REPLY:
        return 'Reply';
      case ComposeMode.REPLY_ALL:
        return 'Reply All';
      case ComposeMode.FORWARD:
        return 'Forward';
      case ComposeMode.EDIT_DRAFT:
        return 'Edit Draft';
      default:
        return 'Write Email';
    }
  }

  isFormValid(): boolean {
    return !!(this.toRecipients.length > 0 &&
             this.toRecipients.every(r => r.isValid) &&
             this.ccRecipients.every(r => r.isValid) &&
             this.bccRecipients.every(r => r.isValid) &&
             this.emailData.subject &&
             this.emailData.bodyText &&
             this.emailData.subject.trim() !== '' &&
             this.emailData.bodyText.trim() !== '');
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async sendEmail(): Promise<void> {
    if (this.sending) return;

    // Show validation errors if form is invalid
    if (!this.isFormValid()) {
      this.showValidationErrors = true;
      return;
    }

    this.sending = true;
    this.showValidationErrors = false;

    try {
      if (this.attachmentFiles.length > 0) {
        const unprocessedAttachments = this.emailData.attachments!.filter(att => !att.content);
        if (unprocessedAttachments.length > 0) {
          await this.onAttachmentsChange(this.attachmentFiles);
        }
      }

      this.backendService.sendEmail(this.emailData)
        .pipe(
          switchMap(() => this.draftId ? this.backendService.deleteDraft(this.draftId) : of(true))
        )
        .subscribe({
          next: () => {
            this.sending = false;
            this.emailSent.emit();
            this.resetForm();
          },
          error: (error) => {
            this.sending = false;
            this.errorOccurred.emit(`Failed to send email: ${error.message || error}`);
          }
        });
    } catch (error) {
      this.sending = false;
      this.errorOccurred.emit(`Failed to process attachments: ${error}`);
    }
  }


  // Attachment event handlers
  async onAttachmentsChange(attachments: File[]): Promise<void> {
    this.attachmentFiles = attachments;
    this.emailData.attachments = [];

    const attachmentPromises = attachments.map((file) => {
      return new Promise<AttachmentDto>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Content = e.target?.result as string;
          // Remove the data URL prefix (e.g., "data:image/png;base64,")
          const base64Data = base64Content.split(',')[1] || base64Content;

          resolve(new AttachmentDto({
            name: file.name,
            size: file.size,
            type: file.type,
            content: base64Data
          }));
        };
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsDataURL(file);
      });
    });

    try {
      this.emailData.attachments = await Promise.all(attachmentPromises);
    } catch (error) {
      console.error('Error processing attachments:', error);
      this.onAttachmentError('Failed to process one or more attachments');
    }
  }

  onAttachmentError(errorMessage: string): void {
    this.errorOccurred.emit(errorMessage);
  }

  openAttachmentDialog(): void {
    if (this.attachmentComponent) {
      this.attachmentComponent.openFileDialog();
    }
  }

  closeCompose(): void {
    this.composeClosed.emit();
    this.resetForm();
  }

  private resetForm(): void {
    this.emailData = new MessageDto();
    this.toRecipients = [];
    this.ccRecipients = [];
    this.bccRecipients = [];
    this.attachmentFiles = [];
    this.showCc = false;
    this.showBcc = false;
    this.showValidationErrors = false;
    // Reset draft state
    this.draftId = null;
    this.draftSaveStatus = 'idle';
    this.savingDraft = false;
  }

  // Draft functionality methods
  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(() => {
      this.autoSaveDraft();
    }, 30000); // 30 seconds
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private autoSaveDraft(): void {
    // Only auto-save if form has content and is not currently sending
    if (!this.sending && this.shouldAutoSave()) {
      this.draftSaveStatus = 'saving';
      this.saveDraftInternal(false);
    }
  }

  private shouldAutoSave(): boolean {
    return !!(
      (this.toRecipients.length > 0 || this.ccRecipients.length > 0 || this.bccRecipients.length > 0) ||
      (this.emailData.subject && this.emailData.subject.trim()) ||
      (this.emailData.bodyText && this.emailData.bodyText.trim()) ||
      (this.attachmentFiles && this.attachmentFiles.length > 0)
    );
  }

  saveDraft(): void {
    if (this.savingDraft || this.sending) return;

    this.savingDraft = true;
    this.draftSaveStatus = 'saving';
    this.saveDraftInternal(true);
  }

  private saveDraftInternal(isManualSave: boolean): void {
    // Ensure email data is up to date
    this.updateEmailData();

    // Prepare draft message
    const draftMessage = { ...this.emailData };
    const wasNewDraft = !this.draftId;
    draftMessage.id = this.draftId ? this.draftId : 0;
    this.backendService.saveDraft(draftMessage).subscribe({
      next: (newDraftId: number) => {
        this.draftId = newDraftId;
        this.draftSaveStatus = 'saved';
        if (isManualSave) {
          this.savingDraft = false;
        }

        // Emit draftSaved event to trigger message list and folder count updates
        this.draftSaved.emit({ isNew: wasNewDraft });

        // Clear saved status after 3 seconds
        setTimeout(() => {
          if (this.draftSaveStatus === 'saved') {
            this.draftSaveStatus = 'idle';
          }
        }, 3000);
      },
      error: (error) => {
        console.error('Failed to save draft:', error);
        this.draftSaveStatus = 'error';
        if (isManualSave) {
          this.savingDraft = false;
          this.errorOccurred.emit('Failed to save draft');
        }

        // Clear error status after 5 seconds
        setTimeout(() => {
          if (this.draftSaveStatus === 'error') {
            this.draftSaveStatus = 'idle';
          }
        }, 5000);
      }
    });
  }

  private loadDraftData(draftMessage: MessageDto): void {
    // Load recipients
    if (draftMessage.to) {
      this.toRecipients = draftMessage.to.map(addr => this.parseRecipientFromAddress(addr)).filter(r => r !== null) as RecipientChip[];
    }
    if (draftMessage.cc && draftMessage.cc.length > 0) {
      this.ccRecipients = draftMessage.cc.map(addr => this.parseRecipientFromAddress(addr)).filter(r => r !== null) as RecipientChip[];
      this.showCc = true;
    }
    if (draftMessage.bcc && draftMessage.bcc.length > 0) {
      this.bccRecipients = draftMessage.bcc.map(addr => this.parseRecipientFromAddress(addr)).filter(r => r !== null) as RecipientChip[];
      this.showBcc = true;
    }

    // Load other draft data
    this.emailData = { ...draftMessage };

    // Load attachments if any (Note: attachments in drafts might need special handling)
    if (draftMessage.attachments && draftMessage.attachments.length > 0) {
      // This might need additional implementation depending on how draft attachments are handled
      this.emailData.attachments = draftMessage.attachments;
    }

    this.updateEmailData();
  }
}