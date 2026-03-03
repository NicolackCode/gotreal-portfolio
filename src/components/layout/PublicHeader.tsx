import Link from 'next/link'

export default function PublicHeader() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-start p-6 lg:p-10 mix-blend-difference pointer-events-none">
      <div className="flex flex-col gap-1 pointer-events-auto">
        <Link href="/" className="text-2xl font-sans font-bold tracking-widest uppercase hover:text-zinc-400 transition-colors">
          GOTREAL
        </Link>
        <span className="text-[10px] lg:text-xs font-mono uppercase tracking-wider text-zinc-300 leading-tight mt-1">
          DIRECTOR & DOP<br/>
          PUBLICITÉS, CLIPS MUSICAUX ET FILMS.
        </span>
      </div>
      
      <nav className="flex gap-6 lg:gap-10 pointer-events-auto mt-1 hidden md:flex">
        <Link href="/about" className="text-[10px] lg:text-xs font-mono font-bold tracking-[0.2em] relative group uppercase hover:text-zinc-400 transition-colors">
          À PROPOS
          <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-white transition-all group-hover:w-full"></span>
        </Link>
        <Link href="/all-projects" className="text-[10px] lg:text-xs font-mono font-bold tracking-[0.2em] relative group uppercase hover:text-zinc-400 transition-colors">
          TOUS LES PROJETS
          <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-white transition-all group-hover:w-full"></span>
        </Link>
        <a href="mailto:gotrealisation@gmail.com" className="text-[10px] lg:text-xs font-mono font-bold tracking-[0.2em] relative group uppercase hover:text-zinc-400 transition-colors">
          CONTACT
          <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-white transition-all group-hover:w-full"></span>
        </a>
      </nav>
    </header>
  )
}
