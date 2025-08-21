import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface JobConfig {
  title: string;
  department: string;
  requirements: string;
  experience: string;
  salary: string;
  location: string;
}

interface Interview {
  id: number;
  candidate: string;
  position: string;
  date: string;
  status: 'En cours' | 'Terminé' | 'Annulé' | 'En attente';
  score?: number;
  notes?: string;
}

interface Document {
  id: number;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: 'Validé' | 'En attente' | 'Rejeté';
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.scss'
})
export class AdminPanelComponent implements OnInit {
  activeTab: 'config' | 'interviews' | 'reports' = 'config';
  
  // Configuration des postes
  jobConfig: JobConfig = {
    title: 'Comptable',
    department: 'Comptabilité',
    requirements: 'Bac+3 en comptabilité, 3 ans d\'expérience',
    experience: '3-5 ans',
    salary: '35 000€ - 45 000€',
    location: 'Paris'
  };

  // Liste des entretiens
  interviews: Interview[] = [
    {
      id: 1,
      candidate: 'Jean Dupont',
      position: 'Comptable',
      date: '2025-01-15',
      status: 'En cours',
      score: 85
    },
    {
      id: 2,
      candidate: 'Marie Martin',
      position: 'Comptable',
      date: '2025-01-14',
      status: 'Terminé',
      score: 92,
      notes: 'Excellente candidate, recommandée'
    },
    {
      id: 3,
      candidate: 'Pierre Durand',
      position: 'Comptable',
      date: '2025-01-13',
      status: 'Terminé',
      score: 78,
      notes: 'Compétences techniques correctes, soft skills à améliorer'
    }
  ];

  // Documents de référence
  documents: Document[] = [
    {
      id: 1,
      name: 'Fiche de poste Comptable.pdf',
      type: 'PDF',
      size: '2.3 MB',
      uploadDate: '2025-01-10',
      status: 'Validé'
    },
    {
      id: 2,
      name: 'Grille d\'évaluation.xlsx',
      type: 'Excel',
      size: '1.1 MB',
      uploadDate: '2025-01-09',
      status: 'Validé'
    },
    {
      id: 3,
      name: 'Manuel procédures comptables.docx',
      type: 'Word',
      size: '4.7 MB',
      uploadDate: '2025-01-08',
      status: 'En attente'
    }
  ];

  // Statistiques
  stats = {
    totalInterviews: 0,
    completedInterviews: 0,
    averageScore: 0,
    activePositions: 0
  };

  // Nouveau document
  newDocument = {
    name: '',
    type: '',
    file: null as File | null
  };

  // Filtres
  statusFilter = 'all';
  positionFilter = 'all';

  ngOnInit() {
    this.calculateStats();
  }

  setActiveTab(tab: 'config' | 'interviews' | 'reports') {
    this.activeTab = tab;
  }

  // Gestion de la configuration des postes
  saveJobConfig() {
    console.log('Configuration sauvegardée:', this.jobConfig);
    // Ici on pourrait appeler un service pour sauvegarder
    this.showNotification('Configuration sauvegardée avec succès', 'success');
  }

  resetJobConfig() {
    this.jobConfig = {
      title: 'Comptable',
      department: 'Comptabilité',
      requirements: 'Bac+3 en comptabilité, 3 ans d\'expérience',
      experience: '3-5 ans',
      salary: '35 000€ - 45 000€',
      location: 'Paris'
    };
    this.showNotification('Configuration réinitialisée', 'info');
  }

  // Gestion des entretiens
  updateInterviewStatus(interviewId: number, newStatus: Interview['status']) {
    const interview = this.interviews.find(i => i.id === interviewId);
    if (interview) {
      interview.status = newStatus;
      this.calculateStats();
      this.showNotification(`Statut de l'entretien mis à jour`, 'success');
    }
  }

  addInterviewNotes(interviewId: number, notes: string) {
    const interview = this.interviews.find(i => i.id === interviewId);
    if (interview) {
      interview.notes = notes;
      this.showNotification('Notes ajoutées avec succès', 'success');
    }
  }

