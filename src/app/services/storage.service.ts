import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

export interface PanelWidths {
  folderPanel: number;
  messagePanel: number;
  messageDetailPanel: number;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  private readonly PANEL_WIDTHS_KEY = 'email_panel_widths';

  constructor(private cookieService: CookieService) { }

  /**
   * Get panel widths from cookie, or return default values if not found
   */
  getPanelWidths(): PanelWidths {
    const defaults: PanelWidths = {
      folderPanel: 300,
      messagePanel: 400,
      messageDetailPanel: -1 // -1 means flex: 1 (take remaining space)
    };

    try {
      if (this.cookieService.check(this.PANEL_WIDTHS_KEY)) {
        const cookieValue = this.cookieService.get(this.PANEL_WIDTHS_KEY);
        const stored = JSON.parse(cookieValue);
        return { ...defaults, ...stored };
      }
    } catch (error) {
      console.warn('Error reading panel widths from cookie:', error);
    }

    return defaults;
  }

  /**
   * Save panel widths to cookie
   */
  setPanelWidths(widths: PanelWidths): void {
    try {
      const value = JSON.stringify(widths);
      // Expires in 1 year
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      
      this.cookieService.set(
        this.PANEL_WIDTHS_KEY, 
        value, 
        expirationDate,
        '/', // path
        undefined, // domain
        true, // secure (only over HTTPS in production)
        'Lax' // sameSite
      );
    } catch (error) {
      console.error('Error saving panel widths to cookie:', error);
    }
  }

  /**
   * Delete panel widths cookie (reset to defaults)
   */
  deletePanelWidths(): void {
    if (this.cookieService.check(this.PANEL_WIDTHS_KEY)) {
      this.cookieService.delete(this.PANEL_WIDTHS_KEY, '/');
    }
  }

  /**
   * Check if panel widths are stored in cookie
   */
  hasPanelWidths(): boolean {
    return this.cookieService.check(this.PANEL_WIDTHS_KEY);
  }
}