/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import { ScriptItem, EmbeddingItem, SearchResult } from './src/types.js';
import { 
  getAllScriptsFromDb, 
  saveScriptToDb, 
  deleteScriptFromDb, 
  getAllEmbeddingsFromDb, 
  saveEmbeddingToDb, 
  deleteEmbeddingFromDb 
} from './src/db/scripts.ts';
import { seedDatabaseIfEmpty } from './src/db/seed.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Setup directories for persistent data storage
const DATA_DIR = path.join(__dirname, 'data');
const SCRIPTS_FILE = path.join(DATA_DIR, 'scripts.json');
const EMBEDDINGS_FILE = path.join(DATA_DIR, 'embeddings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Lazy initialize Gemini SDK as per instructions
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY n\'est pas configurée dans les secrets de l\'application.');
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

// Default initial items
const INITIAL_SCRIPTS: ScriptItem[] = [
  {
    id: "sc-cfsi",
    title: "Trame d'appel principale - Association CFSI",
    type: "script",
    category: "Script",
    content: "Cette trame d'appel complète est destinée à mener la campagne d'appels téléphoniques au profit du Comité Français pour la Solidarité Internationale (CFSI).\n\nElle structure l'appel en 9 étapes progressives, de la prise de contact chaleureuse d'introduction jusqu'à la prise de congé, en passant par la présentation de l'histoire du CFSI, l'explication du projet Agora de cantines scolaires approvisionnées localement au Sénégal, et la proposition d'un soutien ponctuel de 70€ bénéficiant de 66% de réduction fiscale.",
    steps: [
      "1. Prise de contact & Identification",
      "2. Présentation du CFSI (60 ans d'histoire)",
      "3. Échange interactif (Question d'engagement)",
      "4. Projet Concret (AGORA au Sénégal)",
      "5. Proposition budgétaire (Don d'appel : 70€)",
      "6. Verrouillage (Accord & Engagement)",
      "7. Choix du mode d'envoi (Courrier vs Email CB)",
      "8. Blindage de la promesse de don",
      "9. Prise de congé chaleureuse"
    ],
    stepContents: [
      "Allo bonjour... *(identifier la voix d'abord)*, est-ce que je suis bien en relation de Monsieur ou Madame [Nom du prospect] ?\n\nAh très bien, bonjour Monsieur/Madame. Je suis Nour Benani / Hakim Saloui et je vous appelle de la part du Comité Français pour la Solidarité Internationale, le CFSI.\n\nQue vous connaissez peut-être de nom ou de réputation ? *(laisser répondre)*\n\nAvec votre permission bien sûr, je ne prendrai que 2 petites minutes de votre précieux temps pour vous informer de notre action et je vous libère ensuite, c’est promis. Vous me le permettez, Monsieur/Madame ?",
      "Merci pour votre écoute ! Il faut savoir que le CFSI a été créé il y a plus de 60 ans maintenant, et regroupe plus de 24 organisations humanitaires engagées auprès des petits paysans partout dans le monde.\n\nNotre objectif est extrêmement clair : répondre aux besoins vitaux des populations locales en les aidant à vivre dignement de leur propre agriculture. Nous finançons des projets pour assurer un accès équitable à une alimentation saine, produite localement.\n\nNous croyons fermement que pour réduire le problème de la faim, il est bien plus efficace de donner aux paysans les moyens de travailler et d'être autonomes plutôt que de l'aide ponctuelle de secours.\n\nEn effet, saviez-vous que le comble absolu est que les 3/4 des personnes qui souffrent de la faim dans le monde sont en réalité les petits paysans eux-mêmes ? Ceux censés nous nourrir !",
      "Et d’ailleurs, j'aimerais vous demander, sans être indiscret bien sûr : y a-t-il des causes de solidarité ou des associations qui vous tiennent particulièrement à cœur et que vous soutenez habituellement ?\n\n*(Marquer une vraie pause d'écoute active. Profitez de cette question ouverte pour encourager l'échange chaleureux avec le prospect, comprendre sa posture et valider l'importance de son engagement humanitaire.)*\n\nBravo ! Personnellement, je pense que toutes les causes sont louables, vitales et méritent d’être activement défendues.",
      "Pour ne vous citer qu’un bel exemple concret parmi les projets que le CFSI soutient, je vous parlerai du projet magnifique mené avec l'association AGORA au Sénégal, un pays que vous connaissez certainement.\n\nIl faut savoir que là-bas, seulement 13% des écoles élémentaires possèdent des cantines scolaires. Grâce à l'appui du CFSI et d'AGORA, cela change concrètement ! Nous finançons un projet ambitieux qui développe des cantines de classe dans la région de St Louis.\n\nLa particularité est que ces cantines sont approvisionnées à 100% par des fermes paysannes locales. Cela favorise grandement l'agriculture locale des familles et offre à des centaines d'enfants une alimentation saine pour éradiquer la sous-alimentation. À long terme, cela améliore le développement scolaire des enfants et renforce la stabilité économique de toute la région.",
      "C'est précisément dans ce cadre que je me permets de vous contacter aujourd'hui. Vous l’aurez compris, le CFSI a cruellement besoin de vous et de votre générosité.\n\nAvec un don ponctuel de par exemple 70€, vous contribuez directement à la concrétisation de ces projets agricoles locaux pour permettre à des familles entières de vivre dignement de leur travail.\n\nEt grâce au levier de réduction fiscale de 66%, un don de 70€ ne vous coûte en réalité que 24€ après impôts.\n\nAlors Monsieur/Madame... ces populations défavorisées et ces enfants pourraient-ils compter sur votre précieux soutien de 70€ aujourd'hui ?",
      "*(Si accord ou proposition de montant par le prospect)* :\n\nC’est formidable, un immense merci pour ce geste solidaire !\n\nPuis-je officiellement noter de votre part comme promesse de don la somme de [Montant] euros au profit du CFSI ?\n\nJe vous explique : vous allez recevoir un courrier de la part de notre président dans lequel notre appel sera bien sûr certifié. Vous y trouverez un bon de générosité récapitulatif ainsi qu'une enveloppe de retour, d'accord ?",
      "Je vais rapidement confirmer vos coordonnées pour la bonne réception du dossier...\nC’est bien Monsieur/Madame [Nom] ?\nVotre adresse postale est bien toujours au [Adresse postale] ?\n\nSachez que vous avez aujourd'hui la possibilité de nous aider doublement de deux manières :\n\n- **Choix n°1 (Écologique et Rapide)** : Nous pouvons vous envoyer un e-mail ou SMS sécurisé avec un lien pour réaliser directement votre don par Carte Bancaire sur le site officiel certifié du CFSI. Cela évite d'émettre un chèque et économise de lourds frais postaux de courrier pour l'association !\n\n- **Choix n°2 (Papier Traditionnel)** : Nous vous envoyons le courrier par la poste avec un bulletin pré-rempli. Vous n’aurez qu'à glisser votre chèque de soutien dans notre enveloppe-T gratuite à nous retourner sans timbre.\n\nLequel de ces deux moyens sécurisés préférez-vous ?",
      "*(Si choix 1 - E-mail ou SMS sécurisé)* :\nVous allez recevoir ce lien officiel d'ici quelques instants. Vous engagez-vous sur l'honneur à nous valider votre soutien de [Montant] € dès la réception de ce lien ?\n\n*(Si choix 2 - Courrier postal papier)* :\nVous allez recevoir le courrier de l'association d'ici quatre à cinq jours.\nDonc vous engagez-vous à nous renvoyer votre enveloppe avec votre chèque de [Montant]€ dès réception de ce courrier à votre domicile ?\n\n*(Si le prospect est indécis ou exprime des doutes)* :\nMonsieur/Madame, votre simple intention de nous soutenir témoigne d'un grand cœur. Votre promesse d'aide nous permet d'établir des budgets prévisionnels rigoureux pour engager nos actions auprès des paysans du Sénégal. Sans faire trop d'efforts, à quel moment pensez-vous pouvoir nous retourner ce soutien ?",
      "Eh bien, je tiens à vous exprimer un immense merci pour votre geste magnifique !\n\nGrâce à votre contribution, vous aidez concrètement des enfants à s'alimenter convenablement et des paysans à cultiver de manière durable. Merci également pour le temps chaleureux accordé aujourd'hui.\n\nAu nom de toute l'équipe du CFSI, je vous souhaite une excellente journée et surtout prenez bien soin de vous ! Au revoir Monsieur/Madame !"
    ],
    tips: [
      "Adopter un ton doux, sincère, très chaleureux, complice et humble.",
      "Remercier d'emblée à chaque validation et valoriser la générosité de l'interlocuteur.",
      "Ne reculez pas devant les questions sur l'agroécologie : l'autonomie paysanne est valorisante !",
      "Appuyer sur la réduction fiscale avantageuse de 66%."
    ],
    keywords: ["cfsi", "agora", "paysans", "senegal", "agriculture", "cantines", "faim"],
    associatedObjections: [
      "obj-antiracc-faux",
      "obj-antiracc-enerve",
      "obj-inflation",
      "obj-trop-sollicite",
      "obj-internet",
      "obj-liste-rouge",
      "obj-bloctel",
      "obj-conjoint"
    ],
    isHighlighted: true,
    createdAt: new Date().toISOString(),
    author: "Système"
  },
  {
    id: "obj-antiracc-faux",
    title: "Anti-Raccrochage : NON (Faux numéro / Autre identité)",
    type: "objection",
    category: "Script",
    objectionText: "Ah non, ce n'est pas Monsieur/Madame XX, vous vous êtes trompé de numéro !",
    responseTemplate: "Ah ! Désolé, apparemment je me suis trompé de numéro ou de fiche, je vous prie de m'excuser.\n\nMais vous savez Monsieur/Madame, mon appel n'est pas forcément nominatif aujourd'hui. Je suis Nour Benani / Hakim Saloui et je vous appelle de la part du Comité Français pour la Solidarité Internationale, le CFSI.\n\nC'est une association humanitaire solide engagée auprès des paysans, que vous connaissez peut-être de nom ou de réputation ?\n\nAvec votre permission bien sûr, je ne prendrais que deux toutes petites minutes pour vous informer de notre combat, et je vous libère de suite après c'est promis. Vous me le permettez ?",
    content: "Argument de rebond anti-raccrochage lorsqu'il y a un faux numéro ou une erreur de destinateur. Permet d'embrayer directement sur la présentation du CFSI sans perdre le contact.",
    steps: [
      "S'excuser poliment pour l'erreur de fiche",
      "Spécifier que l'échange est informel et non forcément nominatif",
      "Se présenter personnellement et introduire le CFSI",
      "Solliciter 2 minutes informatives pour continuer l'échange"
    ],
    tips: [
      "Garder un ton enjoué, dynamique et ultra-souriant.",
      "Ne pas marquer de trop long temps d'arrêt après l'excuse pour amener la présentation de manière fluide."
    ],
    keywords: ["faux numero", "erreur", "nom", "anti-racc", "identite"],
    isHighlighted: true,
    createdAt: new Date().toISOString(),
    author: "Système"
  },
  {
    id: "obj-antiracc-enerve",
    title: "Anti-Raccrochage : Prospect agacé par les démarchages",
    type: "objection",
    category: "Script",
    objectionText: "Je n'ai pas le temps, on se fait harceler au téléphone toute la journée par des associations !",
    responseTemplate: "Je comprends tout à fait Monsieur/Madame, et vous avez parfaitement raison : on se sent très vite importuné par le téléphone ces temps-ci. À votre place, je réagirais de la même manière.\n\nD'ailleurs, je fais immédiatement le nécessaire pour remonter l'information à notre fichier afin que votre numéro soit manuellement écarté et que vous ne soyez plus sollicité par le CFSI cette année.\n\nMais maintenant que je vous ai enfin au bout du fil, ce qui est très rare, j'aimerais vraiment en profiter pour passer à peine une minute d'échange informel et positif, puis je vous raye personnellement de notre liste d'appels. Qu'en pensez-vous, on fait comme ça ? ",
    content: "Désamorce le ras-le-bol des appels téléphoniques par une empathie active. L'agent valide l'énervement, promet la suppression du numéro puis demande en contrepartie une seule minute positive de présentation.",
    steps: [
      "S'accorder totalement avec l'agacement légitime du prospect",
      "Proposer immédiatement de remonter l'exclusion du numéro",
      "Solliciter de manière exceptionnelle une seule minute d'échange 'bonus' avant de raccrocher",
      "Verrouiller cette écoute d'une minute"
    ],
    tips: [
      "Laisser s'exprimer le prospect énervé sans lui couper la parole.",
      "Adopter un ton doux, calme et complice (voix apaisante).",
      "Afficher une totale rigueur concernant la suppression du numéro."
    ],
    keywords: ["harcelement", "appels", "assez", "retirer", "retraite", "enerve"],
    isHighlighted: true,
    createdAt: new Date().toISOString(),
    author: "Système"
  },
  {
    id: "obj-inflation",
    title: "Objection - Resensibilisation par Baisse de Montant",
    type: "objection",
    category: "Resensibilisation",
    objectionText: "Le montant proposé est trop élevé, je n'ai pas les moyens ou je subis l'inflation.",
    responseTemplate: "Je comprends tout à fait votre prudence, Monsieur/Madame [Nom]. La situation économique pèse lourdement sur tous les budgets.\n\nC'est pourquoi il n'y a pas de petit geste. Si 70€ est trop lourd de prime abord, qu'en pensez-vous d'un accompagnement ponctuel de seulement 20€ ? Grâce à la réduction d'impôts de 66%, cela ne vous coûte réellement que 6,80€ après déduction fiscale.\n\nPour le CFSI, cela représente plusieurs repas chauds équilibrés distribués à des écoliers en détresse. Est-ce qu'une aide à cette hauteur, indolore au quotidien mais vitale pour eux, vous conviendrait ?",
    content: "Si le prospect refuse le montant d'appel standard, la règle d'or est de resensibiliser en valorisant les micro-dons. On baisse la proposition à 20€ et on rappelle le levier de réduction fiscale de 66%.",
    steps: [
      "Désamorcer par une empathie sincère sur l'inflation et la crise",
      "Proposer la resensibilisation : abaisser le don à 20€",
      "Appliquer l'argument de la déduction de 66%",
      "Traduire en équivalent concret : repas chauds écoliers"
    ],
    tips: [
      "Ne jamais forcer ni juger le budget du prospect.",
      "Montrer une vive gratitude pour l'ouverture d'esprit envers les petits dons."
    ],
    keywords: ["resensibilisation", "montant", "inflation", "crise", "baisse", "don", "repas"],
    isHighlighted: true,
    createdAt: new Date().toISOString(),
    author: "Système"
  },
  {
    id: "obj-trop-sollicite",
    title: "Objection - Trop sollicité / Donne déjà à d'autres",
    type: "objection",
    category: "Guide d'objection",
    objectionText: "Je donne déjà à d'autres associations, je ne donnerai pas pour une association de plus.",
    responseTemplate: "Ah et bien bravo et respect pour ce que vous faites ! Cela témoigne réellement de votre grande générosité et de vos belles valeurs.\n\nJe vous rassure immédiatement : notre but aujourd'hui n'est pas du tout de changer vos habitudes ou de vous contraindre à abandonner vos causes préférées. Ce qui importe avant tout pour nous, c'est de vous informer brièvement de notre démarche agricole et de recueillir votre précieux avis concernant l'autonomie des paysans.\n\nInformerr de nos actions est déjà un grand pas en soi ! Cela ne prendra pas plus de 2 minutes et je vous libère ensuite, vous me le permettez rapidement ? ",
    content: "Argument pour valoriser l'effort et la générosité actuelle de l'interlocuteur, tout en se positionnant comme un échange informatif d'avis plutôt qu'une pression de don immédiat.",
    steps: [
      "Féliciter sincèrement pour le soutien à d'autres causes",
      "Écarter tout esprit de concurrence ou pression budgétaire",
      "Recentrer l'appel sur le recueil d'avis et l'information",
      "Redemander l'autorisation des 2 minutes"
    ],
    tips: [
      "Montrer de l'enthousiasme pour la posture solidaire du prospect.",
      "Rendre l'agroécologie très accessible et valorisante."
    ],
    keywords: ["sollicite", "autre", "association", "habitude", "donne deja"],
    isHighlighted: true,
    createdAt: new Date().toISOString(),
    author: "Système"
  },
  {
    id: "obj-conjoint",
    title: "Objection - Consultation du Conjoint ou de la Famille",
    type: "objection",
    category: "Conjoint",
    objectionText: "Je dois voir avec ma conjointe / mon conjoint ou l'un de mes proches avant de décider.",
    responseTemplate: "C'est une excellente habitude, Monsieur/Madame [Nom], les grandes décisions solidaires et généreuses se prennent en famille !\n\nPour vous permettre d'en parler tranquillement avec votre partenaire ce soir, je peux préparer la promesse de principe à votre nom aujourd'hui à hauteur de 30€. Vous recevez un e-mail officiel explicatif à l'instant. Si après en avoir discuté ensemble vous estimez que ce n'est pas opportun, vous trouverez un lien dans le mail pour annuler le projet de don en un seul clic ! Cela vous évite d'y repenser et vous permet de décider ensemble avec le dossier sous les yeux. Qu'en pensez-vous ?",
    content: "L'esquive par la vérification familiale. L'objectif de l'agent est de valoriser cette marque de sérieux, tout en contournant le report d'appel en proposant de valider la promesse avec une résiliation simplifiée envoyée par email.",
    steps: [
      "Féliciter la concertation familiale comme preuve d'engagement sérieux",
      "Proposer de préparer la fiche d'information par email avec promesse réversible",
      "Garantir le droit d'annulation d'un simple clic dans le courrier",
      "Verrouiller l'accord de principe pour l'envoi du dossier"
    ],
    tips: [
      "Utiliser un ton enjoué, amical et très respectueux.",
      "Simplifier à l'extrême la réversibilité du prélèvement."
    ],
    keywords: ["conjoint", "famille", "epouse", "proches", "discussion", "revoir"],
    isHighlighted: true,
    createdAt: new Date().toISOString(),
    author: "Système"
  },
  {
    id: "obj-internet",
    title: "Objection - Demande de Don par Internet",
    type: "objection",
    category: "Internet",
    objectionText: "Je préfère aller donner sur votre site internet, je ne donne pas par téléphone.",
    responseTemplate: "C'est une excellente initiative et je vous remercie pour cette volonté de nous aider !\n\nSachez cependant que notre association n'accepte pas les dons en ligne en direct pour cette campagne spécifique afin de limiter de lourds frais techniques et bancaires de maintenance.\n\nC'est pourquoi nous passons par le canal courrier sécurisé aujourd'hui : en validant votre promesse avec moi, nous vous envoyons un bulletin de soutien pré-rempli par la poste. Vous n'avez qu'à le signer et le retourner par enveloppe T gratuite. C'est l'assurance pour nous que 100% de votre don va sur le terrain sans frais intermédiaires. Est-ce que ce moyen sécurisé d'aider, entièrement sans frais pour l'association, vous convient ?",
    content: "Le prospect veut donner en ligne. L'argumentaire de l'agent consiste à expliquer que l'association n'accepte pas de dons en ligne direct ou que cela engendre trop de frais de gestion technique de site de transaction. On doit alors le convaincre d'utiliser le canal courrier postal papier (bulletin pré-rempli envoyé gratuitement) pour économiser les frais intermédiaires et optimiser l'aide directe.",
    steps: [
      "Féliciter et remercier chaleureusement pour l'élan de don en ligne",
      "Expliquer l'absence de don en ligne ou les lourds frais de plateforme internet",
      "Proposer la solution alternative sécurisée par envoi postal (bulletin courrier pré-rempli)",
      "Expliquer l'enveloppe T gratuite et le traitement sécurisé sans frais techniques"
    ],
    tips: [
      "Rassurer sur le fait que le courrier postal papier reste le moyen de paiement le plus fiable et certifié.",
      "Expliquer l'économie substantielle réalisée par l'association en évitant les passerelles de cartes en ligne."
    ],
    keywords: ["internet", "en ligne", "site", "courrier", "poste", "frais", "securise"],
    isHighlighted: true,
    createdAt: new Date().toISOString(),
    author: "Système"
  },
  {
    id: "obj-liste-rouge",
    title: "Objection - Droits RGPD / Pourquoi m'appelez-vous / Liste Rouge",
    type: "objection",
    category: "Guide d'objection",
    objectionText: "Comment avez-vous eu mon numéro ? Je suis en liste rouge !",
    responseTemplate: "Je comprends tout à fait votre question, Monsieur/Madame, la protection de la vie privée est capitale. Nous obtenons nos informations de l'annuaire téléphonique national public électronique.\n\nSi vous êtes inscrit en liste rouge, il se peut que nos bases de données soient en cours de synchronisation. Je note immédiatement de cataloguer manuellement votre fiche en opposition d'appels à l'instant même afin que vous ne soyez plus jamais importuné par le CFSI.\n\nPuisque nous sommes ensemble pour une fraction de seconde, m'accorderiez-vous une toute petite minute pour découvrir l'aide aux familles agricoles avant que je ne raye définitivement vos coordonnées ? Cela serait un geste informatif très apprécié.",
    content: "Explication claire du sourcing (annuaire public) et rebond par le respect absolu de la vie privée.",
    steps: [
      "Informer transparentement sur la source de l'annuaire électronique public",
      "Se proposer pour exclure manuellement le dossier des campagnes du CFSI",
      "Demander par courtoisie 1 minute informative bonus avant la coupure"
    ],
    tips: [
      "S'excuser franchement pour le loupé de liste rouge.",
      "Créer un climat de confiance par une rigueur légale irréprochable."
    ],
    keywords: ["liste rouge", "coordonees", "rgpd", "donnees", "numero", "annuaire"],
    isHighlighted: true,
    createdAt: new Date().toISOString(),
    author: "Système"
  },
  {
    id: "obj-bloctel",
    title: "Objection - Inscription liste Bloctel ou Pacitel",
    type: "objection",
    category: "Guide d'objection",
    objectionText: "Je suis inscrit sur le registre d'opposition Bloctel, vous n'avez pas le droit m'appeler !",
    responseTemplate: "C'est un excellent réflexe de le mentionner, Monsieur/Madame. Sachez cependant que la liste Bloctel encadre uniquement la prospection commerciale mercantile pour la vente de produits ou de contrats d'entreprises privées.\n\nEn tant qu'association humanitaire à but non lucratif, la loi nous autorise à échanger avec les citoyens. Néanmoins, nous respectons totalement votre tranquillité. Si vous le souhaitez, je peux également inscrire votre numéro sur notre liste d'opposition interne à l'instant même.\n\nMais avant cela, et puisque nous sommes en ligne, m'accordez-vous deux petites minutes pour simplement vous raconter comment nous aidons de jeunes paysans à nourrir des écoles de région ?",
    content: "Clarifier l'esprit de la loi Bloctel (prospection commerciale ≠ sollicitation de dons caritatifs), s'engager sur l'opposition interne tout en tentant un dernier rebond d'audition rapide.",
    steps: [
      "Valider et saluer la vigilance légale du prospect",
      "Expliquer l'exclusion légale de Bloctel pour les organismes caritatifs",
      "Offrir l'exclusion interne pour être royalement tranquille",
      "Relancer l'autorisation rapide pour 2 minutes d'histoire de paysans"
    ],
    keywords: ["bloctel", "pacitel", "loi", "autorisation", "commercial", "opposition"],
    isHighlighted: false,
    createdAt: new Date().toISOString(),
    author: "Système"
  }
];

