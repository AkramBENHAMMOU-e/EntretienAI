# TestAI Frontend Angular

Frontend Angular pour l'application TestAI - Système d'entretien technique intelligent.

## 🚀 Installation

```bash
cd frontendAng/testai-frontend
npm install
```

## 🏃‍♂️ Démarrage

```bash
ng serve
```

L'application sera accessible sur `http://localhost:4200`

## 🏗️ Structure du projet

```
src/
├── app/
│   ├── components/
│   │   ├── interview/          # Composant principal d'entretien
│   │   ├── question-form/      # Formulaire de questions
│   │   └── admin-panel/        # Panneau d'administration
│   ├── services/
│   │   └── interview.service.ts # Service pour la logique métier
│   ├── interfaces/
│   │   └── interview.interface.ts # Interfaces TypeScript
│   └── app.routes.ts           # Configuration des routes
```

## 🎨 Technologies utilisées

- **Angular 18** avec SSR (Server-Side Rendering)
- **Bootstrap 5** pour le design
- **TypeScript** pour le typage
- **SCSS** pour les styles

## 📱 Fonctionnalités

- **Interface d'entretien** : Gestion des questions/réponses
- **Panneau d'administration** : Configuration des entretiens
- **Design responsive** : Compatible mobile et desktop
- **Navigation intuitive** : Entre les différentes sections

## 🔧 Développement

```bash
# Générer un nouveau composant
ng generate component components/nom-du-composant

# Générer un nouveau service
ng generate service services/nom-du-service

# Build de production
ng build

# Tests
ng test
```

## 📦 Dépendances principales

- `@angular/core` : Framework Angular
- `@angular/router` : Routage
- `bootstrap` : Framework CSS
- `@ng-bootstrap/ng-bootstrap` : Composants Bootstrap pour Angular 