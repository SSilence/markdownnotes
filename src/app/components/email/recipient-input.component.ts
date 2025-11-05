import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClarityModule } from '@clr/angular';

export interface RecipientChip {
  email: string;
  name?: string;
  displayText: string;
  isValid: boolean;
}

export interface Contact {
  email: string;
  name: string;
  type: string;
  count: number;
}

@Component({
  selector: 'app-recipient-input',
  imports: [CommonModule, ClarityModule],
  template: `
    <div class="flex-1 relative">
      <div class="flex flex-wrap gap-1 p-1 px-2 min-h-8 border-0 items-center bg-white">
        @for (recipient of recipients; track recipient.email) {
          <div class="inline-flex items-center bg-[var(--clr-color-primary-100,#e3f2fd)] border border-[var(--clr-color-primary-300,#81c784)] rounded-2xl px-2.5 py-0.5 text-xs text-[var(--clr-color-primary-800,#1976d2)] max-w-[300px] select-none transition-all duration-200 ease-out hover:bg-[var(--clr-color-primary-200,#bbdefb)] hover:border-[var(--clr-color-primary-400,#42a5f5)]"
               [class.bg-[var(--clr-color-danger-100,#ffeaea)]]="!recipient.isValid"
               [class.border-[var(--clr-color-danger-300,#ff6b6b)]]="!recipient.isValid"
               [class.text-[var(--clr-color-danger-700,#d63031)]]="!recipient.isValid"
               [class.hover:bg-[var(--clr-color-danger-200,#ffb3b3)]]="!recipient.isValid"
               [class.hover:border-[var(--clr-color-danger-400,#ff5252)]]="!recipient.isValid">
            <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap mr-1 font-medium">{{ recipient.displayText }}</span>
            <button 
              type="button" 
              class="bg-transparent border-0 text-[var(--clr-color-primary-600,#1976d2)] cursor-pointer p-0 m-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ease-out flex-shrink-0 hover:bg-[var(--clr-color-primary-300,#64b5f6)] hover:text-white"
              [class.text-[var(--clr-color-danger-600,#d32f2f)]]="!recipient.isValid"
              [class.hover:bg-[var(--clr-color-danger-400,#ff5252)]]="!recipient.isValid"
              (click)="removeRecipient($index)"
              tabindex="-1">
              <cds-icon shape="times" size="12"></cds-icon>
            </button>
          </div>
        }
        <input 
          #recipientInput
          type="text"
          class="border-0 outline-0 text-[0.70rem] bg-transparent flex-1 min-w-[300px] h-8 leading-8 p-0 placeholder:text-[var(--clr-color-neutral-500,#999)]"
          autocomplete="off"
          [placeholder]="placeholder"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"
          (blur)="onBlur()"
          (focus)="onFocus()"
        />
      </div>
      
      @if (showSuggestions && filteredContacts.length > 0) {
        <div class="absolute top-full left-0 right-0 bg-white border border-[var(--clr-color-neutral-300,#e0e0e0)] rounded shadow-[0_2px_8px_rgba(0,0,0,0.15)] z-[1000] max-h-[200px] overflow-y-auto">
          @for (contact of filteredContacts; track contact.email) {
            <div 
              class="p-2 px-3 cursor-pointer border-b border-[var(--clr-color-neutral-200,#f0f0f0)] transition-colors duration-150 ease-out last:border-b-0 hover:bg-[var(--clr-color-primary-50,#f3f9ff)]"
              [class.bg-[var(--clr-color-primary-50,#f3f9ff)]]="$index === selectedSuggestionIndex"
              (mousedown)="selectSuggestion(contact)">
              <div class="font-medium text-[var(--clr-color-neutral-900,#000)] text-[0.8rem]">{{ contact.name || contact.email }}</div>
              @if (contact.name && contact.name !== contact.email) {
                <div class="text-[0.7rem] text-[var(--clr-color-neutral-600,#666)] mt-0.5">{{ contact.email }}</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class RecipientInputComponent implements OnInit {
  @Input() recipients: RecipientChip[] = [];
  @Input() contacts: Contact[] = [];
  @Input() placeholder: string = 'Enter email address';
  @Output() recipientsChange = new EventEmitter<RecipientChip[]>();

  @ViewChild('recipientInput') inputRef!: ElementRef<HTMLInputElement>;

  currentInput = '';
  showSuggestions = false;
  selectedSuggestionIndex = -1;
  filteredContacts: Contact[] = [];

  ngOnInit(): void {
    this.updateFilteredContacts();
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.currentInput = target.value;
    this.showSuggestions = this.currentInput.length > 0;
    this.updateFilteredContacts();
    this.selectedSuggestionIndex = -1;
  }

  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ',':
      case ';':
        event.preventDefault();
        this.addRecipientFromInput();
        break;
      case 'Backspace':
        if (!this.currentInput && this.recipients.length > 0) {
          this.removeRecipient(this.recipients.length - 1);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (this.filteredContacts.length > 0) {
          this.selectedSuggestionIndex = Math.min(this.selectedSuggestionIndex + 1, this.filteredContacts.length - 1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.filteredContacts.length > 0) {
          this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
        }
        break;
      case 'Tab':
        if (this.selectedSuggestionIndex >= 0 && this.filteredContacts.length > 0) {
          event.preventDefault();
          this.selectSuggestion(this.filteredContacts[this.selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        this.hideSuggestions();
        break;
    }
  }

  onBlur(): void {
    // Delay hiding suggestions to allow click selection
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  onFocus(): void {
    if (this.currentInput.length > 0) {
      this.showSuggestions = true;
      this.updateFilteredContacts();
    }
  }

  private updateFilteredContacts(): void {
    if (!this.currentInput || this.currentInput.length < 2) {
      this.filteredContacts = this.contacts.slice(0, 8);
    } else {
      const lowerQuery = this.currentInput.toLowerCase();
      this.filteredContacts = this.contacts
        .filter(contact => 
          contact.email.toLowerCase().includes(lowerQuery) ||
          (contact.name && contact.name.toLowerCase().includes(lowerQuery))
        )
        .slice(0, 10);
    }
  }

  private addRecipientFromInput(): void {
    if (!this.currentInput.trim()) return;
    
    const recipient = this.parseRecipient(this.currentInput);
    if (recipient) {
      this.addRecipient(recipient);
      this.clearInput();
      this.hideSuggestions();
    }
  }

  private parseRecipient(input: string): RecipientChip | null {
    const trimmedInput = input.trim();
    if (!trimmedInput) return null;
    
    // Check if it matches "Name <email>" format
    const nameEmailMatch = trimmedInput.match(/^(.+?)\s*<([^>]+)>$/);
    if (nameEmailMatch) {
      const name = nameEmailMatch[1].trim();
      const email = nameEmailMatch[2].trim();
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

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private addRecipient(recipient: RecipientChip): void {
    // Check if recipient already exists
    if (!this.recipients.find(r => r.email === recipient.email)) {
      const updatedRecipients = [...this.recipients, recipient];
      this.recipientsChange.emit(updatedRecipients);
    }
  }

  removeRecipient(index: number): void {
    const updatedRecipients = [...this.recipients];
    updatedRecipients.splice(index, 1);
    this.recipientsChange.emit(updatedRecipients);
  }

  selectSuggestion(contact: Contact): void {
    const recipient = this.parseRecipient(contact.name ? `${contact.name} <${contact.email}>` : contact.email);
    if (recipient) {
      this.addRecipient(recipient);
      this.clearInput();
      this.hideSuggestions();
    }
  }

  private clearInput(): void {
    this.currentInput = '';
    if (this.inputRef) {
      this.inputRef.nativeElement.value = '';
    }
  }

  private hideSuggestions(): void {
    this.showSuggestions = false;
    this.selectedSuggestionIndex = -1;
  }

  // Public method to clear input (can be called from parent)
  clearInputField(): void {
    this.clearInput();
    this.hideSuggestions();
  }

  // Public method to focus input
  focusInput(): void {
    if (this.inputRef) {
      this.inputRef.nativeElement.focus();
    }
  }
}