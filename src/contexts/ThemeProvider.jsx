import React, { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ThemeContext = createContext();

// Route to theme mapping
const routeThemeMap = {
  '/survey_creation': 'survey-creation',
  '/data_status': 'data-dashboard',
  '/data_management': 'data-management',
  '/ai_open_analysis': 'ai-open-analysis',
  '/respondent_management': 'respondent-management',
  '/board/notice': 'respondent-management',
  '/board/patchnotes': 'respondent-management',
  '/board': 'respondent-management',
  '/inquiry': 'respondent-management',
};

export const ThemeProvider = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // Determine theme based on current route
    let theme = 'ai-open-analysis'; // default theme

    for (const [route, themeName] of Object.entries(routeThemeMap)) {
      if (location.pathname.startsWith(route)) {
        theme = themeName;
        break;
      }
    }

    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', theme);
  }, [location.pathname]);

  return <ThemeContext.Provider value={{}}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
