/**
 * Catálogo para servicios de reparación (sugerencias con búsqueda).
 * No pretende listar el 100 % del mercado; amplía `build*Models` o añade marcas según necesidad.
 */

export const SERVICE_DEVICE_CATEGORY_LABELS = [
  'Smartphones',
  'Tablets',
  'Laptops y PC',
  'Consolas',
  'Smartwatch',
  'Auriculares',
  'Smart TV',
  'Equipos de audio y vídeo',
  'Otros',
] as const;

export type ServiceDeviceCategoryLabel = (typeof SERVICE_DEVICE_CATEGORY_LABELS)[number];

const uniq = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

/** Acepta etiqueta del catálogo o claves tipo ticket (SMARTPHONES, SMART_TV…). */
export function normalizeServiceDeviceCategory(raw: string): string {
  const t = raw.trim();
  if (REPAIR_SERVICE_DEVICE_CATALOG[t]) return t;
  const key = t.toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    SMARTPHONES: 'Smartphones',
    TABLETS: 'Tablets',
    LAPTOPS: 'Laptops y PC',
    LAPTOPS_Y_PC: 'Laptops y PC',
    CONSOLAS: 'Consolas',
    SMARTWATCH: 'Smartwatch',
    AURICULARES: 'Auriculares',
    SMART_TV: 'Smart TV',
    AUDIO_VIDEO: 'Equipos de audio y vídeo',
    OTROS: 'Otros',
  };
  const mapped = map[key];
  if (mapped && REPAIR_SERVICE_DEVICE_CATALOG[mapped]) return mapped;
  return t;
}

/** Modelos iPhone del catálogo (tarifarios, sugerencias, etc.). */
export function getCatalogIPhoneModels(): string[] {
  return iphoneModels();
}

function iphoneModels(): string[] {
  const m: string[] = [
    'iPhone SE (2016)',
    'iPhone SE (2ª gen)',
    'iPhone SE (3ª gen)',
    'iPhone 6',
    'iPhone 6 Plus',
    'iPhone 6s',
    'iPhone 6s Plus',
    'iPhone 7',
    'iPhone 7 Plus',
    'iPhone 8',
    'iPhone 8 Plus',
    'iPhone X',
    'iPhone XR',
    'iPhone XS',
    'iPhone XS Max',
    'iPhone 11',
    'iPhone 11 Pro',
    'iPhone 11 Pro Max',
  ];
  for (const n of ['12', '13'] as const) {
    m.push(`iPhone ${n} mini`, `iPhone ${n}`, `iPhone ${n} Pro`, `iPhone ${n} Pro Max`);
  }
  for (const n of ['14', '15', '16'] as const) {
    m.push(`iPhone ${n}`, `iPhone ${n} Plus`, `iPhone ${n} Pro`, `iPhone ${n} Pro Max`);
  }
  return m;
}

function galaxySNoteZ(): string[] {
  const o: string[] = [];
  for (const n of [7, 8, 9, 10]) {
    o.push(`Galaxy S${n}`, `Galaxy S${n}+`, `Galaxy S${n}e`);
  }
  o.push('Galaxy S10 Lite', 'Galaxy S10 5G');
  for (const n of [20, 21, 22, 23, 24]) {
    o.push(`Galaxy S${n}`, `Galaxy S${n}+`, `Galaxy S${n} Ultra`, `Galaxy S${n} FE`);
  }
  for (const n of [8, 9, 10, 20]) {
    o.push(`Galaxy Note ${n}`, `Galaxy Note ${n}+`);
  }
  for (const n of [2, 3, 4, 5, 6, 7]) {
    o.push(`Galaxy Z Fold${n}`, `Galaxy Z Flip${n}`);
  }
  o.push('Galaxy Z Fold', 'Galaxy Z Flip');
  return o;
}

function galaxyA(): string[] {
  const o: string[] = [];
  for (let n = 10; n <= 74; n += 1) {
    o.push(`Galaxy A${n}`, `Galaxy A${n} 5G`);
  }
  return o;
}

function galaxyM(): string[] {
  const o: string[] = [];
  for (let n = 10; n <= 54; n += 1) {
    o.push(`Galaxy M${n}`);
  }
  return o;
}

function xiaomiPhones(): string[] {
  const o: string[] = [];
  for (let n = 8; n <= 14; n += 1) {
    o.push(
      `Redmi Note ${n}`,
      `Redmi Note ${n} Pro`,
      `Redmi Note ${n} Pro+`,
      `Redmi Note ${n}S`,
    );
  }
  for (let n = 9; n <= 14; n += 1) {
    o.push(`Redmi ${n}`, `Redmi ${n}A`, `Redmi ${n}C`);
  }
  for (const line of ['Mi 10', 'Mi 11', 'Mi 12', 'Mi 13', 'Mi 14'] as const) {
    o.push(line, `${line} Pro`, `${line} Ultra`, `${line} Lite`);
  }
  for (const n of [1, 2, 3, 4, 5, 6]) {
    o.push(`POCO F${n}`, `POCO F${n} Pro`, `POCO X${n}`, `POCO X${n} Pro`, `POCO M${n}`, `POCO C${n}`);
  }
  return uniq(o);
}

