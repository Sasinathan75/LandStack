import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import GovernmentDashboard from "@/pages/GovernmentDashboard";
import CitizenDashboard from "@/pages/CitizenDashboard";
import { GovernmentWorkspace } from "@/pages/GovernmentModules";
import { CitizenWorkspace } from "@/pages/CitizenModules";
import Login from "@/pages/Login";
import { Route, Switch } from "wouter";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LandStackProvider } from "./contexts/LandStackContext";
import Home from "./pages/Home";

function GovernmentRoute() {
  const [location] = useLocation();
  return location === "/government" || location === "/government/dashboard" ? <GovernmentDashboard /> : <GovernmentWorkspace />;
}

function CitizenRoute() {
  const [location] = useLocation();
  return location === "/citizen" || location === "/citizen/dashboard" ? <CitizenDashboard /> : <CitizenWorkspace />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/government" component={GovernmentRoute} />
      <Route path="/government/dashboard" component={GovernmentRoute} />
      <Route path="/government/parcel/:id" component={GovernmentRoute} />
      {/* Alias for the GIS Explorer workspace */}
      <Route path="/gis-explorer" component={GovernmentRoute} />
      <Route path="/citizen" component={CitizenRoute} />
      <Route path="/citizen/dashboard" component={CitizenRoute} />
      <Route path="/citizen/requests/:id" component={CitizenRoute} />
      <Route path="/government/:rest*" component={GovernmentRoute} />
      <Route path="/citizen/:rest*" component={CitizenRoute} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [location] = useLocation();
  const role = location.startsWith("/government") || location.startsWith("/gis-explorer") ? "government" : "citizen";

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LandStackProvider role={role}>
          <TooltipProvider>
            <Toaster position="bottom-right" />
            <Router />
          </TooltipProvider>
        </LandStackProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
