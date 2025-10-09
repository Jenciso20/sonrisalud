import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

class AuthServiceStub {
  login() {
    return of({ mensaje: 'ok', token: 'token' });
  }
  register() {
    return of({ mensaje: 'ok' });
  }
  recoverPassword() {
    return of({ mensaje: 'ok' });
  }
  resetPassword() {
    return of({ mensaje: 'ok' });
  }
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: AuthService, useClass: AuthServiceStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