function huaweiPhones(): string[] {
  const o: string[] = [];
  for (let n = 20; n <= 60; n += 1) {
    if (n <= 40 || n % 5 === 0) o.push(`P${n}`, `P${n} Pro`, `P${n} lite`);
  }
  for (let n = 20; n <= 60; n += 1) {
    if (n % 5 === 0 || n >= 30) o.push(`Mate ${n}`, `Mate ${n} Pro`);
  }
  for (let n = 5; n <= 12; n += 1) {
    o.push(`nova ${n}`, `nova ${n}i`, `nova ${n} SE`);
  }
  o.push('P smart', 'P smart Pro', 'Y6', 'Y7', 'Y8', 'Y9');
  return uniq(o);
}

function googlePixelPhones(): string[] {
  const o: string[] = [];
  for (const n of [3, 4, 5, 6, 7, 8, 9] as const) {
    o.push(`Pixel ${n}`, `Pixel ${n}a`, `Pixel ${n} Pro`, `Pixel ${n} Pro XL`);
  }
  o.push('Pixel Fold', 'Pixel 9 Pro Fold');
  return uniq(o);
}

function oneplusPhones(): string[] {
  const o: string[] = [];
  for (const n of [6, 7, 8, 9, 10, 11, 12, 13] as const) {
    o.push(`OnePlus ${n}`, `OnePlus ${n} Pro`, `OnePlus ${n}T`, `OnePlus ${n}R`);
  }
  o.push('OnePlus Nord', 'OnePlus Nord 2', 'OnePlus Nord 3', 'OnePlus Nord CE', 'OnePlus Open');
  return uniq(o);
}

function motorolaPhones(): string[] {
  const o: string[] = [];
  for (let n = 5; n <= 100; n += 1) {
    o.push(`moto g${n}`, `moto g${n} Power`, `moto g${n} Plus`);
  }
  for (const n of [20, 30, 40, 50, 60] as const) {
    o.push(`moto e${n}`, `moto e${n}i`);
  }
  o.push(
    'Edge 20',
    'Edge 30',
    'Edge 40',
    'Edge 50',
    'Edge+',
    'Razr 2019',
    'Razr 5G',
    'Razr 40',
    'Razr 50',
  );
  return uniq(o);
}

function oppoPhones(): string[] {
  const o: string[] = [];
  for (const n of ['X2', 'X3', 'X5', 'X6', 'X7', 'X8'] as const) {
    o.push(`Find ${n}`, `Find ${n} Pro`);
  }
  for (let n = 4; n <= 12; n += 1) {
    o.push(`Reno ${n}`, `Reno ${n} Pro`, `Reno ${n} Z`);
  }
  for (let n = 16; n <= 98; n += 2) {
    o.push(`A${n}`, `A${n} 5G`);
  }
  return uniq(o);
}

function vivoPhones(): string[] {
  const o: string[] = [];
  for (let n = 15; n <= 40; n += 1) {
    o.push(`V${n}`, `V${n} Pro`);
  }
  for (const s of ['60', '70', '80', '90', '100'] as const) {
    o.push(`X${s}`, `X${s} Pro`);
  }
  o.push('iQOO 9', 'iQOO 10', 'iQOO 11', 'iQOO 12', 'iQOO Neo', 'iQOO Z');
  return uniq(o);
}

function realmePhones(): string[] {
  const o: string[] = [];
  for (let n = 5; n <= 14; n += 1) {
    o.push(`realme ${n}`, `realme ${n} Pro`, `realme ${n}i`);
  }
  for (const n of [2, 3, 5, 6] as const) {
    o.push(`GT ${n}`, `GT ${n} Pro`, `GT Neo ${n}`);
  }
  for (let n = 11; n <= 35; n += 1) {
    o.push(`C${n}`);
  }
  return uniq(o);
}

function sonyXperia(): string[] {
  const o: string[] = [];
  for (const n of [1, 5, 10] as const) {
    for (const r of ['I', 'II', 'III', 'IV', 'V', 'VI'] as const) {
      o.push(`Xperia ${n} ${r}`, `Xperia ${n} ${r} Compact`);
    }
  }
  o.push('Xperia L4', 'Xperia 10', 'Xperia 10 Plus', 'Xperia Ace');
  return uniq(o);
}

