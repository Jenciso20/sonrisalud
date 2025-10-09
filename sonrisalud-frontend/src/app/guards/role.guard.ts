import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required: string[] = (route.data?.['roles'] as string[]) || [];

  if (!auth.isAuthenticated()) {
    router.navigate(['']);
    return false;
  }

  if (required.length === 0) return true;

  const role = auth.getRole();
  if (role && required.includes(role)) return true;

  router.navigate(['/menu']);
  return false;
};

