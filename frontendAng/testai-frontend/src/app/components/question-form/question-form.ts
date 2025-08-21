import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="question-form-container">
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">
            <i class="fas fa-plus-circle me-2"></i>
            Ajouter une nouvelle question
          </h5>
        </div>
        <div class="card-body">
          <form>
            <div class="mb-3">
              <label for="questionText" class="form-label">Question :</label>
              <textarea 
                class="form-control" 
                id="questionText" 
                rows="3" 
                placeholder="Entrez votre question ici...">
              </textarea>
            </div>
            
            <div class="mb-3">
              <label for="questionType" class="form-label">Type de question :</label>
              <select class="form-select" id="questionType">
                <option value="technical">Technique</option>
                <option value="soft-skills">Soft Skills</option>
                <option value="general">Générale</option>
              </select>
            </div>
            
            <div class="text-center">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save me-2"></i>
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .question-form-container {
      padding: 2rem 0;
    }
    
    .card {
      border: none;
      border-radius: 15px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
    }
    
    .form-control, .form-select {
      border: 2px solid #ecf0f1;
      border-radius: 10px;
      padding: 0.75rem;
      
      &:focus {
        border-color: #007bff;
        box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
      }
    }
    
    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 25px;
      font-weight: 600;
    }
  `]
})
export class QuestionFormComponent {
  // Composant simple pour l'instant
}