function nokiaPhones(): string[] {
  const o: string[] = [];
  for (let n = 1; n <= 9; n += 1) {
    o.push(`.${n}`, `G${n}0`, `G${n}1`, `X${n}0`, `C${n}0`, `C${n}1`);
  }
  o.push('Nokia 5.4', 'Nokia 8.3', 'Nokia XR20', 'Nokia X20', 'Nokia X30');
  return uniq(o);
}

function asusPhones(): string[] {
  const o: string[] = [];
  for (const n of [5, 6, 7, 8, 9] as const) {
    o.push(`ROG Phone ${n}`, `ROG Phone ${n} Ultimate`);
  }
  for (const n of [7, 8, 9, 10, 11] as const) {
    o.push(`Zenfone ${n}`, `Zenfone ${n} Flip`);
  }
  return o;
}

function tclPhones(): string[] {
  const o: string[] = [];
  for (let n = 10; n <= 40; n += 1) {
    o.push(`TCL 10${n}`, `TCL 20${n}`, `TCL 30${n}`);
  }
  return uniq(o);
}

function ztePhones(): string[] {
  const o: string[] = [];
  for (const line of ['Blade', 'Axon'] as const) {
    for (let n = 10; n <= 50; n += 1) {
      o.push(`${line} ${n}`, `${line} ${n} 5G`);
    }
  }
  return uniq(o);
}

function honorPhones(): string[] {
  const o: string[] = [];
  for (let n = 20; n <= 200; n += 10) {
    o.push(`Honor ${n}`, `Honor ${n} Pro`);
  }
  o.push('Honor Magic 4', 'Honor Magic 5', 'Honor Magic 6', 'Honor X7', 'Honor X8', 'Honor X9');
  return uniq(o);
}

function lenovoPhones(): string[] {
  return uniq([
    'Lenovo K10',
    'Lenovo K12',
    'Lenovo K14',
    'Lenovo P11',
    'Legion Phone Duel',
    'Legion Phone Duel 2',
    'Legion Y70',
    'Legion Y90',
  ]);
}

const SMARTPHONES: Record<string, string[]> = {
  Apple: iphoneModels(),
  Samsung: uniq([...galaxySNoteZ(), ...galaxyA(), ...galaxyM()]),
  Xiaomi: xiaomiPhones(),
  Huawei: huaweiPhones(),
  Google: googlePixelPhones(),
  OnePlus: oneplusPhones(),
  Motorola: motorolaPhones(),
  OPPO: oppoPhones(),
  Vivo: vivoPhones(),
  Realme: realmePhones(),
  Nothing: ['Nothing Phone (1)', 'Nothing Phone (2)', 'Nothing Phone (2a)', 'Nothing Phone (3)'],
  Sony: sonyXperia(),
  Nokia: nokiaPhones(),
  ASUS: asusPhones(),
  TCL: tclPhones(),
  ZTE: ztePhones(),
  Honor: honorPhones(),
  Lenovo: lenovoPhones(),
  Alcatel: uniq(
    Array.from({ length: 30 }, (_, i) => [`Alcatel 1${i + 1}`, `Alcatel 3${i + 1}`, `Alcatel 5${i + 1}`]).flat()
  ),
  Fairphone: ['Fairphone 3', 'Fairphone 3+', 'Fairphone 4', 'Fairphone 5'],
  Meizu: ['Meizu 18', 'Meizu 20', 'Meizu 21', 'Meizu Note'],
  BlackBerry: ['KEYone', 'KEY2', 'Evolve', 'Motion'],
  CAT: ['S62', 'S53', 'S75', 'B40'],
  Energizer: ['E500', 'E520', 'Hardcase H10'],
  Ulefone: ['Armor 7', 'Armor 8', 'Armor 9', 'Armor 10', 'Armor 11', 'Armor 12', 'Armor 21', 'Armor 24'],
  DOOGEE: ['S88', 'S89', 'S90', 'S96', 'V20', 'V30'],
  Infinix: uniq(
    Array.from({ length: 25 }, (_, i) => [`Hot ${i + 10}`, `Note ${i + 10}`, `Zero ${i + 20}`]).flat()
  ),
  Tecno: uniq(
    Array.from({ length: 25 }, (_, i) => [`Spark ${i + 5}`, `Camon ${i + 10}`, `Pova ${i + 5}`]).flat()
  ),
  Itel: uniq(Array.from({ length: 20 }, (_, i) => [`A${i + 30}`, `S${i + 15}`, `P${i + 30}`]).flat()),
  Wiko: uniq(Array.from({ length: 18 }, (_, i) => [`View${i + 1}`, `Y${i + 50}`, `T${i + 10}`]).flat()),
  Sharp: ['Aquos R6', 'Aquos R7', 'Aquos R8', 'Aquos Zero', 'Aquos Sense'],
  LG: [
    'G8',
    'G8X',
    'V50',
    'V60',
    'Velvet',
    'Wing',
    'K41',
    'K42',
    'K51',
    'K52',
    'K61',
    'K62',
  ],
  Panasonic: ['Eluga', 'P55', 'P85'],
  Hisense: ['Infinity H40', 'Infinity H50', 'Rock 5'],
  Micromax: ['In 1', 'In 2', 'Bolt'],
  BLU: ['G9', 'G91', 'Studio'],
  Archos: ['Diamond', 'Oxygen'],
  Oukitel: ['WP5', 'WP6', 'WP10', 'WP18', 'WP19'],
  Cubot: ['KingKong', 'P40', 'X50'],
  Red: ['Hydrogen One', 'Magic'],
};

