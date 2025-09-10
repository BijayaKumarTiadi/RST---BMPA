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
          bg-white dark:bg-gray-900 rounded-md p-1 transition-colors duration-200 border border-gray-200 dark:border-gray-700`}>
          <img 
            src="/bmpa-logo.svg" 
            alt="BMPA Logo" 
            className={`${sizeClasses[size]} w-auto object-contain`}
          />
        </div>
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