import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class HeadersInterceptor implements HttpInterceptor {
  // Hardcoded values for now
  private readonly COMPANY_NUMBER = 'CN102269887';
  private readonly USER_ID = '1166505';

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Clone the request and add the headers to all API calls
    const modifiedReq = req.clone({
      setHeaders: {
        'company-number': this.COMPANY_NUMBER,
        'user-id': this.USER_ID
      }
    });

    return next.handle(modifiedReq);
  }
}