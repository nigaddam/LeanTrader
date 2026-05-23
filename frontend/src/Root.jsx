import App from './App.jsx'
import LandingPage from './components/LandingPage.jsx'
import { appRouteAllowed, runtimeConfig } from './config/runtime'

const shouldShowAppShell = () => {
  const path = window.location.pathname
  return appRouteAllowed(path)
}

export default function Root() {
  return shouldShowAppShell() ? <App runtimeConfig={runtimeConfig} /> : <LandingPage />
}
