import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AgentService } from '../../services/agent.service';
import { AgentStatus } from '../../models/message.model';

@Component({
  selector: 'app-agent-status',
  template: `
    <div class="agent-status-panel">
      <div class="status-header">
        <mat-icon>psychology</mat-icon>
        <h4>AI Agents</h4>
        <span class="agent-count">{{getActiveAgentCount()}}/{{getTotalAgentCount()}}</span>
      </div>
      
      <div class="agent-list">
        <div *ngFor="let agent of getAgentArray()" class="agent-item" [class.active]="agent.is_active">
          <div class="agent-info">
            <mat-icon [class]="getAgentIconClass(agent.name)">{{getAgentIcon(agent.name)}}</mat-icon>
            <div class="agent-details">
              <span class="agent-name">{{formatAgentName(agent.name)}}</span>
              <span class="agent-desc">{{agent.description}}</span>
            </div>
          </div>
          <div class="agent-status-indicator">
            <mat-icon [class]="agent.is_active ? 'status-active' : 'status-inactive'">
              {{agent.is_active ? 'check_circle' : 'radio_button_unchecked'}}
            </mat-icon>
          </div>
        </div>
      </div>
      
      <div class="status-footer">
        <button mat-button (click)="refreshStatus()" class="refresh-btn">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>
    </div>
  `,
  styles: [`
    .agent-status-panel {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 16px;
    }
    
    .status-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .status-header mat-icon {
      color: #2640e8;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    
    .status-header h4 {
      margin: 0;
      flex: 1;
      font-size: 16px;
      font-weight: 600;
    }
    
    .agent-count {
      background: #2640e8;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .agent-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .agent-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border-radius: 8px;
      background: #f8f9fa;
      transition: all 0.2s;
    }
    
    .agent-item.active {
      background: linear-gradient(135deg, rgba(38, 64, 232, 0.1) 0%, rgba(38, 64, 232, 0.05) 100%);
      border: 1px solid rgba(38, 64, 232, 0.2);
    }
    
    .agent-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }
    
    .agent-info mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    
    .agent-details {
      display: flex;
      flex-direction: column;
    }
    
    .agent-name {
      font-weight: 500;
      font-size: 14px;
      color: #333;
    }
    
    .agent-desc {
      font-size: 12px;
      color: #666;
      line-height: 1.2;
    }
    
    .agent-status-indicator mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    .status-active {
      color: #4caf50;
    }
    
    .status-inactive {
      color: #ccc;
    }
    
    .status-footer {
      margin-top: 16px;
      display: flex;
      justify-content: center;
    }
    
    .refresh-btn {
      color: #2640e8 !important;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .refresh-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    /* Agent-specific icon colors */
    .agent-query { color: #2196f3; }
    .agent-risk { color: #f44336; }
    .agent-knowledge { color: #9c27b0; }
    .agent-visualization { color: #ff9800; }
    .agent-search { color: #4caf50; }
    .agent-web { color: #607d8b; }
    .agent-orchestrator { color: #333; }
  `]
})
export class AgentStatusComponent implements OnInit, OnDestroy {
  agentStatuses: { [key: string]: AgentStatus } = {};
  private destroy$ = new Subject<void>();

  constructor(private agentService: AgentService) {}

  ngOnInit(): void {
    this.agentService.agentStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(statuses => {
        this.agentStatuses = statuses;
      });

    this.refreshStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getAgentArray(): AgentStatus[] {
    return Object.values(this.agentStatuses);
  }

  getActiveAgentCount(): number {
    return Object.values(this.agentStatuses).filter(agent => agent.is_active).length;
  }

  getTotalAgentCount(): number {
    return Object.keys(this.agentStatuses).length;
  }

  formatAgentName(name: string): string {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getAgentIcon(name: string): string {
    const iconMap: { [key: string]: string } = {
      'Enhanced Query Agent': 'storage',
      'Risk Advisor': 'security', 
      'Knowledge Agent': 'school',
      'Visualization Agent': 'bar_chart',
      'Document Search Agent': 'search',
      'External Web Agent': 'public',
      'Orchestrator': 'account_tree'
    };
    return iconMap[name] || 'smart_toy';
  }

  getAgentIconClass(name: string): string {
    const className = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
    return `agent-${className}`;
  }

  refreshStatus(): void {
    this.agentService.getAgentStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.agents) {
            this.agentService.updateAgentStatus(response.agents);
          }
        },
        error: (error) => {
          console.error('Error refreshing agent status:', error);
        }
      });
  }
}