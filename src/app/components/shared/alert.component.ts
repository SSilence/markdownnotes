import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CdsModule } from '@cds/angular';
import { ClrAlertModule } from '@clr/angular';

@Component({
    selector: 'app-alert',
    imports: [CdsModule, ClrAlertModule, NgClass],
    template: `
        @if (show()) {
            <clr-alert 
                [clrAlertType]="type" 
                [ngClass]="{
                    'fixed right-2 top-0.5 w-[30rem] z-[1000] animate-slide-in-right': sticky, 
                    'block mb-4': !sticky
                    }" 
                role="alert" 
                (clrAlertClosedChange)="onAlertClosed()">
                <clr-alert-item>
                    <span class="alert-text">
                        @if (type === 'danger') {
                            Error: {{getMessage()}}
                        } @else {
                            {{getMessage()}}
                        }
                    </span>
                </clr-alert-item>
            </clr-alert>
        }
    `
})
export class AlertComponent {

    @Input() error: any = null;
    @Input() message: string | null = null;
    @Input() type = "danger";
    @Input() sticky = false;

    show(): boolean {
        return this.error != null || this.message != null;
    }

    onAlertClosed(): void {
        this.error = null;
        this.message = null;
    }
    
    getMessage(): string {
        return this.message || this.getErrorMessage();
    }

    private getErrorMessage(): string {
        if (this.error && this.error.error) {
            if (typeof this.error.error === "string") {
                return this.error.error;
            } else {
                return JSON.stringify(this.error.error);                
            }
        }

        if (typeof this.error === "string") {
            return this.error;
        }

        return JSON.stringify(this.error);
    }

}
