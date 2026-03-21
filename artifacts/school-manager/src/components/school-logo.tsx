interface SchoolLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  textColor?: string;
  className?: string;
}

export function SchoolLogo({
  size = "md",
  showText = true,
  textColor = "#0A2463",
  className = ""
}: SchoolLogoProps) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16"
  };

  const textSizeMap = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-4xl"
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 150 150"
        className={`${sizeMap[size]} shadow-lg flex-shrink-0 rounded-xl`}
      >
        <rect width="150" height="150" rx="20" fill="#F4F7FF"/>
        <rect x="70" y="20" width="60" height="30" rx="10" fill="#00B89F" />
        <rect x="75" y="40" width="50" height="70" rx="10" fill="#1B4DB3" />
        <rect x="20" y="20" width="45" height="45" rx="10" fill="#0A2463" />
        <rect x="20" y="75" width="55" height="28" rx="10" fill="#1B4DB3" />
        <circle cx="47" cy="125" r="14" fill="#00B89F" />
      </svg>

      {showText && (
        <div>
          <h1 className={`font-black tracking-tight leading-tight ${textSizeMap[size]}`} style={{ color: textColor }}>
            مدراس
          </h1>
          {size !== "sm" && (
            <p className="text-sidebar-foreground/60 text-xs font-medium">نظام إدارة المدرسة الذكي</p>
          )}
        </div>
      )}
    </div>
  );
}