function ipadModels(): string[] {
  const o: string[] = [];
  for (const gen of [5, 6, 7, 8, 9, 10] as const) {
    o.push(`iPad (${gen}ª gen)`);
  }
  o.push('iPad Air', 'iPad Air 2', 'iPad Air (3ª gen)', 'iPad Air (4ª gen)', 'iPad Air (5ª gen)', 'iPad Air 11" M2');
  for (const gen of [1, 2, 3, 4, 5, 6, 7] as const) {
    o.push(`iPad Pro 11" (${gen}ª gen)`, `iPad Pro 12.9" (${gen}ª gen)`);
  }
  for (const gen of [1, 2, 3, 4, 5, 6, 7] as const) {
    o.push(`iPad mini (${gen}ª gen)`);
  }
  return o;
}

function galaxyTabs(): string[] {
  const o: string[] = [];
  for (const n of ['S6', 'S7', 'S8', 'S9', 'S10'] as const) {
    o.push(`Galaxy Tab ${n}`, `Galaxy Tab ${n}+`, `Galaxy Tab ${n} Ultra`, `Galaxy Tab ${n} FE`);
  }
  for (let n = 5; n <= 12; n += 1) {
    o.push(`Galaxy Tab A${n}`, `Galaxy Tab A${n} Lite`);
  }
  return uniq(o);
}

const TABLETS: Record<string, string[]> = {
  Apple: ipadModels(),
  Samsung: galaxyTabs(),
  Xiaomi: [
    'Pad 5',
    'Pad 5 Pro',
    'Pad 6',
    'Pad 6 Pro',
    'Pad 6S Pro',
    'Redmi Pad',
    'Redmi Pad SE',
    'Redmi Pad Pro',
  ],
  Huawei: ['MatePad 11', 'MatePad Pro', 'MatePad SE', 'MatePad Air', 'MediaPad M5', 'MediaPad T5'],
  Lenovo: ['Tab M10', 'Tab M11', 'Tab P11', 'Tab P12', 'Yoga Tab', 'Legion Tab'],
  Amazon: ['Fire 7', 'Fire HD 8', 'Fire HD 10', 'Fire Max 11'],
  Microsoft: ['Surface Go 2', 'Surface Go 3', 'Surface Go 4', 'Surface Pro 7', 'Surface Pro 8', 'Surface Pro 9', 'Surface Pro 10', 'Surface Pro X'],
  Google: ['Pixel Tablet', 'Pixel Slate'],
  Realme: ['realme Pad', 'realme Pad 2', 'realme Pad Mini'],
  OnePlus: ['OnePlus Pad', 'OnePlus Pad 2'],
  Honor: ['Honor Pad 8', 'Honor Pad 9', 'Honor MagicPad'],
  TCL: ['TAB 10', 'TAB 11', 'TAB Max'],
};

