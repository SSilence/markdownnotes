import { Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClarityModule } from '@clr/angular';
import { FileUtilsService } from '../../services/file-utils.service';

@Component({
  selector: 'app-email-attachment',
  imports: [CommonModule, ClarityModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class=" flex items-start min-h-8">
      <input 
        type="file" 
        #fileInput
        multiple
        style="display: none"
        [accept]="acceptedTypes"
        (change)="onFileSelected($event)"
      />
      
      @if (attachments && attachments.length > 0) {
        <div class="flex flex-wrap gap-2 w-full">
          @for (attachment of attachments; track attachment.name; let i = $index) {
            <div class="flex items-center px-2 py-1 bg-gray-100 border border-gray-300 rounded gap-1.5 max-w-xs min-w-0 flex-shrink-0">
              <cds-icon shape="paperclip" class="text-blue-600 text-sm flex-shrink-0"></cds-icon>
              <div class="flex-1 min-w-0">
                <span class="block text-xs font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis" [title]="attachment.name">{{ attachment.name }}</span>
                <span class="block text-xs text-gray-600">{{ fileUtils.formatFileSize(attachment.size) }}</span>
              </div>
              <button 
                type="button"
                class="btn btn-icon btn-sm w-6 h-6 p-0 flex-shrink-0 rounded-full border border-gray-400 bg-transparent hover:bg-red-100 hover:border-red-400 hover:text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                (click)="removeAttachment(i)"
                [disabled]="disabled"
                title="Remove attachment">
                <cds-icon shape="times" class="text-xs"></cds-icon>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `
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