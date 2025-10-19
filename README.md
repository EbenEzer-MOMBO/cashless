# 💳 Cashless - Système de Paiement Sans Espèces

Application web et mobile de gestion de paiement cashless pour événements. Cette solution permet de gérer les transactions, les recharges et les ventes de produits lors d'événements, avec un système de rôles complet (Administrateur, Agents, Participants).

![Version](https://img.shields.io/badge/version-0.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)

## 📋 Table des matières

- [Caractéristiques](#caractéristiques)
- [Technologies utilisées](#technologies-utilisées)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Structure du projet](#structure-du-projet)
- [Rôles et permissions](#rôles-et-permissions)
- [Déploiement](#déploiement)

## ✨ Caractéristiques

### 👨‍💼 Espace Administrateur
- 📊 Tableau de bord avec statistiques en temps réel
- 👥 Gestion des agents (création, modification, suppression)
- 🎫 Gestion des participants
- 📦 Gestion des produits et des prix
- 📈 Suivi des transactions et historique complet
- 🎪 Gestion multi-événements

### 🧑‍💼 Espace Agent
Deux types d'agents avec des interfaces dédiées :

**Agent de Recharge**
- 💰 Recharge du solde des participants
- 💸 Remboursement des participants
- 📱 Scanner QR code pour identification rapide
- 📊 Statistiques de recharge
- 📜 Historique des opérations

**Agent de Vente**
- 🛒 Vente de produits
- 📱 Scanner QR code pour identification rapide
- 📊 Statistiques de vente
- 📜 Historique des ventes
- 🔄 Gestion du stock en temps réel

### 👤 Espace Participant
- 💳 Consultation du solde en temps réel
- 📜 Historique des transactions
- 🎟️ Affichage du QR code personnel
- 📱 Paiement mobile
- 🔔 Notifications en temps réel

### 🔐 Sécurité
- Authentification sécurisée par rôle
- Sessions protégées
- Tokens JWT
- Protection des routes
- Validation des données côté client et serveur

## 🛠 Technologies utilisées

### Frontend
- **React 18.3** - Bibliothèque UI
- **TypeScript 5.8** - Typage statique
- **Vite 5.4** - Build tool ultra-rapide
- **React Router 6.30** - Routing
- **TanStack Query 5.83** - Gestion d'état et cache
- **Tailwind CSS 3.4** - Framework CSS
- **shadcn/ui** - Composants UI
- **Radix UI** - Composants accessibles
- **Lucide React** - Icônes
- **Recharts** - Graphiques et statistiques

### Backend
- **Supabase** - Backend as a Service
  - Base de données PostgreSQL
  - Authentification
  - Edge Functions
  - Real-time subscriptions
  - Storage

### Mobile
- **Capacitor 7.4** - Déploiement iOS et Android
- **QR Code Scanner** - Lecture de QR codes

### Outils de développement
- **ESLint** - Linting
- **PostCSS** - Transformation CSS
- **React Hook Form** - Gestion des formulaires
- **Zod** - Validation de schémas

## 📦 Prérequis

- **Node.js** >= 18.0.0
- **npm** ou **bun**
- Compte **Supabase** (pour le backend)
- (Optionnel) **Android Studio** / **Xcode** pour le développement mobile

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone <YOUR_GIT_URL>
cd cashless
```

### 2. Installer les dépendances

```bash
npm install
# ou
bun install
```

### 3. Configuration de l'environnement

Créer un fichier `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Configuration Supabase

Appliquer les migrations de base de données :

```bash
# Installer la CLI Supabase
npm install -g supabase

# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref your-project-ref

# Appliquer les migrations
supabase db push
```

### 5. Lancer l'application en développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 📱 Utilisation

### Accès aux différents espaces

- **Page d'accueil** : `/` ou `/login`
- **Espace Admin** : `/admin/login` → `/admin/dashboard`
- **Espace Agent** : `/agent/login` → `/agent/recharge/dashboard` ou `/agent/vente/dashboard`
- **Espace Participant** : `/participant/login` → `/participant/dashboard`

### Premiers pas

1. **Connexion Admin** : Utiliser les identifiants administrateur
2. **Créer un événement** : Dans le dashboard admin
3. **Créer des agents** : Agents de recharge et/ou de vente
4. **Créer des produits** : Définir le catalogue
5. **Ajouter des participants** : Manuellement ou import en masse
6. **Les agents peuvent commencer** : Recharges et ventes

## 📁 Structure du projet

```
cashless/
├── public/              # Fichiers statiques
├── src/
│   ├── assets/          # Images et ressources
│   ├── components/      # Composants React
│   │   ├── admin/       # Composants admin
│   │   ├── agent/       # Composants agent
│   │   ├── participant/ # Composants participant
│   │   ├── shared/      # Composants partagés
│   │   └── ui/          # Composants UI (shadcn)
│   ├── contexts/        # Contextes React (Auth)
│   ├── hooks/           # Hooks personnalisés
│   ├── integrations/    # Intégrations externes
│   │   └── supabase/    # Client et types Supabase
│   ├── lib/             # Utilitaires
│   ├── pages/           # Pages de l'application
│   │   ├── admin/       # Pages admin
│   │   ├── agent/       # Pages agent
│   │   └── participant/ # Pages participant
│   ├── App.tsx          # Composant racine
│   └── main.tsx         # Point d'entrée
├── supabase/
│   ├── functions/       # Edge Functions
│   └── migrations/      # Migrations SQL
└── package.json
```

## 👥 Rôles et permissions

### 🔴 Administrateur
- Accès complet à tous les modules
- Gestion des événements
- Création et gestion des agents
- Gestion des participants
- Gestion des produits
- Vue sur toutes les statistiques
- Export de données

### 🟡 Agent de Recharge
- Recharger le solde des participants
- Rembourser les participants
- Scanner les QR codes
- Consulter son historique d'opérations
- Voir ses statistiques personnelles

### 🟢 Agent de Vente
- Vendre des produits
- Scanner les QR codes
- Consulter son historique de ventes
- Voir ses statistiques personnelles

### 🔵 Participant
- Consulter son solde
- Voir son historique de transactions
- Afficher son QR code
- Effectuer des paiements mobiles (si activé)

## 🏗 Build et déploiement

### Build de production

```bash
npm run build
```

Les fichiers optimisés seront dans le dossier `dist/`.

### Build de développement

```bash
npm run build:dev
```

### Déploiement Vercel

Le projet est configuré avec `vercel.json`. Pour déployer :

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel
```

### Déploiement Lovable

Ouvrir [Lovable](https://lovable.dev/projects/f2878804-043f-45e6-a2a3-69723265ac14) et cliquer sur Share → Publish.

### Build mobile (Capacitor)

```bash
# Build web
npm run build

# Synchroniser avec Capacitor
npx cap sync

# Ouvrir dans Android Studio
npx cap open android

# Ouvrir dans Xcode
npx cap open ios
```

## 🧪 Scripts disponibles

```bash
npm run dev          # Lance le serveur de développement
npm run build        # Build de production
npm run build:dev    # Build de développement
npm run lint         # Linting du code
npm run preview      # Preview du build
```

## 🤝 Contribution

Ce projet est privé. Pour toute question ou suggestion, contactez l'équipe de développement.

## 📄 License

Privé - Tous droits réservés

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@cashless.com
- 🌐 Site web : https://lovable.dev/projects/f2878804-043f-45e6-a2a3-69723265ac14

---

Développé par l'équipe Eventime Gabon 