const LAPTOPS_PC: Record<string, string[]> = {
  Apple: [
    'MacBook Air (M1)',
    'MacBook Air (M2)',
    'MacBook Air (M3)',
    'MacBook Air 13" Intel',
    'MacBook Air 15" M2',
    'MacBook Air 15" M3',
    'MacBook Pro 13" M1',
    'MacBook Pro 13" M2',
    'MacBook Pro 14" M1 Pro',
    'MacBook Pro 14" M2 Pro',
    'MacBook Pro 14" M3',
    'MacBook Pro 16" M1 Max',
    'MacBook Pro 16" M2 Max',
    'MacBook Pro 16" M3 Max',
    'MacBook (Retina, 12")',
  ],
  Acer: uniq(['Aspire 3', 'Aspire 5', 'Aspire 7', 'Swift 1', 'Swift 3', 'Swift 5', 'Swift X', 'Nitro 5', 'Nitro 16', 'Predator Helios', 'Predator Triton', 'Extensa', 'TravelMate'].flatMap((x) => [`Acer ${x}`, `${x} 2022`, `${x} 2023`, `${x} 2024`])),
  ASUS: uniq(['VivoBook', 'ZenBook', 'TUF Gaming', 'ROG Strix', 'ROG Zephyrus', 'ExpertBook', 'Chromebook'].flatMap((x) => [`ASUS ${x} 14`, `ASUS ${x} 15`, `ASUS ${x} 16`, `ASUS ${x} 17`])),
  Dell: uniq(['Inspiron 14', 'Inspiron 15', 'Inspiron 16', 'XPS 13', 'XPS 15', 'XPS 17', 'Latitude 5000', 'Latitude 7000', 'Precision', 'Alienware m15', 'Alienware m16', 'Alienware x16', 'G15', 'G16'].map((x) => `Dell ${x}`)),
  HP: uniq(['Pavilion 14', 'Pavilion 15', 'Envy 13', 'Envy 15', 'Envy x360', 'Spectre x360', 'EliteBook', 'ProBook', 'OMEN 16', 'Victus 15', 'Victus 16', 'Chromebook'].map((x) => `HP ${x}`)),
  Lenovo: uniq(['IdeaPad 3', 'IdeaPad 5', 'IdeaPad Gaming', 'Legion 5', 'Legion 7', 'Legion 9', 'ThinkPad E', 'ThinkPad L', 'ThinkPad T', 'ThinkPad X1 Carbon', 'ThinkPad X1 Yoga', 'Yoga Slim', 'Yoga 7'].map((x) => `Lenovo ${x}`)),
  MSI: ['Modern 14', 'Modern 15', 'Prestige 14', 'Prestige 16', 'Katana', 'Cyborg', 'Raider', 'Stealth', 'Vector'].map((x) => `MSI ${x}`),
  Microsoft: ['Surface Laptop 4', 'Surface Laptop 5', 'Surface Laptop 6', 'Surface Laptop Go', 'Surface Laptop Studio', 'Surface Book 3'],
  Samsung: ['Galaxy Book2', 'Galaxy Book3', 'Galaxy Book4', 'Galaxy Book Pro', 'Galaxy Book Ultra'],
  Razer: ['Blade 14', 'Blade 15', 'Blade 16', 'Blade 18', 'Book 13'].map((x) => `Razer ${x}`),
  Gigabyte: ['AERO 14', 'AERO 16', 'G5', 'G6', 'Aorus 15', 'Aorus 17'].map((x) => `Gigabyte ${x}`),
  LG: ['Gram 14', 'Gram 15', 'Gram 16', 'Gram 17'].map((x) => `LG ${x}`),
  Huawei: ['MateBook D', 'MateBook X', 'MateBook X Pro', 'MateBook 14', 'MateBook 16'],
  Xiaomi: ['RedmiBook', 'Mi Notebook Pro', 'Mi Notebook Air'],
};

const CONSOLAS: Record<string, string[]> = {
  Sony: [
    'PS4',
    'PS4 Pro',
    'PS4 Slim',
    'PS5',
    'PS5 Digital',
    'PS5 Slim',
    'PS Portal',
    'PS Vita',
    'PS3',
    'PS2',
    'PS1',
  ],
  Microsoft: [
    'Xbox One',
    'Xbox One S',
    'Xbox One X',
    'Xbox Series S',
    'Xbox Series X',
    'Xbox 360',
    'Xbox Classic',
  ],
  Nintendo: [
    'Switch',
    'Switch Lite',
    'Switch OLED',
    'Switch 2',
    'Wii U',
    'Wii',
    '3DS',
    '2DS',
    'GameCube',
    'N64',
    'SNES',
    'NES',
    'Game Boy',
    'Game Boy Advance',
    'DS',
    'DSi',
  ],
  Valve: ['Steam Deck', 'Steam Deck OLED'],
  ASUS: ['ROG Ally', 'ROG Ally X'],
  Lenovo: ['Legion Go'],
  Analogue: ['Analogue Pocket'],
  Retroid: ['Retroid Pocket', 'Retroid Pocket 2S', 'Retroid Pocket 4 Pro'],
  Sega: ['Mega Drive Mini', 'Genesis Mini', 'Dreamcast', 'Saturn', 'Game Gear'],
  Atari: ['Atari VCS', '2600+', 'Atari Flashback'],
  SNK: ['Neo Geo Mini', 'Neo Geo Arcade Stick Pro'],
  Anbernic: ['RG35XX', 'RG405M', 'RG556', 'RG28XX'],
  Ayaneo: ['Air', 'Air 1S', 'Kun', 'Slide', 'Flip'],
  GPD: ['Win 4', 'Win Mini', 'Win Max 2'],
  Meta: ['Quest 2', 'Quest 3', 'Quest 3S', 'Quest Pro'],
  Nvidia: ['Shield TV', 'Shield TV Pro'],
  Playdate: ['Playdate'],
  Evercade: ['VS', 'EXP'],
  Polymega: ['Polymega'],
};

