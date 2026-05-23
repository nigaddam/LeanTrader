const rawExperience = import.meta.env.VITE_APP_EXPERIENCE

export const appExperience = rawExperience || (import.meta.env.PROD ? 'production' : 'development')

const envFlag = (name, fallback) => {
  const value = import.meta.env[name]
  if (value === undefined || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

export const runtimeConfig = {
  appExperience,
  appHomePath: import.meta.env.VITE_APP_HOME_PATH || '/home',
  isProductionExperience: appExperience === 'production',
  enableAdmin: envFlag('VITE_ENABLE_ADMIN', false),
  showDevelopmentFeatures: envFlag(
    'VITE_ENABLE_DEVELOPMENT_FEATURES',
    appExperience !== 'production'
  ),
}

export const appRouteAllowed = (path) => {
  if (path === runtimeConfig.appHomePath || path.startsWith(`${runtimeConfig.appHomePath}/`)) return true
  if (!runtimeConfig.isProductionExperience && ['/app', '/orders'].includes(path)) return true
  return false
}
