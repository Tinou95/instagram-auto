// Publie le prochain post de file-attente/ sur Instagram (compte chevaliere.pour.homme), puis le range dans publies/.
// Variables : FB_TOKEN (obligatoire), DRY=1 (ne publie rien), FORCE=1 (ignore l'heure et la date de départ).
import fs from 'fs';
const V = 'v21.0', PAGE = '1260725710458608', IG = '17841437566466589';
const DEBUT = '2026-10-24', HEURE = 18;
const DRY = process.env.DRY === '1', FORCE = process.env.FORCE === '1';
const paris = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(new Date());
const p = Object.fromEntries(paris.map((x) => [x.type, x.value]));
const jour = `${p.year}-${p.month}-${p.day}`, heure = +p.hour % 24;
console.log(`Paris : ${jour} ${heure}h`);
if (!FORCE && heure !== HEURE) { console.log('Pas 18h à Paris : rien à faire.'); process.exit(0); }
if (!FORCE && jour < DEBUT) { console.log('Avant la date de départ : rien à faire.'); process.exit(0); }

const g = async (path, body) => {
  const r = await fetch(`https://graph.facebook.com/${V}/${path}`, body ? { method: 'POST', body: new URLSearchParams(body) } : {});
  const j = await r.json();
  if (j.error) throw new Error(path.split('?')[0] + ' : ' + (j.error.message || JSON.stringify(j.error)));
  return j;
};
const dossiers = fs.readdirSync('file-attente').filter((d) => fs.existsSync(`file-attente/${d}/legende.txt`)).sort();
if (!dossiers.length) { console.error('File d’attente vide : plus rien à publier.'); process.exit(1); }
const d = dossiers[0];
const legende = fs.readFileSync(`file-attente/${d}/legende.txt`, 'utf8').trim();
const url = fs.readFileSync(`file-attente/${d}/url.txt`, 'utf8').trim();
console.log(`Prochain post : ${d} (${dossiers.length - 1} restants après lui)`);

const pages = await g(`me/accounts?fields=id,access_token&access_token=${process.env.FB_TOKEN}`);
const pt = pages.data.find((x) => x.id === PAGE)?.access_token;
if (!pt) throw new Error('jeton de page introuvable : le jeton Instagram a sûrement expiré, à renouveler');
const ig = await g(`${IG}?fields=username&access_token=${pt}`);
console.log('Compte :', ig.username);
if (DRY) { console.log('[DRY] rien publié. Légende :\n' + legende.slice(0, 120) + '…'); process.exit(0); }

const c = await g(`${IG}/media`, { image_url: url, caption: legende, access_token: pt });
for (let i = 0; i < 20; i++) {
  const s = await g(`${c.id}?fields=status_code&access_token=${pt}`);
  if (s.status_code === 'FINISHED') break;
  if (s.status_code === 'ERROR') throw new Error('Instagram a refusé l’image');
  await new Promise((r) => setTimeout(r, 3000));
}
const pub = await g(`${IG}/media_publish`, { creation_id: c.id, access_token: pt });
const lien = await g(`${pub.id}?fields=permalink&access_token=${pt}`);
console.log('Publié :', lien.permalink);
fs.renameSync(`file-attente/${d}`, `publies/${d}`);
fs.appendFileSync('publies/journal.txt', `${jour} | ${d} | ${lien.permalink}\n`);