const SMARTWATCH: Record<string, string[]> = {
  Apple: uniq(
    ['Series 3', 'Series 4', 'Series 5', 'SE', 'Series 6', 'Series 7', 'Series 8', 'Series 9', 'Series 10', 'Ultra', 'Ultra 2'].map(
      (x) => `Apple Watch ${x}`
    )
  ),
  Samsung: uniq(
    ['Galaxy Watch', 'Galaxy Watch Active2', 'Galaxy Watch3', 'Galaxy Watch4', 'Galaxy Watch5', 'Galaxy Watch6', 'Galaxy Watch7', 'Galaxy Watch Ultra'].flatMap(
      (x) => [`${x} 40mm`, `${x} 44mm`, `${x} 46mm`]
    )
  ),
  Google: ['Pixel Watch', 'Pixel Watch 2', 'Pixel Watch 3'],
  Garmin: ['Fenix 7', 'Fenix 8', 'Forerunner 255', 'Forerunner 265', 'Forerunner 955', 'Venu 3', 'Vivoactive 5'],
  Fitbit: ['Versa 3', 'Versa 4', 'Sense', 'Sense 2', 'Charge 5', 'Charge 6', 'Inspire 3'],
  Huawei: ['Watch GT 3', 'Watch GT 4', 'Watch GT 5', 'Watch Fit', 'Watch Ultimate'],
  Xiaomi: ['Mi Watch', 'Redmi Watch', 'Watch 2', 'Watch 2 Pro', 'Watch S1', 'Watch S3'],
  Amazfit: ['GTR 4', 'GTS 4', 'Balance', 'Active', 'Falcon', 'T-Rex 3'],
  Fossil: ['Gen 6', 'Gen 6 Wellness', 'Gen 6 Hybrid'],
  Mobvoi: ['TicWatch Pro 3', 'TicWatch Pro 5', 'TicWatch E3'],
};

const AURICULARES: Record<string, string[]> = {
  Apple: ['AirPods (2ª gen)', 'AirPods (3ª gen)', 'AirPods Pro', 'AirPods Pro 2', 'AirPods Max'],
  Samsung: ['Galaxy Buds', 'Galaxy Buds+', 'Galaxy Buds Live', 'Galaxy Buds2', 'Galaxy Buds2 Pro', 'Galaxy Buds3', 'Galaxy Buds3 Pro'],
  Sony: ['WF-1000XM3', 'WF-1000XM4', 'WF-1000XM5', 'WH-1000XM4', 'WH-1000XM5', 'WH-CH720N'],
  Bose: ['QuietComfort Earbuds', 'QuietComfort Earbuds II', 'QuietComfort Ultra', 'QuietComfort 45', 'SoundLink'],
  JBL: ['Tune', 'Live', 'Wave', 'Vibe', 'Endurance', 'Reflect', 'Quantum'].flatMap((s) => [`JBL ${s} 120`, `JBL ${s} 220`, `JBL ${s} 520`]),
  Sennheiser: ['Momentum True Wireless 3', 'Momentum 4', 'CX Plus', 'CX True Wireless', 'HD 450BT', 'HD 560S'],
  Xiaomi: ['Redmi Buds', 'Redmi Buds 4', 'Redmi Buds 5', 'Mi True Wireless'],
  Google: ['Pixel Buds', 'Pixel Buds A', 'Pixel Buds Pro', 'Pixel Buds Pro 2'],
  Nothing: ['Ear (1)', 'Ear (2)', 'Ear (a)', 'Ear'],
  Beats: ['Studio Buds', 'Studio Buds+', 'Fit Pro', 'Solo 4', 'Studio Pro'],
  Anker: ['Soundcore Liberty', 'Soundcore Space', 'Soundcore Life'],
  Shure: ['Aonic', 'SE215', 'SE425'],
  AudioTechnica: ['ATH-M50x', 'ATH-M40x', 'ATH-SR30'],
};

