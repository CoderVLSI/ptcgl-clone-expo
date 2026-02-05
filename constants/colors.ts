/**
 * PTCGL Color Palette
 * Authentic colors matching the Pokémon TCG Live interface
 */

export const Colors = {
  // Primary UI Colors
  primary: {
    red: '#8B1538',
    darkRed: '#5C0D23',
    maroon: '#6B1127',
  },

  // Play Mat
  playMat: {
    green: '#2D5A3D',
    darkGreen: '#1E3D29',
    border: '#4A7D5A',
  },

  // Card Colors
  card: {
    back: '#1A1A2E',
    highlight: '#FFD700',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },

  // Energy Types
  energy: {
    fire: '#FF6B35',
    water: '#4A90D9',
    grass: '#7CB342',
    lightning: '#FFD93D',
    psychic: '#B39DDB',
    fighting: '#D4A574',
    darkness: '#5C4A72',
    metal: '#78909C',
    fairy: '#F8BBD9',
    dragon: '#7B68EE',
    colorless: '#BDBDBD',
  },

  // UI Elements
  ui: {
    white: '#FFFFFF',
    black: '#000000',
    gray: '#9E9E9E',
    darkGray: '#424242',
    overlay: 'rgba(0, 0, 0, 0.7)',
    dialogBg: 'rgba(30, 30, 50, 0.95)',
  },

  // Button Colors
  button: {
    endTurn: '#4CAF50',
    endTurnPressed: '#388E3C',
    disabled: '#757575',
  },

  // Timer
  timer: {
    normal: '#FFFFFF',
    warning: '#FFA726',
    critical: '#EF5350',
  },
};

export default Colors;