// Vector Mathematics Helper functions
function extractEmbeddingValues(response: any): number[] | null {
  if (!response) return null;
  if (Array.isArray(response.embeddings) && response.embeddings.length > 0 && Array.isArray(response.embeddings[0]?.values)) {
    return response.embeddings[0].values;
  }
  if (Array.isArray(response.embedding?.values)) {
    return response.embedding.values;
  }
  if (Array.isArray(response.values)) {
    return response.values;
  }
  return null;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Ensure all existing scripts have embeddings in Cloud SQL. Runs in the background at startup if Gemini key is set.
async function populateMissingEmbeddings() {
  let updated = false;

  try {
    const scripts = await getAllScriptsFromDb();
    const embeddings = await getAllEmbeddingsFromDb();
    const ai = getAI();
    for (const item of scripts) {
      if (!embeddings[item.id]) {
        console.log(`Génération d'embedding pour le script : ${item.title}`);
        // Combine descriptive elements for richer semantic context
        const textToEmbed = `${item.title} [Catégorie: ${item.category}] [Type: ${item.type}] ${item.content} ${item.objectionText || ''} ${item.responseTemplate || ''} ${(item.keywords || []).join(' ')}`;
        
        const response: any = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: textToEmbed,
        });

        const embValues = extractEmbeddingValues(response);
        if (embValues && embValues.length > 0) {
          await saveEmbeddingToDb(item.id, embValues);
          embeddings[item.id] = embValues;
          updated = true;
        }
      }
    }
    if (updated) {
      console.log("Mise à jour de la base de données vectorielle Cloud SQL terminée !");
    }
  } catch (err: any) {
    console.warn("Échec de la génération automatique d'embeddings au démarrage :", err.message || err);
  }
}

