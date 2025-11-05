import { Component, OnInit, OnDestroy, ViewChildren, AfterViewInit, HostListener, inject } from '@angular/core';
import { ClipboardService } from 'ngx-clipboard'
import { timer, Subject, Subscription, Observable, switchMap, map, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AlertComponent } from './shared/alert.component';
import { ClarityModule } from '@clr/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Page } from 'src/app/models/page';
import { BackendService } from 'src/app/services/backend.service';
import { AesService } from 'src/app/services/aes.service';
import { PasswordEntry } from 'src/app/models/password-entry';

@Component({
    selector: 'app-passwords',
    imports: [AlertComponent, ClarityModule, CommonModule, RouterModule, FormsModule],
    template: `
        <h1 class="!mt-0 text-3xl font-bold">Passwords</h1>
        @if (!page && !error) {
            <span class="spinner spinner-inline">Loading...</span>
        }
        <app-alert [error]="error"></app-alert>

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
                                    <input placeholder="search" name="input" class="flex-1 p-2 border border-gray-300 !rounded-lg font-normal text-sm bg-white" [(ngModel)]="q" #search />
                                    <button type="button" class="btn btn-icon btn-sm btn-link" (click)="add()">
                                        <cds-icon shape="add-text"></cds-icon> add
                                    </button>
                                </div>
                            </th>
                        </tr>
                    </thead>
                }
                <tbody>
                    @for (entry of getEntries(); track $index; let i = $index) {
                    <tr class="hover:bg-gray-50">
                        <td class="py-3">
                            <div class="flex items-center justify-center min-h-10">
                                @if (!entry.edit) {
                                    <span class="inline-block">{{entry.service}}</span>
                                } @else {
                                    <input type="text" [(ngModel)]="entry.service" #service class="w-full px-2 py-1 border border-gray-300 !p-2 !rounded text-base bg-white">
                                }
                            </div>
                        </td>
                        <td class="py-3">
                            <div class="flex items-center justify-center min-h-10">
                                @if (!entry.edit) {
                                    <span class="inline-block">{{entry.username}}</span>
                                } @else {
                                    <input type="text" [(ngModel)]="entry.username" class="w-full px-2 py-1 border border-gray-300 !p-2 !rounded text-base bg-white">
                                }
                            </div>
                        </td>
                        <td class="py-3">
                            <div class="flex items-center justify-center min-h-10">
                                @if (!entry.edit) {
                                    <span class="inline-block">{{entry.passwordShow || entry.edit ? entry.decryptedPassword : '********'}}</span>
                                } @else {
                                    <clr-password-container class="!m-0">
                                        <input [type]="entry.passwordShow ? 'text' : 'password'" clrPassword [(ngModel)]="entry.decryptedPassword" (input)="encryptPasswordFromUi($event.target, entry)" class="w-full px-2 py-1 border border-gray-300 rounded text-base bg-white">
                                    </clr-password-container>
                                }
                                @if (!entry.passwordShow && !entry.edit) {
                                    <cds-icon class="ml-1 cursor-pointer" shape="eye" size="16" (click)="togglePasswordVisibility(entry)"></cds-icon>
                                }
                                @if (entry.passwordShow && !entry.edit) {
                                    <cds-icon class="ml-1 cursor-pointer" shape="eye-hide" size="16" (click)="togglePasswordVisibility(entry)"></cds-icon>
                                }
                            </div>
                        </td>
                        <td class="py-3">
                            <div class="flex items-center min-h-10">
                            @if (entry.edit) {
                                <button type="button" class="btn btn-icon btn-sm" (click)="random(i)"><cds-icon shape="wand"></cds-icon></button>
                                <button type="button" class="btn btn-icon btn-sm btn-success" (click)="stopEditingEntry(entry)"><cds-icon shape="check"></cds-icon></button>
                                <button type="button" class="btn btn-icon btn-sm btn-danger" (click)="entryToDelete=i"><cds-icon shape="trash"></cds-icon></button>
                            } @else {
                                <button class="btn btn-icon btn-sm" (click)="startEditingEntry(entry)"><cds-icon shape="pencil"></cds-icon> edit</button>
                                <button class="btn btn-icon btn-sm btn-primary" (click)="clipboard(i)"><cds-icon shape="copy-to-clipboard"></cds-icon> copy password</button>
                            }
                            </div>
                        </td>
                    </tr>
                    }
                    @if (!entries && page) {
                        <tr>
                            <td colspan="4" class="px-4 py-12 text-center">
                            <input type="password" class="px-3 py-2 border border-gray-300 rounded text-base inline-block mr-2 w-60" placeholder="master password" (keyup.enter)="unlock(unlockPasswordInput.value);unlockPasswordInput.value=''" #unlockPasswordInput>
                            <button class="btn btn-primary !ml-2" (click)="unlock(unlockPasswordInput.value);unlockPasswordInput.value=''">unlock</button>
                            </td>
                        </tr>
                    }
                    @if (entries) {
                        <tr>
                            <td colspan="4" class="px-4 py-2">
                                <div class="flex items-center justify-start">
                                    <button type="button" class="btn btn-icon btn-sm btn-link" (click)="add()">
                                        <cds-icon shape="add-text"></cds-icon> add
                                    </button>
                                </div>
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>

        @if (entries && page) {
            <div class="mt-6 space-x-2">
                <button class="btn" [ngClass]="{'btn-success-outline': success, 'btn-primary': !success}" (click)="showAskPassword()">save</button>
                <button class="btn btn-info-outline" (click)="showExport()">export</button>
                <button class="btn btn-warning-outline" (click)="f.click()">import</button>
                <button class="btn btn-link" [routerLink]="['/']">cancel</button>
                <input type="file" name="file" (change)="import($event)" class="hidden" #f>
                @if (success || successImport || successExport) {
                    <div class="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded" role="alert">
                        <div class="flex items-center gap-2">
                            <cds-icon class="text-green-600" shape="check-circle"></cds-icon>
                            @if (success) {
                            <span>successfully saved</span>
                            }
                            @if (successImport) {
                            <span>successfully imported</span>
                            }
                            @if (successExport) {
                            <span>successfully saved to clipboard</span>
                            }
                        </div>
                    </div>
                }
            </div>
        }

        @if (entryToDelete!==null) {
            <div class="fixed inset-0 z-40 bg-black bg-opacity-50"></div>
            <div class="fixed inset-0 z-50 flex items-center justify-center">
                <div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4" role="dialog" aria-hidden="true">
                <div class="p-6">
                    <p class="text-lg">Really delete {{entries![entryToDelete].service}}?</p>
                </div>
                <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
                    <button class="btn btn-outline" type="button" (click)="entryToDelete=null">cancel</button>
                    <button class="btn btn-danger" type="button" (click)="delete(entryToDelete); entryToDelete = null;">delete</button>
                </div>
                </div>
            </div>
        }

        @if (askPassword) {
            <div class="fixed inset-0 z-40 bg-black bg-opacity-50"></div>
            <div class="fixed inset-0 z-50 flex items-center justify-center">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" role="dialog" aria-hidden="true">
                    <div class="flex justify-between items-center p-4 border-b border-gray-200">
                        <h3 class="text-lg font-bold">Please enter your master password</h3>
                        <button aria-label="Close" class="text-gray-500 hover:text-gray-700" type="button" (click)="askPassword=false;password.value='';password2.value=''">
                            <cds-icon aria-hidden="true" shape="close"></cds-icon>
                        </button>
                    </div>
                    <div class="p-6">
                        @if(saving) {
                            <div class="text-center">
                                <span class="spinner spinner-inline"></span>
                            </div>
                        }
                        <app-alert [error]="errorPassword"></app-alert>
                        <input type="password" class="w-full px-3 py-2 border border-gray-300 rounded text-base !mb-3" placeholder="master password" #password [hidden]="saving">
                        <input type="password" class="w-full px-3 py-2 border border-gray-300 rounded text-base" placeholder="master password again" #password2 (keyup.enter)="save(password.value, password2.value);password.value='';password2.value=''" [hidden]="saving">
                    </div>
                    <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
                        <button class="btn btn-outline" type="button" (click)="askPassword=false;password.value='';password2.value=''" [disabled]="saving">cancel</button>
                        <button class="btn btn-danger" type="button" (click)="save(password.value, password2.value);password.value='';password2.value=''" [disabled]="saving">save</button>
                    </div>
                </div>
            </div>
        }

        @if (export) {
            <div class="fixed inset-0 z-40 bg-black bg-opacity-50"></div>
            <div class="fixed inset-0 z-50 flex items-center justify-center">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" role="dialog" aria-hidden="true">
                    <div class="flex justify-between items-center p-4 border-b border-gray-200">
                        <h3 class="text-lg font-bold">Please enter your master password</h3>
                        <button aria-label="Close" class="text-gray-500 hover:text-gray-700" type="button" (click)="export=false;exportPassword.value=''">
                            <cds-icon aria-hidden="true" shape="close"></cds-icon>
                        </button>
                    </div>
                    <div class="p-6">
                        <app-alert [error]="errorExport"></app-alert>
                        <input type="password" class="w-full px-3 py-2 border border-gray-300 rounded text-base mt-4" placeholder="master password" #exportPassword (keyup.enter)="exportToClipboard(exportPassword.value);exportPassword.value='';">
                    </div>
                    <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
                        <button class="btn btn-outline" type="button" (click)="export=false;exportPassword.value=''">cancel</button>
                        <button class="btn btn-danger" type="button" (click)="exportToClipboard(exportPassword.value);exportPassword.value='';">export</button>
                    </div>
                </div>
            </div>
        }
    `
})
export class PasswordsComponent implements OnInit, OnDestroy, AfterViewInit {
    
