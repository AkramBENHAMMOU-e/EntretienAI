import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  permissions: string[];
  lastLogin: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private isBrowser = false;

  // Utilisateurs de démonstration (en production, cela viendrait d'une API)
  private readonly DEMO_USERS: User[] = [
    {
      id: '1',
      username: 'admin',
      email: 'admin@testai.com',
      role: 'admin',
      permissions: ['read', 'write', 'delete', 'manage_users', 'export_data'],
      lastLogin: new Date()
    },
    {
      id: '2',
      username: 'manager',
      email: 'manager@testai.com',
      role: 'manager',
      permissions: ['read', 'write', 'export_data'],
      lastLogin: new Date()
    },
    {
      id: '3',
      username: 'viewer',
      email: 'viewer@testai.com',
      role: 'viewer',
      permissions: ['read'],
      lastLogin: new Date()
    }
  ];

  constructor(private router: Router, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.checkStoredAuth();
    }
  }

  /**
   * Authentification de l'utilisateur
   */
  login(credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: User }> {
    return new Promise((resolve) => {
      // Simulation d'un délai d'authentification
      setTimeout(() => {
        const user = this.DEMO_USERS.find(u => 
          u.username === credentials.username && 
          this.validatePassword(credentials.password, u.username)
        );

        if (user) {
          // Mise à jour de la dernière connexion
          user.lastLogin = new Date();
          
          // Stockage des informations d'authentification
          this.storeAuthData(user);
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
          
          resolve({
            success: true,
            message: 'Connexion réussie',
            user: user
          });
        } else {
          resolve({
            success: false,
            message: 'Nom d\'utilisateur ou mot de passe incorrect'
          });
        }
      }, 1000); // Délai d'1 seconde pour simuler l'authentification
    });
  }

  /**
   * Déconnexion de l'utilisateur
   */
  logout(): void {
    this.clearAuthData();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    // Rediriger en mode candidat (page d'entretien)
    this.router.navigate(['/interview']);
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Obtenir l'utilisateur actuel
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Vérifier si l'utilisateur a une permission spécifique
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.permissions.includes(permission) : false;
  }

  /**
   * Vérifier si l'utilisateur a un rôle spécifique
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }

  /**
   * Vérifier si l'utilisateur peut accéder au panneau d'administration
   */
  canAccessAdminPanel(): boolean {
    return this.isAuthenticated() && (
      this.hasRole('admin') || 
      this.hasRole('manager') || 
      this.hasRole('viewer')
    );
  }

  /**
   * Vérifier si l'utilisateur peut modifier les données
   */
  canModifyData(): boolean {
    return this.hasPermission('write');
  }

  /**
   * Vérifier si l'utilisateur peut supprimer des données
   */
  canDeleteData(): boolean {
    return this.hasPermission('delete');
  }

  /**
   * Vérifier si l'utilisateur peut exporter des données
   */
  canExportData(): boolean {
    return this.hasPermission('export_data');
  }

  /**
   * Vérifier si l'utilisateur peut gérer les utilisateurs
   */
  canManageUsers(): boolean {
    return this.hasPermission('manage_users');
  }

  /**
   * Validation simple du mot de passe (en production, utiliser bcrypt ou similaire)
   */
  private validatePassword(password: string, username: string): boolean {
    // Mots de passe de démonstration
    const passwords: { [key: string]: string } = {
      'admin': 'admin123',
      'manager': 'manager123',
      'viewer': 'viewer123'
    };
    
    return passwords[username] === password;
  }

  /**
   * Stockage des données d'authentification
   */
  private storeAuthData(user: User): void {
    if (!this.isBrowser) { return; }
    const authData = {
      user: user,
      timestamp: new Date().getTime(),
      token: this.generateToken(user)
    };

    localStorage.setItem('testai_auth', JSON.stringify(authData));
    sessionStorage.setItem('testai_session', JSON.stringify(authData));
  }

  /**
   * Récupération des données d'authentification stockées
   */
  private checkStoredAuth(): void {
    if (!this.isBrowser) { return; }
    try {
      const authData = localStorage.getItem('testai_auth');
      const sessionData = sessionStorage.getItem('testai_session');

      if (authData) {
        const parsed = JSON.parse(authData);
        const now = new Date().getTime();
        const tokenAge = now - parsed.timestamp;

        // Token valide pendant 24 heures
        if (tokenAge < 24 * 60 * 60 * 1000) {
          this.currentUserSubject.next(parsed.user);
          this.isAuthenticatedSubject.next(true);
        } else {
          this.clearAuthData();
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
      this.clearAuthData();
    }
  }

  /**
   * Suppression des données d'authentification
   */
  private clearAuthData(): void {
    if (!this.isBrowser) { return; }
    localStorage.removeItem('testai_auth');
    sessionStorage.removeItem('testai_session');
  }

  /**
   * Génération d'un token simple (en production, utiliser JWT)
   */
  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      timestamp: new Date().getTime()
    };
    
    return btoa(JSON.stringify(payload));
  }

  /**
   * Rafraîchir la session utilisateur
   */
  refreshSession(): void {
    const user = this.getCurrentUser();
    if (user) {
      user.lastLogin = new Date();
      this.storeAuthData(user);
    }
  }

  /**
   * Changer le mot de passe (simulation)
   */
  changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const user = this.getCurrentUser();
      if (!user) {
        resolve({ success: false, message: 'Utilisateur non connecté' });
        return;
      }

      if (this.validatePassword(oldPassword, user.username)) {
        // En production, envoyer la requête à l'API
        setTimeout(() => {
          resolve({ success: true, message: 'Mot de passe modifié avec succès' });
        }, 1000);
      } else {
        resolve({ success: false, message: 'Ancien mot de passe incorrect' });
      }
    });
  }
} 