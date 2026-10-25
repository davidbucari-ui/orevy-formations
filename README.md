# Orevy Formations

Espace de formation en ligne d'Orevy : les participants y retrouvent les formations qui leur sont ouvertes (support en slides, vidéo de la session, séquences, documents, quiz avec attestation) ; l'administrateur y crée les formations et gère les inscriptions.

- **Site** : https://davidbucari-ui.github.io/orevy-formations/
- **Code** : React + Vite, publié par GitHub Pages depuis le dossier `docs/` de `main`
- **Données et connexion** : Supabase (projet `yyqppsvihdgmohnuocqr`)

## Connexion

Il n'y a plus de code d'accès : chacun se connecte avec son **adresse email**. Supabase envoie un code à usage unique (et un lien) par email.

- L'email doit correspondre à une fiche de la table `participants`, sinon l'appli affiche « Aucun compte participant ».
- Une fiche avec `is_admin = true` ouvre l'écran **Administration**. Le bouton « Espace participant » permet de voir l'appli comme un participant.

Les droits sont vérifiés **par Supabase** (règles RLS), pas par le navigateur : un participant ne peut lire que le catalogue et le contenu de ses propres formations, et ne peut rien modifier.

## Administration

| Onglet | Rôle |
|---|---|
| **Formations** | Créer une formation (« + Nouvelle formation »), puis « Gérer → » pour éditer ses informations, séquences, ressources, slides SVG et questions de quiz |
| **Participants** | Inscrire une personne (nom + email), la passer administrateur |
| **Accès** | Ouvrir une ou plusieurs formations à un participant, voir qui a ouvert quoi |

Pour inscrire quelqu'un : **Participants** → nouveau participant, puis **Accès** → cocher ses formations. La personne se connecte ensuite avec son email.

## Mise en service (à faire une fois dans Supabase)

1. **Règles d'accès** — SQL Editor → coller le contenu de [`supabase/001_auth_rls.sql`](supabase/001_auth_rls.sql) → Run. Le script ne touche pas aux données et peut être relancé.
2. **Adresses autorisées** — Authentication → URL Configuration :
   - *Site URL* : `https://davidbucari-ui.github.io/orevy-formations/`
   - *Redirect URLs* : ajouter `https://davidbucari-ui.github.io/orevy-formations/**` et `http://localhost:5173/**`
3. **Code dans l'email** — Authentication → Emails → Templates → *Magic Link* : ajouter le code dans le message, par exemple
   `<p>Votre code de connexion Orevy : <strong>{{ .Token }}</strong></p>` (le lien `{{ .ConfirmationURL }}` peut rester).
4. **Envoi des emails** — le service d'email intégré à Supabase n'envoie qu'aux membres de l'équipe du projet et quelques messages par heure. Pour les participants, configurer un SMTP (Authentication → Emails → SMTP Settings), par exemple Brevo ou Resend.
5. **Clés** — Settings → API Keys : la clé `service_role` publiée autrefois dans ce dépôt doit être révoquée (désactiver les clés JWT « legacy » ou régénérer le secret JWT). L'appli n'utilise que la clé *publishable*.

## Développement

```bash
npm install
npm run dev      # http://localhost:5173/orevy-formations/
npm run build    # régénère docs/ — à commiter pour publier
```

Organisation du code :

```
src/
  App.jsx                    session Supabase, aiguillage connexion / participant / admin
  lib/supabase.js            client Supabase (clé publishable)
  pages/Login.jsx            connexion par code email
  pages/participant/         Mes formations, catalogue, page d'une formation
  pages/admin/               onglets Formations, Participants, Accès + éditeur de formation
  components/                lecteur de slides, quiz + attestation, liste éditable générique
supabase/001_auth_rls.sql    règles d'accès de la base
```

Les tables `formation_blocs` (anciens blocs e-learning narrés) et la colonne `participants.code_acces` sont conservées en base mais ne sont plus utilisées par l'appli.
