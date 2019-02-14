import { Component, OnInit, OnDestroy } from '@angular/core';
import { BackendService } from '../shared/backend.service';
import { Page } from '../shared/page';
import { AesService } from '../shared/aes.service';
import { ClipboardService } from 'ngx-clipboard'
import { timer } from 'rxjs';
import * as sha from 'jssha/src/sha.js';

@Component({
  selector: 'app-passwords',
  templateUrl: './passwords.component.html',
  styleUrls: ['./passwords.component.css']
})
export class PasswordsComponent implements OnInit, OnDestroy {
    
    page: Page = null;
    error: any = null;
    pwerror: any = null;
    entries: PasswordEntry[] = null;
    entryToDelete: number = null;
    askPassword = false;
    success = false;
    hash: string = "none";

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
        )
    }

    ngOnDestroy() {
        this.entries = [];
    }

    add() {
        this.entries.push(new PasswordEntry().withEditTrue());
    }

    delete(index: number) {
        this.entries.splice(index, 1);
    }

    random(index: number) {
        this.entries[index].password = Array(20)
            .fill("123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz")
            .map(x => x[Math.floor(Math.random() * x.length)])
            .join('');
        this.entries[index].passwordShow = true;
    }

    clipboard(index: number) {
        this._clipboardService.copyFromContent(this.decryptPassword(this.entries[index].password));
    }

    unlock(password: string) {
        this.error = null;
        let decrypted = this.aesService.decrypt(this.page.content, password);
        try {
            this.entries = JSON.parse(decrypted);
            this.hash = this.aesService.sha512(password);
        } catch(e) {
            this.error = "decrypt error";
        }
    }

    decryptPassword(password: string): string {
        if (!password) {
            return null;
        }
        return this.aesService.decrypt(password, this.hash);
    }

    encryptPassword(password: string): string {
        return this.aesService.encrypt(password, this.hash);
    }

    reencryptPassword(entry: PasswordEntry, newpassword: string): PasswordEntry {
        let decryptedPassword = this.decryptPassword(entry.password);
        entry.password = this.aesService.encrypt(decryptedPassword, newpassword);
        return entry;
    }

    save(password: string, password2: string) {
        this.pwerror = null;
        if (!password) {
            this.pwerror = "please enter a password";
            return;
        }
        if (password !== password2) {
            this.pwerror = "passwords are not equals";
            return;
        }
        let hash = this.aesService.sha512(password);
        let toSave = this.entries
            .map(e => new PasswordEntry().fromOther(e))
            .map(e => this.reencryptPassword(e, hash));
        let json = JSON.stringify(toSave);
        let content = this.aesService.encrypt(json, password);
        this.page.content = content;
        this.backendService.savePasswordPage(this.page).subscribe(
            () => {
                this.success = true;
                this.askPassword = false;
                timer(3000).subscribe(() => this.success = false);
            },
            error => {
                this.askPassword = false;
                this.error = error;
            }
        );
    }
}

class PasswordEntry {
    service: string;
    username: string;
    password: string;

    passwordShow: boolean;
    edit: boolean;
    prev: PasswordEntry;

    fromOther(other: PasswordEntry): PasswordEntry {
        this.service = other.service;
        this.username = other.username;
        this.password = other.password;
        return this;
    }

    withEditTrue(): PasswordEntry {
        this.edit = true;
        return this;
    }
}