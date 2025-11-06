import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileUtilsService {
  
  /**
   * Format file size in bytes to human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if a file already exists in an array based on name and size
   */
  isDuplicateFile(file: File, existingFiles: File[]): boolean {
    return existingFiles.some(existing => 
      existing.name === file.name && existing.size === file.size
    );
  }

}
