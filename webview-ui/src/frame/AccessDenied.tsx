import React from 'react';

interface AccessDeniedProps {
    title?: string;
    message: React.ReactNode;
    subMessage?: string;
    className?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ 
    title = "⚠️ Access Denied", 
    message, 
    subMessage,
    className
}) => {
    return (
        <div className={className} style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            position: 'relative',
            backgroundColor: '#408880' // Default Emerald BG if class doesn't cover it
        }}>
            <div style={{ 
                width: '280px',
                backgroundColor: '#204840', // var(--emerald-dark)
                padding: '4px', 
                borderRadius: '4px', 
                border: '2px solid #303840', // var(--ui-border)
                boxShadow: '4px 4px 0px rgba(0,0,0,0.4)',
                imageRendering: 'pixelated'
            }}>
                <div style={{
                    border: '2px solid #78C8B8',
                    backgroundColor: '#204840',
                    padding: '12px',
                    borderRadius: '2px',
                    color: '#fff',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <div style={{ 
                        fontSize: '10px', 
                        color: '#F8B050', 
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '4px'
                    }}>
                        {title}
                    </div>
                    <div style={{ 
                        fontSize: '10px', 
                        lineHeight: '1.6',
                        color: '#ffffff',
                        textShadow: '1px 1px 0 #000'
                    }}>
                        {message}
                    </div>
                    {subMessage && (
                        <div style={{
                            marginTop: '8px',
                            fontSize: '8px',
                            color: '#78C8B8',
                            opacity: 0.8
                        }}>
                            {subMessage}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
