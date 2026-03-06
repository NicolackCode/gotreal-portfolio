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
                       // On a trouvé un trou libre (r, c).
                       // Au lieu de grandir naïvement en largeur puis en hauteur, on va évaluer TOUTES
                       // les boîtes rectangulaires (w, h) possibles partant de (r, c) et choisir celle
                       // qui occupe la plus GRANDE SURFACE (w * h) pour garantir le remplissage maximum !
                       
                       let bestW = 1;
                       let bestH = 1;
                       let maxArea = 0;
                       
                       // Quelle est la largeur absolue max avant de taper un mur ou une vidéo ?
                       let absoluteMaxW = 1;
                       while (c + absoluteMaxW < cols && isFree(r, c + absoluteMaxW, 1, 1)) {
                           absoluteMaxW++;
                       }
                       
                       // Pour chaque largeur testée, on trouve sa hauteur max supportée, et on retient l'Aire Max.
                       for (let testW = 1; testW <= absoluteMaxW; testW++) {
                           let testH = 1;
                           while (testH < maxGadgetRows && isFree(r + testH, c, testW, 1)) {
                               testH++;
                           }
                           
                           const area = testW * testH;
                           if (area > maxArea) {
                               maxArea = area;
                               bestW = testW;
                               bestH = testH;
                           }
                       }
                       
                       const finalW = Math.max(2, bestW);
                       let finalH = Math.max(2, bestH);

                       // Esthétique : Si on est tout en bas (plus aucune vidéo pour bloquer la hauteur testée),
                       // on évite qu'il ne s'aplatisse sur quelques lignes en forçant l'esthétisme cubique/vertical.
                       if (finalH < Math.ceil(finalW * 0.8)) {
                          finalH = Math.ceil(finalW * 0.8);
                       }
                       
                       place(r, c, finalW, finalH);
                       
                       if (!gadgetSpans[p.id]) gadgetSpans[p.id] = { mobile: {w:1,h:1}, md: {w:1,h:1}, xl: {w:1,h:1} };
                       
                       if (cols === 6) gadgetSpans[p.id].mobile = {w: finalW, h: finalH};
                       else if (cols === 12) gadgetSpans[p.id].md = {w: finalW, h: finalH};
                       else gadgetSpans[p.id].xl = {w: finalW, h: finalH};
                       
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
