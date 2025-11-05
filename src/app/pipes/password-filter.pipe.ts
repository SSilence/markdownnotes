import { Pipe, PipeTransform } from '@angular/core';
import { PasswordEntry } from '../models/password-entry';

@Pipe({
    name: 'passwordFilter',
    standalone: true
})
export class PasswordFilterPipe implements PipeTransform {
    transform(entries: PasswordEntry[] | null, query: string): PasswordEntry[] | null {
        if (!entries) {
            return null;
        }
        
        if (!query || query.length === 0) {
            return entries;
        }
        
        const lowerQuery = query.toLowerCase();
        return entries.filter(entry => 
            entry.service && entry.service.toLowerCase().includes(lowerQuery)
        );
    }
}
