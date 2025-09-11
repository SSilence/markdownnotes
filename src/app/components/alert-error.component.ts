import { Component, Input } from '@angular/core';
import { CdsModule } from '@cds/angular';

@Component({
        selector: 'app-alert-error',
        imports: [CdsModule],
        template: `
            @if (error) {
                <div class="alert alert-danger" role="alert">
                    <div class="alert-items">
                    <div class="alert-item static">
                        <div class="alert-icon-wrapper">
                        <cds-icon class="alert-icon" shape="check-circle"></cds-icon>
                        </div>
                        <span class="alert-text">{{getErrorMessage()}}</span>
                    </div>
                    </div>
                </div>
            }
        `,
        styles: [``]
})
export class AlertErrorComponent {

    @Input() error: any = null;

    getErrorMessage(): string {
        if (this.error && this.error.error) {
            if (typeof this.error.error === "string") {
                return this.error.error;
            } else {
                JSON.stringify(this.error.error);                
            }
        }

        if (typeof this.error === "string") {
            return this.error;
        }

        return JSON.stringify(this.error);
    }

}
