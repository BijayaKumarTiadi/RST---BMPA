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
        <img 
          src="/bmpa-logo.svg" 
          alt="BMPA Logo" 
          className={`${sizeClasses[size]} w-auto object-contain 
            filter brightness-0 dark:filter-none
            transition-all duration-200`}
        />
      </div>
      {showText && (
        <div>
          <h1 className="text-xl font-bold text-primary">Stock Laabh</h1>
          <p className="text-xs text-muted-foreground">Professional Trading Platform</p>
        </div>
      )}
    </div>
  );
}