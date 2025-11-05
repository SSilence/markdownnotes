import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-auto-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AutoTextareaComponent),
      multi: true,
    },
  ],
  template: `
      <textarea
        #plainTextarea
        [placeholder]="placeholder"
        [(ngModel)]="value"
        (input)="onInput()"
        (blur)="onTouched()"
        (click)="onClicked()"
        [attr.rows]="minRows"
        [ngClass]="['resize-none overflow-hidden min-h-[1.5em]', styleClass]">
      </textarea>
  `
})
export class AutoTextareaComponent implements ControlValueAccessor, AfterViewInit {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() minRows: number = 1;
  @Input() styleClass: string = '';
  @Output() clicked = new EventEmitter<void>();
  
  onClicked(): void {
    this.clicked.emit();
  }

  @ViewChild('plainTextarea') plainTextarea?: ElementRef<HTMLTextAreaElement>;

  value: string = '';

  private onChange = (value: string) => {};
  private _onTouched = () => {};

  onTouched(): void {
    this._onTouched();
  }

  ngAfterViewInit(): void {
    this.adjustHeight();
  }

  writeValue(value: string): void {
    this.value = value || '';
    requestAnimationFrame(() => this.adjustHeight());
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    const element = this.plainTextarea?.nativeElement
    if (element) {
      element.disabled = isDisabled;
    }
  }

  onInput(): void {
    this.onChange(this.value);
    this.adjustHeight();
  }

  private adjustHeight(): void {
    const element = this.plainTextarea?.nativeElement;
    if (!element) return;

    // Reset height to allow shrinking
    element.style.height = 'auto';
    // Set height to scroll height to fit content
    element.style.height = element.scrollHeight + 'px';
  }
}
