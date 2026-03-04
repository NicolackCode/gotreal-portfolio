

export const metadata = {
  title: 'À Propos - GOTREAL',
  description: 'Gauthier Messager, alias Gotreal, est réalisateur, chef opérateur et monteur vidéo basé à Lille.',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white relative flex flex-col pt-32 lg:pt-40 overflow-hidden">
      
      {/* BACKGROUND TEXT HUGE (Decorative) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30vw] font-sans font-black text-white/[0.03] whitespace-nowrap pointer-events-none z-0 selection:bg-transparent">
        GOTREAL
      </div>

      <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-12 flex-1 relative z-10 flex flex-col justify-between">
        
        {/* HEADER SECTION */}
        <section className="mb-24 md:mb-32">
          <p className="font-mono text-zinc-500 text-[10px] md:text-xs uppercase tracking-[0.3em] mb-4">
            PRÉSENTATION
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-sans font-black leading-[1.1] tracking-tighter max-w-4xl text-zinc-100 uppercase">
            JE M&apos;APPELLE GAUTHIER MESSAGER. <br className="hidden md:block"/>ALIAS GOTREAL. <br className="hidden md:block"/>JE SUIS RÉALISATEUR, CHEF OPÉRATEUR ET MONTEUR VIDÉO.
          </h1>
        </section>

        {/* MIDDLE SECTION: THE PHILOSOPHY */}
        <section className="w-full flex justify-end mb-24 md:mb-32">
          <div className="w-full md:w-2/3 lg:w-1/2">
            <p className="font-sans text-xl md:text-2xl leading-relaxed font-light text-zinc-400">
              Mon univers s’inspire du langage cinématographique, de l’imaginaire, du rêve et du voyage pour révéler la profondeur des émotions humaines.
              Basé à Lille, j&apos;accompagne artistes, structures culturelles, agences et institutions dans la création de projets visuels singuliers, du concept à l’écran.
            </p>
          </div>
        </section>

        {/* BRUTAL QUOTE */}
        <section className="py-20 md:py-32 border-y border-zinc-900 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/5 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)]" />
          <p className="font-mono text-xs md:text-sm uppercase tracking-[0.4em] text-zinc-500 mb-8 z-10 relative">
            VISION
          </p>
          <blockquote className="text-3xl md:text-5xl lg:text-6xl font-sans font-black tracking-tighter text-white uppercase leading-[1.1] z-10 relative px-4">
            &quot;Car les histoires ne meurent jamais : <br className="hidden md:block"/> chaque projet est un voyage où l&apos;image devient récit.&quot;
          </blockquote>
        </section>

        {/* FOOTER CTA */}
        <section className="py-24 md:py-32 flex flex-col items-center justify-center text-center">
          <a 
            href="mailto:gotrealisation@gmail.com?subject=Nouvelle collaboration / Demande de projet&body=Bonjour Gauthier,%0A%0AJe te contacte pour évoquer un futur projet avec toi...%0A%0A[Détaille ici ton besoin, le style, les dates...]" 
            className="text-2xl md:text-4xl font-sans font-black uppercase tracking-widest text-zinc-400 hover:text-white border-b-4 border-transparent hover:border-white transition-all pb-2 mb-8"
          >
            gotrealisation@gmail.com
          </a>
          <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
            — DISPONIBLE POUR DE NOUVEAUX PROJETS —
          </p>
        </section>

      </div>

      {/* FOOTER PUBLIC */}
      <footer className="w-full border-t border-zinc-900 py-12 text-center relative z-20 bg-black mt-auto">
        <p className="font-sans font-bold text-zinc-600 text-[10px] uppercase tracking-[0.3em]">
           © {new Date().getFullYear()} GOTREAL - ALL RIGHTS RESERVED.
        </p>
      </footer>

    </main>
  )
}