// Start lazy background embedding computation after seeding
setTimeout(() => {
  populateMissingEmbeddings().catch(console.error);
}, 3000);

// Use express.json middleware
app.use(express.json());

// Real-time synchronization state
let sseClients: express.Response[] = [];

app.get('/api/live-sync', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Send initial handshaking frame
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Synchronization en temps réel établie.' })}\n\n`);

  sseClients.push(res);

  const pingInterval = setInterval(() => {
    res.write(':\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients = sseClients.filter(client => client !== res);
  });
});

function broadcastEvent(type: string, payload: any) {
  const data = JSON.stringify({ type, payload });
  sseClients.forEach(client => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (err) {
      console.warn("Échec de l'envoi vers un client SSE déconnecté.");
    }
  });
}

// API: Get all scripts
app.get('/api/scripts', async (req, res) => {
  try {
    const list = await getAllScriptsFromDb();
    res.json(list);
  } catch (error: any) {
    console.error("API error /api/scripts:", error);
    res.status(500).json({ error: "Impossible de récupérer les scripts de la base de données." });
  }
});

// API: Save new script
app.post('/api/scripts', async (req, res) => {
  try {
    const newItem: Partial<ScriptItem> = req.body;
    if (!newItem.title || !newItem.type || !newItem.category || !newItem.content) {
      return res.status(400).json({ error: 'Champs obligatoires manquants : title, type, category, content' });
    }

    const script: ScriptItem = {
      id: 'item-' + Math.random().toString(36).substring(2, 9),
      title: newItem.title,
      type: newItem.type as 'script' | 'objection',
      category: newItem.category,
      content: newItem.content,
      objectionText: newItem.objectionText || '',
      responseTemplate: newItem.responseTemplate || '',
      steps: Array.isArray(newItem.steps) ? newItem.steps : [],
      stepContents: Array.isArray(newItem.stepContents) ? newItem.stepContents : [],
      tips: Array.isArray(newItem.tips) ? newItem.tips : [],
      keywords: Array.isArray(newItem.keywords) ? newItem.keywords.map(k => k.trim()) : [],
      associatedObjections: Array.isArray(newItem.associatedObjections) ? newItem.associatedObjections : [],
      isHighlighted: !!newItem.isHighlighted,
      createdAt: new Date().toISOString(),
      author: newItem.author || 'Agent'
    };

    const saved = await saveScriptToDb(script);
    broadcastEvent('create', saved);

    // Try computing vector embedding for instant searchability
    try {
      const ai = getAI();
      const textToEmbed = `${saved.title} [Catégorie: ${saved.category}] [Type: ${saved.type}] ${saved.content} ${saved.objectionText || ''} ${saved.responseTemplate || ''} ${(saved.keywords || []).join(' ')}`;
      const embRes: any = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: textToEmbed,
      });
      const embValues = extractEmbeddingValues(embRes);
      if (embValues && embValues.length > 0) {
        await saveEmbeddingToDb(saved.id, embValues);
      }
    } catch (e) {
      console.warn("L'embedding vectoriel n'a pas pu être généré pour ce script, mais l'enregistrement en base Cloud SQL s'est fait avec succès.", e);
    }

    res.status(201).json(saved);
  } catch (error: any) {
    console.error("API error POST /api/scripts:", error);
    res.status(500).json({ error: "Échec de l'enregistrement du script dans la base de données." });
  }
});

