// Fonction de simulation "CSS Grid Dense Flow" pour calculer la taille max d'un Gadget (Liquid Fill)
export interface GridProject {
  id: string
  category?: string
  forced_span?: string
  client?: string
  rotation?: number
}

// Interprète grossièrement les tailles pour notre simulation
const parseSpan = (spanClasses: string, colsMode: number) => {
    const parts = spanClasses.split(/\s+/);
    let defaultCol = null, defaultRow = null;
    let mdCol = null, mdRow = null;
    let xlCol = null, xlRow = null;

    parts.forEach(p => {
        const cMatch = p.match(/^(md:|xl:)?col-span-(\d+)$/);
        if (cMatch) {
            if (cMatch[1] === 'xl:') xlCol = parseInt(cMatch[2]);
            else if (cMatch[1] === 'md:') mdCol = parseInt(cMatch[2]);
            else defaultCol = parseInt(cMatch[2]);
        }
        const rMatch = p.match(/^(md:|xl:)?row-span-(\d+)$/);
        if (rMatch) {
            if (rMatch[1] === 'xl:') xlRow = parseInt(rMatch[2]);
            else if (rMatch[1] === 'md:') mdRow = parseInt(rMatch[2]);
            else defaultRow = parseInt(rMatch[2]);
        }
    });

    if (colsMode <= 6) {
        return { w: Math.min(6, defaultCol || 2), h: defaultRow || 4 };
    } else if (colsMode <= 12) {
        return { w: Math.min(12, mdCol || defaultCol || 4), h: mdRow || defaultRow || 8 };
    } else {
        return { w: Math.min(24, xlCol || mdCol || defaultCol || 8), h: xlRow || mdRow || defaultRow || 16 };
    }
};

export function autoPackGadgets(projects: GridProject[]) {
  const gadgetSpans: Record<string, { mobile: {w:number,h:number}, md: {w:number,h:number}, xl: {w:number,h:number} }> = {};
  
  const simulateBreakpoint = (cols: number) => {
     const grid: boolean[][] = [];
     const isFree = (r: number, c: number, w: number, h: number) => {
        if (c + w > cols) return false;
        for (let i = r; i < r + h; i++) {
           if (grid[i]) {
              for (let j = c; j < c + w; j++) {
                 if (grid[i][j]) return false;
              }
           }
        }
        return true;
     };
     const place = (r: number, c: number, w: number, h: number) => {
        for (let i = r; i < r + h; i++) {
           if (!grid[i]) grid[i] = new Array(cols).fill(false);
           for (let j = c; j < c + w; j++) {
              grid[i][j] = true;
           }
        }
     };

     // Empêche un Gadget à la toute fin de gonfler vers l'infini (max de hauteur autorisé)
     const maxGadgetRows = cols === 24 ? 28 : (cols === 12 ? 14 : 7);

     projects.forEach(p => {
        if (p.category !== 'GADGET') {
           // Taille du composant classique
           let w = 4, h = 18; 
           if (p.forced_span) {
              const parsed = parseSpan(p.forced_span, cols);
              w = parsed.w; h = parsed.h;
           } else {
              const isVert = p.rotation === 90 || p.rotation === -90 || p.rotation === 270 ||
                             p.client?.toLowerCase().includes('reel') || p.category?.toLowerCase().includes('reel');
              if (cols === 24) { w = isVert ? 4 : 8; h = isVert ? 28 : 18; }
              else if (cols === 12) { w = isVert ? 2 : 4; h = isVert ? 14 : 9; }
              else { w = isVert ? 2 : 4; h = isVert ? 7 : 5; } // mobile
           }
           
           let placed = false;
           for (let r = 0; !placed; r++) {
               for (let c = 0; c <= cols - w; c++) {
                   if (isFree(r, c, w, h)) {
                       place(r, c, w, h);
                       placed = true;
                       break;
                   }
               }
           }
        } else {
           // GADGET INFLATION (Le cœur du Liquid Fill algorithm)
           let placed = false;
           for (let r = 0; !placed; r++) {
               for (let c = 0; c < cols; c++) {
                   if (isFree(r, c, 1, 1)) {
                       // On a trouvé un trou. On gonfle la largeur autant que possible (jusqu'au mur ou une vidéo).
                       let maxW = 1;
                       while (c + maxW < cols && isFree(r, c + maxW, 1, 1)) {
                           maxW++;
                       }
                       // Ensuite, avec cette largeur trouvée, on descend la hauteur au maximum possible !
                       let maxH = 1;
                       while (maxH < maxGadgetRows && isFree(r + maxH, c, maxW, 1)) {
                           maxH++;
                       }
                       
                       // Sécurité Admin : on force la taille mathématique à au moins 2x2 pour que le UI soit visible,
                       // quitte à ce qu'il "dépasse" un peu sous la pile si le trou est d'1 pixel.
                       maxW = Math.max(2, maxW);
                       maxH = Math.max(2, maxH);
                       
                       place(r, c, maxW, maxH);
                       
                       if (!gadgetSpans[p.id]) gadgetSpans[p.id] = { mobile: {w:1,h:1}, md: {w:1,h:1}, xl: {w:1,h:1} };
                       
                       if (cols === 6) gadgetSpans[p.id].mobile = {w: maxW, h: maxH};
                       else if (cols === 12) gadgetSpans[p.id].md = {w: maxW, h: maxH};
                       else gadgetSpans[p.id].xl = {w: maxW, h: maxH};
                       
                       placed = true;
                       break;
                   }
               }
           }
        }
     });
  };

  simulateBreakpoint(6);
  simulateBreakpoint(12);
  simulateBreakpoint(24);

  const finalSpans: Record<string, string> = {};
  Object.keys(gadgetSpans).forEach(id => {
     const s = gadgetSpans[id];
     finalSpans[id] = `col-span-${s.mobile.w} row-span-${s.mobile.h} md:col-span-${s.md.w} md:row-span-${s.md.h} xl:col-span-${s.xl.w} xl:row-span-${s.xl.h}`;
  });

  return finalSpans;
}
