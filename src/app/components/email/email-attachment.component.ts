import { Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClarityModule } from '@clr/angular';
import { FileUtilsService } from '../../services/file-utils.service';

@Component({
  selector: 'app-email-attachment',
  imports: [CommonModule, ClarityModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="attachment-container">
      <input 
        type="file" 
        #fileInput
        multiple
        style="display: none"
        [accept]="acceptedTypes"
        (change)="onFileSelected($event)"
      />
      
      @if (attachments && attachments.length > 0) {
        <div class="attachment-grid">
          @for (attachment of attachments; track attachment.name; let i = $index) {
            <div class="attachment-item">
              <cds-icon shape="paperclip" class="attachment-icon"></cds-icon>
              <div class="attachment-info">
                <span class="attachment-name" [title]="attachment.name">{{ attachment.name }}</span>
                <span class="attachment-size">{{ fileUtils.formatFileSize(attachment.size) }}</span>
              </div>
              <button 
                type="button"
                class="btn btn-sm btn-icon remove-attachment-btn"
                (click)="removeAttachment(i)"
                [disabled]="disabled"
                title="Remove attachment">
                <cds-icon shape="times"></cds-icon>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .attachment-container {
      padding: 0.75rem 0.75rem 0.25rem 0.25rem;
      min-height: 2rem;
      display: flex;
      align-items: flex-start;
    }

    .attachment-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      width: 100%;
    }

    .attachment-item {
      display: flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      background: var(--clr-color-neutral-100, #f5f5f5);
      border: 1px solid var(--clr-color-neutral-300, #e0e0e0);
      border-radius: 3px;
      gap: 0.375rem;
      max-width: 250px;
      min-width: 0;
      flex-shrink: 0;
    }

    .attachment-icon {
      color: var(--clr-color-action-600, #0072a3);
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .attachment-info {
      flex: 1;
      min-width: 0;
    }

    .attachment-name {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--clr-color-neutral-800, #2c3e50);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .attachment-size {
      display: block;
      font-size: 0.65rem;
      color: var(--clr-color-neutral-600, #666);
    }

    .remove-attachment-btn {
      width: 1.5rem;
      height: 1.5rem;
      padding: 0.25rem !important;
      min-width: auto !important;
      border-radius: 50%;
      background: transparent;
      border: 1px solid var(--clr-color-neutral-400, #ccc);
      color: var(--clr-color-neutral-600, #666);
      flex-shrink: 0;
    }

    .remove-attachment-btn:hover:not(:disabled) {
      background: var(--clr-color-danger-100, #ffeaea);
      border-color: var(--clr-color-danger-400, #ff6b6b);
      color: var(--clr-color-danger-700, #d63031);
    }

    .remove-attachment-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .remove-attachment-btn cds-icon {
      font-size: 0.75rem;
    }

    @media (max-width: 768px) {
      .attachment-container {
        padding-right: 0.5rem;
      }
      
      .attachment-grid {
        flex-direction: column;
      }
      
      .attachment-item {
        max-width: none;
      }

      .attachment-name {
        font-size: 0.7rem;
      }

      .attachment-size {
        font-size: 0.6rem;
      }
    }
  `]
})
export class EmailAttachmentComponent {
  @Input() attachments: File[] = [];
  @Input() disabled: boolean = false;
  @Input() acceptedTypes: string = '';
  
  @Output() attachmentsChange = new EventEmitter<File[]>();
  @Output() fileAdded = new EventEmitter<File>();
  @Output() fileRemoved = new EventEmitter<File>();
  @Output() error = new EventEmitter<string>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(protected readonly fileUtils: FileUtilsService) {}

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newAttachments = [...this.attachments];
    let hasErrors = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (this.fileUtils.isDuplicateFile(file, newAttachments)) {
        this.error.emit(`File "${file.name}" is already attached`);
        hasErrors = true;
        continue;
      }

      newAttachments.push(file);
      this.fileAdded.emit(file);
    }

    if (newAttachments.length !== this.attachments.length) {
      this.attachments = newAttachments;
      this.attachmentsChange.emit(this.attachments);
    }

    event.target.value = '';
  }

  removeAttachment(index: number): void {
    if (index >= 0 && index < this.attachments.length) {
      const removedFile = this.attachments[index];
      const newAttachments = [...this.attachments];
      newAttachments.splice(index, 1);
      
      this.attachments = newAttachments;
      this.attachmentsChange.emit(this.attachments);
      this.fileRemoved.emit(removedFile);
    }
  }

  openFileDialog(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }
}