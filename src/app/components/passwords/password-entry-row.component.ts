import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClarityModule } from '@clr/angular';
import { PasswordEntry } from 'src/app/models/password-entry';

@Component({
    selector: 'tr[app-password-entry-row]',
    standalone: true,
    imports: [CommonModule, FormsModule, ClarityModule],
    template: `
        <td class="py-3">
            <div class="flex items-center justify-center min-h-10">
                @if (!entry.edit) {
                    <span class="inline-block">{{entry.service}}</span>
                } @else {
                    <input 
                        type="text" 
                        [(ngModel)]="entry.service" 
                        #serviceInput
                        class="w-full px-2 py-1 border border-gray-300 !p-2 !rounded text-base bg-white">
                }
            </div>
        </td>
            <td class="py-3">
                <div class="flex items-center justify-center min-h-10">
                    @if (!entry.edit) {
                        <span class="inline-block">{{entry.username}}</span>
                    } @else {
                        <input 
                            type="text" 
                            [(ngModel)]="entry.username" 
                            class="w-full px-2 py-1 border border-gray-300 !p-2 !rounded text-base bg-white">
                    }
                </div>
            </td>
            <td class="py-3">
                <div class="flex items-center justify-center min-h-10">
                    @if (!entry.edit) {
                        <span class="inline-block">{{entry.passwordShow || entry.edit ? entry.decryptedPassword : '********'}}</span>
                    } @else {
                        <clr-password-container class="!m-0">
                            <input 
                                [type]="entry.passwordShow ? 'text' : 'password'" 
                                clrPassword 
                                [(ngModel)]="entry.decryptedPassword" 
                                (input)="onPasswordInput($event)"
                                class="w-full px-2 py-1 border border-gray-300 rounded text-base bg-white">
                        </clr-password-container>
                    }
                    @if (!entry.passwordShow && !entry.edit) {
                        <cds-icon class="ml-1 cursor-pointer" shape="eye" size="16" (click)="togglePassword.emit()"></cds-icon>
                    }
                    @if (entry.passwordShow && !entry.edit) {
                        <cds-icon class="ml-1 cursor-pointer" shape="eye-hide" size="16" (click)="togglePassword.emit()"></cds-icon>
                    }
                </div>
            </td>
            <td class="py-3">
                <div class="flex items-center min-h-10">
                    @if (entry.edit) {
                        <button type="button" class="btn btn-icon btn-sm" (click)="generatePassword.emit()">
                            <cds-icon shape="wand"></cds-icon>
                        </button>
                        <button type="button" class="btn btn-icon btn-sm btn-success" (click)="stopEdit.emit()">
                            <cds-icon shape="check"></cds-icon>
                        </button>
                        <button type="button" class="btn btn-icon btn-sm btn-danger" (click)="delete.emit()">
                            <cds-icon shape="trash"></cds-icon>
                        </button>
                    } @else {
                        <button class="btn btn-icon btn-sm" (click)="startEdit.emit()">
                            <cds-icon shape="pencil"></cds-icon> edit
                        </button>
                        <button class="btn btn-icon btn-sm btn-primary" (click)="copyPassword.emit()">
                            <cds-icon shape="copy-to-clipboard"></cds-icon> copy password
                        </button>
                    }
                </div>
            </td>
    `
})
export class PasswordEntryRowComponent {
    @Input() entry!: PasswordEntry;
    @Output() startEdit = new EventEmitter<void>();
    @Output() stopEdit = new EventEmitter<void>();
    @Output() delete = new EventEmitter<void>();
    @Output() generatePassword = new EventEmitter<void>();
    @Output() copyPassword = new EventEmitter<void>();
    @Output() togglePassword = new EventEmitter<void>();
    @Output() passwordChange = new EventEmitter<string>();

    onPasswordInput(event: any): void {
        this.passwordChange.emit(event.target.value);
    }
}
