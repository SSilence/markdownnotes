import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, OnChanges, SimpleChanges, CUSTOM_ELEMENTS_SCHEMA, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClarityModule } from '@clr/angular';
import { BackendService } from 'src/app/services/backend.service';
import { MessageDto, SendEmailDto } from 'src/app/dtos/message-dto';
import { AutoTextareaComponent } from '../auto-textarea.component';
import { RecipientInputComponent, RecipientChip, Contact } from './recipient-input.component';
import { EmailAttachmentComponent } from './email-attachment.component';

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
          
          <!-- Auto-save status indicator -->
          @if (draftSaveStatus === 'saving') {
            <span class="draft-status saving">
              <cds-icon shape="sync" class="spinning"></cds-icon>
              Saving draft...
            </span>
          } @else if (draftSaveStatus === 'saved') {
            <span class="draft-status saved">
              <cds-icon shape="check"></cds-icon>
              Draft saved
            </span>
          } @else if (draftSaveStatus === 'error') {
            <span class="draft-status error">
              <cds-icon shape="warning-triangle"></cds-icon>
              Save failed
            </span>
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
              [disabled]="sending || savingDraft"
              title="Add attachments">
              <cds-icon shape="paperclip"></cds-icon>
              Attach
            </button>

            <button 
              class="btn btn-sm btn-outline" 
              (click)="saveDraft()"
              [disabled]="sending || savingDraft"
              [class.loading]="savingDraft">
              @if (savingDraft) {
                <cds-icon shape="sync" class="spinning"></cds-icon>
                Saving...
              } @else if (draftSaveStatus === 'saved') {
                <cds-icon shape="check"></cds-icon>
                Saved
              } @else if (draftSaveStatus === 'error') {
                <cds-icon shape="warning-triangle"></cds-icon>
                Error
              } @else {
                <cds-icon shape="floppy"></cds-icon>
                Save
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
                (click)="showCc = !showCc">
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
                  (click)="showBcc = !showBcc">
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
          @if (emailData.attachments && emailData.attachments.length > 0) {
            <div class="input-row attachment-row">
              <label class="input-label">Files:</label>
              <app-email-attachment
                #attachmentComponent
                [attachments]="emailData.attachments || []"
                [disabled]="sending || savingDraft"
                [maxFileSize]="maxAttachmentSize"
                [maxFiles]="maxAttachmentCount"
                (attachmentsChange)="onAttachmentsChange($event)"
                (error)="onAttachmentError($event)">
              </app-email-attachment>
            </div>
          }
          
          <!-- Hidden attachment component for file dialog functionality -->
          @if (!emailData.attachments || emailData.attachments.length === 0) {
            <app-email-attachment
              #attachmentComponent
              [attachments]="[]"
              [disabled]="sending || savingDraft"
              [maxFileSize]="maxAttachmentSize"
              [maxFiles]="maxAttachmentCount"
              (attachmentsChange)="onAttachmentsChange($event)"
              (error)="onAttachmentError($event)"
              style="display: none;">
            </app-email-attachment>
          }

          <!-- Message Body -->
          <div class="input-row message-row">
            <label class="input-label">Message:</label>
            <div class="message-container">
              <app-auto-textarea
                name="message"
                [(ngModel)]="emailData.message"
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
              @if (!emailData.message || emailData.message.trim() === '') {
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
export class EmailComposeComponent implements OnInit, OnChanges, OnDestroy {
  @Input() composeData: ComposeData | null = null;
  @Output() emailSent = new EventEmitter<void>();
  @Output() composeClosed = new EventEmitter<void>();
  @Output() errorOccurred = new EventEmitter<string>();
  @Output() draftSaved = new EventEmitter<{ isNew: boolean }>();

  emailData: SendEmailDto = new SendEmailDto();
  sending = false;
  showCc = false;
  showBcc = false;
  showValidationErrors = false;
  
  // Contact autocomplete
  contacts: Contact[] = [];
  loadingContacts = false;

  // Recipient chips
  toRecipients: RecipientChip[] = [];
  ccRecipients: RecipientChip[] = [];
  bccRecipients: RecipientChip[] = [];

  // Auto-save draft functionality
  private autoSaveTimer: any = null;
  private currentDraftId: string | null = null;
  private lastSavedContent: string = '';
  savingDraft = false;
  draftSaveStatus: 'none' | 'saving' | 'saved' | 'error' = 'none';
  
  // Draft editing
  private originalDraftId: string | null = null;

  // Attachment configuration
  maxAttachmentSize: number = 25 * 1024 * 1024; // 25MB in bytes
  maxAttachmentCount: number = 10;

  @ViewChild(EmailAttachmentComponent) attachmentComponent!: EmailAttachmentComponent;

  constructor(private backendService: BackendService) {}

  ngOnInit(): void {
    this.loadContacts();
    this.startAutoSave();
  }

  ngOnDestroy(): void {
    this.stopAutoSave();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['composeData'] && this.composeData) {
      this.setupComposeMode();
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
    this.emailData.to = this.toRecipients.map(r => this.formatRecipientForEmail(r)).join(', ');
    this.emailData.cc = this.ccRecipients.map(r => this.formatRecipientForEmail(r)).join(', ');
    this.emailData.bcc = this.bccRecipients.map(r => this.formatRecipientForEmail(r)).join(', ');
  }

  // Format recipient with name and email for backend
  private formatRecipientForEmail(recipient: RecipientChip): string {
    if (recipient.name && recipient.name !== recipient.email) {
      return `${recipient.name} <${recipient.email}>`;
    }
    return recipient.email;
  }

  // Parse recipient for setup methods
  private parseRecipient(input: string): RecipientChip | null {
    if (!input.trim()) return null;
    
    // Check if it matches "Name <email>" format
    const nameEmailMatch = input.match(/^(.+?)\s*<([^>]+)>$/);
    if (nameEmailMatch) {
      const name = nameEmailMatch[1].trim();
      const email = nameEmailMatch[2].trim();
      // If name and email are identical, show only email
      const displayText = name === email ? email : `${name} <${email}>`;
      return {
        email,
        name: name === email ? undefined : name,
        displayText,
        isValid: this.isValidEmail(email)
      };
    }
    
    // Check if it's just an email
    const email = input.trim();
    if (this.isValidEmail(email)) {
      // Try to find name in contacts
      const contact = this.contacts.find(c => c.email.toLowerCase() === email.toLowerCase());
      const name = contact?.name;
      // If name and email are identical, show only email
      const displayText = (name && name !== email) ? `${name} <${email}>` : email;
      return {
        email,
        name: (name && name !== email) ? name : undefined,
        displayText,
        isValid: true
      };
    }
    
    // Invalid format
    return {
      email: input.trim(),
      name: undefined,
      displayText: input.trim(),
      isValid: false
    };
  }

  // Parse recipient with separate name and email (for draft loading)
  private parseRecipientWithName(email: string, name?: string): RecipientChip | null {
    if (!email || !email.trim()) return null;
    
    const cleanEmail = email.trim();
    
    // First check if the input already contains name in "Name <email>" format
    const nameEmailMatch = cleanEmail.match(/^(.+?)\s*<([^>]+)>$/);
    if (nameEmailMatch) {
      const parsedName = nameEmailMatch[1].trim();
      const parsedEmail = nameEmailMatch[2].trim();
      const displayText = parsedName === parsedEmail ? parsedEmail : `${parsedName} <${parsedEmail}>`;
      return {
        email: parsedEmail,
        name: parsedName === parsedEmail ? undefined : parsedName,
        displayText,
        isValid: this.isValidEmail(parsedEmail)
      };
    }
    
    if (!this.isValidEmail(cleanEmail)) {
      return {
        email: cleanEmail,
        name: undefined,
        displayText: cleanEmail,
        isValid: false
      };
    }
    
    // Use provided name if available and different from email
    const recipientName = (name && name.trim() && name.trim() !== cleanEmail) ? name.trim() : undefined;
    
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
          const toRecipient = this.parseRecipient(originalMessage.from);
          if (toRecipient) {
            this.toRecipients = [toRecipient];
          }
          this.emailData.subject = this.getReplySubject(originalMessage.subject);
          this.emailData.message = this.getReplyMessage(originalMessage);
          this.updateEmailData();
        }
        break;
        
      case ComposeMode.REPLY_ALL:
        if (originalMessage) {
          const toRecipient = this.parseRecipient(originalMessage.from);
          if (toRecipient) {
            this.toRecipients = [toRecipient];
          }
          
          // Add CC recipients
          this.ccRecipients = [];
          if (originalMessage.to !== originalMessage.from) {
            const ccRecipient = this.parseRecipient(originalMessage.to);
            if (ccRecipient) {
              this.ccRecipients.push(ccRecipient);
            }
          }
          if (originalMessage.cc) {
            const ccEmails = originalMessage.cc.split(',').map(email => email.trim());
            ccEmails.forEach(email => {
              const ccRecipient = this.parseRecipient(email);
              if (ccRecipient && !this.ccRecipients.find(r => r.email === ccRecipient.email)) {
                this.ccRecipients.push(ccRecipient);
              }
            });
          }
          
          this.emailData.subject = this.getReplySubject(originalMessage.subject);
          this.emailData.message = this.getReplyMessage(originalMessage);
          this.showCc = this.ccRecipients.length > 0;
          this.showBcc = true;
          this.updateEmailData();
        }
        break;
        
      case ComposeMode.FORWARD:
        if (originalMessage) {
          this.emailData.subject = this.getForwardSubject(originalMessage.subject);
          this.emailData.message = this.getForwardMessage(originalMessage);
        }
        break;
        
      case ComposeMode.EDIT_DRAFT:
        if (originalMessage) {
          // Load all draft data exactly as it was
          if (originalMessage.to) {
            const toEmails = originalMessage.to.split(',').map(email => email.trim());
            this.toRecipients = [];
            toEmails.forEach((email, index) => {
              // Use toName only for the first recipient, as MessageDto only has one toName field
              const name = (index === 0) ? originalMessage.toName : undefined;
              const toRecipient = this.parseRecipientWithName(email, name);
              if (toRecipient) {
                this.toRecipients.push(toRecipient);
              }
            });
          }
          
          if (originalMessage.cc) {
            const ccEmails = originalMessage.cc.split(',').map(email => email.trim());
            this.ccRecipients = [];
            ccEmails.forEach(email => {
              const ccRecipient = this.parseRecipientWithName(email);
              if (ccRecipient) {
                this.ccRecipients.push(ccRecipient);
              }
            });
            this.showCc = this.ccRecipients.length > 0;
          }
          
          if (originalMessage.bcc) {
            const bccEmails = originalMessage.bcc.split(',').map(email => email.trim());
            this.bccRecipients = [];
            bccEmails.forEach(email => {
              const bccRecipient = this.parseRecipientWithName(email);
              if (bccRecipient) {
                this.bccRecipients.push(bccRecipient);
              }
            });
            this.showBcc = this.bccRecipients.length > 0;
          }
          
          if (originalMessage.replyTo) {
            this.emailData.replyTo = originalMessage.replyTo;
          }
          
          this.emailData.subject = originalMessage.subject || '';
          this.emailData.message = originalMessage.bodyText || this.stripHtml(originalMessage.bodyHtml?.body || '');
          
          // Draft attachments are no longer supported - they are ignored
          if (originalMessage.attachments && originalMessage.attachments.length > 0) {
            // Show info that attachments from drafts are not loaded
            const attachmentNames = originalMessage.attachments.map(att => att.name).join(', ');
            this.errorOccurred.emit(`This draft had ${originalMessage.attachments.length} attachment(s): ${attachmentNames}. Please re-add them if needed.`);
          }
          
          // Store original draft ID for deletion after sending
          this.originalDraftId = this.extractDraftId(originalMessage);
          
          this.updateEmailData();
          
          // Mark current content as already saved to prevent immediate re-save
          this.lastSavedContent = this.getCurrentContentHash();
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
    const originalText = originalMessage.bodyText || this.stripHtml(originalMessage.bodyHtml?.body || '');
    
    return `\n\n\n--- Original Message ---\nFrom: ${originalMessage.fromName} <${originalMessage.from}>\nDate: ${date}\nSubject: ${originalMessage.subject}\n\n${originalText}`;
  }

  private getForwardMessage(originalMessage: MessageDto): string {
    const date = new Date(originalMessage.date).toLocaleString();
    const originalText = originalMessage.bodyText || this.stripHtml(originalMessage.bodyHtml?.body || '');
    
    return `\n\n\n--- Forwarded Message ---\nFrom: ${originalMessage.fromName} <${originalMessage.from}>\nTo: ${originalMessage.toName} <${originalMessage.to}>\nDate: ${date}\nSubject: ${originalMessage.subject}\n\n${originalText}`;
  }

  private stripHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

  private extractDraftId(message: MessageDto): string | null {
    // Try to extract draft ID from message-id or other headers
    if (message.id) {
      return `draft_msg_${message.id}`;
    }
    return null;
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

  private loadContacts(): void {
    this.loadingContacts = true;
    this.backendService.getImapContacts(50).subscribe({
      next: (contacts) => {
        this.contacts = contacts.sort((a, b) => b.count - a.count);
        this.loadingContacts = false;
      },
      error: (error) => {
        console.error('Failed to load contacts:', error);
        this.loadingContacts = false;
      }
    });
  }

  isFormValid(): boolean {
    return !!(this.toRecipients.length > 0 &&
             this.toRecipients.every(r => r.isValid) &&
             this.ccRecipients.every(r => r.isValid) &&
             this.bccRecipients.every(r => r.isValid) &&
             this.emailData.subject && 
             this.emailData.message &&
             this.emailData.subject.trim() !== '' &&
             this.emailData.message.trim() !== '');
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  sendEmail(): void {
    if (this.sending) return;

    // Show validation errors if form is invalid
    if (!this.isFormValid()) {
      this.showValidationErrors = true;
      return;
    }

    this.sending = true;
    this.showValidationErrors = false;
    
    this.backendService.sendEmail(this.emailData).subscribe({
      next: (response) => {
        this.sending = false;
        if (response.success) {
          // Delete the draft since email was sent successfully
          this.deleteDraft();
          this.emailSent.emit();
          this.resetForm();
        } else {
          this.errorOccurred.emit('Failed to send email');
        }
      },
      error: (error) => {
        this.sending = false;
        this.errorOccurred.emit(`Failed to send email: ${error.message || error}`);
      }
    });
  }

  saveDraft(): void {
    this.saveDraftManual();
  }

  private saveDraftManual(): void {
    console.log('saveDraftManual called');
    if (this.savingDraft) {
      console.log('Already saving draft, skipping');
      return;
    }
    
    const currentContent = this.getCurrentContentHash();
    const hasContent = this.hasContentToSave();
    const contentChanged = currentContent !== this.lastSavedContent;
    
    console.log('Draft save check:', {
      hasContent,
      contentChanged,
      currentContent: currentContent.substring(0, 50) + '...',
      lastSavedContent: this.lastSavedContent.substring(0, 50) + '...',
      currentDraftId: this.currentDraftId
    });
    
    if (!hasContent) {
      console.log('No content to save, skipping');
      this.draftSaveStatus = 'error';
      setTimeout(() => this.draftSaveStatus = 'none', 2000);
      return;
    }
    
    if (!contentChanged) {
      console.log('Content unchanged, draft already up to date');
      // Show a brief "already saved" status
      this.draftSaveStatus = 'saved';
      setTimeout(() => this.draftSaveStatus = 'none', 2000);
      return;
    }

    this.savingDraft = true;
    this.draftSaveStatus = 'saving';
    this.updateEmailData();

    console.log('Sending draft save request with ID:', this.currentDraftId);
    
    this.backendService.saveDraft(this.emailData, this.currentDraftId || undefined).subscribe({
      next: (response) => {
        console.log('Draft save response:', response);
        if (response.success) {
          const wasNewDraft = !this.currentDraftId;
          this.currentDraftId = response.draftId;
          this.lastSavedContent = currentContent;
          this.draftSaveStatus = 'saved';
          console.log('Draft saved successfully with ID:', response.draftId);
          
          // Emit event to update folder count (only for new drafts)
          this.draftSaved.emit({ isNew: wasNewDraft });
        } else {
          this.draftSaveStatus = 'error';
          console.error('Failed to save draft:', response);
        }
        this.savingDraft = false;
        
        // Reset status after 3 seconds
        setTimeout(() => {
          if (this.draftSaveStatus === 'saved' || this.draftSaveStatus === 'error') {
            this.draftSaveStatus = 'none';
          }
        }, 3000);
      },
      error: (error) => {
        this.savingDraft = false;
        this.draftSaveStatus = 'error';
        console.error('Draft save error:', error);
        
        // Reset status after 3 seconds
        setTimeout(() => {
          this.draftSaveStatus = 'none';
        }, 3000);
      }
    });
  }

  private startAutoSave(): void {
    this.stopAutoSave(); // Clear any existing timer
    this.autoSaveTimer = setInterval(() => {
      this.saveDraftAuto();
    }, 60000); // Save every 60 seconds (1 minute)
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private saveDraftAuto(): void {
    if (this.sending || this.savingDraft) return;
    
    const currentContent = this.getCurrentContentHash();
    if (!this.hasContentToSave() || currentContent === this.lastSavedContent) {
      return;
    }

    this.savingDraft = true;
    this.draftSaveStatus = 'saving';
    this.updateEmailData();

    this.backendService.saveDraft(this.emailData, this.currentDraftId || undefined).subscribe({
      next: (response) => {
        if (response.success) {
          const wasNewDraft = !this.currentDraftId;
          this.currentDraftId = response.draftId;
          this.lastSavedContent = currentContent;
          this.draftSaveStatus = 'saved';
          
          // Emit event to update folder count (for auto-save too, only for new drafts)
          this.draftSaved.emit({ isNew: wasNewDraft });
        } else {
          this.draftSaveStatus = 'error';
        }
        this.savingDraft = false;
        
        // Reset status after 3 seconds for auto-save
        setTimeout(() => {
          if (this.draftSaveStatus === 'saved' || this.draftSaveStatus === 'error') {
            this.draftSaveStatus = 'none';
          }
        }, 3000);
      },
      error: (error) => {
        this.savingDraft = false;
        this.draftSaveStatus = 'error';
        console.error('Auto-save error:', error);
        
        // Reset status after 3 seconds
        setTimeout(() => {
          this.draftSaveStatus = 'none';
        }, 3000);
      }
    });
  }

  private hasContentToSave(): boolean {
    return !!(this.emailData.subject?.trim() || 
              this.emailData.message?.trim() || 
              this.toRecipients.length > 0 ||
              this.ccRecipients.length > 0 ||
              this.bccRecipients.length > 0 ||
              (this.emailData.attachments && this.emailData.attachments.length > 0));
  }

  private getCurrentContentHash(): string {
    // Create a simple hash of the current content for comparison
    const content = JSON.stringify({
      subject: this.emailData.subject || '',
      message: this.emailData.message || '',
      to: this.toRecipients.map(r => r.email).sort(),
      cc: this.ccRecipients.map(r => r.email).sort(),
      bcc: this.bccRecipients.map(r => r.email).sort(),
      attachments: (this.emailData.attachments || []).map(f => f.name + f.size).sort()
    });
    return btoa(content);
  }

  private deleteDraft(): void {
    // Delete current auto-saved draft
    if (this.currentDraftId) {
      this.backendService.deleteDraft(this.currentDraftId).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Current draft deleted successfully:', response.message);
            this.currentDraftId = null;
            this.lastSavedContent = '';
          }
        },
        error: (error) => {
          console.error('Failed to delete current draft:', error);
        }
      });
    }
    
    // Delete original draft if this was an edit operation
    if (this.originalDraftId) {
      this.backendService.deleteDraft(this.originalDraftId).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Original draft deleted successfully:', response.message);
            this.originalDraftId = null;
          }
        },
        error: (error) => {
          console.error('Failed to delete original draft:', error);
        }
      });
    }
  }

  // Attachment event handlers
  onAttachmentsChange(attachments: File[]): void {
    this.emailData.attachments = attachments;
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
    this.stopAutoSave();
    this.composeClosed.emit();
    this.resetForm();
  }

  private resetForm(): void {
    // Stop auto-save when resetting form
    this.stopAutoSave();
    
    this.emailData = new SendEmailDto();
    this.toRecipients = [];
    this.ccRecipients = [];
    this.bccRecipients = [];
    this.showCc = false;
    this.showBcc = false;
    this.showValidationErrors = false;
    
    // Reset draft-related properties
    this.currentDraftId = null;
    this.lastSavedContent = '';
    this.draftSaveStatus = 'none';
    this.savingDraft = false;
    
    // Restart auto-save for new composition
    this.startAutoSave();
  }
}