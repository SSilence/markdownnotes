import { Injectable } from '@angular/core';
import { Observable, from, map, switchMap } from 'rxjs';

@Injectable()
export class AesService {

    static readonly ITERATIONS: number = 310000;
    static readonly IV_LENGTH: number = 12;
    static readonly SALT_LENGTH: number = 16;

    encrypt(text: string, password: string): Observable<string> {
        if (!text) {
            return new Observable(observer => {
                observer.next("");
                observer.complete();
            });
        }

        const salt = crypto.getRandomValues(new Uint8Array(AesService.SALT_LENGTH));
        return this.deriveKey(password, salt).pipe(
            switchMap(key => {
                const iv = crypto.getRandomValues(new Uint8Array(AesService.IV_LENGTH));
                const data = (new TextEncoder()).encode(text);
                return from(crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv: iv },
                    key,
                    data
                )).pipe(
                    map(encrypted => {
                        const encryptedBytes = new Uint8Array(encrypted);
                        const combined = new Uint8Array(salt.length + iv.length + encryptedBytes.length);
                        combined.set(salt, 0);
                        combined.set(iv, salt.length);
                        combined.set(encryptedBytes, salt.length + iv.length);
                        
                        let binary = '';
                        for (let i = 0; i < combined.length; i++) {
                            binary += String.fromCharCode(combined[i]);
                        }
                        return btoa(binary);
                    })
                );
            })
        );
    }

    decrypt(secret: string, password: string): Observable<string> {
        if (!secret) {
            return new Observable(observer => {
                observer.next("");
                observer.complete();
            });
        }

        return new Observable(observer => {
            try {
                const combined = new Uint8Array(
                    atob(secret).split('').map(char => char.charCodeAt(0))
                );
                
                const minLength = AesService.SALT_LENGTH + AesService.IV_LENGTH + 1;
                if (combined.length < minLength) {
                    observer.error('Authentication failed');
                    return;
                }
                
                const salt = combined.slice(0, AesService.SALT_LENGTH);
                const iv = combined.slice(AesService.SALT_LENGTH, AesService.SALT_LENGTH + AesService.IV_LENGTH);
                const encryptedData = combined.slice(AesService.SALT_LENGTH + AesService.IV_LENGTH);

                this.deriveKey(password, salt).subscribe({
                    next: key => {
                        from(crypto.subtle.decrypt(
                            { name: 'AES-GCM', iv: iv },
                            key,
                            encryptedData
                        )).pipe(
                            map(decrypted => (new TextDecoder()).decode(decrypted))
                        ).subscribe({
                            next: plaintext => {
                                observer.next(plaintext);
                                observer.complete();
                            },
                            error: () => {
                                observer.error('Authentication failed');
                            }
                        });
                    },
                    error: () => {
                        observer.error('Authentication failed');
                    }
                });
            } catch (error) {
                observer.error('Authentication failed');
            }
        });
    }

    sha512(text: string, salt?: Uint8Array): Observable<string> {
        const encoder = new TextEncoder();
        let data: Uint8Array;
        if (salt) {
            const textBytes = encoder.encode(text);
            data = new Uint8Array(textBytes.length + salt.length);
            data.set(textBytes, 0);
            data.set(salt, textBytes.length);
        } else {
            data = encoder.encode(text);
        }
        return from(crypto.subtle.digest('SHA-512', data)).pipe(
            map(hashBuffer => {
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            })
        );
    }

    private deriveKey(password: string, salt: Uint8Array): Observable<CryptoKey> {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);

        return from(crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        )).pipe(
            switchMap(keyMaterial => {
                return from(crypto.subtle.deriveKey(
                    {
                        name: 'PBKDF2',
                        salt: salt,
                        iterations: AesService.ITERATIONS,
                        hash: 'SHA-256'
                    },
                    keyMaterial,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['encrypt', 'decrypt']
                ));
            })
        );
    }
}
