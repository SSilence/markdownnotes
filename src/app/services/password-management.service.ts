import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, switchMap, map, of } from 'rxjs';
import { AesService } from './aes.service';
import { PasswordEntry } from '../models/password-entry';

@Injectable({
    providedIn: 'root'
})
export class PasswordManagementService {
    private aesService = inject(AesService);
    private currentHash: string = "none";

    getHash(): string {
        return this.currentHash;
    }

    setHash(hash: string): void {
        this.currentHash = hash;
    }

    isUnlocked(): boolean {
        return this.currentHash !== "none";
    }

    generateHash(password: string): Observable<string> {
        return this.aesService.sha512(password);
    }

    unlock(encryptedContent: string, password: string): Observable<PasswordEntry[]> {
        return this.aesService.decrypt(encryptedContent, password).pipe(
            switchMap(decrypted => {
                const entries: PasswordEntry[] = JSON.parse(decrypted)
                    .sort((p1: PasswordEntry, p2: PasswordEntry) => {
                        if (!p1.service) return -1;
                        if (!p2.service) return 1;
                        return p1.service.localeCompare(p2.service);
                    });
                
                return this.generateHash(password).pipe(
                    map(hash => {
                        this.currentHash = hash;
                        return entries;
                    })
                );
            })
        );
    }

    encryptPassword(password: string): Observable<string> {
        return this.aesService.encrypt(password, this.currentHash);
    }

    decryptPassword(encryptedPassword: string): Observable<string> {
        return this.aesService.decrypt(encryptedPassword, this.currentHash);
    }

    generateRandomPassword(): string {
        const alphabet = "123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
        const length = 20;
        const result: string[] = new Array(length);
        const alphabetLen = alphabet.length; // 57
        const maxUnbiased = 256 - (256 % alphabetLen);
        let i = 0;
        while (i < length) {
            const randomBytes = new Uint8Array(32);
            crypto.getRandomValues(randomBytes);
            for (let b of randomBytes) {
                if (b < maxUnbiased) {
                    const idx = b % alphabetLen;
                    result[i++] = alphabet[idx];
                    if (i === length) break;
                }
            }
        }
        return result.join('');
    }

    encryptEntries(entries: PasswordEntry[], password: string): Observable<string> {
        return this.generateHash(password).pipe(
            switchMap(hash => {
                const toSave = entries.map(e => PasswordEntry.fromOther(e));
                const reencryptObservables = toSave.map(e => this.reencryptPassword(e, hash));
                
                return forkJoin(reencryptObservables).pipe(
                    switchMap(reencryptedEntries => {
                        const json = JSON.stringify(reencryptedEntries);
                        return this.aesService.encrypt(json, password);
                    })
                );
            })
        );
    }

    private reencryptPassword(entry: PasswordEntry, newHash: string): Observable<PasswordEntry> {
        return this.aesService.decrypt(entry.password, this.currentHash).pipe(
            switchMap((decryptedPassword: string) => {
                if (!decryptedPassword) {
                    return of(entry);
                }
                return this.aesService.encrypt(decryptedPassword, newHash).pipe(
                    map((encrypted: string) => {
                        entry.password = encrypted;
                        return entry;
                    })
                );
            })
        );
    }

    reset(): void {
        this.currentHash = "none";
    }
}