const SMART_TV: Record<string, string[]> = {
  Samsung: uniq(
    ['Q60', 'Q70', 'Q80', 'Q90', 'QN85', 'QN90', 'QN900', 'CU8000', 'DU8000'].flatMap((s) => [`Samsung ${s} 43"`, `Samsung ${s} 55"`, `Samsung ${s} 65"`, `Samsung ${s} 75"`])
  ),
  LG: uniq(
    ['A2', 'B3', 'C3', 'C4', 'G3', 'G4', 'QNED80', 'QNED85'].flatMap((s) => [`LG OLED ${s} 48"`, `LG OLED ${s} 55"`, `LG OLED ${s} 65"`, `LG OLED ${s} 77"`])
  ),
  Sony: ['Bravia XR A80L', 'Bravia XR A95L', 'Bravia XR X90L', 'Bravia XR X93L', 'Bravia 7', 'Bravia 8', 'Bravia 9'],
  TCL: ['C64', 'C74', 'C84', 'C98', 'P638', 'QM8'].flatMap((s) => [`TCL ${s} 43"`, `TCL ${s} 55"`, `TCL ${s} 65"`]),
  Hisense: ['U6', 'U7', 'U8', 'U9', 'A6', 'A7'].flatMap((s) => [`Hisense ${s} 50"`, `Hisense ${s} 55"`, `Hisense ${s} 65"`]),
  Philips: ['Ambilight 55"', 'Ambilight 65"', 'The One 43"', 'The One 50"'],
  Xiaomi: ['Mi TV P1', 'Mi TV Q1', 'TV A2', 'TV Q2'],
  Panasonic: ['JZ1500', 'JZ2000', 'MX950'],
  Sharp: ['Aquos 55"', 'Aquos 65"', 'Aquos 70"'],
  Toshiba: ['43"', '50"', '55"', '65"', '75"'],
  Vizio: ['V-Series', 'M-Series', 'P-Series', 'D-Series', 'OLED'],
  Hitachi: ['43"', '50"', '55"', '65"'],
  Haier: ['43"', '50"', '55"', '65"', '75"'],
  Changhong: ['43"', '50"', '55"', '65"'],
  Konka: ['43"', '50"', '55"', '65"'],
  Skyworth: ['43"', '50"', '55"', '65"', '75"'],
  Loewe: ['bild v.55', 'bild i.65', 'bild c.48'],
  Grundig: ['43"', '50"', '55"', '65"'],
  Metz: ['43"', '50"', '55"'],
  Blaupunkt: ['40"', '43"', '50"', '55"'],
  Thomson: ['43"', '50"', '55"', '65"'],
  JVC: ['43"', '50"', '55"', '65"'],
  Sanyo: ['32"', '43"', '50"', '55"'],
  RCA: ['43"', '50"', '55"', '65"'],
  Vestel: ['43"', '50"', '55"', '65"'],
  Beko: ['43"', '50"', '55"'],
  Insignia: ['43"', '55"', '65"', '70"'],
  Westinghouse: ['43"', '50"', '55"', '65"'],
  Element: ['43"', '50"', '55"', '65"'],
  Onn: ['43"', '50"', '58"', '65"', '70"'],
  Telefunken: ['43"', '50"', '55"'],
  'Bang Olufsen': ['Beovision Contour', 'Beovision Harmony', 'Beovision Theatre'],
  Realme: ['Smart TV 43"', 'Smart TV 50"', 'Smart TV 55"'],
  OnePlus: ['TV Q1', 'TV U1', 'TV Y1'],
  Coocaa: ['43"', '50"', '55"'],
  PPTV: ['43"', '55"'],
  FFalcon: ['43"', '55"', '65"'],
  Huawei: ['Vision 55"', 'Vision 65"', 'Vision 75"'],
  Honor: ['Vision 55"', 'Vision 65"'],
  Acer: ['43"', '50"', '55"'],
};

const AUDIO_VIDEO: Record<string, string[]> = {
  Sony: ['HT-A5000', 'HT-A7000', 'STR-DH590', 'TA-AN1000', 'SRS-XG300', 'SRS-XV800'],
  Yamaha: ['RX-V4A', 'RX-V6A', 'RX-A2A', 'MusicCast 50', 'HS-8', 'HS-10'],
  Denon: ['AVR-X1700H', 'AVR-X2800H', 'AVR-X3800H', 'Home 150', 'Home 250'],
  Pioneer: ['VSX-534', 'VSX-834', 'X-HM21'],
  Bose: ['SoundTouch', 'Smart Soundbar 300', 'Smart Soundbar 600', 'Smart Ultra Soundbar', 'L1 Pro'],
  JBL: ['Bar 300', 'Bar 500', 'Bar 700', 'Bar 1000', 'PartyBox 110', 'PartyBox 310', 'PartyBox Ultimate'],
  LG: ['S80QY', 'S90QY', 'SC9S', 'Eclair'],
  Samsung: ['HW-Q600C', 'HW-Q800C', 'HW-Q930C', 'HW-Q990C', 'MX-ST50B'],
  'Harman Kardon': ['Citation Bar', 'Citation MultiBeam', 'Enchant 1300'],
  Marshall: ['Acton III', 'Stanmore III', 'Woburn III', 'Middleton'],
  Sonos: ['Arc', 'Beam', 'Ray', 'Era 100', 'Era 300', 'Five'],
  Cambridge: ['AXR100', 'CXA61', 'CXA81'],
  NAD: ['C 328', 'C 338', 'M10 V2'],
  Marantz: ['NR1510', 'Cinema 60', 'Cinema 70'],
  Onkyo: ['TX-NR5100', 'TX-NR6100', 'TX-RZ50'],
  Teac: ['AI-301DA', 'CR-H700'],
  Focal: ['Chora', 'Sopra', 'Shape'],
  KEF: ['LS50', 'LSX II', 'Q150', 'R3 Meta'],
  Edifier: ['R1280DB', 'R1700BT', 'S1000MKII', 'S3000Pro'],
};

