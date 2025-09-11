import { Component } from '@angular/core';
import { CdsModule } from '@cds/angular';

@Component({
    selector: 'app-home',
    imports: [CdsModule],
    template: `
        <div>
            <cds-icon shape="cursor-hand-click" size="122" class="light"></cds-icon>
            <h3>select page from navigation or add a new page</h3>
        </div>
    `,
    styles: [`
        div, h3 {
            text-align: center;
            color:#ccc;
        }

        div {
            margin-top:1.5em;
        }    
    `]
})
export class HomeComponent {

}