// API: Update existing script (Admin Actions)
app.put('/api/scripts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updateData: Partial<ScriptItem> = req.body;
    const scripts = await getAllScriptsFromDb();
    const currentScript = scripts.find(s => s.id === id);

    if (!currentScript) {
      return res.status(404).json({ error: 'Script ou objection introuvable.' });
    }

    const updatedScript: ScriptItem = {
      ...currentScript,
      title: updateData.title !== undefined ? updateData.title : currentScript.title,
      type: updateData.type !== undefined ? (updateData.type as 'script' | 'objection') : currentScript.type,
      category: updateData.category !== undefined ? updateData.category : currentScript.category,
      content: updateData.content !== undefined ? updateData.content : currentScript.content,
      objectionText: updateData.objectionText !== undefined ? updateData.objectionText : currentScript.objectionText,
      responseTemplate: updateData.responseTemplate !== undefined ? updateData.responseTemplate : currentScript.responseTemplate,
      steps: updateData.steps !== undefined ? updateData.steps : currentScript.steps,
      stepContents: updateData.stepContents !== undefined ? updateData.stepContents : currentScript.stepContents,
      tips: updateData.tips !== undefined ? updateData.tips : currentScript.tips,
      keywords: updateData.keywords !== undefined ? updateData.keywords : currentScript.keywords,
      associatedObjections: updateData.associatedObjections !== undefined ? updateData.associatedObjections : currentScript.associatedObjections,
      isHighlighted: updateData.isHighlighted !== undefined ? updateData.isHighlighted : currentScript.isHighlighted,
      author: updateData.author !== undefined ? updateData.author : currentScript.author,
    };

    const saved = await saveScriptToDb(updatedScript);
    broadcastEvent('update', saved);

    // Try computing vector embedding for modified content
    try {
      const ai = getAI();
      const textToEmbed = `${saved.title} [Catégorie: ${saved.category}] [Type: ${saved.type}] ${saved.content} ${saved.objectionText || ''} ${saved.responseTemplate || ''} ${(saved.keywords || []).join(' ')}`;
      const embRes: any = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: textToEmbed,
      });
      const embValues = extractEmbeddingValues(embRes);
      if (embValues && embValues.length > 0) {
        await saveEmbeddingToDb(saved.id, embValues);
      }
    } catch (e) {
      console.warn("L'embedding vectoriel n'a pas pu être mis à jour pour ce script modifié.", e);
    }

    res.json(saved);
  } catch (error: any) {
    console.error("API error PUT /api/scripts/:id:", error);
    res.status(500).json({ error: "Échec de la mise à jour du script dans la base de données." });
  }
});

