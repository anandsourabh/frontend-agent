import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  
  exportToCSV(data: any[], filename: string = 'data.csv'): void {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = this.convertToCSV(data, headers);
    this.downloadFile(csvContent, filename, 'text/csv');
  }

  exportToJSON(data: any[], filename: string = 'data.json'): void {
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, filename, 'application/json');
  }

  exportToPDF(data: any[], filename: string = 'data.pdf'): void {
    if (!data || data.length === 0) return;
    
    const pdf = new jsPDF();
    const headers = Object.keys(data[0]);
    
    pdf.setFontSize(16);
    pdf.text('Data Export', 20, 20);
    
    autoTable(pdf, {
      head: [headers],
      body: data.map(row => headers.map(col => row[col] || '')),
      startY: 30,
      theme: 'grid',
      styles: { 
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [41, 51, 64], // #293340
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
    
    pdf.save(filename);
  }

  private convertToCSV(data: any[], headers: string[]): string {
    const headerRow = headers.join(',');
    const rows = data.map(row => 
      headers.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        return stringValue.includes(',') || stringValue.includes('"') 
          ? `"${stringValue.replace(/"/g, '""')}"` 
          : stringValue;
      }).join(',')
    );
    return [headerRow, ...rows].join('\n');
  }

  private downloadFile(content: string, filename: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
