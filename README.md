# Stackyx

Stackyx est une maquette front-end d'un site autour de l'impression 3D. Il réunit deux parties :

- **Stackyx** (racine du site) : présentation du matériel, des services d'impression 3D et de l'accompagnement, avec le détail des prestations et un récapitulatif des tarifs.
- **Stackyx Files** (dossier `files/`) : une communauté et une boutique de modèles 3D, avec un catalogue, des fiches modèles, des vidéos, un profil, une page de connexion et d'inscription, et une page pour publier un modèle avec un calcul du prix de vente.

## Technologie

- HTML, CSS et JavaScript simples, sans framework ni étape de compilation.
- Fonctionne entièrement dans le navigateur : les données (comptes, publications, etc.) sont enregistrées dans le `localStorage`, sous des clés préfixées `sx_`.
- Aucun backend, aucune base de données, aucun paiement réel : les commissions et frais affichés sont simulés.

## Structure

```
index.html               Accueil
services.html            Services
services-detaille.html   Services en détail et tarifs
materiel.html            Matériel
files/                   Stackyx Files (communauté et modèles 3D)
css/style.css            Styles communs
js/app.js                Logique commune à toutes les pages
images/                  Images du site
```

## Lancer le site

Ouvrir `index.html` dans un navigateur, ou servir le dossier avec n'importe quel serveur statique, par exemple :

```
python3 -m http.server
```

## Statut

Projet de maquette : il sert à montrer l'interface et le parcours, pas à être utilisé en production.
