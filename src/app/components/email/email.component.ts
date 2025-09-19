import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClarityModule } from '@clr/angular';
import { FolderDto } from 'src/app/dtos/folder-dto';
import { MessageDto } from 'src/app/dtos/message-dto';
import { BackendService } from 'src/app/services/backend.service';
import { StorageService, PanelWidths } from 'src/app/services/storage.service';
import { EmailFoldersComponent } from './email-folders.component';
import { EmailMessagesComponent } from './email-messages.component';
import { EmailMessageComponent } from './email-message.component';
import { EmailComposeComponent, ComposeData, ComposeMode } from './email-compose.component';
import { AlertComponent } from '../alert.component';

@Component({
  selector: 'app-email',
  imports: [
    CommonModule, 
    ClarityModule, 
    EmailFoldersComponent, 
    EmailMessagesComponent, 
    EmailMessageComponent,
    EmailComposeComponent,
    AlertComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="email-client" [style]="clientStyles">
      <!-- Loading Overlay -->
      @if (loading) {
        <div class="loading-overlay">
          <clr-spinner clrMedium>Loading...</clr-spinner>
        </div>
      }

      <!-- Error Alert -->
      <app-alert [error]="error" [sticky]="true"></app-alert>
      
      <!-- Success Alert -->
      <app-alert [message]="successMessage" [type]="'success'" [sticky]="true"></app-alert>
      
      <!-- Left Panel: Folders -->
      <div class="panel-container folder-panel-container">
        <app-email-folders
          [selectedFolder]="selectedFolder"
          (folderSelected)="onFolderSelected($event)"
          (foldersLoaded)="onFoldersLoaded($event)"
          (errorOccurred)="onFolderError($event)"
          (messageMovedToFolder)="onMessageMovedToFolder($event)"
          (composeRequested)="startNewEmail()">
        </app-email-folders>
      </div>

      <!-- Resizer between folders and messages -->
      <div class="panel-resizer" 
           (mousedown)="startResize($event, 'folder-message')"
           title="Drag to resize panels">
      </div>

      <!-- Middle Panel: Messages -->
      <div class="panel-container message-panel-container">
        <app-email-messages
          [selectedFolder]="selectedFolder"
          [selectedMessage]="selectedMessage"
          (messageSelected)="onMessageSelected($event)"
          (messagesLoaded)="onMessagesLoaded($event)"
          (messageStatusChanged)="onMessageStatusChanged($event)"
          (errorOccurred)="onMessageError($event)">
        </app-email-messages>
      </div>

      <!-- Resizer between messages and message detail -->
      <div class="panel-resizer" 
           (mousedown)="startResize($event, 'message-detail')"
           title="Drag to resize panels">
      </div>

      <!-- Right Panel: Message Detail or Compose -->
      <div class="panel-container message-detail-panel-container">
        
        <!-- Compose New Email Button -->
        @if (!showCompose && !selectedMessage) {
          <div class="empty-panel">
            <div class="empty-state">
              <cds-icon shape="envelope" size="48"></cds-icon>
              <p class="empty-text">Select a message to view details</p>
              <button 
                class="btn btn-primary"
                (click)="startNewEmail()">
                <cds-icon shape="plus"></cds-icon>
                Compose New Email
              </button>
            </div>
          </div>
        }

        @if (!showCompose && selectedMessage) {
          <app-email-message
            [selectedMessage]="selectedMessage"
            [selectedFolder]="selectedFolder"
            (messageDetailsLoaded)="onMessageDetailsLoaded($event)"
            (messageStatusChanged)="onMessageStatusChanged($event)"
            (messageDeleted)="onMessageDeleted($event)"
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
            (emailSent)="onEmailSent()"
            (composeClosed)="onComposeClosed()"
            (draftSaved)="onDraftSaved($event)"
            (errorOccurred)="onComposeError($event)">
          </app-email-compose>
        }
      </div>
    </div>
  `,
  styles: [`
    ::ng-deep .content-area {
      padding: 0 !important;
    }

    .email-client {
      display: flex;
      height: 100vh;
      height: calc(100vh - 60px);
      background-color: var(--clr-global-app-background);
      position: relative;
    }

    .panel-container {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .folder-panel-container,
    .message-panel-container {
      border-right: 1px solid var(--clr-color-neutral-300);
    }

    .folder-panel-container {
      width: var(--folder-panel-width, 300px);
      min-width: 200px;
      max-width: 500px;
    }

    .message-panel-container {
      width: var(--message-panel-width, 400px);
      min-width: 300px;
      max-width: 600px;
    }

    .message-detail-panel-container {
      flex: 1;
      min-width: 300px;
    }

    .panel-container > * {
      flex: 1;
      height: 100%;
    }

    .panel-resizer {
      width: 4px;
      background: var(--clr-color-neutral-200);
      cursor: col-resize;
      position: relative;
      transition: background-color 0.2s ease;
      flex-shrink: 0;
    }

    .panel-resizer:hover {
      background: var(--clr-color-action-600);
    }

    .panel-resizer.resizing {
      background: var(--clr-color-action-600);
    }

    .email-client.resizing {
      cursor: col-resize;
      user-select: none;
    }

    .empty-panel {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--clr-global-app-background);
    }

    .empty-state {
      text-align: center;
      color: var(--clr-color-neutral-600);
    }

    .empty-state cds-icon {
      margin-bottom: 1rem;
      color: var(--clr-color-neutral-400);
    }

    .empty-text {
      font-size: 1.1rem;
      margin-bottom: 1.5rem;
      color: var(--clr-color-neutral-700);
    }

    .empty-state .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin: 0 auto;
    }

    .empty-state .btn cds-icon {
      margin: 0;
      display: flex;
      align-items: center;
    }

    .email-client.resizing * {
      pointer-events: none;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    @media (max-width: 768px) {
      .email-client {
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.25rem;
      }

      .panel-resizer {
        display: none;
      }

      .folder-panel-container,
      .message-panel-container,
      .message-detail-panel-container {
        width: 100% !important;
        min-width: unset !important;
        max-width: unset !important;
        border-right: none;
        border-bottom: 1px solid var(--clr-color-neutral-300);
      }
    }
  `]
})
export class EmailComponent implements OnInit, OnDestroy {

  selectedFolder: FolderDto | null = null;
  selectedMessage: MessageDto | null = null;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  // Compose functionality
  showCompose = false;
  composeData: ComposeData | null = null;

  @ViewChild(EmailMessagesComponent) emailMessagesComponent!: EmailMessagesComponent;
  @ViewChild(EmailFoldersComponent) emailFoldersComponent!: EmailFoldersComponent;

  // Panel resizing properties
  private panelWidths: PanelWidths = { folderPanel: 300, messagePanel: 400, messageDetailPanel: -1 };
  clientStyles = '';
  private resizing = false;
  private resizeType: 'folder-message' | 'message-detail' | null = null;
  private startX = 0;
  private startWidths = { folder: 0, message: 0 };

  // Event listeners
  private mouseMoveListener?: (event: MouseEvent) => void;
  private mouseUpListener?: (event: MouseEvent) => void;

  constructor(private backendService: BackendService, private storageService: StorageService, private elementRef: ElementRef) { }

  ngOnInit(): void {
    // Load saved panel widths
    this.panelWidths = this.storageService.getPanelWidths();
    this.updatePanelStyles();
    
    // Folders will be loaded by the EmailFoldersComponent
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    this.removeEventListeners();
  }

  private updatePanelStyles(): void {
    this.clientStyles = `
      --folder-panel-width: ${this.panelWidths.folderPanel}px;
      --message-panel-width: ${this.panelWidths.messagePanel}px;
    `;
  }

  onFolderSelected(folder: FolderDto): void {
    this.selectedFolder = folder;
    this.selectedMessage = null;
  }

  onFoldersLoaded(folders: FolderDto[]): void {
    // Folders are now managed by the EmailFoldersComponent
    // This event can be used if parent component needs to know when folders are loaded
  }

  onFolderError(errorMessage: string): void {
    this.error = errorMessage;
  }

  onMessageSelected(message: MessageDto): void {
    this.selectedMessage = message;
    // Message details will be loaded by the EmailMessageComponent
  }

  onMessagesLoaded(messages: MessageDto[]): void {
    // Messages are now managed by the EmailMessagesComponent
    // This event can be used if parent component needs to know when messages are loaded
  }

  onMessageError(errorMessage: string): void {
    this.error = errorMessage;
  }

  onMessageDetailsLoaded(message: MessageDto): void {
    // Update the selectedMessage with the full details
    this.selectedMessage = message;
  }

  onMessageDetailError(errorMessage: string): void {
    this.error = errorMessage;
  }

  onMessageStatusChanged(statusChange: {messageId: number, seen: boolean}): void {
    // Update the selectedMessage status
    if (this.selectedMessage && this.selectedMessage.id === statusChange.messageId) {
      this.selectedMessage.seen = statusChange.seen;
    }
    
    // Notify EmailMessagesComponent to update the message in the list
    if (this.emailMessagesComponent) {
      this.emailMessagesComponent.updateMessageStatus(statusChange.messageId, statusChange.seen);
    }

    // Update folder unread count
    if (this.emailFoldersComponent && this.selectedFolder) {
      // If message was marked as read, decrease unread count
      // If message was marked as unread, increase unread count
      const increment = statusChange.seen ? -1 : 1;
      this.emailFoldersComponent.updateFolderUnreadCount(this.selectedFolder.name, increment);
    }
  }

  clearError(): void {
    this.error = null;
  }

  /**
   * Reset panel widths to default values
   */
  resetPanelWidths(): void {
    this.storageService.deletePanelWidths();
    this.panelWidths = this.storageService.getPanelWidths();
    this.updatePanelStyles();
  }

  // Panel resizing methods
  startResize(event: MouseEvent, type: 'folder-message' | 'message-detail'): void {
    event.preventDefault();
    event.stopPropagation();

    this.resizing = true;
    this.resizeType = type;
    this.startX = event.clientX;
    
    // Store current widths
    this.startWidths.folder = this.panelWidths.folderPanel;
    this.startWidths.message = this.panelWidths.messagePanel;

    // Add resizing class to client
    const emailClient = this.elementRef.nativeElement.querySelector('.email-client');
    if (emailClient) {
      emailClient.classList.add('resizing');
    }

    // Add resizing class to the resizer
    const target = event.target as HTMLElement;
    target.classList.add('resizing');

    // Add global event listeners
    this.mouseMoveListener = this.onMouseMove.bind(this);
    this.mouseUpListener = this.onMouseUp.bind(this);
    
    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseup', this.mouseUpListener);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.resizing || !this.resizeType) return;

    event.preventDefault();
    const deltaX = event.clientX - this.startX;

    if (this.resizeType === 'folder-message') {
      // Resize folder panel
      const newFolderWidth = Math.max(200, Math.min(500, this.startWidths.folder + deltaX));
      this.panelWidths.folderPanel = newFolderWidth;
    } else if (this.resizeType === 'message-detail') {
      // Resize message panel
      const newMessageWidth = Math.max(300, Math.min(600, this.startWidths.message + deltaX));
      this.panelWidths.messagePanel = newMessageWidth;
    }

    this.updatePanelStyles();
  }

  private onMouseUp(event: MouseEvent): void {
    if (!this.resizing) return;

    this.resizing = false;
    this.resizeType = null;

    // Remove resizing class
    const emailClient = this.elementRef.nativeElement.querySelector('.email-client');
    if (emailClient) {
      emailClient.classList.remove('resizing');
    }

    // Remove resizing class from all resizers
    const resizers = this.elementRef.nativeElement.querySelectorAll('.panel-resizer');
    resizers.forEach((resizer: HTMLElement) => {
      resizer.classList.remove('resizing');
    });

    // Save the new widths
    this.storageService.setPanelWidths(this.panelWidths);

    // Remove global event listeners
    this.removeEventListeners();
  }

  private removeEventListeners(): void {
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
      this.mouseMoveListener = undefined;
    }
    if (this.mouseUpListener) {
      document.removeEventListener('mouseup', this.mouseUpListener);
      this.mouseUpListener = undefined;
    }
  }

  onMessageMovedToFolder(event: {messageId: number, sourceFolder: string, targetFolder: string, wasUnread: boolean}): void {
    // Show loading state
    this.loading = true;
    
    this.backendService.moveEmail(event.messageId, event.sourceFolder, event.targetFolder).subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.success) {
          // Update folder counts for both source and target folders
          if (this.emailFoldersComponent) {
            // Source folder: decrease both total and unread counts (if applicable)
            const unreadDecrement = event.wasUnread ? -1 : 0;
            this.emailFoldersComponent.updateFolderCounts(event.sourceFolder, unreadDecrement, -1);
            
            // Target folder: increase both total and unread counts (if applicable)
            const unreadIncrement = event.wasUnread ? 1 : 0;
            this.emailFoldersComponent.updateFolderCounts(event.targetFolder, unreadIncrement, 1);
          }
          
          // Refresh the messages list if we're currently viewing the source folder
          if (this.selectedFolder && this.selectedFolder.name === event.sourceFolder) {
            if (this.emailMessagesComponent) {
              this.emailMessagesComponent.refreshMessages();
            }
          }
          
          // Clear the selected message if it was the one that was moved
          if (this.selectedMessage && this.selectedMessage.id === event.messageId) {
            this.selectedMessage = null;
          }
        } else {
          this.error = 'Failed to move email';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to move email: ' + (err.message || 'Unknown error');
      }
    });
  }

  onMessageDeleted(event: {messageId: number, sourceFolder: string, targetFolder: string, wasUnread: boolean}): void {
    // Update folder counts for both source and target folders
    if (this.emailFoldersComponent) {
      // Source folder: decrease both total and unread counts (if applicable)
      const unreadDecrement = event.wasUnread ? -1 : 0;
      this.emailFoldersComponent.updateFolderCounts(event.sourceFolder, unreadDecrement, -1);
      
      // Target folder (trash): increase both total and unread counts (if applicable)
      const unreadIncrement = event.wasUnread ? 1 : 0;
      this.emailFoldersComponent.updateFolderCounts(event.targetFolder, unreadIncrement, 1);
    }
    
    // Refresh the messages list if we're currently viewing the source folder
    if (this.selectedFolder && this.selectedFolder.name === event.sourceFolder) {
      if (this.emailMessagesComponent) {
        this.emailMessagesComponent.refreshMessages();
      }
    }
    
    // Clear the selected message if it was the one that was deleted
    if (this.selectedMessage && this.selectedMessage.id === event.messageId) {
      this.selectedMessage = null;
    }
  }

  // Compose functionality methods
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
    
    // Clear any existing errors and show success message
    this.error = null;
    this.successMessage = 'Email sent successfully!';
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
    
    // Update Sent folder count (+1 total)
    if (this.emailFoldersComponent) {
      this.updateSentFolderCount();
    }
    
    // Refresh messages list if we have a selected folder
    if (this.selectedFolder && this.emailMessagesComponent) {
      this.emailMessagesComponent.refreshMessages();
    }
  }

  onDraftSaved(event: { isNew: boolean }): void {
    // Update Draft folder count (+1 total) only for new drafts
    if (event.isNew && this.emailFoldersComponent) {
      this.updateDraftFolderCount();
    }
    
    // Refresh messages list if we're viewing the drafts folder
    if (this.selectedFolder && this.isDraftFolder(this.selectedFolder.name) && this.emailMessagesComponent) {
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

  private updateSentFolderCount(): void {
    // Find and update the sent folder count
    const sentFolder = this.emailFoldersComponent.findSentFolder();
    if (sentFolder) {
      this.emailFoldersComponent.updateFolderTotalCount(sentFolder.name, 1);
    }
  }

  private updateDraftFolderCount(): void {
    // Find and update the draft folder count
    const draftFolder = this.emailFoldersComponent.findDraftFolder();
    if (draftFolder) {
      this.emailFoldersComponent.updateFolderTotalCount(draftFolder.name, 1);
    }
  }

  private isDraftFolder(folderName: string): boolean {
    const draftFolderNames = ['Drafts', 'Draft', 'Entwürfe', 'Entwurf'];
    return draftFolderNames.includes(folderName);
  }

}