// API: Delete script
app.delete('/api/scripts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteScriptFromDb(id);
    await deleteEmbeddingFromDb(id);
    broadcastEvent('delete', { id });

    res.json({ success: true });
  } catch (error: any) {
    console.error("API error DELETE /api/scripts/:id:", error);
    res.status(500).json({ error: "Échec de la suppression du script dans la base de données." });
  }
});

// API: Get categories
app.get('/api/categories', async (req, res) => {
  try {
    const scripts = await getAllScriptsFromDb();
    const defaultCats = ["Script", "Guide d'objection", "Resensibilisation", "Conjoint", "Internet"];
    const catsSet = new Set<string>(defaultCats);
    scripts.forEach(s => {
      if (s.category) catsSet.add(s.category);
    });
    res.json(Array.from(catsSet));
  } catch (error: any) {
    console.error("API error GET /api/categories:", error);
    res.status(500).json({ error: "Impossible de récupérer les catégories." });
  }
});

// API: Advanced Search End-point (Full-Text & AI Vector Hybrid Search)
app.post('/api/search', async (req, res) => {
  try {
    const { query, category, type, searchMode } = req.body; // searchMode: 'vector' | 'fulltext' | 'hybrid'
    
    const cleanQuery = (query || '').trim();
    const activeScripts = await getAllScriptsFromDb();
    const embeddings = await getAllEmbeddingsFromDb();

    // Basic Filter by categories & types
    let filtered = activeScripts.filter(script => {
      const catMatch = !category || category === 'all' || script.category === category;
      const typeMatch = !type || type === 'all' || script.type === type;
      return catMatch && typeMatch;
    });

    // If search query is empty, return baseline filtered list with score 1.0
    if (!cleanQuery) {
      const results: SearchResult[] = filtered.map(item => ({
        item,
        score: 1.0,
        isVector: false
      }));
      return res.json(results);
    }

    // Choose Search engine
    const mode = searchMode || 'hybrid';
    let results: SearchResult[] = [];

    // 1. Text Search Score (Token overlap ratio)
    const queryTokens = cleanQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const getTextScore = (item: ScriptItem): number => {
      const searchableString = `${item.title} ${item.category} ${item.content} ${item.objectionText || ''} ${item.responseTemplate || ''} ${(item.keywords || []).join(' ')}`.toLowerCase();
      
      // Quick exact string match
      if (searchableString.includes(cleanQuery.toLowerCase())) {
        return 1.0;
      }

      if (queryTokens.length === 0) return 0;
      let matches = 0;
      queryTokens.forEach(token => {
        if (searchableString.includes(token)) matches++;
      });

      return matches / queryTokens.length;
    };

    if (mode === 'fulltext') {
      // Standard quick text matching
      results = filtered
        .map(item => ({
          item,
          score: getTextScore(item),
          isVector: false
        }))
        .filter(res => res.score > 0)
        .sort((a, b) => b.score - a.score);

      return res.json(results);
    }

    // 2. Vector search via Gemini
    let queryEmbedding: number[] | null = null;
    try {
      const ai = getAI();
      const embResult: any = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: cleanQuery,
      });
      const embValues = extractEmbeddingValues(embResult);
      if (embValues && embValues.length > 0) {
        queryEmbedding = embValues;
      }
    } catch (err) {
      console.warn("La recherche vectorielle AI a échoué. Repli automatique vers la recherche plein texte.", err);
    }

    if (queryEmbedding) {
      results = filtered.map(item => {
        let vectorScore = 0;
        const cachedVector = embeddings[item.id];
        
        if (cachedVector) {
          vectorScore = cosineSimilarity(queryEmbedding!, cachedVector);
        } else {
          // Fallback for missing embedding during search -> compute text score directly
          vectorScore = getTextScore(item) * 0.5; // low weight
        }

        // Hybrid combination
        const textScore = getTextScore(item);
        let finalScore = vectorScore;
        
        if (mode === 'hybrid') {
          // Blend vector search (70% weight) + full-text keyword token overlap (30% weight)
          finalScore = vectorScore * 0.7 + textScore * 0.3;
        }

        return {
          item,
          score: finalScore,
          isVector: true
        };
      });

      // Filter results that have a decent Match (vector similarity above 0.35 or has high text score)
      results = results
        .filter(res => res.score > 0.30 || getTextScore(res.item) > 0)
        .sort((a, b) => b.score - a.score);
    } else {
      // If embedding generation fails (e.g. key missing/offline), downgrade to clean fulltext
      results = filtered
        .map(item => ({
          item,
          score: getTextScore(item),
          isVector: false
        }))
        .filter(res => res.score > 0)
        .sort((a, b) => b.score - a.score);
    }

    res.json(results);
  } catch (error: any) {
    console.error("API error POST /api/search:", error);
    res.status(500).json({ error: "Échec de la recherche dans la base de données." });
  }
});

