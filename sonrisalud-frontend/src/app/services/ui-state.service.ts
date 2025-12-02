import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private loadingCount = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private bannerSubject = new BehaviorSubject<string | null>(null);

  loading$ = this.loadingSubject.asObservable();
  banner$ = this.bannerSubject.asObservable();

  startRequest(): void {
    this.loadingCount += 1;
    this.loadingSubject.next(true);
  }

  endRequest(): void {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0) {
      this.loadingSubject.next(false);
    }
  }

  setBanner(message: string): void {
    this.bannerSubject.next(message);
  }

  clearBanner(): void {
    this.bannerSubject.next(null);
  }
}
