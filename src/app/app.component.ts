import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Subject, takeUntil } from 'rxjs';
import { ChatService } from './services/chat.service';
import { AgentService } from './services/agent.service';

@Component({
  selector: 'app-root',
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav mode="over" class="sidenav">
        <div class="sidenav-header">
          <button mat-icon-button (click)="sidenav.toggle()" class="menu-button">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="sidenav-title">AI Risk Advisor</span>
          <!-- Agent status indicator -->
          <div class="agent-status-indicator" [matBadge]="activeAgentCount" matBadgeColor="primary" matBadgeSize="small">
            <mat-icon [class]="agentsHealthy ? 'agents-healthy' : 'agents-warning'">psychology</mat-icon>
          </div>
        </div>
        
        <!-- Agent Status Panel -->
        <app-agent-status></app-agent-status>
        
        <!-- Query History -->
        <app-query-history (querySelected)="onQuerySelected($event)"></app-query-history>
        
        <!-- Document Search Panel -->
        <app-document-search></app-document-search>
      </mat-sidenav>
      
      <mat-sidenav-content>
        <div class="floating-menu-button">
          <button (click)="sidenav.toggle()" class="floating-menu-icon" [matBadge]="totalNotifications" 
                  [matBadgeHidden]="totalNotifications === 0" matBadgeColor="warn" matBadgeSize="small">
            <mat-icon>menu</mat-icon>
          </button>
        </div>
        
        <!-- Agent Processing Indicator -->
        <div class="agent-processing-bar" *ngIf="agentsProcessing">
          <mat-progress-bar mode="indeterminate" color="primary"></mat-progress-bar>
          <div class="processing-text">
            <mat-icon class="processing-icon">psychology</mat-icon>
            <span>AI agents are analyzing your request...</span>
          </div>
        </div>
        
        <app-chat #chatComponent></app-chat>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
    }
    
    .sidenav {
      width: 480px;
      background-color: white;
      overflow-y: auto;
    }
    
    .sidenav-header {
      display: flex;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #2640e8 0%, #4054ea 100%);
      color: white;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .menu-button {
      margin-right: 12px;
      background: none !important;
      box-shadow: none !important;
      border: none !important;
      color: white;
      padding: 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    
    .menu-button:hover {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
    
    .sidenav-title {
      font-weight: 600;
      font-size: 18px;
      flex: 1;
    }
    
    .agent-status-indicator {
      position: relative;
    }
    
    .agent-status-indicator mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      transition: all 0.3s ease;
    }
    
    .agents-healthy {
      color: #4caf50;
      animation: pulse-healthy 2s infinite;
    }
    
    .agents-warning {
      color: #ff9800;
      animation: pulse-warning 1s infinite;
    }
    
    @keyframes pulse-healthy {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.05); }
    }
    
    @keyframes pulse-warning {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .floating-menu-button {
      position: fixed;
      top: 16px;
      left: 16px;
      z-index: 1000;
    }
    
    .floating-menu-icon {
      background: linear-gradient(135deg, #2640e8 0%, #4054ea 100%) !important;
      border: none !important;
      box-shadow: 0 4px 12px rgba(38, 64, 232, 0.3) !important;
      color: white;
      font-size: 24px;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    
    .floating-menu-icon:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(38, 64, 232, 0.4) !important;
    }
    
    .floating-menu-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    
    .agent-processing-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 999;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
    }
    
    .processing-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px;
      font-size: 14px;
      color: #2640e8;
      font-weight: 500;
    }
    
    .processing-icon {
      animation: spin 2s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .sidenav {
        width: 100vw;
      }
      
      .sidenav-header {
        padding: 12px 16px;
      }
      
      .sidenav-title {
        font-size: 16px;
      }
      
      .floating-menu-icon {
        width: 44px !important;
        height: 44px !important;
      }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('chatComponent') chatComponent!: any;

  // Agent status tracking
  activeAgentCount = 0;
  agentsHealthy = true;
  agentsProcessing = false;
  totalNotifications = 0;
  
  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private agentService: AgentService
  ) {}

  ngOnInit(): void {
    // Initialize services
    this.initializeServices();
    
    // Monitor agent status
    this.monitorAgentStatus();
    
    // Monitor chat service for processing state
    this.monitorChatProcessing();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeServices(): void {
    // Ensure chat service is initialized
    // The service will automatically load history on construction
    
    // Initialize agent monitoring
    this.agentService.getAgentStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          if (status.success && status.agents) {
            this.agentService.updateAgentStatus(status.agents);
          }
        },
        error: (error) => {
          console.warn('Initial agent status check failed:', error);
        }
      });
  }

  private monitorAgentStatus(): void {
    this.agentService.agentStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(agentStatuses => {
        const agents = Object.values(agentStatuses);
        this.activeAgentCount = agents.filter(agent => agent.is_active).length;
        this.agentsHealthy = this.activeAgentCount >= Math.floor(agents.length * 0.7); // 70% threshold
        
        // Update notifications count
        this.updateNotifications();
      });
  }

  private monitorChatProcessing(): void {
    this.chatService.typing$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isTyping => {
        this.agentsProcessing = isTyping;
      });
  }

  private updateNotifications(): void {
    // Calculate total notifications from various sources
    let notifications = 0;
    
    // Add notifications for inactive agents
    if (!this.agentsHealthy) {
      notifications += 1;
    }
    
    // Add other notification sources as needed
    // notifications += this.documentService.getPendingUploads();
    
    this.totalNotifications = notifications;
  }

  onQuerySelected(query: string): void {
    if (this.chatComponent && this.chatComponent.messageControl) {
      this.chatComponent.messageControl.setValue(query);
      this.sidenav.close();
      setTimeout(() => {
        const textarea = document.querySelector('textarea[matInput]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      }, 100);
    }
  }
}