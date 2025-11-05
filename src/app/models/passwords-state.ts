import { Page } from './page';
import { PasswordEntry } from './password-entry';

export interface PasswordsState {
    page: Page | null;
    entries: PasswordEntry[] | null;
    searchQuery: string;
    
    modals: {
        askPassword: boolean;
        export: boolean;
        deleteConfirmation: number | null;
    };
    
    ui: {
        saving: boolean;
        success: boolean;
        successImport: boolean;
        successExport: boolean;
    };
    
    errors: {
        general: any;
        password: any;
        export: any;
    };
}

export const initialPasswordsState: PasswordsState = {
    page: null,
    entries: null,
    searchQuery: '',
    
    modals: {
        askPassword: false,
        export: false,
        deleteConfirmation: null
    },
    
    ui: {
        saving: false,
        success: false,
        successImport: false,
        successExport: false
    },
    
    errors: {
        general: null,
        password: null,
        export: null
    }
};
