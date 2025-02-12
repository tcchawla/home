// client/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import SecretSharingForm from "./pages/SecretSharingForm";
import SecretAccess from "./pages/SecretAccess";
import ExtendExpiry from "./pages/ExtendExpiry";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/share/:shortId" element={<SecretAccess />} />
        <Route path="/share" element={<SecretSharingForm />} />
        <Route path="/extend" element={<ExtendExpiry />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
