import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { InterviewService } from '../../services/interview.service';
import { AdminService, JobConfig as JobCfg } from '../../services/admin.service';

interface InterviewQuestion {
  question: string;
  type: string;
  category: string;
}

@Component({
  selector: 'app-interview',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './interview.html',
  styleUrl: './interview.scss'
})
export class InterviewComponent implements OnInit {
  currentPhase: 'intro' | 'technical' | 'soft-skills' | 'conclusion' = 'intro';
  currentRole: string = '';
  candidateName: string = '';
  currentQuestionIndex: number = 0;
  userConsent: boolean = false;
  currentAnswer: string = '';
  interviewStarted: boolean = false;

  // Backend state
  private sessionId: string | null = null;
  loading: boolean = false;
  backendError: string = '';
  currentBackendQuestion: string | null = null;

  // Questions par phase (remplies dynamiquement depuis le backend)
  questions: { technical: InterviewQuestion[]; softSkills: InterviewQuestion[] } = {
    technical: Array(5).fill(null).map(() => ({ question: '', type: 'text', category: 'technical' })),
    softSkills: Array(5).fill(null).map(() => ({ question: '', type: 'text', category: 'soft-skills' }))
  };

  // Question d'introduction (1 seule)
  introQuestion: InterviewQuestion | null = null;

  // Targets pour la démo (strictement 1 intro, 5 techniques, 5 soft skills)
  introTargetCount: number = 1;
  technicalTargetCount: number = 5;
  softSkillsTargetCount: number = 5;

  // Réponses stockées
  answers: { [key: string]: string } = {};

  ngOnInit() {
    this.initializeInterview();
    this.prefillRoleFromAdmin();
  }

  constructor(private interviewService: InterviewService, private cdr: ChangeDetectorRef, private adminService: AdminService) {}

  initializeInterview() {
    this.currentPhase = 'intro';
    this.currentQuestionIndex = 0;
    this.userConsent = false;
    this.interviewStarted = false;
    this.currentAnswer = '';
    this.answers = {};
    
    // Réinitialiser les arrays de questions avec les tailles correctes
    this.questions = {
      technical: Array(this.technicalTargetCount).fill(null).map(() => ({ question: '', type: 'text', category: 'technical' })),
      softSkills: Array(this.softSkillsTargetCount).fill(null).map(() => ({ question: '', type: 'text', category: 'soft-skills' }))
    };
    
    // Réinitialiser la question d'introduction
    this.introQuestion = null;
  }

  async startInterview() {
    if (!this.userConsent || this.loading) return;
    this.loading = true;
    this.backendError = '';
    try {
      const res = await this.interviewService.startInterview({
        role_title: this.currentRole,
        candidate_name: this.candidateName?.trim() || undefined,
        offer_experience_level: undefined,
        offer_tech_skills: [],
        offer_education: undefined,
        offer_soft_skills: [],
      });
      this.sessionId = res.session_id;
      this.interviewStarted = true;
      // Démarrer par la phase d'introduction (1 seule question)
      this.currentPhase = 'intro';
      this.currentQuestionIndex = 0;
      this.pendingQuestion = null;
      await this.fetchNextQuestion();
    } catch (e: any) {
      this.backendError = e?.message || 'Erreur lors du démarrage de l\'entretien';
    } finally {
      this.loading = false;
    }
  }

