import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-interview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview.html',
  styleUrl: './interview.scss'
})
export class InterviewComponent implements OnInit {
  currentPhase: 'intro' | 'technical' | 'soft-skills' | 'conclusion' = 'intro';
  currentRole: string = 'Comptable';
  currentQuestionIndex: number = 0;
  userConsent: boolean = false;
  currentAnswer: string = '';
  interviewStarted: boolean = false;

  // Questions par phase
  questions = {
    technical: [
      {
        question: 'Pouvez-vous expliquer la différence entre la comptabilité générale et la comptabilité analytique ?',
        type: 'text',
        category: 'Comptabilité'
      },
      {
        question: 'Comment calculez-vous le coût de revient d\'un produit ?',
        type: 'text',
        category: 'Coûts'
      },
      {
        question: 'Qu\'est-ce que l\'écart d\'imputation rationnelle ?',
        type: 'text',
        category: 'Analyse'
      },
      {
        question: 'Comment gérez-vous la clôture mensuelle des comptes ?',
        type: 'text',
        category: 'Procédures'
      },
      {
        question: 'Quels outils informatiques utilisez-vous pour la comptabilité ?',
        type: 'text',
        category: 'Outils'
      }
    ],
    softSkills: [
      {
        question: 'Décrivez une situation où vous avez dû gérer un conflit avec un collègue.',
        type: 'text',
        category: 'Communication'
      },
      {
        question: 'Comment gérez-vous le stress en période de clôture comptable ?',
        type: 'text',
        category: 'Gestion du stress'
      },
      {
        question: 'Racontez un moment où vous avez dû apprendre quelque chose de nouveau rapidement.',
        type: 'text',
        category: 'Adaptabilité'
      },
      {
        question: 'Comment organisez-vous votre travail pour respecter les délais ?',
        type: 'text',
        category: 'Organisation'
      },
      {
        question: 'Donnez un exemple de travail d\'équipe dans votre expérience.',
        type: 'text',
        category: 'Travail d\'équipe'
      }
    ]
  };

  // Réponses stockées
  answers: { [key: string]: string } = {};

  ngOnInit() {
    this.initializeInterview();
  }

  initializeInterview() {
    this.currentPhase = 'intro';
    this.currentQuestionIndex = 0;
    this.userConsent = false;
    this.interviewStarted = false;
    this.currentAnswer = '';
    this.answers = {};
  }

  startInterview() {
    if (this.userConsent) {
      this.interviewStarted = true;
      this.currentPhase = 'technical';
      this.currentQuestionIndex = 0;
    }
  }

  submitAnswer() {
    if (this.currentAnswer.trim()) {
      // Sauvegarder la réponse
      const questionKey = `${this.currentPhase}_${this.currentQuestionIndex}`;
      this.answers[questionKey] = this.currentAnswer;
      
      // Passer à la question suivante
      this.nextQuestion();
    }
  }

  skipQuestion() {
    // Marquer la question comme sautée
    const questionKey = `${this.currentPhase}_${this.currentQuestionIndex}`;
    this.answers[questionKey] = '[Question sautée]';
    
    this.nextQuestion();
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.currentAnswer = '';
    
    // Vérifier si on a terminé la phase actuelle
    if (this.currentPhase === 'technical' && this.currentQuestionIndex >= this.questions.technical.length) {
      this.currentPhase = 'soft-skills';
      this.currentQuestionIndex = 0;
    } else if (this.currentPhase === 'soft-skills' && this.currentQuestionIndex >= this.questions.softSkills.length) {
      this.currentPhase = 'conclusion';
    }
  }

  goToPhase(phase: 'intro' | 'technical' | 'soft-skills' | 'conclusion') {
    if (this.canAccessPhase(phase)) {
      this.currentPhase = phase;
      this.currentQuestionIndex = 0;
      this.currentAnswer = '';
    }
  }

  canAccessPhase(phase: 'intro' | 'technical' | 'soft-skills' | 'conclusion'): boolean {
    if (phase === 'intro') return true;
    if (phase === 'technical') return this.interviewStarted;
    if (phase === 'soft-skills') return this.hasCompletedPhase('technical');
    if (phase === 'conclusion') return this.hasCompletedPhase('soft-skills');
    return false;
  }

  hasCompletedPhase(phase: 'technical' | 'soft-skills'): boolean {
    if (phase === 'technical') {
      return this.answers['technical_' + (this.questions.technical.length - 1)] !== undefined;
    }
    if (phase === 'soft-skills') {
      return this.answers['soft-skills_' + (this.questions.softSkills.length - 1)] !== undefined;
    }
    return false;
  }

  getCurrentQuestion() {
    if (this.currentPhase === 'technical') {
      return this.questions.technical[this.currentQuestionIndex];
    } else if (this.currentPhase === 'soft-skills') {
      return this.questions.softSkills[this.currentQuestionIndex];
    }
    return null;
  }

  getTechnicalQuestions() {
    return this.questions.technical;
  }

  getSoftSkillsQuestions() {
    return this.questions.softSkills;
  }

  getProgressPercentage(): number {
    if (this.currentPhase === 'intro') return 0;
    if (this.currentPhase === 'technical') {
      return Math.round((this.currentQuestionIndex / this.questions.technical.length) * 25);
    }
    if (this.currentPhase === 'soft-skills') {
      return 25 + Math.round((this.currentQuestionIndex / this.questions.softSkills.length) * 25);
    }
    if (this.currentPhase === 'conclusion') return 100;
    return 0;
  }

  getCurrentPhaseNumber(): number {
    const phases = ['intro', 'technical', 'soft-skills', 'conclusion'];
    return phases.indexOf(this.currentPhase) + 1;
  }

  downloadReport() {
    // Créer un rapport simple
    const report = this.generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entretien_${this.currentRole}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  generateReport(): string {
    let report = `RAPPORT D'ENTRETIEN - POSTE DE ${this.currentRole.toUpperCase()}\n`;
    report += `Date: ${new Date().toLocaleDateString('fr-FR')}\n`;
    report += `Phase: ${this.currentPhase}\n\n`;

    // Ajouter les réponses techniques
    report += 'QUESTIONS TECHNIQUES:\n';
    this.questions.technical.forEach((q, index) => {
      const answer = this.answers[`technical_${index}`] || 'Non répondu';
      report += `${index + 1}. ${q.question}\n`;
      report += `   Réponse: ${answer}\n\n`;
    });

    // Ajouter les réponses soft skills
    report += 'QUESTIONS SOFT SKILLS:\n';
    this.questions.softSkills.forEach((q, index) => {
      const answer = this.answers[`soft-skills_${index}`] || 'Non répondu';
      report += `${index + 1}. ${q.question}\n`;
      report += `   Réponse: ${answer}\n\n`;
    });

    return report;
  }

  restartInterview() {
    this.initializeInterview();
  }
}
