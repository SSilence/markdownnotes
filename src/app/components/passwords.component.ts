import { Component, OnInit, OnDestroy, ViewChildren, AfterViewInit, HostListener, inject } from '@angular/core';
import { ClipboardService } from 'ngx-clipboard'
import { timer, Subject, Subscription, Observable, switchMap, map, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AlertErrorComponent } from './alert-error.component';
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
    imports: [AlertErrorComponent, ClarityModule, CommonModule, RouterModule, FormsModule],
    template: `
        <h1>Passwords</h1>
        @if (!page && !error) {
        <span class="spinner spinner-inline">Loading...</span>
        }
        <app-alert-error [error]="error"></app-alert-error>

        <table class="table">
            @if (hasEntries()) {
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>Username</th>
                        <th>Password</th>
                        <th>
                        <input placeholder="search" name="input" class="search" [(ngModel)]="q" #search />
                        <button type="button" class="btn btn-icon btn-sm btn-link add" (click)="add()">
                            <cds-icon shape="add-text"></cds-icon> add
                        </button>
                        </th>
                    </tr>
                </thead>
            }
        <tbody>
            @for (entry of getEntries(); track $index; let i = $index) {
            <tr>
                <td>
                    @if (!entry.edit) {
                        <span>{{entry.service}}</span>
                    } @else {
                        <input type="text" [(ngModel)]="entry.service" #service>
                    }
                </td>
                <td>
                    @if (!entry.edit) {
                        <span>{{entry.username}}</span>
                    } @else {
                        <input type="text" [(ngModel)]="entry.username">
                    }
                </td>
                <td>
                    @if (!entry.edit) {
                        <span>{{entry.passwordShow || entry.edit ? entry.decryptedPassword : '********'}}</span>
                    } @else {
                        <clr-password-container>
                        <input [type]="entry.passwordShow ? 'text' : 'password'" clrPassword [(ngModel)]="entry.decryptedPassword" (input)="encryptPasswordFromUi($event.target, entry)">
                        </clr-password-container>
                    }
                    @if (!entry.passwordShow && !entry.edit) {
                        <cds-icon class="showhide" shape="eye" size="20" (click)="togglePasswordVisibility(entry)"></cds-icon>
                    }
                    @if (entry.passwordShow && !entry.edit) {
                        <cds-icon class="showhide" shape="eye-hide" size="20" (click)="togglePasswordVisibility(entry)"></cds-icon>
                    }
                </td>
                <td class="last">
                    @if (entry.edit) {
                        <button type="button" class="btn btn-icon btn-sm" (click)="random(i)"><cds-icon shape="wand"></cds-icon></button>
                        <button type="button" class="btn btn-icon btn-sm btn-success" (click)="stopEditingEntry(entry)"><cds-icon shape="check"></cds-icon></button>
                        <button type="button" class="btn btn-icon btn-sm btn-danger" (click)="entryToDelete=i"><cds-icon shape="trash"></cds-icon></button>
                    } @else {
                        <button class="btn btn-icon btn-sm" (click)="startEditingEntry(entry)"><cds-icon shape="pencil"></cds-icon> edit</button>
                        <button class="btn btn-icon btn-sm btn-primary" (click)="clipboard(i)"><cds-icon shape="copy-to-clipboard"></cds-icon> copy password</button>
                    }
                </td>
            </tr>
            }
            @if (!entries && page) {
                <tr>
                    <td colspan="4" class="unlock">
                    <input type="password" class="password" placeholder="master password" (keyup.enter)="unlock(unlockPasswordInput.value);unlockPasswordInput.value=''" #unlockPasswordInput>
                    <button class="btn btn-primary" (click)="unlock(unlockPasswordInput.value);unlockPasswordInput.value=''">unlock</button>
                    </td>
                </tr>
            }
            @if (entries) {
                <tr>
                    <td colspan="4" class="add">
                    <button type="button" class="btn btn-icon btn-sm btn-link" (click)="add()">
                        <cds-icon shape="add-text"></cds-icon> add
                    </button>
                    </td>
                </tr>
            }
        </tbody>
        </table>

        @if (entries && page) {
            <div class="action">
                <button class="btn" [ngClass]="{'btn-success-outline': success, 'btn-primary': !success}" (click)="showAskPassword()">save</button>
                <button class="btn btn-info-outline" (click)="showExport()">export</button>
                <button class="btn btn-warning-outline" (click)="f.click()">import</button>
                <button class="btn btn-link" [routerLink]="['/']">cancel</button>
                <input type="file" name="file" (change)="import($event)" class="hidden" #f>
                @if (success || successImport || successExport) {
                    <div class="alert alert-success" role="alert">
                        <div class="alert-items">
                        <div class="alert-item static">
                            <div class="alert-icon-wrapper">
                            <cds-icon class="alert-icon" shape="check-circle"></cds-icon>
                            </div>
                            @if (success) {
                            <span class="alert-text">successfully saved</span>
                            }
                            @if (successImport) {
                            <span class="alert-text">successfully imported</span>
                            }
                            @if (successExport) {
                            <span class="alert-text">successfully saved to clipboard</span>
                            }
                        </div>
                        </div>
                    </div>
                }
            </div>
        }

        @if (entryToDelete!==null) {
            <div class="modal">
                <div class="modal-dialog" role="dialog" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-body">
                    <p>Really delete {{entries![entryToDelete].service}}?</p>
                    </div>
                    <div class="modal-footer">
                    <button class="btn btn-outline" type="button" (click)="entryToDelete=null">cancel</button>
                    <button class="btn btn-danger" type="button" (click)="delete(entryToDelete); entryToDelete = null;">delete</button>
                    </div>
                </div>
                </div>
            </div>
        }

        @if (askPassword) {
            <div class="modal">
                <div class="modal-dialog" role="dialog" aria-hidden="true">
                    <div class="modal-content">
                        <div class="modal-header">
                            <button aria-label="Close" class="close" type="button" (click)="askPassword=false;password.value='';password2.value=''">
                                <cds-icon aria-hidden="true" shape="close"></cds-icon>
                            </button>
                            <h3 class="modal-title">Please enter your master password</h3>
                        </div>
                        <div class="modal-body savepassword">
                            @if(saving) {
                                <span class="spinner spinner-inline"></span>
                            }
                            <app-alert-error [error]="errorPassword"></app-alert-error>
                            <input type="password" class="password" placeholder="master password" #password [hidden]="saving">
                            <input type="password" class="password" placeholder="master password again" #password2 (keyup.enter)="save(password.value, password2.value);password.value='';password2.value=''" [hidden]="saving">
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline" type="button" (click)="askPassword=false;password.value='';password2.value=''" [disabled]="saving">cancel</button>
                            <button class="btn btn-danger" type="button" (click)="save(password.value, password2.value);password.value='';password2.value=''" [disabled]="saving">save</button>
                        </div>
                    </div>
                </div>
            </div>
        }

        @if (export) {
            <div class="modal">
                <div class="modal-dialog" role="dialog" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <button aria-label="Close" class="close" type="button" (click)="export=false;exportPassword.value=''">
                            <cds-icon aria-hidden="true" shape="close"></cds-icon>
                        </button>
                        <h3 class="modal-title">Please enter your master password</h3>
                    </div>
                    <div class="modal-body savepassword">
                        <app-alert-error [error]="errorExport"></app-alert-error>
                        <input type="password" class="password" placeholder="master password" #exportPassword (keyup.enter)="exportToClipboard(exportPassword.value);exportPassword.value='';">
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" type="button" (click)="export=false;exportPassword.value=''">cancel</button>
                        <button class="btn btn-danger" type="button" (click)="exportToClipboard(exportPassword.value);exportPassword.value='';">export</button>
                    </div>
                </div>
                </div>
            </div>
        }

        @if (entryToDelete!==null || askPassword || export) {
            <div class="modal-backdrop" aria-hidden="true"></div>
        }
    `,
    styles: [`
        h1 {
            margin-top:0;
        }

        .table th {
            vertical-align: middle;
        } 

        .search {
            font-weight: normal;
        }

        th .add {
            margin-top:0;
        }

        .unlock {
            text-align: center;
            padding:50px;
        }

        input {
            font-size: 1.1em;
            border-radius: 0.1em;
            margin-right:0.3em;
            padding: 0.3em;
            vertical-align: middle;
            border: 1px solid #aaa;
        }

        .unlock .btn {
            margin:0;
        }

        input:focus{
            outline: none;
        }

        .savepassword .password {
            display:block;
            margin-top: 1em;
            width: 60%;
        }

        .add {
            text-align: left;
        }

        table button {
            margin-top:0.2em;
            margin-bottom: 0;
        }

        th, td {
            width:20%;
            font-size:1.15em;
        }

        td.last {
            width:40%;
        }

        td span {
            display: inline-block;
            margin-top:1em;
        }

        .action {
            margin-top:1.5em;
        }

        .modal-body {
            overflow-y: hidden;
        }

        cds-icon {
            cursor: pointer;
        }

        td clr-password-container {
            margin-top:5px;
        }

        .showhide {
            margin-left:0.7em;
        }

        .hidden {
            display: none;
        }
    `]
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