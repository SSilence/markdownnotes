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
    <div class="recipient-field">
      <div class="recipient-chips">
        @for (recipient of recipients; track recipient.email) {
          <div class="recipient-chip" [class.invalid]="!recipient.isValid">
            <span class="recipient-text">{{ recipient.displayText }}</span>
            <button 
              type="button" 
              class="remove-chip"
              (click)="removeRecipient($index)"
              tabindex="-1">
              <cds-icon shape="times" size="12"></cds-icon>
            </button>
          </div>
        }
        <input 
          #recipientInput
          type="text"
          class="recipient-input"
          [placeholder]="placeholder"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"
          (blur)="onBlur()"
          (focus)="onFocus()"
        />
      </div>
      
      @if (showSuggestions && filteredContacts.length > 0) {
        <div class="suggestions-dropdown">
          @for (contact of filteredContacts; track contact.email) {
            <div 
              class="suggestion-item"
              [class.selected]="$index === selectedSuggestionIndex"
              (mousedown)="selectSuggestion(contact)">
              <div class="suggestion-name">{{ contact.name || contact.email }}</div>
              @if (contact.name && contact.name !== contact.email) {
                <div class="suggestion-email">{{ contact.email }}</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .recipient-field {
      flex: 1;
      position: relative;
    }

    .recipient-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      min-height: 2rem;
      border: none;
      align-items: center;
      background: white;
    }

    .recipient-chip {
      display: inline-flex;
      align-items: center;
      background: var(--clr-color-primary-100, #e3f2fd);
      border: 1px solid var(--clr-color-primary-300, #81c784);
      border-radius: 16px;
      padding: 0.2rem 0.6rem;
      font-size: 0.75rem;
      color: var(--clr-color-primary-800, #1976d2);
      max-width: 300px;
      user-select: none;
      transition: all 0.2s ease;
    }

    .recipient-chip.invalid {
      background: var(--clr-color-danger-100, #ffeaea);
      border-color: var(--clr-color-danger-300, #ff6b6b);
      color: var(--clr-color-danger-700, #d63031);
    }

    .recipient-chip:hover {
      background: var(--clr-color-primary-200, #bbdefb);
      border-color: var(--clr-color-primary-400, #42a5f5);
    }

    .recipient-chip.invalid:hover {
      background: var(--clr-color-danger-200, #ffb3b3);
      border-color: var(--clr-color-danger-400, #ff5252);
    }

    .recipient-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 0.3rem;
      font-weight: 500;
    }

    .remove-chip {
      background: none;
      border: none;
      color: var(--clr-color-primary-600, #1976d2);
      cursor: pointer;
      padding: 0;
      margin: 0;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .remove-chip:hover {
      background: var(--clr-color-primary-300, #64b5f6);
      color: white;
    }

    .recipient-chip.invalid .remove-chip {
      color: var(--clr-color-danger-600, #d32f2f);
    }

    .recipient-chip.invalid .remove-chip:hover {
      background: var(--clr-color-danger-400, #ff5252);
      color: white;
    }

    .recipient-input {
      border: none;
      outline: none;
      font-size: 0.70rem;
      background: transparent;
      flex: 1;
      min-width: 120px;
      height: 1.5rem;
      line-height: 1.5rem;
      padding:0;
    }

    .recipient-input::placeholder {
      color: var(--clr-color-neutral-500, #999);
    }

    .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid var(--clr-color-neutral-300, #e0e0e0);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      max-height: 200px;
      overflow-y: auto;
    }

    .suggestion-item {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid var(--clr-color-neutral-200, #f0f0f0);
      transition: background-color 0.15s ease;
    }

    .suggestion-item:last-child {
      border-bottom: none;
    }

    .suggestion-item:hover,
    .suggestion-item.selected {
      background: var(--clr-color-primary-50, #f3f9ff);
    }

    .suggestion-name {
      font-weight: 500;
      color: var(--clr-color-neutral-900, #000);
      font-size: 0.8rem;
    }

    .suggestion-email {
      font-size: 0.7rem;
      color: var(--clr-color-neutral-600, #666);
      margin-top: 0.1rem;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .recipient-chips {
        min-height: 3rem;
        padding: 0.5rem;
      }

      .recipient-chip {
        font-size: 0.7rem;
        padding: 0.3rem 0.8rem;
        margin-bottom: 0.2rem;
      }

      .recipient-input {
        min-width: 100px;
        font-size: 0.8rem;
      }

      .suggestions-dropdown {
        position: fixed;
        left: 1rem;
        right: 1rem;
        max-height: 150px;
      }
    }
  `]
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