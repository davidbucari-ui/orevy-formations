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
| **Suivi** | Où en est chaque participant dans chaque formation : modules lus, meilleur score au quiz, validée ou non. Filtres par structure, formation et état |
| **Formations** | Créer une formation, puis « Gérer → » : informations (dont le seuil de réussite du quiz), parcours e-learning, séquences, ressources, slides, quiz |
| **Participants** | Inscrire une personne et la rattacher à une structure (crèche, client). Sélectionner des participants et leur envoyer l'email de connexion |
| **Accès** | Ouvrir des formations à un participant ou à toute une structure |

Pour inscrire quelqu'un : **Participants** → nouveau participant, **Accès** → cocher ses formations, puis **Participants** → le sélectionner → « Envoyer l'email de connexion ».

### Parcours e-learning

Une formation est découpée en modules (`formation_blocs.sequence_num`). L'onglet « Parcours e-learning » édite chaque bloc par un formulaire adapté à son type, avec un aperçu ; un mode JSON reste disponible.

Types de blocs : séquence, principe, astuce, à retenir, citation, plutôt / à éviter, erreurs à éviter, **question** (correction immédiate), **mise en situation** (réponse libre puis réponse possible), question de réflexion (notes gardées sur l'appareil), à essayer, image, **vidéo** (YouTube ou MP4). Chaque bloc peut porter une narration audio.

### Progression et quiz

- Un module est marqué lu quand le participant arrive en bas de la page. Il retrouve ses coches, un bouton « Reprendre » et une durée estimée par module.
- Le quiz est noté par la base (`quiz_soumettre`) : les participants ne voient jamais les bonnes réponses avant d'avoir répondu. Chaque tentative est enregistrée dans `resultats_quiz` ; l'attestation reprend la date et le score enregistrés.

## Mise en service (à faire une fois dans Supabase)

1. **Base de données** — dans le SQL Editor, exécuter dans l'ordre [`001_auth_rls.sql`](supabase/001_auth_rls.sql) (règles d'accès), [`002_suivi_structures.sql`](supabase/002_suivi_structures.sql) (progression, résultats, structures, envois), puis, une fois le site à jour en ligne, [`003_quiz_reponses_privees.sql`](supabase/003_quiz_reponses_privees.sql). Les scripts ne suppriment aucune donnée et peuvent être relancés.
   La fonction d'envoi des invitations est dans [`supabase/functions/inviter`](supabase/functions/inviter/index.ts), à déployer comme Edge Function (vérification JWT désactivée : elle contrôle elle-même que l'appelant est administrateur).
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
  lib/parcours.js            modules d'une formation, meilleur résultat
  pages/participant/         Mes formations, catalogue, page d'une formation
  pages/admin/               Suivi, Formations, Participants, Accès, éditeur de formation et de blocs
  components/                blocs, lecteurs (parcours, slides), quiz + attestation, liste éditable
supabase/                    scripts SQL 001 à 003, fonction inviter
```

La colonne `participants.code_acces` est conservée en base mais n'est plus utilisée par l'appli.
