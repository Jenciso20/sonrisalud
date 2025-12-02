import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { UiStateService } from '../services/ui-state.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const ui = inject(UiStateService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err && (err.status === 401 || err.status === 403)) {
        ui.setBanner('Tu sesion expiro o no tienes permisos. Inicia sesion nuevamente.');
        auth.logout();
        router.navigate(['']);
      }
      return throwError(() => err);
    })
  );
};
