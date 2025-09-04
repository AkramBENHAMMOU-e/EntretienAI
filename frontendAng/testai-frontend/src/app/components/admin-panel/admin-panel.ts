import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { AdminService, JobConfig as JobCfg } from '../../services/admin.service';
import { DocumentService } from '../../services/document.service';


export interface JobConfig {
  title: string;
  department: string;
  experience: string;
  salary: string;
  location: string;
  requirements: string;
  company_name: string;
}


export interface Document {
  id: string;
  name: string;
  type: 'PDF' | 'Word' | 'Excel' | 'Image' | 'Autre';
  size: string;
  uploadDate: string;
  status: 'Validé' | 'En attente' | 'Rejeté';
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.html',
  styleUrls: ['./admin-panel.scss']
})
export class AdminPanelComponent implements OnInit {
  async downloadInterviewReportPdf(): Promise<void> {
    try {
      // Get the markdown content and clean it
      const md = await this.adminService.getReportMarkdown();
      const cleanedContent = this.cleanMarkdownContent(md.content);
      const reportDate = new Date(md.modified * 1000).toLocaleDateString('fr-FR');
      const fileName = `rapport_entretien_${new Date(md.modified * 1000).toISOString().split('T')[0]}.html`;
      
      // Convert markdown to properly formatted HTML
      const htmlContent = this.convertMarkdownToHtml(cleanedContent);
      
      // Create a complete, clean HTML document
      const htmlDocument = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'entretien - ${reportDate}</title>
  <style>
    @page { 
      size: A4; 
      margin: 20mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.5;
      color: #333;
      font-size: 11pt;
      background: white;
    }
    .document-header {
      text-align: center;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .company-name { 
      color: #333;
      font-size: 16pt;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .report-title { 
      color: #666;
      font-size: 18pt;
      margin: 8px 0;
    }
    .job-info {
      color: #555;
      font-size: 12pt;
      margin: 5px 0;
    }
    .date-info { 
      color: #888;
      font-size: 11pt;
      margin-top: 10px;
    }
    h1 { 
      color: #0066cc;
      font-size: 16pt;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
      margin: 25px 0 15px 0;
    }
    h2 { 
      color: #333;
      font-size: 14pt;
      margin: 20px 0 10px 0;
    }
    h3 { 
      color: #555;
      font-size: 12pt;
      margin: 15px 0 8px 0;
    }
    p {
      margin: 8px 0;
      text-align: justify;
    }
    ul, ol { 
      margin: 10px 0;
      padding-left: 25px;
    }
    li { 
      margin: 4px 0;
    }
    strong {
      font-weight: bold;
      color: #222;
    }
    .recommendation {
      background: #f5f5f5;
      border-left: 4px solid #0066cc;
      padding: 15px;
      margin: 20px 0;
    }
    .score-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    @media print {
      body { 
        font-size: 10pt;
      }
      h1 { font-size: 14pt; }
      h2 { font-size: 12pt; }
      h3 { font-size: 11pt; }
    }
  </style>
</head>
<body>
  <div class="document-header">
    <div class="company-name">${this.jobConfig.company_name || 'RecruTime'}</div>
    <div class="report-title">Rapport d'Entretien</div>
    ${this.jobConfig.title ? `<div class="job-info">Poste : ${this.jobConfig.title}</div>` : ''}
    ${this.jobConfig.department ? `<div class="job-info">Département : ${this.jobConfig.department}</div>` : ''}
    <div class="date-info">Généré le ${reportDate}</div>
  </div>
  
  <div class="content">
    ${htmlContent}
  </div>
</body>
</html>`;
      
      // Create blob and trigger download
      const blob = new Blob([htmlDocument], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      this.showNotification(
        'Fichier HTML téléchargé ! Ouvrez-le et utilisez Ctrl+P puis "Enregistrer au format PDF" pour créer votre PDF.',
        'success'
      );
      
    } catch (e: any) {
      console.error('Erreur PDF:', e);
      this.showNotification(e?.message || 'Impossible de télécharger le rapport', 'error');
    }
  }

  // Données d'authentification
  currentUser: User | null = null;

  // Configuration du poste
  jobConfig: JobConfig = {
    title: '',
    department: '',
    experience: '',
    salary: '',
    location: '',
    requirements: '',
    company_name: ''
  };


  // Documents
  documents: Document[] = [];


  // Nouveau document
  newDocument = {
    file: null as File | null,
    name: ''
  };


  // Onglet actif
  activeTab = 'config';

  constructor(private authService: AuthService, private adminService: AdminService, private documentService: DocumentService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    // Charger la config depuis le backend
    this.loadJobConfig();
    // Charger la liste des documents du dossier knowledge/
    this.refreshKnowledgeList();
  }

  // Méthodes d'authentification et permissions
  canModifyData(): boolean {
    return this.authService.canModifyData();
  }

  canDeleteData(): boolean {
    return this.authService.canDeleteData();
  }

  canExportData(): boolean {
    return this.authService.canExportData();
  }

  canManageUsers(): boolean {
    return this.authService.canManageUsers();
  }


  // Gestion de la configuration du poste
  async saveJobConfig(): Promise<void> {
    if (!this.canModifyData()) {
      this.showNotification('Vous n\'avez pas les permissions pour modifier la configuration.', 'warning');
      return;
    }

    try {
      await this.adminService.saveJobConfig(this.jobConfig as unknown as JobCfg);
      this.showNotification('Configuration sauvegardée avec succès !', 'success');
    } catch (e: any) {
      this.showNotification(e?.message || 'Erreur lors de la sauvegarde', 'error');
    }
  }

  private async loadJobConfig(): Promise<void> {
    try {
      const cfg = await this.adminService.getJobConfig();
      this.jobConfig = cfg as any;
    } catch (e: any) {
      this.showNotification(e?.message || 'Erreur lors du chargement de la configuration', 'error');
    }
  }

  resetJobConfig(): void {
    if (!this.canModifyData()) {
      this.showNotification('Vous n\'avez pas les permissions pour modifier la configuration.', 'warning');
      return;
    }

    this.jobConfig = {
      title: '',
      department: '',
      experience: '',
      salary: '',
      location: '',
      requirements: '',
      company_name: ''
    };

    this.showNotification('Configuration réinitialisée.', 'info');
  }

  canSaveJobConfig(): boolean {
    return this.canModifyData() &&
           this.jobConfig.title.trim() !== '' &&
           this.jobConfig.department.trim() !== '';
  }


  // Gestion des documents
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.newDocument.file = file;
      this.newDocument.name = file.name;
    }
  }

  getFileType(file: File): 'PDF' | 'Word' | 'Excel' | 'Image' | 'Autre' {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(extension || '')) return 'PDF';
    if (['doc', 'docx'].includes(extension || '')) return 'Word';
    if (['xls', 'xlsx'].includes(extension || '')) return 'Excel';
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '')) return 'Image';
    return 'Autre';
  }

  async refreshKnowledgeList(): Promise<void> {
    try {
      const res = await this.documentService.list();
      // Mapper vers le modèle de Document utilisé par l'UI
      this.documents = res.files.map(f => ({
        id: f.name,
        name: f.name,
        type: this.mapExtToType(f.ext),
        size: this.formatFileSize(f.size),
        uploadDate: new Date(f.modified * 1000).toISOString().split('T')[0],
        status: 'Validé'
      }));
    } catch (e: any) {
      this.showNotification(e?.message || 'Erreur lors du chargement des documents', 'error');
    }
  }

  private mapExtToType(ext: string): Document['type']{
    switch((ext || '').toLowerCase()){
      case '.pdf': return 'PDF';
      case '.doc':
      case '.docx': return 'Word';
      case '.xls':
      case '.xlsx': return 'Excel';
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif': return 'Image';
      default: return 'Autre';
    }
  }

  async uploadDocument(): Promise<void> {
    if (!this.canModifyData()) {
      this.showNotification('Vous n\'avez pas les permissions pour uploader des documents.', 'warning');
      return;
    }

    if (!this.newDocument.file || !this.newDocument.name.trim()) {
      this.showNotification('Veuillez sélectionner un fichier et saisir un nom.', 'warning');
      return;
    }

    try {
      // Upload vers backend -> knowledge/
      await this.documentService.upload(this.newDocument.file);
      await this.documentService.reindex();

      const newDoc: Document = {
        id: Date.now().toString(),
        name: this.newDocument.name,
        type: this.getFileType(this.newDocument.file),
        size: this.formatFileSize(this.newDocument.file.size),
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'Validé'
      };

      this.documents.push(newDoc);
      this.resetNewDocument();
      this.showNotification('Document uploadé et indexé avec succès !', 'success');
      await this.refreshKnowledgeList();
      // Rafraîchir toute la page pour s'assurer que l'index RAG est repris par l'UI
      window.location.reload();
    } catch (e: any) {
      this.showNotification(e?.message || 'Erreur pendant l\'upload/indexation', 'error');
    }
  }

  resetNewDocument(): void {
    this.newDocument = {
      file: null,
      name: ''
    };
  }

  async deleteDocument(documentId: string): Promise<void> {
    if (!this.canDeleteData()) {
      this.showNotification('Vous n\'avez pas les permissions pour supprimer des documents.', 'warning');
      return;
    }

    if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      try {
        await this.documentService.delete(documentId);
        await this.refreshKnowledgeList();
        this.showNotification('Document supprimé avec succès.', 'success');
        // Rafraîchir la page pour appliquer le changement de façon visible
        window.location.reload();
      } catch (e: any) {
        this.showNotification(e?.message || 'Erreur lors de la suppression du document', 'error');
      }
    }
  }

  updateDocumentStatus(documentId: string, newStatus: Document['status']): void {
    if (!this.canModifyData()) {
      this.showNotification('Vous n\'avez pas les permissions pour modifier les documents.', 'warning');
      return;
    }

    const document = this.documents.find(d => d.id === documentId);
    if (document) {
      document.status = newStatus;
      this.showNotification(`Statut du document mis à jour : ${newStatus}`, 'success');
    }
  }

  canUploadDocument(): boolean {
    return this.canModifyData() &&
           this.newDocument.file !== null &&
           this.newDocument.name.trim() !== '';
  }


  getFilteredDocuments(): Document[] {
    return this.documents;
  }



  private cleanMarkdownContent(content: string): string {
    let cleanedContent = content;
    
    // Remove JSON block that starts with ```json and ends with ```
    const jsonBlockRegex = /^```json\s*\n[\s\S]*?\n```\s*\n*/;
    cleanedContent = cleanedContent.replace(jsonBlockRegex, '');
    
    // Also remove any standalone JSON objects at the beginning
    const standaloneJsonRegex = /^\{[\s\S]*?\}\s*\n*/;
    cleanedContent = cleanedContent.replace(standaloneJsonRegex, '');
    
    return cleanedContent;
  }

  private convertMarkdownToHtml(markdown: string): string {
    // Clean the markdown content first
    const cleanedMarkdown = this.cleanMarkdownContent(markdown);
    
    let html = cleanedMarkdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Line breaks
      .replace(/\n/gim, '<br>');
    
    // Wrap list items in ul tags
    html = html.replace(/(<li>.*?<\/li>)/gis, '<ul>$1</ul>');
    
    // Handle recommendations/conclusions with special styling
    html = html.replace(/(.*(?:recommandation|conclusion|analyse|résultat).*?)<br>/gim, '<div class="recommendation">$1</div>');
    
    return html;
  }

  // Utilitaires
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }


  // Notifications
  showNotification(message: string, type: 'success' | 'warning' | 'info' | 'error' = 'info'): void {
    // En production, utiliser un service de notification
    console.log(`${type.toUpperCase()}: ${message}`);

    // Affichage temporaire dans l'interface
    const alertClass = `alert-${type === 'error' ? 'danger' : type}`;
    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto-suppression après 5 secondes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}
