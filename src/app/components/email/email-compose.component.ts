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
    <div class="flex flex-col h-full bg-gray-50">
      <div class="border-b border-gray-300 p-2">
        <div class="flex justify-between items-center">
          <span class="font-bold text-sm">{{ getComposeTitle() }}</span>

          <!-- Draft Status -->
          @if (draftSaveStatus !== 'idle') {
            <div class="text-xs font-medium flex items-center gap-1 px-2 py-1 rounded"
                 [class.text-gray-700]="draftSaveStatus === 'saving'"
                 [class.bg-gray-100]="draftSaveStatus === 'saving'"
                 [class.text-green-700]="draftSaveStatus === 'saved'"
                 [class.bg-green-100]="draftSaveStatus === 'saved'"
                 [class.text-red-700]="draftSaveStatus === 'error'"
                 [class.bg-red-100]="draftSaveStatus === 'error'">
              @if (draftSaveStatus === 'saving') {
                <cds-icon shape="sync" class="animate-spin text-sm"></cds-icon>
                Auto-saving...
              } @else if (draftSaveStatus === 'saved') {
                <cds-icon shape="check" class="text-sm"></cds-icon>
                Draft saved
              } @else if (draftSaveStatus === 'error') {
                <cds-icon shape="exclamation-triangle" class="text-sm"></cds-icon>
                Save failed
              }
            </div>
          }

          <div class="flex gap-1 items-center">
            <button 
              class="btn btn-icon btn-sm btn-outline" 
              (click)="closeCompose()">
              <cds-icon shape="times"></cds-icon>
              Cancel
            </button>
            
            <button 
              class="btn btn-icon btn-sm btn-outline" 
              (click)="openAttachmentDialog()"
              [disabled]="sending"
              title="Add attachments">
              <cds-icon shape="paperclip"></cds-icon>
              Attach
            </button>
            
            <button
              class="btn btn-icon btn-sm btn-outline"
              (click)="saveDraft()"
              [disabled]="savingDraft || sending"
              title="Save draft">
              @if (savingDraft) {
                <cds-icon shape="sync" class="animate-spin"></cds-icon>
                Saving...
              } @else {
                <cds-icon shape="floppy"></cds-icon>
                Save Draft
              }
            </button>

            <button
              class="btn btn-icon btn-sm btn-primary"
              type="submit"
              form="email-form"
              [disabled]="sending">
              @if (sending) {
                <cds-icon shape="sync" class="animate-spin"></cds-icon>
                Sending...
              } @else {
                <cds-icon shape="envelope"></cds-icon>
                Send
              }
            </button>
          </div>
        </div>
      </div>
      
      <div class="flex-1 overflow-y-auto bg-white">
        <form id="email-form" (ngSubmit)="sendEmail()" #emailForm="ngForm" class="flex flex-col h-full">
          
          <!-- To Field with CC Toggle -->
          <div class="border-b border-gray-300 grid grid-cols-[80px_1fr] gap-0">
            <label class="font-bold text-xs px-3 py-3 text-left">To:</label>
            <div class="flex items-center justify-between gap-2 pr-3 min-h-10">
              <app-recipient-input
                [recipients]="toRecipients"
                [contacts]="contacts"
                placeholder="Enter recipient email address"
                (recipientsChange)="onToRecipientsChange($event)">
              </app-recipient-input>
              <button 
                type="button"
                class="btn btn-icon btn-sm px-2 py-1 border border-gray-400 bg-transparent hover:bg-gray-100 text-xs font-medium text-gray-700 hover:text-gray-800 uppercase tracking-wider flex-shrink-0 rounded"
                [class.bg-blue-50]="showCc"
                [class.border-blue-400]="showCc"
                [class.text-blue-700]="showCc"
                (click)="toggleShowCc()">
                CC
              </button>
            </div>
          </div>

          <!-- CC Field with BCC Toggle -->
          @if (showCc) {
            <div class="border-b border-gray-300 grid grid-cols-[80px_1fr] gap-0">
              <label class="font-bold text-xs px-3 py-3 text-left">CC:</label>
              <div class="flex items-center justify-between gap-2 pr-3 min-h-10">
                <app-recipient-input
                  [recipients]="ccRecipients"
                  [contacts]="contacts"
                  placeholder="Carbon copy recipients (optional)"
                  (recipientsChange)="onCcRecipientsChange($event)">
                </app-recipient-input>
                <button 
                  type="button"
                  class="btn btn-icon btn-sm px-2 py-1 border border-gray-400 bg-transparent hover:bg-gray-100 text-xs font-medium text-gray-700 hover:text-gray-800 uppercase tracking-wider flex-shrink-0 rounded"
                  [class.bg-blue-50]="showBcc"
                  [class.border-blue-400]="showBcc"
                  [class.text-blue-700]="showBcc"
                  (click)="toggleShowBcc()">
                  BCC
                </button>
              </div>
            </div>
          }

          <!-- BCC Field -->
          @if (showBcc) {
            <div class="border-b border-gray-300 grid grid-cols-[80px_1fr] gap-0">
              <label class="font-bold text-xs px-3 py-3 text-left">BCC:</label>
              <div class="flex items-center justify-between gap-2 pr-3 min-h-10">
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
          <div class="border-b border-gray-300 grid grid-cols-[80px_1fr] gap-0">
            <label class="font-bold text-xs px-3 py-3 text-left">Subject:</label>
            <div class="flex items-center px-3 pr-3 min-h-10">
              <input 
                type="text" 
                name="subject"
                [(ngModel)]="emailData.subject"
                #subjectField="ngModel"
                required
                class="w-full text-xs bg-white border-none outline-none py-2"
                placeholder="Email subject"
              />
            </div>
          </div>

          <!-- Attachments Field (only show when attachments exist) -->
          @if (attachmentFiles && attachmentFiles.length > 0) {
            <div class="border-b border-gray-300 grid grid-cols-[80px_1fr] gap-0 py-2 pl-3">
              <label class="font-bold text-xs py-2">Files:</label>
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
          <div class="flex-1 border-b border-gray-300 overflow-hidden min-h-64">
            <div class="flex flex-col flex-1 overflow-hidden">
              <app-auto-textarea
                name="message"
                [(ngModel)]="emailData.bodyText"
                #messageField="ngModel"
                required
                [styleClass]="'flex-1 w-full p-3 text-xs bg-white border-none outline-none resize-vertical leading-6 font-system'"
                placeholder="Compose your message...">
              </app-auto-textarea>
            </div>
          </div>

          <!-- Validation Errors (only shown after submit attempt) -->
          @if (showValidationErrors) {
            <div class="bg-red-100 border-t border-red-300 border-b border-red-300 p-3">
              @if (toRecipients.length === 0) {
                <div class="text-red-700 text-xs font-medium mb-1">At least one recipient is required</div>
              }
              @if (hasInvalidToRecipients) {
                <div class="text-red-700 text-xs font-medium mb-1">Please correct invalid email addresses in To field</div>
              }
              @if (hasInvalidCcRecipients) {
                <div class="text-red-700 text-xs font-medium mb-1">Please correct invalid email addresses in CC field</div>
              }
              @if (hasInvalidBccRecipients) {
                <div class="text-red-700 text-xs font-medium mb-1">Please correct invalid email addresses in BCC field</div>
              }
              @if (!emailData.subject || emailData.subject.trim() === '') {
                <div class="text-red-700 text-xs font-medium mb-1">Subject is required</div>
              }
              @if (!emailData.bodyText || emailData.bodyText.trim() === '') {
                <div class="text-red-700 text-xs font-medium">Message is required</div>
              }
            </div>
          }
        </form>
      </div>
    </div>
  `
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