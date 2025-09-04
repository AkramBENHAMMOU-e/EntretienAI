import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginCredentials } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials: LoginCredentials = {
      username: this.username,
      password: this.password
    };

    this.authService.login(credentials).then(result => {
      if (result.success) {
        this.router.navigate(['/admin']);
      } else {
        this.errorMessage = result.message;
      }
    }).catch(error => {
      this.errorMessage = 'Une erreur est survenue lors de la connexion';
      console.error('Erreur de connexion:', error);
    }).finally(() => {
      this.isLoading = false;
    });
  }

  showHelp(event: Event): void {
    event.preventDefault();
    // Logique pour afficher l'aide ou rediriger vers le support
    console.log('Aide demandée');
  }
}
