import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-export-dialog',
  template: `
    <h2 mat-dialog-title>Export Data</h2>
    <mat-dialog-content>
      <p>Choose export format:</p>
      <mat-radio-group [(ngModel)]="selectedFormat">
        <mat-radio-button value="csv">CSV (Comma Separated Values)</mat-radio-button>
        <mat-radio-button value="json">JSON (JavaScript Object Notation)</mat-radio-button>
        <mat-radio-button value="pdf">PDF (Portable Document Format)</mat-radio-button>
      </mat-radio-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="export()">Export</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-radio-button {
      display: block;
      margin-bottom: 8px;
    }
  `]
})
export class ExportDialogComponent {
  selectedFormat = 'csv';

  constructor(
    public dialogRef: MatDialogRef<ExportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { data: any[], columns: string[] }
  ) {}

  cancel(): void {
    this.dialogRef.close();
  }

  export(): void {
    switch (this.selectedFormat) {
      case 'csv':
        this.exportCSV();
        break;
      case 'json':
        this.exportJSON();
        break;
      case 'pdf':
        this.exportPDF();
        break;
    }
    this.dialogRef.close();
  }

  private exportCSV(): void {
    const csvContent = this.convertToCSV(this.data.data);
    this.downloadFile(csvContent, 'data.csv', 'text/csv');
  }

  private exportJSON(): void {
    const jsonContent = JSON.stringify(this.data.data, null, 2);
    this.downloadFile(jsonContent, 'data.json', 'application/json');
  }

  private exportPDF(): void {
    const pdf = new jsPDF();
    
    autoTable(pdf, {
      head: [this.data.columns],
      body: this.data.data.map(row => this.data.columns.map(col => row[col])),
      theme: 'grid',
      styles: { fontSize: 8 }
    });
    
    pdf.save('data.pdf');
  }

  private convertToCSV(data: any[]): string {
    const headers = this.data.columns.join(',');
    const rows = data.map(row => 
      this.data.columns.map(col => {
        const value = row[col];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    );
    return [headers, ...rows].join('\n');
  }

  private downloadFile(content: string, filename: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}