const OTROS: Record<string, string[]> = {
  Genérico: ['No aplica', 'Varios', 'Accesorio genérico', 'Cable / adaptador'],
  Impresoras: ['HP LaserJet', 'HP DeskJet', 'Canon PIXMA', 'Epson EcoTank', 'Brother'],
  Router: ['TP-Link', 'ASUS RT', 'Netgear', 'Linksys', 'MikroTik'],
  Drone: ['DJI Mini', 'DJI Air', 'DJI Mavic'],
};

/** Catálogo: categoría (etiqueta UI) → marca → modelos. */
export const REPAIR_SERVICE_DEVICE_CATALOG: Record<string, Record<string, string[]>> = {
  Smartphones: SMARTPHONES,
  Tablets: TABLETS,
  'Laptops y PC': LAPTOPS_PC,
  Consolas: CONSOLAS,
  Smartwatch: SMARTWATCH,
  Auriculares: AURICULARES,
  'Smart TV': SMART_TV,
  'Equipos de audio y vídeo': AUDIO_VIDEO,
  Otros: OTROS,
};

export function getServiceCatalogBrands(categoryLabel: string): string[] {
  const cat = REPAIR_SERVICE_DEVICE_CATALOG[normalizeServiceDeviceCategory(categoryLabel.trim())];
  if (!cat) return [];
  return Object.keys(cat).sort((a, b) => a.localeCompare(b, 'es'));
}

export function getServiceCatalogModels(categoryLabel: string, brand: string): string[] {
  const cat = REPAIR_SERVICE_DEVICE_CATALOG[normalizeServiceDeviceCategory(categoryLabel.trim())];
  if (!cat) return [];
  const models = cat[brand.trim()];
  return models ? [...models] : [];
}

/** Todas las marcas de todas las categorías (p. ej. filtros globales). */
export function getAllServiceCatalogBrands(): string[] {
  const s = new Set<string>();
  for (const cat of Object.values(REPAIR_SERVICE_DEVICE_CATALOG)) {
    for (const b of Object.keys(cat)) s.add(b);
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Convierte la clave de marca del catálogo al valor guardado en `repair_tickets.device_brand`
 * (MAYÚSCULAS; espacios → guión bajo).
 */
export function catalogBrandToTicketBrandValue(catalogName: string): string {
  return catalogName.trim().replace(/\s+/g, '_').toUpperCase();
}

/** Opciones del desplegable «Marca» según la categoría del ticket (claves SMARTPHONES, SMART_TV…). */
export function getTicketFormBrandSelectOptions(ticketCategoryKey: string): { value: string; label: string }[] {
  const norm = normalizeServiceDeviceCategory((ticketCategoryKey || '').trim());
  if (!norm || !REPAIR_SERVICE_DEVICE_CATALOG[norm]) {
    return [{ value: 'OTRO', label: 'OTRO' }];
  }
  const cat = REPAIR_SERVICE_DEVICE_CATALOG[norm];
  const opts = Object.keys(cat)
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
    .map((name) => ({
      value: catalogBrandToTicketBrandValue(name),
      label: name.toUpperCase(),
    }));
  if (!opts.some((o) => o.value === 'OTRO')) {
    opts.push({ value: 'OTRO', label: 'OTRO' });
  }
  return opts;
}

/** Indica si el valor de marca guardado encaja con la categoría actual (p. ej. al cambiar de categoría). */
export function isTicketBrandInCategory(brandValue: string, ticketCategoryKey: string): boolean {
  if (!brandValue?.trim() || !ticketCategoryKey?.trim()) return false;
  if (brandValue.trim().toUpperCase() === 'OTRO') return true;
  const norm = normalizeServiceDeviceCategory(ticketCategoryKey.trim());
  const cat = REPAIR_SERVICE_DEVICE_CATALOG[norm];
  if (!cat) return false;
  const v = brandValue.trim().toUpperCase();
  return Object.keys(cat).some((k) => catalogBrandToTicketBrandValue(k) === v);
}
