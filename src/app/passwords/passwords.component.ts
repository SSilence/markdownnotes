import { Component, OnInit, OnDestroy, ViewChildren, AfterViewInit, ViewChild } from '@angular/core';
import { BackendService } from '../shared/backend.service';
import { Page } from '../shared/page';
import { AesService } from '../shared/aes.service';
import { ClipboardService } from 'ngx-clipboard'
import { timer, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-passwords',
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
    entries: PasswordEntry[] = [];
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
        this.backendService.getPasswordPage().subscribe(
            page => this.page = page,
            error => {
                console.info(error);
                if (error && error.status === 404) {
                    this.page = new Page();
                    this.entries = [];
                } else {
                    this.error = error;
                }
            }
        );

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

    getEntries() {
        return this.q != null && this.q.length > 0 && this.entries ? this.entries.filter(entry => entry.service && entry.service.includes(this.q)) : this.entries;
    }

    hasEntries() {
        return this.entries != null && this.entries.length > 0;
    }

    add() {
        this.q = "";
        const entry = new PasswordEntry();
        entry.username = this.entries.map(e => e.username).reduce((a: any,b: any,i: any,arr: any) => (arr.filter((v: any)=>v===a).length>=arr.filter((v: any)=>v===b).length?a:b), null);
        this.entries.push(entry.withEditTrue());
        setTimeout(() => {
            this.service.last.nativeElement.focus();
        }, 400);
    }

    delete(index: number) {
        this.entries.splice(index, 1);
    }

    random(index: number) {
        this.getEntries()[index].password = this.encryptPassword(Array(20)
            .fill("123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz")
            .map(x => x[Math.floor(Math.random() * x.length)])
            .join(''));
            this.entries[index].passwordShow = true;
    }

    clipboard(index: number) {
        this._clipboardService.copyFromContent(this.decryptPassword(this.getEntries()[index].password)!);
    }

    unlock(password: string) {
        this.error = null;
        try {
            let decrypted = this.aesService.decrypt(this.page!.content!, password);
            this.entries = JSON.parse(decrypted).sort((p1: PasswordEntry, p2: PasswordEntry) => {
                if (!p1.service) {
                    return -1;
                } else if (!p2.service) {
                    return 1;
                } else {
                    return p1.service.localeCompare(p2.service);
                }
            });
            this.hash = this.aesService.sha512(password);
            setTimeout(() => this.search.first.nativeElement.focus(), 0);
        } catch(e) {
            this.error = "decrypt error";
            this.unlockPasswordInput.first.nativeElement.focus();
        }
    }

    decryptPassword(password: string): string | null {
        if (!password) {
            return null;
        }
        return this.aesService.decrypt(password, this.hash);
    }

    encryptPassword(password: string): string {
        return this.aesService.encrypt(password, this.hash);
    }

    encryptPasswordFromUi(target: any): string {
        return this.encryptPassword(target.value);
    }

    reencryptPassword(entry: PasswordEntry, newpassword: string): PasswordEntry {
        let decryptedPassword = this.decryptPassword(entry.password);
        if (decryptedPassword) {
            entry.password = this.aesService.encrypt(decryptedPassword, newpassword);
        }
        return entry;
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
        let hash = this.aesService.sha512(password);
        let toSave = this.entries
            .map(e => PasswordEntry.fromOther(e))
            .map(e => this.reencryptPassword(e, hash));
        let json = JSON.stringify(toSave);
        let content = this.aesService.encrypt(json, password);
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
            this.entries = parsed.map((e: any) => PasswordEntry.fromData(e.service, e.username, this.encryptPassword(e.password)));
            this.successImport = true;
            timer(3000).subscribe(() => this.successImport = false);
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
        if (this.aesService.sha512(password) != this.hash) {
            this.errorExport = 'invalid password';
            return;
        }
        this.successExport = false;
        const passwords = this.entries.map(e => ({service: e.service, username: e.username, password: this.decryptPassword(e.password)}));
        const json = JSON.stringify(passwords, null, 4);
        this._clipboardService.copyFromContent(json);
        this.export = false;
        this.successExport = true;
        timer(3000).subscribe(() => this.successExport = false);
    }

    public static saveFile (name: string, type: string, data: any) {
        const blob = new Blob([data], {type: type});
        const a = document.createElement('a');
        a.setAttribute('style', 'display:none');
        const url = window.URL.createObjectURL(blob);
        a.setAttribute('href', url);
        a.setAttribute('download', name);
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    }
}

class PasswordEntry {
    service: string = "";
    username: string = "";
    password: string = "";

    passwordShow: boolean = false;
    edit: boolean = false;
    prev: PasswordEntry | null = null;

    static fromOther(other: PasswordEntry): PasswordEntry {
        const passwordEntry = new PasswordEntry();
        passwordEntry.service = other.service;
        passwordEntry.username = other.username;
        passwordEntry.password = other.password;
        return passwordEntry;
    }

    static fromData(service: string, username: string, password: string): PasswordEntry {
        const passwordEntry = new PasswordEntry();
        passwordEntry.service = service;
        passwordEntry.username = username;
        passwordEntry.password = password;
        return passwordEntry;
    }

    withEditTrue(): PasswordEntry {
        this.edit = true;
        return this;
    }
}