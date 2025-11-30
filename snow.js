// Crea fiocchi di neve animati
function createSnowflakes() {
  const container = document.querySelector('.bg-shapes');
  if (!container) return;
  
  const snowflakeCount = 30; // Numero di fiocchi
  
  for (let i = 0; i < snowflakeCount; i++) {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.innerHTML = '❄';
    
    // Posizione casuale
    snowflake.style.left = Math.random() * 100 + '%';
    snowflake.style.top = Math.random() * -100 + 'vh'; // Partono da diverse altezze sopra lo schermo
    
    // Dimensione casuale
    const size = Math.random() * 15 + 10; // tra 10px e 25px
    snowflake.style.fontSize = size + 'px';
    
    // Opacità casuale
    snowflake.style.opacity = Math.random() * 0.4 + 0.3; // tra 0.3 e 0.7
    
    // Durata animazione casuale
    const duration = Math.random() * 10 + 15; // tra 15s e 25s
    snowflake.style.animationDuration = duration + 's';
    
    // Ritardo distribuito uniformemente per evitare pause
    const delay = -(i / snowflakeCount) * duration; // distribuzione uniforme
    snowflake.style.animationDelay = delay + 's';
    
    container.appendChild(snowflake);
  }
}

// Avvia quando la pagina è caricata
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createSnowflakes);
} else {
  createSnowflakes();
}
