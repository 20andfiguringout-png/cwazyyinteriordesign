import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import ConfigurePage from "@/pages/ConfigurePage";
import GalleryPage from "@/pages/GalleryPage";
import AboutPage from "@/pages/AboutPage";
import FAQPage from "@/pages/FAQPage";
import AdminAnalyticsPage from "@/pages/AdminAnalyticsPage";
import BuilderPage from "@/pages/BuilderPage";
import StudioPage from "@/pages/StudioPage";
import ClientsPage from "@/pages/ClientsPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import ClientPortalPage from "@/pages/ClientPortalPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/configure" component={ConfigurePage} />
      <Route path="/gallery" component={GalleryPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/portal/:token" component={ClientPortalPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/builder" component={BuilderPage} />
      <Route path="/studio" component={StudioPage} />
      <Route path="/admin"><Redirect to="/admin/analytics" /></Route>
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Navbar />
            <Router />
            <Footer />
          </WouterRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
