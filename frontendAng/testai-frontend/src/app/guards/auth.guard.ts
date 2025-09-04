import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (this.authService.isAuthenticated()) {
      // Vérifier si l'utilisateur peut accéder au panneau d'administration
      if (this.authService.canAccessAdminPanel()) {
        return true;
      } else {
        // Rediriger vers la page d'accueil si pas de permissions
        this.router.navigate(['/']);
        return false;
      }
    } else {
      // Rediriger vers la page de connexion si non authentifié
      this.router.navigate(['/login']);
      return false;
    }
  }
} 