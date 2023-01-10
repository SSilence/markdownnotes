import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CdsModule } from '@cds/angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, CdsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

}
