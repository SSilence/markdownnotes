import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CdsModule } from '@cds/angular';

@Component({
  selector: 'app-alert-sticky',
  standalone: true,
  imports: [CommonModule, CdsModule],
  templateUrl: './alert-sticky.component.html',
  styleUrls: ['./alert-sticky.component.css']
})
export class AlertStickyComponent {

    @Input() message: any = null;

}
