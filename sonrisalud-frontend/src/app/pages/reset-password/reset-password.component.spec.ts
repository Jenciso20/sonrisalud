import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../services/auth.service';

class AuthServiceStub {
  resetPassword() {
    return of({ mensaje: 'Contrasena actualizada correctamente.' });
  }
}

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        { provide: AuthService, useClass: AuthServiceStub },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => 'token'
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
