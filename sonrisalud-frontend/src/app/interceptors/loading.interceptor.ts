import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { UiStateService } from '../services/ui-state.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const ui = inject(UiStateService);
  ui.startRequest();
  return next(req).pipe(finalize(() => ui.endRequest()));
};
