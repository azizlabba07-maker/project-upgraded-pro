import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  animateOn?: 'view' | 'hover';
}

const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+',
  className = '',
  parentClassName = '',
  animateOn = 'hover',
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (animateOn === 'view') {
      startAnimation();
    }
  }, [animateOn]);

  const startAnimation = () => {
    let iteration = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setDisplayText((prev) =>
        text.split('').map((char, index) => {
          if (char === ' ') return ' ';
          if (iteration >= maxIterations) return text[index];
          return characters[Math.floor(Math.random() * characters.length)];
        }).join('')
      );

      if (iteration >= maxIterations) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
      iteration += 1;
    }, speed);
  };

  return (
    <motion.span 
      className={parentClassName}
      onMouseEnter={() => { if (animateOn === 'hover') { setIsHovering(true); startAnimation(); } }}
      onMouseLeave={() => { if (animateOn === 'hover') setIsHovering(false); }}
    >
      <span className={className}>{displayText}</span>
    </motion.span>
  );
};

export default DecryptedText;
