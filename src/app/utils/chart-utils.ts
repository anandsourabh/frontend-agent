import { ChartConfig } from '../models/message.model';

export class ChartUtils {
  static detectChartType(data: any[]): string {
    if (!data || data.length === 0) return 'bar';
    
    const columns = Object.keys(data[0]);
    const numericColumns = columns.filter(col => 
      data.some(row => typeof row[col] === 'number' || !isNaN(Number(row[col])))
    );
    
    // Time series detection
    const hasTimeColumn = columns.some(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('time') ||
      data.some(row => !isNaN(Date.parse(row[col])))
    );
    
    if (hasTimeColumn && numericColumns.length > 0) {
      return 'line';
    }
    
    // Geographic data detection
    const hasGeoData = columns.some(col => 
      col.toLowerCase().includes('country') || 
      col.toLowerCase().includes('lat') || 
      col.toLowerCase().includes('lng')
    );
    
    if (hasGeoData) {
      return 'map';
    }
    
    // Category vs numeric for pie chart
    if (numericColumns.length === 1 && columns.length === 2) {
      return 'pie';
    }
    
    // Multiple numeric columns suggest stacked bar
    if (numericColumns.length > 2) {
      return 'stacked-bar';
    }
    
    return 'bar';
  }

  static prepareChartData(data: any[], chartType: string): any[] {
    if (!data || data.length === 0) return [];
    
    switch (chartType) {
      case 'pie':
      case 'donut':
        return this.preparePieData(data);
      case 'line':
        return this.prepareTimeSeriesData(data);
      case 'heatmap':
        return this.prepareHeatmapData(data);
      default:
        return data;
    }
  }

  private static preparePieData(data: any[]): any[] {
    const columns = Object.keys(data[0]);
    const numericColumn = columns.find(col => 
      data.some(row => typeof row[col] === 'number')
    );
    const categoryColumn = columns.find(col => col !== numericColumn);
    
    if (!numericColumn || !categoryColumn) return data;
    
    return data.map(row => ({
      category: row[categoryColumn],
      value: Number(row[numericColumn]) || 0
    }));
  }

  private static prepareTimeSeriesData(data: any[]): any[] {
    const columns = Object.keys(data[0]);
    const timeColumn = columns.find(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('time') ||
      data.some(row => !isNaN(Date.parse(row[col])))
    );
    
    if (!timeColumn) return data;
    
    return data.sort((a, b) => {
      const dateA = new Date(a[timeColumn]);
      const dateB = new Date(b[timeColumn]);
      return dateA.getTime() - dateB.getTime();
    });
  }

  private static prepareHeatmapData(data: any[]): any[] {
    // Simplified heatmap preparation
    // In a real implementation, you'd create a correlation matrix
    return data;
  }
}