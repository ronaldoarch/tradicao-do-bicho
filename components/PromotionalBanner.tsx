'use client'

export default function PromotionalBanner() {
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 p-6 md:p-8 lg:p-12">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Side - Text */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-tema-texto-titulo leading-tight">
            Gaste pouco hoje para multiplicar seu futuro amanhã
          </h2>
        </div>
        
        {/* Right Side - Animal Illustrations */}
        <div className="flex shrink-0 items-center justify-center gap-4 md:gap-6">
          {/* Shapes no lugar dos emojis */}
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-white/80 to-white/30 shadow-lg border border-white/40"></div>
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-blue-100/80 to-blue-200/40 shadow-lg border border-white/40"></div>
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-orange-100/80 to-yellow-200/60 shadow-lg border border-white/40"></div>
          </div>

          {/* Elementos decorativos */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-yellow-200/70 shadow-md border border-white/40"></div>
            <div className="h-8 w-8 rounded-full bg-green-200/80 shadow-md border border-white/40"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
