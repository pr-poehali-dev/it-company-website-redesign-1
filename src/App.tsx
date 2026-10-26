
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";

const Admin = lazy(() => import("./pages/Admin"));
const ChatGPT = lazy(() => import("./pages/ChatGPT"));
const Consultant = lazy(() => import("./pages/Consultant"));
const Presentation = lazy(() => import("./pages/Presentation"));
const PriceCalculator = lazy(() => import("./pages/PriceCalculator"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogIndex = lazy(() => import("./pages/BlogIndex"));
const CitiesIndex = lazy(() => import("./pages/CitiesIndex"));
const CityPage = lazy(() => import("./pages/CityPage"));
const ServicesGeoIndex = lazy(() => import("./pages/ServicesGeoIndex"));
const ServiceCityPage = lazy(() => import("./pages/ServiceCityPage"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const Turnkey = lazy(() => import("./pages/Turnkey"));
const Investors = lazy(() => import("./pages/Investors"));
const Radar = lazy(() => import("./pages/Radar"));
const RadarCompany = lazy(() => import("./pages/RadarCompany"));
const AnalyticsHome = lazy(() => import("./pages/analytics/AnalyticsHome"));
const MarketIndex = lazy(() => import("./pages/analytics/MarketIndex"));
const MarketReport = lazy(() => import("./pages/analytics/MarketReport"));
const CompanyReport = lazy(() => import("./pages/analytics/CompanyReport"));
const RatingPage = lazy(() => import("./pages/analytics/RatingPage"));
const PricesPage = lazy(() => import("./pages/analytics/PricesPage"));
const DatabasesPage = lazy(() => import("./pages/analytics/DatabasesPage"));
const DatabaseView = lazy(() => import("./pages/analytics/DatabaseView"));
const CompetitorsPage = lazy(() => import("./pages/analytics/CompetitorsPage"));
const ServicesPage = lazy(() => import("./pages/analytics/ServicesPage"));
const ServiceDetail = lazy(() => import("./pages/analytics/ServiceDetail"));
const BiPage = lazy(() => import("./pages/analytics/BiPage"));
const BiSharedPage = lazy(() => import("./pages/analytics/BiSharedPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageFallback = () => <div className="min-h-screen bg-[#080812]" />;

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/chatgpt" element={<ChatGPT />} />
          <Route path="/consultant" element={<Consultant />} />
          <Route path="/services/:slug" element={<ServicePage />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPage />} />
          <Route path="/gotovyy-biznes" element={<Turnkey />} />
          <Route path="/investors" element={<Investors />} />
          <Route path="/radar" element={<Radar />} />
          <Route path="/radar/:inn" element={<RadarCompany />} />
          <Route path="/analytics" element={<AnalyticsHome />} />
          <Route path="/analytics/market" element={<MarketIndex />} />
          <Route path="/analytics/market/:okved" element={<MarketReport />} />
          <Route path="/analytics/market/:okved/:region" element={<MarketReport />} />
          <Route path="/analytics/company" element={<CompanyReport />} />
          <Route path="/analytics/company/:inn" element={<CompanyReport />} />
          <Route path="/analytics/rating" element={<RatingPage />} />
          <Route path="/analytics/prices" element={<PricesPage />} />
          <Route path="/analytics/databases" element={<DatabasesPage />} />
          <Route path="/analytics/databases/:slug" element={<DatabaseView />} />
          <Route path="/analytics/vs-sber" element={<CompetitorsPage />} />
          <Route path="/analytics/services" element={<ServicesPage />} />
          <Route path="/analytics/services/:slug" element={<ServiceDetail />} />
          <Route path="/analytics/bi" element={<BiPage />} />
          <Route path="/analytics/bi/s/:id" element={<BiSharedPage />} />
          <Route path="/presentation" element={<Presentation />} />
          <Route path="/skolko-stoit-avtomatizaciya" element={<PriceCalculator />} />
          <Route path="/avtomatizaciya-biznesa" element={<CitiesIndex />} />
          <Route path="/avtomatizaciya-biznesa/:citySlug" element={<CityPage />} />
          <Route path="/uslugi" element={<ServicesGeoIndex />} />
          <Route path="/uslugi/:serviceSlug/:citySlug" element={<ServiceCityPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
  </ErrorBoundary>
);

export default App;