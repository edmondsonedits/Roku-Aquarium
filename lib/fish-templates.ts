/** Shared vector silhouettes: preview, painting and export use exactly the same path.
 * All heads face right, leaving the left side free to flex during swimming. */
export const FISH_BODY_IDS = ['classic', 'round', 'oval', 'minnow', 'goldfish', 'puffer', 'angelfish', 'lionfish', 'ray', 'eel', 'shark', 'butterfly'] as const;
export type FishBodyId = typeof FISH_BODY_IDS[number];
type Command = ['M' | 'L', number, number] | ['C', number, number, number, number, number, number] | ['Q', number, number, number, number] | ['Z'];
type Template = { id: FishBodyId; name: string; level: 'Simple' | 'Advanced'; tip: string; commands: Command[] };
const definitions: Template[] = [
  { id:'classic', name:'Classic fish', level:'Simple', tip:'Try colourful stripes and a big eye.', commands:[['M',820,384],['C',797,282,690,228,548,228],['C',427,228,338,282,292,347],['L',164,275],['Q',189,384,164,493],['L',292,421],['C',338,486,427,540,548,540],['C',690,540,797,486,820,384],['Z']] },
  { id:'round', name:'Round fish', level:'Simple', tip:'A big round canvas for dots and swirls.', commands:[['M',820,384],['C',820,100,350,100,350,350],['L',164,260],['L',205,384],['L',164,508],['L',350,418],['C',350,668,820,668,820,384],['Z']] },
  { id:'oval', name:'Oval fish', level:'Simple', tip:'An easy long body for rainbow bands.', commands:[['M',820,384],['C',760,200,410,210,300,350],['L',164,300],['Q',195,384,164,468],['L',300,418],['C',410,558,760,568,820,384],['Z']] },
  { id:'minnow', name:'Little minnow', level:'Simple', tip:'Add a shiny stripe from tail to nose.', commands:[['M',820,384],['C',670,285,480,290,300,365],['L',164,290],['L',220,384],['L',164,478],['L',300,403],['C',480,478,670,483,820,384],['Z']] },
  { id:'goldfish', name:'Fan-tail goldfish', level:'Simple', tip:'Decorate the wide, flowing tail.', commands:[['M',820,384],['C',775,260,630,245,495,290],['Q',450,235,390,220],['L',407,340],['Q',280,270,164,205],['Q',220,384,164,563],['Q',280,498,407,428],['C',520,555,745,535,820,384],['Z']] },
  { id:'puffer', name:'Pufferfish', level:'Simple', tip:'Fill the round belly with playful spots.', commands:[['M',820,384],['L',785,350],['L',810,300],['L',755,290],['L',748,230],['L',695,240],['L',660,185],['L',620,222],['L',560,190],['L',540,240],['L',475,230],['L',470,290],['L',415,305],['L',425,355],['L',220,290],['L',270,384],['L',220,478],['L',425,413],['L',415,463],['L',470,478],['L',475,538],['L',540,528],['L',560,578],['L',620,546],['L',660,583],['L',695,528],['L',748,538],['L',755,478],['L',810,468],['L',785,418],['Z']] },
  { id:'angelfish', name:'Angelfish', level:'Advanced', tip:'Try bold bands across the tall fins.', commands:[['M',820,384],['Q',745,320,660,290],['Q',575,205,530,80],['Q',410,195,405,330],['L',164,260],['Q',210,384,164,508],['L',405,438],['Q',410,573,530,688],['Q',575,563,660,478],['Q',745,448,820,384],['Z']] },
  { id:'lionfish', name:'Lionfish', level:'Advanced', tip:'Paint dramatic stripes and spiky fins.', commands:[['M',820,384],['Q',785,310,710,285],['L',700,130],['L',655,280],['L',590,100],['L',580,280],['L',475,120],['L',500,300],['L',350,185],['L',415,340],['L',164,240],['L',230,384],['L',164,528],['L',415,428],['L',350,583],['L',500,468],['L',475,648],['L',580,488],['L',590,668],['L',655,488],['L',700,638],['L',710,483],['Q',785,458,820,384],['Z']] },
  { id:'ray', name:'Gliding ray', level:'Advanced', tip:'Design both wings with matching patterns.', commands:[['M',820,384],['Q',740,305,650,295],['Q',510,210,440,95],['Q',375,220,410,345],['L',164,370],['L',164,398],['L',410,423],['Q',375,548,440,673],['Q',510,558,650,473],['Q',740,463,820,384],['Z']] },
  { id:'eel', name:'Ribbon eel', level:'Advanced', tip:'Follow the wavy body with bright ribbons.', commands:[['M',820,384],['C',800,285,700,280,625,330],['C',480,440,390,240,280,320],['Q',205,365,164,384],['C',310,340,360,570,540,460],['C',650,390,735,485,820,384],['Z']] },
  { id:'shark', name:'Reef shark', level:'Advanced', tip:'Add a pale belly and tiny gill lines.', commands:[['M',820,384],['Q',735,305,615,300],['L',505,130],['L',475,312],['Q',385,325,300,360],['L',164,215],['L',205,384],['L',164,500],['L',300,410],['Q',420,455,530,452],['L',600,565],['L',615,450],['Q',735,435,820,384],['Z']] },
  { id:'butterfly', name:'Butterfly fish', level:'Advanced', tip:'Invent an eye spot and a patterned fin.', commands:[['M',820,384],['L',755,350],['C',730,250,620,175,505,165],['Q',350,220,350,345],['L',164,285],['Q',200,384,164,483],['L',350,423],['Q',350,548,505,603],['C',620,593,730,518,755,418],['Z']] },
];
export const FISH_BODY_TEMPLATES = definitions.map(template => ({ ...template, path: template.commands.map(command => command.join(' ')).join(' ') }));
export function traceBodyTemplate(context: CanvasRenderingContext2D, id: FishBodyId = 'classic'): void {
  const template = FISH_BODY_TEMPLATES.find(item => item.id === id) ?? FISH_BODY_TEMPLATES[0];
  context.beginPath();
  for (const command of template.commands) {
    switch (command[0]) {
      case 'M': context.moveTo(command[1], command[2]); break;
      case 'L': context.lineTo(command[1], command[2]); break;
      case 'C': context.bezierCurveTo(command[1], command[2], command[3], command[4], command[5], command[6]); break;
      case 'Q': context.quadraticCurveTo(command[1], command[2], command[3], command[4]); break;
      case 'Z': context.closePath(); break;
    }
  }
}
