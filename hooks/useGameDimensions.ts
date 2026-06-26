import { useWindowDimensions, Platform } from 'react-native';

const DESKTOP_GAME_WIDTH = 480;

export function useGameDimensions() {
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;
  const gameWidth = isDesktop ? DESKTOP_GAME_WIDTH : width;
  const gameHeight = isDesktop ? height : height;
  return { width: gameWidth, height: gameHeight, isDesktop, screenWidth: width, screenHeight: height };
}

export default useGameDimensions;
