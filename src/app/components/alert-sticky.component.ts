import { Component, Input } from '@angular/core';
import { CdsModule } from '@cds/angular';

@Component({
    selector: 'app-alert-sticky',
    imports: [CdsModule],
    template: `
        @if (message) {
        <div class="alert alert-success sticky" role="alert">
            <div class="alert-items">
            <div class="alert-item static">
                <div class="alert-icon-wrapper">
                <cds-icon class="alert-icon" shape="check-circle"></cds-icon>
                </div>
                <span class="alert-text">{{message}}</span>
            </div>
            </div>
        </div>
        }
    `,
    styles: [`
        .sticky {
            position:fixed;
            right:0.5rem;
            top:0.1rem;
            width:15rem;
        }
    `]
})
export class AlertStickyComponent {

    @Input() message: any = null;

}
