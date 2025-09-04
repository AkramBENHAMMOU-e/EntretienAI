export const AUTH_CONFIG = {
  // Configuration des tokens
  token: {
    // Durée de vie du token en millisecondes (24 heures)
    lifetime: 24 * 60 * 60 * 1000,
    // Clé de stockage local
    storageKey: 'testai_auth',
    // Clé de stockage de session
    sessionKey: 'testai_session'
  },

  // Configuration des routes
  routes: {
    // Route de connexion
    login: '/login',
    // Route par défaut après connexion
    defaultAfterLogin: '/admin',
    // Route de redirection si non authentifié
    unauthorized: '/login',
    // Route de redirection si pas de permissions
    forbidden: '/'
  },

  // Configuration des permissions
  permissions: {
    // Rôles disponibles
    roles: {
      admin: {
        name: 'Administrateur',
        permissions: ['read', 'write', 'delete', 'manage_users', 'export_data']
      },
      manager: {
        name: 'Manager',
        permissions: ['read', 'write', 'export_data']
      },
      viewer: {
        name: 'Lecteur',
        permissions: ['read']
      }
    },

    // Permissions disponibles
    available: [
      'read',           // Lecture des données
      'write',          // Écriture des données
      'delete',         // Suppression des données
      'manage_users',   // Gestion des utilisateurs
      'export_data'     // Export des données
    ]
  },

  // Configuration de sécurité
  security: {
    // Nombre maximum de tentatives de connexion
    maxLoginAttempts: 5,
    // Délai de blocage en millisecondes (15 minutes)
    lockoutDuration: 15 * 60 * 1000,
    // Délai d'expiration de session en millisecondes (30 minutes d'inactivité)
    sessionTimeout: 30 * 60 * 1000,
    // Vérification de l'expiration de session toutes les X millisecondes
    sessionCheckInterval: 5 * 60 * 1000
  },

  // Configuration des mots de passe
  password: {
    // Longueur minimale
    minLength: 8,
    // Exigences de complexité
    requirements: {
      uppercase: true,    // Au moins une majuscule
      lowercase: true,    // Au moins une minuscule
      numbers: true,      // Au moins un chiffre
      specialChars: true  // Au moins un caractère spécial
    }
  },

  // Configuration des notifications
  notifications: {
    // Durée d'affichage des notifications en millisecondes
    duration: 5000,
    // Position des notifications
    position: 'top-right'
  },

  // Configuration de développement
  development: {
    // Activer les comptes de démonstration
    enableDemoAccounts: true,
    // Comptes de démonstration
    demoAccounts: [
      {
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      },
      {
        username: 'manager',
        password: 'manager123',
        role: 'manager'
      },
      {
        username: 'viewer',
        password: 'viewer123',
        role: 'viewer'
      }
    ]
  }
}; 