  async submitAnswer() {
    if (!this.currentAnswer.trim() || !this.sessionId || this.loading) return;
    this.loading = true;
    try {
      await this.interviewService.sendAnswer(this.sessionId, this.currentAnswer.trim());
      
      // Sauvegarde locale et progression
      if (this.currentPhase !== 'intro') {
        const questionKey = `${this.currentPhase}_${this.currentQuestionIndex}`;
        this.answers[questionKey] = this.currentAnswer.trim();
        this.currentQuestionIndex++;
        
        // Basculer vers la phase suivante si le quota est atteint
        if (this.currentPhase === 'technical' && this.currentQuestionIndex >= this.technicalTargetCount) {
          this.currentPhase = 'soft-skills';
          this.currentQuestionIndex = 0;
        } else if (this.currentPhase === 'soft-skills' && this.currentQuestionIndex >= this.softSkillsTargetCount) {
          this.currentPhase = 'conclusion';
          // L'entretien est terminé, le rapport sera généré automatiquement par le crew AI
          this.loading = false;
          this.currentAnswer = '';
          this.cdr.detectChanges();
          return; // Sortir ici pour éviter de chercher une nouvelle question
        }
      } else {
        // Après l'unique question d'introduction, passer en technique
        this.currentPhase = 'technical';
        this.currentQuestionIndex = 0;
      }
      
      // Reset des variables d'état
      this.pendingQuestion = null;
      this.currentAnswer = '';
      
      // Récupérer immédiatement la prochaine question
      await this.fetchNextQuestion();
      
    } catch (e: any) {
      this.backendError = e?.message || 'Erreur lors de l\'envoi de la réponse';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async skipQuestion() {
    if (!this.sessionId || this.loading) return;
    this.loading = true;
    try {
      await this.interviewService.sendAnswer(this.sessionId, '[Question sautée]');
      
      if (this.currentPhase !== 'intro') {
        const questionKey = `${this.currentPhase}_${this.currentQuestionIndex}`;
        this.answers[questionKey] = '[Question sautée]';
        this.currentQuestionIndex++;
        
        if (this.currentPhase === 'technical' && this.currentQuestionIndex >= this.technicalTargetCount) {
          this.currentPhase = 'soft-skills';
          this.currentQuestionIndex = 0;
        } else if (this.currentPhase === 'soft-skills' && this.currentQuestionIndex >= this.softSkillsTargetCount) {
          this.currentPhase = 'conclusion';
          // L'entretien est terminé, le rapport sera généré automatiquement par le crew AI
          this.loading = false;
          this.currentAnswer = '';
          this.cdr.detectChanges();
          return;
        }
      } else {
        // Après l'unique question d'introduction, passer en technique
        this.currentPhase = 'technical';
        this.currentQuestionIndex = 0;
      }
      
      // Reset des variables d'état
      this.pendingQuestion = null;
      this.currentAnswer = '';
      
      // Récupérer immédiatement la prochaine question
      await this.fetchNextQuestion();
      
    } catch (e: any) {
      this.backendError = e?.message || 'Erreur lors du passage de la question';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private pendingQuestion: string | null = null;

  // Méthode pour récupérer la prochaine question après une réponse
  private async fetchNextQuestion() {
    if (!this.sessionId) return;
    
    // Petite temporisation pour laisser le backend traiter la réponse
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let retryCount = 0;
    const maxRetries = 20; // Maximum 10 secondes d'attente
    
    while (retryCount < maxRetries) {
      const res = await this.interviewService.getQuestion(this.sessionId);
      
      if (res.status === 'question' && res.question) {
        // Vérifier que ce n'est pas la même question que la précédente
        if (this.pendingQuestion !== res.question) {
          this.pendingQuestion = res.question;
          this.currentBackendQuestion = res.question;

          // Assigner la question au slot courant
          if (this.currentPhase === 'intro') {
            this.introQuestion = { 
              question: res.question, 
              type: 'text', 
              category: 'introduction' 
            } as any;
          } else if (this.currentPhase === 'technical') {
            this.questions.technical[this.currentQuestionIndex] = { 
              question: res.question, 
              type: 'text', 
              category: 'technical' 
            } as any;
          } else if (this.currentPhase === 'soft-skills') {
            this.questions.softSkills[this.currentQuestionIndex] = { 
              question: res.question, 
              type: 'text', 
              category: 'soft-skills' 
            } as any;
          }
          
          this.cdr.detectChanges();
          return; // Question récupérée avec succès
        }
      } else if (res.status === 'done') {
        this.currentPhase = 'conclusion';
        // L'entretien est terminé, le rapport sera généré automatiquement par le crew AI
        this.cdr.detectChanges();
        return;
      } else if (res.status === 'error') {
        this.backendError = res.message || 'Erreur backend';
        return;
      }
      
      // Attendre avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 500));
      retryCount++;
    }
    
    // Si on arrive ici, on n'a pas réussi à obtenir une nouvelle question
    this.backendError = 'Impossible de récupérer la prochaine question. Veuillez réessayer.';
  }

  private async fetchQuestion() {
    if (!this.sessionId) return;
    const res = await this.interviewService.getQuestion(this.sessionId);
    if (res.status === 'question' && res.question) {
      // Dédupliquer si on reçoit deux fois la même question
      if (this.pendingQuestion === res.question) {
        return;
      }
      this.pendingQuestion = res.question;
      this.currentBackendQuestion = res.question;

      // Mappez la question backend au slot courant
      if (this.currentPhase === 'technical') {
        this.questions.technical[this.currentQuestionIndex] = { question: res.question, type: 'text', category: 'Backend' } as any;
      } else if (this.currentPhase === 'soft-skills') {
        this.questions.softSkills[this.currentQuestionIndex] = { question: res.question, type: 'text', category: 'Soft Skills' } as any;
      }
      // Force change detection in zoneless mode so UI updates immediately
      this.cdr.detectChanges();
    } else if (res.status === 'waiting') {
      // Petite temporisation avant re-poll + tenter de rafraîchir si une question était en vol
      setTimeout(() => this.fetchQuestion(), 500);
    } else if (res.status === 'done') {
      this.currentPhase = 'conclusion';
      // L'entretien est terminé, le rapport sera généré automatiquement par le crew AI
    } else if (res.status === 'error') {
      this.backendError = res.message || 'Erreur backend';
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
      return this.answers['technical_' + (this.technicalTargetCount - 1)] !== undefined;
    }
    if (phase === 'soft-skills') {
      return this.answers['soft-skills_' + (this.softSkillsTargetCount - 1)] !== undefined;
    }
    return false;
  }

  getCurrentQuestion(): InterviewQuestion | null {
    if (this.currentPhase === 'intro') {
      return this.introQuestion;
    } else if (this.currentPhase === 'technical') {
      return this.questions.technical[this.currentQuestionIndex];
    } else if (this.currentPhase === 'soft-skills') {
      return this.questions.softSkills[this.currentQuestionIndex];
    }
    return null;
  }

  getTechnicalQuestions(): InterviewQuestion[] {
    return this.questions.technical;
  }

  getSoftSkillsQuestions(): InterviewQuestion[] {
    return this.questions.softSkills;
  }

  getProgressPercentage(): number {
    if (this.currentPhase === 'intro') {
      return 10; // 10% pour la phase d'introduction (1 question)
    }
    if (this.currentPhase === 'technical') {
      const techProgress = (this.currentQuestionIndex / this.technicalTargetCount) * 40; // 40% pour les 5 questions techniques
      return 10 + Math.round(techProgress);
    }
    if (this.currentPhase === 'soft-skills') {
      const softProgress = (this.currentQuestionIndex / this.softSkillsTargetCount) * 40; // 40% pour les 5 questions soft skills
      return 50 + Math.round(softProgress);
    }
    if (this.currentPhase === 'conclusion') return 100;
    return 0;
  }

  getCurrentPhaseNumber(): number {
    const phases = ['intro', 'technical', 'soft-skills', 'conclusion'];
    return phases.indexOf(this.currentPhase) + 1;
  }

  // Génération du rapport par l'AI crew (automatique à la fin de l'entretien)

  private async prefillRoleFromAdmin() {
    try {
      const cfg = await this.adminService.getJobConfig();
      if (!this.currentRole && cfg && cfg.title) {
        this.currentRole = cfg.title;
        this.cdr.detectChanges();
      }
    } catch {}
  }

  // Rapport généré automatiquement par l'AI crew dans interview_report.md

  restartInterview() {
    this.initializeInterview();
  }
}
