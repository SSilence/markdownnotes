import { Component, OnInit, OnDestroy, ViewChild, HostListener, inject, ElementRef } from '@angular/core';
import { ClipboardService } from 'ngx-clipboard'
import { timer, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ClarityModule } from '@clr/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Page } from 'src/app/models/page';
import { BackendService } from 'src/app/services/backend.service';
import { PasswordEntry } from 'src/app/models/password-entry';
import { PasswordsState, initialPasswordsState } from 'src/app/models/passwords-state';
import { PasswordManagementService } from 'src/app/services/password-management.service';
import { PasswordImportExportService } from 'src/app/services/password-import-export.service';
import { AlertComponent } from '../shared/alert.component';
import { PasswordEntryRowComponent } from './password-entry-row.component';
import { PasswordModalComponent } from './password-modal.component';
import { PasswordUnlockComponent } from './password-unlock.component';

@Component({
    selector: 'app-passwords',
    imports: [
        AlertComponent, 
        ClarityModule, 
        CommonModule, 
        RouterModule, 
        FormsModule,
        PasswordEntryRowComponent,
        PasswordModalComponent,
        PasswordUnlockComponent
    ],
    template: `
        <h1 class="!mt-0 text-3xl font-bold">Passwords</h1>

        @if (!state.page && !state.errors.general) {
            <span class="spinner spinner-inline">Loading...</span>
        }

        <app-alert [error]="state.errors.general"></app-alert>

        <div class="overflow-x-auto">
            <table class="table w-full">
                @if (hasEntries()) {
                    <thead>
                        <tr>
                            <th class="w-1/5">Service</th>
                            <th class="w-1/5">Username</th>
                            <th class="w-1/5">Password</th>
                            <th class="w-2/5">
                                <div class="flex gap-2 items-center">
                                    <input 
                                        placeholder="search" 
                                        name="input" 
                                        class="flex-1 p-2 border border-gray-300 !rounded-lg font-normal text-sm bg-white" 
                                        [(ngModel)]="state.searchQuery" 
                                        #searchInput />
                                    <button type="button" class="btn btn-icon btn-sm btn-link" (click)="addEntry()">
                                        <cds-icon shape="add-text"></cds-icon> add
                                    </button>
                                </div>
                            </th>
                        </tr>
                    </thead>
                }
                <tbody>
                    @for (entry of getFilteredEntries(); track $index; let i = $index) {
                        <tr app-password-entry-row class="hover:bg-gray-50"
                            [entry]="entry"
                            (startEdit)="startEditingEntry(entry)"
                            (stopEdit)="stopEditingEntry(entry)"
                            (delete)="state.modals.deleteConfirmation = i"
                            (generatePassword)="generateRandomPassword(entry)"
                            (copyPassword)="copyPasswordAtIndex(i)"
                            (togglePassword)="togglePasswordVisibility(entry)"
                            (passwordChange)="onPasswordChange($event, entry)">
                        </tr>
                    }
                    
                    @if (!state.entries && state.page) {
                        <tr app-password-unlock (unlock)="onUnlock($event)"></tr>
                    }
                    
                    @if (state.entries) {
                        <tr>
                            <td colspan="4" class="px-4 py-2">
                                <div class="flex items-center justify-start">
                                    <button type="button" class="btn btn-icon btn-sm btn-link" (click)="addEntry()">
                                        <cds-icon shape="add-text"></cds-icon> add
                                    </button>
                                </div>
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>

        @if (state.entries && state.page) {
            <div class="mt-6 space-x-2">
                <button class="btn" [ngClass]="{'btn-success-outline': state.ui.success, 'btn-primary': !state.ui.success}" (click)="showSaveModal()">save</button>
                <button class="btn btn-info-outline" (click)="showExportModal()">export</button>
                <button class="btn btn-warning-outline" (click)="fileInput.click()">import</button>
                <button class="btn btn-link" [routerLink]="['/']">cancel</button>
                <input type="file" name="file" (change)="import($event)" class="hidden" #fileInput>
                
                @if (state.ui.success || state.ui.successImport || state.ui.successExport) {
                    <div class="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded" role="alert">
                        <div class="flex items-center gap-2">
                            <cds-icon class="text-green-600" shape="check-circle"></cds-icon>
                            @if (state.ui.success) {
                                <span>successfully saved</span>
                            }
                            @if (state.ui.successImport) {
                                <span>successfully imported</span>
                            }
                            @if (state.ui.successExport) {
                                <span>successfully saved to clipboard</span>
                            }
                        </div>
                    </div>
                }
            </div>
        }

        <!-- Delete Confirmation Modal -->
        @if (state.modals.deleteConfirmation !== null) {
            <app-password-modal
                title="Confirm Deletion"
                confirmText="delete"
                cancelText="cancel"
                confirmButtonClass="btn-danger"
                (confirm)="deleteEntry(state.modals.deleteConfirmation)"
                (close)="state.modals.deleteConfirmation = null">
                <p class="text-lg">Really delete {{state.entries![state.modals.deleteConfirmation].service}}?</p>
            </app-password-modal>
        }

        <!-- Save Password Modal -->
        @if (state.modals.askPassword) {
            <app-password-modal
                title="Please enter your master password"
                confirmText="save"
                cancelText="cancel"
                confirmButtonClass="btn-danger"
                [loading]="state.ui.saving"
                (confirm)="save(passwordInput.value, password2Input.value); passwordInput.value=''; password2Input.value=''"
                (close)="closeSaveModal()">
                @if(state.ui.saving) {
                    <div class="text-center">
                        <span class="spinner spinner-inline"></span>
                    </div>
                }
                <app-alert [error]="state.errors.password"></app-alert>
                <input 
                    type="password" 
                    class="w-full px-3 py-2 border border-gray-300 rounded text-base !mb-3" 
                    placeholder="master password" 
                    #passwordInput 
                    [hidden]="state.ui.saving">
                <input 
                    type="password" 
                    class="w-full px-3 py-2 border border-gray-300 rounded text-base" 
                    placeholder="master password again" 
                    #password2Input
                    (keyup.enter)="save(passwordInput.value, password2Input.value); passwordInput.value=''; password2Input.value=''"
                    [hidden]="state.ui.saving">
            </app-password-modal>
        }

        <!-- Export Modal -->
        @if (state.modals.export) {
            <app-password-modal
                title="Please enter your master password"
                confirmText="export"
                cancelText="cancel"
                confirmButtonClass="btn-danger"
                (confirm)="exportToClipboard(exportPasswordInput.value); exportPasswordInput.value=''"
                (close)="closeExportModal()">
                <app-alert [error]="state.errors.export"></app-alert>
                <input 
                    type="password" 
                    class="w-full px-3 py-2 border border-gray-300 rounded text-base mt-4" 
                    placeholder="master password" 
                    #exportPasswordInput
                    (keyup.enter)="exportToClipboard(exportPasswordInput.value); exportPasswordInput.value=''">
            </app-password-modal>
        }
    `
})
export class PasswordsComponent implements OnInit, OnDestroy {
    
