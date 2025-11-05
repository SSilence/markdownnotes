import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClarityModule } from '@clr/angular';

export type ModalType = 'confirm' | 'password' | 'export';

@Component({
    selector: 'app-password-modal',
    standalone: true,
    imports: [CommonModule, ClarityModule],
    template: `
        <div class="fixed inset-0 z-40 bg-black bg-opacity-50"></div>
        <div class="fixed inset-0 z-50 flex items-center justify-center">
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" role="dialog" aria-hidden="true">
                <div class="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 class="text-lg font-bold">{{title}}</h3>
                    <button 
                        aria-label="Close" 
                        class="text-gray-500 hover:text-gray-700" 
                        type="button" 
                        (click)="close.emit()">
                        <cds-icon aria-hidden="true" shape="close"></cds-icon>
                    </button>
                </div>
                <div class="p-6">
                    <ng-content></ng-content>
                </div>
                <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
                    <button 
                        class="btn btn-outline" 
                        type="button" 
                        (click)="close.emit()"
                        [disabled]="loading">
                        {{cancelText}}
                    </button>
                    <button 
                        class="btn"
                        [ngClass]="confirmButtonClass"
                        type="button" 
                        (click)="confirm.emit()"
                        [disabled]="loading">
                        {{confirmText}}
                    </button>
                </div>
            </div>
        </div>
    `
})
export class PasswordModalComponent {
    @Input() title: string = '';
    @Input() confirmText: string = 'Confirm';
    @Input() cancelText: string = 'Cancel';
    @Input() confirmButtonClass: string = 'btn-primary';
    @Input() loading: boolean = false;
    
    @Output() confirm = new EventEmitter<void>();
    @Output() close = new EventEmitter<void>();
}
