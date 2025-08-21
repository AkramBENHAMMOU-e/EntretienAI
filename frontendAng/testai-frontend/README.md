# TestAI Frontend - Application Angular

## 🎯 Description

TestAI Frontend est une application Angular moderne pour la gestion d'entretiens techniques. Elle permet aux recruteurs de mener des entretiens structurés et aux administrateurs de gérer la configuration des postes et les documents de référence.

## 🚀 Fonctionnalités

### 📋 Composant Interview
- **Interface d'entretien complète** avec 4 phases
- **Questions techniques** sur la comptabilité analytique
- **Questions soft skills** pour évaluer les compétences relationnelles
- **Barre de progression** en temps réel
- **Navigation intelligente** entre les phases
- **Stockage des réponses** pour génération de rapports
- **Interface responsive** et moderne

### ⚙️ Composant AdminPanel
- **Configuration des postes** avec formulaire complet
- **Gestion des entretiens** avec tableau interactif
- **Upload et gestion des documents** de référence
- **Statistiques en temps réel** des entretiens
- **Export des données** en JSON et CSV
- **Filtres et recherche** avancés

### 📝 Composant QuestionForm
- **Formulaire d'ajout** de nouvelles questions
- **Catégorisation** des questions (technique, soft skills, générale)
- **Interface intuitive** pour les recruteurs

## 🛠️ Technologies utilisées

- **Angular 17** - Framework principal
- **Bootstrap 5** - Framework CSS pour le design
- **Font Awesome** - Icônes
- **SCSS** - Préprocesseur CSS
- **TypeScript** - Langage de programmation
- **Angular CLI** - Outils de développement

## 📦 Installation

### Prérequis
- Node.js (version 18 ou supérieure)
- npm ou yarn

### Étapes d'installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd testai-frontend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Lancer l'application en mode développement**
```bash
ng serve
```

4. **Ouvrir dans le navigateur**
```
http://localhost:4200
```

## 🏗️ Structure du projet

```
src/
├── app/
│   ├── components/
│   │   ├── interview/           # Composant principal d'entretien
│   │   ├── admin-panel/         # Panneau d'administration
│   │   └── question-form/       # Formulaire d'ajout de questions
│   ├── app.component.ts         # Composant racine
│   ├── app.routes.ts            # Configuration des routes
│   └── app.html                 # Template principal
├── styles.scss                  # Styles globaux avec Bootstrap
└── main.ts                      # Point d'entrée
```

## 🚀 Commandes utiles

### Développement
```bash
ng serve                    # Lancer le serveur de développement
ng build                    # Construire l'application
ng build --watch           # Construire en mode watch
ng test                     # Lancer les tests
ng lint                     # Vérifier le code avec ESLint
```

### Production
```bash
ng build --configuration production    # Build de production
ng build --ssr                         # Build avec SSR
```

## 🎨 Personnalisation

### Styles
- Les styles sont organisés par composant dans des fichiers `.scss`
- Bootstrap est importé globalement dans `styles.scss`
- Support du mode sombre automatique
- Design responsive pour tous les appareils

### Thèmes
- Couleurs principales : bleu (#3498db), rouge (#e74c3c), vert (#27ae60)
- Gradients et ombres pour un design moderne
- Animations et transitions fluides

## 📱 Responsive Design

L'application est entièrement responsive avec :
- **Desktop** : Interface complète avec tous les éléments
- **Tablet** : Adaptation des grilles et navigation
- **Mobile** : Interface optimisée pour petits écrans

## 🔧 Configuration

### Variables d'environnement
- `environment.ts` : Configuration de développement
- `environment.prod.ts` : Configuration de production

### Routes
- `/` → Redirection vers `/interview`
- `/interview` → Composant d'entretien
- `/admin` → Panneau d'administration
- `/question` → Formulaire d'ajout de questions

## 📊 Fonctionnalités avancées

### Gestion des entretiens
- **Phases séquentielles** : Intro → Technique → Soft Skills → Conclusion
- **Validation des réponses** avant progression
- **Possibilité de sauter** des questions
- **Navigation libre** entre phases complétées

### Administration
- **CRUD complet** pour les entretiens
- **Gestion des documents** avec upload
- **Statistiques en temps réel**
- **Export des données** en plusieurs formats

## 🚨 Dépannage

### Problèmes courants

1. **Erreur de compilation SCSS**
   - Vérifier que Bootstrap est installé : `npm install bootstrap`
   - Vérifier les imports dans `styles.scss`

2. **Erreur de routage**
   - Vérifier la configuration dans `app.routes.ts`
   - S'assurer que les composants sont `standalone: true`

3. **Styles non appliqués**
   - Vérifier que Bootstrap est importé dans `styles.scss`
   - Redémarrer le serveur : `ng serve`

### Logs et débogage
```bash
ng serve --verbose          # Mode verbeux
ng build --verbose          # Logs détaillés du build
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur GitHub
- Contacter l'équipe de développement
- Consulter la documentation Angular officielle

---

**TestAI Frontend** - Système d'entretien technique intelligent 🚀