    @ViewChildren('unlockPasswordInput') unlockPasswordInput: any;
    @ViewChildren('password') password: any;
    @ViewChildren('exportPassword') exportPassword: any;
    @ViewChildren('search') search: any;
    @ViewChildren('service') service: any;
    
    page: Page | null = null;
    
    error: any = null;
    errorPassword: any = null;
    errorExport: any = null;
    
    saving = false;

    success = false;
    successImport = false;
    successExport = false;

    export = false;
    entries: PasswordEntry[] | null = null;
    entryToDelete: number | null = null;
    askPassword = false;
    
    hash: string = "none";
    q: string = "";
    qChanged: Subject<string> = new Subject<string>();
    private qChanged$ = new Subscription();

    private backendService = inject(BackendService);
    private aesService = inject(AesService);
    private _clipboardService = inject(ClipboardService);

    ngOnInit() {
        this.backendService.getPasswordPage().subscribe({
            next: page => this.page = page,
            error: error => {
                if (error && error.status === 404) {
                    this.page = new Page();
                    this.entries = [];
                } else {
                    this.error = error;
                }
            }
        });

        this.qChanged$ = this.qChanged.pipe(
            debounceTime(700),
            distinctUntilChanged()
        ).subscribe(q => this.q = q);
    }

    ngAfterViewInit() {
        setTimeout(() => {
            if (this.entries == null) {
                this.unlockPasswordInput.first.nativeElement.focus();
            }
        }, 400);
    }

