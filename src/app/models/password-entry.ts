export class PasswordEntry {
    service: string = "";
    username: string = "";
    password: string = "";

    passwordShow: boolean = false;
    edit: boolean = false;
    decryptedPassword: string = "";

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
