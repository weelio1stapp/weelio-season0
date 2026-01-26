export interface Place {
  slug: string;
  title: string;
  region: string;
  shortDescription: string;
  tags: string[];
  ratingAvg: number;
  ratingCount: number;
  imagePlaceholder: string;
}

export const places: Place[] = [
  {
    slug: "krkonose-snezka",
    title: "Sněžka",
    region: "Krkonoše",
    shortDescription: "Nejvyšší hora České republiky s úchvatným výhledem na Krkonoše.",
    tags: ["hory", "výhledy", "turistika"],
    ratingAvg: 4.8,
    ratingCount: 342,
    imagePlaceholder: "mountain-peak",
  },
  {
    slug: "cesky-raj-prachov",
    title: "Prachovské skály",
    region: "Český ráj",
    shortDescription: "Skalní město s bludištěm pískovcových věží a úzkých průsmyků.",
    tags: ["skály", "příroda", "rozhledny"],
    ratingAvg: 4.7,
    ratingCount: 289,
    imagePlaceholder: "rock-formations",
  },
  {
    slug: "sumava-certovo-jezero",
    title: "Čertovo jezero",
    region: "Šumava",
    shortDescription: "Ledovcové jezero obklopené hlubokými lesy a tajemnou atmosférou.",
    tags: ["jezera", "příroda", "tajemno"],
    ratingAvg: 4.6,
    ratingCount: 195,
    imagePlaceholder: "glacial-lake",
  },
  {
    slug: "moravsky-kras-punkevni",
    title: "Punkevní jeskyně",
    region: "Moravský kras",
    shortDescription: "Podzemní říční systém s majes tátními krápníkovými útvary.",
    tags: ["jeskyně", "podzemí", "řeky"],
    ratingAvg: 4.9,
    ratingCount: 412,
    imagePlaceholder: "cave-system",
  },
  {
    slug: "beskydy-lysa-hora",
    title: "Lysá hora",
    region: "Beskydy",
    shortDescription: "Nejvyšší vrchol Moravskoslezských Beskyd s rozlehlými loukami.",
    tags: ["hory", "louky", "turistika"],
    ratingAvg: 4.5,
    ratingCount: 234,
    imagePlaceholder: "mountain-meadow",
  },
  {
    slug: "jizerky-smrk",
    title: "Smrk",
    region: "Jizerské hory",
    shortDescription: "Kultovní hora s charakteristickým vysílačem a balvanitými svahy.",
    tags: ["hory", "vyhlídky", "balvany"],
    ratingAvg: 4.4,
    ratingCount: 178,
    imagePlaceholder: "mountain-transmitter",
  },
  {
    slug: "adršpach-skaly",
    title: "Adršpašské skály",
    region: "Adršpach",
    shortDescription: "Majestátní skalní bludiště se Psími hlavami a Starostou.",
    tags: ["skály", "bludiště", "památky"],
    ratingAvg: 4.8,
    ratingCount: 356,
    imagePlaceholder: "rock-labyrinth",
  },
  {
    slug: "palava-devin",
    title: "Děvín",
    region: "Pálava",
    shortDescription: "Vápencový kopec s výhledem na vinařskou krajinu a Novomlýnské nádrže.",
    tags: ["kopce", "vinice", "výhledy"],
    ratingAvg: 4.7,
    ratingCount: 267,
    imagePlaceholder: "limestone-hill",
  },
];

export const leaderboard = [
  { rank: 1, name: "Jan Horák", points: 2450, badge: "Průzkumník" },
  { rank: 2, name: "Petra Nováková", points: 2180, badge: "Dobrodruh" },
  { rank: 3, name: "Martin Svoboda", points: 1920, badge: "Poutník" },
  { rank: 4, name: "Lucie Dvořáková", points: 1750, badge: "Cestovatel" },
  { rank: 5, name: "Tomáš Procházka", points: 1640, badge: "Stopař" },
  { rank: 6, name: "Eva Maličková", points: 1520, badge: "Objevitel" },
  { rank: 7, name: "Pavel Černý", points: 1380, badge: "Navigátor" },
  { rank: 8, name: "Simona Pokorná", points: 1240, badge: "Vandrovník" },
  { rank: 9, name: "Michal Novotný", points: 1150, badge: "Průvodce" },
  { rank: 10, name: "Kateřina Malá", points: 1080, badge: "Objevitel" },
];
