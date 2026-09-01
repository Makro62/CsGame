import { useState, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { MAPS } from "../game/map/MapRegistry";
import { getAgentsForTeam } from "../game/offline/agents";
import { MinecraftCharacter } from "../game/player/MinecraftCharacter";

// ── Step Indicator ──
function StepIndicator({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {labels.map((label, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: i <= step ? "#3b82f6" : "rgba(255,255,255,0.1)",
            color: i <= step ? "#fff" : "#64748b",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 900, fontFamily: "'Rajdhani', monospace",
            border: i === step ? "2px solid #60a5fa" : "1px solid transparent",
            boxShadow: i === step ? "0 0 12px rgba(59,130,246,0.4)" : "none",
          }}>
            {i + 1}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: 1,
            color: i <= step ? "#f1f5f9" : "#475569",
            fontFamily: "'Rajdhani', monospace", textTransform: "uppercase",
          }}>
            {label}
          </span>
          {i < labels.length - 1 && (
            <div style={{ width: 30, height: 1, background: i < step ? "#3b82f6" : "rgba(255,255,255,0.15)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Selection Screen ──
interface Offline5v5SelectProps {
  onSelect: (team: "T" | "CT", mapId: string, agentId: string) => void;
  onBack: () => void;
}

export function Offline5v5Select({ onSelect, onBack }: Offline5v5SelectProps) {
  const [step, setStep] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<"T" | "CT" | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const agents = useMemo(() => selectedTeam ? getAgentsForTeam(selectedTeam) : [], [selectedTeam]);
  const previewAgent = useMemo(() => {
    if (!selectedTeam) return null;
    return agents.find(a => a.id === selectedAgentId) ?? agents[0];
  }, [agents, selectedAgentId, selectedTeam]);

  const handleTeamSelect = useCallback((team: "T" | "CT") => {
    setSelectedTeam(team);
    setSelectedAgentId(null);
    setHoveredId(null);
    setStep(1);
  }, []);

  const handleMapSelect = useCallback((mapId: string) => {
    setSelectedMapId(mapId);
    setStep(2);
  }, []);

  const handleAgentSelect = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedTeam && selectedMapId && selectedAgentId) {
      onSelect(selectedTeam, selectedMapId, selectedAgentId);
    }
  }, [selectedTeam, selectedMapId, selectedAgentId, onSelect]);

  const canConfirm = selectedTeam && selectedMapId && selectedAgentId;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, height: "100dvh", width: "100dvw",
      background: "linear-gradient(135deg, #0a0e14 0%, #1a1f2e 50%, #0a0e14 100%)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Rajdhani', monospace", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "24px 20px 16px" }}>
        <StepIndicator step={step} labels={["Team", "Map", "Agent"]} />
        <h1 style={{
          fontSize: "2.4em", fontWeight: 900, margin: "12px 0 4px",
          background: "linear-gradient(135deg, #3b82f6, #f59e0b)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", letterSpacing: 4,
        }}>
          {step === 0 ? "PILIH TEAM" : step === 1 ? "PILIH MAP" : "PILIH AGENT"}
        </h1>
        <div style={{ fontSize: 13, color: "#64748b", letterSpacing: 2 }}>
          {step === 0 ? "_counter-terrorist atau terrorist?" : step === 1 ? "Pilih arena pertempuran" : "Pilih karakter agent kamu"}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 30px" }}>

        {/* Step 0: Team Selection */}
        {step === 0 && (
          <div style={{ display: "flex", gap: "clamp(12px, 2vw, 32px)" }}>
            {(["CT", "T"] as const).map((team) => (
              <div
                key={team}
                onClick={() => handleTeamSelect(team)}
                style={{
                  width: "clamp(200px, 40vw, 300px)", maxWidth: "92vw", padding: "clamp(20px, 3vw, 40px) clamp(16px, 2.5vw, 30px)", borderRadius: 20, cursor: "pointer",
                  background: team === "CT"
                    ? "linear-gradient(155deg, rgba(37,99,235,0.2), rgba(15,23,42,0.95))"
                    : "linear-gradient(155deg, rgba(239,68,68,0.2), rgba(15,23,42,0.95))",
                  border: `2px solid ${team === "CT" ? "#3b82f6" : "#ef4444"}`,
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = `0 0 40px ${team === "CT" ? "rgba(59,130,246,0.4)" : "rgba(239,68,68,0.4)"}`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{
                  width: 80, height: 80, borderRadius: "50%", margin: "0 auto 16px",
                  background: team === "CT" ? "linear-gradient(135deg, #1e3a8a, #3b82f6)" : "linear-gradient(135deg, #7f1d1d, #ef4444)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 36,
                }}>
                  {team === "CT" ? "🛡️" : "⚔️"}
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: team === "CT" ? "#3b82f6" : "#ef4444", letterSpacing: 3 }}>
                  {team === "CT" ? "COUNTER-TERRORIST" : "TERRORIST"}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 8, lineHeight: 1.5 }}>
                  {team === "CT" ? "Tim defensif. Melawan bom dan menyelamatkan sandera." : "Tim ofensif. Menanam bom dan menguasai area."}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Map Selection */}
        {step === 1 && (
          <div style={{ display: "flex", gap: "clamp(12px, 2vw, 24px)" }}>
            {MAPS.map((map) => (
              <div
                key={map.id}
                onClick={() => handleMapSelect(map.id)}
                style={{
                  width: "clamp(200px, 40vw, 280px)", maxWidth: "92vw", padding: "clamp(16px, 2vw, 24px) clamp(14px, 2vw, 20px)", borderRadius: 16, cursor: "pointer",
                  background: "linear-gradient(155deg, rgba(30,41,59,0.85), rgba(15,23,42,0.95))",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.boxShadow = "0 0 30px rgba(59,130,246,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: map.id === "container_yard" ? "linear-gradient(135deg, #1e3a8a, #3b82f6)" : "linear-gradient(135deg, #92400e, #d97706)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  }}>
                    {map.id === "container_yard" ? "📦" : "🏜️"}
                  </div>
                  <div style={{ color: "#f8fafc", fontSize: 18, fontWeight: 900 }}>{map.name}</div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.4 }}>{map.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Agent Selection */}
        {step === 2 && (
          <div style={{ display: "flex", gap: 24, maxWidth: 1200, width: "100%" }}>
            {/* Agent list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 260 }}>
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => handleAgentSelect(agent.id)}
                  onMouseEnter={() => setHoveredId(agent.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    padding: "12px 16px", borderRadius: 12, cursor: "pointer",
                    background: selectedAgentId === agent.id
                      ? `linear-gradient(135deg, ${agent.accentColor}22, ${agent.accentColor}11)`
                      : hoveredId === agent.id
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,255,255,0.03)",
                    border: selectedAgentId === agent.id
                      ? `2px solid ${agent.accentColor}`
                      : hoveredId === agent.id
                        ? `2px solid ${agent.accentColor}55`
                        : "2px solid rgba(255,255,255,0.1)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `linear-gradient(135deg, ${agent.accentColor}, ${agent.armorColor})`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                    }}>
                      {agent.team === "CT" ? "🛡️" : "⚔️"}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: agent.accentColor }}>{agent.name}</div>
                      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{agent.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview */}
            {previewAgent && (
              <div style={{
                flex: 1, background: "rgba(20,20,40,0.5)", backdropFilter: "blur(10px)",
                border: `1px solid ${previewAgent.accentColor}33`, borderRadius: 20,
                display: "flex", flexDirection: "column", overflow: "hidden",
              }}>
                {/* 3D Preview */}
                <div style={{
                  flex: 1, minHeight: 350, position: "relative",
                  background: `radial-gradient(ellipse at center bottom, ${previewAgent.accentColor}22 0%, transparent 70%)`,
                }}>
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, height: 120,
                    backgroundImage: `linear-gradient(90deg, ${previewAgent.accentColor}18 1px, transparent 1px), linear-gradient(0deg, ${previewAgent.accentColor}18 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                    transform: "perspective(500px) rotateX(60deg)", transformOrigin: "bottom", opacity: 0.4,
                  }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 40 }}>
                    <Canvas camera={{ position: [0, 1.8, 4], fov: 35 }} style={{ width: "100%", height: "100%" }} gl={{ antialias: true, alpha: true }}>
                      <ambientLight intensity={0.8} />
                      <directionalLight position={[3, 5, 2]} intensity={1.2} />
                      <pointLight position={[0, 2, 2]} color={previewAgent.accentColor} intensity={0.6} distance={6} />
                      <MinecraftCharacter
                        team={selectedTeam!}
                        holdWeapon
                        heroColor={previewAgent.armorColor}
                        heroAccent={previewAgent.accentColor}
                        bodyStyle={previewAgent.id}
                      />
                    </Canvas>
                  </div>
                  {/* Agent name overlay */}
                  <div style={{ position: "absolute", bottom: 16, left: 20, zIndex: 10 }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: previewAgent.accentColor, textShadow: `0 0 20px ${previewAgent.accentColor}88` }}>
                      {previewAgent.name}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      {previewAgent.role} • {selectedTeam === "CT" ? "Counter-Terrorist" : "Terrorist"}
                    </div>
                  </div>
                </div>
                {/* Description */}
                <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)" }}>
                  <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>{previewAgent.description}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div style={{ padding: "16px 30px 24px", display: "flex", justifyContent: "center", gap: 16 }}>
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{
              padding: "12px 28px", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10,
              color: "#94a3b8", fontSize: 14, fontWeight: 800, cursor: "pointer",
              fontFamily: "'Rajdhani', monospace", letterSpacing: 1,
            }}
          >
            ← KEMBALI
          </button>
        )}
        {step === 0 && (
          <button
            onClick={onBack}
            style={{
              padding: "12px 28px", background: "rgba(239,68,68,0.2)",
              border: "1px solid #ef4444", borderRadius: 10,
              color: "#fecaca", fontSize: 14, fontWeight: 800, cursor: "pointer",
              fontFamily: "'Rajdhani', monospace", letterSpacing: 1,
            }}
          >
            ✕ MENU
          </button>
        )}
        {step === 2 && (
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              padding: "14px 50px",
              background: canConfirm ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "rgba(255,255,255,0.05)",
              border: "none", borderRadius: 12, color: canConfirm ? "#fff" : "#475569",
              fontSize: 16, fontWeight: 900, cursor: canConfirm ? "pointer" : "not-allowed",
              fontFamily: "'Rajdhani', monospace", letterSpacing: 2, textTransform: "uppercase",
              boxShadow: canConfirm ? "0 0 30px rgba(59,130,246,0.4)" : "none",
            }}
          >
            DEPLOY →
          </button>
        )}
      </div>
    </div>
  );
}
