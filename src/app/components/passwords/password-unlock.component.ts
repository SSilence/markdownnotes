import { Component, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClarityModule } from '@clr/angular';

@Component({
    selector: 'tr[app-password-unlock]',
    standalone: true,
    imports: [CommonModule, FormsModule, ClarityModule],
    template: `
        <td colspan="4" class="px-4 py-12 text-center">
            <input 
                type="password" 
                class="px-3 py-2 border border-gray-300 rounded text-base inline-block mr-2 w-60" 
                placeholder="master password" 
                [(ngModel)]="password"
                (keyup.enter)="onUnlock()"
                #passwordInput>
            <button 
                class="btn btn-primary !ml-2" 
                (click)="onUnlock()">
                unlock
            </button>
        </td>
    `
})
export class PasswordUnlockComponent implements AfterViewInit {
    @ViewChild('passwordInput') passwordInput!: ElementRef;
    @Output() unlock = new EventEmitter<string>();
    
    password: string = '';

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.passwordInput?.nativeElement.focus();
        }, 400);
    }

    onUnlock(): void {
        if (this.password) {
            this.unlock.emit(this.password);
            this.password = '';
        }
    }
}
