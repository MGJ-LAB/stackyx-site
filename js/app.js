(function () {
  'use strict';

  /* ---------- Contexte ---------- */
  // data-root vaut '' pour les pages à la racine et '../' pour les pages du dossier files/
  const ROOT = document.body.dataset.root || '';
  const AREA = document.body.dataset.area || 'main';
  const PAGE = document.body.dataset.page || '';
  const F = ROOT + 'files/';
  const RATE_SX = 0.20;      // commission Stackyx
  const RATE_STRIPE = 0.20;  // frais Stripe simulés (exemple demandé)
  const params = new URLSearchParams(location.search);

  /* ---------- Logo ---------- */
  // Chemin principal : images/logo.png (à la racine du site, à côté du dossier files/).
  // Si le fichier est introuvable, les variantes suivantes sont essayées, puis le carré blanc revient.
  const LOGO_FILES = [
    'images/logo.png',
    'Images/logo.png',
    'images/Logo.png',
    'Images/Logo.png',
    'images/Mon%20Logo.png',
    'Images/Mon%20Logo.png',
    'images/logo.svg',
    'images/logo.webp',
    'images/logo.jpg'
  ];

  /* ---------- Utilitaires ---------- */
  const $ = (s, e) => (e || document).querySelector(s);
  const $$ = (s, e) => Array.from((e || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' €';
  const trunc = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'modele';
  const stars = n => { const r = Math.round(n); return '★'.repeat(r) + '☆'.repeat(5 - r); };
  const today = () => new Date().toLocaleDateString('fr-FR');
  const hash = s => { let x = 5381; for (const ch of String(s)) x = ((x << 5) + x + ch.charCodeAt(0)) | 0; return String(x); };

  const mem = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sx_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
    set(k, v) { try { localStorage.setItem('sx_' + k, JSON.stringify(v)); } catch (e) { mem[k] = v; } }
  };

  let toastTimer;
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }
  function openModal(html) {
    closeModal();
    const b = document.createElement('div');
    b.className = 'modal-backdrop'; b.id = 'modal';
    b.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    b.addEventListener('click', e => { if (e.target === b || e.target.closest('[data-close]')) closeModal(); });
    document.body.appendChild(b);
    return b;
  }
  function closeModal() { const m = $('#modal'); if (m) m.remove(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeCart(); } });

  /* ---------- Données de démonstration ---------- */
  const CATS = [
    ['Maison', 'Rangement, déco, cuisine', 'house'], ['Tech', 'Supports, boîtiers, accessoires', 'tech'],
    ['Jouets', 'Jeux, figurines, articulés', 'toy'], ['Outils', 'Atelier, bricolage, réparation', 'tools'],
    ['Déco', 'Vases, luminaires, objets design', 'house'], ['Débutants', 'Premiers modèles faciles', 'toy'],
    ['Confirmés', 'Pièces techniques et avancées', 'tech']
  ];
  const catClass = c => { const f = CATS.find(x => x[0] === c); return f ? f[2] : ''; };
  const SELLER_BASE = { NovaMaker: [4.8, 96], PixelForge: [4.6, 54], LayerLab: [4.9, 210], AtelierBrume: [4.5, 31] };
  const SEED_MODELS = [
    { id: 'm1', title: 'Support smartphone articulé', cat: 'Tech', format: 'STL', level: 'Débutant', price: 2.5, s: 'NovaMaker', tags: 'bureau, téléphone', lic: 'Usage personnel', desc: 'Support réglable en trois positions, imprimable sans supports. Idéal pour le bureau ou la table de chevet.', reviews: [{ by: 'PixelForge', stars: 5, text: 'Solide et précis, il imprime du premier coup.' }, { by: 'LayerLab', stars: 4, text: 'Très pratique, un peu serré au montage.' }] },
    { id: 'm2', title: 'Organisateur de bureau modulaire', cat: 'Maison', format: '3MF', level: 'Débutant', price: 4, s: 'PixelForge', tags: 'rangement, bureau', lic: 'Usage personnel', desc: 'Des modules qui s\'emboîtent pour ranger stylos, câbles et petits outils. Dimensions personnalisables.', reviews: [{ by: 'NovaMaker', stars: 5, text: 'Très bien pensé, les modules se clipsent parfaitement.' }] },
    { id: 'm3', title: 'Dragon articulé', cat: 'Jouets', format: 'STL', level: 'Intermédiaire', price: 0, s: 'LayerLab', tags: 'figurine, articulé', lic: 'Usage personnel', desc: 'Un dragon imprimé en une seule fois, articulé sans assemblage. Gratuit pour la communauté.', reviews: [{ by: 'AtelierBrume', stars: 5, text: 'Les enfants adorent.' }, { by: 'NovaMaker', stars: 5, text: 'Impression en place très réussie.' }] },
    { id: 'm4', title: 'Clé de dépannage universelle', cat: 'Outils', format: 'STEP', level: 'Confirmé', price: 3, s: 'AtelierBrume', tags: 'atelier, clé', lic: 'Usage personnel et commercial', desc: 'Clé réglable à imprimer en PETG, avec tolérances testées pour les machines courantes.', reviews: [{ by: 'LayerLab', stars: 4, text: 'Solide en PETG, à imprimer avec 5 périmètres.' }] },
    { id: 'm5', title: 'Lampe lithophane', cat: 'Déco', format: 'STL', level: 'Intermédiaire', price: 5, s: 'NovaMaker', tags: 'lumière, photo', lic: 'Usage personnel', desc: 'Support de lampe pour lithophane avec logement LED et passage de câble discret.', reviews: [{ by: 'PixelForge', stars: 5, text: 'Rendu superbe avec du PLA blanc.' }] },
    { id: 'm6', title: 'Boîtier pour mini-ordinateur', cat: 'Tech', format: '3MF', level: 'Débutant', price: 1, s: 'PixelForge', tags: 'électronique, boîtier', lic: 'Usage personnel', desc: 'Boîtier ventilé en deux parties, fixation par vis standard. Prévu pour les cartes de type mini-PC.', reviews: [] }
  ];
  const SEED_POSTS = [
    { id: 'p1', type: 'article', title: 'Mes 5 réglages pour réussir la première couche', body: 'Niveau du plateau, hauteur de la première couche, température, vitesse réduite et plateau propre : voici les cinq points qui ont changé mes impressions. Je détaille chaque réglage avec des exemples simples pour les débutants.', a: 'LayerLab', date: '12/10/2026' },
    { id: 'p2', type: 'article', title: 'PLA ou PETG : lequel choisir pour débuter ?', body: 'Le PLA est facile et précis, le PETG est plus résistant mais demande un peu plus de réglages. Voici mon retour après six mois d\'utilisation de chaque matière.', a: 'NovaMaker', date: '08/10/2026' },
    { id: 'p3', type: 'video', title: 'Calibrer son extrudeur en 10 minutes', body: 'Une vidéo pas à pas pour vérifier le débit de votre extrudeur.', url: 'https://example.com/video-calibrage', a: 'PixelForge', date: '03/10/2026' },
    { id: 'p4', type: 'article', title: 'Comment j\'ai monté un petit atelier à la maison', body: 'Rangement, ventilation, bruit et sécurité : mon retour d\'expérience pour installer une imprimante dans un appartement.', a: 'AtelierBrume', date: '28/09/2026' }
  ];

  /* ---------- Comptes et accès aux données ---------- */
  const users = () => store.get('users', []);
  const findUser = e => users().find(u => u.email === e);
  const aliasOfKey = k => { const u = findUser(k); return u ? u.alias : k; };
  const keyOfAlias = a => {
    const l = String(a).toLowerCase();
    const u = users().find(x => x.alias.toLowerCase() === l);
    if (u) return u.email;
    return Object.keys(SELLER_BASE).find(x => x.toLowerCase() === l) || null;
  };
  const aliasTaken = (a, exceptEmail) => {
    const l = a.toLowerCase();
    return users().some(u => u.email !== exceptEmail && u.alias.toLowerCase() === l) || Object.keys(SELLER_BASE).some(x => x.toLowerCase() === l);
  };
  function aliasError(a, exceptEmail) {
    if (!/^[\p{L}\p{N}_. -]{3,20}$/u.test(a)) return 'L\'alias doit faire 3 à 20 caractères (lettres, chiffres, _ . -).';
    if (aliasTaken(a, exceptEmail)) return 'Cet alias est déjà utilisé, choisis-en un autre.';
    return '';
  }
  const currentUser = () => { const e = store.get('session', null); return e ? findUser(e) || null : null; };
  function saveUser(u) { store.set('users', users().map(x => x.email === u.email ? u : x)); }
  function requireAuth() {
    const u = currentUser();
    if (!u) {
      const cur = (location.pathname.split('/').pop() || 'index.html') + location.search;
      location.href = F + 'connexion.html?next=' + encodeURIComponent(cur);
      return null;
    }
    return u;
  }
  const models = () => SEED_MODELS.concat(store.get('models', []));
  const posts = () => store.get('posts', []).concat(SEED_POSTS);
  const modelReviews = id => { const m = models().find(x => x.id === id); return ((m && m.reviews) || []).concat(store.get('reviews', {})[id] || []); };
  function modelRating(id) {
    const r = modelReviews(id);
    return { count: r.length, avg: r.length ? r.reduce((t, x) => t + x.stars, 0) / r.length : 0 };
  }
  function sellerRating(key) {
    const b = SELLER_BASE[key] || [0, 0];
    const ex = store.get('srate', {})[key] || [];
    const n = b[1] + ex.length;
    return { count: n, avg: n ? (b[0] * b[1] + ex.reduce((t, x) => t + x.stars, 0)) / n : 0 };
  }
  const acqs = () => store.get('acq', []);
  const hasAcq = (email, id) => acqs().some(a => a.email === email && a.modelId === id);
  const hasPaidFrom = (email, key) => acqs().some(a => a.email === email && a.paid && (models().find(m => m.id === a.modelId) || {}).s === key);
  function addAcq(u, m, paid) {
    const list = acqs();
    list.push({ email: u.email, modelId: m.id, paid: paid, price: calc(m.price).pub, date: today() });
    store.set('acq', list);
  }

  /* ---------- Calcul du prix ---------- */
  function calc(p) {
    const c = Math.max(0, Math.round((Number(p) || 0) * 100));
    const sx = Math.round(c * RATE_SX), st = Math.round(c * RATE_STRIPE);
    return { seller: c / 100, sx: sx / 100, stripe: st / 100, pub: (c + sx + st) / 100 };
  }
  function calcHtml(p) {
    const c = calc(p);
    return '<div class="calc">' +
      '<div class="calc-row pos"><span>Prix attendu (tu reçois toujours ce montant)</span><strong>' + money(c.seller) + '</strong></div>' +
      '<div class="calc-row fee"><span>+ Commission Stackyx (' + Math.round(RATE_SX * 100) + ' %)</span><strong>' + money(c.sx) + '</strong></div>' +
      '<div class="calc-row fee"><span>+ Frais Stripe (' + Math.round(RATE_STRIPE * 100) + ' %, simulés)</span><strong>' + money(c.stripe) + '</strong></div>' +
      '<div class="calc-row total"><span>Prix de vente affiché à l\'acheteur</span><strong>' + (c.pub === 0 ? 'Gratuit' : money(c.pub)) + '</strong></div></div>';
  }

  /* ---------- Composants ---------- */
  function avatarHtml(u, cls) {
    cls = cls || '';
    if (u && u.avatar) return '<img class="avatar ' + cls + '" src="' + esc(u.avatar) + '" alt="">';
    const n = u ? u.alias : '?';
    return '<span class="avatar ' + cls + '">' + esc(n.charAt(0).toUpperCase()) + '</span>';
  }
  function starInput(box) {
    box.dataset.v = '0';
    box.innerHTML = [1, 2, 3, 4, 5].map(i => '<button type="button" class="star" data-v="' + i + '" aria-label="' + i + ' étoile' + (i > 1 ? 's' : '') + '">★</button>').join('');
    box.addEventListener('click', e => {
      const b = e.target.closest('.star'); if (!b) return;
      box.dataset.v = b.dataset.v;
      $$('.star', box).forEach(s => s.classList.toggle('on', +s.dataset.v <= +b.dataset.v));
    });
  }
  const initStars = root => $$('.star-input', root).forEach(starInput);

  function modelCard(m) {
    const c = calc(m.price), r = modelRating(m.id), name = aliasOfKey(m.s);
    return '<article class="card model-card">' +
      '<a class="cover ' + catClass(m.cat) + '" href="modele.html?id=' + m.id + '"><span class="cover-label">' + esc(m.cat) + '</span></a>' +
      '<div class="card-content"><h3><a href="modele.html?id=' + m.id + '">' + esc(m.title) + '</a></h3>' +
      '<p>' + esc(trunc(m.desc, 90)) + '</p>' +
      '<div class="chips"><span class="chip">' + esc(m.format) + '</span><span class="chip">' + esc(m.level) + '</span></div>' +
      '<div class="row small muted"><a href="profil.html?alias=' + encodeURIComponent(name) + '">par ' + esc(name) + '</a>' +
      '<span class="rating">' + (r.count ? stars(r.avg) + ' <span class="muted">(' + r.count + ')</span>' : 'Nouveau') + '</span></div>' +
      '<div class="row"><span class="price ' + (c.pub === 0 ? 'free' : '') + '">' + (c.pub === 0 ? 'Gratuit' : money(c.pub)) + '</span>' +
      '<a class="btn btn-primary btn-small" href="modele.html?id=' + m.id + '">Voir</a></div></div></article>';
  }
  function postCard(p) {
    return '<article class="card post-card"><div class="card-content">' +
      '<div class="chips"><span class="chip ' + (p.type === 'video' ? 'gold' : '') + '">' + (p.type === 'video' ? 'Vidéo' : 'Rédaction') + '</span></div>' +
      '<h3>' + esc(p.title) + '</h3><p>' + esc(trunc(p.body, 140)) + '</p>' +
      (p.type === 'video' ? '<a class="btn btn-gold btn-small" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">Voir la vidéo</a>' :
        (p.body.length > 140 ? '<details><summary class="gold small" style="cursor:pointer">Lire la suite</summary><p style="margin-top:8px">' + esc(p.body) + '</p></details>' : '')) +
      '<div class="row small muted"><a href="profil.html?alias=' + encodeURIComponent(aliasOfKey(p.a)) + '">par ' + esc(aliasOfKey(p.a)) + '</a><span>' + esc(p.date) + '</span></div></div></article>';
  }

  /* ---------- En-tête et pied de page ---------- */
  function renderHeader() {
    const u = currentUser();
    const links = AREA === 'files' ? [
      [F + 'index.html', 'Accueil', 'f-home'], [F + 'communaute.html', 'Communauté', 'f-community'],
      [F + 'modeles.html', 'Modèles 3D', 'f-models'], [F + 'videos.html', 'Vidéos', 'f-videos'],
      [F + 'publier.html', 'Publier', 'f-publish'], [ROOT + 'index.html', 'Site principal', 'alt']
    ] : [
      [ROOT + 'index.html', 'Accueil', 'home'], [ROOT + 'materiel.html', 'Matériel', 'materiel'],
      [ROOT + 'services.html', 'Services', 'services'], [ROOT + 'services-detaille.html', 'Détail services', 'services-detaille'],
      [F + 'index.html', 'Stackyx Files', 'alt']
    ];
    const nav = links.map(l => '<a href="' + l[0] + '" class="' + (l[2] === PAGE ? 'active ' : '') + (l[2] === 'alt' ? 'alt' : '') + '">' + l[1] + '</a>').join('');
    let right;
    if (AREA === 'main') right = '<button class="btn btn-ghost" id="openCart" aria-label="Ouvrir le panier">Panier <span class="badge" id="cartCount">0</span></button>';
    else right = u ? '<a class="btn btn-ghost acc" href="' + F + 'profil.html">' + avatarHtml(u) + '<span>' + esc(u.alias) + '</span></a>'
      : '<a class="btn btn-gold" href="' + F + 'connexion.html">Se connecter</a>';
    const el = $('#site-header'); if (!el) return;
    el.innerHTML = '<header class="site-header"><div class="wrap header-inner">' +
      '<a class="brand" href="' + (AREA === 'files' ? F + 'index.html' : ROOT + 'index.html') + '" aria-label="Accueil Stackyx">' +
      '<img class="logo-img" src="' + ROOT + LOGO_FILES[0] + '" alt="Logo Stackyx" width="44" height="44" data-try="0">' +
      '<div><div class="brand-name">STACKYX</div>' + (AREA === 'files' ? '<span class="brand-sub">FILES</span>' : '') + '</div></a>' +
      '<nav class="menu" id="menu" aria-label="Navigation principale">' + nav + '</nav>' +
      '<div class="actions">' + right + '<button class="burger" id="burger" aria-label="Ouvrir le menu" aria-expanded="false">&#9776;</button></div></div></header>';

    // Logo : essaie les chemins de secours, puis revient au carré blanc
    const logo = $('.logo-img', el);
    logo.addEventListener('error', () => {
      const i = Number(logo.dataset.try) + 1;
      if (i < LOGO_FILES.length) { logo.dataset.try = String(i); logo.src = ROOT + LOGO_FILES[i]; }
      else {
        const box = document.createElement('div');
        box.className = 'logo-place'; box.setAttribute('role', 'img'); box.setAttribute('aria-label', 'Logo introuvable : vérifie images/logo.png');
        logo.replaceWith(box);
        if (window.console) console.warn('Stackyx : logo introuvable. Place-le dans images/logo.png (à la racine du site).');
      }
    });

    const burger = $('#burger'), menu = $('#menu');
    burger.addEventListener('click', () => {
      const o = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(o));
      burger.innerHTML = o ? '&#10005;' : '&#9776;';
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 1100) menu.classList.remove('open'); });
  }
  function renderFooter() {
    const el = $('#site-footer'); if (!el) return;
    el.innerHTML = '<footer class="site-footer"><div class="wrap"><span>Stackyx · matériel, services et communauté d\'impression 3D. Maquette de démonstration, données fictives.</span>' +
      '<nav><a href="' + ROOT + 'index.html">Site principal</a><a href="' + ROOT + 'services-detaille.html">Services</a><a href="' + F + 'index.html">Stackyx Files</a><a href="' + F + 'modeles.html">Modèles 3D</a></nav></div></footer>';
  }

  /* ---------- Paiement Stripe simulé ---------- */
  function payModal(label, amount, done) {
    openModal('<h2>Paiement sécurisé</h2><p class="muted">' + esc(label) + '</p>' +
      '<div class="calc"><div class="calc-row total"><span>Total à payer</span><strong>' + money(amount) + '</strong></div></div>' +
      '<p class="notice small" style="margin-top:12px">Simulation : dans la version réelle, tu es redirigé vers Stripe Checkout. Aucune carte n\'est demandée ici.</p>' +
      '<div class="cta"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" id="payOk">Simuler le paiement Stripe</button></div>');
    $('#payOk').addEventListener('click', () => { closeModal(); done(); });
  }
  function downloadFile(m) {
    const txt = 'solid stackyx_demo\n facet normal 0 0 1\n  outer loop\n   vertex 0 0 0\n   vertex 10 0 0\n   vertex 0 10 0\n  endloop\n endfacet\nendsolid stackyx_demo\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
    a.download = slug(m.title) + '.stl';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toast('Téléchargement de démonstration lancé');
  }

  /* ---------- Panier (site principal) ---------- */
  let cart = store.get('cart', []);
  function closeCart() { const p = $('#cartPanel'); if (p) { p.classList.remove('open'); $('#cartVeil').classList.remove('open'); } }
  function initCart() {
    const wrap = document.createElement('div');
    wrap.innerHTML = '<div class="veil" id="cartVeil"></div><aside class="cart" id="cartPanel" aria-label="Panier">' +
      '<div class="cart-total"><span>Mon panier</span><button class="btn btn-ghost btn-small" id="closeCart">Fermer</button></div>' +
      '<div class="cart-list" id="cartList"></div><div class="cart-total"><span>Total</span><span id="cartTotal">0 €</span></div>' +
      '<p class="help">Paiement via Stripe (simulation).</p><button class="btn btn-gold" id="cartPay">Payer avec Stripe</button></aside>';
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
    const draw = () => {
      const list = $('#cartList'); list.innerHTML = '';
      let total = 0, n = 0;
      if (!cart.length) list.innerHTML = '<p class="muted">Ton panier est vide.</p>';
      cart.forEach((it, i) => {
        total += it.price * it.qty; n += it.qty;
        const line = document.createElement('div'); line.className = 'cart-line';
        line.innerHTML = '<span>' + esc(it.name) + '<br><small class="muted">' + money(it.price) + ' × ' + it.qty + '</small></span>' +
          '<span style="display:flex;gap:6px"><button aria-label="Retirer">−</button><button aria-label="Ajouter">+</button></span>';
        const b = line.querySelectorAll('button');
        b[0].onclick = () => { it.qty--; if (it.qty <= 0) cart.splice(i, 1); sync(); };
        b[1].onclick = () => { it.qty++; sync(); };
        list.appendChild(line);
      });
      $('#cartCount').textContent = n; $('#cartTotal').textContent = money(total);
    };
    const sync = () => { store.set('cart', cart); draw(); };
    $('#openCart').addEventListener('click', () => { $('#cartPanel').classList.add('open'); $('#cartVeil').classList.add('open'); });
    $('#closeCart').addEventListener('click', closeCart);
    $('#cartVeil').addEventListener('click', closeCart);
    $('#cartPay').addEventListener('click', () => {
      if (!cart.length) { toast('Ton panier est vide'); return; }
      const total = cart.reduce((t, i) => t + i.price * i.qty, 0);
      payModal('Commande Stackyx', total, () => { cart = []; sync(); closeCart(); toast('Commande de démonstration validée'); });
    });
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-add]'); if (!b) return;
      const name = b.dataset.add, price = Number(b.dataset.price);
      const ex = cart.find(i => i.name === name);
      if (ex) ex.qty++; else cart.push({ name: name, price: price, qty: 1 });
      sync(); toast('Ajouté : ' + name);
    });
    draw();
  }

  /* ---------- Quiz (Services) ---------- */
  function initQuiz() {
    const Q = [
      { q: 'Quel est ton objectif principal ?', o: [['Imprimer des objets déco ou des jouets', { pack: 1 }], ['Créer mes propres pièces utiles', { createur: 1 }], ['Apprendre les bases et la technique', { pack: 1, formation: 1 }]] },
      { q: 'Combien de temps peux-tu y consacrer ?', o: [['Quelques heures par semaine', { pack: 1 }], ['Presque tous les jours', { createur: 1 }], ['Je veux être accompagné', { formation: 1, assistance: 1 }]] },
      { q: 'Qu\'est-ce qui t\'inquiète le plus ?', o: [['Me tromper dans les réglages', { formation: 1, assistance: 1 }], ['Rater mes impressions', { pack: 1 }], ['Manquer de matière', { createur: 1 }]] }
    ];
    const R = {
      pack: ['Pack Premier Pas', 'Pour démarrer simplement avec une machine prête à l\'emploi.'],
      createur: ['Pack Créateur', 'Pour produire régulièrement avec plus de matière.'],
      formation: ['Formation Ma première impression', 'Pour apprendre pas à pas.'],
      assistance: ['Assistance Stackyx', 'Pour être accompagné à distance dans tes premières impressions.']
    };
    let step = 0, sc = {};
    const draw = () => {
      const z = $('#quizOptions');
      if (step >= Q.length) {
        const best = Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0];
        $('#quizProgress').textContent = 'Résultat';
        $('#quizQuestion').textContent = 'Notre recommandation pour toi';
        z.innerHTML = '<p><strong class="gold">' + R[best][0] + '</strong><br>' + R[best][1] + '</p>';
        const b = document.createElement('button'); b.className = 'btn btn-ghost'; b.textContent = 'Refaire le quiz';
        b.onclick = () => { step = 0; sc = {}; draw(); }; z.appendChild(b);
        return;
      }
      $('#quizProgress').textContent = 'Question ' + (step + 1) + ' sur ' + Q.length;
      $('#quizQuestion').textContent = Q[step].q; z.innerHTML = '';
      Q[step].o.forEach(o => {
        const b = document.createElement('button'); b.className = 'btn btn-ghost'; b.style.justifyContent = 'flex-start'; b.textContent = o[0];
        b.onclick = () => { Object.keys(o[1]).forEach(k => sc[k] = (sc[k] || 0) + o[1][k]); step++; draw(); };
        z.appendChild(b);
      });
    };
    draw();
  }

  /* ---------- Files : accueil ---------- */
  function initFilesHome() {
    const all = models();
    const rv = all.reduce((a, m) => a.concat(modelReviews(m.id)), []);
    $('#st-members').textContent = Object.keys(SELLER_BASE).length + users().length;
    $('#st-models').textContent = all.length;
    $('#st-posts').textContent = posts().length;
    $('#st-rating').textContent = rv.length ? (rv.reduce((t, r) => t + r.stars, 0) / rv.length).toFixed(1).replace('.', ',') + '/5' : '—';
    $('#catGrid').innerHTML = CATS.slice(0, 4).map(c => '<a class="cat-card" href="modeles.html?cat=' + encodeURIComponent(c[0]) + '"><strong>' + c[0] + '</strong><span>' + c[1] + '</span></a>').join('');
    $('#popular').innerHTML = all.slice().sort((a, b) => modelRating(b.id).count - modelRating(a.id).count).slice(0, 3).map(modelCard).join('');
    $('#latest').innerHTML = posts().slice(0, 4).map(postCard).join('');
  }

  /* ---------- Files : communauté ---------- */
  function initCommunity() {
    const draw = () => {
      const q = $('#postSearch').value.trim().toLowerCase();
      const list = posts().filter(p => p.type !== 'video' && (p.title + ' ' + p.body).toLowerCase().includes(q));
      $('#communityPosts').innerHTML = list.length ? list.map(postCard).join('') : '<p class="muted">Aucune publication trouvée.</p>';
    };
    $('#postSearch').addEventListener('input', draw); draw();
  }

  /* ---------- Files : vidéos ---------- */
  function initVideos() {
    const list = posts().filter(p => p.type === 'video');
    $('#videoList').innerHTML = list.length ? list.map(postCard).join('') : '<p class="muted">Aucune vidéo pour le moment.</p>';
  }

  /* ---------- Files : liste des modèles ---------- */
  function initModels() {
    const sel = $('#catFilter');
    sel.innerHTML = '<option value="">Toutes les catégories</option>' + CATS.map(c => '<option>' + c[0] + '</option>').join('');
    if (params.get('cat')) sel.value = params.get('cat');
    const draw = () => {
      const q = $('#modelSearch').value.trim().toLowerCase(), cat = sel.value, fmt = $('#fmtFilter').value, sort = $('#sortFilter').value;
      let list = models().filter(m =>
        (!cat || m.cat === cat) && (!fmt || m.format === fmt) &&
        (m.title + ' ' + m.desc + ' ' + (m.tags || '') + ' ' + aliasOfKey(m.s)).toLowerCase().includes(q));
      const price = m => calc(m.price).pub;
      if (sort === 'asc') list.sort((a, b) => price(a) - price(b));
      else if (sort === 'desc') list.sort((a, b) => price(b) - price(a));
      else if (sort === 'rated') list.sort((a, b) => modelRating(b.id).avg - modelRating(a.id).avg);
      else if (sort === 'new') list.reverse();
      else list.sort((a, b) => modelRating(b.id).count - modelRating(a.id).count);
      $('#modelCount').textContent = list.length + ' modèle' + (list.length > 1 ? 's' : '');
      $('#modelList').innerHTML = list.length ? list.map(modelCard).join('') : '<p class="muted">Aucun modèle ne correspond à ta recherche.</p>';
    };
    ['modelSearch', 'catFilter', 'fmtFilter', 'sortFilter'].forEach(id => $('#' + id).addEventListener('input', draw));
    draw();
  }

  /* ---------- Vendeur : note ---------- */
  function sellerRateHtml(key) {
    const u = currentUser();
    if (!u) return '<p class="muted small">Connecte-toi pour noter ce vendeur.</p>';
    if (u.email === key) return '';
    if (!hasPaidFrom(u.email, key)) return '<p class="muted small">Seuls les clients de ce vendeur peuvent le noter.</p>';
    if ((store.get('srate', {})[key] || []).some(r => r.by === u.email)) return '<p class="muted small">Tu as déjà noté ce vendeur. Merci !</p>';
    return '<div class="rate-seller"><strong>Noter ce vendeur</strong><div class="star-input"></div><button class="btn btn-primary btn-small" data-act="rate">Envoyer ma note</button></div>';
  }
  function rateSeller(root, key) {
    const u = currentUser(), sel = $('.rate-seller .star-input', root);
    const v = sel ? +sel.dataset.v : 0;
    if (!v) { toast('Choisis une note de 1 à 5'); return false; }
    const s = store.get('srate', {});
    (s[key] = s[key] || []).push({ by: u.email, stars: v });
    store.set('srate', s); toast('Merci pour ta note'); return true;
  }

  /* ---------- Files : fiche modèle ---------- */
  function initModel() {
    const id = params.get('id'), m = models().find(x => x.id === id), box = $('#modelView');
    if (!m) { box.innerHTML = '<div class="card card-body">Modèle introuvable. <a class="gold" href="modeles.html">Retour aux modèles</a></div>'; return; }
    const draw = () => {
      const u = currentUser(), c = calc(m.price), free = c.pub === 0;
      const own = !!u && m.s === u.email, acq = !!u && hasAcq(u.email, m.id);
      const rv = modelReviews(m.id), r = modelRating(m.id), name = aliasOfKey(m.s), sr = sellerRating(m.s);
      let action;
      if (!u) action = '<button class="btn btn-primary" data-act="login">Se connecter pour ' + (free ? 'télécharger' : 'acheter') + '</button>';
      else if (own || acq) action = '<button class="btn btn-gold" data-act="dl">Télécharger le fichier</button>';
      else if (free) action = '<button class="btn btn-gold" data-act="free">Télécharger gratuitement</button>';
      else action = '<button class="btn btn-gold" data-act="buy">Acheter avec Stripe</button>';
      let reviewForm;
      if (!u) reviewForm = '<p class="muted small">Connecte-toi pour laisser un avis.</p>';
      else if (own) reviewForm = '<p class="muted small">Tu ne peux pas évaluer ton propre modèle.</p>';
      else if (!acq) reviewForm = '<p class="muted small">Seuls les acheteurs de ce modèle peuvent laisser un avis.</p>';
      else if (rv.some(x => x.by === u.email)) reviewForm = '<p class="muted small">Tu as déjà donné ton avis. Merci !</p>';
      else reviewForm = '<form id="reviewForm" class="fg"><label>Ton avis sur ce modèle</label><div class="star-input"></div><textarea class="textarea" name="text" maxlength="500" placeholder="Qualité du fichier, facilité d\'impression…" style="min-height:90px"></textarea><button class="btn btn-primary btn-small" style="justify-self:start">Publier mon avis</button></form>';
      box.innerHTML = '<div class="detail"><div class="preview"><div>' + esc(m.format) + '<br><small>Aperçu 3D à venir</small></div></div>' +
        '<div class="card card-body"><div class="chips"><span class="chip gold">' + esc(m.cat) + '</span><span class="chip">' + esc(m.format) + '</span><span class="chip">' + esc(m.level) + '</span></div>' +
        '<h1 style="font-size:1.7rem;margin:12px 0 6px">' + esc(m.title) + '</h1>' +
        '<p class="muted">par <a class="gold" href="profil.html?alias=' + encodeURIComponent(name) + '">' + esc(name) + '</a> · <span class="rating">' + (sr.count ? stars(sr.avg) + '</span> ' + sr.avg.toFixed(1).replace('.', ',') + ' (' + sr.count + ' avis vendeur)' : '</span>nouveau vendeur') + '</p>' +
        '<p style="margin:14px 0" class="muted">' + esc(m.desc) + '</p>' +
        (m.tags ? '<div class="chips">' + String(m.tags).split(',').map(t => '<span class="chip">' + esc(t.trim()) + '</span>').join('') + '</div>' : '') +
        '<p class="small muted" style="margin-top:10px">Licence : ' + esc(m.lic || 'Usage personnel') + '</p>' +
        '<div class="buy-box"><div class="row"><span class="price ' + (free ? 'free' : '') + '">' + (free ? 'Gratuit' : money(c.pub)) + '</span><span class="rating">' + (r.count ? stars(r.avg) + ' (' + r.count + ')' : 'Aucun avis') + '</span></div>' + action +
        '<p class="help">Un compte est obligatoire. Paiement des modèles payants via Stripe.</p></div></div></div>' +
        '<div class="grid g2" style="margin-top:18px"><div class="card card-body"><h2 style="font-size:1.15rem;margin-bottom:8px">Avis sur le modèle</h2>' +
        (rv.length ? rv.map(x => '<div class="review"><div class="row"><strong>' + esc(aliasOfKey(x.by)) + '</strong><span class="rating">' + stars(x.stars) + '</span></div><p>' + esc(x.text) + '</p></div>').join('') : '<p class="muted">Pas encore d\'avis.</p>') +
        '<div style="margin-top:14px">' + reviewForm + '</div></div>' +
        '<div class="card card-body"><h2 style="font-size:1.15rem;margin-bottom:8px">Le vendeur</h2><p><a class="gold" href="profil.html?alias=' + encodeURIComponent(name) + '">' + esc(name) + '</a></p><p class="muted small">' + (sr.count ? sr.avg.toFixed(1).replace('.', ',') + '/5 sur ' + sr.count + ' avis' : 'Pas encore noté') + '</p>' + sellerRateHtml(m.s) + '</div></div>';
      initStars(box);
    };
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const u = currentUser(), act = b.dataset.act;
      if (act === 'login') location.href = 'connexion.html?next=' + encodeURIComponent('modele.html?id=' + m.id);
      else if (act === 'dl') downloadFile(m);
      else if (act === 'free') { addAcq(u, m, false); draw(); downloadFile(m); }
      else if (act === 'buy') payModal(m.title, calc(m.price).pub, () => { addAcq(u, m, true); draw(); toast('Paiement validé, tu peux télécharger'); });
      else if (act === 'rate') { if (rateSeller(box, m.s)) draw(); }
    });
    box.addEventListener('submit', e => {
      if (e.target.id !== 'reviewForm') return;
      e.preventDefault();
      const u = currentUser(), v = +$('.star-input', e.target).dataset.v;
      if (!v) { toast('Choisis une note de 1 à 5'); return; }
      const all = store.get('reviews', {});
      (all[m.id] = all[m.id] || []).push({ by: u.email, stars: v, text: e.target.elements.text.value.trim() || 'Sans commentaire.' });
      store.set('reviews', all); toast('Merci pour ton avis'); draw();
    });
    draw();
  }

  /* ---------- Files : connexion / inscription ---------- */
  function initAuth() {
    const next = params.get('next') || '';
    const safe = /^[a-z0-9-]+\.html(\?[^\s]*)?$/i.test(next) ? next : 'profil.html';
    if (currentUser()) { location.href = safe; return; }
    const tabs = $$('[data-tab]');
    const show = t => { tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === t)); $('#loginForm').classList.toggle('hidden', t !== 'login'); $('#signupForm').classList.toggle('hidden', t !== 'signup'); };
    tabs.forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
    show(params.get('mode') === 'signup' ? 'signup' : 'login');

    $('#loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(e.target), email = String(d.get('email')).trim().toLowerCase();
      const u = findUser(email);
      if (!u || u.pass !== hash(d.get('pass'))) { $('#loginErr').textContent = 'E-mail ou mot de passe incorrect.'; return; }
      store.set('session', u.email); location.href = safe;
    });
    $('#signupForm').addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(e.target), g = k => String(d.get(k) || '').trim();
      const err = $('#signupErr'); let msg = '';
      const email = g('email').toLowerCase();
      if (!g('first') || !g('last')) msg = 'Renseigne ton nom et ton prénom réels.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) msg = 'Adresse e-mail invalide.';
      else if (findUser(email)) msg = 'Un compte existe déjà avec cet e-mail.';
      else if (!/^[+0-9 .()-]{9,20}$/.test(g('phone'))) msg = 'Numéro de téléphone invalide.';
      else if (!g('street') || !/^\d{5}$/.test(g('zip')) || !g('city')) msg = 'Adresse incomplète (rue, code postal à 5 chiffres, ville).';
      else if (aliasError(g('alias'), '')) msg = aliasError(g('alias'), '');
      else if (String(d.get('pass')).length < 8) msg = 'Le mot de passe doit faire au moins 8 caractères.';
      else if (d.get('pass') !== d.get('pass2')) msg = 'Les mots de passe ne correspondent pas.';
      else if (!d.get('terms')) msg = 'Tu dois accepter les conditions d\'utilisation.';
      err.textContent = msg; if (msg) return;
      const list = users();
      list.push({ email: email, first: g('first'), last: g('last'), phone: g('phone'), street: g('street'), zip: g('zip'), city: g('city'), alias: g('alias'), pass: hash(d.get('pass')), avatar: '', date: today() });
      store.set('users', list); store.set('session', email);
      toast('Compte créé, bienvenue !'); setTimeout(() => { location.href = safe; }, 600);
    });
    $('#aliasCheck').addEventListener('input', e => {
      const v = e.target.value.trim(), out = $('#aliasHint');
      if (!v) { out.textContent = ''; return; }
      const er = aliasError(v, '');
      out.textContent = er || 'Alias disponible ✓'; out.style.color = er ? '#ff9a9a' : '#38c991';
    });
  }

  /* ---------- Files : publier ---------- */
  function initPublish() {
    const u = requireAuth(); if (!u) return;
    let type = ['article', 'video', 'model'].includes(params.get('type')) ? params.get('type') : 'article';
    const show = t => { type = t; $$('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t)); ['article', 'video', 'model'].forEach(x => $('#panel-' + x).classList.toggle('hidden', x !== t)); };
    $$('[data-tab]').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
    show(type);
    $('#m-cat').innerHTML = CATS.map(c => '<option>' + c[0] + '</option>').join('');

    const savePost = (e, kind) => {
      e.preventDefault();
      const f = e.target, title = f.elements.title.value.trim(), body = f.elements.body.value.trim();
      const err = $('#' + kind + 'Err'); err.textContent = '';
      if (title.length < 5) { err.textContent = 'Le titre est trop court (5 caractères minimum).'; return; }
      if (body.length < 20) { err.textContent = 'Le texte est trop court (20 caractères minimum).'; return; }
      const post = { id: 'u' + Date.now().toString(36), type: kind, title: title, body: body, a: u.email, date: today() };
      if (kind === 'video') {
        const url = f.elements.url.value.trim();
        if (!/^https?:\/\/\S+$/i.test(url)) { err.textContent = 'Indique un lien vidéo valide (http ou https).'; return; }
        post.url = url;
      }
      const l = store.get('posts', []); l.unshift(post); store.set('posts', l);
      toast('Publication en ligne'); setTimeout(() => { location.href = kind === 'video' ? 'videos.html' : 'communaute.html'; }, 600);
    };
    $('#articleForm').addEventListener('submit', e => savePost(e, 'article'));
    $('#videoForm').addEventListener('submit', e => savePost(e, 'video'));

    const price = $('#m-price'), out = $('#calcBox');
    const parse = () => parseFloat(String(price.value).replace(',', '.'));
    const upd = () => { const p = parse(); out.innerHTML = calcHtml(isNaN(p) ? 0 : p); };
    price.addEventListener('input', upd); upd();

    $('#modelForm').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target, err = $('#modelErr'); err.textContent = '';
      const title = f.elements.title.value.trim(), desc = f.elements.desc.value.trim(), p = parse(), file = f.elements.file.files[0];
      let msg = '';
      if (title.length < 5) msg = 'Le titre est trop court (5 caractères minimum).';
      else if (desc.length < 20) msg = 'La description est trop courte (20 caractères minimum).';
      else if (isNaN(p) || p < 0 || p > 500) msg = 'Indique un prix attendu entre 0 et 500 € (0 = gratuit).';
      else if (!file) msg = 'Ajoute ton fichier 3D.';
      else if (!/\.(stl|3mf|obj|step|stp)$/i.test(file.name)) msg = 'Format accepté : STL, 3MF, OBJ ou STEP.';
      else if (file.size > 50 * 1024 * 1024) msg = 'Le fichier dépasse 50 Mo.';
      else if (!f.elements.rights.checked) msg = 'Confirme que tu détiens les droits sur ce modèle.';
      err.textContent = msg; if (msg) return;
      const m = { id: 'u' + Date.now().toString(36), title: title, cat: f.elements.cat.value, format: f.elements.format.value, level: f.elements.level.value, price: Math.round(p * 100) / 100, s: u.email, tags: f.elements.tags.value.trim(), lic: f.elements.lic.value, desc: desc, fileName: file.name, date: today(), reviews: [] };
      const l = store.get('models', []); l.unshift(m); store.set('models', l);
      toast('Modèle publié'); setTimeout(() => { location.href = 'modele.html?id=' + m.id; }, 600);
    });
  }

  /* ---------- Files : profil ---------- */
  function readAvatar(file, cb) {
    if (!file || !/^image\//.test(file.type)) { toast('Choisis une image'); return; }
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const s = Math.min(im.width, im.height);
        c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 128, 128);
        cb(c.toDataURL('image/jpeg', 0.8));
      };
      im.onerror = () => toast('Image illisible');
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function initProfile() {
    const alias = params.get('alias');
    if (alias) publicProfile(alias); else ownProfile();
  }
  function publicProfile(alias) {
    const box = $('#profileView'), key = keyOfAlias(alias);
    if (!key) { box.innerHTML = '<div class="card card-body">Profil introuvable. <a class="gold" href="modeles.html">Retour</a></div>'; return; }
    const user = findUser(key), name = aliasOfKey(key), sr = sellerRating(key), list = models().filter(m => m.s === key);
    const draw = () => {
      box.innerHTML = '<div class="card profile-head">' + avatarHtml(user || { alias: name }, 'big') +
        '<div class="grow"><h1 style="font-size:1.6rem">' + esc(name) + '</h1><p class="muted">' + list.length + ' modèle' + (list.length > 1 ? 's' : '') + ' · <span class="rating">' + (sr.count ? stars(sr.avg) + '</span> ' + sr.avg.toFixed(1).replace('.', ',') + ' (' + sr.count + ' avis)' : '</span>nouveau vendeur') + '</p></div></div>' +
        '<div class="card card-body" style="margin-top:16px">' + sellerRateHtml(key) + '</div>' +
        '<div class="sec-title"><h2>Modèles de ' + esc(name) + '</h2></div><div class="grid g3">' + (list.length ? list.map(modelCard).join('') : '<p class="muted">Aucun modèle publié.</p>') + '</div>';
      initStars(box);
    };
    box.addEventListener('click', e => { if (e.target.closest('[data-act="rate"]') && rateSeller(box, key)) draw(); });
    draw();
  }
  function ownProfile() {
    const u = requireAuth(); if (!u) return;
    const box = $('#profileView');
    const mine = models().filter(m => m.s === u.email);
    const myAcq = acqs().filter(a => a.email === u.email);
    const sales = acqs().filter(a => a.paid && mine.some(m => m.id === a.modelId));
    const revenue = sales.reduce((t, a) => t + calc(mine.find(m => m.id === a.modelId).price).seller, 0);
    const pend = store.get('requests', []).filter(r => r.email === u.email).length;
    box.innerHTML =
      '<div class="card profile-head">' + avatarHtml(u, 'big') + '<div class="grow"><h1 style="font-size:1.6rem">' + esc(u.alias) + '</h1><p class="muted">Membre depuis le ' + esc(u.date) + '</p></div>' +
      '<div class="cta"><a class="btn btn-ghost" href="profil.html?alias=' + encodeURIComponent(u.alias) + '">Voir mon profil public</a><button class="btn btn-danger" id="logout">Se déconnecter</button></div></div>' +
      '<div class="grid g2" style="margin-top:16px">' +
      '<div class="card card-body"><h2 style="font-size:1.15rem;margin-bottom:12px">Profil public</h2><form id="aliasForm" class="fg" style="gap:12px">' +
      '<div class="fg"><label for="alias-input">Alias (visible par la communauté)</label><input class="field" id="alias-input" value="' + esc(u.alias) + '" maxlength="20"></div>' +
      '<div class="fg"><label for="avatar-input">Photo de profil</label><input class="field" type="file" id="avatar-input" accept="image/*"></div>' +
      '<div class="error" id="aliasErr"></div><button class="btn btn-primary">Enregistrer l\'alias</button></form></div>' +
      '<div class="card card-body"><h2 style="font-size:1.15rem;margin-bottom:6px">Informations personnelles</h2><p class="help" style="margin-bottom:12px">Ces données ne sont jamais affichées publiquement. Seul un administrateur peut les modifier.</p>' +
      '<div class="fgrid">' +
      [['Prénom', u.first], ['Nom', u.last], ['E-mail', u.email], ['Téléphone', u.phone], ['Adresse', u.street + ', ' + u.zip + ' ' + u.city]].map((f, i) => '<div class="fg' + (i > 1 ? ' full' : '') + '"><label>' + f[0] + '</label><input class="field" value="' + esc(f[1]) + '" disabled></div>').join('') +
      '</div><button class="btn btn-ghost" id="reqBtn" style="margin-top:14px">Demander une modification</button>' + (pend ? '<p class="help" style="margin-top:8px">' + pend + ' demande(s) en attente de validation.</p>' : '') + '</div></div>' +
      '<div class="grid g2" style="margin-top:16px">' +
      '<div class="card card-body"><h2 style="font-size:1.15rem;margin-bottom:8px">Mes achats et téléchargements</h2>' +
      (myAcq.length ? myAcq.map(a => { const m = models().find(x => x.id === a.modelId); return m ? '<div class="list-line"><span><a class="gold" href="modele.html?id=' + m.id + '">' + esc(m.title) + '</a><br><small class="muted">' + esc(a.date) + ' · ' + (a.paid ? money(a.price) : 'Gratuit') + '</small></span><button class="btn btn-small btn-gold" data-dl="' + m.id + '">Télécharger</button></div>' : ''; }).join('') : '<p class="muted">Aucun achat pour le moment.</p>') + '</div>' +
      '<div class="card card-body"><h2 style="font-size:1.15rem;margin-bottom:8px">Mes ventes</h2>' +
      '<div class="grid g2" style="margin-bottom:12px"><div class="stat"><strong>' + sales.length + '</strong><span>Ventes</span></div><div class="stat"><strong>' + money(revenue) + '</strong><span>Montant qui te revient</span></div></div>' +
      (mine.length ? mine.map(m => '<div class="list-line"><a class="gold" href="modele.html?id=' + m.id + '">' + esc(m.title) + '</a><span class="muted small">' + (calc(m.price).pub === 0 ? 'Gratuit' : money(calc(m.price).pub)) + '</span></div>').join('') : '<p class="muted">Tu n\'as pas encore publié de modèle.</p>') +
      '<a class="btn btn-gold btn-small" style="margin-top:12px" href="publier.html?type=model">Vendre un modèle</a></div></div>';

    $('#logout').onclick = () => { store.set('session', null); location.href = 'index.html'; };
    $('#aliasForm').onsubmit = e => {
      e.preventDefault();
      const a = $('#alias-input').value.trim();
      const er = a === u.alias ? '' : aliasError(a, u.email);
      if (er) { $('#aliasErr').textContent = er; return; }
      u.alias = a; saveUser(u); toast('Alias enregistré'); setTimeout(() => location.reload(), 500);
    };
    $('#avatar-input').onchange = e => readAvatar(e.target.files[0], data => { u.avatar = data; saveUser(u); toast('Photo mise à jour'); setTimeout(() => location.reload(), 500); });
    $('#reqBtn').onclick = () => {
      openModal('<h2>Demande de modification</h2><p class="muted small">Un administrateur étudiera ta demande et pourra te demander un justificatif.</p>' +
        '<div class="fg" style="margin-top:12px"><label for="reqText">Que souhaites-tu modifier ?</label><textarea class="textarea" id="reqText" maxlength="500"></textarea></div><div class="error" id="reqErr"></div>' +
        '<div class="cta"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary" id="reqSend">Envoyer la demande</button></div>');
      $('#reqSend').onclick = () => {
        const t = $('#reqText').value.trim();
        if (t.length < 10) { $('#reqErr').textContent = 'Décris ta demande (10 caractères minimum).'; return; }
        const l = store.get('requests', []); l.push({ email: u.email, text: t, date: today() }); store.set('requests', l);
        closeModal(); toast('Demande envoyée aux administrateurs'); setTimeout(() => location.reload(), 600);
      };
    };
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-dl]'); if (!b) return;
      const m = models().find(x => x.id === b.dataset.dl); if (m) downloadFile(m);
    });
  }

  /* ---------- Démarrage ---------- */
  renderHeader();
  renderFooter();
  if (AREA === 'main') initCart();
  const INIT = { services: initQuiz, 'f-home': initFilesHome, 'f-community': initCommunity, 'f-videos': initVideos, 'f-models': initModels, 'f-model': initModel, 'f-login': initAuth, 'f-publish': initPublish, 'f-profile': initProfile };
  if (INIT[PAGE]) INIT[PAGE]();
})();