import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { ClipboardService } from 'ngx-clipboard';
import { PasswordEntry } from '../models/password-entry';
import { PasswordManagementService } from './password-management.service';

@Injectable({
    providedIn: 'root'
})
export class PasswordImportExportService {
    private passwordManagement = inject(PasswordManagementService);
    private clipboardService = inject(ClipboardService);

    importFromFile(file: File): Observable<PasswordEntry[]> {
        return new Observable<PasswordEntry[]>(observer => {
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            
            reader.onload = (evt: any) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    
                    const encryptObservables: Observable<PasswordEntry>[] = parsed.map((e: any) => 
                        this.passwordManagement.encryptPassword(e.password).pipe(
                            map((encrypted: string) => PasswordEntry.fromData(e.service, e.username, encrypted))
                        )
                    );
                    
                    forkJoin(encryptObservables).subscribe({
                        next: (entries: PasswordEntry[]) => {
                            observer.next(entries);
                            observer.complete();
                        },
                        error: (error) => {
                            observer.error(error);
                        }
                    });
                } catch (error) {
                    observer.error(error);
                }
            };
            
            reader.onerror = () => {
                observer.error(new Error('File read error'));
            };
        });
    }

    exportToClipboard(entries: PasswordEntry[]): Observable<void> {
        const decryptObservables = entries.map(e => 
            this.passwordManagement.decryptPassword(e.password).pipe(
                map((decryptedPassword: string | null) => ({
                    service: e.service, 
                    username: e.username, 
                    password: decryptedPassword || ''
                }))
            )
        );
        
        return forkJoin(decryptObservables).pipe(
            map(passwords => {
                const json = JSON.stringify(passwords, null, 4);
                this.clipboardService.copyFromContent(json);
            })
        );
    }
}