// API: Route for PDF / DOCX upload & OCR structure via Gemini
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Aucun fichier n'a été fourni." });
    }

    const filename = file.originalname;
    const fileExtension = path.extname(filename).toLowerCase();
    
    let extractedText = "";
    let isPdf = false;

    // 1. Core Text Extraction
    if (fileExtension === '.docx') {
      const mammothResult = await mammoth.extractRawText({ buffer: file.buffer });
      extractedText = mammothResult.value;
    } else if (fileExtension === '.pdf') {
      isPdf = true;
    } else if (fileExtension === '.txt') {
      extractedText = file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: "Format de fichier non supporté. Veuillez fournir un fichier .pdf, .docx, ou .txt." });
    }

    // Read user selected target category
    const selectedCategory = req.body.category || 'Script';
    const isScriptType = selectedCategory === 'Script';
    const targetType = isScriptType ? 'script' : 'objection';

    // Initialize AI
    const ai = getAI();

    // Multimodal prompt template
    const promptInstructions = `
Vous êtes un agent d'intelligence artificielle expert en traitement documentaire, en OCR et en prospection téléphonique de don (collecte par téléphone).
Analysez le document fourni (éventuellement scanné) et extrayez-en les éléments textuels. 

Vous devez obligatoirement structurer les éléments extraits sous la catégorie "${selectedCategory}" (de type "${targetType}").

Directives de structure pour "${selectedCategory}" :
${isScriptType 
  ? `- C'est un Script de prospection téléphonique. Renseignez la trame de conversation commerciale complète dans le champ "content" sous forme de script d'appel fluide. Renseignez le déroulement des étapes pas-à-pas de l'appel dans "steps".`
  : `- C'est un Guide de traitement d'objection de type "${selectedCategory}". Renseignez l'objection type formulée par le client dans "objectionText", la réponse argumentée mot-à-mot suggérée pour l'agent dans "responseTemplate", les étapes du déroulement logique pour répondre dans "steps", et les notes constructives/l'analyse globale dans "content".`
}

