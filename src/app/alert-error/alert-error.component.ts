import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-alert-error',
  templateUrl: './alert-error.component.html',
  styleUrls: ['./alert-error.component.css']
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
