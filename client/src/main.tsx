// client/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import SecondPage from "./pages/SecondPage";
import SecretSharingForm from "./pages/SecretSharingForm";
import SecretAccess from "./pages/SecretAccess";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/second" element={<SecondPage />} />
        <Route path="/share/:shortId" element={<SecretAccess />} />
        <Route path="/share" element={<SecretSharingForm />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