Renvoyez un TABLEAU JSON contenant les fiches structurées.
Chaque élément doit correspondre à une fiche individuelle complète.
N'ajoutez aucun texte de présentation ou d'introduction. Renvoyez STRICTEMENT un tableau JSON valide.

Voici le format JSON strict attendu :
[
  {
    "title": "Titre explicite de la fiche (ex: ${isScriptType ? 'Trame d\'appel principal' : 'Traitement - Objection ' + selectedCategory})",
    "type": "${targetType}",
    "category": "${selectedCategory}",
    "content": "Description argumentée de la fiche ou trame complète de la conversation rédigée en Markdown.",
    "objectionText": "${isScriptType ? '' : 'Objection textuelle type formulée par le prospect'}",
    "responseTemplate": "${isScriptType ? '' : 'Réponse à haute voix recommandée pour l\'agent (fluide et chaleureuse)'}",
    "steps": [
      "Étape essentielle 1",
      "Étape essentielle 2"
    ],
    "tips": [
      "Conseil de posture et d'écoute",
      "Conseil de ton vocal"
    ],
    "keywords": ["${selectedCategory.toLowerCase()}", "prospection", "donateur"]
  }
]
    `;

    let generatedText = "";

    // 2. Call Gemini for OCR / Structuring
    if (isPdf) {
      // Direct multimodal PDF upload support
      console.log(`Traitement direct par OCR du document PDF: ${filename}`);
      const pdfPart = {
        inlineData: {
          mimeType: 'application/pdf',
          data: file.buffer.toString('base64')
        }
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [pdfPart, { text: promptInstructions }],
        config: {
          responseMimeType: 'application/json'
        }
      });
      generatedText = response.text || "";
    } else {
      // Word or text document structuring
      console.log(`Traitement de texte structuré et mise en forme du document : ${filename}`);
      const promptText = `