    @ViewChild('searchInput') searchInput?: ElementRef;
    @ViewChild('passwordInput') passwordInput?: ElementRef;
    @ViewChild('password2Input') password2Input?: ElementRef;
    @ViewChild('exportPasswordInput') exportPasswordInput?: ElementRef;
    
    state: PasswordsState = { ...initialPasswordsState };
    
    private qChanged: Subject<string> = new Subject<string>();
    private qChanged$ = new Subscription();

    private backendService = inject(BackendService);
    private passwordManagement = inject(PasswordManagementService);
    private importExportService = inject(PasswordImportExportService);
    private clipboardService = inject(ClipboardService);

    ngOnInit() {
        this.loadPage();
        
        this.qChanged$ = this.qChanged.pipe(
            debounceTime(700),
            distinctUntilChanged()
        ).subscribe(q => this.state.searchQuery = q);
    }

    ngOnDestroy() {
        this.state.entries = [];
        this.passwordManagement.reset();
        this.state.page = null;
        this.qChanged$.unsubscribe();
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
            const filteredEntries = this.getFilteredEntries();
            if (filteredEntries && filteredEntries.length === 1) {
                event.preventDefault();
                this.copyEntryPassword(filteredEntries[0]);
            }
        }
    }

    private loadPage(): void {
        this.backendService.getPasswordPage().subscribe({
            next: page => this.state.page = page,
            error: error => {
                if (error && error.status === 404) {
                    this.state.page = new Page();
                    this.state.entries = [];
                } else {
                    this.state.errors.general = error;
                }
            }
        });
    }

    private copyEntryPassword(entry: PasswordEntry): void {
        this.passwordManagement.decryptPassword(entry.password).subscribe({
            next: decrypted => {
                if (decrypted) {
                    this.clipboardService.copyFromContent(decrypted);
                }
            },
            error: () => {
                console.error('Failed to decrypt password for clipboard copy');
            }
        });
    }

    getFilteredEntries(): PasswordEntry[] | null {
        if (!this.state.entries) {
            return null;
        }
        
        if (!this.state.searchQuery || this.state.searchQuery.length === 0) {
            return this.state.entries;
        }
        
        const lowerQuery = this.state.searchQuery.toLowerCase();
        return this.state.entries.filter(entry => 
            entry.service && entry.service.toLowerCase().includes(lowerQuery)
        );
    }

    hasEntries(): boolean {
        return this.state.entries != null && this.state.entries.length > 0;
    }

    onUnlock(password: string): void {
        this.state.errors.general = null;
        
        if (!this.state.page?.content) {
            this.state.errors.general = "No encrypted data available";
            return;
        }
        
        this.passwordManagement.unlock(this.state.page.content, password).subscribe({
            next: entries => {
                this.state.entries = entries;
                setTimeout(() => this.searchInput?.nativeElement.focus(), 100);
            },
            error: () => {
                this.state.errors.general = "Invalid password or decrypt error";
            }
        });
    }

    addEntry(): void {
        this.state.searchQuery = "";
        const entry = new PasswordEntry();
        entry.username = this.state.entries!
            .map(e => e.username)
            .reduce((a: any, b: any, i: any, arr: any) => 
                (arr.filter((v: any) => v === a).length >= arr.filter((v: any) => v === b).length ? a : b), null);
        this.state.entries!.push(entry.withEditTrue());
    }

    deleteEntry(index: number): void {
        this.state.entries!.splice(index, 1);
        this.state.modals.deleteConfirmation = null;
    }

    generateRandomPassword(entry: PasswordEntry): void {
        const randomPassword = this.passwordManagement.generateRandomPassword();
        entry.decryptedPassword = randomPassword;
        entry.passwordShow = true;
        
        this.passwordManagement.encryptPassword(randomPassword).subscribe({
            next: encrypted => {
                entry.password = encrypted;
            }
        });
    }

    copyPasswordAtIndex(index: number): void {
        const entries = this.getFilteredEntries();
        if (entries && entries[index]) {
            this.copyEntryPassword(entries[index]);
        }
    }

    togglePasswordVisibility(entry: PasswordEntry): void {
        entry.passwordShow = !entry.passwordShow;
        if (entry.passwordShow) {
            this.passwordManagement.decryptPassword(entry.password).subscribe({
                next: decrypted => {
                    entry.decryptedPassword = decrypted || '';
                },
                error: () => {
                    entry.decryptedPassword = '[decrypt error]';
                }
            });
        } else {
            entry.decryptedPassword = '';
        }
    }

    startEditingEntry(entry: PasswordEntry): void {
        entry.edit = true;
        this.passwordManagement.decryptPassword(entry.password).subscribe({
            next: decrypted => {
                entry.decryptedPassword = decrypted || '';
            },
            error: () => {
                entry.decryptedPassword = '';
            }
        });
    }

    stopEditingEntry(entry: PasswordEntry): void {
        if (entry.decryptedPassword) {
            this.passwordManagement.encryptPassword(entry.decryptedPassword).subscribe({
                next: encrypted => {
                    entry.passwordShow = false;
                    entry.password = encrypted;
                    entry.edit = false;
                    entry.decryptedPassword = '';
                },
                error: () => {
                    console.error('Encryption failed');
                }
            });
        } else {
            entry.edit = false;
            entry.decryptedPassword = '';
        }
    }

    onPasswordChange(password: string, entry: PasswordEntry): void {
        entry.decryptedPassword = password;
        this.passwordManagement.encryptPassword(password).subscribe({
            next: encrypted => (entry.password = encrypted)
        });
    }

    showSaveModal(): void {
        this.state.modals.askPassword = true;
        setTimeout(() => {
            this.passwordInput?.nativeElement.focus();
        }, 200);
    }

    closeSaveModal(): void {
        this.state.modals.askPassword = false;
        this.state.errors.password = null;
    }

    save(password: string, password2: string): void {
        this.state.errors.password = null;
        
        if (!password) {
            this.state.errors.password = "please enter a password";
            return;
        }
        if (password !== password2) {
            this.state.errors.password = "passwords are not equal";
            return;
        }
        
        this.state.ui.saving = true;

        this.passwordManagement.encryptEntries(this.state.entries!, password).subscribe({
            next: content => {
                this.state.page!.content = content;
                this.backendService.savePasswordPage(this.state.page!).subscribe({
                    next: () => {
                        this.state.ui.success = true;
                        this.closeSaveModal();
                        this.state.ui.saving = false;
                        timer(3000).subscribe(() => this.state.ui.success = false);
                    },
                    error: error => {
                        this.closeSaveModal();
                        this.state.errors.general = error;
                        this.state.ui.saving = false;
                    }
                });
            },
            error: () => {
                this.closeSaveModal();
                this.state.errors.general = "encryption error";
                this.state.ui.saving = false;
            }
        });
    }

    import(fileInput: any): void {
        this.state.errors.general = null;
        this.state.ui.successImport = false;
        
        if (fileInput.target.files.length === 0) {
            return;
        }
        
        const file = fileInput.target.files[0];
        fileInput.target.value = '';
        
        this.importExportService.importFromFile(file).subscribe({
            next: entries => {
                this.state.entries = entries;
                this.state.ui.successImport = true;
                timer(3000).subscribe(() => this.state.ui.successImport = false);
            },
            error: () => {
                this.state.errors.general = "import encryption error";
            }
        });
    }

    showExportModal(): void {
        this.state.modals.export = true;
        this.state.errors.export = null;
        setTimeout(() => {
            this.exportPasswordInput?.nativeElement.focus();
        }, 200);
    }

    closeExportModal(): void {
        this.state.modals.export = false;
        this.state.errors.export = null;
    }

    exportToClipboard(password: string): void {
        this.state.errors.export = null;
        
        this.passwordManagement.generateHash(password).subscribe({
            next: hashedPassword => {
                if (hashedPassword !== this.passwordManagement.getHash()) {
                    this.state.errors.export = 'invalid password';
                    return;
                }
                
                this.state.ui.successExport = false;
                
                this.importExportService.exportToClipboard(this.state.entries!).subscribe({
                    next: () => {
                        this.closeExportModal();
                        this.state.ui.successExport = true;
                        timer(3000).subscribe(() => this.state.ui.successExport = false);
                    },
                    error: () => {
                        this.state.errors.export = 'export decryption error';
                    }
                });
            },
            error: () => {
                this.state.errors.export = 'password validation error';
            }
        });
    }
}
