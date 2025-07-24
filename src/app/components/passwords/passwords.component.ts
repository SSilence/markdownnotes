import { Component, OnInit, OnDestroy, ViewChildren, AfterViewInit, HostListener } from '@angular/core';
import { ClipboardService } from 'ngx-clipboard'
import { timer, Subject, Subscription, Observable, switchMap, map, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AlertErrorComponent } from '../alert-error/alert-error.component';
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
    templateUrl: './passwords.component.html',
    styleUrls: ['./passwords.component.css']
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

    constructor(private backendService: BackendService,
        private aesService: AesService,
        private _clipboardService: ClipboardService) { }

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
                                        timer(3000).subscribe(() => this.success = false);
                                    },
                                    error: error => {
                                        this.askPassword = false;
                                        this.error = error;
                                    }
                                });
                            },
                            error: () => {
                                this.askPassword = false;
                                this.error = "encryption error";
                            }
                        });
                    },
                    error: () => {
                        this.askPassword = false;
                        this.error = "reencryption error";
                    }
                });
            },
            error: () => {
                this.askPassword = false;
                this.error = "hash generation error";
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