import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CdsModule } from '@cds/angular';
import { ClrAlertModule } from '@clr/angular';

@Component({
        selector: 'app-alert',
        imports: [CdsModule, ClrAlertModule, NgClass],
        template: `
            @if (show()) {
                <clr-alert [clrAlertType]="type" [ngClass]="{'sticky': sticky}" role="alert" (clrAlertClosedChange)="onAlertClosed()">
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
        `,
        styles: [`
            clr-alert {
                display:block;
                margin-bottom: 1em;
            }
            .sticky {
                position:fixed;
                right:0.5rem;
                top:0.1rem;
                width:30rem;
                z-index:1000;
                animation: slideInRight 0.3s ease-out;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `]
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
