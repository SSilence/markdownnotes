import { Component } from '@angular/core';
import { CdsModule } from '@cds/angular';

@Component({
    selector: 'app-home',
    imports: [CdsModule],
    template: `
        <div class="mt-6 text-center text-gray-300">
            <cds-icon shape="cursor-hand-click" size="122" class="light"></cds-icon>
            <h3 class="text-gray-300">select page from navigation or add a new page</h3>
        </div>
    `
})
export class HomeComponent {

}
