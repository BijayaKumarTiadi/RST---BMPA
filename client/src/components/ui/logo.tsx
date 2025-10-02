interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className = "", size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8', 
    lg: 'h-12'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center justify-center">
        <div className={`${sizeClasses[size]} w-auto flex items-center justify-center 
          bg-white dark:bg-gray-800 rounded-md p-1 transition-colors duration-200 border border-gray-300 dark:border-gray-600`}>
          <img 
            src="/bmpa-logo.svg" 
            alt="BMPA Logo" 
            className={`${sizeClasses[size]} w-auto object-contain brightness-0 dark:brightness-100 transition-all duration-200`}
          />
        </div>
      </div>
      {showText && (
        <div>
          <h1 className="text-xl font-bold text-primary">STOCK LAABH</h1>
          <p className="text-xs text-muted-foreground">Don't waste it—trade it.</p>
        </div>
      )}
    </div>
  );
}