    ngOnDestroy() {
        this.entries = [];
        this.hash = "none";
        this.page = null;
        this.qChanged$.unsubscribe();
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
            const filteredEntries = this.getEntries();
            if (filteredEntries && filteredEntries.length === 1) {
                event.preventDefault();
                this.copyPasswordToClipboard(filteredEntries[0]);
            }
        }
    }

    private copyPasswordToClipboard(entry: PasswordEntry) {
        this.decryptPassword(entry.password).subscribe({
            next: decrypted => {
                if (decrypted) {
                    this._clipboardService.copyFromContent(decrypted);
                }
            },
            error: () => {
                console.error('Failed to decrypt password for clipboard copy');
            }
        });
    }

    getEntries() {
        if (this.q != null && this.q.length > 0 && this.entries) {
            return this.entries.filter(entry => entry.service && entry.service.includes(this.q)) 
         } else {
            return this.entries;
         } 
    }

    hasEntries() {
        return this.entries != null && this.entries.length > 0;
    }

    add() {
        this.q = "";
        const entry = new PasswordEntry();
        entry.username = this.entries!
            .map(e => e.username)
            .reduce((a: any,b: any,i: any,arr: any) => (arr.filter((v: any)=>v===a).length>=arr.filter((v: any)=>v===b).length?a:b), null);
        this.entries!.push(entry.withEditTrue());
        setTimeout(() => {
            this.service.last.nativeElement.focus();
        }, 400);
    }

    delete(index: number) {
        this.entries!.splice(index, 1);
    }

    random(index: number) {
        const randomPassword = Array(20)
            .fill("123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz")
            .map(x => x[Math.floor(Math.random() * x.length)])
            .join('');
        
        const entry = this.getEntries()![index];
        entry.decryptedPassword = randomPassword;
        entry.passwordShow = true;
        
        this.encryptPassword(randomPassword).subscribe({
            next: encrypted => {
                entry.password = encrypted;
            }
        });
    }

    clipboard(index: number) {
        this.decryptPassword(this.getEntries()![index].password).subscribe({
            next: decrypted => {
                if (decrypted) {
                    this._clipboardService.copyFromContent(decrypted);
                }
            }
        });
    }

    unlock(password: string) {
        this.error = null;
        this.aesService.decrypt(this.page!.content!, password).subscribe({
            next: decrypted => {
                try {
                    this.entries = JSON.parse(decrypted)
                        .sort((p1: PasswordEntry, p2: PasswordEntry) => {
                            if (!p1.service) {
                                return -1;
                            } else if (!p2.service) {
                                return 1;
                            } else {
                                return p1.service.localeCompare(p2.service);
                            }
                        });
                    
                    this.aesService.sha512(password).subscribe({
                        next: hash => {
                            this.hash = hash;
                            setTimeout(() => this.search.first.nativeElement.focus(), 100);
                        },
                        error: () => {
                            this.error = "hash generation error";
                            this.unlockPasswordInput.first.nativeElement.focus();
                        }
                    });
                } catch(e) {
                    this.error = "parse error";
                    this.unlockPasswordInput.first.nativeElement.focus();
                }
            },
            error: () => {
                this.error = "decrypt error";
                this.unlockPasswordInput.first.nativeElement.focus();
            }
        });
    }

    decryptPassword(password: string): Observable<string> {
        return this.aesService.decrypt(password, this.hash);
    }

    encryptPassword(password: string): Observable<string> {
        return this.aesService.encrypt(password, this.hash);
    }

    togglePasswordVisibility(entry: PasswordEntry): void {
        entry.passwordShow = !entry.passwordShow;
        if (entry.passwordShow) {
            this.decryptPassword(entry.password).subscribe({
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
        this.decryptPassword(entry.password).subscribe({
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
            this.encryptPassword(entry.decryptedPassword).subscribe({
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

    encryptPasswordFromUi(target: any, entry: PasswordEntry): void {
        entry.decryptedPassword = target.value;
        this.encryptPassword(target.value).subscribe({
            next: encrypted => (entry.password = encrypted)
        });
    }

    showAskPassword() {
        this.askPassword = true
        setTimeout(() => {
            this.password.first.nativeElement.focus();
        }, 200);
    }

    save(password: string, password2: string) {
        this.errorPassword = null;
        if (!password) {
            this.errorPassword = "please enter a password";
            return;
        }
        if (password !== password2) {
            this.errorPassword = "passwords are not equals";
            return;
        }
        
        this.saving = true;

        this.aesService.sha512(password).subscribe({
            next: hash => {
                const toSave = this.entries!.map(e => PasswordEntry.fromOther(e));
                
                const reencryptObservables = toSave.map(e => this.reencryptPassword(e, hash));
                
                forkJoin(reencryptObservables).subscribe({
                    next: reencryptedEntries => {
                        const json = JSON.stringify(reencryptedEntries);
                        
                        this.aesService.encrypt(json, password).subscribe({
                            next: content => {
                                this.page!.content = content;
                                this.backendService.savePasswordPage(this.page!).subscribe({
                                    next: () => {
                                        this.success = true;
                                        this.askPassword = false;
                                        this.saving = false;
                                        timer(3000).subscribe(() => this.success = false);
                                    },
                                    error: error => {
                                        this.askPassword = false;
                                        this.error = error;
                                        this.saving = false;
                                    }
                                });
                            },
                            error: () => {
                                this.askPassword = false;
                                this.error = "encryption error";
                                this.saving = false;
                            }
                        });
                    },
                    error: () => {
                        this.askPassword = false;
                        this.error = "reencryption error";
                        this.saving = false;
                    }
                });
            },
            error: () => {
                this.askPassword = false;
                this.error = "hash generation error";
                this.saving = false;
            }
        });
    }

    import(fileInput: any) {
        this.error = null;
        this.successImport = false;
        if (fileInput.target.files.length === 0) {
            return;
        }
        const file = fileInput.target.files[0];

        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = (evt: any) => {
            fileInput.target.value = '';
            const parsed = JSON.parse(evt.target.result);
            
            const encryptObservables: Observable<PasswordEntry>[] = parsed.map((e: any) => 
                this.encryptPassword(e.password).pipe(
                    map((encrypted: string) => PasswordEntry.fromData(e.service, e.username, encrypted))
                )
            );
            
            forkJoin(encryptObservables).subscribe({
                next: (entries: PasswordEntry[]) => {
                    this.entries = entries;
                    this.successImport = true;
                    timer(3000).subscribe(() => this.successImport = false);
                },
                error: () => {
                    this.error = "import encryption error";
                }
            });
        }
    }

    showExport() {
        this.export = true;
        this.errorExport = null;
        setTimeout(() => {
            this.exportPassword.first.nativeElement.focus();
        }, 200);
    }

    exportToClipboard(password: string) {
        this.errorExport = null;
        
        this.aesService.sha512(password).subscribe({
            next: hashedPassword => {
                if (hashedPassword != this.hash) {
                    this.errorExport = 'invalid password';
                    return;
                }
                
                this.successExport = false;
                
                const decryptObservables = this.entries!.map(e => 
                    this.decryptPassword(e.password).pipe(
                        map((decryptedPassword: string | null) => ({
                            service: e.service, 
                            username: e.username, 
                            password: decryptedPassword || ''
                        }))
                    )
                );
                
                forkJoin(decryptObservables).subscribe({
                    next: passwords => {
                        const json = JSON.stringify(passwords, null, 4);
                        this._clipboardService.copyFromContent(json);
                        this.export = false;
                        this.successExport = true;
                        timer(3000).subscribe(() => this.successExport = false);
                    },
                    error: () => {
                        this.errorExport = 'export decryption error';
                    }
                });
            },
            error: () => {
                this.errorExport = 'password validation error';
            }
        });
    }

    private reencryptPassword(entry: PasswordEntry, newpassword: string): Observable<PasswordEntry> {
        return this.aesService.decrypt(entry.password, this.hash).pipe(
            switchMap((decryptedPassword: string) => {
                if (decryptedPassword) {
                    return this.aesService.encrypt(decryptedPassword, newpassword).pipe(
                        map((encrypted: string) => {
                            entry.password = encrypted;
                            return entry;
                        })
                    );
                } else {
                    return new Observable<PasswordEntry>(observer => {
                        observer.next(entry);
                        observer.complete();
                    });
                }
            })
        );
    }
}