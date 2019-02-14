import { Injectable } from '@angular/core';
import * as aesjs from 'aes-js/index.js';
import * as sha from 'jssha/src/sha.js';

@Injectable()
export class AesService {

    static readonly SALT: string = 'alijlkjfuhewqlfijhgiwqkb';

    encrypt(text: string, password: string): string {
        let key = this.key(password);
        let textBytes = aesjs.utils.utf8.toBytes(text);
        let aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
        let encryptedBytes = aesCtr.encrypt(textBytes);
        return aesjs.utils.hex.fromBytes(encryptedBytes);
    }

    decrypt(secret: string, password: string): string {
        let key = this.key(password);
        let encryptedBytes = aesjs.utils.hex.toBytes(secret);
        let aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
        let decryptedBytes = aesCtr.decrypt(encryptedBytes);
        return aesjs.utils.utf8.fromBytes(decryptedBytes);
    }

    key(password: string): Uint8Array {
        let sha512 = new sha("SHA-512", "TEXT");
        sha512.update(password + AesService.SALT);
        return new Uint8Array(sha512.getHash("ARRAYBUFFER")).slice(0,32);
    }

    sha512(text: string): string {
        let sha512 = new sha("SHA-512", "TEXT");
        sha512.update(text + AesService.SALT);
        return sha512.getHash("HEX");
    }

}
