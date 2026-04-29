"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { authApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@bantul.go.id");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await authApi.login(email, password);
      console.log("Login response:", res);

      const token = res.access_token;
      const user = res.user;
      console.log("Token:", token);
      console.log("User role:", user.role);
      console.log(
        "LocalStorage token after login:",
        localStorage.getItem("token"),
      );

      if (token) {
        // Redirect based on user role
        if (user.role === "SHELTER_OFFICER") {
          window.location.replace("/officer/dashboard");
        } else if (user.role === "ADMIN") {
          window.location.replace("/admin/dashboard");
        } else {
          window.location.replace("/");
        }
      } else {
        setErrorMsg("Token tidak diterima dari server.");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMsg(err?.response?.data?.message || "Email atau password salah.");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#09090b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              padding: "1rem",
              borderRadius: "1rem",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)",
              marginBottom: "1rem",
            }}
          >
            <Image
              src="/logo.png"
              alt="SIGMA Bantul Logo"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#fafafa",
              margin: 0,
            }}
          >
            SIGMA Bantul
          </h1>
          <p
            style={{
              color: "#71717a",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            Panel Administrator
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "1rem",
            padding: "2rem",
          }}
        >
          <h2
            style={{
              color: "#f4f4f5",
              fontWeight: 600,
              marginBottom: "0.25rem",
              fontSize: "1.125rem",
            }}
          >
            Masuk ke Dashboard
          </h2>
          <p
            style={{
              color: "#71717a",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            Hanya untuk administrator sistem
          </p>

          {errorMsg && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                fontSize: "0.875rem",
                marginBottom: "1rem",
              }}
            >
              {errorMsg}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  color: "#d4d4d8",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  marginBottom: "0.5rem",
                }}
              >
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-zinc-950 border-zinc-700 text-zinc-100 h-11"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  color: "#d4d4d8",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  marginBottom: "0.5rem",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-zinc-950 border-zinc-700 text-zinc-100 h-11 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#71717a",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              style={{
                height: "2.75rem",
                background: "#2563eb",
                color: "white",
                fontWeight: 600,
                marginTop: "0.5rem",
              }}
              className="hover:bg-blue-500 transition-colors"
            >
              {isLoading ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Loader2
                    size={16}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  Memverifikasi...
                </span>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid #27272a",
              textAlign: "center",
            }}
          >
            <Link
              href="/"
              style={{
                color: "#71717a",
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