${promptInstructions}
Voici le texte brut extrait du fichier d'origine :
--- DEBUT DU TEXTE EXTRAIT ---
${extractedText}
--- FIN DU TEXTE EXTRAIT ---
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptText,
        config: {
          responseMimeType: 'application/json'
        }
      });
      generatedText = response.text || "";
    }

    // Clean response just in case markdown syntax is present
    let cleanJsonStr = generatedText.trim();
    if (cleanJsonStr.startsWith('```json')) {
      cleanJsonStr = cleanJsonStr.slice(7);
    }
    if (cleanJsonStr.endsWith('```')) {
      cleanJsonStr = cleanJsonStr.slice(0, -3);
    }
    cleanJsonStr = cleanJsonStr.trim();

    const importedItems: any[] = JSON.parse(cleanJsonStr);
    
    if (!Array.isArray(importedItems)) {
      throw new Error("L'intelligence artificielle n'a pas pu structurer les données sous forme de liste JSON.");
    }

    const finalImported: ScriptItem[] = [];

    // 3. Process each structured item, generate embeddings and append to database
    for (const item of importedItems) {
      const script: ScriptItem = {
        id: 'item-' + Math.random().toString(36).substring(2, 9),
        title: item.title || `${selectedCategory} - Document Importé`,
        type: targetType,
        category: selectedCategory,
        content: item.content || 'Contenu extrait non spécifié.',
        objectionText: item.objectionText || '',
        responseTemplate: item.responseTemplate || '',
        steps: Array.isArray(item.steps) ? item.steps : [],
        stepContents: Array.isArray(item.stepContents) ? item.stepContents : [],
        tips: Array.isArray(item.tips) ? item.tips : [],
        keywords: Array.isArray(item.keywords) ? item.keywords : [],
        associatedObjections: Array.isArray(item.associatedObjections) ? item.associatedObjections : [],
        isHighlighted: false,
        createdAt: new Date().toISOString(),
        author: `Extraction OCR (${filename})`
      };

      const saved = await saveScriptToDb(script);
      finalImported.push(saved);

      // Generate embedding in background / serial helper
      try {
        const textToEmbed = `${saved.title} [Catégorie: ${saved.category}] [Type: ${saved.type}] ${saved.content} ${saved.objectionText || ''} ${saved.responseTemplate || ''} ${(saved.keywords || []).join(' ')}`;
        const embRes: any = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: textToEmbed,
        });
        const embValues = extractEmbeddingValues(embRes);
        if (embValues && embValues.length > 0) {
          await saveEmbeddingToDb(saved.id, embValues);
        }
      } catch (e) {
        console.warn(`Impossible de pré-calculer le vecteur d'embedding pour l'item ${saved.title}`, e);
      }
    }

    broadcastEvent('bulk', finalImported);

    res.json({
      success: true,
      count: finalImported.length,
      imported: finalImported
    });

  } catch (err: any) {
    console.error("Erreur critique d'importation OCR :", err);
    res.status(500).json({ error: `Échec du traitement du document: ${err.message || 'Erreur inconnue'}` });
  }
});


// Setup Vite middleware for development or Static Assets for production
async function startServer() {
  try {
    await seedDatabaseIfEmpty();
  } catch (seedErr) {
    console.warn('[Cloud SQL] Note: Erreur lors de la vérification/initialisation du seed:', seedErr);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Script & Objection Hub Backend] Serveur à l'écoute sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
