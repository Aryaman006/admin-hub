import { useEffect, useState } from 'react';

const MaintenancePage = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-amber-200/40 to-orange-200/30 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-rose-200/40 to-pink-200/30 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-yellow-100/30 to-amber-100/20 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '6s', animationDelay: '0.5s' }} />
      </div>

      {/* Content */}
      <div 
        className={`relative z-10 flex flex-col items-center text-center px-6 transition-all duration-1000 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Logo */}
        <div className="mb-12 animate-[breathe_4s_ease-in-out_infinite]">
          <img 
            src="/favicon.png" 
            alt="Playoga" 
            className="w-28 h-28 md:w-36 md:h-36 drop-shadow-lg"
          />
        </div>

        {/* Message */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-amber-900/90 mb-4 tracking-wide">
          We're preparing something beautiful.
        </h1>
        <p className="text-xl md:text-2xl text-amber-800/70 font-light mb-16">
          Playoga will be live in just a few minutes.
        </p>

        {/* Calming loader */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-400/80 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
          <span className="w-2 h-2 bg-orange-400/80 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.2s' }} />
          <span className="w-2 h-2 bg-rose-400/80 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.2s' }} />
        </div>

        {/* Tagline */}
        <p className="mt-16 text-amber-700/60 text-sm tracking-widest uppercase">
          Love • Inspire • Breathe
        </p>
      </div>

      {/* Custom animation keyframes */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default MaintenancePage;
