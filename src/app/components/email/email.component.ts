import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClarityModule } from '@clr/angular';
import { FolderDto } from 'src/app/dtos/folder-dto';
import { MessageDto } from 'src/app/dtos/message-dto';
import { BackendService } from 'src/app/services/backend.service';
import { StorageService } from 'src/app/services/storage.service';
import { EmailFoldersComponent } from './email-folders.component';
import { EmailMessagesComponent } from './email-messages.component';
import { EmailMessageComponent } from './email-message.component';
import { EmailComposeComponent, ComposeData, ComposeMode } from './email-compose.component';
import { AlertComponent } from '../shared/alert.component';
import { ResizableEmailPanelsComponent } from '../shared/resizable-email-panels.component';
import { Contact } from './recipient-input.component';

@Component({
  selector: 'app-email',
  imports: [
    CommonModule,
    ClarityModule,
    EmailFoldersComponent,
    EmailMessagesComponent,
    EmailMessageComponent,
    EmailComposeComponent,
    AlertComponent,
    ResizableEmailPanelsComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="h-screen h-[calc(100vh-60px)] bg-[var(--clr-global-app-background)] relative">
      <!-- Loading Overlay -->
      @if (loading) {
        <div class="absolute top-0 left-0 right-0 bottom-0 bg-white/80 flex items-center justify-center z-[1000]">
          <clr-spinner clrMedium>Loading...</clr-spinner>
        </div>
      }

      <!-- Error Alert -->
      <app-alert [error]="error" [sticky]="true"></app-alert>

      <!-- Success Alert -->
      <app-alert [message]="successMessage" [type]="'success'" [sticky]="true"></app-alert>

      <!-- Resizable Email Panels -->
      <app-resizable-email-panels>

        <!-- Left Panel: Folders -->
        <app-email-folders
          slot="folders"
          [selectedFolder]="selectedFolder"
          (folderSelected)="onFolderSelected($event)"
          (folderTrashLoaded)="trashFolder = $event"
          (errorOccurred)="onFolderError($event)"
          (messageMovedToFolder)="onMessageMovedToFolder($event)"
          (composeRequested)="startNewEmail()">
        </app-email-folders>

        <!-- Middle Panel: Messages -->
        <app-email-messages
          slot="messages"
          [selectedFolder]="selectedFolder"
          [selectedMessage]="selectedMessage"
          (messageSelected)="onMessageSelected($event)"
          (messageStatusChanged)="onMessageStatusChanged($event)"
          (folderPurged)="onFolderPurged($event)"
          (markedAllAsSeen)="onMarkedAllAsSeen($event)"
          (errorOccurred)="onMessageError($event)">
        </app-email-messages>

        <!-- Right Panel: Message Detail or Compose -->
        <div slot="message-detail">
          @if (!showCompose && !selectedMessage) {
            <div class="h-[calc(100vh-var(--clr-header-height))] flex items-center justify-center bg-[var(--clr-global-app-background)]">
              <div class="text-center text-[var(--clr-color-neutral-600)]">
                <cds-icon shape="envelope" size="48" class="text-[var(--clr-color-neutral-400)]"></cds-icon>
                <p class="text-lg !mb-2 text-[var(--clr-color-neutral-700)]">Select a message to view details</p>
                <button
                  class="btn btn-primary inline-flex items-center justify-center gap-2"
                  (click)="startNewEmail()">
                  <cds-icon shape="plus" class="m-0 flex items-center"></cds-icon>
                  Compose New Email
                </button>
              </div>
            </div>
          }

          @if (!showCompose && selectedMessage) {
            <app-email-message
              [selectedMessage]="selectedMessage"
              [selectedFolder]="selectedFolder"
              [trashFolder]="trashFolder"
              (messageDetailsLoaded)="onMessageDetailsLoaded($event)"
              (messageStatusChanged)="onMessageStatusChanged($event)"
              (messageDeleted)="onMessageDeleted($event)"
              (messageDeleteFailed)="onMessageDeleteFailed($event)"
              (replyRequested)="onReplyRequested($event)"
              (replyAllRequested)="onReplyAllRequested($event)"
              (forwardRequested)="onForwardRequested($event)"
              (editDraftRequested)="onEditDraftRequested($event)"
              (errorOccurred)="onMessageDetailError($event)">
            </app-email-message>
          }

          @if (showCompose) {
            <app-email-compose
              [composeData]="composeData"
              [contacts]="contacts"
              (emailSent)="onEmailSent()"
              (composeClosed)="onComposeClosed()"
              (draftSaved)="onDraftSaved($event)"
              (errorOccurred)="onComposeError($event)">
            </app-email-compose>
          }
        </div>

      </app-resizable-email-panels>
    </div>
  `,
  styles: [`
    ::ng-deep .content-area {
      padding: 0 !important;
    }
  `]
})
export class EmailComponent implements OnInit {
  
  selectedFolder: FolderDto | null = null;
  trashFolder: FolderDto | null = null;
  selectedMessage: MessageDto | null = null;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  // Compose functionality
  showCompose = false;
  composeData: ComposeData | null = null;

  contacts: Contact[] = [];

  @ViewChild(EmailMessagesComponent) emailMessagesComponent!: EmailMessagesComponent;
  @ViewChild(EmailFoldersComponent) emailFoldersComponent!: EmailFoldersComponent;

  constructor(private backendService: BackendService, private storageService: StorageService, private elementRef: ElementRef) { }

  ngOnInit(): void {
    this.loadContacts();
  }

  private loadContacts(): void {
    this.backendService.getImapContacts().subscribe({
      next: (contacts) => {
        this.contacts = contacts.map(addr => ({
          email: addr.email,
          name: addr.name || addr.email,
          type: 'contact' as const,
          count: 1
        }));
      },
      error: (error) => {
        console.error('Failed to load contacts:', error);
      }
    });
  }

  onFolderSelected(folder: FolderDto): void {
    this.selectedFolder = folder;
    this.selectedMessage = null;
  }

  onFolderError(errorMessage: string): void {
    this.error = errorMessage;
  }

  onMessageSelected(message: MessageDto): void {
    this.selectedMessage = message;
  }

  onMessageError(errorMessage: string): void {
    this.error = errorMessage;
  }

  onMessageDetailsLoaded(message: MessageDto): void {
    this.selectedMessage = message;
  }

  onMessageDetailError(errorMessage: string): void {
    this.error = errorMessage;
  }

  onMessageStatusChanged(statusChange: {messageId: number, seen: boolean}): void {
    // Update the selectedMessage status
    if (this.selectedMessage && this.selectedMessage.id === statusChange.messageId) {
      this.selectedMessage.isSeen = statusChange.seen;
    }
    
    // Notify EmailMessagesComponent to update the message in the list
    if (this.emailMessagesComponent) {
      this.emailMessagesComponent.updateMessageStatus(statusChange.messageId, statusChange.seen);
    }

    // Update folder unread count
    if (this.emailFoldersComponent && this.selectedFolder) {
      this.emailFoldersComponent.updateFolderCounts();
    }
  }

  clearError(): void {
    this.error = null;
  }

  onMessageMovedToFolder(event: {messageId: number, sourceFolder: string, targetFolder: string, wasUnread: boolean}): void {
    this.loading = true;
    this.backendService.moveEmail(event.messageId, event.sourceFolder, event.targetFolder).subscribe({
      next: (response) => {
        this.loading = false;

        if (this.emailFoldersComponent) {
          this.emailFoldersComponent.updateFolderCounts();
        }

        if (this.selectedFolder && this.selectedFolder.name === event.sourceFolder && this.emailMessagesComponent) {
          this.emailMessagesComponent.refreshMessages();
        }

        if (this.selectedMessage && this.selectedMessage.id === event.messageId) {
          this.selectedMessage = null;
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to move email: ' + (err.message || 'Unknown error');
      }
    });
  }

  onMessageDeleted(event: {messageId: number, sourceFolder: string, targetFolder: string, wasUnread: boolean}): void {
    let nextMessage: MessageDto | null = null;

    if (this.emailMessagesComponent && this.selectedFolder && this.selectedFolder.name === event.sourceFolder) {
      const messageIndex = this.emailMessagesComponent.messages.findIndex(msg => msg.id === event.messageId);
      if (messageIndex > -1) {
        if (this.selectedMessage && this.selectedMessage.id === event.messageId) {
          // Try to select the next message in the list (same index after deletion)
          if (messageIndex < this.emailMessagesComponent.messages.length - 1) {
            nextMessage = this.emailMessagesComponent.messages[messageIndex + 1];
          }
          // If we deleted the last message, select the previous one
          else if (messageIndex > 0) {
            nextMessage = this.emailMessagesComponent.messages[messageIndex - 1];
          }
        }
        this.emailMessagesComponent.removeMessageOptimistically(event.messageId);
      }
    }

    // Update selected message - either select next message or clear selection
    if (this.selectedMessage && this.selectedMessage.id === event.messageId) {
      this.selectedMessage = nextMessage;

      // If we selected a new message, trigger selection in the messages component
      // Use skipBackendCall=true to avoid automatically marking as read during auto-selection
      if (nextMessage && this.emailMessagesComponent) {
        this.emailMessagesComponent.selectMessage(nextMessage);
      }
    }

    // Update folder counts for both source and target folders
    if (this.emailFoldersComponent) {
      this.emailFoldersComponent.updateFolderCounts();
    }
  }

  onMessageDeleteFailed(event: {messageId: number, sourceFolder: string, error: string}): void {
    this.error = event.error;
  }

  startNewEmail(): void {
    this.composeData = { mode: ComposeMode.NEW };
    this.showCompose = true;
  }

  onReplyRequested(message: MessageDto): void {
    this.composeData = { mode: ComposeMode.REPLY, originalMessage: message };
    this.showCompose = true;
  }

  onReplyAllRequested(message: MessageDto): void {
    this.composeData = { mode: ComposeMode.REPLY_ALL, originalMessage: message };
    this.showCompose = true;
  }

  onForwardRequested(message: MessageDto): void {
    this.composeData = { mode: ComposeMode.FORWARD, originalMessage: message };
    this.showCompose = true;
  }

  onEditDraftRequested(message: MessageDto): void {
    this.composeData = { mode: ComposeMode.EDIT_DRAFT, originalMessage: message };
    this.showCompose = true;
  }

  onEmailSent(): void {
    this.showCompose = false;
    this.composeData = null;
    
    this.error = null;
    this.successMessage = 'Email sent successfully!';
    
    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
    
    if (this.emailFoldersComponent) {
      this.emailFoldersComponent.updateFolderCounts();
    }
    
    if (this.selectedFolder && this.emailMessagesComponent) {
      this.emailMessagesComponent.refreshMessages();
    }
  }

  onDraftSaved(event: { isNew: boolean }): void {
    if (event.isNew && this.emailFoldersComponent) {
      this.emailFoldersComponent.updateFolderCounts();
    }
    
    if (this.emailFoldersComponent.isDraftFolderSelected()) {
      this.emailMessagesComponent.refreshMessages();
    }
  }

  onComposeClosed(): void {
    this.showCompose = false;
    this.composeData = null;
  }

  onComposeError(error: string): void {
    this.error = error;
  }

  onFolderPurged(folderName: string): void {
    // Update folder counts after purge
    if (this.emailFoldersComponent) {
      this.emailFoldersComponent.updateFolderCounts();
    }

    // Clear selected message since all messages were purged
    this.selectedMessage = null;

    // Show success message
    this.error = null;
    this.successMessage = `Successfully purged all emails from "${folderName}" folder.`;

    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
  }

  onMarkedAllAsSeen(folderName: string): void {
    if (this.emailFoldersComponent) {
      this.emailFoldersComponent.updateFolderCounts();
    }
  }

}