  deleteInterview(interviewId: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet entretien ?')) {
      this.interviews = this.interviews.filter(i => i.id !== interviewId);
      this.calculateStats();
      this.showNotification('Entretien supprimé', 'success');
    }
  }

  // Gestion des documents
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newDocument.file = file;
      this.newDocument.name = file.name;
      this.newDocument.type = this.getFileType(file.name);
    }
  }

  getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'PDF';
      case 'docx': return 'Word';
      case 'xlsx': return 'Excel';
      case 'jpg':
      case 'jpeg':
      case 'png': return 'Image';
      default: return 'Autre';
    }
  }

  uploadDocument() {
    if (this.newDocument.file) {
      const document: Document = {
        id: this.documents.length + 1,
        name: this.newDocument.name,
        type: this.newDocument.type,
        size: this.formatFileSize(this.newDocument.file.size),
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'En attente'
      };
      
      this.documents.unshift(document);
      this.resetNewDocument();
      this.showNotification('Document uploadé avec succès', 'success');
    }
  }

  resetNewDocument() {
    this.newDocument = {
      name: '',
      type: '',
      file: null
    };
  }

  deleteDocument(documentId: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      this.documents = this.documents.filter(d => d.id !== documentId);
      this.showNotification('Document supprimé', 'success');
    }
  }

  updateDocumentStatus(documentId: number, newStatus: Document['status']) {
    const document = this.documents.find(d => d.id === documentId);
    if (document) {
      document.status = newStatus;
      this.showNotification('Statut du document mis à jour', 'success');
    }
  }

  // Statistiques et rapports
  calculateStats() {
    this.stats.totalInterviews = this.interviews.length;
    this.stats.completedInterviews = this.interviews.filter(i => i.status === 'Terminé').length;
    
    const completedWithScore = this.interviews.filter(i => i.status === 'Terminé' && i.score);
    if (completedWithScore.length > 0) {
      this.stats.averageScore = Math.round(
        completedWithScore.reduce((sum, i) => sum + (i.score || 0), 0) / completedWithScore.length
      );
    }
    
    this.stats.activePositions = this.interviews.filter(i => i.status === 'En cours').length;
  }

  getFilteredInterviews(): Interview[] {
    let filtered = this.interviews;
    
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === this.statusFilter);
    }
    
    if (this.positionFilter !== 'all') {
      filtered = filtered.filter(i => i.position === this.positionFilter);
    }
    
    return filtered;
  }

  getFilteredDocuments(): Document[] {
    return this.documents;
  }

  // Export des données
  exportData() {
    const data = {
      interviews: this.interviews,
      documents: this.documents,
      jobConfig: this.jobConfig,
      stats: this.stats,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    this.showNotification('Données exportées avec succès', 'success');
  }

  exportInterviewsCSV() {
    const headers = ['ID', 'Candidat', 'Poste', 'Date', 'Statut', 'Score', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...this.interviews.map(i => [
        i.id,
        i.candidate,
        i.position,
        i.date,
        i.status,
        i.score || '',
        (i.notes || '').replace(/,/g, ';')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interviews_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    this.showNotification('Rapport CSV exporté avec succès', 'success');
  }

  // Utilitaires
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'En cours': return 'bg-warning';
      case 'Terminé': return 'bg-success';
      case 'Annulé': return 'bg-danger';
      case 'En attente': return 'bg-info';
      case 'Validé': return 'bg-success';
      case 'Rejeté': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    // Ici on pourrait implémenter un système de notifications
    console.log(`${type.toUpperCase()}: ${message}`);
    // Pour l'instant, on utilise alert
    alert(message);
  }

  // Validation
  canSaveJobConfig(): boolean {
    return this.jobConfig.title.trim() !== '' && 
           this.jobConfig.department.trim() !== '' && 
           this.jobConfig.requirements.trim() !== '';
  }

  canUploadDocument(): boolean {
    return this.newDocument.file !== null && this.newDocument.name.trim() !== '';
  }
}
